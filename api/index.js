const path = require('path');

let app;
try {
  app = require(path.join(__dirname, '..', 'server', 'server'));
} catch (e) {
  const express = require('express');
  app = express();
  app.get('/api/health', (req, res) => res.json({ status: 'error', message: e.message }));
}

module.exports = app;
