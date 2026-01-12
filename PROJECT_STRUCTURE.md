# 專案結構說明

## 檔案清單

```
個人記帳 PWA/
│
├── index.html              # 主頁面 HTML
│   ├── 表單區域（新增記帳）
│   ├── 記帳清單區域
│   └── 統計資訊區域
│
├── style.css               # 樣式表
│   ├── 響應式設計（手機/平板/電腦）
│   ├── 現代化 UI 設計
│   └── PWA 主題色彩
│
├── app.js                  # 主要邏輯
│   ├── IndexedDB 操作（本地儲存）
│   ├── Google OAuth 2.0（認證）
│   ├── Google Drive API（雲端同步）
│   ├── 記帳功能（新增/刪除/顯示）
│   └── UI 更新函數
│
├── manifest.json           # PWA 設定檔
│   ├── 應用程式名稱與描述
│   ├── 圖示設定
│   └── 顯示模式設定
│
├── sw.js                   # Service Worker
│   ├── 離線快取策略
│   ├── 背景同步
│   └── 推播通知（可選）
│
├── icon-192.png           # PWA 圖示（192x192）- 需自行準備
├── icon-512.png           # PWA 圖示（512x512）- 需自行準備
│
├── README.md              # 完整說明文件
├── SETUP.md               # 快速設定指南
└── PROJECT_STRUCTURE.md   # 本檔案（專案結構說明）
```

## 檔案功能說明

### index.html
- **功能**：定義頁面結構與表單
- **關鍵元素**：
  - 記帳表單（日期、分類、支付方式、金額、備註）
  - 記帳清單顯示區域
  - 統計資訊（總收入、總支出、淨額）
  - Google 登入/登出按鈕

### style.css
- **功能**：定義所有視覺樣式
- **特色**：
  - 響應式設計（支援各種螢幕尺寸）
  - 現代化 UI（漸層、陰影、動畫效果）
  - 清晰的視覺層次
  - 易於閱讀的排版

### app.js
- **功能**：應用程式核心邏輯
- **主要模組**：
  1. **IndexedDB 模組**：本地資料儲存與讀取
  2. **Google OAuth 模組**：使用者認證
  3. **Google Drive 模組**：雲端同步功能
  4. **記帳功能模組**：新增、刪除、顯示記帳
  5. **UI 更新模組**：更新頁面顯示

### manifest.json
- **功能**：定義 PWA 應用程式資訊
- **內容**：
  - 應用程式名稱與描述
  - 圖示路徑
  - 主題色彩
  - 顯示模式（standalone）

### sw.js
- **功能**：Service Worker，提供離線支援
- **策略**：
  - 靜態資源：快取優先
  - Google API：網路優先
  - 離線時顯示快取內容

## 資料流程

```
使用者操作
    ↓
表單提交 → app.js (handleFormSubmit)
    ↓
儲存到 IndexedDB → app.js (addLedgerToDB)
    ↓
更新 UI → app.js (displayLedgers)
    ↓
（如果已登入 Google）
    ↓
同步到 Google Drive → app.js (uploadToDrive)
    ↓
Google Drive API → 儲存 ledger.json
```

## 技術架構

### 前端技術
- **HTML5**：語義化標籤
- **CSS3**：現代化樣式與動畫
- **JavaScript (ES6+)**：模組化程式設計
- **IndexedDB API**：本地資料庫
- **Service Worker API**：離線支援
- **Web App Manifest**：PWA 設定

### Google API
- **Google Identity Services**：OAuth 2.0 認證
- **Google Drive API v3**：檔案上傳/下載

### 資料儲存
- **本地**：IndexedDB（瀏覽器）
- **雲端**：Google Drive（appDataFolder）

## 安全性考量

1. **OAuth 2.0**：使用標準認證流程
2. **應用程式資料資料夾**：檔案儲存在 `appDataFolder`，使用者無法直接存取
3. **HTTPS**：正式環境必須使用 HTTPS
4. **無 Client Secret**：純前端應用，不儲存敏感資訊

## 擴充建議

未來可以擴充的功能：
- [ ] 匯出 CSV/Excel
- [ ] 圖表視覺化
- [ ] 多帳號支援
- [ ] 分類自訂
- [ ] 預算設定
- [ ] 提醒功能
- [ ] 資料備份/還原
