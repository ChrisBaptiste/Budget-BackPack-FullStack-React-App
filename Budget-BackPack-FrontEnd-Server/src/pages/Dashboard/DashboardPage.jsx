// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import { useAuth } from '../../context/AuthContext';
import './DashboardPage.css';

// I'll create these components in a bit.
// import CreateTripForm from '../components/Trips/CreateTripForm';
// import TripList from '../components/Trips/TripList';

const DashboardPage = () => {
  const { user, userTier, subscriptionDetails, fetchAndUpdateSubscriptionStatus } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [error, setError] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState('');
  const [referralStats, setReferralStats] = useState({ referralCode: null, successfulReferrals: 0 });
  const [referralStatsLoading, setReferralStatsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');


  // Fetch trips on mount
  useEffect(() => {
    const fetchTrips = async () => {
      setLoadingTrips(true);
      setError('');
      try {
        const response = await axios.get('/api/trips');
        const sortedTrips = response.data.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        setTrips(sortedTrips);
      } catch (err) {
        console.error("Error fetching trips:", err);
        setError('Failed to load your trips. Please try again later.');
      } finally {
        setLoadingTrips(false);
      }
    };
    fetchTrips();
  }, []);

  // Refresh subscription status and fetch referral stats when component mounts or userTier changes
  useEffect(() => {
    fetchAndUpdateSubscriptionStatus();

    if (userTier === 'premium') {
      setReferralStatsLoading(true);
      axios.get('/api/referrals/my-stats')
        .then(response => {
          setReferralStats(response.data);
        })
        .catch(err => {
          console.error("Error fetching referral stats:", err);
          // Handle error silently or show a small message
        })
        .finally(() => {
          setReferralStatsLoading(false);
        });
    } else {
      // Clear referral stats if user is not premium
      setReferralStats({ referralCode: null, successfulReferrals: 0 });
    }
  }, [fetchAndUpdateSubscriptionStatus, userTier]);

  const handleCopyToClipboard = () => {
    if (referralStats.referralCode) {
      navigator.clipboard.writeText(referralStats.referralCode)
        .then(() => {
          setCopySuccess('Copied!');
          setTimeout(() => setCopySuccess(''), 2000); // Clear message after 2 seconds
        })
        .catch(err => {
          console.error('Failed to copy referral code: ', err);
          setCopySuccess('Failed to copy.');
           setTimeout(() => setCopySuccess(''), 2000);
        });
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    setPortalError('');
    try {
      const response = await axios.post('/api/subscriptions/create-customer-portal-session', {
        return_url: window.location.href, // Redirect back to dashboard
      });
      if (response.data.url) {
        window.location.href = response.data.url; // Redirect to Stripe Portal
      } else {
        throw new Error('Could not retrieve customer portal URL.');
      }
    } catch (err) {
      console.error('Error creating customer portal session:', err);
      setPortalError(err.response?.data?.msg || 'Failed to open subscription management. Please try again.');
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>My Travel Dashboard</h1>
        {user && <p className="welcome-message">Welcome, {user.username || 'Traveler'}!</p>}
        <p>Here you can manage your upcoming adventures and plan new ones.</p>
      </header>

      <section className="account-status-section">
        <h2>Account Status</h2>
        <p>Current Tier: <span className={`tier-badge tier-${userTier}`}>{userTier}</span></p>
        {userTier === 'free' && (
          <button onClick={() => navigate('/pricing')} className="btn btn-secondary">
            ✨ Go Premium
          </button>
        )}
        {userTier === 'premium' && subscriptionDetails && (
          <div className="subscription-management">
            <p>Subscription Status: <span className={`status-badge status-${subscriptionDetails.status}`}>{subscriptionDetails.status}</span></p>
            {subscriptionDetails.currentPeriodEnd && (
              <p>Renews on: {new Date(subscriptionDetails.currentPeriodEnd).toLocaleDateString()}</p>
            )}
            {subscriptionDetails.cancelAtPeriodEnd && (
              <p className="warning-message">Your subscription will be canceled at the end of the current period.</p>
            )}
            <button onClick={handleManageSubscription} disabled={portalLoading} className="btn btn-secondary">
              {portalLoading ? 'Loading Portal...' : 'Manage Subscription'}
            </button>
            {portalError && <p className="error-message" style={{marginTop: '10px'}}>{portalError}</p>}
          </div>
        )}
      </section>

      {userTier === 'premium' && referralStats.referralCode && (
        <section className="referral-section">
          <h2>Refer & Earn (Coming Soon!)</h2>
          {referralStatsLoading ? (
            <p>Loading your referral details...</p>
          ) : (
            <>
              <p>
                Your Referral Code: <strong className="referral-code">{referralStats.referralCode}</strong>
                <button onClick={handleCopyToClipboard} className="btn btn-small btn-outline-secondary copy-btn">
                  {copySuccess || 'Copy'}
                </button>
              </p>
              <p>Successful Referrals: {referralStats.successfulReferrals}</p>
              <small>Share your code with friends. When they sign up and subscribe to Premium, you'll get rewards (details coming soon)!</small>
            </>
          )}
        </section>
      )}

      <section className="dashboard-actions">
        <Link to="/create-trip" className="btn btn-primary">Plan a New Trip</Link>
      </section>

      <section className="trips-section">
        <h2>Your Trips</h2>
        {loadingTrips && <p>Loading your trips...</p>}
        {error && <p className="error-message">{error}</p>}
        {!loadingTrips && !error && trips.length === 0 && (
          <p>You haven't planned any trips yet. Let's get started!</p>
        )}
        {!loadingTrips && !error && trips.length > 0 && (
          <div className="trips-timeline">
            {trips.map(trip => (
              <div key={trip._id} className="trip-timeline-item">
                <div className="trip-timeline-date">
                  <span className="date-start">{new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  <span className="date-separator">to</span>
                  <span className="date-end">{new Date(trip.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="trip-timeline-content">
                  <h3>
                    <Link to={`/trip/${trip._id}`}>{trip.tripName}</Link>
                  </h3>
                  <p className="destination">{trip.destinationCity}, {trip.destinationCountry}</p>
                  {trip.budget > 0 && ( // Display budget only if it's set
                    <p className="budget">Budget: ${trip.budget.toLocaleString()}</p>
                  )}
                   <p className="trip-visibility">
                    Status: {trip.isPublic ? 'Public' : 'Private'}
                  </p>
                  <Link to={`/trip/${trip._id}`} className="btn btn-small btn-secondary-outline view-details-btn">View Details</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardPage;