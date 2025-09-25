"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"

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
              <Link to="/admin/users" className="active">
                Users
              </Link>
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
          <h1>User Management</h1>
          <div>
            <span style={{ color: "#6b7280" }}>Total Users: {users.length}</span>
          </div>
        </div>

        {message && (
          <div className={`alert ${message.includes("success") ? "alert-success" : "alert-error"}`}>{message}</div>
        )}

        {/* User Details Modal */}
        {showUserDetails && selectedUser && (
          <div className="modal-overlay" onClick={() => setShowUserDetails(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="card" style={{ margin: 0, maxWidth: "600px", maxHeight: "80vh", overflow: "auto" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1rem",
                  }}
                >
                  <h3>User Details</h3>
                  <button
                    onClick={() => setShowUserDetails(false)}
                    style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer" }}
                  >
                    ×
                  </button>
                </div>

                <div className="form-row">
                  <div>
                    <strong>Name:</strong> {selectedUser.name}
                  </div>
                  <div>
                    <strong>Email:</strong> {selectedUser.email}
                  </div>
                </div>

                <div className="form-row" style={{ marginTop: "1rem" }}>
                  <div>
                    <strong>Role:</strong> {selectedUser.role}
                  </div>
                  <div>
                    <strong>Joined:</strong> {formatDate(selectedUser.createdAt)}
                  </div>
                </div>

                {selectedUser.profile && (
                  <div style={{ marginTop: "1.5rem" }}>
                    <h4>Profile Information</h4>
                    <div className="form-row">
                      <div>
                        <strong>Age:</strong> {selectedUser.profile.age || "Not provided"}
                      </div>
                      <div>
                        <strong>GPA:</strong> {selectedUser.profile.gpa || "Not provided"}
                      </div>
                    </div>
                    <div className="form-row" style={{ marginTop: "0.5rem" }}>
                      <div>
                        <strong>Major:</strong> {selectedUser.profile.major || "Not provided"}
                      </div>
                      <div>
                        <strong>University:</strong> {selectedUser.profile.university || "Not provided"}
                      </div>
                    </div>
                    <div style={{ marginTop: "0.5rem" }}>
                      <strong>Financial Need:</strong> {selectedUser.profile.financialNeed || "Not provided"}
                    </div>

                    {selectedUser.profile.extracurriculars && selectedUser.profile.extracurriculars.length > 0 && (
                      <div style={{ marginTop: "1rem" }}>
                        <strong>Extracurriculars:</strong>
                        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.5rem" }}>
                          {selectedUser.profile.extracurriculars.map((activity, index) => (
                            <li key={index}>{activity}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedUser.profile.achievements && selectedUser.profile.achievements.length > 0 && (
                      <div style={{ marginTop: "1rem" }}>
                        <strong>Achievements:</strong>
                        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.5rem" }}>
                          {selectedUser.profile.achievements.map((achievement, index) => (
                            <li key={index}>{achievement}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {selectedUser.documents && selectedUser.documents.length > 0 && (
                  <div style={{ marginTop: "1.5rem" }}>
                    <h4>Uploaded Documents</h4>
                    <ul style={{ marginTop: "0.5rem" }}>
                      {selectedUser.documents.map((doc, index) => (
                        <li key={index} style={{ marginBottom: "0.5rem" }}>
                          <strong>{doc.originalName}</strong>
                          <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                            Uploaded: {formatDate(doc.uploadDate)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedUser.scholarshipMatches && selectedUser.scholarshipMatches.length > 0 && (
                  <div style={{ marginTop: "1.5rem" }}>
                    <h4>Scholarship Applications</h4>
                    <div style={{ marginTop: "0.5rem" }}>
                      {selectedUser.scholarshipMatches.map((match, index) => (
                        <div
                          key={index}
                          style={{
                            marginBottom: "0.5rem",
                            padding: "0.5rem",
                            background: "#f9fafb",
                            borderRadius: "4px",
                          }}
                        >
                          <strong>{match.scholarship?.title || "Unknown Scholarship"}</strong>
                          <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                            Status: {match.status} | Match Score: {match.matchScore}%
                            {match.appliedDate && ` | Applied: ${formatDate(match.appliedDate)}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Profile Status</th>
                <th>Applications</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((userData) => (
                <tr key={userData._id}>
                  <td>{userData.name}</td>
                  <td>{userData.email}</td>
                  <td>
                    <span
                      style={{
                        padding: "0.25rem 0.75rem",
                        borderRadius: "20px",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        backgroundColor: userData.role === "admin" ? "#fef3c7" : "#d1fae5",
                        color: userData.role === "admin" ? "#92400e" : "#065f46",
                      }}
                    >
                      {userData.role}
                    </span>
                  </td>
                  <td>{formatDate(userData.createdAt)}</td>
                  <td>
                    <span
                      style={{
                        padding: "0.25rem 0.75rem",
                        borderRadius: "20px",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        backgroundColor: userData.profile?.major ? "#d1fae5" : "#fee2e2",
                        color: userData.profile?.major ? "#065f46" : "#991b1b",
                      }}
                    >
                      {userData.profile?.major ? "Complete" : "Incomplete"}
                    </span>
                  </td>
                  <td>{userData.scholarshipMatches?.length || 0}</td>
                  <td>
                    <button
                      onClick={() => viewUserDetails(userData._id)}
                      className="btn btn-secondary"
                      style={{ marginRight: "0.5rem", padding: "0.5rem 1rem", fontSize: "0.8rem" }}
                    >
                      View
                    </button>
                    {userData.role !== "admin" && (
                      <button
                        onClick={() => handleDeleteUser(userData._id)}
                        className="btn btn-danger"
                        style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        }
      `}</style>
    </div>
  )
}

export default UserManagement
