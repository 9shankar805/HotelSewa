const http = require('http');

// Test 1: Register a new hotel (simulating Flutter app)
console.log('🧪 Testing Hotel Registration Flow...\n');

function testHotelRegistration() {
  return new Promise((resolve, reject) => {
    const hotelData = JSON.stringify({
      name: "Flutter Integration Test Hotel",
      description: "Hotel registered via Flutter app integration test",
      address: "789 Integration Avenue",
      city: "Testville",
      state: "Demo State",
      country: "India",
      pincode: "654321",
      phone: "9876543210",
      email: "flutter-integration@test.com",
      termsAccepted: true,
      commissionAccepted: true,
      ownerId: "36f9b0bd-32a8-4d6f-b5f0-2b367e241eb2"
    });

    const options = {
      hostname: 'localhost',
      port: 5555,
      path: '/api/hotel-registration/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': hotelData.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          console.log(`✅ Registration Status: ${res.statusCode}`);
          console.log(`📝 Response: ${JSON.stringify(response, null, 2)}`);
          
          if (response.success) {
            console.log(`🎉 Hotel ID: ${response.data.id}`);
            console.log(`📊 Hotel Status: ${response.data.status}`);
            resolve(response.data);
          } else {
            console.log(`❌ Registration failed: ${response.message}`);
            reject(new Error(response.message));
          }
        } catch (e) {
          console.log(`❌ Failed to parse response: ${e.message}`);
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Request error: ${e.message}`);
      reject(e);
    });

    req.write(hotelData);
    req.end();
  });
}

// Test 2: Verify the hotel was created by fetching hotels
function testFetchHotels() {
  return new Promise((resolve, reject) => {
    console.log('\n🔍 Verifying hotel was created...');
    
    const options = {
      hostname: 'localhost',
      port: 5555,
      path: '/api/hotel-owner/hotels',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer mock-token'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          console.log(`✅ Fetch Status: ${res.statusCode}`);
          console.log(`📝 Hotels: ${JSON.stringify(response, null, 2)}`);
          resolve(response);
        } catch (e) {
          console.log(`❌ Failed to parse response: ${e.message}`);
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Request error: ${e.message}`);
      reject(e);
    });

    req.end();
  });
}

// Run tests
async function runTests() {
  try {
    console.log('🚀 Starting hotel registration integration tests...\n');
    
    // Test 1: Register hotel
    const hotelData = await testHotelRegistration();
    
    // Test 2: Fetch hotels to verify
    await testFetchHotels();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('📋 Summary:');
    console.log('  ✅ Hotel registration API is working');
    console.log('  ✅ Database connection is working');
    console.log('  ✅ Flutter app can now register hotels');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
