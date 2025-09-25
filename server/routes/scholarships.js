const express = require("express");
const Scholarship = require("../models/Scholarship");
const User = require("../models/User");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

// @route   GET /api/scholarships/test-scrape
// @desc    Test scraping with detailed output (no auth required for testing)
// @access  Public (remove this in production)
router.get("/test-scrape", async (req, res) => {
  try {
    console.log("🧪 TEST SCRAPING STARTED");

    // Import the enhanced scraper
    const scholarshipScraper = require("../services/scholarshipScraper");

    // Run scraping (this will show all the detailed deadline debugging)
    console.log("🚀 Starting scraping with full debug output...");
    const scrapedScholarships = await scholarshipScraper.scrapeScholarships();

    console.log(`\n📋 SCRAPING COMPLETED - SUMMARY:`);
    console.log(`Total scraped: ${scrapedScholarships.length}`);

    // Show deadline analysis for each scholarship
    scrapedScholarships.forEach((scholarship, index) => {
      console.log(`\n${index + 1}. ${scholarship.title}`);
      console.log(`   Deadline: ${scholarship.deadline || "NOT FOUND"}`);
      console.log(`   Study Level: ${scholarship.studyLevel || "Unknown"}`);
      console.log(`   Amount: ${scholarship.amount || 0}`);
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

    console.log("🔄 Starting enhanced scholarship scraping (GET)...");

    if (clearDatabase) {
      console.log("🗑️ Clearing existing scholarships...");
      const deleteResult = await Scholarship.deleteMany({});
      console.log(`🗑️ Deleted ${deleteResult.deletedCount} existing scholarships`);
    }

    const scholarshipScraper = require("../services/scholarshipScraper");

    console.log("🚀 Starting scraping process (GET)...");
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
router.post("/scrape-scholarships", async (req, res) => {
  try {
    const { clearDatabase = false } = req.body;

    console.log("🔄 Starting enhanced scholarship scraping...");

    if (clearDatabase) {
      console.log("🗑️ Clearing existing scholarships...");
      const deleteResult = await Scholarship.deleteMany({});
      console.log(
        `🗑️ Deleted ${deleteResult.deletedCount} existing scholarships`
      );
    }

    const scholarshipScraper = require("../services/scholarshipScraper");

    console.log("🚀 Starting scraping process...");
    const scrapedScholarships = await scholarshipScraper.scrapeScholarships();

    console.log(`📊 Scraped ${scrapedScholarships.length} scholarships`);

    // Helper: normalize deadline to a real UTC Date
    const coerceDeadline = (value, extracted) => {
      // Prefer already-constructed Date
      if (value instanceof Date && !isNaN(value.getTime())) return value;
      // Try dd-mm-yyyy from raw extracted
      const raw = typeof extracted === "string" ? extracted : typeof value === "string" ? value : null;
      if (raw && /^\d{1,2}-\d{1,2}-\d{4}$/.test(raw)) {
        const [dd, mm, yyyy] = raw.split("-");
        const date = new Date(Date.UTC(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10)));
        if (!isNaN(date.getTime())) return date;
      }
      // As-is try
      if (typeof value === "string") {
        const tryDate = new Date(value);
        if (!isNaN(tryDate.getTime())) return tryDate;
      }
      return null;
    };

    let savedCount = 0;
    let updatedCount = 0;

    // Canonicalize helper to reduce duplicate variants (strip query/hash, lowercase host)
    const canonicalizeUrl = (inputUrl) => {
      try {
        if (!inputUrl) return null;
        const u = new URL(inputUrl);
        u.hash = "";
        u.search = "";
        u.hostname = u.hostname.toLowerCase();
        // Remove trailing slash
        let href = u.toString();
        if (href.endsWith("/")) href = href.slice(0, -1);
        return href;
      } catch {
        return inputUrl;
      }
    };

    for (const scholarshipData of scrapedScholarships) {
      try {
        // Normalize deadline safely
        const normalized = { ...scholarshipData };
        normalized.deadline = coerceDeadline(
          scholarshipData.deadline,
          scholarshipData.extractedDeadline
        );
        normalized.sourceUrl = canonicalizeUrl(scholarshipData.sourceUrl);
        // Ensure extractedDeadline field is persisted for debugging/view
        normalized.extractedDeadline = scholarshipData.extractedDeadline || null;
        // Carry study level fields if provided by scraper
        if (scholarshipData.studyLevel) normalized.studyLevel = scholarshipData.studyLevel;
        if (scholarshipData.studyLevels) normalized.studyLevels = scholarshipData.studyLevels;

        // Business rules for status:
        // - If study level is not diploma or degree, set inactive
        // - If deadline exists and is in the past, set inactive
        // - If no deadline, keep as active (unknown), unless filtered by study level above
        const hasDiplomaOrDegree = Array.isArray(normalized.studyLevels)
          ? normalized.studyLevels.some((lvl) => ["diploma", "degree"].includes(String(lvl).toLowerCase()))
          : ["diploma", "degree"].includes(String(normalized.studyLevel || "").toLowerCase());

        // Determine status with deadline awareness
        // Compare by date (UTC midnight) to avoid timezone confusion
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
          // No deadline: keep active if study level is relevant
          normalized.status = "active";
        }

        if (!normalized.sourceUrl) {
          console.warn(`⚠️ Skipping due to missing sourceUrl: ${scholarshipData.title}`);
          continue;
        }

        // Upsert by sourceUrl
        const result = await Scholarship.findOneAndUpdate(
          { sourceUrl: normalized.sourceUrl },
          { $set: normalized },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        if (result.wasNew) {
          savedCount++;
          console.log(`💾 Saved: ${normalized.title}`);
        } else {
          updatedCount++;
          console.log(`🔄 Updated: ${normalized.title}`);
        }
      } catch (error) {
        // Handle duplicate key errors gracefully
        if (error && error.code === 11000) {
          console.warn(`⚠️ Duplicate ignored for sourceUrl: ${scholarshipData.sourceUrl}`);
          continue;
        }
        console.error(
          `❌ Error saving ${scholarshipData.title}:`,
          error.message
        );
      }
    }

    console.log(
      `🎉 Scraping completed! Saved: ${savedCount}, Updated: ${updatedCount}`
    );

    res.json({
      success: true,
      message: `Successfully processed ${scrapedScholarships.length} scholarships`,
      saved: savedCount,
      updated: updatedCount,
      total: scrapedScholarships.length,
      clearDatabase: clearDatabase,
      scholarships: scrapedScholarships.map((s) => ({
        title: s.title,
        amount: s.amount,
        provider: s.provider.name,
        deadline: s.extractedDeadline || "Not specified",
        email: s.contactEmail || "Not provided",
        eligibleCourses: s.eligibleCourses || [],
      })),
    });
  } catch (error) {
    console.error("❌ Scraping error:", error);
    res.status(500).json({
      success: false,
      message: "Scraping failed",
      error: error.message,
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

    const scholarships = await Scholarship.find({ status: "active" });
    const matches = [];

    for (const scholarship of scholarships) {
      const req = scholarship.requirements || {};
      const minGpa = typeof req.minGPA === "number" ? req.minGPA : null;
      const cgpaOk = minGpa === null || isNaN(minGpa) ? true : studentCgpa >= minGpa;

      // Program match against eligibleCourses; if empty/null, treat as open
      const courses = Array.isArray(scholarship.eligibleCourses) ? scholarship.eligibleCourses : [];
      const hasCourseConstraint = courses.length > 0;
      const programOk = !hasCourseConstraint
        ? true
        : courses.some((c) => {
            const cc = normalize(c);
            if (!cc || !studentProgram) return false;
            return cc === studentProgram || cc.includes(studentProgram) || studentProgram.includes(cc);
          });

      if (cgpaOk && programOk) {
        // basic score: weight cgpa distance and program match
        let matchScore = 50;
        if (minGpa && !isNaN(minGpa)) {
          const delta = Math.max(0, Math.min(1, (studentCgpa - minGpa) / 1.0));
          matchScore += Math.round(delta * 30);
        }
        if (hasCourseConstraint && programOk) matchScore += 20;

        matches.push({ scholarship, matchScore });
      }
    }

    matches.sort((a, b) => b.matchScore - a.matchScore);
    res.json(matches);
  } catch (error) {
    console.error("Get matches error:", error);
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

    const scholarships = await Scholarship.find({ status: "active" });
    const matches = [];

    for (const scholarship of scholarships) {
      const reqs = scholarship.requirements || {};
      const minGpa = typeof reqs.minGPA === "number" ? reqs.minGPA : null;
      const cgpaOk = minGpa === null || isNaN(minGpa) ? true : studentCgpa >= minGpa;

      const courses = Array.isArray(scholarship.eligibleCourses) ? scholarship.eligibleCourses : [];
      const hasCourseConstraint = courses.length > 0;
      const programOk = !hasCourseConstraint
        ? true
        : courses.some((c) => {
            const cc = normalize(c);
            if (!cc || !studentProgram) return false;
            return cc === studentProgram || cc.includes(studentProgram) || studentProgram.includes(cc);
          });

      if (cgpaOk && programOk) {
        let matchScore = 50;
        if (minGpa && !isNaN(minGpa)) {
          const delta = Math.max(0, Math.min(1, (studentCgpa - minGpa) / 1.0));
          matchScore += Math.round(delta * 30);
        }
        if (hasCourseConstraint && programOk) matchScore += 20;

        matches.push({ scholarship, matchScore });
      }
    }

    matches.sort((a, b) => b.matchScore - a.matchScore);
    res.json(matches);
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
        matchScore: 100,
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
