const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../database/connection');

// Validation rules
const addToCartValidation = [
  body('product_id').isInt({ min: 1 }).withMessage('Valid product ID required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
];

const updateCartValidation = [
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
];

// Get customer's cart
const getCart = async (req, res) => {
  try {
    const { customer_id } = req.user;
    
    const result = await query(
      `SELECT c.cart_id, c.product_id, c.quantity, c.created_at, c.updated_at,
       p.name, p.category, p.price, p.stock_quantity,
       (c.quantity * p.price) as subtotal
       FROM cart c
       JOIN products p ON c.product_id = p.product_id
       WHERE c.customer_id = $1
       ORDER BY p.name`,
      [customer_id]
    );
    
    // Calculate cart total
    const total = result.rows.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
    
    res.status(200).json({
      success: true,
      data: {
        cart_items: result.rows,
        total: parseFloat(total.toFixed(2)),
        item_count: result.rows.length
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }
    
    const { customer_id } = req.user;
    const { product_id, quantity } = req.body;
    
    // Check if product exists and has sufficient stock
    const productResult = await query(
      'SELECT product_id, name, stock_quantity FROM products WHERE product_id = $1',
      [product_id]
    );
    
    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const product = productResult.rows[0];
    
    if (product.stock_quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${product.stock_quantity} items available`
      });
    }
    
    // Check if item already exists in cart
    const existingCartItem = await query(
      'SELECT cart_id, quantity FROM cart WHERE customer_id = $1 AND product_id = $2',
      [customer_id, product_id]
    );
    
    if (existingCartItem.rows.length > 0) {
      // Update existing cart item
      const newQuantity = existingCartItem.rows[0].quantity + quantity;
      
      // Check if new quantity exceeds stock
      if (product.stock_quantity < newQuantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock. Only ${product.stock_quantity} items available`
        });
      }
      
      const updateResult = await query(
        'UPDATE cart SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE cart_id = $2 RETURNING *',
        [newQuantity, existingCartItem.rows[0].cart_id]
      );
      
      return res.status(200).json({
        success: true,
        message: 'Cart updated successfully',
        data: {
          cart_item: updateResult.rows[0]
        }
      });
    } else {
      // Add new cart item
      const insertResult = await query(
        'INSERT INTO cart (customer_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *',
        [customer_id, product_id, quantity]
      );
      
      return res.status(201).json({
        success: true,
        message: 'Item added to cart successfully',
        data: {
          cart_item: insertResult.rows[0]
        }
      });
    }
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }
    
    const { customer_id } = req.user;
    const { id } = req.params;
    const { quantity } = req.body;
    
    // Check if cart item belongs to customer
    const cartItemResult = await query(
      `SELECT c.cart_id, c.product_id, c.quantity, p.stock_quantity
       FROM cart c
       JOIN products p ON c.product_id = p.product_id
       WHERE c.cart_id = $1 AND c.customer_id = $2`,
      [id, customer_id]
    );
    
    if (cartItemResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }
    
    const cartItem = cartItemResult.rows[0];
    
    // Check if new quantity exceeds stock
    if (cartItem.stock_quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${cartItem.stock_quantity} items available`
      });
    }
    
    const updateResult = await query(
      'UPDATE cart SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE cart_id = $2 RETURNING *',
      [quantity, id]
    );
    
    res.status(200).json({
      success: true,
      message: 'Cart item updated successfully',
      data: {
        cart_item: updateResult.rows[0]
      }
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const { customer_id } = req.user;
    const { id } = req.params;
    
    // Check if cart item belongs to customer
    const cartItemResult = await query(
      'SELECT cart_id FROM cart WHERE cart_id = $1 AND customer_id = $2',
      [id, customer_id]
    );
    
    if (cartItemResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }
    
    await query('DELETE FROM cart WHERE cart_id = $1', [id]);
    
    res.status(200).json({
      success: true,
      message: 'Item removed from cart successfully'
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Clear entire cart
const clearCart = async (req, res) => {
  try {
    const { customer_id } = req.user;
    
    const result = await query(
      'DELETE FROM cart WHERE customer_id = $1 RETURNING *',
      [customer_id]
    );
    
    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: {
        deleted_items: result.rowCount
      }
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get cart summary (for checkout)
const getCartSummary = async (req, res) => {
  try {
    const { customer_id } = req.user;
    
    const result = await query(
      `SELECT COUNT(*) as item_count,
       SUM(c.quantity * p.price) as total_amount
       FROM cart c
       JOIN products p ON c.product_id = p.product_id
       WHERE c.customer_id = $1`,
      [customer_id]
    );
    
    const summary = result.rows[0];
    
    res.status(200).json({
      success: true,
      data: {
        item_count: parseInt(summary.item_count),
        total_amount: parseFloat(summary.total_amount) || 0
      }
    });
  } catch (error) {
    console.error('Get cart summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Validate cart items before checkout
const validateCart = async (req, res) => {
  try {
    const { customer_id } = req.user;
    
    const result = await query(
      `SELECT c.cart_id, c.product_id, c.quantity, p.name, p.stock_quantity
       FROM cart c
       JOIN products p ON c.product_id = p.product_id
       WHERE c.customer_id = $1`,
      [customer_id]
    );
    
    const issues = [];
    
    for (const item of result.rows) {
      if (item.stock_quantity < item.quantity) {
        issues.push({
          product_id: item.product_id,
          product_name: item.name,
          requested_quantity: item.quantity,
          available_quantity: item.stock_quantity,
          issue: 'Insufficient stock'
        });
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        is_valid: issues.length === 0,
        issues
      }
    });
  } catch (error) {
    console.error('Validate cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary,
  validateCart,
  addToCartValidation,
  updateCartValidation
};
