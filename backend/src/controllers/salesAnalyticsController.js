const { query } = require('../database/connection');

// Get sales analytics with multiple date filtering
const getSalesAnalytics = async (req, res) => {
  try {
    console.log('📊 Request received:', req.body);
    console.log('📊 Response object type:', typeof res);
    console.log('📊 Response object methods:', Object.getOwnPropertyNames(res));
    
    const { dates } = req.body; // Array of dates like ['2026-03-01', '2026-03-05', '2026-03-10']
    
    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      console.log('❌ Invalid dates received');
      return res.status(400).json({
        success: false,
        message: 'Dates array is required'
      });
    }

    console.log('📊 Processing dates:', dates);

    // Simple summary query
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_order_value,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM orders 
      WHERE status = 'Completed' 
        AND completed_at IS NOT NULL
        AND DATE(completed_at) = ANY($1)
    `;

    const result = await query(summaryQuery, [dates]);

    const summary = {
      total_orders: parseInt(result.rows[0]?.total_orders || 0),
      total_revenue: parseFloat(result.rows[0]?.total_revenue || 0),
      average_order_value: parseFloat(result.rows[0]?.average_order_value || 0),
      unique_customers: parseInt(result.rows[0]?.unique_customers || 0)
    };

    // Daily analytics query
    const dailyQuery = `
      SELECT 
        DATE(completed_at) as sale_date,
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_order_value,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM orders 
      WHERE status = 'Completed' 
        AND completed_at IS NOT NULL
        AND DATE(completed_at) = ANY($1)
      GROUP BY DATE(completed_at)
      ORDER BY sale_date
    `;

    const dailyResult = await query(dailyQuery, [dates]);

    const analyticsData = {
      summary,
      daily_analytics: dailyResult.rows,
      detailed_sales: [],
      top_products: [],
      top_customers: []
    };

    console.log('✅ Successfully prepared analytics data');
    console.log('📊 About to send response, res.json method exists:', typeof res.json);

    res.status(200).json({
      success: true,
      data: analyticsData
    });

    console.log('✅ Response sent successfully');

  } catch (error) {
    console.error('Sales analytics error:', error);
    console.error('📊 Error details:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales analytics',
      error: error.message
    });
  }
};

// Get sales trends for date range (for charts)
const getSalesTrends = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const trendsQuery = `
      SELECT 
        DATE(completed_at) as sale_date,
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_order_value,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM orders 
      WHERE status = 'Completed' 
        AND completed_at IS NOT NULL
        AND DATE(completed_at) BETWEEN $1 AND $2
      GROUP BY DATE(completed_at)
      ORDER BY sale_date ASC
    `;

    const result = await query(trendsQuery, [start_date, end_date]);

    res.status(200).json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Sales trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales trends',
      error: error.message
    });
  }
};

module.exports = {
  getSalesAnalytics,
  getSalesTrends
};
