const express = require('express')
const jwt = require('jsonwebtoken')
// User model is only used for Admin check or legacy support now
const User = require('../models/User') 
const auth = require('../middleware/auth')
const router = express.Router()

// Login (Admin Only)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' })
    }

    // Check for admin credentials (mock admin)
    if (email === 'admin@dreamfund.com' && password === 'admin123') {
      const mockAdmin = {
        id: 'admin-1',
        name: 'System Administrator',
        email: 'admin@dreamfund.com',
        role: 'admin'
      }

      const token = jwt.sign(
        { userId: mockAdmin.id, email: mockAdmin.email, role: mockAdmin.role },
        process.env.JWT_SECRET || 'fallback-secret-key',
        { expiresIn: '7d' }
      )

      return res.json({
        token,
        user: mockAdmin
      })
    }

    // Student login via DB is disabled/removed as per requirements
    return res.status(401).json({ message: 'Invalid credentials' })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Server error during login' })
  }
})

// Get current user (Admin Only)
router.get('/me', auth, async (req, res) => {
  try {
    // Check if it's the mock admin
    if (req.user.userId === 'admin-1') {
      return res.json({
        user: {
          id: 'admin-1',
          name: 'System Administrator',
          email: 'admin@dreamfund.com',
          role: 'admin'
        }
      })
    }

    return res.status(404).json({ message: 'User not found' })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
