// src/pages/SubscriptionSuccessPage/SubscriptionSuccessPage.jsx
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './SubscriptionSuccessPage.css'; // We'll create this later

const SubscriptionSuccessPage = () => {
  const { fetchAndUpdateSubscriptionStatus } = useAuth();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // const queryParams = new URLSearchParams(location.search);
    // const sessionId = queryParams.get('session_id');
    // console.log('Stripe Checkout Session ID:', sessionId); // For debug, not strictly needed for logic here

    const updateStatus = async () => {
      setIsLoading(true);
      setError('');
      try {
        // The webhook should handle the actual subscription update.
        // This call ensures the frontend AuthContext is updated promptly.
        // Add a small delay to give webhook time to process, if necessary, though ideally webhook is fast.
        await new Promise(resolve => setTimeout(resolve, 1500)); // Optional delay
        await fetchAndUpdateSubscriptionStatus();
      } catch (err) {
        console.error("Error updating subscription status on success page:", err);
        setError('There was an issue updating your subscription status. Please refresh or check your dashboard.');
      } finally {
        setIsLoading(false);
      }
    };

    updateStatus();
  }, [fetchAndUpdateSubscriptionStatus, location]);

  return (
    <div className="subscription-success-container">
      <div className="success-card">
        <div className="success-icon">🎉</div>
        <h1>Subscription Successful!</h1>
        <p>Welcome to Premium! Your subscription has been activated.</p>
        {isLoading && <p>Updating your account details...</p>}
        {error && <p className="error-message" style={{color: 'red'}}>{error}</p>}

        <div className="success-actions">
          <p>You can now access all premium features.</p>
          <Link to="/dashboard" className="btn btn-primary">
            Go to Dashboard
          </Link>
          <Link to="/" className="btn btn-secondary-outline" style={{marginLeft: '10px'}}>
            Back to Home
          </Link>
        </div>

        <div className="post-success-info">
          <p>
            If your premium status isn't reflected immediately, please try logging out and logging back in, or wait a few moments for the update to complete.
          </p>
          <p>
            You can manage your subscription at any time from your account settings page.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSuccessPage;
