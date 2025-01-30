const ws = new WebSocket('wss://beihaihuanqiulvxingshe.xyz');

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log("WebSocket received:", data);

    if (data.action === 'update') {
        updateSingleBooking(data.booking);
    } else if (data.action === 'delete') {
        removeBookingFromTable(data.id);
    }
};

// 每隔 10 秒自动刷新
setInterval(fetchBookings, 10000);

// 在 WebSocket 连接建立后，立即获取数据
ws.onopen = function() {
    fetchBookings();
};

function sendBookingUpdate(booking) {
    ws.send(JSON.stringify(booking));
}

async function fetchBookings() {
    try {
        const response = await fetch('https://beihaihuanqiulvxingshe.xyz/api/bookings');
        const data = await response.json();
        console.log("API 数据：", data); // 先检查数据

        const bookingList = document.getElementById("booking-list"); // 确保这个 ID 存在
        if (!bookingList) {
            console.error("❌ booking-list 容器未找到！");
            return;
        }
        bookingList.innerHTML = ""; // 清空旧数据

        data.forEach(booking => {
            const bookingItem = document.createElement("div");
            bookingItem.classList.add("booking-item");
            bookingItem.innerHTML = `
                <p><strong>客人：</strong>${booking.guestName}</p>
                <p><strong>介绍人：</strong>${booking.introducer}</p>
                <p><strong>入住日期：</strong>${new Date(booking.checkInDate).toLocaleString()}</p>
                <p><strong>退房日期：</strong>${new Date(booking.checkOutDate).toLocaleString()}</p>
                <p><strong>房间：</strong>${JSON.stringify(booking.rooms)}</p>
                <p><strong>备注：</strong>${booking.remarks}</p>
                <hr>
            `;
            bookingList.appendChild(bookingItem);
        });
    } catch (error) {
        console.error("❌ API 请求失败:", error);
    }
}

function updateBookingsTable(bookings) {
    const tableBody = document.getElementById('bookingsTableBody');
    tableBody.innerHTML = '';
    bookings.forEach(booking => {
        const row = document.createElement('tr');
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
}

function formatRoomDetails(rooms) {
    return Object.entries(rooms)
        .filter(([_, quantity]) => quantity > 0)
        .map(([type, quantity]) => `${type}×${quantity}`)
        .join(', ');
}

async function addBooking(event) {
    event.preventDefault();
    const bookingData = {
        guestName: document.getElementById('guestName').value,
        introducer: document.getElementById('introducer').value,
        checkInDate: document.getElementById('checkInDate').value,
        checkOutDate: document.getElementById('checkOutDate').value,
        rooms: {
            标间: parseInt(document.querySelector('input[name="standard"]').value) || 0,
            三人间: parseInt(document.querySelector('input[name="triple"]').value) || 0,
            大床房: parseInt(document.querySelector('input[name="double"]').value) || 0,
            亲子间: parseInt(document.querySelector('input[name="family"]').value) || 0
        },
        pickupTime: document.getElementById('pickupTime').value,
        dropoffTime: document.getElementById('dropoffTime').value,
        remarks: document.getElementById('remarks').value
    };

    const response = await fetch('https://beihaihuanqiulvxingshe.xyz/api/bookings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
    });

    if (response.ok) {
        const newBooking = await response.json();
        sendBookingUpdate(newBooking); // 只发送 WebSocket 消息，不手动刷新
    } else {
        alert('添加预订失败');
    }
}

async function deleteBooking(id) {
    const response = await fetch(`https://beihaihuanqiulvxingshe.xyz/api/bookings/${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        alert('删除预订失败');
    }
}

async function checkAvailability(startDate, endDate, roomQuantities) {
    const response = await fetch('https://beihaihuanqiulvxingshe.xyz/api/bookings');
    const bookings = await response.json();

    const bookedRooms = { 标间: 0, 三人间: 0, 大床房: 0, 亲子间: 0 };

    bookings.forEach(booking => {
        const bookingStart = new Date(booking.checkInDate);
        const bookingEnd = new Date(booking.checkOutDate);
        if (startDate >= bookingStart && endDate < bookingEnd) {
            Object.entries(booking.rooms).forEach(([type, count]) => {
                bookedRooms[type] += count;
            });
        }
    });

    // 检查请求的房间数量是否可用
    Object.entries(roomQuantities).forEach(([roomType, requestedQuantity]) => {
        const availableRooms = 21 - bookedRooms[roomType]; // 假设总房间数为21
        if (requestedQuantity > availableRooms) {
            throw new Error(`${roomType} 仅剩 ${availableRooms} 间，无法预订 ${requestedQuantity} 间`);
        }
    });

    return true; // 如果所有请求的房间数量都可用
}

function updateSingleBooking(booking) {
    // 更新单条预订记录
    const row = document.querySelector(`tr[data-id="${booking._id}"]`);
    if (row) {
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
    } else {
        // 如果行不存在，添加新行
        const tableBody = document.getElementById('bookingsTableBody');
        const newRow = document.createElement('tr');
        newRow.setAttribute('data-id', booking._id);
        newRow.innerHTML = `
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
        tableBody.appendChild(newRow);
    }
}

function removeBookingFromTable(id) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (row) {
        row.remove();
    }
}

document.getElementById('checkInForm').addEventListener('submit', addBooking);
document.addEventListener('DOMContentLoaded', fetchBookings); 