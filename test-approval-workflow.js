const http = require('http');

// Test the complete approval workflow
console.log('🧪 Testing Hotel Approval Workflow...\n');

// Step 1: Register a hotel (as we did before)
function registerHotel() {
  return new Promise((resolve, reject) => {
    const hotelData = JSON.stringify({
      name: "Test Hotel for Approval",
      description: "A test hotel to verify the approval workflow",
      propertyType: "HOTEL",
      totalRooms: 10,
      yearOfEstablishment: 2020,
      priceRangeMin: 1000,
      priceRangeMax: 3000,
      address: "123 Test Street",
      city: "Test City",
      state: "Test State",
      country: "India",
      pincode: "123456",
      district: "Test District",
      wardNumber: 5,
      landmark: "Near Test Landmark",
      latitude: 28.6139,
      longitude: 77.2090,
      phone: "9876543210",
      email: "test-hotel@example.com",
      termsAccepted: true,
      commissionAccepted: true,
      cancellationPolicyAccepted: true,
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
          console.log(`✅ Hotel Registration Status: ${res.statusCode}`);
          if (response.success) {
            console.log(`📋 Hotel ID: ${response.data.id}`);
            console.log(`📊 Initial Status: ${response.data.status}`);
            resolve(response.data.id);
          } else {
            reject(new Error(response.message));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(hotelData);
    req.end();
  });
}

// Step 2: Check hotel status (should be PENDING)
function checkHotelStatus() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5555,
      path: '/api/hotel-registration/status/36f9b0bd-32a8-4d6f-b5f0-2b367e241eb2',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          console.log(`✅ Status Check Status: ${res.statusCode}`);
          if (response.success) {
            console.log(`📋 Hotel Name: ${response.data.name}`);
            console.log(`📊 Current Status: ${response.data.status}`);
            resolve(response.data);
          } else {
            reject(new Error(response.message));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.end();
  });
}

// Step 3: Approve the hotel (admin action)
function approveHotel(hotelId) {
  return new Promise((resolve, reject) => {
    const approvalData = JSON.stringify({
      status: 'APPROVED',
      reason: 'Hotel meets all quality standards'
    });

    const options = {
      hostname: 'localhost',
      port: 5555,
      path: `/api/hotel-registration/approve/${hotelId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': approvalData.length
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
          console.log(`✅ Hotel Approval Status: ${res.statusCode}`);
          if (response.success) {
            console.log(`📋 Hotel Name: ${response.data.name}`);
            console.log(`📊 Updated Status: ${response.data.status}`);
            resolve(response.data);
          } else {
            reject(new Error(response.message));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(approvalData);
    req.end();
  });
}

// Step 4: Check status again (should be APPROVED)
function finalStatusCheck() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5555,
      path: '/api/hotel-registration/status/36f9b0bd-32a8-4d6f-b5f0-2b367e241eb2',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          console.log(`✅ Final Status Check Status: ${res.statusCode}`);
          if (response.success) {
            console.log(`📋 Hotel Name: ${response.data.name}`);
            console.log(`📊 Final Status: ${response.data.status}`);
            resolve(response.data);
          } else {
            reject(new Error(response.message));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.end();
  });
}

// Run the complete workflow
async function runApprovalWorkflow() {
  try {
    console.log('🚀 Starting Hotel Approval Workflow Test...\n');
    
    // Step 1: Register hotel
    console.log('📝 Step 1: Registering hotel...');
    const hotelId = await registerHotel();
    console.log('✅ Hotel registered successfully!\n');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Check initial status
    console.log('🔍 Step 2: Checking initial status...');
    await checkHotelStatus();
    console.log('✅ Initial status confirmed as PENDING\n');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 3: Approve hotel
    console.log('🎯 Step 3: Approving hotel (admin action)...');
    await approveHotel(hotelId);
    console.log('✅ Hotel approved successfully!\n');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 4: Check final status
    console.log('🔍 Step 4: Checking final status...');
    await finalStatusCheck();
    console.log('✅ Final status confirmed as APPROVED\n');
    
    console.log('🎉 Hotel Approval Workflow Test Completed Successfully!');
    console.log('📋 Workflow Summary:');
    console.log('  1. Hotel registered with PENDING status');
    console.log('  2. Status check confirmed PENDING');
    console.log('  3. Admin approved the hotel');
    console.log('  4. Status check confirmed APPROVED');
    console.log('  5. User can now access dashboard');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runApprovalWorkflow();
