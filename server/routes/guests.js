const express = require('express');
const router = express.Router();

// In-memory storage for guest profiles (expires after 24 hours)
const guestProfiles = new Map();

// Analytics tracking
const guestAnalytics = {
  totalCreated: 0,
  totalExpired: 0,
  createdToday: 0,
  lastResetDate: new Date().toDateString()
};

// Helper function to generate unique share ID
function generateShareId() {
  return 'guest_' + Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Helper function to clean up expired profiles
function cleanupExpiredProfiles() {
  const now = Date.now();
  let expiredCount = 0;
  
  for (const [shareId, profile] of guestProfiles.entries()) {
    if (now > profile.expiresAt) {
      guestProfiles.delete(shareId);
      expiredCount++;
    }
  }
  
  if (expiredCount > 0) {
    guestAnalytics.totalExpired += expiredCount;
    console.log(`🧹 Cleaned up ${expiredCount} expired guest profiles`);
  }
}

// Reset daily counter at midnight
function resetDailyCounter() {
  const today = new Date().toDateString();
  if (guestAnalytics.lastResetDate !== today) {
    guestAnalytics.createdToday = 0;
    guestAnalytics.lastResetDate = today;
  }
}

// Run cleanup every hour
setInterval(cleanupExpiredProfiles, 60 * 60 * 1000);

// Run daily counter reset every minute
setInterval(resetDailyCounter, 60 * 1000);

// POST /api/guests/create - Create a new guest profile
router.post('/create', async (req, res) => {
  try {
    const { name, cgpa, program } = req.body;
    
    console.log('Creating guest profile with:', { name, cgpa, program });
    
    // Generate a unique share ID
    const shareId = generateShareId();
    
    // Store guest profile (expires after 24 hours)
    const profile = {
      shareId,
      name: name || 'Student',
      cgpa: parseFloat(cgpa) || 0,
      program: program || 'General Studies',
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    
    guestProfiles.set(shareId, profile);
    
    // Update analytics
    guestAnalytics.totalCreated++;
    guestAnalytics.createdToday++;
    
    console.log('Guest profile created:', shareId);
    console.log('📊 Total guests created:', guestAnalytics.totalCreated);
    
    res.json({ 
      success: true, 
      shareId,
      profile: {
        name: profile.name,
        cgpa: profile.cgpa,
        program: profile.program
      }
    });
  } catch (error) {
    console.error('Error creating guest profile:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create guest profile',
      message: error.message
    });
  }
});

// GET /api/guests/:shareId - Get guest profile by shareId
router.get('/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;
    
    console.log('Fetching guest profile:', shareId);
    
    const profile = guestProfiles.get(shareId);
    
    if (!profile) {
      return res.status(404).json({ 
        success: false, 
        error: 'Profile not found or expired' 
      });
    }
    
    // Check if expired
    if (Date.now() > profile.expiresAt) {
      guestProfiles.delete(shareId);
      return res.status(404).json({ 
        success: false, 
        error: 'Profile expired' 
      });
    }
    
    res.json({ 
      success: true, 
      profile: {
        name: profile.name,
        cgpa: profile.cgpa,
        program: profile.program
      }
    });
  } catch (error) {
    console.error('Error fetching guest profile:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch guest profile',
      message: error.message
    });
  }
});

// GET /api/guests/analytics/stats - Get guest analytics (Admin only)
router.get('/analytics/stats', async (req, res) => {
  try {
    // Clean up expired profiles first
    cleanupExpiredProfiles();
    resetDailyCounter();
    
    res.json({
      success: true,
      analytics: {
        totalCreated: guestAnalytics.totalCreated,
        totalExpired: guestAnalytics.totalExpired,
        createdToday: guestAnalytics.createdToday,
        activeNow: guestProfiles.size,
        lastResetDate: guestAnalytics.lastResetDate
      }
    });
  } catch (error) {
    console.error('Error fetching guest analytics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch analytics',
      message: error.message
    });
  }
});

module.exports = router;
