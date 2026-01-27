const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getTenantDb, closeTenantDb, requireTenant } = require('../middleware/tenant');

const router = express.Router();
const deliveryMigratedTenants = new Set();

async function ensureDeliveryColumns(db, tenantCode) {
  if (!tenantCode || deliveryMigratedTenants.has(tenantCode)) return;
  try {
    await db.run('ALTER TABLE sales ADD COLUMN delivery_boy_id INTEGER');
    await db.run('ALTER TABLE sales ADD COLUMN delivery_status TEXT DEFAULT "pending"');
    await db.run('ALTER TABLE sales ADD COLUMN delivery_payment_collected INTEGER DEFAULT 0');
    await db.run('ALTER TABLE sales ADD COLUMN delivery_settled_at DATETIME');
    await db.run('ALTER TABLE sales ADD COLUMN delivery_assigned_at DATETIME');
    await db.run('ALTER TABLE sales ADD COLUMN delivery_delivered_at DATETIME');
  } catch (err) {
    if (!err.message || !err.message.includes('duplicate column')) throw err;
  }
  deliveryMigratedTenants.add(tenantCode);
}

// Get all deliveries (for Pay After Delivery orders)
router.get('/', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const tenantCode = req.user?.tenant_code;
    if (tenantCode) {
      await ensureDeliveryColumns(req.db, tenantCode);
    }

    const { status, delivery_boy_id, start_date, end_date } = req.query;
    
    let sql = `SELECT s.*, u.username as user_name, c.name as customer_name, c.phone as customer_phone,
               c.address as customer_address, c.city as customer_city,
               db.username as delivery_boy_name, db.full_name as delivery_boy_full_name,
               (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as item_count
               FROM sales s 
               LEFT JOIN users u ON s.user_id = u.id 
               LEFT JOIN customers c ON s.customer_id = c.id
               LEFT JOIN users db ON s.delivery_boy_id = db.id
               WHERE s.payment_method = 'payAfterDelivery'`;
    const params = [];

    if (status) {
      sql += ' AND s.delivery_status = ?';
      params.push(status);
    }

    if (delivery_boy_id) {
      sql += ' AND s.delivery_boy_id = ?';
      params.push(delivery_boy_id);
    }

    if (start_date) {
      sql += ' AND DATE(s.created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND DATE(s.created_at) <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY s.created_at DESC';

    const deliveries = await req.db.query(sql, params);
    res.json(deliveries);
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get delivery boys (users with role 'delivery' or 'cashier')
router.get('/delivery-boys', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const users = await req.db.query(
      'SELECT id, username, full_name, role FROM users WHERE role IN ("delivery", "cashier", "admin") ORDER BY full_name, username'
    );
    res.json(users);
  } catch (error) {
    console.error('Get delivery boys error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Assign delivery boy to a sale
router.put('/:id/assign', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const tenantCode = req.user?.tenant_code;
    if (tenantCode) {
      await ensureDeliveryColumns(req.db, tenantCode);
    }

    const { delivery_boy_id } = req.body;

    if (!delivery_boy_id) {
      return res.status(400).json({ error: 'Delivery boy ID is required' });
    }

    // Verify sale exists and is Pay After Delivery
    const sale = await req.db.get('SELECT id, payment_method FROM sales WHERE id = ?', [req.params.id]);
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    if (sale.payment_method !== 'payAfterDelivery') {
      return res.status(400).json({ error: 'This sale is not a Pay After Delivery order' });
    }

    // Verify delivery boy exists
    const deliveryBoy = await req.db.get('SELECT id FROM users WHERE id = ?', [delivery_boy_id]);
    if (!deliveryBoy) {
      return res.status(404).json({ error: 'Delivery boy not found' });
    }

    await req.db.run(
      'UPDATE sales SET delivery_boy_id = ?, delivery_status = ?, delivery_assigned_at = CURRENT_TIMESTAMP WHERE id = ?',
      [delivery_boy_id, 'assigned', req.params.id]
    );

    const updatedSale = await req.db.get(
      `SELECT s.*, u.username as user_name, c.name as customer_name,
       db.username as delivery_boy_name, db.full_name as delivery_boy_full_name
       FROM sales s 
       LEFT JOIN users u ON s.user_id = u.id 
       LEFT JOIN customers c ON s.customer_id = c.id
       LEFT JOIN users db ON s.delivery_boy_id = db.id
       WHERE s.id = ?`,
      [req.params.id]
    );

    res.json(updatedSale);
  } catch (error) {
    console.error('Assign delivery boy error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update delivery status
router.put('/:id/status', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const tenantCode = req.user?.tenant_code;
    if (tenantCode) {
      await ensureDeliveryColumns(req.db, tenantCode);
    }

    const { status } = req.body;

    const validStatuses = ['pending', 'assigned', 'out_for_delivery', 'delivered', 'payment_collected', 'settled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid delivery status' });
    }

    const sale = await req.db.get('SELECT id, payment_method FROM sales WHERE id = ?', [req.params.id]);
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    if (sale.payment_method !== 'payAfterDelivery') {
      return res.status(400).json({ error: 'This sale is not a Pay After Delivery order' });
    }

    let updateSql = 'UPDATE sales SET delivery_status = ?';
    const params = [status];

    if (status === 'out_for_delivery') {
      updateSql += ', delivery_assigned_at = COALESCE(delivery_assigned_at, CURRENT_TIMESTAMP)';
    } else if (status === 'delivered') {
      updateSql += ', delivery_delivered_at = CURRENT_TIMESTAMP';
    } else if (status === 'payment_collected') {
      updateSql += ', delivery_payment_collected = 1';
    } else if (status === 'settled') {
      updateSql += ', delivery_settled_at = CURRENT_TIMESTAMP';
    }

    updateSql += ' WHERE id = ?';
    params.push(req.params.id);

    await req.db.run(updateSql, params);

    const updatedSale = await req.db.get(
      `SELECT s.*, u.username as user_name, c.name as customer_name,
       db.username as delivery_boy_name, db.full_name as delivery_boy_full_name
       FROM sales s 
       LEFT JOIN users u ON s.user_id = u.id 
       LEFT JOIN customers c ON s.customer_id = c.id
       LEFT JOIN users db ON s.delivery_boy_id = db.id
       WHERE s.id = ?`,
      [req.params.id]
    );

    res.json(updatedSale);
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get delivery settlement summary (for end of day)
router.get('/settlement', authenticateToken, requireRole('admin'), requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const tenantCode = req.user?.tenant_code;
    if (tenantCode) {
      await ensureDeliveryColumns(req.db, tenantCode);
    }

    const { delivery_boy_id, date } = req.query;
    
    let sql = `SELECT 
               db.id as delivery_boy_id,
               db.username as delivery_boy_name,
               db.full_name as delivery_boy_full_name,
               COUNT(s.id) as total_deliveries,
               SUM(CASE WHEN s.delivery_status = 'payment_collected' THEN s.total ELSE 0 END) as total_collected,
               SUM(CASE WHEN s.delivery_status = 'settled' THEN s.total ELSE 0 END) as total_settled,
               SUM(CASE WHEN s.delivery_status = 'payment_collected' AND s.delivery_settled_at IS NULL THEN s.total ELSE 0 END) as pending_settlement
               FROM sales s
               LEFT JOIN users db ON s.delivery_boy_id = db.id
               WHERE s.payment_method = 'payAfterDelivery' 
               AND s.delivery_boy_id IS NOT NULL`;
    
    const params = [];

    if (delivery_boy_id) {
      sql += ' AND s.delivery_boy_id = ?';
      params.push(delivery_boy_id);
    }

    if (date) {
      sql += ' AND DATE(s.created_at) = ?';
      params.push(date);
    } else {
      sql += ' AND DATE(s.created_at) = DATE("now")';
    }

    sql += ' GROUP BY db.id, db.username, db.full_name';

    const settlements = await req.db.query(sql, params);

    res.json(settlements);
  } catch (error) {
    console.error('Get settlement error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Settle payments with delivery boy (mark all collected payments as settled)
router.post('/settle', authenticateToken, requireRole('admin'), requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const tenantCode = req.user?.tenant_code;
    if (tenantCode) {
      await ensureDeliveryColumns(req.db, tenantCode);
    }

    const { delivery_boy_id, date } = req.body;

    let sql = `UPDATE sales 
               SET delivery_status = 'settled', delivery_settled_at = CURRENT_TIMESTAMP
               WHERE payment_method = 'payAfterDelivery' 
               AND delivery_status = 'payment_collected'
               AND delivery_settled_at IS NULL`;
    
    const params = [];

    if (delivery_boy_id) {
      sql += ' AND delivery_boy_id = ?';
      params.push(delivery_boy_id);
    }

    if (date) {
      sql += ' AND DATE(created_at) = ?';
      params.push(date);
    } else {
      sql += ' AND DATE(created_at) = DATE("now")';
    }

    const result = await req.db.run(sql, params);

    res.json({ 
      message: `Settled ${result.changes} delivery payment(s)`,
      settled_count: result.changes
    });
  } catch (error) {
    console.error('Settle payments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
