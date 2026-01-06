"use client";

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useScholarships } from "../../contexts/ScholarshipContext";
import axios from "axios";
import AdminLayout from "../../components/AdminLayout";
import {
  HiOutlineUsers,
  HiOutlineChartBar,
  HiOutlineCheckBadge,
  HiOutlineAcademicCap,
  HiOutlineCursorArrowRays,
  HiOutlineSparkles,
  HiOutlineBookOpen,
  HiOutlineClock,
} from "react-icons/hi2";

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const { scholarships, fetchScholarships } = useScholarships();

  // --- State Management ---
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
    totalExpired: 0,
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);
  const [scholarshipStatus, setScholarshipStatus] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Helper Functions ---

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
      if (dl.getTime() < todayMidnightUtc.getTime()) return "inactive";
    }

    return String(scholarship.status || "active").toLowerCase() === "inactive"
      ? "inactive"
      : "active";
  };

  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getDeadlineUrgency = (deadline) => {
    const now = new Date();
    const diffMs = deadline - now;
    const diffDays = Math.ceil(diffMs / 86400000);

    if (diffDays <= 7) return "urgent"; // red
    if (diffDays <= 14) return "soon"; // amber
    return "upcoming"; // blue
  };

  const formatDeadline = (deadline) => {
    return deadline.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // --- Data Fetching ---

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

        setStats((prev) => ({
          ...prev,
          totalUsers: statsResponse.data.stats.totalUsers,
          totalApplications: statsResponse.data.stats.totalApplications,
        }));

        if (statsResponse.data.guestStats) {
          setGuestStats(statsResponse.data.guestStats);
        }

        if (statsResponse.data.recentActivity) {
          setRecentActivity(statsResponse.data.recentActivity);
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
      } else if (status === "inactive") {
        const deadlineValue =
          scholarship.deadline || scholarship.extractedDeadline;
        const deadlineDate = tryParseDeadline(deadlineValue);
        const isExpired =
          deadlineDate && deadlineDate.getTime() < new Date().getTime();

        if (isExpired) {
          counts.inactive++;
        } else {
          counts.missingStudyLevel++;
        }
      } else {
        counts.missingStudyLevel++;
      }
    });

    setStats((prev) => ({
      ...prev,
      totalScholarships: counts.all,
      activeScholarships: counts.active,
    }));

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

    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    const upcoming = scholarships
      .map((s) => ({
        ...s,
        parsedDeadline: tryParseDeadline(s.deadline || s.extractedDeadline),
      }))
      .filter((s) => {
        if (!s.parsedDeadline) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return (
          s.parsedDeadline >= today && s.parsedDeadline <= thirtyDaysFromNow
        );
      })
      .sort((a, b) => a.parsedDeadline - b.parsedDeadline)
      .slice(0, 10);

    setUpcomingDeadlines(upcoming);
  }, [scholarships]);

  // --- Configuration: Metric Cards ---
  const metricData = [
    {
      key: "totalScholarships",
      label: "Total Scholarships",
      value: stats.totalScholarships,
      icon: <HiOutlineAcademicCap />,
      theme: { bg: "#eff6ff", text: "#2563eb" },
    },
    {
      key: "activeScholarships",
      label: "Active Scholarships",
      value: stats.activeScholarships,
      icon: <HiOutlineCheckBadge />,
      theme: { bg: "#ecfdf5", text: "#059669" },
    },
    {
      key: "guestTotalCreated",
      label: "Total Guest Users",
      value: guestStats.totalCreated,
      icon: <HiOutlineUsers />,
      theme: { bg: "#f3e8ff", text: "#9333ea" },
    },
    {
      key: "guestActiveNow",
      label: "Active Sessions",
      value: guestStats.activeNow,
      icon: <HiOutlineCursorArrowRays />,
      theme: { bg: "#e0e7ff", text: "#4f46e5" },
    },
    {
      key: "guestCreatedToday",
      label: "New Today",
      value: guestStats.createdToday,
      icon: <HiOutlineSparkles />,
      theme: { bg: "#fffbeb", text: "#d97706" },
    },
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
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      {/* 1. Metric Cards Grid */}
      <div className="stats-grid">
        {metricData.map((metric) => (
          <div key={metric.key} className="stat-card">
            <div
              className="icon-box"
              style={{
                backgroundColor: metric.theme.bg,
                color: metric.theme.text,
              }}
            >
              <div className="icon-size">{metric.icon}</div>
            </div>
            <div className="stat-info">
              <div className="stat-label">{metric.label}</div>
              <div className="stat-value">
                {metric.value !== undefined ? metric.value : "..."}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Widgets Grid */}
      <div className="widgets-grid">
        {/* Recent Activity Feed */}
        <div className="widget-card">
          <div className="widget-header">
            <h3 className="widget-title">
              <HiOutlineChartBar className="w-5 h-5 text-gray-500" />
              Recent Activity
            </h3>
            <span className="widget-badge">Real-time</span>
          </div>

          <div className="activity-feed custom-scrollbar">
            {recentActivity.length > 0 ? (
              <div className="timeline-container">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="timeline-item">
                    <div className="timeline-connector"></div>
                    <div
                      className={`timeline-marker marker-${
                        activity.type === "guest_created"
                          ? "blue"
                          : activity.type === "scholarship_added"
                          ? "green"
                          : "purple"
                      }`}
                    >
                      {activity.type === "guest_created" && <HiOutlineUsers />}
                      {activity.type === "scholarship_clicked" && (
                        <HiOutlineCursorArrowRays />
                      )}
                      {activity.type === "scholarship_added" && (
                        <HiOutlineBookOpen />
                      )}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-action">
                          {activity.type === "guest_created" &&
                            "New Guest Session"}
                          {activity.type === "scholarship_clicked" &&
                            "Scholarship Interest"}
                          {activity.type === "scholarship_added" &&
                            "System Update"}
                        </span>
                        <span className="timeline-time">
                          {getRelativeTime(activity.timestamp)}
                        </span>
                      </div>
                      <div className="timeline-body">
                        {activity.type === "guest_created" && (
                          <span>
                            <span className="font-semibold text-slate-800">
                              {activity.data.name}
                            </span>{" "}
                            started looking for{" "}
                            <span className="text-slate-600">
                              {activity.data.program || "scholarships"}
                            </span>
                            .
                          </span>
                        )}
                        {activity.type === "scholarship_clicked" && (
                          <span>
                            User viewed{" "}
                            <span className="font-semibold text-blue-600">
                              {activity.data.scholarshipTitle}
                            </span>
                          </span>
                        )}
                        {activity.type === "scholarship_added" && (
                          <span>
                            Added{" "}
                            <span className="font-semibold text-green-600">
                              {activity.data.title}
                            </span>{" "}
                            to the database.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No recent activity recorded.</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines Widget */}
        <div className="widget-card">
          <div className="widget-header">
            <h3 className="widget-title">
              <HiOutlineClock className="w-5 h-5 text-gray-500" />
              Upcoming Deadlines
            </h3>
            <span className="widget-badge bg-blue-50 text-blue-600">
              Next 30 Days
            </span>
          </div>

          <div className="deadlines-list custom-scrollbar">
            {upcomingDeadlines.length > 0 ? (
              <div className="deadlines-container">
                {upcomingDeadlines.map((scholarship, index) => {
                  const urgency = getDeadlineUrgency(
                    scholarship.parsedDeadline
                  );
                  const daysLeft = Math.ceil(
                    (scholarship.parsedDeadline - new Date()) / 86400000
                  );

                  return (
                    <div key={index} className="deadline-card">
                      <div className="deadline-info">
                        <Link
                          to="/admin/scholarships"
                          className="deadline-link"
                        >
                          {scholarship.title}
                        </Link>
                        <div className="deadline-meta">
                          <span className="deadline-date">
                            {formatDeadline(scholarship.parsedDeadline)}
                          </span>
                          <span className="deadline-provider text-truncate">
                            • {scholarship.provider?.name || "Various"}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`deadline-status-badge status-${urgency}`}
                      >
                        <HiOutlineClock className="w-3.5 h-3.5" />
                        <span>{daysLeft} days left</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon-bg">
                  <HiOutlineCheckBadge className="w-6 h-6 text-green-500" />
                </div>
                <p>No urgent deadlines!</p>
                <span className="empty-sub">
                  All scholarships are either active for >30 days or expired.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        /* --- Grid Layouts --- */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .widgets-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        /* --- Stat Cards --- */
        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          display: flex;
          align-items: center;
          gap: 1.25rem;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
        }
        .icon-box {
          width: 56px;
          height: 56px;
          border-radius: 14px;
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
        }
        .stat-value {
          color: #0f172a;
          font-size: 1.875rem;
          font-weight: 800;
          line-height: 1.2;
        }

        /* --- Widget Containers --- */
        .widget-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          height: 650px; /* Fixed height for Desktop */
        }

        .widget-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fff;
          flex-shrink: 0;
        }

        .widget-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
        }

        .widget-badge {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.25rem 0.75rem;
          border-radius: 99px;
          background: #f1f5f9;
          color: #64748b;
        }

        .activity-feed,
        .deadlines-list {
          padding: 1rem;
          flex: 1;
          overflow-y: auto;
        }

        /* Scrollbar Styling */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }

        /* --- Timeline Styles --- */
        .timeline-container {
          padding: 1.5rem 1.5rem 0 1.5rem;
        }

        .timeline-item {
          position: relative;
          padding-left: 2rem;
          padding-bottom: 2rem;
        }
        .timeline-item:last-child {
          padding-bottom: 0;
        }

        .timeline-connector {
          position: absolute;
          left: 11px;
          top: 6px;
          bottom: 0;
          width: 2px;
          background-color: #e2e8f0;
        }
        .timeline-item:last-child .timeline-connector {
          display: none;
        }

        .timeline-marker {
          position: absolute;
          left: 0;
          top: 0;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          z-index: 10;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        .marker-blue {
          background-color: #dbeafe;
          color: #2563eb;
        }
        .marker-purple {
          background-color: #f3e8ff;
          color: #9333ea;
        }
        .marker-green {
          background-color: #dcfce7;
          color: #16a34a;
        }

        .timeline-content {
          margin-top: -2px;
        }

        .timeline-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.25rem;
        }

        .timeline-action {
          font-size: 0.8rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .timeline-time {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 500;
        }

        .timeline-body {
          font-size: 0.9rem;
          color: #334155;
          line-height: 1.5;
        }

        /* --- Deadline List Styles --- */
        .deadlines-container {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .deadline-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s ease;
        }
        .deadline-card:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
          transform: translateX(2px);
        }

        .deadline-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          overflow: hidden;
        }

        .deadline-link {
          font-weight: 600;
          color: #1e293b;
          text-decoration: none;
          font-size: 0.95rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 250px;
        }
        .deadline-link:hover {
          color: #2563eb;
        }

        .deadline-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #64748b;
        }

        .text-truncate {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 150px;
        }

        .deadline-status-badge {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .status-urgent {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }
        .status-soon {
          background: #fffbeb;
          color: #d97706;
          border: 1px solid #fde68a;
        }
        .status-upcoming {
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #bfdbfe;
        }

        /* --- Empty States --- */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          padding: 2rem;
          color: #94a3b8;
        }
        .empty-icon-bg {
          width: 48px;
          height: 48px;
          background: #f0fdf4;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }
        .empty-state p {
          margin: 0;
          font-weight: 600;
          color: #475569;
        }
        .empty-sub {
          font-size: 0.8rem;
          margin-top: 0.5rem;
          max-width: 200px;
        }

        /* --- RESPONSIVE / MOBILE STYLES --- */
        @media (max-width: 1024px) {
          .widgets-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          /* Stack stats in one column or narrow 2-col on small tablets */
          .stats-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          /* Let widgets breathe on mobile, don't force fixed 650px height */
          .widget-card {
            height: auto;
            min-height: 400px;
            max-height: 600px;
          }

          /* Stack deadline content vertically so long titles don't crash into badges */
          .deadline-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          /* Allow full width for text */
          .deadline-link {
            max-width: 100%;
            white-space: normal; /* allow wrapping */
          }

          .deadline-status-badge {
            align-self: flex-start;
          }

          /* Adjust timeline padding for smaller screens */
          .timeline-container {
            padding: 1rem;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default AdminDashboard;