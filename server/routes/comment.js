import express from 'express';
import Comment from '../models/Comment.js';
import Idea from '../models/Idea.js';
import Post from '../models/Post.js';
import jwt from 'jsonwebtoken';
import auth from '../middleware/auth.js';

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

// Add a comment to an idea or post
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content, ideaId, postId } = req.body;
    if (!content || (!ideaId && !postId)) {
      return res.status(400).json({ message: 'Content and ideaId or postId required' });
    }
    const comment = new Comment({
      content,
      author: req.userId,
      idea: ideaId,
      post: postId
    });
    await comment.save();
    if (ideaId) await Idea.findByIdAndUpdate(ideaId, { $push: { comments: comment._id } });
    if (postId) await Post.findByIdAndUpdate(postId, { $push: { comments: comment._id } });
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Edit a comment
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.author.toString() !== req.userId) return res.status(403).json({ message: 'Not authorized' });
    comment.content = req.body.content;
    await comment.save();
    res.json(comment);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a comment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.author.toString() !== req.userId) return res.status(403).json({ message: 'Not authorized' });
    await comment.deleteOne();
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// List comments for an idea
router.get('/idea/:ideaId', authenticateToken, async (req, res) => {
  try {
    const comments = await Comment.find({ idea: req.params.ideaId }).populate('author', 'name avatar');
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// List comments for a post
router.get('/post/:postId', authenticateToken, async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId }).populate('author', 'name avatar');
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 