const jwt = require('jsonwebtoken');
const { query } = require('../database/connection');

// JWT utility functions
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = verifyToken(token);
    
    // Get user from database based on role
    let user;
    if (decoded.role === 'admin') {
      const result = await query(
        'SELECT admin_id, name, email FROM admins WHERE admin_id = $1',
        [decoded.admin_id]
      );
      user = result.rows[0];
    } else if (decoded.role === 'customer') {
      const result = await query(
        'SELECT customer_id, name, email, shop_name FROM customers WHERE customer_id = $1',
        [decoded.customer_id]
      );
      user = result.rows[0];
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }

    req.user = { ...user, role: decoded.role };
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = verifyToken(token);
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const result = await query(
      'SELECT admin_id, name, email FROM admins WHERE admin_id = $1',
      [decoded.admin_id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin token'
      });
    }

    req.user = { ...result.rows[0], role: 'admin' };
    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid admin token'
    });
  }
};

// Customer authentication middleware
const authenticateCustomer = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = verifyToken(token);
    
    if (decoded.role !== 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Customer access required'
      });
    }

    const result = await query(
      'SELECT customer_id, name, email, shop_name FROM customers WHERE customer_id = $1',
      [decoded.customer_id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid customer token'
      });
    }

    req.user = { ...result.rows[0], role: 'customer' };
    next();
  } catch (error) {
    console.error('Customer authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid customer token'
    });
  }
};

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  authenticateAdmin,
  authenticateCustomer
};
