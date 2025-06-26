import mongoose from 'mongoose';

const communitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  coverImage: { type: String },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  tags: [{ type: String }],
  trending: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  joinRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  chat: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      message: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      reactions: [
        {
          emoji: { type: String, required: true },
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        }
      ]
    }
  ]
});

communitySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Community = mongoose.model('Community', communitySchema);
export default Community; 