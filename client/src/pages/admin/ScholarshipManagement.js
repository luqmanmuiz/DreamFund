"use client";

import { useState, useEffect, useCallback } from "react";
import ConfirmModal from "../../components/ConfirmModal";
import { useAuth } from "../../contexts/AuthContext";
import { useScholarships } from "../../contexts/ScholarshipContext";
import AdminLayout from "../../components/AdminLayout";
import {
  HiOutlineDocumentText,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineChartBarSquare,
  HiOutlineClock,
  HiOutlineCalendar,
} from "react-icons/hi2";
import { FaGraduationCap } from "react-icons/fa";

const ScholarshipManagement = () => {
  const { user, logout } = useAuth();
  const {
    scholarships,
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
    },
    provider: {
      name: "",
      contact: "",
      website: "",
    },
    status: "active",
    eligibleCourses: "",
  });
  const [message, setMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [scholarshipToDelete, setScholarshipToDelete] = useState(null);
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
  const [lastSuccessfulScrape, setLastSuccessfulScrape] = useState(null);

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
        if (data.lastSuccessfulScrape) {
          setLastSuccessfulScrape(data.lastSuccessfulScrape);
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

  // Format last scrape time in human-readable format
  const formatLastScrapeTime = (timestamp) => {
    if (!timestamp) return null;

    const now = new Date();
    const scrapeTime = new Date(timestamp);
    const diffInMs = now - scrapeTime;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

    // Show relative time if within 24 hours
    if (diffInHours < 24) {
      if (diffInMinutes < 1) return "Just now";
      if (diffInMinutes < 60)
        return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
      return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
    }

    // Otherwise show abbreviated date
    const options = { day: "numeric", month: "short", year: "numeric" };
    return scrapeTime.toLocaleDateString("en-GB", options);
  };

  // Get stats to display (live or last session)
  const getDisplayStats = () => {
    // If scraping is active, show live stats
    if (scrapeLoading && scrapeProgress.total > 0) {
      const totalProcessed = scrapeProgress.current;
      const successCount =
        (scrapeProgress.savedCount || 0) + (scrapeProgress.updatedCount || 0);
      const failedCount = scrapeProgress.failedCount || 0;
      const successRate =
        totalProcessed > 0 ? (successCount / totalProcessed) * 100 : 0;
      const startTime = scrapeProgress.startTime
        ? new Date(scrapeProgress.startTime)
        : null;
      const duration = startTime
        ? Math.floor((new Date() - startTime) / 1000)
        : 0;

      return {
        totalProcessed,
        successCount,
        failedCount,
        successRate,
        duration,
        isLive: true,
      };
    }

    // Otherwise show last completed session
    if (scrapingStats) {
      const successRate =
        scrapingStats.totalProcessed > 0
          ? (scrapingStats.successCount / scrapingStats.totalProcessed) * 100
          : 0;

      return {
        totalProcessed: scrapingStats.totalProcessed,
        successCount: scrapingStats.successCount,
        failedCount: scrapingStats.failedCount,
        successRate,
        duration: scrapingStats.duration,
        isLive: false,
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
      return "missing-study-level";
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
      if (dl.getTime() < todayMidnightUtc.getTime()) return "expired"; // Changed to 'expired' for clarity
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
      missingStudyLevel: 0,
      expired: 0,
    };

    for (const scholarship of scholarships) {
      const status = computeDisplayStatus(scholarship);

      if (status === "active") {
        counts.active++;
      } else if (status === "inactive") {
        counts.inactive++;
      } else if (status === "expired") {
        counts.expired++; // Count separately
      } else if (status === "missing-study-level") {
        counts.missingStudyLevel++;
      } else {
        counts.missingStudyLevel++;
      }
    }

    // Combine expired into inactive for the filter button if desired, or keep separate
    // For this UI, let's group expired and inactive for the "Inactive" button count
    counts.inactiveTotal = counts.inactive + counts.expired;

    return counts;
  };

  // Scrape cancellation function
  const handleCancelScraping = async () => {
    try {
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
        majors: "",
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

    if (!editingScholarship) {
      setMessage("Error: No scholarship selected for editing");
      setLoading(false);
      return;
    }

    const result = await updateScholarship(
      editingScholarship._id,
      scholarshipData
    );

    if (result.success) {
      setMessage("Scholarship updated successfully! ✅");
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
        majors: (scholarship.requirements?.majors || []).join(", "),
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
    window.scrollTo({ top: 0, behavior: "smooth" }); // Scroll up to form
  };

  const toggleStudyLevel = (level) => {
    setFormData((prev) => {
      const current = new Set(prev.studyLevels || []);
      if (current.has(level)) current.delete(level);
      else current.add(level);
      return { ...prev, studyLevels: Array.from(current) };
    });
  };

  const handleDelete = (scholarshipId) => {
    setScholarshipToDelete(scholarshipId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!scholarshipToDelete) return;
    const result = await deleteScholarship(scholarshipToDelete);
    if (result.success) {
      setMessage("Scholarship deleted successfully! 🗑️");
      setTimeout(() => setMessage(""), 3000);
    } else {
      setMessage(result.message);
    }
    setShowDeleteModal(false);
    setScholarshipToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setScholarshipToDelete(null);
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
  const filteredScholarships = (scholarships || []).filter((scholarship) => {
    const matchesSearch =
      scholarship.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (scholarship.provider?.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const currentStatus = computeDisplayStatus(scholarship);

    const matchesFilter =
      filterStatus === "all" || currentStatus === filterStatus;

    if (filterStatus === "missing-study-level") {
      return matchesSearch && currentStatus === "missing-study-level";
    } else if (filterStatus === "inactive") {
      // 'inactive' filter button displays scholarships whose status is 'inactive' or 'expired'
      return (
        matchesSearch &&
        (currentStatus === "inactive" || currentStatus === "expired")
      );
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
          className={`btn-scrape ${scrapeLoading ? "btn-scrape-loading" : ""}`}
        >
          {scrapeLoading ? "Scraping..." : "Scrape Scholarships"}
        </button>
        {scrapeLoading && (
          <button onClick={handleCancelScraping} className="btn-cancel-scrape">
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
                  {scrapeProgress.total > 0
                    ? Math.round(
                        (scrapeProgress.current / scrapeProgress.total) * 100
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${
                      scrapeProgress.total > 0
                        ? (scrapeProgress.current / scrapeProgress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              {scrapeProgress.currentScholarship && (
                <div className="current-scrape-title">
                  <HiOutlineDocumentText className="w-5 h-5 inline text-blue-600" />
                  <span style={{ marginLeft: "0.5rem" }}>
                    {scrapeProgress.currentScholarship}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="progress-initializing">
              <div className="progress-spinner" />
              <span>
                {scrapeProgress.currentScholarship || "Initializing scraper..."}
              </span>
              <span className="progress-info">
                This may take a few minutes. Please be patient...
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Filter buttons data (using the pre-calculated counts)
  const filterButtons = [
    { status: "all", label: "All", count: filteredCounts.all },
    { status: "active", label: "Active", count: filteredCounts.active },
    {
      status: "inactive",
      label: "Inactive/Expired",
      count: filteredCounts.inactiveTotal,
    },
    {
      status: "missing-study-level",
      label: "Missing Study Level",
      count: filteredCounts.missingStudyLevel,
    },
  ];

  return (
    <AdminLayout title="Scholarship Management" headerActions={headerActions}>
      {/* Scraping Statistics Cards - UPDATED TO ICON BOX STYLE */}
      {getDisplayStats() ? (
        <div className="stats-grid">
          {/* All-Time Scholarships */}
          <div className="stat-card">
            <div className="icon-box" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
              <HiOutlineDocumentText className="icon-size" />
            </div>
            <div className="stat-info">
              <div className="stat-label">Total Scholarships</div>
              <div className="stat-value">{scholarships.length}</div>
            </div>
          </div>

          {/* Successful Extractions */}
          <div className="stat-card">
            <div className="icon-box" style={{ backgroundColor: "#ecfdf5", color: "#059669" }}>
              <HiOutlineCheckCircle className="icon-size" />
            </div>
            <div className="stat-info">
              <div className="stat-label">Successful</div>
              <div className="stat-value">{getDisplayStats().successCount}</div>
            </div>
            {getDisplayStats().isLive && (
              <div className="live-badge">Live</div>
            )}
          </div>

          {/* Failed Extractions */}
          <div className="stat-card">
             <div className="icon-box" style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}>
              <HiOutlineXCircle className="icon-size" />
            </div>
            <div className="stat-info">
              <div className="stat-label">Failed</div>
              <div className="stat-value">{getDisplayStats().failedCount}</div>
            </div>
            {getDisplayStats().isLive && (
               <div className="live-badge">Live</div>
            )}
          </div>

          {/* Success Rate */}
          <div className="stat-card">
             <div className="icon-box" style={{ backgroundColor: "#f3e8ff", color: "#9333ea" }}>
              <HiOutlineChartBarSquare className="icon-size" />
            </div>
            <div className="stat-info">
              <div className="stat-label">Success Rate</div>
              <div className="stat-value">{getDisplayStats().successRate.toFixed(0)}%</div>
            </div>
             {getDisplayStats().isLive && (
               <div className="live-badge">Live</div>
            )}
          </div>

          {/* Scraping Duration */}
          <div className="stat-card">
             <div className="icon-box" style={{ backgroundColor: "#fffbeb", color: "#d97706" }}>
              <HiOutlineClock className="icon-size" />
            </div>
            <div className="stat-info">
              <div className="stat-label">Duration</div>
              <div className="stat-value">{formatDuration(getDisplayStats().duration)}</div>
            </div>
             {getDisplayStats().isLive && (
               <div className="live-badge">Live</div>
            )}
          </div>

          {/* Last Successful Scrape */}
          {lastSuccessfulScrape && (
            <div className="stat-card">
               <div className="icon-box" style={{ backgroundColor: "#e0e7ff", color: "#4f46e5" }}>
                <HiOutlineCalendar className="icon-size" />
              </div>
              <div className="stat-info">
                <div className="stat-label">Last Scrape</div>
                <div className="stat-value" style={{fontSize: "1.1rem"}}>
                  {formatLastScrapeTime(lastSuccessfulScrape)}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="no-stats-placeholder">
          <HiOutlineChartBarSquare
            className="w-12 h-12 text-gray-400"
            style={{ margin: "0 auto 0.5rem" }}
          />
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
              className={`filter-button ${
                filterStatus === btn.status ? "active-filter" : ""
              }`}
            >
              {btn.label} ({btn.count})
            </button>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {message && (
        <div
          className="alert-message"
          style={{
            backgroundColor: message.includes("success")
              ? "#d1fae5"
              : "#fee2e2",
            color: message.includes("success") ? "#065f46" : "#991b1b",
          }}
        >
          {message}
        </div>
      )}

      {/* Scholarship Form (Edit Only) */}
      {showForm && editingScholarship && (
        <div className="form-card">
          <h3 className="form-title">Edit Scholarship</h3>
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
                <select
                  name="status"
                  className="form-input"
                  value={formData.status}
                  onChange={handleInputChange}
                >
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
                  {["diploma", "degree"].map((level) => (
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
            </div>

            {/* Arrays (Comma Separated) */}
            <div className="form-grid">
              <div className="form-group span-2">
                <label className="form-label">
                  Eligible Courses/Fields (comma-separated)
                </label>
                <input
                  type="text"
                  name="eligibleCourses"
                  className="form-input"
                  value={formData.eligibleCourses}
                  onChange={handleInputChange}
                  placeholder="Engineering, Technology, Data Science, AI, Finance, Economics"
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
                {loading ? "Saving..." : "Update Scholarship"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Scholarship List */}
      <>
        <ConfirmModal
          open={showDeleteModal}
          title="Delete Scholarship?"
          message="Are you sure you want to delete this scholarship? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          danger
        />
        <div className="scholarship-list-grid">
          {filteredScholarships.map((scholarship) => {
            const displayStatus = computeDisplayStatus(scholarship);

            // Status Colors Configuration
            const statusConfig = {
              active: { bg: "#ecfdf5", text: "#047857", dot: "#10b981" }, // Emerald Green
              inactive: { bg: "#fef2f2", text: "#b91c1c", dot: "#ef4444" }, // Red
              "missing-study-level": {
                bg: "#fffbeb",
                text: "#b45309",
                dot: "#f59e0b",
              }, // Amber
              expired: { bg: "#f3f4f6", text: "#374151", dot: "#9ca3af" }, // Gray
            };

            const statusStyle =
              statusConfig[displayStatus] || statusConfig["inactive"];

            return (
              <div key={scholarship._id} className="scholarship-card">
                {/* --- Card Header: Provider & Status --- */}
                <div className="card-header">
                  <span className="provider-label">
                    {scholarship.provider?.name || "Unknown Provider"}
                  </span>
                  <div
                    className="status-pill"
                    style={{
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.text,
                    }}
                  >
                    <span
                      className="status-dot"
                      style={{ backgroundColor: statusStyle.dot }}
                    />
                    {displayStatus.replace(/-/g, " ")}
                  </div>
                </div>

                {/* --- Card Body: Title --- */}
                <div className="card-body">
                  <h3 className="card-title" title={scholarship.title}>
                    {scholarship.title}
                  </h3>

                  {/* --- Meta Tags Row --- */}
                  <div className="meta-tags-container">
                    <div className="meta-tag">
                      <FaGraduationCap className="meta-icon" />
                      <span>
                        {Array.isArray(scholarship.studyLevels) &&
                        scholarship.studyLevels.length > 0
                          ? scholarship.studyLevels
                              .map(
                                (l) => l.charAt(0).toUpperCase() + l.slice(1)
                              )
                              .join(", ")
                          : scholarship.studyLevel || "N/A"}
                      </span>
                    </div>

                    <div className="meta-tag">
                      <HiOutlineCalendar className="meta-icon" />
                      <span>
                        {scholarship.deadline
                          ? formatDate(scholarship.deadline)
                          : "No Deadline"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* --- Card Footer: Actions --- */}
                <div className="card-footer">
                  <button
                    onClick={() => handleEdit(scholarship)}
                    className="action-btn edit-btn"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(scholarship._id)}
                    className="action-btn delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
          {filteredScholarships.length === 0 && (
            <div className="empty-list-state">
              No scholarships found. Use the "Scrape" button to populate the
              list.
            </div>
          )}
        </div>
      </>

      <style jsx>{`
        /* --- Stats Cards Grid --- */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          display: flex;
          align-items: center;
          gap: 1.25rem;
          position: relative;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.06);
        }

        .icon-box {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .icon-size {
          font-size: 1.75rem;
          display: flex;
        }

        .stat-info {
          flex: 1;
        }

        .stat-label {
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          text-transform: capitalize;
        }

        .stat-value {
          color: #1e293b;
          font-size: 1.875rem;
          font-weight: 800;
          line-height: 1.2;
        }
        
        .live-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          font-size: 0.7rem;
          background: #eff6ff;
          color: #2563eb;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 700;
          border: 1px solid #bfdbfe;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
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

        .btn-scrape,
        .btn-cancel-scrape {
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

        .progress-count,
        .progress-percent {
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
             0% { transform: rotate(0deg); }
             100% { transform: rotate(360deg); }
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

        .btn-primary,
        .btn-secondary {
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

        /* --- New Scholarship Card Design --- */
        .scholarship-list-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 1.5rem;
        }

        .scholarship-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          transition: all 0.2s ease-in-out;
          position: relative;
          overflow: hidden;
        }

        .scholarship-card:hover {
          border-color: #d1d5db;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05),
            0 4px 6px -2px rgba(0, 0, 0, 0.025);
          transform: translateY(-2px);
        }

        /* Header Section */
        .card-header {
          padding: 1.25rem 1.25rem 0.75rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .provider-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
          color: #6b7280; /* Cool Gray 500 */
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 60%;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        /* Body Section */
        .card-body {
          padding: 0 1.25rem 1.25rem;
          flex-grow: 1;
        }

        .card-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #111827;
          line-height: 1.4;
          margin-bottom: 1rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Meta Tags (Icons + Text) */
        .meta-tags-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .meta-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.75rem;
          background-color: #f9fafb;
          border: 1px solid #f3f4f6;
          border-radius: 8px;
          font-size: 0.85rem;
          color: #4b5563;
          font-weight: 500;
        }

        .meta-icon {
          color: #9ca3af;
          font-size: 1rem;
        }

        /* Footer Section */
        .card-footer {
          margin-top: auto;
          padding: 0.75rem 1.25rem;
          background-color: #ffffff;
          border-top: 1px solid #f3f4f6;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 0.5rem;
        }

        .action-btn {
          background: transparent;
          border: none;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          transition: background 0.2s;
        }

        .edit-btn {
          color: #2563eb; /* Blue 600 */
        }

        .edit-btn:hover {
          background-color: #eff6ff; /* Blue 50 */
        }

        .delete-btn {
          color: #ef4444; /* Red 500 */
        }

        .delete-btn:hover {
          background-color: #fef2f2; /* Red 50 */
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

        /* Responsive adjustments */
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
          .btn-scrape,
          .btn-cancel-scrape {
            flex: 1;
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