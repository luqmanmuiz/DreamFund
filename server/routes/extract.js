const express = require('express');
const axios = require('axios');
const router = express.Router();

// Extract data from uploaded document
router.post('/', async (req, res) => {
  try {
    console.log('📄 Extract request received:', req.body);

    const { fileId, fileName, filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({
        error: 'Missing file path',
        name: null,
        cgpa: null,
        program: null,
        confidence: { name: 0.0, cgpa: 0.0, program: 0.0 }
      });
    }

    try {
      // Call Python extraction service
      const response = await axios.post('http://localhost:5001/api/extract', {
        filePath: filePath,
        fileName: fileName,
        fileId: fileId
      }, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Python extraction successful:', response.data);
      res.json(response.data);

    } catch (extractionError) {
      console.error('❌ Python extraction service error:', extractionError.message);
      
      if (extractionError.code === 'ECONNREFUSED') {
        console.error('🐍 Python extraction service is not running on port 5000');
        console.error('💡 Start it with: cd extraction-service && python ner_service.py');
      }
      
      return res.status(503).json({
        error: "Extraction service unavailable. Please start the Python service.",
        name: null,
        cgpa: null,
        program: null,
        confidence: { name: 0.0, cgpa: 0.0, program: 0.0 }
      });
    }

  } catch (error) {
    console.error('❌ Extract route error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message,
      name: null,
      cgpa: null,
      program: null,
      confidence: { name: 0.0, cgpa: 0.0, program: 0.0 }
    });
  }
});

module.exports = router;
