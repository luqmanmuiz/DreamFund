const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const mongoose = require('mongoose')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 5000
app.set('trust proxy', 1);

const connectDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/dreamfundDB";
    console.log('🔗 MongoDB URI:', mongoURI);
    
    // Use shorter timeouts and explicit options
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,    // 5 seconds
      connectTimeoutMS: 5000,            // 5 seconds  
      socketTimeoutMS: 10000,            // 10 seconds
      family: 4, // Use IPv4, skip trying IPv6
    });
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log(`📍 Host: ${conn.connection.host}`);
    console.log(`🔌 Port: ${conn.connection.port}`);
    console.log(`🗄️ Database: ${conn.connection.name}`);
    console.log('📊 Connection State:', mongoose.connection.readyState);
    
    return conn;
    
  } catch (error) {
    console.log('❌ MongoDB Connection Failed!');
    console.log('🔍 Error Message:', error.message);
    console.log('🔍 Error Code:', error.code);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Solution: MongoDB service is not running');
      console.log('   Try: net start MongoDB (as Administrator)');
    } else if (error.message.includes('timeout')) {
      console.log('💡 Solution: Connection timeout - check firewall/antivirus');
    }
    
    // Don't exit the process, just log the error
    throw error;
  }
};

// Call it like this in your server.js
connectDB()
  .then(() => {
    console.log('🚀 Database connection established, server ready!');
  })
  .catch((error) => {
    console.log('⚠️ Server starting without database connection');
    console.log('You can still test API endpoints, but database features won\'t work');
  });

module.exports = connectDB;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir))

// Routes
app.use('/api/upload', require('./routes/upload'))
app.use('/api/extract', require('./routes/extract'))
app.use('/api/auth', require('./routes/auth'))
app.use('/api/otp', require('./routes/otpAuth'))
app.use('/api/users', require('./routes/users'))
app.use('/api/scholarships', require('./routes/scholarships'))
app.use('/api/reports', require('./routes/reports'))
app.use('/api/clicks', require('./routes/clickTracking'))

// Health check endpoint with DB status
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  
  res.json({ 
    status: 'OK', 
    message: 'DreamFund API Server is running',
    database: dbStatus,
    timestamp: new Date().toISOString()
  })
})

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error)
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' })
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({ error: error.message })
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  })
})

app.listen(PORT, () => {
  console.log(`🚀 DreamFund API Server running on port ${PORT}`)
  console.log(`📁 Upload directory: ${uploadsDir}`)
  console.log(`🌐 CORS enabled for: http://localhost:3000, http://localhost:3001`)
  console.log(`🔗 MongoDB URI: ${process.env.MONGODB_URI}`)
})

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('🟢 Mongoose connected to MongoDB')
})

mongoose.connection.on('error', (err) => {
  console.error('🔴 Mongoose connection error:', err)
})

mongoose.connection.on('disconnected', () => {
  console.log('🟡 Mongoose disconnected from MongoDB')
})

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close()
    console.log('🔴 MongoDB connection closed due to application termination')
    process.exit(0)
  } catch (error) {
    console.error('Error during graceful shutdown:', error)
    process.exit(1)
  }
})

module.exports = app