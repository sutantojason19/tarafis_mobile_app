// routes/formRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
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

module.exports = router;
