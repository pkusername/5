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
        fetch('https://beihaihuanqiulvxingshe.xyz/api/bookings')
            .then(response => response.json())
            .then(bookings => {
                console.log('获取到的预订数据:', bookings);
                const tbody = document.getElementById('bookingsTableBody');
                tbody.innerHTML = '';
                
                bookings.forEach(booking => {
                    const row = document.createElement('tr');
                    
                    // 格式化房型显示
                    const roomTypeDisplay = Object.entries(booking.rooms)
                        .filter(([_, count]) => count > 0)
                        .map(([type, count]) => `${count}${type}`)
                        .join('，');
                    
                    // 计算用房天数
                    const checkIn = new Date(booking.checkInDate);
                    const checkOut = new Date(booking.checkOutDate);
                    const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
                    
                    // 计算总房数
                    const totalRooms = Object.values(booking.rooms).reduce((sum, count) => sum + count, 0);
                    
                    // 创建表格行内容，确保列的顺序与表头一致
                    row.innerHTML = `
                        <td>${booking.guestName || ''}</td>
                        <td>${booking.introducer || ''}</td>
                        <td>${new Date(booking.checkInDate).toLocaleDateString()}</td>
                        <td>${new Date(booking.checkOutDate).toLocaleDateString()}</td>
                        <td>${roomTypeDisplay}</td>
                        <td>${totalRooms}</td>
                        <td>${days}</td>
                        <td>${totalRooms * days}</td>
                        <td>${booking.price || ''}</td>
                        <td>${booking.totalPrice || 0}</td>
                        <td>${booking.deposit || 0}</td>
                        <td>${booking.guestCount || 0}</td>
                        <td>${booking.pickupTime || ''}</td>
                        <td>${booking.dropoffTime || ''}</td>
                        <td>${booking.remarks || ''}</td>
                        <td>
                            <button class="edit-btn" onclick="openEditModal('${booking._id}')">修改</button>
                            <button class="delete-btn" onclick="deleteBooking('${booking._id}')">删除</button>
                        </td>
                    `;
                    
                    tbody.appendChild(row);
                });
            })
            .catch(error => {
                console.error('获取预订记录失败:', error);
                alert('获取预订记录失败，请刷新页面重试');
            });
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

    // 将 toggleMoreInfo 函数定义在全局作用域
    window.toggleMoreInfo = function() {
        const moreInfo = document.querySelector('.more-info');
        const toggleBtn = document.querySelector('.more-info-toggle button');
        
        if (moreInfo.style.maxHeight) {
            moreInfo.style.maxHeight = null;
            toggleBtn.innerHTML = '更多信息 ▼';
        } else {
            moreInfo.style.maxHeight = moreInfo.scrollHeight + "px";
            toggleBtn.innerHTML = '更多信息 ▲';
        }
    };

    // 修改 openEditModal 函数
    window.openEditModal = function(bookingId) {
        console.log("打开编辑模态框，预订ID:", bookingId);
        
        // 从当前页面的数据中查找预订信息
        const tbody = document.getElementById('bookingsTableBody');
        const rows = tbody.getElementsByTagName('tr');
        let booking = null;
        
        for (let row of rows) {
            const editButton = row.querySelector('.edit-btn');
            if (editButton && editButton.getAttribute('onclick').includes(bookingId)) {
                // 从行中提取数据
                const cells = row.getElementsByTagName('td');
                
                // 解析房型字符串
                const roomTypeStr = cells[4].textContent;  // 房型所在的单元格
                const rooms = {};
                roomTypeStr.split('，').forEach(item => {
                    const match = item.match(/(\d+)(.*)/);
                    if (match) {
                        const [_, count, type] = match;
                        rooms[type] = parseInt(count);
                    }
                });
                
                booking = {
                    _id: bookingId,
                    guestName: cells[0].textContent,
                    introducer: cells[1].textContent,
                    checkInDate: cells[2].textContent,
                    checkOutDate: cells[3].textContent,
                    rooms: rooms,  // 使用解析后的房型数据
                    price: cells[8].textContent,
                    totalPrice: cells[9].textContent,
                    deposit: cells[10].textContent,
                    guestCount: cells[11].textContent,
                    pickupTime: cells[12].textContent,
                    dropoffTime: cells[13].textContent,
                    remarks: cells[14].textContent
                };
                break;
            }
        }

        if (!booking) {
            console.error('未找到预订信息');
            alert('获取预订信息失败，请刷新页面后重试');
            return;
        }

        console.log('获取到的预订信息:', booking);

        // 填充表单数据
        document.getElementById('guestName').value = booking.guestName || '';
        document.getElementById('introducer').value = booking.introducer || '';
        
        // 处理日期格式
        const checkInParts = booking.checkInDate.split('/');
        const checkOutParts = booking.checkOutDate.split('/');
        document.getElementById('checkInDate').value = `${checkInParts[0]}-${checkInParts[1].padStart(2, '0')}-${checkInParts[2].padStart(2, '0')}`;
        document.getElementById('checkOutDate').value = `${checkOutParts[0]}-${checkOutParts[1].padStart(2, '0')}-${checkOutParts[2].padStart(2, '0')}`;
        
        // 填充房型信息，使用解析后的房型数据
        document.getElementById('standard').value = booking.rooms['标间'] || 0;
        document.getElementById('triple').value = booking.rooms['三人间'] || 0;
        document.getElementById('king').value = booking.rooms['大床房'] || 0;
        document.getElementById('family').value = booking.rooms['亲子间'] || 0;
        
        // 填充其他字段
        document.getElementById('price').value = booking.price || '';
        document.getElementById('totalPrice').value = booking.totalPrice || '';
        document.getElementById('deposit').value = booking.deposit || '';
        document.getElementById('guestCount').value = booking.guestCount || '';
        document.getElementById('pickupTime').value = booking.pickupTime || '';
        document.getElementById('dropoffTime').value = booking.dropoffTime || '';
        document.getElementById('remarks').value = booking.remarks || '';

        // 修改表单的提交行为
        const form = document.getElementById('bookingForm');
        form.dataset.editMode = 'true';
        form.dataset.editId = bookingId;

        // 滚动到表单位置
        form.scrollIntoView({ behavior: 'smooth' });
    };

    // 辅助函数：解析房型字符串
    function parseRoomTypes(roomTypeStr) {
        const rooms = {
            '标间': 0,
            '三人间': 0,
            '大床房': 0,
            '亲子间': 0
        };
        
        const types = roomTypeStr.split('，');
        types.forEach(type => {
            const match = type.match(/(\d+)(.*)/);
            if (match) {
                const [_, count, roomType] = match;
                rooms[roomType] = parseInt(count);
            }
        });
        
        return rooms;
    }

    // 修改表单提交事件处理
    document.getElementById('bookingForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            guestName: document.getElementById('guestName').value,
            introducer: document.getElementById('introducer').value,
            checkInDate: document.getElementById('checkInDate').value,
            checkOutDate: document.getElementById('checkOutDate').value,
            rooms: {
                标间: parseInt(document.getElementById('standard').value) || 0,
                三人间: parseInt(document.getElementById('triple').value) || 0,
                大床房: parseInt(document.getElementById('king').value) || 0,
                亲子间: parseInt(document.getElementById('family').value) || 0
            },
            price: document.getElementById('price').value || '',
            totalPrice: parseFloat(document.getElementById('totalPrice').value) || 0,
            deposit: parseFloat(document.getElementById('deposit').value) || 0,
            guestCount: parseInt(document.getElementById('guestCount').value) || 0,
            pickupTime: document.getElementById('pickupTime').value,
            dropoffTime: document.getElementById('dropoffTime').value,
            remarks: document.getElementById('remarks').value
        };

        console.log('提交的表单数据:', formData);

        // 判断是新增还是修改
        const isEditMode = this.dataset.editMode === 'true';
        const bookingId = this.dataset.editId;
        
        const url = isEditMode 
            ? `https://beihaihuanqiulvxingshe.xyz/api/bookings/${bookingId}`
            : 'https://beihaihuanqiulvxingshe.xyz/api/bookings';
        
        const method = isEditMode ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            console.log('保存成功，服务器返回数据:', data);
            alert(isEditMode ? '修改成功！' : '预订成功！');
            // 重置表单状态
            this.dataset.editMode = 'false';
            this.dataset.editId = '';
            // 重新加载数据
            fetchBookings();
            // 重置表单
            this.reset();
        })
        .catch(error => {
            console.error('保存失败:', error);
            alert('保存失败，请重试');
        });
    });

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

        fetch('https://beihaihuanqiulvxingshe.xyz/api/bookings')
            .then(response => response.json())
            .then(bookings => {
                // 过滤搜索结果
                const filteredBookings = bookings.filter(booking => {
                    // 文本匹配（客人信息或客源）
                    const matchesText = !searchText || 
                        booking.guestName.toLowerCase().includes(searchText) || 
                        (booking.introducer && booking.introducer.toLowerCase().includes(searchText));
                    
                    // 日期匹配
                    let matchesDate = true;
                    if (searchStartDate || searchEndDate) {
                        const bookingCheckIn = new Date(booking.checkInDate);
                        const bookingCheckOut = new Date(booking.checkOutDate);
                        const startDate = searchStartDate ? new Date(searchStartDate) : null;
                        const endDate = searchEndDate ? new Date(searchEndDate) : null;

                        // 设置时间为当天开始
                        if (startDate) startDate.setHours(0, 0, 0, 0);
                        if (endDate) endDate.setHours(0, 0, 0, 0);
                        bookingCheckIn.setHours(0, 0, 0, 0);
                        bookingCheckOut.setHours(0, 0, 0, 0);

                        // 检查以下条件：
                        // 1. 在搜索开始日期当天入住的客人
                        // 2. 在搜索日期范围内（不含结束日期）入住的客人
                        // 3. 之前入住且在搜索日期范围内仍在住的客人
                        matchesDate = (
                            // 入住日期在搜索范围内（不含结束日期）
                            (!startDate || bookingCheckIn >= startDate) && 
                            (!endDate || bookingCheckIn < endDate)
                        ) || (
                            // 或者在搜索日期范围内仍在住
                            (startDate && bookingCheckIn < startDate && bookingCheckOut > startDate)
                        );
                    }

                    return matchesText && matchesDate;
                });

                // 更新表格显示
                const tbody = document.getElementById('bookingsTableBody');
                tbody.innerHTML = '';

                filteredBookings.forEach(booking => {
                    const row = document.createElement('tr');
                    
                    // 格式化房型显示
                    const roomTypeDisplay = Object.entries(booking.rooms)
                        .filter(([_, count]) => count > 0)
                        .map(([type, count]) => `${count}${type}`)
                        .join('，');
                    
                    // 计算用房天数
                    const checkIn = new Date(booking.checkInDate);
                    const checkOut = new Date(booking.checkOutDate);
                    const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
                    
                    // 计算总房数
                    const totalRooms = Object.values(booking.rooms).reduce((sum, count) => sum + count, 0);
                    
                    row.innerHTML = `
                        <td>${booking.guestName}</td>
                        <td>${booking.introducer || ''}</td>
                        <td>${new Date(booking.checkInDate).toLocaleDateString()}</td>
                        <td>${new Date(booking.checkOutDate).toLocaleDateString()}</td>
                        <td>${roomTypeDisplay}</td>
                        <td>${totalRooms}</td>
                        <td>${days}</td>
                        <td>${totalRooms * days}</td>
                        <td>${booking.price || ''}</td>
                        <td>${booking.totalPrice || ''}</td>
                        <td>${booking.otherFees || ''}</td>
                        <td>${booking.deposit || ''}</td>
                        <td>${booking.receivable || ''}</td>
                        <td>${booking.guestCount || ''}</td>
                        <td>${booking.pickupTime || ''}</td>
                        <td>${booking.dropoffTime || ''}</td>
                        <td>${booking.remarks || ''}</td>
                        <td>
                            <button class="edit-btn" onclick="openEditModal('${booking._id}')">修改</button>
                            <button class="delete-btn" onclick="deleteBooking('${booking._id}')">删除</button>
                        </td>
                    `;
                    
                    tbody.appendChild(row);
                });
            })
            .catch(error => console.error('搜索失败:', error));
    };

    // 重置搜索
    window.resetSearch = function() {
        document.getElementById('searchName').value = '';
        document.getElementById('searchStartDate').value = '';
        document.getElementById('searchEndDate').value = '';
        fetchBookings(); // 重新加载所有预订
    };

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

    // 修改编辑表单提交事件处理
    document.getElementById('editForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const bookingId = document.getElementById('editBookingId').value;
        const formData = {
            guestName: document.getElementById('editGuestName').value,
            introducer: document.getElementById('editIntroducer').value,
            checkInDate: document.getElementById('editCheckInDate').value,
            checkOutDate: document.getElementById('editCheckOutDate').value,
            rooms: {
                标间: parseInt(document.getElementById('editStandard').value) || 0,
                三人间: parseInt(document.getElementById('editTriple').value) || 0,
                大床房: parseInt(document.getElementById('editKing').value) || 0,
                亲子间: parseInt(document.getElementById('editFamily').value) || 0
            },
            price: document.getElementById('editPrice').value || '',
            totalPrice: parseFloat(document.getElementById('editTotalPrice').value) || 0,
            deposit: parseFloat(document.getElementById('editDeposit').value) || 0,
            guestCount: parseInt(document.getElementById('editGuestCount').value) || 0,
            pickupTime: document.getElementById('editPickupTime').value,
            dropoffTime: document.getElementById('editDropoffTime').value,
            remarks: document.getElementById('editRemarks').value
        };

        console.log('提交的编辑数据:', formData);

        fetch(`https://beihaihuanqiulvxingshe.xyz/api/bookings/${bookingId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            console.log('更新成功:', data);
            document.getElementById('editModal').style.display = 'none';
            fetchBookings();
        })
        .catch(error => {
            console.error('更新失败:', error);
            alert('更新失败，请重试');
        });
    });

    // 添加导出功能
    window.exportToExcel = async function() {
        try {
            const currentDate = new Date();
            const currentMonth = currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0');
            
            const selectedMonth = prompt('请输入要导出的月份 (格式：YYYY-MM)', currentMonth);
            
            if (!selectedMonth) return;
            
            if (!/^\d{4}-\d{2}$/.test(selectedMonth)) {
                alert('请使用正确的格式：YYYY-MM（例如：2024-03）');
                return;
            }
            
            const [year, month] = selectedMonth.split('-');
            
            const response = await fetch('https://beihaihuanqiulvxingshe.xyz/api/bookings');
            const bookings = await response.json();
            
            // 创建工作簿
            const wb = XLSX.utils.book_new();
            
            // 创建月度汇总表（所有客人信息）
            const summaryWs_data = [
                ['客人信息', '客源', '入住日期', '退房日期', '房型', '房间数', 
                 '用房天数', '总房数', '单价', '房费合计', '前台现收款', 
                 '人数', '接船', '送船', '备注']
            ];
            
            // 过滤本月预订并添加到汇总表
            const monthlyBookings = bookings.filter(booking => {
                const checkIn = new Date(booking.checkInDate);
                return checkIn.getFullYear() === parseInt(year) && 
                       (checkIn.getMonth() + 1) === parseInt(month);
            });
            
            // 按日期排序
            monthlyBookings.sort((a, b) => new Date(a.checkInDate) - new Date(b.checkInDate));
            
            // 添加所有预订到汇总表
            monthlyBookings.forEach(booking => {
                addBookingToSheet(booking, summaryWs_data);
            });
            
            // 创建汇总工作表
            const summaryWs = XLSX.utils.aoa_to_sheet(summaryWs_data);
            XLSX.utils.book_append_sheet(wb, summaryWs, '月度汇总');
            
            // 按日期分组预订记录
            const bookingsByDate = {};
            monthlyBookings.forEach(booking => {
                const checkIn = new Date(booking.checkInDate);
                const day = checkIn.getDate();
                if (!bookingsByDate[day]) {
                    bookingsByDate[day] = {
                        newGuests: [],
                        continuingGuests: []
                    };
                }
                
                // 检查是否是续住客人
                const isContinuing = bookings.some(b => {
                    const prevCheckOut = new Date(b.checkOutDate);
                    return b.guestName === booking.guestName && 
                           prevCheckOut.getTime() === checkIn.getTime();
                });
                
                if (isContinuing) {
                    bookingsByDate[day].continuingGuests.push(booking);
                } else {
                    bookingsByDate[day].newGuests.push(booking);
                }
            });
            
            // 为每一天创建工作表
            Object.entries(bookingsByDate).forEach(([day, dayBookings]) => {
                const ws_data = [
                    // 第一行：表头
                    ['客人信息', '客源', '入住日期', '退房日期', '房型', '房间数', 
                     '用房天数', '总房数', '单价', '房费合计', '前台现收款', 
                     '人数', '接船', '送船', '备注']
                ];
                
                // 添加新入住客人数据
                if (dayBookings.newGuests.length > 0) {
                    ws_data.push(['新入住客人']);
                    dayBookings.newGuests.forEach(booking => {
                        addBookingToSheet(booking, ws_data);
                    });
                }
                
                // 添加续住客人数据
                if (dayBookings.continuingGuests.length > 0) {
                    ws_data.push([]);  // 空行
                    ws_data.push(['续住客人']);
                    dayBookings.continuingGuests.forEach(booking => {
                        addBookingToSheet(booking, ws_data);
                    });
                }
                
                // 添加空行
                ws_data.push([]);
                
                // 计算统计信息
                const newGuestsStats = calculateStats(dayBookings.newGuests);
                const continuingGuestsStats = calculateStats(dayBookings.continuingGuests);
                const totalStats = {
                    标间: newGuestsStats.标间 + continuingGuestsStats.标间,
                    三人间: newGuestsStats.三人间 + continuingGuestsStats.三人间,
                    大床房: newGuestsStats.大床房 + continuingGuestsStats.大床房,
                    亲子间: newGuestsStats.亲子间 + continuingGuestsStats.亲子间,
                    totalRooms: newGuestsStats.totalRooms + continuingGuestsStats.totalRooms
                };
                
                // 添加统计信息（每类一行）
                ws_data.push([`当日入住：标间：${newGuestsStats.标间}间，三人间：${newGuestsStats.三人间}间，大床房：${newGuestsStats.大床房}间，亲子间：${newGuestsStats.亲子间}间，总房间数：${newGuestsStats.totalRooms}间`]);
                ws_data.push([`续住：标间：${continuingGuestsStats.标间}间，三人间：${continuingGuestsStats.三人间}间，大床房：${continuingGuestsStats.大床房}间，亲子间：${continuingGuestsStats.亲子间}间，总房间数：${continuingGuestsStats.totalRooms}间`]);
                ws_data.push([`总入住：标间：${totalStats.标间}间，三人间：${totalStats.三人间}间，大床房：${totalStats.大床房}间，亲子间：${totalStats.亲子间}间，总房间数：${totalStats.totalRooms}间`]);
                
                const ws = XLSX.utils.aoa_to_sheet(ws_data);
                XLSX.utils.book_append_sheet(wb, ws, day.toString());
            });

            // 导出文件
            XLSX.writeFile(wb, `预订记录-${selectedMonth}.xlsx`);
            
        } catch (error) {
            console.error('导出失败:', error);
            alert('导出失败，请重试');
        }
    };

    // 辅助函数：添加预订数据到工作表
    function addBookingToSheet(booking, ws_data) {
        const checkIn = new Date(booking.checkInDate);
        const checkOut = new Date(booking.checkOutDate);
        const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        
        const roomTypeDisplay = Object.entries(booking.rooms)
            .filter(([_, count]) => count > 0)
            .map(([type, count]) => `${count}${type}`)
            .join('，');
        
        const totalRooms = Object.values(booking.rooms).reduce((sum, count) => sum + count, 0);
        
        // 格式化日期为"X月X日"格式
        const formatChineseDate = (date) => {
            const d = new Date(date);
            return `${d.getMonth() + 1}月${d.getDate()}日`;
        };
        
        ws_data.push([
            booking.guestName || '',
            booking.introducer || '',
            formatChineseDate(booking.checkInDate),
            formatChineseDate(booking.checkOutDate),
            roomTypeDisplay,
            totalRooms,
            days,
            totalRooms * days,
            booking.price || '',
            booking.totalPrice || 0,
            booking.deposit || 0,
            booking.guestCount || 0,
            booking.pickupTime || '',
            booking.dropoffTime || '',
            booking.remarks || ''
        ]);
    }

    // 辅助函数：格式化日期
    function formatDate(date) {
        return new Date(date).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    // 修改房型显示格式的函数
    function formatRoomType(rooms) {
        return Object.entries(rooms)
            .filter(([_, count]) => count > 0)
            .map(([type, count]) => `${count}${type}`)
            .join('，');
    }

    // 修改计算统计的辅助函数
    function calculateStats(bookings) {
        const stats = {
            标间: 0,
            三人间: 0,
            大床房: 0,
            亲子间: 0,
            totalRooms: 0
        };
        
        bookings.forEach(booking => {
            // 统计各类房型
            Object.entries(booking.rooms).forEach(([type, count]) => {
                stats[type] += count;
                stats.totalRooms += count;
            });
        });
        
        return stats;
    }
});
