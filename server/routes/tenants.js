const express = require('express');
const bcrypt = require('bcryptjs');
const { masterDbHelpers, createTenantDatabase, getTenantDatabase, createDbHelpers } = require('../tenantManager');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logActivity } = require('../activityLog');

const router = express.Router();

// Generate unique tenant code
function generateTenantCode(restaurantName) {
  const timestamp = Date.now();
  const namePart = restaurantName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 6);
  return `${namePart}${timestamp}`.substring(0, 20);
}

// Create new tenant: super_admin creates immediately; admin creates pending (needs approval)
router.post('/', authenticateToken, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const {
      restaurant_name,
      owner_name,
      owner_email,
      owner_phone,
      username,
      password,
      valid_until
    } = req.body;
    const isSuperAdmin = req.user.role === 'super_admin';

    if (!restaurant_name || !owner_name || !owner_email || !username || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const tenant_code = generateTenantCode(restaurant_name);
    const hashedPassword = await bcrypt.hash(password, 10);

    if (isSuperAdmin) {
      // Super admin: create tenant and DB immediately
      const result = await masterDbHelpers.run(
        `INSERT INTO tenants (tenant_code, restaurant_name, owner_name, owner_email, owner_phone, username, password, status, valid_until, created_by_type, created_by_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'inactive', ?, 'super_admin', ?)`,
        [tenant_code, restaurant_name, owner_name, owner_email, owner_phone || null, username, hashedPassword, valid_until || null, req.user.id]
      );

      try {
        await createTenantDatabase(tenant_code);
        const tenantDb = await getTenantDatabase(tenant_code);
        const db = createDbHelpers(tenantDb);
        await db.run(
          'INSERT INTO users (username, email, password, role, full_name) VALUES (?, ?, ?, ?, ?)',
          [username, owner_email, hashedPassword, 'admin', owner_name]
        );
        await db.run(
          'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
          ['restaurant_name', restaurant_name]
        );
        await db.close();

        const tenant = await masterDbHelpers.get(
          'SELECT id, tenant_code, restaurant_name, owner_name, owner_email, owner_phone, username, status, created_at, updated_at, valid_until FROM tenants WHERE id = ?',
          [result.id]
        );
        await logActivity('super_admin', req.user.id, req.user.username, 'tenant_created', 'tenant', result.id, { tenant_code, restaurant_name });
        res.status(201).json({
          message: 'Tenant created successfully',
          tenant: { ...tenant, password: undefined }
        });
      } catch (dbError) {
        await masterDbHelpers.run('DELETE FROM tenants WHERE id = ?', [result.id]);
        throw dbError;
      }
    } else {
      // Admin: create with status 'pending' — no tenant DB until super_admin approves
      const result = await masterDbHelpers.run(
        `INSERT INTO tenants (tenant_code, restaurant_name, owner_name, owner_email, owner_phone, username, password, status, valid_until, created_by_type, created_by_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, 'admin', ?)`,
        [tenant_code, restaurant_name, owner_name, owner_email, owner_phone || null, username, hashedPassword, valid_until || null, req.user.id]
      );
      await logActivity('admin', req.user.id, req.user.username, 'tenant_request_created', 'tenant', result.id, { tenant_code, restaurant_name });
      const tenant = await masterDbHelpers.get(
        'SELECT id, tenant_code, restaurant_name, owner_name, owner_email, owner_phone, username, status, created_at, updated_at, valid_until FROM tenants WHERE id = ?',
        [result.id]
      );
      res.status(201).json({
        message: 'Tenant request submitted. It will be created after super admin approval.',
        tenant: { ...tenant, password: undefined }
      });
    }
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    console.error('Create tenant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all tenants (super_admin and platform admin)
router.get('/', authenticateToken, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const tenants = await masterDbHelpers.query(
      `SELECT id, tenant_code, restaurant_name, owner_name, owner_email, owner_phone, username, status, created_at, updated_at, valid_until, created_by_type, created_by_id
       FROM tenants ORDER BY created_at DESC`
    );
    res.json(tenants);
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single tenant
router.get('/:id', authenticateToken, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const tenant = await masterDbHelpers.get(
      'SELECT id, tenant_code, restaurant_name, owner_name, owner_email, owner_phone, username, status, created_at, updated_at, valid_until, created_by_type, created_by_id FROM tenants WHERE id = ?',
      [req.params.id]
    );

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(tenant);
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update tenant: super_admin full update; admin can only change status (active/inactive) for non-pending
router.put('/:id', authenticateToken, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'super_admin';
    const tenant = await masterDbHelpers.get('SELECT id, status FROM tenants WHERE id = ?', [req.params.id]);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    if (isSuperAdmin) {
      const {
        restaurant_name,
        owner_name,
        owner_email,
        owner_phone,
        status,
        valid_until
      } = req.body;
      const updates = [];
      const values = [];
      if (restaurant_name != null) { updates.push('restaurant_name = ?'); values.push(restaurant_name); }
      if (owner_name != null) { updates.push('owner_name = ?'); values.push(owner_name); }
      if (owner_email != null) { updates.push('owner_email = ?'); values.push(owner_email); }
      if (owner_phone !== undefined) { updates.push('owner_phone = ?'); values.push(owner_phone); }
      if (status != null) { updates.push('status = ?'); values.push(status); }
      if (valid_until != null) { updates.push('valid_until = ?'); values.push(valid_until); }
      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(req.params.id);
      await masterDbHelpers.run(`UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`, values);
    } else {
      // Admin: only status change, and only for non-pending tenants
      const { status } = req.body;
      if (tenant.status === 'pending') {
        return res.status(403).json({ error: 'Cannot change status of pending tenant. Wait for super admin approval.' });
      }
      if (!status || !['active', 'inactive'].includes(status)) {
        return res.status(400).json({ error: 'Admin can only set status to active or inactive' });
      }
      const previousStatus = tenant.status;
      await masterDbHelpers.run(
        "UPDATE tenants SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [status, req.params.id]
      );
      await logActivity('admin', req.user.id, req.user.username, 'tenant_status_changed', 'tenant', parseInt(req.params.id, 10), { from: previousStatus, to: status });
    }

    const updated = await masterDbHelpers.get(
      'SELECT id, tenant_code, restaurant_name, owner_name, owner_email, owner_phone, username, status, created_at, updated_at, valid_until FROM tenants WHERE id = ?',
      [req.params.id]
    );
    res.json(updated);
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve pending tenant (super_admin only): create DB and set status to inactive
router.patch('/:id/approve', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const tenant = await masterDbHelpers.get('SELECT * FROM tenants WHERE id = ?', [req.params.id]);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    if (tenant.status !== 'pending') {
      return res.status(400).json({ error: 'Tenant is not pending approval' });
    }

    await createTenantDatabase(tenant.tenant_code);
    const tenantDb = await getTenantDatabase(tenant.tenant_code);
    const db = createDbHelpers(tenantDb);
    await db.run(
      'INSERT INTO users (username, email, password, role, full_name) VALUES (?, ?, ?, ?, ?)',
      [tenant.username, tenant.owner_email, tenant.password, 'admin', tenant.owner_name]
    );
    await db.run(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
      ['restaurant_name', tenant.restaurant_name]
    );
    await db.close();

    await masterDbHelpers.run(
      "UPDATE tenants SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [req.params.id]
    );
    await logActivity('super_admin', req.user.id, req.user.username, 'tenant_approved', 'tenant', parseInt(req.params.id, 10), { tenant_code: tenant.tenant_code });

    const updated = await masterDbHelpers.get(
      'SELECT id, tenant_code, restaurant_name, owner_name, owner_email, owner_phone, username, status, created_at, updated_at, valid_until FROM tenants WHERE id = ?',
      [req.params.id]
    );
    res.json({ message: 'Tenant approved and created successfully', tenant: updated });
  } catch (error) {
    console.error('Approve tenant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reject pending tenant (super_admin only): remove from master
router.patch('/:id/reject', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const tenant = await masterDbHelpers.get('SELECT * FROM tenants WHERE id = ?', [req.params.id]);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    if (tenant.status !== 'pending') {
      return res.status(400).json({ error: 'Tenant is not pending approval' });
    }
    await masterDbHelpers.run('DELETE FROM tenants WHERE id = ?', [req.params.id]);
    await logActivity('super_admin', req.user.id, req.user.username, 'tenant_rejected', 'tenant', parseInt(req.params.id, 10), { tenant_code: tenant.tenant_code });
    res.json({ message: 'Tenant request rejected' });
  } catch (error) {
    console.error('Reject tenant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update tenant owner credentials (super_admin only). Syncs to tenant DB if it exists.
router.patch('/:id/owner-credentials', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const { username: newUsername, password: newPassword } = req.body;
    if (!newUsername || !newPassword) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    const tenant = await masterDbHelpers.get('SELECT * FROM tenants WHERE id = ?', [req.params.id]);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await masterDbHelpers.run(
      'UPDATE tenants SET username = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newUsername, hashedPassword, req.params.id]
    );
    const fs = require('fs');
    const { getTenantDbPath } = require('../tenantManager');
    const dbPath = getTenantDbPath(tenant.tenant_code);
    if (fs.existsSync(dbPath)) {
      const tenantDb = await getTenantDatabase(tenant.tenant_code);
      const db = createDbHelpers(tenantDb);
      await db.run(
        'UPDATE users SET username = ?, password = ? WHERE username = ? AND role = ?',
        [newUsername, hashedPassword, tenant.username, 'admin']
      );
      await db.close();
    }
    await logActivity('super_admin', req.user.id, req.user.username, 'credentials_changed', 'tenant_owner', parseInt(req.params.id, 10), { tenant_code: tenant.tenant_code });
    res.json({ message: 'Owner credentials updated' });
  } catch (error) {
    console.error('Owner credentials error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete tenant (super admin only)
router.delete('/:id', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const tenant = await masterDbHelpers.get(
      'SELECT tenant_code FROM tenants WHERE id = ?',
      [req.params.id]
    );

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Delete tenant database file
    const fs = require('fs');
    const { getTenantDbPath } = require('../tenantManager');
    const dbPath = getTenantDbPath(tenant.tenant_code);
    
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    // Delete tenant from master database
    await masterDbHelpers.run('DELETE FROM tenants WHERE id = ?', [req.params.id]);

    res.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('Delete tenant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
