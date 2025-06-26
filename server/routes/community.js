import express from 'express';
import Community from '../models/Community.js';
import Post from '../models/Post.js';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Create a community
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, coverImage, tags } = req.body;
    const community = new Community({
      name,
      description,
      coverImage,
      tags,
      members: [req.userId],
      moderators: [req.userId],
      creator: req.userId
    });
    await community.save();
    res.status(201).json(community);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all communities (user's and discoverable)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const myCommunities = await Community.find({ members: req.userId });
    const discoverable = await Community.find({ members: { $ne: req.userId } });
    res.json({ myCommunities, discoverable });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Join a community
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ message: 'Community not found' });
    if (!community.members.includes(req.userId)) {
      community.members.push(req.userId);
      await community.save();
    }
    res.json(community);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave a community
router.post('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ message: 'Community not found' });
    community.members = community.members.filter(m => m.toString() !== req.userId);
    await community.save();
    res.json({ message: 'Left community' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a community by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id).populate('members', 'name avatar');
    if (!community) return res.status(404).json({ message: 'Community not found' });
    res.json(community);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a post in a community (with image upload)
router.post('/:id/posts', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { title, content } = req.body;
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ message: 'Community not found' });
    let imageUrl = undefined;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }
    const post = new Post({
      title,
      content,
      author: req.userId,
      community: community._id,
      image: imageUrl
    });
    await post.save();
    community.posts.push(post._id);
    await community.save();
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get posts in a community
router.get('/:id/posts', authenticateToken, async (req, res) => {
  try {
    const posts = await Post.find({ community: req.params.id }).populate('author', 'name avatar');
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a community (only moderator)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ message: 'Community not found' });
    if (!community.moderators.includes(req.userId)) return res.status(403).json({ message: 'Only moderators can update' });
    const { name, description, coverImage, tags, trending, featured } = req.body;
    if (name) community.name = name;
    if (description) community.description = description;
    if (coverImage) community.coverImage = coverImage;
    if (tags) community.tags = tags;
    if (trending !== undefined) community.trending = trending;
    if (featured !== undefined) community.featured = featured;
    await community.save();
    res.json(community);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a community (only moderator)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ message: 'Community not found' });
    if (!community.moderators.includes(req.userId)) return res.status(403).json({ message: 'Only moderators can delete' });
    await community.deleteOne();
    res.json({ message: 'Community deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get trending/featured communities
router.get('/trending/featured', authenticateToken, async (req, res) => {
  try {
    const trending = await Community.find({ trending: true });
    const featured = await Community.find({ featured: true });
    res.json({ trending, featured });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/communities/discover
router.get('/discover', authenticateToken, async (req, res) => {
  try {
    const discoverable = await Community.find({ members: { $ne: req.userId } });
    res.json({ discoverable });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/posts/trending
router.get('/posts/trending', authenticateToken, async (req, res) => {
  try {
    const trendingPosts = await Post.find().sort({ likes: -1 }).limit(10).populate('author', 'name avatar');
    res.json({ trending: trendingPosts });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update community chat message creation to support file uploads
router.post('/:id/chat', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ message: 'Community not found' });
    const chatMessage = {
      user: req.userId,
      message,
      timestamp: new Date()
    };
    community.chat.push(chatMessage);
    await community.save();
    await community.populate('chat.user', 'name avatar');
    res.json(community.chat);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Test route for router registration
router.get('/test-route', (req, res) => res.json({ ok: true }));

export default router; 