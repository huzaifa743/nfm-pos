const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Persistent storage: DATA_DIR, or Railway volume path, or project dir (ephemeral – tenants lost on redeploy).
const dataDir = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
const masterDbPath = path.join(dataDir, 'master.db');
const tenantsDir = path.join(dataDir, 'tenants');
const isPersistent = dataDir !== __dirname;

if (isPersistent) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const src = process.env.DATA_DIR ? 'DATA_DIR' : 'Railway volume';
  console.log('✅ Persistent storage:', dataDir, `(${src})`);
} else {
  console.warn('\n⚠️  TENANTS WILL BE LOST ON REDEPLOY: No persistent storage configured.');
  console.warn('   Add a Railway Volume (mount at /data) + set DATA_DIR=/data, or see PERSISTENCE.md.\n');
}
if (!fs.existsSync(tenantsDir)) {
  fs.mkdirSync(tenantsDir, { recursive: true });
}

// Master database connection
const masterDb = new sqlite3.Database(masterDbPath, (err) => {
  if (err) {
    console.error('Error opening master database:', err);
  } else {
    console.log('✅ Connected to master database');
    initializeMasterDatabase().catch(err => {
      console.error('Error initializing master database:', err);
    });
  }
});

// Initialize master database - returns a Promise
function initializeMasterDatabase() {
  return new Promise((resolve, reject) => {
    masterDb.serialize(() => {
      // Super admins table - stores super admin accounts
      masterDb.run(`CREATE TABLE IF NOT EXISTS super_admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE,
        full_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Error creating super_admins table:', err);
          reject(err);
          return;
        }
      });

      // Tenants table - stores information about each business/tenant
      masterDb.run(`CREATE TABLE IF NOT EXISTS tenants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_code TEXT UNIQUE NOT NULL,
        restaurant_name TEXT NOT NULL,
        owner_name TEXT NOT NULL,
        owner_email TEXT UNIQUE NOT NULL,
        owner_phone TEXT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        activated_at DATETIME,
        valid_until DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Error creating tenants table:', err);
          reject(err);
          return;
        }
        // Migrate existing DBs: add activated_at if missing
        masterDb.run('ALTER TABLE tenants ADD COLUMN activated_at DATETIME', (err2) => {
          if (err2 && !/duplicate column name/i.test(err2.message)) {
            console.error('Error adding activated_at:', err2);
            reject(err2);
            return;
          }
          // Migrate existing DBs: add valid_until if missing
          masterDb.run('ALTER TABLE tenants ADD COLUMN valid_until DATETIME', (err3) => {
            if (err3 && !/duplicate column name/i.test(err3.message)) {
              console.error('Error adding valid_until:', err3);
              reject(err3);
              return;
            }
            console.log('✅ Master database initialized');
            resolve();
          });
        });
      });
    });
  });
}

// Ensure database is initialized before use
let initPromise = null;
function ensureInitialized() {
  if (!initPromise) {
    initPromise = initializeMasterDatabase();
  }
  return initPromise;
}

// Get tenant database path
function getTenantDbPath(tenantCode) {
  return path.join(tenantsDir, `${tenantCode}.db`);
}

// Create a new tenant database
function createTenantDatabase(tenantCode) {
  return new Promise((resolve, reject) => {
    const dbPath = getTenantDbPath(tenantCode);
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Initialize tenant database with all tables
      db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'cashier',
          full_name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) console.error('Error creating users table:', err);
        });

        // Categories table
        db.run(`CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) console.error('Error creating categories table:', err);
        });

        // Products table
        db.run(`CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          category_id INTEGER,
          image TEXT,
          description TEXT,
          stock_quantity INTEGER DEFAULT 0,
          stock_tracking_enabled INTEGER DEFAULT 0,
          expiry_date TEXT,
          vat_percentage REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id)
        )`, (err) => {
          if (err) console.error('Error creating products table:', err);
        });

        // Customers table
        db.run(`CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          country TEXT,
          city TEXT,
          address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) console.error('Error creating customers table:', err);
        });

        // Sales table
        db.run(`CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_number TEXT UNIQUE NOT NULL,
          customer_id INTEGER,
          user_id INTEGER NOT NULL,
          subtotal REAL NOT NULL,
          discount_amount REAL DEFAULT 0,
          discount_type TEXT DEFAULT 'fixed',
          vat_percentage REAL DEFAULT 0,
          vat_amount REAL DEFAULT 0,
          total REAL NOT NULL,
          payment_method TEXT NOT NULL,
          payment_amount REAL NOT NULL,
          change_amount REAL DEFAULT 0,
          order_type TEXT DEFAULT 'dine-in',
          status TEXT DEFAULT 'completed',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`, (err) => {
          if (err) console.error('Error creating sales table:', err);
        });

        // Sale items table
        db.run(`CREATE TABLE IF NOT EXISTS sale_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          product_name TEXT NOT NULL,
          quantity REAL NOT NULL,
          unit_price REAL NOT NULL,
          total_price REAL NOT NULL,
          vat_percentage REAL DEFAULT 0,
          vat_amount REAL DEFAULT 0,
          FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id)
        )`, (err) => {
          if (err) console.error('Error creating sale_items table:', err);
        });

        // Held sales table
        db.run(`CREATE TABLE IF NOT EXISTS held_sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          hold_number TEXT UNIQUE NOT NULL,
          customer_id INTEGER,
          user_id INTEGER NOT NULL,
          cart_data TEXT NOT NULL,
          subtotal REAL NOT NULL,
          discount_amount REAL DEFAULT 0,
          discount_type TEXT DEFAULT 'fixed',
          vat_percentage REAL DEFAULT 0,
          vat_amount REAL DEFAULT 0,
          total REAL NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`, (err) => {
          if (err) console.error('Error creating held_sales table:', err);
        });

        // Settings table
        db.run(`CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          value TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) {
            console.error('Error creating settings table:', err);
            db.close();
            reject(err);
            return;
          }

          // Delivery boys table
          db.run(`CREATE TABLE IF NOT EXISTS delivery_boys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address TEXT,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`, (err) => {
            if (err) {
              console.error('Error creating delivery_boys table:', err);
              db.close();
              reject(err);
              return;
            }

            // Employees table
            db.run(`CREATE TABLE IF NOT EXISTS employees (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              phone TEXT,
              email TEXT,
              address TEXT,
              designation TEXT,
              basic_salary REAL NOT NULL DEFAULT 0,
              commission_rate REAL DEFAULT 0,
              status TEXT DEFAULT 'active',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
              if (err) { console.error('Error creating employees table:', err); }
            });

            // Employee salary records
            db.run(`CREATE TABLE IF NOT EXISTS employee_salaries (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              employee_id INTEGER NOT NULL,
              month TEXT NOT NULL,
              year INTEGER NOT NULL,
              basic_salary REAL NOT NULL DEFAULT 0,
              commission_amount REAL DEFAULT 0,
              other_additions REAL DEFAULT 0,
              advance_deduction REAL DEFAULT 0,
              other_deductions REAL DEFAULT 0,
              net_pay REAL NOT NULL DEFAULT 0,
              paid_amount REAL DEFAULT 0,
              remaining_amount REAL DEFAULT 0,
              status TEXT DEFAULT 'pending',
              paid_at DATETIME,
              notes TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (employee_id) REFERENCES employees(id),
              UNIQUE(employee_id, month, year)
            )`, (err) => {
              if (err) { console.error('Error creating employee_salaries table:', err); }
            });

            // Employee advances
            db.run(`CREATE TABLE IF NOT EXISTS employee_advances (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              employee_id INTEGER NOT NULL,
              amount REAL NOT NULL,
              reason TEXT,
              status TEXT DEFAULT 'pending',
              salary_record_id INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (employee_id) REFERENCES employees(id),
              FOREIGN KEY (salary_record_id) REFERENCES employee_salaries(id)
            )`, (err) => {
              if (err) { console.error('Error creating employee_advances table:', err); }
            });

            // Suppliers table
            db.run(`CREATE TABLE IF NOT EXISTS suppliers (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              phone TEXT,
              email TEXT,
              address TEXT,
              contact_person TEXT,
              balance REAL DEFAULT 0,
              status TEXT DEFAULT 'active',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
              if (err) { console.error('Error creating suppliers table:', err); }
            });

            // Supplier ledger (transactions)
            db.run(`CREATE TABLE IF NOT EXISTS supplier_ledger (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              supplier_id INTEGER NOT NULL,
              type TEXT NOT NULL,
              amount REAL NOT NULL,
              reference_type TEXT,
              reference_id INTEGER,
              description TEXT,
              balance_after REAL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
            )`, (err) => {
              if (err) { console.error('Error creating supplier_ledger table:', err); }
            });

            // Purchase orders
            db.run(`CREATE TABLE IF NOT EXISTS purchase_orders (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              po_number TEXT UNIQUE NOT NULL,
              supplier_id INTEGER NOT NULL,
              order_date TEXT NOT NULL,
              expected_date TEXT,
              status TEXT DEFAULT 'draft',
              subtotal REAL DEFAULT 0,
              discount_amount REAL DEFAULT 0,
              vat_amount REAL DEFAULT 0,
              total REAL DEFAULT 0,
              paid_amount REAL DEFAULT 0,
              notes TEXT,
              created_by INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
              FOREIGN KEY (created_by) REFERENCES users(id)
            )`, (err) => {
              if (err) { console.error('Error creating purchase_orders table:', err); }
            });

            // Purchase order items
            db.run(`CREATE TABLE IF NOT EXISTS purchase_order_items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              purchase_order_id INTEGER NOT NULL,
              product_id INTEGER,
              product_name TEXT NOT NULL,
              quantity REAL NOT NULL,
              unit_price REAL NOT NULL,
              total_price REAL NOT NULL,
              received_quantity REAL DEFAULT 0,
              FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
              FOREIGN KEY (product_id) REFERENCES products(id)
            )`, (err) => {
              if (err) { console.error('Error creating purchase_order_items table:', err); }
            });

            // Expense categories
            db.run(`CREATE TABLE IF NOT EXISTS expense_categories (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL UNIQUE,
              description TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
              if (err) { console.error('Error creating expense_categories table:', err); }
            });

            // Expenses
            db.run(`CREATE TABLE IF NOT EXISTS expenses (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              category_id INTEGER,
              amount REAL NOT NULL,
              description TEXT,
              expense_date TEXT NOT NULL,
              payment_method TEXT DEFAULT 'cash',
              reference TEXT,
              created_by INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (category_id) REFERENCES expense_categories(id),
              FOREIGN KEY (created_by) REFERENCES users(id)
            )`, (err) => {
              if (err) { console.error('Error creating expenses table:', err); }
            });

            // Cash management
            db.run(`CREATE TABLE IF NOT EXISTS cash_transactions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              type TEXT NOT NULL,
              amount REAL NOT NULL,
              description TEXT,
              reference_type TEXT,
              reference_id INTEGER,
              balance_after REAL,
              created_by INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (created_by) REFERENCES users(id)
            )`, (err) => {
              if (err) { console.error('Error creating cash_transactions table:', err); }
            });

            // Unit conversions
            db.run(`CREATE TABLE IF NOT EXISTS unit_conversions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              code TEXT NOT NULL UNIQUE,
              name TEXT NOT NULL,
              base_unit TEXT NOT NULL,
              operator TEXT NOT NULL CHECK(operator IN ('*', '/')),
              operation_value REAL NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
              if (err) { console.error('Error creating unit_conversions table:', err); }
            });

            // Insert default settings
            const defaultSettings = [
              ['restaurant_name', 'My POS'],
              ['restaurant_logo', ''],
              ['vat_percentage', '0'],
              ['currency', 'USD'],
              ['language', 'en'],
              ['invoice_type', 'thermal']
            ];

            let completed = 0;
            defaultSettings.forEach(([key, value]) => {
              db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`, [key, value], (err) => {
                if (err) console.error(`Error inserting ${key}:`, err);
                completed++;
                if (completed === defaultSettings.length) {
                  db.close();
                  resolve(dbPath);
                }
              });
            });
          });
        });
      });
    });
  });
}

// Migrate existing tenant database - add missing tables
function migrateTenantDatabase(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      let migrationsCompleted = 0;
      const totalMigrations = 13;

      const checkMigrationComplete = () => {
        migrationsCompleted++;
        if (migrationsCompleted === totalMigrations) {
          resolve();
        }
      };

      const createTableIfNotExists = (name, sql, cb) => {
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [name], (err, row) => {
          if (err) { reject(err); return; }
          if (!row) {
            db.run(sql, (err2) => {
              if (err2) { reject(err2); return; }
              console.log('✅ Migration: created', name);
              cb();
            });
          } else {
            cb();
          }
        });
      };

      // Check if held_sales table exists and create if missing
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='held_sales'", (err, row) => {
        if (err) {
          console.error('Error checking held_sales table:', err);
          reject(err);
          return;
        }
        
        if (!row) {
          // Table doesn't exist, create it
          console.log('Migrating: Creating held_sales table...');
          db.run(`CREATE TABLE IF NOT EXISTS held_sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hold_number TEXT UNIQUE NOT NULL,
            customer_id INTEGER,
            user_id INTEGER NOT NULL,
            cart_data TEXT NOT NULL,
            subtotal REAL NOT NULL,
            discount_amount REAL DEFAULT 0,
            discount_type TEXT DEFAULT 'fixed',
            vat_percentage REAL DEFAULT 0,
            vat_amount REAL DEFAULT 0,
            total REAL NOT NULL,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
          )`, (err) => {
            if (err) {
              console.error('Error creating held_sales table:', err);
              reject(err);
            } else {
              console.log('✅ Migration complete: held_sales table created');
              checkMigrationComplete();
            }
          });
        } else {
          // Table exists, no migration needed
          checkMigrationComplete();
        }
      });

      // Check if delivery_boys table exists and create if missing
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='delivery_boys'", (err, row) => {
        if (err) {
          console.error('Error checking delivery_boys table:', err);
          reject(err);
          return;
        }
        
        if (!row) {
          // Table doesn't exist, create it
          console.log('Migrating: Creating delivery_boys table...');
          db.run(`CREATE TABLE IF NOT EXISTS delivery_boys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address TEXT,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`, (err) => {
            if (err) {
              console.error('Error creating delivery_boys table:', err);
              reject(err);
            } else {
              console.log('✅ Migration complete: delivery_boys table created');
              checkMigrationComplete();
            }
          });
        } else {
          // Table exists, no migration needed
          checkMigrationComplete();
        }
      });

      // Add stock_tracking_enabled to products table if missing
      db.run('ALTER TABLE products ADD COLUMN stock_tracking_enabled INTEGER DEFAULT 0', (err) => {
        if (err && !/duplicate column name/i.test(err.message)) {
          console.error('Error adding stock_tracking_enabled to products:', err);
          reject(err);
          return;
        }
        console.log('✅ Migration complete: stock_tracking_enabled column in products table');
        checkMigrationComplete();
      });

      // Employees table
      createTableIfNotExists('employees', `CREATE TABLE employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        designation TEXT,
        basic_salary REAL NOT NULL DEFAULT 0,
        commission_rate REAL DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, checkMigrationComplete);

      // Employee salaries
      createTableIfNotExists('employee_salaries', `CREATE TABLE employee_salaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        month TEXT NOT NULL,
        year INTEGER NOT NULL,
        basic_salary REAL NOT NULL DEFAULT 0,
        commission_amount REAL DEFAULT 0,
        other_additions REAL DEFAULT 0,
        advance_deduction REAL DEFAULT 0,
        other_deductions REAL DEFAULT 0,
        net_pay REAL NOT NULL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        remaining_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        paid_at DATETIME,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id),
        UNIQUE(employee_id, month, year)
      )`, checkMigrationComplete);

      // Employee advances
      createTableIfNotExists('employee_advances', `CREATE TABLE employee_advances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        reason TEXT,
        status TEXT DEFAULT 'pending',
        salary_record_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id),
        FOREIGN KEY (salary_record_id) REFERENCES employee_salaries(id)
      )`, checkMigrationComplete);

      // Suppliers
      createTableIfNotExists('suppliers', `CREATE TABLE suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        contact_person TEXT,
        balance REAL DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, checkMigrationComplete);

      // Supplier ledger
      createTableIfNotExists('supplier_ledger', `CREATE TABLE supplier_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        reference_type TEXT,
        reference_id INTEGER,
        description TEXT,
        balance_after REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
      )`, checkMigrationComplete);

      // Purchase orders
      createTableIfNotExists('purchase_orders', `CREATE TABLE purchase_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        po_number TEXT UNIQUE NOT NULL,
        supplier_id INTEGER NOT NULL,
        order_date TEXT NOT NULL,
        expected_date TEXT,
        status TEXT DEFAULT 'draft',
        subtotal REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        vat_amount REAL DEFAULT 0,
        total REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        notes TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )`, checkMigrationComplete);

      // Purchase order items
      createTableIfNotExists('purchase_order_items', `CREATE TABLE purchase_order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchase_order_id INTEGER NOT NULL,
        product_id INTEGER,
        product_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        received_quantity REAL DEFAULT 0,
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )`, checkMigrationComplete);

      // Expense categories
      createTableIfNotExists('expense_categories', `CREATE TABLE expense_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, checkMigrationComplete);

      // Expenses
      createTableIfNotExists('expenses', `CREATE TABLE expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER,
        amount REAL NOT NULL,
        description TEXT,
        expense_date TEXT NOT NULL,
        payment_method TEXT DEFAULT 'cash',
        reference TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES expense_categories(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )`, checkMigrationComplete);

      // Cash transactions
      createTableIfNotExists('cash_transactions', `CREATE TABLE cash_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        reference_type TEXT,
        reference_id INTEGER,
        balance_after REAL,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )`, checkMigrationComplete);

      // Unit conversions
      createTableIfNotExists('unit_conversions', `CREATE TABLE unit_conversions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        base_unit TEXT NOT NULL,
        operator TEXT NOT NULL CHECK(operator IN ('*', '/')),
        operation_value REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, checkMigrationComplete);
    });
  });
}

// Get tenant database connection
function getTenantDatabase(tenantCode) {
  return new Promise((resolve, reject) => {
    const dbPath = getTenantDbPath(tenantCode);
    
    if (!fs.existsSync(dbPath)) {
      reject(new Error(`Tenant database not found: ${tenantCode}`));
      return;
    }

    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
      } else {
        // Run migrations for existing databases
        migrateTenantDatabase(db)
          .then(() => resolve(db))
          .catch(reject);
      }
    });
  });
}

// Database helper functions for tenant database
function createDbHelpers(db) {
  return {
    query: (sql, params = []) => {
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    },
    run: (sql, params = []) => {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, changes: this.changes });
        });
      });
    },
    get: (sql, params = []) => {
      return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    },
    close: () => {
      return new Promise((resolve) => {
        db.close((err) => {
          if (err) console.error('Error closing database:', err);
          resolve();
        });
      });
    }
  };
}

// Master database helpers
const masterDbHelpers = {
  query: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      masterDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      masterDb.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      masterDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
};

module.exports = {
  masterDb,
  masterDbHelpers,
  createTenantDatabase,
  getTenantDatabase,
  createDbHelpers,
  getTenantDbPath,
  tenantsDir,
  ensureInitialized,
  initializeMasterDatabase
};
