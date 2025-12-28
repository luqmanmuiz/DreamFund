"use client"

import React from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { FaGraduationCap } from "react-icons/fa"

// Shared Header component
// Props:
// - navItems: array of { to, label, type } where type is 'link' or 'button' (default 'link')
// If navItems is not provided, Header will use auth state to show a sensible default.
const Header = ({ navItems }) => {
  const { user, logout } = useAuth()

  // Default items when navItems not provided
  const defaultItems = user
    ? [
        { type: "action", action: () => logout(), label: "Logout", className: "btn-logout" },
      ]
    : [
        { type: "action", action: () => (window.location.href = "/admin/login"), label: "Admin Login" },
        { to: "/upload", label: "Get Started", isPrimary: true },
      ]

  const items = Array.isArray(navItems) ? navItems : defaultItems

  const headerStyles = {
    background: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(6px)",
    borderBottom: "1px solid #e5e7eb",
    position: "sticky",
    top: 0,
    zIndex: 1000,
  }

  const containerStyles = {
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "0 1.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: "64px",
  }

  const logoStyles = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    textDecoration: "none",
    color: "#1f2937",
    fontWeight: 700,
    fontSize: "1.25rem",
  }

  const navStyles = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  }

  const linkStyles = {
    padding: "0.45rem 0.9rem",
    fontSize: "0.9rem",
    fontWeight: 500,
    color: "#6b7280",
    textDecoration: "none",
    borderRadius: "6px",
  }

  const primaryStyles = {
    padding: "0.45rem 0.9rem",
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "white",
    background: "#2563eb",
    borderRadius: "6px",
    textDecoration: "none",
  }

  const actionButtonStyles = {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "0.45rem 0.9rem",
    borderRadius: "6px",
    fontWeight: 500,
    color: "#6b7280",
  }

  return (
    <header style={headerStyles}>
      <div style={containerStyles}>
        <Link to="/" style={logoStyles} className="logo">
          <FaGraduationCap className="w-8 h-8 text-blue-600" />
          <span style={{ color: "#2563eb", marginLeft: 4 }}>DreamFund</span>
        </Link>

        <nav style={navStyles}>
          {items.map((item, idx) => {
            if (item.type === "action") {
              return (
                <button
                  key={`nav-${idx}`}
                  onClick={item.action}
                  className={item.className || "nav-action"}
                  style={item.className === "btn-logout" ? { ...actionButtonStyles, border: "1px solid #e5e7eb" } : actionButtonStyles}
                >
                  {item.label}
                </button>
              )
            }

            // link
            if (item.isPrimary) {
              return (
                <Link key={`nav-${idx}`} to={item.to} style={primaryStyles}>
                  {item.label}
                </Link>
              )
            }

            return (
              <Link key={`nav-${idx}`} to={item.to} style={linkStyles}>
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}

export default Header
