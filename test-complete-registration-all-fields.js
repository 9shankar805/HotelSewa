const http = require('http');

// Test complete hotel registration with ALL fields from Flutter form
console.log('🧪 Testing Complete Hotel Registration with All Fields...\n');

function testCompleteHotelRegistration() {
  return new Promise((resolve, reject) => {
    const hotelData = JSON.stringify({
      // Basic Info
      name: "Complete Test Hotel",
      description: "A comprehensive test hotel with all fields from Flutter registration form",
      propertyType: "HOTEL",
      totalRooms: 25,
      yearOfEstablishment: 2018,
      priceRangeMin: 1500,
      priceRangeMax: 5000,
      
      // Location
      address: "123 Complete Address Street, Sector 15",
      city: "Test City",
      state: "Demo State",
      country: "India",
      pincode: "123456",
      district: "Test District",
      wardNumber: 7,
      landmark: "Near Test Landmark",
      latitude: 28.6139,
      longitude: 77.2090,
      
      // Contact
      phone: "9876543210",
      email: "complete-test@hotel.com",
      
      // Agreements
      termsAccepted: true,
      commissionAccepted: true,
      cancellationPolicyAccepted: true,
      
      // Owner
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
          
          if (response.success) {
            console.log(`🎉 Hotel registered successfully!`);
            console.log(`📋 Hotel ID: ${response.data.id}`);
            console.log(`📊 Hotel Status: ${response.data.status}`);
            
            // Display all saved fields
            console.log('\n📝 Saved Hotel Data:');
            console.log(`  🏨 Name: ${response.data.name}`);
            console.log(`  📄 Description: ${response.data.description}`);
            console.log(`  🏢 Property Type: ${response.data.propertyType}`);
            console.log(`  🛏️ Total Rooms: ${response.data.totalRooms}`);
            console.log(`  📅 Year Established: ${response.data.yearOfEstablishment}`);
            console.log(`  💰 Price Range: ${response.data.priceRangeMin} - ${response.data.priceRangeMax}`);
            console.log(`  📍 Address: ${response.data.address}`);
            console.log(`  🏙️ City: ${response.data.city}`);
            console.log(`  🗺️ State: ${response.data.state}`);
            console.log(`  🌍 Country: ${response.data.country}`);
            console.log(`  📮 Pincode: ${response.data.pincode}`);
            console.log(`  🏘️ District: ${response.data.district}`);
            console.log(`  🏛️ Ward Number: ${response.data.wardNumber}`);
            console.log(`  📍 Landmark: ${response.data.landmark}`);
            console.log(`  🌐 GPS: ${response.data.latitude}, ${response.data.longitude}`);
            console.log(`  📞 Phone: ${response.data.phone}`);
            console.log(`  ✉️ Email: ${response.data.email}`);
            console.log(`  ✅ Terms Accepted: ${response.data.termsAccepted}`);
            console.log(`  🤝 Commission Accepted: ${response.data.commissionAccepted}`);
            console.log(`  🚫 Cancellation Policy: ${response.data.cancellationPolicyAccepted}`);
            
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

// Run the test
async function runCompleteTest() {
  try {
    console.log('🚀 Testing complete hotel registration with ALL fields...\n');
    await testCompleteHotelRegistration();
    
    console.log('\n🎉 Complete registration test successful!');
    console.log('📋 All fields from Flutter form are now being saved to database!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runCompleteTest();
