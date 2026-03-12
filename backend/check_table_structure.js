const { query } = require('./src/database/connection');

async function checkTableStructure() {
  try {
    console.log('🔍 Checking orders table structure...\n');
    
    // Get all columns in orders table
    const columns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Orders Table Columns:');
    columns.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (Nullable: ${col.is_nullable})`);
    });
    
    // Check if there are any completed orders
    const ordersCheck = await query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM orders
      GROUP BY status
    `);
    
    console.log('\n📊 Orders by Status:');
    ordersCheck.rows.forEach(status => {
      console.log(`   ${status.status}: ${status.count} orders`);
    });
    
    // Check if we can add the column
    console.log('\n🧪 Testing column addition...');
    try {
      await query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL');
      console.log('✅ completed_at column added successfully!');
      
      // Update existing completed orders
      const updateResult = await query(`
        UPDATE orders 
        SET completed_at = order_date 
        WHERE status = 'Completed' AND completed_at IS NOT NULL
      `);
      console.log(`✅ Updated ${updateResult.rowCount} existing completed orders`);
      
      // Verify the column was added
      const verifyResult = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'completed_at'
      `);
      
      if (verifyResult.rows.length > 0) {
        console.log('✅ completed_at column verification successful!');
        
        // Test analytics query
        console.log('\n📈 Testing analytics functionality...');
        const testAnalytics = await query(`
          SELECT 
            DATE(completed_at) as sale_date,
            COUNT(*) as daily_orders,
            COALESCE(SUM(total_amount), 0) as daily_revenue
          FROM orders 
          WHERE status = 'Completed' 
            AND completed_at IS NOT NULL
          GROUP BY DATE(completed_at)
          ORDER BY sale_date DESC
          LIMIT 3
        `);
        
        console.log('📊 Sample analytics data:');
        testAnalytics.rows.forEach(day => {
          if (day.sale_date) {
            console.log(`   ${day.sale_date}: ${day.daily_orders} orders, ₹${day.daily_revenue} revenue`);
          }
        });
        
        console.log('\n🎉 completed_at column is ready for sales analytics!');
        
      } else {
        console.log('❌ Column verification failed');
      }
      
    } catch (error) {
      console.log(`❌ Cannot add column: ${error.message}`);
      console.log('📝 Manual database intervention required');
    }
    
  } catch (error) {
    console.error('❌ Table structure check failed:', error.message);
  } finally {
    process.exit(0);
  }
}

checkTableStructure();
