const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  keyword: {
    type: String,
    required: true,
    trim: true
  },
  response: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  matchType: {
    type: String,
    enum: ['exact', 'contains', 'starts_with', 'ends_with', 'regex'],
    default: 'contains'
  },
  caseSensitive: {
    type: Boolean,
    default: false
  },
  priority: {
    type: Number,
    default: 0
  },
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
ruleSchema.index({ keyword: 1 });
ruleSchema.index({ isActive: 1, priority: -1 });

module.exports = mongoose.model('Rule', ruleSchema);
