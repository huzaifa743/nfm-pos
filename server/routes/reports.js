const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getTenantDb, closeTenantDb } = require('../middleware/tenant');

const router = express.Router();

// Get sales report
router.get('/sales', authenticateToken, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { start_date, end_date, payment_method, order_type } = req.query;

    let sql = `SELECT s.*, u.username as user_name, c.name as customer_name,
               (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as item_count
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

    if (payment_method) {
      sql += ' AND s.payment_method = ?';
      params.push(payment_method);
    }

    if (order_type) {
      sql += ' AND s.order_type = ?';
      params.push(order_type);
    }

    sql += ' ORDER BY s.created_at DESC';

    const sales = await req.db.query(sql, params);

    // Calculate summary
    const summary = {
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, sale) => sum + parseFloat(sale.total || 0), 0),
      totalDiscount: sales.reduce((sum, sale) => sum + parseFloat(sale.discount_amount || 0), 0),
      totalVAT: sales.reduce((sum, sale) => sum + parseFloat(sale.vat_amount || 0), 0)
    };

    res.json({ sales, summary });
  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get product performance report
router.get('/products', authenticateToken, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let sql = `SELECT p.id, p.name, p.price, c.name as category_name,
               COALESCE(SUM(si.quantity), 0) as total_quantity,
               COALESCE(SUM(si.total_price), 0) as total_revenue
               FROM products p
               LEFT JOIN categories c ON p.category_id = c.id
               LEFT JOIN sale_items si ON p.id = si.product_id
               LEFT JOIN sales s ON si.sale_id = s.id`;
    
    const params = [];
    const conditions = [];

    if (start_date) {
      conditions.push('DATE(s.created_at) >= ?');
      params.push(start_date);
    }

    if (end_date) {
      conditions.push('DATE(s.created_at) <= ?');
      params.push(end_date);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ` GROUP BY p.id, p.name, p.price, c.name
             ORDER BY total_revenue DESC`;

    const products = await req.db.query(sql, params);
    res.json(products);
  } catch (error) {
    console.error('Product report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
