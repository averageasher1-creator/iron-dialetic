/* IRON DIALECTIC — core utilities. No DOM access in this file. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});

  /* Seeded RNG (mulberry32). State is a single uint32 so it serialises trivially. */
  class RNG {
    constructor(seed) { this.s = (seed >>> 0) || 1; }
    next() {
      let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    range(a, b) { return a + (b - a) * this.next(); }
    int(a, b) { return Math.floor(a + (b - a + 1) * this.next()); }
    chance(p) { return this.next() < p; }
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }
    /* items: array, wf: item -> weight. Returns null when all weights are <= 0. */
    weighted(items, wf) {
      let tot = 0; const ws = new Array(items.length);
      for (let i = 0; i < items.length; i++) { const w = Math.max(0, wf(items[i]) || 0); ws[i] = w; tot += w; }
      if (tot <= 0) return null;
      let r = this.next() * tot;
      for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
      return items[items.length - 1];
    }
  }
  ID.RNG = RNG;

  ID.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  ID.lerp = (a, b, t) => a + (b - a) * t;
  ID.hashStr = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };

  /* Number formatting. Population and troops are stored in thousands. */
  ID.fmt = (v, d) => {
    if (!isFinite(v)) return '—';
    const a = Math.abs(v);
    if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (a >= 1e4) return Math.round(v / 1e3) + 'K';
    if (a >= 1e3) return (v / 1e3).toFixed(1) + 'K';
    return d ? v.toFixed(d) : String(Math.round(v));
  };
  ID.fmtPop = (k) => { // k = thousands of people
    const v = k * 1000;
    if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
    if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + 'M';
    if (v >= 1e3) return Math.round(v / 1e3) + 'K';
    return String(Math.round(v));
  };
  ID.sign = (v, d) => (v >= 0 ? '+' : '−') + (d ? Math.abs(v).toFixed(d) : Math.round(Math.abs(v)));
  ID.pct = (v) => Math.round(v * 100) + '%';

  /* Calendar: 1 tick = 1 day, 12 months of 30 days. */
  ID.START_YEAR = 1910;
  ID.END_YEAR = 1976;
  ID.DAYS_MONTH = 30;
  ID.DAYS_YEAR = 360;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  ID.dateOf = (tick) => {
    const y = ID.START_YEAR + Math.floor(tick / 360);
    const m = Math.floor((tick % 360) / 30);
    const d = (tick % 30) + 1;
    return { y, m, d, str: d + ' ' + MONTHS[m] + ' ' + y, short: MONTHS[m] + ' ' + y };
  };
  ID.yearOf = (tick) => ID.START_YEAR + Math.floor(tick / 360);

  /* Small binary min-heap over (priority, value) pairs kept in parallel arrays. */
  class Heap {
    constructor() { this.p = []; this.v = []; }
    get size() { return this.p.length; }
    push(pr, val) {
      const p = this.p, v = this.v; let i = p.length; p.push(pr); v.push(val);
      while (i > 0) {
        const par = (i - 1) >> 1;
        if (p[par] <= pr) break;
        p[i] = p[par]; v[i] = v[par]; i = par;
      }
      p[i] = pr; v[i] = val;
    }
    pop() {
      const p = this.p, v = this.v; const n = p.length - 1;
      if (n < 0) return -1;
      const top = v[0]; this.topP = p[0];
      const lp = p.pop(), lv = v.pop();
      if (n > 0) {
        let i = 0;
        for (;;) {
          let c = 2 * i + 1; if (c >= n) break;
          if (c + 1 < n && p[c + 1] < p[c]) c++;
          if (p[c] >= lp) break;
          p[i] = p[c]; v[i] = v[c]; i = c;
        }
        p[i] = lp; v[i] = lv;
      }
      return top;
    }
    clear() { this.p.length = 0; this.v.length = 0; }
  }
  ID.Heap = Heap;

  /* Value noise + fbm, seeded. */
  ID.makeNoise = (seed) => {
    const rng = new RNG(seed);
    const P = new Uint8Array(512);
    const perm = Array.from({ length: 256 }, (_, i) => i);
    rng.shuffle(perm);
    for (let i = 0; i < 512; i++) P[i] = perm[i & 255];
    const G = new Float32Array(256);
    for (let i = 0; i < 256; i++) G[i] = rng.next() * 2 - 1;
    const fade = (t) => t * t * (3 - 2 * t);
    const n2 = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y); const xf = x - xi, yf = y - yi;
      const X = xi & 255, Y = yi & 255;
      const a = G[P[P[X] + Y]], b = G[P[P[X + 1] + Y]], c = G[P[P[X] + Y + 1]], d = G[P[P[X + 1] + Y + 1]];
      const u = fade(xf), v = fade(yf);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
    const fbm = (x, y, oct) => {
      let s = 0, amp = 1, f = 1, norm = 0;
      for (let o = 0; o < (oct || 4); o++) { s += n2(x * f, y * f) * amp; norm += amp; amp *= 0.5; f *= 2; }
      return s / norm;
    };
    return { n2, fbm };
  };

  ID.esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
})();
