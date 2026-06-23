/* Dumply Hub — changelog / guide / support 공용 렌더러
   products.json을 단일 소스로 읽어 필터·탭·제품 선택을 자동 구성합니다. */
'use strict';

(function () {
  var TYPE_LABEL = { new: '신규', improve: '개선', fix: '수정' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function getJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.json();
    });
  }

  function productMap(products) {
    var m = {};
    products.forEach(function (p) { m[p.id] = p; });
    return m;
  }

  /* ── 필터 칩 구성: 사용된 제품만 노출 ── */
  function buildFilter(host, products, usedIds, onPick) {
    if (!host) return;
    var chips = [{ id: 'all', name: '전체' }].concat(
      products.filter(function (p) { return usedIds.indexOf(p.id) !== -1; })
    );
    host.innerHTML = chips.map(function (c, i) {
      return '<button type="button" data-id="' + esc(c.id) + '" aria-pressed="' +
        (i === 0) + '">' + esc(c.name) + '</button>';
    }).join('');
    host.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      host.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      onPick(btn.getAttribute('data-id'));
    });
  }

  /* ════════ CHANGELOG ════════ */
  function initChangelog(root) {
    Promise.all([getJSON('products.json'), getJSON('changelog.json')])
      .then(function (res) {
        var products = res[0].products, entries = res[1].entries || [];
        var pm = productMap(products);
        var used = entries.map(function (e) { return e.product; });
        var list = root.querySelector('[data-log]');

        function render(filter) {
          var rows = entries.filter(function (e) { return filter === 'all' || e.product === filter; });
          if (!rows.length) { list.innerHTML = '<p class="hub__empty">아직 기록이 없어요.</p>'; return; }
          list.innerHTML = rows.map(function (e) {
            var pname = pm[e.product] ? pm[e.product].name : e.product;
            return '<article class="log__item">' +
              '<div class="log__meta">' +
                '<span class="log__type log__type--' + esc(e.type) + '">' + esc(TYPE_LABEL[e.type] || e.type) + '</span>' +
                '<span class="log__product">' + esc(pname) + '</span>' +
                (e.version ? '<span class="log__ver">v' + esc(e.version) + '</span>' : '') +
                '<span class="log__date">' + esc(e.date) + '</span>' +
              '</div>' +
              '<h3>' + esc(e.title) + '</h3>' +
              (e.body ? '<p>' + esc(e.body) + '</p>' : '') +
            '</article>';
          }).join('');
        }

        buildFilter(root.querySelector('[data-filter]'), products, used, render);
        render('all');
      })
      .catch(function (err) { console.error(err); });
  }

  /* ════════ GUIDE ════════ */
  function initGuide(root) {
    Promise.all([getJSON('products.json'), getJSON('guide.json')])
      .then(function (res) {
        var products = res[0].products, sections = res[1].sections || [];
        var pm = productMap(products);
        var used = sections.map(function (s) { return s.product; });
        var host = root.querySelector('[data-guide]');

        function render(filter) {
          var rows = sections.filter(function (s) { return filter === 'all' || s.product === filter; });
          if (!rows.length) { host.innerHTML = '<p class="hub__empty">가이드를 준비 중이에요.</p>'; return; }
          host.innerHTML = rows.map(function (s) {
            return '<article class="guide__card">' +
              '<h3>' + esc(s.title) + '</h3>' +
              '<ol class="guide__steps">' +
                (s.steps || []).map(function (st) { return '<li>' + esc(st) + '</li>'; }).join('') +
              '</ol>' +
            '</article>';
          }).join('');
        }

        buildFilter(root.querySelector('[data-filter]'), products, used, render);
        render('all');
      })
      .catch(function (err) { console.error(err); });
  }

  /* ════════ SUPPORT ════════ */
  function initSupport(root) {
    var sel = root.querySelector('[data-product-select]');
    getJSON('products.json').then(function (data) {
      if (!sel) return;
      sel.innerHTML = '<option value="">제품 선택</option>' +
        data.products.map(function (p) {
          return '<option value="' + esc(p.name) + '">' + esc(p.name) + '</option>';
        }).join('');
    }).catch(function (err) { console.error(err); });

    var form = root.querySelector('[data-support-form]');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var to = form.getAttribute('data-email') || 'grammy.labs@gmail.com';
        var product = (sel && sel.value) || '미지정';
        var kind = form.querySelector('[name=kind]') ? form.querySelector('[name=kind]').value : '문의';
        var body = form.querySelector('[name=body]') ? form.querySelector('[name=body]').value : '';
        var subject = '[Dumply ' + kind + '] ' + product;
        var mail = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(body + '\n\n— 제품: ' + product);
        window.location.href = mail;
      });
    }
  }

  /* ── 페이지 자동 감지 ── */
  var root = document.querySelector('[data-hub]');
  if (!root) return;
  var page = root.getAttribute('data-hub');
  if (page === 'changelog') initChangelog(root);
  else if (page === 'guide') initGuide(root);
  else if (page === 'support') initSupport(root);
})();
