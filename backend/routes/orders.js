// routes/orders.js – Purchase orders and order items
'use strict';

const express = require('express');
const { query }                     = require('../db/postgres');
const { authenticate }              = require('../middleware/auth');
const { requirePermission, writeAuditLog } = require('../middleware/rbac');
const router = express.Router();

// ── GET /api/orders ─────────────────────────────────────────────────────────
router.get('/', authenticate, requirePermission('orders:read'), async (req, res) => {
  try {
    const { status, supplier_id } = req.query;
    let sql = `
      SELECT po.*,
             s.business_name AS supplier_name,
             e.full_name     AS created_by,
             COUNT(oi.order_item_id)    AS item_count,
             SUM(oi.quantity * oi.unit_price) AS total_value
      FROM   purchase_order po
      JOIN   supplier s ON s.supplier_id = po.supplier_id
      LEFT JOIN employee e  ON e.emp_id  = po.created_by_emp_id
      LEFT JOIN order_item oi ON oi.order_id = po.order_id
      WHERE 1=1
    `;
    const params = [];
    if (status)      { params.push(status);      sql += ` AND po.status = $${params.length}`; }
    if (supplier_id) { params.push(supplier_id); sql += ` AND po.supplier_id = $${params.length}`; }
    sql += ' GROUP BY po.order_id, s.business_name, e.full_name ORDER BY po.order_date DESC';

    const result = await query(sql, params);
    await writeAuditLog(req.user.empId, 'view', 'purchase_order', 'all', { filters: req.query });
    return res.json(result.rows);
  } catch (err) {
    console.error('[GET /orders]', err);
    return res.status(500).json({ error: 'Failed to retrieve orders.' });
  }
});

// ── GET /api/orders/:id ──────────────────────────────────────────────────────
router.get('/:id', authenticate, requirePermission('orders:read'), async (req, res) => {
  const { id } = req.params;
  try {
    const [orderRow, itemsRows, shipmentsRows] = await Promise.all([
      query(`SELECT po.*, s.business_name AS supplier_name
             FROM purchase_order po JOIN supplier s ON s.supplier_id = po.supplier_id
             WHERE po.order_id = $1`, [id]),
      query(`SELECT oi.*, p.part_name, p.category
             FROM order_item oi JOIN part p ON p.part_id = oi.part_id
             WHERE oi.order_id = $1`, [id]),
      query('SELECT * FROM shipment WHERE order_id = $1', [id])
    ]);

    if (orderRow.rows.length === 0) return res.status(404).json({ error: 'Order not found.' });

    await writeAuditLog(req.user.empId, 'view', 'purchase_order', id, {});
    return res.json({
      ...orderRow.rows[0],
      items:     itemsRows.rows,
      shipments: shipmentsRows.rows
    });
  } catch (err) {
    console.error('[GET /orders/:id]', err);
    return res.status(500).json({ error: 'Failed to retrieve order.' });
  }
});

// ── POST /api/orders ─────────────────────────────────────────────────────────
router.post('/', authenticate, requirePermission('orders:write'), async (req, res) => {
  const { supplier_id, desired_delivery_date, items } = req.body;

  if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'supplier_id and at least one items entry are required.' });
  }

  const client = (require('../db/postgres')).pool;
  const conn = await client.connect();
  try {
    await conn.query('BEGIN');
    await conn.query('SET search_path TO aeronetb');

    // Insert order header
    const orderResult = await conn.query(
      `INSERT INTO purchase_order (supplier_id, created_by_emp_id, desired_delivery_date, status)
       VALUES ($1, $2, $3, 'placed') RETURNING *`,
      [supplier_id, req.user.empId, desired_delivery_date || null]
    );
    const newOrder = orderResult.rows[0];

    // Insert line items
    for (const item of items) {
      await conn.query(
        `INSERT INTO order_item (order_id, part_id, quantity, unit_price) VALUES ($1,$2,$3,$4)`,
        [newOrder.order_id, item.part_id, item.quantity, item.unit_price]
      );
    }

    await conn.query('COMMIT');
    await writeAuditLog(req.user.empId, 'create', 'purchase_order', newOrder.order_id,
      { supplier_id, item_count: items.length });
    return res.status(201).json({ ...newOrder, items });
  } catch (err) {
    await conn.query('ROLLBACK');
    console.error('[POST /orders]', err);
    return res.status(500).json({ error: 'Failed to create order.' });
  } finally {
    conn.release();
  }
});

// ── PUT /api/orders/:id/status ───────────────────────────────────────────────
router.put('/:id/status', authenticate, requirePermission('orders:write'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const allowed = ['placed','confirmed','dispatched','delivered','completed'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}.` });
  }

  try {
    const result = await query(
      `UPDATE purchase_order
       SET status = $1::varchar,
           actual_delivery_date = CASE WHEN $1::varchar = 'delivered' THEN CURRENT_DATE ELSE actual_delivery_date END
       WHERE order_id = $2 RETURNING *`,
      [status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found.' });
    await writeAuditLog(req.user.empId, 'update', 'purchase_order', id, { new_status: status });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('[PUT /orders/:id/status]', err);
    return res.status(500).json({ error: 'Failed to update order status.' });
  }
});

module.exports = router;
