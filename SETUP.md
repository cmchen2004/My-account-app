# 快速設定指南

## 前置準備

1. **準備圖示檔案**
   - 需要兩個 PNG 圖示：`icon-192.png`（192x192）和 `icon-512.png`（512x512）
   - 可以使用線上工具產生：[PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
   - 或使用任何圖片編輯軟體製作

## Google Cloud Console 設定（5 分鐘）

### 步驟 1：建立專案並啟用 API

1. 前往 https://console.cloud.google.com/
2. 建立新專案（名稱：個人記帳 App）
3. 啟用「Google Drive API」

### 步驟 2：設定 OAuth 同意畫面

1. 進入「API 和服務」→「OAuth 同意畫面」
2. 選擇「外部」（或「內部」如果您有 Google Workspace）
3. 填寫：
   - 應用程式名稱：個人記帳
   - 使用者支援電子郵件：您的電子郵件
   - 應用程式首頁連結：您的網站網址（或 `http://localhost` 用於測試）
4. 儲存並繼續

### 步驟 3：建立 OAuth 用戶端 ID

1. 進入「API 和服務」→「憑證」
2. 點擊「建立憑證」→「OAuth 用戶端 ID」
3. 應用程式類型：**網頁應用程式**
4. 名稱：個人記帳 Web App
5. **已授權的 JavaScript 來源**：
   ```
   http://localhost
   http://localhost:8080
   https://yourdomain.com
   ```
6. **已授權的重新導向 URI**：
   ```
   http://localhost
   http://localhost:8080
   https://yourdomain.com
   ```
7. 點擊「建立」
8. **複製「用戶端 ID」**（格式：`123456789-xxx.apps.googleusercontent.com`）

### 步驟 4：更新程式碼

開啟 `app.js`，找到 `YOUR_CLIENT_ID` 並替換為您的 Client ID：

```javascript
// 在 signInWithGoogle() 函數中（約第 160 行）
const tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: '您的_CLIENT_ID_在這裡', // ← 替換這裡
    scope: 'https://www.googleapis.com/auth/drive.file',
    // ...
});
```

## 本地測試

1. 使用本地伺服器執行：
   ```bash
   # Python 3
   python -m http.server 8080
   
   # 或 Node.js
   npx http-server -p 8080
   ```

2. 開啟瀏覽器：`http://localhost:8080`

3. 測試功能：
   - 新增記帳
   - 刪除記帳
   - 登入 Google 並同步

## 部署到正式環境

1. 將所有檔案上傳到支援 HTTPS 的網頁伺服器
2. 在 Google Cloud Console 中新增您的實際網域到「已授權的 JavaScript 來源」
3. 確保 `manifest.json` 中的路徑正確
4. 測試 PWA 功能（加入主畫面）

## 常見問題

**Q: 登入時出現「redirect_uri_mismatch」錯誤**
A: 確認 Google Cloud Console 中的「已授權的重新導向 URI」包含您使用的網址。

**Q: 無法同步到 Google Drive**
A: 確認已啟用 Google Drive API，且 OAuth 範圍包含 `drive.file`。

**Q: Service Worker 未註冊**
A: 確認使用 HTTPS 或 localhost，且 `sw.js` 檔案存在。

**Q: 無法加入主畫面**
A: 確認 `manifest.json` 和圖示檔案存在，且使用 HTTPS。

## 需要幫助？

請參考 `README.md` 中的詳細說明文件。
