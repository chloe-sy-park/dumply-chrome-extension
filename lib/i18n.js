/* 국제화 — 언어 감지 · 번역 딕셔너리 · t() 함수 */

'use strict';

const AlfredoI18n = (() => {
  const STRINGS = {
    ko: {
      // 온보딩
      'ob.welcome.google': '구글 메일로 시작하기',
      'ob.welcome.guest': '게스트로 시작하기',
      'ob.welcome.connecting': '연결 중…',
      'ob.nickname.title': '덤플리에 오신 걸 환영해요',
      'ob.nickname.desc': '어떻게 불러드릴까요?',
      'ob.nickname.label': '닉네임',
      'ob.nickname.placeholder': '예: 소영',
      'ob.nickname.required': '닉네임을 입력해주세요',
      'ob.calendar.title': '연결할수록 똑똑하게 정리해요',
      'ob.calendar.desc': '자동으로 할 일/일정을 불러올게요',
      'ob.calendar.google': 'Google Calendar',
      'ob.calendar.google.sub': '사용 중인 캘린더를 동기화해요',
      'ob.calendar.email.sub': '중요한 메일을 놓치지 않게 챙겨요',
      'ob.calendar.slack.sub': '대화의 맥락을 챙겨요',
      'ob.calendar.hint': 'Google 계정으로 로그인하면 연결됩니다. 별도 클라이언트 ID 입력은 필요 없어요.',
      'ob.calendar.selected': (n) => `캘린더 선택 (${n}개 선택됨)`,
      'ob.api.title': 'API 연결',
      'ob.api.desc': '덤플리 AI 정리에 쓸 API 키예요 (선택)',
      'ob.api.provider': 'AI 제공자',
      'ob.api.key.anthropic': 'Anthropic API 키',
      'ob.api.key.openai': 'OpenAI API 키',
      'ob.api.key.google': 'Google API 키 (Gemini)',
      'ob.api.hint.anthropic': 'console.anthropic.com/settings/keys 에서 발급',
      'ob.api.hint.openai': 'platform.openai.com/api-keys 에서 발급',
      'ob.api.hint.google': 'aistudio.google.com/apikey 에서 발급',
      'ob.api.hint.link': '키 발급하기',
      'ob.api.notice': 'Claude Pro / ChatGPT Plus / Gemini Advanced 구독은 확장에서 공식 연동되지 않아요. AI 정리 기능은 각 서비스 API 키(BYOK)가 필요합니다.',
      'ob.api.disclosure': 'AI 기능 사용 시 입력한 텍스트가 선택한 AI 서비스(Anthropic · OpenAI · Google)의 서버로 전송돼요. 덤플리 서버를 거치지 않으며, 전송 여부는 API 키 입력 여부에 따라 결정돼요.',
      'ob.location.title': '날씨 불러오기',
      'ob.location.desc': '위치를 허용하면 오늘 날씨를 자동으로 가져와요.',
      'ob.location.sub': '좌표는 이 기기에만 저장돼요.',
      'ob.location.btn': '위치 허용하기',
      'ob.notify.title': '브라우저 알림 허용',
      'ob.notify.desc': '약속 10분 전에 덤플리가 알려드릴게요.',
      'ob.notify.btn': '알림 허용하기',
      'ob.notify.done': '알림 허용됨',
      'ob.next': '다음',
      'ob.start': '시작하기',
      'ob.skip': '건너뛰기',
      'ob.learn.meta': (pct) => `${pct}% 학습됨 — 연결할수록 똑똑하게 정리해요`,

      // 설정
      'settings.title': '설정',
      'settings.pin': '패널 고정',
      'settings.unpin': '패널 고정 해제',
      'settings.pin.toast': '패널 고정 표시 📌',
      'settings.unpin.toast': '패널 고정 해제',
      'settings.pin.error': '패널을 닫을 수 없어요',
      'settings.language': '언어',
      'settings.language.auto': '자동 (브라우저 설정)',
      'settings.weather.city': '날씨 도시',
      'settings.weather.default': '서울',
      'settings.location.connected': (city) => `${city || '현재 위치'} · GPS 좌표 저장됨`,
      'settings.location.desc': '위치를 허용하면 헤더에 날씨가 표시돼요',
      'settings.location.btn': '위치 허용하기',
      'settings.location.refresh': '위치 다시 불러오기',
      'settings.calendar.login': '로그인하면 캘린더 일정을 가져와요',
      'settings.cal.select': '캘린더 선택',
      'settings.cal.view': '보기',
      'settings.cal.write': '쓰기',
      'settings.save.toast': '저장됐어요 ✓',
      'settings.reset.confirm': '모든 데이터를 삭제할까요?\n\n할 일, 프로젝트, Google·위치 연동, API 키 설정이 초기화되고 온보딩 화면으로 돌아갑니다.',
      'settings.reset.toast': '데이터를 초기화했어요',
      'settings.weather.not.found': '날씨 도시를 찾지 못했어요',
      'settings.api.storage.notice': 'API 키는 이 기기의 로컬 저장소에 암호화 없이 저장돼요.',
      'settings.name': '이름',
      'settings.name.placeholder': '닉네임',
      'settings.theme': '테마',
      'settings.theme.hint': 'System은 라이트=Ash · 다크=Midnight로 자동 전환돼요',
      'settings.weather.hint': 'GPS 또는 도시 이름으로 날씨를 가져와요',
      'settings.weather.placeholder': '예: 서울',
      'settings.location': '위치 · 날씨',
      'settings.api.notice': '💡 Claude Pro / ChatGPT Plus / Gemini Advanced 구독은 확장에서 공식 연동되지 않아요. AI 기능은 API 키(BYOK)가 필요합니다.',
      'settings.ai.provider': 'AI 제공자',
      'settings.ai.model': '모델',
      'settings.api.anthropic': 'Anthropic API 키',
      'settings.api.openai': 'OpenAI API 키',
      'settings.api.google.label': 'Google API 키 (Gemini)',
      'settings.google.label': 'Google 계정 · 캘린더',
      'settings.google.connect': 'Google로 로그인 · 캘린더 연동',
      'settings.google.disconnect': '연결 해제',
      'settings.cal.sync': '동기화 캘린더',
      'settings.cal.sync.both': '양방향 동기화',
      'settings.cal.sync.read': '읽기만',
      'settings.cal.sync.write': '쓰기만',
      'settings.dictionary.label': '내 단어장',
      'settings.dictionary.hint': '덤프에서 직접 등록한 고유명사예요. 탭하면 삭제돼요.',
      'settings.decisions.label': 'AI 판단 기록',
      'settings.decisions.hint': '덤플리의 우선순위 제안을 그대로 썼는지, 바꿨는지 모아 봤어요.',
      'settings.backup.label': '데이터 백업',
      'settings.backup.hint': '데이터는 이 기기의 브라우저에만 저장돼요. 기기를 바꾸거나 Chrome을 재설치할 경우 백업 파일로 복원할 수 있어요. API 키는 보안상 파일에 포함되지 않아요.',
      'settings.backup.export': '내보내기',
      'settings.backup.import': '가져오기',
      'settings.reset.label': '데이터 초기화',
      'settings.reset.hint': '모든 할 일·프로젝트·연동 설정을 삭제하고 처음부터 시작해요.',
      'settings.reset.btn': '데이터 초기화하기',
      'settings.save': '저장',

      // 네비게이션
      'nav.home': '메인',
      'nav.calendar': '캘린더',
      'nav.projects': '프로젝트',
      'nav.toggle.collapse': '메뉴 접기',
      'nav.toggle.expand': '메뉴 펼치기',

      // 탭
      'dump.tab': '브레인 덤프',
      'dashboard.tab': '대시보드',

      // 덤프 카드
      'dump.card.hint': '정리하지 말고, 그냥 쏟아내세요',
      'dump.example.btn': '↻ 예시',
      'dump.input.hint': 'Enter로 정리 · Shift+Enter로 줄바꿈',
      'dump.input.placeholder': '엄마 오후 3시 생일 선물 구매. 이대표랑 미팅 앱 런칭 관련...',

      // Inbox
      'inbox.ai.title': 'AI가 하나씩 질문하며 분류해요',
      'inbox.ai.label': 'AI 문답',
      'inbox.flow.hint': 'Enter로 덤프 → 추천 확인 → 버킷 탭 → MoSCoW에 반영',
      'inbox.classify.btn': '추천대로 분류',
      'inbox.classify.btn.count': (n) => `↓ 추천대로 분류 (${n})`,
      'inbox.mood.low': '😮‍💨 오늘 컨디션이 좀 낮아 보여요 — Must는 1~2개만 골라볼까요?',
      'inbox.mood.rest': '😮‍💨 오늘은 무리하지 말고 천천히 가요.',

      // MoSCoW
      'moscow.title': 'MoSCoW 분류',
      'moscow.guide': 'Must는 3개 이하 · 드래그로 순서·버킷 변경',
      'moscow.empty': '— 비어 있음',
      'moscow.compose.must.hint': 'Must는 3개 이하를 권장해요',

      // 생각 중 / 오늘의 마음
      'ponder.title': '생각 중',
      'ponder.hint': '아직 결정 전 — 마음 정해지면 할 일로 옮겨요',
      'feeling.title': '오늘의 마음',
      'feeling.hint': '할 일 아닌 감정은 여기 — 오늘 컨디션에 반영돼요',

      // 대시보드
      'dashboard.priority.title': '오늘의 우선순위',
      'dashboard.remember.title': '잊지 말 것',
      'dashboard.timeline.title': '오늘 타임라인',
      'dashboard.timeline.sync': '동기화',
      'dashboard.timeline.sync.title': 'Google Calendar 동기화',
      'dashboard.timeline.add.title': '일정 추가',
      'dashboard.more': '더보기 ▾',
      'dashboard.priority.add.title': '할 일 추가',
      'dashboard.priority.reorder.title': 'AI 재정렬',
      'dashboard.priority.empty.hint': 'Inbox에서 MoSCoW로 분류하면 여기에 표시돼요',

      // Remember
      'remember.add.cta': '+ 클릭해서 추가',

      // AI
      'ai.analyzing': 'AI 분석 중…',
      'ai.moscow.title': '덤플리의 우선순위 질문',

      // 단위
      'unit.count': (n) => `${n}개`,
      'unit.warn.count': (n) => `${n}개 ⚠️`,

      // 단어장
      'dict.added': (term) => `'${term}' 단어장에 추가 ✓`,

      // 종일 버튼
      'allday.btn': '🌅 종일',

      // Detail
      'detail.prep.before': (hint, time) => `🔗 ${hint}${time} 전 준비`,
      'detail.bucket.inbox': 'Inbox (미분류)',

      // 블로커 / 추천 칩
      'blocker.note': (content) => `'${content}' 먼저`,
      'suggest.chip.tooltip': (label, hint) => `${label} 추천${hint}`,
      'suggest.chip.aria': (label) => `${label} 추천 적용`,
      'deadline.until': (time) => ` · ⏰ ${time}까지`,
      'blocker.inbox.note': (content) => `🔒 '${content}' 먼저`,
      'related.inbox.note': (hint, evTime, due) => `🔗 ${hint}${evTime} 전${due}`,

      // 시트 공통
      'close.btn': '닫기',
      'complete.btn': '완료',
      'cancel.btn': '취소',
      'add.btn': '추가',
      'delete.btn': '삭제',

      // Detail sheet
      'task.tab': '할 일',
      'event.tab': '일정',
      'title.placeholder': '제목',
      'notes.placeholder': '설명',
      'subtask.title': '하위 작업',
      'subtask.split.btn': 'AI 쪼개기',
      'subtask.add.btn': '+ 하위 작업 추가',

      // Cal band sheet
      'band.title': '기간 추가',
      'band.title.edit': '기간 수정',
      'band.save.btn': '저장',
      'band.name.placeholder': '일정 이름',
      'band.start': '시작',
      'band.end': '종료',
      'band.color': '색상',
      'band.icon': '아이콘',

      // Cal day sheet
      'cal.day.title': '일정',
      'cal.day.add.aria': '일정 추가',
      'cal.day.drag.hint': '빈 시간대를 드래그하면 일정을 추가할 수 있어요',

      // Compose sheet
      'compose.task.placeholder': '할 일을 입력하세요',
      'compose.notes.placeholder': '설명 (선택)',
      'compose.notes.btn': '+ 설명',
      'compose.with.placeholder': '👥 누구랑',
      'compose.location.placeholder': '📍 어디서',

      // 온보딩
      'onboard.back.aria': '뒤로',
      'onboard.next': '다음',
      'onboard.skip': '건너뛰기',

      // AI 모델 라벨
      'model.haiku.label': 'Claude Haiku 4.5 (추천)',
      'model.haiku.hint': '브레인덤프 1회 약 $0.001 · 빠르고 저렴 · console.anthropic.com/usage',
      'model.sonnet.label': 'Claude Sonnet 4.6',
      'model.sonnet.hint': '브레인덤프 1회 약 $0.01 · 고성능 · console.anthropic.com/usage',
      'model.gpt4omini.label': 'GPT-4o mini (추천)',
      'model.gpt4omini.hint': '브레인덤프 1회 약 $0.001 · 빠르고 저렴 · platform.openai.com/usage',
      'model.gpt4o.label': 'GPT-4o',
      'model.gpt4o.hint': '브레인덤프 1회 약 $0.02 · 고성능 · platform.openai.com/usage',
      'model.flash.label': 'Gemini 2.0 Flash (추천)',
      'model.flash.hint': '브레인덤프 1회 약 $0.001 · 빠르고 저렴 · aistudio.google.com/apikey',
      'model.pro.label': 'Gemini 1.5 Pro',
      'model.pro.hint': '브레인덤프 1회 약 $0.01 · 고성능 · aistudio.google.com/apikey',

      // toast 메시지
      'toast.write.first': '먼저 적어주세요',
      'toast.no.suggestions': '추천할 항목이 없어요',
      'toast.no.unsorted': '분류할 항목이 없어요',
      'toast.priority.done': '우선순위 정리 완료 ✓',
      'toast.priority.refreshed': '우선순위를 새로 정렬했어요 ↻',
      'toast.notify.set': '알림이 설정됐어요',
      'toast.notify.unsupported': '이 환경에서는 알림이 지원되지 않아요',
      'toast.location.connected': (city) => `${city} 위치 연결됐어요`,
      'toast.location.connected.default': '위치 연결됐어요',
      'toast.location.permission': '위치 권한이 필요해요 — 브라우저에서 허용해주세요',
      'toast.google.incognito': '시크릿 모드에서는 Google 연결이 지원되지 않아요',
      'toast.google.cancel': '로그인이 취소됐어요',
      'toast.google.unsupported': '이 환경에서는 Google 연결이 지원되지 않아요',
      'toast.cal.connect.first': '설정에서 Google Calendar를 먼저 연결해주세요',
      'toast.cal.syncing': '캘린더 동기화 중…',
      'toast.cal.synced': '캘린더를 업데이트했어요 ✓',
      'toast.cal.sync.failed': '동기화 실패 — 다시 시도해주세요',
      'toast.compose.title.required': '제목을 입력해주세요',
      'toast.compose.saved.task': '할 일을 저장했어요 ✓',
      'toast.compose.added.task': '할 일을 추가했어요 ✓',
      'toast.compose.saved.event': '일정을 저장했어요 ✓',
      'toast.compose.added.event': '일정을 추가했어요 ✓',
      'toast.compose.to.event': '일정으로 변경했어요 ✓',
      'toast.compose.to.task': '할 일로 변경했어요 ✓',
      'toast.no.content': '정리할 내용이 없어요',

      // 분류 결과 메시지
      'classify.feeling': '감정으로 읽어 \'오늘의 마음\'에 담았어요',
      'classify.ponder': '고민으로 읽어 \'생각 중\'에 담았어요',

      // 홈/렌더
      'home.greeting.night': '늦은 밤이에요',
      'home.greeting.morning': '좋은 아침이에요',
      'home.greeting.afternoon': '좋은 오후예요',
      'home.greeting.evening': '좋은 저녁이에요',
      'home.empty.board': '아직 우선순위 할 일이 없어요.',
      'home.empty.board.later': '오늘 할 일이 없어요 — 다른 날짜는 MoSCoW Could·Won\'t에서 확인하세요',
      'home.empty.board.hint': '브레인 덤프 탭에서 쏟아낸 뒤\nMoSCoW로 분류해 보세요',
      'home.expand': (n) => `더보기 ▾ (${n}개)`,
      'home.collapse': '접기 ▴',

      // Inbox
      'inbox.empty': '브레인 덤프에서 Enter로 정리하면\n여기에 쌓여요',
      'inbox.to.task': '할 일로',
      'inbox.hold': '분류하지 않고 Inbox에 유지',
      'inbox.dup': (n) => `이미 있는 ${n}개라 건너뛰었어요`,

      // 메모 UI
      'memo.deadline.none': '마감 없음',
      'memo.done.label': '완료',
      'memo.delete.label': '삭제',
      'memo.priority.up': '우선순위 상승',
      'memo.priority.down': '우선순위 하락',
      'memo.priority.same': '우선순위 유지',
      'memo.priority.new': '새로 편성',
      'memo.drag': '끌어서 이동',
      'memo.bucket.change': '다른 버킷으로 변경',
      'memo.bucket.change.label': '변경',
      'memo.pin': '고정',

      // 컴포즈
      'compose.time.start': '시작 시간',
      'compose.time.deadline': '마감 시간',
      'compose.time.label': '시간',
      'compose.time.none': '시간 없음',
      'compose.date.start': '시작일',
      'compose.date.deadline': '마감일',
      'compose.date.event': '날짜',
      'compose.date.select': '날짜 선택',
      'compose.date.none': '날짜 없음',
      'compose.allday': '종일',
      'compose.reminder': '미리 알림',
      'compose.duration': '예상 소요 시간',
      'compose.desc.show': '+ 설명',
      'compose.desc.hide': '설명 숨기',
      'compose.with': '이름 입력',
      'compose.location': '장소 입력',
      'compose.project.none': '없음',
      'compose.expand': '상세 ▼',
      'compose.collapse': '간단히 ▲',
      'compose.placeholder.task': '할 일을 입력하세요',
      'compose.placeholder.event': '일정 제목을 입력하세요',
      'compose.save': '저장',
      'compose.add': '추가',

      // Remember
      'remember.placeholder': '잊지 말 것을 입력…',

      // MoSCoW 기본 옵션
      'moscow.option.must': 'Must로 올리기',
      'moscow.option.should': 'Should로 두기',
      'moscow.option.later': '오늘은 안 함',

      // AI 판단 통계
      'stats.decisions.empty': '아직 판단 기록이 없어요. 덤프하고 우선순위를 정해보세요.',
      'stats.dictionary.empty': '아직 등록된 단어가 없어요.',
      'stats.accepted': '그대로 수락',
      'stats.modified': '바꿔서 수락',
      'stats.rejected': '거절',
      'stats.deleted': '삭제',
      'stats.deferred': '보류',
      'stats.most.changed': '가장 많이 바꾼 등급',
      'stats.rationale.effect': '근거를 봤을 때 vs 안 봤을 때 수락률',
      'stats.feature.moscow': 'MoSCoW 우선순위',
      'stats.feature.split': '하위 작업 쪼개기',
      'stats.feature.dump': '브레인덤프 추출',
      'stats.hero.moscow': '제안 그대로 수락',
      'stats.hero.split': '쪼갠 그대로 사용',
      'stats.hero.dump': '읽은 그대로 사용',

      // 고유명사 카테고리
      'dict.cat.pet': '반려동물',
      'dict.cat.person': '사람',
      'dict.cat.place': '장소',
      'dict.cat.project': '프로젝트',
      'dict.cat.etc': '기타',

      // Google 연결 오류
      'google.error.config': '해결 방법: Google Cloud Console > API 및 서비스 > 사용자 인증 정보에서\n',

      // Compose
      'compose.duration.label': '예상 소요 시간',
      'compose.duration.suggest': '💡 ADHD 여유 포함 추천',
      'compose.duration.suggesting': '💡 추정 중…',
      'compose.notes.show': '+ 설명',
      'compose.notes.hide': '설명 숨기',
      'compose.pill.deadline': '📅 마감',
      'compose.pill.start.date': '📅 시작',
      'compose.pill.start.time': '⏰ 시작',
      'compose.pill.deadline.time': '⏰ 마감',
      'compose.pill.duration': '⏱️ 소요',
      'compose.pill.allday': '🌅 종일',
      'compose.allday': '종일',
      'compose.none': '없음',
      'compose.date.select': '날짜 선택',
      'compose.date.none': '날짜 없음',
      'compose.expand': '상세 ▼',
      'compose.collapse': '간단히 ▲',
      'compose.task.placeholder': '할 일을 입력하세요',
      'compose.event.placeholder': '일정 제목을 입력하세요',
      'compose.save': '저장',
      'compose.add': '추가',
      'compose.toast.title.required': '제목을 입력해주세요',
      'compose.toast.task.saved': '할 일을 저장했어요 ✓',
      'compose.toast.task.added': '할 일을 추가했어요 ✓',
      'compose.toast.event.saved': '일정을 저장했어요 ✓',
      'compose.toast.event.added': '일정을 추가했어요 ✓',
      'compose.toast.changed.event': '일정으로 변경했어요 ✓',
      'compose.toast.changed.task': '할 일로 변경했어요 ✓',
      'compose.exp.date': '📅 날짜',
      'compose.exp.time': '⏰ 시간',
      'compose.exp.duration': '⏱️ 소요',
      'compose.with.placeholder': '이름 입력',
      'compose.location.placeholder': '장소 입력',
      'compose.exp.with': '👥 누구랑',
      'compose.exp.location': '📍 어디서',
      'compose.exp.reminder': '🔔 알림',
      'compose.exp.priority': '🎯 우선순위',
      'compose.exp.start.date': '📅 시작일',
      'compose.exp.start.time': '⏰ 시작 시간',
      'compose.exp.deadline.date': '📅 마감일',
      'compose.exp.deadline.time': '⏰ 마감 시간',
      'compose.exp.task.duration': '⏱️ 소요시간',

      // Detail / Ponder
      'ponder.to.task': '할 일로',

      // Detail sheet field labels
      'detail.field.start.date': '시작일',
      'detail.field.start.time': '시작 시간',
      'detail.field.deadline.date': '마감일',
      'detail.field.deadline.time': '마감 시간',
      'detail.field.with': '누구랑',
      'detail.field.location': '어디서',
      'detail.field.linked': '연결 할 일',
      'detail.field.reminder': '알림',
      'detail.field.date': '날짜',
      'detail.field.duration.task': '예상 소요',
      'detail.field.duration.event': '소요 시간',
      'detail.field.allday': '종일',
      'detail.allday': '하루 종일',
      'detail.placeholder.with': '예: 이대표, 팀',
      'detail.placeholder.location': '예: 3층 회의실',
      'detail.placeholder.minutes': '분',
      'detail.placeholder.step': '하위 작업',
      'detail.suggest': '추천',
      'detail.blocker': (content) => `🔒 '${content}' 먼저`,
      'detail.prep': (names) => `🔧 준비 작업: ${names}`,
      'detail.source.sync': (label) => `${label} · ↻ 동기화로 최신 정보를 받아요`,
      'toast.ai.no.key': 'AI API 키가 필요해요',
      'toast.ai.splitting': 'AI가 작업을 쪼개고 있어요…',
      'toast.ai.split.done': '하위 작업을 추가했어요 ✨',
      'toast.ai.split.fail': 'AI 쪼개기 실패',
      'toast.import.success': '데이터를 가져왔어요',
      'toast.import.invalid': '올바른 파일이 아니에요',
      'toast.import.fail': '파일 읽기 실패',
      'toast.ponder.to.inbox': '할 일로 옮겼어요 → Inbox',
      'remember.pin': '고정',
      'detail.date.label.startDate': '시작일',
      'detail.date.label.deadline': '마감일',
      'detail.date.label.remember-deadline': '데드라인',
      'detail.date.label.date': '날짜',
      'confirm.event.delete.message': '일정을 삭제할까요?',
      'confirm.event.delete.detail': '삭제하면 Google Calendar에도 반영됩니다.',
      'confirm.delete': '삭제',
      'ob.aria.connect': '연결',
      'toast.deleted': '삭제했어요',
      'toast.proj.deleted': '프로젝트를 삭제했어요',
      'toast.inbox.applied': (n) => `${n}개를 추천대로 분류했어요 ✓`,
      'undo.action': '실행취소',
      'undo.empty': '되돌릴 항목이 없어요',
      'undo.done': '되돌렸어요',

      // Settings — Google Calendar status
      'settings.cal.status.email': (email, n) => `${email} · 캘린더 ${n}개 연동`,
      'settings.cal.status.connected': 'Google Calendar 연결됨',
      'settings.cal.status.none': '로그인하면 캘린더 일정을 가져와요',

      // Bucket sub-labels
      'bucket.must.sub': '오늘 꼭',
      'bucket.should.sub': '하면 좋음',
      'bucket.could.sub': '여유 되면',
      'bucket.wont.sub': '오늘은 안 함',

      // Date labels
      'date.none': '없음',
      'date.today': '오늘',
      'date.tomorrow': '내일',
      'date.preset.weekend': '이번 주말',
      'date.preset.nextweek': '다음 주',
      'date.clear': '마감일 없음',

      // Remind options
      'remind.none': '알림 없음',
      'remind.atstart': '시작 시간에',
      'remind.before': (n) => `${n}분 전`,

      // Duration
      'duration.none': '없음',
      'duration.min': (m) => `${m}분`,
      'duration.hour': (h) => `${h}시간`,
      'duration.hourmin': (h, m) => `${h}시간 ${m}분`,

      // UI action labels
      'ui.add.task': '할 일 추가',
      'ui.add.event': '일정 추가',

      // Navigation
      'nav.back.main': '← 메인',

      // Calendar page
      'cal.title': '캘린더',
      'cal.day.title': '일별 일정',
      'cal.empty': '날짜를 탭하면 이 날의 일정·할 일을 볼 수 있어요',
      'cal.hint.connected': '탭하면 동기화 · 날짜 클릭 · 드래그로 기간 추가',
      'cal.hint.disconnected': '탭하면 연결 · 날짜 클릭 · 드래그로 기간 추가',
      'cal.today.pill': '오늘',
      'cal.sync.done': '캘린더 동기화 완료 ✓',
      'cal.sync.fail': '동기화 실패',
      'cal.timeline': '타임라인',
      'cal.month': (y, m) => `${y}년 ${m}월`,
      'cal.weekdays': ['일', '월', '화', '수', '목', '금', '토'],
      'cal.allday': '종일',
      'cal.kind.event': '일정',
      'cal.kind.task': '할 일',
      'cal.kind.band': '기간',
      'cal.band.sub': (nth, total) => `기간 · ${nth}일째 / ${total}일`,
      'cal.band.new': '새 일정',
      'cal.band.deleted': '기간 일정을 삭제했어요',
      'cal.band.added': '기간을 추가했어요 ✓',
      'cal.day.empty': '이 날짜에 배정된 일정·할 일이 없어요',
      'cal.day.add': '＋ 이 날에 일정 추가',
      'cal.select.title': '동기화할 캘린더',
      'cal.select.hint': '체크한 캘린더를 덤플리에서 볼 수 있어요. 쓰기 캘린더로 지정하면 덤플리에서 추가한 일정이 해당 캘린더에 저장돼요.',
      'cal.select.confirm': '확인',

      // Projects
      'projects.title': '프로젝트',
      'projects.new': '새 프로젝트',
      'projects.empty': '프로젝트가 없어요',
      'projects.empty.hint': '새 프로젝트를 만들거나, 할 일 상세에서 프로젝트를 지정해 보세요.',
      'projects.archive': '아카이브',
      'projects.archive.sub': '프로젝트 미분류 할 일',
      'projects.period': '기간 설정 (선택)',
      'projects.cancel': '취소',
      'projects.edit': '수정',
      'projects.delete': '삭제',
      'projects.today.marker': '● 오늘',
      'projects.start': (d) => `${d} 시작`,
      'projects.end': (d) => `${d} 마감`,
      'projects.no.deadline': '기간 없음',
      'projects.new.task': '+ 할 일 추가',
      'projects.new.event': '+ 일정 추가',
      'projects.tasks.label': '태스크 · 덤플리 우선순위 순',
      'projects.events.label': '일정',
      'projects.tasks.meta': (done, total, dLeft) => `${done}/${total} 태스크 · ${dLeft != null ? `남은 ${Math.max(0, dLeft)}일` : ''}`,
      'projects.unclassified.hint': '프로젝트에 넣지 않은 할 일이 여기 모여요. 상세에서 프로젝트를 지정할 수 있어요.',
      'projects.detail.back': '← 프로젝트',
      'projects.progress': '전체 진행률',
      'projects.no.period': '기간 없음',
      'projects.import.title': '불러오기',
      'projects.import.archive.title': '프로젝트에서 가져오기',
      'projects.import.tasks': '할 일',
      'projects.import.events': '일정',
      'projects.import.tasks.empty': '불러올 할 일이 없어요',
      'projects.import.events.empty': '불러올 일정이 없어요',
      'projects.status.active': '진행 중',
      'projects.status.pending': '아직 시작 전',
      'projects.status.done': '완료',

      // Project form labels
      'proj.status.active': '진행중',
      'proj.status.waiting': '대기',
      'proj.status.done': '완료',
      'proj.area.work': '워크',
      'proj.area.life': '라이프',
      'proj.importance.high': '높음',
      'proj.importance.medium': '보통',
      'proj.importance.low': '낮음',
      'proj.form.status': '상태',
      'proj.form.area': '구분',
      'proj.form.importance': '중요도',
      'proj.form.name.placeholder': '프로젝트 이름',
      'proj.form.create': '만들기',
      'proj.form.new.title': '새 프로젝트',
      'proj.task.empty': '아직 태스크가 없어요',
      'proj.task.done.empty': '완료된 태스크가 없어요',
      'proj.task.import.btn': '불러오기',
      'proj.event.empty': '아직 일정이 없어요',

      // New event/task default title (from timeline drag)
      'compose.new.event': '새로운 이벤트',
    },

    en: {
      // Onboarding
      'ob.welcome.google': 'Continue with Google',
      'ob.welcome.guest': 'Continue as Guest',
      'ob.welcome.connecting': 'Connecting…',
      'ob.nickname.title': 'Welcome to Dumply',
      'ob.nickname.desc': 'What should we call you?',
      'ob.nickname.label': 'Nickname',
      'ob.nickname.placeholder': 'e.g. Alex',
      'ob.nickname.required': 'Please enter a nickname',
      'ob.calendar.title': 'The more you connect, the smarter it gets',
      'ob.calendar.desc': 'We\'ll pull in your tasks and events automatically',
      'ob.calendar.google': 'Google Calendar',
      'ob.calendar.google.sub': 'Sync your calendar',
      'ob.calendar.email.sub': 'Never miss an important email',
      'ob.calendar.slack.sub': 'Keep track of conversation context',
      'ob.calendar.hint': 'Sign in with your Google account to connect. No extra client ID needed.',
      'ob.calendar.selected': (n) => `Calendars (${n} selected)`,
      'ob.api.title': 'Connect AI',
      'ob.api.desc': 'API key for Dumply\'s AI features (optional)',
      'ob.api.provider': 'AI Provider',
      'ob.api.key.anthropic': 'Anthropic API Key',
      'ob.api.key.openai': 'OpenAI API Key',
      'ob.api.key.google': 'Google API Key (Gemini)',
      'ob.api.hint.anthropic': 'Get your key at console.anthropic.com/settings/keys',
      'ob.api.hint.openai': 'Get your key at platform.openai.com/api-keys',
      'ob.api.hint.google': 'Get your key at aistudio.google.com/apikey',
      'ob.api.hint.link': 'Get API key',
      'ob.api.notice': 'Claude Pro / ChatGPT Plus / Gemini Advanced subscriptions are not directly supported. AI features require a BYOK (bring-your-own-key) API key.',
      'ob.api.disclosure': 'When using AI features, your text is sent to the selected AI provider (Anthropic · OpenAI · Google). It never passes through Dumply\'s servers. Transmission only occurs when an API key is configured.',
      'ob.location.title': 'Show weather',
      'ob.location.desc': 'Allow location access to automatically show today\'s weather.',
      'ob.location.sub': 'Coordinates are stored on this device only.',
      'ob.location.btn': 'Allow location',
      'ob.notify.title': 'Enable notifications',
      'ob.notify.desc': 'Dumply will remind you 10 minutes before an event.',
      'ob.notify.btn': 'Allow notifications',
      'ob.notify.done': 'Notifications enabled',
      'ob.next': 'Next',
      'ob.start': 'Get started',
      'ob.skip': 'Skip',
      'ob.learn.meta': (pct) => `${pct}% learned — connect more to get smarter`,

      // Settings
      'settings.title': 'Settings',
      'settings.pin': 'Pin panel',
      'settings.unpin': 'Unpin panel',
      'settings.pin.toast': 'Panel pinned 📌',
      'settings.unpin.toast': 'Panel unpinned',
      'settings.pin.error': 'Cannot close the panel',
      'settings.language': 'Language',
      'settings.language.auto': 'Auto (browser setting)',
      'settings.weather.city': 'Weather city',
      'settings.weather.default': 'New York',
      'settings.location.connected': (city) => `${city || 'Current location'} · GPS coordinates saved`,
      'settings.location.desc': 'Allow location to show weather in the header',
      'settings.location.btn': 'Allow location',
      'settings.location.refresh': 'Refresh location',
      'settings.calendar.login': 'Sign in to import calendar events',
      'settings.cal.select': 'Select calendars',
      'settings.cal.view': 'View',
      'settings.cal.write': 'Write',
      'settings.save.toast': 'Saved ✓',
      'settings.reset.confirm': 'Delete all data?\n\nThis will reset your tasks, projects, Google & location integrations, and API keys. You\'ll be returned to onboarding.',
      'settings.reset.toast': 'All data cleared',
      'settings.weather.not.found': 'Could not find that city',
      'settings.api.storage.notice': 'API keys are stored unencrypted in your browser\'s local storage on this device.',
      'settings.name': 'Name',
      'settings.name.placeholder': 'Nickname',
      'settings.theme': 'Theme',
      'settings.theme.hint': 'System auto-switches: light→Ash · dark→Midnight',
      'settings.weather.hint': 'Fetch weather by GPS or city name',
      'settings.weather.placeholder': 'e.g. New York',
      'settings.location': 'Location · Weather',
      'settings.api.notice': '💡 Claude Pro / ChatGPT Plus / Gemini Advanced subscriptions are not officially integrated. AI features require an API key (BYOK).',
      'settings.ai.provider': 'AI Provider',
      'settings.ai.model': 'Model',
      'settings.api.anthropic': 'Anthropic API Key',
      'settings.api.openai': 'OpenAI API Key',
      'settings.api.google.label': 'Google API Key (Gemini)',
      'settings.google.label': 'Google Account · Calendar',
      'settings.google.connect': 'Sign in with Google · Connect Calendar',
      'settings.google.disconnect': 'Disconnect',
      'settings.cal.sync': 'Sync Calendars',
      'settings.cal.sync.both': 'Bidirectional sync',
      'settings.cal.sync.read': 'Read only',
      'settings.cal.sync.write': 'Write only',
      'settings.dictionary.label': 'My Dictionary',
      'settings.dictionary.hint': 'Custom terms you added from dumps. Tap to delete.',
      'settings.decisions.label': 'AI Decision Log',
      'settings.decisions.hint': 'Tracks whether you kept or changed Dumply\'s AI priority suggestions.',
      'settings.backup.label': 'Data Backup',
      'settings.backup.hint': 'Data is saved only in your browser on this device. If you change devices or reinstall Chrome, you can restore from a backup file. API keys are excluded for security.',
      'settings.backup.export': 'Export',
      'settings.backup.import': 'Import',
      'settings.reset.label': 'Reset Data',
      'settings.reset.hint': 'Deletes all tasks, projects and integration settings to start fresh.',
      'settings.reset.btn': 'Reset All Data',
      'settings.save': 'Save',

      // Navigation
      'nav.home': 'Home',
      'nav.calendar': 'Calendar',
      'nav.projects': 'Projects',
      'nav.toggle.collapse': 'Collapse menu',
      'nav.toggle.expand': 'Expand menu',

      // Tabs
      'dump.tab': 'Brain Dump',
      'dashboard.tab': 'Dashboard',

      // Dump card
      'dump.card.hint': "Don't organize — just dump it",
      'dump.example.btn': '↻ Example',
      'dump.input.hint': 'Enter to organize · Shift+Enter for new line',
      'dump.input.placeholder': 'Buy mom a birthday gift at 3pm. Meeting with CEO about app launch...',

      // Inbox
      'inbox.ai.title': 'AI asks one item at a time to classify',
      'inbox.ai.label': 'AI Q&A',
      'inbox.flow.hint': 'Enter to dump → confirm suggestions → tab buckets → reflect in MoSCoW',
      'inbox.classify.btn': 'Classify as suggested',
      'inbox.classify.btn.count': (n) => `↓ Classify as suggested (${n})`,
      'inbox.mood.low': '😮‍💨 Your energy looks a bit low today — try picking just 1–2 Musts',
      'inbox.mood.rest': '😮‍💨 Take it easy today — no need to push.',

      // MoSCoW
      'moscow.title': 'MoSCoW',
      'moscow.guide': 'Must: 3 or fewer · Drag to reorder or change bucket',
      'moscow.empty': '— Empty',
      'moscow.compose.must.hint': 'Keep Must to 3 or fewer',

      // Ponder / Feeling
      'ponder.title': 'Things to consider',
      'ponder.hint': "Not decided yet — move to tasks when you're ready",
      'feeling.title': "Today's mood",
      'feeling.hint': "Emotions, not tasks — reflected in today's energy level",

      // Dashboard
      'dashboard.priority.title': "Today's priorities",
      'dashboard.remember.title': "Don't forget",
      'dashboard.timeline.title': 'Today timeline',
      'dashboard.timeline.sync': 'Sync',
      'dashboard.timeline.sync.title': 'Sync Google Calendar',
      'dashboard.timeline.add.title': 'Add event',
      'dashboard.more': 'Show more ▾',
      'dashboard.priority.add.title': 'Add task',
      'dashboard.priority.reorder.title': 'AI reorder',
      'dashboard.priority.empty.hint': 'Classify items from Inbox with MoSCoW to show here',

      // Remember
      'remember.add.cta': '+ Click to add',

      // AI
      'ai.analyzing': 'AI analyzing…',
      'ai.moscow.title': "Dumply's priority question",

      // Units
      'unit.count': (n) => `${n}`,
      'unit.warn.count': (n) => `${n} ⚠️`,

      // Dictionary
      'dict.added': (term) => `'${term}' added to dictionary ✓`,

      // All day button
      'allday.btn': '🌅 All day',

      // Detail
      'detail.prep.before': (hint, time) => `🔗 ${hint} — ${time} before`,
      'detail.bucket.inbox': 'Inbox (unsorted)',

      // Blocker / suggest chips
      'blocker.note': (content) => `'${content}' first`,
      'suggest.chip.tooltip': (label, hint) => `${label} suggestion${hint}`,
      'suggest.chip.aria': (label) => `Apply ${label} suggestion`,
      'deadline.until': (time) => ` · ⏰ by ${time}`,
      'blocker.inbox.note': (content) => `🔒 '${content}' first`,
      'related.inbox.note': (hint, evTime, due) => `🔗 ${hint}${evTime}${due}`,

      // Sheet common
      'close.btn': 'Close',
      'complete.btn': 'Complete',
      'cancel.btn': 'Cancel',
      'add.btn': 'Add',
      'delete.btn': 'Delete',

      // Detail sheet
      'task.tab': 'Task',
      'event.tab': 'Event',
      'title.placeholder': 'Title',
      'notes.placeholder': 'Notes',
      'subtask.title': 'Subtasks',
      'subtask.split.btn': 'AI split',
      'subtask.add.btn': '+ Add subtask',

      // Cal band sheet
      'band.title': 'Add time band',
      'band.title.edit': 'Edit time band',
      'band.save.btn': 'Save',
      'band.name.placeholder': 'Event name',
      'band.start': 'Start',
      'band.end': 'End',
      'band.color': 'Color',
      'band.icon': 'Icon',

      // Cal day sheet
      'cal.day.title': 'Events',
      'cal.day.add.aria': 'Add event',
      'cal.day.drag.hint': 'Drag an empty time slot to add an event',

      // Compose sheet
      'compose.task.placeholder': 'Enter a task',
      'compose.notes.placeholder': 'Notes (optional)',
      'compose.notes.btn': '+ Notes',
      'compose.with.placeholder': '👥 With',
      'compose.location.placeholder': '📍 Where',

      // Onboarding
      'onboard.back.aria': 'Back',
      'onboard.next': 'Next',
      'onboard.skip': 'Skip',

      // AI model labels
      'model.haiku.label': 'Claude Haiku 4.5 (Recommended)',
      'model.haiku.hint': '~$0.001 per dump · Fast & affordable · console.anthropic.com/usage',
      'model.sonnet.label': 'Claude Sonnet 4.6',
      'model.sonnet.hint': '~$0.01 per dump · High performance · console.anthropic.com/usage',
      'model.gpt4omini.label': 'GPT-4o mini (Recommended)',
      'model.gpt4omini.hint': '~$0.001 per dump · Fast & affordable · platform.openai.com/usage',
      'model.gpt4o.label': 'GPT-4o',
      'model.gpt4o.hint': '~$0.02 per dump · High performance · platform.openai.com/usage',
      'model.flash.label': 'Gemini 2.0 Flash (Recommended)',
      'model.flash.hint': '~$0.001 per dump · Fast & affordable · aistudio.google.com/apikey',
      'model.pro.label': 'Gemini 1.5 Pro',
      'model.pro.hint': '~$0.01 per dump · High performance · aistudio.google.com/apikey',

      // Toast messages
      'toast.write.first': 'Write something first',
      'toast.no.suggestions': 'Nothing to suggest',
      'toast.no.unsorted': 'Nothing to sort',
      'toast.priority.done': 'Priorities updated ✓',
      'toast.priority.refreshed': 'Priorities reordered ↻',
      'toast.notify.set': 'Notifications enabled',
      'toast.notify.unsupported': 'Notifications are not supported in this environment',
      'toast.location.connected': (city) => `Connected to ${city}`,
      'toast.location.connected.default': 'Location connected',
      'toast.location.permission': 'Location permission required — allow it in your browser',
      'toast.google.incognito': 'Google sign-in is not supported in Incognito mode',
      'toast.google.cancel': 'Sign-in cancelled',
      'toast.google.unsupported': 'Google sign-in is not supported in this environment',
      'toast.cal.connect.first': 'Connect Google Calendar in Settings first',
      'toast.cal.syncing': 'Syncing calendar…',
      'toast.cal.synced': 'Calendar updated ✓',
      'toast.cal.sync.failed': 'Sync failed — please try again',
      'toast.compose.title.required': 'Please enter a title',
      'toast.compose.saved.task': 'Task saved ✓',
      'toast.compose.added.task': 'Task added ✓',
      'toast.compose.saved.event': 'Event saved ✓',
      'toast.compose.added.event': 'Event added ✓',
      'toast.compose.to.event': 'Converted to event ✓',
      'toast.compose.to.task': 'Converted to task ✓',
      'toast.no.content': 'Nothing to organize',

      // Classification result messages
      'classify.feeling': 'Logged as a feeling in "Today\'s mood"',
      'classify.ponder': 'Logged as a thought in "Things to consider"',

      // Home / render
      'home.greeting.night': 'Late night',
      'home.greeting.morning': 'Good morning',
      'home.greeting.afternoon': 'Good afternoon',
      'home.greeting.evening': 'Good evening',
      'home.empty.board': 'No priority tasks yet.',
      'home.empty.board.later': 'Nothing for today — check Could·Won\'t in MoSCoW for other dates',
      'home.empty.board.hint': 'Brain dump first, then\nsort with MoSCoW',
      'home.expand': (n) => `Show more ▾ (${n})`,
      'home.collapse': 'Collapse ▴',

      // Inbox
      'inbox.empty': 'Press Enter in Brain Dump\nto fill your inbox',
      'inbox.to.task': 'Add as task',
      'inbox.hold': 'Keep in Inbox without sorting',
      'inbox.dup': (n) => `Skipped ${n} duplicate${n === 1 ? '' : 's'}`,

      // Memo UI
      'memo.deadline.none': 'No deadline',
      'memo.done.label': 'Done',
      'memo.delete.label': 'Delete',
      'memo.priority.up': 'Priority up',
      'memo.priority.down': 'Priority down',
      'memo.priority.same': 'Priority unchanged',
      'memo.priority.new': 'New priority',
      'memo.drag': 'Drag to move',
      'memo.bucket.change': 'Change bucket',
      'memo.bucket.change.label': 'Change',
      'memo.pin': 'Pin',

      // Compose
      'compose.time.start': 'Start time',
      'compose.time.deadline': 'Due time',
      'compose.time.label': 'Time',
      'compose.time.none': 'No time',
      'compose.date.start': 'Start date',
      'compose.date.deadline': 'Due date',
      'compose.date.event': 'Date',
      'compose.date.select': 'Pick a date',
      'compose.date.none': 'No date',
      'compose.allday': 'All day',
      'compose.none': 'None',
      'compose.reminder': 'Reminder',
      'compose.duration': 'Estimated duration',
      'compose.desc.show': '+ Description',
      'compose.desc.hide': 'Hide description',
      'compose.with': 'Enter name',
      'compose.location': 'Enter location',
      'compose.project.none': 'None',
      'compose.expand': 'Details ▼',
      'compose.collapse': 'Less ▲',
      'compose.placeholder.task': 'What needs to be done?',
      'compose.placeholder.event': 'Event title',
      'compose.task.placeholder': 'What needs doing?',
      'compose.event.placeholder': 'Event title',
      'compose.save': 'Save',
      'compose.add': 'Add',

      // Remember
      'remember.placeholder': 'Something to remember…',

      // MoSCoW default options
      'moscow.option.must': 'Move to Must',
      'moscow.option.should': 'Keep as Should',
      'moscow.option.later': 'Not today',

      // AI decision stats
      'stats.decisions.empty': 'No decisions yet. Dump and prioritize to get started.',
      'stats.dictionary.empty': 'No words registered yet.',
      'stats.accepted': 'Accepted as-is',
      'stats.modified': 'Accepted with changes',
      'stats.rejected': 'Rejected',
      'stats.deleted': 'Deleted',
      'stats.deferred': 'Deferred',
      'stats.most.changed': 'Most changed bucket',
      'stats.rationale.effect': 'Acceptance rate: with vs. without rationale',
      'stats.feature.moscow': 'MoSCoW priorities',
      'stats.feature.split': 'Sub-task breakdown',
      'stats.feature.dump': 'Brain dump extraction',
      'stats.hero.moscow': 'Accepted as suggested',
      'stats.hero.split': 'Used breakdown as-is',
      'stats.hero.dump': 'Used extraction as-is',

      // Noun dictionary categories
      'dict.cat.pet': 'Pet',
      'dict.cat.person': 'Person',
      'dict.cat.place': 'Place',
      'dict.cat.project': 'Project',
      'dict.cat.etc': 'Other',

      // Google error
      'google.error.config': 'Fix: Google Cloud Console > APIs & Services > Credentials\n',

      // Compose (extended)
      'compose.duration.label': 'Estimated duration',
      'compose.duration.suggest': '💡 ADHD-friendly estimate',
      'compose.duration.suggesting': '💡 Estimating…',
      'compose.notes.show': '+ Notes',
      'compose.notes.hide': 'Hide notes',
      'compose.pill.deadline': '📅 Due',
      'compose.pill.start.date': '📅 Start',
      'compose.pill.start.time': '⏰ Start',
      'compose.pill.deadline.time': '⏰ Due',
      'compose.pill.duration': '⏱️ Duration',
      'compose.pill.allday': '🌅 All day',
      'compose.toast.title.required': 'Please enter a title',
      'compose.toast.task.saved': 'Task saved ✓',
      'compose.toast.task.added': 'Task added ✓',
      'compose.toast.event.saved': 'Event saved ✓',
      'compose.toast.event.added': 'Event added ✓',
      'compose.toast.changed.event': 'Converted to event ✓',
      'compose.toast.changed.task': 'Converted to task ✓',
      'compose.exp.date': '📅 Date',
      'compose.exp.time': '⏰ Time',
      'compose.exp.duration': '⏱️ Duration',
      'compose.with.placeholder': 'Enter name',
      'compose.location.placeholder': 'Enter location',
      'compose.exp.with': '👥 With',
      'compose.exp.location': '📍 Location',
      'compose.exp.reminder': '🔔 Reminder',
      'compose.exp.priority': '🎯 Priority',
      'compose.exp.start.date': '📅 Start date',
      'compose.exp.start.time': '⏰ Start time',
      'compose.exp.deadline.date': '📅 Due date',
      'compose.exp.deadline.time': '⏰ Due time',
      'compose.exp.task.duration': '⏱️ Duration',

      // Detail / Ponder
      'ponder.to.task': 'Add as task',

      // Detail sheet field labels
      'detail.field.start.date': 'Start date',
      'detail.field.start.time': 'Start time',
      'detail.field.deadline.date': 'Due date',
      'detail.field.deadline.time': 'Due time',
      'detail.field.with': 'With',
      'detail.field.location': 'Location',
      'detail.field.linked': 'Linked task',
      'detail.field.reminder': 'Reminder',
      'detail.field.date': 'Date',
      'detail.field.duration.task': 'Est. time',
      'detail.field.duration.event': 'Duration',
      'detail.field.allday': 'All day',
      'detail.allday': 'All day',
      'detail.placeholder.with': 'e.g. Alex, team',
      'detail.placeholder.location': 'e.g. Conference room',
      'detail.placeholder.minutes': 'min',
      'detail.placeholder.step': 'Sub-task',
      'detail.suggest': 'Suggest',
      'detail.blocker': (content) => `🔒 Blocked by '${content}'`,
      'detail.prep': (names) => `🔧 Prep tasks: ${names}`,
      'detail.source.sync': (label) => `${label} · ↻ Sync to get latest`,
      'toast.ai.no.key': 'AI API key required',
      'toast.ai.splitting': 'AI is breaking it down…',
      'toast.ai.split.done': 'Sub-tasks added ✨',
      'toast.ai.split.fail': 'AI breakdown failed',
      'toast.import.success': 'Data imported',
      'toast.import.invalid': 'Invalid file format',
      'toast.import.fail': 'File read failed',
      'toast.ponder.to.inbox': 'Moved to Inbox as task',
      'remember.pin': 'Pin',
      'detail.date.label.startDate': 'Start date',
      'detail.date.label.deadline': 'Due date',
      'detail.date.label.remember-deadline': 'Deadline',
      'detail.date.label.date': 'Date',
      'confirm.event.delete.message': 'Delete this event?',
      'confirm.event.delete.detail': 'This will also remove it from Google Calendar.',
      'confirm.delete': 'Delete',
      'ob.aria.connect': 'Connect',
      'toast.deleted': 'Deleted',
      'toast.proj.deleted': 'Project deleted',
      'toast.inbox.applied': (n) => `${n} item${n === 1 ? '' : 's'} classified as suggested ✓`,
      'undo.action': 'Undo',
      'undo.empty': 'Nothing to undo',
      'undo.done': 'Undone',

      // Settings — Google Calendar status
      'settings.cal.status.email': (email, n) => `${email} · ${n} calendar${n === 1 ? '' : 's'} synced`,
      'settings.cal.status.connected': 'Google Calendar connected',
      'settings.cal.status.none': 'Sign in to import calendar events',

      // Bucket sub-labels
      'bucket.must.sub': 'Today',
      'bucket.should.sub': 'Good to do',
      'bucket.could.sub': 'If time allows',
      'bucket.wont.sub': 'Skip today',

      // Date labels
      'date.none': 'None',
      'date.today': 'Today',
      'date.tomorrow': 'Tomorrow',
      'date.preset.weekend': 'This weekend',
      'date.preset.nextweek': 'Next week',
      'date.clear': 'No deadline',

      // Remind options
      'remind.none': 'No reminder',
      'remind.atstart': 'At start time',
      'remind.before': (n) => `${n}m before`,

      // Duration
      'duration.none': 'None',
      'duration.min': (m) => `${m}m`,
      'duration.hour': (h) => `${h}h`,
      'duration.hourmin': (h, m) => `${h}h ${m}m`,

      // UI action labels
      'ui.add.task': 'Add Task',
      'ui.add.event': 'Add Event',

      // Navigation
      'nav.back.main': '← Main',

      // Calendar page
      'cal.title': 'Calendar',
      'cal.day.title': 'Daily Schedule',
      'cal.empty': 'Tap a date to see its events and tasks',
      'cal.hint.connected': 'Tap to sync · Click date · Drag to add span',
      'cal.hint.disconnected': 'Tap to connect · Click date · Drag to add span',
      'cal.today.pill': 'Today',
      'cal.sync.done': 'Calendar synced ✓',
      'cal.sync.fail': 'Sync failed',
      'cal.timeline': 'Timeline',
      'cal.month': (y, m) => `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]} ${y}`,
      'cal.weekdays': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      'cal.allday': 'All day',
      'cal.kind.event': 'Event',
      'cal.kind.task': 'Task',
      'cal.kind.band': 'Period',
      'cal.band.sub': (nth, total) => `Period · Day ${nth} of ${total}`,
      'cal.band.new': 'New event',
      'cal.band.deleted': 'Time band deleted',
      'cal.band.added': 'Time band added ✓',
      'cal.day.empty': 'No events or tasks for this date',
      'cal.day.add': '＋ Add event for this day',
      'cal.select.title': 'Sync Calendars',
      'cal.select.hint': 'Check calendars to show in Dumply. Mark one as Write to save events added in Dumply to that calendar.',
      'cal.select.confirm': 'Confirm',

      // Projects
      'projects.title': 'Projects',
      'projects.new': 'New Project',
      'projects.empty': 'No projects yet',
      'projects.empty.hint': 'Create a new project or assign tasks from their detail view.',
      'projects.archive': 'Archive',
      'projects.archive.sub': 'Unclassified tasks',
      'projects.period': 'Set period (optional)',
      'projects.cancel': 'Cancel',
      'projects.edit': 'Edit',
      'projects.delete': 'Delete',
      'projects.today.marker': '● Today',
      'projects.start': (d) => `Start: ${d}`,
      'projects.end': (d) => `Due: ${d}`,
      'projects.no.deadline': 'No deadline',
      'projects.new.task': '+ Add task',
      'projects.new.event': '+ Add event',
      'projects.tasks.label': 'Tasks · by Dumply priority',
      'projects.events.label': 'Events',
      'projects.tasks.meta': (done, total, dLeft) => `${done}/${total} tasks · ${dLeft != null ? `${Math.max(0, dLeft)} days left` : ''}`,
      'projects.unclassified.hint': 'Tasks not in any project appear here. Assign them from their detail view.',
      'projects.detail.back': '← Projects',
      'projects.progress': 'Overall progress',
      'projects.no.period': 'No deadline',
      'projects.import.title': 'Import',
      'projects.import.archive.title': 'Import from Project',
      'projects.import.tasks': 'Tasks',
      'projects.import.events': 'Events',
      'projects.import.tasks.empty': 'No tasks to import',
      'projects.import.events.empty': 'No events to import',
      'projects.status.active': 'In Progress',
      'projects.status.pending': 'Not started',
      'projects.status.done': 'Done',

      // Project form labels
      'proj.status.active': 'Active',
      'proj.status.waiting': 'Waiting',
      'proj.status.done': 'Done',
      'proj.area.work': 'Work',
      'proj.area.life': 'Life',
      'proj.importance.high': 'High',
      'proj.importance.medium': 'Medium',
      'proj.importance.low': 'Low',
      'proj.form.status': 'Status',
      'proj.form.area': 'Area',
      'proj.form.importance': 'Importance',
      'proj.form.name.placeholder': 'Project name',
      'proj.form.create': 'Create',
      'proj.form.new.title': 'New Project',
      'proj.task.empty': 'No tasks yet',
      'proj.task.done.empty': 'No completed tasks',
      'proj.task.import.btn': 'Import',
      'proj.event.empty': 'No events yet',

      // New event/task default title (from timeline drag)
      'compose.new.event': 'New Event',
    },
  };

  // 앱 초기화 시 한 번 결정, 전역 캐싱
  let _lang = 'ko';

  function detect(settingsLang) {
    if (settingsLang && settingsLang !== 'auto') return settingsLang;
    const ui = (typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage?.())
      || navigator.language
      || 'ko';
    return ui.startsWith('ko') ? 'ko' : 'en';
  }

  function init(settingsLang) {
    _lang = detect(settingsLang);
    window.__lang = _lang;
    return _lang;
  }

  function lang() {
    return _lang;
  }

  function t(key, ...args) {
    const dict = STRINGS[_lang] || STRINGS.ko;
    const val = dict[key] ?? (STRINGS.ko[key] ?? key);
    return typeof val === 'function' ? val(...args) : val;
  }

  return { init, lang, t, detect };
})();

window.t = AlfredoI18n.t.bind(AlfredoI18n);

// [data-i18n] 속성을 가진 DOM 요소의 텍스트를 현재 언어로 일괄 갱신한다.
// 자식 엘리먼트가 있는 경우(e.g. <label> 안의 <input>) 첫 번째 텍스트 노드만 업데이트한다.
window.applyI18n = function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const text = window.t(el.dataset.i18n);
    if (el.children.length > 0) {
      const tn = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE);
      if (tn) tn.textContent = text;
    } else {
      el.textContent = text;
    }
  });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = window.t(el.dataset.i18nTitle);
  });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', window.t(el.dataset.i18nAria));
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = window.t(el.dataset.i18nPlaceholder);
  });
};
