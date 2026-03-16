// Application constants and configuration

export const APP_CONFIG = {
  name: process.env.REACT_APP_NAME || 'SRI KANNAN TRADERS',
  version: process.env.REACT_APP_VERSION || '1.0.0',
  currency: process.env.REACT_APP_DEFAULT_CURRENCY || '₹',
  dateFormat: process.env.REACT_APP_DATE_FORMAT || 'dd/MM/yyyy',
  enableAnalytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
  enableDatasetUpload: process.env.REACT_APP_ENABLE_DATASET_UPLOAD === 'true',
};

export const API_ENDPOINTS = {
  auth: {
    customerLogin: '/auth/customers/login',
    customerSignup: '/auth/customers/signup',
    adminLogin: '/auth/admin/login',
    profile: '/auth/profile',
  },
  products: {
    list: '/products',
    details: '/products/:id',
    create: '/products',
    update: '/products/:id',
    delete: '/products/:id',
    categories: '/products/categories',
    lowStock: '/products/admin/low-stock',
  },
  cart: {
    list: '/cart',
    add: '/cart/add',
    update: '/cart/:id',
    remove: '/cart/:id',
    clear: '/cart',
    summary: '/cart/summary',
    validate: '/cart/validate',
  },
  orders: {
    create: '/orders',
    customerOrders: '/orders/my-orders',
    details: '/orders/:id',
    all: '/orders/all',
    updateStatus: '/orders/:id/status',
    statistics: '/orders/statistics',
  },
  analytics: {
    monthlySales: '/analytics/monthly-sales',
    topProducts: '/analytics/top-products',
    categorySales: '/analytics/category-sales',
    lowStock: '/analytics/low-stock',
    dashboard: '/analytics/dashboard-summary',
    salesTrends: '/analytics/sales-trends',
    customerAnalytics: '/analytics/customer-analytics',
  },
  upload: {
    dataset: '/upload/dataset',
    history: '/upload/history',
    template: '/upload/template/:type',
  },
};

export const ORDER_STATUS = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const ORDER_STATUS_COLORS = {
  [ORDER_STATUS.PENDING]: 'warning',
  [ORDER_STATUS.PROCESSING]: 'info',
  [ORDER_STATUS.COMPLETED]: 'success',
  [ORDER_STATUS.CANCELLED]: 'danger',
};

export const STOCK_STATUS = {
  IN_STOCK: 'In Stock',
  LOW_STOCK: 'Low Stock',
  OUT_OF_STOCK: 'Out of Stock',
};

export const STOCK_STATUS_COLORS = {
  [STOCK_STATUS.IN_STOCK]: 'success',
  [STOCK_STATUS.LOW_STOCK]: 'warning',
  [STOCK_STATUS.OUT_OF_STOCK]: 'danger',
};

export const PRODUCT_CATEGORIES = [
  'Paper',
  'Pens',
  'Notebooks',
  'Pencils',
  'Accessories',
  'Office Supplies',
  'Markers',
];

export const USER_ROLES = {
  ADMIN: 'admin',
  CUSTOMER: 'customer',
};

export const DATASET_TYPES = {
  SALES_DATA: 'sales_data',
  PRODUCT_DATA: 'product_data',
  CUSTOMER_DATA: 'customer_data',
};

export const CHART_COLORS = {
  primary: '#3498db',
  secondary: '#2c3e50',
  success: '#27ae60',
  warning: '#f39c12',
  danger: '#e74c3c',
  info: '#3498db',
  light: '#ecf0f1',
  dark: '#2c3e50',
};

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 10,
  limits: [10, 20, 50, 100],
};

export const VALIDATION_RULES = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[+]?[\d\s-()]+$/,
  password: {
    minLength: 6,
    requireUppercase: false,
    requireLowercase: false,
    requireNumbers: false,
    requireSpecialChars: false,
  },
  price: {
    min: 0,
    max: 999999.99,
  },
  quantity: {
    min: 1,
    max: 9999,
  },
};

export const TOAST_CONFIG = {
  duration: 4000,
  position: 'top-right',
  style: {
    background: '#363636',
    color: '#fff',
  },
  success: {
    duration: 3000,
    iconTheme: {
      primary: '#4caf50',
      secondary: '#fff',
    },
  },
  error: {
    duration: 5000,
    iconTheme: {
      primary: '#f44336',
      secondary: '#fff',
    },
  },
};

export const ROUTES = {
  // Public routes
  LOGIN: '/login',
  SIGNUP: '/signup',
  ADMIN_LOGIN: '/admin/login',
  
  // Customer routes
  HOME: '/',
  CATALOG: '/catalog',
  CART: '/cart',
  ORDERS: '/orders',
  
  // Admin routes
  ADMIN: '/admin',
  ADMIN_PRODUCTS: '/admin/products',
  ADMIN_ORDERS: '/admin/orders',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_DIAGNOSTIC_ANALYTICS: '/admin/diagnostic-analytics',
  ADMIN_INVENTORY: '/admin/inventory',
  ADMIN_UPLOAD: '/admin/upload-dataset',
};

export const NAVIGATION_ITEMS = {
  customer: [
    { path: ROUTES.CATALOG, label: 'Products', icon: 'bi-box' },
    { path: ROUTES.CART, label: 'Cart', icon: 'bi-cart' },
    { path: ROUTES.ORDERS, label: 'Orders', icon: 'bi-receipt' },
  ],
  admin: [
    { path: ROUTES.ADMIN, label: 'Dashboard', icon: 'bi-speedometer2' },
    { path: ROUTES.ADMIN_PRODUCTS, label: 'Products', icon: 'bi-box' },
    { path: ROUTES.ADMIN_ORDERS, label: 'Orders', icon: 'bi-receipt' },
    { path: ROUTES.ADMIN_ANALYTICS, label: 'Analytics', icon: 'bi-graph-up' },
    { path: ROUTES.ADMIN_DIAGNOSTIC_ANALYTICS, label: 'Diagnostic Analytics', icon: 'bi-search' },
    { path: ROUTES.ADMIN_INVENTORY, label: 'Inventory Management', icon: 'bi-box-seam' },
    ...(APP_CONFIG.enableDatasetUpload ? [
      { path: ROUTES.ADMIN_UPLOAD, label: 'Upload Dataset', icon: 'bi-upload' }
    ] : []),
  ],
};
