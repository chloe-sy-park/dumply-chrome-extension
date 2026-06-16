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
