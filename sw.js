// ============================================
// Service Worker - 離線支援與快取策略
// ============================================

const CACHE_NAME = 'ledger-pwa-v1';
const STATIC_CACHE_URLS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json'
];

// 安裝 Service Worker
self.addEventListener('install', (event) => {
    console.log('Service Worker 安裝中...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('快取靜態資源');
                return cache.addAll(STATIC_CACHE_URLS);
            })
            .then(() => {
                // 強制啟用新的 Service Worker
                return self.skipWaiting();
            })
    );
});

// 啟用 Service Worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker 啟用中...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // 刪除舊的快取
                    if (cacheName !== CACHE_NAME) {
                        console.log('刪除舊快取:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // 立即控制所有頁面
            return self.clients.claim();
        })
    );
});

// 攔截網路請求
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 只處理 GET 請求
    if (request.method !== 'GET') {
        return;
    }

    // Google API 請求：使用網路優先策略
    if (url.hostname === 'www.googleapis.com' || 
        url.hostname === 'accounts.google.com' ||
        url.hostname === 'oauth2.googleapis.com') {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    // 網路失敗時，返回離線訊息
                    return new Response(
                        JSON.stringify({ error: '離線狀態，無法同步' }),
                        {
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                })
        );
        return;
    }

    // 靜態資源：使用快取優先策略
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                // 快取中沒有，從網路取得
                return fetch(request)
                    .then((response) => {
                        // 只快取成功的回應
                        if (response.status === 200) {
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(request, responseToCache);
                                });
                        }
                        return response;
                    })
                    .catch(() => {
                        // 如果是 HTML 請求且離線，返回快取的 index.html
                        if (request.headers.get('accept').includes('text/html')) {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});

// 處理背景同步（當網路恢復時）
self.addEventListener('sync', (event) => {
    console.log('背景同步觸發:', event.tag);
    
    if (event.tag === 'sync-ledger') {
        event.waitUntil(
            // 這裡可以實作背景同步邏輯
            // 例如：上傳待同步的記帳資料
            syncPendingLedgers()
        );
    }
});

// 背景同步函數（範例）
async function syncPendingLedgers() {
    try {
        // 實作同步邏輯
        console.log('執行背景同步');
    } catch (error) {
        console.error('背景同步失敗', error);
    }
}

// 處理推播通知（可選功能）
self.addEventListener('push', (event) => {
    console.log('收到推播通知');
    
    const options = {
        body: event.data ? event.data.text() : '您有新的記帳提醒',
        icon: '/icon-192.png',
        badge: '/icon-192.png'
    };

    event.waitUntil(
        self.registration.showNotification('個人記帳', options)
    );
});

// 處理通知點擊
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow('/')
    );
});
