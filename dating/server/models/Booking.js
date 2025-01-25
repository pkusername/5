const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    guestName: String,
    introducer: String,
    checkInDate: Date,
    checkOutDate: Date,
    rooms: {
        标间: Number,
        三人间: Number,
        大床房: Number,
        亲子间: Number
    },
    pickupTime: String,
    dropoffTime: String,
    remarks: String
});

module.exports = mongoose.model('Booking', bookingSchema); 