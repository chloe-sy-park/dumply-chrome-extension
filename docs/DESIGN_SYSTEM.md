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

## 3. 표면 구조 (사이드패널)

- **크롬 바(전역, 36px)**: 좌 햄버거 | (스크롤 시 인사말 승격) | 우 검색·알림(`data-feature`로 hidden, 기능 배포 시 해제)·저잔액 크레딧 배지(잔액 ≤5일 때만, 앰버).
- **드로어(좌측)**: 미니 페이지 톤 — base 92% blur 몸체 > input 웰 그룹 > **화이트 잔액 카드**(유일한 강조). 항목은 `data-nav`로 기존 라우팅 재사용. 닫기 = 항목 탭/딤/ESC.
- **페이지 헤더**: 홈 = 인사말(22px Bold −0.03em)+날짜, 서브 라우트 = topbar(← 메인)+타이틀. 헤더↔첫 카드 여백 16px.
- **설정 위계**: 크레딧 히어로(액센트 카드, 미로그인 CTA="무료 20✦") → 계정·연동 → AI(BYOK 셰브론 진입 행 → `route-byok` 서브 라우트) → 프로필 → 데이터(초기화 최하단). 그룹 = 화이트 카드 + 내부 인풋 base 트랙 + 항목 구분선.
- fullpage는 고정 사이드바 레일 유지(드로어 미적용).

## 4. 작업 가이드 (에이전트/개발 공용)

- **검증 루프**: 스크래치패드에 레포 심링크 → 로컬 서버로 `sidepanel.html` 서빙. 온보딩 게이트는 `app.hidden=false` + `navigateTo(route)`로 우회(chrome.* 없어도 UI/JS 검증 가능). 수정 시 HTML의 `?v=` 캐시버스트 반드시 범프.
- **함정**
  1. CSS `display:` 유틸이 `[hidden]` 속성을 이긴다 → 클래스별 `[hidden]{display:none!important}` 가드.
  2. `applyI18n`이 `data-i18n` 요소의 JS 설정 텍스트를 덮는다 → JS가 텍스트를 소유하는 요소는 `data-i18n` 제거.
  3. 설정 페이지 타이틀은 JS `ensureSettingsHeader()`가 렌더 — 정적 마크업으로 추가하면 중복.
  4. `lib/tags.test.js` 실패는 기존 베이스라인(`AlfredoTags is not defined`, Node 22).
  5. git push 무한대기 시: `git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push`
- 확장은 순수 JS/MV3, 빌드 없음. 스프링·레이아웃 애니메이션은 CSS 근사로.

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
