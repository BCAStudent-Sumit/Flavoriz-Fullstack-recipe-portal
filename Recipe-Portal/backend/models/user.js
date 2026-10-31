const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, default: '' },        // display name (e.g. "Sumit Majumder")
  bio: { type: String, default: '' },
  profilePic: { type: String, default: '' },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  resetPasswordToken: { type: String },      // NEW
  resetPasswordExpires: { type: Date },       // NEW
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);