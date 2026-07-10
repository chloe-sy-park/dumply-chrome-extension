# Superlist Web 레퍼런스 분석 — 레이아웃 · 컴포넌트 · 타이포 위계

Mobbin MCP로 수집한 [Superlist Web 스크린](https://mobbin.com/apps/superlist-web-ab94ece4-abb8-4213-a69b-2b5d9d6f6129/8da2b64f-a55a-4432-89c6-2da7588f1106/screens)
분석과 Dumply PWA 적용 매핑. 디자인 시스템 v0.2(Zinc)의 토큰 체계 위에 이식한다.

## 1. 레이아웃 — "플로팅 패널" 3존

- 연한 틴트 배경 위에 **메인 콘텐츠가 큰 라운드 패널로 떠 있음** — 창에 붙은 풀블리드가 아니라
  상하좌우 여백을 가진 시트. 우측에 장식 아트워크/상세 패널이 같은 방식으로 병치
  ([Today 뷰](https://mobbin.com/screens/dac73c81-3946-4efa-83f6-c15ca204c7ff),
  [Tasks 뷰](https://mobbin.com/screens/2ab73ef1-c40d-465a-a9b1-d8ccbe8b117b))
- 사이드바는 **보더 없이** 배경 틴트로만 구분되는 슬림 칼럼: 스마트 리스트(Inbox/Today/Tasks/Messages)
  → Recent → Lists(이모지·컬러 아이콘) → 하단 아바타. 활성 항목은 소프트 필 + 브랜드 색 텍스트
- 태스크 상세는 새 페이지가 아니라 **패널 내 분할(리스트|상세)**로 열림
  ([상세 분할](https://mobbin.com/screens/9e0803a5-d4d3-4911-9d73-5b1263e3f77d))
- **Dumply 적용**: 데스크톱(≥1024px)에서 `.col-main`을 `--dumply-radius-sheet`(24) 라운드의
  raised 패널로 승격, 카드 섀도는 패널로 이동. 행 카드는 플랫해짐(보더만). 모바일은 풀블리드 유지

## 2. 타이포 위계 — 3단 극대비

| 역할 | Superlist | Dumply 토큰 매핑 |
|---|---|---|
| 페이지 타이틀 | ~32px extra-bold, 좌정렬, tight | `--fs-display` 32 / `--fw-bold` / `--ls-tight` |
| 행 타이틀 | 13–14px medium | `--fs-body` 14 / `--fw-medium` |
| 행 메타 | 10–11px, 아이콘 프리픽스, tertiary | `--fs-sm` 11 / `--dumply-ink-secondary` |
| 섹션 헤더 | 15px semibold + 셰브런 (Overdue/Today) | `--fs-md`-1 semibold — 대문자 라벨 대신 문장형 |

핵심: 중간 크기를 건너뛰는 **극단적 크기 대비**(32 ↔ 14 ↔ 11)가 위계를 만든다.
리스트 문서 내부는 H1 밑에 브랜드색 언더라인 디바이더
([Getting Started](https://mobbin.com/screens/06933061-fc1d-48a1-bdae-40b32fd50549)).

## 3. 컴포넌트 → Dumply 매핑

| Superlist 컴포넌트 | 관찰 | Dumply 적용 |
|---|---|---|
| **원형 체크박스** | 모든 행에 서클 체크 | `.check`를 `border-radius: 50%`로 (기존 7px 스쿼클 폐기) |
| **New task ⌃N 고스트 행** | 리스트 최상단, 단축키 칩 내장 ([Today](https://mobbin.com/screens/f3c55a25-0602-4a5c-bd59-f69c38d76a1d)) | "새 덤프" 고스트 행 + `<kbd>` 칩 — 하단 필과 병행 |
| **필터 칩 행** | Tasks for me / Others / Upcoming / Done ([Tasks](https://mobbin.com/screens/2ab73ef1-c40d-465a-a9b1-d8ccbe8b117b)) | 타이틀 아래 MoSCoW 필터 칩 (전체/Must/Should/Could) |
| **접이식 섹션 헤더** | 셰브런 + Overdue/Today 그룹 | `.sec-head`에 셰브런 토글 (접힘 상태 저장) |
| **정렬 칩 (우상단)** | "Due date", "Alphabetical" ([Inbox](https://mobbin.com/screens/32788003-a1d8-4296-95fa-27874d3017c6)) | 보드 우상단 정렬 칩 (마감순/우선순위순) — 후속 |
| **AI 힌트 배너** | 라벤더 틴트, 아이콘+열기+닫기 ([Today](https://mobbin.com/screens/dac73c81-3946-4efa-83f6-c15ca204c7ff)) | 알프레도 무대가 동일 역할 — 뷰별 컨텍스트 힌트는 후속. 라벤더 대신 점선+ai-bg (우리 신뢰 언어 유지) |
| **행 트레일링 액션** | 아바타 + 상세 아이콘 | 상세 아이콘 1개만 (개인 앱 — 아바타 불필요) |
| **리스트=문서 하이브리드** | 슬래시 블록 메뉴 (Task/H1/H2/불릿…) ([블록 메뉴](https://mobbin.com/screens/1c8e02a7-6bb9-445a-8ba9-de88c40888a8)) | 프로젝트 뷰 장기 방향 — 이번 범위 밖 |

## 4. 수용하지 않는 것

- **레드 브랜드 액센트**: Superlist의 코랄/레드는 우리 문법에선 Must 전용색과 충돌 → 액센트는 근흑 유지
- **우측 장식 아트워크 패널**: 아름답지만 Dumply에선 타임라인 패널이 그 자리를 차지 — 장식은 알프레도 담당
- **라벤더 AI 틴트**: "유채색 = 기능" 규칙 위반 → AI 표면은 점선 + zinc 소프트 유지

## 5. 이번 커밋에 적용된 것

1. 데스크톱 플로팅 패널 (`.col-main` → raised sheet, 카드 섀도 패널로 이동)
2. 페이지 타이틀 32px 승격 (모바일 24 유지)
3. 원형 체크박스
4. "새 덤프 ⌃N" 고스트 행 + kbd 칩
5. MoSCoW 필터 칩 행 (시각 데모)
6. 접이식 섹션 헤더 (셰브런, app.js 토글)
