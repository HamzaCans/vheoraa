const express = require('express');
const { getGoldPrice, getGoldPriceHistory, forceLogGoldPrice } = require('../goldPrice');
const { getDb } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/gold-price', async (req, res) => {
  try {
    const price = await getGoldPrice();
    res.json(price);
  } catch (err) {
    console.error('[GoldPrice] Error:', err);
    res.status(500).json({ error: 'Altın fiyatı yüklenirken hata oluştu' });
  }
});

router.get('/admin/gold-prices', authenticateToken, async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    forceLogGoldPrice();
    const current = await getGoldPrice();
    const history = await getGoldPriceHistory(hours);
    res.json({ current, history });
  } catch (err) {
    console.error('[GoldPrice] Admin error:', err);
    res.status(500).json({ error: 'Altın fiyatı geçmişi yüklenirken hata oluştu' });
  }
});

module.exports = router;
