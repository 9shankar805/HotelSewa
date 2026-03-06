const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserSchema() {
  try {
    // Get a user to see the actual fields
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        avatar_url: true
      }
    });
    
    console.log('User fields found:', Object.keys(user || {}));
    console.log('Sample user:', user);
    
    // Try updating with avatar field
    if (user) {
      try {
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { avatar: 'test-avatar-url' }
        });
        console.log('✅ Avatar field works');
      } catch (e) {
        console.log('❌ Avatar field failed:', e.message);
        
        // Try avatar_url
        try {
          const updated = await prisma.user.update({
            where: { id: user.id },
            data: { avatar_url: 'test-avatar-url' }
          });
          console.log('✅ avatar_url field works');
        } catch (e2) {
          console.log('❌ avatar_url field failed:', e2.message);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserSchema();
