const express = require("express")
const User = require("../models/User")
const Scholarship = require("../models/Scholarship")
const Guest = require("../models/Guest")
const ScholarshipClick = require("../models/ScholarshipClick")
const adminAuth = require("../middleware/adminAuth")
const axios = require("axios")
const router = express.Router()

// Helper function to fetch recent activity
async function fetchRecentActivity(limit = 10) {
  try {
    const activities = [];

    // Get recent guests
    const recentGuests = await Guest.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('name program createdAt')
      .lean();

    activities.push(...recentGuests.map(g => ({
      type: 'guest_created',
      data: {
        name: g.name,
        program: g.program
      },
      timestamp: g.createdAt
    })));

    // Get recent clicks
    const recentClicks = await ScholarshipClick.find()
      .populate('scholarshipId', 'title')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    activities.push(...recentClicks.map(c => ({
      type: 'scholarship_clicked',
      data: {
        scholarshipTitle: c.scholarshipId?.title || 'Unknown Scholarship',
        sessionId: c.sessionId
      },
      timestamp: c.createdAt
    })));

    // Get recent scholarships
    const recentScholarships = await Scholarship.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('title status createdAt')
      .lean();

    activities.push(...recentScholarships.map(s => ({
      type: 'scholarship_added',
      data: {
        title: s.title,
        status: s.status
      },
      timestamp: s.createdAt
    })));

    // Sort by timestamp and return top N
    return activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
}

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

    // Fetch recent activity
    const recentActivity = await fetchRecentActivity(10);

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
      recentActivity,
      guestMode: totalUsers === 0,
      message: totalUsers === 0 ? "System operating in guest mode. No user registration required." : null
    })
  } catch (error) {
    console.error("Get stats error:", error)
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

// Get scholarship application analytics
router.get("/scholarship-applications", adminAuth, async (req, res) => {
  try {
    const applicationAnalytics = await ScholarshipClick.aggregate([
      {
        $match: {
          feedbackResponse: "completed",
        },
      },
      {
        $group: {
          _id: "$scholarshipId",
          totalApplications: { $sum: 1 },
          earliestApplication: { $min: "$feedbackTimestamp" },
          latestApplication: { $max: "$feedbackTimestamp" },
        },
      },
      {
        $lookup: {
          from: "scholarships",
          localField: "_id",
          foreignField: "_id",
          as: "scholarship",
        },
      },
      {
        $unwind: "$scholarship",
      },
      {
        $project: {
          _id: 1,
          scholarshipTitle: "$scholarship.title",
          totalApplications: 1,
          earliestApplication: 1,
          latestApplication: 1,
        },
      },
      {
        $sort: { totalApplications: -1 },
      },
    ])

    res.json({
      success: true,
      analytics: applicationAnalytics,
    })
  } catch (error) {
    console.error("Get scholarship application analytics error:", error)
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    })
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

module.exports = router
