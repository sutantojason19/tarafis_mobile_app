/**
 * Controller for handling various form submissions:
 * - Technician service (tech-service)
 * - Technician activity (tech-activity)
 * - Sales visit (faskes / non-faskes)
 *
 * Responsibilities:
 * - Validate minimal required fields
 * - Handle uploaded files (via multer)
 * - Ensure `products` table contains the product (by serial_number)
 * - Insert appropriate records in technician_services, technician_activities, sales_visits
 *
 * Notes:
 * - All DB operations use transactions where multiple queries must be atomic.
 * - Files are expected to be available on `req.file` or `req.files` depending on multer config:
 *    - single file: req.file.filename
 *    - multiple fields: req.files['fieldName'][0].filename
 */

const pool = require('../db');

/* ----------------------
 * Helper utilities
 * ---------------------- */

/**
 * Safely get the filename for a multer file field.
 * Accepts both req.file and req.files structures.
 *
 * @param {Object} files - req.files or req.file
 * @param {string} field - field name for files object
 * @returns {string|null} filename or null if not present
 */
function getUploadedFilename(files, field) {
  if (!files) return null;
  // supports both req.file (single) and req.files (multiple fields)
  if (files[field]) {
    // req.files[field] could be array
    const val = Array.isArray(files[field]) ? files[field][0] : files[field];
    return val?.filename || null;
  }
  // also allow req.file (single) where field name is not used
  if (files?.filename && field === 'file') {
    return files.filename;
  }
  return null;
}

/**
 * Ensure product exists in `products` table by serial_number.
 * If found return existing id, otherwise insert and return new id.
 *
 * Uses the provided connection (so transactions can be honoured).
 *
 * @param {Object} conn - DB connection
 * @param {string} serial_number
 * @param {string} nama_produk
 * @param {string} tipe_produk
 * @param {string} merk_produk
 * @returns {Promise<number>} product_id
 */
async function getOrCreateProduct(conn, serial_number, nama_produk, tipe_produk, merk_produk) {
  const rows = await conn.query(
    'SELECT id FROM products WHERE serial_number = ?',
    [serial_number]
  );

  if (rows && rows.length > 0) {
    return rows[0].id;
  }

  const result = await conn.query(
    `INSERT INTO products (nama_produk, tipe_produk, serial_number, merk_produk, created_at, updated_at)
     VALUES (?, ?, ?, ?, NOW(), NOW())`,
    [nama_produk, tipe_produk, serial_number, merk_produk]
  );

  return result.insertId;
}

/* ----------------------
 * Controller actions
 * ---------------------- */

/**
 * Create a technician service record.
 *
 * Expected request body fields (FormData / multipart):
 * - user_id, nama_customer, kontak_customer, nama_faskes, tanggal_pengambilan,
 * - nama_produk, tipe_produk, serial_number, kuantitas_unit, merk_produk,
 * - deskripsi_masalah, estimasi_penyelesaian, penyebab_masalah, koreksi, tindakan_koreksi_capa
 *
 * Optional upload fields (multer):
 * - bukti_koreksi, tindakan_koreksi_img, foto_alat_sebelum_service
 *
 * Response:
 * - 200 JSON success, or appropriate error code/message
 */
async function createTechnicianService(req, res) {
  const {
    user_id,
    nama_customer,
    kontak_customer,
    nama_faskes,
    tanggal_pengambilan,
    nama_produk,
    tipe_produk,
    serial_number,
    kuantitas_unit,
    merk_produk,
    deskripsi_masalah,
    estimasi_penyelesaian,
    penyebab_masalah,
    koreksi,
    tindakan_koreksi_capa,
  } = req.body;

    const formStatus =
      req.body.status === 'submitted' ? 'submitted' : 'draft';
    
    // Backend validation ONLY for submitted forms
    if (formStatus === 'submitted') {
      if (
        !nama_customer ||
        !user_id ||
        !nama_faskes 
      ) {
        return res.status(400).json({
          message: 'Missing required fields for submitted form',
        });
      }
    }

  // Minimal validation
  if (!serial_number && formStatus === 'submitted') {
    return res.status(400).json({ message: 'serial_number is required' });
  }

  // Extract filenames from uploaded files
  const bukti_koreksi = getUploadedFilename(req.files, 'bukti_koreksi');
  const tindakan_koreksi_img = getUploadedFilename(req.files, 'tindakan_koreksi_img');
  const foto_alat_sebelum_service = getUploadedFilename(req.files, 'foto_alat_sebelum_service');

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const product_id = await getOrCreateProduct(conn, serial_number, nama_produk, tipe_produk, merk_produk);

    const insertSql = `
      INSERT INTO technician_services 
        (user_id, product_id, nama_customer, kontak_customer, nama_faskes, tanggal_pengambilan,
         deskripsi_masalah, estimasi_penyelesaian, foto_alat_sebelum_service,
         penyebab_masalah, koreksi, tindakan_koreksi_capa,
         bukti_koreksi, tindakan_koreksi_img, kuantitas_unit, created_at, updated_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)
    `;

    const params = [
      user_id,
      product_id,
      nama_customer,
      kontak_customer,
      nama_faskes,
      tanggal_pengambilan,
      deskripsi_masalah,
      estimasi_penyelesaian,
      foto_alat_sebelum_service,
      penyebab_masalah,
      koreksi,
      tindakan_koreksi_capa,
      bukti_koreksi,
      tindakan_koreksi_img,
      kuantitas_unit,
      formStatus
    ];

    await conn.query(insertSql, params);
    await conn.commit();

    return res.json({ message: 'Technician Service saved successfully.' });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('createTechnicianService error:', err);
    return res.status(500).json({ message: 'Server error saving technician service', error: err.message });
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Create a technician activity record.
 *
 * Expected request body fields:
 * - user_id, tanggal_aktivitas, nama_teknisi, nama_lokasi, alamat_lokasi,
 *   teknisi_lain, nama_produk, tipe_produk, serial_number, kuantitas_unit,
 *   merk_produk, nomor_berita_acara, tujuan_kunjungan, notes
 *
 * Optional upload fields:
 * - selfie_foto_kegiatan, foto_ba_daftar_hadir
 */
async function createTechnicianActivity(req, res) {
  const {
    user_id,
    tanggal_aktivitas,
    nama_teknisi,
    nama_lokasi,
    alamat_lokasi,
    teknisi_lain,
    nama_produk,
    tipe_produk,
    serial_number,
    kuantitas_unit,
    merk_produk,
    nomor_berita_acara,
    tujuan_kunjungan,
    notes
  } = req.body;

  const formStatus = req.body.status === 'submitted' ? 'submitted' : 'draft';


   // Backend validation ONLY for submitted forms
    if (formStatus === 'submitted') {
      if (
        !nama_teknisi ||
        !nama_lokasi ||
        !alamat_lokasi 
      ) {
        return res.status(400).json({
          message: 'Missing required fields for submitted form',
        });
      }
    }

  if (!serial_number && formStatus === 'submitted') {
    return res.status(400).json({ message: 'serial_number is required' });
  }

  const selfie_foto_kegiatan = getUploadedFilename(req.files, 'selfie_foto_kegiatan');
  const foto_ba_daftar_hadir = getUploadedFilename(req.files, 'foto_ba_daftar_hadir');

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const product_id = await getOrCreateProduct(conn, serial_number, nama_produk, tipe_produk, merk_produk);

    const insertSql = `
      INSERT INTO technician_activities
        (user_id, product_id, tanggal_aktivitas, nama_teknisi, nama_lokasi, alamat_lokasi,
         teknisi_lain, nomor_berita_acara, tujuan_kunjungan, selfie_foto_kegiatan,
         foto_ba_daftar_hadir, notes, kuantitas_unit, created_at, updated_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)
    `;

    const params = [
      user_id,
      product_id,
      tanggal_aktivitas,
      nama_teknisi,
      nama_lokasi,
      alamat_lokasi,
      teknisi_lain,
      nomor_berita_acara,
      tujuan_kunjungan,
      selfie_foto_kegiatan,
      foto_ba_daftar_hadir,
      notes,
      kuantitas_unit,
      formStatus
    ];

    await conn.query(insertSql, params);
    await conn.commit();

    return res.json({ message: 'Technician Activity saved successfully.' });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('createTechnicianActivity error:', err);
    return res.status(500).json({ message: 'Server error saving technician activity', error: err.message });
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Create a sales visit record for a healthcare facility (faskes).
 *
 * Request body fields:
 * - user_id, nama_sales, region, nama_lokasi, alamat_lokasi, koordinat_lokasi,
 *   tujuan_kunjungan, note_kunjungan, nama_user, jabatan_user, status_kunjungan
 *
 * Uploads (optional):
 * - dokumentasi_kunjungan (single file or files.dokumentasi_kunjungan)
 */
async function createSalesVisitCustomer(req, res) {
  try {
    const {
      user_id,
      nama_sales,
      region,
      nama_lokasi,
      alamat_lokasi,
      koordinat_lokasi,
      tujuan_kunjungan,
      note_kunjungan,
      nama_user,
      jabatan_user,
      status_kunjungan,
    } = req.body;

    // Normalize form lifecycle status (DO NOT trust client)
    const formStatus =
      req.body.status === 'submitted' ? 'submitted' : 'draft';

    // Backend validation ONLY for submitted forms
    if (formStatus === 'submitted') {
      if (
        !nama_sales ||
        !region ||
        !nama_lokasi ||
        !alamat_lokasi ||
        !koordinat_lokasi
      ) {
        return res.status(400).json({
          message: 'Missing required fields for submitted form',
        });
      }
    }

    // Handle uploaded file
    let dokumentasi_kunjungan = null;
    if (req.file?.filename) {
      dokumentasi_kunjungan = req.file.filename;
    } else {
      dokumentasi_kunjungan = getUploadedFilename(
        req.files,
        'dokumentasi_kunjungan'
      );
    }

    const sql = `
      INSERT INTO sales_visits
      (
        user_id,
        form_type,
        nama_sales,
        region,
        nama_lokasi,
        alamat_lokasi,
        koordinat_lokasi,
        tujuan_kunjungan,
        dokumentasi_kunjungan,
        note_kunjungan,
        nama_user,
        jabatan_user,
        status_kunjungan,
        status
      )
      VALUES (?, 'faskes', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      user_id,
      nama_sales,
      region,
      nama_lokasi,
      alamat_lokasi,
      koordinat_lokasi,
      tujuan_kunjungan,
      dokumentasi_kunjungan,
      note_kunjungan,
      nama_user,
      jabatan_user,
      status_kunjungan,
      formStatus, // normalized value only
    ];

    const conn = await pool.getConnection();
    await conn.query(sql, params);
    conn.release();

    return res.json({
      message:
        formStatus === 'draft'
          ? 'Draft saved successfully.'
          : 'Sales Visit (Customer) submitted successfully.',
    });
  } catch (err) {
    console.error('createSalesVisitCustomer error:', err);
    return res.status(500).json({
      message: 'Server error saving sales visit (customer)',
      error: err.message,
    });
  }
}


/**
 * Create a sales visit record for non-healthcare customers (non-faskes).
 *
 * Expected fields:
 * - user_id, nama_sales, region, nama_lokasi, alamat_lokasi, koordinat_lokasi, tujuan_kunjungan, note_kunjungan
 *
 * File upload:
 * - dokumentasi_kunjungan (single file)
 */
async function createSalesVisitNonFaskes(req, res) {
  const {
    user_id,
    nama_sales,
    region,
    nama_lokasi,
    alamat_lokasi,
    koordinat_lokasi,
    tujuan_kunjungan,
    note_kunjungan,
  } = req.body;

  const dokumentasi_kunjungan = req.file ? req.file.filename : null;
  const formStatus = req.body.status === 'submitted' ? 'submitted' : 'draft';

  if (formStatus === 'submitted') {
      if (
        !nama_sales ||
        !region ||
        !nama_lokasi ||
        !alamat_lokasi ||
        !koordinat_lokasi
      ) {
        return res.status(400).json({
          message: 'Missing required fields for submitted form',
        });
      }
  }


  try {
    const conn = await pool.getConnection();

    const sql = `
      INSERT INTO sales_visits
      (user_id, form_type, nama_sales, region, nama_lokasi, alamat_lokasi, koordinat_lokasi,
       tujuan_kunjungan, dokumentasi_kunjungan, note_kunjungan, status)
      VALUES (?, 'non-faskes', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      user_id,
      nama_sales,
      region,
      nama_lokasi,
      alamat_lokasi,
      koordinat_lokasi,
      tujuan_kunjungan,
      dokumentasi_kunjungan,
      note_kunjungan,
      formStatus
    ];

    await conn.query(sql, params);
    conn.release();

    return res.json({ message: 'Sales Visit (Non-Faskes) saved successfully.' });
  } catch (err) {
    console.error('createSalesVisitNonFaskes error:', err);
    return res.status(500).json({ message: 'Server error saving sales visit (non-faskes)', error: err.message });
  }
}

/* Export the controller functions */
module.exports = {
  createSalesVisitCustomer,
  createSalesVisitNonFaskes,
  createTechnicianActivity,
  createTechnicianService,
};
