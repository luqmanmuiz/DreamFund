const mongoose = require('mongoose');

const scrapingSessionSchema = new mongoose.Schema({
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // Duration in seconds
    required: true
  },
  totalProcessed: {
    type: Number,
    default: 0
  },
  successCount: {
    type: Number,
    default: 0
  },
  failedCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['success', 'partial', 'failed', 'cancelled'],
    required: true
  },
  errors: [{
    type: String
  }],
  triggeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ScrapingSession', scrapingSessionSchema);
