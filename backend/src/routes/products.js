const express = require('express');
const router = express.Router();

const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getLowStockProducts,
  createProductValidation,
  updateProductValidation
} = require('../controllers/productController');
const { authenticateAdmin } = require('../middleware/auth');

// Public routes
router.get('/', getProducts);
router.get('/categories', getCategories);
router.get('/:id', getProductById);

// Admin only routes
router.post('/', authenticateAdmin, createProductValidation, createProduct);
router.put('/:id', authenticateAdmin, updateProductValidation, updateProduct);
router.delete('/:id', authenticateAdmin, deleteProduct);
router.get('/admin/low-stock', authenticateAdmin, getLowStockProducts);

module.exports = router;
