const express = require("express");
const router = express.Router();
const ScholarshipClick = require("../models/ScholarshipClick");
const Scholarship = require("../models/Scholarship");

// @route   POST /api/clicks/track
// @desc    Track "Apply Now" button clicks
// @access  Public (works for both logged-in and guest users)
router.post("/track", async (req, res) => {
  try {
    const { scholarshipId, sessionId, userId } = req.body;

    // Validate required fields
    if (!scholarshipId || !sessionId) {
      return res.status(400).json({
        success: false,
        message: "Scholarship ID and session ID are required",
      });
    }

    // Verify scholarship exists
    const scholarship = await Scholarship.findById(scholarshipId);
    if (!scholarship) {
      return res.status(404).json({
        success: false,
        message: "Scholarship not found",
      });
    }

    // Get user agent and IP address for analytics
    const userAgent = req.headers["user-agent"] || null;
    const ipAddress =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      null;

    // Create click record
    const clickRecord = new ScholarshipClick({
      userId: userId || null,
      scholarshipId,
      sessionId,
      userAgent,
      ipAddress,
    });

    // Save asynchronously without waiting
    clickRecord.save().catch((error) => {
      console.error("Error saving click record:", error);
    });

    // Immediately respond to not block the redirect
    return res.status(200).json({
      success: true,
      message: "Click tracked successfully",
    });
  } catch (error) {
    console.error("Click tracking error:", error);
    // Don't let tracking errors block the user
    return res.status(200).json({
      success: false,
      message: "Click tracking failed, but continuing",
    });
  }
});

// @route   GET /api/clicks/stats/:scholarshipId
// @desc    Get click statistics for a scholarship
// @access  Public (for now - can be restricted to admin later)
router.get("/stats/:scholarshipId", async (req, res) => {
  try {
    const { scholarshipId } = req.params;

    // Get total clicks
    const totalClicks = await ScholarshipClick.countDocuments({
      scholarshipId,
    });

    // Get unique users (by sessionId)
    const uniqueVisitors = await ScholarshipClick.distinct("sessionId", {
      scholarshipId,
    });

    // Get logged-in user clicks
    const loggedInClicks = await ScholarshipClick.countDocuments({
      scholarshipId,
      userId: { $ne: null },
    });

    // Get guest clicks
    const guestClicks = totalClicks - loggedInClicks;

    res.json({
      success: true,
      stats: {
        totalClicks,
        uniqueVisitors: uniqueVisitors.length,
        loggedInClicks,
        guestClicks,
      },
    });
  } catch (error) {
    console.error("Error fetching click stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch click statistics",
    });
  }
});

// @route   GET /api/clicks/analytics
// @desc    Get overall click analytics (for admin dashboard)
// @access  Public (for now - should be restricted to admin later)
router.get("/analytics", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Get total clicks in period
    const totalClicks = await ScholarshipClick.countDocuments(dateFilter);

    // Get clicks grouped by scholarship
    const clicksByScholarship = await ScholarshipClick.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$scholarshipId",
          clickCount: { $sum: 1 },
          uniqueUsers: { $addToSet: "$sessionId" },
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
      { $unwind: "$scholarship" },
      {
        $project: {
          scholarshipId: "$_id",
          scholarshipTitle: "$scholarship.title",
          clickCount: 1,
          uniqueVisitors: { $size: "$uniqueUsers" },
        },
      },
      { $sort: { clickCount: -1 } },
      { $limit: 10 },
    ]);

    // Get unique sessions
    const uniqueSessions = await ScholarshipClick.distinct(
      "sessionId",
      dateFilter
    );

    res.json({
      success: true,
      analytics: {
        totalClicks,
        uniqueVisitors: uniqueSessions.length,
        topScholarships: clicksByScholarship,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
    });
  }
});

// @route   POST /api/clicks/feedback
// @desc    Submit feedback for a scholarship click
// @access  Public
router.post("/feedback", async (req, res) => {
    try {
      const { scholarshipId, sessionId, responseType, userId } = req.body;
  
      // Validate required fields
      if (!scholarshipId || !sessionId || !responseType) {
        return res.status(400).json({
          success: false,
          message: "Scholarship ID, session ID, and response type are required",
        });
      }
  
      // Validate response type
      const validResponses = ["completed", "not_yet", "dismissed"];
      if (!validResponses.includes(responseType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid response type",
        });
      }
  
      // Find the most recent click record for this session + scholarship
      const clickRecord = await ScholarshipClick.findOne({
        sessionId,
        scholarshipId,
      }).sort({ createdAt: -1 });
  
      if (!clickRecord) {
        return res.status(404).json({
          success: false,
          message: "Click record not found",
        });
      }
  
      // Check if feedback already submitted with "completed"
      // Allow re-submission if previous response was "not_yet" or "dismissed"
      if (clickRecord.feedbackResponse === "completed") {
        return res.status(400).json({
          success: false,
          message: "Feedback already submitted for this scholarship",
        });
      }
  
      // Update the click record with feedback
      clickRecord.feedbackResponse = responseType;
      clickRecord.feedbackTimestamp = new Date();
      if (userId) {
        clickRecord.userId = userId;
      }
      await clickRecord.save();
  
      return res.status(200).json({
        success: true,
        message: "Feedback recorded successfully",
        data: {
          clickId: clickRecord._id,
          responseType,
          timestamp: clickRecord.feedbackTimestamp,
        },
      });
    } catch (error) {
      console.error("Feedback submission error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to record feedback",
      });
    }
  });
  
  // @route   GET /api/clicks/pending-feedback/:sessionId
  // @desc    Get scholarships that need feedback (clicked but no response yet)
  // @access  Public
  router.get("/pending-feedback/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
  
      // Find clicks without feedback from the last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
      const pendingClicks = await ScholarshipClick.find({
        sessionId,
        feedbackResponse: null,
        createdAt: { $gte: twentyFourHoursAgo },
      })
        .populate("scholarshipId", "title")
        .sort({ createdAt: -1 });
  
      return res.status(200).json({
        success: true,
        pendingClicks: pendingClicks.map((click) => ({
          clickId: click._id,
          scholarshipId: click.scholarshipId._id,
          scholarshipTitle: click.scholarshipId.title,
          clickedAt: click.createdAt,
        })),
      });
    } catch (error) {
      console.error("Error fetching pending feedback:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch pending feedback",
      });
    }
  });
  
module.exports = router;