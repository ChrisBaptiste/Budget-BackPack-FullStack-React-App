// server/utils/referralUtils.js
const crypto = require('crypto');
const User = require('../models/User'); // Adjust path as needed

/**
 * Generates a random alphanumeric string of a given length.
 * @param {number} length The desired length of the string.
 * @returns {string} The generated alphanumeric string.
 */
const generateRandomString = (length) => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex') // convert to hexadecimal format
    .slice(0, length) // return required number of characters
    .toUpperCase();
};

/**
 * Generates a unique referral code.
 * It checks against the User model to ensure the code is not already in use.
 * @param {number} length Desired length of the referral code (default: 6).
 * @returns {Promise<string>} A promise that resolves to a unique referral code.
 */
const generateUniqueReferralCode = async (length = 6) => {
  let referralCode;
  let isUnique = false;

  while (!isUnique) {
    referralCode = generateRandomString(length);
    const existingUser = await User.findOne({ referralCode: referralCode });
    if (!existingUser) {
      isUnique = true;
    }
    // Add a small delay or a counter to prevent infinite loops in extremely rare collision scenarios,
    // though with sufficient length and randomness, collisions are highly unlikely.
  }
  return referralCode;
};

module.exports = {
  generateUniqueReferralCode,
};
