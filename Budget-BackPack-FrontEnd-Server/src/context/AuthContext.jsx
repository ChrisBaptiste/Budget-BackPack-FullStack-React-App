// src/context/AuthContext.jsx - Fixed version
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [userTier, setUserTier] = useState('free');
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to fetch core user details (including profile, tier)
  const fetchUserDetails = async () => {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      logoutAction(); // Ensure clean state if no token
      return;
    }
    try {
      if (!axios.defaults.headers.common['Authorization']) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`;
      }
      const { data: userData } = await axios.get('/api/auth/me');
      setUser(userData); // This now includes bio, profilePictureUrl, travelPreferences
      setUserTier(userData.userTier || 'free');
      // If user has a subscriptionId, fetch its details separately
      if (userData.subscriptionId) {
        await fetchAndUpdateSubscriptionStatus();
      } else {
        setSubscriptionDetails(null); // No active Stripe subscription
      }
    } catch (err) {
      console.error("Error fetching user details (/api/auth/me):", err);
      // If /me fails (e.g. token invalid from server perspective), logout
      logoutAction();
    }
  };

  // Function to fetch and update Stripe subscription status
  const fetchAndUpdateSubscriptionStatus = async () => {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) return; // Should be logged out if no token
    try {
      if (!axios.defaults.headers.common['Authorization']) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`;
      }
      const response = await axios.get('/api/subscriptions/my-subscription');
      if (response.data) {
        // userTier is also set here based on subscription, could be redundant if /me also sets it
        // but good to keep consistent with Stripe's view of the subscription
        setUserTier(response.data.userTier || 'free');
        setSubscriptionDetails(response.data.subscription);
      }
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
      // Don't logout here, as /me might still be valid.
      // Let subscription details be potentially stale or null if this fails.
    }
  };

  // Token validation (simplified, as /api/auth/me will be the real test)
  const validateToken = (tokenToValidate) => {
    if (tokenToValidate) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${tokenToValidate}`;
      return true;
    }
    return false;
  };

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        if (validateToken(storedToken)) {
          setToken(storedToken);
          await fetchUserDetails(); // Fetch full user details and then subscription status
        } else {
          // This case might be redundant if validateToken is simple
          logoutAction(); // Clears all user state if token is somehow invalid locally
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);

  // Set up axios response interceptor for automatic logout on 401
  useEffect(() => {
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && token) { // Check token to prevent logout if already logged out
          console.log('Received 401, logging out user');
          logoutAction(); // Centralized logout logic
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [token]); // Rerun if token changes (e.g. on login/logout)

  const loginAction = async (newToken, initialUserData = null) => {
    try {
      localStorage.setItem('token', newToken);
      setToken(newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      // If initialUserData is provided (e.g. from register), set it temporarily
      // but prioritize fetching full details from /api/auth/me for consistency
      if (initialUserData) {
        setUser(initialUserData);
        setUserTier(initialUserData.userTier || 'free');
      }
      await fetchUserDetails(); // Fetch full user details which includes profile, tier
                                // This will also trigger fetchAndUpdateSubscriptionStatus if needed.
      
      console.log('User logged in successfully, full details fetched.');
    } catch (error) {
      console.error('Error during login action:', error);
      logoutAction(); // Clear state if login process fails
    }
  };

  const logoutAction = () => {
    try {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null); // Clear user object
      setUserTier('free');
      setSubscriptionDetails(null);
      delete axios.defaults.headers.common['Authorization'];
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Error during logout action:', error);
    }
  };

  // Function to update user locally, e.g., after profile edit
  const updateUserContext = (updatedUserData) => {
    setUser(prevUser => ({ ...prevUser, ...updatedUserData }));
    if (updatedUserData.userTier) {
      setUserTier(updatedUserData.userTier);
    }
  };

  const authContextValue = {
    token,
    user, // This object will now contain bio, profilePictureUrl, etc.
    isAuthenticated: !!token && !!user, // User should also be loaded
    userTier,
    subscriptionDetails,
    loading,
    loginAction,
    logoutAction,
    setUser: updateUserContext, // Expose a safe way to update parts of user or all of it
    fetchAndUpdateSubscriptionStatus,
    fetchUserDetails, // Expose this if manual refresh of user profile is needed
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};