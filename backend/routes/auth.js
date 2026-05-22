// routes/auth.js – Login endpoint: validates credentials and returns a JWT
'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query }  = require('../db/postgres');
const { writeAuditLog } = require('../middleware/rbac');
const router  = express.Router();

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { token, user: { empId, fullName, email, roles, accessLevel } }
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  try {
    // Fetch employee + their role names in one query
    const result = await query(
      `SELECT e.emp_id, e.full_name, e.email, e.password_hash, e.access_level, e.is_active,
              COALESCE(
                array_agg(r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '{}'
              ) AS roles
       FROM   employee e
       LEFT JOIN employee_role er ON e.emp_id = er.emp_id
       LEFT JOIN role r           ON er.role_id = r.role_id
       WHERE  e.email = $1
       GROUP  BY e.emp_id`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const emp = result.rows[0];

    if (!emp.is_active) {
      return res.status(403).json({ error: 'Account is disabled. Contact your administrator.' });
    }

    const valid = await bcrypt.compare(password, emp.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const payload = {
      empId:       emp.emp_id,
      email:       emp.email,
      roles:       emp.roles,
      accessLevel: emp.access_level
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev_secret', {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h'
    });

    await writeAuditLog(emp.emp_id, 'view', 'auth', 'login', { action: 'user_login' });

    return res.json({
      token,
      user: {
        empId:       emp.emp_id,
        fullName:    emp.full_name,
        email:       emp.email,
        roles:       emp.roles,
        accessLevel: emp.access_level
      }
    });
  } catch (err) {
    console.error('[/auth/login]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
