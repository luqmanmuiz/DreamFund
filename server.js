const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
require("dotenv").config()

const app = express()

// Security middleware
app.use(helmet())
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
})
app.use(limiter)

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

// Static files
app.use("/uploads", express.static("uploads"))

// MongoDB connection - FIXED to use IPv4 explicitly
const connectDB = async () => {
  try {
    // Use 127.0.0.1 instead of localhost to force IPv4
    const conn = await mongoose.connect("mongodb://127.0.0.1:27017/dreamfundDB", {
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 15000, // 15 seconds
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
    })
    
    console.log(`✅ MongoDB connected successfully: ${conn.connection.host}:${conn.connection.port}`)
    console.log(`📊 Database: ${conn.connection.name}`)
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message)
    })
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected')
    })
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected')
    })
    
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message)
    console.log("🔄 Retrying connection in 5 seconds...")
    setTimeout(connectDB, 5000)
  }
}

// Connect to database
connectDB()

// Routes
app.use("/api/auth", require("./routes/auth"))
app.use("/api/scholarships", require("./routes/scholarships"))
app.use("/api/users", require("./routes/users"))
app.use("/api/upload", require("./routes/upload"))
app.use("/api/reports", require("./routes/reports"))
app.use("/api", require("./routes/scrapeRoutes"))

// Health check with database status
app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState
  const dbStatus = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  }
  
  res.json({ 
    status: "OK", 
    message: "DreamFund API is running",
    database: dbStatus[dbState],
    mongooseVersion: mongoose.version,
    dbHost: mongoose.connection.host,
    dbPort: mongoose.connection.port,
    dbName: mongoose.connection.name
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`)
})