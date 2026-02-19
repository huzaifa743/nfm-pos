const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getTenantDb, closeTenantDb, requireTenant } = require('../middleware/tenant');
const { preventDemoModifications } = require('../middleware/demoRestriction');

const router = express.Router();

function generatePONumber() {
  return 'PO-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
}

// Get all purchase orders
router.get('/', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { status, supplier_id, start_date, end_date } = req.query;
    let sql = `SELECT po.*, s.name as supplier_name 
               FROM purchase_orders po 
               JOIN suppliers s ON po.supplier_id = s.id WHERE 1=1`;
    const params = [];

    if (status) { sql += ' AND po.status = ?'; params.push(status); }
    if (supplier_id) { sql += ' AND po.supplier_id = ?'; params.push(supplier_id); }
    if (start_date) { sql += ' AND DATE(po.order_date) >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND DATE(po.order_date) <= ?'; params.push(end_date); }
    sql += ' ORDER BY po.created_at DESC';

    const orders = await req.db.query(sql, params);
    res.json(orders);
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single purchase order with items
router.get('/:id', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const order = await req.db.get(
      `SELECT po.*, s.name as supplier_name, s.phone as supplier_phone, s.address as supplier_address 
       FROM purchase_orders po 
       JOIN suppliers s ON po.supplier_id = s.id 
       WHERE po.id = ?`,
      [req.params.id]
    );
    if (!order) return res.status(404).json({ error: 'Purchase order not found' });

    const items = await req.db.query(
      'SELECT * FROM purchase_order_items WHERE purchase_order_id = ?',
      [req.params.id]
    );
    order.items = items;
    res.json(order);
  } catch (error) {
    console.error('Get purchase order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create purchase order
router.post('/', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { supplier_id, order_date, expected_date, items, discount_amount, vat_amount, notes } = req.body;
    if (!supplier_id || !order_date || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Supplier, order date, and items are required' });
    }

    let poNumber = generatePONumber();
    let exists = await req.db.get('SELECT id FROM purchase_orders WHERE po_number = ?', [poNumber]);
    while (exists) {
      poNumber = generatePONumber();
      exists = await req.db.get('SELECT id FROM purchase_orders WHERE po_number = ?', [poNumber]);
    }

    const subtotal = items.reduce((s, i) => s + (parseFloat(i.quantity) * parseFloat(i.unit_price)), 0);
    const discount = parseFloat(discount_amount || 0);
    const vat = parseFloat(vat_amount || 0);
    const total = Math.max(0, subtotal - discount + vat);

    const result = await req.db.run(
      `INSERT INTO purchase_orders (po_number, supplier_id, order_date, expected_date, status, subtotal, discount_amount, vat_amount, total, notes, created_by)
       VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)`,
      [poNumber, supplier_id, order_date, expected_date || null, subtotal, discount, vat, total, notes || null, req.user?.id]
    );

    for (const item of items) {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const totalPrice = qty * price;
      await req.db.run(
        `INSERT INTO purchase_order_items (purchase_order_id, product_id, product_name, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [result.id, item.product_id || null, item.product_name || 'Item', qty, price, totalPrice]
      );
    }

    const order = await req.db.get(
      `SELECT po.*, s.name as supplier_name FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id WHERE po.id = ?`,
      [result.id]
    );
    order.items = await req.db.query('SELECT * FROM purchase_order_items WHERE purchase_order_id = ?', [result.id]);
    res.status(201).json(order);
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update purchase order
router.put('/:id', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { supplier_id, order_date, expected_date, items, discount_amount, vat_amount, notes, status } = req.body;
    const existing = await req.db.get('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Purchase order not found' });

    if (items && Array.isArray(items)) {
      await req.db.run('DELETE FROM purchase_order_items WHERE purchase_order_id = ?', [req.params.id]);
      let subtotal = 0;
      for (const item of items) {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unit_price) || 0;
        const totalPrice = qty * price;
        subtotal += totalPrice;
        await req.db.run(
          `INSERT INTO purchase_order_items (purchase_order_id, product_id, product_name, quantity, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [req.params.id, item.product_id || null, item.product_name || 'Item', qty, price, totalPrice]
        );
      }
      const discount = parseFloat(discount_amount || 0);
      const vat = parseFloat(vat_amount || 0);
      const total = Math.max(0, subtotal - discount + vat);

      await req.db.run(
        `UPDATE purchase_orders SET supplier_id = ?, order_date = ?, expected_date = ?, 
         subtotal = ?, discount_amount = ?, vat_amount = ?, total = ?, notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [supplier_id || existing.supplier_id, order_date || existing.order_date, expected_date || existing.expected_date,
         subtotal, discount, vat, total, notes || existing.notes, status || existing.status, req.params.id]
      );
    } else {
      await req.db.run(
        `UPDATE purchase_orders SET supplier_id = ?, order_date = ?, expected_date = ?, 
         discount_amount = ?, vat_amount = ?, notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [supplier_id || existing.supplier_id, order_date || existing.order_date, expected_date || existing.expected_date,
         parseFloat(discount_amount || 0), parseFloat(vat_amount || 0), notes || existing.notes, status || existing.status, req.params.id]
      );
    }

    const order = await req.db.get(
      `SELECT po.*, s.name as supplier_name FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id WHERE po.id = ?`,
      [req.params.id]
    );
    order.items = await req.db.query('SELECT * FROM purchase_order_items WHERE purchase_order_id = ?', [req.params.id]);
    res.json(order);
  } catch (error) {
    console.error('Update purchase order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Confirm/Approve purchase order
router.post('/:id/confirm', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const order = await req.db.get('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Purchase order not found' });

    await req.db.run('UPDATE purchase_orders SET status = ? WHERE id = ?', ['confirmed', req.params.id]);

    const total = parseFloat(order.total || 0);
    const supplier = await req.db.get('SELECT * FROM suppliers WHERE id = ?', [order.supplier_id]);
    const newBalance = parseFloat(supplier?.balance || 0) + total;

    await req.db.run('UPDATE suppliers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newBalance, order.supplier_id]);
    await req.db.run(
      `INSERT INTO supplier_ledger (supplier_id, type, amount, description, reference_type, reference_id, balance_after)
       VALUES (?, 'purchase', ?, ?, 'purchase_order', ?, ?)`,
      [order.supplier_id, total, `PO ${order.po_number}`, req.params.id, newBalance]
    );

    const updated = await req.db.get(
      `SELECT po.*, s.name as supplier_name FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id WHERE po.id = ?`,
      [req.params.id]
    );
    updated.items = await req.db.query('SELECT * FROM purchase_order_items WHERE purchase_order_id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    console.error('Confirm PO error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Pay purchase order
router.post('/:id/pay', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { amount } = req.body;
    const order = await req.db.get('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Purchase order not found' });

    const payAmount = amount !== undefined ? parseFloat(amount) : parseFloat(order.total || 0) - parseFloat(order.paid_amount || 0);
    if (payAmount <= 0) return res.status(400).json({ error: 'Invalid payment amount' });

    const newPaid = parseFloat(order.paid_amount || 0) + payAmount;
    await req.db.run('UPDATE purchase_orders SET paid_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newPaid, req.params.id]);

    const supplier = await req.db.get('SELECT * FROM suppliers WHERE id = ?', [order.supplier_id]);
    const newBalance = Math.max(0, parseFloat(supplier?.balance || 0) - payAmount);
    await req.db.run('UPDATE suppliers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newBalance, order.supplier_id]);
    await req.db.run(
      `INSERT INTO supplier_ledger (supplier_id, type, amount, description, reference_type, reference_id, balance_after)
       VALUES (?, 'payment', ?, ?, 'purchase_order', ?, ?)`,
      [order.supplier_id, payAmount, `Payment for PO ${order.po_number}`, req.params.id, newBalance]
    );

    const status = newPaid >= parseFloat(order.total) ? 'paid' : 'partial';
    await req.db.run('UPDATE purchase_orders SET status = ? WHERE id = ?', [status, req.params.id]);

    const updated = await req.db.get(
      `SELECT po.*, s.name as supplier_name FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id WHERE po.id = ?`,
      [req.params.id]
    );
    updated.items = await req.db.query('SELECT * FROM purchase_order_items WHERE purchase_order_id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    console.error('Pay PO error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Receive items (update stock)
router.post('/:id/receive', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { items } = req.body;
    const order = await req.db.get('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Purchase order not found' });

    const orderItems = await req.db.query('SELECT * FROM purchase_order_items WHERE purchase_order_id = ?', [req.params.id]);

    if (items && Array.isArray(items)) {
      for (const recv of items) {
        const qty = parseFloat(recv.received_quantity || recv.quantity) || 0;
        if (qty > 0 && recv.id) {
          await req.db.run('UPDATE purchase_order_items SET received_quantity = COALESCE(received_quantity, 0) + ? WHERE id = ?', [qty, recv.id]);
          const oi = orderItems.find(i => i.id === recv.id);
          if (oi?.product_id) {
            await req.db.run('UPDATE products SET stock_quantity = COALESCE(stock_quantity, 0) + ? WHERE id = ?', [qty, oi.product_id]);
            const prod = await req.db.get('SELECT purchase_rate FROM products WHERE id = ?', [oi.product_id]);
            if (!prod?.purchase_rate) {
              await req.db.run('UPDATE products SET purchase_rate = ? WHERE id = ?', [oi.unit_price, oi.product_id]);
            }
          }
        }
      }
    } else {
      for (const oi of orderItems) {
        const qty = parseFloat(oi.quantity) || 0;
        if (qty > 0 && oi.product_id) {
          await req.db.run('UPDATE purchase_order_items SET received_quantity = ? WHERE id = ?', [qty, oi.id]);
          await req.db.run('UPDATE products SET stock_quantity = COALESCE(stock_quantity, 0) + ? WHERE id = ?', [qty, oi.product_id]);
          const prod = await req.db.get('SELECT purchase_rate FROM products WHERE id = ?', [oi.product_id]);
          if (!prod?.purchase_rate) {
            await req.db.run('UPDATE products SET purchase_rate = ? WHERE id = ?', [oi.unit_price, oi.product_id]);
          }
        }
      }
    }

    await req.db.run('UPDATE purchase_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['received', req.params.id]);

    const updated = await req.db.get(
      `SELECT po.*, s.name as supplier_name FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id WHERE po.id = ?`,
      [req.params.id]
    );
    updated.items = await req.db.query('SELECT * FROM purchase_order_items WHERE purchase_order_id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    console.error('Receive PO error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete purchase order
router.delete('/:id', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const order = await req.db.get('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Purchase order not found' });
    if (order.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft orders can be deleted' });
    }
    await req.db.run('DELETE FROM purchase_order_items WHERE purchase_order_id = ?', [req.params.id]);
    await req.db.run('DELETE FROM purchase_orders WHERE id = ?', [req.params.id]);
    res.json({ message: 'Purchase order deleted' });
  } catch (error) {
    console.error('Delete PO error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
