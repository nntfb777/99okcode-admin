document.addEventListener('DOMContentLoaded', function() {
    // 1. Khai báo API theo yêu cầu của sếp
    const ADMIN_API = "https://99okcode-backend.nntfb777.workers.dev/api/admin/stats";

    const adminName = localStorage.getItem('admin_name') || 'Admin';
    const adminDisplay = document.getElementById('adminNameDisplay');
    if (adminDisplay) adminDisplay.innerText = adminName;

    async function loadDashboardData() {
        // Lấy các element để điều khiển trạng thái
        const workerStatus = document.getElementById('status-worker');
        const dbStatus = document.getElementById('status-db');

        try {
            console.log("Đang kết nối hệ thống...");
            const response = await fetch(`${API_URL}/api/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
                'X-Site-ID': Auth.getActiveSite() // BẮT BUỘC PHẢI CÓ DÒNG NÀY
                }
            });
            // Nếu gọi được API thành công -> Cập nhật đèn Worker xanh
            if (response.ok) {
                if (workerStatus) {
                    workerStatus.innerHTML = `<span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> ĐANG CHẠY`;
                    workerStatus.className = "flex items-center gap-2 text-xs font-bold text-green-400";
                }

                const result = await response.json();
                
                // Kiểm tra cấu trúc dữ liệu (Hono thường bọc trong .data hoặc trả về trực tiếp)
                const resData = result.success ? result.data : result;

                if (resData && resData.stats) {
                    const stats = resData.stats;
                    const history = resData.history || [];

                    // 2. Cập nhật các con số thống kê
                    const total = stats.total || 0;
                    const used = stats.used || stats.claimed || 0;
                    const available = total - used;

                    document.getElementById('stat-total-codes').innerText = total.toLocaleString();
                    document.getElementById('stat-available-codes').innerText = available.toLocaleString();
                    document.getElementById('stat-claimed-count').innerText = used.toLocaleString();
                    
                    const rate = total > 0 ? ((used / total) * 100).toFixed(1) : 0;
                    document.getElementById('stat-usage-rate').innerText = rate + "%";

                    // 3. Cập nhật đèn Database xanh
                    if (dbStatus) {
                        dbStatus.innerText = "ỔN ĐỊNH";
                        dbStatus.className = "text-xs font-bold text-green-400";
                    }

                    // 4. Render bảng lịch sử rút gọn (5 dòng mới nhất)
                    const tableBody = document.getElementById('recent-history-table');
                    if (tableBody) {
                        if (history.length > 0) {
                            tableBody.innerHTML = history.slice(0, 5).map(item => `
                                <tr class="hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                                    <td class="px-6 py-4 text-sm">
                                        <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-[10px]">
                                                <i class="fa-solid fa-user"></i>
                                            </div>
                                            <span class="font-bold text-slate-700">${item.username}</span>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 font-mono text-blue-600 font-bold text-sm">${item.code_value}</td>
                                    <td class="px-6 py-4 text-right text-gray-400 text-[11px] italic">${item.used_at}</td>
                                </tr>
                            `).join('');
                        } else {
                            tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-8 text-gray-400 text-xs italic">Chưa có dữ liệu giao dịch</td></tr>`;
                        }
                    }
                }
            } else {
                throw new Error("Server trả về lỗi");
            }

        } catch (error) {
            console.error("Lỗi Dashboard:", error);
            
            // Nếu sập: Đèn Worker báo đỏ
            if (workerStatus) {
                workerStatus.innerHTML = `<span class="w-2 h-2 bg-red-500 rounded-full"></span> LỖI KẾT NỐI`;
                workerStatus.className = "flex items-center gap-2 text-xs font-bold text-red-500";
            }
            
            // Đèn Database báo đỏ
            if (dbStatus) {
                dbStatus.innerText = "MẤT TÍN HIỆU";
                dbStatus.className = "text-xs font-bold text-red-500";
            }

            // Reset các con số về 0 hoặc báo lỗi
            const fields = ['stat-total-codes', 'stat-available-codes', 'stat-claimed-count', 'stat-usage-rate'];
            fields.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerText = "--";
            });
        }
    }

    // Chạy ngay lần đầu
    loadDashboardData();

});