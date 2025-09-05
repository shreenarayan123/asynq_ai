const { OpenAI } = require('openai');
const Settings = require('../models/Settings');

let openai = null;

/**
 * Initialize OpenAI API client
 */
const initialize = async () => {
  try {
    const settings = await getSettings();
    
    if (!settings.openaiApiKey) {
      console.log('OpenAI API key not set. AI features will be disabled.');
      return;
    }
    
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    console.log('OpenAI client initialized successfully');
  } catch (error) {
    console.error('Error initializing OpenAI client:', error);
  }
};

/**
 * Generate AI response to a message
 */
const generateResponse = async (message) => {
  try {
    console.log('AI Service: Generating response for:', message);
    
    // Re-initialize if not already initialized
    if (!openai) {
      console.log('OpenAI client not initialized, initializing now...');
      await initialize();
      
      if (!openai) {
        console.warn('Failed to initialize OpenAI client, returning default response');
        return "I'm sorry, but I'm not able to provide an AI response at the moment. Please try again later.";
      }
    }
    
    const settings = await getSettings();
    console.log('Using API key (masked):', settings.openaiApiKey ? '****' + settings.openaiApiKey.slice(-4) : 'Not set');
    
    if (!settings.openaiApiKey) {
      console.error('OpenAI API key not set, returning default response');
      return "I'm sorry, but I'm not able to provide an AI response at the moment. The API key has not been configured.";
    }
    
    console.log('Making OpenAI API call...');
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: "You are a helpful WhatsApp assistant. Keep responses concise, professional, and helpful. Respond in the same language as the user's message." 
        },
        { 
          role: "user", 
          content: message 
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    });
    
    const response = completion.choices[0].message.content.trim();
    console.log('OpenAI response received:', response);
    return response;
  } catch (error) {
    console.error('Error generating AI response:', error);
    
    // Check for specific error types
    if (error.response?.status === 401) {
      console.error('OpenAI API authentication error - invalid API key');
      return "I'm sorry, I couldn't access the AI service due to an authentication error. Please check the API key configuration.";
    } else if (error.response?.status === 429) {
      console.error('OpenAI API rate limit exceeded');
      return "I'm sorry, the AI service is currently overloaded or rate limited. Please try again later.";
    } else {
      return "I'm sorry, I couldn't process your message right now. Please try again later.";
    }
  }
};

/**
 * Update OpenAI API key
 */
const updateApiKey = async (apiKey) => {
  try {
    if (!apiKey) {
      return { success: false, error: 'API key is required' };
    }
    
    // Update key in database
    await Settings.findOneAndUpdate(
      { key: 'openaiApiKey' },
      { value: apiKey, type: 'string', isEncrypted: true },
      { upsert: true }
    );
    
    // Reinitialize with new key
    await initialize();
    
    return { success: true };
  } catch (error) {
    console.error('Error updating OpenAI API key:', error);
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
      botEnabled: false,
      openaiApiKey: '',
      autoReplyDelay: 2000,
      useAiForUnknown: true
    };
  }
};

module.exports = {
  initialize,
  generateResponse,
  updateApiKey
};
