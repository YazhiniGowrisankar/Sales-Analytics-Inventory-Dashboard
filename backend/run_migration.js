const { query } = require('./src/database/connection');

async function runMigration() {
  try {
    console.log('🚀 Starting sales analytics migration...');
    
    // Step 1: Add completed_at column
    console.log('📝 Adding completed_at column...');
    await query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL
    `);
    console.log('✅ completed_at column added');
    
    // Step 2: Add comment
    console.log('📝 Adding column comment...');
    await query(`
      COMMENT ON COLUMN orders.completed_at IS 'Timestamp when order status was changed to Completed'
    `);
    console.log('✅ Column comment added');
    
    // Step 3: Create index
    console.log('📝 Creating index on completed_at...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_orders_completed_at 
      ON orders(completed_at) 
      WHERE completed_at IS NOT NULL
    `);
    console.log('✅ Index created');
    
    // Step 4: Create trigger function
    console.log('📝 Creating trigger function...');
    await query(`
      CREATE OR REPLACE FUNCTION update_completed_at()
      RETURNS TRIGGER AS $$
      BEGIN
          -- If status is being updated to 'Completed' and completed_at is NULL, set it to current timestamp
          IF NEW.status = 'Completed' AND (OLD.status IS DISTINCT FROM 'Completed' OR OLD.completed_at IS NULL) THEN
              NEW.completed_at = CURRENT_TIMESTAMP;
          ELSIF NEW.status IS DISTINCT FROM 'Completed' THEN
              -- If status is changed from 'Completed' to something else, clear completed_at
              NEW.completed_at = NULL;
          END IF;
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('✅ Trigger function created');
    
    // Step 5: Create trigger
    console.log('📝 Creating trigger...');
    await query(`
      DROP TRIGGER IF EXISTS trigger_update_completed_at ON orders;
      CREATE TRIGGER trigger_update_completed_at
          BEFORE UPDATE ON orders
          FOR EACH ROW
          EXECUTE FUNCTION update_completed_at()
    `);
    console.log('✅ Trigger created');
    
    // Step 6: Update existing completed orders
    console.log('📝 Updating existing completed orders...');
    const updateResult = await query(`
      UPDATE orders 
      SET completed_at = order_date 
      WHERE status = 'Completed' AND completed_at IS NULL
    `);
    console.log(`✅ Updated ${updateResult.rowCount} existing completed orders`);
    
    // Step 7: Verify migration
    console.log('🔍 Verifying migration...');
    const verifyResult = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name = 'completed_at'
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Migration completed successfully!');
      
      // Test the new functionality
      const testResult = await query(`
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
      
      console.log('📊 Test query results:');
      if (testResult.rows.length > 0) {
        testResult.rows.forEach(row => {
          console.log(`  Date: ${row.sale_date}, Orders: ${row.total_orders}, Revenue: ${row.total_revenue}`);
        });
      } else {
        console.log('  No completed orders today (test passed)');
      }
      
    } else {
      console.log('❌ Migration failed - column not found');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
  } finally {
    process.exit(0);
  }
}

runMigration();
