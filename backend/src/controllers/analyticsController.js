const { query } = require('../database/connection');

// Get monthly sales data
const getMonthlySales = async (req, res) => {
  try {
    const { months = 12 } = req.query;
    
    const result = await query(
      `SELECT 
       DATE_TRUNC('month', order_date) as month,
       COUNT(*) as total_orders,
       SUM(total_amount) as total_revenue,
       AVG(total_amount) as avg_order_value,
       COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_orders
       FROM orders
       WHERE order_date >= NOW() - INTERVAL '${months} months'
       GROUP BY DATE_TRUNC('month', order_date)
       ORDER BY month ASC`,
      []
    );
    
    const monthlyData = result.rows.map(row => ({
      month: new Date(row.month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
      total_orders: parseInt(row.total_orders),
      total_revenue: parseFloat(row.total_revenue) || 0,
      avg_order_value: parseFloat(row.avg_order_value) || 0,
      completed_orders: parseInt(row.completed_orders)
    }));
    
    res.status(200).json({
      success: true,
      data: {
        monthly_sales: monthlyData
      }
    });
  } catch (error) {
    console.error('Get monthly sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get top selling products
const getTopProducts = async (req, res) => {
  try {
    const { limit = 10, period = 'all' } = req.query;
    
    let dateFilter = '';
    if (period !== 'all') {
      switch (period) {
        case 'month':
          dateFilter = "AND o.order_date >= NOW() - INTERVAL '1 month'";
          break;
        case 'quarter':
          dateFilter = "AND o.order_date >= NOW() - INTERVAL '3 months'";
          break;
        case 'year':
          dateFilter = "AND o.order_date >= NOW() - INTERVAL '1 year'";
          break;
      }
    }
    
    const result = await query(
      `SELECT 
       p.product_id,
       p.name,
       p.category,
       SUM(oi.quantity) as total_quantity_sold,
       SUM(oi.quantity * oi.price) as total_revenue,
       COUNT(DISTINCT oi.order_id) as order_count,
       AVG(oi.price) as avg_price
       FROM products p
       JOIN order_items oi ON p.product_id = oi.product_id
       JOIN orders o ON oi.order_id = o.order_id
       WHERE 1=1 ${dateFilter}
       GROUP BY p.product_id, p.name, p.category
       ORDER BY total_quantity_sold DESC
       LIMIT $1`,
      [parseInt(limit)]
    );
    
    const topProducts = result.rows.map(row => ({
      product_id: row.product_id,
      name: row.name,
      category: row.category,
      total_quantity_sold: parseInt(row.total_quantity_sold),
      total_revenue: parseFloat(row.total_revenue) || 0,
      order_count: parseInt(row.order_count),
      avg_price: parseFloat(row.avg_price) || 0
    }));
    
    res.status(200).json({
      success: true,
      data: {
        top_products: topProducts
      }
    });
  } catch (error) {
    console.error('Get top products error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get category-wise sales distribution
const getCategorySales = async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    
    let dateFilter = '';
    if (period !== 'all') {
      switch (period) {
        case 'month':
          dateFilter = "AND o.order_date >= NOW() - INTERVAL '1 month'";
          break;
        case 'quarter':
          dateFilter = "AND o.order_date >= NOW() - INTERVAL '3 months'";
          break;
        case 'year':
          dateFilter = "AND o.order_date >= NOW() - INTERVAL '1 year'";
          break;
      }
    }
    
    const result = await query(
      `SELECT 
       p.category,
       COUNT(DISTINCT o.order_id) as total_orders,
       SUM(oi.quantity) as total_quantity_sold,
       SUM(oi.quantity * oi.price) as total_revenue,
       AVG(oi.quantity * oi.price) as avg_order_value_per_category,
       COUNT(DISTINCT p.product_id) as product_count
       FROM products p
       JOIN order_items oi ON p.product_id = oi.product_id
       JOIN orders o ON oi.order_id = o.order_id
       WHERE 1=1 ${dateFilter}
       GROUP BY p.category
       ORDER BY total_revenue DESC`,
      []
    );
    
    const categoryData = result.rows.map(row => ({
      category: row.category,
      total_orders: parseInt(row.total_orders),
      total_quantity_sold: parseInt(row.total_quantity_sold),
      total_revenue: parseFloat(row.total_revenue) || 0,
      avg_order_value_per_category: parseFloat(row.avg_order_value_per_category) || 0,
      product_count: parseInt(row.product_count)
    }));
    
    res.status(200).json({
      success: true,
      data: {
        category_sales: categoryData
      }
    });
  } catch (error) {
    console.error('Get category sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get low stock alerts
const getLowStockAlerts = async (req, res) => {
  try {
    const { threshold = 10 } = req.query;
    
    const result = await query(
      `SELECT 
       p.product_id,
       p.name,
       p.category,
       p.stock_quantity,
       p.price,
       CASE 
         WHEN p.stock_quantity = 0 THEN 'Out of Stock'
         WHEN p.stock_quantity <= $1 THEN 'Critical Low Stock'
         WHEN p.stock_quantity <= ($1 * 2) THEN 'Low Stock'
         ELSE 'In Stock'
       END AS stock_status,
       (SELECT SUM(oi.quantity) 
        FROM order_items oi 
        JOIN orders o ON oi.order_id = o.order_id 
        WHERE oi.product_id = p.product_id 
        AND o.order_date >= NOW() - INTERVAL '30 days'
        AND o.status = 'Completed') as monthly_demand
       FROM products p
       WHERE p.stock_quantity <= ($1 * 2)
       ORDER BY p.stock_quantity ASC`,
      [parseInt(threshold)]
    );
    
    const lowStockData = result.rows.map(row => ({
      product_id: row.product_id,
      name: row.name,
      category: row.category,
      stock_quantity: parseInt(row.stock_quantity),
      price: parseFloat(row.price),
      stock_status: row.stock_status,
      monthly_demand: parseInt(row.monthly_demand) || 0
    }));
    
    res.status(200).json({
      success: true,
      data: {
        low_stock_alerts: lowStockData,
        total_alerts: lowStockData.length
      }
    });
  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get dashboard summary
const getDashboardSummary = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFilter = '';
    switch (period) {
      case 'today':
        dateFilter = "AND o.order_date >= CURRENT_DATE";
        break;
      case 'week':
        dateFilter = "AND o.order_date >= NOW() - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "AND o.order_date >= NOW() - INTERVAL '30 days'";
        break;
      case 'quarter':
        dateFilter = "AND o.order_date >= NOW() - INTERVAL '90 days'";
        break;
      case 'year':
        dateFilter = "AND o.order_date >= NOW() - INTERVAL '365 days'";
        break;
    }
    
    // Get overall statistics
    const statsResult = await query(
      `SELECT 
       COUNT(DISTINCT o.order_id) as total_orders,
       SUM(o.total_amount) as total_revenue,
       AVG(o.total_amount) as avg_order_value,
       COUNT(DISTINCT o.customer_id) as unique_customers,
       COUNT(CASE WHEN o.status = 'Completed' THEN 1 END) as completed_orders,
       COUNT(CASE WHEN o.status = 'Pending' THEN 1 END) as pending_orders,
       COUNT(CASE WHEN o.status = 'Processing' THEN 1 END) as processing_orders,
       COUNT(CASE WHEN o.status = 'Cancelled' THEN 1 END) as cancelled_orders
       FROM orders o
       WHERE 1=1 ${dateFilter}`,
      []
    );
    
    // Get product statistics
    const productStatsResult = await query(
      `SELECT 
       COUNT(*) as total_products,
       COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as out_of_stock,
       COUNT(CASE WHEN stock_quantity <= 10 THEN 1 END) as low_stock,
       AVG(price) as avg_product_price
       FROM products`,
      []
    );
    
    // Get customer statistics
    const customerStatsResult = await query(
      `SELECT 
       COUNT(*) as total_customers,
       COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_customers_month
       FROM customers`,
      []
    );
    
    // Get recent orders
    const recentOrdersResult = await query(
      `SELECT 
       o.order_id,
       o.order_date,
       o.total_amount,
       o.status,
       c.name as customer_name,
       c.shop_name
       FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       ORDER BY o.order_date DESC
       LIMIT 5`,
      []
    );
    
    // Get top customers by revenue
    const topCustomersResult = await query(
      `SELECT 
       c.customer_id,
       c.name,
       c.shop_name,
       COUNT(o.order_id) as total_orders,
       SUM(o.total_amount) as total_revenue,
       AVG(o.total_amount) as avg_order_value
       FROM customers c
       JOIN orders o ON c.customer_id = o.customer_id
       WHERE 1=1
       GROUP BY c.customer_id, c.name, c.shop_name
       ORDER BY total_revenue DESC
       LIMIT 5`,
      []
    );
    
    const stats = statsResult.rows[0];
    const productStats = productStatsResult.rows[0];
    const customerStats = customerStatsResult.rows[0];
    
    const summary = {
      orders: {
        total_orders: parseInt(stats.total_orders) || 0,
        total_revenue: parseFloat(stats.total_revenue) || 0,
        avg_order_value: parseFloat(stats.avg_order_value) || 0,
        completed_orders: parseInt(stats.completed_orders) || 0,
        pending_orders: parseInt(stats.pending_orders) || 0,
        processing_orders: parseInt(stats.processing_orders) || 0,
        cancelled_orders: parseInt(stats.cancelled_orders) || 0
      },
      products: {
        total_products: parseInt(productStats.total_products) || 0,
        out_of_stock: parseInt(productStats.out_of_stock) || 0,
        low_stock: parseInt(productStats.low_stock) || 0,
        avg_product_price: parseFloat(productStats.avg_product_price) || 0
      },
      customers: {
        total_customers: parseInt(customerStats.total_customers) || 0,
        new_customers_month: parseInt(customerStats.new_customers_month) || 0,
        unique_customers_period: parseInt(stats.unique_customers) || 0
      },
      recent_orders: recentOrdersResult.rows,
      top_customers: topCustomersResult.rows
    };
    
    res.status(200).json({
      success: true,
      data: {
        summary,
        period
      }
    });
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get sales trends
const getSalesTrends = async (req, res) => {
  try {
    const { period = 'month', granularity = 'daily' } = req.query;
    
    let dateFilter = '';
    let dateGrouping = '';
    
    switch (period) {
      case 'week':
        dateFilter = "AND order_date >= NOW() - INTERVAL '7 days'";
        dateGrouping = granularity === 'hourly' ? 'DATE_TRUNC(\'hour\', order_date)' : 'DATE(order_date)';
        break;
      case 'month':
        dateFilter = "AND order_date >= NOW() - INTERVAL '30 days'";
        dateGrouping = granularity === 'hourly' ? 'DATE_TRUNC(\'hour\', order_date)' : 'DATE(order_date)';
        break;
      case 'quarter':
        dateFilter = "AND order_date >= NOW() - INTERVAL '90 days'";
        dateGrouping = granularity === 'weekly' ? 'DATE_TRUNC(\'week\', order_date)' : 'DATE(order_date)';
        break;
      case 'year':
        dateFilter = "AND order_date >= NOW() - INTERVAL '365 days'";
        dateGrouping = granularity === 'monthly' ? 'DATE_TRUNC(\'month\', order_date)' : 'DATE_TRUNC(\'week\', order_date)';
        break;
      default:
        dateFilter = "AND order_date >= NOW() - INTERVAL '30 days'";
        dateGrouping = 'DATE(order_date)';
    }
    
    const result = await query(
      `SELECT 
       ${dateGrouping} as period,
       COUNT(*) as order_count,
       SUM(total_amount) as revenue,
       AVG(total_amount) as avg_order_value,
       COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_orders
       FROM orders
       WHERE 1=1 ${dateFilter}
       GROUP BY ${dateGrouping}
       ORDER BY period ASC`,
      []
    );
    
    const trends = result.rows.map(row => ({
      period: new Date(row.period).toISOString(),
      order_count: parseInt(row.order_count),
      revenue: parseFloat(row.revenue) || 0,
      avg_order_value: parseFloat(row.avg_order_value) || 0,
      completed_orders: parseInt(row.completed_orders)
    }));
    
    res.status(200).json({
      success: true,
      data: {
        trends,
        period,
        granularity
      }
    });
  } catch (error) {
    console.error('Get sales trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get customer analytics
const getCustomerAnalytics = async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    
    let dateFilter = '';
    if (period !== 'all') {
      switch (period) {
        case 'month':
          dateFilter = "AND o.order_date >= NOW() - INTERVAL '1 month'";
          break;
        case 'quarter':
          dateFilter = "AND o.order_date >= NOW() - INTERVAL '3 months'";
          break;
        case 'year':
          dateFilter = "AND o.order_date >= NOW() - INTERVAL '1 year'";
          break;
      }
    }
    
    // Customer acquisition over time
    const acquisitionResult = await query(
      `SELECT 
       DATE_TRUNC('month', created_at) as month,
       COUNT(*) as new_customers
       FROM customers
       WHERE created_at >= NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month ASC`,
      []
    );
    
    // Customer segmentation by order count
    const segmentationResult = await query(
      `SELECT 
       customer_segment,
       COUNT(*) as customer_count
       FROM (
         SELECT 
           customer_id,
           CASE 
             WHEN order_count = 1 THEN 'One-time'
             WHEN order_count BETWEEN 2 AND 5 THEN 'Occasional'
             WHEN order_count BETWEEN 6 AND 10 THEN 'Regular'
             ELSE 'VIP'
           END as customer_segment
         FROM (
           SELECT 
             c.customer_id,
             COUNT(o.order_id) as order_count
           FROM customers c
           LEFT JOIN orders o ON c.customer_id = o.customer_id
           GROUP BY c.customer_id
         ) customer_orders
       ) customer_segments
       GROUP BY customer_segment
       ORDER BY customer_count DESC`,
      []
    );
    
    // Top customers by revenue
    const topCustomersResult = await query(
      `SELECT 
       c.customer_id,
       c.name,
       c.shop_name,
       COUNT(o.order_id) as total_orders,
       COALESCE(SUM(o.total_amount), 0) as total_revenue,
       COALESCE(AVG(o.total_amount), 0) as avg_order_value,
       MAX(o.order_date) as last_order_date
       FROM customers c
       LEFT JOIN orders o ON c.customer_id = o.customer_id
       WHERE 1=1 OR o.status IS NULL
       GROUP BY c.customer_id, c.name, c.shop_name
       ORDER BY total_revenue DESC
       LIMIT 10`,
      []
    );
    
    const analytics = {
      acquisition_trends: acquisitionResult.rows.map(row => ({
        month: new Date(row.month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        new_customers: parseInt(row.new_customers)
      })),
      segmentation: segmentationResult.rows,
      top_customers: topCustomersResult.rows.map(row => ({
        customer_id: row.customer_id,
        name: row.name,
        shop_name: row.shop_name,
        total_orders: parseInt(row.total_orders),
        total_revenue: parseFloat(row.total_revenue) || 0,
        avg_order_value: parseFloat(row.avg_order_value) || 0,
        last_order_date: row.last_order_date
      }))
    };
    
    res.status(200).json({
      success: true,
      data: {
        analytics
      }
    });
  } catch (error) {
    console.error('Get customer analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getMonthlySales,
  getTopProducts,
  getCategorySales,
  getLowStockAlerts,
  getDashboardSummary,
  getSalesTrends,
  getCustomerAnalytics
};
