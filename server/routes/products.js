const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const { getTenantDb, closeTenantDb, requireTenant } = require('../middleware/tenant');
const { preventDemoModifications } = require('../middleware/demoRestriction');

const router = express.Router();
const migratedTenants = new Set();
const barcodeMigratedTenants = new Set();
const stockTrackingMigratedTenants = new Set();
const purchaseRateMigratedTenants = new Set();

async function ensureExpiryDateColumn(db, tenantCode) {
  if (!tenantCode || migratedTenants.has(tenantCode)) return;
  try {
    await db.run('ALTER TABLE products ADD COLUMN expiry_date TEXT');
  } catch (err) {
    if (!err.message || !err.message.includes('duplicate column')) throw err;
  }
  migratedTenants.add(tenantCode);
}

async function ensureBarcodeColumn(db, tenantCode) {
  if (!tenantCode || barcodeMigratedTenants.has(tenantCode)) return;
  try {
    await db.run('ALTER TABLE products ADD COLUMN barcode TEXT');
  } catch (err) {
    if (!err.message || !err.message.includes('duplicate column')) throw err;
  }
  barcodeMigratedTenants.add(tenantCode);
}

async function ensureStockTrackingColumn(db, tenantCode) {
  if (!tenantCode || stockTrackingMigratedTenants.has(tenantCode)) return;
  try {
    await db.run('ALTER TABLE products ADD COLUMN stock_tracking_enabled INTEGER DEFAULT 0');
  } catch (err) {
    if (!err.message || !err.message.includes('duplicate column')) throw err;
  }
  stockTrackingMigratedTenants.add(tenantCode);
}

async function ensurePurchaseRateColumn(db, tenantCode) {
  if (!tenantCode || purchaseRateMigratedTenants.has(tenantCode)) return;
  try {
    await db.run('ALTER TABLE products ADD COLUMN purchase_rate REAL');
  } catch (err) {
    if (!err.message || !err.message.includes('duplicate column')) throw err;
  }
  purchaseRateMigratedTenants.add(tenantCode);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/products');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
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

// Get all products
router.get('/', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const tenantCode = req.user?.tenant_code;
    if (tenantCode) {
      await ensureExpiryDateColumn(req.db, tenantCode);
      await ensureBarcodeColumn(req.db, tenantCode);
      await ensureStockTrackingColumn(req.db, tenantCode);
      await ensurePurchaseRateColumn(req.db, tenantCode);
    }

    const { category_id, search, barcode } = req.query;
    let sql = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1';
    const params = [];

    if (category_id && category_id !== 'all') {
      sql += ' AND p.category_id = ?';
      params.push(category_id);
    }

    if (barcode) {
      sql += ' AND p.barcode = ?';
      params.push(barcode);
    } else if (search) {
      sql += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.barcode LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY p.created_at DESC';

    const products = await req.db.query(sql, params);
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single product
router.get('/:id', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const tenantCode = req.user?.tenant_code;
    if (tenantCode) {
      await ensureExpiryDateColumn(req.db, tenantCode);
      await ensureBarcodeColumn(req.db, tenantCode);
      await ensureStockTrackingColumn(req.db, tenantCode);
      await ensurePurchaseRateColumn(req.db, tenantCode);
    }

    const product = await req.db.get(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?',
      [req.params.id]
    );
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create product
router.post('/', authenticateToken, preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const tenantCode = req.user?.tenant_code;
    if (tenantCode) {
      await ensureExpiryDateColumn(req.db, tenantCode);
      await ensureBarcodeColumn(req.db, tenantCode);
      await ensureStockTrackingColumn(req.db, tenantCode);
      await ensurePurchaseRateColumn(req.db, tenantCode);
    }

    const { name, price, category_id, description, expiry_date, barcode, stock_tracking_enabled, stock_quantity, purchase_rate } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const expiry = expiry_date && String(expiry_date).trim() ? String(expiry_date).trim() : null;
    const barcodeValue = barcode && String(barcode).trim() ? String(barcode).trim() : null;
    const stockTracking = stock_tracking_enabled === 'true' || stock_tracking_enabled === true ? 1 : 0;
    // Use provided stock_quantity if stock tracking is enabled, otherwise default to 0
    const stockQty = stockTracking ? (parseInt(stock_quantity) || 0) : 0;
    const purchaseRate = purchase_rate && !isNaN(parseFloat(purchase_rate)) ? parseFloat(purchase_rate) : null;

    const result = await req.db.run(
      'INSERT INTO products (name, price, category_id, description, stock_quantity, expiry_date, barcode, stock_tracking_enabled, purchase_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, parseFloat(price), category_id || null, description || null, stockQty, expiry, barcodeValue, stockTracking, purchaseRate]
    );

    const product = await req.db.get('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [result.id]);

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update product
router.put('/:id', authenticateToken, preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const tenantCode = req.user?.tenant_code;
    if (tenantCode) {
      await ensureExpiryDateColumn(req.db, tenantCode);
      await ensureBarcodeColumn(req.db, tenantCode);
      await ensureStockTrackingColumn(req.db, tenantCode);
      await ensurePurchaseRateColumn(req.db, tenantCode);
    }

    const { name, price, category_id, description, expiry_date, barcode, stock_tracking_enabled, stock_quantity, purchase_rate } = req.body;
    const productId = req.params.id;
    const expiry = expiry_date != null && String(expiry_date).trim() ? String(expiry_date).trim() : null;
    const barcodeValue = barcode != null && String(barcode).trim() ? String(barcode).trim() : null;
    const stockTracking = stock_tracking_enabled === 'true' || stock_tracking_enabled === true ? 1 : 0;
    const purchaseRate = purchase_rate != null && !isNaN(parseFloat(purchase_rate)) ? parseFloat(purchase_rate) : null;
    
    // Get current product to preserve stock_quantity if stock tracking is being disabled
    const currentProduct = await req.db.get('SELECT stock_tracking_enabled, stock_quantity FROM products WHERE id = ?', [productId]);
    let stockQty = currentProduct?.stock_quantity || 0;
    
    // If stock tracking is enabled, use the provided stock_quantity, otherwise keep current or set to 0
    if (stockTracking && stock_quantity != null) {
      stockQty = parseInt(stock_quantity) || 0;
    } else if (!stockTracking) {
      stockQty = 0; // Reset to 0 if stock tracking is disabled
    }

    await req.db.run(
      'UPDATE products SET name = ?, price = ?, category_id = ?, description = ?, expiry_date = ?, barcode = ?, stock_tracking_enabled = ?, stock_quantity = ?, purchase_rate = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, parseFloat(price), category_id || null, description || null, expiry, barcodeValue, stockTracking, stockQty, purchaseRate, productId]
    );

    const product = await req.db.get('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [productId]);

    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete product
router.delete('/:id', authenticateToken, preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    await req.db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
