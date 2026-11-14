/* IRON DIALECTIC — the regime engine: the inner circle, the sessions that set the line, and the
   national questions. No DOM. Data in data/regime.js, data/national.js, data/projects.js.
   State on a nation:
     n.circle  [{k, seat, name, lean, comp, loy, amb, age, since, plot, heir, cd}]  five seats
     n.sess    {next, line, lineIdeo, at}                                          the regime's session
     n.nq      {v, fired: {lo, hi}, cd: {}, bunkers}                                national question (historical only)
   Monthly effects are added to n.sigm (read by ID.mod) after the doctrine has set it. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const clamp = ID.clamp, c100 = (v) => clamp(v, 0, 100);
  const Rg = (ID.Regime = {});
  const R = () => ID.REGIME;

  Rg.national = (G, n) => !!(G && G.historical && G.scenario === 'meridia' && ID.NATIONAL && ID.NATIONAL[n.base]);
  Rg.Q = (G, n) => (n.nq && ID.NATIONAL[n.base] ? ID.NATIONAL[n.base].q : null);
  Rg.body = (n) => R().body[n.ideo] || R().body.liberal;
  Rg.sessName = (n) => { const s = Rg.body(n).session; return /^The /.test(s) ? s : 'The ' + s; };
  Rg.title = (n, seat) => Rg.body(n).t[seat];
  Rg.fig = (n, seat) => (n.circle || []).find((f) => f.seat === seat) || null;
  Rg.figByKey = (n, k) => (n && n.circle ? n.circle.find((f) => f.k === k) : null);
  Rg.heir = (n) => (n.circle || []).find((f) => f.heir) || null;
  Rg.lines = (n) => R().lines[n.ideo] || [];
  Rg.line = (n) => (n.sess && n.sess.line && n.sess.lineIdeo === n.ideo ? Rg.lines(n).find((l) => l.id === n.sess.line) : null);
  Rg.canPurge = (n) => Rg.body(n).purge;
  Rg.scale = (f) => (f.comp / 2) * (f.loy >= 30 ? 0.6 + f.loy / 250 : -0.4);

  /* ---------------------------------------------------------------- people */
  function freshName(G, n) {
    const N = Rg.national(G, n) ? ID.NATIONAL[n.base] : null;
    for (let k = 0; k < 8; k++) {
      const s = N && N.names ? G.rng.pick(N.names[0]) + ' ' + G.rng.pick(N.names[1]) : ID.genLeader(G.rng, n.ideo).name;
      if (s !== n.leader.name && !(n.circle || []).some((f) => f.name === s)) return s;
    }
    return ID.genLeader(G.rng, n.ideo).name;
  }
  function leanFor(G, n) {
    const I = ID.ideo(n);
    if (G.rng.chance(0.68) || !I.drift.length) return n.ideo;
    return G.rng.pick(I.drift).to;
  }
  Rg.newFig = function (G, n, seat, o) {
    return Object.assign({ k: null, seat, name: freshName(G, n), lean: leanFor(G, n), comp: Math.round((1 + G.rng.next() * 1.8) * 10) / 10, loy: G.rng.int(50, 74), amb: G.rng.int(25, 80), age: G.rng.int(36, 60), since: G.tick, plot: 0, heir: false, cd: 0 }, o || {});
  };
  function castFig(G, c) { return { k: c[0], seat: c[1], name: c[2], lean: c[3], comp: c[4], loy: c[5], amb: c[6], age: c[7], since: G.tick, plot: 0, heir: false, cd: 0 }; }

  Rg.ensure = function (G, n) {
    if (!n || !n.alive && n.circle) return;
    const N = Rg.national(G, n) ? ID.NATIONAL[n.base] : null;
    if (!n.circle) {
      if (N && N.ideo === n.ideo && !n.flags.cast) {
        n.flags.cast = 1;
        n.circle = N.cast.map((c) => castFig(G, c));
        const L = N.leader; n.leader.name = L[0]; n.leader.age = L[1]; n.leader.traits = L[2].slice(); if (L[3]) n.leader.title = L[3];
      } else n.circle = R().SEATS.map((s) => Rg.newFig(G, n, s));
      n.circleIdeo = n.ideo;
    }
    if (!n.sess) n.sess = { next: G.tick + G.rng.int(8, 30) * 30, line: null, lineIdeo: null, at: 0 };
    if (N && !n.nq) n.nq = { v: N.q.init, fired: {}, cd: {}, bunkers: 0 };
  };

  /* Replace a figure in the same seat. */
  Rg.replace = function (G, n, f, o) {
    const k = n.circle.indexOf(f); if (k < 0) return null;
    const g = Rg.newFig(G, n, f.seat, o);
    n.circle[k] = g; return g;
  };

  /* ---------------------------------------------------------------- the monthly round */
  const ADD = (m, k, v) => { if (v) m[k] = (m[k] || 0) + v; };
  Rg.SEATFX = {
    army: (s, f) => ({ atk: 0.04 * s, def: 0.03 * s, coup: f.loy < 30 ? 0.35 : -0.12 * s }),
    police: (s, f) => ({ unrest: -1.5 * s, opp: -0.04 * s, coup: f.loy < 30 ? 0.1 : -0.06 * s }),
    economy: (s) => ({ prod: 0.035 * s, eff: 0.02 * s }),
    ideology: (s) => ({ legit: 2.5 * s }),
    foreign: (s) => ({ trade: 0.05 * s, rev: 0.015 * s }),
  };
  Rg.figFx = (n, f) => Rg.SEATFX[f.seat](Rg.scale(f), f);

  Rg.month = function (G, n) {
    Rg.ensure(G, n);
    const m = n.sigm || (n.sigm = {}), rng = G.rng, isP = n.id === G.player && !G.autoPlayer;
    const yearTurn = G.tick % 360 < 30;
    const line = Rg.line(n);
    const paranoid = n.leader.traits && n.leader.traits.indexOf('paranoid') >= 0;
    for (const f of n.circle.slice()) {
      if (n.circle.indexOf(f) < 0 || !n.alive) continue;
      if (yearTurn) {
        f.age++;
        if (f.age > 68 && rng.chance((f.age - 66) * 0.02)) {
          const g = Rg.replace(G, n, f);
          if (isP) ID.news(G, f.name + ' (' + Rg.title(n, f.seat) + ') ' + (f.age > 74 ? 'dies' : 'retires') + '. ' + g.name + ' takes the seat.', 'pol', n.id);
          continue;
        }
      }
      // loyalty settles toward what the regime gives this person
      let tgt = 58 + (f.lean === n.ideo ? 10 : -8) - (f.amb - 50) * 0.35 + (n.stab - 50) * 0.25 + (line && line.lean === f.lean ? 10 : line && f.lean !== n.ideo ? -4 : 0) + (f.heir ? 8 : 0) + (n.a.fear > G.tick ? 10 : 0) - (paranoid ? 5 : 0);
      f.loy = c100(f.loy + (tgt - f.loy) * 0.04 + rng.range(-1, 1));
      // plots grow among the disloyal and ambitious
      if (f.loy < 32 && f.amb > 58) f.plot += (f.amb - 50) / 40; else f.plot = Math.max(0, f.plot - 0.5);
      if (f.plot >= 3 && !f.warned) { f.warned = 1; if (isP) ID.Events.queue(G, n, 'rg_plot', { seat: f.seat, name: f.name }); else Rg.aiPlot(G, n, f); }
      if (f.plot < 1) f.warned = 0;
      if (f.plot >= 7) { Rg.strike(G, n, f); if (!n.alive || G.over) return; continue; }
      // effects of the seat, and the pull of the holder's own convictions
      const e = Rg.figFx(n, f); for (const k in e) ADD(m, k, e[k]);
      if (f.seat === 'ideology' && n.sig != null) n.sig = c100(n.sig + 0.25 * Rg.scale(f));
      if (f.lean !== n.ideo && n.drift[f.lean] != null) n.drift[f.lean] = c100(n.drift[f.lean] + 0.06 * f.comp);
    }
    // the line set by the last session
    if (line) { for (const k in line.mods) ADD(m, k, line.mods[k]); if (line.sig && n.sig != null) n.sig = c100(n.sig + line.sig); }
    if (G.tick >= n.sess.next) Rg.convene(G, n);
    Rg.nqMonth(G, n, m);
    if (!isP) Rg.aiMonth(G, n);
  };

  /* ---------------------------------------------------------------- plots and coups from within */
  Rg.aiPlot = function (G, n, f) {
    const how = Rg.canPurge(n);
    if (n.auth >= 14 && G.rng.chance(0.55)) Rg.purge(G, n, f.seat, true);
    else if (n.gold > 80 + 25 * f.comp && G.rng.chance(0.6)) Rg.winOver(G, n, f.seat, true);
    else if (how === 'dismiss' && G.rng.chance(0.5)) Rg.purge(G, n, f.seat, true);
  };
  Rg.strike = function (G, n, f) {
    const army = Rg.fig(n, 'army'), pol = Rg.fig(n, 'police');
    let p = 0.3 + (f.amb - 60) / 120 + (f.seat === 'army' ? 0.2 : 0) + (army && army !== f && army.loy > 60 ? -0.15 : 0) + (pol && pol !== f && pol.loy > 60 ? -0.15 : 0) + (n.stab < 35 ? 0.15 : 0) - (n.fs.military - 50) / 200;
    p = clamp(p, 0.1, 0.8);
    const isP = n.id === G.player, I = ID.ideo(n), parl = I.control.type === 'parliament';
    const B = Rg.body(n).circle;
    if (G.rng.chance(p)) {
      const old = n.leader.title + ' ' + n.leader.name;
      Rg.makeLeader(G, n, f);
      const turn = f.lean !== n.ideo && ID.IDEOLOGIES[f.lean] && !parl && G.rng.chance(0.6);
      ID.chron(G, 'coup', f.name + ' ' + (parl ? 'topples ' : 'overthrows ') + old + ' of ' + n.name + ' from inside the ' + B + '.', n.id);
      if (isP || ID.isMajor(G, n)) ID.headline(G, { kicker: parl ? 'A palace revolt' : 'Coup in the ' + B, title: f.name + ' takes power', sub: old + ' is ' + (parl ? 'voted out by his own party' : 'arrested at his desk') + (turn ? '. The new man brings his own ideas with him.' : '.'), a: n.id, tone: 'rev' });
      if (turn) ID.Politics.changeIdeology(G, n, f.lean, 'coup');
      else { n.stab -= parl ? 4 : 8; if (f.lean !== n.ideo && n.drift[f.lean] != null) n.drift[f.lean] = c100(n.drift[f.lean] + 25); }
    } else {
      Rg.replace(G, n, f);
      n.stab -= 4; n.grievance = c100(n.grievance + 6); n.a.fear = G.tick + 360;
      if (isP) ID.headline(G, { kicker: 'A plot uncovered', title: f.name + ' has failed', sub: 'The ' + Rg.title(n, f.seat).toLowerCase() + ' moved against the government and lost. The rest of the ' + B.toLowerCase() + ' is very quiet.', a: n.id, tone: 'pol' });
      else if (ID.isMajor(G, n)) ID.news(G, 'A plot inside the ' + B + ' of ' + n.name + ' fails; ' + f.name + ' is arrested.', 'pol', n.id);
    }
  };
  /* The figure takes the top job; the seat is filled anew. */
  Rg.makeLeader = function (G, n, f) {
    const tr = ID.rollTraits ? ID.rollTraits(G.rng, n.ideo) : [];
    n.leader = { name: f.name, age: f.age, title: ID.leaderTitle(n.ideo), traits: tr, from: f.seat };
    for (const g of n.circle) g.heir = false;
    n.flags.heir = 0;
    Rg.replace(G, n, f);
  };
  /* Called after a leader has died or retired (P.succession, P.newLeader): the heir, or the strongest, takes over. */
  Rg.successor = function (G, n, how) {
    if (!n.circle || !n.circle.length) return null;
    let f = Rg.heir(n);
    if (!f) { let best = -1; for (const g of n.circle) { const w = g.comp * (g.amb + 20) * (g.loy + 20) * (0.6 + G.rng.next() * 0.8); if (w > best) { best = w; f = g; } } }
    if (!f) return null;
    const lean = f.lean; Rg.makeLeader(G, n, f);
    if (lean !== n.ideo && n.drift[lean] != null) n.drift[lean] = c100(n.drift[lean] + 20);
    return f;
  };
  /* After a change of system: those who believed in the new order stay and rise; the rest are swept out. */
  Rg.onIdeology = function (G, n, from) {
    if (!n.circle) return;
    const keep = n.circle.filter((f) => f.lean === n.ideo);
    if (keep.length && n.a.ideoMode !== 'election') { const top = keep.sort((a, b) => b.comp * b.amb - a.comp * a.amb)[0]; Rg.makeLeader(G, n, top); }
    n.circle = R().SEATS.map((s) => { const g = n.circle.find((f) => f.seat === s && f.lean === n.ideo); return g ? Object.assign(g, { loy: Math.max(g.loy, 70), plot: 0 }) : Rg.newFig(G, n, s, { lean: n.ideo }); });
    n.circleIdeo = n.ideo;
    if (n.sess) { n.sess.next = G.tick + 180; n.sess.line = null; }
  };

  /* ---------------------------------------------------------------- personnel actions */
  Rg.costOf = (n, act, f) => (act === 'purge' ? { auth: Rg.canPurge(n) === 'purge' ? 14 : 10 } : act === 'win' ? { gold: Math.round(40 + 25 * f.comp) } : act === 'heir' ? { auth: 10 } : {});
  Rg.block = function (G, n, act, seat) {
    const f = Rg.fig(n, seat); if (!f) return 'Nobody holds that seat.';
    if (f.cd > G.tick) return 'Not again until ' + ID.dateOf(f.cd).short + '.';
    const c = Rg.costOf(n, act, f);
    if (c.auth && n.auth < c.auth) return 'Needs ' + c.auth + ' authority.';
    if (c.gold && n.gold < c.gold) return 'Needs ' + c.gold + ' gold.';
    if (act === 'heir') { if (f.heir) return 'Already the heir.'; if (f.loy < 40) return 'Too disloyal to trust with the succession.'; }
    if (act === 'win' && f.loy >= 90) return 'Already devoted.';
    return '';
  };
  Rg.purge = function (G, n, seat, ai) {
    const f = Rg.fig(n, seat); if (!f) return 'Nobody holds that seat.';
    if (!ai) { const w = Rg.block(G, n, 'purge', seat); if (w) return w; }
    const how = Rg.canPurge(n), c = Rg.costOf(n, 'purge', f);
    n.auth = Math.max(0, n.auth - (c.auth || 0));
    const fac = R().seats[seat].fac;
    n.sm[fac] -= how === 'purge' ? 6 : 3;
    if (how === 'purge') { n.grievance = c100(n.grievance + 6); n.a.fear = G.tick + 540; n.stab -= 2; }
    else if (how === 'disgrace') { n.stab -= 2; n.tradition = c100(n.tradition - 2); }
    else n.stab -= 1;
    if (f.comp >= 2.4) ID.addMod(n, { army: 'atk', police: 'unrest', economy: 'prod', ideology: 'legit', foreign: 'trade' }[seat], seat === 'police' ? 3 : seat === 'ideology' ? -3 : -0.06, 24, 'Loss of ' + f.name);
    const g = Rg.replace(G, n, f, { comp: Math.round((1 + G.rng.next() * 1.3) * 10) / 10, loy: G.rng.int(64, 82), cd: G.tick + 360 });
    for (const o of n.circle) if (o !== g) o.loy = c100(o.loy + (how === 'purge' ? 6 : 2));
    if (n.id === G.player) { ID.news(G, R().purgeName[how] + ': ' + f.name + ' (' + Rg.title(n, seat) + '). ' + g.name + ' takes the seat.', 'pol', n.id); ID.sfx(G, 'stamp'); G.uiDirty = true; }
    else if (ID.isMajor(G, n) && how === 'purge') ID.news(G, f.name + ', ' + Rg.title(n, seat) + ' of ' + n.name + ', is arrested.', 'pol', n.id);
    return '';
  };
  Rg.winOver = function (G, n, seat, ai) {
    const f = Rg.fig(n, seat); if (!f) return 'Nobody holds that seat.';
    if (!ai) { const w = Rg.block(G, n, 'win', seat); if (w) return w; }
    const c = Rg.costOf(n, 'win', f);
    n.gold -= c.gold; f.loy = c100(f.loy + 22); f.amb = c100(f.amb + 4); f.plot = Math.max(0, f.plot - 3); f.cd = G.tick + 360; n.corr = c100((n.corr || 0) + 1);
    if (n.id === G.player) { ID.news(G, f.name + ' is won over: a dacha, a pension and a seat at the top table.', 'pol', n.id); G.uiDirty = true; }
    return '';
  };
  Rg.makeHeir = function (G, n, seat) {
    const f = Rg.fig(n, seat); if (!f) return 'Nobody holds that seat.';
    const w = Rg.block(G, n, 'heir', seat); if (w) return w;
    n.auth -= 10;
    for (const g of n.circle) { g.heir = false; if (g !== f && g.amb > 60) g.loy = c100(g.loy - 10); }
    f.heir = true; f.loy = c100(f.loy + 15); f.cd = G.tick + 360; n.flags.heir = 1;
    if (n.id === G.player) { ID.news(G, f.name + ' is named successor. The others congratulate him, and take note.', 'pol', n.id); G.uiDirty = true; }
    return '';
  };

  /* ---------------------------------------------------------------- sessions */
  Rg.convene = function (G, n) {
    const B = Rg.body(n);
    n.sess.next = G.tick + B.every * 30;
    if (!Rg.lines(n).length) return;
    if (n.id === G.player && !G.autoPlayer) { if (!ID.Events.pending(G, 'rg_session')) ID.Events.queue(G, n, 'rg_session', {}); return; }
    const L = G.rng.weighted(Rg.lines(n), (l) => { let w = 1; try { w = l.ai(n, G) || 0.1; } catch (e) { w = 1; } return w; });
    Rg.adopt(G, n, L.id);
  };
  Rg.adopt = function (G, n, id, skipNow) {
    const L = Rg.lines(n).find((l) => l.id === id); if (!L) return;
    n.sess.line = id; n.sess.lineIdeo = n.ideo; n.sess.at = G.tick;
    if (!skipNow) ID.Events.applyFx(G, n, L.now, {});
    for (const f of n.circle) { if (f.lean === L.lean) f.loy = c100(f.loy + 12); else if (f.lean !== n.ideo) f.loy = c100(f.loy - 6); }
    if (ID.isMajor(G, n) && n.id !== G.player) ID.news(G, Rg.sessName(n) + ' of ' + n.name + ' adopts a new line: ' + L.name.toLowerCase() + '.', 'pol', n.id);
  };
  Rg.convokeBlock = (G, n) => (n.auth < 25 ? 'Needs 25 authority.' : G.tick - (n.sess.at || 0) < 360 ? 'The last session was less than a year ago.' : '');

  /* ---------------------------------------------------------------- national questions */
  Rg.nqMonth = function (G, n, m) {
    const Q = Rg.Q(G, n); if (!Q) return;
    const S = n.nq;
    let d = 0; try { d = Q.drift(n, G) || 0; } catch (e) { d = 0; }
    S.v = c100(S.v + clamp(d, -3, 3));
    if (Q.tick) try { Q.tick(n, G, S.v); } catch (e) { /* tolerate */ }
    let fx = {}; try { fx = Q.fx(n, S.v) || {}; } catch (e) { fx = {}; }
    for (const k in fx) ADD(m, k, fx[k]);
    S.lastFx = fx;
    const fire = (side, id) => { S.fired[side] = G.tick; ID.Events.queue(G, n, id, {}); };
    const okLo = !Q.loIf || Q.loIf(n, G), okHi = !Q.hiIf || Q.hiIf(n, G);
    if (Q.lo && okLo && !S.fired.lo && !ID.Events.pending(G, Q.lo)) {
      if (Q.loChance) { if (G.rng.chance(Q.loChance(S.v))) fire('lo', Q.lo); }
      else if (S.v <= Q.loAt) fire('lo', Q.lo);
    }
    if (Q.hi && okHi && !S.fired.hi && S.v >= Q.hiAt && !ID.Events.pending(G, Q.hi)) fire('hi', Q.hi);
    // a turning point can come again once the question has gone back to the middle, or after ten years
    for (const side of ['lo', 'hi']) if (S.fired[side] && ((S.v > 30 && S.v < 70) || G.tick - S.fired[side] > 3600) && G.tick - S.fired[side] > 720) S.fired[side] = 0;
  };
  Rg.nqAct = (n, id) => { const Q = ID.NATIONAL[n.base] && ID.NATIONAL[n.base].q; return Q ? Q.acts.find((a) => a.id === id) : null; };
  Rg.nqBlock = function (G, n, a) {
    if (!a) return 'Unknown action.';
    const cd = n.nq.cd[a.id] || 0; if (cd > G.tick) return 'Available again ' + ID.dateOf(cd).short + '.';
    const c = a.cost || {};
    if (c.auth && n.auth < c.auth) return 'Needs ' + c.auth + ' authority.';
    if (c.gold && n.gold < c.gold) return 'Needs ' + c.gold + ' gold.';
    if (a.can) { const w = a.can(n, G); if (w) return w; }
    return '';
  };
  Rg.nqRun = function (G, n, id) {
    const a = Rg.nqAct(n, id), why = Rg.nqBlock(G, n, a); if (why) return why;
    const c = a.cost || {};
    if (c.auth) n.auth -= c.auth; if (c.gold) n.gold -= c.gold;
    n.nq.cd[a.id] = G.tick + (a.cd || 12) * 30;
    n.nq.v = c100(n.nq.v + (a.dv || 0));
    ID.Events.applyFx(G, n, a.fx, {});
    if (n.id === G.player) { ID.news(G, a.name + '.', 'pol', n.id); ID.sfx(G, 'stamp'); G.uiDirty = true; }
    return '';
  };

  /* ---------------------------------------------------------------- AI */
  Rg.aiMonth = function (G, n) {
    const rng = G.rng;
    if (!Rg.heir(n) && n.leader.age > 60 && ID.ideo(n).control.type !== 'parliament' && rng.chance(0.1)) {
      const c = n.circle.filter((f) => f.loy > 55).sort((a, b) => b.comp - a.comp)[0]; if (c && n.auth > 30) Rg.makeHeir(G, n, c.seat);
    }
    const Q = Rg.Q(G, n);
    if (Q && rng.chance(0.1)) {
      // act toward the middle when the question runs to an extreme, otherwise now and then at random
      const v = n.nq.v, want = v > 72 ? -1 : v < 28 ? 1 : 0;
      const opts = Q.acts.filter((a) => !Rg.nqBlock(G, n, a) && (want === 0 ? rng.chance(0.3) : Math.sign(a.dv || 0) === want));
      if (opts.length) Rg.nqRun(G, n, rng.pick(opts).id);
    }
  };

  /* ---------------------------------------------------------------- effects of programmes and dispatches */
  Rg.install = function () {
    const Fo = ID.Focus; if (!Fo || !Fo.FX) return;
    const seatName = (n, s) => (n ? Rg.title(n, s) : R().seats[s].name);
    Fo.FX.nq = (G, n, f) => { if (n.nq) n.nq.v = c100(n.nq.v + f[1]); };
    Fo.FX.figLoy = (G, n, f) => { Rg.ensure(G, n); const g = Rg.fig(n, f[1]); if (g) g.loy = c100(g.loy + f[2]); };
    Fo.FX.figPurge = (G, n, f) => { Rg.ensure(G, n); if (Rg.fig(n, f[1])) Rg.purge(G, n, f[1], true); };
    Fo.FX.figHeir = (G, n, f) => { Rg.ensure(G, n); const g = Rg.fig(n, f[1]); if (g) { for (const o of n.circle) o.heir = false; g.heir = true; g.loy = c100(g.loy + 10); n.flags.heir = 1; } };
    Fo.FX.figLeader = (G, n, f) => { Rg.ensure(G, n); const g = Rg.fig(n, f[1]); if (g) Rg.makeLeader(G, n, g); };
    Fo.FX.circleLoy = (G, n, f) => { Rg.ensure(G, n); for (const g of n.circle) g.loy = c100(g.loy + f[1]); };
    Fo.FX.line = (G, n, f) => Rg.adopt(G, n, f[1], true);
    Fo.DESC.nq = (f, n) => { const Q = n && n.nq && ID.NATIONAL[n.base] ? ID.NATIONAL[n.base].q : null; return { t: (Q ? Q.name + ': toward “' + (f[1] > 0 ? Q.high : Q.low) + '”' : 'National question') + ' ' + (f[1] > 0 ? '+' : '−') + Math.abs(f[1]), good: null }; };
    Fo.DESC.figLoy = (f, n) => { const g = n && Rg.fig(n, f[1]); return { t: (g ? g.name : seatName(n, f[1])) + ': loyalty ' + (f[2] > 0 ? '+' : '−') + Math.abs(f[2]), good: f[2] > 0 }; };
    Fo.DESC.figPurge = (f, n) => { const g = n && Rg.fig(n, f[1]); return { t: (g ? g.name : seatName(n, f[1])) + ' is removed', good: null }; };
    Fo.DESC.figHeir = (f, n) => { const g = n && Rg.fig(n, f[1]); return { t: (g ? g.name : seatName(n, f[1])) + ' becomes the heir', good: null }; };
    Fo.DESC.figLeader = (f, n) => { const g = n && Rg.fig(n, f[1]); return { t: (g ? g.name : seatName(n, f[1])) + ' takes power', good: null }; };
    Fo.DESC.circleLoy = (f, n) => ({ t: 'The ' + (n ? Rg.body(n).circle : 'inner circle') + ': loyalty ' + (f[1] > 0 ? '+' : '−') + Math.abs(f[1]), good: f[1] > 0 });
    Fo.DESC.line = () => null;
  };

  /* ---------------------------------------------------------------- dispatches of the regime */
  const E = ID.EVENT_DEFS;
  E.push({ id: 'rg_plot', sys: 1, tone: 'bad', sfx: 'alarm',
    title: (n, G, c) => 'A plot in the ' + Rg.body(n).circle,
    text: (n, G, c) => { const f = Rg.fig(n, c.seat); const nm = f ? f.name : c.name; return 'Your people have a list of names, a date and a meeting place. At the head of the list is ' + nm + ', ' + Rg.title(n, c.seat) + '. ' + (f && f.lean !== n.ideo ? 'He wants ' + ID.IDEOLOGIES[f.lean].name + ', and he has friends who want it too.' : 'He wants your chair.'); },
    opts: (G, n, c) => {
      const f = Rg.fig(n, c.seat), how = Rg.canPurge(n), out = [];
      if (!f) return [{ label: 'The danger has passed', fx: [] }];
      out.push({ label: R().purgeName[how] + ' ' + f.name, tip: R().purgeDesc[how], fx: [['figPurge', c.seat]] });
      out.push({ label: 'Buy him off', tip: 'A dacha, a pension and a seat at the top table.', can: (nn) => nn.gold >= 40 + 25 * f.comp, fx: [['gold', -Math.round(40 + 25 * f.comp)], ['figLoy', c.seat, 25], ['fn', (GG, nn) => { const g = Rg.fig(nn, c.seat); if (g) g.plot = 0; }]] });
      out.push({ label: 'Let him try', tip: 'Perhaps the army will stand by you. Perhaps not.', fx: [['note', 'The plot goes on', false]] });
      return out;
    } });
  E.push({ id: 'rg_session', sys: 1, tone: 'mixed', sfx: 'stamp',
    title: (n) => Rg.sessName(n),
    text: (n, G) => {
      const B = Rg.body(n), cur = Rg.line(n);
      let t = 'The delegates are in their seats and the ' + B.circle + ' has prepared three resolutions. Whichever passes is the line until the next session, in ' + Math.round(B.every / 12) + ' years.';
      if (cur) t += ' The current line is “' + cur.name + '”.';
      const used = {};
      const sp = Rg.lines(n).map((l) => { const b = n.circle.filter((f) => !used[f.name] && f.lean === l.lean && (f.lean !== n.ideo || f.amb > 55)).sort((a, c) => c.amb - a.amb); if (!b.length) return ''; used[b[0].name] = 1; return b[0].name + ' speaks for “' + l.name + '”.'; }).filter(Boolean);
      return t + (sp.length ? ' ' + sp.join(' ') : '');
    },
    opts: (G, n) => Rg.lines(n).map((l) => {
      const backers = n.circle.filter((f) => f.lean === l.lean).map((f) => f.name.split(' ').pop());
      const mods = ID.Doctrine.describe(l.mods).map((x) => x.t).join(', ');
      return { label: l.name, tip: l.desc + (backers.length ? ' Pleases ' + backers.join(', ') + '.' : ''), fx: [['line', l.id]].concat(ID.Doctrine.describe(l.mods).map((x, k) => ['note', (k ? '' : 'While it stands: ') + x.t, x.good])).concat(l.now), ai: () => { try { return l.ai(n, G); } catch (e) { return 1; } } };
    }) });

  Rg.install();
})();
