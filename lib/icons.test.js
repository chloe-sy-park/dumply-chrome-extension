/* lib/icons.test.js — DumplyIcons 단위 테스트 */
/* 브라우저 환경 시뮬레이션 필요 (JSDOM 또는 실제 브라우저 콘솔에서 실행) */

'use strict';

/**
 * 간단한 테스트 러너 (외부 의존성 없음)
 * 크롬 익스텐션 개발자 도구 콘솔에서 바로 실행 가능
 */
const IconsTest = (() => {
  const results = [];

  function test(label, fn) {
    try {
      fn();
      results.push({ pass: true, label });
    } catch (e) {
      results.push({ pass: false, label, error: e.message });
    }
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message || '검증 실패');
  }

  function assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `기댓값: ${expected}, 실제값: ${actual}`);
    }
  }

  function run() {
    results.length = 0;

    /* ── Step 5: 기본 동작 ─────────────────────────────────── */

    test('icon("clock") 은 SVGElement를 반환한다', () => {
      const el = DumplyIcons.icon('clock');
      assert(el instanceof SVGElement, 'SVGElement가 아님');
    });

    test('반환된 엘리먼트의 태그는 svg다', () => {
      const el = DumplyIcons.icon('clock');
      assertEqual(el.tagName.toLowerCase(), 'svg');
    });

    test('viewBox가 "0 0 24 24"다', () => {
      const el = DumplyIcons.icon('clock');
      assertEqual(el.getAttribute('viewBox'), '0 0 24 24');
    });

    test('ariaLabel 없으면 aria-hidden="true"가 붙는다', () => {
      const el = DumplyIcons.icon('plus');
      assertEqual(el.getAttribute('aria-hidden'), 'true');
    });

    test('ariaLabel 있으면 role="img"와 aria-label이 붙는다', () => {
      const el = DumplyIcons.icon('plus', { ariaLabel: '추가' });
      assertEqual(el.getAttribute('role'), 'img');
      assertEqual(el.getAttribute('aria-label'), '추가');
    });

    test('fill은 "none"이다 (선 아이콘)', () => {
      const el = DumplyIcons.icon('settings');
      assertEqual(el.getAttribute('fill'), 'none');
    });

    test('stroke는 "currentColor"다 (CSS 토큰으로 제어 가능)', () => {
      const el = DumplyIcons.icon('settings');
      assertEqual(el.getAttribute('stroke'), 'currentColor');
    });

    /* ── Step 6: 옵션 ─────────────────────────────────────── */

    test('size 옵션이 width/height에 적용된다', () => {
      const el = DumplyIcons.icon('clock', { size: 32 });
      assertEqual(el.getAttribute('width'), '32');
      assertEqual(el.getAttribute('height'), '32');
    });

    test('size 기본값은 20이다', () => {
      const el = DumplyIcons.icon('clock');
      assertEqual(el.getAttribute('width'), '20');
    });

    test('className 옵션이 class에 포함된다', () => {
      const el = DumplyIcons.icon('smile', { className: 'nav-icon' });
      assert(el.getAttribute('class').includes('nav-icon'), 'className이 없음');
    });

    test('className 없으면 class는 "icon"이다', () => {
      const el = DumplyIcons.icon('smile');
      assertEqual(el.getAttribute('class'), 'icon');
    });

    test('strokeWidth 옵션이 stroke-width에 적용된다', () => {
      const el = DumplyIcons.icon('zap', { strokeWidth: 2 });
      assertEqual(el.getAttribute('stroke-width'), '2');
    });

    test('strokeWidth 기본값은 1.75이다', () => {
      const el = DumplyIcons.icon('zap');
      assertEqual(el.getAttribute('stroke-width'), '1.75');
    });

    /* ── Step 7: 보안·예외 처리 (SECURITY-05, 15) ───────── */

    test('존재하지 않는 이름은 null/undefined가 아닌 SVGElement를 반환한다', () => {
      const originalWarn = console.warn;
      console.warn = () => {};
      const el = DumplyIcons.icon('존재하지않는아이콘');
      console.warn = originalWarn;
      assert(el instanceof SVGElement, 'null 또는 undefined가 반환됨');
    });

    test('존재하지 않는 이름일 때 console.warn이 호출된다', () => {
      let warned = false;
      const originalWarn = console.warn;
      console.warn = () => { warned = true; };
      DumplyIcons.icon('없는아이콘');
      console.warn = originalWarn;
      assert(warned, 'console.warn이 호출되지 않음');
    });

    test('빈 문자열 입력 시에도 SVGElement를 반환한다', () => {
      const originalWarn = console.warn;
      console.warn = () => {};
      const el = DumplyIcons.icon('');
      console.warn = originalWarn;
      assert(el instanceof SVGElement, 'null 또는 undefined가 반환됨');
    });

    test('innerHTML을 사용하지 않는다 (path는 자식 엘리먼트)', () => {
      const el = DumplyIcons.icon('plus');
      const paths = el.querySelectorAll('path');
      assert(paths.length > 0, 'path 자식 엘리먼트가 없음');
    });

    /* ── Step 8: 전체 아이콘 목록 ─────────────────────────── */

    test('iconNames()가 18개를 반환한다', () => {
      const names = DumplyIcons.iconNames();
      assertEqual(names.length, 18, `아이콘 수: ${names.length}`);
    });

    test('18개 아이콘 모두 SVGElement 생성 가능하다', () => {
      const names = DumplyIcons.iconNames();
      for (const name of names) {
        const el = DumplyIcons.icon(name);
        assert(el instanceof SVGElement, `${name}: SVGElement가 아님`);
      }
    });

    test('모든 아이콘에 path 자식이 1개 이상 있다', () => {
      const names = DumplyIcons.iconNames();
      for (const name of names) {
        const el = DumplyIcons.icon(name);
        const paths = el.querySelectorAll('path');
        assert(paths.length > 0, `${name}: path가 없음`);
      }
    });

    /* ── 결과 출력 ─────────────────────────────────────────── */
    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass);

    console.group(`DumplyIcons 테스트: ${passed}/${results.length} 통과`);
    for (const r of results) {
      if (r.pass) {
        console.log(`  ✅ ${r.label}`);
      } else {
        console.error(`  ❌ ${r.label} — ${r.error}`);
      }
    }
    console.groupEnd();

    if (failed.length === 0) {
      console.log('🎉 모든 테스트 통과!');
    } else {
      console.error(`⚠️ ${failed.length}개 실패`);
    }

    return { passed, total: results.length, failed };
  }

  return { run };
})();

/* 자동 실행: 이 파일을 브라우저 콘솔에서 로드하면 즉시 실행됩니다 */
if (typeof DumplyIcons !== 'undefined') {
  IconsTest.run();
} else {
  console.error('[IconsTest] DumplyIcons를 먼저 로드해주세요 (lib/icons.js)');
}
