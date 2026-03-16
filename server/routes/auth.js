const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { masterDbHelpers } = require('../tenantManager');
const { getTenantDatabase, createDbHelpers } = require('../tenantManager');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

function parseAllowedFeatures(json) {
  if (json == null || json === '') return [];
  try {
    const arr = typeof json === 'string' ? JSON.parse(json) : json;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

const DEFAULT_FEATURES = ['dashboard', 'billing', 'inventory', 'sales-history', 'reports', 'settings'];

function getAllowedFeatures(tenantRow) {
  const raw = tenantRow?.allowed_features;
  const parsed = parseAllowedFeatures(raw);
  if (parsed.length === 0) return DEFAULT_FEATURES;
  return parsed;
}

// Login - supports both super admin and tenant users
router.post('/login', async (req, res) => {
  try {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const tenant_code = typeof req.body?.tenant_code === 'string' ? req.body.tenant_code.trim() : '';

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Check if platform-level login (no tenant_code): super_admin or admin
    if (!tenant_code) {
      try {
        // 1. Super admin first
        const superAdmin = await masterDbHelpers.get(
          'SELECT * FROM super_admins WHERE username = ?',
          [username]
        );

        if (superAdmin) {
          const validPassword = await bcrypt.compare(password, superAdmin.password);
          if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
          }
          const token = jwt.sign(
            { id: superAdmin.id, username: superAdmin.username, role: 'super_admin', tenant_code: null },
            JWT_SECRET,
            { expiresIn: '24h' }
          );
          return res.json({
            token,
            user: {
              id: superAdmin.id,
              username: superAdmin.username,
              email: superAdmin.email,
              role: 'super_admin',
              tenant_code: null
            }
          });
        }

        // 2. Platform admin (admins table)
        const admin = await masterDbHelpers.get(
          'SELECT * FROM admins WHERE username = ?',
          [username]
        );
        if (admin) {
          const validPassword = await bcrypt.compare(password, admin.password);
          if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
          }
          const token = jwt.sign(
            { id: admin.id, username: admin.username, role: 'admin', tenant_code: null },
            JWT_SECRET,
            { expiresIn: '24h' }
          );
          return res.json({
            token,
            user: {
              id: admin.id,
              username: admin.username,
              email: admin.email,
              role: 'admin',
              tenant_code: null
            }
          });
        }

        // 3. Tenant owner fallback when tenant code is omitted.
        // Tenant owner usernames are unique in the master database, so we can
        // safely resolve their tenant and complete login without requiring code.
        const tenantOwner = await masterDbHelpers.get(
          'SELECT id, tenant_code, restaurant_name, owner_name, owner_email, owner_phone, username, password, status, activated_at, allowed_features FROM tenants WHERE username = ?',
          [username]
        );

        if (tenantOwner) {
          if (tenantOwner.status === 'inactive' && tenantOwner.activated_at != null) {
            return res.status(403).json({
              error: 'Tenant is inactive. Contact super admin to activate.'
            });
          }

          const validPassword = await bcrypt.compare(password, tenantOwner.password);
          if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
          }

          if (tenantOwner.status === 'inactive' && tenantOwner.activated_at == null) {
            await masterDbHelpers.run(
              "UPDATE tenants SET status = 'active', activated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE tenant_code = ?",
              [tenantOwner.tenant_code]
            );
          }

          const token = jwt.sign(
            {
              id: tenantOwner.id,
              username: tenantOwner.username,
              role: 'admin',
              tenant_code: tenantOwner.tenant_code
            },
            JWT_SECRET,
            { expiresIn: '24h' }
          );

          return res.json({
            token,
            user: {
              id: tenantOwner.id,
              username: tenantOwner.username,
              email: tenantOwner.owner_email,
              role: 'admin',
              tenant_code: tenantOwner.tenant_code,
              restaurant_name: tenantOwner.restaurant_name,
              allowed_features: getAllowedFeatures(tenantOwner)
            }
          });
        }

        return res.status(401).json({
          error: 'Invalid credentials. Use a platform account with Tenant Code empty, or enter your Tenant Code for tenant users.'
        });
      } catch (dbError) {
        console.error('Platform login database error:', dbError);
        if (dbError.message && dbError.message.includes('no such table')) {
          return res.status(500).json({
            error: 'Database not initialized. Please run: npm run setup-super-admin'
          });
        }
        throw dbError;
      }
    }

    // Tenant login - check master database first for tenant owner
    const tenant = await masterDbHelpers.get(
      'SELECT id, tenant_code, restaurant_name, owner_name, owner_email, owner_phone, username, password, status, activated_at, allowed_features FROM tenants WHERE tenant_code = ? AND username = ?',
      [tenant_code, username]
    );

    if (tenant) {
      // Owner login
      if (tenant.status === 'inactive' && tenant.activated_at != null) {
        return res.status(403).json({
          error: 'Tenant is inactive. Contact super admin to activate.'
        });
      }

      const validPassword = await bcrypt.compare(password, tenant.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // First-time activation: owner's first login sets active (only after valid password)
      if (tenant.status === 'inactive' && tenant.activated_at == null) {
        await masterDbHelpers.run(
          "UPDATE tenants SET status = 'active', activated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE tenant_code = ?",
          [tenant.tenant_code]
        );
      }

      const token = jwt.sign(
        {
          id: tenant.id,
          username: tenant.username,
          role: 'admin',
          tenant_code: tenant.tenant_code
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        token,
        user: {
          id: tenant.id,
          username: tenant.username,
          email: tenant.owner_email,
          role: 'admin',
          tenant_code: tenant.tenant_code,
          restaurant_name: tenant.restaurant_name,
          allowed_features: getAllowedFeatures(tenant)
        }
      });
    }

    // Check tenant database for regular users (cashiers, etc.)
    const tenantMeta = await masterDbHelpers.get(
      'SELECT status, allowed_features FROM tenants WHERE tenant_code = ?',
      [tenant_code]
    );
    if (!tenantMeta) {
      return res.status(404).json({ error: `Tenant '${tenant_code}' not found.` });
    }
    if (tenantMeta.status !== 'active') {
      return res.status(403).json({
        error: 'Tenant is inactive. Contact super admin to activate.'
      });
    }

    try {
      const tenantDb = await getTenantDatabase(tenant_code);
      const db = createDbHelpers(tenantDb);

      try {
        const user = await db.get(
          'SELECT * FROM users WHERE username = ? OR email = ?',
          [username, username]
        );

        if (!user) {
          await db.close();
          return res.status(401).json({ 
            error: 'Invalid credentials. User not found in tenant database.' 
          });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          await db.close();
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
          {
            id: user.id,
            username: user.username,
            role: user.role,
            tenant_code: tenant_code
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        await db.close();

        res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            full_name: user.full_name,
            tenant_code: tenant_code,
            allowed_features: getAllowedFeatures(tenantMeta)
          }
        });
      } catch (error) {
        await db.close();
        throw error;
      }
    } catch (tenantDbError) {
      console.error('Tenant database error:', tenantDbError);
      if (tenantDbError.message && tenantDbError.message.includes('not found')) {
        // If DEMO tenant, provide helpful message with auto-setup info
        if (tenant_code === 'DEMO' || tenant_code === 'demo') {
          return res.status(404).json({ 
            error: `Demo tenant not found. Please run: npm run setup-demo`,
            setup_required: true,
            tenant_code: 'DEMO'
          });
        }
        return res.status(404).json({ 
          error: `Tenant '${tenant_code}' not found.` 
        });
      }
      throw tenantDbError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Register (admin only in production)
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, full_name, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const { run } = require('../database');
    await run(
      'INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, full_name, role || 'cashier']
    );

    res.json({ message: 'User registered successfully' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
