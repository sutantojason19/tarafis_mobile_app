// controllers/formController.js
const pool = require('../db');

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

  // handle uploaded images
  const bukti_koreksi = req.files?.['bukti_koreksi']?.[0]?.filename || null;
  const tindakan_koreksi_img = req.files?.['tindakan_koreksi_img']?.[0]?.filename || null;
  const foto_alat_sebelum_service = req.files?.['foto_alat_sebelum_service']?.[0]?.filename || null;


  if (!serial_number) {
    return res.status(400).json({ message: 'serial_number is required' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // --- Check if product already exists ---
    const rows = await conn.query(
      'SELECT id FROM products WHERE serial_number = ?',
      [serial_number]
    );

    let product_id;
    if (rows.length > 0) {
      product_id = rows[0].id;
    } else {
      const result = await conn.query(
        `INSERT INTO products (nama_produk, tipe_produk, serial_number, merk_produk, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [nama_produk, tipe_produk, serial_number, merk_produk]
      );
      product_id = result.insertId;
    }

    // --- Insert into technician_services ---
    await conn.query(
      `INSERT INTO technician_services 
        (user_id, product_id, nama_customer, kontak_customer, nama_faskes, tanggal_pengambilan,
         deskripsi_masalah, estimasi_penyelesaian, foto_alat_sebelum_service,
         penyebab_masalah, koreksi, tindakan_koreksi_capa,
         bukti_koreksi, tindakan_koreksi_img, kuantitas_unit, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,  NOW(), NOW())`,
      [
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
      ]
    );

    await conn.commit();
    return res.json({ message: 'Technician Service saved successfully.' });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Error saving technician service:', err);
    return res.status(500).json({ message: 'Server error saving form', error: err.message });
  } finally {
    if (conn) conn.release();
  }
}


// activities form 
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

  // Files from multer
  const selfie_foto_kegiatan = req.files?.['selfie_foto_kegiatan']?.[0]?.filename || null;
  const foto_ba_daftar_hadir = req.files?.['foto_ba_daftar_hadir']?.[0]?.filename || null;

  if (!serial_number) {
    return res.status(400).json({ message: 'serial_number is required' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // --- Check if product exists ---
    const rows = await conn.query(
      'SELECT id FROM products WHERE serial_number = ?',
      [serial_number]
    );

    let product_id;

    if (rows.length > 0) {
      product_id = rows[0].id;
    } else {
      const result = await conn.query(
        `INSERT INTO products (nama_produk, tipe_produk, serial_number, merk_produk, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [nama_produk, tipe_produk, serial_number, merk_produk]
      );
      product_id = result.insertId;
    }

    // --- Insert technician activity ---
    await conn.query(
      `INSERT INTO technician_activities 
      (
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
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
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
        kuantitas_unit
      ]
    );

    await conn.commit();
    return res.json({ message: 'Technician Activity saved successfully.' });

  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Error saving technician activity:', err);
    return res.status(500).json({ message: 'Server error saving form', error: err.message });
  } finally {
    if (conn) conn.release();
  }
}



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
      status_kunjungan
    } = req.body;

    // Handle file (multer)
    let dokumentasi_kunjungan = null;
    if (req.file?.filename) {
      dokumentasi_kunjungan = req.file.filename;
    } else if (req.files?.dokumentasi_kunjungan?.[0]?.filename) {
      dokumentasi_kunjungan = req.files.dokumentasi_kunjungan[0].filename;
    }

    const sql = `INSERT INTO sales_visits
      (user_id, form_type, nama_sales, region, nama_lokasi, alamat_lokasi, koordinat_lokasi,
       tujuan_kunjungan, dokumentasi_kunjungan, note_kunjungan, nama_user, jabatan_user, status_kunjungan)
      VALUES (?, 'faskes', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

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
    ];

    const conn = await pool.getConnection();
    await conn.query(sql, params);
    conn.release();

    return res.json({ message: 'Sales Visit (Customer) saved successfully.' });

  } catch (err) {
    console.error('Error saving Faskes form:', err);
    return res.status(500).json({ message: 'Server error saving form', error: err.message });
  }
}





// NON-FASKES FORM
async function createSalesVisitNonFaskes(req, res) {
  const {
    user_id,
    nama_sales,
    region,
    nama_lokasi,
    alamat_lokasi,
    koordinat_lokasi,
    tujuan_kunjungan,
    note_kunjungan
  } = req.body;

  const dokumentasi_kunjungan = req.file ? req.file.filename : null;

  try {
    const conn = await pool.getConnection();

    await conn.query(
      `INSERT INTO sales_visits
      (user_id, form_type, nama_sales, region, nama_lokasi, alamat_lokasi, koordinat_lokasi,
       tujuan_kunjungan, dokumentasi_kunjungan, note_kunjungan)
      VALUES (?, 'non-faskes', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        nama_sales,
        region,
        nama_lokasi,
        alamat_lokasi,
        koordinat_lokasi,
        tujuan_kunjungan,
        dokumentasi_kunjungan,
        note_kunjungan,
      ]
    );

    conn.release();
    res.json({ message: 'Sales Visit (Non-Faskes) saved successfully.' });
  } catch (err) {
    console.error('Error saving Non-Faskes form:', err);
    res.status(500).json({ message: 'Server error saving form' });
  }
}

module.exports = {
  createSalesVisitCustomer,
  createSalesVisitNonFaskes,
  createTechnicianActivity,
  createTechnicianService
};
