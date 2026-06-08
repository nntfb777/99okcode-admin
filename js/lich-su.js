
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();

    const adminName = localStorage.getItem('admin_name') || 'Admin';
    const adminDisplay = document.getElementById('adminNameDisplay');
    if (adminDisplay) adminDisplay.innerText = adminName;
    
    // Tìm đến đoạn xử lý selectAllHistory trong lich-su.js và thay bằng đoạn này:
const selectAll = document.getElementById('selectAllHistory');
if (selectAll) {
    selectAll.onchange = (e) => {
        const checkboxes = document.querySelectorAll('.history-checkbox');
        checkboxes.forEach((cb, index) => {
            // CHỈ CHỌN 99 DÒNG ĐẦU TIÊN
            if (index < 99) {
                cb.checked = e.target.checked;
            } else {
                cb.checked = false; // Các dòng từ 100 trở đi không được chọn
            }
        });
        
        // Nếu sếp chọn "Tất cả" nhưng danh sách dài hơn 99, 
        // thì nhắc nhẹ sếp một câu cho chuyên nghiệp
        if (e.target.checked && checkboxes.length > 99) {
            console.log("Hệ thống chỉ cho phép thao tác tối đa 99 dòng một lần để bảo đảm tốc độ.");
        }
        
        if (typeof toggleHistoryDeleteBtn === "function") {
            toggleHistoryDeleteBtn();
        }
    };
}

    const btnDelete = document.getElementById('btnDeleteSelectedHistory');
    if (btnDelete) btnDelete.onclick = deleteHistoryBulk;
});

async function loadHistory() {
    const tbody = document.getElementById('historyTableBody');
    const token = localStorage.getItem('admin_token');
    if (!tbody) return;

    try {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-indigo-500">Đang tải lịch sử...</td></tr>`;
        const res = await fetch(`${API_URL}/api/history`, {
            headers: { 'Authorization': `Bearer ${token}`,
            'X-Site-ID': Auth.getActiveSite() // BẮT BUỘC PHẢI CÓ DÒNG NÀY
            }
        });
        const result = await res.json();

        if (result.success && result.data.length > 0) {
            renderHistoryTable(result.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-gray-400">Chưa có ai nhận mã.</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-red-500">Lỗi kết nối Backend!</td></tr>`;
    }
}

function renderHistoryTable(data) {
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = data.map(item => `
        <tr class="border-b hover:bg-gray-50 transition text-gray-700">
            <td class="p-4">
                <input type="checkbox" class="history-checkbox rounded" value="${item.id}" onchange="toggleHistoryDeleteBtn()">
            </td>
            <td class="p-4 font-medium">${item.username}</td>
            <td class="p-4 text-center font-bold text-indigo-600">${item.code_value}</td>
            <td class="p-4 text-right text-gray-500 text-sm">${item.used_at}</td>
            <td class="p-4 text-right text-gray-500 text-sm">${item.ip || 'Unknown'}</td>
            <td class="p-4 text-right text-gray-500 text-sm">${item.ua || 'Unknown'}</td>
            <td class="p-4 text-right text-gray-500 text-sm">${item.canvas_fp || 'N/A'}</td>
        </tr>
    `).join('');
}

function toggleHistoryDeleteBtn() {
    const btn = document.getElementById('btnDeleteSelectedHistory');
    const checked = document.querySelectorAll('.history-checkbox:checked').length > 0;
    if (btn) btn.classList.toggle('hidden', !checked);
}

async function deleteHistoryBulk() {
    const selected = document.querySelectorAll('.history-checkbox:checked');
    const ids = Array.from(selected).map(cb => parseInt(cb.value));
    if (!confirm(`Xóa ${ids.length} mục đã chọn?`)) return;

    const token = localStorage.getItem('admin_token');
    try {
        const res = await fetch(`${API_URL}/api/history/delete-bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Site-ID': Auth.getActiveSite() },
            body: JSON.stringify({ ids })
        });
        const result = await res.json();
        if (result.success) {
            loadHistory();
            document.getElementById('selectAllHistory').checked = false;
        }
    } catch (err) { alert("Lỗi xóa hàng loạt!"); }
}

// HÀM MỚI: Định nghĩa nút dọn sạch lịch sử
async function clearAllHistory() {
    if (!confirm("Sếp có chắc muốn XÓA SẠCH toàn bộ lịch sử không?")) return;

    const token = localStorage.getItem('admin_token');
    try {
        const res = await fetch(`${API_URL}/api/history/clear-all`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'X-Site-ID': Auth.getActiveSite() }
        });
        const result = await res.json();
        if (result.success) {
            alert(result.message);
            loadHistory();
        }
    } catch (err) { alert("Lỗi dọn rác!"); }
}

// Hàm tải Excel (Giữ nguyên của sếp)
async function downloadExcel() {
    const token = localStorage.getItem('admin_token');
    try {
        const response = await fetch(`${API_URL}/api/history`, {
            headers: { 'Authorization': `Bearer ${token}`,
        'X-Site-ID': Auth.getActiveSite() // BẮT BUỘC PHẢI CÓ DÒNG NÀY
            }
        });
        const result = await response.json();
        if (!result.success || result.data.length === 0) return alert("Không có dữ liệu!");

// 1. Chuẩn bị dữ liệu: SheetJS nhận mảng các đối tượng hoặc mảng các mảng
        const dataForExcel = result.data.map(row => ({
            "Hội viên": row.username,
            "Mã quà tặng": row.code_value,
            "Thời gian nhận": row.used_at,
            "IP": row.ip,
            "User-Agent": row.ua,
            "CanvasFp": row.canvas_fp
        }));

        // 2. Tạo một Workbook mới
        const wb = XLSX.utils.book_new();
        
        // 3. Chuyển đổi dữ liệu JSON thành một Worksheet
        const ws = XLSX.utils.json_to_sheet(dataForExcel);

        // 4. Tự động chỉnh độ rộng cột (Optional nhưng nên có để User-Agent không bị che)
        const colWidths = [
            { wch: 15 }, // Hội viên
            { wch: 15 }, // Mã quà
            { wch: 20 }, // Thời gian
            { wch: 15 }, // IP
            { wch: 50 }, // User-Agent (cho rộng ra)
            { wch: 15 }  // CanvasFp
        ];
        ws['!cols'] = colWidths;

        // 5. Đưa Worksheet vào Workbook
        XLSX.utils.book_append_sheet(wb, ws, "LichSu");

        // 6. Xuất file và tải xuống
        XLSX.writeFile(wb, `LichSu${Auth.getActiveSite()}_${new Date().getTime()}.xlsx`);
        
    } catch (err) { 
        console.error(err);
        alert("Lỗi xuất file!"); 
    }
}