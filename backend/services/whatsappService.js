import Message from '../models/Message.js';
import Settings from '../models/Settings.js';
import qrcode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ConnectionLog from "../models/ConnectionLog.js";
import * as ruleService from "./ruleService.js";
import * as aiService from "./aiService.js";
import {
  getMessageType,
  normalizeMessage,
} from "../utils/messageUtils.js";
import { clearWhatsAppSession } from "../utils/sessionUtils.js";
import pkg from 'whatsapp-web.js';

const { Client, LocalAuth } = pkg;


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SESSION_DIR = path.resolve(__dirname, "../.wwebjs_auth");
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

let client = null;
let io = null;

let connectionStatus = {
  status: "disconnected",
  qr: null,
  lastUpdated: new Date().toISOString(),
};


// WhatsApp Initialization

const initialize = async (socketIo) => {
  io = socketIo;

  try {
    console.log("Initializing WhatsApp client...");

    client = new Client({
      authStrategy: new LocalAuth({ dataPath: SESSION_DIR }),
      puppeteer: { args: ["--no-sandbox", "--disable-setuid-sandbox"] },
    });

    registerClientEvents(client);

    console.log("Starting WhatsApp client...");
    await client.initialize();
  } catch (error) {
    console.error("WhatsApp client initialization error:", error);
    await ConnectionLog.create({
      status: "failed",
      errorMessage: error?.message || "Initialization error",
    });

    setTimeout(() => initialize(io), 30_000); // Retry in 30s
  }
};


// Client Event Handlers

const registerClientEvents = (client) => {
  client.on("qr", handleQrReceived);
  client.on("ready", handleClientReady);
  client.on("authenticated", () =>
    console.log("WhatsApp client authenticated")
  );
  client.on("auth_failure", handleAuthFailure);
  client.on("disconnected", handleDisconnected);
  client.on("message", handleIncomingMessage);
};


// Event: QR Code

const handleQrReceived = async (qr) => {
  try {
    console.log("QR code received from WhatsApp:", qr.substring(0, 20) + "...");

    const qrDataUrl = await qrcode.toDataURL(qr);
    console.log("QR data URL generated, length:", qrDataUrl.length);

    

    connectionStatus = {
      status: "disconnected",
      qr: qrDataUrl,
      lastUpdated: new Date().toISOString(),
    };

    io?.emit("connectionStatus", connectionStatus);

    await ConnectionLog.create({ status: "connecting", qrCode: qrDataUrl });
    console.log("WhatsApp QR code generated and saved to database");
  } catch (err) {
    console.error("Error generating QR code:", err);
    console.log("Attempting to generate a test QR code...");
  }
};


// Event: Client Ready

const handleClientReady = async () => {
  connectionStatus = {
    status: "connected",
    qr: null,
    lastUpdated: new Date().toISOString(),
  };
  io?.emit("connectionStatus", connectionStatus);

  await ConnectionLog.create({
    status: "connected",
    sessionInfo: {
      platform: client?.info?.platform || "unknown",
      pushname: client?.info?.pushname || "unknown",
      wid: client?.info?.wid?.user || "unknown",
    },
  });

  console.log("WhatsApp client ready!");
};


// Event: Auth Failure

const handleAuthFailure = async (error) => {
  connectionStatus = {
    status: "disconnected",
    qr: null,
    lastUpdated: new Date().toISOString(),
  };
  io?.emit("connectionStatus", connectionStatus);

  await ConnectionLog.create({
    status: "failed",
    errorMessage: error?.message || "Authentication failed",
  });

  console.error("WhatsApp authentication failed:", error);
};


// Event: Disconnected

const handleDisconnected = async (reason) => {
  connectionStatus = {
    status: "disconnected",
    qr: null,
    lastUpdated: new Date().toISOString(),
  };
  io?.emit("connectionStatus", connectionStatus);

  await ConnectionLog.create({
    status: "disconnected",
    errorMessage: reason || "Unknown reason",
  });

  console.log("WhatsApp client disconnected:", reason);

  client?.destroy();
  client = null;

  setTimeout(() => initialize(io), 5_000); // Retry after 5s
};


// Event: Incoming Message

const handleIncomingMessage = async (msg) => {
  try {
    console.log("Received message:", msg.body, "from:", msg.from);

    if (msg.fromMe || msg.from === "status@broadcast") return;
    const chat = await msg.getChat();
    if (chat.isGroup || msg.from.includes("@newsletter")) return;

    const author = msg.author || msg.from;
    if (author.includes("Abu Musaddiq")) return;


    const incomingMessage = {
      whatsappMessageId: msg.id.id,
      text: msg.body,
      from: msg.from,
      to: msg.to || client?.info?.wid?._serialized || "bot",
      sender: "user",
      timestamp: new Date(),
    };

    const savedMessage = await Message.findOneAndUpdate(
      { whatsappMessageId: msg.id.id },
      incomingMessage,
      { upsert: true, new: true }
    );

    io?.emit("newMessage", savedMessage);

    // Check if bot is enabled from database settings
    const botEnabled = await getBotEnabledStatus();
    if (botEnabled) {
      console.log('Bot is enabled, processing auto-reply...');
      await handleAutoReply(savedMessage);
    } else {
      console.log('Bot is disabled, checking rules only...');
      await handleRulesOnlyReply(savedMessage);
    }
  } catch (error) {
    console.error("Error handling incoming message:", error);
  }
};


/**
 * Handle rules-only reply (when bot is disabled)
 */
const handleRulesOnlyReply = async (incomingMessage) => {
  try {
    console.log('------------- RULES-ONLY PROCESS START -------------');
    
    const normalizedText = normalizeMessage(incomingMessage.text);
    console.log(`Processing rules-only message: "${incomingMessage.text}"`);
    
    if (!client) {
      console.error('ERROR: WhatsApp client is not initialized!');
      return;
    }
    
    // Check for matching rule
    const matchedRule = await ruleService.findMatchingRule(normalizedText);
    
    if (matchedRule) {
      console.log('✓ Found matching rule:', matchedRule.keyword);
      
      // Add delay for natural response
      const delay = parseInt(process.env.AUTO_REPLY_DELAY || '2000', 10);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Send rule response
      const chat = await client.getChatById(incomingMessage.from);
      await chat.sendMessage(matchedRule.response);
      console.log('✓ Rule response sent successfully');
      
      // Update rule usage
      await ruleService.updateRuleUsage(matchedRule.id);
      
      // Store bot message
      const botMessage = {
        whatsappMessageId: `rule_${Date.now()}`,
        text: matchedRule.response,
        from: incomingMessage.to || (client.info?.wid?._serialized || 'bot'),
        to: incomingMessage.from,
        sender: 'bot',
        timestamp: new Date()
      };
      
      const savedBotMessage = await Message.create(botMessage);
      io?.emit('newMessage', savedBotMessage);
      
      console.log('------------- RULES-ONLY PROCESS COMPLETE -------------');
    } else {
      console.log('No matching rule found - bot disabled, no response sent');
      console.log('------------- RULES-ONLY PROCESS COMPLETE (NO RESPONSE) -------------');
    }
  } catch (error) {
    console.error('RULES-ONLY ERROR:', error);
    console.log('------------- RULES-ONLY FAILED -------------');
  }
};

// Auto-Reply 

const handleAutoReply = async (incomingMessage) => {
  try {
    console.log("------------- AUTO-REPLY PROCESS START -------------");

    const normalizedText = normalizeMessage(incomingMessage.text);
    const messageType = getMessageType(normalizedText);

    if (!client) {
      console.error("ERROR: WhatsApp client is not initialized!");
      return;
    }

    let delay = parseInt(process.env.AUTO_REPLY_DELAY || "2000", 10);
    if (["emoji_only", "short_text"].includes(messageType)) {
      delay = Math.floor(delay * 0.5);
    }
    await new Promise((res) => setTimeout(res, delay));

    let responseText;
    const matchedRule = await ruleService.findMatchingRule(normalizedText);

    if (matchedRule) {
      responseText = matchedRule.response;
      await ruleService.updateRuleUsage(matchedRule.id);
    } else {
      try {
        responseText = await aiService.generateResponse(
          incomingMessage.text
        );
      } catch (err) {
        console.error("AI response generation failed:", err);
        return;
      }
    }

    const chat = await client.getChatById(incomingMessage.from);
    await chat.sendMessage(responseText);

    const botMessage = {
      whatsappMessageId: `bot_${Date.now()}`,
      text: responseText,
      from: incomingMessage.to || client?.info?.wid?._serialized || "bot",
      to: incomingMessage.from,
      sender: "bot",
      timestamp: new Date(),
    };

    const savedBotMessage = await Message.create(botMessage);
    io?.emit("newMessage", savedBotMessage);

    console.log("------------- AUTO-REPLY PROCESS COMPLETE -------------");
  } catch (err) {
    console.error("Error in auto-reply:", err);
  }
};



const getConnectionStatus = () => connectionStatus;

const disconnect = async () => {
  if (!client) return false;
  try {
    await client.destroy();
    client = null;

    connectionStatus = {
      status: "disconnected",
      qr: null,
      lastUpdated: new Date().toISOString(),
    };

    io?.emit("connectionStatus", connectionStatus);
    await ConnectionLog.create({
      status: "disconnected",
      errorMessage: "Manual disconnection",
    });
    return true;
  } catch (err) {
    console.error("Error disconnecting client:", err);
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
  if (!client) return { success: false, error: "Client not connected" };

  try {
    const chat = await client.getChatById(to);
    await chat.sendMessage(text);

    const botMessage = {
      id: uuidv4(),
      whatsappMessageId: Date.now().toString(),
      sender: "bot",
      text,
      from: client.info.wid._serialized,
      to,
      timestamp: new Date(),
      messageType: "text",
    };

    const savedBotMessage = await Message.create(botMessage);
    io?.emit("newMessage", savedBotMessage);

    return { success: true, message: savedBotMessage };
  } catch (err) {
    console.error("Error sending message:", err);
    return { success: false, error: err.message };
  }
};

/**
 * Get bot enabled status from database settings
 */
const getBotEnabledStatus = async () => {
  try {
    const setting = await Settings.findOne({ key: 'botEnabled' });
    return setting ? setting.value : true; // Default to enabled
  } catch (error) {
    console.error('Error getting bot enabled status:', error);
    return true; // Default to enabled on error
  }
};

export { initialize, getConnectionStatus, disconnect, resetConnection, sendMessage };
