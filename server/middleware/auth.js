const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'vheora-jwt-secret-2026';

function generateToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '24h' });
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
    next();
  });
}

module.exports = { generateToken, authenticateToken, JWT_SECRET };
