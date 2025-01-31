document.addEventListener("DOMContentLoaded", function () {
    const bookingForm = document.getElementById("bookingForm");

    if (!bookingForm) {
        console.error("❌ bookingForm 未找到");
        return;
    }

    // ✅ 监听表单提交，发送 POST 请求
    bookingForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const formData = {
            guestName: document.getElementById("guestName").value,
            introducer: document.getElementById("introducer").value,
            checkInDate: document.getElementById("checkInDate").value,
            checkOutDate: document.getElementById("checkOutDate").value,
            pickupTime: document.getElementById("pickupTime").value || "无",
            dropoffTime: document.getElementById("dropoffTime").value || "无",
            remarks: document.getElementById("remarks").value,
            rooms: {
                "标间": parseInt(document.getElementById("room-standard").value),
                "三人间": parseInt(document.getElementById("room-triple").value),
                "大床房": parseInt(document.getElementById("room-king").value),
                "亲子间": parseInt(document.getElementById("room-family").value)
            }
        };

        fetch("https://beihaihuanqiulvxingshe.xyz/api/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            console.log("✅ 预订成功:", data);
            fetchBookings(); // 提交后刷新数据
            bookingForm.reset(); // 清空表单
        })
        .catch(error => console.error("❌ 预订失败:", error));
    });

    // ✅ 获取所有预订数据并填充到表格
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

    // ✅ 删除预订
    function deleteBooking(bookingId) {
        fetch(`https://beihaihuanqiulvxingshe.xyz/api/bookings/${bookingId}`, {
            method: "DELETE"
        })
        .then(response => response.json())
        .then(() => {
            console.log("✅ 预订已删除:", bookingId);
            fetchBookings(); // 删除后刷新表格
        })
        .catch(error => console.error("❌ 删除失败:", error));
    }

    // ✅ 解析房间信息格式
    function formatRoomDetails(rooms) {
        if (!rooms || typeof rooms !== 'object') {
            return '无房型信息';
        }
        return Object.entries(rooms)
            .filter(([_, quantity]) => quantity > 0)
            .map(([type, quantity]) => `${type}×${quantity}`)
            .join(', ');
    }

    // ✅ WebSocket 实时更新
    const ws = new WebSocket("wss://beihaihuanqiulvxingshe.xyz");

    ws.onopen = () => console.log("✅ WebSocket 连接成功");
    
    ws.onmessage = function (event) {
        try {
            const data = JSON.parse(event.data);
            console.log("🔄 WebSocket 更新:", data);

            if (data.action === "update") {
                fetchBookings(); // 重新获取数据
            } else if (data.action === "delete") {
                fetchBookings(); // 重新获取数据
            }
        } catch (error) {
            console.error("❌ WebSocket 解析失败:", error);
        }
    };

    ws.onerror = error => console.error("❌ WebSocket 连接错误:", error);
    ws.onclose = () => console.warn("⚠️ WebSocket 连接关闭");

    // ✅ **初次加载数据**
    fetchBookings();

    // ✅ **每 5 秒刷新一次数据**
    setInterval(fetchBookings, 5000);
});
