const express = require('express');
const bcrypt = require('bcryptjs');
const { masterDbHelpers } = require('../tenantManager');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logActivity, getActivityLog } = require('../activityLog');

const router = express.Router();

// All routes require super_admin
router.use(authenticateToken, requireRole('super_admin'));

// GET /api/superadmin/activity — activity log for superadmin
router.get('/activity', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
    const offset = parseInt(req.query.offset, 10) || 0;
    const actorType = req.query.actor_type || null;
    const action = req.query.action || null;
    const rows = await getActivityLog(limit, offset, actorType, action);
    res.json(rows);
  } catch (error) {
    console.error('Activity log error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/superadmin/me — change super_admin username and/or password
router.patch('/me', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username && !password) {
      return res.status(400).json({ error: 'Provide username and/or password to update' });
    }
    const updates = [];
    const values = [];
    if (username) {
      updates.push('username = ?');
      values.push(username);
    }
    if (password) {
      updates.push('password = ?');
      values.push(await bcrypt.hash(password, 10));
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.user.id);
    await masterDbHelpers.run(
      `UPDATE super_admins SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    await logActivity('super_admin', req.user.id, req.user.username, 'credentials_changed', 'super_admin', req.user.id, { updated: username ? 'username' : '', updated_password: !!password });
    res.json({ message: 'Credentials updated. Please log in again with new credentials.' });
  } catch (error) {
    console.error('Update super_admin me error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/superadmin/admins — list platform admins
router.get('/admins', async (req, res) => {
  try {
    const admins = await masterDbHelpers.query(
      'SELECT id, username, full_name, email, created_at, updated_at FROM admins ORDER BY created_at DESC'
    );
    res.json(admins);
  } catch (error) {
    console.error('List admins error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/superadmin/admins — create platform admin
router.post('/admins', async (req, res) => {
  try {
    const { username, password, full_name, email } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await masterDbHelpers.run(
      'INSERT INTO admins (username, password, full_name, email) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, full_name || null, email || null]
    );
    await logActivity('super_admin', req.user.id, req.user.username, 'admin_created', 'admin', result.id, { username });
    const admin = await masterDbHelpers.get(
      'SELECT id, username, full_name, email, created_at FROM admins WHERE id = ?',
      [result.id]
    );
    res.status(201).json(admin);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/superadmin/admins/:id — update platform admin username/password
router.put('/admins/:id', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await masterDbHelpers.get('SELECT id FROM admins WHERE id = ?', [req.params.id]);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    const updates = [];
    const values = [];
    if (username != null) {
      updates.push('username = ?');
      values.push(username);
    }
    if (password) {
      updates.push('password = ?');
      values.push(await bcrypt.hash(password, 10));
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Provide username and/or password to update' });
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);
    await masterDbHelpers.run(
      `UPDATE admins SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    await logActivity('super_admin', req.user.id, req.user.username, 'credentials_changed', 'admin', parseInt(req.params.id, 10), {});
    const updated = await masterDbHelpers.get(
      'SELECT id, username, full_name, email, created_at, updated_at FROM admins WHERE id = ?',
      [req.params.id]
    );
    res.json(updated);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    console.error('Update admin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/superadmin/admins/:id — delete platform admin
router.delete('/admins/:id', async (req, res) => {
  try {
    const admin = await masterDbHelpers.get('SELECT id, username FROM admins WHERE id = ?', [req.params.id]);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    await masterDbHelpers.run('DELETE FROM admins WHERE id = ?', [req.params.id]);
    await logActivity('super_admin', req.user.id, req.user.username, 'admin_deleted', 'admin', parseInt(req.params.id, 10), { username: admin.username });
    res.json({ message: 'Admin deleted' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
