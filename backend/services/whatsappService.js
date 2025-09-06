// services/whatsappService.js  (refactored)

import Message from '../models/Message.js';
import Settings from '../models/Settings.js';
import qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ConnectionLog from '../models/ConnectionLog.js';
import * as ruleService from './ruleService.js';
import * as aiService from './aiService.js';
import { getMessageType, normalizeMessage } from '../utils/messageUtils.js';
import { clearWhatsAppSession } from '../utils/sessionUtils.js';
import pkg from 'whatsapp-web.js';

const { Client, LocalAuth } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Persist session
const SESSION_DIR = path.resolve(__dirname, '../.wwebjs_auth');
if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

// --- Module state (singleton-ish) ---
let io = null;
let client = null;
let shuttingDown = false;

let connectionStatus = {
  status: 'disconnected',
  qr: null,
  lastUpdated: new Date().toISOString(),
};

// initialize() re-entrancy guards + backoff
let initLock = false;
let initOnceSignals = { signalsHooked: false };
let backoff = {
  baseMs: 2000,
  maxMs: 30000,
  currentMs: 2000,
};

// ------------ Public API ------------

/**
 * Initialize WhatsApp client (idempotent; safe to call multiple times).
 */
const initialize = async (socketIo) => {
  io = socketIo || io;

  if (initLock || client) return; // already initializing/ready
  initLock = true;

  try {
    if (!initOnceSignals.signalsHooked) {
      initOnceSignals.signalsHooked = true;
      // graceful shutdown to avoid zombie Chrome
      process.on('SIGINT', gracefulShutdown);
      process.on('SIGTERM', gracefulShutdown);
    }

    console.log('Initializing WhatsApp client...');

    client = new Client({
      authStrategy: new LocalAuth({ dataPath: SESSION_DIR }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-software-rasterizer',
        ],
      },
    });

    registerClientEvents(client);

    console.log('Starting WhatsApp client...');
    await client.initialize();

    // if we got here successfully, reset backoff
    backoff.currentMs = backoff.baseMs;
  } catch (error) {
    await logConnection('failed', { errorMessage: error?.message || 'Initialization error' });
    console.error('WhatsApp client initialization error:', error);

    // schedule retry with exponential backoff
    const delay = Math.min(backoff.currentMs, backoff.maxMs);
    console.log(`Retrying initialize in ${delay}ms...`);
    setTimeout(() => {
      initLock = false;
      if (!shuttingDown) initialize(io);
    }, delay);
    backoff.currentMs = Math.min(backoff.currentMs * 2, backoff.maxMs);
  } finally {
    // allow future init attempts after async path completed
    setTimeout(() => (initLock = false), 0);
  }
};

const getConnectionStatus = () => connectionStatus;

const disconnect = async () => {
  try {
    if (!client) return false;

    await client.destroy();
    client = null;

    updateStatus('disconnected', null);
    io?.emit('connectionStatus', connectionStatus);
    await logConnection('disconnected', { errorMessage: 'Manual disconnection' });
    return true;
  } catch (err) {
    console.error('Error disconnecting client:', err);
    return false;
  }
};

const resetConnection = async (forceNewQR = false) => {
  await disconnect();
  if (forceNewQR) clearWhatsAppSession();
  await initialize(io);
  return true;
};

const sendMessage = async (to, text) => {
  if (!client) return { success: false, error: 'Client not connected' };

  try {
    const chat = await client.getChatById(to);
    await chat.sendMessage(text);

    const botMessage = {
      id: uuidv4(),
      whatsappMessageId: Date.now().toString(),
      sender: 'bot',
      text,
      from: client.info?.wid?._serialized || 'bot',
      to,
      timestamp: new Date(),
      messageType: 'text',
    };

    const savedBotMessage = await Message.create(botMessage);
    io?.emit('newMessage', savedBotMessage);

    return { success: true, message: savedBotMessage };
  } catch (err) {
    console.error('Error sending message:', err);
    return { success: false, error: err.message };
  }
};

// ------------ Internal helpers ------------

const registerClientEvents = (client) => {
  client.on('qr', handleQrReceived);
  client.on('ready', handleClientReady);
  client.on('authenticated', () => console.log('WhatsApp client authenticated'));
  client.on('auth_failure', handleAuthFailure);
  client.on('disconnected', handleDisconnected);
  client.on('message', handleIncomingMessage);
};

const handleQrReceived = async (qr) => {
  try {
    // Don’t log raw QR; it can be reused. Just note we got one.
    console.log('QR code received from WhatsApp (masked).');

    const qrDataUrl = await qrcode.toDataURL(qr);

    updateStatus('disconnected', qrDataUrl);
    io?.emit('connectionStatus', connectionStatus);

    // non-blocking log
    setImmediate(() => logConnection('connecting', { qrCode: qrDataUrl }).catch(() => {}));
  } catch (err) {
    console.error('Error generating QR code:', err);
  }
};

const handleClientReady = async () => {
  updateStatus('connected', null);
  io?.emit('connectionStatus', connectionStatus);

  const sessionInfo = {
    platform: client?.info?.platform || 'unknown',
    pushname: client?.info?.pushname || 'unknown',
    wid: client?.info?.wid?.user || 'unknown',
  };

  console.log('✅ WhatsApp client ready!', sessionInfo);

  setImmediate(() => logConnection('connected', { sessionInfo }).catch(() => {}));
};

const handleAuthFailure = async (error) => {
  updateStatus('disconnected', null);
  io?.emit('connectionStatus', connectionStatus);

  await logConnection('failed', { errorMessage: error?.message || 'Authentication failed' });
  console.error('WhatsApp authentication failed:', error);
};

const handleDisconnected = async (reason) => {
  console.log('⚠️ WhatsApp client disconnected:', reason);

  updateStatus('disconnected', null);
  io?.emit('connectionStatus', connectionStatus);

  await logConnection('disconnected', { errorMessage: reason || 'Unknown reason' });

  // Make sure we kill chrome cleanly
  try {
    await client?.destroy();
  } catch (_) {}
  client = null;

  if (shuttingDown) return;

  // Retry with backoff
  const delay = Math.min(backoff.currentMs, backoff.maxMs);
  console.log(`Re-initializing in ${delay}ms...`);
  setTimeout(() => {
    if (!shuttingDown) initialize(io);
  }, delay);
  backoff.currentMs = Math.min(backoff.currentMs * 2, backoff.maxMs);
};

const handleIncomingMessage = async (msg) => {
  try {
    // Basic filters
    if (msg.fromMe || msg.from === 'status@broadcast') return;
    const chat = await msg.getChat();
    if (chat.isGroup || msg.from.includes('@newsletter')) return;

    const author = msg.author || msg.from;
    if (author.includes('Abu Musaddiq')) return;

    const incomingMessage = {
      whatsappMessageId: msg.id.id,
      text: msg.body,
      from: msg.from,
      to: msg.to || client?.info?.wid?._serialized || 'bot',
      sender: 'user',
      timestamp: new Date(),
    };

    const savedMessage = await Message.findOneAndUpdate(
      { whatsappMessageId: msg.id.id },
      incomingMessage,
      { upsert: true, new: true }
    );

    io?.emit('newMessage', savedMessage);

    // Bot toggle
    const botEnabled = await getBotEnabledStatus();
    if (botEnabled) {
      console.log('Bot is enabled, processing auto-reply…');
      await handleAutoReply(savedMessage);
    } else {
      console.log('Bot is disabled, checking rules only…');
      await handleRulesOnlyReply(savedMessage);
    }
  } catch (error) {
    console.error('Error handling incoming message:', error);
  }
};

const handleRulesOnlyReply = async (incomingMessage) => {
  try {
    console.log('------------- RULES-ONLY PROCESS START -------------');

    const normalizedText = normalizeMessage(incomingMessage.text);

    if (!client) {
      console.error('ERROR: WhatsApp client is not initialized!');
      return;
    }

    const matchedRule = await ruleService.findMatchingRule(normalizedText);

    if (!matchedRule) {
      console.log('No matching rule found - bot disabled, no response sent');
      console.log('------------- RULES-ONLY PROCESS COMPLETE (NO RESPONSE) -------------');
      return;
    }

    console.log('✓ Found matching rule:', matchedRule.keyword);

    const delay = parseInt(process.env.AUTO_REPLY_DELAY || '2000', 10);
    await sleep(delay);

    const chat = await client.getChatById(incomingMessage.from);
    await chat.sendMessage(matchedRule.response);
    console.log('✓ Rule response sent successfully');

    await ruleService.updateRuleUsage(matchedRule.id);

    const botMessage = {
      id: uuidv4(),
      whatsappMessageId: `rule_${Date.now()}`,
      text: matchedRule.response,
      from: incomingMessage.to || client?.info?.wid?._serialized || 'bot',
      to: incomingMessage.from,
      sender: 'bot',
      timestamp: new Date(),
    };

    const savedBotMessage = await Message.create(botMessage);
    io?.emit('newMessage', savedBotMessage);

    console.log('------------- RULES-ONLY PROCESS COMPLETE -------------');
  } catch (error) {
    console.error('RULES-ONLY ERROR:', error);
    console.log('------------- RULES-ONLY FAILED -------------');
  }
};

const handleAutoReply = async (incomingMessage) => {
  try {
    console.log('------------- AUTO-REPLY PROCESS START -------------');

    const normalizedText = normalizeMessage(incomingMessage.text);
    const messageType = getMessageType(normalizedText);

    if (!client) {
      console.error('ERROR: WhatsApp client is not initialized!');
      return;
    }

    let delay = parseInt(process.env.AUTO_REPLY_DELAY || '2000', 10);
    if (['emoji_only', 'short_text'].includes(messageType)) delay = Math.floor(delay * 0.5);
    await sleep(delay);

    const matchedRule = await ruleService.findMatchingRule(normalizedText);

    let responseText;
    if (matchedRule) {
      responseText = matchedRule.response;
      await ruleService.updateRuleUsage(matchedRule.id);
    } else {
      try {
        responseText = await aiService.generateResponse(incomingMessage.text);
      } catch (err) {
        console.error('AI response generation failed:', err);
        responseText = "Sorry, I'm having a brain freeze 🧊—try again in a bit.";
      }
    }

    const chat = await client.getChatById(incomingMessage.from);
    await chat.sendMessage(responseText);

    const botMessage = {
      id: uuidv4(),
      whatsappMessageId: `bot_${Date.now()}`,
      text: responseText,
      from: incomingMessage.to || client?.info?.wid?._serialized || 'bot',
      to: incomingMessage.from,
      sender: 'bot',
      timestamp: new Date(),
    };

    const savedBotMessage = await Message.create(botMessage);
    io?.emit('newMessage', savedBotMessage);

    console.log('------------- AUTO-REPLY PROCESS COMPLETE -------------');
  } catch (err) {
    console.error('Error in auto-reply:', err);
  }
};

const getBotEnabledStatus = async () => {
  try {
    const setting = await Settings.findOne({ key: 'botEnabled' });
    return setting ? setting.value : true; // default enabled
  } catch (error) {
    console.error('Error getting bot enabled status:', error);
    return true; // fail-open
  }
};

const updateStatus = (status, qr) => {
  connectionStatus = {
    status,
    qr: qr || null,
    lastUpdated: new Date().toISOString(),
  };
};

const logConnection = async (status, extra = {}) =>
  ConnectionLog.create({ status, ...extra }).catch((e) =>
    console.error('ConnectionLog create failed:', e?.message || e)
  );

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function gracefulShutdown() {
  try {
    shuttingDown = true;
    console.log('Graceful shutdown: closing WhatsApp client…');
    await disconnect();
  } catch (e) {
    // ignore
  } finally {
    process.exit(0);
  }
}

export { initialize, getConnectionStatus, disconnect, resetConnection, sendMessage };
