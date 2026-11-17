document.addEventListener('DOMContentLoaded', () => {
    const adminName = localStorage.getItem('admin_name') || 'Admin';
    const adminDisplay = document.getElementById('adminNameDisplay');
    if (adminDisplay) adminDisplay.innerText = adminName;

    loadAllLinks();
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

        // Điền Master URLs ra bảng
        renderMasterTable(globalLinksData.filter(i => i.category === 'ping_link'));

        // Điền Social Links
        fillSocialLinks(globalLinksData);

        // Điền Banner Carousel ra bảng (Áp dụng luôn chuẩn bảng cho Banner để sạch log tuyệt đối)
        renderBannerTable(globalLinksData.filter(i => i.category === 'banner_image'));
    } catch (err) {
        alert('Lỗi nạp danh sách link: ' + err.message);
    }
}

// ==================== QUẢN LÝ MASTER URLS (DẠNG BẢNG TỪNG DÒNG) ====================
function renderMasterTable(masterLinks) {
    const tbody = document.getElementById('masterUrlsTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (masterLinks.length === 0) {
        addMasterRow();
        return;
    }

    masterLinks.forEach((item, index) => {
        appendRowToTable('masterUrlsTbody', item.key_name, item.value, index + 1, 'master-input', 'master-key', 'Nhập https://...');
    });
    updateCount('masterUrlsTbody', 'masterCount', 'links');
}

function addMasterRow(keyName = '', value = '') {
    const generatedKey = keyName || `master_url_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    appendRowToTable('masterUrlsTbody', generatedKey, value, document.getElementById('masterUrlsTbody').rows.length + 1, 'master-input', 'master-key', 'Nhập https://...');
    updateCount('masterUrlsTbody', 'masterCount', 'links');
}

// ==================== QUẢN LÝ BANNERS (DẠNG BẢNG TỪNG DÒNG) ====================
function renderBannerTable(banners) {
    const tbody = document.getElementById('bannerUrlsTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (banners.length === 0) {
        addBannerRow();
        return;
    }

    banners.forEach((item, index) => {
        appendRowToTable('bannerUrlsTbody', item.key_name, item.value, index + 1, 'banner-input', 'banner-key', 'Nhập link ảnh banner...');
    });
    updateCount('bannerUrlsTbody', 'bannerCount', 'ảnh');
}

function addBannerRow(keyName = '', value = '') {
    const generatedKey = keyName || `banner_slide_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    appendRowToTable('bannerUrlsTbody', generatedKey, value, document.getElementById('bannerUrlsTbody').rows.length + 1, 'banner-input', 'banner-key', 'Nhập link ảnh banner...');
    updateCount('bannerUrlsTbody', 'bannerCount', 'ảnh');
}

// Hàm chung render dòng vào bảng
function appendRowToTable(tbodyId, keyName, value, index, inputClass, keyClass, placeholder) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.setAttribute('data-key', keyName);
    tr.innerHTML = `
        <td class="text-center fw-bold row-index">${index}</td>
        <td>
            <input type="text" class="form-control ${inputClass}" value="${value}" placeholder="${placeholder}">
            <input type="hidden" class="${keyClass}" value="${keyName}">
        </td>
        <td class="text-center">
            <button type="button" class="btn btn-sm btn-danger" onclick="removeTableRow(this, '${tbodyId}')">🗑️ Xóa</button>
        </td>
    `;
    tbody.appendChild(tr);
}

// Xóa 1 dòng trên bảng (Tự gọi DELETE ngay lập tức nếu đã có trong DB)
function removeTableRow(btn, tbodyId) {
    const row = btn.closest('tr');
    const keyInput = row.querySelector('.master-key') || row.querySelector('.banner-key');
    const key = keyInput ? keyInput.value : '';
    
    if (key && !key.includes('Date.now()') && !key.includes('math')) {
        const siteId = (typeof Auth !== 'undefined' && Auth.getActiveSite) ? Auth.getActiveSite() : '99ok';
        fetch(`${API_URL}/api/admin/links/delete?key_name=${key}&site_id=${siteId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
    }

    row.remove();
    reorderRows(tbodyId);
    const countId = tbodyId === 'masterUrlsTbody' ? 'masterCount' : 'bannerCount';
    const unit = tbodyId === 'masterUrlsTbody' ? 'links' : 'ảnh';
    updateCount(tbodyId, countId, unit);
}

function reorderRows(tbodyId) {
    const rows = document.querySelectorAll(`#${tbodyId} tr`);
    rows.forEach((row, index) => {
        row.querySelector('.row-index').innerText = index + 1;
    });
}

function updateCount(tbodyId, countId, unit) {
    const count = document.querySelectorAll(`#${tbodyId} tr`).length;
    const countEl = document.getElementById(countId);
    if (countEl) countEl.innerText = `Tổng số: ${count} ${unit}`;
}

// ==================== LƯU DỮ LIỆU TỪNG PHẦN ====================

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
            const payload = { ...item, site_id: siteId, is_active: 1 };
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

// 3. LƯU MASTER URLS TỪ BẢNG (Gửi độc lập từng dòng cực kỳ sạch log)
async function saveMasterUrlsTable(e) {
    if (e) e.preventDefault();
    const siteId = (typeof Auth !== 'undefined' && Auth.getActiveSite) ? Auth.getActiveSite() : '99ok';
    const rows = document.querySelectorAll('#masterUrlsTbody tr');

    try {
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const value = row.querySelector('.master-input').value.trim();
            const keyName = row.querySelector('.master-key').value;

            if (!value) continue;

            const payload = {
                site_id: siteId,
                category: 'ping_link',
                key_name: keyName,
                title: `Master URL ${i + 1}`,
                value: value,
                sort_order: i + 1,
                is_active: 1
            };

            await fetch(`${API_URL}/api/admin/links/save`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
        }

        alert('Đã lưu cấu hình Master URLs thành công!');
        loadAllLinks();
    } catch (err) {
        alert('Lỗi lưu danh sách: ' + err.message);
    }
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
            const payload = { ...item, site_id: siteId, is_active: 1 };
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

// 5. LƯU BANNER CAROUSEL TỪ BẢNG
async function saveBannersTable(e) {
    if (e) e.preventDefault();
    const siteId = (typeof Auth !== 'undefined' && Auth.getActiveSite) ? Auth.getActiveSite() : '99ok';
    const rows = document.querySelectorAll('#bannerUrlsTbody tr');

    try {
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const value = row.querySelector('.banner-input').value.trim();
            const keyName = row.querySelector('.banner-key').value;

            if (!value) continue;

            const payload = {
                site_id: siteId,
                category: 'banner_image',
                key_name: keyName,
                title: `Banner Slide ${i + 1}`,
                value: value,
                sort_order: i + 1,
                is_active: 1
            };

            await fetch(`${API_URL}/api/admin/links/save`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
        }

        alert('Đã lưu cấu hình Banner thành công!');
        loadAllLinks();
    } catch (err) {
        alert('Lỗi lưu danh sách Banner: ' + err.message);
    }
}