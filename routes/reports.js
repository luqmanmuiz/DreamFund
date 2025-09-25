const express = require("express")
const User = require("../models/User")
const Scholarship = require("../models/Scholarship")
const auth = require("../middleware/auth")
const adminAuth = require("../middleware/adminAuth")

const router = express.Router()

// @route   GET /api/reports/dashboard
// @desc    Get dashboard statistics
// @access  Private (Admin only)
router.get("/dashboard", [auth, adminAuth], async (req, res) => {
  try {
    // Basic counts
    const totalUsers = await User.countDocuments()
    const totalStudents = await User.countDocuments({ role: "student" })
    const totalScholarships = await Scholarship.countDocuments()
    const activeScholarships = await Scholarship.countDocuments({ status: "Active" })

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    })
    const newScholarshipsThisMonth = await Scholarship.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    })

    // Application statistics
    const totalApplications = await User.aggregate([{ $unwind: "$applications" }, { $count: "total" }])

    const applicationsByStatus = await User.aggregate([
      { $unwind: "$applications" },
      { $group: { _id: "$applications.status", count: { $sum: 1 } } },
    ])

    // Top scholarships by application count
    const topScholarships = await Scholarship.find()
      .sort({ applicationCount: -1 })
      .limit(5)
      .select("title provider applicationCount amount")

    // User engagement
    const usersWithProfiles = await User.countDocuments({
      "profile.cgpa": { $exists: true },
      "profile.course": { $exists: true },
    })

    const usersWithTranscripts = await User.countDocuments({
      transcriptUploaded: true,
    })

    // Monthly user registration trend (last 6 months)
    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
    const monthlyUsers = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ])

    // Scholarship categories distribution
    const scholarshipsByCategory = await Scholarship.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])

    res.json({
      overview: {
        totalUsers,
        totalStudents,
        totalScholarships,
        activeScholarships,
        newUsersThisMonth,
        newScholarshipsThisMonth,
        totalApplications: totalApplications[0]?.total || 0,
      },
      applications: {
        byStatus: applicationsByStatus,
        topScholarships,
      },
      engagement: {
        usersWithProfiles,
        usersWithTranscripts,
        profileCompletionRate: totalStudents > 0 ? (usersWithProfiles / totalStudents) * 100 : 0,
        transcriptUploadRate: totalStudents > 0 ? (usersWithTranscripts / totalStudents) * 100 : 0,
      },
      trends: {
        monthlyUsers,
        scholarshipsByCategory,
      },
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/reports/users
// @desc    Get detailed user reports
// @access  Private (Admin only)
router.get("/users", [auth, adminAuth], async (req, res) => {
  try {
    const { startDate, endDate, format = "summary" } = req.query

    let dateFilter = {}
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      }
    }

    if (format === "detailed") {
      // Detailed user report
      const users = await User.find(dateFilter)
        .select("-password")
        .populate("applications.scholarship", "title provider")
        .sort({ createdAt: -1 })

      res.json({ users })
    } else {
      // Summary report
      const userStats = await User.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            avgCGPA: { $avg: "$profile.cgpa" },
            courseDistribution: { $push: "$profile.course" },
            yearDistribution: { $push: "$profile.year" },
          },
        },
      ])

      res.json({ summary: userStats[0] || {} })
    }
  } catch (error) {
    console.error("User reports error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/reports/scholarships
// @desc    Get scholarship performance reports
// @access  Private (Admin only)
router.get("/scholarships", [auth, adminAuth], async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    let dateFilter = {}
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      }
    }

    // Scholarship performance metrics
    const scholarshipStats = await Scholarship.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalScholarships: { $sum: 1 },
          totalApplications: { $sum: "$applicationCount" },
          avgApplicationsPerScholarship: { $avg: "$applicationCount" },
          categoryDistribution: { $push: "$category" },
          statusDistribution: { $push: "$status" },
        },
      },
    ])

    // Top performing scholarships
    const topPerformers = await Scholarship.find(dateFilter)
      .sort({ applicationCount: -1 })
      .limit(10)
      .select("title provider applicationCount amount category")

    // Scholarships with no applications
    const noApplications = await Scholarship.find({
      ...dateFilter,
      applicationCount: 0,
    }).select("title provider createdAt")

    res.json({
      summary: scholarshipStats[0] || {},
      topPerformers,
      noApplications,
    })
  } catch (error) {
    console.error("Scholarship reports error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/reports/export
// @desc    Export data in CSV format
// @access  Private (Admin only)
router.get("/export", [auth, adminAuth], async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query

    let dateFilter = {}
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      }
    }

    if (type === "users") {
      const users = await User.find(dateFilter).select("-password")

      // Convert to CSV format
      const csvHeader = "Name,Email,Role,CGPA,Course,Year,University,Created At\n"
      const csvData = users
        .map((user) => {
          return [
            user.name,
            user.email,
            user.role,
            user.profile?.cgpa || "",
            user.profile?.course || "",
            user.profile?.year || "",
            user.profile?.university || "",
            user.createdAt.toISOString(),
          ].join(",")
        })
        .join("\n")

      res.setHeader("Content-Type", "text/csv")
      res.setHeader("Content-Disposition", "attachment; filename=users.csv")
      res.send(csvHeader + csvData)
    } else if (type === "scholarships") {
      const scholarships = await Scholarship.find(dateFilter)

      const csvHeader = "Title,Provider,Amount,Min CGPA,Category,Status,Applications,Created At\n"
      const csvData = scholarships
        .map((scholarship) => {
          return [
            scholarship.title,
            scholarship.provider,
            scholarship.amount,
            scholarship.minCGPA,
            scholarship.category,
            scholarship.status,
            scholarship.applicationCount,
            scholarship.createdAt.toISOString(),
          ].join(",")
        })
        .join("\n")

      res.setHeader("Content-Type", "text/csv")
      res.setHeader("Content-Disposition", "attachment; filename=scholarships.csv")
      res.send(csvHeader + csvData)
    } else {
      res.status(400).json({ message: "Invalid export type" })
    }
  } catch (error) {
    console.error("Export error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
