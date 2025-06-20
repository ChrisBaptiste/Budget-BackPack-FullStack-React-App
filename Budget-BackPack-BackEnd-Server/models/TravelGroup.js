// server/models/TravelGroup.js
const mongoose = require('mongoose');

const TravelGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Group name is required."],
    trim: true,
    maxlength: [100, "Group name cannot exceed 100 characters."],
    unique: true, // Ensuring group names are unique
  },
  description: {
    type: String,
    maxlength: [500, "Description cannot exceed 500 characters."],
    default: '',
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
      _id: false // Do not create a separate _id for subdocuments in the array
    }
  ],
  isPublic: {
    type: Boolean,
    default: true,
  },
  coverImageUrl: {
    type: String,
    default: '/Images/default-group-cover.png', // Default path for group cover image
  }
}, { timestamps: true }); // Adds createdAt and updatedAt timestamps

// Index for searching by name
TravelGroupSchema.index({ name: 'text' });
TravelGroupSchema.index({ creator: 1 });

module.exports = mongoose.model('TravelGroup', TravelGroupSchema);
