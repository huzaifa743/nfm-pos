const { getTenantDatabase, createDbHelpers } = require('../tenantManager');

// Middleware to get tenant database based on user's tenant_id
const getTenantDb = async (req, res, next) => {
  try {
    // Skip for super admin (they don't use tenant database)
    if (req.user && req.user.role === 'super_admin') {
      return next();
    }

    if (!req.user || !req.user.tenant_code) {
      return res.status(401).json({ error: 'Tenant information required' });
    }

    const tenantDb = await getTenantDatabase(req.user.tenant_code);
    req.db = createDbHelpers(tenantDb);
    next();
  } catch (error) {
    console.error('Error getting tenant database:', error);
    res.status(500).json({ error: 'Database connection error' });
  }
};

// Middleware to close tenant database connection after request
const closeTenantDb = (req, res, next) => {
  // Close database connection after response is sent
  res.on('finish', () => {
    if (req.db && req.db.close) {
      req.db.close().catch(err => {
        console.error('Error closing database:', err);
      });
    }
  });
  next();
};

module.exports = { getTenantDb, closeTenantDb };
