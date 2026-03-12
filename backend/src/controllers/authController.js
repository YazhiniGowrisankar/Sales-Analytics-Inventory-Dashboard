const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/connection');
const { generateToken } = require('../middleware/auth');

// Validation rules
const customerSignupValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('shopName').trim().isLength({ min: 2, max: 150 }).withMessage('Shop name must be between 2 and 150 characters'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('address').optional().trim().isLength({ max: 500 }).withMessage('Address too long')
];

const customerLoginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
];

const adminLoginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
];

// Customer signup
const customerSignup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { name, shopName, phone, email, password, address } = req.body;

    // Check if customer already exists
    const existingCustomer = await query(
      'SELECT customer_id FROM customers WHERE email = $1',
      [email]
    );

    if (existingCustomer.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create customer
    const result = await query(
      `INSERT INTO customers (name, shop_name, phone, email, password, address) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING customer_id, name, shop_name, phone, email, address, created_at`,
      [name, shopName, phone, email, hashedPassword, address]
    );

    const customer = result.rows[0];

    // Generate JWT token
    const token = generateToken({
      customer_id: customer.customer_id,
      role: 'customer'
    });

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      data: {
        customer: {
          customer_id: customer.customer_id,
          name: customer.name,
          shop_name: customer.shop_name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          created_at: customer.created_at
        },
        token
      }
    });
  } catch (error) {
    console.error('Customer signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Customer login
const customerLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find customer
    const result = await query(
      'SELECT customer_id, name, shop_name, phone, email, address, password FROM customers WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const customer = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, customer.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateToken({
      customer_id: customer.customer_id,
      role: 'customer'
    });

    // Remove password from response
    const { password: _, ...customerData } = customer;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        customer: customerData,
        token
      }
    });
  } catch (error) {
    console.error('Customer login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Admin login
const adminLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find admin
    const result = await query(
      'SELECT admin_id, name, email, password FROM admins WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const admin = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateToken({
      admin_id: admin.admin_id,
      role: 'admin'
    });

    // Remove password from response
    const { password: _, ...adminData } = admin;

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      data: {
        admin: adminData,
        token
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const { role, admin_id, customer_id } = req.user;

    let result;
    if (role === 'admin') {
      result = await query(
        'SELECT admin_id, name, email, created_at FROM admins WHERE admin_id = $1',
        [admin_id]
      );
    } else {
      result = await query(
        'SELECT customer_id, name, shop_name, phone, email, address, created_at FROM customers WHERE customer_id = $1',
        [customer_id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: result.rows[0],
        role
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  customerSignup,
  customerLogin,
  adminLogin,
  getProfile,
  customerSignupValidation,
  customerLoginValidation,
  adminLoginValidation
};
