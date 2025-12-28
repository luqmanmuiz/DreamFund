"use client";

import React from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";

import {
  HiOutlineBolt,
  HiOutlineCloudArrowUp,
  HiOutlineCpuChip,
  HiOutlineCheckBadge,
  HiArrowRight,
} from "react-icons/hi2";
import { FaGraduationCap } from "react-icons/fa";
import { HiOutlineClock } from "react-icons/hi2";

const LandingPage = () => {
  return (
    <div className="page-wrapper">
      <Header />

      {/* --- HERO SECTION --- */}
      <section className="hero">
        <div className="hero-background"></div>
        <div className="hero-overlay"></div>

        <div className="hero-content">
          <div className="trust-badge">
            <span className="badge-dot"></span>
            <span className="badge-text">
              Trusted by All My Friends
            </span>
          </div>

          <h1 className="hero-title">
            Find Your Perfect <br />
            <span className="text-gradient">Scholarship Match.</span>
          </h1>

          {/* This is the text that was black. It is now forced white. */}
          <p className="hero-description">
            Stop searching endlessly. Our AI-driven platform connects your
            academic profile with funding opportunities that actually fit your
            future.
          </p>

          <div className="hero-buttons">
            <Link to="/upload" className="btn btn-primary">
              Start Your Search <HiArrowRight />
            </Link>

            <a href="#how-it-works" className="btn btn-secondary">
              How it Works
            </a>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="floating-card card-left">
          <div className="card-icon purple">
            <HiOutlineClock />
          </div>
          <div className="card-text">
            <strong>2 Mins</strong>
            <span>Setup</span>
          </div>
        </div>

        <div className="floating-card card-right">
          <div className="card-icon green">
            <HiOutlineBolt />
          </div>
          <div className="card-text">
            <strong>Fast</strong>
            <span>Approval</span>
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS SECTION --- */}
      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <div className="section-header">
            <span className="section-subtitle">Simple Process</span>
            <h2>How DreamFund Works</h2>
            <p>
              We've stripped away the complexity of financial aid. Follow these
              three simple steps to secure your funding.
            </p>
          </div>

          <div className="steps-grid">
            {/* STEP 1 */}
            <div className="step-card">
              <div className="step-badge">Step 01</div>
              <div className="icon-wrapper blue-glow">
                <HiOutlineCloudArrowUp className="step-icon" />
              </div>
              <h3>Upload Transcript</h3>
              <p>
                Upload your transcript PDF. We instantly check your eligibility
                for hundreds of grants.
              </p>
            </div>

            {/* STEP 2 */}
            <div className="step-card">
              <div className="step-badge">Step 02</div>
              <div className="icon-wrapper purple-glow">
                <HiOutlineCpuChip className="step-icon" />
              </div>
              <h3>AI Smart Matching</h3>
              <p>
                We analyze your CGPA and courses to find the best scholarship
                matches specifically for you.
              </p>
            </div>

            {/* STEP 3 */}
            <div className="step-card">
              <div className="step-badge">Step 03</div>
              <div className="icon-wrapper green-glow">
                <HiOutlineCheckBadge className="step-icon" />
              </div>
              <h3>Apply & Secure</h3>
              <p>
                Browse trusted scholarships and apply directly through our
                platform with confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="footer-logo">
                <FaGraduationCap />
                <span>DreamFund</span>
              </div>
              <p>Building the bridge between talent and opportunity.</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 DreamFund Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        /* --- GLOBAL & SMOOTH SCROLL --- */
        html {
          scroll-behavior: smooth;
        }

        .page-wrapper {
          min-height: 100vh;
          background: #ffffff;
          font-family: "Inter", system-ui, -apple-system, sans-serif;
          overflow-x: hidden;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        /* --- HERO SECTION --- */
        .hero {
          position: relative;
          min-height: 85vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 6rem 1.5rem;
          color: white;
          overflow: hidden;
        }

        .hero-background {
          position: absolute;
          inset: 0;
          background-image: url("/images/bagus-scholarship.webp");
          background-size: cover;
          background-position: center;
          z-index: 0;
          animation: scaleSlow 20s infinite alternate;
        }

        @keyframes scaleSlow {
          from {
            transform: scale(1);
          }
          to {
            transform: scale(1.05);
          }
        }

        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(15, 23, 42, 0.75) 0%,
            rgba(15, 23, 42, 0.85) 60%,
            #0f172a 100%
          );
          z-index: 1;
        }

        .hero-content {
          position: relative;
          z-index: 10;
          max-width: 800px;
          animation: fadeInUp 0.8s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Floating Cards */
        .floating-card {
          position: absolute;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          padding: 12px 24px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          animation: float 6s ease-in-out infinite;
          z-index: 5;
          display: none;
        }

        @media (min-width: 1024px) {
          .floating-card {
            display: flex;
          }
        }

        .card-left {
          top: 35%;
          left: 10%;
          animation-delay: 0s;
        }
        .card-right {
          bottom: 25%;
          right: 10%;
          animation-delay: 2s;
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        .card-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
        }
        .card-icon.purple {
          background: #f3e8ff;
          color: #9333ea;
        }
        .card-icon.green {
          background: #f0fdf4;
          color: #16a34a;
        }

        .card-text {
          text-align: left;
        }
        .card-text strong {
          display: block;
          color: #0f172a;
          font-size: 1.2rem;
          line-height: 1;
        }
        .card-text span {
          color: #64748b;
          font-size: 0.85rem;
        }

        /* Trust Badge */
        .trust-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 99px;
          font-size: 0.85rem;
          font-weight: 500;
          color: #e2e8f0;
          margin-bottom: 2rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .badge-dot {
          width: 6px;
          height: 6px;
          background: #22c55e;
          border-radius: 50%;
          box-shadow: 0 0 8px #22c55e;
        }

        /* Titles & Buttons */
        .hero-title {
          font-size: 4rem;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 1.5rem;
          letter-spacing: -0.02em;
        }
        .text-gradient {
          background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* --- FIXED DESCRIPTION COLOR --- */
        .hero-description {
          font-size: 1.25rem;
          line-height: 1.6;

          /* IMPORTANT: Forces white color and overrides any global styles */
          color: #ffffff !important;

          max-width: 600px;
          margin: 0 auto 3rem;
          font-weight: 500; /* Made slightly thicker for better visibility */

          /* Adds a shadow behind text to ensure readability on any background */
          text-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
        }

        .hero-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 2rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          text-decoration: none;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .btn-primary {
          background: #2563eb;
          color: white;
          box-shadow: 0 10px 20px -5px rgba(37, 99, 235, 0.4);
        }
        .btn-primary:hover {
          background: #1d4ed8;
          transform: translateY(-2px);
          box-shadow: 0 15px 25px -5px rgba(37, 99, 235, 0.5);
        }
        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(5px);
        }
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        /* --- HOW IT WORKS SECTION --- */
        .how-it-works {
          padding: 8rem 0;
          background: #ffffff;
        }

        .section-header {
          text-align: center;
          max-width: 700px;
          margin: 0 auto 5rem;
        }

        .section-subtitle {
          color: #2563eb;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.85rem;
          letter-spacing: 0.05em;
          display: block;
          margin-bottom: 1rem;
        }

        .section-header h2 {
          font-size: 2.5rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 1.5rem;
          letter-spacing: -0.02em;
        }

        .section-header p {
          color: #64748b;
          font-size: 1.125rem;
          line-height: 1.6;
        }

        .steps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        .step-card {
          background: #fff;
          padding: 3rem 2rem;
          border-radius: 24px;
          border: 1px solid #f1f5f9;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .step-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px -5px rgba(0, 0, 0, 0.05);
          border-color: #e2e8f0;
        }

        /* Step Badge */
        .step-badge {
          background: #f1f5f9;
          color: #64748b;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 6px 12px;
          border-radius: 99px;
          margin-bottom: 1.5rem;
          letter-spacing: 0.05em;
        }

        .icon-wrapper {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          margin-bottom: 1.5rem;
        }
        .blue-glow {
          background: #eff6ff;
          color: #2563eb;
        }
        .purple-glow {
          background: #f3e8ff;
          color: #9333ea;
        }
        .green-glow {
          background: #f0fdf4;
          color: #16a34a;
        }

        .step-card h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 1rem;
        }

        .step-card p {
          color: #64748b;
          line-height: 1.6;
        }

        /* --- FOOTER --- */
        .footer {
          background: #f8fafc;
          padding: 5rem 0 2rem;
          border-top: 1px solid #e2e8f0;
        }
        .footer-top {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 3rem;
          margin-bottom: 4rem;
        }
        .footer-brand {
          max-width: 300px;
          text-align: center;
        }
        .footer-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 1rem;
        }
        .footer-logo svg {
          color: #2563eb;
        }
        .footer-brand p {
          color: #64748b;
          font-size: 0.95rem;
          line-height: 1.6;
        }
        .footer-bottom {
          text-align: center;
          padding-top: 2rem;
          border-top: 1px solid #e2e8f0;
          color: #94a3b8;
          font-size: 0.875rem;
        }

        /* --- RESPONSIVE --- */
        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.5rem;
          }
          .hero-description {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
