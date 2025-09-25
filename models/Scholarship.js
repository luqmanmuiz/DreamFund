const mongoose = require("mongoose")

const scholarshipSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: String,
      required: true,
    },
    minCGPA: {
      type: Number,
      required: true,
      min: 0,
      max: 4.0,
    },
    deadline: {
      type: Date,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Merit-based",
        "Need-based",
        "STEM",
        "Leadership",
        "Community Service",
        "Research",
        "Arts",
        "Sports",
        "Other",
      ],
    },
    eligibleCourses: [
      {
        type: String,
        trim: true,
      },
    ],
    keywords: [
      {
        type: String,
        trim: true,
      },
    ],
    applicationUrl: {
      type: String,
      trim: true,
    },
    requirements: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ["Active", "Draft", "Expired", "Suspended"],
      default: "Active",
    },
    applicationCount: {
      type: Number,
      default: 0,
    },
    source: {
      type: String,
      enum: ["manual", "scraped"],
      default: "manual",
    },
    scrapedFrom: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
)

// Index for search functionality
scholarshipSchema.index({
  title: "text",
  provider: "text",
  keywords: "text",
})

// Index for filtering
scholarshipSchema.index({ status: 1, deadline: 1, minCGPA: 1 })

// Virtual for checking if scholarship is expired
scholarshipSchema.virtual("isExpired").get(function () {
  return this.deadline < new Date()
})

// Method to increment application count
scholarshipSchema.methods.incrementApplicationCount = function () {
  this.applicationCount += 1
  return this.save()
}

module.exports = mongoose.model("Scholarship", scholarshipSchema)
