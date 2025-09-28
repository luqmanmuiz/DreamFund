"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { useScholarships } from "../../contexts/ScholarshipContext"
import AdminLayout from "../../components/AdminLayout"

const ScholarshipManagement = () => {
  const { user, logout } = useAuth()
  const { scholarships, createScholarship, updateScholarship, deleteScholarship, fetchScholarships } = useScholarships()

  const [showForm, setShowForm] = useState(false)
  const [editingScholarship, setEditingScholarship] = useState(null)
  const [filterStatus, setFilterStatus] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    deadline: "",
    studyLevels: [],
    requirements: {
      minGPA: "",
      maxAge: "",
      majors: [],
      financialNeed: "any",
      extracurriculars: [],
      achievements: [],
    },
    provider: {
      name: "",
      contact: "",
      website: "",
    },
    status: "active",
    eligibleCourses: [],
  })
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [scrapeLoading, setScrapeLoading] = useState(false)
  const [scrapeMessage, setScrapeMessage] = useState("")

  useEffect(() => {
    fetchScholarships()
  }, [fetchScholarships])

  // Scraping function
  const handleScrapeScholarships = async () => {
    setScrapeLoading(true)
    setScrapeMessage("Starting to scrape scholarships...")

    try {
      // Temporary direct URL - use this if proxy doesn't work
      const response = await fetch("http://localhost:5000/api/scholarships/scrape-scholarships", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`, // If you use auth tokens
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        // Show detailed scraping results
        const scholarshipsList = result.scholarships ? result.scholarships.map((s) => s.title).join(", ") : "None"
        setScrapeMessage(`Successfully scraped ${result.count} scholarships: ${scholarshipsList}. ${result.note || ""}`)
        // Refresh the scholarships list
        await fetchScholarships()
      } else {
        setScrapeMessage(`Scraping failed: ${result.message}`)
      }
    } catch (error) {
      console.error("Scraping error:", error)
      setScrapeMessage(`Scraping failed: ${error.message}`)
    } finally {
      setScrapeLoading(false)
      // Clear message after 5 seconds
      setTimeout(() => setScrapeMessage(""), 5000)
    }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      amount: "",
      deadline: "",
      studyLevels: [],
      requirements: {
        minGPA: "",
        majors: [],
        financialNeed: "any",
        extracurriculars: [],
        achievements: [],
      },
      provider: {
        name: "",
        contact: "",
        website: "",
      },
      status: "active",
      eligibleCourses: [],
    })
    setEditingScholarship(null)
    setShowForm(false)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target

    if (name.includes(".")) {
      const [parent, child] = name.split(".")
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleArrayChange = (field, value) => {
    const array = value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item)
    setFormData((prev) => ({
      ...prev,
      requirements: {
        ...prev.requirements,
        [field]: array,
      },
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const scholarshipData = {
      ...formData,
      amount: Number.parseFloat(formData.amount),
      // Persist study levels, and set preferred single value
      studyLevels: Array.isArray(formData.studyLevels) ? formData.studyLevels : [],
      studyLevel: Array.isArray(formData.studyLevels)
        ? formData.studyLevels.includes("degree")
          ? "degree"
          : formData.studyLevels.includes("diploma")
            ? "diploma"
            : null
        : null,
      requirements: {
        ...formData.requirements,
        minGPA: Number.parseFloat(formData.requirements.minGPA) || 0,
      },
      eligibleCourses: Array.isArray(formData.eligibleCourses)
        ? formData.eligibleCourses
        : typeof formData.eligibleCourses === "string"
          ? formData.eligibleCourses
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
    }

    let result
    if (editingScholarship) {
      result = await updateScholarship(editingScholarship._id, scholarshipData)
    } else {
      result = await createScholarship(scholarshipData)
    }

    if (result.success) {
      setMessage(`Scholarship ${editingScholarship ? "updated" : "created"} successfully!`)
      resetForm()
    } else {
      setMessage(result.message)
    }
    setLoading(false)
  }

  const handleEdit = (scholarship) => {
    setFormData({
      title: scholarship.title,
      amount: scholarship.amount.toString(),
      deadline: scholarship.deadline ? new Date(scholarship.deadline).toISOString().split("T")[0] : "",
      studyLevels:
        scholarship.studyLevels && scholarship.studyLevels.length > 0
          ? scholarship.studyLevels
          : scholarship.studyLevel
            ? [scholarship.studyLevel]
            : [],
      requirements: {
        minGPA: scholarship.requirements.minGPA?.toString() || "",
        majors: scholarship.requirements.majors || [],
        financialNeed: scholarship.requirements.financialNeed || "any",
        extracurriculars: scholarship.requirements.extracurriculars || [],
        achievements: scholarship.requirements.achievements || [],
      },
      provider: {
        name: scholarship.provider.name || "",
        contact: scholarship.contactEmail || "",
        website: scholarship.provider.website || "",
      },
      status: scholarship.status,
      eligibleCourses: scholarship.eligibleCourses || [],
    })
    setEditingScholarship(scholarship)
    setShowForm(true)
  }

  const toggleStudyLevel = (level) => {
    setFormData((prev) => {
      const current = new Set(prev.studyLevels || [])
      if (current.has(level)) current.delete(level)
      else current.add(level)
      return { ...prev, studyLevels: Array.from(current) }
    })
  }

  const handleDelete = async (scholarshipId) => {
    if (window.confirm("Are you sure you want to delete this scholarship?")) {
      const result = await deleteScholarship(scholarshipId)
      if (result.success) {
        setMessage("Scholarship deleted successfully!")
      } else {
        setMessage(result.message)
      }
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const tryParseDeadline = (value) => {
    if (!value) return null
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value
    if (typeof value === "number") {
      const d = new Date(value)
      return isNaN(d.getTime()) ? null : d
    }
    if (typeof value === "string") {
      const m1 = value.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/)
      if (m1) {
        const dd = Number.parseInt(m1[1], 10)
        const mm = Number.parseInt(m1[2], 10) - 1
        const yyyy = Number.parseInt(m1[3], 10)
        const d = new Date(Date.UTC(yyyy, mm, dd))
        return isNaN(d.getTime()) ? null : d
      }
      const months = [
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december",
      ]
      const rxA = new RegExp(`\\b(\\d{1,2})\\s+(${months.join("|")})\\s+(\\d{4})\\b`, "i")
      const a = value.match(rxA)
      if (a) {
        const dd = Number.parseInt(a[1], 10)
        const mm = months.findIndex((m) => m.toLowerCase() === a[2].toLowerCase())
        const yyyy = Number.parseInt(a[3], 10)
        if (mm >= 0) {
          const d = new Date(Date.UTC(yyyy, mm, dd))
          return isNaN(d.getTime()) ? null : d
        }
      }
      const rxB = new RegExp(`\\b(${months.join("|")})\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, "i")
      const b = value.match(rxB)
      if (b) {
        const mm = months.findIndex((m) => m.toLowerCase() === b[1].toLowerCase())
        const dd = Number.parseInt(b[2], 10)
        const yyyy = Number.parseInt(b[3], 10)
        if (mm >= 0) {
          const d = new Date(Date.UTC(yyyy, mm, dd))
          return isNaN(d.getTime()) ? null : d
        }
      }
      const d = new Date(value)
      return isNaN(d.getTime()) ? null : d
    }
    return null
  }

  const computeDisplayStatus = (scholarship) => {
    try {
      // Check study levels first
      const studyLevels = scholarship.studyLevels || []
      const studyLevel = scholarship.studyLevel
      const hasValidStudyLevel =
        studyLevels.includes("degree") ||
        studyLevels.includes("diploma") ||
        studyLevel === "degree" ||
        studyLevel === "diploma"

      if (!hasValidStudyLevel) {
        return "not-eligible"
      }

      // Then check deadline if it exists
      const deadlineDate = tryParseDeadline(scholarship?.deadline) || tryParseDeadline(scholarship?.extractedDeadline)
      if (deadlineDate) {
        const now = new Date()
        const todayMidnightUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
        const dl = new Date(
          Date.UTC(deadlineDate.getUTCFullYear(), deadlineDate.getUTCMonth(), deadlineDate.getUTCDate()),
        )
        if (dl.getTime() < todayMidnightUtc.getTime()) return "inactive"
      }

      // If no deadline and has valid study level, keep the scholarship active
      return "active"
    } catch (e) {}
    return String(scholarship.status || "").toLowerCase() === "inactive" ? "inactive" : "active"
  }

  const headerActions = (
    <>
      <button
        onClick={handleScrapeScholarships}
        disabled={scrapeLoading}
        style={{
          padding: "0.75rem 1rem",
          background: scrapeLoading ? "#9ca3af" : "#f59e0b",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: scrapeLoading ? "not-allowed" : "pointer",
          fontWeight: "500",
        }}
      >
        {scrapeLoading ? "Scraping..." : "Scrape Scholarships"}
      </button>
      <button
        onClick={() => setShowForm(true)}
        style={{
          padding: "0.75rem 1rem",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "600",
        }}
      >
        Add New Scholarship
      </button>
    </>
  )

  return (
    <AdminLayout title="Scholarship Management" headerActions={headerActions}>
      <div style={{ marginBottom: "2rem" }}>
        <input
          type="text"
          placeholder="Search scholarships..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "400px",
            padding: "0.75rem",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            marginBottom: "1rem",
            outline: "none",
          }}
        />

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {["all", "active", "inactive", "not-eligible"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                background: filterStatus === status ? "#667eea" : "white",
                color: filterStatus === status ? "white" : "#374151",
                fontWeight: "500",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")} (
              {status === "all"
                ? scholarships.length
                : scholarships.filter((s) => computeDisplayStatus(s) === status).length}
              )
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: "0.75rem",
            marginBottom: "1rem",
            backgroundColor: message.includes("success") ? "#d1fae5" : "#fee2e2",
            color: message.includes("success") ? "#065f46" : "#991b1b",
            borderRadius: "6px",
            fontSize: "0.9rem",
          }}
        >
          {message}
        </div>
      )}

      {scrapeMessage && (
        <div
          style={{
            padding: "0.75rem",
            marginBottom: "1rem",
            backgroundColor: scrapeMessage.includes("Successfully") ? "#d1fae5" : "#fee2e2",
            color: scrapeMessage.includes("Successfully") ? "#065f46" : "#991b1b",
            borderRadius: "6px",
            fontSize: "0.9rem",
          }}
        >
          {scrapeMessage}
        </div>
      )}

      {/* Scholarship Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: "2rem" }}>
          <h3>{editingScholarship ? "Edit Scholarship" : "Add New Scholarship"}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  name="title"
                  className="form-input"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Amount ($)</label>
                <input
                  type="number"
                  name="amount"
                  className="form-input"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  min="0"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Deadline</label>
                <input
                  type="date"
                  name="deadline"
                  className="form-input"
                  value={formData.deadline}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select name="status" className="form-select" value={formData.status} onChange={handleInputChange}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Study Levels */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Study Levels</label>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      type="checkbox"
                      checked={(formData.studyLevels || []).includes("diploma")}
                      onChange={() => toggleStudyLevel("diploma")}
                    />
                    Diploma
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      type="checkbox"
                      checked={(formData.studyLevels || []).includes("degree")}
                      onChange={() => toggleStudyLevel("degree")}
                    />
                    Degree
                  </label>
                </div>
              </div>
            </div>

            {/* Requirements */}
            <h4>Requirements</h4>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Minimum GPA</label>
                <input
                  type="number"
                  name="requirements.minGPA"
                  className="form-input"
                  value={formData.requirements.minGPA}
                  onChange={handleInputChange}
                  min="0"
                  max="4"
                  step="0.01"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Financial Need</label>
                <select
                  name="requirements.financialNeed"
                  className="form-select"
                  value={formData.requirements.financialNeed}
                  onChange={handleInputChange}
                >
                  <option value="any">Any</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Eligible Courses/Fields (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                value={(formData.eligibleCourses || []).join(", ")}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    eligibleCourses: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder="Engineering, Technology, Data Science, AI, Finance, Economics"
              />
            </div>

            {/* Provider Information */}
            <h4>Provider Information</h4>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Provider Name</label>
                <input
                  type="text"
                  name="provider.name"
                  className="form-input"
                  value={formData.provider.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <input
                  type="email"
                  name="provider.contact"
                  className="form-input"
                  value={formData.provider.contact}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Website</label>
              <input
                type="url"
                name="provider.website"
                className="form-input"
                value={formData.provider.website}
                onChange={handleInputChange}
                placeholder="https://example.com"
              />
            </div>

            <div className="form-group">
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginRight: "1rem" }}>
                {loading ? "Saving..." : editingScholarship ? "Update Scholarship" : "Create Scholarship"}
              </button>
              <button type="button" onClick={resetForm} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "1rem",
        }}
      >
        {(scholarships || [])
          .filter((scholarship) => {
            const matchesSearch =
              scholarship.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (scholarship.provider?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
            const currentStatus = computeDisplayStatus(scholarship)
            const matchesFilter = filterStatus === "all" || currentStatus === filterStatus
            return matchesSearch && matchesFilter
          })
          .map((scholarship) => (
            <div
              key={scholarship._id}
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                minHeight: "200px",
              }}
            >
              <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem", fontWeight: "600" }}>{scholarship.title}</h4>
              <p style={{ margin: "0 0 1rem 0", color: "#6b7280", fontSize: "0.9rem" }}>
                {scholarship.provider?.name || "Unknown"} Scholarship
              </p>

              <div style={{ flexGrow: 1 }}></div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "1rem",
                }}
              >
                {(() => {
                  const displayStatus = computeDisplayStatus(scholarship)
                  return (
                    <span
                      style={{
                        padding: "0.25rem 0.75rem",
                        borderRadius: "12px",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        backgroundColor:
                          displayStatus === "active"
                            ? "#d1fae5"
                            : displayStatus === "not-eligible"
                              ? "#fef3c7"
                              : "#fee2e2",
                        color:
                          displayStatus === "active"
                            ? "#065f46"
                            : displayStatus === "not-eligible"
                              ? "#92400e"
                              : "#991b1b",
                      }}
                    >
                      {displayStatus
                        .split("-")
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(" ")}
                    </span>
                  )
                })()}

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => handleEdit(scholarship)}
                    style={{
                      padding: "0.5rem 0.75rem",
                      background: "#f3f4f6",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(scholarship._id)}
                    style={{
                      padding: "0.5rem 0.75rem",
                      background: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>
    </AdminLayout>
  )
}

export default ScholarshipManagement
