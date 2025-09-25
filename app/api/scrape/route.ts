import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    console.log('🕷️ Starting scholarship scraping...')
    
    // Path to the Python scraping script
    const scriptPath = path.join(process.cwd(), 'scripts', 'scrape_scholarships.py')
    
    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({
        success: false,
        error: 'Scraping script not found'
      }, { status: 404 })
    }
    
    // Execute the Python scraping script
    const { stdout, stderr } = await execAsync(`python "${scriptPath}"`, {
      cwd: process.cwd(),
      timeout: 300000 // 5 minutes timeout
    })
    
    console.log('Scraping output:', stdout)
    if (stderr) {
      console.error('Scraping errors:', stderr)
    }
    
    // Try to read the latest scraped data
    const latestJsonPath = path.join(process.cwd(), 'scraped_data', 'scholarships_latest.json')
    let scrapedData = null
    let count = 0
    
    if (fs.existsSync(latestJsonPath)) {
      const jsonData = fs.readFileSync(latestJsonPath, 'utf-8')
      scrapedData = JSON.parse(jsonData)
      count = scrapedData.length
    }
    
    return NextResponse.json({
      success: true,
      message: 'Scraping completed successfully',
      count: count,
      data: scrapedData?.slice(0, 5), // Return first 5 items as preview
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Scraping error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Scraping failed',
      details: error.toString()
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return the latest scraped data
    const latestJsonPath = path.join(process.cwd(), 'scraped_data', 'scholarships_latest.json')
    
    if (!fs.existsSync(latestJsonPath)) {
      return NextResponse.json({
        success: false,
        error: 'No scraped data found. Run scraping first.',
        data: []
      })
    }
    
    const jsonData = fs.readFileSync(latestJsonPath, 'utf-8')
    const scrapedData = JSON.parse(jsonData)
    
    return NextResponse.json({
      success: true,
      count: scrapedData.length,
      data: scrapedData,
      lastUpdated: fs.statSync(latestJsonPath).mtime
    })
    
  } catch (error: any) {
    console.error('Error reading scraped data:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to read scraped data'
    }, { status: 500 })
  }
}