"use client"

import { useState, useEffect } from "react"
import { Link, Navigate } from "react-router-dom"
import Header from "../components/Header"
import { useAuth } from "../contexts/AuthContext"

const ProfilePage = () => {
  const { user, updateProfile, loading: authLoading } = useAuth()
  const [formData, setFormData] = useState({
    gpa: "",
    major: "",
    university: "",
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (user?.profile) {
      setFormData({
        gpa: user.profile.gpa || "",
        major: user.profile.major || "",
        university: user.profile.university || "",
      })
    }
  }, [user])

  if (authLoading) {
    return (
      <div className="loading" style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "100vh", 
        background: "linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)" 
      }}>
        <div className="spinner" style={{
          width: "50px",
          height: "50px",
          border: "3px solid #e5e7eb",
          borderTop: "3px solid #2563eb",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const result = await updateProfile(formData)
    if (result.success) {
      setMessage("Profile updated successfully!")
    } else {
      setMessage(result.message)
    }
    setLoading(false)
  }

  const majors = [
    "Computer Science",
    "Engineering",
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Business Administration",
    "Economics",
    "Psychology",
    "English Literature",
    "History",
    "Political Science",
    "Art",
    "Music",
    "Education",
    "Medicine",
    "Law",
    "Other",
  ]

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)" }}>
      <Header navItems={[{ to: "/", label: "Home" }]} />

      <div className="container" style={{ maxWidth: "800px", margin: "0 auto", padding: "3rem 2rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              background: "#dbeafe",
              borderRadius: "9999px",
              marginBottom: "1.5rem",
            }}
          >
            <span style={{ fontSize: "1rem" }}>👤</span>
            <span
              style={{
                fontSize: "0.875rem",
                color: "#1e40af",
                fontWeight: "500",
              }}
            >
              Profile Settings
            </span>
          </div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "700", color: "#111827", marginBottom: "1rem", letterSpacing: "-0.01em" }}>
            Complete Your Profile
          </h1>
          <p style={{ fontSize: "1.125rem", color: "#6b7280", maxWidth: "42rem", margin: "0 auto", lineHeight: "1.75" }}>
            Help us find the best scholarship matches by providing detailed information about your academic background.
          </p>
        </div>

        <div style={{
          background: "white",
          borderRadius: "16px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
          padding: "2.5rem",
        }}>
          {message && (
            <div style={{ 
              padding: "1rem 1.5rem", 
              marginBottom: "2rem", 
              borderRadius: "12px",
              backgroundColor: message.includes("success") ? "#f0fdf4" : "#fef2f2",
              color: message.includes("success") ? "#166534" : "#991b1b",
              border: `1px solid ${message.includes("success") ? "#bbf7d0" : "#fecaca"}`,
              fontWeight: "500",
            }}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* GPA */}
            <div className="form-group" style={{ marginBottom: "1.5rem" }}>
              <label className="form-label" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#111827", fontSize: "0.875rem" }}>GPA</label>
              <input
                type="number"
                name="gpa"
                className="form-input"
                value={formData.gpa}
                onChange={handleInputChange}
                min="0"
                max="4"
                step="0.01"
                placeholder="e.g., 3.75"
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  transition: "all 0.2s",
                }}
              />
            </div>

            {/* Major */}
            <div className="form-group" style={{ marginBottom: "1.5rem" }}>
              <label className="form-label" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#111827", fontSize: "0.875rem" }}>Major</label>
              <select 
                name="major" 
                className="form-select" 
                value={formData.major} 
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  transition: "all 0.2s",
                  backgroundColor: "white",
                }}
              >
                <option value="">Select your major</option>
                {majors.map((major) => (
                  <option key={major} value={major}>
                    {major}
                  </option>
                ))}
              </select>
            </div>

            {/* University */}
            <div className="form-group" style={{ marginBottom: "2rem" }}>
              <label className="form-label" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#111827", fontSize: "0.875rem" }}>University</label>
              <input
                type="text"
                name="university"
                className="form-input"
                value={formData.university}
                onChange={handleInputChange}
                placeholder="e.g., Harvard University"
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  transition: "all 0.2s",
                }}
              />
            </div>

            {/* Submit Button */}
            <div className="form-group">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ 
                  width: "100%", 
                  padding: "0.875rem",
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "1rem",
                  transition: "all 0.2s",
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                  opacity: loading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.background = "#1d4ed8")}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.background = "#2563eb")}
              >
                {loading ? "Updating Profile..." : "Update Profile"}
              </button>
            </div>
          </form>

          {/* Next Steps */}
          <div
            style={{
              marginTop: "2rem",
              padding: "1.5rem",
              background: "#eff6ff",
              borderRadius: "12px",
              border: "1px solid #bfdbfe",
            }}
          >
            <h3 style={{ color: "#1e40af", marginBottom: "1rem", fontSize: "1.125rem", fontWeight: "700" }}>What's Next?</h3>
            <p style={{ color: "#1e40af", marginBottom: "1rem", lineHeight: "1.7" }}>
              Complete your profile to get better scholarship matches!
            </p>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <Link 
                to="/upload" 
                className="btn btn-secondary" 
                style={{
                  backgroundColor: "white",
                  color: "#2563eb",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "600",
                  border: "1px solid #2563eb",
                  transition: "all 0.2s",
                }}
              >
                Upload Documents
              </Link>
              <Link 
                to={`/results/${user.id}`} 
                className="btn btn-primary"
                style={{
                  background: "#2563eb",
                  color: "white",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "600",
                  border: "none",
                  transition: "all 0.2s",
                }}
              >
                View My Matches
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
