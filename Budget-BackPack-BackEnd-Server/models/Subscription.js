// server/models/Subscription.js
const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  stripeSubscriptionId: {
    type: String,
    unique: true,
    required: true,
  },
  stripePriceId: { // The ID of the Stripe Price object (e.g., price_xxxxxxxxxxxxxx)
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: [
      'active',       // Subscription is active and payments are up to date.
      'canceled',     // Subscription has been canceled by the user or admin, but might still be active until period end.
      'incomplete',   // Payment failed on creation or requires further action.
      'trialing',     // User is in a trial period.
      'past_due',     // Payment is overdue. Stripe will attempt retries.
      'unpaid',       // All payment retries have failed. Subscription is effectively inactive.
      'ended'         // Subscription has definitively ended (e.g. canceled and period ended, or unpaid after retries)
    ],
  },
  currentPeriodStart: { // Timestamp of when the current billing period started
    type: Date,
  },
  currentPeriodEnd: { // Timestamp of when the current billing period ends
    type: Date,
  },
  cancelAtPeriodEnd: { // If true, the subscription will be canceled at the end of the current period
    type: Boolean,
    default: false,
  },
  endedAt: { // Timestamp when the subscription was definitively ended (e.g., after being canceled)
    type: Date,
    optional: true,
  },
  trialStart: { // Timestamp of when the trial period started (if applicable)
    type: Date,
    optional: true,
  },
  trialEnd: { // Timestamp of when the trial period ends (if applicable)
    type: Date,
    optional: true,
  },
}, { timestamps: true }); // Adds createdAt and updatedAt timestamps automatically

module.exports = mongoose.model('Subscription', SubscriptionSchema);
