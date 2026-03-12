import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Table, Modal, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { cartAPI, orderAPI } from '../../services/api';
import { APP_CONFIG } from '../../utils/constants';

const ShoppingCart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      setLoading(true);
      const response = await cartAPI.getCart();
      setCartItems(response.data.data.cart_items); // Access nested data
      setTotal(response.data.data.total); // Access nested data
      setItemCount(response.data.data.item_count); // Access nested data
    } catch (error) {
      setError('Failed to load cart');
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (cartId, newQuantity) => {
    try {
      await cartAPI.updateCartItem(cartId, { quantity: newQuantity });
      loadCart();
    } catch (error) {
      setError('Failed to update quantity');
      console.error('Error updating quantity:', error);
    }
  };

  const removeFromCart = async (cartId) => {
    try {
      await cartAPI.removeFromCart(cartId);
      loadCart();
    } catch (error) {
      setError('Failed to remove item');
      console.error('Error removing item:', error);
    }
  };

  const clearCart = async () => {
    try {
      await cartAPI.clearCart();
      loadCart();
    } catch (error) {
      setError('Failed to clear cart');
      console.error('Error clearing cart:', error);
    }
  };

  const handleCheckout = async () => {
    try {
      setCheckoutLoading(true);
      
      // Validate cart first
      const validationResponse = await cartAPI.validateCart();
      if (!validationResponse.data.data.is_valid) { // Access nested data
        setError('Some items in your cart have insufficient stock. Please update your cart.');
        return;
      }

      // Prepare order data
      const orderData = {
        cart_items: cartItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price
        }))
      };

      // Create order
      const orderResponse = await orderAPI.createOrder(orderData);
      
      if (orderResponse.data.success) {
        alert('Order placed successfully!');
        clearCart();
        // Redirect to orders page
        window.location.href = '/customer/orders';
      } else {
        setError('Failed to place order: ' + (orderResponse.data.message || 'Unknown error'));
      }
    } catch (error) {
      setError('Failed to place order');
      console.error('Error placing order:', error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading cart...</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">Shopping Cart</h2>
        <Button variant="outline-danger" onClick={clearCart} disabled={cartItems.length === 0}>
          <i className="bi bi-trash me-2"></i>
          Clear Cart
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {cartItems.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <i className="bi bi-cart-x display-1 text-muted"></i>
            <h5 className="mt-3">Your cart is empty</h5>
            <p className="text-muted">Add some products to get started!</p>
            <Button variant="primary" href="/catalog">
              <i className="bi bi-arrow-left me-2"></i>
              Continue Shopping
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Row>
          <Col lg={8}>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Cart Items ({itemCount})</h5>
              </Card.Header>
              <Card.Body>
                <Table responsive>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Quantity</th>
                      <th>Subtotal</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map(item => (
                      <tr key={item.cart_id}>
                        <td>
                          <div>
                            <h6 className="mb-0">{item.name}</h6>
                            <small className="text-muted">{item.category}</small>
                          </div>
                        </td>
                        <td>{APP_CONFIG.currency}{parseFloat(item.price).toFixed(2)}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => updateQuantity(item.cart_id, Math.max(1, item.quantity - 1))}
                              disabled={item.quantity <= 1}
                            >
                              -
                            </Button>
                            <Form.Control
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newQuantity = parseInt(e.target.value) || 1;
                                updateQuantity(item.cart_id, Math.min(newQuantity, item.stock_quantity));
                              }}
                              className="mx-2 text-center"
                              style={{ width: '60px' }}
                              min="1"
                              max={item.stock_quantity}
                            />
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => updateQuantity(item.cart_id, Math.min(item.quantity + 1, item.stock_quantity))}
                              disabled={item.quantity >= item.stock_quantity}
                            >
                              +
                            </Button>
                          </div>
                        </td>
                        <td>{APP_CONFIG.currency}{parseFloat(item.subtotal).toFixed(2)}</td>
                        <td>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => removeFromCart(item.cart_id)}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="position-sticky" style={{ top: '20px' }}>
              <Card.Header>
                <h5 className="mb-0">Order Summary</h5>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-2">
                    <span>Subtotal ({itemCount} items)</span>
                    <span>{APP_CONFIG.currency}{parseFloat(total).toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Delivery Fee</span>
                    <span>{APP_CONFIG.currency}0.00</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Tax</span>
                    <span>{APP_CONFIG.currency}0.00</span>
                  </div>
                  <hr />
                  <div className="d-flex justify-content-between fw-bold">
                    <span>Total</span>
                    <span>{APP_CONFIG.currency}{parseFloat(total).toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-100"
                  onClick={() => setShowCheckoutModal(true)}
                >
                  <i className="bi bi-credit-card me-2"></i>
                  Proceed to Checkout
                </Button>

                <Button
                  variant="outline-primary"
                  className="w-100 mt-2"
                  href="/catalog"
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Continue Shopping
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Checkout Modal */}
      <Modal show={showCheckoutModal} onHide={() => setShowCheckoutModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Checkout Confirmation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to place this order?</p>
          <h5>Order Total: {APP_CONFIG.currency}{parseFloat(total).toFixed(2)}</h5>
          <p className="text-muted">This will create an order with {itemCount} items.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCheckoutModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCheckout}
            disabled={checkoutLoading}
          >
            {checkoutLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Placing Order...
              </>
            ) : (
              'Confirm Order'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ShoppingCart;
