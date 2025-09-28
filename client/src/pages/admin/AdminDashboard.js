"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"
import AdminLayout from "../../components/AdminLayout"

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
    <AdminLayout title="Dashboard">
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "2rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
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
            Recent Users
          </h3>
          <div style={{ padding: "1rem" }}>
            {recentUsers.map((user) => (
              <div
                key={user._id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.75rem 0",
                  borderBottom: "1px solid #f3f4f6",
                }}
              >
                <div>
                  <div style={{ fontWeight: "500" }}>{user.name}</div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{user.email}</div>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{formatDate(user.createdAt)}</div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
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
            Recent Applications
          </h3>
          <div style={{ padding: "1rem" }}>
            {recentApplications.map((app, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.75rem 0",
                  borderBottom: "1px solid #f3f4f6",
                }}
              >
                <div>
                  <div style={{ fontWeight: "500" }}>{app.title}</div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{app.user[0]?.name || "Unknown"}</div>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{formatDate(app.applicants.appliedDate)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 style={{ marginBottom: "1rem", fontSize: "1.2rem", fontWeight: "600" }}>Quick Actions</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1rem",
          }}
        >
          <Link
            to="/admin/scholarships"
            style={{
              display: "block",
              padding: "1.5rem",
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#667eea" }}>Manage Scholarships</h4>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              Add, edit, or remove scholarship opportunities
            </p>
          </Link>
          <Link
            to="/admin/users"
            style={{
              display: "block",
              padding: "1.5rem",
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#667eea" }}>Manage Users</h4>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              View and manage user accounts and profiles
            </p>
          </Link>
          <Link
            to="/admin/reports"
            style={{
              display: "block",
              padding: "1.5rem",
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#667eea" }}>View Reports</h4>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              Analyze platform usage and performance metrics
            </p>
          </Link>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminDashboard
