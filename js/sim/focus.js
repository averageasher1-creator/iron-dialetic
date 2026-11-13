/* IRON DIALECTIC — national programmes (focus trees) and the historical storyline. No DOM.
   A programme takes months to complete; one runs at a time. State lives in n.path = {cur, start, end, done}.
   The storyline (ID.STORY) runs only in historical mode: world beats fire on their date, nation beats
   become dispatches (the player chooses; AI countries take the historical option). */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const B = ID.B, clamp = ID.clamp, MAXN = ID.MAXN;
  const Fo = (ID.Focus = {});
  const St = (ID.Story = {});
  const D = () => ID.Diplomacy;

  /* ---------------------------------------------------------------- lookup */
  /* The country that carries a historical name: the lawful government over rebels, then the largest. */
  ID.byBase = function (G, base) {
    let best = null;
    for (const n of G.nations) {
      if (!n || !n.alive || n.base !== base) continue;
      if (!best) { best = n; continue; }
      const a = n.civilOf ? 0 : 1, b = best.civilOf ? 0 : 1;
      if (a > b || (a === b && n.tiles > best.tiles)) best = n;
    }
    return best;
  };

  let all = null, gen = null, nat = null;
  function index() {
    all = {}; gen = {}; nat = {};
    for (const f of ID.FOCUS.general) { all[f.id] = f; gen[f.id] = f; f.tree = 'general'; }
    for (const b in ID.FOCUS.nations) { nat[b] = {}; for (const f of ID.FOCUS.nations[b]) { all[f.id] = f; nat[b][f.id] = f; f.tree = b; } }
  }
  Fo.def = (id) => { if (!all) index(); return all[id]; };
  Fo.ensure = (n) => n.path || (n.path = { cur: null, start: 0, end: 0, done: {} });
  /* The trees a country can draw on: its national programme (if it has one) and the general one. */
  Fo.trees = function (n) {
    const out = [];
    if (n.tree && ID.FOCUS.nations[n.tree]) out.push({ key: 'nat', name: n.adj + ' programme', list: ID.FOCUS.nations[n.tree] });
    out.push({ key: 'gen', name: 'General programme', list: ID.FOCUS.general });
    return out;
  };
  Fo.days = (G, n, f) => Math.round((f.days || 120) * (n.trans > 0 ? 1.25 : 1));
  Fo.current = (n) => (n.path && n.path.cur ? Fo.def(n.path.cur) : null);
  Fo.progress = (G, n) => { const p = n.path; if (!p || !p.cur) return 0; return clamp((G.tick - p.start) / Math.max(1, p.end - p.start), 0, 1); };

  const names = (ids) => ids.map((id) => (Fo.def(id) || { name: id }).name).join(', ');
  const targets = (f) => { const out = []; for (const x of f.fx || []) if ((x[0] === 'war' || x[0] === 'ally') && typeof x[1] === 'string') out.push(x); return out; };

  /* '' if the programme can be started now, else the reason. */
  Fo.block = function (G, n, f, ignoreCur) {
    const p = Fo.ensure(n);
    if (p.done[f.id] != null && !f.repeat) return 'Completed.';
    if (f.repeat && p.done[f.id] != null && G.tick - p.done[f.id] < f.repeat * 360) return 'Can be repeated from ' + ID.dateOf(p.done[f.id] + f.repeat * 360).short + '.';
    if (!ignoreCur && p.cur) return p.cur === f.id ? 'Under way.' : 'Another programme is under way.';
    if (f.excl) for (const x of f.excl) if (p.done[x] != null) return 'Ruled out: you chose ' + Fo.def(x).name + '.';
    if (f.req) { const miss = f.req.filter((x) => p.done[x] == null); if (miss.length) return 'Needs ' + names(miss) + '.'; }
    if (f.reqAny && !f.reqAny.some((x) => p.done[x] != null)) return 'Needs one of: ' + names(f.reqAny) + '.';
    if (f.year && ID.yearOf(G.tick) < f.year) return 'Not before ' + f.year + '.';
    if (f.after && G.historical && G.story && !G.story.done[f.after]) { const b = St.beat(f.after); return 'In this history, waits for ' + (b ? St.title(b) + ' (' + ID.dateOf(St.at(b)).short + ')' : 'later events') + '.'; }
    if (f.ideos && f.ideos.indexOf(n.ideo) < 0) return 'Only under ' + f.ideos.map((i) => ID.IDEOLOGIES[i].name).join(' or ') + '.';
    if (f.fams && f.fams.indexOf(ID.ideo(n).family) < 0) return 'Only for ' + f.fams.map((x) => ID.FAMILIES[x].name.toLowerCase()).join(' or ') + ' regimes.';
    for (const x of f.fx || []) if (x[0] === 'ideology') {
      if (n.civilOf || (n.civil && G.nations[n.civil] && G.nations[n.civil].alive)) return 'Not in the middle of a civil war.';
    }
    for (const x of targets(f)) {
      const t = ID.byBase(G, x[1]);
      if (!t || t === n) return x[1] + ' no longer exists.';
      if (x[0] === 'ally') {
        if (ID.atWar(G, n.id, t.id)) return 'We are at war with ' + t.base + '.';
        if (ID.ideoAffinity(n.ideo, t.ideo) < -12) return t.base + '’s regime is too hostile to ours.';
      }
      if (x[0] === 'war' && ID.sameBloc(G, n.id, t.id)) return t.base + ' is our ally.';
    }
    if (f.can) { const w = f.can(n, G); if (w) return w; }
    return '';
  };
  Fo.state = function (G, n, f) {
    const p = Fo.ensure(n);
    if (p.cur === f.id) return 'cur';
    if (p.done[f.id] != null && !f.repeat) return 'done';
    if (f.excl && f.excl.some((x) => p.done[x] != null)) return 'excl';
    return Fo.block(G, n, f, true) ? 'locked' : 'avail';
  };
  Fo.available = function (G, n) {
    const out = [];
    const cur = n.path && n.path.cur;
    for (const T of Fo.trees(n)) for (const f of T.list) if (f.id !== cur && !Fo.block(G, n, f, true)) out.push(f);
    return out;
  };

  Fo.start = function (G, n, id) {
    const f = Fo.def(id); if (!f) return 'Unknown programme.';
    const p = Fo.ensure(n);
    const why = Fo.block(G, n, f); if (why) return why;
    p.cur = f.id; p.start = G.tick; p.end = G.tick + Fo.days(G, n, f);
    if (n.id === G.player) ID.sfx(G, 'stamp');
    return '';
  };
  Fo.cancel = function (G, n) { const p = Fo.ensure(n); p.cur = null; };

  Fo.complete = function (G, n, f) {
    const p = Fo.ensure(n);
    p.cur = null; p.done[f.id] = G.tick;
    const isP = n.id === G.player;
    if (isP) { ID.news(G, 'Programme complete: ' + f.name + '.', 'good', n.id); ID.sfx(G, 'good'); }
    const big = (f.fx || []).some((x) => x[0] === 'ideology' || x[0] === 'war' || x[0] === 'civilwar');
    if (f.tree !== 'general' && (isP || big)) ID.chron(G, 'focus', n.name + ' completes the programme “' + f.name + '”.', n.id);
    else if (f.tree !== 'general' && ID.isMajor(G, n)) ID.news(G, n.name + ': ' + f.name + '.', 'pol', n.id);
    ID.Events.applyFx(G, n, f.fx, { focus: f.id });
    if (n.alive) ID.Combat.refresh(G, n);
    if (isP) G.uiDirty = true;
  };

  Fo.tick = function (G) {
    for (const n of G.nations) {
      if (!n || !n.alive || !n.path || !n.path.cur || G.tick < n.path.end) continue;
      const f = Fo.def(n.path.cur); if (!f) { n.path.cur = null; continue; }
      // conditions can lapse while a programme runs (a target vanishes, a war starts)
      const why = Fo.block(G, n, f, true);
      if (why && why !== 'Completed.') { n.path.cur = null; if (n.id === G.player) ID.news(G, 'Programme abandoned: ' + f.name + '. ' + why, 'bad', n.id); continue; }
      Fo.complete(G, n, f);
    }
  };

  /* ---------------------------------------------------------------- AI choice */
  Fo.aiPick = function (G, n) {
    const p = Fo.ensure(n); if (p.cur) return;
    const av = Fo.available(G, n); if (!av.length) return;
    const I = ID.ideo(n), hist = !!G.historical;
    const wantArmy = n.nwars || n.a.threatened, hungry = n.foodBal < 1.02;
    const f = G.rng.weighted(av, (x) => {
      let w = x.tree === 'general' ? 1 : 3;
      if (x.tree !== 'general' && hist) w = x.hist ? 40 : 0;
      if (x.repeat) w *= 0.45;
      if (typeof x.ai === 'function') w *= x.ai(n, G); else if (x.ai != null) w *= x.ai;
      const fx = x.fx || [];
      if (fx.some((e) => e[0] === 'war')) w *= hist && x.hist ? 1 : n.nwars ? 0.1 : 0.4 + I.dip.agg;
      if (fx.some((e) => e[0] === 'ideology' && e[1] !== n.ideo)) w *= hist ? (x.hist ? 1 : 0) : 0.5;
      if (fx.some((e) => e[0] === 'civilwar')) w = 0;
      if (wantArmy && /^g_(staff|forts|motor|air|rearm)/.test(x.id)) w *= 2.5;
      if (hungry && /^g_(ext|irrig|mech)/.test(x.id)) w *= 2.5;
      if (x.id === 'g_protect' && !n.a.threatened) w *= 0.3;
      return w;
    });
    if (f) Fo.start(G, n, f.id);
  };

  /* ---------------------------------------------------------------- effects */
  function borderTile(G, n) {
    const W = G.W, own = G.owner;
    for (let t = 0; t < 600; t++) {
      const i = G.rng.int(W + 1, G.N - W - 2);
      if (own[i] !== n.id || G.bld[i] || G.terrain[i] === ID.T.SEA) continue;
      const a = own[i - 1], b = own[i + 1], c = own[i - W], d = own[i + W];
      if ((a && a !== n.id) || (b && b !== n.id) || (c && c !== n.id) || (d && d !== n.id)) return i;
    }
    return ID.spotNear(G, n.capital, n.id, 10);
  }
  function buildFree(G, n, type, k) {
    let made = 0;
    const cities = G.blist.filter((i) => G.bld[i] === B.CITY && G.owner[i] === n.id);
    for (let c = 0; c < k; c++) {
      let s = -1;
      if (type === B.FORT) s = borderTile(G, n);
      else if (type === B.PORT) { for (let t = 0; t < 400 && s < 0; t++) { const i = G.rng.int(0, G.N - 1); if (G.owner[i] === n.id && G.coast[i] && !G.bld[i]) s = i; } }
      else if (type === B.SILO) { if (n.tech.mil >= 4) s = ID.spotNear(G, n.capital, n.id, 12); }
      else s = ID.spotNear(G, cities.length ? G.rng.pick(cities) : n.capital, n.id, 8);
      if (s >= 0 && ID.placeBuilding(G, s, type)) made++;
    }
    if (type === B.FORT) ID.recomputeForts(G);
    if (!made && type === B.SILO) n.sci += 250;
    if (!G.headless) G.dirtyAll = true;
    return made;
  }
  function claimOn(G, n, t) {
    const set = new Set(n.claims), mine = new Set();
    for (let p = 1; p < G.provinces.length; p++) if (G.provinces[p].owner === n.id) mine.add(p);
    const add = [];
    for (let p = 1; p < G.provinces.length; p++) {
      const Pr = G.provinces[p]; if (Pr.owner !== t.id || set.has(p)) continue;
      if (Pr.nb.some((q) => mine.has(q))) add.push(p);
    }
    if (!add.length) { // no common border: the provinces nearest our capital
      const C = G.provinces[G.prov[n.capital]];
      const theirs = []; for (let p = 1; p < G.provinces.length; p++) if (G.provinces[p].owner === t.id && !set.has(p)) theirs.push(G.provinces[p]);
      theirs.sort((a, b) => Math.hypot(a.cx - C.cx, a.cy - C.cy) - Math.hypot(b.cx - C.cx, b.cy - C.cy));
      for (const Pr of theirs.slice(0, 3)) add.push(Pr.id);
    }
    for (const p of add) n.claims.push(p);
    if (add.length) ID.addOpBoth(G, n.id, t.id, -10);
    return add.length;
  }
  function allyWith(G, n, t) {
    if (!t || t === n || !t.alive || ID.atWar(G, n.id, t.id)) return;
    if (ID.sameBloc(G, n.id, t.id)) { ID.addOpBoth(G, n.id, t.id, 10); return; }
    const human = (x) => x.id === G.player && !G.autoPlayer;
    if (human(t) || human(n)) {
      const from = human(t) ? n : t;
      if (!G.offers) G.offers = [];
      if (!G.offers.some((x) => x.from === from.id && x.kind === 'ally')) { G.offers.push({ from: from.id, kind: 'ally', until: G.tick + 180 }); G.uiDirty = true; ID.sfx(G, 'event'); }
      ID.addOpBoth(G, n.id, t.id, 15);
      return;
    }
    // a member of someone else's bloc stays loyal to it
    if (t.bloc && G.blocs[t.bloc].leader !== t.id && t.bloc !== n.bloc) { ID.addOpBoth(G, n.id, t.id, 20); return; }
    if (n.bloc && G.blocs[n.bloc].leader !== n.id && t.bloc) { ID.addOpBoth(G, n.id, t.id, 20); return; }
    if (t.bloc && !n.bloc) D().joinBloc(G, n, t.bloc);
    else { if (!n.bloc) D().formBloc(G, n); D().joinBloc(G, t, n.bloc); }
  }
  ID.storyBloc = function (G, leadBase, members) {
    const L = ID.byBase(G, leadBase); if (!L) return;
    for (const m of members) {
      const M = ID.byBase(G, m); if (!M || M === L || ID.atWar(G, L.id, M.id)) continue;
      if (ID.ideoAffinity(L.ideo, M.ideo) < -12) continue;
      allyWith(G, L, M);
    }
  };
  /* A historical declaration of war. When the aggressor is the player, it becomes a choice. */
  ID.storyWar = function (G, ab, bb, cb, why) {
    const A = ID.byBase(G, ab), Bn = ID.byBase(G, bb);
    if (!A || !Bn || A === Bn || ID.atWar(G, A.id, Bn.id) || D().warBlock(G, A, Bn)) return false;
    if (A.civil && G.nations[A.civil] && G.nations[A.civil].alive) return false;
    if (A.id === G.player && !G.autoPlayer) { ID.Events.queue(G, A, 'story_war', { target: Bn.id, cb, why }); return true; }
    D().startWar(G, A, Bn, cb || 'claims');
    return true;
  };
  ID.storyPeace = function (G, bases) {
    const ns = []; for (const b of bases) { const n = ID.byBase(G, b); if (n && ns.indexOf(n) < 0) ns.push(n); }
    let k = 0;
    for (let x = 0; x < ns.length; x++) for (let y = x + 1; y < ns.length; y++) {
      const a = ns[x], b = ns[y], w = D().warOf(G, a.id, b.id);
      if (!w || w.cb === 'civil') continue;
      const human = (a.id === G.player || b.id === G.player) && !G.autoPlayer;
      if (human) {
        const other = a.id === G.player ? b : a;
        if (!G.offers) G.offers = [];
        if (!G.offers.some((o) => o.from === other.id && o.kind === 'peace')) G.offers.push({ from: other.id, kind: 'peace', until: G.tick + 180 });
        G.uiDirty = true;
      } else D().peace(G, a, b);
      k++;
    }
    return k;
  };
  ID.storyAnnex = function (G, W, L) {
    if (!W || !L || !L.alive || W === L) return;
    for (let i = 0; i < G.N; i++) if (G.owner[i] === L.id) ID.setOwner(G, i, W.id);
    for (let p = 1; p < G.provinces.length; p++) { const Pr = G.provinces[p]; if (Pr.core === L.id) Pr.core = W.id; }
    W.pop += L.pop * 0.9; W.troops += L.troops * 0.7; W.gold += Math.max(0, L.gold) * 0.5; W.threat += 15;
    ID.headline(G, { kicker: 'Union', title: L.base + ' joins ' + W.base, sub: L.name + ' is absorbed into ' + W.name + ' without a shot fired.', a: W.id, b: L.id, tone: W.id === G.player ? 'good' : 'bad' });
    const c0 = G.chronicle.length;
    D().eliminate(G, L, W, true);
    G.chronicle.splice(c0); // eliminate() records a conquest; this was a union
    ID.chron(G, 'conquest', L.name + ' is united with ' + W.name + '.', W.id, L.id);
    ID.recalcProvinceOwners(G); ID.recalcBorders(G);
    if (!G.headless) G.dirtyAll = true;
  };
  ID.storyUnion = function (G, n, base) {
    const t = ID.byBase(G, base); if (!t || t === n || ID.atWar(G, n.id, t.id)) return;
    if (t.id === G.player && !G.autoPlayer) { ID.Events.queue(G, t, 'st_ultimatum', { from: n.id }); return; }
    if (D().power(t) > D().power(n) * 0.8 || ID.sameBloc(G, n.id, t.id) && G.blocs[n.bloc].leader !== n.id) { if (!D().warBlock(G, n, t)) D().startWar(G, n, t, 'claims'); return; }
    ID.storyAnnex(G, n, t);
  };
  function civilWarFx(G, n, ideo, share) {
    if (G.nations.length >= MAXN - 2 || n.civil) { ID.Politics.changeIdeology(G, n, ideo, 'revolution'); return; }
    const C = G.provinces[G.prov[n.capital]];
    const mine = []; let tot = 0;
    for (let p = 1; p < G.provinces.length; p++) { const Pr = G.provinces[p]; if (Pr.owner === n.id && p !== C.id) { mine.push(Pr); tot += Pr.cnt[n.id] || 0; } }
    mine.sort((a, b) => Math.hypot(b.cx - C.cx, b.cy - C.cy) - Math.hypot(a.cx - C.cx, a.cy - C.cy));
    const provs = []; let got = 0;
    for (const Pr of mine) { if (got >= n.tiles * share) break; provs.push(Pr.id); got += Pr.cnt[n.id] || 0; }
    if (!provs.length) return;
    ID.Politics.civilWar(G, n, ideo, provs, 0);
    const R = G.nations[n.civil]; if (R) { R.tree = n.tree; Fo.ensure(R).done = Object.assign({}, Fo.ensure(n).done); }
  }
  function subvert(G, n, t, v) {
    if (!t || t === n || t.ideo === n.ideo) return;
    for (let p = 1; p < G.provinces.length; p++) {
      const Pr = G.provinces[p]; if (Pr.owner !== t.id || !G.rng.chance(0.6)) continue;
      if (Pr.opp !== n.ideo && (Pr.oppStr < 30 || G.rng.chance(0.3))) { Pr.opp = n.ideo; Pr.oppStr = Math.max(Pr.oppStr * 0.6, 8); }
      if (Pr.opp === n.ideo) { Pr.oppStr = clamp(Pr.oppStr + v, 0, 100); Pr.sponsor = n.id; }
    }
    ID.addOpBoth(G, n.id, t.id, -8);
  }
  function protector(G, n) {
    let best = null, bs = 0;
    for (const o of ID.alive(G)) {
      if (o === n || ID.atWar(G, n.id, o.id) || !ID.isMajor(G, o)) continue;
      const s = ID.op(G, n.id, o.id) + ID.ideoAffinity(n.ideo, o.ideo) + D().power(o) / Math.max(1, D().power(n)) * 4;
      if (s > bs) { bs = s; best = o; }
    }
    if (best) allyWith(G, n, best); else ID.addMod(n, 'def', 0.06, 120, 'No protector found');
  }

  const TECHN = { ind: 'industrial', mil: 'military', agr: 'agricultural' };
  const BN = (t, k) => { const nm = ID.BUILDINGS[t].name.toLowerCase(); return k > 1 ? (nm === 'factory' ? 'factories' : nm === 'city' ? 'cities' : nm === 'fortress' ? 'fortresses' : nm + 's') : nm; };
  const tgt = (G, b) => ID.byBase(G, b);
  Fo.FX = {
    ideology: (G, n, f) => { if (n.ideo !== f[1] && ID.IDEOLOGIES[f[1]]) ID.Politics.changeIdeology(G, n, f[1], f[2] || 'reform'); },
    claim: (G, n, f) => { const t = tgt(G, f[1]); if (t && t !== n) claimOn(G, n, t); },
    claimsAll: (G, n) => { for (const k in G.border[n.id] || {}) { const t = G.nations[+k]; if (t && t.alive && t !== n && !ID.sameBloc(G, n.id, t.id)) claimOn(G, n, t); } },
    war: (G, n, f) => {
      const t = tgt(G, f[1]); if (!t || t === n || ID.atWar(G, n.id, t.id)) return;
      if (D().warBlock(G, n, t)) { if (n.id === G.player) ID.news(G, 'War with ' + t.name + ' is not possible now: ' + D().warBlock(G, n, t), 'bad', n.id); return; }
      if (f[2] === 'claims' && !n.claims.some((p) => G.provinces[p].owner === t.id)) claimOn(G, n, t);
      D().startWar(G, n, t, f[2] || 'claims');
    },
    ally: (G, n, f) => allyWith(G, n, tgt(G, f[1])),
    op: (G, n, f) => { const t = tgt(G, f[1]); if (t && t !== n) ID.addOpBoth(G, n.id, t.id, f[2]); },
    build: (G, n, f) => buildFree(G, n, f[1], f[2] || 1),
    techUp: (G, n, f) => { const cap = ID.ERAS[ID.eraOf(G.tick)].techCap; if (n.tech[f[1]] < cap) n.tech[f[1]]++; else n.sci += 250; },
    law: (G, n, f) => { if (n.laws[f[1]] !== f[2] && !ID.Politics.lawAllowed(G, n, f[1], f[2])) ID.Politics.applyLaw(G, n, f[1], f[2]); },
    subvert: (G, n, f) => subvert(G, n, tgt(G, f[1]), f[2]),
    civilwar: (G, n, f) => civilWarFx(G, n, f[1], f[2] || 0.4),
    protector: (G, n) => protector(G, n),
  };
  Fo.DESC = {
    ideology: (f, n) => (n && n.ideo === f[1] ? { t: 'Confirms the ' + ID.IDEOLOGIES[f[1]].name + ' regime', good: true } : { t: 'The regime becomes ' + ID.IDEOLOGIES[f[1]].name, good: null }),
    claim: (f) => ({ t: 'Claims on ' + f[1], good: true }),
    claimsAll: () => ({ t: 'Claims on every neighbour', good: true }),
    war: (f) => ({ t: 'War with ' + f[1], good: null }),
    ally: (f) => ({ t: 'Alliance with ' + f[1], good: true }),
    op: (f) => ({ t: 'Relations with ' + f[1] + ' ' + (f[2] > 0 ? '+' : '−') + Math.abs(f[2]), good: f[2] > 0 }),
    build: (f) => ({ t: (f[2] || 1) > 1 ? f[2] + ' new ' + BN(f[1], f[2]) : 'A new ' + BN(f[1], 1), good: true }),
    techUp: (f) => ({ t: '+1 ' + TECHN[f[1]] + ' technology', good: true }),
    law: (f) => ({ t: 'Law: ' + ID.LAWS[f[1]].opts[f[2]].name + ' (if the regime allows it)', good: null }),
    subvert: (f) => ({ t: 'Agitation in ' + f[1], good: true }),
    civilwar: (f) => ({ t: 'Civil war against ' + ID.IDEOLOGIES[f[1]].name, good: false }),
    protector: () => ({ t: 'Alliance with a friendly great power', good: true }),
  };

  /* ---------------------------------------------------------------- the storyline */
  const at = (b) => (b.date[0] - ID.START_YEAR) * 360 + (b.date[1] - 1) * 30;
  St.at = at;
  St.init = function (G) {
    G.story = { done: {} };
    for (const b of ID.STORY) if (at(b) < G.tick) G.story.done[b.id] = 3; // before this campaign began
  };
  St.beat = (id) => ID.STORY.find((b) => b.id === id);
  St.title = (b) => b.title || (ID.Events.def(b.id) ? ID.Events.def(b.id).title : b.id);
  St.month = function (G) {
    if (!G.historical) return;
    if (!G.story) St.init(G);
    for (const b of ID.STORY) {
      if (G.story.done[b.id]) continue;
      const t = at(b); if (G.tick < t) continue;
      G.story.done[b.id] = 1;
      if (G.tick - t > 120) continue; // missed (e.g. loaded long after)
      let ok = true; if (b.cond) { try { ok = !!b.cond(G); } catch (e) { ok = false; } }
      if (!ok) { G.story.done[b.id] = 2; continue; }
      if (b.nation) { const n = ID.byBase(G, b.nation); if (n) ID.Events.queue(G, n, b.id, {}); else G.story.done[b.id] = 2; }
      else b.run(G);
    }
  };
  St.upcoming = function (G, k) {
    const out = [];
    for (const b of ID.STORY) {
      if (G.story && G.story.done[b.id]) continue;
      out.push({ id: b.id, date: ID.dateOf(at(b)).short, title: St.title(b), nation: b.nation || null });
      if (out.length >= k) break;
    }
    return out;
  };
  St.past = function (G) {
    const out = [];
    for (const b of ID.STORY) if (G.story && G.story.done[b.id] === 1 && at(b) >= (G.startTick || 0)) out.push({ id: b.id, date: ID.dateOf(at(b)).short, title: St.title(b) });
    return out;
  };
})();
