const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    guestName: { type: String, required: true },
    introducer: { type: String, default: '' },
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },
    rooms: {
        标间: { type: Number, default: 0 },
        三人间: { type: Number, default: 0 },
        大床房: { type: Number, default: 0 },
        亲子间: { type: Number, default: 0 }
    },
    price: { type: String, default: '' },          // 确保是字符串类型
    totalPrice: { type: Number, default: 0 },     // 房费合计
    otherFees: { type: Number, default: 0 },      // 其他费用
    deposit: { type: Number, default: 0 },        // 前台现收款
    receivable: { type: Number, default: 0 },     // 应收
    guestCount: { type: Number, default: 0 },     // 人数
    pickupTime: { type: String, default: '' },    // 接船时间
    dropoffTime: { type: String, default: '' },   // 送船时间
    remarks: { type: String, default: '' }        // 备注
});

module.exports = mongoose.model('Booking', bookingSchema); 