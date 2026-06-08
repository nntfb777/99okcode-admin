const API_URL = "https://99okcode-backend.nntfb777.workers.dev";
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const btn = document.getElementById('loginBtn');
    const loading = document.getElementById('btnLoading');

    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!username || !password) {
            alert("Sếp vui lòng nhập đầy đủ tài khoản và mật khẩu!");
            return;
        }

        try {
            // 1. Hiệu ứng Loading
            if (btn) btn.disabled = true;
            if (loading) loading.classList.remove('hidden');

            // 2. Gửi yêu cầu đăng nhập tới Backend
            const res = await fetch(`${API_URL}/api/admin/login`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Site-ID': '99ok'
                },
                body: JSON.stringify({ username, password })
            });

            const result = await res.json();

            // 3. Xử lý kết quả
            if (res.ok && result.success) {
                // Lưu Token và Thông tin vào LocalStorage để Auth.js kiểm tra
                localStorage.setItem('admin_token', result.token);
                localStorage.setItem('admin_name', username);
                localStorage.setItem('adminRole', result.role || 'admin');
                
                // Thông báo nhẹ nhàng và chuyển hướng
                console.log("Đăng nhập thành công!");
                window.location.href = 'quan-ly-ma.html'; 
            } else {
                // Hiện lỗi từ Backend (Sai pass, user không tồn tại...)
                alert(result.message || "Tài khoản hoặc mật khẩu không chính xác!");
            }

        } catch (error) {
            console.error("Lỗi đăng nhập:", error);
            alert("Không thể kết nối đến máy chủ Cloudflare. Sếp kiểm tra lại Internet nhé!");
        } finally {
            // 4. Tắt hiệu ứng Loading
            if (btn) btn.disabled = false;
            if (loading) loading.classList.add('hidden');
        }
    });
});