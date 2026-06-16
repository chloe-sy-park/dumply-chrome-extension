/* 알프레도 백그라운드 — 일정 알림 + 캘린더 동기화 트리거 */

'use strict';

const STORE_KEY = 'alfredo_ext_v2';

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('timeline-')) {
    const eventId = alarm.name.replace('timeline-', '');
    const data = await getStore();
    const item = data?.timeline?.find((t) => t.id === eventId);
    if (item && !item.completed) {
      chrome.notifications.create(`reminder-${eventId}`, {
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: (data?.settings?.language === 'en' || (!data?.settings?.language && (chrome.i18n.getUILanguage?.() || '').startsWith('en')))
          ? 'Dumply — Reminder 🐧🔍'
          : 'Dumply — 약속 알림 🐧🔍',
        message: item.title,
        priority: 2,
      });
    }
  }
  if (alarm.name === 'calendar-sync') {
    chrome.runtime.sendMessage({ type: 'SYNC_CALENDAR' }).catch(() => {});
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('calendar-sync', { periodInMinutes: 30 });
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }
});

async function getStore() {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORE_KEY, (res) => {
      resolve(res[STORE_KEY] || null);
    });
  });
}

/** 팝업에서 타임라인 변경 시 알람 재스케줄 */
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'RESCHEDULE_ALARMS') {
    rescheduleAlarms(msg.timeline || [], msg.notificationsEnabled)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
});

async function rescheduleAlarms(timeline, enabled) {
  const alarms = await chrome.alarms.getAll();
  for (const a of alarms) {
    if (a.name.startsWith('timeline-')) await chrome.alarms.clear(a.name);
  }
  if (!enabled) return;

  const now = Date.now();

  for (const item of timeline) {
    if (item.completed || !item.time || !item.date || item.allDay) continue;
    const remindMinutes = item.remindMinutes ?? 10;
    if (remindMinutes < 0) continue;
    const [h, m] = item.time.split(':').map(Number);
    const target = new Date(`${item.date}T00:00:00`);
    target.setHours(h, m, 0, 0);
    const remindAt = target.getTime() - remindMinutes * 60 * 1000;
    if (remindAt > now) {
      chrome.alarms.create(`timeline-${item.id}`, { when: remindAt });
    }
  }
}
