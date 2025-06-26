import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import Idea from '../models/Idea.js';
import Team from '../models/Team.js';
import Community from '../models/Community.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.use(auth);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -__v');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, avatar, bio, location, website, social } = req.body;
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (avatar) user.avatar = avatar;
    if (bio) user.bio = bio;
    if (location) user.location = location;
    if (website) user.website = website;
    if (social) user.social = { ...user.social, ...social };

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const ideas = await Idea.countDocuments({ owner: userId });
    const teams = await Team.countDocuments({ 'members.user': userId });
    const communities = await Community.countDocuments({ members: userId });
    const followers = await User.findById(userId).select('followers').lean();
    const following = await User.findById(userId).select('following').lean();
    res.json({
      ideas,
      teams,
      communities,
      followers: followers?.followers?.length || 0,
      following: following?.following?.length || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Follow a user
router.post('/:id/follow', authenticateToken, async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.userId);
    if (!userToFollow || !currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!userToFollow.followers.includes(currentUser._id)) {
      userToFollow.followers.push(currentUser._id);
      await userToFollow.save();
    }
    if (!currentUser.following.includes(userToFollow._id)) {
      currentUser.following.push(userToFollow._id);
      await currentUser.save();
    }
    res.json({ message: 'Followed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Unfollow a user
router.post('/:id/unfollow', authenticateToken, async (req, res) => {
  try {
    const userToUnfollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.userId);
    if (!userToUnfollow || !currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    userToUnfollow.followers = userToUnfollow.followers.filter(f => f.toString() !== currentUser._id.toString());
    await userToUnfollow.save();
    currentUser.following = currentUser.following.filter(f => f.toString() !== userToUnfollow._id.toString());
    await currentUser.save();
    res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const users = await User.find().select('-password -__v');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 