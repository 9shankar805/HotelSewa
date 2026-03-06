-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "profileImage" TEXT,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "profileComplete" BOOLEAN NOT NULL DEFAULT true,
    "googleSub" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "hotels" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "pincode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "checkInTime" TEXT NOT NULL DEFAULT '14:00',
    "checkOutTime" TEXT NOT NULL DEFAULT '11:00',
    "amenities" TEXT NOT NULL DEFAULT '[]',
    "images" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rating" REAL,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "hotels_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "pricePerNight" REAL NOT NULL,
    "capacity" INTEGER NOT NULL,
    "inventory" INTEGER NOT NULL,
    "amenities" TEXT NOT NULL DEFAULT '[]',
    "images" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'available',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Room_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "checkInDate" DATETIME NOT NULL,
    "checkOutDate" DATETIME NOT NULL,
    "guests" INTEGER NOT NULL DEFAULT 1,
    "totalAmount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "specialRequests" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "bookings_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bookings_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hotelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "reviews_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "method" TEXT,
    "stripePaymentId" TEXT,
    "stripeRefundId" TEXT,
    "failureReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messages_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT,
    "hotelId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "lastMessage" TEXT,
    "lastMessageAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "conversations_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "conversations_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "conversations_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "conversations_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hotelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" REAL NOT NULL,
    "minAmount" REAL,
    "maxDiscount" REAL,
    "validFrom" DATETIME NOT NULL,
    "validTo" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "offers_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "offers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "amenities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "hotelId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "documents_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "category" TEXT NOT NULL,
    "response" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "bankAccount" TEXT NOT NULL,
    "ifscCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processedAt" DATETIME,
    "failureReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "withdrawals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "calendar_daily_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "calendar_daily_data_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "calendar_daily_data_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "calendar_bookings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomId" TEXT,
    "checkIn" DATETIME NOT NULL,
    "checkOut" DATETIME NOT NULL,
    "guests" INTEGER NOT NULL,
    "totalAmount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "calendar_bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "calendar_bookings_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "calendar_room_availability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hotelId" TEXT NOT NULL,
    "roomId" TEXT,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "available" INTEGER NOT NULL DEFAULT 0,
    "booked" INTEGER NOT NULL DEFAULT 0,
    "price" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "calendar_room_availability_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "calendar_room_availability_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "calendar_room_availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "calendar_pricing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hotelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "basePrice" REAL NOT NULL,
    "finalPrice" REAL NOT NULL,
    "priceType" TEXT NOT NULL DEFAULT 'dynamic',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "calendar_pricing_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "calendar_pricing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "lastMessage" TEXT,
    "lastMessageAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "chat_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chat_conversations_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chat_conversations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_online_status" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "chat_online_status_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_analytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "totalConversations" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTime" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "chat_analytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chat_analytics_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "offer_analytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "offerId" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "bookings" INTEGER NOT NULL DEFAULT 0,
    "revenue" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "offer_analytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "calendar_analytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "totalBookings" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" REAL NOT NULL DEFAULT 0,
    "occupancyRate" REAL,
    "avgDailyRate" REAL,
    "revPAR" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "calendar_analytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "calendar_analytics_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "bookings_hotelId_fkey" ON "bookings"("hotelId");

-- CreateIndex
CREATE INDEX "bookings_roomId_fkey" ON "bookings"("roomId");

-- CreateIndex
CREATE INDEX "bookings_userId_fkey" ON "bookings"("userId");

-- CreateIndex
CREATE INDEX "reviews_hotelId_fkey" ON "reviews"("hotelId");

-- CreateIndex
CREATE INDEX "reviews_userId_fkey" ON "reviews"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_bookingId_key" ON "payments"("bookingId");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

-- CreateIndex
CREATE INDEX "messages_receiverId_idx" ON "messages"("receiverId");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_bookingId_key" ON "conversations"("bookingId");

-- CreateIndex
CREATE INDEX "conversations_hotelId_idx" ON "conversations"("hotelId");

-- CreateIndex
CREATE INDEX "conversations_guestId_idx" ON "conversations"("guestId");

-- CreateIndex
CREATE INDEX "conversations_ownerId_idx" ON "conversations"("ownerId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "offers_hotelId_idx" ON "offers"("hotelId");

-- CreateIndex
CREATE INDEX "offers_userId_idx" ON "offers"("userId");

-- CreateIndex
CREATE INDEX "documents_userId_idx" ON "documents"("userId");

-- CreateIndex
CREATE INDEX "documents_hotelId_idx" ON "documents"("hotelId");

-- CreateIndex
CREATE INDEX "support_tickets_userId_idx" ON "support_tickets"("userId");

-- CreateIndex
CREATE INDEX "withdrawals_userId_idx" ON "withdrawals"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_daily_data_hotelId_date_key" ON "calendar_daily_data"("hotelId", "date");

-- CreateIndex
CREATE INDEX "calendar_bookings_userId_idx" ON "calendar_bookings"("userId");

-- CreateIndex
CREATE INDEX "calendar_bookings_hotelId_idx" ON "calendar_bookings"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_room_availability_hotelId_roomId_date_key" ON "calendar_room_availability"("hotelId", "roomId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_pricing_hotelId_date_key" ON "calendar_pricing"("hotelId", "date");

-- CreateIndex
CREATE INDEX "chat_conversations_userId_idx" ON "chat_conversations"("userId");

-- CreateIndex
CREATE INDEX "chat_conversations_hotelId_idx" ON "chat_conversations"("hotelId");

-- CreateIndex
CREATE INDEX "chat_messages_conversationId_idx" ON "chat_messages"("conversationId");

-- CreateIndex
CREATE INDEX "chat_messages_senderId_idx" ON "chat_messages"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_online_status_userId_key" ON "chat_online_status"("userId");

-- CreateIndex
CREATE INDEX "chat_analytics_userId_idx" ON "chat_analytics"("userId");

-- CreateIndex
CREATE INDEX "chat_analytics_hotelId_idx" ON "chat_analytics"("hotelId");

-- CreateIndex
CREATE INDEX "offer_analytics_userId_idx" ON "offer_analytics"("userId");

-- CreateIndex
CREATE INDEX "offer_analytics_offerId_idx" ON "offer_analytics"("offerId");

-- CreateIndex
CREATE INDEX "calendar_analytics_userId_idx" ON "calendar_analytics"("userId");

-- CreateIndex
CREATE INDEX "calendar_analytics_hotelId_idx" ON "calendar_analytics"("hotelId");
