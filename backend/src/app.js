const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const analyticsRoutes = require('./routes/analytics');
const uploadRoutes = require('./routes/upload');
const salesAnalyticsRoutes = require('./routes/salesAnalytics');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:64076',
    /^http:\/\/127\.0\.0\.1:\d+$/,
    /^http:\/\/localhost:\d+$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting (relaxed for development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // increased limit for development
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/sales', salesAnalyticsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SRI KANNAN TRADERS API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error.stack);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: error.errors
    });
  }
  
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized access'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SRI KANNAN TRADERS API Server is running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 API URL: http://localhost:${PORT}/api`);
});

module.exports = app;
