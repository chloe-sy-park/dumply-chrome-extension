/* 크롬 바 검색·알림 패널 */

'use strict';

/* ── 검색 ── */

function openSearchSheet() {
  const sheet = $('#search-sheet');
  if (!sheet) return;
  const inp = $('#search-input');
  inp.value = '';
  renderSearchResults('');
  sheet.hidden = false;
  inp.focus();
}

function closeSearchSheet() {
  const sheet = $('#search-sheet');
  if (sheet) sheet.hidden = true;
}

function qpGo(fn) {
  closeSearchSheet();
  closeNotifSheet();
  fn();
}

function qpBucketLabel(priority) {
  if (!priority) return 'Inbox';
  return priority === 'wont' ? "Won't" : priority.charAt(0).toUpperCase() + priority.slice(1);
}

function searchAll(query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const hit = (s) => (s || '').toLowerCase().includes(needle);
  const groups = [];

  const tasks = state.memos.filter((m) => hit(m.content));
  if (tasks.length) {
    groups.push({
      label: t('search.group.tasks'),
      rows: tasks.map((m) => ({
        text: m.content,
        meta: qpBucketLabel(m.priority),
        done: m.completed,
        go: () => openDetail({ kind: 'memo', id: m.id }),
      })),
    });
  }

  const remembers = state.remember.filter((r) => hit(r.text));
  if (remembers.length) {
    groups.push({
      label: t('search.group.remember'),
      rows: remembers.map((r) => ({
        text: r.text,
        meta: r.deadline ? formatComposeDateWithWeekday(r.deadline) : '',
        done: r.completed,
        go: () => openDetail({ kind: 'remember', id: r.id }),
      })),
    });
  }

  const projects = state.projects.filter((p) => hit(p.name));
  if (projects.length) {
    groups.push({
      label: t('search.group.projects'),
      rows: projects.map((p) => ({
        text: p.name,
        meta: '',
        done: false,
        go: () => navigateTo('project-detail', { projectId: p.id }),
      })),
    });
  }

  const bands = (state.calendarBands || []).filter((b) => hit(b.title));
  if (bands.length) {
    groups.push({
      label: t('search.group.calendar'),
      rows: bands.map((b) => ({
        text: b.title,
        meta: b.startDate ? formatComposeDateWithWeekday(b.startDate) : '',
        done: false,
        go: () => navigateTo('calendar'),
      })),
    });
  }

  return groups;
}

function qpCreateRow(row) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'qp-row';
  const text = document.createElement('span');
  text.className = `qp-row-text${row.done ? ' is-done' : ''}`;
  text.textContent = row.text;
  btn.append(text);
  if (row.meta) {
    const meta = document.createElement('span');
    meta.className = `qp-row-meta${row.overdue ? ' is-overdue' : ''}`;
    meta.textContent = row.meta;
    btn.append(meta);
  }
  btn.addEventListener('click', () => qpGo(row.go));
  return btn;
}

function qpRenderGroups(root, groups, emptyMsg) {
  root.replaceChildren();
  if (!groups.length) {
    if (emptyMsg) {
      const empty = document.createElement('p');
      empty.className = 'qp-empty';
      empty.textContent = emptyMsg;
      root.append(empty);
    }
    return;
  }
  groups.forEach((g) => {
    const label = document.createElement('span');
    label.className = 'section-label qp-group-label';
    label.textContent = g.label;
    root.append(label);
    g.rows.forEach((r) => root.append(qpCreateRow(r)));
  });
}

function renderSearchResults(query) {
  const root = $('#search-results');
  if (!root) return;
  const groups = searchAll(query);
  qpRenderGroups(root, groups, query.trim() ? t('search.empty') : '');
}

/* ── 알림 — 지연·오늘 마감 ── */

function getNotifGroups() {
  const today = todayStr();
  const overdue = [];
  const dueToday = [];
  const push = (list, item) => list.push(item);

  state.memos.filter((m) => !m.completed && m.deadline).forEach((m) => {
    const row = {
      text: m.content,
      meta: formatComposeDateWithWeekday(m.deadline),
      date: m.deadline,
      go: () => openDetail({ kind: 'memo', id: m.id }),
    };
    if (m.deadline < today) push(overdue, { ...row, overdue: true });
    else if (m.deadline === today) push(dueToday, row);
  });

  state.remember.filter((r) => !r.completed && r.deadline).forEach((r) => {
    const timePart = r.deadlineTime ? ` ${r.deadlineTime}` : '';
    const row = {
      text: r.text,
      meta: `${formatComposeDateWithWeekday(r.deadline)}${timePart}`,
      date: r.deadline,
      go: () => openDetail({ kind: 'remember', id: r.id }),
    };
    if (r.deadline < today) push(overdue, { ...row, overdue: true });
    else if (r.deadline === today) push(dueToday, row);
  });

  overdue.sort((a, b) => a.date.localeCompare(b.date));
  const groups = [];
  if (overdue.length) groups.push({ label: t('notif.group.overdue'), rows: overdue });
  if (dueToday.length) groups.push({ label: t('notif.group.today'), rows: dueToday });
  return groups;
}

function updateNotifDot() {
  const dot = document.querySelector('#btn-hdr-notif .hdr-notif-dot');
  if (!dot) return;
  dot.hidden = !getNotifGroups().length;
}

function openNotifSheet() {
  const sheet = $('#notif-sheet');
  if (!sheet) return;
  qpRenderGroups($('#notif-list'), getNotifGroups(), t('notif.empty'));
  sheet.hidden = false;
}

function closeNotifSheet() {
  const sheet = $('#notif-sheet');
  if (sheet) sheet.hidden = true;
}
