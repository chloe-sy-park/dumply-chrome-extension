/* Dumply 크롬 확장 — 초기화 */

'use strict';

function isIncognito() {
  return new Promise((resolve) => {
    if (!chrome?.extension?.inIncognitoContext) { resolve(false); return; }
    resolve(chrome.extension.inIncognitoContext);
  });
}

async function init() {
  window.__dumplyReady = (async () => {
    try {
      // Google 로그인 복귀 처리 — 상태를 읽기 전에 세션부터 세워야
      // 온보딩이 이미 로그인된 상태로 렌더된다.
      if (typeof DumplyAccount !== 'undefined' && DumplyAccount.completeOAuthRedirect) {
        const r = await DumplyAccount.completeOAuthRedirect().catch(() => null);
        if (r?.error) console.warn('[Dumply] Google 로그인 실패:', r.error);
      }
      state = await AlfredoStorage.load();
      if (!state.ui) {
        state.ui = { ...AlfredoStorage.DEFAULT_STATE.ui };
      }
      AlfredoI18n.init(state.settings.language);
      document.documentElement.lang = AlfredoI18n.lang();
      applyTheme?.();
      if (state.dumpDraft) {
        const dumpEl = $('#dump-input');
        if (dumpEl) dumpEl.value = state.dumpDraft;
      }

      bindEvents();

      // 시크릿 모드에서는 세션 종료 시 데이터가 삭제됨을 안내
      if (await isIncognito()) {
        toast(AlfredoI18n.lang() === 'en'
          ? 'Incognito mode — data will be lost when the window closes 🕵️'
          : '시크릿 모드 — 창 닫으면 데이터가 사라져요 🕵️');
      }

      if (!state.onboarded) {
        showOnboarding();
      } else {
        showApp();
        // PWA 앱 바로가기(app.webmanifest shortcuts) — ?tab=dump|dashboard로 진입 탭 지정
        const wanted = new URLSearchParams(location.search).get('tab');
        if (wanted === 'dump' || wanted === 'dashboard') switchTab?.(wanted);
        // 기기 간 동기화 — 원격을 받아 병합하고, 창 복귀·온라인 복귀 때마다 다시 당겨온다
        // (?. 는 미선언 식별자를 막지 못한다 — 스크립트 로드 실패까지 견디도록 typeof 가드)
        if (typeof DumplySync !== 'undefined') {
          DumplySync.init().catch((e) => console.warn('[Dumply] sync init:', e?.message || e));
        }
        if (state.settings.calendar.connected) {
          syncCalendarIfConnected?.();
        }
      }
    } catch (err) {
      console.error('[Dumply] 초기화 실패:', err);
      try {
        if (!state) state = structuredClone(AlfredoStorage.DEFAULT_STATE);
        showOnboarding();
      } catch { /* last resort */ }
      toast(AlfredoI18n.lang() === 'en' ? 'Load failed — please refresh 🔄' : '불러오기 실패 — 새로고침 해주세요 🔄');
    }
  })();
  await window.__dumplyReady;
}

document.addEventListener('DOMContentLoaded', init);
