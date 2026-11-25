const express = require('express');
const Link = require('../models/Link');
const Category = require('../models/Category');
const { ensureCategory, resetToSampleData } = require('../utils/seed');

const router = express.Router();

// GET /api/backup/export - Export authenticated user's categories and links
router.get('/export', async (req, res, next) => {
  try {
    const [catDocs, linkDocs] = await Promise.all([
      Category.find({ userId: req.user.id }).sort({ createdAt: 1 }),
      Link.find({ userId: req.user.id }).sort({ createdAt: -1 }),
    ]);

    res.json({
      app: 'Links',
      exportedAt: new Date().toISOString(),
      categories: catDocs.map((c) => c.name),
      links: linkDocs.map((l) => l.toJSON()),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/backup/import - Import categories and non-duplicate links for authenticated user
router.post('/import', async (req, res, next) => {
  try {
    const payload = req.body;
    if (!payload || !Array.isArray(payload.links)) {
      return res.status(400).json({ error: 'Invalid backup format: links array is required.' });
    }

    if (Array.isArray(payload.categories)) {
      for (const catName of payload.categories) {
        if (typeof catName === 'string' && catName.trim()) {
          await ensureCategory(req.user.id, catName.trim());
        }
      }
    }

    const existingLinks = await Link.find({ userId: req.user.id }, 'url');
    const existingUrls = new Set(existingLinks.map((l) => l.url.toLowerCase()));

    const docsToInsert = [];
    for (const item of payload.links) {
      if (!item || !item.url) continue;
      let normalizedUrl = String(item.url).trim();
      if (!/^https?:\/\//i.test(normalizedUrl)) {
        normalizedUrl = 'https://' + normalizedUrl;
      }

      if (existingUrls.has(normalizedUrl.toLowerCase())) continue;
      existingUrls.add(normalizedUrl.toLowerCase());

      const catName = String(item.category || 'General').trim() || 'General';
      await ensureCategory(req.user.id, catName);

      const visibility =
        req.user.role === 'admin' && item.visibility === 'public' ? 'public' : 'private';

      docsToInsert.push({
        userId: req.user.id,
        title: String(item.title || 'Untitled').trim() || 'Untitled',
        url: normalizedUrl,
        category: catName,
        description: String(item.description || '').trim(),
        tags: Array.isArray(item.tags)
          ? [...new Set(item.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))]
          : [],
        favorite: Boolean(item.favorite),
        visibility,
        visits: Number(item.visits) || 0,
        createdAt: Number(item.createdAt) || Date.now(),
      });
    }

    if (docsToInsert.length > 0) {
      await Link.insertMany(docsToInsert);
    }

    const [catDocs, linkDocs] = await Promise.all([
      Category.find({ userId: req.user.id }).sort({ createdAt: 1 }),
      Link.find({ userId: req.user.id }).sort({ createdAt: -1 }),
    ]);

    res.json({
      added: docsToInsert.length,
      categories: catDocs.map((c) => c.name),
      links: linkDocs.map((l) => l.toJSON()),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/backup/reset-sample - Reset authenticated user's data to sample links
router.post('/reset-sample', async (req, res, next) => {
  try {
    const defaultVisibility = req.user.role === 'admin' ? 'public' : 'private';
    const data = await resetToSampleData(req.user.id, defaultVisibility);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
