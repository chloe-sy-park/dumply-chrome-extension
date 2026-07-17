# Dumply 디자인 방향 (dumply-design-direction)

> 세션 준비용 메모리 문서. 새 세션 시작 시 이 문서를 먼저 읽고 작업하세요.
> 최종 갱신: 2026-07-17

## 한눈에 보기 — 현재 상태

- **현행(main) 디자인 방향은 v0.1 "웜 듄(warm dune)"** — 확장(`tokens.css`)과 PWA(`pwa/tokens.css`) 모두 웜 톤온톤 팔레트.
- **미결 사항: PR #29** ([design: 디자인 시스템 v0.2 — Zinc 모노크롬](https://github.com/chloe-sy-park/dumply-chrome-extension/pull/29))가 draft로 열려 있음. ai-alfredo 저장소의 Zinc 회색 기반 모노크롬으로 PWA 토큰을 전면 개정하는 제안. **머지 여부는 아직 결정되지 않음.**
- PR #29의 base(`4894342`)는 이후 main에 머지된 크레딧 시스템(#30)·랜딩 개편(#31)보다 오래되지만, **현재 main과 충돌 없이 머지 가능함을 확인** (2026-07-17, `git merge-tree` 검증 — main의 이후 변경은 확장·랜딩 파일만 수정, PWA 파일과 겹치지 않음). 남은 것은 채택 여부 결정뿐.

## 핵심 원칙 (현행 v0.1 기준)

근거 사례는 `docs/pwa-design-system.html` 참조.

1. **유채색은 기능에만** — MoSCoW 우선순위·상태·캘린더 밴드 전용. 장식용 색 금지. (Vercel Geist)
2. **깊이는 그림자가 아니라 서피스 온도 사다리로** — 들어감(sunken) < 바닥(base) < 올라옴(raised). 같은 웜 hue의 명도 계단. (Stripe)
3. **순백·순흑 미사용** — 바닥 `#F3F1EB`, 카드 `#FBFAF6`(웜 오프화이트), 잉크 `#36312B`(웜 먹색), 액센트 `#262019`(에스프레소 차콜).
4. **다크는 반전이 아니라 같은 hue의 저명도 사다리 재구축.** (Linear LCH)
5. **3계층 토큰 아키텍처** — ① Primitive(`--dune-*`, `--fn-*`) ② Semantic(`--dumply-*`) ③ Component. 컴포넌트 CSS에서 primitive 직접 참조 금지.
6. **타이포**: Pretendard, 4단계 텍스트 컬러(primary/body/secondary/placeholder).
7. **MoSCoW 기능색**: must=error(레드), should=warning(앰버), could=무채 secondary, won't=placeholder — "색=긴급도" 문법 유지.
8. **캘린더 밴드 파스텔**은 이벤트 표시 전용, UI 크롬에 사용 금지.
9. **거버넌스**: `.stylelintrc.json` + GitHub Actions Stylelint CI로 토큰 규칙 강제.

## 알프레도 (마스코트) 원칙

상세: `docs/alfredo-asset-spec.md`

- **캐릭터가 유일한 장식** — UI에서 허용되는 일러스트는 알프레도뿐.
- 상태 머신 5종: `idle` / `investigating` / `curious` / `celebrating` / `offline`.
- **부정 감정 금지** — 화남·실망·죄책감 유발 카피("잊으셨나요?" 류) 시스템 차원 금지. (Finch의 처벌 없는 친절 루프)
- 형태 언어: 곡선 전용, 모서리 없음. 소품은 탐정 모자와 돋보기만.
- 현재 `pwa/assets/alfredo/*.svg`는 플레이스홀더 — 정식 일러스트 교체 대상 (체크리스트는 스펙 문서 §4).

## v0.1 웜 듄 vs v0.2 Zinc (PR #29) 비교

| 영역 | v0.1 웜 듄 (main 현행) | v0.2 Zinc (PR #29 제안) |
|---|---|---|
| 중성 램프 | 웜 듄 13단계 | Zinc 16단계 (#FFFFFF…#09090B) |
| 바닥/카드 | #F3F1EB / #FBFAF6 | #F6F6F8 / 순백 카드 |
| 액센트 | 에스프레소 차콜 #262019 | 근흑 #1B1B1F ↔ 다크 근백 #FAFAFA |
| MoSCoW | 웜 템퍼링 커스텀 | Apple 시스템 시맨틱 + 소프트 bg |
| 깊이 | 그림자 전면 금지 | 섀도 토큰 2종 + 글래스 탭바 |
| 모션 | 3단 duration | 5단 + 이징 3종 + 금지 keyframes 린트 |

유지되는 것: 3계층 토큰 아키텍처, 시맨틱 토큰 이름, 점선=제안/실선=확정 신뢰 언어, 색 사용 결정 트리, 캘린더 밴드, Stylelint CI.

## 서피스별 토큰 소스

| 서피스 | 토큰 파일 | 상태 |
|---|---|---|
| 크롬 확장 (사이드패널) | `tokens.css` | 단일 소스, v0.1 웜 듄 |
| PWA | `pwa/tokens.css` | v0.1 웜 듄 (PR #29가 Zinc로 개정 제안 중) |
| PWA 초안 문서 | `docs/tokens-pwa-draft.css` | v0.1 초안 (PR #29 머지 시 삭제됨) |
| 랜딩 | `landing/styles.css` 등 | 별도 관리 |

## 최근 작업 맥락 (2026-07 기준)

- **크레딧 시스템** (#30): 서버 인증, 크레딧 pill/시트, Pro 구독 UI, Paddle 체크아웃.
- **랜딩** (#31): 크레딧 요금제 반영 — pricing 페이지(ko/en/ja), 카피 갱신.
- **PWA 기반** (#26–28): 대시보드 디자인 리서치 30사례, 디자인 시스템 제안, PWA 셸 스캐폴드, 토큰 거버넌스 CI.

## 다음 세션에서 열린 결정/할 일

1. **PR #29 방향 결정** — v0.1 웜 듄 유지 vs v0.2 Zinc 채택. 충돌 없음 확인됨(2026-07-17), 채택 시 그대로 머지 가능. 채택하면 확장 `tokens.css`와의 정합성(확장은 여전히 웜 듄) 후속 검토 필요.
2. 알프레도 정식 일러스트 반입 (5상태 + celebrating 요일 variant 7종) — 팔레트는 PR #29 결정에 따라 확정.
3. PWA 앱 아이콘(512 maskable) 정식 제작 — 현재 플레이스홀더.
4. 랜딩 ↔ 확장 ↔ PWA 간 토큰 일관성 점검.

## 세션 재개 가이드

- 이 문서를 읽은 뒤, PR #29가 아직 열려 있으면 **사용자에게 v0.1/v0.2 방향 결정을 먼저 확인**할 것 (디자인 방향의 최상위 분기점).
- 결정 후 순서: PR #29 처리 → 알프레도 일러스트/아이콘 팔레트 확정 → 서피스 간 토큰 정합성.
- 토큰 규칙 변경 시 `.stylelintrc.json`과 Stylelint CI(`.github/workflows/stylelint.yml`) 동기화 잊지 말 것.
