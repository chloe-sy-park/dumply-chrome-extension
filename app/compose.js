/* Compose — 할 일·일정 추가/편집 */

'use strict';

let composeState = {
  mode: 'task',
  editId: null,
  editKind: null,
  originalEditKind: null,
  draft: {},
  popover: null,
  dateField: null,
  timeField: null,
  calendarMonth: null,
  notesOpen: false,
  expanded: false,
};

function buildMemoPayload(title, draft, bucket, id) {
  return {
    id: id || AlfredoStorage.uid(),
    content: title,
    notes: draft.notes || null,
    createdAt: Date.now(),
    completed: false,
    pinned: false,
    priority: bucket,
    suggestedPriority: null,
    suggestReason: null,
    loading: false,
    domain: null,
    tags: draft.tags?.length ? draft.tags : null,
    ...memoTaskFields({
      startDate: draft.startDate || null,
      startTime: draft.startTime || null,
      deadline: draft.deadline || null,
      deadlineTime: draft.deadlineTime || null,
      durationMinutes: draft.durationMinutes || null,
      durationSource: draft.durationMinutes ? 'user' : null,
      durationReason: draft.durationReason || null,
      projectId: draft.projectId || null,
      steps: [],
    }),
  };
}

function removeMemoFromState(id) {
  state.memos = state.memos.filter((m) => m.id !== id);
  Object.keys(state.moscowOrder).forEach((key) => {
    state.moscowOrder[key] = state.moscowOrder[key].filter((x) => x !== id);
  });
}

function emptyTaskDraft() {
  return {
    title: '',
    notes: '',
    bucket: 'must',
    startDate: null,
    startTime: null,
    deadline: null,
    deadlineTime: null,
    deadlineHint: null,
    durationMinutes: null,
    projectId: null,
    tags: [],
  };
}

function emptyEventDraft() {
  return {
    title: '',
    notes: '',
    date: todayStr(),
    time: defaultEventTime(),
    duration: 30,
    remindMinutes: 10,
    allDay: false,
    tags: [],
    dateHint: null,
    with: '',
    location: '',
    memoId: null,
    projectId: null,
  };
}

let composeParseTimer = null;

function closeComposePopover() {
  composeState.popover = null;
  composeState.dateField = null;
  composeState.timeField = null;
  const el = $('#compose-popover');
  if (el) {
    el.hidden = true;
    el.replaceChildren();
  }
  $$('.compose-pill.is-active').forEach((p) => p.classList.remove('is-active'));
}

function renderComposeBuckets(container) {
  container.replaceChildren();
  const { draft, editId, editKind, mode } = composeState;
  const memo = editId && editKind === 'memo' ? findMemo(editId) : null;
  const showInbox = memo && mode === 'task' && !memo.priority;

  if (showInbox) {
    const inboxBtn = document.createElement('button');
    inboxBtn.type = 'button';
    inboxBtn.className = `bucket-chip${draft.bucket == null ? ' is-selected' : ''}`;
    inboxBtn.textContent = 'Inbox';
    inboxBtn.title = t('inbox.hold');
    inboxBtn.addEventListener('click', () => {
      composeState.draft.bucket = null;
      renderComposeBuckets(container);
      syncComposePills();
    });
    container.append(inboxBtn);
  }

  BUCKETS.forEach((b) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `bucket-chip bucket-chip-${b.key}${draft.bucket === b.key ? ' is-selected' : ''}`;
    btn.textContent = b.label;
    btn.title = b.sub;
    btn.addEventListener('click', () => {
      composeState.draft.bucket = b.key;
      renderComposeBuckets(container);
      syncComposePills();
    });
    container.append(btn);
  });
}

function renderComposeCalendar(container, selectedDate) {
  renderDateCalendar(container, {
    selectedDate,
    calendarMonth: composeState.calendarMonth,
    onMonthChange: (month) => {
      composeState.calendarMonth = month;
      renderComposeCalendar(container, selectedDate);
    },
    onSelect: applyComposeDate,
  });
}

function applyComposeDate(dateStr) {
  const { dateField } = composeState;
  if (dateField === 'startDate') composeState.draft.startDate = dateStr;
  else if (dateField === 'deadline') composeState.draft.deadline = dateStr;
  else composeState.draft.date = dateStr;
  syncComposePills();
  closeComposePopover();
  if (composeState.expanded) renderComposeExpandedFields();
}

function clearComposeDate() {
  const { dateField } = composeState;
  if (dateField === 'startDate') composeState.draft.startDate = null;
  else if (dateField === 'deadline') composeState.draft.deadline = null;
  syncComposePills();
  closeComposePopover();
}

function clearComposeTaskTime() {
  const { timeField } = composeState;
  if (timeField === 'startTime') composeState.draft.startTime = null;
  else if (timeField === 'deadlineTime') composeState.draft.deadlineTime = null;
  syncComposePills();
  if (composeState.expanded) renderComposeExpandedFields();
  closeComposePopover();
}

// 시간 라벨 — '오후 3:15' (버튼·행 표시용)
function formatComposeTimeLabel(hhmm) {
  if (!hhmm) return t('compose.time.none');
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h >= 12 ? t('compose.time.pm') : t('compose.time.am');
  const h12 = ((h + 11) % 12) + 1;
  return `${ap} ${h12}:${String(m).padStart(2, '0')}`;
}

// DS 타임피커 — 오전/오후 세그 + 시(1–12) 그리드 + 15분 단위 칩.
// 네이티브 input[type=time](파란 휠) 대체 — 갤러리 DS '날짜·시간 선택' 스펙.
function fillTimePickerPopover(pop, { value, onChange }) {
  let ap = 'PM';
  let h12 = null;
  let mm = null;
  if (value && /^\d{1,2}:\d{2}$/.test(value)) {
    const [h24, m] = value.split(':').map(Number);
    ap = h24 >= 12 ? 'PM' : 'AM';
    h12 = ((h24 + 11) % 12) + 1;
    mm = String((Math.round(m / 15) * 15) % 60).padStart(2, '0');
  }
  const emit = () => {
    if (h12 === null) return;
    let h = h12 % 12;
    if (ap === 'PM') h += 12;
    onChange(`${String(h).padStart(2, '0')}:${mm || '00'}`);
  };
  const seg = document.createElement('div');
  seg.className = 'tp-seg';
  const segBtns = [['AM', t('compose.time.am')], ['PM', t('compose.time.pm')]].map(([key, lab]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = lab;
    b.addEventListener('click', () => { ap = key; sync(); emit(); });
    seg.append(b);
    return [key, b];
  });
  const grid = document.createElement('div');
  grid.className = 'tp-hgrid';
  const hourBtns = [];
  for (let h = 1; h <= 12; h += 1) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tp-hcell';
    b.textContent = String(h);
    b.addEventListener('click', () => { h12 = h; if (mm === null) mm = '00'; sync(); emit(); });
    hourBtns.push([h, b]);
    grid.append(b);
  }
  const mrow = document.createElement('div');
  mrow.className = 'tp-mrow';
  const minBtns = ['00', '15', '30', '45'].map((m) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tp-mchip';
    b.textContent = `${m}${t('compose.time.min')}`;
    b.addEventListener('click', () => { mm = m; if (h12 === null) h12 = ap === 'PM' ? 3 : 9; sync(); emit(); });
    mrow.append(b);
    return [m, b];
  });
  function sync() {
    segBtns.forEach(([k, b]) => b.classList.toggle('is-selected', k === ap));
    hourBtns.forEach(([h, b]) => b.classList.toggle('is-selected', h === h12));
    minBtns.forEach(([m, b]) => b.classList.toggle('is-selected', m === mm));
  }
  sync();
  pop.append(seg, grid, mrow);
}

function renderComposeTimePopover(pop) {
  const { mode, timeField, draft } = composeState;
  const isTaskTime = mode === 'task' && (timeField === 'startTime' || timeField === 'deadlineTime');
  const labelText = isTaskTime
    ? (timeField === 'startTime' ? t('compose.time.start') : t('compose.time.deadline'))
    : t('compose.time.label');

  const lbl = document.createElement('p');
  lbl.className = 'compose-pop-label';
  lbl.textContent = labelText;
  pop.append(lbl);

  fillTimePickerPopover(pop, {
    value: isTaskTime ? (draft[timeField] || '') : (draft.time || defaultEventTime()),
    onChange: (v) => {
      if (isTaskTime) {
        composeState.draft[timeField] = v;
      } else {
        composeState.draft.time = v;
        composeState.draft.allDay = false;
      }
      syncComposePills();
      if (composeState.expanded) renderComposeExpandedFields();
    },
  });

  if (isTaskTime) {
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'compose-pop-link';
    clearBtn.textContent = t('compose.time.none');
    clearBtn.addEventListener('click', clearComposeTaskTime);
    pop.append(clearBtn);
  } else {
    const allDayBtn = document.createElement('button');
    allDayBtn.type = 'button';
    allDayBtn.className = `compose-option${draft.allDay ? ' is-selected' : ''}`;
    allDayBtn.textContent = t('allday.btn');
    allDayBtn.addEventListener('click', () => {
      composeState.draft.allDay = true;
      syncComposePills();
      if (composeState.expanded) renderComposeExpandedFields();
      closeComposePopover();
    });
    pop.append(allDayBtn);
  }
}

function renderComposePopover() {
  const pop = $('#compose-popover');
  if (!pop || !composeState.popover) return;
  pop.replaceChildren();
  const { popover, draft, dateField } = composeState;

  if (popover === 'moscow') {
    const hint = document.createElement('p');
    hint.className = 'compose-pop-hint';
    hint.textContent = t('moscow.compose.must.hint');
    const row = document.createElement('div');
    row.className = 'sheet-bucket-row';
    renderComposeBuckets(row);
    pop.append(hint, row);
    return;
  }

  if (popover === 'date') {
    const dateLabels = { startDate: t('compose.date.start'), deadline: t('compose.date.deadline'), event: t('compose.date.event') };
    const fieldKey = dateField === 'deadline' || dateField === 'startDate' ? dateField : 'event';
    const selected = dateField === 'deadline' ? draft.deadline
      : dateField === 'startDate' ? draft.startDate
        : draft.date;
    fillDatePickerPopover(pop, {
      label: dateLabels[fieldKey] || t('compose.date.event'),
      selectedDate: selected,
      calendarMonth: composeState.calendarMonth,
      onSelect: applyComposeDate,
      onMonthChange: (month) => {
        composeState.calendarMonth = month;
        renderComposePopover();
      },
      onClear: clearComposeDate,
      showClear: dateField === 'deadline' || dateField === 'startDate',
    });
    return;
  }

  if (popover === 'time') {
    renderComposeTimePopover(pop);
    return;
  }

  if (popover === 'reminder') {
    const label = document.createElement('p');
    label.className = 'compose-pop-label';
    label.textContent = t('compose.reminder');
    pop.append(label);
    const list = document.createElement('div');
    list.className = 'compose-option-list';
    COMPOSE_REMIND_OPTIONS.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const active = (draft.remindMinutes ?? 10) === opt.value;
      btn.className = `compose-option${active ? ' is-selected' : ''}`;
      btn.textContent = formatRemindLabel(opt.value);
      btn.addEventListener('click', () => {
        composeState.draft.remindMinutes = opt.value;
        syncComposePills();
        closeComposePopover();
      });
      list.append(btn);
    });
    pop.append(list);
    return;
  }

  if (popover === 'duration' || popover === 'event-duration') {
    const label = document.createElement('p');
    label.className = 'compose-pop-label';
    label.textContent = t('compose.duration.label');
    pop.append(label);
    const list = document.createElement('div');
    list.className = 'compose-option-list';
    const current = popover === 'duration' ? draft.durationMinutes : draft.duration;
    DURATION_PRESETS.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `compose-option${current === opt.minutes ? ' is-selected' : ''}`;
      btn.textContent = formatDurationLabel(opt.minutes);
      btn.addEventListener('click', () => {
        if (popover === 'duration') composeState.draft.durationMinutes = opt.minutes;
        else composeState.draft.duration = opt.minutes;
        syncComposePills();
        closeComposePopover();
      });
      list.append(btn);
    });
    pop.append(list);
    if (popover === 'duration') {
      const suggestBtn = document.createElement('button');
      suggestBtn.type = 'button';
      suggestBtn.className = 'compose-pop-link';
      suggestBtn.textContent = t('compose.duration.suggest');
      suggestBtn.addEventListener('click', async () => {
        const title = draft.title || $('#compose-title')?.value || '';
        let minutes = null;
        let reason = null;
        if (AlfredoAI.hasKey(state.settings)) {
          suggestBtn.textContent = t('compose.duration.suggesting');
          try {
            const est = await AlfredoAI.estimateDuration(state.settings, title);
            if (est) { minutes = est.minutes; reason = est.reason; }
          } catch { /* 로컬 폴백 */ }
          suggestBtn.textContent = t('compose.duration.suggest');
        }
        if (minutes == null) { const s = suggestDurationLocal(title); minutes = s.minutes; reason = s.reason; }
        composeState.draft.durationMinutes = minutes;
        composeState.draft.durationReason = reason || null;
        syncComposePills();
        closeComposePopover();
        toast(reason ? `${formatDurationLabel(minutes)} — ${reason}` : `${formatDurationLabel(minutes)}`);
      });
      pop.append(suggestBtn);
    }
  }
}

function toggleComposePopover(kind, field = null) {
  const dateField = kind === 'date' ? (field || null) : null;
  const timeField = kind === 'time' ? (field || null) : null;
  if (composeState.popover === kind && composeState.dateField === dateField && composeState.timeField === timeField) {
    closeComposePopover();
    return;
  }
  composeState.popover = kind;
  composeState.dateField = dateField;
  composeState.timeField = timeField;
  if (kind === 'date') {
    const sel = dateField === 'deadline' ? composeState.draft.deadline
      : dateField === 'startDate' ? composeState.draft.startDate
        : composeState.draft.date;
    composeState.calendarMonth = sel || todayStr();
  }
  $$('.compose-pill.is-active').forEach((p) => p.classList.remove('is-active'));
  if (kind === 'moscow') $('#compose-pill-moscow')?.classList.add('is-active');
  else if (kind === 'reminder') $('#compose-pill-reminder')?.classList.add('is-active');
  else if (dateField === 'startDate') $('#compose-pill-start-date')?.classList.add('is-active');
  else if (dateField === 'deadline') $('#compose-pill-deadline')?.classList.add('is-active');
  else if (timeField === 'startTime') $('#compose-pill-start-time')?.classList.add('is-active');
  else if (timeField === 'deadlineTime') $('#compose-pill-deadline-time')?.classList.add('is-active');
  else if (kind === 'time') $('#compose-pill-time')?.classList.add('is-active');
  else if (kind === 'date') $('#compose-pill-date')?.classList.add('is-active');
  else if (kind === 'duration') $('#compose-pill-duration')?.classList.add('is-active');
  else if (kind === 'event-duration') $('#compose-pill-event-duration')?.classList.add('is-active');
  const pop = $('#compose-popover');
  pop.hidden = false;
  renderComposePopover();
}

function syncComposeNotesUI() {
  const notesEl = $('#compose-notes');
  const toggle = $('#btn-compose-notes-toggle');
  const { draft, notesOpen } = composeState;
  const hasNotes = Boolean(draft.notes?.trim());
  const show = notesOpen || hasNotes;
  if (notesEl) {
    notesEl.hidden = !show;
    notesEl.value = draft.notes || '';
  }
  if (toggle) toggle.textContent = show ? t('compose.notes.hide') : t('compose.notes.show');
}

function syncComposePills() {
  const { mode, draft } = composeState;
  const moscowPill = $('#compose-pill-moscow');
  const deadlinePill = $('#compose-pill-deadline');
  const datePill = $('#compose-pill-date');
  const timePill = $('#compose-pill-time');
  const reminderPill = $('#compose-pill-reminder');

  if (moscowPill) {
    const label = draft.bucket == null
      ? 'Inbox'
      : (BUCKETS.find((b) => b.key === draft.bucket)?.label || 'MoSCoW');
    moscowPill.textContent = `${label}`;
    moscowPill.hidden = mode !== 'task';
  }
  if (deadlinePill) {
    deadlinePill.textContent = draft.deadline
      ? `${formatComposeDateWithWeekday(draft.deadline, draft.deadlineHint)}`
      : t('compose.pill.deadline');
    deadlinePill.hidden = mode !== 'task';
  }
  const startDatePill = $('#compose-pill-start-date');
  if (startDatePill) {
    startDatePill.textContent = draft.startDate
      ? `${formatComposeDateWithWeekday(draft.startDate)}`
      : t('compose.pill.start.date');
    startDatePill.hidden = mode !== 'task';
  }
  const startTimePill = $('#compose-pill-start-time');
  if (startTimePill) {
    startTimePill.textContent = draft.startTime ? `${draft.startTime}` : t('compose.pill.start.time');
    startTimePill.hidden = mode !== 'task';
  }
  const deadlineTimePill = $('#compose-pill-deadline-time');
  if (deadlineTimePill) {
    deadlineTimePill.textContent = draft.deadlineTime ? `${draft.deadlineTime}` : t('compose.pill.deadline.time');
    deadlineTimePill.hidden = mode !== 'task';
  }
  if (datePill) {
    const dateLabel = formatComposeDateWithWeekday(draft.date, draft.dateHint);
    datePill.textContent = `${dateLabel}`;
    datePill.hidden = mode !== 'event';
  }
  if (timePill) {
    timePill.textContent = draft.allDay ? t('compose.pill.allday') : `${draft.time}`;
    timePill.hidden = mode !== 'event';
  }
  if (reminderPill) {
    reminderPill.textContent = `${formatRemindLabel(draft.remindMinutes)}`;
    reminderPill.hidden = mode !== 'event';
  }
  const durationPill = $('#compose-pill-duration');
  if (durationPill) {
    durationPill.textContent = draft.durationMinutes
      ? `${formatDurationLabel(draft.durationMinutes)}`
      : t('compose.pill.duration');
    durationPill.hidden = mode !== 'task';
  }
  const eventDurationPill = $('#compose-pill-event-duration');
  if (eventDurationPill) {
    eventDurationPill.textContent = `${formatDurationLabel(draft.duration || 30)}`;
    eventDurationPill.hidden = mode !== 'event';
  }
}

function renderComposeTags() {
  const el = $('#compose-tags');
  if (!el) return;
  const tags = composeState.draft.tags || [];
  el.hidden = !tags.length;
  el.replaceChildren();
  tags.forEach((t) => {
    const chip = document.createElement('span');
    chip.className = 'compose-tag';
    chip.textContent = `${t.icon} ${t.label}`;
    el.append(chip);
  });
}

function applyComposeParse() {
  const raw = $('#compose-title')?.value?.trim();
  if (!raw || raw.length < 2) {
    renderComposeTags();
    return;
  }
  const parsed = AlfredoTags.parseComposeInput(raw, todayStr());
  if (!parsed) return;

  const { mode, draft } = composeState;
  let changed = false;

  if (parsed.title && parsed.title !== raw) {
    composeState.draft.title = parsed.title;
    $('#compose-title').value = parsed.title;
    changed = true;
  }

  if (parsed.date) {
    if (mode === 'task') {
      composeState.draft.deadline = parsed.date;
      composeState.draft.deadlineHint = parsed.dateHint;
    } else {
      composeState.draft.date = parsed.date;
      composeState.draft.dateHint = parsed.dateHint;
    }
    changed = true;
  }

  if (parsed.time) {
    if (mode === 'task') {
      composeState.draft.deadlineTime = parsed.time;
    } else {
      composeState.draft.time = parsed.time;
      composeState.draft.allDay = false;
    }
    changed = true;
  } else if (parsed.allDay && mode === 'event') {
    composeState.draft.allDay = true;
    changed = true;
  }

  if (parsed.bucket && mode === 'task') {
    composeState.draft.bucket = parsed.bucket;
    changed = true;
  }

  if (parsed.tags.length) {
    composeState.draft.tags = parsed.tags;
    changed = true;
  }

  if (changed) {
    renderComposeTags();
    syncComposePills();
  }
}

function makeExpRow(label, content) {
  const row = document.createElement('div');
  row.className = 'compose-exp-row';
  const lbl = document.createElement('span');
  lbl.className = 'compose-exp-label';
  lbl.textContent = label;
  row.append(lbl, content);
  return row;
}

function renderComposeExpandedFields() {
  const container = $('#compose-expanded-fields');
  if (!container) return;
  container.replaceChildren();
  const { mode, draft } = composeState;

  if (mode === 'event') {
    // 날짜
    const dateBtn = document.createElement('button');
    dateBtn.type = 'button';
    dateBtn.className = 'compose-exp-date-btn';
    dateBtn.textContent = draft.date ? formatComposeDateWithWeekday(draft.date) : t('compose.date.select');
    dateBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleComposePopover('date', 'event'); });
    container.append(makeExpRow(t('compose.exp.date'), dateBtn));

    // 시간 + 종일 — DS 타임피커 팝오버로 (네이티브 input[type=time] 제거)
    const timeWrap = document.createElement('div');
    timeWrap.className = 'compose-exp-time-wrap';
    const timeBtn = document.createElement('button');
    timeBtn.type = 'button';
    timeBtn.className = 'compose-exp-date-btn';
    timeBtn.textContent = draft.allDay ? t('compose.time.none') : formatComposeTimeLabel(draft.time || '');
    timeBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleComposePopover('time'); });
    const allDayBtn = document.createElement('button');
    allDayBtn.type = 'button';
    allDayBtn.className = `compose-exp-toggle${draft.allDay ? ' is-active' : ''}`;
    allDayBtn.textContent = t('compose.allday');
    allDayBtn.addEventListener('click', () => {
      composeState.draft.allDay = !composeState.draft.allDay;
      allDayBtn.classList.toggle('is-active', composeState.draft.allDay);
      timeBtn.textContent = composeState.draft.allDay ? t('compose.time.none') : formatComposeTimeLabel(composeState.draft.time || '');
      syncComposePills();
    });
    timeWrap.append(timeBtn, allDayBtn);
    container.append(makeExpRow(t('compose.exp.time'), timeWrap));

    // 소요시간
    const durationSel = document.createElement('select');
    durationSel.className = 'compose-exp-select';
    DURATION_PRESETS.forEach((opt) => {
      const o = document.createElement('option');
      o.value = String(opt.minutes);
      o.textContent = formatDurationLabel(opt.minutes);
      if (opt.minutes === (draft.duration || 30)) o.selected = true;
      durationSel.append(o);
    });
    durationSel.addEventListener('change', () => {
      composeState.draft.duration = Number(durationSel.value);
      syncComposePills();
    });
    container.append(makeExpRow(t('compose.exp.duration'), durationSel));

    // 누구랑
    const withInp = document.createElement('input');
    withInp.type = 'text';
    withInp.className = 'compose-exp-text';
    withInp.placeholder = t('compose.with.placeholder');
    withInp.value = draft.with || '';
    withInp.addEventListener('input', () => { composeState.draft.with = withInp.value; });
    container.append(makeExpRow(t('compose.exp.with'), withInp));

    // 어디서
    const locInp = document.createElement('input');
    locInp.type = 'text';
    locInp.className = 'compose-exp-text';
    locInp.placeholder = t('compose.location.placeholder');
    locInp.value = draft.location || '';
    locInp.addEventListener('input', () => { composeState.draft.location = locInp.value; });
    container.append(makeExpRow(t('compose.exp.location'), locInp));

    // 알림
    const remSel = document.createElement('select');
    remSel.className = 'compose-exp-select';
    COMPOSE_REMIND_OPTIONS.forEach((opt) => {
      const o = document.createElement('option');
      o.value = String(opt.value);
      o.textContent = formatRemindLabel(opt.value);
      if (opt.value === (draft.remindMinutes ?? 10)) o.selected = true;
      remSel.append(o);
    });
    remSel.addEventListener('change', () => {
      composeState.draft.remindMinutes = Number(remSel.value);
      syncComposePills();
    });
    container.append(makeExpRow(t('compose.exp.reminder'), remSel));
  }

  if (mode === 'task') {
    // MoSCoW
    const bucketWrap = document.createElement('div');
    bucketWrap.className = 'compose-exp-bucket-wrap';
    renderComposeBuckets(bucketWrap);
    container.append(makeExpRow(t('compose.exp.priority'), bucketWrap));

    // 시작일
    const startDateBtn = document.createElement('button');
    startDateBtn.type = 'button';
    startDateBtn.className = 'compose-exp-date-btn';
    startDateBtn.textContent = draft.startDate ? formatComposeDateWithWeekday(draft.startDate) : t('compose.date.none');
    startDateBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleComposePopover('date', 'startDate'); });
    container.append(makeExpRow(t('compose.exp.start.date'), startDateBtn));

    // 시작 시간 — DS 타임피커 팝오버로
    const startTimeBtn = document.createElement('button');
    startTimeBtn.type = 'button';
    startTimeBtn.className = 'compose-exp-date-btn';
    startTimeBtn.textContent = formatComposeTimeLabel(draft.startTime || '');
    startTimeBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleComposePopover('time', 'startTime'); });
    container.append(makeExpRow(t('compose.exp.start.time'), startTimeBtn));

    // 마감일
    const deadlineBtn = document.createElement('button');
    deadlineBtn.type = 'button';
    deadlineBtn.className = 'compose-exp-date-btn';
    deadlineBtn.textContent = draft.deadline ? formatComposeDateWithWeekday(draft.deadline) : t('compose.date.none');
    deadlineBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleComposePopover('date', 'deadline'); });
    container.append(makeExpRow(t('compose.exp.deadline.date'), deadlineBtn));

    // 마감 시간 — DS 타임피커 팝오버로
    const deadlineTimeBtn = document.createElement('button');
    deadlineTimeBtn.type = 'button';
    deadlineTimeBtn.className = 'compose-exp-date-btn';
    deadlineTimeBtn.textContent = formatComposeTimeLabel(draft.deadlineTime || '');
    deadlineTimeBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleComposePopover('time', 'deadlineTime'); });
    container.append(makeExpRow(t('compose.exp.deadline.time'), deadlineTimeBtn));

    // 소요시간
    const durSel = document.createElement('select');
    durSel.className = 'compose-exp-select';
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = t('compose.none');
    if (!draft.durationMinutes) noneOpt.selected = true;
    durSel.append(noneOpt);
    DURATION_PRESETS.forEach((opt) => {
      const o = document.createElement('option');
      o.value = String(opt.minutes);
      o.textContent = formatDurationLabel(opt.minutes);
      if (opt.minutes === draft.durationMinutes) o.selected = true;
      durSel.append(o);
    });
    durSel.addEventListener('change', () => {
      composeState.draft.durationMinutes = durSel.value ? Number(durSel.value) : null;
      syncComposePills();
    });
    container.append(makeExpRow(t('compose.exp.task.duration'), durSel));
  }
}

function syncComposeExpandedUI() {
  const { expanded, mode } = composeState;
  const container = $('#compose-expanded-fields');
  const pillsEl = document.querySelector('.compose-pills');
  const eventMeta = $('#compose-event-meta');
  const expandBtn = $('#btn-compose-expand');

  if (container) container.hidden = !expanded;
  if (pillsEl) pillsEl.hidden = expanded;
  if (eventMeta) eventMeta.hidden = expanded || mode !== 'event';
  if (expandBtn) expandBtn.textContent = expanded ? t('compose.collapse') : t('compose.expand');

  if (expanded) renderComposeExpandedFields();
}

function scheduleComposeParse() {
  clearTimeout(composeParseTimer);
  composeParseTimer = setTimeout(applyComposeParse, 420);
}

function syncComposeUI() {
  const { mode, editId, draft } = composeState;
  const isEdit = Boolean(editId);

  $$('.compose-tab').forEach((tab) => {
    const active = tab.dataset.composeMode === mode;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });

  $('#compose-title').value = draft.title;
  $('#compose-title').placeholder = mode === 'task' ? t('compose.task.placeholder') : t('compose.event.placeholder');
  composeState.notesOpen = Boolean(draft.notes?.trim());
  syncComposeNotesUI();
  syncComposePills();
  renderComposeTags();
  closeComposePopover();

  const eventMeta = $('#compose-event-meta');
  if (eventMeta) {
    eventMeta.hidden = mode !== 'event';
    if (mode === 'event') {
      $('#compose-with').value = draft.with || '';
      $('#compose-location').value = draft.location || '';
    }
  }

  const saveBtn = $('#btn-compose-save');
  if (saveBtn) saveBtn.textContent = isEdit ? t('compose.save') : t('compose.add');

  syncComposeExpandedUI();
}

function readComposeDraftFromForm() {
  composeState.draft.title = $('#compose-title').value;
  composeState.draft.notes = $('#compose-notes').value.trim();
  // compact meta inputs only readable when not in expanded mode (expanded fields update draft directly)
  if (composeState.mode === 'event' && !composeState.expanded) {
    composeState.draft.with = $('#compose-with')?.value.trim() || '';
    composeState.draft.location = $('#compose-location')?.value.trim() || '';
  }
}

function setComposeMode(mode) {
  if (composeState.mode === mode) return;
  readComposeDraftFromForm();
  const { draft } = composeState;
  const shared = { title: draft.title, notes: draft.notes };
  composeState.mode = mode;
  composeState.draft = mode === 'task'
    ? {
      ...emptyTaskDraft(),
      ...shared,
      bucket: draft.bucket ?? 'must',
      startDate: draft.startDate ?? null,
      startTime: draft.startTime ?? null,
      // 일정→할 일: 일정의 날짜/시간을 마감으로 이어받아 캘린더에서 사라지지 않게
      deadline: draft.deadline ?? draft.date ?? null,
      deadlineTime: draft.deadlineTime ?? (draft.allDay ? null : draft.time) ?? null,
      deadlineHint: draft.deadlineHint ?? draft.dateHint ?? null,
      durationMinutes: draft.durationMinutes ?? null,
      projectId: draft.projectId ?? null,   // 프로젝트 소속 유지 (모드 왕복 시 유실 방지)
      tags: draft.tags || [],
    }
    : {
      ...emptyEventDraft(),
      ...shared,
      // 할 일→일정: 마감/시작일을 일정 날짜로 이어받음
      date: draft.date ?? draft.deadline ?? draft.startDate ?? todayStr(),
      dateHint: draft.dateHint ?? draft.deadlineHint ?? null,
      time: draft.time ?? draft.deadlineTime ?? draft.startTime ?? defaultEventTime(),
      duration: draft.duration ?? 30,
      remindMinutes: draft.remindMinutes ?? 10,
      allDay: draft.allDay ?? false,
      bucket: draft.bucket ?? 'must',        // 왕복(할일→일정→할일) 시 버킷 복원용으로 보존
      projectId: draft.projectId ?? null,    // 프로젝트 소속 유지 (일정도 프로젝트에 속할 수 있음)
      tags: draft.tags || [],
    };
  syncComposeUI();
}

function openCompose(opts = {}) {
  // 일반적인 열림은 '임시 선택'이 아님 — 캘린더 단일 탭에서만 이후 true로 설정
  if (typeof calComposeTentative !== 'undefined') calComposeTentative = false;
  const mode = opts.mode || 'task';
  const editId = opts.editId || null;

  composeState.mode = mode;
  composeState.editId = editId;
  composeState.editKind = opts.editKind || null;
  composeState.originalEditKind = null;
  composeState.notesOpen = false;
  composeState.expanded = false;
  closeComposePopover();

  if (editId && mode === 'task') {
    const m = findMemo(editId);
    if (!m) return;
    composeState.editKind = 'memo';
    composeState.originalEditKind = 'memo';
    composeState.draft = {
      title: m.content,
      notes: m.notes || '',
      bucket: m.priority ?? null,
      startDate: m.startDate || null,
      startTime: m.startTime || null,
      deadline: m.deadline || null,
      deadlineTime: m.deadlineTime || null,
      durationMinutes: m.durationMinutes ?? null,
      tags: m.tags || [],
      deadlineHint: m.deadline ? formatComposeDateWithWeekday(m.deadline) : null,
    };
    composeState.notesOpen = Boolean(m.notes?.trim());
  } else if (editId && mode === 'event') {
    const t = state.timeline.find((x) => x.id === editId);
    if (!t) return;
    composeState.editKind = 'event';
    composeState.originalEditKind = 'event';
    composeState.draft = {
      title: t.title,
      notes: t.notes || '',
      date: t.date || todayStr(),
      time: t.time || defaultEventTime(),
      duration: t.duration || 30,
      remindMinutes: t.remindMinutes ?? 10,
      allDay: Boolean(t.allDay),
      tags: t.tags || [],
      dateHint: t.date ? formatComposeDateWithWeekday(t.date) : null,
      with: t.with || '',
      location: t.location || '',
      memoId: t.memoId || null,
    };
    composeState.notesOpen = Boolean(t.notes?.trim());
  } else if (mode === 'task') {
    composeState.draft = { ...emptyTaskDraft(), ...(opts.preset || {}) };
    if (opts.preset?.deadline) {
      composeState.draft.deadlineHint = formatComposeDateWithWeekday(opts.preset.deadline);
    }
  } else {
    composeState.draft = { ...emptyEventDraft(), ...(opts.preset || {}) };
    if (opts.preset?.date) {
      composeState.draft.dateHint = formatComposeDateWithWeekday(opts.preset.date);
    }
  }

  $('#compose-sheet').hidden = false;
  syncComposeUI();
  setTimeout(() => $('#compose-title').focus(), 60);
}

function closeCompose() {
  closeComposePopover();
  $('#compose-sheet').hidden = true;
  composeState.editId = null;
  composeState.editKind = null;
  composeState.originalEditKind = null;
  composeState.notesOpen = false;
  // 날짜 단일 탭으로 열린 compose를 저장 없이 닫음 → 선택 해제(오늘 복귀)
  if (typeof calComposeTentative !== 'undefined' && calComposeTentative) {
    calComposeTentative = false;
    if (state?.ui?.route === 'calendar' && typeof clearCalendarSelectedDay === 'function') {
      clearCalendarSelectedDay();
      persist();
      if (typeof renderCalendarView === 'function') renderCalendarView();
    }
  }
}

async function saveCompose() {
  // 저장 시엔 선택을 유지 (닫혀도 오늘로 복귀하지 않도록)
  if (typeof calComposeTentative !== 'undefined') calComposeTentative = false;
  applyComposeParse();
  readComposeDraftFromForm();
  const { mode, editId, draft, originalEditKind } = composeState;
  const title = draft.title.trim();
  if (!title) {
    toast(t('compose.toast.title.required'));
    return;
  }

  const time = draft.time || defaultEventTime();
  const [h, mi] = time.split(':').map(Number);
  const eventFields = {
    title,
    notes: draft.notes || null,
    date: draft.date,
    time: draft.allDay ? '00:00' : time,
    duration: draft.duration || 30,
    remindMinutes: draft.remindMinutes ?? 10,
    allDay: Boolean(draft.allDay),
    tags: draft.tags?.length ? draft.tags : null,
    sortOrder: draft.allDay ? 0 : h * 60 + (mi || 0),
    with: draft.with?.trim() || null,
    location: draft.location?.trim() || null,
    memoId: draft.memoId || null,
    projectId: draft.projectId || null,
  };

  if (editId && originalEditKind === 'memo' && mode === 'event') {
    removeMemoFromState(editId);
    state.timeline.push({
      id: AlfredoStorage.uid(),
      completed: false,
      domain: 'local',
      ...eventFields,
    });
    await persist();
    closeCompose();
    renderAll();
    toast(t('compose.toast.changed.event'));
    return;
  }

  if (editId && originalEditKind === 'event' && mode === 'task') {
    state.timeline = state.timeline.filter((x) => x.id !== editId);
    const bucket = draft.bucket || 'must';
    const id = AlfredoStorage.uid();
    state.memos.push(buildMemoPayload(title, draft, bucket, id));
    const order = getBucketOrder(bucket);
    if (!order.includes(id)) order.push(id);
    await persist();
    closeCompose();
    renderAll();
    toast(t('compose.toast.changed.task'));
    return;
  }

  if (mode === 'task') {
    if (editId) {
      const m = findMemo(editId);
      if (!m) return;
      m.content = title;
      m.notes = draft.notes || null;
      m.startDate = draft.startDate || null;
      m.startTime = draft.startTime || null;
      m.deadline = draft.deadline || null;
      m.deadlineTime = draft.deadlineTime || null;
      if (draft.projectId !== undefined) m.projectId = draft.projectId || null;
      if (draft.durationMinutes) {
        m.durationMinutes = draft.durationMinutes;
        m.durationSource = 'user';
        if (draft.durationReason) m.durationReason = draft.durationReason;
      }
      m.tags = draft.tags?.length ? draft.tags : null;
      const prev = m.priority;
      m.priority = draft.bucket;
      if (draft.bucket !== prev) {
        m.suggestedPriority = null;
        m.suggestReason = null;
        if (draft.bucket) {
          const order = getBucketOrder(draft.bucket);
          if (!order.includes(m.id)) order.push(m.id);
        }
      }
      await persist();
      closeCompose();
      renderAll();
      if (!draft.bucket) {
        m.suggestedPriority = null;
        m.suggestReason = null;
        scheduleInboxSuggestions([editId]);
      }
      toast(t('compose.toast.task.saved'));
      return;
    }

    const id = AlfredoStorage.uid();
    const bucket = draft.bucket || 'must';
    state.memos.push(buildMemoPayload(title, draft, bucket, id));
    const order = getBucketOrder(bucket);
    if (!order.includes(id)) order.push(id);
    await persist();
    closeCompose();
    renderAll();
    toast(t('compose.toast.task.added'));
    return;
  }

  if (editId) {
    const t = state.timeline.find((x) => x.id === editId);
    if (!t) return;
    Object.assign(t, eventFields);
    await persist();
    closeCompose();
    renderAll();
    scheduleAlarms();
    toast(t('compose.toast.event.saved'));
    return;
  }

  state.timeline.push({
    id: AlfredoStorage.uid(),
    completed: false,
    domain: 'local',
    ...eventFields,
  });
  await persist();
  closeCompose();
  renderAll();
  scheduleAlarms();
  toast(t('compose.toast.event.added'));
}

function bindComposeEvents() {
  $$('.compose-tab').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.stopPropagation();
      setComposeMode(tab.dataset.composeMode);
    });
  });
  $('#btn-compose-cancel')?.addEventListener('click', closeCompose);
  $('#btn-compose-save')?.addEventListener('click', saveCompose);
  $('#btn-compose-expand')?.addEventListener('click', (e) => {
    e.stopPropagation();
    composeState.expanded = !composeState.expanded;
    syncComposeExpandedUI();
  });
  $('#compose-sheet')?.addEventListener('click', (e) => {
    if (e.target.id === 'compose-sheet') closeCompose();
  });
  $('#compose-body')?.addEventListener('click', (e) => {
    if (!e.target.closest('#compose-popover') && !e.target.closest('.compose-pill')) {
      closeComposePopover();
    }
  });
  $('#compose-title')?.addEventListener('input', scheduleComposeParse);
  $('#compose-title')?.addEventListener('blur', applyComposeParse);
  $('#compose-title')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      saveCompose();
    }
    if (e.key === 'Escape') closeCompose();
  });
  $('#btn-compose-notes-toggle')?.addEventListener('click', () => {
    composeState.notesOpen = !composeState.notesOpen;
    syncComposeNotesUI();
    if (composeState.notesOpen) $('#compose-notes').focus();
  });
  $('#compose-pill-moscow')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleComposePopover('moscow');
  });
  $('#compose-pill-deadline')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleComposePopover('date', 'deadline');
  });
  $('#compose-pill-start-date')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleComposePopover('date', 'startDate');
  });
  $('#compose-pill-start-time')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleComposePopover('time', 'startTime');
  });
  $('#compose-pill-deadline-time')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleComposePopover('time', 'deadlineTime');
  });
  $('#compose-pill-date')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleComposePopover('date', 'event');
  });
  $('#compose-pill-time')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleComposePopover('time');
  });
  $('#compose-pill-reminder')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleComposePopover('reminder');
  });
  $('#compose-pill-duration')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleComposePopover('duration');
  });
  $('#compose-pill-event-duration')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleComposePopover('event-duration');
  });
}

function addTask() {
  openCompose({ mode: 'task' });
}

function addTimelineEvent() {
  openCompose({ mode: 'event' });
}
