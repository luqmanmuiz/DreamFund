const express = require("express");
const Scholarship = require("../models/Scholarship");
const User = require("../models/User");
const ScrapingSession = require("../models/ScrapingSession");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

// Helper function: Filter out invalid course names (webpage metadata, non-course terms)
const filterValidCourses = (courses) => {
  const normalize = (s) => (typeof s === "string" ? s.trim().toLowerCase() : "");
  
  const invalidTerms = [
    'amount', 'deadline', 'overview', 'where to study', 'study level', 'study levels',
    'full scholarship', 'public university', 'private university', 'pre university',
    'course 1', 'course 2', 'course 3', 'course 4', 'course 5', 'course 6', 'course 7', 'course 8',
    'courses', 'malaysia', 'apply now', 'requirements', 'benefits', 'eligibility', 
    'deadline full scholarship'
  ];
  
  return courses.filter(c => {
    const cc = normalize(c);
    // Filter out short single-word non-descriptive terms
    if (cc.split(' ').length === 1 && !['engineering', 'accounting', 'business', 'nursing', 'law', 'medicine'].includes(cc)) {
      return false;
    }
    // Filter out invalid terms
    return !invalidTerms.includes(cc);
  });
};

// Global scraping state tracker
let scrapingState = {
  isRunning: false,
  shouldCancel: false,
  current: 0,
  total: 0,
  currentScholarship: '',
  errors: [],
  startTime: null,
  savedCount: 0,
  updatedCount: 0,
  failedCount: 0
};

// Reset scraping state
const resetScrapingState = () => {
  scrapingState = {
    isRunning: false,
    shouldCancel: false,
    current: 0,
    total: 0,
    currentScholarship: '',
    startTime: null,
    savedCount: 0,
    updatedCount: 0,
    failedCount: 0,
    errors: []
  };
};

// @route   GET /api/scholarships/scraping-progress
// @desc    Server-Sent Events endpoint for real-time scraping progress
// @access  Public (read-only state, no sensitive data)
router.get("/scraping-progress", (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  // Send initial state
  res.write(`data: ${JSON.stringify(scrapingState)}\n\n`);

  // Send updates every 500ms
  const intervalId = setInterval(() => {
    const stateSnapshot = JSON.stringify(scrapingState);
    res.write(`data: ${stateSnapshot}\n\n`);
    
    // Close connection when scraping is complete
    if (!scrapingState.isRunning && scrapingState.current > 0) {
      clearInterval(intervalId);
      res.end();
    }
  }, 500);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });
});

// @route   GET /api/scholarships/scraping-stats
// @desc    Get latest scraping session statistics
// @access  Private (Admin only)
router.get("/scraping-stats", auth, adminAuth, async (req, res) => {
  try {
    // Get the most recent scraping session
    const latestSession = await ScrapingSession.findOne()
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({
      success: true,
      data: latestSession
    });
  } catch (error) {
    console.error("Error fetching scraping stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching scraping statistics"
    });
  }
});

// @route   POST /api/scholarships/cancel-scraping
// @desc    Cancel ongoing scraping operation
// @access  Private (Admin only)
router.post("/cancel-scraping", auth, adminAuth, (req, res) => {
  if (scrapingState.isRunning) {
    scrapingState.shouldCancel = true;
    scrapingState.currentScholarship = 'Cancellation requested, stopping soon...';
    res.json({ 
      success: true, 
      message: "Cancellation requested. Scraping will stop after current scholarship." 
    });
  } else {
    res.json({ success: false, message: "No scraping in progress" });
  }
});

// @route   GET /api/scholarships/test-scrape
// @desc    Test scraping with detailed output (no auth required for testing)
// @access  Public (remove this in production)
router.get("/test-scrape", async (req, res) => {
  try {
    console.log("🧪 TEST SCRAPING STARTED");

    // Import the enhanced scraper
    const scholarshipScraper = require("../services/scholarshipScraper");

    // Run scraping (this will show all the detailed deadline debugging)
    const scrapedScholarships = await scholarshipScraper.scrapeScholarships();

    console.log(`\n📋 SCRAPING COMPLETED - SUMMARY:`);
    console.log(`Total scraped: ${scrapedScholarships.length}`);

    // Show deadline analysis for each scholarship
    scrapedScholarships.forEach((scholarship, index) => {
      console.log(`\n${index + 1}. ${scholarship.title}`);
      console.log(`   Deadline: ${scholarship.deadline || "NOT FOUND"}`);
      console.log(`   Study Level: ${scholarship.studyLevel || "Unknown"}`);
      console.log(`   Provider: ${scholarship.provider?.name || "Unknown"}`);

      if (scholarship.deadline) {
        const deadlineDate = new Date(scholarship.deadline);
        const now = new Date();
        const daysAhead = Math.ceil(
          (deadlineDate - now) / (1000 * 60 * 60 * 24)
        );

        if (daysAhead > 365) {
          console.log(
            `   ⚠️  WARNING: ${daysAhead} days ahead (more than 1 year)`
          );
        } else if (daysAhead < 0) {
          console.log(
            `   ⚠️  WARNING: ${Math.abs(daysAhead)} days in the past`
          );
        } else {
          console.log(`   ✅ ${daysAhead} days from now`);
        }
      }
    });

    res.json({
      success: true,
      message: "Test scraping completed - check console for detailed output",
      totalScraped: scrapedScholarships.length,
      scholarshipsWithDeadlines: scrapedScholarships.filter((s) => s.deadline)
        .length,
      scholarships: scrapedScholarships.map((s) => ({
        title: s.title,
        deadline: s.deadline,
        extractedDeadline: s.extractedDeadline,
        amount: s.amount,
        provider: s.provider?.name,
      })),
    });
  } catch (error) {
    console.error("❌ Test scraping error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// @route   GET /api/scholarships
// @desc    Get all scholarships with filtering
// @access  Public
router.get("/", async (req, res) => {
  try {
    const {
      status = "active",
      category,
      minCGPA,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    console.log("GET /api/scholarships called with params:", {
      status,
      category,
      minCGPA,
      search,
      page,
      limit,
    });

    // Build query
    const query = {};

    if (status !== "All") {
      query.status = status.toLowerCase();
    }

    console.log("MongoDB query:", query);

    // Debug: Check what's actually in the database
    const totalInDB = await Scholarship.countDocuments({});
    console.log("Total scholarships in database (no filter):", totalInDB);

    // Debug: See sample data
    const allScholarships = await Scholarship.find({})
      .select("title status")
      .limit(5);
    console.log("Sample scholarships:", allScholarships);

    // Execute query with pagination
    const scholarships = await Scholarship.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Scholarship.countDocuments(query);

    console.log("Found scholarships with query:", scholarships.length);

    res.json({
      scholarships,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("GET scholarships error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Convenience route: allow GET to trigger scraping as well (use query ?clearDatabase=true)
router.get("/scrape-scholarships", async (req, res) => {
  try {
    const clearDatabase = String(req.query.clearDatabase || "false").toLowerCase() === "true";

    if (clearDatabase) {
      console.log("🗑️ Clearing existing scholarships...");
      const deleteResult = await Scholarship.deleteMany({});
      console.log(`🗑️ Deleted ${deleteResult.deletedCount} existing scholarships`);
    }

    const scholarshipScraper = require("../services/scholarshipScraper");

    const scrapedScholarships = await scholarshipScraper.scrapeScholarships();

    console.log(`📊 Scraped ${scrapedScholarships.length} scholarships (GET)`);

    res.json({
      success: true,
      message: `Successfully processed ${scrapedScholarships.length} scholarships`,
      total: scrapedScholarships.length,
      clearDatabase,
      scholarships: scrapedScholarships.map((s) => ({
        title: s.title,
        amount: s.amount,
        provider: s.provider.name,
        deadline: s.extractedDeadline || "Not specified",
        minGPA: s.requirements?.minGPA ?? null,
        studyLevels: s.studyLevels || [],
        eligibleCourses: s.eligibleCourses || [],
      })),
    });
  } catch (error) {
    console.error("❌ Scraping error (GET):", error);
    res.status(500).json({
      success: false,
      message: "Scraping failed",
      error: error.message,
    });
  }
});

// @route   POST /api/scholarships/recalculate-status
// @desc    Recalculate status for all scholarships based on deadline and study level
// @access  Private (Admin only) - make public temporarily if needed
router.post("/recalculate-status", async (req, res) => {
  try {
    const scholarships = await Scholarship.find({});
    const now = new Date();
    const todayMidnightUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    let updated = 0;
    for (const record of scholarships) {
      // Normalize deadline for legacy records that may have strings
      const normalizeExistingDeadline = (rec) => {
        const value = rec.deadline;
        const extracted = rec.extractedDeadline;
        const tryParseTextual = (text) => {
          if (!text || typeof text !== "string") return null;
          // dd-mm-yyyy or dd/mm/yyyy
          const ddmmyyyy = text.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/);
          if (ddmmyyyy) {
            const [, dd, mm, yyyy] = ddmmyyyy;
            const d = new Date(Date.UTC(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10)));
            return isNaN(d.getTime()) ? null : d;
          }
          // Textual month formats: 12 September 2025 or September 12, 2025
          const months = [
            "january","february","march","april","may","june","july","august","september","october","november","december",
          ];
          const rx1 = new RegExp(`\\b(\\d{1,2})\\s+(${months.join("|")})\\s+(\\d{4})\\b`, "i");
          const m1 = text.match(rx1);
          if (m1) {
            const dd = parseInt(m1[1], 10);
            const mm = months.findIndex((m) => m.toLowerCase() === m1[2].toLowerCase());
            const yyyy = parseInt(m1[3], 10);
            if (mm >= 0) {
              const d = new Date(Date.UTC(yyyy, mm, dd));
              return isNaN(d.getTime()) ? null : d;
            }
          }
          const rx2 = new RegExp(`\\b(${months.join("|")})\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, "i");
          const m2 = text.match(rx2);
          if (m2) {
            const mm = months.findIndex((m) => m.toLowerCase() === m2[1].toLowerCase());
            const dd = parseInt(m2[2], 10);
            const yyyy = parseInt(m2[3], 10);
            if (mm >= 0) {
              const d = new Date(Date.UTC(yyyy, mm, dd));
              return isNaN(d.getTime()) ? null : d;
            }
          }
          // Fallback
          const d = new Date(text);
          return isNaN(d.getTime()) ? null : d;
        };

        if (value instanceof Date && !isNaN(value.getTime())) return value;
        if (typeof value === "string") {
          const parsed = tryParseTextual(value);
          if (parsed) return parsed;
        }
        if (typeof extracted === "string") {
          const parsed = tryParseTextual(extracted);
          if (parsed) return parsed;
        }
        return null;
      };

      const normalizedDeadline = normalizeExistingDeadline(record);
      if (normalizedDeadline && !(record.deadline instanceof Date)) {
        record.deadline = normalizedDeadline;
      }
      const hasDiplomaOrDegree = Array.isArray(record.studyLevels)
        ? record.studyLevels.some((lvl) => ["diploma", "degree"].includes(String(lvl).toLowerCase()))
        : ["diploma", "degree"].includes(String(record.studyLevel || "").toLowerCase());

      let newStatus = "inactive";
      if (!hasDiplomaOrDegree) {
        newStatus = "inactive";
      } else if (record.deadline instanceof Date && !isNaN(record.deadline.getTime())) {
        // Only check deadline if it exists
        const dl = record.deadline;
        const deadlineMidnightUtc = new Date(Date.UTC(dl.getUTCFullYear(), dl.getUTCMonth(), dl.getUTCDate()));
        newStatus = deadlineMidnightUtc.getTime() >= todayMidnightUtc.getTime() ? "active" : "inactive";
      } else {
        // No deadline means scholarship is active (as long as study level is valid)
        newStatus = "active";
      }

      if (record.status !== newStatus || normalizedDeadline) {
        record.status = newStatus;
        await record.save();
        updated++;
      }
    }

    res.json({ success: true, updated, total: scholarships.length });
  } catch (error) {
    console.error("recalculate-status error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   GET /api/scholarships/:id
// @desc    Get scholarship by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid scholarship id" });
    }
    const scholarship = await Scholarship.findById(req.params.id);
    if (!scholarship) {
      return res.status(404).json({ message: "Scholarship not found" });
    }
    res.json(scholarship);
  } catch (error) {
    console.error("Get scholarship error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/scholarships
// @desc    Create a new scholarship
// @access  Private (Admin only)
router.post("/scrape-scholarships", auth, adminAuth, async (req, res) => {
  try {
    // Check if scraping is already running
    if (scrapingState.isRunning) {
      return res.status(400).json({ 
        success: false, 
        message: "Scraping is already in progress" 
      });
    }

    const { clearDatabase = false } = req.body;

    // Initialize scraping state
    resetScrapingState();
    scrapingState.isRunning = true;
    scrapingState.startTime = new Date();

    if (clearDatabase) {
      console.log("🗑️ Clearing existing scholarships...");
      const deleteResult = await Scholarship.deleteMany({});
      console.log(
        `🗑️ Deleted ${deleteResult.deletedCount} existing scholarships`
      );
    }

    const scholarshipScraper = require("../services/scholarshipScraper");

    // Capture user ID before async background task
    const userId = req.user ? req.user._id : null;

    // Update state to show we're fetching scholarships
    scrapingState.currentScholarship = 'Fetching scholarships from website...';
    
    // Start scraping in background
    (async () => {
      try {
        const scrapedScholarships = await scholarshipScraper.scrapeScholarships({
          shouldCancel: () => scrapingState.shouldCancel,
          onProgress: (progress) => {
            // Update state during scraping phase
            if (progress.phase === 'scraping') {
              scrapingState.current = progress.current;
              scrapingState.total = progress.total;
              scrapingState.currentScholarship = progress.message;
            }
          }
        });
        
        // Check if cancelled during scraping
        if (scrapingState.shouldCancel) {
          // Save cancelled session
          const endTime = new Date();
          const duration = Math.floor((endTime - scrapingState.startTime) / 1000);
          const totalProcessed = scrapingState.savedCount + scrapingState.updatedCount + scrapingState.failedCount;
          const successCount = scrapingState.savedCount + scrapingState.updatedCount;
          
          try {
            await ScrapingSession.create({
              startTime: scrapingState.startTime,
              endTime,
              duration,
              totalProcessed,
              successCount,
              failedCount: scrapingState.failedCount,
              status: 'cancelled',
              errors: scrapingState.errors,
              triggeredBy: userId
            });
            console.log('✅ Cancelled scraping session saved to database');
          } catch (sessionError) {
            console.error('❌ Error saving cancelled session:', sessionError);
          }
          
          scrapingState.isRunning = false;
          scrapingState.shouldCancel = false;
          scrapingState.currentScholarship = '';
          scrapingState.current = 0;
          scrapingState.total = 0;
          return;
        }
        
        // Now move to database saving phase
        scrapingState.total = scrapedScholarships.length;
        scrapingState.current = 0;
        scrapingState.currentScholarship = `Scraping complete. Saving ${scrapedScholarships.length} scholarships to database...`;

        // Helper: normalize deadline to a real UTC Date
        const coerceDeadline = (value, extracted) => {
          if (value instanceof Date && !isNaN(value.getTime())) return value;
          const raw = typeof extracted === "string" ? extracted : typeof value === "string" ? value : null;
          if (raw && /^\d{1,2}-\d{1,2}-\d{4}$/.test(raw)) {
            const [dd, mm, yyyy] = raw.split("-");
            const date = new Date(Date.UTC(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10)));
            if (!isNaN(date.getTime())) return date;
          }
          if (typeof value === "string") {
            const tryDate = new Date(value);
            if (!isNaN(tryDate.getTime())) return tryDate;
          }
          return null;
        };

        // Canonicalize helper
        const canonicalizeUrl = (inputUrl) => {
          try {
            if (!inputUrl) return null;
            const u = new URL(inputUrl);
            u.hash = "";
            u.search = "";
            u.hostname = u.hostname.toLowerCase();
            let href = u.toString();
            if (href.endsWith("/")) href = href.slice(0, -1);
            return href;
          } catch {
            return inputUrl;
          }
        };

        for (let i = 0; i < scrapedScholarships.length; i++) {
          // Check for cancellation
          if (scrapingState.shouldCancel) {
            scrapingState.isRunning = false;
            return;
          }

          const scholarshipData = scrapedScholarships[i];
          scrapingState.current = i + 1;
          scrapingState.currentScholarship = scholarshipData.title;

          try {
            // Normalize deadline safely
            const normalized = { ...scholarshipData };
            normalized.deadline = coerceDeadline(
              scholarshipData.deadline,
              scholarshipData.extractedDeadline
            );
            normalized.sourceUrl = canonicalizeUrl(scholarshipData.sourceUrl);
            normalized.extractedDeadline = scholarshipData.extractedDeadline || null;
            if (scholarshipData.studyLevel) normalized.studyLevel = scholarshipData.studyLevel;
            if (scholarshipData.studyLevels) normalized.studyLevels = scholarshipData.studyLevels;

            // Business rules for status
            const hasDiplomaOrDegree = Array.isArray(normalized.studyLevels)
              ? normalized.studyLevels.some((lvl) => ["diploma", "degree"].includes(String(lvl).toLowerCase()))
              : ["diploma", "degree"].includes(String(normalized.studyLevel || "").toLowerCase());

            const now = new Date();
            const todayMidnightUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
            if (!hasDiplomaOrDegree) {
              normalized.status = "inactive";
            } else if (
              normalized.deadline instanceof Date &&
              !isNaN(normalized.deadline.getTime())
            ) {
              const deadlineMidnightUtc = new Date(Date.UTC(
                normalized.deadline.getUTCFullYear(),
                normalized.deadline.getUTCMonth(),
                normalized.deadline.getUTCDate()
              ));
              normalized.status = deadlineMidnightUtc.getTime() >= todayMidnightUtc.getTime() ? "active" : "inactive";
            } else {
              normalized.status = "active";
            }

            if (!normalized.sourceUrl) {
              console.warn(`⚠️ Skipping due to missing sourceUrl: ${scholarshipData.title}`);
              scrapingState.errors.push(`Missing sourceUrl: ${scholarshipData.title}`);
              continue;
            }

            // Upsert by sourceUrl
            const result = await Scholarship.findOneAndUpdate(
              { sourceUrl: normalized.sourceUrl },
              { $set: normalized },
              { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            if (result.wasNew) {
              scrapingState.savedCount++;
            } else {
              scrapingState.updatedCount++;
            }
          } catch (error) {
            if (error && error.code === 11000) {
              console.warn(`⚠️ Duplicate ignored for sourceUrl: ${scholarshipData.sourceUrl}`);
              continue;
            }
            const errorMsg = `Error saving ${scholarshipData.title}: ${error.message}`;
            console.error(`❌ ${errorMsg}`);
            scrapingState.errors.push(errorMsg);
            scrapingState.failedCount++;
          }
        }

        console.log(`✅ Scraping complete: ${scrapingState.savedCount} saved, ${scrapingState.updatedCount} updated`);
        
        // Save scraping session
        const endTime = new Date();
        const duration = Math.floor((endTime - scrapingState.startTime) / 1000);
        const totalProcessed = scrapingState.savedCount + scrapingState.updatedCount + scrapingState.failedCount;
        const successCount = scrapingState.savedCount + scrapingState.updatedCount;
        
        let status = 'success';
        if (scrapingState.failedCount > 0 && successCount > 0) {
          status = 'partial';
        } else if (scrapingState.failedCount > 0 && successCount === 0) {
          status = 'failed';
        }
        
        try {
          await ScrapingSession.create({
            startTime: scrapingState.startTime,
            endTime,
            duration,
            totalProcessed,
            successCount,
            failedCount: scrapingState.failedCount,
            status,
            errors: scrapingState.errors,
            triggeredBy: userId
          });
          console.log('✅ Scraping session saved to database');
        } catch (sessionError) {
          console.error('❌ Error saving scraping session:', sessionError);
        }
        
        scrapingState.isRunning = false;
      } catch (error) {
        console.error("❌ Scraping error:", error);
        scrapingState.errors.push(`Critical error: ${error.message}`);
        
        // Save failed session
        const endTime = new Date();
        const duration = scrapingState.startTime ? Math.floor((endTime - scrapingState.startTime) / 1000) : 0;
        const totalProcessed = scrapingState.savedCount + scrapingState.updatedCount + scrapingState.failedCount;
        const successCount = scrapingState.savedCount + scrapingState.updatedCount;
        
        try {
          await ScrapingSession.create({
            startTime: scrapingState.startTime || new Date(),
            endTime,
            duration,
            totalProcessed,
            successCount,
            failedCount: scrapingState.failedCount,
            status: 'failed',
            errors: scrapingState.errors,
            triggeredBy: userId
          });
          console.log('✅ Failed scraping session saved to database');
        } catch (sessionError) {
          console.error('❌ Error saving failed session:', sessionError);
        }
        
        scrapingState.isRunning = false;
      }
    })();

    // Immediately return success response
    res.json({
      success: true,
      message: "Scraping started. Use /scraping-progress to monitor progress.",
    });
  } catch (error) {
    console.error("❌ Error starting scraping:", error);
    resetScrapingState();
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/scholarships/:id
// @desc    Update a scholarship
// @access  Private (Admin only)
router.put("/:id", adminAuth, async (req, res) => {
  try {
    const scholarship = await Scholarship.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!scholarship) {
      return res.status(404).json({ message: "Scholarship not found" });
    }
    res.json(scholarship);
  } catch (error) {
    console.error("Update scholarship error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   DELETE /api/scholarships/:id
// @desc    Delete a scholarship
// @access  Private (Admin only)
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const scholarship = await Scholarship.findByIdAndDelete(req.params.id);
    if (!scholarship) {
      return res.status(404).json({ message: "Scholarship not found" });
    }
    res.json({ message: "Scholarship deleted successfully" });
  } catch (error) {
    console.error("Delete scholarship error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/scholarships/matches/:userId
// @desc    Get matched scholarships for a user
// @access  Private
router.get("/matches/:userId", auth, async (req, res) => {
  try {
    // Block mock admin from using this endpoint
    if (req.params.userId === 'admin-1') {
      return res.status(400).json({ 
        message: "Admin account cannot use scholarship matching. Please create a student account." 
      });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Deterministic matching per requirements
    // - active scholarships only
    // - CGPA >= minGPA (if minGPA is present)
    // - program matches eligibleCourses (case-insensitive substring or exact)
    const normalize = (s) => (typeof s === "string" ? s.trim().toLowerCase() : "");
    const studentCgpa = Number(user?.profile?.gpa || 0);
    const studentProgram = normalize(user?.profile?.program || user?.profile?.major || "");

    console.log("🔍 Starting scholarship matching for user:", {
      userId: user._id,
      studentCgpa,
      studentProgram,
      profile: user.profile
    });

    const scholarships = await Scholarship.find({ status: "active" });
    console.log(`📚 Found ${scholarships.length} active scholarships to check`);
    
    const matches = [];
    const nonMatches = [];
    let expiredCount = 0;

    for (const scholarship of scholarships) {
      // 1. Check deadline - skip expired scholarships
      const now = new Date();
      const deadlineOk = !scholarship.deadline || scholarship.deadline > now;
      
      if (!deadlineOk) {
        console.log(`⏰ Skipping expired scholarship: ${scholarship.title} (deadline: ${scholarship.deadline})`);
        expiredCount++;
        continue; // Skip expired scholarships
      }

      // 2. Check CGPA requirements
      const req = scholarship.requirements || {};
      const minGpa = typeof req.minGPA === "number" ? req.minGPA : null;
      const cgpaOk = minGpa === null || isNaN(minGpa) ? true : studentCgpa >= minGpa;

      // 3. Check program/course requirements
      const courses = Array.isArray(scholarship.eligibleCourses) ? scholarship.eligibleCourses : [];
      const validCourses = filterValidCourses(courses);
      const hasCourseConstraint = validCourses.length > 0;
      
      // Check if scholarship is open to all fields
      const isOpenToAll = validCourses.some(c => {
        const cc = normalize(c);
        return cc === 'all fields' || cc === 'all' || cc === 'any field' || cc === 'any';
      });
      
      // Check if it's just education level (Diploma/Degree) - these are open to all programs at that level
      const isEducationLevelOnly = validCourses.length > 0 && validCourses.every(c => {
        const cc = normalize(c);
        return cc === 'diploma' || cc === 'degree' || cc === 'bachelor' || 
               cc === 'bachelor degree' || cc === 'diploma programs' || cc === 'degree programs';
      });
      
      const programOk = !hasCourseConstraint || isOpenToAll || isEducationLevelOnly
        ? true
        : validCourses.some((c) => {
            const cc = normalize(c);
            if (!cc || !studentProgram) return false;
            
            // Skip generic education levels in matching
            if (cc === 'diploma' || cc === 'degree' || cc === 'bachelor' || 
                cc === 'bachelor degree' || cc === 'diploma programs' || cc === 'degree programs') {
              return false;
            }
            
            // Split course on slashes to handle "IT / Computer Science / Software Engineering"
            const courseParts = cc.split('/').map(part => part.trim());
            
            // Check each part separately
            for (const coursePart of courseParts) {
              // Exact match
              if (coursePart === studentProgram) return true;
              
              // Field name matching (e.g., "Computer Science" in "Diploma Computer Science")
              const programWords = studentProgram.split(/\s+/);
              const courseWords = coursePart.split(/\s+/);
              
              // Extract field name (removing education level words and common words)
              const programField = programWords.filter(w => 
                w !== 'diploma' && w !== 'degree' && w !== 'bachelor' && w !== 'sarjana' && w !== 'muda' && w !== 'in'
              ).join(' ');
              const courseField = courseWords.filter(w => 
                w !== 'diploma' && w !== 'degree' && w !== 'bachelor' && w !== 'sarjana' && w !== 'muda' && w !== 'in'
              ).join(' ');
              
              // Match if field names match (with some fuzzy matching)
              if (programField && courseField) {
                if (programField === courseField) return true;
                if (programField.includes(courseField) && courseField.split(' ').length >= 2) return true;
                if (courseField.includes(programField) && programField.split(' ').length >= 2) return true;
              }
            }
            
            return false;
          });

      console.log(`🔍 Checking scholarship: ${scholarship.title}`, {
        deadline: scholarship.deadline,
        deadlineOk,
        minGpa,
        studentCgpa,
        cgpaOk,
        courses,
        studentProgram,
        programOk,
        hasCourseConstraint
      });

      // Check if scholarship passes all filters
      if (deadlineOk && cgpaOk && programOk) {
        matches.push({ scholarship });
        console.log(`✅ Match found: ${scholarship.title}`);
      } else {
        // Add to non-matches with reasons
        const reasons = [];
        if (!cgpaOk) reasons.push(`CGPA too low (requires ${minGpa}, you have ${studentCgpa})`);
        if (!programOk) {
          if (validCourses.length > 0) {
            reasons.push(`Program doesn't match (requires: ${validCourses.slice(0, 3).join(', ')}${validCourses.length > 3 ? '...' : ''})`);
          } else {
            reasons.push('Program requirements not specified');
          }
        }
        
        nonMatches.push({ 
          scholarship,
          reasons
        });
        console.log(`❌ Filtered out: ${scholarship.title} (Reasons: ${reasons.join('; ')})`);
      }
    }

    console.log(`📊 Filtering results: ${matches.length} matches, ${nonMatches.length} non-matches, ${expiredCount} expired`);
    res.json({ matches, nonMatches });
  } catch (error) {
    console.error("Get matches error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/scholarships/debug/filtering
// @desc    Debug route to check filtering logic
// @access  Public
router.get("/debug/filtering", async (req, res) => {
  try {
    const now = new Date();
    const scholarships = await Scholarship.find({ status: "active" });
    
    const debugInfo = {
      totalActiveScholarships: scholarships.length,
      currentTime: now,
      scholarshipDetails: scholarships.map(scholarship => ({
        id: scholarship._id,
        title: scholarship.title,
        deadline: scholarship.deadline,
        isExpired: scholarship.deadline ? scholarship.deadline <= now : false,
        requirements: scholarship.requirements,
        eligibleCourses: scholarship.eligibleCourses
      }))
    };
    
    res.json(debugInfo);
  } catch (error) {
    console.error("Debug filtering error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/scholarships/public-matches
// @desc    Get matched scholarships without auth using provided cgpa and program
// @access  Public
router.post("/public-matches", async (req, res) => {
  try {
    const { cgpa, program } = req.body || {};
    const normalize = (s) => (typeof s === "string" ? s.trim().toLowerCase() : "");
    const studentCgpa = Number(cgpa || 0);
    const studentProgram = normalize(program || "");

    console.log("🔍 Starting public scholarship matching:", {
      studentCgpa,
      studentProgram
    });

    const scholarships = await Scholarship.find({ status: "active" });
    console.log(`📚 Found ${scholarships.length} active scholarships to check`);
    
    const matches = [];
    const nonMatches = [];
    let expiredCount = 0;

    for (const scholarship of scholarships) {
      // 1. Check deadline - skip expired scholarships
      const now = new Date();
      const deadlineOk = !scholarship.deadline || scholarship.deadline > now;
      
      if (!deadlineOk) {
        console.log(`⏰ Public: Skipping expired scholarship: ${scholarship.title} (deadline: ${scholarship.deadline})`);
        expiredCount++;
        continue; // Skip expired scholarships
      }

      // 2. Check CGPA requirements
      const reqs = scholarship.requirements || {};
      const minGpa = typeof reqs.minGPA === "number" ? reqs.minGPA : null;
      const cgpaOk = minGpa === null || isNaN(minGpa) ? true : studentCgpa >= minGpa;

      // 3. Check program/course requirements
      const courses = Array.isArray(scholarship.eligibleCourses) ? scholarship.eligibleCourses : [];
      const validCourses = filterValidCourses(courses);
      const hasCourseConstraint = validCourses.length > 0;
      
      // Check if scholarship is open to all fields
      const isOpenToAll = validCourses.some(c => {
        const cc = normalize(c);
        return cc === 'all fields' || cc === 'all' || cc === 'any field' || cc === 'any';
      });
      
      // Check if it's just education level (Diploma/Degree) - these are open to all programs at that level
      const isEducationLevelOnly = validCourses.length > 0 && validCourses.every(c => {
        const cc = normalize(c);
        return cc === 'diploma' || cc === 'degree' || cc === 'bachelor' || 
               cc === 'bachelor degree' || cc === 'diploma programs' || cc === 'degree programs';
      });
      
      const programOk = !hasCourseConstraint || isOpenToAll || isEducationLevelOnly
        ? true
        : validCourses.some((c) => {
            const cc = normalize(c);
            if (!cc || !studentProgram) return false;
            
            // Skip generic education levels in matching
            if (cc === 'diploma' || cc === 'degree' || cc === 'bachelor' || 
                cc === 'bachelor degree' || cc === 'diploma programs' || cc === 'degree programs') {
              return false;
            }
            
            // Split course on slashes to handle "IT / Computer Science / Software Engineering"
            const courseParts = cc.split('/').map(part => part.trim());
            
            // Check each part separately
            for (const coursePart of courseParts) {
              // Exact match
              if (coursePart === studentProgram) return true;
              
              // Field name matching (e.g., "Computer Science" in "Diploma Computer Science")
              const programWords = studentProgram.split(/\s+/);
              const courseWords = coursePart.split(/\s+/);
              
              // Extract field name (removing education level words and common words)
              const programField = programWords.filter(w => 
                w !== 'diploma' && w !== 'degree' && w !== 'bachelor' && w !== 'sarjana' && w !== 'muda' && w !== 'in'
              ).join(' ');
              const courseField = courseWords.filter(w => 
                w !== 'diploma' && w !== 'degree' && w !== 'bachelor' && w !== 'sarjana' && w !== 'muda' && w !== 'in'
              ).join(' ');
              
              // Match if field names match (with some fuzzy matching)
              if (programField && courseField) {
                if (programField === courseField) return true;
                if (programField.includes(courseField) && courseField.split(' ').length >= 2) return true;
                if (courseField.includes(programField) && programField.split(' ').length >= 2) return true;
              }
            }
            
            return false;
          });

      console.log(`🔍 Public: Checking scholarship: ${scholarship.title}`, {
        deadline: scholarship.deadline,
        deadlineOk,
        minGpa,
        studentCgpa,
        cgpaOk,
        courses,
        studentProgram,
        programOk,
        hasCourseConstraint
      });

      // Check if scholarship passes all filters
      if (deadlineOk && cgpaOk && programOk) {
        matches.push({ scholarship });
        console.log(`✅ Public: Match found: ${scholarship.title}`);
      } else {
        // Add to non-matches with reasons
        const reasons = [];
        if (!cgpaOk) reasons.push(`CGPA too low (requires ${minGpa}, you have ${studentCgpa})`);
        if (!programOk) {
          if (validCourses.length > 0) {
            reasons.push(`Program doesn't match (requires: ${validCourses.slice(0, 3).join(', ')}${validCourses.length > 3 ? '...' : ''})`);
          } else {
            reasons.push('Program requirements not specified');
          }
        }
        
        nonMatches.push({ 
          scholarship,
          reasons
        });
        console.log(`❌ Public: Filtered out: ${scholarship.title} (Reasons: ${reasons.join('; ')})`);
      }
    }

    console.log(`📊 Public filtering results: ${matches.length} matches, ${nonMatches.length} non-matches, ${expiredCount} expired`);
    res.json({ matches, nonMatches });
  } catch (error) {
    console.error("Public matches error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/scholarships/:id/apply
// @desc    Apply for a scholarship
// @access  Private
router.post("/:id/apply", auth, async (req, res) => {
  try {
    const scholarship = await Scholarship.findById(req.params.id);
    if (!scholarship) {
      return res.status(404).json({ message: "Scholarship not found" });
    }

    // Check if already applied
    const existingApplication = scholarship.applicants.find(
      (app) => app.user.toString() === req.user._id.toString()
    );
    if (existingApplication) {
      return res
        .status(400)
        .json({ message: "Already applied for this scholarship" });
    }

    // Add application
    scholarship.applicants.push({
      user: req.user._id,
      appliedDate: new Date(),
    });
    await scholarship.save();

    // Update user's scholarship matches
    const user = await User.findById(req.user._id);
    const existingMatch = user.scholarshipMatches.find(
      (match) => match.scholarship.toString() === scholarship._id.toString()
    );

    if (existingMatch) {
      existingMatch.status = "applied";
      existingMatch.appliedDate = new Date();
    } else {
      user.scholarshipMatches.push({
        scholarship: scholarship._id,
        appliedDate: new Date(),
        status: "applied",
      });
    }
    await user.save();

    res.json({ message: "Application submitted successfully" });
  } catch (error) {
    console.error("Apply scholarship error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
