"use client";

import React from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import { useAuth } from "../contexts/AuthContext";
 

const LandingPage = () => {
  const { user } = useAuth();
  

  // Landing page does not manage authentication here; header handles login/logout links

  return (
    <div className="page-wrapper">
      {/* Shared Header */}
      <Header />

      {/* Hero Section with Background Image */}
      <section className="hero">
        <div className="hero-overlay"></div>

        <div className="hero-content">
          {/* Trust Badge */}
          <div className="trust-badge">
            <span className="pulse-dot"></span>
            Trusted by thousands of students
          </div>

          {/* Main Title */}
          <h1 className="hero-title">
            Find Your Perfect
            <span className="hero-highlight">Scholarship</span>
          </h1>

          {/* Description */}
          <p className="hero-description">
            Connect with scholarships that match your profile and achieve your
            educational dreams. Our AI-powered platform makes finding financial
            aid simple and effective.
          </p>

          {/* CTA Buttons */}
          <div className="hero-buttons">
            {user ? (
              user.role === "admin" ? (
                <>
                  <Link to="/admin/scrape" className="btn btn-primary-hero">
                    Scrape Data
                  </Link>
                  <Link to="/admin/reports" className="btn btn-secondary-hero">
                    View Reports
                  </Link>
                </>
              ) : (
                <Link to="/upload" className="btn btn-primary-hero">
                  Upload Documents
                </Link>
              )
            ) : (
              <>
                <Link to="/upload" className="btn btn-primary-hero">
                  Get Started
                </Link>
                <Link to="/login" className="btn btn-secondary-hero">
                  Learn More
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <div className="section-header">
            <h2>Why Choose DreamFund?</h2>
            <p>
              Discover the features that make finding scholarships effortless
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <span className="feature-icon">🎯</span>
              </div>
              <h3>Smart Matching</h3>
              <p>
                Our advanced algorithm matches you with scholarships based on
                your academic profile, interests, and financial needs.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <span className="feature-icon">📚</span>
              </div>
              <h3>Comprehensive Database</h3>
              <p>
                Access thousands of scholarships from universities, foundations,
                and organizations worldwide.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <span className="feature-icon">⚡</span>
              </div>
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
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="footer-logo">
                <span className="logo-icon">🎓</span>
                <span className="logo-text">DreamFund</span>
              </div>
              <p>
                Empowering students to achieve their educational dreams through
                smart scholarship matching.
              </p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 DreamFund. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .page-wrapper {
          min-height: 100vh;
          background: white;
        }

        /* Modern Clean Header */
        .header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .header-content {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          transition: opacity 0.2s;
        }

        .logo:hover {
          opacity: 0.7;
        }

        .logo-icon {
          font-size: 1.5rem;
        }

        .logo-text {
          font-size: 1.25rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #2563eb;
        }

        .nav {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .nav-link {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
          text-decoration: none;
          border-radius: 6px;
          transition: all 0.2s;
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .nav-link:hover {
          background: #f9fafb;
          color: #111827;
        }

        .btn-logout {
          margin-left: 0.5rem;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-logout:hover {
          background: #f9fafb;
        }

        .btn-get-started {
          margin-left: 0.5rem;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: white;
          background: #2563eb;
          border: none;
          border-radius: 6px;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .btn-get-started:hover {
          background: #1d4ed8;
        }

        /* Hero Section with Background Image */
        .hero {
          position: relative;
          min-height: 600px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8rem 1.5rem;
          overflow: hidden;
          background-image: url("/images/bagus-scholarship.webp");
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }

        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(37, 99, 235, 0.65) 0%,
            rgba(59, 130, 246, 0.6) 50%,
            rgba(96, 165, 250, 0.55) 100%
          );
          z-index: 1;
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 56rem;
          margin: 0 auto;
          text-align: center;
        }

        .trust-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.75rem;
          margin-bottom: 2rem;
          font-size: 0.75rem;
          font-weight: 500;
          color: white;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 9999px;
        }

        .pulse-dot {
          width: 6px;
          height: 6px;
          background: #fbbf24;
          border-radius: 50%;
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .hero-title {
          font-size: 3.5rem;
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.02em;
          color: white;
          margin-bottom: 1.5rem;
          text-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .hero-highlight {
          display: block;
          margin-top: 0.5rem;
          color: #fde047;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .hero-description {
          font-size: 1.25rem;
          line-height: 1.75;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 2.5rem;
          max-width: 42rem;
          margin-left: auto;
          margin-right: auto;
          font-weight: 500;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .hero-buttons {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          align-items: center;
          justify-content: center;
        }

        @media (min-width: 640px) {
          .hero-buttons {
            flex-direction: row;
          }
        }

        .btn {
          padding: 0.875rem 2rem;
          font-size: 1rem;
          font-weight: 600;
          border-radius: 8px;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-block;
          letter-spacing: 0.01em;
        }

        .btn-primary-hero {
          color: white;
          background: #2563eb;
          border: none;
          box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
        }

        .btn-primary-hero:hover {
          background: #1d4ed8;
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 8px 25px rgba(37, 99, 235, 0.4);
        }

        .btn-secondary-hero {
          color: white;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 255, 255, 0.4);
        }

        .btn-secondary-hero:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: white;
          transform: translateY(-3px);
        }

        /* Features Section */
        .features {
          padding: 5rem 1.5rem;
          background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%);
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-header {
          text-align: center;
          margin-bottom: 4rem;
        }

        .section-header h2 {
          font-size: 2.5rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 1rem;
          letter-spacing: -0.01em;
        }

        .section-header p {
          font-size: 1.125rem;
          color: #6b7280;
          max-width: 36rem;
          margin: 0 auto;
        }

        .features-grid {
          display: grid;
          gap: 1.5rem;
          grid-template-columns: 1fr;
        }

        @media (min-width: 768px) {
          .features-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .feature-card {
          background: white;
          padding: 2rem 1.5rem;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          transition: all 0.3s ease;
          text-align: center;
        }

        .feature-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 50px rgba(37, 99, 235, 0.12);
          border-color: #93c5fd;
        }

        .feature-icon-wrapper {
          width: 48px;
          height: 48px;
          background: #dbeafe;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
          transition: all 0.3s ease;
        }

        .feature-card:hover .feature-icon-wrapper {
          background: #bfdbfe;
          transform: scale(1.1);
        }

        .feature-icon {
          font-size: 1.5rem;
        }

        .feature-card h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 0.75rem;
        }

        .feature-card p {
          color: #6b7280;
          line-height: 1.7;
          font-size: 1rem;
        }

        /* Footer */
        .footer {
          padding: 3rem 1.5rem 1.5rem;
          background: white;
          border-top: 1px solid #e5e7eb;
        }

        .footer-content {
          margin-bottom: 2rem;
        }

        .footer-brand {
          text-align: center;
        }

        .footer-logo {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .footer-logo .logo-text {
          color: #2563eb;
        }

        .footer-brand p {
          color: #6b7280;
          line-height: 1.7;
          max-width: 28rem;
          margin: 0 auto;
        }

        .footer-bottom {
          padding-top: 2rem;
          border-top: 1px solid #e5e7eb;
          text-align: center;
        }

        .footer-bottom p {
          font-size: 0.875rem;
          color: #9ca3af;
        }

        /* Responsive Typography */
        @media (max-width: 768px) {
          .hero {
            padding: 5rem 1.5rem;
            min-height: 500px;
          }

          .hero-title {
            font-size: 2.5rem;
          }

          .hero-description {
            font-size: 1.125rem;
          }

          .section-header h2 {
            font-size: 2rem;
          }

          .header-content {
            flex-direction: column;
            height: auto;
            padding: 1rem 1rem;
            gap: 1rem;
          }

          .nav {
            flex-wrap: wrap;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .hero-title {
            font-size: 2rem;
          }

          .hero-description {
            font-size: 1rem;
          }

          .btn {
            padding: 0.75rem 1.5rem;
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
