const express = require('express');
const router = express.Router();
const Guest = require('../models/Guest');
const GuestAnalytics = require('../models/GuestAnalytics');

// Initialize analytics singleton in database
async function initializeAnalytics() {
  try {
    let analytics = await GuestAnalytics.findById('guest_analytics_singleton');
    if (!analytics) {
      analytics = new GuestAnalytics({ _id: 'guest_analytics_singleton' });
      await analytics.save();
      console.log('✅ Guest analytics initialized');
    }
    return analytics;
  } catch (error) {
    console.error('Error initializing analytics:', error);
    return null;
  }
}

// Initialize on module load
initializeAnalytics();

// Helper function to generate unique share ID
function generateShareId() {
  return 'guest_' + Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Reset daily counter at midnight
async function resetDailyCounter() {
  try {
    const today = new Date().toDateString();
    const analytics = await GuestAnalytics.findById('guest_analytics_singleton');
    
    if (analytics && analytics.lastResetDate !== today) {
      // Save previous day's stats to history
      await GuestAnalytics.findByIdAndUpdate(
        'guest_analytics_singleton',
        {
          createdToday: 0,
          lastResetDate: today,
          $push: {
            dailyHistory: {
              date: analytics.lastResetDate,
              created: analytics.createdToday,
              expired: 0,
              timestamp: new Date()
            }
          }
        }
      );
      console.log(`📅 Daily counter reset for ${today}`);
    }
  } catch (error) {
    console.error('Error resetting daily counter:', error);
  }
}

// Run daily counter reset every minute
setInterval(resetDailyCounter, 60 * 1000);

// POST /api/guests/create - Create a new guest profile
router.post('/create', async (req, res) => {
  try {
    const { name, cgpa, program } = req.body;
    
    console.log('Creating guest profile with:', { name, cgpa, program });
    
    // Generate a unique share ID
    const shareId = generateShareId();
    
    // Create guest profile in database (expires after 35 days)
    const profile = await Guest.create({
      shareId,
      name: name || 'Student',
      cgpa: parseFloat(cgpa) || 0,
      program: program || 'General Studies',
      expiresAt: new Date(Date.now() + (35 * 24 * 60 * 60 * 1000)) // 35 days
    });
    
    // Update analytics
    await GuestAnalytics.findByIdAndUpdate(
      'guest_analytics_singleton',
      { 
        $inc: { 
          totalCreated: 1,
          createdToday: 1
        }
      }
    );
    
    console.log('Guest profile created:', shareId);
    console.log('📊 Expires at:', profile.expiresAt);
    
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
    
    // MongoDB TTL index automatically deletes expired documents
    const profile = await Guest.findOne({ shareId });
    
    if (!profile) {
      return res.status(404).json({ 
        success: false, 
        error: 'Profile not found or expired' 
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
    // Reset daily counter if needed
    await resetDailyCounter();
    
    // Get analytics from database
    const analytics = await GuestAnalytics.findById('guest_analytics_singleton');
    
    // Count active guests (not yet expired)
    const activeNow = await Guest.countDocuments({ 
      expiresAt: { $gt: new Date() } 
    });
    
    res.json({
      success: true,
      analytics: {
        totalCreated: analytics?.totalCreated || 0,
        totalExpired: analytics?.totalExpired || 0,
        createdToday: analytics?.createdToday || 0,
        activeNow,
        lastResetDate: analytics?.lastResetDate || new Date().toDateString(),
        dailyHistory: analytics?.dailyHistory || []
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
