// server/models/SocialPost.js
const mongoose = require('mongoose');

const SocialPostSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  text: {
    type: String,
    required: [true, "Post text cannot be empty."],
    minlength: [1, "Post text must be at least 1 character long."],
    maxlength: [280, "Post text cannot exceed 280 characters."],
    trim: true,
  }
}, { timestamps: true }); // timestamps: true adds createdAt and updatedAt automatically

module.exports = mongoose.model('SocialPost', SocialPostSchema);
