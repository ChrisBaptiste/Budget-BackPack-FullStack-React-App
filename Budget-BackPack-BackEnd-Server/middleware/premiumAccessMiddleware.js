// server/middleware/premiumAccessMiddleware.js
const premiumAccessMiddleware = (req, res, next) => {
    // Ensure user is authenticated and user object is available
    if (!req.user) {
      return res.status(401).json({ msg: 'Not authorized, no user logged in' });
    }

    // Check if the user's tier is 'premium'
    if (req.user.userTier !== 'premium') {
      return res.status(403).json({ msg: 'Access denied: Premium subscription required for this feature.' });
    }

    // If user is premium, proceed to the next middleware or route handler
    next();
  };

  module.exports = { premiumAccessMiddleware };
