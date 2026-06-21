const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { logAdminAction } = require('../middleware/adminLogger');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `product-${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece JPG, PNG, WebP dosyaları kabul edilir'));
    }
  }
});

function productPublic(p) {
  let stock_status = 'in_stock';
  if (p.stock <= 0) stock_status = 'out_of_stock';
  else if (p.stock <= p.low_stock_threshold) stock_status = 'low_stock';
  var images = [];
  try { images = JSON.parse(p.images || '[]'); } catch (_) {}
  if (!images.length && p.image) images = [p.image];
  return {
    id: p.id, name: p.name, category: p.category,
    description: p.description, price: p.price,
    gram: p.gram, labor_cost: p.labor_cost || 2500,
    image: p.image, images: images, is_featured: p.is_featured,
    badge: p.badge, sort_order: p.sort_order || 0,
    created_at: p.created_at,
    stock_status
  };
}

router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const { category } = req.query;
    let sql = 'SELECT * FROM products';
    const params = [];

    if (category && category !== 'all') {
      sql += ' WHERE category = ?';
      params.push(category);
    }
    sql += ' ORDER BY sort_order ASC, created_at DESC';

    const products = await db.all(sql, params);
    res.json(products.map(productPublic));
  } catch (err) {
    console.error('[Products Error]', err);
    res.status(500).json({ error: 'Ürünler yüklenirken hata oluştu' });
  }
});

router.get('/featured', async (req, res) => {
  try {
    const db = await getDb();
    const products = await db.all(
      'SELECT * FROM products WHERE is_featured = 1 ORDER BY sort_order ASC, created_at DESC LIMIT 6'
    );
    res.json(products.map(productPublic));
  } catch (err) {
    console.error('[Products Error]', err);
    res.status(500).json({ error: 'Ürünler yüklenirken hata oluştu' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }
    res.json(productPublic(product));
  } catch (err) {
    console.error('[Products Error]', err);
    res.status(500).json({ error: 'Ürün yüklenirken hata oluştu' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    let { name, category, description, price, is_featured, badge, gram, labor_cost, sort_order, image_data, images_data } = req.body;
    var images = [];
    if (Array.isArray(images_data) && images_data.length) {
      images = images_data.map(function(img) { return String(img).substring(0, 5000000); }).slice(0, 10);
    } else if (image_data) {
      images = [String(image_data).substring(0, 5000000)];
    }
    const image = images[0] || '';

    if (!name || !category) {
      return res.status(400).json({ error: 'Ürün adı ve kategori gerekli' });
    }

    name = String(name).substring(0, 200);
    category = String(category).substring(0, 100);
    description = String(description || '').substring(0, 5000);
    price = String(price || '').substring(0, 50);
    badge = String(badge || '').substring(0, 100);
    gram = String(gram || '').substring(0, 50);
    labor_cost = parseInt(labor_cost) || 2500;
    sort_order = parseInt(sort_order) || 0;

    const now = new Date().toISOString();
    const result = await db.run(
      `INSERT INTO products (name, category, description, price, image, images, is_featured, badge, gram, labor_cost, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, category, description || '', price || '', image, JSON.stringify(images), is_featured === '1' ? 1 : 0, badge || '', gram || '', labor_cost, sort_order, now, now]
    );

    try { logAdminAction(req, `create_product: ${name}`); } catch (_) {}

    const product = await db.get('SELECT * FROM products WHERE id = ?', [result.lastInsertRowid]);
    res.json(productPublic(product));
  } catch (err) {
    console.error('[Products Error]', err);
    res.status(500).json({ error: 'Ürün eklenirken hata oluştu' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const existing = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    let { name, category, description, price, is_featured, badge, gram, labor_cost, sort_order, image_data, images_data } = req.body;
    var images = existing.images ? JSON.parse(existing.images || '[]') : (existing.image ? [existing.image] : []);
    if (images_data !== undefined) {
      if (Array.isArray(images_data) && images_data.length) {
        images = images_data.map(function(img) { return String(img).substring(0, 5000000); }).slice(0, 10);
      } else if (images_data === null) {
        images = [];
      }
    } else if (image_data !== undefined) {
      images = image_data ? [String(image_data).substring(0, 5000000)] : [];
    }
    const image = images[0] || '';

    if (name !== undefined) name = String(name).substring(0, 200);
    if (category !== undefined) category = String(category).substring(0, 100);
    if (description !== undefined) description = String(description || '').substring(0, 5000);
    if (price !== undefined) price = String(price).substring(0, 50);
    if (badge !== undefined) badge = String(badge || '').substring(0, 100);
    if (gram !== undefined) gram = String(gram || '').substring(0, 50);
    if (labor_cost !== undefined) labor_cost = parseInt(labor_cost) || 2500;
    if (sort_order !== undefined) sort_order = parseInt(sort_order) || 0;

    const now = new Date().toISOString();
    await db.run(
      `UPDATE products SET name = ?, category = ?, description = ?, price = ?, image = ?, images = ?,
       is_featured = ?, badge = ?, gram = ?, labor_cost = ?, sort_order = ?, updated_at = ? WHERE id = ?`,
      [
        name || existing.name,
        category || existing.category,
        description !== undefined ? description : existing.description,
        price !== undefined ? price : existing.price,
        image,
        JSON.stringify(images),
        is_featured !== undefined ? (is_featured === '1' ? 1 : 0) : existing.is_featured,
        badge !== undefined ? badge : existing.badge,
        gram !== undefined ? gram : (existing.gram || ''),
        labor_cost !== undefined ? labor_cost : (existing.labor_cost || 2500),
        sort_order !== undefined ? sort_order : (existing.sort_order || 0),
        now,
        req.params.id
      ]
    );

    try { logAdminAction(req, `update_product: ${req.params.id} - ${name || existing.name}`); } catch (_) {}

    const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json(productPublic(product));
  } catch (err) {
    console.error('[Products Error]', err);
    res.status(500).json({ error: 'Ürün güncellenirken hata oluştu' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const existing = await db.get('SELECT name FROM products WHERE id = ?', [req.params.id]);
    const result = await db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }
    try { logAdminAction(req, `delete_product: ${req.params.id} - ${existing?.name || 'unknown'}`); } catch (_) {}
    res.json({ message: 'Ürün silindi' });
  } catch (err) {
    console.error('[Products Error]', err);
    res.status(500).json({ error: 'Ürün silinirken hata oluştu' });
  }
});

module.exports = router;
