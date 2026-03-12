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

// Get customer's orders
const getCustomerOrders = async (req, res) => {
  try {
    const { customer_id } = req.user;
    const { page = 1, limit = 10, status } = req.query;
    
    let queryText = `
      SELECT o.order_id, o.order_date, o.total_amount, o.status, o.created_at,
      COUNT(oi.order_item_id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE o.customer_id = $1
    `;
    
    const queryParams = [customer_id];
    let paramIndex = 2;
    
    if (status) {
      queryText += ` AND o.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    queryText += ` GROUP BY o.order_id, o.order_date, o.total_amount, o.status, o.created_at`;
    queryText += ` ORDER BY o.order_date DESC`;
    
    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), offset);
    
    const result = await query(queryText, queryParams);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE customer_id = $1';
    const countParams = [customer_id];
    
    if (status) {
      countQuery += ' AND status = $2';
      countParams.push(status);
    }
    
    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.status(200).json({
      success: true,
      data: {
        orders: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
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

// Get single order by ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_id, role } = req.user;
    
    let queryText = `
      SELECT o.order_id, o.customer_id, o.order_date, o.total_amount, o.status, o.created_at,
      c.name as customer_name, c.shop_name, c.email, c.phone, c.address
      FROM orders o
      JOIN customers c ON o.customer_id = c.customer_id
      WHERE o.order_id = $1
    `;
    
    const queryParams = [id];
    
    // If customer, only return their own orders
    if (role === 'customer') {
      queryText += ` AND o.customer_id = $2`;
      queryParams.push(customer_id);
    }
    
    const orderResult = await query(queryText, queryParams);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    const order = orderResult.rows[0];
    
    // Get order items
    const itemsResult = await query(
      `SELECT oi.order_item_id, oi.product_id, oi.quantity, oi.price,
       p.name as product_name, p.category,
       (oi.quantity * oi.price) as subtotal
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       WHERE oi.order_id = $1
       ORDER BY p.name`,
      [id]
    );
    
    res.status(200).json({
      success: true,
      data: {
        order: {
          ...order,
          items: itemsResult.rows
        }
      }
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
    
    let queryText = `
      SELECT o.order_id, o.customer_id, o.order_date, o.total_amount, o.status, o.created_at,
      c.name as customer_name, c.shop_name, c.email,
      COUNT(oi.order_item_id) as item_count
      FROM orders o
      JOIN customers c ON o.customer_id = c.customer_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    if (status) {
      queryText += ` AND o.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    if (customer_id) {
      queryText += ` AND o.customer_id = $${paramIndex}`;
      queryParams.push(customer_id);
      paramIndex++;
    }
    
    if (start_date) {
      queryText += ` AND o.order_date >= $${paramIndex}`;
      queryParams.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      queryText += ` AND o.order_date <= $${paramIndex}`;
      queryParams.push(end_date);
      paramIndex++;
    }
    
    queryText += ` GROUP BY o.order_id, o.customer_id, o.order_date, o.total_amount, o.status, o.created_at, c.name, c.shop_name, c.email`;
    queryText += ` ORDER BY o.order_date DESC`;
    
    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), offset);
    
    const result = await query(queryText, queryParams);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT o.order_id) as total
      FROM orders o
      JOIN customers c ON o.customer_id = c.customer_id
      WHERE 1=1
    `;
    
    const countParams = [];
    let countIndex = 1;
    
    if (status) {
      countQuery += ` AND o.status = $${countIndex}`;
      countParams.push(status);
      countIndex++;
    }
    
    if (customer_id) {
      countQuery += ` AND o.customer_id = $${countIndex}`;
      countParams.push(customer_id);
      countIndex++;
    }
    
    if (start_date) {
      countQuery += ` AND o.order_date >= $${countIndex}`;
      countParams.push(start_date);
      countIndex++;
    }
    
    if (end_date) {
      countQuery += ` AND o.order_date <= $${countIndex}`;
      countParams.push(end_date);
      countIndex++;
    }
    
    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.status(200).json({
      success: true,
      data: {
        orders: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
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

// Get order statistics (Admin only)
const getOrderStatistics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateGrouping;
    switch (period) {
      case 'day':
        dateGrouping = 'DATE(order_date)';
        break;
      case 'week':
        dateGrouping = 'DATE_TRUNC(\'week\', order_date)';
        break;
      case 'month':
        dateGrouping = 'DATE_TRUNC(\'month\', order_date)';
        break;
      case 'year':
        dateGrouping = 'DATE_TRUNC(\'year\', order_date)';
        break;
      default:
        dateGrouping = 'DATE_TRUNC(\'month\', order_date)';
    }
    
    const result = await query(
      `SELECT 
       ${dateGrouping} as period,
       COUNT(*) as total_orders,
       SUM(total_amount) as total_revenue,
       AVG(total_amount) as avg_order_value,
       COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_orders,
       COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_orders,
       COUNT(CASE WHEN status = 'Processing' THEN 1 END) as processing_orders,
       COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) as cancelled_orders
       FROM orders
       WHERE order_date >= NOW() - INTERVAL '1 year'
       GROUP BY ${dateGrouping}
       ORDER BY period DESC
       LIMIT 12`
    );
    
    res.status(200).json({
      success: true,
      data: {
        statistics: result.rows
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
