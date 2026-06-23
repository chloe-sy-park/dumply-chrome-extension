/* 액션 · 설정 · AI · 이벤트 */

'use strict';

function getAiModels() {
  return {
    anthropic: [
      { value: 'claude-haiku-4-5-20251001', label: t('model.haiku.label'), hint: t('model.haiku.hint') },
      { value: 'claude-sonnet-4-6',         label: t('model.sonnet.label'), hint: t('model.sonnet.hint') },
    ],
    openai: [
      { value: 'gpt-4o-mini', label: t('model.gpt4omini.label'), hint: t('model.gpt4omini.hint') },
      { value: 'gpt-4o',      label: t('model.gpt4o.label'),     hint: t('model.gpt4o.hint') },
    ],
    gemini: [
      { value: 'gemini-2.0-flash', label: t('model.flash.label'), hint: t('model.flash.hint') },
      { value: 'gemini-1.5-pro',   label: t('model.pro.label'),   hint: t('model.pro.hint') },
    ],
  };
}

function populateModelSelect(provider, selectedValue) {
  const sel = $('#ai-model');
  const hint = $('#ai-model-hint');
  if (!sel) return;
  const models = getAiModels()[provider] || getAiModels().anthropic;
  while (sel.firstChild) sel.removeChild(sel.firstChild);
  models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.value;
    opt.textContent = m.label;
    sel.appendChild(opt);
  });
  const match = models.find(m => m.value === selectedValue);
  sel.value = match ? match.value : models[0].value;
  if (hint) hint.textContent = (models.find(m => m.value === sel.value) || models[0]).hint;
}

function onProviderChange() {
  const provider = $('#ai-provider').value;
  const modelKey = provider === 'anthropic' ? 'model' : provider === 'openai' ? 'openaiModel' : 'geminiModel';
  populateModelSelect(provider, state.settings[modelKey]);
}

function onModelChange() {
  const hint = $('#ai-model-hint');
  if (!hint) return;
  const provider = $('#ai-provider').value;
  const models = getAiModels()[provider] || getAiModels().anthropic;
  const selected = models.find(m => m.value === $('#ai-model').value);
  if (selected) hint.textContent = selected.hint;
}

// 방금 버킷으로 분류된 메모 id — MoSCoW 보드에서 "착지" 애니메이션 1회용
const justLandedIds = new Set();
// 방금 AI가 만든/바꾼 항목 id — "AI 적용" 펄스 애니메이션 1회용
const aiAppliedIds = new Set();
let aiPulseTimer = null;

// 파서가 한 줄을 어떻게 읽었는지 사람이 읽을 근거 문구. 추출한 게 없으면 null.
function buildParseRationale(kind, info) {
  if (kind === 'feeling') return t('classify.feeling');
  if (kind === 'ponder') return t('classify.ponder');
  const isEn = AlfredoI18n.lang() === 'en';
  const parts = [];
  if (info?.time) parts.push(`🕐 ${info.time}`);
  if (info?.dateHint) parts.push(`📅 ${info.dateHint}`);
  else if (info?.allDay && info?.date) parts.push(isEn ? '📅 All day' : '📅 하루 종일');
  return parts.length ? (isEn ? `Recognized as: ${parts.join(' · ')}` : `${parts.join(' · ')}로 인식했어요`) : null;
}

// 메모에 추출 근거(parseRationale)와 판단용 스냅샷(parseSnapshot)을 붙인다.
function attachParseTrace(memo, { kind, time = null, date = null, dateHint = null, allDay = false, original = '', source = 'local' }) {
  memo.parseRationale = buildParseRationale(kind, { time, date, dateHint, allDay });
  memo.parseReasonSeen = false;
  memo.parseJudged = false;
  memo.parseSnapshot = {
    id: AlfredoStorage.uid(),
    title: memo.content,
    kind,
    time,
    date,
    original: (original || '').trim(),
    source,
    at: Date.now(),
  };
}

// AI가 준 상대 날짜("오늘"/"내일"/"YYYY-MM-DD")를 실제 날짜로 해석.
function resolveDumpDate(raw) {
  if (!raw) return { date: null, dateHint: null };
  const today = todayStr();
  let date = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) date = raw;
  else if (/오늘|today/.test(raw)) date = today;
  else if (/모레|day after tomorrow/.test(raw)) date = addDays(today, 2);
  else if (/내일|tomorrow/.test(raw)) date = addDays(today, 1);
  else {
    // 요일 표현 처리: "이번 주 목요일", "다음 주 월요일", "금요일" 등
    const DAY_KO = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };
    const dayMatch = raw.match(/([일월화수목금토])요일/);
    if (dayMatch) {
      const targetDay = DAY_KO[dayMatch[1]];
      const todayDate = new Date(today);
      const todayDay = todayDate.getDay();
      const isNextWeek = /다음\s*주/.test(raw);
      let diff = targetDay - todayDay;
      if (isNextWeek) {
        diff = diff <= 0 ? diff + 7 : diff + 7;
      } else {
        // "이번 주" 또는 명시 없이 요일만 → 오늘 포함 가장 가까운 미래
        if (diff <= 0) diff += 7;
      }
      date = addDays(today, diff);
    }
  }
  if (!date) return { date: null, dateHint: null };
  return { date, dateHint: formatComposeDateWithWeekday(date) };
}

// 한 항목(할 일/감정/고민)을 메모로 만들어 state에 넣고, 근거·스냅샷을 붙인다.
function pushDumpMemo({ title, kind, time = null, date = null, dateHint = null, allDay = false, original = '', source = 'local' }) {
  const tags = AlfredoTags.mergeTags(AlfredoTags.extract(original || title));
  let memo;
  if (kind === 'feeling' || kind === 'ponder') {
    memo = {
      id: AlfredoStorage.uid(), kind, content: title,
      createdAt: Date.now(), completed: false, tags: tags.length ? tags : null,
    };
  } else {
    const suggest = suggestDurationLocal(title);
    memo = {
      ...memoTaskFields({
        deadline: date || null,
        deadlineTime: allDay ? null : (time || null),
        durationMinutes: suggest.minutes,
        durationSource: 'recommended',
        durationReason: suggest.reason || null,
      }),
      id: AlfredoStorage.uid(), kind: 'task', content: title, createdAt: Date.now(),
      completed: false, pinned: false, priority: null, suggestedPriority: null,
      suggestReason: null, loading: false, domain: null, tags: tags.length ? tags : null,
    };
  }
  attachParseTrace(memo, { kind, time, date, dateHint, allDay, original, source });
  state.memos.push(memo);
  if (kind === 'feeling') applyMoodFromTags(tags);
  return memo;
}

// 덤프 추출 결과의 event 항목을 타임라인 일정으로 생성
function pushDumpEvent(title, date, time) {
  const [h, mi] = time.split(':').map(Number);
  const ev = {
    id: AlfredoStorage.uid(), title, notes: null,
    date: date || todayStr(), time, duration: 30, remindMinutes: 10,
    allDay: false, completed: false, domain: 'local', tags: null,
    with: null, location: null, memoId: null, projectId: null,
    sortOrder: h * 60 + (mi || 0),
  };
  state.timeline.push(ev);
  return ev;
}

// 기억해야 할 것 — 언급된 약속·확인 필요·팔로업을 state.remember로
function pushDumpRemember(title, date) {
  const r = {
    id: AlfredoStorage.uid(), text: title, pinned: false, completed: false,
    deadline: date || null, deadlineTime: null,
  };
  state.remember.push(r);
  return r;
}

// 같은 항목이 이미 있는지 — 중복 덤프 누적 방지
function findDupEvent(title, date, time) {
  return (state.timeline || []).find(
    (t) => !t.completed && t.title === title && t.date === date && t.time === time,
  );
}
function findDupTask(title) {
  // 같은 내용의 미완료 할 일이면 중복으로 본다 (마감은 연결로 나중에 붙을 수 있어 키에서 제외)
  return (state.memos || []).find(
    (m) => !m.completed && (m.kind == null || m.kind === 'task') && m.content === title,
  );
}
function findDupRemember(title) {
  return (state.remember || []).find((r) => !r.completed && r.text === title);
}

// 항목 1개를 생성하되 같은 게 이미 있으면 건너뜀. { item, kind, created } 반환.
function materializeDumpItem({ title, kind, time = null, date = null, dateHint = null, allDay = false, original = '', source = 'local' }) {
  if (kind === 'event' && time) {
    const d = date || todayStr();
    const dup = findDupEvent(title, d, time);
    if (dup) return { item: dup, kind: 'event', created: false };
    return { item: pushDumpEvent(title, date, time), kind: 'event', created: true };
  }
  if (kind === 'remember') {
    const dup = findDupRemember(title);
    if (dup) return { item: dup, kind: 'remember', created: false };
    return { item: pushDumpRemember(title, date), kind: 'remember', created: true };
  }
  const rk = kind === 'event' ? 'task' : kind; // 시각 없는 event는 할 일로 강등
  if (rk === 'task') {
    const dup = findDupTask(title);
    if (dup) return { item: dup, kind: 'task', created: false };
  }
  const memo = pushDumpMemo({ title, kind: rk, time, date, dateHint, allDay, original, source });
  return { item: memo, kind: rk, created: true };
}

// 로컬 규칙으로 덤프 추출 (AI 키 없거나 실패 시 폴백)
function extractDumpLocal(text) {
  const lines = AlfredoTags.parseToMemos(text);
  const created = [];
  const counts = { task: 0, feeling: 0, ponder: 0, done: 0, dup: 0 };
  lines.forEach((line) => {
    const kind = AlfredoTags.classifyLine(line);
    // 이미 끝낸 일(과거형 완료 보고)은 할 일로 만들지 않고 건너뜀
    if (kind === 'done') {
      counts.done += 1;
      return;
    }
    if (kind === 'feeling' || kind === 'ponder') {
      pushDumpMemo({ title: line.trim(), kind, original: line, source: 'local' });
      counts[kind] += 1;
      return;
    }
    const parsed = AlfredoTags.parseComposeInput(line, todayStr());
    const res = materializeDumpItem({
      title: parsed?.title || line, kind: 'task',
      time: parsed?.allDay ? null : (parsed?.time || null),
      date: parsed?.date || null, dateHint: parsed?.dateHint || null, allDay: parsed?.allDay,
      original: line, source: 'local',
    });
    if (res.created) { counts.task += 1; created.push({ memo: res.item, line }); }
    else counts.dup += 1;
  });
  return { created, counts };
}

const PREP_BUFFER_MIN = 30; // 선행 준비는 일정 시각 30분 전까지

// AI 추출 결과(items)로 메모/일정 생성 — 쪼개 분류 + 중복 건너뜀 + 연결관계/마감 물림
function buildMemosFromAI(items) {
  const created = [];
  const counts = { event: 0, task: 0, remember: 0, feeling: 0, ponder: 0, done: 0, dup: 0 };
  const byTitle = {}; // title → { id, kind, date, time }
  aiAppliedIds.clear(); // 이번 덤프 기준으로 펄스 표식 리셋

  items.forEach((it) => {
    // 이미 끝낸 일은 할 일/일정으로 만들지 않고 건너뜀
    if (it.kind === 'done') { counts.done += 1; return; }
    const { date, dateHint } = resolveDumpDate(it.date);
    const res = materializeDumpItem({
      title: it.title, kind: it.kind, time: it.time || null,
      date, dateHint, original: it.title, source: 'ai',
    });
    const item = res.item;
    byTitle[it.title] = {
      id: item.id, kind: res.kind,
      date: res.kind === 'event' ? item.date : (item.deadline || null),
      time: res.kind === 'event' ? item.time : (item.deadlineTime || null),
    };
    if (!res.created) { counts.dup += 1; return; }
    counts[res.kind] = (counts[res.kind] || 0) + 1;
    aiAppliedIds.add(item.id); // AI가 만든 항목 — 펄스 애니메이션 대상
    if (res.kind === 'task') created.push({ memo: item, line: it.title });
  });

  // 연결관계: 선행 준비 할 일에 힌트 부여 + 연결 일정 시각을 마감으로 물림
  items.forEach((it) => {
    if (!it.relatedTo) return;
    const info = byTitle[it.title];
    const m = info && findMemo(info.id);
    if (!m) return;
    m.relatedHint = it.relatedTo;
    const rel = byTitle[it.relatedTo];
    m.relatedId = rel?.id || null;
    if (rel?.kind === 'event' && rel.date && rel.time) {
      m.deadline = m.deadline || rel.date;
      m.deadlineTime = shiftTime(rel.time, -PREP_BUFFER_MIN);
      m.relatedTime = rel.time;
    }
  });

  return { created, counts };
}

let makeSenseRunning = false;
async function makeSense() {
  if (makeSenseRunning) return;
  const text = $('#dump-input').value.trim();
  if (!text) { toast(t('toast.write.first')); return; }
  AlfredoTags.setDictionary(state.settings.dictionary || []);

  // 되돌리기용 — 정리 전 항목 id 스냅샷. 이후 새로 생긴 것만 골라 제거할 수 있게.
  const beforeMemoIds = new Set((state.memos || []).map((m) => m.id));
  const beforeTlIds = new Set((state.timeline || []).map((x) => x.id));
  const beforeRemIds = new Set((state.remember || []).map((x) => x.id));

  makeSenseRunning = true;
  let result = null;
  let usedAI = false;
  let aiError = false;
  const input = $('#dump-input');

  if (AlfredoAI.hasKey(state.settings)) {
    if (input) input.disabled = true;
    toast(AlfredoI18n.lang() === 'en' ? '🧠 Organizing…' : '🧠 정리하는 중…');
    try {
      const items = await AlfredoAI.extractDump(state.settings, text, todayStr());
      if (items?.length) { result = buildMemosFromAI(items); usedAI = true; }
      else aiError = true; // 키는 있는데 빈 응답
    } catch (e) {
      aiError = true;
      console.warn('[Dumply] AI 추출 실패, 로컬 폴백:', e?.message || e);
    }
    if (input) input.disabled = false;
  }
  if (!result) result = extractDumpLocal(text);
  makeSenseRunning = false;

  const { created, counts } = result;
  state.dumpDraft = '';
  if (input) input.value = '';
  $('#live-tags').replaceChildren();
  await persist();
  renderAll();
  // AI가 만든 항목의 "적용" 펄스 표식 유지 — 탭 전환 후에도 보이도록 6초 후 정리
  if (aiAppliedIds.size) {
    clearTimeout(aiPulseTimer);
    aiPulseTimer = setTimeout(() => { aiAppliedIds.clear(); }, 6000);
  }
  // 이번 정리를 통째로 되돌리는 복원 함수 — 새로 생긴 항목 제거 + 원문 복구
  const restoreDump = () => {
    state.memos = (state.memos || []).filter((m) => beforeMemoIds.has(m.id));
    state.timeline = (state.timeline || []).filter((x) => beforeTlIds.has(x.id));
    state.remember = (state.remember || []).filter((x) => beforeRemIds.has(x.id));
    Object.keys(state.moscowOrder || {}).forEach((k) => {
      state.moscowOrder[k] = state.moscowOrder[k].filter((id) => beforeMemoIds.has(id));
    });
    aiAppliedIds.clear();
    state.dumpDraft = text;
    if (input) input.value = text;
    renderLiveTags(text);
  };

  // AI를 켰는데 실패했으면 그 사실을 보이게 — 무음 폴백이 "AI가 안 된다"는 오해를 만듦
  if (aiError) {
    toast(AlfredoI18n.lang() === 'en' ? '⚠️ AI failed — organized with basic rules (check API key & network)' : '⚠️ AI 정리 실패 — 기본 규칙으로 정리했어요 (API 키·네트워크 확인)');
  } else {
    // 성공 시 '되돌리기' 제공 — 잘못 쪼개졌거나 지어냈을 때 원문째 복구 가능
    toastUndo(makeSenseToast(counts), restoreDump);
  }

  // AI 추출을 안 썼을 때만 백그라운드 태그 보강(감정/에너지) — 중복 호출 방지
  if (!usedAI) enrichDumpTags(created);
}

/** 분기 결과 토스트 — 할 일/마음/고민 갈래를 짧게 안내 */
function makeSenseToast(c) {
  const isEn = AlfredoI18n.lang() === 'en';
  const parts = [];
  if (isEn) {
    if (c.task) parts.push(`${c.task} task${c.task > 1 ? 's' : ''}`);
    if (c.event) parts.push(`${c.event} event${c.event > 1 ? 's' : ''}`);
    if (c.remember) parts.push(`${c.remember} reminder${c.remember > 1 ? 's' : ''}`);
    if (c.feeling) parts.push(`${c.feeling} feeling${c.feeling > 1 ? 's' : ''}`);
    if (c.ponder) parts.push(`${c.ponder} thought${c.ponder > 1 ? 's' : ''}`);
    const done = c.done ? ` · ${c.done} already-done skipped` : '';
    const dup = c.dup ? ` · ${c.dup} duplicate${c.dup > 1 ? 's' : ''} skipped` : '';
    if (!parts.length) return done ? `Nothing to do — ${c.done} already done` : t('toast.no.content');
    return `Organized: ${parts.join(' · ')} ✓${done}${dup}`;
  }
  if (c.task) parts.push(`할 일 ${c.task}`);
  if (c.event) parts.push(`일정 ${c.event}`);
  if (c.remember) parts.push(`기억할 것 ${c.remember}`);
  if (c.feeling) parts.push(`마음 ${c.feeling}`);
  if (c.ponder) parts.push(`고민 ${c.ponder}`);
  const done = c.done ? ` · 이미 한 일 ${c.done}개 제외` : '';
  const dup = c.dup ? ` · 중복 ${c.dup}개 건너뜀` : '';
  if (!parts.length) return done ? `이미 한 일 ${c.done}개라 할 일은 없어요` : (c.dup ? t('inbox.dup', c.dup) : t('toast.no.content'));
  return `${parts.join(' · ')} 정리했어요 ✓${done}${dup}`;
}

/** 감정표현의 태그로 오늘 기분(condition.mood 1~5)을 살짝 보정 */
function applyMoodFromTags(tags) {
  if (!state.condition) return;
  const neg = ['스트레스', '불안', '짜증', '우울', '속상', '외로움', '싫증', '수면부족', '피로', '번아웃'];
  const pos = ['기분좋음', '기대'];
  const labels = (tags || []).map((t) => t.label);
  let delta = 0;
  if (labels.some((l) => neg.includes(l))) delta -= 1;
  if (labels.some((l) => pos.includes(l))) delta += 1;
  if (!delta) return;
  const cur = Number(state.condition.mood) || 3;
  state.condition.mood = Math.max(1, Math.min(5, cur + delta));
}

/** 브레인 덤프 메모를 AI 태그(감정/에너지 포함)로 보강. 비차단, 실패 무해. */
async function enrichDumpTags(created) {
  if (!created?.length || !AlfredoAI.hasKey(state.settings)) return;
  const results = await Promise.allSettled(
    created.map(({ line }) => AlfredoAI.extractTags(state.settings, line))
  );
  let changed = false;
  results.forEach((r, i) => {
    if (r.status !== 'fulfilled' || !r.value?.length) return;
    const { memo } = created[i];
    // 알고리즘 태그 우선 보존 + AI 태그(감정/에너지) 추가
    const merged = AlfredoTags.mergeTags(memo.tags || [], r.value);
    if (merged.length) {
      memo.tags = merged;
      changed = true;
    }
  });
  if (!changed) return;
  await persist();
  renderInbox();
}

function scheduleInboxSuggestions(memoIds = null) {
  clearTimeout(suggestTimer);
  suggestTimer = setTimeout(() => refreshInboxSuggestions(memoIds), 280);
}

// 제안 1건을 메모에 스탬프 — 판단 로그가 참조할 id/시각도 함께 남긴다.
function stampSuggestion(m, priority, reason, source) {
  m.suggestedPriority = priority;
  m.suggestReason = reason || '';
  m.suggestSource = source;
  m.suggestId = AlfredoStorage.uid();
  m.suggestedAt = Date.now();
  m.reasonSeen = false;
}

async function refreshInboxSuggestions(memoIds = null) {
  if (suggestRunning || !state) return;
  const inbox = getInboxMemos();
  const targets = memoIds?.length
    ? inbox.filter((m) => memoIds.includes(m.id))
    : inbox.filter((m) => !m.suggestedPriority);
  if (!targets.length) return;

  suggestRunning = true;
  try {
    if (AlfredoAI.hasKey(state.settings)) {
      const results = await AlfredoAI.moscowSuggestBatch(state.settings, targets);
      const applied = new Set();
      results.forEach((r) => {
        const m = findMemo(r.id);
        if (m && !m.priority && isValidBucket(r.priority)) {
          stampSuggestion(m, r.priority, r.reason, 'ai');
          applied.add(m.id);
        }
      });
      targets.filter((m) => !applied.has(m.id)).forEach((m) => {
        const s = suggestMoscowLocal(m);
        stampSuggestion(m, s.priority, s.reason, 'local');
      });
    } else {
      targets.forEach((m) => {
        const s = suggestMoscowLocal(m);
        stampSuggestion(m, s.priority, s.reason, 'local');
      });
    }
    await persist();
    fillInboxCard();
  } catch {
    targets.forEach((m) => {
      if (!m.suggestedPriority) {
        const s = suggestMoscowLocal(m);
        stampSuggestion(m, s.priority, s.reason, 'local');
      }
    });
    await persist();
    fillInboxCard();
  } finally {
    suggestRunning = false;
  }
}

async function applyInboxSuggestions() {
  const items = getInboxMemos().filter(
    (m) => m.suggestedPriority && isValidBucket(m.suggestedPriority),
  );
  if (!items.length) {
    toast(t('toast.no.suggestions'));
    return;
  }
  // 되돌리기용 스냅샷 — 일괄 재배치 전 제안 상태 전체를 기억
  const snapshot = items.map((m) => ({
    id: m.id,
    priority: m.priority,
    suggestedPriority: m.suggestedPriority,
    suggestReason: m.suggestReason,
    suggestSource: m.suggestSource,
    suggestId: m.suggestId,
    suggestedAt: m.suggestedAt,
    reasonSeen: m.reasonSeen,
  }));
  // Must는 3개 이하 원칙 — 일괄 적용으로 Must가 넘치면 초과분은 Should로 내려 적용한다.
  // (가장 먼저 들어온 항목부터 Must 자리를 채워, 오래된/급한 일이 Must에 남도록)
  const existingMust = state.memos.filter((m) => !m.completed && m.priority === 'must').length;
  const mustBudget = Math.max(0, 3 - existingMust);
  const keepMust = new Set(
    items
      .filter((m) => m.suggestedPriority === 'must')
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      .slice(0, mustBudget)
      .map((m) => m.id),
  );
  let demoted = 0;

  const loggedIds = [];
  items.forEach((m) => {
    // 추천이 Must인데 예산을 넘으면 Should로 강등해 적용
    let effective = m.suggestedPriority;
    if (effective === 'must' && !keepMust.has(m.id)) { effective = 'should'; demoted += 1; }
    // 일괄 적용 = 제안 그대로 수락 → accepted 로그 (null로 밀기 전)
    const rec = AlfredoDecisions.logMoscowDecision(state, m, effective);
    if (rec) loggedIds.push(rec.id);
    m.priority = effective;
    m.suggestedPriority = null;
    m.suggestReason = null;
    justLandedIds.add(m.id);
    const order = getBucketOrder(m.priority);
    if (!order.includes(m.id)) order.push(m.id);
  });
  await persist();
  renderAll();
  const en = AlfredoI18n.lang() === 'en';
  const demotedNote = demoted
    ? (en ? ` · ${demoted} moved to Should (Must ≤ 3)` : ` · Must는 3개까지라 ${demoted}개는 Should로`)
    : '';
  toastUndo(t('toast.inbox.applied', items.length) + demotedNote, () => {
    // 수락을 철회하므로 그때 쌓인 판단 로그도 함께 제거 (수락률 오염 방지)
    AlfredoDecisions.remove(state, loggedIds);
    snapshot.forEach((s) => {
      const m = findMemo(s.id);
      if (!m) return;
      const order = getBucketOrder(m.priority);
      const idx = order.indexOf(m.id);
      if (idx !== -1) order.splice(idx, 1);
      m.priority = s.priority;
      m.suggestedPriority = s.suggestedPriority;
      m.suggestReason = s.suggestReason;
      m.suggestSource = s.suggestSource;
      m.suggestId = s.suggestId;
      m.suggestedAt = s.suggestedAt;
      m.reasonSeen = s.reasonSeen;
    });
  });
}

async function openAiMoscow() {
  if (!AlfredoAI.hasKey(state.settings)) {
    toast(AlfredoI18n.lang() === 'en' ? '⚙️ Add your API key in Settings' : '⚙️ 설정에서 API 키를 넣어주세요');
    return;
  }
  const unsorted = state.memos.filter((m) => !m.completed && !m.priority);
  if (!unsorted.length) { toast(t('toast.no.unsorted')); return; }
  aiMoscowState = { answers: [], question: '' };
  $('#ai-moscow-sheet').hidden = false;
  await nextAiMoscowQuestion();
}

async function nextAiMoscowQuestion() {
  try {
    const q = await AlfredoAI.moscowQuestion(state.settings, state.memos, aiMoscowState.answers);
    if (!q?.question) { closeAiMoscow(); return; }
    aiMoscowState.question = q.question;
    $('#ai-moscow-q').textContent = q.question;
    const opts = q.options || [t('moscow.option.must'), t('moscow.option.should'), t('moscow.option.later')];
    const container = $('#ai-moscow-opts');
    container.replaceChildren();
    opts.forEach((o) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ai-opt-btn';
      btn.textContent = o;
      btn.addEventListener('click', () => answerAiMoscow(o));
      container.append(btn);
    });
  } catch {
    toast('AI 질문 생성 실패');
    closeAiMoscow();
  }
}

async function answerAiMoscow(answer) {
  aiMoscowState.answers.push({ q: aiMoscowState.question, a: answer });
  try {
    const assigns = await AlfredoAI.moscowAssign(state.settings, state.memos, aiMoscowState.question, answer);
    assigns.forEach((a) => {
      const m = findMemo(a.id);
      if (m && a.priority) {
        m.priority = a.priority;
        m.suggestedPriority = null;
        m.suggestReason = null;
      }
    });
    await persist();
    renderInbox();
    renderMoscow();
    renderDashboard();
  } catch { /* ignore */ }
  const left = state.memos.filter((m) => !m.completed && !m.priority).length;
  if (left > 0) await nextAiMoscowQuestion();
  else { toast(t('toast.priority.done')); closeAiMoscow(); }
}

function closeAiMoscow() {
  $('#ai-moscow-sheet').hidden = true;
}

async function refreshPrioritiesAI() {
  if (!AlfredoAI.hasKey(state.settings)) { toast(AlfredoI18n.lang() === 'en' ? 'API key required' : 'API 키가 필요해요'); return; }
  toast(AlfredoI18n.lang() === 'en' ? 'AI reordering…' : 'AI가 재정렬 중...');
  try {
    const ranks = await AlfredoAI.reorderPriorities(state.settings, state.memos, state.condition);
    ranks.forEach((r) => {
      const m = findMemo(r.id);
      if (!m) return;
      // 이전 순위와 비교해 상승/하락 트렌드 계산
      const prev = m.lastRank;
      m.trend = prev == null ? 'new' : r.rank < prev ? 'up' : r.rank > prev ? 'down' : 'same';
      m.lastRank = r.rank;
      const bucket = r.rank <= 3 ? 'must' : r.rank <= 5 ? 'should' : 'could';
      m.priority = bucket;
      if (r.reason) {
        m.placementReason = String(r.reason).trim().slice(0, 60);
        m.placementSource = 'ai';
      }
      const order = getBucketOrder(bucket);
      if (!order.includes(m.id)) order.unshift(m.id);
    });
    await persist();
    renderInbox();
    renderDashboard();
    renderMoscow();
    toast(t('toast.priority.refreshed'));
  } catch {
    toast(AlfredoI18n.lang() === 'en' ? 'AI reorder failed' : 'AI 재정렬 실패');
  }
}

function openSettings() {
  navigateTo('settings');
  refreshSettingsForm();
}

function closeSettings() {
  navigateTo('home');
}

function ensureSettingsHeader() {
  const scroll = $('#route-settings')?.querySelector('.route-scroll');
  if (!scroll) return;
  let header = scroll.querySelector('.route-page-header');
  if (!header) {
    header = document.createElement('div');
    header.className = 'route-page-header';
    const head = document.createElement('div');
    head.className = 'route-page-head';
    const title = document.createElement('h2');
    title.className = 'route-title';
    head.append(title);
    header.append(createRouteHomeLink(), head);
    scroll.prepend(header);
  }
  header.querySelector('.route-title').textContent = t('settings.title');
}

function syncPanelChrome() {
  const pinned = Boolean(state?.settings?.panelPinned);
  const pinBtn = $('#btn-panel-pin');
  if (pinBtn) {
    pinBtn.classList.toggle('is-pinned', pinned);
    pinBtn.setAttribute('aria-pressed', String(pinned));
    pinBtn.title = pinned ? t('settings.unpin') : t('settings.pin');
  }
}

async function togglePanelPin() {
  state.settings.panelPinned = !state.settings.panelPinned;
  syncPanelChrome();
  await persist();
  toast(state.settings.panelPinned ? t('settings.pin.toast') : t('settings.unpin.toast'));
}

function closePanel() {
  try {
    window.close();
  } catch {
    toast(t('settings.pin.error'));
  }
}

let __themeMqlBound = false;
// 설정값을 실제 data-theme로 환원해 적용.
// 'system' → OS 라이트=System(중립 그레이) / OS 다크=Midnight, 그 외는 지정 테마 그대로.
function applyTheme() {
  const pref = state?.settings?.theme || 'system';
  const resolved = pref === 'system'
    ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'midnight' : 'system')
    : pref;
  document.documentElement.setAttribute('data-theme', resolved);
  if (!__themeMqlBound && window.matchMedia) {
    __themeMqlBound = true;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => { if ((state?.settings?.theme || 'system') === 'system') applyTheme(); };
    mql.addEventListener ? mql.addEventListener('change', onChange) : mql.addListener?.(onChange);
  }
}

function refreshSettingsForm() {
  ensureSettingsHeader();
  applyI18n($('#route-settings'));
  // data-i18n-title 속성 처리 (title attribute)
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
  $('#user-name').value = state.settings.userName || '';
  $('#user-name').placeholder = t('settings.name.placeholder');
  $('#weather-city').placeholder = t('settings.weather.placeholder');
  if ($('#language-select')) $('#language-select').value = state.settings.language || 'auto';
  if ($('#theme-select')) $('#theme-select').value = state.settings.theme || 'system';
  $('#weather-city').value = state.settings.weatherCity || t('settings.weather.default');
  const savedProvider = state.settings.aiProvider || 'anthropic';
  $('#ai-provider').value = savedProvider;
  const savedModelKey = savedProvider === 'anthropic' ? 'model' : savedProvider === 'openai' ? 'openaiModel' : 'geminiModel';
  populateModelSelect(savedProvider, state.settings[savedModelKey]);
  $('#api-key-anthropic').placeholder = state.settings.apiKeys.anthropic
    ? '••••' + state.settings.apiKeys.anthropic.slice(-4) : 'sk-ant-...';
  $('#api-key-openai').placeholder = state.settings.apiKeys.openai
    ? '••••' + state.settings.apiKeys.openai.slice(-4) : 'sk-...';
  $('#api-key-google').placeholder = state.settings.apiKeys.google
    ? '••••' + state.settings.apiKeys.google.slice(-4) : 'AIza...';
  const apiNotice = $('#settings-api-storage-notice');
  if (apiNotice) apiNotice.textContent = t('settings.api.storage.notice');
  $('#cal-sync-dir').value = state.settings.calendar.syncDirection || 'both';
  renderCalListSettings();
  renderDictionarySettings();
  renderDecisionStats();
  refreshGoogleSettingsUI();
  refreshLocationSettingsUI();
}

// 판단 집계에 노출할 기능 목록 — 새 기능 추가 시 여기에 한 줄
function getDecisionFeatures() {
  return [
    { key: 'moscow', label: t('stats.feature.moscow'), heroLabel: t('stats.hero.moscow') },
    { key: 'subtask_split', label: t('stats.feature.split'), heroLabel: t('stats.hero.split') },
    { key: 'dump_extract', label: t('stats.feature.dump'), heroLabel: t('stats.hero.dump') },
  ];
}

const pctText = (r) => (r == null ? '—' : `${Math.round(r * 100)}%`);

function decisionRow(label, valText) {
  const row = document.createElement('div');
  row.className = 'decision-row';
  const l = document.createElement('span');
  l.textContent = label;
  const v = document.createElement('span');
  v.className = 'decision-row-val';
  v.textContent = valText;
  row.append(l, v);
  return row;
}

function decisionCaptionGroup(caption) {
  const wrap = document.createElement('div');
  wrap.className = 'decision-moves';
  const cap = document.createElement('p');
  cap.className = 'decision-cap';
  cap.textContent = caption;
  wrap.append(cap);
  return wrap;
}

/** 기능 1개의 집계 블록 */
function buildDecisionBlock(feature, s) {
  const block = document.createElement('div');
  block.className = 'decision-block';

  const heading = document.createElement('p');
  heading.className = 'decision-feature-label';
  heading.textContent = feature.label;
  block.append(heading);

  // 히어로: 수락률
  const hero = document.createElement('div');
  hero.className = 'decision-hero';
  const heroNum = document.createElement('span');
  heroNum.className = 'decision-hero-num';
  heroNum.textContent = pctText(s.acceptanceRate);
  const heroLabel = document.createElement('span');
  heroLabel.className = 'decision-hero-label';
  heroLabel.textContent = AlfredoI18n.lang() === 'en'
    ? `${feature.heroLabel} · ${s.total} decisions`
    : `${feature.heroLabel} · 총 ${s.total}건 판단`;
  hero.append(heroNum, heroLabel);
  block.append(hero);

  // 행동 분포
  const dist = document.createElement('div');
  dist.className = 'decision-dist';
  const isEn = AlfredoI18n.lang() === 'en';
  [
    [t('stats.accepted'), s.counts.accepted],
    [t('stats.modified'), s.counts.modified],
    [t('stats.rejected'), s.counts.rejected],
    [t('stats.deleted'), s.counts.deleted],
    [t('stats.deferred'), s.counts.deferred],
  ]
    .filter(([, n]) => n > 0)
    .forEach(([label, n]) => dist.append(decisionRow(label, isEn ? `${n}` : `${n}건`)));
  block.append(dist);

  // 최다 수정 이동 (등급 이동이 있는 기능만 = MoSCoW)
  if (s.topMoves.length) {
    const moves = decisionCaptionGroup(t('stats.most.changed'));
    const bucketLabel = (k) => BUCKETS.find((b) => b.key === k)?.label || k;
    s.topMoves.slice(0, 3).forEach(([move, n]) => {
      const [from, to] = move.split('→');
      moves.append(decisionRow(`${bucketLabel(from)} → ${bucketLabel(to)}`, `${n}회`));
    });
    block.append(moves);
  }

  // 근거 노출 효과 — 양쪽(본/안 본) 데이터가 다 있을 때만 비교 의미가 있음
  if (s.seenCount > 0 && s.unseenCount > 0) {
    const effect = decisionCaptionGroup(t('stats.rationale.effect'));
    const seenLabel = isEn ? `With rationale (${s.seenCount})` : `근거 봄 (${s.seenCount}건)`;
    const unseenLabel = isEn ? `Without rationale (${s.unseenCount})` : `근거 안 봄 (${s.unseenCount}건)`;
    effect.append(decisionRow(seenLabel, pctText(s.acceptanceBySeen.seen)));
    effect.append(decisionRow(unseenLabel, pctText(s.acceptanceBySeen.unseen)));
    block.append(effect);
  }

  return block;
}

/** AI 판단 기록 집계 뷰 — 기능별 블록 (수락률, 행동 분포, 최다 수정 이동, 근거 효과) */
function renderDecisionStats() {
  const wrap = $('#decision-stats');
  if (!wrap) return;
  wrap.replaceChildren();

  let any = false;
  getDecisionFeatures().forEach((feature) => {
    const s = AlfredoDecisions.stats(state, feature.key);
    if (!s.total) return;
    any = true;
    wrap.append(buildDecisionBlock(feature, s));
  });

  if (!any) {
    const empty = document.createElement('p');
    empty.className = 'decision-empty';
    empty.textContent = t('stats.decisions.empty');
    wrap.append(empty);
  }
}

function renderDictionarySettings() {
  const wrap = $('#dictionary-list');
  if (!wrap) return;
  wrap.replaceChildren();
  const dict = state.settings.dictionary || [];
  if (!dict.length) {
    const empty = document.createElement('p');
    empty.className = 'field-hint';
    empty.textContent = t('stats.dictionary.empty');
    wrap.append(empty);
    return;
  }
  dict.forEach((e) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'dictionary-chip';
    chip.setAttribute('aria-label', `${e.label || e.term} 삭제`);
    const t = document.createElement('span');
    t.textContent = `${e.icon || '🏷️'} ${e.label || e.term}`;
    const x = document.createElement('span');
    x.className = 'dictionary-chip-x';
    x.textContent = '×';
    chip.append(t, x);
    chip.addEventListener('click', async () => {
      state.settings.dictionary = (state.settings.dictionary || []).filter((d) => d.term !== e.term);
      AlfredoTags.setDictionary(state.settings.dictionary);
      await persist();
      renderDictionarySettings();
    });
    wrap.append(chip);
  });
}

function applyGoogleConnectResult({ token, calendars, userInfo }) {
  state.settings.calendar.connected = true;
  state.settings.calendar.calendars = calendars;
  const picture = userInfo?.picture || '';
  const safePicture = /^https:\/\/(?:lh\d+\.googleusercontent\.com|lh\.googleusercontent\.com)\//.test(picture)
    ? picture : '';
  state.settings.googleAccount = {
    email: userInfo?.email || '',
    name: userInfo?.name || '',
    picture: safePicture,
  };
}

function refreshGoogleSettingsUI() {
  const connected = Boolean(state.settings.calendar?.connected);
  const acct = state.settings.googleAccount || {};
  const status = $('#google-account-status');
  const connectBtn = $('#btn-google-connect');
  const disconnectBtn = $('#btn-google-disconnect');
  const calField = $('#settings-cal-field');
  const selectedCount = (state.settings.calendar.calendars || []).filter((c) => c.selected).length;
  if (status) {
    status.textContent = connected && acct.email
      ? t('settings.cal.status.email', acct.email, selectedCount)
      : connected
        ? t('settings.cal.status.connected')
        : t('settings.cal.status.none');
  }
  if (connectBtn) connectBtn.hidden = connected;
  if (disconnectBtn) disconnectBtn.hidden = !connected;
  if (calField) calField.hidden = !connected;
}

function refreshLocationSettingsUI() {
  const status = $('#location-status');
  const btn = $('#btn-location-enable');
  const enabled = Boolean(state.settings.locationEnabled && state.settings.lat != null);
  if (status) {
    status.textContent = enabled
      ? t('settings.location.connected', state.settings.weatherCity)
      : t('settings.location.desc');
  }
  if (btn) btn.textContent = enabled ? t('settings.location.refresh') : t('settings.location.btn');
}

async function connectGoogleAccount() {
  if (chrome?.extension?.inIncognitoContext) {
    toast(t('toast.google.incognito'));
    return false;
  }
  try {
    const result = await AlfredoCalendar.connectFull({ interactive: true });
    applyGoogleConnectResult(result);
    await persist();
    refreshGoogleSettingsUI();
    renderCalListSettings();
    updateTimelineSyncBtn?.();
    refreshCalendarIfActive();
    try {
      state = await AlfredoCalendar.sync(state);
      await persist();
      renderTimeline?.();
      renderHeader?.();
    } catch (syncErr) {
      console.warn('[Dumply] initial calendar sync:', syncErr);
    }
    toast(AlfredoI18n.lang() === 'en' ? 'Google account & calendar connected' : 'Google 계정 · 캘린더 연결됐어요');
    openCalSelectSheet?.();
    return true;
  } catch (err) {
    const msg = String(err?.rawMessage || err?.message || err);
    const extId = err?.extensionId || chrome.runtime?.id || 'unknown';
    if (/not granted|revoked/i.test(msg)) {
      console.error(
        `[Dumply] Google OAuth 실패 — 확장프로그램 ID: ${extId}\n` +
        '해결 방법: Google Cloud Console > API 및 서비스 > 사용자 인증 정보에서\n' +
        `OAuth 클라이언트(${extId})를 "Chrome 확장 프로그램" 유형으로 등록하거나 해당 ID를 허용 목록에 추가하세요.`,
      );
      toast(AlfredoI18n.lang() === 'en' ? 'Google OAuth setup needed — check the console' : 'Google OAuth 설정 필요 — 콘솔을 확인하세요');
    } else if (/cancel|user denied|not approved/i.test(msg)) {
      toast(t('toast.google.cancel'));
    } else if (/NO_IDENTITY/i.test(msg)) {
      toast(t('toast.google.unsupported'));
    } else {
      toast(AlfredoI18n.lang() === 'en' ? 'Google connection failed — please try again' : 'Google 연결 실패 — 다시 시도해주세요');
      console.warn('[Dumply] Google connect error:', msg, '| extension ID:', extId);
    }
    return false;
  }
}

async function revokeGoogleToken(token) {
  if (!token) return;
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' });
  } catch { /* ignore — 네트워크 오류여도 로컬 로그아웃은 진행 */ }
  if (chrome?.identity?.clearAllCachedAuthTokens) {
    await new Promise(r => chrome.identity.clearAllCachedAuthTokens(r)).catch(() => {});
  }
  await AlfredoCalendar.disconnect(token).catch(() => {});
}

async function disconnectGoogleAccount() {
  const token = await new Promise((r) =>
    chrome.identity.getAuthToken({ interactive: false }, r)
  ).catch(() => null);
  await revokeGoogleToken(token);
  state.settings.calendar = {
    ...structuredClone(AlfredoStorage.DEFAULT_STATE.settings.calendar),
    syncDirection: state.settings.calendar?.syncDirection || 'both',
  };
  state.settings.googleAccount = { email: '', name: '', picture: '' };
  state.timeline = state.timeline.filter((t) => !t.gcalEventId && t.source !== 'google');
  await persist();
  refreshGoogleSettingsUI();
  renderCalListSettings();
  updateTimelineSyncBtn?.();
  refreshCalendarIfActive();
  renderTimeline?.();
  toast(AlfredoI18n.lang() === 'en' ? 'Google disconnected' : 'Google 연결을 해제했어요');
}

async function enableDeviceLocation() {
  try {
    const coords = await AlfredoWeather.getDeviceLocation();
    state.settings.lat = coords.lat;
    state.settings.lon = coords.lon;
    state.settings.locationEnabled = true;
    try {
      const label = await AlfredoWeather.reverseGeocode(coords.lat, coords.lon);
      if (label) state.settings.weatherCity = label;
    } catch { /* ignore */ }
    weatherCache = await AlfredoWeather.fetchWeather(coords.lat, coords.lon);
    await persist();
    refreshLocationSettingsUI();
    if ($('#weather-city')) $('#weather-city').value = state.settings.weatherCity || '';
    renderHeader?.();
    toast(state.settings.weatherCity ? t('toast.location.connected', state.settings.weatherCity) : t('toast.location.connected.default'));
    return true;
  } catch {
    toast(t('toast.location.permission'));
    return false;
  }
}

async function resetAllData() {
  const ok = confirm(t('settings.reset.confirm'));
  if (!ok) return;
  const token = state.settings.calendar?.accessToken;
  await revokeGoogleToken(token);
  state = structuredClone(AlfredoStorage.DEFAULT_STATE);
  weatherCache = null;
  onboardStep = 0;
  await AlfredoStorage.clear();
  closeProjectSheet?.();
  closeCompose?.();
  closeDetail?.();
  closeProjectImportPanel?.();
  showOnboarding();
  toast(t('settings.reset.toast'));
}

async function syncCalendarIfConnected() {
  if (!state.settings.calendar?.connected) return;
  try {
    state = await AlfredoCalendar.sync(state);
    await persist();
    renderTimeline?.();
    renderHeader?.();
    updateTimelineSyncBtn?.();
  } catch (err) {
    console.warn('[Dumply] calendar sync:', err);
  }
}

function renderCalListSettings() {
  const btn = $('#btn-settings-cal-select');
  if (!btn) return;
  const cals = state.settings.calendar.calendars || [];
  const selectedCount = cals.filter(c => c.selected).length;
  btn.textContent = cals.length
    ? t('ob.calendar.selected', selectedCount)
    : t('settings.cal.select');
}

function openCalSelectSheet() {
  const el = $('#cal-select-list');
  if (!el) return;
  const cals = state.settings.calendar.calendars || [];
  const currentWriteId = state.settings.calendar.writeCalendarId || null;
  el.replaceChildren();
  cals.forEach((c) => {
    const row = document.createElement('div');
    row.className = 'cal-item cal-item-row';

    const checkLabel = document.createElement('label');
    checkLabel.className = 'cal-item-check';
    const inp = document.createElement('input');
    inp.type = 'checkbox';
    inp.dataset.calId = c.id;
    inp.checked = c.selected;
    inp.addEventListener('change', () => {
      const cal = state.settings.calendar.calendars.find((x) => x.id === inp.dataset.calId);
      if (cal) {
        cal.selected = inp.checked;
        if (!inp.checked && state.settings.calendar.writeCalendarId === cal.id) {
          state.settings.calendar.writeCalendarId = null;
          el.querySelectorAll('.cal-write-btn').forEach((b) => { b.classList.remove('active'); b.textContent = t('settings.cal.view'); });
        }
      }
      renderCalListSettings();
    });
    const nameSpan = document.createElement('span');
    nameSpan.className = 'cal-item-name';
    nameSpan.textContent = c.summary;
    checkLabel.append(inp, nameSpan);

    const writeBtn = document.createElement('button');
    writeBtn.type = 'button';
    writeBtn.className = 'cal-write-btn' + (c.id === currentWriteId ? ' active' : '');
    writeBtn.textContent = c.id === currentWriteId ? t('settings.cal.write') : t('settings.cal.view');
    writeBtn.dataset.calId = c.id;
    writeBtn.addEventListener('click', () => {
      const cal = state.settings.calendar.calendars.find((x) => x.id === writeBtn.dataset.calId);
      if (!cal) return;
      const isActive = writeBtn.classList.contains('active');
      el.querySelectorAll('.cal-write-btn').forEach((b) => { b.classList.remove('active'); b.textContent = t('settings.cal.view'); });
      if (!isActive) {
        writeBtn.classList.add('active');
        writeBtn.textContent = t('settings.cal.write');
        state.settings.calendar.writeCalendarId = cal.id;
        if (!cal.selected) { cal.selected = true; inp.checked = true; renderCalListSettings(); }
      } else {
        state.settings.calendar.writeCalendarId = null;
      }
    });

    row.append(checkLabel, writeBtn);
    el.append(row);
  });
  $('#cal-select-sheet').hidden = false;
}

async function saveSettings() {
  state.settings.userName = $('#user-name').value.trim();
  if ($('#language-select')) { state.settings.language = $('#language-select').value; AlfredoI18n.init(state.settings.language); }
  if ($('#theme-select')) { state.settings.theme = $('#theme-select').value; applyTheme(); }
  const city = ($('#weather-city')?.value || '').trim();
  if (city && city !== state.settings.weatherCity) {
    try {
      const geo = await AlfredoWeather.geocodeCity(city);
      state.settings.weatherCity = city;
      state.settings.lat = geo.lat;
      state.settings.lon = geo.lon;
      state.settings.locationEnabled = true;
      weatherCache = null;
    } catch {
      toast(t('settings.weather.not.found'));
      return;
    }
  }
  const savedProv = $('#ai-provider').value;
  state.settings.aiProvider = savedProv;
  const modelVal = $('#ai-model').value;
  if (savedProv === 'anthropic') state.settings.model = modelVal;
  else if (savedProv === 'openai') state.settings.openaiModel = modelVal;
  else state.settings.geminiModel = modelVal;
  const a = $('#api-key-anthropic').value.trim();
  const o = $('#api-key-openai').value.trim();
  const g = $('#api-key-google').value.trim();
  if (a) state.settings.apiKeys.anthropic = a;
  if (o) state.settings.apiKeys.openai = o;
  if (g) state.settings.apiKeys.google = g;
  state.settings.calendar.syncDirection = $('#cal-sync-dir').value;
  await persist();
  refreshLocationSettingsUI();
  closeSettings();
  renderAll();
  toast(t('settings.save.toast'));
}

async function connectCalendarSettings() {
  await connectGoogleAccount();
}

async function syncCalendarFromDashboard() {
  if (!state.settings.calendar?.connected) {
    toast(t('toast.cal.connect.first'));
    return;
  }
  const btn = $('#btn-cal-sync');
  if (btn) btn.disabled = true;
  try {
    toast(t('toast.cal.syncing'));
    state = await AlfredoCalendar.sync(state);
    await persist();
    renderTimeline();
    renderHeader();
    toast(t('toast.cal.synced'));
  } catch (err) {
    console.warn('[Dumply] calendar sync failed:', err);
    toast(t('toast.cal.sync.failed'));
  } finally {
    if (btn) btn.disabled = false;
  }
}

function exportData() {
  // API 키와 OAuth 토큰은 보안상 내보내기에서 제외
  const { settings, ...rest } = state;
  const { apiKeys, calendar, googleAccount, ...safeSettings } = settings;
  const safeCalendar = { ...calendar, accessToken: '' };
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    ...rest,
    settings: { ...safeSettings, apiKeys: { anthropic: '', openai: '', google: '' }, calendar: safeCalendar, googleAccount },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dumply-ext-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('JSON으로 보냈어요 (API 키 제외)');
}

async function importData(file) {
  if (!file) return;
  // Reject unreasonably large files before parsing (5 MB guard)
  if (file.size > 5 * 1024 * 1024) { toast(t('toast.import.invalid')); return; }
  try {
    const raw = JSON.parse(await file.text());
    // Basic shape validation: must be a plain object with expected top-level types
    const isValidShape =
      raw !== null &&
      typeof raw === 'object' &&
      !Array.isArray(raw) &&
      (raw.memos === undefined || Array.isArray(raw.memos)) &&
      (raw.version === undefined || typeof raw.version === 'number') &&
      (raw.settings === undefined || (typeof raw.settings === 'object' && !Array.isArray(raw.settings)));
    if (isValidShape && (raw.memos || raw.version)) {
      const imported = AlfredoStorage.normalizeState(raw);
      // 현재 기기의 API 키는 덮어쓰지 않음 (OAuth 토큰은 chrome.identity가 관리)
      imported.settings.apiKeys = state.settings.apiKeys;
      state = imported;
      await persist();
      renderAll();
      toast(t('toast.import.success'));
    } else toast(t('toast.import.invalid'));
  } catch {
    toast(t('toast.import.fail'));
  }
}

async function handleAction(act, id, extra = {}) {
  const m = findMemo(id);
  let undoRestore = null;
  switch (act) {
    case 'classify':
      if (m && extra.bucket) {
        // 제안을 지우기 "전에" 판단을 기록 — accepted/modified(+diff)
        AlfredoDecisions.logMoscowDecision(state, m, extra.bucket);
        // 제목 안 고치고 분류 = 추출을 그대로 수용
        AlfredoDecisions.logDumpDecision(state, m, 'accepted');
        m.priority = extra.bucket;
        m.suggestedPriority = null;
        m.suggestReason = null;
        justLandedIds.add(m.id);
        const order = getBucketOrder(extra.bucket);
        if (!order.includes(m.id)) order.push(m.id);
        const label = BUCKETS.find((b) => b.key === extra.bucket)?.label || extra.bucket;
        const dest = extra.bucket === 'must' || extra.bucket === 'should'
          ? 'MoSCoW · 대시보드'
          : 'MoSCoW';
        toast(`${label}로 분류 → ${dest}`);
      }
      break;
    case 'ponder-to-task':
      if (m) {
        m.kind = 'task';
        m.priority = null;
        m.suggestedPriority = null;
        // 결정 행위로 보이게 제목 보정
        if (!/하기|결정|정하기/.test(m.content)) m.content = `${m.content} 결정하기`;
        toast(t('toast.ponder.to.inbox'));
      }
      break;
    case 'del':
      if (m) {
        const delDecision = AlfredoDecisions.logDeletedWithSuggestion(state, m);
        const index = state.memos.findIndex((x) => x.id === id);
        state.memos = state.memos.filter((x) => x.id !== id);
        undoRestore = () => {
          state.memos.splice(Math.max(0, index), 0, m);
          // 삭제를 철회 → 'deleted' 판단도 되돌린다
          if (delDecision) AlfredoDecisions.remove(state, delDecision.id);
        };
      }
      break;
    case 'prio-up':
      if (m) { m.priority = 'must'; getBucketOrder('must').unshift(m.id); }
      break;
    case 'prio-edit':
    case 'inbox-edit':
    case 'memo-edit':
      if (m) openDetail({ kind: 'memo', id });
      return;
    case 'inbox-toggle':
    case 'memo-toggle':
      if (m) m.completed = !m.completed;
      break;
    case 'tl-toggle': {
      const t = state.timeline.find((x) => x.id === id);
      if (t) t.completed = !t.completed;
      break;
    }
    case 'tl-edit': {
      const t = state.timeline.find((x) => x.id === id);
      if (t) openDetail({ kind: 'event', id });
      return;
    }
    case 'tl-del': {
      const index = state.timeline.findIndex((x) => x.id === id);
      const item = state.timeline[index];
      if (item?.gcalEventId && typeof showConfirmSheet === 'function') {
        showConfirmSheet({
          message: t('confirm.event.delete.message'),
          detail: t('confirm.event.delete.detail'),
          confirmLabel: t('confirm.delete'),
          onConfirm: async () => {
            const idx = state.timeline.findIndex((x) => x.id === id);
            const it = state.timeline[idx];
            state.timeline = state.timeline.filter((x) => x.id !== id);
            await persist();
            renderAll();
            if (it) toastUndo(t('toast.deleted'), () => state.timeline.splice(Math.max(0, idx), 0, it));
          },
        });
        return;
      }
      state.timeline = state.timeline.filter((x) => x.id !== id);
      if (item) undoRestore = () => state.timeline.splice(Math.max(0, index), 0, item);
      break;
    }
    case 'remember-toggle': {
      const r = state.remember.find((x) => x.id === id);
      if (r) r.completed = !r.completed;
      break;
    }
    default:
      return;
  }
  await persist();
  renderAll();
  if (undoRestore) toastUndo(t('toast.deleted'), undoRestore);
}

function switchTab(tab) {
  $$('[data-tab]').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === tab));
  $('#view-dump').classList.toggle('is-active', tab === 'dump');
  $('#view-dashboard').classList.toggle('is-active', tab === 'dashboard');
  if (tab === 'dashboard') renderDashboard();
}

function bindIntegrationMessages() {
  if (!chrome?.runtime?.onMessage) return;
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'SYNC_CALENDAR') {
      syncCalendarIfConnected();
    }
  });
}

function bindEvents() {
  applyUiLabels();

$('#onboard-next')?.addEventListener('click', advanceOnboarding);
  $('#onboard-back')?.addEventListener('click', goBackOnboarding);
  $('#onboard-skip')?.addEventListener('click', skipOnboarding);

  $('#dump-input')?.addEventListener('input', (e) => {
    state.dumpDraft = e.target.value;
    renderLiveTags(e.target.value);
  });
  $('#dump-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      makeSense();
    }
  });
  $('#btn-example')?.addEventListener('click', () => {
    const dumpEl = $('#dump-input');
    const example = nextExampleText();
    if (dumpEl) {
      dumpEl.value = example;
      state.dumpDraft = example;
    }
    renderLiveTags(example);
  });
  // 미인식 고유명사 후보 칩 → 카테고리 선택 등록
  $('#live-tags')?.addEventListener('click', (e) => {
    const chip = e.target.closest('.live-tag-candidate');
    if (chip) openCandidatePicker(chip);
  });
  $('#btn-ai-moscow')?.addEventListener('click', openAiMoscow);
  $('#btn-apply-suggestions')?.addEventListener('click', applyInboxSuggestions);
  $('#btn-close-ai-moscow')?.addEventListener('click', closeAiMoscow);

  $$('[data-tab]').forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  $('#btn-prio-refresh')?.addEventListener('click', refreshPrioritiesAI);
  $('#btn-prio-expand')?.addEventListener('click', async () => {
    state.top3Expanded = !state.top3Expanded;
    await persist();
    renderDashboard();
  });
  $('#btn-add-task')?.addEventListener('click', addTask);
  $('#btn-add-event')?.addEventListener('click', addTimelineEvent);
  $('#btn-cal-sync')?.addEventListener('click', syncCalendarFromDashboard);
  bindComposeEvents();
  bindDetailEvents();
  bindConfirmSheet?.();
  bindCalBandSheet();
  bindCalDaySheet?.();
  bindNavEvents?.();
  bindProjectSheet?.();
  initSheetA11y?.();
  bindIntegrationMessages?.();
  $('#btn-settings-cal-select')?.addEventListener('click', openCalSelectSheet);
  $('#btn-cal-select-close')?.addEventListener('click', () => { $('#cal-select-sheet').hidden = true; });
  $('#btn-cal-select-confirm')?.addEventListener('click', async () => {
    $('#cal-select-sheet').hidden = true;
    await persist();
    refreshGoogleSettingsUI?.();
    renderCalListSettings?.();
    updateTimelineSyncBtn?.();
    if (state.settings.calendar?.connected) {
      toast(t('toast.cal.syncing'));
      await syncCalendarIfConnected();
      refreshCalendarIfActive?.();
    }
  });

  $('#language-select')?.addEventListener('change', async () => {
    state.settings.language = $('#language-select').value;
    AlfredoI18n.init(state.settings.language);
    document.documentElement.lang = AlfredoI18n.lang();
    await persist();
    renderAll();
  });
  $('#theme-select')?.addEventListener('change', async () => {
    state.settings.theme = $('#theme-select').value;
    applyTheme();
    await persist();
  });
  $('#ai-provider')?.addEventListener('change', onProviderChange);
  $('#ai-model')?.addEventListener('change', onModelChange);
  $('#btn-save-settings')?.addEventListener('click', saveSettings);
  $('#btn-google-connect')?.addEventListener('click', connectGoogleAccount);
  $('#btn-google-disconnect')?.addEventListener('click', disconnectGoogleAccount);
  $('#btn-location-enable')?.addEventListener('click', enableDeviceLocation);
  $('#btn-reset-data')?.addEventListener('click', resetAllData);
  $('#btn-export')?.addEventListener('click', exportData);
  $('#import-file')?.addEventListener('change', (e) => importData(e.target.files[0]));

  $('#remember-card')?.addEventListener('change', async (e) => {
    const inp = e.target.closest('.remember-check');
    if (inp) await handleAction('remember-toggle', inp.dataset.id);
  });

  $('#inbox-card')?.addEventListener('change', async (e) => {
    const inp = e.target.closest('.inbox-check, .memo-check');
    if (inp) await handleAction('memo-toggle', inp.dataset.id);
  });

  $('#prio-list')?.addEventListener('change', async (e) => {
    const inp = e.target.closest('.memo-check');
    if (inp) await handleAction('memo-toggle', inp.dataset.id);
  });

  $('#moscow-board')?.addEventListener('change', async (e) => {
    const inp = e.target.closest('.memo-check');
    if (inp) await handleAction('memo-toggle', inp.dataset.id);
  });

  // 버킷 picker 펼치기/접기 — 재렌더 없이 인라인 토글
  $('#inbox-card')?.addEventListener('click', (e) => {
    const t = e.target.closest('[data-toggle="buckets"]');
    if (!t) return;
    e.stopPropagation();
    const picker = t.closest('.inbox-bucket-control')?.querySelector('.inbox-bucket-picker');
    if (!picker) return;
    const collapsed = picker.classList.toggle('is-collapsed');
    t.classList.toggle('is-open', !collapsed);
    // 근거를 보려고 picker를 펼친 행위 = "근거를 봤다" 신호
    if (!collapsed) {
      const m = findMemo(t.dataset.id);
      if (m && m.suggestedPriority && !m.reasonSeen) {
        m.reasonSeen = true;
        persist();
      }
    }
  });

  ['#prio-list', '#moscow-board', '#inbox-card', '#ponders-card', '#feelings-card'].forEach((sel) => {
    $(sel)?.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      await handleAction(btn.dataset.act, btn.dataset.id, { bucket: btn.dataset.bucket });
    });
  });

  bindTimeBlockGlobalEvents();
}