const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import tenantManager to check if setup is needed
const { masterDbHelpers } = require('./tenantManager');

const app = express();
const PORT = process.env.PORT || 5000;

// Check if super admin exists on startup
(async () => {
  try {
    const superAdmin = await masterDbHelpers.get('SELECT * FROM super_admins LIMIT 1');
    if (!superAdmin) {
      console.log('\n⚠️  WARNING: Super admin not found!');
      console.log('⚠️  Please run: npm run setup-all');
      console.log('⚠️  This will create super admin and demo tenant.\n');
    } else {
      console.log('✅ Super admin account found');
    }
  } catch (error) {
    if (error.message && error.message.includes('no such table')) {
      console.log('\n⚠️  WARNING: Database tables not initialized!');
      console.log('⚠️  Please run: npm run setup-all\n');
    } else {
      console.error('Error checking super admin:', error.message);
    }
  }
})();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint for Render monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Keep-alive endpoint to prevent Render from spinning down
app.get('/api/ping', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is alive', timestamp: new Date().toISOString() });
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tenants', require('./routes/tenants')); // Tenant management (super admin only)
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/users', require('./routes/users'));
app.use('/api/settings', require('./routes/settings'));

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
