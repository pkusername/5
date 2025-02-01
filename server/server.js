const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bookingsRouter = require('./routes/bookings');
const WebSocket = require('ws');
const path = require('path');  // 引入 path 模块
const https = require('https');
const http = require('http');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 添加 MongoDB 连接错误处理
mongoose.connect('mongodb://localhost:27017/hotel')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
      console.error('Failed to connect to MongoDB:', err);
      process.exit(1); // 终止进程
  });

// 配置静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// 使用预订路由
app.use('/api/bookings', bookingsRouter);

// 处理所有未匹配的路由，返回index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// HTTPS 选项
const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/beihaihuanqiulvxingshe.xyz/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/beihaihuanqiulvxingshe.xyz/fullchain.pem')
};

// 启动 HTTPS 服务
const PORT = process.env.PORT || 8080; // 修改监听端口为 8080
const httpsServer = https.createServer(options, app);
httpsServer.listen(PORT, '0.0.0.0', () => {
  console.log(`HTTPS server is running on port ${PORT}`);
});

// 启动 WebSocket 服务器
const wss = new WebSocket.Server({ server: httpsServer });

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        console.log('Received:', message);
        try {
            const data = JSON.parse(message);

            if (data.action === 'update') {
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ action: 'update', booking: data.booking }));
                    }
                });
            } else if (data.action === 'delete') {
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ action: 'delete', id: data.id }));
                    }
                });
            }
        } catch (error) {
            console.error("Invalid WebSocket message:", error);
        }
    });
});

// 可选：将 HTTP 请求重定向到 HTTPS
// http.createServer((req, res) => {
//   res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
//   res.end();
// }).listen(80, '0.0.0.0', () => {
//   console.log('HTTP server is redirecting to HTTPS');
// });

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

module.exports = wss; // 导出WebSocket服务器实例 