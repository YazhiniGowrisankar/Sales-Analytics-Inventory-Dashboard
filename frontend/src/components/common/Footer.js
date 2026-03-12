import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { APP_CONFIG } from '../../utils/constants';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark text-white py-4 mt-auto">
      <Container fluid>
        <Row>
          <Col md={6}>
            <h5 className="fw-bold">{APP_CONFIG.name}</h5>
            <p className="text-muted mb-0">
              Your trusted partner for wholesale stationery supplies.
              Quality products, competitive prices, and excellent service.
            </p>
          </Col>
          <Col md={3}>
            <h6 className="fw-bold">Quick Links</h6>
            <ul className="list-unstyled">
              <li><a href="/catalog" className="text-white text-decoration-none">Products</a></li>
              <li><a href="/about" className="text-white text-decoration-none">About Us</a></li>
              <li><a href="/contact" className="text-white text-decoration-none">Contact</a></li>
            </ul>
          </Col>
          <Col md={3}>
            <h6 className="fw-bold">Contact Info</h6>
            <address className="text-muted">
              <p className="mb-1">
                <i className="bi bi-geo-alt me-2"></i>
                123 Stationery Street, Chennai, India
              </p>
              <p className="mb-1">
                <i className="bi bi-telephone me-2"></i>
                +91 98765 43210
              </p>
              <p className="mb-0">
                <i className="bi bi-envelope me-2"></i>
                info@srikannantraders.com
              </p>
            </address>
          </Col>
        </Row>
        <hr className="my-3 border-secondary" />
        <Row>
          <Col className="text-center">
            <p className="mb-0 text-muted">
              © {currentYear} {APP_CONFIG.name}. All rights reserved. | Version {APP_CONFIG.version}
            </p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
