const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const owner = await prisma.user.upsert({
    where: { email: 'owner@oyo.com' },
    update: {},
    create: {
      email: 'owner@oyo.com',
      name: 'Hotel Owner',
      phone: '+1234567890',
      passwordHash: hashedPassword,
      role: 'OWNER',
      verified: true,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      name: 'John Customer',
      phone: '+0987654321',
      passwordHash: hashedPassword,
      role: 'CUSTOMER',
      verified: true,
    },
  });

  // Create hotel
  const hotel = await prisma.hotel.create({
    data: {
      ownerId: owner.id,
      name: 'Grand Palace Hotel',
      description: 'Luxury hotel in the heart of the city',
      address: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      pincode: '400001',
      phone: '+91-22-12345678',
      email: 'info@grandpalace.com',
      amenities: JSON.stringify(['WiFi', 'AC', 'Pool', 'Gym']),
      images: JSON.stringify(['/uploads/hotel1.jpg', '/uploads/hotel2.jpg']),
      status: 'APPROVED',
    },
  });

  // Create rooms
  const rooms = await Promise.all([
    prisma.room.create({
      data: {
        hotelId: hotel.id,
        roomNumber: '101',
        name: 'Deluxe Room',
        type: 'Deluxe',
        pricePerNight: 2500.0,
        capacity: 2,
        size: 300.0,
        floor: 1,
        status: 'AVAILABLE',
        amenities: JSON.stringify(['AC', 'WiFi', 'TV', 'Mini Bar']),
        description: 'Spacious deluxe room with city view',
        images: JSON.stringify(['/uploads/room1.jpg']),
      },
    }),
    prisma.room.create({
      data: {
        hotelId: hotel.id,
        roomNumber: '102',
        name: 'Standard Room',
        type: 'Standard',
        pricePerNight: 1500.0,
        capacity: 2,
        size: 200.0,
        floor: 1,
        status: 'AVAILABLE',
        amenities: JSON.stringify(['AC', 'WiFi', 'TV']),
        description: 'Comfortable standard room',
        images: JSON.stringify(['/uploads/room2.jpg']),
      },
    }),
  ]);

  // Create booking
  const booking = await prisma.booking.create({
    data: {
      userId: customer.id,
      hotelId: hotel.id,
      roomId: rooms[0].id,
      checkInDate: new Date('2024-12-25'),
      checkOutDate: new Date('2024-12-27'),
      guests: 2,
      totalAmount: 5000.0,
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      specialRequests: 'Late check-in requested',
    },
  });

  // Create amenities
  const amenities = await Promise.all([
    prisma.amenity.create({
      data: {
        name: 'Free WiFi',
        icon: 'wifi',
        category: 'Internet',
        description: 'High-speed internet access',
      },
    }),
    prisma.amenity.create({
      data: {
        name: 'Air Conditioning',
        icon: 'ac_unit',
        category: 'Comfort',
        description: 'Climate controlled rooms',
      },
    }),
    prisma.amenity.create({
      data: {
        name: 'Swimming Pool',
        icon: 'pool',
        category: 'Recreation',
        description: 'Outdoor swimming pool',
      },
    }),
  ]);

  // Create notification
  await prisma.notification.create({
    data: {
      userId: owner.id,
      title: 'New Booking Received',
      message: 'You have received a new booking for Room 101',
      type: 'booking',
      isRead: false,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log(`👤 Owner: ${owner.email} (password: password123)`);
  console.log(`👤 Customer: ${customer.email} (password: password123)`);
  console.log(`🏨 Hotel: ${hotel.name}`);
  console.log(`🛏️ Rooms: ${rooms.length} created`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });