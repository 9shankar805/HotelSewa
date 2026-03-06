const http = require('http');

// Test complete hotel registration with all required fields
const data = JSON.stringify({
  name: "Flutter Test Hotel",
  description: "A beautiful hotel registered via Flutter app",
  address: "456 Flutter Street",
  city: "App City",
  state: "Mobile State",
  country: "India",
  pincode: "123456",
  phone: "9876543210",
  email: "flutter@test.com",
  termsAccepted: true,
  commissionAccepted: true,
  ownerId: "36f9b0bd-32a8-4d6f-b5f0-2b367e241eb2" // Using the demo owner ID
});

const options = {
  hostname: 'localhost',
  port: 5555,
  path: '/api/hotel-registration/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log(`Response: ${body}`);
    try {
      const response = JSON.parse(body);
      if (response.success) {
        console.log('✅ Hotel registration successful!');
        console.log(`Hotel ID: ${response.data.id}`);
        console.log(`Status: ${response.data.status}`);
      } else {
        console.log('❌ Hotel registration failed:', response.message);
      }
    } catch (e) {
      console.log('❌ Failed to parse response:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
