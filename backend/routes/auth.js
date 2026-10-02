const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'pds_secret',
      { expiresIn: '24h' }
    );

    // Fetch beneficiary profile if applicable
    let profile = null;
    if (user.role === 'beneficiary') {
      const [bRows] = await db.query('SELECT * FROM beneficiaries WHERE user_id = ?', [user.id]);
      profile = bRows[0] || null;
    }

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role }, profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/register  (beneficiaries only)
router.post('/register', async (req, res) => {
  const { name, email, password, phone, address, family_size, category, aadhar } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password required' });

  try {
    const hashed  = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashed, 'beneficiary']
    );

    const cardNo  = 'RC' + Date.now().toString().slice(-8);
    const cat     = category || 'BPL';

    await db.query(
      'INSERT INTO beneficiaries (user_id, ration_card_no, family_size, category, address, phone, aadhar, shop_id) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [result.insertId, cardNo, family_size || 1, cat, address || '', phone || '', aadhar || '']
    );

    // Auto-create current month entitlement
    const [bRows] = await db.query('SELECT id FROM beneficiaries WHERE user_id = ?', [result.insertId]);
    const quotas  = { AAY: [17.5, 17.5, 1, 1], BPL: [12, 12, 0.5, 0.5], APL: [7, 7, 0.25, 0.25] };
    const q       = quotas[cat];
    const month   = new Date().toISOString().slice(0, 7);
    await db.query(
      'INSERT INTO entitlements (beneficiary_id, month, rice_kg, wheat_kg, sugar_kg, oil_liters) VALUES (?, ?, ?, ?, ?, ?)',
      [bRows[0].id, month, q[0], q[1], q[2], q[3]]
    );

    res.json({ message: 'Registration successful', cardNo });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email already registered' });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
