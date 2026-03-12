const express = require('express');
const router = express.Router();

const {
  customerSignup,
  customerLogin,
  adminLogin,
  getProfile,
  customerSignupValidation,
  customerLoginValidation,
  adminLoginValidation
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Customer routes
router.post('/customers/signup', customerSignupValidation, customerSignup);
router.post('/customers/login', customerLoginValidation, customerLogin);

// Admin routes
router.post('/admin/login', adminLoginValidation, adminLogin);

// Get current user profile (protected)
router.get('/profile', authenticateToken, getProfile);

module.exports = router;
