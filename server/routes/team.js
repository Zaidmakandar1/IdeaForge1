import express from 'express';
import Team from '../models/Team.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import auth from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

router.use(auth);

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

// Multer setup for file uploads
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

// Create a team
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, tags } = req.body;
    const team = new Team({
      name,
      description,
      tags,
      members: [{ user: req.userId, role: 'Lead' }],
      creator: req.userId
    });
    await team.save();
    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all teams (user is a member or discoverable)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const myTeams = await Team.find({ 'members.user': req.userId })
      .populate('members.user', 'name avatar')
      .populate('creator', 'name');
    const availableTeams = await Team.find({ 'members.user': { $ne: req.userId } })
      .populate('members.user', 'name avatar')
      .populate('creator', 'name');
    res.json({ myTeams, availableTeams });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Join a team
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (!team.members.some(m => m.user.toString() === req.userId)) {
      team.members.push({ user: req.userId, role: 'Member' });
      await team.save();
    }
    res.json(team);
  } catch (error) {
    console.error('Join team error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Leave a team
router.post('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    team.members = team.members.filter(m => m.user.toString() !== req.userId);
    await team.save();
    res.json({ message: 'Left team' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a team by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('members.user', 'name avatar')
      .populate('creator', 'name');
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update team chat message creation to support file uploads
router.post('/:id/chat', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    const chatMessage = {
      user: req.userId,
      message,
      timestamp: new Date()
    };
    team.chat.push(chatMessage);
    await team.save();
    await team.populate('chat.user', 'name avatar');
    res.json(team.chat);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update team info (only Lead)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    const isLead = team.members.some(m => m.user.toString() === req.userId && m.role === 'Lead');
    if (!isLead) return res.status(403).json({ message: 'Only team lead can update' });
    const { name, description, tags } = req.body;
    if (name) team.name = name;
    if (description) team.description = description;
    if (tags) team.tags = tags;
    await team.save();
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a team (only Lead)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    const isLead = team.members.some(m => m.user.toString() === req.userId && m.role === 'Lead');
    if (!isLead) return res.status(403).json({ message: 'Only team lead can delete' });
    await team.deleteOne();
    res.json({ message: 'Team deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove a member (Lead only)
router.post('/:id/remove-member', authenticateToken, async (req, res) => {
  const { userIdToRemove } = req.body;
  const team = await Team.findById(req.params.id);
  if (!team) return res.status(404).json({ message: 'Team not found' });
  const isLead = team.members.some(m => m.user.toString() === req.userId && m.role === 'Lead');
  if (!isLead) return res.status(403).json({ message: 'Only team lead can remove members' });
  // Prevent lead from removing themselves
  if (userIdToRemove === req.userId) return res.status(400).json({ message: 'Lead cannot remove themselves' });
  team.members = team.members.filter(m => m.user.toString() !== userIdToRemove);
  await team.save();
  res.json(team);
});

// User sends a join request to a team
router.post('/:id/request-join', authenticateToken, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (team.members.some(m => m.user.toString() === req.userId)) {
      return res.status(400).json({ message: 'Already a member' });
    }
    if (team.joinRequests.includes(req.userId)) {
      return res.status(400).json({ message: 'Request already sent' });
    }
    team.joinRequests.push(req.userId);
    await team.save();
    res.json({ message: 'Join request sent' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Lead fetches pending join requests
router.get('/:id/requests', authenticateToken, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id).populate('joinRequests', 'name email avatar');
    if (!team) return res.status(404).json({ message: 'Team not found' });
    const isLead = team.members.some(m => m.user.toString() === req.userId && m.role === 'Lead');
    if (!isLead) return res.status(403).json({ message: 'Only team lead can view requests' });
    res.json({ requests: team.joinRequests });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Lead accepts a join request
router.post('/:id/requests/:userId/accept', authenticateToken, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    const isLead = team.members.some(m => m.user.toString() === req.userId && m.role === 'Lead');
    if (!isLead) return res.status(403).json({ message: 'Only team lead can accept requests' });
    const userIdToAccept = req.params.userId;
    if (!team.joinRequests.includes(userIdToAccept)) {
      return res.status(400).json({ message: 'No such join request' });
    }
    team.members.push({ user: userIdToAccept, role: 'Member' });
    team.joinRequests = team.joinRequests.filter(id => id.toString() !== userIdToAccept);
    await team.save();
    res.json({ message: 'User added to team' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Lead rejects a join request
router.post('/:id/requests/:userId/reject', authenticateToken, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    const isLead = team.members.some(m => m.user.toString() === req.userId && m.role === 'Lead');
    if (!isLead) return res.status(403).json({ message: 'Only team lead can reject requests' });
    const userIdToReject = req.params.userId;
    if (!team.joinRequests.includes(userIdToReject)) {
      return res.status(400).json({ message: 'No such join request' });
    }
    team.joinRequests = team.joinRequests.filter(id => id.toString() !== userIdToReject);
    await team.save();
    res.json({ message: 'Join request rejected' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Utility endpoint: Generate invite codes for all teams missing one (admin only, for migration)
router.post('/generate-missing-invite-codes', authenticateToken, async (req, res) => {
  // Optionally, check if req.userId is an admin here
  try {
    const teams = await Team.find({ $or: [ { inviteCode: { $exists: false } }, { inviteCode: null } ] });
    let updated = 0;
    for (const team of teams) {
      team.inviteCode = null;
      await team.save();
      updated++;
    }
    res.json({ updated });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router; 