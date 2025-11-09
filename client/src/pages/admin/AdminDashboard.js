"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"
import AdminLayout from "../../components/AdminLayout"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

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
  const [scholarshipStatus, setScholarshipStatus] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const statsResponse = await axios.get("/api/reports/stats")
        setStats(statsResponse.data.stats)
        setRecentUsers(statsResponse.data.recentUsers)
        setRecentApplications(statsResponse.data.recentApplications)
        
        // Try to fetch scholarship status data
        try {
          const statusResponse = await axios.get("/api/reports/scholarship-status")
          console.log("Raw status response:", statusResponse.data)
          
          // Process scholarship status data for the chart
          const statusData = statusResponse.data.statusDistribution.map((item) => ({
            name: item._id === "active" ? "Active" : item._id === "inactive" ? "Inactive" : "Draft",
            value: item.count,
            status: item._id,
          }))
          
          // Add expired scholarships if any
          if (statusResponse.data.expiredCount > 0) {
            statusData.push({
              name: "Expired",
              value: statusResponse.data.expiredCount,
              status: "expired",
            })
          }
          
          console.log("Processed scholarship status data:", statusData)
          setScholarshipStatus(statusData)
        } catch (statusError) {
          console.error("Failed to fetch scholarship status:", statusError)
          console.error("Status error details:", statusError.response?.data || statusError.message)
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
        console.error("Error details:", error.response?.data || error.message)
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
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
          }}
        >
          <div style={{ fontSize: "2rem", fontWeight: "700", color: "#2563eb" }}>{stats.totalUsers}</div>
          <div style={{ color: "#6b7280", fontSize: "0.9rem", fontWeight: "500" }}>Total Users</div>
        </div>
        <div
          style={{
            background: "white",
            padding: "1.5rem",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
          }}
        >
          <div style={{ fontSize: "2rem", fontWeight: "700", color: "#2563eb" }}>{stats.totalScholarships}</div>
          <div style={{ color: "#6b7280", fontSize: "0.9rem", fontWeight: "500" }}>Total Scholarships</div>
        </div>
        <div
          style={{
            background: "white",
            padding: "1.5rem",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
          }}
        >
          <div style={{ fontSize: "2rem", fontWeight: "700", color: "#2563eb" }}>{stats.activeScholarships}</div>
          <div style={{ color: "#6b7280", fontSize: "0.9rem", fontWeight: "500" }}>Active Scholarships</div>
        </div>
        <div
          style={{
            background: "white",
            padding: "1.5rem",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
          }}
        >
          <div style={{ fontSize: "2rem", fontWeight: "700", color: "#2563eb" }}>{stats.totalApplications}</div>
          <div style={{ color: "#6b7280", fontSize: "0.9rem", fontWeight: "500" }}>Total Applications</div>
        </div>
      </div>

      {/* Scholarship Status Distribution Chart */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          marginBottom: "2rem",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
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
            color: "#111827",
          }}
        >
          Scholarship Status Distribution
        </h3>
        {scholarshipStatus.length > 0 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "3rem 2rem",
            }}
          >
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={scholarshipStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={100}
                  outerRadius={150}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: "#6b7280", strokeWidth: 1 }}
                >
                  {scholarshipStatus.map((entry, index) => {
                    const colors = {
                      active: "#2563eb",
                      inactive: "#6b7280",
                      draft: "#f59e0b",
                      expired: "#ef4444",
                    }
                    return <Cell key={`cell-${index}`} fill={colors[entry.status] || "#2563eb"} />
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
                    <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                      {value}: {entry.payload.value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div
            style={{
              padding: "3rem 2rem",
              textAlign: "center",
              color: "#6b7280",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.95rem" }}>
              No scholarship data available yet. Add scholarships to see the distribution chart.
            </p>
          </div>
        )}
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
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
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
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#2563eb", fontWeight: "700" }}>Manage Scholarships</h4>
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
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#2563eb", fontWeight: "700" }}>Manage Users</h4>
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
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#2563eb", fontWeight: "700" }}>View Reports</h4>
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
