const { query } = require('./src/database/connection');

async function testMigration() {
  try {
    console.log('Testing database connection...');
    
    // Test if completed_at column exists
    const result = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name = 'completed_at'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ completed_at column already exists');
    } else {
      console.log('❌ completed_at column does not exist - need to run migration');
    }

    // Test current orders with completed_at
    const ordersResult = await query(`
      SELECT order_id, status, completed_at 
      FROM orders 
      WHERE status = 'Completed' 
      LIMIT 5
    `);
    
    console.log('📊 Sample completed orders:');
    ordersResult.rows.forEach(order => {
      console.log(`  Order #${order.order_id}: Status=${order.status}, Completed=${order.completed_at}`);
    });

    // Test new analytics query structure
    const analyticsResult = await query(`
      SELECT 
        DATE(completed_at) as sale_date,
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue
      FROM orders 
      WHERE status = 'Completed' 
        AND completed_at IS NOT NULL
        AND DATE(completed_at) = CURRENT_DATE
      GROUP BY DATE(completed_at)
    `);
    
    console.log('📈 Today\'s analytics (if any completed orders):');
    if (analyticsResult.rows.length > 0) {
      analyticsResult.rows.forEach(row => {
        console.log(`  Date: ${row.sale_date}, Orders: ${row.total_orders}, Revenue: ${row.total_revenue}`);
      });
    } else {
      console.log('  No completed orders today');
    }

    console.log('✅ Database test completed successfully');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  } finally {
    process.exit(0);
  }
}

testMigration();
