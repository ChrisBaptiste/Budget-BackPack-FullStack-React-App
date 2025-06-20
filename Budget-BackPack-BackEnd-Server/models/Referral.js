// server/models/Referral.js
const mongoose = require('mongoose');

const ReferralSchema = new mongoose.Schema({
  referrerId: { // The user who owns the referral code
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  referredUserId: { // The new user who signed up using the referral code
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // A user can only be referred once
  },
  status: {
    type: String,
    enum: ['pending', 'completed'], // pending: signed up, completed: became premium
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index to quickly find referrals by referrer or referred user
ReferralSchema.index({ referrerId: 1 });
ReferralSchema.index({ referredUserId: 1 });

module.exports = mongoose.model('Referral', ReferralSchema);
