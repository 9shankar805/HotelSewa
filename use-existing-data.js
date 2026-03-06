const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function useExistingData() {
  try {
    console.log('Using existing hotel data...');

    // Get existing hotel
    const existingHotel = await prisma.hotel.findFirst();
    console.log('Using existing hotel:', existingHotel.id, existingHotel.name);

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
        role: 'OWNER'
      }
    });
    console.log('✅ Test user created:', testUser.id);

    // Create test room for existing hotel
    const testRoom = await prisma.room.create({
      data: {
        name: 'Test Room',
        type: 'STANDARD',
        basePrice: 1000,
        maxOccupancy: 2,
        hotelId: existingHotel.id
      }
    });
    console.log('✅ Test room created:', testRoom.id);

    console.log('\n🎉 Test data ready!');
    console.log('Hotel ID:', existingHotel.id);
    console.log('Room ID:', testRoom.id);
    console.log('User ID:', testUser.id);

    // Update test file with real IDs
    const fs = require('fs');
    let testContent = fs.readFileSync('test-all-apis.js', 'utf8');
    
    testContent = testContent.replace(/test-hotel-id/g, existingHotel.id);
    testContent = testContent.replace(/test-room-id/g, testRoom.id);
    testContent = testContent.replace(/test-user-id/g, testUser.id);
    
    fs.writeFileSync('test-all-apis.js', testContent);
    console.log('✅ Test file updated with real IDs');

    return { hotelId: existingHotel.id, roomId: testRoom.id, userId: testUser.id };

  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

useExistingData();
