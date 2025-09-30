const express = require('express')
const rateLimit = require('express-rate-limit')
const OTPUtils = require('../utils/otpUtils')
const auth = require('../middleware/auth')
const router = express.Router()

// Rate limiting for OTP endpoints
const otpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many OTP requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
})

const strictRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // Limit each IP to 3 requests per minute
  message: {
    error: 'Too many requests, please slow down.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Send OTP endpoint
router.post('/send-otp', otpRateLimit, async (req, res) => {
  try {
    const { email } = req.body

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      })
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      })
    }

    const result = await OTPUtils.generateAndSendOTP(email.toLowerCase())

    res.json({
      success: true,
      message: result.message,
      expiresIn: result.expiresIn,
      emailResult: result.emailResult
    })
  } catch (error) {
    console.error('Send OTP error:', error)
    
    let statusCode = 500
    let message = 'Failed to send OTP. Please try again.'

    if (error.message.includes('wait 60 seconds')) {
      statusCode = 429
      message = error.message
    } else if (error.message.includes('Invalid email')) {
      statusCode = 400
      message = error.message
    }

    res.status(statusCode).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Verify OTP endpoint
router.post('/verify-otp', strictRateLimit, async (req, res) => {
  try {
    const { email, otpCode } = req.body

    // Validation
    if (!email || !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP code are required'
      })
    }

    // Basic OTP format validation
    if (!/^\d{6}$/.test(otpCode)) {
      return res.status(400).json({
        success: false,
        message: 'OTP code must be 6 digits'
      })
    }

    const result = await OTPUtils.verifyOTP(email.toLowerCase(), otpCode)

    res.json({
      success: true,
      message: result.message,
      token: result.token,
      user: result.user,
      isNewUser: result.isNewUser
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    
    let statusCode = 400
    let message = error.message

    if (error.message.includes('Maximum attempts exceeded')) {
      statusCode = 429
    } else if (error.message.includes('expired')) {
      statusCode = 410
    }

    res.status(statusCode).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Resend OTP endpoint
router.post('/resend-otp', otpRateLimit, async (req, res) => {
  try {
    const { email } = req.body

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      })
    }

    const result = await OTPUtils.resendOTP(email.toLowerCase())

    res.json({
      success: true,
      message: result.message,
      expiresIn: result.expiresIn,
      emailResult: result.emailResult
    })
  } catch (error) {
    console.error('Resend OTP error:', error)
    
    let statusCode = 500
    let message = 'Failed to resend OTP. Please try again.'

    if (error.message.includes('wait 60 seconds')) {
      statusCode = 429
      message = error.message
    }

    res.status(statusCode).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Get OTP status endpoint
router.get('/otp-status/:email', async (req, res) => {
  try {
    const { email } = req.params

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      })
    }

    const status = await OTPUtils.getOTPStatus(email.toLowerCase())

    res.json({
      success: true,
      ...status
    })
  } catch (error) {
    console.error('OTP status error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get OTP status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Test email service endpoint (for development)
router.get('/test-email', auth, async (req, res) => {
  try {
    // Only allow admin users to test email service
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      })
    }

    const emailService = require('../services/emailService')
    const result = await emailService.testConnection()

    res.json(result)
  } catch (error) {
    console.error('Email service test error:', error)
    res.status(500).json({
      success: false,
      message: 'Email service test failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Cleanup expired OTPs endpoint (for maintenance)
router.post('/cleanup-otps', auth, async (req, res) => {
  try {
    // Only allow admin users to cleanup OTPs
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      })
    }

    const result = await OTPUtils.cleanupExpiredOTPs()

    res.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} expired OTPs`,
      deletedCount: result.deletedCount
    })
  } catch (error) {
    console.error('OTP cleanup error:', error)
    res.status(500).json({
      success: false,
      message: 'OTP cleanup failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

module.exports = router