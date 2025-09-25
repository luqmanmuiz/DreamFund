  import { NextRequest, NextResponse } from 'next/server'

  export async function POST(request: NextRequest) {
    try {
      const body = await request.json()
      console.log('🔍 Extraction request received:', body)

      // Validate request body
      if (!body.filePath) {
        return NextResponse.json({
          error: 'Missing file path',
          name: null,
          cgpa: null,
          program: null,
          confidence: { name: 0.0, cgpa: 0.0, program: 0.0 }
        }, { status: 400 })
      }

      try {
        // Make request to Python extraction service
        const response = await fetch('http://localhost:5000/api/extract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        })

        if (!response.ok) {
          throw new Error(`Python service responded with status: ${response.status}`)
        }

        const extractionResult = await response.json()
        console.log('✅ Extraction successful:', extractionResult)
        
        return NextResponse.json(extractionResult)

      } catch (extractionError: any) {
        console.error('❌ Extraction service error:', extractionError.message)
        
        // Check if it's a connection error
        if (extractionError.message.includes('ECONNREFUSED') || extractionError.message.includes('fetch')) {
          console.error('🐍 Python extraction service is not running on port 5000')
          console.error('💡 Start it with: cd extraction-service && python ner_service.py')
          
          return NextResponse.json({
            error: "Extraction service unavailable. Please start the Python service.",
            name: null,
            cgpa: null,
            program: null,
            confidence: { name: 0.0, cgpa: 0.0, program: 0.0 }
          }, { status: 503 })
        }
        
        throw extractionError
      }

    } catch (error) {
      console.error('❌ API error:', error)
      
      return NextResponse.json({ 
        error: 'Server error',
        message: (error as Error).message,
        name: null,
        cgpa: null,
        program: null,
        confidence: { name: 0.0, cgpa: 0.0, program: 0.0 }
      }, { status: 500 })
    }
  }
