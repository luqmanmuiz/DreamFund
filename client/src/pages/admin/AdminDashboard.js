"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"

const AdminDashboard = () => {
  const { user, logout } = useAuth()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalScholarships: 0,
    activeScholarships: 0,
    totalApplications: 0,
  })
  const [recentUsers, setRecentUsers] = useState([])
  const [recentApplications, setRecentApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get("/api/reports/stats")
        setStats(response.data.stats)
        setRecentUsers(response.data.recentUsers)
        setRecentApplications(response.data.recentApplications)
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

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
              <Link to="/admin/dashboard" className="active">
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/admin/scholarships">Scholarships</Link>
            </li>
            <li>
              <Link to="/admin/users">Users</Link>
            </li>
            <li>
              <Link to="/admin/reports">Reports</Link>
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
          <h1>Dashboard</h1>
          <p>Welcome back, {user?.name}</p>
        </div>

        {/* Stats Cards */}
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

        {/* Recent Activity */}
        <div className="grid grid-2">
          {/* Recent Users */}
          <div className="table-container">
            <h3 style={{ padding: "1rem", margin: 0, borderBottom: "1px solid #e5e7eb" }}>Recent Users</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recent Applications */}
          <div className="table-container">
            <h3 style={{ padding: "1rem", margin: 0, borderBottom: "1px solid #e5e7eb" }}>Recent Applications</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Scholarship</th>
                  <th>Applicant</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentApplications.map((app, index) => (
                  <tr key={index}>
                    <td>{app.title}</td>
                    <td>{app.user[0]?.name || "Unknown"}</td>
                    <td>{formatDate(app.applicants.appliedDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ marginTop: "2rem" }}>
          <h3>Quick Actions</h3>
          <div className="grid grid-3">
            <Link to="/admin/scholarships" className="card" style={{ textDecoration: "none", color: "inherit" }}>
              <h4>📚 Manage Scholarships</h4>
              <p>Add, edit, or remove scholarship opportunities</p>
            </Link>
            <Link to="/admin/users" className="card" style={{ textDecoration: "none", color: "inherit" }}>
              <h4>👥 Manage Users</h4>
              <p>View and manage user accounts and profiles</p>
            </Link>
            <Link to="/admin/reports" className="card" style={{ textDecoration: "none", color: "inherit" }}>
              <h4>📊 View Reports</h4>
              <p>Analyze platform usage and performance metrics</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard
