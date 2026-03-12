import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Alert, Spinner, Badge } from 'react-bootstrap';
import { analyticsAPI } from '../../services/api';
import { APP_CONFIG, ORDER_STATUS } from '../../utils/constants';

const AdminDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentOrders, setRecentOrders] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load dashboard summary
      const summaryResponse = await analyticsAPI.getDashboardSummary();
      const summaryData = summaryResponse.data.data.summary; // Access the nested data
      setSummary(summaryData);
      setRecentOrders(summaryData.recent_orders);
      setTopCustomers(summaryData.top_customers);
      
    } catch (error) {
      setError('Failed to load dashboard data');
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const variant = status === ORDER_STATUS.COMPLETED ? 'dark' :
                   status === ORDER_STATUS.PENDING ? 'warning' :
                   status === ORDER_STATUS.PROCESSING ? 'info' : 'danger';
    return <Badge bg={variant}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">Admin Dashboard</h2>
        <div className="text-muted">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {summary && (
        <>
          {/* Summary Cards */}
          <Row className="mb-4">
            <Col md={3} className="mb-3">
              <Card className="dashboard-card">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="card-title">Total Revenue</div>
                    <div className="card-value">
                      {APP_CONFIG.currency}{summary.orders.total_revenue.toFixed(2)}
                    </div>
                    <div className="card-subtitle">All time</div>
                  </div>
                  <div className="text-success">
                    <i className="bi bi-currency-dollar display-4"></i>
                  </div>
                </div>
              </Card>
            </Col>
            
            <Col md={3} className="mb-3">
              <Card className="dashboard-card">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="card-title">Total Orders</div>
                    <div className="card-value">{summary.orders.total_orders}</div>
                    <div className="card-subtitle">
                      {summary.orders.completed_orders} completed
                    </div>
                  </div>
                  <div className="text-primary">
                    <i className="bi bi-receipt display-4"></i>
                  </div>
                </div>
              </Card>
            </Col>
            
            <Col md={3} className="mb-3">
              <Card className="dashboard-card">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="card-title">Total Products</div>
                    <div className="card-value">{summary.products.total_products}</div>
                    <div className="card-subtitle">
                      {summary.products.low_stock} low stock
                    </div>
                  </div>
                  <div className="text-warning">
                    <i className="bi bi-box display-4"></i>
                  </div>
                </div>
              </Card>
            </Col>
            
            <Col md={3} className="mb-3">
              <Card className="dashboard-card">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="card-title">Total Customers</div>
                    <div className="card-value">{summary.customers.total_customers}</div>
                    <div className="card-subtitle">
                      {summary.customers.new_customers_month} new this month
                    </div>
                  </div>
                  <div className="text-info">
                    <i className="bi bi-people display-4"></i>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Order Status Overview */}
          <Row className="mb-4">
            <Col md={6}>
              <Card className="dashboard-card">
                <h5 className="card-title">Order Status Overview</h5>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-warning">
                      <i className="bi bi-clock me-2"></i>
                      Pending: {summary.orders.pending_orders}
                    </div>
                  </div>
                  <div>
                    <div className="text-info">
                      <i className="bi bi-gear me-2"></i>
                      Processing: {summary.orders.processing_orders}
                    </div>
                  </div>
                  <div>
                    <div className="text-warning">
                      <i className="bi bi-check-circle me-2"></i>
                      Completed: {summary.orders.completed_orders}
                    </div>
                  </div>
                  <div>
                    <div className="text-danger">
                      <i className="bi bi-x-circle me-2"></i>
                      Cancelled: {summary.orders.cancelled_orders}
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
            
            <Col md={6}>
              <Card className="dashboard-card">
                <h5 className="card-title">Product Inventory Status</h5>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-success">
                      <i className="bi bi-check-circle me-2"></i>
                      In Stock: {summary.products.total_products - summary.products.low_stock - summary.products.out_of_stock}
                    </div>
                  </div>
                  <div>
                    <div className="text-warning">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      Low Stock: {summary.products.low_stock}
                    </div>
                  </div>
                  <div>
                    <div className="text-danger">
                      <i className="bi bi-x-circle me-2"></i>
                      Out of Stock: {summary.products.out_of_stock}
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Recent Orders and Top Customers */}
          <Row>
            <Col lg={8}>
              <Card className="dashboard-card">
                <h5 className="card-title">Recent Orders</h5>
                {recentOrders.length === 0 ? (
                  <p className="text-muted">No recent orders</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Customer</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map(order => (
                          <tr key={order.order_id}>
                            <td>#{order.order_id}</td>
                            <td>
                              <div>
                                <div>{order.customer_name}</div>
                                <small className="text-muted">{order.shop_name}</small>
                              </div>
                            </td>
                            <td>{APP_CONFIG.currency}{parseFloat(order.total_amount).toFixed(2)}</td>
                            <td>{getStatusBadge(order.status)}</td>
                            <td>{formatDate(order.order_date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </Col>
            
            <Col lg={4}>
              <Card className="dashboard-card">
                <h5 className="card-title">Top Customers</h5>
                {topCustomers.length === 0 ? (
                  <p className="text-muted">No customer data available</p>
                ) : (
                  <div>
                    {topCustomers.map((customer, index) => (
                      <div key={customer.customer_id} className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                        <div>
                          <div className="fw-bold">{customer.name}</div>
                          <small className="text-muted">{customer.shop_name}</small>
                          <div className="text-muted small">
                            {customer.total_orders} orders
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="fw-bold text-primary">
                            {APP_CONFIG.currency}{parseFloat(customer.total_revenue).toFixed(2)}
                          </div>
                          <small className="text-muted">
                            Avg: {APP_CONFIG.currency}{parseFloat(customer.avg_order_value).toFixed(2)}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          {/* Quick Stats */}
          <Row className="mt-4">
            <Col md={4}>
              <Card className="dashboard-card">
                <h6 className="card-title">Average Order Value</h6>
                <div className="card-value">
                  {APP_CONFIG.currency}{parseFloat(summary.orders.avg_order_value).toFixed(2)}
                </div>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="dashboard-card">
                <h6 className="card-title">Average Product Price</h6>
                <div className="card-value">
                  {APP_CONFIG.currency}{parseFloat(summary.products.avg_product_price).toFixed(2)}
                </div>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="dashboard-card">
                <h6 className="card-title">Active Customers (Period)</h6>
                <div className="card-value">
                  {summary.customers.unique_customers_period}
                </div>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
