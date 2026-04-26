// sw.js - 开发友好版：网络优先 (Network First)
// 修改后：每次刷新都会尝试获取最新代码，没网时才用缓存
const APP_SHELL_VERSION = '2026.04.26-ios-no-viewport-fit';
const CACHE_NAME = 'shubao-phone-dev-' + APP_SHELL_VERSION;
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './CSS/global.css',
  './CSS/pages.css',
  './CSS/widgets.css',
  './CSS/chat-page.css',
  './CSS/weixin.css',
  './CSS/mine.css',
  './CSS/sports.css',
  './CSS/wallet.css',
  './CSS/wallet-leaderboard.css',
  './JS/system.js',
  './JS/apps.js',
  './JS/chat.js',
  './JS/chat/sec-02-core-render.js',
  './JS/chat/sec-03-ai-prompt.js',
  './JS/chat/sec-04-role-state.js',
  './JS/chat/sec-05-ai-response.js',
  './JS/chat/sec-06-map-location.js',
  './JS/chat/sec-07-call-outgoing.js',
  './JS/chat/sec-08-call-incoming.js',
  './JS/chat/sec-09-menu-settings.js',
  './JS/chat/sec-10-navigation-tools.js',
  './JS/chat/sec-10b-memory-archive-v2.js',
  './JS/chat/group/group-core.js',
  './JS/chat/group/group-ui.js',
  './JS/api.js',
  './JS/widgets.js',
  './JS/appearance.js',
  './JS/settings.js',
  './JS/chat-settings.js',
  './JS/moments.js',
  './JS/wallet.js',
  './JS/work.js',
  './JS/worldbook.js',
  './JS/redbook.js',
  './JS/redbook/horror-channel.js',
  './JS/redbook/entertainment-channel.js',
  './JS/redbook/nsfw-channel.js',
  './JS/redbook/abo-channel.js',
  './JS/redbook/fanfic-channel.js',
  './JS/我的/articleData.js',
  './JS/我的/userCycleData.js',
  './JS/我的/period.js',
  './JS/我的/profile.js',
  './JS/我的/sports.js',
  './JS/我的/core.js',
  './private-gallery/private.html',
  './private-gallery/components/NeumorphicCard.js',
  './private-gallery/js/secret-center-core.js',
  './private-gallery/pages/SelectRole.html',
  './private-gallery/pages/FangCun.html',
  './private-gallery/pages/NiNan.html',
  './private-gallery/pages/ChenFeng.html',
  './private-gallery/pages/ShadowAppStore.html',
  './private-gallery/pages/ShadowAssets.html',
  './private-gallery/pages/ShadowBrowser.html',
  './private-gallery/pages/ShadowCalls.html',
  './private-gallery/pages/ShadowDiary.html',
  './private-gallery/pages/ShadowFood.html',
  './private-gallery/pages/ShadowGame.html',
  './private-gallery/pages/ShadowHealth.html',
  './private-gallery/pages/ShadowItinerary.html',
  './private-gallery/pages/ShadowMemos.html',
  './private-gallery/pages/ShadowPhotos.html',
  './private-gallery/pages/ShadowReading.html',
  './private-gallery/pages/ShadowSettings.html',
  './private-gallery/pages/ShadowShopping.html',
  './private-gallery/pages/ShadowSMS.html',
  './private-gallery/pages/ShadowWechat.html',
  './private-gallery/pages/ShadowWork.html',
  './private-gallery/pages/ShadowYoutube.html',
  './assets/icons/shubao.png',
  './assets/icons/icon-placeholder.png'
];

// 1. 安装：还是把核心文件存一下
self.addEventListener('install', (e) => {
  console.log('SW: 正在安装...');
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        for (const url of urlsToCache) {
          try {
            await cache.add(url);
          } catch (err) {}
        }
      })
      .then(() => self.skipWaiting())
  );
});

// 2. 激活：清理旧缓存
self.addEventListener('activate', (e) => {
  console.log('SW: 已激活');
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  const data = e && e.data ? e.data : null;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('notificationclick', (event) => {
  const notif = event && event.notification ? event.notification : null;
  if (notif) {
    try { notif.close(); } catch (e0) {}
  }
  const data = notif && notif.data && typeof notif.data === 'object' ? notif.data : {};
  const roleId = String(data.roleId || '').trim();
  const targetUrl = String(data.url || './').trim() || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList && clientList.length) {
        const client = clientList[0];
        try {
          client.postMessage({
            type: 'OPEN_CHAT_FROM_NOTIFICATION',
            roleId: roleId
          });
        } catch (e1) {}
        if (typeof client.focus === 'function') {
          return client.focus();
        }
        return client;
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return null;
    })
  );
});

// 3. 拦截请求：🔥 核心修改：网络优先策略 🔥
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  const isSameOrigin = url.origin === self.location.origin;
  if (!isSameOrigin) return;

  const scopePath = new URL(self.registration.scope).pathname;
  const normalizedScopePath = scopePath.endsWith('/') ? scopePath : scopePath + '/';
  const relativePath = url.pathname.startsWith(normalizedScopePath)
    ? url.pathname.slice(normalizedScopePath.length)
    : url.pathname.replace(/^\/+/, '');

  const isAssetRequest =
    url.pathname === normalizedScopePath ||
    relativePath === '' ||
    relativePath === 'index.html' ||
    relativePath.endsWith('.html') ||
    relativePath.startsWith('CSS/') ||
    relativePath.startsWith('JS/') ||
    relativePath.startsWith('private-gallery/') ||
    relativePath.startsWith('assets/');

  if (!isAssetRequest) return;

  e.respondWith(
    // 第一步：先尝试去网络请求最新的
    fetch(e.request)
      .then(response => {
        if (!response || response.status === 206) return response;

        // 如果网络请求成功：
        // 1. 克隆一份响应（因为流只能用一次）
        const responseToCache = response.clone();
        
        // 2. 把最新的代码存进缓存，覆盖旧的！
        caches.open(CACHE_NAME)
          .then(cache => cache.put(e.request, responseToCache))
          .catch(() => {});

        // 3. 返回最新的给页面
        return response;
      })
      .catch(() => {
        // 第二步：如果没网（fetch失败），才去缓存里找
        return caches.match(e.request).then((cached) => cached || new Response('', { status: 504 }));
      })
  );
});
