// routes/formRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  createSalesVisitCustomer,
  createSalesVisitNonFaskes,
} = require('../controllers/formController');

const router = express.Router();

// File upload config (multer)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Define routes
router.post('/customer', upload.single('dokumentasi_kunjungan'), createSalesVisitCustomer);
router.post('/non-faskes', upload.single('dokumentasi_kunjungan'), createSalesVisitNonFaskes);

module.exports = router;
