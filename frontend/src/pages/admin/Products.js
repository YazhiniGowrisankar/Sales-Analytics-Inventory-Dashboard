import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Table, Modal, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { productAPI } from '../../services/api';
import { APP_CONFIG, STOCK_STATUS, STOCK_STATUS_COLORS } from '../../utils/constants';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [showLowStockModal, setShowLowStockModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    stock_quantity: '',
    description: ''
  });

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadLowStockProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getProducts({ limit: 100 });
      setProducts(response.data.data.products); // Access the nested data
    } catch (error) {
      setError('Failed to load products');
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await productAPI.getCategories();
      setCategories(response.data.data.categories); // Access the nested data
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadLowStockProducts = async () => {
    try {
      const response = await productAPI.getLowStockProducts();
      setLowStockProducts(response.data.data.products); // Access the nested data
    } catch (error) {
      console.error('Error loading low stock products:', error);
    }
  };

  const handleShowModal = (product = null) => {
    setEditingProduct(product);
    if (product) {
      setFormData({
        name: product.name,
        category: product.category,
        price: product.price,
        stock_quantity: product.stock_quantity,
        description: product.description || ''
      });
    } else {
      setFormData({
        name: '',
        category: '',
        price: '',
        stock_quantity: '',
        description: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      category: '',
      price: '',
      stock_quantity: '',
      description: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setError('');

    try {
      if (editingProduct) {
        await productAPI.updateProduct(editingProduct.product_id, formData);
      } else {
        await productAPI.createProduct(formData);
      }
      
      loadProducts();
      loadLowStockProducts();
      handleCloseModal();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save product');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await productAPI.deleteProduct(productId);
      loadProducts();
      loadLowStockProducts();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete product');
    }
  };

  const getStockBadge = (stockQuantity) => {
    let status, variant;
    
    if (stockQuantity === 0) {
      status = STOCK_STATUS.OUT_OF_STOCK;
      variant = STOCK_STATUS_COLORS[STOCK_STATUS.OUT_OF_STOCK];
    } else if (stockQuantity <= 10) {
      status = STOCK_STATUS.LOW_STOCK;
      variant = STOCK_STATUS_COLORS[STOCK_STATUS.LOW_STOCK];
    } else {
      status = STOCK_STATUS.IN_STOCK;
      variant = STOCK_STATUS_COLORS[STOCK_STATUS.IN_STOCK];
    }

    return <span className={`badge bg-${variant}`}>{status}</span>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">Product Management</h2>
        <div>
          <Button 
            variant="warning" 
            className="me-2"
            onClick={() => setShowLowStockModal(true)}
            disabled={lowStockProducts.length === 0}
          >
            <i className="bi bi-exclamation-triangle me-2"></i>
            Low Stock ({lowStockProducts.length})
          </Button>
          <Button variant="primary" onClick={() => handleShowModal()}>
            <i className="bi bi-plus-circle me-2"></i>
            Add Product
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card>
        <Card.Header>
          <h5 className="mb-0">Products ({products.length})</h5>
        </Card.Header>
        <Card.Body>
          <div className="table-responsive">
            <Table hover striped>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.product_id}>
                    <td>{product.product_id}</td>
                    <td>
                      <div>
                        <div className="fw-bold">{product.name}</div>
                        {product.description && (
                          <small className="text-muted">
                            {product.description.length > 50 
                              ? `${product.description.substring(0, 50)}...` 
                              : product.description}
                          </small>
                        )}
                      </div>
                    </td>
                    <td>{product.category}</td>
                    <td>{APP_CONFIG.currency}{parseFloat(product.price).toFixed(2)}</td>
                    <td>{product.stock_quantity}</td>
                    <td>{getStockBadge(product.stock_quantity)}</td>
                    <td>{formatDate(product.created_at)}</td>
                    <td>
                      <div className="btn-group">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleShowModal(product)}
                        >
                          <i className="bi bi-pencil"></i>
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(product.product_id)}
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Add/Edit Product Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Product Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Category *</Form.Label>
                  <Form.Select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Price *</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Stock Quantity *</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    name="stock_quantity"
                    value={formData.stock_quantity}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Product description (optional)"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={modalLoading}>
            {modalLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle me-2"></i>
                {editingProduct ? 'Update Product' : 'Add Product'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Low Stock Alert Modal */}
      <Modal show={showLowStockModal} onHide={() => setShowLowStockModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-exclamation-triangle me-2 text-warning"></i>
            Low Stock Alert
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <i className="bi bi-info-circle me-2"></i>
            The following products have low stock levels and need to be restocked soon.
          </Alert>
          
          {lowStockProducts.length === 0 ? (
            <p className="text-muted">No products with low stock.</p>
          ) : (
            <div className="table-responsive">
              <Table hover>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th>Status</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map(product => (
                    <tr key={product.product_id}>
                      <td>{product.name}</td>
                      <td>{product.category}</td>
                      <td>{product.stock_quantity}</td>
                      <td>{getStockBadge(product.stock_quantity)}</td>
                      <td>{APP_CONFIG.currency}{parseFloat(product.price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLowStockModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ProductManagement;
