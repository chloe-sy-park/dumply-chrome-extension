/* 오늘 타임라인 — 타임블록 (드래그 생성·이동·리사이즈) */

'use strict';

let tbDrag = null;
// 드래그 직후 발생하는 click이 디테일 드로어를 여는 것을 막는다.
// (mouseup에서 tbDrag를 null로 비우므로 click 시점엔 별도 플래그가 필요)
let tbSuppressClick = false;

function tbGridHeight() {
  return (TB_END_HOUR - TB_START_HOUR) * TB_PX_PER_HOUR;
}

function tbMinutesToY(min) {
  return ((min - TB_START_HOUR * 60) / 60) * TB_PX_PER_HOUR;
}

function tbYToMinutes(y) {
  const min = TB_START_HOUR * 60 + (y / TB_PX_PER_HOUR) * 60;
  return snapMinutes(Math.max(TB_START_HOUR * 60, Math.min(TB_END_HOUR * 60 - TB_SNAP_MIN, min)));
}

function tbClampDuration(startMin, duration) {
  const max = TB_END_HOUR * 60 - startMin;
  return Math.max(TB_SNAP_MIN, Math.min(max, snapMinutes(duration)));
}

function computeTimeBlockLayouts(items) {
  const entries = items.map((t) => {
    const startMin = timeToMinutes(t.time || '00:00');
    return { t, startMin, endMin: startMin + getEventDuration(t) };
  }).sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const layouts = new Map();
  entries.forEach((entry) => {
    const overlap = entries.filter(
      (o) => o.startMin < entry.endMin && o.endMin > entry.startMin,
    );
    const laneCount = Math.max(1, overlap.length);
    const lane = overlap.indexOf(entry);
    layouts.set(entry.t.id, { lane, laneCount });
  });
  return layouts;
}

function applyTimeBlockLayout(block, layout) {
  if (!layout || layout.laneCount <= 1) return;
  const gap = 4;
  const lanes = layout.laneCount;
  block.style.right = 'auto';
  block.style.width = `calc((100% - 20px - ${(lanes - 1) * gap}px) / ${lanes})`;
  block.style.left = `calc(10px + ${layout.lane} * ((100% - 20px - ${(lanes - 1) * gap}px) / ${lanes} + ${gap}px))`;
}

function scrollTimelineToTarget(scrollEl, targetMin) {
  if (!scrollEl) return;
  if (targetMin < TB_START_HOUR * 60 || targetMin > TB_END_HOUR * 60) return;
  requestAnimationFrame(() => {
    const y = tbMinutesToY(targetMin);
    scrollEl.scrollTop = Math.max(0, y - scrollEl.clientHeight * 0.35);
  });
}

function scrollTimelineToNow(nowMin) {
  scrollTimelineToTarget(document.querySelector('#timeline-block-wrap .tb-scroll'), nowMin);
}

// 홈의 "오늘 타임라인" — 일반화된 renderDayTimeline의 얇은 래퍼
function renderTimeBlockTimeline() {
  renderDayTimeline(todayStr(), {
    scope: 'home',
    wrap: $('#timeline-block-wrap'),
    hoursEl: $('#tb-hours'),
    grid: $('#tb-grid'),
    onCreate: (id) => openDetail({ kind: 'event', id }),
  });
}

// 특정 날짜의 타임라인을 임의의 컨테이너(홈/드로어)에 렌더한다.
function renderDayTimeline(dateStr, ctx) {
  const { wrap, hoursEl, grid } = ctx;
  if (!hoursEl || !grid) return;
  const isToday = dateStr === todayStr();

  const timelineForDayAll = [...state.timeline]
    .filter((t) => (isToday ? (!t.date || t.date === dateStr) : t.date === dateStr));
  const allDayFromState = timelineForDayAll.filter((t) => t.allDay);
  const timelineForDay = timelineForDayAll.filter((t) => !t.allDay);
  // 월간 구글 캘린더 캐시도 병합 (state.timeline은 오늘만 포함하므로 다른 날짜는 캐시 필요)
  const monthKey = dateStr.slice(0, 7);
  const timelineIds = new Set(timelineForDay.map((t) => t.gcalEventId).filter(Boolean));
  const allDayStateIds = new Set(allDayFromState.map((t) => t.gcalEventId).filter(Boolean));
  const cachedForDay = typeof getCachedMonthEvents === 'function'
    ? getCachedMonthEvents(monthKey).filter((t) => t.date === dateStr && !t.allDay && !timelineIds.has(t.gcalEventId))
    : [];
  const cachedAllDay = typeof getCachedMonthEvents === 'function'
    ? getCachedMonthEvents(monthKey).filter((t) => t.date === dateStr && t.allDay && !allDayStateIds.has(t.gcalEventId))
    : [];
  const allDayItems = [...allDayFromState, ...cachedAllDay];
  const eventItems = [...timelineForDay, ...cachedForDay];

  // 시간이 있는 할 일도 타임라인에 — 읽기 전용 블록으로 표시
  const taskItems = (state.memos || [])
    .filter((m) => !m.completed && (m.kind == null || m.kind === 'task'))
    .map((m) => {
      const time = m.deadlineTime || m.startTime;
      if (!time) return null;
      const tdate = m.deadline || m.startDate || null;
      const onDay = isToday ? (!tdate || tdate === dateStr) : tdate === dateStr;
      if (!onDay) return null;
      return {
        id: m.id,
        title: m.content,
        time,
        duration: m.durationMinutes || 30,
        isTask: true,
        priority: m.priority || null,
        completed: m.completed,
      };
    })
    .filter(Boolean);

  const items = [...eventItems, ...taskItems]
    .sort((a, b) => timeToMinutes(a.time || '00:00') - timeToMinutes(b.time || '00:00'));

  if (wrap) {
    wrap.hidden = false;
    // 홈 타임라인에만 종일 이벤트 배너 표시 (드로어는 renderCalDayAllDay가 별도 처리)
    if (ctx.scope === 'home') {
      let allDayRow = wrap.querySelector('.tb-allday-row');
      if (allDayItems.length) {
        if (!allDayRow) {
          allDayRow = document.createElement('div');
          allDayRow.className = 'tb-allday-row';
          wrap.prepend(allDayRow);
        }
        allDayRow.replaceChildren();
        const label = document.createElement('span');
        label.className = 'tb-allday-label';
        label.textContent = '종일';
        allDayRow.append(label);
        const chips = document.createElement('div');
        chips.className = 'tb-allday-chips';
        allDayItems.forEach((ev) => {
          const chip = document.createElement('span');
          chip.className = 'tb-allday-chip';
          chip.textContent = ev.title || ev.summary || '(제목 없음)';
          if (ev.color) chip.style.setProperty('--chip-color', ev.color);
          chips.append(chip);
        });
        allDayRow.append(chips);
      } else if (allDayRow) {
        allDayRow.remove();
      }
    }
  }
  hoursEl.replaceChildren();
  grid.replaceChildren();
  grid.style.height = `${tbGridHeight()}px`;

  for (let h = TB_START_HOUR; h < TB_END_HOUR; h++) {
    const row = document.createElement('div');
    row.className = 'tb-hour';
    row.style.height = `${TB_PX_PER_HOUR}px`;
    row.textContent = formatTimeLabel(`${String(h).padStart(2, '0')}:00`);
    hoursEl.append(row);

    const line = document.createElement('div');
    line.className = 'tb-grid-line';
    line.style.top = `${(h - TB_START_HOUR) * TB_PX_PER_HOUR}px`;
    grid.append(line);
  }

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (isToday && nowMin >= TB_START_HOUR * 60 && nowMin <= TB_END_HOUR * 60) {
    const nowLine = document.createElement('div');
    nowLine.className = 'tb-now-line';
    nowLine.style.top = `${tbMinutesToY(nowMin)}px`;
    grid.append(nowLine);
  }

  const blockCtx = {
    scope: ctx.scope,
    grid,
    date: dateStr,
    rerender: () => renderDayTimeline(dateStr, ctx),
    onCreate: ctx.onCreate,
    onBlockClick: ctx.onBlockClick || null,
  };
  const layouts = computeTimeBlockLayouts(items);
  items.forEach((t) => grid.append(createTimeBlock(t, isToday ? nowMin : -1, layouts.get(t.id), blockCtx)));

  if (!items.length) {
    if (typeof ctx.onEmptyAdd === 'function') {
      const cta = document.createElement('button');
      cta.type = 'button';
      cta.className = 'tb-empty-hint tb-empty-cta';
      cta.textContent = '＋ 이 날에 일정 추가';
      cta.addEventListener('mousedown', (e) => e.stopPropagation());
      cta.addEventListener('click', (e) => { e.stopPropagation(); ctx.onEmptyAdd(); });
      grid.append(cta);
    } else {
      const hint = document.createElement('div');
      hint.className = 'tb-empty-hint';
      hint.textContent = '드래그해서 일정 블록을 만들어 보세요';
      grid.append(hint);
    }
  }

  bindTimeBlockGrid(grid, blockCtx);
  if (ctx.scope === 'home') {
    updateTimelineSyncBtn();
    scrollTimelineToNow(nowMin);
  } else {
    scrollTimelineToTarget(grid.closest('.tb-scroll'), isToday ? nowMin : 9 * 60);
  }
}

function updateTimelineSyncBtn() {
  const btn = $('#btn-cal-sync');
  if (!btn) return;
  const connected = state.settings.calendar?.connected;
  btn.hidden = !connected;
  if (connected && state.settings.calendar.lastSync) {
    const t = new Date(state.settings.calendar.lastSync);
    btn.title = `Google Calendar · 마지막 동기화 ${t.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (connected) {
    btn.title = 'Google Calendar 동기화';
  }
}

function createTimeBlock(t, nowMin, layout, ctx) {
  const startMin = timeToMinutes(t.time || '00:00');
  const duration = getEventDuration(t);
  const fromGcal = isGcalEvent(t);
  const readonly = fromGcal || t.isTask; // 할 일·구글 일정은 타임라인에서 드래그 불가
  const blockHeight = Math.max(32, (duration / 60) * TB_PX_PER_HOUR);
  const useCondensed = blockHeight < 56;
  const detailLines = getEventBlockDetailLines(t);
  const endMin = startMin + duration;

  const block = document.createElement('div');
  block.className = getTimeBlockClasses(t, nowMin ?? (new Date().getHours() * 60 + new Date().getMinutes()));
  if (useCondensed) block.classList.add('tb-block-condensed');
  if (typeof aiAppliedIds !== 'undefined' && aiAppliedIds.has(t.id)) block.classList.add('is-ai-applied');
  block.dataset.id = t.id;
  block.style.top = `${tbMinutesToY(startMin)}px`;
  block.style.height = `${blockHeight}px`;
  applyTimeBlockLayout(block, layout);

  const title = document.createElement('div');
  title.className = 'tb-block-title';
  title.textContent = t.title || '일정';

  const details = document.createElement('div');
  details.className = 'tb-block-details';

  if (useCondensed) {
    const row = document.createElement('div');
    row.className = 'tb-block-detail tb-block-detail-condensed';
    row.textContent = formatEventBlockCondensed(t) || '🕐 시간 미정';
    details.append(row);
  } else {
    detailLines.forEach((line) => {
      const row = document.createElement('div');
      row.className = `tb-block-detail tb-block-detail-${line.key}`;
      row.textContent = line.text;
      details.append(row);
    });
  }

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'tb-block-del';
  delBtn.setAttribute('aria-label', '삭제');
  delBtn.textContent = '×';
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isGcal = isGcalEvent(t);
    if (isGcal && typeof showConfirmSheet === 'function') {
      showConfirmSheet({
        message: '일정을 삭제할까요?',
        detail: '삭제하면 Google Calendar에도 반영됩니다.',
        confirmLabel: '삭제',
        onConfirm: () => {
          const idx = state.timeline.findIndex((x) => x.id === t.id);
          state.timeline = state.timeline.filter((x) => x.id !== t.id);
          persist();
          renderAll();
        },
      });
    } else {
      const idx = state.timeline.findIndex((x) => x.id === t.id);
      const item = state.timeline[idx];
      state.timeline = state.timeline.filter((x) => x.id !== t.id);
      persist();
      renderAll();
      if (typeof toastUndo === 'function' && item) {
        toastUndo(t('toast.deleted'), () => {
          state.timeline.splice(Math.max(0, idx), 0, item);
          persist();
          renderAll();
        });
      }
    }
  });

  block.append(title, details, delBtn);

  if (!readonly) {
    const resize = document.createElement('div');
    resize.className = 'tb-block-resize';
    resize.dataset.resize = '1';
    block.append(resize);
  }

  if (!readonly) {
    block.addEventListener('mousedown', (e) => {
      if (e.target.closest('[data-resize]')) return;
      if (e.target.closest('.tb-inline-title')) return;   // 인라인 제목 편집 중엔 드래그 금지
      e.preventDefault();
      e.stopPropagation();
      const grid = ctx?.grid || $('#tb-grid');
      const rect = grid.getBoundingClientRect();
      tbDrag = {
        mode: 'move',
        id: t.id,
        moved: false,
        grid,
        offsetY: e.clientY - rect.top - tbMinutesToY(startMin) + grid.scrollTop,
      };
    });

    const resize = block.querySelector('.tb-block-resize');
    resize?.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      tbDrag = { mode: 'resize', id: t.id, moved: false, grid: ctx?.grid || $('#tb-grid'), startDuration: duration };
    });
  } else {
    block.classList.add('is-readonly');
  }

  block.addEventListener('click', (e) => {
    if (tbSuppressClick) {
      tbSuppressClick = false;
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    const kind = t.isTask ? 'memo' : 'event';
    if (typeof ctx?.onBlockClick === 'function') {
      ctx.onBlockClick(kind, t.id);
    } else {
      openDetail({ kind, id: t.id });
    }
  });

  return block;
}

function syncBlockTimeDetail(block, time, duration) {
  const condensed = block.querySelector('.tb-block-detail-condensed');
  if (condensed) {
    const t = state.timeline.find((x) => x.id === block.dataset.id);
    if (t) {
      t.time = time;
      t.duration = duration;
      condensed.textContent = formatEventBlockCondensed(t);
    }
    return;
  }
  const timeEl = block.querySelector('.tb-block-detail-time');
  if (timeEl) timeEl.textContent = formatTimeRange(time, duration);
}

function bindTimeBlockGrid(grid, ctx) {
  grid.onmousedown = (e) => {
    if (e.target.closest('.tb-block')) return;
    e.preventDefault();
    const rect = grid.getBoundingClientRect();
    const y = e.clientY - rect.top + grid.scrollTop;
    const startMin = tbYToMinutes(y);
    tbDrag = {
      mode: 'create',
      startMin,
      endMin: startMin,
      grid,
      draft: null,
      scope: ctx?.scope,
      date: ctx?.date || todayStr(),
      rerender: ctx?.rerender,
      onCreate: ctx?.onCreate,
    };
    tbDrag.draft = document.createElement('div');
    tbDrag.draft.className = 'tb-block tb-draft';
    grid.append(tbDrag.draft);
    updateCreateDraft();
  };
}

function updateCreateDraft() {
  if (!tbDrag?.draft) return;
  const { startMin, endMin } = tbDrag;
  const top = Math.min(startMin, endMin);
  const bottom = Math.max(startMin, endMin);
  const height = Math.max(TB_SNAP_MIN, bottom - top);
  tbDrag.draft.style.top = `${tbMinutesToY(top)}px`;
  tbDrag.draft.style.height = `${Math.max(32, (height / 60) * TB_PX_PER_HOUR)}px`;
}

function onTbMouseMove(e) {
  if (!tbDrag) return;
  const grid = tbDrag.grid || $('#tb-grid');
  if (!grid) return;
  const rect = grid.getBoundingClientRect();
  const y = e.clientY - rect.top + grid.scrollTop;

  if (tbDrag.mode === 'create') {
    tbDrag.endMin = tbYToMinutes(y);
    updateCreateDraft();
    return;
  }

  tbDrag.moved = true;

  if (tbDrag.mode === 'move') {
    const startMin = tbYToMinutes(y - tbDrag.offsetY);
    const t = state.timeline.find((x) => x.id === tbDrag.id);
    if (!t) return;
    t.time = minutesToTime(startMin);
    t.sortOrder = startMin;
    const block = grid.querySelector(`.tb-block[data-id="${tbDrag.id}"]`);
    if (block) {
      block.style.top = `${tbMinutesToY(startMin)}px`;
      syncBlockTimeDetail(block, t.time, getEventDuration(t));
    }
    return;
  }

  if (tbDrag.mode === 'resize') {
    const t = state.timeline.find((x) => x.id === tbDrag.id);
    if (!t) return;
    const startMin = timeToMinutes(t.time || '00:00');
    const endMin = tbYToMinutes(y);
    t.duration = tbClampDuration(startMin, endMin - startMin);
    const block = grid.querySelector(`.tb-block[data-id="${tbDrag.id}"]`);
    if (block) {
      block.style.height = `${Math.max(32, (t.duration / 60) * TB_PX_PER_HOUR)}px`;
      syncBlockTimeDetail(block, t.time, t.duration);
    }
  }
}

async function onTbMouseUp() {
  if (!tbDrag) return;
  const drag = tbDrag;
  tbDrag = null;

  if (drag.mode === 'create') {
    drag.draft?.remove();
    const top = Math.min(drag.startMin, drag.endMin);
    const bottom = Math.max(drag.startMin, drag.endMin);
    const duration = tbClampDuration(top, Math.max(TB_SNAP_MIN, bottom - top));
    const id = AlfredoStorage.uid();
    state.timeline.push({
      id,
      title: t('compose.new.event'),
      date: drag.date || todayStr(),
      time: minutesToTime(top),
      duration,
      completed: false,
      domain: 'local',
      sortOrder: top,
      allDay: false,
      remindMinutes: 10,
      notes: null,
      tags: null,
      with: null,
      location: null,
      source: 'local',
      memoId: null,
    });
    await persist();
    scheduleAlarms();
    if (drag.scope === 'drawer' && typeof renderCalendarView === 'function') {
      // 드로어 타임라인 + 달력 날짜 칩 동시 갱신
      renderCalendarView();
    } else if (drag.rerender) {
      drag.rerender();
    } else {
      renderTimeBlockTimeline();
    }
    if (drag.onCreate) drag.onCreate(id);
    else openDetail({ kind: 'event', id });
    return;
  }

  if (drag.mode === 'move' || drag.mode === 'resize') {
    if (drag.moved) {
      tbSuppressClick = true;   // 이어지는 click이 드로어를 열지 않도록
      await persist();
      scheduleAlarms();
    }
  }
}

function bindTimeBlockGlobalEvents() {
  document.addEventListener('mousemove', onTbMouseMove);
  document.addEventListener('mouseup', onTbMouseUp);
}
