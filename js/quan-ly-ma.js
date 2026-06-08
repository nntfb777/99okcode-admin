document.addEventListener('DOMContentLoaded', () => {
    console.log("Hệ thống quản lý mã đã sẵn sàng!");

    // 1. Khai báo các phần tử (Giữ nguyên tên biến của sếp)
    const btnSubmitManual = document.getElementById('btnSubmitManual');
    const btnSelectFile = document.getElementById('btnSelectFile');
    const fileInput = document.getElementById('csvFile');
    const btnUploadCSV = document.getElementById('btnUploadCSV');
    const btnRefreshTable = document.getElementById('btnRefreshTable');
    const btnExportCodes = document.getElementById('btnExportCodes');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const selectAll = document.getElementById('selectAll');
    const btnDeleteSelected = document.getElementById('btnDeleteSelected');

    const adminName = localStorage.getItem('admin_name') || 'Admin';
    const adminDisplay = document.getElementById('adminNameDisplay');
    if (adminDisplay) adminDisplay.innerText = adminName;
    if (btnExportCodes) btnExportCodes.onclick = exportCodesToCSV;
    if (btnUploadCSV) btnUploadCSV.onclick = uploadCSV;

    // --- XỬ LÝ 1: GIỚI HẠN CHỌN TỐI ĐA 99 Ô ---
    if (selectAll) {
        selectAll.onchange = () => {
            const checkboxes = document.querySelectorAll('.code-checkbox');
            checkboxes.forEach((cb, index) => {
                // Chỉ cho phép chọn tối đa 99 dòng đầu tiên
                if (index < 99) {
                    cb.checked = selectAll.checked;
                } else {
                    cb.checked = false;
                }
            });
            toggleBulkDeleteBtn();
        };
    }

    // --- XỬ LÝ 2: KHÔI PHỤC LOGIC HIỆN NÚT UPLOAD KHI CHỌN FILE ---
    if (btnSelectFile && fileInput) {
        btnSelectFile.onclick = () => fileInput.click();
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                if (fileNameDisplay) fileNameDisplay.innerText = file.name;
                // Khôi phục logic: Hiện nút upload khi có file
                if (btnUploadCSV) btnUploadCSV.classList.remove('hidden');
            }
        };
    }

    // --- XỬ LÝ 4: RENDER TABLE & FIX TRẠNG THÁI 0 SUẤT ---
    async function loadCodes() {
        const tableBody = document.getElementById('codeTableBody');
        if (!tableBody) return;

        const token = localStorage.getItem('admin_token');
        try {
            const res = await fetch(`${API_URL}/api/admin/list-codes`, {
                headers: { 'Authorization': `Bearer ${token}`, 'X-Site-ID': Auth.getActiveSite() }
            });
            const result = await res.json();

            if (result.success) {
                tableBody.innerHTML = '';
                // Dùng result.codes từ API trả về
                result.codes.forEach((item, index) => {
                    const tr = document.createElement('tr');
                    tr.className = "hover:bg-gray-50 border-b border-gray-100 transition-colors";
                    
                    // FIX LOGIC: Nếu is_used = 1 HOẶC số lượng (amount) <= 0 thì coi như ĐÃ SỬ DỤNG
                    const isUsed = item.is_used || (parseInt(item.amount) <= 0);
                    
                    const statusHTML = isUsed 
                        ? `<span class="px-2 py-1 text-[10px] font-bold bg-red-100 text-red-600 rounded-full">ĐÃ SỬ DỤNG</span>`
                        : `<span class="px-2 py-1 text-[10px] font-bold bg-green-100 text-green-600 rounded-full">CHƯA DÙNG</span>`;

                    tr.innerHTML = `
                        <td class="px-4 py-4">
                            <div class="flex items-center gap-3">
                                <input type="checkbox" class="code-checkbox w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" value="${item.id}" onchange="toggleBulkDeleteBtn()">
                                <span class="text-[11px] font-bold text-gray-400 w-5">${index + 1}</span>
                            </div>
                        </td>
                        <td class="px-4 py-4 font-mono font-bold text-indigo-600">${item.code_value}</td>
                        <td class="px-4 py-4 font-bold text-gray-600 text-center">${item.amount}</td>
                        <td class="px-4 py-4 text-center">${statusHTML}</td>
                        <td class="px-4 py-4 text-right">
                            <button onclick="deleteCode(${item.id})" class="text-gray-400 hover:text-red-600 p-2 transition-colors">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(tr);
                });
            }
        } catch (err) {
            console.error("Lỗi tải danh sách:", err);
        }
    }

    if (btnRefreshTable) btnRefreshTable.onclick = () => loadCodes();
    if (btnSubmitManual) btnSubmitManual.onclick = handleManualSubmit;
    if (btnDeleteSelected) btnDeleteSelected.onclick = deleteBulk;

    window.loadCodes = loadCodes;
    loadCodes();
});

// Các hàm xử lý (Giữ nguyên logic và biến của sếp)
async function handleManualSubmit() {
    let code_value = document.getElementById('manualCode').value.trim();
    const amount = document.getElementById('manualLimit').value;
    const token = localStorage.getItem('admin_token');

    if (!code_value) return alert("Sếp chưa nhập mã!");
    code_value = code_value.toUpperCase();


        // 3. Quy tắc Mã Code (Chữ và số, ít hơn 15 ký tự, không ký tự đặc biệt)
    const codeRegex = /^[a-zA-Z0-9]{1,15}$/;
    if (!codeRegex.test(code_value)) {
        return alert("Mã code chỉ được chứa chữ và số, không dấu, không ký tự đặc biệt, và tối đa 15 ký tự!");
    }
    try {
        const res = await fetch(`${API_URL}/api/admin/generate-code`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Site-ID': Auth.getActiveSite()

            },
            body: JSON.stringify({ code_value, amount: parseInt(amount) || 1 })
        });
        const result = await res.json();
        alert(result.message);
        if (result.success) {
            document.getElementById('manualCode').value = '';
            window.loadCodes();
        }
    } catch (err) { alert("Lỗi thêm mã!"); }
}

async function deleteCode(id) {
    if (!confirm("Xóa mã này?")) return;
    const token = localStorage.getItem('admin_token');
    try {
        const res = await fetch(`${API_URL}/api/admin/delete-code/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}`, 'X-Site-ID': Auth.getActiveSite() }
        });
        const result = await res.json();
        if (result.success) window.loadCodes();
        else alert(result.message);
    } catch (err) { alert("Lỗi xóa mã!"); }
}

function toggleBulkDeleteBtn() {
    const btn = document.getElementById('btnDeleteSelected');
    const checkedCount = document.querySelectorAll('.code-checkbox:checked').length;
    if (btn) btn.style.display = checkedCount > 0 ? 'inline-flex' : 'none';
}

async function deleteBulk() {
    const selectedCheckboxes = document.querySelectorAll('.code-checkbox:checked');
    const ids = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));

    if (ids.length === 0) return alert("Sếp chưa chọn mã nào!");
    if (!confirm(`Sếp có chắc chắn muốn xóa ${ids.length} mã đã chọn không?`)) return;

    const token = localStorage.getItem('admin_token');
    try {
        const res = await fetch(`${API_URL}/api/admin/delete-codes-bulk`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Site-ID': Auth.getActiveSite()

            },
            body: JSON.stringify({ ids: ids })
        });

        const result = await res.json();
        if (result.success) {
            alert(result.message);
            document.getElementById('selectAll').checked = false;
            toggleBulkDeleteBtn();
            window.loadCodes();
        } else {
            alert("Lỗi: " + result.message);
        }
    } catch (err) { alert("Lỗi kết nối khi xóa hàng loạt!"); }
}

async function exportCodesToCSV() {
    const token = localStorage.getItem('admin_token');
    try {
        const res = await fetch(`${API_URL}/api/admin/list-codes`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'X-Site-ID': Auth.getActiveSite()
            }
        });
        const result = await res.json();
        
        if (!result.success || !result.codes || result.codes.length === 0) {
            return alert("Không có dữ dữ liệu để xuất!");
        }

        let csvContent = "ID,Mã Quà Tặng,Số Lượng,Trạng Thái\n";
        result.codes.forEach(row => {
            const status = row.is_used ? "Đã dùng" : "Chưa dùng";
            csvContent += `"${row.id}","${row.code_value}","${row.amount}","${status}"\n`;
        });

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `danh-sach-ma-${Auth.getActiveSite()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        alert("Lỗi xuất file!");
    }
}

async function uploadCSV() {
    const fileInput = document.getElementById('csvFile');
    if (!fileInput.files.length) return alert("Sếp chưa chọn file!");

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        const text = e.target.result;
        const lines = text.split('\n');
        const codes = [];
for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = line.split(',');
    const codeVal = columns[0].replace(/"/g, '').trim().toUpperCase().substring(0, 15);
    const amountVal = parseInt(columns[1]);

    if (codeVal && codeVal.toLowerCase() !== 'id' && codeVal.toLowerCase() !== 'mã') {
        const item = { code_value: codeVal };
        
        // CHỈ gửi amount nếu nó khác 1 (để request nhẹ nhất có thể)
        if (amountVal && amountVal > 1) {
            item.amount = amountVal;
        }
        
        codes.push(item);
    }
}

        if (codes.length === 0) return alert("File trống hoặc sai định dạng!");

        const token = localStorage.getItem('admin_token');
        try {
            // Hiển thị loading
            const btn = document.getElementById('btnUploadCSV');
            btn.innerText = "ĐANG ĐẨY LÊN...";
            btn.disabled = true;

            const res = await fetch(`${API_URL}/api/admin/generate-code-bulk`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-Site-ID': Auth.getActiveSite()
                },
                body: JSON.stringify({ codes: codes }) // Gửi cả mảng lên 1 lần
            });

            const result = await res.json();
            if (result.success) {
                alert(`Thành công! Đã thêm ${codes.length} mã.`);
                location.reload();
            } else {
                alert("Lỗi: " + result.message);
            }
        } catch (err) {
            console.error(err);
            alert("Lỗi kết nối Backend hoặc file quá nặng!");
        } finally {
            btn.innerText = "UPLOAD LÊN HỆ THỐNG";
            btn.disabled = false;
        }
    };
    reader.readAsText(file);
}