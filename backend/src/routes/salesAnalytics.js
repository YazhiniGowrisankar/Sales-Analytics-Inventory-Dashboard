const express = require('express');
const router = express.Router();
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');
const { getSalesAnalytics, getSalesTrends } = require('../controllers/salesAnalyticsController');

// Get sales analytics with multiple date filtering
router.post('/analytics', getSalesAnalytics);

// Get sales trends for date range
router.get('/trends', authenticateToken, authenticateAdmin, getSalesTrends);

module.exports = router;
