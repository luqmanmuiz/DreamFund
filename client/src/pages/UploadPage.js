"use client";

import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

const UploadPage = () => {
  const [files, setFiles] = useState([]);
  const { user, updateProfileWithExtractedData } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [message, setMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [extractedData, setExtractedData] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileSelect = (selectedFiles) => {
    if (!selectedFiles) return;

    const fileArray = Array.from(selectedFiles);

    // Validate files
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "image/gif",
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    const validFiles = fileArray.filter((file) => {
      if (!allowedTypes.includes(file.type)) {
        setMessage(
          `Invalid file type: ${file.name}. Only PDF, DOC, DOCX, JPG, PNG, and GIF files are allowed.`
        );
        return false;
      }

      if (file.size > maxSize) {
        setMessage(`File too large: ${file.name}. Maximum size is 10MB.`);
        return false;
      }

      return true;
    });

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
      setMessage("");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = e.dataTransfer.files;
    handleFileSelect(droppedFiles);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setExtractedData((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      setMessage("Please select at least one file to upload");
      return;
    }

    setUploading(true);
    setMessage("");
    setExtractedData([]);

    try {
      // Step 1: Upload files to the backend server (port 5000)
      setMessage("Uploading files...");
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append("document", file);

        // Upload to the Express.js backend server on port 5000
        const response = await axios.post(
          "http://localhost:5000/api/upload",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        return {
          file: file,
          uploadResponse: response.data,
        };
      });

      const uploadResults = await Promise.all(uploadPromises);

      // Step 2: Extract data from uploaded files via Node.js backend
      setExtracting(true);
      setMessage("Extracting data from documents...");

      const extractionPromises = uploadResults.map(async (result) => {
        try {
          // Call the Node.js backend which will communicate with Python service
          const extractResponse = await axios.post(
            "http://localhost:5000/api/extract",
            {
              fileId: result.uploadResponse.fileId || result.uploadResponse.id,
              fileName: result.file.name,
              filePath:
                result.uploadResponse.filePath || result.uploadResponse.path,
            }
          );

          const extractResult = extractResponse.data;

          return {
            fileName: result.file.name,
            name: extractResult.name || "Not found",
            cgpa: extractResult.cgpa?.toString() || "Not found",
            program: extractResult.program || "Not found",
            confidence: extractResult.confidence || {
              name: 0,
              cgpa: 0,
              program: 0,
              overall: 0,
            },
            extractionMethods: extractResult.extraction_methods || {},
            qualityTier: extractResult.quality_tier || "unknown",
            error: extractResult.error || null,
          };
        } catch (extractError) {
          console.error(
            `Extraction failed for ${result.file.name}:`,
            extractError
          );

          // Check if it's a service unavailable error
          if (extractError.response?.status === 503) {
            return {
              fileName: result.file.name,
              name: "Service unavailable",
              cgpa: "Service unavailable",
              program: "Service unavailable",
              confidence: { name: 0, cgpa: 0, program: 0, overall: 0 },
              extractionMethods: {},
              qualityTier: "unknown",
              error:
                "Python extraction service is not running on port 5001. Please start the extraction service.",
            };
          }

          return {
            fileName: result.file.name,
            name: "Extraction failed",
            cgpa: "Extraction failed",
            program: "Extraction failed",
            confidence: { name: 0, cgpa: 0, program: 0, overall: 0 },
            extractionMethods: {},
            qualityTier: "unknown",
            error:
              extractError.response?.data?.message ||
              extractError.message ||
              "Extraction service unavailable",
          };
        }
      });

      const extractionResults = await Promise.all(extractionPromises);

      // Filter out any undefined results and ensure all results have required properties
      const validResults = extractionResults.filter((result) => {
        return (
          result !== undefined &&
          result !== null &&
          typeof result === "object" &&
          "fileName" in result &&
          typeof result.fileName === "string" &&
          result.fileName.length > 0
        );
      });

      console.log("Valid extraction results:", validResults);
      setExtractedData(validResults);

      // Check if any extractions failed due to service unavailability
      const serviceUnavailable = validResults.some(
        (result) =>
          result.error && result.error.includes("Python extraction service")
      );

      if (serviceUnavailable) {
        setMessage(
          "Files uploaded but extraction service is unavailable. Please start the Python extraction service on port 5001 and try again."
        );
      } else {
        // Save extracted data to user profile if user is logged in
        if (user && validResults.length > 0) {
          const latestResult = validResults[validResults.length - 1]; // Use the latest extraction
          if (
            latestResult.name !== "Not found" ||
            latestResult.cgpa !== "Not found" ||
            latestResult.program !== "Not found"
          ) {
            try {
              const result = await updateProfileWithExtractedData({
                name:
                  latestResult.name !== "Not found"
                    ? latestResult.name
                    : undefined,
                cgpa:
                  latestResult.cgpa !== "Not found"
                    ? latestResult.cgpa
                    : undefined,
                program:
                  latestResult.program !== "Not found"
                    ? latestResult.program
                    : undefined,
              });

              if (result.success) {
                setMessage(
                  "Files uploaded, data extracted, and profile updated successfully!"
                );
              } else {
                setMessage(
                  "Files uploaded and data extracted successfully! (Profile update failed)"
                );
              }
            } catch (error) {
              console.error("Profile update error:", error);
              setMessage(
                "Files uploaded and data extracted successfully! (Profile update failed)"
              );
            }
          } else {
            setMessage("Files uploaded and data extracted successfully!");
          }
        } else {
          setMessage("Files uploaded and data extracted successfully!");
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      if (error.code === "ERR_NETWORK" || error.code === "ECONNREFUSED") {
        setMessage(
          "Cannot connect to the server. Please make sure the backend server is running on port 5000."
        );
      } else {
        setMessage(error.response?.data?.message || "Upload failed");
      }
    } finally {
      setUploading(false);
      setExtracting(false);
    }
  };

  const clearAll = () => {
    setFiles([]);
    setExtractedData([]);
    setMessage("");
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    );
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return "#10b981"; // green
    if (confidence >= 0.6) return "#f59e0b"; // yellow
    return "#ef4444"; // red
  };

  const getConfidenceTier = (confidence) => {
    if (confidence >= 0.85) return "high";
    if (confidence >= 0.7) return "medium";
    return "low";
  };

  const getConfidenceLabel = (confidence) => {
    const tier = getConfidenceTier(confidence);
    if (tier === "high") return "High Confidence";
    if (tier === "medium") return "Medium Confidence";
    return "Low Confidence - Verify";
  };

  const getConfidenceIcon = (confidence) => {
    const tier = getConfidenceTier(confidence);
    if (tier === "high") return "✓";
    if (tier === "medium") return "⚠";
    return "⚠";
  };

  const getMethodLabel = (method) => {
    if (method === "custom_ner") return "ML Model";
    if (method === "custom_ner_cleaned") return "ML Model (cleaned)";
    if (method === "rules") return "Pattern Matching";
    if (method === "spacy_fallback") return "Fallback NER";
    return "Unknown";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
      }}
    >
      {/* Shared Header - only Home link for upload page (guest session) */}
      <Header navItems={[{ to: "/", label: "Home" }]} />

      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "3rem 2rem",
        }}
      >
        {/* Hero Section */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "4rem",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              background: "#f3f4f6",
              borderRadius: "50px",
              marginBottom: "1.5rem",
            }}
          >
            <span style={{ fontSize: "1rem" }}>📄</span>
            <span
              style={{
                fontSize: "0.875rem",
                color: "#6b7280",
                fontWeight: "500",
              }}
            >
              Document Upload & Analysis
            </span>
          </div>

          <h1
            style={{
              fontSize: "2.5rem",
              fontWeight: "700",
              color: "#111827",
              marginBottom: "1rem",
              lineHeight: "1.2",
            }}
          >
            Upload Your Academic Documents
          </h1>

          <p
            style={{
              fontSize: "1.125rem",
              color: "#6b7280",
              maxWidth: "600px",
              margin: "0 auto",
              lineHeight: "1.7",
            }}
          >
            Upload transcripts, essays, or recommendation letters. Our AI
            extracts key information to match you with perfect scholarships.
          </p>
        </div>

        {/* Main Card */}
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
          }}
        >
          {/* Message Alert */}
          {message && (
            <div
              style={{
                padding: "1rem 1.5rem",
                borderBottom: "1px solid #e5e7eb",
                background: message.includes("success")
                  ? "#f0fdf4"
                  : message.includes("Error") || message.includes("failed")
                  ? "#fef2f2"
                  : "#eff6ff",
                borderRadius: "16px 16px 0 0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <span style={{ fontSize: "1.25rem" }}>
                  {message.includes("success")
                    ? "✅"
                    : message.includes("Error") || message.includes("failed")
                    ? "❌"
                    : "ℹ️"}
                </span>
                <span
                  style={{
                    color: message.includes("success")
                      ? "#166534"
                      : message.includes("Error") || message.includes("failed")
                      ? "#991b1b"
                      : "#1e40af",
                    fontWeight: "500",
                    fontSize: "0.95rem",
                  }}
                >
                  {message}
                </span>
              </div>
              {(uploading || extracting) && (
                <div style={{ marginTop: "0.75rem" }}>
                  <div
                    style={{
                      width: "100%",
                      height: "4px",
                      backgroundColor: "#e5e7eb",
                      borderRadius: "2px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        backgroundColor: "#667eea",
                        borderRadius: "2px",
                        animation:
                          "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ padding: "2.5rem" }}>
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
                border: dragOver ? "2px dashed #667eea" : "2px dashed #d1d5db",
                borderRadius: "12px",
                padding: "3rem 2rem",
                textAlign: "center",
                cursor: "pointer",
                background: dragOver ? "#f5f3ff" : "#fafafa",
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "64px",
                  height: "64px",
                  borderRadius: "12px",
                  background: uploading ? "#fef3c7" : "#ede9fe",
                  marginBottom: "1.5rem",
                }}
              >
                <span style={{ fontSize: "2rem" }}>
                  {uploading ? "⏳" : "📁"}
                </span>
              </div>

              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  color: "#111827",
                  marginBottom: "0.5rem",
                }}
              >
                {uploading
                  ? "Processing your documents..."
                  : "Drop files here or click to browse"}
              </h3>

              <p
                style={{
                  color: "#6b7280",
                  fontSize: "0.95rem",
                  margin: 0,
                  lineHeight: "1.6",
                }}
              >
                Supported: PDF, DOC, DOCX, JPG, PNG, GIF
                <br />
                <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                  Maximum 10MB per file
                </span>
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

            {/* Selected Files */}
            {files.length > 0 && (
              <div style={{ marginTop: "2rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1rem",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: "600",
                      color: "#111827",
                      margin: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    Selected Files
                    <span
                      style={{
                        background: "#f3f4f6",
                        color: "#4b5563",
                        padding: "0.25rem 0.625rem",
                        borderRadius: "12px",
                        fontSize: "0.875rem",
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
                        padding: "0.5rem 1rem",
                        fontSize: "0.875rem",
                        background: "white",
                        color: "#dc2626",
                        border: "1px solid #fecaca",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "500",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = "#fef2f2";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = "white";
                      }}
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {files.map((file, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "1rem",
                        background: "#fafafa",
                        borderRadius: "10px",
                        border: "1px solid #e5e7eb",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "8px",
                            background: "#ede9fe",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.25rem",
                            flexShrink: 0,
                          }}
                        >
                          📄
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: "500",
                              color: "#111827",
                              fontSize: "0.95rem",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {file.name}
                          </div>
                          <div
                            style={{
                              fontSize: "0.85rem",
                              color: "#6b7280",
                              marginTop: "0.125rem",
                            }}
                          >
                            {formatFileSize(file.size)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        style={{
                          padding: "0.5rem 1rem",
                          fontSize: "0.875rem",
                          background: "white",
                          color: "#dc2626",
                          border: "1px solid #fecaca",
                          borderRadius: "6px",
                          cursor: uploading ? "not-allowed" : "pointer",
                          fontWeight: "500",
                          opacity: uploading ? 0.5 : 1,
                          transition: "all 0.2s ease",
                          flexShrink: 0,
                        }}
                        disabled={uploading}
                        onMouseEnter={(e) =>
                          !uploading && (e.target.style.background = "#fef2f2")
                        }
                        onMouseLeave={(e) =>
                          !uploading && (e.target.style.background = "white")
                        }
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
                style={{
                  padding: "1rem 2.5rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  background:
                    uploading || files.length === 0 ? "#d1d5db" : "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  cursor:
                    uploading || files.length === 0 ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  boxShadow:
                    uploading || files.length === 0
                      ? "none"
                      : "0 4px 12px rgba(102, 126, 234, 0.3)",
                }}
                onMouseEnter={(e) => {
                  if (!uploading && files.length > 0) {
                    e.target.style.background = "#5568d3";
                    e.target.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!uploading && files.length > 0) {
                    e.target.style.background = "#667eea";
                    e.target.style.transform = "translateY(0)";
                  }
                }}
              >
                {uploading
                  ? extracting
                    ? "🔍 Extracting Data..."
                    : "📤 Uploading..."
                  : `🚀 Upload & Extract ${files.length} File${
                      files.length !== 1 ? "s" : ""
                    }`}
              </button>
            </div>

            {/* Extracted Data Section */}
            {extractedData.length > 0 && (
              <div
                style={{
                  marginTop: "3rem",
                  paddingTop: "2rem",
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: "600",
                    color: "#111827",
                    marginBottom: "1.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  🎯 Extracted Information
                </h3>

                {extractedData
                  .filter(
                    (data) => data && typeof data === "object" && data.fileName
                  )
                  .map((data, index) => (
                    <div
                      key={`${data.fileName}-${index}`}
                      style={{
                        marginBottom: "1.5rem",
                        padding: "1.5rem",
                        background: "#fafafa",
                        borderRadius: "12px",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          marginBottom: "1.5rem",
                        }}
                      >
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "8px",
                            background: "#ede9fe",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.1rem",
                          }}
                        >
                          📄
                        </div>
                        <h4
                          style={{
                            margin: 0,
                            color: "#111827",
                            fontSize: "1.05rem",
                            fontWeight: "600",
                          }}
                        >
                          {data.fileName}
                        </h4>
                      </div>

                      {data.error && (
                        <div
                          style={{
                            color: "#991b1b",
                            fontSize: "0.9rem",
                            marginBottom: "1.25rem",
                            padding: "0.875rem",
                            background: "#fef2f2",
                            borderRadius: "8px",
                            border: "1px solid #fecaca",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.625rem",
                          }}
                        >
                          <span style={{ fontSize: "1.1rem" }}>⚠️</span>
                          <span>{data.error}</span>
                        </div>
                      )}

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(200px, 1fr))",
                          gap: "1rem",
                        }}
                      >
                        {[
                          {
                            label: "Name",
                            value: data.name,
                            confidence: data.confidence?.name,
                            method: data.extractionMethods?.name,
                            icon: "👤",
                          },
                          {
                            label: "CGPA",
                            value: data.cgpa,
                            confidence: data.confidence?.cgpa,
                            method: data.extractionMethods?.cgpa,
                            icon: "📊",
                          },
                          {
                            label: "Program",
                            value: data.program,
                            confidence: data.confidence?.program,
                            method: data.extractionMethods?.program,
                            icon: "🎓",
                          },
                        ].map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: "1rem",
                              background: "white",
                              borderRadius: "10px",
                              border: `1px solid ${
                                item.confidence >= 0.85
                                  ? "#d1fae5"
                                  : item.confidence >= 0.7
                                  ? "#fef3c7"
                                  : "#fee2e2"
                              }`,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                marginBottom: "0.625rem",
                              }}
                            >
                              <span style={{ fontSize: "1rem" }}>
                                {item.icon}
                              </span>
                              <label
                                style={{
                                  fontSize: "0.85rem",
                                  fontWeight: "600",
                                  color: "#6b7280",
                                }}
                              >
                                {item.label}
                              </label>
                            </div>

                            <div style={{ marginBottom: "0.5rem" }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.625rem",
                                  flexWrap: "wrap",
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: "600",
                                    color: "#111827",
                                    fontSize: "0.95rem",
                                  }}
                                >
                                  {item.value || "Not found"}
                                </span>
                                {item.confidence > 0 && (
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      padding: "0.25rem 0.625rem",
                                      borderRadius: "12px",
                                      backgroundColor: getConfidenceColor(
                                        item.confidence
                                      ),
                                      color: "white",
                                      fontWeight: "600",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.25rem",
                                    }}
                                  >
                                    {getConfidenceIcon(item.confidence)}{" "}
                                    {Math.round(item.confidence * 100)}%
                                  </span>
                                )}
                              </div>
                            </div>

                            {item.confidence > 0 && (
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  color: "#6b7280",
                                  marginTop: "0.5rem",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.25rem",
                                }}
                              >
                                <div>
                                  <strong>Confidence:</strong>{" "}
                                  {getConfidenceLabel(item.confidence)}
                                </div>
                                {item.method && (
                                  <div>
                                    <strong>Method:</strong>{" "}
                                    {getMethodLabel(item.method)}
                                  </div>
                                )}
                                {item.confidence < 0.7 && (
                                  <div
                                    style={{
                                      color: "#dc2626",
                                      fontWeight: "600",
                                      marginTop: "0.25rem",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.25rem",
                                    }}
                                  >
                                    ⚠️ Please verify manually
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {data.confidence?.overall > 0 && (
                        <div
                          style={{
                            marginTop: "1.25rem",
                            padding: "0.875rem",
                            borderRadius: "8px",
                            background:
                              data.qualityTier === "high"
                                ? "#d1fae5"
                                : data.qualityTier === "medium"
                                ? "#fef3c7"
                                : "#fee2e2",
                            border: `1px solid ${
                              data.qualityTier === "high"
                                ? "#10b981"
                                : data.qualityTier === "medium"
                                ? "#f59e0b"
                                : "#ef4444"
                            }`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: "0.5rem",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                              }}
                            >
                              <span style={{ fontSize: "1.1rem" }}>
                                {data.qualityTier === "high"
                                  ? "✅"
                                  : data.qualityTier === "medium"
                                  ? "⚠️"
                                  : "❌"}
                              </span>
                              <span
                                style={{
                                  fontWeight: "600",
                                  color: "#111827",
                                  fontSize: "0.9rem",
                                }}
                              >
                                Overall Quality:{" "}
                                {getConfidenceLabel(data.confidence.overall)}
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: "0.85rem",
                                fontWeight: "600",
                                color: "#111827",
                              }}
                            >
                              {Math.round(data.confidence.overall * 100)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                  <button
                    style={{
                      padding: "0.875rem 1.75rem",
                      background: "white",
                      color: "#6b7280",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "0.95rem",
                      fontWeight: "500",
                      transition: "all 0.2s ease",
                    }}
                    onClick={() => {
                      setFiles([]);
                      setExtractedData([]);
                      setMessage("");
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = "#f9fafb";
                      e.target.style.borderColor = "#9ca3af";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "white";
                      e.target.style.borderColor = "#d1d5db";
                    }}
                  >
                    📤 Upload More Files
                  </button>
                </div>
              </div>
            )}

            {/* Success CTA */}
            {extractedData.length > 0 && message.includes("success") && (
              <div
                style={{
                  marginTop: "2.5rem",
                  padding: "2rem",
                  background: "#f0fdf4",
                  borderRadius: "12px",
                  border: "1px solid #bbf7d0",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
                  🎉
                </div>
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: "600",
                    color: "#166534",
                    marginBottom: "0.75rem",
                  }}
                >
                  Documents processed successfully!
                </h3>
                <p
                  style={{
                    color: "#15803d",
                    marginBottom: "1.5rem",
                    fontSize: "0.95rem",
                    lineHeight: "1.6",
                  }}
                >
                  Your information has been extracted and analyzed. Ready to
                  find your perfect scholarship matches?
                </p>
                <Link
                  to={user ? `/results/${user.id}` : "/results"}
                  style={{
                    padding: "0.875rem 2rem",
                    background: "#667eea",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: "10px",
                    display: "inline-block",
                    fontSize: "1rem",
                    fontWeight: "600",
                    transition: "all 0.2s ease",
                    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                  }}
                  onClick={() => {
                    try {
                      if (
                        Array.isArray(extractedData) &&
                        extractedData.length
                      ) {
                        localStorage.setItem(
                          "extractedData",
                          JSON.stringify(extractedData)
                        );
                      }
                    } catch (_) {}
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "#5568d3";
                    e.target.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "#667eea";
                    e.target.style.transform = "translateY(0)";
                  }}
                >
                  🔍 View Scholarship Matches
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
