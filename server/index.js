import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import passport from 'passport';
import session from 'express-session';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Community from './models/Community.js';

// Load environment variables ONLY from server/.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import ideaRoutes from './routes/idea.js';
import teamRoutes from './routes/team.js';
import communitiesRoutes from './routes/communities.js';
import communityRoutes from './routes/community.js';
import commentRoutes from './routes/comment.js';
import notificationRoutes from './routes/notification.js';
import aiRoutes from './routes/ai.js';
import proxyRoutes from './routes/proxy.js';

const app = express();
const httpServer = createServer(app);

// CORS configuration
const allowedOrigins = ['http://localhost:8080', 'http://localhost:8081'];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Passport Google OAuth configuration
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      return done(null, profile);
    } catch (error) {
      return done(error, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ideas', ideaRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/communities', communitiesRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/proxy', proxyRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Online users tracking for community chat
const communityOnlineUsers = {};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected');

  // Join user's room for private updates
  const token = socket.handshake.auth.token;
  let userId = null;
  if (token) {
    try {
      const decoded = jwt.verify(token, 'your-jwt-secret');
      userId = decoded.userId;
      socket.join(`user:${userId}`);
    } catch (error) {
      console.error('Socket authentication error:', error);
    }
  }

  // Join community chat room
  socket.on('community:join', (communityId) => {
    socket.join(`community:${communityId}`);
    if (!communityOnlineUsers[communityId]) communityOnlineUsers[communityId] = new Set();
    if (userId) communityOnlineUsers[communityId].add(userId);
    // Broadcast updated online count
    io.to(`community:${communityId}`).emit('community:online', {
      communityId,
      onlineCount: communityOnlineUsers[communityId].size
    });
  });

  // Leave community chat room
  socket.on('community:leave', (communityId) => {
    socket.leave(`community:${communityId}`);
    if (communityOnlineUsers[communityId] && userId) {
      communityOnlineUsers[communityId].delete(userId);
      // Broadcast updated online count
      io.to(`community:${communityId}`).emit('community:online', {
        communityId,
        onlineCount: communityOnlineUsers[communityId].size
      });
    }
  });

  // Handle sending a message in community chat
  socket.on('community:send_message', async ({ communityId, message }) => {
    if (!userId || !communityId || !message || !message.trim()) return;
    try {
      const community = await Community.findById(communityId);
      if (!community) return;
      const chatMessage = {
        user: userId,
        message,
        timestamp: new Date()
      };
      community.chat.push(chatMessage);
      await community.save();
      await community.populate('chat.user', 'name avatar');
      // Emit the new message to all users in the community room
      io.to(`community:${communityId}`).emit('community:new_message', {
        ...chatMessage,
        user: {
          _id: userId,
          // Optionally add more user info if needed
        }
      });
    } catch (error) {
      console.error('Error in community:send_message:', error);
    }
  });

  // Typing indicator for community chat
  socket.on('community:typing', ({ communityId, userName }) => {
    if (!communityId || !userName) return;
    socket.to(`community:${communityId}`).emit('community:typing', { communityId, userName });
  });

  // Handle reacting to a message in community chat
  socket.on('community:react_message', async ({ communityId, messageId, emoji }) => {
    if (!userId || !communityId || !messageId || !emoji) return;
    try {
      const community = await Community.findById(communityId);
      if (!community) return;
      // Find the message
      const msg = community.chat.id(messageId);
      if (!msg) return;
      // Remove previous reaction by this user for this emoji (toggle)
      msg.reactions = msg.reactions.filter(r => !(r.user.toString() === userId && r.emoji === emoji));
      // Add new reaction
      msg.reactions.push({ emoji, user: userId });
      await community.save();
      await community.populate('chat.user', 'name avatar');
      // Broadcast the updated message to all users in the community room
      io.to(`community:${communityId}`).emit('community:update_message', {
        messageId,
        reactions: msg.reactions
      });
    } catch (error) {
      console.error('Error in community:react_message:', error);
    }
  });

  // On disconnect, remove user from all rooms
  socket.on('disconnect', () => {
    for (const communityId in communityOnlineUsers) {
      if (communityOnlineUsers[communityId].has(userId)) {
        communityOnlineUsers[communityId].delete(userId);
        io.to(`community:${communityId}`).emit('community:online', {
          communityId,
          onlineCount: communityOnlineUsers[communityId].size
        });
      }
    }
    console.log('User disconnected');
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Start server
const PORT = 5050;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

if (!process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set in .env. Using default secret. This is insecure for production!');
  process.env.JWT_SECRET = 'your-jwt-secret';
}

app.use('/uploads', express.static('uploads'));