const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getTenantDb, closeTenantDb, requireTenant } = require('../middleware/tenant');

const router = express.Router();

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Monthly salary report
router.get('/monthly', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { month, year, start_date, end_date } = req.query;

    let sql = `SELECT es.*, e.name as employee_name, e.designation 
               FROM employee_salaries es 
               JOIN employees e ON es.employee_id = e.id WHERE 1=1`;
    const params = [];

    if (month) { sql += ' AND es.month = ?'; params.push(month); }
    if (year) { sql += ' AND es.year = ?'; params.push(parseInt(year)); }
    if (start_date && end_date) {
      sql += ` AND (es.year * 100 + CASE es.month 
        WHEN 'January' THEN 1 WHEN 'February' THEN 2 WHEN 'March' THEN 3 WHEN 'April' THEN 4 
        WHEN 'May' THEN 5 WHEN 'June' THEN 6 WHEN 'July' THEN 7 WHEN 'August' THEN 8 
        WHEN 'September' THEN 9 WHEN 'October' THEN 10 WHEN 'November' THEN 11 WHEN 'December' THEN 12 END)
        BETWEEN (CAST(strftime('%Y', ?) AS INT) * 100 + CAST(strftime('%m', ?) AS INT))
        AND (CAST(strftime('%Y', ?) AS INT) * 100 + CAST(strftime('%m', ?) AS INT))`;
      params.push(start_date, start_date, end_date, end_date);
    }

    sql += ' ORDER BY es.year DESC, es.month DESC, e.name';
    const records = await req.db.query(sql, params);

    const summary = {
      totalRecords: records.length,
      totalBasicSalary: records.reduce((s, r) => s + parseFloat(r.basic_salary || 0), 0),
      totalAdditions: records.reduce((s, r) => s + parseFloat(r.commission_amount || 0) + parseFloat(r.other_additions || 0), 0),
      totalDeductions: records.reduce((s, r) => s + parseFloat(r.advance_deduction || 0) + parseFloat(r.other_deductions || 0), 0),
      totalNetPay: records.reduce((s, r) => s + parseFloat(r.net_pay || 0), 0),
      totalPaid: records.reduce((s, r) => s + parseFloat(r.paid_amount || 0), 0),
      totalRemaining: records.reduce((s, r) => s + parseFloat(r.remaining_amount || 0), 0),
    };

    res.json({ records, summary });
  } catch (error) {
    console.error('Monthly salary report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Advance report (enhanced with salary remaining info)
router.get('/advances', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { start_date, end_date, employee_id, status } = req.query;

    let sql = `SELECT ea.*, e.name as employee_name, e.basic_salary,
               (SELECT COALESCE(SUM(amount), 0) FROM employee_advances ea2 
                WHERE ea2.employee_id = e.id AND ea2.status IN ('pending', 'paid')) as pending_advances_total,
               (SELECT COALESCE(SUM(remaining_amount), 0) FROM employee_salaries es 
                WHERE es.employee_id = e.id AND es.status IN ('pending', 'partial')) as total_salary_remaining
               FROM employee_advances ea 
               JOIN employees e ON ea.employee_id = e.id WHERE 1=1`;
    const params = [];

    if (start_date) { sql += ' AND DATE(ea.created_at) >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND DATE(ea.created_at) <= ?'; params.push(end_date); }
    if (employee_id) { sql += ' AND ea.employee_id = ?'; params.push(employee_id); }
    if (status) { sql += ' AND ea.status = ?'; params.push(status); }
    sql += ' ORDER BY ea.created_at DESC';

    const advances = await req.db.query(sql, params);

    // Get current month salary info for each employee
    const now = new Date();
    const currentMonth = ['January','February','March','April','May','June','July','August','September','October','November','December'][now.getMonth()];
    const currentYear = now.getFullYear();
    
    const advancesWithSalary = await Promise.all(advances.map(async (advance) => {
      const salaryInfo = await req.db.get(
        `SELECT remaining_amount, status, month, year, net_pay, paid_amount 
         FROM employee_salaries 
         WHERE employee_id = ? AND month = ? AND year = ? 
         ORDER BY id DESC LIMIT 1`,
        [advance.employee_id, currentMonth, currentYear]
      );
      return {
        ...advance,
        current_month_salary_remaining: salaryInfo ? parseFloat(salaryInfo.remaining_amount || 0) : null,
        current_month_salary_status: salaryInfo?.status || null,
        current_month_net_pay: salaryInfo ? parseFloat(salaryInfo.net_pay || 0) : null,
        current_month_paid: salaryInfo ? parseFloat(salaryInfo.paid_amount || 0) : null,
      };
    }));

    const summary = {
      totalAdvances: advances.length,
      totalAmount: advances.reduce((s, a) => s + parseFloat(a.amount || 0), 0),
      pendingAmount: advances.filter(a => a.status === 'pending' || a.status === 'paid').reduce((s, a) => s + parseFloat(a.amount || 0), 0),
      deductedAmount: advances.filter(a => a.status === 'deducted').reduce((s, a) => s + parseFloat(a.amount || 0), 0),
      paidAmount: advances.filter(a => a.status === 'paid').reduce((s, a) => s + parseFloat(a.amount || 0), 0),
      totalSalaryRemaining: advancesWithSalary.reduce((s, a) => s + (a.current_month_salary_remaining || 0), 0),
    };

    res.json({ advances: advancesWithSalary, summary });
  } catch (error) {
    console.error('Advance report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Employee ledger report
router.get('/ledger', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { employee_id, start_date, end_date } = req.query;
    if (!employee_id) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    const ledger = [];
    let advSql = `SELECT 'advance' as type, id, amount, reason as description, created_at, status 
                  FROM employee_advances WHERE employee_id = ?`;
    const advParams = [employee_id];
    if (start_date) { advSql += ' AND DATE(created_at) >= ?'; advParams.push(start_date); }
    if (end_date) { advSql += ' AND DATE(created_at) <= ?'; advParams.push(end_date); }
    advSql += ' ORDER BY created_at';
    const advances = await req.db.query(advSql, advParams);
    advances.forEach(a => ledger.push({ ...a, debit: parseFloat(a.amount), credit: 0 }));

    let salSql = `SELECT 'salary' as type, id, paid_amount as amount, 
                  month || '/' || year as description, paid_at as created_at, status 
                  FROM employee_salaries WHERE employee_id = ? AND paid_amount > 0`;
    const salParams = [employee_id];
    if (start_date) { salSql += ' AND DATE(paid_at) >= ?'; salParams.push(start_date); }
    if (end_date) { salSql += ' AND DATE(paid_at) <= ?'; salParams.push(end_date); }
    salSql += ' ORDER BY paid_at';
    const salaries = await req.db.query(salSql, salParams);
    salaries.forEach(s => ledger.push({ ...s, debit: 0, credit: parseFloat(s.amount) }));

    ledger.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    let balance = 0;
    const withBalance = ledger.map(t => {
      balance += (parseFloat(t.debit || 0) - parseFloat(t.credit || 0));
      return { ...t, balance: parseFloat(balance.toFixed(2)) };
    });

    const employee = await req.db.get('SELECT * FROM employees WHERE id = ?', [employee_id]);

    res.json({ ledger: withBalance, employee, closingBalance: parseFloat(balance.toFixed(2)) });
  } catch (error) {
    console.error('Ledger report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
