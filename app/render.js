/* 렌더링 */

'use strict';

async function renderHeader() {
  const now = new Date();

  const h = now.getHours();
  const part = h < 5 ? t('home.greeting.night') : h < 12 ? t('home.greeting.morning') : h < 18 ? t('home.greeting.afternoon') : t('home.greeting.evening');
  const name = state.settings.userName;
  const isEn = AlfredoI18n.lang() === 'en';
  $('#hdr-greeting').textContent = name ? (isEn ? `${part}, ${name}` : `${part}, ${name}님`) : part;

  $('#hdr-meta').textContent = isEn
    ? now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', weekday: 'short' })
    : `${now.getMonth() + 1}월 ${now.getDate()}일 ${WEEKDAYS[now.getDay()]}요일`;

  const weatherEl = $('#hdr-weather');

  function showWeather(w) {
    if (!w) {
      weatherEl.hidden = true;
      weatherEl.textContent = '';
      return;
    }
    weatherEl.hidden = false;
    weatherEl.textContent = `${w.emoji} ${w.temp}°`;
    weatherEl.title = w.label;
    weatherEl.setAttribute('aria-label', `${w.label}, ${w.temp}도`);
  }

  try {
    if (weatherCache) {
      showWeather(weatherCache);
    } else if (state.settings.lat != null && state.settings.lon != null) {
      weatherCache = await AlfredoWeather.fetchWeather(state.settings.lat, state.settings.lon);
      showWeather(weatherCache);
    }

    // GPS 우선 갱신 (백그라운드)
    AlfredoWeather.getDeviceLocation()
      .then(async (coords) => {
        const moved =
          state.settings.lat !== coords.lat || state.settings.lon !== coords.lon;
        state.settings.lat = coords.lat;
        state.settings.lon = coords.lon;
        state.settings.locationEnabled = true;
        weatherCache = await AlfredoWeather.fetchWeather(coords.lat, coords.lon);
        showWeather(weatherCache);
        if (moved) await persist();
      })
      .catch(async () => {
        if (weatherCache) return;
        const w = await AlfredoWeather.load(state.settings, {
          preferGeo: false,
          onCoords: (coords) => {
            state.settings.lat = coords.lat;
            state.settings.lon = coords.lon;
            state.settings.locationEnabled = true;
            persist().catch(() => {});
          },
        });
        weatherCache = w;
        showWeather(w);
      });
  } catch {
    showWeather(null);
  }
}

// 고유명사 등록 카테고리 (아이콘·타입 자동 매핑)
function getTagCategories() {
  return [
    { key: 'pet', type: 'life', icon: '🐾', label: t('dict.cat.pet') },
    { key: 'person', type: 'person', icon: '👤', label: t('dict.cat.person') },
    { key: 'place', type: 'life', icon: '📍', label: t('dict.cat.place') },
    { key: 'project', type: 'work', icon: '📁', label: t('dict.cat.project') },
    { key: 'etc', type: 'life', icon: '🏷️', label: t('dict.cat.etc') },
  ];
}

/** 후보 단어의 맥락으로 카테고리 자동 추천 (없으면 기타) */
function guessTagCategory(text) {
  if (/동물병원|수의사|접종|강아지|고양이|반려|사료|산책/.test(text)) return 'pet';
  if (/대표|팀장|과장|부장|선생|친구|동생|형|누나|언니|오빠|님|씨/.test(text)) return 'person';
  if (/카페|식당|공원|회사|학교|병원|매장|점|역/.test(text)) return 'place';
  if (/프로젝트|런칭|출시|기획|개발|배포/.test(text)) return 'project';
  return 'etc';
}

function renderLiveTags(text) {
  AlfredoTags.setDictionary(state?.settings?.dictionary || []);
  const el = $('#live-tags');
  el.replaceChildren();

  AlfredoTags.extract(text).forEach((t) => {
    const span = document.createElement('span');
    span.className = 'live-tag';
    span.textContent = `${t.icon} ${t.label}`;
    el.append(span);
  });

  // 미인식 고유명사 후보 → "등록?" 칩
  AlfredoTags.extractCandidates(text).forEach((term) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'live-tag live-tag-candidate';
    chip.dataset.candidate = term;
    chip.dataset.context = text;
    const t = document.createElement('span');
    t.textContent = term;
    const plus = document.createElement('span');
    plus.className = 'live-tag-plus';
    plus.textContent = '＋';
    chip.append(t, plus);
    el.append(chip);
  });
}

function highlightCandOption(btns, key) {
  Object.entries(btns).forEach(([k, b]) => b.classList.toggle('is-suggested', k === key));
}

/** 후보 칩 자리에서 카테고리 선택 → 사전 등록 (하이브리드: 정규식 즉시 추천 + AI 보강) */
function openCandidatePicker(chip) {
  const term = chip.dataset.candidate;
  if (!term) return;
  const context = chip.dataset.context || term;

  const picker = document.createElement('span');
  picker.className = 'cand-picker';
  const lead = document.createElement('span');
  lead.className = 'cand-picker-term';
  lead.textContent = `"${term}"`;
  picker.append(lead);

  const btns = {};
  getTagCategories().forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cand-opt';
    b.dataset.cat = c.key;
    b.textContent = `${c.icon} ${c.label}`;
    b.addEventListener('click', () => {
      // AI가 더 적합한 아이콘/라벨을 줬으면 사용
      const ov = b._aiOverride;
      registerCandidate(term, ov ? { ...c, icon: ov.icon || c.icon, label: ov.label || term } : c);
    });
    btns[c.key] = b;
    picker.append(b);
  });
  chip.replaceWith(picker);

  // 즉시: 정규식 맥락 추천
  highlightCandOption(btns, guessTagCategory(context));

  // 키 있으면 AI로 더 정확히 보강 (비차단, 실패 시 정규식 유지)
  if (AlfredoAI.hasKey(state.settings)) {
    const hint = document.createElement('span');
    hint.className = 'cand-ai-hint';
    hint.textContent = t('ai.analyzing');
    picker.append(hint);
    AlfredoAI.classifyTerm(state.settings, term, context)
      .then((r) => {
        hint.remove();
        if (!r || !btns[r.category]) return;
        highlightCandOption(btns, r.category);
        if (r.icon) {
          btns[r.category]._aiOverride = { icon: r.icon, label: r.label };
          const cat = getTagCategories().find((c) => c.key === r.category);
          btns[r.category].textContent = `${r.icon} ${cat.label}`;
        }
      })
      .catch(() => hint.remove());
  }
}

async function registerCandidate(term, cat) {
  if (!state.settings.dictionary) state.settings.dictionary = [];
  if (!state.settings.dictionary.some((e) => e.term === term)) {
    state.settings.dictionary.push({ term, type: cat.type, icon: cat.icon, label: term });
  }
  AlfredoTags.setDictionary(state.settings.dictionary);
  await persist();
  renderLiveTags($('#dump-input')?.value || '');
  toastUndo(t('dict.added', term), () => {
    state.settings.dictionary = state.settings.dictionary.filter((e) => e.term !== term);
    AlfredoTags.setDictionary(state.settings.dictionary);
    renderLiveTags($('#dump-input')?.value || '');
  });
}

function fillInboxCard() {
  const cardEl = $('#inbox-card');
  const countEl = $('#inbox-count');
  const applyBtn = $('#btn-apply-suggestions');
  if (!cardEl) return;
  const items = getInboxMemos();
  const suggested = items.filter((m) => m.suggestedPriority && isValidBucket(m.suggestedPriority));
  if (countEl) countEl.textContent = String(items.length);
  if (applyBtn) {
    applyBtn.hidden = suggested.length === 0;
    applyBtn.textContent = suggested.length > 1
      ? t('inbox.classify.btn.count', suggested.length)
      : t('inbox.classify.btn');
  }
  cardEl.replaceChildren();

  if (!items.length) {
    cardEl.append(createEmptyState({
      message: t('inbox.empty'),
      className: 'empty-state empty-state-inline inbox-empty',
    }));
    return;
  }

  // 추천 버킷 순(Must→Should→Could→Won't)으로 정렬, 미추천은 뒤로, 그다음 입력순
  const rank = { must: 0, should: 1, could: 2, wont: 3 };
  const ordered = [...items].sort((a, b) => {
    const ra = rank[a.suggestedPriority] ?? 9;
    const rb = rank[b.suggestedPriority] ?? 9;
    if (ra !== rb) return ra - rb;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  // 오늘 컨디션이 낮으면 부드러운 안내 — 수집한 감정/에너지 신호를 행동으로 연결
  const energy = computeEnergyState([...items, ...getFeelingMemos()]);
  if (energy.strained) {
    const banner = document.createElement('div');
    banner.className = 'inbox-mood-banner';
    const mustCount = ordered.filter((m) => m.suggestedPriority === 'must' || m.priority === 'must').length;
    banner.textContent = mustCount > 1 ? t('inbox.mood.low') : t('inbox.mood.rest');
    cardEl.append(banner);
  }

  ordered.forEach((m) => cardEl.append(createInboxRow(m)));
  bindInboxDrag();
}

function bindInboxDrag() {
  bindDraggableRows($('#inbox-card'), '.inbox-row[draggable]', {
    dragExclude: '.inbox-row-chips, .inbox-check, .mini-btn',
    getDragPayload: (item) => ({ id: item.dataset.id, bucket: 'inbox' }),
  });
}

function renderInbox() {
  fillInboxCard();
  renderFeelings();
  renderPonders();
  scheduleInboxSuggestions();
}

/** 오늘의 마음 — 감정표현 기록 (할 일 아님) */
function renderFeelings() {
  const section = $('#feelings-section');
  const card = $('#feelings-card');
  if (!section || !card) return;
  const items = getFeelingMemos();
  section.hidden = items.length === 0;
  card.replaceChildren();
  items.forEach((m) => {
    const row = document.createElement('div');
    row.className = 'mind-row';
    if (typeof aiAppliedIds !== 'undefined' && aiAppliedIds.has(m.id)) row.classList.add('is-ai-applied');
    const body = document.createElement('div');
    body.className = 'mind-row-body';
    const text = document.createElement('span');
    text.className = 'mind-text';
    text.textContent = m.content;
    body.append(text);
    const moods = (m.tags || []).filter((t) => t.type === 'emotion' || t.type === 'energy').slice(0, 3);
    if (moods.length) {
      const tagWrap = document.createElement('div');
      tagWrap.className = 'mind-tags';
      moods.forEach((t) => {
        const chip = document.createElement('span');
        chip.className = 'inbox-mood-tag';
        chip.textContent = `${t.icon} ${t.label}`;
        tagWrap.append(chip);
      });
      body.append(tagWrap);
    }
    row.append(body, createRowDeleteButton(m.id));
    card.append(row);
  });
}

/** 생각 중 — 고민/미결정 (우선순위 강요 안 함) */
function renderPonders() {
  const section = $('#ponders-section');
  const card = $('#ponders-card');
  if (!section || !card) return;
  const items = getPonderMemos();
  section.hidden = items.length === 0;
  card.replaceChildren();
  items.forEach((m) => {
    const row = document.createElement('div');
    row.className = 'mind-row ponder-row';
    if (typeof aiAppliedIds !== 'undefined' && aiAppliedIds.has(m.id)) row.classList.add('is-ai-applied');
    const text = document.createElement('span');
    text.className = 'mind-text';
    text.textContent = m.content;

    const actions = document.createElement('div');
    actions.className = 'ponder-actions';
    const toTask = document.createElement('button');
    toTask.type = 'button';
    toTask.className = 'ponder-totask';
    toTask.dataset.act = 'ponder-to-task';
    toTask.dataset.id = m.id;
    toTask.textContent = t('ponder.to.task');
    actions.append(toTask, createRowDeleteButton(m.id));

    row.append(text, actions);
    card.append(row);
  });
}

function renderMoscow() {
  const board = $('#moscow-board');
  board.replaceChildren();
  board.className = 'moscow-board';
  const open = state.memos.filter((m) => !m.completed && m.priority);

  BUCKETS.forEach((b) => {
    const items = sortByOrder(open.filter((m) => m.priority === b.key), b.key);
    const warn = b.key === 'must' && items.length > 3;
    const bucketEl = document.createElement('div');
    bucketEl.className = 'bucket';
    bucketEl.dataset.bucket = b.key;

    const head = document.createElement('div');
    head.className = 'bucket-head';
    const title = document.createElement('span');
    title.className = 'bucket-title';
    title.textContent = b.label;
    const sub = document.createElement('span');
    sub.className = 'bucket-sub';
    sub.textContent = b.sub;
    head.append(createPriorityDot(b.key, { size: 'sm' }), title, sub);
    const count = document.createElement('span');
    count.className = `bucket-count ${warn ? 'bucket-warn' : ''}`;
    count.textContent = warn ? t('unit.warn.count', items.length) : t('unit.count', items.length);
    head.append(count);

    const list = document.createElement('ul');
    list.className = 'bucket-list';
    list.dataset.bucket = b.key;

    if (items.length) {
      items.forEach((m) => list.append(createTaskRow(m, { variant: 'bucket', draggable: true, bucket: m.priority })));
    } else {
      const empty = document.createElement('li');
      empty.className = 'bucket-empty';
      empty.textContent = t('moscow.empty');
      list.append(empty);
    }

    bucketEl.append(head, list);
    board.append(bucketEl);
  });

  // 방금 분류된 항목이 보드에 "착지"하는 애니메이션 (1회)
  if (typeof justLandedIds !== 'undefined' && justLandedIds.size) {
    justLandedIds.forEach((id) => {
      const el = board.querySelector(`.bucket-item[data-id="${id}"]`);
      if (el) el.classList.add('is-landed');
    });
    justLandedIds.clear();
  }

  bindMoscowDragDrop();
}

function bindMoscowDragDrop() {
  const board = $('#moscow-board');
  if (!board) return;

  bindDraggableRows(board, '.bucket-item[draggable]', {
    dragExclude: '.mini-btn, .bucket-actions',
    getDragPayload: (item) => ({ id: item.dataset.id, bucket: item.dataset.bucket }),
  });

  bindDropTargetLists(board, '.bucket-list', {
    onDrop: async (_e, list) => {
      if (!dragItem) return;
      await classifyMemoToBucket(dragItem.id, list.dataset.bucket);
    },
  });
}

function renderDashboard() {
  const all = getTopPriorities(20);
  const limit = state.top3Expanded ? Math.min(8, all.length) : 3;
  const items = all.slice(0, limit);
  const list = $('#prio-list');
  list.replaceChildren();
  if (!items.length) {
    const today = todayStr();
    const hasLater = state.memos.some(
      (m) => !m.completed && (m.priority === 'must' || m.priority === 'should') && m.deadline && m.deadline > today,
    );
    let message = t('home.empty.board');
    if (hasLater) message = t('home.empty.board.later');
    else if (getInboxMemos().length) message = t('dashboard.priority.empty.hint');

    const empty = createEmptyState({
      message,
      className: 'empty-state empty-card empty-card--center prio-empty',
      hint: !hasLater && !getInboxMemos().length ? t('home.empty.board.hint') : null,
    });
    list.append(empty);
  } else {
    items.forEach((m, i) => list.append(createTaskRow(m, { variant: 'prio', rank: i + 1 })));
  }

  const badge = document.getElementById('prio-badge');
  if (badge) {
    if (items.length) {
      const done = items.filter(m => m.completed).length;
      badge.textContent = `${done}/${items.length}`;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  const expandBtn = $('#btn-prio-expand');
  if (expandBtn) {
    const more = all.length - 3;
    expandBtn.hidden = more <= 0;
    expandBtn.textContent = state.top3Expanded ? t('home.collapse') : t('home.expand', more);
  }
  renderRemember();
  renderTimeline();
}

function renderRemember() {
  const card = $('#remember-card');
  card.replaceChildren();
  const active = state.remember.filter((r) => !r.completed);
  if (!active.length) {
    card.classList.add('is-empty');
    const div = document.createElement('button');
    div.type = 'button';
    div.className = 'remember-item remember-empty';
    div.textContent = t('remember.add.cta');
    div.addEventListener('click', () => showRememberAddInput(card));
    card.append(div);
    return;
  }
  card.classList.remove('is-empty');
  active.forEach((r) => {
    const row = document.createElement('div');
    row.className = 'remember-item row-clickable';
    row.dataset.id = r.id;
    if (typeof aiAppliedIds !== 'undefined' && aiAppliedIds.has(r.id)) row.classList.add('is-ai-applied');
    row.addEventListener('click', (e) => {
      if (e.target.closest('.remember-check')) return;
      openDetail({ kind: 'remember', id: r.id });
    });
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.className = 'remember-check';
    chk.dataset.id = r.id;
    if (r.pinned) {
      const pin = document.createElement('span');
      pin.className = 'remember-pin';
      pin.textContent = t('remember.pin');
      row.append(chk, pin);
    } else {
      row.append(chk);
    }
    const body = document.createElement('div');
    body.className = 'remember-body';
    const txt = document.createElement('span');
    txt.className = 'remember-text';
    txt.textContent = r.text;
    body.append(txt);
    if (r.deadline) {
      const due = document.createElement('span');
      due.className = 'remember-due';
      const timePart = r.deadlineTime ? ` ${r.deadlineTime}` : '';
      due.textContent = `${formatComposeDateWithWeekday(r.deadline)}${timePart}`;
      body.append(due);
    }
    row.append(body);
    card.append(row);
  });
}

function showRememberAddInput(card) {
  card.classList.remove('is-empty');
  card.replaceChildren();
  const row = document.createElement('div');
  row.className = 'remember-item remember-add';
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'remember-add-input';
  inp.placeholder = t('remember.placeholder');
  let submitting = false;
  inp.addEventListener('keydown', async (e) => {
    if (e.key === 'Escape') {
      renderRemember();
      return;
    }
    // 한글 IME 조합 중 Enter는 keydown이 두 번 발생 → 중복 등록 방지
    if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    const text = inp.value.trim();
    if (!text || submitting) return;
    submitting = true;
    state.remember.push({
      id: AlfredoStorage.uid(),
      text,
      pinned: false,
      completed: false,
      deadline: null,
      deadlineTime: null,
    });
    await persist();
    renderRemember();
  });
  row.append(inp);
  card.append(row);
  inp.focus();
}

function renderTimeline() {
  renderTimeBlockTimeline();
}

function renderAll() {
  syncRoutes?.();
  if (typeof renderCurrentRoute === 'function') {
    renderCurrentRoute();
    return;
  }
  renderHeader();
  renderLiveTags($('#dump-input')?.value || state.dumpDraft || '');
  renderInbox();
  renderMoscow();
  if ($('#view-dashboard')?.classList.contains('is-active')) renderDashboard();
}