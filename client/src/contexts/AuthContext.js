"use client"

import { createContext, useContext, useState, useEffect } from "react"
import axios from "axios"

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(null)

  // Initialize token from localStorage on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem("token")
      setToken(storedToken)
    }
  }, [])

  // Set up axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common["Authorization"]
    }
  }, [token])

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          // Try Next.js API route first
          let response
          try {
            response = await axios.get("/api/auth/me")
          } catch (nextError) {
            // Fallback to Express API
            response = await axios.get("http://localhost:5000/api/auth/me")
          }
          setUser(response.data.user)
        } catch (error) {
          console.error("Auth check failed:", error)
          if (typeof window !== 'undefined') {
            localStorage.removeItem("token")
          }
          setToken(null)
        }
      }
      setLoading(false)
    }

    if (token !== null) {
      checkAuth()
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (email, password) => {
    try {
      // Try Next.js API route first
      let response
      try {
        response = await axios.post("/api/auth/login", { email, password })
      } catch (nextError) {
        // If Next.js route fails, try Express server
        console.log("Next.js route failed, trying Express server...")
        response = await axios.post("http://localhost:5000/api/auth/login", { email, password })
      }

      const { token: newToken, user: userData } = response.data

      if (typeof window !== 'undefined') {
        localStorage.setItem("token", newToken)
      }
      setToken(newToken)
      setUser(userData)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || "Login failed",
      }
    }
  }

  const loginWithOTP = async (email, otpCode) => {
    try {
      const response = await axios.post("http://localhost:5000/api/otp/verify-otp", { 
        email, 
        otpCode 
      })

      const { token: newToken, user: userData, message } = response.data

      if (typeof window !== 'undefined') {
        localStorage.setItem("token", newToken)
      }
      setToken(newToken)
      setUser(userData)

      return { 
        success: true, 
        message: message || "Login successful",
        user: userData
      }
    } catch (error) {
      console.error("OTP Login error:", error)
      return {
        success: false,
        message: error.response?.data?.message || error.message || "OTP verification failed",
      }
    }
  }

  const register = async (name, email, password) => {
    try {
      // Try Next.js API route first
      let response
      try {
        response = await axios.post("/api/auth/register", { name, email, password })
      } catch (nextError) {
        // If Next.js route fails, try Express server
        response = await axios.post("http://localhost:5000/api/auth/register", { name, email, password })
      }

      const { token: newToken, user: userData } = response.data

      if (typeof window !== 'undefined') {
        localStorage.setItem("token", newToken)
      }
      setToken(newToken)
      setUser(userData)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Registration failed",
      }
    }
  }

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("token")
    }
    setToken(null)
    setUser(null)
    delete axios.defaults.headers.common["Authorization"]
  }

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put("/api/auth/profile", profileData)
      setUser(response.data.user)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Profile update failed",
      }
    }
  }

  const updateProfileWithExtractedData = async (extractedData) => {
    try {
      const response = await axios.put("/api/auth/profile/extracted-data", extractedData)
      setUser(response.data.user)
      return { success: true, message: response.data.message }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Profile update with extracted data failed",
      }
    }
  }

  const value = {
    user,
    login,
    register,
    logout,
    updateProfile,
    updateProfileWithExtractedData,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
