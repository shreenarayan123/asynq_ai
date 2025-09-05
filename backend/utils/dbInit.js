const Settings = require('../models/Settings');
const Rule = require('../models/Rule');
const ruleService = require('../services/ruleService');

/**
 * Initialize default response rules
 */
const initializeDefaultRules = async () => {
  try {
    console.log('Setting up default auto-reply rules...');
    
    // Default rules
    const defaultRules = [
      {
        keyword: 'hello',
        response: 'Hi there! 👋 How can I assist you today?',
        isActive: true,
        matchType: 'contains',
        caseSensitive: false,
        priority: 5
      },
      {
        keyword: 'hi',
        response: 'Hello! 👋 What can I help you with?',
        isActive: true,
        matchType: 'contains',
        caseSensitive: false,
        priority: 5
      },
      {
        keyword: 'pricing',
        response: 'Our pricing plans start at $10/month for the Basic plan. The Pro plan is $29/month and includes additional features. Would you like more details about any specific plan?',
        isActive: true,
        matchType: 'contains',
        caseSensitive: false,
        priority: 10
      },
      {
        keyword: 'help',
        response: 'I can help you with:\n- Product information\n- Pricing details\n- Support requests\n- General questions\n\nJust let me know what you need!',
        isActive: true,
        matchType: 'contains',
        caseSensitive: false,
        priority: 5
      },
      {
        keyword: 'thank',
        response: 'You\'re welcome! 😊 Let me know if you need anything else!',
        isActive: true,
        matchType: 'contains',
        caseSensitive: false,
        priority: 5
      }
    ];
    
    // Create each default rule
    let createdCount = 0;
    for (const ruleData of defaultRules) {
      // Check if a similar rule already exists
      const existingRules = await Rule.find({
        keyword: { $regex: new RegExp(ruleData.keyword, 'i') },
        matchType: ruleData.matchType
      });
      
      if (existingRules.length === 0) {
        await ruleService.createRule(ruleData);
        createdCount++;
        console.log(`Created default rule for keyword: "${ruleData.keyword}"`);
      } else {
        console.log(`Rule for keyword "${ruleData.keyword}" already exists, skipping`);
      }
    }
    
    console.log(`Default rules setup complete. Created ${createdCount} new rules.`);
    return true;
  } catch (error) {
    console.error('Error initializing default rules:', error);
    return false;
  }
};

/**
 * Initialize default settings in the database
 */
const initializeSettings = async () => {
  try {
    console.log('Initializing default settings...');
    
    // Check if Settings model has the initializeDefaults method
    if (typeof Settings.initializeDefaults === 'function') {
      await Settings.initializeDefaults();
      console.log('Default settings initialized successfully');
    } else {
      // Fallback manual initialization
      const defaultSettings = [
        {
          key: 'botEnabled',
          value: true,
          type: 'boolean',
          description: 'Enable/disable auto-reply bot'
        },
        {
          key: 'openaiApiKey',
          value: '',
          type: 'string',
          description: 'OpenAI API key for AI responses',
          isEncrypted: true
        },
        {
          key: 'autoReplyDelay',
          value: 2000,
          type: 'number',
          description: 'Delay in milliseconds before auto-reply'
        },
        {
          key: 'useAiForUnknown',
          value: true,
          type: 'boolean',
          description: 'Use AI for messages that don\'t match any rules'
        },
        {
          key: 'maxDailyMessages',
          value: 1000,
          type: 'number',
          description: 'Maximum number of auto-replies per day'
        }
      ];
      
      for (const setting of defaultSettings) {
        await Settings.findOneAndUpdate(
          { key: setting.key },
          setting,
          { upsert: true, new: true }
        );
      }
      
      console.log('Default settings initialized manually');
    }
    
    // Initialize default rules
    await initializeDefaultRules();
  } catch (error) {
    console.error('Error initializing settings:', error);
  }
};

/**
 * Clean up old data to prevent database growth
 */
const setupCleanupTasks = async () => {
  const cron = require('node-cron');
  const ConnectionLog = require('../models/ConnectionLog');
  
  // Run cleanup every day at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      // Clean up old connection logs
      if (typeof ConnectionLog.cleanup === 'function') {
        await ConnectionLog.cleanup();
        console.log('Connection logs cleanup completed');
      }
      
      // Add more cleanup tasks as needed
      
    } catch (error) {
      console.error('Error in cleanup task:', error);
    }
  });
  
  console.log('Cleanup tasks scheduled');
};

module.exports = {
  initializeSettings,
  setupCleanupTasks
};
