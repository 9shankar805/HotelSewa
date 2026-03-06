const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createQuickTestData() {
  try {
    console.log('Creating minimal test data...');

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
        role: 'OWNER'
      }
    });
    console.log('✅ Test user created:', testUser.id);

    // Create test hotel with minimal required fields
    const testHotel = await prisma.hotel.create({
      data: {
        name: 'Test Hotel',
        address: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        country: 'India',
        pincode: '123456',
        phone: '+91-1234567890',
        email: 'hotel@test.com',
        ownerId: testUser.id,
        images: [],
        amenities: []
      }
    });
    console.log('✅ Test hotel created:', testHotel.id);

    // Create test room
    const testRoom = await prisma.room.create({
      data: {
        name: 'Test Room',
        type: 'STANDARD',
        basePrice: 1000,
        maxOccupancy: 2,
        amenities: [],
        images: [],
        hotelId: testHotel.id
      }
    });
    console.log('✅ Test room created:', testRoom.id);

    console.log('\n🎉 Test data created successfully!');
    console.log('Hotel ID:', testHotel.id);
    console.log('Room ID:', testRoom.id);
    console.log('User ID:', testUser.id);

    // Update test file with these IDs
    const fs = require('fs');
    let testContent = fs.readFileSync('test-all-apis.js', 'utf8');
    
    // Replace hardcoded IDs with actual ones
    testContent = testContent.replace('test-hotel-id', testHotel.id);
    testContent = testContent.replace('test-room-id', testRoom.id);
    testContent = testContent.replace('test-user-id', testUser.id);
    
    fs.writeFileSync('test-all-apis.js', testContent);
    console.log('✅ Test file updated with real IDs');

  } catch (error) {
    console.error('❌ Error creating test data:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createQuickTestData();
