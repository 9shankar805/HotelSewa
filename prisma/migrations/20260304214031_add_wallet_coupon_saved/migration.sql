-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT,
    "referenceId" TEXT,
    "balanceBefore" REAL NOT NULL,
    "balanceAfter" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "saved_hotels" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_hotels_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "saved_hotels_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" REAL NOT NULL,
    "minAmount" REAL,
    "maxDiscount" REAL,
    "validFrom" DATETIME NOT NULL,
    "validTo" DATETIME NOT NULL,
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "coupon_usages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT,
    "usedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coupon_usages_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");

-- CreateIndex
CREATE INDEX "wallet_transactions_walletId_idx" ON "wallet_transactions"("walletId");

-- CreateIndex
CREATE INDEX "saved_hotels_userId_idx" ON "saved_hotels"("userId");

-- CreateIndex
CREATE INDEX "saved_hotels_hotelId_idx" ON "saved_hotels"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_hotels_userId_hotelId_key" ON "saved_hotels"("userId", "hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupon_usages_couponId_idx" ON "coupon_usages"("couponId");

-- CreateIndex
CREATE INDEX "coupon_usages_userId_idx" ON "coupon_usages"("userId");
