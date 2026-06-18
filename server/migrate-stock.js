// Migration: Add stock columns to existing products table
const D = require('better-sqlite3');
const d = new D(__dirname + '/vheora.db');

// Check if stock column already exists
const cols = d.prepare("PRAGMA table_info(products)").all();
const hasStock = cols.some(c => c.name === 'stock');

if (!hasStock) {
  d.exec("ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0");
  d.exec("ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER DEFAULT 5");
  console.log('✓ Added stock and low_stock_threshold columns to products table');
} else {
  console.log('= Stock columns already exist, skipping');
}

d.close();
console.log('Migration complete.');
