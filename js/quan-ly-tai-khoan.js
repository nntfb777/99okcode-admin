document.addEventListener('DOMContentLoaded', function() {
    
    // Lấy thông tin từ localStorage (được lưu từ lúc login)
    const currentAdmin = localStorage.getItem('admin_name');
    const currentRole = localStorage.getItem('adminRole');
    const token = localStorage.getItem('admin_token'); // Token để xác thực backend

    // Hiển thị tên Admin lên giao diện
    const adminName = localStorage.getItem('admin_name') || 'Admin';
    const adminDisplay = document.getElementById('adminNameDisplay');
    if (adminDisplay) adminDisplay.innerText = adminName;


    if (!currentAdmin) {
        alert("Phiên làm việc hết hạn, sếp vui lòng đăng nhập lại!");
        window.location.href = "/login.html"; // Chuyển về trang login nếu không có tên admin
    }
    // 2. PHÂN QUYỀN GIAO DIỆN: Kiểm tra nếu là Super Admin mới hiện khu vực quản lý
    if (currentRole === 'superadmin') {
        const usersection = document.getElementById('superAdminSection');
        if (usersection) {
            usersection.style.display = 'block';
            loadAdminList();
        }

        const logsSection = document.getElementById('adminLogsSection');
        if (logsSection && currentRole === 'superadmin') {
            logsSection.style.display = 'block';
            loadAdminLogs(); // Tự động load log khi vào trang
        }
    }

    // --- CHỨC NĂNG 1: ĐỔI MẬT KHẨU CÁ NHÂN ---
    const btnChangeMyPass = document.getElementById('btnChangeMyPassword');
    if (btnChangeMyPass) {
        btnChangeMyPass.addEventListener('click', async () => {
            const oldPass = document.getElementById('oldPassword').value;
            const newPass = document.getElementById('newPassword').value;

            if (!oldPass || !newPass) return alert("Vui lòng nhập đầy đủ thông tin!");
            if (newPass.length < 6) return alert("Mật khẩu mới phải từ 6 ký tự!");

            btnChangeMyPass.disabled = true;
            btnChangeMyPass.innerText = "ĐANG CẬP NHẬT...";

            try {
                const response = await fetch(`${API_URL}/api/admin/accounts/change-password`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ username: currentAdmin, oldPass, newPass })
                });

                const result = await response.json();
                if (result.success) {
                    alert("Đổi mật khẩu thành công! Sếp vui lòng đăng nhập lại.");
                    Auth.logout(); // Hàm logout trong file auth.js của sếp
                } else {
                    alert("Lỗi: " + result.message);
                }
            } catch (error) {
                alert("Không thể kết nối máy chủ!");
            } finally {
                btnChangeMyPass.disabled = false;
                btnChangeMyPass.innerText = "CẬP NHẬT MẬT KHẨU";
            }
        });


    }

    // --- CHỨC NĂNG 2: TẢI DANH SÁCH ADMIN (Dành cho Super Admin) ---
    async function loadAdminList() {
        try {
            const response = await fetch(`${API_URL}/api/admin/accounts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();

            if (result.success) {
                renderAdminTable(result.data);
            }
        } catch (error) {
            console.error("Lỗi tải danh sách Admin:", error);
        }
    }

    function renderAdminTable(users) {
        const tbody = document.getElementById('adminTableBody');
        if (!tbody) return;

        tbody.innerHTML = users.map(user => `
            <tr class="border-b hover:bg-gray-50 transition">
                <td class="px-6 py-4 font-bold text-slate-700">${user.username}</td>
                <td class="px-6 py-4 text-center">
                    <span class="px-2 py-1 rounded text-[10px] font-bold uppercase ${user.role === 'superadmin' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}">
                        ${user.role}
                    </span>
                </td>
                <td class="px-6 py-4 text-center text-gray-400 text-xs">${user.created_at}</td>
                <td class="px-6 py-4 text-right space-x-2">
                    <button onclick="resetAdminPassword('${user.username}')" class="text-indigo-500 hover:text-indigo-700 text-xs font-bold mr-2">
                        RESET PASS
                    </button>
                    ${user.username !== currentAdmin ? `
                        <button onclick="deleteAdmin('${user.username}')" class="text-red-400 hover:text-red-600">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    ` : '<span class="text-gray-300 italic text-[10px]">Đang dùng</span>'}
                </td>
            </tr>
        `).join('');
    }

    // --- CHỨC NĂNG 3: THÊM ADMIN MỚI ---
    window.openAddUserModal = async () => {
        const username = prompt("Nhập tên đăng nhập Admin mới:");
        if (!username) return;
        
        const password = prompt("Nhập mật khẩu cho tài khoản này (ít nhất 6 ký tự):");
        if (!password || password.length < 6) return alert("Mật khẩu không hợp lệ!");

        try {
            const response = await fetch(`${API_URL}/api/admin/accounts/add`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ username, password, role: 'admin' })
            });
            const result = await response.json();
            if (result.success) {
                alert("Thêm Admin thành công!");
                loadAdminList();
            } else {
                alert(result.message);
            }
        } catch (error) {
            alert("Lỗi hệ thống khi thêm Admin!");
        }
    };

    // --- CHỨC NĂNG 4: XÓA ADMIN ---
    window.deleteAdmin = async (userToDelete) => {
        if (!confirm(`Sếp có chắc chắn muốn xóa tài khoản [${userToDelete}] không?`)) return;

        try {
            const response = await fetch(`${API_URL}/api/admin/accounts/delete`, {
                method: 'DELETE',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ username: userToDelete })
            });
            const result = await response.json();
            if (result.success) {
                alert("Đã xóa tài khoản!");
                loadAdminList();
            }
        } catch (error) {
            alert("Không thể xóa tài khoản lúc này!");
        }
    };

    // --- CHỨC NĂNG 5: RESET MẬT KHẨU ---
    window.resetAdminPassword = async (targetUser) => {
        const newPass = prompt(`Nhập mật khẩu MỚI cho [${targetUser}]:`);
        if (!newPass || newPass.length < 6) return alert("Mật khẩu không hợp lệ!");

        try {
            const response = await fetch(`${API_URL}/api/admin/accounts/reset-password`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ targetUser, newPass })
            });
            if ((await response.json()).success) alert("Reset thành công!");
        } catch (error) {
            alert("Lỗi khi reset mật khẩu!");
        }
    };
    async function loadAdminLogs() {
    const tableBody = document.getElementById('adminLogsTableBody');
    if (!tableBody) return;
    const token = localStorage.getItem('admin_token');

    try {
        const res = await fetch(`${API_URL}/api/admin/admin-logs`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Site-ID': Auth.getActiveSite()
            }
        });
        const result = await res.json();

        if (result.success && result.logs) {
            if (result.logs.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-gray-400 italic">Chưa có lịch sử thao tác nào</td></tr>`;
                return;
            }

            tableBody.innerHTML = result.logs.map(log => `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-4 font-bold text-indigo-600">${log.username}</td>
                    <td class="px-6 py-4 font-semibold text-gray-800">${log.action}</td>
                    <td class="px-6 py-4 text-gray-600 font-mono text-xs">${log.details || '---'}</td>
                    <td class="px-6 py-4 text-gray-500 font-mono text-xs">${log.ip || 'Unknown'}</td>
                    <td class="px-6 py-4 text-right text-gray-400 text-xs italic">${log.created_at}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error("Lỗi tải nhật ký:", err);
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-red-400 italic">Không thể kết nối tải dữ liệu log</td></tr>`;
    }
}
});