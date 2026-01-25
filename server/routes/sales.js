const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { getTenantDb, closeTenantDb, requireTenant } = require('../middleware/tenant');

const router = express.Router();

// Get all sales
router.get('/', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { start_date, end_date, search, payment_method } = req.query;
    
    let sql = `SELECT s.*, u.username as user_name, c.name as customer_name, c.phone as customer_phone 
               FROM sales s 
               LEFT JOIN users u ON s.user_id = u.id 
               LEFT JOIN customers c ON s.customer_id = c.id 
               WHERE 1=1`;
    const params = [];

    if (start_date) {
      sql += ' AND DATE(s.created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND DATE(s.created_at) <= ?';
      params.push(end_date);
    }

    if (search) {
      sql += ' AND (s.sale_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (payment_method) {
      sql += ' AND s.payment_method = ?';
      params.push(payment_method);
    }

    sql += ' ORDER BY s.created_at DESC';

    const sales = await req.db.query(sql, params);
    res.json(sales);
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single sale with items
router.get('/:id', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const sale = await req.db.get(
      `SELECT s.*, u.username as user_name, c.name as customer_name, c.phone as customer_phone, 
       c.email as customer_email, c.address as customer_address, c.city as customer_city, c.country as customer_country
       FROM sales s 
       LEFT JOIN users u ON s.user_id = u.id 
       LEFT JOIN customers c ON s.customer_id = c.id 
       WHERE s.id = ?`,
      [req.params.id]
    );

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const items = await req.db.query(
      'SELECT si.*, p.image as product_image FROM sale_items si LEFT JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?',
      [req.params.id]
    );

    res.json({ ...sale, items });
  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create sale
router.post('/', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const {
      customer_id,
      items,
      subtotal,
      discount_amount,
      discount_type,
      vat_percentage,
      vat_amount,
      total,
      payment_method,
      payment_amount,
      change_amount,
      order_type
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Sale must have at least one item' });
    }

    const saleNumber = `SALE-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Create sale
    const saleResult = await req.db.run(
      `INSERT INTO sales (sale_number, customer_id, user_id, subtotal, discount_amount, discount_type, 
       vat_percentage, vat_amount, total, payment_method, payment_amount, change_amount, order_type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        saleNumber,
        customer_id || null,
        req.user.id,
        parseFloat(subtotal),
        parseFloat(discount_amount) || 0,
        discount_type || 'fixed',
        parseFloat(vat_percentage) || 0,
        parseFloat(vat_amount) || 0,
        parseFloat(total),
        payment_method,
        parseFloat(payment_amount),
        parseFloat(change_amount) || 0,
        order_type || 'dine-in'
      ]
    );

    // Create sale items
    for (const item of items) {
      await req.db.run(
        'INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)',
        [
          saleResult.id,
          item.product_id,
          item.product_name,
          item.quantity,
          parseFloat(item.unit_price),
          parseFloat(item.total_price)
        ]
      );

      // Update product stock only if stock tracking is enabled
      if (item.product_id) {
        const product = await req.db.get('SELECT stock_tracking_enabled FROM products WHERE id = ?', [item.product_id]);
        if (product && (product.stock_tracking_enabled === 1 || product.stock_tracking_enabled === true)) {
          await req.db.run('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [item.quantity, item.product_id]);
        }
      }
    }

    const sale = await req.db.get(
      `SELECT s.*, u.username as user_name, c.name as customer_name 
       FROM sales s 
       LEFT JOIN users u ON s.user_id = u.id 
       LEFT JOIN customers c ON s.customer_id = c.id 
       WHERE s.id = ?`,
      [saleResult.id]
    );

    const saleItems = await req.db.query('SELECT * FROM sale_items WHERE sale_id = ?', [saleResult.id]);

    res.status(201).json({ ...sale, items: saleItems });
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
