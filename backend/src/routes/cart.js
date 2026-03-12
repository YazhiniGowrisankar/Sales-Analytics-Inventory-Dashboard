const express = require('express');
const router = express.Router();

const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary,
  validateCart,
  addToCartValidation,
  updateCartValidation
} = require('../controllers/cartController');
const { authenticateCustomer } = require('../middleware/auth');

// All cart routes require customer authentication
router.use(authenticateCustomer);

// Cart operations
router.get('/', getCart);
router.post('/add', addToCartValidation, addToCart);
router.put('/:id', updateCartValidation, updateCartItem);
router.delete('/:id', removeFromCart);
router.delete('/', clearCart);

// Cart utilities
router.get('/summary', getCartSummary);
router.post('/validate', validateCart);

module.exports = router;
