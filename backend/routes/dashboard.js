// routes/dashboard.js – Aggregated KPI endpoints consumed by the dashboard UI
'use strict';
const express  = require('express');
const { query }             = require('../db/postgres');
const { getDb }             = require('../db/mongo');
const { authenticate }      = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const router = express.Router();

// GET /api/dashboard/kpis
router.get('/kpis', authenticate, requirePermission('kpis:read'), async (req, res) => {
  try {
    const result = await query(`
      SELECT
        s.supplier_id,
        s.business_name,
        COUNT(po.order_id)                                             AS total_orders,
        COUNT(CASE WHEN po.status = 'completed' THEN 1 END)           AS completed_orders,
        COUNT(CASE WHEN po.actual_delivery_date <= po.desired_delivery_date THEN 1 END) AS on_time_orders,
        ROUND(
          100.0 * COUNT(CASE WHEN po.actual_delivery_date <= po.desired_delivery_date THEN 1 END)
          / NULLIF(COUNT(CASE WHEN po.status = 'completed' THEN 1 END), 0), 1
        )                                                              AS on_time_pct,
        ROUND(AVG(
          CASE WHEN po.actual_delivery_date IS NOT NULL
          THEN po.actual_delivery_date - po.order_date END
        ), 1)                                                          AS avg_delivery_days,
        COUNT(CASE WHEN po.status IN ('placed','confirmed','dispatched') THEN 1 END) AS active_orders
      FROM supplier s
      LEFT JOIN purchase_order po ON po.supplier_id = s.supplier_id
      GROUP BY s.supplier_id, s.business_name
      ORDER BY s.supplier_id
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error('[GET /dashboard/kpis]', err);
    return res.status(500).json({ error: 'Failed to compute KPIs.' });
  }
});

// GET /api/dashboard/orders-by-status
router.get('/orders-by-status', authenticate, requirePermission('dashboard:read'), async (req, res) => {
  try {
    const result = await query(
      `SELECT status, COUNT(*) AS count FROM purchase_order GROUP BY status ORDER BY count DESC`
    );
    return res.json(result.rows);
  } catch (err) { return res.status(500).json({ error: 'Failed to fetch order status breakdown.' }); }
});

// GET /api/dashboard/qc-summary – from MongoDB (graceful fallback)
router.get('/qc-summary', authenticate, requirePermission('dashboard:read'), async (req, res) => {
  const db = getDb();
  if (!db) return res.json([]);   // return empty array; dashboard handles it gracefully
  try {
    const agg = await db.collection('qc_reports').aggregate([
      { $group: {
          _id: { report_type: '$report_type', overall_result: '$overall_result' },
          count: { $sum: 1 }
      }},
      { $sort: { '_id.report_type': 1 } }
    ]).toArray();
    return res.json(agg);
  } catch (err) { return res.status(500).json({ error: 'Failed to fetch QC summary.' }); }
});

// GET /api/dashboard/equipment-status
router.get('/equipment-status', authenticate, requirePermission('dashboard:read'), async (req, res) => {
  try {
    const result = await query(`SELECT status, COUNT(*) AS count FROM equipment GROUP BY status`);
    return res.json(result.rows);
  } catch (err) { return res.status(500).json({ error: 'Failed to fetch equipment status.' }); }
});

// GET /api/dashboard/recent-activity
router.get('/recent-activity', authenticate, requirePermission('dashboard:read'), async (req, res) => {
  try {
    const result = await query(`
      SELECT al.log_id, al.action_type, al.entity_type, al.entity_id, al.timestamp,
             e.full_name AS employee_name
      FROM   audit_log al
      JOIN   employee e ON e.emp_id = al.emp_id
      ORDER  BY al.timestamp DESC
      LIMIT  20
    `);
    return res.json(result.rows);
  } catch (err) { return res.status(500).json({ error: 'Failed to fetch recent activity.' }); }
});

module.exports = router;
