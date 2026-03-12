const { body, validationResult } = require('express-validator');
const { query } = require('../database/connection');

// Validation rules
const createProductValidation = [
  body('name').trim().isLength({ min: 2, max: 200 }).withMessage('Product name must be between 2 and 200 characters'),
  body('category').trim().isLength({ min: 2, max: 50 }).withMessage('Category must be between 2 and 50 characters'),
  body('price').isFloat({ gt: 0 }).withMessage('Price must be greater than 0'),
  body('stock_quantity').isInt({ min: 0 }).withMessage('Stock quantity must be non-negative'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description too long')
];

const updateProductValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Product name must be between 2 and 200 characters'),
  body('category').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Category must be between 2 and 50 characters'),
  body('price').optional().isFloat({ gt: 0 }).withMessage('Price must be greater than 0'),
  body('stock_quantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be non-negative'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description too long')
];

// Get all products (with optional filtering)
const getProducts = async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, sortBy = 'name', sortOrder = 'ASC', page = 1, limit = 20 } = req.query;
    
    let queryText = `
      SELECT product_id, name, category, price, stock_quantity, description, created_at, updated_at
      FROM products
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    // Add filters
    if (category) {
      queryText += ` AND category = $${paramIndex}`;
      queryParams.push(category);
      paramIndex++;
    }
    
    if (search) {
      queryText += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    if (minPrice) {
      queryText += ` AND price >= $${paramIndex}`;
      queryParams.push(minPrice);
      paramIndex++;
    }
    
    if (maxPrice) {
      queryText += ` AND price <= $${paramIndex}`;
      queryParams.push(maxPrice);
      paramIndex++;
    }
    
    // Add sorting
    const validSortFields = ['name', 'category', 'price', 'stock_quantity', 'created_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';
    const sortDirection = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    
    queryText += ` ORDER BY ${sortField} ${sortDirection}`;
    
    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), offset);
    
    const result = await query(queryText, queryParams);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM products
      WHERE 1=1
    `;
    
    const countParams = [];
    let countIndex = 1;
    
    if (category) {
      countQuery += ` AND category = $${countIndex}`;
      countParams.push(category);
      countIndex++;
    }
    
    if (search) {
      countQuery += ` AND (name ILIKE $${countIndex} OR description ILIKE $${countIndex})`;
      countParams.push(`%${search}%`);
      countIndex++;
    }
    
    if (minPrice) {
      countQuery += ` AND price >= $${countIndex}`;
      countParams.push(minPrice);
      countIndex++;
    }
    
    if (maxPrice) {
      countQuery += ` AND price <= $${countIndex}`;
      countParams.push(maxPrice);
      countIndex++;
    }
    
    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.status(200).json({
      success: true,
      data: {
        products: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get single product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      'SELECT product_id, name, category, price, stock_quantity, description, created_at, updated_at FROM products WHERE product_id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        product: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create new product (Admin only)
const createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }
    
    const { name, category, price, stock_quantity, description } = req.body;
    
    // Check if product with same name already exists
    const existingProduct = await query(
      'SELECT product_id FROM products WHERE name = $1',
      [name]
    );
    
    if (existingProduct.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Product with this name already exists'
      });
    }
    
    const result = await query(
      `INSERT INTO products (name, category, price, stock_quantity, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING product_id, name, category, price, stock_quantity, description, created_at, updated_at`,
      [name, category, price, stock_quantity, description]
    );
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: {
        product: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update product (Admin only)
const updateProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }
    
    const { id } = req.params;
    const updates = req.body;
    
    // Check if product exists
    const existingProduct = await query(
      'SELECT product_id FROM products WHERE product_id = $1',
      [id]
    );
    
    if (existingProduct.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    const allowedFields = ['name', 'category', 'price', 'stock_quantity', 'description'];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        updateValues.push(updates[field]);
        paramIndex++;
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }
    
    updateValues.push(id); // Add product_id for WHERE clause
    
    const updateQuery = `
      UPDATE products
      SET ${updateFields.join(', ')}
      WHERE product_id = $${paramIndex}
      RETURNING product_id, name, category, price, stock_quantity, description, created_at, updated_at
    `;
    
    const result = await query(updateQuery, updateValues);
    
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: {
        product: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete product (Admin only)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if product exists
    const existingProduct = await query(
      'SELECT product_id FROM products WHERE product_id = $1',
      [id]
    );
    
    if (existingProduct.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check if product is in any active orders
    const orderCheck = await query(
      `SELECT COUNT(*) as count FROM order_items oi
       JOIN orders o ON oi.order_id = o.order_id
       WHERE oi.product_id = $1 AND o.status NOT IN ('Completed', 'Cancelled')`,
      [id]
    );
    
    if (parseInt(orderCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete product that is in active orders'
      });
    }
    
    await query('DELETE FROM products WHERE product_id = $1', [id]);
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get product categories
const getCategories = async (req, res) => {
  try {
    const result = await query(
      'SELECT DISTINCT category FROM products ORDER BY category'
    );
    
    const categories = result.rows.map(row => row.category);
    
    res.status(200).json({
      success: true,
      data: {
        categories
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get low stock products (Admin only)
const getLowStockProducts = async (req, res) => {
  try {
    const result = await query(
      `SELECT product_id, name, category, price, stock_quantity,
       CASE 
         WHEN stock_quantity = 0 THEN 'Out of Stock'
         WHEN stock_quantity <= 10 THEN 'Low Stock'
         ELSE 'In Stock'
       END AS stock_status
       FROM products
       WHERE stock_quantity <= 10
       ORDER BY stock_quantity ASC`
    );
    
    res.status(200).json({
      success: true,
      data: {
        products: result.rows
      }
    });
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getLowStockProducts,
  createProductValidation,
  updateProductValidation
};
