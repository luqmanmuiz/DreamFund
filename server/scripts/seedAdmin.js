#!/usr/bin/env node
/**
 * Seed Admin User Script
 * Creates the default admin user in the database
 * Run: npm run seed
 */

const mongoose = require("mongoose");
const User = require("../models/User");
require("dotenv").config();

const seedAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: "admin@dreamfund.com" });

    if (existingAdmin) {
      return;
    }

    // Create admin user
    const adminUser = new User({
      name: "System Administrator",
      email: "admin@dreamfund.com",
      password: "admin123", // Will be hashed by pre-save hook
      role: "admin",
      isEmailVerified: true,
    });

    await adminUser.save();
  } catch (error) {
    console.error("❌ Error seeding admin:", error.message);
  }
};

module.exports = seedAdmin;
