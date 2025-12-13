"use client";

import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { FaGraduationCap } from 'react-icons/fa';
import {
  HiOutlineDocumentText,
  HiCheckCircle,
  HiXCircle,
  HiOutlineInformationCircle,
  HiOutlineCloudArrowUp,
  HiOutlineClock,
  HiMagnifyingGlass,
  HiOutlineRocketLaunch,
  HiOutlineCursorArrowRays,
  HiOutlineUser,
  HiOutlineChartBarSquare,
  HiExclamationTriangle,
  HiSparkles
} from 'react-icons/hi2';

const UploadPage = () => {
  const [files, setFiles] = useState([]);
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [message, setMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [extractedData, setExtractedData] = useState([]);
  const [shareId, setShareId] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

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
    setShareId(null);

    try {
      // Step 1: Upload files to the backend server (port 5000)
      setMessage("Uploading files...");
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append("document", file);

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

      const serviceUnavailable = validResults.some(
        (result) =>
          result.error && result.error.includes("Python extraction service")
      );

      if (serviceUnavailable) {
        setMessage(
          "Files uploaded but extraction service is unavailable. Please start the Python extraction service on port 5001 and try again."
        );
      } else if (validResults.length > 0) {
        // Step 3: Create Guest Profile - ALWAYS attempt this
        const latestResult = validResults[validResults.length - 1];
        
        console.log("Creating guest profile with data:", latestResult);
        
        try {
          const guestResponse = await axios.post("http://localhost:5000/api/guests/create", {
            name: (latestResult.name !== "Not found" && latestResult.name !== "Extraction failed" && latestResult.name !== "Service unavailable") ? latestResult.name : "Student",
            cgpa: (latestResult.cgpa !== "Not found" && latestResult.cgpa !== "Extraction failed" && latestResult.cgpa !== "Service unavailable") ? latestResult.cgpa : 0,
            program: (latestResult.program !== "Not found" && latestResult.program !== "Extraction failed" && latestResult.program !== "Service unavailable") ? latestResult.program : "General Studies"
          });

          console.log("Guest profile response:", guestResponse.data);

          if (guestResponse.data.success && guestResponse.data.shareId) {
            setShareId(guestResponse.data.shareId);
            console.log("Share ID set:", guestResponse.data.shareId);
            setMessage("Analysis complete! Your unique results link is ready. 🎉");
          } else {
            console.error("Guest response missing shareId:", guestResponse.data);
            setMessage("Analysis complete, but failed to generate share link.");
          }
        } catch (guestError) {
          console.error("Guest profile creation error:", guestError);
          console.error("Error response:", guestError.response?.data);
          
          if (guestError.response && guestError.response.status === 404) {
             setMessage("Error: Guest API endpoint not found. Please ensure server/routes/guests.js is created and registered in server/index.js.");
          } else {
             setMessage("Analysis complete, but failed to save results.");
          }
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      if (error.code === "ERR_NETWORK" || error.code === "ECONNREFUSED") {
        setMessage(
          "Cannot connect to the server. Please make sure the backend server is running on port 5000. ❌"
        );
      } else {
        setMessage(error.response?.data?.message || "Upload failed. ❌");
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
    setShareId(null);
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
    if (confidence >= 0.85) return "#059669";
    if (confidence >= 0.65) return "#f59e0b";
    return "#ef4444";
  };
  
  const getConfidenceBg = (confidence) => {
    if (confidence >= 0.85) return "#d1fae5";
    if (confidence >= 0.65) return "#fef3c7";
    return "#fee2e2";
  };

  const getConfidenceTier = (confidence) => {
    if (confidence >= 0.85) return "high";
    if (confidence >= 0.65) return "medium";
    return "low";
  };

  const getConfidenceLabel = (confidence) => {
    const tier = getConfidenceTier(confidence);
    if (tier === "high") return "High Confidence";
    if (tier === "medium") return "Medium Confidence";
    return "Low Confidence";
  };

  const getConfidenceIcon = (confidence) => {
    const tier = getConfidenceTier(confidence);
    if (tier === "high") return "✓";
    if (tier === "medium") return "⚠";
    return "⚠";
  };

  const getMethodLabel = (method) => {
    if (method === "custom_ner") return "ML Model (Raw)";
    if (method === "custom_ner_cleaned") return "ML Model (Cleaned)";
    if (method === "rules") return "Pattern Matching";
    if (method === "spacy_fallback") return "Fallback NER";
    return "Unknown";
  };

  return (
    <div className="page-wrapper">
      <Header navItems={[{ to: "/", label: "Home" }]} />

      <div className="main-content-area">
        <div className="hero-section">
          <div className="hero-badge">
            <HiOutlineDocumentText className="w-8 h-8 text-blue-600" />
            <span className="hero-badge-text">Document Upload & Analysis</span>
          </div>

          <h1 className="hero-title">
            Upload Your Academic Documents
          </h1>

          <p className="hero-description">
            Upload transcripts, essays, or recommendation letters. Our **AI**
            extracts key information to match you with perfect scholarships.
          </p>
        </div>

        <div className="main-card">
          {message && (
            <div className="message-alert" style={{
                background: message.includes("success") || message.includes("complete") || message.includes("ready")
                  ? "#f0fdf4"
                  : message.includes("Error") || message.includes("failed")
                  ? "#fef2f2"
                  : "#eff6ff",
              }}
            >
              <div className="message-content">
                {message.includes("success") || message.includes("complete") || message.includes("ready") ? (
                  <HiCheckCircle className="w-5 h-5 text-green-600 inline" />
                ) : message.includes("Error") || message.includes("failed") ? (
                  <HiXCircle className="w-5 h-5 text-red-600 inline" />
                ) : (
                  <HiOutlineInformationCircle className="w-5 h-5 text-blue-600 inline" />
                )}
                <span style={{ marginLeft: '0.5rem' }}>{message}</span>
              </div>
              {(uploading || extracting) && (
                <div className="progress-bar-container">
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="card-padding">
            <div
              className={`upload-area ${dragOver ? "dragover" : ""}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              style={{
                opacity: uploading ? 0.6 : 1,
                pointerEvents: uploading ? "none" : "auto",
                border: dragOver ? "2px dashed #2563eb" : "2px dashed #d1d5db",
                background: dragOver ? "#f5f3ff" : "#fafafa",
              }}
            >
              <div className="upload-icon-wrapper" style={{
                background: uploading ? "#fef3c7" : "#ede9fe",
              }}>
                {uploading ? (
                  <HiOutlineClock className="w-12 h-12 text-amber-600 animate-pulse" />
                ) : (
                  <HiOutlineCloudArrowUp className="w-12 h-12 text-purple-600" />
                )}
              </div>

              <h3 className="upload-title">
                {uploading
                  ? "Processing your documents..."
                  : "Drop files here or click to browse"}
              </h3>

              <p className="upload-specs-text">
                Supported: PDF, DOC, DOCX, JPG, PNG, GIF
                <br />
                <span className="upload-max-size">
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

            {files.length > 0 && (
              <div className="selected-files-section">
                <div className="selected-files-header">
                  <h3 className="selected-files-title">
                    Selected Files
                    <span className="file-count-badge">
                      {files.length}
                    </span>
                  </h3>
                  {!uploading && (
                    <button
                      onClick={clearAll}
                      className="btn-clear-all"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="file-list">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="file-item"
                    >
                      <div className="file-info-group">
                        <div className="file-icon-square">
                          <HiOutlineDocumentText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="file-details">
                          <div className="file-name">{file.name}</div>
                          <div className="file-size">
                            {formatFileSize(file.size)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="btn-remove-file"
                        disabled={uploading}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="upload-button-container">
              <button
                onClick={uploadFiles}
                disabled={uploading || files.length === 0}
                className="btn-upload-extract"
              >
                {uploading ? (
                  extracting ? (
                    <>
                      <HiMagnifyingGlass className="w-5 h-5 inline" />
                      <span style={{ marginLeft: '0.5rem' }}>Extracting Data...</span>
                    </>
                  ) : (
                    <span>Uploading...</span>
                  )
                ) : (
                  <>
                    <HiOutlineRocketLaunch className="w-5 h-5 inline" />
                    <span style={{ marginLeft: '0.5rem' }}>
                      Upload & Extract {files.length} File{files.length !== 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </button>
            </div>

            {extractedData.length > 0 && (
              <div className="extracted-data-section">
                <h3 className="extracted-data-title">
                  <HiOutlineCursorArrowRays className="w-6 h-6 inline text-blue-600" />
                  <span style={{ marginLeft: '0.5rem' }}>Extracted Information</span>
                </h3>

                {extractedData
                  .filter(
                    (data) => data && typeof data === "object" && data.fileName
                  )
                  .map((data, index) => (
                    <div
                      key={`${data.fileName}-${index}`}
                      className="extraction-card"
                    >
                      <div className="extraction-card-header">
                        <div className="file-icon-square">
                          <HiOutlineDocumentText className="w-5 h-5 text-blue-600" />
                        </div>
                        <h4 className="extraction-file-name">
                          {data.fileName}
                        </h4>
                      </div>

                      {data.error && (
                        <div className="extraction-error-alert">
                          <HiExclamationTriangle className="w-5 h-5 text-amber-600 inline" />
                          <span className="error-text" style={{ marginLeft: '0.5rem' }}>{data.error}</span>
                        </div>
                      )}

                      <div className="extracted-data-grid">
                        {[
                          {
                            label: "Name",
                            value: data.name,
                            confidence: data.confidence?.name,
                            method: data.extractionMethods?.name,
                            icon: <HiOutlineUser className="w-5 h-5 text-gray-600" />,
                          },
                          {
                            label: "CGPA",
                            value: data.cgpa,
                            confidence: data.confidence?.cgpa,
                            method: data.extractionMethods?.cgpa,
                            icon: <HiOutlineChartBarSquare className="w-5 h-5 text-gray-600" />,
                          },
                          {
                            label: "Program",
                            value: data.program,
                            confidence: data.confidence?.program,
                            method: data.extractionMethods?.program,
                            icon: <FaGraduationCap className="w-5 h-5 text-gray-600" />,
                          },
                        ].map((item, idx) => (
                          <div
                            key={idx}
                            className="data-field-card"
                            style={{
                                border: `1px solid ${getConfidenceBg(item.confidence)}`,
                                background: getConfidenceBg(item.confidence) === "#fee2e2" ? "#fef7f7" : getConfidenceBg(item.confidence),
                            }}
                          >
                            <div className="data-field-header">
                              <span className="data-field-icon">
                                {item.icon}
                              </span>
                              <label className="data-field-label">
                                {item.label}
                              </label>
                            </div>

                            <div className="data-field-value-group">
                                <span className="data-field-value">
                                {item.value || "Not found"}
                                </span>
                                {item.confidence > 0 && (
                                    <span className="confidence-badge" style={{
                                        backgroundColor: getConfidenceColor(item.confidence),
                                    }}>
                                        {getConfidenceIcon(item.confidence)}{" "}
                                        {Math.round(item.confidence * 100)}%
                                    </span>
                                )}
                            </div>
                            
                            {item.confidence > 0 && (
                                <div className="confidence-details">
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
                                {item.confidence < 0.65 && (
                                    <div className="verification-required-text">
                                    <HiExclamationTriangle className="w-4 h-4 inline text-amber-600" />
                                    <span style={{ marginLeft: '0.25rem' }}>Please verify manually</span>
                                    </div>
                                )}
                                </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {data.confidence?.overall > 0 && (
                        <div className="overall-quality-banner" style={{
                            background: getConfidenceBg(data.confidence.overall),
                            border: `1px solid ${getConfidenceColor(data.confidence.overall)}`,
                          }}>
                          <div className="quality-content">
                            <div className="quality-indicator">
                              {data.qualityTier === "high" ? (
                                <HiCheckCircle className="w-5 h-5 text-green-600 inline" />
                              ) : data.qualityTier === "medium" ? (
                                <HiExclamationTriangle className="w-5 h-5 text-amber-600 inline" />
                              ) : (
                                <HiXCircle className="w-5 h-5 text-red-600 inline" />
                              )}
                              <span className="quality-text" style={{ marginLeft: '0.5rem' }}>
                                Overall Quality:{" "}
                                {getConfidenceLabel(data.confidence.overall)}
                              </span>
                            </div>
                            <span className="quality-percentage">
                              {Math.round(data.confidence.overall * 100)}%
                            </span>
                          </div>
                          <div className="progress-bar-overall">
                            <div className="progress-bar-fill-overall" style={{
                                width: `${Math.round(data.confidence.overall * 100)}%`,
                                backgroundColor: getConfidenceColor(data.confidence.overall),
                            }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                <div className="upload-more-container">
                  <button
                    className="btn-upload-more"
                    onClick={() => {
                      setFiles([]);
                      setExtractedData([]);
                      setMessage("");
                      setShareId(null);
                    }}
                  >
                    <HiOutlineCloudArrowUp className="w-5 h-5 inline" />
                    <span style={{ marginLeft: '0.5rem' }}>Upload More Files</span>
                  </button>
                </div>
                
                {/* Move the success CTA inside the extracted data section */}
                {shareId && (
                  <div className="success-cta-card">
                    <div className="success-icon">
                      <HiSparkles className="w-12 h-12 text-green-600" />
                    </div>
                    <h3 className="success-title">
                      Documents processed successfully!
                    </h3>
                    <p className="success-description">
                      Your unique results link is ready. You can access your matches anytime with this link.
                    </p>
                    <div className="share-link-box" style={{
                      background: "white",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #bbf7d0",
                      margin: "1rem 0",
                      fontFamily: "monospace",
                      color: "#166534"
                    }}>
                      dreamfund.com/results/{shareId}
                    </div>
                    <button
                      onClick={() => navigate(`/results/${shareId}`)}
                      className="btn-view-matches"
                    >
                      <HiMagnifyingGlass className="w-5 h-5 inline" />
                      <span style={{ marginLeft: '0.5rem' }}>View Scholarship Matches</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .page-wrapper {
          min-height: 100vh;
          background: #f8fafc;
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        .main-content-area {
          max-width: 1000px;
          margin: 0 auto;
          padding: 3rem 2rem 5rem 2rem;
        }

        .hero-section {
          text-align: center;
          margin-bottom: 4rem;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #eef2ff;
          border-radius: 50px;
          margin-bottom: 1.5rem;
        }

        .hero-badge-icon {
          font-size: 1rem;
        }

        .hero-badge-text {
          font-size: 0.875rem;
          color: #4f46e5;
          font-weight: 600;
          letter-spacing: 0.01em;
        }

        .hero-title {
          font-size: 2.75rem;
          font-weight: 800;
          color: #111827;
          margin-bottom: 1rem;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }

        .hero-description {
          font-size: 1.125rem;
          color: #6b7280;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
        }
        
        .main-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
        }

        .card-padding {
            padding: 2.5rem;
        }
        
        .message-alert {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          border-radius: 16px 16px 0 0;
        }
        
        .message-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .message-icon {
          font-size: 1.25rem;
        }
        
        .message-text {
          font-weight: 600;
          font-size: 0.95rem;
        }

        .progress-bar-container {
            margin-top: 0.75rem;
        }
        
        .progress-bar-track {
          width: 100%;
          height: 4px;
          background-color: #e5e7eb;
          border-radius: 2px;
          overflow: hidden;
        }
        
        .progress-bar-fill {
          width: 100%;
          height: 100%;
          background-color: #2563eb;
          border-radius: 2px;
          animation: pulse-progress 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse-progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }

        .upload-area {
          border-radius: 12px;
          padding: 3rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .upload-area.dragover {
            transform: scale(1.02);
            box-shadow: 0 0 0 4px #bfdbfe;
        }

        .upload-icon-wrapper {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          transition: background 0.2s;
        }

        .upload-icon {
          font-size: 2rem;
        }

        .upload-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 0.5rem;
        }

        .upload-specs-text {
          color: #6b7280;
          font-size: 0.95rem;
          margin: 0;
          line-height: 1.6;
        }

        .upload-max-size {
          font-size: 0.85rem;
          opacity: 0.8;
          display: block;
          margin-top: 0.25rem;
        }
        
        .selected-files-section {
            margin-top: 2rem;
        }

        .selected-files-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }

        .selected-files-title {
            font-size: 1.125rem;
            font-weight: 700;
            color: #111827;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .file-count-badge {
            background: #f3f4f6;
            color: #4b5563;
            padding: 0.25rem 0.625rem;
            border-radius: 12px;
            font-size: 0.875rem;
            font-weight: 500;
        }

        .btn-clear-all {
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
            background: white;
            color: #dc2626;
            border: 1px solid #fecaca;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s ease;
        }

        .btn-clear-all:hover {
            background: #fef2f2;
            border-color: #fca5a5;
        }

        .file-list {
            display: grid;
            gap: 0.75rem;
        }

        .file-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            background: #fafafa;
            border-radius: 10px;
            border: 1px solid #e5e7eb;
            transition: all 0.2s ease;
        }

        .file-info-group {
            display: flex;
            align-items: center;
            gap: 1rem;
            flex: 1;
            min-width: 0;
        }

        .file-icon-square {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            background: #ede9fe;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            flex-shrink: 0;
        }
        
        .file-details {
            flex: 1;
            min-width: 0;
        }

        .file-name {
            font-weight: 600;
            color: #111827;
            font-size: 0.95rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .file-size {
            font-size: 0.85rem;
            color: #6b7280;
            margin-top: 0.125rem;
        }

        .btn-remove-file {
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
            background: white;
            color: #dc2626;
            border: 1px solid #fecaca;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s ease;
            flex-shrink: 0;
        }

        .btn-remove-file:not([disabled]):hover {
            background: #fef2f2;
        }

        .upload-button-container {
            margin-top: 2.5rem;
            text-align: center;
        }

        .btn-upload-extract {
            padding: 1rem 2.5rem;
            font-size: 1rem;
            font-weight: 700;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);
            opacity: 1;
        }

        .btn-upload-extract:not([disabled]):hover {
            background: #1d4ed8;
            transform: translateY(-3px);
            box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
        }

        .btn-upload-extract[disabled] {
            cursor: not-allowed;
            background: #9ca3af;
            box-shadow: none;
            transform: translateY(0);
        }
        
        .extracted-data-section {
          margin-top: 3.5rem;
          padding-top: 2rem;
          border-top: 1px solid #e5e7eb;
        }

        .extracted-data-title {
            font-size: 1.375rem;
            font-weight: 700;
            color: #111827;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .extraction-card {
            margin-bottom: 2rem;
            padding: 1.5rem;
            background: #f9fafb;
            border-radius: 16px;
            border: 1px solid #e5e7eb;
        }

        .extraction-card-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
        }

        .extraction-file-name {
            margin: 0;
            color: #111827;
            font-size: 1.15rem;
            font-weight: 700;
        }

        .extraction-error-alert {
            color: #991b1b;
            font-size: 0.95rem;
            margin-bottom: 1.25rem;
            padding: 0.875rem;
            background: #fef2f2;
            border-radius: 8px;
            border: 1px solid #fecaca;
            display: flex;
            align-items: center;
            gap: 0.625rem;
            font-weight: 500;
        }
        
        .error-icon {
            font-size: 1.1rem;
        }

        .extracted-data-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
        }
        
        .data-field-card {
            padding: 1.25rem;
            background: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
            transition: border-color 0.2s;
        }

        .data-field-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
        }
        
        .data-field-icon {
            font-size: 1rem;
        }

        .data-field-label {
            font-size: 0.8rem;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .data-field-value-group {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex-wrap: wrap;
        }

        .data-field-value {
            font-weight: 700;
            color: #111827;
            font-size: 1rem;
        }

        .confidence-badge {
            font-size: 0.7rem;
            padding: 0.25rem 0.625rem;
            border-radius: 12px;
            color: white;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }

        .confidence-details {
            font-size: 0.7rem;
            color: #6b7280;
            margin-top: 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            padding-top: 0.75rem;
            border-top: 1px dashed #e5e7eb;
        }

        .confidence-details strong {
            color: #4b5563;
            font-weight: 600;
        }

        .verification-required-text {
            color: #dc2626;
            font-weight: 700;
            margin-top: 0.25rem;
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }

        .overall-quality-banner {
            margin-top: 2rem;
            padding: 1rem;
            border-radius: 10px;
            position: relative;
            overflow: hidden;
        }

        .quality-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 0.5rem;
            position: relative;
            z-index: 1;
        }

        .quality-indicator {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .quality-icon {
            font-size: 1.1rem;
        }
        
        .quality-text {
            font-weight: 700;
            color: #111827;
            font-size: 1rem;
        }

        .quality-percentage {
            font-size: 1rem;
            font-weight: 700;
            color: #111827;
        }
        
        .progress-bar-overall {
            height: 6px;
            width: 100%;
            background: rgba(255, 255, 255, 0.4);
            border-radius: 3px;
            margin-top: 0.75rem;
            overflow: hidden;
            position: relative;
            z-index: 1;
        }

        .progress-bar-fill-overall {
            height: 100%;
            border-radius: 3px;
            transition: width 0.5s ease-out;
        }

        .upload-more-container {
          text-align: center;
          margin-top: 2rem;
        }
        
        .btn-upload-more {
          padding: 0.875rem 1.75rem;
          background: white;
          color: #6b7280;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .btn-upload-more:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .success-cta-card {
            margin-top: 2.5rem;
            padding: 2.5rem;
            background: #f0fdf4;
            border-radius: 16px;
            border: 1px solid #bbf7d0;
            text-align: center;
        }

        .success-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }

        .success-title {
            font-size: 1.75rem;
            font-weight: 800;
            color: #166534;
            margin-bottom: 0.75rem;
            letter-spacing: -0.01em;
        }

        .success-description {
            color: #15803d;
            margin-bottom: 1.75rem;
            font-size: 1.125rem;
            line-height: 1.75;
        }
        
        .btn-view-matches {
            padding: 1rem 2.5rem;
            background: #2563eb;
            color: white;
            text-decoration: none;
            border-radius: 10px;
            display: inline-block;
            font-size: 1rem;
            font-weight: 700;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);
            border: none;
            cursor: pointer;
        }

        .btn-view-matches:hover {
            background: #1d4ed8;
            transform: translateY(-3px);
            box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
        }

        @media (max-width: 768px) {
          .main-content-area {
            padding: 2rem 1rem 4rem 1rem;
          }
          
          .hero-title {
              font-size: 2rem;
          }
          
          .card-padding {
              padding: 1.5rem;
          }

          .extracted-data-grid {
              grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default UploadPage;