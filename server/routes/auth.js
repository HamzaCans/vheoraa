const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { getDb } = require('../db');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { logAdminAction, getClientIp, parseDeviceInfo } = require('../middleware/adminLogger');

const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek. 15 dakika bekleyin.' }
});

router.post('/login', limiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
    }

    const db = await getDb();
    const admin = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!admin) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
    }
    const valid = bcrypt.compareSync(password, admin.password);
    if (!valid) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
    }
    const token = generateToken(admin.id, admin.username);
    const ua = req.headers['user-agent'] || '';
    const ip = getClientIp(req);
    const info = parseDeviceInfo(ua);
    await db.run(
      'INSERT INTO admin_logs (user_id, username, action, ip_address, user_agent, device_info, device_model) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [admin.id, admin.username, 'login', ip, ua, info.display, info.model || '']
    );
    return res.json({ token, role: 'admin', username: admin.username });
  } catch (err) {
    console.error('[Login Error]', err);
    res.status(500).json({ error: 'Giriş sırasında hata oluştu' });
  }
});

router.post('/logout', authenticateToken, async (req, res) => {
  try {
    try { await logAdminAction(req, 'logout'); } catch (_) {}
    res.json({ message: 'Başarıyla çıkış yapıldı' });
  } catch (err) {
    console.error('[Logout Error]', err);
    res.status(500).json({ error: 'Çıkış sırasında hata oluştu' });
  }
});

module.exports = router;
