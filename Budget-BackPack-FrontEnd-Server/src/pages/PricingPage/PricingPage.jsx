// src/pages/PricingPage/PricingPage.jsx
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext'; // To check if user is already premium
import './PricingPage.css'; // We'll create this later for basic styling

// Make sure to put your Stripe publishable key in your .env file
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
const premiumPriceId = import.meta.env.VITE_STRIPE_PREMIUM_PRICE_ID;

const PricingPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { userTier, isAuthenticated } = useAuth();

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      setError('Please log in to subscribe.');
      // Consider redirecting to login: navigate('/login');
      return;
    }

    if (userTier === 'premium') {
      setError('You are already a premium user.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Define success and cancel URLs
      const success_url = `${window.location.origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`;
      const cancel_url = `${window.location.origin}/pricing`;

      // Get a checkout session ID from the backend
      const response = await axios.post('/api/subscriptions/create-checkout-session', {
        priceId: premiumPriceId,
        success_url: success_url,
        cancel_url: cancel_url,
      });

      const sessionId = response.data.sessionId;
      if (!sessionId) {
        throw new Error('Could not retrieve a checkout session ID.');
      }

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });

      if (stripeError) {
        console.error('Stripe redirection error:', stripeError);
        setError(stripeError.message || 'Failed to redirect to Stripe. Please try again.');
      }
    } catch (err) {
      console.error('Subscription process error:', err);
      setError(err.response?.data?.msg || err.message || 'Failed to initiate subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pricing-page-container">
      <header className="pricing-header">
        <h1>Upgrade Your Adventure</h1>
        <p>Unlock premium features to make your travel planning seamless and extraordinary.</p>
      </header>

      <div className="pricing-plans">
        <div className="pricing-card premium-card">
          <h2>Premium Plan</h2>
          <p className="price">Contact Sales</p> {/* Or a fixed price like $10/month */}
          <p className="price-description">Billed monthly or annually. Cancel anytime.</p>

          <ul className="features-list">
            <li>✨ Unlimited Trip Planning</li>
            <li>🗺️ Advanced Destination Insights (Coming Soon!)</li>
            <li>☁️ Cloud Sync & Backup for Trips</li>
            <li>📧 Priority Email Support</li>
            <li>🚫 Ad-Free Experience</li>
          </ul>

          {isAuthenticated && userTier === 'premium' ? (
            <div className="current-plan-info">
              <p>You are currently on the Premium Plan.</p>
              {/* Link to manage subscription could go here */}
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={loading || (isAuthenticated && userTier === 'premium')}
              className="btn btn-primary btn-subscribe"
            >
              {loading ? 'Processing...' : 'Go Premium'}
            </button>
          )}
          {error && <p className="error-message" style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
          {!isAuthenticated && <p style={{marginTop: '10px'}}>Please <a href="/login">log in</a> or <a href="/register">register</a> to subscribe.</p>}
        </div>
      </div>

      <section className="faq-section">
        <h3>Frequently Asked Questions</h3>
        <div className="faq-item">
          <h4>Can I cancel my subscription?</h4>
          <p>Yes, you can cancel your subscription at any time through your account settings. Your premium access will continue until the end of the current billing period.</p>
        </div>
        <div className="faq-item">
          <h4>What payment methods do you accept?</h4>
          <p>We accept all major credit and debit cards through Stripe, our secure payment processor.</p>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;
