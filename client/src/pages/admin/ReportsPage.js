"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"

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
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <h2>DreamFund Admin</h2>
        <nav>
          <ul className="admin-nav">
            <li>
              <Link to="/admin/dashboard">Dashboard</Link>
            </li>
            <li>
              <Link to="/admin/scholarships">Scholarships</Link>
            </li>
            <li>
              <Link to="/admin/users">Users</Link>
            </li>
            <li>
              <Link to="/admin/reports" className="active">
                Reports
              </Link>
            </li>
            <li>
              <button
                onClick={logout}
                style={{
                  background: "none",
                  border: "none",
                  color: "#d1d5db",
                  padding: "1rem 2rem",
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="admin-content">
        <div className="admin-header">
          <h1>Reports & Analytics</h1>
        </div>

        {/* Overview Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{stats.totalUsers}</div>
            <div className="stat-label">Total Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.totalScholarships}</div>
            <div className="stat-label">Total Scholarships</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.activeScholarships}</div>
            <div className="stat-label">Active Scholarships</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.totalApplications}</div>
            <div className="stat-label">Total Applications</div>
          </div>
        </div>

        {/* User Registration Trends */}
        {userAnalytics.usersByMonth && (
          <div className="card">
            <h3>User Registration Trends</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>New Users</th>
                  </tr>
                </thead>
                <tbody>
                  {userAnalytics.usersByMonth.map((data, index) => (
                    <tr key={index}>
                      <td>
                        {data._id.month}/{data._id.year}
                      </td>
                      <td>{data.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Popular Majors */}
        {userAnalytics.usersByMajor && (
          <div className="card">
            <h3>Popular Majors</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Major</th>
                    <th>Number of Students</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {userAnalytics.usersByMajor.map((data, index) => {
                    const percentage = ((data.count / stats.totalUsers) * 100).toFixed(1)
                    return (
                      <tr key={index}>
                        <td>{data._id}</td>
                        <td>{data.count}</td>
                        <td>{percentage}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Platform Health */}
        <div className="card">
          <h3>Platform Health Metrics</h3>
          <div className="grid grid-2">
            <div>
              <h4>User Engagement</h4>
              <ul style={{ listStyle: "none", padding: 0 }}>
                <li style={{ marginBottom: "0.5rem" }}>
                  <strong>Application Rate:</strong>{" "}
                  {stats.totalApplications && stats.totalUsers
                    ? (stats.totalApplications / stats.totalUsers).toFixed(1)
                    : 0}{" "}
                  applications per user
                </li>
                <li style={{ marginBottom: "0.5rem" }}>
                  <strong>Active Scholarships:</strong> {stats.activeScholarships} out of {stats.totalScholarships}
                </li>
                <li style={{ marginBottom: "0.5rem" }}>
                  <strong>Scholarship Utilization:</strong>{" "}
                  {stats.totalScholarships > 0
                    ? ((stats.totalApplications / stats.totalScholarships) * 100).toFixed(1)
                    : 0}
                  %
                </li>
              </ul>
            </div>
            <div>
              <h4>System Status</h4>
              <ul style={{ listStyle: "none", padding: 0 }}>
                <li style={{ marginBottom: "0.5rem", color: "#10b981" }}>
                  <strong>✓ Database:</strong> Connected
                </li>
                <li style={{ marginBottom: "0.5rem", color: "#10b981" }}>
                  <strong>✓ API:</strong> Operational
                </li>
                <li style={{ marginBottom: "0.5rem", color: "#10b981" }}>
                  <strong>✓ File Upload:</strong> Working
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="card">
          <h3>Export Data</h3>
          <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
            Export platform data for external analysis or backup purposes.
          </p>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <button className="btn btn-secondary">Export Users (CSV)</button>
            <button className="btn btn-secondary">Export Scholarships (CSV)</button>
            <button className="btn btn-secondary">Export Applications (CSV)</button>
            <button className="btn btn-primary">Generate Full Report (PDF)</button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ReportsPage
