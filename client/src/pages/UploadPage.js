import { useState, useRef } from "react"
import { Link } from "react-router-dom"
import axios from "axios"
import { useAuth } from "../contexts/AuthContext"

const UploadPage = () => {
  const [files, setFiles] = useState([])
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [message, setMessage] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [extractedData, setExtractedData] = useState([])
  const fileInputRef = useRef(null)

  const handleFileSelect = (selectedFiles) => {
    if (!selectedFiles) return
    
    const fileArray = Array.from(selectedFiles)
    
    // Validate files
    const validFiles = fileArray.filter(file => {
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
      setFiles((prev) => [...prev, ...validFiles])
      setMessage("")
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFiles = e.dataTransfer.files
    handleFileSelect(droppedFiles)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
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
      // Step 1: Upload files to the backend server (port 5000)
      setMessage("Uploading files...")
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData()
        formData.append("document", file)
        
        // Upload to the Express.js backend server on port 5000
        const response = await axios.post("http://localhost:5000/api/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        
        return {
          file: file,
          uploadResponse: response.data
        }
      })

      const uploadResults = await Promise.all(uploadPromises)

      // Step 2: Extract data from uploaded files via Node.js backend
      setExtracting(true)
      setMessage("Extracting data from documents...")

      const extractionPromises = uploadResults.map(async (result) => {
        try {
          // Call the Node.js backend which will communicate with Python service
          const extractResponse = await axios.post("http://localhost:5000/api/extract", {
            fileId: result.uploadResponse.fileId || result.uploadResponse.id,
            fileName: result.file.name,
            filePath: result.uploadResponse.filePath || result.uploadResponse.path
          })
          
          const extractResult = extractResponse.data
          
          return {
            fileName: result.file.name,
            name: extractResult.name || "Not found",
            cgpa: extractResult.cgpa?.toString() || "Not found",
            program: extractResult.program || "Not found",
            confidence: extractResult.confidence || { name: 0, cgpa: 0, program: 0 },
            error: extractResult.error || null
          }
        } catch (extractError) {
          console.error(`Extraction failed for ${result.file.name}:`, extractError)
          
          // Check if it's a service unavailable error
          if (extractError.response?.status === 503) {
            return {
              fileName: result.file.name,
              name: "Service unavailable",
              cgpa: "Service unavailable", 
              program: "Service unavailable",
              confidence: { name: 0, cgpa: 0, program: 0 },
              error: "Python extraction service is not running on port 5001. Please start the extraction service."
            }
          }
          
          return {
            fileName: result.file.name,
            name: "Extraction failed",
            cgpa: "Extraction failed", 
            program: "Extraction failed",
            confidence: { name: 0, cgpa: 0, program: 0 },
            error: extractError.response?.data?.message || extractError.message || "Extraction service unavailable"
          }
        }
      })

      const extractionResults = await Promise.all(extractionPromises)

      // Filter out any undefined results and ensure all results have required properties
      const validResults = extractionResults.filter((result) => {
        return result !== undefined && 
               result !== null && 
               typeof result === 'object' &&
               'fileName' in result &&
               typeof result.fileName === 'string' &&
               result.fileName.length > 0
      })

      console.log('Valid extraction results:', validResults)
      setExtractedData(validResults)

      // Check if any extractions failed due to service unavailability
      const serviceUnavailable = validResults.some(result => 
        result.error && result.error.includes("Python extraction service")
      )

      if (serviceUnavailable) {
        setMessage("Files uploaded but extraction service is unavailable. Please start the Python extraction service on port 5001 and try again.")
      } else {
        setMessage("Files uploaded and data extracted successfully!")
      }

    } catch (error) {
      console.error("Upload error:", error)
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        setMessage("Cannot connect to the server. Please make sure the backend server is running on port 5000.")
      } else {
        setMessage(error.response?.data?.message || "Upload failed")
      }
    } finally {
      setUploading(false)
      setExtracting(false)
    }
  }

  const clearAll = () => {
    setFiles([])
    setExtractedData([])
    setMessage("")
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return "#10b981" // green
    if (confidence >= 0.6) return "#f59e0b" // yellow
    return "#ef4444" // red
  }

  const saveExtractedData = () => {
    // Save extracted data to local storage or send to backend
    localStorage.setItem('extractedData', JSON.stringify(extractedData))
    console.log("Saving extracted data:", extractedData)
    setMessage("Extracted information saved successfully!")
  }

  return (
    <div>
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo">
            DreamFund
          </Link>
          <nav>
            <ul className="nav-links">
              <li>
                <Link to="/">Home</Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <div className="container" style={{ padding: "2rem 0" }}>
        <div className="card" style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h1>Upload Documents</h1>
          <p style={{ marginBottom: "2rem", color: "#6b7280" }}>
            Upload your academic transcripts, essays, recommendation letters, and other supporting documents.
            Our AI will automatically extract key information like your name, CGPA, and program.
          </p>

          {message && (
            <div className={`alert ${message.includes("success") ? "alert-success" : message.includes("Error") || message.includes("failed") || message.includes("unavailable") || message.includes("Cannot connect") ? "alert-error" : "alert-info"}`}>
              {message}
              {(uploading || extracting) && (
                <div style={{ marginTop: "0.5rem" }}>
                  <div style={{
                    width: "100%",
                    height: "4px",
                    backgroundColor: "#e5e7eb",
                    borderRadius: "2px",
                    overflow: "hidden"
                  }}>
                    <div style={{
                      width: "100%",
                      height: "100%",
                      backgroundColor: "#3b82f6",
                      animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
                    }}></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upload Area */}
          <div
            className={`upload-area ${dragOver ? "dragover" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            style={{ 
              opacity: uploading ? 0.6 : 1, 
              pointerEvents: uploading ? "none" : "auto",
              border: "2px dashed #d1d5db",
              borderRadius: "8px",
              padding: "2rem",
              textAlign: "center",
              cursor: "pointer",
              backgroundColor: dragOver ? "#f3f4f6" : "#fafafa"
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
              {uploading ? "⏳" : "📁"}
            </div>
            <h3>{uploading ? "Processing..." : "Drop files here or click to browse"}</h3>
            <p style={{ color: "#6b7280", marginTop: "0.5rem" }}>
              Supported formats: PDF, DOC, DOCX, JPG, PNG, GIF (Max 10MB each)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
              onChange={(e) => handleFileSelect(e.target.files)}
              style={{ display: "none" }}
              disabled={uploading}
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div style={{ marginTop: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3>Selected Files ({files.length})</h3>
                {!uploading && (
                  <button
                    onClick={clearAll}
                    className="btn btn-secondary"
                    style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div style={{ marginTop: "1rem" }}>
                {files.map((file, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "1rem",
                      background: "#f9fafb",
                      borderRadius: "8px",
                      marginBottom: "0.5rem",
                      opacity: uploading ? 0.7 : 1
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "500" }}>{file.name}</div>
                      <div style={{ fontSize: "0.9rem", color: "#6b7280" }}>{formatFileSize(file.size)}</div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="btn btn-danger"
                      style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}
                      disabled={uploading}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div style={{ marginTop: "2rem", textAlign: "center" }}>
            <button
              onClick={uploadFiles}
              disabled={uploading || files.length === 0}
              className="btn btn-primary"
              style={{ 
                padding: "1rem 2rem", 
                fontSize: "1.1rem",
                backgroundColor: uploading || files.length === 0 ? "#9ca3af" : "#3b82f6",
                cursor: uploading || files.length === 0 ? "not-allowed" : "pointer"
              }}
            >
              {uploading
                ? extracting
                  ? "Extracting Data..."
                  : "Uploading..."
                : `Upload & Extract ${files.length} File${files.length !== 1 ? "s" : ""}`
              }
            </button>
          </div>

          {/* Extracted Data Display */}
          {extractedData.length > 0 && (
            <div style={{ marginTop: "3rem" }}>
              <h3>Extracted Information</h3>
              {extractedData
                .filter((data) => {
                  // Filter out any undefined, null, or invalid data objects
                  if (!data || typeof data !== 'object') {
                    console.warn('Invalid data object found:', data)
                    return false
                  }
                  if (!data.fileName || typeof data.fileName !== 'string') {
                    console.warn('Data object missing fileName:', data)
                    return false
                  }
                  return true
                })
                .map((data, index) => (
                  <div
                    key={`${data.fileName}-${index}`}
                    style={{
                      marginTop: "1rem",
                      padding: "1.5rem",
                      background: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <h4 style={{ marginBottom: "1rem", color: "#1e293b" }}>{data.fileName}</h4>
                    {data.error && (
                      <div style={{
                        color: "#dc2626",
                        fontSize: "0.9rem",
                        marginBottom: "1rem",
                        padding: "0.5rem",
                        backgroundColor: "#fef2f2",
                        borderRadius: "4px",
                        border: "1px solid #fecaca"
                      }}>
                        ⚠️ {data.error}
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                      <div>
                        <label style={{ fontSize: "0.9rem", fontWeight: "500", color: "#475569" }}>Name</label>
                        <div style={{ marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontWeight: "500" }}>{data.name || "Not found"}</span>
                          {data.confidence?.name > 0 && (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                padding: "0.125rem 0.375rem",
                                borderRadius: "9999px",
                                backgroundColor: getConfidenceColor(data.confidence.name),
                                color: "white",
                              }}
                            >
                              {Math.round(data.confidence.name * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: "0.9rem", fontWeight: "500", color: "#475569" }}>CGPA</label>
                        <div style={{ marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontWeight: "500" }}>{data.cgpa || "Not found"}</span>
                          {data.confidence?.cgpa > 0 && (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                padding: "0.125rem 0.375rem",
                                borderRadius: "9999px",
                                backgroundColor: getConfidenceColor(data.confidence.cgpa),
                                color: "white",
                              }}
                            >
                              {Math.round(data.confidence.cgpa * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: "0.9rem", fontWeight: "500", color: "#475569" }}>Program</label>
                        <div style={{ marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontWeight: "500" }}>{data.program || "Not found"}</span>
                          {data.confidence?.program > 0 && (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                padding: "0.125rem 0.375rem",
                                borderRadius: "9999px",
                                backgroundColor: getConfidenceColor(data.confidence.program),
                                color: "white",
                              }}
                            >
                              {Math.round(data.confidence.program * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

              {extractedData.length > 0 && (
                <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
                  <button
                    className="btn btn-success"
                    style={{ 
                      padding: "0.75rem 1.5rem", 
                      marginRight: "1rem",
                      backgroundColor: "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer"
                    }}
                    onClick={saveExtractedData}
                  >
                    Save Extracted Information
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ 
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "#6b7280",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer"
                    }}
                    onClick={() => {
                      setFiles([])
                      setExtractedData([])
                      setMessage("")
                    }}
                  >
                    Upload More Files
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Next Steps */}
          <div
            style={{
              marginTop: "3rem",
              padding: "1.5rem",
              background: "#eff6ff",
              borderRadius: "8px",
              border: "1px solid #93c5fd",
            }}
          >
            <h3 style={{ color: "#1e40af", marginBottom: "1rem" }}>Next Steps</h3>
            <ol style={{ color: "#1e40af", paddingLeft: "1.5rem" }}>
              <li>Upload all relevant documents</li>
              <li>Review and verify extracted information</li>
              <li>Complete your profile with additional details</li>
              <li>Review your scholarship matches</li>
              <li>Apply to scholarships that interest you</li>
            </ol>
            <div style={{ marginTop: "1rem" }}>
              <Link 
                to="/profile" 
                className="btn btn-secondary" 
                style={{ 
                  marginRight: "1rem",
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#6b7280",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "6px",
                  display: "inline-block"
                }}
              >
                Complete Profile
              </Link>
              <Link 
                to={user ? `/results/${user.id}` : "/results"}
                className="btn btn-secondary" 
                style={{ 
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "6px",
                  display: "inline-block"
                }}
                onClick={() => {
                  try {
                    if (Array.isArray(extractedData) && extractedData.length) {
                      localStorage.setItem('extractedData', JSON.stringify(extractedData))
                    }
                  } catch (_) {}
                }}
              >
                View Matches
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UploadPage
