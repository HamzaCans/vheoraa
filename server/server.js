require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const { getDb } = require('./db');
const { logAdminAction, getClientIp, parseDeviceInfo } = require('./middleware/adminLogger');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const messageRoutes = require('./routes/messages');
const logRoutes = require('./routes/logs');
const settingsRoutes = require('./routes/settings');
const localizationRoutes = require('./routes/localization');
const stockRoutes = require('./routes/stock');
const orderRoutes = require('./routes/orders');
const goldPriceRoutes = require('./routes/goldPrice');
const tcmbRoutes = require('./routes/tcmb');

const sitemapRoutes = require('./routes/sitemap');

const app = express();
const PORT = process.env.PORT || 3001;

const csrfSecret = process.env.CSRF_SECRET || crypto.createHash('sha256').update('vheora-csrf-' + (process.env.DATABASE_URL || 'vheora')).digest('hex').substring(0, 32);
function csrfInit(req, res, next) {
  if (!req.cookies?.csrf_token) {
    const token = crypto.randomBytes(32).toString('hex');
    res.setHeader('Set-Cookie', `csrf_token=${token};Path=/;SameSite=Strict;HttpOnly=false;Secure`);
  }
  next();
}

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(compression());

if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
      styleSrcAttr: ["'unsafe-inline'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net', 'https://www.googletagmanager.com'],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://vheora.com', 'https://vheora.co', 'https://*.vercel.app'],
      connectSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://www.google-analytics.com'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
}));

app.use(cors({
  origin: function(origin, callback) {
    const allowed = ['https://vheora.com', 'https://www.vheora.com', 'https://vheora.co'];
    if (!origin || allowed.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  maxAge: 86400
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek gönderdiniz. Lütfen 15 dakika bekleyin.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla deneme yapıldı. Lütfen 15 dakika bekleyin.' }
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek. Biraz bekleyin.' }
});

const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla form gönderildi. 1 saat sonra tekrar deneyin.' }
});

const visitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit aşıldı.' }
});

app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/admin', strictLimiter);
app.use('/api/contact', formLimiter);
app.use('/api/quote', formLimiter);
app.use('/api/testimonial', formLimiter);
app.use('/api/visit', visitLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

function sanitize(obj) {
  if (typeof obj === 'string') {
    return obj
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:text\/html/gi, '')
      .trim();
  }
  if (obj && typeof obj === 'object') {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        obj[key] = sanitize(obj[key]);
      }
    }
  }
  return obj;
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  return /^\+?[\d\s\-()]{7,20}$/.test(phone);
}

function maxLength(str, max) {
  if (!str || typeof str !== 'string') return str;
  return str.substring(0, max);
}

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  next();
});

app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object' && !req._sanitized) {
    sanitize(req.body);
    req._sanitized = true;
  }
  if (req.query && typeof req.query === 'object') {
    sanitize(req.query);
  }
  next();
});

app.use(csrfInit);

const { JWT_SECRET } = require('./middleware/auth');

const MAINTENANCE_BYPASS_IPS = (process.env.MAINTENANCE_BYPASS_IPS || '94.55.220.91,37.155.31.118,5.176.10.207').split(',').map(function(s){return s.trim()}).filter(Boolean);

const maintenanceCheck = async (req, res, next) => {
  const url = req.originalUrl || req.url || '';

  if (url.startsWith('/admin') || url === '/admin') {
    return next();
  }

  if (MAINTENANCE_BYPASS_IPS.length > 0) {
    const clientIp = getClientIp(req);
    if (MAINTENANCE_BYPASS_IPS.indexOf(clientIp) !== -1) {
      return next();
    }
  }

  const alwaysAllowed = (
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/logout') ||
    url.includes('/api/settings/public') ||
    url.includes('/api/settings/bypass-token') ||
    url.includes('/api/health') ||
    url.includes('/api/visit') ||
    url.includes('/api/translations/') ||
    url.includes('/api/languages') ||
    url.includes('/api/tcmb-rates') ||
    url.includes('/api/admin') ||
    url.includes('/api/sitemap') ||
    url === '/sw.js' || url === '/manifest.json' ||
    url === '/favicon.png' ||
    url.match(/\.(css|js|webp|png|jpg|jpeg|svg|ico|woff2|woff|ttf|otf|eot)($|\?)/) && !url.includes('/api/')
  );

  if (alwaysAllowed) {
    return next();
  }

  try {
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const jwt = require('jsonwebtoken');
          jwt.verify(token, JWT_SECRET);
          return next();
        } catch (_) {}
      }
    }

    const cookies = (req.headers.cookie || '').split(';').reduce((acc, c) => {
      const [k, v] = c.trim().split('=');
      if (k) acc[k] = v;
      return acc;
    }, {});

    const db = await getDb();
    const bypassRow = await db.get("SELECT value FROM settings WHERE key = 'maintenance_bypass_token'");

    if (bypassRow && bypassRow.value) {
      if (cookies['vheora_bypass'] && cookies['vheora_bypass'] === bypassRow.value) {
        return next();
      }
      var rawUrl = req.originalUrl || req.url || '';
      var qIdx = rawUrl.indexOf('?');
      var urlToken = '';
      if (qIdx !== -1) {
        var params = rawUrl.substring(qIdx + 1).split('&');
        for (var p = 0; p < params.length; p++) {
          var kv = params[p].split('=');
          if (kv[0] === 'token') { urlToken = decodeURIComponent(kv[1] || ''); break; }
        }
      }
      if (!urlToken && req.query && req.query.token) urlToken = req.query.token;
      if (urlToken && urlToken === bypassRow.value) {
        res.setHeader('Set-Cookie', `vheora_bypass=${bypassRow.value};Path=/;Max-Age=86400;SameSite=Lax;Secure`);
        return res.redirect(302, '/');
      }
    }

    const row = await db.get("SELECT value FROM settings WHERE key = 'maintenance_mode'");
    if (row && row.value === '1') {
      if (url.includes('/api/')) {
        return res.status(503).json({ error: 'Site bakım modundadır. Lütfen daha sonra tekrar deneyin.', maintenance: true });
      }
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      return res.status(503).sendFile(path.join(__dirname, '..', 'maintenance.html'));
    }
  } catch (e) {
    // DB error — proceed normally
  }
  next();
};

app.use(maintenanceCheck);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api', messageRoutes);
app.use('/api', logRoutes);
app.use('/api', settingsRoutes);
app.use('/api', localizationRoutes);
app.use('/api/admin', stockRoutes);
app.use('/api/admin', orderRoutes);
app.use('/api', goldPriceRoutes);
app.use('/api/tcmb-rates', tcmbRoutes);
app.use('/api/admin/currency-logs', tcmbRoutes);
app.use('/api/sitemap', sitemapRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const _root = path.join(__dirname, '..');
const _staticPaths = {
  '/style.css': _root + '/style.css',
  '/script.js': _root + '/script.js',
  '/app.js': _root + '/app.js',
  '/vheora_currency.js': _root + '/vheora_currency.js',
  '/cookie-consent.js': _root + '/cookie-consent.js',
  '/maintenance.js': _root + '/maintenance.js',
  '/favicon.png': _root + '/favicon.png',
  '/robots.txt': _root + '/robots.txt',
  '/collection.html': _root + '/collection.html',
  '/gia-certified.html': _root + '/gia-certified.html',
  '/restoration.html': _root + '/restoration.html',
  '/logistics.html': _root + '/logistics.html',
  '/custom-design.html': _root + '/custom-design.html',
  '/legal.html': _root + '/legal.html'
};

Object.keys(_staticPaths).forEach(function(route) {
  app.get(route, function(req, res) {
    res.sendFile(_staticPaths[route]);
  });
});

app.get('/sitemap.xml', sitemapRoutes);

app.use('/images', express.static(path.join(__dirname, '..', 'images')));

const cacheTime = 7 * 24 * 60 * 60;
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  maxAge: cacheTime * 1000,
  immutable: true
}));
app.use('/admin', async (req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html')) {
    try {
      const db = await getDb();
      const ua = req.headers['user-agent'] || '';
      const ip = getClientIp(req);
      const info = parseDeviceInfo(ua);
      const page = req.path === '/' ? '/admin/' : `/admin${req.path}`;
      await db.run(
        'INSERT INTO admin_logs (user_id, username, action, ip_address, user_agent, device_info, device_model, device_type, browser, os) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [0, 'anonymous', `page_visit: ${page}`, ip, ua, info.display, info.model || '', info.device_type || '', info.browser || '', info.os || '']
      );
    } catch (_) {}
  }
  next();
});
app.use('/admin', express.static(path.join(__dirname, '..', 'admin'), {
  maxAge: 0,
  etag: true
}));
app.use('/', express.static(path.join(__dirname, '..'), {
  maxAge: cacheTime * 1000,
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

app.get('/admin', (req, res) => {
  res.redirect('/admin/');
});

app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'manifest.json'));
});

app.get('/sw.js', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'sw.js'));
});

app.get('/logistics-service.jpg', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'logistics-service.jpg'));
});

app.get('/restoration-service.jpg', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'restoration-service.jpg'));
});

app.get('/workshop.jpg', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'workshop.jpg'));
});

app.get('/gia-report.jpg', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'gia-report.jpg'));
});

app.get('*.html', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  const filePath = path.join(__dirname, '..', req.path);
  if (!require('fs').existsSync(filePath)) {
    res.status(404).sendFile(path.join(__dirname, '..', '404.html'));
  } else {
    next();
  }
});

app.use((req, res) => {
  const filePath = path.join(__dirname, '..', req.path);
  if (req.path.endsWith('.html')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    if (!require('fs').existsSync(filePath)) {
      res.status(404).sendFile(path.join(__dirname, '..', '404.html'));
    } else {
      res.sendFile(filePath);
    }
  } else if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint bulunamadı' });
  } else {
    res.status(404).sendFile(path.join(__dirname, '..', '404.html'));
  }
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Geçersiz JSON verisi' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Çok büyük veri gönderildi' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Dosya boyutu 5MB\'dan büyük olamaz' });
  }
  if (err.message && err.message.includes('Sadece')) {
    return res.status(400).json({ error: err.message });
  }
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({ error: 'Bir hata oluştu' });
});

module.exports = app;

async function start() {
  await getDb();
  if (!process.env.VERCEL) {
    app.listen(PORT, () => {
      console.log(`[VHEORA] Server running on http://localhost:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  start();
}
