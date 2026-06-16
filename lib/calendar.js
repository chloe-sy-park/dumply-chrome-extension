/* Google Calendar — manifest oauth2 + chrome.identity.getAuthToken */

'use strict';

const AlfredoCalendar = (() => {
  function connect(options = {}) {
    const { interactive = true } = options;
    return new Promise((resolve, reject) => {
      if (!chrome?.identity?.getAuthToken) {
        reject(new Error('NO_IDENTITY'));
        return;
      }
      chrome.identity.getAuthToken({ interactive }, (token) => {
        const err = chrome.runtime.lastError;
        if (err || !token) {
          const msg = err?.message || 'AUTH_CANCEL';
          // 진단용: 확장프로그램 ID를 에러 메시지에 포함
          const extId = chrome.runtime?.id || 'unknown';
          const enriched = new Error(msg);
          enriched.extensionId = extId;
          enriched.rawMessage = msg;
          reject(enriched);
          return;
        }
        resolve(token);
      });
    });
  }

  function disconnect(token) {
    return new Promise((resolve) => {
      if (!chrome?.identity?.removeCachedAuthToken || !token) {
        resolve();
        return;
      }
      chrome.identity.removeCachedAuthToken({ token }, resolve);
    });
  }

  async function fetchUserInfo(token) {
    const resp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`USERINFO_${resp.status}`);
    const data = await resp.json();
    return {
      email: data.email || '',
      name: data.name || '',
      picture: data.picture || '',
    };
  }

  async function connectFull(options = {}) {
    const token = await connect(options);
    const [calendars, userInfo] = await Promise.all([
      listCalendars(token),
      fetchUserInfo(token).catch(() => ({ email: '', name: '', picture: '' })),
    ]);
    return { token, calendars, userInfo };
  }

  async function api(token, path, options = {}) {
    const resp = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!resp.ok) throw new Error(`GCAL_${resp.status}`);
    if (resp.status === 204) return null;
    return resp.json();
  }

  async function refreshAccessToken(oldToken) {
    if (oldToken) await disconnect(oldToken);
    return connect({ interactive: false }).catch(() => connect({ interactive: true }));
  }

  async function listCalendars(token) {
    const data = await api(token, '/users/me/calendarList');
    return (data.items || []).map((c) => ({
      id: c.id,
      summary: c.summary,
      primary: Boolean(c.primary),
      selected: Boolean(c.primary),
      backgroundColor: c.backgroundColor,
    }));
  }

  function todayBounds() {
    const d = new Date();
    // 로컬 날짜 기준 YYYY-MM-DD (toISOString은 UTC라 KST 등에서 하루 어긋남)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return { timeMin: start.toISOString(), timeMax: end.toISOString(), date: dateStr };
  }

  function attendeeNames(ev) {
    return (ev.attendees || [])
      .filter((a) => !a.self && !a.resource)
      .map((a) => a.displayName || (a.email ? a.email.split('@')[0] : ''))
      .filter(Boolean)
      .slice(0, 6);
  }

  async function pullTodayEvents(token, calendars) {
    const selected = calendars.filter((c) => c.selected);
    const { timeMin, timeMax, date } = todayBounds();
    const events = [];

    for (const cal of selected) {
      const data = await api(
        token,
        `/calendars/${encodeURIComponent(cal.id)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
      );
      for (const ev of data.items || []) {
        if (ev.status === 'cancelled') continue;
        const startRaw = ev.start?.dateTime || ev.start?.date;
        if (!startRaw) continue;
        const allDay = Boolean(ev.start?.date && !ev.start?.dateTime);
        const d = new Date(startRaw);
        const endRaw = ev.end?.dateTime || ev.end?.date;
        let duration = 30;
        if (endRaw && ev.start?.dateTime) {
          duration = Math.max(15, Math.round((new Date(endRaw) - d) / 60000));
        }
        const names = attendeeNames(ev);
        events.push({
          id: `gcal-${ev.id}`,
          gcalEventId: ev.id,
          gcalCalendarId: cal.id,
          gcalCalendarName: cal.summary,
          source: 'google',
          title: ev.summary || '(제목 없음)',
          time: allDay ? '00:00' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
          date,
          duration,
          allDay,
          location: ev.location || null,
          with: names.length ? names.join(', ') : null,
          notes: ev.description || null,
          completed: false,
          domain: 'calendar',
          sortOrder: allDay ? 0 : d.getHours() * 60 + d.getMinutes(),
          remindMinutes: 10,
          tags: null,
        });
      }
    }
    return events.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  async function pullMonthEvents(token, calendars, year, month) {
    const selected = calendars.filter((c) => c.selected);
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const timeMin = start.toISOString();
    const timeMax = end.toISOString();
    const events = [];

    for (const cal of selected) {
      const data = await api(
        token,
        `/calendars/${encodeURIComponent(cal.id)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=250`,
      );
      for (const ev of data.items || []) {
        if (ev.status === 'cancelled') continue;
        const startRaw = ev.start?.dateTime || ev.start?.date;
        if (!startRaw) continue;
        const allDay = Boolean(ev.start?.date && !ev.start?.dateTime);
        const d = new Date(startRaw);
        const dateStr = allDay ? ev.start.date : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const endRaw = ev.end?.dateTime || ev.end?.date;
        let duration = 30;
        if (endRaw && ev.start?.dateTime) {
          duration = Math.max(15, Math.round((new Date(endRaw) - d) / 60000));
        }
        const names = attendeeNames(ev);
        events.push({
          id: `gcal-${ev.id}`,
          gcalEventId: ev.id,
          gcalCalendarId: cal.id,
          gcalCalendarName: cal.summary,
          source: 'google',
          title: ev.summary || '(제목 없음)',
          time: allDay ? '00:00' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
          date: dateStr,
          duration,
          allDay,
          location: ev.location || null,
          with: names.length ? names.join(', ') : null,
          notes: ev.description || null,
          completed: false,
          domain: 'calendar',
          sortOrder: allDay ? 0 : d.getHours() * 60 + d.getMinutes(),
          remindMinutes: 10,
          tags: null,
        });
      }
    }
    return events.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  async function pushEvent(token, calendarId, item) {
    const [h, m] = (item.time || '09:00').split(':').map(Number);
    const start = new Date(item.date || todayBounds().date);
    start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + (item.duration || 30) * 60000);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const body = {
      summary: item.title,
      start: { dateTime: start.toISOString(), timeZone: tz },
      end: { dateTime: end.toISOString(), timeZone: tz },
    };
    if (item.location) body.location = item.location;
    const descParts = [];
    if (item.with) descParts.push(`참석: ${item.with}`);
    if (item.notes) descParts.push(item.notes);
    if (descParts.length) body.description = descParts.join('\n');
    if (item.gcalEventId) {
      return api(token, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(item.gcalEventId)}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    }
    return api(token, `/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async function sync(state) {
    const cal = state.settings.calendar;
    if (!cal.connected) return state;

    let token = await connect({ interactive: false });
    const direction = cal.syncDirection || 'both';
    let timeline = [...state.timeline];

    async function runSync(activeToken) {
      if (direction === 'both' || direction === 'read') {
        const pulled = await pullTodayEvents(activeToken, cal.calendars);
        const localOnly = timeline.filter((t) => !t.gcalEventId && t.source !== 'google' && t.domain !== 'calendar');
        timeline = [...pulled, ...localOnly].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      }

      if (cal.writeCalendarId) {
        const writeTarget = cal.calendars.find((c) => c.id === cal.writeCalendarId);
        if (writeTarget) {
          for (const item of timeline.filter((t) => !t.gcalEventId && t.domain !== 'calendar')) {
            try {
              const created = await pushEvent(activeToken, writeTarget.id, item);
              item.gcalEventId = created.id;
              item.gcalCalendarId = writeTarget.id;
              item.gcalCalendarName = writeTarget.summary;
              item.source = 'google';
            } catch (e) {
              console.warn('[Dumply] 캘린더 push 실패:', e);
            }
          }
        }
      }
    }

    try {
      await runSync(token);
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes('401') || msg.includes('403')) {
        token = await refreshAccessToken(token);
        await runSync(token);
      } else {
        throw e;
      }
    }

    cal.lastSync = Date.now();
    return { ...state, timeline, settings: { ...state.settings, calendar: cal } };
  }

  return {
    connect,
    connectFull,
    disconnect,
    fetchUserInfo,
    refreshAccessToken,
    listCalendars,
    pullMonthEvents,
    sync,
    todayBounds,
  };
})();
