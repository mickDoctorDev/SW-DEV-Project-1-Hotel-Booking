const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    hotel: { type: mongoose.Schema.ObjectId, ref: 'Hotel', required: true },
    deletedAt: { type: Date, default: null, select: false },
    createdAt: { type: Date, default: Date.now }
});
BookingSchema.index({ hotel: 1, checkIn: 1, checkOut: 1 });
BookingSchema.index({ user: 1 });

module.exports = mongoose.model('Booking', BookingSchema);
