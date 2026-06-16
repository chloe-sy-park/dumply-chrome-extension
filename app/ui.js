/* 공통 DOM 팩토리 — render / projects / detail 등에서 재사용 */

'use strict';

function createAddButton(label, { id, className = 'icon-btn-add' } = {}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  if (id) btn.id = id;
  btn.setAttribute('aria-label', label);
  btn.title = label;
  btn.textContent = '+';
  return btn;
}

function createDragGrip() {
  const grip = document.createElement('span');
  grip.className = 'drag-grip';
  grip.title = t('memo.drag');
  grip.setAttribute('aria-label', t('memo.drag'));

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');

  [[9, 5], [15, 5], [9, 12], [15, 12], [9, 19], [15, 19]].forEach(([cx, cy]) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', '1.5');
    svg.append(circle);
  });

  grip.append(svg);
  return grip;
}

function getBucketByKey(key) {
  return BUCKETS.find((b) => b.key === key) || null;
}

function createPriorityDot(priorityKey, { size = 'md' } = {}) {
  const dot = document.createElement('span');
  const bucket = getBucketByKey(priorityKey);
  dot.className = `priority-dot priority-dot-${size} priority-dot-${priorityKey}`;
  if (bucket) {
    dot.title = bucket.label;
    dot.setAttribute('aria-label', bucket.label);
  }
  return dot;
}

function formatDeadlineMeta(deadline) {
  if (!deadline) return t('memo.deadline.none');
  const d = daysUntil(deadline);
  return `D-${Math.max(0, d ?? 0)} · ${deadline}`;
}

function createTaskMeta({ deadline, priority } = {}) {
  const meta = document.createElement('div');
  meta.className = 'task-meta proj-task-meta';
  const text = document.createElement('span');
  text.className = 'task-meta-text proj-task-meta-text';
  text.textContent = formatDeadlineMeta(deadline);
  meta.append(text);
  if (priority) meta.append(createPriorityDot(priority));
  return meta;
}

function createMemoCheckbox(m, { onChange } = {}) {
  const chk = document.createElement('input');
  chk.type = 'checkbox';
  chk.className = 'memo-check';
  chk.dataset.id = m.id;
  chk.checked = Boolean(m.completed);
  chk.setAttribute('aria-label', t('memo.done.label'));
  if (onChange) chk.addEventListener('change', onChange);
  return chk;
}

function createRowDeleteButton(id) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mini-btn';
  btn.dataset.act = 'del';
  btn.dataset.id = id;
  btn.textContent = '×';
  btn.setAttribute('aria-label', t('memo.delete.label'));
  btn.addEventListener('mousedown', (e) => e.stopPropagation());
  return btn;
}

function buildPrioMetaText(m) {
  const tag = getBucketByKey(m.priority)?.label || '';
  const tagLabels = (m.tags || []).map((t) => (typeof t === 'string' ? t : t.label)).filter(Boolean);
  const parts = [tag];
  if (m.deadline) parts.push(formatComposeDateWithWeekday(m.deadline));
  if (m.durationMinutes) parts.push(formatDurationLabel(m.durationMinutes));
  if (tagLabels.length) parts.push(tagLabels.join(' · '));
  if (m.placementSource === 'ai' && m.placementReason) parts.push(m.placementReason);
  return parts.filter(Boolean).join(' · ');
}

function prioTrendIcon(trend) {
  const map = { up: 'trending-up', down: 'trending-down', same: 'minus', new: 'sparkles' };
  return map[trend] || null;
}

function prioTrendLabel(trend) {
  switch (trend) {
    case 'up': return t('memo.priority.up');
    case 'down': return t('memo.priority.down');
    case 'same': return t('memo.priority.same');
    case 'new': return t('memo.priority.new');
    default: return '';
  }
}

function createPrioTrendBadge(m) {
  if (!m.trend) return null;
  const trend = document.createElement('span');
  trend.className = `prio-trend trend-${m.trend}`;
  const iconName = prioTrendIcon(m.trend);
  if (iconName && typeof DumplyIcons !== 'undefined') {
    trend.appendChild(DumplyIcons.icon(iconName, { size: 14 }));
  }
  trend.title = prioTrendLabel(m.trend);
  trend.setAttribute('aria-label', prioTrendLabel(m.trend));
  return trend;
}

function createTaskRow(m, options = {}) {
  const variant = options.variant || 'project';
  const isLi = variant !== 'prio';
  const row = document.createElement(isLi ? 'li' : 'div');

  const classMap = { project: 'proj-task', bucket: 'bucket-item', prio: 'prio-row a-card-row' };
  row.className = `${classMap[variant]} row-clickable`;
  if (m.completed) row.classList.add('is-done');
  if (variant === 'prio') row.classList.add(`prio-row-${m.priority || ''}`);
  const blocker = typeof taskBlocker === 'function' ? taskBlocker(m) : null;
  if (blocker) row.classList.add('is-blocked');
  row.dataset.id = m.id;

  if (options.draggable) {
    row.draggable = true;
    if (options.section) row.dataset.section = options.section;
    if (options.projectKey) row.dataset.projectId = options.projectKey;
    if (options.bucket) row.dataset.bucket = options.bucket;
  }

  const clickExclude = options.clickExclude
    || '.memo-check, .drag-grip, .mini-btn, .prio-trend, .bucket-actions';
  row.addEventListener('click', (e) => {
    if (e.target.closest(clickExclude)) return;
    openDetail({ kind: 'memo', id: m.id });
  });

  const onToggle = options.onToggle || (() => handleAction('memo-toggle', m.id));
  const chk = createMemoCheckbox(m, { onChange: onToggle });

  if (variant === 'bucket') {
    const handle = createDragGrip();
    const text = document.createElement('span');
    text.className = 'bucket-text';
    text.textContent = m.content;
    const actions = document.createElement('div');
    actions.className = 'bucket-actions';
    actions.append(createRowDeleteButton(m.id));
    row.append(chk, handle, text, actions);
    return row;
  }

  if (variant === 'project') {
    const body = document.createElement('div');
    body.className = 'proj-task-body';
    const title = document.createElement('span');
    title.className = 'proj-task-title';
    title.textContent = m.content;
    body.append(title, createTaskMeta({ deadline: m.deadline, priority: m.priority }));
    if (options.showGrip !== false) row.append(createDragGrip(), chk, body);
    else row.append(chk, body);
    return row;
  }

  // prio variant
  const head = document.createElement('div');
  head.className = 'prio-row-head';
  head.append(chk, createPriorityDot(m.priority, { size: 'sm' }));
  if (options.rank != null) {
    const rank = document.createElement('span');
    rank.className = 'prio-rank';
    rank.textContent = String(options.rank);
    head.append(rank);
  }
  const body = document.createElement('div');
  body.className = 'prio-row-body';
  const title = document.createElement('span');
  title.className = 'prio-title';
  title.textContent = m.content;
  body.append(title);
  const metaText = buildPrioMetaText(m);
  if (metaText) {
    const meta = document.createElement('div');
    meta.className = 'prio-meta';
    meta.textContent = metaText;
    body.append(meta);
  }
  if (blocker) {
    const dep = document.createElement('div');
    dep.className = 'prio-meta prio-blocked-note';
    if (typeof DumplyIcons !== 'undefined') dep.appendChild(DumplyIcons.icon('lock', { size: 12 }));
    dep.appendChild(Object.assign(document.createElement('span'), { textContent: ` ${t('blocker.note', blocker.content)}` }));
    body.append(dep);
  }
  head.append(body);
  const trend = createPrioTrendBadge(m);
  if (trend) head.append(trend);
  const actions = document.createElement('div');
  actions.className = 'prio-actions';
  actions.append(createRowDeleteButton(m.id));
  head.append(actions);
  row.append(head);
  return row;
}

function createEmptyState({ message, actionLabel, onAction, hint, className = 'empty-state', buttonClass = 'btn btn-secondary btn-sm' } = {}) {
  const wrap = document.createElement('div');
  wrap.className = className;
  const msg = document.createElement('p');
  msg.className = 'empty-state-msg';
  msg.textContent = message;
  wrap.append(msg);
  if (actionLabel && onAction) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = buttonClass;
    btn.textContent = actionLabel;
    btn.addEventListener('click', onAction);
    wrap.append(btn);
  }
  if (hint) {
    const h = document.createElement('p');
    h.className = 'empty-state-hint';
    h.textContent = hint;
    wrap.append(h);
  }
  return wrap;
}

function bindDraggableRows(root, selector, { getDragPayload, dragExclude }) {
  if (!root) return;
  root.querySelectorAll(selector).forEach((item) => {
    item.addEventListener('dragstart', (e) => {
      if (dragExclude && e.target.closest(dragExclude)) {
        e.preventDefault();
        return;
      }
      dragItem = getDragPayload(item);
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      dragItem = null;
      document.querySelectorAll('.is-drop-target').forEach((el) => el.classList.remove('is-drop-target'));
    });
  });
}

async function classifyMemoToBucket(memoId, bucket) {
  const memo = findMemo(memoId);
  if (!memo || !bucket) return;
  // 제안을 지우기 "전에" 판단을 기록 — accepted/modified(+diff)
  AlfredoDecisions.logMoscowDecision(state, memo, bucket);
  AlfredoDecisions.logDumpDecision(state, memo, 'accepted');
  memo.priority = bucket;
  memo.suggestedPriority = null;
  memo.suggestReason = null;
  const order = getBucketOrder(bucket);
  if (!order.includes(memo.id)) order.push(memo.id);
  await persist();
  renderInbox();
  renderMoscow();
  renderDashboard();
}

function getDragAfterElement(container, selector, y) {
  const items = [...container.querySelectorAll(selector)];
  return items.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function createSectionAddButton(label, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-secondary btn-sm';
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

function createInboxClassifyChips(m) {
  const chips = document.createElement('div');
  chips.className = 'inbox-row-chips';
  BUCKETS.forEach((b) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `bucket-chip bucket-chip-${b.key}`;
    chip.dataset.act = 'classify';
    chip.dataset.bucket = b.key;
    chip.dataset.id = m.id;
    chip.title = b.sub;
    chip.textContent = b.label;
    if (m.suggestedPriority === b.key) {
      chip.classList.add('is-suggested');
      const hint = m.suggestReason ? `: ${m.suggestReason}` : '';
      chip.title = `${t('suggest.chip.tooltip', b.label, hint)} · ${b.sub}`;
      chip.setAttribute('aria-label', t('suggest.chip.tooltip', b.label, hint));
    }
    chips.append(chip);
  });
  return chips;
}

/** 감정/에너지 태그 칩 (없으면 null) */
function createInboxMetaRow(m) {
  const moodTags = (m.tags || [])
    .filter((t) => t && (t.type === 'emotion' || t.type === 'energy'))
    .slice(0, 3);
  if (!moodTags.length) return null;

  const meta = document.createElement('div');
  meta.className = 'inbox-row-meta';
  moodTags.forEach((t) => {
    const chip = document.createElement('span');
    chip.className = 'inbox-mood-tag';
    chip.textContent = `${t.icon} ${t.label}`;
    meta.append(chip);
  });
  return meta;
}

/**
 * 버킷 배정 컨트롤 — "구성하지 말고 확인하라".
 * 추천이 있으면 채운 알약 1개(클릭=수락) + '변경'으로 펼치는 picker.
 * 추천 전이면 기존처럼 칩 4개를 바로 노출.
 */
function createInboxBucketControl(m) {
  const wrap = document.createElement('div');
  wrap.className = 'inbox-bucket-control';
  const sug = m.suggestedPriority && isValidBucket(m.suggestedPriority) ? m.suggestedPriority : null;

  if (!sug) {
    const picker = createInboxClassifyChips(m);
    picker.classList.add('inbox-bucket-picker');
    wrap.append(picker);
    return wrap;
  }

  const head = document.createElement('div');
  head.className = 'inbox-bucket-head';

  const label = getBucketByKey(sug)?.label || '';
  const pill = document.createElement('button');
  pill.type = 'button';
  pill.className = `inbox-suggest-pill is-${sug}`;
  pill.dataset.act = 'classify';
  pill.dataset.bucket = sug;
  pill.dataset.id = m.id;
  pill.setAttribute('aria-label', t('suggest.chip.aria', label));
  pill.append(createPriorityDot(sug, { size: 'sm' }));
  const pl = document.createElement('span');
  pl.className = 'inbox-suggest-pill-label';
  pl.textContent = label;
  pill.append(pl);
  if (m.suggestReason) {
    const reason = document.createElement('span');
    reason.className = 'inbox-suggest-pill-reason';
    reason.textContent = m.suggestReason;
    pill.append(reason);
  }
  head.append(pill);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'inbox-change-toggle';
  toggle.dataset.toggle = 'buckets';
  toggle.dataset.id = m.id;
  toggle.setAttribute('aria-label', t('memo.bucket.change'));
  const tl = document.createElement('span');
  tl.textContent = t('memo.bucket.change.label');
  const chev = document.createElement('span');
  chev.className = 'inbox-change-chev';
  chev.textContent = '▾';
  toggle.append(tl, chev);
  head.append(toggle);

  const picker = createInboxClassifyChips(m);
  picker.classList.add('inbox-bucket-picker', 'is-collapsed');

  wrap.append(head, picker);
  return wrap;
}

/** 덤프 추출 근거 + 연결관계 줄들. 둘 다 없으면 null. 근거가 보이면 본 것으로 기록. */
function createInboxNotes(m) {
  const texts = [];
  if (m.parseRationale) {
    if (!m.parseReasonSeen) m.parseReasonSeen = true;
    texts.push(`🔎 ${m.parseRationale}`);
  }
  if (m.relatedHint) {
    const evTime = m.relatedTime ? `(${formatTimeLabel(m.relatedTime)})` : '';
    const due = m.deadlineTime ? t('deadline.until', formatTimeLabel(m.deadlineTime)) : '';
    texts.push(t('related.inbox.note', m.relatedHint, evTime, due));
  }
  const blocker = typeof taskBlocker === 'function' ? taskBlocker(m) : null;
  if (blocker) texts.push(t('blocker.inbox.note', blocker.content));
  if (!texts.length) return null;
  const wrap = document.createElement('div');
  wrap.className = 'inbox-row-notes';
  texts.forEach((t) => {
    const el = document.createElement('div');
    el.className = 'inbox-parse-reason';
    el.textContent = t;
    wrap.append(el);
  });
  return wrap;
}

function createInboxRow(m) {
  const row = document.createElement('div');
  row.className = 'inbox-row has-chips list-row-draggable row-clickable';
  row.draggable = true;
  row.dataset.id = m.id;
  row.dataset.bucket = 'inbox';
  if (typeof aiAppliedIds !== 'undefined' && aiAppliedIds.has(m.id)) row.classList.add('is-ai-applied');
  if (typeof taskBlocker === 'function' && taskBlocker(m)) row.classList.add('is-blocked');

  const chk = createMemoCheckbox(m);
  chk.className = 'memo-check inbox-check';

  const text = document.createElement('span');
  text.className = 'inbox-text';
  text.textContent = m.content;

  const actions = document.createElement('div');
  actions.className = 'inbox-actions';
  actions.append(createRowDeleteButton(m.id));

  row.append(chk, createDragGrip(), text, actions);
  const notes = createInboxNotes(m);
  if (notes) row.append(notes);
  const meta = createInboxMetaRow(m);
  if (meta) row.append(meta);
  row.append(createInboxBucketControl(m));
  row.addEventListener('click', (e) => {
    if (e.target.closest('.inbox-bucket-control, .inbox-check, .memo-check, .mini-btn, .drag-grip')) return;
    openDetail({ kind: 'memo', id: m.id });
  });
  return row;
}

function bindDropTargetLists(root, listSelector, { onDrop, draggingSelector }) {
  root.querySelectorAll(listSelector).forEach((list) => {
    list.addEventListener('dragenter', (e) => {
      e.preventDefault();
      if (dragItem) list.classList.add('is-drop-target');
    });
    list.addEventListener('dragleave', (e) => {
      if (!list.contains(e.relatedTarget)) list.classList.remove('is-drop-target');
    });
    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragItem) list.classList.add('is-drop-target');
    });
    list.addEventListener('drop', async (e) => {
      e.preventDefault();
      list.classList.remove('is-drop-target');
      if (!dragItem) return;
      await onDrop(e, list);
    });
  });

  if (draggingSelector) {
    root.querySelectorAll(draggingSelector).forEach((item) => {
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        dragItem = null;
        root.querySelectorAll('.is-drop-target').forEach((el) => el.classList.remove('is-drop-target'));
      });
    });
  }
}

let _confirmCallback = null;

function showConfirmSheet({ message, detail = '', confirmLabel, onConfirm }) {
  confirmLabel = confirmLabel ?? t('confirm.delete');
  const sheet = $('#confirm-sheet');
  if (!sheet) return;
  $('#confirm-message').textContent = message;
  $('#confirm-detail').textContent = detail;
  $('#btn-confirm-ok').textContent = confirmLabel;
  _confirmCallback = onConfirm;
  sheet.hidden = false;
}

function bindConfirmSheet() {
  $('#btn-confirm-cancel')?.addEventListener('click', () => {
    $('#confirm-sheet').hidden = true;
    _confirmCallback = null;
  });
  $('#confirm-sheet')?.addEventListener('click', (e) => {
    if (e.target.id === 'confirm-sheet') {
      $('#confirm-sheet').hidden = true;
      _confirmCallback = null;
    }
  });
  $('#btn-confirm-ok')?.addEventListener('click', () => {
    $('#confirm-sheet').hidden = true;
    if (typeof _confirmCallback === 'function') _confirmCallback();
    _confirmCallback = null;
  });
}
