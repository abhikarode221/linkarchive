const jwt = require('jsonwebtoken');
const User = require('../models/User');

const COOKIE_NAME = 'links_token';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
let warnedMissingSecret = false;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'replace-with-a-long-random-secret') {
    if (!warnedMissingSecret) {
      console.warn('[Auth] JWT_SECRET is not set in .env; using temporary fallback secret.');
      warnedMissingSecret = true;
    }
    return 'dev-insecure-fallback-secret-change-in-env';
  }
  return secret;
}

function signAuthToken(userId) {
  return jwt.sign({ userId: String(userId) }, getJwtSecret(), { expiresIn: '7d' });
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: TOKEN_TTL_MS,
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

function extractToken(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({ error: 'Account no longer exists.' });
    }

    req.user = user.toJSON();
    next();
  } catch (err) {
    next(err);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  signAuthToken,
  setAuthCookie,
  clearAuthCookie,
};
