'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Download, Play, Database, Clock, CheckCircle, AlertCircle } from 'lucide-react'

interface ScrapedScholarship {
  name: string
  link: string
  studyLevel: string
  deadline: string
  criteria: string
  contactEmail: string
  scrapedAt: string
}

interface ScrapeResult {
  success: boolean
  message?: string
  count?: number
  data?: ScrapedScholarship[]
  timestamp?: string
  error?: string
}

export default function ScrapePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ScrapeResult | null>(null)
  const [lastScrapeData, setLastScrapeData] = useState<ScrapedScholarship[]>([])

  const handleScrape = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      // Prefer backend scraper that saves to DB
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000'
      const response = await fetch(`${apiBase}/api/scholarships/scrape-scholarships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clearDatabase: false })
      })

      const data = await response.json()
      setResult({
        success: !!data.success,
        message: data.message || (data.success ? 'Scraping completed' : 'Scraping failed'),
        count: data.total ?? data.count,
        timestamp: new Date().toISOString()
      })
      
      if (data.success) {
        // fetch a sample of latest saved scholarships from backend
        const listRes = await fetch(`${apiBase}/api/scholarships?status=All&limit=5&page=1`)
        const listJson = await listRes.json()
        if (Array.isArray(listJson?.scholarships)) {
          // map to preview structure
          setLastScrapeData(
            listJson.scholarships.map((s: any) => ({
              name: s.title,
              link: s.sourceUrl || s.provider?.website,
              studyLevel: (Array.isArray(s.studyLevels) && s.studyLevels.join(', ')) || s.studyLevel || '',
              deadline: s.extractedDeadline || (s.deadline ? new Date(s.deadline).toLocaleDateString() : ''),
              criteria: '',
              contactEmail: s.contactEmail || s.provider?.contact || '',
              scrapedAt: s.scrapedAt || s.createdAt || ''
            }))
          )
        }
      }
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to start scraping process'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    try {
      // Download CSV from latest saved DB records via backend list
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000'
      const response = await fetch(`${apiBase}/api/scholarships?status=All&limit=1000&page=1`)
      const data = await response.json()
      
      if (Array.isArray(data?.scholarships)) {
        // Convert to CSV format
        const csvContent = convertToCSV(
          data.scholarships.map((s: any) => ({
            name: s.title,
            studyLevel: (Array.isArray(s.studyLevels) && s.studyLevels.join(', ')) || s.studyLevel || '',
            deadline: s.extractedDeadline || (s.deadline ? new Date(s.deadline).toLocaleDateString() : ''),
            criteria: '',
            contactEmail: s.contactEmail || s.provider?.contact || '',
            link: s.sourceUrl || s.provider?.website,
            scrapedAt: s.scrapedAt || s.createdAt || ''
          }))
        )
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `scholarships_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const convertToCSV = (data: ScrapedScholarship[]) => {
    if (!data || data.length === 0) return ''
    
    const headers = ['Name', 'Study Level', 'Deadline', 'Criteria', 'Contact Email', 'Link', 'Scraped At']
    const csvRows = [
      headers.join(','),
      ...data.map(item => [
        `"${item.name || ''}"`,
        `"${item.studyLevel || ''}"`,
        `"${item.deadline || ''}"`,
        `"${item.criteria || ''}"`,
        `"${item.contactEmail || ''}"`,
        `"${item.link || ''}"`,
        `"${item.scrapedAt || ''}"`
      ].join(','))
    ]
    
    return csvRows.join('\n')
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scholarship Data Scraper</h1>
          <p className="text-muted-foreground mt-2">
            Scrape scholarship data from afterschool.my and manage the database
          </p>
        </div>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Scraping Controls
          </CardTitle>
          <CardDescription>
            Start the scraping process to collect the latest scholarship data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={handleScrape} 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isLoading ? 'Scraping...' : 'Start Scraping'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </Button>
          </div>

          {/* Status Display */}
          {result && (
            <div className={`p-4 rounded-lg border ${
              result.success 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                <span className="font-semibold">
                  {result.success ? 'Success' : 'Error'}
                </span>
              </div>
              
              <p>{result.message || result.error}</p>
              
              {result.success && result.count && (
                <div className="mt-2 flex items-center gap-4 text-sm">
                  <Badge variant="secondary">
                    {result.count} scholarships scraped
                  </Badge>
                  {result.timestamp && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(result.timestamp).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview of Scraped Data */}
      {lastScrapeData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Scraped Data Preview</CardTitle>
            <CardDescription>
              Showing first {lastScrapeData.length} scholarships from the latest scrape
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lastScrapeData.map((scholarship, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-lg">{scholarship.name}</h3>
                    {scholarship.studyLevel && (
                      <Badge variant="outline">{scholarship.studyLevel}</Badge>
                    )}
                  </div>
                  
                  {scholarship.deadline && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Deadline:</strong> {scholarship.deadline}
                    </p>
                  )}
                  
                  {/* Description preview removed */}
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    {scholarship.contactEmail && (
                      <span>Contact: {scholarship.contactEmail}</span>
                    )}
                    <a 
                      href={scholarship.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View Original
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}