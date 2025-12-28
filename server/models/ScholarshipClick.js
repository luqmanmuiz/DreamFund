const mongoose = require("mongoose");

const scholarshipClickSchema = new mongoose.Schema(
  {
    // Scholarship that was clicked
    scholarshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Scholarship",
      required: true,
    },
    // Session identifier for tracking unique visitors (guests and logged-in users)
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    // Additional metadata
    userAgent: {
      type: String,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    // Feedback fields
    feedbackResponse: {
      type: String,
      enum: ["completed", "not_yet", "dismissed", null],
      default: null,
    },
    feedbackTimestamp: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Index for faster queries
scholarshipClickSchema.index({ scholarshipId: 1, createdAt: -1 });
scholarshipClickSchema.index({ userId: 1, createdAt: -1 });
scholarshipClickSchema.index({ sessionId: 1, createdAt: -1 });
scholarshipClickSchema.index({ sessionId: 1, scholarshipId: 1 });

module.exports = mongoose.model("ScholarshipClick", scholarshipClickSchema);