const mongoose = require("mongoose")

const scholarshipSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    deadline: {
      type: Date,
      required: false,
      default: null,
    },
    extractedDeadline: {
      type: String,
    },
    requirements: {
      minGPA: {
        type: Number,
        default: 0,
      },
    },
    provider: {
      name: String,
      website: String,
    },
    contactEmail: {
      type: String,
      trim: true,
    },
    studyLevels: [String],
    eligibleCourses: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    sourceUrl: {
      type: String,
      required: true,
      trim: true,
    },
    scrapingSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScrapingSession',
      required: false,
    },
  },
  {
    timestamps: true,
  },
)

// Prevent duplicates: one record per sourceUrl
scholarshipSchema.index({ sourceUrl: 1 }, { unique: true })

module.exports = mongoose.model("Scholarship", scholarshipSchema)
