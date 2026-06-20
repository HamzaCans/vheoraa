const express = require('express');
const { getDb } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { parseDeviceInfo, getClientIp } = require('../middleware/adminLogger');

const router = express.Router();

router.get('/admin/logs', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const logs = await db.all(
      'SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    res.json(logs);
  } catch (err) {
    console.error('[Logs Error]', err);
    res.status(500).json({ error: 'Loglar yuklenirken hata olustu' });
  }
});

router.get('/admin/visitor-stats', authenticateToken, async (req, res) => {
  const db = await getDb();
  const result = { total: 0, today: 0, unique_ips: 0, devices: [], pages: [], browsers: [], os: [], countries: [], cities: [], models: [] };

  try { const r = await db.get("SELECT COUNT(*) as c FROM visitor_logs"); result.total = r?.c || 0; } catch (_) {}
  try { const r = await db.get("SELECT COUNT(*) as c FROM visitor_logs WHERE date(created_at) = date('now')"); result.today = r?.c || 0; } catch (_) {}
  try { const r = await db.get("SELECT COUNT(DISTINCT ip_address) as c FROM visitor_logs WHERE ip_address != ''"); result.unique_ips = r?.c || 0; } catch (_) {}
  try { result.devices = await db.all("SELECT device_info, COUNT(*) as count FROM visitor_logs WHERE device_info != '' GROUP BY device_info ORDER BY count DESC LIMIT 10"); } catch (_) {}
  try { result.pages = await db.all("SELECT page_visited, COUNT(*) as count FROM visitor_logs WHERE page_visited != '' GROUP BY page_visited ORDER BY count DESC LIMIT 10"); } catch (_) {}
  try { result.browsers = await db.all("SELECT browser, COUNT(*) as count FROM visitor_logs WHERE browser != '' GROUP BY browser ORDER BY count DESC"); } catch (_) {}
  try { result.os = await db.all("SELECT os, COUNT(*) as count FROM visitor_logs WHERE os != '' GROUP BY os ORDER BY count DESC"); } catch (_) {}
  try { result.countries = await db.all("SELECT country, COUNT(*) as count FROM visitor_logs WHERE country != '' GROUP BY country ORDER BY count DESC LIMIT 10"); } catch (_) {}
  try { result.cities = await db.all("SELECT city, COUNT(*) as count FROM visitor_logs WHERE city != '' GROUP BY city ORDER BY count DESC LIMIT 10"); } catch (_) {}
  try { result.models = await db.all("SELECT device_model, COUNT(*) as count FROM visitor_logs WHERE device_model != '' GROUP BY device_model ORDER BY count DESC LIMIT 15"); } catch (_) {}
  try { result.device_types = await db.all("SELECT device_type, COUNT(*) as count FROM visitor_logs WHERE device_type != '' GROUP BY device_type ORDER BY count DESC"); } catch (_) {}

  res.json(result);
});

router.get('/admin/visitor-logs', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const logs = await db.all(
      'SELECT * FROM visitor_logs ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    res.json(logs);
  } catch (err) {
    console.error('[Logs Error]', err);
    res.status(500).json({ error: 'Ziyaretci loglari yuklenirken hata olustu' });
  }
});

router.delete('/admin/logs', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM admin_logs');
    res.json({ success: true, message: 'Admin loglari sifirlandi' });
  } catch (err) {
    console.error('[Logs Delete Error]', err);
    res.status(500).json({ error: 'Loglar silinirken hata olustu' });
  }
});

router.delete('/admin/visitor-logs', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM visitor_logs');
    res.json({ success: true, message: 'Ziyaretci kayitlari sifirlandi' });
  } catch (err) {
    console.error('[Logs Delete Error]', err);
    res.status(500).json({ error: 'Ziyaretci kayitlari silinirken hata olustu' });
  }
});

router.post('/visit', async (req, res) => {
  try {
    let body = req.body;
    if (!body || typeof body === 'string') {
      try { body = JSON.parse(body || '{}'); } catch (_) { body = {}; }
    }
    const db = await getDb();
    const ip = getClientIp(req);
    const ua = req.headers['user-agent'] || '';
    const clientModel = body.device_model || '';
    const info = parseDeviceInfo(ua, clientModel);
    const pageVisited = body.page || req.headers['referer'] || '/';
    const referrer = body.referrer || '';
    const timezone = body.timezone || '';

    let country = '';
    let city = '';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const locRes = await fetch('https://ipinfo.io/' + ip + '/json', { signal: controller.signal });
      clearTimeout(timeout);
      const loc = await locRes.json();
      country = loc.country || '';
      city = loc.city || '';
    } catch (_) {}

    await db.run(
      'INSERT INTO visitor_logs (ip_address, user_agent, device_info, browser, os, timezone, page_visited, referrer, country, city, device_model, device_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [ip, ua, info.display, info.browser, info.os, timezone, pageVisited, referrer, country, city, info.model || '', info.device_type || '']
    );
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: true });
  }
});

module.exports = router;
