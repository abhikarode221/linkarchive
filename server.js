require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { connectDB, isDBConnected, getDBError } = require('./config/db');
const { requireAuth } = require('./middleware/auth');
const { ensureCleanIndexes, ensureAdminUser } = require('./utils/seed');
const authRouter = require('./routes/auth');
const publicRouter = require('./routes/public');
const linksRouter = require('./routes/links');
const categoriesRouter = require('./routes/categories');
const backupRouter = require('./routes/backup');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  const connected = isDBConnected();
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'degraded',
    db: connected ? 'connected' : 'disconnected',
    error: connected ? null : getDBError(),
  });
});

// Ensure MongoDB Atlas is connected before handling data/auth routes
app.use('/api', (_req, res, next) => {
  if (!isDBConnected()) {
    return res.status(503).json({
      error: 'Database is not connected. Check MONGODB_URI in your .env file.',
      details: getDBError(),
    });
  }
  next();
});

// Public Home Feed & Auth Routes
app.use('/api/public', publicRouter);
app.use('/api/auth', authRouter);

// Protected API Routes
app.use('/api/links', requireAuth, linksRouter);
app.use('/api/categories', requireAuth, categoriesRouter);
app.use('/api/backup', requireAuth, backupRouter);

// Serve static frontend files
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Fallback to index.html for non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found.' });
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[API Error]', err);
  if (err.name === 'ValidationError') {
    const firstMsg = Object.values(err.errors)[0]?.message || 'Validation failed.';
    return res.status(400).json({ error: firstMsg });
  }
  res.status(500).json({ error: 'Internal server error.' });
});

async function startServer() {
  const connected = await connectDB();
  if (connected) {
    try {
      await ensureCleanIndexes();
      await ensureAdminUser();
    } catch (err) {
      console.error('[DB] Error initializing database:', err);
    }
  }

  app.listen(PORT, () => {
    console.log(`[Server] Links app running at http://localhost:${PORT}`);
  });
}

startServer();
