const express = require('express');
const { getDb } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { logAdminAction } = require('../middleware/adminLogger');
const router = express.Router();

router.get('/languages', async (req, res) => {
  try {
    const db = await getDb();
    const langs = await db.all('SELECT * FROM languages WHERE is_active = 1 ORDER BY is_default DESC, name ASC');
    res.json(langs);
  } catch (err) {
    console.error('[Languages Error]', err);
    res.status(500).json({ error: 'Diller yüklenirken hata oluştu' });
  }
});

router.get('/admin/languages', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const langs = await db.all('SELECT * FROM languages ORDER BY name ASC');
    res.json(langs);
  } catch (err) {
    console.error('[Languages Error]', err);
    res.status(500).json({ error: 'Diller yüklenirken hata oluştu' });
  }
});

router.post('/admin/languages', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    let { code, name, flag, is_default, is_active } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'Dil kodu ve adı gerekli' });
    }
    code = String(code).substring(0, 10).toLowerCase();
    name = String(name).substring(0, 100);
    flag = String(flag || '').substring(0, 10);
    if (is_default) {
      await db.run('UPDATE languages SET is_default = 0');
    }
    const result = await db.run(
      'INSERT INTO languages (code, name, flag, is_default, is_active) VALUES (?, ?, ?, ?, ?)',
      [code.toLowerCase(), name, flag || '', is_default ? 1 : 0, is_active !== undefined ? (is_active ? 1 : 0) : 1]
    );
    const lang = await db.get('SELECT * FROM languages WHERE id = ?', [result.lastInsertRowid]);
    try { logAdminAction(req, `create_language: ${code} - ${name}`); } catch (_) {}
    res.json(lang);
  } catch (err) {
    console.error('[Languages Error]', err);
    if (err.message?.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Bu dil kodu zaten mevcut' });
    }
    res.status(500).json({ error: 'Dil eklenirken hata oluştu' });
  }
});

router.put('/admin/languages/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const { name, flag, is_default, is_active } = req.body;
    const existing = await db.get('SELECT * FROM languages WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Dil bulunamadı' });
    }
    if (is_default) {
      await db.run('UPDATE languages SET is_default = 0');
    }
    await db.run(
      'UPDATE languages SET name = ?, flag = ?, is_default = ?, is_active = ? WHERE id = ?',
      [
        name !== undefined ? name : existing.name,
        flag !== undefined ? flag : existing.flag,
        is_default ? 1 : 0,
        is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
        req.params.id
      ]
    );
    const lang = await db.get('SELECT * FROM languages WHERE id = ?', [req.params.id]);
    try { logAdminAction(req, `update_language: ${req.params.id} - ${lang.code}`); } catch (_) {}
    res.json(lang);
  } catch (err) {
    console.error('[Languages Error]', err);
    res.status(500).json({ error: 'Dil güncellenirken hata oluştu' });
  }
});

router.delete('/admin/languages/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const existing = await db.get('SELECT * FROM languages WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Dil bulunamadı' });
    }
    if (existing.is_default) {
      return res.status(400).json({ error: 'Varsayılan dil silinemez' });
    }
    await db.run('DELETE FROM translations WHERE lang_code = ?', [existing.code]);
    await db.run('DELETE FROM languages WHERE id = ?', [req.params.id]);
    try { logAdminAction(req, `delete_language: ${req.params.id} - ${existing.code}`); } catch (_) {}
    res.json({ message: 'Dil silindi' });
  } catch (err) {
    console.error('[Languages Error]', err);
    res.status(500).json({ error: 'Dil silinirken hata oluştu' });
  }
});

router.get('/admin/translations', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const { lang } = req.query;
    let sql = 'SELECT * FROM translations';
    const params = [];
    if (lang) {
      sql += ' WHERE lang_code = ?';
      params.push(lang);
    }
    sql += ' ORDER BY key ASC';
    const rows = await db.all(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('[Translations Error]', err);
    res.status(500).json({ error: 'Çeviriler yüklenirken hata oluştu' });
  }
});

router.post('/admin/translations', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    let { lang_code, key, value } = req.body;
    if (!lang_code || !key) {
      return res.status(400).json({ error: 'Dil kodu ve anahtar gerekli' });
    }
    lang_code = String(lang_code).substring(0, 10);
    key = String(key).substring(0, 200);
    value = String(value || '').substring(0, 5000);
    const result = await db.run(
      'INSERT INTO translations (lang_code, key, value) VALUES (?, ?, ?) ON CONFLICT(lang_code, key) DO UPDATE SET value = ?',
      [lang_code, key, value || '', value || '']
    );
    const row = await db.get('SELECT * FROM translations WHERE id = ?', [result.lastInsertRowid]);
    try { logAdminAction(req, `create_translation: ${lang_code}/${key}`); } catch (_) {}
    res.json(row);
  } catch (err) {
    console.error('[Translations Error]', err);
    res.status(500).json({ error: 'Çeviri eklenirken hata oluştu' });
  }
});

router.put('/admin/translations', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const translations = req.body;
    if (!Array.isArray(translations)) {
      return res.status(400).json({ error: 'Çeviri dizisi gerekli' });
    }
    if (translations.length > 500) {
      return res.status(400).json({ error: 'Çok fazla çeviri' });
    }
    for (const t of translations) {
      await db.run(
        'INSERT INTO translations (lang_code, key, value) VALUES (?, ?, ?) ON CONFLICT(lang_code, key) DO UPDATE SET value = ?',
        [t.lang_code, t.key, t.value || '', t.value || '']
      );
    }
    try { logAdminAction(req, `update_translations: ${translations.length} adet`); } catch (_) {}
    res.json({ message: `${translations.length} çeviri güncellendi` });
  } catch (err) {
    console.error('[Translations Error]', err);
    res.status(500).json({ error: 'Çeviriler güncellenirken hata oluştu' });
  }
});

router.delete('/admin/translations/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM translations WHERE id = ?', [req.params.id]);
    try { logAdminAction(req, `delete_translation: ${req.params.id}`); } catch (_) {}
    res.json({ message: 'Çeviri silindi' });
  } catch (err) {
    console.error('[Translations Error]', err);
    res.status(500).json({ error: 'Çeviri silinirken hata oluştu' });
  }
});

router.get('/translations/:lang', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM translations WHERE lang_code = ?', [req.params.lang]);
    const dict = {};
    for (const row of rows) {
      dict[row.key] = row.value;
    }
    res.json(dict);
  } catch (err) {
    res.json({});
  }
});

module.exports = router;
