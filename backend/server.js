// server.js – AeroNetB API main entry point
'use strict';

require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const { connect } = require('./db/mongo');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Serve static dashboard ────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/suppliers',      require('./routes/suppliers'));
app.use('/api/parts',          require('./routes/parts'));
app.use('/api/orders',         require('./routes/orders'));
app.use('/api/shipments',      require('./routes/shipments'));
app.use('/api/qcreports',      require('./routes/qcreports'));
app.use('/api/certifications', require('./routes/certifications'));
app.use('/api/equipment',      require('./routes/equipment'));
app.use('/api/iot',            require('./routes/iot'));
app.use('/api/dashboard',      require('./routes/dashboard'));
app.use('/api/audit',          require('./routes/audit'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── SPA catch-all (serve index.html for any non-API route) ───────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

// ── Start server after MongoDB connects ──────────────────────────────────────
async function start() {
  // MongoDB — non-fatal: routes that need it will return 503 if unavailable
  try {
    await connect();
    console.log('[MongoDB] Ready');
  } catch (err) {
    console.warn('[MongoDB] Not available — document-store routes will be disabled:', err.message);
  }

  // PostgreSQL pool is lazy-connected on first query
  app.listen(PORT, () => {
    console.log(`\n🚀 AeroNetB API running on http://localhost:${PORT}`);
    console.log(`   Dashboard: http://localhost:${PORT}`);
    console.log(`   Health:    http://localhost:${PORT}/api/health\n`);
  });
}

start();
