const express = require('express');
const { query, run, get } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await query('SELECT * FROM categories ORDER BY name');
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single category
router.get('/:id', async (req, res) => {
  try {
    const category = await get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create category
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const result = await run(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name, description || null]
    );

    const category = await get('SELECT * FROM categories WHERE id = ?', [result.id]);
    res.status(201).json(category);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update category
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    await run(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name, description || null, req.params.id]
    );

    const category = await get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    res.json(category);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete category
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Check if category has products
    const products = await query('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [req.params.id]);
    if (products[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete category with existing products' });
    }

    await run('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
