/* 프로젝트 · 아카이브 */

'use strict';

const PROJECT_STATUS = {
  active: { get label() { return t('proj.status.active'); }, cls: 'proj-status-active' },
  waiting: { get label() { return t('proj.status.waiting'); }, cls: 'proj-status-waiting' },
  done: { get label() { return t('proj.status.done'); }, cls: 'proj-status-done' },
};

const PROJECT_AREA = {
  work: { get label() { return t('proj.area.work'); } },
  life: { get label() { return t('proj.area.life'); } },
};

const PROJECT_IMPORTANCE = {
  high: { get label() { return t('proj.importance.high'); } },
  medium: { get label() { return t('proj.importance.medium'); } },
  low: { get label() { return t('proj.importance.low'); } },
};

function getProjectStatusOptions() { return Object.entries(PROJECT_STATUS).map(([v, o]) => [v, o.label]); }
function getProjectAreaOptions() { return Object.entries(PROJECT_AREA).map(([v, o]) => [v, o.label]); }
function getProjectImportanceOptions() { return Object.entries(PROJECT_IMPORTANCE).map(([v, o]) => [v, o.label]); }

function normalizeProjectStatus(status) {
  if (status === 'active' || status === 'waiting' || status === 'done') return status;
  if (status === 'on-track' || status === 'at-risk') return 'active';
  return 'active';
}

const PROJECT_EMOJIS = ['📁', '🎨', '📱', '💼', '🏠', '✈️', '📝', '🔬', '🎯', '🛒'];

function findProject(id) {
  return state.projects.find((p) => p.id === id);
}

function getProjectMemos(projectId) {
  return state.memos.filter((m) => m.projectId === projectId);
}

function getArchiveMemos() {
  return state.memos.filter((m) => !m.projectId);
}

function getImportableTasksForProject(projectId) {
  if (projectId === '__archive__') {
    return state.memos.filter((m) => !m.completed && m.projectId);
  }
  return state.memos.filter((m) => !m.completed && !m.projectId);
}

function getProjectProgress(projectId) {
  const tasks = getProjectMemos(projectId);
  const total = tasks.length;
  const done = tasks.filter((m) => m.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return { total, done, pct };
}

function formatProjectRange(p) {
  if (!p.startDate && !p.endDate) return '';
  const fmt = (d) => {
    if (!d) return '—';
    const [, mo, day] = d.split('-');
    return `${Number(mo)}/${Number(day)}`;
  };
  return `${fmt(p.startDate)} — ${fmt(p.endDate)}`;
}

function buildEmojiPicker(selected, onPick) {
  const wrap = document.createElement('div');
  wrap.className = 'proj-emoji-picker';
  PROJECT_EMOJIS.forEach((emoji) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'proj-emoji-opt';
    btn.textContent = emoji;
    btn.classList.toggle('is-selected', emoji === selected);
    btn.addEventListener('click', () => onPick(emoji, wrap));
    wrap.append(btn);
  });
  return wrap;
}

function formatProjectMeta(p) {
  const parts = [];
  if (PROJECT_AREA[p.area]) parts.push(PROJECT_AREA[p.area].label);
  if (PROJECT_IMPORTANCE[p.importance]) parts.push(PROJECT_IMPORTANCE[p.importance].label);
  return parts.join(' · ');
}

function formatProjectCardSub(p) {
  const meta = formatProjectMeta(p);
  const range = formatProjectRange(p);
  if (range && p.endDate) {
    const dLeft = daysUntil(p.endDate);
    return `${meta} · ${range}${dLeft != null ? ` · D-${Math.max(0, dLeft)}` : ''}`;
  }
  if (range) return `${meta} · ${range}`;
  return meta;
}

function buildProjPillRow(labelText, options, initial) {
  const row = document.createElement('div');
  row.className = 'proj-form-row';
  const label = document.createElement('span');
  label.className = 'proj-form-label';
  label.textContent = labelText;
  const pills = document.createElement('div');
  pills.className = 'proj-form-pills';
  let selected = initial;
  options.forEach(([value, text]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'proj-form-pill';
    btn.textContent = text;
    btn.classList.toggle('is-selected', value === initial);
    btn.addEventListener('click', () => {
      selected = value;
      pills.querySelectorAll('.proj-form-pill').forEach((el) => {
        el.classList.toggle('is-selected', el === btn);
      });
    });
    pills.append(btn);
  });
  row.append(label, pills);
  return { row, getValue: () => selected };
}

function createProjectForm(opts = {}) {
  const {
    title = t('proj.form.new.title'),
    submitLabel = t('proj.form.create'),
    initialName = '',
    initialEmoji = '📁',
    initialStatus = 'active',
    initialArea = 'work',
    initialImportance = 'medium',
    initialStartDate = '',
    initialEndDate = '',
    onSubmit,
    onCancel,
  } = opts;
  const form = document.createElement('div');
  form.className = 'proj-form';
  // 시트 헤더의 타이틀 업데이트 (sheet-head에 h2가 있을 때)
  const sheetTitle = $('#proj-sheet-title');
  if (sheetTitle) sheetTitle.textContent = title;
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'proj-form-input';
  nameInput.placeholder = t('proj.form.name.placeholder');
  nameInput.value = initialName;
  nameInput.maxLength = 40;
  let pickedEmoji = initialEmoji;
  const picker = buildEmojiPicker(pickedEmoji, (emoji, wrap) => {
    pickedEmoji = emoji;
    wrap.querySelectorAll('.proj-emoji-opt').forEach((el) => {
      el.classList.toggle('is-selected', el.textContent === emoji);
    });
  });

  const statusRow = buildProjPillRow(t('proj.form.status'), getProjectStatusOptions(), normalizeProjectStatus(initialStatus));
  const areaRow = buildProjPillRow(t('proj.form.area'), getProjectAreaOptions(), initialArea === 'life' ? 'life' : 'work');
  const importanceRow = buildProjPillRow(t('proj.form.importance'), getProjectImportanceOptions(),
    ['high', 'medium', 'low'].includes(initialImportance) ? initialImportance : 'medium');

  const periodRow = document.createElement('label');
  periodRow.className = 'proj-form-check';
  const periodChk = document.createElement('input');
  periodChk.type = 'checkbox';
  periodChk.checked = Boolean(initialStartDate || initialEndDate);
  const periodLbl = document.createElement('span');
  periodLbl.textContent = t('projects.period');
  periodRow.append(periodChk, periodLbl);

  const datesWrap = document.createElement('div');
  datesWrap.className = 'proj-form-dates';
  datesWrap.hidden = !periodChk.checked;
  const startInput = document.createElement('input');
  startInput.type = 'date';
  startInput.className = 'proj-form-input';
  startInput.value = initialStartDate || '';
  const endInput = document.createElement('input');
  endInput.type = 'date';
  endInput.className = 'proj-form-input';
  endInput.value = initialEndDate || '';
  datesWrap.append(startInput, endInput);
  periodChk.addEventListener('change', () => {
    datesWrap.hidden = !periodChk.checked;
  });

  const actions = document.createElement('div');
  actions.className = 'proj-form-actions';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'btn btn-secondary btn-sm';
  cancel.textContent = t('projects.cancel');
  cancel.addEventListener('click', () => onCancel?.());
  const submit = document.createElement('button');
  submit.type = 'button';
  submit.className = 'btn btn-primary btn-sm';
  submit.textContent = submitLabel;
  submit.addEventListener('click', () => {
    const usePeriod = periodChk.checked;
    onSubmit?.({
      name: nameInput.value.trim(),
      emoji: pickedEmoji,
      status: statusRow.getValue(),
      area: areaRow.getValue(),
      importance: importanceRow.getValue(),
      startDate: usePeriod ? (startInput.value || null) : null,
      endDate: usePeriod ? (endInput.value || null) : null,
    });
  });
  actions.append(cancel, submit);
  form.append(
    nameInput,
    picker,
    statusRow.row,
    areaRow.row,
    importanceRow.row,
    periodRow,
    datesWrap,
    actions,
  );
  setTimeout(() => nameInput.focus(), 30);
  return form;
}

function closeProjectSheet() {
  const sheet = $('#proj-sheet');
  if (sheet) sheet.hidden = true;
  $('#proj-sheet-body')?.replaceChildren();
}

function openProjectSheet(opts = {}) {
  const sheet = $('#proj-sheet');
  const mount = $('#proj-sheet-body');
  if (!sheet || !mount) return;
  mount.replaceChildren();
  const form = createProjectForm({
    ...opts,
    onCancel: () => {
      closeProjectSheet();
      opts.onCancel?.();
    },
    onSubmit: async (data) => {
      const ok = await opts.onSubmit?.(data);
      if (ok !== false) closeProjectSheet();
    },
  });
  form.classList.add('proj-form-drawer');
  mount.append(form);
  sheet.hidden = false;
}

function bindProjectSheet() {
  $('#proj-sheet')?.addEventListener('click', (e) => {
    if (e.target.id === 'proj-sheet') closeProjectSheet();
  });
  $('#btn-proj-sheet-close')?.addEventListener('click', closeProjectSheet);
}

async function createProject(data) {
  const trimmed = data.name?.trim();
  if (!trimmed) {
    toast('프로젝트 이름을 입력해 주세요');
    return false;
  }
  state.projects.push({
    id: AlfredoStorage.uid(),
    name: trimmed,
    emoji: data.emoji || '📁',
    status: normalizeProjectStatus(data.status),
    area: data.area === 'life' ? 'life' : 'work',
    importance: ['high', 'medium', 'low'].includes(data.importance) ? data.importance : 'medium',
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    createdAt: Date.now(),
  });
  await persist();
  renderProjectsList();
  toast('프로젝트를 만들었어요 ✓');
  return true;
}

async function updateProject(id, patch) {
  const p = findProject(id);
  if (!p) return;
  Object.assign(p, patch);
  await persist();
  if (state.ui.route === 'project-detail' && state.ui.projectId === id) {
    renderProjectDetail(id);
  } else {
    renderProjectsList();
  }
  toast('프로젝트를 수정했어요 ✓');
}

async function deleteProject(id) {
  if (!confirm('프로젝트를 삭제할까요? 할 일은 아카이브로 이동해요.')) return;
  state.memos.forEach((m) => {
    if (m.projectId === id) m.projectId = null;
  });
  (state.timeline || []).forEach((t) => {
    if (t.projectId === id) t.projectId = null;
  });
  state.projects = state.projects.filter((p) => p.id !== id);
  await persist();
  navigateTo('projects');
  toast(t('toast.proj.deleted'));
}

function groupProjectTasks(tasks) {
  const active = tasks.filter((m) => !m.completed && m.priority);
  const pending = tasks.filter((m) => !m.completed && !m.priority);
  const done = tasks.filter((m) => m.completed);
  return { active, pending, done };
}

function renderProjectTaskRow(m, { section, projectKey } = {}) {
  return createTaskRow(m, {
    variant: 'project',
    draggable: true,
    section,
    projectKey,
  });
}

function getProjDragAfterElement(list, y) {
  return getDragAfterElement(list, '.proj-task:not(.dragging)', y);
}

function bindProjectTaskDragDrop(root, viewProjectId) {
  root.querySelectorAll('.proj-task[draggable]').forEach((item) => {
    item.addEventListener('dragstart', (e) => {
      if (e.target.closest('.memo-check')) {
        e.preventDefault();
        return;
      }
      dragItem = {
        id: item.dataset.id,
        section: item.dataset.section,
        projectId: item.dataset.projectId,
      };
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
  });

  bindDropTargetLists(root, '.proj-task-list[data-section]', {
    draggingSelector: '.proj-task[draggable]',
    onDrop: async (e, list) => {
      if (!dragItem) return;
      const targetSection = list.dataset.section;
      const projectKey = list.dataset.projectId;
      const memo = findMemo(dragItem.id);
      if (!memo) return;

      const afterEl = getProjDragAfterElement(list, e.clientY);
      const visibleIds = [...list.querySelectorAll('.proj-task:not(.dragging)')].map((el) => el.dataset.id);
      let insertAt = visibleIds.length;
      if (afterEl) {
        const idx = visibleIds.indexOf(afterEl.dataset.id);
        insertAt = idx >= 0 ? idx : visibleIds.length;
      }
      visibleIds.splice(insertAt, 0, dragItem.id);

      if (dragItem.section !== targetSection || dragItem.projectId !== projectKey) {
        const fromOrder = getProjectSectionOrder(dragItem.projectId, dragItem.section);
        const fromIdx = fromOrder.indexOf(dragItem.id);
        if (fromIdx >= 0) fromOrder.splice(fromIdx, 1);
        applyProjectTaskSectionChange(memo, targetSection);
      }

      const toOrder = getProjectSectionOrder(projectKey, targetSection);
      toOrder.length = 0;
      toOrder.push(...visibleIds);
      await persist();
      renderProjectDetail(viewProjectId);
    },
  });
}

function renderProjectCard(p) {
  const { total, done, pct } = getProjectProgress(p.id);
  const card = document.createElement('div');
  card.className = 'proj-card';

  const main = document.createElement('button');
  main.type = 'button';
  main.className = 'proj-card-main row-clickable';
  main.addEventListener('click', () => navigateTo('project-detail', { projectId: p.id }));

  const top = document.createElement('div');
  top.className = 'proj-card-top';
  const icon = document.createElement('span');
  icon.className = 'proj-emoji';
  icon.textContent = p.emoji || '📁';
  const info = document.createElement('div');
  info.className = 'proj-card-info';
  const name = document.createElement('span');
  name.className = 'proj-name';
  name.textContent = p.name;
  const range = document.createElement('span');
  range.className = 'proj-range';
  range.textContent = formatProjectCardSub(p);
  info.append(name, range);
  const statusKey = normalizeProjectStatus(p.status);
  const st = PROJECT_STATUS[statusKey] || PROJECT_STATUS.active;
  const badge = document.createElement('span');
  badge.className = `proj-badge ${st.cls}`;
  badge.textContent = st.label;
  top.append(icon, info, badge);

  const track = document.createElement('div');
  track.className = 'progress-track';
  const fill = document.createElement('div');
  fill.className = 'progress-fill';
  fill.style.width = `${pct}%`;
  track.append(fill);

  const foot = document.createElement('div');
  foot.className = 'proj-card-foot';
  foot.textContent = total ? `${done}/${total} 태스크 완료 · ${pct}%` : '태스크 없음';
  main.append(top, track, foot);

  const actions = document.createElement('div');
  actions.className = 'proj-card-actions';
  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'btn btn-secondary btn-xs';
  editBtn.textContent = t('projects.edit');
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openProjectSheet({
      title: t('projects.edit'),
      submitLabel: t('settings.save'),
      initialName: p.name,
      initialEmoji: p.emoji || '📁',
      initialStatus: p.status,
      initialArea: p.area,
      initialImportance: p.importance,
      initialStartDate: p.startDate || '',
      initialEndDate: p.endDate || '',
      onSubmit: async (data) => {
        if (!data.name) { toast('이름을 입력해 주세요'); return false; }
        await updateProject(p.id, {
          name: data.name,
          emoji: data.emoji,
          status: data.status,
          area: data.area,
          importance: data.importance,
          startDate: data.startDate,
          endDate: data.endDate,
        });
        renderProjectsList();
        return true;
      },
    });
  });
  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'btn btn-secondary btn-xs';
  delBtn.textContent = t('projects.delete');
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteProject(p.id);
  });
  actions.append(editBtn, delBtn);
  card.append(main, actions);
  return card;
}

function renderProjectsList() {
  const root = $('#projects-root');
  if (!root) return;
  detachNavRail();
  root.replaceChildren();

  const header = document.createElement('div');
  header.className = 'route-page-header';

  const head = document.createElement('div');
  head.className = 'route-page-head';
  const title = document.createElement('h2');
  title.className = 'route-title';
  title.textContent = t('projects.title');
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn btn-primary btn-sm';
  addBtn.textContent = t('projects.new');
  head.append(title, addBtn);

  header.append(createRouteHomeLink(), head);

  const list = document.createElement('div');
  list.className = 'proj-list';

  addBtn.addEventListener('click', () => {
    openProjectSheet({
      onSubmit: (data) => createProject(data),
    });
  });

  if (!state.projects.length) {
    const empty = document.createElement('div');
    empty.className = 'proj-empty';
    const emptyTitle = document.createElement('p');
    emptyTitle.className = 'proj-empty-title';
    emptyTitle.textContent = t('projects.empty');
    const emptyHint = document.createElement('p');
    emptyHint.className = 'proj-empty-hint';
    emptyHint.textContent = t('projects.empty.hint');
    empty.append(emptyTitle, emptyHint);
    list.append(empty);
  }

  state.projects.forEach((p) => list.append(renderProjectCard(p)));

  const archive = getArchiveMemos();
  const archiveCard = document.createElement('button');
  archiveCard.type = 'button';
  archiveCard.className = 'proj-card proj-archive row-clickable';
  const aTop = document.createElement('div');
  aTop.className = 'proj-card-top';
  const aInfo = document.createElement('div');
  aInfo.className = 'proj-card-info';
  const aName = document.createElement('span');
  aName.className = 'proj-name';
  aName.textContent = t('projects.archive');
  const aRange = document.createElement('span');
  aRange.className = 'proj-range';
  aRange.textContent = t('projects.archive.sub');
  aInfo.append(aName, aRange);
  const aBadge = document.createElement('span');
  aBadge.className = 'proj-badge';
  aBadge.textContent = String(archive.length);
  aTop.append(aInfo, aBadge);
  archiveCard.append(aTop);
  archiveCard.addEventListener('click', () => navigateTo('project-detail', { projectId: '__archive__' }));
  list.append(archiveCard);

  root.append(header, list);
  mountNavRail();
}

function renderProjectTimelineBar(project, pct) {
  const wrap = document.createElement('div');
  wrap.className = 'proj-timeline-bar';
  const label = document.createElement('span');
  label.className = 'route-label';
  label.textContent = t('cal.timeline');
  wrap.append(label);

  if (!project.startDate || !project.endDate) return wrap;

  const today = todayStr();
  const start = project.startDate;
  const end = project.endDate;
  const span = new Date(`${end}T12:00:00`) - new Date(`${start}T12:00:00`);
  let elapsed = 0;
  if (span > 0) {
    if (today >= end) elapsed = 100;
    else if (today > start) elapsed = Math.round(((new Date(`${today}T12:00:00`) - new Date(`${start}T12:00:00`)) / span) * 100);
  }

  const track = document.createElement('div');
  track.className = 'proj-tl-track';
  const done = document.createElement('div');
  done.className = 'proj-tl-done';
  done.style.width = `${Math.min(pct, elapsed)}%`;
  const todayMark = document.createElement('div');
  todayMark.className = 'proj-tl-today';
  todayMark.style.left = `${Math.min(98, Math.max(2, elapsed))}%`;
  track.append(done, todayMark);

  const labels = document.createElement('div');
  labels.className = 'proj-tl-labels';
  const l1 = document.createElement('span');
  l1.textContent = t('projects.start', start.slice(5).replace('-', '/'));
  const l2 = document.createElement('span');
  l2.textContent = t('projects.today.marker');
  const l3 = document.createElement('span');
  l3.textContent = t('projects.end', end.slice(5).replace('-', '/'));
  labels.append(l1, l2, l3);
  wrap.append(track, labels);
  return wrap;
}

function renderProjectTaskSection(label, items, { allowImport, projectId, sectionKey, projectKey } = {}) {
  const block = document.createElement('div');
  block.className = 'proj-task-group';
  const head = document.createElement('div');
  head.className = 'proj-group-label';
  head.textContent = `${label} [${items.length}]`;
  const ul = document.createElement('ul');
  ul.className = 'proj-task-list';
  const key = projectKey || projectId || '__archive__';
  if (sectionKey) {
    ul.dataset.section = sectionKey;
    ul.dataset.projectId = key;
  }
  if (!items.length) {
    const placeholder = document.createElement('li');
    placeholder.className = 'proj-task-placeholder';
    if (allowImport && projectId) {
      placeholder.append(createEmptyState({
        message: t('proj.task.empty'),
        actionLabel: t('proj.task.import.btn'),
        buttonClass: 'link-btn proj-import-btn',
        onAction: () => openProjectImportPicker(projectId, 'task'),
        className: 'empty-state empty-state-inline empty-card empty-card--left',
      }));
    } else {
      placeholder.append(createEmptyState({
        message: sectionKey === 'done' ? t('proj.task.done.empty') : t('proj.task.empty'),
        className: 'empty-state empty-state-inline empty-card empty-card--left',
      }));
    }
    ul.append(placeholder);
  } else {
    const sorted = sectionKey ? sortProjectSectionItems(items, key, sectionKey) : items;
    sorted.forEach((m) => {
      ul.append(renderProjectTaskRow(m, { section: sectionKey, projectKey: key }));
    });
  }
  block.append(head, ul);
  return block;
}

function renderProjectEventRow(t) {
  const li = document.createElement('li');
  li.className = 'proj-task row-clickable';
  li.addEventListener('click', () => openDetail({ kind: 'event', id: t.id }));

  const rankEl = document.createElement('span');
  rankEl.className = 'proj-task-rank';
  rankEl.textContent = '📅';

  const body = document.createElement('div');
  body.className = 'proj-task-body';
  const title = document.createElement('span');
  title.className = 'proj-task-title';
  title.textContent = t.title;
  const meta = document.createElement('span');
  meta.className = 'proj-task-meta';
  const parts = [];
  if (t.date) parts.push(t.date);
  if (t.time && !t.allDay) parts.push(t.time);
  if (t.duration) parts.push(formatDurationLabel(t.duration));
  meta.textContent = parts.join(' · ') || window.t('date.none');
  body.append(title, meta);

  li.append(rankEl, body);
  return li;
}

function renderProjectEventSection(items, { allowImport, projectId } = {}) {
  const block = document.createElement('div');
  block.className = 'proj-task-group';
  const head = document.createElement('div');
  head.className = 'proj-group-label';
  head.textContent = `${t('projects.events.label')} [${items.length}]`;
  const ul = document.createElement('ul');
  ul.className = 'proj-task-list';
  if (!items.length) {
    const placeholder = document.createElement('li');
    placeholder.className = 'proj-task-placeholder';
    if (allowImport && projectId) {
      placeholder.append(createEmptyState({
        message: t('proj.event.empty'),
        actionLabel: t('proj.task.import.btn'),
        buttonClass: 'link-btn proj-import-btn',
        onAction: () => openProjectImportPicker(projectId, 'event'),
        className: 'empty-state empty-state-inline empty-card empty-card--left',
      }));
    } else {
      placeholder.append(createEmptyState({
        message: t('proj.event.empty'),
        className: 'empty-state empty-state-inline empty-card empty-card--left',
      }));
    }
    ul.append(placeholder);
  } else {
    items.forEach((t) => ul.append(renderProjectEventRow(t)));
  }
  block.append(head, ul);
  return block;
}

function getImportableTasks() {
  return getImportableTasksForProject(null);
}

function getImportableEvents() {
  const timelineEvents = (state.timeline || []).filter((t) => !t.completed && !t.projectId);
  // 월간 캐시에만 있는 gcal 이벤트도 포함 (state.timeline엔 오늘 gcal만 있음)
  const timelineIds = new Set(timelineEvents.map((t) => t.id));
  const cachedEvents = typeof getCachedMonthEvents === 'function'
    ? Object.keys(calMonthEventsCache || {}).flatMap((key) =>
        getCachedMonthEvents(key).filter((t) => !t.completed && !t.projectId && !timelineIds.has(t.id))
      )
    : [];
  return [...timelineEvents, ...cachedEvents];
}

function getProjectEvents(projectId, { includeCompleted = false } = {}) {
  return (state.timeline || []).filter((t) => {
    if (t.projectId !== projectId) return false;
    return includeCompleted || !t.completed;
  });
}

async function linkItemToProject(kind, id, projectId) {
  if (kind === 'task') {
    const m = findMemo(id);
    if (m) {
      if (projectId === '__archive__') {
        m.projectId = null;
      } else {
        m.projectId = projectId;
      }
      const section = m.priority ? 'active' : 'pending';
      const orderKey = projectId === '__archive__' ? '__archive__' : projectId;
      const order = getProjectSectionOrder(orderKey, section);
      if (!order.includes(m.id)) order.push(m.id);
    }
  } else {
    const t = state.timeline.find((x) => x.id === id);
    if (t) t.projectId = projectId;
  }
  await persist();
  closeProjectImportPanel();
  renderProjectDetail(projectId);
  toast('프로젝트에 연결했어요 ✓');
}

function closeProjectImportPanel() {
  $('#proj-import-panel')?.remove();
}

function openProjectImportPicker(projectId, focus = 'task') {
  closeProjectImportPanel();
  const tasks = getImportableTasksForProject(projectId);
  const events = getImportableEvents();

  const overlay = document.createElement('div');
  overlay.id = 'proj-import-panel';
  overlay.className = 'proj-import-panel';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeProjectImportPanel();
  });

  const panel = document.createElement('div');
  panel.className = 'proj-import-inner';
  panel.addEventListener('click', (e) => e.stopPropagation());

  const head = document.createElement('div');
  head.className = 'proj-import-head';
  const title = document.createElement('h2');
  title.className = 'proj-import-title';
  title.textContent = projectId === '__archive__' ? t('projects.import.archive.title') : t('projects.import.title');
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'icon-btn';
  closeBtn.setAttribute('aria-label', t('settings.close'));
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', closeProjectImportPanel);
  head.append(title, closeBtn);

  const buildSection = (sectionLabel, items, kind) => {
    const section = document.createElement('div');
    section.className = 'proj-import-section';
    const lbl = document.createElement('div');
    lbl.className = 'proj-import-section-label';
    lbl.textContent = `${sectionLabel} (${items.length})`;
    section.append(lbl);
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'proj-import-empty';
      empty.textContent = kind === 'task' ? t('projects.import.tasks.empty') : t('projects.import.events.empty');
      section.append(empty);
    } else {
      const ul = document.createElement('ul');
      ul.className = 'proj-import-list';
      items.forEach((item) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'proj-import-item';
        const name = document.createElement('span');
        name.className = 'proj-import-item-title';
        name.textContent = kind === 'task' ? item.content : item.title;
        const meta = document.createElement('span');
        meta.className = 'proj-import-item-meta';
        if (kind === 'task') {
          meta.textContent = item.priority ? BUCKETS.find((b) => b.key === item.priority)?.label || item.priority : 'Inbox';
        } else {
          meta.textContent = [item.date, item.time && !item.allDay ? item.time : null].filter(Boolean).join(' · ');
        }
        btn.append(name, meta);
        btn.addEventListener('click', () => linkItemToProject(kind, item.id, projectId));
        li.append(btn);
        ul.append(li);
      });
      section.append(ul);
    }
    return section;
  };

  panel.append(
    head,
    buildSection(t('projects.import.tasks'), tasks, 'task'),
    buildSection(t('projects.import.events'), events, 'event'),
  );

  const foot = document.createElement('div');
  foot.className = 'proj-import-foot';
  const newTask = document.createElement('button');
  newTask.type = 'button';
  newTask.className = 'btn btn-secondary';
  newTask.textContent = t('projects.new.task');
  newTask.addEventListener('click', () => {
    closeProjectImportPanel();
    openCompose({ mode: 'task', preset: { bucket: 'should', projectId } });
  });
  const newEvent = document.createElement('button');
  newEvent.type = 'button';
  newEvent.className = 'btn btn-secondary';
  newEvent.textContent = t('projects.new.event');
  newEvent.addEventListener('click', () => {
    closeProjectImportPanel();
    openCompose({ mode: 'event', preset: { projectId } });
  });
  foot.append(newTask, newEvent);
  panel.append(foot);

  overlay.append(panel);
  $('#project-detail-root')?.append(overlay);

  const target = panel.querySelector(focus === 'event' ? '.proj-import-section:nth-child(3)' : '.proj-import-section:nth-child(2)');
  target?.scrollIntoView({ block: 'nearest' });
}

function renderProjectDetail(projectId) {
  const root = $('#project-detail-root');
  if (!root) return;
  detachNavRail();
  root.replaceChildren();

  const isArchive = projectId === '__archive__';
  const project = isArchive ? null : findProject(projectId);
  if (!isArchive && !project) {
    navigateTo('projects');
    return;
  }

  const tasks = isArchive ? getArchiveMemos() : getProjectMemos(projectId);
  let { total, done, pct } = isArchive
    ? { total: tasks.length, done: tasks.filter((m) => m.completed).length, pct: 0 }
    : getProjectProgress(projectId);
  if (isArchive && total) pct = Math.round((done / total) * 100);

  const header = document.createElement('div');
  header.className = 'route-page-header';

  const head = document.createElement('div');
  head.className = 'route-page-head';
  const title = document.createElement('h2');
  title.className = 'route-title';
  title.textContent = isArchive ? t('projects.archive') : project.name;
  const headActions = document.createElement('div');
  headActions.className = 'proj-detail-actions';
  if (!isArchive) {
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn-secondary btn-xs';
    editBtn.textContent = t('projects.edit');
    editBtn.addEventListener('click', () => {
      openProjectSheet({
        title: t('projects.edit'),
        submitLabel: t('settings.save'),
        initialName: project.name,
        initialEmoji: project.emoji || '📁',
        initialStatus: project.status,
        initialArea: project.area,
        initialImportance: project.importance,
        initialStartDate: project.startDate || '',
        initialEndDate: project.endDate || '',
        onSubmit: async (data) => {
          if (!data.name) { toast('이름을 입력해 주세요'); return false; }
          await updateProject(projectId, {
            name: data.name,
            emoji: data.emoji,
            status: data.status,
            area: data.area,
            importance: data.importance,
            startDate: data.startDate,
            endDate: data.endDate,
          });
          renderProjectDetail(projectId);
          return true;
        },
      });
    });
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn-secondary btn-xs';
    delBtn.textContent = t('projects.delete');
    delBtn.addEventListener('click', () => deleteProject(projectId));
    headActions.append(editBtn, delBtn);
  }
  head.append(title, headActions);
  header.append(createRouteTopbar(t('projects.detail.back'), () => navigateTo('projects')), head);
  root.append(header);

  if (!isArchive) {
    const overview = document.createElement('div');
    overview.className = 'proj-overview';
    const dLeft = project.endDate ? daysUntil(project.endDate) : null;
    const statusKey = normalizeProjectStatus(project.status);
    const st = PROJECT_STATUS[statusKey] || PROJECT_STATUS.active;

    const oTop = document.createElement('div');
    oTop.className = 'proj-overview-top';
    const emoji = document.createElement('span');
    emoji.className = 'proj-emoji';
    emoji.textContent = project.emoji || '📁';
    const oInfo = document.createElement('div');
    const oMeta = document.createElement('div');
    oMeta.className = 'proj-overview-range';
    oMeta.textContent = formatProjectMeta(project);
    const oRange = document.createElement('div');
    oRange.className = 'proj-overview-sub';
    const rangeText = formatProjectRange(project);
    if (rangeText) {
      oRange.textContent = `${rangeText}${dLeft != null ? ` · D-${Math.max(0, dLeft)}` : ''}`;
    } else {
      oRange.textContent = t('projects.no.period');
      oRange.classList.add('is-muted');
    }
    const oBadge = document.createElement('span');
    oBadge.className = `proj-badge ${st.cls}`;
    oBadge.textContent = st.label;
    oInfo.append(oMeta, oRange, oBadge);
    oTop.append(emoji, oInfo);

    const progRow = document.createElement('div');
    progRow.className = 'proj-progress-row';
    progRow.append(document.createTextNode(t('projects.progress')));
    const progVal = document.createElement('strong');
    progVal.textContent = `${pct}%`;
    progRow.append(progVal);

    const track = document.createElement('div');
    track.className = 'progress-track proj-progress-track';
    const fill = document.createElement('div');
    fill.className = 'progress-fill';
    fill.style.width = `${pct}%`;
    track.append(fill);

    const meta = document.createElement('div');
    meta.className = 'proj-progress-meta';
    meta.textContent = t('projects.tasks.meta', done, total, dLeft);

    overview.append(oTop, progRow, track, meta);
    root.append(overview);
    if (project.startDate && project.endDate) {
      root.append(renderProjectTimelineBar(project, pct));
    }
  } else {
    const hint = document.createElement('p');
    hint.className = 'proj-archive-hint';
    hint.textContent = t('projects.unclassified.hint');
    root.append(hint);
  }

  const taskHead = document.createElement('div');
  taskHead.className = 'proj-tasks-head';
  const taskLabel = document.createElement('span');
  taskLabel.className = 'route-label';
  taskLabel.textContent = t('projects.tasks.label');
  const addTask = createAddButton(t('ui.add.task'));
  addTask.addEventListener('click', () => {
    const preset = isArchive
      ? { bucket: 'should' }
      : { bucket: 'should', projectId };
    openCompose({ mode: 'task', preset });
  });
  taskHead.append(taskLabel, addTask);
  root.append(taskHead);

  const grouped = groupProjectTasks(tasks);
  const projectKey = isArchive ? '__archive__' : projectId;
  root.append(
    renderProjectTaskSection(t('projects.status.active'), grouped.active, {
      allowImport: true, projectId: projectKey, sectionKey: 'active', projectKey,
    }),
    renderProjectTaskSection(t('projects.status.pending'), grouped.pending, {
      allowImport: true, projectId: projectKey, sectionKey: 'pending', projectKey,
    }),
    renderProjectTaskSection(t('projects.status.done'), grouped.done, {
      allowImport: true, projectId: projectKey, sectionKey: 'done', projectKey,
    }),
  );

  if (!isArchive) {
    const eventHead = document.createElement('div');
    eventHead.className = 'proj-tasks-head';
    const eventLabel = document.createElement('span');
    eventLabel.className = 'route-label';
    eventLabel.textContent = t('projects.events.label');
    const addEvent = createAddButton(t('ui.add.event'));
    addEvent.addEventListener('click', () => {
      openCompose({ mode: 'event', preset: { projectId } });
    });
    eventHead.append(eventLabel, addEvent);
    root.append(eventHead);
    root.append(renderProjectEventSection(getProjectEvents(projectId), { allowImport: true, projectId }));
  }
  bindProjectTaskDragDrop(root, projectId);
  mountNavRail();
}
