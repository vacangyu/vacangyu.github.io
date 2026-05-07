// Tiny .md/.txt frontmatter parser for the listing/detail pages.
// Format:
//   ---
//   title: ...
//   price: ...
//   ...
//   images: a.jpg, b.jpg
//   ---
//   <body content (used as 본문)>
window.parseMd = function (text) {
  var data = {};
  var body = '';
  var stripped = text.replace(/^﻿/, ''); // BOM
  var fmMatch = stripped.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  var head, rest;
  if (fmMatch) { head = fmMatch[1]; rest = fmMatch[2]; }
  else { head = stripped; rest = ''; }

  head.split('\n').forEach(function (line) {
    line = line.replace(/\r$/, '');
    if (!line.trim() || line.trim().startsWith('#')) return;
    var idx = line.indexOf(':');
    if (idx < 0) return;
    var k = line.slice(0, idx).trim();
    var v = line.slice(idx + 1).trim();
    // strip surrounding quotes
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    data[k] = v;
  });

  if (data.images) {
    data.images = data.images.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  } else {
    data.images = [];
  }

  data.body = rest.trim();
  return data;
};
