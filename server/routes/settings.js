const express = require('express');
const { getDb } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

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
    for (const [key, value] of Object.entries(updates)) {
      await db.run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
        [key, String(value), String(value)]
      );
    }
    const rows = await db.all('SELECT * FROM settings');
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
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
    for (const row of rows) settings[row.key] = row.value;
    res.json(settings);
  } catch (err) {
    res.json({ maintenance_mode: '0' });
  }
});

module.exports = router;
