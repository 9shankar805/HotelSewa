const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRoomFields() {
  try {
    // Get any room to see available fields
    const room = await prisma.room.findFirst();
    if (room) {
      console.log('Available room fields:', Object.keys(room));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRoomFields();
