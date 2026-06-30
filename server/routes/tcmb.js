/* ========================================
   TCMB Döviz Kuru API
   ======================================== */

const express = require('express');
const router = express.Router();
const https = require('https');
const { authenticateToken } = require('../middleware/auth');
const { getDb } = require('../db');

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 3600000;

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
  const rates = {};
  const dateMatch = xml.match(/Tarih="([^"]+)"/);
  const date = dateMatch ? dateMatch[1] : '';
  const regex = /<Currency[^>]*Kod="([^"]+)"[^>]*>([\s\S]*?)<\/Currency>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const kod = match[1];
    const block = match[2];
    const unitMatch = block.match(/<Unit>(\d+)<\/Unit>/);
    const unit = unitMatch ? parseInt(unitMatch[1]) : 1;
    const forexBuyingMatch = block.match(/<ForexBuying>([\d.,]+)<\/ForexBuying>/);
    const forexSellingMatch = block.match(/<ForexSelling>([\d.,]+)<\/ForexSelling>/);
    const banknoteBuyingMatch = block.match(/<BanknoteBuying>([\d.,]+)<\/BanknoteBuying>/);
    const banknoteSellingMatch = block.match(/<BanknoteSelling>([\d.,]+)<\/BanknoteSelling>/);
    const nameMatch = block.match(/<Isim>([^<]+)<\/Isim>/);
    const name = nameMatch ? nameMatch[1] : kod;
    if (forexSellingMatch || forexBuyingMatch) {
      rates[kod] = {
        unit,
        name,
        forex_buying: forexBuyingMatch ? parseFloat(forexBuyingMatch[1].replace(',', '.')) / unit : 0,
        forex_selling: forexSellingMatch ? parseFloat(forexSellingMatch[1].replace(',', '.')) / unit : 0,
        banknote_buying: banknoteBuyingMatch ? parseFloat(banknoteBuyingMatch[1].replace(',', '.')) / unit : 0,
        banknote_selling: banknoteSellingMatch ? parseFloat(banknoteSellingMatch[1].replace(',', '.')) / unit : 0
      };
    }
  }
  return { date, rates };
}

async function logCurrencyToDb(data) {
  try {
    const db = await getDb();
    const now = new Date().toISOString().substring(0, 19) + 'Z';
    const codes = ['USD', 'EUR', 'GBP', 'CHF', 'RUB', 'SAR'];
    for (const code of codes) {
      const rate = data.rates[code];
      if (rate && rate.forex_selling > 0) {
        await db.run(
          'INSERT INTO currency_rates (code, name, forex_buying, forex_selling, banknote_buying, banknote_selling, unit, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [code, rate.name || code, rate.forex_buying, rate.forex_selling, rate.banknote_buying, rate.banknote_selling, rate.unit || 1, 'TCMB', now]
        );
      }
    }
    console.log('[TCMB]', codes.length, 'currency rates logged at', now);
  } catch (e) {
    console.error('[TCMB] DB log error:', e.message);
  }
}

function updateCache(data) {
  const flat = {};
  for (const code of Object.keys(data.rates)) {
    const r = data.rates[code];
    flat[code] = r.forex_selling;
  }
  cache = { success: true, date: data.date, fetchedAt: new Date().toISOString(), base: 'TRY', rates: flat };
  cacheTime = Date.now();
  logCurrencyToDb(data);
}

// İlk yükleme (DB hazır olması için 2sn gecikmeli)
setTimeout(() => {
  fetchTCMBRates().then(updateCache).catch(err => console.error('[TCMB] Initial fetch error:', err.message));
}, 2000);
setInterval(() => {
  fetchTCMBRates().then(updateCache).catch(err => console.error('[TCMB] Cron fetch error:', err.message));
}, 3 * 60 * 60 * 1000);

// Public: canlı kur
router.get('/', async (req, res) => {
  try {
    if (cache && (Date.now() - cacheTime) < CACHE_TTL) return res.json(cache);
    const data = await fetchTCMBRates();
    updateCache(data);
    res.json(cache);
  } catch (error) {
    if (cache) return res.json({ ...cache, stale: true });
    res.json({ success: true, date: new Date().toISOString(), rates: {}, stale: true, error: 'TCMB kurları alınamadı' });
  }
});

// Admin: log listesi (DB'den)
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const isPg = !!process.env.DATABASE_URL;
    const rows = await db.all(
      isPg
        ? `SELECT id, code, forex_buying as usd_val, created_at as logged_at FROM currency_rates WHERE code = 'USD' ORDER BY id DESC LIMIT $1`
        : `SELECT id, code, forex_buying as usd_val, created_at as logged_at FROM currency_rates WHERE code = 'USD' ORDER BY id DESC LIMIT ?`,
      [limit]
    );
    res.json({ success: true, logs: rows || [] });
  } catch (e) {
    console.warn('[TCMB] /list error:', e.message);
    res.json({ success: true, logs: [] });
  }
});

// Admin: grafik (DB'den)
router.get('/chart', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const isPg = !!process.env.DATABASE_URL;
    const rows = await db.all(
      isPg
        ? `SELECT code, forex_buying, created_at FROM currency_rates WHERE code = 'USD' ORDER BY id DESC LIMIT 50`
        : `SELECT code, forex_buying, created_at FROM currency_rates WHERE code = 'USD' ORDER BY id DESC LIMIT 50`
    );
    res.json({ success: true, logs: (rows || []).reverse() });
  } catch (e) {
    console.warn('[TCMB] /chart error:', e.message);
    res.json({ success: true, logs: [] });
  }
});

// Admin: istatistikler
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const isPg = !!process.env.DATABASE_URL;
    const latest = await db.get(
      isPg
        ? `SELECT * FROM currency_rates ORDER BY id DESC LIMIT 1`
        : `SELECT * FROM currency_rates ORDER BY id DESC LIMIT 1`
    );
    const count = await db.get(
      isPg
        ? `SELECT COUNT(*) as cnt FROM currency_rates`
        : `SELECT COUNT(*) as cnt FROM currency_rates`
    );
    res.json({ success: true, latest: latest || null, totalLogs: count ? count.cnt : 0, changes24h: {} });
  } catch (e) {
    console.warn('[TCMB] /stats error:', e.message);
    res.json({ success: true, latest: null, totalLogs: 0, changes24h: {} });
  }
});

module.exports = router;
