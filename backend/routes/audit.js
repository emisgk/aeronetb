// routes/audit.js – Read-only audit log access (Auditor role only)
'use strict';
const express = require('express');
const { query }                     = require('../db/postgres');
const { authenticate }              = require('../middleware/auth');
const { requirePermission, writeAuditLog } = require('../middleware/rbac');
const router  = express.Router();

// GET /api/audit – Paginated audit log with optional filters
router.get('/', authenticate, requirePermission('audit:read'), async (req, res) => {
  try {
    const { entity_type, emp_id, action_type, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT al.log_id, al.action_type, al.entity_type, al.entity_id,
             al.timestamp, al.details,
             e.full_name AS employee_name, e.email AS employee_email
      FROM   audit_log al
      JOIN   employee e ON e.emp_id = al.emp_id
      WHERE  1=1
    `;
    const params = [];
    if (entity_type)  { params.push(entity_type);       sql += ` AND al.entity_type = $${params.length}`; }
    if (emp_id)       { params.push(parseInt(emp_id));  sql += ` AND al.emp_id = $${params.length}`; }
    if (action_type)  { params.push(action_type);       sql += ` AND al.action_type = $${params.length}`; }

    params.push(parseInt(limit));  sql += ` ORDER BY al.timestamp DESC LIMIT $${params.length}`;
    params.push(parseInt(offset)); sql += ` OFFSET $${params.length}`;

    const result = await query(sql, params);
    await writeAuditLog(req.user.empId, 'view', 'audit_log', 'all', { filters: req.query });
    return res.json(result.rows);
  } catch (err) {
    console.error('[GET /audit]', err);
    return res.status(500).json({ error: 'Failed to retrieve audit log.' });
  }
});

module.exports = router;
