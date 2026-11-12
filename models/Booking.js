const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    hotel: { type: mongoose.Schema.ObjectId, ref: 'Hotel', required: true },
    // pending = booked, waiting for payment; paid = mock payment succeeded (confirmation email sent)
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    payment: {
        amount: Number,        // THB, computed on the server: nights x hotel.pricePerNight
        method: { type: String, enum: ['card', 'promptpay', 'hotel'] }, // hotel = marked paid by an admin (paid at the front desk)
        reference: String,     // mock transaction id, also encoded in the check-in QR code
        paidAt: Date,
    },
    deletedAt: { type: Date, default: null, select: false },
    createdAt: { type: Date, default: Date.now }
});
BookingSchema.index({ hotel: 1, checkIn: 1, checkOut: 1 });
BookingSchema.index({ user: 1 });

module.exports = mongoose.model('Booking', BookingSchema);
