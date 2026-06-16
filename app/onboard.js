/* 온보딩 */

'use strict';

function showOnboarding() {
  $('#onboarding').hidden = false;
  $('#app').hidden = true;
  renderOnboardStep();
}

function showApp() {
  $('#onboarding').hidden = true;
  $('#app').hidden = false;
  // 온보딩 중 열렸을 수 있는 캘린더 선택 시트 닫기
  const calSheet = $('#cal-select-sheet');
  if (calSheet) calSheet.hidden = true;
  if (!state.ui) state.ui = { route: 'home', navExpanded: false, projectId: null, calendarMonth: null, calendarSelectedDay: null };
  syncRoutes?.();
  renderAll();
}

function onboardLearnPercent() {
  let pct = 0;
  if (state.settings.calendar?.connected) pct += 12;
  return pct;
}

function renderObLearnGauge() {
  const pct = onboardLearnPercent();
  const wrap = document.createElement('div');
  wrap.className = `onboard-learn${pct > 0 ? ' is-connected' : ''}`;
  const track = document.createElement('div');
  track.className = 'onboard-learn-track';
  const fill = document.createElement('div');
  fill.className = 'onboard-learn-fill';
  fill.style.width = `${pct}%`;
  track.append(fill);
  wrap.append(track);
  if (pct > 0) {
    const meta = document.createElement('p');
    meta.className = 'onboard-learn-meta';
    meta.textContent = t('ob.learn.meta', pct);
    wrap.append(meta);
  }
  return wrap;
}


async function startWithGoogleFromWelcome() {
  const btn = $('#ob-welcome-google');
  if (btn) { btn.disabled = true; btn.textContent = t('ob.welcome.connecting'); }

  const ok = await connectGoogleAccount();

  if (btn) { btn.disabled = false; btn.textContent = t('ob.welcome.google'); }

  if (!ok) {
    // 로그인 실패 시 welcome 화면에 머뭄
    return;
  }

  // 로그인 성공: Google 이름으로 닉네임 자동 설정 후 calendar 단계로 점프
  const googleName = state.settings.googleAccount?.name;
  if (googleName && !state.settings.userName) {
    state.settings.userName = googleName.split(' ')[0];
  }
  onboardStep = ONBOARD_STEPS.indexOf('calendar');
  if (onboardStep < 0) onboardStep = 1;
  renderOnboardStep();
  await persist();
}

function startAsGuestFromWelcome() {
  onboardStep++;
  renderOnboardStep();
}

async function connectCalendarFromOb() {
  const ok = await connectGoogleAccount();
  if (ok) {
    renderOnboardStep();
    // openCalSelectSheet는 connectGoogleAccount 내부에서 호출됨
  }
}

async function setupWeatherFromLocation() {
  await enableDeviceLocation();
}

async function requestNotifications() {
  // chrome.notifications는 manifest "notifications" 권한으로 항상 사용 가능
  // 웹 Notification API는 사이드패널 컨텍스트에서 동작하지 않으므로 chrome.notifications 기준으로 판단
  const btn = $('#ob-notify');
  if (chrome?.notifications) {
    state.settings.notificationsEnabled = true;
    if (btn) { btn.disabled = true; btn.textContent = t('ob.notify.done'); }
    await persist();
    toast(t('toast.notify.set'));
    return;
  }
  toast(t('toast.notify.unsupported'));
}

function renderOnboardStep() {
  const step = ONBOARD_STEPS[onboardStep];

  const dots = $('#onboard-dots');
  dots.replaceChildren();
  ONBOARD_STEPS.forEach((_, i) => {
    const d = document.createElement('span');
    d.className = `page-dot ${i === onboardStep ? 'is-active' : ''}`;
    dots.append(d);
  });

  const body = $('#onboard-body');
  body.replaceChildren();
  const bodyClass = ['onboard-body'];
  if (step === 'welcome') bodyClass.push('onboard-body-welcome');
  if (step === 'calendar') bodyClass.push('onboard-body-calendar');
  if (step === 'location') bodyClass.push('onboard-body-location');
  body.className = bodyClass.join(' ');
  const name = state.settings.userName || '';

  const footer = $('#onboard-footer');
  const isWelcome = step === 'welcome';
  if (footer) footer.classList.toggle('is-welcome', isWelcome);

  if (step === 'welcome') {
    const title = document.createElement('h1');
    title.className = 'onboard-title onboard-title-welcome';
    title.append('Simply organize', document.createElement('br'), 'with Dumply');
    body.append(title);
    const actions = document.createElement('div');
    actions.className = 'onboard-welcome-actions';
    const googleBtn = document.createElement('button');
    googleBtn.type = 'button';
    googleBtn.id = 'ob-welcome-google';
    googleBtn.className = 'btn btn-primary btn-block';
    googleBtn.textContent = t('ob.welcome.google');
    googleBtn.addEventListener('click', startWithGoogleFromWelcome);
    const guestBtn = document.createElement('button');
    guestBtn.type = 'button';
    guestBtn.id = 'ob-welcome-guest';
    guestBtn.className = 'link-btn onboard-guest-link';
    guestBtn.textContent = t('ob.welcome.guest');
    guestBtn.addEventListener('click', startAsGuestFromWelcome);
    actions.append(googleBtn, guestBtn);
    // 라이트 캐릭터 + 다크 테마용 변형 — CSS가 data-theme에 따라 토글
    const illo = onboardIllustration('inspector-hi-285', { single: true });
    illo.querySelector('.onboard-illustration-img')?.classList.add('onboard-illustration-img-light');
    const darkImg = document.createElement('img');
    darkImg.className = 'onboard-illustration-img onboard-illustration-img-dark';
    darkImg.src = `${OB_ILLUSTRATION_BASE}/inspector-hi-296-dark.webp`;
    darkImg.alt = '';
    darkImg.loading = 'lazy';
    darkImg.decoding = 'async';
    illo.append(darkImg);
    body.append(actions, illo);
  } else if (step === 'nickname') {
    body.append(
      el('h1', 'onboard-title', t('ob.nickname.title')),
      el('p', 'onboard-desc', t('ob.nickname.desc')),
      fieldInput('ob-nickname', t('ob.nickname.label'), t('ob.nickname.placeholder'), name),
    );
  } else if (step === 'calendar') {
    body.append(
      el('h1', 'onboard-title', t('ob.calendar.title')),
      el('p', 'onboard-desc onboard-desc-sub', t('ob.calendar.desc')),
      renderObLearnGauge(),
      onboardConnectCard(t('ob.calendar.google'), t('ob.calendar.google.sub'), 'ob-cal-connect'),
      onboardSoonCard('✉️', 'Email', t('ob.calendar.email.sub')),
      onboardSoonCard('💬', 'Slack / Messenger', t('ob.calendar.slack.sub')),
      fieldHint(t('ob.calendar.hint')),
    );
    const cals = state.settings.calendar.calendars || [];
    if (cals.length) {
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-secondary btn-block';
      editBtn.textContent = t('ob.calendar.selected', cals.filter(c => c.selected).length);
      editBtn.addEventListener('click', openCalSelectSheet);
      body.append(editBtn);
    }
    $('#ob-cal-connect')?.addEventListener('click', connectCalendarFromOb);
  } else if (step === 'api') {
    body.append(
      el('h1', 'onboard-title', t('ob.api.title')),
      el('p', 'onboard-desc', t('ob.api.desc')),
      apiSubscriptionNotice(),
      fieldSelect('ob-provider', t('ob.api.provider'), [
        { v: 'anthropic', l: 'Claude (Anthropic)', sel: state.settings.aiProvider === 'anthropic' },
        { v: 'openai', l: 'OpenAI', sel: state.settings.aiProvider === 'openai' },
        { v: 'gemini', l: 'Gemini (Google)', sel: state.settings.aiProvider === 'gemini' },
      ]),
      fieldInput('ob-key-anthropic', t('ob.api.key.anthropic'), 'sk-ant-...', '', 'password'),
      fieldHintLink(t('ob.api.hint.anthropic'), 'https://console.anthropic.com/settings/keys', t('ob.api.hint.link')),
      fieldInput('ob-key-openai', t('ob.api.key.openai'), 'sk-...', '', 'password'),
      fieldHintLink(t('ob.api.hint.openai'), 'https://platform.openai.com/api-keys', t('ob.api.hint.link')),
      fieldInput('ob-key-google', t('ob.api.key.google'), 'AIza...', '', 'password'),
      fieldHintLink(t('ob.api.hint.google'), 'https://aistudio.google.com/apikey', t('ob.api.hint.link')),
    );
  } else if (step === 'location') {
    body.append(
      el('h1', 'onboard-title', t('ob.location.title')),
      el('p', 'onboard-desc onboard-desc-tight', t('ob.location.desc')),
      el('p', 'onboard-desc onboard-desc-sub', t('ob.location.sub')),
    );
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'ob-location';
    btn.className = 'btn btn-primary btn-block';
    btn.textContent = t('ob.location.btn');
    btn.addEventListener('click', setupWeatherFromLocation);
    body.append(btn);
  } else if (step === 'notifications') {
    body.append(
      el('h1', 'onboard-title', t('ob.notify.title')),
      el('p', 'onboard-desc', t('ob.notify.desc')),
    );
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'ob-notify';
    btn.className = 'btn btn-primary btn-block';
    btn.textContent = t('ob.notify.btn');
    btn.addEventListener('click', requestNotifications);
    body.append(btn);
  }

  const backBtn = $('#onboard-back');
  if (backBtn) backBtn.hidden = onboardStep === 0;

  const nextBtn = $('#onboard-next');
  const skipBtn = $('#onboard-skip');
  const dotsEl = $('#onboard-dots');
  if (nextBtn) nextBtn.hidden = isWelcome;
  if (skipBtn) skipBtn.hidden = isWelcome || step === 'nickname';
  if (dotsEl) dotsEl.hidden = isWelcome;

  if (nextBtn) nextBtn.textContent = onboardStep === ONBOARD_STEPS.length - 1 ? t('ob.start') : t('ob.next');
}

function saveOnboardStepInput() {
  const step = ONBOARD_STEPS[onboardStep];
  if (step === 'nickname') {
    const nick = ($('#ob-nickname')?.value || '').trim();
    if (nick) state.settings.userName = nick;
  }
  if (step === 'api') {
    const a = $('#ob-key-anthropic')?.value.trim();
    const o = $('#ob-key-openai')?.value.trim();
    const g = $('#ob-key-google')?.value.trim();
    if (a) state.settings.apiKeys.anthropic = a;
    if (o) state.settings.apiKeys.openai = o;
    if (g) state.settings.apiKeys.google = g;
    state.settings.aiProvider = $('#ob-provider')?.value || 'anthropic';
  }
}

async function goBackOnboarding() {
  if (onboardStep <= 0) return;
  saveOnboardStepInput();
  onboardStep--;
  renderOnboardStep();
  await persist();
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text) n.textContent = text;
  return n;
}

function fieldInput(id, label, placeholder, value, type = 'text') {
  const wrap = document.createElement('label');
  wrap.className = 'field';
  const lbl = document.createElement('span');
  lbl.className = 'field-label';
  lbl.textContent = label;
  const inp = document.createElement('input');
  inp.id = id;
  inp.type = type;
  inp.placeholder = placeholder;
  inp.value = value;
  inp.autocomplete = 'off';
  wrap.append(lbl, inp);
  return wrap;
}

function fieldHint(text) {
  const p = document.createElement('p');
  p.className = 'field-hint';
  p.textContent = text;
  return p;
}

function fieldHintLink(text, url, linkLabel) {
  const p = document.createElement('p');
  p.className = 'field-hint';
  p.textContent = `${text} · `;
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = linkLabel;
  p.append(a);
  return p;
}

function apiSubscriptionNotice() {
  const notice = document.createElement('div');
  notice.className = 'api-notice';
  const p = document.createElement('p');
  p.textContent = t('ob.api.notice');
  const disclosure = document.createElement('p');
  disclosure.className = 'api-notice-disclosure';
  disclosure.textContent = t('ob.api.disclosure');
  notice.append(p, disclosure);
  return notice;
}

function fieldSelect(id, label, options) {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const lbl = document.createElement('span');
  lbl.className = 'field-label';
  lbl.textContent = label;
  const sel = document.createElement('select');
  sel.id = id;
  options.forEach((o) => {
    const opt = document.createElement('option');
    opt.value = o.v;
    opt.textContent = o.l;
    if (o.sel) opt.selected = true;
    sel.append(opt);
  });
  wrap.append(lbl, sel);
  return wrap;
}

function onboardConnectCard(title, sub, actionId) {
  const card = document.createElement('div');
  card.className = 'onboard-card onboard-card--connect';
  const ic = document.createElement('span');
  ic.className = 'card-icon card-icon-gcal';
  ic.setAttribute('aria-hidden', 'true');
  const body = document.createElement('div');
  body.className = 'card-body';
  const t = document.createElement('div');
  t.className = 'card-title';
  t.textContent = title;
  const s = document.createElement('div');
  s.className = 'card-sub';
  s.textContent = sub;
  body.append(t, s);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'onboard-card-add';
  btn.id = actionId;
  btn.textContent = '+';
  btn.setAttribute('aria-label', t('ob.aria.connect'));
  card.append(ic, body, btn);
  return card;
}

function onboardSoonCard(icon, title, sub) {
  const card = document.createElement('div');
  card.className = 'onboard-card onboard-card--soon';
  const ic = document.createElement('span');
  ic.className = 'card-icon';
  ic.textContent = icon;
  const body = document.createElement('div');
  body.className = 'card-body';
  const t = document.createElement('div');
  t.className = 'card-title';
  t.textContent = title;
  const s = document.createElement('div');
  s.className = 'card-sub';
  s.textContent = sub;
  body.append(t, s);
  const st = document.createElement('span');
  st.className = 'card-action';
  st.textContent = 'Coming soon';
  card.append(ic, body, st);
  return card;
}

function onboardCard(icon, title, sub, actionText, actionId, statusText) {
  const card = document.createElement('div');
  card.className = 'onboard-card';
  const ic = document.createElement('span');
  ic.className = 'card-icon';
  ic.textContent = icon;
  const body = document.createElement('div');
  body.className = 'card-body';
  const t = document.createElement('div');
  t.className = 'card-title';
  t.textContent = title;
  const s = document.createElement('div');
  s.className = 'card-sub';
  s.textContent = sub;
  body.append(t, s);
  card.append(ic, body);
  if (actionId) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-secondary btn-sm';
    btn.id = actionId;
    btn.textContent = actionText;
    card.append(btn);
  } else if (statusText) {
    const st = document.createElement('span');
    st.className = 'card-action';
    st.textContent = statusText;
    card.append(st);
  }
  return card;
}

async function advanceOnboarding() {
  const step = ONBOARD_STEPS[onboardStep];
  if (step === 'nickname') {
    const nick = ($('#ob-nickname')?.value || '').trim();
    if (!nick) { toast(t('ob.nickname.required')); return; }
    state.settings.userName = nick;
  } else {
    saveOnboardStepInput();
  }

  if (onboardStep < ONBOARD_STEPS.length - 1) {
    onboardStep++;
    renderOnboardStep();
    await persist();
    return;
  }

  state.onboarded = true;
  await persist();
  if (state.settings.calendar.connected) {
    try {
      state = await AlfredoCalendar.sync(state);
      await persist();
    } catch { /* ignore */ }
  }
  showApp();
}

function skipOnboarding() {
  if (ONBOARD_STEPS[onboardStep] === 'welcome' || ONBOARD_STEPS[onboardStep] === 'nickname') return;
  onboardStep++;
  if (onboardStep >= ONBOARD_STEPS.length) {
    state.onboarded = true;
    persist().then(showApp);
  } else {
    renderOnboardStep();
  }
}
