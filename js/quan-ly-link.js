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

    // Điền link hệ thống
    const kefu = data.find(i => i.key_name === 'kefuUrl');
    const apk = data.find(i => i.key_name === 'apkAppUrl');
    const pc = data.find(i => i.key_name === 'pcUrl');

    if (kefu) document.getElementById('kefuUrl').value = kefu.value;
    if (apk) document.getElementById('apkAppUrl').value = apk.value;
    if (pc) document.getElementById('pcUrl').value = pc.value;

    // Điền masterUrls (mỗi link 1 dòng)
    const masterLinks = data.filter(i => i.category === 'ping_link').map(i => i.value);
    document.getElementById('masterUrlsInput').value = masterLinks.join('\n');
    updateMasterCount();

  } catch (err) {
    alert('Lỗi nạp danh sách link: ' + err.message);
  }
}

// 2. LƯU LINK HỆ THỐNG CỐ ĐỊNH (kefuUrl, apkAppUrl, pcUrl)
async function saveSystemLinks(e) {
  e.preventDefault();
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
    alert(' Đã lưu các Link hệ thống thành công!');
  } catch (err) {
    alert('Lỗi lưu link hệ thống: ' + err.message);
  }
}

// 3. LƯU DANH SÁCH MASTER URLS (NHIỀU DÒNG)
async function saveMasterUrls(e) {
  e.preventDefault();
  const siteId = (typeof Auth !== 'undefined' && Auth.getActiveSite) ? Auth.getActiveSite() : '99ok';
  
  const rawText = document.getElementById('masterUrlsInput').value;
  // Bóc tách mảng đường dẫn theo từng dòng và lọc bỏ dòng trống
  const urlList = rawText.split('\n').map(u => u.trim()).filter(u => u.length > 0);

  if (urlList.length === 0) {
    alert('Vui lòng nhập ít nhất 1 đường dẫn URL.');
    return;
  }

  try {
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

    alert(` Cập nhật thành công ${urlList.length} Master URLs!`);
    loadAllLinks();
  } catch (err) {
    alert('Lỗi lưu danh sách Master URLs: ' + err.message);
  }
}

// Hàm hỗ trợ đếm số dòng link
function updateMasterCount() {
  const rawText = document.getElementById('masterUrlsInput').value;
  const count = rawText.split('\n').map(u => u.trim()).filter(u => u.length > 0).length;
  document.getElementById('masterCount').innerText = `Tổng số: ${count} links`;
}
