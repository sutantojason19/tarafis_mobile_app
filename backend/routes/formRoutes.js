// routes/formRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('../db');

const {
  createSalesVisitCustomer,
  createSalesVisitNonFaskes,
  createTechnicianActivity,
  createTechnicianService
} = require('../controllers/formController');

const router = express.Router();

// File upload config (multer)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads')); // safer absolute path
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// ROUTES
// Sales Visit - Customer
router.post(
  '/customer',
  upload.single('dokumentasi_kunjungan'),
  createSalesVisitCustomer
);

// Sales Visit - Non Faskes
router.post(
  '/non-faskes',
  upload.single('dokumentasi_kunjungan'),
  createSalesVisitNonFaskes
);

// Technician Activity - with 2 file fields
router.post(
  '/tech-activity',
  upload.fields([
    { name: 'selfie_foto_kegiatan', maxCount: 1 },
    { name: 'foto_ba_daftar_hadir', maxCount: 1 }
  ]),
  createTechnicianActivity
);

// Technician Service - with 2 file fields
router.post(
  '/tech-service',
  upload.fields([
    { name: 'bukti_koreksi', maxCount: 1 },
    { name: 'tindakan_koreksi_img', maxCount: 1 },
    { name: 'foto_alat_sebelum_service', maxCount: 1 }
  ]),
  createTechnicianService
);

//get all form data from routes 
router.get('/all', async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ message: 'user_id is required' });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    // MariaDB returns rows directly -> no need for double brackets
    const salesVisitsPromise = conn.query(
      'SELECT * FROM sales_visits WHERE user_id = ?',
      [user_id]
    );

    const techActivitiesPromise = conn.query(
      'SELECT * FROM technician_activities WHERE user_id = ?',
      [user_id]
    );

    const techServicesPromise = conn.query(
      'SELECT * FROM technician_services WHERE user_id = ?',
      [user_id]
    );

    const [
      salesVisits,
      techActivities,
      techServices
    ] = await Promise.all([
      salesVisitsPromise,
      techActivitiesPromise,
      techServicesPromise
    ]);

    res.json({
      sales_visits: Array.isArray(salesVisits) ? salesVisits : [],
      technician_activities: Array.isArray(techActivities) ? techActivities : [],
      technician_services: Array.isArray(techServices) ? techServices : [],
    });

  } catch (err) {
    console.error('Error fetching forms:', err);
    res.status(500).json({ message: 'Server error fetching forms' });
  } finally {
    if (conn) conn.release();
  }
});



// get hospitals in a given region
router.get('/hospital/:region', async (req, res) => {
  const region = (req.params.region || '').trim();
  if (!region) {
    return res.status(400).json({ message: 'region is required' });
  }
  let conn;
  try {
    conn = await pool.getConnection();

    const sql = `
      SELECT hospital_id, region, name, street, latitude, longitude
      FROM hospitals
      WHERE LOWER(region) = LOWER(?)
    `;

    const result = await conn.query(sql, [region]);

    // Normalize result into an array of rows
    let rows;
    if (Array.isArray(result)) {
      if (result.length > 0 && Array.isArray(result[0])) {
        rows = result[0];       // mysql2 shape: [rows, fields]
      } else {
        rows = result;          // mariadb shape: rows array
      }
    } else if (result && typeof result === 'object') {
      rows = [result];          // single object → wrap in array
    } else {
      rows = [];
    }

    return res.json({ retrieved_hospitals: rows });

  } catch (err) {
    console.error('[hospital] ERROR', err?.stack || err);
    return res.status(500).json({ message: 'Server error fetching hospitals' });
  } finally {
    if (conn) {
      try { conn.release(); } catch (_) {}
    }
  }
});


//router delete 
// DELETE /api/forms/:form_type/:id?user_id=123
router.delete('/:form_type/:id', async (req, res) => {
  const { form_type, id } = req.params;
  const { user_id } = req.query;

  // Basic validation
  if (!user_id) {
    return res.status(400).json({ message: 'user_id is required' });
  }
  if (!id) {
    return res.status(400).json({ message: 'form id is required' });
  }
  if (!form_type) {
    return res.status(400).json({ message: 'form type is required' });
  }

  // Whitelist allowed form types -> map to actual table names
  const tableMap = {
    sales_visits: 'sales_visits',
    sales: 'sales_visits',
    faskes: 'sales_visits',
    'non-faskes': 'sales_visits',   // <-- FIXED

    technician_activities: 'technician_activities',
    activities: 'technician_activities',
    tech_activity: 'technician_activities',
    technician_activity: 'technician_activities',

    technician_services: 'technician_services',
    services: 'technician_services',
    tech_service: 'technician_services',
    technician_service: 'technician_services',
  };


  const table = tableMap[form_type];
  if (!table) {
    return res.status(400).json({ message: `Unsupported form_type: ${form_type}` });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    // Your driver returns a single result object here
    const result = await conn.query(
      `DELETE FROM \`${table}\` WHERE id = ? AND user_id = ?`,
      [id, user_id]
    );

    // Expecting something like: { affectedRows: 1, ... }
    if (!result || typeof result.affectedRows === 'undefined') {
      console.error('Unexpected delete result shape:', result);
      return res
        .status(500)
        .json({ message: 'Unexpected DB response while deleting form' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Form not found or you do not have permission to delete it.',
      });
    }

    return res.json({
      message: 'Form deleted successfully.',
      affectedRows: result.affectedRows,
    });
  } catch (err) {
    console.error('Error deleting form:', err);
    return res.status(500).json({
      message: 'Server error deleting form',
      error: err.message,
    });
  } finally {
    if (conn) {
      try {
        conn.release();
      } catch (e) {
        console.warn('Failed to release conn', e);
      }
    }
  }
});


// UPDATE form by type + id
router.patch('/:form_type/:id', async (req, res) => {
  const { form_type, id } = req.params;
  const { user_id } = req.query;      // You might replace with JWT user later
  const updates = req.body;           // Fields to update

  if (!user_id) {
    return res.status(400).json({ message: 'user_id is required' });
  }

  if (!id) {
    return res.status(400).json({ message: 'form id is required' });
  }

  if (!form_type) {
    return res.status(400).json({ message: 'form_type is required' });
  }

  // Whitelist allowed form types → map to real tables
  const tableMap = {
    sales_visits: 'sales_visits',
    sales: 'sales_visits',
    technician_activities: 'technician_activities',
    tech_activity: 'technician_activities',
    technician_services: 'technician_services',
    tech_service: 'technician_services',
  };

  const table = tableMap[form_type];
  if (!table) {
    return res.status(400).json({ message: `Unsupported form_type: ${form_type}` });
  }

  // Ensure there are fields to update
  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No fields provided to update' });
  }

  // Build dynamic SET clause (column1=?, column2=?, ...)
  const setClauses = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    setClauses.push(`\`${key}\` = ?`);
    values.push(value);
  }

  values.push(id);
  values.push(user_id);

  const sql = `
    UPDATE \`${table}\`
    SET ${setClauses.join(', ')}
    WHERE id = ? AND user_id = ?
  `;

  let conn;
  try {
    conn = await pool.getConnection();
    const [result] = await conn.query(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Form not found or you do not have permission to update this item.'
      });
    }

    res.json({ message: 'Form updated successfully.' });

  } catch (err) {
    console.error('Error updating form:', err);
    res.status(500).json({ message: 'Server error updating form', error: err.message });

  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
