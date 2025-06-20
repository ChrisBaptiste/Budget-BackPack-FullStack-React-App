// server/routes/socialPostRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const SocialPost = require('../models/SocialPost');
const User = require('../models/User'); // Needed for populating user info

// POST /api/posts - Create a new social post
router.post('/', protect, async (req, res) => {
  const { text } = req.body;
  const userId = req.user.id;

  if (!text || text.trim() === '') {
    return res.status(400).json({ errors: [{ msg: 'Post text cannot be empty.' }] });
  }
  if (text.length > 280) {
    return res.status(400).json({ errors: [{ msg: 'Post text cannot exceed 280 characters.'}] });
  }

  try {
    const newPost = new SocialPost({
      userId,
      text,
    });
    const post = await newPost.save();
    // Populate user info before sending back
    const populatedPost = await SocialPost.findById(post._id).populate('userId', 'username profilePictureUrl');
    res.status(201).json(populatedPost);
  } catch (error) {
    console.error('Error creating social post:', error);
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ errors: messages.map(msg => ({ msg })) });
    }
    res.status(500).json({ msg: 'Server error while creating post.' });
  }
});

// GET /api/posts - Fetch all social posts (paginated)
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const posts = await SocialPost.find()
      .populate('userId', 'username profilePictureUrl') // Populate author's username and profile pic
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit);

    const totalPosts = await SocialPost.countDocuments();
    const totalPages = Math.ceil(totalPosts / limit);

    res.json({
        posts,
        currentPage: page,
        totalPages,
        totalPosts
    });
  } catch (error) {
    console.error('Error fetching all social posts:', error);
    res.status(500).json({ msg: 'Server error while fetching posts.' });
  }
});

// GET /api/posts/user/:userId - Fetch posts by a specific user (paginated)
router.get('/user/:userId', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const { userId } = req.params;

  try {
    // Check if user exists to provide better error message
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ msg: 'User not found.' });
    }

    const posts = await SocialPost.find({ userId: userId })
      .populate('userId', 'username profilePictureUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await SocialPost.countDocuments({ userId: userId });
    const totalPages = Math.ceil(totalPosts / limit);

    res.json({
        posts,
        currentPage: page,
        totalPages,
        totalPosts
    });
  } catch (error)
 {
    console.error(`Error fetching posts for user ${userId}:`, error);
    if (error.name === 'CastError') {
        return res.status(400).json({ msg: 'Invalid user ID format.' });
    }
    res.status(500).json({ msg: 'Server error while fetching user posts.' });
  }
});

// PUT /api/posts/:postId - Update a post
router.put('/:postId', protect, async (req, res) => {
  const { text } = req.body;
  const { postId } = req.params;
  const userId = req.user.id;

  if (!text || text.trim() === '') {
    return res.status(400).json({ errors: [{ msg: 'Post text cannot be empty.' }] });
  }
   if (text.length > 280) {
    return res.status(400).json({ errors: [{ msg: 'Post text cannot exceed 280 characters.'}] });
  }

  try {
    const post = await SocialPost.findById(postId);
    if (!post) {
      return res.status(404).json({ msg: 'Post not found.' });
    }

    if (post.userId.toString() !== userId) {
      return res.status(401).json({ msg: 'User not authorized to update this post.' });
    }

    post.text = text;
    // post.updatedAt = Date.now(); // Handled by timestamps:true
    await post.save();

    const populatedPost = await SocialPost.findById(post._id).populate('userId', 'username profilePictureUrl');
    res.json(populatedPost);

  } catch (error) {
    console.error(`Error updating post ${postId}:`, error);
     if (error.name === 'CastError') {
        return res.status(400).json({ msg: 'Invalid post ID format.' });
    }
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ errors: messages.map(msg => ({ msg })) });
    }
    res.status(500).json({ msg: 'Server error while updating post.' });
  }
});

// DELETE /api/posts/:postId - Delete a post
router.delete('/:postId', protect, async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;

  try {
    const post = await SocialPost.findById(postId);
    if (!post) {
      return res.status(404).json({ msg: 'Post not found.' });
    }

    if (post.userId.toString() !== userId) {
      return res.status(401).json({ msg: 'User not authorized to delete this post.' });
    }

    await SocialPost.findByIdAndDelete(postId); // Corrected method
    res.json({ msg: 'Post deleted successfully.' });

  } catch (error) {
    console.error(`Error deleting post ${postId}:`, error);
    if (error.name === 'CastError') {
        return res.status(400).json({ msg: 'Invalid post ID format.' });
    }
    res.status(500).json({ msg: 'Server error while deleting post.' });
  }
});

module.exports = router;
