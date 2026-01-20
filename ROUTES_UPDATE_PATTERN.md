# Routes Update Pattern for Multi-Tenant

## Pattern to Follow

For each route file, make these changes:

### 1. Update Imports
```javascript
// OLD
const { query, run, get } = require('../database');

// NEW
const { getTenantDb, closeTenantDb } = require('../middleware/tenant');
// Remove database import
```

### 2. Update Route Handlers
```javascript
// OLD
router.get('/', authenticateToken, async (req, res) => {
  const data = await query('SELECT * FROM table');
  // ...
});

// NEW
router.get('/', authenticateToken, getTenantDb, closeTenantDb, async (req, res) => {
  const data = await req.db.query('SELECT * FROM table');
  // ...
});
```

### 3. Replace Database Calls
- `query()` → `req.db.query()`
- `run()` → `req.db.run()`
- `get()` → `req.db.get()`

## Routes Updated ✅
- ✅ products.js
- ✅ categories.js
- ✅ settings.js

## Routes Remaining ⚠️
- ⚠️ sales.js
- ⚠️ customers.js
- ⚠️ users.js
- ⚠️ dashboard.js
- ⚠️ reports.js

## Important Notes

1. **Super Admin Routes**: Don't add tenant middleware (they use master DB)
2. **Public Routes**: Settings GET can work without tenant (for initial load)
3. **Order Matters**: Middleware order: `authenticateToken, getTenantDb, closeTenantDb`
4. **File Uploads**: Keep multer middleware before tenant middleware if needed
