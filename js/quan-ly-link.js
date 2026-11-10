document.addEventListener('DOMContentLoaded', () => {
    const adminName = localStorage.getItem('admin_name') || 'Admin';
    const adminDisplay = document.getElementById('adminNameDisplay');
    if (adminDisplay) adminDisplay.innerText = adminName;

    loadAllLinks();

    const masterInput = document.getElementById('masterUrlsInput');
    if (masterInput) masterInput.addEventListener('input', updateMasterCount);

    const bannerInput = document.getElementById('bannerUrlsInput');
    if (bannerInput) bannerInput.addEventListener('input', updateBannerCount);
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

// Biến toàn cục lưu trữ ánh xạ dữ liệu gốc từ DB để giữ lại ID của từng dòng
let globalLinksData = [];

// 1. NẠP DỮ LIỆU CẤU HÌNH TỪ BACKEND
async function loadAllLinks() {
    try {
        const siteId = (typeof Auth !== 'undefined' && Auth.getActiveSite) ? Auth.getActiveSite() : '99ok';
        const res = await fetch(`${API_URL}/api/admin/links/list?site_id=${siteId}`, { headers: getAuthHeaders() });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Lỗi tải dữ liệu');
        
        globalLinksData = result.data || [];

        // Điền link hệ thống cố định
        const kefu = globalLinksData.find(i => i.key_name === 'kefuUrl');
        const apk = globalLinksData.find(i => i.key_name === 'apkAppUrl');
        const pc = globalLinksData.find(i => i.key_name === 'pcUrl');
        if (kefu) document.getElementById('kefuUrl').value = kefu.value;
        if (apk) document.getElementById('apkAppUrl').value = apk.value;
        if (pc) document.getElementById('pcUrl').value = pc.value;

        // Điền masterUrls
        const masterLinks = globalLinksData.filter(i => i.category === 'ping_link');
        document.getElementById('masterUrlsInput').value = masterLinks.map(i => i.value).join('\n');
        updateMasterCount();

        // Điền Social Links
        fillSocialLinks(globalLinksData);

        // Điền Banner Carousel
        fillBannerLinks(globalLinksData);
    } catch (err) {
        alert('Lỗi nạp danh sách link: ' + err.message);
    }
}

// 2. LƯU LINK HỆ THỐNG CỐ ĐỊNH
async function saveSystemLinks(e) {
    if (e) e.preventDefault();
    const siteId = (typeof Auth !== 'undefined' && Auth.getActiveSite) ? Auth.getActiveSite() : '99ok';
    const systemItems = [
        { category: 'system_link', key_name: 'kefuUrl', title: 'Link CSKH', value: document.getElementById('kefuUrl').value.trim() },
        { category: 'system_link', key_name: 'apkAppUrl', title: 'Link Tải App APK', value: document.getElementById('apkAppUrl').value.trim() },
        { category: 'system_link', key_name: 'pcUrl', title: 'Link Tải PC', value: document.getElementById('pcUrl').value.trim() }
    ];

    try {
        for (const item of systemItems) {
            // Tìm xem trong DB đã có sẵn item này chưa để tận dụng ID
            const existing = globalLinksData.find(i => i.key_name === item.key_name);
            const payload = {
                ...item,
                id: existing ? existing.id : undefined, // Gửi kèm ID nếu đã có
                site_id: siteId,
                is_active: 1
            };
            await fetch(`${API_URL}/api/admin/links/save`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
        }
        alert('Đã lưu các Link hệ thống thành công!');
        loadAllLinks();
    } catch (err) {
        alert('Lỗi lưu link hệ thống: ' + err.message);
    }
}

// 3. LƯU DANH SÁCH MASTER URLS (Thông minh theo ID từng dòng)
async function saveMasterUrls(e) {
    if (e) e.preventDefault();
    const siteId = (typeof Auth !== 'undefined' && Auth.getActiveSite) ? Auth.getActiveSite() : '99ok';
    const rawText = document.getElementById('masterUrlsInput').value;
    const urlList = rawText.split('\n').map(u => u.trim()).filter(u => u.length > 0);

    try {
        const existingMasterLinks = globalLinksData.filter(i => i.category === 'ping_link');

        // Xóa các dòng bị bớt đi so với cũ
        if (existingMasterLinks.length > urlList.length) {
            for (let i = urlList.length; i < existingMasterLinks.length; i++) {
                const keyToDelete = existingMasterLinks[i].key_name;
                if (keyToDelete) {
                    await fetch(`${API_URL}/api/admin/links/delete?key_name=${keyToDelete}&site_id=${siteId}`, {
                        method: 'DELETE',
                        headers: getAuthHeaders()
                    });
                }
            }
        }

        // Cập nhật hoặc Thêm mới từng dòng dựa vào ID có sẵn
        for (let i = 0; i < urlList.length; i++) {
            const matchedOld = existingMasterLinks[i]; // Dòng cũ ở vị trí tương ứng
            const payload = {
                id: matchedOld ? matchedOld.id : undefined, // 👈 Giữ đúng ID cũ nếu dòng đó đã tồn tại
                site_id: siteId,
                category: 'ping_link',
                key_name: matchedOld ? matchedOld.key_name : `master_url_${Date.now()}_${i}`,
                title: `Master URL ${i + 1}`,
                value: urlList[i],
                sort_order: i + 1,
                is_active: 1
            };

            await fetch(`${API_URL}/api/admin/links/save`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
        }

        alert(`Cập nhật thành công ${urlList.length} Master URLs!`);
        loadAllLinks();
    } catch (err) {
        alert('Lỗi lưu danh sách Master URLs: ' + err.message);
    }
}

function updateMasterCount() {
    const rawText = document.getElementById('masterUrlsInput').value;
    const count = rawText.split('\n').map(u => u.trim()).filter(u => u.length > 0).length;
    const countEl = document.getElementById('masterCount');
    if (countEl) countEl.innerText = `Tổng số: ${count} links`;
}

// 4. LƯU MẠNG XÃ HỘI
function fillSocialLinks(data) {
    const fields = ['facebookUrl', 'telegramUrl', 'dailyTelegramUrl', 'agentLoginUrl', 'giftcodeUrl'];
    fields.forEach(key => {
        const item = data.find(i => i.key_name === key);
        if (item && document.getElementById(key)) {
            document.getElementById(key).value = item.value;
        }
    });
}

async function saveSocialLinks(e) {
    if (e) e.preventDefault();
    const siteId = (typeof Auth !== 'undefined' && Auth.getActiveSite) ? Auth.getActiveSite() : '99ok';
    const socialItems = [
        { category: 'social_link', key_name: 'facebookUrl', title: 'Fanpage Facebook', value: document.getElementById('facebookUrl').value.trim() },
        { category: 'social_link', key_name: 'telegramUrl', title: 'Kênh Telegram', value: document.getElementById('telegramUrl').value.trim() },
        { category: 'social_link', key_name: 'dailyTelegramUrl', title: 'Telegram Đại Lý', value: document.getElementById('dailyTelegramUrl').value.trim() },
        { category: 'social_link', key_name: 'agentLoginUrl', title: 'Đăng Nhập Đại Lý', value: document.getElementById('agentLoginUrl').value.trim() },
        { category: 'social_link', key_name: 'giftcodeUrl', title: 'Link Nhập Giftcode', value: document.getElementById('giftcodeUrl').value.trim() }
    ];

    try {
        for (const item of socialItems) {
            if (!item.value) continue;
            const existing = globalLinksData.find(i => i.key_name === item.key_name);
            const payload = {
                ...item,
                id: existing ? existing.id : undefined, // 👈 Tận dụng ID sẵn có
                site_id: siteId,
                is_active: 1
            };
            await fetch(`${API_URL}/api/admin/links/save`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
        }
        alert('Cập nhật Link Mạng Xã Hội thành công!');
        loadAllLinks();
    } catch (err) {
        alert('Lỗi lưu Link Mạng Xã Hội: ' + err.message);
    }
}

// 5. LƯU BANNER CAROUSEL (Thông minh theo ID từng dòng)
function fillBannerLinks(data) {
    const banners = data.filter(i => i.category === 'banner_image');
    const bannerInput = document.getElementById('bannerUrlsInput');
    if (bannerInput) {
        bannerInput.value = banners.map(i => i.value).join('\n');
        updateBannerCount();
    }
}

async function saveBanners(e) {
    if (e) e.preventDefault();
    const siteId = (typeof Auth !== 'undefined' && Auth.getActiveSite) ? Auth.getActiveSite() : '99ok';
    const rawText = document.getElementById('bannerUrlsInput').value;
    const bannerList = rawText.split('\n').map(u => u.trim()).filter(u => u.length > 0);

    try {
        const existingBanners = globalLinksData.filter(i => i.category === 'banner_image');

        // Xóa bớt nếu số lượng dòng giảm
        if (existingBanners.length > bannerList.length) {
            for (let i = bannerList.length; i < existingBanners.length; i++) {
                const keyToDelete = existingBanners[i].key_name;
                if (keyToDelete) {
                    await fetch(`${API_URL}/api/admin/links/delete?key_name=${keyToDelete}&site_id=${siteId}`, {
                        method: 'DELETE',
                        headers: getAuthHeaders()
                    });
                }
            }
        }

        // Cập nhật hoặc Thêm mới gắn kèm ID
        for (let i = 0; i < bannerList.length; i++) {
            const matchedOld = existingBanners[i];
            const payload = {
                id: matchedOld ? matchedOld.id : undefined, // 👈 Giữ chuẩn ID từng dòng đã có trong DB
                site_id: siteId,
                category: 'banner_image',
                key_name: matchedOld ? matchedOld.key_name : `banner_slide_${Date.now()}_${i}`,
                title: `Banner Slide ${i + 1}`,
                value: bannerList[i],
                sort_order: i + 1,
                is_active: 1
            };

            await fetch(`${API_URL}/api/admin/links/save`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
        }

        alert(`Cập nhật thành công ${bannerList.length} ảnh Banner Carousel!`);
        loadAllLinks();
    } catch (err) {
        alert('Lỗi lưu danh sách Banner: ' + err.message);
    }
}

function updateBannerCount() {
    const rawText = document.getElementById('bannerUrlsInput').value;
    const count = rawText.split('\n').map(u => u.trim()).filter(u => u.length > 0).length;
    const countEl = document.getElementById('bannerCount');
    if (countEl) countEl.innerText = `Tổng số: ${count} ảnh`;
}