/* 알고리즘 기반 실시간 태그 추출 (AI 없음) */

'use strict';

const AlfredoTags = (() => {
  // ── 사용자 사전(고유명사) ──
  let userDictionary = [];
  function setDictionary(dict) {
    userDictionary = Array.isArray(dict) ? dict : [];
  }

  // 후보 추출 시 거를 불용어/조사/용언 어미
  const CAND_STOPWORDS = new Set([
    '오늘', '내일', '모레', '지금', '아까', '이따', '정도', '관련', '준비', '부탁',
    '그리고', '오전', '오후', '저녁', '아침', '점심', '여기', '거기', '저기', '우리',
    '진짜', '완전', '약간', '조금', '많이', '계속', '다시', '먼저', '나중',
  ]);
  // 명사 끝에 붙은 조사 (단, '이'는 이름 일부일 수 있어 제외)
  const CAND_PARTICLE = /(은|는|가|을|를|에서|에게|한테|까지|부터|으로|로|와|과|랑|도|만|의)$/;
  // 동사 어간에 붙는 연결형(준비"하고"·문의"하기") — 떼고 명사만 후보로
  const CAND_VERBSUFFIX = /(하기|하고|해서|하러|하며|해야|하면|한다|했다|하자|할까|할게|하는|하니)$/;
  // 용언(동사·형용사)으로 보이는 어미 — 후보에서 제외
  const CAND_VERBTAIL = /(다|까|요|죠|네|자|봐|줘|걸|래|대|쟤|함)$/;

  const PATTERNS = [
    [/엄마|아빠|부모|어머니|아버지|mom|dad|mother|father/i, { type: 'person', icon: '👵', label: '가족' }],
    [/이대표|대표|ceo|팀장|과장|부장|매니저|manager/i, { type: 'person', icon: '👤', label: '인물' }],
    [/생일|birthday|기념일|anniversary/i, { type: 'life', icon: '🎁', label: '생일선물' }],
    [/오전\s*(\d{1,2})시|오후\s*(\d{1,2})시|(\d{1,2}):(\d{2})|(\d{1,2})시|am\s*\d|pm\s*\d/i, { type: 'time', icon: '🕒', label: '시간' }],
    [/미팅|회의|meeting|발표|프레젠|presentation/i, { type: 'work', icon: '💼', label: '미팅' }],
    [/런칭|출시|launch|배포|deploy/i, { type: 'work', icon: '📱', label: '앱런칭' }],
    [/구매|사야|쇼핑|shopping|선물/i, { type: 'life', icon: '🛍️', label: '구매' }],
    [/치과|dentist|충치|스케일링/i, { type: 'life', icon: '🦷', label: '치과' }],
    [/동물병원|수의사|동물\s*병원|vet/i, { type: 'life', icon: '🐾', label: '동물병원' }],
    [/(?<!동물)병원|진료|검진|hospital|clinic|의사|doctor/i, { type: 'life', icon: '🏥', label: '병원' }],
    [/접종|예방접종|백신|vaccine|주사/i, { type: 'life', icon: '💉', label: '접종' }],
    [/약국|처방|복용|영양제|pharmacy/i, { type: 'life', icon: '💊', label: '약' }],
    [/강아지|고양이|반려|냥이|댕댕|멍멍|사료/i, { type: 'life', icon: '🐾', label: '반려동물' }],
    [/예약|예매|reservation|booking/i, { type: 'life', icon: '📅', label: '예약' }],
    [/문의|여쭤|물어보|상담|inquiry/i, { type: 'life', icon: '💬', label: '문의' }],
    [/보고서|리포트|report|초안|draft/i, { type: 'work', icon: '📄', label: '보고서' }],
    [/운동|헬스|gym|workout|걷기/i, { type: 'life', icon: '🏃', label: '운동' }],
    [/커피|coffee|카페|카페인|caffeine/i, { type: 'energy', icon: '☕', label: '커피' }],
    [/잠.*못|못\s*잤|수면\s*부족|밤\s*샜|밤샘|불면|졸려|졸리|insomnia/i, { type: 'energy', icon: '🥱', label: '수면부족' }],
    [/피곤|힘들|지침|지쳐|기진|방전|탈진|tired|exhausted|drained/i, { type: 'energy', icon: '🔋', label: '피로' }],
    [/번아웃|burnout|소진|무기력|의욕\s*없/i, { type: 'energy', icon: '🪫', label: '번아웃' }],
    [/집중|몰입|focus|딥워크|deep\s*work/i, { type: 'energy', icon: '🧠', label: '집중' }],
    [/정신\s*없|바빠|바쁨|busy|벅차|허덕|밀려/i, { type: 'energy', icon: '🔄', label: '정신없음' }],
    [/스트레스|stress|압박|부담|버겁/i, { type: 'emotion', icon: '😰', label: '스트레스' }],
    [/걱정|불안|초조|anxious|anxiety|두려|겁나/i, { type: 'emotion', icon: '😟', label: '불안' }],
    [/짜증|화나|화남|빡쳐|열받|annoyed|짜증나|frustrat/i, { type: 'emotion', icon: '😤', label: '짜증' }],
    [/우울|슬퍼|슬프|슬픔|sad|울적|허무|down/i, { type: 'emotion', icon: '😢', label: '우울' }],
    [/속상|답답|억울|서럽|서글|미치겠|돌아버|분해|환장/i, { type: 'emotion', icon: '😣', label: '속상' }],
    [/외롭|외로움|외로워|쓸쓸|그립|보고\s*싶|허전/i, { type: 'emotion', icon: '🥺', label: '외로움' }],
    [/기분.{0,5}좋|너무\s*좋|완전\s*좋|행복|기뻐|기쁘|좋아\s*죽|뿌듯|설레|신나|신남|excited|happy/i, { type: 'emotion', icon: '😊', label: '기분좋음' }],
    [/하기\s*싫|가기\s*싫|다\s*싫|그냥\s*싫|때려치|지긋지긋|싫어죽/i, { type: 'emotion', icon: '😮‍💨', label: '싫증' }],
    [/기대\s*돼|기대된|기대하|두근/i, { type: 'emotion', icon: '✨', label: '기대' }],
    [/비행|flight|출장|여행|travel/i, { type: 'life', icon: '✈️', label: '여행' }],
    [/마감|deadline|due|기한/i, { type: 'date', icon: '⏰', label: '마감' }],
    [/오늘|today/i, { type: 'date', icon: '📅', label: '오늘' }],
    [/내일|tomorrow/i, { type: 'date', icon: '📅', label: '내일' }],
    [/모레/i, { type: 'date', icon: '📅', label: '모레' }],
    [/돈|money|비용|결제|구독|subscription/i, { type: 'life', icon: '💰', label: '비용' }],
    [/이메일|메일|email|mail/i, { type: 'work', icon: '📧', label: '이메일' }],
    [/전화|연락|call|phone/i, { type: 'life', icon: '📞', label: '연락' }],
    [/집안일|청소|빨래|설거지|laundry|chore/i, { type: 'life', icon: '🧺', label: '집안일' }],
    [/넷플|유튜브|드라마|netflix|youtube|영화|movie/i, { type: 'life', icon: '📺', label: '휴식' }],
  ];

  function extractTimeTag(text) {
    const pm = text.match(/오후\s*(\d{1,2})시/);
    if (pm) return { type: 'time', icon: '🕒', label: `${pm[1]} PM` };
    const am = text.match(/오전\s*(\d{1,2})시/);
    if (am) return { type: 'time', icon: '🕒', label: `${am[1]} AM` };
    const clock = text.match(/(\d{1,2}):(\d{2})/);
    if (clock) return { type: 'time', icon: '🕒', label: clock[0] };
    const h = text.match(/(\d{1,2})시/);
    if (h) return { type: 'time', icon: '🕒', label: h[0] };
    return null;
  }

  function extractPersonName(text) {
    const m = text.match(/([가-힣]{1,4})(대표|팀장|과장|부장)/);
    if (m) return { type: 'person', icon: '👤', label: `${m[1]} ${m[2]}` };
    if (/엄마|어머니|mom/i.test(text)) return { type: 'person', icon: '👵', label: 'mom' };
    if (/아빠|아버지|dad/i.test(text)) return { type: 'person', icon: '👴', label: 'dad' };
    return null;
  }

  /** 사용자 사전에 등록된 고유명사 매칭 (항상 우선) */
  function extractDictionaryTags(text) {
    const out = [];
    for (const e of userDictionary) {
      if (!e?.term) continue;
      const terms = [e.term, ...(e.aliases || [])];
      if (terms.some((t) => t && text.includes(t))) {
        out.push({ type: e.type || 'life', icon: e.icon || '🏷️', label: e.label || e.term });
      }
    }
    return out;
  }

  /** 패턴·사전에 안 걸린 고유명사 후보(반려동물·사람·장소 이름 등) */
  function extractCandidates(text) {
    if (!text || text.trim().length < 2) return [];
    const out = [];
    const seen = new Set();
    for (const raw of text.split(/[\s,.\n·!?]+/)) {
      if (!raw) continue;
      const tok = raw.replace(CAND_VERBSUFFIX, '').replace(CAND_PARTICLE, '');
      if (!/^[가-힣]{2,4}$/.test(tok)) continue;
      if (CAND_STOPWORDS.has(tok) || CAND_VERBTAIL.test(tok)) continue;
      // 2글자 용언 연결형(가서·와서·사고·보고·하고…)은 거의 동사 → 제외
      if (tok.length === 2 && /(고|서|며|면|러|려|와|워|야)$/.test(tok)) continue;
      if (PATTERNS.some(([re]) => re.test(tok))) continue;
      if (userDictionary.some((e) => e.term === tok || (e.aliases || []).includes(tok))) continue;
      if (seen.has(tok)) continue;
      seen.add(tok);
      out.push(tok);
    }
    return out.slice(0, 3);
  }

  // 망설임/미결정 표지 (고민)
  const PONDER_RE = /(할까\s*말까|갈까\s*말까|살까\s*말까|할지\s*말지|할까|말까|해야\s*하나|해야\s*되나|해야\s*할까|어떡하|어떻게\s*하지|어쩌지|고민|망설|모르겠|정해야|결정해야)/;
  // 순수 감정으로 볼 컨디션 라벨 (커피·집중처럼 중립 에너지는 제외)
  const FEELING_LABELS = new Set(['수면부족', '피로', '번아웃', '정신없음']);
  // 실행 신호 — 있으면 감정이 섞여도 '할 일'
  // 구체적 실행 신호 — 날짜/시간은 감정의 맥락일 뿐이라 제외("내일 시험 떨려"도 감정)
  const TASK_SIGNAL_RE = /사기|사야|예약|연락|전화|미팅|회의|발표|제출|보내야|준비|마감|보고서|메일|구매|쇼핑|운동|장보|청소/;

  // 감정 토로 표지 — 있으면 길이와 무관하게 감정표현으로
  // (압도·소진·짜증 구어 포함: "할 일 개많네", "정신없어", "벅차", "지쳤다" 등)
  const VENT_RE = /(왜\s*맨날|왜\s*항상|왜\s*이렇게|왜\s*나만|왜\s*안\s*될|미치겠|돌아버|속상|답답|서럽|억울|서글|짜증나|힘들어|힘드네|힘들다|외로|지긋지긋|그냥\s*싫|다\s*싫|때려치|하기\s*싫|개많|너무\s*많|할\s*[일게]\s*많|벅차|벅참|정신없|바빠|바쁘다|산더미|지쳤|지쳐|지친|귀찮|멘붕|버겁|죽겠)/;

  /** 덤프 한 줄의 종류: 'feeling'(감정표현) | 'ponder'(고민) | 'task'(할 일) */
  function classifyLine(text) {
    const t = String(text || '').trim();
    if (!t) return 'task';
    if (PONDER_RE.test(t)) return 'ponder';
    const tags = extract(t);
    const hasTaskSignal = TASK_SIGNAL_RE.test(t)
      || tags.some((tg) => tg.type === 'work');
    // 구체적 실행 신호가 있으면 감정이 섞여도 할 일
    if (hasTaskSignal) return 'task';
    // 감정 토로(벤트)는 그 자체로 감정 — 길이·감정태그 무관
    if (VENT_RE.test(t)) return 'feeling';
    // 감정 태그가 있고 짧으면 감정표현
    const hasMood = tags.some(
      (tg) => tg.type === 'emotion' || (tg.type === 'energy' && FEELING_LABELS.has(tg.label)),
    );
    const compact = t.replace(/\s/g, '').length <= 24;
    if (hasMood && compact) return 'feeling';
    return 'task';
  }

  function extract(text) {
    if (!text || text.trim().length < 2) return [];
    const tags = [];
    const seen = new Set();

    // 사용자 사전 우선
    extractDictionaryTags(text).forEach((t) => {
      if (seen.has(t.label)) return;
      seen.add(t.label);
      tags.push(t);
    });

    const timeTag = extractTimeTag(text);
    if (timeTag && !seen.has(timeTag.label)) {
      seen.add(timeTag.label);
      tags.push(timeTag);
    }
    const personTag = extractPersonName(text);
    if (personTag && !seen.has(personTag.label)) {
      seen.add(personTag.label);
      tags.push(personTag);
    }

    for (const [re, tag] of PATTERNS) {
      // 구체적 인물(예: "이 대표")이 잡혔으면 일반 person 패턴(인물/가족)은 생략
      if (personTag && tag.type === 'person') continue;
      if (re.test(text) && !seen.has(tag.label)) {
        seen.add(tag.label);
        tags.push({ ...tag });
      }
    }
    return tags.slice(0, 13);
  }

  /** 여러 태그 목록을 라벨 기준으로 중복 없이 합치기 (선순위 목록 우선, 최대 13개) */
  function mergeTags(...lists) {
    const seen = new Set();
    const out = [];
    for (const list of lists) {
      if (!Array.isArray(list)) continue;
      for (const t of list) {
        const label = String(t?.label || '').trim();
        if (!label) continue;
        const key = label.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ type: t.type || 'life', icon: t.icon || '🏷️', label });
      }
    }
    return out.slice(0, 13);
  }

  /** 자유 텍스트를 문장 단위 메모로 분리 */
  function parseToMemos(text) {
    const lines = text
      .split(/[.\n。!?]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 1);
    if (lines.length === 0 && text.trim()) return [text.trim()];
    return lines;
  }

  function toDateStr(d) {
    // 로컬 기준 — UTC(toISOString)는 KST 아침에 어제로 어긋남
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function addDaysStr(base, days) {
    const d = new Date(`${base}T12:00:00`);
    d.setDate(d.getDate() + days);
    return toDateStr(d);
  }

  function weekdayShort(dateStr) {
    const names = ['일', '월', '화', '수', '목', '금', '토'];
    return names[new Date(`${dateStr}T12:00:00`).getDay()];
  }

  function nextWeekdayStr(base, dayName) {
    const map = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };
    const target = map[dayName];
    if (target == null) return base;
    const d = new Date(`${base}T12:00:00`);
    const cur = d.getDay();
    let add = target - cur;
    if (add <= 0) add += 7;
    d.setDate(d.getDate() + add);
    return toDateStr(d);
  }

  function weekendStr(base) {
    const d = new Date(`${base}T12:00:00`);
    const day = d.getDay();
    if (day === 6) return base;
    if (day === 0) return addDaysStr(base, 6);
    d.setDate(d.getDate() + (6 - day));
    return toDateStr(d);
  }

  function nextMondayStr(base) {
    const d = new Date(`${base}T12:00:00`);
    const day = d.getDay();
    const add = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
    d.setDate(d.getDate() + add);
    return toDateStr(d);
  }

  // 시간대 단어 → 오전/오후 보정
  const TIME_PM = ['오후', '저녁', '밤', '낮', '점심'];
  const TIME_AM = ['오전', '새벽', '아침'];

  function parseTimeToken(text) {
    // 1) HH:MM (24시간 명시) 우선
    let m = text.match(/(\d{1,2}):(\d{2})/);
    if (m) return { time: `${String(Number(m[1])).padStart(2, '0')}:${m[2]}`, raw: m[0] };

    // 2) [시간대]? N시 (M분)? [쯤/경]? [에/까지/부터]?  — 꼬리 조사까지 raw에 흡수해 제목을 깨끗하게
    m = text.match(
      /(오전|오후|새벽|아침|점심|낮|저녁|밤)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?\s*(?:쯤|경)?\s*(?:까지|부터|에)?/i,
    );
    if (!m) return null;
    const mer = m[1];
    let h = Number(m[2]);
    const min = m[3] ? Number(m[3]) : 0;
    if (TIME_PM.includes(mer)) {
      if (h < 12) h += 12;
    } else if (TIME_AM.includes(mer)) {
      h %= 12;
    }
    // 시간대 단어가 없으면 적힌 그대로(모호) — 사용자가 시계로 조정
    return { time: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`, raw: m[0] };
  }

  const TRAILING_ACTIONS = [
    { re: /(?:해서\s*)?공유(?:하기)?\s*$/i, tag: { icon: '📤', label: '공유' } },
    { re: /(?:해서\s*)?전송(?:하기)?\s*$/i, tag: { icon: '📤', label: '전송' } },
    { re: /(?:해서\s*)?제출(?:하기)?\s*$/i, tag: { icon: '📎', label: '제출' } },
    { re: /(?:해서\s*)?확인(?:하기)?\s*$/i, tag: { icon: '✅', label: '확인' } },
    { re: /(?:해서\s*)?전화(?:하기)?\s*$/i, tag: { icon: '📞', label: '전화' } },
    { re: /(?:해서\s*)?예약(?:하기)?\s*$/i, tag: { icon: '📅', label: '예약' } },
  ];

  /** Compose / 브레인 덤프용 자연어 → 구조화 */
  function parseComposeInput(text, refDate) {
    if (!text?.trim()) return null;
    const base = refDate || toDateStr(new Date());
    let working = text.trim();
    const result = {
      title: working,
      date: null,
      time: null,
      allDay: false,
      dateHint: null,
      tags: [],
      bucket: null,
    };

    const dateRules = [
      { re: /^(오늘)(?:까지|에)?\s*/i, date: () => base, hint: '오늘' },
      { re: /^(내일)(?:까지|에)?\s*/i, date: () => addDaysStr(base, 1), hint: '내일' },
      { re: /^(모레)(?:까지|에)?\s*/i, date: () => addDaysStr(base, 2), hint: '모레' },
      { re: /^(이번\s*주말)(?:까지|에)?\s*/i, date: () => weekendStr(base), hint: '이번 주말' },
      { re: /^(다음\s*주)(?:까지|에)?\s*/i, date: () => nextMondayStr(base), hint: '다음 주' },
      { re: /^(월|화|수|목|금|토|일)요일(?:까지|에)?\s*/i, date: (m) => nextWeekdayStr(base, m[1]), hint: (m) => `${m[1]}요일` },
    ];

    for (const rule of dateRules) {
      const m = working.match(rule.re);
      if (!m) continue;
      const dateStr = rule.date(m);
      const hintWord = typeof rule.hint === 'function' ? rule.hint(m) : rule.hint;
      result.date = dateStr;
      result.dateHint = `${hintWord} (${weekdayShort(dateStr)})`;
      working = working.replace(rule.re, '').trim();
      break;
    }

    const timeParsed = parseTimeToken(working);
    if (timeParsed) {
      result.time = timeParsed.time;
      working = working.replace(timeParsed.raw, ' ').replace(/\s+/g, ' ').trim();
    } else if (result.date) {
      result.allDay = true;
    }

    if (/\bp1\b/i.test(working)) result.bucket = 'must';
    else if (/\bp2\b/i.test(working)) result.bucket = 'should';
    else if (/\bp3\b/i.test(working)) result.bucket = 'could';
    working = working.replace(/\bp[1-4]\b/gi, '').replace(/\s+/g, ' ').trim();

    TRAILING_ACTIONS.forEach(({ re, tag }) => {
      if (!re.test(working)) return;
      result.tags.push(tag);
      const stripped = working.replace(re, '').trim();
      // 액션을 떼고 남는 게 한 토막뿐이면(예: "치과 예약하기"→"치과") 제목 의미가 깨지므로 보존
      if (stripped.split(/\s+/).filter(Boolean).length >= 2) {
        working = stripped;
      }
    });

    const deHaki = working.replace(/\s*하기\s*$/i, '').trim();
    result.title = deHaki || working || text.trim();
    return result;
  }

  return {
    extract,
    extractCandidates,
    classifyLine,
    mergeTags,
    parseToMemos,
    parseComposeInput,
    setDictionary,
  };
})();
