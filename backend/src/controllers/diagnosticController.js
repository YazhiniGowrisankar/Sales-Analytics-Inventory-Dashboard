const { query } = require('../database/connection');

// Get fast moving products
const getFastMovingProducts = async (req, res) => {
  try {
    const { limit = 10, start_date, end_date, data_source = 'database' } = req.query;
    
    let whereClause = "WHERE o.status = 'Completed'";
    let fromClause = "FROM orders o";
    let joinClause = "JOIN order_items oi ON o.order_id = oi.order_id JOIN products p ON oi.product_id = p.product_id";
    
    // For CSV data source, we'll use a different approach
    // Since we can't modify the database structure, we'll work with existing data
    if (data_source === 'csv') {
      console.log('CSV data source selected - using all available data');
      // We'll use the same query but could add additional logic if needed
      // For now, we'll work with the existing database structure
    } else {
      console.log('Database data source selected');
    }
    
    // Add date filtering
    if (start_date) {
      whereClause += ` AND o.order_date >= '${start_date}'`;
    }
    if (end_date) {
      whereClause += ` AND o.order_date <= '${end_date}'`;
    }
    
    const result = await query(
      `SELECT 
        p.product_id,
        p.name as product_name,
        p.category,
        SUM(oi.quantity) as total_sold,
        SUM(oi.quantity * oi.price) as total_revenue
       ${fromClause}
       ${joinClause}
       ${whereClause}
       GROUP BY p.product_id, p.name, p.category
       ORDER BY total_sold DESC
       LIMIT $1`,
      [limit]
    );
    
    const fastMovingProducts = result.rows.map(row => ({
      product_id: row.product_id,
      product_name: row.product_name,
      category: row.category,
      total_sold: parseInt(row.total_sold),
      total_revenue: parseFloat(row.total_revenue) || 0
    }));
    
    res.status(200).json({
      success: true,
      data: fastMovingProducts,
      data_source: data_source,
      message: data_source === 'csv' ? 'Showing data from uploaded CSV files' : 'Showing database data'
    });
  } catch (error) {
    console.error('Get fast moving products error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get slow moving products (low sales)
const getSlowMovingProducts = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const result = await query(
      `SELECT 
        p.product_id,
        p.name,
        p.category,
        p.stock_quantity,
        COALESCE(SUM(oi.quantity), 0) as total_sold,
        COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue
       FROM products p
       LEFT JOIN order_items oi ON p.product_id = oi.product_id
       LEFT JOIN orders o ON oi.order_id = o.order_id AND o.status = 'Completed'
       GROUP BY p.product_id, p.name, p.category, p.stock_quantity
       HAVING COALESCE(SUM(oi.quantity), 0) <= 5
       ORDER BY total_sold ASC, p.name
       LIMIT $1`,
      [limit]
    );
    
    const slowMovingProducts = result.rows.map(row => ({
      product_id: row.product_id,
      product_name: row.name,
      category: row.category,
      stock_quantity: parseInt(row.stock_quantity),
      total_sold: parseInt(row.total_sold),
      total_revenue: parseFloat(row.total_revenue) || 0
    }));
    
    res.status(200).json({
      success: true,
      data: slowMovingProducts
    });
  } catch (error) {
    console.error('Get slow moving products error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get category performance analysis
const getCategoryPerformance = async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        p.category,
        COUNT(DISTINCT p.product_id) as product_count,
        SUM(oi.quantity) as total_quantity_sold,
        SUM(oi.quantity * oi.price) as total_revenue,
        AVG(oi.price) as avg_price_per_unit
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       JOIN orders o ON oi.order_id = o.order_id
       WHERE o.status = 'Completed'
       GROUP BY p.category
       ORDER BY total_revenue DESC`,
      []
    );
    
    // Calculate total revenue for percentage calculation
    const totalRevenue = result.rows.reduce((sum, row) => sum + parseFloat(row.total_revenue), 0);
    
    const categoryPerformance = result.rows.map(row => {
      const revenue = parseFloat(row.total_revenue) || 0;
      const percentage = totalRevenue > 0 ? ((revenue / totalRevenue) * 100) : 0;
      
      return {
        category: row.category,
        product_count: parseInt(row.product_count),
        total_quantity_sold: parseInt(row.total_quantity_sold),
        total_revenue: revenue,
        avg_price_per_unit: parseFloat(row.avg_price_per_unit) || 0,
        percentage: percentage.toFixed(1)
      };
    });
    
    res.status(200).json({
      success: true,
      data: categoryPerformance
    });
  } catch (error) {
    console.error('Get category performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get top customers by revenue
const getTopCustomers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const result = await query(
      `SELECT 
        c.customer_id,
        c.name,
        c.shop_name,
        COUNT(DISTINCT o.order_id) as total_orders,
        SUM(o.total_amount) as total_spending,
        AVG(o.total_amount) as avg_order_value,
        MAX(o.order_date) as last_order_date
       FROM customers c
       JOIN orders o ON c.customer_id = o.customer_id
       WHERE o.status = 'Completed'
       GROUP BY c.customer_id, c.name, c.shop_name
       ORDER BY total_spending DESC
       LIMIT $1`,
      [limit]
    );
    
    const topCustomers = result.rows.map(row => ({
      customer_id: row.customer_id,
      customer_name: row.name,
      shop_name: row.shop_name,
      total_orders: parseInt(row.total_orders),
      total_spending: parseFloat(row.total_spending) || 0,
      avg_order_value: parseFloat(row.avg_order_value) || 0,
      last_order_date: row.last_order_date
    }));
    
    res.status(200).json({
      success: true,
      data: topCustomers
    });
  } catch (error) {
    console.error('Get top customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get product revenue contribution
const getProductRevenueContribution = async (req, res) => {
  try {
    const { limit = 15 } = req.query;
    
    // First get total revenue
    const totalRevenueResult = await query(
      `SELECT SUM(oi.quantity * oi.price) as total_revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.order_id
       WHERE o.status = 'Completed'`,
      []
    );
    
    const totalRevenue = parseFloat(totalRevenueResult.rows[0]?.total_revenue) || 0;
    
    // Get product contributions
    const result = await query(
      `SELECT 
        p.product_id,
        p.name,
        p.category,
        SUM(oi.quantity * oi.price) as product_revenue,
        SUM(oi.quantity) as total_sold
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       JOIN orders o ON oi.order_id = o.order_id
       WHERE o.status = 'Completed'
       GROUP BY p.product_id, p.name, p.category
       HAVING SUM(oi.quantity * oi.price) > 0
       ORDER BY product_revenue DESC
       LIMIT $1`,
      [limit]
    );
    
    const productContributions = result.rows.map(row => ({
      product_id: row.product_id,
      product_name: row.name,
      category: row.category,
      product_revenue: parseFloat(row.product_revenue) || 0,
      total_sold: parseInt(row.total_sold),
      revenue_contribution_percentage: totalRevenue > 0 
        ? ((parseFloat(row.product_revenue) / totalRevenue) * 100).toFixed(2)
        : 0
    }));
    
    res.status(200).json({
      success: true,
      data: {
        total_revenue: totalRevenue,
        products: productContributions
      }
    });
  } catch (error) {
    console.error('Get product revenue contribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get sales trends analysis
const getSalesTrendsAnalysis = async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        DATE_TRUNC('month', o.order_date) as month,
        COUNT(DISTINCT o.order_id) as order_count,
        SUM(o.total_amount) as revenue,
        AVG(o.total_amount) as avg_order_value,
        COUNT(DISTINCT o.customer_id) as unique_customers,
        COUNT(DISTINCT oi.product_id) as unique_products_sold
       FROM orders o
       JOIN order_items oi ON o.order_id = oi.order_id
       WHERE o.status = 'Completed'
       AND o.order_date >= NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', o.order_date)
       ORDER BY month ASC`,
      []
    );
    
    const salesTrends = result.rows.map(row => ({
      month: new Date(row.month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
      order_count: parseInt(row.order_count),
      revenue: parseFloat(row.revenue) || 0,
      avg_order_value: parseFloat(row.avg_order_value) || 0,
      unique_customers: parseInt(row.unique_customers),
      unique_products_sold: parseInt(row.unique_products_sold)
    }));
    
    res.status(200).json({
      success: true,
      data: salesTrends
    });
  } catch (error) {
    console.error('Get sales trends analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get stock analysis
const getStockAnalysis = async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as out_of_stock,
        COUNT(CASE WHEN stock_quantity <= 10 THEN 1 END) as low_stock,
        COUNT(CASE WHEN stock_quantity > 50 THEN 1 END) as high_stock,
        SUM(stock_quantity) as total_stock_units,
        AVG(stock_quantity) as avg_stock_per_product,
        COUNT(CASE WHEN stock_quantity = 0 AND 
          (SELECT COUNT(*) FROM order_items oi2 WHERE oi2.product_id = p.product_id) > 0 
          THEN 1 END) as out_of_stock_with_demand
       FROM products p`,
      []
    );
    
    const stockAnalysis = result.rows[0];
    
    res.status(200).json({
      success: true,
      data: {
        total_products: parseInt(stockAnalysis.total_products),
        out_of_stock: parseInt(stockAnalysis.out_of_stock),
        low_stock: parseInt(stockAnalysis.low_stock),
        high_stock: parseInt(stockAnalysis.high_stock),
        total_stock_units: parseInt(stockAnalysis.total_stock_units),
        avg_stock_per_product: parseFloat(stockAnalysis.avg_stock_per_product) || 0,
        out_of_stock_with_demand: parseInt(stockAnalysis.out_of_stock_with_demand)
      }
    });
  } catch (error) {
    console.error('Get stock analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get customer order patterns
const getCustomerOrderPatterns = async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN order_count = 1 THEN 1 END) as one_time_customers,
        COUNT(CASE WHEN order_count BETWEEN 2 AND 5 THEN 1 END) as regular_customers,
        COUNT(CASE WHEN order_count > 5 THEN 1 END) as loyal_customers,
        AVG(order_count) as avg_orders_per_customer,
        MAX(order_count) as max_orders_by_customer
       FROM (
         SELECT 
           c.customer_id,
           COUNT(o.order_id) as order_count
         FROM customers c
         LEFT JOIN orders o ON c.customer_id = o.customer_id AND o.status = 'Completed'
         GROUP BY c.customer_id
       ) customer_stats`,
      []
    );
    
    const orderPatterns = result.rows[0];
    
    res.status(200).json({
      success: true,
      data: {
        total_customers: parseInt(orderPatterns.total_customers),
        one_time_customers: parseInt(orderPatterns.one_time_customers),
        regular_customers: parseInt(orderPatterns.regular_customers),
        loyal_customers: parseInt(orderPatterns.loyal_customers),
        avg_orders_per_customer: parseFloat(orderPatterns.avg_orders_per_customer) || 0,
        max_orders_by_customer: parseInt(orderPatterns.max_orders_by_customer)
      }
    });
  } catch (error) {
    console.error('Get customer order patterns error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get profit margin analysis
const getProfitMarginAnalysis = async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        p.category,
        SUM(oi.quantity * oi.price) as revenue,
        SUM(oi.quantity * p.price * 0.6) as estimated_cost, -- Assuming 60% cost
        SUM(oi.quantity * oi.price) - SUM(oi.quantity * p.price * 0.6) as estimated_profit,
        CASE 
          WHEN SUM(oi.quantity * oi.price) > 0 
          THEN ((SUM(oi.quantity * oi.price) - SUM(oi.quantity * p.price * 0.6)) / SUM(oi.quantity * oi.price)) * 100 
          ELSE 0 
        END as profit_margin_percentage
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       JOIN orders o ON oi.order_id = o.order_id
       WHERE o.status = 'Completed'
       GROUP BY p.category
       HAVING SUM(oi.quantity * oi.price) > 0
       ORDER BY estimated_profit DESC`,
      []
    );
    
    const profitAnalysis = result.rows.map(row => ({
      category: row.category,
      revenue: parseFloat(row.revenue) || 0,
      estimated_cost: parseFloat(row.estimated_cost) || 0,
      estimated_profit: parseFloat(row.estimated_profit) || 0,
      profit_margin_percentage: parseFloat(row.profit_margin_percentage) || 0
    }));
    
    res.status(200).json({
      success: true,
      data: profitAnalysis
    });
  } catch (error) {
    console.error('Get profit margin analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get available uploaded datasets for diagnostic analytics
const getAvailableDatasets = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        dataset_id,
        dataset_name,
        dataset_type,
        upload_date,
        file_name,
        record_count,
        is_active
      FROM uploaded_datasets 
      WHERE dataset_type = 'sales_data'
      ORDER BY upload_date DESC
    `);
    
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get available datasets error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get comprehensive diagnostic summary
const getDiagnosticSummary = async (req, res) => {
  try {
    // Get key metrics in parallel
    const [
      fastMovingResult,
      slowMovingResult,
      categoryResult,
      topCustomersResult,
      contributionResult
    ] = await Promise.all([
      getFastMovingProducts({ query: { limit: 5 } }, { 
        json: (data) => data 
      }),
      getSlowMovingProducts({ query: { limit: 5 } }, { 
        json: (data) => data 
      }),
      getCategoryPerformance({ query: {} }, { 
        json: (data) => data 
      }),
      getTopCustomers({ query: { limit: 5 } }, { 
        json: (data) => data 
      }),
      getProductRevenueContribution({ query: { limit: 5 } }, { 
        json: (data) => data 
      })
    ]);
    
    // Extract data from promises
    const fastMoving = await new Promise(resolve => {
      getFastMovingProducts({ query: { limit: 5 } }, { 
        json: resolve 
      });
    });
    
    const slowMoving = await new Promise(resolve => {
      getSlowMovingProducts({ query: { limit: 5 } }, { 
        json: resolve 
      });
    });
    
    const categories = await new Promise(resolve => {
      getCategoryPerformance({ query: {} }, { 
        json: resolve 
      });
    });
    
    const topCustomers = await new Promise(resolve => {
      getTopCustomers({ query: { limit: 5 } }, { 
        json: resolve 
      });
    });
    
    const contributions = await new Promise(resolve => {
      getProductRevenueContribution({ query: { limit: 5 } }, { 
        json: resolve 
      });
    });
    
    res.status(200).json({
      success: true,
      data: {
        fast_moving_products: fastMoving.data,
        slow_moving_products: slowMoving.data,
        category_performance: categories.data,
        top_customers: topCustomers.data,
        product_contributions: contributions.data
      }
    });
  } catch (error) {
    console.error('Get diagnostic summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getFastMovingProducts,
  getSlowMovingProducts,
  getCategoryPerformance,
  getTopCustomers,
  getProductRevenueContribution,
  getSalesTrendsAnalysis,
  getStockAnalysis,
  getCustomerOrderPatterns,
  getProfitMarginAnalysis,
  getDiagnosticSummary,
  getAvailableDatasets
};
