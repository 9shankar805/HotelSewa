const http = require('http');

const data = JSON.stringify({
  name: "Test Hotel",
  address: "123 Test St",
  city: "Test City",
  phone: "1234567890",
  email: "test@example.com",
  termsAccepted: true,
  commissionAccepted: true
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
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  res.on('data', (chunk) => {
    console.log(`Body: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
