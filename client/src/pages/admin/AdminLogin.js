"use client";

import { useState } from "react";
import { Navigate, Link } from "react-router-dom"; // Import Link
import { useAuth } from "../../contexts/AuthContext";
import {
  HiLockClosed,
  HiEnvelope,
  HiEye,
  HiEyeSlash,
  HiArrowRight,
  HiShieldCheck,
  HiArrowLeft, // Import Back Icon
} from "react-icons/hi2";

const AdminLogin = () => {
  const { user, login, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Redirect if already logged in as admin
  if (user && user.role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Redirect if logged in as regular user
  if (user && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Simulate delay for smooth feel
    await new Promise((r) => setTimeout(r, 800));

    const result = await login(formData.email, formData.password);

    if (!result.success) {
      setMessage(result.message);
    }
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <style jsx>{`
          .loading-container {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: #0f172a;
          }
          .loader {
            width: 48px;
            height: 48px;
            border: 5px solid #fff;
            border-bottom-color: #3b82f6;
            border-radius: 50%;
            animation: rotation 1s linear infinite;
          }
          @keyframes rotation {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="split-screen-layout">
      {/* LEFT SIDE: Visual / Brand */}
      <div className="brand-section">
        {/* Dark overlay to ensure text readability over the image */}
        <div className="brand-overlay"></div>

        <div className="brand-content">
          <div className="logo-container">
            <div className="logo-icon-bg">
              <HiShieldCheck className="brand-logo" />
            </div>
            <span className="brand-name">DreamFund</span>
          </div>
          <h1 className="hero-title">
            Unlock the <br />
            <span className="text-highlight">Potential of Tomorrow.</span>
          </h1>
          <p className="hero-subtitle">
            Secure administration panel for managing scholarships, tracking
            applications, and ensuring student success.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE: Form */}
      <div className="form-section">
        {/* Back to Home Button */}
        <Link to="/" className="back-home-btn">
          <HiArrowLeft className="back-icon" />
          <span>Back to Home</span>
        </Link>

        <div className="form-container">
          <div className="form-header">
            <div className="mobile-logo">
              <HiShieldCheck />
            </div>
            <h2>Admin Login</h2>
            <p>Welcome back. Please enter your details.</p>
          </div>

          {message && (
            <div className="error-alert">
              <span className="error-icon">!</span>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <div className={`input-field ${formData.email ? "active" : ""}`}>
                <HiEnvelope className="field-icon" />
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div
                className={`input-field ${formData.password ? "active" : ""}`}
              >
                <HiLockClosed className="field-icon" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <HiEyeSlash /> : <HiEye />}
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <div className="dots-loader">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ) : (
                <>
                  Sign In <HiArrowRight />
                </>
              )}
            </button>
          </form>

          <div className="footer">
            <p>© 2025 DreamFund.</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* --- MAIN LAYOUT --- */
        .split-screen-layout {
          display: flex;
          min-height: 100vh;
          font-family: "Inter", sans-serif;
          background: #fff;
          overflow: hidden;
        }

        /* --- LEFT SIDE (BRAND & IMAGE) --- */
        .brand-section {
          flex: 1.2;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 4rem;
          color: white;
          overflow: hidden;
          background-image: url("https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1920&auto=format&fit=crop");
          background-size: cover;
          background-position: center;
        }

        .brand-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            135deg,
            rgba(15, 23, 42, 0.9) 0%,
            rgba(30, 58, 138, 0.85) 100%
          );
          z-index: 1;
        }

        .brand-content {
          position: relative;
          z-index: 10;
          max-width: 550px;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 2.5rem;
        }
        .logo-icon-bg {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
        }
        .brand-logo {
          font-size: 1.75rem;
          color: #60a5fa;
        }
        .brand-name {
          font-size: 1.75rem;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: white;
        }

        .hero-title {
          font-size: 3.5rem;
          line-height: 1.1;
          font-weight: 800;
          margin-bottom: 1.5rem;
          letter-spacing: -0.03em;
          color: white;
        }
        .text-highlight {
          color: #60a5fa;
        }
        .hero-subtitle {
          font-size: 1.125rem;
          color: #cbd5e1;
          line-height: 1.6;
          margin-bottom: 3.5rem;
          max-width: 90%;
        }

        /* --- RIGHT SIDE (FORM) --- */
        .form-section {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: #ffffff;
          position: relative; /* For absolute positioning of Back button */
        }

        /* Back to Home Button */
        .back-home-btn {
          position: absolute;
          top: 2rem;
          left: 2rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #64748b;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
          padding: 0.5rem 1rem;
          border-radius: 8px;
        }
        .back-home-btn:hover {
          color: #0f172a;
          background-color: #f1f5f9;
        }
        .back-icon {
          font-size: 1.1rem;
        }

        .form-container {
          width: 100%;
          max-width: 400px;
          animation: slideUp 0.6s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .form-header {
          margin-bottom: 2.5rem;
        }
        .mobile-logo {
          display: none;
          font-size: 2.5rem;
          color: #2563eb;
          margin-bottom: 1rem;
        }
        .form-header h2 {
          font-size: 2.25rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 0.5rem;
          letter-spacing: -0.03em;
        }
        .form-header p {
          color: #64748b;
          margin: 0;
          font-size: 1rem;
        }

        .input-group {
          margin-bottom: 1.5rem;
        }
        .input-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #334155;
          margin-bottom: 0.5rem;
        }

        .input-field {
          position: relative;
          display: flex;
          align-items: center;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          transition: all 0.2s ease;
        }
        .input-field:focus-within {
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
        }
        .field-icon {
          position: absolute;
          left: 1rem;
          color: #94a3b8;
          font-size: 1.25rem;
          transition: color 0.2s;
        }
        .input-field:focus-within .field-icon {
          color: #2563eb;
        }

        .input-field input {
          width: 100%;
          padding: 1rem 1rem 1rem 3rem;
          border: none;
          background: transparent;
          font-size: 1rem;
          color: #0f172a;
          outline: none;
          border-radius: 12px;
        }

        .eye-btn {
          position: absolute;
          right: 1rem;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0;
          display: flex;
          transition: color 0.2s;
        }
        .eye-btn:hover {
          color: #475569;
        }

        .form-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          font-size: 0.875rem;
        }
        .remember-me {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #475569;
          cursor: pointer;
          font-weight: 500;
        }
        .remember-me input {
          width: 16px;
          height: 16px;
          accent-color: #2563eb;
        }

        .login-btn {
          width: 100%;
          padding: 1rem;
          background: #0f172a;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s ease;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .login-btn:hover:not(:disabled) {
          background: #1e293b;
          transform: translateY(-1px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .error-alert {
          background: #fef2f2;
          border: 1px solid #fee2e2;
          color: #b91c1c;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .error-icon {
          background: #ef4444;
          color: white;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.75rem;
        }

        .footer {
          margin-top: 3rem;
          text-align: center;
          color: #94a3b8;
          font-size: 0.8rem;
        }

        .dots-loader span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: white;
          display: inline-block;
          margin: 0 3px;
          animation: bounce 1.4s infinite ease-in-out both;
        }
        .dots-loader span:nth-child(1) {
          animation-delay: -0.32s;
        }
        .dots-loader span:nth-child(2) {
          animation-delay: -0.16s;
        }
        @keyframes bounce {
          0%,
          80%,
          100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }

        /* --- RESPONSIVE --- */
        @media (max-width: 1024px) {
          .hero-title {
            font-size: 2.5rem;
          }
        }

        @media (max-width: 768px) {
          .brand-section {
            display: none;
          }
          .form-section {
            background: #f8fafc;
          }
          .mobile-logo {
            display: block;
          }
          .form-header {
            text-align: center;
          }
          .form-container {
            background: white;
            padding: 2rem;
            border-radius: 20px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          }
          /* Adjust back button for mobile layout */
          .back-home-btn {
            top: 1rem;
            left: 1rem;
            background-color: white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }
        }
      `}</style>
    </div>
  );
};

export default AdminLogin;
