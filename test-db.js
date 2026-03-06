const { PrismaClient } = require('@prisma/client');

async function testDatabase() {
  const prisma = new PrismaClient();
  
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully!');
    
    // Test basic query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Basic query successful:', result);
    
    // Check if tables exist
    const tables = await prisma.$queryRaw`SHOW TABLES`;
    console.log('📊 Available tables:', tables);
    
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
