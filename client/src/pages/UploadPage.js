"use client";

import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { FaGraduationCap } from "react-icons/fa";
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
  HiSparkles,
  HiOutlineArrowUpTray,
  HiOutlineTrash,
} from "react-icons/hi2";

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

    // Only allow 1 PDF file
    if (fileArray.length > 1) {
      setMessage("Please select only one transcript file at a time.");
      return;
    }

    const allowedTypes = ["application/pdf"];
    const maxSize = 10 * 1024 * 1024; // 10MB

    const validFiles = fileArray.filter((file) => {
      if (!allowedTypes.includes(file.type)) {
        setMessage(
          `Invalid file type: ${file.name}. Only PDF files are allowed for transcript uploads.`
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
      setFiles(validFiles); // Replace existing file instead of adding
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
      // Step 1: Upload files
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

      // Step 2: Extract data
      setExtracting(true);
      setMessage("AI Analysis in progress...");

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

      setExtractedData(validResults);

      const serviceUnavailable = validResults.some(
        (result) =>
          result.error && result.error.includes("Python extraction service")
      );

      if (serviceUnavailable) {
        setMessage(
          "Files uploaded but extraction service is unavailable. Please start the Python extraction service on port 5001."
        );
      } else if (validResults.length > 0) {
        // Step 3: Create Guest Profile
        const latestResult = validResults[validResults.length - 1];

        try {
          const guestResponse = await axios.post(
            "http://localhost:5000/api/guests/create",
            {
              name:
                latestResult.name !== "Not found" &&
                latestResult.name !== "Extraction failed" &&
                latestResult.name !== "Service unavailable"
                  ? latestResult.name
                  : "Student",
              cgpa:
                latestResult.cgpa !== "Not found" &&
                latestResult.cgpa !== "Extraction failed" &&
                latestResult.cgpa !== "Service unavailable"
                  ? latestResult.cgpa
                  : 0,
              program:
                latestResult.program !== "Not found" &&
                latestResult.program !== "Extraction failed" &&
                latestResult.program !== "Service unavailable"
                  ? latestResult.program
                  : "General Studies",
            }
          );

          if (guestResponse.data.success && guestResponse.data.shareId) {
            setShareId(guestResponse.data.shareId);
            setMessage(
              "Analysis successful. Your scholarship matches are ready."
            );
          } else {
            setMessage("Analysis complete, but failed to generate share link.");
          }
        } catch (guestError) {
          setMessage("Analysis complete, but failed to save results.");
        }
      }
    } catch (error) {
      if (error.code === "ERR_NETWORK" || error.code === "ECONNREFUSED") {
        setMessage("Cannot connect to the server. Is backend running?");
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

  // Modern Color Palette
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.85) return "#10b981"; // Emerald 500
    if (confidence >= 0.65) return "#f59e0b"; // Amber 500
    return "#ef4444"; // Red 500
  };

  const getConfidenceBg = (confidence) => {
    if (confidence >= 0.85) return "#ecfdf5"; // Emerald 50
    if (confidence >= 0.65) return "#fffbeb"; // Amber 50
    return "#fef2f2"; // Red 50
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.85) return "High";
    if (confidence >= 0.65) return "Medium";
    return "Low";
  };

  const getMethodLabel = (method) => {
    if (method === "custom_ner") return "AI Model";
    if (method === "custom_ner_cleaned") return "AI Model (Cleaned)";
    if (method === "rules") return "Rules Engine";
    if (method === "spacy_fallback") return "NLP Fallback";
    return "Unknown";
  };

  return (
    <div className="page-wrapper">
      <Header navItems={[{ to: "/", label: "Home" }]} />

      <div className="main-container">
        {/* Header Section */}
        <div className="header-section fade-in-up">
          <div className="badge-pill">
            <HiOutlineDocumentText className="w-4 h-4" />
            <span>Document Analysis</span>
          </div>
          <h1 className="hero-heading">Upload Your Transcript</h1>
          <p className="hero-subheading">
            Our AI will scan your academic records to instantly find your GPA,
            Program, and eligibility for scholarships.
          </p>
        </div>

        {/* Main Card */}
        <div className="content-card fade-in-up delay-100">
          {/* Status Message Bar */}
          {message && (
            <div
              className={`status-bar ${
                message.includes("success") || message.includes("complete")
                  ? "success"
                  : message.includes("Error") || message.includes("failed")
                  ? "error"
                  : "info"
              }`}
            >
              <div className="status-icon">
                {message.includes("success") || message.includes("complete") ? (
                  <HiCheckCircle className="w-5 h-5" />
                ) : message.includes("Error") || message.includes("failed") ? (
                  <HiXCircle className="w-5 h-5" />
                ) : (
                  <HiOutlineInformationCircle className="w-5 h-5" />
                )}
              </div>
              <span>{message}</span>
            </div>
          )}

          {/* Progress Bar */}
          {(uploading || extracting) && (
            <div className="progress-container">
              <div className="progress-bar"></div>
            </div>
          )}

          <div className="card-body">
            {/* Upload Zone */}
            <div
              className={`upload-zone ${dragOver ? "drag-active" : ""} ${
                uploading ? "disabled" : ""
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <div
                className={`icon-circle ${
                  uploading ? "animate-pulse-soft" : ""
                }`}
              >
                {uploading ? (
                  <HiOutlineClock className="w-8 h-8 text-amber-600" />
                ) : (
                  <HiOutlineArrowUpTray className="w-8 h-8 text-blue-600" />
                )}
              </div>

              <div className="upload-text-group">
                <h3>
                  {uploading ? (
                    extracting ? (
                      "Analyzing Document..."
                    ) : (
                      "Uploading..."
                    )
                  ) : (
                    <span>
                      <span className="link-text">Click to upload</span> or drag
                      and drop
                    </span>
                  )}
                </h3>
                <p>PDF only (Max 10MB)</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileSelect(e.target.files)}
                style={{ display: "none" }}
                disabled={uploading}
              />
            </div>

            {/* Selected Files List */}
            {files.length > 0 && (
              <div className="file-list-section fade-in">
                <div className="section-header">
                  <h4>Attached Files</h4>
                  {!uploading && (
                    <button onClick={clearAll} className="btn-text">
                      Remove All
                    </button>
                  )}
                </div>
                <div className="file-items">
                  {files.map((file, index) => (
                    <div key={index} className="file-row">
                      <div className="file-icon">
                        <HiOutlineDocumentText className="w-6 h-6 text-blue-500" />
                      </div>
                      <div className="file-meta">
                        <span className="name">{file.name}</span>
                        <span className="size">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      {!uploading && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          className="btn-icon"
                        >
                          <HiOutlineTrash className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Primary Action Button */}
                <button
                  onClick={uploadFiles}
                  disabled={uploading}
                  className="btn-primary"
                >
                  {uploading ? (
                    <>
                      <div className="spinner-sm"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <HiOutlineRocketLaunch className="w-5 h-5" />
                      <span>Start Analysis</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        {extractedData.length > 0 && (
          <div className="results-container fade-in-up delay-200">
            <h2 className="section-title">
              <HiOutlineCursorArrowRays className="w-6 h-6 text-blue-600" />
              Extraction Results
            </h2>

            {extractedData.map((data, index) => (
              <div key={index} className="result-card">
                {/* Result Header */}
                <div className="result-header">
                  <div className="file-identifier">
                    <HiOutlineDocumentText className="w-5 h-5 text-gray-500" />
                    <span>{data.fileName}</span>
                  </div>
                  {data.confidence?.overall > 0 && (
                    <div
                      className="score-pill"
                      style={{
                        backgroundColor: getConfidenceBg(
                          data.confidence.overall
                        ),
                        color: getConfidenceColor(data.confidence.overall),
                        borderColor: getConfidenceColor(
                          data.confidence.overall
                        ),
                      }}
                    >
                      <span className="score-val">
                        {Math.round(data.confidence.overall * 100)}%
                      </span>
                      <span className="score-label">Accuracy Score</span>
                    </div>
                  )}
                </div>

                {/* Data Grid */}
                <div className="data-grid">
                  {[
                    {
                      label: "Student Name",
                      value: data.name,
                      conf: data.confidence?.name,
                      method: data.extractionMethods?.name,
                      icon: <HiOutlineUser />,
                    },
                    {
                      label: "CGPA",
                      value: data.cgpa,
                      conf: data.confidence?.cgpa,
                      method: data.extractionMethods?.cgpa,
                      icon: <HiOutlineChartBarSquare />,
                    },
                    {
                      label: "Program",
                      value: data.program,
                      conf: data.confidence?.program,
                      method: data.extractionMethods?.program,
                      icon: <FaGraduationCap />,
                    },
                  ].map((item, i) => (
                    <div key={i} className="data-box">
                      <div className="data-box-header">
                        <span className="icon-wrapper">{item.icon}</span>
                        <span className="label">{item.label}</span>
                      </div>
                      <div className="data-value">
                        {item.value || "Not Found"}
                      </div>
                      <div className="data-footer">
                        <div
                          className="conf-dot"
                          style={{
                            backgroundColor: getConfidenceColor(item.conf),
                          }}
                        ></div>
                        <span>
                          {getConfidenceLabel(item.conf)} Confidence
                          {/* ONLY show method if it exists and is valid */}
                          {item.method &&
                          getMethodLabel(item.method) !== "Unknown"
                            ? ` (${getMethodLabel(item.method)})`
                            : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {data.error && (
                  <div className="error-banner">
                    <HiExclamationTriangle className="w-5 h-5" />
                    {data.error}
                  </div>
                )}
              </div>
            ))}

            {/* Success / Next Steps CTA */}
            {shareId && (
              <div className="success-card fade-in-up">
                <div className="success-content">
                  <div className="success-icon-lg">
                    <HiSparkles />
                  </div>
                  <h3>Ready for Scholarships!</h3>
                  <p>
                    We've matched your profile with our database. View your
                    matches now.
                  </p>
                  <button
                    onClick={() => navigate(`/results/${shareId}`)}
                    className="btn-success-lg"
                  >
                    View Scholarship Matches
                  </button>
                  <div className="share-link">
                    dreamfund.com/results/{shareId}
                  </div>
                </div>
              </div>
            )}

            <button onClick={clearAll} className="btn-secondary-outline">
              Upload Another Document
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        /* Global & Reset */
        .page-wrapper {
          min-height: 100vh;
          background: radial-gradient(
              at 0% 0%,
              hsla(253, 16%, 7%, 1) 0,
              transparent 50%
            ),
            radial-gradient(
              at 50% 0%,
              hsla(225, 39%, 30%, 1) 0,
              transparent 50%
            ),
            radial-gradient(
              at 100% 0%,
              hsla(339, 49%, 30%, 1) 0,
              transparent 50%
            );
          background-color: #f8fafc;
          background-image: radial-gradient(
              at top left,
              #eff6ff 0%,
              transparent 40%
            ),
            radial-gradient(at bottom right, #f0fdf4 0%, transparent 40%);
          font-family: "Inter", sans-serif;
          color: #1e293b;
          padding-bottom: 4rem;
        }

        .main-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
        }

        /* Animations */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .fade-in-up {
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        .delay-100 {
          animation-delay: 0.1s;
        }
        .delay-200 {
          animation-delay: 0.2s;
        }
        @keyframes pulseSoft {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(0.95);
            opacity: 0.8;
          }
        }
        .animate-pulse-soft {
          animation: pulseSoft 2s infinite;
        }

        /* Header */
        .header-section {
          text-align: center;
          margin-bottom: 3rem;
        }
        .badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.35rem 1rem;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          color: #2563eb;
          font-weight: 600;
          font-size: 0.875rem;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
          margin-bottom: 1.5rem;
        }
        .hero-heading {
          font-size: 2.5rem;
          font-weight: 800;
          letter-spacing: -0.025em;
          color: #0f172a;
          margin-bottom: 1rem;
          background: -webkit-linear-gradient(135deg, #60a5fa 0%, #2563eb 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-subheading {
          font-size: 1.125rem;
          color: #64748b;
          line-height: 1.6;
          max-width: 500px;
          margin: 0 auto;
        }

        /* Content Card */
        .content-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          border: 1px solid white;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05),
            0 8px 10px -6px rgba(0, 0, 0, 0.01);
          overflow: hidden;
        }

        /* Status Bar */
        .status-bar {
          padding: 0.75rem 1.5rem;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 500;
        }
        .status-bar.info {
          background: #eff6ff;
          color: #1e40af;
        }
        .status-bar.success {
          background: #f0fdf4;
          color: #166534;
        }
        .status-bar.error {
          background: #fef2f2;
          color: #991b1b;
        }

        /* Progress Line */
        .progress-container {
          height: 3px;
          background: #e2e8f0;
          width: 100%;
          overflow: hidden;
        }
        .progress-bar {
          height: 100%;
          width: 50%;
          background: #2563eb;
          animation: loadingMove 1.5s infinite ease-in-out;
        }
        @keyframes loadingMove {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }

        .card-body {
          padding: 2rem;
        }

        /* Upload Zone */
        .upload-zone {
          border: 2px dashed #cbd5e1;
          border-radius: 16px;
          padding: 3rem 1.5rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #f8fafc;
        }
        .upload-zone:hover:not(.disabled) {
          border-color: #2563eb;
          background: #eff6ff;
        }
        .upload-zone.drag-active {
          border-color: #2563eb;
          background: #eff6ff;
          transform: scale(0.99);
        }
        .upload-zone.disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .icon-circle {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .upload-text-group h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }
        .link-text {
          color: #2563eb;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .upload-text-group p {
          color: #94a3b8;
          font-size: 0.875rem;
        }

        /* File List */
        .file-list-section {
          margin-top: 2rem;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .section-header h4 {
          font-size: 0.95rem;
          font-weight: 600;
          color: #334155;
        }
        .btn-text {
          background: none;
          border: none;
          color: #ef4444;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
        }

        .file-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          margin-bottom: 1rem;
        }
        .file-icon {
          padding: 0.5rem;
          background: #eff6ff;
          border-radius: 8px;
        }
        .file-meta {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .file-meta .name {
          font-size: 0.9rem;
          font-weight: 600;
          color: #1e293b;
        }
        .file-meta .size {
          font-size: 0.8rem;
          color: #64748b;
        }
        .btn-icon {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0.25rem;
          transition: color 0.2s;
        }
        .btn-icon:hover {
          color: #ef4444;
        }

        /* Primary Button */
        .btn-primary {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);
        }
        .btn-primary:hover:not(:disabled) {
          background: #1d4ed8;
          transform: translateY(-1px);
        }
        .btn-primary:disabled {
          background: #94a3b8;
          cursor: not-allowed;
          box-shadow: none;
        }
        .spinner-sm {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Results Section */
        .results-container {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid #e2e8f0;
        }
        .section-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .result-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
          overflow: hidden;
          margin-bottom: 2rem;
        }

        .result-header {
          padding: 1rem 1.5rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .file-identifier {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: #475569;
        }

        .score-pill {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0.75rem;
          border-radius: 99px;
          border: 1px solid;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .data-grid {
          padding: 1.5rem;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .data-box {
          background: #fff;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
        }

        .data-box-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        .icon-wrapper {
          color: #64748b;
          font-size: 1.1rem;
        }
        .label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          font-weight: 600;
        }
        .data-value {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 1rem;
        }
        .data-footer {
          margin-top: auto;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #64748b;
        }
        .conf-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .error-banner {
          margin: 0 1.5rem 1.5rem;
          padding: 1rem;
          background: #fef2f2;
          color: #991b1b;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 500;
        }

        /* Success Card */
        .success-card {
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 20px;
          padding: 2.5rem;
          color: white;
          text-align: center;
          margin-bottom: 2rem;
          box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);
        }
        .success-icon-lg {
          font-size: 3rem;
          margin-bottom: 1rem;
          color: #d1fae5;
        }
        .success-content h3 {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
        }
        .success-content p {
          color: #d1fae5;
          margin-bottom: 2rem;
        }
        .btn-success-lg {
          background: white;
          color: #059669;
          border: none;
          padding: 1rem 2rem;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .btn-success-lg:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
        }
        .share-link {
          margin-top: 1.5rem;
          font-family: monospace;
          background: rgba(0, 0, 0, 0.1);
          padding: 0.5rem;
          border-radius: 6px;
          font-size: 0.9rem;
          display: inline-block;
        }

        .btn-secondary-outline {
          width: 100%;
          padding: 1rem;
          background: transparent;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-weight: 600;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-secondary-outline:hover {
          background: white;
          border-color: #94a3b8;
          color: #1e293b;
        }

        @media (max-width: 640px) {
          .hero-heading {
            font-size: 2rem;
          }
          .data-grid {
            grid-template-columns: 1fr;
          }
          .card-body {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default UploadPage;
