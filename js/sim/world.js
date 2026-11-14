/* IRON DIALECTIC — world state: creation, tile ownership, buildings, diplomatic bookkeeping. No DOM. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const T = ID.T, B = ID.B, TERR = ID.TERRAIN, clamp = ID.clamp;
  const MAXN = (ID.MAXN = 120);

  function hsl(h, s, l) {
    const a = s * Math.min(l, 1 - l);
    const f = (k0) => { const k = (k0 + h * 12) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
    return [f(0), f(8), f(4)];
  }
  ID.nationColor = (k) => hsl((k * 0.61803398875 + 0.07) % 1, 0.42 + ((k * 7) % 3) * 0.07, 0.5 + ((k * 5) % 4) * 0.035);

  /* ---------------------------------------------------------------- nations */
  ID.makeNation = function (G, o) {
    const id = G.nations.length;
    if (id >= MAXN) return null;
    const col = o.color || ID.nationColor(id + (G.seed % 17));
    const n = {
      id, base: o.base, adj: o.adj, name: o.base, color: col, css: 'rgb(' + col.join(',') + ')', alive: true, ai: true, ideo: null, sit: o.sit || 'middling', blurb: o.blurb || '',
      capital: -1, tiles: 0, tc: [0, 0, 0, 0, 0, 0, 0], popLand: 0, foodLand: 0, oreLand: 0, coastTiles: 0, nb: [0, 0, 0, 0, 0, 0],
      pop: 0, troops: 0, mob: 0.03, gold: 150, debt: 0, inflation: 0,
      gdp: 1, rev: 0, exp: 0, net: 0, ls: 50, lsPrev: 50, foodBal: 1, famine: 0, ind: 0, agr: 0, tradeInc: 0, ntrade: 0, eff: 1,
      conf: 60, cyc: G.rng.next() * 6.28, privCap: 0, dist: 10, plan: null, pact: 45, rent: 30, tax: 20, load: 0, pactBroken: false, depression: 0,
      budget: { welfare: 0.1, security: 0.06, science: 0.08, arms: 0.15, heavy: 0 },
      sci: 0, tech: { ind: 0, mil: 0, agr: 0 }, focus: 'ind', equip: 1, missiles: 0, nukes: 0,
      stab: 55, legit: 55, auth: 25,
      fs: {}, fp: {}, sm: {}, src: {}, rep: {},
      mandate: 55, fervor: 15, tradition: 40, glory: 30, discipline: 60, particip: 45, charisma: 50,
      bureau: 15, corr: 15, grievance: 5, we: 0, prestige: 10,
      leader: null, laws: {}, drift: {}, mods: [], flags: {}, cd: {}, cnt: {}, threat: 0, ops: [], claims: [],
      path: { cur: null, start: 0, end: 0, done: {} }, tree: null, startTiles: 0, peakTiles: 0, age: 0, trans: 0, electionAt: 0, nwars: 0, crises: 0, emergency: false, isolated: false, lostWarAt: null,
      log: [], coupRisk: 0, kills: 0, losses: 0, casM: 0, sciTotal: 0, civil: 0, civilOf: 0, sponsor: 0, gdppc: 16, bloc: 0, strike: 0, zeroStab: 0, motions: 0, a: {},
    };
    for (const f of ID.FACTION_IDS) { n.fs[f] = 50; n.fp[f] = 100 / 7; n.sm[f] = 0; n.rep[f] = 50; }
    for (const k of ID.LEGIT_IDS) n.src[k] = 50;
    G.nations.push(n);
    return n;
  };

  /* Set ideology-dependent settings. init=true on world creation (also seeds faction support). */
  ID.applyIdeology = function (G, n, ideoId, init) {
    const I = ID.IDEOLOGIES[ideoId];
    n.ideo = ideoId;
    n.name = ID.nationTitle(n, ideoId);
    if (n.destiny && !n.destiny.lapsed) { if (n.destiny.ideo === ideoId) n.name = n.destiny.name; else n.destiny.lapsed = true; } // a destiny's name and flag belong to the regime that reached it
    for (const c of ID.LAW_CATS) {
      const allowed = c === 'mobil' ? ['peace', 'partial', 'total'] : I.laws[c];
      if (!n.laws[c] || allowed.indexOf(n.laws[c]) < 0) n.laws[c] = c === 'mobil' ? 'peace' : I.lawDef[c];
    }
    if (!n.laws.recruit || I.recruit.allowed.indexOf(n.laws.recruit) < 0) n.laws.recruit = I.recruit.def;
    n.budget = Object.assign({ welfare: 0, security: 0, science: 0, arms: 0, heavy: 0 }, I.budget);
    const e = I.econ;
    if (e.tax != null) n.tax = e.tax;
    if (e.rent != null) n.rent = e.rent;
    if (e.pact != null) n.pact = e.pact;
    n.plan = null; n.pactBroken = false; n.emergency = false; n.motions = 0;
    n.drift = {}; for (const d of I.drift) n.drift[d.to] = 0;
    n.mob = Math.min(n.mob, ID.maxMob(n));
    n.electionAt = I.elections ? G.tick + (init ? G.rng.int(1, I.elections) : I.elections) * 360 : 0;
    if (!n.leader || !init) n.leader = ID.genLeader(G.rng, ideoId); else n.leader.title = ID.leaderTitle(ideoId);
    if (init) for (const f of ID.FACTION_IDS) n.fs[f] = clamp(52 + (I.fbase[f] || 0) * 0.8 + G.rng.range(-5, 5), 5, 95);
    if (I.flags.claims && !n.claims.length && n.tiles) ID.genClaims(G, n);
  };

  ID.maxMob = (n) => {
    const r = ID.RECRUIT[n.laws.recruit] || ID.RECRUIT.conscription;
    return r.maxMob + (ID.LAWS.mobil.opts[n.laws.mobil || 'peace'].mob || 0) + (n.mods ? ID.mod(n, 'mob') : 0);
  };
  ID.ideo = (n) => ID.IDEOLOGIES[n.ideo];
  ID.popCap = (n) => Math.max(20, n.popLand * (1 + 0.07 * n.tech.agr) + n.nb[B.CITY] * 400);

  ID.genClaims = function (G, n) {
    const own = new Set(), seen = new Set(); let frontier = [];
    for (let p = 1; p < G.provinces.length; p++) if (G.provinces[p].owner === n.id) { own.add(p); seen.add(p); frontier.push(p); }
    const out = [];
    for (let depth = 0; depth < 2; depth++) {
      const nf = [];
      for (const p of frontier) for (const q of G.provinces[p].nb) if (!seen.has(q)) { seen.add(q); nf.push(q); out.push(q); }
      frontier = nf;
    }
    G.rng.shuffle(out);
    n.claims = out.slice(0, Math.max(2, Math.round(own.size * 0.45)));
  };

  /* ---------------------------------------------------------------- tiles */
  /* keepPop: the caller moves the people itself (civil wars, secessions). Otherwise the people living
     on a tile go with it: a share of the old owner's population equal to the tile's share of its land. */
  ID.setOwner = function (G, i, to, keepPop) {
    const from = G.owner[i]; if (from === to) return;
    const t = G.terrain[i], tr = TERR[t];
    const dead = G.rad[i] > 0;
    const pc = dead ? 0 : tr.pop, fd = dead ? 0 : tr.food * (G.river[i] ? 1.25 : 1);
    const P = G.provinces[G.prov[i]];
    if (from && !keepPop && pc > 0) {
      const a = G.nations[from];
      if (a.popLand > 0) { const mv = a.pop * Math.min(0.5, pc / a.popLand); a.pop -= mv; if (to) G.nations[to].pop += mv * 0.85; }
    }
    if (from) {
      const a = G.nations[from]; a.tiles--; a.tc[t]--; a.popLand -= pc; a.foodLand -= fd; a.oreLand -= tr.ore; if (G.coast[i]) a.coastTiles--;
      P.cnt[from] = (P.cnt[from] || 1) - 1;
    }
    if (to) {
      const a = G.nations[to]; a.tiles++; a.tc[t]++; a.popLand += pc; a.foodLand += fd; a.oreLand += tr.ore; if (G.coast[i]) a.coastTiles++;
      P.cnt[to] = (P.cnt[to] || 0) + 1;
    }
    G.owner[i] = to;
    const b = G.bld[i];
    if (b) {
      if (from) G.nations[from].nb[b]--;
      if (b === B.FORT || b === B.SILO || !to) { ID.removeBuilding(G, i, true); G.fortsDirty = true; }
      else G.nations[to].nb[b]++;
    }
    if (from && G.nations[from].capital === i) G.capLost.push([from, to]);
    if (!G.headless) G.dirty.push(i);
  };

  ID.removeBuilding = function (G, i, skipCount) {
    const b = G.bld[i]; if (!b) return;
    const o = G.owner[i];
    if (!skipCount && o) G.nations[o].nb[b]--;
    G.bld[i] = 0;
    const k = G.blist.indexOf(i); if (k >= 0) G.blist.splice(k, 1);
    const P = G.provinces[G.prov[i]];
    if (b === B.CITY) P.nCity = Math.max(0, P.nCity - 1); else if (b === B.FACTORY) P.nFact = Math.max(0, P.nFact - 1);
    if (b === B.FORT) G.fortsDirty = true;
    if (!G.headless) G.dirty.push(i);
  };
  ID.placeBuilding = function (G, i, type) {
    if (G.bld[i] || G.terrain[i] === T.SEA) return false;
    G.bld[i] = type; G.blist.push(i);
    const o = G.owner[i]; if (o) G.nations[o].nb[type]++;
    const P = G.provinces[G.prov[i]];
    if (type === B.CITY) P.nCity++; else if (type === B.FACTORY) P.nFact++;
    if (type === B.FORT) G.fortsDirty = true;
    if (!G.headless) G.dirty.push(i);
    return true;
  };
  ID.recomputeForts = function (G) {
    const cov = G.fortCov; cov.fill(0); const W = G.W, H = G.H, R = ID.FORT_RADIUS;
    for (const i of G.blist) {
      if (G.bld[i] !== B.FORT) continue;
      const o = G.owner[i], x0 = i % W, y0 = (i / W) | 0;
      for (let dy = -R; dy <= R; dy++) {
        const y = y0 + dy; if (y < 0 || y >= H) continue;
        for (let dx = -R; dx <= R; dx++) {
          const x = x0 + dx; if (x < 0 || x >= W || dx * dx + dy * dy > R * R) continue;
          cov[y * W + x] = o;
        }
      }
    }
    G.fortsDirty = false;
  };

  ID.buildCost = function (G, n, type) {
    const b = ID.BUILDINGS[type]; const I = ID.ideo(n);
    let c = b.cost * (1 + 0.14 * n.nb[type]);
    if (type === B.FACTORY && (I.econ.model === 'plan' || I.econ.model === 'cyber')) c *= 0.85;
    if (type === B.FORT && I.control.type === 'assembly') c *= 0.8;
    if (type === B.PORT && I.flags.navalPower) c *= 0.7;
    return Math.round(c);
  };
  ID.buildDays = function (G, n, type) {
    const base = [0, 150, 50, 100, 120, 200][type]; const I = ID.ideo(n);
    return Math.round(base * (I.flags.slowBuild ? 2 : 1) * (type === B.FACTORY && I.econ.model === 'plan' ? 0.8 : 1));
  };
  /* Returns '' when allowed, otherwise the reason. */
  ID.canBuild = function (G, n, i, type) {
    const b = ID.BUILDINGS[type];
    if (G.owner[i] !== n.id) return 'You can only build on your own land.';
    if (G.bld[i]) return 'There is already a building on this tile.';
    if (G.rad[i]) return 'This land is irradiated.';
    for (const q of G.builds) if (q.i === i) return 'Construction is already under way here.';
    if (b.needs === 'coast' && !G.coast[i]) return 'A port must be on the coast.';
    if (b.needs === 'mil4' && n.tech.mil < 4) return 'Needs military technology 4.';
    if (type === B.CITY && G.terrain[i] === T.MOUNTAIN) return 'Cities cannot be built on mountains.';
    if (n.gold < ID.buildCost(G, n, type)) return 'Not enough gold (' + ID.buildCost(G, n, type) + ' needed).';
    return '';
  };
  ID.startBuild = function (G, n, i, type) {
    const why = ID.canBuild(G, n, i, type); if (why) return why;
    n.gold -= ID.buildCost(G, n, type);
    G.builds.push({ i, type, owner: n.id, done: G.tick + ID.buildDays(G, n, type), start: G.tick });
    if (!G.headless) G.dirty.push(i);
    return '';
  };
  ID.tickBuilds = function (G) {
    if (!G.builds.length) return;
    for (let k = G.builds.length - 1; k >= 0; k--) {
      const q = G.builds[k];
      if (G.owner[q.i] !== q.owner) { G.builds.splice(k, 1); continue; }
      if (G.tick >= q.done) {
        G.builds.splice(k, 1);
        if (ID.placeBuilding(G, q.i, q.type) && q.owner === G.player) { ID.sfx(G, 'build'); ID.fx(G, 'build', q.i); }
      }
    }
  };
  /* find a free owned land tile near c */
  ID.spotNear = function (G, c, owner, r, wantCoast) {
    const W = G.W, H = G.H, x0 = c % W, y0 = (c / W) | 0;
    for (let t = 0; t < 80; t++) {
      const rr = r * (0.3 + 0.7 * (t / 80) + 0.2);
      const x = Math.round(x0 + G.rng.range(-rr, rr)), y = Math.round(y0 + G.rng.range(-rr, rr));
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
      const i = y * W + x;
      if (G.owner[i] !== owner || G.bld[i] || G.terrain[i] === T.SEA || G.terrain[i] === T.MOUNTAIN) continue;
      if (wantCoast && !G.coast[i]) continue;
      return i;
    }
    return -1;
  };

  /* ---------------------------------------------------------------- diplomacy bookkeeping */
  ID.dkey = (a, b) => (a < b ? a * 1000 + b : b * 1000 + a);
  ID.dipOf = (G, a, b) => { const k = ID.dkey(a, b); return G.dip[k] || (G.dip[k] = { war: 0, truce: 0, nap: 0, trade: 0, embargo: 0 }); };
  ID.atWar = (G, a, b) => G.warM[a * MAXN + b] === 1;
  ID.op = (G, a, b) => G.rel[a * MAXN + b];
  ID.addOp = (G, a, b, v) => { G.rel[a * MAXN + b] = clamp(G.rel[a * MAXN + b] + v, -100, 100); };
  ID.addOpBoth = (G, a, b, v) => { ID.addOp(G, a, b, v); ID.addOp(G, b, a, v); };
  ID.sameBloc = (G, a, b) => { const A = G.nations[a], Bn = G.nations[b]; return A.bloc && A.bloc === Bn.bloc; };
  ID.alive = (G) => G.nations.filter((n) => n && n.alive);

  /* ---------------------------------------------------------------- news, chronicle, effects */
  ID.news = function (G, text, cls, a, b) {
    G.news.push({ t: G.tick, text, cls: cls || '', a: a || 0, b: b || 0 });
    if (G.news.length > 240) G.news.splice(0, 60);
    G.newsDirty = true;
  };
  /* A front-page moment for the interface to stage. Ignored when no one is watching. */
  ID.headline = function (G, o) { if (G.headless || !G.player) return; (G.headlines || (G.headlines = [])).push(Object.assign({ t: G.tick }, o)); if (G.headlines.length > 4) G.headlines.shift(); };
  ID.isMajor = (G, n) => n && ID.rankOf && ID.rankOf(G, n, 'power') <= 4;
  ID.chron = function (G, type, text, a, b) { G.chronicle.push({ t: G.tick, type, text, a: a || 0, b: b || 0 }); };
  ID.fx = function (G, type, i, data) { if (!G.headless && G.fx.length < 400) G.fx.push({ type, i, t: 0, d: data }); };
  ID.sfx = function (G, name) { if (!G.headless && G.sfx.length < 12) G.sfx.push(name); };
  ID.logGrief = function (n, tick, text) { n.log.push({ t: tick, text }); if (n.log.length > 40) n.log.shift(); };

  /* Timed modifiers. Values are additive fractions unless the consumer says otherwise. */
  ID.addMod = function (n, k, v, months, label) { n.mods.push({ k, v, m: months, label: label || '' }); };
  ID.mod = function (n, k) { let s = 0; const m = n.mods; for (let i = 0; i < m.length; i++) if (m[i].k === k) s += m[i].v; return s; };
  ID.hasMod = function (n, label) { for (const m of n.mods) if (m.label === label) return true; return false; };

  ID.recalcProvinceOwners = function (G) {
    for (let p = 1; p < G.provinces.length; p++) {
      const P = G.provinces[p]; let best = 0, bc = 0;
      for (const k in P.cnt) if (P.cnt[k] > bc) { bc = P.cnt[k]; best = +k; }
      if (best !== P.owner) {
        P.owner = best;
        if (best && best !== P.core) { if (P.wild && !P.core && !P.lastOwner) P.integ = 55; else if (P.integ > 30 || P.lastOwner !== best) P.integ = 0; P.lastOwner = best; }
        if (best === P.core) P.integ = 100;
      }
      P.urban = clamp(0.06 + P.nCity * 0.32 + P.nFact * 0.12, 0, 0.92);
    }
  };

  /* Land borders between nations: G.border[a][b] = shared edge count. */
  ID.recalcBorders = function (G) {
    const W = G.W, H = G.H, own = G.owner, terr = G.terrain, nb = [], wild = new Int32Array(G.nations.length);
    for (let k = 0; k < G.nations.length; k++) nb.push({});
    let wildLand = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, a = own[i];
      if (!a) { if (terr[i] !== T.SEA) { wildLand++; if (x < W - 1 && own[i + 1]) wild[own[i + 1]]++; if (y < H - 1 && own[i + W]) wild[own[i + W]]++; } continue; }
      if (x < W - 1) { const b = own[i + 1]; if (b && b !== a) { nb[a][b] = (nb[a][b] || 0) + 1; nb[b][a] = (nb[b][a] || 0) + 1; } else if (!b && terr[i + 1] !== T.SEA) wild[a]++; }
      if (y < H - 1) { const b = own[i + W]; if (b && b !== a) { nb[a][b] = (nb[a][b] || 0) + 1; nb[b][a] = (nb[b][a] || 0) + 1; } else if (!b && terr[i + W] !== T.SEA) wild[a]++; }
    }
    G.border = nb; G.wildB = wild; G.wildLand = wildLand;
  };
  ID.borders = (G, a, b) => (G.border[a] && G.border[a][b]) || 0;

  /* ---------------------------------------------------------------- world creation */
  const SIT_W = { great: 1.5, sick: 1.7, rich: 0.9, small: 0.55, backwater: 1.25, revolution: 0.9, trader: 0.6, middling: 1.0 };
  const SIT_IND = { great: 1.3, sick: 0.6, rich: 2.2, small: 1.0, backwater: 0.35, revolution: 0.9, trader: 1.3, middling: 1.0 };
  const SIT_STAB = { great: 66, sick: 38, rich: 50, small: 60, backwater: 56, revolution: 44, trader: 64, middling: 58 };

  ID.newGame = function (opts) {
    const sc = opts.scenario && opts.scenario !== 'random' ? ID.SCENARIOS[opts.scenario] : null;
    const seed = sc ? sc.seed : ((opts.seed >>> 0) || 1);
    const size = sc ? sc.size : (opts.size || 'std');
    const map = ID.genMap({ seed, size, blobs: sc ? sc.blobs : null });
    const N = map.N;
    const startYear = opts.startYear || ID.START_YEAR;
    const G = {
      v: 1, seed, size, scenario: sc ? sc.id : 'random', difficulty: opts.difficulty || 'iron', headless: !!opts.headless, challenge: opts.challenge || null, ironman: !!opts.ironman,
      rng: new ID.RNG(seed ^ 0x5bd1e995), tick: (startYear - ID.START_YEAR) * 360, speed: 2, paused: true,
      W: map.W, H: map.H, N, terrain: map.terrain, river: map.river, coast: map.coast, prov: map.prov, provinces: map.provinces, landCount: map.landCount,
      owner: new Uint8Array(N), bld: new Uint8Array(N), cut: new Uint8Array(N), cutAge: new Uint8Array(N), fortCov: new Uint8Array(N), rad: new Uint8Array(N),
      nations: [null], player: 0, attacks: [], boats: [], missiles: [], builds: [], blist: [],
      dip: {}, warM: new Uint8Array(MAXN * MAXN), rel: new Float32Array(MAXN * MAXN), blocs: [null], wars: [], border: [],
      news: [], chronicle: [], stats: { pop: 1, gdp: 1, trade: 1, byIdeo: {}, byFam: {} }, world: { tension: 0, depressionAt: 0, depression: 0, waves: [], greatWar: 0 },
      flags: {}, dirty: [], dirtyAll: true, radList: [], mapMode: 'political', fx: [], sfx: [], capLost: [], evq: [], votes: [], offers: [], over: null, nextId: 1, fortsDirty: true, tut: null,
    };
    const rng = G.rng;
    for (let p = 1; p < G.provinces.length; p++) {
      const P = G.provinces[p];
      P.cnt = {}; P.owner = 0; P.core = 0; P.unrest = 8; P.opp = null; P.oppStr = 0; P.integ = 100; P.nCity = 0; P.nFact = 0; P.urban = 0.06; P.lastOwner = 0; P.sponsor = 0;
    }

    /* choose capitals */
    const defs = [];
    const W = G.W, H = G.H;
    if (sc) {
      for (const d of sc.nations) {
        // nearest land tile to the given point
        const tx = Math.round(d.x * W), ty = Math.round(d.y * H); let best = -1, bd = 1e9;
        for (let dy = -30; dy <= 30; dy++) for (let dx = -30; dx <= 30; dx++) {
          const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const i = y * W + x; if (G.terrain[i] === T.SEA || G.terrain[i] === T.MOUNTAIN) continue;
          const dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = i; }
        }
        defs.push(Object.assign({}, d, { capTile: best, capProv: G.prov[best] }));
      }
    } else {
      const want = ID.MAP_SIZES[size].nations;
      const cand = [];
      for (let p = 1; p < G.provinces.length; p++) { const P = G.provinces[p]; if (P.tiles >= 50 && P.fertile > 0.25) cand.push(P); }
      const chosen = [rng.pick(cand)];
      while (chosen.length < want && chosen.length < cand.length) {
        let best = null, bs = -1;
        for (const P of cand) {
          if (chosen.indexOf(P) >= 0) continue;
          let md = 1e9; for (const c of chosen) { const d = Math.hypot(P.cx - c.cx, P.cy - c.cy); if (d < md) md = d; }
          const s = md * rng.range(0.55, 1); if (s > bs) { bs = s; best = P; }
        }
        chosen.push(best);
      }
      const used = new Set(); const counts = {};
      const ideos = Object.keys(ID.START_WEIGHTS);
      for (const P of chosen) {
        const nm = ID.genName(rng, used);
        const ideo = rng.weighted(ideos, (k) => ((counts[k] || 0) >= 2 ? 0 : ID.START_WEIGHTS[k] / (1 + (counts[k] || 0) * 1.5)));
        counts[ideo] = (counts[ideo] || 0) + 1;
        const sit = rng.pick(ID.SIT_FOR[ideo]);
        defs.push({ base: nm.base, adj: nm.adj, ideo, sit, w: SIT_W[sit] * rng.range(0.85, 1.15), capTile: P.center, capProv: P.id });
      }
    }

    /* grow nations over the province graph (Dijkstra, cost scaled by 1/weight) */
    const np = G.provinces.length;
    const dist = new Float64Array(np).fill(Infinity); const who = new Int16Array(np).fill(-1); const done = new Uint8Array(np);
    defs.forEach((d, k) => { dist[d.capProv] = 0; who[d.capProv] = k; });
    for (;;) {
      let u = -1, ud = Infinity;
      for (let p = 1; p < np; p++) if (!done[p] && dist[p] < ud) { ud = dist[p]; u = p; }
      if (u < 0) break;
      done[u] = 1; const U = G.provinces[u]; const w = defs[who[u]].w;
      for (const v of U.nb) {
        if (done[v]) continue; const V = G.provinces[v];
        const c = ud + Math.hypot(U.cx - V.cx, U.cy - V.cy) * (1 + V.rough * 0.6) / w;
        if (c < dist[v]) { dist[v] = c; who[v] = who[u]; }
      }
    }
    // Provinces no capital can reach (islands) stay unclaimed. Each state also leaves its farthest
    // provinces unclaimed: the hinterland, which anyone may take without a war.
    const wildShare = opts.wild != null ? opts.wild : startYear >= 1940 ? 0.06 : 0.3;
    defs.forEach((d, k) => {
      const mine = []; let tot = 0;
      for (let p = 1; p < np; p++) if (who[p] === k) { mine.push(p); tot += G.provinces[p].tiles; }
      mine.sort((a, b) => dist[a] - dist[b]);
      let kept = 0, n = 0;
      for (const p of mine) {
        if (p !== d.capProv && n >= 3 && kept >= tot * (1 - wildShare)) who[p] = -1;
        else { kept += G.provinces[p].tiles; n++; }
      }
    });
    for (let p = 1; p < np; p++) if (who[p] < 0) G.provinces[p].wild = 1;

    const nats = defs.map((d) => ID.makeNation(G, d));
    for (let i = 0; i < N; i++) { const p = G.prov[i]; if (p && who[p] >= 0) ID.setOwner(G, i, nats[who[p]].id); }
    G.dirty.length = 0; G.capLost.length = 0;
    for (let p = 1; p < np; p++) { const o = who[p] >= 0 ? nats[who[p]].id : 0; G.provinces[p].core = o; G.provinces[p].owner = o; }

    /* per-nation setup */
    defs.forEach((d, k) => {
      const n = nats[k]; const I = ID.IDEOLOGIES[d.ideo];
      n.capital = d.capTile; n.sit = d.sit;
      ID.placeBuilding(G, n.capital, B.CITY);
      const myProv = []; for (let p = 1; p < np; p++) if (who[p] === k && p !== d.capProv) myProv.push(G.provinces[p]);
      myProv.sort((a, b) => b.fertile * b.tiles - a.fertile * a.tiles);
      const nCity = clamp(Math.round(n.tiles / 420) - 1 + (d.sit === 'rich' ? 1 : 0), 0, 8);
      const cityTiles = [n.capital];
      for (let c = 0; c < nCity && c < myProv.length; c++) { const ct = myProv[c].center; if (G.terrain[ct] !== T.MOUNTAIN && ID.placeBuilding(G, ct, B.CITY)) cityTiles.push(ct); }
      let nf = Math.max(1, Math.round((n.tiles / 330) * SIT_IND[d.sit] * (I.flags.antiIndustry ? 0.4 : 1)));
      if (startYear >= 1940) nf = Math.round(nf * 2.2);
      for (let f = 0; f < nf; f++) { const s = ID.spotNear(G, cityTiles[f % cityTiles.length], n.id, 7); if (s >= 0) ID.placeBuilding(G, s, B.FACTORY); }
      if (n.coastTiles > 0) {
        const npt = d.sit === 'trader' || I.flags.navalPower ? 3 : 1 + (n.tiles > 2400 ? 1 : 0);
        // nearest coastal tiles to cities
        const coastal = []; for (let i = 0; i < N; i++) if (G.owner[i] === n.id && G.coast[i] && !G.bld[i]) coastal.push(i);
        const placed = [];
        for (let pt = 0; pt < npt && coastal.length; pt++) {
          const ref = cityTiles[pt % cityTiles.length]; const rx = ref % W, ry = (ref / W) | 0; let best = -1, bd = 1e9;
          for (const c of coastal) {
            const cx = c % W, cy = (c / W) | 0; let dd = (cx - rx) ** 2 + (cy - ry) ** 2;
            for (const q of placed) if ((cx - (q % W)) ** 2 + (cy - ((q / W) | 0)) ** 2 < 400) dd += 1e6;
            if (dd < bd) { bd = dd; best = c; }
          }
          if (best >= 0 && ID.placeBuilding(G, best, B.PORT)) placed.push(best);
        }
      }
      { const nfort = d.sit === 'small' || d.sit === 'revolution' ? 3 : d.sit === 'great' || d.sit === 'trader' ? 2 : 1;
        for (let f = 0; f < nfort; f++) { const s = ID.spotNear(G, cityTiles[f % cityTiles.length], n.id, f === 0 ? 3 : 9); if (s >= 0) ID.placeBuilding(G, s, B.FORT); } }

      n.mob = d.sit === 'revolution' ? 0.06 : I.family === 'authoritarian' ? 0.045 : 0.03;
      ID.applyIdeology(G, n, d.ideo, true);
      n.mob = Math.min(n.mob, ID.maxMob(n));
      n.pop = ID.popCap(n) * 0.62; n.troops = n.pop * n.mob;
      n.gold = d.sit === 'revolution' ? 50 : d.sit === 'sick' ? 70 : d.sit === 'trader' ? 320 : 130 + n.tiles * 0.05;
      n.stab = SIT_STAB[d.sit] + rng.range(-4, 4); n.legit = n.stab + rng.range(-3, 6);
      const fam = I.family;
      n.tradition = fam === 'conservative' ? rng.range(68, 85) : fam === 'liberal' ? 42 : fam === 'authoritarian' ? 35 : fam === 'heterodox' ? 30 : 8;
      if (d.ideo === 'conmon' || d.ideo === 'merchant') n.tradition = Math.max(n.tradition, 62);
      n.fervor = d.sit === 'revolution' ? 85 : (I.legit.fervor ? 60 : 12);
      n.charisma = I.legit.charisma ? rng.range(58, 75) : 45;
      n.particip = I.control.type === 'assembly' ? 78 : I.legit.particip ? 60 : 35;
      n.mandate = 58 + rng.range(-6, 8); n.discipline = 66; n.glory = 30;
      n.corr = d.sit === 'sick' ? 45 : rng.range(10, 24); n.bureau = I.econ.model === 'plan' ? 28 : 12;
      if (d.sit === 'rich') { n.sm.workers = -12; n.sm.capital = -6; n.tech.ind = 1; }
      if (d.sit === 'great') n.tech.ind = 1;
      if (d.sit === 'sick') { n.sm.peasants = -8; n.sm.intelligentsia = -8; }
      if (startYear >= 1940) { n.tech.ind = 3; n.tech.mil = 3; n.tech.agr = 2; n.mob = Math.min(ID.maxMob(n), n.mob * 1.8); n.troops = n.pop * n.mob; }
      n.startTiles = n.peakTiles = n.tiles;
      n.blurb = d.blurb || ''; n.tutorial = !!d.tutorial;
      if (sc && ID.FOCUS.nations[d.base]) n.tree = d.base;
      if (I.flags.succession) n.leader.age = rng.int(40, 66);
    });

    ID.recalcProvinceOwners(G);
    for (let p = 1; p < np; p++) { G.provinces[p].integ = 100; }
    // sick empires start with restive outer provinces
    for (const n of nats) {
      if (n.sit !== 'sick') continue;
      const C = G.provinces[G.prov[n.capital]];
      for (let p = 1; p < np; p++) { const P = G.provinces[p]; if (P.owner === n.id && Math.hypot(P.cx - C.cx, P.cy - C.cy) > 40) { P.unrest = rng.range(30, 50); P.integ = rng.range(20, 60); P.core = 0; } }
    }
    ID.recalcBorders(G);
    for (const a of nats) for (const b of nats) {
      if (a === b) continue;
      let v = ID.ideoAffinity(a.ideo, b.ideo) + rng.range(-8, 8);
      if (ID.borders(G, a.id, b.id)) v -= 6;
      if ((a.sit === 'revolution' || b.sit === 'revolution') && ID.borders(G, a.id, b.id) && ID.ideoDist(a.ideo, b.ideo) > 1) v -= 18;
      G.rel[a.id * MAXN + b.id] = clamp(v, -100, 100);
    }
    for (const n of nats) if (ID.ideo(n).flags.claims) ID.genClaims(G, n);
    // the world of 1910 already trades
    for (let x = 0; x < nats.length; x++) for (let y = x + 1; y < nats.length; y++) {
      const a = nats[x], b = nats[y]; if (a.laws.trade === 'autarky' || b.laws.trade === 'autarky') continue;
      const reach = ID.borders(G, a.id, b.id) || (a.nb[B.PORT] && b.nb[B.PORT]);
      const merch = ID.IDEOLOGIES[a.ideo].econ.model === 'trade' || ID.IDEOLOGIES[b.ideo].econ.model === 'trade';
      if (reach && ID.ideoAffinity(a.ideo, b.ideo) > (merch ? -20 : 5) && rng.chance(merch ? 0.85 : 0.5)) ID.dipOf(G, a.id, b.id).trade = 1;
    }
    ID.recomputeForts(G);
    for (const n of nats) ID.Politics.initNation(G, n);
    ID.Combat.updateSupply(G);
    ID.Game.updateStats(G);
    for (const n of nats) { const g = n.gold; ID.Economy.month(G, n); n.gold = g; n.debt = 0; n.sci = 0; }
    G.stats.gdppcRef0 = 0; ID.Game.updateStats(G);
    for (const n of nats) { n.ls = 50; ID.Economy.month(G, n); n.gold = n.gold - n.net; n.debt = 0; n.sci = 0; n.lsPrev = n.ls; n.a.lsHist = []; n.a.gdpHist = []; ID.Politics.initNation(G, n); }
    G.era = ID.eraOf(G.tick); G.startTick = G.tick;
    for (const n of nats) n.a.startIdeo = n.ideo;
    if (sc) for (const n of nats) ID.Focus.applySpirits(G, n);
    G.world.depressionAt = (rng.int(1927, 1933) - ID.START_YEAR) * 360 + rng.int(0, 359);
    G.historical = !!(opts.historical && sc && sc.id === 'meridia');
    if (G.historical) { G.world.depressionAt = (1929 - ID.START_YEAR) * 360 + 9 * 30; ID.Story.init(G); G.story.loose = opts.loose !== false; }
    if (ID.Regime) for (const n of nats) ID.Regime.ensure(G, n);
    ID.chron(G, 'world', 'The year ' + startYear + '. ' + nats.length + ' states divide the world between them.');
    return G;
  };

  /* Hand a nation to the human player. ideoOverride lets the player rewrite the starting regime. */
  ID.setPlayer = function (G, id, ideoOverride) {
    if (G.player && G.nations[G.player]) G.nations[G.player].ai = true;
    const n = G.nations[id]; G.player = id; n.ai = false;
    if (ideoOverride && ideoOverride !== n.ideo) {
      const I = ID.IDEOLOGIES[ideoOverride];
      n.laws = {}; ID.applyIdeology(G, n, ideoOverride, true);
      n.fervor = I.legit.fervor ? 70 : 12; n.particip = I.control.type === 'assembly' ? 78 : I.legit.particip ? 60 : 35;
      n.tradition = I.family === 'conservative' ? 72 : I.family === 'liberal' ? 42 : I.family === 'socialist' || I.family === 'anarchist' ? 8 : 32;
      n.charisma = I.legit.charisma ? 66 : 45; n.mob = Math.min(n.mob, ID.maxMob(n)); n.troops = n.pop * n.mob;
      for (const o of G.nations) if (o && o !== n) { const v = ID.ideoAffinity(n.ideo, o.ideo) + G.rng.range(-6, 6) - (ID.borders(G, n.id, o.id) ? 6 : 0); G.rel[n.id * MAXN + o.id] = v; G.rel[o.id * MAXN + n.id] = v; }
      ID.Politics.initNation(G, n);
    }
  };
})();
