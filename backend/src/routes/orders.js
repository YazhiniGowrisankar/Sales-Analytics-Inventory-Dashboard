const express = require('express');
const router = express.Router();

const {
  createOrder,
  getCustomerOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  getOrderStatistics,
  exportCompletedOrders,
  createOrderValidation,
  updateOrderStatusValidation
} = require('../controllers/orderController');
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');

// Customer routes
router.post('/', authenticateToken, createOrderValidation, createOrder);
router.get('/my-orders', authenticateToken, getCustomerOrders);
router.get('/statistics', authenticateAdmin, getOrderStatistics);

// Admin routes
router.get('/all', authenticateAdmin, getAllOrders);
router.put('/:id/status', authenticateAdmin, updateOrderStatusValidation, updateOrderStatus);
router.get('/export/completed', authenticateAdmin, exportCompletedOrders);

// Shared routes (both admin and customer can access their own orders)
router.get('/:id', authenticateToken, getOrderById);

module.exports = router;
