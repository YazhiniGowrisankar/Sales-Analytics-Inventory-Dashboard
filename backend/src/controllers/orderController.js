const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../database/connection');
const { Parser } = require('json2csv');

// Validation rules
const createOrderValidation = [
  body('cart_items').isArray({ min: 1 }).withMessage('Cart items required'),
  body('cart_items.*.product_id').isInt({ min: 1 }).withMessage('Valid product ID required'),
  body('cart_items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('cart_items.*.price').isFloat({ gt: 0 }).withMessage('Price must be greater than 0')
];

const updateOrderStatusValidation = [
  body('status').isIn(['Pending', 'Processing', 'Completed', 'Cancelled']).withMessage('Invalid order status')
];

// Create new order
const createOrder = async (req, res) => {
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
    const { cart_items } = req.body;
    
    // Calculate total amount
    const total_amount = cart_items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    
    // Use transaction for order creation
    const result = await transaction(async (client) => {
      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (customer_id, total_amount, status)
         VALUES ($1, $2, 'Pending')
         RETURNING order_id, customer_id, order_date, total_amount, status, created_at`,
        [customer_id, total_amount]
      );
      
      const order = orderResult.rows[0];
      
      // Create order items and update stock
      for (const item of cart_items) {
        // Check product availability
        const productCheck = await client.query(
          'SELECT stock_quantity FROM products WHERE product_id = $1 FOR UPDATE',
          [item.product_id]
        );
        
        if (productCheck.rows.length === 0) {
          throw new Error(`Product ${item.product_id} not found`);
        }
        
        if (productCheck.rows[0].stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.product_id}`);
        }
        
        // Create order item
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price)
           VALUES ($1, $2, $3, $4)`,
          [order.order_id, item.product_id, item.quantity, item.price]
        );
        
        // Update product stock
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE product_id = $2',
          [item.quantity, item.product_id]
        );
      }
      
      return order;
    });
    
    // Get order details with items
    const orderDetails = await getOrderDetailsWithItems(result.order_id);
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: orderDetails
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

// Get order details with items (helper function)
const getOrderDetailsWithItems = async (orderId) => {
  const orderResult = await query(
    `SELECT o.order_id, o.customer_id, o.order_date, o.total_amount, o.status, o.created_at,
     c.name as customer_name, c.shop_name, c.email
     FROM orders o
     JOIN customers c ON o.customer_id = c.customer_id
     WHERE o.order_id = $1`,
    [orderId]
  );
  
  if (orderResult.rows.length === 0) {
    return null;
  }
  
  const order = orderResult.rows[0];
  
  const itemsResult = await query(
    `SELECT oi.order_item_id, oi.product_id, oi.quantity, oi.price,
     p.name as product_name, p.category,
     (oi.quantity * oi.price) as subtotal
     FROM order_items oi
     JOIN products p ON oi.product_id = p.product_id
     WHERE oi.order_id = $1
     ORDER BY p.name`,
    [orderId]
  );
  
  return {
    order,
    items: itemsResult.rows
  };
};

// Get customer orders
const getCustomerOrders = async (req, res) => {
  try {
    const { customer_id } = req.user;
    const { page = 1, limit = 10, status } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = 'WHERE o.customer_id = $1';
    let params = [customer_id];
    let paramIndex = 2;
    
    if (status) {
      whereClause += ` AND o.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    const result = await query(
      `SELECT o.order_id, o.order_date, o.total_amount, o.status, o.created_at,
       c.name as customer_name, c.shop_name
       FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       ${whereClause}
       ORDER BY o.order_date DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );
    
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM orders o
       ${whereClause}`,
      params
    );
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: {
        orders: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages
        }
      }
    });
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_id, role } = req.user;
    
    const orderDetails = await getOrderDetailsWithItems(id);
    
    if (!orderDetails) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if user owns this order or is admin
    if (role !== 'admin' && orderDetails.order.customer_id !== customer_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.status(200).json({
      success: true,
      data: orderDetails
    });
  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all orders (Admin only)
const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, customer_id, start_date, end_date } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    let paramIndex = 1;
    
    if (status) {
      whereClause += ` AND o.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (customer_id) {
      whereClause += ` AND o.customer_id = $${paramIndex}`;
      params.push(customer_id);
      paramIndex++;
    }
    
    if (start_date) {
      whereClause += ` AND o.order_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      whereClause += ` AND o.order_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }
    
    const result = await query(
      `SELECT o.order_id, o.order_date, o.total_amount, o.status, o.created_at,
       c.name as customer_name, c.shop_name
       FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       ${whereClause}
       ORDER BY o.order_date DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );
    
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM orders o
       ${whereClause}`,
      params
    );
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: {
        orders: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages
        }
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update order status (Admin only)
const updateOrderStatus = async (req, res) => {
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
    const { status } = req.body;
    
    // Check if order exists
    const existingOrder = await query(
      'SELECT order_id, status FROM orders WHERE order_id = $1',
      [id]
    );
    
    if (existingOrder.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    const currentStatus = existingOrder.rows[0].status;
    
    // Use transaction for status update with stock management
    const result = await transaction(async (client) => {
      // Update order status (simplified version without completed_at)
      const updateResult = await client.query(
        `UPDATE orders 
         SET status = $1, 
             updated_at = CURRENT_TIMESTAMP
         WHERE order_id = $2
         RETURNING order_id, customer_id, order_date, total_amount, status, updated_at`,
        [status, id]
      );
      
      // Handle stock restoration for cancelled orders
      if (status === 'Cancelled' && currentStatus !== 'Cancelled') {
        const itemsResult = await client.query(
          'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
          [id]
        );
        
        for (const item of itemsResult.rows) {
          await client.query(
            'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE product_id = $2',
            [item.quantity, item.product_id]
          );
        }
      }
      
      return updateResult.rows[0];
    });
    
    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        order: result
      }
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get order statistics
const getOrderStatistics = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    let paramIndex = 1;
    
    if (start_date) {
      whereClause += ` AND o.order_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      whereClause += ` AND o.order_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }
    
    const result = await query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN o.status = 'Completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN o.status = 'Pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN o.status = 'Processing' THEN 1 END) as processing_orders,
        COUNT(CASE WHEN o.status = 'Cancelled' THEN 1 END) as cancelled_orders,
        COALESCE(SUM(CASE WHEN o.status = 'Completed' THEN o.total_amount END), 0) as total_revenue,
        COALESCE(AVG(o.total_amount), 0) as avg_order_value
      FROM orders o
      ${whereClause}
    `, params);
    
    res.status(200).json({
      success: true,
      data: {
        statistics: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Get order statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Export completed orders to CSV
const exportCompletedOrders = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let whereClause = 'WHERE o.status = $1';
    let params = ['Completed'];
    let paramIndex = 2;
    
    if (start_date) {
      whereClause += ` AND o.order_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      whereClause += ` AND o.order_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }
    
    const result = await query(`
      SELECT 
        o.order_id,
        o.order_date,
        o.total_amount,
        c.name as customer_name,
        c.shop_name,
        c.email,
        c.phone,
        oi.product_id,
        p.name as product_name,
        p.category,
        oi.quantity,
        oi.price as unit_price,
        (oi.quantity * oi.price) as total_price
      FROM orders o
      JOIN customers c ON o.customer_id = c.customer_id
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN products p ON oi.product_id = p.product_id
      ${whereClause}
      ORDER BY o.order_date DESC, o.order_id ASC, oi.product_id ASC
    `, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No completed orders found'
      });
    }
    
    // Transform data for CSV export
    const csvData = result.rows.map(row => ({
      'Order ID': row.order_id,
      'Order Date': new Date(row.order_date).toLocaleDateString('en-IN'),
      'Customer Name': row.customer_name,
      'Shop Name': row.shop_name,
      'Email': row.email,
      'Phone': row.phone,
      'Product ID': row.product_id,
      'Product Name': row.product_name,
      'Category': row.category,
      'Quantity': row.quantity,
      'Unit Price': row.unit_price.toFixed(2),
      'Total Price': row.total_price.toFixed(2),
      'Order Total': row.total_amount.toFixed(2)
    }));
    
    // Generate CSV
    const parser = new Parser();
    const csv = parser.parse(csvData);
    
    // Set headers for file download
    const filename = `completed_orders_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(csv);
    
  } catch (error) {
    console.error('Export completed orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createOrder,
  getCustomerOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  getOrderStatistics,
  exportCompletedOrders,
  createOrderValidation,
  updateOrderStatusValidation
};
