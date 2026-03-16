const { query } = require('../src/database/connection');

async function addDataSourceColumn() {
  try {
    console.log('Adding data_source column to orders table...');
    
    // Add the column if it doesn't exist
    await query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS data_source VARCHAR(20) DEFAULT 'database'
    `);
    
    // Update existing records
    await query(`
      UPDATE orders 
      SET data_source = 'database' 
      WHERE data_source IS NULL
    `);
    
    // Add index for performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_orders_data_source 
      ON orders(data_source)
    `);
    
    console.log('✅ data_source column added successfully!');
    
    // Test the column
    const result = await query(`
      SELECT COUNT(*) as total, 
             COUNT(CASE WHEN data_source = 'database' THEN 1 END) as database_count,
             COUNT(CASE WHEN data_source = 'csv' THEN 1 END) as csv_count
      FROM orders
    `);
    
    console.log('📊 Current data distribution:', result.rows[0]);
    
  } catch (error) {
    console.error('❌ Error adding data_source column:', error);
  } finally {
    process.exit(0);
  }
}

addDataSourceColumn();
