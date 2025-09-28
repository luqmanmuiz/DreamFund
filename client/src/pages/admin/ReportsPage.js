"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"
import AdminLayout from "../../components/AdminLayout"

const ReportsPage = () => {
  const { user, logout } = useAuth()
  const [stats, setStats] = useState({})
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
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2rem", fontWeight: "700", color: "#667eea" }}>{stats.totalUsers}</div>
          <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>Total Users</div>
        </div>
        <div
          style={{
            background: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2rem", fontWeight: "700", color: "#667eea" }}>{stats.totalScholarships}</div>
          <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>Total Scholarships</div>
        </div>
        <div
          style={{
            background: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2rem", fontWeight: "700", color: "#667eea" }}>{stats.activeScholarships}</div>
          <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>Active Scholarships</div>
        </div>
        <div
          style={{
            background: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2rem", fontWeight: "700", color: "#667eea" }}>{stats.totalApplications}</div>
          <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>Total Applications</div>
        </div>
      </div>

      {userAnalytics.usersByMonth && (
        <div
          style={{
            background: "white",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            marginBottom: "2rem",
            overflow: "hidden",
          }}
        >
          <h3
            style={{
              padding: "1rem 1.5rem",
              margin: 0,
              borderBottom: "1px solid #e5e7eb",
              fontSize: "1.1rem",
              fontWeight: "600",
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
                <span style={{ color: "#667eea", fontWeight: "600" }}>{data.count} users</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {userAnalytics.usersByMajor && (
        <div
          style={{
            background: "white",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            marginBottom: "2rem",
            overflow: "hidden",
          }}
        >
          <h3
            style={{
              padding: "1rem 1.5rem",
              margin: 0,
              borderBottom: "1px solid #e5e7eb",
              fontSize: "1.1rem",
              fontWeight: "600",
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
                    <div style={{ color: "#667eea", fontWeight: "600" }}>{data.count} students</div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{percentage}%</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div
        style={{
          background: "white",
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
          padding: "1.5rem",
        }}
      >
        <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", fontWeight: "600" }}>Export Data</h3>
        <p style={{ color: "#6b7280", marginBottom: "1.5rem", margin: 0 }}>
          Export platform data for external analysis or backup purposes.
        </p>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            marginTop: "1rem",
          }}
        >
          <button
            style={{
              padding: "0.75rem 1rem",
              background: "#f3f4f6",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Export Users (CSV)
          </button>
          <button
            style={{
              padding: "0.75rem 1rem",
              background: "#f3f4f6",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Export Scholarships (CSV)
          </button>
          <button
            style={{
              padding: "0.75rem 1rem",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Generate Full Report (PDF)
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}

export default ReportsPage
