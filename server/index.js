const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import tenantManager to check if setup is needed
const { masterDbHelpers, ensureInitialized } = require('./tenantManager');

const app = express();
const PORT = process.env.PORT || 5000;

// Auto-setup on first run (non-blocking, runs after server starts).
// We never delete tenants on startup. Only create demo/superadmin if missing.
// Tenants are deleted only when super admin explicitly deletes via API.
// Set DATA_DIR (e.g. to a Railway volume path) so tenants persist across redeploys.
setTimeout(() => {
  (async () => {
    try {
      await ensureInitialized();
      
      // Check if super admin exists, auto-create if missing
      try {
        const superAdmin = await masterDbHelpers.get('SELECT * FROM super_admins LIMIT 1');
        if (!superAdmin) {
          console.log('\n⚠️  Super admin not found. Auto-creating...');
          const { autoSetupSuperAdmin } = require('./autoSetupSuperAdmin');
          const result = await autoSetupSuperAdmin();
          if (result.success) {
            console.log('✅ Super admin auto-created. Login with tenant code empty (default: superadmin / superadmin123)');
          } else {
            console.log('⚠️  Auto-setup failed:', result.error);
            console.log('   Run manually: npm run setup-super-admin\n');
          }
        } else {
          console.log('✅ Super admin account found');
        }
      } catch (err) {
        console.log('⚠️  Could not check/create super admin:', err.message);
        console.log('   Run manually: npm run setup-super-admin');
      }
      
      // Auto-create or update demo tenant
      try {
        const demoTenant = await masterDbHelpers.get('SELECT * FROM tenants WHERE tenant_code = ?', ['DEMO']);
        const { autoSetupDemoTenant } = require('./autoSetupDemo');
        if (!demoTenant) {
          console.log('⚠️  Demo tenant not found. Auto-creating demo tenant with sample data...');
          const result = await autoSetupDemoTenant();
          if (result.success) {
            console.log('✅ Demo tenant auto-created successfully!');
          } else {
            console.log('⚠️  Auto-setup failed:', result.error);
            console.log('   Run manually: npm run setup-demo');
          }
        } else {
          console.log('✅ Demo tenant found, updating settings...');
          const result = await autoSetupDemoTenant();
          if (result.success) {
            console.log('✅ Demo tenant settings updated!');
          } else {
            console.log('⚠️  Settings update failed:', result.error);
          }
        }
      } catch (err) {
        console.log('⚠️  Could not check/create demo tenant:', err.message);
        console.log('   Run manually: npm run setup-demo');
      }
    } catch (error) {
      if (error.message && error.message.includes('no such table')) {
        console.log('\n⚠️  WARNING: Database tables not initialized!');
        console.log('⚠️  Please run: npm run setup-all\n');
      } else {
        console.error('Error in auto-setup:', error.message);
      }
    }
  })().catch(err => {
    console.error('Auto-setup error (non-fatal):', err.message);
  });
}, 1000); // Delay auto-setup by 1 second to allow server to start responding to healthchecks

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint for Railway/Render monitoring (must be FIRST, before any other routes)
app.get('/health', (req, res) => {
  // Simple, fast response - no try-catch needed
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint - will serve React app in production, but Railway healthcheck can use /health

// Keep-alive endpoint to prevent Render from spinning down
app.get('/api/ping', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is alive', timestamp: new Date().toISOString() });
});

// Get persistent uploads directory path (same logic as database path)
function getUploadsBasePath() {
  if (process.env.UPLOADS_DIR) {
    // Use custom path from environment variable
    return process.env.UPLOADS_DIR;
  } else if (process.env.RAILWAY_ENVIRONMENT) {
    // Railway: Use persistent storage directory
    const railwayDataPath = process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
    return path.join(railwayDataPath, 'uploads');
  } else if (process.env.RENDER && process.env.RENDER_DISK_PATH) {
    // Use Render persistent disk path if available (paid plans only)
    return path.join(process.env.RENDER_DISK_PATH, 'uploads');
  } else {
    // Default: use server directory (ephemeral on Render free tier, persistent on Railway)
    return path.join(__dirname, 'uploads');
  }
}

// Ensure uploads directory exists before serving static files
const uploadsBasePath = getUploadsBasePath();
const uploadsDir = uploadsBasePath;
const uploadsSettingsDir = path.join(uploadsBasePath, 'settings');
const uploadsProductsDir = path.join(uploadsBasePath, 'products');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory:', uploadsDir);
}
if (!fs.existsSync(uploadsSettingsDir)) {
  fs.mkdirSync(uploadsSettingsDir, { recursive: true });
  console.log('✅ Created uploads/settings directory:', uploadsSettingsDir);
}
if (!fs.existsSync(uploadsProductsDir)) {
  fs.mkdirSync(uploadsProductsDir, { recursive: true });
  console.log('✅ Created uploads/products directory:', uploadsProductsDir);
}

console.log('📁 Uploads directory:', uploadsBasePath);

// Serve static files
app.use('/uploads', express.static(uploadsBasePath, {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Set proper headers for images
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || filePath.endsWith('.png') || filePath.endsWith('.gif') || filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', filePath.endsWith('.png') ? 'image/png' : 
                    filePath.endsWith('.gif') ? 'image/gif' : 
                    filePath.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    }
  }
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/setup', require('./routes/setup')); // Setup endpoints
app.use('/api/tenants', require('./routes/tenants')); // Tenant management (super_admin + admin)
app.use('/api/superadmin', require('./routes/superadmin')); // Superadmin: activity, credentials, admins
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/held-sales', require('./routes/heldSales'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/users', require('./routes/users'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/deliveries', require('./routes/deliveries'));
app.use('/api/delivery-boys', require('./routes/deliveryBoys').router);
app.use('/api/employees', require('./routes/employees'));
app.use('/api/salaries', require('./routes/salaries'));
app.use('/api/salary-reports', require('./routes/salaryReports'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/purchase-orders', require('./routes/purchaseOrders'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/cash', require('./routes/cash'));
app.use('/api/unit-conversions', require('./routes/unitConversions'));

// Serve React app in production (catch-all must be last)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../client/dist');
  
  // Serve static files first
  app.use(express.static(distPath));
  
  // Root endpoint - serve React app or respond to healthcheck
  app.get('/', (req, res) => {
    try {
      // Check if it's a healthcheck request
      const isHealthcheck = req.headers['user-agent']?.includes('Healthcheck') || 
                           req.query.health === 'check' ||
                           req.headers['x-railway-healthcheck'] === 'true';
      
      if (isHealthcheck) {
        return res.status(200).json({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        });
      }
      
      // Serve React app
      res.sendFile(path.join(distPath, 'index.html'));
    } catch (err) {
      // Fallback: just send OK status
      res.status(200).json({ status: 'ok' });
    }
  });
  
  // Catch-all handler: send back React's index.html file for all non-API routes
  app.get('*', (req, res) => {
    // Skip API routes, static files, and healthcheck
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path === '/health') {
      return res.status(404).json({ error: 'Not found' });
    }
    try {
      res.sendFile(path.join(distPath, 'index.html'));
    } catch (err) {
      res.status(404).json({ error: 'Not found' });
    }
  });
} else {
  // Development: simple root endpoint
  app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running in development mode' });
  });
}

// Start server immediately - healthcheck will respond right away
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Health check endpoint: http://0.0.0.0:${PORT}/health`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`✅ Production mode: Serving React app from client/dist`);
  }
  // Signal that server is ready for healthchecks
  console.log(`✅ Server ready to accept connections`);
});
