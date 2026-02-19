const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getTenantDb, closeTenantDb, requireTenant } = require('../middleware/tenant');
const { preventDemoModifications } = require('../middleware/demoRestriction');

const router = express.Router();

// Get current cash balance (including sales with cash payment)
router.get('/balance', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const last = await req.db.get(
      'SELECT balance_after FROM cash_transactions ORDER BY id DESC LIMIT 1'
    );
    const cashBalanceValue = last ? parseFloat(last.balance_after) : 0;
    
    // For sales created before cash_transactions integration, add them separately
    const cashSalesNotRecorded = await req.db.get(
      `SELECT COALESCE(SUM(s.total), 0) as total 
       FROM sales s 
       LEFT JOIN cash_transactions ct ON ct.reference_type = 'sale' AND ct.reference_id = s.id
       WHERE s.payment_method = 'cash' AND ct.id IS NULL`
    );
    const totalBalance = cashBalanceValue + parseFloat(cashSalesNotRecorded?.total || 0);
    
    res.json({ balance: totalBalance });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get cash transactions (sales are already included in cash_transactions when sale is created)
router.get('/transactions', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { start_date, end_date, type } = req.query;
    
    let sql = 'SELECT * FROM cash_transactions WHERE 1=1';
    const params = [];
    if (start_date) { sql += ' AND DATE(created_at) >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND DATE(created_at) <= ?'; params.push(end_date); }
    if (type) { sql += ' AND type = ?'; params.push(type); }
    sql += ' ORDER BY created_at DESC';
    const transactions = await req.db.query(sql, params);

    // Calculate balance
    const last = await req.db.get('SELECT balance_after FROM cash_transactions ORDER BY id DESC LIMIT 1');
    const balance = last ? parseFloat(last.balance_after) : 0;

    res.json({ transactions, balance });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cash in
router.post('/in', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { amount, description, reference_type, reference_id } = req.body;
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const last = await req.db.get('SELECT balance_after FROM cash_transactions ORDER BY id DESC LIMIT 1');
    const currentBalance = last ? parseFloat(last.balance_after) : 0;
    const amt = parseFloat(amount);
    const newBalance = currentBalance + amt;

    const result = await req.db.run(
      `INSERT INTO cash_transactions (type, amount, description, reference_type, reference_id, balance_after, created_by)
       VALUES ('in', ?, ?, ?, ?, ?, ?)`,
      [amt, description || 'Cash in', reference_type || null, reference_id || null, newBalance, req.user?.id]
    );

    const tx = await req.db.get('SELECT * FROM cash_transactions WHERE id = ?', [result.id]);
    res.status(201).json({ transaction: tx, balance: newBalance });
  } catch (error) {
    console.error('Cash in error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cash out
router.post('/out', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { amount, description, reference_type, reference_id } = req.body;
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const last = await req.db.get('SELECT balance_after FROM cash_transactions ORDER BY id DESC LIMIT 1');
    const currentBalance = last ? parseFloat(last.balance_after) : 0;
    const amt = parseFloat(amount);
    if (amt > currentBalance) {
      return res.status(400).json({ error: 'Insufficient cash balance' });
    }
    const newBalance = currentBalance - amt;

    const result = await req.db.run(
      `INSERT INTO cash_transactions (type, amount, description, reference_type, reference_id, balance_after, created_by)
       VALUES ('out', ?, ?, ?, ?, ?, ?)`,
      [amt, description || 'Cash out', reference_type || null, reference_id || null, newBalance, req.user?.id]
    );

    const tx = await req.db.get('SELECT * FROM cash_transactions WHERE id = ?', [result.id]);
    res.status(201).json({ transaction: tx, balance: newBalance });
  } catch (error) {
    console.error('Cash out error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cash report (sales are already included in cash_transactions)
router.get('/report', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let sql = 'SELECT * FROM cash_transactions WHERE 1=1';
    const params = [];
    if (start_date) { sql += ' AND DATE(created_at) >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND DATE(created_at) <= ?'; params.push(end_date); }
    sql += ' ORDER BY created_at';
    const transactions = await req.db.query(sql, params);

    let totalIn = 0, totalOut = 0;
    transactions.forEach(t => {
      if (t.type === 'in') totalIn += parseFloat(t.amount);
      else totalOut += parseFloat(t.amount);
    });

    const lastTx = transactions[transactions.length - 1];
    const closingBalance = lastTx ? parseFloat(lastTx.balance_after) : 0;

    res.json({
      transactions,
      summary: { totalIn, totalOut, closingBalance, count: transactions.length },
    });
  } catch (error) {
    console.error('Cash report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
