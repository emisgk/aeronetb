// middleware/auth.js – JWT verification middleware
'use strict';

const jwt = require('jsonwebtoken');

/**
 * Verifies the Bearer token in the Authorization header.
 * Attaches { empId, email, roles, accessLevel } to req.user on success.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required: missing or malformed token.' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.user = {
      empId:       payload.empId,
      email:       payload.email,
      roles:       payload.roles  || [],   // array of role names
      accessLevel: payload.accessLevel
    };
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token expired.' : 'Invalid token.';
    return res.status(401).json({ error: message });
  }
}

module.exports = { authenticate };
