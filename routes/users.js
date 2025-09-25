const express = require("express")
const User = require("../models/User")
const auth = require("../middleware/auth")
const adminAuth = require("../middleware/adminAuth")
const router = express.Router()

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private
router.get("/", [auth, adminAuth], async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query
    const query = {}
    
    if (role && role !== "all") {
      query.role = role
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } }, 
        { email: { $regex: search, $options: "i" } }
      ]
    }

    // Fixed: Use safe populate with error handling
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate({
        path: "matches.scholarship",
        select: "title provider",
        options: { strictPopulate: false } // Don't fail if reference doesn't exist
      })
      .populate({
        path: "applications.scholarship", 
        select: "title provider",
        options: { strictPopulate: false }
      })
      .lean() // Use lean for better performance

    const total = await User.countDocuments(query)

    console.log(`✅ Successfully fetched ${users.length} users`)

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total,
    })
  } catch (error) {
    console.error("❌ Error in GET /api/users:", error.message)
    
    // Fallback: Try without populate if populate fails
    try {
      console.log("🔄 Retrying without populate...")
      const users = await User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean()

      const total = await User.countDocuments(query)

      res.json({
        users,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
        total,
        warning: "Populated data not available"
      })
    } catch (fallbackError) {
      console.error("❌ Fallback also failed:", fallbackError.message)
      res.status(500).json({ 
        message: "Server error", 
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
})

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get("/:id", [auth, adminAuth], async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate({
        path: "matches.scholarship",
        options: { strictPopulate: false }
      })
      .populate({
        path: "applications.scholarship",
        options: { strictPopulate: false }
      })
      .lean()

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json(user)
  } catch (error) {
    console.error("❌ Error in GET /api/users/:id:", error.message)
    
    // Fallback without populate
    try {
      const user = await User.findById(req.params.id)
        .select("-password")
        .lean()

      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }

      res.json(user)
    } catch (fallbackError) {
      res.status(500).json({ 
        message: "Server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
})

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put("/:id", [auth, adminAuth], async (req, res) => {
  try {
    const { name, email, profile, role } = req.body
    
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Update fields
    if (name) user.name = name
    if (email) user.email = email
    if (profile) user.profile = { ...user.profile, ...profile }
    if (role) user.role = role

    await user.save()

    const updatedUser = await User.findById(user._id).select("-password").lean()

    res.json({
      message: "User updated successfully",
      user: updatedUser,
    })
  } catch (error) {
    console.error("❌ Error in PUT /api/users/:id:", error.message)
    res.status(500).json({ 
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private
router.delete("/:id", [auth, adminAuth], async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    await User.findByIdAndDelete(req.params.id) // More reliable than deleteOne()
    
    res.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("❌ Error in DELETE /api/users/:id:", error.message)
    res.status(500).json({ 
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// @route   GET /api/users/stats/overview
// @desc    Get user statistics
// @access  Private
router.get("/stats/overview", [auth, adminAuth], async (req, res) => {
  try {
    const totalUsers = await User.countDocuments()
    const totalStudents = await User.countDocuments({ role: "student" })
    const totalAdmins = await User.countDocuments({ role: "admin" })
    
    // Fixed: Use existing lastActive field instead of non-existent field
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const activeUsers = await User.countDocuments({
      lastActive: { $gte: thirtyDaysAgo }
    })

    // Users with complete profiles (using your actual schema fields)
    const usersWithProfiles = await User.countDocuments({
      "profile.cgpa": { $exists: true, $ne: null },
      "profile.course": { $exists: true, $ne: null, $ne: "" }
    })

    console.log("✅ User stats calculated successfully")

    res.json({
      totalUsers,
      totalStudents,
      totalAdmins,
      activeUsers,
      usersWithProfiles,
    })
  } catch (error) {
    console.error("❌ Error in GET /api/users/stats/overview:", error.message)
    res.status(500).json({ 
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

module.exports = router