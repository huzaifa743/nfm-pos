const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import tenantManager to check if setup is needed
const { masterDbHelpers, ensureInitialized } = require('./tenantManager');

const app = express();
const PORT = process.env.PORT || 5000;

// Auto-setup on first run (non-blocking, runs after server starts)
setTimeout(() => {
  (async () => {
    try {
      // Ensure database is initialized
      await ensureInitialized();
      
      // Check if super admin exists, create if missing
      try {
        const superAdmin = await masterDbHelpers.get('SELECT * FROM super_admins LIMIT 1');
        if (!superAdmin) {
          console.log('\n⚠️  Super admin not found!');
          console.log('⚠️  Run: npm run setup-super-admin (or it will be created on first super admin login attempt)\n');
        } else {
          console.log('✅ Super admin account found');
        }
      } catch (err) {
        console.log('⚠️  Could not check super admin:', err.message);
      }
      
      // Auto-create demo tenant if it doesn't exist
      try {
        const demoTenant = await masterDbHelpers.get('SELECT * FROM tenants WHERE tenant_code = ?', ['DEMO']);
        if (!demoTenant) {
          console.log('⚠️  Demo tenant not found. Auto-creating demo tenant with sample data...');
          const { autoSetupDemoTenant } = require('./autoSetupDemo');
          const result = await autoSetupDemoTenant();
          if (result.success) {
            console.log('✅ Demo tenant auto-created successfully!');
          } else {
            console.log('⚠️  Auto-setup failed:', result.error);
            console.log('   Run manually: npm run setup-demo');
          }
        } else {
          console.log('✅ Demo tenant found');
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

// Health check endpoint for Railway/Render monitoring (must be early, before any async operations)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint for healthcheck
app.get('/', (req, res) => {
  // For healthcheck requests, return JSON immediately
  if (req.headers['user-agent']?.includes('Healthcheck') || req.query.health === 'check') {
    return res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }
  // In production, serve React app
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '../client/dist');
    return res.sendFile(path.join(distPath, 'index.html'));
  }
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Root endpoint - will serve React app in production, but Railway healthcheck can use /health

// Keep-alive endpoint to prevent Render from spinning down
app.get('/api/ping', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is alive', timestamp: new Date().toISOString() });
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/setup', require('./routes/setup')); // Setup endpoints
app.use('/api/tenants', require('./routes/tenants')); // Tenant management (super admin only)
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/users', require('./routes/users'));
app.use('/api/settings', require('./routes/settings'));

// Serve React app in production (catch-all must be last)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
  // Catch-all handler: send back React's index.html file for all non-API routes
  app.get('*', (req, res) => {
    // Skip API routes and static files
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Health check available at http://0.0.0.0:${PORT}/health`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`✅ Production mode: Serving React app from client/dist`);
  }
});
