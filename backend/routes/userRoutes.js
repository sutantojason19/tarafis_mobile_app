const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM users WHERE email = ?', [email]);
    conn.release();

    if (rows.length === 0) {
      return res.status(400).json({ message: 'User not found' });
    }

    const user = rows[0];
    // const isMatch = await bcrypt.compare(password, user.password);

    if (password !== user.password) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    res.json({
      message: 'Login successful',
      user: {
        name: user.name,
        position: user.position,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
