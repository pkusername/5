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

    // 添加一个变量来存储所有预订数据
    let allBookings = [];

    // 初始化页面数据
    function initializeRoomData(date = selectedDate) {
        // 更新当前选择的日期
        selectedDate = date;
        
        // 获取日期范围
        const checkInDate = new Date(document.getElementById('checkInDate').value);
        const checkOutDate = new Date(document.getElementById('checkOutDate').value);
        
        // 确保日期是有效的
        const startDate = !isNaN(checkInDate.getTime()) ? checkInDate : date;
        const endDate = !isNaN(checkOutDate.getTime()) ? checkOutDate : date;
        
        // 设置时间为当天开始
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

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

                // 计算指定日期范围内已预订的房间数
                bookings.forEach(booking => {
                    const bookingCheckIn = new Date(booking.checkInDate);
                    const bookingCheckOut = new Date(booking.checkOutDate);
                    
                    // 设置时间为当天开始，以确保正确比较
                    bookingCheckIn.setHours(0, 0, 0, 0);
                    bookingCheckOut.setHours(0, 0, 0, 0);
                    
                    // 修改日期重叠的判断逻辑：
                    // 1. 预订的入住日期早于选择的结束日期，且
                    // 2. 预订的离店日期晚于选择的入住日期，且
                    // 3. 不是在同一天（一个离店一个入住的情况）
                    if (bookingCheckIn < endDate && 
                        bookingCheckOut > startDate && 
                        !(bookingCheckOut.getTime() === startDate.getTime() || 
                          bookingCheckIn.getTime() === endDate.getTime())) {
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

    // 修改 fetchBookings 函数，保存获取到的数据
    function fetchBookings() {
        fetch("https://beihaihuanqiulvxingshe.xyz/api/bookings")
            .then(response => response.json())
            .then(data => {
                console.log("📌 API 数据：", data);
                allBookings = data; // 保存所有预订数据
                updateBookingsTable(data);
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

    // 添加搜索和重置功能
    window.searchBookings = function() {
        const searchText = document.getElementById('searchName').value.toLowerCase();
        const searchStartDate = document.getElementById('searchStartDate').value;
        const searchEndDate = document.getElementById('searchEndDate').value;

        fetch("https://beihaihuanqiulvxingshe.xyz/api/bookings")
            .then(response => response.json())
            .then(data => {
                // 过滤预订记录
                const filteredBookings = data.filter(booking => {
                    const matchesText = searchText === '' || 
                        booking.guestName.toLowerCase().includes(searchText) || 
                        (booking.introducer && booking.introducer.toLowerCase().includes(searchText));

                    const bookingCheckIn = new Date(booking.checkInDate);
                    const bookingCheckOut = new Date(booking.checkOutDate);
                    
                    let matchesDate = true;
                    if (searchStartDate && searchEndDate) {
                        const startDate = new Date(searchStartDate);
                        const endDate = new Date(searchEndDate);
                        // 检查日期是否有重叠
                        matchesDate = bookingCheckIn <= endDate && bookingCheckOut >= startDate;
                    }

                    return matchesText && matchesDate;
                });

                // 更新表格显示
                updateBookingsTable(filteredBookings);
            })
            .catch(error => console.error("搜索失败:", error));
    };

    window.resetSearch = function() {
        // 重置搜索条件
        document.getElementById('searchName').value = '';
        document.getElementById('searchStartDate').value = '';
        document.getElementById('searchEndDate').value = '';
        
        // 重新获取所有预订
        fetchBookings();
    };

    // 修改 fetchBookings 函数，添加表格更新函数
    function updateBookingsTable(bookings) {
        const tableBody = document.getElementById("bookingsTableBody");
        if (!tableBody) {
            console.error("❌ bookingsTableBody 容器未找到！");
            return;
        }

        tableBody.innerHTML = ""; // 清空旧数据

        bookings.forEach(booking => {
            const row = document.createElement("tr");
            row.setAttribute("data-id", booking._id);
            row.innerHTML = `
                <td>${booking.guestName}</td>
                <td>${formatRoomDetails(booking.rooms)}</td>
                <td>${new Date(booking.checkInDate).toLocaleDateString()}</td>
                <td>${new Date(booking.checkOutDate).toLocaleDateString()}</td>
                <td>${booking.introducer || ''}</td>
                <td>${booking.pickupTime || '无'}</td>
                <td>${booking.dropoffTime || '无'}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="editBooking('${booking._id}')">修改</button>
                    <button class="action-btn delete-btn" onclick="deleteBooking('${booking._id}')">删除</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // 修改编辑功能
    window.editBooking = function(bookingId) {
        // 从已有数据中查找预订信息
        const booking = allBookings.find(b => b._id === bookingId);
        
        if (!booking) {
            console.error("未找到预订信息");
            alert('获取预订详情失败，请刷新页面后重试');
            return;
        }

        console.log('获取到的预订详情:', booking);

        // 填充表单
        document.getElementById('editBookingId').value = booking._id;
        document.getElementById('editGuestName').value = booking.guestName || '';
        document.getElementById('editIntroducer').value = booking.introducer || '';
        document.getElementById('editCheckInDate').value = booking.checkInDate ? booking.checkInDate.split('T')[0] : '';
        document.getElementById('editCheckOutDate').value = booking.checkOutDate ? booking.checkOutDate.split('T')[0] : '';
        document.getElementById('editStandard').value = booking.rooms?.["标间"] || 0;
        document.getElementById('editTriple').value = booking.rooms?.["三人间"] || 0;
        document.getElementById('editKing').value = booking.rooms?.["大床房"] || 0;
        document.getElementById('editFamily').value = booking.rooms?.["亲子间"] || 0;
        document.getElementById('editPickupTime').value = booking.pickupTime || '';
        document.getElementById('editDropoffTime').value = booking.dropoffTime || '';
        document.getElementById('editRemarks').value = booking.remarks || '';

        // 显示模态框
        document.getElementById('editModal').style.display = 'block';
    };

    // 关闭模态框
    document.querySelector('.close').onclick = function() {
        document.getElementById('editModal').style.display = 'none';
    };

    // 点击模态框外部关闭
    window.onclick = function(event) {
        const modal = document.getElementById('editModal');
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    // 处理编辑表单提交
    document.getElementById('editForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const bookingId = document.getElementById('editBookingId').value;

        const formData = {
            guestName: document.getElementById('editGuestName').value,
            introducer: document.getElementById('editIntroducer').value,
            checkInDate: document.getElementById('editCheckInDate').value,
            checkOutDate: document.getElementById('editCheckOutDate').value,
            rooms: {
                "标间": parseInt(document.getElementById('editStandard').value) || 0,
                "三人间": parseInt(document.getElementById('editTriple').value) || 0,
                "大床房": parseInt(document.getElementById('editKing').value) || 0,
                "亲子间": parseInt(document.getElementById('editFamily').value) || 0
            },
            pickupTime: document.getElementById('editPickupTime').value || null,
            dropoffTime: document.getElementById('editDropoffTime').value || null,
            remarks: document.getElementById('editRemarks').value
        };

        // 发送更新请求
        fetch(`https://beihaihuanqiulvxingshe.xyz/api/bookings/${bookingId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            alert('修改成功！');
            document.getElementById('editModal').style.display = 'none';
            fetchBookings(); // 刷新预订列表
            initializeRoomData(selectedDate); // 刷新房间状态
        })
        .catch(error => {
            console.error('修改失败:', error);
            alert('修改失败，请重试');
        });
    });

    // 添加导出功能
    window.exportToExcel = function() {
        // 创建工作簿
        const wb = XLSX.utils.book_new();
        
        // 创建总表
        const totalData = allBookings.map(booking => ({
            '客人姓名': booking.guestName,
            '介绍人': booking.introducer || '',
            '入住日期': new Date(booking.checkInDate).toLocaleDateString(),
            '离店日期': new Date(booking.checkOutDate).toLocaleDateString(),
            '房型': formatRoomDetails(booking.rooms),
            '接船时间': booking.pickupTime || '无',
            '送船时间': booking.dropoffTime || '无',
            '备注': booking.remarks || ''
        }));
        
        // 添加总表工作表
        const totalWs = XLSX.utils.json_to_sheet(totalData);
        XLSX.utils.book_append_sheet(wb, totalWs, '总表');

        // 获取所有日期并排序
        const allDates = new Set();
        allBookings.forEach(booking => {
            const checkIn = new Date(booking.checkInDate);
            const checkOut = new Date(booking.checkOutDate);
            
            // 遍历入住日期到离店日期之间的每一天
            for (let d = new Date(checkIn); d <= checkOut; d.setDate(d.getDate() + 1)) {
                allDates.add(d.toISOString().split('T')[0]);
            }
        });
        
        const sortedDates = Array.from(allDates).sort();

        // 为每一天创建工作表
        sortedDates.forEach(date => {
            // 获取当天入住的客人
            const checkInGuests = allBookings.filter(booking => {
                const checkIn = booking.checkInDate.split('T')[0];
                return checkIn === date;
            });

            // 获取当天在住的客人
            const stayingGuests = allBookings.filter(booking => {
                const checkIn = new Date(booking.checkInDate);
                const checkOut = new Date(booking.checkOutDate);
                const currentDate = new Date(date);
                return checkIn <= currentDate && currentDate <= checkOut;
            });

            // 创建当天的数据
            const dayData = {
                '当日入住': checkInGuests.map(booking => ({
                    '客人姓名': booking.guestName,
                    '介绍人': booking.introducer || '',
                    '房型': formatRoomDetails(booking.rooms),
                    '接船时间': booking.pickupTime || '无',
                    '备注': booking.remarks || ''
                })),
                '在住客人': stayingGuests.map(booking => ({
                    '客人姓名': booking.guestName,
                    '介绍人': booking.introducer || '',
                    '房型': formatRoomDetails(booking.rooms),
                    '入住日期': new Date(booking.checkInDate).toLocaleDateString(),
                    '离店日期': new Date(booking.checkOutDate).toLocaleDateString(),
                    '备注': booking.remarks || ''
                }))
            };

            // 创建当天的工作表
            const dayWs = XLSX.utils.json_to_sheet(dayData['当日入住'], {
                origin: 'A2',
                skipHeader: false
            });

            // 添加标题
            XLSX.utils.sheet_add_aoa(dayWs, [['当日入住客人']], { origin: 'A1' });
            
            // 计算在住客人的起始行
            const startRow = dayData['当日入住'].length + 4;
            XLSX.utils.sheet_add_aoa(dayWs, [['在住客人']], { origin: `A${startRow}` });
            XLSX.utils.sheet_add_json(dayWs, dayData['在住客人'], {
                origin: `A${startRow + 1}`,
                skipHeader: false
            });

            // 添加到工作簿
            XLSX.utils.book_append_sheet(wb, dayWs, date);
        });

        // 导出文件
        const fileName = `酒店预订记录_${new Date().toLocaleDateString()}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    // 辅助函数：格式化日期
    function formatDate(date) {
        return new Date(date).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }
});
