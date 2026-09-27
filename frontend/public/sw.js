// public/sw.js
// Service Worker لتخزين ملفات التطبيق (App Shell) وتشغيله بالكامل بدون اتصال بالإنترنت

const CACHE_NAME = 'crm-app-shell-v1';

// الأصول الأساسية التي تُخزن عند تثبيت الـ Service Worker
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

// التثبيت: تحميل الأصول الأساسية في الكاش
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('تحذير أثناء إضافة ملفات الـ Precache:', err);
      });
    })
  );
});

// التفعيل: تنظيف أي كاش قديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// التعامل مع الطلبات (Fetch Event)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. لا نتدخل في طلبات الـ API أو الطلبات الخارجية غير الـ GET
  if (url.pathname.startsWith('/api') || event.request.method !== 'GET') {
    return;
  }

  // 2. لطلبات التنقل بين الصفحات (HTML Navigation): Network-first مع Fallback لـ index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // حفظ نسخة في الكاش
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(async () => {
          // في حال انقطاع النت، نرجع صفحة التطبيق الأساسية المخزنة
          const cache = await caches.open(CACHE_NAME);
          const cachedIndex = await cache.match('/index.html') || await cache.match('/');
          return cachedIndex || new Response('التطبيق متاح بدون إنترنت', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        })
    );
    return;
  }

  // 3. للملفات الثابتة (JS, CSS, الصور، الخطوط): Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
