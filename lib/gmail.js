/* Gmail — manifest oauth2 gmail.readonly (Google account token shared) */

'use strict';

const AlfredoGmail = (() => {
  async function api(token, path) {
    // gmail.googleapis.com이 아니라 www.googleapis.com 경유 — 후자는 이미 host_permissions에
    // 있어 새 호스트 권한을 추가하지 않는다(추가하면 업데이트 때 사용자 재동의가 뜬다).
    const resp = await fetch(`https://www.googleapis.com/gmail/v1/users/me${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`GMAIL_${resp.status}`);
    return resp.json();
  }

  function header(payload, name) {
    const list = (payload && payload.headers) || [];
    const h = list.find((x) => x.name.toLowerCase() === name.toLowerCase());
    return h ? h.value : '';
  }

  // "Gildong <a@b.com>" or "a@b.com" -> display name only
  function senderName(from) {
    const m = /^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/.exec(from || '');
    if (m) return m[1].trim();
    return (from || '').replace(/[<>]/g, '').trim();
  }

  // important + unread, last 7 days, top N (subject / sender / snippet)
  async function pullImportant(token, opts) {
    const max = (opts && opts.max) || 8;
    const q = encodeURIComponent('is:unread is:important newer_than:7d');
    const list = await api(token, `/messages?q=${q}&maxResults=${max}`);
    const ids = (list.messages || []).map((m) => m.id);
    const msgs = await Promise.all(ids.map((id) =>
      api(token, `/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`)
        .catch(() => null),
    ));
    return msgs.filter(Boolean).map((m) => ({
      id: m.id,
      subject: header(m.payload, 'Subject') || '(no subject)',
      from: senderName(header(m.payload, 'From')),
      snippet: (m.snippet || '').trim(),
      date: header(m.payload, 'Date'),
    }));
  }

  return { pullImportant, senderName };
})();

if (typeof module !== 'undefined') module.exports = AlfredoGmail;
