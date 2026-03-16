const express = require('express');
const router = express.Router();
const {
  getFastMovingProducts,
  getSlowMovingProducts,
  getCategoryPerformance,
  getTopCustomers,
  getProductRevenueContribution,
  getSalesTrendsAnalysis,
  getStockAnalysis,
  getCustomerOrderPatterns,
  getProfitMarginAnalysis,
  getDiagnosticSummary,
  getAvailableDatasets
} = require('../controllers/diagnosticController');

// Fast moving products - products that sell the most
router.get('/top-products', getFastMovingProducts);

// Slow moving products - products with very low sales
router.get('/slow-products', getSlowMovingProducts);

// Category performance analysis
router.get('/category-performance', getCategoryPerformance);

// Top customers by revenue
router.get('/top-customers', getTopCustomers);

// Product revenue contribution analysis
router.get('/product-contribution', getProductRevenueContribution);

// Sales trends analysis
router.get('/sales-trends', getSalesTrendsAnalysis);

// Stock analysis
router.get('/stock-analysis', getStockAnalysis);

// Customer order patterns
router.get('/customer-patterns', getCustomerOrderPatterns);

// Profit margin analysis
router.get('/profit-margins', getProfitMarginAnalysis);

// Comprehensive diagnostic summary
router.get('/summary', getDiagnosticSummary);

// Get available datasets
router.get('/datasets', getAvailableDatasets);

module.exports = router;
