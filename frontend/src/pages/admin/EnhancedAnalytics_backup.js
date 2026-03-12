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

      if (dateFilter === 'custom') {
        // Use new sales analytics API with custom dates
        const dates = customDates.selectedDates.length > 0 
          ? customDates.selectedDates 
          : generateDateRange(customDates.startDate, customDates.endDate);
        
        console.log('🎯 Custom dates to fetch:', dates); // Debug log
        
        if (dates.length > 0) {
          console.log('📡 Calling sales analytics API with dates:', dates); // Debug log
          const response = await salesAnalyticsAPI.getSalesAnalytics(dates);
          console.log('📈 Sales analytics response:', response.data); // Debug log
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

        console.log('📊 Original Analytics Data:', originalData); // Debug log

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
            sale_date: item.month,
            total_orders: item.total_orders || 0,
            total_revenue: item.total_sales || 0,
            average_order_value: item.total_orders > 0 ? (item.total_sales / item.total_orders) : 0,
            unique_customers: item.new_customers || 0
          })),
          top_products: topProductsResponse.data.data.top_products.map(item => ({
            product_name: item.product_name,
            total_quantity_sold: item.total_sold || 0,
            total_revenue: item.total_revenue || 0,
            number_of_orders: item.total_orders || 0
          })),
          detailed_sales: [],
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

        console.log('📊 Original Analytics Data (preset):', originalData); // Debug log

        // Calculate average order value
        if (analyticsData.summary.total_orders > 0) {
          analyticsData.summary.average_order_value = analyticsData.summary.total_revenue / analyticsData.summary.total_orders;
        }
      }

      setSalesAnalytics(analyticsData);
      setOriginalAnalytics(originalData);
    } catch (error) {
      setError('Failed to load analytics data');
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, customDates]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const generateDateRange = (startDate, endDate) => {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    console.log('🗓️ Generating date range:', { startDate, endDate, start, end }); // Debug log
    
    if (isValid(start) && isValid(end) && start <= end) {
      const current = new Date(start);
      while (current <= end) {
        const formattedDate = format(current, 'yyyy-MM-dd');
        dates.push(formattedDate);
        console.log('📅 Adding date:', formattedDate); // Debug log
        current.setDate(current.getDate() + 1);
      }
    }
    
    console.log('📊 Generated dates:', dates); // Debug log
    return dates;
  };

  const handleDateFilterChange = (filter) => {
    setDateFilter(filter);
    if (filter !== 'custom') {
      setShowCustomDatePicker(false);
      setCustomDates({ startDate: '', endDate: '', selectedDates: [] });
    }
  };

  const handleCustomDateSubmit = () => {
    console.log('🔍 Custom Date Submit:', customDates); // Debug log
    if (customDates.startDate && customDates.endDate) {
      setShowCustomDatePicker(false);
      loadAnalyticsData();
    } else {
      setError('Please select both start and end dates');
    }
  };

  const addSelectedDate = (date) => {
    if (date && !customDates.selectedDates.includes(date)) {
      setCustomDates(prev => ({
        ...prev,
        selectedDates: [...prev.selectedDates, date].sort()
      }));
    }
  };

  const removeSelectedDate = (dateToRemove) => {
    setCustomDates(prev => ({
      ...prev,
      selectedDates: prev.selectedDates.filter(date => date !== dateToRemove)
    }));
  };

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

  if (loading) {
    return (
      <div className="loading-container">
        <Spinner animation="border" className="loading-spinner" />
        <p className="loading-text">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="enhanced-analytics-container fade-in">
      {/* Header with Date Filters */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold" style={{ color: colors.primary }}>Analytics Dashboard</h2>
        <div className="date-filter-controls">
          <Form.Select
            value={dateFilter}
            onChange={(e) => handleDateFilterChange(e.target.value)}
            className="date-filter-select"
          >
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
            <option value="all">All Time</option>
            <option value="custom">Custom Dates</option>
          </Form.Select>
          
          {dateFilter === 'custom' && (
            <Button
              variant="outline-primary"
              onClick={() => setShowCustomDatePicker(!showCustomDatePicker)}
              className="custom-date-btn"
            >
              <i className="bi bi-calendar3 me-2"></i>
              Select Dates
            </Button>
          )}
          
          <Button 
            variant="primary" 
            onClick={loadAnalyticsData}
            className="refresh-btn"
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            Refresh
          </Button>
        </div>
      </div>

      {/* Custom Date Picker */}
      {showCustomDatePicker && (
        <Card className="custom-date-picker">
          <Card.Body>
            <h5 className="mb-3">Custom Date Selection</h5>
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={customDates.startDate}
                    onChange={(e) => setCustomDates(prev => ({ ...prev, startDate: e.target.value }))}
                    className="custom-date-input"
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
                    className="custom-date-input"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>&nbsp;</Form.Label>
                  <Button 
                    variant="primary" 
                    onClick={handleCustomDateSubmit}
                    className="custom-date-btn w-100"
                    disabled={!customDates.startDate || !customDates.endDate}
                  >
                    Apply Date Range
                  </Button>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Or Add Specific Dates</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control
                      type="date"
                      onChange={(e) => e.target.value && addSelectedDate(e.target.value)}
                      className="custom-date-input"
                    />
                    <Button 
                      variant="outline-primary" 
                      onClick={handleCustomDateSubmit}
                      className="custom-date-btn"
                    >
                      Apply
                    </Button>
                  </div>
                </Form.Group>
              </Col>
            </Row>
            
            {customDates.selectedDates.length > 0 && (
              <div className="selected-dates-container">
                <h6>Selected Dates:</h6>
                <div className="d-flex flex-wrap gap-2">
                  {customDates.selectedDates.map(date => (
                    <Badge key={date} className="selected-date-badge">
                      {date}
                      <button 
                        className="btn-close btn-close-sm" 
                        onClick={() => removeSelectedDate(date)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {error && (
        <Alert variant="danger" className="analytics-alert mb-4">
          {error}
        </Alert>
      )}

      {salesAnalytics && (
        <>
          {/* Summary Cards Row */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="summary-card h-100">
                <Card.Body>
                  <div className="summary-icon">💰</div>
                  <h6 className="summary-title">Total Revenue</h6>
                  <h4 className="summary-value">
                    {formatCurrency(salesAnalytics.summary.total_revenue)}
                  </h4>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="summary-card h-100">
                <Card.Body>
                  <div className="summary-icon">📦</div>
                  <h6 className="summary-title">Total Orders</h6>
                  <h4 className="summary-value">
                    {salesAnalytics.summary.total_orders}
                  </h4>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="summary-card h-100">
                <Card.Body>
                  <div className="summary-icon">📊</div>
                  <h6 className="summary-title">Average Order Value</h6>
                  <h4 className="summary-value">
                    {formatCurrency(salesAnalytics.summary.average_order_value)}
                  </h4>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="summary-card h-100">
                <Card.Body>
                  <div className="summary-icon">👥</div>
                  <h6 className="summary-title">Total Customers</h6>
                  <h4 className="summary-value">
                    {salesAnalytics.summary.total_customers}
                  </h4>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Sales vs Date Line Chart */}
          <Row className="mb-4">
            <Col md={12}>
              <Card className="chart-card">
                <Card.Header>
                  <h5 className="mb-0">Sales vs Date</h5>
                </Card.Header>
                <Card.Body>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={salesAnalytics.daily_analytics} className="recharts-wrapper">
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.lightTeal} />
                      <XAxis 
                        dataKey="sale_date" 
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
                        formatter={(value) => {
                          const numValue = parseFloat(value);
                          return [formatCurrency(numValue), 'Total Sales'];
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="total_revenue" 
                        stroke={colors.teal} 
                        strokeWidth={3}
                        dot={{ fill: colors.primary, r: 6 }}
                        activeDot={{ r: 8 }}
                        name="Total Sales"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Top Products and Orders per Day */}
          <Row className="mb-4">
            <Col md={6}>
              <Card className="chart-card">
                <Card.Header>
                  <h5 className="mb-0">Top Products by Revenue</h5>
                </Card.Header>
                <Card.Body>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesAnalytics.top_products.slice(0, 8)} className="recharts-wrapper">
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.lightTeal} />
                      <XAxis 
                        dataKey="product_name" 
                        stroke={colors.primary}
                        tick={{ fill: colors.primary, fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
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
                        formatter={(value) => {
                          const numValue = parseFloat(value);
                          return [formatCurrency(numValue), 'Revenue'];
                        }}
                      <Bar 
                        dataKey="total_revenue" 
                        fill={colors.teal}
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="chart-card">
                <Card.Header>
                  <h5 className="mb-0">Orders per Day</h5>
                </Card.Header>
                <Card.Body>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesAnalytics.daily_analytics} className="recharts-wrapper">
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.lightTeal} />
                      <XAxis 
                        dataKey="sale_date" 
                        stroke={colors.primary}
                        tick={{ fill: colors.primary }}
                      />
                      <YAxis 
                        stroke={colors.primary}
                        tick={{ fill: colors.primary }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: `1px solid ${colors.lightTeal}`,
                          borderRadius: '8px'
                        }}
                        formatter={(value) => [value, 'Orders']}
                      />
                      <Bar 
                        dataKey="total_orders" 
                        fill={colors.softBlue}
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Order Value Distribution and Revenue vs Orders Comparison */}
          <Row className="mb-4">
            <Col md={6}>
              <Card className="chart-card">
                <Card.Header>
                  <h5 className="mb-0">Order Value Distribution</h5>
                </Card.Header>
                <Card.Body>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart data={salesAnalytics.detailed_sales} className="recharts-wrapper">
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.lightTeal} />
                      <XAxis 
                        dataKey="sale_date" 
                        stroke={colors.primary}
                        tick={{ fill: colors.primary }}
                        type="category"
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
                        formatter={(value) => {
                          const numValue = parseFloat(value);
                          return [formatCurrency(numValue), 'Order Value'];
                        }}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="chart-card">
                <Card.Header>
                  <h5 className="mb-0">Revenue vs Orders Comparison</h5>
                </Card.Header>
                <Card.Body>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={salesAnalytics.daily_analytics} className="recharts-wrapper">
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.lightTeal} />
                      <XAxis 
                        dataKey="sale_date" 
                        stroke={colors.primary}
                        tick={{ fill: colors.primary }}
                      />
                      <YAxis 
                        yAxisId="left"
                        stroke={colors.primary}
                        tick={{ fill: colors.primary }}
                        tickFormatter={(value) => `₹${value}`}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        stroke={colors.teal}
                        tick={{ fill: colors.teal }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: `1px solid ${colors.lightTeal}`,
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar 
                        yAxisId="right"
                        dataKey="total_orders" 
                        fill={colors.lightTeal}
                        radius={[4, 4, 0, 0]}
                        name="Orders"
                      />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="total_revenue" 
                        stroke={colors.primary}
                        strokeWidth={3}
                        name="Revenue"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Original Analytics Charts Section */}
          <Row className="mb-4">
            <Col md={12}>
              <h4 className="mb-3" style={{ color: colors.primary }}>Original Analytics Charts</h4>
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

          {/* Customer Segmentation and Stock Status */}
          <Row className="mb-4">
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
            <Col md={6}>
              <Card className="chart-card">
                <Card.Header>
                  <h5 className="mb-0">Stock Status</h5>
                </Card.Header>
                <Card.Body>
                  <div style={{ height: '250px' }}>
                    <StockStatusChart data={originalAnalytics.stockData} />
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
