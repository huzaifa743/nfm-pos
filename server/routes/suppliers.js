const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getTenantDb, closeTenantDb, requireTenant } = require('../middleware/tenant');
const { preventDemoModifications } = require('../middleware/demoRestriction');

const router = express.Router();

// Get all suppliers
router.get('/', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const suppliers = await req.db.query(
      'SELECT * FROM suppliers ORDER BY name'
    );
    res.json(suppliers);
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get supplier by ID
router.get('/:id', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const supplier = await req.db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    res.json(supplier);
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create supplier
router.post('/', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { name, phone, email, address, contact_person } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const result = await req.db.run(
      `INSERT INTO suppliers (name, phone, email, address, contact_person) VALUES (?, ?, ?, ?, ?)`,
      [name, phone || null, email || null, address || null, contact_person || null]
    );
    const supplier = await req.db.get('SELECT * FROM suppliers WHERE id = ?', [result.id]);
    res.status(201).json(supplier);
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update supplier
router.put('/:id', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { name, phone, email, address, contact_person, status } = req.body;
    await req.db.run(
      `UPDATE suppliers SET name = ?, phone = ?, email = ?, address = ?, contact_person = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, phone || null, email || null, address || null, contact_person || null, status || 'active', req.params.id]
    );
    const supplier = await req.db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    res.json(supplier);
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete supplier (soft delete)
router.delete('/:id', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    await req.db.run('UPDATE suppliers SET status = ? WHERE id = ?', ['inactive', req.params.id]);
    res.json({ message: 'Supplier deactivated successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get supplier ledger
router.get('/:id/ledger', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let sql = 'SELECT * FROM supplier_ledger WHERE supplier_id = ?';
    const params = [req.params.id];
    if (start_date) { sql += ' AND DATE(created_at) >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND DATE(created_at) <= ?'; params.push(end_date); }
    sql += ' ORDER BY created_at';
    const ledger = await req.db.query(sql, params);

    const supplier = await req.db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    res.json({ ledger, supplier, balance: parseFloat(supplier?.balance || 0) });
  } catch (error) {
    console.error('Get ledger error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Pay supplier
router.post('/:id/pay', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { amount, description, reference_type, reference_id } = req.body;
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const supplier = await req.db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    const amt = parseFloat(amount);
    const currentBalance = parseFloat(supplier.balance || 0);
    const newBalance = Math.max(0, currentBalance - amt);

    await req.db.run(
      'UPDATE suppliers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newBalance, req.params.id]
    );

    await req.db.run(
      `INSERT INTO supplier_ledger (supplier_id, type, amount, description, reference_type, reference_id, balance_after) 
       VALUES (?, 'payment', ?, ?, ?, ?, ?)`,
      [req.params.id, amt, description || 'Supplier payment', reference_type || null, reference_id || null, newBalance]
    );

    const ledgerEntry = await req.db.get('SELECT * FROM supplier_ledger WHERE supplier_id = ? ORDER BY id DESC LIMIT 1', [req.params.id]);
    const updated = await req.db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    res.json({ supplier: updated, ledgerEntry });
  } catch (error) {
    console.error('Pay supplier error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add to supplier balance (purchase/invoice)
router.post('/:id/add-balance', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { amount, description, reference_type, reference_id } = req.body;
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const supplier = await req.db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    const amt = parseFloat(amount);
    const currentBalance = parseFloat(supplier.balance || 0);
    const newBalance = currentBalance + amt;

    await req.db.run(
      'UPDATE suppliers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newBalance, req.params.id]
    );

    await req.db.run(
      `INSERT INTO supplier_ledger (supplier_id, type, amount, description, reference_type, reference_id, balance_after) 
       VALUES (?, 'purchase', ?, ?, ?, ?, ?)`,
      [req.params.id, amt, description || 'Purchase/Invoice', reference_type || null, reference_id || null, newBalance]
    );

    const updated = await req.db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    res.json({ supplier: updated });
  } catch (error) {
    console.error('Add balance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
