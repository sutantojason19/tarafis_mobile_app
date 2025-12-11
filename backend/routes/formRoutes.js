// routes/formRoutes.js
/**
 * Routes for handling form-related endpoints.
 *
 * - Handles file uploads (multer) for different form types.
 * - Exposes CRUD-ish endpoints:
 *    POST  /customer           -> Sales Visit (faskes) (single file)
 *    POST  /non-faskes        -> Sales Visit (non-faskes) (single file)
 *    POST  /tech-activity     -> Technician activity (multiple named files)
 *    POST  /tech-service      -> Technician service (multiple named files)
 *    GET   /all               -> Retrieve all forms for a user (sales, activities, services)
 *    GET   /hospital/:region  -> List hospitals in a region
 *    DELETE/:form_type/:id    -> Delete a form by type and id (requires user_id query)
 *    PATCH  /:form_type/:id   -> Update a form by type and id (requires user_id query)
 *
 * Notes:
 * - Multer saves files to `uploads/` (disk). Controllers expect `req.file` or `req.files`.
 * - Database driver differences (mysql2 vs mariadb) are handled by normalizing results.
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('../db');

const {
  createSalesVisitCustomer,
  createSalesVisitNonFaskes,
  createTechnicianActivity,
  createTechnicianService,
} = require('../controllers/formController');

const router = express.Router();

/* ---------------------------
 * Helpers / Config
 * --------------------------- */

/**
 * Map supported form_type values (from client) to actual DB table names.
 * Only values included here are allowed for delete/update operations.
 */
const TABLE_MAP = {
  // sales visits (customer & non-faskes)
  sales_visits: 'sales_visits',
  sales: 'sales_visits',
  faskes: 'sales_visits',
  'non-faskes': 'sales_visits',

  // technician activities
  technician_activities: 'technician_activities',
  activities: 'technician_activities',
  tech_activity: 'technician_activities',
  technician_activity: 'technician_activities',

  // technician services
  technician_services: 'technician_services',
  services: 'technician_services',
  tech_service: 'technician_services',
  technician_service: 'technician_services',
};

/**
 * Normalize DB query result shapes.
 *
 * Different drivers return results differently:
 * - mysql2: [rows, fields]
 * - mariadb: rows (array)
 * - some drivers may return a single object
 *
 * This helper returns an array of rows (possibly empty).
 */
function normalizeRows(result) {
  if (!result) return [];
  if (Array.isArray(result)) {
    // mysql2 returns [rows, fields] or mariadb returns rows directly (array)
    if (result.length > 0 && Array.isArray(result[0])) {
      return result[0];
    }
    return result;
  }
  // single object -> wrap it
  if (typeof result === 'object') {
    return [result];
  }
  return [];
}

/* ---------------------------
 * Multer (file upload) config
 * --------------------------- */

// Store uploads under project/uploads with unique filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // use an absolute path (safer) relative to this file
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    // create a collision-resistant filename: timestamp-random.ext
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

/* ---------------------------
 * Routes
 * --------------------------- */

/**
 * Sales Visit (Customer / Faskes)
 * Expect single file field: 'dokumentasi_kunjungan' (optional)
 */
router.post('/customer', upload.single('dokumentasi_kunjungan'), createSalesVisitCustomer);

/**
 * Sales Visit (Non-Faskes)
 * Expect single file field: 'dokumentasi_kunjungan' (optional)
 */
router.post('/non-faskes', upload.single('dokumentasi_kunjungan'), createSalesVisitNonFaskes);

/**
 * Technician Activity
 * Expect multiple named image fields (each maxCount:1):
 *  - selfie_foto_kegiatan
 *  - foto_ba_daftar_hadir
 */
router.post(
  '/tech-activity',
  upload.fields([
    { name: 'selfie_foto_kegiatan', maxCount: 1 },
    { name: 'foto_ba_daftar_hadir', maxCount: 1 },
  ]),
  createTechnicianActivity
);

/**
 * Technician Service
 * Expect multiple image named fields:
 *  - bukti_koreksi
 *  - tindakan_koreksi_img
 *  - foto_alat_sebelum_service
 */
router.post(
  '/tech-service',
  upload.fields([
    { name: 'bukti_koreksi', maxCount: 1 },
    { name: 'tindakan_koreksi_img', maxCount: 1 },
    { name: 'foto_alat_sebelum_service', maxCount: 1 },
  ]),
  createTechnicianService
);

/* ---------------------------------------------------------------------------
 * GET /all
 * Return all forms for a given user (sales_visits, technician_activities, technician_services)
 * Query param: user_id
 * ------------------------------------------------------------------------- */
router.get('/all', async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) return res.status(400).json({ message: 'user_id is required' });

  let conn;
  try {
    conn = await pool.getConnection();

    // Run all three queries in parallel for performance
    const salesVisitsPromise = conn.query('SELECT * FROM sales_visits WHERE user_id = ?', [user_id]);
    const techActivitiesPromise = conn.query('SELECT * FROM technician_activities WHERE user_id = ?', [user_id]);
    const techServicesPromise = conn.query('SELECT * FROM technician_services WHERE user_id = ?', [user_id]);

    const [salesVisitsRaw, techActivitiesRaw, techServicesRaw] = await Promise.all([
      salesVisitsPromise,
      techActivitiesPromise,
      techServicesPromise,
    ]);

    // Normalize different driver response shapes to plain arrays
    const salesVisits = normalizeRows(salesVisitsRaw);
    const technicianActivities = normalizeRows(techActivitiesRaw);
    const technicianServices = normalizeRows(techServicesRaw);

    return res.json({ sales_visits: salesVisits, technician_activities: technicianActivities, technician_services: technicianServices });
  } catch (err) {
    console.error('Error fetching forms:', err);
    return res.status(500).json({ message: 'Server error fetching forms' });
  } finally {
    if (conn) conn.release();
  }
});

/* ---------------------------------------------------------------------------
 * GET /hospital/:region
 * Returns hospitals for a given region (case-insensitive match)
 * ------------------------------------------------------------------------- */
router.get('/hospital/:region', async (req, res) => {
  const region = (req.params.region || '').trim();
  if (!region) return res.status(400).json({ message: 'region is required' });

  let conn;
  try {
    conn = await pool.getConnection();

    const sql = `
      SELECT hospital_id, region, name, street, latitude, longitude
      FROM hospitals
      WHERE LOWER(region) = LOWER(?)
    `;

    const raw = await conn.query(sql, [region]);
    const rows = normalizeRows(raw);

    return res.json({ retrieved_hospitals: rows });
  } catch (err) {
    console.error('[hospital] ERROR', err?.stack || err);
    return res.status(500).json({ message: 'Server error fetching hospitals' });
  } finally {
    if (conn) {
      try { conn.release(); } catch (e) { /* ignore release errors */ }
    }
  }
});

/* ---------------------------------------------------------------------------
 * DELETE /:form_type/:id
 * Delete a form row from one of whitelisted tables.
 * Query param: user_id (required)
 * ------------------------------------------------------------------------- */
router.delete('/:form_type/:id', async (req, res) => {
  const { form_type, id } = req.params;
  const { user_id } = req.query;

  // Basic validation
  if (!user_id) return res.status(400).json({ message: 'user_id is required' });
  if (!id) return res.status(400).json({ message: 'form id is required' });
  if (!form_type) return res.status(400).json({ message: 'form type is required' });

  const table = TABLE_MAP[form_type];
  if (!table) return res.status(400).json({ message: `Unsupported form_type: ${form_type}` });

  let conn;
  try {
    conn = await pool.getConnection();

    // Use parameterized query to avoid injection and respect user ownership
    const result = await conn.query(`DELETE FROM \`${table}\` WHERE id = ? AND user_id = ?`, [id, user_id]);

    // Different drivers return different shapes; try to read affected rows
    const affectedRows = Number(result?.affectedRows ?? result?.affected_rows ?? result?.affected ?? result?.changedRows ?? 0);

    if (affectedRows === 0) {
      return res.status(404).json({ message: 'Form not found or you do not have permission to delete it.' });
    }

    return res.json({ message: 'Form deleted successfully.', affectedRows });
  } catch (err) {
    console.error('Error deleting form:', err);
    return res.status(500).json({ message: 'Server error deleting form', error: err.message });
  } finally {
    if (conn) {
      try { conn.release(); } catch (e) { /* ignore */ }
    }
  }
});

/* ---------------------------------------------------------------------------
 * PATCH /:form_type/:id
 * Partial update for a form row. Client passes only fields to update in body.
 * Query param: user_id (required) used to ensure ownership.
 * ------------------------------------------------------------------------- */
router.patch('/:form_type/:id', async (req, res) => {
  const { form_type, id } = req.params;
  const { user_id } = req.query;
  const updatesRaw = req.body;

  // Validation
  if (!user_id) return res.status(400).json({ message: 'user_id is required' });
  if (!id) return res.status(400).json({ message: 'form id is required' });
  if (!form_type) return res.status(400).json({ message: 'form_type is required' });

  const table = TABLE_MAP[form_type];
  if (!table) return res.status(400).json({ message: `Unsupported form_type: ${form_type}` });

  if (!updatesRaw || typeof updatesRaw !== 'object' || Object.keys(updatesRaw).length === 0) {
    return res.status(400).json({ message: 'No fields provided to update' });
  }

  // Protect columns that MUST NOT be updated by the client
  const protectedCols = new Set(['id', 'user_id', 'form_id', 'form_type', 'created_at', 'updated_at']);

  // Build updates after filtering protected columns and undefined values
  const updates = Object.entries(updatesRaw)
    .filter(([k]) => !!k && !protectedCols.has(k))
    .reduce((acc, [k, v]) => {
      acc[k] = v;
      return acc;
    }, {});

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No updatable fields provided (all fields are protected or invalid).' });
  }

  // Build parameterized SET clause
  const setClauses = [];
  const values = [];
  for (const [key, value] of Object.entries(updates)) {
    setClauses.push(`\`${key}\` = ?`);
    values.push(value);
  }

  // WHERE params: id then user_id to ensure ownership
  values.push(id);
  values.push(user_id);

  const sql = `UPDATE \`${table}\` SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ?`;

  let conn;
  try {
    conn = await pool.getConnection();
    const raw = await conn.query(sql, values);

    // Normalize response object to find affected rows across drivers
    let result = Array.isArray(raw) ? raw[0] : raw;
    const affectedRows = Number(result?.affectedRows ?? result?.affected_rows ?? result?.affected ?? result?.changedRows ?? 0);

    if (affectedRows === 0) {
      return res.status(404).json({ message: 'Form not found or you do not have permission to update this item.', affectedRows: 0 });
    }

    return res.json({ message: 'Form updated successfully.', affectedRows });
  } catch (err) {
    console.error('Error updating form:', err);
    return res.status(500).json({ message: 'Server error updating form', error: err.message });
  } finally {
    if (conn) {
      try { conn.release(); } catch (e) { /* ignore */ }
    }
  }
});

module.exports = router;
