const express = require('express');
const router = express.Router();

console.log('🔧 Analytics routes loading...');

const {
  getMonthlySales,
  getTopProducts,
  getCategorySales,
  getLowStockAlerts,
  getDashboardSummary,
  getSalesTrends,
  getCustomerAnalytics
} = require('../controllers/analyticsController');
const { authenticateAdmin } = require('../middleware/auth');

// All analytics routes require admin authentication
// router.use(authenticateAdmin);

// Temporary public endpoint for testing
router.get('/monthly-sales-public', getMonthlySales);

// Simple test endpoint
router.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Analytics routes are working',
    timestamp: new Date().toISOString()
  });
});

// Analytics endpoints
router.get('/monthly-sales', getMonthlySales);
router.get('/top-products', getTopProducts);
router.get('/category-sales', getCategorySales);
router.get('/low-stock', getLowStockAlerts);
router.get('/dashboard-summary', getDashboardSummary);
router.get('/sales-trends', getSalesTrends);
router.get('/customer-analytics', getCustomerAnalytics);

module.exports = router;
