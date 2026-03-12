import React, { useState } from 'react';
import { Form, Button, Card, Container, Row, Col, Alert } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { APP_CONFIG } from '../../utils/constants';

const AdminLogin = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');

    const result = await login(data, 'admin');
    
    if (result.success) {
      navigate('/admin');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <Container fluid className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <Row className="w-100 justify-content-center">
        <Col md={6} lg={5} xl={4}>
          <Card className="shadow-lg">
            <Card.Body className="p-5">
              <div className="text-center mb-4">
                <h2 className="fw-bold text-primary-custom">{APP_CONFIG.name}</h2>
                <p className="text-muted">Admin Login</p>
              </div>

              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={handleSubmit(onSubmit)}>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter admin email"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Please enter a valid email address'
                      }
                    })}
                    isInvalid={errors.email}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.email?.message}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter admin password"
                    {...register('password', {
                      required: 'Password is required'
                    })}
                    isInvalid={errors.password}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.password?.message}
                  </Form.Control.Feedback>
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  className="w-100 mb-3"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Logging in...
                    </>
                  ) : (
                    'Admin Login'
                  )}
                </Button>
              </Form>

              <div className="text-center">
                <p className="mb-0">
                  <Link to="/login" className="text-primary text-decoration-none">
                    <i className="bi bi-arrow-left me-2"></i>
                    Customer Login
                  </Link>
                </p>
                <p className="mb-0">
                  <Link to="/signup" className="text-primary text-decoration-none">
                    Create Customer Account
                  </Link>
                </p>
              </div>

              <hr className="my-4" />
              
              <div className="text-center">
                <small className="text-muted">
                  <strong>Default Admin Credentials:</strong><br />
                  Email: admin@srikannantraders.com<br />
                  Password: admin123
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminLogin;
