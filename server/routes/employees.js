const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getTenantDb, closeTenantDb, requireTenant } = require('../middleware/tenant');
const { preventDemoModifications } = require('../middleware/demoRestriction');

const router = express.Router();

// Get all employees
router.get('/', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const employees = await req.db.query(
      `SELECT e.*, 
        COALESCE(SUM(CASE WHEN ea.status IN ('pending', 'paid') THEN ea.amount ELSE 0 END), 0) as pending_advances
       FROM employees e
       LEFT JOIN employee_advances ea ON e.id = ea.employee_id AND ea.status IN ('pending', 'paid')
       WHERE e.status = 'active'
       GROUP BY e.id
       ORDER BY e.name`
    );
    res.json(employees);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get employee by ID
router.get('/:id', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const employee = await req.db.get('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json(employee);
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create employee
router.post('/', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { name, phone, email, address, designation, basic_salary, commission_rate } = req.body;
    if (!name || basic_salary === undefined) {
      return res.status(400).json({ error: 'Name and basic salary are required' });
    }
    const result = await req.db.run(
      `INSERT INTO employees (name, phone, email, address, designation, basic_salary, commission_rate) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, phone || null, email || null, address || null, designation || null, parseFloat(basic_salary) || 0, parseFloat(commission_rate) || 0]
    );
    const employee = await req.db.get('SELECT * FROM employees WHERE id = ?', [result.id]);
    res.status(201).json(employee);
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update employee
router.put('/:id', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { name, phone, email, address, designation, basic_salary, commission_rate, status } = req.body;
    await req.db.run(
      `UPDATE employees SET name = ?, phone = ?, email = ?, address = ?, designation = ?, 
       basic_salary = ?, commission_rate = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, phone || null, email || null, address || null, designation || null, 
       parseFloat(basic_salary) || 0, parseFloat(commission_rate) || 0, status || 'active', req.params.id]
    );
    const employee = await req.db.get('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    res.json(employee);
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete employee and all related data
router.delete('/:id', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const employeeId = req.params.id;
    
    // Delete all employee advances
    await req.db.run('DELETE FROM employee_advances WHERE employee_id = ?', [employeeId]);
    
    // Delete all employee salaries
    await req.db.run('DELETE FROM employee_salaries WHERE employee_id = ?', [employeeId]);
    
    // Delete the employee
    await req.db.run('DELETE FROM employees WHERE id = ?', [employeeId]);
    
    res.json({ message: 'Employee and all related data deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get employee advances
router.get('/:id/advances', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const advances = await req.db.query(
      'SELECT * FROM employee_advances WHERE employee_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(advances);
  } catch (error) {
    console.error('Get advances error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add advance
router.post('/:id/advances', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { amount, reason, payment_date } = req.body;
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    const amt = parseFloat(amount);
    // If payment_date is provided, this is a direct advance payment - mark as 'paid'
    // Otherwise, it's pending (will be deducted from salary later)
    const status = payment_date ? 'paid' : 'pending';
    const createdAt = payment_date ? payment_date + ' 12:00:00' : null;
    const result = await req.db.run(
      createdAt 
        ? 'INSERT INTO employee_advances (employee_id, amount, reason, status, created_at) VALUES (?, ?, ?, ?, ?)'
        : 'INSERT INTO employee_advances (employee_id, amount, reason, status) VALUES (?, ?, ?, ?)',
      createdAt ? [req.params.id, amt, reason || null, status, createdAt] : [req.params.id, amt, reason || null, status]
    );
    const advance = await req.db.get('SELECT * FROM employee_advances WHERE id = ?', [result.id]);
    
    // If advance is paid and payment_date is provided, update/create salary record for current month
    if (payment_date && status === 'paid') {
      const paymentDate = new Date(payment_date);
      const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const currentMonth = MONTHS[paymentDate.getMonth()];
      const currentYear = paymentDate.getFullYear();
      
      // Check if salary record exists for this month
      let salaryRecord = await req.db.get(
        'SELECT * FROM employee_salaries WHERE employee_id = ? AND month = ? AND year = ?',
        [req.params.id, currentMonth, currentYear]
      );
      
      if (salaryRecord) {
        // Update existing salary record - add advance to deduction and recalculate
        const currentAdvanceDeduction = parseFloat(salaryRecord.advance_deduction || 0);
        const newAdvanceDeduction = currentAdvanceDeduction + amt;
        const grossPay = parseFloat(salaryRecord.basic_salary || 0) + parseFloat(salaryRecord.commission_amount || 0) + parseFloat(salaryRecord.other_additions || 0);
        const totalDeductions = newAdvanceDeduction + parseFloat(salaryRecord.other_deductions || 0);
        const newNetPay = Math.max(0, grossPay - totalDeductions);
        const newRemaining = Math.max(0, newNetPay - parseFloat(salaryRecord.paid_amount || 0));
        
        await req.db.run(
          `UPDATE employee_salaries 
           SET advance_deduction = ?, net_pay = ?, remaining_amount = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [newAdvanceDeduction, newNetPay, newRemaining, salaryRecord.id]
        );
        
        // Link advance to salary record (only if not already linked)
        await req.db.run(
          'UPDATE employee_advances SET salary_record_id = ? WHERE id = ? AND salary_record_id IS NULL',
          [salaryRecord.id, result.id]
        );
      } else {
        // Create new salary record for this month with advance deduction
        const employee = await req.db.get('SELECT * FROM employees WHERE id = ?', [req.params.id]);
        const basicSalary = parseFloat(employee.basic_salary || 0);
        const commissionRate = parseFloat(employee.commission_rate || 0);
        const commissionAmount = commissionRate > 0 ? (basicSalary * commissionRate / 100) : 0;
        const grossPay = basicSalary + commissionAmount;
        const totalDeductions = amt;
        const netPay = Math.max(0, grossPay - totalDeductions);
        
        const salaryResult = await req.db.run(
          `INSERT INTO employee_salaries 
           (employee_id, month, year, basic_salary, commission_amount, other_additions, 
            advance_deduction, other_deductions, net_pay, paid_amount, remaining_amount, status)
           VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?, 0, ?, 'pending')`,
          [req.params.id, currentMonth, currentYear, basicSalary, commissionAmount, amt, netPay, netPay]
        );
        
        // Link advance to salary record (only if not already linked)
        await req.db.run(
          'UPDATE employee_advances SET salary_record_id = ? WHERE id = ? AND salary_record_id IS NULL',
          [salaryResult.id, result.id]
        );
      }
    }
    
    res.status(201).json(advance);
  } catch (error) {
    console.error('Add advance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get employee salaries
router.get('/:id/salaries', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { month, year } = req.query;
    let sql = 'SELECT * FROM employee_salaries WHERE employee_id = ?';
    const params = [req.params.id];
    if (month) { sql += ' AND month = ?'; params.push(month); }
    if (year) { sql += ' AND year = ?'; params.push(year); }
    sql += ' ORDER BY year DESC, month DESC';
    const salaries = await req.db.query(sql, params);
    res.json(salaries);
  } catch (error) {
    console.error('Get salaries error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get employee ledger
router.get('/:id/ledger', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const ledger = [];
    
    // Advances
    let advSql = `SELECT 'advance' as type, id, amount, reason as description, created_at, status 
                  FROM employee_advances WHERE employee_id = ?`;
    const advParams = [req.params.id];
    if (start_date) { advSql += ' AND DATE(created_at) >= ?'; advParams.push(start_date); }
    if (end_date) { advSql += ' AND DATE(created_at) <= ?'; advParams.push(end_date); }
    advSql += ' ORDER BY created_at';
    const advances = await req.db.query(advSql, advParams);
    advances.forEach(a => ledger.push({ ...a, debit: parseFloat(a.amount || 0), credit: 0 }));

    // Salary payments
    let salSql = `SELECT 'salary' as type, id, paid_amount as amount, 
                  month || '/' || year as description, paid_at as created_at, status 
                  FROM employee_salaries WHERE employee_id = ? AND paid_amount > 0`;
    const salParams = [req.params.id];
    if (start_date) { salSql += ' AND DATE(paid_at) >= ?'; salParams.push(start_date); }
    if (end_date) { salSql += ' AND DATE(paid_at) <= ?'; salParams.push(end_date); }
    salSql += ' ORDER BY paid_at';
    const salaries = await req.db.query(salSql, salParams);
    salaries.forEach(s => ledger.push({ ...s, debit: 0, credit: parseFloat(s.amount || 0) }));

    ledger.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    // Calculate running balance
    let balance = 0;
    const ledgerWithBalance = ledger.map(t => {
      balance += (parseFloat(t.debit || 0) - parseFloat(t.credit || 0));
      return { ...t, balance: parseFloat(balance.toFixed(2)) };
    });
    
    const employee = await req.db.get('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    
    res.json({ ledger: ledgerWithBalance, employee, closingBalance: parseFloat(balance.toFixed(2)) });
  } catch (error) {
    console.error('Get ledger error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
