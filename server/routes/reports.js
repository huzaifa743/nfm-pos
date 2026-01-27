const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getTenantDb, closeTenantDb, requireTenant } = require('../middleware/tenant');

const router = express.Router();

// Get sales report
router.get('/sales', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { start_date, end_date, payment_method } = req.query;

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
router.get('/products', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let sql = `SELECT p.id, p.name, p.price, p.purchase_rate, c.name as category_name,
               COALESCE(SUM(si.quantity), 0) as total_quantity,
               COALESCE(SUM(si.total_price), 0) as total_revenue,
               COALESCE(SUM(si.quantity * COALESCE(p.purchase_rate, 0)), 0) as total_cost,
               COALESCE(SUM(si.total_price), 0) - COALESCE(SUM(si.quantity * COALESCE(p.purchase_rate, 0)), 0) as total_profit
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

    sql += ` GROUP BY p.id, p.name, p.price, p.purchase_rate, c.name
             ORDER BY total_revenue DESC`;

    const products = await req.db.query(sql, params);
    
    // Calculate summary
    const summary = {
      totalProducts: products.length,
      totalQuantitySold: products.reduce((sum, p) => sum + (p.total_quantity || 0), 0),
      totalRevenue: products.reduce((sum, p) => sum + parseFloat(p.total_revenue || 0), 0),
      totalCost: products.reduce((sum, p) => sum + parseFloat(p.total_cost || 0), 0),
      totalProfit: products.reduce((sum, p) => sum + parseFloat(p.total_profit || 0), 0)
    };

    res.json({ products, summary });
  } catch (error) {
    console.error('Product report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get sales by users report
router.get('/users', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // Build date filter conditions for sales
    const params = [];
    const dateConditions = [];
    
    if (start_date) {
      dateConditions.push('DATE(s.created_at) >= ?');
      params.push(start_date);
    }
    
    if (end_date) {
      dateConditions.push('DATE(s.created_at) <= ?');
      params.push(end_date);
    }

    // Build the query with date filters in the JOIN to ensure only existing sales within date range are included
    let dateFilter = '';
    if (dateConditions.length > 0) {
      dateFilter = ' AND ' + dateConditions.join(' AND ');
    }

    let sql = `SELECT u.id, u.username, u.full_name, u.role,
               COUNT(DISTINCT s.id) as total_sales,
               COALESCE(SUM(s.total), 0) as total_revenue,
               COALESCE(SUM(s.discount_amount), 0) as total_discount,
               COALESCE(SUM(s.vat_amount), 0) as total_vat,
               COALESCE(SUM(si.quantity), 0) as total_items_sold
               FROM users u
               LEFT JOIN sales s ON u.id = s.user_id${dateFilter}
               LEFT JOIN sale_items si ON s.id = si.sale_id
               GROUP BY u.id, u.username, u.full_name, u.role
               HAVING COUNT(DISTINCT s.id) > 0
               ORDER BY total_revenue DESC`;

    const users = await req.db.query(sql, params);
    
    // Calculate summary
    const summary = {
      totalUsers: users.length,
      totalSales: users.reduce((sum, user) => sum + (user.total_sales || 0), 0),
      totalRevenue: users.reduce((sum, user) => sum + parseFloat(user.total_revenue || 0), 0),
      totalItemsSold: users.reduce((sum, user) => sum + (user.total_items_sold || 0), 0)
    };

    res.json({ users, summary });
  } catch (error) {
    console.error('Sales by users report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
