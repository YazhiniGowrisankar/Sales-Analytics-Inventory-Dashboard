const express = require('express');
const { getSalesAnalytics } = require('./src/controllers/salesAnalyticsController');

// Create a simple Express app for testing
const app = express();
app.use(express.json());

// Add the sales analytics route
app.post('/api/sales/analytics', getSalesAnalytics);

// Test the endpoint
app.post('/test', (req, res) => {
  console.log('🧪 Testing with request body:', req.body);
  
  // Call the actual controller
  getSalesAnalytics(req, res);
});

const port = 5002;
app.listen(port, () => {
  console.log(`🧪 Test server running on port ${port}`);
  
  // Test the endpoint
  setTimeout(() => {
    const testData = {
      dates: ['2026-03-08']
    };
    
    fetch(`http://localhost:${port}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })
    .then(response => response.json())
    .then(data => {
      console.log('✅ Test result:', data);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test error:', error);
      process.exit(1);
    });
  }, 1000);
});
