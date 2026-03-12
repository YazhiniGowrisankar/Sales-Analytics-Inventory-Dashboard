import React from 'react';
import { Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { NAVIGATION_ITEMS } from '../../utils/constants';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navigationItems = user?.role === 'admin' ? NAVIGATION_ITEMS.admin : [];

  return (
    <div className="sidebar">
      <Nav className="flex-column">
        {navigationItems.map((item, index) => (
          <Nav.Link
            key={index}
            as={Link}
            to={item.path}
            className={location.pathname === item.path ? 'active' : ''}
          >
            <i className={`bi ${item.icon} me-2`}></i>
            {item.label}
          </Nav.Link>
        ))}
      </Nav>
    </div>
  );
};

export default Sidebar;
