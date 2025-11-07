// controllers/formController.js
const pool = require('../db');

// FASKES FORM (Customer)
async function createSalesVisitCustomer(req, res) {
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

  const dokumentasi_kunjungan = req.file ? req.file.filename : null;

  try {
    const conn = await pool.getConnection();

    await conn.query(
      `INSERT INTO sales_visits
      (user_id, form_type, nama_sales, region, nama_lokasi, alamat_lokasi, koordinat_lokasi,
       tujuan_kunjungan, dokumentasi_kunjungan, note_kunjungan, nama_user, jabatan_user, status_kunjungan)
      VALUES (?, 'faskes', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        nama_user,
        jabatan_user,
        status_kunjungan === 'true' ? 1 : 0,
      ]
    );

    conn.release();
    res.json({ message: 'Sales Visit (Faskes) saved successfully.' });
  } catch (err) {
    console.error('Error saving Faskes form:', err);
    res.status(500).json({ message: 'Server error saving form' });
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
};
