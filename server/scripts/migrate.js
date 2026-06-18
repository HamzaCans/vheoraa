const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'vheora.db');
const JSON_PATH = path.join(__dirname, '..', 'vheora.json');

console.log('[MIGRATE] Starting JSON -> SQLite migration...');

if (!fs.existsSync(JSON_PATH)) {
  console.log('[MIGRATE] No JSON file found, starting fresh');
  process.exit(0);
}

const jsonData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log('[MIGRATE] Removed existing SQLite database');
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT DEFAULT '',
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT DEFAULT '',
    price TEXT DEFAULT '',
    image TEXT DEFAULT '',
    is_featured INTEGER DEFAULT 0,
    badge TEXT DEFAULT '',
    stock INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT DEFAULT '',
    last_name TEXT DEFAULT '',
    email TEXT DEFAULT '',
    subject TEXT DEFAULT '',
    message TEXT DEFAULT '',
    type TEXT DEFAULT 'contact',
    product_name TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS testimonials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT DEFAULT '',
    text TEXT NOT NULL,
    rating INTEGER DEFAULT 5,
    is_approved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('in','out','adjust')),
    quantity INTEGER NOT NULL,
    stock_before INTEGER DEFAULT 0,
    stock_after INTEGER DEFAULT 0,
    note TEXT DEFAULT '',
    created_by TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT DEFAULT '',
    customer_phone TEXT DEFAULT '',
    shipping_address TEXT DEFAULT '',
    city TEXT DEFAULT '',
    district TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','preparing','shipped','delivered','cancelled')),
    carrier TEXT DEFAULT '',
    tracking_no TEXT DEFAULT '',
    total_amount REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  );
`);

const migrate = db.transaction(() => {
  // Users
  if (jsonData.users && jsonData.users.length > 0) {
    const insertUser = db.prepare(
      'INSERT INTO users (id, username, email, password, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    for (const u of jsonData.users) {
      // Re-hash if plain text
      const password = u.password.startsWith('$2a$') || u.password.startsWith('$2b$')
        ? u.password
        : bcrypt.hashSync(u.password, 10);
      insertUser.run(u.id, u.username, u.email || '', password, u.created_at || new Date().toISOString());
    }
    console.log(`[MIGRATE] Migrated ${jsonData.users.length} users`);
  }

  // Products
  if (jsonData.products && jsonData.products.length > 0) {
    const insertProduct = db.prepare(
      `INSERT INTO products (id, name, category, description, price, image, is_featured, badge, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const p of jsonData.products) {
      insertProduct.run(p.id, p.name, p.category, p.description || '', p.price || '', p.image || '',
        p.is_featured || 0, p.badge || '', p.created_at || new Date().toISOString(), p.updated_at || p.created_at || new Date().toISOString());
    }
    console.log(`[MIGRATE] Migrated ${jsonData.products.length} products`);
  }

  // Messages
  if (jsonData.messages && jsonData.messages.length > 0) {
    const insertMessage = db.prepare(
      `INSERT INTO messages (id, first_name, last_name, email, subject, message, type, product_name, phone, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const m of jsonData.messages) {
      insertMessage.run(m.id, m.first_name || '', m.last_name || '', m.email || '', m.subject || '',
        m.message || '', m.type || 'contact', m.product_name || '', m.phone || '', m.is_read || 0, m.created_at || new Date().toISOString());
    }
    console.log(`[MIGRATE] Migrated ${jsonData.messages.length} messages`);
  }

  // Testimonials
  if (jsonData.testimonials && jsonData.testimonials.length > 0) {
    const insertTestimonial = db.prepare(
      `INSERT INTO testimonials (id, name, location, text, rating, is_approved, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const t of jsonData.testimonials) {
      insertTestimonial.run(t.id, t.name, t.location || '', t.text, t.rating || 5, t.is_approved || 0, t.created_at || new Date().toISOString());
    }
    console.log(`[MIGRATE] Migrated ${jsonData.testimonials.length} testimonials`);
  }
});

migrate();
db.close();

console.log('[MIGRATE] Migration completed successfully!');
console.log('[MIGRATE] You can now delete vheora.json if everything looks good.');
