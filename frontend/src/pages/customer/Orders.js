import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Table, Badge, Alert, Spinner, Modal, Row, Col } from 'react-bootstrap';
import { orderAPI } from '../../services/api';
import { APP_CONFIG, ORDER_STATUS, ORDER_STATUS_COLORS } from '../../utils/constants';

const CustomerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
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
        page: pagination.page,
        limit: pagination.limit
      };
      
      const response = await orderAPI.getCustomerOrders(params);
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
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const viewOrderDetails = async (orderId) => {
    try {
      const response = await orderAPI.getOrderById(orderId);
      const orderData = response.data?.data?.order; // Safe access with optional chaining
      if (orderData) {
        setSelectedOrder(orderData);
        setShowOrderModal(true);
      } else {
        setError('Order not found');
      }
    } catch (error) {
      setError('Failed to load order details');
      console.error('Error loading order details:', error);
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
        <h2 className="fw-bold">My Orders</h2>
        <Button variant="primary" href="/catalog">
          <i className="bi bi-plus-circle me-2"></i>
          New Order
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {orders.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <i className="bi bi-receipt display-1 text-muted"></i>
            <h5 className="mt-3">No orders yet</h5>
            <p className="text-muted">Start shopping to see your orders here!</p>
            <Button variant="primary" href="/catalog">
              <i className="bi bi-arrow-left me-2"></i>
              Start Shopping
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Card>
          <Card.Header>
            <h5 className="mb-0">Order History</h5>
          </Card.Header>
          <Card.Body>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders && orders.length > 0 ? (
                  orders.map(order => (
                    <tr key={order.order_id}>
                      <td>
                        <strong>#{order.order_id}</strong>
                      </td>
                      <td>{formatDate(order.order_date)}</td>
                      <td>{order.item_count || 0}</td>
                      <td>{APP_CONFIG.currency}{parseFloat(order.total_amount).toFixed(2)}</td>
                      <td>{getStatusBadge(order.status)}</td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => viewOrderDetails(order.order_id)}
                        >
                          <i className="bi bi-eye me-1"></i>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center">
                      {loading ? 'Loading orders...' : 'No orders found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>

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
      )}

      {/* Order Details Modal */}
      <Modal 
        show={showOrderModal} 
        onHide={() => setShowOrderModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Order Details - #{selectedOrder?.order_id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrder && (
            <div>
              <Row className="mb-4">
                <Col md={6}>
                  <h6>Order Information</h6>
                  <p><strong>Order ID:</strong> #{selectedOrder?.order_id || 'N/A'}</p>
                  <p><strong>Date:</strong> {selectedOrder?.order_date ? formatDate(selectedOrder.order_date) : 'N/A'}</p>
                  <p><strong>Status:</strong> {selectedOrder?.status ? getStatusBadge(selectedOrder.status) : 'N/A'}</p>
                  <p><strong>Total Amount:</strong> {selectedOrder?.total_amount ? `${APP_CONFIG.currency}${parseFloat(selectedOrder.total_amount).toFixed(2)}` : 'N/A'}</p>
                </Col>
                <Col md={6}>
                  <h6>Customer Information</h6>
                  <p><strong>Name:</strong> {selectedOrder?.customer_name || 'N/A'}</p>
                  <p><strong>Shop:</strong> {selectedOrder?.shop_name || 'N/A'}</p>
                  <p><strong>Email:</strong> {selectedOrder?.email || 'N/A'}</p>
                  <p><strong>Phone:</strong> {selectedOrder?.phone || 'N/A'}</p>
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
                  {selectedOrder?.items?.map(item => (
                    <tr key={item.order_item_id}>
                      <td>{item.product_name || 'N/A'}</td>
                      <td>{item.category || 'N/A'}</td>
                      <td>{item.quantity || 'N/A'}</td>
                      <td>{item.price ? `${APP_CONFIG.currency}${parseFloat(item.price).toFixed(2)}` : 'N/A'}</td>
                      <td>{item.subtotal ? `${APP_CONFIG.currency}${parseFloat(item.subtotal).toFixed(2)}` : 'N/A'}</td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan="5" className="text-center">No items found</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan="4">Total</th>
                    <th>{selectedOrder?.total_amount ? `${APP_CONFIG.currency}${parseFloat(selectedOrder.total_amount).toFixed(2)}` : 'N/A'}</th>
                  </tr>
                </tfoot>
              </Table>

              {selectedOrder?.order?.address && (
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
          {selectedOrder?.order?.status === ORDER_STATUS.PENDING && (
            <Button variant="danger">
              <i className="bi bi-x-circle me-2"></i>
              Cancel Order
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default CustomerOrders;
