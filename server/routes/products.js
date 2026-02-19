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
const hasWeightMigratedTenants = new Set();
const vatPercentageMigratedTenants = new Set();
const unitFieldsMigratedTenants = new Set();

function normalizeBoolean(value) {
  if (value === true || value === 1 || value === '1') return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', 'yes', 'y', 'enabled'].includes(normalized);
  }
  return false;
}

function normalizeNumber(value) {
  if (value == null || value === '') return null;
  const parsed = parseFloat(String(value).trim());
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeDateValue(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function normalizeWeightUnit(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  if (['kg', 'kilogram', 'kilograms'].includes(normalized)) return 'kg';
  if (['g', 'gram', 'grams'].includes(normalized)) return 'gram';
  return null;
}

async function ensureVatPercentageColumn(db, tenantCode) {
  if (!tenantCode || vatPercentageMigratedTenants.has(tenantCode)) return;
  try {
    await db.run('ALTER TABLE products ADD COLUMN vat_percentage REAL DEFAULT 0');
  } catch (err) {
    if (!err.message || !err.message.includes('duplicate column')) throw err;
  }
  vatPercentageMigratedTenants.add(tenantCode);
}

async function ensureUnitFieldsColumns(db, tenantCode) {
  if (!tenantCode || unitFieldsMigratedTenants.has(tenantCode)) return;
  try {
    await db.run('ALTER TABLE products ADD COLUMN product_base_unit TEXT');
  } catch (err) {
    if (!err.message || !err.message.includes('duplicate column')) throw err;
  }
  try {
    await db.run('ALTER TABLE products ADD COLUMN product_purchase_unit TEXT');
  } catch (err) {
    if (!err.message || !err.message.includes('duplicate column')) throw err;
  }
  try {
    await db.run('ALTER TABLE products ADD COLUMN product_sale_unit TEXT');
  } catch (err) {
    if (!err.message || !err.message.includes('duplicate column')) throw err;
  }
  unitFieldsMigratedTenants.add(tenantCode);
}

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

async function ensureHasWeightColumns(db, tenantCode) {
  if (!tenantCode || hasWeightMigratedTenants.has(tenantCode)) return;
  try {
    await db.run('ALTER TABLE products ADD COLUMN has_weight INTEGER DEFAULT 0');
  } catch (err) {
    if (!err.message || !err.message.includes('duplicate column')) throw err;
  }
  try {
    await db.run('ALTER TABLE products ADD COLUMN weight_unit TEXT');
  } catch (err) {
    if (!err.message || !err.message.includes('duplicate column')) throw err;
  }
  hasWeightMigratedTenants.add(tenantCode);
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
      await ensureHasWeightColumns(req.db, tenantCode);
      await ensureVatPercentageColumn(req.db, tenantCode);
      await ensureUnitFieldsColumns(req.db, tenantCode);
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

// Import products from Excel
router.post('/import', authenticateToken, preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const tenantCode = req.user?.tenant_code;
    if (tenantCode) {
      await ensureExpiryDateColumn(req.db, tenantCode);
      await ensureBarcodeColumn(req.db, tenantCode);
      await ensureStockTrackingColumn(req.db, tenantCode);
      await ensurePurchaseRateColumn(req.db, tenantCode);
      await ensureHasWeightColumns(req.db, tenantCode);
      await ensureVatPercentageColumn(req.db, tenantCode);
      await ensureUnitFieldsColumns(req.db, tenantCode);
    }

    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rows.length) {
      return res.status(400).json({ error: 'No inventory rows provided' });
    }

    const categories = await req.db.query('SELECT id, name FROM categories');
    const categoryMap = new Map(
      categories.map((category) => [String(category.name).trim().toLowerCase(), category.id])
    );

    const resolveCategoryId = async (categoryName) => {
      if (!categoryName) return null;
      const normalized = String(categoryName).trim();
      if (!normalized) return null;
      const key = normalized.toLowerCase();
      if (categoryMap.has(key)) return categoryMap.get(key);

      const result = await req.db.run(
        'INSERT INTO categories (name, description) VALUES (?, ?)',
        [normalized, null]
      );
      categoryMap.set(key, result.id);
      return result.id;
    };

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index] || {};
      const name = String(row.name || '').trim();
      const priceValue = normalizeNumber(row.price);
      if (!name || priceValue == null || priceValue < 0) {
        skipped += 1;
        errors.push({ index, error: 'Missing or invalid name/price' });
        continue;
      }

      const categoryName = row.category_name || row.category || '';
      const categoryId = await resolveCategoryId(categoryName);

      const barcodeValue = row.barcode != null ? String(row.barcode).trim() : null;
      const stockTracking = normalizeBoolean(row.stock_tracking_enabled) ? 1 : 0;
      const stockQty = stockTracking ? parseInt(row.stock_quantity, 10) || 0 : 0;
      const expiry = normalizeDateValue(row.expiry_date);
      const purchaseRate = normalizeNumber(row.purchase_rate);
      const hasWeight = normalizeBoolean(row.has_weight) ? 1 : 0;
      const weightUnit = hasWeight ? (normalizeWeightUnit(row.weight_unit) || 'gram') : null;
      const vatPctValue = normalizeNumber(row.vat_percentage);
      const vatPct = vatPctValue != null ? Math.max(0, Math.min(100, vatPctValue)) : 0;
      const descriptionValue = row.description != null ? String(row.description).trim() : null;
      const baseUnit = row.product_base_unit != null ? String(row.product_base_unit).trim() : null;
      const purchaseUnit = row.product_purchase_unit != null ? String(row.product_purchase_unit).trim() : null;
      const saleUnit = row.product_sale_unit != null ? String(row.product_sale_unit).trim() : null;

      let existing = null;
      if (barcodeValue) {
        existing = await req.db.get('SELECT id FROM products WHERE barcode = ?', [barcodeValue]);
      }

      if (!existing) {
        if (categoryId) {
          existing = await req.db.get(
            'SELECT id FROM products WHERE LOWER(name) = ? AND category_id = ?',
            [name.toLowerCase(), categoryId]
          );
        } else {
          existing = await req.db.get(
            'SELECT id FROM products WHERE LOWER(name) = ? AND category_id IS NULL',
            [name.toLowerCase()]
          );
        }
      }

      if (existing) {
        await req.db.run(
          'UPDATE products SET name = ?, price = ?, category_id = ?, description = ?, expiry_date = ?, barcode = ?, stock_tracking_enabled = ?, stock_quantity = ?, purchase_rate = ?, has_weight = ?, weight_unit = ?, vat_percentage = ?, product_base_unit = ?, product_purchase_unit = ?, product_sale_unit = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [name, priceValue, categoryId || null, descriptionValue, expiry, barcodeValue, stockTracking, stockQty, purchaseRate, hasWeight, weightUnit, vatPct, baseUnit, purchaseUnit, saleUnit, existing.id]
        );
        updated += 1;
      } else {
        await req.db.run(
          'INSERT INTO products (name, price, category_id, description, stock_quantity, expiry_date, barcode, stock_tracking_enabled, purchase_rate, has_weight, weight_unit, vat_percentage, product_base_unit, product_purchase_unit, product_sale_unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [name, priceValue, categoryId || null, descriptionValue, stockQty, expiry, barcodeValue, stockTracking, purchaseRate, hasWeight, weightUnit, vatPct, baseUnit, purchaseUnit, saleUnit]
        );
        created += 1;
      }
    }

    res.json({ imported: created, updated, skipped, errors });
  } catch (error) {
    console.error('Import products error:', error);
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
      await ensureHasWeightColumns(req.db, tenantCode);
      await ensureVatPercentageColumn(req.db, tenantCode);
      await ensureUnitFieldsColumns(req.db, tenantCode);
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
router.post('/', authenticateToken, preventDemoModifications, requireTenant, getTenantDb, upload.any(), closeTenantDb, async (req, res) => {
  try {
    const tenantCode = req.user?.tenant_code;
    if (tenantCode) {
      await ensureExpiryDateColumn(req.db, tenantCode);
      await ensureBarcodeColumn(req.db, tenantCode);
      await ensureStockTrackingColumn(req.db, tenantCode);
      await ensurePurchaseRateColumn(req.db, tenantCode);
      await ensureHasWeightColumns(req.db, tenantCode);
      await ensureVatPercentageColumn(req.db, tenantCode);
      await ensureUnitFieldsColumns(req.db, tenantCode);
    }

    const { name, price, category_id, description, expiry_date, barcode, stock_tracking_enabled, stock_quantity, purchase_rate, has_weight, weight_unit, vat_percentage, product_base_unit, product_purchase_unit, product_sale_unit } = req.body;

    // Validate and trim name
    const trimmedName = name ? String(name).trim() : '';
    if (!trimmedName) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    // Validate and parse price
    const trimmedPrice = price ? String(price).trim() : '';
    if (!trimmedPrice) {
      return res.status(400).json({ error: 'Product price is required' });
    }
    
    const parsedPrice = parseFloat(trimmedPrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ error: 'Product price must be a valid number greater than or equal to 0' });
    }

    const expiry = expiry_date && String(expiry_date).trim() ? String(expiry_date).trim() : null;
    const barcodeValue = barcode && String(barcode).trim() ? String(barcode).trim() : null;
    const stockTracking = stock_tracking_enabled === 'true' || stock_tracking_enabled === true ? 1 : 0;
    // Use provided stock_quantity if stock tracking is enabled, otherwise default to 0
    const stockQty = stockTracking ? (parseInt(stock_quantity) || 0) : 0;
    const purchaseRate = purchase_rate && !isNaN(parseFloat(purchase_rate)) ? parseFloat(purchase_rate) : null;
    const hasWeight = has_weight === 'true' || has_weight === true ? 1 : 0;
    const weightUnit = hasWeight && weight_unit === 'kg' ? 'kg' : (hasWeight ? 'gram' : null);
    const vatPct = vat_percentage != null && !isNaN(parseFloat(vat_percentage)) ? Math.max(0, Math.min(100, parseFloat(vat_percentage))) : 0;
    const baseUnit = product_base_unit && String(product_base_unit).trim() ? String(product_base_unit).trim() : null;
    const purchaseUnit = product_purchase_unit && String(product_purchase_unit).trim() ? String(product_purchase_unit).trim() : null;
    const saleUnit = product_sale_unit && String(product_sale_unit).trim() ? String(product_sale_unit).trim() : null;

    const result = await req.db.run(
      'INSERT INTO products (name, price, category_id, description, stock_quantity, expiry_date, barcode, stock_tracking_enabled, purchase_rate, has_weight, weight_unit, vat_percentage, product_base_unit, product_purchase_unit, product_sale_unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [trimmedName, parsedPrice, category_id || null, description || null, stockQty, expiry, barcodeValue, stockTracking, purchaseRate, hasWeight, weightUnit, vatPct, baseUnit, purchaseUnit, saleUnit]
    );

    const product = await req.db.get('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [result.id]);

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update product
router.put('/:id', authenticateToken, preventDemoModifications, requireTenant, getTenantDb, upload.any(), closeTenantDb, async (req, res) => {
  try {
    const tenantCode = req.user?.tenant_code;
    if (tenantCode) {
      await ensureExpiryDateColumn(req.db, tenantCode);
      await ensureBarcodeColumn(req.db, tenantCode);
      await ensureStockTrackingColumn(req.db, tenantCode);
      await ensurePurchaseRateColumn(req.db, tenantCode);
      await ensureHasWeightColumns(req.db, tenantCode);
      await ensureVatPercentageColumn(req.db, tenantCode);
      await ensureUnitFieldsColumns(req.db, tenantCode);
    }

    const { name, price, category_id, description, expiry_date, barcode, stock_tracking_enabled, stock_quantity, purchase_rate, has_weight, weight_unit, vat_percentage, product_base_unit, product_purchase_unit, product_sale_unit } = req.body;
    
    // Validate and trim name
    const trimmedName = name ? String(name).trim() : '';
    if (!trimmedName) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    // Validate and parse price
    const trimmedPrice = price ? String(price).trim() : '';
    if (!trimmedPrice) {
      return res.status(400).json({ error: 'Product price is required' });
    }
    
    const parsedPrice = parseFloat(trimmedPrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ error: 'Product price must be a valid number greater than or equal to 0' });
    }
    const productId = req.params.id;
    const expiry = expiry_date != null && String(expiry_date).trim() ? String(expiry_date).trim() : null;
    const barcodeValue = barcode != null && String(barcode).trim() ? String(barcode).trim() : null;
    const stockTracking = stock_tracking_enabled === 'true' || stock_tracking_enabled === true ? 1 : 0;
    const purchaseRate = purchase_rate != null && !isNaN(parseFloat(purchase_rate)) ? parseFloat(purchase_rate) : null;
    const hasWeight = has_weight === 'true' || has_weight === true ? 1 : 0;
    const weightUnit = hasWeight && weight_unit === 'kg' ? 'kg' : (hasWeight ? 'gram' : null);
    const vatPct = vat_percentage != null && !isNaN(parseFloat(vat_percentage)) ? Math.max(0, Math.min(100, parseFloat(vat_percentage))) : 0;
    const baseUnit = product_base_unit && String(product_base_unit).trim() ? String(product_base_unit).trim() : null;
    const purchaseUnit = product_purchase_unit && String(product_purchase_unit).trim() ? String(product_purchase_unit).trim() : null;
    const saleUnit = product_sale_unit && String(product_sale_unit).trim() ? String(product_sale_unit).trim() : null;
    
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
      'UPDATE products SET name = ?, price = ?, category_id = ?, description = ?, expiry_date = ?, barcode = ?, stock_tracking_enabled = ?, stock_quantity = ?, purchase_rate = ?, has_weight = ?, weight_unit = ?, vat_percentage = ?, product_base_unit = ?, product_purchase_unit = ?, product_sale_unit = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [trimmedName, parsedPrice, category_id || null, description || null, expiry, barcodeValue, stockTracking, stockQty, purchaseRate, hasWeight, weightUnit, vatPct, baseUnit, purchaseUnit, saleUnit, productId]
    );

    const product = await req.db.get('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [productId]);

    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete all products (clear inventory)
router.delete('/all', authenticateToken, preventDemoModifications, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const result = await req.db.run('DELETE FROM products');
    res.json({ message: 'All inventory cleared successfully', deleted: result.changes });
  } catch (error) {
    console.error('Clear inventory error:', error);
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
