import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['Lead', 'Member', 'Advisor', 'Co-founder', 'Designer', 'Developer', 'Marketing', 'Engineer', 'Other'], default: 'Member' }
  }],
  tags: [{ type: String }],
  chat: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  joinRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

teamSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Team = mongoose.model('Team', teamSchema);
export default Team; 