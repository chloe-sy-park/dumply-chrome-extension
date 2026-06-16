/* Task / 일정 / 잊지 말 것 디테일 */

'use strict';

let detailState = { kind: null, id: null, dateField: null, calendarMonth: null };
let detailSaveTimer = null;

function getDetailAiReason(item) {
  if (item.placementSource === 'ai' && item.placementReason) {
    return item.placementReason;
  }
  if (item.suggestSource === 'ai' && item.suggestReason) {
    return item.suggestReason;
  }
  return null;
}

function getDetailItem() {
  const { kind, id } = detailState;
  if (kind === 'memo') return findMemo(id);
  if (kind === 'event') return state.timeline.find((x) => x.id === id);
  if (kind === 'remember') return state.remember.find((x) => x.id === id);
  return null;
}

function closeDetailDatePopover() {
  detailState.dateField = null;
  const pop = $('#detail-popover');
  if (pop) {
    pop.hidden = true;
    pop.replaceChildren();
  }
}

function openDetailDatePopover(field) {
  detailState.dateField = field;
  detailState.calendarMonth = null;
  const pop = $('#detail-popover');
  if (!pop) return;
  renderDetailDatePopover();
  pop.hidden = false;
}

function getDetailSelectedDate() {
  const { kind, id, dateField } = detailState;
  const item = getDetailItem();
  if (!item) return null;
  if (dateField === 'startDate') return item.startDate || null;
  if (dateField === 'deadline' || dateField === 'remember-deadline') return item.deadline || null;
  if (dateField === 'date') return item.date || todayStr();
  return null;
}

function applyDetailDate(dateStr) {
  const { kind, dateField } = detailState;
  const item = getDetailItem();
  if (!item) return;
  if (dateField === 'startDate') item.startDate = dateStr;
  else if (dateField === 'deadline' || dateField === 'remember-deadline') item.deadline = dateStr;
  else if (dateField === 'date') item.date = dateStr;
  syncDetailDateButton(dateField, dateStr);
  closeDetailDatePopover();
  if (detailState.kind === 'memo') syncDetailDurationFromTimes();
  scheduleDetailSave();
}

function clearDetailDateField() {
  const { dateField } = detailState;
  const item = getDetailItem();
  if (!item) return;
  if (dateField === 'startDate') item.startDate = null;
  else if (dateField === 'deadline' || dateField === 'remember-deadline') item.deadline = null;
  syncDetailDateButton(dateField, null);
  closeDetailDatePopover();
  if (detailState.kind === 'memo') syncDetailDurationFromTimes();
  scheduleDetailSave();
}

function renderDetailDatePopover() {
  const pop = $('#detail-popover');
  if (!pop) return;
  const { dateField } = detailState;
  const labels = {
    startDate: t('detail.date.label.startDate'),
    deadline: t('detail.date.label.deadline'),
    'remember-deadline': t('detail.date.label.remember-deadline'),
    date: t('detail.date.label.date'),
  };
  fillDatePickerPopover(pop, {
    label: labels[dateField] || t('detail.date.label.date'),
    selectedDate: getDetailSelectedDate(),
    calendarMonth: detailState.calendarMonth,
    onSelect: applyDetailDate,
    onMonthChange: (month) => {
      detailState.calendarMonth = month;
      renderDetailDatePopover();
    },
    onClear: clearDetailDateField,
    showClear: dateField !== 'date',
  });
}

function syncDetailDateButton(field, dateStr) {
  const ids = {
    startDate: 'detail-start-date-btn',
    deadline: 'detail-deadline-btn',
    'remember-deadline': 'detail-remember-deadline-btn',
    date: 'detail-date-btn',
  };
  const btn = $(`#${ids[field]}`);
  if (!btn) return;
  btn.textContent = dateStr
    ? formatComposeDateWithWeekday(dateStr)
    : (field === 'date' ? t('detail.date.label.date') : t('compose.none'));
}

function openDetail(opts) {
  const { kind, id } = opts;
  if (!id) return;
  closeDetailDatePopover();
  detailState = { kind, id, dateField: null, calendarMonth: null };
  $('#detail-title').readOnly = false;
  renderDetailSheet();
  $('#detail-sheet').hidden = false;
}

function closeDetail() {
  // 쪼개기 제안을 품은 채 닫히면 = 판단 확정 (accepted/modified/rejected)
  if (detailState.kind === 'memo' && detailState.id) {
    const m = findMemo(detailState.id);
    if (m?.stepsSuggestion) {
      AlfredoDecisions.logSplitDecision(state, m);
      m.stepsSuggestion = null;
    }
  }
  flushDetailSave();
  closeDetailDatePopover();
  $('#detail-sheet').hidden = true;
  detailState = { kind: null, id: null, dateField: null, calendarMonth: null };
}

function bindDetailComplete(completeEl, item) {
  if (!completeEl) return;
  completeEl.onchange = null;
  completeEl.checked = Boolean(item.completed);
  completeEl.hidden = false;
  completeEl.onchange = async () => {
    item.completed = completeEl.checked;
    await persist();
    if (item.completed) {
      closeDetail();
      renderAll();
    } else {
      scheduleDetailSave();
    }
  };
}

function syncDetailTypeTabs(kind) {
  const tabs = $('#detail-type-tabs');
  if (!tabs) return;
  const showTabs = kind === 'memo' || kind === 'event';
  tabs.hidden = !showTabs;
  if (showTabs) {
    tabs.querySelectorAll('.compose-tab').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.kind === kind);
    });
  }
}

async function switchDetailType(toKind) {
  const { kind, id } = detailState;
  if (kind === toKind || (kind !== 'memo' && kind !== 'event')) return;
  await flushDetailSave();

  if (kind === 'event' && toKind === 'memo') {
    const t = state.timeline.find((x) => x.id === id);
    if (!t) return;
    const newId = AlfredoStorage.uid();
    state.timeline = state.timeline.filter((x) => x.id !== id);
    const bucket = 'must';
    state.memos.push({
      id: newId,
      content: t.title,
      notes: t.notes || null,
      priority: bucket,
      completed: false,
      startDate: t.date || null,
      startTime: t.allDay ? null : (t.time || null),
      durationMinutes: t.duration || null,
      tags: t.tags || null,
    });
    const order = getBucketOrder(bucket);
    if (!order.includes(newId)) order.push(newId);
    await persist();
    renderAll();
    toast(t('compose.toast.changed.task'));
    openDetail({ kind: 'memo', id: newId });
    return;
  }

  if (kind === 'memo' && toKind === 'event') {
    const m = findMemo(id);
    if (!m) return;
    const newId = AlfredoStorage.uid();
    removeMemoFromState(id);
    state.timeline.push({
      id: newId,
      title: m.content,
      notes: m.notes || null,
      date: m.startDate || todayStr(),
      time: m.startTime || defaultEventTime(),
      duration: m.durationMinutes || 30,
      completed: false,
      domain: 'local',
      tags: m.tags || null,
      allDay: false,
      remindMinutes: 10,
    });
    await persist();
    renderAll();
    toast(t('compose.toast.changed.event'));
    openDetail({ kind: 'event', id: newId });
    return;
  }
}

function renderDetailSheet() {
  const { kind, id } = detailState;
  const rows = $('#detail-rows');
  const stepsSection = $('#detail-steps-section');
  if (!rows) return;
  rows.replaceChildren();
  if (stepsSection) stepsSection.hidden = true;

  syncDetailTypeTabs(kind);

  const completeEl = $('#detail-complete');
  const aiBtn = $('#btn-detail-ai-split');
  if (aiBtn) aiBtn.hidden = !AlfredoAI.hasKey(state.settings);

  if (kind === 'remember') {
    const r = state.remember.find((x) => x.id === id);
    if (!r) { closeDetail(); return; }
    $('#detail-title').value = r.text || '';
    $('#detail-notes').hidden = true;
    $('#detail-ai-reason').hidden = true;
    $('#detail-tags').hidden = true;
    $('#detail-source').hidden = true;
    bindDetailComplete(completeEl, r);
    rows.append(
      createDetailRowGroup(
        createDetailDateRow('', t('detail.date.label.remember-deadline'), 'remember-deadline'),
        createDetailTimeRow('', t('detail.field.deadline.time'), 'detail-remember-time'),
      ),
    );
    syncDetailDateButton('remember-deadline', r.deadline);
    $('#detail-remember-time').value = r.deadlineTime || '';
    return;
  }

  $('#detail-notes').hidden = false;

  if (kind === 'memo') {
    const m = findMemo(id);
    if (!m) { closeDetail(); return; }
    m.steps = normalizeSteps(m.steps);
    $('#detail-notes').hidden = false;
    $('#detail-title').value = m.content || '';
    $('#detail-notes').value = m.notes || '';
    bindDetailComplete(completeEl, m);
    const reasons = [];
    const aiReason = getDetailAiReason(m);
    if (aiReason) reasons.push(aiReason);
    if (m.durationReason) reasons.push(`⏱️ ${m.durationReason}`);
    const reasonEl = $('#detail-ai-reason');
    if (reasons.length) {
      reasonEl.textContent = reasons.join(' · ');
      reasonEl.hidden = false;
    } else {
      reasonEl.hidden = true;
    }
    // 연결관계 표시 — 선행(이 일이 무엇 전 준비) 또는 후행(무엇을 먼저 해야)
    const sourceEl = $('#detail-source');
    const blocker = typeof taskBlocker === 'function' ? taskBlocker(m) : null;
    if (m.relatedHint) {
      const evTime = m.relatedTime ? `(${formatTimeLabel(m.relatedTime)})` : '';
      sourceEl.textContent = t('detail.prep.before', m.relatedHint, evTime);
      sourceEl.hidden = false;
    } else if (blocker) {
      sourceEl.textContent = t('detail.blocker', blocker.content);
      sourceEl.hidden = false;
    } else {
      sourceEl.hidden = true;
    }

    rows.append(
      createDetailRowGroup(
        createDetailFieldRow('', 'MoSCoW', 'detail-bucket', 'select'),
        createDetailDurationRow(m),
      ),
      createDetailRowGroup(
        createDetailDateRow('', t('detail.field.start.date'), 'startDate'),
        createDetailTimeRow('', t('detail.field.start.time'), 'detail-start-time'),
      ),
      createDetailRowGroup(
        createDetailDateRow('', t('detail.field.deadline.date'), 'deadline'),
        createDetailTimeRow('', t('detail.field.deadline.time'), 'detail-deadline-time'),
      ),
    );
    fillDetailBucketSelect(m.priority);
    syncDetailDateButton('startDate', m.startDate);
    syncDetailDateButton('deadline', m.deadline);
    $('#detail-start-time').value = m.startTime || '';
    $('#detail-deadline-time').value = m.deadlineTime || '';
    syncDetailDurationFromTimes();
    renderDetailTags(m.tags);
    renderDetailSteps(m);
    return;
  }

  if (kind === 'event') {
    const t = state.timeline.find((x) => x.id === id);
    if (!t) { closeDetail(); return; }
    $('#detail-notes').hidden = false;
    $('#detail-title').value = t.title || '';
    $('#detail-notes').value = t.notes || '';
    bindDetailComplete(completeEl, t);
    // 역방향 연결: 이 일정을 준비하는 할 일 목록
    const preps = (state.memos || []).filter(
      (m) => !m.completed && (m.relatedId === t.id || m.relatedHint === t.title),
    );
    const reasonEl = $('#detail-ai-reason');
    if (preps.length) {
      reasonEl.textContent = t('detail.prep', preps.map((p) => p.content).join(', '));
      reasonEl.hidden = false;
    } else {
      reasonEl.hidden = true;
    }
    renderDetailSource(t);

    rows.append(
      createDetailRowGroup(
        createDetailFieldRow('', t('detail.field.with'), 'detail-with', 'text'),
        createDetailFieldRow('', t('detail.field.location'), 'detail-location', 'text'),
      ),
      createDetailRowGroup(
        createDetailFieldRow('', t('detail.field.linked'), 'detail-memo-link', 'select'),
        createDetailFieldRow('', t('detail.field.reminder'), 'detail-remind', 'select'),
      ),
      createDetailRowGroup(
        createDetailDateRow('', t('detail.field.date'), 'date'),
        createDetailTimeRow('', t('detail.field.start.time'), 'detail-time'),
      ),
      createDetailRowGroup(
        createDetailEventDurationRow(t),
        createDetailAllDayField(t),
      ),
    );
    $('#detail-with').value = t.with || '';
    $('#detail-location').value = t.location || '';
    fillDetailMemoLinkSelect(t.memoId);
    const memoLink = $('#detail-memo-link');
    if (memoLink) memoLink.disabled = isGcalEvent(t);
    $('#detail-with').placeholder = t('detail.placeholder.with');
    $('#detail-location').placeholder = t('detail.placeholder.location');
    if (isGcalEvent(t)) {
      $('#detail-with').readOnly = true;
      $('#detail-location').readOnly = true;
      $('#detail-title').readOnly = true;
      $('#detail-time').readOnly = true;
      $('#detail-event-duration')?.setAttribute('disabled', 'disabled');
    } else {
      $('#detail-with').readOnly = false;
      $('#detail-location').readOnly = false;
      $('#detail-title').readOnly = false;
      $('#detail-time').readOnly = false;
      $('#detail-event-duration')?.removeAttribute('disabled');
    }
    syncDetailDateButton('date', t.date || todayStr());
    $('#detail-time').value = t.allDay ? '' : (t.time || '');
    $('#detail-time').disabled = Boolean(t.allDay);
    fillDetailRemindSelect(t.remindMinutes ?? 10);
    renderDetailTags(t.tags);
  }
}

function renderDetailSource(t) {
  const el = $('#detail-source');
  if (!el) return;
  const label = getEventSourceLabel(t);
  if (label) {
    el.textContent = t('detail.source.sync', label);
    el.hidden = false;
  } else {
    el.hidden = true;
  }
}

function createDetailField(labelText, control) {
  const field = document.createElement('div');
  field.className = 'detail-field';
  const lbl = document.createElement('span');
  lbl.className = 'detail-field-label';
  lbl.textContent = labelText;
  field.append(lbl, control);
  return field;
}

function createDetailRowGroup(...fields) {
  const flat = fields.flat();
  const group = document.createElement('div');
  group.className = 'detail-row-group';
  if (flat.length === 1) group.classList.add('detail-row-group--full');
  flat.forEach((f) => group.append(f));
  return group;
}

function createDetailDateRow(_icon, label, field) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'detail-date-btn';
  const idMap = {
    startDate: 'detail-start-date-btn',
    deadline: 'detail-deadline-btn',
    'remember-deadline': 'detail-remember-deadline-btn',
    date: 'detail-date-btn',
  };
  btn.id = idMap[field] || 'detail-date-btn';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    openDetailDatePopover(field);
  });
  return createDetailField(label, btn);
}

function createDetailTimeRow(_icon, label, inputId) {
  const input = document.createElement('input');
  input.type = 'time';
  input.id = inputId;
  input.className = 'detail-row-input';
  input.addEventListener('change', () => {
    if (detailState.kind === 'memo') syncDetailDurationFromTimes();
    scheduleDetailSave();
  });
  return createDetailField(label, input);
}

function syncDetailDurationFromTimes() {
  if (detailState.kind !== 'memo') return;
  const m = findMemo(detailState.id);
  if (!m) return;
  const startTime = $('#detail-start-time')?.value || null;
  const deadlineTime = $('#detail-deadline-time')?.value || null;
  const computed = computeDurationFromSchedule(m.startDate, startTime, m.deadline, deadlineTime);
  const input = $('#detail-duration');
  if (!input) return;
  if (computed != null) {
    input.value = String(computed);
    input.dataset.auto = 'true';
  } else {
    input.dataset.auto = 'false';
  }
}

function createDetailDurationRow(m) {
  const wrap = document.createElement('div');
  wrap.className = 'detail-duration-wrap';
  const input = document.createElement('input');
  input.type = 'number';
  input.id = 'detail-duration';
  input.className = 'detail-row-input detail-duration-input';
  input.min = '5';
  input.step = '5';
  input.placeholder = t('detail.placeholder.minutes');
  input.value = m.durationMinutes ?? '';
  input.addEventListener('input', scheduleDetailSave);
  const suggestBtn = document.createElement('button');
  suggestBtn.type = 'button';
  suggestBtn.className = 'btn btn-secondary btn-xs detail-duration-suggest';
  suggestBtn.textContent = t('detail.suggest');
  suggestBtn.addEventListener('click', () => {
    const s = suggestDurationLocal($('#detail-title').value);
    input.value = String(s.minutes);
    input.dataset.auto = 'false';
    toast(s.reason);
    scheduleDetailSave();
  });
  wrap.append(input, suggestBtn);
  return createDetailField(t('detail.field.duration.task'), wrap);
}

function createDetailEventDurationRow(t) {
  const wrap = document.createElement('div');
  wrap.className = 'detail-duration-wrap';
  const sel = document.createElement('select');
  sel.id = 'detail-event-duration';
  sel.className = 'detail-row-input';
  DURATION_PRESETS.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = String(p.minutes);
    opt.textContent = p.label;
    if (getEventDuration(t) === p.minutes) opt.selected = true;
    sel.append(opt);
  });
  sel.addEventListener('change', scheduleDetailSave);
  const endLbl = document.createElement('span');
  endLbl.className = 'detail-end-hint';
  endLbl.id = 'detail-end-hint';
  endLbl.textContent = t.time ? formatTimeRange(t.time, getEventDuration(t)) : '';
  wrap.append(sel, endLbl);
  return createDetailField(t('detail.field.duration.event'), wrap);
}

function createDetailAllDayField(t) {
  const wrap = document.createElement('label');
  wrap.className = 'detail-allday-check';
  const chk = document.createElement('input');
  chk.type = 'checkbox';
  chk.id = 'detail-allday';
  chk.checked = Boolean(t.allDay);
  chk.addEventListener('change', () => {
    $('#detail-time').disabled = chk.checked;
    scheduleDetailSave();
  });
  const span = document.createElement('span');
  span.textContent = t('detail.allday');
  wrap.append(chk, span);
  return createDetailField(t('detail.field.allday'), wrap);
}

function createDetailFieldRow(_icon, label, inputId, type) {
  let input;
  if (type === 'select') {
    input = document.createElement('select');
  } else {
    input = document.createElement('input');
    input.type = type;
  }
  input.id = inputId;
  input.className = 'detail-row-input';
  input.addEventListener('change', scheduleDetailSave);
  if (type === 'text') input.addEventListener('input', scheduleDetailSave);
  return createDetailField(label, input);
}

function fillDetailBucketSelect(priority) {
  const sel = $('#detail-bucket');
  if (!sel) return;
  sel.replaceChildren();
  if (!priority) {
    const inbox = document.createElement('option');
    inbox.value = '';
    inbox.textContent = t('detail.bucket.inbox');
    sel.append(inbox);
  }
  BUCKETS.forEach((b) => {
    const opt = document.createElement('option');
    opt.value = b.key;
    opt.textContent = b.label;
    if (priority === b.key) opt.selected = true;
    sel.append(opt);
  });
  if (priority && !sel.value) sel.value = priority;
}

function fillDetailRemindSelect(minutes) {
  const sel = $('#detail-remind');
  if (!sel) return;
  sel.replaceChildren();
  COMPOSE_REMIND_OPTIONS.forEach((o) => {
    const opt = document.createElement('option');
    opt.value = String(o.value);
    opt.textContent = o.label;
    if ((minutes ?? 10) === o.value) opt.selected = true;
    sel.append(opt);
  });
}

function fillDetailMemoLinkSelect(selectedId) {
  const sel = $('#detail-memo-link');
  if (!sel) return;
  sel.replaceChildren();
  const none = document.createElement('option');
  none.value = '';
  none.textContent = t('compose.none');
  sel.append(none);
  state.memos
    .filter((m) => !m.completed && m.priority)
    .sort((a, b) => {
      const order = ['must', 'should', 'could', 'wont'];
      return order.indexOf(a.priority) - order.indexOf(b.priority);
    })
    .forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m.id;
      const tag = BUCKETS.find((b) => b.key === m.priority)?.label || '';
      opt.textContent = `${tag} · ${m.content}`;
      if (m.id === selectedId) opt.selected = true;
      sel.append(opt);
    });
}

function renderDetailTags(tags) {
  const wrap = $('#detail-tags');
  if (!wrap) return;
  wrap.replaceChildren();
  const list = tags || [];
  if (!list.length) {
    wrap.hidden = true;
    return;
  }
  wrap.hidden = false;
  list.forEach((t) => {
    const chip = document.createElement('span');
    chip.className = 'detail-tag';
    chip.textContent = typeof t === 'string' ? t : `${t.icon || ''} ${t.label}`.trim();
    wrap.append(chip);
  });
}

function renderDetailSteps(m) {
  const section = $('#detail-steps-section');
  const list = $('#detail-steps');
  if (!section || !list) return;
  section.hidden = false;
  const reasonEl = $('#detail-steps-reason');
  if (reasonEl) {
    if (m.stepsReason) { reasonEl.textContent = `🔧 ${m.stepsReason}`; reasonEl.hidden = false; }
    else reasonEl.hidden = true;
  }
  list.replaceChildren();
  m.steps = normalizeSteps(m.steps);
  m.steps.forEach((step) => list.append(createDetailStepRow(m, step)));
}

function createDetailStepRow(m, step) {
  const row = document.createElement('div');
  row.className = `detail-step-row${step.completed ? ' is-done' : ''}`;
  const chk = document.createElement('input');
  chk.type = 'checkbox';
  chk.checked = Boolean(step.completed);
  chk.addEventListener('change', () => {
    step.completed = chk.checked;
    row.classList.toggle('is-done', step.completed);
    scheduleDetailSave();
  });
  const text = document.createElement('input');
  text.type = 'text';
  text.className = 'detail-step-text';
  text.value = step.text;
  text.placeholder = t('detail.placeholder.step');
  text.addEventListener('input', () => {
    step.text = text.value;
    scheduleDetailSave();
  });
  const dur = document.createElement('input');
  dur.type = 'number';
  dur.className = 'detail-step-dur';
  dur.min = '5';
  dur.step = '5';
  dur.placeholder = t('detail.placeholder.minutes');
  dur.value = step.durationMinutes ?? '';
  dur.addEventListener('input', () => {
    step.durationMinutes = dur.value ? Number(dur.value) : null;
    scheduleDetailSave();
  });
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'detail-step-del';
  del.textContent = '✕';
  del.addEventListener('click', () => {
    m.steps = m.steps.filter((s) => s.id !== step.id);
    renderDetailSteps(m);
    scheduleDetailSave();
  });
  row.append(chk, text, dur, del);
  return row;
}

async function aiSplitDetailSteps() {
  const m = findMemo(detailState.id);
  if (!m || detailState.kind !== 'memo') return;
  if (!AlfredoAI.hasKey(state.settings)) {
    toast(t('toast.ai.no.key'));
    return;
  }
  const title = $('#detail-title').value.trim() || m.content;
  try {
    toast(t('toast.ai.splitting'));
    // 이미 별도 할 일로 있는 것들 — 쪼갤 때 중복 단계로 만들지 않도록 AI에 전달
    const siblings = (state.memos || [])
      .filter((x) => !x.completed && (x.kind == null || x.kind === 'task') && x.id !== m.id)
      .map((x) => x.content);
    const { steps: parts, reason } = await AlfredoAI.breakdownTask(state.settings, title, siblings);
    // 안전망: 형제 할 일과 정확히 같은 단계는 클라에서도 제외
    const norm = (s) => String(s || '').replace(/\s/g, '').toLowerCase();
    const sibSet = new Set(siblings.map(norm));
    const kept = parts.filter((p) => !sibSet.has(norm(p.title)));
    m.steps = kept.map((p) => ({ ...emptyStep(p.title), durationMinutes: p.estimatedMinutes || null }));
    m.stepsReason = reason || null;
    // AI 제안 스냅샷 — 닫을 때 최종 단계와 비교해 판단을 기록
    m.stepsSuggestion = {
      id: AlfredoStorage.uid(),
      steps: m.steps.map((s) => ({ text: s.text })),
      at: Date.now(),
    };
    const sum = stepsTotalMinutes(m.steps);
    if (sum) {
      m.durationMinutes = sum;
      m.durationSource = 'ai';
      const durInput = $('#detail-duration');
      if (durInput) {
        durInput.value = String(sum);
        durInput.dataset.auto = 'false';
      }
    }
    renderDetailSteps(m);
    await flushDetailSave();
    toast(t('toast.ai.split.done'));
  } catch {
    toast(t('toast.ai.split.fail'));
  }
}

function addDetailStep() {
  const m = findMemo(detailState.id);
  if (!m || detailState.kind !== 'memo') return;
  m.steps = normalizeSteps(m.steps);
  m.steps.push(emptyStep());
  renderDetailSteps(m);
  scheduleDetailSave();
}

function scheduleDetailSave() {
  clearTimeout(detailSaveTimer);
  detailSaveTimer = setTimeout(flushDetailSave, 450);
}

async function flushDetailSave() {
  const { kind, id } = detailState;
  if (!id) return;

  if (kind === 'remember') {
    const r = state.remember.find((x) => x.id === id);
    if (!r) return;
    const title = $('#detail-title').value.trim();
    if (!title) return;
    r.text = title;
    r.deadlineTime = $('#detail-remember-time')?.value || null;
    await persist();
    renderRemember();
    return;
  }

  if (kind === 'memo') {
    const m = findMemo(id);
    if (!m) return;
    const title = $('#detail-title').value.trim();
    if (!title) return;
    m.content = title;
    // 추출 제목을 고쳤으면 = 파서 수정 (dump_extract)
    if (m.parseSnapshot && !m.parseJudged && m.content !== m.parseSnapshot.title) {
      AlfredoDecisions.logDumpDecision(state, m, 'modified');
    }
    m.notes = $('#detail-notes').value.trim() || null;
    m.startDate = m.startDate || null;
    m.startTime = $('#detail-start-time')?.value || null;
    m.deadlineTime = $('#detail-deadline-time')?.value || null;
    const durVal = $('#detail-duration')?.value;
    m.durationMinutes = durVal ? Number(durVal) : stepsTotalMinutes(m.steps);
    if (durVal) m.durationSource = m.durationSource || 'user';
    const bucket = $('#detail-bucket').value;
    const prev = m.priority;
    m.priority = bucket || null;
    m.steps = normalizeSteps(m.steps);
    if (bucket !== prev) {
      m.suggestedPriority = null;
      m.suggestReason = null;
      if (bucket) {
        const order = getBucketOrder(bucket);
        if (!order.includes(m.id)) order.push(m.id);
      }
    }
    await persist();
    renderAll();
    return;
  }

  if (kind === 'event') {
    const t = state.timeline.find((x) => x.id === id);
    if (!t) return;
    const title = $('#detail-title').value.trim();
    if (!title) return;
    const allDay = $('#detail-allday')?.checked;
    t.title = title;
    t.notes = $('#detail-notes').value.trim() || null;
    if (!isGcalEvent(t)) {
      t.with = $('#detail-with')?.value.trim() || null;
      t.location = $('#detail-location')?.value.trim() || null;
      t.memoId = $('#detail-memo-link')?.value || null;
    }
    t.allDay = Boolean(allDay);
    t.time = allDay ? '00:00' : ($('#detail-time').value || defaultEventTime());
    t.duration = Number($('#detail-event-duration')?.value) || 30;
    t.remindMinutes = Number($('#detail-remind').value);
    const [h, mi] = t.time.split(':').map(Number);
    t.sortOrder = allDay ? 0 : h * 60 + (mi || 0);
    const hint = $('#detail-end-hint');
    if (hint && !allDay) hint.textContent = formatTimeRange(t.time, t.duration);
    await persist();
    renderTimeline();
    scheduleAlarms();
    renderHeader();
  }
}

async function doDeleteDetailItem() {
  const { kind, id } = detailState;
  if (!id) return;
  let restore = null;
  if (kind === 'memo') {
    const index = state.memos.findIndex((x) => x.id === id);
    const item = state.memos[index];
    const orderSnapshot = JSON.parse(JSON.stringify(state.moscowOrder || {}));
    removeMemoFromState(id);
    if (item) restore = () => {
      state.memos.splice(Math.max(0, index), 0, item);
      state.moscowOrder = orderSnapshot;
    };
  } else if (kind === 'remember') {
    const index = state.remember.findIndex((x) => x.id === id);
    const item = state.remember[index];
    state.remember = state.remember.filter((x) => x.id !== id);
    if (item) restore = () => state.remember.splice(Math.max(0, index), 0, item);
  } else {
    const index = state.timeline.findIndex((x) => x.id === id);
    const item = state.timeline[index];
    state.timeline = state.timeline.filter((x) => x.id !== id);
    if (item) restore = () => state.timeline.splice(Math.max(0, index), 0, item);
  }
  await persist();
  closeDetail();
  renderAll();
  toastUndo(t('toast.deleted'), restore);
}

function deleteDetailItem() {
  const { kind, id } = detailState;
  if (!id) return;
  const isGcalEvent = kind === 'event' &&
    state.timeline.find((x) => x.id === id)?.gcalEventId;
  if (isGcalEvent) {
    showConfirmSheet({
      message: t('confirm.event.delete.message'),
      detail: t('confirm.event.delete.detail'),
      confirmLabel: t('confirm.delete'),
      onConfirm: () => doDeleteDetailItem(),
    });
  } else {
    doDeleteDetailItem();
  }
}

function bindDetailEvents() {
  $('#btn-detail-close')?.addEventListener('click', closeDetail);
  $('#detail-type-tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.compose-tab[data-kind]');
    if (btn) switchDetailType(btn.dataset.kind);
  });
  $('#detail-sheet')?.addEventListener('click', (e) => {
    if (e.target.id === 'detail-sheet') closeDetail();
    if (!e.target.closest('#detail-popover, .detail-date-btn')) {
      closeDetailDatePopover();
    }
  });
  $('#detail-title')?.addEventListener('input', scheduleDetailSave);
  $('#detail-notes')?.addEventListener('input', scheduleDetailSave);
  $('#detail-rows')?.addEventListener('input', scheduleDetailSave);
  $('#detail-rows')?.addEventListener('change', scheduleDetailSave);
  $('#btn-detail-delete')?.addEventListener('click', deleteDetailItem);
  $('#btn-detail-add-step')?.addEventListener('click', addDetailStep);
  $('#btn-detail-ai-split')?.addEventListener('click', aiSplitDetailSteps);
  $('#detail-title')?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetail();
  });
}
