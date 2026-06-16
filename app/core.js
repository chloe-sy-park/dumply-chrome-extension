/* 공통 상태 · 유틸 */

'use strict';

const BUCKETS = [
  { key: 'must', label: 'Must', get sub() { return t('bucket.must.sub'); } },
  { key: 'should', label: 'Should', get sub() { return t('bucket.should.sub'); } },
  { key: 'could', label: 'Could', get sub() { return t('bucket.could.sub'); } },
  { key: 'wont', label: "Won't", get sub() { return t('bucket.wont.sub'); } },
];

function refreshCalendarIfActive() {
  if (state?.ui?.route === 'calendar') renderCalendarView?.();
}

function applyUiLabels() {
  [
    ['#btn-add-task', t('ui.add.task')],
    ['#btn-add-event', t('ui.add.event')],
  ].forEach(([sel, label]) => {
    const el = $(sel);
    if (!el) return;
    el.setAttribute('aria-label', label);
    el.title = label;
  });
}

const ONBOARD_STEPS = ['welcome', 'nickname', 'calendar', 'api', 'location', 'notifications'];

const OB_ILLUSTRATION_BASE = 'src/assets/illustration';

function onboardIllustration(name, { single = false } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'onboard-illustration';
  const img = document.createElement('img');
  img.className = 'onboard-illustration-img';
  if (single) {
    img.src = `${OB_ILLUSTRATION_BASE}/${name}.webp`;
  } else {
    img.src = `${OB_ILLUSTRATION_BASE}/${name}-2x.webp`;
    img.srcset =
      `${OB_ILLUSTRATION_BASE}/${name}-1x.webp 1x, ` +
      `${OB_ILLUSTRATION_BASE}/${name}-2x.webp 2x, ` +
      `${OB_ILLUSTRATION_BASE}/${name}-3x.webp 3x`;
  }
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  wrap.append(img);
  return wrap;
}

const EXAMPLE_TEXT =
  "Coffee first... didn't sleep great last night. Team slides due today, dentist at 2pm. Need to pack for tomorrow's flight. Oh and I have to get mom's birthday gift.";

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

let state = null;
let weatherCache = null;
let onboardStep = 0;
let aiMoscowState = { answers: [], question: '' };
let dragItem = null;
let tlDragId = null;
let suggestTimer = null;
let suggestRunning = false;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function createRouteTopbar(label, onNavigate) {
  const bar = document.createElement('div');
  bar.className = 'route-topbar';
  const link = document.createElement('button');
  link.type = 'button';
  link.className = 'route-home-link';
  link.textContent = label;
  link.addEventListener('click', onNavigate);
  bar.append(link);
  // fullpage 모드에서는 nav-rail이 고정 사이드바이므로 anchor 불필요
  if (!document.body.classList.contains('surface-fullpage')) {
    const anchor = document.createElement('div');
    anchor.className = 'nav-rail-anchor';
    bar.append(anchor);
  }
  return bar;
}

function detachNavRail() {
  const rail = $('#nav-rail');
  const sheet = document.querySelector('.app-sheet');
  if (!rail || !sheet || rail.parentElement === sheet) return;
  sheet.insertBefore(rail, sheet.firstChild);
}

function mountNavRail() {
  const rail = $('#nav-rail');
  if (!rail) return;
  const anchor = document.querySelector('.app-route.is-active .nav-rail-anchor');
  if (anchor && rail.parentElement !== anchor) anchor.append(rail);
}

function createRouteHomeLink() {
  return createRouteTopbar(t('nav.back.main'), () => {
    if (typeof navigateTo === 'function') navigateTo('home');
  });
}

/** CSS 토큰 읽기 (canvas 등 JS 렌더용) */
function cssToken(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

let toastTimer = null;
function toast(msg, opts = {}) {
  const el = $('#toast');
  el.replaceChildren();
  const text = document.createElement('span');
  text.className = 'toast-text';
  text.textContent = msg;
  el.append(text);

  const hasAction = opts.actionLabel && typeof opts.onAction === 'function';
  if (hasAction) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action';
    btn.textContent = opts.actionLabel;
    btn.addEventListener('click', () => {
      clearTimeout(toastTimer);
      el.hidden = true;
      opts.onAction();
    });
    el.append(btn);
  }

  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, opts.duration || (hasAction ? 5000 : 2400));
}

/**
 * 삭제 등 되돌릴 수 있는 동작의 복원 스택.
 * 연속 삭제 시에도 각 건을 LIFO로 되돌릴 수 있고, Ctrl/Cmd+Z로도 동작한다.
 */
const undoStack = [];

function toastUndo(msg, restore) {
  if (typeof restore !== 'function') { toast(msg); return; }
  undoStack.push(restore);
  if (undoStack.length > 20) undoStack.shift();
  toast(msg, { actionLabel: t('undo.action'), duration: 5000, onAction: performUndo });
}

async function performUndo() {
  const restore = undoStack.pop();
  if (typeof restore !== 'function') { toast(t('undo.empty')); return; }
  restore();
  await persist();
  renderAll();
  toast(t('undo.done'));
}

/* ── 시트 접근성: Esc 닫기 · 포커스 트랩 · 포커스 복원 ── */
const A11Y_FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SHEET_CLOSERS = {
  'detail-sheet': () => closeDetail?.(),
  'cal-band-sheet': () => closeCalBandSheet?.(),
  'cal-day-sheet': () => closeCalDaySheet?.(),
  'compose-sheet': () => closeCompose?.(),
  'proj-sheet': () => closeProjectSheet?.(),
  'ai-moscow-sheet': () => closeAiMoscow?.(),
};

let lastSheetTrigger = null;

function topmostSheet() {
  const open = [...document.querySelectorAll('.sheet:not([hidden])')];
  return open.length ? open[open.length - 1] : null;
}

function closeSheetById(id) {
  const closer = SHEET_CLOSERS[id];
  if (closer) closer();
  else { const el = document.getElementById(id); if (el) el.hidden = true; }
}

function visibleFocusables(root) {
  return [...root.querySelectorAll(A11Y_FOCUSABLE)].filter((el) => el.offsetParent !== null);
}

function focusFirstInSheet(sheet) {
  if (sheet.contains(document.activeElement)) return; // 의도적 포커스(예: 제목 입력) 유지
  const panel = sheet.querySelector('.sheet-panel') || sheet;
  const target = visibleFocusables(sheet)[0] || panel;
  if (target === panel && !panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
  try { target.focus({ preventScroll: true }); } catch { /* noop */ }
}

function trapSheetTab(e, sheet) {
  const items = visibleFocusables(sheet);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function initSheetA11y() {
  // 시트 밖 마지막 포커스/포인터 대상을 트리거로 기억 (닫을 때 복원)
  const remember = (e) => { if (!e.target.closest?.('.sheet')) lastSheetTrigger = e.target; };
  document.addEventListener('focusin', remember);
  document.addEventListener('pointerdown', remember, true);

  // 열림/닫힘 감시 → 포커스 이동/복원
  const obs = new MutationObserver((muts) => {
    muts.forEach((m) => {
      if (m.attributeName !== 'hidden') return;
      const sheet = m.target;
      if (!sheet.classList?.contains('sheet')) return;
      if (!sheet.hidden) {
        focusFirstInSheet(sheet);
      } else if (lastSheetTrigger && document.activeElement === document.body) {
        // 포커스가 실제로 유실된 경우에만 트리거로 복원 (다른 곳에서 이미 복원했으면 건드리지 않음)
        let target = lastSheetTrigger;
        if (!document.contains(target) && target.dataset?.date) {
          target = document.querySelector(`.cal-cell[data-date="${target.dataset.date}"]`);
        }
        if (target && document.contains(target)) {
          try { target.focus({ preventScroll: true }); } catch { /* noop */ }
        }
      }
    });
  });
  document.querySelectorAll('.sheet').forEach((s) => obs.observe(s, { attributes: true, attributeFilter: ['hidden'] }));

  document.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    const sheet = topmostSheet();
    if (e.key === 'Escape' && sheet) { e.preventDefault(); closeSheetById(sheet.id); return; }
    if (e.key === 'Tab' && sheet) { trapSheetTab(e, sheet); return; }
    // Ctrl/Cmd+Z 전역 실행취소 — 텍스트 입력 중에는 가로채지 않음
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
      const el = document.activeElement;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if (typing || !undoStack.length) return;
      e.preventDefault();
      performUndo();
    }
  });
}

async function persist() {
  await AlfredoStorage.save(state);
  scheduleAlarms();
}

function scheduleAlarms() {
  if (chrome?.runtime?.sendMessage) {
    chrome.runtime.sendMessage({
      type: 'RESCHEDULE_ALARMS',
      timeline: state.timeline,
      notificationsEnabled: state.settings.notificationsEnabled,
    }).catch(() => {});
  }
}

function findMemo(id) {
  return state.memos.find((m) => m.id === id);
}

function todayStr() {
  // 로컬 기준 YYYY-MM-DD — toISOString()(UTC)는 KST 등에서 하루 어긋남
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(`${todayStr()}T12:00:00`);
  const target = new Date(`${dateStr}T12:00:00`);
  return Math.ceil((target - today) / 86400000);
}

function defaultEventTime() {
  const now = new Date();
  const rounded = Math.ceil((now.getMinutes() + 1) / 30) * 30;
  now.setMinutes(rounded, 0, 0);
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function formatComposeDateLabel(dateStr) {
  if (!dateStr) return t('date.none');
  const today = todayStr();
  if (dateStr === today) return t('date.today');
  if (dateStr === addDays(today, 1)) return t('date.tomorrow');
  const [, mo, d] = dateStr.split('-').map(Number);
  if (AlfredoI18n.lang() === 'en') {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${MONTHS[mo - 1]} ${d}`;
  }
  return `${mo}월 ${d}일`;
}

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getWeekdayShort(dateStr) {
  const days = AlfredoI18n.lang() === 'en' ? WEEKDAYS_EN : WEEKDAYS;
  return days[new Date(`${dateStr}T12:00:00`).getDay()];
}

function thisWeekendDate(fromStr) {
  const d = new Date(`${fromStr}T12:00:00`);
  const day = d.getDay();
  if (day === 6) return fromStr;
  if (day === 0) return addDays(fromStr, 6);
  d.setDate(d.getDate() + (6 - day));
  return d.toISOString().slice(0, 10);
}

function nextMondayDate(fromStr) {
  const d = new Date(`${fromStr}T12:00:00`);
  const day = d.getDay();
  const add = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  d.setDate(d.getDate() + add);
  return d.toISOString().slice(0, 10);
}

function getComposeDatePresets(baseDate) {
  const today = baseDate || todayStr();
  const tomorrow = addDays(today, 1);
  const weekend = thisWeekendDate(today);
  const nextWeek = nextMondayDate(today);
  return [
    { key: 'today', label: t('date.today'), date: today, hint: getWeekdayShort(today) },
    { key: 'tomorrow', label: t('date.tomorrow'), date: tomorrow, hint: getWeekdayShort(tomorrow) },
    { key: 'weekend', label: t('date.preset.weekend'), date: weekend, hint: getWeekdayShort(weekend) },
    {
      key: 'nextweek',
      label: t('date.preset.nextweek'),
      date: nextWeek,
      hint: `${getWeekdayShort(nextWeek)} ${formatComposeDateLabel(nextWeek)}`,
    },
  ];
}

const COMPOSE_REMIND_OPTIONS = [
  { value: -1 },
  { value: 0 },
  { value: 10 },
  { value: 30 },
];

function formatRemindLabel(val) {
  if (val === -1) return t('remind.none');
  if (val === 0) return t('remind.atstart');
  return t('remind.before', val ?? 10);
}

function formatComposeDateWithWeekday(dateStr, hint) {
  if (!dateStr) return t('date.none');
  if (hint) return hint;
  return `${formatComposeDateLabel(dateStr)} (${getWeekdayShort(dateStr)})`;
}

function getBucketOrder(key) {
  if (!state.moscowOrder[key]) state.moscowOrder[key] = [];
  return state.moscowOrder[key];
}

function sortByOrder(items, key) {
  const order = getBucketOrder(key);
  return [...items].sort((a, b) => {
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    if (ai === -1 && bi === -1) return b.createdAt - a.createdAt;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function getProjectSectionOrder(projectId, section) {
  if (!state.projectTaskOrder) state.projectTaskOrder = {};
  if (!state.projectTaskOrder[projectId]) {
    state.projectTaskOrder[projectId] = { active: [], pending: [], done: [] };
  }
  if (!state.projectTaskOrder[projectId][section]) {
    state.projectTaskOrder[projectId][section] = [];
  }
  return state.projectTaskOrder[projectId][section];
}

function syncProjectTaskOrder(projectId, section, items) {
  const order = getProjectSectionOrder(projectId, section);
  items.forEach((m) => {
    if (!order.includes(m.id)) order.push(m.id);
  });
  for (let i = order.length - 1; i >= 0; i -= 1) {
    if (!items.some((m) => m.id === order[i])) order.splice(i, 1);
  }
}

function sortProjectSectionItems(items, projectId, section) {
  syncProjectTaskOrder(projectId, section, items);
  const order = getProjectSectionOrder(projectId, section);
  return [...items].sort((a, b) => {
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    if (ai === -1 && bi === -1) return b.createdAt - a.createdAt;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function applyProjectTaskSectionChange(memo, toSection) {
  if (toSection === 'active') {
    if (!memo.priority) memo.priority = 'should';
    memo.completed = false;
  } else if (toSection === 'pending') {
    memo.priority = null;
    memo.completed = false;
  } else if (toSection === 'done') {
    memo.completed = true;
  }
}

function getInboxMemos() {
  return state.memos
    .filter((m) => !m.completed && !m.priority && (!m.kind || m.kind === 'task'))
    .sort((a, b) => b.createdAt - a.createdAt);
}

function getFeelingMemos() {
  return state.memos
    .filter((m) => m.kind === 'feeling')
    .sort((a, b) => b.createdAt - a.createdAt);
}

function getPonderMemos() {
  return state.memos
    .filter((m) => m.kind === 'ponder' && !m.completed)
    .sort((a, b) => b.createdAt - a.createdAt);
}

function isValidBucket(key) {
  return BUCKETS.some((b) => b.key === key);
}

/** API 없을 때 Inbox MoSCoW 칩 추천 */
function suggestMoscowLocal(content, tags) {
  const t = String(content || '').trim();
  if (!t) return { priority: 'could', reason: '내용을 확인해주세요' };
  if (/(안\s?함|패스|취소|나중|skip|pass|won't|wont)/i.test(t)) {
    return { priority: 'wont', reason: '오늘은 미루기' };
  }
  // 휴식·여가는 할 일이 아니라 "여유 되면" — 피곤한 날에도 Must로 밀어올리지 않음
  if (/(넷플|유튜브|드라마|영화|게임|쉬기|휴식|쉬자|놀기)/i.test(t)
      || (tags || []).some((tag) => tag?.label === '휴식')) {
    return { priority: 'could', reason: '쉬는 건 여유롭게' };
  }
  if (/(오늘|지금|급|마감|제출|미팅|회의|데드라인|\d{1,2}\s*시|\d{1,2}:\d{2})/i.test(t)) {
    return { priority: 'must', reason: '오늘/시간 있음' };
  }
  if (/(예약|확인|전화|연락|치과|병원|신고|서류)/i.test(t)) {
    return { priority: 'should', reason: '해야 할 일' };
  }
  if (/(청소|정리|선물|쇼핑|운동|헬스)/i.test(t)) {
    return { priority: 'could', reason: '여유 있을 때' };
  }
  return { priority: 'should', reason: '일반 할 일' };
}

const LOW_ENERGY_LABELS = ['수면부족', '피로', '번아웃', '정신없음'];
const HIGH_STRESS_LABELS = ['스트레스', '불안', '짜증', '우울', '속상', '외로움', '싫증'];

/** Inbox 메모들의 감정/에너지 태그를 집계해 오늘 컨디션 신호를 반환 */
function computeEnergyState(memos) {
  let low = 0;
  let stress = 0;
  (memos || []).forEach((m) => {
    (m.tags || []).forEach((t) => {
      const label = typeof t === 'string' ? t : t?.label;
      if (LOW_ENERGY_LABELS.includes(label)) low += 1;
      if (HIGH_STRESS_LABELS.includes(label)) stress += 1;
    });
  });
  return { low, stress, strained: low >= 1 || stress >= 2 };
}

/** 오늘(또는 지난) 마감만 대시보드 우선순위에 포함 — Could/Won't·미래 날짜는 MoSCoW에서 */
function isMemoDueToday(m) {
  if (!m.deadline) return true;
  return m.deadline <= todayStr();
}

function getTopPriorities(limit) {
  const must = state.memos.filter((m) => !m.completed && m.priority === 'must' && isMemoDueToday(m));
  const should = state.memos.filter((m) => !m.completed && m.priority === 'should' && isMemoDueToday(m));
  return [...sortByOrder(must, 'must'), ...sortByOrder(should, 'should')].slice(0, limit);
}

function renderDateCalendar(container, opts) {
  const { selectedDate, calendarMonth, onMonthChange, onSelect } = opts;
  const monthStr = calendarMonth || selectedDate || todayStr();
  const [y, mo] = monthStr.slice(0, 7).split('-').map(Number);
  const first = new Date(y, mo - 1, 1);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, mo, 0).getDate();

  container.replaceChildren();

  const head = document.createElement('div');
  head.className = 'compose-cal-head';
  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'icon-btn-sm';
  prev.textContent = '‹';
  prev.addEventListener('click', (e) => {
    e.stopPropagation();
    const d = new Date(y, mo - 2, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
  });
  const title = document.createElement('span');
  title.className = 'compose-cal-title';
  title.textContent = `${mo}월 ${y}`;
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'icon-btn-sm';
  next.textContent = '›';
  next.addEventListener('click', (e) => {
    e.stopPropagation();
    const d = new Date(y, mo, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
  });
  head.append(prev, title, next);
  container.append(head);

  const weekdays = document.createElement('div');
  weekdays.className = 'compose-cal-weekdays';
  ['월', '화', '수', '목', '금', '토', '일'].forEach((w) => {
    const s = document.createElement('span');
    s.textContent = w;
    weekdays.append(s);
  });
  container.append(weekdays);

  const grid = document.createElement('div');
  grid.className = 'compose-cal-grid';
  for (let i = 0; i < startPad; i++) {
    const empty = document.createElement('span');
    empty.className = 'compose-cal-day is-empty';
    grid.append(empty);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'compose-cal-day';
    if (dateStr === selectedDate) btn.classList.add('is-selected');
    if (dateStr === todayStr()) btn.classList.add('is-today');
    btn.textContent = String(day);
    btn.addEventListener('click', () => onSelect(dateStr));
    grid.append(btn);
  }
  container.append(grid);
}

function fillDatePickerPopover(pop, opts) {
  const {
    label,
    selectedDate,
    calendarMonth,
    onSelect,
    onMonthChange,
    onClear,
    showClear,
  } = opts;
  pop.replaceChildren();

  const labelEl = document.createElement('p');
  labelEl.className = 'compose-pop-label';
  labelEl.textContent = label;
  pop.append(labelEl);

  const presets = document.createElement('div');
  presets.className = 'compose-date-presets';
  getComposeDatePresets(todayStr()).forEach((p) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `compose-preset${selectedDate === p.date ? ' is-selected' : ''}`;
    const left = document.createElement('span');
    left.textContent = p.label;
    const right = document.createElement('span');
    right.className = 'compose-preset-hint';
    right.textContent = p.hint;
    btn.append(left, right);
    btn.addEventListener('click', () => onSelect(p.date));
    presets.append(btn);
  });
  pop.append(presets);

  if (showClear) {
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'compose-pop-link';
    clearBtn.textContent = t('date.clear');
    clearBtn.addEventListener('click', onClear);
    pop.append(clearBtn);
  }

  const cal = document.createElement('div');
  cal.className = 'compose-cal';
  renderDateCalendar(cal, {
    selectedDate,
    calendarMonth,
    onMonthChange,
    onSelect,
  });
  pop.append(cal);
}

const TB_START_HOUR = 6;
const TB_END_HOUR = 24;
const TB_PX_PER_HOUR = 72;
const TB_SNAP_MIN = 15;

const DURATION_PRESETS = [
  { label: '15분', minutes: 15 },
  { label: '30분', minutes: 30 },
  { label: '45분', minutes: 45 },
  { label: '1시간', minutes: 60 },
  { label: '1.5시간', minutes: 90 },
  { label: '2시간', minutes: 120 },
];

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(totalMin) {
  const wrapped = ((totalMin % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addMinutesToTime(timeStr, mins) {
  return minutesToTime(timeToMinutes(timeStr) + mins);
}

function formatTimeLabel(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  if (AlfredoI18n.lang() === 'en') {
    const ap = h < 12 ? 'AM' : 'PM';
    return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
  }
  const ap = h < 12 ? '오전' : '오후';
  return m ? `${ap} ${h12}:${String(m).padStart(2, '0')}` : `${ap} ${h12}시`;
}

// 이 할 일을 막는 선행 작업(아직 미완료) — T.relatedId === m.id 이면 T가 m보다 먼저.
function taskBlocker(m) {
  if (!m?.id) return null;
  return (state.memos || []).find(
    (t) => !t.completed && (t.kind == null || t.kind === 'task') && t.relatedId === m.id,
  ) || null;
}

// "HH:MM"에 분을 더하거나 빼서 같은 형식으로 반환 (0~23:59 클램프)
function shiftTime(timeStr, deltaMin) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = Math.max(0, Math.min(24 * 60 - 1, h * 60 + m + deltaMin));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function formatTimeRange(startTime, durationMin) {
  if (!startTime || !durationMin) return '';
  return `${formatTimeLabel(startTime)} ~ ${formatTimeLabel(addMinutesToTime(startTime, durationMin))}`;
}

function formatDurationLabel(minutes) {
  if (!minutes) return t('duration.none');
  if (minutes < 60) return t('duration.min', minutes);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? t('duration.hourmin', h, m) : t('duration.hour', h);
}

function snapMinutes(min) {
  return Math.round(min / TB_SNAP_MIN) * TB_SNAP_MIN;
}

function getEventDuration(t) {
  return Number(t.duration) || 30;
}

function getEventEndMinutes(t) {
  if (t.allDay) return TB_END_HOUR * 60;
  return timeToMinutes(t.time || '00:00') + getEventDuration(t);
}

function emptyStep(text = '') {
  return { id: AlfredoStorage.uid(), text, durationMinutes: null, completed: false };
}

function normalizeSteps(steps) {
  if (!Array.isArray(steps)) return [];
  return steps.map((s) => ({
    id: s.id || AlfredoStorage.uid(),
    text: String(s.text || s.title || '').trim(),
    durationMinutes: s.durationMinutes ?? s.estimatedMinutes ?? null,
    completed: Boolean(s.completed ?? s.done),
  })).filter((s) => s.text || s.id);
}

function stepsTotalMinutes(steps) {
  const list = normalizeSteps(steps);
  if (!list.length) return null;
  const sum = list.reduce((a, s) => a + (Number(s.durationMinutes) || 0), 0);
  return sum || null;
}

/** ADHD — 시간을 타이트하게 잡는 경향 보정 (+50%, 15분 단위) */
function suggestDurationLocal(content) {
  const t = String(content || '').trim();
  let base = 30;
  if (/(미팅|회의|슬라이드|발표|보고서|프레젠|준비)/i.test(t)) base = 60;
  else if (/(청소|정리|이메일|전화|확인|예약)/i.test(t)) base = 20;
  else if (/(쇼핑|선물|짐|패킹|이동)/i.test(t)) base = 45;
  else if (/(공부|학습|리뷰|읽기)/i.test(t)) base = 45;
  const buffered = Math.ceil((base * 1.5) / TB_SNAP_MIN) * TB_SNAP_MIN;
  return { minutes: buffered, reason: '여유 50% 포함 추천' };
}

function computeDurationFromSchedule(startDate, startTime, deadline, deadlineTime) {
  if (!startTime || !deadlineTime) return null;
  const startDay = startDate || deadline;
  const endDay = deadline || startDate;
  if (!startDay || !endDay) return null;
  const start = new Date(`${startDay}T${startTime}:00`);
  const end = new Date(`${endDay}T${deadlineTime}:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
  const mins = Math.round((end - start) / 60000);
  return Math.max(TB_SNAP_MIN, snapMinutes(mins));
}

function memoTaskFields(extra = {}) {
  return {
    startDate: null,
    startTime: null,
    deadline: null,
    deadlineTime: null,
    durationMinutes: null,
    durationSource: null,
    projectId: null,
    steps: [],
    // MoSCoW 제안 추적 — 판단 로그(lib/decisions.js)가 참조
    suggestedPriority: null,
    suggestReason: null,
    suggestSource: null,
    suggestId: null,
    suggestedAt: null,
    reasonSeen: false,
    stepsSuggestion: null, // 쪼개기 AI 제안 스냅샷 { id, steps:[{text}], at }
    // 브레인덤프 추출 추적 — 판단 로그(dump_extract)가 참조
    parseRationale: null,
    parseReasonSeen: false,
    parseJudged: false,
    parseSnapshot: null,
    relatedHint: null, // 연결된 항목 title (예: "기린굴 방문") — 선행 준비 표시
    relatedId: null,
    relatedTime: null, // 연결된 일정의 시각 (마감 물림 표시용)
    stepsReason: null, // AI 쪼개기 근거 ("왜 이렇게 나눴는지")
    durationReason: null, // 소요시간 추정 근거 ("왜 이 시간인지")
    ...extra,
  };
}

function isGcalEvent(t) {
  return Boolean(t?.gcalEventId || t?.source === 'google' || t?.domain === 'calendar');
}

function getEventSourceLabel(t) {
  if (!isGcalEvent(t)) return null;
  const calName = t.gcalCalendarName || 'Google Calendar';
  return `📅 ${calName}에서 가져옴`;
}

function formatEventWithWhere(t) {
  const parts = [];
  if (t.with) parts.push(`👥 ${t.with}`);
  if (t.location) parts.push(`📍 ${t.location}`);
  return parts.join(' · ');
}

function getEventBlockDetailLines(t) {
  const duration = getEventDuration(t);
  const lines = [{ key: 'time', icon: '🕐', text: formatTimeRange(t.time, duration) }];
  if (t.with) lines.push({ key: 'with', icon: '👥', text: t.with });
  if (t.location) lines.push({ key: 'where', icon: '📍', text: t.location });
  if (isGcalEvent(t)) {
    lines.push({ key: 'source', icon: '📅', text: t.gcalCalendarName || 'Google Calendar' });
  }
  return lines.filter((l) => l.text);
}

function formatEventBlockCondensed(t) {
  return getEventBlockDetailLines(t)
    .map((l) => `${l.icon} ${l.text}`)
    .join(' · ');
}

function isEventHappeningNow(t, nowMin) {
  if (t.allDay || t.completed) return false;
  const start = timeToMinutes(t.time || '00:00');
  return nowMin >= start && nowMin < start + getEventDuration(t);
}

/** 타임블록 색상 — 출처·연결된 할 일(MoSCoW)·상태 */
function getTimeBlockClasses(t, nowMin) {
  const classes = ['tb-block'];
  if (t.isTask) {
    classes.push('tb-block-local', 'tb-block-task');
    if (t.priority === 'must') classes.push('tb-block-must');
    else if (t.priority === 'should') classes.push('tb-block-should');
    else if (t.priority === 'could') classes.push('tb-block-could');
  } else if (isGcalEvent(t)) {
    classes.push('tb-block-gcal');
  } else {
    classes.push('tb-block-local');
    if (t.memoId) {
      const m = findMemo(t.memoId);
      if (m?.priority === 'must') classes.push('tb-block-must');
      else if (m?.priority === 'should') classes.push('tb-block-should');
      else if (m?.priority === 'could') classes.push('tb-block-could');
    }
  }
  if (t.completed) classes.push('is-done');
  if (isEventHappeningNow(t, nowMin)) classes.push('is-now');
  else if (!t.completed && timeToMinutes(t.time || '00:00') + getEventDuration(t) <= nowMin) {
    classes.push('is-past');
  }
  return classes.join(' ');
}
