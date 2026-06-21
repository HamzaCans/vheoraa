const { getDb } = require('./db');

let cache = { data: null, lastFetch: 0 };
const CACHE_TTL = 60 * 1000;
const LOG_INTERVAL = 3 * 60 * 60 * 1000;

function smartParse(str) {
  if (!str) return null;
  str = str.trim();
  if (!str) return null;
  const parts = str.split('.');
  if (parts.length === 2 && parts[1].length === 3) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  }
  return parseFloat(str.replace(',', '.'));
}

const SOURCES = [
  {
    name: 'AKOD',
    url: 'https://anlikaltinfiyatlari.com/altin/antalya',
    parse: (html) => {
      let m = html.match(/Has\s+Altın<\/td><td>([0-9.,]+)<\/td>/i);
      if (m) { const n = smartParse(m[1]); if (n && n > 1000) return n; }
      m = html.match(/HAS:.*?<b>([0-9.,]+)<\/b>/i);
      if (m) { const n = smartParse(m[1]); if (n && n > 1000) return n; }
      m = html.match(/data-name="HHAS_satis"[^>]*>([0-9.,]+)/i);
      if (m) { const n = smartParse(m[1]); if (n && n > 1000) return n; }
      m = html.match(/data-name="Hhas_toptan_satis"[^>]*>([0-9.,]+)/i);
      if (m) { const n = smartParse(m[1]); if (n && n > 1000) return n; }
      return null;
    }
  },
  {
    name: 'canlialtinfiyatlari',
    url: 'https://canlialtinfiyatlari.com/altin/antalya',
    parse: (html) => {
      let m = html.match(/HAS:.*?<b>([0-9.,]+)<\/b>/i);
      if (m) { const n = smartParse(m[1]); if (n && n > 1000) return n; }
      m = html.match(/Has\s+Altın<\/td><td>([0-9.,]+)<\/td>/i);
      if (m) { const n = smartParse(m[1]); if (n && n > 1000) return n; }
      m = html.match(/data-name="HHAS_satis"[^>]*>([0-9.,]+)/i);
      if (m) { const n = smartParse(m[1]); if (n && n > 1000) return n; }
      return null;
    }
  }
];

async function fetchGoldPrice() {
  for (const source of SOURCES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(source.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'tr-TR,tr;q=0.9'
        }
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const html = await res.text();
      const hasAltin = source.parse(html);
      if (hasAltin && hasAltin > 0) {
        return { hasAltin, source: source.name, raw: html.substring(0, 500) };
      }
    } catch (e) {
      console.warn(`[GoldPrice] ${source.name} fetch failed:`, e.message);
    }
  }
  return null;
}

async function logGoldPrice(db, hasAltin, source, raw) {
  try {
    const last = await db.get(
      "SELECT id, created_at FROM gold_prices ORDER BY id DESC LIMIT 1"
    );
    if (last && last.created_at) {
      const lastTime = new Date(last.created_at.replace(' ', 'T') + (last.created_at.includes('Z') ? '' : 'Z')).getTime();
      const now = Date.now();
      if (now - lastTime < LOG_INTERVAL) return;
    }
    await db.run(
      'INSERT INTO gold_prices (source, has_altin, raw_data, created_at) VALUES (?, ?, ?, ?)',
      [source, hasAltin, raw || '', new Date().toISOString().replace('T', ' ').substring(0, 19)]
    );
  } catch (e) {
    console.warn('[GoldPrice] Log error:', e.message);
  }
}

async function getGoldPrice() {
  const now = Date.now();
  if (cache.data && (now - cache.lastFetch) < CACHE_TTL) {
    return cache.data;
  }

  const result = await fetchGoldPrice();
  if (result) {
    const priceData = {
      hasAltin: result.hasAltin,
      source: result.source,
      timestamp: new Date().toISOString()
    };
    cache = { data: priceData, lastFetch: now };

    try {
      const db = await getDb();
      await logGoldPrice(db, result.hasAltin, result.source, result.raw);
    } catch (e) {
      console.warn('[GoldPrice] DB log error:', e.message);
    }

    return priceData;
  }

  if (cache.data) return cache.data;

  return { hasAltin: 0, source: 'unavailable', timestamp: new Date().toISOString() };
}

async function getGoldPriceHistory(hours = 24) {
  try {
    const db = await getDb();
    const rows = await db.all(
      `SELECT id, source, has_altin, created_at FROM gold_prices
       WHERE created_at >= datetime('now', '-' || ? || ' hours')
       ORDER BY created_at DESC`,
      [hours]
    );
    return rows;
  } catch (e) {
    console.warn('[GoldPrice] History query error:', e.message);
    return [];
  }
}

module.exports = { getGoldPrice, getGoldPriceHistory };
