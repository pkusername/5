class HotelSystem {
    constructor() {
        this.roomConfig = {
            "标间": { total: 21, commission: 15 },
            "三人间": { total: 2, commission: 10 },
            "大床房": { total: 4, commission: 10 },
            "亲子间": { total: 1, commission: 25 }
        };
        this.bookings = [];
        this.loadBookings();
    }

    // 生成唯一ID
    generateBookingId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 检查房间可用性
    checkAvailability(startDate, endDate, roomQuantities) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // 检查每种房型的预订数量
        Object.entries(roomQuantities).forEach(([roomType, quantity]) => {
            if (quantity <= 0) return; // 跳过未选择的房型
            
            // 检查是否超过房间总数
            if (quantity > this.roomConfig[roomType].total) {
                throw new Error(
                    `房间数量超出限制：${roomType}最多只有${this.roomConfig[roomType].total}间，` +
                    `但要求${quantity}间`
                );
            }
        });

        // 检查每个日期的可用性
        for (let date = new Date(start); date < end; date.setDate(date.getDate() + 1)) {
            const dateStr = date.toISOString().split('T')[0];
            
            // 获取当前日期已预订的房间数量
            const bookedRooms = {
                "标间": 0,
                "三人间": 0,
                "大床房": 0,
                "亲子间": 0
            };

            // 统计已有预订的房间数量
            this.bookings.forEach(booking => {
                const bookingStart = new Date(booking.checkInDate);
                const bookingEnd = new Date(booking.checkOutDate);
                
                if (date >= bookingStart && date < bookingEnd) {
                    Object.entries(booking.rooms).forEach(([type, count]) => {
                        bookedRooms[type] += count;
                    });
                }
            });

            // 检查每种房型在当前日期是否有足够的房间
            Object.entries(roomQuantities).forEach(([roomType, requestedQuantity]) => {
                if (requestedQuantity <= 0) return; // 跳过未选择的房型

                const totalRooms = this.roomConfig[roomType].total;
                const bookedCount = bookedRooms[roomType];
                const availableRooms = totalRooms - bookedCount;

                if (requestedQuantity > availableRooms) {
                    throw new Error(
                        `房间预订失败：${dateStr} 的 ${roomType} 仅剩 ${availableRooms} 间，` +
                        `无法预订 ${requestedQuantity} 间`
                    );
                }
            });
        }

        return true;
    }

    // 添加预订
    addBooking(bookingData) {
        const booking = {
            ...bookingData,
            createdAt: new Date()
        };
        this.bookings.push(booking);
        this.saveBookings();
        return booking;
    }

    // 更新预订
    updateBooking(guestName, newData) {
        const index = this.bookings.findIndex(b => 
            b.guestName === guestName && 
            b.checkInDate === newData.originalDates.checkInDate
        );
        if (index !== -1) {
            this.bookings[index] = {
                ...newData.bookingData,
                createdAt: this.bookings[index].createdAt
            };
            this.saveBookings();
            return true;
        }
        return false;
    }

    // 删除预订
    deleteBooking(guestName, checkInDate, roomDetails) {
        const beforeLength = this.bookings.length;
        this.bookings = this.bookings.filter(booking => {
            // 转换房型详情为统一格式进行比较
            const currentRoomDetails = Object.entries(booking.rooms)
                .filter(([_, quantity]) => quantity > 0)
                .map(([type, quantity]) => `${type}×${quantity}`)
                .join(', ');
            
            // 只有当姓名、入住日期和房型都匹配时才删除
            return !(booking.guestName === guestName && 
                    booking.checkInDate === checkInDate && 
                    currentRoomDetails === roomDetails);
        });
        this.saveBookings();
        return beforeLength > this.bookings.length;
    }

    // 取消预订
    cancelBooking(bookingId) {
        this.bookings = this.bookings.filter(booking => booking.id !== bookingId);
        this.saveBookings();
    }

    // 保存预订到localStorage
    saveBookings() {
        localStorage.setItem('hotelBookings', JSON.stringify(this.bookings));
    }

    // 从localStorage加载预订
    loadBookings() {
        const saved = localStorage.getItem('hotelBookings');
        this.bookings = saved ? JSON.parse(saved) : [];
    }

    // 获取所有可用的月份
    getAvailableMonths() {
        const months = new Set();
        this.bookings.forEach(booking => {
            const start = new Date(booking.checkInDate);
            const end = new Date(booking.checkOutDate);
            
            for (let date = new Date(start); date < end; date.setDate(date.getDate() + 1)) {
                months.add(date.toISOString().substring(0, 7)); // YYYY-MM 格式
            }
        });
        return Array.from(months).sort();
    }

    // 导出所有预订数据到Excel
    exportAllBookingsToExcel() {
        // 创建工作簿
        const wb = XLSX.utils.book_new();

        // 获取所有日期的预订信息
        const dailyData = new Map();

        this.bookings.forEach(booking => {
            const start = new Date(booking.checkInDate);
            const end = new Date(booking.checkOutDate);
            
            for (let date = new Date(start); date < end; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toISOString().split('T')[0];
                if (!dailyData.has(dateStr)) {
                    dailyData.set(dateStr, []);
                }
                dailyData.get(dateStr).push(booking);
            }
        });

        // 获取按日期排序的日期列表
        const sortedDates = Array.from(dailyData.keys()).sort();

        // 为每一天创建单独的工作表
        sortedDates.forEach(dateStr => {
            const bookings = dailyData.get(dateStr);
            const headers = [
                '客人姓名', '介绍人', '入住日期', '离店日期',
                '标间数量', '三人间数量', '大床房数量', '亲子间数量',
                '接船时间', '送船时间', '备注'
            ];

            const rows = bookings.map(booking => [
                booking.guestName,
                booking.introducer,
                new Date(booking.checkInDate).getDate() + '日', // 格式化入住日期
                new Date(booking.checkOutDate).getDate() + '日', // 格式化离店日期
                booking.rooms['标间'] || 0,
                booking.rooms['三人间'] || 0,
                booking.rooms['大床房'] || 0,
                booking.rooms['亲子间'] || 0,
                booking.pickupTime || '无',
                booking.dropoffTime || '无',
                booking.remarks || '' // 确保备注信息存在
            ]);

            // 创建工作表
            const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

            // 设置列宽
            ws['!cols'] = [
                { wch: 12 }, // 客人姓名
                { wch: 12 }, // 介绍人
                { wch: 8 },  // 入住日期
                { wch: 8 },  // 离店日期
                { wch: 12 }, // 标间数量
                { wch: 12 }, // 三人间数量
                { wch: 12 }, // 大床房数量
                { wch: 12 }, // 亲子间数量
                { wch: 12 }, // 接船时间
                { wch: 12 }, // 送船时间
                { wch: 20 }  // 备注
            ];

            // 设置单元格居中
            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cell_address = { c: C, r: R };
                    const cell_ref = XLSX.utils.encode_cell(cell_address);
                    if (!ws[cell_ref]) continue;
                    if (!ws[cell_ref].s) ws[cell_ref].s = {};
                    ws[cell_ref].s.alignment = { horizontal: "center", vertical: "center" };
                }
            }

            // 使用日期的日部分作为工作表名称
            const sheetName = dateStr.split('-')[2]; // 仅使用日期部分
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });

        // 导出Excel文件
        XLSX.writeFile(wb, '酒店预订汇总.xlsx');
    }

    // 导出介绍人提成统计
    exportCommissionReport() {
        // 计算介绍人提成
        const commissionData = {};
        this.bookings.forEach(booking => {
            const introducer = booking.introducer;
            if (!commissionData[introducer]) {
                commissionData[introducer] = {
                    total: 0,
                    rooms: {
                        '标间': 0,
                        '三人间': 0,
                        '大床房': 0,
                        '亲子间': 0
                    }
                };
            }

            // 计算每种房型的提成
            Object.entries(booking.rooms).forEach(([roomType, quantity]) => {
                const commission = this.roomConfig[roomType].commission * quantity;
                commissionData[introducer].rooms[roomType] += commission;
                commissionData[introducer].total += commission;
            });
        });

        // 准备CSV数据
        const headers = [
            '介绍人',
            '标间提成',
            '三人间提成',
            '大床房提成',
            '亲子间提成',
            '总提成'
        ];

        const rows = Object.entries(commissionData).map(([introducer, data]) => [
            introducer,
            data.rooms['标间'],
            data.rooms['三人间'],
            data.rooms['大床房'],
            data.rooms['亲子间'],
            data.total
        ]);

        // 生成CSV内容
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // 创建Blob对象
        const blob = new Blob(['\ufeff' + csvContent], { 
            type: 'text/csv;charset=utf-8;'
        });

        // 创建下载链接
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `提成统计_${new Date().toLocaleDateString()}.csv`;

        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // 添加获取指定日期房间可用数量的方法
    getAvailableRooms(date) {
        const dateStr = date.toISOString().split('T')[0];
        const bookedRooms = {
            "标间": 0,
            "三人间": 0,
            "大床房": 0,
            "亲子间": 0
        };

        this.bookings.forEach(booking => {
            const start = new Date(booking.checkInDate);
            const end = new Date(booking.checkOutDate);
            
            if (date >= start && date < end) {
                Object.entries(booking.rooms).forEach(([type, count]) => {
                    bookedRooms[type] += count;
                });
            }
        });

        // 确保返回的可用房间数不会小于0
        return {
            "标间": Math.max(0, this.roomConfig["标间"].total - bookedRooms["标间"]),
            "三人间": Math.max(0, this.roomConfig["三人间"].total - bookedRooms["三人间"]),
            "大床房": Math.max(0, this.roomConfig["大床房"].total - bookedRooms["大床房"]),
            "亲子间": Math.max(0, this.roomConfig["亲子间"].total - bookedRooms["亲子间"])
        };
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    const hotelSystem = new HotelSystem();
    const form = document.getElementById('checkInForm');
    const bookingsTable = document.getElementById('bookingsTable').getElementsByTagName('tbody')[0];
    let editingBooking = null; // 用于存储正在编辑的预订信息

    // 更新预订表格
    function updateBookingsTable(bookings = hotelSystem.bookings) {
        bookingsTable.innerHTML = '';
        bookings.forEach(booking => {
            const roomDetails = formatRoomDetails(booking.rooms);
            
            // 格式化入住和离店日期
            const checkInDay = new Date(booking.checkInDate).getDate() + '日';
            const checkOutDay = new Date(booking.checkOutDate).getDate() + '日';

            const row = bookingsTable.insertRow();
            row.innerHTML = `
                <td>${booking.guestName}</td>
                <td>${roomDetails}</td>
                <td>${checkInDay}</td>
                <td>${checkOutDay}</td>
                <td>${booking.introducer}</td>
                <td>${booking.pickupTime || '无'}</td>
                <td>${booking.dropoffTime || '无'}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="editBooking('${booking.guestName}', '${booking.checkInDate}', '${roomDetails}')">修改</button>
                    <button class="action-btn delete-btn" onclick="deleteBooking('${booking.guestName}', '${booking.checkInDate}', '${roomDetails}')">删除</button>
                </td>
            `;
        });
    }

    // 格式化房间信息
    function formatRoomDetails(rooms) {
        return Object.entries(rooms)
            .filter(([_, quantity]) => quantity > 0)
            .map(([type, quantity]) => `${type}×${quantity}`)
            .join(', ');
    }

    // 格式化接送船信息
    function formatTransportInfo(booking) {
        const pickup = booking.pickupTime ? `接船:${booking.pickupTime}` : '';
        const dropoff = booking.dropoffTime ? `送船:${booking.dropoffTime}` : '';
        return [pickup, dropoff].filter(Boolean).join(', ');
    }

    // 填充表单数据
    function fillFormWithBooking(booking) {
        form.guestName.value = booking.guestName;
        form.introducer.value = booking.introducer;
        form.checkInDate.value = booking.checkInDate;
        form.checkOutDate.value = booking.checkOutDate;
        form.standard.value = booking.rooms['标间'] || 0;
        form.triple.value = booking.rooms['三人间'] || 0;
        form.double.value = booking.rooms['大床房'] || 0;
        form.family.value = booking.rooms['亲子间'] || 0;
        form.pickupTime.value = booking.pickupTime || '';
        form.dropoffTime.value = booking.dropoffTime || '';
    }

    // 编辑预订
    window.editBooking = (guestName, checkInDate, roomDetails) => {
        const booking = hotelSystem.bookings.find(b => 
            b.guestName === guestName && b.checkInDate === checkInDate
        );
        if (booking) {
            editingBooking = {
                guestName,
                checkInDate
            };
            fillFormWithBooking(booking);
            form.querySelector('button[type="submit"]').textContent = '保存修改';
        }
    };

    // 删除预订
    window.deleteBooking = (guestName, checkInDate, roomDetails) => {
        if (confirm(`确定要删除 ${guestName} 在 ${checkInDate} 的预订记录吗？\n房型：${roomDetails}`)) {
            if (hotelSystem.deleteBooking(guestName, checkInDate, roomDetails)) {
                updateBookingsTable();
                updateRoomStatus(); // 更新房态显示
            } else {
                alert('删除失败，未找到匹配的预订记录');
            }
        }
    };

    // 表单提交处理
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // 收集房间数量
        const rooms = {
            "标间": parseInt(form.standard.value) || 0,
            "三人间": parseInt(form.triple.value) || 0,
            "大床房": parseInt(form.double.value) || 0,
            "亲子间": parseInt(form.family.value) || 0
        };

        // 验证至少选择一个房间
        if (Object.values(rooms).every(v => v === 0)) {
            alert('请至少选择一个房间');
            return;
        }

        const bookingData = {
            guestName: form.guestName.value,
            introducer: form.introducer.value,
            checkInDate: form.checkInDate.value,
            checkOutDate: form.checkOutDate.value,
            rooms: rooms,
            pickupTime: form.pickupTime.value,
            dropoffTime: form.dropoffTime.value,
            remarks: form.remarks.value // 添加备注信息
        };

        // 检查日期
        if (new Date(bookingData.checkOutDate) <= new Date(bookingData.checkInDate)) {
            alert('离店日期必须晚于入住日期');
            return;
        }

        try {
            // 检查房间可用性
            hotelSystem.checkAvailability(
                bookingData.checkInDate,
                bookingData.checkOutDate,
                rooms
            );

            if (editingBooking) {
                // 更新现有预订
                hotelSystem.updateBooking(editingBooking.guestName, {
                    originalDates: editingBooking,
                    bookingData
                });
                editingBooking = null;
                form.querySelector('button[type="submit"]').textContent = '提交预订';
            } else {
                // 添加新预订
                hotelSystem.addBooking(bookingData);
            }
            
            updateBookingsTable();
            form.reset();
            alert(editingBooking ? '修改成功！' : '预订成功！');
        } catch (error) {
            alert(error.message);
        }
    });

    // 修改导出按钮事件处理
    const exportBtn = document.getElementById('exportBtn');
    exportBtn.addEventListener('click', () => {
        hotelSystem.exportAllBookingsToExcel();
    });

    // 添加日期变化监听
    function updateRoomStatus() {
        const checkInDate = form.checkInDate.value;
        const checkOutDate = form.checkOutDate.value;
        
        if (checkInDate && checkOutDate) {
            const start = new Date(checkInDate);
            const end = new Date(checkOutDate);
            
            if (start >= end) {
                document.getElementById('selected-date-hint').textContent = '请选择有效的日期范围';
                return;
            }

            // 查找选定日期范围内最少的可用房间数
            const minAvailable = {};
            for (let date = new Date(start); date < end; date.setDate(date.getDate() + 1)) {
                const available = hotelSystem.getAvailableRooms(date);
                Object.entries(available).forEach(([type, count]) => {
                    if (minAvailable[type] === undefined || count < minAvailable[type]) {
                        minAvailable[type] = count;
                    }
                });
            }

            // 更新房态显示
            updateAvailableDisplay('standard', minAvailable['标间']);
            updateAvailableDisplay('triple', minAvailable['三人间']);
            updateAvailableDisplay('double', minAvailable['大床房']);
            updateAvailableDisplay('family', minAvailable['亲子间']);

            // 更新日期提示
            document.getElementById('selected-date-hint').textContent = 
                `${checkInDate} 至 ${checkOutDate} 期间可订房间数`;
        }
    }

    function updateAvailableDisplay(type, count) {
        const element = document.getElementById(`${type}-available`);
        element.textContent = `可订：${count}间`;
        element.className = 'room-available ' + 
            (count <= 1 ? 'danger' : count <= 3 ? 'warning' : '');
    }

    // 添加日期变化事件监听
    form.checkInDate.addEventListener('change', updateRoomStatus);
    form.checkOutDate.addEventListener('change', updateRoomStatus);

    // 初始化房态显示
    updateRoomStatus();

    // 初始化显示预订记录
    updateBookingsTable();

    // 为日期输入框添加点击事件监听器
    const checkInDateInput = document.getElementById('checkInDate');
    const checkOutDateInput = document.getElementById('checkOutDate');

    checkInDateInput.addEventListener('click', () => {
        checkInDateInput.focus();
    });

    checkOutDateInput.addEventListener('click', () => {
        checkOutDateInput.focus();
    });

    const searchInput = document.getElementById('searchInput');
    const searchType = document.getElementById('searchType');
    const searchBtn = document.getElementById('searchBtn');

    // 搜索功能
    function searchBookings() {
        const searchText = searchInput.value.toLowerCase();
        const type = searchType.value;

        const filteredBookings = hotelSystem.bookings.filter(booking => {
            if (type === 'name') {
                return booking.guestName.toLowerCase().includes(searchText);
            } else if (type === 'introducer') {
                return booking.introducer.toLowerCase().includes(searchText);
            } else if (type === 'date') {
                return booking.checkInDate.includes(searchText) || booking.checkOutDate.includes(searchText);
            }
            return false;
        });

        updateBookingsTable(filteredBookings);
    }

    // 监听搜索按钮点击事件
    searchBtn.addEventListener('click', searchBookings);

    // 监听输入框的回车事件
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchBookings();
        }
    });
}); 