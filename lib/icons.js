/* lib/icons.js — lucide 인라인 SVG 아이콘 시스템 */
/* 외부 CDN 없음, innerHTML 없음 (CSP 안전, XSS 방지) */

'use strict';

const DumplyIcons = (() => {
  /* ── SVG path 데이터 맵 ─────────────────────────────────────── */
  /* 출처: lucide.dev (MIT License) */
  const ICONS = {
    'brain': [
      'M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z',
      'M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z',
      'M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4',
      'M17.599 6.5a3 3 0 0 0 .399-1.375',
      'M6.003 5.125A3 3 0 0 0 6.401 6.5',
      'M3.477 10.896a4 4 0 0 1 .585-.396',
      'M19.938 10.5a4 4 0 0 1 .585.396',
      'M6 18a4 4 0 0 1-1.967-.516',
      'M19.967 17.484A4 4 0 0 1 18 18',
    ],
    'target': [
      'M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
      'M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0',
      'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0',
    ],
    'clock': [
      'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
      'M12 6v6l4 2',
    ],
    'check-circle': [
      'M22 11.08V12a10 10 0 1 1-5.93-9.14',
      'M22 4 12 14.01l-3-3',
    ],
    'circle': [
      'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
    ],
    'chevron-right': [
      'M9 18l6-6-6-6',
    ],
    'mic': [
      'M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z',
      'M19 10v2a7 7 0 0 1-14 0v-2',
      'M12 19v3',
      'M8 22h8',
    ],
    'sparkles': [
      'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z',
      'M20 3v4',
      'M22 5h-4',
      'M4 17v2',
      'M5 18H3',
    ],
    'settings': [
      'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
      'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
    ],
    'plus': [
      'M12 5v14',
      'M5 12h14',
    ],
    'refresh-cw': [
      'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8',
      'M21 3v5h-5',
      'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16',
      'M8 16H3v5',
    ],
    'zap': [
      'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z',
    ],
    'smile': [
      'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
      'M8 14s1.5 2 4 2 4-2 4-2',
      'M9 9h.01',
      'M15 9h.01',
    ],
    'calendar': [
      'M8 2v4',
      'M16 2v4',
      'M3 10h18',
      'M21 8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z',
    ],
    'grip-vertical': [
      'M9 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
      'M9 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
      'M9 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
      'M15 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
      'M15 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
      'M15 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
    ],
    'trending-up': [
      'M22 7 13.5 15.5l-5-5L2 17',
      'M16 7h6v6',
    ],
    'book-open': [
      'M12 7v14',
      'M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z',
    ],
    'droplet': [
      'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z',
    ],
    'pen': [
      'M12 20h9',
      'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
    ],
    'x': [
      'M18 6 6 18',
      'M6 6l12 12',
    ],
    'bell': [
      'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9',
      'M10.3 21a1.94 1.94 0 0 0 3.4 0',
    ],
    'trending-down': [
      'M22 17l-8.5-8.5-5 5L2 7',
      'M16 17h6v-6',
    ],
    'minus': [
      'M5 12h14',
    ],
    'lock': [
      'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z',
      'M7 11V7a5 5 0 0 1 10 0v4',
    ],
  };

  /* ── 헬퍼 함수 ──────────────────────────────────────────────── */

  /**
   * lucide 아이콘 SVG 엘리먼트를 반환합니다.
   * @param {string} name - 아이콘 이름 (예: 'clock', 'plus')
   * @param {object} opts - 옵션
   * @param {number}  opts.size        - 크기(px), 기본 20
   * @param {string}  opts.className   - 추가 CSS 클래스
   * @param {string}  opts.ariaLabel   - 접근성 레이블 (없으면 aria-hidden)
   * @param {number}  opts.strokeWidth - 선 굵기, 기본 1.75
   * @returns {SVGElement}
   */
  function icon(name, opts = {}) {
    const {
      size = 20,
      className = '',
      ariaLabel = '',
      strokeWidth = 1.75,
    } = opts;

    const paths = ICONS[name];

    /* SECURITY-05, SECURITY-15: 알 수 없는 이름은 경고 + 빈 placeholder 반환 */
    if (!paths) {
      if (typeof console !== 'undefined') {
        console.warn(`[DumplyIcons] 알 수 없는 아이콘 이름: "${name}". iconNames()로 목록을 확인하세요.`);
      }
      return _makeSvg([], name, size, className, ariaLabel, strokeWidth);
    }

    return _makeSvg(paths, name, size, className, ariaLabel, strokeWidth);
  }

  /* SECURITY-09: innerHTML 미사용 — createElementNS로만 생성 */
  function _makeSvg(paths, name, size, className, ariaLabel, strokeWidth) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');

    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', String(strokeWidth));
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    if (className) svg.setAttribute('class', `icon${className ? ' ' + className : ''}`);
    else svg.setAttribute('class', 'icon');

    if (ariaLabel) {
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', ariaLabel);
    } else {
      svg.setAttribute('aria-hidden', 'true');
    }

    for (const d of paths) {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      svg.appendChild(p);
    }

    return svg;
  }

  /** 등록된 아이콘 이름 목록을 반환합니다. */
  function iconNames() {
    return Object.keys(ICONS);
  }

  return { icon, iconNames, ICONS };
})();
