/* ========================================
   TCMB Döviz Kuru API
   ======================================== */

const express = require('express');
const router = express.Router();
const https = require('https');
const { authenticateToken } = require('../middleware/auth');

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 3600000;

let rateHistory = [];
const MAX_HISTORY = 100;

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

function updateCache(data) {
  cache = { success: true, date: data.date, fetchedAt: new Date().toISOString(), base: 'TRY', rates: data.rates };
  cacheTime = Date.now();
  rateHistory.push({
    logged_at: new Date().toISOString(),
    tcmb_date: data.date,
    usd: data.rates.USD || 0,
    eur: data.rates.EUR || 0,
    gbp: data.rates.GBP || 0,
    rub: data.rates.RUB || 0,
    sar: data.rates.SAR || 0
  });
  if (rateHistory.length > MAX_HISTORY) rateHistory.shift();
}

// İlk yükleme
fetchTCMBRates().then(updateCache).catch(() => {});
setInterval(() => { fetchTCMBRates().then(updateCache).catch(() => {}); }, 3 * 60 * 60 * 1000);

// Public: canlı kur
router.get('/', async (req, res) => {
  try {
    if (cache && (Date.now() - cacheTime) < CACHE_TTL) return res.json(cache);
    const data = await fetchTCMBRates();
    updateCache(data);
    res.json(cache);
  } catch (error) {
    if (cache) return res.json({ ...cache, stale: true });
    res.status(500).json({ success: false, error: 'TCMB kurları alınamadı' });
  }
});

// Admin: log listesi
router.get('/list', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  res.json({ success: true, logs: rateHistory.slice(-limit).reverse() });
});

// Admin: grafik
router.get('/chart', (req, res) => {
  res.json({ success: true, logs: rateHistory.slice(-50) });
});

// Admin: istatistikler
router.get('/stats', (req, res) => {
  const latest = rateHistory.length > 0 ? rateHistory[rateHistory.length - 1] : null;
  res.json({ success: true, latest, totalLogs: rateHistory.length, changes24h: {} });
});

module.exports = router;
