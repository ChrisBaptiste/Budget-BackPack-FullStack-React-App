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
      {/* Hero Section */}
      <header className="dashboard-hero">
        <div className="hero-content">
          <h1>My Travel Dashboard</h1>
          {user && <p className="welcome-message">Welcome back, {user.username || 'Traveler'}! ✈️</p>}
          <p className="hero-subtitle">Your adventure starts here</p>
        </div>
        <div className="hero-actions">
          <Link to="/create-trip" className="btn btn-primary btn-large">
            <span className="btn-icon">🎒</span>
            Plan a New Trip
          </Link>
        </div>
      </header>

      {/* Grid Dashboard Layout */}
      <div className="dashboard-grid">
        
        {/* Account Status Card */}
        <div className="dashboard-card account-card">
          <div className="card-header">
            <h3>
              <span className="card-icon">👤</span>
              Account Status
            </h3>
          </div>
          <div className="card-content">
            <div className="tier-display">
              <span className="tier-label">Current Plan</span>
              <span className={`tier-badge tier-${userTier}`}>
                {userTier === 'premium' ? '⭐ Premium' : '🆓 Free'}
              </span>
            </div>
            
            {userTier === 'free' && (
              <button onClick={() => navigate('/pricing')} className="btn btn-upgrade">
                <span className="btn-icon">✨</span>
                Upgrade to Premium
              </button>
            )}
            
            {userTier === 'premium' && subscriptionDetails && (
              <div className="subscription-details">
                <div className="status-row">
                  <span>Status:</span>
                  <span className={`status-badge status-${subscriptionDetails.status}`}>
                    {subscriptionDetails.status}
                  </span>
                </div>
                {subscriptionDetails.currentPeriodEnd && (
                  <div className="renewal-info">
                    <span>Renews:</span>
                    <span>{new Date(subscriptionDetails.currentPeriodEnd).toLocaleDateString()}</span>
                  </div>
                )}
                {subscriptionDetails.cancelAtPeriodEnd && (
                  <div className="warning-notice">
                    ⚠️ Subscription will cancel at period end
                  </div>
                )}
                <button 
                  onClick={handleManageSubscription} 
                  disabled={portalLoading} 
                  className="btn btn-outline"
                >
                  {portalLoading ? 'Loading...' : 'Manage Subscription'}
                </button>
                {portalError && <div className="error-message">{portalError}</div>}
              </div>
            )}
          </div>
        </div>

        {/* Trip Stats Card */}
        <div className="dashboard-card stats-card">
          <div className="card-header">
            <h3>
              <span className="card-icon">📊</span>
              Trip Statistics
            </h3>
          </div>
          <div className="card-content">
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-number">{trips.length}</div>
                <div className="stat-label">Total Trips</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">
                  {trips.filter(trip => new Date(trip.startDate) > new Date()).length}
                </div>
                <div className="stat-label">Upcoming</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">
                  {trips.reduce((total, trip) => total + (trip.budget || 0), 0).toLocaleString()}
                </div>
                <div className="stat-label">Total Budget</div>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Card - Only for Premium Users */}
        {userTier === 'premium' && referralStats.referralCode && (
          <div className="dashboard-card referral-card">
            <div className="card-header">
              <h3>
                <span className="card-icon">🎁</span>
                Refer & Earn
              </h3>
              <span className="card-badge">Coming Soon</span>
            </div>
            <div className="card-content">
              {referralStatsLoading ? (
                <div className="loading-state">Loading referral details...</div>
              ) : (
                <>
                  <div className="referral-code-section">
                    <label>Your Referral Code:</label>
                    <div className="code-display">
                      <code className="referral-code">{referralStats.referralCode}</code>
                      <button 
                        onClick={handleCopyToClipboard} 
                        className="btn btn-copy"
                        title="Copy to clipboard"
                      >
                        {copySuccess || '📋'}
                      </button>
                    </div>
                  </div>
                  <div className="referral-stats">
                    <div className="referral-count">
                      <span className="count">{referralStats.successfulReferrals}</span>
                      <span className="label">Successful Referrals</span>
                    </div>
                  </div>
                  <p className="referral-description">
                    Share your code with friends and earn rewards when they subscribe!
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions Card */}
        <div className="dashboard-card actions-card">
          <div className="card-header">
            <h3>
              <span className="card-icon">⚡</span>
              Quick Actions
            </h3>
          </div>
          <div className="card-content">
            <div className="actions-grid">
              <Link to="/create-trip" className="action-item">
                <span className="action-icon">🗺️</span>
                <span className="action-label">New Trip</span>
              </Link>
              <Link to="/search" className="action-item">
                <span className="action-icon">🔍</span>
                <span className="action-label">Search</span>
              </Link>
              <Link to="/pricing" className="action-item">
                <span className="action-icon">💎</span>
                <span className="action-label">Pricing</span>
              </Link>
              <Link to="/feed" className="action-item">
                <span className="action-icon">📱</span>
                <span className="action-label">Feed</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Trips Section - Full Width */}
        <div className="dashboard-card trips-card full-width">
          <div className="card-header">
            <h3>
              <span className="card-icon">🧳</span>
              Your Trips
            </h3>
            {trips.length > 0 && (
              <Link to="/create-trip" className="btn btn-outline btn-small">
                Add New Trip
              </Link>
            )}
          </div>
          <div className="card-content">
            {loadingTrips && (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <span>Loading your trips...</span>
              </div>
            )}
            
            {error && <div className="error-message">{error}</div>}
            
            {!loadingTrips && !error && trips.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🎒</div>
                <h4>No trips planned yet</h4>
                <p>Start planning your next adventure!</p>
                <Link to="/create-trip" className="btn btn-primary">
                  Plan Your First Trip
                </Link>
              </div>
            )}
            
            {!loadingTrips && !error && trips.length > 0 && (
              <div className="trips-grid">
                {trips.map(trip => (
                  <div key={trip._id} className="trip-card">
                    <div className="trip-dates">
                      <div className="date-start">
                        {new Date(trip.startDate).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className="date-range">
                        {new Date(trip.endDate).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </div>
                    </div>
                    <div className="trip-content">
                      <h4 className="trip-title">
                        <Link to={`/trip/${trip._id}`}>{trip.tripName}</Link>
                      </h4>
                      <p className="trip-destination">
                        📍 {trip.destinationCity}, {trip.destinationCountry}
                      </p>
                      {trip.budget > 0 && (
                        <p className="trip-budget">
                          💰 ${trip.budget.toLocaleString()}
                        </p>
                      )}
                      <div className="trip-meta">
                        <span className={`privacy-badge ${trip.isPublic ? 'public' : 'private'}`}>
                          {trip.isPublic ? '🌐 Public' : '🔒 Private'}
                        </span>
                      </div>
                    </div>
                    <div className="trip-actions">
                      <Link to={`/trip/${trip._id}`} className="btn btn-outline btn-small">
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;