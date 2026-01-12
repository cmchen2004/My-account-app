// ============================================
// 個人記帳 PWA 應用程式 - 主要邏輯
// ============================================

// 全域變數
const DB_NAME = 'LedgerDB';
const DB_VERSION = 1;
const STORE_NAME = 'ledger';
const DRIVE_FILE_NAME = 'ledger.json';

let db = null;
let gapi = null;
let isSignedIn = false;
let accessToken = null;
let driveFileId = null;

// ============================================
// IndexedDB 初始化與操作
// ============================================

/**
 * 初始化 IndexedDB
 */
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('IndexedDB 開啟失敗');
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('IndexedDB 初始化成功');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            // 建立物件儲存區（如果不存在）
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                // 建立索引以便依日期排序
                objectStore.createIndex('date', 'date', { unique: false });
            }
        };
    });
}

/**
 * 新增記帳資料到 IndexedDB
 */
function addLedgerToDB(ledgerData) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(ledgerData);

        request.onsuccess = () => {
            console.log('記帳資料已新增到 IndexedDB');
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('新增記帳資料失敗');
            reject(request.error);
        };
    });
}

/**
 * 從 IndexedDB 取得所有記帳資料
 */
function getAllLedgersFromDB() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('date');
        const request = index.getAll();

        request.onsuccess = () => {
            const ledgers = request.result;
            // 依日期降序排序（最新的在前）
            ledgers.sort((a, b) => new Date(b.date) - new Date(a.date));
            resolve(ledgers);
        };

        request.onerror = () => {
            console.error('取得記帳資料失敗');
            reject(request.error);
        };
    });
}

/**
 * 從 IndexedDB 刪除記帳資料
 */
function deleteLedgerFromDB(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
            console.log('記帳資料已從 IndexedDB 刪除');
            resolve();
        };

        request.onerror = () => {
            console.error('刪除記帳資料失敗');
            reject(request.error);
        };
    });
}

// ============================================
// Google OAuth 2.0 與 Drive API
// ============================================

/**
 * 初始化 Google API
 * 注意：需要在 HTML 中載入 Google API 腳本
 */
function initGoogleAPI() {
    return new Promise((resolve, reject) => {
        if (window.google && window.google.accounts) {
            gapi = window.gapi;
            resolve();
        } else {
            // 等待 Google API 載入
            const checkInterval = setInterval(() => {
                if (window.google && window.google.accounts && window.gapi) {
                    gapi = window.gapi;
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);

            setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error('Google API 載入逾時'));
            }, 10000);
        }
    });
}

/**
 * 載入 Google API 客戶端庫
 * 注意：這裡不需要 API Key，因為我們使用 OAuth token 進行認證
 */
function loadGoogleAPIClient() {
    return new Promise((resolve, reject) => {
        if (!gapi) {
            reject(new Error('gapi 未載入'));
            return;
        }

        gapi.load('client', async () => {
            try {
                // 設定 access token
                gapi.client.setToken({ access_token: accessToken });
                
                // 初始化 API 客戶端（不需要 API Key，使用 OAuth token）
                await gapi.client.init({
                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
                });
                console.log('Google API 客戶端初始化成功');
                resolve();
            } catch (error) {
                console.error('Google API 客戶端初始化失敗', error);
                reject(error);
            }
        });
    });
}

/**
 * Google 登入處理
 * 使用 Google Identity Services (GIS) Token 模式
 * 這是純前端應用程式推薦的方式
 */
function signInWithGoogle() {
    if (!window.google || !window.google.accounts) {
        showSyncStatus('Google API 尚未載入', 'error');
        return;
    }

    // 使用 OAuth 2.0 Token 客戶端
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: '426607376722-jm76p89q30er3p11qto96tipo4i3ds00.apps.googleusercontent.com', // 請替換為您的 Client ID
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: async (tokenResponse) => {
            if (tokenResponse.error) {
                console.error('授權失敗', tokenResponse);
                showSyncStatus('授權失敗', 'error');
                return;
            }
            
            accessToken = tokenResponse.access_token;
            isSignedIn = true;
            updateAuthUI();
            
            // 載入 Google API 客戶端庫
            try {
                await loadGoogleAPIClient();
                // 嘗試尋找或建立 Drive 檔案
                await findOrCreateDriveFile();
            } catch (error) {
                console.error('載入 Google API 失敗', error);
                showSyncStatus('初始化失敗', 'error');
            }
        }
    });

    // 觸發授權流程
    tokenClient.requestAccessToken();
}

/**
 * Google 登出
 */
function signOutFromGoogle() {
    if (accessToken) {
        window.google.accounts.oauth2.revoke(accessToken, () => {
            console.log('已登出 Google');
        });
    }
    accessToken = null;
    isSignedIn = false;
    driveFileId = null;
    updateAuthUI();
}

/**
 * 在 Google Drive 中尋找或建立 ledger.json 檔案
 * 使用 appDataFolder 空間（應用程式資料資料夾），檔案對使用者不可見
 */
async function findOrCreateDriveFile() {
    try {
        showSyncStatus('正在尋找 Drive 檔案...', 'syncing');

        // 搜尋檔案（在應用程式資料資料夾中）
        const response = await gapi.client.drive.files.list({
            q: `name='${DRIVE_FILE_NAME}' and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'appDataFolder' // 使用應用程式資料資料夾（更安全，使用者看不到）
        });

        const files = response.result.files;

        if (files && files.length > 0) {
            // 檔案已存在，使用現有檔案 ID
            driveFileId = files[0].id;
            console.log('找到現有 Drive 檔案:', driveFileId);
            // 下載並同步資料
            await downloadFromDrive();
        } else {
            // 檔案不存在，建立新檔案
            await createDriveFile();
        }
    } catch (error) {
        console.error('尋找 Drive 檔案失敗', error);
        showSyncStatus('同步失敗', 'error');
    }
}

/**
 * 在 Google Drive 建立新檔案
 * 使用應用程式資料資料夾（appDataFolder）
 */
async function createDriveFile() {
    try {
        showSyncStatus('正在建立 Drive 檔案...', 'syncing');

        // 取得本地所有資料
        const ledgers = await getAllLedgersFromDB();
        const fileContent = JSON.stringify(ledgers, null, 2);

        // 使用 Google Drive API 建立檔案
        const metadata = {
            name: DRIVE_FILE_NAME,
            parents: [] // 空陣列表示使用應用程式資料資料夾（appDataFolder）
        };

        // 建立檔案中繼資料
        const createResponse = await gapi.client.drive.files.create({
            resource: metadata,
            fields: 'id'
        });

        driveFileId = createResponse.result.id;

        // 上傳檔案內容
        const uploadResponse = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${driveFileId}?uploadType=media`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: fileContent
            }
        );

        if (!uploadResponse.ok) {
            throw new Error('上傳檔案內容失敗');
        }

        console.log('Drive 檔案建立成功:', driveFileId);
        showSyncStatus('同步成功', 'success');
        setTimeout(() => {
            document.getElementById('sync-status').style.display = 'none';
        }, 3000);
    } catch (error) {
        console.error('建立 Drive 檔案失敗', error);
        showSyncStatus('同步失敗', 'error');
    }
}

/**
 * 上傳資料到 Google Drive
 * 覆蓋現有檔案內容
 */
async function uploadToDrive() {
    if (!isSignedIn || !driveFileId) {
        console.log('未登入或檔案 ID 不存在');
        return;
    }

    try {
        showSyncStatus('正在同步到 Drive...', 'syncing');

        // 取得本地所有資料
        const ledgers = await getAllLedgersFromDB();
        const fileContent = JSON.stringify(ledgers, null, 2);

        // 更新檔案內容（使用 media upload）
        const response = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${driveFileId}?uploadType=media`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: fileContent
            }
        );

        if (!response.ok) {
            throw new Error('上傳失敗');
        }

        console.log('資料已同步到 Drive');
        showSyncStatus('同步成功', 'success');
        setTimeout(() => {
            document.getElementById('sync-status').style.display = 'none';
        }, 3000);
    } catch (error) {
        console.error('上傳到 Drive 失敗', error);
        showSyncStatus('同步失敗', 'error');
    }
}

/**
 * 從 Google Drive 下載資料
 * 下載後匯入到本地 IndexedDB
 */
async function downloadFromDrive() {
    if (!isSignedIn || !driveFileId) {
        return;
    }

    try {
        showSyncStatus('正在從 Drive 下載...', 'syncing');

        // 下載檔案內容
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('下載失敗');
        }

        const text = await response.text();
        const data = JSON.parse(text);
        console.log('從 Drive 下載資料成功');

        // 清空本地資料庫並匯入 Drive 資料
        if (Array.isArray(data) && data.length > 0) {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            await store.clear();

            for (const ledger of data) {
                // 移除 id，讓 IndexedDB 自動產生新的 id
                const { id, ...ledgerData } = ledger;
                await addLedgerToDB(ledgerData);
            }

            // 重新顯示清單
            await displayLedgers();
            showSyncStatus('同步成功', 'success');
            setTimeout(() => {
                document.getElementById('sync-status').style.display = 'none';
            }, 3000);
        } else {
            showSyncStatus('Drive 檔案為空', 'success');
        }
    } catch (error) {
        console.error('從 Drive 下載失敗', error);
        showSyncStatus('下載失敗', 'error');
    }
}

// ============================================
// UI 更新函數
// ============================================

/**
 * 更新認證狀態 UI
 */
function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const userInfo = document.getElementById('user-info');
    const userName = document.getElementById('user-name');
    const logoutBtn = document.getElementById('logout-btn');

    if (isSignedIn) {
        loginBtn.style.display = 'none';
        userInfo.style.display = 'flex';
        userName.textContent = '已登入 Google';
        // 顯示上傳到 Drive 按鈕
        document.getElementById('export-drive-btn').style.display = 'block';
    } else {
        loginBtn.style.display = 'block';
        userInfo.style.display = 'none';
        // 隱藏上傳到 Drive 按鈕
        document.getElementById('export-drive-btn').style.display = 'none';
    }
}

/**
 * 顯示同步狀態訊息
 */
function showSyncStatus(message, type) {
    const syncStatus = document.getElementById('sync-status');
    syncStatus.textContent = message;
    syncStatus.className = `sync-status ${type}`;
    syncStatus.style.display = 'block';
}

/**
 * 計算並顯示統計資訊（只計算支出）
 */
function updateStats(ledgers) {
    let totalExpense = 0;

    ledgers.forEach(ledger => {
        const amount = parseFloat(ledger.amount) || 0;
        // 只計算支出（正數金額）
        if (amount > 0) {
            totalExpense += amount;
        }
    });

    document.getElementById('total-expense').textContent = `$${totalExpense.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * 顯示記帳清單
 */
async function displayLedgers() {
    const ledgerList = document.getElementById('ledger-list');
    const ledgers = await getAllLedgersFromDB();

    if (ledgers.length === 0) {
        ledgerList.innerHTML = '<p class="empty-message">尚無記帳資料</p>';
        updateStats([]);
        return;
    }

    // 更新統計資訊
    updateStats(ledgers);

    // 顯示清單（只顯示支出）
    ledgerList.innerHTML = ledgers.map(ledger => {
        const date = new Date(ledger.date).toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const amount = parseFloat(ledger.amount) || 0;
        // 只顯示支出金額（正數顯示為支出）
        const amountDisplay = `$${Math.abs(amount).toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        return `
            <div class="ledger-item">
                <div class="ledger-item-content">
                    <div class="ledger-item-header">
                        <span class="ledger-date">${date}</span>
                        <span class="ledger-category">${ledger.category}</span>
                    </div>
                    <div class="ledger-details">
                        <span class="ledger-payment">💳 ${ledger.payment}</span>
                    </div>
                    ${ledger.note ? `<div class="ledger-note">${ledger.note}</div>` : ''}
                </div>
                <div class="ledger-amount negative">${amountDisplay}</div>
                <div class="ledger-actions">
                    <button class="btn-delete" onclick="deleteLedger(${ledger.id})">刪除</button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 刪除記帳資料
 */
async function deleteLedger(id) {
    if (!confirm('確定要刪除這筆記帳嗎？')) {
        return;
    }

    try {
        await deleteLedgerFromDB(id);
        await displayLedgers();
        
        // 如果已登入，同步到 Drive
        if (isSignedIn) {
            await uploadToDrive();
        }
    } catch (error) {
        console.error('刪除失敗', error);
        alert('刪除失敗，請重試');
    }
}

// ============================================
// 表單處理
// ============================================

/**
 * 格式化金額輸入（自動加上千分位）
 */
function formatAmountInput(event) {
    const input = event.target;
    let value = input.value.replace(/[NT$,，]/g, '').trim();
    
    // 只允許數字和小數點
    value = value.replace(/[^\d.]/g, '');
    
    // 確保只有一個小數點
    const parts = value.split('.');
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // 限制小數點後兩位
    if (parts.length === 2 && parts[1].length > 2) {
        value = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    // 如果輸入不為空，加上千分位
    if (value && !isNaN(parseFloat(value))) {
        const numValue = parseFloat(value);
        if (numValue > 0) {
            // 格式化為千分位
            const formatted = numValue.toLocaleString('zh-TW', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            });
            input.value = formatted;
        }
    }
}

/**
 * 處理表單提交
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    // 處理金額輸入（移除千分位符號和貨幣符號）
    const amountInput = document.getElementById('amount').value;
    const amountValue = amountInput.replace(/[NT$,，]/g, '').trim();
    const amount = parseFloat(amountValue);

    const formData = {
        date: document.getElementById('date').value,
        category: document.getElementById('category').value,
        payment: document.querySelector('input[name="payment"]:checked').value,
        amount: amount,
        note: document.getElementById('note').value.trim()
    };

    // 驗證
    if (!formData.date || !formData.category || !amountValue) {
        alert('請填寫所有必填欄位');
        return;
    }

    // 確保金額為有效數字且為正數（支出）
    if (isNaN(amount) || amount <= 0) {
        alert('請輸入有效的金額（必須大於 0）');
        return;
    }

    try {
        // 新增到 IndexedDB
        await addLedgerToDB(formData);
        
        // 重置表單
        document.getElementById('ledger-form').reset();
        document.getElementById('date').valueAsDate = new Date();

        // 重新顯示清單
        await displayLedgers();

        // 如果已登入，同步到 Drive
        if (isSignedIn) {
            await uploadToDrive();
        }

        // 顯示成功訊息
        showSyncStatus('記帳已新增', 'success');
        setTimeout(() => {
            document.getElementById('sync-status').style.display = 'none';
        }, 2000);
    } catch (error) {
        console.error('新增記帳失敗', error);
        alert('新增失敗，請重試');
    }
}

// ============================================
// 統計表匯出功能
// ============================================

/**
 * 依日期區間篩選記帳資料
 */
function filterLedgersByDateRange(ledgers, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // 包含結束日期當天

    return ledgers.filter(ledger => {
        const ledgerDate = new Date(ledger.date);
        return ledgerDate >= start && ledgerDate <= end;
    });
}

/**
 * 產生統計表資料（依分類統計）
 */
function generateStatistics(ledgers) {
    const stats = {
        byCategory: {},
        byPayment: {},
        total: 0,
        count: ledgers.length,
        dateRange: null
    };

    ledgers.forEach(ledger => {
        const amount = parseFloat(ledger.amount) || 0;
        
        // 依分類統計
        if (!stats.byCategory[ledger.category]) {
            stats.byCategory[ledger.category] = 0;
        }
        stats.byCategory[ledger.category] += amount;
        
        // 依支付方式統計
        if (!stats.byPayment[ledger.payment]) {
            stats.byPayment[ledger.payment] = 0;
        }
        stats.byPayment[ledger.payment] += amount;
        
        // 總計
        stats.total += amount;
    });

    return stats;
}

/**
 * 將統計表轉換為 CSV 格式
 */
function convertToCSV(ledgers, stats, startDate, endDate) {
    const lines = [];
    
    // 標題
    lines.push('個人記帳統計表');
    lines.push(`統計期間：${startDate} 至 ${endDate}`);
    lines.push('');
    
    // 總計資訊
    lines.push('總計資訊');
    lines.push('項目,金額');
    lines.push(`總筆數,${stats.count}`);
    lines.push(`總支出,${stats.total.toFixed(2)}`);
    lines.push('');
    
    // 依分類統計
    lines.push('依分類統計');
    lines.push('分類,金額');
    const categories = Object.keys(stats.byCategory).sort();
    categories.forEach(category => {
        lines.push(`${category},${stats.byCategory[category].toFixed(2)}`);
    });
    lines.push('');
    
    // 依支付方式統計
    lines.push('依支付方式統計');
    lines.push('支付方式,金額');
    const payments = Object.keys(stats.byPayment).sort();
    payments.forEach(payment => {
        lines.push(`${payment},${stats.byPayment[payment].toFixed(2)}`);
    });
    lines.push('');
    
    // 詳細記錄
    lines.push('詳細記錄');
    lines.push('日期,分類,支付方式,金額,備註');
    ledgers.forEach(ledger => {
        // 使用 YYYY-MM-DD 格式，確保 Google Sheets 能正確識別為日期
        const dateObj = new Date(ledger.date);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const date = `${year}-${month}-${day}`;
        
        const amount = parseFloat(ledger.amount) || 0;
        const note = (ledger.note || '').replace(/,/g, '，').replace(/"/g, '""'); // 處理 CSV 特殊字元
        // 如果備註包含換行或逗號，需要用雙引號包起來
        const noteFormatted = note.includes(',') || note.includes('\n') ? `"${note}"` : note;
        lines.push(`${date},${ledger.category},${ledger.payment},${amount.toFixed(2)},${noteFormatted}`);
    });
    
    // 使用 BOM 確保 Excel 正確顯示中文
    return '\uFEFF' + lines.join('\n');
}

/**
 * 下載 CSV 檔案
 */
function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

/**
 * 上傳 CSV 到 Google Drive
 */
async function uploadCSVToDrive(csvContent, filename) {
    if (!isSignedIn) {
        alert('請先登入 Google');
        return;
    }

    try {
        showSyncStatus('正在上傳統計表到 Drive...', 'syncing');

        // 建立檔案中繼資料
        const metadata = {
            name: filename,
            parents: [] // 使用應用程式資料資料夾
        };

        // 建立檔案
        const createResponse = await gapi.client.drive.files.create({
            resource: metadata,
            fields: 'id'
        });

        const fileId = createResponse.result.id;

        // 上傳檔案內容
        const uploadResponse = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'text/csv;charset=utf-8'
                },
                body: csvContent
            }
        );

        if (!uploadResponse.ok) {
            throw new Error('上傳失敗');
        }

        console.log('統計表已上傳到 Drive:', fileId);
        showSyncStatus('統計表已上傳到 Google Drive', 'success');
        setTimeout(() => {
            document.getElementById('sync-status').style.display = 'none';
        }, 3000);
    } catch (error) {
        console.error('上傳統計表到 Drive 失敗', error);
        showSyncStatus('上傳失敗', 'error');
    }
}

/**
 * 處理統計表匯出
 */
async function handleExportStatistics() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    if (!startDate || !endDate) {
        alert('請選擇開始日期和結束日期');
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        alert('開始日期不能晚於結束日期');
        return;
    }

    try {
        // 取得所有記帳資料
        const allLedgers = await getAllLedgersFromDB();
        
        // 依日期區間篩選
        const filteredLedgers = filterLedgersByDateRange(allLedgers, startDate, endDate);

        if (filteredLedgers.length === 0) {
            alert('指定日期區間內沒有記帳資料');
            return;
        }

        // 產生統計資料
        const stats = generateStatistics(filteredLedgers);

        // 轉換為 CSV
        const csvContent = convertToCSV(filteredLedgers, stats, startDate, endDate);

        // 產生檔案名稱
        const filename = `記帳統計表_${startDate}_${endDate}.csv`;

        // 下載 CSV
        downloadCSV(csvContent, filename);
        
        showSyncStatus('統計表已下載', 'success');
        setTimeout(() => {
            document.getElementById('sync-status').style.display = 'none';
        }, 2000);
    } catch (error) {
        console.error('匯出統計表失敗', error);
        alert('匯出失敗，請重試');
    }
}

/**
 * 處理上傳統計表到 Google Drive
 */
async function handleUploadStatisticsToDrive() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    if (!startDate || !endDate) {
        alert('請選擇開始日期和結束日期');
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        alert('開始日期不能晚於結束日期');
        return;
    }

    if (!isSignedIn) {
        alert('請先登入 Google');
        return;
    }

    try {
        // 取得所有記帳資料
        const allLedgers = await getAllLedgersFromDB();
        
        // 依日期區間篩選
        const filteredLedgers = filterLedgersByDateRange(allLedgers, startDate, endDate);

        if (filteredLedgers.length === 0) {
            alert('指定日期區間內沒有記帳資料');
            return;
        }

        // 產生統計資料
        const stats = generateStatistics(filteredLedgers);

        // 轉換為 CSV
        const csvContent = convertToCSV(filteredLedgers, stats, startDate, endDate);

        // 產生檔案名稱
        const filename = `記帳統計表_${startDate}_${endDate}.csv`;

        // 上傳到 Drive
        await uploadCSVToDrive(csvContent, filename);
    } catch (error) {
        console.error('上傳統計表失敗', error);
        alert('上傳失敗，請重試');
    }
}

// ============================================
// 初始化
// ============================================

/**
 * 應用程式初始化
 */
async function init() {
    try {
        // 初始化 IndexedDB
        await initDB();

        // 初始化 Google API
        await initGoogleAPI();

        // 設定表單預設日期為今天
        document.getElementById('date').valueAsDate = new Date();

        // 綁定表單提交事件
        document.getElementById('ledger-form').addEventListener('submit', handleFormSubmit);

        // 綁定金額輸入格式化
        const amountInput = document.getElementById('amount');
        amountInput.addEventListener('input', formatAmountInput);
        amountInput.addEventListener('blur', formatAmountInput);

        // 綁定登入/登出按鈕
        document.getElementById('login-btn').addEventListener('click', signInWithGoogle);
        document.getElementById('logout-btn').addEventListener('click', signOutFromGoogle);

        // 設定統計表日期預設值（本月）
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        document.getElementById('start-date').valueAsDate = firstDay;
        document.getElementById('end-date').valueAsDate = today;

        // 綁定統計表匯出按鈕
        document.getElementById('export-btn').addEventListener('click', handleExportStatistics);
        document.getElementById('export-drive-btn').addEventListener('click', handleUploadStatisticsToDrive);

        // 顯示現有記帳資料
        await displayLedgers();

        // 註冊 Service Worker（PWA）
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker 註冊成功', registration);
                })
                .catch(error => {
                    console.error('Service Worker 註冊失敗', error);
                });
        }
    } catch (error) {
        console.error('初始化失敗', error);
    }
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', init);
