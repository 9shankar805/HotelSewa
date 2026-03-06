const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createRoom() {
  try {
    const hotelId = '5a469eab-d3b7-4347-925c-26ff1cc4a1a6';
    
    const room = await prisma.room.create({
      data: {
        name: 'Test Room',
        pricePerNight: 1000,
        capacity: 2,
        inventory: 1,
        hotelId: hotelId
      }
    });
    
    console.log('✅ Room created:', room.id);
    return room.id;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

createRoom().then(roomId => {
  if (roomId) {
    console.log('Update test file with room ID:', roomId);
  }
});
