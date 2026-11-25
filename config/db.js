const mongoose = require('mongoose');

let lastConnectionError = null;

/**
 * Connect to MongoDB Atlas using MONGODB_URI from environment variables.
 * Returns true if connected, false otherwise.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.includes('<username>') || uri.includes('<password>')) {
    lastConnectionError =
      'MONGODB_URI is not configured. Copy .env.example to .env and add your MongoDB Atlas connection string.';
    console.warn(`[DB] ${lastConnectionError}`);
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    lastConnectionError = null;
    console.log(`[DB] Connected to MongoDB Atlas (${mongoose.connection.name})`);
    return true;
  } catch (err) {
    lastConnectionError = err.message;
    console.error('[DB] MongoDB Atlas connection failed:', err.message);
    return false;
  }
}

function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

function getDBError() {
  return lastConnectionError;
}

module.exports = {
  connectDB,
  isDBConnected,
  getDBError,
};
