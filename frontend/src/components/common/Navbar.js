import React from 'react';
import { Navbar as BootstrapNavbar, Nav, Container, Badge, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROUTES, APP_CONFIG } from '../../utils/constants';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <BootstrapNavbar bg="white" expand="lg" className="shadow-sm border-bottom">
      <Container fluid>
        <BootstrapNavbar.Brand as={Link} to={isAuthenticated ? (user?.role === 'admin' ? ROUTES.ADMIN : ROUTES.CATALOG) : ROUTES.LOGIN} className="fw-bold text-primary-custom">
          {APP_CONFIG.name}
        </BootstrapNavbar.Brand>
        
        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center">
            {isAuthenticated ? (
              <>
                {user?.role === 'customer' && (
                  <>
                    <Nav.Link as={Link} to={ROUTES.CATALOG} className="text-dark">
                      <i className="bi bi-box me-1"></i>
                      Products
                    </Nav.Link>
                    <Nav.Link as={Link} to={ROUTES.CART} className="text-dark position-relative">
                      <i className="bi bi-cart me-1"></i>
                      Cart
                      <Badge bg="danger" className="position-absolute top-0 start-100 translate-middle badge rounded-pill">
                        0
                      </Badge>
                    </Nav.Link>
                    <Nav.Link as={Link} to={ROUTES.ORDERS} className="text-dark">
                      <i className="bi bi-receipt me-1"></i>
                      Orders
                    </Nav.Link>
                  </>
                )}
                
                {user?.role === 'admin' && (
                  <>
                    <Nav.Link as={Link} to={ROUTES.ADMIN} className="text-dark">
                      <i className="bi bi-speedometer2 me-1"></i>
                      Dashboard
                    </Nav.Link>
                    <Nav.Link as={Link} to={ROUTES.ADMIN_PRODUCTS} className="text-dark">
                      <i className="bi bi-box me-1"></i>
                      Products
                    </Nav.Link>
                    <Nav.Link as={Link} to={ROUTES.ADMIN_ORDERS} className="text-dark">
                      <i className="bi bi-receipt me-1"></i>
                      Orders
                    </Nav.Link>
                    <Nav.Link as={Link} to={ROUTES.ADMIN_ANALYTICS} className="text-dark">
                      <i className="bi bi-graph-up me-1"></i>
                      Analytics
                    </Nav.Link>
                  </>
                )}
                
                <NavDropdown title={user?.name} id="user-dropdown" align="end">
                  <NavDropdown.Item className="text-muted">
                    <small>{user?.email}</small>
                  </NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right me-2"></i>
                    Logout
                  </NavDropdown.Item>
                </NavDropdown>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to={ROUTES.LOGIN} className="text-dark">
                  <i className="bi bi-box-arrow-in-right me-1"></i>
                  Customer Login
                </Nav.Link>
                <Nav.Link as={Link} to={ROUTES.ADMIN_LOGIN} className="text-dark">
                  <i className="bi bi-shield-lock me-1"></i>
                  Admin Login
                </Nav.Link>
              </>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;
