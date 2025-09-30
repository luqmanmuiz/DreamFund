const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const auth = require('../middleware/auth')
const router = express.Router()

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'user'
    })

    await user.save()

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '7d' }
    )

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ message: 'Server error during registration' })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' })
    }

    // Check for admin credentials first (mock admin)
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

    // Check for regular user in database
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Server error during login' })
  }
})

// Get current user
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

    // Get regular user from database
    const user = await User.findById(req.user.userId).select('-password')
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, email, profile } = req.body

    // Don't allow updating mock admin
    if (req.user.userId === 'admin-1') {
      return res.status(400).json({ message: 'Cannot update admin profile' })
    }

    const user = await User.findById(req.user.userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' })
      }
    }

    // Update basic user info
    if (name) user.name = name
    if (email) user.email = email

    // Update profile data if provided
    if (profile) {
      if (profile.gpa !== undefined) user.profile.gpa = Number(profile.gpa) || 0
      if (profile.program !== undefined) user.profile.program = profile.program || ""
      if (profile.major !== undefined) user.profile.major = profile.major || ""
      if (profile.age !== undefined) user.profile.age = Number(profile.age) || 0
      if (profile.financialNeed !== undefined) user.profile.financialNeed = profile.financialNeed || "any"
      if (profile.extracurriculars !== undefined) user.profile.extracurriculars = Array.isArray(profile.extracurriculars) ? profile.extracurriculars : []
      if (profile.achievements !== undefined) user.profile.achievements = Array.isArray(profile.achievements) ? profile.achievements : []
    }

    await user.save()

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile
      }
    })
  } catch (error) {
    console.error('Profile update error:', error)
    res.status(500).json({ message: 'Server error during profile update' })
  }
})

// Update profile with extracted data from documents
router.put('/profile/extracted-data', auth, async (req, res) => {
  try {
    const { name, cgpa, program } = req.body

    // Don't allow updating mock admin
    if (req.user.userId === 'admin-1') {
      return res.status(400).json({ message: 'Cannot update admin profile' })
    }

    const user = await User.findById(req.user.userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    console.log('Updating profile with extracted data:', { name, cgpa, program })

    // Update profile with extracted data
    if (name && name !== 'Not found') {
      user.name = name
    }
    if (cgpa !== undefined && cgpa !== null && cgpa !== 'Not found') {
      const gpaValue = Number(cgpa)
      if (!isNaN(gpaValue) && gpaValue >= 0 && gpaValue <= 4.0) {
        user.profile.gpa = gpaValue
        console.log(`Updated GPA to: ${gpaValue}`)
      }
    }
    if (program && program !== 'Not found') {
      user.profile.program = program
      user.profile.major = program // Also update major field for compatibility
      console.log(`Updated program to: ${program}`)
    }

    await user.save()

    console.log('Updated user profile:', user.profile)

    res.json({
      success: true,
      message: 'Profile updated with extracted data',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile
      }
    })
  } catch (error) {
    console.error('Profile update with extracted data error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Server error during profile update' 
    })
  }
})

// Debug route to check user profile data
router.get('/profile/debug/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profile: user.profile
      }
    })
  } catch (error) {
    console.error('Profile debug error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Server error during profile debug' 
    })
  }
})

// Manual profile update route for testing (no auth required for testing)
router.put('/profile/manual-update/:userId', async (req, res) => {
  try {
    const { name, cgpa, program } = req.body
    const userId = req.params.userId

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    console.log('Manual profile update:', { userId, name, cgpa, program })

    // Update profile with extracted data
    if (name && name !== 'Not found') {
      user.name = name
    }
    if (cgpa !== undefined && cgpa !== null && cgpa !== 'Not found') {
      const gpaValue = Number(cgpa)
      if (!isNaN(gpaValue) && gpaValue >= 0 && gpaValue <= 4.0) {
        user.profile.gpa = gpaValue
        console.log(`Updated GPA to: ${gpaValue}`)
      }
    }
    if (program && program !== 'Not found') {
      user.profile.program = program
      user.profile.major = program // Also update major field for compatibility
      console.log(`Updated program to: ${program}`)
    }

    await user.save()

    console.log('Updated user profile:', user.profile)

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profile: user.profile
      }
    })
  } catch (error) {
    console.error('Manual profile update error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Server error during profile update' 
    })
  }
})

module.exports = router
