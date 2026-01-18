const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query, run, get } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

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

// Get all settings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const settings = await query('SELECT * FROM settings');
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });
    res.json(settingsObj);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update settings
router.put('/', authenticateToken, requireRole('admin'), upload.single('logo'), async (req, res) => {
  try {
    const settings = req.body;

    // Handle logo upload
    if (req.file) {
      const logoPath = `/uploads/settings/${req.file.filename}`;
      
      // Delete old logo if exists
      const oldLogo = await get('SELECT value FROM settings WHERE key = ?', ['restaurant_logo']);
      if (oldLogo && oldLogo.value) {
        const oldLogoPath = path.join(__dirname, '..', oldLogo.value);
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
        }
      }

      await run(
        'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        ['restaurant_logo', logoPath]
      );
    }

    // Update other settings
    for (const [key, value] of Object.entries(settings)) {
      if (key !== 'logo') {
        await run(
          'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
          [key, value || '']
        );
      }
    }

    const allSettings = await query('SELECT * FROM settings');
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
