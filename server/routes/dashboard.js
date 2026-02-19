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
    const yesterdayCondition = "DATE(created_at) = DATE('now', '-1 day')";
    const lastWeekCondition = "DATE(created_at) >= DATE('now', '-7 days') AND DATE(created_at) < DATE('now')";

    // Total Sales Today (count)
    const salesToday = await req.db.get(
      `SELECT COUNT(*) as count FROM sales WHERE ${todayCondition}`
    );

    // Total Revenue Today
    const revenueToday = await req.db.get(
      `SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE ${todayCondition}`
    );

    // Sales Yesterday (for comparison)
    const salesYesterday = await req.db.get(
      `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE ${yesterdayCondition}`
    );

    // Sales Last Week (for comparison)
    const salesLastWeek = await req.db.get(
      `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE ${lastWeekCondition}`
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

    // Recent Sales (Last 10)
    const recentSales = await req.db.query(
      `SELECT s.id, s.total, s.created_at, s.payment_method, 
              c.name as customer_name, u.username as user_name
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       LEFT JOIN users u ON s.user_id = u.id
       ORDER BY s.created_at DESC
       LIMIT 10`
    );

    // Low Stock Products (stock_tracking_enabled = 1 and stock_quantity <= 10)
    const lowStockProducts = await req.db.query(
      `SELECT id, name, stock_quantity, price
       FROM products
       WHERE stock_tracking_enabled = 1 AND stock_quantity <= 10
       ORDER BY stock_quantity ASC
       LIMIT 10`
    );

    // Customer Statistics
    const totalCustomers = await req.db.get('SELECT COUNT(*) as count FROM customers');
    const newCustomersToday = await req.db.get(
      `SELECT COUNT(*) as count FROM customers WHERE ${todayCondition}`
    );

    // Employee Statistics
    const totalEmployees = await req.db.get('SELECT COUNT(*) as count FROM employees WHERE status = ?', ['active']);
    const now = new Date();
    const currentMonth = ['January','February','March','April','May','June','July','August','September','October','November','December'][now.getMonth()];
    const currentYear = now.getFullYear();
    const salaryStats = await req.db.get(
      `SELECT 
        COALESCE(SUM(CASE WHEN status = 'paid' THEN net_pay ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN status IN ('pending', 'partial') THEN remaining_amount ELSE 0 END), 0) as pending_salaries,
        COALESCE(SUM(net_pay), 0) as total_salary_month,
        COALESCE(SUM(commission_amount), 0) as total_commission,
        COALESCE(SUM(basic_salary), 0) as total_basic_salary
       FROM employee_salaries 
       WHERE month = ? AND year = ?`,
      [currentMonth, currentYear]
    );

    // Supplier Statistics
    const totalSuppliers = await req.db.get('SELECT COUNT(*) as count FROM suppliers WHERE status = ?', ['active']);
    const supplierBalance = await req.db.get('SELECT COALESCE(SUM(balance), 0) as total FROM suppliers WHERE status = ?', ['active']);

    // Purchase Order Statistics
    const totalPOs = await req.db.get('SELECT COUNT(*) as count FROM purchase_orders');
    const pendingPOs = await req.db.get("SELECT COUNT(*) as count FROM purchase_orders WHERE status IN ('draft', 'confirmed')");

    // Expense Statistics (This Month)
    const expenseStats = await req.db.get(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM expenses 
       WHERE strftime('%Y', expense_date) = ? AND strftime('%m', expense_date) = ?`,
      [String(currentYear), String(now.getMonth() + 1).padStart(2, '0')]
    );

    // Cash Balance (includes sales that are already in cash_transactions)
    const cashBalance = await req.db.get('SELECT balance_after FROM cash_transactions ORDER BY id DESC LIMIT 1');
    const cashBalanceValue = cashBalance ? parseFloat(cashBalance.balance_after) : 0;
    
    // For sales created before cash_transactions integration, add them separately
    // (New sales are already added to cash_transactions when created)
    const cashSalesNotRecorded = await req.db.get(
      `SELECT COALESCE(SUM(s.total), 0) as total 
       FROM sales s 
       LEFT JOIN cash_transactions ct ON ct.reference_type = 'sale' AND ct.reference_id = s.id
       WHERE s.payment_method = 'cash' AND ct.id IS NULL`
    );
    const totalCashBalance = cashBalanceValue + parseFloat(cashSalesNotRecorded?.total || 0);

    // Calculate comparison percentages
    const revenueVsYesterday = salesYesterday.total > 0 
      ? ((revenueToday.total - salesYesterday.total) / salesYesterday.total * 100).toFixed(1)
      : revenueToday.total > 0 ? '100.0' : '0.0';
    
    const salesVsYesterday = salesYesterday.count > 0
      ? ((salesToday.count - salesYesterday.count) / salesYesterday.count * 100).toFixed(1)
      : salesToday.count > 0 ? '100.0' : '0.0';

    const revenueVsLastWeek = salesLastWeek.total > 0
      ? ((revenueToday.total - (salesLastWeek.total / 7)) / (salesLastWeek.total / 7) * 100).toFixed(1)
      : revenueToday.total > 0 ? '100.0' : '0.0';

    const salesVsLastWeek = salesLastWeek.count > 0
      ? ((salesToday.count - (salesLastWeek.count / 7)) / (salesLastWeek.count / 7) * 100).toFixed(1)
      : salesToday.count > 0 ? '100.0' : '0.0';

    res.json({
      totalSalesToday: salesToday.count,
      totalRevenueToday: revenueToday.total,
      totalProducts: totalProducts.count,
      totalCategories: totalCategories.count,
      avgSaleValue: avgSaleValue.avg,
      topProducts: topProducts,
      recentSales: recentSales,
      lowStockProducts: lowStockProducts,
      totalCustomers: totalCustomers.count,
      newCustomersToday: newCustomersToday.count,
      // New module stats
      totalEmployees: totalEmployees.count,
      totalSalaryThisMonth: parseFloat(salaryStats?.total_salary_month || 0),
      totalBasicSalary: parseFloat(salaryStats?.total_basic_salary || 0),
      totalCommission: parseFloat(salaryStats?.total_commission || 0),
      pendingSalaries: parseFloat(salaryStats?.pending_salaries || 0),
      totalSuppliers: totalSuppliers.count,
      supplierBalance: parseFloat(supplierBalance?.total || 0),
      totalPurchaseOrders: totalPOs.count,
      pendingPurchaseOrders: pendingPOs.count,
      totalExpensesThisMonth: parseFloat(expenseStats?.total || 0),
      cashBalance: totalCashBalance,
      comparisons: {
        revenueVsYesterday: parseFloat(revenueVsYesterday),
        salesVsYesterday: parseFloat(salesVsYesterday),
        revenueVsLastWeek: parseFloat(revenueVsLastWeek),
        salesVsLastWeek: parseFloat(salesVsLastWeek),
        yesterdayRevenue: salesYesterday.total,
        yesterdaySales: salesYesterday.count,
        lastWeekAvgRevenue: salesLastWeek.total / 7,
        lastWeekAvgSales: salesLastWeek.count / 7
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get chart data
router.get('/charts', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { period = 'today' } = req.query; // today, 7, 30, month
    
    let dateCondition = '';
    let params = [];
    
    // Handle different period types
    if (period === 'today') {
      dateCondition = "DATE(created_at) = DATE('now')";
    } else if (period === 'month') {
      dateCondition = "DATE(created_at) >= DATE('now', 'start of month')";
    } else {
      const days = parseInt(period) || 7;
      dateCondition = "DATE(created_at) >= DATE('now', '-' || ? || ' days')";
      params.push(days);
    }

    // Sales over time
    let salesOverTime;
    if (period === 'today') {
      // For today, group by hour
      salesOverTime = await req.db.query(
        `SELECT strftime('%H:00', created_at) as date, COUNT(*) as count, SUM(total) as revenue
         FROM sales
         WHERE ${dateCondition}
         GROUP BY strftime('%H', created_at)
         ORDER BY date ASC`
      );
    } else {
      // For other periods, group by date
      salesOverTime = await req.db.query(
        `SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total) as revenue
         FROM sales
         WHERE ${dateCondition}
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        params
      );
    }

    // Revenue by payment method
    const revenueByPayment = await req.db.query(
      `SELECT payment_method, SUM(total) as total
       FROM sales
       WHERE ${dateCondition}
       GROUP BY payment_method`,
      params
    );

    // Top categories
    let topCategoriesQuery;
    let topCategoriesParams = [];
    
    if (period === 'today') {
      topCategoriesQuery = `SELECT c.name, SUM(si.total_price) as revenue, SUM(si.quantity) as quantity
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       JOIN categories c ON p.category_id = c.id
       JOIN sales s ON si.sale_id = s.id
       WHERE DATE(s.created_at) = DATE('now')
       GROUP BY c.id, c.name
       ORDER BY revenue DESC
       LIMIT 10`;
    } else if (period === 'month') {
      topCategoriesQuery = `SELECT c.name, SUM(si.total_price) as revenue, SUM(si.quantity) as quantity
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       JOIN categories c ON p.category_id = c.id
       JOIN sales s ON si.sale_id = s.id
       WHERE DATE(s.created_at) >= DATE('now', 'start of month')
       GROUP BY c.id, c.name
       ORDER BY revenue DESC
       LIMIT 10`;
    } else {
      const days = parseInt(period) || 7;
      topCategoriesQuery = `SELECT c.name, SUM(si.total_price) as revenue, SUM(si.quantity) as quantity
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       JOIN categories c ON p.category_id = c.id
       JOIN sales s ON si.sale_id = s.id
       WHERE DATE(s.created_at) >= DATE('now', '-' || ? || ' days')
       GROUP BY c.id, c.name
       ORDER BY revenue DESC
       LIMIT 10`;
      topCategoriesParams.push(days);
    }
    
    const topCategories = await req.db.query(topCategoriesQuery, topCategoriesParams);

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
