const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserFields() {
  try {
    // Get any user to see available fields
    const user = await prisma.user.findFirst();
    if (user) {
      console.log('Available user fields:', Object.keys(user));
    }
    
    // Try to find image-related fields
    const userModel = prisma.user;
    console.log('User model fields:', Object.keys(userModel.fields || {}));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserFields();
