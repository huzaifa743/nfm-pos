const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getTenantDb, closeTenantDb, requireTenant } = require('../middleware/tenant');
const { preventDemoModifications } = require('../middleware/demoRestriction');
const { getTenantDatabase, createDbHelpers } = require('../tenantManager');

const router = express.Router();

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
    return path.join(__dirname, '../uploads');
  }
}

function resolveUploadsFilePath(relativeUploadsPath) {
  if (!relativeUploadsPath) return '';
  const normalized = relativeUploadsPath
    .replace(/^\/+/, '')
    .replace(/\\/g, '/');
  const pathWithoutUploadsPrefix = normalized.startsWith('uploads/')
    ? normalized.slice('uploads/'.length)
    : normalized;
  return path.join(getUploadsBasePath(), pathWithoutUploadsPrefix);
}

// Configure multer for logo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsBasePath = getUploadsBasePath();
    const uploadPath = path.join(uploadsBasePath, 'settings');
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
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  onError: (err, next) => {
    console.error('Multer upload error:', err);
    next(err);
  }
});

// Get all settings (public - needed for UI before login)
// Settings like business name, logo, currency are public information
// Supports tenant_code query parameter for tenant-specific settings
// Also checks authenticated user's tenant_code if available
router.get('/', async (req, res) => {
  try {
    let tenant_code = req.query.tenant_code;
    
    // If no tenant_code in query, try to get from authenticated user
    if (!tenant_code) {
      try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
          const jwt = require('jsonwebtoken');
          const { JWT_SECRET } = require('../middleware/auth');
          try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded.tenant_code) {
              tenant_code = decoded.tenant_code;
            }
          } catch (err) {
            // Invalid token, ignore and continue with defaults
          }
        }
      } catch (error) {
        // Ignore auth errors, continue with defaults
      }
    }
    
    // If tenant_code available, get tenant-specific settings
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

        if (settingsObj.restaurant_logo) {
          const logoFilePath = resolveUploadsFilePath(settingsObj.restaurant_logo);
          if (!fs.existsSync(logoFilePath)) {
            console.warn('Logo file not found on disk, returning stored path as-is:', settingsObj.restaurant_logo, 'Checked:', logoFilePath);
          }
        }
        
        // Ensure all required settings exist with defaults
        const defaultSettings = {
          restaurant_name: 'NFM POS',
          restaurant_logo: '',
          restaurant_address: '',
          restaurant_phone: '',
          restaurant_email: '',
          trn: '',
          currency: 'USD',
          language: 'en',
          vat_percentage: '0',
          receipt_auto_print: 'false',
          receipt_paper_size: '80mm',
          invoice_type: 'thermal',
          terms_conditions: '',
          bank_details: ''
        };
        
        return res.json({ ...defaultSettings, ...settingsObj });
      } catch (error) {
        console.error('Error fetching tenant settings:', error);
        // If tenant database doesn't exist, return default settings
        return res.json({
          restaurant_name: 'NFM POS',
          restaurant_logo: '',
          restaurant_address: '',
          restaurant_phone: '',
          restaurant_email: '',
          trn: '',
          currency: 'USD',
          language: 'en',
          vat_percentage: '0',
          receipt_auto_print: 'false',
          receipt_paper_size: '80mm',
          invoice_type: 'thermal',
          terms_conditions: '',
          bank_details: ''
        });
      }
    }
    
    // Default settings (for backward compatibility when no tenant)
    res.json({
      restaurant_name: 'NFM POS',
      restaurant_logo: '',
      restaurant_address: '',
      restaurant_phone: '',
      restaurant_email: '',
      trn: '',
      currency: 'USD',
      language: 'en',
      vat_percentage: '0',
      receipt_auto_print: 'false',
      receipt_paper_size: '80mm',
      invoice_type: 'thermal',
      terms_conditions: '',
      bank_details: ''
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
      const uploadsBasePath = getUploadsBasePath();
      const fullLogoPath = path.join(uploadsBasePath, 'settings', req.file.filename);
      
      // Verify file was actually saved
      if (!fs.existsSync(fullLogoPath)) {
        console.error('Logo file was not saved:', fullLogoPath);
        return res.status(500).json({ error: 'Failed to save logo file' });
      }
      
      // Delete old logo if exists
      const oldLogo = await req.db.get('SELECT value FROM settings WHERE key = ?', ['restaurant_logo']);
      if (oldLogo && oldLogo.value) {
        const oldLogoPath = resolveUploadsFilePath(oldLogo.value);
        if (fs.existsSync(oldLogoPath)) {
          try {
            fs.unlinkSync(oldLogoPath);
            console.log('✅ Deleted old logo:', oldLogoPath);
          } catch (err) {
            console.warn('⚠️ Failed to delete old logo:', err.message, 'Path:', oldLogoPath);
          }
        } else {
          console.log('ℹ️ Old logo file not found (may have been deleted already):', oldLogoPath);
        }
      }

      await req.db.run(
        'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        ['restaurant_logo', logoPath]
      );
      
      // Double-check file exists after saving
      if (fs.existsSync(fullLogoPath)) {
        console.log('✅ Logo saved successfully:', logoPath, 'File size:', fs.statSync(fullLogoPath).size, 'bytes');
      } else {
        console.error('❌ Logo file not found after save:', fullLogoPath);
        // Clear the logo path if file doesn't exist
        await req.db.run(
          'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
          ['restaurant_logo', '']
        );
        return res.status(500).json({ error: 'Failed to save logo file' });
      }
    }

    // Update other settings
    for (const [key, value] of Object.entries(settings)) {
      if (key !== 'logo' && key !== 'restaurant_logo') {
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
