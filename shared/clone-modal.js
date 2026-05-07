// Clone-site password gate — shared
// Site sets window.__CLONE_SITE_KEY (storage scope) before this script.
// Password hash is shared across DAANGN/GOOGLE.
(function () {
  var STORAGE_KEY = window.__CLONE_SITE_KEY || 'clone-gate-default';
  // SHA-256 hashes of accepted gate passwords (kept out of plaintext).
  // Accepts the Korean password and the same keystrokes typed with an English layout.
  var EXPECTED_HASHES = [
    '1f917a47e9e7501360f22cef15b35ea6ea6fbf94043595ac900836ec3df8c429',
    '56b5cb21e0103a36868bac413ad054ae6d1d95371226565e6de57ecd4e02501e'
  ];

  if (sessionStorage.getItem(STORAGE_KEY) === 'shown' ||
      localStorage.getItem(STORAGE_KEY) === 'shown') return;

  function ce(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }

  async function sha256Hex(s) {
    if (!window.crypto || !crypto.subtle) return sha256HexFallback(s);
    var enc = new TextEncoder().encode(s);
    var buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf))
      .map(function (b) { return b.toString(16).padStart(2, '0'); })
      .join('');
  }

  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }

  function sha256HexFallback(s) {
    var bytes = Array.from(new TextEncoder().encode(s));
    var bitLength = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (var i = 7; i >= 0; i--) bytes.push((bitLength / Math.pow(256, i)) & 255);

    var h = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];
    var k = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    for (var offset = 0; offset < bytes.length; offset += 64) {
      var w = new Array(64);
      for (var j = 0; j < 16; j++) {
        var p = offset + j * 4;
        w[j] = ((bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3]) >>> 0;
      }
      for (j = 16; j < 64; j++) {
        var s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        var s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
      }

      var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (j = 0; j < 64; j++) {
        var S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
        var ch = (e & f) ^ ((~e) & g);
        var temp1 = (hh + S1 + ch + k[j] + w[j]) >>> 0;
        var S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var temp2 = (S0 + maj) >>> 0;
        hh = g;
        g = f;
        f = e;
        e = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }
      h[0] = (h[0] + a) >>> 0;
      h[1] = (h[1] + b) >>> 0;
      h[2] = (h[2] + c) >>> 0;
      h[3] = (h[3] + d) >>> 0;
      h[4] = (h[4] + e) >>> 0;
      h[5] = (h[5] + f) >>> 0;
      h[6] = (h[6] + g) >>> 0;
      h[7] = (h[7] + hh) >>> 0;
    }

    return h.map(function (word) {
      return ('00000000' + word.toString(16)).slice(-8);
    }).join('');
  }

  function buildGate() {
    var bd = ce('div', 'clone-gate-backdrop');
    bd.setAttribute('role', 'dialog');
    bd.setAttribute('aria-modal', 'true');
    bd.setAttribute('aria-labelledby', 'clone-gate-title');

    var card = ce('div', 'clone-gate-card');

    var title = ce('h1', 'clone-gate-title', '벌래 파이팅!');
    title.id = 'clone-gate-title';
    card.appendChild(title);

    card.appendChild(ce('p', 'clone-gate-sub', '비밀번호를 입력하세요'));

    var input = ce('input', 'clone-gate-input');
    input.type = 'password';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('lang', 'ko');
    input.setAttribute('inputmode', 'text');
    input.setAttribute('aria-label', '비밀번호');
    card.appendChild(input);

    var err = ce('div', 'clone-gate-error-msg', '비밀번호가 일치하지 않습니다.');
    card.appendChild(err);

    var btn = ce('button', 'clone-gate-btn', '입력');
    btn.type = 'button';
    card.appendChild(btn);

    bd.appendChild(card);

    function showError() {
      err.classList.add('shown');
      input.classList.add('is-error');
      card.classList.remove('shake');
      // Force reflow so animation restarts
      void card.offsetWidth;
      card.classList.add('shake');
      setTimeout(function () { card.classList.remove('shake'); }, 500);
    }
    function clearError() {
      err.classList.remove('shown');
      input.classList.remove('is-error');
    }

    async function trySubmit() {
      var v = input.value || '';
      if (!v) { showError(); return; }
      btn.disabled = true;
      try {
        var hashes = await Promise.all([v, v.trim(), v.trim().toLowerCase()].map(sha256Hex));
        if (hashes.some(function (h) { return EXPECTED_HASHES.indexOf(h) >= 0; })) {
          localStorage.setItem(STORAGE_KEY, 'shown');
          var rect = btn.getBoundingClientRect();
          var ox = rect.left + rect.width / 2;
          var oy = rect.top + rect.height / 2;
          bd.remove();
          fireConfetti(ox, oy);
        } else {
          showError();
          input.select();
        }
      } catch (error) {
        showError();
        input.select();
      } finally {
        btn.disabled = false;
      }
    }

    input.addEventListener('input', clearError);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); trySubmit(); }
    });
    btn.addEventListener('click', trySubmit);

    setTimeout(function () { try { input.focus(); } catch (e) {} }, 80);
    return bd;
  }

  // Vanilla canvas confetti — no deps. ~180 particles, gravity, tilt.
  function fireConfetti(ox, oy) {
    var canvas = document.createElement('canvas');
    canvas.className = 'clone-confetti-canvas';
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    var W = window.innerWidth, H = window.innerHeight;
    var colors = ['#cc785c', '#FFB100', '#34C759', '#0A84FF', '#AF52DE', '#FF375F', '#FFD60A', '#5AC8FA'];
    var n = 180;
    var particles = [];
    for (var i = 0; i < n; i++) {
      var ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
      var spd = 6 + Math.random() * 13;
      particles.push({
        x: ox, y: oy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        g: 0.22 + Math.random() * 0.14,
        size: 6 + Math.random() * 7,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.5,
        color: colors[(Math.random() * colors.length) | 0],
        life: 1.0,
        decay: 0.006 + Math.random() * 0.011
      });
    }
    var start = performance.now();
    function tick() {
      ctx.clearRect(0, 0, W, H);
      var alive = 0;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        if (p.life <= 0) continue;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.g;
        p.vx *= 0.99;
        p.rot += p.vrot;
        p.life -= p.decay;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
        ctx.restore();
        if (p.life > 0 && p.y < H + 30) alive++;
      }
      if (alive > 0 && performance.now() - start < 5000) {
        requestAnimationFrame(tick);
      } else {
        canvas.remove();
      }
    }
    requestAnimationFrame(tick);
  }

  function init() {
    document.body.appendChild(buildGate());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
