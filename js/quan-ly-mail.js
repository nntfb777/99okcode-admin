let globalEmails = [];

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
            globalEmails = result.emails;

            // BẢNG CHÍNH CHỈ HIỂN THỊ CÁC TRƯỜNG CƠ BẢN, TUYỆT ĐỐI KHÔNG RENDER BODY RA NGOÀI
            tbody.innerHTML = globalEmails.map((mail, index) => `
                <tr class="hover:bg-gray-50 transition border-b">
                    <td class="px-6 py-4 font-semibold text-slate-700">${escapeHtml(mail.sender)}</td>
                    <td class="px-6 py-4 text-indigo-600 font-medium">${escapeHtml(mail.recipient)}</td>
                    <td class="px-6 py-4 font-bold text-gray-800">${escapeHtml(mail.subject)}</td>
                    <td class="px-6 py-4 text-right text-xs text-gray-400">${mail.received_at}</td>
                    <td class="px-6 py-4 text-center space-x-2">
                        <button onclick='viewEmailDetailByIndex(${index})' class="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 transition">
                            <i class="fa-solid fa-eye mr-1"></i> Xem
                        </button>
                        <button onclick='deleteEmail(${mail.id})' class="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition">
                            <i class="fa-solid src-trash mr-1"></i> Xóa
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

// Hiển thị nội dung HTML qua thẻ iframe trong Modal giúp giao diện chuẩn form như Gmail
function viewEmailDetailByIndex(index) {
    const mail = globalEmails[index];
    if (!mail) return;

    document.getElementById('modalSender').innerText = mail.sender;
    document.getElementById('modalRecipient').innerText = mail.recipient;
    document.getElementById('modalSubject').innerText = mail.subject;
    document.getElementById('modalTime').innerText = mail.received_at;
    
    // Sử dụng iframe sandbox để render HTML an toàn và đẹp mắt như Gmail
    const iframe = document.getElementById('modalEmailFrame');
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(mail.body || "<p style='color:gray; text-align:center;'>Không có nội dung hiển thị</p>");
    doc.close();

    document.getElementById('modalDeleteBtn').setAttribute('onclick', `deleteEmail(${mail.id}, true)`);
    document.getElementById('emailModal').classList.remove('hidden');
}

function closeEmailModal() {
    document.getElementById('emailModal').classList.add('hidden');
}

async function deleteEmail(id, isFromModal = false) {
    if (!confirm("Sếp có chắc chắn muốn xóa email này không?")) return;

    try {
        const res = await fetch(`${API_URL}/api/admin/emails/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const result = await res.json();

        if (result.success) {
            if (isFromModal) closeEmailModal();
            loadEmails();
        } else {
            alert("Lỗi khi xóa: " + result.message);
        }
    } catch (err) {
        console.error("Lỗi kết nối khi xóa:", err);
        alert("Không thể kết nối đến máy chủ để xóa!");
    }
}

// Hàm phụ trợ chống XSS cơ bản cho bảng
function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """).replace(/'/g, "'");
}