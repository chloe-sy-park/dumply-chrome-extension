/* AI 통합 — Anthropic / OpenAI / Gemini */

'use strict';

const AlfredoAI = (() => {
  async function callAnthropic(settings, prompt, maxTokens = 600) {
    const key = settings.apiKeys?.anthropic;
    if (!key) throw new Error('NO_KEY');
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: settings.model || 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!resp.ok) throw new Error(`API_${resp.status}`);
    const data = await resp.json();
    return data.content?.[0]?.text || '';
  }

  async function callOpenAI(settings, prompt, maxTokens = 600) {
    const key = settings.apiKeys?.openai;
    if (!key) throw new Error('NO_KEY');
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: settings.openaiModel || 'gpt-4o-mini',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!resp.ok) throw new Error(`API_${resp.status}`);
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async function callGemini(settings, prompt, maxTokens = 600) {
    const key = settings.apiKeys?.google;
    if (!key) throw new Error('NO_KEY');
    const model = settings.geminiModel || 'gemini-2.0-flash';
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens },
        }),
      }
    );
    if (!resp.ok) throw new Error(`API_${resp.status}`);
    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  function activeProvider(settings) {
    const keys = settings.apiKeys || {};
    const has = { anthropic: Boolean(keys.anthropic), openai: Boolean(keys.openai), gemini: Boolean(keys.google) };
    const sel = settings.aiProvider || 'anthropic';
    if (has[sel]) return sel;
    if (has.anthropic) return 'anthropic';
    if (has.openai) return 'openai';
    if (has.gemini) return 'gemini';
    return null;
  }

  async function chat(settings, prompt, maxTokens = 600) {
    const provider = activeProvider(settings) || 'anthropic';
    if (provider === 'openai') return callOpenAI(settings, prompt, maxTokens);
    if (provider === 'gemini') return callGemini(settings, prompt, maxTokens);
    return callAnthropic(settings, prompt, maxTokens);
  }

  function hasKey(settings) {
    return activeProvider(settings) !== null;
  }

  function getLang(settings) {
    return (typeof AlfredoI18n !== 'undefined' ? AlfredoI18n.lang() : null)
      || settings?.language
      || 'ko';
  }

  // ── extractTags ──────────────────────────────────────────────────────────

  const TAGS_PROMPT = {
    ko: `자연어에서 핵심 항목과 감정/상태를 추출하세요. JSON 배열만 반환.

## 태그 유형
- work: 업무/프로젝트 (💼, 📊, 📑 등)
- life: 생활/개인 (🎁, 🦷, 🏃, 🧺, 📺 등)
- person: 사람 (👤)
- date: 날짜/시간 (📅, 🕐 등)
- emotion: 감정/기분 (😊, 😰, 🥱, 😤 등)
- energy: 에너지/컨디션/상태 (☕, 🧠, 🔋, 🔄 등)

## 규칙
- 중복 없이 최대 13개
- 짧은 라벨 (영어 1~2단어, 한국어 2~5글자)
- 감정/에너지는 텍스트에서 암시된 것도 추출 (예: "잠을 못 잤어" → 수면부족)
- 아이콘은 맥락에 맞는 이모지 자유 선택

출력 예시: [{"type":"emotion","icon":"😰","label":"스트레스"},{"type":"energy","icon":"🥱","label":"수면부족"}]`,

    en: `Extract key topics, emotional states, and energy/condition cues from the text. Return a JSON array only.

## Tag types
- work: work/projects (💼, 📊, 📑, etc.)
- life: personal/lifestyle (🎁, 🦷, 🏃, 🧺, 📺, etc.)
- person: people (👤)
- date: dates/times (📅, 🕐, etc.)
- emotion: feelings/mood (😊, 😰, 🥱, 😤, etc.)
- energy: energy/condition/physical state (☕, 🧠, 🔋, 🔄, etc.)

## Rules
- Max 13 tags, no duplicates
- Short labels (1–2 words)
- Extract implied emotions/energy including slang: "burnt out"→exhausted, "can't even"→overwhelmed, "lowkey anxious"→anxious, "brain fog"→unfocused, "fried"→drained, "stressed af"→stressed, "meh"→unmotivated
- Ignore venting filler words (ugh, smh, lol, ngl) — look for the underlying topic or emotion
- Choose the most contextually fitting emoji

Output example: [{"type":"emotion","icon":"😰","label":"stressed"},{"type":"energy","icon":"🥱","label":"sleep-deprived"}]`,
  };

  const VALID_TAG_TYPES = new Set(['work', 'life', 'person', 'date', 'time', 'emotion', 'energy']);

  async function extractTags(settings, text) {
    const clean = String(text || '').trim();
    if (clean.length < 2) return [];
    const lang = getLang(settings);
    const systemPrompt = TAGS_PROMPT[lang] || TAGS_PROMPT.ko;
    const inputLabel = lang === 'en' ? 'Input' : '입력';
    const prompt = `${systemPrompt}\n\n${inputLabel}:\n${clean}`;
    const out = await chat(settings, prompt);
    const match = out.match(/\[[\s\S]*\]/);
    if (!match) return [];
    let parsed;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    return parsed
      .map((t) => ({
        type: VALID_TAG_TYPES.has(t?.type) ? t.type : 'life',
        icon: String(t?.icon || '🏷️').trim() || '🏷️',
        label: String(t?.label || '').trim().slice(0, 12),
      }))
      .filter((t) => {
        if (!t.label) return false;
        const key = t.label.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 13);
  }

  // ── classifyTerm ─────────────────────────────────────────────────────────

  async function classifyTerm(settings, term, context) {
    const clean = String(term || '').trim();
    if (!clean) return null;
    const lang = getLang(settings);
    let prompt;
    if (lang === 'en') {
      prompt =
        `Classify what "${clean}" refers to in the following sentence.\n` +
        `Sentence: ${String(context || clean).trim()}\n` +
        `Category (choose one): pet, person, place, project, etc (everything else)\n` +
        `icon should be the single most fitting emoji.\n` +
        `Respond with JSON only: {"category":"pet","icon":"🐶","label":"${clean}"}`;
    } else {
      prompt =
        `다음 문장에서 "${clean}"이(가) 무엇을 가리키는지 분류하세요.\n` +
        `문장: ${String(context || clean).trim()}\n` +
        `카테고리(하나만): pet(반려동물), person(사람), place(장소), project(업무/프로젝트), etc(기타)\n` +
        `icon은 그 대상에 가장 맞는 이모지 1개.\n` +
        `JSON만 응답: {"category":"pet","icon":"🐶","label":"${clean}"}`;
    }
    const text = await chat(settings, prompt);
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    let o;
    try {
      o = JSON.parse(match[0]);
    } catch {
      return null;
    }
    const valid = new Set(['pet', 'person', 'place', 'project', 'etc']);
    return {
      category: valid.has(o.category) ? o.category : 'etc',
      icon: String(o.icon || '').trim() || null,
      label: String(o.label || clean).trim().slice(0, 12) || clean,
    };
  }

  // ── breakdownTask ─────────────────────────────────────────────────────────

  async function breakdownTask(settings, content, existingTasks = []) {
    const existing = (existingTasks || []).filter(Boolean).slice(0, 20);
    const lang = getLang(settings);
    let prompt;
    if (lang === 'en') {
      const exLine = existing.length
        ? `These tasks already exist — do NOT duplicate them: ${JSON.stringify(existing)}\n`
        : '';
      prompt =
        'Break the following task into 3–5 concrete, ADHD-friendly steps. Each step should be small, clear, and start with an action verb.\n' +
        'In "reason", explain in one sentence why you broke it down this way (e.g. "Split into 4 steps to make it feel less overwhelming").\n' +
        exLine +
        'Respond with JSON only: {"reason":"...","steps":[{"title":"step name","estimatedMinutes":number}]}\n\n<task>\n' +
        content + '\n</task>';
    } else {
      const exLine = existing.length
        ? `이미 별도의 할 일로 존재하는 것들이야. 이것들과 겹치는 단계는 만들지 마(중복 금지): ${JSON.stringify(existing)}\n`
        : '';
      prompt =
        '다음 태스크를 3-5개의 구체적인 실행 단계로 나눠줘. 각 단계는 ADHD 친화적으로 작고 명확해야 해.\n' +
        'reason에는 *왜 이렇게 나눴는지* 한국어 한 문장으로 (예: "큰 작업이라 막막하지 않게 4단계로 쪼갰어요").\n' +
        exLine +
        'JSON으로만 응답: {"reason":"...","steps":[{"title":"단계명","estimatedMinutes":숫자}]}\n\n<task>\n' +
        content + '\n</task>';
    }
    const text = await chat(settings, prompt, 700);
    const obj = text.match(/\{[\s\S]*\}/);
    let reason = null;
    let arr = [];
    if (obj) {
      try {
        const parsed = JSON.parse(obj[0]);
        reason = parsed.reason ? String(parsed.reason).trim() : null;
        arr = Array.isArray(parsed.steps) ? parsed.steps : [];
      } catch { /* 아래 배열 폴백 */ }
    }
    if (!arr.length) {
      const am = text.match(/\[[\s\S]*\]/);
      arr = am ? JSON.parse(am[0]) : [];
    }
    const steps = arr.map((s) => ({
      title: String(s.title || '').trim(),
      estimatedMinutes: Number(s.estimatedMinutes) || null,
      done: false,
    }));
    return { steps, reason };
  }

  // ── estimateDuration ──────────────────────────────────────────────────────

  async function estimateDuration(settings, content) {
    const lang = getLang(settings);
    let prompt;
    if (lang === 'en') {
      prompt =
        'Estimate how many minutes the following task will take (include a realistic ADHD buffer), and explain why in one sentence.\n' +
        'Respond with JSON only: {"minutes":number,"reason":"e.g. About 120 minutes since drafting + review usually runs long"}\n\n<task>\n' +
        content + '\n</task>';
    } else {
      prompt =
        '다음 할 일의 예상 소요시간을 분 단위로 추정하고, *왜 그 시간인지* 한국어 한 문장으로 설명해줘.\n' +
        'JSON으로만 응답: {"minutes":숫자,"reason":"예: 자료가 이미 있어서 2시간이면 충분해요"}\n\n<task>\n' +
        content + '\n</task>';
    }
    const text = await chat(settings, prompt, 300);
    const obj = text.match(/\{[\s\S]*\}/);
    if (!obj) return null;
    const parsed = JSON.parse(obj[0]);
    const minutes = Number(parsed.minutes);
    if (!minutes) return null;
    return { minutes, reason: parsed.reason ? String(parsed.reason).trim() : null };
  }

  // ── reorderPriorities ─────────────────────────────────────────────────────

  async function reorderPriorities(settings, memos, condition) {
    const items = memos
      .filter((m) => !m.completed)
      .map((m) => ({ id: m.id, content: m.content, priority: m.priority }))
      .slice(0, 20);
    const lang = getLang(settings);
    let prompt;
    if (lang === 'en') {
      prompt =
        `User condition: energy ${condition.energy}%, mood ${condition.mood}/5.\n` +
        `Rank the following tasks by today's priority using ADHD-friendly criteria: prefer tasks with external deadlines or consequences, match task complexity to energy level (low energy → simple tasks first), and avoid front-loading overwhelming items.\n` +
        `Include a short reason for each (≤6 words). JSON array only: [{"id":"...","rank":1,"reason":"deadline today"}]\n` +
        JSON.stringify(items);
    } else {
      prompt =
        `사용자 컨디션: 에너지 ${condition.energy}%, 기분 ${condition.mood}/5.\n` +
        `아래 할 일 목록을 오늘 기준 우선순위 순으로 정렬해줘. 각 항목에 왜 이 순위인지 한 줄 이유(reason)도 포함해. JSON 배열만 응답: [{"id":"...","rank":1,"reason":"오늘 마감"}]\n` +
        JSON.stringify(items);
    }
    const text = await chat(settings, prompt);
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  }

  // ── moscowQuestion ────────────────────────────────────────────────────────

  async function moscowQuestion(settings, memos, answers) {
    const open = memos.filter((m) => !m.completed && !m.priority);
    const lang = getLang(settings);
    let prompt;
    if (lang === 'en') {
      prompt =
        `Ask exactly one short, friendly question to help classify these tasks into MoSCoW buckets (Must = critical today, Should = important but not urgent, Could = nice to have, Won\'t = not today). ` +
        `Already answered: ${JSON.stringify(answers)}. ` +
        `Unclassified items:\n<items>\n${open.map((m) => m.content).join('\n')}\n</items>\n` +
        'JSON only: {"question":"question text","options":["option1","option2","option3"]}';
    } else {
      prompt =
        `MoSCoW 우선순위 분류를 돕는 질문을 하나만 해줘. 이미 답한 것: ${JSON.stringify(answers)}. ` +
        `분류 안 된 항목:\n<items>\n${open.map((m) => m.content).join('\n')}\n</items>\n` +
        'JSON만 응답: {"question":"질문","options":["선택1","선택2","선택3"]}';
    }
    const text = await chat(settings, prompt);
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }

  // ── moscowAssign ──────────────────────────────────────────────────────────

  async function moscowAssign(settings, memos, question, answer) {
    const open = memos.filter((m) => !m.completed && !m.priority);
    const lang = getLang(settings);
    let prompt;
    if (lang === 'en') {
      prompt =
        `Question: ${question}\n<user_answer>\n${answer}\n</user_answer>\nItems: ${JSON.stringify(open.map((m) => ({ id: m.id, content: m.content })))}\n` +
        'Based on the answer, assign a MoSCoW bucket to each item.\n' +
        'Must = critical, has a real deadline or consequence today. Should = important but can shift. Could = nice-to-have, no urgency. Wont = skip today.\n' +
        'JSON only: [{"id":"...","priority":"must"}]';
    } else {
      prompt =
        `질문: ${question}\n<user_answer>\n${answer}\n</user_answer>\n항목: ${JSON.stringify(open.map((m) => ({ id: m.id, content: m.content })))}\n` +
        '답변을 바탕으로 각 항목에 must/should/could/wont 중 하나를 배정해줘. JSON만: [{"id":"...","priority":"must"}]';
    }
    const text = await chat(settings, prompt);
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  }

  // ── moscowSuggestBatch ────────────────────────────────────────────────────

  async function moscowSuggestBatch(settings, items) {
    if (!items.length) return [];
    const lang = getLang(settings);
    let prompt;
    if (lang === 'en') {
      prompt =
        'Suggest a MoSCoW bucket (must/should/could/wont) for each inbox task.\n' +
        'Must = critical, real deadline or consequence today. Should = important but flexible. Could = nice-to-have. Wont = skip today.\n' +
        'ADHD-friendly: avoid assigning must to more than 3 items. Prioritise external deadlines and high-consequence tasks.\n' +
        'Treat urgency slang as signals: "asap" or "urgent" → must. "eventually" or "someday" → could/wont.\n' +
        'Expand abbreviations when reading tasks: EOD/COB→end of day, mtg→meeting, DM→message, PR→pull request.\n' +
        '"reason" should be ≤6 words.\n' +
        'JSON array only: [{"id":"...","priority":"should","reason":"dentist, can reschedule"}]\n' +
        `Items: ${JSON.stringify(items.map((m) => ({ id: m.id, content: m.content })))}`;
    } else {
      prompt =
        'Inbox 할 일마다 MoSCoW 버킷(must/should/could/wont)을 하나씩 제안해줘. ADHD 사용자 기준으로 오늘 집중할 것을 구분해.\n' +
        'reason은 한국어 14자 이내로 짧게.\n' +
        'JSON 배열만 응답: [{"id":"...","priority":"should","reason":"치과 예약"}]\n' +
        `항목: ${JSON.stringify(items.map((m) => ({ id: m.id, content: m.content })))}`;
    }
    const text = await chat(settings, prompt, 800);
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    const valid = new Set(['must', 'should', 'could', 'wont']);
    return parsed
      .filter((r) => r?.id && valid.has(r.priority))
      .map((r) => ({
        id: String(r.id),
        priority: r.priority,
        reason: String(r.reason || '').trim().slice(0, 40),
      }));
  }

  // ── extractDump ───────────────────────────────────────────────────────────

  const DUMP_PROMPT = {
    ko: (refDate) =>
      '아래 브레인덤프를 의도 단위로 쪼개고 분류해줘. 한 문장에 여러 의도가 섞여 있으면 *반드시* 나눠. ' +
      '"~하고 ~해야해", "~인데 ~도", "그리고/또" 처럼 연결된 표현은 각각 별도 항목이야.\n' +
      '\n## 먼저 줄임말·구어 시간표현 정규화\n' +
      '낼=내일, 담주=다음 주, 이따/좀이따=잠시 후, 아침→09:00, 점심→12:00, 오후→14:00, 저녁→18:00, 밤→21:00, 새벽→06:00. "오후 N시"는 12를 더해 24시간제로(오후 1시→13:00).\n' +
      '\n## 푸념·감탄사·필러 제거\n' +
      '핵심 의도를 분류하기 전에 앞뒤의 푸념/감탄사/의성어를 떼어내: 와, 아, 헐, 아오, 하, 휴, 쉬익, 쉬익쉬익, ㅠㅠ, ㅋㅋ, 진짜, 왜 아직도, 좀, 그냥, 어휴.\n' +
      '예) "업워크 답장은 왜 아직도 안와 쉬익쉬익" → remember / "업워크 답장 대기" (feeling 아님 — 답장을 기다리는 *팔로업*이야).\n' +
      '문장 *전체*가 행동 없이 감정·상태만일 때만 feeling으로 분류. 행동이 하나라도 섞이면 그 행동이 task/event다.\n' +
      '\n## kind 분류 기준\n' +
      '- "event": 특정 시각에 내가 *가거나 참석/방문*하는 약속·미팅·모임·수업. 예약해서 *데려가거나 방문*하는 것도 event. ("내일 오후 1시 버디 미용 예약해서 데려가기" → event, time 13:00, date 내일 / "3시 미팅" → event)\n' +
      '- "task": 내가 *하는* 행동(만들기/디자인/작성/주문/제출/구매/정하기/준비/연락/정리). 시간이 있어도 행동이면 task. ("인디자인 샘플 디자인" → task, "호이 사료 주문" → task)\n' +
      '- "remember": 지금 할 행동은 아니지만 *기억·확인·팔로업*할 것. 남이 언급한 약속, 답장·결과 대기, 확정 필요, 공유 예정, 날씨·소식 같은 참고. ("업워크 답장 대기" → remember, "내일 비 온다" → remember)\n' +
      '- "feeling": 감정·기분·몸상태·푸념인데 *안에 행동이 전혀 없을 때만*. ("배고프다", "지금 집중 진짜 안된다", "피곤해", "번아웃 올 것 같아")\n' +
      '- "ponder": 아직 *할지 말지 / 뭘 할지* 못 정한 고민만. ("이직할까 말까") — 막연한 망설임만 ponder.\n' +
      '- title: 군더더기·푸념·시간표현 뺀 핵심만 ("이따 7시에 기린굴 방문할건데" → "기린굴 방문")\n' +
      '- time: "HH:MM" 24시간제 또는 null. 위 시간표현 규칙 적용.\n' +
      `- date: "오늘"/"내일"/"YYYY-MM-DD" 또는 null (기준일 ${refDate}). 한 항목의 날짜·시각은 *그 항목에만* 적용 — 다른 항목으로 옮기지 마.\n` +
      '- relatedTo: 이 항목이 *다른 항목보다 먼저* 해야 하는 선행이면 *뒤에 오는 항목*의 title, 아니면 null.\n' +
      '  예) "기린굴 방문 전에 워리스톤 정하기" → 워리스톤의 relatedTo="기린굴 방문".\n' +
      '\n## 분리 예시 (한 줄에 여러 의도 → 각각 분리)\n' +
      '입력: "인디자인으로 챕터 페이지 샘플 디자인 해야하고 내일은 오후 1시에 버디 미용 예약해서 데려가야해. 내일 비도 온다네. 와 지금 집중 진짜 안된다. 업워크 답장은 왜 아직도 안와 쉬익쉬익"\n' +
      '출력: [' +
      '{"title":"인디자인 챕터 페이지 샘플 디자인","kind":"task","time":null,"date":null,"relatedTo":null},' +
      '{"title":"버디 미용 예약 데려가기","kind":"event","time":"13:00","date":"내일","relatedTo":null},' +
      '{"title":"비 예보 확인","kind":"remember","time":null,"date":"내일","relatedTo":null},' +
      '{"title":"집중 안됨","kind":"feeling","time":null,"date":null,"relatedTo":null},' +
      '{"title":"업워크 답장 대기","kind":"remember","time":null,"date":null,"relatedTo":null}]\n' +
      'JSON 배열만 응답.\n\n',

    en: (refDate) =>
      'Parse the brain dump below into intent-level items. Split a sentence if it contains multiple intents.\n' +
      '\n## Normalize abbreviations first\n' +
      'mtg→meeting, 1:1→one-on-one, w/→with, w/o→without, re:→regarding, abt→about, tmrw→tomorrow, rn→right now, asap→as soon as possible, EOD/COB→17:00, DM→message, OOO→out of office, WFH→work from home, lgtm→looks good to me, PR→pull request, arvo→afternoon\n' +
      '\n## Ignore venting/filler prefixes\n' +
      'Strip leading fillers before classifying the core intent: ugh, smh, lol, ngl, tbh, idk, literally, omg, bruh, honestly, low-key, high-key, ok so.\n' +
      'e.g. "ugh need to call dentist tmrw" → task / "call dentist" (not feeling). "lol forgot to reply to Jake" → task / "reply to Jake".\n' +
      'Only classify as "feeling" if the *entire* sentence is about an emotion with no embedded action.\n' +
      '\n## kind rules\n' +
      '- "event": appointments I will *attend or go to* at a specific time. ("meeting Jake at 3pm" → event, "dentist at 10" → event, "standup at 9" → event, "retro tomorrow 2pm" → event)\n' +
      '- "task": actions I need to *do*. Includes informal action verbs: ping/message, hit up/contact, circle back/follow up, loop in, ship/deploy/merge, drop/release, reply, set up, send. Even if a time is mentioned, it\'s a task if it\'s an action. ("ping Alex re proposal by EOD" → task, "ship PR before COB" → task, "hit up Jake about invoice" → task)\n' +
      '- "remember": not an immediate action, but something to *track/follow up on*. Pending confirmations, awaited results, things others mentioned. ("OOO next week, need to set auto-reply" → the auto-reply part is task; OOO itself is context.)\n' +
      '- "feeling": emotions, mood, physical state, venting — ONLY when no action is embedded. ("burnt out rn" → feeling, "can\'t even with this project" → feeling, "lowkey anxious" → feeling)\n' +
      '- "ponder": undecided dilemmas only. ("idk if I should take the job offer tbh" → ponder, "should I switch teams?" → ponder)\n' +
      '- title: core phrase stripped of filler, venting prefixes, and time expressions. Expand abbreviations. ("mtg w/ client tmrw morning" → "meeting with client", "DM client abt timeline asap" → "message client about timeline")\n' +
      '- time: "HH:MM" 24-hour or null. Vague: "morning"→09:00, "afternoon"/"arvo"→14:00, "evening"→18:00, "night"→21:00, "EOD"/"COB"→17:00. No time → null.\n' +
      `- date: "today"/"tomorrow"/"YYYY-MM-DD" or null. "tmrw"→tomorrow (reference date ${refDate})\n` +
      '- relatedTo: if this item must happen *before* another item, set relatedTo to the *later* item\'s title, otherwise null.\n' +
      '  e.g. "decide on size before going to the store" → decide\'s relatedTo="go to the store".\n' +
      'JSON array only: [{"title":"meet Jake downtown","kind":"event","time":"15:00","date":"today","relatedTo":null},{"title":"buy flowers","kind":"task","time":null,"date":null,"relatedTo":"meet Jake downtown"}]\n\n',
  };

  async function extractDump(settings, text, refDate) {
    const lang = getLang(settings);
    const promptBuilder = DUMP_PROMPT[lang] || DUMP_PROMPT.ko;
    const prompt = promptBuilder(refDate) + `<brain_dump>\n${text}\n</brain_dump>`;
    const out = await chat(settings, prompt, 900);
    const match = out.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    const kinds = new Set(['event', 'task', 'remember', 'feeling', 'ponder']);
    return parsed
      .map((r) => ({
        title: String(r.title || '').trim(),
        kind: kinds.has(r.kind) ? r.kind : 'task',
        time: /^\d{1,2}:\d{2}$/.test(r.time) ? r.time : null,
        date: r.date ? String(r.date).trim() : null,
        relatedTo: r.relatedTo ? String(r.relatedTo).trim() : null,
      }))
      .filter((r) => r.title);
  }

  return {
    chat,
    hasKey,
    extractTags,
    classifyTerm,
    breakdownTask,
    estimateDuration,
    reorderPriorities,
    moscowQuestion,
    moscowAssign,
    moscowSuggestBatch,
    extractDump,
  };
})();
