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

    // Create sample scholarships
    const sampleScholarships = [
      {
        title: "Academic Excellence Scholarship",
        description: "For students with outstanding academic performance",
        amount: 5000,
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        requirements: {
          minGPA: 3.5,
          maxAge: 25,
          majors: ["Computer Science", "Engineering", "Mathematics"],
          financialNeed: "any",
        },
        provider: {
          name: "DreamFund Foundation",
          contact: "scholarships@dreamfund.com",
          website: "https://dreamfund.com",
        },
      },
      {
        title: "Need-Based Support Grant",
        description: "Financial assistance for students with demonstrated need",
        amount: 3000,
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        requirements: {
          minGPA: 2.5,
          maxAge: 30,
          majors: [],
          financialNeed: "high",
        },
        provider: {
          name: "Community Support Fund",
          contact: "support@community.org",
          website: "https://community.org",
        },
      },
      {
        title: "STEM Innovation Award",
        description: "For students pursuing careers in Science, Technology, Engineering, and Mathematics",
        amount: 7500,
        deadline: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days from now
        requirements: {
          minGPA: 3.0,
          maxAge: 28,
          majors: ["Computer Science", "Engineering", "Physics", "Chemistry", "Biology"],
          financialNeed: "any",
          extracurriculars: ["Research", "Internship"],
        },
        provider: {
          name: "STEM Education Alliance",
          contact: "awards@stem-alliance.org",
          website: "https://stem-alliance.org",
        },
      },
    ]

    await Scholarship.insertMany(sampleScholarships)
    console.log("Sample scholarships created successfully")

    console.log("\n🎉 Database seeded successfully!")
    console.log(`📧 Admin Email: ${process.env.ADMIN_EMAIL}`)
    console.log(`🔑 Admin Password: ${process.env.ADMIN_PASSWORD}`)
  } catch (error) {
    console.error("Seeding error:", error)
  } finally {
    mongoose.connection.close()
  }
}

seedAdmin()
