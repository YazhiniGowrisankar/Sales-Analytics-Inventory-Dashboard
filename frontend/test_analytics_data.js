import { analyticsAPI } from './src/services/api';

async function testAnalyticsData() {
  console.log('🔍 Testing Analytics API Data...');
  
  try {
    // Test Monthly Sales
    console.log('\n📊 Testing Monthly Sales...');
    const monthlySalesResponse = await analyticsAPI.getMonthlySales({ months: 6 });
    console.log('Monthly Sales Response:', monthlySalesResponse.data);
    console.log('Monthly Sales Data:', monthlySalesResponse.data.data?.monthly_sales);
    
    // Test Top Products
    console.log('\n🏆 Testing Top Products...');
    const topProductsResponse = await analyticsAPI.getTopProducts({ limit: 10, period: 'month' });
    console.log('Top Products Response:', topProductsResponse.data);
    console.log('Top Products Data:', topProductsResponse.data.data?.top_products);
    
    // Test Category Sales
    console.log('\n📂 Testing Category Sales...');
    const categorySalesResponse = await analyticsAPI.getCategorySales({ period: 'month' });
    console.log('Category Sales Response:', categorySalesResponse.data);
    console.log('Category Sales Data:', categorySalesResponse.data.data?.category_sales);
    
    // Test Low Stock Alerts
    console.log('\n⚠️ Testing Low Stock Alerts...');
    const lowStockResponse = await analyticsAPI.getLowStockAlerts();
    console.log('Low Stock Response:', lowStockResponse.data);
    console.log('Low Stock Data:', lowStockResponse.data.data?.low_stock_alerts);
    
    // Test Sales Trends
    console.log('\n📈 Testing Sales Trends...');
    const salesTrendsResponse = await analyticsAPI.getSalesTrends({ period: 'month' });
    console.log('Sales Trends Response:', salesTrendsResponse.data);
    console.log('Sales Trends Data:', salesTrendsResponse.data.data?.trends);
    
    // Test Customer Analytics
    console.log('\n👥 Testing Customer Analytics...');
    const customerAnalyticsResponse = await analyticsAPI.getCustomerAnalytics();
    console.log('Customer Analytics Response:', customerAnalyticsResponse.data);
    console.log('Customer Analytics Data:', customerAnalyticsResponse.data.data?.analytics);
    
  } catch (error) {
    console.error('❌ API Test Error:', error);
  }
}

// Run the test
testAnalyticsData();
