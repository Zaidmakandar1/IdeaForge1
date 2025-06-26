import express from 'express';
import auth from '../middleware/auth.js';
import Community from '../models/Community.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// GET /api/communities/featured
router.get('/featured', async (req, res) => {
  try {
    const featured = await Community.find({ featured: true });
    res.json({ featured });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/communities/my-communities
router.get('/my-communities', async (req, res) => {
  try {
    const myCommunities = await Community.find({ members: req.userId }).populate('creator', 'name');
    res.json({ myCommunities });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Proxy for /api/communities/trending/featured
router.get('/trending/featured', async (req, res) => {
  try {
    const trending = await Community.find({ trending: true });
    const featured = await Community.find({ featured: true });
    res.json({ trending, featured });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all communities (simple list)
router.get('/', async (req, res) => {
  try {
    const communities = await Community.find();
    res.json({ communities });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/communities/:id/leave
router.post('/:id/leave', async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    // Remove user from members array
    community.members = community.members.filter(
      (memberId) => memberId.toString() !== req.userId
    );
    await community.save();
    res.json({ message: 'Left community successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/communities/:id/join
router.post('/:id/join', async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    // Add user to members array if not already a member
    if (!community.members.includes(req.userId)) {
      community.members.push(req.userId);
      await community.save();
    }
    res.json({ message: 'Joined community successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/communities/:id
router.get('/:id', async (req, res) => {
  try {
    const community = await Community.findById(req.params.id)
      .populate('creator', 'name email')
      .populate('members', 'name avatar');
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    res.json(community);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/communities/:id/chat
router.get('/:id/chat', async (req, res) => {
  try {
    const community = await Community.findById(req.params.id).populate('chat.user', 'name avatar');
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    res.json(community.chat || []);
  } catch (error) {
    console.error('Error fetching community chat:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/communities/:id/chat
router.post('/:id/chat', async (req, res) => {
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
    console.error('Error posting community chat:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Your existing routes here
// ... existing code ...

export default router; 