// routes/parts.js – Parts catalogue
'use strict';
const express = require('express');
const { query }            = require('../db/postgres');
const { authenticate }     = require('../middleware/auth');
const { requirePermission }= require('../middleware/rbac');
const router = express.Router();

router.get('/', authenticate, requirePermission('parts:read'), async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*,
             COUNT(sp.supplier_id) AS supplier_count,
             MIN(sp.unit_price)    AS min_price,
             MAX(sp.unit_price)    AS max_price
      FROM   part p
      LEFT JOIN supplier_part sp ON sp.part_id = p.part_id
      GROUP  BY p.part_id
      ORDER  BY p.category, p.part_name
    `);
    return res.json(result.rows);
  } catch (err) { return res.status(500).json({ error: 'Failed to retrieve parts.' }); }
});

router.get('/:id', authenticate, requirePermission('parts:read'), async (req, res) => {
  try {
    const [partRow, suppliersRow] = await Promise.all([
      query('SELECT * FROM part WHERE part_id = $1', [req.params.id]),
      query(`SELECT s.supplier_id, s.business_name, sp.unit_price, sp.lead_time_days
             FROM supplier_part sp JOIN supplier s ON s.supplier_id = sp.supplier_id
             WHERE sp.part_id = $1`, [req.params.id])
    ]);
    if (partRow.rows.length === 0) return res.status(404).json({ error: 'Part not found.' });
    return res.json({ ...partRow.rows[0], suppliers: suppliersRow.rows });
  } catch (err) { return res.status(500).json({ error: 'Failed to retrieve part.' }); }
});

module.exports = router;
