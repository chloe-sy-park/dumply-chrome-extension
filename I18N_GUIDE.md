# Dumply i18n 가이드 — 새 언어 추가하기

## 시스템 개요

| 파일 | 역할 |
|---|---|
| `lib/i18n.js` | 전체 문자열 딕셔너리 + `t()` 함수 정의 |
| `sidepanel.html` | 정적 HTML — `data-i18n` 속성으로 i18n 태그 |
| `popup.js` | 앱 부트 시 `document.documentElement.lang` 설정 |
| `app/handlers.js` | 언어 변경 시 `document.documentElement.lang` 갱신 |

### `t()` 함수 동작 방식

```js
// lib/i18n.js 하단
function t(key, ...args) {
  const dict = STRINGS[_lang] || STRINGS.ko;
  const val = dict[key] ?? (STRINGS.ko[key] ?? key);
  return typeof val === 'function' ? val(...args) : val;
}
```

- 현재 언어 딕셔너리에서 키 조회 → 없으면 `ko` fallback → 없으면 키 자체 반환
- 값이 함수면 `...args`를 넘겨 호출 (다국어 인자 포맷에 사용)
- 값이 배열이면 배열 그대로 반환 (예: `cal.weekdays`)

---

## 새 언어 추가 절차

### 1단계 — `lib/i18n.js`에 새 섹션 추가

`STRINGS` 객체에 언어 코드 섹션을 추가한다.

```js
const STRINGS = {
  ko: { /* 기존 */ },
  en: { /* 기존 */ },
  ja: {             // ← 새 언어 추가
    'ob.welcome.google': 'Googleで始める',
    // ... 아래 전체 키 목록 참조
  },
};
```

**폴백 규칙**: 키가 없으면 자동으로 `ko` 값 사용. 따라서 번역하지 않은 키는 한국어로 표시된다.

### 2단계 — 언어 감지 로직 확인

```js
// lib/i18n.js 상단
function detect() {
  const nav = navigator.language || navigator.userLanguage || 'ko';
  if (nav.startsWith('en')) return 'en';
  // 새 언어 추가 시 여기에 분기 추가
  if (nav.startsWith('ja')) return 'ja';
  return 'ko';
}
```

### 3단계 — Settings UI에 옵션 추가

`sidepanel.html` 에서 언어 선택 `<select>` 에 옵션 추가:

```html
<select id="language-select">
  <option value="auto" data-i18n="settings.language.auto">자동 (브라우저 설정)</option>
  <option value="ko">한국어</option>
  <option value="en">English</option>
  <option value="ja">日本語</option>  <!-- 추가 -->
</select>
```

### 4단계 — `document.documentElement.lang` 처리

`popup.js`와 `app/handlers.js`에서 이미 `document.documentElement.lang = AlfredoI18n.lang()`을 설정하므로 추가 작업 불필요. 이것은 브라우저 네이티브 `<input type="time">`, `<input type="date">` 의 로케일 표시에 영향을 준다.

---

## 전체 번역 키 목록

아래 모든 키를 새 언어 섹션에 추가해야 한다.  
**(함수형 키는 동일한 인자 시그니처를 유지해야 함)**

### 온보딩 (ob.*)

| 키 | KO | EN |
|---|---|---|
| `ob.welcome.google` | 구글 메일로 시작하기 | Continue with Google |
| `ob.welcome.guest` | 게스트로 시작하기 | Continue as Guest |
| `ob.welcome.connecting` | 연결 중… | Connecting… |
| `ob.nickname.title` | 덤플리에 오신 걸 환영해요 | Welcome to Dumply |
| `ob.nickname.desc` | 어떻게 불러드릴까요? | What should we call you? |
| `ob.nickname.label` | 닉네임 | Nickname |
| `ob.nickname.placeholder` | 예: 소영 | e.g. Alex |
| `ob.nickname.required` | 닉네임을 입력해주세요 | Please enter a nickname |
| `ob.calendar.title` | 연결할수록 똑똑하게 정리해요 | The more you connect, the smarter it gets |
| `ob.calendar.desc` | 자동으로 할 일/일정을 불러올게요 | We'll pull in your tasks and events automatically |
| `ob.calendar.google` | Google Calendar | Google Calendar |
| `ob.calendar.google.sub` | 사용 중인 캘린더를 동기화해요 | Sync your calendar |
| `ob.calendar.email.sub` | 중요한 메일을 놓치지 않게 챙겨요 | Never miss an important email |
| `ob.calendar.slack.sub` | 대화의 맥락을 챙겨요 | Keep track of conversation context |
| `ob.calendar.hint` | Google 계정으로 로그인하면... | Sign in with your Google account... |
| `ob.calendar.selected` | `(n) => \`캘린더 선택 (${n}개 선택됨)\`` | `(n) => \`Calendars (${n} selected)\`` |
| `ob.api.title` | API 연결 | Connect AI |
| `ob.api.desc` | 덤플리 AI 정리에 쓸 API 키예요 (선택) | API key for Dumply's AI features (optional) |
| `ob.api.provider` | AI 제공자 | AI Provider |
| `ob.api.key.anthropic` | Anthropic API 키 | Anthropic API Key |
| `ob.api.key.openai` | OpenAI API 키 | OpenAI API Key |
| `ob.api.key.google` | Google API 키 (Gemini) | Google API Key (Gemini) |
| `ob.api.hint.anthropic` | console.anthropic.com/settings/keys 에서 발급 | Get your key at console.anthropic.com/settings/keys |
| `ob.api.hint.openai` | platform.openai.com/api-keys 에서 발급 | Get your key at platform.openai.com/api-keys |
| `ob.api.hint.google` | aistudio.google.com/apikey 에서 발급 | Get your key at aistudio.google.com/apikey |
| `ob.api.hint.link` | 키 발급하기 | Get API key |
| `ob.api.notice` | Claude Pro / ChatGPT Plus... | Claude Pro / ChatGPT Plus... |
| `ob.api.disclosure` | AI 기능 사용 시 입력한 텍스트가... | When using AI features, your text is sent... |
| `ob.location.title` | 날씨 불러오기 | Show weather |
| `ob.location.desc` | 위치를 허용하면 오늘 날씨를 자동으로 가져와요. | Allow location access to automatically show today's weather. |
| `ob.location.sub` | 좌표는 이 기기에만 저장돼요. | Coordinates are stored on this device only. |
| `ob.location.btn` | 위치 허용하기 | Allow location |
| `ob.notify.title` | 브라우저 알림 허용 | Enable notifications |
| `ob.notify.desc` | 약속 10분 전에 덤플리가 알려드릴게요. | Dumply will remind you 10 minutes before an event. |
| `ob.notify.btn` | 알림 허용하기 | Allow notifications |
| `ob.notify.done` | 알림 허용됨 | Notifications enabled |
| `ob.next` | 다음 | Next |
| `ob.start` | 시작하기 | Get started |
| `ob.skip` | 건너뛰기 | Skip |
| `ob.learn.meta` | `(pct) => \`${pct}% 학습됨 — ...\`` | `(pct) => \`${pct}% learned — ...\`` |
| `ob.aria.connect` | 연결 | Connect |

### 설정 (settings.*)

| 키 | KO | EN |
|---|---|---|
| `settings.title` | 설정 | Settings |
| `settings.pin` | 패널 고정 | Pin panel |
| `settings.unpin` | 패널 고정 해제 | Unpin panel |
| `settings.pin.toast` | 패널 고정 표시 📌 | Panel pinned 📌 |
| `settings.unpin.toast` | 패널 고정 해제 | Panel unpinned |
| `settings.pin.error` | 패널을 닫을 수 없어요 | Cannot close the panel |
| `settings.language` | 언어 | Language |
| `settings.language.auto` | 자동 (브라우저 설정) | Auto (browser setting) |
| `settings.weather.city` | 날씨 도시 | Weather city |
| `settings.weather.default` | 서울 | New York |
| `settings.location.connected` | `(city) => \`${city \|\| '현재 위치'} · GPS 좌표 저장됨\`` | `(city) => \`${city \|\| 'Current location'} · GPS coordinates saved\`` |
| `settings.location.desc` | 위치를 허용하면 헤더에 날씨가 표시돼요 | Allow location to show weather in the header |
| `settings.location.btn` | 위치 허용하기 | Allow location |
| `settings.location.refresh` | 위치 다시 불러오기 | Refresh location |
| `settings.calendar.login` | 로그인하면 캘린더 일정을 가져와요 | Sign in to import calendar events |
| `settings.cal.select` | 캘린더 선택 | Select calendars |
| `settings.cal.view` | 보기 | View |
| `settings.cal.write` | 쓰기 | Write |
| `settings.save.toast` | 저장됐어요 ✓ | Saved ✓ |
| `settings.reset.confirm` | 모든 데이터를 삭제할까요?... | Delete all data?... |
| `settings.reset.toast` | 데이터를 초기화했어요 | All data cleared |
| `settings.weather.not.found` | 날씨 도시를 찾지 못했어요 | Could not find that city |
| `settings.api.storage.notice` | API 키는 이 기기의 로컬 저장소에... | API keys are stored unencrypted... |
| `settings.name` | 이름 | Name |
| `settings.name.placeholder` | 닉네임 | Nickname |
| `settings.theme` | 테마 | Theme |
| `settings.theme.hint` | System은 라이트=Ash · 다크=Midnight로 자동 전환돼요 | System auto-switches: light→Ash · dark→Midnight |
| `settings.weather.hint` | GPS 또는 도시 이름으로 날씨를 가져와요 | Fetch weather by GPS or city name |
| `settings.weather.placeholder` | 예: 서울 | e.g. New York |
| `settings.location` | 위치 · 날씨 | Location · Weather |
| `settings.api.notice` | 💡 Claude Pro... | 💡 Claude Pro... |
| `settings.ai.provider` | AI 제공자 | AI Provider |
| `settings.ai.model` | 모델 | Model |
| `settings.api.anthropic` | Anthropic API 키 | Anthropic API Key |
| `settings.api.openai` | OpenAI API 키 | OpenAI API Key |
| `settings.api.google.label` | Google API 키 (Gemini) | Google API Key (Gemini) |
| `settings.google.label` | Google 계정 · 캘린더 | Google Account · Calendar |
| `settings.google.connect` | Google로 로그인 · 캘린더 연동 | Sign in with Google · Connect Calendar |
| `settings.google.disconnect` | 연결 해제 | Disconnect |
| `settings.cal.sync` | 동기화 캘린더 | Sync Calendars |
| `settings.cal.sync.both` | 양방향 동기화 | Bidirectional sync |
| `settings.cal.sync.read` | 읽기만 | Read only |
| `settings.cal.sync.write` | 쓰기만 | Write only |
| `settings.dictionary.label` | 내 단어장 | My Dictionary |
| `settings.dictionary.hint` | 덤프에서 직접 등록한 고유명사예요. 탭하면 삭제돼요. | Custom terms you added from dumps. Tap to delete. |
| `settings.decisions.label` | AI 판단 기록 | AI Decision Log |
| `settings.decisions.hint` | 덤플리의 우선순위 제안을 그대로 썼는지... | Tracks whether you kept or changed... |
| `settings.backup.label` | 데이터 백업 | Data Backup |
| `settings.backup.hint` | 데이터는 이 기기의 브라우저에만 저장돼요... | Data is saved only in your browser... |
| `settings.backup.export` | 내보내기 | Export |
| `settings.backup.import` | 가져오기 | Import |
| `settings.reset.label` | 데이터 초기화 | Reset Data |
| `settings.reset.hint` | 모든 할 일·프로젝트·연동 설정을 삭제하고... | Deletes all tasks, projects... |
| `settings.reset.btn` | 데이터 초기화하기 | Reset All Data |
| `settings.save` | 저장 | Save |
| `settings.cal.status.email` | `(email, n) => \`${email} · 캘린더 ${n}개 연동\`` | `(email, n) => \`${email} · ${n} calendar${n===1?'':'s'} synced\`` |
| `settings.cal.status.connected` | Google Calendar 연결됨 | Google Calendar connected |
| `settings.cal.status.none` | 로그인하면 캘린더 일정을 가져와요 | Sign in to import calendar events |

### 네비게이션 (nav.*)

| 키 | KO | EN |
|---|---|---|
| `nav.home` | 메인 | Home |
| `nav.calendar` | 캘린더 | Calendar |
| `nav.projects` | 프로젝트 | Projects |
| `nav.toggle.collapse` | 메뉴 접기 | Collapse menu |
| `nav.toggle.expand` | 메뉴 펼치기 | Expand menu |
| `nav.back.main` | ← 메인 | ← Main |

### 탭

| 키 | KO | EN |
|---|---|---|
| `dump.tab` | 브레인 덤프 | Brain Dump |
| `dashboard.tab` | 대시보드 | Dashboard |

### 덤프 카드

| 키 | KO | EN |
|---|---|---|
| `dump.card.hint` | 정리하지 말고, 그냥 쏟아내세요 | Don't organize — just dump it |
| `dump.example.btn` | ↻ 예시 | ↻ Example |
| `dump.input.hint` | Enter로 정리 · Shift+Enter로 줄바꿈 | Enter to organize · Shift+Enter for new line |
| `dump.input.placeholder` | 엄마 오후 3시 생일 선물... | Buy mom a birthday gift... |

### Inbox

| 키 | KO | EN |
|---|---|---|
| `inbox.ai.title` | AI가 하나씩 질문하며 분류해요 | AI asks one item at a time to classify |
| `inbox.ai.label` | AI 문답 | AI Q&A |
| `inbox.flow.hint` | Enter로 덤프 → 추천 확인... | Enter to dump → confirm... |
| `inbox.classify.btn` | 추천대로 분류 | Classify as suggested |
| `inbox.classify.btn.count` | `(n) => \`↓ 추천대로 분류 (${n})\`` | `(n) => \`↓ Classify as suggested (${n})\`` |
| `inbox.mood.low` | 😮‍💨 오늘 컨디션이 좀 낮아 보여요... | 😮‍💨 Your energy looks a bit low today... |
| `inbox.mood.rest` | 😮‍💨 오늘은 무리하지 말고... | 😮‍💨 Take it easy today... |
| `inbox.empty` | 브레인 덤프에서 Enter로 정리하면\n여기에 쌓여요 | Press Enter in Brain Dump\nto fill your inbox |
| `inbox.to.task` | 할 일로 | Add as task |
| `inbox.hold` | 분류하지 않고 Inbox에 유지 | Keep in Inbox without sorting |
| `inbox.dup` | `(n) => \`이미 있는 ${n}개라 건너뛰었어요\`` | `(n) => \`Skipped ${n} duplicate${n===1?'':'s'}\`` |

### MoSCoW

| 키 | KO | EN |
|---|---|---|
| `moscow.title` | MoSCoW 분류 | MoSCoW |
| `moscow.guide` | Must는 3개 이하 · 드래그로 순서·버킷 변경 | Must: 3 or fewer · Drag to reorder or change bucket |
| `moscow.empty` | — 비어 있음 | — Empty |
| `moscow.compose.must.hint` | Must는 3개 이하를 권장해요 | Keep Must to 3 or fewer |
| `moscow.option.must` | Must로 올리기 | Move to Must |
| `moscow.option.should` | Should로 두기 | Keep as Should |
| `moscow.option.later` | 오늘은 안 함 | Not today |

### 생각 중 / 오늘의 마음

| 키 | KO | EN |
|---|---|---|
| `ponder.title` | 생각 중 | Things to consider |
| `ponder.hint` | 아직 결정 전 — 마음 정해지면 할 일로 옮겨요 | Not decided yet — move to tasks when you're ready |
| `ponder.to.task` | 할 일로 | Add as task |
| `feeling.title` | 오늘의 마음 | Today's mood |
| `feeling.hint` | 할 일 아닌 감정은 여기 — 오늘 컨디션에 반영돼요 | Emotions, not tasks — reflected in today's energy level |

### 대시보드

| 키 | KO | EN |
|---|---|---|
| `dashboard.priority.title` | 오늘의 우선순위 | Today's priorities |
| `dashboard.remember.title` | 잊지 말 것 | Don't forget |
| `dashboard.timeline.title` | 오늘 타임라인 | Today timeline |
| `dashboard.timeline.sync` | 동기화 | Sync |
| `dashboard.timeline.sync.title` | Google Calendar 동기화 | Sync Google Calendar |
| `dashboard.timeline.add.title` | 일정 추가 | Add event |
| `dashboard.more` | 더보기 ▾ | Show more ▾ |
| `dashboard.priority.add.title` | 할 일 추가 | Add task |
| `dashboard.priority.reorder.title` | AI 재정렬 | AI reorder |
| `dashboard.priority.empty.hint` | Inbox에서 MoSCoW로 분류하면 여기에 표시돼요 | Classify items from Inbox with MoSCoW to show here |

### Remember

| 키 | KO | EN |
|---|---|---|
| `remember.add.cta` | + 클릭해서 추가 | + Click to add |
| `remember.placeholder` | 잊지 말 것을 입력… | Something to remember… |
| `remember.pin` | 고정 | Pin |

### AI

| 키 | KO | EN |
|---|---|---|
| `ai.analyzing` | AI 분석 중… | AI analyzing… |
| `ai.moscow.title` | 덤플리의 우선순위 질문 | Dumply's priority question |

### 단위 / 딕셔너리

| 키 | KO | EN |
|---|---|---|
| `unit.count` | `(n) => \`${n}개\`` | `(n) => \`${n}\`` |
| `unit.warn.count` | `(n) => \`${n}개 ⚠️\`` | `(n) => \`${n} ⚠️\`` |
| `dict.added` | `(term) => \`'${term}' 단어장에 추가 ✓\`` | `(term) => \`'${term}' added to dictionary ✓\`` |
| `dict.cat.pet` | 반려동물 | Pet |
| `dict.cat.person` | 사람 | Person |
| `dict.cat.place` | 장소 | Place |
| `dict.cat.project` | 프로젝트 | Project |
| `dict.cat.etc` | 기타 | Other |

### 공통 버튼 / 시트

| 키 | KO | EN |
|---|---|---|
| `close.btn` | 닫기 | Close |
| `complete.btn` | 완료 | Complete |
| `cancel.btn` | 취소 | Cancel |
| `add.btn` | 추가 | Add |
| `delete.btn` | 삭제 | Delete |
| `allday.btn` | 🌅 종일 | 🌅 All day |

### Detail 시트

| 키 | KO | EN |
|---|---|---|
| `task.tab` | 할 일 | Task |
| `event.tab` | 일정 | Event |
| `title.placeholder` | 제목 | Title |
| `notes.placeholder` | 설명 | Notes |
| `subtask.title` | 하위 작업 | Subtasks |
| `subtask.split.btn` | AI 쪼개기 | AI split |
| `subtask.add.btn` | + 하위 작업 추가 | + Add subtask |
| `detail.prep.before` | `(hint, time) => \`🔗 ${hint}${time} 전 준비\`` | `(hint, time) => \`🔗 ${hint} — ${time} before\`` |
| `detail.bucket.inbox` | Inbox (미분류) | Inbox (unsorted) |
| `detail.suggest` | 추천 | Suggest |
| `detail.blocker` | `(content) => \`🔒 '${content}' 먼저\`` | `(content) => \`🔒 Blocked by '${content}'\`` |
| `detail.prep` | `(names) => \`🔧 준비 작업: ${names}\`` | `(names) => \`🔧 Prep tasks: ${names}\`` |
| `detail.source.sync` | `(label) => \`${label} · ↻ 동기화로 최신 정보를 받아요\`` | `(label) => \`${label} · ↻ Sync to get latest\`` |
| `detail.allday` | 하루 종일 | All day |
| `detail.field.start.date` | 시작일 | Start date |
| `detail.field.start.time` | 시작 시간 | Start time |
| `detail.field.deadline.date` | 마감일 | Due date |
| `detail.field.deadline.time` | 마감 시간 | Due time |
| `detail.field.with` | 누구랑 | With |
| `detail.field.location` | 어디서 | Location |
| `detail.field.linked` | 연결 할 일 | Linked task |
| `detail.field.reminder` | 알림 | Reminder |
| `detail.field.date` | 날짜 | Date |
| `detail.field.duration.task` | 예상 소요 | Est. time |
| `detail.field.duration.event` | 소요 시간 | Duration |
| `detail.field.allday` | 종일 | All day |
| `detail.placeholder.with` | 예: 이대표, 팀 | e.g. Alex, team |
| `detail.placeholder.location` | 예: 3층 회의실 | e.g. Conference room |
| `detail.placeholder.minutes` | 분 | min |
| `detail.placeholder.step` | 하위 작업 | Sub-task |
| `detail.date.label.startDate` | 시작일 | Start date |
| `detail.date.label.deadline` | 마감일 | Due date |
| `detail.date.label.remember-deadline` | 데드라인 | Deadline |
| `detail.date.label.date` | 날짜 | Date |

### 칩 / 블로커

| 키 | KO | EN |
|---|---|---|
| `blocker.note` | `(content) => \`'${content}' 먼저\`` | `(content) => \`'${content}' first\`` |
| `suggest.chip.tooltip` | `(label, hint) => \`${label} 추천${hint}\`` | `(label, hint) => \`${label} suggestion${hint}\`` |
| `suggest.chip.aria` | `(label) => \`${label} 추천 적용\`` | `(label) => \`Apply ${label} suggestion\`` |
| `deadline.until` | `(time) => \` · ⏰ ${time}까지\`` | `(time) => \` · ⏰ by ${time}\`` |
| `blocker.inbox.note` | `(content) => \`🔒 '${content}' 먼저\`` | `(content) => \`🔒 '${content}' first\`` |
| `related.inbox.note` | `(hint, evTime, due) => \`🔗 ${hint}${evTime} 전${due}\`` | `(hint, evTime, due) => \`🔗 ${hint}${evTime}${due}\`` |

### 칼 밴드 시트 (band.*)

| 키 | KO | EN | 비고 |
|---|---|---|---|
| `band.title` | 기간 추가 | Add time band | 신규 추가 모드 제목 |
| `band.title.edit` | 기간 수정 | Edit time band | 편집 모드 제목 |
| `band.save.btn` | 저장 | Save | 편집 모드 저장 버튼 |
| `band.name.placeholder` | 일정 이름 | Event name | |
| `band.start` | 시작 | Start | |
| `band.end` | 종료 | End | |
| `band.color` | 색상 | Color | |
| `band.icon` | 아이콘 | Icon | |

### Compose 시트 (compose.*)

| 키 | KO | EN |
|---|---|---|
| `compose.time.start` | 시작 시간 | Start time |
| `compose.time.deadline` | 마감 시간 | Due time |
| `compose.time.label` | 시간 | Time |
| `compose.time.none` | 시간 없음 | No time |
| `compose.date.start` | 시작일 | Start date |
| `compose.date.deadline` | 마감일 | Due date |
| `compose.date.event` | 날짜 | Date |
| `compose.date.select` | 날짜 선택 | Pick a date |
| `compose.date.none` | 날짜 없음 | No date |
| `compose.allday` | 종일 | All day |
| `compose.none` | 없음 | None |
| `compose.reminder` | 미리 알림 | Reminder |
| `compose.duration` | 예상 소요 시간 | Estimated duration |
| `compose.desc.show` | + 설명 | + Description |
| `compose.desc.hide` | 설명 숨기 | Hide description |
| `compose.with` | 이름 입력 | Enter name |
| `compose.location` | 장소 입력 | Enter location |
| `compose.project.none` | 없음 | None |
| `compose.expand` | 상세 ▼ | Details ▼ |
| `compose.collapse` | 간단히 ▲ | Less ▲ |
| `compose.placeholder.task` | 할 일을 입력하세요 | What needs to be done? |
| `compose.placeholder.event` | 일정 제목을 입력하세요 | Event title |
| `compose.task.placeholder` | 할 일을 입력하세요 | What needs doing? |
| `compose.event.placeholder` | 일정 제목을 입력하세요 | Event title |
| `compose.save` | 저장 | Save |
| `compose.add` | 추가 | Add |
| `compose.duration.label` | 예상 소요 시간 | Estimated duration |
| `compose.duration.suggest` | 💡 ADHD 여유 포함 추천 | 💡 ADHD-friendly estimate |
| `compose.duration.suggesting` | 💡 추정 중… | 💡 Estimating… |
| `compose.notes.show` | + 설명 | + Notes |
| `compose.notes.hide` | 설명 숨기 | Hide notes |
| `compose.pill.deadline` | 📅 마감 | 📅 Due |
| `compose.pill.start.date` | 📅 시작 | 📅 Start |
| `compose.pill.start.time` | ⏰ 시작 | ⏰ Start |
| `compose.pill.deadline.time` | ⏰ 마감 | ⏰ Due |
| `compose.pill.duration` | ⏱️ 소요 | ⏱️ Duration |
| `compose.pill.allday` | 🌅 종일 | 🌅 All day |
| `compose.exp.date` | 📅 날짜 | 📅 Date |
| `compose.exp.time` | ⏰ 시간 | ⏰ Time |
| `compose.exp.duration` | ⏱️ 소요 | ⏱️ Duration |
| `compose.with.placeholder` | 이름 입력 | Enter name |
| `compose.location.placeholder` | 장소 입력 | Enter location |
| `compose.exp.with` | 👥 누구랑 | 👥 With |
| `compose.exp.location` | 📍 어디서 | 📍 Location |
| `compose.exp.reminder` | 🔔 알림 | 🔔 Reminder |
| `compose.exp.priority` | 🎯 우선순위 | 🎯 Priority |
| `compose.exp.start.date` | 📅 시작일 | 📅 Start date |
| `compose.exp.start.time` | ⏰ 시작 시간 | ⏰ Start time |
| `compose.exp.deadline.date` | 📅 마감일 | 📅 Due date |
| `compose.exp.deadline.time` | ⏰ 마감 시간 | ⏰ Due time |
| `compose.exp.task.duration` | ⏱️ 소요시간 | ⏱️ Duration |
| `compose.toast.title.required` | 제목을 입력해주세요 | Please enter a title |
| `compose.toast.task.saved` | 할 일을 저장했어요 ✓ | Task saved ✓ |
| `compose.toast.task.added` | 할 일을 추가했어요 ✓ | Task added ✓ |
| `compose.toast.event.saved` | 일정을 저장했어요 ✓ | Event saved ✓ |
| `compose.toast.event.added` | 일정을 추가했어요 ✓ | Event added ✓ |
| `compose.toast.changed.event` | 일정으로 변경했어요 ✓ | Converted to event ✓ |
| `compose.toast.changed.task` | 할 일로 변경했어요 ✓ | Converted to task ✓ |
| `compose.new.event` | 새로운 이벤트 | New Event |

### 홈 / 렌더

| 키 | KO | EN |
|---|---|---|
| `home.greeting.night` | 늦은 밤이에요 | Late night |
| `home.greeting.morning` | 좋은 아침이에요 | Good morning |
| `home.greeting.afternoon` | 좋은 오후예요 | Good afternoon |
| `home.greeting.evening` | 좋은 저녁이에요 | Good evening |
| `home.empty.board` | 아직 우선순위 할 일이 없어요. | No priority tasks yet. |
| `home.empty.board.later` | 오늘 할 일이 없어요 — 다른 날짜는... | Nothing for today — check Could·Won't... |
| `home.empty.board.hint` | 브레인 덤프 탭에서 쏟아낸 뒤\nMoSCoW로 분류해 보세요 | Brain dump first, then\nsort with MoSCoW |
| `home.expand` | `(n) => \`더보기 ▾ (${n}개)\`` | `(n) => \`Show more ▾ (${n})\`` |
| `home.collapse` | 접기 ▴ | Collapse ▴ |

### 메모 UI

| 키 | KO | EN |
|---|---|---|
| `memo.deadline.none` | 마감 없음 | No deadline |
| `memo.done.label` | 완료 | Done |
| `memo.delete.label` | 삭제 | Delete |
| `memo.priority.up` | 우선순위 상승 | Priority up |
| `memo.priority.down` | 우선순위 하락 | Priority down |
| `memo.priority.same` | 우선순위 유지 | Priority unchanged |
| `memo.priority.new` | 새로 편성 | New priority |
| `memo.drag` | 끌어서 이동 | Drag to move |
| `memo.bucket.change` | 다른 버킷으로 변경 | Change bucket |
| `memo.bucket.change.label` | 변경 | Change |
| `memo.pin` | 고정 | Pin |

### 토스트 메시지 (toast.*)

| 키 | KO | EN |
|---|---|---|
| `toast.write.first` | 먼저 적어주세요 | Write something first |
| `toast.no.suggestions` | 추천할 항목이 없어요 | Nothing to suggest |
| `toast.no.unsorted` | 분류할 항목이 없어요 | Nothing to sort |
| `toast.priority.done` | 우선순위 정리 완료 ✓ | Priorities updated ✓ |
| `toast.priority.refreshed` | 우선순위를 새로 정렬했어요 ↻ | Priorities reordered ↻ |
| `toast.notify.set` | 알림이 설정됐어요 | Notifications enabled |
| `toast.notify.unsupported` | 이 환경에서는 알림이 지원되지 않아요 | Notifications are not supported... |
| `toast.location.connected` | `(city) => \`${city} 위치 연결됐어요\`` | `(city) => \`Connected to ${city}\`` |
| `toast.location.connected.default` | 위치 연결됐어요 | Location connected |
| `toast.location.permission` | 위치 권한이 필요해요... | Location permission required... |
| `toast.google.incognito` | 시크릿 모드에서는 Google 연결이 지원되지 않아요 | Google sign-in is not supported in Incognito mode |
| `toast.google.cancel` | 로그인이 취소됐어요 | Sign-in cancelled |
| `toast.google.unsupported` | 이 환경에서는 Google 연결이 지원되지 않아요 | Google sign-in is not supported... |
| `toast.cal.connect.first` | 설정에서 Google Calendar를 먼저 연결해주세요 | Connect Google Calendar in Settings first |
| `toast.cal.syncing` | 캘린더 동기화 중… | Syncing calendar… |
| `toast.cal.synced` | 캘린더를 업데이트했어요 ✓ | Calendar updated ✓ |
| `toast.cal.sync.failed` | 동기화 실패 — 다시 시도해주세요 | Sync failed — please try again |
| `toast.compose.title.required` | 제목을 입력해주세요 | Please enter a title |
| `toast.compose.saved.task` | 할 일을 저장했어요 ✓ | Task saved ✓ |
| `toast.compose.added.task` | 할 일을 추가했어요 ✓ | Task added ✓ |
| `toast.compose.saved.event` | 일정을 저장했어요 ✓ | Event saved ✓ |
| `toast.compose.added.event` | 일정을 추가했어요 ✓ | Event added ✓ |
| `toast.compose.to.event` | 일정으로 변경했어요 ✓ | Converted to event ✓ |
| `toast.compose.to.task` | 할 일로 변경했어요 ✓ | Converted to task ✓ |
| `toast.no.content` | 정리할 내용이 없어요 | Nothing to organize |
| `toast.ai.no.key` | AI API 키가 필요해요 | AI API key required |
| `toast.ai.splitting` | AI가 작업을 쪼개고 있어요… | AI is breaking it down… |
| `toast.ai.split.done` | 하위 작업을 추가했어요 ✨ | Sub-tasks added ✨ |
| `toast.ai.split.fail` | AI 쪼개기 실패 | AI breakdown failed |
| `toast.import.success` | 데이터를 가져왔어요 | Data imported |
| `toast.import.invalid` | 올바른 파일이 아니에요 | Invalid file format |
| `toast.import.fail` | 파일 읽기 실패 | File read failed |
| `toast.ponder.to.inbox` | 할 일로 옮겼어요 → Inbox | Moved to Inbox as task |
| `toast.deleted` | 삭제했어요 | Deleted |
| `toast.proj.deleted` | 프로젝트를 삭제했어요 | Project deleted |
| `toast.inbox.applied` | `(n) => \`${n}개를 추천대로 분류했어요 ✓\`` | `(n) => \`${n} item${n===1?'':'s'} classified as suggested ✓\`` |

### 실행취소 (undo.*)

| 키 | KO | EN |
|---|---|---|
| `undo.action` | 실행취소 | Undo |
| `undo.empty` | 되돌릴 항목이 없어요 | Nothing to undo |
| `undo.done` | 되돌렸어요 | Undone |

### 분류 결과

| 키 | KO | EN |
|---|---|---|
| `classify.feeling` | 감정으로 읽어 '오늘의 마음'에 담았어요 | Logged as a feeling in "Today's mood" |
| `classify.ponder` | 고민으로 읽어 '생각 중'에 담았어요 | Logged as a thought in "Things to consider" |

### 확인 다이얼로그

| 키 | KO | EN |
|---|---|---|
| `confirm.event.delete.message` | 일정을 삭제할까요? | Delete this event? |
| `confirm.event.delete.detail` | 삭제하면 Google Calendar에도 반영됩니다. | This will also remove it from Google Calendar. |
| `confirm.delete` | 삭제 | Delete |

### AI 통계

| 키 | KO | EN |
|---|---|---|
| `stats.decisions.empty` | 아직 판단 기록이 없어요... | No decisions yet... |
| `stats.dictionary.empty` | 아직 등록된 단어가 없어요. | No words registered yet. |
| `stats.accepted` | 그대로 수락 | Accepted as-is |
| `stats.modified` | 바꿔서 수락 | Accepted with changes |
| `stats.rejected` | 거절 | Rejected |
| `stats.deleted` | 삭제 | Deleted |
| `stats.deferred` | 보류 | Deferred |
| `stats.most.changed` | 가장 많이 바꾼 등급 | Most changed bucket |
| `stats.rationale.effect` | 근거를 봤을 때 vs 안 봤을 때 수락률 | Acceptance rate: with vs. without rationale |
| `stats.feature.moscow` | MoSCoW 우선순위 | MoSCoW priorities |
| `stats.feature.split` | 하위 작업 쪼개기 | Sub-task breakdown |
| `stats.feature.dump` | 브레인덤프 추출 | Brain dump extraction |
| `stats.hero.moscow` | 제안 그대로 수락 | Accepted as suggested |
| `stats.hero.split` | 쪼갠 그대로 사용 | Used breakdown as-is |
| `stats.hero.dump` | 읽은 그대로 사용 | Used extraction as-is |

### AI 모델 라벨

| 키 | KO | EN |
|---|---|---|
| `model.haiku.label` | Claude Haiku 4.5 (추천) | Claude Haiku 4.5 (Recommended) |
| `model.haiku.hint` | 브레인덤프 1회 약 $0.001... | ~$0.001 per dump... |
| `model.sonnet.label` | Claude Sonnet 4.6 | Claude Sonnet 4.6 |
| `model.sonnet.hint` | 브레인덤프 1회 약 $0.01... | ~$0.01 per dump... |
| `model.gpt4omini.label` | GPT-4o mini (추천) | GPT-4o mini (Recommended) |
| `model.gpt4omini.hint` | 브레인덤프 1회 약 $0.001... | ~$0.001 per dump... |
| `model.gpt4o.label` | GPT-4o | GPT-4o |
| `model.gpt4o.hint` | 브레인덤프 1회 약 $0.02... | ~$0.02 per dump... |
| `model.flash.label` | Gemini 2.0 Flash (추천) | Gemini 2.0 Flash (Recommended) |
| `model.flash.hint` | 브레인덤프 1회 약 $0.001... | ~$0.001 per dump... |
| `model.pro.label` | Gemini 1.5 Pro | Gemini 1.5 Pro |
| `model.pro.hint` | 브레인덤프 1회 약 $0.01... | ~$0.01 per dump... |

### 버킷 서브라벨

| 키 | KO | EN |
|---|---|---|
| `bucket.must.sub` | 오늘 꼭 | Today |
| `bucket.should.sub` | 하면 좋음 | Good to do |
| `bucket.could.sub` | 여유 되면 | If time allows |
| `bucket.wont.sub` | 오늘은 안 함 | Skip today |

### 날짜 라벨

| 키 | KO | EN |
|---|---|---|
| `date.none` | 없음 | None |
| `date.today` | 오늘 | Today |
| `date.tomorrow` | 내일 | Tomorrow |
| `date.preset.weekend` | 이번 주말 | This weekend |
| `date.preset.nextweek` | 다음 주 | Next week |
| `date.clear` | 마감일 없음 | No deadline |

### 알림 / 소요 시간

| 키 | KO | EN | 비고 |
|---|---|---|---|
| `remind.none` | 알림 없음 | No reminder | |
| `remind.atstart` | 시작 시간에 | At start time | |
| `remind.before` | `(n) => \`${n}분 전\`` | `(n) => \`${n}m before\`` | n = 분 수 |
| `duration.none` | 없음 | None | |
| `duration.min` | `(m) => \`${m}분\`` | `(m) => \`${m}m\`` | |
| `duration.hour` | `(h) => \`${h}시간\`` | `(h) => \`${h}h\`` | |
| `duration.hourmin` | `(h, m) => \`${h}시간 ${m}분\`` | `(h, m) => \`${h}h ${m}m\`` | |

### UI 액션 라벨

| 키 | KO | EN |
|---|---|---|
| `ui.add.task` | 할 일 추가 | Add Task |
| `ui.add.event` | 일정 추가 | Add Event |

### 캘린더 (cal.*)

| 키 | KO | EN | 비고 |
|---|---|---|---|
| `cal.title` | 캘린더 | Calendar | 페이지 제목 |
| `cal.day.title` | 일별 일정 | Daily Schedule | 일별 드로어 제목 |
| `cal.empty` | 날짜를 탭하면... | Tap a date to see... | 캘린더 빈 상태 |
| `cal.hint.connected` | 탭하면 동기화... | Tap to sync... | |
| `cal.hint.disconnected` | 탭하면 연결... | Tap to connect... | |
| `cal.today.pill` | 오늘 | Today | 오늘 이동 버튼 |
| `cal.sync.done` | 캘린더 동기화 완료 ✓ | Calendar synced ✓ | |
| `cal.sync.fail` | 동기화 실패 | Sync failed | |
| `cal.timeline` | 타임라인 | Timeline | |
| `cal.month` | `(y, m) => \`${y}년 ${m}월\`` | `(y, m) => \`${MONTHS[m-1]} ${y}\`` | ⚠️ 월 이름 배열 필요 |
| `cal.weekdays` | `['일','월','화','수','목','금','토']` | `['Sun','Mon','Tue','Wed','Thu','Fri','Sat']` | ⚠️ 배열 7개 고정 순서: 일~토 |
| `cal.allday` | 종일 | All day | |
| `cal.kind.event` | 일정 | Event | 칩 태그 |
| `cal.kind.task` | 할 일 | Task | 칩 태그 |
| `cal.kind.band` | 기간 | Period | 칩 태그 |
| `cal.band.sub` | `(nth, total) => \`기간 · ${nth}일째 / ${total}일\`` | `(nth, total) => \`Period · Day ${nth} of ${total}\`` | |
| `cal.band.new` | 새 일정 | New event | 기간 띠 기본 제목 |
| `cal.band.deleted` | 기간 일정을 삭제했어요 | Time band deleted | |
| `cal.band.added` | 기간을 추가했어요 ✓ | Time band added ✓ | |
| `cal.day.empty` | 이 날짜에 배정된 일정·할 일이 없어요 | No events or tasks for this date | |
| `cal.day.add` | ＋ 이 날에 일정 추가 | ＋ Add event for this day | |
| `cal.select.title` | 동기화할 캘린더 | Sync Calendars | 모달 제목 |
| `cal.select.hint` | 체크한 캘린더를 덤플리에서... | Check calendars to show in Dumply... | 모달 설명 |
| `cal.select.confirm` | 확인 | Confirm | 모달 확인 버튼 |
| `cal.day.add.aria` | 일정 추가 | Add event | aria-label |
| `cal.day.drag.hint` | 빈 시간대를 드래그하면... | Drag an empty time slot... | |

### 프로젝트 (projects.* / proj.*)

| 키 | KO | EN |
|---|---|---|
| `projects.title` | 프로젝트 | Projects |
| `projects.new` | 새 프로젝트 | New Project |
| `projects.empty` | 프로젝트가 없어요 | No projects yet |
| `projects.empty.hint` | 새 프로젝트를 만들거나... | Create a new project or... |
| `projects.archive` | 아카이브 | Archive |
| `projects.archive.sub` | 프로젝트 미분류 할 일 | Unclassified tasks |
| `projects.period` | 기간 설정 (선택) | Set period (optional) |
| `projects.cancel` | 취소 | Cancel |
| `projects.edit` | 수정 | Edit |
| `projects.delete` | 삭제 | Delete |
| `projects.today.marker` | ● 오늘 | ● Today |
| `projects.start` | `(d) => \`${d} 시작\`` | `(d) => \`Start: ${d}\`` |
| `projects.end` | `(d) => \`${d} 마감\`` | `(d) => \`Due: ${d}\`` |
| `projects.no.deadline` | 기간 없음 | No deadline |
| `projects.new.task` | + 할 일 추가 | + Add task |
| `projects.new.event` | + 일정 추가 | + Add event |
| `projects.tasks.label` | 태스크 · 덤플리 우선순위 순 | Tasks · by Dumply priority |
| `projects.events.label` | 일정 | Events |
| `projects.tasks.meta` | `(done, total, dLeft) => \`${done}/${total} 태스크 · ${dLeft!=null?...}\`` | `(done, total, dLeft) => \`${done}/${total} tasks · ${dLeft!=null?...}\`` |
| `projects.unclassified.hint` | 프로젝트에 넣지 않은 할 일이 여기 모여요... | Tasks not in any project appear here... |
| `projects.detail.back` | ← 프로젝트 | ← Projects |
| `projects.progress` | 전체 진행률 | Overall progress |
| `projects.no.period` | 기간 없음 | No deadline |
| `projects.import.title` | 불러오기 | Import |
| `projects.import.archive.title` | 프로젝트에서 가져오기 | Import from Project |
| `projects.import.tasks` | 할 일 | Tasks |
| `projects.import.events` | 일정 | Events |
| `projects.import.tasks.empty` | 불러올 할 일이 없어요 | No tasks to import |
| `projects.import.events.empty` | 불러올 일정이 없어요 | No events to import |
| `projects.status.active` | 진행 중 | In Progress |
| `projects.status.pending` | 아직 시작 전 | Not started |
| `projects.status.done` | 완료 | Done |
| `proj.status.active` | 진행중 | Active |
| `proj.status.waiting` | 대기 | Waiting |
| `proj.status.done` | 완료 | Done |
| `proj.area.work` | 워크 | Work |
| `proj.area.life` | 라이프 | Life |
| `proj.importance.high` | 높음 | High |
| `proj.importance.medium` | 보통 | Medium |
| `proj.importance.low` | 낮음 | Low |
| `proj.form.status` | 상태 | Status |
| `proj.form.area` | 구분 | Area |
| `proj.form.importance` | 중요도 | Importance |
| `proj.form.name.placeholder` | 프로젝트 이름 | Project name |
| `proj.form.create` | 만들기 | Create |
| `proj.form.new.title` | 새 프로젝트 | New Project |
| `proj.task.empty` | 아직 태스크가 없어요 | No tasks yet |
| `proj.task.done.empty` | 완료된 태스크가 없어요 | No completed tasks |
| `proj.task.import.btn` | 불러오기 | Import |
| `proj.event.empty` | 아직 일정이 없어요 | No events yet |

---

## 특수 처리가 필요한 키

### ⚠️ `cal.month` — 월 포맷
언어별로 연도/월 순서가 다를 수 있다.

```js
// KO: 2026년 6월
'cal.month': (y, m) => `${y}년 ${m}월`,

// EN: Jun 2026 (약어 + 연도)
'cal.month': (y, m) => `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]} ${y}`,

// JA 예시: 2026年6月
'cal.month': (y, m) => `${y}年${m}月`,
```

### ⚠️ `cal.weekdays` — 요일 배열
반드시 7개 요소, **일요일~토요일 순서** 고정.

```js
// KO
'cal.weekdays': ['일', '월', '화', '수', '목', '금', '토'],

// EN
'cal.weekdays': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

// JA 예시
'cal.weekdays': ['日', '月', '火', '水', '木', '金', '土'],
```

### ⚠️ 복수형 처리
영어의 복수형 패턴이 필요한 함수들:

```js
// EN — 복수형 분기 예시
'inbox.dup': (n) => `Skipped ${n} duplicate${n === 1 ? '' : 's'}`,
'toast.inbox.applied': (n) => `${n} item${n === 1 ? '' : 's'} classified as suggested ✓`,
'settings.cal.status.email': (email, n) => `${email} · ${n} calendar${n === 1 ? '' : 's'} synced`,

// KO — 복수형 없음
'inbox.dup': (n) => `이미 있는 ${n}개라 건너뛰었어요`,
```

일본어, 중국어 등 복수형이 없는 언어는 KO 패턴을 참고.

### ⚠️ `<input type="time">` / `<input type="date">` 로케일
브라우저 네이티브 컨트롤은 `document.documentElement.lang` 을 자동으로 읽는다.  
`popup.js`와 `app/handlers.js`에서 이미 처리되어 있으므로 추가 작업 불필요.

---

## `data-i18n` 속성 방식 (HTML 정적 콘텐츠)

`applyI18n(root)` 함수가 `[data-i18n]` 속성을 스캔하여 `textContent`를 갱신한다.  
언어 전환 시 자동으로 적용된다.

```html
<!-- 적용 예시 -->
<h2 data-i18n="cal.select.title">동기화할 캘린더</h2>
<p data-i18n="cal.select.hint">체크한 캘린더를...</p>
<button data-i18n="cal.select.confirm">확인</button>
```

**주의**: `<b>`, `<span>` 등 자식 엘리먼트가 있는 요소에 `data-i18n`을 사용하면  
첫 번째 텍스트 노드만 교체되거나 자식이 사라진다.  
→ 자식 엘리먼트는 제거하고 plain text로 처리할 것.

---

## 파일 수정 이력 — KO→EN 작업에서 변경된 코드 패턴

새 언어 추가 시 동일 패턴을 적용할 필요 없이 `t()` 호출만 추가하면 된다.  
아래는 KO 하드코딩을 `t()` 로 교체한 파일 목록 (참고용):

| 파일 | 주요 변경 |
|---|---|
| `lib/i18n.js` | EN 섹션 전체 추가 (500+ 키) |
| `app/core.js` | `toastUndo` 함수 — undo 관련 3개 문자열, BUCKETS sub getter, UI labels, date/remind/duration formatters |
| `app/compose.js` | Duration 프리셋 렌더, remind 옵션 렌더 |
| `app/calendar-view.js` | monthLabel, weekdays 배열, 기간 띠 제목/토스트/서브라벨, 종일, 빈 상태 문구, 캘린더 그리드 |
| `app/projects.js` | PROJECT_STATUS/AREA/IMPORTANCE getter, options 함수, form 기본값, empty state, 모든 토스트 |
| `app/timeline-block.js` | 삭제 toastUndo, 새 이벤트 기본 제목 |
| `app/handlers.js` | `document.documentElement.lang` 설정, cal-select-list View/Write 버튼 |
| `app/detail.js` | 각종 필드 라벨, toast 메시지 |
| `app/render.js` | 딕셔너리 추가 토스트 |
| `app/ui.js` | 버킷 sub, UI 라벨 버튼 |
| `popup.js` | `document.documentElement.lang` 부트 설정 |
| `sidepanel.html` | `data-i18n` 속성 추가 (moscow.guide `<b>` 제거 포함) |
