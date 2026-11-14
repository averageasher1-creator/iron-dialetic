/* IRON DIALECTIC — superevent illustrations. Each scene is drawn as layered silhouettes against a
   gradient sky, in a poster palette built from the state's own colour. ID.Scene.svg(theme, seed, col)
   returns an SVG string; the same theme and seed always draw the same picture. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const Sc = (ID.Scene = {});
  const W = 1000, H = 420;
  const f = (v) => (Math.round(v * 10) / 10).toString();

  function rngOf(seed) {
    let h = 2166136261; for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const mix = (a, b, t) => '#' + [0, 1, 2].map((k) => Math.round(parseInt(a.substr(1 + k * 2, 2), 16) * (1 - t) + parseInt(b.substr(1 + k * 2, 2), 16) * t).toString(16).padStart(2, '0')).join('');

  /* ---------------------------------------------------------------- primitives */
  const sky = (top, hor, glow, gx, gy, gr) => '<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + top + '"/><stop offset="1" stop-color="' + hor + '"/></linearGradient>' +
    '<radialGradient id="gl" cx="' + gx / W + '" cy="' + gy / H + '" r="' + (gr || 0.5) + '"><stop offset="0" stop-color="' + glow + '" stop-opacity=".95"/><stop offset=".35" stop-color="' + glow + '" stop-opacity=".35"/><stop offset="1" stop-color="' + glow + '" stop-opacity="0"/></radialGradient></defs>' +
    '<rect width="' + W + '" height="' + H + '" fill="url(#sk)"/><rect width="' + W + '" height="' + H + '" fill="url(#gl)"/>';
  function rays(cx, cy, n, col, op) {
    let s = '<g fill="' + col + '" opacity="' + op + '">';
    for (let k = 0; k < n; k++) { const a0 = Math.PI + (k / n) * Math.PI, a1 = a0 + Math.PI / n / 2; s += '<path d="M' + cx + ' ' + cy + 'L' + f(cx + Math.cos(a0) * 1600) + ' ' + f(cy + Math.sin(a0) * 1600) + 'L' + f(cx + Math.cos(a1) * 1600) + ' ' + f(cy + Math.sin(a1) * 1600) + 'Z"/>'; }
    return s + '</g>';
  }
  function ground(y, col) { return '<rect x="0" y="' + y + '" width="' + W + '" height="' + (H - y) + '" fill="' + col + '"/>'; }
  function hills(y, amp, col, r) {
    let d = 'M0 ' + H + 'L0 ' + y; const n = 8;
    for (let k = 1; k <= n; k++) { const x = (k / n) * W, cx = x - W / n / 2; d += 'Q' + f(cx) + ' ' + f(y - amp * (0.4 + r())) + ' ' + f(x) + ' ' + f(y + (r() - 0.5) * amp * 0.5); }
    return '<path d="' + d + 'L' + W + ' ' + H + 'Z" fill="' + col + '"/>';
  }
  function mountains(y, col, r, snow, hi) {
    let d = 'M0 ' + H + 'L0 ' + y, x = 0, pts = [];
    while (x < W) { const w = 60 + r() * 120, h = (hi || 150) * (0.4 + r() * 0.7); pts.push([x + w / 2, y - h]); d += 'L' + f(x + w / 2) + ' ' + f(y - h) + 'L' + f(x + w) + ' ' + f(y - h * 0.3 * r()); x += w; }
    let s = '<path d="' + d + 'L' + W + ' ' + H + 'Z" fill="' + col + '"/>';
    if (snow) for (const p of pts) s += '<path d="M' + f(p[0]) + ' ' + f(p[1]) + 'l-16 26 9-4 7 8 8-9 9 5Z" fill="' + snow + '" opacity=".8"/>';
    return s;
  }
  /* A crowd: heads and shoulders, with banners, flags and raised fists. */
  function crowd(y, n, col, r, o) {
    o = o || {}; let s = '<g fill="' + col + '">', sc = o.scale || 1;
    const pole = [];
    for (let k = 0; k < n; k++) {
      const x = (k / n) * (W + 40) - 20 + (r() - 0.5) * (W / n), hh = (16 + r() * 8) * sc, by = y - r() * 10 * sc;
      s += '<circle cx="' + f(x) + '" cy="' + f(by - hh) + '" r="' + f(6.5 * sc) + '"/><path d="M' + f(x - 13 * sc) + ' ' + f(H + 10) + 'Q' + f(x - 12 * sc) + ' ' + f(by - hh + 8 * sc) + ' ' + f(x) + ' ' + f(by - hh + 7 * sc) + 'Q' + f(x + 12 * sc) + ' ' + f(by - hh + 8 * sc) + ' ' + f(x + 13 * sc) + ' ' + f(H + 10) + 'Z"/>';
      if (o.fists && r() < o.fists) s += '<path d="M' + f(x + 6 * sc) + ' ' + f(by - hh + 6 * sc) + 'l' + f(9 * sc) + ' ' + f(-26 * sc) + 'l' + f(4 * sc) + ' ' + f(2 * sc) + 'l' + f(-7 * sc) + ' ' + f(25 * sc) + 'Z"/><circle cx="' + f(x + 16 * sc) + '" cy="' + f(by - hh - 22 * sc) + '" r="' + f(4.2 * sc) + '"/>';
      if (o.poles && r() < o.poles) pole.push([x, by - hh]);
    }
    s += '</g>';
    for (const [x, py] of pole) {
      const sc2 = Math.max(1, (o.scale || 1) * 0.8), h = (60 + r() * 50) * sc2, fw = (34 + r() * 26) * sc2, fl = o.flag || col, wv = (6 + r() * 6) * sc2;
      s += '<line x1="' + f(x) + '" y1="' + f(py) + '" x2="' + f(x) + '" y2="' + f(py - h) + '" stroke="' + col + '" stroke-width="2.5"/>' +
        '<path d="M' + f(x) + ' ' + f(py - h) + 'q' + f(fw / 2) + ' ' + f(-wv) + ' ' + f(fw) + ' 0v' + f(fw * 0.62) + 'q' + f(-fw / 2) + ' ' + f(-wv) + ' ' + f(-fw) + ' 0Z" fill="' + fl + '"/>';
    }
    if (o.banner) { const bx = 120 + r() * 520, bw = 220 + r() * 120, by = y - 70; s += '<line x1="' + f(bx) + '" y1="' + f(by + 70) + '" x2="' + f(bx) + '" y2="' + f(by - 10) + '" stroke="' + col + '" stroke-width="3"/><line x1="' + f(bx + bw) + '" y1="' + f(by + 70) + '" x2="' + f(bx + bw) + '" y2="' + f(by - 10) + '" stroke="' + col + '" stroke-width="3"/><rect x="' + f(bx) + '" y="' + f(by - 10) + '" width="' + f(bw) + '" height="28" fill="' + o.banner + '"/>'; }
    return s;
  }
  function masses(col, r, o) {
    o = o || {};
    return crowd(o.y1 || 372, o.n1 || 34, mix(col, '#3a3530', 0.25), r, Object.assign({}, o, { scale: (o.s1 || 1.5), banner: null, poles: 0 })) + crowd(o.y2 || 418, o.n2 || 17, col, r, Object.assign({}, o, { scale: o.s2 || 2.5, poles: (o.poles || 0) * 0.6 }));
  }
  function soldiers(y, n, col, sc, r) {
    let s = '<g fill="' + col + '">';
    for (let k = 0; k < n; k++) {
      const x = (k + 0.5) * (W / n) + (r() - 0.5) * 6, h = 52 * sc;
      s += '<path d="M' + f(x - 7 * sc) + ' ' + f(y) + 'l' + f(2 * sc) + ' ' + f(-h * 0.55) + 'h' + f(10 * sc) + 'l' + f(2 * sc) + ' ' + f(h * 0.55) + 'Z"/>' +
        '<rect x="' + f(x - 7 * sc) + '" y="' + f(y - h * 0.82) + '" width="' + f(14 * sc) + '" height="' + f(h * 0.32) + '" rx="' + f(3 * sc) + '"/>' +
        '<circle cx="' + f(x) + '" cy="' + f(y - h * 0.9) + '" r="' + f(5 * sc) + '"/><path d="M' + f(x - 8 * sc) + ' ' + f(y - h * 0.9) + 'a' + f(8 * sc) + ' ' + f(6 * sc) + ' 0 0 1 ' + f(16 * sc) + ' 0Z"/>' +
        '<line x1="' + f(x + 7 * sc) + '" y1="' + f(y - h * 0.6) + '" x2="' + f(x + 3 * sc) + '" y2="' + f(y - h * 1.45) + '" stroke="' + col + '" stroke-width="' + f(2.2 * sc) + '"/>';
    }
    return s + '</g>';
  }
  function chimneys(x, y, w, col, r, smoke) {
    let s = '<path d="M' + x + ' ' + y + 'v-60l' + w * 0.2 + ' -24v24l' + w * 0.2 + ' -24v24l' + w * 0.2 + ' -24v24h' + w * 0.4 + 'v60Z" fill="' + col + '"/>';
    const k = 2 + Math.floor(r() * 3);
    for (let i = 0; i < k; i++) {
      const cx = x + w * (0.15 + i * 0.25), ch = 90 + r() * 90;
      s += '<rect x="' + f(cx) + '" y="' + f(y - 60 - ch) + '" width="13" height="' + f(ch) + '" fill="' + col + '"/>';
      if (smoke) for (let p = 0; p < 6; p++) s += '<circle cx="' + f(cx + 7 + p * 18 + r() * 10) + '" cy="' + f(y - 72 - ch - p * 14) + '" r="' + f(10 + p * 5) + '" fill="' + smoke + '" opacity="' + f(0.5 - p * 0.07) + '"/>';
    }
    return s;
  }
  function cityline(y, col, r, tall) {
    let s = '<g fill="' + col + '">', x = 0;
    while (x < W) { const w = 26 + r() * 60, h = (tall || 80) * (0.4 + r()); s += '<rect x="' + f(x) + '" y="' + f(y - h) + '" width="' + f(w) + '" height="' + f(h + 2) + '"/>'; if (r() < 0.25) s += '<rect x="' + f(x + w / 2 - 3) + '" y="' + f(y - h - 26) + '" width="6" height="26"/>'; x += w + r() * 6; }
    return s + '</g>';
  }
  function cathedral(cx, y, sc, col) {
    const p = (v) => f(v * sc);
    return '<g fill="' + col + '" transform="translate(' + cx + ' ' + y + ')">' +
      '<rect x="' + p(-150) + '" y="' + p(-120) + '" width="' + p(300) + '" height="' + p(120) + '"/>' +
      '<rect x="' + p(-60) + '" y="' + p(-190) + '" width="' + p(120) + '" height="' + p(80) + '"/>' +
      '<path d="M' + p(-62) + ' ' + p(-188) + 'Q' + p(-62) + ' ' + p(-300) + ' 0 ' + p(-310) + 'Q' + p(62) + ' ' + p(-300) + ' ' + p(62) + ' ' + p(-188) + 'Z"/>' +
      '<rect x="' + p(-4) + '" y="' + p(-360) + '" width="' + p(8) + '" height="' + p(55) + '"/><rect x="' + p(-16) + '" y="' + p(-345) + '" width="' + p(32) + '" height="' + p(7) + '"/>' +
      '<rect x="' + p(-150) + '" y="' + p(-230) + '" width="' + p(46) + '" height="' + p(110) + '"/><path d="M' + p(-150) + ' ' + p(-228) + 'L' + p(-127) + ' ' + p(-300) + 'L' + p(-104) + ' ' + p(-228) + 'Z"/>' +
      '<rect x="' + p(104) + '" y="' + p(-230) + '" width="' + p(46) + '" height="' + p(110) + '"/><path d="M' + p(104) + ' ' + p(-228) + 'L' + p(127) + ' ' + p(-300) + 'L' + p(150) + ' ' + p(-228) + 'Z"/>' +
      '</g>';
  }
  function parliament(cx, y, sc, col, lite) {
    const p = (v) => f(v * sc);
    let s = '<g transform="translate(' + cx + ' ' + y + ')"><g fill="' + col + '"><rect x="' + p(-240) + '" y="' + p(-20) + '" width="' + p(480) + '" height="' + p(20) + '"/>' +
      '<rect x="' + p(-220) + '" y="' + p(-120) + '" width="' + p(440) + '" height="' + p(100) + '"/><path d="M' + p(-235) + ' ' + p(-118) + 'L0 ' + p(-178) + 'L' + p(235) + ' ' + p(-118) + 'Z"/>' +
      '<rect x="' + p(-70) + '" y="' + p(-230) + '" width="' + p(140) + '" height="' + p(60) + '"/><path d="M' + p(-80) + ' ' + p(-228) + 'A' + p(80) + ' ' + p(80) + ' 0 0 1 ' + p(80) + ' ' + p(-228) + 'Z"/><rect x="' + p(-3) + '" y="' + p(-340) + '" width="' + p(6) + '" height="' + p(40) + '"/></g>';
    for (let k = 0; k < 9; k++) s += '<rect x="' + p(-190 + k * 47) + '" y="' + p(-108) + '" width="' + p(14) + '" height="' + p(86) + '" fill="' + lite + '" opacity=".22"/>';
    return s + '</g>';
  }
  function domes(cx, y, sc, col) {
    const p = (v) => f(v * sc);
    return '<g fill="' + col + '" transform="translate(' + cx + ' ' + y + ')"><rect x="' + p(-200) + '" y="' + p(-90) + '" width="' + p(400) + '" height="' + p(90) + '"/>' +
      '<path d="M' + p(-90) + ' ' + p(-88) + 'Q' + p(-90) + ' ' + p(-230) + ' 0 ' + p(-250) + 'Q' + p(90) + ' ' + p(-230) + ' ' + p(90) + ' ' + p(-88) + 'Z"/><rect x="' + p(-3) + '" y="' + p(-290) + '" width="' + p(6) + '" height="' + p(44) + '"/>' +
      '<path d="M' + p(-190) + ' ' + p(-88) + 'Q' + p(-190) + ' ' + p(-150) + ' ' + p(-150) + ' ' + p(-160) + 'Q' + p(-110) + ' ' + p(-150) + ' ' + p(-110) + ' ' + p(-88) + 'Z"/><path d="M' + p(110) + ' ' + p(-88) + 'Q' + p(110) + ' ' + p(-150) + ' ' + p(150) + ' ' + p(-160) + 'Q' + p(190) + ' ' + p(-150) + ' ' + p(190) + ' ' + p(-88) + 'Z"/>' +
      '<rect x="' + p(-260) + '" y="' + p(-280) + '" width="' + p(22) + '" height="' + p(280) + '"/><path d="M' + p(-264) + ' ' + p(-278) + 'L' + p(-249) + ' ' + p(-320) + 'L' + p(-234) + ' ' + p(-278) + 'Z"/>' +
      '<rect x="' + p(238) + '" y="' + p(-280) + '" width="' + p(22) + '" height="' + p(280) + '"/><path d="M' + p(234) + ' ' + p(-278) + 'L' + p(249) + ' ' + p(-320) + 'L' + p(264) + ' ' + p(-278) + 'Z"/></g>';
  }
  function ships(y, n, col, r, war, big) {
    let s = '<g fill="' + col + '">';
    for (let k = 0; k < n; k++) {
      const x = 40 + (k + r() * 0.5) * (W - 200) / n, sc = (0.6 + r() * 0.7) * (big || 1), w = 170 * sc, h = 18 * sc;
      s += '<path d="M' + f(x) + ' ' + f(y) + 'l' + f(w) + ' 0l' + f(-18 * sc) + ' ' + f(h) + 'h' + f(-w + 30 * sc) + 'Z"/>';
      s += '<rect x="' + f(x + w * 0.35) + '" y="' + f(y - 26 * sc) + '" width="' + f(w * 0.3) + '" height="' + f(26 * sc) + '"/><rect x="' + f(x + w * 0.45) + '" y="' + f(y - 52 * sc) + '" width="' + f(12 * sc) + '" height="' + f(28 * sc) + '"/>';
      if (war) s += '<rect x="' + f(x + w * 0.12) + '" y="' + f(y - 12 * sc) + '" width="' + f(w * 0.16) + '" height="' + f(12 * sc) + '"/><line x1="' + f(x + w * 0.2) + '" y1="' + f(y - 8 * sc) + '" x2="' + f(x - 10 * sc) + '" y2="' + f(y - 14 * sc) + '" stroke="' + col + '" stroke-width="' + f(4 * sc) + '"/><line x1="' + f(x + w * 0.5) + '" y1="' + f(y - 52 * sc) + '" x2="' + f(x + w * 0.5) + '" y2="' + f(y - 90 * sc) + '" stroke="' + col + '" stroke-width="2"/>';
    }
    return s + '</g>';
  }
  function water(y, col, lite, r) {
    let s = '<rect x="0" y="' + y + '" width="' + W + '" height="' + (H - y) + '" fill="' + col + '"/>';
    for (let k = 0; k < 40; k++) { const yy = y + 6 + r() * (H - y - 10), x = r() * W; s += '<rect x="' + f(x) + '" y="' + f(yy) + '" width="' + f(20 + r() * 80) + '" height="2" fill="' + lite + '" opacity="' + f(0.15 + r() * 0.3) + '"/>'; }
    return s;
  }
  function searchlights(y, n, col, r) {
    let s = '<g fill="' + col + '">';
    for (let k = 0; k < n; k++) { const x = 80 + r() * 840, a = -Math.PI / 2 + (r() - 0.5) * 1.1, l = 600; s += '<path d="M' + f(x) + ' ' + y + 'L' + f(x + Math.cos(a - 0.05) * l) + ' ' + f(y + Math.sin(a - 0.05) * l) + 'L' + f(x + Math.cos(a + 0.05) * l) + ' ' + f(y + Math.sin(a + 0.05) * l) + 'Z" opacity=".18"/>'; }
    return s + '</g>';
  }
  function stars(n, r) { let s = '<g fill="#fff">'; for (let k = 0; k < n; k++) s += '<circle cx="' + f(r() * W) + '" cy="' + f(r() * H * 0.7) + '" r="' + f(0.6 + r() * 1.4) + '" opacity="' + f(0.3 + r() * 0.7) + '"/>'; return s + '</g>'; }
  function planes(n, col, r) {
    let s = '<g fill="' + col + '">';
    for (let k = 0; k < n; k++) { const x = 100 + r() * 800, y = 40 + r() * 120, sc = 0.5 + r() * 0.7; s += '<path transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + f(sc) + ')" d="M-30 0h60l6 3h-72ZM-6 -2l-10 -22h8l14 22ZM-6 3l-10 22h8l14 -22ZM24 0l8 -10h4l-4 10Z"/>'; }
    return s + '</g>';
  }
  function wire(y, col) { let d = 'M0 ' + y; for (let x = 0; x <= W; x += 14) d += 'L' + x + ' ' + (y + ((x / 14) % 2 ? -7 : 7)); return '<path d="' + d + '" stroke="' + col + '" stroke-width="1.6" fill="none"/>' + Array.from({ length: 12 }, (_, k) => '<line x1="' + (k * 90 + 20) + '" y1="' + (y + 18) + '" x2="' + (k * 90 + 26) + '" y2="' + (y - 22) + '" stroke="' + col + '" stroke-width="4"/>').join(''); }
  function clock(cx, cy, rr, col, lite) {
    let s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + rr + '" fill="' + lite + '" opacity=".92"/><circle cx="' + cx + '" cy="' + cy + '" r="' + rr + '" fill="none" stroke="' + col + '" stroke-width="7"/>';
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; s += '<line x1="' + f(cx + Math.sin(a) * rr * 0.8) + '" y1="' + f(cy - Math.cos(a) * rr * 0.8) + '" x2="' + f(cx + Math.sin(a) * rr * 0.92) + '" y2="' + f(cy - Math.cos(a) * rr * 0.92) + '" stroke="' + col + '" stroke-width="' + (k % 3 ? 3 : 6) + '"/>'; }
    const am = -0.035 * Math.PI * 2, ah = -0.012 * Math.PI * 2;
    return s + '<line x1="' + cx + '" y1="' + cy + '" x2="' + f(cx + Math.sin(am) * rr * 0.86) + '" y2="' + f(cy - Math.cos(am) * rr * 0.86) + '" stroke="' + col + '" stroke-width="5"/><line x1="' + cx + '" y1="' + cy + '" x2="' + f(cx + Math.sin(ah) * rr * 0.56) + '" y2="' + f(cy - Math.cos(ah) * rr * 0.56) + '" stroke="' + col + '" stroke-width="9"/><circle cx="' + cx + '" cy="' + cy + '" r="8" fill="' + col + '"/>';
  }
  function bigflag(x, y, w, col, pole) {
    return '<line x1="' + x + '" y1="' + (y + 260) + '" x2="' + x + '" y2="' + y + '" stroke="' + pole + '" stroke-width="6"/><path d="M' + x + ' ' + y + 'q' + w * 0.25 + ' -26 ' + w * 0.5 + ' 0t' + w * 0.5 + ' 0v' + w * 0.6 + 'q' + -w * 0.25 + ' -26 ' + -w * 0.5 + ' 0t' + -w * 0.5 + ' 0Z" fill="' + col + '"/>';
  }
  function fields(y, col, lite) { let s = '<rect x="0" y="' + y + '" width="' + W + '" height="' + (H - y) + '" fill="' + col + '"/>'; for (let k = -12; k <= 12; k++) s += '<line x1="' + (500 + k * 12) + '" y1="' + y + '" x2="' + (500 + k * 110) + '" y2="' + H + '" stroke="' + lite + '" stroke-width="2" opacity=".2"/>'; return s; }

  /* ---------------------------------------------------------------- scenes */
  const INK = '#0f0d0a';
  const T = {
    crown: (c, r) => sky(mix(c.n, INK, 0.75), '#e9b44c', '#ffe7a3', 500, 300, 0.6) + rays(500, 210, 18, '#fff3c4', 0.12) + cityline(330, mix(c.n, INK, 0.6), r, 60) + cathedral(500, 330, 0.95, INK) + masses(INK, r, { poles: 0.1, flag: c.n }),
    revolution: (c, r) => sky('#3a0b08', '#e2581e', '#ffb04a', 640, 330, 0.55) + chimneys(40, 330, 260, mix('#3a0b08', INK, 0.4), r, '#5a1a10') + chimneys(700, 330, 280, mix('#3a0b08', INK, 0.4), r, '#5a1a10') + ground(326, mix('#3a0b08', INK, 0.4)) + bigflag(560, 50, 300, c.flag || '#c8281e', INK) + masses(INK, r, { fists: 0.4, poles: 0.12, flag: c.flag || '#c8281e' }),
    parliament: (c, r) => sky('#7d97b3', '#f2e2be', '#fff8e1', 760, 160, 0.5) + rays(760, 160, 14, '#ffffff', 0.1) + cityline(330, '#8a93a0', r, 50) + parliament(500, 335, 1, mix(c.n, INK, 0.7), '#ffffff') + masses(INK, r, { poles: 0.08, flag: c.n }),
    industry: (c, r) => sky('#1d2533', '#f0954a', '#ffd38a', 300, 300, 0.6) + chimneys(40, 330, 200, mix('#1d2533', INK, 0.3), r, '#3a3330') + chimneys(720, 330, 240, mix('#1d2533', INK, 0.3), r, '#3a3330') +
      '<g stroke="' + INK + '" stroke-width="5" fill="none"><path d="M360 330V90h14V330M374 96L560 96M374 96L440 60M520 96v60"/><path d="M640 330L668 150L696 330M650 260h36M656 210h24M668 150l-40 20M668 150l40 20"/></g><path d="M512 156h16v22h-16Z" fill="' + INK + '"/>' +
      chimneys(380, 330, 240, INK, r, '#4a4038') + ground(328, INK) + masses(INK, r, { y1: 380, n1: 24, s1: 1.4, y2: 420, n2: 12, s2: 2.4 }),
    army: (c, r) => sky('#141820', mix(c.n, '#2a2420', 0.5), mix(c.n, '#ffe0a0', 0.5), 500, 380, 0.6) + searchlights(330, 7, '#fff7d6', r) + cityline(330, '#0c0b09', r, 70) + soldiers(352, 22, '#1d1b16', 1.0, r) + soldiers(390, 15, '#13110d', 1.5, r) + soldiers(440, 9, INK, 2.3, r) + bigflag(60, 50, 170, c.n, INK) + bigflag(880, 50, 170, c.n, INK),
    sea: (c, r) => sky('#1e2b45', '#f2a15a', '#ffd690', 500, 260, 0.5) + water(280, '#13213a', '#ffd690', r) + ships(286, 3, INK, r, c.war, 1.9) + '<path d="M840 280v-130h26v130Z" fill="' + INK + '"/><path d="M853 150L1000 110V190Z" fill="#fff4c4" opacity=".25"/>',
    mountain: (c, r) => sky('#5b6f86', '#e3d7c0', '#ffffff', 300, 120, 0.4) + mountains(260, '#7c8798', r, '#f4f1ea', 170) + mountains(330, '#4a5260', r, '#e9e6de', 120) + '<g fill="' + INK + '" transform="translate(560 250) scale(1.8)"><path d="M0 0h120v-34h-14v-12h-12v12h-14v-12h-12v12h-14v-12h-12v12h-14v-12h-14v12h-14Z"/><rect x="50" y="-70" width="20" height="40"/><path d="M60 -96v26M60 -96l22 7-22 7Z" stroke="' + INK + '" stroke-width="2"/></g>' + mountains(380, INK, r, null, 60) + soldiers(424, 8, INK, 2.1, r),
    atom: (c, r) => sky('#2a1a12', '#f0a050', '#fff3c0', 500, 300, 0.7) + '<g><ellipse cx="500" cy="96" rx="180" ry="70" fill="#f3d9a0"/><ellipse cx="500" cy="80" rx="140" ry="52" fill="#fff0c8"/><path d="M450 140Q470 230 455 330H545Q530 230 550 140Z" fill="#f3d9a0"/><ellipse cx="500" cy="150" rx="110" ry="24" fill="#e8c080" opacity=".8"/><ellipse cx="500" cy="330" rx="260" ry="26" fill="#f3d9a0" opacity=".6"/></g>' + ground(328, '#24160e') + crowd(420, 9, INK, r, { scale: 2.6 }),
    space: (c, r) => sky('#05070f', '#1d2d55', '#7aa0ff', 500, 420, 0.45) + stars(160, r) + '<path d="M120 300Q500 -40 900 300" fill="none" stroke="#ffffff" stroke-dasharray="4 8" opacity=".5"/><g transform="translate(760 130)"><circle r="8" fill="#e6ecff"/><line x1="-6" y1="0" x2="-30" y2="16" stroke="#e6ecff" stroke-width="2"/><line x1="6" y1="0" x2="28" y2="18" stroke="#e6ecff" stroke-width="2"/></g>' +
      '<g transform="translate(300 330)"><path d="M-14 0V-150Q0 -200 14 -150V0Z" fill="#d7d2c8"/><path d="M-14 -20l-18 22h18ZM14 -20l18 22h-18Z" fill="#b8b0a2"/><path d="M-12 2Q0 70 12 2Z" fill="#ffc46a"/></g><path d="M240 330l30-170h8l-20 170Z" fill="' + INK + '"/>' + ground(330, '#0b0d16') + '<path d="M700 330a70 70 0 0 1 120 -40l-20 40Z" fill="' + INK + '"/>' + crowd(420, 12, INK, r, { scale: 2.4 }),
    machine: (c, r) => { let s = sky('#04191b', '#0d3b3d', '#3fe0c8', 500, 170, 0.5); s += '<rect x="330" y="50" width="340" height="190" fill="#06282a" stroke="#3fe0c8" stroke-width="3"/><circle cx="500" cy="145" r="58" fill="none" stroke="#3fe0c8" stroke-width="4"/><circle cx="500" cy="145" r="22" fill="#9ff7e6"/>'; for (let k = 0; k < 6; k++) { s += '<path d="M' + (340 + k * 60) + ' 210 l20 -' + (10 + r() * 40) + ' l20 ' + (10 + r() * 40) + '" stroke="#3fe0c8" fill="none" opacity=".5"/>'; } for (let gx = 0; gx < 2; gx++) for (let k = 0; k < 12; k++) { const x = gx ? 700 + (k % 4) * 70 : 40 + (k % 4) * 70, y = 70 + Math.floor(k / 4) * 80; s += '<rect x="' + x + '" y="' + y + '" width="58" height="66" fill="#082426" stroke="#155e5c"/>'; for (let d = 0; d < 6; d++) s += '<circle cx="' + (x + 10 + (d % 3) * 18) + '" cy="' + (y + 14 + Math.floor(d / 3) * 18) + '" r="3" fill="' + (r() < 0.5 ? '#3fe0c8' : '#f0c860') + '" opacity="' + f(0.4 + r() * 0.6) + '"/>'; } s += ground(330, '#021012'); for (let k = 0; k < 7; k++) { const x = 140 + k * 120; s += '<g fill="' + INK + '"><circle cx="' + x + '" cy="318" r="12"/><path d="M' + (x - 20) + ' 380q2-50 20-50q18 0 20 50Z"/><rect x="' + (x - 34) + '" y="352" width="68" height="10"/></g>'; } return s; },
    faith: (c, r) => sky('#3a2a4a', '#f0b86a', '#fff0c4', 500, 320, 0.6) + rays(500, 300, 16, '#fff3d0', 0.13) + domes(500, 330, 1, INK) + ground(328, INK) + masses(INK, r, {}),
    war: (c, r) => sky('#262420', '#8a6a4a', '#ffb070', 760, 300, 0.4) + planes(6, '#141210', r) + '<g fill="#3a3530" opacity=".7">' + Array.from({ length: 7 }, () => '<circle cx="' + f(r() * W) + '" cy="' + f(200 + r() * 90) + '" r="' + f(30 + r() * 60) + '"/>').join('') + '</g>' + Array.from({ length: 4 }, () => '<circle cx="' + f(r() * W) + '" cy="' + f(260 + r() * 40) + '" r="' + f(14 + r() * 16) + '" fill="#ffd27a" opacity=".85"/>').join('') + hills(320, 30, '#1c1a16', r) + wire(345, INK) + soldiers(440, 8, INK, 2.3, r) + '<rect x="0" y="405" width="' + W + '" height="20" fill="' + INK + '"/>',
    peace: (c, r) => sky('#7aa3c8', '#f6dca0', '#fff6dc', 500, 330, 0.5) + rays(500, 330, 16, '#ffffff', 0.08) + hills(320, 24, '#7c8a4a', r) + fields(330, '#5c6a34', '#e8e0a8') + '<g fill="#c8281e">' + Array.from({ length: 50 }, () => '<circle cx="' + f(r() * W) + '" cy="' + f(345 + r() * 75) + '" r="' + f(2 + r() * 3) + '"/>').join('') + '</g>' + soldiers(440, 6, INK, 2.2, r),
    crisis: (c, r) => sky('#06080f', '#25324e', '#9cb6ff', 500, 420, 0.5) + stars(80, r) + clock(500, 150, 110, INK, '#e9e2cf') + water(300, '#0a1222', '#9cb6ff', r) + ships(300, 4, INK, r, true) + '<g fill="' + INK + '"><path d="M60 300l90-120h12l-80 120Z"/><path d="M850 300l70-140h12l-62 140Z"/></g>',
    wall: (c, r) => sky('#5b6068', '#c9c4b6', '#ffffff', 500, 200, 0.4) + cityline(300, '#6e7178', r, 90) + '<rect x="0" y="260" width="' + W + '" height="70" fill="#9c988c"/>' + Array.from({ length: 25 }, (_, k) => '<line x1="' + k * 42 + '" y1="260" x2="' + k * 42 + '" y2="330" stroke="#6e6b62" stroke-width="2"/>').join('') + '<path d="M700 330v-160h50v160Z" fill="' + INK + '"/><path d="M690 170h70l-10-24h-50Z" fill="' + INK + '"/><path d="M725 160L520 330H600Z" fill="#fff" opacity=".2"/>' + wire(258, INK) + ground(330, '#2a2925') + crowd(420, 10, INK, r, { scale: 2.5 }),
    crowd: (c, r) => sky('#2b2f3a', '#d06040', '#ffb070', 500, 300, 0.5) + cityline(320, '#1c1d22', r, 140) + '<g fill="#3b342c">' + Array.from({ length: 60 }, () => '<rect x="' + f(320 + r() * 360) + '" y="' + f(300 + r() * 50) + '" width="' + f(14 + r() * 12) + '" height="' + f(10 + r() * 8) + '" transform="rotate(' + f((r() - 0.5) * 40) + ' 500 330)"/>').join('') + '</g>' + masses(INK, r, { fists: 0.35, poles: 0.08, flag: '#c8281e' }),
    commune: (c, r) => sky('#1a1210', '#b0402a', '#ffa860', 500, 330, 0.55) + hills(320, 40, '#2a1a14', r) + bigflag(470, 60, 280, '#c8281e', INK) + '<path d="M470 60q70 -26 140 0t140 0v168q-70 -26 -140 0t-140 0Z" fill="' + INK + '" opacity=".55" transform="translate(0 0)"/>' + masses(INK, r, { fists: 0.35, poles: 0.08, flag: INK }),
  };
  Sc.themes = Object.keys(T);
  Sc.svg = function (theme, seed, cols) {
    const r = rngOf(theme + ':' + seed);
    const uid = 's' + Math.floor(r() * 1e9).toString(36);
    const body = (T[theme] || T.parliament)(cols || { n: '#8a2a20' }, r).replace(/id="sk"/g, 'id="' + uid + 'k"').replace(/url\(#sk\)/g, 'url(#' + uid + 'k)').replace(/id="gl"/g, 'id="' + uid + 'g"').replace(/url\(#gl\)/g, 'url(#' + uid + 'g)');
    return '<svg class="scene" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' + body + '</svg>';
  };
})();
