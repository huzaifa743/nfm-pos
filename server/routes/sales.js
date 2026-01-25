const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getTenantDb, closeTenantDb, requireTenant } = require('../middleware/tenant');

const router = express.Router();

// Get all sales
router.get('/', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { start_date, end_date, search, payment_method } = req.query;
    
    let sql = `SELECT s.*, u.username as user_name, c.name as customer_name, c.phone as customer_phone 
               FROM sales s 
               LEFT JOIN users u ON s.user_id = u.id 
               LEFT JOIN customers c ON s.customer_id = c.id 
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
    const sale = await req.db.get(
      `SELECT s.*, u.username as user_name, c.name as customer_name, c.phone as customer_phone, 
       c.email as customer_email, c.address as customer_address, c.city as customer_city, c.country as customer_country
       FROM sales s 
       LEFT JOIN users u ON s.user_id = u.id 
       LEFT JOIN customers c ON s.customer_id = c.id 
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
      split_payments
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Sale must have at least one item' });
    }

    const saleNumber = `SALE-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Handle split payments - store as JSON string
    const paymentData = split_payments && split_payments.length > 0 
      ? JSON.stringify(split_payments)
      : JSON.stringify([{ method: payment_method, amount: parseFloat(payment_amount) }]);

    // Create sale
    const saleResult = await req.db.run(
      `INSERT INTO sales (sale_number, customer_id, user_id, subtotal, discount_amount, discount_type, 
       vat_percentage, vat_amount, total, payment_method, payment_amount, change_amount, order_type, payment_data) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
        paymentData
      ]
    );

    // Create sale items
    for (const item of items) {
      await req.db.run(
        'INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)',
        [
          saleResult.id,
          item.product_id,
          item.product_name,
          item.quantity,
          parseFloat(item.unit_price),
          parseFloat(item.total_price)
        ]
      );

      // Update product stock only if stock tracking is enabled
      if (item.product_id) {
        const product = await req.db.get('SELECT stock_tracking_enabled FROM products WHERE id = ?', [item.product_id]);
        if (product && (product.stock_tracking_enabled === 1 || product.stock_tracking_enabled === true)) {
          await req.db.run('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [item.quantity, item.product_id]);
        }
      }
    }

    const sale = await req.db.get(
      `SELECT s.*, u.username as user_name, c.name as customer_name 
       FROM sales s 
       LEFT JOIN users u ON s.user_id = u.id 
       LEFT JOIN customers c ON s.customer_id = c.id 
       WHERE s.id = ?`,
      [saleResult.id]
    );

    const saleItems = await req.db.query('SELECT * FROM sale_items WHERE sale_id = ?', [saleResult.id]);

    res.status(201).json({ ...sale, items: saleItems });
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Refund/Return sale
router.post('/:id/refund', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const saleId = req.params.id;
    const { reason, items_to_refund } = req.body; // items_to_refund: [{item_id, quantity}]

    // Get original sale
    const sale = await req.db.get('SELECT * FROM sales WHERE id = ?', [saleId]);
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    // Get sale items
    const saleItems = await req.db.query('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);

    // Calculate refund amount
    let refundAmount = 0;
    if (items_to_refund && items_to_refund.length > 0) {
      // Partial refund
      for (const refundItem of items_to_refund) {
        const item = saleItems.find(si => si.id === refundItem.item_id);
        if (item) {
          const quantity = refundItem.quantity || item.quantity;
          refundAmount += (item.unit_price * quantity);
        }
      }
    } else {
      // Full refund
      refundAmount = sale.total;
    }

    // Create refund record (negative sale)
    const refundNumber = `REFUND-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
    const refundResult = await req.db.run(
      `INSERT INTO sales (sale_number, customer_id, user_id, subtotal, discount_amount, discount_type, 
       vat_percentage, vat_amount, total, payment_method, payment_amount, change_amount, order_type, status, refund_of_sale_id, refund_reason) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        refundNumber,
        sale.customer_id,
        req.user.id,
        -Math.abs(refundAmount),
        0,
        'fixed',
        0,
        0,
        -Math.abs(refundAmount),
        sale.payment_method,
        -Math.abs(refundAmount),
        0,
        sale.order_type,
        'refunded',
        saleId,
        reason || 'No reason provided'
      ]
    );

    // Restore stock for refunded items
    if (items_to_refund && items_to_refund.length > 0) {
      for (const refundItem of items_to_refund) {
        const item = saleItems.find(si => si.id === refundItem.item_id);
        if (item && item.product_id) {
          const quantity = refundItem.quantity || item.quantity;
          const product = await req.db.get('SELECT stock_tracking_enabled FROM products WHERE id = ?', [item.product_id]);
          if (product && (product.stock_tracking_enabled === 1 || product.stock_tracking_enabled === true)) {
            await req.db.run('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [quantity, item.product_id]);
          }
        }
      }
    } else {
      // Full refund - restore all stock
      for (const item of saleItems) {
        if (item.product_id) {
          const product = await req.db.get('SELECT stock_tracking_enabled FROM products WHERE id = ?', [item.product_id]);
          if (product && (product.stock_tracking_enabled === 1 || product.stock_tracking_enabled === true)) {
            await req.db.run('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [item.quantity, item.product_id]);
          }
        }
      }
    }

    const refundSale = await req.db.get(
      `SELECT s.*, u.username as user_name, c.name as customer_name 
       FROM sales s 
       LEFT JOIN users u ON s.user_id = u.id 
       LEFT JOIN customers c ON s.customer_id = c.id 
       WHERE s.id = ?`,
      [refundResult.id]
    );

    res.status(201).json({ ...refundSale, refund_amount: Math.abs(refundAmount) });
  } catch (error) {
    console.error('Refund sale error:', error);
    res.status(500).json({ error: 'Server error' });
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

// Hold/Suspend sales endpoints
// Get all held sales
router.get('/held/list', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const heldSales = await req.db.query(
      `SELECT h.*, u.username as user_name, c.name as customer_name 
       FROM held_sales h 
       LEFT JOIN users u ON h.user_id = u.id 
       LEFT JOIN customers c ON h.customer_id = c.id 
       ORDER BY h.created_at DESC`
    );
    res.json(heldSales);
  } catch (error) {
    console.error('Get held sales error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Hold/Suspend a sale
router.post('/hold', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const {
      customer_id,
      items,
      subtotal,
      discount_amount,
      discount_type,
      vat_percentage,
      vat_amount,
      total,
      notes
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cannot hold empty cart' });
    }

    const holdNumber = `HOLD-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Create held sale
    const holdResult = await req.db.run(
      `INSERT INTO held_sales (hold_number, customer_id, user_id, subtotal, discount_amount, discount_type, 
       vat_percentage, vat_amount, total, notes, cart_data) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        holdNumber,
        customer_id || null,
        req.user.id,
        parseFloat(subtotal),
        parseFloat(discount_amount) || 0,
        discount_type || 'fixed',
        parseFloat(vat_percentage) || 0,
        parseFloat(vat_amount) || 0,
        parseFloat(total),
        notes || '',
        JSON.stringify(items)
      ]
    );

    const heldSale = await req.db.get(
      `SELECT h.*, u.username as user_name, c.name as customer_name 
       FROM held_sales h 
       LEFT JOIN users u ON h.user_id = u.id 
       LEFT JOIN customers c ON h.customer_id = c.id 
       WHERE h.id = ?`,
      [holdResult.id]
    );

    res.status(201).json(heldSale);
  } catch (error) {
    console.error('Hold sale error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Resume a held sale
router.get('/hold/:id', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const heldSale = await req.db.get(
      `SELECT h.*, u.username as user_name, c.name as customer_name 
       FROM held_sales h 
       LEFT JOIN users u ON h.user_id = u.id 
       LEFT JOIN customers c ON h.customer_id = c.id 
       WHERE h.id = ?`,
      [req.params.id]
    );

    if (!heldSale) {
      return res.status(404).json({ error: 'Held sale not found' });
    }

    res.json(heldSale);
  } catch (error) {
    console.error('Get held sale error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete held sale
router.delete('/hold/:id', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    await req.db.run('DELETE FROM held_sales WHERE id = ?', [req.params.id]);
    res.json({ message: 'Held sale deleted successfully' });
  } catch (error) {
    console.error('Delete held sale error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Track price override
router.post('/price-overrides/history', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { product_id, product_name, original_price, override_price, sale_id } = req.body;

    await req.db.run(
      `INSERT INTO price_override_history (product_id, product_name, original_price, override_price, user_id, username, sale_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        product_id,
        product_name,
        parseFloat(original_price),
        parseFloat(override_price),
        req.user.id,
        req.user.username,
        sale_id || null
      ]
    );

    res.json({ message: 'Price override tracked' });
  } catch (error) {
    console.error('Track price override error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get price override history
router.get('/price-overrides/history', authenticateToken, requireTenant, getTenantDb, closeTenantDb, async (req, res) => {
  try {
    const { product_id, limit = 50 } = req.query;
    let sql = `SELECT * FROM price_override_history WHERE 1=1`;
    const params = [];

    if (product_id) {
      sql += ' AND product_id = ?';
      params.push(product_id);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const history = await req.db.query(sql, params);
    res.json(history);
  } catch (error) {
    console.error('Get price override history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
