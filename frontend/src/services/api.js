import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  customerLogin: (credentials) => api.post('/auth/customers/login', credentials),
  customerSignup: (userData) => api.post('/auth/customers/signup', userData),
  adminLogin: (credentials) => api.post('/auth/admin/login', credentials),
  getProfile: () => api.get('/auth/profile'),
};

// Product API endpoints
export const productAPI = {
  getProducts: (params) => api.get('/products', { params }),
  getProductById: (id) => api.get(`/products/${id}`),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
  getLowStockProducts: () => api.get('/products/admin/low-stock'),
};

// Cart API endpoints
export const cartAPI = {
  getCart: () => api.get('/cart'),
  addToCart: (data) => api.post('/cart/add', data),
  updateCartItem: (id, data) => api.put(`/cart/${id}`, data),
  removeFromCart: (id) => api.delete(`/cart/${id}`),
  clearCart: () => api.delete('/cart'),
  getCartSummary: () => api.get('/cart/summary'),
  validateCart: () => api.post('/cart/validate'),
};

// Order API endpoints
export const orderAPI = {
  createOrder: (data) => api.post('/orders', data),
  getCustomerOrders: (params) => api.get('/orders/my-orders', { params }),
  getOrderById: (id) => api.get(`/orders/${id}`),
  getAllOrders: (params) => api.get('/orders/all', { params }),
  updateOrderStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  getOrderStatistics: (params) => api.get('/orders/statistics', { params }),
  exportCompletedOrders: (params) => api.get('/orders/export/completed', { 
    params, 
    responseType: 'blob' // Important for file download
  }),
};

// Analytics API endpoints
export const analyticsAPI = {
  getMonthlySales: (params) => api.get('/analytics/monthly-sales', { params }),
  getMonthlySalesPublic: (params) => api.get('/analytics/monthly-sales-public', { params }),
  getTopProducts: (params) => api.get('/analytics/top-products', { params }),
  getCategorySales: (params) => api.get('/analytics/category-sales', { params }),
  getLowStockAlerts: (params) => api.get('/analytics/low-stock', { params }),
  getDashboardSummary: (params) => api.get('/analytics/dashboard-summary', { params }),
  getSalesTrends: (params) => api.get('/analytics/sales-trends', { params }),
  getCustomerAnalytics: (params) => api.get('/analytics/customer-analytics', { params }),
};

// Sales Analytics API endpoints (new - based on completed_at)
export const salesAnalyticsAPI = {
  getSalesAnalytics: (dates) => api.post('/sales/analytics', { dates }),
  getSalesTrends: (params) => api.get('/sales/trends', { params }),
};

// Upload API endpoints
export const uploadAPI = {
  uploadDataset: (formData) => api.post('/upload/dataset', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  downloadTemplate: (type) => api.get(`/upload/template/${type}`),
  saveUploadedDataset: (dataset) => api.post('/upload/save-dataset', dataset),
  getUploadedDatasets: () => api.get('/upload/datasets'),
  deleteUploadedDataset: (id) => api.delete(`/upload/dataset/${id}`),
};

export default api;
