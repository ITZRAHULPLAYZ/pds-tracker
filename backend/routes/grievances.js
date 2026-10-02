const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate } = require('../middleware/authMiddleware');

// POST /api/grievances — submit
router.post('/', authenticate, async (req, res) => {
  const { subject, description } = req.body;
  if (!subject || !description) return res.status(400).json({ error: 'Subject and description required' });

  try {
    let beneficiary_id = null;
    if (req.user.role === 'beneficiary') {
      const [bRows] = await db.query('SELECT id FROM beneficiaries WHERE user_id = ?', [req.user.id]);
      if (bRows.length) beneficiary_id = bRows[0].id;
    }
    const [result] = await db.query(
      'INSERT INTO grievances (beneficiary_id, subject, description) VALUES (?, ?, ?)',
      [beneficiary_id, subject, description]
    );
    res.json({ message: 'Grievance submitted', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/grievances — admin sees all, beneficiary sees own
router.get('/', authenticate, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'admin') {
      [rows] = await db.query(
        `SELECT g.*, u.name AS user_name
         FROM grievances g
         LEFT JOIN beneficiaries b ON g.beneficiary_id = b.id
         LEFT JOIN users u         ON b.user_id = u.id
         ORDER BY g.submitted_at DESC`
      );
    } else {
      const [bRows] = await db.query('SELECT id FROM beneficiaries WHERE user_id = ?', [req.user.id]);
      const bid = bRows[0]?.id || 0;
      [rows] = await db.query(
        'SELECT * FROM grievances WHERE beneficiary_id = ? ORDER BY submitted_at DESC',
        [bid]
      );
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/grievances/:id/status — admin updates status
router.put('/:id/status', authenticate, async (req, res) => {
  const { status } = req.body;
  const valid = ['pending', 'in_progress', 'resolved'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    const resolved_at = status === 'resolved' ? new Date() : null;
    await db.query(
      'UPDATE grievances SET status = ?, resolved_at = ? WHERE id = ?',
      [status, resolved_at, req.params.id]
    );
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
