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

  return { requestOtp, verifyOtp, signOut, isSignedIn, getEmail, getBalance, getPlan, fetchBalance, fetchUsage, fetchLedger, chat, createCheckout };
})();
