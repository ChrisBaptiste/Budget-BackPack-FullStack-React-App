// server/routes/groupRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const TravelGroup = require('../models/TravelGroup');
const User = require('../models/User'); // For populating creator/member info

// POST /api/groups - Create a new travel group
router.post('/', protect, async (req, res) => {
  const { name, description, isPublic, coverImageUrl } = req.body;
  const creatorId = req.user.id;

  if (!name || name.trim() === '') {
    return res.status(400).json({ errors: [{ msg: 'Group name is required.' }] });
  }

  try {
    // Check if group name already exists
    let existingGroup = await TravelGroup.findOne({ name: name.trim() });
    if (existingGroup) {
      return res.status(400).json({ errors: [{ msg: 'A group with this name already exists.' }] });
    }

    const newGroup = new TravelGroup({
      name: name.trim(),
      description: description || '',
      creator: creatorId,
      members: [{ user: creatorId }], // Creator is automatically a member
      isPublic: isPublic !== undefined ? isPublic : true, // Default to true if not specified
      coverImageUrl: coverImageUrl || '/Images/default-group-cover.png',
    });

    const group = await newGroup.save();
    // Populate creator info for the response
    const populatedGroup = await TravelGroup.findById(group._id).populate('creator', 'username profilePictureUrl');
    res.status(201).json(populatedGroup);

  } catch (error) {
    console.error('Error creating travel group:', error);
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ errors: messages.map(msg => ({ msg })) });
    }
    res.status(500).json({ msg: 'Server error while creating group.' });
  }
});

// GET /api/groups - Fetch all travel groups (paginated)
// For now, fetches all groups. Filtering (e.g., only public for non-auth users) can be added later.
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const groups = await TravelGroup.find() // Add filter criteria here if needed, e.g., { isPublic: true }
      .populate('creator', 'username profilePictureUrl') // Populate creator's username and profile pic
      .sort({ createdAt: -1 }) // Newest groups first
      .skip(skip)
      .limit(limit);

    const totalGroups = await TravelGroup.countDocuments(); // Adjust count based on filter if added
    const totalPages = Math.ceil(totalGroups / limit);

    res.json({
      groups,
      currentPage: page,
      totalPages,
      totalGroups,
    });
  } catch (error) {
    console.error('Error fetching all travel groups:', error);
    res.status(500).json({ msg: 'Server error while fetching groups.' });
  }
});

// GET /api/groups/:groupId - Fetch details for a specific group
router.get('/:groupId', async (req, res) => {
  const { groupId } = req.params;

  try {
    const group = await TravelGroup.findById(groupId)
      .populate('creator', 'username profilePictureUrl')
      .populate('members.user', 'username profilePictureUrl'); // Populate user info for each member

    if (!group) {
      return res.status(404).json({ msg: 'Group not found.' });
    }

    // Optional: Add check here if group is private and user is not a member / not authenticated
    // if (!group.isPublic && (!req.user || !group.members.some(member => member.user._id.equals(req.user.id)))) {
    //   return res.status(403).json({ msg: 'Access denied. This group is private.' });
    // }

    res.json(group);
  } catch (error) {
    console.error(`Error fetching group ${groupId}:`, error);
    if (error.name === 'CastError') {
      return res.status(400).json({ msg: 'Invalid group ID format.' });
    }
    res.status(500).json({ msg: 'Server error while fetching group details.' });
  }
});

// GET /api/groups/user/:userId - Fetch groups created by a specific user
router.get('/user/:userId', async (req, res) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const userExists = await User.findById(userId);
        if (!userExists) {
            return res.status(404).json({ msg: 'User not found.' });
        }

        const groups = await TravelGroup.find({ creator: userId })
            .populate('creator', 'username profilePictureUrl')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalGroups = await TravelGroup.countDocuments({ creator: userId });
        const totalPages = Math.ceil(totalGroups / limit);

        res.json({
            groups,
            currentPage: page,
            totalPages,
            totalGroups
        });
    } catch (error) {
        console.error(`Error fetching groups for user ${userId}:`, error);
        if (error.name === 'CastError') {
            return res.status(400).json({ msg: 'Invalid user ID format.' });
        }
        res.status(500).json({ msg: 'Server error while fetching user\'s groups.' });
    }
});


// PUT /api/groups/:groupId - Update a group (only for group creator)
router.put('/:groupId', protect, async (req, res) => {
    const { groupId } = req.params;
    const { name, description, isPublic, coverImageUrl } = req.body;
    const userId = req.user.id;

    try {
        let group = await TravelGroup.findById(groupId);
        if (!group) {
            return res.status(404).json({ msg: 'Group not found.' });
        }

        if (group.creator.toString() !== userId) {
            return res.status(403).json({ msg: 'User not authorized to update this group.' });
        }

        // Validate name uniqueness if it's being changed
        if (name && name.trim() !== group.name) {
            const existingGroup = await TravelGroup.findOne({ name: name.trim() });
            if (existingGroup) {
                return res.status(400).json({ errors: [{ msg: 'A group with this name already exists.' }] });
            }
            group.name = name.trim();
        }

        if (description !== undefined) group.description = description;
        if (isPublic !== undefined) group.isPublic = isPublic;
        if (coverImageUrl !== undefined) group.coverImageUrl = coverImageUrl;

        await group.save();
        // Populate creator info for the response
        const populatedGroup = await TravelGroup.findById(group._id).populate('creator', 'username profilePictureUrl');
        res.json(populatedGroup);

    } catch (error) {
        console.error(`Error updating group ${groupId}:`, error);
        if (error.name === 'CastError') {
            return res.status(400).json({ msg: 'Invalid group ID format.' });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ errors: messages.map(msg => ({ msg })) });
        }
        res.status(500).json({ msg: 'Server error while updating group.' });
    }
});

// DELETE /api/groups/:groupId - Delete a group (only for group creator)
router.delete('/:groupId', protect, async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.id;

    try {
        const group = await TravelGroup.findById(groupId);
        if (!group) {
            return res.status(404).json({ msg: 'Group not found.' });
        }

        if (group.creator.toString() !== userId) {
            return res.status(403).json({ msg: 'User not authorized to delete this group.' });
        }

        await TravelGroup.findByIdAndDelete(groupId);
        res.json({ msg: 'Group deleted successfully.' });

    } catch (error) {
        console.error(`Error deleting group ${groupId}:`, error);
        if (error.name === 'CastError') {
            return res.status(400).json({ msg: 'Invalid group ID format.' });
        }
        res.status(500).json({ msg: 'Server error while deleting group.' });
    }
});

// POST /api/groups/:groupId/join - Join a group
router.post('/:groupId/join', protect, async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.id;

    try {
        const group = await TravelGroup.findById(groupId);
        if (!group) {
            return res.status(404).json({ msg: 'Group not found.' });
        }

        // Optional: Check if group is private and if user has an invitation (not implemented yet)
        // if (!group.isPublic) { /* ... additional logic for private groups ... */ }

        const isAlreadyMember = group.members.some(member => member.user.equals(userId));
        if (isAlreadyMember) {
            return res.status(400).json({ msg: 'User is already a member of this group.' });
        }

        group.members.push({ user: userId });
        await group.save();

        // Return the updated members list or the whole group
        const updatedGroup = await TravelGroup.findById(groupId).populate('members.user', 'username profilePictureUrl');
        res.json(updatedGroup.members);

    } catch (error) {
        console.error(`Error joining group ${groupId}:`, error);
        if (error.name === 'CastError') {
            return res.status(400).json({ msg: 'Invalid group ID format.' });
        }
        res.status(500).json({ msg: 'Server error while joining group.' });
    }
});

// POST /api/groups/:groupId/leave - Leave a group
router.post('/:groupId/leave', protect, async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.id;

    try {
        const group = await TravelGroup.findById(groupId);
        if (!group) {
            return res.status(404).json({ msg: 'Group not found.' });
        }

        if (group.creator.equals(userId)) {
            return res.status(400).json({ msg: 'Creator cannot leave the group. You can delete the group instead.' });
        }

        const initialMemberCount = group.members.length;
        group.members = group.members.filter(member => !member.user.equals(userId));

        if (group.members.length === initialMemberCount) {
            return res.status(400).json({ msg: 'User is not a member of this group.' });
        }

        await group.save();
        res.json({ msg: 'Successfully left the group.' });

    } catch (error) {
        console.error(`Error leaving group ${groupId}:`, error);
        if (error.name === 'CastError') {
            return res.status(400).json({ msg: 'Invalid group ID format.' });
        }
        res.status(500).json({ msg: 'Server error while leaving group.' });
    }
});

module.exports = router;
