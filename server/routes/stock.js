const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.get('/products/low-stock', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const products = await db.all(
      `SELECT id, name, category, stock, low_stock_threshold, price, image
       FROM products WHERE stock <= low_stock_threshold ORDER BY stock ASC`
    );
    res.json(products);
  } catch (err) {
    console.error('[STOCK] Low stock error:', err);
    res.status(500).json({ error: 'Stok bilgisi alınamadı' });
  }
});

router.get('/products/:id/stock', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const product = await db.get(
      'SELECT id, name, stock, low_stock_threshold FROM products WHERE id = ?',
      [req.params.id]
    );
    if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });
    const movements = await db.all(
      `SELECT * FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json({ product, movements });
  } catch (err) {
    console.error('[STOCK] Get stock error:', err);
    res.status(500).json({ error: 'Stok bilgisi alınamadı' });
  }
});

router.put('/products/:id/stock', authenticateToken, async (req, res) => {
  try {
    const { quantity, type, note } = req.body;
    if (!quantity || !type) return res.status(400).json({ error: 'Miktar ve tip gerekli' });
    if (!['in', 'out', 'adjust'].includes(type)) return res.status(400).json({ error: 'Geçersiz stok tipi' });

    const db = await getDb();
    const product = await db.get(
      'SELECT id, name, stock, low_stock_threshold FROM products WHERE id = ?',
      [req.params.id]
    );
    if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 0) return res.status(400).json({ error: 'Geçersiz miktar' });

    let newStock;
    if (type === 'in') newStock = product.stock + qty;
    else if (type === 'out') newStock = Math.max(0, product.stock - qty);
    else newStock = qty;

    await db.run(
      'UPDATE products SET stock = ?, updated_at = ? WHERE id = ?',
      [newStock, new Date().toISOString(), req.params.id]
    );

    await db.run(
      `INSERT INTO stock_movements (product_id, type, quantity, stock_before, stock_after, note, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.params.id, type, type === 'out' ? -qty : qty, product.stock, newStock, note || '', req.user?.username || 'admin', new Date().toISOString()]
    );

    const logDb = await getDb();
    await logDb.run(
      `INSERT INTO admin_logs (user_id, username, action, ip_address, user_agent, device_info, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user?.id || 0, req.user?.username || 'admin', 'stock_adjustment', req.ip || '', req.headers['user-agent'] || '', '', new Date().toISOString()]
    );

    res.json({ success: true, stock: newStock, stock_before: product.stock, type, quantity: qty });
  } catch (err) {
    console.error('[STOCK] Update error:', err);
    res.status(500).json({ error: 'Stok güncellenemedi' });
  }
});

router.get('/stock/movements', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const { product_id, type, limit } = req.query;
    let sql = `SELECT sm.*, p.name as product_name FROM stock_movements sm
               LEFT JOIN products p ON sm.product_id = p.id WHERE 1=1`;
    const params = [];
    if (product_id) { sql += ' AND sm.product_id = ?'; params.push(product_id); }
    if (type) { sql += ' AND sm.type = ?'; params.push(type); }
    sql += ' ORDER BY sm.created_at DESC';
    if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
    const movements = await db.all(sql, params);
    res.json(movements);
  } catch (err) {
    console.error('[STOCK] Movements error:', err);
    res.status(500).json({ error: 'Hareketler alınamadı' });
  }
});

module.exports = router;
