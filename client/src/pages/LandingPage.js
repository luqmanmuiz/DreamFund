"use client";

import React from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import { useAuth } from "../contexts/AuthContext";
import { HiOutlineBolt, HiOutlineBookOpen, HiOutlineCursorArrowRays } from 'react-icons/hi2';
import { FaGraduationCap } from "react-icons/fa";
// NOTE: You would typically import a global font like Inter or Poppins here
// via a link tag in index.html or through a library import.
// For example: import 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';

const LandingPage = () => {
  const { user } = useAuth();

  // Landing page does not manage authentication here; header handles login/logout links

  return (
    <div className="page-wrapper">
      {/* Shared Header (Assumed to exist in ../components/Header) */}
      <Header />

      {/* Hero Section with Background Image */}
      <section className="hero">
        <div className="hero-overlay"></div>

        <div className="hero-content">
          {/* Trust Badge - Moved above H1 and pulse-dot color changed for cohesion */}
          <div className="trust-badge">
            <span className="pulse-dot"></span>
            Trusted by thousands of students
          </div>

          {/* Main Title */}
          <h1 className="hero-title">
            Find Your Perfect
            {/* Added a gradient-like effect via CSS to this span */}
            <span className="hero-highlight">Scholarship</span>
          </h1>

          {/* Description */}
          <p className="hero-description">
            Connect with scholarships that match your profile and achieve your
            educational dreams. Our AI-powered platform makes finding financial
            aid simple and effective.
          </p>

          {/* CTA Buttons - Logic remains the same, styling enhanced */}
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
                {/* Primary CTA: Increased padding and stronger hover effect */}
                <Link to="/upload" className="btn btn-primary-hero">
                  Get Started
                </Link>
                {/* Secondary CTA removed */}
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
            {/* Feature Card 1: Smart Matching */}
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <HiOutlineCursorArrowRays className="w-12 h-12 text-blue-600" />
              </div>
              <h3>Smart Matching</h3>
              <p>
                Our advanced algorithm matches you with scholarships based on
                your academic profile, interests, and financial needs.
              </p>
            </div>

            {/* Feature Card 2: Comprehensive Database */}
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <HiOutlineBookOpen className="w-12 h-12 text-blue-600" />
              </div>
              <h3>Comprehensive Database</h3>
              <p>
                Access thousands of scholarships from universities, foundations,
                and organizations worldwide.
              </p>
            </div>

            {/* Feature Card 3: Easy Application */}
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <HiOutlineBolt className="w-12 h-12 text-green-600" />
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
                <FaGraduationCap className="w-6 h-6 text-gray-600" />
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
        /* Global Font Integration */
        .page-wrapper {
          min-height: 100vh;
          background: white;
          /* Use a modern, readable font */
          font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        /* --- Header Styles (Unchanged) --- */
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

        /* --- Hero Section: Enhanced Styling --- */
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
          /* Stronger, deeper overlay gradient */
          background: linear-gradient(
            135deg,
            rgba(37, 99, 235, 0.75) 0%,
            rgba(59, 130, 246, 0.7) 50%,
            rgba(96, 165, 250, 0.65) 100%
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

        /* Pulse dot now uses brand primary color */
        .pulse-dot {
          width: 6px;
          height: 6px;
          background: #2563eb; /* Changed from yellow to primary blue */
          border-radius: 50%;
          box-shadow: 0 0 5px 2px rgba(37, 99, 235, 0.8);
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6; /* Slight adjustment to pulse opacity */
          }
        }

        .hero-title {
          font-size: 3.5rem;
          font-weight: 700; /* Slightly reduced weight */
          line-height: 1.1;
          letter-spacing: -0.03em; /* Tighter spacing */
          color: white;
          margin-bottom: 1.5rem;
          text-shadow: 0 6px 15px rgba(0, 0, 0, 0.5); /* Stronger text shadow */
        }

        .hero-highlight {
          display: block;
          margin-top: 0.5rem;
          /* Basic white color, set against the blue overlay */
          color: #ffffff;
          /* Reset gradient properties */
          background-image: none;
          -webkit-background-clip: unset;
          -webkit-text-fill-color: unset;
          /* Use a standard text shadow to ensure legibility against the background image */
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          font-weight: 800;
        }

        .hero-description {
          font-size: 1.25rem;
          line-height: 1.75;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 3rem; /* Increased margin */
          max-width: 42rem;
          margin-left: auto;
          margin-right: auto;
          font-weight: 400; /* Slightly lighter weight for description */
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
        }

        .hero-buttons {
          display: flex;
          flex-direction: column;
          gap: 1.25rem; /* Increased gap */
          align-items: center;
          justify-content: center;
        }

        @media (min-width: 640px) {
          .hero-buttons {
            flex-direction: row;
          }
        }

        .btn {
          padding: 1rem 2.5rem; /* Increased padding */
          font-size: 1rem;
          font-weight: 600;
          border-radius: 10px; /* Slightly rounder corners */
          text-decoration: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); /* Smoother transition */
          display: inline-block;
          letter-spacing: 0.02em;
        }

        .btn-primary-hero {
          color: white;
          background: #2563eb;
          border: none;
          /* Stronger initial shadow */
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
        }

        .btn-primary-hero:hover {
          background: #1d4ed8;
          /* More pronounced lift and shadow on hover */
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 15px 35px rgba(37, 99, 235, 0.6);
        }

        .btn-secondary-hero {
          color: white;
          background: rgba(255, 255, 255, 0.15); /* Slightly less opaque */
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.5); /* Thinner border, more subtle */
        }

        .btn-secondary-hero:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: white;
          transform: translateY(-2px); /* Less dramatic lift than primary */
        }

        /* --- Features Section: Enhanced Card Design --- */
        .features {
          padding: 6rem 1.5rem; /* Increased padding */
          background: linear-gradient(
            180deg,
            #ffffff 0%,
            #f7f9fc 100%
          ); /* Lighter background gradient */
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-header {
          text-align: center;
          margin-bottom: 5rem; /* Increased margin */
        }

        .section-header h2 {
          font-size: 2.5rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 1rem;
          letter-spacing: -0.02em;
        }

        .section-header p {
          font-size: 1.125rem;
          color: #6b7280;
          max-width: 38rem;
          margin: 0 auto;
        }

        .features-grid {
          display: grid;
          gap: 2rem; /* Increased gap */
          grid-template-columns: 1fr;
        }

        @media (min-width: 768px) {
          .features-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .feature-card {
          background: white;
          padding: 2.5rem 1.5rem; /* Increased padding */
          border-radius: 16px; /* Rounder corners */
          border: 1px solid #f3f4f6; /* Lighter border */
          transition: all 0.4s ease-out; /* Slower, smoother transition */
          text-align: center;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); /* Subtle initial shadow */
        }

        .feature-card:hover {
          transform: translateY(-5px); /* Less dramatic lift */
          /* Softer, more professional shadow on hover */
          box-shadow: 0 15px 40px rgba(37, 99, 235, 0.15);
          border-color: #2563eb; /* Primary color border highlight */
        }

        .feature-icon-wrapper {
          width: 56px; /* Slightly larger icon */
          height: 56px;
          background: #e0f2fe; /* Lighter blue */
          border-radius: 12px; /* Square with rounded corners */
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          transition: all 0.3s ease;
        }

        .feature-card:hover .feature-icon-wrapper {
          background: #bfdbfe;
          transform: scale(1.05); /* More subtle scale */
        }

        .feature-icon {
          font-size: 1.75rem; /* Larger icon emoji */
        }

        .feature-card h3 {
          font-size: 1.375rem; /* Slightly larger heading */
          font-weight: 700;
          color: #111827;
          margin-bottom: 0.75rem;
        }

        .feature-card p {
          color: #6b7280;
          line-height: 1.7;
          font-size: 1rem;
        }

        /* --- Footer Styles (Unchanged for visual design, kept structured) --- */
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

        /* --- Responsive Typography (Minor adjustments) --- */
        @media (max-width: 768px) {
          .hero {
            padding: 5rem 1.5rem;
            min-height: 500px;
          }

          .hero-title {
            font-size: 2.25rem;
          }

          .hero-description {
            font-size: 1rem;
          }

          .section-header h2 {
            font-size: 2rem;
          }

          .section-header {
            margin-bottom: 3rem;
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
            font-size: 0.9375rem; /* Slightly smaller for mobile */
          }

          .btn {
            padding: 0.875rem 1.5rem;
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
