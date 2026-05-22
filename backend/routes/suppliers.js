// routes/suppliers.js – CRUD for suppliers and accreditations
'use strict';

const express = require('express');
const { query }                     = require('../db/postgres');
const { authenticate }              = require('../middleware/auth');
const { requirePermission, writeAuditLog } = require('../middleware/rbac');
const router = express.Router();

// ── GET /api/suppliers ──────────────────────────────────────────────────────
// Returns all suppliers with accreditation count and active-accreditation flag.
router.get('/', authenticate, requirePermission('suppliers:read'), async (req, res) => {
  try {
    const result = await query(
      `SELECT s.*,
              COUNT(a.accreditation_id)                              AS accreditation_count,
              BOOL_OR(a.status = 'Active' AND a.expiry_date > NOW()) AS has_active_cert
       FROM   supplier s
       LEFT JOIN accreditation a ON a.supplier_id = s.supplier_id
       GROUP  BY s.supplier_id
       ORDER  BY s.supplier_id`
    );
    await writeAuditLog(req.user.empId, 'view', 'supplier', 'all', {});
    return res.json(result.rows);
  } catch (err) {
    console.error('[GET /suppliers]', err);
    return res.status(500).json({ error: 'Failed to retrieve suppliers.' });
  }
});

// ── GET /api/suppliers/:id ──────────────────────────────────────────────────
// Returns one supplier with all accreditations and parts supplied.
router.get('/:id', authenticate, requirePermission('suppliers:read'), async (req, res) => {
  const { id } = req.params;
  try {
    const [supRow, accRows, partsRows] = await Promise.all([
      query('SELECT * FROM supplier WHERE supplier_id = $1', [id]),
      query('SELECT * FROM accreditation WHERE supplier_id = $1 ORDER BY issue_date DESC', [id]),
      query(
        `SELECT p.part_id, p.part_name, p.category, sp.unit_price, sp.lead_time_days
         FROM   supplier_part sp
         JOIN   part p ON p.part_id = sp.part_id
         WHERE  sp.supplier_id = $1`, [id]
      )
    ]);

    if (supRow.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }

    await writeAuditLog(req.user.empId, 'view', 'supplier', id, {});
    return res.json({
      ...supRow.rows[0],
      accreditations: accRows.rows,
      parts_supplied: partsRows.rows
    });
  } catch (err) {
    console.error('[GET /suppliers/:id]', err);
    return res.status(500).json({ error: 'Failed to retrieve supplier.' });
  }
});

// ── POST /api/suppliers ─────────────────────────────────────────────────────
router.post('/', authenticate, requirePermission('suppliers:write'), async (req, res) => {
  const { business_name, address_line1, address_line2, city, state, country,
          postal_code, phone, email, website } = req.body;

  if (!business_name || !country) {
    return res.status(400).json({ error: 'business_name and country are required.' });
  }

  try {
    const result = await query(
      `INSERT INTO supplier
         (business_name,address_line1,address_line2,city,state,country,postal_code,phone,email,website)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [business_name,address_line1,address_line2,city,state,country,postal_code,phone,email,website]
    );
    const created = result.rows[0];
    await writeAuditLog(req.user.empId, 'create', 'supplier', created.supplier_id, { business_name });
    return res.status(201).json(created);
  } catch (err) {
    console.error('[POST /suppliers]', err);
    return res.status(500).json({ error: 'Failed to create supplier.' });
  }
});

// ── PUT /api/suppliers/:id ──────────────────────────────────────────────────
router.put('/:id', authenticate, requirePermission('suppliers:write'), async (req, res) => {
  const { id } = req.params;
  const { business_name, city, country, phone, email, website } = req.body;
  try {
    const result = await query(
      `UPDATE supplier
       SET business_name = COALESCE($1, business_name),
           city          = COALESCE($2, city),
           country       = COALESCE($3, country),
           phone         = COALESCE($4, phone),
           email         = COALESCE($5, email),
           website       = COALESCE($6, website),
           updated_at    = NOW()
       WHERE supplier_id = $7 RETURNING *`,
      [business_name, city, country, phone, email, website, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Supplier not found.' });
    await writeAuditLog(req.user.empId, 'update', 'supplier', id, req.body);
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('[PUT /suppliers/:id]', err);
    return res.status(500).json({ error: 'Failed to update supplier.' });
  }
});

// ── POST /api/suppliers/:id/accreditations ──────────────────────────────────
router.post('/:id/accreditations', authenticate, requirePermission('suppliers:write'), async (req, res) => {
  const { id } = req.params;
  const { accreditation_type, issue_date, expiry_date, status } = req.body;
  if (!accreditation_type || !issue_date) {
    return res.status(400).json({ error: 'accreditation_type and issue_date are required.' });
  }
  try {
    const result = await query(
      `INSERT INTO accreditation (supplier_id, accreditation_type, issue_date, expiry_date, status)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, accreditation_type, issue_date, expiry_date || null, status || 'Active']
    );
    await writeAuditLog(req.user.empId, 'create', 'accreditation', result.rows[0].accreditation_id, { supplier_id: id });
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[POST /suppliers/:id/accreditations]', err);
    return res.status(500).json({ error: 'Failed to create accreditation.' });
  }
});

module.exports = router;
