const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getTenantDb, closeTenantDb, requireTenant } = require('../middleware/tenant');
const { preventDemoModifications } = require('../middleware/demoRestriction');

const router = express.Router();

// Get expense categories
router.get('/categories', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const categories = await req.db.query('SELECT * FROM expense_categories ORDER BY name');
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create expense category
router.post('/categories', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const result = await req.db.run(
      'INSERT INTO expense_categories (name, description) VALUES (?, ?)',
      [name, description || null]
    );
    const cat = await req.db.get('SELECT * FROM expense_categories WHERE id = ?', [result.id]);
    res.status(201).json(cat);
  } catch (error) {
    if (error.message?.includes('UNIQUE')) return res.status(400).json({ error: 'Category already exists' });
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update expense category
router.put('/categories/:id', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { name, description } = req.body;
    await req.db.run(
      'UPDATE expense_categories SET name = ?, description = ? WHERE id = ?',
      [name, description || null, req.params.id]
    );
    const cat = await req.db.get('SELECT * FROM expense_categories WHERE id = ?', [req.params.id]);
    res.json(cat);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete expense category
router.delete('/categories/:id', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    await req.db.run('DELETE FROM expense_categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Category deleted' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get expenses
router.get('/', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { start_date, end_date, category_id } = req.query;
    let sql = `SELECT e.*, ec.name as category_name 
               FROM expenses e 
               LEFT JOIN expense_categories ec ON e.category_id = ec.id WHERE 1=1`;
    const params = [];
    if (start_date) { sql += ' AND DATE(e.expense_date) >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND DATE(e.expense_date) <= ?'; params.push(end_date); }
    if (category_id) { sql += ' AND e.category_id = ?'; params.push(category_id); }
    sql += ' ORDER BY e.expense_date DESC, e.created_at DESC';
    const expenses = await req.db.query(sql, params);
    res.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create expense
router.post('/', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { category_id, amount, description, expense_date, payment_method, reference } = req.body;
    if (!amount || parseFloat(amount) <= 0 || !expense_date) {
      return res.status(400).json({ error: 'Amount and expense date are required' });
    }
    const result = await req.db.run(
      `INSERT INTO expenses (category_id, amount, description, expense_date, payment_method, reference, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [category_id || null, parseFloat(amount), description || null, expense_date, payment_method || 'cash', reference || null, req.user?.id]
    );
    const expense = await req.db.get(
      `SELECT e.*, ec.name as category_name FROM expenses e LEFT JOIN expense_categories ec ON e.category_id = ec.id WHERE e.id = ?`,
      [result.id]
    );
    res.status(201).json(expense);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update expense
router.put('/:id', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { category_id, amount, description, expense_date, payment_method, reference } = req.body;
    await req.db.run(
      `UPDATE expenses SET category_id = ?, amount = ?, description = ?, expense_date = ?, payment_method = ?, reference = ? WHERE id = ?`,
      [category_id || null, parseFloat(amount), description || null, expense_date, payment_method || 'cash', reference || null, req.params.id]
    );
    const expense = await req.db.get(
      `SELECT e.*, ec.name as category_name FROM expenses e LEFT JOIN expense_categories ec ON e.category_id = ec.id WHERE e.id = ?`,
      [req.params.id]
    );
    res.json(expense);
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete expense
router.delete('/:id', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    await req.db.run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Expense report
router.get('/report', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { start_date, end_date, category_id } = req.query;
    let sql = `SELECT e.*, ec.name as category_name 
               FROM expenses e 
               LEFT JOIN expense_categories ec ON e.category_id = ec.id WHERE 1=1`;
    const params = [];
    if (start_date) { sql += ' AND DATE(e.expense_date) >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND DATE(e.expense_date) <= ?'; params.push(end_date); }
    if (category_id) { sql += ' AND e.category_id = ?'; params.push(category_id); }
    sql += ' ORDER BY e.expense_date DESC';
    const expenses = await req.db.query(sql, params);

    const byCategory = {};
    let total = 0;
    expenses.forEach(exp => {
      const cat = exp.category_name || 'Uncategorized';
      if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 };
      byCategory[cat].total += parseFloat(exp.amount || 0);
      byCategory[cat].count += 1;
      total += parseFloat(exp.amount || 0);
    });

    res.json({
      expenses,
      summary: { total, count: expenses.length },
      byCategory: Object.entries(byCategory).map(([name, data]) => ({ category: name, ...data })),
    });
  } catch (error) {
    console.error('Expense report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
