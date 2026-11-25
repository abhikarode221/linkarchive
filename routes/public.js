const express = require('express');
const mongoose = require('mongoose');
const Link = require('../models/Link');
const { DEFAULT_CATEGORIES } = require('../utils/seed');

const router = express.Router();

// GET /api/public/links - Public Home page feed (all public links)
router.get('/links', async (req, res, next) => {
  try {
    const { category, q, sort } = req.query;
    const filter = { visibility: 'public' };

    if (category && category !== 'All') {
      filter.category = category;
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

// GET /api/public/categories - Categories present on public Home links
router.get('/categories', async (_req, res, next) => {
  try {
    const publicCats = await Link.distinct('category', { visibility: 'public' });
    const merged = [...DEFAULT_CATEGORIES];
    publicCats.forEach((cat) => {
      if (cat && !merged.includes(cat)) {
        merged.push(cat);
      }
    });
    res.json({ categories: merged });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/public/links/:id/visit - Record visit on a public Home link
router.patch('/links/:id/visit', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid link ID.' });
    }

    const updated = await Link.findOneAndUpdate(
      { _id: id, visibility: 'public' },
      { $inc: { visits: 1 } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Public link not found.' });
    }

    res.json({ link: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
