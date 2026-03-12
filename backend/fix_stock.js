const { query } = require('./src/database/connection');

async function fixStock() {
  try {
    console.log('🔧 Checking product stock...');
    
    // Check the problematic product
    const result = await query(`
      SELECT product_id, name, category, price, stock_quantity 
      FROM products 
      WHERE name = 'Compuss' OR name ILIKE '%compuss%'
    `);
    
    if (result.rows.length > 0) {
      const product = result.rows[0];
      console.log(`📦 Found product: ${product.name} (ID: ${product.product_id})`);
      console.log(`📊 Current stock: ${product.stock_quantity}`);
      
      if (product.stock_quantity < 0) {
        console.log('⚠️  Stock is negative, fixing...');
        await query(
          'UPDATE products SET stock_quantity = 100 WHERE product_id = $1',
          [product.product_id]
        );
        console.log('✅ Stock updated to 100');
      } else if (product.stock_quantity < 10) {
        console.log('⚠️  Stock is low, increasing...');
        await query(
          'UPDATE products SET stock_quantity = 100 WHERE product_id = $1',
          [product.product_id]
        );
        console.log('✅ Stock updated to 100');
      } else {
        console.log('✅ Stock is sufficient');
      }
    } else {
      console.log('❌ Product not found');
    }
    
    // Check all products with low stock
    const lowStockResult = await query(`
      SELECT product_id, name, stock_quantity 
      FROM products 
      WHERE stock_quantity < 10
    `);
    
    if (lowStockResult.rows.length > 0) {
      console.log(`\n🔧 Found ${lowStockResult.rows.length} products with low stock:`);
      for (const product of lowStockResult.rows) {
        console.log(`- ${product.name}: ${product.stock_quantity}`);
        await query(
          'UPDATE products SET stock_quantity = 50 WHERE product_id = $1',
          [product.product_id]
        );
        console.log(`  ✅ Updated to 50`);
      }
    }
    
    console.log('\n🎉 Stock fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing stock:', error);
  } finally {
    process.exit(0);
  }
}

fixStock();
