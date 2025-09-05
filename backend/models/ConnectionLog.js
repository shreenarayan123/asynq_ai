const mongoose = require('mongoose');

const connectionLogSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['connected', 'disconnected', 'connecting', 'failed'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  qrCode: {
    type: String,
    default: null
  },
  sessionInfo: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  errorMessage: {
    type: String,
    default: null
  },
  clientInfo: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Keep only last 100 connection logs
connectionLogSchema.statics.cleanup = async function() {
  const logs = await this.find().sort({ timestamp: -1 }).skip(100);
  if (logs.length > 0) {
    const idsToDelete = logs.map(log => log._id);
    await this.deleteMany({ _id: { $in: idsToDelete } });
  }
};

module.exports = mongoose.model('ConnectionLog', connectionLogSchema);
