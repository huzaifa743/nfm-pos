const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getTenantDb, closeTenantDb, requireTenant } = require('../middleware/tenant');
const { preventDemoModifications } = require('../middleware/demoRestriction');

const router = express.Router();

// Get all unit conversions
router.get('/', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const conversions = await req.db.query('SELECT * FROM unit_conversions ORDER BY name');
    res.json(conversions);
  } catch (error) {
    console.error('Get unit conversions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single unit conversion
router.get('/:id', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const conversion = await req.db.get('SELECT * FROM unit_conversions WHERE id = ?', [req.params.id]);
    if (!conversion) {
      return res.status(404).json({ error: 'Unit conversion not found' });
    }
    res.json(conversion);
  } catch (error) {
    console.error('Get unit conversion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create unit conversion
router.post('/', authenticateToken, preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { code, name, base_unit, operator, operation_value } = req.body;

    if (!code || !name || !base_unit || !operator || operation_value === undefined || operation_value === null) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (operator !== '*' && operator !== '/') {
      return res.status(400).json({ error: 'Operator must be * or /' });
    }

    if (operation_value <= 0) {
      return res.status(400).json({ error: 'Operation value must be greater than 0' });
    }

    const result = await req.db.run(
      'INSERT INTO unit_conversions (code, name, base_unit, operator, operation_value) VALUES (?, ?, ?, ?, ?)',
      [code, name, base_unit, operator, operation_value]
    );

    const conversion = await req.db.get('SELECT * FROM unit_conversions WHERE id = ?', [result.id]);
    res.status(201).json(conversion);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Code already exists' });
    }
    console.error('Create unit conversion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update unit conversion
router.put('/:id', authenticateToken, preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { code, name, base_unit, operator, operation_value } = req.body;

    if (!code || !name || !base_unit || !operator || operation_value === undefined || operation_value === null) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (operator !== '*' && operator !== '/') {
      return res.status(400).json({ error: 'Operator must be * or /' });
    }

    if (operation_value <= 0) {
      return res.status(400).json({ error: 'Operation value must be greater than 0' });
    }

    await req.db.run(
      'UPDATE unit_conversions SET code = ?, name = ?, base_unit = ?, operator = ?, operation_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [code, name, base_unit, operator, operation_value, req.params.id]
    );

    const conversion = await req.db.get('SELECT * FROM unit_conversions WHERE id = ?', [req.params.id]);
    res.json(conversion);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Code already exists' });
    }
    console.error('Update unit conversion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete unit conversion
router.delete('/:id', authenticateToken, preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    await req.db.run('DELETE FROM unit_conversions WHERE id = ?', [req.params.id]);
    res.json({ message: 'Unit conversion deleted successfully' });
  } catch (error) {
    console.error('Delete unit conversion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
