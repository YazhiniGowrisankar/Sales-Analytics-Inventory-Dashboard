import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Form, Alert, Spinner, Row, Col, Badge } from 'react-bootstrap';
import { analyticsAPI, salesAnalyticsAPI } from '../../services/api';
import { APP_CONFIG } from '../../utils/constants';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, ComposedChart
} from 'recharts';
import { format, isValid } from 'date-fns';
import {
  MonthlySalesChart,
  TopProductsChart,
  CategorySalesChart,
  SalesTrendsChart,
  CustomerAcquisitionChart,
  CustomerSegmentationChart,
  StockStatusChart
} from '../../components/charts/AnalyticsCharts';
import '../../styles/EnhancedAnalytics.css';

const EnhancedAnalytics = () => {
  // State for data source selection
  const [dataSource, setDataSource] = useState('database'); // database, uploaded, both
  const [uploadedDatasets, setUploadedDatasets] = useState([]);
  const [currentDataset, setCurrentDataset] = useState(null);

  // Original EnhancedAnalytics state
  const [salesAnalytics, setSalesAnalytics] = useState(null);
  const [originalAnalytics, setOriginalAnalytics] = useState({
    monthlySales: [],
    topProducts: [],
    categorySales: [],
    lowStockAlerts: [],
    salesTrends: [],
    customerAnalytics: [],
    stockData: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFilter, setDateFilter] = useState('month'); // month, quarter, year, all, custom
  const [customDates, setCustomDates] = useState({
    startDate: '',
    endDate: '',
    selectedDates: []
  });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Load uploaded datasets from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('uploadedDatasets');
    if (stored) {
      try {
        const datasets = JSON.parse(stored);
        setUploadedDatasets(datasets);
      } catch (e) {
        console.error('Error loading stored datasets:', e);
      }
    }
  }, []);

  // Chart colors
  const colors = {
    primary: '#1F3A5F',
    teal: '#2CA6A4',
    lightTeal: '#6FD0CF',
    softBlue: '#7FA6C4',
    background: '#F4F6F8'
  };

  // Custom tooltip formatter
  const formatCurrency = (value) => {
    const numValue = Number(value);
    return `${APP_CONFIG.currency}${isNaN(numValue) ? '0.00' : numValue.toFixed(2)}`;
  };

  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      let analyticsData = null;
      let originalData = {
        monthlySales: [],
        topProducts: [],
        categorySales: [],
        lowStockAlerts: [],
        salesTrends: [],
        customerAnalytics: [],
        stockData: []
      };

      if (dataSource === 'uploaded' && currentDataset) {
        // Use uploaded dataset
        originalData = {
          monthlySales: currentDataset.data || [],
          topProducts: currentDataset.data || [],
          categorySales: currentDataset.data || [],
          lowStockAlerts: [],
          salesTrends: [],
          customerAnalytics: currentDataset.data || [],
          stockData: []
        };
      } else if (dataSource === 'both') {
        // Combine both sources
        try {
          const [monthlySalesResponse, topProductsResponse, categorySalesResponse, lowStockResponse, salesTrendsResponse, customerAnalyticsResponse] = await Promise.all([
            analyticsAPI.getMonthlySales({ months: dateFilter === 'all' ? 12 : 6 }),
            analyticsAPI.getTopProducts({ limit: 10, period: dateFilter }),
            analyticsAPI.getCategorySales({ period: dateFilter }),
            analyticsAPI.getLowStockAlerts(),
            analyticsAPI.getSalesTrends({ period: dateFilter }),
            analyticsAPI.getCustomerAnalytics()
          ]);

          const combinedData = currentDataset ? currentDataset.data : [];
          
          originalData = {
            monthlySales: [...(monthlySalesResponse.data.data.monthly_sales || []), ...combinedData],
            topProducts: [...(topProductsResponse.data.data.top_products || []), ...combinedData],
            categorySales: [...(categorySalesResponse.data.data.category_sales || []), ...combinedData],
            lowStockAlerts: lowStockResponse.data.data.low_stock_alerts || [],
            salesTrends: salesTrendsResponse.data.data.trends || [],
            customerAnalytics: customerAnalyticsResponse.data.data.analytics || [],
            stockData: lowStockResponse.data.data.low_stock_alerts || []
          };
        } catch (error) {
          // Fallback to uploaded data only
          originalData = {
            monthlySales: currentDataset?.data || [],
            topProducts: currentDataset?.data || [],
            categorySales: currentDataset?.data || [],
            lowStockAlerts: [],
            salesTrends: [],
            customerAnalytics: currentDataset?.data || [],
            stockData: []
          };
        }
      } else {
        // Load from database APIs (original logic)
        if (dateFilter === 'custom') {
          // Use new sales analytics API with custom dates
          const dates = customDates.selectedDates.length > 0 
            ? customDates.selectedDates 
            : generateDateRange(customDates.startDate, customDates.endDate);
          
          console.log('🎯 Custom dates to fetch:', dates);
          
          if (dates.length > 0) {
            console.log('📡 Calling sales analytics API with dates:', dates);
            const response = await salesAnalyticsAPI.getSalesAnalytics(dates);
            console.log('📈 Sales analytics response:', response.data);
            analyticsData = response.data.data;
          } else {
            setError('Please select valid date range');
            return;
          }

          // Also load original analytics for comparison
          const [monthlySalesResponse, topProductsResponse, categorySalesResponse, lowStockResponse, salesTrendsResponse, customerAnalyticsResponse] = await Promise.all([
            analyticsAPI.getMonthlySales({ months: 6 }),
            analyticsAPI.getTopProducts({ limit: 10, period: 'month' }),
            analyticsAPI.getCategorySales({ period: 'month' }),
            analyticsAPI.getLowStockAlerts(),
            analyticsAPI.getSalesTrends({ period: 'month' }),
            analyticsAPI.getCustomerAnalytics()
          ]);

          originalData = {
            monthlySales: monthlySalesResponse.data.data.monthly_sales || [],
            topProducts: topProductsResponse.data.data.top_products || [],
            categorySales: categorySalesResponse.data.data.category_sales || [],
            lowStockAlerts: lowStockResponse.data.data.low_stock_alerts || [],
            salesTrends: salesTrendsResponse.data.data.trends || [],
            customerAnalytics: customerAnalyticsResponse.data.data.analytics || [],
            stockData: lowStockResponse.data.data.low_stock_alerts || []
          };

          console.log('📊 Original Analytics Data (preset):', originalData);

        } else {
          // Load both new and original analytics for preset periods
          const [monthlySalesResponse, topProductsResponse, categorySalesResponse, lowStockResponse, salesTrendsResponse, customerAnalyticsResponse] = await Promise.all([
            analyticsAPI.getMonthlySales({ months: dateFilter === 'all' ? 12 : 6 }),
            analyticsAPI.getTopProducts({ limit: 10, period: dateFilter }),
            analyticsAPI.getCategorySales({ period: dateFilter }),
            analyticsAPI.getLowStockAlerts(),
            analyticsAPI.getSalesTrends({ period: dateFilter }),
            analyticsAPI.getCustomerAnalytics()
          ]);

          // Convert existing data to match new structure
          analyticsData = {
            summary: {
              total_revenue: monthlySalesResponse.data.data.monthly_sales.reduce((sum, item) => sum + (item.total_sales || 0), 0),
              total_orders: monthlySalesResponse.data.data.monthly_sales.reduce((sum, item) => sum + (item.total_orders || 0), 0),
              total_customers: monthlySalesResponse.data.data.monthly_sales.reduce((sum, item) => sum + (item.new_customers || 0), 0),
              average_order_value: 0
            },
            daily_analytics: monthlySalesResponse.data.data.monthly_sales.map(item => ({
              sale_date: item.month || item.period || 'Unknown',
              total_orders: item.total_orders || 0,
              total_revenue: item.total_sales || 0,
              average_order_value: item.total_orders > 0 ? (item.total_sales / item.total_orders) : 0,
              unique_customers: item.new_customers || 0
            })),
            detailed_sales: [],
            top_products: topProductsResponse.data.data.top_products.map(item => ({
              product_name: item.name || 'Unknown',
              total_quantity_sold: item.total_quantity_sold || 0,
              total_revenue: item.total_revenue || 0,
              number_of_orders: item.order_count || 0
            })),
            top_customers: []
          };

          originalData = {
            monthlySales: monthlySalesResponse.data.data.monthly_sales || [],
            topProducts: topProductsResponse.data.data.top_products || [],
            categorySales: categorySalesResponse.data.data.category_sales || [],
            lowStockAlerts: lowStockResponse.data.data.low_stock_alerts || [],
            salesTrends: salesTrendsResponse.data.data.trends || [],
            customerAnalytics: customerAnalyticsResponse.data.data.analytics || [],
            stockData: lowStockResponse.data.data.low_stock_alerts || []
          };
        }
      }

      setOriginalAnalytics(originalData);
      setSalesAnalytics(analyticsData);

      // Calculate average order value for summary
      if (analyticsData?.summary) {
        analyticsData.summary.average_order_value = analyticsData.summary.total_orders > 0 
          ? analyticsData.summary.total_revenue / analyticsData.summary.total_orders 
          : 0;
      }

    } catch (error) {
      console.error('Error loading analytics:', error);
      setError(error.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [dataSource, currentDataset, dateFilter, customDates]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const generateDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(format(d, 'yyyy-MM-dd'));
    }
    
    return dates;
  };

  const handleDateFilterChange = (filter) => {
    setDateFilter(filter);
    if (filter !== 'custom') {
      setShowCustomDatePicker(false);
    }
  };

  const handleCustomDateSubmit = () => {
    if (customDates.startDate && customDates.endDate) {
      const dates = generateDateRange(customDates.startDate, customDates.endDate);
      setCustomDates(prev => ({ ...prev, selectedDates: dates }));
      setShowCustomDatePicker(false);
      setDateFilter('custom');
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">Analytics Dashboard</h2>
        <Button variant="outline-secondary" onClick={() => window.history.back()}>
          <i className="bi bi-arrow-left me-2"></i>
          Back
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Data Source Selection */}
      <Row className="mb-4">
        <Col lg={12}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Data Source Configuration</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Data Source</Form.Label>
                    <Form.Select
                      value={dataSource}
                      onChange={(e) => setDataSource(e.target.value)}
                    >
                      <option value="database">Database Data</option>
                      <option value="uploaded">Uploaded CSV</option>
                      <option value="both">Both Sources</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                
                {dataSource === 'uploaded' && (
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Select Dataset</Form.Label>
                      <Form.Select
                        value={currentDataset?.id || ''}
                        onChange={(e) => setCurrentDataset(uploadedDatasets.find(d => d.id === parseInt(e.target.value)))}
                      >
                        <option value="">Select a dataset...</option>
                        {uploadedDatasets.map(dataset => (
                          <option key={dataset.id} value={dataset.id}>
                            {dataset.name} ({dataset.records} records)
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                )}

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Period</Form.Label>
                    <Form.Select
                      value={dateFilter}
                      onChange={(e) => handleDateFilterChange(e.target.value)}
                    >
                      <option value="month">Last Month</option>
                      <option value="quarter">Last Quarter</option>
                      <option value="year">Last Year</option>
                      <option value="all">All Time</option>
                      <option value="custom">Custom Range</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Custom Date Range Picker */}
      {showCustomDatePicker && (
        <Row className="mb-4">
          <Col lg={12}>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Select Custom Date Range</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Start Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={customDates.startDate}
                        onChange={(e) => setCustomDates(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>End Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={customDates.endDate}
                        onChange={(e) => setCustomDates(prev => ({ ...prev, endDate: e.target.value }))}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>&nbsp;</Form.Label>
                      <div>
                        <Button variant="primary" onClick={handleCustomDateSubmit}>
                          Apply Date Range
                        </Button>
                        <Button 
                          variant="secondary" 
                          className="ms-2"
                          onClick={() => setShowCustomDatePicker(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
        </Col>
      </Row>

      {/* Analytics Summary Cards */}
      {originalAnalytics && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="summary-card">
              <Card.Body className="text-center">
                <h3 className="text-primary mb-2">
                  {originalAnalytics.monthlySales.length > 0 
                    ? originalAnalytics.monthlySales.reduce((sum, item) => sum + (item.total_sales || 0), 0)
                        .toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
                    : '₹0'
                  }
                </h3>
                <p className="text-muted mb-0">Total Revenue</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="summary-card">
              <Card.Body className="text-center">
                <h3 className="text-info mb-2">
                  {originalAnalytics.monthlySales.length > 0 
                    ? originalAnalytics.monthlySales.reduce((sum, item) => sum + (item.total_orders || 0), 0)
                        .toLocaleString('en-IN')
                    : '0'
                  }
                </h3>
                <p className="text-muted mb-0">Total Orders</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="summary-card">
              <Card.Body className="text-center">
                <h3 className="text-success mb-2">
                  {originalAnalytics.monthlySales.length > 0 
                    ? originalAnalytics.monthlySales.reduce((sum, item) => sum + (item.new_customers || 0), 0)
                        .toLocaleString('en-IN')
                    : '0'
                  }
                </h3>
                <p className="text-muted mb-0">New Customers</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="summary-card">
              <Card.Body className="text-center">
                <h3 className="text-warning mb-2">
                  {originalAnalytics.monthlySales.length > 0 
                    ? (originalAnalytics.monthlySales.reduce((sum, item) => sum + (item.total_sales || 0), 0) /
                       originalAnalytics.monthlySales.reduce((sum, item) => sum + (item.total_orders || 0), 0))
                        .toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
                    : '₹0'
                  }
                </h3>
                <p className="text-muted mb-0">Average Order Value</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Original Analytics Charts Section */}
      {originalAnalytics && (
        <>
          <Row className="mb-4">
            <Col md={12}>
              <h4 className="mb-3" style={{ color: colors.primary }}>
                {dataSource === 'database' && 'Database Analytics Charts'}
                {dataSource === 'uploaded' && `Uploaded Dataset Analytics - ${currentDataset?.name || 'No Dataset Selected'}`}
                {dataSource === 'both' && 'Combined Analytics Charts'}
              </h4>
            </Col>
          </Row>

          {/* Monthly Sales and Category Sales */}
          <Row className="mb-4">
            <Col md={6}>
              <Card className="chart-card">
                <Card.Header>
                  <h5 className="mb-0">Monthly Sales Trend</h5>
                </Card.Header>
                <Card.Body>
                  <div style={{ height: '250px' }}>
                    <MonthlySalesChart data={originalAnalytics.monthlySales} />
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="chart-card">
                <Card.Header>
                  <h5 className="mb-0">Sales by Category</h5>
                </Card.Header>
                <Card.Body>
                  <div style={{ height: '250px' }}>
                    <CategorySalesChart data={originalAnalytics.categorySales} />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Sales Trends and Customer Acquisition */}
          <Row className="mb-4">
            <Col md={6}>
              <Card className="chart-card">
                <Card.Header>
                  <h5 className="mb-0">Sales Trends</h5>
                </Card.Header>
                <Card.Body>
                  <div style={{ height: '250px' }}>
                    <SalesTrendsChart data={originalAnalytics.salesTrends} />
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="chart-card">
                <Card.Header>
                  <h5 className="mb-0">Customer Acquisition</h5>
                </Card.Header>
                <Card.Body>
                  <div style={{ height: '250px' }}>
                    <CustomerAcquisitionChart data={originalAnalytics.customerAnalytics} />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Top Products and Customer Segmentation */}
          <Row className="mb-4">
            <Col md={6}>
              <Card className="chart-card">
                <Card.Header>
                  <h5 className="mb-0">Top Products</h5>
                </Card.Header>
                <Card.Body>
                  <div style={{ height: '250px' }}>
                    <TopProductsChart data={originalAnalytics.topProducts} />
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="chart-card">
                <Card.Header>
                  <h5 className="mb-0">Customer Segmentation</h5>
                </Card.Header>
                <Card.Body>
                  <div style={{ height: '250px' }}>
                    <CustomerSegmentationChart data={originalAnalytics.customerAnalytics} />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Stock Status */}
          <Row className="mb-4">
            <Col md={12}>
              <Card className="chart-card">
                <Card.Header>
                  <h5 className="mb-0">Low Stock Alerts</h5>
                </Card.Header>
                <Card.Body>
                  <div style={{ height: '300px' }}>
                    <StockStatusChart data={originalAnalytics.lowStockAlerts} />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default EnhancedAnalytics;
