const { getDb } = require('../db');

const STATIC_PAGES = [
  { url: '/', changefreq: 'daily', priority: '1.0' },
  { url: '/collection.html', changefreq: 'daily', priority: '0.9' },
  { url: '/custom-design.html', changefreq: 'weekly', priority: '0.8' },
  { url: '/gia-certified.html', changefreq: 'weekly', priority: '0.8' },
  { url: '/restoration.html', changefreq: 'weekly', priority: '0.8' },
  { url: '/logistics.html', changefreq: 'weekly', priority: '0.8' },
];

function generateSitemapUrl(url, lastmod, changefreq, priority) {
  return `  <url>
    <loc>https://vheora.com${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

async function getProducts() {
  try {
    const db = await getDb();
    const isPg = !!process.env.DATABASE_URL;
    const products = await db.all(
      isPg
        ? `SELECT id, name, updated_at, is_featured FROM products WHERE is_featured = true OR 1=1 ORDER BY sort_order ASC, created_at DESC`
        : `SELECT id, name, updated_at, is_featured FROM products WHERE is_featured = 1 OR 1=1 ORDER BY sort_order ASC, created_at DESC`
    );
    return products || [];
  } catch (e) {
    console.error('Sitemap products error:', e);
    return [];
  }
}

function generateSitemapXml(products) {
  const today = new Date().toISOString().split('T')[0];
  const urls = [];

  // Static pages
  STATIC_PAGES.forEach(page => {
    urls.push(generateSitemapUrl(page.url, today, page.changefreq, page.priority));
  });

  // Product pages
  products.forEach(p => {
    const lastmod = p.updated_at ? p.updated_at.split('T')[0] : today;
    const url = `/collection.html#product-${p.id}`;
    urls.push(generateSitemapUrl(url, lastmod, 'weekly', p.is_featured ? '0.8' : '0.6'));
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

module.exports = async (req, res) => {
  try {
    const products = await getProducts();
    const xml = generateSitemapXml(products);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.send(xml);
  } catch (e) {
    console.error('Sitemap generation error:', e);
    res.status(500).send('Sitemap generation failed');
  }
};