// Auto-setup demo tenant - can be called from server startup
const bcrypt = require('bcryptjs');
const { masterDbHelpers, createTenantDatabase, getTenantDatabase, createDbHelpers, ensureInitialized } = require('./tenantManager');

async function autoSetupDemoTenant() {
  try {
    // Ensure database is initialized
    await ensureInitialized();
    
    // Check if demo tenant already exists
    const existing = await masterDbHelpers.get('SELECT * FROM tenants WHERE tenant_code = ?', ['DEMO']);
    if (existing) {
      return { success: true, message: 'Demo tenant already exists' };
    }

    console.log('🍽️  Auto-creating Demo Tenant...\n');

    const tenantCode = 'DEMO';
    const restaurantName = 'Demo Pos';
    const ownerName = 'Demo Owner';
    const ownerEmail = 'demo@restaurant.com';
    const ownerPhone = '+1234567890';
    const username = 'demo';
    const password = 'demo123';

    // Create tenant in master database
    const hashedPassword = await bcrypt.hash(password, 10);
    await masterDbHelpers.run(
      `INSERT INTO tenants (tenant_code, restaurant_name, owner_name, owner_email, owner_phone, username, password)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenantCode, restaurantName, ownerName, ownerEmail, ownerPhone, username, hashedPassword]
    );
    console.log('✅ Demo tenant created in master database');

    // Create tenant database
    await createTenantDatabase(tenantCode);
    console.log('✅ Demo tenant database created');

    // Get tenant database connection
    const tenantDb = await getTenantDatabase(tenantCode);
    const db = createDbHelpers(tenantDb);

    // Insert demo categories
    const categories = [
      { name: 'Beverages', description: 'Hot and cold drinks' },
      { name: 'Appetizers', description: 'Starters and snacks' },
      { name: 'Main Course', description: 'Main dishes' },
      { name: 'Desserts', description: 'Sweet treats' },
      { name: 'Salads', description: 'Fresh salads' },
    ];

    console.log('📦 Adding demo categories...');
    // Check existing categories
    const existingCategories = await db.query('SELECT name, id FROM categories');
    const existingCategoryMap = {};
    existingCategories.forEach(cat => {
      existingCategoryMap[cat.name] = cat.id;
    });

    const categoryIds = {};
    for (const category of categories) {
      if (existingCategoryMap[category.name]) {
        categoryIds[category.name] = existingCategoryMap[category.name];
      } else {
        const result = await db.run(
          'INSERT INTO categories (name, description) VALUES (?, ?)',
          [category.name, category.description]
        );
        categoryIds[category.name] = result.id;
        console.log(`   ✅ Added: ${category.name}`);
      }
    }

    // Insert demo products
    const products = [
      // Beverages
      { name: 'Coffee', price: 3.50, category: 'Beverages', description: 'Fresh brewed coffee', stock: 100 },
      { name: 'Tea', price: 2.50, category: 'Beverages', description: 'Hot tea', stock: 100 },
      { name: 'Soft Drink', price: 2.00, category: 'Beverages', description: 'Carbonated soft drink', stock: 150 },
      { name: 'Fresh Juice', price: 4.00, category: 'Beverages', description: 'Fresh fruit juice', stock: 80 },
      { name: 'Water', price: 1.50, category: 'Beverages', description: 'Bottled water', stock: 200 },
      
      // Appetizers
      { name: 'Chicken Wings', price: 8.99, category: 'Appetizers', description: 'Spicy chicken wings (6 pcs)', stock: 50 },
      { name: 'Spring Rolls', price: 5.99, description: 'Crispy vegetable spring rolls (4 pcs)', category: 'Appetizers', stock: 60 },
      { name: 'Nachos', price: 7.99, category: 'Appetizers', description: 'Loaded nachos with cheese', stock: 40 },
      { name: 'Garlic Bread', price: 4.99, category: 'Appetizers', description: 'Fresh baked garlic bread', stock: 70 },
      
      // Main Course
      { name: 'Grilled Chicken', price: 15.99, category: 'Main Course', description: 'Grilled chicken breast with vegetables', stock: 30 },
      { name: 'Beef Steak', price: 22.99, category: 'Main Course', description: 'Premium beef steak', stock: 25 },
      { name: 'Pasta Carbonara', price: 12.99, category: 'Main Course', description: 'Creamy pasta carbonara', stock: 40 },
      { name: 'Pizza Margherita', price: 10.99, category: 'Main Course', description: 'Classic margherita pizza', stock: 35 },
      { name: 'Burger Deluxe', price: 9.99, category: 'Main Course', description: 'Deluxe burger with fries', stock: 45 },
      
      // Salads
      { name: 'Caesar Salad', price: 8.99, category: 'Salads', description: 'Classic caesar salad', stock: 50 },
      { name: 'Garden Salad', price: 7.99, category: 'Salads', description: 'Fresh garden salad', stock: 55 },
      { name: 'Greek Salad', price: 9.99, category: 'Salads', description: 'Traditional greek salad', stock: 45 },
      
      // Desserts
      { name: 'Chocolate Cake', price: 6.99, category: 'Desserts', description: 'Rich chocolate cake slice', stock: 40 },
      { name: 'Ice Cream', price: 4.99, category: 'Desserts', description: 'Vanilla ice cream', stock: 60 },
      { name: 'Cheesecake', price: 7.99, category: 'Desserts', description: 'New York style cheesecake', stock: 35 },
      { name: 'Brownie', price: 5.99, category: 'Desserts', description: 'Chocolate brownie with ice cream', stock: 50 },
    ];

    console.log('🍕 Adding demo products...');
    // Check existing products
    const existingProducts = await db.query('SELECT name, id FROM products');
    const existingProductMap = {};
    existingProducts.forEach(prod => {
      existingProductMap[prod.name] = prod.id;
    });

    const productIds = {};
    for (const product of products) {
      if (existingProductMap[product.name]) {
        productIds[product.name] = existingProductMap[product.name];
      } else {
        const categoryId = categoryIds[product.category];
        const result = await db.run(
          'INSERT INTO products (name, price, category_id, description, stock_quantity) VALUES (?, ?, ?, ?, ?)',
          [product.name, product.price, categoryId, product.description, product.stock]
        );
        productIds[product.name] = result.id;
        console.log(`   ✅ Added: ${product.name} - $${product.price.toFixed(2)}`);
      }
    }

    // Insert demo customers
    const customers = [
      { name: 'John Doe', phone: '+1234567890', email: 'john@example.com', city: 'New York', country: 'USA' },
      { name: 'Jane Smith', phone: '+1234567891', email: 'jane@example.com', city: 'Los Angeles', country: 'USA' },
      { name: 'Bob Wilson', phone: '+1234567892', email: 'bob@example.com', city: 'Chicago', country: 'USA' },
      { name: 'Alice Brown', phone: '+1234567893', email: 'alice@example.com', city: 'Houston', country: 'USA' },
      { name: 'Charlie Davis', phone: '+1234567894', email: 'charlie@example.com', city: 'Miami', country: 'USA' },
    ];

    console.log('👥 Adding demo customers...');
    // Check existing customers
    const existingCustomers = await db.query('SELECT email, id FROM customers WHERE email IS NOT NULL');
    const existingCustomerMap = {};
    existingCustomers.forEach(cust => {
      existingCustomerMap[cust.email] = cust.id;
    });

    const customerIds = [];
    for (const customer of customers) {
      if (existingCustomerMap[customer.email]) {
        customerIds.push(existingCustomerMap[customer.email]);
      } else {
        const result = await db.run(
          'INSERT INTO customers (name, phone, email, city, country) VALUES (?, ?, ?, ?, ?)',
          [customer.name, customer.phone, customer.email, customer.city, customer.country]
        );
        customerIds.push(result.id);
        console.log(`   ✅ Added: ${customer.name}`);
      }
    }

    // Create a demo user (cashier)
    let cashier = await db.get('SELECT id FROM users WHERE username = ?', ['cashier']);
    if (!cashier) {
      const cashierPassword = await bcrypt.hash('cashier123', 10);
      await db.run(
        'INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)',
        ['cashier', 'cashier@demo.com', cashierPassword, 'Demo Cashier', 'cashier']
      );
      cashier = await db.get('SELECT id FROM users WHERE username = ?', ['cashier']);
      console.log('👤 Created demo cashier user (username: cashier, password: cashier123)');
    } else {
      console.log('👤 Demo cashier user already exists');
    }

    // Check if sales already exist
    const existingSalesCount = await db.get('SELECT COUNT(*) as count FROM sales');
    if (existingSalesCount && existingSalesCount.count > 0) {
      console.log(`⚠️  Sales data already exists (${existingSalesCount.count} sales), skipping...`);
      await db.close();
      return { success: true, message: 'Demo tenant already has sales data' };
    }

    // Insert demo sales (sample transactions)
    console.log('💰 Creating sample sales data...');
    const sales = [
      {
        customer_id: customerIds[0],
        items: [
          { product_id: productIds['Coffee'], quantity: 2, name: 'Coffee', price: 3.50 },
          { product_id: productIds['Burger Deluxe'], quantity: 1, name: 'Burger Deluxe', price: 9.99 },
        ],
        payment_method: 'cash',
        order_type: 'dine-in',
      },
      {
        customer_id: customerIds[1],
        items: [
          { product_id: productIds['Pasta Carbonara'], quantity: 2, name: 'Pasta Carbonara', price: 12.99 },
          { product_id: productIds['Fresh Juice'], quantity: 2, name: 'Fresh Juice', price: 4.00 },
          { product_id: productIds['Chocolate Cake'], quantity: 1, name: 'Chocolate Cake', price: 6.99 },
        ],
        payment_method: 'card',
        order_type: 'dine-in',
        discount: { amount: 5, type: 'fixed' },
      },
      {
        customer_id: customerIds[2],
        items: [
          { product_id: productIds['Beef Steak'], quantity: 1, name: 'Beef Steak', price: 22.99 },
          { product_id: productIds['Caesar Salad'], quantity: 1, name: 'Caesar Salad', price: 8.99 },
          { product_id: productIds['Soft Drink'], quantity: 2, name: 'Soft Drink', price: 2.00 },
        ],
        payment_method: 'card',
        order_type: 'takeaway',
      },
      {
        customer_id: null,
        items: [
          { product_id: productIds['Pizza Margherita'], quantity: 1, name: 'Pizza Margherita', price: 10.99 },
          { product_id: productIds['Garlic Bread'], quantity: 1, name: 'Garlic Bread', price: 4.99 },
          { product_id: productIds['Ice Cream'], quantity: 2, name: 'Ice Cream', price: 4.99 },
        ],
        payment_method: 'cash',
        order_type: 'takeaway',
      },
      {
        customer_id: customerIds[3],
        items: [
          { product_id: productIds['Chicken Wings'], quantity: 1, name: 'Chicken Wings', price: 8.99 },
          { product_id: productIds['Nachos'], quantity: 1, name: 'Nachos', price: 7.99 },
          { product_id: productIds['Soft Drink'], quantity: 3, name: 'Soft Drink', price: 2.00 },
        ],
        payment_method: 'cash',
        order_type: 'dine-in',
      },
    ];

    for (let i = 0; i < sales.length; i++) {
      const sale = sales[i];
      const saleNumber = `DEMO-${String(i + 1).padStart(4, '0')}`;
      
      // Calculate totals
      let subtotal = sale.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discountAmount = sale.discount?.amount || 0;
      subtotal = subtotal - discountAmount;
      const vatPercentage = 10;
      const vatAmount = (subtotal * vatPercentage) / 100;
      const total = subtotal + vatAmount;
      const paymentAmount = Math.ceil(total / 5) * 5;
      const changeAmount = paymentAmount - total;

      // Create sale
      const saleResult = await db.run(
        `INSERT INTO sales (
          sale_number, customer_id, user_id, subtotal, discount_amount, discount_type,
          vat_percentage, vat_amount, total, payment_method, payment_amount, change_amount, order_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saleNumber,
          sale.customer_id,
          cashier.id,
          subtotal + discountAmount,
          discountAmount,
          sale.discount?.type || 'fixed',
          vatPercentage,
          vatAmount,
          total,
          sale.payment_method,
          paymentAmount,
          changeAmount,
          sale.order_type,
        ]
      );

      // Create sale items
      for (const item of sale.items) {
        await db.run(
          `INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            saleResult.id,
            item.product_id,
            item.name,
            item.quantity,
            item.price,
            item.price * item.quantity,
          ]
        );
      }

      console.log(`   ✅ Created sale ${saleNumber}: $${total.toFixed(2)}`);
    }

    // Update settings for demo restaurant
    console.log('⚙️  Configuring demo restaurant settings...');
    await db.run('UPDATE settings SET value = ? WHERE key = ?', [restaurantName, 'restaurant_name']);
    await db.run('UPDATE settings SET value = ? WHERE key = ?', ['123 Demo Street, Demo City, DC 12345', 'restaurant_address']);
    await db.run('UPDATE settings SET value = ? WHERE key = ?', ['+1 (555) 123-4567', 'restaurant_phone']);
    await db.run('UPDATE settings SET value = ? WHERE key = ?', [ownerEmail, 'restaurant_email']);
    await db.run('UPDATE settings SET value = ? WHERE key = ?', ['10', 'vat_percentage']);
    console.log('   ✅ Settings updated');

    await db.close();

    console.log('\n🎉 Demo tenant auto-setup completed successfully!\n');
    console.log('📝 Demo Login Credentials:');
    console.log('   Tenant Code: DEMO');
    console.log('   Username: demo');
    console.log('   Password: demo123');

    return { success: true, message: 'Demo tenant created successfully' };
  } catch (error) {
    console.error('❌ Error in auto-setup demo tenant:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { autoSetupDemoTenant };
