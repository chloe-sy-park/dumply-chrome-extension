# Chrome Web Store — English listing (detailed description)

> Paste into Developer Dashboard → Store listing → language: English → Description.
> Korean listing stays as-is in its own language tab.

---

Don't organize your tasks and schedule — just write them down. ✍️
Dumply is a smart planner that turns whatever's on your mind into a clear MoSCoW priority list.

✨ The Dumply Chrome extension is free.
Instead of charging a monthly subscription, Dumply is designed so you connect your own API key from the AI model you already use (ChatGPT, Claude, or Gemini) and use Dumply without limits.

🙋🏻‍♀️ What does "connecting an API key" mean?

Simply put, you get an "AI pass (🔑)" issued in your own name from an AI provider (OpenAI, etc.) and plug it into Dumply. You only ever pay your own AI provider for exactly what you use.

🤔 Is my data safe with Dumply?
Don't worry! Your API key is never sent to Dumply's servers. It is stored securely and encrypted only inside your own browser (chrome.storage) on your computer.


[Privacy]

1. Single purpose
Dumply is a productivity extension that manages your tasks and schedule in a single side panel. Type freely and it automatically sorts your priorities using the MoSCoW method, and with Google Calendar integration you can see everything you need to do today at a glance.

2. Why each permission is requested
(storage) Used to store tasks, projects, settings (theme, AI provider, notification preferences, etc.) and cached calendar data locally in your browser. This data is never sent to external servers.
(notifications) Used to send browser notifications at the start time of the schedules and tasks you set. You can turn notifications off anytime in settings.
(alarms) Used to deliver task reminders precisely at their scheduled time and to auto-sync Google Calendar every 30 minutes.
(identity) Used to perform OAuth authentication with your Google account only when you choose to connect Google Calendar. If you don't connect it, this permission is never used.
(sidePanel) Used to display the extension's main UI in the Chrome side panel.

(Host permission justification)
The extension accesses external APIs for the following purposes:
- api.anthropic.com, api.openai.com, generativelanguage.googleapis.com: Used to provide automatic task classification and summarization through the AI service you choose (Claude, ChatGPT, Gemini).
- www.googleapis.com: Used to read and sync your events via the Google Calendar API.
- api.open-meteo.com, geocoding-api.open-meteo.com: Used to show weather based on your current location. Location data is sent only for weather lookups.

---

# Screenshot captions (English)

> Chrome Web Store shows up to 5 screenshots (1280×800 or 640×400). Captions are baked into the image by the designer.
> Each entry: EN headline (big overlay) + EN subcaption (smaller) + [KO reference] for pairing.

1. Dump screen
   - Headline: Don't organize. Just dump.
   - Sub: Pour out tasks, plans, and feelings as they come — Dumply sorts the rest.
   - [KO] 정리하지 말고, 그냥 쏟아내세요

2. Auto-classification / inbox
   - Headline: From brain dump to clear priorities
   - Sub: Enter to dump → review suggestions → auto-sorted into MoSCoW buckets.
   - [KO] Enter로 덤프 → 추천 확인 → 버킷 탭 → MoSCoW에 반영

3. Start screen
   - Headline: Simply organize with Dumply
   - Sub: No sign-up, no subscription. Start as a guest in one click.
   - [KO] 회원가입도, 결제도 없이 바로 시작

4. Today dashboard
   - Headline: See today at a glance
   - Sub: Deadlines, priorities, and your schedule in one side panel.
   - [KO] 오늘 할 일과 일정을 한눈에

5. Free / bring-your-own AI key
   - Headline: Free — bring your own AI key
   - Sub: Connect ChatGPT, Claude, or Gemini. You only pay for what you use.
   - [KO] 무료 — 내 AI 키를 연결해서 제한 없이

Optional extras (if you have more screens):

6. Google Calendar sync
   - Headline: Synced with Google Calendar
   - Sub: Your events and tasks together, auto-synced every 30 minutes.
   - [KO] Google 캘린더와 자동 동기화

7. Feelings & ponders
   - Headline: Tasks get prioritized. Feelings just stay.
   - Sub: No pressure on what you haven't decided yet.
   - [KO] 할 일만 우선순위로, 감정과 고민은 부담 없이 곁에
