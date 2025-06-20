// server/routes/referralRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Referral = require('../models/Referral');

// GET /api/referrals/my-stats
// Get referral code and count of successful referrals for the logged-in user
router.get('/my-stats', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('referralCode'); // Only select referralCode

    if (!user) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    // If the user is premium, they should have a referral code.
    // If not (e.g., code generation pending or an edge case), this will be null.
    const referralCode = user.referralCode;

    let successfulReferrals = 0;
    if (referralCode) { // Only count if user has a referral code
      successfulReferrals = await Referral.countDocuments({
        referrerId: userId,
        status: 'completed',
      });
    } else {
        // If user has no referral code (e.g. not premium or not yet generated)
        // they cannot have successful referrals tracked via their code.
    }


    res.json({
      referralCode: referralCode || null, // Send null if no code yet
      successfulReferrals: successfulReferrals,
    });

  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({ msg: 'Server error while fetching referral statistics.' });
  }
});

module.exports = router;
