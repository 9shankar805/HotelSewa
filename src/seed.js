const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  const demoPasswordHash = await bcrypt.hash('demo123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      name: 'Demo Admin',
      passwordHash: demoPasswordHash,
      role: 'ADMIN',
      verified: true,
      profileComplete: true,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@demo.com' },
    update: {},
    create: {
      email: 'customer@demo.com',
      name: 'Demo Customer',
      passwordHash: demoPasswordHash,
      role: 'CUSTOMER',
      verified: true,
      profileComplete: true,
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: 'owner@demo.com' },
    update: {},
    create: {
      email: 'owner@demo.com',
      name: 'Demo Owner',
      passwordHash: demoPasswordHash,
      role: 'OWNER',
      verified: true,
      profileComplete: true,
    },
  });

  const h1 = await prisma.hotel.create({
    data: {
      ownerId: owner.id,
      name: 'OYO Townhouse Central',
      city: 'San Francisco',
      state: 'California',
      address: '123 Market St',
      pincode: '94105',
      phone: '+1-555-0101',
      email: 'info@townhouse.com',
      amenities: JSON.stringify(['wifi', 'ac', 'breakfast']),
      images: JSON.stringify([]),
      description: 'Modern stay in the heart of the city.',
      status: 'APPROVED',
    },
  });

  const h2 = await prisma.hotel.create({
    data: {
      ownerId: owner.id,
      name: 'OYO Flagship Downtown',
      city: 'San Jose',
      state: 'California',
      address: '500 1st St',
      pincode: '95110',
      phone: '+1-555-0102',
      email: 'info@flagship.com',
      amenities: JSON.stringify(['wifi', 'parking']),
      images: JSON.stringify([]),
      description: 'Budget-friendly comfort near downtown.',
      status: 'APPROVED',
    },
  });

  await prisma.room.createMany({
    data: [
      {
        hotelId: h1.id,
        roomNumber: '101',
        name: 'Deluxe Room',
        pricePerNight: 129,
        capacity: 2,
        inventory: 5,
      },
      {
        hotelId: h1.id,
        roomNumber: '201',
        name: 'Suite',
        pricePerNight: 199,
        capacity: 3,
        inventory: 2,
      },
      {
        hotelId: h2.id,
        roomNumber: '101',
        name: 'Standard Room',
        pricePerNight: 89,
        capacity: 2,
        inventory: 8,
      },
    ],
  });

  console.log('✅ Seed complete');
}

seed()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
