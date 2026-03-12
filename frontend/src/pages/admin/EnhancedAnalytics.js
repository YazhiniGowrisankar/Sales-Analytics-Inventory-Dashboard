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
  CategorySalesChart,
  SalesTrendsChart,
  CustomerAcquisitionChart,
  CustomerSegmentationChart,
  StockStatusChart
} from '../../components/charts/AnalyticsCharts';
import '../../styles/EnhancedAnalytics.css';

const EnhancedAnalytics = () => {
  const [dataSource, setDataSource] = useState('database'); // database | csv
  const [uploadedDatasets, setUploadedDatasets] = useState([]);
  const [currentDatasetId, setCurrentDatasetId] = useState('');

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

  useEffect(() => {
    const stored = localStorage.getItem('uploadedDatasets');
    if (!stored) return;
    try {
      const datasets = JSON.parse(stored);
      if (Array.isArray(datasets)) {
        setUploadedDatasets(datasets);
        const last = datasets[datasets.length - 1];
        if (last?.id) setCurrentDatasetId(String(last.id));
      }
    } catch (e) {
      // ignore parse errors
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

  const computeCsvAnalytics = (rows, options = {}) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const allowedDateKeys = options.allowedDateKeys instanceof Set ? options.allowedDateKeys : null;

    const normalizeString = (v) => (v ?? '').toString().trim();
    const parseNumber = (v) => {
      const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''));
      return Number.isFinite(n) ? n : 0;
    };
    const parseDateKey = (v) => {
      const s = normalizeString(v);
      if (!s) return null;
      const d = new Date(s);
      if (!isValid(d)) return null;
      return format(d, 'yyyy-MM-dd');
    };
    const toMonthLabel = (dateKey) => {
      const d = new Date(dateKey);
      if (!isValid(d)) return 'Unknown';
      return format(d, 'MMM yyyy');
    };

    // Normalize input rows to “sales” shape (we only use fields if present)
    const sales = safeRows
      .map((r) => {
        const orderId = normalizeString(r.order_id || r.orderId || r.OrderID || r['order id']);
        const productName = normalizeString(r.product_name || r.product || r.name || r.Product || r['product name']);
        const category = normalizeString(r.category || r.Category) || 'General';
        const quantity = parseNumber(r.quantity || r.qty || r.Quantity);
        const price = parseNumber(r.price || r.unit_price || r.Price);
        const orderDateKey = parseDateKey(r.order_date || r.date || r.OrderDate || r['order date']);
        const customerEmail = normalizeString(r.customer_email || r.email || r.CustomerEmail || r['customer email']);
        const revenue = quantity * price;
        return {
          orderId,
          productName,
          category,
          quantity,
          price,
          revenue,
          orderDateKey,
          customerEmail
        };
      })
      .filter((r) => r.orderDateKey && (r.orderId || r.productName));

    const filteredSales = allowedDateKeys
      ? sales.filter((r) => allowedDateKeys.has(r.orderDateKey))
      : sales;

    const uniqueOrders = new Set();
    const uniqueCustomers = new Set();
    const orderTotals = new Map(); // orderId -> { sale_date, total_amount, customerEmail? }
    const dailyAgg = new Map(); // yyyy-MM-dd -> { revenue, orders:Set, customers:Set }
    const monthlyAgg = new Map(); // MMM yyyy -> { revenue, orders:Set }
    const productAgg = new Map(); // name -> { revenue, quantity, orders:Set, category? }
    const categoryAgg = new Map(); // category -> { revenue, quantity, orders:Set }

    for (const r of filteredSales) {
      if (r.orderId) uniqueOrders.add(r.orderId);
      if (r.customerEmail) uniqueCustomers.add(r.customerEmail);

      // Order totals for scatter
      if (r.orderId) {
        const existing = orderTotals.get(r.orderId) || { sale_date: r.orderDateKey, total_amount: 0, customerEmail: r.customerEmail };
        existing.total_amount += r.revenue;
        orderTotals.set(r.orderId, existing);
      }

      // Daily
      {
        const key = r.orderDateKey;
        const existing = dailyAgg.get(key) || { revenue: 0, orders: new Set(), customers: new Set() };
        existing.revenue += r.revenue;
        if (r.orderId) existing.orders.add(r.orderId);
        if (r.customerEmail) existing.customers.add(r.customerEmail);
        dailyAgg.set(key, existing);
      }

      // Monthly
      {
        const monthLabel = toMonthLabel(r.orderDateKey);
        const existing = monthlyAgg.get(monthLabel) || { revenue: 0, orders: new Set() };
        existing.revenue += r.revenue;
        if (r.orderId) existing.orders.add(r.orderId);
        monthlyAgg.set(monthLabel, existing);
      }

      // Product
      if (r.productName) {
        const existing = productAgg.get(r.productName) || { total_revenue: 0, total_quantity_sold: 0, orders: new Set(), category: r.category };
        existing.total_revenue += r.revenue;
        existing.total_quantity_sold += r.quantity;
        if (r.orderId) existing.orders.add(r.orderId);
        if (!existing.category && r.category) existing.category = r.category;
        productAgg.set(r.productName, existing);
      }

      // Category
      {
        const key = r.category || 'General';
        const existing = categoryAgg.get(key) || { total_revenue: 0, total_quantity_sold: 0, orders: new Set() };
        existing.total_revenue += r.revenue;
        existing.total_quantity_sold += r.quantity;
        if (r.orderId) existing.orders.add(r.orderId);
        categoryAgg.set(key, existing);
      }
    }

    const daily_analytics = [...dailyAgg.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([sale_date, v]) => {
        const total_orders = v.orders.size;
        const total_revenue = v.revenue;
        return {
          sale_date,
          total_orders,
          total_revenue,
          average_order_value: total_orders > 0 ? total_revenue / total_orders : 0,
          unique_customers: v.customers.size,
          revenue: total_revenue,
          order_count: total_orders,
          avg_order_value: total_orders > 0 ? total_revenue / total_orders : 0,
          period: sale_date
        };
      });

    const monthlySales = [...monthlyAgg.entries()].map(([month, v]) => {
      const total_orders = v.orders.size;
      const total_revenue = v.revenue;
      return {
        month,
        total_orders,
        total_revenue,
        avg_order_value: total_orders > 0 ? total_revenue / total_orders : 0,
        completed_orders: total_orders
      };
    });

    const topProducts = [...productAgg.entries()]
      .map(([name, v]) => ({
        name,
        category: v.category || 'General',
        total_quantity_sold: v.total_quantity_sold,
        total_revenue: v.total_revenue,
        order_count: v.orders.size
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue);

    const categorySales = [...categoryAgg.entries()]
      .map(([category, v]) => ({
        category,
        total_revenue: v.total_revenue,
        total_orders: v.orders.size,
        total_quantity_sold: v.total_quantity_sold
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue);

    // Customer acquisition + segmentation (simple heuristics)
    const seenCustomers = new Set();
    const acquisition_trends = monthlySales.map((m) => {
      const monthKey = m.month;
      const newCustomersInMonth = new Set();
      for (const r of filteredSales) {
        if (!r.customerEmail) continue;
        if (toMonthLabel(r.orderDateKey) !== monthKey) continue;
        if (!seenCustomers.has(r.customerEmail)) newCustomersInMonth.add(r.customerEmail);
      }
      for (const c of newCustomersInMonth) seenCustomers.add(c);
      return { month: monthKey, new_customers: newCustomersInMonth.size };
    });

    const spendByCustomer = new Map();
    for (const r of filteredSales) {
      if (!r.customerEmail) continue;
      spendByCustomer.set(r.customerEmail, (spendByCustomer.get(r.customerEmail) || 0) + r.revenue);
    }
    const segments = { High: 0, Medium: 0, Low: 0 };
    for (const spend of spendByCustomer.values()) {
      if (spend >= 5000) segments.High++;
      else if (spend >= 2000) segments.Medium++;
      else segments.Low++;
    }
    const segmentation = Object.entries(segments).map(([segment, count]) => ({
      customer_segment: segment,
      customer_count: count
    }));

    const detailed_sales = [...orderTotals.entries()].map(([orderId, v]) => ({
      order_id: orderId,
      sale_date: v.sale_date,
      total_amount: v.total_amount
    }));

    const total_revenue = daily_analytics.reduce((sum, d) => sum + d.total_revenue, 0);
    const total_orders = uniqueOrders.size;
    const average_order_value = total_orders > 0 ? total_revenue / total_orders : 0;

    return {
      salesAnalytics: {
        summary: {
          total_revenue,
          total_orders,
          average_order_value,
          unique_customers: uniqueCustomers.size
        },
        daily_analytics,
        detailed_sales,
        top_products: topProducts.map((p) => ({
          product_name: p.name,
          total_quantity_sold: p.total_quantity_sold,
          total_revenue: p.total_revenue,
          number_of_orders: p.order_count
        })),
        top_customers: []
      },
      originalAnalytics: {
        monthlySales,
        topProducts,
        categorySales,
        lowStockAlerts: [],
        salesTrends: daily_analytics,
        customerAnalytics: { acquisition_trends, segmentation, total_customers: uniqueCustomers.size },
        stockData: []
      }
    };
  };

  const getAllowedDateKeys = useCallback(() => {
    // For CSV analytics, we filter by allowed date keys.
    // For DB analytics, the backend already applies the period; we still keep UI consistent.
    if (dateFilter === 'all') return null;

    if (dateFilter === 'custom') {
      const dates = (customDates.selectedDates && customDates.selectedDates.length > 0)
        ? customDates.selectedDates
        : (customDates.startDate && customDates.endDate ? generateDateRange(customDates.startDate, customDates.endDate) : []);

      if (!dates || dates.length === 0) return new Set();
      return new Set(dates);
    }

    const now = new Date();
    const start = new Date(now);
    if (dateFilter === 'month') start.setDate(start.getDate() - 30);
    else if (dateFilter === 'quarter') start.setDate(start.getDate() - 90);
    else if (dateFilter === 'year') start.setDate(start.getDate() - 365);

    const startKey = format(start, 'yyyy-MM-dd');
    const endKey = format(now, 'yyyy-MM-dd');
    return new Set(generateDateRange(startKey, endKey));
  }, [dateFilter, customDates]);

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

      if (dataSource === 'csv') {
        const selected = uploadedDatasets.find(d => String(d.id) === String(currentDatasetId));
        const rows = selected?.data || [];
        if (!selected) {
          setError('No CSV dataset selected. Upload a CSV and choose "Use for Visualization Only".');
          setSalesAnalytics(null);
          setOriginalAnalytics(originalData);
          return;
        }

        const allowedDateKeys = getAllowedDateKeys();
        if (allowedDateKeys instanceof Set && allowedDateKeys.size === 0) {
          setError('No dates selected for custom range.');
          setSalesAnalytics(null);
          setOriginalAnalytics(originalData);
          return;
        }

        const computed = computeCsvAnalytics(rows, { allowedDateKeys });
        setSalesAnalytics(computed.salesAnalytics);
        setOriginalAnalytics(computed.originalAnalytics);
        return;
      }

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

        console.log('📊 Original Analytics Data (preset):', originalData);

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
  }, [dateFilter, customDates, dataSource, uploadedDatasets, currentDatasetId, getAllowedDateKeys]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const generateDateRange = (startDate, endDate) => {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    console.log('🗓️ Generating date range:', { startDate, endDate, start, end });
    
    if (isValid(start) && isValid(end) && start <= end) {
      const current = new Date(start);
      while (current <= end) {
        const formattedDate = format(current, 'yyyy-MM-dd');
        dates.push(formattedDate);
        console.log('📅 Adding date:', formattedDate);
        current.setDate(current.getDate() + 1);
      }
    }
    
    console.log('📊 Generated dates:', dates);
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
    console.log('🔍 Custom Date Submit:', customDates);
    if (customDates.startDate && customDates.endDate) {
      const dates = generateDateRange(customDates.startDate, customDates.endDate);
      setCustomDates(prev => ({ ...prev, selectedDates: dates }));
      setShowCustomDatePicker(false);
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
            value={dataSource}
            onChange={(e) => setDataSource(e.target.value)}
            className="date-filter-select"
            style={{ maxWidth: 220 }}
          >
            <option value="database">Database Analytics</option>
            <option value="csv">Uploaded CSV Analytics</option>
          </Form.Select>

          {dataSource === 'csv' && (
            <Form.Select
              value={currentDatasetId}
              onChange={(e) => setCurrentDatasetId(e.target.value)}
              className="date-filter-select"
              style={{ maxWidth: 260 }}
            >
              <option value="">Select CSV dataset...</option>
              {uploadedDatasets.map(ds => (
                <option key={ds.id} value={ds.id}>
                  {ds.name} ({ds.records} rows)
                </option>
              ))}
            </Form.Select>
          )}

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
          <Button 
            variant="outline-primary" 
            onClick={() => setShowCustomDatePicker(!showCustomDatePicker)}
            className="refresh-btn"
          >
            {showCustomDatePicker ? 'Hide' : 'Custom Dates'}
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
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <Row className="mb-3">
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
          </Card.Body>
        </Card>
      )}

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      {salesAnalytics && (
        <>
          <Row className="mb-4">
            <Col md={3}>
              <Card className="summary-card">
                <Card.Body className="text-center">
                  <div className="summary-icon">💰</div>
                  <h6 className="summary-title">Total Revenue</h6>
                  <h4 className="summary-value">
                    {formatCurrency(salesAnalytics.summary.total_revenue)}
                  </h4>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="summary-card">
                <Card.Body className="text-center">
                  <div className="summary-icon">📦</div>
                  <h6 className="summary-title">Total Orders</h6>
                  <h4 className="summary-value">
                    {salesAnalytics.summary.total_orders}
                  </h4>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="summary-card">
                <Card.Body className="text-center">
                  <div className="summary-icon">📊</div>
                  <h6 className="summary-title">Average Order Value</h6>
                  <h4 className="summary-value">
                    {formatCurrency(salesAnalytics.summary.average_order_value)}
                  </h4>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="summary-card">
                <Card.Body className="text-center">
                  <div className="summary-icon">👥</div>
                  <h6 className="summary-title">Total Customers</h6>
                  <h4 className="summary-value">
                    {salesAnalytics.summary.unique_customers}
                  </h4>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* Charts */}
      {salesAnalytics && (
        <>
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
                      <Bar 
                        dataKey="total_revenue" 
                        fill={colors.teal}
                        radius={[8, 8, 0, 0]}
                      />
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
                          return [formatCurrency(numValue), 'Orders'];
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="total_orders" 
                        fill={colors.lightTeal}
                        radius={[4, 4, 0, 0]}
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
                      <Scatter 
                        dataKey="total_amount" 
                        fill={colors.teal}
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
        </>
      )}

      {/* Original Analytics Charts Section */}
      {originalAnalytics && (
        <>
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
                    <CustomerAcquisitionChart
                      data={
                        Array.isArray(originalAnalytics.customerAnalytics)
                          ? originalAnalytics.customerAnalytics
                          : (originalAnalytics.customerAnalytics?.acquisition_trends || [])
                      }
                    />
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
                    <CustomerSegmentationChart
                      data={
                        Array.isArray(originalAnalytics.customerAnalytics)
                          ? originalAnalytics.customerAnalytics
                          : (originalAnalytics.customerAnalytics?.segmentation || [])
                      }
                    />
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
