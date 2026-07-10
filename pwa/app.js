/* Dumply PWA 셸 — 데모 동작: 테마 토글, 제안 승인(점선→실선), 완료 체크,
   무대 접기, 오프라인 배너, SW 등록, 컨텍스추얼 설치 유도 스텁 */
(() => {
  const $ = (s, el = document) => el.querySelector(s);

  /* 시간대 인사 (Notion 17 / Asana 03) */
  const h = new Date().getHours();
  $('#greeting').textContent =
    h < 5 ? '늦은 밤이에요' : h < 12 ? '좋은 아침이에요' : h < 18 ? '좋은 오후예요' : '좋은 저녁이에요';

  /* 테마 토글 — data-theme가 OS 설정을 이김 (양방향) */
  const root = document.documentElement;
  const applyTheme = t => {
    if (t) root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
    localStorage.setItem('dumply-theme', t || '');
  };
  const cycle = () => {
    const cur = root.getAttribute('data-theme') || '';
    applyTheme(cur === '' ? 'dark' : cur === 'dark' ? 'light' : '');
  };
  $('#theme-toggle-d')?.addEventListener('click', cycle);
  $('#theme-toggle-m')?.addEventListener('click', cycle);

  /* 알프레도 무대 접기 (Finch 26의 산만함 교훈) */
  const stage = $('#stage'), fold = $('#stage-fold');
  fold.addEventListener('click', () => {
    const folded = stage.classList.toggle('is-folded');
    fold.textContent = folded ? '펼치기' : '접기';
    fold.setAttribute('aria-expanded', String(!folded));
  });

  /* 제안 승인: 점선 → 실선 전환 후 MoSCoW 보드로 이동 (Motion 11 · Reclaim 14) */
  const sugWrap = $('#suggestions');
  const updateState = () => {
    const n = sugWrap.querySelectorAll('.is-suggestion').length;
    $('#sug-count').textContent = n;
    const open = document.querySelectorAll('.card:not(.is-done)').length;
    $('#empty-state').hidden = open > 0;
    if (open === 0) {
      $('#stage-img').src = './assets/alfredo/celebrating.svg';
      $('#stage-line').textContent = '사건 전부 종결! 오늘의 수사는 끝났어요.';
      maybePromptInstall();
    } else if (n === 0) {
      $('#stage-img').src = './assets/alfredo/idle.svg';
      $('#stage-line').textContent = '제안 검토 완료! 이제 보드에 집중하세요.';
    }
  };
  sugWrap.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const card = btn.closest('.card');
    if (btn.dataset.act === 'accept') {
      card.classList.remove('is-suggestion');           // 점선 → 실선 (스프링 전환은 CSS)
      card.querySelector('.card-actions').remove();
      const isMust = !!card.querySelector('.tag-must');
      $(isMust ? '#board-must' : '#board-should').appendChild(card);
    } else {
      card.style.opacity = '0';
      setTimeout(() => { card.remove(); updateState(); }, 200);
      return;
    }
    updateState();
  });

  /* 완료 체크 (낙관적 UI — Superhuman 19) */
  document.addEventListener('click', e => {
    const check = e.target.closest('.check');
    if (!check) return;
    check.closest('.card').classList.toggle('is-done');
    updateState();
  });

  /* 오프라인 배너 — 알프레도가 안내 */
  const setOffline = () => document.body.classList.toggle('is-offline', !navigator.onLine);
  addEventListener('online', setOffline);
  addEventListener('offline', setOffline);
  setOffline();

  /* 컨텍스추얼 설치 유도: 프롬프트를 잡아뒀다가 '사건 종결' 순간에만 노출 (web.dev) */
  let deferredPrompt = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });
  const maybePromptInstall = () => {
    if (!deferredPrompt || localStorage.getItem('dumply-install-shown')) return;
    localStorage.setItem('dumply-install-shown', '1');
    const empty = $('#empty-state');
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.type = 'button';
    btn.style.marginTop = 'var(--sp-3)';
    btn.textContent = '홈 화면에 알프레도 사무소 차리기';
    btn.addEventListener('click', async () => { await deferredPrompt.prompt(); deferredPrompt = null; btn.remove(); });
    empty.appendChild(btn);
  };

  /* 서비스 워커: 앱 셸 cache-first */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  $('#dump-cta').addEventListener('click', () => {
    /* 데모 셸: 실제 앱에서는 컴포즈 시트 오픈 */
    alert('컴포즈 시트 자리 — 자연어 퀵애드(Todoist 01)가 여기 붙습니다.');
  });
})();
