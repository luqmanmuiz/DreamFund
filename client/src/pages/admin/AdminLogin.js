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
        background: "linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "2.5rem",
          borderRadius: "16px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              margin: "0 auto 1.5rem",
              background: "#dbeafe",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2.5rem",
            }}
          >
            🔐
          </div>
          <h1
            style={{
              color: "#111827",
              marginBottom: "0.5rem",
              fontSize: "1.875rem",
              fontWeight: "700",
              letterSpacing: "-0.01em",
            }}
          >
            Admin Login
          </h1>
          <p style={{ color: "#6b7280", margin: 0, lineHeight: "1.7" }}>Access the DreamFund administration panel</p>
        </div>

        {message && (
          <div
            style={{
              padding: "1rem 1.5rem",
              marginBottom: "1.5rem",
              backgroundColor: "#fef2f2",
              color: "#991b1b",
              borderRadius: "12px",
              fontSize: "0.9rem",
              fontWeight: "500",
              border: "1px solid #fecaca",
            }}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
                color: "#374151",
              }}
            >
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="admin@dreamfund.com"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "1rem",
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
                color: "#374151",
              }}
            >
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder="Enter your password"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "1rem",
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.875rem",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "all 0.2s",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.background = "#1d4ed8")}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.background = "#2563eb")}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div
          style={{
            marginTop: "1.5rem",
            padding: "1rem 1.5rem",
            background: "#eff6ff",
            borderRadius: "12px",
            fontSize: "0.9rem",
            color: "#1e40af",
            border: "1px solid #bfdbfe",
          }}
        >
          <strong style={{ fontWeight: "600" }}>Default Admin Credentials:</strong>
          <br />
          Email: admin@dreamfund.com
          <br />
          Password: admin123
        </div>

        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <a
            href="/"
            style={{
              color: "#6b7280",
              textDecoration: "none",
              fontSize: "0.9rem",
            }}
          >
            ← Back to Main Site
          </a>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
