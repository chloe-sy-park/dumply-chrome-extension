/* 저장소 + 상태 스키마 */

'use strict';

const AlfredoStorage = (() => {
  const STORE_KEY = 'alfredo_ext_v2';
  const LEGACY_KEY = 'alfredo_ext_v1';

  const DEFAULT_STATE = {
    version: 2,
    onboarded: false,
    memos: [],
    remember: [],
    timeline: [],
    condition: { energy: 50, mood: 3, log: [] },
    settings: {
      userName: '',
      theme: 'system',           // 'system'(기본: 라이트→ash/다크→midnight) | light | ash | barbie | midnight | dawn | pale
      language: 'auto',          // 'auto' | 'ko' | 'en'
      apiKeys: { anthropic: '', openai: '', google: '' },
      aiProvider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      openaiModel: 'gpt-4o-mini',
      geminiModel: 'gemini-2.0-flash',
      notificationsEnabled: false,
      locationEnabled: false,
      weatherCity: '서울',
      dictionary: [],            // 사용자 등록 고유명사: [{ term, type, icon, label, aliases? }]
      panelPinned: false,
      lat: null,
      lon: null,
      calendar: {
        connected: false,
        calendars: [],
        syncDirection: 'read',
        writeCalendarId: null,
        lastSync: 0,
      },
      googleAccount: {
        email: '',
        name: '',
        picture: '',
      },
    },
    top3Expanded: false,
    decisions: [],
    moscowOrder: { must: [], should: [], could: [], wont: [] },
    projectTaskOrder: {},
    projects: [],
    calendarBands: [],
    calendarStickers: [],
    ui: {
      route: 'home',
      navExpanded: false,
      projectId: null,
      calendarMonth: null,
      calendarSelectedDay: null,
    },
    dumpDraft: '',
  };

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function migrateV1(raw) {
    if (!raw) return null;
    const state = structuredClone(DEFAULT_STATE);
    state.memos = (raw.memos || []).map((m) => ({
      id: m.id || uid(),
      content: m.content,
      createdAt: Number(m.createdAt) || Date.now(),
      completed: Boolean(m.completed),
      pinned: Boolean(m.pinned),
      priority: ['must', 'should', 'could', 'wont', null].includes(m.priority) ? m.priority : null,
      steps: Array.isArray(m.steps) ? m.steps : null,
      loading: false,
      domain: null,
      deadline: null,
    }));
    if (raw.settings) {
      state.settings.userName = raw.settings.userName || '';
      state.settings.apiKeys.anthropic = raw.settings.apiKey || '';
      state.settings.model = raw.settings.model || state.settings.model;
    }
    state.onboarded = state.memos.length > 0;
    return state;
  }

  function normalizeState(raw) {
    if (!raw) return structuredClone(DEFAULT_STATE);
    const s = { ...structuredClone(DEFAULT_STATE), ...raw };
    s.settings = { ...DEFAULT_STATE.settings, ...(raw.settings || {}) };
    s.settings.apiKeys = { ...DEFAULT_STATE.settings.apiKeys, ...(raw.settings?.apiKeys || {}) };
    if (raw.settings?.apiKey && !s.settings.apiKeys.anthropic) {
      s.settings.apiKeys.anthropic = raw.settings.apiKey;
    }
    s.settings.calendar = { ...DEFAULT_STATE.settings.calendar, ...(raw.settings?.calendar || {}) };
    // 'both' 방향은 브레인 덤프 이벤트를 구글 캘린더로 역방향 push해 중복 생성. 'read'로 강제 마이그레이션
    if (s.settings.calendar.syncDirection === 'both') s.settings.calendar.syncDirection = 'read';
    s.settings.googleAccount = {
      ...DEFAULT_STATE.settings.googleAccount,
      ...(raw.settings?.googleAccount || {}),
    };
    s.condition = { ...DEFAULT_STATE.condition, ...(raw.condition || {}) };
    s.moscowOrder = { ...DEFAULT_STATE.moscowOrder, ...(raw.moscowOrder || {}) };
    s.projectTaskOrder = raw.projectTaskOrder && typeof raw.projectTaskOrder === 'object'
      ? raw.projectTaskOrder
      : {};
    s.memos = (s.memos || []).map((m) => ({
      ...memoTaskFields(),
      ...m,
      steps: normalizeSteps(m.steps),
    }));
    s.remember = (s.remember || []).map((r) => ({
      deadline: null,
      deadlineTime: null,
      ...r,
    }));
    s.timeline = (s.timeline || []).map((t) => ({
      projectId: null,
      ...t,
      duration: Number(t.duration) || 30,
      with: t.with || null,
      location: t.location || null,
      memoId: t.memoId || null,
      endDate: t.endDate || null,
      source: t.source || (t.gcalEventId ? 'google' : 'local'),
      gcalCalendarName: t.gcalCalendarName || null,
    }));
    s.projects = (s.projects || []).map((p) => {
      const legacyStatus = p.status;
      let status = 'active';
      if (legacyStatus === 'done') status = 'done';
      else if (legacyStatus === 'waiting') status = 'waiting';
      else if (legacyStatus === 'active') status = 'active';
      else if (legacyStatus === 'on-track' || legacyStatus === 'at-risk') status = 'active';
      return {
        emoji: '📁',
        area: 'work',
        importance: 'medium',
        startDate: null,
        endDate: null,
        ...p,
        status,
        area: p.area === 'life' ? 'life' : 'work',
        importance: ['high', 'medium', 'low'].includes(p.importance) ? p.importance : 'medium',
      };
    });
    s.calendarBands = (s.calendarBands || []).map((b) => ({
      color: 'cal-band-a',
      sticker: null,
      ...b,
      endDate: b.endDate || b.startDate,
    }));
    s.calendarStickers = s.calendarStickers || [];
    s.decisions = Array.isArray(raw.decisions) ? raw.decisions : [];
    s.ui = { ...DEFAULT_STATE.ui, ...(s.ui || {}) };
    return s;
  }

  const storage = {
    get() {
      return new Promise((resolve) => {
        const fallback = () => {
          try {
            const raw = localStorage.getItem(STORE_KEY) || localStorage.getItem(LEGACY_KEY);
            resolve(raw ? JSON.parse(raw) : null);
          } catch {
            resolve(null);
          }
        };
        if (!chrome?.storage?.local) {
          fallback();
          return;
        }
        chrome.storage.local.get([STORE_KEY, LEGACY_KEY], (res) => {
          if (chrome.runtime.lastError) {
            fallback();
            return;
          }
          resolve(res[STORE_KEY] || res[LEGACY_KEY] || null);
        });
      });
    },
    set(value) {
      return new Promise((resolve, reject) => {
        if (!chrome?.storage?.local) {
          // chrome.storage 미지원 환경 전용 fallback — API 키 제외 후 저장
          try {
            const safe = value?.settings?.apiKeys
              ? { ...value, settings: { ...value.settings, apiKeys: { anthropic: '', openai: '', google: '' } } }
              : value;
            localStorage.setItem(STORE_KEY, JSON.stringify(safe));
          } catch (err) {
            console.warn('[알프레도] localStorage 백업 실패:', err);
          }
          resolve();
          return;
        }
        chrome.storage.local.set({ [STORE_KEY]: value }, () => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve();
        });
      });
    },
  };

  async function load() {
    const raw = await storage.get();
    if (!raw) return structuredClone(DEFAULT_STATE);
    if (!raw.version || raw.version < 2) return normalizeState(migrateV1(raw));
    return normalizeState(raw);
  }

  async function save(state) {
    await storage.set(state);
  }

  async function clear() {
    const fresh = structuredClone(DEFAULT_STATE);
    await storage.set(fresh);
    return fresh;
  }

  return { STORE_KEY, DEFAULT_STATE, uid, load, save, clear, migrateV1, normalizeState };
})();
