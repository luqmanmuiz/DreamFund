"use client"

import { useState, useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import Header from "../components/Header"
import { useAuth } from "../contexts/AuthContext"
import { useScholarships } from "../contexts/ScholarshipContext"
import { HiCheckCircle, HiXCircle } from "react-icons/hi2"
import { FaGraduationCap } from "react-icons/fa"
import {
  trackScholarshipClick,
  markPendingFeedback,
  getNextFeedbackNeeded,
  markFeedbackShown,
  clearPendingFeedback,
} from "../utils/sessionUtils"
import FeedbackBanner from "../components/FeedbackBanner"
import { HiOutlineCalendar } from "react-icons/hi2"

const ResultsPage = () => {
  const { userId } = useParams() // This will now hold the shareId
  const { user, loading: authLoading } = useAuth()
  const { getScholarshipMatches } = useScholarships()
  const [matches, setMatches] = useState([])
  const [nonMatches, setNonMatches] = useState([])
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
        // Check if we are in "Authenticated Mode" (Admin or legacy user)
        if (user && userId && user.id === userId) {
          const matchData = await getScholarshipMatches(userId)
          setMatches(matchData)
          const cgpa = Number(user?.profile?.gpa || 0)
          const program = typeof user?.profile?.program === "string" ? user.profile.program : user?.profile?.major || ""
          setStudentCtx({ cgpa, program })
          setStudentName(capitalizeWords(user.name)) 
        } else {
          // "Guest Mode": Fetch profile from Guest API using shareId
          console.log("Fetching matches in Guest Mode for ID:", userId);
          
          let guestProfile = null;
          
          try {
            const guestRes = await fetch(`http://localhost:5000/api/guests/${userId}`);
            if (guestRes.ok) {
              const guestData = await guestRes.json();
              if (guestData.success) {
                guestProfile = guestData.profile;
              }
            }
          } catch (e) {
            console.error("Failed to fetch guest profile:", e);
          }

          if (!guestProfile) {
            setMessage("Profile not found or expired. Please upload your transcript again.");
            setLoading(false);
            return;
          }
          
          const cgpa = guestProfile.cgpa || 0;
          const program = guestProfile.program || "";
          
          setStudentCtx({ cgpa, program })
          const name = guestProfile.name || "Student"
          setStudentName(capitalizeWords(name))

          // Call public matches on backend
          let res
          try {
            res = await fetch("http://localhost:5000/api/scholarships/public-matches", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ cgpa, program }),
            })
          } catch (_) {}
          
          if (res && res.ok) {
            const data = await res.json()
            setMatches(Array.isArray(data) ? data : Array.isArray(data?.matches) ? data.matches : [])
            setNonMatches(Array.isArray(data?.nonMatches) ? data.nonMatches : [])
          } else {
            setMessage("Could not fetch matches from server.");
          }
        }
      } catch (error) {
        console.error("Error fetching matches:", error);
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
          const scholarship = matches.find(m => m.scholarship._id === scholarshipId) || nonMatches.find(m => m.scholarship._id === scholarshipId);
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
  }, [matches, nonMatches, feedbackScholarship]);

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

    // Filter out invalid/garbage course names (webpage metadata, non-course terms)
    const invalidTerms = [
      'amount', 'deadline', 'overview', 'where to study', 'study level', 'study levels',
      'full scholarship', 'public university', 'private university', 'pre university',
      'course 1', 'course 2', 'course 3', 'course 4', 'course 5', 'course 6', 'course 7', 'course 8',
      'courses', 'malaysia', 'apply now', 'requirements', 'benefits', 'eligibility',
      'deadline full scholarship'
    ]

    const validCourses = courses.filter(c => {
      const cc = normalize(c)
      // Filter out short single-word non-descriptive terms
      if (cc.split(' ').length === 1 && !['engineering', 'accounting', 'business', 'nursing', 'law', 'medicine'].includes(cc)) {
        return false
      }
      // Filter out invalid terms
      return !invalidTerms.includes(cc)
    })

    const hasConstraint = validCourses.length > 0
    if (!hasConstraint) return { ok: true, detail: "Open to any program" }

    const p = normalize(program)

    // Check if scholarship is open to all diploma/degree programs
    const educationLevelMatch = validCourses.some(c => {
      const cc = normalize(c);
      return (cc === 'diploma' || cc === 'degree' || cc === 'bachelor' ||
              cc === 'bachelor degree' || cc === 'diploma programs' || cc === 'degree programs') &&
             (p.includes(cc) || p.includes('diploma') || p.includes('degree') || p.includes('bachelor'));
    });

    if (educationLevelMatch) {
      // If it's just an education level match, show that it's open to all programs at that level
      const level = p.includes('diploma') ? 'Diploma' : p.includes('degree') || p.includes('bachelor') ? 'Degree' : 'your';
      return { ok: true, detail: `Open to all ${level} programs` };
    }

    const matchingCourses = validCourses.filter((c) => {
      const cc = normalize(c)
      if (!cc || !p) return false

      // Skip generic education levels
      if (cc === 'diploma' || cc === 'degree' || cc === 'bachelor' ||
           cc === 'bachelor degree' || cc === 'diploma programs' || cc === 'degree programs') {
        return false;
      }

      // Split course on slashes to handle "IT / Computer Science / Software Engineering"
      const courseParts = cc.split('/').map(part => part.trim());

      // Check each part separately
      for (const coursePart of courseParts) {
        // Exact match
        if (coursePart === p) return true;

        // Check if course name appears in program (e.g., "Computer Science" in "Diploma in Computer Science")
        if (p.includes(coursePart) && coursePart.split(' ').length >= 2) return true;

        // Check if program name appears in course (e.g., "Computer Science" matches "Diploma Computer Science")
        if (coursePart.includes(p) && p.split(' ').length >= 2) return true;

        // Extract field name from program (e.g., "computer science" from "diploma in computer science")
        const programWords = p.split(/\s+/);
        const courseWords = coursePart.split(/\s+/);

        // Match if the actual field name matches (ignoring "diploma"/"degree" prefix and "in")
        const programField = programWords.filter(w =>
          w !== 'diploma' && w !== 'degree' && w !== 'bachelor' && w !== 'sarjana' && w !== 'muda' && w !== 'in'
        ).join(' ');
        const courseField = courseWords.filter(w =>
          w !== 'diploma' && w !== 'degree' && w !== 'bachelor' && w !== 'sarjana' && w !== 'muda' && w !== 'in'
        ).join(' ');

        if (programField && courseField && (programField.includes(courseField) || courseField.includes(programField))) {
          return true;
        }
      }

      return false;
    })

    const ok = matchingCourses.length > 0

    if (ok) {
      // Show matching courses (limit to 3 for display)
      const displayCourses = matchingCourses.slice(0, 3)
      const moreCount = matchingCourses.length - 3
      const coursesList = displayCourses.map(capitalizeWords).join(", ")
      const detail = moreCount > 0
        ? `Program Matches: ${coursesList}, +${moreCount} more`
        : `Program Matches: ${coursesList}`
      return { ok: true, detail }
    } else {
      return { ok: false, detail: "Program does not match eligible courses" }
    }
  }

  const getEligibilityReasons = (scholarship) => {
    const reasons = []
    const req = scholarship?.requirements || {}
    const minGpa = typeof req.minGPA === "number" ? req.minGPA : null
    
    let gpaReason, gpaOk = true;
    if (minGpa === null || isNaN(minGpa) || minGpa === 0) {
      gpaReason = "No minimum GPA required"
    } else if (Number(studentCtx.cgpa) >= minGpa) {
      gpaReason = `Meets minimum GPA (${Number(studentCtx.cgpa).toFixed(2)} ≥ ${minGpa.toFixed(2)})`
    } else {
      gpaReason = `Below minimum GPA (${Number(studentCtx.cgpa).toFixed(2)} < ${minGpa.toFixed(2)})`
      gpaOk = false;
    }
    reasons.push({ text: gpaReason, ok: gpaOk });


    const prog = programMatches(scholarship?.eligibleCourses, studentCtx.program)
    reasons.push({ text: prog.detail, ok: prog.ok });
    
    if (scholarship.requirements.maxAge < 100) {
        reasons.push({ text: `Meets Max Age requirement (< ${scholarship.requirements.maxAge} years)`, ok: true });
    }
    
    if (scholarship.requirements.financialNeed !== "any" && scholarship.requirements.financialNeed !== "") {
        reasons.push({ text: `Requires Financial Need: ${capitalizeWords(scholarship.requirements.financialNeed)}`, ok: false });
    }


    return reasons
  }
  
  const getEligibilityIndicator = (reasons) => {
      const allOk = reasons.every(r => r.ok);
      if (allOk) return { color: "#10b981", icon: "✓ Full Match" };
      
      const gpaOk = reasons.find(r => r.text.includes("GPA"))?.ok;
      const programOk = reasons.find(r => r.text.includes("Program Matches") || r.text.includes("Open to any program"))?.ok;
      
      if (gpaOk && programOk) return { color: "#f59e0b", icon: "Partial Match" };
      return { color: "#ef4444", icon: "Low Match" };
  }

  if (loading) {
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

  return (
    <div className="page-wrapper">
      <Header navItems={[{ to: "/upload", label: "Upload Documents" }]} />

      <div className="container">
        {/* Header Section */}
        <div className="hero-section">
          <div className="hero-badge">
            <FaGraduationCap className="w-8 h-8 text-blue-600" />
            <span className="hero-badge-text">Scholarship Matches</span>
          </div>
          <h1 className="hero-title">
            {studentName ? `Congratulations, ${studentName}!` : "Your Scholarship Matches"}
          </h1>
          <p className="hero-description">
            {matches.length > 0
              ? `We found ${matches.length} scholarships that match your profile. Review the requirements and apply now!`
              : "Based on your profile, here are scholarships that match your qualifications."}
          </p>
        </div>
        {/* End Header Section */}

        {message && (
          <div className="alert-message" style={{
            backgroundColor: message.includes("success") || message.includes("submitted") ? "#f0fdf4" : "#fef2f2",
            color: message.includes("success") || message.includes("submitted") ? "#166534" : "#991b1b",
            border: `1px solid ${message.includes("success") || message.includes("submitted") ? "#bbf7d0" : "#fecaca"}`,
          }}>
            {message}
          </div>
        )}

        {matches.length === 0 ? (
          <div className="no-matches-card">
            <h2>No Matches Found</h2>
            <p>
              We couldn't find any scholarships that match your current profile. Try **uploading more documents** to improve your matches.
            </p>
            <div className="cta-group">
              <Link to="/upload" className="btn-secondary">
                Upload Documents
              </Link>
            </div>
          </div>
        ) : (
          <div className="matches-grid">
            {matches.map((match) => {
              const scholarship = match.scholarship
              const hasDeadline = scholarship.deadline != null && scholarship.deadline !== ""
              const isExpired = hasDeadline && new Date(scholarship.deadline) < new Date()
              const reasons = getEligibilityReasons(scholarship);
              const indicator = getEligibilityIndicator(reasons);

              return (
                <div key={scholarship._id} className="scholarship-card match-card" style={{
                    borderTop: `4px solid ${indicator.color}`,
                    boxShadow: `0 4px 6px rgba(0,0,0,0.05), 0 1px 3px ${indicator.color}30`,
                }}>
                    
                  <div className="card-header">
                    <h3 className="scholarship-title">
                      {scholarship.title}
                    </h3>
                    <span className="match-indicator" style={{
                        backgroundColor: indicator.color,
                        color: indicator.color === "#f59e0b" ? "#78350f" : "white",
                    }}>
                        {indicator.icon}
                    </span>
                  </div>

                  <div className="deadline-info">
                    {hasDeadline ? (
                      <>
                        <span className={`deadline-text ${isExpired ? 'expired' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <HiOutlineCalendar className="w-4 h-4" />
                          Deadline: {formatDate(scholarship.deadline)}
                        </span>
                        {isExpired && <span className="expired-badge"> (Expired)</span>}
                      </>
                    ) : (
                      <span className="always-open-text">Always Open</span>
                    )}
                  </div>

                  <div className="card-body">
                    <div className="requirements-list">
                      <h4 className="list-title">Requirements:</h4>
                      <ul>
                        {scholarship.requirements.minGPA > 0 && <li>Min. GPA: **{scholarship.requirements.minGPA}**</li>}
                        {scholarship.requirements.maxAge < 100 && <li>Max. Age: **{scholarship.requirements.maxAge}**</li>}
                        {scholarship.requirements.majors.length > 0 && (
                          <li>Majors: **{scholarship.requirements.majors.slice(0, 3).join(", ")}**</li>
                        )}
                        {scholarship.requirements.financialNeed !== "any" && (
                          <li>Financial Need: **{capitalizeWords(scholarship.requirements.financialNeed)}**</li>
                        )}
                      </ul>
                    </div>

                    <div className="match-reasons">
                      <h4 className="list-title">Why you match:</h4>
                      <ul>
                        {reasons.map((reason, idx) => (
                          <li key={idx} className={reason.ok ? 'reason-ok' : 'reason-not-ok'}>
                              {reason.ok ? (
                                <HiCheckCircle className="w-5 h-5 text-green-600 inline" />
                              ) : (
                                <HiXCircle className="w-5 h-5 text-red-600 inline" />
                              )}
                              <span style={{ marginLeft: '0.5rem' }}>{reason.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="card-footer">
                    {match.applied ? (
                      <button className="btn-applied" disabled>
                        ✓ Applied
                      </button>
                    ) : isExpired && hasDeadline ? (
                      <button className="btn-expired" disabled>
                        Expired
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApplyNowClick(scholarship)}
                        className="btn-apply-now"
                      >
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Non-Matching Scholarships Section */}
        {nonMatches.length > 0 && (
          <div className="non-matches-section">
            <div className="non-matches-header">
              <h2 className="non-matches-title">
                Other Available Scholarships
              </h2>
              <p className="non-matches-subtitle">
                These scholarships are available but don't meet all your current qualifications. **See why below**:
              </p>
            </div>

            <div className="matches-grid">
              {nonMatches.map((item) => {
                const scholarship = item.scholarship
                const reasons = item.reasons || []
                const hasDeadline = scholarship.deadline != null && scholarship.deadline !== ""

                return (
                  <div key={scholarship._id} className="scholarship-card non-match-card">
                    <div className="non-match-badge">
                      Not Eligible
                    </div>

                    <h3 className="scholarship-title non-match-title">
                      {scholarship.scholarshipName || scholarship.title}
                    </h3>

                    {hasDeadline && (
                      <div className="non-match-deadline">
                        <HiOutlineCalendar className="w-4 h-4 inline" />
                        <span style={{ marginLeft: '0.25rem' }}>
                          Deadline: {formatDate(scholarship.deadline)}
                        </span>
                      </div>
                    )}

                    <div className="non-match-reasons-list">
                      <h4 className="non-match-list-title">
                        Why you don't qualify:
                      </h4>
                      <ul>
                        {reasons.map((reason, idx) => (
                          <li key={idx}>
                            <HiXCircle className="w-4 h-4 inline text-red-600" />
                            <span style={{ marginLeft: '0.25rem' }}>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="card-footer">
                        <button
                            onClick={() => handleApplyNowClick(scholarship)}
                            className="btn-apply-now-secondary"
                        >
                            View Details Anyway
                        </button>
                    </div>
                  </div>
                )
              })}
            </div>
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

      {/* --- Styles Block --- */}
      <style jsx>{`
        /* Global & Layout */
        .page-wrapper {
          min-height: 100vh;
          background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%);
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 3rem 2rem;
        }

        /* Header Section */
        .hero-section {
          text-align: center;
          margin-bottom: 4rem;
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
            max-width: 48rem;
            margin: 0 auto;
            line-height: 1.75;
        }

        /* Alerts */
        .alert-message {
            padding: 1rem 1.5rem;
            margin-bottom: 2rem;
            border-radius: 12px;
            font-weight: 600;
            transition: all 0.3s ease;
        }

        /* No Matches Card */
        .no-matches-card {
            background-color: white;
            padding: 3rem;
            border-radius: 16px;
            text-align: center;
            border: 1px solid #e5e7eb;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
        }

        .no-matches-card h2 {
            font-size: 1.8rem;
            color: #111827;
            font-weight: 800;
            margin-bottom: 1rem;
        }

        .no-matches-card p {
            color: #6b7280;
            margin-bottom: 2rem;
            line-height: 1.7;
        }

        .cta-group {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
        }

        .btn-primary, .btn-secondary {
            padding: 0.875rem 2rem;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .btn-primary {
            background: #2563eb;
            color: white;
        }

        .btn-primary:hover {
            background: #1d4ed8;
            transform: translateY(-2px);
            box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);
        }

        .btn-secondary {
            background-color: white;
            color: #374151;
            border: 1px solid #d1d5db;
        }
        
        .btn-secondary:hover {
            background: #f9fafb;
            border-color: #9ca3af;
            transform: translateY(-2px);
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        }

        /* Matches Grid */
        .matches-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 2rem;
        }

        /* Scholarship Card (General) */
        .scholarship-card {
            background-color: white;
            padding: 1.5rem;
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            height: 100%;
            border: 1px solid #e5e7eb;
            transition: all 0.3s ease;
        }

        .scholarship-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 15px 30px rgba(0,0,0,0.08);
        }
        
        /* Match Card Specifics */
        .match-card {
            border-left: none; /* Removed original inline border */
        }
        
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 1rem;
            margin-bottom: 0.75rem;
        }

        .scholarship-title {
            font-size: 1.3rem;
            font-weight: 700;
            color: #111827;
            line-height: 1.4;
            margin: 0;
            flex-grow: 1;
        }

        .match-indicator {
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 700;
            flex-shrink: 0;
        }

        .deadline-info {
            font-size: 0.875rem;
            margin-bottom: 1.5rem;
            font-weight: 500;
        }
        
        .deadline-text {
            color: #6b7280;
        }

        .expired {
            color: #ef4444;
        }
        
        .expired-badge {
            color: #ef4444;
            font-weight: 700;
            margin-left: 0.25rem;
        }

        .always-open-text {
            color: #10b981;
            font-weight: 700;
        }

        .card-body {
            flex-grow: 1;
            padding-bottom: 1rem;
            border-bottom: 1px solid #f3f4f6;
            margin-bottom: 1.5rem;
        }

        .requirements-list, .match-reasons {
            margin-bottom: 1.5rem;
        }
        
        .list-title {
            font-size: 0.9rem;
            font-weight: 700;
            margin-bottom: 0.75rem;
            color: #111827;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .requirements-list ul, .match-reasons ul {
            font-size: 0.875rem;
            color: #6b7280;
            padding-left: 1.25rem;
            margin: 0;
            line-height: 1.7;
        }
        
        .match-reasons ul li {
            list-style: none;
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
            margin-bottom: 0.25rem;
        }

        .reason-icon {
            font-size: 0.75rem;
            line-height: 1.5;
        }

        .reason-not-ok {
            color: #ef4444; /* Highlight negative reasons */
        }
        
        .reason-not-ok .reason-icon {
            content: '🔴';
        }
        
        /* Card Footer (Buttons) */
        .card-footer {
            margin-top: auto;
            padding-top: 0.5rem;
        }

        .btn-applied, .btn-expired, .btn-apply-now, .btn-apply-now-secondary {
            width: 100%;
            padding: 0.875rem;
            border: none;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s ease;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .btn-applied {
            background-color: #10b981;
            color: white;
            cursor: not-allowed;
            opacity: 0.8;
        }

        .btn-expired {
            background-color: #9ca3af;
            color: white;
            cursor: not-allowed;
        }

        .btn-apply-now {
            background: #2563eb;
            color: white;
        }

        .btn-apply-now:hover {
            background: #1d4ed8;
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
        }
        
        /* Non-Match Card Specifics */
        .non-matches-section {
            margin-top: 5rem;
            padding-top: 2rem;
            border-top: 1px solid #e5e7eb;
        }

        .non-matches-header {
            margin-bottom: 2rem;
            border-left: 4px solid #f59e0b;
            padding-left: 1.5rem;
        }

        .non-matches-title {
            font-size: 1.75rem;
            color: #111827;
            font-weight: 800;
            margin-bottom: 0.5rem;
            letter-spacing: -0.01em;
        }

        .non-matches-subtitle {
            color: #6b7280;
            font-size: 1rem;
        }

        .non-match-card {
            background-color: #fefcf9; /* Very light yellow/cream */
            opacity: 1; /* Reset opacity from original inline style */
            border: 1px solid #fef3c7; /* Light yellow border */
            border-top: 4px solid #f59e0b;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .non-match-badge {
            background-color: #fef3c7;
            color: #92400e;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            text-align: right;
            align-self: flex-end;
            margin-bottom: 1rem;
        }
        
        .non-match-title {
            color: #374151;
            font-size: 1.25rem;
            font-weight: 700;
        }

        .non-match-deadline {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
            color: #6b7280;
            font-size: 0.875rem;
        }

        .non-match-reasons-list {
            flex: 1;
        }

        .non-match-list-title {
            font-size: 0.9rem;
            font-weight: 700;
            color: #ef4444;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .non-match-reasons-list ul {
            font-size: 0.875rem;
            color: #6b7280;
            padding-left: 1.25rem;
            margin: 0;
            line-height: 1.7;
        }
        
        .non-match-reasons-list ul li {
             list-style: none;
             margin-bottom: 0.25rem;
        }

        .btn-apply-now-secondary {
            background: white;
            color: #2563eb;
            border: 1px solid #2563eb;
            box-shadow: none;
        }
        
        .btn-apply-now-secondary:hover {
            background: #eef2ff;
            transform: translateY(-2px);
            box-shadow: 0 4px 10px rgba(37, 99, 235, 0.1);
        }
        
        /* Media Queries */
        @media (max-width: 1024px) {
            .matches-grid {
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            }
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 2rem 1rem;
            }
            .hero-title {
                font-size: 2rem;
            }
            .hero-description {
                font-size: 1rem;
            }
            .no-matches-card {
                padding: 2rem 1rem;
            }
            .matches-grid {
                grid-template-columns: 1fr;
                gap: 1.5rem;
            }
            .scholarship-card {
                padding: 1.25rem;
            }
            .non-matches-header {
                padding-left: 1rem;
            }
        }
      `}</style>
    </div>
  )
}

export default ResultsPage