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
    const booking = new Booking(req.body);
    try {
        const newBooking = await booking.save();
        res.status(201).json(newBooking);
        // Broadcast the new booking to all clients
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(newBooking));
            }
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 更新预订
router.put('/:id', async (req, res) => {
    try {
        const updatedBooking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedBooking);
        // Broadcast the updated booking to all clients
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(updatedBooking));
            }
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
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