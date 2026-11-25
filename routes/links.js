const express = require('express');
const mongoose = require('mongoose');
const Link = require('../models/Link');
const { requireAdmin } = require('../middleware/auth');
const { ensureCategory } = require('../utils/seed');

const router = express.Router();

function normalizeUrl(rawUrl) {
  let url = (rawUrl || '').trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  return url;
}

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))];
}

function getManagedLinkQuery(id, user) {
  if (user.role === 'admin') {
    return { _id: id, $or: [{ userId: user.id }, { visibility: 'public' }] };
  }
  return { _id: id, userId: user.id };
}

// GET /api/links - List authenticated user's links
router.get('/', async (req, res, next) => {
  try {
    const { category, favorite, visibility, q, sort } = req.query;
    const filter = { userId: req.user.id };

    if (category && category !== 'All') {
      filter.category = category;
    }
    if (favorite === 'true') {
      filter.favorite = true;
    }
    if (req.user.role === 'admin' && (visibility === 'public' || visibility === 'private')) {
      filter.visibility = visibility;
    }
    if (q && q.trim()) {
      const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { title: regex },
        { description: regex },
        { url: regex },
        { category: regex },
        { tags: regex },
      ];
    }

    let sortObj = { createdAt: -1 };
    if (sort === 'oldest') sortObj = { createdAt: 1 };
    else if (sort === 'az') sortObj = { title: 1 };
    else if (sort === 'visits') sortObj = { visits: -1, createdAt: -1 };

    const links = await Link.find(filter).sort(sortObj);
    res.json({ links });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/links/share-all - Admin shares all own links to Home (or makes all private)
router.patch('/share-all', requireAdmin, async (req, res, next) => {
  try {
    const targetVisibility = req.body?.visibility === 'private' ? 'private' : 'public';
    const filter =
      targetVisibility === 'private'
        ? { $or: [{ userId: req.user.id }, { visibility: 'public' }] }
        : { userId: req.user.id };

    const result = await Link.updateMany(filter, { $set: { visibility: targetVisibility } });
    const links = await Link.find({ userId: req.user.id }).sort({ createdAt: -1 });

    res.json({
      visibility: targetVisibility,
      modifiedCount: result.modifiedCount,
      links,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/links - Create a new link
router.post('/', async (req, res, next) => {
  try {
    const url = normalizeUrl(req.body.url);
    const title = (req.body.title || '').trim();
    const category = (req.body.category || '').trim() || 'General';
    const description = (req.body.description || '').trim();
    const tags = sanitizeTags(req.body.tags);
    const favorite = Boolean(req.body.favorite);
    const visibility =
      req.user.role === 'admin' && req.body.visibility === 'public' ? 'public' : 'private';

    if (!url || !isValidHttpUrl(url)) {
      return res.status(400).json({ error: 'A valid http/https URL is required.' });
    }
    if (!title) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    const ensuredCat = await ensureCategory(req.user.id, category);
    const created = await Link.create({
      userId: req.user.id,
      title,
      url,
      category: ensuredCat ? ensuredCat.name : category,
      description,
      tags,
      favorite,
      visibility,
      visits: 0,
      createdAt: Date.now(),
    });

    res.status(201).json({ link: created });
  } catch (err) {
    next(err);
  }
});

// PUT /api/links/:id - Update an existing link
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid link ID.' });
    }

    const url = normalizeUrl(req.body.url);
    const title = (req.body.title || '').trim();
    const category = (req.body.category || '').trim() || 'General';
    const description = (req.body.description || '').trim();
    const tags = sanitizeTags(req.body.tags);
    const favorite = Boolean(req.body.favorite);

    if (!url || !isValidHttpUrl(url)) {
      return res.status(400).json({ error: 'A valid http/https URL is required.' });
    }
    if (!title) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    const existing = await Link.findOne(getManagedLinkQuery(id, req.user));
    if (!existing) {
      return res.status(404).json({ error: 'Link not found.' });
    }

    const ensuredCat = await ensureCategory(existing.userId, category);
    existing.title = title;
    existing.url = url;
    existing.category = ensuredCat ? ensuredCat.name : category;
    existing.description = description;
    existing.tags = tags;
    existing.favorite = favorite;
    if (req.user.role === 'admin' && (req.body.visibility === 'public' || req.body.visibility === 'private')) {
      existing.visibility = req.body.visibility;
    }

    await existing.save();
    res.json({ link: existing });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/links/:id/visibility - Admin toggles/sets public vs private visibility
router.patch('/:id/visibility', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid link ID.' });
    }

    const existing = await Link.findOne(getManagedLinkQuery(id, req.user));
    if (!existing) {
      return res.status(404).json({ error: 'Link not found.' });
    }

    const nextVisibility =
      req.body?.visibility === 'public' || req.body?.visibility === 'private'
        ? req.body.visibility
        : existing.visibility === 'public'
        ? 'private'
        : 'public';

    existing.visibility = nextVisibility;
    await existing.save();

    res.json({ link: existing });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/links/:id/favorite - Toggle or set favorite status
router.patch('/:id/favorite', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid link ID.' });
    }

    const existing = await Link.findOne(getManagedLinkQuery(id, req.user));
    if (!existing) {
      return res.status(404).json({ error: 'Link not found.' });
    }

    existing.favorite =
      typeof req.body?.favorite === 'boolean' ? req.body.favorite : !existing.favorite;
    await existing.save();

    res.json({ link: existing });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/links/:id/visit - Increment visit counter
router.patch('/:id/visit', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid link ID.' });
    }

    const updated = await Link.findOneAndUpdate(
      getManagedLinkQuery(id, req.user),
      { $inc: { visits: 1 } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Link not found.' });
    }

    res.json({ link: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/links/:id - Delete a single link
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid link ID.' });
    }

    const deleted = await Link.findOneAndDelete(getManagedLinkQuery(id, req.user));
    if (!deleted) {
      return res.status(404).json({ error: 'Link not found.' });
    }

    res.json({ deletedId: id });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/links - Clear all links for authenticated user
router.delete('/', async (req, res, next) => {
  try {
    const result = await Link.deleteMany({ userId: req.user.id });
    res.json({ deletedCount: result.deletedCount });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
