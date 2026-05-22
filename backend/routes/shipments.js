// routes/shipments.js – Shipments with live tracking updates from MongoDB
'use strict';

const express  = require('express');
const { query }                     = require('../db/postgres');
const { getDb }                     = require('../db/mongo');
const { authenticate }              = require('../middleware/auth');
const { requirePermission, writeAuditLog } = require('../middleware/rbac');
const router = express.Router();

// ── GET /api/shipments ──────────────────────────────────────────────────────
router.get('/', authenticate, requirePermission('shipments:read'), async (req, res) => {
  try {
    const result = await query(`
      SELECT sh.*, po.status AS order_status, s.business_name AS supplier_name
      FROM   shipment sh
      JOIN   purchase_order po ON po.order_id    = sh.order_id
      JOIN   supplier        s  ON s.supplier_id  = po.supplier_id
      ORDER  BY sh.ship_date DESC NULLS LAST
    `);

    let enriched = result.rows.map(r => ({ ...r, tracking: null }));

    // Attach latest tracking from MongoDB if available
    const db = getDb();
    if (db) {
      try {
        const shipmentIds = result.rows.map(r => r.shipment_id);
        const trackDocs = await db.collection('shipment_tracking')
          .find({ shipment_id: { $in: shipmentIds } }, { projection: { latest_status: 1, latest_gps: 1, shipment_id: 1 } })
          .toArray();
        const trackMap = {};
        for (const doc of trackDocs) trackMap[doc.shipment_id] = doc;
        enriched = result.rows.map(r => ({ ...r, tracking: trackMap[r.shipment_id] || null }));
      } catch (mongoErr) {
        console.warn('[shipments] MongoDB tracking unavailable:', mongoErr.message);
      }
    }

    await writeAuditLog(req.user.empId, 'view', 'shipment', 'all', {});
    return res.json(enriched);
  } catch (err) {
    console.error('[GET /shipments]', err);
    return res.status(500).json({ error: 'Failed to retrieve shipments.' });
  }
});

// ── GET /api/shipments/:id ──────────────────────────────────────────────────
router.get('/:id', authenticate, requirePermission('shipments:read'), async (req, res) => {
  const { id } = req.params;
  try {
    const pgRow = await query(
      `SELECT sh.*, po.supplier_id, s.business_name AS supplier_name
       FROM shipment sh
       JOIN purchase_order po ON po.order_id   = sh.order_id
       JOIN supplier        s  ON s.supplier_id = po.supplier_id
       WHERE sh.shipment_id = $1`, [id]
    );
    if (pgRow.rows.length === 0) return res.status(404).json({ error: 'Shipment not found.' });

    let trackDoc = null;
    const db = getDb();
    if (db) {
      try {
        trackDoc = await db.collection('shipment_tracking').findOne({ shipment_id: parseInt(id) });
      } catch (mongoErr) {
        console.warn('[shipments/:id] MongoDB unavailable:', mongoErr.message);
      }
    }

    await writeAuditLog(req.user.empId, 'view', 'shipment', id, {});
    return res.json({ ...pgRow.rows[0], tracking: trackDoc });
  } catch (err) {
    console.error('[GET /shipments/:id]', err);
    return res.status(500).json({ error: 'Failed to retrieve shipment.' });
  }
});

// ── POST /api/shipments/:id/updates ─────────────────────────────────────────
router.post('/:id/updates', authenticate, requirePermission('shipments:read'), async (req, res) => {
  const { id } = req.params;
  const { location, latitude, longitude, container_condition, notes } = req.body;

  if (!location) return res.status(400).json({ error: 'location is required.' });

  const db = getDb();
  if (!db) return res.status(503).json({ error: 'MongoDB is not available. Tracking updates cannot be stored.' });

  try {
    const update = {
      timestamp: new Date(),
      location,
      gps: { lat: latitude || null, lng: longitude || null },
      container_condition: container_condition || 'Intact',
      notes: notes || ''
    };

    await db.collection('shipment_tracking').updateOne(
      { shipment_id: parseInt(id) },
      {
        $push:  { updates: update },
        $set:   { latest_status: location, latest_gps: update.gps, updated_at: new Date() }
      },
      { upsert: true }
    );

    await writeAuditLog(req.user.empId, 'create', 'shipment_tracking', id, { location });
    return res.status(201).json({ message: 'Tracking update recorded.', update });
  } catch (err) {
    console.error('[POST /shipments/:id/updates]', err);
    return res.status(500).json({ error: 'Failed to record tracking update.' });
  }
});

module.exports = router;
