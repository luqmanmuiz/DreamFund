"use client"

import { useState, useEffect } from "react"
import { Link, Navigate } from "react-router-dom"
import Header from "../components/Header"
import { useAuth } from "../contexts/AuthContext"
import { HiOutlineUser } from "react-icons/hi2"

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
      <div className="loading-container">
        <div className="spinner"></div>
        <style jsx>{`
          .loading-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%);
          }
          .spinner {
            width: 50px;
            height: 50px;
            border: 3px solid #e5e7eb;
            border-top: 3px solid #2563eb;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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
      setMessage("Profile updated successfully! ✅")
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
    <div className="page-wrapper">
      <Header navItems={[{ to: "/", label: "Home" }]} />

      <div className="container">
        {/* Header Section */}
        <div className="hero-section">
          <div className="hero-badge">
            <HiOutlineUser className="w-8 h-8 text-blue-600" />
            <span className="hero-badge-text">Profile Settings</span>
          </div>
          <h1 className="hero-title">
            Complete Your Profile
          </h1>
          <p className="hero-description">
            Help us find the best scholarship matches by providing detailed information about your academic background.
          </p>
        </div>
        {/* End Header Section */}

        <div className="main-card">
          {message && (
            <div className="alert-message" style={{
              backgroundColor: message.includes("success") ? "#f0fdf4" : "#fef2f2",
              color: message.includes("success") ? "#166534" : "#991b1b",
              border: `1px solid ${message.includes("success") ? "#bbf7d0" : "#fecaca"}`,
            }}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="profile-form">
            {/* GPA */}
            <div className="form-group">
              <label htmlFor="gpa" className="form-label">GPA (on a 4.0 scale)</label>
              <input
                id="gpa"
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
              <label htmlFor="major" className="form-label">Major/Field of Study</label>
              <select
                id="major"
                name="major"
                className="form-input"
                value={formData.major}
                onChange={handleInputChange}
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
            <div className="form-group">
              <label htmlFor="university" className="form-label">University/Institution</label>
              <input
                id="university"
                type="text"
                name="university"
                className="form-input"
                value={formData.university}
                onChange={handleInputChange}
                placeholder="e.g., Harvard University"
              />
            </div>

            {/* Submit Button */}
            <div className="form-group submit-group">
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "Updating Profile..." : "Update Profile"}
              </button>
            </div>
          </form>

          {/* Next Steps */}
          <div className="next-steps-card">
            <h3 className="next-steps-title">What's Next?</h3>
            <p className="next-steps-description">
              You're almost there! Use your completed profile to get instant matches.
            </p>
            <div className="next-steps-links">
              <Link
                to="/upload"
                className="btn-secondary"
              >
                Upload Documents
              </Link>
              <Link
                to={`/results/${user.id}`}
                className="btn-primary"
              >
                View My Matches
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* --- Styles Block --- */}
      <style jsx>{`
        /* Global & Layout */
        .page-wrapper {
          min-height: 100vh;
          background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%);
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 3rem 2rem;
        }

        /* Header Section */
        .hero-section {
          text-align: center;
          margin-bottom: 3rem;
        }

        .hero-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: #dbeafe;
            border-radius: 9999px;
            margin-bottom: 1.5rem;
        }
        
        .hero-badge-icon {
            font-size: 1rem;
        }
        
        .hero-badge-text {
            font-size: 0.875rem;
            color: #1e40af;
            font-weight: 600;
        }

        .hero-title {
            font-size: 2.5rem;
            font-weight: 800;
            color: #111827;
            margin-bottom: 1rem;
            letter-spacing: -0.02em;
        }

        .hero-description {
            font-size: 1.125rem;
            color: #6b7280;
            max-width: 42rem;
            margin: 0 auto;
            line-height: 1.75;
        }

        /* Main Card */
        .main-card {
            background: white;
            border-radius: 16px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
            padding: 2.5rem;
        }

        /* Alerts */
        .alert-message {
            padding: 1rem 1.5rem;
            margin-bottom: 2rem;
            border-radius: 12px;
            font-weight: 600;
        }
        
        /* Form Styling */
        .profile-form {
            display: grid;
            gap: 1.5rem;
        }
        
        .form-group {
            margin-bottom: 0;
        }

        .form-label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: #111827;
            font-size: 0.875rem;
        }

        .form-input {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            font-size: 1rem;
            transition: all 0.2s ease;
            background-color: white;
            box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }

        .form-input:focus {
            outline: none;
            border-color: #2563eb;
            box-shadow: 0 0 0 3px #bfdbfe;
        }

        .form-input[type="number"]::-webkit-inner-spin-button,
        .form-input[type="number"]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        
        .form-input[type="number"] {
            -moz-appearance: textfield;
        }

        .submit-group {
            margin-top: 2rem;
        }

        /* Buttons */
        .btn-primary {
            width: 100%;
            padding: 0.875rem;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);
            text-decoration: none; /* For links */
            display: inline-block;
            text-align: center;
        }
        
        .btn-primary:not([disabled]):hover {
            background: #1d4ed8;
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
        }

        /* Next Steps Card */
        .next-steps-card {
            margin-top: 2.5rem;
            padding: 1.5rem;
            background: #eff6ff; /* Light blue background */
            border-radius: 12px;
            border: 1px solid #bfdbfe;
        }

        .next-steps-title {
            color: #1e40af;
            margin-bottom: 1rem;
            font-size: 1.25rem;
            font-weight: 700;
            border-bottom: 2px solid #bfdbfe;
            padding-bottom: 0.5rem;
        }
        
        .next-steps-description {
            color: #1e40af;
            margin-bottom: 1.5rem;
            line-height: 1.7;
        }
        
        .next-steps-links {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .btn-secondary {
            background-color: white;
            color: #2563eb;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            border: 1px solid #2563eb;
            transition: all 0.3s ease;
            display: inline-block;
            text-align: center;
        }

        .btn-secondary:hover {
            background: #eef2ff;
        }
        
        /* Media Queries */
        @media (max-width: 768px) {
            .container {
                padding: 2rem 1rem;
            }
            .hero-title {
                font-size: 2rem;
            }
            .main-card {
                padding: 1.5rem;
            }
            .btn-primary, .btn-secondary {
                width: 100%;
                margin-top: 0.5rem;
            }
            .next-steps-links {
                flex-direction: column;
            }
        }
      `}</style>
    </div>
  )
}

export default ProfilePage