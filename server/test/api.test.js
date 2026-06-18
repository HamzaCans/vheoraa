const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');

process.env.PORT = '3099';
process.env.JWT_SECRET = 'test-secret';
process.env.SMTP_HOST = '';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';

const express = require('express');
const cors = require('cors');

const { getDb } = require('../db');
const authRoutes = require('../routes/auth');
const productRoutes = require('../routes/products');
const messageRoutes = require('../routes/messages');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api', messageRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

let server;

describe('VHEORA API Tests', () => {
  before(async () => {
    await getDb();
    server = app.listen(process.env.PORT);
  });

  after(() => {
    server.close();
  });

  it('GET /api/health should return ok', async () => {
    const res = await fetch(`http://localhost:${process.env.PORT}/api/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
  });

  it('GET /api/products should return array', async () => {
    const res = await fetch(`http://localhost:${process.env.PORT}/api/products`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
  });

  it('GET /api/testimonials should return array', async () => {
    const res = await fetch(`http://localhost:${process.env.PORT}/api/testimonials`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
  });

  it('POST /api/auth/login should succeed with valid credentials', async () => {
    const res = await fetch(`http://localhost:${process.env.PORT}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Hamzbkadmin', password: 'Vh_12345678' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.token);
    assert.strictEqual(data.username, 'Hamzbkadmin');
  });

  it('POST /api/auth/login should fail with invalid credentials', async () => {
    const res = await fetch(`http://localhost:${process.env.PORT}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Hamzbkadmin', password: 'wrong' })
    });
    assert.strictEqual(res.status, 401);
  });

  it('POST /api/contact should fail without required fields', async () => {
    const res = await fetch(`http://localhost:${process.env.PORT}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: 'Test' })
    });
    assert.strictEqual(res.status, 400);
  });

  it('POST /api/contact should succeed with valid data', async () => {
    const res = await fetch(`http://localhost:${process.env.PORT}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: 'Test',
        last_name: 'User',
        email: 'test@test.com',
        message: 'Test mesaj'
      })
    });
    assert.strictEqual(res.status, 200);
  });

  it('POST /api/quote should succeed with phone', async () => {
    const res = await fetch(`http://localhost:${process.env.PORT}/api/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '05551234567', product_name: 'Test Urun' })
    });
    assert.strictEqual(res.status, 200);
  });
});
