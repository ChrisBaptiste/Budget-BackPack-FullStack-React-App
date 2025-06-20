// server/routes/subscriptionRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); // Assuming protect middleware handles JWT authentication
const { premiumAccessMiddleware } = require('../middleware/premiumAccessMiddleware'); // Middleware to check for premium tier
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Referral = require('../models/Referral'); // Import Referral model
const { generateUniqueReferralCode } = require('../utils/referralUtils'); // Import referral utility

// Stripe initialization - Ensure STRIPE_SECRET_KEY is in your .env file
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Webhook secret - Ensure STRIPE_WEBHOOK_SECRET is in your .env file for verifying webhook signatures
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Route to create a Stripe Checkout Session for subscribing
// POST /api/subscriptions/create-checkout-session
router.post('/create-checkout-session', protect, async (req, res) => {
  const { priceId, success_url, cancel_url } = req.body;
  const userId = req.user.id;

  if (!priceId || !success_url || !cancel_url) {
    return res.status(400).json({ errors: [{ msg: 'Missing required fields: priceId, success_url, cancel_url' }] });
  }

  try {
    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ errors: [{ msg: 'User not found' }] });
    }

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.username, // Optional: pass user's name
        metadata: {
          userId: user.id, // Store our app's user ID in Stripe customer metadata
        },
      });
      stripeCustomerId = customer.id;
      user.stripeCustomerId = stripeCustomerId;
      await user.save();
    }

    // Create a Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId, // Price ID from your Stripe Dashboard
          quantity: 1,
        },
      ],
      success_url: success_url, // URL to redirect to on successful payment
      cancel_url: cancel_url,   // URL to redirect to if payment is canceled
      metadata: {
        // Optionally, pass any other metadata relevant to your application
        userId: userId, // Useful for webhook handling
      }
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    res.status(500).json({ errors: [{ msg: 'Server error creating checkout session' }] });
  }
});

// Stripe Webhook Handler
// POST /api/subscriptions/webhook
// Important: This route needs express.raw middleware for Stripe to verify the signature
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ errors: [{ msg: 'Webhook signature verification failed' }] });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // session.customer (stripeCustomerId), session.subscription (stripeSubscriptionId)
      // session.metadata.userId (our app's userId)
      console.log('Checkout session completed:', session);

      try {
        const userId = session.metadata.userId;
        const stripeCustomerId = session.customer;
        const stripeSubscriptionId = session.subscription;

        if (!userId || !stripeCustomerId || !stripeSubscriptionId) {
          console.error('Webhook Error: checkout.session.completed missing crucial data.', { userId, stripeCustomerId, stripeSubscriptionId });
          return res.status(400).json({ errors: [{ msg: 'Missing data in webhook payload for checkout.session.completed' }] });
        }

        // Retrieve the subscription details to get priceId and current period info
        const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        if (!stripeSubscription) {
          console.error(`Webhook Error: Could not retrieve subscription ${stripeSubscriptionId} from Stripe.`);
          return res.status(400).json({ errors: [{ msg: 'Failed to retrieve subscription details from Stripe.' }] });
        }

        const priceId = stripeSubscription.items.data[0]?.price.id;

        // Update User model
        const user = await User.findById(userId);
        if (!user) {
          console.error(`Webhook Error: User not found with ID: ${userId}`);
          return res.status(404).json({ errors: [{ msg: 'User not found' }] });
        }
        user.stripeCustomerId = stripeCustomerId;
        user.subscriptionId = stripeSubscriptionId;
        user.userTier = 'premium';

        // Generate referral code if user is premium and doesn't have one
        if (user.userTier === 'premium' && !user.referralCode) {
          user.referralCode = await generateUniqueReferralCode();
          console.log(`Generated referral code ${user.referralCode} for user ${user.id}`);
        }
        await user.save();

        // Update Referral status if this user was referred
        if (user.referredBy) {
          const referral = await Referral.findOneAndUpdate(
            { referredUserId: user.id, status: 'pending' },
            { status: 'completed' },
            { new: true }
          );
          if (referral) {
            console.log(`Referral record updated to 'completed' for referred user ${user.id}`);
          }
        }

        // Create or Update Subscription record
        // Using findOneAndUpdate with upsert:true to handle new or existing subscriptions
        const updatedSubscription = await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: stripeSubscriptionId },
          {
            userId: userId,
            stripePriceId: priceId,
            status: stripeSubscription.status, // e.g., 'active', 'trialing'
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
            trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
            endedAt: stripeSubscription.ended_at ? new Date(stripeSubscription.ended_at * 1000) : null,
          },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        console.log('Subscription record created/updated:', updatedSubscription);

      } catch (dbError) {
        console.error('Webhook dbError (checkout.session.completed):', dbError);
        return res.status(500).json({ errors: [{ msg: 'Database error processing webhook for checkout.session.completed' }] });
      }
      break;

    case 'customer.subscription.updated':
      const subscriptionUpdated = event.data.object;
      console.log('Customer subscription updated:', subscriptionUpdated);
      try {
        const existingSubscription = await Subscription.findOne({ stripeSubscriptionId: subscriptionUpdated.id });
        if (!existingSubscription) {
          console.error(`Webhook Error: Subscription with ID ${subscriptionUpdated.id} not found in DB for update.`);
          // Optionally, you could create it if it's missing and the status is active/trialing
          // For now, we'll assume it should exist if we're getting an update.
          return res.status(404).json({ errors: [{ msg: 'Subscription not found in database for update.' }] });
        }

        existingSubscription.status = subscriptionUpdated.status;
        existingSubscription.currentPeriodStart = new Date(subscriptionUpdated.current_period_start * 1000);
        existingSubscription.currentPeriodEnd = new Date(subscriptionUpdated.current_period_end * 1000);
        existingSubscription.cancelAtPeriodEnd = subscriptionUpdated.cancel_at_period_end;
        existingSubscription.endedAt = subscriptionUpdated.ended_at ? new Date(subscriptionUpdated.ended_at * 1000) : null;
        existingSubscription.trialStart = subscriptionUpdated.trial_start ? new Date(subscriptionUpdated.trial_start * 1000) : null;
        existingSubscription.trialEnd = subscriptionUpdated.trial_end ? new Date(subscriptionUpdated.trial_end * 1000) : null;
        // Update priceId if it changed, though less common for updates unless plan changes
        if (subscriptionUpdated.items.data.length > 0) {
            existingSubscription.stripePriceId = subscriptionUpdated.items.data[0].price.id;
        }
        await existingSubscription.save();

        // Potentially update user's tier based on status
        const userToUpdate = await User.findById(existingSubscription.userId);
        if (userToUpdate) {
          if (['past_due', 'unpaid', 'canceled'].includes(subscriptionUpdated.status) && subscriptionUpdated.ended_at) {
            // If subscription truly ended (not just cancel_at_period_end=true)
             if (userToUpdate.subscriptionId === subscriptionUpdated.id) {
                userToUpdate.userTier = 'free';
                // Referral code remains even if they downgrade
                await userToUpdate.save();
             }
          } else if (subscriptionUpdated.status === 'active' || subscriptionUpdated.status === 'trialing') {
            userToUpdate.userTier = 'premium';
            userToUpdate.subscriptionId = subscriptionUpdated.id;
            // Generate referral code if user becomes premium and doesn't have one
            if (!userToUpdate.referralCode) {
              userToUpdate.referralCode = await generateUniqueReferralCode();
              console.log(`Generated referral code ${userToUpdate.referralCode} for user ${userToUpdate.id} via subscription update`);
            }
            await userToUpdate.save();

            // Update Referral status if this user was referred and subscription becomes active
            if (userToUpdate.referredBy && (subscriptionUpdated.status === 'active' || subscriptionUpdated.status === 'trialing')) {
              const referral = await Referral.findOneAndUpdate(
                { referredUserId: userToUpdate.id, status: 'pending' },
                { status: 'completed' },
                { new: true }
              );
              if (referral) {
                console.log(`Referral record updated to 'completed' for referred user ${userToUpdate.id} via subscription update`);
              }
            }
          }
        }
        console.log('Subscription record updated from customer.subscription.updated event.');
      } catch (dbError) {
        console.error('Webhook dbError (customer.subscription.updated):', dbError);
        return res.status(500).json({ errors: [{ msg: 'Database error processing webhook for customer.subscription.updated' }] });
      }
      break;

    case 'customer.subscription.deleted': // Occurs when a subscription is canceled definitively
      const subscriptionDeleted = event.data.object;
      console.log('Customer subscription deleted:', subscriptionDeleted);
      try {
        const sub = await Subscription.findOne({ stripeSubscriptionId: subscriptionDeleted.id });
        if (sub) {
          sub.status = 'ended'; // Or 'canceled', depending on your preference for final state
          sub.endedAt = subscriptionDeleted.ended_at ? new Date(subscriptionDeleted.ended_at * 1000) : new Date();
          sub.cancelAtPeriodEnd = true; // Ensure this is marked
          await sub.save();

          const user = await User.findById(sub.userId);
          if (user && user.subscriptionId === subscriptionDeleted.id) { // Only update if this was their active subscription
            user.userTier = 'free';
            await user.save();
            console.log(`User ${user.id} tier set to free due to subscription deletion.`);
          }
        } else {
            console.warn(`Webhook Warning: Received customer.subscription.deleted for non-existent subscription ID ${subscriptionDeleted.id}`);
        }
      } catch (dbError) {
        console.error('Webhook dbError (customer.subscription.deleted):', dbError);
        return res.status(500).json({ errors: [{ msg: 'Database error processing webhook for customer.subscription.deleted' }] });
      }
      break;

    case 'invoice.payment_succeeded':
      const invoicePaymentSucceeded = event.data.object;
      console.log('Invoice payment succeeded:', invoicePaymentSucceeded);
      if (invoicePaymentSucceeded.subscription) { // Only handle for subscription payments
        try {
            const sub = await Subscription.findOne({ stripeSubscriptionId: invoicePaymentSucceeded.subscription });
            if (sub) {
                sub.status = 'active'; // Ensure status is active
                sub.currentPeriodStart = new Date(invoicePaymentSucceeded.lines.data[0].period.start * 1000);
                sub.currentPeriodEnd = new Date(invoicePaymentSucceeded.lines.data[0].period.end * 1000);
                sub.endedAt = null; // Clear endedAt if it was previously set (e.g. from past_due)
                await sub.save();

                const user = await User.findById(sub.userId);
                if (user) { // Check if user exists
                    if (user.userTier !== 'premium') {
                       user.userTier = 'premium';
                       user.subscriptionId = sub.stripeSubscriptionId;
                       // Generate referral code if user becomes premium and doesn't have one
                       if (!user.referralCode) {
                         user.referralCode = await generateUniqueReferralCode();
                         console.log(`Generated referral code ${user.referralCode} for user ${user.id} via invoice payment`);
                       }
                       await user.save();
                       console.log(`User ${user.id} tier set to premium due to invoice.payment_succeeded.`);
                    }
                    // Update Referral status if this user was referred and invoice payment succeeded for active sub
                    if (user.referredBy && sub.status === 'active') {
                        const referral = await Referral.findOneAndUpdate(
                            { referredUserId: user.id, status: 'pending' },
                            { status: 'completed' },
                            { new: true }
                        );
                        if (referral) {
                            console.log(`Referral record updated to 'completed' for referred user ${user.id} via invoice payment`);
                        }
                    }
                }
                console.log('Subscription updated from invoice.payment_succeeded.');
            } else {
                console.warn(`Webhook Warning: Received invoice.payment_succeeded for non-existent subscription ID ${invoicePaymentSucceeded.subscription}`);
            }
        } catch (dbError) {
            console.error('Webhook dbError (invoice.payment_succeeded):', dbError);
            return res.status(500).json({ errors: [{ msg: 'Database error processing webhook for invoice.payment_succeeded' }] });
        }
      }
      break;

    case 'invoice.payment_failed':
      const invoicePaymentFailed = event.data.object;
      console.log('Invoice payment failed:', invoicePaymentFailed);
      if (invoicePaymentFailed.subscription) {
        try {
            const sub = await Subscription.findOne({ stripeSubscriptionId: invoicePaymentFailed.subscription });
            if (sub) {
                // Stripe automatically retries payments. Status might be 'past_due'.
                // If all retries fail, subscription might transition to 'canceled' or 'unpaid' via customer.subscription.updated event.
                sub.status = invoicePaymentFailed.status || 'past_due'; // 'past_due' or could be 'unpaid' depending on Stripe settings
                if (invoicePaymentFailed.next_payment_attempt) {
                    console.log(`Next payment attempt for ${sub.stripeSubscriptionId} on ${new Date(invoicePaymentFailed.next_payment_attempt * 1000)}`);
                } else { // All retries might have failed
                    sub.endedAt = new Date(); // Mark as ended if no more attempts
                    sub.status = 'unpaid';
                }
                await sub.save();

                // Optionally update user tier if it's definitively unpaid
                if (sub.status === 'unpaid') {
                    const user = await User.findById(sub.userId);
                    if (user && user.subscriptionId === sub.stripeSubscriptionId) {
                        user.userTier = 'free';
                        await user.save();
                        console.log(`User ${user.id} tier set to free due to invoice.payment_failed leading to unpaid status.`);
                    }
                }
                console.log('Subscription updated from invoice.payment_failed.');
            }  else {
                console.warn(`Webhook Warning: Received invoice.payment_failed for non-existent subscription ID ${invoicePaymentFailed.subscription}`);
            }
        } catch (dbError) {
            console.error('Webhook dbError (invoice.payment_failed):', dbError);
            return res.status(500).json({ errors: [{ msg: 'Database error processing webhook for invoice.payment_failed' }] });
        }
      }
      break;

    // ... handle other event types as needed

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({received: true});
});

// Route to create a Stripe Customer Portal Session
// POST /api/subscriptions/create-customer-portal-session
router.post('/create-customer-portal-session', protect, async (req, res) => {
  const { return_url } = req.body; // URL to redirect to after portal session
  const userId = req.user.id;

  if (!return_url) {
    return res.status(400).json({ errors: [{ msg: 'Missing required field: return_url' }] });
  }

  try {
    const user = await User.findById(userId);
    if (!user || !user.stripeCustomerId) {
      return res.status(404).json({ errors: [{ msg: 'Stripe customer ID not found for this user. No active subscription to manage.' }] });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: return_url,
    });

    res.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating Stripe customer portal session:', error);
    res.status(500).json({ errors: [{ msg: 'Server error creating customer portal session' }] });
  }
});

// Route to get current user's subscription details
// GET /api/subscriptions/my-subscription
router.get('/my-subscription', protect, async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ errors: [{ msg: 'User not found' }] });
    }

    // Find the most relevant subscription.
    // Prefer active/trialing, but could also include past_due if you want to show that state.
    // Sorting by currentPeriodEnd descending might be useful if multiple non-active subscriptions exist.
    const subscription = await Subscription.findOne({
      userId: userId,
      // Filter for statuses that represent an ongoing or recently relevant subscription
      status: { $in: ['active', 'trialing', 'past_due', 'incomplete'] }
    }).sort({ currentPeriodEnd: -1 }); // Get the one with the latest period end

    if (!subscription) {
      // It's also possible the user is 'premium' due to an old import or manual setting
      // but has no active Stripe subscription object in *our* DB.
      // In this case, their tier on the User model is the source of truth for access.
      return res.json({
        userTier: user.userTier, // Reflect the tier from User model
        subscription: null, // No detailed subscription object from Stripe
        message: 'No active or recent Stripe subscription record found. User tier is based on User record.'
      });
    }

    // For consistency, the userTier from the User model should be the ultimate source of truth for access control.
    // The subscription object provides details about the Stripe subscription itself.
    res.json({
      userTier: user.userTier, // Reflect the tier from User model
      subscription: {
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        stripePriceId: subscription.stripePriceId,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        trialStart: subscription.trialStart,
        trialEnd: subscription.trialEnd,
      }
    });

  } catch (error) {
    console.error('Error fetching user subscription details:', error);
    res.status(500).json({ errors: [{ msg: 'Server error fetching subscription details' }] });
  }
});

// Example of a premium-only route
router.get('/premium-feature', protect, premiumAccessMiddleware, (req, res) => {
  res.json({ msg: 'Welcome to the premium feature!', user: req.user.username });
});

module.exports = router;
