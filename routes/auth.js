const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const {
  requireAuth,
  signAuthToken,
  setAuthCookie,
  clearAuthCookie,
} = require('../middleware/auth');
const { seedUserDefaults } = require('../utils/seed');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name || name.length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    }
    if (name.length > 60) {
      return res.status(400).json({ error: 'Name cannot exceed 60 characters.' });
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'user',
      createdAt: Date.now(),
    });

    await seedUserDefaults(user._id, 'private');

    const token = signAuthToken(user._id);
    setAuthCookie(res, token);

    res.status(201).json({ user: user.toJSON() });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signAuthToken(user._id);
    setAuthCookie(res, token);

    res.json({ user: user.toJSON() });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/admin-login
router.post('/admin-login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Admin email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'This account does not have admin privileges.' });
    }

    const token = signAuthToken(user._id);
    setAuthCookie(res, token);

    res.json({ user: user.toJSON() });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
