const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bookingsRouter = require('./routes/bookings');
const WebSocket = require('ws');

const app = express();
app.use(cors());
app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/hotel');

app.use('/api/bookings', bookingsRouter);

// 绑定到 0.0.0.0 以允许外部访问
const server = app.listen(3000, '0.0.0.0', () => {
    console.log('Server is running on port 3000');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        console.log('Received:', message);
        // Broadcast the message to all clients
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });
});

module.exports = wss; // 导出WebSocket服务器实例 