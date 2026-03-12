const { query } = require('./src/database/connection');

async function verifyCompletedAt() {
  try {
    console.log('🔍 Verifying completed_at column status...\n');
    
    // Check if completed_at column exists
    const columnCheck = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'completed_at'
    `);
    
    if (columnCheck.rows.length > 0) {
      const column = columnCheck.rows[0];
      console.log('✅ completed_at column found:');
      console.log(`   Type: ${column.data_type}`);
      console.log(`   Nullable: ${column.is_nullable}`);
      
      // Check data in completed_at column
      const dataCheck = await query(`
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as orders_with_completion,
          COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_status_orders
        FROM orders
      `);
      
      const stats = dataCheck.rows[0];
      console.log('\n📊 Current Data Status:');
      console.log(`   Total orders: ${stats.total_orders}`);
      console.log(`   Orders with completion date: ${stats.orders_with_completion}`);
      console.log(`   Orders with Completed status: ${stats.completed_status_orders}`);
      
      // Test analytics query
      console.log('\n🧪 Testing analytics query...');
      try {
        const analyticsTest = await query(`
          SELECT 
            DATE(completed_at) as sale_date,
            COUNT(*) as daily_orders,
            COALESCE(SUM(total_amount), 0) as daily_revenue
          FROM orders 
          WHERE status = 'Completed' 
            AND completed_at IS NOT NULL
          GROUP BY DATE(completed_at)
          ORDER BY sale_date DESC
          LIMIT 5
        `);
        
        console.log('✅ Analytics query works!');
        console.log('📈 Recent daily analytics:');
        analyticsTest.rows.forEach(day => {
          console.log(`   ${day.sale_date}: ${day.daily_orders} orders, ₹${day.daily_revenue} revenue`);
        });
        
        // Test sales analytics API functionality
        console.log('\n🌐 Testing sales analytics controller...');
        const { getSalesAnalytics } = require('./src/controllers/salesAnalyticsController');
        
        // Mock request/response for testing
        const mockReq = {
          body: { dates: ['2026-03-01', '2026-03-05', '2026-03-10'] }
        };
        
        let responseData = null;
        const mockRes = {
          status: (code) => {
            console.log(`   Response status: ${code}`);
            return mockRes;
          },
          json: (data) => {
            responseData = data;
            console.log('   Response data received');
          }
        };
        
        await getSalesAnalytics(mockReq, mockRes);
        
        if (responseData && responseData.success) {
          console.log('✅ Sales analytics controller working!');
          console.log('📊 Analytics data structure ready');
        } else {
          console.log('❌ Sales analytics controller needs attention');
        }
        
      } catch (analyticsError) {
        console.log(`❌ Analytics query failed: ${analyticsError.message}`);
      }
      
    } else {
      console.log('❌ completed_at column does not exist');
      console.log('📝 Need to run migration script');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    process.exit(0);
  }
}

verifyCompletedAt();
