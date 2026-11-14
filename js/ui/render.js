/* IRON DIALECTIC — map renderer. One offscreen canvas at 1px per tile, vector overlays per frame. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const T = ID.T, B = ID.B, TERR = ID.TERRAIN, clamp = ID.clamp;
  const R = (ID.Render = {});
  const PAPER = [235, 226, 204], INK = [23, 20, 15], SEA = [171, 188, 184], RED = [200, 40, 30], RED2 = [156, 29, 21], RIVER = [120, 150, 160];
  R.PAPER = PAPER; R.INK = INK; R.RED = RED;
  const cam = (R.cam = { x: 0, y: 0, z: 4 });
  let cv = null, ctx = null, mapCv = null, mapCtx = null, img = null, px = null, G = null;
  let cw = 0, ch = 0, dpr = 1;
  let natCol = [], flashes = [], labels = [], labelsAt = -1, parts = [], waves = null, shake = 0;
  R.shake = (m) => { if (!R.quiet) shake = Math.max(shake, m); };
  R.mode = 'political'; R.showBlocs = true; R.selected = -1; R.hoverNation = 0; R.buildMode = 0; R.quiet = false; R.t = 0;

  const rgb = (c) => (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const css = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a == null ? 1 : a) + ')';
  R.css = css;

  R.init = function (canvas) { cv = canvas; ctx = cv.getContext('2d', { alpha: false }); R.resize(); };
  R.resize = function () {
    if (!cv) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = cv.clientWidth; ch = cv.clientHeight;
    cv.width = Math.max(1, Math.round(cw * dpr)); cv.height = Math.max(1, Math.round(ch * dpr));
    if (G) clampCam();
  };
  R.setGame = function (g) {
    G = g; if (!G) return;
    mapCv = document.createElement('canvas'); mapCv.width = G.W; mapCv.height = G.H;
    mapCtx = mapCv.getContext('2d'); img = mapCtx.createImageData(G.W, G.H); px = new Uint32Array(img.data.buffer);
    flashes = []; parts = []; labelsAt = -1; G.dirtyAll = true; G.mapMode = R.mode; waves = null;
    R.fit();
  };
  R.minZoom = () => Math.min(cw / G.W, ch / G.H) * 0.98;
  R.fit = function () { cam.z = Math.max(R.minZoom(), Math.min(cw / G.W, ch / G.H)); cam.x = G.W / 2; cam.y = G.H / 2; };
  function clampCam() {
    cam.z = clamp(cam.z, R.minZoom(), 26);
    const hw = cw / 2 / cam.z, hh = ch / 2 / cam.z;
    cam.x = hw >= G.W / 2 ? G.W / 2 : clamp(cam.x, hw - 12, G.W - hw + 12);
    cam.y = hh >= G.H / 2 ? G.H / 2 : clamp(cam.y, hh - 12, G.H - hh + 12);
  }
  R.pan = function (dx, dy) { cam.x -= dx / cam.z; cam.y -= dy / cam.z; clampCam(); };
  R.zoomAt = function (sx, sy, f) {
    const mx = (sx - cw / 2) / cam.z + cam.x, my = (sy - ch / 2) / cam.z + cam.y;
    cam.z = clamp(cam.z * f, R.minZoom(), 26);
    cam.x = mx - (sx - cw / 2) / cam.z; cam.y = my - (sy - ch / 2) / cam.z; clampCam();
  };
  R.focus = function (i, z) { cam.x = i % G.W; cam.y = (i / G.W) | 0; if (z) cam.z = Math.max(cam.z, z); clampCam(); };
  R.tileAt = function (sx, sy) {
    const x = Math.floor((sx - cw / 2) / cam.z + cam.x), y = Math.floor((sy - ch / 2) / cam.z + cam.y);
    return x < 0 || y < 0 || x >= G.W || y >= G.H ? -1 : y * G.W + x;
  };
  const sx = (x) => (x - cam.x) * cam.z + cw / 2, sy = (y) => (y - cam.y) * cam.z + ch / 2;
  R.screenOf = (i) => [sx((i % G.W) + 0.5), sy(((i / G.W) | 0) + 0.5)];
  R.setMode = function (m) { R.mode = m; if (G) { G.mapMode = m; G.dirtyAll = true; } };

  /* ---------------------------------------------------------------- tile colours */
  function prepColours() {
    natCol = [PAPER];
    for (let k = 1; k < G.nations.length; k++) {
      const n = G.nations[k];
      natCol[k] = R.mode === 'ideology' ? mix(ID.IDEOLOGIES[n.ideo].color, PAPER, 0.1) : mix(n.color, PAPER, 0.14);
    }
  }
  const UNREST = [[196, 204, 170], [222, 190, 96], [214, 120, 60], [190, 44, 34]];
  function ramp(v) { const t = clamp(v / 75, 0, 0.999) * 3, k = t | 0; return mix(UNREST[k], UNREST[k + 1], t - k); }
  function tileColour(i) {
    const t = G.terrain[i];
    const W = G.W, x = i % W, y = (i / W) | 0;
    if (t === T.SEA) return rgb(SEA);
    const o = G.owner[i]; let c; const mode = R.mode;
    if (!o && mode !== 'terrain') { c = (x - y) % 5 === 0 || (x + y) % 11 === 0 ? [222, 213, 190] : [240, 233, 214]; }
    else if (mode === 'terrain') c = TERR[t].col;
    else if (mode === 'stability') { const P = G.provinces[G.prov[i]]; c = ramp(P.unrest); }
    else if (mode === 'opposition') { const P = G.provinces[G.prov[i]]; c = P.opp ? mix([214, 208, 190], ID.IDEOLOGIES[P.opp].color, clamp(P.oppStr / 85, 0.06, 1)) : [214, 208, 190]; }
    else if (mode === 'supply') { const s = G.cut[i]; c = mix(s === 0 ? [140, 168, 110] : s === 2 ? [214, 178, 84] : [196, 60, 44], natCol[o] || PAPER, 0.25); }
    else c = natCol[o] || PAPER;
    // printed terrain texture
    let m = 1;
    if (t === T.FARM) m = 1.035; else if (t === T.DESERT) m = 1.06;
    else if (t === T.FOREST) m = (x + y) & 1 ? 0.9 : 0.96;
    else if (t === T.HILLS) m = (x & 1) && (y & 1) ? 0.86 : 0.95;
    else if (t === T.MOUNTAIN) m = (x + 2 * y) % 3 === 0 ? 0.72 : 0.84;
    if (mode === 'terrain') m = 1 + (m - 1) * 0.6;
    let r = c[0] * m, g = c[1] * m, b = c[2] * m;
    if (G.river[i]) { r = r * 0.55 + RIVER[0] * 0.45; g = g * 0.55 + RIVER[1] * 0.45; b = b * 0.55 + RIVER[2] * 0.45; }
    if (G.rad[i]) { const k = (x * 7 + y * 13) % 5 < 2 ? 0.45 : 0.62; r = r * k + 40; g = g * k + 36; b = b * k + 10; }
    // borders and coast
    const H = G.H;
    const l = x > 0 ? G.owner[i - 1] : o, rr = x < W - 1 ? G.owner[i + 1] : o, u = y > 0 ? G.owner[i - W] : o, d = y < H - 1 ? G.owner[i + W] : o;
    let border = 0, other = 0;
    if (l !== o && G.terrain[i - 1] !== T.SEA) { border = 1; other = l; } else if (rr !== o && G.terrain[i + 1] !== T.SEA) { border = 1; other = rr; }
    else if (u !== o && G.terrain[i - W] !== T.SEA) { border = 1; other = u; } else if (d !== o && G.terrain[i + W] !== T.SEA) { border = 1; other = d; }
    if (!o) border = 0;
    if (border && (mode === 'political' || mode === 'ideology' || mode === 'supply')) {
      let bc = INK, k = 0.62;
      if (o === G.player && G.player) { bc = RED; k = 0.85; }
      else if (R.showBlocs && o && G.nations[o].bloc && (!other || G.nations[other].bloc !== G.nations[o].bloc)) { bc = blocCol(G.nations[o].bloc); k = 0.8; }
      r = r + (bc[0] - r) * k; g = g + (bc[1] - g) * k; b = b + (bc[2] - b) * k;
    } else if (border) { r *= 0.72; g *= 0.72; b *= 0.72; }
    else if (G.coast[i]) { r *= 0.8; g *= 0.8; b *= 0.8; }
    if (G.cut[i] === 1 && mode !== 'supply' && o && G.nations[o].nwars && (x + y) % 3 === 0) { r = 196; g = 50; b = 40; }
    return (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
  }
  const blocCache = {};
  function blocCol(id) {
    const bl = G.blocs[id]; if (!bl) return INK;
    const key = id + ':' + bl.fam + (bl.coalition ? 'c' : '');
    if (blocCache[key]) return blocCache[key];
    const h = ID.FAMILIES[bl.fam].col; const c = bl.coalition ? [60, 60, 60] : [parseInt(h.slice(1, 3), 16) * 0.75, parseInt(h.slice(3, 5), 16) * 0.75, parseInt(h.slice(5, 7), 16) * 0.75];
    return (blocCache[key] = c);
  }

  function repaint() {
    if (G.dirtyAll) {
      prepColours();
      for (let i = 0; i < G.N; i++) px[i] = tileColour(i);
      mapCtx.putImageData(img, 0, 0);
      G.dirtyAll = false; G.dirty.length = 0; labelsAt = -1;
      return;
    }
    const d = G.dirty; if (!d.length) return;
    if (natCol.length !== G.nations.length) prepColours();
    const W = G.W, N = G.N;
    let x0 = W, y0 = G.H, x1 = 0, y1 = 0;
    const flashOk = !R.quiet && (R.mode === 'political' || R.mode === 'ideology');
    for (let k = 0; k < d.length; k++) {
      const i = d[k];
      px[i] = tileColour(i);
      if (i % W > 0) px[i - 1] = tileColour(i - 1);
      if (i % W < W - 1) px[i + 1] = tileColour(i + 1);
      if (i >= W) px[i - W] = tileColour(i - W);
      if (i < N - W) px[i + W] = tileColour(i + W);
      const x = i % W, y = (i / W) | 0;
      if (x - 1 < x0) x0 = x - 1; if (x + 1 > x1) x1 = x + 1; if (y - 1 < y0) y0 = y - 1; if (y + 1 > y1) y1 = y + 1;
      if (flashOk && flashes.length < 700) flashes.push(i, R.t);
    }
    d.length = 0;
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(W - 1, x1); y1 = Math.min(G.H - 1, y1);
    mapCtx.putImageData(img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  }

  /* ---------------------------------------------------------------- labels */
  function refreshLabels() {
    labelsAt = G.tick;
    const n = G.nations.length, sxs = new Float64Array(n), sys = new Float64Array(n), cnt = new Int32Array(n);
    const W = G.W, own = G.owner;
    for (let i = 0; i < G.N; i += 3) { const o = own[i]; if (o) { sxs[o] += i % W; sys[o] += (i / W) | 0; cnt[o]++; } }
    labels = [];
    for (let k = 1; k < n; k++) {
      const nt = G.nations[k]; if (!nt.alive || !cnt[k]) continue;
      let x = sxs[k] / cnt[k], y = sys[k] / cnt[k];
      if (own[Math.round(y) * W + Math.round(x)] !== k) { x = nt.capital % W; y = ((nt.capital / W) | 0) - 3; }
      labels.push({ id: k, x, y, name: nt.base.toUpperCase(), tiles: nt.tiles });
    }
  }

  /* ---------------------------------------------------------------- overlay glyphs */
  function glyph(type, x, y, s, fill, stroke) {
    ctx.lineWidth = Math.max(1.5, s * 0.16); ctx.strokeStyle = stroke; ctx.fillStyle = fill; ctx.lineJoin = 'round';
    ctx.beginPath();
    if (type === B.CITY) { ctx.rect(x - s * 0.5, y - s * 0.5, s, s); }
    else if (type === B.FORT) { for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * s * 0.66, y + Math.sin(a) * s * 0.66); } ctx.closePath(); }
    else if (type === B.PORT) { ctx.arc(x, y, s * 0.55, 0, Math.PI * 2); }
    else if (type === B.FACTORY) { ctx.moveTo(x - s * 0.6, y + s * 0.5); ctx.lineTo(x - s * 0.6, y - s * 0.15); ctx.lineTo(x + s * 0.18, y - s * 0.15); ctx.lineTo(x + s * 0.18, y - s * 0.7); ctx.lineTo(x + s * 0.52, y - s * 0.7); ctx.lineTo(x + s * 0.52, y - s * 0.15); ctx.lineTo(x + s * 0.6, y - s * 0.15); ctx.lineTo(x + s * 0.6, y + s * 0.5); ctx.closePath(); }
    else { ctx.moveTo(x, y - s * 0.75); ctx.lineTo(x + s * 0.45, y + s * 0.55); ctx.lineTo(x - s * 0.45, y + s * 0.55); ctx.closePath(); }
    ctx.fill(); ctx.stroke();
    if (type === B.PORT) { ctx.beginPath(); ctx.moveTo(x, y - s * 0.3); ctx.lineTo(x, y + s * 0.3); ctx.moveTo(x - s * 0.28, y + s * 0.05); ctx.lineTo(x + s * 0.28, y + s * 0.05); ctx.stroke(); }
    if (type === B.CITY) { ctx.fillStyle = stroke; ctx.fillRect(x - s * 0.16, y - s * 0.16, s * 0.32, s * 0.32); }
  }
  function star(x, y, s, fill, stroke) {
    ctx.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k & 1 ? s * 0.42 : s; ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath(); ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(1.5, s * 0.18); ctx.fill(); ctx.stroke();
  }

  /* ---------------------------------------------------------------- battle particles */
  const MAXP = 360;
  function spawn(type, x, y, o) { if (parts.length >= MAXP) parts.shift(); parts.push(Object.assign({ type, x, y, t: 0 }, o || {})); }
  R.burst = function (x, y, big) {
    spawn('flash', x, y, { life: big ? 0.45 : 0.32, r: big ? 2.6 : 1.4 });
    spawn('smoke', x + (Math.random() - 0.5) * 0.8, y, { life: big ? 3.2 : 2.2, r: big ? 2.2 : 1.2, vx: 0.5 + Math.random() * 0.6, vy: -0.7 - Math.random() * 0.5 });
  };
  R.floatText = (x, y, txt, col) => spawn('text', x, y, { life: 1.6, txt, col });
  function frontPoint(a) {
    const v = a.heap.v; if (!v.length) return null;
    if (a._vis && R.t - a._vis.t < 0.6) return a._vis;
    let sx_ = 0, sy_ = 0, k = 0; const W = G.W, step = Math.max(1, Math.floor(v.length / 60));
    for (let j = 0; j < v.length; j += step) { const i = v[j]; if (G.owner[i] !== a.to || (a.to === 0 && G.terrain[i] === T.SEA)) continue; sx_ += i % W; sy_ += (i / W) | 0; k++; }
    if (!k) return null;
    const fx = sx_ / k + 0.5, fy = sy_ / k + 0.5;
    // nearest frontier tile to the centroid, so the arrowhead sits on the line
    let best = v[0], bd = 1e9; for (let j = 0; j < v.length; j += step) { const i = v[j]; const d = ((i % W) - fx) ** 2 + (((i / W) | 0) - fy) ** 2; if (d < bd) { bd = d; best = i; } }
    // the arrow leaves from inside our own lines, square to the local front
    const bx = best % W, by = (best / W) | 0, own = G.owner; let nx = 0, ny = 0;
    for (let j = 0; j < v.length; j += Math.max(1, step >> 1)) {
      const i = v[j], x = i % W, y = (i / W) | 0; if ((x - bx) * (x - bx) + (y - by) * (y - by) > 144) continue;
      if (x > 0 && own[i - 1] === a.from) nx -= 1; if (x < W - 1 && own[i + 1] === a.from) nx += 1;
      if (y > 0 && own[i - W] === a.from) ny -= 1; if (y < G.H - 1 && own[i + W] === a.from) ny += 1;
    }
    let nl = Math.hypot(nx, ny);
    if (nl < 0.5) { const A = G.nations[a.from]; nx = (A.capital % W) - bx; ny = ((A.capital / W) | 0) - by; nl = Math.hypot(nx, ny) || 1; }
    const len = clamp(70 / cam.z, 5, 14);
    const ox = bx + 0.5 + (nx / nl) * len, oy = by + 0.5 + (ny / nl) * len;
    a._vis = { t: R.t, x: (best % W) + 0.5, y: ((best / W) | 0) + 0.5, ox, oy };
    return a._vis;
  }
  function arrow(x0, y0, x1, y1, w, fill, label) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy); if (L < 6) return;
    const ux = dx / L, uy = dy / L, px = -uy, py = ux, head = Math.min(L * 0.45, w * 2.4);
    const bx = x1 - ux * head, by = y1 - uy * head;
    ctx.beginPath();
    ctx.moveTo(x0 + px * w * 0.32, y0 + py * w * 0.32);
    ctx.quadraticCurveTo((x0 + bx) / 2 + px * w * 0.6, (y0 + by) / 2 + py * w * 0.6, bx + px * w * 0.5, by + py * w * 0.5);
    ctx.lineTo(bx + px * w * 1.15, by + py * w * 1.15); ctx.lineTo(x1, y1); ctx.lineTo(bx - px * w * 1.15, by - py * w * 1.15);
    ctx.lineTo(bx - px * w * 0.5, by - py * w * 0.5);
    ctx.quadraticCurveTo((x0 + bx) / 2 - px * w * 0.6, (y0 + by) / 2 - py * w * 0.6, x0 - px * w * 0.32, y0 - py * w * 0.32);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.strokeStyle = css(INK); ctx.lineWidth = 2; ctx.lineJoin = 'miter'; ctx.fill(); ctx.stroke();
    if (label) {
      ctx.font = '700 15px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(label).width + 10;
      ctx.fillStyle = css(INK); ctx.fillRect(x0 - tw / 2, y0 - 10, tw, 20);
      ctx.fillStyle = css(PAPER); ctx.fillText(label, x0, y0 + 1);
    }
  }
  function prepWaves() {
    waves = []; const W = G.W, H = G.H;
    for (let k = 0; k < 2600 && waves.length < 520; k++) {
      const x = 2 + Math.floor(Math.random() * (W - 4)), y = 2 + Math.floor(Math.random() * (H - 4)); let ok = true;
      for (let dy = -3; dy <= 3 && ok; dy++) for (let dx = -3; dx <= 3; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && G.terrain[yy * W + xx] !== T.SEA) { ok = false; break; } }
      if (ok) waves.push([x + Math.random(), y + Math.random(), Math.random() * 6.28]);
    }
  }

  /* ---------------------------------------------------------------- frame */
  R.frame = function (dt) {
    if (!G || !ctx) return;
    R.t += dt;
    repaint();
    shake *= Math.pow(0.02, dt);
    const shx = shake > 0.3 ? (Math.random() - 0.5) * shake * 2 : 0, shy = shake > 0.3 ? (Math.random() - 0.5) * shake * 2 : 0;
    ctx.setTransform(dpr, 0, 0, dpr, shx * dpr, shy * dpr);
    ctx.fillStyle = css(SEA); ctx.fillRect(-20, -20, cw + 40, ch + 40);
    const z = cam.z, W = G.W, H = G.H;
    const ox = sx(0), oy = sy(0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mapCv, ox, oy, W * z, H * z);
    // chart grid and neat-line
    ctx.strokeStyle = 'rgba(23,20,15,0.07)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let gx = 0; gx <= W; gx += 24) { const X = Math.round(ox + gx * z) + 0.5; ctx.moveTo(X, oy); ctx.lineTo(X, oy + H * z); }
    for (let gy = 0; gy <= H; gy += 24) { const Y = Math.round(oy + gy * z) + 0.5; ctx.moveTo(ox, Y); ctx.lineTo(ox + W * z, Y); }
    ctx.stroke();
    // waves
    if (z >= 1.8) {
      if (!waves) prepWaves();
      ctx.strokeStyle = 'rgba(23,20,15,0.16)'; ctx.lineWidth = 1.2; ctx.beginPath();
      const wl = Math.min(9, z * 1.4);
      for (const w of waves) {
        const X = sx(w[0]), Y = sy(w[1] + Math.sin(R.t * 0.8 + w[2]) * 0.18); if (X < -20 || Y < -20 || X > cw + 20 || Y > ch + 20) continue;
        ctx.moveTo(X - wl, Y); ctx.quadraticCurveTo(X - wl / 2, Y - wl * 0.35, X, Y); ctx.quadraticCurveTo(X + wl / 2, Y + wl * 0.35, X + wl, Y);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = css(INK, 0.8); ctx.lineWidth = 2; ctx.strokeRect(ox - 1, oy - 1, W * z + 2, H * z + 2);
    ctx.lineWidth = 1; ctx.strokeRect(ox - 6, oy - 6, W * z + 12, H * z + 12);

    // conquest flashes
    if (flashes.length) {
      let w = 0;
      for (let k = 0; k < flashes.length; k += 2) {
        const age = R.t - flashes[k + 1]; if (age > 0.55) continue;
        const i = flashes[k]; ctx.fillStyle = 'rgba(255,250,235,' + (0.75 * (1 - age / 0.55)).toFixed(2) + ')';
        ctx.fillRect(sx(i % W), sy((i / W) | 0), z + 0.5, z + 0.5);
        flashes[w++] = i; flashes[w++] = flashes[k + 1];
      }
      flashes.length = w;
    }

    // wave rings of revolution
    for (const w of G.world.waves) {
      const rad = (50 + w.m * 9) * z, a = 0.35 * (1 - w.m / 24) * w.str;
      if (a <= 0.02) continue;
      ctx.strokeStyle = css(ID.IDEOLOGIES[w.ideo].color, a); ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -R.t * 14;
      ctx.beginPath(); ctx.arc(sx(w.x), sy(w.y), rad, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.setLineDash([]);

    // attack fronts
    const pulse = 0.55 + 0.45 * Math.sin(R.t * 7), live = !G.paused && !R.frozen;
    const arrows = [];
    for (const a of G.attacks) {
      const v = a.heap.v; if (!v.length) continue;
      const mine = a.from === G.player, vs = a.to === G.player, wild = a.to === 0;
      ctx.fillStyle = mine ? css(RED, 0.5 + 0.5 * pulse) : vs ? css(INK, 0.5 + 0.5 * pulse) : css(INK, wild ? 0.2 : 0.35);
      const step = Math.max(1, Math.floor(v.length / (mine || vs ? 40 : 14)));
      const s = Math.max(2.5, z * 0.75);
      for (let k = 0; k < v.length; k += step) { const i = v[k]; if (G.owner[i] !== a.to || (wild && G.terrain[i] === T.SEA)) continue; ctx.fillRect(sx((i % W) + 0.5) - s / 2, sy(((i / W) | 0) + 0.5) - s / 2, s, s); }
      if (live && !R.quiet && !wild) {
        const rate = Math.min(7, 0.6 + v.length / 50) * (mine || vs ? 1.6 : 0.7) * Math.min(1.5, a.troops / 40 + 0.3);
        let nsp = rate * dt; while (nsp > 0) { if (nsp >= 1 || Math.random() < nsp) { const i = v[Math.floor(Math.random() * v.length)]; if (G.owner[i] === a.to) R.burst((i % W) + Math.random(), ((i / W) | 0) + Math.random(), Math.random() < 0.12); } nsp -= 1; }
      }
      if (mine || vs) {
        const fp = frontPoint(a);
        if (fp) {
          arrows.push([a, fp, mine]);
          if (live) { if (a._shownTaken == null) a._shownTaken = a.taken; if (R.t - (a._txtAt || 0) > 1.3 && a.taken > a._shownTaken) { R.floatText(fp.x, fp.y - 1.5, (mine ? '+' : '−') + (a.taken - a._shownTaken), mine ? RED : INK); a._shownTaken = a.taken; a._txtAt = R.t; } }
        }
      }
    }

    // buildings
    const bs = clamp(z * 1.7, 7, 17);
    if (z >= 2.4) {
      const paper = css(PAPER), ink = css(INK), all = z >= 5.5;
      for (const i of G.blist) {
        if (!all && (G.bld[i] === B.FACTORY || G.bld[i] === B.PORT) && G.owner[i] !== G.player) continue;
        const X = sx((i % W) + 0.5), Y = sy(((i / W) | 0) + 0.5);
        if (X < -20 || Y < -20 || X > cw + 20 || Y > ch + 20) continue;
        const o = G.owner[i];
        glyph(G.bld[i], X, Y, bs, o === G.player ? css(RED) : paper, o === G.player ? paper : ink);
      }
      for (const q of G.builds) {
        const X = sx((q.i % W) + 0.5), Y = sy(((q.i / W) | 0) + 0.5);
        ctx.strokeStyle = css(INK, 0.9); ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.strokeRect(X - bs * 0.55, Y - bs * 0.55, bs * 1.1, bs * 1.1); ctx.setLineDash([]);
        const p = clamp((G.tick - q.start) / Math.max(1, q.done - q.start), 0, 1);
        ctx.fillStyle = css(INK, 0.8); ctx.fillRect(X - bs * 0.55, Y + bs * 0.7, bs * 1.1 * p, 3);
      }
    }
    // the player's objectives: a target ring with a pennant
    const me = G.nations[G.player];
    if (me && me.objs) for (const k in me.objs) {
      const t = me.objs[k]; if (G.owner[t] !== +k) continue;
      const X = sx((t % W) + 0.5), Y = sy(((t / W) | 0) + 0.5), r = Math.max(9, z * 2.2), pulse = 0.5 + 0.5 * Math.sin(R.t * 4);
      ctx.strokeStyle = css(RED, 0.95); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X, Y, r, 0, 6.3); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X, Y, r * (1.35 + 0.25 * pulse), 0, 6.3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X - r * 1.7, Y); ctx.lineTo(X - r * 0.5, Y); ctx.moveTo(X + r * 0.5, Y); ctx.lineTo(X + r * 1.7, Y); ctx.moveTo(X, Y - r * 1.7); ctx.lineTo(X, Y - r * 0.5); ctx.moveTo(X, Y + r * 0.5); ctx.lineTo(X, Y + r * 1.7); ctx.stroke();
      ctx.fillStyle = css(RED); ctx.font = '700 11px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('OBJECTIVE', X, Y - r * 1.9);
    }
    // capitals
    for (let k = 1; k < G.nations.length; k++) {
      const n = G.nations[k]; if (!n.alive || n.capital < 0) continue;
      const X = sx((n.capital % W) + 0.5), Y = sy(((n.capital / W) | 0) + 0.5);
      if (X < -20 || Y < -20 || X > cw + 20 || Y > ch + 20) continue;
      star(X, Y, clamp(z * 1.6, 6, 15), k === G.player ? css(RED) : css(INK), css(PAPER));
    }

    // boats and missiles
    for (const bt of G.boats) {
      const p = Math.min(bt.path.length - 1, bt.pos), i0 = bt.path[Math.floor(p)], i1 = bt.path[Math.min(bt.path.length - 1, Math.floor(p) + 1)], f = p - Math.floor(p);
      const X = sx((i0 % W) + ((i1 % W) - (i0 % W)) * f + 0.5), Y = sy(((i0 / W) | 0) + (((i1 / W) | 0) - ((i0 / W) | 0)) * f + 0.5);
      const s = clamp(z * 1.5, 6, 13);
      ctx.fillStyle = bt.owner === G.player ? css(RED) : css(G.nations[bt.owner].color); ctx.strokeStyle = css(INK); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(X - s, Y - s * 0.3); ctx.lineTo(X + s, Y - s * 0.3); ctx.lineTo(X + s * 0.55, Y + s * 0.5); ctx.lineTo(X - s * 0.55, Y + s * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X, Y - s * 0.3); ctx.lineTo(X, Y - s * 1.1); ctx.stroke();
    }
    for (const m of G.missiles) {
      const f = m.t / m.dur, x0 = (m.from % W) + 0.5, y0 = ((m.from / W) | 0) + 0.5, x1 = (m.to % W) + 0.5, y1 = ((m.to / W) | 0) + 0.5;
      const X = sx(x0 + (x1 - x0) * f), Y = sy(y0 + (y1 - y0) * f) - Math.sin(f * Math.PI) * 40;
      ctx.strokeStyle = css(m.nuke ? RED : INK, 0.6); ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(sx(x0), sy(y0)); ctx.quadraticCurveTo((sx(x0) + sx(x1)) / 2, (sy(y0) + sy(y1)) / 2 - 80, sx(x1), sy(y1)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = css(m.nuke ? RED : INK); ctx.beginPath(); ctx.arc(X, Y, 4, 0, 6.3); ctx.fill();
    }

    // battle smoke and flashes
    for (let k = parts.length - 1; k >= 0; k--) {
      const p = parts[k]; if (live || p.type === 'text') p.t += dt; const q = p.t / p.life;
      if (q >= 1) { parts.splice(k, 1); continue; }
      if (p.type === 'smoke') { p.x += (p.vx || 0) * dt * 0.6; p.y += (p.vy || 0) * dt * 0.6; }
      const X = sx(p.x), Y = sy(p.y); if (X < -40 || Y < -40 || X > cw + 40 || Y > ch + 40) continue;
      if (p.type === 'flash') { const r = Math.max(2.5, p.r * z * (0.5 + q)); ctx.fillStyle = 'rgba(255,236,170,' + (0.95 * (1 - q)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(X, Y, r, 0, 6.3); ctx.fill(); ctx.fillStyle = 'rgba(200,40,30,' + (0.7 * (1 - q)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(X, Y, r * 0.5, 0, 6.3); ctx.fill(); }
      else if (p.type === 'smoke') { const r = Math.max(3, p.r * z * (0.6 + q * 1.6)); ctx.fillStyle = 'rgba(70,64,56,' + (0.32 * (1 - q) * Math.min(1, q * 6)).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(X, Y, r, 0, 6.3); ctx.fill(); }
      else if (p.type === 'text') { const Yt = Y - q * 26; ctx.font = '800 ' + Math.round(17 + 4 * (1 - q)) + 'px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = css(PAPER, 1 - q); ctx.strokeText(p.txt, X, Yt); ctx.fillStyle = css(p.col || INK, 1 - q * 0.7); ctx.fillText(p.txt, X, Yt); }
    }
    // offensive arrows
    for (const [a, fp, mine] of arrows) {
      const X0 = sx(fp.ox), Y0 = sy(fp.oy), X1 = sx(fp.x), Y1 = sy(fp.y);
      arrow(X0, Y0, X1, Y1, clamp(z * 1.3, 7, 16), mine ? css(RED, 0.92) : css([60, 54, 46], 0.9), (a.to === 0 ? 'Expanding ' : '') + ID.fmtPop(a.troops));
    }
    // labels
    if (labelsAt < 0 || G.tick - labelsAt > 90) refreshLabels();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const L of labels) {
      const size = clamp(Math.sqrt(L.tiles) * z * 0.085, 0, 38);
      if (size < 11) continue;
      const X = sx(L.x), Y = sy(L.y); if (X < -100 || Y < -40 || X > cw + 100 || Y > ch + 40) continue;
      ctx.font = '700 ' + size.toFixed(0) + 'px "Barlow Condensed", "Arial Narrow", sans-serif';
      if ('letterSpacing' in ctx) ctx.letterSpacing = (size * 0.12).toFixed(1) + 'px';
      ctx.strokeStyle = css(PAPER, 0.75); ctx.lineWidth = Math.max(3, size * 0.22); ctx.strokeText(L.name, X, Y);
      ctx.fillStyle = css(INK, L.id === G.player ? 1 : 0.82); ctx.fillText(L.name, X, Y);
      const nn = G.nations[L.id], tw = ctx.measureText(L.name).width;
      const fi = ID.Flags && !R.quiet ? ID.Flags.img(nn) : null;
      if (fi && size >= 13) { const fh = size * 0.62, fw = fh * 1.5; ctx.drawImage(fi, X - tw / 2 - fw - size * 0.3, Y - fh / 2, fw, fh); }
      if (size >= 13 && !R.quiet) {
        const ts = Math.max(12, Math.round(size * 0.5));
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0.5px';
        ctx.font = '700 ' + ts + 'px "Barlow Condensed", sans-serif';
        const txt = ID.fmtPop(nn.troops) + (nn.nwars ? ' · at war' : '');
        ctx.lineWidth = 3; ctx.strokeStyle = css(PAPER, 0.75); ctx.strokeText(txt, X, Y + size * 0.62 + 3);
        ctx.fillStyle = nn.nwars ? css(RED2) : css(INK, 0.75); ctx.fillText(txt, X, Y + size * 0.62 + 3);
        if ('letterSpacing' in ctx) ctx.letterSpacing = (size * 0.12).toFixed(1) + 'px';
      }
    }
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

    // effects
    const fx = G.fx;
    for (let k = fx.length - 1; k >= 0; k--) {
      const e = fx[k]; e.t += dt;
      const X = sx((e.i % W) + 0.5), Y = sy(((e.i / W) | 0) + 0.5);
      const col = e.d && e.d.col ? e.d.col : RED;
      let life = 1;
      if (!e.seen) { e.seen = 1; R.shake({ nuke: 16, capital: 6, airraid: 3.5, barrage: 2, land: 1.5, revolt: 1 }[e.type] || 0); }
      if (e.type === 'revolt' || e.type === 'ideology') {
        life = e.type === 'ideology' ? 2.4 : 1.8; const p = e.t / life;
        for (let r = 0; r < 3; r++) { const q = p - r * 0.14; if (q <= 0 || q >= 1) continue; ctx.strokeStyle = css(col, 0.9 * (1 - q)); ctx.lineWidth = 4 * (1 - q) + 1; ctx.beginPath(); ctx.arc(X, Y, q * (e.type === 'ideology' ? 60 : 30) * Math.max(1, z * 0.4), 0, 6.3); ctx.stroke(); }
      } else if (e.type === 'nuke') {
        life = 3.2; if (e.t < dt * 1.5) for (let k = 0; k < 16; k++) { const a = Math.random() * 6.28, d = Math.random() * 7; R.burst((e.i % W) + Math.cos(a) * d, ((e.i / W) | 0) + Math.sin(a) * d, true); } const p = e.t / life, rad = 8 * z;
        if (p < 0.2) { ctx.fillStyle = 'rgba(255,252,240,' + (1 - p / 0.2).toFixed(2) + ')'; ctx.fillRect(0, 0, cw, ch); }
        ctx.fillStyle = css([255, 240, 200], 0.8 * (1 - p)); ctx.beginPath(); ctx.arc(X, Y, rad * (0.4 + p * 0.8), 0, 6.3); ctx.fill();
        ctx.strokeStyle = css(RED, 1 - p); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(X, Y, rad * (0.6 + p * 3), 0, 6.3); ctx.stroke();
      } else if (e.type === 'barrage' || e.type === 'airraid') {
        const air = e.type === 'airraid'; life = air ? 2.4 : 1.6; const r = (e.d && e.d.r) || 4, x0 = (e.i % W) + 0.5, y0 = ((e.i / W) | 0) + 0.5;
        const startB = air ? 0.9 : 0;
        if (e.t > startB && e.t < life - 0.3) { const n = Math.random() < dt * (air ? 22 : 18) ? 1 : 0; for (let k = 0; k < n + (Math.random() < dt * 10 ? 1 : 0); k++) { const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * r; R.burst(x0 + Math.cos(a) * d, y0 + Math.sin(a) * d, Math.random() < 0.35); } }
        ctx.strokeStyle = css(RED, 0.6 * (1 - e.t / life)); ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(X, Y, r * z, 0, 6.3); ctx.stroke(); ctx.setLineDash([]);
        if (air && e.t < 1.6) {
          const p = e.t / 1.6, dir = -0.5;
          for (let k = 0; k < 3; k++) {
            const off = (k - 1) * 3.2, px_ = sx(x0 - Math.cos(dir) * (40 - p * 80) + off * Math.sin(dir)), py_ = sy(y0 - Math.sin(dir) * (40 - p * 80) - off * Math.cos(dir) + (k === 1 ? -1.5 : 0));
            ctx.save(); ctx.translate(px_, py_); ctx.rotate(dir); ctx.fillStyle = css(INK, 0.85); const s = Math.max(6, z * 1.6);
            ctx.beginPath(); ctx.moveTo(s * 1.2, 0); ctx.lineTo(-s, -s * 0.18); ctx.lineTo(-s, s * 0.18); ctx.closePath(); ctx.fill();
            ctx.fillRect(-s * 0.15, -s * 0.9, s * 0.35, s * 1.8); ctx.fillRect(-s * 0.95, -s * 0.4, s * 0.2, s * 0.8); ctx.restore();
          }
        }
      } else if (e.type === 'boom') {
        life = 0.9; const p = e.t / life; ctx.strokeStyle = css(INK, 1 - p); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X, Y, 4 + p * 4 * z, 0, 6.3); ctx.stroke();
      } else if (e.type === 'subvert') {
        life = 1.4; const p = e.t / life; ctx.strokeStyle = css(col, 0.8 * (1 - p)); ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(X, Y, 4 + p * 14, 0, 6.3); ctx.stroke(); ctx.setLineDash([]);
      } else {
        life = 0.9; const p = e.t / life; ctx.strokeStyle = css(e.type === 'capital' ? RED : INK, 1 - p); ctx.lineWidth = 2.5; const s = 6 + p * 16; ctx.strokeRect(X - s, Y - s, s * 2, s * 2);
      }
      if (e.t >= life) fx.splice(k, 1);
    }

    // selection marker
    if (R.selected >= 0) {
      const X = sx((R.selected % W) + 0.5), Y = sy(((R.selected / W) | 0) + 0.5), s = Math.max(9, z * 1.2) + Math.sin(R.t * 5) * 1.5;
      ctx.strokeStyle = css(INK); ctx.lineWidth = 3; ctx.strokeRect(X - s, Y - s, s * 2, s * 2);
      ctx.strokeStyle = css(PAPER); ctx.lineWidth = 1.2; ctx.strokeRect(X - s, Y - s, s * 2, s * 2);
    }
  };

  /* A small flag-like swatch for a nation, used across the UI. */
  R.swatch = (n) => (ID.Flags ? ID.Flags.html(n, 'mini') : '<span class="sw" style="background:' + n.css + '"></span>');
})();
