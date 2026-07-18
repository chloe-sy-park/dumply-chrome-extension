/* Dumply PWA 서비스워커 — 앱 셸 오프라인 캐시.
 *
 * 확장에서는 등록되지 않는다(lib/platform.js가 http(s)에서만 register).
 * 전략: 셸 자산은 캐시 우선(버전 쿼리로 무효화), 그 외 same-origin GET은
 * 네트워크 우선 + 캐시 폴백. API 호출(교차 출처)은 건드리지 않는다.
 */

const VERSION = 'dumply-v5';
const SHELL = [
  'fullpage.html',
  'app.webmanifest',
  'fonts.css?v=48',
  'tokens.css?v=60',
  'components.css?v=68',
  'popup.css?v=133',
  'surface.css?v=48',
  'fullpage.css?v=6',
  'lib/platform.js?v=2',
  'lib/icons.js?v=4',
  'lib/brand.js?v=48',
  'lib/i18n.js?v=17',
  'lib/storage.js?v=65',
  'lib/tags.js?v=81',
  'lib/ai.js?v=72',
  'lib/weather.js?v=49',
  'lib/calendar.js?v=52',
  'lib/gmail.js?v=1',
  'lib/dumply.js?v=4',
  'lib/decisions.js?v=5',
  'lib/sync.js?v=1',
  'lib/icons-init.js?v=1',
  'app/core.js?v=90',
  'app/ui.js?v=69',
  'app/render.js?v=72',
  'app/compose.js?v=55',
  'app/detail.js?v=61',
  'app/timeline-block.js?v=68',
  'app/calendar-view.js?v=77',
  'app/projects.js?v=54',
  'app/quickpanel.js?v=1',
  'app/nav.js?v=57',
  'app/onboard.js?v=63',
  'app/handlers.js?v=106',
  'popup.js?v=53',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      // 개별 실패가 설치 전체를 막지 않도록 하나씩 담는다
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;   // Supabase·Google 등 API는 통과

  // 문서 요청은 네트워크 우선 — 오프라인이면 캐시된 셸로
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('fullpage.html'))),
    );
    return;
  }

  const save = (res) => {
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(request, copy)).catch(() => {});
    }
    return res;
  };

  // ?v= 가 붙은 자산만 캐시 우선 — 갱신이 새 URL로 이뤄지므로 낡을 일이 없다.
  // 버전이 없는 파일(app.webmanifest 등)을 캐시 우선으로 두면 영원히 갱신되지 않는다.
  if (url.searchParams.has('v')) {
    e.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then(save).catch(() => hit)),
    );
    return;
  }

  // 버전 없는 자산은 네트워크 우선, 오프라인일 때만 캐시
  e.respondWith(
    fetch(request).then(save).catch(() => caches.match(request)),
  );
});
