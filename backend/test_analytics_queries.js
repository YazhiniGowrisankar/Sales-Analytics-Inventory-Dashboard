const { query } = require('./src/database/connection');

async function testAnalyticsQueries() {
  try {
    console.log('🔍 Testing analytics queries...');
    
    // Test monthly sales query (without status filter)
    const monthlySales = await query(`
      SELECT 
       DATE_TRUNC('month', order_date) as month,
       COUNT(*) as total_orders,
       SUM(total_amount) as total_revenue,
       AVG(total_amount) as avg_order_value,
       COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_orders
       FROM orders
       WHERE order_date >= NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', order_date)
       ORDER BY month ASC
    `);
    console.log('📊 Monthly sales data:', monthlySales.rows);
    
    // Test top products query (without status filter)
    const topProducts = await query(`
      SELECT 
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
       WHERE o.order_date >= NOW() - INTERVAL '1 month'
       GROUP BY p.product_id, p.name, p.category
       ORDER BY total_quantity_sold DESC
       LIMIT 10
    `);
    console.log('🏆 Top products data:', topProducts.rows);
    
    // Test category sales query
    const categorySales = await query(`
      SELECT 
       p.category,
       COUNT(DISTINCT oi.order_id) as order_count,
       SUM(oi.quantity) as total_quantity,
       SUM(oi.quantity * oi.price) as total_revenue
       FROM products p
       JOIN order_items oi ON p.product_id = oi.product_id
       JOIN orders o ON oi.order_id = o.order_id
       WHERE o.order_date >= NOW() - INTERVAL '1 month'
       GROUP BY p.category
       ORDER BY total_revenue DESC
    `);
    console.log('📂 Category sales data:', categorySales.rows);
    
    // Test low stock query
    const lowStock = await query(`
      SELECT 
       p.product_id,
       p.name,
       p.category,
       p.stock_quantity,
       p.price
       FROM products p
       WHERE p.stock_quantity <= 10
       ORDER BY p.stock_quantity ASC
       LIMIT 10
    `);
    console.log('⚠️ Low stock data:', lowStock.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

testAnalyticsQueries();
