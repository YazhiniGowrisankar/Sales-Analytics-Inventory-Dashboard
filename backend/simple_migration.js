const { query } = require('./src/database/connection');

async function simpleMigration() {
  try {
    console.log('🚀 Starting simple sales analytics migration...');
    
    // Step 1: Check current table structure
    console.log('🔍 Checking current table structure...');
    const tableInfo = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Current columns:');
    tableInfo.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Step 2: Check if completed_at exists
    const hasCompletedAt = tableInfo.rows.some(col => col.column_name === 'completed_at');
    
    if (!hasCompletedAt) {
      console.log('📝 Adding completed_at column...');
      
      // Just add the column without complex operations
      try {
        await query(`ALTER TABLE orders ADD COLUMN completed_at TIMESTAMP NULL`);
        console.log('✅ completed_at column added successfully');
      } catch (error) {
        console.log('❌ Failed to add column:', error.message);
        
        // Try alternative approach
        try {
          console.log('🔄 Trying alternative approach...');
          await query(`ALTER TABLE orders ADD COLUMN completed_at TIMESTAMP`);
          console.log('✅ completed_at column added (alternative approach)');
        } catch (altError) {
          console.log('❌ Alternative approach also failed:', altError.message);
          return;
        }
      }
    } else {
      console.log('✅ completed_at column already exists');
    }
    
    // Step 3: Update existing completed orders
    console.log('📝 Updating existing completed orders...');
    try {
      const updateResult = await query(`
        UPDATE orders 
        SET completed_at = CASE 
          WHEN completed_at IS NULL AND status = 'Completed' THEN order_date
          ELSE completed_at
        END
      `);
      console.log(`✅ Updated ${updateResult.rowCount} orders with completed_at`);
    } catch (error) {
      console.log('❌ Failed to update existing orders:', error.message);
    }
    
    // Step 4: Test the new functionality
    console.log('🧪 Testing new analytics functionality...');
    try {
      const testResult = await query(`
        SELECT 
          COUNT(*) as total_completed_orders,
          COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as orders_with_completion_date,
          COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_status_orders
        FROM orders
      `);
      
      if (testResult.rows.length > 0) {
        const stats = testResult.rows[0];
        console.log('📊 Current order statistics:');
        console.log(`  Total orders: ${stats.total_completed_orders}`);
        console.log(`  Orders with completion date: ${stats.orders_with_completion_date}`);
        console.log(`  Orders with Completed status: ${stats.completed_status_orders}`);
        
        if (stats.orders_with_completion_date > 0) {
          console.log('✅ completed_at column is working!');
          
          // Test analytics query
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
          
          console.log('📈 Recent daily analytics:');
          analyticsTest.rows.forEach(day => {
            console.log(`  ${day.sale_date}: ${day.daily_orders} orders, ₹${day.daily_revenue} revenue`);
          });
        }
      }
    } catch (error) {
      console.log('❌ Test failed:', error.message);
    }
    
    console.log('✅ Simple migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    process.exit(0);
  }
}

simpleMigration();
