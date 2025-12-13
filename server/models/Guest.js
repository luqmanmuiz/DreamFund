const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema({
  shareId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    default: 'Student'
  },
  cgpa: {
    type: Number,
    required: true
  },
  program: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index - MongoDB will auto-delete after expiresAt
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Guest', guestSchema);
