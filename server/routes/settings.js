const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getTenantDb, closeTenantDb, requireTenant } = require('../middleware/tenant');
const { preventDemoModifications } = require('../middleware/demoRestriction');
const { getTenantDatabase, createDbHelpers } = require('../tenantManager');

const router = express.Router();

// Configure multer for logo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/settings');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, 'logo-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get all settings (public - needed for UI before login)
// Settings like business name, logo, currency are public information
// Supports tenant_code query parameter for tenant-specific settings
router.get('/', async (req, res) => {
  try {
    const { tenant_code } = req.query;
    
    // If tenant_code provided, get tenant-specific settings
    if (tenant_code) {
      try {
        const tenantDb = await getTenantDatabase(tenant_code);
        const db = createDbHelpers(tenantDb);
        const settings = await db.query('SELECT * FROM settings');
        await db.close();
        
        const settingsObj = {};
        settings.forEach(setting => {
          settingsObj[setting.key] = setting.value;
        });
        return res.json(settingsObj);
      } catch (error) {
        // If tenant database doesn't exist, return empty/default settings
        return res.json({
          restaurant_name: 'NFM POS',
          restaurant_logo: '',
          currency: 'USD',
          language: 'en',
          vat_percentage: '0'
        });
      }
    }
    
    // Default settings (for backward compatibility)
    res.json({
      restaurant_name: 'NFM POS',
      restaurant_logo: '',
      currency: 'USD',
      language: 'en',
      vat_percentage: '0'
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update settings
router.put('/', authenticateToken, requireRole('admin'), preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, upload.single('logo'), async (req, res) => {
  try {
    const settings = req.body;

    // Handle logo upload
    if (req.file) {
      const logoPath = `/uploads/settings/${req.file.filename}`;
      
      // Delete old logo if exists
      const oldLogo = await req.db.get('SELECT value FROM settings WHERE key = ?', ['restaurant_logo']);
      if (oldLogo && oldLogo.value) {
        const oldLogoPath = path.join(__dirname, '..', oldLogo.value);
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
        }
      }

      await req.db.run(
        'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        ['restaurant_logo', logoPath]
      );
    }

    // Update other settings
    for (const [key, value] of Object.entries(settings)) {
      if (key !== 'logo') {
        await req.db.run(
          'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
          [key, value || '']
        );
      }
    }

    const allSettings = await req.db.query('SELECT * FROM settings');
    const settingsObj = {};
    allSettings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });

    res.json(settingsObj);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
