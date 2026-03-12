const express = require('express');
const router = express.Router();

const {
  uploadDataset,
  getUploadHistory,
  downloadTemplate,
  upload,
  uploadValidation
} = require('../controllers/uploadController');
const { authenticateAdmin } = require('../middleware/auth');

// All upload routes require admin authentication
router.use(authenticateAdmin);

// Upload dataset
router.post('/dataset', upload.single('file'), uploadValidation, uploadDataset);

// Get upload history
router.get('/history', getUploadHistory);

// Download template
router.get('/template/:dataset_type', downloadTemplate);

module.exports = router;
