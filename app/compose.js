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
  closeComposePopover();
}

function renderComposeTimePopover(pop) {
  const { mode, timeField, draft } = composeState;
  const isTaskTime = mode === 'task' && (timeField === 'startTime' || timeField === 'deadlineTime');
  const labelText = isTaskTime
    ? (timeField === 'startTime' ? t('compose.time.start') : t('compose.time.deadline'))
    : t('compose.time.label');

  const label = document.createElement('label');
  label.className = 'field';
  const lbl = document.createElement('span');
  lbl.className = 'field-label';
  lbl.textContent = labelText;
  const inp = document.createElement('input');
  inp.type = 'time';
  inp.id = 'compose-pop-time';
  if (isTaskTime) {
    inp.value = draft[timeField] || '';
  } else {
    inp.value = draft.time || defaultEventTime();
  }
  inp.addEventListener('change', () => {
    if (isTaskTime) {
      composeState.draft[timeField] = inp.value || null;
    } else {
      composeState.draft.time = inp.value;
      composeState.draft.allDay = false;
    }
    syncComposePills();
  });
  label.append(lbl, inp);
  pop.append(label);

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
      closeComposePopover();
    });
    pop.append(allDayBtn);
  }
  setTimeout(() => inp.focus(), 40);
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
        toast(reason ? `⏱️ ${formatDurationLabel(minutes)} — ${reason}` : `⏱️ ${formatDurationLabel(minutes)}`);
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
    moscowPill.textContent = `🎯 ${label}`;
    moscowPill.hidden = mode !== 'task';
  }
  if (deadlinePill) {
    deadlinePill.textContent = draft.deadline
      ? `📅 ${formatComposeDateWithWeekday(draft.deadline, draft.deadlineHint)}`
      : t('compose.pill.deadline');
    deadlinePill.hidden = mode !== 'task';
  }
  const startDatePill = $('#compose-pill-start-date');
  if (startDatePill) {
    startDatePill.textContent = draft.startDate
      ? `📅 ${formatComposeDateWithWeekday(draft.startDate)}`
      : t('compose.pill.start.date');
    startDatePill.hidden = mode !== 'task';
  }
  const startTimePill = $('#compose-pill-start-time');
  if (startTimePill) {
    startTimePill.textContent = draft.startTime ? `⏰ ${draft.startTime}` : t('compose.pill.start.time');
    startTimePill.hidden = mode !== 'task';
  }
  const deadlineTimePill = $('#compose-pill-deadline-time');
  if (deadlineTimePill) {
    deadlineTimePill.textContent = draft.deadlineTime ? `⏰ ${draft.deadlineTime}` : t('compose.pill.deadline.time');
    deadlineTimePill.hidden = mode !== 'task';
  }
  if (datePill) {
    const dateLabel = formatComposeDateWithWeekday(draft.date, draft.dateHint);
    datePill.textContent = `📅 ${dateLabel}`;
    datePill.hidden = mode !== 'event';
  }
  if (timePill) {
    timePill.textContent = draft.allDay ? t('compose.pill.allday') : `⏰ ${draft.time}`;
    timePill.hidden = mode !== 'event';
  }
  if (reminderPill) {
    reminderPill.textContent = `🔔 ${formatRemindLabel(draft.remindMinutes)}`;
    reminderPill.hidden = mode !== 'event';
  }
  const durationPill = $('#compose-pill-duration');
  if (durationPill) {
    durationPill.textContent = draft.durationMinutes
      ? `⏱️ ${formatDurationLabel(draft.durationMinutes)}`
      : t('compose.pill.duration');
    durationPill.hidden = mode !== 'task';
  }
  const eventDurationPill = $('#compose-pill-event-duration');
  if (eventDurationPill) {
    eventDurationPill.textContent = `⏱️ ${formatDurationLabel(draft.duration || 30)}`;
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

    // 시간 + 종일
    const timeWrap = document.createElement('div');
    timeWrap.className = 'compose-exp-time-wrap';
    const timeInp = document.createElement('input');
    timeInp.type = 'time';
    timeInp.className = 'compose-exp-time';
    timeInp.value = draft.allDay ? '' : (draft.time || '');
    timeInp.disabled = Boolean(draft.allDay);
    timeInp.addEventListener('change', () => {
      composeState.draft.time = timeInp.value;
      composeState.draft.allDay = false;
      syncComposePills();
    });
    const allDayBtn = document.createElement('button');
    allDayBtn.type = 'button';
    allDayBtn.className = `compose-exp-toggle${draft.allDay ? ' is-active' : ''}`;
    allDayBtn.textContent = t('compose.allday');
    allDayBtn.addEventListener('click', () => {
      composeState.draft.allDay = !composeState.draft.allDay;
      timeInp.disabled = composeState.draft.allDay;
      allDayBtn.classList.toggle('is-active', composeState.draft.allDay);
      syncComposePills();
    });
    timeWrap.append(timeInp, allDayBtn);
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

    // 시작 시간
    const startTimeInp = document.createElement('input');
    startTimeInp.type = 'time';
    startTimeInp.className = 'compose-exp-time';
    startTimeInp.value = draft.startTime || '';
    startTimeInp.addEventListener('change', () => { composeState.draft.startTime = startTimeInp.value || null; syncComposePills(); });
    container.append(makeExpRow(t('compose.exp.start.time'), startTimeInp));

    // 마감일
    const deadlineBtn = document.createElement('button');
    deadlineBtn.type = 'button';
    deadlineBtn.className = 'compose-exp-date-btn';
    deadlineBtn.textContent = draft.deadline ? formatComposeDateWithWeekday(draft.deadline) : t('compose.date.none');
    deadlineBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleComposePopover('date', 'deadline'); });
    container.append(makeExpRow(t('compose.exp.deadline.date'), deadlineBtn));

    // 마감 시간
    const deadlineTimeInp = document.createElement('input');
    deadlineTimeInp.type = 'time';
    deadlineTimeInp.className = 'compose-exp-time';
    deadlineTimeInp.value = draft.deadlineTime || '';
    deadlineTimeInp.addEventListener('change', () => { composeState.draft.deadlineTime = deadlineTimeInp.value || null; syncComposePills(); });
    container.append(makeExpRow(t('compose.exp.deadline.time'), deadlineTimeInp));

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
