const express = require('express');
const { query, run, get } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all customers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM customers WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY created_at DESC';

    const customers = await query(sql, params);
    res.json(customers);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single customer
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const customer = await get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create customer
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, phone, email, country, city, address } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Customer name is required' });
    }

    const result = await run(
      'INSERT INTO customers (name, phone, email, country, city, address) VALUES (?, ?, ?, ?, ?, ?)',
      [name, phone || null, email || null, country || null, city || null, address || null]
    );

    const customer = await get('SELECT * FROM customers WHERE id = ?', [result.id]);
    res.status(201).json(customer);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update customer
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, phone, email, country, city, address } = req.body;

    await run(
      'UPDATE customers SET name = ?, phone = ?, email = ?, country = ?, city = ?, address = ? WHERE id = ?',
      [name, phone || null, email || null, country || null, city || null, address || null, req.params.id]
    );

    const customer = await get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    res.json(customer);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete customer
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await run('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
