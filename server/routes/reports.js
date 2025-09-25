const express = require("express")
const User = require("../models/User")
const Scholarship = require("../models/Scholarship")
const adminAuth = require("../middleware/adminAuth")
const router = express.Router()

// Get dashboard statistics
router.get("/stats", adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "user" })
    const totalScholarships = await Scholarship.countDocuments()
    const activeScholarships = await Scholarship.countDocuments({ status: "active" })
    const totalApplications = await Scholarship.aggregate([{ $unwind: "$applicants" }, { $count: "total" }])

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
      recentUsers,
      recentApplications,
    })
  } catch (error) {
    console.error("Get stats error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get user analytics
router.get("/users", adminAuth, async (req, res) => {
  try {
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
    })
  } catch (error) {
    console.error("Get user analytics error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
