# Dumply — OAuth Verification Demo Video Script

Google OAuth 데이터 액세스(민감 범위) 인증 제출용 데모 동영상 스크립트.
검토 대상 민감 범위는 **`.../auth/calendar.events`** 하나입니다.

---

## 녹화 전 체크리스트

- [ ] 화면 녹화 도구 준비 (Mac: QuickTime / 화면기록, Win: Xbox Game Bar, 또는 Loom)
- [ ] 테스트용 Google 계정 로그인 (캘린더에 일정 1~2개 있으면 좋음)
- [ ] Chrome에 Dumply 설치된 상태, 기존 연결은 해제(로그아웃)해서 **OAuth 동의 화면이 처음부터 뜨도록**
- [ ] 영상은 **영어 내레이션 또는 영어 자막** 권장 (검토팀이 봄)
- [ ] 화질: 1080p, 길이 1~3분, 마우스 동선 천천히
- [ ] YouTube에 **공개(Public) 또는 일부공개(Unlisted)** 로 업로드 → 링크 제출

> 핵심: OAuth 동의 화면에서 **앱 이름 "Dumply"** 와 **요청 범위 문구**가 화면에 또렷이 보여야 합니다. 그 부분은 잠깐 멈춰서 확대해 주세요.

---

## 장면별 스크립트

### Scene 1 — 앱 소개 (0:00–0:15)
**화면:** Chrome 툴바의 Dumply 아이콘 클릭 → 사이드 패널 열림 (온보딩 "Simply organize with Dumply" 화면)
**내레이션(EN):**
> "This is Dumply, a Chrome extension that turns your brain-dump notes into prioritized tasks and shows them next to your Google Calendar."

### Scene 2 — 로그인 시작 (0:15–0:25)
**화면:** "Start with Google" (구글 메일로 시작하기) 버튼 클릭
**내레이션(EN):**
> "To sync the user's calendar, the user signs in with Google."

### Scene 3 — OAuth 동의 화면 ⭐가장 중요 (0:25–0:45)
**화면:** Google 동의 화면이 뜨면 **천천히 멈추고**, 다음이 보이도록 확대:
- 앱 이름 **Dumply**
- 권한 문구: **"See, edit, share, and permanently delete all the calendars you can access using Google Calendar"** (= `calendar.events`)
- (있다면) 계정 선택 화면도 잠깐
**내레이션(EN):**
> "Here is the OAuth consent screen for Dumply. The app requests the calendar.events scope, which is used to read the user's events and to create or update events the user adds in Dumply."
**동작:** Allow(허용) 클릭

### Scene 4 — 범위 사용 ① 일정 읽기 (0:45–1:05)
**화면:** 로그인 후 대시보드에 **오늘 구글 캘린더 일정이 표시되는 모습**. (캘린더 선택 시트가 뜨면 캘린더 하나 선택 → 일정이 타임라인에 들어오는 것 보여주기)
**내레이션(EN):**
> "After consent, Dumply reads today's events from the selected Google Calendar and shows them on the dashboard. This is the read use of calendar.events."

### Scene 5 — 범위 사용 ② 일정 생성/수정 (1:05–1:35)
**화면:**
1. 브레인 덤프에 할 일 입력 → 할 일 카드 생성
2. 그 할 일을 캘린더에 등록(또는 일정 시간 수정) 하는 동작
3. **새 탭에서 Google Calendar(calendar.google.com)** 를 열어 방금 만든 일정이 실제로 추가된 것 보여주기
**내레이션(EN):**
> "The user can also turn a task into a calendar event. Dumply writes it to Google Calendar using the same calendar.events scope — here it is, now visible in Google Calendar."

### Scene 6 — 데이터 처리 안내 (1:35–1:50)
**화면:** 설정 화면 또는 개인정보처리방침 페이지(`https://dumply.app/privacy`) 잠깐
**내레이션(EN):**
> "All data is stored locally in the browser. Calendar data is only used to display and manage the user's schedule, is never sold, and is never used for advertising. Dumply complies with the Google API Services User Data Policy, including the Limited Use requirements."

### Scene 7 — 마무리 (1:50–2:00)
**화면:** 대시보드 전체 모습
**내레이션(EN):**
> "That's how Dumply uses the calendar.events scope. Thank you for reviewing."

---

## 제출 시 함께 넣을 텍스트 (참고)

**Scope justification — calendar.events:**
> Dumply reads the user's Google Calendar events to display today's schedule on its dashboard alongside the user's prioritized tasks, and creates/updates events when the user turns a task into a calendar entry. The calendar.events scope is required for both reading and writing events. All data is processed locally in the user's browser and is never stored on our servers, sold, or used for advertising.

---

## 자주 막히는 부분

- **동의 화면이 안 뜨고 바로 로그인됨** → 기존 토큰 캐시 때문. 설정에서 Google 연결 해제 후, 또는 https://myaccount.google.com/permissions 에서 Dumply 액세스 제거 후 다시 녹화.
- **범위 문구가 영상에 안 보임** → 검토 반려 사유 1순위. 동의 화면에서 반드시 멈춰서 확대.
- **앱 이름이 동의 화면에 안 보임** → 브랜딩(앱 이름/로고)이 게시됐는지 확인.
