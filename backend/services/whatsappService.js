const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const Message = require('../models/Message');
const ConnectionLog = require('../models/ConnectionLog');
const Settings = require('../models/Settings');
const ruleService = require('./ruleService');
const aiService = require('./aiService');
const { saveQrCodeToFile, generateTestQrCode } = require('../utils/debugUtils');
const { clearWhatsAppSession } = require('../utils/sessionUtils');

let client = null;
let io = null;
let connectionStatus = {
  status: 'disconnected',
  qr: null,
  lastUpdated: new Date().toISOString()
};

// Create session directory if it doesn't exist
const SESSION_DIR = path.resolve(__dirname, '../.wwebjs_auth');
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

/**
 * Initialize WhatsApp client and socket.io instance
 */
const initialize = async (socketIo) => {
  io = socketIo;
  
  try {
    console.log('Initializing WhatsApp client...');
    
    // Create WhatsApp client with local authentication
    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: SESSION_DIR
      }),
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    // Event: QR code received
    client.on('qr', async (qr) => {
      try {
        console.log('QR code received from WhatsApp:', qr.substring(0, 20) + '...');
        
        // Generate QR code as data URL
        const qrDataUrl = await qrcode.toDataURL(qr);
        console.log('QR data URL generated, length:', qrDataUrl.length);
        
        // Save QR code to file for debugging if enabled
        if (process.env.DEBUG_QR === 'true') {
          saveQrCodeToFile(qrDataUrl);
        }
        
        // Update connection status
        connectionStatus = {
          status: 'disconnected',
          qr: qrDataUrl,
          lastUpdated: new Date().toISOString()
        };
        
        // Broadcast to all connected clients
        if (io) {
          console.log('Broadcasting QR code to connected clients');
          io.emit('connectionStatus', connectionStatus);
        } else {
          console.log('Socket.io not initialized, cannot broadcast QR code');
        }
        
        // Log connection attempt with QR code
        await ConnectionLog.create({
          status: 'connecting',
          qrCode: qrDataUrl
        });
        
        console.log('WhatsApp QR code generated and saved to database');
      } catch (err) {
        console.error('Error generating QR code:', err);
        
        // Try to generate a test QR code to see if QR code generation works
        console.log('Attempting to generate a test QR code...');
        const testResult = await generateTestQrCode();
        console.log('Test QR code generation result:', testResult);
      }
    });

    // Event: Client is ready
    client.on('ready', async () => {
      connectionStatus = {
        status: 'connected',
        qr: null,
        lastUpdated: new Date().toISOString()
      };
      
      io?.emit('connectionStatus', connectionStatus);
      
      // Log successful connection
      await ConnectionLog.create({
        status: 'connected',
        sessionInfo: {
          platform: client.info?.platform || 'unknown',
          pushname: client.info?.pushname || 'unknown',
          wid: client.info?.wid?.user || 'unknown'
        }
      });
      
      console.log('WhatsApp client ready!');
    });

    // Event: Client is authenticated
    client.on('authenticated', () => {
      console.log('WhatsApp client authenticated');
    });

    // Event: Authentication failure
    client.on('auth_failure', async (error) => {
      connectionStatus = {
        status: 'disconnected',
        qr: null,
        lastUpdated: new Date().toISOString()
      };
      
      io?.emit('connectionStatus', connectionStatus);
      
      // Log authentication failure
      await ConnectionLog.create({
        status: 'failed',
        errorMessage: error?.message || 'Authentication failed'
      });
      
      console.error('WhatsApp authentication failed:', error);
    });

    // Event: Client disconnected
    client.on('disconnected', async (reason) => {
      connectionStatus = {
        status: 'disconnected',
        qr: null,
        lastUpdated: new Date().toISOString()
      };
      
      io?.emit('connectionStatus', connectionStatus);
      
      // Log disconnection
      await ConnectionLog.create({
        status: 'disconnected',
        errorMessage: reason || 'Unknown reason'
      });
      
      console.log('WhatsApp client disconnected:', reason);
      
      // Destroy the client and reinitialize
      client.destroy();
      client = null;
      
      // Wait a bit before reinitializing
      setTimeout(() => {
        initialize(io);
      }, 5000);
    });

    // Event: New message
    client.on('message', async (msg) => {
      try {
        console.log('Received message:', msg.body, 'from:', msg.from);
        
        // First check if message is from bot or status broadcast
        if (msg.fromMe || msg.from === 'status@broadcast') {
          console.log('Ignoring message from bot or status broadcast');
          return;
        }

        // Get chat info
        const chat = await msg.getChat();
        
        // Always ignore group messages
        if (chat.isGroup) {
          console.log('Ignoring message from group:', chat.name);
          return;
        }

        // Check if user is in ignore list
        const author = msg.author || msg.from;
        if (author.includes('Abu Musaddiq')) {
          console.log('Ignoring message from blocked user:', author);
          return;
        }
        
        const settings = await getSettings();
        console.log('Bot settings:', JSON.stringify(settings));
        
        // Store the incoming message
        const incomingMessage = {
          id: uuidv4(),
          whatsappMessageId: msg.id.id,
          sender: 'user',
          text: msg.body,
          from: msg.from,
          to: msg.to || (client.info.wid?._serialized || 'bot'),
          timestamp: new Date(),
          messageType: 'text'
        };
        
        // Try to save message, handle duplicates gracefully
        let savedMessage;
        try {
          // First check if message exists
          savedMessage = await Message.findOne({ whatsappMessageId: msg.id.id });
          if (savedMessage) {
            console.log('Message already exists in database, skipping save');
          } else {
            savedMessage = await Message.create(incomingMessage);
            console.log('Message saved to database with ID:', savedMessage.id);
          }
        } catch (dbError) {
          if (dbError.code === 11000) { // Duplicate key error
            console.log('Duplicate message detected, retrieving existing message');
            savedMessage = await Message.findOne({ whatsappMessageId: msg.id.id });
          } else {
            throw dbError;
          }
        }
        
        // Broadcast to connected clients
        io?.emit('newMessage', savedMessage);
        
        // Check if auto-reply is enabled
        if (settings.botEnabled) {
          console.log('Auto-reply is enabled, generating response...');
          await handleAutoReply(savedMessage);
        } else {
          console.log('Auto-reply is disabled, not responding');
        }
      } catch (error) {
        console.error('Error handling incoming message:', error);
      }
    });

    // Initialize the client
    console.log('Starting WhatsApp client...');
    await client.initialize();
    
  } catch (error) {
    console.error('WhatsApp client initialization error:', error);
    
    // Log initialization error
    await ConnectionLog.create({
      status: 'failed',
      errorMessage: error?.message || 'Initialization error'
    });
    
    // Try to reinitialize after a delay
    setTimeout(() => {
      initialize(io);
    }, 30000); // 30 seconds
  }
};

/**
 * Handle auto-reply to an incoming message
 */
const handleAutoReply = async (incomingMessage) => {
  try {
    console.log('------------- AUTO-REPLY PROCESS START -------------');
    console.log('Starting auto-reply for message:', incomingMessage.text);
    console.log('Message from:', incomingMessage.from);
    
    // Check that the client is available
    if (!client) {
      console.error('ERROR: WhatsApp client is not initialized!');
      return;
    }
    
    // Get settings
    const settings = await getSettings();
    console.log('Auto-reply settings:', JSON.stringify(settings));
    
    const delay = settings.autoReplyDelay || 2000;
    console.log(`Delaying response for ${delay}ms to appear more natural`);
    
    // Delay the response to appear more natural
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Find matching rule based on message text
    console.log('Finding matching rule for message:', incomingMessage.text);
    const matchedRule = await ruleService.findMatchingRule(incomingMessage.text);
    
    let responseText;
    
    if (matchedRule) {
      // Use matched rule response
      console.log('✓ Found matching rule:', matchedRule.keyword);
      responseText = matchedRule.response;
      console.log('Rule response:', responseText);
      
      // Update rule usage statistics
      await ruleService.updateRuleUsage(matchedRule.id);
    } else if (settings.useAiForUnknown && settings.openaiApiKey) {
      console.log('No rule matched, trying AI response with OpenAI API');
      // Use AI to generate response for messages without a matching rule
      try {
        responseText = await aiService.generateResponse(incomingMessage.text);
        console.log('AI generated response:', responseText);
      } catch (aiError) {
        console.error('AI response generation failed:', aiError);
        responseText = "I'm sorry, I couldn't process your message right now. Please try again later.";
      }
    } else {
      // No rule matched and AI is not available or disabled
      console.log('No rule matched and AI is not available/disabled');
      if (!settings.useAiForUnknown) {
        console.log('AI fallback is disabled in settings');
      }
      if (!settings.openaiApiKey) {
        console.log('OpenAI API key is not configured');
      }
      
      // Set a default response instead of not responding
      responseText = "I don't have a specific answer for that query. Please contact our support team for assistance.";
      console.log('Using default fallback response:', responseText);
    }
    
    // Send the response
    console.log('Sending response to:', incomingMessage.from);
    try {
      const chat = await client.getChatById(incomingMessage.from);
      if (!chat) {
        console.error('ERROR: Could not find chat with ID:', incomingMessage.from);
        return;
      }
      
      await chat.sendMessage(responseText);
      console.log('✓ Response sent successfully');
    } catch (chatError) {
      console.error('ERROR sending message via WhatsApp:', chatError);
      return;
    }
    
    // Store the bot message with a unique WhatsApp message ID
    const botMessage = {
      id: uuidv4(),
      whatsappMessageId: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender: 'bot',
      text: responseText,
      from: incomingMessage.to || (client.info?.wid?._serialized || 'bot'),
      to: incomingMessage.from,
      timestamp: new Date(),
      messageType: 'text',
      replyId: incomingMessage.id
    };
    
    // Save bot message to database
    try {
      let savedBotMessage = await Message.findOne({ whatsappMessageId: botMessage.whatsappMessageId });
      if (!savedBotMessage) {
        savedBotMessage = await Message.create(botMessage);
        console.log('✓ Bot message saved to database with ID:', savedBotMessage.id);
      }
      
      // Update original message as replied
      if (incomingMessage._id) {
        await Message.findByIdAndUpdate(incomingMessage._id, {
          isReplied: true,
          replyId: savedBotMessage.id
        });
        console.log('✓ Original message updated as replied');
      }
      
      // Broadcast to connected clients
      if (io) {
        io.emit('newMessage', savedBotMessage);
        console.log('✓ New message event broadcast to connected clients');
      } else {
        console.warn('Socket.io not initialized, cannot broadcast message');
      }
    } catch (dbError) {
      console.error('ERROR saving message to database:', dbError);
      if (dbError.code !== 11000) { // Ignore duplicate key errors
        throw dbError;
      }
    }
    
    console.log('------------- AUTO-REPLY PROCESS COMPLETE -------------');
  } catch (error) {
    console.error('AUTO-REPLY ERROR:', error);
    console.log('------------- AUTO-REPLY FAILED -------------');
  }
};

/**
 * Get current connection status
 */
const getConnectionStatus = () => {
  return connectionStatus;
};

/**
 * Disconnect the client
 */
const disconnect = async () => {
  if (!client) return false;
  
  try {
    await client.destroy();
    client = null;
    
    connectionStatus = {
      status: 'disconnected',
      qr: null,
      lastUpdated: new Date().toISOString()
    };
    
    io?.emit('connectionStatus', connectionStatus);
    
    await ConnectionLog.create({
      status: 'disconnected',
      errorMessage: 'Manual disconnection'
    });
    
    return true;
  } catch (error) {
    console.error('Error disconnecting client:', error);
    return false;
  }
};

/**
 * Reset the connection (disconnect and reconnect)
 */
const resetConnection = async (forceNewQR = false) => {
  await disconnect();
  
  if (forceNewQR) {
    console.log('Forcing new QR code generation...');
    clearWhatsAppSession();
  }
  
  await initialize(io);
  return true;
};

/**
 * Send a message to a specific chat
 */
const sendMessage = async (to, text) => {
  if (!client) return { success: false, error: 'Client not connected' };
  
  try {
    const chat = await client.getChatById(to);
    await chat.sendMessage(text);
    
    const botMessage = {
      id: uuidv4(),
      whatsappMessageId: Date.now().toString(),
      sender: 'bot',
      text: text,
      from: client.info.wid._serialized,
      to: to,
      timestamp: new Date(),
      messageType: 'text'
    };
    
    // Save bot message to database
    const savedBotMessage = await Message.create(botMessage);
    
    // Broadcast to connected clients
    io?.emit('newMessage', savedBotMessage);
    
    return { success: true, message: savedBotMessage };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get settings from the database
 */
const getSettings = async () => {
  try {
    // Find all settings
    const allSettings = await Settings.find({});
    
    // Convert to key-value object
    const settingsObject = {};
    for (const setting of allSettings) {
      settingsObject[setting.key] = setting.value;
    }
    
    return settingsObject;
  } catch (error) {
    console.error('Error getting settings:', error);
    return {
      botEnabled: true,
      openaiApiKey: '',
      autoReplyDelay: 2000,
      useAiForUnknown: true
    };
  }
};

module.exports = {
  initialize,
  getConnectionStatus,
  disconnect,
  resetConnection,
  sendMessage
};
