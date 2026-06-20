const express = require('express');
const { getDb } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { logAdminAction } = require('../middleware/adminLogger');
const router = express.Router();

function safeLog(req, action) { try { logAdminAction(req, action); } catch (_) {} }

router.get('/admin/settings', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM settings');
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (err) {
    console.error('[Settings Error]', err);
    res.status(500).json({ error: 'Ayarlar yüklenirken hata oluştu' });
  }
});

router.put('/admin/settings', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const updates = req.body;
    const keys = Object.keys(updates);
    const allowedKeys = [
      'maintenance_mode', 'maintenance_title', 'maintenance_message', 'timezone',
      'site_hero_title', 'site_hero_desc', 'site_badge_text',
      'site_about_text_1', 'site_about_text_2',
      'site_stat_country', 'site_stat_customer', 'site_stat_collection',
      'site_contact_address', 'site_contact_email', 'site_contact_phone', 'site_contact_hours'
    ];
    for (const [key, value] of Object.entries(updates)) {
      if (!allowedKeys.includes(key)) continue;
      const val = String(value).substring(0, 5000);
      await db.run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
        [key, val, val]
      );
    }
    const rows = await db.all('SELECT * FROM settings');
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    safeLog(req, `update_settings: ${keys.join(', ')}`);
    res.json({ message: 'Ayarlar güncellendi', settings });
  } catch (err) {
    console.error('[Settings Error]', err);
    res.status(500).json({ error: 'Ayarlar güncellenirken hata oluştu' });
  }
});

router.get('/settings/public', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM settings');
    const settings = {};
    for (const row of rows) {
      if (row.key !== 'maintenance_bypass_token') {
        settings[row.key] = row.value;
      }
    }
    res.json(settings);
  } catch (err) {
    res.json({ maintenance_mode: '0' });
  }
});

router.post('/settings/bypass-token', authenticateToken, async (req, res) => {
  try {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const db = await getDb();
    await db.run(
      "INSERT INTO settings (key, value) VALUES ('maintenance_bypass_token', ?) ON CONFLICT(key) DO UPDATE SET value = ?",
      [token, token]
    );
    safeLog(req, 'generated_bypass_token');
    res.setHeader('Set-Cookie', 'vheora_bypass=' + token + ';path=/;max-age=604800;SameSite=None;Secure');
    res.json({ token });
  } catch (err) {
    console.error('[Bypass Token Error]', err);
    res.status(500).json({ error: 'Token oluşturulamadı' });
  }
});

router.delete('/settings/bypass-token', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    await db.run("DELETE FROM settings WHERE key = 'maintenance_bypass_token'");
    safeLog(req, 'cleared_bypass_token');
    res.setHeader('Set-Cookie', 'vheora_bypass=;path=/;max-age=0;SameSite=None;Secure');
    res.json({ message: 'Bypass token silindi' });
  } catch (err) {
    res.status(500).json({ error: 'Token silinemedi' });
  }
});

module.exports = router;
