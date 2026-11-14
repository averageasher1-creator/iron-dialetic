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
    for (const f of ID.FOCUS.crisis || []) { all[f.id] = f; f.tree = 'crisis'; f.crisis = 1; }
    for (const b in ID.FOCUS.nations) { nat[b] = {}; for (const f of ID.FOCUS.nations[b]) { all[f.id] = f; nat[b][f.id] = f; f.tree = b; } }
    for (const k in ID.FOCUS.families || {}) for (const f of ID.FOCUS.families[k]) { all[f.id] = f; f.tree = 'fam:' + k; }
  }
  /* Names in family trees carry {A} and {N}: the state's adjective and name. */
  Fo.sub = (t, n) => (t ? String(t).replace(/\{A\}/g, n.adj).replace(/\{N\}/g, n.base) : '');
  Fo.nm = (f, n) => Fo.sub(f.name, n);
  Fo.def = (id) => { if (!all) index(); return all[id]; };
  Fo.ensure = (n) => n.path || (n.path = { cur: null, start: 0, end: 0, done: {} });
  /* The trees a country can draw on: its national programme (if it has one) and the general one. */
  Fo.trees = function (n) {
    const out = [];
    if (n.tree && ID.FOCUS.nations[n.tree]) out.push({ key: 'nat', name: n.adj + ' programme', list: ID.FOCUS.nations[n.tree] });
    else { const fam = ID.ideo(n).family, L = ID.FOCUS.families && ID.FOCUS.families[fam]; if (L) out.push({ key: 'nat', name: n.adj + ' programme', fam, list: L }); }
    out.push({ key: 'gen', name: 'General programme', list: ID.FOCUS.general });
    if (ID.FOCUS.crisis) { if (!all) index(); out.push({ key: 'cri', name: 'Emergency measures', list: ID.FOCUS.crisis }); }
    return out;
  };
  Fo.days = (G, n, f) => Math.round((f.days || 120) * (n.trans > 0 ? 1.25 : 1));
  Fo.current = (n) => (n.path && n.path.cur ? Fo.def(n.path.cur) : null);
  Fo.progress = (G, n) => { const p = n.path; if (!p || !p.cur) return 0; return clamp((G.tick - p.start) / Math.max(1, p.end - p.start), 0, 1); };

  const names = (ids, n) => ids.map((id) => (n ? Fo.nm(Fo.def(id) || { name: id }, n) : (Fo.def(id) || { name: id }).name)).join(', ');
  const targets = (f) => { const out = []; for (const x of f.fx || []) if ((x[0] === 'war' || x[0] === 'ally') && typeof x[1] === 'string') out.push(x); return out; };

  /* '' if the programme can be started now, else the reason. */
  Fo.block = function (G, n, f, ignoreCur) {
    const p = Fo.ensure(n);
    if (p.done[f.id] != null && !f.repeat) return 'Completed.';
    if (f.repeat && p.done[f.id] != null && G.tick - p.done[f.id] < f.repeat * 360) return 'Can be repeated from ' + ID.dateOf(p.done[f.id] + f.repeat * 360).short + '.';
    if (!ignoreCur && p.cur) {
      const c = Fo.def(p.cur);
      // an emergency measure may interrupt an ordinary programme, which is shelved with its progress kept
      if (p.cur === f.id) return 'Under way.';
      if (!(f.crisis && c && !c.crisis)) return f.crisis ? 'Another emergency measure is under way.' : 'Another programme is under way.';
    }
    if (f.excl) for (const x of f.excl) if (p.done[x] != null) return 'Ruled out: you chose ' + Fo.nm(Fo.def(x), n) + '.';
    if (f.dest && n.destiny && !n.destiny.lapsed && n.destiny.id !== f.id) return 'You have already reached a destiny: ' + n.destiny.name + '.';
    if (f.req) { const miss = f.req.filter((x) => p.done[x] == null); if (miss.length) return 'Needs ' + names(miss, n) + '.'; }
    if (f.reqAny && !f.reqAny.some((x) => p.done[x] != null)) return 'Needs one of: ' + names(f.reqAny, n) + '.';
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
    if (f.crisis && p.cur) p.shelf = { id: p.cur, start: p.start, end: p.end, at: G.tick };
    p.cur = f.id; p.start = G.tick; p.end = G.tick + Fo.days(G, n, f);
    if (n.id === G.player) ID.sfx(G, 'stamp');
    return '';
  };
  /* Take the shelved programme back up where it was left. */
  function resume(G, n) {
    const p = n.path, s = p && p.shelf; if (!s) return;
    p.shelf = null;
    const f = Fo.def(s.id); if (!f || p.cur) return;
    p.cur = s.id; p.start = G.tick - (s.at - s.start); p.end = G.tick + Math.max(1, s.end - s.at);
    if (n.id === G.player) ID.news(G, 'Work resumes on ' + Fo.nm(f, n) + '.', 'pol', n.id);
  }
  Fo.shelved = (n) => (n.path && n.path.shelf ? Fo.def(n.path.shelf.id) : null);
  Fo.cancel = function (G, n) { const p = Fo.ensure(n); p.cur = null; resume(G, n); };

  Fo.complete = function (G, n, f) {
    const p = Fo.ensure(n);
    p.cur = null; p.done[f.id] = G.tick;
    const isP = n.id === G.player;
    const nm = Fo.nm(f, n);
    if (isP) { ID.news(G, 'Programme complete: ' + nm + '.', 'good', n.id); ID.sfx(G, 'good'); }
    const big = (f.fx || []).some((x) => x[0] === 'ideology' || x[0] === 'war' || x[0] === 'civilwar');
    if (f.dest) { /* recorded by destiny() */ }
    else if (f.tree !== 'general' && (isP || big)) ID.chron(G, 'focus', n.name + ' completes the programme “' + nm + '”.', n.id);
    else if (f.tree !== 'general' && ID.isMajor(G, n)) ID.news(G, n.name + ': ' + nm + '.', 'pol', n.id);
    ID.Events.applyFx(G, n, f.fx, { focus: f.id });
    if (f.dest && n.alive) Fo.destiny(G, n, f);
    if (n.alive) ID.Combat.refresh(G, n);
    if (n.alive) resume(G, n);
    if (isP) G.uiDirty = true;
  };

  Fo.tick = function (G) {
    for (const n of G.nations) {
      if (!n || !n.alive || !n.path || !n.path.cur || G.tick < n.path.end) continue;
      const f = Fo.def(n.path.cur); if (!f) { n.path.cur = null; continue; }
      // conditions can lapse while a programme runs (a target vanishes, a war starts)
      const why = f.crisis ? '' : Fo.block(G, n, f, true); // an emergency measure is finished even if the emergency has passed
      if (why && why !== 'Completed.') { n.path.cur = null; if (n.id === G.player) ID.news(G, 'Programme abandoned: ' + Fo.nm(f, n) + '. ' + why, 'bad', n.id); resume(G, n); continue; }
      Fo.complete(G, n, f);
    }
  };

  /* ---------------------------------------------------------------- destinies, epithets, identity */
  Fo.destiny = function (G, n, f) {
    const d = f.dest, S = (t) => Fo.sub(t, n);
    const old = n.name;
    n.destiny = { id: f.id, title: Fo.nm(f, n), name: S(d.name), motto: S(d.motto), epithet: S(d.epithet), flag: d.flag, ideo: n.ideo, t: G.tick };
    n.name = n.destiny.name;
    if (d.leader) { n.leader.name = S(d.leader); n.leader.title = ''; }
    ID.addEpithet(G, n, n.destiny.epithet);
    ID.headline(G, { kicker: 'Destiny · ' + old, title: n.destiny.name, sub: '“' + S(d.quote) + '” — ' + S(d.by), a: n.id, tone: n.id === G.player ? 'good' : 'pol' });
    ID.chron(G, 'destiny', old + ' becomes ' + n.destiny.name + ': ' + n.destiny.title + '.', n.id);
    if (n.id === G.player && !G.autoPlayer && !G.headless) { (G.superq = G.superq || []).push({ kind: 'destiny', nation: n.id, focus: f.id }); G.uiDirty = true; }
    if (!G.headless) G.dirtyAll = true;
  };
  /* Titles a state earns: shown on the Nation screen and in the chronicle. Newest first, four at most. */
  ID.addEpithet = function (G, n, t) {
    if (!t) return;
    n.epithets = n.epithets || [];
    if (n.epithets.some((e) => e.t === t)) return;
    n.epithets.unshift({ t, at: G.tick });
    if (n.epithets.length > 4) n.epithets.length = 4;
    if (n.id === G.player) ID.news(G, n.name + ' is now remembered as “' + t + '”.', 'good', n.id);
  };
  /* National spirits: two per country of The Two Continents, applied once at the start. */
  Fo.applySpirits = function (G, n) {
    const I = ID.IDENTITY && ID.IDENTITY[n.base]; if (!I || n.spirits) return;
    n.spirits = I.spirits.map((s) => s.name);
    for (const s of I.spirits) ID.Events.applyFx(G, n, s.fx, { spirit: s.name });
  };
  const POOL = {
    socialist: { motto: ['Bread, land and peace.', 'The future works here.', 'Every hand on the wheel of history.', 'From the factory floor to the stars.', 'Unbreakable, because we are many.'], anthem: ['Hymn of the Red Morning', 'The Song of Labour', 'Rise, {A} Workers', 'March of the Morning Shift'] },
    anarchist: { motto: ['No gods, no masters.', 'Nothing is ours. Everything is ours.', 'The commune is the country.', 'Free, and armed.'], anthem: ['The Black Banner', 'Song of the Free Columns', 'Hymn Without a King'] },
    liberal: { motto: ['Liberty under law.', 'Every voice, every vote.', 'Open sea, open market, open mind.', 'The republic is its citizens.'], anthem: ['Lamp of the Republic', 'Hymn to {N}', 'The Free and the Brave of {N}'] },
    conservative: { motto: ['As it was, so it shall be.', 'Crown, faith and soil.', 'The old ways endure.', 'God keep {N}.'], anthem: ['God Keep the King of {N}', 'The Old Banner', 'Hymn of the Faithful Realm'] },
    authoritarian: { motto: ['Order. Work. Victory.', 'The nation is one.', 'Iron discipline, iron borders.', 'Duty before all.'], anthem: ['March of the {A} Legions', 'The Steel Hymn', 'Onward, {N}'] },
    heterodox: { motto: ['A new road for a new century.', 'Everything has a price.', 'The many, rising.', 'Every signal answered.'], anthem: ['Song of the New Dawn', 'The {A} Signal', 'Hymn of the Exchange'] },
  };
  /* Motto, anthem and lore for any state: written for The Two Continents, generated elsewhere. */
  ID.identityOf = function (G, n) {
    const I = ID.IDENTITY && ID.IDENTITY[n.base], fam = ID.ideo(n).family, h = ID.hashStr(n.base + ':' + fam), P = POOL[fam] || POOL.liberal;
    const pick = (a) => Fo.sub(a[h % a.length], n);
    const dest = n.destiny && !n.destiny.lapsed ? n.destiny : null;
    let lore = I ? I.lore : '';
    if (!lore) {
      const share = n.tiles / Math.max(1, G.landCount), size = share > 0.12 ? 'great' : share > 0.05 ? 'middling' : 'small';
      const coast = G.coast && G.coast[n.capital] ? 'a harbour capital' : 'an inland capital';
      const born = n.civilOf ? ' It was born in a civil war, and remembers.' : '';
      lore = n.name + ' is a ' + size + ' state with ' + coast + ' and ' + Math.round(n.pop / 1e5) / 10 + ' million people.' + born + ' ' + ID.ideo(n).short;
    }
    return { motto: dest ? dest.motto : I && !n.civilOf && (!n.a.startIdeo || ID.IDEOLOGIES[n.a.startIdeo].family === fam) ? I.motto : pick(P.motto), anthem: I && n.tree === n.base ? I.anthem : pick(P.anthem), lore, spirits: I && n.spirits ? I.spirits : [] };
  };

  /* ---------------------------------------------------------------- AI choice */
  Fo.aiPick = function (G, n) {
    const p = Fo.ensure(n); if (p.cur) return;
    const av = Fo.available(G, n); if (!av.length) return;
    const I = ID.ideo(n), hist = !!G.historical;
    if (n.a.reformer == null) n.a.reformer = G.rng.chance(0.3) ? 1 : 0; // some regimes set out to transform themselves; most do not
    const wantArmy = n.nwars || n.a.threatened, hungry = n.foodBal < 1.02;
    const f = G.rng.weighted(av, (x) => {
      let w = x.tree === 'general' ? 1 : x.crisis ? 5 : 3;
      if (x.tree !== 'general' && !x.crisis && hist) w = x.hist ? 40 : 0;
      if (x.repeat) w *= 0.45;
      if (x.dest) w *= 3;
      if (typeof x.ai === 'function') w *= x.ai(n, G); else if (x.ai != null) w *= x.ai;
      const fx = x.fx || [];
      if (fx.some((e) => e[0] === 'war')) w *= hist && x.hist ? 1 : n.nwars ? 0.1 : 0.4 + I.dip.agg;
      // a programme that changes the regime is taken mostly where the country is already drifting that way
      const io = fx.find((e) => e[0] === 'ideology' && e[1] !== n.ideo);
      if (io) w *= hist ? (x.hist ? 1 : 0) : (n.drift[io[1]] || 0) > 10 ? 0.5 : n.a.reformer ? 0.3 : 0;
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
    W.troops += L.troops * 0.7; // the people came with the land W.gold += Math.max(0, L.gold) * 0.5; W.threat += 15;
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
    subvertNb: (G, n, f) => { for (const k in G.border[n.id] || {}) { const t = G.nations[+k]; if (t && t.alive && t !== n && !ID.sameBloc(G, n.id, t.id)) subvert(G, n, t, f[1]); } },
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
    subvertNb: () => ({ t: 'Agitation in every neighbouring state', good: true }),
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
      else { b.run(G); if (b.sup && !G.headless) (G.superq = G.superq || []).push({ kind: 'story', id: b.id }); }
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
