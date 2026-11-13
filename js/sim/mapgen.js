/* IRON DIALECTIC — map generation: terrain, rivers, provinces. Pure functions, no DOM. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const T = ID.T;

  ID.MAP_SIZES = {
    small: { W: 288, H: 162, nations: 12, name: 'Compact', desc: '12 states. Shorter, more crowded campaigns.' },
    std: { W: 384, H: 216, nations: 18, name: 'Standard', desc: '18 states. The intended size.' },
    large: { W: 480, H: 270, nations: 24, name: 'Vast', desc: '24 states. Long campaigns on a bigger world.' },
  };

  /* opts: { seed, size, blobs?: [[x,y,r],...] (fractions; handcrafted layout), land?: target land fraction } */
  ID.genMap = function (opts) {
    const sz = ID.MAP_SIZES[opts.size || 'std'];
    const W = sz.W, H = sz.H, N = W * H;
    const rng = new ID.RNG(opts.seed);
    const noise = ID.makeNoise(opts.seed ^ 0x9e3779b9);
    const noise2 = ID.makeNoise((opts.seed * 7 + 13) >>> 0);

    let blobs = opts.blobs;
    if (!blobs) {
      blobs = [];
      const nc = rng.int(3, 5);
      for (let c = 0; c < nc; c++) {
        const cx = rng.range(0.16, 0.84), cy = rng.range(0.2, 0.8), r = rng.range(0.11, 0.2);
        blobs.push([cx, cy, r]);
        const sub = rng.int(1, 3);
        for (let s = 0; s < sub; s++) blobs.push([cx + rng.range(-0.16, 0.16), cy + rng.range(-0.2, 0.2), rng.range(0.06, 0.12)]);
      }
      const ni = rng.int(3, 6);
      for (let c = 0; c < ni; c++) blobs.push([rng.range(0.06, 0.94), rng.range(0.1, 0.9), rng.range(0.03, 0.055)]);
    }

    const elev = new Float32Array(N);
    const asp = W / H;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const fx = x / W, fy = y / H;
        let f = 0;
        for (let k = 0; k < blobs.length; k++) {
          const dx = (fx - blobs[k][0]) * asp, dy = fy - blobs[k][1], r = blobs[k][2] * asp * 0.72;
          f += Math.exp(-(dx * dx + dy * dy) / (r * r));
        }
        if (f > 1.25) f = 1.25;
        const nz = noise.fbm(fx * 6.5 * asp * 0.6, fy * 6.5 * 0.6, 5);
        const edge = Math.min(x, W - 1 - x, y, H - 1 - y) / (0.05 * W);
        elev[y * W + x] = f * 0.7 + nz * 0.55 - (edge < 1 ? (1 - edge) * 0.9 : 0);
      }
    }
    // sea level by quantile
    const target = opts.land || 0.37;
    const sample = Array.from(elev).sort((a, b) => a - b);
    const sea = sample[Math.floor(N * (1 - target))];
    let emax = sample[N - 1];

    const terrain = new Uint8Array(N);
    for (let i = 0; i < N; i++) terrain[i] = elev[i] > sea ? T.PLAINS : T.SEA;

    // remove specks: tiny islands and tiny inland seas
    const comp = new Int32Array(N).fill(-1);
    const stack = new Int32Array(N);
    const flood = (start, isLand) => {
      let sp = 0, cnt = 0; stack[sp++] = start; comp[start] = start;
      const cells = [];
      while (sp) {
        const c = stack[--sp]; cells.push(c); cnt++;
        const cx = c % W, cy = (c / W) | 0;
        if (cx > 0) { const n = c - 1; if (comp[n] < 0 && (terrain[n] !== T.SEA) === isLand) { comp[n] = start; stack[sp++] = n; } }
        if (cx < W - 1) { const n = c + 1; if (comp[n] < 0 && (terrain[n] !== T.SEA) === isLand) { comp[n] = start; stack[sp++] = n; } }
        if (cy > 0) { const n = c - W; if (comp[n] < 0 && (terrain[n] !== T.SEA) === isLand) { comp[n] = start; stack[sp++] = n; } }
        if (cy < H - 1) { const n = c + W; if (comp[n] < 0 && (terrain[n] !== T.SEA) === isLand) { comp[n] = start; stack[sp++] = n; } }
      }
      return cells;
    };
    for (let i = 0; i < N; i++) {
      if (comp[i] >= 0) continue;
      const isLand = terrain[i] !== T.SEA;
      const cells = flood(i, isLand);
      if (isLand && cells.length < 14) for (const c of cells) terrain[c] = T.SEA;
      else if (!isLand && cells.length < 30) for (const c of cells) { terrain[c] = T.PLAINS; elev[c] = sea + 0.01; }
    }

    // terrain classes
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x; if (terrain[i] === T.SEA) continue;
        const fx = x / W, fy = y / H;
        const h = (elev[i] - sea) / (emax - sea);
        const ridge = 1 - Math.abs(noise2.fbm(fx * 9 * asp * 0.6, fy * 9 * 0.6, 4)) * 2.2;
        const moist = noise.fbm(fx * 5 * asp * 0.6 + 40, fy * 5 * 0.6 + 40, 4);
        const fert = noise2.fbm(fx * 8 * asp * 0.6 + 90, fy * 8 * 0.6 + 90, 3);
        const m = h * 0.55 + ridge * 0.5;
        let t;
        if (m > 0.74 && h > 0.14) t = T.MOUNTAIN;
        else if (m > 0.6 && h > 0.08) t = T.HILLS;
        else if (moist < -0.3) t = T.DESERT;
        else if (moist > 0.16) t = T.FOREST;
        else if (fert > -0.05 && h < 0.4) t = T.FARM;
        else t = T.PLAINS;
        terrain[i] = t;
      }
    }

    // coast flags
    const coast = new Uint8Array(N);
    const markCoast = () => {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; coast[i] = 0; if (terrain[i] === T.SEA) continue;
        if ((x > 0 && terrain[i - 1] === T.SEA) || (x < W - 1 && terrain[i + 1] === T.SEA) || (y > 0 && terrain[i - W] === T.SEA) || (y < H - 1 && terrain[i + W] === T.SEA)) coast[i] = 1;
      }
    };
    markCoast();

    // rivers: walk downhill from high ground to the sea
    const river = new Uint8Array(N);
    const nr = Math.round(N / 3800);
    let tries = 0, made = 0;
    while (made < nr && tries++ < nr * 30) {
      let c = rng.int(0, N - 1);
      if (terrain[c] !== T.MOUNTAIN && terrain[c] !== T.HILLS) continue;
      const path = []; let ok = false; const seen = new Set();
      for (let step = 0; step < 400; step++) {
        path.push(c); seen.add(c);
        if (coast[c] || river[c]) { ok = true; break; }
        const cx = c % W, cy = (c / W) | 0; let best = -1, be = Infinity;
        const nb = [cx > 0 ? c - 1 : -1, cx < W - 1 ? c + 1 : -1, cy > 0 ? c - W : -1, cy < H - 1 ? c + W : -1];
        for (const n of nb) {
          if (n < 0 || seen.has(n) || terrain[n] === T.SEA) continue;
          const e = elev[n] + rng.next() * 0.012;
          if (e < be) { be = e; best = n; }
        }
        if (best < 0) break;
        c = best;
      }
      if (ok && path.length > 12) {
        made++;
        for (const p of path) {
          river[p] = 1;
          if (terrain[p] === T.PLAINS || terrain[p] === T.DESERT) terrain[p] = T.FARM;
          const px = p % W;
          for (const n of [px > 0 ? p - 1 : -1, px < W - 1 ? p + 1 : -1, p - W, p + W]) {
            if (n >= 0 && n < N && terrain[n] === T.PLAINS && rng.chance(0.6)) terrain[n] = T.FARM;
          }
        }
      }
    }

    // provinces: seeded BFS over land
    const land = [];
    for (let i = 0; i < N; i++) if (terrain[i] !== T.SEA) land.push(i);
    const nProv = Math.max(40, Math.round(land.length / 150));
    const prov = new Uint16Array(N);
    const seeds = [];
    const minD = Math.sqrt(land.length / nProv) * 0.75;
    let guard = 0;
    while (seeds.length < nProv && guard++ < nProv * 60) {
      const c = land[rng.int(0, land.length - 1)]; const cx = c % W, cy = (c / W) | 0; let ok = true;
      for (const s of seeds) { const dx = (s % W) - cx, dy = ((s / W) | 0) - cy; if (dx * dx + dy * dy < minD * minD) { ok = false; break; } }
      if (ok) seeds.push(c);
    }
    let q = [];
    seeds.forEach((s, k) => { prov[s] = k + 1; q.push(s); });
    while (q.length) {
      const nq = [];
      rng.shuffle(q);
      for (const c of q) {
        const p = prov[c]; const cx = c % W, cy = (c / W) | 0;
        if (cx > 0 && terrain[c - 1] !== T.SEA && !prov[c - 1]) { prov[c - 1] = p; nq.push(c - 1); }
        if (cx < W - 1 && terrain[c + 1] !== T.SEA && !prov[c + 1]) { prov[c + 1] = p; nq.push(c + 1); }
        if (cy > 0 && terrain[c - W] !== T.SEA && !prov[c - W]) { prov[c - W] = p; nq.push(c - W); }
        if (cy < H - 1 && terrain[c + W] !== T.SEA && !prov[c + W]) { prov[c + W] = p; nq.push(c + W); }
      }
      q = nq;
    }
    // any land not reached (islands with no seed) gets its own province per component
    let np = seeds.length;
    for (const c of land) {
      if (prov[c]) continue;
      np++; const st = [c]; prov[c] = np;
      while (st.length) {
        const k = st.pop(); const kx = k % W, ky = (k / W) | 0;
        for (const n of [kx > 0 ? k - 1 : -1, kx < W - 1 ? k + 1 : -1, ky > 0 ? k - W : -1, ky < H - 1 ? k + W : -1]) {
          if (n >= 0 && terrain[n] !== T.SEA && !prov[n]) { prov[n] = np; st.push(n); }
        }
      }
    }

    const provinces = [null];
    for (let p = 1; p <= np; p++) provinces.push({ id: p, tiles: 0, sx: 0, sy: 0, tc: [0, 0, 0, 0, 0, 0, 0], coastal: 0, nbSet: new Set() });
    for (const c of land) {
      const P = provinces[prov[c]]; const cx = c % W, cy = (c / W) | 0;
      P.tiles++; P.sx += cx; P.sy += cy; P.tc[terrain[c]]++; if (coast[c]) P.coastal++;
      if (cx < W - 1 && prov[c + 1] && prov[c + 1] !== P.id) { P.nbSet.add(prov[c + 1]); provinces[prov[c + 1]].nbSet.add(P.id); }
      if (cy < H - 1 && prov[c + W] && prov[c + W] !== P.id) { P.nbSet.add(prov[c + W]); provinces[prov[c + W]].nbSet.add(P.id); }
    }
    for (let p = 1; p <= np; p++) {
      const P = provinces[p];
      P.cx = P.sx / Math.max(1, P.tiles); P.cy = P.sy / Math.max(1, P.tiles);
      // snap centre to a tile that is actually in the province
      let ci = Math.round(P.cy) * W + Math.round(P.cx);
      if (prov[ci] !== p) {
        let bd = 1e9;
        for (const c of land) if (prov[c] === p) { const dx = (c % W) - P.cx, dy = ((c / W) | 0) - P.cy; const d = dx * dx + dy * dy; if (d < bd) { bd = d; ci = c; } }
      }
      P.center = ci;
      P.nb = Array.from(P.nbSet); delete P.nbSet; delete P.sx; delete P.sy;
      const t = Math.max(1, P.tiles);
      P.rough = (P.tc[T.FOREST] + P.tc[T.HILLS] + P.tc[T.MOUNTAIN]) / t;
      P.fertile = (P.tc[T.FARM] + P.tc[T.PLAINS] * 0.5) / t;
    }

    return { W, H, N, terrain, river, coast, prov, provinces, landCount: land.length, seed: opts.seed, size: opts.size || 'std' };
  };

  /* BFS over sea from a set of start tiles; returns distance array (Int16, -1 unreachable) up to maxD. */
  ID.seaDistance = function (G, starts, maxD) {
    const W = G.W, H = G.H, N = G.N, terr = G.terrain;
    const dist = new Int16Array(N).fill(-1);
    let q = [];
    for (const s of starts) if (terr[s] === T.SEA && dist[s] < 0) { dist[s] = 0; q.push(s); }
    let d = 0;
    while (q.length && d < maxD) {
      d++; const nq = [];
      for (const c of q) {
        const cx = c % W, cy = (c / W) | 0;
        if (cx > 0 && terr[c - 1] === T.SEA && dist[c - 1] < 0) { dist[c - 1] = d; nq.push(c - 1); }
        if (cx < W - 1 && terr[c + 1] === T.SEA && dist[c + 1] < 0) { dist[c + 1] = d; nq.push(c + 1); }
        if (cy > 0 && terr[c - W] === T.SEA && dist[c - W] < 0) { dist[c - W] = d; nq.push(c - W); }
        if (cy < H - 1 && terr[c + W] === T.SEA && dist[c + W] < 0) { dist[c + W] = d; nq.push(c + W); }
      }
      q = nq;
    }
    return dist;
  };
  ID.seaNeighbors = function (G, i) {
    const W = G.W, H = G.H, x = i % W, y = (i / W) | 0, out = [];
    if (x > 0 && G.terrain[i - 1] === T.SEA) out.push(i - 1);
    if (x < W - 1 && G.terrain[i + 1] === T.SEA) out.push(i + 1);
    if (y > 0 && G.terrain[i - W] === T.SEA) out.push(i - W);
    if (y < H - 1 && G.terrain[i + W] === T.SEA) out.push(i + W);
    return out;
  };
})();
