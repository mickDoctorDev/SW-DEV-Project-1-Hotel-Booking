const mongoose = require("mongoose");

const hotelSchema = new mongoose.Schema({
    name: { type: String, required: [true, 'Please add a name'], unique: true, trim: true, maxlength: 100 },
    address: { type: String, required: [true, 'Please add an address'], trim: true, maxlength: 300 },
    tel: { type: String, required: [true, 'Please add a tel'], match: [/^[0-9+\-\s]{8,15}$/, 'Please add a valid tel'] },
    totalRooms: { type: Number, required: [true, 'Please add totalRooms'], min: 1, max: 10000 },
    pricePerNight: { type: Number, min: 0, max: 1000000, default: 1500 }, // THB
    // bumped inside booking transactions so concurrent writers on one hotel conflict and serialize
    lockVersion: { type: Number, default: 0, select: false },
    createdAt: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.model('Hotel', hotelSchema);
