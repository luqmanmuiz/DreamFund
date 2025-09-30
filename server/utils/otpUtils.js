const OTP = require('../models/OTP')
const User = require('../models/User')
const emailService = require('../services/emailService')
const jwt = require('jsonwebtoken')

class OTPUtils {
  // Generate and send OTP
  static async generateAndSendOTP(email) {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format')
      }

      // Check if resend is allowed (60 seconds cooldown)
      const canResend = await OTP.canResend(email)
      if (!canResend) {
        throw new Error('Please wait 60 seconds before requesting a new code')
      }

      // Generate new OTP
      const otpCode = OTP.generateOTP()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

      // Invalidate any existing OTPs for this email
      await OTP.updateMany(
        { email, isUsed: false },
        { isUsed: true }
      )

      // Create new OTP record
      const otpRecord = new OTP({
        email,
        otpCode,
        expiresAt,
        lastResendAt: new Date()
      })

      await otpRecord.save()

      // Send email
      const emailResult = await emailService.sendOTPEmail(email, otpCode)

      return {
        success: true,
        message: 'OTP sent successfully',
        emailResult,
        expiresIn: 10 * 60 * 1000 // 10 minutes in milliseconds
      }
    } catch (error) {
      console.error('OTP generation error:', error)
      throw error
    }
  }

  // Verify OTP and handle login/registration
  static async verifyOTP(email, otpCode) {
    try {
      // Find the most recent valid OTP for this email
      const otpRecord = await OTP.findOne({
        email,
        otpCode,
        isUsed: false
      }).sort({ createdAt: -1 })

      if (!otpRecord) {
        throw new Error('Invalid or expired OTP code')
      }

      // Check if OTP is still valid
      if (!otpRecord.isValid()) {
        if (otpRecord.attempts >= 3) {
          throw new Error('Maximum attempts exceeded. Please request a new code.')
        }
        if (otpRecord.expiresAt <= new Date()) {
          throw new Error('OTP code has expired. Please request a new code.')
        }
        throw new Error('Invalid OTP code')
      }

      // Increment attempts
      await otpRecord.incrementAttempts()

      // Check if OTP is correct
      if (otpRecord.otpCode !== otpCode) {
        throw new Error('Invalid OTP code')
      }

      // Mark OTP as used
      await otpRecord.markAsUsed()

      // Check if user exists
      let user = await User.findOne({ email })

      if (!user) {
        // Create new user (registration)
        user = new User({
          email,
          name: email.split('@')[0], // Use email prefix as default name
          authMethod: 'otp',
          isEmailVerified: true
        })
        await user.save()
      }

      // Update last login
      await user.updateLastLogin()

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user._id, 
          email: user.email, 
          role: user.role,
          authMethod: user.authMethod
        },
        process.env.JWT_SECRET || 'fallback-secret-key',
        { expiresIn: '7d' }
      )

      return {
        success: true,
        message: user.name ? 'Login successful' : 'Registration and login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          authMethod: user.authMethod,
          isEmailVerified: user.isEmailVerified,
          lastLogin: user.lastLogin
        },
        isNewUser: !user.name || user.name === email.split('@')[0]
      }
    } catch (error) {
      console.error('OTP verification error:', error)
      throw error
    }
  }

  // Resend OTP
  static async resendOTP(email) {
    try {
      // Check if resend is allowed
      const canResend = await OTP.canResend(email)
      if (!canResend) {
        throw new Error('Please wait 60 seconds before requesting a new code')
      }

      // Generate and send new OTP
      return await this.generateAndSendOTP(email)
    } catch (error) {
      console.error('OTP resend error:', error)
      throw error
    }
  }

  // Clean up expired OTPs (can be called periodically)
  static async cleanupExpiredOTPs() {
    try {
      const result = await OTP.deleteMany({
        $or: [
          { expiresAt: { $lt: new Date() } },
          { isUsed: true, createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Delete used OTPs older than 24 hours
        ]
      })

      console.log(`Cleaned up ${result.deletedCount} expired OTPs`)
      return result
    } catch (error) {
      console.error('OTP cleanup error:', error)
      throw error
    }
  }

  // Get OTP status for an email
  static async getOTPStatus(email) {
    try {
      const otpRecord = await OTP.findOne({ email })
        .sort({ createdAt: -1 })
        .select('expiresAt attempts isUsed createdAt lastResendAt')

      if (!otpRecord) {
        return {
          hasActiveOTP: false,
          canResend: true,
          timeUntilExpiry: 0
        }
      }

      const now = new Date()
      const timeUntilExpiry = Math.max(0, otpRecord.expiresAt - now)
      const canResend = await OTP.canResend(email)

      return {
        hasActiveOTP: !otpRecord.isUsed && otpRecord.expiresAt > now,
        canResend,
        timeUntilExpiry,
        attemptsRemaining: Math.max(0, 3 - otpRecord.attempts),
        isExpired: otpRecord.expiresAt <= now,
        isUsed: otpRecord.isUsed
      }
    } catch (error) {
      console.error('OTP status error:', error)
      throw error
    }
  }
}

module.exports = OTPUtils