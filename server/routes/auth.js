const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { masterDbHelpers } = require('../tenantManager');
const { getTenantDatabase, createDbHelpers } = require('../tenantManager');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Login - supports both super admin and tenant users
router.post('/login', async (req, res) => {
  try {
    const { username, password, tenant_code } = req.body;

    // Check if super admin login (no tenant_code)
    if (!tenant_code) {
      // Super admin login - check master database
      try {
        const superAdmin = await masterDbHelpers.get(
          'SELECT * FROM super_admins WHERE username = ?',
          [username]
        );

        if (!superAdmin) {
          return res.status(401).json({ 
            error: 'Invalid credentials. Super admin not found. Please run: npm run setup-super-admin' 
          });
        }

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
      } catch (dbError) {
        console.error('Super admin login database error:', dbError);
        // Check if it's a table doesn't exist error
        if (dbError.message && dbError.message.includes('no such table')) {
          return res.status(500).json({ 
            error: 'Super admin table not initialized. Please run: npm run setup-super-admin' 
          });
        }
        throw dbError; // Re-throw to be caught by outer catch
      }
    }

    // Tenant login - check master database first for tenant owner
    const tenant = await masterDbHelpers.get(
      'SELECT * FROM tenants WHERE tenant_code = ? AND username = ?',
      [tenant_code, username]
    );

    if (tenant) {
      // Owner login
      const validPassword = await bcrypt.compare(password, tenant.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
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
          restaurant_name: tenant.restaurant_name
        }
      });
    }

    // Check tenant database for regular users
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
            tenant_code: tenant_code
          }
        });
      } catch (error) {
        await db.close();
        throw error;
      }
    } catch (tenantDbError) {
      console.error('Tenant database error:', tenantDbError);
      if (tenantDbError.message && tenantDbError.message.includes('not found')) {
        return res.status(404).json({ 
          error: `Tenant '${tenant_code}' not found. Please run: npm run setup-demo` 
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
