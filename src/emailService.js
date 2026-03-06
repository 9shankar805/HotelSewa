const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendBookingConfirmation(booking) {
    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e53e3e;">Booking Confirmed!</h2>
        <p>Dear ${booking.guestName},</p>
        <p>Your booking has been confirmed. Here are the details:</p>
        
        <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${booking.hotelName}</h3>
          <p><strong>Booking ID:</strong> ${booking.id}</p>
          <p><strong>Check-in:</strong> ${booking.checkIn}</p>
          <p><strong>Check-out:</strong> ${booking.checkOut}</p>
          <p><strong>Guests:</strong> ${booking.guests}</p>
          <p><strong>Total Amount:</strong> ₹${booking.totalAmount}</p>
        </div>
        
        <p>Thank you for choosing OYO!</p>
        <p>Best regards,<br>OYO Team</p>
      </div>
    `;

    await this.transporter.sendMail({
      from: process.env.FROM_EMAIL || 'noreply@oyo.com',
      to: booking.guestEmail,
      subject: `Booking Confirmation - ${booking.hotelName}`,
      html: emailTemplate
    });
  }

  async sendBookingCancellation(booking) {
    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e53e3e;">Booking Cancelled</h2>
        <p>Dear ${booking.guestName},</p>
        <p>Your booking has been cancelled as requested.</p>
        
        <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${booking.hotelName}</h3>
          <p><strong>Booking ID:</strong> ${booking.id}</p>
          <p><strong>Cancellation Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Refund Amount:</strong> ₹${booking.refundAmount || 0}</p>
        </div>
        
        <p>If you have any questions, please contact our support team.</p>
        <p>Best regards,<br>OYO Team</p>
      </div>
    `;

    await this.transporter.sendMail({
      from: process.env.FROM_EMAIL || 'noreply@oyo.com',
      to: booking.guestEmail,
      subject: `Booking Cancelled - ${booking.hotelName}`,
      html: emailTemplate
    });
  }

  async sendHotelApproval(hotel, ownerEmail) {
    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #38a169;">Hotel Approved!</h2>
        <p>Congratulations!</p>
        <p>Your hotel <strong>${hotel.name}</strong> has been approved and is now live on OYO.</p>
        
        <div style="background: #f0fff4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Hotel ID:</strong> ${hotel.id}</p>
          <p><strong>Location:</strong> ${hotel.location}</p>
          <p><strong>Status:</strong> Active</p>
        </div>
        
        <p>You can now start receiving bookings!</p>
        <p>Best regards,<br>OYO Team</p>
      </div>
    `;

    await this.transporter.sendMail({
      from: process.env.FROM_EMAIL || 'noreply@oyo.com',
      to: ownerEmail,
      subject: `Hotel Approved - ${hotel.name}`,
      html: emailTemplate
    });
  }

  async sendPaymentConfirmation(payment) {
    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #38a169;">Payment Successful!</h2>
        <p>Dear Customer,</p>
        <p>Your payment has been processed successfully.</p>
        
        <div style="background: #f0fff4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Transaction ID:</strong> ${payment.transactionId}</p>
          <p><strong>Amount:</strong> ₹${payment.amount}</p>
          <p><strong>Payment Method:</strong> ${payment.method}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        
        <p>Thank you for your payment!</p>
        <p>Best regards,<br>OYO Team</p>
      </div>
    `;

    await this.transporter.sendMail({
      from: process.env.FROM_EMAIL || 'noreply@oyo.com',
      to: payment.userEmail,
      subject: `Payment Confirmation - ₹${payment.amount}`,
      html: emailTemplate
    });
  }
}

module.exports = new EmailService();