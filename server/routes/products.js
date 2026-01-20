const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const { getTenantDb, closeTenantDb } = require('../middleware/tenant');

const router = express.Router();

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
router.get('/', authenticateToken, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { category_id, search } = req.query;
    let sql = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1';
    const params = [];

    if (category_id && category_id !== 'all') {
      sql += ' AND p.category_id = ?';
      params.push(category_id);
    }

    if (search) {
      sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
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
router.get('/:id', authenticateToken, getTenantDb, closeTenantDb, async (req, res) => {
  try {
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
router.post('/', authenticateToken, getTenantDb, closeTenantDb, upload.single('image'), async (req, res) => {
  try {
    const { name, price, category_id, description } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const image = req.file ? `/uploads/products/${req.file.filename}` : null;

    const result = await req.db.run(
      'INSERT INTO products (name, price, category_id, image, description, stock_quantity) VALUES (?, ?, ?, ?, ?, ?)',
      [name, parseFloat(price), category_id || null, image, description || null, 0]
    );

    const product = await req.db.get('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [result.id]);

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update product
router.put('/:id', authenticateToken, getTenantDb, closeTenantDb, upload.single('image'), async (req, res) => {
  try {
    const { name, price, category_id, description } = req.body;
    const productId = req.params.id;

    let image = null;
    if (req.file) {
      image = `/uploads/products/${req.file.filename}`;
      // Delete old image if exists
      const oldProduct = await req.db.get('SELECT image FROM products WHERE id = ?', [productId]);
      if (oldProduct && oldProduct.image) {
        const oldImagePath = path.join(__dirname, '..', oldProduct.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }

    await req.db.run(
      'UPDATE products SET name = ?, price = ?, category_id = ?, description = ?, updated_at = CURRENT_TIMESTAMP' + 
      (image ? ', image = ?' : '') + ' WHERE id = ?',
      image ? [name, parseFloat(price), category_id || null, description || null, image, productId] :
              [name, parseFloat(price), category_id || null, description || null, productId]
    );

    const product = await req.db.get('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [productId]);

    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete product
router.delete('/:id', authenticateToken, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const product = await req.db.get('SELECT image FROM products WHERE id = ?', [req.params.id]);
    
    if (product && product.image) {
      const imagePath = path.join(__dirname, '..', product.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await req.db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
