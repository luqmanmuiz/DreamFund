"use client";

import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { HiLockClosed } from "react-icons/hi2";

const AdminLogin = () => {
  const { user, login, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
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

    const result = await login(formData.email, formData.password);

    if (result.success) {
      // Navigation will be handled by the useEffect in the component
    } else {
      setMessage(result.message);
    }
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <style jsx>{`
          .loading-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%);
          }
          .spinner {
            width: 50px;
            height: 50px;
            border: 3px solid #e5e7eb;
            border-top: 3px solid #2563eb;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-login-page">
      <div className="login-card">
        <div className="header-section">
          <div className="icon-wrapper">
            <HiLockClosed className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="title">
            Admin Login
          </h1>
          <p className="subtitle">Access the DreamFund administration panel</p>
        </div>

        {message && (
          <div className="message-alert">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {/* Email Input */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="admin@dreamfund.com"
              className="form-input"
            />
          </div>

          {/* Password Input */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder="Enter your password"
              className="form-input"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-submit"
            style={{
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {/* Info Card */}
        <div className="info-card">
          <strong className="info-title">Default Admin Credentials:</strong>
          <br />
          Email: admin@dreamfund.com
          <br />
          Password: admin123
        </div>

        {/* Back Link */}
        <div className="back-link-container">
          <a href="/" className="back-link">
            ← Back to Main Site
          </a>
        </div>
      </div>
      
      <style jsx>{`
        /* --- General Layout and Typography --- */
        .admin-login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, #ffffff 0%, #f7f9fc 100%);
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        /* --- Login Card --- */
        .login-card {
          background: white;
          padding: 2.5rem;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1); /* Deeper shadow */
          width: 100%;
          max-width: 400px;
        }
        
        /* --- Header --- */
        .header-section {
          text-align: center;
          margin-bottom: 2rem;
        }

        .icon-wrapper {
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          background: #dbeafe; /* Light blue */
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
        }

        .title {
          color: #1f2937; /* Darker heading color */
          margin-bottom: 0.5rem;
          font-size: 1.875rem;
          font-weight: 800; /* Bolder title */
          letter-spacing: -0.02em;
        }

        .subtitle {
          color: #6b7280;
          margin: 0;
          line-height: 1.7;
          font-size: 1rem;
        }

        /* --- Alert Message --- */
        .message-alert {
          padding: 1rem 1.5rem;
          margin-bottom: 1.5rem;
          background-color: #fef2f2;
          color: #991b1b;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 600;
          border: 1px solid #fecaca;
        }

        /* --- Form Elements --- */
        .login-form {
          margin-top: 1.5rem;
        }
        
        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600; /* Slightly bolder label */
          color: #374151;
          font-size: 0.9rem;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 8px; /* Slightly rounder inputs */
          font-size: 1rem;
          outline: none;
          transition: all 0.2s ease;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        
        .form-input:focus {
            border-color: #2563eb;
            box-shadow: 0 0 0 3px #bfdbfe;
        }

        /* --- Submit Button --- */
        .btn-submit {
          width: 100%;
          padding: 0.875rem;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 700; /* Bolder button text */
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);
        }
        
        .btn-submit:not([disabled]):hover {
            background: #1d4ed8;
            transform: translateY(-2px);
            box-shadow: 0 6px 15px rgba(37, 99, 235, 0.4);
        }

        .btn-submit[disabled] {
            cursor: not-allowed;
            background: #9ca3af;
            box-shadow: none;
            transform: translateY(0);
        }

        /* --- Info Card (Admin Credentials) --- */
        .info-card {
          margin-top: 2rem; /* Increased margin for separation */
          padding: 1rem 1.5rem;
          background: #eff6ff; /* Light blue background */
          border-radius: 12px;
          font-size: 0.875rem; /* Slightly smaller font */
          color: #1e40af;
          border: 1px solid #bfdbfe;
          line-height: 1.6;
        }
        
        .info-title {
            font-weight: 700;
            color: #1e40af; /* Ensure title stands out slightly */
        }

        /* --- Back Link --- */
        .back-link-container {
          text-align: center;
          margin-top: 1.5rem;
        }

        .back-link {
          color: #6b7280;
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s ease;
        }
        
        .back-link:hover {
            color: #374151;
            text-decoration: underline;
        }
        
        /* --- Responsive Adjustments --- */
        @media (max-width: 480px) {
            .login-card {
                margin: 1rem;
                padding: 1.5rem;
            }
            .title {
                font-size: 1.5rem;
            }
            .icon-wrapper {
                width: 60px;
                height: 60px;
                font-size: 2rem;
            }
            .info-card {
                font-size: 0.8rem;
                padding: 0.75rem 1rem;
            }
        }
      `}</style>
    </div>
  );
};

export default AdminLogin;