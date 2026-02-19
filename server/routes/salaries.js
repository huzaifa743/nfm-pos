const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getTenantDb, closeTenantDb, requireTenant } = require('../middleware/tenant');
const { preventDemoModifications } = require('../middleware/demoRestriction');

const router = express.Router();

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Generate unique salary record ID
function generateSalaryId() {
  return 'SAL-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
}

// Get dashboard stats
router.get('/dashboard', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const now = new Date();
    const month = MONTHS[now.getMonth()];
    const year = now.getFullYear();

    const totalEmployees = await req.db.get(
      'SELECT COUNT(*) as count FROM employees WHERE status = ?',
      ['active']
    );

    const salaryStats = await req.db.get(
      `SELECT 
        COALESCE(SUM(CASE WHEN status = 'paid' THEN net_pay ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN status IN ('pending', 'partial') THEN remaining_amount ELSE 0 END), 0) as pending_salaries,
        COALESCE(SUM(net_pay), 0) as total_salary_month,
        COALESCE(SUM(commission_amount), 0) as total_commission,
        COALESCE(SUM(basic_salary), 0) as total_basic_salary,
        COALESCE(SUM(advance_deduction), 0) as total_advance_deduction,
        COALESCE(SUM(other_deductions), 0) as total_deductions
       FROM employee_salaries 
       WHERE month = ? AND year = ?`,
      [month, year]
    );

    const advanceStats = await req.db.get(
      `SELECT COALESCE(SUM(amount), 0) as total_advances
       FROM employee_advances 
       WHERE status = 'pending' 
       AND strftime('%Y', created_at) = ? AND strftime('%m', created_at) = ?`,
      [String(year), String(now.getMonth() + 1).padStart(2, '0')]
    );

    // Only count advances from employees who have salary records in the current month
    const totalAdvancesGiven = await req.db.get(
      `SELECT COALESCE(SUM(ea.amount), 0) as total
       FROM employee_advances ea
       INNER JOIN employee_salaries es ON ea.employee_id = es.employee_id
       WHERE ea.status IN ('pending', 'paid')
       AND es.month = ? AND es.year = ?
       AND strftime('%Y', ea.created_at) = ? AND strftime('%m', ea.created_at) = ?`,
      [month, year, String(year), String(now.getMonth() + 1).padStart(2, '0')]
    );

    res.json({
      totalEmployees: totalEmployees?.count || 0,
      totalSalaryThisMonth: parseFloat(salaryStats?.total_salary_month || 0),
      totalBasicSalary: parseFloat(salaryStats?.total_basic_salary || 0),
      totalCommission: parseFloat(salaryStats?.total_commission || 0),
      totalDeductions: parseFloat(salaryStats?.total_deductions || 0),
      totalAdvanceDeduction: parseFloat(salaryStats?.total_advance_deduction || 0),
      totalAdvancesGiven: parseFloat(totalAdvancesGiven?.total || 0),
      totalAdvancesPending: parseFloat(advanceStats?.total_advances || 0),
      pendingSalaries: parseFloat(salaryStats?.pending_salaries || 0),
      totalPaidThisMonth: parseFloat(salaryStats?.total_paid || 0),
    });
  } catch (error) {
    console.error('Salary dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get salary records (with filters)
router.get('/', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { month, year, employee_id, status } = req.query;
    let sql = `SELECT es.*, e.name as employee_name, e.designation, e.commission_rate 
               FROM employee_salaries es 
               JOIN employees e ON es.employee_id = e.id WHERE 1=1`;
    const params = [];

    if (month) { sql += ' AND es.month = ?'; params.push(month); }
    if (year) { sql += ' AND es.year = ?'; params.push(parseInt(year)); }
    if (employee_id) { sql += ' AND es.employee_id = ?'; params.push(employee_id); }
    if (status) { sql += ' AND es.status = ?'; params.push(status); }
    sql += ' ORDER BY es.year DESC, es.month DESC, e.name';

    const salaries = await req.db.query(sql, params);
    res.json(salaries);
  } catch (error) {
    console.error('Get salaries error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single salary record
router.get('/:id', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const salary = await req.db.get(
      `SELECT es.*, e.name as employee_name, e.phone, e.email, e.designation, e.basic_salary
       FROM employee_salaries es 
       JOIN employees e ON es.employee_id = e.id 
       WHERE es.id = ?`,
      [req.params.id]
    );
    if (!salary) return res.status(404).json({ error: 'Salary record not found' });
    res.json(salary);
  } catch (error) {
    console.error('Get salary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate/Calculate salary for month
router.post('/generate', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { month, year, employee_id } = req.body;
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    const employees = employee_id 
      ? await req.db.query('SELECT * FROM employees WHERE id = ? AND status = ?', [employee_id, 'active'])
      : await req.db.query('SELECT * FROM employees WHERE status = ?', ['active']);

    const created = [];
    for (const emp of employees) {
      const existing = await req.db.get(
        'SELECT id FROM employee_salaries WHERE employee_id = ? AND month = ? AND year = ?',
        [emp.id, month, parseInt(year)]
      );
      if (existing) continue;

      const basicSalary = parseFloat(emp.basic_salary) || 0;
      const commissionRate = parseFloat(emp.commission_rate) || 0;

      // Include pending and paid advances that are NOT already linked to a salary record
      // (paid advances that were already linked when paying advance should not be double-counted)
      const pendingAdvances = await req.db.get(
        `SELECT COALESCE(SUM(amount), 0) as total FROM employee_advances 
         WHERE employee_id = ? AND status IN ('pending', 'paid') AND salary_record_id IS NULL`,
        [emp.id]
      );
      const advanceDeduction = parseFloat(pendingAdvances?.total || 0);

      // Calculate commission amount based on commission_rate percentage of basic salary
      // Commission rate is stored as percentage (e.g., 10 means 10%)
      const commissionAmount = commissionRate > 0 ? (basicSalary * commissionRate / 100) : 0;
      const otherAdditions = 0;
      const otherDeductions = 0;

      const grossPay = basicSalary + commissionAmount + otherAdditions;
      const totalDeductions = advanceDeduction + otherDeductions;
      const netPay = Math.max(0, grossPay - totalDeductions);

      const salaryRecordId = await req.db.run(
        `INSERT INTO employee_salaries 
         (employee_id, month, year, basic_salary, commission_amount, other_additions, 
          advance_deduction, other_deductions, net_pay, paid_amount, remaining_amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'pending')`,
        [emp.id, month, parseInt(year), basicSalary, commissionAmount, otherAdditions,
         advanceDeduction, otherDeductions, netPay, netPay]
      );

      // Mark paid and pending advances as deducted and link them to this salary record
      // Only update advances that are not already linked to another salary record
      if (advanceDeduction > 0) {
        await req.db.run(
          `UPDATE employee_advances 
           SET status = 'deducted', salary_record_id = ? 
           WHERE employee_id = ? AND status IN ('pending', 'paid') AND salary_record_id IS NULL`,
          [salaryRecordId.id, emp.id]
        );
      }

      const record = await req.db.get(
        'SELECT es.*, e.name as employee_name FROM employee_salaries es JOIN employees e ON es.employee_id = e.id WHERE es.employee_id = ? AND es.month = ? AND es.year = ?',
        [emp.id, month, parseInt(year)]
      );
      created.push(record);
    }

    res.status(201).json({ created: created.length, records: created });
  } catch (error) {
    console.error('Generate salary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update salary record (deductions, additions, etc.)
router.put('/:id', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { basic_salary, commission_amount, other_additions, advance_deduction, other_deductions, notes } = req.body;
    const record = await req.db.get('SELECT * FROM employee_salaries WHERE id = ?', [req.params.id]);
    if (!record) return res.status(404).json({ error: 'Salary record not found' });

    const basic = basic_salary !== undefined ? parseFloat(basic_salary) : record.basic_salary;
    const commission = commission_amount !== undefined ? parseFloat(commission_amount) : record.commission_amount;
    const additions = other_additions !== undefined ? parseFloat(other_additions) : record.other_additions;
    const advanceDed = advance_deduction !== undefined ? parseFloat(advance_deduction) : record.advance_deduction;
    const otherDed = other_deductions !== undefined ? parseFloat(other_deductions) : record.other_deductions;

    const grossPay = basic + commission + additions;
    const totalDeductions = advanceDed + otherDed;
    const netPay = Math.max(0, grossPay - totalDeductions);
    const remaining = Math.max(0, netPay - (record.paid_amount || 0));

    await req.db.run(
      `UPDATE employee_salaries SET 
       basic_salary = ?, commission_amount = ?, other_additions = ?,
       advance_deduction = ?, other_deductions = ?, net_pay = ?, remaining_amount = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [basic, commission, additions, advanceDed, otherDed, netPay, remaining, notes || null, req.params.id]
    );

    const updated = await req.db.get(
      'SELECT es.*, e.name as employee_name FROM employee_salaries es JOIN employees e ON es.employee_id = e.id WHERE es.id = ?',
      [req.params.id]
    );
    res.json(updated);
  } catch (error) {
    console.error('Update salary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Pay salary (partial or full)
router.post('/:id/pay', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { amount, payment_date, deduction_type, deduction_amount } = req.body;
    const record = await req.db.get('SELECT * FROM employee_salaries WHERE id = ?', [req.params.id]);
    if (!record) return res.status(404).json({ error: 'Salary record not found' });

    // Prevent duplicate payment if already fully paid
    if (record.status === 'paid' && parseFloat(record.remaining_amount || 0) <= 0) {
      return res.status(400).json({ error: 'This salary is already fully paid' });
    }

    const payAmount = amount !== undefined ? parseFloat(amount) : parseFloat(record.remaining_amount || 0);
    if (payAmount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    const currentPaid = parseFloat(record.paid_amount || 0);
    const currentRemaining = parseFloat(record.remaining_amount || 0);
    const currentOtherDeductions = parseFloat(record.other_deductions || 0);

    // Calculate deduction if provided (deduction is added to other_deductions; payment amount is the NET amount we record as paid)
    let deductionValue = 0;
    if (deduction_amount && parseFloat(deduction_amount) > 0) {
      deductionValue = parseFloat(deduction_amount);
      if (deductionValue > currentRemaining) {
        return res.status(400).json({ error: 'Deduction amount cannot exceed remaining amount' });
      }
    }

    // When deduction is set: max net payable = currentRemaining - deductionValue.
    const maxPayable = deductionValue > 0 ? Math.max(0, currentRemaining - deductionValue) : currentRemaining;
    if (payAmount > maxPayable) {
      return res.status(400).json({ error: `Payment amount cannot exceed net payable amount of ${maxPayable}` });
    }
    if (payAmount > currentRemaining) {
      return res.status(400).json({ error: `Payment amount cannot exceed remaining amount of ${currentRemaining}` });
    }

    // Update other_deductions if deduction is provided
    const newOtherDeductions = deductionValue > 0 ? currentOtherDeductions + deductionValue : currentOtherDeductions;
    
    // Recalculate net pay with new deductions
    const grossPay = parseFloat(record.basic_salary || 0) + parseFloat(record.commission_amount || 0) + parseFloat(record.other_additions || 0);
    const totalDeductions = parseFloat(record.advance_deduction || 0) + newOtherDeductions;
    const newNetPay = Math.max(0, grossPay - totalDeductions);
    
    // Payment amount is the NET amount we record as paid; cap by newNetPay
    const newPaid = Math.min(currentPaid + payAmount, newNetPay);
    const newRemaining = Math.max(0, newNetPay - newPaid);
    const status = newRemaining <= 0.01 ? 'paid' : 'partial';

    const paidAt = payment_date || new Date().toISOString().slice(0, 19).replace('T', ' ');

    await req.db.run(
      `UPDATE employee_salaries SET paid_amount = ?, remaining_amount = ?, other_deductions = ?, net_pay = ?, status = ?, paid_at = COALESCE(paid_at, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newPaid, newRemaining, newOtherDeductions, newNetPay, status, paidAt, req.params.id]
    );

    // When salary is fully paid, mark unlinked advances as deducted
    if (newRemaining <= 0.01) {
      await req.db.run(
        `UPDATE employee_advances 
         SET status = 'deducted', salary_record_id = ? 
         WHERE employee_id = ? AND status IN ('pending', 'paid') AND salary_record_id IS NULL`,
        [req.params.id, record.employee_id]
      );
    }

    const updated = await req.db.get(
      'SELECT es.*, e.name as employee_name FROM employee_salaries es JOIN employees e ON es.employee_id = e.id WHERE es.id = ?',
      [req.params.id]
    );
    res.json(updated);
  } catch (error) {
    console.error('Pay salary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Link advance to salary (mark advance as deducted)
router.post('/:id/link-advances', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const record = await req.db.get('SELECT * FROM employee_salaries WHERE id = ?', [req.params.id]);
    if (!record) return res.status(404).json({ error: 'Salary record not found' });

    await req.db.run(
      `UPDATE employee_advances SET status = 'deducted', salary_record_id = ? WHERE employee_id = ? AND status IN ('pending', 'paid')`,
      [req.params.id, record.employee_id]
    );

    const updated = await req.db.get(
      'SELECT es.*, e.name as employee_name FROM employee_salaries es JOIN employees e ON es.employee_id = e.id WHERE es.id = ?',
      [req.params.id]
    );
    res.json(updated);
  } catch (error) {
    console.error('Link advances error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete salary record and restore related advances
router.delete('/:id', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const record = await req.db.get('SELECT * FROM employee_salaries WHERE id = ?', [req.params.id]);
    if (!record) {
      return res.status(404).json({ error: 'Salary record not found' });
    }

    // Start transaction: restore advances that were deducted from this salary
    // When advances are deducted, they're marked as 'deducted' and linked via salary_record_id
    // When deleting salary, restore them to 'paid' status (since they were already given to employee)
    await req.db.run(
      `UPDATE employee_advances 
       SET status = 'paid', salary_record_id = NULL 
       WHERE salary_record_id = ? AND status = 'deducted'`,
      [req.params.id]
    );

    // Delete the salary record
    await req.db.run('DELETE FROM employee_salaries WHERE id = ?', [req.params.id]);

    res.json({ message: 'Salary record deleted successfully' });
  } catch (error) {
    console.error('Delete salary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
