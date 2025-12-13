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
      majors: [String],
      financialNeed: {
        type: String,
        enum: ["any", "low", "medium", "high"],
        default: "any",
      },
      extracurriculars: [String],
      achievements: [String],
    },
    provider: {
      name: String,
      website: String,
    },
    // Direct contact email extracted from the page (normalized)
    contactEmail: {
      type: String,
      trim: true,
    },
    studyLevel: {
      type: String,
    },
    studyLevels: [String],
    // List of eligible courses/fields/programmes for application
    eligibleCourses: [String],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    applicants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        appliedDate: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
      },
    ],
    // NEW: track the source page URL to uniquely identify a scholarship
    sourceUrl: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
)

// Prevent duplicates: one record per sourceUrl
scholarshipSchema.index({ sourceUrl: 1 }, { unique: true })

module.exports = mongoose.model("Scholarship", scholarshipSchema)
