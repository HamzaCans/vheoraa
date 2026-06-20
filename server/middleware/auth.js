const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'vheora-jwt-secret-2026';

function generateToken(userId, username) {
  return jwt.sign({ id: userId, username: username || '' }, JWT_SECRET, { expiresIn: '24h' });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Yetkilendirme gerekli' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Geçersiz token' });
    }
    req.userId = decoded.id;
    req.user = { id: decoded.id, username: decoded.username || 'admin' };
    next();
  });
}

module.exports = { generateToken, authenticateToken, JWT_SECRET };
