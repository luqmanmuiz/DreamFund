"use client"

import { useState, useEffect } from "react"
import { Link, Navigate } from "react-router-dom"
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
      <div className="loading">
        <div className="spinner"></div>
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
    <div>
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo">
            <span className="logo-icon">🎓</span>
            DreamFund
          </Link>
          <nav>
            <ul className="nav-links">
              <li>
                <Link to="/">Home</Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <div className="container" style={{ padding: "2rem 0" }}>
        <div className="form-container">
          <h1>Complete Your Profile</h1>
          <p style={{ marginBottom: "2rem", color: "#6b7280" }}>
            Help us find the best scholarship matches by providing detailed information about your academic background.
          </p>

          {message && (
            <div className={`alert ${message.includes("success") ? "alert-success" : "alert-error"}`}>{message}</div>
          )}

          <form onSubmit={handleSubmit}>
            {/* GPA */}
            <div className="form-group">
              <label className="form-label">GPA</label>
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
              />
            </div>

            {/* Major */}
            <div className="form-group">
              <label className="form-label">Major</label>
              <select name="major" className="form-select" value={formData.major} onChange={handleInputChange}>
                <option value="">Select your major</option>
                {majors.map((major) => (
                  <option key={major} value={major}>
                    {major}
                  </option>
                ))}
              </select>
            </div>

            {/* University */}
            <div className="form-group">
              <label className="form-label">University</label>
              <input
                type="text"
                name="university"
                className="form-input"
                value={formData.university}
                onChange={handleInputChange}
                placeholder="e.g., Harvard University"
              />
            </div>

            {/* Submit Button */}
            <div className="form-group">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: "100%", padding: "1rem" }}
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
              borderRadius: "8px",
              border: "1px solid #93c5fd",
            }}
          >
            <h3 style={{ color: "#1e40af", marginBottom: "1rem" }}>What's Next?</h3>
            <p style={{ color: "#1e40af", marginBottom: "1rem" }}>
              Complete your profile to get better scholarship matches!
            </p>
            <div>
              <Link to="/upload" className="btn btn-secondary" style={{ marginRight: "1rem" }}>
                Upload Documents
              </Link>
              <Link to={`/results/${user.id}`} className="btn btn-primary">
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
