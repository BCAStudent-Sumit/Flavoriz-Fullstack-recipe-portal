const router = require('express').Router();
const User = require('../models/user');
const auth = require('../middleware/auth');
const { upload, optimizeAndStore } = require('../middleware/upload');

// Search people by username or display name
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(safe, 'i');
    const users = await User.find({ $or: [{ username: rx }, { name: rx }] })
      .select('username name profilePic')
      .limit(10)
      .lean();
    res.json(users);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get user profile by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: 'Invalid user ID' });
  }
});

// Edit personal profile (display name, username, bio)
router.put('/me', auth, async (req, res) => {
  try {
    const { name, bio, username } = req.body || {};
    const update = {};

    if (typeof name === 'string') update.name = name.trim().slice(0, 50);
    if (typeof bio === 'string')  update.bio  = bio.trim().slice(0, 300);

    if (typeof username === 'string') {
      const u = username.trim();
      if (u.length < 3 || u.length > 30)
        return res.status(400).json({ error: 'Username must be 3–30 characters.' });
      if (!/^[a-zA-Z0-9._]+$/.test(u))
        return res.status(400).json({ error: 'Username can only use letters, numbers, dots and underscores.' });

      // Unique username check
      const taken = await User.findOne({ username: u, _id: { $ne: req.userId } }).select('_id').lean();
      if (taken) return res.status(409).json({ error: 'That username is already taken.' });
      update.username = u;
    }

    const user = await User.findByIdAndUpdate(
      req.userId, update, { new: true, runValidators: true }
    ).select('-password').lean();

    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Upload profile picture with Sharp compression and Cloudinary support
router.post('/upload-avatar', auth, upload.single('avatar'), optimizeAndStore, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const imagePath = req.file.location || req.file.path;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { profilePic: imagePath },
      { new: true }
    ).select('-password').lean();

    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Follow / Unfollow toggle
router.post('/:id/follow', auth, async (req, res) => {
  try {
    if (req.params.id === req.userId)
      return res.status(400).json({ error: "You can't follow yourself." });

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'User not found.' });
    const currentUser = await User.findById(req.userId);

    const alreadyFollowing = targetUser.followers.some(
      (id) => id.toString() === req.userId
    );

    if (alreadyFollowing) {
      targetUser.followers = targetUser.followers.filter(
        (id) => id.toString() !== req.userId
      );
      currentUser.following = currentUser.following.filter(
        (id) => id.toString() !== req.params.id
      );
    } else {
      targetUser.followers.push(currentUser._id);
      currentUser.following.push(targetUser._id);
    }

    await targetUser.save();
    await currentUser.save();

    res.json({
      following: !alreadyFollowing,
      followersCount: targetUser.followers.length,
      followingCount: targetUser.following.length,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Followers list
router.get('/:id/followers', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('followers', 'username name profilePic')
      .lean();
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user.followers);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Following list
router.get('/:id/following', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('following', 'username name profilePic')
      .lean();
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user.following);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
