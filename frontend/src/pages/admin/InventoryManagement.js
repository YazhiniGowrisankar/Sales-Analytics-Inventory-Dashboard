import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Form, Alert, Spinner, Row, Col, Badge, Modal } from 'react-bootstrap';
import { productAPI } from '../../services/api';
import { APP_CONFIG } from '../../utils/constants';
import '../../styles/InventoryManagement.css';

const InventoryManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        search: searchTerm || undefined,
        category: categoryFilter || undefined,
        sortBy,
        page: currentPage,
        limit: 20
      };

      // Add stock filter if selected
      if (stockFilter) {
        if (stockFilter === 'low') {
          params.maxStock = 10;
        } else if (stockFilter === 'out') {
          params.maxStock = 0;
        }
      }

      const response = await productAPI.getProducts(params);
      setProducts(response.data.products || []);
      setTotalPages(response.data.totalPages || 1);
      setError('');
    } catch (err) {
      setError('Failed to fetch products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, categoryFilter, stockFilter, sortBy, currentPage]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setEditForm({
      name: product.name,
      category: product.category,
      price: product.price,
      stock_quantity: product.stock_quantity,
      description: product.description
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await productAPI.updateProduct(selectedProduct.product_id, editForm);
      setShowEditModal(false);
      setSelectedProduct(null);
      setEditForm({});
      fetchProducts();
    } catch (err) {
      setError('Failed to update product');
      console.error('Error updating product:', err);
    }
  };

  const getStockBadge = (stock) => {
    if (stock === 0) {
      return <Badge bg="danger">Out of Stock</Badge>;
    } else if (stock <= 10) {
      return <Badge bg="warning">Low Stock</Badge>;
    } else {
      return <Badge bg="success">In Stock</Badge>;
    }
  };

  const getStockClass = (stock) => {
    if (stock === 0) return 'stock-out';
    if (stock <= 10) return 'stock-low';
    return 'stock-good';
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryFilter = (e) => {
    setCategoryFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleStockFilter = (e) => {
    setStockFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleSort = (e) => {
    setSortBy(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="inventory-management fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Inventory Management</h2>
        <Button variant="primary" onClick={() => fetchProducts()}>
          <i className="bi bi-arrow-clockwise me-2"></i>
          Refresh
        </Button>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label>Search Products</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Category</Form.Label>
                <Form.Select value={categoryFilter} onChange={handleCategoryFilter}>
                  <option value="">All Categories</option>
                  <option value="Paper">Paper</option>
                  <option value="Pens">Pens</option>
                  <option value="Notebooks">Notebooks</option>
                  <option value="Pencils">Pencils</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Markers">Markers</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Stock Status</Form.Label>
                <Form.Select value={stockFilter} onChange={handleStockFilter}>
                  <option value="">All Products</option>
                  <option value="low">Low Stock (≤10)</option>
                  <option value="out">Out of Stock</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Sort By</Form.Label>
                <Form.Select value={sortBy} onChange={handleSort}>
                  <option value="name">Name</option>
                  <option value="category">Category</option>
                  <option value="price">Price</option>
                  <option value="stock_quantity">Stock Quantity</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Products Table */}
      <Card>
        <Card.Body>
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted">No products found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock Quantity</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.product_id}>
                      <td>
                        <div>
                          <strong>{product.name}</strong>
                          {product.description && (
                            <small className="text-muted d-block">{product.description}</small>
                          )}
                        </div>
                      </td>
                      <td>
                        <Badge bg="secondary">{product.category}</Badge>
                      </td>
                      <td className="text-end">
                        {APP_CONFIG.currency}{product.price.toFixed(2)}
                      </td>
                      <td className={`text-center ${getStockClass(product.stock_quantity)}`}>
                        <strong>{product.stock_quantity}</strong>
                      </td>
                      <td>{getStockBadge(product.stock_quantity)}</td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleEdit(product)}
                        >
                          <i className="bi bi-pencil"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <div className="pagination">
            <Button
              variant="outline-secondary"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Previous
            </Button>
            <span className="mx-3 align-self-center">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline-secondary"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Product</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdate}>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Product Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Category</Form.Label>
                  <Form.Select
                    value={editForm.category || ''}
                    onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                    required
                  >
                    <option value="">Select Category</option>
                    <option value="Paper">Paper</option>
                    <option value="Pens">Pens</option>
                    <option value="Notebooks">Notebooks</option>
                    <option value="Pencils">Pencils</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Markers">Markers</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Price</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.price || ''}
                    onChange={(e) => setEditForm({...editForm, price: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Stock Quantity</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={editForm.stock_quantity || ''}
                    onChange={(e) => setEditForm({...editForm, stock_quantity: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Update Product
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default InventoryManagement;
