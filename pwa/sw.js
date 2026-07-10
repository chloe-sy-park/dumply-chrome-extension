/* Dumply PWA 서비스 워커 — 앱 셸 cache-first, 데이터는 stale-while-revalidate
   (Twitter Lite 레시피: 작은 셸 + 즉시 재부팅. 리서치 보고서 §PWA 체크리스트) */
const SHELL_CACHE = 'dumply-shell-v1';
const SHELL = [
  './',
  './index.html',
  './tokens.css',
  './app.css',
  './app.js',
  './manifest.webmanifest',
  './assets/alfredo/idle.svg',
  './assets/alfredo/investigating.svg',
  './assets/alfredo/curious.svg',
  './assets/alfredo/celebrating.svg',
  './assets/alfredo/offline.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  /* 앱 셸: cache-first */
  e.respondWith(
    caches.match(e.request).then(hit => {
      const net = fetch(e.request)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then(c => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => hit);
      /* 캐시 있으면 즉시 응답 + 백그라운드 갱신(stale-while-revalidate) */
      return hit || net;
    })
  );
});
