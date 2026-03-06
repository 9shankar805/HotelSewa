const path = require("path");
const fs = require("fs");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { createProxyMiddleware } = require("http-proxy-middleware");
const prisma = require("./lib/prisma");

const { authRouter } = require("./routes/auth");
const { hotelsRouter } = require("./routes/hotels");
const { bookingsRouter } = require("./routes/bookings");
const { adminRouter } = require("./routes/admin");
const paymentsRouter = require("./routes/payments");
const pricingRouter = require("./routes/pricing");
const loyaltyRouter = require("./routes/loyalty");
const checkinRouter = require("./routes/checkin");
const propertyManagementRouter = require("./routes/propertyManagement");
const hotelOnboardingRouter = require("./routes/hotelOnboarding");
const uploadRouter = require("./routes/upload-cloudinary");
const hotelOwnerRouter = require("./routes/hotel-owner");
const hotelOwnerDynamicRouter = require("./routes/hotel-owner-dynamic");
const hotelOwnerCompleteRouter = require("./routes/hotel-owner-complete");
const hotelOwnerAdditionalRouter = require("./routes/hotel-owner-additional");
const roomManagementRouter = require("./routes/room-management");
const ownerAuthRouter = require("./routes/owner-auth");
const reviewsRouter = require("./routes/reviews");
const hotelRegistrationRouter = require("./routes/hotel-registration");
const offersRouter = require("./routes/offers");
const calendarRouter = require("./routes/calendar");
const chatRouter = require("./routes/chat");
const customerRouter = require("./routes/customer");
const dashboardRouter = require("./routes/dashboard");

const app = express();

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP"
});
app.use("/api/", limiter);

// CORS - restrict in production
const allowedOrigins = process.env.NODE_ENV === "production" 
  ? [CLIENT_ORIGIN]
  : [CLIENT_ORIGIN, "http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://192.168.100.82:3000"];

app.use(cors({ 
  origin: allowedOrigins, 
  credentials: true 
}));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

app.get("/health", (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.get("/ready", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "up" });
  } catch (e) {
    res.status(503).json({ ok: false, db: "down", error: e.message });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/hotels", hotelsRouter);
app.use("/api/rooms", roomManagementRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/pricing", pricingRouter);
app.use("/api/loyalty", loyaltyRouter);
app.use("/api/checkin", checkinRouter);
app.use("/api/property-management", propertyManagementRouter);
app.use("/api/hotel-onboarding", hotelOnboardingRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/hotel-owner", hotelOwnerRouter);
app.use("/api/hotel-owner", hotelOwnerDynamicRouter);
app.use("/api/hotel-owner", hotelOwnerCompleteRouter);
app.use("/api/hotel-owner", hotelOwnerAdditionalRouter);
app.use("/api/owner-auth", ownerAuthRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/hotel-registration", hotelRegistrationRouter);
app.use("/api/offers", offersRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/chat", chatRouter);
app.use("/api/customer", customerRouter);
app.use("/api/hotel-owner", dashboardRouter);

const VITE_DEV_SERVER = process.env.VITE_DEV_SERVER || "http://localhost:5173";
if (process.env.NODE_ENV !== "production") {
  const viteProxy = createProxyMiddleware({
    target: VITE_DEV_SERVER,
    changeOrigin: true,
    ws: true,
    logLevel: "warn"
  });

  app.use((req, res, next) => {
    const pathname = req.path || "";
    if (pathname.startsWith("/api") || pathname.startsWith("/uploads") || pathname.startsWith("/health") || pathname.startsWith("/ready")) {
      return next();
    }
    return viteProxy(req, res, next);
  });
}

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Server error" });
});

async function start() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected");
    app.listen(PORT, () => {
      console.log(`🚀 API running on http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error("❌ Failed to start server:", e);
    process.exit(1);
  }
}

start();
