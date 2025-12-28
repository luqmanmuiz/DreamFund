const mongoose = require("mongoose");

const guestSchema = new mongoose.Schema(
  {
    shareId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      default: "Student",
      trim: true,
    },
    cgpa: {
      type: Number,
      default: 0,
      min: 0,
      max: 4.0,
    },
    program: {
      type: String,
      default: "General Studies",
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index - MongoDB will automatically delete documents after expiresAt date passes
guestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Guest", guestSchema);
