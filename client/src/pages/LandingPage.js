"use client"

import { useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { useNavigate } from "react-router-dom"

const LandingPage = () => {
  const { user, login, logout } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const result = await login(formData.email, formData.password)

    if (result.success) {
      setShowLogin(false)
      setFormData({ email: "", password: "" })
      // Redirect admin users to admin dashboard
      if (result.user?.role === "admin") {
        navigate("/admin/dashboard")
      }
    } else {
      setMessage(result.message)
    }
    setLoading(false)
  }

  return (
    <div>
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo">
            <span className="logo-icon">🎓</span>
            DreamFund
          </Link>
          <nav>
            <ul className="nav-links">
              {user ? (
                <>
                  <li>
                    <Link to="/profile" className="nav-link">
                      Profile
                    </Link>
                  </li>
                  <li>
                    <Link to="/upload" className="nav-link">
                      Upload Documents
                    </Link>
                  </li>
                  {user.role === "admin" && (
                    <li>
                      <Link to="/admin/dashboard" className="nav-link">
                        Admin Dashboard
                      </Link>
                    </li>
                  )}
                  <li>
                    <button className="btn btn-secondary" onClick={logout}>
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <button
                      className="btn btn-primary"
                      onClick={() => (window.location.href = "http://localhost:3000/admin/login")}
                    >
                      Login
                    </button>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              Find Your Perfect
              <span className="hero-highlight"> Scholarship</span>
            </h1>
            <p className="hero-description">
              Connect with scholarships that match your profile and achieve your educational dreams. Our AI-powered
              platform makes finding financial aid simple and effective.
            </p>
            <div className="hero-buttons">
              {user ? (
                <>
                  {user.role === "admin" ? (
                    <>
                      <Link to="/admin/scrape" className="btn btn-primary btn-large">
                        Scrape Data
                      </Link>
                      <Link to="/admin/reports" className="btn btn-secondary btn-large">
                        View Reports
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link to="/upload" className="btn btn-primary btn-large">
                        Upload Documents
                      </Link>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Link to="/upload" className="btn btn-primary btn-large">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <div className="section-header">
            <h2>Why Choose DreamFund?</h2>
            <p>Discover the features that make finding scholarships effortless</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Smart Matching</h3>
              <p>
                Our advanced algorithm matches you with scholarships based on your academic profile, interests, and
                financial needs.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📚</div>
              <h3>Comprehensive Database</h3>
              <p>Access thousands of scholarships from universities, foundations, and organizations worldwide.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Easy Application</h3>
              <p>
                Streamlined application process with document management and deadline tracking to keep you organized.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="footer-logo">
                <span className="logo-icon">🎓</span>
                DreamFund
              </div>
              <p>Empowering students to achieve their educational dreams through smart scholarship matching.</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 DreamFund. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        /* Clean header styles */
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1rem 0;
          box-shadow: 0 2px 10px rgba(102, 126, 234, 0.2);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .logo {
          font-size: 1.8rem;
          font-weight: bold;
          text-decoration: none;
          color: white;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .logo-icon {
          font-size: 2rem;
        }

        .nav-links {
          display: flex;
          gap: 2rem;
          list-style: none;
          align-items: center;
        }

        .nav-link {
          color: white;
          text-decoration: none;
          font-weight: 500;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          transition: background-color 0.2s ease;
        }

        .nav-link:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        /* Clean hero section */
        .hero {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 100px 0;
          text-align: center;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .hero-title {
          font-size: 3.5rem;
          margin-bottom: 1.5rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .hero-highlight {
          color: #ffd700;
        }

        .hero-description {
          font-size: 1.2rem;
          margin-bottom: 2.5rem;
          opacity: 0.9;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.6;
        }

        .hero-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-block;
        }

        .btn-primary {
          background: white;
          color: #667eea;
        }

        .btn-primary:hover {
          background: #f8f9ff;
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .btn-large {
          padding: 1rem 2rem;
          font-size: 1.1rem;
        }

        /* Clean features section */
        .features {
          padding: 80px 0;
          background: #f8fafc;
        }

        .section-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .section-header h2 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          color: #1a202c;
          font-weight: 700;
        }

        .section-header p {
          font-size: 1.1rem;
          color: #6b7280;
          max-width: 500px;
          margin: 0 auto;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        .feature-card {
          text-align: center;
          padding: 2.5rem 2rem;
          border-radius: 12px;
          background: white;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          transition: transform 0.2s ease;
        }

        .feature-card:hover {
          transform: translateY(-5px);
        }

        .feature-icon {
          font-size: 3rem;
          margin-bottom: 1.5rem;
        }

        .feature-card h3 {
          font-size: 1.4rem;
          margin-bottom: 1rem;
          color: #1a202c;
          font-weight: 600;
        }

        .feature-card p {
          color: #6b7280;
          line-height: 1.6;
        }

        /* Clean footer */
        .footer {
          background: #1f2937;
          color: white;
          padding: 3rem 0 1rem;
        }

        .footer-content {
          margin-bottom: 2rem;
        }

        .footer-logo {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .footer-brand p {
          color: #d1d5db;
          line-height: 1.6;
          max-width: 400px;
        }

        .footer-bottom {
          border-top: 1px solid #374151;
          padding-top: 2rem;
          text-align: center;
          color: #9ca3af;
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.5rem;
          }

          .hero-buttons {
            flex-direction: column;
            align-items: center;
          }

          .section-header h2 {
            font-size: 2rem;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }

          .nav-links {
            flex-direction: column;
            gap: 1rem;
          }

          .header-content {
            flex-direction: column;
            gap: 1rem;
          }
        }

        @media (max-width: 480px) {
          .hero {
            padding: 60px 0;
          }

          .hero-title {
            font-size: 2rem;
          }

          .features {
            padding: 60px 0;
          }
        }
      `}</style>
    </div>
  )
}

export default LandingPage
