const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('Creating test data with existing schema...');

    // First, let's see what hotels exist
    const existingHotels = await prisma.hotel.findMany({
      select: { id: true, name: true }
    });
    console.log('Existing hotels:', existingHotels);

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
        role: 'OWNER'
      }
    });
    console.log('✅ Test user created:', testUser.id);

    // Try to create hotel with different field combinations
    let testHotel;
    try {
      testHotel = await prisma.hotel.create({
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
    } catch (hotelError) {
      console.log('Hotel creation failed, trying with minimal fields...');
      // Try with absolute minimum
      testHotel = await prisma.hotel.create({
        data: {
          name: 'Test Hotel',
          address: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          country: 'India',
          pincode: '123456',
          phone: '+91-1234567890',
          email: 'hotel@test.com',
          ownerId: testUser.id
        }
      });
    }
    console.log('✅ Test hotel created:', testHotel.id);

    // Create test room
    const testRoom = await prisma.room.create({
      data: {
        name: 'Test Room',
        type: 'STANDARD',
        basePrice: 1000,
        maxOccupancy: 2,
        hotelId: testHotel.id
      }
    });
    console.log('✅ Test room created:', testRoom.id);

    console.log('\n🎉 Test data created successfully!');
    console.log('Hotel ID:', testHotel.id);
    console.log('Room ID:', testRoom.id);
    console.log('User ID:', testUser.id);

    return { hotelId: testHotel.id, roomId: testRoom.id, userId: testUser.id };

  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

createTestData().then(result => {
  if (result) {
    console.log('\nUse these IDs in your tests:');
    console.log(`Hotel: ${result.hotelId}`);
    console.log(`Room: ${result.roomId}`);
    console.log(`User: ${result.userId}`);
  }
});
