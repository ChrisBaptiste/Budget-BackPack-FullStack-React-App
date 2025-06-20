// src/pages/PricingPage/PricingPage.jsx
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './PricingPage.css';

// Make sure to put your Stripe publishable key in your .env file
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
const premiumPriceId = import.meta.env.VITE_STRIPE_PREMIUM_PRICE_ID;

const PricingPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { userTier, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      setError('Please log in to subscribe.');
      setTimeout(() => navigate('/login'), 2000);
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
      const success_url = `${window.location.origin}/dashboard?upgrade=success`;
      const cancel_url = `${window.location.origin}/pricing`;

      console.log('Creating checkout session with:', {
        priceId: premiumPriceId,
        success_url,
        cancel_url
      });

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
  };  const features = [
    {
      icon: '🗺️',
      title: 'Unlimited Trip Planning',
      description: 'Create and manage unlimited trips with detailed itineraries'
    },
    {
      icon: '🤖',
      title: 'AI Travel Assistant',
      description: 'Get personalized recommendations powered by advanced AI'
    },
    {
      icon: '☁️',
      title: 'Cloud Sync & Backup',
      description: 'Access your trips anywhere with automatic cloud synchronization'
    },
    {
      icon: '📧',
      title: 'Priority Support',
      description: '24/7 priority email support from our travel experts'
    },
    {
      icon: '🚫',
      title: 'Ad-Free Experience',
      description: 'Enjoy a clean, distraction-free planning experience'
    },
    {
      icon: '📊',
      title: 'Advanced Analytics',
      description: 'Track your travel budget and expenses with detailed insights'
    },
    {
      icon: '👥',
      title: 'Team Collaboration',
      description: 'Share and collaborate on trips with friends and family'
    },
    {
      icon: '📞',
      title: 'Phone & Video Support',
      description: 'Get live support via phone and video calls when you need it'
    },
    {
      icon: '🔒',
      title: 'Advanced Security',
      description: 'Enterprise-grade security features to protect your data'
    },
    {
      icon: '📈',
      title: 'Custom Reporting',
      description: 'Generate detailed reports and analytics for your travels'
    },
    {
      icon: '🌟',
      title: 'Premium Features',
      description: 'Access to all premium and enterprise-level functionality'
    },
    {
      icon: '🎯',
      title: 'Advanced Trip Templates',
      description: 'Pre-built trip templates for business and leisure travel'
    }
  ];

  return (
    <div className="pricing-page">
      {/* Hero Section */}
      <div className="pricing-hero">
        <div className="hero-content">          <h1 className="hero-title">Simple, Transparent Pricing</h1>
          <p className="hero-subtitle">
            Start free, upgrade to premium for the full travel planning experience. Everything you need at an affordable price.
          </p>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">10K+</span>
              <span className="stat-label">Happy Travelers</span>
            </div>
            <div className="stat">
              <span className="stat-number">50+</span>
              <span className="stat-label">Countries Covered</span>
            </div>
            <div className="stat">
              <span className="stat-number">99.9%</span>
              <span className="stat-label">Uptime</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="pricing-container">
        <div className="pricing-cards">
          
          {/* Free Plan */}
          <div className="pricing-card free-card">
            <div className="card-header">
              <h3 className="plan-name">Free Explorer</h3>
              <div className="price-display">
                <span className="currency">$</span>
                <span className="amount">0</span>
                <span className="period">/month</span>
              </div>
              <p className="plan-description">Perfect for occasional travelers</p>
            </div>
            
            <div className="card-body">
              <ul className="features-list">
                <li className="feature-item">
                  <span className="feature-icon">✅</span>
                  <span>Up to 3 trips per month</span>
                </li>
                <li className="feature-item">
                  <span className="feature-icon">✅</span>
                  <span>Basic trip planning tools</span>
                </li>
                <li className="feature-item">
                  <span className="feature-icon">✅</span>
                  <span>Community support</span>
                </li>                <li className="feature-item disabled">
                  <span className="feature-icon">❌</span>
                  <span>Advanced AI recommendations</span>
                </li>
                <li className="feature-item disabled">
                  <span className="feature-icon">❌</span>
                  <span>Cloud backup</span>
                </li>
                <li className="feature-item disabled">
                  <span className="feature-icon">❌</span>
                  <span>Team collaboration</span>
                </li>
              </ul>
            </div>
            
            <div className="card-footer">
              <button className="btn btn-outline" disabled>
                {userTier === 'free' ? 'Current Plan' : 'Downgrade to Free'}
              </button>
            </div>
          </div>

          {/* Premium Plan */}
          <div className="pricing-card premium-card featured">            <div className="featured-badge">
              <span>⭐ Best Value</span>
            </div>
            
            <div className="card-header">
              <h3 className="plan-name">Premium Traveler</h3>              <div className="price-display">
                <span className="currency">$</span>
                <span className="amount">9.99</span>
                <span className="period">/month</span>
              </div>
              <p className="plan-description">Everything you need for professional travel planning</p>
              <div className="savings-badge">
                Save 20% with annual billing
              </div>
            </div>
            
            <div className="card-body">
              <ul className="features-list">
                {features.map((feature, index) => (
                  <li key={index} className="feature-item">
                    <span className="feature-icon">{feature.icon}</span>
                    <div className="feature-content">
                      <span className="feature-title">{feature.title}</span>
                      <span className="feature-description">{feature.description}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="card-footer">
              {isAuthenticated && userTier === 'premium' ? (
                <div className="current-plan-info">
                  <span className="success-icon">✅</span>
                  <span>You're on the Premium Plan</span>
                  <button 
                    className="btn btn-outline btn-small"
                    onClick={() => navigate('/dashboard')}
                  >
                    Manage Subscription
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="btn btn-primary btn-large"
                >
                  {loading ? (
                    <>
                      <span className="loading-spinner"></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">🚀</span>
                      Go Premium Now
                    </>
                  )}
                </button>
              )}
              
              {error && (
                <div className="error-message">
                  <span className="error-icon">⚠️</span>
                  {error}
                </div>
              )}
              
              {!isAuthenticated && (
                <div className="auth-required">
                  <p>
                    <button onClick={() => navigate('/login')} className="link-button">
                      Log in
                    </button>
                    {' or '}
                    <button onClick={() => navigate('/register')} className="link-button">
                      create an account
                    </button>
                    {' to subscribe'}
                  </p>
                </div>
              )}
            </div>          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-showcase">
        <div className="container">
          <h2 className="section-title">Why Choose Premium?</h2>
          <div className="features-grid">
            {features.slice(0, 4).map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon-large">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="faq-section">
        <div className="container">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h4 className="faq-question">Can I cancel my subscription anytime?</h4>
              <p className="faq-answer">
                Yes! You can cancel your subscription at any time through your account settings. 
                Your premium access will continue until the end of the current billing period.
              </p>
            </div>
            
            <div className="faq-item">
              <h4 className="faq-question">What payment methods do you accept?</h4>
              <p className="faq-answer">
                We accept all major credit and debit cards through Stripe, our secure payment processor. 
                Your payment information is never stored on our servers.
              </p>
            </div>
            
            <div className="faq-item">
              <h4 className="faq-question">Is there a free trial?</h4>
              <p className="faq-answer">
                Yes! New users get a 14-day free trial of Premium features. 
                No credit card required to start your trial.
              </p>
            </div>
              <div className="faq-item">
              <h4 className="faq-question">Do you offer discounts for teams or agencies?</h4>
              <p className="faq-answer">
                Our Premium plan includes all enterprise features like team collaboration, 
                advanced security, and custom reporting at just $9.99/month. 
                Contact us for volume discounts on multiple accounts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Signals */}
      <div className="trust-section">
        <div className="container">
          <div className="trust-content">
            <h3>Trusted by travelers worldwide</h3>
            <div className="trust-features">
              <div className="trust-item">
                <span className="trust-icon">🔒</span>
                <span>Bank-level security</span>
              </div>
              <div className="trust-item">
                <span className="trust-icon">🌍</span>
                <span>Global support</span>
              </div>
              <div className="trust-item">
                <span className="trust-icon">💳</span>
                <span>Secure payments</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
