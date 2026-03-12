const { Pool } = require('pg');

// Try different database connection configurations
const configs = [
  {
    name: 'Current Config',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'sri_kannan_traders',
    user: process.env.DB_USER || 'sri_kannan',
    password: process.env.DB_PASSWORD || 'sri_kannan123'
  },
  {
    name: 'PostgreSQL Superuser',
    host: 'localhost',
    port: 5432,
    database: 'sri_kannan_traders',
    user: 'postgres',
    password: 'postgres'  // Try default postgres password
  },
  {
    name: 'Alternative Superuser',
    host: 'localhost',
    port: 5432,
    database: 'sri_kannan_traders',
    user: 'postgres',
    password: ''  // Try empty password
  }
];

async function testConfigs() {
  console.log('🔍 Testing database connection configurations...\n');
  
  for (const config of configs) {
    console.log(`📋 Testing: ${config.name}`);
    console.log(`   User: ${config.user}`);
    console.log(`   Database: ${config.database}`);
    
    const pool = new Pool(config);
    
    try {
      // Test basic connection
      const result = await pool.query('SELECT NOW()');
      console.log('   ✅ Connection successful!');
      
      // Test if we can alter table
      try {
        await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'orders' AND column_name = 'completed_at'
        `);
        
        if (result.rows.length === 0) {
          console.log('   📝 completed_at column does not exist');
          
          // Try to add it
          try {
            await pool.query('ALTER TABLE orders ADD COLUMN completed_at TIMESTAMP NULL');
            console.log('   ✅ completed_at column added successfully!');
            
            // Update existing data
            await pool.query(`
              UPDATE orders 
              SET completed_at = order_date 
              WHERE status = 'Completed' AND completed_at IS NULL
            `);
            console.log('   ✅ Existing orders updated!');
            
          } catch (alterError) {
            console.log(`   ❌ Cannot add column: ${alterError.message}`);
          }
        } else {
          console.log('   ✅ completed_at column already exists');
        }
        
      } catch (queryError) {
        console.log(`   ❌ Query failed: ${queryError.message}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Connection failed: ${error.message}`);
    }
    
    await pool.end();
    console.log('---');
  }
  
  console.log('\n🎯 Database connection testing complete!');
  console.log('\n📋 Manual SQL Commands:');
  console.log('If automated approach fails, execute these commands manually:');
  console.log('1. psql -U postgres -d sri_kannan_traders');
  console.log('2. \\i manual_db_commands.sql');
}

testConfigs().catch(console.error);
