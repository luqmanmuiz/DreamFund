const mongoose = require("mongoose")
const User = require("../models/User")
const Scholarship = require("../models/Scholarship")
require("dotenv").config()

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/dreamfundDB")
    console.log("Connected to MongoDB")

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL })
    if (existingAdmin) {
      console.log("Admin user already exists")
      return
    }

    // Create admin user
    const admin = new User({
      name: process.env.ADMIN_NAME || "System Administrator",
      email: process.env.ADMIN_EMAIL || "admin@dreamfund.com",
      password: process.env.ADMIN_PASSWORD || "admin123",
      role: "admin",
    })

    await admin.save()
    console.log("Admin user created successfully")
    console.log(`📧 Admin Email: ${process.env.ADMIN_EMAIL}`)
    console.log(`🔑 Admin Password: ${process.env.ADMIN_PASSWORD}`)
  } catch (error) {
    console.error("Seeding error:", error)
  } finally {
    mongoose.connection.close()
  }
}

seedAdmin()
