# 🐧 Dumply — Chrome Extension

> **Simply Dumpy.** Don't organize — just dump. Detective penguin **Alfredo** helps you prioritize with MoSCoW and stay on top of your day.

[한국어](#한국어) · [English](#english)

---

## English

### What is Dumply?

Dumply is a Chrome side panel extension that lets you brain-dump tasks without worrying about organization. Alfredo, your AI detective penguin, reads through your dumps and helps you figure out what actually matters today.

**Key features:**
- **Just dump it** — type anything, tasks, worries, random thoughts
- **AI triage** — Alfredo categorizes and prioritizes using MoSCoW
- **Today's board** — see what to focus on, not everything you've ever written
- **Google Calendar sync** — optional, pulls in your schedule
- **BYOK (Bring Your Own Key)** — works with Claude, OpenAI, or Gemini API keys

### Installation (Developer Mode)

No build step required. Load the extension directly.

1. Download or clone this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the repo folder
5. Click the **Dumply** icon in your toolbar → side panel opens

> **Note:** For Google Calendar sync, you'll need to use your own OAuth client ID in `manifest.json` (see below).

### AI Setup

Dumply requires a BYOK (Bring Your Own Key) API key — no subscription needed beyond the API itself.

1. Open Dumply → go to **Settings**
2. Enter your API key for one of:
   - **Claude** (Anthropic) — `sk-ant-...`
   - **OpenAI** — `sk-...`
   - **Gemini** (Google) — your Gemini API key

### Google Calendar

The included `manifest.json` has a default OAuth client ID for demo use. For your own deployment:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → enable **Google Calendar API**
3. Create OAuth 2.0 credentials (Chrome extension type)
4. Replace `client_id` in `manifest.json` with yours

### Folder Structure

```
/
├── manifest.json           # Extension manifest
├── sidepanel.html          # Main side panel UI
├── background.js           # Service worker
├── tokens.css              # Design tokens (single source of truth)
├── popup.css               # Styles
├── components.css          # Component styles
├── app/                    # App logic
│   ├── core.js             # Core state & storage
│   ├── render.js           # Rendering
│   ├── handlers.js         # Event handlers
│   ├── nav.js              # Navigation
│   ├── compose.js          # Compose/input
│   ├── detail.js           # Detail view
│   ├── onboard.js          # Onboarding flow
│   ├── projects.js         # Projects
│   ├── calendar-view.js    # Calendar UI
│   └── timeline-block.js   # Timeline
├── lib/                    # Libraries
│   ├── ai.js               # AI provider abstraction
│   ├── calendar.js         # Google Calendar integration
│   ├── weather.js          # Weather (Open-Meteo)
│   ├── tags.js             # Tag management
│   ├── icons.js            # Icon set
│   └── decisions.js        # Decision logic
├── _locales/               # i18n (en, ko)
│   ├── en/messages.json
│   └── ko/messages.json
└── icons/                  # Extension icons
```

### Privacy

- All data is stored locally in Chrome's storage (`chrome.storage.local`)
- Your API key is stored locally and sent only to the AI provider you choose
- No data is sent to any Dumply server — there is no Dumply server
- Google Calendar data is fetched directly from Google's API using your OAuth token

---

## 한국어

### Dumply가 뭔가요?

Dumply는 Chrome 사이드 패널 확장 프로그램입니다. 정리 걱정 없이 생각을 그냥 쏟아내세요. AI 탐정 펭귄 **알프레도**가 덤프를 읽고 오늘 뭐가 진짜 중요한지 골라줍니다.

**주요 기능:**
- **그냥 던지기** — 할 일, 걱정, 아무 생각이나 타이핑
- **AI 트리아지** — 알프레도가 MoSCoW 방식으로 분류·우선순위 정리
- **오늘의 보드** — 지금 집중해야 할 것만 보여주는 뷰
- **Google 캘린더 동기화** — 선택사항, 일정 연동
- **BYOK** — Claude, OpenAI, Gemini API 키 중 하나로 동작

### 설치 (개발자 모드)

빌드 과정 없음. 바로 로드해서 사용 가능합니다.

1. 이 레포지토리를 다운로드하거나 클론
2. Chrome에서 `chrome://extensions` 열기
3. 우측 상단 **개발자 모드** 토글 ON
4. **압축 해제된 확장 프로그램을 로드** 클릭 → 레포 폴더 선택
5. 툴바의 **Dumply** 아이콘 클릭 → 사이드 패널 오픈

> **참고:** Google 캘린더 동기화를 쓰려면 `manifest.json`에 본인 OAuth 클라이언트 ID를 넣어야 합니다 (아래 참조).

### AI 설정

Dumply는 BYOK(본인 API 키 사용) 방식입니다. API 키만 있으면 별도 구독 불필요.

1. Dumply 열기 → **설정**으로 이동
2. 아래 중 하나의 API 키 입력:
   - **Claude** (Anthropic) — `sk-ant-...`
   - **OpenAI** — `sk-...`
   - **Gemini** (Google) — Gemini API 키

### Google 캘린더

포함된 `manifest.json`에는 데모용 OAuth 클라이언트 ID가 있습니다. 직접 배포하려면:

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
2. **Google Calendar API** 활성화
3. OAuth 2.0 사용자 인증 정보 생성 (Chrome 확장 프로그램 유형)
4. `manifest.json`의 `client_id`를 발급받은 값으로 교체

### 폴더 구조

위 영문 섹션과 동일합니다.

### 개인정보 보호

- 모든 데이터는 Chrome 로컬 스토리지(`chrome.storage.local`)에만 저장됩니다
- API 키는 로컬 저장 후 선택한 AI 제공업체로만 전송됩니다
- Dumply 서버는 존재하지 않으며, 어떤 데이터도 외부 서버로 전송되지 않습니다
- Google 캘린더 데이터는 OAuth 토큰을 통해 Google API에서 직접 가져옵니다

---

## License

MIT License — feel free to fork, modify, and use.
