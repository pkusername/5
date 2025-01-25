const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bookingsRouter = require('./routes/bookings');
const WebSocket = require('ws');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 添加 MongoDB 连接错误处理
mongoose.connect('mongodb://localhost:27017/hotel')
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
  });

// 添加根路径处理逻辑
app.get('/', (req, res) => {
    res.send('Welcome to Hotel Management API');
});

app.use('/api/bookings', bookingsRouter);

// 绑定到 0.0.0.0 以允许外部访问，并添加应用启动错误处理
const server = app.listen(3000, '0.0.0.0', () => {
    console.log('Server is running on port 3000');
}).on('error', (err) => {
    console.error('Server failed to start:', err);
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