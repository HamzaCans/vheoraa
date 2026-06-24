const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || crypto.createHash('sha256').update('vheora-jwt-' + (process.env.DATABASE_URL || 'vheora')).digest('hex');
if (!process.env.JWT_SECRET) {
  console.warn('[SECURITY] JWT_SECRET env var not set. Using stable fallback from DATABASE_URL.');
}

const tokenBlacklist = new Set();

function generateToken(userId, username) {
  return jwt.sign(
    { id: userId, username: username || '', jti: crypto.randomBytes(16).toString('hex') },
    JWT_SECRET,
    { expiresIn: '2h', issuer: 'vheora', audience: 'vheora-admin' }
  );
}

function generateRefreshToken(userId, username) {
  return jwt.sign(
    { id: userId, username: username || '', type: 'refresh', jti: crypto.randomBytes(16).toString('hex') },
    JWT_SECRET,
    { expiresIn: '7d', issuer: 'vheora', audience: 'vheora-admin' }
  );
}

function blacklistToken(token) {
  tokenBlacklist.add(token);
  if (tokenBlacklist.size > 1000) {
    const first = tokenBlacklist.values().next().value;
    tokenBlacklist.delete(first);
  }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Yetkilendirme gerekli' });
  }

  if (tokenBlacklist.has(token)) {
    return res.status(403).json({ error: 'Token iptal edildi' });
  }

  jwt.verify(token, JWT_SECRET, { issuer: 'vheora', audience: 'vheora-admin' }, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Geçersiz token' });
    }
    req.userId = decoded.id;
    req.user = { id: decoded.id, username: decoded.username || 'admin' };
    next();
  });
}

module.exports = { generateToken, generateRefreshToken, authenticateToken, blacklistToken, JWT_SECRET };
