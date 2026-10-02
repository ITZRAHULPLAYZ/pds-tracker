const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate } = require('../middleware/authMiddleware');

// GET /api/stock/:shopId
router.get('/:shopId', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM stock WHERE shop_id = ? ORDER BY commodity',
      [req.params.shopId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/stock — all shops summary (admin)
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.id, s.name, s.address, st.commodity, st.quantity, st.updated_at
       FROM shops s
       LEFT JOIN stock st ON s.id = st.shop_id
       ORDER BY s.id, st.commodity`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/stock/update
router.post('/update', authenticate, async (req, res) => {
  const { shop_id, commodity, quantity } = req.body;
  if (!shop_id || !commodity || quantity == null) {
    return res.status(400).json({ error: 'shop_id, commodity, quantity required' });
  }
  try {
    await db.query(
      `INSERT INTO stock (shop_id, commodity, quantity)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = NOW()`,
      [shop_id, commodity, quantity]
    );
    res.json({ message: 'Stock updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
