// routes/iot.js – IoT sensor readings (MongoDB time-series collection)
'use strict';
const express  = require('express');
const { getDb }                     = require('../db/mongo');
const { authenticate }              = require('../middleware/auth');
const { requirePermission, writeAuditLog } = require('../middleware/rbac');
const router = express.Router();

function requireMongo(res) {
  const db = getDb();
  if (!db) { res.status(503).json({ error: 'MongoDB is not available. IoT readings are unavailable.' }); return null; }
  return db;
}

// GET /api/iot/:equipmentId – latest 100 readings for one equipment unit
router.get('/:equipmentId', authenticate, requirePermission('iot:read'), async (req, res) => {
  const db = requireMongo(res);
  if (!db) return;
  const equipId = parseInt(req.params.equipmentId);
  try {
    const docs = await db.collection('iot_sensor_readings')
      .find({ equipment_id: equipId })
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();
    await writeAuditLog(req.user.empId, 'view', 'iot_sensor_readings', String(equipId), {});
    return res.json(docs);
  } catch (err) { return res.status(500).json({ error: 'Failed to retrieve IoT readings.' }); }
});

// GET /api/iot/:equipmentId/latest – single most-recent reading
router.get('/:equipmentId/latest', authenticate, requirePermission('iot:read'), async (req, res) => {
  const db = requireMongo(res);
  if (!db) return;
  const equipId = parseInt(req.params.equipmentId);
  try {
    const doc = await db.collection('iot_sensor_readings')
      .findOne({ equipment_id: equipId }, { sort: { timestamp: -1 } });
    if (!doc) return res.status(404).json({ error: 'No readings found for this equipment.' });
    return res.json(doc);
  } catch (err) { return res.status(500).json({ error: 'Failed to retrieve latest IoT reading.' }); }
});

// POST /api/iot/:equipmentId – ingest a new sensor reading
router.post('/:equipmentId', authenticate, requirePermission('iot:read'), async (req, res) => {
  const db = requireMongo(res);
  if (!db) return;
  const equipId = parseInt(req.params.equipmentId);
  const { temperature, vibration, pressure, gps_latitude, gps_longitude, cycle_count } = req.body;

  try {
    const alerts = [];
    if (temperature !== undefined && temperature > 85)  alerts.push({ sensor:'temperature', value: temperature, threshold: 85 });
    if (vibration   !== undefined && vibration   > 5)   alerts.push({ sensor:'vibration',   value: vibration,   threshold: 5 });
    if (pressure    !== undefined && pressure    > 150)  alerts.push({ sensor:'pressure',    value: pressure,    threshold: 150 });

    const doc = {
      equipment_id: equipId,
      timestamp:    new Date(),
      readings:     { temperature, vibration, pressure, cycle_count },
      gps:          { latitude: gps_latitude || null, longitude: gps_longitude || null },
      alerts
    };

    await db.collection('iot_sensor_readings').insertOne(doc);
    return res.status(201).json({ message: 'Reading recorded.', alerts });
  } catch (err) { return res.status(500).json({ error: 'Failed to store IoT reading.' }); }
});

module.exports = router;
