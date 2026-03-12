import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Table, Badge, Alert, Spinner, Modal, Row, Col, Form } from 'react-bootstrap';
import { orderAPI } from '../../services/api';
import { APP_CONFIG, ORDER_STATUS, ORDER_STATUS_COLORS } from '../../utils/constants';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    customer_id: '',
    start_date: '',
    end_date: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      };
      
      const response = await orderAPI.getAllOrders(params);
      const ordersData = response.data.data.orders || []; // Ensure it's an array
      const paginationData = response.data.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };
      
      setOrders(ordersData);
      setPagination(paginationData);
    } catch (error) {
      setError('Failed to load orders');
      console.error('Error loading orders:', error);
      // Ensure orders is always an array even on error
      setOrders([]);
      setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const viewOrderDetails = async (orderId) => {
    try {
      const response = await orderAPI.getOrderById(orderId);
      setSelectedOrder(response.data.data.order); // Access the nested data
      setShowOrderModal(true);
    } catch (error) {
      setError('Failed to load order details');
      console.error('Error loading order details:', error);
    }
  };

  const openStatusModal = (order) => {
    if (!order) {
      setError('Invalid order data');
      return;
    }
    setSelectedOrder(order);
    setNewStatus(order.status || ''); // Use empty string as fallback
    setShowStatusModal(true);
  };

  const updateOrderStatus = async () => {
    if (!selectedOrder || !selectedOrder.order_id) {
      setError('No order selected');
      return;
    }
    
    try {
      setStatusUpdateLoading(true);
      await orderAPI.updateOrderStatus(selectedOrder.order_id, { status: newStatus });
      
      // Update local state
      setOrders(prev => prev.map(order => 
        order.order_id === selectedOrder.order_id 
          ? { ...order, status: newStatus }
          : order
      ));
      
      // If status changed to "Completed", show export notification
      if (newStatus === ORDER_STATUS.COMPLETED) {
        setTimeout(() => {
          if (window.confirm(`Order #${selectedOrder.order_id} has been marked as completed! Would you like to export this order to CSV?`)) {
            handleExportSingleOrder(selectedOrder.order_id);
          }
        }, 500);
      }
      
      setShowStatusModal(false);
      setSelectedOrder(null);
      setNewStatus('');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update order status');
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleExportSingleOrder = async (orderId) => {
    try {
      const response = await orderAPI.exportCompletedOrders({
        start_date: new Date(0).toISOString().split('T')[0], // Very old date
        end_date: new Date().toISOString().split('T')[0]     // Today
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `order_${orderId}_completed.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      setError('Failed to export order');
      console.error('Export error:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleExportCompletedOrders = async () => {
    try {
      const params = {};
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      
      const response = await orderAPI.exportCompletedOrders(params);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `completed_orders_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      setError('Failed to export completed orders');
      console.error('Export error:', error);
    }
  };

  const getStatusBadge = (status) => {
    const variant = ORDER_STATUS_COLORS[status] || 'secondary';
    return <Badge bg={variant}>{status}</Badge>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && orders.length === 0) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">Order Management</h2>
        <div className="d-flex gap-2">
          <Button variant="success" onClick={handleExportCompletedOrders}>
            <i className="bi bi-download me-2"></i>
            Export Completed Orders
          </Button>
          <Button variant="primary" onClick={loadOrders}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            Refresh
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <h5 className="mb-3">Filters</h5>
          <Row>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">All Status</option>
                  {Object.values(ORDER_STATUS).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Customer ID</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="Customer ID"
                  value={filters.customer_id}
                  onChange={(e) => handleFilterChange('customer_id', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>End Date</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header>
          <h5 className="mb-0">Orders ({pagination.total})</h5>
        </Card.Header>
        <Card.Body>
          <div className="table-responsive">
            <Table hover striped>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders && orders.length > 0 ? (
                  orders.map(order => (
                    <tr key={order.order_id}>
                      <td>
                        <strong>#{order.order_id}</strong>
                      </td>
                      <td>
                        <div>
                          <div className="fw-bold">{order.customer_name}</div>
                          <small className="text-muted">{order.shop_name}</small>
                        </div>
                      </td>
                      <td>{formatDate(order.order_date)}</td>
                      <td>{order.item_count || 0}</td>
                      <td>{APP_CONFIG.currency}{parseFloat(order.total_amount).toFixed(2)}</td>
                      <td>{getStatusBadge(order.status)}</td>
                      <td>
                        <div className="btn-group">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => viewOrderDetails(order.order_id)}
                          >
                            <i className="bi bi-eye me-1"></i>
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      {loading ? 'Loading orders...' : 'No orders found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <div className="btn-group">
                <Button
                  variant="outline-primary"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  Previous
                </Button>
                <span className="btn btn-outline-primary" disabled>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline-primary"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Order Details Modal */}
      <Modal 
        show={showOrderModal} 
        onHide={() => setShowOrderModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Order Details - #{selectedOrder?.order?.order_id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrder && selectedOrder.order && (
            <div>
              <Row className="mb-4">
                <Col md={6}>
                  <h6>Order Information</h6>
                  <p><strong>Order ID:</strong> #{selectedOrder.order.order_id}</p>
                  <p><strong>Date:</strong> {formatDate(selectedOrder.order.order_date)}</p>
                  <p><strong>Status:</strong> {getStatusBadge(selectedOrder.order.status)}</p>
                  <p><strong>Total Amount:</strong> {APP_CONFIG.currency}{parseFloat(selectedOrder.order.total_amount).toFixed(2)}</p>
                </Col>
                <Col md={6}>
                  <h6>Customer Information</h6>
                  <p><strong>Name:</strong> {selectedOrder.order.customer_name}</p>
                  <p><strong>Shop:</strong> {selectedOrder.order.shop_name}</p>
                  <p><strong>Email:</strong> {selectedOrder.order.email}</p>
                  <p><strong>Phone:</strong> {selectedOrder.order.phone || 'N/A'}</p>
                </Col>
              </Row>

              <h6>Order Items</h6>
              <Table responsive>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map(item => (
                    <tr key={item.order_item_id}>
                      <td>{item.product_name}</td>
                      <td>{item.category}</td>
                      <td>{item.quantity}</td>
                      <td>{APP_CONFIG.currency}{parseFloat(item.price).toFixed(2)}</td>
                      <td>{APP_CONFIG.currency}{parseFloat(item.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan="4">Total</th>
                    <th>{APP_CONFIG.currency}{parseFloat(selectedOrder.order.total_amount).toFixed(2)}</th>
                  </tr>
                </tfoot>
              </Table>

              {selectedOrder.order.address && (
                <div className="mt-3">
                  <h6>Delivery Address</h6>
                  <p className="text-muted">{selectedOrder.order.address}</p>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowOrderModal(false)}>
            Close
          </Button>
          <Button variant="warning" onClick={() => {
            setShowOrderModal(false);
            openStatusModal(selectedOrder);
          }}>
            <i className="bi bi-pencil me-2"></i>
            Update Status
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Status Update Modal */}
      <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Update Order Status - #{selectedOrder?.order?.order_id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>New Status</Form.Label>
            <Form.Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              {Object.values(ORDER_STATUS).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStatusModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={updateOrderStatus}
            disabled={statusUpdateLoading}
          >
            {statusUpdateLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Updating...
              </>
            ) : (
              'Update Status'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default OrderManagement;
