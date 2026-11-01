const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, default: '', trim: true },        // display name
  bio: { type: String, default: '', trim: true },
  profilePic: { type: String, default: '' },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Bookmarks & Favorites collection
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }],

  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
}, { timestamps: true });

// Additional Performance Index
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
