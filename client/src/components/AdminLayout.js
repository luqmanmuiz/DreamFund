"use client"

import { useState, useEffect, useRef } from "react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { HiOutlineBars3 } from "react-icons/hi2"
import { FaGraduationCap } from "react-icons/fa"

const AdminLayout = ({ children, title, headerActions }) => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(250)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef(null)

  const handleMouseDown = (e) => {
    setIsResizing(true)
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return

      const newWidth = e.clientX
      if (newWidth >= 200 && newWidth <= 400) {
        setSidebarWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing])

  const navItems = [
    { path: "/admin/dashboard", label: "Dashboard" },
    { path: "/admin/scholarships", label: "Scholarships" },
    { path: "/admin/users", label: "Users" },
    { path: "/admin/reports", label: "Reports" },
  ]

  return (
    <div className="admin-layout" style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        ref={sidebarRef}
        style={{
          width: sidebarOpen ? `${sidebarWidth}px` : "0px",
          background: "#1f2937",
          color: "white",
          transition: sidebarOpen ? "none" : "width 0.3s ease",
          overflow: "hidden",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: "1.5rem",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            background: "#2563eb",
            minWidth: "250px",
          }}
        >
          <h2 style={{ color: "white", margin: 0, fontSize: "1.5rem", fontWeight: "700", letterSpacing: "-0.01em" }}>DreamFund Admin</h2>
        </div>

        <nav style={{ padding: "1rem 0", minWidth: "250px" }}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    style={{
                      display: "block",
                      padding: "0.75rem 1.5rem",
                      color: isActive ? "#2563eb" : "#6b7280",
                      textDecoration: "none",
                      backgroundColor: isActive ? "#eff6ff" : "transparent",
                      borderRight: isActive ? "3px solid #2563eb" : "none",
                      fontWeight: "600",
                    }}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
            <li>
              <button
                onClick={logout}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ef4444",
                  padding: "0.75rem 1.5rem",
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Logout
              </button>
            </li>
          </ul>
        </nav>

        {sidebarOpen && (
          <div
            onMouseDown={handleMouseDown}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "4px",
              height: "100%",
              background: "transparent",
              cursor: "col-resize",
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: "2px",
                height: "100%",
                background: "rgba(255,255,255,0.2)",
                marginLeft: "1px",
                transition: "background 0.2s ease",
              }}
            />
          </div>
        )}
      </aside>

      <main
        className="admin-content"
        style={{
          flex: 1,
          background: "#f9fafb",
          transition: sidebarOpen ? "none" : "margin-left 0.3s ease",
        }}
      >
        <div
          style={{
            padding: "1rem 2rem",
            borderBottom: "1px solid #e5e7eb",
            background: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: "none",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                padding: "0.5rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
              }}
            >
              <HiOutlineBars3 className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: "700", color: "#1f2937" }}>{title}</h1>
              <p style={{ margin: "0.5rem 0 0 0", color: "#6b7280" }}>Welcome back, {user?.name}</p>
            </div>
          </div>
          {headerActions && <div style={{ display: "flex", gap: "1rem" }}>{headerActions}</div>}
        </div>

        <div style={{ padding: "2rem" }}>{children}</div>
      </main>
    </div>
  )
}

export default AdminLayout
