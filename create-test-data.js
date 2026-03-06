const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('Creating test data...');

    // Create test user
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        name: 'Test User',
        role: 'OWNER'
      }
    });
    console.log('✅ Test user created:', testUser.id);

    // Create test hotel
    const testHotel = await prisma.hotel.upsert({
      where: { id: 'test-hotel-id' },
      update: {},
      create: {
        id: 'test-hotel-id',
        name: 'Test Hotel',
        description: 'A test hotel for upload testing',
        address: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        country: 'India',
        pincode: '123456',
        phone: '+91-1234567890',
        email: 'hotel@test.com',
        ownerId: testUser.id,
        status: 'APPROVED',
        images: [],
        amenities: []
      }
    });
    console.log('✅ Test hotel created:', testHotel.id);

    // Create test room
    const testRoom = await prisma.room.upsert({
      where: { id: 'test-room-id' },
      update: {},
      create: {
        id: 'test-room-id',
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

    console.log('🎉 Test data created successfully!');
    console.log('Hotel ID:', testHotel.id);
    console.log('Room ID:', testRoom.id);
    console.log('User ID:', testUser.id);

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();
