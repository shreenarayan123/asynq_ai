const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object'],
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  isEncrypted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Default settings
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
  },
  {
    key: 'businessHours',
    value: {
      enabled: false,
      start: '09:00',
      end: '18:00',
      timezone: 'UTC'
    },
    type: 'object',
    description: 'Business hours configuration'
  }
];

settingsSchema.statics.initializeDefaults = async function() {
  for (const setting of defaultSettings) {
    await this.findOneAndUpdate(
      { key: setting.key },
      setting,
      { upsert: true, new: true }
    );
  }
};

module.exports = mongoose.model('Settings', settingsSchema);
