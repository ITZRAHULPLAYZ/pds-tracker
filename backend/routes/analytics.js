const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate } = require('../middleware/authMiddleware');

// GET /api/analytics/summary — admin dashboard stats
router.get('/summary', authenticate, async (req, res) => {
  try {
    const [[{ total_beneficiaries }]] = await db.query('SELECT COUNT(*) AS total_beneficiaries FROM beneficiaries');
    const [[{ total_transactions }]]  = await db.query('SELECT COUNT(*) AS total_transactions FROM transactions');
    const [[{ pending_grievances }]]  = await db.query("SELECT COUNT(*) AS pending_grievances FROM grievances WHERE status = 'pending'");
    const [[{ total_shops }]]         = await db.query('SELECT COUNT(*) AS total_shops FROM shops');
    const [[{ collected_this_month }]]= await db.query(
      "SELECT COUNT(*) AS collected_this_month FROM entitlements WHERE collected = TRUE AND month = ?",
      [new Date().toISOString().slice(0, 7)]
    );

    const [by_category] = await db.query(
      'SELECT category, COUNT(*) AS count FROM beneficiaries GROUP BY category'
    );

    const [monthly_collections] = await db.query(
      `SELECT month, COUNT(*) AS collected
       FROM entitlements WHERE collected = TRUE
       GROUP BY month ORDER BY month DESC LIMIT 6`
    );

    const [grievance_status] = await db.query(
      'SELECT status, COUNT(*) AS count FROM grievances GROUP BY status'
    );

    res.json({
      total_beneficiaries,
      total_transactions,
      pending_grievances,
      total_shops,
      collected_this_month,
      by_category,
      monthly_collections,
      grievance_status
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/analytics/public — public stats for login page (no auth)
router.get('/public', async (req, res) => {
  try {
    const [[{ total_beneficiaries }]] = await db.query('SELECT COUNT(*) AS total_beneficiaries FROM beneficiaries');
    const [[{ total_transactions }]]  = await db.query('SELECT COUNT(*) AS total_transactions FROM transactions');
    const [[{ pending_grievances }]]  = await db.query("SELECT COUNT(*) AS pending_grievances FROM grievances WHERE status = 'pending'");
    const [[{ total_shops }]]         = await db.query('SELECT COUNT(*) AS total_shops FROM shops');
    res.json({ total_beneficiaries, total_transactions, pending_grievances, total_shops });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
