/* Dumply Landing — motion */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── nav: condense on scroll ── */
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('is-stuck', window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── scroll reveals ── */
  const reveals = document.querySelectorAll('[data-reveal]');
  if (reduce) {
    reveals.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
    );
    reveals.forEach((el) => io.observe(el));
  }

  /* ── manifesto: word-by-word stagger ── */
  const words = document.querySelectorAll('.manifesto .w');
  if (reduce) {
    words.forEach((w) => w.classList.add('in'));
  } else if (words.length) {
    let i = 0;
    words.forEach((w) => {
      if (w.classList.contains('break')) return;
      w.style.setProperty('--wd', (i * 0.055).toFixed(3) + 's');
      i++;
    });
    const mIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            words.forEach((w) => w.classList.add('in'));
            mIO.disconnect();
          }
        });
      },
      { threshold: 0.45 }
    );
    mIO.observe(document.querySelector('.manifesto'));
  }

  /* ── hero stage: dump → sort, looping while visible ── */
  const stage = document.querySelector('.stage');
  if (stage && !reduce) {
    const CYCLE = 7200;
    let timer = null;
    let visible = false;

    const play = () => {
      stage.classList.remove('is-playing');
      // reflow to restart CSS animations
      void stage.offsetWidth;
      stage.classList.add('is-playing');
    };
    const loop = () => {
      if (!visible) return;
      play();
      timer = setTimeout(loop, CYCLE);
    };

    const sIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          visible = e.isIntersecting;
          if (visible) {
            if (!timer) loop();
          } else {
            clearTimeout(timer);
            timer = null;
          }
        });
      },
      { threshold: 0.3 }
    );
    sIO.observe(stage);
  } else if (stage) {
    stage.classList.add('is-playing');
  }

  /* ── Chrome CTA (스토어 링크 자리) ── */
  const STORE_URL = ''; // TODO: 크롬 웹스토어 게시 후 URL 입력
  document.querySelectorAll('[data-cta="chrome"]').forEach((el) => {
    el.addEventListener('click', (ev) => {
      if (!STORE_URL) {
        ev.preventDefault();
        toast('곧 크롬 웹스토어에 올라가요. 조금만 기다려 주세요! 🐧');
      } else {
        el.setAttribute('href', STORE_URL);
      }
    });
  });

  /* ── notify form (앱 출시 알림 자리) ── */
  document.querySelectorAll('[data-notify]').forEach((form) => {
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const input = form.querySelector('input');
      if (!input.value) return;
      // TODO: 실제 수집 엔드포인트 연결
      toast('알림 신청 완료! 출시되면 가장 먼저 알려드릴게요. ✉️');
      input.value = '';
      input.blur();
    });
  });

  /* ── tiny toast ── */
  let toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
      const s = document.createElement('style');
      s.textContent =
        '.toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(16px);' +
        'background:var(--accent);color:var(--accent-text);font-size:14px;font-weight:500;' +
        'padding:12px 20px;border-radius:999px;box-shadow:var(--shadow-lg);z-index:100;' +
        'opacity:0;transition:opacity .35s,transform .35s var(--ease-out);max-width:90vw;text-align:center;}' +
        '.toast.show{opacity:1;transform:translateX(-50%) translateY(0);}';
      document.head.appendChild(s);
    }
    toastEl.textContent = msg;
    requestAnimationFrame(() => toastEl.classList.add('show'));
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 3200);
  }
})();
