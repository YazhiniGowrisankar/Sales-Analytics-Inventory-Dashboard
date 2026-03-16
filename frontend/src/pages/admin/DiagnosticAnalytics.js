import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Spinner, Alert, ProgressBar, Form, Button } from 'react-bootstrap';
import { diagnosticAPI } from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import '../../styles/DiagnosticAnalytics.css';

const DiagnosticAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [dataSource, setDataSource] = useState('database'); // database | csv
  const [uploadedDatasets, setUploadedDatasets] = useState([]);
  const [currentDatasetId, setCurrentDatasetId] = useState('');
  const [dateFilter, setDateFilter] = useState('month'); // month, quarter, year, all, custom
  const [customDates, setCustomDates] = useState({
    startDate: '',
    endDate: '',
    selectedDates: []
  });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  
  // Column selection states
  const [availableColumns, setAvailableColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState({
    fastMoving: ['product_name', 'total_sold', 'total_revenue'],
    slowMoving: ['product_name', 'category', 'stock_quantity', 'total_sold', 'total_revenue'],
    categoryPerformance: ['category', 'total_quantity_sold', 'total_revenue', 'avg_price_per_unit'],
    topCustomers: ['customer_name', 'shop_name', 'total_orders', 'total_spending'],
    productContribution: ['product_name', 'category', 'product_revenue', 'revenue_contribution_percentage'],
    salesTrends: ['month', 'order_count', 'revenue', 'unique_customers'],
    stockAnalysis: ['total_products', 'out_of_stock', 'low_stock', 'high_stock'],
    customerPatterns: ['one_time_customers', 'regular_customers', 'loyal_customers'],
    profitMargins: ['category', 'revenue', 'estimated_profit', 'profit_margin_percentage']
  });
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  
  const [fastMovingProducts, setFastMovingProducts] = useState([]);
  const [slowMovingProducts, setSlowMovingProducts] = useState([]);
  const [categoryPerformance, setCategoryPerformance] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [productContributions, setProductContributions] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [salesTrends, setSalesTrends] = useState([]);
  const [stockAnalysis, setStockAnalysis] = useState({});
  const [customerPatterns, setCustomerPatterns] = useState({});
  const [profitMargins, setProfitMargins] = useState([]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  // Available columns for selection
  const columnDefinitions = {
    fastMoving: [
      { key: 'product_name', label: 'Product Name', type: 'text' },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'total_sold', label: 'Units Sold', type: 'number' },
      { key: 'total_revenue', label: 'Revenue', type: 'currency' },
      { key: 'avg_price_per_unit', label: 'Avg Price', type: 'currency' }
    ],
    slowMoving: [
      { key: 'product_name', label: 'Product Name', type: 'text' },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'stock_quantity', label: 'Stock Quantity', type: 'number' },
      { key: 'total_sold', label: 'Units Sold', type: 'number' },
      { key: 'total_revenue', label: 'Revenue', type: 'currency' },
      { key: 'last_order_date', label: 'Last Order', type: 'date' }
    ],
    categoryPerformance: [
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'product_count', label: 'Product Count', type: 'number' },
      { key: 'total_quantity_sold', label: 'Units Sold', type: 'number' },
      { key: 'total_revenue', label: 'Revenue', type: 'currency' },
      { key: 'avg_price_per_unit', label: 'Avg Price', type: 'currency' },
      { key: 'profit_margin', label: 'Profit Margin', type: 'percentage' }
    ],
    topCustomers: [
      { key: 'customer_name', label: 'Customer Name', type: 'text' },
      { key: 'shop_name', label: 'Shop Name', type: 'text' },
      { key: 'total_orders', label: 'Total Orders', type: 'number' },
      { key: 'total_spending', label: 'Total Spending', type: 'currency' },
      { key: 'avg_order_value', label: 'Avg Order Value', type: 'currency' },
      { key: 'last_order_date', label: 'Last Order', type: 'date' }
    ],
    productContribution: [
      { key: 'product_name', label: 'Product Name', type: 'text' },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'total_sold', label: 'Units Sold', type: 'number' },
      { key: 'product_revenue', label: 'Revenue', type: 'currency' },
      { key: 'revenue_contribution_percentage', label: 'Contribution %', type: 'percentage' }
    ],
    salesTrends: [
      { key: 'month', label: 'Month', type: 'text' },
      { key: 'order_count', label: 'Orders', type: 'number' },
      { key: 'revenue', label: 'Revenue', type: 'currency' },
      { key: 'avg_order_value', label: 'Avg Order Value', type: 'currency' },
      { key: 'unique_customers', label: 'New Customers', type: 'number' },
      { key: 'unique_products_sold', label: 'Products Sold', type: 'number' }
    ],
    stockAnalysis: [
      { key: 'total_products', label: 'Total Products', type: 'number' },
      { key: 'in_stock', label: 'In Stock', type: 'number' },
      { key: 'out_of_stock', label: 'Out of Stock', type: 'number' },
      { key: 'low_stock', label: 'Low Stock', type: 'number' },
      { key: 'high_stock', label: 'High Stock', type: 'number' },
      { key: 'avg_stock_per_product', label: 'Avg Stock/Product', type: 'number' }
    ],
    customerPatterns: [
      { key: 'total_customers', label: 'Total Customers', type: 'number' },
      { key: 'one_time_customers', label: 'One-time', type: 'number' },
      { key: 'regular_customers', label: 'Regular', type: 'number' },
      { key: 'loyal_customers', label: 'Loyal', type: 'number' },
      { key: 'avg_orders_per_customer', label: 'Avg Orders/Customer', type: 'number' }
    ],
    profitMargins: [
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'revenue', label: 'Revenue', type: 'currency' },
      { key: 'estimated_cost', label: 'Cost', type: 'currency' },
      { key: 'estimated_profit', label: 'Profit', type: 'currency' },
      { key: 'profit_margin_percentage', label: 'Margin %', type: 'percentage' }
    ]
  };

  useEffect(() => {
    const stored = localStorage.getItem('uploadedDatasets');
    if (!stored) return;
    try {
      const datasets = JSON.parse(stored);
      if (Array.isArray(datasets)) {
        setUploadedDatasets(datasets);
      }
    } catch (err) {
      console.error('Error loading uploaded datasets from localStorage:', err);
    }
  }, []);

  useEffect(() => {
    loadDiagnosticData();
  }, [dataSource, dateFilter, customDates, currentDatasetId, selectedColumns]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDiagnosticData = async () => {
    setLoading(true);
    setError('');
    
    // Prepare filter parameters based on date filter type
    const filterParams = {};
    if (dataSource !== 'database') {
      filterParams.data_source = dataSource;
    }
    
    // Add date filtering based on filter type
    if (dateFilter === 'custom' && customDates.startDate && customDates.endDate) {
      filterParams.start_date = customDates.startDate;
      filterParams.end_date = customDates.endDate;
    } else if (dateFilter !== 'all') {
      // For preset periods, backend will handle the date logic
      filterParams.period = dateFilter;
    }
    
    console.log('Loading diagnostic data with params:', filterParams);
    
    try {
      // Load all diagnostic data with Promise.allSettled for graceful handling
      const [
        fastMovingResponse,
        slowMovingResponse,
        categoryResponse,
        topCustomersResponse,
        contributionResponse,
        salesTrendsResponse,
        stockAnalysisResponse,
        customerPatternsResponse,
        profitMarginsResponse
      ] = await Promise.allSettled([
        diagnosticAPI.getFastMovingProducts({ limit: 10, ...filterParams }),
        diagnosticAPI.getSlowMovingProducts({ limit: 20, ...filterParams }),
        diagnosticAPI.getCategoryPerformance(filterParams),
        diagnosticAPI.getTopCustomers({ limit: 10, ...filterParams }),
        diagnosticAPI.getProductRevenueContribution({ limit: 15, ...filterParams }),
        diagnosticAPI.getSalesTrendsAnalysis(filterParams),
        diagnosticAPI.getStockAnalysis(filterParams),
        diagnosticAPI.getCustomerOrderPatterns(filterParams),
        diagnosticAPI.getProfitMarginAnalysis(filterParams)
      ]);

      console.log('All API responses received');

      // Handle each response individually
      setFastMovingProducts(fastMovingResponse.status === 'fulfilled' && fastMovingResponse.value?.data?.success ? fastMovingResponse.value.data.data || [] : []);
      setSlowMovingProducts(slowMovingResponse.status === 'fulfilled' && slowMovingResponse.value?.data?.success ? slowMovingResponse.value.data.data || [] : []);
      setCategoryPerformance(categoryResponse.status === 'fulfilled' && categoryResponse.value?.data?.success ? categoryResponse.value.data.data || [] : []);
      setTopCustomers(topCustomersResponse.status === 'fulfilled' && topCustomersResponse.value?.data?.success ? topCustomersResponse.value.data.data || [] : []);
      setSalesTrends(salesTrendsResponse.status === 'fulfilled' && salesTrendsResponse.value?.data?.success ? salesTrendsResponse.value.data.data || [] : []);
      setStockAnalysis(stockAnalysisResponse.status === 'fulfilled' && stockAnalysisResponse.value?.data?.success ? stockAnalysisResponse.value.data.data || {} : {});
      setCustomerPatterns(customerPatternsResponse.status === 'fulfilled' && customerPatternsResponse.value?.data?.success ? customerPatternsResponse.value.data.data || {} : {});
      setProfitMargins(profitMarginsResponse.status === 'fulfilled' && profitMarginsResponse.value?.data?.success ? profitMarginsResponse.value.data.data || [] : []);
      
      // Handle product contributions and calculate total revenue
      if (contributionResponse.status === 'fulfilled' && contributionResponse.value?.data?.success) {
        const contributionData = contributionResponse.value.data.data?.products || [];
        setProductContributions(contributionData);
        
        // Use total_revenue from the response data
        const total = contributionResponse.value.data.data?.total_revenue || 0;
        setTotalRevenue(total);
      } else {
        setProductContributions([]);
        setTotalRevenue(0);
      }
      
      // Check for data source message
      if (fastMovingResponse.status === 'fulfilled' && fastMovingResponse.value?.data?.message) {
        console.log('📊', fastMovingResponse.value.data.message);
      }

      // Log any failed requests
      const failedRequests = [
        { name: 'Fast Moving', response: fastMovingResponse },
        { name: 'Slow Moving', response: slowMovingResponse },
        { name: 'Category Performance', response: categoryResponse },
        { name: 'Top Customers', response: topCustomersResponse },
        { name: 'Product Contribution', response: contributionResponse },
        { name: 'Sales Trends', response: salesTrendsResponse },
        { name: 'Stock Analysis', response: stockAnalysisResponse },
        { name: 'Customer Patterns', response: customerPatternsResponse },
        { name: 'Profit Margins', response: profitMarginsResponse }
      ].filter(req => req.response.status === 'rejected');

      if (failedRequests.length > 0) {
        console.warn('Some diagnostic requests failed:', failedRequests);
        setError(`Warning: ${failedRequests.length} diagnostic modules failed to load. Other data is available.`);
      } else {
        console.log('✅ All diagnostic requests succeeded');
        setError(''); // Clear any previous errors
      }
    } catch (err) {
      console.error('Error loading diagnostic data:', err);
      // Don't set error message immediately - let the component continue with whatever data it has
      // setError('Failed to load diagnostic analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Transform data based on selected columns
  const transformDataForChart = (data, chartType) => {
    const selectedCols = selectedColumns[chartType] || [];
    if (!selectedCols.length) return data;
    
    console.log(`Transforming ${chartType} data with columns:`, selectedCols);
    console.log(`Original data:`, data);
    
    return data.map(item => {
      const transformed = {};
      selectedCols.forEach(colKey => {
        if (item.hasOwnProperty(colKey)) {
          transformed[colKey] = item[colKey];
        }
      });
      return transformed;
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading Diagnostic Analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="my-4">
        <Alert.Heading>Error</Alert.Heading>
        <p>{error}</p>
      </Alert>
    );
  }

  return (
    <div className="diagnostic-analytics">
      {/* Header with Date Filters */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">Diagnostic Analytics</h2>
        <div className="date-filter-controls">
          <Form.Select
            value={dataSource}
            onChange={(e) => setDataSource(e.target.value)}
            className="date-filter-select"
            style={{ maxWidth: 220 }}
          >
            <option value="database">Database Analytics</option>
            <option value="csv">CSV Analytics</option>
          </Form.Select>
          {dataSource === 'csv' && uploadedDatasets.length > 0 && (
            <Form.Select
              value={currentDatasetId}
              onChange={(e) => setCurrentDatasetId(e.target.value)}
              className="date-filter-select"
              style={{ maxWidth: 260 }}
            >
              <option value="">Select CSV dataset...</option>
              {uploadedDatasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.name} ({dataset.recordCount} records)
                </option>
              ))}
            </Form.Select>
          )}

          <Form.Select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="date-filter-select"
          >
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
            <option value="all">All Time</option>
            <option value="custom">Custom Range</option>
          </Form.Select>
        </div>
      </div>

      {/* Column Selector */}
      <div className="d-flex justify-content-end mb-4">
        <Button 
          variant="outline-info" 
          onClick={() => setShowColumnSelector(!showColumnSelector)}
          className="d-flex align-items-center"
        >
          <i className="bi bi-columns-gap me-2"></i>
          {showColumnSelector ? 'Hide Columns' : 'Customize Columns'}
        </Button>
      </div>

      {/* Column Selector Modal */}
      {showColumnSelector && (
        <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50" style={{ zIndex: 1050 }}>
          <div className="d-flex justify-content-center align-items-center h-100">
            <Card className="w-75" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
              <Card.Header className="bg-info text-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-columns-gap me-2"></i>
                  Customize Chart Columns
                </h5>
                <Button variant="light" size="sm" onClick={() => setShowColumnSelector(false)}>
                  <i className="bi bi-x"></i>
                </Button>
              </Card.Header>
              <Card.Body>
                <Row>
                  {Object.entries(columnDefinitions).map(([chartType, columns]) => (
                    <Col md={6} className="mb-4" key={chartType}>
                      <h6 className="text-capitalize mb-3">{chartType.replace(/([A-Z])/g, ' $1').trim()}</h6>
                      <div className="column-options">
                        {columns.map((column) => (
                          <div key={column.key} className="mb-2">
                            <Form.Check 
                              type="checkbox"
                              id={`${chartType}-${column.key}`}
                              label={column.label}
                              checked={selectedColumns[chartType]?.includes(column.key)}
                              onChange={(e) => {
                                const updatedColumns = { ...selectedColumns };
                                if (e.target.checked) {
                                  updatedColumns[chartType] = [...(updatedColumns[chartType] || []), column.key];
                                } else {
                                  updatedColumns[chartType] = updatedColumns[chartType]?.filter(col => col !== column.key) || [];
                                }
                                setSelectedColumns(updatedColumns);
                              }}
                              className="small"
                            />
                            <Badge bg="secondary" className="ms-2" style={{ fontSize: '0.7em' }}>
                              {column.type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </Col>
                  ))}
                </Row>
                <div className="text-center mt-4">
                  <Button variant="primary" onClick={() => setShowColumnSelector(false)}>
                    Apply Changes
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>
      )}

      {/* Custom Date Picker */}
      {dateFilter === 'custom' && (
        <Card className="mb-4">
          <Card.Header>
            <h5 className="mb-0">Select Custom Date Range</h5>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={5}>
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  value={customDates.startDate}
                  onChange={(e) => setCustomDates(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </Col>
              <Col md={5}>
                <Form.Label>End Date</Form.Label>
                <Form.Control
                  type="date"
                  value={customDates.endDate}
                  onChange={(e) => setCustomDates(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </Col>
              <Col md={2}>
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    setDateFilter('month');
                    setCustomDates({ startDate: '', endDate: '', selectedDates: [] });
                  }}
                  className="mt-4"
                >
                  Reset
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="bg-primary text-white">
            <Card.Body>
              <h6 className="card-title">Total Revenue</h6>
              <h3 className="mb-0">{formatCurrency(totalRevenue)}</h3>
              <small>All time revenue</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="bg-success text-white">
            <Card.Body>
              <h6 className="card-title">Fast Moving</h6>
              <h3 className="mb-0">{fastMovingProducts.length}</h3>
              <small>Products moving quickly</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="bg-warning text-dark">
            <Card.Body>
              <h6 className="card-title">Low Stock</h6>
              <h3 className="mb-0">{stockAnalysis.low_stock || 0}</h3>
              <small>Products need restocking</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="bg-info text-white">
            <Card.Body>
              <h6 className="card-title">Top Customers</h6>
              <h3 className="mb-0">{topCustomers.length}</h3>
              <small>High value customers</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        {/* Sales Trends Chart */}
        <Col lg={8} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">Sales Trends Analysis</h5>
              <small>Monthly revenue and order patterns</small>
            </Card.Header>
            <Card.Body>
              {salesTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={salesTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(value) : value,
                      name === 'revenue' ? 'Revenue' : name === 'order_count' ? 'Orders' : 'Customers'
                    ]} />
                    <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" />
                    <Line yAxisId="right" type="monotone" dataKey="order_count" stroke="#82ca9d" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="unique_customers" stroke="#ffc658" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-5 text-muted">
                  No sales trends data available
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Customer Order Patterns */}
        <Col lg={4} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-info text-white">
              <h5 className="mb-0">Customer Segments</h5>
              <small>Order frequency patterns</small>
            </Card.Header>
            <Card.Body>
              {customerPatterns.total_customers ? (
                <>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span>One-time Customers</span>
                      <Badge bg="danger">{customerPatterns.one_time_customers}</Badge>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Regular Customers</span>
                      <Badge bg="warning">{customerPatterns.regular_customers}</Badge>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Loyal Customers</span>
                      <Badge bg="success">{customerPatterns.loyal_customers}</Badge>
                    </div>
                  </div>
                  <div className="text-center">
                    <small className="text-muted">
                      Avg Orders per Customer: {customerPatterns.avg_orders_per_customer?.toFixed(1) || 0}
                    </small>
                  </div>
                </>
              ) : (
                <div className="text-center py-5 text-muted">
                  No customer pattern data available
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        {/* Fast Moving Products */}
        <Col lg={6} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-success text-white">
              <h5 className="mb-0">Fast Moving Products</h5>
              <small>Top selling products by quantity</small>
            </Card.Header>
            <Card.Body>
              {fastMovingProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={transformDataForChart(fastMovingProducts, 'fastMoving')}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey={selectedColumns.fastMoving[0] || 'product_name'} 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => {
                        const column = columnDefinitions.fastMoving.find(col => col.key === name);
                        const label = column?.label || name;
                        let formattedValue = value;
                        
                        if (column?.type === 'currency') {
                          formattedValue = formatCurrency(value);
                        } else if (column?.type === 'number') {
                          formattedValue = `${value} units`;
                        }
                        
                        return [formattedValue, label];
                      }}
                    />
                    {selectedColumns.fastMoving.map((colKey, index) => {
                      const column = columnDefinitions.fastMoving.find(col => col.key === colKey);
                      if (column?.type === 'number' || column?.type === 'currency') {
                        return (
                          <Bar 
                            key={colKey}
                            dataKey={colKey} 
                            fill={COLORS[index % COLORS.length]}
                          />
                        );
                      }
                      return null;
                    })}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-5 text-muted">
                  No fast moving products data available
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Category Performance */}
        <Col lg={6} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-info text-white">
              <h5 className="mb-0">Category Performance</h5>
              <small>Revenue by product category</small>
            </Card.Header>
            <Card.Body>
              {categoryPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryPerformance}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, percentage }) => `${category}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total_revenue"
                    >
                      {categoryPerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [formatCurrency(value), 'Revenue']}
                      labelFormatter={(label) => {
                        const category = categoryPerformance.find(c => c.category === label);
                        return category ? `${label} (${category.percentage}%)` : label;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-5 text-muted">
                  No category performance data available
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        {/* Profit Margin Analysis */}
        <Col lg={6} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-secondary text-white">
              <h5 className="mb-0">Profit Margin by Category</h5>
              <small>Estimated profit margins per category</small>
            </Card.Header>
            <Card.Body>
              {profitMargins.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={profitMargins}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="category" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'profit_margin_percentage' ? `${value}%` : formatCurrency(value),
                        name === 'profit_margin_percentage' ? 'Margin %' : 
                        name === 'estimated_profit' ? 'Profit' : 'Revenue'
                      ]}
                    />
                    <Bar dataKey="profit_margin_percentage" fill="#6c757d" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-5 text-muted">
                  No profit margin data available
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Stock Analysis */}
        <Col lg={6} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-warning text-dark">
              <h5 className="mb-0">Inventory Health</h5>
              <small>Stock status analysis</small>
            </Card.Header>
            <Card.Body>
              {stockAnalysis.total_products ? (
                <>
                  <div className="mb-4">
                    <h6>Stock Distribution</h6>
                    <div className="mb-2">
                      <div className="d-flex justify-content-between mb-1">
                        <span>Out of Stock</span>
                        <span>{stockAnalysis.out_of_stock} products</span>
                      </div>
                      <ProgressBar 
                        variant="danger" 
                        now={(stockAnalysis.out_of_stock / stockAnalysis.total_products) * 100} 
                        style={{ height: '8px' }}
                      />
                    </div>
                    <div className="mb-2">
                      <div className="d-flex justify-content-between mb-1">
                        <span>Low Stock</span>
                        <span>{stockAnalysis.low_stock} products</span>
                      </div>
                      <ProgressBar 
                        variant="warning" 
                        now={(stockAnalysis.low_stock / stockAnalysis.total_products) * 100} 
                        style={{ height: '8px' }}
                      />
                    </div>
                    <div className="mb-2">
                      <div className="d-flex justify-content-between mb-1">
                        <span>High Stock</span>
                        <span>{stockAnalysis.high_stock} products</span>
                      </div>
                      <ProgressBar 
                        variant="success" 
                        now={(stockAnalysis.high_stock / stockAnalysis.total_products) * 100} 
                        style={{ height: '8px' }}
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    <small className="text-muted">
                      Total Stock Units: {stockAnalysis.total_stock_units?.toLocaleString() || 0}
                    </small>
                  </div>
                </>
              ) : (
                <div className="text-center py-5 text-muted">
                  No stock analysis data available
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        {/* Slow Moving Products */}
        <Col lg={12} className="mb-4">
          <Card>
            <Card.Header className="bg-warning text-dark">
              <h5 className="mb-0">Slow Moving Products</h5>
              <small>Products with low sales - may need attention</small>
            </Card.Header>
            <Card.Body>
              {slowMovingProducts.length > 0 ? (
                <div className="table-responsive">
                  <Table striped hover>
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>Category</th>
                        <th>Stock Quantity</th>
                        <th>Total Sold</th>
                        <th>Total Revenue</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slowMovingProducts.map((product) => (
                        <tr key={product.product_id}>
                          <td>{product.product_name}</td>
                          <td>{product.category}</td>
                          <td>{product.stock_quantity}</td>
                          <td>{product.total_sold}</td>
                          <td>{formatCurrency(product.total_revenue)}</td>
                          <td>
                            {product.total_sold === 0 ? (
                              <Badge bg="danger">No Sales</Badge>
                            ) : product.total_sold <= 2 ? (
                              <Badge bg="warning">Very Low</Badge>
                            ) : (
                              <Badge bg="info">Low</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-5 text-muted">
                  No slow moving products data available
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        {/* Top Customers */}
        <Col lg={6} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">Top Customers</h5>
              <small>Customers generating highest revenue</small>
            </Card.Header>
            <Card.Body>
              {topCustomers.length > 0 ? (
                <div className="table-responsive">
                  <Table striped hover size="sm">
                    <thead>
                      <tr>
                        <th>Customer Name</th>
                        <th>Shop Name</th>
                        <th>Orders</th>
                        <th>Total Spending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCustomers.map((customer) => (
                        <tr key={customer.customer_id}>
                          <td>{customer.customer_name}</td>
                          <td>{customer.shop_name || '-'}</td>
                          <td>{customer.total_orders}</td>
                          <td>{formatCurrency(customer.total_spending)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-5 text-muted">
                  No top customers data available
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Product Revenue Contribution */}
        <Col lg={6} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-secondary text-white">
              <h5 className="mb-0">Product Revenue Contribution</h5>
              <small>Products contributing most to total revenue</small>
            </Card.Header>
            <Card.Body>
              {productContributions.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={productContributions}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="product_name" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'revenue_contribution_percentage' 
                            ? `${value}%` 
                            : formatCurrency(value),
                          name === 'revenue_contribution_percentage' 
                            ? 'Contribution %' 
                            : 'Revenue'
                        ]}
                      />
                      <Bar dataKey="revenue_contribution_percentage" fill="#6c757d" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-3 text-center">
                    <strong>Total Revenue: {formatCurrency(totalRevenue)}</strong>
                  </div>
                </>
              ) : (
                <div className="text-center py-5 text-muted">
                  No product contribution data available
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DiagnosticAnalytics;
