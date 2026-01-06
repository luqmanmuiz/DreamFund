// Utility to manage session IDs for tracking guest users

/**
 * Get or create a session ID for the current user
 * This persists across page reloads using localStorage
 * @returns {string} Session ID (UUID format)
 */
export const getSessionId = () => {
  // Check if we already have a session ID
  let sessionId = localStorage.getItem("dreamfund_session_id");

  if (!sessionId) {
    // Generate a new UUID v4
    sessionId = generateUUID();
    localStorage.setItem("dreamfund_session_id", sessionId);
  }

  return sessionId;
};

/**
 * Generate a UUID v4
 * @returns {string} UUID
 */
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Clear the session ID (useful for testing or logout)
 */
export const clearSessionId = () => {
  localStorage.removeItem("dreamfund_session_id");
};

/**
 * Track an "Apply Now" click
 * @param {string} scholarshipId - The scholarship being applied to
 * @param {string|null} userId - The user ID if logged in, null if guest
 * @param {boolean} isMatched - Whether the scholarship was matched (true) or non-matched (false)
 * @returns {Promise<void>}
 */
export const trackScholarshipClick = async (scholarshipId, userId = null, isMatched = true) => {
  const sessionId = getSessionId();

  try {
    // Use fetch with a short timeout to avoid blocking
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

    await fetch("http://localhost:5000/api/clicks/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scholarshipId,
        sessionId,
        userId,
        isMatched,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch (error) {
    // Silently fail - don't block user's action
    console.log("Click tracking failed (non-blocking):", error.message);
  }
};

/**
 * Mark a scholarship as having a pending feedback request
 * This is called when user clicks "Apply Now"
 * @param {string} scholarshipId - The scholarship ID
 */
export const markPendingFeedback = (scholarshipId) => {
  const pending = getPendingFeedback();
  const timestamp = Date.now();

  // Add or update the pending feedback
  pending[scholarshipId] = {
    clickedAt: timestamp,
    shown: false,
  };

  localStorage.setItem("dreamfund_pending_feedback", JSON.stringify(pending));
};

/**
 * Get all pending feedback requests
 * @returns {Object} Object with scholarshipId as keys
 */
export const getPendingFeedback = () => {
  const pending = localStorage.getItem("dreamfund_pending_feedback");
  return pending ? JSON.parse(pending) : {};
};

/**
 * Mark that the feedback banner has been shown for a scholarship
 * @param {string} scholarshipId
 */
export const markFeedbackShown = (scholarshipId) => {
  const pending = getPendingFeedback();
  if (pending[scholarshipId]) {
    pending[scholarshipId].shown = true;
    localStorage.setItem("dreamfund_pending_feedback", JSON.stringify(pending));
  }
};

/**
 * Remove a scholarship from pending feedback (after response submitted)
 * @param {string} scholarshipId
 */
export const clearPendingFeedback = (scholarshipId) => {
  const pending = getPendingFeedback();
  delete pending[scholarshipId];
  localStorage.setItem("dreamfund_pending_feedback", JSON.stringify(pending));
};

/**
 * Check if user has already responded to feedback for this scholarship
 * @param {string} scholarshipId
 * @returns {boolean}
 */
export const hasRespondedToFeedback = (scholarshipId) => {
  // Get current user ID
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const userId = user?._id || user?.id || null;

  // Use user-specific key
  const key = `feedbackResponded_${userId || "guest"}`;
  const responded = localStorage.getItem(key);
  if (!responded) return false;
  const list = JSON.parse(responded);
  return list.includes(scholarshipId);
};

/**
 * Get the next scholarship that needs feedback (if any)
 * Returns the scholarship that was clicked but feedback not yet shown
 * @returns {string|null} scholarshipId or null
 */
export const getNextFeedbackNeeded = () => {
  const pending = getPendingFeedback();
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  // Find scholarships clicked within the last hour that haven't been shown
  for (const [scholarshipId, data] of Object.entries(pending)) {
    const timeSinceClick = now - data.clickedAt;

    // Only show if clicked recently and not yet shown and not already responded
    if (
      timeSinceClick < ONE_HOUR &&
      !data.shown &&
      !hasRespondedToFeedback(scholarshipId)
    ) {
      return scholarshipId;
    }
  }

  return null;
};
