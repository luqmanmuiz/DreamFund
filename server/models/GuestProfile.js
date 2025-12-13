const mongoose = require('mongoose');
const crypto = require('crypto');

const GuestProfileSchema = new mongoose.Schema({
  shareId: {
    type: String,
    default: () => crypto.randomBytes(5).toString('hex'), // Generates a unique 10-char ID
    unique: true,
    index: true
  },
  extractedData: {
    name: String,
    cgpa: Number,
    program: String,
    major: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 30 // Automatically delete after 30 Days
  }
});

module.exports = mongoose.model('GuestProfile', GuestProfileSchema);
