const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// API routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/beneficiaries', require('./routes/beneficiaries'));
app.use('/api/entitlements',  require('./routes/entitlements'));
app.use('/api/stock',         require('./routes/stock'));
app.use('/api/grievances',    require('./routes/grievances'));
app.use('/api/analytics',     require('./routes/analytics'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Catch-all — serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n  PDS Tracker API  →  http://localhost:${PORT}`);
  console.log(`  Frontend         →  http://localhost:${PORT}/index.html\n`);
});
