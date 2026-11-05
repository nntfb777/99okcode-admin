document.addEventListener('DOMContentLoaded', () => {
    const adminName = localStorage.getItem('admin_name') || 'Admin';
    const adminDisplay = document.getElementById('adminNameDisplay');
    if (adminDisplay) adminDisplay.innerText = adminName;

    loadEmails();
});

function getAuthHeaders() {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    const siteId = (typeof Auth !== 'undefined' && Auth.getActiveSite) ? Auth.getActiveSite() : '99ok';
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Site-ID': siteId
    };
}

async function loadEmails() {
    const tbody = document.getElementById('emailTableBody');
    if (!tbody) return;

    try {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-gray-400 italic">Đang đồng bộ hộp thư...</td></tr>`;
        
        const res = await fetch(`${API_URL}/api/admin/emails`, {
            headers: getAuthHeaders()
        });
        const result = await res.json();

        if (result.success && result.emails && result.emails.length > 0) {
            tbody.innerHTML = result.emails.map(mail => `
                <tr class="hover:bg-gray-50 transition border-b">
                    <td class="px-6 py-4 font-semibold text-slate-700">${mail.sender}</td>
                    <td class="px-6 py-4 text-indigo-600 font-medium">${mail.recipient}</td>
                    <td class="px-6 py-4 font-bold text-gray-800">${mail.subject}</td>
                    <td class="px-6 py-4 text-right text-xs text-gray-400">${mail.received_at}</td>
                    <td class="px-6 py-4 text-center space-x-2">
                        <button onclick='viewEmailDetail(${JSON.stringify(mail)})' class="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 transition">
                            <i class="fa-solid fa-eye mr-1"></i> Xem
                        </button>
                        <button onclick='deleteEmail(${mail.id})' class="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition">
                            <i class="fa-solid fa-trash mr-1"></i> Xóa
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-gray-400 italic">Chưa có email nào trong hệ thống</td></tr>`;
        }
    } catch (err) {
        console.error("Lỗi tải email:", err);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-red-400 italic">Lỗi kết nối đến máy chủ lấy email</td></tr>`;
    }
}

function viewEmailDetail(mail) {
    document.getElementById('modalSender').innerText = mail.sender;
    document.getElementById('modalRecipient').innerText = mail.recipient;
    document.getElementById('modalSubject').innerText = mail.subject;
    document.getElementById('modalTime').innerText = mail.received_at;
    
    // Xử lý hiển thị nội dung (lọc HTML thô hoặc lấy text trực tiếp)
    let bodyContent = mail.body || "Không có nội dung hiển thị";
    document.getElementById('modalBody').innerText = bodyContent;
    
    // Gán ID cho nút xóa bên trong modal để khi bấm sẽ xóa đúng thư này và đóng modal
    document.getElementById('modalDeleteBtn').setAttribute('onclick', `deleteEmail(${mail.id}, true)`);
    
    document.getElementById('emailModal').classList.remove('hidden');
}

function closeEmailModal() {
    document.getElementById('emailModal').classList.add('hidden');
}

// HÀM XÓA EMAIL
async function deleteEmail(id, isFromModal = false) {
    if (!confirm("Sếp có chắc chắn muốn xóa email này không?")) return;

    try {
        const res = await fetch(`${API_URL}/api/admin/emails/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const result = await res.json();

        if (result.success) {
            if (isFromModal) {
                closeEmailModal();
            }
            loadEmails(); // Tải lại danh sách sau khi xóa
        } else {
            alert("Lỗi khi xóa: " + result.message);
        }
    } catch (err) {
        console.error("Lỗi kết nối khi xóa email:", err);
        alert("Không thể kết nối đến máy chủ để xóa!");
    }
}