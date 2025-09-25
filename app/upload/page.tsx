"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileText, ArrowLeft, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react'

interface ExtractedData {
  fileName: string
  name: string
  cgpa: string
  program: string
  confidence: {
    name: number
    cgpa: number
    program: number
  }
  error?: string | null
}

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [message, setMessage] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return
    
    const fileArray = Array.from(selectedFiles).filter(file => file != null) // Filter out any null/undefined files
    
    // Validate files
    const validFiles = fileArray.filter(file => {
      if (!file || !file.name || !file.type || typeof file.size !== 'number') {
        console.warn('Invalid file object:', file)
        return false
      }
      
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/gif']
      const maxSize = 10 * 1024 * 1024 // 10MB
      
      if (!allowedTypes.includes(file.type)) {
        setMessage(`Invalid file type: ${file.name}. Only PDF, DOC, DOCX, JPG, PNG, and GIF files are allowed.`)
        return false
      }
      
      if (file.size > maxSize) {
        setMessage(`File too large: ${file.name}. Maximum size is 10MB.`)
        return false
      }
      
      return true
    })
    
    if (validFiles.length > 0) {
      setFiles((prev) => [...prev.filter(f => f != null), ...validFiles]) // Also filter existing files
      setMessage("")
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFiles = e.dataTransfer.files
    handleFileSelect(droppedFiles)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = prev.filter((_, i) => i !== index)
      console.log('Files after removal:', newFiles) // Debug log
      return newFiles
    })
    setExtractedData((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async () => {
    if (files.length === 0) {
      setMessage("Please select at least one file to upload")
      return
    }

    setUploading(true)
    setMessage("")
    setExtractedData([])

    try {
      // Step 1: Upload files
      setMessage("Uploading files...")
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData()
        formData.append("document", file)
        
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || `Upload failed for ${file.name}`)
        }

        const uploadResult = await response.json()
        return {
          file: file,
          uploadResponse: uploadResult
        }
      })

      const uploadResults = await Promise.all(uploadPromises)

      // Step 2: Extract data from uploaded files
      setExtracting(true)
      setMessage("Extracting data from documents...")

      const extractionPromises = uploadResults.map(async (result) => {
        try {
          const extractResponse = await fetch("/api/extract", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fileId: result.uploadResponse.fileId,
              fileName: result.file.name,
              filePath: result.uploadResponse.filePath
            }),
          })

          if (!extractResponse.ok) {
            const errorData = await extractResponse.json()
            throw new Error(errorData.message || "Extraction failed")
          }

          const extractResult = await extractResponse.json()
          
          // Debug log to see what we're getting
          console.log('Extract result for', result.file.name, ':', extractResult)
          
          // Handle both direct object and nested data structure
          const extractedInfo = extractResult.data || extractResult
          
          return {
            fileName: result.file.name,
            name: extractedInfo?.name || "Not found",
            cgpa: extractedInfo?.cgpa?.toString() || "Not found",
            program: extractedInfo?.program || "Not found",
            confidence: extractedInfo?.confidence || { name: 0, cgpa: 0, program: 0 },
            error: extractedInfo?.error || null
          } as ExtractedData
        } catch (extractError) {
          console.error(`Extraction failed for ${result.file.name}:`, extractError)
          return {
            fileName: result.file.name,
            name: "Extraction failed",
            cgpa: "Extraction failed",
            program: "Extraction failed",
            confidence: { name: 0, cgpa: 0, program: 0 },
            error: (extractError as Error).message || "Extraction service unavailable"
          } as ExtractedData
        }
      })

      const extractionResults = await Promise.all(extractionPromises)
      // Filter out any undefined results and ensure all results have required properties
      const validResults = extractionResults.filter((result): result is ExtractedData => {
        return result !== undefined && 
               result !== null && 
               typeof result === 'object' &&
               'fileName' in result &&
               typeof result.fileName === 'string' &&
               result.fileName.length > 0
      })
      
      console.log('Valid results:', validResults)
      setExtractedData(validResults)

      setMessage("Files uploaded and data extracted successfully!")

    } catch (error) {
      console.error("Upload error:", error)
      setMessage((error as Error).message || "Upload failed")
    } finally {
      setUploading(false)
      setExtracting(false)
    }
  }

  const clearAll = () => {
    setFiles([])
    setExtractedData([])
    setMessage("")
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 bg-green-100"
    if (confidence >= 0.6) return "text-yellow-600 bg-yellow-100"
    return "text-red-600 bg-red-100"
  }

  const saveExtractedData = () => {
    // Here you would typically save to your database or context
    console.log("Saving extracted data:", extractedData)
    setMessage("Extracted information saved successfully!")
    
    // Optionally redirect to profile or results page
    setTimeout(() => {
      router.push('/profile')
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center space-x-2 hover:text-blue-600 transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
              <span className="text-gray-600">Back to Home</span>
            </Link>
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">DreamFund</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Upload Your Documents</h2>
          <p className="text-lg text-gray-600">
            Upload your academic transcripts, essays, recommendation letters, and other supporting documents.
            Our AI will automatically extract key information like your name, CGPA, and program.
          </p>
        </div>

        <Card className="bg-white shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-900">Document Upload</CardTitle>
            <CardDescription>
              Supported formats: PDF, DOC, DOCX, JPG, PNG, GIF (Max 10MB each)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Message */}
            {message && (
              <div className={`p-4 rounded-lg border flex items-start gap-3 ${
                message.includes('success') || message.includes('successfully')
                  ? 'bg-green-50 text-green-800 border-green-200'
                  : message.includes('Error') || message.includes('failed')
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}>
                {message.includes('success') || message.includes('successfully') ? (
                  <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                ) : message.includes('Error') || message.includes('failed') ? (
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <Loader2 className="h-5 w-5 flex-shrink-0 mt-0.5 animate-spin" />
                )}
                <div className="flex-1">
                  {message}
                  {(uploading || extracting) && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer ${
                dragOver 
                  ? 'border-blue-400 bg-blue-50 scale-105' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              } ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {uploading ? "Processing..." : "Drop files here or click to browse"}
              </h3>
              <p className="text-gray-500">
                Supported formats: PDF, DOC, DOCX, JPG, PNG, GIF (Max 10MB each)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
                disabled={uploading}
                aria-label="Upload multiple documents"
              />
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Selected Files ({files.length})</h3>
                  {!uploading && (
                    <Button onClick={clearAll} variant="outline" size="sm">
                      Clear All
                    </Button>
                  )}
                </div>
                
                <div className="space-y-2">
                  {files
                    .filter((file, index) => {
                      if (!file || typeof file !== 'object' || !file.name) {
                        console.warn(`Invalid file at index ${index}:`, file)
                        return false
                      }
                      return true
                    })
                    .map((file, index) => (
                      <div
                        key={`${file.name}-${index}-${file.size}`}
                        className={`flex justify-between items-center p-4 bg-gray-50 rounded-lg border transition-opacity ${
                          uploading ? 'opacity-70' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{file.name}</div>
                          <div className="text-sm text-gray-500">{formatFileSize(file.size || 0)}</div>
                        </div>
                        <Button
                          onClick={() => removeFile(index)}
                          variant="destructive"
                          size="sm"
                          disabled={uploading}
                          className="ml-4 flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Upload Button */}
            <div className="text-center">
              <Button
                onClick={uploadFiles}
                disabled={uploading || files.length === 0}
                className="px-8 py-3 text-lg transition-all duration-200"
                size="lg"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {extracting ? "Extracting Data..." : "Uploading..."}
                  </>
                ) : (
                  `Upload & Extract ${files.length} File${files.length !== 1 ? "s" : ""}`
                )}
              </Button>
            </div>

            {/* Extracted Data Display */}
            {extractedData.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900">Extracted Information</h3>
                
                {extractedData.map((data, index) => {
                  // Additional safety check with more detailed logging
                  if (!data || typeof data !== 'object' || !data.fileName) {
                    console.warn(`Invalid data at index ${index}:`, data)
                    return (
                      <Card key={`error-${index}`} className="bg-red-50 border-red-200">
                        <CardContent className="p-4">
                          <div className="text-red-600">Error: Invalid data structure for item {index + 1}</div>
                        </CardContent>
                      </Card>
                    )
                  }

                  return (
                    <Card key={`${data.fileName}-${index}`} className="bg-gray-50 border">
                      <CardHeader>
                        <CardTitle className="text-lg truncate">{data.fileName}</CardTitle>
                        {data.error && (
                          <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="font-medium">Error:</div>
                              <div>{data.error}</div>
                            </div>
                          </div>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white p-4 rounded-lg border">
                            <label className="text-sm font-medium text-gray-600 block mb-1">Name</label>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-900 truncate">{data.name || "Not found"}</span>
                              {data.confidence?.name > 0 && (
                                <span className={`text-xs px-2 py-1 rounded-full ml-2 flex-shrink-0 ${getConfidenceColor(data.confidence.name)}`}>
                                  {Math.round(data.confidence.name * 100)}%
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="bg-white p-4 rounded-lg border">
                            <label className="text-sm font-medium text-gray-600 block mb-1">CGPA</label>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-900">{data.cgpa || "Not found"}</span>
                              {data.confidence?.cgpa > 0 && (
                                <span className={`text-xs px-2 py-1 rounded-full ml-2 flex-shrink-0 ${getConfidenceColor(data.confidence.cgpa)}`}>
                                  {Math.round(data.confidence.cgpa * 100)}%
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="bg-white p-4 rounded-lg border">
                            <label className="text-sm font-medium text-gray-600 block mb-1">Program</label>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-900 truncate">{data.program || "Not found"}</span>
                              {data.confidence?.program > 0 && (
                                <span className={`text-xs px-2 py-1 rounded-full ml-2 flex-shrink-0 ${getConfidenceColor(data.confidence.program)}`}>
                                  {Math.round(data.confidence.program * 100)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}

                <div className="flex gap-4 justify-center">
                  <Button onClick={saveExtractedData} className="bg-green-600 hover:bg-green-700 transition-colors duration-200">
                    Save Extracted Information
                  </Button>
                  <Button onClick={clearAll} variant="outline" className="hover:bg-gray-50 transition-colors duration-200">
                    Upload More Files
                  </Button>
                </div>
              </div>
            )}

            {/* Next Steps */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900">Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="text-blue-800 space-y-2">
                  <li>1. Upload all relevant documents</li>
                  <li>2. Review and verify extracted information</li>
                  <li>3. Complete your profile with additional details</li>
                  <li>4. Review your scholarship matches</li>
                  <li>5. Apply to scholarships that interest you</li>
                </ol>
                <div className="mt-4 space-x-4">
                  <Link href="/profile">
                    <Button variant="outline">Complete Profile</Button>
                  </Link>
                  <Link href="/results">
                    <Button variant="outline">View Matches</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}