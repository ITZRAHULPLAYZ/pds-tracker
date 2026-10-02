const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate } = require('../middleware/authMiddleware');

// GET /api/entitlements/me — logged-in beneficiary's history
router.get('/me', authenticate, async (req, res) => {
  try {
    const [bRows] = await db.query('SELECT id FROM beneficiaries WHERE user_id = ?', [req.user.id]);
    if (!bRows.length) return res.status(404).json({ error: 'Beneficiary not found' });

    const [rows] = await db.query(
      'SELECT * FROM entitlements WHERE beneficiary_id = ? ORDER BY month DESC LIMIT 6',
      [bRows[0].id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/entitlements/:beneficiaryId — current month for a specific beneficiary (shop)
router.get('/:beneficiaryId', authenticate, async (req, res) => {
  try {
    const month = new Date().toISOString().slice(0, 7);
    const [rows] = await db.query(
      'SELECT * FROM entitlements WHERE beneficiary_id = ? AND month = ?',
      [req.params.beneficiaryId, month]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/entitlements/:id/collect — mark as collected + log transaction
router.put('/:id/collect', authenticate, async (req, res) => {
  try {
    const [entRows] = await db.query('SELECT * FROM entitlements WHERE id = ?', [req.params.id]);
    if (!entRows.length) return res.status(404).json({ error: 'Entitlement not found' });
    const ent = entRows[0];

    if (ent.collected) return res.status(400).json({ error: 'Already collected this month' });

    await db.query(
      'UPDATE entitlements SET collected = TRUE, collected_at = NOW() WHERE id = ?',
      [req.params.id]
    );

    // Log transaction (shop_id from request body or default to 1)
    const shopId = req.body.shop_id || 1;
    const items  = { rice_kg: ent.rice_kg, wheat_kg: ent.wheat_kg, sugar_kg: ent.sugar_kg, oil_liters: ent.oil_liters };
    await db.query(
      'INSERT INTO transactions (beneficiary_id, shop_id, items) VALUES (?, ?, ?)',
      [ent.beneficiary_id, shopId, JSON.stringify(items)]
    );

    res.json({ message: 'Marked as collected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
