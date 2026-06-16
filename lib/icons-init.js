document.querySelectorAll('[data-icon]').forEach(function(el) {
  if (typeof DumplyIcons !== 'undefined') {
    el.appendChild(DumplyIcons.icon(el.dataset.icon));
  }
});
