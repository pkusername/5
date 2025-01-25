const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bookingsRouter = require('./routes/bookings');
const WebSocket = require('ws');
const path = require('path');  // 引入 path 模块

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

// 配置静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// 使用预订路由
app.use('/api/bookings', bookingsRouter);

// 处理所有未匹配的路由，返回index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// 启动服务器
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
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