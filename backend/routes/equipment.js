// routes/equipment.js – Equipment CRUD (PostgreSQL)
'use strict';
const express = require('express');
const { query }                     = require('../db/postgres');
const { authenticate }              = require('../middleware/auth');
const { requirePermission, writeAuditLog } = require('../middleware/rbac');
const router  = express.Router();

router.get('/', authenticate, requirePermission('equipment:read'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM equipment ORDER BY facility, equipment_name');
    await writeAuditLog(req.user.empId, 'view', 'equipment', 'all', {});
    return res.json(result.rows);
  } catch (err) { return res.status(500).json({ error: 'Failed to retrieve equipment.' }); }
});

router.get('/:id', authenticate, requirePermission('equipment:read'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM equipment WHERE equipment_id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Equipment not found.' });
    await writeAuditLog(req.user.empId, 'view', 'equipment', req.params.id, {});
    return res.json(result.rows[0]);
  } catch (err) { return res.status(500).json({ error: 'Failed to retrieve equipment.' }); }
});

router.put('/:id/status', authenticate, requirePermission('equipment:write'), async (req, res) => {
  const { status } = req.body;
  const allowed = ['Operational','Maintenance','Offline'];
  if (!allowed.includes(status)) return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}.` });
  try {
    const result = await query(
      'UPDATE equipment SET status=$1 WHERE equipment_id=$2 RETURNING *', [status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Equipment not found.' });
    await writeAuditLog(req.user.empId, 'update', 'equipment', req.params.id, { new_status: status });
    return res.json(result.rows[0]);
  } catch (err) { return res.status(500).json({ error: 'Failed to update equipment status.' }); }
});

module.exports = router;
