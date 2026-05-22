// routes/certifications.js – Component certifications (MongoDB, immutable once finalised)
'use strict';
const express  = require('express');
const { getDb }                     = require('../db/mongo');
const { authenticate }              = require('../middleware/auth');
const { requirePermission, writeAuditLog } = require('../middleware/rbac');
const router = express.Router();

function requireMongo(res) {
  const db = getDb();
  if (!db) { res.status(503).json({ error: 'MongoDB is not available. Certifications are unavailable.' }); return null; }
  return db;
}

router.get('/', authenticate, requirePermission('certifications:read'), async (req, res) => {
  const db = requireMongo(res);
  if (!db) return;
  try {
    const docs = await db.collection('component_certifications')
      .find({}, { projection: { inspector_signature: 0, digital_stamp: 0, certificate_pdf: 0 } })
      .sort({ certification_date: -1 }).limit(100).toArray();
    await writeAuditLog(req.user.empId, 'view', 'component_certifications', 'all', {});
    return res.json(docs);
  } catch (err) { return res.status(500).json({ error: 'Failed to retrieve certifications.' }); }
});

router.get('/:certId', authenticate, requirePermission('certifications:read'), async (req, res) => {
  const db = requireMongo(res);
  if (!db) return;
  try {
    const doc = await db.collection('component_certifications').findOne({ certification_id: req.params.certId });
    if (!doc) return res.status(404).json({ error: 'Certification not found.' });
    await writeAuditLog(req.user.empId, 'view', 'component_certifications', req.params.certId, {});
    return res.json(doc);
  } catch (err) { return res.status(500).json({ error: 'Failed to retrieve certification.' }); }
});

router.post('/:certId/approve', authenticate, requirePermission('certifications:approve'), async (req, res) => {
  const db = requireMongo(res);
  if (!db) return;
  const { certId } = req.params;
  try {
    const doc = await db.collection('component_certifications').findOne({ certification_id: certId });
    if (!doc)             return res.status(404).json({ error: 'Certification not found.' });
    if (doc.is_immutable) return res.status(400).json({ error: 'Already approved and immutable.' });
    await db.collection('component_certifications').updateOne(
      { certification_id: certId },
      { $set: { is_immutable: true, status: 'Active', approved_by: req.user.empId, approved_at: new Date() } }
    );
    await writeAuditLog(req.user.empId, 'approve', 'component_certifications', certId, {});
    return res.json({ message: 'Certification approved and locked.' });
  } catch (err) { return res.status(500).json({ error: 'Failed to approve certification.' }); }
});

module.exports = router;
