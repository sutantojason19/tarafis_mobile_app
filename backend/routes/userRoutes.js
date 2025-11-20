// routes/auth.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'replace_this_with_a_strong_secret';
const JWT_EXPIRES_IN = '7d'; // adjust as needed

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  let conn;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    conn = await pool.getConnection();

    // request user data
    const rows = await conn.query(
      'SELECT id, name, position, email, password FROM users WHERE email = ?',
      [email]
    );

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: 'User not found' });
    }

    const user = rows[0];

    // 👉 Plaintext compare (no bcrypt)
    if (password !== user.password) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // Build token payload
    const payload = { user_id: user.id, email: user.email };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Successful login response
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
      try { conn.release(); } 
      catch (e) { console.warn('Failed to release conn', e); }
    }
  }
});

module.exports = router;
