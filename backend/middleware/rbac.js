// middleware/rbac.js – Role-Based Access Control middleware + audit helper
'use strict';

const { query } = require('../db/postgres');

// ─── Permission matrix ────────────────────────────────────────────────────────
// Each entry maps a role to the set of route tags it may access.
const PERMISSIONS = {
  ProcurementOfficer: [
    'suppliers:read','suppliers:write',
    'parts:read',
    'orders:read','orders:write',
    'shipments:read',
    'dashboard:read'
  ],
  QualityInspector: [
    'suppliers:read','parts:read',
    'orders:read','order_items:read',
    'qcreports:read','qcreports:write','qcreports:approve',
    'certifications:read','certifications:approve',
    'dashboard:read'
  ],
  SupplyChainManager: [
    'suppliers:read','parts:read',
    'orders:read','shipments:read','order_items:read',
    'qcreports:read','certifications:read',
    'dashboard:read','kpis:read'
  ],
  EquipmentEngineer: [
    'equipment:read','equipment:write',
    'iot:read',
    'dashboard:read'
  ],
  Auditor: [
    'certifications:read','audit:read',
    'qcreports:read','suppliers:read',
    'dashboard:read'
  ]
};

/**
 * Returns Express middleware that checks whether the authenticated user
 * holds at least one role that includes `requiredPermission`.
 *
 * @param {string} requiredPermission  e.g. 'orders:write'
 */
function requirePermission(requiredPermission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const allowed = req.user.roles.some(
      (role) => (PERMISSIONS[role] || []).includes(requiredPermission)
    );

    if (!allowed) {
      return res.status(403).json({
        error: `Forbidden: permission '${requiredPermission}' is required.`
      });
    }

    next();
  };
}

// ─── Audit log writer ─────────────────────────────────────────────────────────

/**
 * Append an entry to the PostgreSQL audit_log table.
 * Errors are swallowed so a logging failure never breaks a request.
 *
 * @param {number} empId
 * @param {string} actionType   'view'|'create'|'update'|'delete'|'approve'
 * @param {string} entityType   table or collection name
 * @param {string} entityId     record identifier
 * @param {object} [details]    optional JSONB context
 */
async function writeAuditLog(empId, actionType, entityType, entityId, details = {}) {
  try {
    await query(
      `INSERT INTO audit_log (emp_id, action_type, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [empId, actionType, entityType, String(entityId), JSON.stringify(details)]
    );
  } catch (err) {
    console.error('[AuditLog] Failed to write:', err.message);
  }
}

module.exports = { requirePermission, writeAuditLog };
