"use client"

import { useState, useEffect, useRef } from "react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

// Icons
import { HiOutlineMenu, HiOutlineHome, HiOutlineDocumentReport } from "react-icons/hi"
import { FaGraduationCap } from "react-icons/fa"
import { PiStudentBold } from "react-icons/pi" 
import { BiLogOut } from "react-icons/bi"

const AdminLayout = ({ children, title, headerActions }) => {
  const { user, logout } = useAuth()
  const location = useLocation()
  
  // State
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef(null)

  // -- Resizing Logic --
  const handleMouseDown = (e) => {
    setIsResizing(true)
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return
      const newWidth = e.clientX
      if (newWidth >= 220 && newWidth <= 400) {
        setSidebarWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = "col-resize"
    } else {
      document.body.style.cursor = "default"
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = "default"
    }
  }, [isResizing])

  // -- Navigation Config --
  const navItems = [
    { path: "/admin/dashboard", label: "Dashboard", icon: <HiOutlineHome size={20} /> },
    { path: "/admin/scholarships", label: "Scholarships", icon: <PiStudentBold size={20} /> },
    { path: "/admin/reports", label: "Reports", icon: <HiOutlineDocumentReport size={20} /> },
  ]

  // -- Light Theme Configuration --
  const theme = {
    sidebarBg: "#ffffff",
    sidebarBorder: "#e2e8f0", 
    sidebarText: "#64748b",   
    sidebarHoverBg: "#f8fafc",
    activeBg: "#eff6ff",      
    activeText: "#2563eb",    
    contentBg: "#f8fafc",     
  }

  return (
    <div className="admin-layout" style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      
      {/* SIDEBAR */}
      <aside
        ref={sidebarRef}
        style={{
          width: sidebarOpen ? `${sidebarWidth}px` : "0px",
          background: theme.sidebarBg,
          borderRight: `1px solid ${theme.sidebarBorder}`,
          color: "#334155",
          transition: isResizing ? "none" : "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
          position: "relative",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          // Removed 'justifyContent: space-between' so items stack at the top
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: "1.75rem 1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            borderBottom: `1px solid ${theme.sidebarBorder}`,
            minWidth: "250px", 
            flexShrink: 0 // Prevent header shrinking
          }}
        >
          <div style={{ 
            background: "#2563eb", 
            padding: "8px", 
            borderRadius: "8px",
            display: "flex",
            boxShadow: "0 2px 5px rgba(37, 99, 235, 0.2)"
          }}>
            <FaGraduationCap size={20} color="white" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "#1e293b", letterSpacing: "-0.01em" }}>DreamFund</h2>
          </div>
        </div>

        {/* Navigation */}
        {/* CHANGED: Removed 'flex: 1'. Added 'paddingBottom: 0' */}
        <nav style={{ padding: "1.5rem 1rem 0 1rem", minWidth: "250px" }}>
          <p style={{ margin: "0 0 0.75rem 0.75rem", fontSize: "0.75rem", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>Menu</p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "0.75rem 1rem",
                      color: isActive ? theme.activeText : theme.sidebarText,
                      textDecoration: "none",
                      backgroundColor: isActive ? theme.activeBg : "transparent",
                      borderRadius: "6px",
                      fontWeight: isActive ? "600" : "500",
                      fontSize: "0.95rem",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                        if(!isActive) {
                            e.currentTarget.style.backgroundColor = theme.sidebarHoverBg
                            e.currentTarget.style.color = "#334155"
                        }
                    }}
                    onMouseLeave={(e) => {
                        if(!isActive) {
                            e.currentTarget.style.backgroundColor = "transparent"
                            e.currentTarget.style.color = theme.sidebarText
                        }
                    }}
                  >
                    <span style={{ color: isActive ? theme.activeText : "#94a3b8" }}>{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer / Logout */}
        {/* CHANGED: Removed borderTop to make it look cleaner, added marginTop to give breathing room from menu */}
        <div style={{ padding: "1rem", minWidth: "250px", marginTop: "1rem" }}>
            <button
              onClick={logout}
              style={{
                background: "white",
                border: "1px solid #fee2e2",
                color: "#ef4444",
                padding: "0.75rem 1rem",
                width: "100%",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                 e.currentTarget.style.background = "#fef2f2"
                 e.currentTarget.style.borderColor = "#fecaca"
              }}
              onMouseLeave={(e) => {
                 e.currentTarget.style.background = "white"
                 e.currentTarget.style.borderColor = "#fee2e2"
              }}
            >
              <BiLogOut size={18} />
              Sign Out
            </button>
        </div>

        {/* Resize Handle */}
        {sidebarOpen && (
          <div
            onMouseDown={handleMouseDown}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "4px",
              height: "100%",
              cursor: "col-resize",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
                className="resize-handle-visual"
                style={{
                    width: "100%",
                    height: "100%",
                    background: isResizing ? "#3b82f6" : "transparent",
                    transition: "background 0.2s ease",
                }} 
            />
          </div>
        )}
      </aside>

      {/* MAIN CONTENT */}
      <main
        className="admin-content"
        style={{
          flex: 1,
          background: theme.contentBg,
          transition: isResizing ? "none" : "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden" 
        }}
      >
        {/* Top Header */}
        <header
          style={{
            padding: "1rem 2rem",
            background: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #e2e8f0",
            position: "sticky",
            top: 0,
            zIndex: 5
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "0.5rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                color: "#64748b",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#cbd5e1"
                  e.currentTarget.style.color = "#1e293b"
              }}
              onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0"
                  e.currentTarget.style.color = "#64748b"
              }}
            >
              <HiOutlineMenu size={24} />
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700", color: "#1e293b", lineHeight: 1.2 }}>{title}</h1>
              <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.875rem" }}>
                Welcome back, <span style={{fontWeight: 600, color: "#2563eb"}}>{user?.name}</span>
              </p>
            </div>
          </div>
          
          {headerActions && (
            <div style={{ display: "flex", gap: "1rem" }}>
                {headerActions}
            </div>
          )}
        </header>

        {/* Content Area */}
        <div style={{ padding: "2rem", overflowY: "auto", flex: 1 }}>
            {children}
        </div>
      </main>
    </div>
  )
}

export default AdminLayout