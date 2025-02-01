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
                const tbody = document.getElementById('bookingsTableBody');
                tbody.innerHTML = '';
                
                bookings.forEach(booking => {
                    const row = document.createElement('tr');
                    
                    // 格式化房型显示
                    const roomTypeDisplay = Object.entries(booking.rooms)
                        .filter(([_, count]) => count > 0)
                        .map(([type, count]) => `${type}×${count}`)
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
                        <td>
                            <button class="edit-btn" onclick="openEditModal('${booking._id}')">修改</button>
                            <button class="delete-btn" onclick="deleteBooking('${booking._id}')">删除</button>
                        </td>
                    `;
                    
                    tbody.appendChild(row);
                });
            })
            .catch(error => console.error('获取预订记录失败:', error));
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
        if (moreInfo.style.display === 'none') {
            moreInfo.style.display = 'block';
            toggleBtn.innerHTML = '更多信息 ▲';
        } else {
            moreInfo.style.display = 'none';
            toggleBtn.innerHTML = '更多信息 ▼';
        }
    };

    // 修改提交处理函数
    document.getElementById('bookingForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            // 基本信息
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
            // 更多信息（如果有填写）
            price: document.getElementById('price').value || null,
            totalPrice: document.getElementById('totalPrice').value || null,
            otherFees: document.getElementById('otherFees').value || null,
            deposit: document.getElementById('deposit').value || null,
            receivable: document.getElementById('receivable').value || null,
            guestCount: document.getElementById('guestCount').value || null,
            pickupTime: document.getElementById('pickupTime').value || null,
            dropoffTime: document.getElementById('dropoffTime').value || null,
            remarks: document.getElementById('remarks').value
        };

        // 验证日期
        if (formData.checkOutDate < formData.checkInDate) {
            alert('退房日期不能早于入住日期');
            return;
        }

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
            document.getElementById('bookingForm').reset();
            fetchBookings(); // 刷新预订列表
            initializeRoomData(selectedDate); // 使用当前选择的日期刷新房间状态
        })
        .catch(error => {
            console.error('预订失败:', error);
            alert('预订失败，请重试');
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
                        .map(([type, count]) => `${type}×${count}`)
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
            
            // 直接从API获取数据而不是从表格中读取
            const response = await fetch("https://beihaihuanqiulvxingshe.xyz/api/bookings");
            const bookings = await response.json();
            
            // 过滤出选中月份的预订记录
            const filteredBookings = bookings.filter(booking => {
                const bookingDate = new Date(booking.checkInDate);
                return bookingDate.getFullYear() === parseInt(year) && 
                       bookingDate.getMonth() === parseInt(month) - 1;
            });
            
            if (filteredBookings.length === 0) {
                alert(`${year}年${month}月没有预订记录`);
                return;
            }

            // 创建工作簿
            const wb = XLSX.utils.book_new();
            
            // 1. 创建月度总汇总表
            const monthlyData = filteredBookings.map(booking => {
                // 计算用房天数
                const checkIn = new Date(booking.checkInDate);
                const checkOut = new Date(booking.checkOutDate);
                const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
                
                // 计算总房数
                const totalRooms = Object.values(booking.rooms).reduce((a, b) => a + b, 0);
                
                // 格式化房型显示
                const roomTypeDisplay = formatRoomType(booking.rooms);

                return {
                    '客人信息': booking.guestName,
                    '客源': booking.introducer || '',
                    '入住日期': new Date(booking.checkInDate).toLocaleDateString(),
                    '退房日期': new Date(booking.checkOutDate).toLocaleDateString(),
                    '房型': roomTypeDisplay,
                    '房间数': totalRooms,
                    '用房天数': days,
                    '总房数': totalRooms * days,
                    '单价': booking.price || '',
                    '房费合计': booking.totalPrice || '',
                    '其他': booking.otherFees || '',
                    '前台现收款': booking.deposit || '',
                    '应收': booking.receivable || '',
                    '人数': booking.guestCount || '',
                    '接船': booking.pickupTime || '',
                    '送船': booking.dropoffTime || ''
                };
            });

            // 创建工作表并设置列宽
            const monthlyWs = XLSX.utils.json_to_sheet(monthlyData);

            // 设置所有工作表通用的列宽
            const sheetColWidths = [
                {wch: 15},  // 客人信息
                {wch: 10},  // 客源
                {wch: 12},  // 入住日期
                {wch: 12},  // 退房日期
                {wch: 15},  // 房型
                {wch: 8},   // 房间数
                {wch: 10},  // 用房天数
                {wch: 8},   // 总房数
                {wch: 8},   // 单价
                {wch: 10},  // 房费合计
                {wch: 10},  // 其他
                {wch: 12},  // 前台现收款
                {wch: 8},   // 应收
                {wch: 6},   // 人数
                {wch: 10},  // 接船
                {wch: 10}   // 送船
            ];

            // 应用列宽到月度总汇总表
            monthlyWs['!cols'] = sheetColWidths;
            XLSX.utils.book_append_sheet(wb, monthlyWs, '月度总汇总');

            // 2. 创建每日明细表
            const daysInMonth = new Date(year, month, 0).getDate();
            
            for (let day = 1; day <= daysInMonth; day++) {
                const currentDate = `${year}-${month}-${String(day).padStart(2, '0')}`;
                const dayDate = new Date(currentDate);
                
                // 获取当天新入住的客人（当天入住日期的客人）
                const newGuests = filteredBookings.filter(booking => {
                    const checkInDate = new Date(booking.checkInDate);
                    return checkInDate.toDateString() === dayDate.toDateString();
                });

                // 获取续住的客人（之前入住且还未离店的客人）
                const continuingGuests = filteredBookings.filter(booking => {
                    const checkInDate = new Date(booking.checkInDate);
                    const checkOutDate = new Date(booking.checkOutDate);
                    // 入住日期在当前日期之前，且离店日期在当前日期之后
                    return checkInDate < dayDate && 
                           checkOutDate > dayDate;
                });

                // 创建每日工作表
                if (newGuests.length > 0 || continuingGuests.length > 0) {
                    const dailyData = [];
                    
                    // 只在第一行添加表头
                    dailyData.push([
                        '客人信息', '客源', '入住日期', '退房日期', '房型', 
                        '房间数', '用房天数', '总房数', '单价', '房费合计', 
                        '其他', '前台现收款', '应收', '人数', '接船', '送船'
                    ]);
                    
                    // 添加新入住客人数据
                    dailyData.push(['==========新入住客人==========']);
                    if (newGuests.length > 0) {
                        // 不再添加重复的表头
                        newGuests.forEach(booking => {
                            const checkIn = new Date(booking.checkInDate);
                            const checkOut = new Date(booking.checkOutDate);
                            const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
                            const totalRooms = Object.values(booking.rooms).reduce((a, b) => a + b, 0);
                            const roomTypeDisplay = formatRoomType(booking.rooms);  // 使用新的格式化函数

                            dailyData.push([
                                booking.guestName,
                                booking.introducer || '',
                                new Date(booking.checkInDate).toLocaleDateString(),
                                new Date(booking.checkOutDate).toLocaleDateString(),
                                roomTypeDisplay,
                                totalRooms,
                                days,
                                totalRooms * days,
                                booking.price || '',
                                booking.totalPrice || '',
                                booking.otherFees || '',
                                booking.deposit || '',
                                booking.receivable || '',
                                booking.guestCount || '',
                                booking.pickupTime || '',
                                booking.dropoffTime || ''
                            ]);
                        });
                    } else {
                        dailyData.push(['无新入住客人']);
                    }

                    // 添加分隔行
                    dailyData.push(['']);
                    
                    // 添加续住客人数据
                    dailyData.push(['==========续住客人==========']);
                    if (continuingGuests.length > 0) {
                        // 不再添加重复的表头
                        continuingGuests.forEach(booking => {
                            const checkIn = new Date(booking.checkInDate);
                            const checkOut = new Date(booking.checkOutDate);
                            const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
                            const totalRooms = Object.values(booking.rooms).reduce((a, b) => a + b, 0);
                            const roomTypeDisplay = formatRoomType(booking.rooms);  // 使用新的格式化函数

                            dailyData.push([
                                booking.guestName,
                                booking.introducer || '',
                                new Date(booking.checkInDate).toLocaleDateString(),
                                new Date(booking.checkOutDate).toLocaleDateString(),
                                roomTypeDisplay,
                                totalRooms,
                                days,
                                totalRooms * days,
                                booking.price || '',
                                booking.totalPrice || '',
                                booking.otherFees || '',
                                booking.deposit || '',
                                booking.receivable || '',
                                booking.guestCount || '',
                                booking.pickupTime || '',
                                booking.dropoffTime || ''
                            ]);
                        });
                    } else {
                        dailyData.push(['无续住客人']);
                    }

                    // 添加分隔行和统计信息
                    dailyData.push(['']);

                    // 添加一个辅助函数来统计房间数量
                    function countRoomTypes(guests) {
                        const roomCounts = {
                            '标间': 0,
                            '大床房': 0,
                            '三人间': 0,
                            '亲子间': 0
                        };
                        
                        guests.forEach(booking => {
                            if (booking.rooms['标间']) roomCounts['标间'] += booking.rooms['标间'];
                            if (booking.rooms['大床房']) roomCounts['大床房'] += booking.rooms['大床房'];
                            if (booking.rooms['三人间']) roomCounts['三人间'] += booking.rooms['三人间'];
                            if (booking.rooms['亲子间']) roomCounts['亲子间'] += booking.rooms['亲子间'];
                        });
                        
                        return roomCounts;
                    }

                    // 统计新入住和续住的房间数量
                    const newGuestsRooms = countRoomTypes(newGuests);
                    const continuingGuestsRooms = countRoomTypes(continuingGuests);

                    // 计算总房间数
                    const totalRooms = {
                        '标间': newGuestsRooms['标间'] + continuingGuestsRooms['标间'],
                        '大床房': newGuestsRooms['大床房'] + continuingGuestsRooms['大床房'],
                        '三人间': newGuestsRooms['三人间'] + continuingGuestsRooms['三人间'],
                        '亲子间': newGuestsRooms['亲子间'] + continuingGuestsRooms['亲子间']
                    };

                    // 新入住房间统计
                    let newRoomsText = '新入住：';
                    newRoomsText += Object.entries(newGuestsRooms)
                        .map(([type, count]) => `${type}${count}间`)
                        .join('，');

                    // 续住房间统计
                    let continuingRoomsText = '续住：';
                    continuingRoomsText += Object.entries(continuingGuestsRooms)
                        .map(([type, count]) => `${type}${count}间`)
                        .join('，');

                    // 总计房间统计
                    let totalRoomsText = '共计入住：';
                    totalRoomsText += Object.entries(totalRooms)
                        .map(([type, count]) => `${type}${count}间`)
                        .join('，');

                    // 添加统计信息到工作表
                    dailyData.push([newRoomsText]);
                    dailyData.push([continuingRoomsText]);
                    dailyData.push([totalRoomsText]);

                    // 创建工作表并应用相同的列宽
                    const dailyWs = XLSX.utils.aoa_to_sheet(dailyData);
                    dailyWs['!cols'] = sheetColWidths;  // 使用相同的列宽配置

                    // 使用中文格式的工作表名称
                    XLSX.utils.book_append_sheet(wb, dailyWs, `${month}月${day}日`);
                }
            }

            // 应用列宽到所有工作表
            wb.SheetNames.forEach(sheetName => {
                const ws = wb.Sheets[sheetName];
                ws['!cols'] = sheetColWidths;  // 使用同一个列宽配置
            });

            // 生成Excel文件并下载
            const fileName = `酒店预订记录_${year}年${month}月.xlsx`;
            XLSX.writeFile(wb, fileName);
            
        } catch (error) {
            console.error('导出Excel时发生错误:', error);
            alert('导出失败，请稍后重试');
        }
    };

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
});
