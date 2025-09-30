import { useState, useEffect } from "react";
import { getSessionId } from "../utils/sessionUtils";

const FeedbackBanner = ({ scholarshipId, scholarshipTitle, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Show banner with 3 second delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    // Auto-dismiss after 30 seconds
    const autoDismissTimer = setTimeout(() => {
      handleDismiss();
    }, 33000); // 3s delay + 30s visible

    return () => {
      clearTimeout(timer);
      clearTimeout(autoDismissTimer);
    };
  }, []);

  const submitFeedback = async (responseType) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    const sessionId = getSessionId();

    try {
      // Get user ID if logged in
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?._id || user?.id || null;

      const response = await fetch("http://localhost:5000/api/clicks/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scholarshipId,
          sessionId,
          responseType,
          userId,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Mark this scholarship as responded in localStorage
        markScholarshipAsResponded(scholarshipId);
        onClose(responseType);
      } else {
        console.error("Failed to submit feedback:", data.message);
        onClose(responseType);
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      onClose(responseType);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleted = () => {
    submitFeedback("completed");
  };

  const handleNotYet = () => {
    submitFeedback("not_yet");
  };

  const handleDismiss = () => {
    submitFeedback("dismissed");
  };

  const markScholarshipAsResponded = (scholarshipId) => {
    const key = "feedbackResponded";
    const responded = JSON.parse(localStorage.getItem(key) || "[]");
    if (!responded.includes(scholarshipId)) {
      responded.push(scholarshipId);
      localStorage.setItem(key, JSON.stringify(responded));
    }
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        padding: "1.5rem",
        maxWidth: "380px",
        width: "calc(100% - 40px)",
        zIndex: 9999,
        animation: "slideInUp 0.4s ease-out",
        border: "1px solid #e5e7eb",
      }}
    >
      <style>
        {`
          @keyframes slideInUp {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          @media (max-width: 768px) {
            .feedback-banner-container {
              bottom: 10px !important;
              right: 10px !important;
              left: 10px !important;
              max-width: calc(100% - 20px) !important;
            }
          }
        `}
      </style>

      {/* Close button */}
      <button
        onClick={handleDismiss}
        disabled={isSubmitting}
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          background: "none",
          border: "none",
          fontSize: "1.25rem",
          color: "#6b7280",
          cursor: isSubmitting ? "not-allowed" : "pointer",
          padding: "4px",
          lineHeight: "1",
          opacity: isSubmitting ? 0.5 : 1,
        }}
        aria-label="Close"
      >
        ✕
      </button>

      {/* Header */}
      <div style={{ marginBottom: "1rem", paddingRight: "20px" }}>
        <h3
          style={{
            fontSize: "1.1rem",
            fontWeight: "600",
            color: "#1f2937",
            marginBottom: "0.5rem",
          }}
        >
          Help us improve DreamFund! 🎓
        </h3>
        <p style={{ fontSize: "0.9rem", color: "#6b7280", margin: 0 }}>
          Did you complete your application?
        </p>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <button
          onClick={handleCompleted}
          disabled={isSubmitting}
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            backgroundColor: "#10b981",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "0.95rem",
            fontWeight: "500",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            transition: "background-color 0.2s",
            opacity: isSubmitting ? 0.7 : 1,
          }}
          onMouseOver={(e) => !isSubmitting && (e.target.style.backgroundColor = "#059669")}
          onMouseOut={(e) => (e.target.style.backgroundColor = "#10b981")}
        >
          ✓ Yes, I completed it
        </button>

        <button
          onClick={handleNotYet}
          disabled={isSubmitting}
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            backgroundColor: "#f59e0b",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "0.95rem",
            fontWeight: "500",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            transition: "background-color 0.2s",
            opacity: isSubmitting ? 0.7 : 1,
          }}
          onMouseOver={(e) => !isSubmitting && (e.target.style.backgroundColor = "#d97706")}
          onMouseOut={(e) => (e.target.style.backgroundColor = "#f59e0b")}
        >
          Not yet
        </button>
      </div>

      {isSubmitting && (
        <div
          style={{
            marginTop: "0.75rem",
            textAlign: "center",
            fontSize: "0.85rem",
            color: "#6b7280",
          }}
        >
          Submitting...
        </div>
      )}
    </div>
  );
};

export default FeedbackBanner;