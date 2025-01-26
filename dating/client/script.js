const ws = new WebSocket('wss://beihaihuanqiulvxingshe.xyz');

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.action === 'delete') {
        // Remove the booking from the table
        const row = document.querySelector(`tr[data-id="${data.id}"]`);
        if (row) {
            row.remove();
        }
    } else {
        // Update the table with the new booking
        updateBookingsTable([data]);
    }
};

function sendBookingUpdate(booking) {
    ws.send(JSON.stringify(booking));
}

async function fetchBookings() {
    const response = await fetch('https://kein.voin.ink/api/bookings');
    const bookings = await response.json();
    updateBookingsTable(bookings);
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

    const response = await fetch('https://kein.voin.ink/api/bookings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
    });

    if (response.ok) {
        const newBooking = await response.json();
        sendBookingUpdate(newBooking); // Send the new booking via WebSocket
        fetchBookings(); // Refresh the table
    } else {
        alert('添加预订失败');
    }
}

async function deleteBooking(id) {
    const response = await fetch(`https://kein.voin.ink/api/bookings/${id}`, {
        method: 'DELETE'
    });
    if (response.ok) {
        fetchBookings();
    } else {
        alert('删除预订失败');
    }
}

document.getElementById('checkInForm').addEventListener('submit', addBooking);
document.addEventListener('DOMContentLoaded', fetchBookings); 