/* ========================================
   TCMB Döviz Kuru API + 3 Saatlik Log
   ======================================== */

const express = require('express');
const router = express.Router();
const https = require('https');
const { getDb } = require('../db');
const { authenticateToken } = require('../middleware/auth');

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 3600000;

// ========== TCMB XML ÇEK ==========
function fetchTCMBRates() {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'www.tcmb.gov.tr',
      path: '/kurlar/today.xml',
      method: 'GET',
      headers: { 'User-Agent': 'VHEORA-Backend/1.0', 'Accept': 'application/xml' },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(parseXML(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

function parseXML(xml) {
  const rates = { TRY: 1 };
  const dateMatch = xml.match(/Tarih="([^"]+)"/);
  const date = dateMatch ? dateMatch[1] : '';
  const regex = /<Currency[^>]*Kod="([^"]+)"[^>]*>([\s\S]*?)<\/Currency>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const kod = match[1];
    const block = match[2];
    const unitMatch = block.match(/<Unit>(\d+)<\/Unit>/);
    const sellingMatch = block.match(/<ForexSelling>([\d.,]+)<\/ForexSelling>/);
    if (sellingMatch && sellingMatch[1]) {
      const selling = parseFloat(sellingMatch[1].replace(',', '.'));
      const unit = unitMatch ? parseInt(unitMatch[1]) : 1;
      if (selling > 0) rates[kod] = selling / unit;
    }
  }
  return { date, rates };
}

// ========== DB'YE LOG YAZ ==========
async function logRates() {
  try {
    const data = await fetchTCMBRates();
    const r = data.rates;
    const db = await getDb();
    await db.run(
      'INSERT INTO currency_logs (tcmb_date, usd, eur, rub, sar, gbp) VALUES (?, ?, ?, ?, ?, ?)',
      [data.date, r.USD || 0, r.EUR || 0, r.RUB || 0, r.SAR || 0, r.GBP || 0]
    );
    cache = { success: true, date: data.date, fetchedAt: new Date().toISOString(), base: 'TRY', rates: r };
    cacheTime = Date.now();
  } catch (e) {
    console.error('[TCMB] Log error:', e.message);
  }
}

// İlk istekte log yaz
let _initDone = false;
router.use((req, res, next) => {
  if (!_initDone) {
    _initDone = true;
    logRates().catch(() => {});
  }
  next();
});

// ========== API: CANLI KUR ==========
router.get('/', async (req, res) => {
  try {
    // Debug mode
    if (req.query.debug === '1') {
      try {
        const db = await getDb();
        let tableOk = false;
        let tableErr = null;
        try {
          await db.get('SELECT 1 FROM currency_logs LIMIT 1');
          tableOk = true;
        } catch (e) {
          tableErr = e.message;
          try {
            await db.run('CREATE TABLE IF NOT EXISTS currency_logs (id SERIAL PRIMARY KEY, tcmb_date TEXT, usd REAL, eur REAL, rub REAL, sar REAL, gbp REAL, logged_at TEXT DEFAULT NOW())');
            tableOk = true;
            await logRates();
          } catch (e2) { tableErr = e2.message; }
        }
        const count = tableOk ? await db.get('SELECT COUNT(*) as total FROM currency_logs') : null;
        const latest = tableOk ? await db.get('SELECT * FROM currency_logs ORDER BY logged_at DESC LIMIT 1') : null;
        return res.json({ debug: true, tableOk, tableErr, totalLogs: count ? count.total : 0, latest, cache: !!cache });
      } catch (e) {
        return res.status(500).json({ debug: true, error: e.message });
      }
    }

    if (cache && (Date.now() - cacheTime) < CACHE_TTL) {
      return res.json(cache);
    }
    const data = await fetchTCMBRates();
    cache = { success: true, date: data.date, fetchedAt: new Date().toISOString(), base: 'TRY', rates: data.rates };
    cacheTime = Date.now();
    res.json(cache);
    logRates().catch(() => {});
  } catch (error) {
    if (cache) return res.json({ ...cache, stale: true });
    res.status(500).json({ success: false, error: 'TCMB kurları alınamadı' });
  }
});

// ========== API: ADMIN — LOG LİSTESİ ==========
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const logs = await db.all('SELECT * FROM currency_logs ORDER BY logged_at DESC LIMIT ?', [limit]);
    res.json({ success: true, logs: logs || [] });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message, stack: e.stack });
  }
});

// ========== API: ADMIN — GRAFİK ==========
router.get('/chart', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const logs = await db.all('SELECT * FROM currency_logs ORDER BY logged_at DESC LIMIT 50');
    res.json({ success: true, logs: logs || [] });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ========== DEBUG (public, silinecek) ==========
router.get('/debug', async (req, res) => {
  try {
    const db = await getDb();
    let tableOk = false;
    let tableErr = null;
    try {
      await db.get('SELECT 1 FROM currency_logs LIMIT 1');
      tableOk = true;
    } catch (e) {
      tableErr = e.message;
      try {
        await db.run('CREATE TABLE IF NOT EXISTS currency_logs (id SERIAL PRIMARY KEY, tcmb_date TEXT, usd REAL, eur REAL, rub REAL, sar REAL, gbp REAL, logged_at TEXT DEFAULT NOW())');
        tableOk = true;
        await logRates();
      } catch (e2) {
        tableErr = e2.message;
      }
    }
    const count = tableOk ? await db.get('SELECT COUNT(*) as total FROM currency_logs') : null;
    const latest = tableOk ? await db.get('SELECT * FROM currency_logs ORDER BY logged_at DESC LIMIT 1') : null;
    res.json({ tableOk, tableErr, totalLogs: count ? count.total : 0, latest, cache: !!cache });
  } catch (e) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
});

// ========== API: ADMIN — İSTATİSTİKLER ==========
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    // Tablo yoksa oluştur
    try {
      await db.get('SELECT 1 FROM currency_logs LIMIT 1');
    } catch (e) {
      // Tablo yok
      await db.run('CREATE TABLE IF NOT EXISTS currency_logs (id SERIAL PRIMARY KEY, tcmb_date TEXT, usd REAL, eur REAL, rub REAL, sar REAL, gbp REAL, logged_at TEXT DEFAULT NOW())');
      // İlk logu yaz
      await logRates();
    }
    const latest = await db.get('SELECT * FROM currency_logs ORDER BY logged_at DESC LIMIT 1');
    const count = await db.get('SELECT COUNT(*) as total FROM currency_logs');
    res.json({
      success: true,
      latest: latest || null,
      totalLogs: count ? count.total : 0,
      changes24h: {}
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message, stack: e.stack });
  }
});

module.exports = router;
// deploy trigger Wed Jun 24 21:19:13 UTC 2026
