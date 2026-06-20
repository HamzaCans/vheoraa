const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { logAdminAction } = require('../middleware/adminLogger');

router.get('/orders/track', async (req, res) => {
  try {
    const db = await getDb();
    const { order_no, email } = req.query;
    if (!order_no || !email) {
      return res.status(400).json({ error: 'Sipariş numarası ve e-posta gerekli' });
    }
    const order = await db.get('SELECT * FROM orders WHERE order_no = ? AND customer_email = ?', [order_no, email]);
    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }
    const items = await db.all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    res.json({
      order_no: order.order_no, customer_name: order.customer_name,
      status: order.status, carrier: order.carrier,
      tracking_no: order.tracking_no, total_amount: order.total_amount,
      created_at: order.created_at, updated_at: order.updated_at,
      items: items.map(i => ({ product_name: i.product_name, quantity: i.quantity, unit_price: i.unit_price }))
    });
  } catch (err) {
    console.error('[ORDER TRACK]', err);
    res.status(500).json({ error: 'Sipariş sorgulanamadı' });
  }
});

router.use(authenticateToken);

function generateOrderNo() {
  const prefix = 'VHO';
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

router.get('/orders/stats', async (req, res) => {
  try {
    const db = await getDb();
    const stats = await db.all(
      `SELECT status, COUNT(*) as count FROM orders GROUP BY status`
    );
    const total = stats.reduce((sum, s) => sum + s.count, 0);
    const result = { total, pending: 0, confirmed: 0, preparing: 0, shipped: 0, delivered: 0, cancelled: 0 };
    for (const s of stats) result[s.status] = s.count;
    res.json(result);
  } catch (err) {
    console.error('[ORDERS] Stats error:', err);
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const db = await getDb();
    const { status, search, start_date, end_date } = req.query;
    let sql = `SELECT * FROM orders WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (search) { sql += ' AND (order_no LIKE ? OR customer_name LIKE ? OR customer_email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (start_date) { sql += ' AND created_at >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND created_at <= ?'; params.push(end_date); }
    sql += ' ORDER BY created_at DESC';
    const orders = await db.all(sql, params);
    res.json(orders);
  } catch (err) {
    console.error('[ORDERS] List error:', err);
    res.status(500).json({ error: 'Siparişler alınamadı' });
  }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const db = await getDb();
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Sipariş bulunamadı' });
    const items = await db.all('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
    res.json({ ...order, items });
  } catch (err) {
    console.error('[ORDERS] Get error:', err);
    res.status(500).json({ error: 'Sipariş alınamadı' });
  }
});

router.post('/orders', async (req, res) => {
  try {
    let { customer_name, customer_email, customer_phone, shipping_address, city, district, notes, items, carrier, tracking_no } = req.body;
    if (!customer_name) return res.status(400).json({ error: 'Müşteri adı gerekli' });
    if (!items || !items.length) return res.status(400).json({ error: 'En az bir ürün gerekli' });

    customer_name = String(customer_name).substring(0, 200);
    customer_email = String(customer_email || '').substring(0, 254);
    customer_phone = String(customer_phone || '').substring(0, 20);
    shipping_address = String(shipping_address || '').substring(0, 500);
    city = String(city || '').substring(0, 100);
    district = String(district || '').substring(0, 100);
    notes = String(notes || '').substring(0, 1000);
    carrier = String(carrier || '').substring(0, 100);
    tracking_no = String(tracking_no || '').substring(0, 100);

    if (items.length > 50) return res.status(400).json({ error: 'Çok fazla ürün' });

    const db = await getDb();
    const orderNo = generateOrderNo();
    const totalAmount = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

    const result = await db.run(
      `INSERT INTO orders (order_no, customer_name, customer_email, customer_phone, shipping_address, city, district, notes, status, carrier, tracking_no, total_amount, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
      [orderNo, customer_name, customer_email || '', customer_phone || '', shipping_address || '', city || '', district || '', notes || '', carrier || '', tracking_no || '', totalAmount, new Date().toISOString(), new Date().toISOString()]
    );

    const orderId = result.lastInsertRowid;
    for (const item of items) {
      await db.run(
        'INSERT INTO order_items (order_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [orderId, item.product_name, item.quantity, item.unit_price]
      );
    }

    try { logAdminAction(req, `create_order: ${orderNo}`); } catch (_) {}

    res.json({ success: true, id: orderId, order_no: orderNo });
  } catch (err) {
    console.error('[ORDERS] Create error:', err);
    res.status(500).json({ error: 'Sipariş oluşturulamadı' });
  }
});

router.put('/orders/:id', async (req, res) => {
  try {
    let { customer_name, customer_email, customer_phone, shipping_address, city, district, notes, status, carrier, tracking_no, items } = req.body;
    const db = await getDb();

    const existing = await db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Sipariş bulunamadı' });

    const allowedStatuses = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Geçersiz sipariş durumu' });
    }

    if (customer_name !== undefined) customer_name = String(customer_name).substring(0, 200);
    if (customer_email !== undefined) customer_email = String(customer_email).substring(0, 254);
    if (customer_phone !== undefined) customer_phone = String(customer_phone).substring(0, 20);
    if (shipping_address !== undefined) shipping_address = String(shipping_address).substring(0, 500);
    if (city !== undefined) city = String(city).substring(0, 100);
    if (district !== undefined) district = String(district).substring(0, 100);
    if (notes !== undefined) notes = String(notes).substring(0, 1000);
    if (carrier !== undefined) carrier = String(carrier).substring(0, 100);
    if (tracking_no !== undefined) tracking_no = String(tracking_no).substring(0, 100);

    await db.run(
      `UPDATE orders SET
        customer_name = ?, customer_email = ?, customer_phone = ?,
        shipping_address = ?, city = ?, district = ?, notes = ?,
        status = ?, carrier = ?, tracking_no = ?,
        updated_at = ?
       WHERE id = ?`,
      [
        customer_name || existing.customer_name,
        customer_email ?? existing.customer_email,
        customer_phone ?? existing.customer_phone,
        shipping_address ?? existing.shipping_address,
        city ?? existing.city,
        district ?? existing.district,
        notes ?? existing.notes,
        status || existing.status,
        carrier ?? existing.carrier,
        tracking_no ?? existing.tracking_no,
        new Date().toISOString(),
        req.params.id
      ]
    );

    if (items && items.length) {
      await db.run('DELETE FROM order_items WHERE order_id = ?', [req.params.id]);
      for (const item of items) {
        await db.run(
          'INSERT INTO order_items (order_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?)',
          [req.params.id, item.product_name, item.quantity, item.unit_price]
        );
      }
    }

    if (status && status !== existing.status) {
      try { logAdminAction(req, `update_order_status: ${existing.order_no} → ${status}`); } catch (_) {}
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[ORDERS] Update error:', err);
    res.status(500).json({ error: 'Sipariş güncellenemedi' });
  }
});

router.delete('/orders/:id', async (req, res) => {
  try {
    const db = await getDb();
    const existing = await db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Sipariş bulunamadı' });

    await db.run('DELETE FROM order_items WHERE order_id = ?', [req.params.id]);
    await db.run('DELETE FROM orders WHERE id = ?', [req.params.id]);

    try { logAdminAction(req, `delete_order: ${existing.order_no}`); } catch (_) {}

    res.json({ success: true });
  } catch (err) {
    console.error('[ORDERS] Delete error:', err);
    res.status(500).json({ error: 'Sipariş silinemedi' });
  }
});

module.exports = router;
