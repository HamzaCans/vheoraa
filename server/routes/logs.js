const express = require('express');
const { getDb } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const IPHONE_MODELS = {
  'iPhone17,1': 'iPhone 16 Pro Max', 'iPhone17,2': 'iPhone 16 Pro', 'iPhone17,3': 'iPhone 16', 'iPhone17,4': 'iPhone 16 Plus',
  'iPhone16,1': 'iPhone 15 Pro Max', 'iPhone16,2': 'iPhone 15 Pro', 'iPhone15,4': 'iPhone 15', 'iPhone15,5': 'iPhone 15 Plus',
  'iPhone15,2': 'iPhone 14 Pro Max', 'iPhone15,3': 'iPhone 14 Pro', 'iPhone14,7': 'iPhone 14', 'iPhone14,8': 'iPhone 14 Plus',
  'iPhone14,4': 'iPhone 13 mini', 'iPhone14,5': 'iPhone 13', 'iPhone14,2': 'iPhone 13 Pro', 'iPhone14,3': 'iPhone 13 Pro Max',
  'iPhone13,1': 'iPhone 12 mini', 'iPhone13,2': 'iPhone 12', 'iPhone13,3': 'iPhone 12 Pro', 'iPhone13,4': 'iPhone 12 Pro Max',
  'iPhone12,1': 'iPhone 11', 'iPhone12,3': 'iPhone 11 Pro', 'iPhone12,5': 'iPhone 11 Pro Max',
  'iPhone11,2': 'iPhone XS', 'iPhone11,4': 'iPhone XS Max', 'iPhone11,6': 'iPhone XS Max', 'iPhone11,8': 'iPhone XR',
  'iPhone10,1': 'iPhone 8', 'iPhone10,4': 'iPhone 8', 'iPhone10,2': 'iPhone 8 Plus', 'iPhone10,5': 'iPhone 8 Plus',
  'iPhone10,3': 'iPhone X', 'iPhone10,6': 'iPhone X',
  'iPhone9,1': 'iPhone 7', 'iPhone9,3': 'iPhone 7', 'iPhone9,2': 'iPhone 7 Plus', 'iPhone9,4': 'iPhone 7 Plus',
  'iPhone8,1': 'iPhone 6s', 'iPhone8,2': 'iPhone 6s Plus', 'iPhone8,4': 'iPhone SE (1.nesil)',
  'iPhone7,1': 'iPhone 6 Plus', 'iPhone7,2': 'iPhone 6',
  'iPhone6,1': 'iPhone 5s', 'iPhone6,2': 'iPhone 5s',
  'iPhone14,6': 'iPhone SE (3.nesil)', 'iPhone12,8': 'iPhone SE (2.nesil)'
};

const IPAD_MODELS = {
  'iPad16,3': 'iPad Pro M4 11"', 'iPad16,4': 'iPad Pro M4 11"',
  'iPad16,5': 'iPad Pro M4 13"', 'iPad16,6': 'iPad Pro M4 13"',
  'iPad14,3': 'iPad Pro M2 11"', 'iPad14,4': 'iPad Pro M2 11"',
  'iPad14,5': 'iPad Pro M2 12.9"', 'iPad14,6': 'iPad Pro M2 12.9"',
  'iPad13,16': 'iPad Air M1', 'iPad13,17': 'iPad Air M1',
  'iPad14,8': 'iPad Air M2 11"', 'iPad14,9': 'iPad Air M2 11"',
  'iPad14,10': 'iPad Air M2 13"', 'iPad14,11': 'iPad Air M2 13"',
  'iPad13,18': 'iPad A16', 'iPad13,19': 'iPad A16',
  'iPad13,1': 'iPad Air 4', 'iPad13,2': 'iPad Air 4',
  'iPad12,1': 'iPad 9', 'iPad12,2': 'iPad 9',
  'iPad11,1': 'iPad mini 5', 'iPad11,2': 'iPad mini 5',
  'iPad11,3': 'iPad Air 3', 'iPad11,4': 'iPad Air 3',
  'iPad11,6': 'iPad 8', 'iPad11,7': 'iPad 8',
  'iPad8,1': 'iPad Pro 11" (1.nesil)', 'iPad8,2': 'iPad Pro 11" (1.nesil)',
  'iPad8,3': 'iPad Pro 11" (1.nesil)', 'iPad8,4': 'iPad Pro 11" (1.nesil)',
  'iPad8,5': 'iPad Pro 12.9" (1.nesil)', 'iPad8,6': 'iPad Pro 12.9" (1.nesil)',
  'iPad8,7': 'iPad Pro 12.9" (1.nesil)', 'iPad8,8': 'iPad Pro 12.9" (1.nesil)',
  'iPad14,1': 'iPad mini 6', 'iPad14,2': 'iPad mini 6'
};

const SAMSUNG_MODELS = {
  'SM-S938B': 'Galaxy S25 Ultra', 'SM-S936B': 'Galaxy S25+', 'SM-S931B': 'Galaxy S25',
  'SM-S928B': 'Galaxy S24 Ultra', 'SM-S926B': 'Galaxy S24+', 'SM-S921B': 'Galaxy S24',
  'SM-S918B': 'Galaxy S23 Ultra', 'SM-S916B': 'Galaxy S23+', 'SM-S911B': 'Galaxy S23',
  'SM-S908B': 'Galaxy S22 Ultra', 'SM-S906B': 'Galaxy S22+', 'SM-S901B': 'Galaxy S22',
  'SM-G991B': 'Galaxy S21', 'SM-G996B': 'Galaxy S21+', 'SM-G998B': 'Galaxy S21 Ultra',
  'SM-A556B': 'Galaxy A55', 'SM-A546B': 'Galaxy A54', 'SM-A536B': 'Galaxy A53',
  'SM-A356B': 'Galaxy A35', 'SM-A346B': 'Galaxy A34', 'SM-A336B': 'Galaxy A33',
  'SM-A256B': 'Galaxy A25', 'SM-A156B': 'Galaxy A15', 'SM-A056B': 'Galaxy A05',
  'SM-A505F': 'Galaxy A50', 'SM-A515F': 'Galaxy A51', 'SM-A525F': 'Galaxy A52',
  'SM-G780F': 'Galaxy S20 FE', 'SM-G781B': 'Galaxy S20 FE 5G',
  'SM-F946B': 'Galaxy Z Fold5', 'SM-F936B': 'Galaxy Z Fold4', 'SM-F926B': 'Galaxy Z Fold3',
  'SM-F731B': 'Galaxy Z Flip5', 'SM-F721B': 'Galaxy Z Flip4', 'SM-F711B': 'Galaxy Z Flip3',
  'SM-A217F': 'Galaxy A21s', 'SM-G770F': 'Galaxy S10 Lite'
};

const XIAOMI_MODELS = {
  '2401BPN24G': 'Xiaomi 14', '23111PN3BG': 'Xiaomi 13T Pro', '23076RN8DY': 'Redmi Note 12 Pro',
  '2210132G': 'Xiaomi 12T', '2201123G': 'Xiaomi 12', '2112123AG': 'Xiaomi 11T Pro',
  'M2102J20SG': 'Redmi Note 10 Pro', 'M2101K6G': 'Redmi Note 10S',
  '2207117BPG': 'POCO F4', '2207116BPG': 'POCO X4 Pro', '2302FPN6DG': 'POCO X6 Pro',
  'M2012K11AG': 'Mi 11', 'M2011K2G': 'Mi 11i'
};

const HUAWEI_MODELS = {
  'NOH-AN00': 'Mate 40 Pro', 'OCE-AN10': 'Mate 40', 'JNY-LX1': 'Nova 7',
  'VOG-AL10': 'P40 Pro', 'ANA-AN00': 'P40', 'ELS-AN00': 'Mate 40 Pro+',
  'ABR-AL60': 'Pura 70 Ultra', 'SNE-AL00': 'P60 Pro'
};

const GOOGLE_MODELS = {
  'Pixel 9 Pro XL': 'Pixel 9 Pro XL', 'Pixel 9 Pro': 'Pixel 9 Pro', 'Pixel 9': 'Pixel 9',
  'Pixel 8 Pro': 'Pixel 8 Pro', 'Pixel 8a': 'Pixel 8a', 'Pixel 8': 'Pixel 8',
  'Pixel 7 Pro': 'Pixel 7 Pro', 'Pixel 7a': 'Pixel 7a', 'Pixel 7': 'Pixel 7',
  'Pixel 6 Pro': 'Pixel 6 Pro', 'Pixel 6a': 'Pixel 6a', 'Pixel 6': 'Pixel 6',
  'Pixel Fold': 'Pixel Fold', 'Pixel Tablet': 'Pixel Tablet'
};

function resolveIPhoneModel(id) { return IPHONE_MODELS[id] || ('iPhone (' + id + ')'); }
function resolveIPadModel(id) { return IPAD_MODELS[id] || ('iPad (' + id + ')'); }
function resolveSamsungModel(code) {
  const clean = code.replace(/\//g, '-');
  for (const [k, v] of Object.entries(SAMSUNG_MODELS)) { if (clean.startsWith(k)) return v; }
  return null;
}
function resolveXiaomiModel(code) {
  for (const [k, v] of Object.entries(XIAOMI_MODELS)) { if (code.includes(k)) return v; }
  return null;
}
function resolveHuaweiModel(code) {
  for (const [k, v] of Object.entries(HUAWEI_MODELS)) { if (code.includes(k)) return v; }
  return null;
}
function resolveGoogleModel(ua) {
  for (const [k, v] of Object.entries(GOOGLE_MODELS)) { if (ua.includes(k)) return v; }
  return null;
}

function detectModel(ua) {
  if (!ua) return '';
  if (/iPad/i.test(ua)) {
    const m = ua.match(/iPad[^,;)]*?(?=,|;|\))/i);
    if (m) {
      const idMatch = m[0].match(/iPad(\d+,\d+)/);
      if (idMatch) return resolveIPadModel('iPad' + idMatch[1]);
      return m[0].trim();
    }
    return 'iPad';
  }
  if (/iPhone/i.test(ua)) {
    const m = ua.match(/iPhone(\d+,\d+)/i);
    if (m) return resolveIPhoneModel('iPhone' + m[1]);
    return 'iPhone';
  }
  if (/android/i.test(ua)) {
    const googleModel = resolveGoogleModel(ua);
    if (googleModel) return googleModel;
    const buildMatch = ua.match(/;\s*([^;)]+?)\s*Build/i);
    if (buildMatch) {
      const code = buildMatch[1].trim();
      if (/^(SM-|GT-|SCH-|SGH-|SPH-|SHV-|SC-)/.test(code)) return resolveSamsungModel(code) || code;
      if (/^\d{4,}[A-Z]/.test(code)) return resolveXiaomiModel(code) || code;
      if (/^(NOH|OCE|JNY|VOG|ANA|ELS|ABR|SNE|PCT|MRS|TAS|FLA)/.test(code)) return resolveHuaweiModel(code) || code;
      return code;
    }
    const uaModelMatch = ua.match(/Android[^;]*;\s*([^;)]+)/i);
    if (uaModelMatch) {
      const code = uaModelMatch[1].trim();
      if (/^(SM-|GT-)/.test(code)) return resolveSamsungModel(code) || code;
      return code;
    }
    return '';
  }
  return '';
}

function parseDeviceInfo(ua, clientModel) {
  if (!ua) return { device_type: 'Bilinmiyor', browser: 'Diğer', os: 'Bilinmiyor', model: '', display: 'Bilinmiyor' };
  let device_type = 'Masaüstü';
  if (/mobile|iphone|ipad|android/i.test(ua)) device_type = 'Mobil';
  else if (/tablet|ipad/i.test(ua)) device_type = 'Tablet';

  let browser = 'Diğer';
  if (/chrome/i.test(ua) && !/edge|opr/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/edge/i.test(ua)) browser = 'Edge';
  else if (/opr/i.test(ua)) browser = 'Opera';

  let os = 'Diğer';
  if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let model = clientModel || detectModel(ua);

  return { device_type, browser, os, model, display: device_type + ' · ' + browser + ' · ' + os + (model ? ' · ' + model : '') };
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
    const today = await db.get("SELECT COUNT(*) as c FROM visitor_logs WHERE created_at::date = CURRENT_DATE");
    const uniqueIps = await db.get("SELECT COUNT(DISTINCT ip_address) as c FROM visitor_logs WHERE ip_address != ''");
    const devices = await db.all("SELECT device_info, COUNT(*) as count FROM visitor_logs WHERE device_info != '' GROUP BY device_info ORDER BY count DESC LIMIT 10");
    const pages = await db.all("SELECT page_visited, COUNT(*) as count FROM visitor_logs WHERE page_visited != '' GROUP BY page_visited ORDER BY count DESC LIMIT 10");
    const browsers = await db.all("SELECT browser, COUNT(*) as count FROM visitor_logs WHERE browser != '' GROUP BY browser ORDER BY count DESC");
    const oses = await db.all("SELECT os, COUNT(*) as count FROM visitor_logs WHERE os != '' GROUP BY os ORDER BY count DESC");
    const countries = await db.all("SELECT country, COUNT(*) as count FROM visitor_logs WHERE country != '' GROUP BY country ORDER BY count DESC LIMIT 10");
    const cities = await db.all("SELECT city, COUNT(*) as count FROM visitor_logs WHERE city != '' GROUP BY city ORDER BY count DESC LIMIT 10");
    const models = await db.all("SELECT device_model, COUNT(*) as count FROM visitor_logs WHERE device_model != '' GROUP BY device_model ORDER BY count DESC LIMIT 15");
    res.json({ total: total?.c || 0, today: today?.c || 0, unique_ips: uniqueIps?.c || 0, devices, pages, browsers, os: oses, countries, cities, models });
  } catch (err) {
    res.json({ total: 0, today: 0, unique_ips: 0, devices: [], pages: [], browsers: [], countries: [], cities: [], models: [] });
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

router.delete('/admin/logs', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM admin_logs');
    res.json({ success: true, message: 'Admin logları sıfırlandı' });
  } catch (err) {
    console.error('[Logs Delete Error]', err);
    res.status(500).json({ error: 'Loglar silinirken hata oluştu' });
  }
});

router.delete('/admin/visitor-logs', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM visitor_logs');
    res.json({ success: true, message: 'Ziyaretçi kayıtları sıfırlandı' });
  } catch (err) {
    console.error('[Logs Delete Error]', err);
    res.status(500).json({ error: 'Ziyaretçi kayıtları silinirken hata oluştu' });
  }
});

router.post('/visit', async (req, res) => {
  try {
    const db = await getDb();
    const ip = getClientIp(req);
    const ua = req.headers['user-agent'] || '';
    const clientModel = req.body?.device_model || '';
    const info = parseDeviceInfo(ua, clientModel);
    const pageVisited = req.body?.page || req.headers['referer'] || '/';
    const referrer = req.body?.referrer || '';
    const timezone = req.body?.timezone || '';

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
      'INSERT INTO visitor_logs (ip_address, user_agent, device_info, browser, os, timezone, page_visited, referrer, country, city, device_model) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [ip, ua, info.display, info.browser, info.os, timezone, pageVisited, referrer, country, city, info.model || '']
    );
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: true });
  }
});

module.exports = router;
