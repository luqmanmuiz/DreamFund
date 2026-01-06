"use client";

import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "../components/Header";
import { useAuth } from "../contexts/AuthContext";
import { useScholarships } from "../contexts/ScholarshipContext";
import { HiCheckCircle, HiXCircle } from "react-icons/hi2";
import { FaGraduationCap } from "react-icons/fa";
import {
  trackScholarshipClick,
  markPendingFeedback,
  getNextFeedbackNeeded,
  markFeedbackShown,
  clearPendingFeedback,
} from "../utils/sessionUtils";
import FeedbackBanner from "../components/FeedbackBanner";
import { HiOutlineCalendar } from "react-icons/hi2";

const ResultsPage = () => {
  const { userId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { getScholarshipMatches } = useScholarships();
  const [matches, setMatches] = useState([]);
  const [nonMatches, setNonMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [studentCtx, setStudentCtx] = useState({ cgpa: 0, program: "" });
  const [studentName, setStudentName] = useState("");
  const [feedbackScholarship, setFeedbackScholarship] = useState(null);
  const [appliedScholarships, setAppliedScholarships] = useState([]);

  const capitalizeWords = (str) => {
    if (!str || typeof str !== "string") return "";
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Load applied scholarships from localStorage on mount
  useEffect(() => {
    if (matches.length > 0 || nonMatches.length > 0) {
      // Load both matched and non-matched applied scholarships
      const matchedKey = `feedbackResponded_matched_${userId || "guest"}`;
      const nonMatchedKey = `feedbackResponded_nonmatched_${userId || "guest"}`;

      const matchedResponded = JSON.parse(
        localStorage.getItem(matchedKey) || "[]"
      );
      const nonMatchedResponded = JSON.parse(
        localStorage.getItem(nonMatchedKey) || "[]"
      );

      // Combine both arrays
      const allApplied = [...matchedResponded, ...nonMatchedResponded];

      // Filter to only include scholarships in current results
      const allScholarshipIds = [
        ...matches.map((m) => m.scholarship._id),
        ...nonMatches.map((nm) => nm.scholarship._id),
      ];
      const validApplied = allApplied.filter((id) =>
        allScholarshipIds.includes(id)
      );
      setAppliedScholarships(validApplied);
    }
  }, [matches, nonMatches, userId]);

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      setMessage("");
      try {
        if (user && userId && user.id === userId) {
          const matchData = await getScholarshipMatches(userId);
          setMatches(matchData);
          const cgpa = Number(user?.profile?.gpa || 0);
          const program =
            typeof user?.profile?.program === "string"
              ? user.profile.program
              : user?.profile?.major || "";
          setStudentCtx({ cgpa, program });
          setStudentName(capitalizeWords(user.name));
        } else {
          let guestProfile = null;
          try {
            const guestRes = await fetch(
              `http://localhost:5000/api/guests/${userId}`
            );
            if (guestRes.ok) {
              const guestData = await guestRes.json();
              if (guestData.success) {
                guestProfile = guestData.profile;
              }
            }
          } catch (e) {}

          if (!guestProfile) {
            setMessage(
              "Profile not found or expired. Please upload your transcript again."
            );
            setLoading(false);
            return;
          }

          const cgpa = guestProfile.cgpa || 0;
          const program = guestProfile.program || "";

          setStudentCtx({ cgpa, program });
          const name = guestProfile.name || "Student";
          setStudentName(capitalizeWords(name));

          let res;
          try {
            res = await fetch(
              "http://localhost:5000/api/scholarships/public-matches",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cgpa, program }),
              }
            );
          } catch (_) {}

          if (res && res.ok) {
            const data = await res.json();
            setMatches(
              Array.isArray(data)
                ? data
                : Array.isArray(data?.matches)
                ? data.matches
                : []
            );
            setNonMatches(
              Array.isArray(data?.nonMatches) ? data.nonMatches : []
            );
          } else {
            setMessage("Could not fetch matches from server.");
          }
        }
      } catch (error) {
        setMessage("Failed to load scholarship matches");
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [user, userId, getScholarshipMatches]);

  useEffect(() => {
    const checkForFeedback = () => {
      if (document.visibilityState === "visible") {
        const scholarshipId = getNextFeedbackNeeded();
        if (scholarshipId && !feedbackScholarship) {
          const scholarship =
            matches.find((m) => m.scholarship._id === scholarshipId) ||
            nonMatches.find((m) => m.scholarship._id === scholarshipId);
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

    checkForFeedback();
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
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  const handleApplyNowClick = async (scholarship, isMatched = true) => {
    if (!scholarship.provider.website) {
      alert("No website available for this scholarship provider");
      return;
    }

    trackScholarshipClick(scholarship._id, user?._id || null, isMatched).catch(
      (err) => {
        console.log("Tracking failed:", err);
      }
    );

    // Only mark pending feedback if scholarship hasn't been applied yet
    const alreadyApplied = appliedScholarships.includes(scholarship._id);
    if (!alreadyApplied) {
      markPendingFeedback(scholarship._id);
    }

    window.open(scholarship.provider.website, "_blank");

    // Only show feedback banner if not already applied
    if (!alreadyApplied) {
      setTimeout(() => {
        if (!feedbackScholarship) {
          setFeedbackScholarship({
            id: scholarship._id,
            title: scholarship.title,
            isMatched: isMatched,
          });
          markFeedbackShown(scholarship._id);
        }
      }, 2500);
    }
  };

  const handleScholarshipApplied = (scholarshipId) => {
    if (!appliedScholarships.includes(scholarshipId)) {
      setAppliedScholarships((prev) => [...prev, scholarshipId]);
    }
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
    });
  };

  const normalize = (s) =>
    typeof s === "string" ? s.trim().toLowerCase() : "";

  const programMatches = (eligibleCourses, program) => {
    const courses = Array.isArray(eligibleCourses) ? eligibleCourses : [];
    const invalidTerms = [
      "amount",
      "deadline",
      "overview",
      "where to study",
      "study level",
      "study levels",
      "full scholarship",
      "public university",
      "private university",
      "pre university",
      "course 1",
      "course 2",
      "course 3",
      "course 4",
      "course 5",
      "course 6",
      "course 7",
      "course 8",
      "courses",
      "malaysia",
      "apply now",
      "requirements",
      "benefits",
      "eligibility",
      "deadline full scholarship",
    ];

    const validCourses = courses.filter((c) => {
      const cc = normalize(c);
      if (
        cc.split(" ").length === 1 &&
        ![
          "engineering",
          "accounting",
          "business",
          "nursing",
          "law",
          "medicine",
        ].includes(cc)
      ) {
        return false;
      }
      return !invalidTerms.includes(cc);
    });

    const hasConstraint = validCourses.length > 0;
    if (!hasConstraint) return { ok: true, detail: "Open to any program" };

    const isOpenToAll = validCourses.some((c) => {
      const cc = normalize(c);
      return (
        cc === "all fields" ||
        cc === "all" ||
        cc === "any field" ||
        cc === "any"
      );
    });

    if (isOpenToAll) {
      return { ok: true, detail: "Open to all fields" };
    }

    const p = normalize(program);
    const educationLevelMatch = validCourses.some((c) => {
      const cc = normalize(c);
      return (
        (cc === "diploma" ||
          cc === "degree" ||
          cc === "bachelor" ||
          cc === "bachelor degree" ||
          cc === "diploma programs" ||
          cc === "degree programs") &&
        (p.includes(cc) ||
          p.includes("diploma") ||
          p.includes("degree") ||
          p.includes("bachelor"))
      );
    });

    if (educationLevelMatch) {
      const level = p.includes("diploma")
        ? "Diploma"
        : p.includes("degree") || p.includes("bachelor")
        ? "Degree"
        : "your";
      return { ok: true, detail: `Open to all ${level} programs` };
    }

    const matchingCourses = validCourses.filter((c) => {
      const cc = normalize(c);
      if (!cc || !p) return false;
      if (
        cc === "diploma" ||
        cc === "degree" ||
        cc === "bachelor" ||
        cc === "bachelor degree" ||
        cc === "diploma programs" ||
        cc === "degree programs"
      ) {
        return false;
      }
      const courseParts = cc.split("/").map((part) => part.trim());
      for (const coursePart of courseParts) {
        if (coursePart === p) return true;
        if (p.includes(coursePart) && coursePart.split(" ").length >= 2)
          return true;
        if (coursePart.includes(p) && p.split(" ").length >= 2) return true;
        const programWords = p.split(/\s+/);
        const courseWords = coursePart.split(/\s+/);
        const programField = programWords
          .filter(
            (w) =>
              w !== "diploma" &&
              w !== "degree" &&
              w !== "bachelor" &&
              w !== "sarjana" &&
              w !== "muda" &&
              w !== "in"
          )
          .join(" ");
        const courseField = courseWords
          .filter(
            (w) =>
              w !== "diploma" &&
              w !== "degree" &&
              w !== "bachelor" &&
              w !== "sarjana" &&
              w !== "muda" &&
              w !== "in"
          )
          .join(" ");

        if (
          programField &&
          courseField &&
          (programField.includes(courseField) ||
            courseField.includes(programField))
        ) {
          return true;
        }
      }
      return false;
    });

    const ok = matchingCourses.length > 0;
    if (ok) {
      const displayCourses = matchingCourses.slice(0, 3);
      const moreCount = matchingCourses.length - 3;
      const coursesList = displayCourses.map(capitalizeWords).join(", ");
      const detail =
        moreCount > 0
          ? `Program Matches: ${coursesList}, +${moreCount} more`
          : `Program Matches: ${coursesList}`;
      return { ok: true, detail };
    } else {
      return { ok: false, detail: "Program does not match eligible courses" };
    }
  };

  const getEligibilityReasons = (scholarship) => {
    const reasons = [];
    const req = scholarship?.requirements || {};
    const minGpa = typeof req.minGPA === "number" ? req.minGPA : null;

    let gpaReason,
      gpaOk = true;
    if (minGpa === null || isNaN(minGpa) || minGpa === 0) {
      gpaReason = "No minimum GPA required";
    } else if (Number(studentCtx.cgpa) >= minGpa) {
      gpaReason = `Meets minimum GPA (${Number(studentCtx.cgpa).toFixed(
        2
      )} ≥ ${minGpa.toFixed(2)})`;
    } else {
      gpaReason = `Below minimum GPA (${Number(studentCtx.cgpa).toFixed(
        2
      )} < ${minGpa.toFixed(2)})`;
      gpaOk = false;
    }
    reasons.push({ text: gpaReason, ok: gpaOk });

    const prog = programMatches(
      scholarship?.eligibleCourses,
      studentCtx.program
    );
    reasons.push({ text: prog.detail, ok: prog.ok });

    return reasons;
  };

  const getEligibilityIndicator = (reasons) => {
    const allOk = reasons.every((r) => r.ok);
    if (allOk) return { color: "#10b981", icon: "✓ Full Match" };

    const gpaOk = reasons.find((r) => r.text.includes("GPA"))?.ok;
    const programOk = reasons.find(
      (r) =>
        r.text.includes("Program Matches") ||
        r.text.includes("Open to any program")
    )?.ok;

    if (gpaOk && programOk) return { color: "#f59e0b", icon: "Partial Match" };
    return { color: "#ef4444", icon: "Low Match" };
  };

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
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
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
            {studentName
              ? `Congratulations, ${studentName}!`
              : "Your Scholarship Matches"}
          </h1>
          <p className="hero-description">
            {matches.length > 0
              ? `We found ${matches.length} scholarships that match your profile. Review the requirements and apply now!`
              : "Based on your profile, here are scholarships that match your qualifications."}
          </p>
        </div>

        {message && (
          <div
            className="alert-message"
            style={{
              backgroundColor:
                message.includes("success") || message.includes("submitted")
                  ? "#f0fdf4"
                  : "#fef2f2",
              color:
                message.includes("success") || message.includes("submitted")
                  ? "#166534"
                  : "#991b1b",
              border: `1px solid ${
                message.includes("success") || message.includes("submitted")
                  ? "#bbf7d0"
                  : "#fecaca"
              }`,
            }}
          >
            {message}
          </div>
        )}

        {matches.length === 0 ? (
          <div className="no-matches-card">
            <h2>No Matches Found</h2>
            <p>
              We couldn't find any scholarships that match your current profile.
              Try **uploading more documents** to improve your matches.
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
              const scholarship = match.scholarship;
              const hasDeadline =
                scholarship.deadline != null && scholarship.deadline !== "";
              const isExpired =
                hasDeadline && new Date(scholarship.deadline) < new Date();
              const reasons = getEligibilityReasons(scholarship);
              const indicator = getEligibilityIndicator(reasons);
              const isApplied = appliedScholarships.includes(scholarship._id);

              return (
                <div
                  key={scholarship._id}
                  className="scholarship-card match-card"
                  style={{
                    borderTop: `4px solid ${indicator.color}`,
                    boxShadow: `0 4px 6px rgba(0,0,0,0.05), 0 1px 3px ${indicator.color}30`,
                  }}
                >
                  {/* NEW TOP ROW: Holds Applied Badge (Left) and Match Indicator (Right) */}
                  <div className="card-top-row">
                    {isApplied ? (
                      <div className="applied-badge">
                        <HiCheckCircle className="w-4 h-4" />
                        <span>Applied</span>
                      </div>
                    ) : (
                      <div className="spacer"></div>
                    )}

                    <span
                      className="match-indicator"
                      style={{
                        backgroundColor: indicator.color,
                        color:
                          indicator.color === "#f59e0b" ? "#78350f" : "white",
                      }}
                    >
                      {indicator.icon}
                    </span>
                  </div>

                  {/* Title is now in its own block, unaffected by absolute positioning */}
                  <div className="card-header-title">
                    <h3 className="scholarship-title">{scholarship.title}</h3>
                  </div>

                  <div className="deadline-info">
                    {hasDeadline ? (
                      <>
                        <span
                          className={`deadline-text ${
                            isExpired ? "expired" : ""
                          }`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <HiOutlineCalendar className="w-4 h-4" />
                          Deadline: {formatDate(scholarship.deadline)}
                        </span>
                        {isExpired && (
                          <span className="expired-badge"> (Expired)</span>
                        )}
                      </>
                    ) : (
                      <span className="always-open-text">Always Open</span>
                    )}
                  </div>

                  <div className="card-body">
                    <div className="requirements-list">
                      <h4 className="list-title">Requirements:</h4>
                      <ul>
                        {scholarship.requirements.minGPA > 0 && (
                          <li>
                            Minimum CGPA:{" "}
                            {scholarship.requirements.minGPA.toFixed(2)}
                          </li>
                        )}
                      </ul>
                    </div>

                    <div className="match-reasons">
                      <h4 className="list-title">Why you match:</h4>
                      <ul>
                        {reasons.map((reason, idx) => (
                          <li
                            key={idx}
                            className={
                              reason.ok ? "reason-ok" : "reason-not-ok"
                            }
                          >
                            {reason.ok ? (
                              <HiCheckCircle className="w-5 h-5 text-green-600 inline" />
                            ) : (
                              <HiXCircle className="w-5 h-5 text-red-600 inline" />
                            )}
                            <span style={{ marginLeft: "0.5rem" }}>
                              {reason.text}
                            </span>
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
                        onClick={() => handleApplyNowClick(scholarship, true)}
                        className="btn-apply-now"
                      >
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>
              );
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
                These scholarships are available but don't meet all your current
                qualifications:{" "}
              </p>
            </div>

            <div className="matches-grid">
              {nonMatches.map((item) => {
                const scholarship = item.scholarship;
                const reasons = item.reasons || [];
                const hasDeadline =
                  scholarship.deadline != null && scholarship.deadline !== "";
                const isApplied = appliedScholarships.includes(scholarship._id);

                return (
                  <div
                    key={scholarship._id}
                    className="scholarship-card non-match-card"
                  >
                    {/* UPDATED HEADER: Layout mimics the Match Card structure */}
                    <div className="card-top-row">
                      {isApplied ? (
                        <div className="applied-badge-nonmatch">
                          <HiCheckCircle className="w-4 h-4" />
                          <span>Applied</span>
                        </div>
                      ) : (
                        <div className="spacer"></div>
                      )}

                      <div className="non-match-badge">Not Eligible</div>
                    </div>

                    <div className="card-header-title">
                      <h3 className="scholarship-title non-match-title">
                        {scholarship.scholarshipName || scholarship.title}
                      </h3>
                    </div>

                    <div className="deadline-info">
                      {hasDeadline && (
                        <div className="non-match-deadline">
                          <HiOutlineCalendar className="w-4 h-4 inline" />
                          <span style={{ marginLeft: "0.25rem" }}>
                            Deadline: {formatDate(scholarship.deadline)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="card-body">
                      <div className="non-match-reasons-list">
                        <h4 className="non-match-list-title">
                          Why you don't qualify:
                        </h4>
                        <ul>
                          {reasons.map((reason, idx) => (
                            <li key={idx}>
                              <HiXCircle className="w-4 h-4 inline text-red-600" />
                              <span style={{ marginLeft: "0.25rem" }}>
                                {reason}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="card-footer">
                      <button
                        onClick={() => handleApplyNowClick(scholarship, false)}
                        className="btn-apply-now-secondary"
                      >
                        View Details Anyway
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {feedbackScholarship && (
        <FeedbackBanner
          scholarshipId={feedbackScholarship.id}
          scholarshipTitle={feedbackScholarship.title}
          onClose={handleFeedbackClose}
          onApplied={handleScholarshipApplied}
          isMatched={feedbackScholarship.isMatched}
        />
      )}

      {/* --- Styles Block --- */}
      <style jsx>{`
        /* Global & Layout */
        .page-wrapper {
          min-height: 100vh;
          background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%);
          font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
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

        .btn-primary,
        .btn-secondary {
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
          align-items: stretch;
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
          position: relative; /* Needed for stacking context */
        }

        .scholarship-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.08);
        }

        .match-card {
          border-left: none;
        }

        /* --- NEW HEADER LAYOUT --- */
        .card-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          min-height: 28px; /* Ensures space is reserved even if empty */
        }

        .card-header-title {
          margin-bottom: 0.75rem;
        }

        .scholarship-title {
          font-size: 1.3rem;
          font-weight: 700;
          color: #111827;
          line-height: 1.4;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
          min-height: 3.6rem;
        }

        /* --- UPDATED APPLIED BADGE --- */
        .applied-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          background-color: #ecfdf5; /* Light Green */
          color: #059669; /* Dark Green Text */
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          border: 1px solid #a7f3d0;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        /* --- UPDATED APPLIED BADGE (NON-MATCH) --- */
        .applied-badge-nonmatch {
          display: inline-flex; /* Changed from absolute */
          align-items: center;
          gap: 0.375rem;
          background-color: #fef3c7; /* Original Yellow Background */
          color: #92400e; /* Original Brown/Orange Text */
          padding: 0.25rem 0.75rem; /* Matches .applied-badge */
          border-radius: 9999px; /* Matches .applied-badge */
          font-size: 0.75rem; /* Matches .applied-badge */
          font-weight: 700; /* Matches .applied-badge */
          border: 1px solid #fcd34d; /* Matches style with yellow border */
          text-transform: uppercase; /* Matches .applied-badge */
          letter-spacing: 0.025em; /* Matches .applied-badge */
        }

        .match-indicator {
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          flex-shrink: 0;
          /* If no applied badge, push to right */
          margin-left: auto;
        }

        /* If applied badge exists, reset margin for match indicator handled by justify-between */
        .card-top-row > .match-indicator {
          margin-left: 0;
        }

        .deadline-info {
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
          font-weight: 500;
          min-height: 1.5rem;
          display: flex;
          align-items: center;
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
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .list-title {
          font-size: 0.9rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .requirements-list ul,
        .match-reasons ul {
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

        .reason-not-ok {
          color: #ef4444;
        }

        .card-footer {
          margin-top: auto;
          padding-top: 0.5rem;
        }

        .btn-applied,
        .btn-expired,
        .btn-apply-now,
        .btn-apply-now-secondary {
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
          background-color: #fefcf9;
          opacity: 1;
          border: 1px solid #fef3c7;
          border-top: 4px solid #f59e0b;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        /* Updated Non Match Badge: now positioned by flex, not absolute */
        .non-match-badge {
          background-color: #fef3c7;
          color: #92400e;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          flex-shrink: 0;
          /* If no applied badge, push to right */
          margin-left: auto;
        }

        /* If applied badge exists, reset margin */
        .card-top-row > .non-match-badge {
          margin-left: 0;
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
  );
};

export default ResultsPage;
