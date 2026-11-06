const mongoose = require("mongoose");

const hospitalSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        unique: true
    },
    address: {
        type: String,
        required: [true, 'Please add an address']
    },
    district: {
        type: String,
        required: [true, 'Please add a district']
    },
    province: {
        type: String,
        required: [true, 'Please add a province']
    },
    postalcode: {
        type: String,
        required: [true, 'Please add a postal code']
    },
    tel: {
        type: String,
        required: [true, 'Please add a tel']
    },
    region: {
        type: String,
        required: [true, 'Please add a region']
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
hospitalSchema.virtual('appointments', {
    ref: 'Appointment',
    localField: '_id',
    foreignField: 'hospital',
    justOne: false
});

module.exports = mongoose.model('Hospital', hospitalSchema);
