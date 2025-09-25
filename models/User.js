const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return this.role === "admin"
      },
    },
    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },
    profile: {
      cgpa: {
        type: Number,
        min: 0,
        max: 4.0,
      },
      course: {
        type: String,
        trim: true,
      },
      year: {
        type: String,
        enum: ["1st Year", "2nd Year", "3rd Year", "4th Year", "Graduate"],
      },
      university: {
        type: String,
        trim: true,
      },
      interests: {
        type: String,
        trim: true,
      },
    },
    transcriptUploaded: {
      type: Boolean,
      default: false,
    },
    transcriptPath: {
      type: String,
    },
    matches: [
      {
        scholarship: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Scholarship",
        },
        matchPercentage: {
          type: Number,
          min: 0,
          max: 100,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    applications: [
      {
        scholarship: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Scholarship",
        },
        appliedAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["pending", "submitted", "accepted", "rejected"],
          default: "pending",
        },
      },
    ],
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()

  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

// Update last active
userSchema.methods.updateLastActive = function () {
  this.lastActive = new Date()
  return this.save()
}

module.exports = mongoose.model("User", userSchema)
