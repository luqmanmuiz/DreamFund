"use client"

import React from "react"
import { useNavigate } from "react-router-dom"
import OTPLogin from "../components/OTPLogin"
import { useAuth } from "../contexts/AuthContext"

const OTPLoginPage = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/")
    }
  }, [isAuthenticated, navigate])

  const handleLoginSuccess = (result) => {
    console.log("Login successful:", result)
    // Redirect to home page or dashboard
    navigate("/")
  }

  const handleLoginError = (error) => {
    console.error("Login error:", error)
  }

  return <OTPLogin onSuccess={handleLoginSuccess} onError={handleLoginError} />
}

export default OTPLoginPage