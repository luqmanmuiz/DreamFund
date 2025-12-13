const express = require("express")
const User = require("../models/User")
const Scholarship = require("../models/Scholarship")
const adminAuth = require("../middleware/adminAuth")
const axios = require("axios")
const router = express.Router()

// Get dashboard statistics
router.get("/stats", adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "user" })
    const totalScholarships = await Scholarship.countDocuments()
    const activeScholarships = await Scholarship.countDocuments({ status: "active" })
    const totalApplications = await Scholarship.aggregate([{ $unwind: "$applicants" }, { $count: "total" }])

    // Fetch guest analytics
    let guestStats = {
      totalCreated: 0,
      activeNow: 0,
      createdToday: 0
    };
    
    try {
      const guestResponse = await axios.get('http://localhost:5000/api/guests/analytics/stats');
      if (guestResponse.data.success) {
        guestStats = guestResponse.data.analytics;
      }
    } catch (error) {
      console.error('Failed to fetch guest analytics:', error.message);
    }

    const recentUsers = await User.find({ role: "user" })
      .select("name email createdAt")
      .sort({ createdAt: -1 })
      .limit(5)

    const recentApplications = await Scholarship.aggregate([
      { $unwind: "$applicants" },
      { $sort: { "applicants.appliedDate": -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "applicants.user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $project: {
          title: 1,
          "user.name": 1,
          "user.email": 1,
          "applicants.appliedDate": 1,
          "applicants.status": 1,
        },
      },
    ])

    res.json({
      stats: {
        totalUsers,
        totalScholarships,
        activeScholarships,
        totalApplications: totalApplications[0]?.total || 0,
      },
      guestStats,
      recentUsers,
      recentApplications,
      guestMode: totalUsers === 0,
      message: totalUsers === 0 ? "System operating in guest mode. No user registration required." : null
    })
  } catch (error) {
    console.error("Get stats error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get user analytics - Update to handle no users
router.get("/users", adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "user" })
    
    if (totalUsers === 0) {
      return res.json({
        usersByMonth: [],
        usersByMajor: [],
        guestMode: true,
        message: "No user data available. System operates in guest mode."
      })
    }

    const usersByMonth = await User.aggregate([
      {
        $match: { role: "user" },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ])

    const usersByMajor = await User.aggregate([
      {
        $match: {
          role: "user",
          "profile.major": { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$profile.major",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ])

    res.json({
      usersByMonth,
      usersByMajor,
      guestMode: false
    })
  } catch (error) {
    console.error("Get user analytics error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get scholarship status distribution
router.get("/scholarship-status", adminAuth, async (req, res) => {
  try {
    const statusDistribution = await Scholarship.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ])

    // Also check for expired scholarships (deadline passed)
    const now = new Date()
    const expiredCount = await Scholarship.countDocuments({
      deadline: { $lt: now },
      status: "active",
    })

    res.json({
      statusDistribution,
      expiredCount,
    })
  } catch (error) {
    console.error("Get scholarship status error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
