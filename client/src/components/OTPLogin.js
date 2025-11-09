"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import axios from "axios"

const OTPLogin = ({ onSuccess, onError }) => {
  const { loginWithOTP } = useAuth()
  const [email, setEmail] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [step, setStep] = useState("email") // 'email', 'otp', 'success'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)
  const [otpExpiry, setOtpExpiry] = useState(0)

  // Countdown timers
  useEffect(() => {
    let interval = null
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((resendCooldown) => resendCooldown - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [resendCooldown])

  useEffect(() => {
    let interval = null
    if (otpExpiry > 0) {
      interval = setInterval(() => {
        setOtpExpiry((otpExpiry) => {
          if (otpExpiry <= 1) {
            setError("OTP code has expired. Please request a new one.")
            return 0
          }
          return otpExpiry - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [otpExpiry])

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSendOTP = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!email) {
      setError("Please enter your email address")
      return
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address")
      return
    }

    setLoading(true)
    try {
      const response = await axios.post("/api/otp/send-otp", { email })

      if (response.data.success) {
        setSuccess("OTP sent to your email!")
        setStep("otp")
        setResendCooldown(60)
        setOtpExpiry(600)
      } else {
        setError(response.data.message || "Failed to send OTP")
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to send OTP. Please try again."
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!otpCode) {
      setError("Please enter the OTP code")
      return
    }

    if (!/^\d{6}$/.test(otpCode)) {
      setError("OTP code must be 6 digits")
      return
    }

    setLoading(true)
    try {
      const result = await loginWithOTP(email, otpCode)

      if (result.success) {
        setSuccess(result.message)
        setStep("success")
        if (onSuccess) onSuccess(result)
      } else {
        setError(result.message || "Invalid OTP code")
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to verify OTP. Please try again."
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return

    setError("")
    setLoading(true)
    try {
      const response = await axios.post("/api/otp/resend-otp", { email })

      if (response.data.success) {
        setSuccess("New OTP sent to your email!")
        setResendCooldown(60)
        setOtpExpiry(600)
        setOtpCode("")
      } else {
        setError(response.data.message || "Failed to resend OTP")
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to resend OTP. Please try again."
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleBackToEmail = () => {
    setStep("email")
    setOtpCode("")
    setError("")
    setSuccess("")
    setResendCooldown(0)
    setOtpExpiry(0)
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)",
        padding: "3rem 1rem",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          background: "white",
          borderRadius: "16px",
          padding: "3rem 2.5rem",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Header */}
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
            🎓
          </div>
          <h2
            style={{
              fontSize: "1.875rem",
              fontWeight: "700",
              color: "#111827",
              letterSpacing: "-0.01em",
              marginBottom: "0.5rem",
            }}
          >
            {step === "email" ? "Welcome to DreamFund" : "Verify Your Email"}
          </h2>
          <p
            style={{
              fontSize: "0.95rem",
              color: "#6b7280",
              lineHeight: "1.5",
            }}
          >
            {step === "email"
              ? "Enter your email to receive a secure login code"
              : `We sent a 6-digit code to ${email}`}
          </p>
        </div>

        {/* Email Step */}
        {step === "email" && (
          <form onSubmit={handleSendOTP} style={{ marginBottom: "1rem" }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                style={{
                  width: "100%",
                  padding: "0.875rem 1rem",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  transition: "all 0.2s ease",
                  outline: "none",
                }}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
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
                transition: "all 0.2s ease",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.background = "#1d4ed8";
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 4px 15px rgba(37, 99, 235, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.background = "#2563eb";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
                }
              }}
            >
              {loading ? "Sending Code..." : "Send Login Code"}
            </button>
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
          </form>
        )}

        {/* OTP Step */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOTP} style={{ marginBottom: "1.5rem" }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                htmlFor="otp"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "0.5rem",
                  textAlign: "center",
                }}
              >
                Verification Code
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength="6"
                required
                style={{
                  width: "100%",
                  padding: "1rem",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "2rem",
                  fontWeight: "600",
                  textAlign: "center",
                  letterSpacing: "0.5rem",
                  transition: "all 0.2s ease",
                  outline: "none",
                }}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6)
                  setOtpCode(value)
                }}
                disabled={loading}
                onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
              {otpExpiry > 0 && (
                <p
                  style={{
                    marginTop: "0.75rem",
                    textAlign: "center",
                    fontSize: "0.875rem",
                    color: "#6b7280",
                  }}
                >
                  Code expires in <span style={{ fontWeight: "600", color: "#2563eb" }}>{formatTime(otpExpiry)}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              style={{
                width: "100%",
                padding: "0.875rem",
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: loading || otpCode.length !== 6 ? "not-allowed" : "pointer",
                opacity: loading || otpCode.length !== 6 ? 0.5 : 1,
                transition: "all 0.2s ease",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                marginBottom: "1rem",
              }}
              onMouseEnter={(e) => {
                if (!(loading || otpCode.length !== 6)) {
                  e.target.style.background = "#1d4ed8";
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 4px 15px rgba(37, 99, 235, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                if (!(loading || otpCode.length !== 6)) {
                  e.target.style.background = "#2563eb";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
                }
              }}
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.875rem",
              }}
            >
              <button
                type="button"
                onClick={handleBackToEmail}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  cursor: "pointer",
                  fontWeight: "500",
                  padding: "0.5rem",
                  transition: "color 0.2s ease",
                }}
                onMouseEnter={(e) => (e.target.style.color = "#1d4ed8")}
                onMouseLeave={(e) => (e.target.style.color = "#2563eb")}
              >
                ← Back to email
              </button>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendCooldown > 0 || loading}
                style={{
                  background: "none",
                  border: "none",
                  color: resendCooldown > 0 || loading ? "#9ca3af" : "#2563eb",
                  cursor: resendCooldown > 0 || loading ? "not-allowed" : "pointer",
                  fontWeight: "500",
                  padding: "0.5rem",
                  transition: "color 0.2s ease",
                }}
                onMouseEnter={(e) => !(resendCooldown > 0 || loading) && (e.target.style.color = "#1d4ed8")}
                onMouseLeave={(e) => !(resendCooldown > 0 || loading) && (e.target.style.color = "#2563eb")}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
              </button>
            </div>
          </form>
        )}

        {/* Success Step */}
        {step === "success" && (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div
              style={{
                width: "80px",
                height: "80px",
                margin: "0 auto 1.5rem",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                style={{ width: "40px", height: "40px", color: "white" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3
              style={{
                fontSize: "1.5rem",
                fontWeight: "700",
                color: "#1a202c",
                marginBottom: "0.5rem",
              }}
            >
              Login Successful!
            </h3>
            <p
              style={{
                fontSize: "0.95rem",
                color: "#6b7280",
              }}
            >
              You're being redirected to your dashboard...
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "1rem",
              marginTop: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <svg
                style={{
                  width: "20px",
                  height: "20px",
                  color: "#ef4444",
                  flexShrink: 0,
                  marginRight: "0.75rem",
                }}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#991b1b",
                  fontWeight: "500",
                  margin: 0,
                }}
              >
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "8px",
              padding: "1rem",
              marginTop: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <svg
                style={{
                  width: "20px",
                  height: "20px",
                  color: "#10b981",
                  flexShrink: 0,
                  marginRight: "0.75rem",
                }}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#065f46",
                  fontWeight: "500",
                  margin: 0,
                }}
              >
                {success}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OTPLogin