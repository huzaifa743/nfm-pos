const { getTenantDatabase, createDbHelpers } = require('../tenantManager');

// Block super admin from tenant-scoped routes (they use /tenants only). Prevents 500s from req.db being undefined.
const requireTenant = (req, res, next) => {
  if (req.user && req.user.role === 'super_admin') {
    return res.status(403).json({
      error: 'Tenant context required. Super admin can only access the Tenants page.'
    });
  }
  next();
};

// Middleware to get tenant database based on user's tenant_id
const getTenantDb = async (req, res, next) => {
  try {
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

module.exports = { getTenantDb, closeTenantDb, requireTenant };
