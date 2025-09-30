const mongoose = require("mongoose")

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otpCode: {
      type: String,
      required: true,
      length: 6,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index
    },
    attempts: {
      type: Number,
      default: 0,
      max: 3,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    lastResendAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// Index for efficient queries
otpSchema.index({ email: 1, createdAt: -1 })
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Static method to generate 6-digit OTP
otpSchema.statics.generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Static method to check if resend is allowed (60 seconds cooldown)
otpSchema.statics.canResend = async function (email) {
  const lastOTP = await this.findOne({ email })
    .sort({ createdAt: -1 })
    .select("lastResendAt")
  
  if (!lastOTP || !lastOTP.lastResendAt) {
    return true
  }
  
  const now = new Date()
  const timeDiff = now - lastOTP.lastResendAt
  return timeDiff >= 60000 // 60 seconds
}

// Instance method to check if OTP is valid
otpSchema.methods.isValid = function () {
  const now = new Date()
  return !this.isUsed && this.attempts < 3 && this.expiresAt > now
}

// Instance method to increment attempts
otpSchema.methods.incrementAttempts = function () {
  this.attempts += 1
  return this.save()
}

// Instance method to mark as used
otpSchema.methods.markAsUsed = function () {
  this.isUsed = true
  return this.save()
}

module.exports = mongoose.model("OTP", otpSchema)