/* ========================================
   TCMB Döviz Kuru API + 3 Saatlik Log
   GET /api/tcmb-rates        → canlı kur
   GET /api/admin/currency-logs → log geçmişi
   ======================================== */

const express = require('express');
const router = express.Router();
const https = require('https');
const { getDb } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// ========== CACHE ==========
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 3600000; // 1 saat

// ========== TCMB XML ÇEK ==========
function fetchTCMBRates() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.tcmb.gov.tr',
      path: '/kurlar/today.xml',
      method: 'GET',
      headers: {
        'User-Agent': 'VHEORA-Backend/1.0',
        'Accept': 'application/xml, text/xml'
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(parseXML(data)); }
        catch (e) { reject(new Error('XML parse hatası')); }
      });
    });

    req.on('error', (e) => reject(e));
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

// ========== VERİTABANI TABLOSU OLUŞTUR ==========
async function ensureTable() {
  try {
    const db = await getDb();
    const isPg = !!process.env.DATABASE_URL;
    await db.run(`
      CREATE TABLE IF NOT EXISTS currency_logs (
        id ${isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        tcmb_date TEXT,
        usd REAL,
        eur REAL,
        rub REAL,
        sar REAL,
        gbp REAL,
        logged_at TIMESTAMP DEFAULT ${isPg ? 'NOW()' : "CURRENT_TIMESTAMP"}
      )
    `);
    console.log('[TCMB] currency_logs tablosu hazır');
  } catch (e) {
    console.error('[TCMB] Tablo oluşturma hatası:', e.message);
  }
}

// ========== VERİTABANINA LOG YAZ ==========
async function logRates() {
  try {
    const data = await fetchTCMBRates();
    const r = data.rates;

    const db = await getDb();
    await db.run(
      `INSERT INTO currency_logs (tcmb_date, usd, eur, rub, sar, gbp) VALUES (?, ?, ?, ?, ?, ?)`,
      [data.date, r.USD || 0, r.EUR || 0, r.RUB || 0, r.SAR || 0, r.GBP || 0]
    );

    // Cache'i de güncelle
    cache = {
      success: true,
      date: data.date,
      fetchedAt: new Date().toISOString(),
      base: 'TRY',
      rates: r
    };
    cacheTime = Date.now();

    console.log(`[TCMB] Kurlar loglandı — USD:${r.USD?.toFixed(2)} EUR:${r.EUR?.toFixed(2)} RUB:${r.RUB?.toFixed(4)} SAR:${r.SAR?.toFixed(4)}`);
  } catch (e) {
    console.error('[TCMB] Log hatası:', e.message);
  }
}

// ========== 3 SAATTE BİR ÇALIŞTIR ==========
const LOG_INTERVAL = 3 * 60 * 60 * 1000; // 3 saat

function startScheduler() {
  // Sunucu açılınca hemen bir kere logla
  logRates();
  // Sonra her 3 saatte bir tekrarla
  setInterval(logRates, LOG_INTERVAL);
  console.log('[TCMB] Zamanlayıcı başlatıldı — her 3 saatte bir loglanacak');
}

// Başlat (Vercel serverless uyumlu)
let _initialized = false;
async function init() {
  if (_initialized) return;
  _initialized = true;
  await ensureTable();
  await logRates();
  // Vercel'de setInterval çalışmaz, ama local/PM2'de çalışır
  setInterval(logRates, LOG_INTERVAL);
}
// Her istekte initialize et (cold start garantisi)
router.use(async (req, res, next) => {
  try { await init(); } catch (_) {}
  next();
});

// ========== API: CANLI KUR ==========
// GET /api/tcmb-rates
router.get('/', async (req, res) => {
  try {
    if (cache && (Date.now() - cacheTime) < CACHE_TTL) {
      return res.json(cache);
    }

    const data = await fetchTCMBRates();

    cache = {
      success: true,
      date: data.date,
      fetchedAt: new Date().toISOString(),
      base: 'TRY',
      rates: data.rates
    };
    cacheTime = Date.now();

    res.json(cache);
    // Her istekte DB'ye de logla (Vercel cron uyumlu)
    logRates().catch(() => {});
  } catch (error) {
    if (cache) return res.json({ ...cache, stale: true });
    res.status(500).json({ success: false, error: 'TCMB kurları alınamadı' });
  }
});

// ========== API: ADMIN — LOG GEÇMİŞİ ==========
// GET /api/admin/currency-logs/list?limit=50
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const db = await getDb();
    const logs = await db.all(
      `SELECT * FROM currency_logs ORDER BY logged_at DESC LIMIT ?`,
      [limit]
    );
    res.json({ success: true, logs: logs || [] });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Loglar alınamadı' });
  }
});

// ========== API: ADMIN — SON 24 SAATLIK GRAFİK VERİSİ ==========
// GET /api/admin/currency-logs/chart
router.get('/chart', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const logs = await db.all(
      process.env.DATABASE_URL
        ? `SELECT * FROM currency_logs WHERE logged_at >= NOW() - INTERVAL '24 hours' ORDER BY logged_at ASC`
        : `SELECT * FROM currency_logs WHERE logged_at >= datetime('now', '-24 hours') ORDER BY logged_at ASC`
    );
    res.json({ success: true, logs: logs || [] });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Grafik verisi alınamadı' });
  }
});

// ========== API: ADMIN — İSTATİSTİKLER ==========
// GET /api/admin/currency-logs/stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();

    const latest = await db.get(`SELECT * FROM currency_logs ORDER BY logged_at DESC LIMIT 1`);
    const count = await db.get(`SELECT COUNT(*) as total FROM currency_logs`);
    const oldest = await db.get(`SELECT logged_at FROM currency_logs ORDER BY logged_at ASC LIMIT 1`);

    // 24 saat önceki kur
    const prev24h = await db.get(
      process.env.DATABASE_URL
        ? `SELECT * FROM currency_logs WHERE logged_at <= NOW() - INTERVAL '24 hours' ORDER BY logged_at DESC LIMIT 1`
        : `SELECT * FROM currency_logs WHERE logged_at <= datetime('now', '-24 hours') ORDER BY logged_at DESC LIMIT 1`
    );

    // Değişim hesapla
    let changes = {};
    if (latest && prev24h) {
      ['usd', 'eur', 'rub', 'sar', 'gbp'].forEach(cur => {
        const now = latest[cur];
        const prev = prev24h[cur];
        if (now && prev && prev > 0) {
          const pct = ((now - prev) / prev * 100).toFixed(2);
          changes[cur] = { current: now, previous: prev, changePercent: parseFloat(pct) };
        }
      });
    }

    res.json({
      success: true,
      latest: latest || null,
      totalLogs: count ? count.total : 0,
      oldestLog: oldest ? oldest.logged_at : null,
      changes24h: changes
    });
  } catch (e) {
    res.status(500).json({ success: false, error: 'İstatistikler alınamadı' });
  }
});

module.exports = router;
