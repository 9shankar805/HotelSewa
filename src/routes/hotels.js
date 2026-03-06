const express = require("express");
const path = require("path");
const multer = require("multer");
const { v4: uuid } = require("uuid");

const { hotels, rooms, reviews } = require("../data/store");
const { requireAuth, requireRole } = require("../middleware/auth");
const { schemas, validate } = require("../lib/validate");

const hotelsRouter = express.Router();

hotelsRouter.get("/mine", requireAuth, requireRole(["owner", "admin"]), async (req, res) => {
  const where = req.user.role === "admin" ? {} : { ownerId: req.user.sub };
  const list = await hotels.findMany({ where, orderBy: { createdAt: "desc" } });
  res.json(list);
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, "..", "..", "uploads")),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
});

hotelsRouter.get("/", async (req, res) => {
  const { location, minPrice, maxPrice, amenity } = req.query;
  const where = { status: "APPROVED" };
  const include = { rooms: true, reviews: true };
  const list = await hotels.findMany({ where, include });

  let result = list;
  if (location) {
    const q = String(location).toLowerCase();
    result = result.filter((h) => h.location.toLowerCase().includes(q));
  }
  if (amenity) {
    const a = String(amenity).toLowerCase();
    result = result.filter((h) => (h.amenities || []).map((x) => String(x).toLowerCase()).includes(a));
  }
  const min = minPrice ? Number(minPrice) : null;
  const max = maxPrice ? Number(maxPrice) : null;
  if (min != null || max != null) {
    result = result.filter((h) => {
      const prices = h.rooms.map((r) => r.pricePerNight);
      if (!prices.length) return false;
      const low = Math.min(...prices);
      if (min != null && low < min) return false;
      if (max != null && low > max) return false;
      return true;
    });
  }

  const withStartingPrice = result.map((h) => {
    const startingPrice = h.rooms.length ? Math.min(...h.rooms.map((r) => r.pricePerNight)) : null;
    const rating = h.reviews.length
      ? h.reviews.reduce((acc, r) => acc + r.rating, 0) / h.reviews.length
      : null;
    const { rooms: _, reviews: __, ...rest } = h;
    return { ...rest, startingPrice, rating };
  });

  res.json(withStartingPrice);
});

hotelsRouter.get("/:id", async (req, res) => {
  const hotel = await hotels.findUnique({
    where: { id: req.params.id, status: "APPROVED" },
    include: { rooms: true, reviews: { include: { user: { select: { name: true } } } } },
  });
  if (!hotel) return res.status(404).json({ error: "Hotel not found" });

  res.json(hotel);
});

hotelsRouter.post("/", requireAuth, requireRole(["owner", "admin"]), validate(schemas.hotel.create), async (req, res) => {
  const { name, location, address, amenities, description } = req.validated;
  const hotel = await hotels.create({
    data: {
      ownerId: req.user.sub,
      name,
      location,
      address: address || "",
      amenities: Array.isArray(amenities) ? amenities : [],
      description: description || "",
      images: [],
      status: req.user.role === "ADMIN" ? "APPROVED" : "PENDING",
    },
  });
  res.status(201).json(hotel);
});

hotelsRouter.post(
  "/:id/images",
  requireAuth,
  requireRole(["owner", "admin"]),
  upload.array("images", 10),
  async (req, res) => {
    const hotel = await hotels.findUnique({ where: { id: req.params.id } });
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });

    if (req.user.role === "OWNER" && hotel.ownerId !== req.user.sub) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const files = (req.files || []).map((f) => ({
      url: `/uploads/${path.basename(f.path)}`,
      filename: path.basename(f.path),
    }));

    const updated = await hotels.update({
      where: { id: hotel.id },
      data: { images: [...(hotel.images || []), ...files] },
    });
    res.json(updated);
  }
);

hotelsRouter.post("/:id/rooms", requireAuth, requireRole(["owner", "admin"]), validate(schemas.hotel.createRoom), async (req, res) => {
  const hotel = await hotels.findUnique({ where: { id: req.params.id } });
  if (!hotel) return res.status(404).json({ error: "Hotel not found" });

  if (req.user.role === "OWNER" && hotel.ownerId !== req.user.sub) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { name, pricePerNight, capacity, inventory } = req.validated;
  const room = await rooms.create({
    data: {
      hotelId: hotel.id,
      name,
      pricePerNight,
      capacity: capacity || 2,
      inventory: inventory || 1,
    },
  });
  res.status(201).json(room);
});

hotelsRouter.post("/:id/reviews", requireAuth, requireRole(["customer"]), validate(schemas.hotel.review), async (req, res) => {
  const hotel = await hotels.findUnique({ where: { id: req.params.id } });
  if (!hotel) return res.status(404).json({ error: "Hotel not found" });

  const { rating, comment } = req.validated;
  const review = await reviews.create({
    data: {
      hotelId: hotel.id,
      userId: req.user.sub,
      rating,
      comment: comment || "",
    },
  });
  res.status(201).json(review);
});

module.exports = { hotelsRouter };
