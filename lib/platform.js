/* 플랫폼 심 — 같은 코드베이스를 크롬 확장과 PWA 양쪽에서 돌리기 위한 계층.
 *
 * 확장에서는 아무것도 하지 않는다(진짜 chrome API가 이미 있음).
 * 웹(PWA)에서는 앱이 참조하는 chrome.* 표면만 최소로 흉내 내어
 * ReferenceError로 앱이 죽는 것을 막고, 가능한 기능은 웹 표준으로 대체한다.
 *
 * 대체 매핑
 *   storage.local  → localStorage (동일 키, 콜백 시그니처 유지)
 *   runtime.*      → no-op (확장 백그라운드가 없으므로 메시징 대상 없음)
 *   notifications  → Notification API
 *   alarms         → no-op (리마인더는 확장 백그라운드 전용 기능)
 *   tabs.create    → window.open
 *   identity       → 미지원으로 명시적 실패 (Google 연동은 PWA에서 비활성)
 *
 * 이 파일은 다른 어떤 스크립트보다 먼저 로드되어야 한다.
 */

'use strict';

(() => {
  const isExtension = typeof chrome !== 'undefined' && !!chrome?.runtime?.id;
  const isWeb = /^https?:$/.test(location.protocol);

  // ── PWA 등록 (웹에서만) ──
  if (isWeb) {
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = 'app.webmanifest';
      document.head.appendChild(link);
    }
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch((e) => {
          console.warn('[Dumply] service worker 등록 실패:', e?.message || e);
        });
      });
    }
  }

  if (isExtension) return; // 확장에서는 심이 필요 없다

  // ── chrome.* 최소 심 ──
  const listeners = new Set();
  const noop = () => {};
  const done = (cb, value) => { if (typeof cb === 'function') cb(value); };

  // 웹 저장소는 확장 저장소보다 노출 위험이 크다 — storage.js의 폴백과 동일하게
  // BYOK API 키는 평문으로 남기지 않는다 (PWA에서는 키를 매 세션 입력).
  const stripSecrets = (v) => (v?.settings?.apiKeys
    ? { ...v, settings: { ...v.settings, apiKeys: { anthropic: '', openai: '', google: '' } } }
    : v);

  const readAll = () => {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      try { out[k] = JSON.parse(localStorage.getItem(k)); } catch { /* 비 JSON 값은 건너뜀 */ }
    }
    return out;
  };

  const local = {
    get(keys, cb) {
      const all = readAll();
      let res;
      if (keys == null) res = all;
      else if (typeof keys === 'string') res = { [keys]: all[keys] };
      else if (Array.isArray(keys)) res = Object.fromEntries(keys.map((k) => [k, all[k]]));
      else res = Object.fromEntries(Object.keys(keys).map((k) => [k, all[k] ?? keys[k]]));
      if (typeof cb === 'function') { cb(res); return; }
      return Promise.resolve(res);           // dumply.js는 await로 쓴다
    },
    set(items, cb) {
      Object.entries(items || {}).forEach(([k, v]) => {
        try { localStorage.setItem(k, JSON.stringify(stripSecrets(v))); }
        catch (e) { console.warn('[Dumply] localStorage 저장 실패:', e?.message || e); }
      });
      if (typeof cb === 'function') { cb(); return; }
      return Promise.resolve();
    },
    remove(keys, cb) {
      (Array.isArray(keys) ? keys : [keys]).forEach((k) => localStorage.removeItem(k));
      if (typeof cb === 'function') { cb(); return; }
      return Promise.resolve();
    },
  };

  window.chrome = {
    __shim: true,
    runtime: {
      id: undefined,                        // "확장인가?" 판별에 쓰인다 — 웹에서는 undefined 유지
      lastError: null,
      // MV3처럼 콜백을 안 주면 Promise를 반환한다 — 호출부가 .catch()로 쓰는 곳이 있다
      sendMessage: (_msg, cb) => {
        if (typeof cb === 'function') { cb(); return undefined; }
        return Promise.resolve();
      },
      onMessage: {
        addListener: (fn) => listeners.add(fn),
        removeListener: (fn) => listeners.delete(fn),
      },
      onInstalled: { addListener: noop },
      getURL: (p) => new URL(p, location.href).href,
    },
    storage: { local },
    tabs: { create: ({ url }) => window.open(url, '_blank', 'noopener') },
    extension: { inIncognitoContext: false },
    alarms: { create: noop, clear: (_n, cb) => done(cb, true), getAll: (cb) => done(cb, []), onAlarm: { addListener: noop } },
    notifications: {
      create: (_id, opts, cb) => {
        try {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(opts?.title || 'Dumply', { body: opts?.message || '', icon: opts?.iconUrl });
          }
        } catch { /* 알림 미지원 환경은 조용히 무시 */ }
        done(cb);
      },
    },
    // Google OAuth는 확장 전용(chrome.identity) — PWA에서는 명시적으로 실패시켜
    // 호출부의 기존 에러 처리(연결 실패 토스트)로 흐르게 한다.
    identity: {
      getAuthToken: (_o, cb) => {
        window.chrome.runtime.lastError = { message: 'NO_IDENTITY' };
        done(cb, undefined);
        window.chrome.runtime.lastError = null;
      },
      removeCachedAuthToken: (_o, cb) => done(cb),
      clearAllCachedAuthTokens: (cb) => done(cb),
    },
    i18n: { getUILanguage: () => navigator.language || 'ko' },
  };
})();
