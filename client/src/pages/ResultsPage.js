"use client"

import { useState, useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import Header from "../components/Header"
import { useAuth } from "../contexts/AuthContext"
import { useScholarships } from "../contexts/ScholarshipContext"
import {
  trackScholarshipClick,
  markPendingFeedback,
  getNextFeedbackNeeded,
  markFeedbackShown,
  clearPendingFeedback,
} from "../utils/sessionUtils"
import FeedbackBanner from "../components/FeedbackBanner"

const ResultsPage = () => {
  const { userId } = useParams()
  const { user, loading: authLoading } = useAuth()
  const { getScholarshipMatches } = useScholarships()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [studentCtx, setStudentCtx] = useState({ cgpa: 0, program: "" })
  const [studentName, setStudentName] = useState("")
  const [feedbackScholarship, setFeedbackScholarship] = useState(null);

  const capitalizeWords = (str) => {
    if (!str || typeof str !== "string") return ""
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  // MOVED: All useEffect hooks to the TOP, before any conditional returns
  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true)
      setMessage("")
      try {
        if (user && userId && user.id === userId) {
          const matchData = await getScholarshipMatches(userId)
          setMatches(matchData)
          const cgpa = Number(user?.profile?.gpa || 0)
          const program = typeof user?.profile?.program === "string" ? user.profile.program : user?.profile?.major || ""
          setStudentCtx({ cgpa, program })
        } else {
          // Anonymous flow: read extracted data from localStorage
          const raw = typeof window !== "undefined" ? localStorage.getItem("extractedData") : null
          const items = raw ? JSON.parse(raw) : []
          const latest = Array.isArray(items) && items.length > 0 ? items[items.length - 1] : null
          const cgpa = latest?.cgpa ? Number.parseFloat(String(latest.cgpa).replace(/[^0-9.]/g, "")) : 0
          const program = latest?.program || ""
          setStudentCtx({ cgpa, program })
          const name = latest?.name || latest?.studentName || latest?.fullName || ""
          setStudentName(capitalizeWords(name))

          // Call public matches on backend
          let res
          try {
            res = await fetch("/api/scholarships/public-matches", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ cgpa, program }),
            })
          } catch (_) {}
          if (!res || !res.ok) {
            res = await fetch("http://localhost:5000/api/scholarships/public-matches", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ cgpa, program }),
            })
          }
          const data = await res.json()
          setMatches(Array.isArray(data) ? data : Array.isArray(data?.matches) ? data.matches : [])
        }
      } catch (error) {
        setMessage("Failed to load scholarship matches")
      } finally {
        setLoading(false)
      }
    }

    fetchMatches()
  }, [user, userId, getScholarshipMatches])

  // MOVED: Feedback check useEffect to the TOP
  useEffect(() => {
    const checkForFeedback = () => {
      // Only check if document is visible
      if (document.visibilityState === "visible") {
        const scholarshipId = getNextFeedbackNeeded();
        if (scholarshipId && !feedbackScholarship) {
          // Find the scholarship details
          const scholarship = matches.find(m => m.scholarship._id === scholarshipId);
          if (scholarship) {
            setFeedbackScholarship({
              id: scholarshipId,
              title: scholarship.scholarship.title,
            });
            markFeedbackShown(scholarshipId);
          }
        }
      }
    };

    // Check immediately
    checkForFeedback();

    // Listen for page visibility changes (user returning to tab)
    document.addEventListener("visibilitychange", checkForFeedback);

    return () => {
      document.removeEventListener("visibilitychange", checkForFeedback);
    };
  }, [matches, feedbackScholarship]);

  // NOW the conditional returns can come AFTER all hooks
  if (authLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)",
        }}
      >
        <div
          style={{
            width: "50px",
            height: "50px",
            border: "3px solid #e5e7eb",
            borderTop: "3px solid #2563eb",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        ></div>
      </div>
    )
  }

  // Note: applying flow uses handleApplyNowClick for external provider websites; per-page logic kept simplified

  const handleApplyNowClick = async (scholarship) => {
    if (!scholarship.provider.website) {
      alert("No website available for this scholarship provider");
      return;
    }

    // Track the click asynchronously (non-blocking)
    trackScholarshipClick(
      scholarship._id,
      user?._id || null
    ).catch(err => {
      // Silently fail - tracking shouldn't block the user
      console.log("Tracking failed:", err);
    });

    // Mark this scholarship for feedback
    markPendingFeedback(scholarship._id);

    // Immediately open the scholarship website
    window.open(scholarship.provider.website, "_blank");
  };

  const handleFeedbackClose = (responseType) => {
    if (feedbackScholarship) {
      clearPendingFeedback(feedbackScholarship.id);
      setFeedbackScholarship(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const normalize = (s) => (typeof s === "string" ? s.trim().toLowerCase() : "")
  const programMatches = (eligibleCourses, program) => {
    const courses = Array.isArray(eligibleCourses) ? eligibleCourses : []
    const hasConstraint = courses.length > 0
    if (!hasConstraint) return { ok: true, detail: "Open to any program" }
    const p = normalize(program)
    const ok = courses.some((c) => {
      const cc = normalize(c)
      if (!cc || !p) return false
      return cc === p || cc.includes(p) || p.includes(cc)
    })
    return { ok, detail: ok ? "Program matches eligible courses" : "Program does not match eligible courses" }
  }

  const getEligibilityReasons = (scholarship) => {
    const reasons = []
    const req = scholarship?.requirements || {}
    const minGpa = typeof req.minGPA === "number" ? req.minGPA : null
    if (minGpa === null || isNaN(minGpa)) {
      reasons.push("No minimum GPA required")
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
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)",
        }}
      >
        <div
          style={{
            width: "50px",
            height: "50px",
            border: "3px solid #e5e7eb",
            borderTop: "3px solid #2563eb",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        ></div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)" }}>
      <Header navItems={[{ to: "/profile", label: "Profile" }, { to: "/upload", label: "Upload Documents" }]} />

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "3rem 2rem" }}>
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
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
            <span style={{ fontSize: "1rem" }}>🎓</span>
            <span
              style={{
                fontSize: "0.875rem",
                color: "#1e40af",
                fontWeight: "500",
              }}
            >
              Scholarship Matches
            </span>
          </div>
          <h1
            style={{
              fontSize: "2.5rem",
              fontWeight: "700",
              color: "#111827",
              marginBottom: "1rem",
              letterSpacing: "-0.01em",
            }}
          >
            {studentName ? `Congratulations, ${studentName}!` : "Your Scholarship Matches"}
          </h1>
          <p
            style={{
              fontSize: "1.125rem",
              color: "#6b7280",
              maxWidth: "42rem",
              margin: "0 auto",
              lineHeight: "1.75",
            }}
          >
            {matches.length > 0
              ? `We found ${matches.length} scholarships that match your profile.`
              : "Based on your profile, here are scholarships that match your qualifications."}
          </p>
        </div>

        {message && (
          <div
            style={{
              padding: "1rem 1.5rem",
              marginBottom: "2rem",
              borderRadius: "12px",
              backgroundColor: message.includes("success") || message.includes("submitted") ? "#f0fdf4" : "#fef2f2",
              color: message.includes("success") || message.includes("submitted") ? "#166534" : "#991b1b",
              border: `1px solid ${message.includes("success") || message.includes("submitted") ? "#bbf7d0" : "#fecaca"}`,
              fontWeight: "500",
            }}
          >
            {message}
          </div>
        )}

        {matches.length === 0 ? (
          <div
            style={{
              backgroundColor: "white",
              padding: "3rem",
              borderRadius: "16px",
              textAlign: "center",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
            }}
          >
            <h2 style={{ fontSize: "1.5rem", color: "#111827", fontWeight: "700", marginBottom: "1rem" }}>No Matches Found</h2>
            <p style={{ color: "#6b7280", marginBottom: "2rem", lineHeight: "1.7" }}>
              We couldn't find any scholarships that match your current profile. Try completing your profile or
              uploading more documents to improve your matches.
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link
                to="/profile"
                style={{
                  background: "#2563eb",
                  color: "white",
                  padding: "0.875rem 2rem",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "600",
                  transition: "all 0.2s",
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                }}
              >
                Complete Profile
              </Link>
              <Link
                to="/upload"
                style={{
                  backgroundColor: "white",
                  color: "#374151",
                  padding: "0.875rem 2rem",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "600",
                  border: "1px solid #e5e7eb",
                  transition: "all 0.2s",
                }}
              >
                Upload Documents
              </Link>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
              gap: "2rem",
            }}
          >
            {matches.map((match) => {
              const scholarship = match.scholarship
              const hasDeadline = scholarship.deadline != null && scholarship.deadline !== ""
              const isExpired = hasDeadline && new Date(scholarship.deadline) < new Date()

              return (
                <div
                  key={scholarship._id}
                  style={{
                    backgroundColor: "white",
                    padding: "1.5rem",
                    borderRadius: "12px",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                    border: "1px solid #e5e7eb",
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1rem",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                        color: "#1f2937",
                      }}
                    >
                      ${scholarship.amount.toLocaleString()}
                    </div>
                  </div>

                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "700",
                      color: "#111827",
                      marginBottom: "0.75rem",
                      lineHeight: "1.4",
                    }}
                  >
                    {scholarship.title}
                  </h3>

                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: hasDeadline ? (isExpired ? "#ef4444" : "#6b7280") : "#10b981",
                      marginBottom: "1.25rem",
                      fontWeight: "500",
                    }}
                  >
                    {hasDeadline ? (
                      <>
                        📅 Deadline: {formatDate(scholarship.deadline)}
                        {isExpired && <span style={{ color: "#ef4444", fontWeight: "600" }}> (Expired)</span>}
                      </>
                    ) : (
                      "🔄 Always Open"
                    )}
                  </div>

                  <div style={{ marginBottom: "1.25rem" }}>
                    <h4 style={{ fontSize: "0.875rem", fontWeight: "700", marginBottom: "0.75rem", color: "#111827" }}>
                      Requirements:
                    </h4>
                    <ul style={{ fontSize: "0.875rem", color: "#6b7280", paddingLeft: "1.25rem", margin: 0, lineHeight: "1.7" }}>
                      {scholarship.requirements.minGPA > 0 && <li>Minimum GPA: {scholarship.requirements.minGPA}</li>}
                      {scholarship.requirements.maxAge < 100 && <li>Maximum Age: {scholarship.requirements.maxAge}</li>}
                      {scholarship.requirements.majors.length > 0 && (
                        <li>Majors: {scholarship.requirements.majors.join(", ")}</li>
                      )}
                      {scholarship.requirements.financialNeed !== "any" && (
                        <li>Financial Need: {scholarship.requirements.financialNeed}</li>
                      )}
                    </ul>
                  </div>

                  <div
                    style={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}
                  >
                    <div style={{ marginBottom: "1.5rem" }}>
                      <h4 style={{ fontSize: "0.875rem", fontWeight: "700", marginBottom: "0.75rem", color: "#111827" }}>
                        Why you match:
                      </h4>
                      <ul style={{ fontSize: "0.875rem", color: "#6b7280", paddingLeft: "1.25rem", margin: 0, lineHeight: "1.7" }}>
                        {getEligibilityReasons(scholarship).map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      {match.applied ? (
                        <button
                          style={{
                            width: "100%",
                            padding: "0.875rem",
                            backgroundColor: "#10b981",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontWeight: "600",
                            cursor: "not-allowed",
                            fontSize: "1rem",
                          }}
                          disabled
                        >
                          ✓ Applied
                        </button>
                      ) : isExpired && hasDeadline ? (
                        <button
                          style={{
                            width: "100%",
                            padding: "0.875rem",
                            backgroundColor: "#9ca3af",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontWeight: "600",
                            cursor: "not-allowed",
                            fontSize: "1rem",
                          }}
                          disabled
                        >
                          Expired
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApplyNowClick(scholarship)}
                          style={{
                            width: "100%",
                            padding: "0.875rem",
                            background: "#2563eb",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontWeight: "600",
                            cursor: "pointer",
                            fontSize: "1rem",
                            transition: "all 0.2s",
                            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#1d4ed8";
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 4px 15px rgba(37, 99, 235, 0.3)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#2563eb";
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
                          }}
                        >
                          Apply Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Feedback Banner */}
      {feedbackScholarship && (
        <FeedbackBanner
          scholarshipId={feedbackScholarship.id}
          scholarshipTitle={feedbackScholarship.title}
          onClose={handleFeedbackClose}
        />
      )}
    </div>
  )
}

export default ResultsPage
