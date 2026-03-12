import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Button, Card, Container, Row, Col, Alert } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { APP_CONFIG } from '../../utils/constants';

const CustomerSignup = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm();

  watch('password');

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');

    const result = await signup(data);
    
    if (result.success) {
      navigate('/catalog');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <Container fluid className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <Row className="w-100 justify-content-center">
        <Col md={8} lg={6} xl={5}>
          <Card className="shadow-lg">
            <Card.Body className="p-5">
              <div className="text-center mb-4">
                <h2 className="fw-bold text-primary-custom">{APP_CONFIG.name}</h2>
                <p className="text-muted">Customer Registration</p>
              </div>

              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={handleSubmit(onSubmit)}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Full Name *</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter your full name"
                        {...register('name', {
                          required: 'Name is required',
                          minLength: {
                            value: 2,
                            message: 'Name must be at least 2 characters'
                          }
                        })}
                        isInvalid={errors.name}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.name?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Shop Name *</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter your shop name"
                        {...register('shopName', {
                          required: 'Shop name is required',
                          minLength: {
                            value: 2,
                            message: 'Shop name must be at least 2 characters'
                          }
                        })}
                        isInvalid={errors.shopName}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.shopName?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Email Address *</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter your email"
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

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Phone Number</Form.Label>
                      <Form.Control
                        type="tel"
                        placeholder="Enter phone number"
                        {...register('phone', {
                          pattern: {
                            value: /^[+]?[\d\s-()]+$/,
                            message: 'Please enter a valid phone number'
                          }
                        })}
                        isInvalid={errors.phone}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.phone?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Password *</Form.Label>
                      <Form.Control
                        type="password"
                        placeholder="Enter password"
                        {...register('password', {
                          required: 'Password is required',
                          minLength: {
                            value: 6,
                            message: 'Password must be at least 6 characters'
                          }
                        })}
                        isInvalid={errors.password}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.password?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-4">
                  <Form.Label>Address</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Enter your address"
                    {...register('address')}
                  />
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
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </Form>

              <div className="text-center">
                <p className="mb-0">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary text-decoration-none">
                    Login here
                  </Link>
                </p>
                <p className="mb-0">
                  <Link to="/admin/login" className="text-primary text-decoration-none">
                    Admin Login
                  </Link>
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CustomerSignup;
