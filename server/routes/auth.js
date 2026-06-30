const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { getDb } = require('../db');
const { generateToken, generateRefreshToken, authenticateToken, blacklistToken } = require('../middleware/auth');
const { logAdminAction, getClientIp, parseDeviceInfo, lookupGeo } = require('../middleware/adminLogger');

const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek. 15 dakika bekleyin.' }
});

const failedAttempts = new Map();
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;

function isLockedOut(ip) {
  const record = failedAttempts.get(ip);
  if (!record) return false;
  if (Date.now() - record.lastAttempt > LOCKOUT_DURATION) {
    failedAttempts.delete(ip);
    return false;
  }
  return record.count >= LOCKOUT_THRESHOLD;
}

function recordFailedAttempt(ip) {
  const record = failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };
  record.count++;
  record.lastAttempt = Date.now();
  failedAttempts.set(ip, record);
}

function clearFailedAttempts(ip) {
  failedAttempts.delete(ip);
}

router.post('/login', limiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
    }

    const ip = getClientIp(req);
    if (isLockedOut(ip)) {
      return res.status(429).json({ error: 'Çok fazla başarısız deneme. 15 dakika sonra tekrar deneyin.' });
    }

    const db = await getDb();
    const admin = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!admin) {
      recordFailedAttempt(ip);
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
    }
    const valid = bcrypt.compareSync(password, admin.password);
    if (!valid) {
      recordFailedAttempt(ip);
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
    }

    clearFailedAttempts(ip);
    const token = generateToken(admin.id, admin.username);
    const refreshToken = generateRefreshToken(admin.id, admin.username);
    const ua = req.headers['user-agent'] || '';
    const info = parseDeviceInfo(ua);
    const referrer = req.headers['referer'] || '';
    const geo = await lookupGeo(ip);
    await db.run(
      'INSERT INTO admin_logs (user_id, username, action, ip_address, user_agent, device_info, device_model, device_type, browser, os, country, city, page_visited, referrer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [admin.id, admin.username, 'login', ip, ua, info.display, info.model || '', info.device_type || '', info.browser || '', info.os || '', geo.country, geo.city, '/login', referrer]
    );
    return res.json({ token, refreshToken, role: 'admin', username: admin.username });
  } catch (err) {
    console.error('[Login Error]', err);
    res.status(500).json({ error: 'Giriş sırasında hata oluştu' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token gerekli' });
    }

    if (tokenBlacklist.has(refreshToken)) {
      return res.status(403).json({ error: 'Token iptal edildi' });
    }

    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../middleware/auth');
    jwt.verify(refreshToken, JWT_SECRET, { issuer: 'vheora', audience: 'vheora-admin' }, (err, decoded) => {
      if (err || decoded.type !== 'refresh') {
        return res.status(403).json({ error: 'Geçersiz refresh token' });
      }
      const newToken = generateToken(decoded.id, decoded.username);
      return res.json({ token: newToken });
    });
  } catch (err) {
    console.error('[Refresh Error]', err);
    res.status(500).json({ error: 'Token yenilenirken hata oluştu' });
  }
});

router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) blacklistToken(token);
    try { await logAdminAction(req, 'logout'); } catch (err) { console.error('[LogoutLog]', err); }
    res.json({ message: 'Başarıyla çıkış yapıldı' });
  } catch (err) {
    console.error('[Logout Error]', err);
    res.status(500).json({ error: 'Çıkış sırasında hata oluştu' });
  }
});

module.exports = router;
