"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"
import AdminLayout from "../../components/AdminLayout"

const UserManagement = () => {
  const { user, logout } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [selectedUser, setSelectedUser] = useState(null)
  const [showUserDetails, setShowUserDetails] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await axios.get("/api/users")
      setUsers(response.data)
    } catch (error) {
      setMessage("Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await axios.delete(`/api/users/${userId}`)
        setUsers(users.filter((u) => u._id !== userId))
        setMessage("User deleted successfully!")
      } catch (error) {
        setMessage("Failed to delete user")
      }
    }
  }

  const viewUserDetails = async (userId) => {
    try {
      const response = await axios.get(`/api/users/${userId}`)
      setSelectedUser(response.data)
      setShowUserDetails(true)
    } catch (error) {
      setMessage("Failed to fetch user details")
    }
  }

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

  const headerActions = <span style={{ color: "#6b7280", fontWeight: "500" }}>Total Users: {users.length}</span>

  return (
    <AdminLayout title="User Management" headerActions={headerActions}>
      {message && (
        <div
          style={{
            padding: "0.75rem",
            marginBottom: "1rem",
            backgroundColor: message.includes("success") ? "#d1fae5" : "#fee2e2",
            color: message.includes("success") ? "#065f46" : "#991b1b",
            borderRadius: "6px",
            fontSize: "0.9rem",
          }}
        >
          {message}
        </div>
      )}

      {showUserDetails && selectedUser && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowUserDetails(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              width: "90%",
              maxWidth: "600px",
              maxHeight: "80vh",
              overflow: "auto",
              padding: "2rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "600" }}>User Details</h3>
              <button
                onClick={() => setShowUserDetails(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#6b7280",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <strong>Name:</strong> {selectedUser.name}
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <strong>Email:</strong> {selectedUser.email}
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <strong>Role:</strong> {selectedUser.role}
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <strong>Joined:</strong> {formatDate(selectedUser.createdAt)}
            </div>

            {selectedUser.profile && (
              <div style={{ marginTop: "1.5rem" }}>
                <h4 style={{ marginBottom: "1rem" }}>Profile Information</h4>
                <div style={{ marginBottom: "0.5rem" }}>
                  <strong>Age:</strong> {selectedUser.profile.age || "Not provided"}
                </div>
                <div style={{ marginBottom: "0.5rem" }}>
                  <strong>GPA:</strong> {selectedUser.profile.gpa || "Not provided"}
                </div>
                <div style={{ marginBottom: "0.5rem" }}>
                  <strong>Major:</strong> {selectedUser.profile.major || "Not provided"}
                </div>
                <div style={{ marginBottom: "0.5rem" }}>
                  <strong>University:</strong> {selectedUser.profile.university || "Not provided"}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          background: "white",
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f9fafb" }}>
                <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600" }}>Name</th>
                <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600" }}>Email</th>
                <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600" }}>Role</th>
                <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600" }}>Joined</th>
                <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600" }}>Profile</th>
                <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((userData) => (
                <tr key={userData._id} style={{ borderTop: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "1rem", fontWeight: "500" }}>{userData.name}</td>
                  <td style={{ padding: "1rem", color: "#6b7280" }}>{userData.email}</td>
                  <td style={{ padding: "1rem" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.75rem",
                        borderRadius: "12px",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        backgroundColor: userData.role === "admin" ? "#fef3c7" : "#d1fae5",
                        color: userData.role === "admin" ? "#92400e" : "#065f46",
                      }}
                    >
                      {userData.role}
                    </span>
                  </td>
                  <td style={{ padding: "1rem", color: "#6b7280" }}>{formatDate(userData.createdAt)}</td>
                  <td style={{ padding: "1rem" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.75rem",
                        borderRadius: "12px",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        backgroundColor: userData.profile?.major ? "#d1fae5" : "#fee2e2",
                        color: userData.profile?.major ? "#065f46" : "#991b1b",
                      }}
                    >
                      {userData.profile?.major ? "Complete" : "Incomplete"}
                    </span>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => viewUserDetails(userData._id)}
                        style={{
                          padding: "0.5rem 0.75rem",
                          background: "#f3f4f6",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                        }}
                      >
                        View
                      </button>
                      {userData.role !== "admin" && (
                        <button
                          onClick={() => handleDeleteUser(userData._id)}
                          style={{
                            padding: "0.5rem 0.75rem",
                            background: "#ef4444",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
}

export default UserManagement
