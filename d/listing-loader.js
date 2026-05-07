// Listing card loader — pulls per-card text/image from product-N.md
(function () {
  function applyToCard(idx, data) {
    var root = document.querySelector('[data-card-index="' + idx + '"]');
    if (!root) return;
    function setBind(name, val) {
      var el = root.querySelector('[data-bind="' + name + '"]');
      if (!el) return;
      if (val == null) return;
      if (el.tagName === 'IMG') el.src = val;
      else el.textContent = val;
    }
    setBind('title', data.title);
    setBind('price', data.price);
    setBind('location', data.location || '연희동');
    // Time string. If `bumped: true` and `bumped_time` provided, prefix "끌올 ".
    var timeText = data.time || '';
    if (data.bumped === 'true' || data.bumped === true) {
      timeText = '끌올 ' + (data.bumped_time || data.time || '');
    }
    setBind('time', timeText.trim() || '방금 전');
    // Listing thumbnail uses the first image from manifest
    if (data.images && data.images.length > 0) {
      var imgPath = 'images/product-' + idx + '/' + data.images[0];
      setBind('image', imgPath);
    }
  }

  async function load() {
    for (var i = 1; i <= 2; i++) {
      try {
        var res = await fetch('product-' + i + '.md', { cache: 'no-store' });
        if (!res.ok) continue;
        var text = await res.text();
        var data = window.parseMd ? window.parseMd(text) : {};
        applyToCard(i, data);
      } catch (e) { /* swallow — page still works */ }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
