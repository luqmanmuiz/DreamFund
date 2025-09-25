const express = require('express')
const axios = require('axios')
const router = express.Router()

// Extract data from uploaded documents
router.post('/', async (req, res) => {
  try {
    console.log('🔍 Extraction request received:', req.body)

    // Validate request body
    if (!req.body.filePath) {
      return res.status(400).json({
        error: 'Missing file path',
        name: null,
        cgpa: null,
        program: null,
        confidence: { name: 0.0, cgpa: 0.0, program: 0.0 }
      })
    }

    try {
      // Make request to Python extraction service on port 5001
      const response = await axios.post('http://localhost:5001/api/extract', {
        filePath: req.body.filePath,
        fileName: req.body.fileName || 'unknown'
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      })

      const extractionResult = response.data
      console.log('✅ Extraction successful:', extractionResult)
      
      return res.json(extractionResult)

    } catch (extractionError) {
      console.error('❌ Extraction service error:', extractionError.message)
      
      // Check if it's a connection error
      if (extractionError.code === 'ECONNREFUSED' || extractionError.code === 'ERR_NETWORK') {
        console.error('🐍 Python extraction service is not running on port 5001')
        console.error('💡 Start it with: cd extraction-service && python ner_service.py')
        
        return res.status(503).json({
          error: "Extraction service unavailable. Please start the Python service on port 5001.",
          name: null,
          cgpa: null,
          program: null,
          confidence: { name: 0.0, cgpa: 0.0, program: 0.0 }
        })
      }

      if (extractionError.code === 'ENOTFOUND') {
        return res.status(503).json({
          error: "Cannot connect to extraction service. Please check if Python service is running.",
          name: null,
          cgpa: null,
          program: null,
          confidence: { name: 0.0, cgpa: 0.0, program: 0.0 }
        })
      }
      
      throw extractionError
    }

  } catch (error) {
    console.error('❌ API error:', error)
    
    return res.status(500).json({ 
      error: 'Server error',
      message: error.message,
      name: null,
      cgpa: null,
      program: null,
      confidence: { name: 0.0, cgpa: 0.0, program: 0.0 }
    })
  }
})

module.exports = router