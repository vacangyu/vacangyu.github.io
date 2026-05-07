// Block external/non-product links so the page becomes a closed prop.
// Anchors with data-keep-link="true" are left alone.
(function () {
  function within(el, selector) { return el.closest(selector); }
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a');
    if (!a) return;
    if (a.hasAttribute('data-keep-link')) return;
    if (a.hasAttribute('data-card-index')) return; // listing-page product cards
    var href = a.getAttribute('href') || '';
    // Allow internal hash and relative html navigation explicitly marked
    if (a.hasAttribute('data-internal')) return;
    ev.preventDefault();
    ev.stopPropagation();
  }, true);
  // Disable form submissions
  document.addEventListener('submit', function (ev) {
    if (!ev.target.hasAttribute('data-keep-form')) {
      ev.preventDefault();
    }
  }, true);
})();
