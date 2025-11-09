const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: false,
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
      required: false,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    // Profile info extracted from transcript or user input
    profile: {
      gpa: { type: Number, default: 0 },
      program: { type: String, trim: true, default: "" },
      age: { type: Number, default: 0 },
      major: { type: String, trim: true, default: "" },
      financialNeed: { type: String, trim: true, default: "any" },
      extracurriculars: { type: [String], default: [] },
      achievements: { type: [String], default: [] },
    },
    scholarshipMatches: [
      {
        scholarship: { type: mongoose.Schema.Types.ObjectId, ref: "Scholarship" },
        status: { type: String, enum: ["pending", "applied", "accepted", "rejected"], default: "pending" },
        appliedDate: { type: Date },
      },
    ],
    lastLogin: {
      type: Date,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    authMethod: {
      type: String,
      enum: ["password", "otp"],
      default: "otp",
    },
  },
  {
    timestamps: true,
  },
)

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next()

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
  if (!this.password) return false
  return bcrypt.compare(candidatePassword, this.password)
}

// Update last login
userSchema.methods.updateLastLogin = function () {
  this.lastLogin = new Date()
  this.isEmailVerified = true
  return this.save()
}

module.exports = mongoose.model("User", userSchema)
