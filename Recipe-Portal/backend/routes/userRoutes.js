const router = require('express').Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// NEW - search people by username or display name (for the navbar search box).
// IMPORTANT: this must stay ABOVE `GET /:id`, otherwise Express treats
// "search" as an :id and this route never runs.
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    // Escape regex special chars so a typed "." or "(" is matched literally,
    // not interpreted as a pattern (a bare "." would otherwise match everyone).
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(safe, 'i');
    const users = await User.find({ $or: [{ username: rx }, { name: rx }] })
      .select('username name profilePic')
      .limit(10);
    res.json(users);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  res.json(user);
});

// NEW - edit your own profile (display name, username, bio)
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
      // must be unique across everyone except yourself
      const taken = await User.findOne({ username: u, _id: { $ne: req.userId } }).select('_id');
      if (taken) return res.status(409).json({ error: 'That username is already taken.' });
      update.username = u;
    }

    const user = await User.findByIdAndUpdate(
      req.userId, update, { new: true, runValidators: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// NEW - upload profile picture
router.post('/upload-avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const imagePath = `/uploads/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { profilePic: imagePath },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// NEW - follow / unfollow toggle
// If you already follow this user, this unfollows; otherwise it follows.
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
      // unfollow
      targetUser.followers = targetUser.followers.filter(
        (id) => id.toString() !== req.userId
      );
      currentUser.following = currentUser.following.filter(
        (id) => id.toString() !== req.params.id
      );
    } else {
      // follow
      targetUser.followers.push(currentUser._id);
      currentUser.following.push(targetUser._id);
    }

    await targetUser.save();
    await currentUser.save();

    res.json({
      following: !alreadyFollowing,                 // your new state toward this user
      followersCount: targetUser.followers.length,  // this profile's follower count
      followingCount: targetUser.following.length,  // this profile's following count
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// NEW - people who follow this user (for the Followers popup)
router.get('/:id/followers', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('followers', 'username name profilePic');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user.followers);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// NEW - people this user follows (for the Following popup)
router.get('/:id/following', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('following', 'username name profilePic');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user.following);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;