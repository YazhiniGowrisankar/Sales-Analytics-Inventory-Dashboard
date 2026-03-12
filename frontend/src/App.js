import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Layout Components
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import Footer from './components/common/Footer';

// Customer Pages
import CustomerLogin from './pages/customer/Login';
import CustomerSignup from './pages/customer/Signup';
import ProductCatalog from './pages/customer/Catalog';
import ShoppingCart from './pages/customer/Cart';
import CustomerOrders from './pages/customer/Orders';

// Admin Pages
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import ProductManagement from './pages/admin/Products';
import OrderManagement from './pages/admin/Orders';
import InventoryManagement from './pages/admin/InventoryManagement';
import EnhancedAnalytics from './pages/admin/EnhancedAnalytics';
import UploadDataset from './pages/admin/UploadDataset';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/catalog'} replace />;
  }

  return children;
};

// Layout Wrapper
const Layout = ({ children, showSidebar = false }) => (
  <div className="min-vh-100 d-flex flex-column">
    <Navbar />
    <div className="flex-grow-1 d-flex">
      {showSidebar && <Sidebar />}
      <main className={`flex-grow-1 ${showSidebar ? 'ms-0' : ''}`}>
        <div className="container-fluid p-4">
          {children}
        </div>
      </main>
    </div>
    <Footer />
  </div>
);

function App() {
  return (
    <div className="App">
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<CustomerLogin />} />
        <Route path="/signup" element={<CustomerSignup />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Customer Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute requiredRole="customer">
              <Layout>
                <ProductCatalog />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/catalog"
          element={
            <ProtectedRoute requiredRole="customer">
              <Layout>
                <ProductCatalog />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cart"
          element={
            <ProtectedRoute requiredRole="customer">
              <Layout>
                <ShoppingCart />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute requiredRole="customer">
              <Layout>
                <CustomerOrders />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <Layout showSidebar={true}>
                <AdminDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <ProtectedRoute requiredRole="admin">
              <Layout showSidebar={true}>
                <ProductManagement />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute requiredRole="admin">
              <Layout showSidebar={true}>
                <OrderManagement />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/inventory"
          element={
            <ProtectedRoute requiredRole="admin">
              <Layout showSidebar={true}>
                <InventoryManagement />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute requiredRole="admin">
              <Layout showSidebar={true}>
                <EnhancedAnalytics />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/upload-dataset"
          element={
            <ProtectedRoute requiredRole="admin">
              <Layout showSidebar={true}>
                <UploadDataset />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
