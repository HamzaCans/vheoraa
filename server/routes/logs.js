const express = require('express');
const { getDb } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function parseDeviceInfo(ua) {
  if (!ua) return 'Bilinmiyor';
  const info = [];
  if (/mobile|iphone|ipad|android/i.test(ua)) info.push('Mobil');
  else if (/tablet|ipad/i.test(ua)) info.push('Tablet');
  else info.push('Masaüstü');
  if (/chrome/i.test(ua) && !/edge|opr/i.test(ua)) info.push('Chrome');
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) info.push('Safari');
  else if (/firefox/i.test(ua)) info.push('Firefox');
  else if (/edge/i.test(ua)) info.push('Edge');
  else if (/opr/i.test(ua)) info.push('Opera');
  else info.push('Diğer');
  if (/iphone|ipad|ipod/i.test(ua)) info.push('iOS');
  else if (/android/i.test(ua)) info.push('Android');
  else if (/windows/i.test(ua)) info.push('Windows');
  else if (/macintosh|mac os/i.test(ua)) info.push('macOS');
  else if (/linux/i.test(ua)) info.push('Linux');
  return info.join(' · ');
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || '';
}

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
    res.status(500).json({ error: 'Loglar yüklenirken hata oluştu' });
  }
});

router.get('/admin/visitor-stats', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const total = await db.get("SELECT COUNT(*) as c FROM visitor_logs");
    const today = await db.get("SELECT COUNT(*) as c FROM visitor_logs WHERE date(created_at) = date('now')");
    const uniqueIps = await db.get("SELECT COUNT(DISTINCT ip_address) as c FROM visitor_logs WHERE ip_address != ''");
    const devices = await db.all("SELECT device_info, COUNT(*) as count FROM visitor_logs WHERE device_info != '' GROUP BY device_info ORDER BY count DESC LIMIT 10");
    const pages = await db.all("SELECT page_visited, COUNT(*) as count FROM visitor_logs WHERE page_visited != '' GROUP BY page_visited ORDER BY count DESC LIMIT 10");
    const browsers = await db.all(`SELECT 
      CASE 
        WHEN user_agent LIKE '%Chrome%' AND user_agent NOT LIKE '%Edge%' AND user_agent NOT LIKE '%OPR%' THEN 'Chrome'
        WHEN user_agent LIKE '%Safari%' AND user_agent NOT LIKE '%Chrome%' THEN 'Safari'
        WHEN user_agent LIKE '%Firefox%' THEN 'Firefox'
        WHEN user_agent LIKE '%Edge%' THEN 'Edge'
        WHEN user_agent LIKE '%OPR%' THEN 'Opera'
        ELSE 'Diğer'
      END as browser, COUNT(*) as count FROM visitor_logs WHERE user_agent != '' GROUP BY browser ORDER BY count DESC`);
    res.json({ total: total?.c || 0, today: today?.c || 0, unique_ips: uniqueIps?.c || 0, devices, pages, browsers });
  } catch (err) {
    res.json({ total: 0, today: 0, unique_ips: 0, devices: [], pages: [], browsers: [] });
  }
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
    res.status(500).json({ error: 'Ziyaretçi logları yüklenirken hata oluştu' });
  }
});

router.post('/visit', async (req, res) => {
  try {
    const db = await getDb();
    const ip = getClientIp(req);
    const ua = req.headers['user-agent'] || '';
    const deviceInfo = parseDeviceInfo(ua);
    const pageVisited = req.body?.page || req.headers['referer'] || '/';
    const referrer = req.body?.referrer || '';
    await db.run(
      'INSERT INTO visitor_logs (ip_address, user_agent, device_info, page_visited, referrer) VALUES (?, ?, ?, ?, ?)',
      [ip, ua, deviceInfo, pageVisited, referrer]
    );
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: true });
  }
});

module.exports = router;
