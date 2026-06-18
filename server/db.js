const path = require('path');
const bcrypt = require('bcryptjs');

let db = null;

function normalizeSql(sql) {
  if (!process.env.DATABASE_URL) return sql;
  let i = 0;
  let result = '';
  let inString = false;
  let stringChar = '';
  for (let c = 0; c < sql.length; c++) {
    const ch = sql[c];
    if (inString) {
      result += ch;
      if (ch === stringChar && sql[c - 1] !== '\\') inString = false;
    } else {
      if (ch === "'" || ch === '"') {
        inString = true;
        stringChar = ch;
        result += ch;
      } else if (ch === '?') {
        result += `$${++i}`;
      } else {
        result += ch;
      }
    }
  }
  result = result
    .replace(/datetime\(\)/gi, "NOW()")
    .replace(/datetime\('now'\)/gi, 'NOW()')
    .replace(/strftime\('%Y-%m',\s*(\w+)\)/gi, "to_char($1, 'YYYY-MM')")
    .replace(/date\('now',\s*'([^']+)'\)/gi, (_, interval) => {
      const parts = interval.split(' ');
      if (parts.length === 2) {
        const num = parseInt(parts[0]);
        const unit = parts[1].toLowerCase().replace(/s$/, '');
        const map = { day: 'days', month: 'months', year: 'years' };
        return `NOW() - INTERVAL '${num} ${map[unit] || unit + 's'}'`;
      }
      return `NOW() - INTERVAL '${interval}'`;
    })
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
    .replace(/DEFAULT \(datetime\('now'\)\)/gi, 'DEFAULT NOW()')
    .replace(/DEFAULT \(datetime\(\)\)/gi, 'DEFAULT NOW()')
    .replace(/DEFAULT \(date\('now'\)\)/gi, 'DEFAULT CURRENT_DATE');
  return result;
}

async function initSchema(driver) {
  const schema = [
    `CREATE TABLE IF NOT EXISTS users (
      id ${process.env.DATABASE_URL ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      username TEXT UNIQUE NOT NULL,
      email TEXT DEFAULT '',
      password TEXT NOT NULL,
      created_at TEXT DEFAULT ${process.env.DATABASE_URL ? "NOW()" : "(datetime('now'))"}
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id ${process.env.DATABASE_URL ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT DEFAULT '',
      price TEXT DEFAULT '',
      image TEXT DEFAULT '',
      is_featured INTEGER DEFAULT 0,
      badge TEXT DEFAULT '',
      stock INTEGER DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 5,
      created_at TEXT DEFAULT ${process.env.DATABASE_URL ? "NOW()" : "(datetime('now'))"},
      updated_at TEXT DEFAULT ${process.env.DATABASE_URL ? "NOW()" : "(datetime('now'))"}
    )`,
    `CREATE TABLE IF NOT EXISTS messages (
      id ${process.env.DATABASE_URL ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      first_name TEXT DEFAULT '',
      last_name TEXT DEFAULT '',
      email TEXT DEFAULT '',
      subject TEXT DEFAULT '',
      message TEXT DEFAULT '',
      type TEXT DEFAULT 'contact',
      product_name TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT ${process.env.DATABASE_URL ? "NOW()" : "(datetime('now'))"}
    )`,
    `CREATE TABLE IF NOT EXISTS testimonials (
      id ${process.env.DATABASE_URL ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      name TEXT NOT NULL,
      location TEXT DEFAULT '',
      text TEXT NOT NULL,
      rating INTEGER DEFAULT 5,
      is_approved INTEGER DEFAULT 0,
      created_at TEXT DEFAULT ${process.env.DATABASE_URL ? "NOW()" : "(datetime('now'))"}
    )`,
    `CREATE TABLE IF NOT EXISTS admin_logs (
      id ${process.env.DATABASE_URL ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      user_id INTEGER,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      ip_address TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      device_info TEXT DEFAULT '',
      created_at TEXT DEFAULT ${process.env.DATABASE_URL ? "NOW()" : "(datetime('now'))"}
    )`,
    `CREATE TABLE IF NOT EXISTS visitor_logs (
      id ${process.env.DATABASE_URL ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      ip_address TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      device_info TEXT DEFAULT '',
      page_visited TEXT DEFAULT '',
      referrer TEXT DEFAULT '',
      created_at TEXT DEFAULT ${process.env.DATABASE_URL ? "NOW()" : "(datetime('now'))"}
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS languages (
      id ${process.env.DATABASE_URL ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      flag TEXT DEFAULT '',
      is_default INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS translations (
      id ${process.env.DATABASE_URL ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      lang_code TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      UNIQUE(lang_code, key)
    )`,
    `CREATE TABLE IF NOT EXISTS stock_movements (
      id ${process.env.DATABASE_URL ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      product_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('in','out','adjust')),
      quantity INTEGER NOT NULL,
      stock_before INTEGER DEFAULT 0,
      stock_after INTEGER DEFAULT 0,
      note TEXT DEFAULT '',
      created_by TEXT DEFAULT '',
      created_at TEXT DEFAULT ${process.env.DATABASE_URL ? "NOW()" : "(datetime('now'))"},
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id ${process.env.DATABASE_URL ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
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
      created_at TEXT DEFAULT ${process.env.DATABASE_URL ? "NOW()" : "(datetime('now'))"},
      updated_at TEXT DEFAULT ${process.env.DATABASE_URL ? "NOW()" : "(datetime('now'))"}
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id ${process.env.DATABASE_URL ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      order_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )`
  ];

  for (const sql of schema) {
    await driver.exec(normalizeSql(sql));
  }
}

async function seedIfEmpty(driver) {
  const count = await driver.get('SELECT COUNT(*) as c FROM users');
  if (count.c === '0' || count.c === 0) {
    const adminUser = process.env.ADMIN_USERNAME || 'Hamzbkadmin';
    const adminPass = process.env.ADMIN_PASSWORD || 'Vh_12345678';
    const hashed = bcrypt.hashSync(adminPass, 10);
    await driver.run(
      'INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, ?)',
      [adminUser, 'vheora.co@gmail.com', hashed, new Date().toISOString()]
    );

    const seedTestimonials = [
      { name: 'Elif Yılmaz', location: 'İstanbul, Nişantaşı', text: 'Nişan yüzüğümüzü buradan aldık, parmağımdaki ışıltısı her gün beni mutlu ediyor. İşçilik gerçekten çok ince, beklediğimize değdi.', rating: 5 },
      { name: 'Sarah Anderson', location: 'London, Chelsea', text: 'The craftsmanship is simply breathtaking. My engagement ring is a true masterpiece.', rating: 5 },
      { name: 'Mehmet Çelik', location: 'Antalya, Lara', text: 'Annem için özel bir hediye yaptırdık, kutusunu açtığı anki mutluluğu paha biçilemezdi. Gerçekten işinin ehli bir ekip.', rating: 5 },
      { name: 'Sophie Müller', location: 'Munich, Schwabing', text: 'Die Handwerkskunst ist einfach atemberaubend. Ein wahres Meisterwerk.', rating: 5 },
      { name: 'Zeynep Demir', location: 'Ankara, Çankaya', text: 'Eşim için yaptırdığım bileklik tam zamanında yetişti. Zarif ve modern duruşuyla her kıyafete uyum sağlıyor.', rating: 5 },
      { name: 'James Wilson', location: 'New York, Manhattan', text: 'Exceptional quality and fast global shipping. Highly recommend VHEORA.', rating: 5 }
    ];

    for (const t of seedTestimonials) {
      await driver.run(
        'INSERT INTO testimonials (name, location, text, rating, is_approved, created_at) VALUES (?, ?, ?, ?, 1, ?)',
        [t.name, t.location, t.text, t.rating, new Date().toISOString()]
      );
    }
  }

  const settingCount = await driver.get('SELECT COUNT(*) as c FROM settings');
  if (settingCount.c === '0' || settingCount.c === 0) {
    const defaultSettings = [
      ['maintenance_mode', '0'],
      ['maintenance_title', 'Yakında Hizmetinizdeyiz'],
      ['maintenance_message', 'Sizler için çalışıyoruz. En kısa sürede muhteşem deneyimle sizlerle olacağız.'],
      ['currency', 'TRY'],
      ['timezone', 'Europe/Istanbul'],
      ['site_hero_title', ''],
      ['site_hero_desc', ''],
      ['site_badge_text', ''],
      ['site_about_text_1', ''],
      ['site_about_text_2', ''],
      ['site_stat_country', ''],
      ['site_stat_customer', ''],
      ['site_stat_collection', ''],
      ['site_contact_address', ''],
      ['site_contact_email', ''],
      ['site_contact_phone', ''],
      ['site_contact_hours', '']
    ];
    for (const [key, value] of defaultSettings) {
      await driver.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }
  }

  const langCount = await driver.get('SELECT COUNT(*) as c FROM languages');
  if (langCount.c === '0' || langCount.c === 0) {
    await driver.run('INSERT INTO languages (code, name, flag, is_default, is_active) VALUES (?, ?, ?, ?, ?)', ['tr', 'Türkçe', '🇹🇷', 1, 1]);
    await driver.run('INSERT INTO languages (code, name, flag, is_default, is_active) VALUES (?, ?, ?, ?, ?)', ['en', 'English', '🇺🇸', 0, 1]);
    await driver.run('INSERT INTO languages (code, name, flag, is_default, is_active) VALUES (?, ?, ?, ?, ?)', ['de', 'Deutsch', '🇩🇪', 0, 1]);
    await driver.run('INSERT INTO languages (code, name, flag, is_default, is_active) VALUES (?, ?, ?, ?, ?)', ['ru', 'Русский', '🇷🇺', 0, 1]);
    await driver.run('INSERT INTO languages (code, name, flag, is_default, is_active) VALUES (?, ?, ?, ?, ?)', ['fr', 'Français', '🇫🇷', 0, 1]);
    await driver.run('INSERT INTO languages (code, name, flag, is_default, is_active) VALUES (?, ?, ?, ?, ?)', ['ar', 'العربية', '🇸🇦', 0, 1]);
  }
}

function createSQLiteDriver(dbPath) {
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (e) {
    throw new Error('SQLite (better-sqlite3) not available. Set DATABASE_URL for PostgreSQL.');
  }
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  return {
    async all(sql, params) {
      const stmt = sqlite.prepare(sql);
      return params ? stmt.all(...params) : stmt.all();
    },
    async get(sql, params) {
      const stmt = sqlite.prepare(sql);
      return params ? stmt.get(...params) : stmt.get();
    },
    async run(sql, params) {
      const stmt = sqlite.prepare(sql);
      let result;
      if (params) {
        result = stmt.run(...params);
      } else {
        result = stmt.run();
      }
      return { lastInsertRowid: result.lastInsertRowid, changes: result.changes };
    },
    async exec(sql) {
      sqlite.exec(sql);
    },
    close() {
      sqlite.close();
    }
  };
}

function createPgDriver(connectionString) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString });

  return {
    async all(sql, params) {
      const res = await pool.query(normalizeSql(sql), params);
      return res.rows;
    },
    async get(sql, params) {
      const res = await pool.query(normalizeSql(sql), params);
      return res.rows[0] || null;
    },
    async run(sql, params) {
      const hasReturning = /RETURNING/i.test(sql);
      const finalSql = hasReturning ? sql : sql + ' RETURNING id';
      const res = await pool.query(normalizeSql(finalSql), params);
      return { lastInsertRowid: res.rows[0]?.id || res.rows[0]?.lastInsertRowid || null, changes: res.rowCount };
    },
    async exec(sql) {
      await pool.query(normalizeSql(sql));
    },
    close() {
      pool.end();
    }
  };
}

async function getDb() {
  if (db) return db;

  if (process.env.DATABASE_URL) {
    console.log('[DB] Using PostgreSQL');
    db = createPgDriver(process.env.DATABASE_URL);
  } else {
    console.log('[DB] Using SQLite');
    db = createSQLiteDriver(path.join(__dirname, 'vheora.db'));
  }

  await initSchema(db);
  await seedIfEmpty(db);

  return db;
}

module.exports = { getDb };
