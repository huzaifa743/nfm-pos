const express = require('express');
const bcrypt = require('bcryptjs');
const { masterDbHelpers, createTenantDatabase } = require('../tenantManager');
const { authenticateToken, requireRole } = require('../middleware/auth');

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

// Create new tenant (super admin only)
router.post('/', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const {
      restaurant_name,
      owner_name,
      owner_email,
      owner_phone,
      username,
      password
    } = req.body;

    if (!restaurant_name || !owner_name || !owner_email || !username || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate tenant code
    const tenant_code = generateTenantCode(restaurant_name);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create tenant in master database
    const result = await masterDbHelpers.run(
      `INSERT INTO tenants (tenant_code, restaurant_name, owner_name, owner_email, owner_phone, username, password)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenant_code, restaurant_name, owner_name, owner_email, owner_phone || null, username, hashedPassword]
    );

    // Create tenant database
    try {
      await createTenantDatabase(tenant_code);
      
      // Create admin user in tenant database
      const { getTenantDatabase, createDbHelpers } = require('../tenantManager');
      const tenantDb = await getTenantDatabase(tenant_code);
      const db = createDbHelpers(tenantDb);
      
      // Create owner as admin user in tenant database
      await db.run(
        'INSERT INTO users (username, email, password, role, full_name) VALUES (?, ?, ?, ?, ?)',
        [username, owner_email, hashedPassword, 'admin', owner_name]
      );

      // Update business name in settings
      await db.run(
        'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        ['restaurant_name', restaurant_name]
      );

      await db.close();

      const tenant = await masterDbHelpers.get(
        'SELECT id, tenant_code, restaurant_name, owner_name, owner_email, owner_phone, username, status, created_at FROM tenants WHERE id = ?',
        [result.id]
      );

      res.status(201).json({
        message: 'Tenant created successfully',
        tenant: {
          ...tenant,
          password: undefined // Don't send password
        }
      });
    } catch (dbError) {
      // If database creation fails, remove tenant from master
      await masterDbHelpers.run('DELETE FROM tenants WHERE id = ?', [result.id]);
      throw dbError;
    }
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    console.error('Create tenant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all tenants (super admin only)
router.get('/', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const tenants = await masterDbHelpers.query(
      'SELECT id, tenant_code, restaurant_name, owner_name, owner_email, owner_phone, username, status, created_at, updated_at FROM tenants ORDER BY created_at DESC'
    );
    res.json(tenants);
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single tenant
router.get('/:id', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const tenant = await masterDbHelpers.get(
      'SELECT id, tenant_code, restaurant_name, owner_name, owner_email, owner_phone, username, status, created_at, updated_at FROM tenants WHERE id = ?',
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

// Update tenant
router.put('/:id', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const {
      restaurant_name,
      owner_name,
      owner_email,
      owner_phone,
      status
    } = req.body;

    const updates = [];
    const values = [];

    if (restaurant_name) {
      updates.push('restaurant_name = ?');
      values.push(restaurant_name);
    }
    if (owner_name) {
      updates.push('owner_name = ?');
      values.push(owner_name);
    }
    if (owner_email) {
      updates.push('owner_email = ?');
      values.push(owner_email);
    }
    if (owner_phone !== undefined) {
      updates.push('owner_phone = ?');
      values.push(owner_phone);
    }
    if (status) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);

    await masterDbHelpers.run(
      `UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const tenant = await masterDbHelpers.get(
      'SELECT id, tenant_code, restaurant_name, owner_name, owner_email, owner_phone, username, status, created_at, updated_at FROM tenants WHERE id = ?',
      [req.params.id]
    );

    res.json(tenant);
  } catch (error) {
    console.error('Update tenant error:', error);
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
