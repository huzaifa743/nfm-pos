const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getTenantDb, closeTenantDb, requireTenant } = require('../middleware/tenant');

const router = express.Router();

// Get dashboard stats
router.get('/stats', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    // Use SQLite's date functions to handle timezone correctly
    // DATE('now') gets today's date in SQLite's local time
    const todayCondition = "DATE(created_at) = DATE('now')";

    // Total Sales Today (count)
    const salesToday = await req.db.get(
      `SELECT COUNT(*) as count FROM sales WHERE ${todayCondition}`
    );

    // Total Revenue Today
    const revenueToday = await req.db.get(
      `SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE ${todayCondition}`
    );

    // Total Products
    const totalProducts = await req.db.get('SELECT COUNT(*) as count FROM products');

    // Total Categories
    const totalCategories = await req.db.get('SELECT COUNT(*) as count FROM categories');

    // Average Sale Value Today
    const avgSaleValue = await req.db.get(
      `SELECT COALESCE(AVG(total), 0) as avg FROM sales WHERE ${todayCondition}`
    );

    // High Selling Products (Top 5)
    const topProducts = await req.db.query(
      `SELECT p.name, p.id, SUM(si.quantity) as total_quantity, SUM(si.total_price) as total_revenue
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       JOIN sales s ON si.sale_id = s.id
       WHERE DATE(s.created_at) = DATE('now')
       GROUP BY p.id, p.name
       ORDER BY total_quantity DESC
       LIMIT 5`
    );

    res.json({
      totalSalesToday: salesToday.count,
      totalRevenueToday: revenueToday.total,
      totalProducts: totalProducts.count,
      totalCategories: totalCategories.count,
      avgSaleValue: avgSaleValue.avg,
      topProducts: topProducts
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get chart data
router.get('/charts', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { period = '7' } = req.query; // days
    const days = parseInt(period);

    // Sales over time
    const salesOverTime = await req.db.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total) as revenue
       FROM sales
       WHERE DATE(created_at) >= DATE('now', '-' || ? || ' days')
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [days]
    );

    // Revenue by payment method
    const revenueByPayment = await req.db.query(
      `SELECT payment_method, SUM(total) as total
       FROM sales
       WHERE DATE(created_at) >= DATE('now', '-' || ? || ' days')
       GROUP BY payment_method`,
      [days]
    );

    // Top categories
    const topCategories = await req.db.query(
      `SELECT c.name, SUM(si.total_price) as revenue, SUM(si.quantity) as quantity
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       JOIN categories c ON p.category_id = c.id
       JOIN sales s ON si.sale_id = s.id
       WHERE DATE(s.created_at) >= DATE('now', '-' || ? || ' days')
       GROUP BY c.id, c.name
       ORDER BY revenue DESC
       LIMIT 10`,
      [days]
    );

    res.json({
      salesOverTime,
      revenueByPayment,
      topCategories
    });
  } catch (error) {
    console.error('Dashboard charts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
