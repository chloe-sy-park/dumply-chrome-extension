# Dumply 디자인시스템 (캐논)

> 2026-07-17 확정. 이 문서가 디자인 결정의 단일 소스다. 시각 스펙의 실물은 컴포넌트 갤러리 아티팩트, 구현의 실물은 이 레포의 `tokens.css` / `components.css` / `popup.css`.

## 0. 방향

- **매트 모노(Zinc) 기본 테마 + 컬러 액센트 테마.** 배경 그라데이션 금지 — 매트 단색 `#F6F7F9`(라이트) / `#09090B`(다크).
- 타이포 표준 = **Pretendard** (`"Pretendard Variable", Pretendard, -apple-system, …`).
- 유리(blur)는 오버레이 레이어(모달·드로어·크롬 바)에만. 본문은 매트.

## 1. 토큰 (tokens.css가 단일 소스)

- **테마 축 2개 (직교)**
  - `data-theme`: 기본(속성 없음/`light`) = Zinc 모노 · `dark` = 다크 모노 · `craft` = 구 웜 톤온톤 보존 · Linear 팔레트(system/ash/barbie/midnight/dawn/pale)
  - `data-accent`: `blue | indigo | green | amber | rose` — **CTA·선택 상태·완료 체크·크레딧 배지에만** 물든다. 구조·중립 태그는 모노 유지.
- **텍스트 4단**: `#08090A`(잉크) / `#3F3F46` / `#6B6F76` / `#B0B5BD`
- **카드 레시피**: `--card-line`(라이트 4% 잉크 헤어라인) + `--shadow-md`(0 4px 14px + 0 1px 2px). 다크 = 그림자 없음 + 7% 라이트 보더. `--border`는 인풋·구분선용.
- **radius**: 10(인풋·아이콘 버튼) / 14(버튼 `--radius-lg`) / 16(카드) / 20(시트·확장 카드) / 999(필·칩)
- **톤 사다리**: 들어감(`--bg-input`) < 바닥(`--bg-base`) < 올라옴(`--bg-surface`). 대면적(드로어·설정 그룹)은 사다리로 층위를 만들고, 화이트 카드는 강조 1곳에만.

## 2. 시그니처 규칙

- **색 신호**: 알림·경고 도트 = 앰버. 레드는 삭제 등 위험 액션 전용. MoSCoW는 기능색(must=error, should=warning, could=secondary).
- **이모지 금지** → SVG 스트로크 아이콘(1.7~1.75 stroke, currentColor 마스크). 예외: `✦`는 크레딧 단위 심볼.
- **모션 허용 목록**: fade / slide 8px / scale(.92→1) 150–240ms ease-out·`cubic-bezier(0,0,0,1)`, 배지 브리딩 1.8s(urgent 전용), 증발 260ms. 금지: bounce·shake·pulse·glow·wiggle·sway·confetti. `prefers-reduced-motion` 필수 대응.
- **위험 액션** = 확인 시트 + 680ms 롱프레스(키보드는 즉시 — 접근성).
- 타임피커 = 오전/오후 세그 + 시(1–12) 그리드 + 15분 칩. **네이티브 `input[type=time]` 사용 금지**(파란 휠). 캘린더 오늘 = 잉크 링, 선택 = 액센트 원.

- **섹션 카드 = `.a-card` 단일 문법, 시각은 갤러리 캐논** (2026-07-17): 타이틀은 카드 *안* 텍스트(14 / Medium 500, 아이콘 없음) + 서브 11 보조. **구분선 없음** — 헤드·행 모두 여백으로 분리(갤러리 브리핑·일정 카드 문법). 행 hover = accent-soft. 푸터(더보기) = accent-soft 밴드. 태스크 타이틀 15/500 + 메타 11(갤러리 결과 카드), 컴팩트 행(버킷·인박스) 13~14/500. 카드 밖 eyebrow 섹션 레이블 문법 폐기(mind-section 잔존분 제외).

## 3. 표면 구조 (사이드패널)

- **크롬 바(전역, 36px)**: 좌 햄버거 | **스크롤 시 탭 승격**(아래 참조) | 우 검색·알림·저잔액 크레딧 배지(잔액 ≤5일 때만, 앰버).
- **스크롤 헤더(A안, 확정)**: 스크롤하면 인사말(`.dash-header`)과 탭 줄(`.tabs-shell`)이 함께 접히고, 크롬 바 안 `.chrome-tabs` 컴팩트 세그먼트가 뜬다 → 상단 **188px → 36px**. 인사말은 접힌 상태에서 표시하지 않는다(정보 가치 없음). 미니 탭은 `data-tab`만 달면 `switchTab`(`$$('[data-tab]')`)이 클릭·활성상태를 자동 연동 — 탭 JS 추가 금지.
- **프로젝트 오버뷰(A안, 확정)**: 이모지 타일 + 영역·중요도 + 상태 필 → 큰 %(26/800) + 완료 카운트 + **진행 트랙 1개** → 기간은 **텍스트 한 줄**(`3/1 — 7/23 · D-5`, 7일 이내 앰버). **평행한 가로 바 2개 금지** — 별도 타임라인 바를 붙이지 않는다.
- **빈 상태**: 대면적 회색 웰 금지. 카드 안은 투명 배경, 리스트 그룹은 담백한 한 줄(`proj-empty-inline`). 회색 박스 안에 회색 박스를 넣지 말 것.
- **시트 모션**: 네비 드로어와 같은 곡선 — 딤 0.2s ease-out, 패널 0.24s cubic-bezier(0,0,0,1). 등장은 `.sheet:not([hidden])` 애니메이션, **퇴장은 `bindSheetExitMotion`의 MutationObserver 1개**가 `hidden` 부착을 감지해 `.is-closing`을 260ms 부여(닫기 호출부 16곳 무수정). 숨김은 `display:none` 유지 — 전체화면 오버레이가 남는 위험을 만들지 않는다.
- **드로어(좌측)**: 미니 페이지 톤 — base 92% blur 몸체 > input 웰 그룹 > **화이트 잔액 카드**(유일한 강조). 항목은 `data-nav`로 기존 라우팅 재사용. 닫기 = 항목 탭/딤/ESC.
- **페이지 헤더**: 홈 = 인사말(22px Bold −0.03em)+날짜, 서브 라우트 = topbar(← 메인)+타이틀. 헤더↔첫 카드 여백 16px.
- **설정 위계**: 크레딧 히어로(액센트 카드, 미로그인 CTA="무료 20✦") → 계정·연동 → AI(BYOK 셰브론 진입 행 → `route-byok` 서브 라우트) → 프로필 → 데이터(초기화 최하단). 그룹 = 화이트 카드 + 내부 인풋 base 트랙 + 항목 구분선.
- fullpage: **데스크탑(≥861px)** = 고정 사이드바 레일 + 홈 2컬럼(탭 숨김) · **모바일(≤860px)** = 사이드패널 렌더링 그대로(크롬 바+드로어+탭+바텀시트, 레일 숨김). 모바일 디자인의 단일 소스는 사이드패널이다.

## 4. 작업 가이드 (에이전트/개발 공용)

- **검증 루프**: 스크래치패드에 레포 심링크 → 로컬 서버로 `sidepanel.html` 서빙. 온보딩 게이트는 `app.hidden=false` + `navigateTo(route)`로 우회(chrome.* 없어도 UI/JS 검증 가능). 수정 시 HTML의 `?v=` 캐시버스트 반드시 범프.
- **함정**
  1. CSS `display:` 유틸이 `[hidden]` 속성을 이긴다 → 클래스별 `[hidden]{display:none!important}` 가드.
  2. `applyI18n`이 `data-i18n` 요소의 JS 설정 텍스트를 덮는다 → JS가 텍스트를 소유하는 요소는 `data-i18n` 제거.
  3. 설정 페이지 타이틀은 JS `ensureSettingsHeader()`가 렌더 — 정적 마크업으로 추가하면 중복.
  4. `lib/tags.test.js` 실패는 기존 베이스라인(`AlfredoTags is not defined`, Node 22).
  5. git push 무한대기 시: `git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push`
- 확장은 순수 JS/MV3, 빌드 없음. 스프링·레이아웃 애니메이션은 CSS 근사로.
- **트랜지션이 걸린 값 측정 시**: 클래스 토글 직후 `getComputedStyle`은 시작값을 준다. `el.style.transition='none'` + 리플로우 후 읽어야 최종값이 나온다(프리뷰 렌더러가 불안정할 때 특히).

## 4-1. PWA 이중 타깃 (같은 코드베이스 · 포크·빌드 없음)

`lib/platform.js`가 유일한 분기점이며 **가장 먼저 로드**되어야 한다.

- 확장(`chrome.runtime.id` 존재) → 아무것도 하지 않음. http(s) → 매니페스트 링크 주입 + `sw.js` 등록 + `chrome.*` 심 설치.
- 심 매핑: `storage`→localStorage · `tabs.create`→`window.open` · `notifications`→Notification API · `runtime`/`alarms`→no-op(`sendMessage`는 **Promise 반환** — 호출부가 `.catch()`로 쓴다) · `identity`→명시적 실패.
- **Google 캘린더·Gmail은 확장 전용**: `chrome.identity`의 PWA 대체가 없다. PWA에서 쓰려면 GIS 리다이렉트 OAuth를 별도로 붙여야 한다.
- **웹 저장소에 BYOK 키를 평문 저장하지 않는다** — 심의 `set`이 `settings.apiKeys`를 비운다(storage.js 폴백과 동일 정책). PWA는 키를 매 세션 입력.
- `sw.js`는 앱 셸을 프리캐시하고, 문서=네트워크 우선 / 정적 자산=캐시 우선 / 교차 출처 API=미개입. **자산 파일을 바꾸면 HTML의 `?v=`와 `sw.js`의 SHELL 목록을 함께 올릴 것.**
- 진입점 `fullpage.html`(루트 `/`는 `vercel.json` 리라이트로 연결), 앱 바로가기는 `?tab=dump|dashboard`(popup.js 처리).

### 배포 (임시)

- **https://dumply-app.vercel.app** — Vercel 프로젝트 `dumply-app`. 배포: 레포 루트에서 `vercel deploy --prod --yes --scope dopamine-languages-projects`.
- 기존 `dumply-chrome-extension` 프로젝트는 **랜딩(`www.dumply.app`) 전용**이며 Root Directory가 `landing/`이다(레포 루트 파일이 404인 것으로 확인). 그래서 루트 `vercel.json`을 추가해도 랜딩에 영향이 없다. **이 프로젝트는 건드리지 말 것.**
- SW 캐시 전략의 함정: `?v=`가 붙은 자산만 캐시 우선이고, 버전 없는 파일(`app.webmanifest` 등)은 **네트워크 우선**이어야 한다. 캐시 우선으로 두면 영원히 갱신되지 않는다(실제로 발생했던 버그). 셸 목록을 바꾸면 `sw.js`의 `VERSION`도 올릴 것.

### 계정 · 기기 간 동기화

- **계정 = Supabase**(이메일 OTP + 웹 Google OAuth). 확장의 "구글 메일로 시작하기"는 계정 생성이 아니라 **캘린더 연결**이다 — 혼동 주의(가입자는 전부 email provider).
- **동기화**: `lib/sync.js` ↔ `public.dumply_state(user_id PK, data jsonb, rev, updated_at)`, RLS `user_id = auth.uid()`. 같은 프로젝트의 `user_data`는 **다른 앱 소유**이므로 쓰지 말 것.
- 병합은 **항목 단위**(같은 id는 `updatedAt` 최신 우선) + **툼스톤**으로 삭제 전파. 통째 last-write-wins는 다른 기기가 적은 내용을 통째로 날린다.
- `updatedAt`은 마지막 동기화 스냅샷과의 diff로 push 직전에만 찍는다 — 앱의 변경 지점을 건드리지 않기 위함.
- **동기화 제외(기기 전용)**: API 키, Google/Gmail 연결, 알림·위치 권한, UI 라우트, 온보딩 여부.
- **Google 로그인(웹)**: `DumplyAccount.signInWithGoogle()` → Supabase `/auth/v1/authorize`. provider가 꺼져 있으면 400 JSON이 오므로 **preflight 후 토스트**로 돌린다(그냥 보내면 사용자가 JSON 에러 페이지에 떨어짐). 활성화하려면 Google Cloud OAuth 웹 클라이언트(redirect: `https://<project>.supabase.co/auth/v1/callback`) + Supabase Providers 설정 + Redirect URLs에 배포 도메인 추가가 필요하다.

## 5. 레퍼런스

- 컴포넌트 갤러리(시각 캐논): https://claude.ai/code/artifact/c5c9ef85-679a-4ebe-a774-56bfab2d0169
- 확장 실CSS 프리뷰: https://claude.ai/code/artifact/ba844438-ecc8-4426-8708-90822d7e875e
- 헤더+드로어 시안: https://claude.ai/code/artifact/b87580ba-888f-403c-824c-fdaf3ac17702
- 이식 커밋 범위: `b803b7a..844ad90` (feature/dumply-credits, 2026-07-16~17)

## 6. 백로그

(2026-07-17 1~5차 완료: ①craft 웜 밴드 7색 ②MoSCoW 보드 밀도 ③검색·알림 구현+`data-feature` 해제 ④온보딩 이모지→lucide ⑤fullpage 레일·모달 정합 — 커밋 `f6a9b8d..b6a9661`)

1. **상세 시트 타임피커**: `detail.js`가 네이티브 `input[type=time]` 사용 중 (§2 금지) → compose의 커스텀 타임피커(오전/오후 세그+시 그리드+15분 칩)로 교체
2. fullpage 레일에 드로어식 화이트 잔액 카드(강조 1곳) 이식 검토
3. 검색 시트 — 키보드 단축키(Cmd/Ctrl+K) 진입 검토
