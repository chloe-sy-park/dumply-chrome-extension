/* lib/tags.test.js — AlfredoTags.extractFiveW1H(육하원칙) 단위 테스트 */
/* 크롬 익스텐션 개발자 도구 콘솔 또는 Node에서 실행 가능 */

'use strict';

const TagsW5H1Test = (() => {
  const results = [];

  function test(label, fn) {
    try {
      fn();
      results.push({ pass: true, label });
    } catch (e) {
      results.push({ pass: false, label, error: e.message });
    }
  }

  function assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `기댓값: ${expected}, 실제값: ${actual}`);
    }
  }

  // 입력 문장에서 기대하는 필드만 검증 (나머지는 무관)
  function expectW(input, expect) {
    test(`"${input}"`, () => {
      const got = AlfredoTags.extractFiveW1H(input);
      Object.entries(expect).forEach(([k, v]) => {
        assertEqual(got[k], v, `${k} — 기댓값: ${JSON.stringify(v)}, 실제값: ${JSON.stringify(got[k])}`);
      });
    });
  }

  function run() {
    results.length = 0;
    AlfredoTags.setDictionary([]);

    /* ── who (누구와) ── */
    expectW('엄마랑 같이 병원 가기', { who: '엄마' });
    expectW('팀장님과 미팅 준비', { who: '팀장님' });
    expectW('지수랑 강남 카페에서 커피 마시기', { who: '지수', where: '강남 카페' });
    expectW('dinner with Sam at the cafe', { who: 'Sam', where: 'cafe' });
    // 명사 나열(빨래랑 설거지)은 사람으로 오인하면 안 됨
    expectW('빨래랑 설거지 하기', { who: null });

    /* ── where (어디서) ── */
    expectW('집에서 걸어서 도서관 가기', { where: '집', how: '걸어서' });
    expectW('내일 회사에서 발표 준비', { where: '회사' }); // 시간어 "내일"은 장소에서 제외

    /* ── how (어떻게) ── */
    expectW('전화로 치과 예약 문의하기', { how: '전화' });
    expectW('줌으로 회의 참석', { how: '줌' });
    expectW('call the client by phone', { how: 'phone' });

    /* ── why (왜) ── */
    expectW('마감 때문에 보고서 서둘러야 함', { why: '마감 때문에' });
    expectW('선물 사려고 백화점 들르기', { why: '선물 사려고' });
    expectW('call the client because the deadline is close', { why: 'the deadline is close' });

    /* ── 아무것도 없을 때 ── */
    expectW('샘플 디자인 해야함', { who: null, where: null, how: null, why: null });

    /* ── 사용자 사전(person) 우선 ── */
    test('사전에 등록된 사람 이름을 who로 인식한다', () => {
      AlfredoTags.setDictionary([{ term: '버디', type: 'person', label: '버디' }]);
      assertEqual(AlfredoTags.extractFiveW1H('버디랑 산책 가기').who, '버디');
      AlfredoTags.setDictionary([]);
    });

    const passed = results.filter((r) => r.pass).length;
    console.log(`\n=== TagsW5H1Test: ${passed}/${results.length} 통과 ===`);
    results.filter((r) => !r.pass).forEach((r) => console.error(`  ✗ ${r.label}: ${r.error}`));
    return results.every((r) => r.pass);
  }

  return { run };
})();

// Node 환경이면 바로 실행 (브라우저 콘솔에서는 TagsW5H1Test.run() 호출)
if (typeof window === 'undefined' && typeof require !== 'undefined') {
  const ok = TagsW5H1Test.run();
  if (typeof process !== 'undefined') process.exitCode = ok ? 0 : 1;
}
