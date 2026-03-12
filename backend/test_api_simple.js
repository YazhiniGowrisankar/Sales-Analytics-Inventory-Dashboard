const http = require('http');

const testData = JSON.stringify({
  dates: ['2026-03-08']
});

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/sales/analytics',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testData)
  }
};

const req = http.request(options, (res) => {
  console.log('📊 Status:', res.statusCode);
  console.log('📊 Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      console.log('✅ Response:', JSON.stringify(jsonData, null, 2));
    } catch (error) {
      console.log('❌ Parse error:', error.message);
      console.log('📄 Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
});

req.write(testData);
req.end();

console.log('📡 Sending request to:', options.path);
console.log('📤 Data:', testData);
