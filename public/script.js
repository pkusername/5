document.addEventListener("DOMContentLoaded", function () {
    // 将 const 改为 let，使其可以被修改
    let roomData = {
        standard: {
            total: 21,
            available: 21
        },
        triple: {
            total: 2,
            available: 2
        },
        king: {
            total: 4,
            available: 4
        },
        family: {
            total: 1,
            available: 1
        }
    };

    // 添加一个变量来存储当前选择的日期
    let selectedDate = new Date();

    // 初始化页面数据
    function initializeRoomData(date = selectedDate) {
        // 更新当前选择的日期
        selectedDate = date;
        
        // 确保日期是 Date 对象
        const checkDate = date instanceof Date ? date : new Date(date);
        // 设置时间为当天开始
        checkDate.setHours(0, 0, 0, 0);

        fetch("https://beihaihuanqiulvxingshe.xyz/api/bookings")
            .then(response => response.json())
            .then(bookings => {
                // 重置房间数据到初始状态
                const currentRoomData = {
                    standard: { total: 21, available: 21 },
                    triple: { total: 2, available: 2 },
                    king: { total: 4, available: 4 },
                    family: { total: 1, available: 1 }
                };

                // 计算指定日期已预订的房间数
                bookings.forEach(booking => {
                    const checkIn = new Date(booking.checkInDate);
                    const checkOut = new Date(booking.checkOutDate);
                    
                    // 设置时间为当天开始，以确保正确比较
                    checkIn.setHours(0, 0, 0, 0);
                    checkOut.setHours(0, 0, 0, 0);
                    
                    // 修改判断逻辑：检查是否有日期重叠
                    // 预订时间段与选择日期有重叠的情况：
                    // 1. 入住日期在选择日期之前或当天，且
                    // 2. 离店日期在选择日期之后或当天
                    if (checkIn <= checkDate && checkOut >= checkDate) {
                        console.log('找到重叠预订:', booking);
                        // 减去已预订的房间数
                        if (booking.rooms["标间"]) {
                            currentRoomData.standard.available -= booking.rooms["标间"];
                        }
                        if (booking.rooms["三人间"]) {
                            currentRoomData.triple.available -= booking.rooms["三人间"];
                        }
                        if (booking.rooms["大床房"]) {
                            currentRoomData.king.available -= booking.rooms["大床房"];
                        }
                        if (booking.rooms["亲子间"]) {
                            currentRoomData.family.available -= booking.rooms["亲子间"];
                        }
                    }
                });

                // 确保可用房间数不小于0
                Object.keys(currentRoomData).forEach(type => {
                    currentRoomData[type].available = Math.max(0, currentRoomData[type].available);
                });

                // 更新显示
                document.getElementById('standard-available').textContent = currentRoomData.standard.available + '间';
                document.getElementById('triple-available').textContent = currentRoomData.triple.available + '间';
                document.getElementById('king-available').textContent = currentRoomData.king.available + '间';
                document.getElementById('family-available').textContent = currentRoomData.family.available + '间';

                // 更新全局房间数据
                roomData = currentRoomData;

                console.log('更新后的房间状态:', currentRoomData);
            })
            .catch(error => console.error("获取预订数据失败:", error));
    }

    // 监听房型选择的输入变化
    function setupInputListeners() {
        const inputs = ['standard', 'triple', 'king', 'family'];
        
        inputs.forEach(roomType => {
            const input = document.getElementById(roomType);
            if (input) {
                input.addEventListener('input', function(e) {
                    // 确保输入值不小于0
                    if (this.value < 0) {
                        this.value = 0;
                    }
                    
                    // 确保输入值不超过可用房间数
                    const maxAvailable = roomData[roomType].available;
                    if (this.value > maxAvailable) {
                        this.value = maxAvailable;
                    }
                });
            }
        });
    }

    // 获取所有预订数据并填充到表格
    function fetchBookings() {
        fetch("https://beihaihuanqiulvxingshe.xyz/api/bookings")
            .then(response => response.json())
            .then(data => {
                console.log("📌 API 数据：", data);

                const tableBody = document.getElementById("bookingsTableBody");
                if (!tableBody) {
                    console.error("❌ bookingsTableBody 容器未找到！");
                    return;
                }

                tableBody.innerHTML = ""; // 清空旧数据

                data.forEach(booking => {
                    const row = document.createElement("tr");
                    row.setAttribute("data-id", booking._id);
                    row.innerHTML = `
                        <td>${booking.guestName}</td>
                        <td>${formatRoomDetails(booking.rooms)}</td>
                        <td>${new Date(booking.checkInDate).toLocaleDateString()}</td>
                        <td>${new Date(booking.checkOutDate).toLocaleDateString()}</td>
                        <td>${booking.introducer}</td>
                        <td>${booking.pickupTime || '无'}</td>
                        <td>${booking.dropoffTime || '无'}</td>
                        <td>
                            <button class="action-btn delete-btn" onclick="deleteBooking('${booking._id}')">删除</button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
            })
            .catch(error => console.error("❌ API 请求失败:", error));
    }

    // 解析房间信息格式
    function formatRoomDetails(rooms) {
        if (!rooms || typeof rooms !== 'object') {
            return '无房型信息';
        }
        return Object.entries(rooms)
            .filter(([_, quantity]) => quantity > 0)
            .map(([type, quantity]) => `${type}×${quantity}`)
            .join(', ');
    }

    // 删除预订
    window.deleteBooking = function(bookingId) {
        fetch(`https://beihaihuanqiulvxingshe.xyz/api/bookings/${bookingId}`, {
            method: "DELETE"
        })
        .then(response => response.json())
        .then(() => {
            console.log("✅ 预订已删除:", bookingId);
            fetchBookings(); // 删除后刷新表格
        })
        .catch(error => console.error("❌ 删除失败:", error));
    };

    // WebSocket 连接管理
    let ws = null;
    let wsReconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RECONNECT_DELAY = 3000; // 3秒后重试

    function setupWebSocket() {
        // 改回原始的 WebSocket URL
        const wsUrl = 'wss://beihaihuanqiulvxingshe.xyz';

        try {
            ws = new WebSocket(wsUrl);
            
            // 添加连接超时处理
            const connectionTimeout = setTimeout(() => {
                if (ws.readyState !== WebSocket.OPEN) {
                    console.error("❌ WebSocket 连接超时");
                    ws.close();
                }
            }, 5000);

            ws.onopen = () => {
                console.log("✅ WebSocket 连接成功");
                clearTimeout(connectionTimeout);
                wsReconnectAttempts = 0; // 重置重连次数

                // 发送心跳包
                startHeartbeat();
            };

            ws.onmessage = function (event) {
                try {
                    const data = JSON.parse(event.data);
                    console.log("🔄 WebSocket 更新:", data);
                    
                    // 如果是心跳响应，不需要更新数据
                    if (data.type === 'pong') {
                        console.log("💓 收到心跳响应");
                        return;
                    }

                    initializeRoomData(selectedDate);
                    fetchBookings();
                } catch (error) {
                    console.error("❌ WebSocket 解析失败:", error);
                }
            };

            ws.onerror = error => {
                console.error("❌ WebSocket 连接错误:", error);
                clearTimeout(connectionTimeout);
                ws.close();
            };

            ws.onclose = () => {
                console.warn("⚠️ WebSocket 连接关闭");
                stopHeartbeat();
                
                // 尝试重连
                if (wsReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    wsReconnectAttempts++;
                    console.log(`🔄 尝试重新连接... (${wsReconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
                    setTimeout(setupWebSocket, RECONNECT_DELAY * wsReconnectAttempts); // 递增重连延迟
                } else {
                    console.error("❌ WebSocket 重连次数超过限制，切换到轮询模式");
                    startPolling();
                }
            };
        } catch (error) {
            console.error("❌ WebSocket 初始化失败:", error);
            startPolling();
        }
    }

    // 心跳检测
    let heartbeatInterval = null;
    function startHeartbeat() {
        heartbeatInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ping' }));
                console.log("💓 发送心跳");
            }
        }, 30000); // 每30秒发送一次心跳
    }

    function stopHeartbeat() {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
    }

    // 启动轮询（作为 WebSocket 的备用方案）
    function startPolling() {
        console.log("⚠️ 切换到轮询模式");
        setInterval(() => {
            initializeRoomData(selectedDate);
            fetchBookings();
        }, 5000);
    }

    // 初始化 WebSocket 连接
    setupWebSocket();

    // 监听页面可见性变化，在页面重新可见时重新连接
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && (!ws || ws.readyState === WebSocket.CLOSED)) {
            wsReconnectAttempts = 0; // 重置重连次数
            setupWebSocket();
        }
    });

    // 初始化加载
    initializeRoomData(new Date());
    setupInputListeners();
    fetchBookings();

    // 添加表单提交处理
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const checkInDate = new Date(document.getElementById('checkInDate').value);
            const checkOutDate = new Date(document.getElementById('checkOutDate').value);

            // 验证日期
            if (checkOutDate < checkInDate) {
                alert('退房日期不能早于入住日期');
                return;
            }

            const formData = {
                guestName: document.getElementById('guestName').value,
                introducer: document.getElementById('introducer').value,
                checkInDate: document.getElementById('checkInDate').value,
                checkOutDate: document.getElementById('checkOutDate').value,
                rooms: {
                    "标间": parseInt(document.getElementById('standard').value) || 0,
                    "三人间": parseInt(document.getElementById('triple').value) || 0,
                    "大床房": parseInt(document.getElementById('king').value) || 0,
                    "亲子间": parseInt(document.getElementById('family').value) || 0
                },
                pickupTime: document.getElementById('pickupTime').value || null,
                dropoffTime: document.getElementById('dropoffTime').value || null,
                remarks: document.getElementById('remarks').value
            };

            // 验证至少选择了一个房间
            const totalRooms = Object.values(formData.rooms).reduce((a, b) => a + b, 0);
            if (totalRooms === 0) {
                alert('请至少选择一个房间');
                return;
            }

            // 发送预订请求
            fetch('https://beihaihuanqiulvxingshe.xyz/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            })
            .then(response => response.json())
            .then(data => {
                alert('预订成功！');
                bookingForm.reset();
                fetchBookings(); // 刷新预订列表
                initializeRoomData(selectedDate); // 使用当前选择的日期刷新房间状态
            })
            .catch(error => {
                console.error('预订失败:', error);
                alert('预订失败，请重试');
            });
        });
    }

    // 修改日期选择监听器
    const checkInDateInput = document.getElementById('checkInDate');
    const checkOutDateInput = document.getElementById('checkOutDate');

    if (checkInDateInput) {
        checkInDateInput.addEventListener('change', function(e) {
            console.log('入住日期改变:', this.value);
            if (this.value) {
                const newDate = new Date(this.value);
                selectedDate = newDate; // 更新选择的日期
                initializeRoomData(newDate);
            }
        });
    }

    if (checkOutDateInput) {
        checkOutDateInput.addEventListener('change', function(e) {
            console.log('离店日期改变:', this.value);
            const checkInDate = checkInDateInput.value;
            // 如果有入住日期，使用入住日期；否则使用离店日期
            const dateToCheck = checkInDate ? new Date(checkInDate) : new Date(this.value);
            selectedDate = dateToCheck; // 更新选择的日期
            initializeRoomData(dateToCheck);
        });
    }
});
