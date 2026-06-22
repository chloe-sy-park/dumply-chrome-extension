/* 법적 고지 페이지 — 한국어/영어 토글 */
'use strict';

(function () {
  var ko = document.getElementById('doc-ko');
  var en = document.getElementById('doc-en');
  var btnKo = document.getElementById('lang-ko');
  var btnEn = document.getElementById('lang-en');
  if (!ko || !en || !btnKo || !btnEn) return;

  function set(lang) {
    var isKo = lang === 'ko';
    ko.hidden = !isKo;
    en.hidden = isKo;
    btnKo.setAttribute('aria-pressed', String(isKo));
    btnEn.setAttribute('aria-pressed', String(!isKo));
    document.documentElement.lang = lang;
  }

  btnKo.addEventListener('click', function () { set('ko'); });
  btnEn.addEventListener('click', function () { set('en'); });

  // 브라우저 언어가 영어면 영어로 기본 표시
  if ((navigator.language || '').slice(0, 2).toLowerCase() === 'en') set('en');
})();
