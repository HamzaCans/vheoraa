require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { getDb } = require('./db');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const messageRoutes = require('./routes/messages');
const logRoutes = require('./routes/logs');
const settingsRoutes = require('./routes/settings');
const localizationRoutes = require('./routes/localization');
const stockRoutes = require('./routes/stock');
const orderRoutes = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 3001;

app.disable('x-powered-by');

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
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net', 'https://www.googletagmanager.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    }
  }
}));

app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000', 'https://vheora.co', 'http://localhost:5173', 'http://localhost:5500', 'http://localhost:5501', 'http://localhost:5502', 'http://127.0.0.1:5500', 'http://127.0.0.1:5501', 'http://127.0.0.1:5502', 'null'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Güvenlik limiti geri yüklendi
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek gönderdiniz. Lütfen 15 dakika bekleyin.' }
});

app.use('/api/', apiLimiter);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

function sanitize(obj) {
  if (typeof obj === 'string') {
    return obj.replace(/<[^>]*>/g, '').trim();
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

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api', messageRoutes);
app.use('/api', logRoutes);
app.use('/api', settingsRoutes);
app.use('/api', localizationRoutes);
app.use('/api/admin', stockRoutes);
app.use('/api/admin', orderRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const { JWT_SECRET } = require('./middleware/auth');

const maintenanceCheck = async (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/admin/') || req.path === '/admin') {
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
    const db = await getDb();
    const row = await db.get("SELECT value FROM settings WHERE key = 'maintenance_mode'");
    if (row && row.value === '1' && !req.path.startsWith('/maintenance')) {
      return res.status(503).sendFile(path.join(__dirname, '..', 'maintenance.html'));
    }
  } catch (e) {
    // If DB error, proceed normally
  }
  next();
};

app.use(maintenanceCheck);

const cacheTime = 7 * 24 * 60 * 60;
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  maxAge: cacheTime * 1000,
  immutable: true
}));
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

app.get('*.html', (req, res, next) => {
  const filePath = path.join(__dirname, '..', req.path);
  if (!require('fs').existsSync(filePath)) {
    res.status(404).sendFile(path.join(__dirname, '..', '404.html'));
  } else {
    next();
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
