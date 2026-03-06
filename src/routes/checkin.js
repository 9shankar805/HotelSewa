const express = require('express');
const router = express.Router();
const { bookings, hotels, rooms } = require('../data/store');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../lib/validate');

// Generate instant check-in QR code
router.get('/qrcode/:bookingNumber', 
  requireAuth,
  async (req, res) => {
    try {
      const { bookingNumber } = req.params;

      const booking = await bookings.findFirst({
        where: { 
          bookingNumber,
          userId: req.user.sub,
          status: 'CONFIRMED'
        },
        include: {
          hotel: true,
          room: true,
          user: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          }
        }
      });

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found or not eligible for check-in' });
      }

      // Check if check-in is allowed (within 24 hours of check-in time)
      const checkInTime = new Date(booking.checkIn);
      const now = new Date();
      const hoursUntilCheckIn = (checkInTime - now) / (1000 * 60 * 60);

      if (hoursUntilCheckIn > 24) {
        return res.status(400).json({ 
          error: 'Check-in is only available within 24 hours of your check-in time' 
        });
      }

      // Generate QR code data
      const qrData = {
        bookingNumber: booking.bookingNumber,
        guestName: booking.user.name,
        hotelName: booking.hotel.name,
        hotelAddress: booking.hotel.address,
        roomType: booking.room.name,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guests: booking.guests,
        specialRequests: booking.specialRequests || '',
        timestamp: new Date().toISOString(),
        status: 'PENDING_CHECKIN'
      };

      // In a real implementation, you would use a QR code library here
      // For now, we'll return the data that would be encoded
      res.json({
        success: true,
        data: {
          qrData,
          booking: {
            bookingNumber: booking.bookingNumber,
            hotelName: booking.hotel.name,
            roomType: booking.room.name,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            guests: booking.guests,
            totalAmount: booking.totalAmount
          }
        }
      });
    } catch (error) {
      console.error('Error generating check-in QR code:', error);
      res.status(500).json({ error: 'Failed to generate check-in QR code' });
    }
  }
);

// Process instant check-in
router.post('/process/:bookingNumber', 
  requireAuth,
  validate({
    verificationCode: 'string|required',
    location: 'object' // GPS coordinates for verification
  }),
  async (req, res) => {
    try {
      const { bookingNumber } = req.params;
      const { verificationCode, location } = req.validated;

      const booking = await bookings.findFirst({
        where: { 
          bookingNumber,
          userId: req.user.sub,
          status: 'CONFIRMED'
        },
        include: {
          hotel: true,
          room: true
        }
      });

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Verify check-in time
      const checkInTime = new Date(booking.checkIn);
      const now = new Date();
      const checkInDate = new Date(now).toDateString();
      const bookingDate = new Date(checkInTime).toDateString();

      if (checkInDate !== bookingDate) {
        return res.status(400).json({ error: 'Check-in can only be done on the scheduled date' });
      }

      // Generate verification code (in real app, this would be more secure)
      const expectedCode = booking.bookingNumber.slice(-6).toUpperCase();
      
      if (verificationCode !== expectedCode) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      // Check if already checked in
      if (booking.status === 'CHECKED_IN') {
        return res.status(400).json({ error: 'Already checked in' });
      }

      // Update booking status
      const updatedBooking = await bookings.update({
        where: { id: booking.id },
        data: {
          status: 'CHECKED_IN',
          actualCheckIn: new Date(),
          checkInMethod: 'INSTANT_DIGITAL'
        }
      });

      // Generate digital key
      const digitalKey = {
        keyId: `DK${Date.now()}${booking.id.slice(-4)}`,
        roomNumber: `${booking.hotel.name}-${booking.room.name}-${Math.floor(Math.random() * 999) + 100}`,
        validFrom: new Date(),
        validUntil: new Date(booking.checkOut),
        accessLevel: 'ROOM_ONLY',
        hotelWifi: `${booking.hotel.name.replace(/\s+/g, '')}_Guest`,
        wifiPassword: `OYO${Math.floor(Math.random() * 9000) + 1000}`
      };

      res.json({
        success: true,
        message: 'Instant check-in completed successfully!',
        data: {
          booking: updatedBooking,
          digitalKey,
          hotelInfo: {
            name: booking.hotel.name,
            address: booking.hotel.address,
            phone: booking.hotel.phone,
            checkInTime: booking.hotel.checkInTime,
            checkOutTime: booking.hotel.checkOutTime,
            amenities: booking.hotel.amenities
          },
          roomInfo: {
            name: booking.room.name,
            type: booking.room.type,
            amenities: booking.room.amenities
          },
          nextSteps: [
            'Your digital room key is now active',
            'Proceed directly to your room',
            'Room number and access details are provided above',
            'Enjoy complimentary Wi-Fi',
            'Contact front desk for any assistance'
          ]
        }
      });
    } catch (error) {
      console.error('Error processing instant check-in:', error);
      res.status(500).json({ error: 'Failed to process check-in' });
    }
  }
);

// Get check-in instructions
router.get('/instructions/:bookingNumber', 
  requireAuth,
  async (req, res) => {
    try {
      const { bookingNumber } = req.params;

      const booking = await bookings.findFirst({
        where: { 
          bookingNumber,
          userId: req.user.sub
        },
        include: {
          hotel: true,
          room: true
        }
      });

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      const instructions = {
        steps: [
          {
            step: 1,
            title: 'Arrival at Hotel',
            description: 'Go directly to the hotel. No need to visit the front desk.',
            icon: 'location'
          },
          {
            step: 2,
            title: 'Open Check-in QR Code',
            description: 'Open your booking in the app and tap "Instant Check-in" to show your QR code.',
            icon: 'qr_code'
          },
          {
            step: 3,
            title: 'Scan at Kiosk',
            description: 'Scan your QR code at the self-service kiosk or show it to staff.',
            icon: 'scan'
          },
          {
            step: 4,
            title: 'Verify Identity',
            description: 'Enter the verification code sent to your phone/email.',
            icon: 'verify'
          },
          {
            step: 5,
            title: 'Get Digital Key',
            description: 'Receive your digital room key and proceed directly to your room.',
            icon: 'key'
          }
        ],
        requirements: [
          'Valid government ID required',
          'Check-in only on scheduled date',
          'Verification must be completed within 30 minutes',
          'Digital key valid until check-out time'
        ],
        contact: {
          phone: booking.hotel.phone,
          email: booking.hotel.email,
          address: booking.hotel.address
        },
        faq: [
          {
            question: 'What if I arrive early?',
            answer: 'Early check-in is subject to room availability. Contact the hotel directly.'
          },
          {
            question: 'Can someone else check-in for me?',
            answer: 'No, the booking must be checked in by the guest whose name is on the booking.'
          },
          {
            question: 'What if I have problems with the digital key?',
            answer: 'Visit the front desk with your booking confirmation and ID for assistance.'
          }
        ]
      };

      res.json({
        success: true,
        data: instructions
      });
    } catch (error) {
      console.error('Error getting check-in instructions:', error);
      res.status(500).json({ error: 'Failed to get check-in instructions' });
    }
  }
);

// Get check-in status
router.get('/status/:bookingNumber', 
  requireAuth,
  async (req, res) => {
    try {
      const { bookingNumber } = req.params;

      const booking = await bookings.findFirst({
        where: { 
          bookingNumber,
          userId: req.user.sub
        },
        include: {
          hotel: true,
          room: true
        }
      });

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      const checkInTime = new Date(booking.checkIn);
      const now = new Date();
      const hoursUntilCheckIn = (checkInTime - now) / (1000 * 60 * 60);
      const isCheckInEligible = hoursUntilCheckIn <= 24 && hoursUntilCheckIn >= -2;

      const status = {
        bookingStatus: booking.status,
        canCheckIn: isCheckInEligible && booking.status === 'CONFIRMED',
        checkInAvailable: isCheckInEligible,
        checkInTime: booking.checkIn,
        hoursUntilCheckIn: Math.round(hoursUntilCheckIn),
        checkInMethod: booking.checkInMethod,
        actualCheckIn: booking.actualCheckIn,
        messages: {
          eligible: 'You are eligible for instant check-in!',
          tooEarly: `Check-in will be available ${Math.round(hoursUntilCheckIn)} hours before your check-in time.`,
          tooLate: 'Please contact the front desk for check-in assistance.',
          alreadyCheckedIn: 'You have already checked in.',
          wrongStatus: 'This booking is not eligible for instant check-in.'
        }
      };

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error getting check-in status:', error);
      res.status(500).json({ error: 'Failed to get check-in status' });
    }
  }
);

// Pre check-in (submit documents and preferences)
router.post('/pre-checkin/:bookingNumber', 
  requireAuth,
  validate({
    idProofType: 'string|required',
    idProofNumber: 'string|required',
    idProofImage: 'string|required', // Base64 encoded image
    arrivalTime: 'string',
    specialRequests: 'string',
    roomPreferences: 'object'
  }),
  async (req, res) => {
    try {
      const { bookingNumber } = req.params;
      const { idProofType, idProofNumber, idProofImage, arrivalTime, specialRequests, roomPreferences } = req.validated;

      const booking = await bookings.findFirst({
        where: { 
          bookingNumber,
          userId: req.user.sub,
          status: 'CONFIRMED'
        }
      });

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Store pre-check-in data
      await bookings.update({
        where: { id: booking.id },
        data: {
          preCheckIn: {
            completed: true,
            submittedAt: new Date(),
            idProof: {
              type: idProofType,
              number: idProofNumber,
              image: idProofImage // In production, store file reference
            },
            preferences: {
              arrivalTime,
              specialRequests,
              roomPreferences
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'Pre check-in completed successfully! Your check-in will be even faster.',
        data: {
          preCheckInComplete: true,
          nextSteps: [
            'Your documents have been verified',
            'You can skip document verification at the hotel',
            'Proceed directly to instant check-in kiosk upon arrival',
            'Your room preferences have been noted'
          ]
        }
      });
    } catch (error) {
      console.error('Error processing pre check-in:', error);
      res.status(500).json({ error: 'Failed to process pre check-in' });
    }
  }
);

module.exports = router;
