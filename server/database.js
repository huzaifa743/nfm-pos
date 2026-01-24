const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database path configuration
// Railway: Persistent storage works on free tier - database persists across restarts
// Render: Free tier does NOT support persistent disk storage - use PostgreSQL or upgrade
// You can set DB_PATH environment variable to override the default path
let dbPath;
if (process.env.DB_PATH) {
  // Use custom path from environment variable
  dbPath = process.env.DB_PATH;
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
} else if (process.env.RAILWAY_ENVIRONMENT) {
  // Railway: Use persistent storage directory
  // Railway provides persistent storage on free tier
  const railwayDataPath = process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
  dbPath = path.join(railwayDataPath, 'pos.db');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  console.log('✅ Railway: Using persistent storage for database');
} else if (process.env.RENDER && process.env.RENDER_DISK_PATH) {
  // Use Render persistent disk path if available (paid plans only)
  dbPath = path.join(process.env.RENDER_DISK_PATH, 'pos.db');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
} else {
  // Default: use server directory
  // Ephemeral on Render free tier, persistent on Railway
  dbPath = path.join(__dirname, 'pos.db');
}

console.log(`Database path: ${dbPath}`);

// Warning about Render free tier persistence
if (process.env.RENDER && !process.env.RENDER_DISK_PATH && !process.env.DB_PATH) {
  console.warn('⚠️  WARNING: Render free tier does NOT support persistent disk storage.');
  console.warn('⚠️  Your SQLite database will be lost on every restart/deployment.');
  console.warn('⚠️  For persistence, use Render PostgreSQL (free) or upgrade to paid plan.');
} else if (process.env.RAILWAY_ENVIRONMENT) {
  console.log('✅ Railway: Database will persist across restarts');
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('✅ Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  // Create all tables sequentially using callbacks to ensure they're created before querying
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
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )`, (err) => {
      if (err) console.error('Error creating sale_items table:', err);
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
        return;
      }
      
      // After settings table is created, insert default settings
      db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('restaurant_name', 'My POS')`, (err) => {
        if (err) console.error('Error inserting restaurant_name:', err);
      });
      db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('restaurant_logo', '')`, (err) => {
        if (err) console.error('Error inserting restaurant_logo:', err);
      });
      db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('vat_percentage', '0')`, (err) => {
        if (err) console.error('Error inserting vat_percentage:', err);
      });
      db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('currency', 'USD')`, (err) => {
        if (err) console.error('Error inserting currency:', err);
      });
      db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('language', 'en')`, (err) => {
        if (err) console.error('Error inserting language:', err);
      });
    });

    // Check and create admin user after users table is created
    db.get('SELECT id FROM users WHERE username = ?', ['admin'], (err, row) => {
      if (err) {
        console.error('Error checking admin user:', err);
        return;
      }
      
      if (!row) {
        // Admin doesn't exist, create with hashed password
        const bcrypt = require('bcryptjs');
        bcrypt.hash('admin123', 10, (err, hash) => {
          if (err) {
            console.error('Error hashing password:', err);
            return;
          }
          db.run(
            'INSERT INTO users (username, email, password, role, full_name) VALUES (?, ?, ?, ?, ?)',
            ['admin', 'admin@restaurant.com', hash, 'admin', 'Administrator'],
            (err) => {
              if (err) {
                console.error('Error creating admin user:', err);
              } else {
                console.log('✅ Default admin user created: admin / admin123');
              }
            }
          );
        });
      } else {
        console.log('✅ Admin user already exists');
      }
    });
  });
}

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

module.exports = { db, query, run, get };
