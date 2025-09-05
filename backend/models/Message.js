const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  whatsappMessageId: {
    type: String,
    required: true,
    unique: true
  },
  sender: {
    type: String,
    enum: ['user', 'bot'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isReplied: {
    type: Boolean,
    default: false
  },
  replyId: {
    type: String,
    default: null
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'audio', 'video', 'document'],
    default: 'text'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better query performance
messageSchema.index({ from: 1, timestamp: -1 });
messageSchema.index({ sender: 1, timestamp: -1 });
messageSchema.index({ whatsappMessageId: 1 });

module.exports = mongoose.model('Message', messageSchema);
