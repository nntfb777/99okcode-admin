document.addEventListener('DOMContentLoaded', () => {
  // Lấy tên admin hiển thị
  const adminName = localStorage.getItem('admin_name') || 'Admin';
  const adminDisplay = document.getElementById('adminNameDisplay');
  if (adminDisplay) adminDisplay.innerText = adminName;

  // Nạp toàn bộ dữ liệu cấu hình từ Backend
  loadAllLinks();

  // Đếm số dòng masterUrls khi gõ
  const masterInput = document.getElementById('masterUrlsInput');
  if (masterInput) {
    masterInput.addEventListener('input', updateMasterCount);
  }

  // Đếm số dòng banner khi gõ
  const bannerInput = document.getElementById('bannerUrlsInput');
  if (bannerInput) {
    bannerInput.addEventListener('input', updateBannerCount);
  }
});

// Lấy Header xác thực
function getAuthHeaders() {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
  const siteId = (typeof Auth !== 'undefined' && Auth.getActiveSite) ? Auth.getActiveSite() : '99ok';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Site-ID': siteId
  };
}

// 1. NẠP DỮ LIỆU CẤU HÌNH TỪ BACKEND
async function loadAllLinks() {
  try {
    const siteId = (typeof Auth !== 'undefined' && Auth.getActiveSite) ? Auth.getActiveSite() : '99ok';
    const res = await fetch(`${API_URL}/api/admin/links/list?site_id=${siteId}`, {
      headers: getAuthHeaders()
    });

    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Lỗi tải dữ liệu');

    const data = result.data || [];

    // 1. Điền link hệ thống cố định
    const kefu = data.find(i => i.key_name === 'kefuUrl');
    const apk = data.find(i => i.key_name === 'apkAppUrl');
    const pc = data.find(i => i.key_name === 'pcUrl');

    if (kefu) document.getElementById('kefuUrl').value = kefu.value;
    if (apk) document.getElementById('apkAppUrl').value = apk.value;
    if (pc) document.getElementById('pcUrl').value = pc.value;

    // 2. Điền masterUrls (mỗi link 1 dòng)
    const masterLinks = data.filter(i => i.category === 'ping_link').map(i => i.value);
    document.getElementById('masterUrlsInput').value = masterLinks.join('\n');
    updateMasterCount();

    // 3. Điền Link Mạng Xã Hội
    fillSocialLinks(data);

    // 4. Điền Danh sách Banner Carousel
    fillBannerLinks(data);

  } catch (err) {
    alert('Lỗi nạp danh sách link: ' + err.message);
  }
}

// 2. LƯU LINK HỆ THỐNG CỐ ĐỊNH (kefuUrl, apkAppUrl, pcUrl)
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
      await fetch(`${API_URL}/api/admin/links/save`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...item, site_id: siteId, is_active: 1 })
      });
    }
    alert('Đã lưu các Link hệ thống thành công!');
  } catch (err) {
    alert('Lỗi lưu link hệ thống: ' + err.message);
  }
}

// 3. LƯU DANH SÁCH MASTER URLS (TỰ ĐỘNG XÓA CÁC KEY THỪA KHI BỚT DÒNG)
async function saveMasterUrls(e) {
  if (e) e.preventDefault();
  const siteId = (typeof Auth !== 'undefined' && Auth.getActiveSite) ? Auth.getActiveSite() : '99ok';
  
  const rawText = document.getElementById('masterUrlsInput').value;
  const urlList = rawText.split('\n').map(u => u.trim()).filter(u => u.length > 0);

  try {
    // 1. Tải danh sách ping_link hiện tại trên Database để kiểm tra số lượng cũ
    const res = await fetch(`${API_URL}/api/admin/links/list?site_id=${siteId}`, {
      headers: getAuthHeaders()
    });
    const result = await res.json();
    const existingMasterLinks = (result.data || []).filter(i => i.category === 'ping_link');

    // 2. Nếu số lượng dòng mới nhỏ hơn cũ -> Xóa bớt các key dư thừa cuối danh sách
    if (existingMasterLinks.length > urlList.length) {
      for (let i = urlList.length; i < existingMasterLinks.length; i++) {
        const keyToDelete = existingMasterLinks[i].key_name || `master_url_${i + 1}`;
        await fetch(`${API_URL}/api/admin/links/delete?key_name=${keyToDelete}&site_id=${siteId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
      }
    }

    // 3. Lưu lại danh sách đường dẫn mới
    for (let i = 0; i < urlList.length; i++) {
      const payload = {
        site_id: siteId,
        category: 'ping_link',
        key_name: `master_url_${i + 1}`,
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

// Hàm hỗ trợ đếm số dòng link
function updateMasterCount() {
  const rawText = document.getElementById('masterUrlsInput').value;
  const count = rawText.split('\n').map(u => u.trim()).filter(u => u.length > 0).length;
  const countEl = document.getElementById('masterCount');
  if (countEl) countEl.innerText = `Tổng số: ${count} links`;
}

// 4. ĐIỀN LINK MẠNG XÃ HỘI
function fillSocialLinks(data) {
  const fb = data.find(i => i.key_name === 'facebookUrl');
  const tg = data.find(i => i.key_name === 'telegramUrl');
  const daily = data.find(i => i.key_name === 'dailyTelegramUrl');
  const agent = data.find(i => i.key_name === 'agentLoginUrl');
  const code = data.find(i => i.key_name === 'giftcodeUrl');

  if (fb) document.getElementById('facebookUrl').value = fb.value;
  if (tg) document.getElementById('telegramUrl').value = tg.value;
  if (daily) document.getElementById('dailyTelegramUrl').value = daily.value;
  if (agent) document.getElementById('agentLoginUrl').value = agent.value;
  if (code) document.getElementById('giftcodeUrl').value = code.value;
}

// LƯU TOÀN BỘ SOCIAL LINKS
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
      if (!item.value) continue; // Bỏ qua nếu dòng trống
      await fetch(`${API_URL}/api/admin/links/save`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...item, site_id: siteId, is_active: 1 })
      });
    }
    alert('Cập nhật Link Mạng Xã Hội thành công!');
  } catch (err) {
    alert('Lỗi lưu Link Mạng Xã Hội: ' + err.message);
  }
}

// 5. ĐIỀN BANNER CAROUSEL
function fillBannerLinks(data) {
  const banners = data.filter(i => i.category === 'banner_image').map(i => i.value);
  const bannerInput = document.getElementById('bannerUrlsInput');
  if (bannerInput) {
    bannerInput.value = banners.join('\n');
    updateBannerCount();
  }
}

// LƯU DANH SÁCH BANNER (TỰ ĐỘNG XÓA CÁC BANNER THỪA KHI BỚT DÒNG)
async function saveBanners(e) {
  if (e) e.preventDefault();
  const siteId = (typeof Auth !== 'undefined' && Auth.getActiveSite) ? Auth.getActiveSite() : '99ok';
  
  const rawText = document.getElementById('bannerUrlsInput').value;
  const bannerList = rawText.split('\n').map(u => u.trim()).filter(u => u.length > 0);

  try {
    // 1. Tải danh sách banner_image hiện tại trên Database để kiểm tra
    const res = await fetch(`${API_URL}/api/admin/links/list?site_id=${siteId}`, {
      headers: getAuthHeaders()
    });
    const result = await res.json();
    const existingBanners = (result.data || []).filter(i => i.category === 'banner_image');

    // 2. Nếu số lượng hình mới nhỏ hơn cũ -> Xóa bớt các key dư thừa cuối danh sách
    if (existingBanners.length > bannerList.length) {
      for (let i = bannerList.length; i < existingBanners.length; i++) {
        const keyToDelete = existingBanners[i].key_name || `banner_slide_${i + 1}`;
        await fetch(`${API_URL}/api/admin/links/delete?key_name=${keyToDelete}&site_id=${siteId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
      }
    }

    // 3. Lưu lại danh sách ảnh mới
    for (let i = 0; i < bannerList.length; i++) {
      const payload = {
        site_id: siteId,
        category: 'banner_image',
        key_name: `banner_slide_${i + 1}`,
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

// Đếm số dòng ảnh Banner
function updateBannerCount() {
  const rawText = document.getElementById('bannerUrlsInput').value;
  const count = rawText.split('\n').map(u => u.trim()).filter(u => u.length > 0).length;
  const countEl = document.getElementById('bannerCount');
  if (countEl) countEl.innerText = `Tổng số: ${count} ảnh`;
}
