"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useScholarships } from "../../contexts/ScholarshipContext";
import axios from "axios";
import AdminLayout from "../../components/AdminLayout";
import {
  HiOutlineInformationCircle,
  HiOutlineChartBarSquare,
  HiOutlineDocumentArrowDown,
} from "react-icons/hi2";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  HiOutlineAcademicCap,
  HiOutlineClipboardList,
  HiOutlineCheckCircle,
  HiOutlineUsers,
} from "react-icons/hi";

const ReportsPage = () => {
  const { user, logout } = useAuth();
  const { scholarships, fetchScholarships } = useScholarships();
  const [allTimeScholarshipsCount, setAllTimeScholarshipsCount] =
    useState(null);
  const [stats, setStats] = useState({});
  const [guestStats, setGuestStats] = useState(null);
  const [userAnalytics, setUserAnalytics] = useState({});
  const [scholarshipStatus, setScholarshipStatus] = useState([]);
  const [scholarshipApplications, setScholarshipApplications] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const itemsPerPage = 10;

  // Helper function to parse deadline
  const tryParseDeadline = (value) => {
    if (!value) return null;

    let d = null;
    if (typeof value === "string") {
      d = new Date(value);
    } else if (value instanceof Date) {
      d = value;
    }

    return d && !isNaN(d.getTime()) ? d : null;
  };

  // Compute display status for scholarship
  const computeDisplayStatus = (scholarship) => {
    // First, check deadline expiration
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
      // If deadline has passed, it's inactive regardless of study level
      if (dl.getTime() < todayMidnightUtc.getTime()) return "inactive";
    }

    // Deadline is valid or doesn't exist, now check study levels
    const studyLevels = scholarship.studyLevels || [];
    const studyLevel = scholarship.studyLevel;
    const hasValidStudyLevel =
      studyLevels.includes("degree") ||
      studyLevels.includes("diploma") ||
      studyLevel === "degree" ||
      studyLevel === "diploma";

    // If missing study level but not expired, categorize as missing-study-level
    if (!hasValidStudyLevel) {
      return "missing-study-level";
    }

    // Has valid study level and not expired = active
    return "active";
  };

  // Get status colors for chart
  const getStatusColors = (status) => {
    const colors = {
      active: "#2563eb",
      inactive: "#6b7280",
      "missing-study-level": "#f59e0b",
      expired: "#ef4444",
    };
    return colors[status] || "#2563eb";
  };

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [statsResponse, analyticsResponse, allScholarshipsResponse] =
          await Promise.all([
            axios.get("/api/reports/stats"),
            axios.get("/api/reports/users"),
            axios.get("/api/scholarships", {
              params: {
                status: "All",
                limit: 100000,
                latestSessionOnly: false,
              },
            }),
          ]);

        setStats(statsResponse.data.stats);
        setGuestStats(statsResponse.data.guestStats);
        setUserAnalytics(analyticsResponse.data);
        setAllTimeScholarshipsCount(
          typeof allScholarshipsResponse.data.total === "number"
            ? allScholarshipsResponse.data.total
            : Array.isArray(allScholarshipsResponse.data.scholarships)
            ? allScholarshipsResponse.data.scholarships.length
            : 0
        );
        await fetchScholarships();
      } catch (error) {
        console.error("Failed to fetch reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [fetchScholarships]);

  // Process scholarships for status distribution
  useEffect(() => {
    if (!scholarships) return;

    const counts = {
      all: scholarships.length,
      active: 0,
      inactive: 0,
      missingStudyLevel: 0,
    };

    scholarships.forEach((scholarship) => {
      const status = computeDisplayStatus(scholarship);

      if (status === "active") {
        counts.active++;
      } else if (status === "expired" || status === "inactive") {
        counts.inactive++;
      } else if (status === "missing-study-level") {
        counts.missingStudyLevel++;
      }
    });

    const statusData = [
      { name: "Active", value: counts.active, status: "active" },
      { name: "Inactive", value: counts.inactive, status: "inactive" },
      {
        name: "Missing Study Level",
        value: counts.missingStudyLevel,
        status: "missing-study-level",
      },
    ];

    if (scholarships.length > 0) {
      setScholarshipStatus(statusData);
    } else {
      setScholarshipStatus([]);
    }
  }, [scholarships]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [statsResponse, analyticsResponse, applicationsResponse] =
          await Promise.all([
            axios.get("/api/reports/stats"),
            axios.get("/api/reports/users"),
            axios.get("/api/reports/scholarship-applications"),
          ]);

        setStats(statsResponse.data.stats);
        setGuestStats(statsResponse.data.guestStats);
        setUserAnalytics(analyticsResponse.data);

        if (applicationsResponse.data.success) {
          setScholarshipApplications(applicationsResponse.data.analytics);
        }
      } catch (error) {
        console.error("Failed to fetch reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  // Prepare chart data from dailyHistory
  const prepareChartData = () => {
    if (!guestStats) {
      return [];
    }

    let data = [];

    // Add historical data if available
    if (guestStats.dailyHistory && guestStats.dailyHistory.length > 0) {
      // Get last 30 entries or all if less than 30
      const history = guestStats.dailyHistory.slice(-30);

      data = history.map((entry) => {
        // Format date from "Mon Dec 16 2024" to "Dec 16"
        const dateObj = new Date(entry.date);
        const month = dateObj.toLocaleDateString("en-US", { month: "short" });
        const day = dateObj.getDate();

        return {
          date: `${month} ${day}`,
          created: entry.created || 0,
        };
      });
    }

    // Always add today's data
    const today = new Date();
    const month = today.toLocaleDateString("en-US", { month: "short" });
    const day = today.getDate();

    data.push({
      date: `${month} ${day}`,
      created: guestStats.createdToday || 0,
    });

    return data;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <AdminLayout title="Reports & Analytics">
      {/* Tabs Navigation */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          marginBottom: "2rem",
          padding: "0.5rem",
          display: "flex",
          gap: "0.5rem",
          overflowX: "auto",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        }}
      >
        <button
          onClick={() => setActiveTab("overview")}
          style={{
            flex: "1",
            minWidth: "140px",
            padding: "0.875rem 1.25rem",
            border: "none",
            borderRadius: "8px",
            background: activeTab === "overview" ? "#2563eb" : "transparent",
            color: activeTab === "overview" ? "white" : "#6b7280",
            fontWeight: activeTab === "overview" ? "700" : "600",
            fontSize: "0.875rem",
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <HiOutlineChartBarSquare className="w-5 h-5" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          style={{
            flex: "1",
            minWidth: "140px",
            padding: "0.875rem 1.25rem",
            border: "none",
            borderRadius: "8px",
            background: activeTab === "activity" ? "#2563eb" : "transparent",
            color: activeTab === "activity" ? "white" : "#6b7280",
            fontWeight: activeTab === "activity" ? "700" : "600",
            fontSize: "0.875rem",
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <HiOutlineChartBarSquare className="w-5 h-5" />
          Guest Activity
        </button>
        <button
          onClick={() => setActiveTab("status")}
          style={{
            flex: "1",
            minWidth: "140px",
            padding: "0.875rem 1.25rem",
            border: "none",
            borderRadius: "8px",
            background: activeTab === "status" ? "#2563eb" : "transparent",
            color: activeTab === "status" ? "white" : "#6b7280",
            fontWeight: activeTab === "status" ? "700" : "600",
            fontSize: "0.875rem",
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <HiOutlineDocumentArrowDown className="w-5 h-5" />
          Scholarship Status
        </button>
        <button
          onClick={() => setActiveTab("applications")}
          style={{
            flex: "1",
            minWidth: "140px",
            padding: "0.875rem 1.25rem",
            border: "none",
            borderRadius: "8px",
            background:
              activeTab === "applications" ? "#2563eb" : "transparent",
            color: activeTab === "applications" ? "white" : "#6b7280",
            fontWeight: activeTab === "applications" ? "700" : "600",
            fontSize: "0.875rem",
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <HiOutlineDocumentArrowDown className="w-5 h-5" />
          Applications
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div>
          {/* Stats Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)", // Still forces 2 columns
              gap: "1.5rem",
              marginBottom: "2rem",
              width: "100%",
            }}
          >
            {/* 1. All-Time Scholarships */}
            <div
              style={{
                background: "white",
                padding: "2rem", // Good spacing, but not huge
                borderRadius: "16px",
                border: "1px solid #f1f5f9",
                boxShadow:
                  "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
                display: "flex",
                alignItems: "center",
                gap: "1.5rem",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "translateY(-2px)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }
            >
              {/* Icon Box - Reduced size */}
              <div
                style={{
                  background: "#eff6ff",
                  color: "#2563eb",
                  minWidth: "64px",
                  height: "64px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2rem",
                }}
              >
                <HiOutlineAcademicCap />
              </div>

              {/* Text Content - Balanced Fonts */}
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    color: "#64748b",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                  }}
                >
                  All-Time Total
                </p>
                <h3
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: "2.25rem",
                    fontWeight: "700",
                    color: "#1e293b",
                    lineHeight: "1.2",
                  }}
                >
                  {allTimeScholarshipsCount !== null
                    ? allTimeScholarshipsCount
                    : "..."}
                </h3>
              </div>
            </div>

            {/* 2. Current Total (Recent Scrape) */}
            <div
              style={{
                background: "white",
                padding: "2rem",
                borderRadius: "16px",
                border: "1px solid #f1f5f9",
                boxShadow:
                  "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
                display: "flex",
                alignItems: "center",
                gap: "1.5rem",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "translateY(-2px)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }
            >
              <div
                style={{
                  background: "#fdf4ff",
                  color: "#c026d3",
                  minWidth: "64px",
                  height: "64px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2rem",
                }}
              >
                <HiOutlineClipboardList />
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    color: "#64748b",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                  }}
                >
                  Recent Scrape
                </p>
                <h3
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: "2.25rem",
                    fontWeight: "700",
                    color: "#1e293b",
                    lineHeight: "1.2",
                  }}
                >
                  {(() => {
                    const latestSessionId =
                      scholarships.length > 0
                        ? scholarships[0].scrapingSessionId ||
                          scholarships[0].sessionId
                        : null;
                    if (!latestSessionId) return 0;
                    return scholarships.filter((s) => {
                      const sessionId = s.scrapingSessionId || s.sessionId;
                      return sessionId === latestSessionId;
                    }).length;
                  })()}
                </h3>
              </div>
            </div>

            {/* 3. Active Scholarships */}
            <div
              style={{
                background: "white",
                padding: "2rem",
                borderRadius: "16px",
                border: "1px solid #f1f5f9",
                boxShadow:
                  "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
                display: "flex",
                alignItems: "center",
                gap: "1.5rem",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "translateY(-2px)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }
            >
              <div
                style={{
                  background: "#ecfdf5",
                  color: "#059669",
                  minWidth: "64px",
                  height: "64px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2rem",
                }}
              >
                <HiOutlineCheckCircle />
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    color: "#64748b",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                  }}
                >
                  Active Now
                </p>
                <h3
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: "2.25rem",
                    fontWeight: "700",
                    color: "#1e293b",
                    lineHeight: "1.2",
                  }}
                >
                  {(() => {
                    const latestSessionId =
                      scholarships.length > 0
                        ? scholarships[0].scrapingSessionId ||
                          scholarships[0].sessionId
                        : null;
                    if (!latestSessionId) return 0;
                    return scholarships.filter((s) => {
                      const sessionId = s.scrapingSessionId || s.sessionId;
                      const isActive =
                        String(s.status || "active").toLowerCase() === "active";
                      return sessionId === latestSessionId && isActive;
                    }).length;
                  })()}
                </h3>
              </div>
            </div>

            {/* 4. Guest Users */}
            {guestStats && (
              <div
                style={{
                  background: "white",
                  padding: "2rem",
                  borderRadius: "16px",
                  border: "1px solid #f1f5f9",
                  boxShadow:
                    "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
                  display: "flex",
                  alignItems: "center",
                  gap: "1.5rem",
                  transition: "transform 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "translateY(-2px)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "translateY(0)")
                }
              >
                <div
                  style={{
                    background: "#fff7ed",
                    color: "#ea580c",
                    minWidth: "64px",
                    height: "64px",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2rem",
                  }}
                >
                  <HiOutlineUsers />
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: 0,
                      color: "#64748b",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                    }}
                  >
                    Guest Users
                  </p>
                  <h3
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: "2.25rem",
                      fontWeight: "700",
                      color: "#1e293b",
                      lineHeight: "1.2",
                    }}
                  >
                    {guestStats.totalCreated}
                  </h3>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guest Activity Tab */}
      {activeTab === "activity" &&
        guestStats &&
        prepareChartData().length > 0 && (
          <div>
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                marginBottom: "2rem",
                overflow: "hidden",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              <h3
                style={{
                  padding: "1.5rem",
                  margin: 0,
                  borderBottom: "1px solid #e5e7eb",
                  fontSize: "1.25rem",
                  fontWeight: "700",
                  color: "#1f2937",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <HiOutlineChartBarSquare className="w-6 h-6 text-blue-600" />
                Guest Activity Trend (Last 30 Days)
              </h3>
              <div style={{ padding: "2rem" }}>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={prepareChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      stroke="#6b7280"
                      style={{ fontSize: "0.875rem" }}
                    />
                    <YAxis stroke="#6b7280" style={{ fontSize: "0.875rem" }} />
                    <Tooltip
                      contentStyle={{
                        background: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "0.5rem 1rem",
                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                      }}
                      itemStyle={{ color: "#111827", fontWeight: "600" }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="created"
                      stroke="#2563eb"
                      strokeWidth={2}
                      name="Guests Created"
                      dot={{ fill: "#2563eb", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

      {/* Scholarship Status Tab */}
      {activeTab === "status" && scholarshipStatus.length > 0 && (
        <div>
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              marginBottom: "2rem",
              overflow: "hidden",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            <h3
              style={{
                padding: "1.5rem",
                margin: 0,
                borderBottom: "1px solid #e5e7eb",
                fontSize: "1.25rem",
                fontWeight: "700",
                color: "#1f2937",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <HiOutlineChartBarSquare className="w-6 h-6 text-blue-600" />
              Scholarship Status Distribution
            </h3>
            <div style={{ padding: "2rem" }}>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={scholarshipStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={140}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value, percent }) =>
                      `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={{ stroke: "#9ca3af", strokeWidth: 1 }}
                  >
                    {scholarshipStatus.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getStatusColors(entry.status)}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "0.5rem 1rem",
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                    itemStyle={{ color: "#111827", fontWeight: "600" }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value, entry) => (
                      <span style={{ color: "#374151", fontSize: "0.875rem" }}>
                        {value}: {entry.payload.value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Applications Tab */}
      {activeTab === "applications" &&
        scholarshipApplications &&
        scholarshipApplications.length > 0 && (
          <div>
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                marginBottom: "2rem",
                overflow: "hidden",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              <h3
                style={{
                  padding: "1.5rem",
                  margin: 0,
                  borderBottom: "1px solid #e5e7eb",
                  fontSize: "1.25rem",
                  fontWeight: "700",
                  color: "#1f2937",
                }}
              >
                Scholarship Application Analytics
              </h3>
              <div style={{ padding: "1rem", overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.9rem",
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "0.75rem",
                          fontWeight: "600",
                          color: "#374151",
                        }}
                      >
                        Scholarship Title
                      </th>
                      <th
                        style={{
                          textAlign: "center",
                          padding: "0.75rem",
                          fontWeight: "600",
                          color: "#374151",
                        }}
                      >
                        Matched Apps
                      </th>
                      <th
                        style={{
                          textAlign: "center",
                          padding: "0.75rem",
                          fontWeight: "600",
                          color: "#374151",
                        }}
                      >
                        Non-Matched Apps
                      </th>
                      <th
                        style={{
                          textAlign: "center",
                          padding: "0.75rem",
                          fontWeight: "600",
                          color: "#374151",
                        }}
                      >
                        Total Applications
                      </th>
                      <th
                        style={{
                          textAlign: "center",
                          padding: "0.75rem",
                          fontWeight: "600",
                          color: "#374151",
                        }}
                      >
                        Earliest Application
                      </th>
                      <th
                        style={{
                          textAlign: "center",
                          padding: "0.75rem",
                          fontWeight: "600",
                          color: "#374151",
                        }}
                      >
                        Latest Application
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {scholarshipApplications
                      .slice(
                        (currentPage - 1) * itemsPerPage,
                        currentPage * itemsPerPage
                      )
                      .map((item, index) => (
                        <tr
                          key={item._id}
                          style={{
                            borderBottom: "1px solid #f3f4f6",
                          }}
                        >
                          <td
                            style={{
                              padding: "0.75rem",
                              fontWeight: "500",
                              color: "#111827",
                            }}
                          >
                            {item.scholarshipTitle}
                          </td>
                          <td
                            style={{ padding: "0.75rem", textAlign: "center" }}
                          >
                            <span
                              style={{
                                background: "#dcfce7",
                                color: "#166534",
                                padding: "0.25rem 0.75rem",
                                borderRadius: "12px",
                                fontWeight: "600",
                                fontSize: "0.875rem",
                              }}
                            >
                              {item.matchedApplications || 0}
                            </span>
                          </td>
                          <td
                            style={{ padding: "0.75rem", textAlign: "center" }}
                          >
                            <span
                              style={{
                                background: "#fef3c7",
                                color: "#92400e",
                                padding: "0.25rem 0.75rem",
                                borderRadius: "12px",
                                fontWeight: "600",
                                fontSize: "0.875rem",
                              }}
                            >
                              {item.nonMatchedApplications || 0}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              textAlign: "center",
                              color: "#2563eb",
                              fontWeight: "600",
                            }}
                          >
                            {item.totalApplications}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              textAlign: "center",
                              color: "#6b7280",
                            }}
                          >
                            {item.earliestApplication
                              ? new Date(
                                  item.earliestApplication
                                ).toLocaleDateString()
                              : "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              textAlign: "center",
                              color: "#6b7280",
                            }}
                          >
                            {item.latestApplication
                              ? new Date(
                                  item.latestApplication
                                ).toLocaleDateString()
                              : "N/A"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {scholarshipApplications.length > itemsPerPage && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "1.5rem 1rem 0.5rem",
                      borderTop: "1px solid #e5e7eb",
                      marginTop: "1rem",
                    }}
                  >
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                      style={{
                        padding: "0.5rem 1rem",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        background: currentPage === 1 ? "#f3f4f6" : "white",
                        color: currentPage === 1 ? "#9ca3af" : "#374151",
                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                        fontWeight: "500",
                        fontSize: "0.875rem",
                      }}
                    >
                      Previous
                    </button>

                    {Array.from(
                      {
                        length: Math.ceil(
                          scholarshipApplications.length / itemsPerPage
                        ),
                      },
                      (_, i) => i + 1
                    ).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        style={{
                          padding: "0.5rem 0.75rem",
                          border: "1px solid #e5e7eb",
                          borderRadius: "6px",
                          background:
                            currentPage === page ? "#2563eb" : "white",
                          color: currentPage === page ? "white" : "#374151",
                          cursor: "pointer",
                          fontWeight: currentPage === page ? "600" : "500",
                          fontSize: "0.875rem",
                          minWidth: "2.5rem",
                        }}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(
                            Math.ceil(
                              scholarshipApplications.length / itemsPerPage
                            ),
                            prev + 1
                          )
                        )
                      }
                      disabled={
                        currentPage ===
                        Math.ceil(scholarshipApplications.length / itemsPerPage)
                      }
                      style={{
                        padding: "0.5rem 1rem",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        background:
                          currentPage ===
                          Math.ceil(
                            scholarshipApplications.length / itemsPerPage
                          )
                            ? "#f3f4f6"
                            : "white",
                        color:
                          currentPage ===
                          Math.ceil(
                            scholarshipApplications.length / itemsPerPage
                          )
                            ? "#9ca3af"
                            : "#374151",
                        cursor:
                          currentPage ===
                          Math.ceil(
                            scholarshipApplications.length / itemsPerPage
                          )
                            ? "not-allowed"
                            : "pointer",
                        fontWeight: "500",
                        fontSize: "0.875rem",
                      }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </AdminLayout>
  );
};

export default ReportsPage;
