"use client"

import { useState, useEffect } from "react"
import { Link, useParams, Navigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { useScholarships } from "../contexts/ScholarshipContext"

const ResultsPage = () => {
  const { userId } = useParams()
  const { user, loading: authLoading } = useAuth()
  const { getScholarshipMatches, applyForScholarship } = useScholarships()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [applying, setApplying] = useState({})
  const [studentCtx, setStudentCtx] = useState({ cgpa: 0, program: '' })

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true)
      setMessage("")
      try {
        if (user && userId && user.id === userId) {
          const matchData = await getScholarshipMatches(userId)
          setMatches(matchData)
          const cgpa = Number(user?.profile?.gpa || 0)
          const program = typeof user?.profile?.program === 'string' ? user.profile.program : (user?.profile?.major || '')
          setStudentCtx({ cgpa, program })
        } else {
          // Anonymous flow: read extracted data from localStorage
          const raw = typeof window !== 'undefined' ? localStorage.getItem('extractedData') : null
          const items = raw ? JSON.parse(raw) : []
          const latest = Array.isArray(items) && items.length > 0 ? items[items.length - 1] : null
          const cgpa = latest?.cgpa ? parseFloat(String(latest.cgpa).replace(/[^0-9.]/g, '')) : 0
          const program = latest?.program || ''
          setStudentCtx({ cgpa, program })

          // Call public matches on backend
          let res
          try {
            res = await fetch('/api/scholarships/public-matches', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cgpa, program })
            })
          } catch (_) {}
          if (!res || !res.ok) {
            res = await fetch('http://localhost:5000/api/scholarships/public-matches', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cgpa, program })
            })
          }
          const data = await res.json()
          setMatches(Array.isArray(data) ? data : (Array.isArray(data?.matches) ? data.matches : []))
        }
      } catch (error) {
        setMessage('Failed to load scholarship matches')
      } finally {
        setLoading(false)
      }
    }

    fetchMatches()
  }, [user, userId, getScholarshipMatches])

  if (authLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  // Do not force login: allow anonymous results view

  const handleApply = async (scholarshipId) => {
    setApplying((prev) => ({ ...prev, [scholarshipId]: true }))
    setMessage("")

    const result = await applyForScholarship(scholarshipId)

    if (result.success) {
      setMessage(result.message)
      // Update the matches to reflect the application
      setMatches((prev) =>
        prev.map((match) => (match.scholarship._id === scholarshipId ? { ...match, applied: true } : match)),
      )
    } else {
      setMessage(result.message)
    }

    setApplying((prev) => ({ ...prev, [scholarshipId]: false }))
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getMatchColor = (score) => {
    if (score >= 80) return "#10b981" // Green
    if (score >= 60) return "#f59e0b" // Yellow
    return "#ef4444" // Red
  }

  const normalize = (s) => (typeof s === 'string' ? s.trim().toLowerCase() : '')
  const programMatches = (eligibleCourses, program) => {
    const courses = Array.isArray(eligibleCourses) ? eligibleCourses : []
    const hasConstraint = courses.length > 0
    if (!hasConstraint) return { ok: true, detail: 'Open to any program' }
    const p = normalize(program)
    const ok = courses.some((c) => {
      const cc = normalize(c)
      if (!cc || !p) return false
      return cc === p || cc.includes(p) || p.includes(cc)
    })
    return { ok, detail: ok ? 'Program matches eligible courses' : 'Program does not match eligible courses' }
  }

  const getEligibilityReasons = (scholarship) => {
    const reasons = []
    const req = scholarship?.requirements || {}
    const minGpa = typeof req.minGPA === 'number' ? req.minGPA : null
    if (minGpa === null || isNaN(minGpa)) {
      reasons.push('No minimum GPA required')
    } else if (Number(studentCtx.cgpa) >= minGpa) {
      reasons.push(`Meets minimum GPA (${Number(studentCtx.cgpa)} ≥ ${minGpa})`)
    } else {
      reasons.push(`Below minimum GPA (${Number(studentCtx.cgpa)} < ${minGpa})`)
    }

    const prog = programMatches(scholarship?.eligibleCourses, studentCtx.program)
    reasons.push(prog.detail)

    return reasons
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

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
              {user && (
                <li>
                  <Link to={`/results/${user.id}`}>My Matches</Link>
                </li>
              )}
              {user?.role === "admin" && (
                <li>
                  <Link to="/admin/dashboard">Admin</Link>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </header>

      <div className="container" style={{ padding: "2rem 0" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1>Scholarship Matches</h1>
          <p style={{ color: "#6b7280" }}>
            Based on your profile, here are scholarships that match your qualifications. Higher match scores indicate
            better alignment with your profile.
          </p>
        </div>

        {message && (
          <div
            className={`alert ${message.includes("success") || message.includes("submitted") ? "alert-success" : "alert-error"}`}
          >
            {message}
          </div>
        )}

        {matches.length === 0 ? (
          <div className="card text-center">
            <h2>No Matches Found</h2>
            <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
              We couldn't find any scholarships that match your current profile. Try completing your profile or
              uploading more documents to improve your matches.
            </p>
            <div>
              <Link to="/profile" className="btn btn-primary" style={{ marginRight: "1rem" }}>
                Complete Profile
              </Link>
              <Link to="/upload" className="btn btn-secondary">
                Upload Documents
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: "2rem", textAlign: "center" }}>
              <h2>Found {matches.length} Matching Scholarships</h2>
              <p style={{ color: "#6b7280" }}>
                Total potential funding: $
                {matches.reduce((sum, match) => sum + match.scholarship.amount, 0).toLocaleString()}
              </p>
            </div>

            <div className="scholarship-grid">
              {matches.map((match) => {
                const scholarship = match.scholarship
                const hasDeadline = scholarship.deadline != null && scholarship.deadline !== ""
                const isExpired = hasDeadline && new Date(scholarship.deadline) < new Date()

                return (
                  <div key={scholarship._id} className="scholarship-card">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "1rem",
                      }}
                    >
                      <div className="scholarship-amount">${scholarship.amount.toLocaleString()}</div>
                      <div className="match-score" style={{ backgroundColor: getMatchColor(match.matchScore) }}>
                        {match.matchScore}% Match
                      </div>
                    </div>

                    <h3 className="scholarship-title">{scholarship.title}</h3>
                    <div className="scholarship-deadline">
                      {hasDeadline ? (
                        <>
                          Deadline: {formatDate(scholarship.deadline)}
                          {isExpired && <span style={{ color: "#ef4444", marginLeft: "0.5rem" }}>(Expired)</span>}
                        </>
                      ) : (
                        <span style={{ color: "#059669" }}>Always Open</span>
                      )}
                    </div>

                    {/* Requirements */}
                    <div style={{ marginBottom: "1rem" }}>
                      <h4 style={{ fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>Requirements:</h4>
                      <ul style={{ fontSize: "0.8rem", color: "#6b7280", paddingLeft: "1rem" }}>
                        {scholarship.requirements.minGPA > 0 && <li>Minimum GPA: {scholarship.requirements.minGPA}</li>}
                        {scholarship.requirements.maxAge < 100 && (
                          <li>Maximum Age: {scholarship.requirements.maxAge}</li>
                        )}
                        {scholarship.requirements.majors.length > 0 && (
                          <li>Majors: {scholarship.requirements.majors.join(", ")}</li>
                        )}
                        {scholarship.requirements.financialNeed !== "any" && (
                          <li>Financial Need: {scholarship.requirements.financialNeed}</li>
                        )}
                      </ul>
                    </div>

                    {/* Why you match */}
                    <div style={{ marginBottom: "1rem" }}>
                      <h4 style={{ fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>Why you match</h4>
                      <ul style={{ fontSize: "0.8rem", color: "#374151", paddingLeft: "1rem" }}>
                        {getEligibilityReasons(scholarship).map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Provider Info */}
                    <div style={{ marginBottom: "1.5rem", fontSize: "0.9rem", color: "#6b7280" }}>
                      <strong>Provider:</strong> {scholarship.provider.name}
                      {scholarship.provider.website && (
                        <div>
                          <a
                            href={scholarship.provider.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#3b82f6" }}
                          >
                            Visit Website
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Apply Button */}
                    <div>
                      {match.applied ? (
                        <button className="btn btn-success" disabled style={{ width: "100%" }}>
                          ✓ Applied
                        </button>
                      ) : (isExpired && hasDeadline) ? (
                        <button className="btn btn-secondary" disabled style={{ width: "100%" }}>
                          Expired
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApply(scholarship._id)}
                          disabled={applying[scholarship._id]}
                          className="btn btn-primary"
                          style={{ width: "100%" }}
                        >
                          {applying[scholarship._id] ? "Applying..." : "Apply Now"}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

      </div>
    </div>
  )
}

export default ResultsPage
