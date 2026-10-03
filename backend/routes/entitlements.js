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
      `SELECT e.*, s.name as collected_shop_name 
       FROM entitlements e 
       LEFT JOIN shops s ON e.collected_shop_id = s.id 
       WHERE e.beneficiary_id = ? 
       ORDER BY e.month DESC LIMIT 6`,
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
    let [rows] = await db.query(
      'SELECT * FROM entitlements WHERE beneficiary_id = ? AND month = ?',
      [req.params.beneficiaryId, month]
    );

    // Auto-create entitlement for the current month if it doesn't exist
    if (!rows.length) {
      const [bRows] = await db.query('SELECT category FROM beneficiaries WHERE id = ?', [req.params.beneficiaryId]);
      if (bRows.length) {
        const cat = bRows[0].category;
        const quotas  = { AAY: [17.5, 17.5, 1, 1], BPL: [12, 12, 0.5, 0.5], APL: [7, 7, 0.25, 0.25] };
        const q = quotas[cat] || quotas['BPL'];
        await db.query(
          'INSERT INTO entitlements (beneficiary_id, month, rice_kg, wheat_kg, sugar_kg, oil_liters) VALUES (?, ?, ?, ?, ?, ?)',
          [req.params.beneficiaryId, month, q[0], q[1], q[2], q[3]]
        );
        [rows] = await db.query(
          'SELECT * FROM entitlements WHERE beneficiary_id = ? AND month = ?',
          [req.params.beneficiaryId, month]
        );
      }
    }

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

    const shopId = req.body.shop_id || 1;
    await db.query(
      'UPDATE entitlements SET collected = TRUE, collected_at = NOW(), collected_shop_id = ? WHERE id = ?',
      [shopId, req.params.id]
    );

    // Log transaction (shop_id from request body or default to 1)
    const items  = { rice_kg: ent.rice_kg, wheat_kg: ent.wheat_kg, sugar_kg: ent.sugar_kg, oil_liters: ent.oil_liters };
    await db.query(
      'INSERT INTO transactions (beneficiary_id, shop_id, items) VALUES (?, ?, ?)',
      [ent.beneficiary_id, shopId, JSON.stringify(items)]
    );

    // Decrease shop stock automatically
    const decrements = [
      { comm: 'Rice', qty: ent.rice_kg },
      { comm: 'Wheat', qty: ent.wheat_kg },
      { comm: 'Sugar', qty: ent.sugar_kg },
      { comm: 'Oil', qty: ent.oil_liters }
    ];

    for (const d of decrements) {
      if (d.qty > 0) {
        await db.query(
          'UPDATE stock SET quantity = GREATEST(0, quantity - ?), updated_at = NOW() WHERE shop_id = ? AND commodity = ?',
          [d.qty, shopId, d.comm]
        );
      }
    }

    res.json({ message: 'Marked as collected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
