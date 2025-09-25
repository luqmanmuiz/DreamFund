"use client"

import { useState } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"

const AdminLogin = () => {
  const { user, login, loading: authLoading } = useAuth()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  // Redirect if already logged in as admin
  if (user && user.role === "admin") {
    return <Navigate to="/admin/dashboard" replace />
  }

  // Redirect if logged in as regular user
  if (user && user.role !== "admin") {
    return <Navigate to="/" replace />
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const result = await login(formData.email, formData.password)

    if (result.success) {
      // Navigation will be handled by the useEffect in the component
    } else {
      setMessage(result.message)
    }
    setLoading(false)
  }

  if (authLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <div className="form-container" style={{ maxWidth: "400px", width: "90%" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ color: "#1f2937", marginBottom: "0.5rem" }}>Admin Login</h1>
          <p style={{ color: "#6b7280" }}>Access the DreamFund administration panel</p>
        </div>

        {message && <div className="alert alert-error">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="admin@dreamfund.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder="Enter your password"
            />
          </div>

          <div className="form-group">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: "100%", padding: "1rem" }}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </div>
        </form>

        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            background: "#f0f9ff",
            borderRadius: "8px",
            fontSize: "0.9rem",
            color: "#0c4a6e",
          }}
        >
          <strong>Default Admin Credentials:</strong>
          <br />
          Email: admin@dreamfund.com
          <br />
          Password: admin123
        </div>

        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <a href="/" style={{ color: "#6b7280", textDecoration: "none" }}>
            ← Back to Main Site
          </a>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
