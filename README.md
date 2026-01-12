# 個人記帳 PWA 應用程式

一個功能完整的個人記帳 Progressive Web App (PWA)，支援離線使用與 Google Drive 雲端同步。

## 功能特色

- ✅ **記帳管理**：新增、刪除記帳資料
- ✅ **分類管理**：餐飲、交通、購物、醫療、其他
- ✅ **支付方式**：現金、信用卡
- ✅ **統計功能**：自動計算總收入、總支出、淨額
- ✅ **離線使用**：使用 IndexedDB 本地儲存，無需網路即可使用
- ✅ **雲端同步**：登入 Google 帳號後自動同步到 Google Drive
- ✅ **PWA 支援**：可加入主畫面，提供原生應用程式體驗
- ✅ **響應式設計**：支援電腦、平板、手機

## 技術架構

- **前端框架**：純原生 HTML / CSS / JavaScript（無框架）
- **資料儲存**：IndexedDB（本地）、Google Drive API（雲端）
- **認證方式**：Google OAuth 2.0
- **PWA 技術**：Service Worker、Web App Manifest

## 專案結構

```
個人記帳 PWA/
├── index.html          # 主頁面
├── style.css           # 樣式表
├── app.js              # 主要邏輯（記帳功能、IndexedDB、Google API）
├── manifest.json       # PWA 設定檔
├── sw.js               # Service Worker（離線支援）
├── icon-192.png        # PWA 圖示（192x192）
├── icon-512.png        # PWA 圖示（512x512）
└── README.md           # 說明文件
```

## 安裝與設定

### 1. 下載專案檔案

將所有檔案下載到本地資料夾。

### 2. 建立 PWA 圖示

您需要準備兩個圖示檔案：
- `icon-192.png`（192x192 像素）
- `icon-512.png`（512x512 像素）

可以使用線上工具（如 [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)）產生圖示。

### 3. 設定 Google Cloud Console

#### 步驟 1：建立 Google Cloud 專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 點擊頂部專案選擇器，選擇「**新增專案**」
3. 輸入專案名稱（例如：「個人記帳 App」）
4. 點擊「**建立**」

#### 步驟 2：啟用 Google Drive API

1. 在 Google Cloud Console 中，點擊左側選單「**API 和服務**」→「**程式庫**」
2. 搜尋「**Google Drive API**」
3. 點擊「**Google Drive API**」，然後點擊「**啟用**」

#### 步驟 3：設定 OAuth 同意畫面

1. 在左側選單選擇「**API 和服務**」→「**OAuth 同意畫面**」
2. 選擇使用者類型：
   - **外部**：任何人都可以使用（適合公開應用）
   - **內部**：僅限組織內使用者（需要 Google Workspace）
3. 填寫應用程式資訊：
   - **應用程式名稱**：個人記帳
   - **使用者支援電子郵件**：選擇您的電子郵件
   - **應用程式標誌**：（選填）上傳圖示
   - **應用程式首頁連結**：您的網站網址（例如：`https://yourdomain.com`）
   - **應用程式隱私權政策連結**：（選填）
   - **應用程式服務條款連結**：（選填）
   - **已授權網域**：輸入您的網域（例如：`yourdomain.com`）
4. 點擊「**儲存並繼續**」
5. 在「**範圍**」頁面，點擊「**儲存並繼續**」（使用預設範圍即可）
6. 在「**測試使用者**」頁面（如果選擇外部）：
   - 點擊「**新增使用者**」
   - 輸入您的 Google 帳號電子郵件
   - 點擊「**新增**」
   - 點擊「**儲存並繼續**」
7. 在「**摘要**」頁面，點擊「**返回資訊主頁**」

#### 步驟 4：建立 OAuth 2.0 用戶端 ID

1. 在左側選單選擇「**API 和服務**」→「**憑證**」
2. 點擊頂部「**建立憑證**」→「**OAuth 用戶端 ID**」
3. 如果出現「設定 OAuth 同意畫面」提示，請先完成步驟 3
4. 選擇應用程式類型：**網頁應用程式**
5. 填寫名稱：（例如：「個人記帳 Web App」）
6. **已授權的 JavaScript 來源**：
   - 新增 `http://localhost`（開發用）
   - 新增 `http://localhost:8080`（如果使用本地伺服器）
   - 新增您的實際網域（例如：`https://yourdomain.com`）
7. **已授權的重新導向 URI**：
   - 新增 `http://localhost`（開發用）
   - 新增 `http://localhost:8080`（如果使用本地伺服器）
   - 新增您的實際網域（例如：`https://yourdomain.com`）
8. 點擊「**建立**」
9. **重要**：複製「**用戶端 ID**」（Client ID），格式類似：`123456789-abcdefghijklmnop.apps.googleusercontent.com`

#### 步驟 5：設定應用程式資料資料夾權限

1. 在「**憑證**」頁面，找到您剛建立的 OAuth 用戶端 ID
2. 點擊編輯（鉛筆圖示）
3. 確認「**已授權的重新導向 URI**」包含您的網域
4. 儲存變更

### 4. 更新應用程式程式碼

開啟 `app.js` 檔案，找到以下兩處並替換為您的 Client ID：

```javascript
// 第 1 處：在 signInWithGoogle() 函數中
const tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: 'YOUR_CLIENT_ID', // ← 替換為您的 Client ID
    scope: 'https://www.googleapis.com/auth/drive.file',
    // ...
});

// 第 2 處：在 initGoogleAPI() 函數中（如果有的話）
```

**重要注意事項**：
- 請將 `YOUR_CLIENT_ID` 替換為步驟 4 取得的 Client ID
- **不要**將 Client Secret 放在前端程式碼中（不安全）
- 本應用程式使用 OAuth 2.0 Token 模式，不需要 Client Secret

### 5. 部署應用程式

#### 本地測試（開發階段）

1. 使用本地伺服器執行（避免 CORS 問題）：
   ```bash
   # 使用 Python（Python 3）
   python -m http.server 8080
   
   # 或使用 Node.js http-server
   npx http-server -p 8080
   ```

2. 在瀏覽器開啟：`http://localhost:8080`

3. 確保「已授權的 JavaScript 來源」包含 `http://localhost:8080`

#### 正式部署

1. 將所有檔案上傳到支援 HTTPS 的網頁伺服器
2. 確保「已授權的 JavaScript 來源」包含您的實際網域
3. 確保「已授權的重新導向 URI」包含您的實際網域
4. 在瀏覽器開啟您的網站

### 6. 使用應用程式

1. **新增記帳**：
   - 填寫日期、分類、支付方式、金額、備註
   - 點擊「新增記帳」
   - 資料會自動儲存到本地 IndexedDB

2. **查看記帳清單**：
   - 記帳清單會自動顯示，依日期排序
   - 顯示總收入、總支出、淨額統計

3. **刪除記帳**：
   - 點擊記帳項目旁的「刪除」按鈕
   - 確認刪除

4. **同步到 Google Drive**：
   - 點擊「登入 Google」
   - 授權應用程式存取 Google Drive
   - 首次登入會自動建立 `ledger.json` 檔案
   - 之後每次新增或刪除記帳，會自動同步到 Drive
   - 登入後開啟應用程式，會自動從 Drive 下載最新資料

## 資料儲存說明

### 本地儲存（IndexedDB）

- 資料庫名稱：`LedgerDB`
- 儲存區名稱：`ledger`
- 所有記帳資料都會儲存在瀏覽器的 IndexedDB 中
- 即使未登入 Google，也可以正常使用記帳功能

### 雲端儲存（Google Drive）

- 檔案名稱：`ledger.json`
- 儲存位置：應用程式資料資料夾（`appDataFolder`）
- 使用者無法在 Google Drive 中直接看到此檔案
- 檔案格式：JSON 陣列，包含所有記帳資料

## 疑難排解

### 問題：無法登入 Google

**解決方案**：
1. 確認 Client ID 已正確設定
2. 確認「已授權的 JavaScript 來源」包含您的網域
3. 確認 OAuth 同意畫面已設定完成
4. 檢查瀏覽器主控台是否有錯誤訊息

### 問題：無法同步到 Google Drive

**解決方案**：
1. 確認已啟用 Google Drive API
2. 確認 OAuth 範圍包含 `https://www.googleapis.com/auth/drive.file`
3. 檢查瀏覽器主控台是否有錯誤訊息
4. 確認網路連線正常

### 問題：Service Worker 未註冊

**解決方案**：
1. 確認使用 HTTPS 或 localhost
2. 確認 `sw.js` 檔案存在
3. 檢查瀏覽器主控台是否有錯誤訊息
4. 清除瀏覽器快取後重新載入

### 問題：無法加入主畫面（PWA）

**解決方案**：
1. 確認 `manifest.json` 檔案存在且格式正確
2. 確認已提供圖示檔案（icon-192.png、icon-512.png）
3. 確認使用 HTTPS（localhost 除外）
4. 確認 Service Worker 已成功註冊

## 瀏覽器支援

- ✅ Chrome / Edge（推薦）
- ✅ Firefox
- ✅ Safari（iOS 11.3+）
- ✅ Samsung Internet

## 授權

本專案為開源專案，可自由使用與修改。

## 注意事項

1. **安全性**：本應用程式為純前端應用，所有程式碼都在瀏覽器中執行。請勿將敏感資訊（如 API Key、Client Secret）放在前端程式碼中。

2. **資料備份**：建議定期登入 Google 帳號進行同步，確保資料已備份到 Google Drive。

3. **隱私權**：記帳資料僅儲存在您的瀏覽器（IndexedDB）和您的 Google Drive 帳號中，不會傳送到其他伺服器。

4. **離線使用**：應用程式支援離線使用，但 Google Drive 同步功能需要網路連線。

## 技術文件參考

- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Google Drive API](https://developers.google.com/drive/api)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

## 更新日誌

### v1.0.0（2024）
- 初始版本發布
- 基本記帳功能
- IndexedDB 本地儲存
- Google Drive 同步
- PWA 支援
