"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useScholarships } from "../../contexts/ScholarshipContext";
import AdminLayout from "../../components/AdminLayout";
import { 
  HiOutlineDocumentText,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineChartBarSquare,
  HiOutlineClock,
  HiExclamationTriangle,
  HiOutlineCalendar
} from 'react-icons/hi2';
import { FaGraduationCap } from 'react-icons/fa';

const ScholarshipManagement = () => {
  const { user, logout } = useAuth();
  const {
    scholarships,
    createScholarship,
    updateScholarship,
    deleteScholarship,
    fetchScholarships,
  } = useScholarships();

  const [showForm, setShowForm] = useState(false);
  const [editingScholarship, setEditingScholarship] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    deadline: "",
    studyLevels: [],
    requirements: {
      minGPA: "",
      maxAge: "",
      majors: "", // Changed to string for input handling
      financialNeed: "any",
      extracurriculars: "", // Changed to string
      achievements: "", // Changed to string
    },
    provider: {
      name: "",
      contact: "",
      website: "",
    },
    status: "active",
    eligibleCourses: "", // Changed to string
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState("");
  const [scrapeProgress, setScrapeProgress] = useState({
    current: 0,
    total: 0,
    currentScholarship: "",
  });
  const [eventSource, setEventSource] = useState(null);
  const [scrapingStats, setScrapingStats] = useState(null);

  // Memoized fetch function for useEffect dependency
  const stableFetchScholarships = useCallback(fetchScholarships, []);

  useEffect(() => {
    stableFetchScholarships();
  }, [stableFetchScholarships]);

  // Fetch scraping stats on mount
  useEffect(() => {
    const fetchScrapingStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/scholarships/scraping-stats", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (data.success && data.data) {
          setScrapingStats(data.data);
        }
      } catch (error) {
        console.error("Error fetching scraping stats:", error);
      }
    };
    fetchScrapingStats();
  }, []);

  // Cleanup event source on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  // Utility to parse deadline strings
  const tryParseDeadline = (value) => {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value === "number") {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof value === "string") {
      try {
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  // Format duration in human-readable format
  const formatDuration = (seconds) => {
    if (!seconds) return "0s";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(" ");
  };

  // Get stats to display (live or last session)
  const getDisplayStats = () => {
    // If scraping is active, show live stats
    if (scrapeLoading && scrapeProgress.total > 0) {
      const totalProcessed = scrapeProgress.current;
      const successCount = (scrapeProgress.savedCount || 0) + (scrapeProgress.updatedCount || 0);
      const failedCount = scrapeProgress.failedCount || 0;
      const successRate = totalProcessed > 0 ? (successCount / totalProcessed) * 100 : 0;
      const startTime = scrapeProgress.startTime ? new Date(scrapeProgress.startTime) : null;
      const duration = startTime ? Math.floor((new Date() - startTime) / 1000) : 0;
      
      return {
        totalProcessed,
        successCount,
        failedCount,
        successRate,
        duration,
        isLive: true
      };
    }
    
    // Otherwise show last completed session
    if (scrapingStats) {
      const successRate = scrapingStats.totalProcessed > 0 
        ? (scrapingStats.successCount / scrapingStats.totalProcessed) * 100 
        : 0;
      
      return {
        totalProcessed: scrapingStats.totalProcessed,
        successCount: scrapingStats.successCount,
        failedCount: scrapingStats.failedCount,
        successRate,
        duration: scrapingStats.duration,
        isLive: false
      };
    }
    
    return null;
  };

  // Function to compute display status based on deadline and study levels
  const computeDisplayStatus = (scholarship) => {
    const studyLevels = scholarship.studyLevels || [];
    const studyLevel = scholarship.studyLevel;
    const hasValidStudyLevel =
      studyLevels.includes("degree") ||
      studyLevels.includes("diploma") ||
      studyLevel === "degree" ||
      studyLevel === "diploma";

    if (!hasValidStudyLevel) {
      return "draft";
    }

    const deadlineValue = scholarship.deadline || scholarship.extractedDeadline;
    const deadlineDate = tryParseDeadline(deadlineValue);

    if (deadlineDate) {
      const now = new Date();
      const todayMidnightUtc = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );
      const dl = new Date(
        Date.UTC(
          deadlineDate.getUTCFullYear(),
          deadlineDate.getUTCMonth(),
          deadlineDate.getUTCDate()
        )
      );
      if (dl.getTime() < todayMidnightUtc.getTime()) return "inactive"; // Inactive if expired
    }

    return String(scholarship.status || "active").toLowerCase() === "inactive"
      ? "inactive"
      : "active";
  };

  // Function to calculate counts for filter buttons
  const getFilteredCounts = () => {
      const counts = {
          all: scholarships.length,
          active: 0,
          inactive: 0,
          draft: 0,
          expired: 0, // Using 'inactive' for display but tracking expired separately for accuracy
      };

      for (const scholarship of scholarships) {
          const status = computeDisplayStatus(scholarship);
          
          if (status === 'active') {
              counts.active++;
          } else if (status === 'inactive') {
              // Check if truly expired (for display accuracy, though the filter uses 'inactive')
              const deadlineDate = tryParseDeadline(scholarship.deadline || scholarship.extractedDeadline);
              const isExpired = deadlineDate && deadlineDate.getTime() < new Date().getTime();
              
              if (isExpired) {
                  counts.inactive++; // Count under the 'inactive' category
              } else {
                  counts.draft++; // Treat as draft if inactive but not expired (manually set inactive)
              }
          } else if (status === 'draft') {
              counts.draft++;
          } else {
              // Fallback
              counts.draft++;
          }
      }
      // Note: The filter buttons will display 'All', 'Active', 'Inactive', 'Draft/Incomplete'
      // The old 'not-eligible' is now mapped to 'draft' in computeDisplayStatus
      
      return counts;
  };
  
  // Scrape cancellation function
  const handleCancelScraping = async () => {
    try {
      // Note: Assumes the local storage token is valid and the API endpoint is correct
      const response = await fetch(
        "http://localhost:5000/api/scholarships/cancel-scraping",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const result = await response.json();
      if (result.success) {
        setScrapeMessage("Cancelling scraping... Please wait.");
        if (eventSource) {
          eventSource.close();
          setEventSource(null);
        }
        setTimeout(() => {
          setScrapeLoading(false);
          setScrapeProgress({ current: 0, total: 0, currentScholarship: "" });
          setScrapeMessage("Scraping cancelled by user");
          fetchScholarships(); // Refresh list to get current state
          setTimeout(() => setScrapeMessage(""), 3000);
        }, 1000);
      } else {
        setScrapeMessage(`Cancel failed: ${result.message}`);
      }
    } catch (error) {
      setScrapeMessage(`Cancel error: ${error.message}`);
    }
  };

  // Scraping function with SSE progress tracking
  const handleScrapeScholarships = async () => {
    setScrapeLoading(true);
    setScrapeMessage("Starting to scrape scholarships...");
    setScrapeProgress({ current: 0, total: 0, currentScholarship: "" });

    try {
      const response = await fetch(
        "http://localhost:5000/api/scholarships/scrape-scholarships",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setScrapeMessage("Scraping started. Monitoring progress...");

        const sseUrl = `http://localhost:5000/api/scholarships/scraping-progress`;
        const es = new EventSource(sseUrl);

        es.onopen = () => {
          console.log("✅ SSE connection opened");
        };

        es.onmessage = (event) => {
          const progress = JSON.parse(event.data);
          setScrapeProgress(progress);

          if (progress.isRunning) {
            setScrapeMessage(
              `Scraping ${progress.current}/${progress.total} scholarships...`
            );
          } else if (progress.current > 0) {
            // Scraping complete
            setScrapeMessage(
              `✅ Scraping completed! Processed ${progress.current}/${progress.total} scholarships`
            );
            setScrapeLoading(false);
            es.close();
            setEventSource(null);

            setTimeout(() => {
              fetchScholarships();
              // Refetch scraping stats after completion
              fetch("/api/scholarships/scraping-stats", {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              })
                .then((res) => res.json())
                .then((data) => {
                  if (data.success && data.data) {
                    setScrapingStats(data.data);
                  }
                })
                .catch((error) =>
                  console.error("Error refetching scraping stats:", error)
                );
            }, 1000);

            setTimeout(() => setScrapeMessage(""), 5000);
          }
        };

        es.onerror = (error) => {
          console.error("❌ SSE error:", error);
          es.close();
          setEventSource(null);
          setScrapeLoading(false);
          setScrapeMessage(
            "⚠️ Connection error. Scraping may still be running. Refresh."
          );
          setTimeout(() => {
            setScrapeMessage("");
            fetchScholarships();
          }, 5000);
        };

        setEventSource(es);
      } else {
        setScrapeMessage(`Scraping failed: ${result.message}`);
        setScrapeLoading(false);
      }
    } catch (error) {
      console.error("Scraping error:", error);
      setScrapeMessage(`Scraping failed: ${error.message}`);
      setScrapeLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      deadline: "",
      studyLevels: [],
      requirements: {
        minGPA: "",
        maxAge: "",
        majors: "",
        financialNeed: "any",
        extracurriculars: "",
        achievements: "",
      },
      provider: {
        name: "",
        contact: "",
        website: "",
      },
      status: "active",
      eligibleCourses: "",
    });
    setEditingScholarship(null);
    setShowForm(false);
    setMessage("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const parseStringToArray = (value) => {
    if (typeof value !== "string") return [];
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const scholarshipData = {
      ...formData,
      // Process comma-separated strings into arrays
      requirements: {
        ...formData.requirements,
        minGPA: Number.parseFloat(formData.requirements.minGPA) || 0,
        majors: parseStringToArray(formData.requirements.majors),
        extracurriculars: parseStringToArray(
          formData.requirements.extracurriculars
        ),
        achievements: parseStringToArray(formData.requirements.achievements),
      },
      eligibleCourses: parseStringToArray(formData.eligibleCourses),

      // Handle study levels
      studyLevels: Array.isArray(formData.studyLevels)
        ? formData.studyLevels
        : [],
      studyLevel: Array.isArray(formData.studyLevels)
        ? formData.studyLevels.includes("degree")
          ? "degree"
          : formData.studyLevels.includes("diploma")
          ? "diploma"
          : null
        : null,
    };

    let result;
    if (editingScholarship) {
      result = await updateScholarship(editingScholarship._id, scholarshipData);
    } else {
      result = await createScholarship(scholarshipData);
    }

    if (result.success) {
      setMessage(
        `Scholarship ${editingScholarship ? "updated" : "created"} successfully! ✅`
      );
      resetForm();
    } else {
      setMessage(result.message);
    }
    setLoading(false);
  };

  const handleEdit = (scholarship) => {
    setFormData({
      title: scholarship.title || "",
      deadline: scholarship.deadline
        ? new Date(scholarship.deadline).toISOString().split("T")[0]
        : "",
      studyLevels: Array.isArray(scholarship.studyLevels)
        ? scholarship.studyLevels
        : [],
      requirements: {
        minGPA: scholarship.requirements?.minGPA?.toString() || "",
        maxAge: scholarship.requirements?.maxAge?.toString() || "",
        majors: (scholarship.requirements?.majors || []).join(", "),
        financialNeed: scholarship.requirements?.financialNeed || "any",
        extracurriculars: (
          scholarship.requirements?.extracurriculars || []
        ).join(", "),
        achievements: (scholarship.requirements?.achievements || []).join(", "),
      },
      provider: {
        name: scholarship.provider?.name || "",
        contact: scholarship.contactEmail || "",
        website: scholarship.provider?.website || "",
      },
      status: scholarship.status || "active",
      eligibleCourses: (scholarship.eligibleCourses || []).join(", "),
    });
    setEditingScholarship(scholarship);
    setShowForm(true);
  };

  const toggleStudyLevel = (level) => {
    setFormData((prev) => {
      const current = new Set(prev.studyLevels || []);
      if (current.has(level)) current.delete(level);
      else current.add(level);
      return { ...prev, studyLevels: Array.from(current) };
    });
  };

  const handleDelete = async (scholarshipId) => {
    if (window.confirm("Are you sure you want to delete this scholarship?")) {
      const result = await deleteScholarship(scholarshipId);
      if (result.success) {
        setMessage("Scholarship deleted successfully! 🗑️");
      } else {
        setMessage(result.message);
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredCounts = getFilteredCounts(); // Calculate counts once
  
  // Filtered and Searchable List
  const filteredScholarships = (scholarships || [])
    .filter((scholarship) => {
      const matchesSearch =
        scholarship.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (scholarship.provider?.name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const currentStatus = computeDisplayStatus(scholarship);
      
      const matchesFilter = filterStatus === "all" || currentStatus === filterStatus;

      // Special handling for the 'draft' filter button in the UI
      if (filterStatus === 'draft') {
          // 'draft' filter button displays scholarships whose status is computed as 'draft'
          return matchesSearch && currentStatus === 'draft';
      } else if (filterStatus === 'inactive') {
          // 'inactive' filter button displays scholarships whose status is computed as 'inactive'
          return matchesSearch && currentStatus === 'inactive';
      }

      return matchesSearch && matchesFilter;
    });

  // Action Bar for AdminLayout
  const headerActions = (
    <div className="header-actions-container">
      {/* Scraping Progress and Buttons */}
      <div className="scrape-control-group">
        <button
          onClick={handleScrapeScholarships}
          disabled={scrapeLoading}
          className={`btn-scrape ${scrapeLoading ? 'btn-scrape-loading' : ''}`}
        >
          {scrapeLoading ? "Scraping..." : "Scrape Scholarships"}
        </button>
        {scrapeLoading && (
          <button
            onClick={handleCancelScraping}
            className="btn-cancel-scrape"
          >
            Cancel
          </button>
        )}
      </div>

      {scrapeLoading && (
        <div className="scrape-progress-panel">
          {scrapeProgress.total > 0 ? (
            <>
              <div className="progress-header">
                <span className="progress-count">
                  {scrapeProgress.current}/{scrapeProgress.total}
                </span>
                <span className="progress-percent">
                  {scrapeProgress.total > 0 ? Math.round((scrapeProgress.current / scrapeProgress.total) * 100) : 0}%
                </span>
              </div>
              <div className="progress-bar-track">
                <div 
                  className="progress-bar-fill" 
                  style={{
                    width: `${scrapeProgress.total > 0 ? (scrapeProgress.current / scrapeProgress.total) * 100 : 0}%`,
                  }} 
                />
              </div>
              {scrapeProgress.currentScholarship && (
                <div className="current-scrape-title">
                  <HiOutlineDocumentText className="w-5 h-5 inline text-blue-600" />
                  <span style={{ marginLeft: '0.5rem' }}>{scrapeProgress.currentScholarship}</span>
                </div>
              )}
            </>
          ) : (
            <div className="progress-initializing">
              <div className="progress-spinner" />
              <span>
                {scrapeProgress.currentScholarship || 'Initializing scraper...'}
              </span>
              <span className="progress-info">
                This may take a few minutes. Please be patient...
              </span>
            </div>
          )}
        </div>
      )}

      {/* Add New Button */}
      <button
        onClick={() => setShowForm(true)}
        className="btn-add-new"
      >
        + Add New Scholarship
      </button>
    </div>
  );
  
  // Filter buttons data (using the pre-calculated counts)
  const filterButtons = [
    { status: "all", label: "All", count: filteredCounts.all },
    { status: "active", label: "Active", count: filteredCounts.active },
    { status: "inactive", label: "Expired/Inactive", count: filteredCounts.inactive },
    { status: "draft", label: "Draft/Incomplete", count: filteredCounts.draft },
  ];

  return (
    <AdminLayout title="Scholarship Management" headerActions={headerActions}>
      {/* Scraping Statistics Cards */}
      {getDisplayStats() ? (
        <div className="stats-grid">
          {/* Total Scholarships Scraped */}
          <div className="stat-card">
            <div className="card-top">
              <HiOutlineDocumentText className="card-icon" />
              <div className="card-value">
                {getDisplayStats().totalProcessed}
              </div>
            </div>
            <div className="card-label">Total Scholarships Scraped</div>
            {getDisplayStats().isLive && (
              <div className="live-indicator">
                <span className="spinner-small"></span> Live
              </div>
            )}
          </div>

          {/* Successful Extractions */}
          <div className="stat-card">
            <div className="card-top">
              <HiOutlineCheckCircle className="card-icon" style={{ color: "#10b981" }} />
              <div className="card-value" style={{ color: "#10b981" }}>
                {getDisplayStats().successCount}
              </div>
            </div>
            <div className="card-label">Successful Extractions</div>
            {getDisplayStats().isLive && (
              <div className="live-indicator">
                <span className="spinner-small"></span> Live
              </div>
            )}
          </div>

          {/* Failed Extractions */}
          <div className="stat-card">
            <div className="card-top">
              <HiOutlineXCircle className="card-icon" style={{ color: "#ef4444" }} />
              <div className="card-value" style={{ color: "#ef4444" }}>
                {getDisplayStats().failedCount}
              </div>
            </div>
            <div className="card-label">Failed Extractions</div>
            {getDisplayStats().isLive && (
              <div className="live-indicator">
                <span className="spinner-small"></span> Live
              </div>
            )}
          </div>

          {/* Success Rate */}
          <div className="stat-card">
            <div className="card-top">
              <HiOutlineChartBarSquare className="card-icon" style={{ color: "#2563eb" }} />
              <div className="card-value" style={{ color: "#2563eb" }}>
                {getDisplayStats().successRate.toFixed(0)}%
              </div>
            </div>
            <div className="card-label">Success Rate</div>
            {getDisplayStats().isLive && (
              <div className="live-indicator">
                <span className="spinner-small"></span> Live
              </div>
            )}
          </div>

          {/* Scraping Duration */}
          <div className="stat-card">
            <div className="card-top">
              <HiOutlineClock className="card-icon" style={{ color: "#f59e0b" }} />
              <div className="card-value" style={{ color: "#f59e0b" }}>
                {formatDuration(getDisplayStats().duration)}
              </div>
            </div>
            <div className="card-label">Scraping Duration</div>
            {getDisplayStats().isLive && (
              <div className="live-indicator">
                <span className="spinner-small"></span> Live
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="no-stats-placeholder">
          <HiOutlineChartBarSquare className="w-12 h-12 text-gray-400" style={{ margin: '0 auto 0.5rem' }} />
          <p>No scraping data yet</p>
          <span style={{ fontSize: "0.9rem", color: "#6b7280" }}>
            Run your first scrape to see statistics
          </span>
        </div>
      )}

      {/* Search and Filters Section */}
      <div className="control-panel">
        <input
          type="text"
          placeholder="Search scholarships by title or provider..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <div className="filter-group">
          {filterButtons.map((btn) => (
            <button
              key={btn.status}
              onClick={() => setFilterStatus(btn.status)}
              className={`filter-button ${filterStatus === btn.status ? "active-filter" : ""}`}
            >
              {btn.label} ({btn.count})
            </button>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {message && (
        <div className="alert-message" style={{
            backgroundColor: message.includes("success") ? "#d1fae5" : "#fee2e2",
            color: message.includes("success") ? "#065f46" : "#991b1b",
        }}>
          {message}
        </div>
      )}

      {/* Scholarship Form (Add/Edit) */}
      {showForm && (
        <div className="form-card">
          <h3 className="form-title">
            {editingScholarship ? "Edit Scholarship" : "Add New Scholarship"}
          </h3>
          <form onSubmit={handleSubmit}>
            {/* General Info */}
            <h4 className="form-section-title">General Information</h4>
            <div className="form-grid">
              <div className="form-group span-2">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  name="title"
                  className="form-input"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Deadline</label>
                <input
                  type="date"
                  name="deadline"
                  className="form-input"
                  value={formData.deadline}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select name="status" className="form-input" value={formData.status} onChange={handleInputChange}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Study Levels */}
            <h4 className="form-section-title">Eligibility</h4>
            <div className="form-grid study-levels-grid">
              <div className="form-group">
                <label className="form-label">Study Levels</label>
                <div className="checkbox-group">
                  {['diploma', 'degree'].map(level => (
                    <label key={level} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={(formData.studyLevels || []).includes(level)}
                        onChange={() => toggleStudyLevel(level)}
                      />
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Minimum GPA</label>
                <input
                  type="number"
                  name="requirements.minGPA"
                  className="form-input"
                  value={formData.requirements.minGPA}
                  onChange={handleInputChange}
                  min="0"
                  max="4"
                  step="0.01"
                  placeholder="e.g. 3.0"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Maximum Age</label>
                <input
                  type="number"
                  name="requirements.maxAge"
                  className="form-input"
                  value={formData.requirements.maxAge}
                  onChange={handleInputChange}
                  min="18"
                  max="100"
                  placeholder="e.g. 25"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Financial Need</label>
                <select
                  name="requirements.financialNeed"
                  className="form-input"
                  value={formData.requirements.financialNeed}
                  onChange={handleInputChange}
                >
                  <option value="any">Any</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* Arrays (Comma Separated) */}
            <div className="form-grid">
              <div className="form-group span-2">
                <label className="form-label">Eligible Courses/Fields (comma-separated)</label>
                <input
                  type="text"
                  name="eligibleCourses"
                  className="form-input"
                  value={formData.eligibleCourses}
                  onChange={handleInputChange}
                  placeholder="Engineering, Technology, Data Science, AI, Finance, Economics"
                />
              </div>
              <div className="form-group span-2">
                <label className="form-label">Majors (comma-separated)</label>
                <input
                  type="text"
                  name="requirements.majors"
                  className="form-input"
                  value={formData.requirements.majors}
                  onChange={handleInputChange}
                  placeholder="e.g. CS, Electrical Engineering"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Extracurriculars (comma-separated)</label>
                <input
                  type="text"
                  name="requirements.extracurriculars"
                  className="form-input"
                  value={formData.requirements.extracurriculars}
                  onChange={handleInputChange}
                  placeholder="Sports, Debate, Volunteer"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Achievements (comma-separated)</label>
                <input
                  type="text"
                  name="requirements.achievements"
                  className="form-input"
                  value={formData.requirements.achievements}
                  onChange={handleInputChange}
                  placeholder="Dean's List, Competition Winner"
                />
              </div>
            </div>

            {/* Provider Information */}
            <h4 className="form-section-title">Provider Information</h4>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Provider Name</label>
                <input
                  type="text"
                  name="provider.name"
                  className="form-input"
                  value={formData.provider.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <input
                  type="email"
                  name="provider.contact"
                  className="form-input"
                  value={formData.provider.contact}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group span-2">
                <label className="form-label">Website (Application URL)</label>
                <input
                  type="url"
                  name="provider.website"
                  className="form-input"
                  value={formData.provider.website}
                  onChange={handleInputChange}
                  placeholder="https://example.com/apply"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Saving..." : editingScholarship ? "Update Scholarship" : "Create Scholarship"}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary" disabled={loading}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Scholarship List */}
      <div className="scholarship-list-grid">
        {filteredScholarships.map((scholarship) => (
          <div key={scholarship._id} className="list-item-card">
            <div className="card-content-top">
                <h4 className="card-title">{scholarship.title}</h4>
                <p className="card-subtitle">
                    {scholarship.provider?.name || "Unknown"} Scholarship
                </p>
                <div className="card-details">
                    <span className="detail-item">
                        <FaGraduationCap className="w-5 h-5 inline text-gray-600" />
                        <span style={{ marginLeft: '0.25rem' }}>{scholarship.studyLevel?.toUpperCase() || 'N/A'}</span>
                    </span>
                    <span className="detail-item">
                        <HiOutlineCalendar className="w-5 h-5 inline text-gray-600" />
                        <span style={{ marginLeft: '0.25rem' }}>{scholarship.deadline ? formatDate(scholarship.deadline) : 'N/A'}</span>
                    </span>
                </div>
            </div>

            <div className="card-actions-row">
              {/* Status Badge */}
              {(() => {
                const displayStatus = computeDisplayStatus(scholarship);
                const statusMap = {
                    active: { bg: "#d1fae5", text: "#065f46" },
                    inactive: { bg: "#fee2e2", text: "#991b1b" },
                    draft: { bg: "#fef3c7", text: "#92400e" },
                    // Use inactive style for expired
                    expired: { bg: "#fee2e2", text: "#991b1b" }, 
                };
                const statusStyle = statusMap[displayStatus] || statusMap.draft;
                
                return (
                  <span className="status-badge" style={{ 
                      backgroundColor: statusStyle.bg, 
                      color: statusStyle.text 
                  }}>
                    {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                  </span>
                );
              })()}

              <div className="action-buttons-group">
                <button
                  onClick={() => handleEdit(scholarship)}
                  className="btn-icon-edit"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(scholarship._id)}
                  className="btn-icon-delete"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredScholarships.length === 0 && (
            <div className="empty-list-state">
                No scholarships found. Use the "Add New" or "Scrape" buttons to populate the list.
            </div>
        )}
      </div>

      <style jsx>{`
        /* --- Stats Cards Grid --- */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.04);
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
        }
        
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
        }

        .card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .card-icon {
          font-size: 1.5rem;
          opacity: 0.7;
        }

        .card-value {
          font-size: 2.2rem;
          font-weight: 800;
          color: #1f2937;
        }
        
        .card-label {
          color: #6b7280;
          font-size: 0.95rem;
          font-weight: 600;
          letter-spacing: 0.01em;
        }

        .live-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.75rem;
          font-size: 0.85rem;
          color: #2563eb;
          font-weight: 600;
        }

        .spinner-small {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid #bfdbfe;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .no-stats-placeholder {
          background: white;
          padding: 3rem 2rem;
          border-radius: 12px;
          border: 2px dashed #e5e7eb;
          text-align: center;
          margin-bottom: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #9ca3af;
          font-weight: 600;
        }

        .no-stats-placeholder p {
          margin: 0;
          font-size: 1.1rem;
          color: #6b7280;
        }

        /* --- Layout & Utilities --- */
        .control-panel {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          align-items: center;
        }

        .search-input {
          width: 100%;
          max-width: 400px;
          padding: 0.75rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          outline: none;
          transition: all 0.2s;
        }
        
        .search-input:focus {
            border-color: #2563eb;
            box-shadow: 0 0 0 2px #bfdbfe;
        }

        .filter-group {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .filter-button {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: white;
          color: #374151;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-button:hover {
            background: #f3f4f6;
        }

        .filter-button.active-filter {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
        }
        
        /* --- Alerts and Scraping Panel --- */
        .alert-message {
          padding: 0.75rem 1rem;
          margin-bottom: 1rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.95rem;
          border: 1px solid;
        }

        .header-actions-container {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            align-items: center;
            justify-content: flex-end;
        }

        .scrape-control-group {
            display: flex;
            gap: 0.5rem;
        }
        
        .btn-scrape, .btn-cancel-scrape {
            padding: 0.75rem 1rem;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
        }
        
        .btn-scrape {
            background: #f59e0b;
            color: white;
        }
        
        .btn-scrape:hover {
            background: #d97706;
        }
        
        .btn-scrape-loading {
            background: #9ca3af !important;
            cursor: not-allowed;
        }

        .btn-cancel-scrape {
            background: #ef4444;
            color: white;
        }
        
        .btn-cancel-scrape:hover {
            background: #dc2626;
        }
        
        .btn-add-new {
            padding: 0.75rem 1.5rem;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
            box-shadow: 0 4px 6px rgba(37, 99, 235, 0.1);
        }
        
        .btn-add-new:hover {
            background: #1d4ed8;
            transform: translateY(-1px);
        }

        /* Scraping Progress Panel */
        .scrape-progress-panel {
            background: white;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            min-width: 300px;
            border: 2px solid #f59e0b;
        }

        .progress-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.5rem;
            font-size: 1rem;
            color: #4b5563;
        }

        .progress-count, .progress-percent {
            font-weight: 700;
            color: #f59e0b;
        }
        
        .progress-count {
            color: #111827;
        }

        .progress-bar-track {
            width: 100%;
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
        }

        .progress-bar-fill {
            height: 100%;
            background: #f59e0b;
            border-radius: 4px;
            transition: width 0.3s ease;
        }

        .current-scrape-title {
            margin-top: 0.5rem;
            font-size: 0.85rem;
            color: #6b7280;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .progress-initializing {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: #6b7280;
            font-size: 0.9rem;
            padding: 0.5rem 0;
        }
        
        .progress-spinner {
            width: 18px;
            height: 18px;
            border: 3px solid #f59e0b;
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        .progress-info {
            font-size: 0.75rem;
            color: #9ca3af;
            font-style: italic;
            display: block;
            margin-top: 0.25rem;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* --- Form Styling --- */
        .form-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        }

        .form-title {
            margin-top: 0;
            margin-bottom: 1.5rem;
            font-size: 1.5rem;
            font-weight: 700;
            color: #111827;
        }
        
        .form-section-title {
            margin-top: 1.5rem;
            margin-bottom: 1rem;
            font-size: 1.1rem;
            font-weight: 700;
            color: #1f2937;
            border-bottom: 1px solid #f3f4f6;
            padding-bottom: 0.5rem;
        }

        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
        }

        .form-group {
            margin-bottom: 0;
        }
        
        .form-group.span-2 {
            grid-column: span 2;
        }
        
        @media (max-width: 640px) {
            .form-group.span-2 {
                grid-column: span 1;
            }
        }


        .form-label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: #111827;
            font-size: 0.875rem;
        }

        .form-input {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 1rem;
            transition: all 0.2s ease;
            background-color: white;
        }

        .form-input:focus {
            border-color: #2563eb;
            box-shadow: 0 0 0 3px #bfdbfe;
            outline: none;
        }
        
        .checkbox-group {
            display: flex;
            gap: 1.5rem;
            align-items: center;
            font-size: 0.95rem;
            color: #374151;
        }
        
        .checkbox-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
        }
        
        .form-actions {
            margin-top: 2rem;
            display: flex;
            gap: 1rem;
        }
        
        .btn-primary, .btn-secondary {
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-primary {
            background: #2563eb;
            color: white;
            border: none;
        }

        .btn-primary:hover {
            background: #1d4ed8;
        }

        .btn-secondary {
            background: white;
            color: #374151;
            border: 1px solid #d1d5db;
        }

        .btn-secondary:hover {
            background: #f9fafb;
        }

        /* --- Scholarship List Grid --- */
        .scholarship-list-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }

        .list-item-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            min-height: 180px;
            transition: all 0.2s;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
        }
        
        .list-item-card:hover {
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.05);
            transform: translateY(-1px);
        }
        
        .card-content-top {
            flex-grow: 1;
            margin-bottom: 1rem;
        }

        .card-title {
            margin: 0 0 0.5rem 0;
            font-size: 1.25rem;
            font-weight: 700;
            color: #1f2937;
        }

        .card-subtitle {
            margin: 0 0 1rem 0;
            color: #6b7280;
            font-size: 0.9rem;
        }
        
        .card-details {
            display: flex;
            gap: 1rem;
            font-size: 0.9rem;
            color: #4b5563;
        }
        
        .detail-item {
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }
        
        .detail-icon {
            font-size: 1rem;
        }
        
        .card-actions-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 1rem;
            border-top: 1px dashed #f3f4f6;
        }
        
        .status-badge {
            padding: 0.3rem 0.8rem;
            border-radius: 16px;
            font-size: 0.75rem;
            font-weight: 700;
        }
        
        .action-buttons-group {
            display: flex;
            gap: 0.5rem;
        }

        .btn-icon-edit, .btn-icon-delete {
            padding: 0.6rem 0.9rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85rem;
            font-weight: 600;
            transition: background 0.2s;
        }
        
        .btn-icon-edit {
            background: #f3f4f6;
            border: 1px solid #d1d5db;
            color: #374151;
        }

        .btn-icon-edit:hover {
            background: #e5e7eb;
        }

        .btn-icon-delete {
            background: #ef4444;
            color: white;
            border: none;
        }
        
        .btn-icon-delete:hover {
            background: #dc2626;
        }
        
        .empty-list-state {
            grid-column: 1 / -1;
            text-align: center;
            padding: 3rem;
            color: #6b7280;
            font-size: 1rem;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
        }

        /* Responsive adjustments for form grid */
        @media (max-width: 640px) {
            .control-panel {
                flex-direction: column;
                align-items: stretch;
            }
            .search-input {
                max-width: 100%;
            }
            .form-card {
                padding: 1rem;
            }
            .form-grid {
                grid-template-columns: 1fr;
                gap: 1rem;
            }
            .header-actions-container {
                justify-content: space-between;
                flex-direction: column;
                align-items: stretch;
            }
            .scrape-control-group {
                width: 100%;
                justify-content: space-between;
            }
            .btn-scrape, .btn-cancel-scrape {
                flex: 1;
            }
            .btn-add-new {
                width: 100%;
            }
            .scrape-progress-panel {
                min-width: 100%;
            }
            .form-actions {
                flex-direction: column;
            }
        }
      `}</style>
    </AdminLayout>
  );
};

export default ScholarshipManagement;