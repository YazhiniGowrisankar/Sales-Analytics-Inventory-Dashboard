# SRI KANNAN TRADERS - Installation and Setup Guide

## Overview

SRI KANNAN TRADERS is a comprehensive stationery wholesale shop management system built with modern technologies. This system provides complete functionality for both shop owners (admin) and retail customers.

## Technology Stack

- **Frontend**: React.js 18 with Bootstrap 5
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT with bcrypt
- **Charts**: Chart.js
- **File Processing**: csv-parser, xlsx

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation Steps

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb sri_kannan_traders

# Run schema and seed data
psql -d sri_kannan_traders -f database/schema.sql
psql -d sri_kannan_traders -f database/seed_data.sql
```

### 2. Backend Setup

```bash
cd backend
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your database credentials

# Start the backend server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Configure environment variables
cp .env.example .env
# Edit .env if needed

# Start the frontend development server
npm start
```

## Default Credentials

### Admin Login
- **Email**: admin@srikannantraders.com
- **Password**: admin123

### Sample Customer Accounts
- **Email**: ramesh@email.com
- **Password**: password123

## Features

### Customer Features
- User registration and login
- Product catalog browsing with filters
- Shopping cart management
- Order placement and tracking
- Order history

### Admin Features
- Comprehensive dashboard with analytics
- Product and inventory management
- Order management and status updates
- Sales analytics with Chart.js visualizations
- Customer management
- Dataset upload for analytics demonstration

## Project Structure

```
sri-kannan-traders/
├── backend/                 # Node.js Express API
│   ├── src/
│   │   ├── controllers/     # Business logic
│   │   ├── middleware/     # Authentication and validation
│   │   ├── models/         # Data models
│   │   ├── routes/         # API routes
│   │   └── database/       # Database connection
│   └── package.json
├── frontend/               # React.js application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   └── package.json
├── database/              # SQL schema and seed data
│   ├── schema.sql
│   └── seed_data.sql
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/customers/signup` - Customer registration
- `POST /api/auth/customers/login` - Customer login
- `POST /api/auth/admin/login` - Admin login

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)

### Cart
- `GET /api/cart` - Get customer cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/:id` - Update cart item
- `DELETE /api/cart/:id` - Remove cart item

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/my-orders` - Get customer orders
- `GET /api/orders/all` - Get all orders (Admin only)
- `PUT /api/orders/:id/status` - Update order status (Admin only)

### Analytics
- `GET /api/analytics/dashboard-summary` - Dashboard statistics
- `GET /api/analytics/monthly-sales` - Monthly sales data
- `GET /api/analytics/top-products` - Top selling products
- `GET /api/analytics/category-sales` - Category-wise sales

### Dataset Upload
- `POST /api/upload/dataset` - Upload CSV/Excel dataset (Admin only)
- `GET /api/upload/template/:type` - Download template

## Development

### Running in Development Mode

```bash
# Backend (port 5000)
cd backend && npm run dev

# Frontend (port 3000)
cd frontend && npm start
```

### Building for Production

```bash
# Build frontend
cd frontend && npm run build

# Backend can be started with
cd backend && npm start
```

## Database Schema

The system uses the following main tables:
- `admins` - Admin users
- `customers` - Customer accounts
- `products` - Product catalog
- `orders` - Customer orders
- `order_items` - Order line items
- `cart` - Shopping cart items

## Analytics Features

The analytics dashboard provides:
- Monthly sales trends
- Top selling products
- Category-wise distribution
- Customer analytics
- Low stock alerts
- Revenue summaries

## Dataset Upload

Admin users can upload CSV or Excel files containing:
- Sales data for analytics demonstration
- Product information
- Customer data

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- Rate limiting on API endpoints

## Support

For any issues or questions, please refer to the documentation or contact the development team.

## License

© 2024 SRI KANNAN TRADERS. All rights reserved.
