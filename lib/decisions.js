/* 판단 로그 — AI 제안에 대한 사용자의 판단 행동을 기록/집계
 *
 * 핵심 가설: 사용자가 AI 제안을 그대로 수락했는가 / 수정했는가 / 지웠는가.
 * 모든 제안 기능(현재 moscow)이 이 한 모듈을 거쳐 같은 형태로 남는다.
 */

'use strict';

const AlfredoDecisions = (() => {
  const ACTIONS = ['accepted', 'modified', 'rejected', 'deleted', 'deferred'];

  function uid() {
    return AlfredoStorage.uid();
  }

  /** state.decisions에 1건 적재 후 그 레코드를 반환. 저장(persist)은 호출자 책임. */
  function record(state, partial) {
    if (!state) return null;
    if (!Array.isArray(state.decisions)) state.decisions = [];
    const entry = {
      id: uid(),
      suggestionId: partial.suggestionId || null,
      feature: partial.feature || 'moscow',
      action: ACTIONS.includes(partial.action) ? partial.action : 'deferred',
      diff: partial.diff || null,
      rationaleSeen: Boolean(partial.rationaleSeen),
      latencyMs: Number.isFinite(partial.latencyMs) ? partial.latencyMs : null,
      suggestSource: partial.suggestSource || null, // 'ai' | 'local'
      decidedAt: Date.now(),
    };
    state.decisions.push(entry);
    return entry;
  }

  /**
   * MoSCoW 분류 판단을 기록.
   * 제안(memo.suggestedPriority)이 없으면 측정 대상이 아님(수동 분류) → null.
   * 제안과 선택이 같으면 accepted, 다르면 modified(+diff).
   * memo의 suggest* 필드가 null로 밀리기 "전에" 호출해야 한다.
   */
  function logMoscowDecision(state, memo, chosenGrade) {
    if (!memo) return null;
    const suggested = memo.suggestedPriority;
    if (!suggested) return null; // 제안이 없던 항목 — AI 정확도 평가 대상 아님

    const accepted = suggested === chosenGrade;
    return record(state, {
      suggestionId: memo.suggestId,
      feature: 'moscow',
      action: accepted ? 'accepted' : 'modified',
      diff: accepted
        ? null
        : { before: { grade: suggested }, after: { grade: chosenGrade }, changedFields: ['grade'] },
      rationaleSeen: memo.reasonSeen === true,
      latencyMs: memo.suggestedAt ? Date.now() - memo.suggestedAt : null,
      suggestSource: memo.suggestSource,
    });
  }

  /**
   * 브레인덤프 추출 판단을 기록.
   * 파서가 제안한 항목(memo.parseSnapshot) vs 사용자의 처리.
   * - accepted: 그대로 분류함(제목 안 고침)
   * - modified: 제목을 고침 (+diff)
   * - rejected: 삭제함
   * parseJudged로 1회만 기록.
   */
  function logDumpDecision(state, memo, action) {
    const snap = memo?.parseSnapshot;
    if (!snap || memo.parseJudged) return null;
    memo.parseJudged = true;
    const diff =
      action === 'modified'
        ? { before: { title: snap.title }, after: { title: memo.content }, changedFields: ['title'] }
        : null;
    return record(state, {
      suggestionId: snap.id,
      feature: 'dump_extract',
      action,
      diff,
      rationaleSeen: memo.parseReasonSeen === true,
      latencyMs: snap.at ? Date.now() - snap.at : null,
      suggestSource: snap.source || 'local',
    });
  }

  /** 판단 1건 이상을 로그에서 제거 — 사용자가 그 행동을 되돌렸을 때(undo) 호출. */
  function remove(state, ids) {
    if (!state?.decisions || ids == null) return;
    const set = new Set(Array.isArray(ids) ? ids : [ids]);
    state.decisions = state.decisions.filter((d) => !set.has(d.id));
  }

  /**
   * 하위 작업 쪼개기 판단을 기록.
   * AI가 제안한 단계 집합(memo.stepsSuggestion) vs 최종 단계(memo.steps)를 비교.
   * - 전부 비움 → rejected
   * - AI 단계 그대로(빼지도 더하지도 않음) → accepted
   * - 일부 편집/추가/삭제 → modified (+ kept/removed/added)
   * 텍스트 편집은 "1개 삭제 + 1개 추가"로 잡혀 modified로 분류된다(근사).
   */
  function logSplitDecision(state, memo) {
    const sug = memo?.stepsSuggestion;
    if (!sug || !Array.isArray(sug.steps) || !sug.steps.length) return null;
    const norm = (t) => String(t || '').trim().toLowerCase();
    const before = sug.steps.map((s) => norm(s.text)).filter(Boolean);
    const after = (memo.steps || []).map((s) => norm(s.text)).filter(Boolean);
    const afterSet = new Set(after);
    const beforeSet = new Set(before);
    const kept = before.filter((t) => afterSet.has(t)).length;
    const removed = before.length - kept;
    const added = after.filter((t) => !beforeSet.has(t)).length;

    let action;
    if (!after.length) action = 'rejected';
    else if (!removed && !added) action = 'accepted';
    else action = 'modified';

    return record(state, {
      suggestionId: sug.id,
      feature: 'subtask_split',
      action,
      diff:
        action === 'modified'
          ? {
              before: { steps: before.length },
              after: { steps: after.length },
              changedFields: ['steps'],
              kept,
              removed,
              added,
            }
          : null,
      rationaleSeen: true, // 쪼갠 단계가 항상 화면에 보임
      latencyMs: sug.at ? Date.now() - sug.at : null,
      suggestSource: 'ai',
    });
  }

  /** 판단 안 한 제안을 품은 채로 항목이 삭제됨. 항목 소멸이라 제안 품질과 분리해 본다. */
  function logDeletedWithSuggestion(state, memo) {
    if (!memo || !memo.suggestedPriority) return null;
    return record(state, {
      suggestionId: memo.suggestId,
      feature: 'moscow',
      action: 'deleted',
      rationaleSeen: memo.reasonSeen === true,
      latencyMs: memo.suggestedAt ? Date.now() - memo.suggestedAt : null,
      suggestSource: memo.suggestSource,
    });
  }

  /**
   * 집계. deleted는 항목 소멸이라 정확도 분모에서 제외.
   * acceptanceRate = accepted / (accepted + modified + rejected)
   */
  function stats(state, feature = null) {
    const all = (state?.decisions || []).filter((d) => !feature || d.feature === feature);
    const by = (a) => all.filter((d) => d.action === a).length;
    const counts = {
      accepted: by('accepted'),
      modified: by('modified'),
      rejected: by('rejected'),
      deleted: by('deleted'),
      deferred: by('deferred'),
    };
    const judged = counts.accepted + counts.modified + counts.rejected;
    const moves = {}; // "must→should" 빈도
    all.forEach((d) => {
      if (d.action === 'modified' && d.diff?.before?.grade && d.diff?.after?.grade) {
        const k = `${d.diff.before.grade}→${d.diff.after.grade}`;
        moves[k] = (moves[k] || 0) + 1;
      }
    });
    const topMoves = Object.entries(moves).sort((a, b) => b[1] - a[1]);

    // 핵심 가설: 근거를 본 제안의 수락률이 더 높은가?
    // judged(=accepted/modified/rejected)만 대상으로 seen/unseen 수락률을 가른다.
    const judgedList = all.filter((d) => ['accepted', 'modified', 'rejected'].includes(d.action));
    const rateOf = (list) =>
      list.length ? list.filter((d) => d.action === 'accepted').length / list.length : null;
    const seenList = judgedList.filter((d) => d.rationaleSeen);
    const unseenList = judgedList.filter((d) => !d.rationaleSeen);

    // AI vs 로컬 제안 비교
    const aiList = judgedList.filter((d) => d.suggestSource === 'ai');

    return {
      total: all.length,
      counts,
      acceptanceRate: judged ? counts.accepted / judged : null,
      topMoves, // [["must→should", 3], ...]
      acceptanceBySeen: { seen: rateOf(seenList), unseen: rateOf(unseenList) },
      seenCount: seenList.length,
      unseenCount: unseenList.length,
      aiAcceptanceRate: rateOf(aiList),
    };
  }

  return {
    ACTIONS,
    record,
    remove,
    logMoscowDecision,
    logSplitDecision,
    logDumpDecision,
    logDeletedWithSuggestion,
    stats,
  };
})();
