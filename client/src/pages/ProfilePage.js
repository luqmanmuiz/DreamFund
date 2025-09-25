"use client"

import { useState, useEffect } from "react"
import { Link, Navigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

const ProfilePage = () => {
  const { user, updateProfile, loading: authLoading } = useAuth()
  const [formData, setFormData] = useState({
    age: "",
    gpa: "",
    major: "",
    university: "",
    graduationYear: "",
    financialNeed: "",
    extracurriculars: [],
    achievements: [],
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [newExtracurricular, setNewExtracurricular] = useState("")
  const [newAchievement, setNewAchievement] = useState("")

  useEffect(() => {
    if (user?.profile) {
      setFormData({
        age: user.profile.age || "",
        gpa: user.profile.gpa || "",
        major: user.profile.major || "",
        university: user.profile.university || "",
        graduationYear: user.profile.graduationYear || "",
        financialNeed: user.profile.financialNeed || "",
        extracurriculars: user.profile.extracurriculars || [],
        achievements: user.profile.achievements || [],
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

  const addExtracurricular = () => {
    if (newExtracurricular.trim()) {
      setFormData((prev) => ({
        ...prev,
        extracurriculars: [...prev.extracurriculars, newExtracurricular.trim()],
      }))
      setNewExtracurricular("")
    }
  }

  const removeExtracurricular = (index) => {
    setFormData((prev) => ({
      ...prev,
      extracurriculars: prev.extracurriculars.filter((_, i) => i !== index),
    }))
  }

  const addAchievement = () => {
    if (newAchievement.trim()) {
      setFormData((prev) => ({
        ...prev,
        achievements: [...prev.achievements, newAchievement.trim()],
      }))
      setNewAchievement("")
    }
  }

  const removeAchievement = (index) => {
    setFormData((prev) => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index),
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
            DreamFund
          </Link>
          <nav>
            <ul className="nav-links">
              <li>
                <Link to="/profile">Profile</Link>
              </li>
              <li>
                <Link to="/upload">Upload Documents</Link>
              </li>
              <li>
                <Link to={`/results/${user.id}`}>My Matches</Link>
              </li>
              {user.role === "admin" && (
                <li>
                  <Link to="/admin/dashboard">Admin</Link>
                </li>
              )}
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
            {/* Basic Information */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Age</label>
                <input
                  type="number"
                  name="age"
                  className="form-input"
                  value={formData.age}
                  onChange={handleInputChange}
                  min="16"
                  max="100"
                />
              </div>
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
            </div>

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

            <div className="form-row">
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
              <div className="form-group">
                <label className="form-label">Expected Graduation Year</label>
                <input
                  type="number"
                  name="graduationYear"
                  className="form-input"
                  value={formData.graduationYear}
                  onChange={handleInputChange}
                  min="2024"
                  max="2030"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Financial Need Level</label>
              <select
                name="financialNeed"
                className="form-select"
                value={formData.financialNeed}
                onChange={handleInputChange}
              >
                <option value="">Select financial need level</option>
                <option value="low">Low - Family income &gt; $75,000</option>
                <option value="medium">Medium - Family income $30,000 - $75,000</option>
                <option value="high">High - Family income &lt; $30,000</option>
              </select>
            </div>

            {/* Extracurriculars */}
            <div className="form-group">
              <label className="form-label">Extracurricular Activities</label>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                <input
                  type="text"
                  className="form-input"
                  value={newExtracurricular}
                  onChange={(e) => setNewExtracurricular(e.target.value)}
                  placeholder="e.g., Student Government, Sports, Volunteer Work"
                  style={{ flex: 1 }}
                />
                <button type="button" onClick={addExtracurricular} className="btn btn-secondary">
                  Add
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {formData.extracurriculars.map((activity, index) => (
                  <span
                    key={index}
                    style={{
                      background: "#e5e7eb",
                      padding: "0.5rem 1rem",
                      borderRadius: "20px",
                      fontSize: "0.9rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    {activity}
                    <button
                      type="button"
                      onClick={() => removeExtracurricular(index)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        fontSize: "1.2rem",
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div className="form-group">
              <label className="form-label">Achievements & Awards</label>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                <input
                  type="text"
                  className="form-input"
                  value={newAchievement}
                  onChange={(e) => setNewAchievement(e.target.value)}
                  placeholder="e.g., Dean's List, National Merit Scholar"
                  style={{ flex: 1 }}
                />
                <button type="button" onClick={addAchievement} className="btn btn-secondary">
                  Add
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {formData.achievements.map((achievement, index) => (
                  <span
                    key={index}
                    style={{
                      background: "#e5e7eb",
                      padding: "0.5rem 1rem",
                      borderRadius: "20px",
                      fontSize: "0.9rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    {achievement}
                    <button
                      type="button"
                      onClick={() => removeAchievement(index)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        fontSize: "1.2rem",
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

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
