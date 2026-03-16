// Test script for Diagnostic Analytics API
const diagnosticController = require('./src/controllers/diagnosticController');

// Mock response object
const mockResponse = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    console.log(`Response Status: ${this.statusCode}`);
    console.log('Response Data:', JSON.stringify(data, null, 2));
    return this;
  }
};

// Mock request objects
const mockRequests = {
  fastMoving: {
    query: { limit: 5 }
  },
  slowMoving: {
    query: { limit: 5 }
  },
  categoryPerformance: {
    query: {}
  },
  topCustomers: {
    query: { limit: 5 }
  },
  productContribution: {
    query: { limit: 5 }
  }
};

async function testDiagnosticAPIs() {
  console.log('🧪 Testing Diagnostic Analytics API...\n');
  
  try {
    // Test Fast Moving Products
    console.log('📊 Testing Fast Moving Products...');
    await diagnosticController.getFastMovingProducts(mockRequests.fastMoving, mockResponse);
    console.log('✅ Fast Moving Products test completed\n');
    
    // Test Slow Moving Products
    console.log('📉 Testing Slow Moving Products...');
    await diagnosticController.getSlowMovingProducts(mockRequests.slowMoving, mockResponse);
    console.log('✅ Slow Moving Products test completed\n');
    
    // Test Category Performance
    console.log('📈 Testing Category Performance...');
    await diagnosticController.getCategoryPerformance(mockRequests.categoryPerformance, mockResponse);
    console.log('✅ Category Performance test completed\n');
    
    // Test Top Customers
    console.log('👥 Testing Top Customers...');
    await diagnosticController.getTopCustomers(mockRequests.topCustomers, mockResponse);
    console.log('✅ Top Customers test completed\n');
    
    // Test Product Revenue Contribution
    console.log('💰 Testing Product Revenue Contribution...');
    await diagnosticController.getProductRevenueContribution(mockRequests.productContribution, mockResponse);
    console.log('✅ Product Revenue Contribution test completed\n');
    
    console.log('🎉 All Diagnostic API tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the tests
testDiagnosticAPIs();
