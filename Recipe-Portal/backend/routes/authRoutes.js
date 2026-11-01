const crypto = require('crypto');
const nodemailer = require('nodemailer');
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validation/schemas');

// Apply auth rate limiter to all authentication routes to protect against brute force and email-flooding
router.use(authLimiter);

// SIGNUP
router.post('/signup', validate({ body: signupSchema }), async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    }).lean();

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      return res.status(409).json({ error: 'Username is already taken.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// LOGIN (Supports login with Email OR Username)
router.post('/login', validate({ body: loginSchema }), async (req, res) => {
  try {
    const { email, password } = req.body;
    const identifier = (email || '').trim();

    // Match either email or username (case-insensitive)
    const safeIdentifier = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(`^${safeIdentifier}$`, 'i');

    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { username: rx }],
    });

    if (!user) return res.status(400).json({ error: 'Invalid email/username or password.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid email/username or password.' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set up email sender (only used if EMAIL_USER/EMAIL_PASS are configured)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// REQUEST a password reset
router.post('/forgot-password', validate({ body: forgotPasswordSchema }), async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always respond the same way to prevent user enumeration
    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5000';
    const resetLink = `${clientUrl.replace(/\/$/, '')}/reset-password.html?token=${rawToken}`;

    console.log('[Password Reset] Link:', resetLink);

    let emailSent = false;
    try {
      if (
        process.env.EMAIL_USER &&
        process.env.EMAIL_PASS &&
        process.env.EMAIL_USER !== 'youraddress@gmail.com'
      ) {
        await transporter.sendMail({
          from: `"Flavoriz" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: 'Reset your Flavoriz password',
          html: `<p>Click below to reset your password. This link expires in 1 hour.</p>
                 <p><a href="${resetLink}">${resetLink}</a></p>`,
        });
        emailSent = true;
      }
    } catch (emailErr) {
      console.log('Email delivery skipped/failed:', emailErr.message);
    }

    res.json({
      message: 'If that email exists, a reset link has been sent.',
      // Provide direct link when email provider is not yet configured or fails
      ...(!emailSent ? { resetLink } : {}),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SUBMIT a new password using token
router.post('/reset-password/:token', validate({ body: resetPasswordSchema }), async (req, res) => {
  try {
    const { password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired.' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
