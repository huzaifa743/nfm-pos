const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getTenantDb, closeTenantDb, requireTenant } = require('../middleware/tenant');

const router = express.Router();
const deliveryMigratedTenants = new Set();
const saleItemsVatMigratedTenants = new Set();

async function ensureSaleItemsVatColumns(db, tenantCode) {
  if (!tenantCode || saleItemsVatMigratedTenants.has(tenantCode)) return;
  try {
    await db.run('ALTER TABLE sale_items ADD COLUMN vat_percentage REAL DEFAULT 0');
  } catch (err) {
    if (!err.message || !err.message.includes('duplicate column')) throw err;
  }
  try {
    await db.run('ALTER TABLE sale_items ADD COLUMN vat_amount REAL DEFAULT 0');
  } catch (err) {
    if (!err.message || !err.message.includes('duplicate column')) throw err;
  }
  saleItemsVatMigratedTenants.add(tenantCode);
}

async function ensureDeliveryColumns(db, tenantCode) {
  if (!tenantCode || deliveryMigratedTenants.has(tenantCode)) return;
  try {
    await db.run('ALTER TABLE sales ADD COLUMN delivery_boy_id INTEGER');
    await db.run('ALTER TABLE sales ADD COLUMN delivery_status TEXT DEFAULT "pending"');
    await db.run('ALTER TABLE sales ADD COLUMN delivery_payment_collected INTEGER DEFAULT 0');
    await db.run('ALTER TABLE sales ADD COLUMN delivery_settled_at DATETIME');
    await db.run('ALTER TABLE sales ADD COLUMN delivery_assigned_at DATETIME');
    await db.run('ALTER TABLE sales ADD COLUMN delivery_delivered_at DATETIME');
  } catch (err) {
    if (!err.message || !err.message.includes('duplicate column')) throw err;
  }
  deliveryMigratedTenants.add(tenantCode);
}

// Get all sales
router.get('/', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const tenantCode = req.user?.tenant_code;
    if (tenantCode) {
      await ensureDeliveryColumns(req.db, tenantCode);
      await ensureSaleItemsVatColumns(req.db, tenantCode);
    }

    const { start_date, end_date, search, payment_method, delivery_status } = req.query;
    
    let sql = `SELECT s.*, u.username as user_name, c.name as customer_name, c.phone as customer_phone,
               db.name as delivery_boy_name
               FROM sales s 
               LEFT JOIN users u ON s.user_id = u.id 
               LEFT JOIN customers c ON s.customer_id = c.id
               LEFT JOIN delivery_boys db ON s.delivery_boy_id = db.id
               WHERE 1=1`;
    const params = [];

    if (start_date) {
      sql += ' AND DATE(s.created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND DATE(s.created_at) <= ?';
      params.push(end_date);
    }

    if (search) {
      sql += ' AND (s.sale_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (payment_method) {
      sql += ' AND s.payment_method = ?';
      params.push(payment_method);
    }

    if (delivery_status) {
      sql += ' AND s.delivery_status = ?';
      params.push(delivery_status);
    }

    sql += ' ORDER BY s.created_at DESC';

    const sales = await req.db.query(sql, params);
    res.json(sales);
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single sale with items
router.get('/:id', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const tenantCode = req.user?.tenant_code;
    if (tenantCode) {
      await ensureDeliveryColumns(req.db, tenantCode);
      await ensureSaleItemsVatColumns(req.db, tenantCode);
    }

    const sale = await req.db.get(
      `SELECT s.*, u.username as user_name, c.name as customer_name, c.phone as customer_phone, 
       c.email as customer_email, c.address as customer_address, c.city as customer_city, c.country as customer_country,
       db.name as delivery_boy_name
       FROM sales s 
       LEFT JOIN users u ON s.user_id = u.id 
       LEFT JOIN customers c ON s.customer_id = c.id
       LEFT JOIN delivery_boys db ON s.delivery_boy_id = db.id
       WHERE s.id = ?`,
      [req.params.id]
    );

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const items = await req.db.query(
      'SELECT si.*, p.image as product_image FROM sale_items si LEFT JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?',
      [req.params.id]
    );

    res.json({ ...sale, items });
  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create sale
router.post('/', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const tenantCode = req.user?.tenant_code;
    if (tenantCode) {
      await ensureDeliveryColumns(req.db, tenantCode);
      await ensureSaleItemsVatColumns(req.db, tenantCode);
    }

    const {
      customer_id,
      items,
      subtotal,
      discount_amount,
      discount_type,
      vat_percentage,
      vat_amount,
      total,
      payment_method,
      payment_amount,
      change_amount,
      order_type,
      delivery_boy_id,
      sale_date
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Sale must have at least one item' });
    }

    const saleNumber = `SALE-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
    
    // Set delivery status based on payment method
    let deliveryStatus = null;
    let deliveryBoyId = null;
    let deliveryAssignedAt = null;
    
    // Simple flow: Pay After Delivery = payment pending until marked received
    if (payment_method === 'payAfterDelivery') {
      deliveryStatus = 'payment_pending';
      deliveryBoyId = delivery_boy_id || null;
      deliveryAssignedAt = deliveryBoyId ? new Date().toISOString() : null;
    }

    // Sale date: use provided date (YYYY-MM-DD) or current time
    const createdAt = sale_date && typeof sale_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(sale_date.trim())
      ? `${sale_date.trim()} 12:00:00`
      : null;

    // Create sale (include created_at when sale_date provided)
    const insertColumns = `sale_number, customer_id, user_id, subtotal, discount_amount, discount_type, 
       vat_percentage, vat_amount, total, payment_method, payment_amount, change_amount, order_type,
       delivery_boy_id, delivery_status, delivery_assigned_at`;
    const insertPlaceholders = createdAt
      ? `${insertColumns}, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      : `${insertColumns}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const insertValues = [
      saleNumber,
      customer_id || null,
      req.user.id,
      parseFloat(subtotal),
      parseFloat(discount_amount) || 0,
      discount_type || 'fixed',
      parseFloat(vat_percentage) || 0,
      parseFloat(vat_amount) || 0,
      parseFloat(total),
      payment_method,
      parseFloat(payment_amount),
      parseFloat(change_amount) || 0,
      order_type || 'dine-in',
      deliveryBoyId,
      deliveryStatus,
      deliveryAssignedAt
    ];
    if (createdAt) insertValues.push(createdAt);

    const saleResult = await req.db.run(
      `INSERT INTO sales (${insertPlaceholders}`,
      insertValues
    );

    // Create sale items
    for (const item of items) {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      const totalPrice = parseFloat(item.total_price) || 0;
      const vatPct = parseFloat(item.vat_percentage) || 0;
      const vatAmt = parseFloat(item.vat_amount) || 0;

      if (!item.product_id || !item.product_name) {
        throw new Error('Invalid item: product_id and product_name are required');
      }

      await req.db.run(
        'INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price, vat_percentage, vat_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          saleResult.id,
          item.product_id,
          item.product_name,
          quantity,
          unitPrice,
          totalPrice,
          vatPct,
          vatAmt
        ]
      );

      // Update product stock only if stock tracking is enabled
      if (item.product_id) {
        const product = await req.db.get('SELECT stock_tracking_enabled FROM products WHERE id = ?', [item.product_id]);
        if (product && (product.stock_tracking_enabled === 1 || product.stock_tracking_enabled === true)) {
          await req.db.run('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [quantity, item.product_id]);
        }
      }
    }

    const sale = await req.db.get(
      `SELECT s.*, u.username as user_name, c.name as customer_name,
       db.name as delivery_boy_name
       FROM sales s 
       LEFT JOIN users u ON s.user_id = u.id 
       LEFT JOIN customers c ON s.customer_id = c.id
       LEFT JOIN delivery_boys db ON s.delivery_boy_id = db.id
       WHERE s.id = ?`,
      [saleResult.id]
    );

    const saleItems = await req.db.query('SELECT * FROM sale_items WHERE sale_id = ?', [saleResult.id]);

    res.status(201).json({ ...sale, items: saleItems });
  } catch (error) {
    console.error('Create sale error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    const errorMessage = error.message || 'Server error';
    res.status(500).json({ error: errorMessage });
  }
});

// Delete sale (admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const saleId = req.params.id;

    // Get sale items to restore stock if needed
    const saleItems = await req.db.query('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);
    
    // Restore stock for products with stock tracking enabled
    for (const item of saleItems) {
      if (item.product_id) {
        const product = await req.db.get('SELECT stock_tracking_enabled FROM products WHERE id = ?', [item.product_id]);
        if (product && (product.stock_tracking_enabled === 1 || product.stock_tracking_enabled === true)) {
          await req.db.run('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [item.quantity, item.product_id]);
        }
      }
    }

    // Delete sale items first (foreign key constraint)
    await req.db.run('DELETE FROM sale_items WHERE sale_id = ?', [saleId]);
    
    // Delete the sale
    await req.db.run('DELETE FROM sales WHERE id = ?', [saleId]);

    res.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    console.error('Delete sale error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
