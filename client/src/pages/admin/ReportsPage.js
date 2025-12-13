"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"
import AdminLayout from "../../components/AdminLayout"
import { HiOutlineInformationCircle, HiOutlineChartBarSquare, HiOutlineDocumentArrowDown } from "react-icons/hi2"

const ReportsPage = () => {
  const { user, logout } = useAuth()
  const [stats, setStats] = useState({})
  const [guestStats, setGuestStats] = useState(null)
  const [userAnalytics, setUserAnalytics] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [statsResponse, analyticsResponse] = await Promise.all([
          axios.get("/api/reports/stats"),
          axios.get("/api/reports/users"),
        ])

        setStats(statsResponse.data.stats)
        setGuestStats(statsResponse.data.guestStats)
        setUserAnalytics(analyticsResponse.data)
      } catch (error) {
        console.error("Failed to fetch reports:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [])

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <AdminLayout title="Reports & Analytics">
      {/* Guest Mode Banner */}
      {userAnalytics.guestMode && (
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
              System operates without user registration. All analytics below show guest session data.
            </span>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "1.5rem",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            textAlign: "center",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontSize: "2.5rem", fontWeight: "800", color: "#2563eb", marginBottom: "0.5rem" }}>
            {stats.totalScholarships || 0}
          </div>
          <div style={{ color: "#6b7280", fontSize: "0.9rem", fontWeight: "600" }}>Total Scholarships</div>
        </div>
        
        <div
          style={{
            background: "white",
            padding: "1.5rem",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            textAlign: "center",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontSize: "2.5rem", fontWeight: "800", color: "#10b981", marginBottom: "0.5rem" }}>
            {stats.activeScholarships || 0}
          </div>
          <div style={{ color: "#6b7280", fontSize: "0.9rem", fontWeight: "600" }}>Active Scholarships</div>
        </div>

        {guestStats && (
          <>
            <div
              style={{
                background: "white",
                padding: "1.5rem",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                textAlign: "center",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ fontSize: "2.5rem", fontWeight: "800", color: "#f59e0b", marginBottom: "0.5rem" }}>
                {guestStats.totalCreated}
              </div>
              <div style={{ color: "#6b7280", fontSize: "0.9rem", fontWeight: "600" }}>Total Guest Users</div>
            </div>

            <div
              style={{
                background: "white",
                padding: "1.5rem",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                textAlign: "center",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ fontSize: "2.5rem", fontWeight: "800", color: "#8b5cf6", marginBottom: "0.5rem" }}>
                {guestStats.activeNow}
              </div>
              <div style={{ color: "#6b7280", fontSize: "0.9rem", fontWeight: "600" }}>Active Sessions</div>
            </div>
          </>
        )}
      </div>

      {/* Guest Analytics Section */}
      {guestStats && userAnalytics.guestMode && (
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
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <HiOutlineChartBarSquare className="w-6 h-6 text-blue-600" />
            Guest Session Analytics
          </h3>
          <div style={{ padding: "2rem" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "2rem",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "3rem",
                    fontWeight: "800",
                    color: "#2563eb",
                    marginBottom: "0.5rem",
                  }}
                >
                  {guestStats.totalCreated}
                </div>
                <div style={{ color: "#6b7280", fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                  Total Guests Created
                </div>
                <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
                  All-time count of transcript uploads
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: "3rem",
                    fontWeight: "800",
                    color: "#10b981",
                    marginBottom: "0.5rem",
                  }}
                >
                  {guestStats.activeNow}
                </div>
                <div style={{ color: "#6b7280", fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                  Active Sessions
                </div>
                <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
                  Currently active guest sessions
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: "3rem",
                    fontWeight: "800",
                    color: "#f59e0b",
                    marginBottom: "0.5rem",
                  }}
                >
                  {guestStats.createdToday}
                </div>
                <div style={{ color: "#6b7280", fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                  Created Today
                </div>
                <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
                  New uploads in the last 24 hours
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: "3rem",
                    fontWeight: "800",
                    color: "#6b7280",
                    marginBottom: "0.5rem",
                  }}
                >
                  {guestStats.totalExpired}
                </div>
                <div style={{ color: "#6b7280", fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                  Expired Sessions
                </div>
                <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
                  Sessions that have expired (24h+)
                </div>
              </div>
            </div>

            {/* Session Retention Info */}
            <div
              style={{
                marginTop: "2rem",
                padding: "1.5rem",
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: "8px",
              }}
            >
              <h4 style={{ margin: "0 0 1rem 0", color: "#0369a1", fontSize: "1.1rem", fontWeight: "700" }}>
                💡 Session Retention Insights
              </h4>
              <div style={{ display: "grid", gap: "0.75rem", color: "#075985", fontSize: "0.95rem" }}>
                <div>
                  <strong>Retention Rate:</strong>{" "}
                  {guestStats.totalCreated > 0
                    ? ((guestStats.activeNow / guestStats.totalCreated) * 100).toFixed(1)
                    : 0}%
                  <span style={{ marginLeft: "0.5rem", color: "#0891b2" }}>
                    ({guestStats.activeNow} active / {guestStats.totalCreated} total)
                  </span>
                </div>
                <div>
                  <strong>Expiration Rate:</strong>{" "}
                  {guestStats.totalCreated > 0
                    ? ((guestStats.totalExpired / guestStats.totalCreated) * 100).toFixed(1)
                    : 0}%
                  <span style={{ marginLeft: "0.5rem", color: "#0891b2" }}>
                    ({guestStats.totalExpired} expired / {guestStats.totalCreated} total)
                  </span>
                </div>
                <div>
                  <strong>Today's Activity:</strong>{" "}
                  {guestStats.createdToday} new sessions
                  <span style={{ marginLeft: "0.5rem", color: "#0891b2" }}>
                    (Last reset: {guestStats.lastResetDate})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show User Analytics Only If Not Guest Mode */}
      {!userAnalytics.guestMode && userAnalytics.usersByMonth && (
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
            User Registration Trends
          </h3>
          <div style={{ padding: "1rem" }}>
            {userAnalytics.usersByMonth.map((data, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.75rem 0",
                  borderBottom: index < userAnalytics.usersByMonth.length - 1 ? "1px solid #f3f4f6" : "none",
                }}
              >
                <span style={{ fontWeight: "500" }}>
                  {data._id.month}/{data._id.year}
                </span>
                <span style={{ color: "#2563eb", fontWeight: "600" }}>{data.count} users</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!userAnalytics.guestMode && userAnalytics.usersByMajor && (
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
            Popular Majors
          </h3>
          <div style={{ padding: "1rem" }}>
            {userAnalytics.usersByMajor.map((data, index) => {
              const percentage = ((data.count / stats.totalUsers) * 100).toFixed(1)
              return (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem 0",
                    borderBottom: index < userAnalytics.usersByMajor.length - 1 ? "1px solid #f3f4f6" : "none",
                  }}
                >
                  <span style={{ fontWeight: "500" }}>{data._id}</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "#2563eb", fontWeight: "600" }}>{data.count} students</div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{percentage}%</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Export Section */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          padding: "2rem",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        }}
      >
        <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.25rem", fontWeight: "700", color: "#1f2937" }}>
          Export Data
        </h3>
        <p style={{ color: "#6b7280", marginBottom: "1.5rem", margin: 0 }}>
          Export platform data for external analysis or backup purposes.
        </p>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            marginTop: "1.5rem",
          }}
        >
          {!userAnalytics.guestMode && (
            <button
              style={{
                padding: "0.875rem 1.5rem",
                background: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "0.95rem",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#e5e7eb"
                e.target.style.borderColor = "#9ca3af"
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "#f3f4f6"
                e.target.style.borderColor = "#d1d5db"
              }}
            >
              📥 Export Users (CSV)
            </button>
          )}
          
          {userAnalytics.guestMode && (
            <button
              style={{
                padding: "0.875rem 1.5rem",
                background: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "0.95rem",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#e5e7eb"
                e.target.style.borderColor = "#9ca3af"
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "#f3f4f6"
                e.target.style.borderColor = "#d1d5db"
              }}
            >
              📥 Export Guest Analytics (CSV)
            </button>
          )}

          <button
            style={{
              padding: "0.875rem 1.5rem",
              background: "#f3f4f6",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "0.95rem",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#e5e7eb"
              e.target.style.borderColor = "#9ca3af"
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#f3f4f6"
              e.target.style.borderColor = "#d1d5db"
            }}
          >
            📥 Export Scholarships (CSV)
          </button>

          <button
            style={{
              padding: "0.875rem 1.5rem",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "0.95rem",
              transition: "all 0.3s",
              boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#1d4ed8"
              e.target.style.transform = "translateY(-2px)"
              e.target.style.boxShadow = "0 4px 8px rgba(37, 99, 235, 0.3)"
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#2563eb"
              e.target.style.transform = "translateY(0)"
              e.target.style.boxShadow = "0 2px 4px rgba(37, 99, 235, 0.2)"
            }}
          >
            <HiOutlineDocumentArrowDown className="w-5 h-5 inline" style={{ marginRight: '0.5rem' }} />
            Generate Full Report (PDF)
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}

export default ReportsPage
