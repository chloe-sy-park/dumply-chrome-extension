/* 사이드 네비게이션 · 라우팅 */

'use strict';

const NAV_ROUTES = ['home', 'calendar', 'projects', 'project-detail', 'settings', 'credits', 'byok'];

function syncNavRail() {
  const rail = $('#nav-rail');
  if (!rail || !state?.ui) return;
  mountNavRail();
  const expanded = Boolean(state?.ui?.navExpanded);
  rail.classList.toggle('is-expanded', expanded);
  const toggle = $('#btn-nav-toggle');
  if (toggle) {
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.title = expanded ? t('nav.toggle.collapse') : t('nav.toggle.expand');
    toggle.setAttribute('aria-label', expanded ? t('nav.toggle.collapse') : t('nav.toggle.expand'));
  }

  $$('[data-nav]').forEach((btn) => {
    const target = btn.dataset.nav;
    let active = false;
    if (target === 'home') active = state.ui.route === 'home';
    else if (target === 'calendar') active = state.ui.route === 'calendar';
    else if (target === 'projects') active = state.ui.route === 'projects' || state.ui.route === 'project-detail';
    else if (target === 'settings') active = state.ui.route === 'settings' || state.ui.route === 'credits' || state.ui.route === 'byok';
    btn.classList.toggle('is-active', active);
  });
}

function syncRoutes() {
  if (!state?.ui) return;
  const valid = ['home', 'calendar', 'projects', 'project-detail', 'settings', 'credits', 'byok'];
  let route = state.ui.route || 'home';
  if (!valid.includes(route)) {
    route = 'home';
    state.ui.route = 'home';
  }
  // Detach nav rail before hiding current route — prevents aria-hidden focus warning
  // that fires when display:none is applied to a container with a focused descendant.
  detachNavRail();
  $$('.app-route').forEach((el) => {
    el.classList.toggle('is-active', el.id === `route-${route}`);
  });
  $$('.home-only').forEach((el) => {
    el.classList.toggle('is-hidden', route !== 'home');
  });
  if (route !== 'home' && typeof window.__resetHeaderMini === 'function') window.__resetHeaderMini();
  syncNavRail();
}

function navigateTo(route, opts = {}) {
  if (!NAV_ROUTES.includes(route)) return;
  if (route === 'project-detail' && !opts.projectId && !state.ui.projectId) return;

  if (opts.projectId) state.ui.projectId = opts.projectId;
  if (route !== 'project-detail' && route !== 'projects') state.ui.projectId = null;

  state.ui.route = route;
  syncRoutes();
  renderCurrentRoute();
  persist();
}

function renderCurrentRoute() {
  if (typeof applyI18n === 'function') applyI18n(document);
  if (typeof updateNotifDot === 'function') updateNotifDot();
  const route = state?.ui?.route || 'home';
  if (route === 'home') {
    renderHeader();
    renderLiveTags($('#dump-input')?.value || state.dumpDraft || '');
    renderInbox();
    renderMoscow();
    if ($('#view-dashboard')?.classList.contains('is-active')) renderDashboard();
  } else if (route === 'calendar') {
    renderCalendarView();
  } else if (route === 'projects') {
    renderProjectsList();
  } else if (route === 'project-detail') {
    renderProjectDetail(state.ui.projectId);
  } else if (route === 'settings' || route === 'byok') {
    refreshSettingsForm();
  } else if (route === 'credits') {
    renderCreditsPage();
  }
  mountNavRail();
}

// ── 드로어 (사이드패널 전용 — fullpage는 고정 사이드바 유지) ──
function openNavDrawer() {
  $('#nav-drawer-dim')?.classList.add('open');
  syncNavRail();
}

function closeNavDrawer() {
  $('#nav-drawer-dim')?.classList.remove('open');
}

function bindNavEvents() {
  // 구 레일 토글 (fullpage 사이드바용으로 잔존)
  $('#btn-nav-toggle')?.addEventListener('click', async () => {
    state.ui.navExpanded = !state.ui.navExpanded;
    syncNavRail();
    await persist();
  });

  $('#btn-drawer-open')?.addEventListener('click', openNavDrawer);
  $('#btn-drawer-close')?.addEventListener('click', closeNavDrawer);
  $('#nav-drawer-dim')?.addEventListener('click', (e) => {
    if (e.target === $('#nav-drawer-dim')) closeNavDrawer();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('#nav-drawer-dim')?.classList.contains('open')) closeNavDrawer();
  });

  $$('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const target = btn.dataset.nav;
      if (target === 'home') navigateTo('home');
      else if (target === 'calendar') navigateTo('calendar');
      else if (target === 'projects') navigateTo('projects');
      else if (target === 'settings') navigateTo('settings');
      closeNavDrawer();
      // 페이지 이동 후 펼쳐진 (fullpage) 레일 메뉴는 자동으로 닫는다
      if (state?.ui?.navExpanded) {
        state.ui.navExpanded = false;
        syncNavRail();
        await persist();
      }
    });
  });

  document.addEventListener('click', async (e) => {
    if (!state?.ui?.navExpanded) return;
    if (e.target.closest('#nav-rail')) return;
    state.ui.navExpanded = false;
    syncNavRail();
    await persist();
  });

  // ── 공통 헤더: 스크롤 축소 — 인사말이 크롬 바로 올라와 한 줄 (60px 진입 / 40px 복귀) ──
  const content = document.querySelector('#route-home .content') || document.querySelector('.content');
  const dash = document.querySelector('.dash-header');
  const chrome = document.querySelector('.app-chrome');
  const chromeTitle = $('#chrome-title');
  const setHeaderMini = (mini) => {
    dash?.classList.toggle('mini', mini);
    chrome?.classList.toggle('mini', mini);
    if (mini && chromeTitle) chromeTitle.textContent = $('#hdr-greeting')?.textContent || '';
  };
  if (content && dash) {
    content.addEventListener('scroll', () => {
      const y = content.scrollTop;
      if (!dash.classList.contains('mini') && y > 60) setHeaderMini(true);
      else if (dash.classList.contains('mini') && y < 40) setHeaderMini(false);
    }, { passive: true });
  }
  // 홈 밖으로 이동하면 축소 상태 해제
  window.__resetHeaderMini = () => setHeaderMini(false);
}
