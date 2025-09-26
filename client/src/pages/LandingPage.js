"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const { user, login, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const result = await login(formData.email, formData.password);

    if (result.success) {
      setShowLogin(false);
      setFormData({ email: "", password: "" });
      // Redirect admin users to admin dashboard
      if (result.user?.role === 'admin') {
        navigate('/admin/dashboard');
      }
    } else {
      setMessage(result.message);
    }
    setLoading(false);
  };

  return (
    <div>
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo">
            DreamFund
          </Link>
          <nav>
            <ul className="nav-links">
              {user ? (
                <>
                  <li>
                    <Link to="/profile">Profile</Link>
                  </li>
                  <li>
                    <Link to="/upload">Upload Documents</Link>
                  </li>
                  <li>
                    <Link to={`/results/${user.id}`}>My Matches</Link>
                  </li>
                  {user.role === "admin" && (
                    <li>
                      <Link to="/admin/dashboard">Admin Dashboard</Link>
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
                      onClick={() => window.location.href = 'http://localhost:3000/admin/login'}
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

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <h1>Find Your Perfect Scholarship</h1>
          <p>
            Connect with scholarships that match your profile and achieve your
            educational dreams. Our AI-powered platform makes finding financial
            aid simple and effective.
          </p>
          <div className="hero-buttons">
            {user ? (
              <>
                {user.role === "admin" ? (
                  <>
                    <Link to="/admin/scrape" className="btn btn-primary">
                      Scrape Data
                    </Link>
                    <Link to="/admin/reports" className="btn btn-secondary">
                      Report
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/upload" className="btn btn-primary">
                      Upload Documents
                    </Link>
                  </>
                )}
              </>
            ) : (
              <>
                <Link to="/upload" className="btn btn-primary">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2>Why Choose DreamFund?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Smart Matching</h3>
              <p>
                Our advanced algorithm matches you with scholarships based on
                your academic profile, interests, and financial needs.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📚</div>
              <h3>Comprehensive Database</h3>
              <p>
                Access thousands of scholarships from universities, foundations,
                and organizations worldwide.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Easy Application</h3>
              <p>
                Streamlined application process with document management and
                deadline tracking to keep you organized.
              </p>
            </div>
          </div>
        </div>
      </section>   

      {/* Footer */}
      <footer
        style={{
          background: "#1f2937",
          color: "white",
          padding: "2rem 0",
          textAlign: "center",
        }}
      >
        <div className="container">
          <p>&copy; 2024 DreamFund. All rights reserved.</p>
          <p>Empowering students to achieve their educational dreams.</p>
        </div>
      </footer>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          max-width: 400px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .btn-link {
          background: none;
          border: none;
          color: #3b82f6;
          cursor: pointer;
          text-decoration: underline;
        }

        .btn-link:hover {
          color: #2563eb;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
