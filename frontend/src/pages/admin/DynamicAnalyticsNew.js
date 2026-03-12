import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Button, Form, Alert, Row, Col, Badge } from 'react-bootstrap';
import { analyticsAPI } from '../../services/api';
import { APP_CONFIG } from '../../utils/constants';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, ComposedChart, PieChart, Pie, Cell
} from 'recharts';
import { format, isValid } from 'date-fns';
import '../../styles/EnhancedAnalytics.css';

const DynamicAnalytics = () => {
  // State for data source and uploaded datasets
  const [dataSource, setDataSource] = useState('database'); // database, uploaded, both
  const [uploadedDatasets, setUploadedDatasets] = useState([]);
  const [currentDataset, setCurrentDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // State for chart configuration
  const [chartConfig, setChartConfig] = useState({
    chartType: 'line', // line, bar, scatter, pie
    xAxis: 'date', // date, revenue, orders, customers, products
    yAxis: 'revenue', // revenue, orders, customers, price, quantity
    datasetType: 'sales' // sales, customers, products
  });

  // State for analytics data
  const [analyticsData, setAnalyticsData] = useState({
    monthlySales: [],
    topProducts: [],
    categorySales: [],
    salesTrends: [],
    customerAnalytics: [],
    stockData: []
  });

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

  // Load analytics data based on data source
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');

        if (dataSource === 'database') {
          // Load from database APIs
          const [
            monthlySalesResponse,
            topProductsResponse,
            categorySalesResponse,
            lowStockResponse,
            salesTrendsResponse,
            customerAnalyticsResponse
          ] = await Promise.all([
            analyticsAPI.getMonthlySales({ months: 6 }),
            analyticsAPI.getTopProducts({ limit: 10, period: 'month' }),
            analyticsAPI.getCategorySales({ period: 'month' }),
            analyticsAPI.getLowStockAlerts(),
            analyticsAPI.getSalesTrends({ period: 'month' }),
            analyticsAPI.getCustomerAnalytics()
          ]);

          setAnalyticsData({
            monthlySales: monthlySalesResponse.data.data.monthly_sales || [],
            topProducts: topProductsResponse.data.data.top_products || [],
            categorySales: categorySalesResponse.data.data.category_sales || [],
            salesTrends: salesTrendsResponse.data.data.trends || [],
            customerAnalytics: customerAnalyticsResponse.data.data.analytics || [],
            stockData: lowStockResponse.data.data.low_stock_alerts || []
          });
        } else if (dataSource === 'uploaded' && currentDataset) {
          // Use uploaded dataset
          setAnalyticsData({
            monthlySales: currentDataset.data || [],
            topProducts: currentDataset.data || [],
            categorySales: currentDataset.data || [],
            salesTrends: [],
            customerAnalytics: currentDataset.data || [],
            stockData: []
          });
        } else if (dataSource === 'both') {
          // Combine both sources
          try {
            const [
              monthlySalesResponse,
              topProductsResponse,
              categorySalesResponse,
              lowStockResponse,
              salesTrendsResponse,
              customerAnalyticsResponse
            ] = await Promise.all([
              analyticsAPI.getMonthlySales({ months: 6 }),
              analyticsAPI.getTopProducts({ limit: 10, period: 'month' }),
              analyticsAPI.getCategorySales({ period: 'month' }),
              analyticsAPI.getLowStockAlerts(),
              analyticsAPI.getSalesTrends({ period: 'month' }),
              analyticsAPI.getCustomerAnalytics()
            ]);

            const combinedData = currentDataset ? currentDataset.data : [];
            
            setAnalyticsData({
              monthlySales: [...(monthlySalesResponse.data.data.monthly_sales || []), ...combinedData],
              topProducts: [...(topProductsResponse.data.data.top_products || []), ...combinedData],
              categorySales: [...(categorySalesResponse.data.data.category_sales || []), ...combinedData],
              salesTrends: salesTrendsResponse.data.data.trends || [],
              customerAnalytics: customerAnalyticsResponse.data.data.analytics || [],
              stockData: lowStockResponse.data.data.low_stock_alerts || []
            });
          } catch (error) {
            // Fallback to uploaded data only
            setAnalyticsData({
              monthlySales: currentDataset?.data || [],
              topProducts: currentDataset?.data || [],
              categorySales: currentDataset?.data || [],
              salesTrends: [],
              customerAnalytics: currentDataset?.data || [],
              stockData: []
            });
          }
        }
      } catch (error) {
        setError('Failed to load analytics data');
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dataSource, currentDataset]);

  // Get available fields based on dataset type and data
  const getAvailableFields = useMemo(() => {
    console.log('🔍 Analytics Data Structure:', analyticsData);
    console.log('🔍 Current Dataset:', currentDataset);
    
    if (!analyticsData.monthlySales.length && !analyticsData.topProducts.length && 
        !analyticsData.categorySales.length && !analyticsData.customerAnalytics) {
      return [];
    }

    const allFields = new Set();
    
    // Collect fields from different data sources
    analyticsData.monthlySales.forEach(item => {
      Object.keys(item).forEach(key => allFields.add(key));
    });
    
    analyticsData.topProducts.forEach(item => {
      Object.keys(item).forEach(key => allFields.add(key));
    });
    
    analyticsData.categorySales.forEach(item => {
      Object.keys(item).forEach(key => allFields.add(key));
    });
    
    // Handle customer analytics data structure safely
    if (analyticsData.customerAnalytics) {
      if (typeof analyticsData.customerAnalytics === 'object') {
        Object.keys(analyticsData.customerAnalytics).forEach(key => allFields.add(key));
      } else if (Array.isArray(analyticsData.customerAnalytics)) {
        analyticsData.customerAnalytics.forEach(item => {
          if (typeof item === 'object') {
            Object.keys(item).forEach(key => allFields.add(key));
          } else if (Array.isArray(item)) {
            item.forEach(subItem => {
              if (typeof subItem === 'object') {
                Object.keys(subItem).forEach(key => allFields.add(key));
              }
            });
          }
        });
      }
    }
    
    if (currentDataset && currentDataset.data) {
      if (Array.isArray(currentDataset.data)) {
        currentDataset.data.forEach(item => {
          if (typeof item === 'object') {
            Object.keys(item).forEach(key => allFields.add(key));
          }
        });
      }
    }

    return Array.from(allFields).sort();
  }, [analyticsData, currentDataset]);

  // Get chart data based on configuration
  const getChartData = useMemo(() => {
    console.log('🔍 Analytics Data Structure:', analyticsData);
    console.log('🔍 Current Dataset:', currentDataset);
    
    if (!analyticsData.monthlySales.length && !analyticsData.topProducts.length && 
        !analyticsData.categorySales.length && !analyticsData.customerAnalytics) {
      return [];
    }

    let data = [];
    
    switch (chartConfig.datasetType) {
      case 'sales':
        if (chartConfig.xAxis === 'date' && chartConfig.yAxis === 'revenue') {
          data = analyticsData.monthlySales.map(item => ({
            x: item.month || item.period || 'Unknown',
            y: parseFloat(item.total_revenue) || 0,
            date: item.month || item.period
          }));
        } else if (chartConfig.xAxis === 'date' && chartConfig.yAxis === 'orders') {
          data = analyticsData.monthlySales.map(item => ({
            x: item.month || item.period || 'Unknown',
            y: parseInt(item.total_orders) || 0,
            date: item.month || item.period
          }));
        }
        break;
      
      case 'products':
        if (chartConfig.xAxis === 'product' && chartConfig.yAxis === 'revenue') {
          data = analyticsData.topProducts.map(item => ({
            x: item.name || item.product_name || 'Unknown',
            y: parseFloat(item.total_revenue) || 0
          }));
        } else if (chartConfig.xAxis === 'category' && chartConfig.yAxis === 'revenue') {
          data = analyticsData.categorySales.map(item => ({
            x: item.category || 'Unknown',
            y: parseFloat(item.total_revenue) || 0
          }));
        }
        break;
      
      case 'customers':
        if (chartConfig.xAxis === 'customer' && chartConfig.yAxis === 'revenue') {
          // Handle customer analytics data structure
          const customerData = analyticsData.customerAnalytics?.acquisition_trends || 
                           analyticsData.customerAnalytics?.segmentation || [];
          data = customerData.map(item => ({
            x: item.customer_name || item.name || 'Unknown',
            y: parseFloat(item.total_spent) || 0
          }));
        } else if (chartConfig.xAxis === 'location' && chartConfig.yAxis === 'revenue') {
          const customerData = analyticsData.customerAnalytics?.segmentation || [];
          data = customerData.map(item => ({
            x: item.location || 'Unknown',
            y: parseFloat(item.avg_revenue) || 0
          }));
        } else if (chartConfig.xAxis === 'segment' && chartConfig.yAxis === 'customers') {
          const customerData = analyticsData.customerAnalytics?.segmentation || [];
          data = customerData.map(item => ({
            x: item.customer_segment || 'Unknown',
            y: parseInt(item.customer_count) || 0
          }));
        }
        break;
      
      default:
        return [];
    }

    return data;
  }, [analyticsData, chartConfig]);

  // Render chart based on type
  const renderChart = () => {
    const chartData = getChartData;

    if (chartData.length === 0) {
      return (
        <div className="text-center text-muted p-5">
          <i className="bi bi-graph-up display-1"></i>
          <h6>No Data Available</h6>
          <p>Upload a dataset or select different data source</p>
        </div>
      );
    }

    const colors = {
      primary: '#1F3A5F',
      teal: '#2CA6A4',
      lightTeal: '#6FD0CF',
      softBlue: '#7FA6C4',
      background: '#F4F6F8'
    };

    switch (chartConfig.chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.lightTeal} />
              <XAxis 
                dataKey="x" 
                stroke={colors.primary}
                tick={{ fill: colors.primary }}
              />
              <YAxis 
                stroke={colors.primary}
                tick={{ fill: colors.primary }}
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: `1px solid ${colors.lightTeal}`,
                  borderRadius: '8px'
                }}
                formatter={(value) => [`${APP_CONFIG.currency}${value}`, 'Value']}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="y" 
                stroke={colors.teal} 
                strokeWidth={3}
                dot={{ fill: colors.primary, r: 6 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.lightTeal} />
              <XAxis 
                dataKey="x" 
                stroke={colors.primary}
                tick={{ fill: colors.primary }}
              />
              <YAxis 
                stroke={colors.primary}
                tick={{ fill: colors.primary }}
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: `1px solid ${colors.lightTeal}`,
                  borderRadius: '8px'
                }}
                formatter={(value) => [`${APP_CONFIG.currency}${value}`, 'Value']}
              />
              <Legend />
              <Bar 
                dataKey="y" 
                fill={colors.teal}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.lightTeal} />
              <XAxis 
                dataKey="x" 
                stroke={colors.primary}
                tick={{ fill: colors.primary }}
              />
              <YAxis 
                stroke={colors.primary}
                tick={{ fill: colors.primary }}
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: `1px solid ${colors.lightTeal}`,
                  borderRadius: '8px'
                }}
                formatter={(value) => [`${APP_CONFIG.currency}${value}`, 'Value']}
              />
              <Scatter 
                dataKey="y" 
                fill={colors.teal}
              />
            </ScatterChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData.map((item, index) => ({
                  name: item.x,
                  value: item.y
                }))}
                cx="50%"
                cy="50%"
                outerRadius={120}
                fill="#8884d8"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors.teal} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: `1px solid ${colors.lightTeal}`,
                  borderRadius: '8px'
                }}
                formatter={(value) => [`${APP_CONFIG.currency}${value}`, 'Value']}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      
      default:
        return (
          <div className="text-center text-muted p-5">
            <p>Unsupported chart type</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-center p-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
        <p className="mt-3">Loading analytics data...</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">Dynamic Analytics</h2>
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
              <h5 className="mb-0">Data Configuration</h5>
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
                
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Dataset Type</Form.Label>
                    <Form.Select
                      value={chartConfig.datasetType}
                      onChange={(e) => setChartConfig(prev => ({ ...prev, datasetType: e.target.value }))}
                    >
                      <option value="sales">Sales Data</option>
                      <option value="products">Product Data</option>
                      <option value="customers">Customer Data</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Chart Type</Form.Label>
                    <Form.Select
                      value={chartConfig.chartType}
                      onChange={(e) => setChartConfig(prev => ({ ...prev, chartType: e.target.value }))}
                    >
                      <option value="line">Line Chart</option>
                      <option value="bar">Bar Chart</option>
                      <option value="scatter">Scatter Chart</option>
                      <option value="pie">Pie Chart</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Chart Configuration */}
      {dataSource !== 'database' && (
        <Row className="mb-4">
          <Col lg={12}>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Chart Configuration</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>X-Axis Field</Form.Label>
                      <Form.Select
                        value={chartConfig.xAxis}
                        onChange={(e) => setChartConfig(prev => ({ ...prev, xAxis: e.target.value }))}
                      >
                        {getAvailableFields.map(field => (
                          <option key={field} value={field}>{field}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Y-Axis Field</Form.Label>
                      <Form.Select
                        value={chartConfig.yAxis}
                        onChange={(e) => setChartConfig(prev => ({ ...prev, yAxis: e.target.value }))}
                      >
                        <option value="revenue">Revenue</option>
                        <option value="orders">Orders</option>
                        <option value="customers">Customers</option>
                        <option value="price">Price</option>
                        <option value="quantity">Quantity</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>&nbsp;</Form.Label>
                      <Button 
                        variant="outline-primary" 
                        onClick={() => setChartConfig({
                          chartType: 'line',
                          xAxis: 'date',
                          yAxis: 'revenue',
                          datasetType: chartConfig.datasetType
                        })}
                      >
                        Reset to Default
                      </Button>
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Uploaded Datasets Selection */}
      {dataSource === 'uploaded' && (
        <Row className="mb-4">
          <Col lg={12}>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Select Dataset</h5>
              </Card.Header>
              <Card.Body>
                {uploadedDatasets.length === 0 ? (
                  <Alert variant="info">
                    <i className="bi bi-info-circle me-2"></i>
                    No uploaded datasets found. Please upload a CSV file first.
                  </Alert>
                ) : (
                  <Row>
                    {uploadedDatasets.map(dataset => (
                      <Col md={4} key={dataset.id} className="mb-3">
                        <Card 
                          className={`dataset-card ${currentDataset?.id === dataset.id ? 'border-primary' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setCurrentDataset(dataset)}
                        >
                          <Card.Body className="text-center">
                            <h6>{dataset.name}</h6>
                            <Badge bg="info" className="mb-2">
                              {dataset.records} records
                            </Badge>
                            <small className="text-muted">
                              Uploaded: {new Date(dataset.uploadDate).toLocaleDateString()}
                            </small>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Chart Display */}
      <Row className="mb-4">
        <Col lg={12}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                {dataSource === 'database' && 'Database Analytics'}
                {dataSource === 'uploaded' && `Uploaded Dataset Analytics - ${currentDataset?.name || 'No Dataset Selected'}`}
                {dataSource === 'both' && 'Combined Analytics'}
              </h5>
            </Card.Header>
            <Card.Body>
              {renderChart()}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DynamicAnalytics;
