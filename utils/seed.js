const bcrypt = require('bcryptjs');
const Link = require('../models/Link');
const Category = require('../models/Category');
const User = require('../models/User');

const DEFAULT_CATEGORIES = ['Important', 'Tech', 'Business'];

function getSampleLinks(userId, visibility = 'private') {
  const now = Date.now();
  return [
    {
      userId,
      title: 'MDN Web Docs',
      url: 'https://developer.mozilla.org',
      category: 'Important',
      description: 'Definitive documentation and learning resources for modern web development and APIs.',
      tags: ['web', 'reference', 'javascript'],
      favorite: true,
      visibility,
      visits: 12,
      createdAt: now - 1000 * 60 * 60 * 24 * 4,
    },
    {
      userId,
      title: 'GitHub',
      url: 'https://github.com',
      category: 'Tech',
      description: 'Platform to build, maintain, and collaborate on software and Git repositories.',
      tags: ['git', 'code', 'open-source'],
      favorite: true,
      visibility,
      visits: 25,
      createdAt: now - 1000 * 60 * 60 * 24 * 3,
    },
    {
      userId,
      title: 'Harvard Business Review',
      url: 'https://hbr.org',
      category: 'Business',
      description: 'Articles and research on management strategy, leadership, and operational excellence.',
      tags: ['strategy', 'management', 'leadership'],
      favorite: false,
      visibility,
      visits: 6,
      createdAt: now - 1000 * 60 * 60 * 24 * 2,
    },
    {
      userId,
      title: 'Stripe Documentation',
      url: 'https://stripe.com/docs',
      category: 'Tech',
      description: 'Comprehensive guides and APIs for integrating internet payment infrastructure.',
      tags: ['api', 'payment', 'dev'],
      favorite: false,
      visibility,
      visits: 9,
      createdAt: now - 1000 * 60 * 60 * 24 * 1,
    },
    {
      userId,
      title: 'Forbes',
      url: 'https://www.forbes.com',
      category: 'Business',
      description: 'Business news, financial markets, and entrepreneurship insights.',
      tags: ['finance', 'markets', 'news'],
      favorite: false,
      visibility,
      visits: 4,
      createdAt: now - 1000 * 60 * 60 * 12,
    },
    {
      userId,
      title: 'Notion Workspace',
      url: 'https://www.notion.so',
      category: 'Important',
      description: 'All-in-one workspace for notes, lecture tracking, and project organization.',
      tags: ['notes', 'productivity', 'study'],
      favorite: true,
      visibility,
      visits: 18,
      createdAt: now - 1000 * 60 * 60 * 6,
    },
  ];
}

/**
 * Drops legacy single-tenant unique index on categories.nameLower if present,
 * cleans up legacy unowned documents, and syncs compound indexes.
 */
async function ensureCleanIndexes() {
  try {
    const indexes = await Category.collection.indexes();
    const legacyIdx = indexes.find((idx) => idx.name === 'nameLower_1');
    if (legacyIdx) {
      await Category.collection.dropIndex('nameLower_1');
      console.log('[DB] Dropped legacy categories.nameLower_1 index');
    }
  } catch (err) {
    if (err.codeName !== 'NamespaceNotFound') {
      console.warn('[DB] Index check note:', err.message);
    }
  }
  await Promise.all([
    Link.deleteMany({ userId: { $exists: false } }),
    Category.deleteMany({ userId: { $exists: false } }),
    Category.syncIndexes(),
    Link.syncIndexes(),
  ]);
}

/**
 * Ensures a category exists for a specific user (case-insensitive).
 */
async function ensureCategory(userId, name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;
  const nameLower = trimmed.toLowerCase();
  const existing = await Category.findOne({ userId, nameLower });
  if (existing) return existing;
  return Category.create({ userId, name: trimmed, nameLower });
}

/**
 * Seeds default categories and starter links for a user.
 */
async function seedUserDefaults(userId, visibility = 'private') {
  const catDocs = DEFAULT_CATEGORIES.map((name, idx) => ({
    userId,
    name,
    nameLower: name.toLowerCase(),
    createdAt: Date.now() + idx,
  }));
  await Category.insertMany(catDocs);
  await Link.insertMany(getSampleLinks(userId, visibility));
}

/**
 * Ensures the configured Admin account exists and has initial public Home links.
 */
async function ensureAdminUser() {
  const email = String(process.env.ADMIN_EMAIL || 'admin@links.local').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || 'admin123');
  const name = String(process.env.ADMIN_NAME || 'Admin').trim() || 'Admin';

  let admin = await User.findOne({ email });
  if (!admin) {
    const passwordHash = await bcrypt.hash(password, 10);
    admin = await User.create({
      name,
      email,
      passwordHash,
      role: 'admin',
      createdAt: Date.now(),
    });
    await seedUserDefaults(admin._id, 'public');
    console.log(`[Auth] Seeded default Admin account (${email}) with public Home links`);
  } else if (admin.role !== 'admin') {
    admin.role = 'admin';
    await admin.save();
    console.log(`[Auth] Promoted ${email} to admin role`);
  }
  return admin;
}

/**
 * Resets a user's categories and links back to the default sample dataset.
 */
async function resetToSampleData(userId, visibility = 'private') {
  await Link.deleteMany({ userId });
  await Category.deleteMany({ userId });

  const catDocs = DEFAULT_CATEGORIES.map((name, idx) => ({
    userId,
    name,
    nameLower: name.toLowerCase(),
    createdAt: Date.now() + idx,
  }));
  await Category.insertMany(catDocs);

  const insertedLinks = await Link.insertMany(getSampleLinks(userId, visibility));

  return {
    categories: [...DEFAULT_CATEGORIES],
    links: insertedLinks.map((l) => l.toJSON()).sort((a, b) => b.createdAt - a.createdAt),
  };
}

module.exports = {
  DEFAULT_CATEGORIES,
  ensureCleanIndexes,
  ensureCategory,
  seedUserDefaults,
  ensureAdminUser,
  resetToSampleData,
};
