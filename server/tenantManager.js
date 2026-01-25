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
          console.log('✅ Master database initialized');
          resolve();
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
          expiry_date TEXT,
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

          // Insert default settings
          const defaultSettings = [
            ['restaurant_name', 'My POS'],
            ['restaurant_logo', ''],
            ['vat_percentage', '0'],
            ['currency', 'USD'],
            ['language', 'en']
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
}

// Migrate existing tenant database - add missing tables
function migrateTenantDatabase(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
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
              resolve();
            }
          });
        } else {
          // Table exists, no migration needed
          resolve();
        }
      });
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
