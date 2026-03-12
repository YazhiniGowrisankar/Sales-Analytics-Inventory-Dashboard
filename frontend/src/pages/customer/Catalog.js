import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Button, Form, Badge, Alert, Spinner } from 'react-bootstrap';
import { productAPI, cartAPI } from '../../services/api';
import { APP_CONFIG, STOCK_STATUS, STOCK_STATUS_COLORS } from '../../utils/constants';

const ProductCatalog = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'name',
    sortOrder: 'ASC'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      };
      
      const response = await productAPI.getProducts(params);
      setProducts(response.data.data.products); // Access the nested data
      setPagination(response.data.data.pagination); // Access the nested data
    } catch (error) {
      setError('Failed to load products');
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  const loadCategories = useCallback(async () => {
    try {
      const response = await productAPI.getCategories();
      setCategories(response.data.data.categories); // Access the nested data
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleAddToCart = async (productId, quantity = 1) => {
    try {
      await cartAPI.addToCart({ product_id: productId, quantity });
      // Show success message (you can use toast here)
      alert('Product added to cart!');
    } catch (error) {
      alert('Failed to add product to cart');
      console.error('Error adding to cart:', error);
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

    return <Badge bg={variant}>{status}</Badge>;
  };

  if (loading && products.length === 0) {
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
        <h2 className="fw-bold">Product Catalog</h2>
        <Button variant="outline-primary">
          <i className="bi bi-cart me-2"></i>
          View Cart
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <h5 className="mb-3">Filters</h5>
          <Row>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Search products..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Category</Form.Label>
                <Form.Select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Min Price</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="0"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Max Price</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="9999"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Sort By</Form.Label>
                <Form.Select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-');
                    handleFilterChange('sortBy', sortBy);
                    handleFilterChange('sortOrder', sortOrder);
                  }}
                >
                  <option value="name-ASC">Name (A-Z)</option>
                  <option value="name-DESC">Name (Z-A)</option>
                  <option value="price-ASC">Price (Low to High)</option>
                  <option value="price-DESC">Price (High to Low)</option>
                  <option value="stock_quantity-ASC">Stock (Low to High)</option>
                  <option value="stock_quantity-DESC">Stock (High to Low)</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Products Grid */}
      <Row>
        {products.length === 0 ? (
          <Col className="text-center py-5">
            <h5>No products found</h5>
            <p className="text-muted">Try adjusting your filters</p>
          </Col>
        ) : (
          products.map(product => (
            <Col md={6} lg={4} xl={3} className="mb-4" key={product.product_id}>
              <Card className="product-card h-100">
                <Card.Body className="d-flex flex-column">
                  <div className="mb-2">
                    {getStockBadge(product.stock_quantity)}
                  </div>
                  
                  <h6 className="product-title">{product.name}</h6>
                  <p className="product-category text-muted">{product.category}</p>
                  
                  {product.description && (
                    <p className="text-muted small mb-3">
                      {product.description.length > 100 
                        ? `${product.description.substring(0, 100)}...` 
                        : product.description}
                    </p>
                  )}
                  
                  <div className="mt-auto">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span className="product-price">
                        {APP_CONFIG.currency}{parseFloat(product.price).toFixed(2)}
                      </span>
                      <small className="text-muted">
                        {product.stock_quantity} in stock
                      </small>
                    </div>
                    
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-100"
                      disabled={product.stock_quantity === 0}
                      onClick={() => handleAddToCart(product.product_id)}
                    >
                      <i className="bi bi-cart-plus me-2"></i>
                      {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))
        )}
      </Row>

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
    </div>
  );
};

export default ProductCatalog;
