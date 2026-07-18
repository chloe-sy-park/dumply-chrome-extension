/* Dumply 계정 — Supabase 이메일 OTP 로그인 + 크레딧 기반 AI 프록시 호출 (의존성 없음) */

'use strict';

const DumplyAccount = (() => {
  const SUPA_URL = 'https://xjufyptadgejizvddgsf.supabase.co';
  const SUPA_KEY = 'sb_publishable_Z7eb_65s3GRTXIui6Gn5dg_nt1FxtVR';
  const STORE_KEY = 'dumplyAccount';

  // 메모리 캐시 — isSignedIn()을 동기로 쓰기 위함. init()에서 storage로부터 복원.
  let session = null; // { access_token, refresh_token, expires_at(sec), email }
  let balance = null; // 마지막으로 알려진 크레딧 잔액 (-1 = unlimited)
  let plan = null;    // 'free' | 'pro' | 'unlimited' (fetchBalance에서 갱신)
  let refreshing = null;

  async function init() {
    const data = await chrome.storage.local.get(STORE_KEY);
    session = data[STORE_KEY] || null;
  }

  async function saveSession(s) {
    session = s;
    if (s) await chrome.storage.local.set({ [STORE_KEY]: s });
    else await chrome.storage.local.remove(STORE_KEY);
  }

  async function authFetch(path, body) {
    const resp = await fetch(`${SUPA_URL}/auth/v1/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY },
      body: JSON.stringify(body),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data?.msg || data?.error_description || `AUTH_${resp.status}`);
    return data;
  }

  /** 이메일로 6자리 인증코드 요청 */
  function requestOtp(email) {
    return authFetch('otp', { email: String(email).trim().toLowerCase(), create_user: true });
  }

  /** 인증코드 확인 → 세션 저장 */
  async function verifyOtp(email, code) {
    const data = await authFetch('verify', {
      type: 'email',
      email: String(email).trim().toLowerCase(),
      token: String(code).trim(),
    });
    if (!data.access_token) throw new Error('VERIFY_FAILED');
    await saveSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
      email: data.user?.email || email,
    });
    return session;
  }

  /* ── Google 로그인 (웹 전용) ──
   * 확장은 chrome.identity를 쓰지만 그건 확장 API다. 웹에서는 Supabase의
   * Google provider로 리다이렉트해 같은 계정 체계(auth.uid())에 올라탄다 —
   * 이메일 OTP 사용자와 동일한 사용자로 이어지므로 동기화가 그대로 붙는다.
   * Supabase 대시보드에서 Google provider 활성화 + redirect URL 허용이 선행돼야 한다.
   */
  async function signInWithGoogle(redirectTo) {
    const target = redirectTo || `${location.origin}${location.pathname}`;
    const url = `${SUPA_URL}/auth/v1/authorize?provider=google`
      + `&redirect_to=${encodeURIComponent(target)}`;
    // provider가 꺼져 있으면 Supabase가 JSON 400을 준다 — 그대로 보내면
    // 사용자가 날 JSON 에러 페이지에 떨어진다. 먼저 확인하고 안내로 돌린다.
    try {
      const probe = await fetch(url, { method: 'GET', redirect: 'manual' });
      if (probe.status >= 400) return { ok: false, reason: 'provider-disabled' };
    } catch { /* 네트워크/CORS 문제면 그냥 진행 — 리다이렉트가 정답일 수 있다 */ }
    location.href = url;
    return { ok: true };
  }

  /** OAuth 복귀 처리 — 토큰이 URL 해시로 돌아온다. 세션 저장 후 해시를 지운다. */
  async function completeOAuthRedirect() {
    const h = location.hash || '';
    if (!h.includes('access_token=')) {
      // 사용자가 취소했거나 provider 미설정이면 error가 해시로 온다
      if (h.includes('error')) {
        const p = new URLSearchParams(h.slice(1));
        history.replaceState(null, '', location.pathname + location.search);
        return { ok: false, error: p.get('error_description') || p.get('error') };
      }
      return { ok: false, none: true };
    }
    const p = new URLSearchParams(h.slice(1));
    const access_token = p.get('access_token');
    const refresh_token = p.get('refresh_token');
    if (!access_token || !refresh_token) return { ok: false, error: 'NO_TOKEN' };
    let email = '';
    try {
      const r = await fetch(`${SUPA_URL}/auth/v1/user`, {
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${access_token}` },
      });
      if (r.ok) email = (await r.json())?.email || '';
    } catch { /* 이메일은 표시용 — 실패해도 로그인 자체는 유효 */ }
    await saveSession({
      access_token,
      refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + Number(p.get('expires_in') || 3600),
      email,
    });
    history.replaceState(null, '', location.pathname + location.search);
    return { ok: true, email };
  }

  async function signOut() {
    balance = null;
    plan = null;
    await saveSession(null);
  }

  function isSignedIn() {
    return Boolean(session?.refresh_token);
  }

  function getEmail() {
    return session?.email || null;
  }

  /** 동기화 행(user_id)에 필요한 사용자 id — access token(JWT)의 sub에서 읽는다. */
  function getUserId() {
    if (session?.user_id) return session.user_id;
    const jwt = session?.access_token;
    if (!jwt) return null;
    try {
      const body = jwt.split('.')[1];
      const json = atob(body.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json).sub || null;
    } catch {
      return null;
    }
  }

  function getBalance() {
    return balance;
  }

  function getPlan() {
    return plan;
  }

  /** 만료 임박 시 갱신하고 유효한 access token 반환. 갱신 실패(폐기된 토큰)면 로그아웃. */
  async function getAccessToken() {
    if (!session) throw new Error('NOT_SIGNED_IN');
    if (session.expires_at - 60 > Date.now() / 1000) return session.access_token;
    refreshing = refreshing || (async () => {
      try {
        const data = await authFetch('token?grant_type=refresh_token', {
          refresh_token: session.refresh_token,
        });
        await saveSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
          email: session.email,
        });
        return session.access_token;
      } catch (e) {
        await saveSession(null);
        throw new Error('SESSION_EXPIRED');
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  }

  /** 크레딧으로 AI 호출 (서버 프록시 경유). 402→NO_CREDITS, 429→RATE_LIMITED */
  async function chat(prompt, _maxTokens) {
    const token = await getAccessToken();
    const resp = await fetch(`${SUPA_URL}/functions/v1/claude`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPA_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await resp.json().catch(() => ({}));
    if (resp.status === 402) { balance = 0; throw new Error('NO_CREDITS'); }
    if (resp.status === 429) throw new Error('RATE_LIMITED');
    if (!resp.ok) throw new Error(data?.error || `API_${resp.status}`);
    if (typeof data.balance === 'number') balance = data.balance;
    // 서버 max_tokens에 잘린 응답은 JSON이 깨져 있음 → 호출자 폴백 경로로 (입력을 나누면 해결)
    if (data.stop_reason === 'max_tokens') throw new Error('OUTPUT_TRUNCATED');
    return data.text || '';
  }

  /** 서버에서 잔액·플랜 조회 (Free 월간 크레딧 갱신 겸용 — Pro 지급은 결제 웹훅이 처리) */
  async function fetchBalance() {
    const token = await getAccessToken();
    const headers = {
      'Content-Type': 'application/json',
      apikey: SUPA_KEY,
      Authorization: `Bearer ${token}`,
    };
    const resp = await fetch(`${SUPA_URL}/rest/v1/rpc/claim_free_credits`, {
      method: 'POST', headers, body: '{}',
    });
    if (resp.ok) {
      const bal = await resp.json().catch(() => null);
      if (typeof bal === 'number') balance = bal;
    }
    const planResp = await fetch(
      `${SUPA_URL}/rest/v1/profiles?select=plan&limit=1`,
      { headers },
    ).catch(() => null);
    if (planResp?.ok) {
      const rows = await planResp.json().catch(() => []);
      if (rows?.[0]?.plan) plan = rows[0].plan;
    }
    return balance;
  }

  /** 당월 AI 사용 횟수 — 크레딧 시트 미터용 */
  async function fetchUsage() {
    const token = await getAccessToken();
    const resp = await fetch(`${SUPA_URL}/rest/v1/rpc/get_monthly_usage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPA_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: '{}',
    });
    if (!resp.ok) return null;
    const n = await resp.json().catch(() => null);
    return typeof n === 'number' ? n : null;
  }

  /** 최근 크레딧 원장 — 사용 내역 표시용 (RLS: 본인 것만) */
  async function fetchLedger(limit = 20) {
    const token = await getAccessToken();
    const resp = await fetch(
      `${SUPA_URL}/rest/v1/credit_ledger?select=delta,reason,created_at&order=created_at.desc&limit=${limit}`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${token}` } },
    );
    if (!resp.ok) return null;
    const rows = await resp.json().catch(() => null);
    return Array.isArray(rows) ? rows : null;
  }

  /** 크레딧 팩 결제 시작 — Stripe Checkout URL 반환 (pack: 'small' 100개 | 'large' 500개) */
  async function createCheckout(pack) {
    const token = await getAccessToken();
    const resp = await fetch(`${SUPA_URL}/functions/v1/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPA_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pack }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.url) throw new Error(data?.error || `CHECKOUT_${resp.status}`);
    return data.url;
  }

  init();

  return { requestOtp, verifyOtp, signInWithGoogle, completeOAuthRedirect, signOut, isSignedIn, getEmail, getUserId, getAccessToken, SUPA_URL, SUPA_KEY, getBalance, getPlan, fetchBalance, fetchUsage, fetchLedger, chat, createCheckout };
})();
