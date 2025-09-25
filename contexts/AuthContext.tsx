"use client"

import type React from "react"

import { createContext, useContext, useReducer, useEffect } from "react"
import axios from "axios"

const AuthContext = createContext<any>(null)

const initialState = {
  user: null,
  token: null, // Don't access localStorage here
  isAuthenticated: false,
  loading: true,
  error: null,
}

const authReducer = (state: any, action: any) => {
  switch (action.type) {
    case "USER_LOADED":
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
        user: action.payload,
        error: null,
      }
    case "LOGIN_SUCCESS":
    case "REGISTER_SUCCESS":
      if (typeof window !== "undefined") {
        localStorage.setItem("token", action.payload.token)
      }
      return {
        ...state,
        ...action.payload,
        isAuthenticated: true,
        loading: false,
        error: null,
      }
    case "AUTH_ERROR":
    case "LOGIN_FAIL":
    case "REGISTER_FAIL":
    case "LOGOUT":
      if (typeof window !== "undefined") {
        localStorage.removeItem("token")
      }
      return {
        ...state,
        token: null,
        isAuthenticated: false,
        loading: false,
        user: null,
        error: action.payload,
      }
    case "CLEAR_ERRORS":
      return {
        ...state,
        error: null,
      }
    case "SET_LOADING":
      return {
        ...state,
        loading: action.payload,
      }
    default:
      return state
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Set auth token in axios headers
  const setAuthToken = (token: string | null) => {
    if (token) {
      axios.defaults.headers.common["x-auth-token"] = token
    } else {
      delete axios.defaults.headers.common["x-auth-token"]
    }
  }

  // Load user
  const loadUser = async () => {
    // Check if we're in the browser
    if (typeof window === "undefined") {
      dispatch({ type: "SET_LOADING", payload: false })
      return
    }

    const token = localStorage.getItem("token")
    if (token) {
      setAuthToken(token)
    }

    try {
      const res = await axios.get("/api/auth/me")
      dispatch({
        type: "USER_LOADED",
        payload: res.data,
      })
    } catch (err: any) {
      console.warn("Auth API not available:", err.message)

      // Check if we have a mock user stored
      const mockUser = localStorage.getItem("mockUser")
      const mockToken = localStorage.getItem("token")

      if (mockUser && mockToken) {
        dispatch({
          type: "USER_LOADED",
          payload: JSON.parse(mockUser),
        })
      } else {
        dispatch({ type: "AUTH_ERROR" })
      }
    }
  }

  // Register user
  const register = async (formData: any) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })
      const res = await axios.post("/api/auth/register", formData)

      dispatch({
        type: "REGISTER_SUCCESS",
        payload: res.data,
      })

      await loadUser()
      return { success: true, user: res.data.user }
    } catch (err: any) {
      console.warn("Backend server not running. Creating mock user.")

      const mockUser = {
        id: Date.now().toString(),
        name: formData.name,
        email: formData.email,
        profile: formData.profile,
        role: "student",
      }

      // Store mock user in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("mockUser", JSON.stringify(mockUser))
      }

      dispatch({
        type: "REGISTER_SUCCESS",
        payload: {
          token: "mock-token",
          user: mockUser,
        },
      })

      return { success: true, user: mockUser }
    }
  }

  // Login user
  const login = async (formData: any) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })
      const res = await axios.post("/api/auth/login", formData)

      dispatch({
        type: "LOGIN_SUCCESS",
        payload: res.data,
      })

      await loadUser()
      return { success: true }
    } catch (err: any) {
      console.warn("Backend server not running. Using mock admin login.")

      // Check for demo admin credentials
      if (formData.email === "admin@dreamfund.com" && formData.password === "admin123") {
        const mockAdmin = {
          id: "admin-1",
          name: "System Administrator",
          email: "admin@dreamfund.com",
          role: "admin",
        }

        dispatch({
          type: "LOGIN_SUCCESS",
          payload: {
            token: "mock-admin-token",
            user: mockAdmin,
          },
        })

        return { success: true }
      } else {
        dispatch({
          type: "LOGIN_FAIL",
          payload: "Invalid credentials",
        })
        return { success: false, error: "Invalid credentials" }
      }
    }
  }

  // Logout
  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("mockUser")
    }
    dispatch({ type: "LOGOUT" })
  }

  // Update profile
  const updateProfile = async (profileData: any) => {
    try {
      const res = await axios.put("/api/auth/profile", { profile: profileData })
      await loadUser()
      return { success: true, data: res.data }
    } catch (err: any) {
      // Mock profile update
      console.warn("Backend not available. Using mock profile update.")

      if (typeof window !== "undefined") {
        const mockUser = localStorage.getItem("mockUser")
        if (mockUser) {
          const user = JSON.parse(mockUser)
          user.profile = { ...user.profile, ...profileData }
          localStorage.setItem("mockUser", JSON.stringify(user))

          dispatch({
            type: "USER_LOADED",
            payload: user,
          })

          return { success: true, data: { profile: user.profile } }
        }
      }

      return {
        success: false,
        error: "Profile update failed",
      }
    }
  }

  // Clear errors
  const clearErrors = () => {
    dispatch({ type: "CLEAR_ERRORS" })
  }

  useEffect(() => {
    loadUser()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        register,
        login,
        logout,
        updateProfile,
        clearErrors,
        loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
