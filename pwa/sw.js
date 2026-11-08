// تخزين التطبيق للعمل دون اتصال. نسخة جديدة من الملفات = رقم كاش جديد.
const CACHE = "mo3alem-v5";
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './css/app.css',
  './js/app.js',
  './js/ui.js',
  './js/model.js',
  './js/scheduler.js',
  './js/store.js',
  './js/gemini.js',
  './js/print.js',
  './js/theme.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
    // أي صفحة مفتوحة بالنسخة القديمة تُعاد تحميلها فوراً بالكود الجديد.
    const pages = await self.clients.matchAll({ type: 'window' });
    for (const page of pages) page.navigate(page.url).catch(() => {});
  })());
});

// الشبكة أولاً حتى لا تبقى نسخة قديمة من الكود على الهاتف؛ الكاش للعمل دون اتصال فقط.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // طلبات Gemini وغيرها تمر دائماً عبر الشبكة.
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request)),
  );
});
