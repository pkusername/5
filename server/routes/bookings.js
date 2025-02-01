const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const wss = require('../server'); // 引入WebSocket服务器实例

// 获取所有预订
router.get('/', async (req, res) => {
    try {
        const bookings = await Booking.find();
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 添加新预订
router.post('/', async (req, res) => {
    try {
        console.log('收到的预订数据:', req.body);
        const booking = new Booking({
            guestName: req.body.guestName,
            introducer: req.body.introducer,
            checkInDate: new Date(req.body.checkInDate),
            checkOutDate: new Date(req.body.checkOutDate),
            rooms: {
                标间: parseInt(req.body.rooms.标间) || 0,
                三人间: parseInt(req.body.rooms.三人间) || 0,
                大床房: parseInt(req.body.rooms.大床房) || 0,
                亲子间: parseInt(req.body.rooms.亲子间) || 0
            },
            price: req.body.price || '',  // 直接使用字符串值
            totalPrice: parseFloat(req.body.totalPrice) || 0,
            otherFees: parseFloat(req.body.otherFees) || 0,
            deposit: parseFloat(req.body.deposit) || 0,
            receivable: parseFloat(req.body.receivable) || 0,
            guestCount: parseInt(req.body.guestCount) || 0,
            pickupTime: req.body.pickupTime || '',
            dropoffTime: req.body.dropoffTime || '',
            remarks: req.body.remarks || ''
        });
        
        console.log('准备保存的预订数据:', booking);
        const newBooking = await booking.save();
        console.log('保存成功的预订数据:', newBooking);
        
        res.status(201).json(newBooking);
        
        // Broadcast the new booking to all clients
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(newBooking));
            }
        });
    } catch (error) {
        console.error('保存预订失败:', error);
        res.status(400).json({ message: error.message });
    }
});

// 更新预订
router.put('/:id', async (req, res) => {
    try {
        console.log('更新预订数据:', req.body);
        const updatedBooking = await Booking.findByIdAndUpdate(
            req.params.id,
            {
                guestName: req.body.guestName,
                introducer: req.body.introducer,
                checkInDate: req.body.checkInDate,
                checkOutDate: req.body.checkOutDate,
                rooms: req.body.rooms,
                // 添加更多信息字段
                price: req.body.price || '',  // 直接使用字符串值
                totalPrice: req.body.totalPrice,
                otherFees: req.body.otherFees,
                deposit: req.body.deposit,
                receivable: req.body.receivable,
                guestCount: req.body.guestCount,
                pickupTime: req.body.pickupTime,
                dropoffTime: req.body.dropoffTime,
                remarks: req.body.remarks
            },
            { new: true }
        );
        console.log('更新后的数据:', updatedBooking);
        res.json(updatedBooking);
        
        // Broadcast the updated booking to all clients
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(updatedBooking));
            }
        });
    } catch (error) {
        console.error('更新预订失败:', error);
        res.status(400).json({ message: error.message });
    }
});

// 删除预订
router.delete('/:id', async (req, res) => {
    try {
        await Booking.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted Booking' });
        // Broadcast the deleted booking ID to all clients
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ action: 'delete', id: req.params.id }));
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router; 