# SRI KANNAN TRADERS - Stationery Wholesale Shop Management System

A comprehensive full-stack web application for managing a wholesale stationery shop with analytics capabilities.

## Technology Stack

- **Frontend**: React.js with Bootstrap 5
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT with bcrypt
- **Charts**: Chart.js
- **File Processing**: csv-parser, xlsx

## Features

### Customer Features
- User registration and login
- Product catalog browsing
- Shopping cart management
- Order placement and history
- Professional business interface

### Admin Features
- Admin dashboard with analytics
- Product and inventory management
- Order management and status updates
- Sales analytics with Chart.js visualizations
- Dataset upload for analytics demonstration
- Customer management

## Project Structure

```
sri-kannan-traders/
├── backend/                 # Node.js Express API
├── frontend/               # React.js application
├── database/              # PostgreSQL schema and seed data
└── README.md             # This file
```

## Installation

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure database credentials in .env
npm start
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Database Setup
```bash
# Create PostgreSQL database
createdb sri_kannan_traders

# Run schema and seed data
psql -d sri_kannan_traders -f database/schema.sql
psql -d sri_kannan_traders -f database/seed_data.sql
```

## Default Admin Credentials

- **Email**: admin@srikannantraders.com
- **Password**: admin123

## API Endpoints

### Authentication
- POST /customers/signup
- POST /customers/login
- POST /admin/login

### Products
- GET /products
- POST /products (Admin only)
- PUT /products/:id (Admin only)
- DELETE /products/:id (Admin only)

### Cart
- POST /cart/add
- GET /cart
- DELETE /cart/remove

### Orders
- POST /orders
- GET /orders
- GET /orders/:id

### Analytics
- GET /analytics/monthly-sales
- GET /analytics/top-products
- GET /analytics/category-sales
- GET /analytics/low-stock

### Dataset Upload
- POST /admin/upload-dataset (Admin only)

## License

© 2024 SRI KANNAN TRADERS. All rights reserved.
