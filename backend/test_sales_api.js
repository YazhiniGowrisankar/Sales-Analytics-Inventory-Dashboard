const { getSalesAnalytics } = require('./src/controllers/salesAnalyticsController');

async function testSalesAPI() {
  try {
    console.log('🧪 Testing Sales Analytics API...');
    
    const mockReq = {
      body: {
        dates: ['2026-03-08']
      }
    };
    
    const mockRes = {
      status: (code) => {
        console.log('📊 Response status:', code);
      },
      json: (data) => {
        console.log('📈 Response data:', JSON.stringify(data, null, 2));
      }
    };
    
    await getSalesAnalytics(mockReq, mockRes);
    
  } catch (error) {
    console.error('❌ API Test Error:', error.message);
  }
  process.exit(0);
}

testSalesAPI();
