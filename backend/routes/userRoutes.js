/**
 * Authentication routes
 *
 * POST /login
 *  - Accepts { email, password } in the request body (JSON or form-encoded)
 *  - Validates credentials against users table
 *  - Returns a signed JWT token and basic user info on success
 *
 * Security notes:
 *  - This route supports bcrypt hashes if `bcryptjs` is installed.
 *  - If passwords are stored in plaintext (bad practice), the code will perform
 *    a plaintext compare but will log a security warning. Migrate to hashed
 *    passwords (bcrypt) as soon as possible.
 *
 * Environment:
 *  - JWT_SECRET: secret string used to sign tokens (required for production).
 *  - JWT_EXPIRES_IN: token expiry (default: '7d').
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

// Read JWT config from env; do not commit secrets to repo
const JWT_SECRET = process.env.JWT_SECRET || 'replace_this_with_a_strong_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Normalize the DB driver result into an array of rows.
 * Supports mysql2 (returns [rows, fields]) and mariadb (returns rows).
 *
 * @param {*} result - the raw result returned by the DB driver
 * @returns {Array} rows
 */
function normalizeRows(result) {
  if (!result) return [];
  if (Array.isArray(result)) {
    // mysql2 returns [rows, fields], mariadb returns rows directly (array)
    if (result.length > 0 && Array.isArray(result[0])) {
      return result[0];
    }
    return result;
  }
  if (typeof result === 'object') return [result];
  return [];
}

/**
 * Compare a candidate password with the stored password.
 * - If bcryptjs is available and the stored password looks like a bcrypt hash,
 *   use bcrypt.compare.
 * - Otherwise, fall back to plaintext equality (NOT recommended for production).
 *
 * This helper loads bcryptjs dynamically (optional dependency) to avoid crashing
 * if it's not installed. If you are in control of the project, install bcryptjs
 * and store hashed passwords in the DB.
 *
 * @param {string} candidatePassword - password provided by user
 * @param {string} storedPassword - password stored in DB (hash or plaintext)
 * @returns {Promise<boolean>}
 */
async function verifyPassword(candidatePassword, storedPassword) {
  // Quick checks
  if (!candidatePassword || !storedPassword) return false;

  // Detect bcrypt hash (starts with $2b$ or $2a$ or similar)
  const looksLikeBcrypt = typeof storedPassword === 'string' && storedPassword.startsWith('$2');

  if (looksLikeBcrypt) {
    try {
      // Dynamically require bcryptjs only if present
      const bcrypt = require('bcryptjs');
      return await bcrypt.compare(candidatePassword, storedPassword);
    } catch (e) {
      // bcrypt not available — fallback to false (deny)
      console.warn('bcryptjs not found. Install bcryptjs and store hashed passwords for better security.');
      return false;
    }
  }

  // Fallback: plaintext comparison (legacy; insecure)
  console.warn('WARNING: plaintext password comparison in use. Migrate to hashed passwords (bcrypt).');
  return candidatePassword === storedPassword;
}

/**
 * POST /login
 * Authenticate user and return JWT token + basic user info.
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  let conn;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  try {
    conn = await pool.getConnection();

    // Query user by email. Select only required fields.
    const raw = await conn.query('SELECT id, name, position, email, password FROM users WHERE email = ?', [email]);
    const rows = normalizeRows(raw);

    if (!rows || rows.length === 0) {
      // Do not reveal whether email exists in production (to avoid user enumeration).
      return res.status(400).json({ message: 'User not found' });
    }

    const user = rows[0];

    // Verify password (supports bcrypt if available)
    const passwordOk = await verifyPassword(password, user.password);
    if (!passwordOk) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // Build minimal token payload. Keep it small to avoid leaking sensitive data.
    const payload = { user_id: user.id, email: user.email };

    // Sign JWT
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Return token and basic user info
    return res.json({
      message: 'Login successful',
      token,
      user: {
        user_id: user.id,
        name: user.name,
        position: user.position,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error' });
  } finally {
    if (conn) {
      try { conn.release(); } catch (e) { console.warn('Failed to release DB connection', e); }
    }
  }
});

module.exports = router;
