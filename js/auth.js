const API_URL = "https://99okcode-backend.nntfb777.workers.dev";

const Auth = {
    // 1. Logic lấy Site ID hiện tại (Mặc định là 99ok)
    getActiveSite() {
        return localStorage.getItem('active_site_id') || '99ok';
    },

    // 2. Logic khởi tạo bộ chọn Site trên giao diện
    initSiteSelector() {
        const selector = document.getElementById('siteSelector');
        if (selector) {
            selector.value = this.getActiveSite();
            selector.onchange = (e) => {
                localStorage.setItem('active_site_id', e.target.value);
                // Sau khi đổi site, load lại trang để cập nhật dữ liệu mới
                window.location.reload();
            };
        }
    },

    // 3. Giải mã JWT để kiểm tra thời gian hết hạn (exp)
    isTokenExpired(token) {
        if (!token) return true;
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            const { exp } = JSON.parse(jsonPayload);
            return (Date.now() >= exp * 1000);
        } catch (e) {
            console.error("Lỗi kiểm tra token:", e);
            return true; 
        }
    },

    // 4. Kiểm tra quyền và Token hết hạn
    checkAuth() {
        const token = localStorage.getItem('admin_token');
        const isLoginPage = window.location.pathname.includes('login.html');
        const userRole = localStorage.getItem('adminRole');

        // Nếu có token nhưng đã hết hạn -> Tự động đăng xuất
        if (token && this.isTokenExpired(token)) {
            console.warn("Phiên làm việc đã hết hạn.");
            this.logout();
            return;
        }

        document.addEventListener('DOMContentLoaded', () => {
            // Khởi tạo bộ chọn Site ngay khi giao diện sẵn sàng
            this.initSiteSelector();

            // Hiển thị section cho Super Admin
            if (userRole === 'superadmin') {
                const section = document.getElementById('superAdminSection');
                if (section) section.style.display = 'block';
            }
        });

        // Điều hướng nếu chưa đăng nhập
        if (!token && !isLoginPage) {
            window.location.replace('login.html');
        }
        
        // Nếu đã login hợp lệ mà cố vào trang login -> Đẩy vào Dashboard
        if (token && isLoginPage) {
            window.location.replace('index.html');
        }
    },

    // 5. Đăng xuất: Xóa sạch dữ liệu
    logout() {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_name');
        localStorage.removeItem('adminRole');
        // Giữ lại 'active_site_id' để khi login lại vẫn ở site đó, 
        // hoặc sếp có thể xóa luôn nếu muốn reset về 99ok: 
        // localStorage.removeItem('active_site_id'); 
        window.location.replace('login.html');
    },

    token() {
        return localStorage.getItem('admin_token');
    }
};

// Chạy kiểm tra ngay khi load file
Auth.checkAuth();

// Xử lý nút Back của trình duyệt
window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
        Auth.checkAuth();
    }
});