/* Dumply 기기 간 동기화 — 확장·PWA가 한 계정으로 같은 데이터를 보게 한다.
 *
 * 저장소: Supabase public.dumply_state (user_id PK, data jsonb, rev, updated_at)
 *   같은 프로젝트의 user_data는 다른 앱이 쓰고 있어 건드리지 않는다.
 *
 * 병합 원칙
 *   - id를 가진 컬렉션(memos·projects 등)은 **항목 단위**로 합친다. 같은 id면 updatedAt이 큰 쪽이 이김.
 *     통째로 마지막 저장이 이기게 하면 두 기기에서 각각 적은 내용 중 한쪽이 통째로 사라진다.
 *   - 삭제는 **툼스톤**으로 전파한다. 안 그러면 오래된 기기가 지운 항목을 되살린다.
 *   - updatedAt은 앱의 모든 변경 지점을 고치는 대신, 마지막 동기화 스냅샷과 비교해
 *     '바뀐 항목'에만 push 직전에 찍는다.
 *
 * 동기화 대상이 아닌 것(기기 전용): API 키, Google/Gmail 연결 상태, 알림·위치 권한,
 * UI 라우트, 온보딩 여부. 계정에 묶이면 곤란하거나 기기마다 달라야 하는 값들.
 */

'use strict';

const DumplySync = (() => {
  const TABLE = 'dumply_state';
  const SNAPSHOT_KEY = 'dumply_sync_snapshot';
  const TOMBSTONE_TTL = 30 * 24 * 60 * 60 * 1000; // 30일 지난 삭제 기록은 정리
  const PUSH_DEBOUNCE = 1500;

  // id 기반 컬렉션 — 항목 단위 병합
  const COLLECTIONS = ['memos', 'remember', 'timeline', 'projects', 'calendarBands', 'calendarStickers'];
  // 통째로 최신이 이기는 값 (충돌해도 손실이 작은 것들)
  const SCALARS = ['moscowOrder', 'projectTaskOrder', 'condition', 'decisions', 'top3Expanded'];
  // 설정 중 계정에 묶여야 하는 것만
  const SETTINGS = ['userName', 'theme', 'accent', 'language', 'dictionary', 'weatherCity',
    'aiProvider', 'model', 'openaiModel', 'geminiModel'];

  let snapshot = {};        // { [collection]: { [id]: contentHash } } — 마지막으로 서버와 맞춘 상태
  let snapshotAt = 0;       // 그때의 payload.updatedAt
  let pushTimer = null;
  let inFlight = false;
  let lastRev = 0;

  const now = () => Date.now();
  // updatedAt은 제외하고 해싱 — 스탬프 자체가 '변경'으로 잡히면 무한 갱신이 된다
  const contentHash = (it) => { const { updatedAt, ...rest } = it || {}; return JSON.stringify(rest); };
  const canSync = () => typeof DumplyAccount !== 'undefined'
    && DumplyAccount.isSignedIn()
    && !!DumplyAccount.getUserId();

  async function headers() {
    const token = await DumplyAccount.getAccessToken();
    return {
      apikey: DumplyAccount.SUPA_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // ── 스냅샷 (로컬) ──
  async function loadSnapshot() {
    try {
      const res = await new Promise((r) => chrome.storage.local.get([SNAPSHOT_KEY], r));
      const s = res?.[SNAPSHOT_KEY];
      snapshot = s?.map || {};
      snapshotAt = s?.at || 0;
      lastRev = s?.rev || 0;
    } catch { snapshot = {}; snapshotAt = 0; lastRev = 0; }
  }

  function saveSnapshot(at) {
    const map = {};
    COLLECTIONS.forEach((c) => {
      map[c] = {};
      (state[c] || []).forEach((it) => { if (it?.id) map[c][it.id] = contentHash(it); });
    });
    snapshot = map;
    if (at) snapshotAt = at;
    try { chrome.storage.local.set({ [SNAPSHOT_KEY]: { map, at: snapshotAt, rev: lastRev } }); }
    catch { /* 저장 실패는 다음 동기화에서 복구 */ }
  }

  // ── 변경 감지 → updatedAt 스탬프 + 툼스톤 ──
  function stampChanges() {
    const tombstones = {};
    COLLECTIONS.forEach((c) => {
      const prev = snapshot[c] || {};
      const list = state[c] || [];
      const liveIds = new Set();
      list.forEach((it) => {
        if (!it?.id) return;
        liveIds.add(it.id);
        const prevH = prev[it.id];
        const h = contentHash(it);
        // 새 항목이거나 내용이 바뀐 항목에만 지금 시각을 찍는다
        if (prevH === undefined || prevH !== h) it.updatedAt = now();
        else if (!it.updatedAt) it.updatedAt = it.createdAt || now();
      });
      Object.keys(prev).forEach((id) => {
        if (!liveIds.has(id)) tombstones[`${c}:${id}`] = now();
      });
    });
    return tombstones;
  }

  // ── 병합 ──
  function mergeCollection(localList, remoteList, tombs, coll) {
    const byId = new Map();
    (localList || []).forEach((it) => { if (it?.id) byId.set(it.id, it); });
    (remoteList || []).forEach((it) => {
      if (!it?.id) return;
      const mine = byId.get(it.id);
      if (!mine) { byId.set(it.id, it); return; }
      const a = mine.updatedAt || mine.createdAt || 0;
      const b = it.updatedAt || it.createdAt || 0;
      if (b > a) byId.set(it.id, it);
    });
    // 툼스톤이 항목보다 최신이면 삭제 확정
    for (const [id, it] of [...byId]) {
      const t = tombs[`${coll}:${id}`];
      if (t && t >= (it.updatedAt || it.createdAt || 0)) byId.delete(id);
    }
    return [...byId.values()];
  }

  function buildPayload(tombs) {
    const collections = {};
    COLLECTIONS.forEach((c) => { collections[c] = state[c] || []; });
    const settings = {};
    SETTINGS.forEach((k) => { if (state.settings?.[k] !== undefined) settings[k] = state.settings[k]; });
    const scalars = {};
    SCALARS.forEach((k) => { if (state[k] !== undefined) scalars[k] = state[k]; });
    return { v: 1, collections, settings, scalars, tombstones: tombs, updatedAt: now() };
  }

  function applyRemote(remote, tombs) {
    if (!remote || remote.v !== 1) return false;
    COLLECTIONS.forEach((c) => {
      state[c] = mergeCollection(state[c], remote.collections?.[c], tombs, c);
    });
    // 스칼라·설정은 원격이 내 마지막 동기화보다 최신일 때만 채택
    const remoteNewer = (remote.updatedAt || 0) > snapshotAt;
    if (remoteNewer) {
      SCALARS.forEach((k) => { if (remote.scalars?.[k] !== undefined) state[k] = remote.scalars[k]; });
      SETTINGS.forEach((k) => {
        if (remote.settings?.[k] !== undefined && state.settings) state.settings[k] = remote.settings[k];
      });
    }
    return true;
  }

  const pruneTombstones = (t) => Object.fromEntries(
    Object.entries(t || {}).filter(([, ts]) => now() - ts < TOMBSTONE_TTL),
  );

  // ── 공개 API ──
  async function pull({ apply = true } = {}) {
    if (!canSync()) return { ok: false, reason: 'signed-out' };
    const url = `${DumplyAccount.SUPA_URL}/rest/v1/${TABLE}?select=data,rev&limit=1`;
    const resp = await fetch(url, { headers: await headers() });
    if (!resp.ok) return { ok: false, reason: `HTTP_${resp.status}` };
    const rows = await resp.json();
    const row = rows?.[0];
    if (!row) return { ok: true, empty: true };
    lastRev = row.rev || 0;
    const remote = row.data || {};
    const tombs = pruneTombstones(remote.tombstones);
    const changed = apply ? applyRemote(remote, tombs) : false;
    return { ok: true, rev: lastRev, changed, remote };
  }

  async function push() {
    if (!canSync()) return { ok: false, reason: 'signed-out' };
    const userId = DumplyAccount.getUserId();
    const localTombs = stampChanges();
    // 서버의 툼스톤과 합쳐 다른 기기의 삭제도 보존
    const before = await pull({ apply: true }).catch(() => null);
    const tombs = pruneTombstones({ ...(before?.remote?.tombstones || {}), ...localTombs });
    const payload = buildPayload(tombs);
    const resp = await fetch(`${DumplyAccount.SUPA_URL}/rest/v1/${TABLE}`, {
      method: 'POST',
      headers: { ...(await headers()), Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ user_id: userId, data: payload }),
    });
    if (!resp.ok) return { ok: false, reason: `HTTP_${resp.status}`, detail: await resp.text().catch(() => '') };
    const rows = await resp.json().catch(() => []);
    lastRev = rows?.[0]?.rev || lastRev;
    saveSnapshot(payload.updatedAt);
    return { ok: true, rev: lastRev };
  }

  /** 저장 직후 호출 — 연타를 묶어 한 번만 올린다. */
  function schedulePush() {
    if (!canSync()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(async () => {
      if (inFlight) { schedulePush(); return; }
      inFlight = true;
      try { await push(); }
      catch (e) { console.warn('[Dumply] sync push 실패:', e?.message || e); }
      finally { inFlight = false; }
    }, PUSH_DEBOUNCE);
  }

  /** 앱 시작 / 창 복귀 시 — 원격을 받아 병합하고 화면을 갱신한다. */
  async function pullAndRender() {
    if (!canSync()) return { ok: false, reason: 'signed-out' };
    try {
      const r = await pull({ apply: true });
      if (r.ok && r.changed) {
        await AlfredoStorage.save(state);
        saveSnapshot();
        if (typeof renderAll === 'function') renderAll();
      }
      return r;
    } catch (e) {
      console.warn('[Dumply] sync pull 실패:', e?.message || e);
      return { ok: false, reason: e?.message || 'error' };
    }
  }

  async function init() {
    await loadSnapshot();
    if (!canSync()) return;
    await pullAndRender();
    // 첫 진입에서 로컬에만 있던 내용을 서버로 올린다
    schedulePush();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') pullAndRender();
    });
    window.addEventListener('online', () => { pullAndRender(); schedulePush(); });
  }

  return { init, pull, push, schedulePush, pullAndRender, canSync, _internals: { mergeCollection, buildPayload } };
})();

if (typeof module !== 'undefined') module.exports = DumplySync;
