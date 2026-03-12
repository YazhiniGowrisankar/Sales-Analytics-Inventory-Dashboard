const { query } = require('./src/database/connection');

async function checkCompletedAtColumn() {
  try {
    console.log('🔍 Checking completed_at column...');
    
    // Check if completed_at column exists
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name = 'completed_at'
    `);
    
    console.log('📋 Column exists:', columnCheck.rows.length > 0 ? 'YES' : 'NO');
    
    if (columnCheck.rows.length > 0) {
      // Check sample data
      const sampleData = await query(`
        SELECT order_id, status, completed_at 
        FROM orders 
        WHERE completed_at IS NOT NULL 
        LIMIT 5
      `);
      console.log('📊 Sample completed_at data:', sampleData.rows);
    }
    
    // Check all orders with status
    const allOrders = await query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed,
             COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as with_completed_at
      FROM orders
    `);
    
    console.log('📈 Order status summary:', allOrders.rows[0]);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

checkCompletedAtColumn();
