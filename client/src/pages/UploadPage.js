"use client"

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
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "image/gif",
    ]
    const maxSize = 10 * 1024 * 1024 // 10MB

    const validFiles = fileArray.filter((file) => {
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
          uploadResponse: response.data,
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
            filePath: result.uploadResponse.filePath || result.uploadResponse.path,
          })

          const extractResult = extractResponse.data

          return {
            fileName: result.file.name,
            name: extractResult.name || "Not found",
            cgpa: extractResult.cgpa?.toString() || "Not found",
            program: extractResult.program || "Not found",
            confidence: extractResult.confidence || { name: 0, cgpa: 0, program: 0 },
            error: extractResult.error || null,
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
              error: "Python extraction service is not running on port 5001. Please start the extraction service.",
            }
          }

          return {
            fileName: result.file.name,
            name: "Extraction failed",
            cgpa: "Extraction failed",
            program: "Extraction failed",
            confidence: { name: 0, cgpa: 0, program: 0 },
            error: extractError.response?.data?.message || extractError.message || "Extraction service unavailable",
          }
        }
      })

      const extractionResults = await Promise.all(extractionPromises)

      // Filter out any undefined results and ensure all results have required properties
      const validResults = extractionResults.filter((result) => {
        return (
          result !== undefined &&
          result !== null &&
          typeof result === "object" &&
          "fileName" in result &&
          typeof result.fileName === "string" &&
          result.fileName.length > 0
        )
      })

      console.log("Valid extraction results:", validResults)
      setExtractedData(validResults)

      // Check if any extractions failed due to service unavailability
      const serviceUnavailable = validResults.some(
        (result) => result.error && result.error.includes("Python extraction service"),
      )

      if (serviceUnavailable) {
        setMessage(
          "Files uploaded but extraction service is unavailable. Please start the Python extraction service on port 5001 and try again.",
        )
      } else {
        setMessage("Files uploaded and data extracted successfully!")
      }
    } catch (error) {
      console.error("Upload error:", error)
      if (error.code === "ERR_NETWORK" || error.code === "ECONNREFUSED") {
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

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)" }}>
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo">
            <span className="logo-icon">🎓</span>
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

      <div className="container" style={{ padding: "3rem 1rem", maxWidth: "900px", margin: "0 auto" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderRadius: "20px",
            padding: "2.5rem 2rem",
            textAlign: "center",
            color: "white",
            marginBottom: "3rem",
            boxShadow: "0 20px 40px rgba(102, 126, 234, 0.3)",
          }}
        >
          <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>📚</div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "700", marginBottom: "1rem", margin: 0 }}>
            Upload Your Documents
          </h1>
          <p style={{ fontSize: "1.1rem", opacity: "0.9", maxWidth: "600px", margin: "0 auto", lineHeight: "1.6" }}>
            Upload your academic transcripts, essays, and recommendation letters. Our AI will automatically extract key
            information to match you with perfect scholarships.
          </p>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: "20px",
            padding: "2.5rem",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e2e8f0",
          }}
        >
          {message && (
            <div
              style={{
                padding: "1.5rem",
                borderRadius: "12px",
                marginBottom: "2rem",
                background: message.includes("success")
                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                  : message.includes("Error") ||
                      message.includes("failed") ||
                      message.includes("unavailable") ||
                      message.includes("Cannot connect")
                    ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                    : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                color: "white",
                fontWeight: "500",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "1.2rem" }}>
                  {message.includes("success")
                    ? "✅"
                    : message.includes("Error") || message.includes("failed")
                      ? "❌"
                      : "ℹ️"}
                </span>
                <span>{message}</span>
              </div>
              {(uploading || extracting) && (
                <div style={{ marginTop: "1rem" }}>
                  <div
                    style={{
                      width: "100%",
                      height: "6px",
                      backgroundColor: "rgba(255, 255, 255, 0.3)",
                      borderRadius: "3px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        backgroundColor: "white",
                        borderRadius: "3px",
                        animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div
            className={`upload-area ${dragOver ? "dragover" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            style={{
              opacity: uploading ? 0.6 : 1,
              pointerEvents: uploading ? "none" : "auto",
              border: dragOver ? "3px dashed #667eea" : "3px dashed #e2e8f0",
              borderRadius: "16px",
              padding: "3rem 2rem",
              textAlign: "center",
              cursor: "pointer",
              background: dragOver
                ? "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)"
                : "linear-gradient(135deg, #fafafa 0%, #f4f4f5 100%)",
              transition: "all 0.3s ease",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e2e8f0' fill-opacity='0.3'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                opacity: 0.5,
              }}
            ></div>

            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  fontSize: "4rem",
                  marginBottom: "1.5rem",
                  background: uploading
                    ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                    : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {uploading ? "⏳" : "📁"}
              </div>
              <h3
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "600",
                  marginBottom: "0.75rem",
                  color: "#1f2937",
                }}
              >
                {uploading ? "Processing your documents..." : "Drop files here or click to browse"}
              </h3>
              <p
                style={{
                  color: "#6b7280",
                  fontSize: "1rem",
                  margin: 0,
                  lineHeight: "1.5",
                }}
              >
                Supported formats: PDF, DOC, DOCX, JPG, PNG, GIF
                <br />
                <span style={{ fontSize: "0.9rem", opacity: 0.8 }}>Maximum 10MB per file</span>
              </p>
            </div>

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

          {files.length > 0 && (
            <div style={{ marginTop: "2.5rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.5rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "1.3rem",
                    fontWeight: "600",
                    color: "#1f2937",
                    margin: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  📋 Selected Files
                  <span
                    style={{
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "20px",
                      fontSize: "0.9rem",
                      fontWeight: "500",
                    }}
                  >
                    {files.length}
                  </span>
                </h3>
                {!uploading && (
                  <button
                    onClick={clearAll}
                    style={{
                      padding: "0.75rem 1.5rem",
                      fontSize: "0.9rem",
                      background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontWeight: "500",
                      transition: "transform 0.2s ease",
                      boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
                    }}
                    onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
                    onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div style={{ display: "grid", gap: "1rem" }}>
                {files.map((file, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "1.5rem",
                      background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      opacity: uploading ? 0.7 : 1,
                      transition: "all 0.3s ease",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "12px",
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.5rem",
                        }}
                      >
                        📄
                      </div>
                      <div>
                        <div style={{ fontWeight: "600", color: "#1f2937", fontSize: "1rem" }}>{file.name}</div>
                        <div style={{ fontSize: "0.9rem", color: "#6b7280", marginTop: "0.25rem" }}>
                          {formatFileSize(file.size)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      style={{
                        padding: "0.75rem 1.25rem",
                        fontSize: "0.9rem",
                        background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: uploading ? "not-allowed" : "pointer",
                        fontWeight: "500",
                        opacity: uploading ? 0.5 : 1,
                        transition: "all 0.2s ease",
                        boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)",
                      }}
                      disabled={uploading}
                      onMouseEnter={(e) => !uploading && (e.target.style.transform = "translateY(-1px)")}
                      onMouseLeave={(e) => !uploading && (e.target.style.transform = "translateY(0)")}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: "2.5rem", textAlign: "center" }}>
            <button
              onClick={uploadFiles}
              disabled={uploading || files.length === 0}
              style={{
                padding: "1.25rem 3rem",
                fontSize: "1.1rem",
                fontWeight: "600",
                background:
                  uploading || files.length === 0
                    ? "linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)"
                    : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                cursor: uploading || files.length === 0 ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                boxShadow: uploading || files.length === 0 ? "none" : "0 8px 25px rgba(102, 126, 234, 0.4)",
                transform: uploading || files.length === 0 ? "none" : "translateY(0)",
              }}
              onMouseEnter={(e) => {
                if (!uploading && files.length > 0) {
                  e.target.style.transform = "translateY(-2px)"
                  e.target.style.boxShadow = "0 12px 35px rgba(102, 126, 234, 0.5)"
                }
              }}
              onMouseLeave={(e) => {
                if (!uploading && files.length > 0) {
                  e.target.style.transform = "translateY(0)"
                  e.target.style.boxShadow = "0 8px 25px rgba(102, 126, 234, 0.4)"
                }
              }}
            >
              {uploading
                ? extracting
                  ? "🔍 Extracting Data..."
                  : "📤 Uploading..."
                : `🚀 Upload & Extract ${files.length} File${files.length !== 1 ? "s" : ""}`}
            </button>
          </div>

          {extractedData.length > 0 && (
            <div style={{ marginTop: "3rem" }}>
              <h3
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "600",
                  color: "#1f2937",
                  marginBottom: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                🎯 Extracted Information
              </h3>
              {extractedData
                .filter((data) => {
                  if (!data || typeof data !== "object") {
                    console.warn("Invalid data object found:", data)
                    return false
                  }
                  if (!data.fileName || typeof data.fileName !== "string") {
                    console.warn("Data object missing fileName:", data)
                    return false
                  }
                  return true
                })
                .map((data, index) => (
                  <div
                    key={`${data.fileName}-${index}`}
                    style={{
                      marginBottom: "1.5rem",
                      padding: "2rem",
                      background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                      borderRadius: "16px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                        marginBottom: "1.5rem",
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "10px",
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.2rem",
                        }}
                      >
                        📄
                      </div>
                      <h4
                        style={{
                          margin: 0,
                          color: "#1f2937",
                          fontSize: "1.2rem",
                          fontWeight: "600",
                        }}
                      >
                        {data.fileName}
                      </h4>
                    </div>

                    {data.error && (
                      <div
                        style={{
                          color: "#dc2626",
                          fontSize: "0.95rem",
                          marginBottom: "1.5rem",
                          padding: "1rem",
                          background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
                          borderRadius: "10px",
                          border: "1px solid #fecaca",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <span style={{ fontSize: "1.2rem" }}>⚠️</span>
                        <span>{data.error}</span>
                      </div>
                    )}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "1.5rem",
                      }}
                    >
                      {[
                        { label: "Name", value: data.name, confidence: data.confidence?.name, icon: "👤" },
                        { label: "CGPA", value: data.cgpa, confidence: data.confidence?.cgpa, icon: "📊" },
                        { label: "Program", value: data.program, confidence: data.confidence?.program, icon: "🎓" },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: "1.25rem",
                            background: "white",
                            borderRadius: "12px",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              marginBottom: "0.75rem",
                            }}
                          >
                            <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
                            <label
                              style={{
                                fontSize: "0.9rem",
                                fontWeight: "600",
                                color: "#475569",
                              }}
                            >
                              {item.label}
                            </label>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.75rem",
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: "600",
                                color: "#1f2937",
                                fontSize: "1rem",
                              }}
                            >
                              {item.value || "Not found"}
                            </span>
                            {item.confidence > 0 && (
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  padding: "0.25rem 0.75rem",
                                  borderRadius: "20px",
                                  backgroundColor: getConfidenceColor(item.confidence),
                                  color: "white",
                                  fontWeight: "600",
                                }}
                              >
                                {Math.round(item.confidence * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

              {extractedData.length > 0 && (
                <div style={{ textAlign: "center", marginTop: "2rem" }}>
                  <button
                    style={{
                      padding: "1rem 2rem",
                      background: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontSize: "1rem",
                      fontWeight: "500",
                      transition: "all 0.2s ease",
                      boxShadow: "0 4px 12px rgba(107, 114, 128, 0.3)",
                    }}
                    onClick={() => {
                      setFiles([])
                      setExtractedData([])
                      setMessage("")
                    }}
                    onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
                    onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
                  >
                    📤 Upload More Files
                  </button>
                </div>
              )}
            </div>
          )}

          {extractedData.length > 0 && message.includes("success") && (
            <div
              style={{
                marginTop: "3rem",
                padding: "2rem",
                background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                borderRadius: "16px",
                border: "1px solid #93c5fd",
                textAlign: "center",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.15)",
              }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🎉</div>
              <h3
                style={{
                  fontSize: "1.3rem",
                  fontWeight: "600",
                  color: "#1e40af",
                  marginBottom: "1rem",
                }}
              >
                Documents processed successfully!
              </h3>
              <p
                style={{
                  color: "#3730a3",
                  marginBottom: "1.5rem",
                  fontSize: "1rem",
                  lineHeight: "1.5",
                }}
              >
                Your information has been extracted and analyzed. Ready to find your perfect scholarship matches?
              </p>
              <Link
                to={user ? `/results/${user.id}` : "/results"}
                style={{
                  padding: "1rem 2.5rem",
                  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "12px",
                  display: "inline-block",
                  fontSize: "1.1rem",
                  fontWeight: "600",
                  transition: "all 0.3s ease",
                  boxShadow: "0 8px 25px rgba(59, 130, 246, 0.4)",
                }}
                onClick={() => {
                  try {
                    if (Array.isArray(extractedData) && extractedData.length) {
                      localStorage.setItem("extractedData", JSON.stringify(extractedData))
                    }
                  } catch (_) {}
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-2px)"
                  e.target.style.boxShadow = "0 12px 35px rgba(59, 130, 246, 0.5)"
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)"
                  e.target.style.boxShadow = "0 8px 25px rgba(59, 130, 246, 0.4)"
                }}
              >
                🔍 View Scholarship Matches
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UploadPage
