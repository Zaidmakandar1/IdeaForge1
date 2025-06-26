import express from 'express';
import Idea from '../models/Idea.js';
import jwt from 'jsonwebtoken';
import auth from '../middleware/auth.js';
import axios from 'axios';

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

// Get all ideas for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const ideas = await Idea.find({
      $or: [
        { owner: req.userId },
        { collaborators: req.userId }
      ]
    }).populate('owner', 'name email picture')
      .populate('collaborators', 'name email picture')
      .sort({ updatedAt: -1 });

    res.json(ideas);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new idea
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, tags } = req.body;
    
    const idea = new Idea({
      title,
      description,
      category,
      tags,
      owner: req.userId
    });

    await idea.save();
    
    const populatedIdea = await idea.populate('owner', 'name email picture');
    res.status(201).json(populatedIdea);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update an idea
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id);
    
    if (!idea) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    if (idea.owner.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, description, status, category, tags } = req.body;
    
    if (title) idea.title = title;
    if (description) idea.description = description;
    if (status) idea.status = status;
    if (category) idea.category = category;
    if (tags) idea.tags = tags;

    await idea.save();
    
    const updatedIdea = await idea.populate('owner', 'name email picture')
      .populate('collaborators', 'name email picture');
    
    res.json(updatedIdea);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete an idea
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id);
    
    if (!idea) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    if (idea.owner.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await idea.deleteOne();
    res.json({ message: 'Idea deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add collaborator to an idea
router.post('/:id/collaborators', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.body;
    const idea = await Idea.findById(req.params.id);
    
    if (!idea) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    if (idea.owner.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!idea.collaborators.includes(userId)) {
      idea.collaborators.push(userId);
      await idea.save();
    }

    const updatedIdea = await idea.populate('owner', 'name email picture')
      .populate('collaborators', 'name email picture');
    
    res.json(updatedIdea);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate idea using Llama 3.2
router.post('/generate', auth, async (req, res) => {
  try {
    const { prompt } = req.body;
    const llamaRes = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3',
      prompt: prompt || 'Generate a new innovative idea for a tech startup.',
      stream: false
    });
    const generated = llamaRes.data.response || llamaRes.data.choices?.[0]?.text || '';
    res.json({ idea: generated });
  } catch (error) {
    console.error('Llama 3.2 generation error:', error?.response?.data || error.message);
    res.status(500).json({ message: 'Failed to generate idea', error: error.message });
  }
});

// Get a single idea by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id)
      .populate('owner', 'name email picture')
      .populate('collaborators', 'name email picture');
    if (!idea) {
      return res.status(404).json({ message: 'Idea not found' });
    }
    res.json(idea);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Like an idea
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id);
    if (!idea) return res.status(404).json({ message: 'Idea not found' });
    if (!idea.likes) idea.likes = [];
    if (!idea.likes.includes(req.userId)) {
      idea.likes.push(req.userId);
      await idea.save();
    }
    res.json({ likes: idea.likes.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Unlike an idea
router.post('/:id/unlike', authenticateToken, async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id);
    if (!idea) return res.status(404).json({ message: 'Idea not found' });
    if (!idea.likes) idea.likes = [];
    idea.likes = idea.likes.filter(uid => uid.toString() !== req.userId);
    await idea.save();
    res.json({ likes: idea.likes.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 