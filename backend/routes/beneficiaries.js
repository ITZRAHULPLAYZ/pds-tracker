const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate } = require('../middleware/authMiddleware');

// GET /api/beneficiaries/me — own profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, u.name, u.email, s.name AS shop_name, s.address AS shop_address, s.license_no
       FROM beneficiaries b
       JOIN users u  ON b.user_id = u.id
       LEFT JOIN shops s ON b.shop_id = s.id
       WHERE b.user_id = ?`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Beneficiary profile not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/beneficiaries — all (admin)
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, u.name, u.email, s.name AS shop_name
       FROM beneficiaries b
       JOIN users u ON b.user_id = u.id
       LEFT JOIN shops s ON b.shop_id = s.id
       ORDER BY b.id DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/beneficiaries/card/:cardNo — lookup by ration card (shop verification)
router.get('/card/:cardNo', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, u.name, u.email FROM beneficiaries b
       JOIN users u ON b.user_id = u.id
       WHERE b.ration_card_no = ?`,
      [req.params.cardNo]
    );
    if (!rows.length) return res.status(404).json({ error: 'Ration card not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
