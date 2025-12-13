"use client";

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useScholarships } from "../../contexts/ScholarshipContext"; // Import shared context
import axios from "axios";
import AdminLayout from "../../components/AdminLayout";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import {
  HiOutlineUsers,
  HiOutlineDocumentText,
  HiOutlineChartBar,
  HiOutlineInformationCircle,
  HiOutlineBookOpen,
  HiOutlineCheckBadge,
  HiOutlineCircleStack,
  HiOutlineStar
} from 'react-icons/hi2';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const { scholarships, fetchScholarships } = useScholarships();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalScholarships: 0,
    activeScholarships: 0,
    totalApplications: 0,
  });
  const [guestStats, setGuestStats] = useState({
    totalCreated: 0,
    activeNow: 0,
    createdToday: 0,
    totalExpired: 0
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);
  const [scholarshipStatus, setScholarshipStatus] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add helper function to parse deadline (same as ScholarshipManagement)
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

  // Add status computation function (same as ScholarshipManagement)
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
      if (dl.getTime() < todayMidnightUtc.getTime()) return "inactive";
    }

    return String(scholarship.status || "active").toLowerCase() === "inactive"
      ? "inactive"
      : "active";
  };

  // Fetch general stats and trigger scholarship fetch
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");
        const config = {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        };

        const statsResponse = await axios.get("/api/reports/stats", config);
        
        setStats(prev => ({
            ...prev,
            totalUsers: statsResponse.data.stats.totalUsers,
            totalApplications: statsResponse.data.stats.totalApplicationations,
        }));
        
        // Set guest stats
        if (statsResponse.data.guestStats) {
          setGuestStats(statsResponse.data.guestStats);
        }
        
        setRecentUsers(statsResponse.data.recentUsers);
        setRecentApplications(statsResponse.data.recentApplications);

        await fetchScholarships();
        
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [fetchScholarships]);

  // Process scholarships whenever the context data changes
  useEffect(() => {
    if (!scholarships) return;

    console.log("Dashboard processing scholarships from context:", scholarships.length);

    const counts = {
      all: scholarships.length,
      active: 0,
      inactive: 0,
      draft: 0,
    };

    scholarships.forEach((scholarship) => {
      const status = computeDisplayStatus(scholarship);
      
      if (status === 'active') {
        counts.active++;
      } else if (status === 'inactive') {
        // Logic from ScholarshipManagement getFilteredCounts
        const deadlineValue = scholarship.deadline || scholarship.extractedDeadline;
        const deadlineDate = tryParseDeadline(deadlineValue);
        const isExpired = deadlineDate && deadlineDate.getTime() < new Date().getTime();
        
        if (isExpired) {
          counts.inactive++;
        } else {
          counts.draft++;
        }
      } else {
        counts.draft++;
      }
    });

    console.log("Dashboard computed counts:", counts);

    // Update stats state to match the calculated counts
    setStats(prev => ({
      ...prev,
      totalScholarships: counts.all,
      activeScholarships: counts.active
    }));

    // Create chart data
    const statusData = [
      { name: "Active", value: counts.active, status: "active" },
      { name: "Inactive", value: counts.inactive, status: "inactive" },
      { name: "Draft", value: counts.draft, status: "draft" },
    ];

    if (scholarships.length > 0) {
       setScholarshipStatus(statusData);
    } else {
       setScholarshipStatus([]);
    }

  }, [scholarships]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

    const getMetricIcon = (key) => {
    switch (key) {
      case "totalUsers":
        return <HiOutlineUsers className="w-6 h-6 text-blue-600" />;
      case "totalScholarships":
        return <HiOutlineBookOpen className="w-6 h-6 text-blue-600" />;
      case "activeScholarships":
        return <HiOutlineCheckBadge className="w-6 h-6 text-green-600" />;
      case "totalApplications":
        return <HiOutlineDocumentText className="w-6 h-6 text-gray-600" />;
      default:
        return <HiOutlineChartBar className="w-6 h-6 text-gray-600" />;
    }
  };

  const getStatusColors = (status) => {
    const colors = {
      active: "#2563eb", // Blue
      inactive: "#6b7280", // Gray
      draft: "#f59e0b", // Amber
      expired: "#ef4444", // Red
    };
    return colors[status] || "#2563eb";
  };
  
  // Metric Cards Data Array - Add guest metrics
  const metricData = [
    { key: "totalScholarships", label: "Total Scholarships", icon: <HiOutlineBookOpen className="w-6 h-6 text-blue-600" /> },
    { key: "activeScholarships", label: "Active Scholarships", icon: <HiOutlineCheckBadge className="w-6 h-6 text-green-600" /> },
    { key: "guestTotalCreated", label: "Total Guests", icon: <HiOutlineUsers className="w-6 h-6 text-blue-600" />, value: guestStats.totalCreated },
    { key: "guestActiveNow", label: "Active Sessions", icon: <HiOutlineCircleStack className="w-6 h-6 text-blue-600" />, value: guestStats.activeNow },
    { key: "guestCreatedToday", label: "New Today", icon: <HiOutlineStar className="w-6 h-6 text-amber-600" />, value: guestStats.createdToday },
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <style jsx>{`
          .loading-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f7f9fc;
          }
          .spinner {
            width: 50px;
            height: 50px;
            border: 3px solid #e5e7eb;
            border-top: 3px solid #2563eb;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      {/* Info Banner about Guest Mode */}
      <div
        style={{
          background: "#dbeafe",
          border: "1px solid #93c5fd",
          borderRadius: "8px",
          padding: "1rem 1.5rem",
          marginBottom: "2rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <HiOutlineInformationCircle className="w-6 h-6 text-blue-600" />
        <div>
          <strong style={{ color: "#1e40af" }}>Guest Mode Active:</strong>
          <span style={{ color: "#1e40af", marginLeft: "0.5rem" }}>
            {guestStats.totalCreated} users have uploaded transcripts. {guestStats.activeNow} sessions currently active.
          </span>
        </div>
      </div>

      {/* 1. Metric Cards Grid */}
      <div className="stats-grid">
        {metricData.map((metric) => (
          <div key={metric.key} className="stat-card">
            <div className="card-top">
              <span className="card-icon">{metric.icon || getMetricIcon(metric.key)}</span>
              <div className="card-value">
                {metric.value !== undefined ? metric.value : stats[metric.key]}
              </div>
            </div>
            <div className="card-label">{metric.label}</div>
          </div>
        ))}
      </div>

      {/* 2. Charts and Lists Grid */}
      <div className="main-content-grid">
        {/* Scholarship Status Distribution Chart */}
        <div className="chart-panel">
          <h3 className="panel-title">
            Scholarship Status Distribution
          </h3>
          {scholarshipStatus.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={scholarshipStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={80} /* Smaller inner radius */
                    outerRadius={140} /* Smaller outer radius */
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value, percent }) =>
                      `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={{ stroke: "#9ca3af", strokeWidth: 1 }}
                  >
                    {scholarshipStatus.map((entry, index) => {
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={getStatusColors(entry.status)}
                        />
                      );
                    })}
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
                      <span className="legend-text">
                        {value}: {entry.payload.value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="chart-empty-state">
              <p>
                No scholarship data available yet. Add scholarships to see the
                distribution chart.
              </p>
            </div>
          )}
        </div>

        {/* Remove Recent Users and Recent Applications sections */}
        
        {/* Quick Actions Panel - Update layout */}
        <div className="quick-actions-panel">
            <h3 className="quick-actions-title">Quick Actions</h3>
            <div className="quick-actions-grid">
              <Link to="/admin/scholarships" className="action-link-card">
                <h4 className="action-card-title">Manage Scholarships</h4>
                <p className="action-card-text">
                  Add, edit, or remove scholarship opportunities
                </p>
              </Link>
              <Link to="/admin/reports" className="action-link-card">
                <h4 className="action-card-title">View Reports</h4>
                <p className="action-card-text">
                  Analyze scholarship status and performance metrics
                </p>
              </Link>
              <a 
                href="http://localhost:5000/api/health" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="action-link-card"
              >
                <h4 className="action-card-title">System Health</h4>
                <p className="action-card-text">
                  Check API server and database connection status
                </p>
              </a>
            </div>
          </div>
      </div>
      
      <style jsx>{`
        /* --- Layout Grids --- */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .main-content-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          grid-template-rows: auto;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        /* Adjusting grid layout for smaller screens */
        @media (max-width: 1024px) {
          .main-content-grid {
            grid-template-columns: 1fr; /* Single column stack */
          }
          .list-panel {
            grid-column: 1 / -1; /* Lists span full width */
          }
          .quick-actions-panel {
              grid-column: 1 / -1;
          }
          .quick-actions-grid {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          }
        }
        
        /* --- Stat Cards (Key Metrics) --- */
        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.04);
          transition: transform 0.2s, box-shadow 0.2s;
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
          font-size: 2.2rem; /* Slightly larger, bolder value */
          font-weight: 800;
          color: #1f2937; /* Darker text for importance */
        }
        
        .card-label {
            color: #6b7280;
            font-size: 0.95rem;
            font-weight: 600;
            letter-spacing: 0.01em;
        }

        /* --- Panels (Chart & Lists) --- */
        .chart-panel {
          grid-column: 1 / 2;
        }
        
        .list-panel, .chart-panel, .quick-actions-panel {
            background: white;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.04);
            overflow: hidden;
            height: fit-content;
        }
        
        .panel-title {
            padding: 1rem 1.5rem;
            margin: 0;
            border-bottom: 1px solid #e5e7eb;
            font-size: 1.1rem;
            font-weight: 700;
            color: #1f2937;
        }

        .chart-container {
            padding: 3rem 1.5rem;
        }
        
        .chart-empty-state {
            padding: 3rem 2rem;
            text-align: center;
            color: #6b7280;
        }
        
        .chart-empty-state p {
            margin: 0;
            font-size: 0.95rem;
        }

        /* Customizing chart text/legend for clarity */
        .legend-text {
            color: #6b7280;
            font-size: 0.9rem;
            font-weight: 500;
        }
        
        /* --- Recent Activity Lists --- */
        .list-body {
            padding: 0 1.5rem 1rem 1.5rem;
        }
        
        .list-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 0;
            border-bottom: 1px solid #f3f4f6;
            transition: background 0.2s;
        }
        
        .list-item:last-child {
            border-bottom: none;
        }
        
        .list-item:hover {
            background: #fcfcfd;
        }

        .user-details, .app-details {
            display: flex;
            flex-direction: column;
        }

        .user-name, .app-title {
            font-weight: 600;
            color: #1f2937;
            font-size: 0.95rem;
        }

        .user-email, .app-user-name {
            font-size: 0.8rem;
            color: #6b7280;
            margin-top: 0.125rem;
        }
        
        .item-date {
            font-size: 0.8rem;
            color: #6b7280;
            flex-shrink: 0;
        }

        /* --- Quick Actions --- */
        .quick-actions-panel {
          grid-column: 2 / 3;
          grid-row: 2 / 3; /* Position under Recent Users on large screens */
        }
        
        .quick-actions-title {
            font-size: 1.1rem;
            font-weight: 700;
            color: #1f2937;
            padding: 1rem 1.5rem;
            margin: 0;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .quick-actions-grid {
            display: grid;
            gap: 1rem;
            padding: 1.5rem;
            grid-template-columns: 1fr;
        }

        .action-link-card {
            display: block;
            padding: 1rem 1.5rem;
            background: #f9fafb; /* Light background for contrast */
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            text-decoration: none;
            color: inherit;
            transition: all 0.2s ease;
        }

        .action-link-card:hover {
            background: #ffffff;
            border-color: #2563eb;
            box-shadow: 0 4px 8px rgba(37, 99, 235, 0.1);
        }

        .action-card-title {
            margin: 0 0 0.5rem 0;
            color: #2563eb;
            font-weight: 700;
            font-size: 1rem;
        }

        .action-card-text {
            margin: 0;
            color: #6b7280;
            font-size: 0.85rem;
        }
      `}</style>
    </AdminLayout>
  );
};

export default AdminDashboard;