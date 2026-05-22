// routes/qcreports.js – QC Reports stored in MongoDB
'use strict';

const express  = require('express');
const { query }                     = require('../db/postgres');
const { getDb }                     = require('../db/mongo');
const { authenticate }              = require('../middleware/auth');
const { requirePermission, writeAuditLog } = require('../middleware/rbac');
const router = express.Router();

function requireMongo(res) {
  const db = getDb();
  if (!db) {
    res.status(503).json({ error: 'MongoDB is not available. QC reports are unavailable.' });
    return null;
  }
  return db;
}

// ── GET /api/qcreports ──────────────────────────────────────────────────────
router.get('/', authenticate, requirePermission('qcreports:read'), async (req, res) => {
  const db = requireMongo(res);
  if (!db) return;
  try {
    const { report_type, result: overallResult, inspector_id } = req.query;
    const filter = {};
    if (report_type)   filter.report_type    = report_type;
    if (overallResult) filter.overall_result = overallResult;
    if (inspector_id)  filter.inspector_id   = parseInt(inspector_id);

    const docs = await db.collection('qc_reports')
      .find(filter, { projection: { dimensional_checks: 0, ndt_results: 0, environmental_tests: 0 } })
      .sort({ inspection_date: -1 })
      .limit(100)
      .toArray();

    await writeAuditLog(req.user.empId, 'view', 'qc_reports', 'all', { filters: req.query });
    return res.json(docs);
  } catch (err) {
    console.error('[GET /qcreports]', err);
    return res.status(500).json({ error: 'Failed to retrieve QC reports.' });
  }
});

// ── GET /api/qcreports/:reportId ─────────────────────────────────────────────
router.get('/:reportId', authenticate, requirePermission('qcreports:read'), async (req, res) => {
  const db = requireMongo(res);
  if (!db) return;
  try {
    const doc = await db.collection('qc_reports').findOne({ report_id: req.params.reportId });
    if (!doc) return res.status(404).json({ error: 'QC report not found.' });
    await writeAuditLog(req.user.empId, 'view', 'qc_reports', req.params.reportId, {});
    return res.json(doc);
  } catch (err) {
    console.error('[GET /qcreports/:id]', err);
    return res.status(500).json({ error: 'Failed to retrieve QC report.' });
  }
});

// ── POST /api/qcreports ──────────────────────────────────────────────────────
router.post('/', authenticate, requirePermission('qcreports:write'), async (req, res) => {
  const db = requireMongo(res);
  if (!db) return;

  const { order_item_id, report_type, inspection_date, overall_result,
          dimensional_checks, ndt_results, environmental_tests, visual_inspection, comments } = req.body;

  const allowedTypes = ['visual','dimensional','ndt','environmental'];
  if (!order_item_id || !report_type || !overall_result) {
    return res.status(400).json({ error: 'order_item_id, report_type, and overall_result are required.' });
  }
  if (!allowedTypes.includes(report_type)) {
    return res.status(400).json({ error: `report_type must be one of: ${allowedTypes.join(', ')}.` });
  }

  try {
    const oi = await query('SELECT order_item_id FROM order_item WHERE order_item_id = $1', [order_item_id]);
    if (oi.rows.length === 0) return res.status(400).json({ error: 'order_item_id does not exist.' });

    const reportId = `RPT-${Date.now()}`;
    const doc = {
      report_id:           reportId,
      order_item_id:       parseInt(order_item_id),
      inspector_id:        req.user.empId,
      report_type,
      inspection_date:     inspection_date ? new Date(inspection_date) : new Date(),
      overall_result,
      version:             1,
      is_immutable:        false,
      dimensional_checks:  dimensional_checks  || [],
      ndt_results:         ndt_results         || [],
      environmental_tests: environmental_tests || [],
      visual_inspection:   visual_inspection   || {},
      comments:            comments            || '',
      created_at:          new Date()
    };

    await db.collection('qc_reports').insertOne(doc);
    await writeAuditLog(req.user.empId, 'create', 'qc_reports', reportId, { report_type, overall_result });
    return res.status(201).json(doc);
  } catch (err) {
    console.error('[POST /qcreports]', err);
    return res.status(500).json({ error: 'Failed to create QC report.' });
  }
});

// ── PUT /api/qcreports/:reportId ─────────────────────────────────────────────
router.put('/:reportId', authenticate, requirePermission('qcreports:write'), async (req, res) => {
  const db = requireMongo(res);
  if (!db) return;
  const { reportId } = req.params;
  try {
    const doc = await db.collection('qc_reports').findOne({ report_id: reportId });
    if (!doc)             return res.status(404).json({ error: 'QC report not found.' });
    if (doc.is_immutable) return res.status(403).json({ error: 'Report is approved and immutable.' });

    const { overall_result, comments, dimensional_checks, ndt_results, environmental_tests, visual_inspection } = req.body;
    const update = { $inc: { version: 1 }, $set: { updated_at: new Date() } };
    if (overall_result !== undefined)     update.$set.overall_result      = overall_result;
    if (comments !== undefined)           update.$set.comments            = comments;
    if (dimensional_checks !== undefined) update.$set.dimensional_checks  = dimensional_checks;
    if (ndt_results !== undefined)        update.$set.ndt_results         = ndt_results;
    if (environmental_tests !== undefined)update.$set.environmental_tests = environmental_tests;
    if (visual_inspection !== undefined)  update.$set.visual_inspection   = visual_inspection;

    await db.collection('qc_reports').updateOne({ report_id: reportId }, update);
    await writeAuditLog(req.user.empId, 'update', 'qc_reports', reportId, req.body);
    return res.json({ message: 'QC report updated.', new_version: doc.version + 1 });
  } catch (err) {
    console.error('[PUT /qcreports/:id]', err);
    return res.status(500).json({ error: 'Failed to update QC report.' });
  }
});

// ── POST /api/qcreports/:reportId/approve ────────────────────────────────────
router.post('/:reportId/approve', authenticate, requirePermission('qcreports:approve'), async (req, res) => {
  const db = requireMongo(res);
  if (!db) return;
  const { reportId } = req.params;
  try {
    const doc = await db.collection('qc_reports').findOne({ report_id: reportId });
    if (!doc)             return res.status(404).json({ error: 'QC report not found.' });
    if (doc.is_immutable) return res.status(400).json({ error: 'Report already approved.' });

    await db.collection('qc_reports').updateOne(
      { report_id: reportId },
      { $set: { is_immutable: true, approved_by: req.user.empId, approved_at: new Date() } }
    );
    await writeAuditLog(req.user.empId, 'approve', 'qc_reports', reportId, {});
    return res.json({ message: 'QC report approved and locked as immutable.' });
  } catch (err) {
    console.error('[POST /qcreports/:id/approve]', err);
    return res.status(500).json({ error: 'Failed to approve QC report.' });
  }
});

module.exports = router;
