const mongoose = require("mongoose");

const guestAnalyticsSchema = new mongoose.Schema(
  {
    // Singleton identifier - always use this fixed ID
    _id: {
      type: String,
      default: "guest_analytics_singleton",
    },
    // Cumulative counters
    totalCreated: {
      type: Number,
      default: 0,
    },
    totalExpired: {
      type: Number,
      default: 0,
    },
    // Daily tracking
    createdToday: {
      type: Number,
      default: 0,
    },
    lastResetDate: {
      type: String,
      default: () => new Date().toDateString(),
    },
    // Historical tracking (optional, for future use)
    dailyHistory: [
      {
        date: String,
        created: Number,
        expired: Number,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("GuestAnalytics", guestAnalyticsSchema);
