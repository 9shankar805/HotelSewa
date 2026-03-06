const express = require("express");
const { v4: uuid } = require("uuid");

const { hotels, rooms, bookings } = require("../data/store");
const { requireAuth, requireRole } = require("../middleware/auth");
const { schemas, validate } = require("../lib/validate");

const bookingsRouter = express.Router();

bookingsRouter.get("/me", requireAuth, requireRole(["customer"]), async (req, res) => {
  const mine = await bookings.findMany({
    where: { userId: req.user.sub },
    include: { hotel: { select: { name: true, location: true } }, room: { select: { name: true } } },
  });
  res.json(mine);
});

bookingsRouter.post("/", requireAuth, requireRole(["customer"]), validate(schemas.booking.create), async (req, res) => {
  const { hotelId, roomId, checkIn, checkOut, guests } = req.validated;

  const hotel = await hotels.findUnique({ where: { id: hotelId, status: "APPROVED" } });
  if (!hotel) return res.status(404).json({ error: "Hotel not found" });

  const room = await rooms.findUnique({ where: { id: roomId, hotelId } });
  if (!room) return res.status(404).json({ error: "Room not found" });

  // Simple inventory check: ensure no overlapping confirmed bookings for the same room
  const overlapping = await bookings.findMany({
    where: {
      roomId,
      status: "CONFIRMED",
      OR: [
        { checkIn: { lt: checkOut }, checkOut: { gt: checkIn } },
      ],
    },
  });
  if (overlapping.length >= room.inventory) {
    return res.status(409).json({ error: "Room not available for selected dates" });
  }

  const booking = await bookings.create({
    data: {
      userId: req.user.sub,
      hotelId,
      roomId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guests: guests || 1,
      status: "CONFIRMED",
    },
    include: { hotel: { select: { name: true } }, room: { select: { name: true } } },
  });

  res.status(201).json(booking);
});

bookingsRouter.post("/:id/cancel", requireAuth, requireRole(["customer"]), async (req, res) => {
  const booking = await bookings.findFirst({
    where: { id: req.params.id, userId: req.user.sub },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const updated = await bookings.update({
    where: { id: booking.id },
    data: { status: "CANCELLED" },
  });

  res.json(updated);
});

module.exports = { bookingsRouter };
