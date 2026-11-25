const express = require('express');
const Category = require('../models/Category');

const router = express.Router();

// GET /api/categories - List authenticated user's category names
router.get('/', async (req, res, next) => {
  try {
    const docs = await Category.find({ userId: req.user.id }).sort({ createdAt: 1 });
    res.json({ categories: docs.map((c) => c.name) });
  } catch (err) {
    next(err);
  }
});

// POST /api/categories - Create a new category for authenticated user
router.post('/', async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Category name is required.' });
    }
    if (name.length > 30) {
      return res.status(400).json({ error: 'Category name cannot exceed 30 characters.' });
    }

    const nameLower = name.toLowerCase();
    const existing = await Category.findOne({ userId: req.user.id, nameLower });
    if (existing) {
      return res.status(409).json({ error: 'Category already exists.' });
    }

    const created = await Category.create({
      userId: req.user.id,
      name,
      nameLower,
      createdAt: Date.now(),
    });

    res.status(201).json({ category: created.name });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Category already exists.' });
    }
    next(err);
  }
});

module.exports = router;
