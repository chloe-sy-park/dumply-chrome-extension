/* 월간 캘린더 · 기간 띠 · 일별 상세 */

'use strict';

const CAL_BAND_COLORS = ['cal-band-a', 'cal-band-b', 'cal-band-c', 'cal-band-d'];
const CAL_BAND_ICONS = ['📌', '⭐', '🎯', '📅', '✈️', '💼', '🎨', '🔥', '📝', '🏠'];
const CAL_DATE_HEAD = 28;
const CAL_BAND_ROW = 20;
const CAL_BAND_ROW_GAP = 4;
const CAL_WEEK_PAD = 8;
const CAL_WEEK_MIN = 58;
const CAL_DRAG_THRESHOLD = 10;
let calInteract = null;
// 날짜 단일 탭으로 compose가 열렸는지 — 저장 없이 닫으면 선택 해제(오늘 복귀)
let calComposeTentative = false;
let calBandDraft = null;
// 구글 캘린더 월별 이벤트 캐시 — { 'YYYY-MM': [...events] }
let calMonthEventsCache = {};

function dedupeEvents(events) {
  // gcalEventId 기준 중복 제거 (여러 캘린더에 동일 이벤트가 공유된 경우)
  const seen = new Set();
  return events.filter((e) => {
    const key = e.gcalEventId || e.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getCachedMonthEvents(monthKey) {
  return calMonthEventsCache[monthKey] || [];
}

// 현재 월 이벤트 캐시 갱신 (비동기 — 완료 후 뷰 재렌더)
async function refreshMonthEventsCache(monthKey) {
  const cal = state.settings?.calendar;
  if (!cal?.connected) return;
  const [y, m] = monthKey.split('-').map(Number);
  try {
    // sync()와 동일하게 chrome.identity로 토큰 확보 (저장된 cal.accessToken에 의존하지 않음)
    const token = await AlfredoCalendar.connect({ interactive: false });
    const events = await AlfredoCalendar.pullMonthEvents(token, cal.calendars, y, m - 1);
    calMonthEventsCache[monthKey] = dedupeEvents(events);
    renderCalendarView();
  } catch (e) {
    if (/401|403/.test(String(e?.message))) {
      try {
        const newToken = await AlfredoCalendar.refreshAccessToken();
        const events = await AlfredoCalendar.pullMonthEvents(newToken, cal.calendars, y, m - 1);
        calMonthEventsCache[monthKey] = dedupeEvents(events);
        renderCalendarView();
      } catch { /* silent */ }
    }
  }
}

function invalidateMonthCache(monthKey) {
  delete calMonthEventsCache[monthKey];
}

function getCalendarMonthKey() {
  return state.ui.calendarMonth || todayStr().slice(0, 7);
}

function setCalendarMonthKey(key) {
  state.ui.calendarMonth = key;
}

function getCalendarSelectedDay() {
  return state.ui.calendarSelectedDay ?? null;
}

function selectCalendarDay(dateStr) {
  closeCalBandSheetQuiet();
  state.ui.calendarSelectedDay = dateStr;
  persist();
  renderCalendarView();
}

function openCalendarEventCompose(dateStr) {
  closeCalBandSheetQuiet();
  if (typeof closeDetail === 'function') closeDetail();
  state.ui.calendarSelectedDay = dateStr;
  persist();
  renderCalendarView();
  openCompose({ mode: 'event', preset: { date: dateStr } });
}

function clearCalendarSelectedDay() {
  state.ui.calendarSelectedDay = null;
}

function parseMonthKey(key) {
  const [y, m] = key.split('-').map(Number);
  return { year: y, month: m - 1 };
}

function dateToYMD(d) {
  // 로컬 기준 — toISOString()(UTC)는 로컬 자정 Date를 전날로 밀어버림
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function calCompareDate(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function dateInRange(dateStr, start, end) {
  return calCompareDate(dateStr, start) >= 0 && calCompareDate(dateStr, end) <= 0;
}

function getAllCalendarBands() {
  const bands = (state.calendarBands || []).map((b) => ({
    id: b.id,
    title: b.title,
    startDate: b.startDate,
    endDate: b.endDate || b.startDate,
    color: b.color,
    sticker: b.sticker || null,
    kind: 'band',
  }));

  (state.timeline || []).forEach((t) => {
    if (!t.date) return;
    const end = t.endDate || t.date;
    if (end === t.date) return;
    bands.push({
      id: `tl-${t.id}`,
      title: t.title,
      startDate: t.date,
      endDate: end,
      color: t.source === 'google' ? 'cal-band-gcal' : 'cal-band-tl',
      kind: 'timeline',
      refId: t.id,
    });
  });

  (state.memos || []).forEach((m) => {
    if (m.completed || !m.deadline) return;
    const start = m.startDate || m.deadline;
    const end = m.deadline;
    if (start === end && !m.startDate) return;
    bands.push({
      id: `memo-${m.id}`,
      title: m.content,
      startDate: start,
      endDate: end,
      color: 'cal-band-memo',
      kind: 'memo',
      refId: m.id,
    });
  });

  return bands.sort((a, b) => calCompareDate(a.startDate, b.startDate));
}

function getCalendarDayItems(dateStr) {
  const items = [];
  const monthKey = dateStr.slice(0, 7);
  const cached = getCachedMonthEvents(monthKey);
  const timelineEvents = (state.timeline || []).filter((t) => t.date === dateStr);
  const cachedForDay = cached.filter((t) => t.date === dateStr && !timelineEvents.some((tl) => tl.gcalEventId && tl.gcalEventId === t.gcalEventId));
  [...timelineEvents, ...cachedForDay].forEach((t) => {
    items.push({
      kind: 'event',
      id: t.id,
      title: t.title,
      sub: t.time ? `${t.time}${t.duration ? ` · ${t.duration}분` : ''}` : '시간 없음',
      completed: Boolean(t.completed),
    });
  });
  (state.memos || []).forEach((m) => {
    if (m.completed) return;
    if (m.deadline === dateStr) {
      items.push({ kind: 'task', id: m.id, title: m.content, sub: '마감', completed: false });
    } else if (m.startDate === dateStr) {
      items.push({ kind: 'task', id: m.id, title: m.content, sub: '시작', completed: false });
    }
  });
  (state.calendarBands || []).forEach((b) => {
    if (dateInRange(dateStr, b.startDate, b.endDate || b.startDate)) {
      items.push({ kind: 'band', id: b.id, title: b.title, sub: '기간 일정', completed: false });
    }
  });
  return items;
}

// 월 그리드 셀에 구글 캘린더처럼 텍스트로 노출할 당일 항목 목록.
// 여러 날에 걸친 항목은 이미 띠로 보이므로 제외하고, 당일 일정·할 일(마감/시작)만 칩으로 나타낸다.
// 월간 칩용 압축 시간 — 좁은 칸에 맞춰 오전/오후를 떼고 24h로 (정각은 "8시", 그 외 "12:50")
function formatChipTime(time) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  return m ? `${h}:${String(m).padStart(2, '0')}` : `${h}시`;
}

function getCalendarDayChips(dateStr) {
  const chips = [];
  const monthKey = dateStr.slice(0, 7);
  const cached = getCachedMonthEvents(monthKey);
  const timelineForDay = (state.timeline || []).filter((t) => t.date === dateStr);
  const timelineIds = new Set(timelineForDay.map((t) => t.gcalEventId).filter(Boolean));
  const allEvents = [
    ...timelineForDay,
    ...cached.filter((t) => t.date === dateStr && !timelineIds.has(t.gcalEventId)),
  ];
  allEvents.forEach((t) => {
    if ((t.endDate || t.date) !== t.date) return; // 기간 일정은 띠로 표시됨
    chips.push({
      label: t.title || '일정',
      time: t.allDay ? '' : formatChipTime(t.time),
      kind: t.source === 'google' ? 'gcal' : 'event',
      sort: t.allDay ? -1 : timeToMinutes(t.time || '00:00'),
    });
  });
  (state.memos || []).forEach((m) => {
    if (m.completed || !m.deadline) return;
    if (m.startDate && m.startDate !== m.deadline) return; // 기간 할 일은 띠로 표시됨
    if (m.deadline === dateStr) chips.push({ label: m.content, time: '', kind: 'task', sort: 1e9 });
  });
  return chips.sort((a, b) => a.sort - b.sort);
}

function buildMonthWeeks(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const cells = [];

  for (let i = first.getDay(); i > 0; i--) {
    const d = new Date(year, month, 1 - i);
    cells.push({ date: dateToYMD(d), outside: true });
  }
  for (let d = 1; d <= last.getDate(); d++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ date: ds, outside: false });
  }
  let tail = 1;
  while (cells.length % 7 !== 0) {
    const d = new Date(year, month + 1, tail++);
    cells.push({ date: dateToYMD(d), outside: true });
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push({ start: cells[i].date, end: cells[i + 6].date, days: cells.slice(i, i + 7) });
  }
  return weeks;
}

function getBandSegmentsForWeek(band, week) {
  if (calCompareDate(band.endDate, week.start) < 0 || calCompareDate(band.startDate, week.end) > 0) return null;
  const segStart = calCompareDate(band.startDate, week.start) < 0 ? week.start : band.startDate;
  const segEnd = calCompareDate(band.endDate, week.end) > 0 ? week.end : band.endDate;
  const startCol = week.days.findIndex((d) => d.date === segStart);
  const endCol = week.days.findIndex((d) => d.date === segEnd);
  if (startCol < 0 || endCol < 0) return null;
  return { startCol, span: endCol - startCol + 1, segStart, segEnd, band };
}

function assignBandLanes(bands, weeks) {
  const lanesByWeek = weeks.map(() => []);
  bands.forEach((band) => {
    weeks.forEach((week, wi) => {
      const seg = getBandSegmentsForWeek(band, week);
      if (!seg) return;
      let lane = 0;
      const endCol = seg.startCol + seg.span - 1;
      while (lanesByWeek[wi][lane]?.some((s) => !(s.endCol < seg.startCol || s.startCol > endCol))) lane++;
      if (!lanesByWeek[wi][lane]) lanesByWeek[wi][lane] = [];
      lanesByWeek[wi][lane].push({ ...seg, endCol, lane });
    });
  });
  return lanesByWeek;
}

function getCalendarBodyEl() {
  return $('#calendar-root')?.querySelector('.cal-body') ?? null;
}

function clearCalRangeHighlight() {
  getCalendarBodyEl()?.querySelectorAll('.cal-cell').forEach((el) => {
    el.classList.remove('is-selecting', 'is-range-start', 'is-range-end', 'is-range-middle');
  });
}

function highlightCalRange(min, max) {
  const body = getCalendarBodyEl();
  if (!body) return;
  body.querySelectorAll('.cal-cell').forEach((el) => {
    const d = el.dataset.date;
    el.classList.remove('is-selecting', 'is-range-start', 'is-range-end', 'is-range-middle');
    if (calCompareDate(d, min) >= 0 && calCompareDate(d, max) <= 0) {
      el.classList.add('is-selecting');
      if (d === min) el.classList.add('is-range-start');
      if (d === max) el.classList.add('is-range-end');
      if (d !== min && d !== max) el.classList.add('is-range-middle');
    }
  });
}

function calDateFromPoint(x, y) {
  const stack = document.elementsFromPoint(x, y);
  for (const node of stack) {
    const cell = node.closest?.('.cal-cell');
    if (cell?.dataset?.date) return cell.dataset.date;
  }
  return null;
}

function formatCalRangeLabel(min, max) {
  if (min === max) return formatComposeDateWithWeekday(min);
  return `${formatComposeDateWithWeekday(min)} — ${formatComposeDateWithWeekday(max)}`;
}

function syncCalBandRangeLabel() {
  const start = $('#cal-band-start')?.value;
  const end = $('#cal-band-end')?.value;
  const el = $('#cal-band-range-label');
  if (!el) return;
  if (start && end) {
    const min = calCompareDate(start, end) <= 0 ? start : end;
    const max = calCompareDate(start, end) <= 0 ? end : start;
    el.textContent = formatCalRangeLabel(min, max);
  } else {
    el.textContent = '';
  }
}

function renderCalBandColorPicker(selected) {
  const wrap = $('#cal-band-colors');
  if (!wrap) return;
  wrap.replaceChildren();
  CAL_BAND_COLORS.forEach((colorId) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `cal-band-color-opt ${colorId}${colorId === selected ? ' is-selected' : ''}`;
    btn.setAttribute('aria-label', colorId);
    btn.addEventListener('click', () => {
      if (calBandDraft) calBandDraft.color = colorId;
      renderCalBandColorPicker(colorId);
    });
    wrap.append(btn);
  });
}

function renderCalBandIconPicker(selected) {
  const wrap = $('#cal-band-icons');
  if (!wrap) return;
  wrap.replaceChildren();
  const noneBtn = document.createElement('button');
  noneBtn.type = 'button';
  noneBtn.className = `cal-band-icon-opt${!selected ? ' is-selected' : ''}`;
  noneBtn.textContent = '—';
  noneBtn.title = '없음';
  noneBtn.addEventListener('click', () => {
    if (calBandDraft) calBandDraft.sticker = null;
    renderCalBandIconPicker(null);
  });
  wrap.append(noneBtn);
  CAL_BAND_ICONS.forEach((icon) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `cal-band-icon-opt${icon === selected ? ' is-selected' : ''}`;
    btn.textContent = icon;
    btn.addEventListener('click', () => {
      if (calBandDraft) calBandDraft.sticker = icon;
      renderCalBandIconPicker(icon);
    });
    wrap.append(btn);
  });
}

function closeCalBandSheetQuiet() {
  calBandDraft = null;
  clearCalRangeHighlight();
  const sheet = $('#cal-band-sheet');
  if (sheet) sheet.hidden = true;
}

function closeCalBandSheet() {
  const wasOpen = Boolean(calBandDraft) || !($('#cal-band-sheet')?.hidden ?? true);
  closeCalBandSheetQuiet();
  if (wasOpen && state?.ui?.route === 'calendar') {
    clearCalendarSelectedDay();
    persist();
    renderCalendarView();
  }
}

function openCalBandSheet(draft) {
  if (typeof closeDetail === 'function') closeDetail();
  if (typeof closeCompose === 'function') closeCompose();
  calBandDraft = draft;
  clearCalRangeHighlight();

  const sheet = $('#cal-band-sheet');
  if (!sheet) return;

  $('#cal-band-sheet-title').textContent = draft.mode === 'edit' ? t('band.title.edit') : t('band.title');
  $('#cal-band-title').value = draft.title || '';
  $('#cal-band-start').value = draft.startDate;
  $('#cal-band-end').value = draft.endDate;
  if (!draft.color) {
    draft.color = CAL_BAND_COLORS[(state.calendarBands || []).length % CAL_BAND_COLORS.length];
  }
  renderCalBandColorPicker(draft.color);
  renderCalBandIconPicker(draft.sticker || null);
  $('#btn-cal-band-delete').hidden = draft.mode !== 'edit';
  $('#btn-cal-band-save').textContent = draft.mode === 'edit' ? t('band.save.btn') : t('add.btn');
  syncCalBandRangeLabel();
  sheet.hidden = false;
  const titleInput = $('#cal-band-title');
  titleInput?.focus();
  titleInput?.select();
  renderCalendarView();
}

function openCalBandSheetCreate(startDate, endDate) {
  const min = calCompareDate(startDate, endDate) <= 0 ? startDate : endDate;
  const max = calCompareDate(startDate, endDate) <= 0 ? endDate : startDate;
  openCalBandSheet({
    mode: 'create',
    startDate: min,
    endDate: max,
    title: t('cal.band.new'),
    color: CAL_BAND_COLORS[(state.calendarBands || []).length % CAL_BAND_COLORS.length],
    sticker: null,
  });
}

function openCalBandSheetEdit(id) {
  const band = (state.calendarBands || []).find((b) => b.id === id);
  if (!band) return;
  openCalBandSheet({
    mode: 'edit',
    id: band.id,
    startDate: band.startDate,
    endDate: band.endDate || band.startDate,
    title: band.title,
    color: band.color || CAL_BAND_COLORS[0],
    sticker: band.sticker || null,
  });
}

async function saveCalBandSheet() {
  if (!calBandDraft) return;
  const title = $('#cal-band-title')?.value.trim() || t('cal.band.new');
  const start = $('#cal-band-start')?.value;
  const end = $('#cal-band-end')?.value;
  if (!start || !end) {
    toast('시작·종료 날짜를 선택해 주세요');
    return;
  }
  const min = calCompareDate(start, end) <= 0 ? start : end;
  const max = calCompareDate(start, end) <= 0 ? end : start;
  const color = calBandDraft.color || CAL_BAND_COLORS[0];
  const sticker = calBandDraft.sticker || null;

  clearCalRangeHighlight();

  if (calBandDraft.mode === 'edit') {
    await updateCalendarBand(calBandDraft.id, { title, startDate: min, endDate: max, color, sticker });
    toast('기간을 저장했어요 ✓');
  } else {
    await createCalendarBand(min, max, title, { color, sticker, silent: true });
    toast(t('cal.band.added'));
  }
  await persist();
  closeCalBandSheet();
  selectCalendarDay(min);
}

async function deleteCalBandSheet() {
  if (!calBandDraft?.id) return;
  await deleteCalendarBand(calBandDraft.id, { silent: true });
  closeCalBandSheet();
  toast(t('cal.band.deleted'));
}

function bindCalBandSheet() {
  $('#cal-band-sheet')?.addEventListener('click', (e) => {
    if (e.target.id === 'cal-band-sheet') closeCalBandSheet();
  });
  $('#btn-cal-band-close')?.addEventListener('click', closeCalBandSheet);
  $('#btn-cal-band-cancel')?.addEventListener('click', closeCalBandSheet);
  $('#btn-cal-band-save')?.addEventListener('click', saveCalBandSheet);
  $('#btn-cal-band-delete')?.addEventListener('click', deleteCalBandSheet);
  $('#cal-band-start')?.addEventListener('change', syncCalBandRangeLabel);
  $('#cal-band-end')?.addEventListener('change', syncCalBandRangeLabel);
  $('#cal-band-title')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveCalBandSheet();
    if (e.key === 'Escape') closeCalBandSheet();
  });
}

async function createCalendarBand(startDate, endDate, title, opts = {}) {
  const a = calCompareDate(startDate, endDate) <= 0 ? startDate : endDate;
  const b = calCompareDate(startDate, endDate) <= 0 ? endDate : startDate;
  state.calendarBands.push({
    id: AlfredoStorage.uid(),
    title: title || t('cal.band.new'),
    startDate: a,
    endDate: b,
    color: opts.color || CAL_BAND_COLORS[state.calendarBands.length % CAL_BAND_COLORS.length],
    sticker: opts.sticker || null,
    createdAt: Date.now(),
  });
  await persist();
  if (!opts.silent) {
    renderCalendarView();
    toast(t('cal.band.added'));
  }
}

async function updateCalendarBand(id, { title, startDate, endDate, color, sticker }) {
  const band = (state.calendarBands || []).find((b) => b.id === id);
  if (!band) return;
  band.title = title || band.title;
  const a = calCompareDate(startDate, endDate) <= 0 ? startDate : endDate;
  const b = calCompareDate(startDate, endDate) <= 0 ? endDate : startDate;
  band.startDate = a;
  band.endDate = b;
  if (color) band.color = color;
  if (sticker !== undefined) band.sticker = sticker || null;
  await persist();
}

async function deleteCalendarBand(id, opts = {}) {
  state.calendarBands = (state.calendarBands || []).filter((b) => b.id !== id);
  await persist();
  if (!opts.silent) {
    renderCalendarView();
    toast(t('cal.band.deleted'));
  }
}

async function removeCalendarDayItem(item) {
  if (item.kind === 'event') await handleAction('tl-del', item.id);
  else if (item.kind === 'task') await handleAction('del', item.id);
  else if (item.kind === 'band') await deleteCalendarBand(item.id);
}

function openCalendarDayItem(item) {
  if (item.kind === 'event') openCompose({ mode: 'event', editId: item.id });
  else if (item.kind === 'task') openCompose({ mode: 'task', editId: item.id });
  else if (item.kind === 'band') openCalBandSheetEdit(item.id);
}

function renderCalendarDayPanel(root, dateStr) {
  const panel = document.createElement('section');
  panel.className = 'cal-day-panel';
  const head = document.createElement('div');
  head.className = 'cal-day-panel-head';
  const title = document.createElement('h3');
  title.className = 'cal-day-panel-title';
  title.textContent = dateStr ? formatComposeDateWithWeekday(dateStr) : t('cal.day.title');
  const actions = document.createElement('div');
  actions.className = 'cal-day-panel-actions';

  if (dateStr) {
    const addEvent = createAddButton(t('ui.add.event'));
    addEvent.addEventListener('click', () => openCompose({ mode: 'event', preset: { date: dateStr } }));
    actions.append(addEvent);
  }
  head.append(title, actions);
  panel.append(head);

  const list = document.createElement('ul');
  list.className = 'cal-day-list';
  if (!dateStr) {
    const empty = document.createElement('li');
    empty.className = 'cal-day-empty';
    empty.textContent = t('cal.empty');
    list.append(empty);
  } else {
    const items = getCalendarDayItems(dateStr);
    if (!items.length) {
      const empty = document.createElement('li');
      empty.className = 'cal-day-empty';
      empty.textContent = t('cal.day.empty');
      list.append(empty);
    } else {
      items.forEach((item) => {
        const li = document.createElement('li');
        li.className = `cal-day-item cal-day-item-${item.kind}${item.completed ? ' is-done' : ''}`;
        const body = document.createElement('button');
        body.type = 'button';
        body.className = 'cal-day-item-body row-clickable';
        const kind = document.createElement('span');
        kind.className = 'cal-day-item-kind';
        kind.textContent = item.kind === 'event' ? t('cal.kind.event') : item.kind === 'task' ? t('cal.kind.task') : t('cal.kind.band');
        const text = document.createElement('span');
        text.className = 'cal-day-item-title';
        text.textContent = item.title;
        const sub = document.createElement('span');
        sub.className = 'cal-day-item-sub';
        sub.textContent = item.sub;
        body.append(kind, text, sub);
        body.addEventListener('click', () => openCalendarDayItem(item));
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'cal-day-item-del';
        del.setAttribute('aria-label', '삭제');
        del.textContent = '×';
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          removeCalendarDayItem(item);
        });
        li.append(body, del);
        list.append(li);
      });
    }
  }
  panel.append(list);
  root.append(panel);
}

/* ── 당일 타임라인 드로어 ── */
function getCalDayAllDayItems(dateStr) {
  const items = [];
  (state.calendarBands || []).forEach((b) => {
    if (dateInRange(dateStr, b.startDate, b.endDate || b.startDate)) {
      items.push({ kind: 'band', id: b.id, title: b.title, color: b.color || CAL_BAND_COLORS[0] });
    }
  });
  (state.memos || []).forEach((m) => {
    if (m.completed || !m.deadline) return;
    if (m.deadline === dateStr) items.push({ kind: 'task', id: m.id, title: m.content, sub: '마감' });
    else if (m.startDate === dateStr) items.push({ kind: 'task', id: m.id, title: m.content, sub: '시작' });
  });
  (state.timeline || []).forEach((t) => {
    if (t.date === dateStr && t.allDay) items.push({ kind: 'event', id: t.id, title: t.title });
  });
  return items;
}

// 드로어 상단: 기간(진행도 N일째)·종일·할 일을 어젠다 행으로 (시간 일정은 아래 타임라인)
function renderCalDayAllDay(dateStr) {
  const wrap = $('#cal-day-allday');
  if (!wrap) return;
  wrap.replaceChildren();
  const { ranges, allday, tasks } = getCalendarAgendaItems(dateStr);
  if (!ranges.length && !allday.length && !tasks.length) { wrap.hidden = true; return; }
  wrap.hidden = false;
  ranges.forEach((r) => wrap.append(calAgendaRow({
    barColor: bandBarColor(r.color),
    title: `${r.sticker ? `${r.sticker} ` : ''}${r.title}`,
    sub: t('cal.band.sub', r.nth, r.total),
    onClick: () => openCalBandSheetEdit(r.id),
  })));
  allday.forEach((e) => wrap.append(calAgendaRow({
    barColor: e.source === 'google' ? bandBarColor('cal-band-gcal') : null,
    time: t('cal.allday'),
    title: e.title || '일정',
    onClick: () => openCompose({ mode: 'event', editId: e.id }),
  })));
  tasks.forEach((tk) => wrap.append(calAgendaRow({
    check: true,
    onCheck: () => handleAction('memo-toggle', tk.id),
    title: tk.title,
    sub: tk.sub,
    onClick: () => openCompose({ mode: 'task', editId: tk.id }),
  })));
}

function renderCalDaySheet(dateStr) {
  if (!dateStr) return;
  const titleEl = $('#cal-day-sheet-title');
  if (titleEl) titleEl.textContent = formatComposeDateWithWeekday(dateStr);
  renderCalDayAllDay(dateStr);
  renderDayTimeline(dateStr, {
    scope: 'drawer',
    wrap: $('#cal-day-tl-wrap'),
    hoursEl: $('#cal-day-tl-hours'),
    grid: $('#cal-day-tl-grid'),
    onCreate: (id) => startCalDayInlineRename(id),
    onEmptyAdd: () => openCompose({ mode: 'event', preset: { date: dateStr } }),
    onBlockClick: (kind, id) => openCompose({ mode: kind === 'memo' ? 'task' : 'event', editId: id }),
  });
}

// 빈 슬롯 생성 직후, 무거운 상세 시트 대신 블록 제목을 바로 인라인 편집
function startCalDayInlineRename(id) {
  const grid = $('#cal-day-tl-grid');
  const block = grid?.querySelector(`.tb-block[data-id="${id}"]`);
  const titleEl = block?.querySelector('.tb-block-title');
  if (!titleEl) { openCompose({ mode: 'event', editId: id }); return; }

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'tb-inline-title';
  input.value = state.timeline.find((t) => t.id === id)?.title || t('compose.new.event');
  titleEl.replaceWith(input);
  input.focus();
  input.select();

  let done = false;
  const commit = async () => {
    if (done) return;
    done = true;
    const t = state.timeline.find((x) => x.id === id);
    if (t) t.title = input.value.trim() || t('compose.new.event');
    await persist();
    renderCalendarView();   // 칩 + 드로어 갱신
  };
  // 블록의 드래그/클릭 핸들러로 이벤트가 새지 않도록 차단
  input.addEventListener('mousedown', (e) => e.stopPropagation());
  input.addEventListener('click', (e) => e.stopPropagation());
  input.addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); commit(); }
  });
  input.addEventListener('blur', commit);
}

function openCalDaySheet(dateStr) {
  closeCalBandSheetQuiet();
  state.ui.calendarSelectedDay = dateStr;
  persist();
  renderCalendarView();          // 선택 표시 갱신 (드로어는 아직 hidden이라 중복 렌더 없음)
  const sheet = $('#cal-day-sheet');
  if (!sheet) return;
  renderCalDaySheet(dateStr);
  sheet.hidden = false;
}

function closeCalDaySheet() {
  const sheet = $('#cal-day-sheet');
  if (sheet) sheet.hidden = true;
  // 접근성: 포커스를 해당 날짜 셀로 복원 (드로어는 열 때 달력을 재렌더하므로 셀을 다시 찾는다)
  const day = getCalendarSelectedDay();
  const cell = day && document.querySelector(`.cal-cell[data-date="${day}"]`);
  if (cell) { try { cell.focus({ preventScroll: true }); } catch { /* noop */ } }
}

// 드로어를 닫지 않고 전/다음 날로 이동
function goCalDay(delta) {
  const cur = getCalendarSelectedDay() || todayStr();
  const next = addDays(cur, delta);
  state.ui.calendarSelectedDay = next;
  if (next.slice(0, 7) !== getCalendarMonthKey()) setCalendarMonthKey(next.slice(0, 7));
  persist();
  renderCalendarView();        // 달력 갱신 + 열린 드로어 자동 새로고침
}

function bindCalDaySheet() {
  $('#cal-day-sheet')?.addEventListener('click', (e) => {
    if (e.target.id === 'cal-day-sheet') closeCalDaySheet();
  });
  $('#btn-cal-day-close')?.addEventListener('click', closeCalDaySheet);
  $('#btn-cal-day-prev')?.addEventListener('click', () => goCalDay(-1));
  $('#btn-cal-day-next')?.addEventListener('click', () => goCalDay(1));
  $('#btn-cal-day-add')?.addEventListener('click', () => {
    const d = getCalendarSelectedDay() || todayStr();
    openCompose({ mode: 'event', preset: { date: d } });
  });
}

/* ── 인라인 어젠다 (선택일 일정 리스트) ── */
function calDayIndex(start, date) {
  const a = new Date(`${start}T12:00:00`);
  const d = new Date(`${date}T12:00:00`);
  return Math.round((d - a) / 86400000) + 1;
}

function getCalendarAgendaItems(dateStr) {
  const ranges = [];
  (state.calendarBands || []).forEach((b) => {
    const end = b.endDate || b.startDate;
    if (!dateInRange(dateStr, b.startDate, end)) return;
    ranges.push({
      id: b.id, title: b.title, sticker: b.sticker, color: b.color || CAL_BAND_COLORS[0],
      nth: calDayIndex(b.startDate, dateStr), total: calDayIndex(b.startDate, end),
    });
  });
  const timed = [];
  const allday = [];
  const monthKey = dateStr.slice(0, 7);
  const cached = getCachedMonthEvents(monthKey);
  const timelineForDay = (state.timeline || []).filter((t) => t.date === dateStr);
  const timelineIds = new Set(timelineForDay.map((t) => t.gcalEventId).filter(Boolean));
  const agendaEvents = [
    ...timelineForDay,
    ...cached.filter((t) => t.date === dateStr && !timelineIds.has(t.gcalEventId)),
  ];
  agendaEvents.forEach((t) => {
    if (t.allDay) allday.push({ id: t.id, title: t.title, source: t.source });
    else timed.push({ id: t.id, title: t.title, time: t.time, source: t.source, location: t.location });
  });
  const tasks = [];
  (state.memos || []).forEach((m) => {
    if (m.completed || !m.deadline) return;
    if (m.deadline === dateStr) tasks.push({ id: m.id, title: m.content, sub: '마감' });
    else if (m.startDate === dateStr) tasks.push({ id: m.id, title: m.content, sub: '시작' });
  });
  timed.sort((a, b) => timeToMinutes(a.time || '00:00') - timeToMinutes(b.time || '00:00'));
  return { ranges, allday, timed, tasks };
}

function calAgendaRow({ barColor, time, title, sub, onClick, check, onCheck }) {
  const row = document.createElement(onClick ? 'button' : 'div');
  if (onClick) row.type = 'button';
  row.className = 'cal-agenda-row';
  if (check) {
    const chk = document.createElement('button');
    chk.type = 'button';
    chk.className = 'cal-agenda-check';
    chk.setAttribute('aria-label', '완료');
    chk.addEventListener('click', (e) => { e.stopPropagation(); onCheck?.(); });
    row.append(chk);
  } else {
    const bar = document.createElement('span');
    bar.className = 'cal-agenda-bar';
    if (barColor) bar.style.background = barColor;
    row.append(bar);
  }
  if (time != null) {
    const t = document.createElement('span');
    t.className = 'cal-agenda-time';
    t.textContent = time;
    row.append(t);
  }
  const body = document.createElement('div');
  body.className = 'cal-agenda-body';
  const tt = document.createElement('div');
  tt.className = 'cal-agenda-row-title';
  tt.textContent = title;
  body.append(tt);
  if (sub) {
    const s = document.createElement('div');
    s.className = 'cal-agenda-row-sub';
    s.textContent = sub;
    body.append(s);
  }
  row.append(body);
  if (onClick) row.addEventListener('click', onClick);
  return row;
}

function bandBarColor(colorId) {
  return `color-mix(in srgb, var(--${colorId || 'cal-band-a'}) 55%, var(--text-primary))`;
}

function renderCalendarAgenda(dateStr) {
  const root = $('#cal-agenda');
  if (!root || !dateStr) return;
  root.replaceChildren();
  const { ranges, allday, timed, tasks } = getCalendarAgendaItems(dateStr);

  const head = document.createElement('div');
  head.className = 'cal-agenda-head';
  const titles = document.createElement('div');
  titles.className = 'cal-agenda-titles';
  const h = document.createElement('h3');
  h.className = 'cal-agenda-date';
  h.textContent = formatComposeDateWithWeekday(dateStr);
  titles.append(h);
  if (dateStr === todayStr()) {
    const pill = document.createElement('span');
    pill.className = 'cal-agenda-today';
    pill.textContent = t('cal.today.pill');
    titles.append(pill);
  }
  const actions = document.createElement('div');
  actions.className = 'cal-agenda-actions';
  const tlBtn = document.createElement('button');
  tlBtn.type = 'button';
  tlBtn.className = 'cal-agenda-tl';
  tlBtn.textContent = t('cal.timeline');
  tlBtn.addEventListener('click', () => openCalDaySheet(dateStr));
  const addBtn = createAddButton(t('ui.add.event'));
  addBtn.addEventListener('click', () => openCompose({ mode: 'event', preset: { date: dateStr } }));
  actions.append(tlBtn, addBtn);
  head.append(titles, actions);
  root.append(head);

  const list = document.createElement('div');
  list.className = 'cal-agenda-list';

  ranges.forEach((r) => list.append(calAgendaRow({
    barColor: bandBarColor(r.color),
    title: `${r.sticker ? `${r.sticker} ` : ''}${r.title}`,
    sub: t('cal.band.sub', r.nth, r.total),
    onClick: () => openCalBandSheetEdit(r.id),
  })));
  allday.forEach((e) => list.append(calAgendaRow({
    barColor: e.source === 'google' ? bandBarColor('cal-band-gcal') : null,
    time: t('cal.allday'),
    title: e.title || '일정',
    onClick: () => openDetail({ kind: 'event', id: e.id }),
  })));
  timed.forEach((e) => list.append(calAgendaRow({
    barColor: e.source === 'google' ? bandBarColor('cal-band-gcal') : null,
    time: formatTimeLabel(e.time),
    title: e.title || '일정',
    sub: [e.location, e.source === 'google' ? 'Google' : null].filter(Boolean).join(' · ') || null,
    onClick: () => openDetail({ kind: 'event', id: e.id }),
  })));
  tasks.forEach((tk) => list.append(calAgendaRow({
    check: true,
    onCheck: () => handleAction('memo-toggle', tk.id),
    title: tk.title,
    sub: tk.sub,
    onClick: () => openDetail({ kind: 'memo', id: tk.id }),
  })));

  if (!list.childElementCount) {
    const empty = document.createElement('button');
    empty.type = 'button';
    empty.className = 'cal-agenda-empty';
    empty.textContent = t('cal.day.add');
    empty.addEventListener('click', () => openCompose({ mode: 'event', preset: { date: dateStr } }));
    list.append(empty);
  }
  root.append(list);
}

// 방향키 이동용 — 선택 하이라이트만 갱신 (드로어는 Enter/탭에서 연다)
function selectCalDay(date) {
  state.ui.calendarSelectedDay = date;
  getCalendarBodyEl()?.querySelectorAll('.cal-cell').forEach((c) => {
    const sel = c.dataset.date === date && !c.classList.contains('is-outside');
    c.classList.toggle('is-selected', sel);
    c.tabIndex = sel ? 0 : -1;
    if (sel) c.setAttribute('aria-current', 'date');
    else c.removeAttribute('aria-current');
  });
  persist();
}

function bindCalCellEvents(cell, day) {
  cell.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (calBandDraft || !($('#cal-band-sheet')?.hidden ?? true)) closeCalBandSheetQuiet();
    cell.setPointerCapture(e.pointerId);
    calInteract = {
      start: day.date,
      end: day.date,
      x: e.clientX,
      y: e.clientY,
      dragging: false,
      pointerId: e.pointerId,
    };
  });
  cell.addEventListener('pointerup', (e) => {
    if (cell.hasPointerCapture(e.pointerId)) cell.releasePointerCapture(e.pointerId);
  });
}

function ensureCalendarSelectedDay() {
  if (!getCalendarSelectedDay()) {
    state.ui.calendarSelectedDay = todayStr();
  }
}

function renderCalendarView() {
  const root = $('#calendar-root');
  if (!root) return;

  ensureCalendarSelectedDay();

  const { year, month } = parseMonthKey(getCalendarMonthKey());
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  // 캘린더 연결됐는데 이 달 캐시가 없으면 비동기로 fetch → 완료 후 자동 재렌더
  if (state.settings?.calendar?.connected && !(monthKey in calMonthEventsCache)) {
    calMonthEventsCache[monthKey] = []; // 중복 요청 방지용 빈 배열 선점
    refreshMonthEventsCache(monthKey);
  }

  const monthLabel = t('cal.month', year, month + 1);
  const weeks = buildMonthWeeks(year, month);
  const bands = getAllCalendarBands();
  const lanesByWeek = assignBandLanes(bands, weeks);
  const stickers = state.calendarStickers || [];
  const today = todayStr();
  const selectedDay = getCalendarSelectedDay();

  detachNavRail();
  root.replaceChildren();

  const pageHeader = document.createElement('div');
  pageHeader.className = 'route-page-header';
  const pageHead = document.createElement('div');
  pageHead.className = 'route-page-head cal-page-head';
  const routeTitle = document.createElement('h2');
  routeTitle.className = 'route-title';
  routeTitle.textContent = t('cal.title');
  const routeSub = document.createElement('p');
  routeSub.className = 'cal-page-sub';
  routeSub.textContent = formatComposeDateWithWeekday(today);
  pageHead.append(routeTitle, routeSub);
  pageHeader.append(createRouteHomeLink(), pageHead);

  const toolbar = document.createElement('div');
  toolbar.className = 'cal-toolbar';
  const head = document.createElement('div');
  head.className = 'cal-head';
  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'icon-btn-sm cal-nav';
  prev.dataset.calNav = 'prev';
  prev.setAttribute('aria-label', '이전 달');
  prev.textContent = '‹';
  const title = document.createElement('h3');
  title.className = 'cal-title';
  title.textContent = monthLabel;
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'icon-btn-sm cal-nav';
  next.dataset.calNav = 'next';
  next.setAttribute('aria-label', '다음 달');
  next.textContent = '›';
  head.append(prev, title, next);
  toolbar.append(head);

  const connectRow = document.createElement('div');
  connectRow.className = 'cal-connect-row';
  const connected = Boolean(state.settings.calendar.connected);
  const googlePill = document.createElement('button');
  googlePill.type = 'button';
  googlePill.className = `cal-connect-pill${connected ? ' is-connected' : ''}`;
  const dot = document.createElement('span');
  dot.className = 'cal-connect-dot';
  dot.setAttribute('aria-hidden', 'true');
  googlePill.append(dot, document.createTextNode('Google Calendar'));
  googlePill.addEventListener('click', async () => {
    if (!connected) {
      const ok = await connectGoogleAccount();
      if (ok) renderCalendarView();
      return;
    }
    openCalSelectSheet();
  });
  connectRow.append(googlePill);

  if (connected) {
    const syncBtn = document.createElement('button');
    syncBtn.type = 'button';
    syncBtn.className = 'cal-sync-icon-btn';
    syncBtn.setAttribute('aria-label', '동기화');
    syncBtn.title = '지금 동기화';
    syncBtn.textContent = '↻';
    syncBtn.addEventListener('click', async () => {
      syncBtn.classList.add('is-spinning');
      try {
        state = await AlfredoCalendar.sync(state);
        await persist();
        // 월별 캐시 무효화 → renderCalendarView에서 최신 데이터 재요청
        const currentMonthKey = getCalendarMonthKey();
        invalidateMonthCache(currentMonthKey);
        renderCalendarView();
        toast(t('cal.sync.done'));
      } catch {
        toast(t('cal.sync.fail'));
      } finally {
        syncBtn.classList.remove('is-spinning');
      }
    });
    connectRow.append(syncBtn);
  }
  const hint = document.createElement('p');
  hint.className = 'cal-hint';
  hint.textContent = connected ? t('cal.hint.connected') : t('cal.hint.disconnected');
  connectRow.append(hint);

  const grid = document.createElement('div');
  grid.className = 'cal-grid';

  const wd = document.createElement('div');
  wd.className = 'cal-weekdays';
  t('cal.weekdays').forEach((d, i) => {
    const s = document.createElement('span');
    s.className = `cal-wd${i === 0 ? ' is-sun' : ''}${i === 6 ? ' is-sat' : ''}`;
    s.textContent = d;
    wd.append(s);
  });
  grid.append(wd);

  const body = document.createElement('div');
  body.className = 'cal-body';

  weeks.forEach((week, wi) => {
    const weekEl = document.createElement('div');
    weekEl.className = 'cal-week';
    const laneCount = (lanesByWeek[wi] || []).length;
    const bandsBlock = laneCount > 0
      ? laneCount * CAL_BAND_ROW + (laneCount - 1) * CAL_BAND_ROW_GAP + 4
      : 0;
    const weekMin = Math.max(CAL_WEEK_MIN, CAL_DATE_HEAD + bandsBlock + CAL_WEEK_PAD);
    weekEl.style.minHeight = `${weekMin}px`;
    const cells = document.createElement('div');
    cells.className = 'cal-cells';
    cells.style.minHeight = `${weekMin}px`;

    week.days.forEach((day) => {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cal-cell';
      if (day.outside) cell.classList.add('is-outside');
      const isToday = day.date === today;
      const isUserSelected = selectedDay && day.date === selectedDay;
      if (isToday) cell.classList.add('is-today');
      if (isUserSelected && !calBandDraft) cell.classList.add('is-selected');
      cell.dataset.date = day.date;
      // 키보드 내비: 선택일만 탭 순서에 두고(roving tabindex) 방향키로 이동
      cell.tabIndex = day.date === selectedDay ? 0 : -1;
      cell.setAttribute('aria-label', formatComposeDateWithWeekday(day.date));
      if (isUserSelected) cell.setAttribute('aria-current', 'date');

      const num = document.createElement('span');
      num.className = 'cal-day-num';
      num.textContent = String(Number(day.date.slice(8)));
      cell.append(num);

      const daySticker = stickers.find((s) => s.date === day.date);
      if (daySticker) {
        const st = document.createElement('span');
        st.className = 'cal-day-sticker';
        st.textContent = daySticker.emoji || '⭐';
        cell.append(st);
      }

      // 단일 일정은 제목 막대로 쌓아서 표시 (최대 2 + "+N", 상세는 드로어)
      const dayChips = getCalendarDayChips(day.date);
      if (dayChips.length) {
        const chipWrap = document.createElement('div');
        chipWrap.className = 'cal-day-chips';
        if (bandsBlock > 0) chipWrap.style.marginTop = `${bandsBlock}px`;
        dayChips.slice(0, 2).forEach((ev) => {
          const chip = document.createElement('span');
          chip.className = `cal-day-chip cal-day-chip-${ev.kind}`;
          chip.textContent = ev.label;
          chipWrap.append(chip);
        });
        if (dayChips.length > 2) {
          const more = document.createElement('span');
          more.className = 'cal-day-more';
          more.textContent = `+${dayChips.length - 2}`;
          chipWrap.append(more);
        }
        cell.append(chipWrap);
      }

      bindCalCellEvents(cell, day);
      cells.append(cell);
    });

    const bandLayer = document.createElement('div');
    bandLayer.className = 'cal-bands';
    (lanesByWeek[wi] || []).forEach((lane) => {
      lane.forEach((seg) => {
        const el = document.createElement('button');
        el.type = 'button';
        const isSegStart = seg.segStart === seg.band.startDate;
        const isSegEnd = seg.segEnd === seg.band.endDate;
        el.className = `cal-band ${seg.band.color || CAL_BAND_COLORS[0]}`;
        if (isSegStart) el.classList.add('is-seg-start');
        if (isSegEnd) el.classList.add('is-seg-end');
        if (!isSegStart && !isSegEnd) el.classList.add('is-seg-middle');
        if (isSegStart && isSegEnd) el.classList.add('is-seg-single');
        el.style.gridColumn = `${seg.startCol + 1} / span ${seg.span}`;
        el.style.gridRow = String(seg.lane + 1);
        const bandSticker = seg.band.sticker;
        if (bandSticker && seg.band.kind === 'band') {
          const icon = document.createElement('span');
          icon.className = 'cal-band-icon';
          icon.textContent = bandSticker;
          el.append(icon, document.createTextNode(seg.band.title));
        } else {
          el.textContent = seg.band.title;
        }
        el.title = `${seg.band.startDate} — ${seg.band.endDate}`;
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (seg.band.kind === 'timeline') openDetail({ kind: 'event', id: seg.band.refId });
          else if (seg.band.kind === 'memo') openDetail({ kind: 'memo', id: seg.band.refId });
          else if (seg.band.kind === 'band') openCalBandSheetEdit(seg.band.id);
        });
        bandLayer.append(el);
      });
    });

    weekEl.append(cells, bandLayer);
    body.append(weekEl);
  });

  grid.append(body);
  const gridCard = document.createElement('div');
  gridCard.className = 'cal-grid-card';
  gridCard.append(grid);

  root.append(pageHeader, connectRow, toolbar, gridCard);

  // 열려 있는 당일 드로어가 있으면 함께 새로고침 (일정 추가/수정 반영)
  if (!($('#cal-day-sheet')?.hidden ?? true)) {
    renderCalDaySheet(selectedDay || getCalendarSelectedDay());
  }

  root.querySelector('[data-cal-nav="prev"]')?.addEventListener('click', () => {
    const d = new Date(year, month - 1, 1);
    setCalendarMonthKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    renderCalendarView();
    persist();
  });
  root.querySelector('[data-cal-nav="next"]')?.addEventListener('click', () => {
    const d = new Date(year, month + 1, 1);
    setCalendarMonthKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    renderCalendarView();
    persist();
  });
  mountNavRail();
}

document.addEventListener('pointermove', (e) => {
  if (!calInteract?.start) return;
  const dx = Math.abs(e.clientX - calInteract.x);
  const dy = Math.abs(e.clientY - calInteract.y);
  const hoverDate = calDateFromPoint(e.clientX, e.clientY);
  // 같은 날짜 셀 안에서의 미세 흔들림은 탭으로 유지 — 다른 날짜로 넘어가야 기간 드래그 시작
  if (!calInteract.dragging
      && (dx > CAL_DRAG_THRESHOLD || dy > CAL_DRAG_THRESHOLD)
      && hoverDate && hoverDate !== calInteract.start) {
    calInteract.dragging = true;
    document.body.classList.add('cal-is-dragging');
  }
  if (!calInteract.dragging) return;

  if (!hoverDate) return;
  calInteract.end = hoverDate;
  const min = calCompareDate(calInteract.start, hoverDate) <= 0 ? calInteract.start : hoverDate;
  const max = calCompareDate(calInteract.start, hoverDate) <= 0 ? hoverDate : calInteract.start;
  highlightCalRange(min, max);
});

document.addEventListener('pointerup', async () => {
  document.body.classList.remove('cal-is-dragging');
  if (!calInteract?.start) return;
  const { start, end, dragging } = calInteract;
  calInteract = null;

  if (!dragging) {
    clearCalRangeHighlight();
    openCalDaySheet(start);   // 날짜 탭 → 당일 드로어
    return;
  }

  const finish = end || start;
  const min = calCompareDate(start, finish) <= 0 ? start : finish;
  const max = calCompareDate(start, finish) <= 0 ? finish : start;
  clearCalRangeHighlight();
  openCalBandSheetCreate(min, max);
});

document.addEventListener('pointercancel', () => {
  document.body.classList.remove('cal-is-dragging');
  calInteract = null;
  clearCalRangeHighlight();
});

// 선택일을 date로 옮기고 포커스/하이라이트 갱신 (같은 달이면 재렌더 없이, 아니면 달 전환)
function focusCalDate(date) {
  const inGrid = document.querySelector(`.cal-cell[data-date="${date}"]:not(.is-outside)`);
  if (inGrid) {
    selectCalDay(date);
    inGrid.focus();
  } else {
    setCalendarMonthKey(date.slice(0, 7));
    state.ui.calendarSelectedDay = date;
    persist();
    renderCalendarView();
    document.querySelector(`.cal-cell[data-date="${date}"]:not(.is-outside)`)?.focus();
  }
}

// 캘린더 그리드 키보드 내비게이션 (방향키 이동 · Enter/Space로 드로어 열기)
document.addEventListener('keydown', (e) => {
  if (e.isComposing || state?.ui?.route !== 'calendar') return;
  if (document.querySelector('.sheet:not([hidden])')) return; // 시트 열렸으면 양보
  const cell = e.target.closest?.('.cal-cell');
  if (!cell?.dataset?.date) return;
  const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
  if (e.key in moves) {
    e.preventDefault();
    focusCalDate(addDays(cell.dataset.date, moves[e.key]));
  } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault();
    openCalDaySheet(cell.dataset.date);
  }
});
