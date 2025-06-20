
const express = require('express');
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const bcrypt = require('bcryptjs'); // Importing bcrypt for password comparison, though hashing is in the model.
const jwt = require('jsonwebtoken'); // Importing jsonwebtoken for creating auth tokens.
const User = require('../models/User'); // Pulling in my User model.
const Referral = require('../models/Referral'); // Import Referral model


// GET /api/auth/me - Get current user profile
router.get('/me', protect, async (req, res) => {
  try {
    // Also populate userTier and subscriptionId for the frontend AuthContext
    const user = await User.findById(req.user.id).select('-password');
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      userTier: user.userTier,
      subscriptionId: user.subscriptionId,
      referralCode: user.referralCode,
      // New profile fields for /me endpoint
      bio: user.bio,
      profilePictureUrl: user.profilePictureUrl,
      travelPreferences: user.travelPreferences
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});


// ------------   POST api/auth/register
// -----------    Registering a new user for the application.
router.post('/register', async (req, res) => {
    const { username, email, password, referralCode } = req.body; // Added referralCode
    console.log('AUTH_REG: Request to /register received with email:', email, 'and username:', username); 
    if (referralCode) {
        console.log('AUTH_REG: Received referral code:', referralCode);
    }

    try {
        let user = await User.findOne({ email });
        if (user) {
            console.log('User already exists with email:', email); 
            return res.status(400).json({ errors: [{ msg: 'User already exists with this email' }] });
        }
        user = await User.findOne({ username });
        if (user) {
            console.log('User already exists with username:', username); 
            return res.status(400).json({ errors: [{ msg: 'Username is already taken' }] });
        }

        user = new User({
            username,
            email,
            password,
            // referredBy will be set below if referralCode is valid
        });

        let referrerUser = null;
        if (referralCode) {
            referrerUser = await User.findOne({ referralCode: referralCode.trim().toUpperCase() });
            if (referrerUser) {
                console.log(`AUTH_REG: Referrer user ${referrerUser.username} found for code ${referralCode}`);
                user.referredBy = referrerUser._id;
            } else {
                console.log(`AUTH_REG: No referrer user found for code ${referralCode}. Proceeding without referral.`);
                // Optionally, you could return an error here if the referral code is invalid,
                // but the requirement is to make it optional, so we just ignore invalid codes.
            }
        }

        console.log('Attempting to save new user with email:', email); 
        await user.save(); // This is the database save operation
        console.log('User with email:', email, 'successfully saved. User ID:', user.id); 

        // If user was referred, create a Referral record
        if (referrerUser && user.referredBy) {
            try {
                const newReferral = new Referral({
                    referrerId: referrerUser._id,
                    referredUserId: user._id,
                    status: 'pending'
                });
                await newReferral.save();
                console.log(`AUTH_REG: Referral record created for referrer ${referrerUser.username} and referred user ${user.username}`);
            } catch (referralError) {
                // Log this error, but don't fail the registration because of it
                console.error(`AUTH_REG: Error creating referral record for user ${user.id}:`, referralError);
            }
        }

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5h' },
            (err, token) => {
                if (err) {
                    console.error('Error signing JWT for user:', email, err); 
                    throw err;
                }
                res.status(201).json({ token });
            }
        );

    } catch (err) {
        // This catch block will now primarily catch errors from findOne, new User, or jwt.sign
        // Mongoose .save() errors (like validation or DB connection issues during save) might also land here
        console.error('AUTH_REG: Overall error during registration for email:', email, 'Error:', err); 
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ errors: messages.map(msg => ({ msg })) });
        }
        res.status(500).send('Server error during registration');
    }
});


// ----------------------  POST api/auth/login  ------------------------ //
//   ---------- Authenticating an existing user and getting a token. ------//
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('AUTH_LOGIN: Attempting login for email:', email); // Added for debugging

    try {
        let user = await User.findOne({ email });
        if (!user) {
            console.log('AUTH_LOGIN: User not found for email:', email); // Debugging
            return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }] });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            console.log('AUTH_LOGIN: Password mismatch for email:', email); // Debugging
            return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }] });
        }

        const payload = { user: { id: user.id } };
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5h' },
            (err, token) => {
                if (err) {
                    console.error('AUTH_LOGIN: Error signing JWT for user:', email, err);
                    throw err; // Will be caught by outer catch
                }
                console.log('AUTH_LOGIN: Login successful, token generated for email:', email); // Debugging
                res.json({ token });
            }
        );
    } catch (err) {
        console.error("AUTH_LOGIN: Overall error during login for email:", email, "Error:", err.message);
        res.status(500).send('Server error during login');
    }
});

// PUT /api/auth/profile - Update current user's profile
router.put('/profile', protect, async (req, res) => {
  const { bio, profilePictureUrl, travelPreferences } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Update fields if provided
    if (bio !== undefined) {
        if (bio.length > 250) {
            return res.status(400).json({ errors: [{msg: 'Bio cannot exceed 250 characters.'}]});
        }
        user.bio = bio;
    }
    if (profilePictureUrl !== undefined) {
        // Basic validation: check if it's a string. More complex URL validation could be added.
        if (typeof profilePictureUrl !== 'string') {
             return res.status(400).json({ errors: [{msg: 'Profile picture URL must be a string.'}]});
        }
        // For now, we'll trust the user with the URL or path.
        // Could add validation to ensure it's a relative path or a valid URL format.
        user.profilePictureUrl = profilePictureUrl;
    }
    if (travelPreferences !== undefined) {
        if (!Array.isArray(travelPreferences) || !travelPreferences.every(item => typeof item === 'string')) {
            return res.status(400).json({ errors: [{msg: 'Travel preferences must be an array of strings.'}]});
        }
        user.travelPreferences = travelPreferences;
    }

    await user.save();

    // Return the updated user object (excluding password)
    const updatedUser = await User.findById(userId).select('-password');
    res.json({
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        createdAt: updatedUser.createdAt,
        userTier: updatedUser.userTier,
        subscriptionId: updatedUser.subscriptionId,
        referralCode: updatedUser.referralCode,
        bio: updatedUser.bio,
        profilePictureUrl: updatedUser.profilePictureUrl,
        travelPreferences: updatedUser.travelPreferences
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ errors: messages.map(msg => ({ msg })) });
    }
    res.status(500).json({ msg: 'Server error while updating profile' });
  }
});


// GET /api/auth/users/:userId/profile - Get public profile of a user
// Note: This route is typically placed in a separate userRoutes.js or userProfileRoutes.js file.
// For simplicity in this subtask, adding it here. If it grows, consider moving.
// The path includes /auth here, which might not be ideal long-term for public user profiles.
// A path like /api/users/:userId/profile might be better.
router.get('/users/:userId/profile', async (req, res) => {
    try {
      const user = await User.findById(req.params.userId).select(
        'username bio profilePictureUrl travelPreferences createdAt' // Select only public fields
      );

      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }

      res.json({
        username: user.username,
        bio: user.bio,
        profilePictureUrl: user.profilePictureUrl,
        travelPreferences: user.travelPreferences,
        memberSince: user.createdAt, // Renaming for clarity on public profile
      });
    } catch (err) {
      console.error('Error fetching public user profile:', err);
      if (err.name === 'CastError') {
        return res.status(400).json({ msg: 'Invalid user ID format' });
      }
      res.status(500).json({ msg: 'Server error' });
    }
  });


// Exporting the router so it can be used in my main server file.
module.exports = router;