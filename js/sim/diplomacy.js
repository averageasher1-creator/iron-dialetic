/* IRON DIALECTIC — diplomacy: wars, peace, capitulation, blocs, treaties, covert operations. No DOM. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const clamp = ID.clamp, MAXN = ID.MAXN, B = ID.B;
  const D = (ID.Diplomacy = {});

  D.warOf = (G, a, b) => { const d = G.dip[ID.dkey(a, b)]; return d && d.war ? d.war : null; };
  D.enemies = (G, n) => { const out = []; for (const o of G.nations) if (o && o.alive && o.id !== n.id && ID.atWar(G, n.id, o.id)) out.push(o); return out; };
  D.power = (n) => n.troops * (n.a.atk || 1) + n.pop * 0.02 + n.ind * 2;

  /* ---------------------------------------------------------------- casus belli */
  D.casusBelli = function (G, A, Bn) {
    const I = ID.ideo(A);
    for (let p = 1; p < G.provinces.length; p++) { const Pr = G.provinces[p]; if (Pr.owner === Bn.id && Pr.core === A.id) return 'cores'; }
    if (A.claims.length) for (const p of A.claims) if (G.provinces[p].owner === Bn.id) return 'claims';
    for (const o of G.nations) if (o && o.alive && o.id !== A.id && ID.sameBloc(G, A.id, o.id) && ID.atWar(G, o.id, Bn.id)) return 'ally';
    if (Bn.threat > 60) return 'coalition';
    if (I.dip.cb.indexOf('holy') >= 0 && (Bn.laws.religion === 'secular' || Bn.laws.religion === 'atheism')) return 'holy';
    if (I.dip.cb.indexOf('liberate') >= 0 && Bn.a.mv && Bn.a.mv.ideo && ID.IDEOLOGIES[Bn.a.mv.ideo].family === I.family && (Bn.a.opp || 0) > 30) return 'liberate';
    if (I.dip.cb.indexOf('liberate') >= 0 && (Bn.a.opp || 0) > 45 && ID.ideo(Bn).family !== I.family) return 'liberate';
    if (I.dip.cb.indexOf('containment') >= 0 && Bn.threat > 35) return 'containment';
    return null;
  };
  D.CB_NAMES = { cores: 'Reclaim our provinces', claims: 'Press our claims', ally: 'Defend an ally', coalition: 'Coalition against a menace', holy: 'Holy war', liberate: 'Liberate the oppressed', containment: 'Containment', civil: 'Civil war', independence: 'War of independence', alliance: 'Alliance obligations', none: 'Naked aggression' };

  /* Why can't A declare war on B? '' if it can. */
  D.warBlock = function (G, A, Bn) {
    if (!Bn.alive) return 'That state no longer exists.';
    if (ID.atWar(G, A.id, Bn.id)) return 'Already at war.';
    const d = ID.dipOf(G, A.id, Bn.id);
    if (d.truce > G.tick) return 'Truce until ' + ID.dateOf(d.truce).short + '.';
    if (ID.sameBloc(G, A.id, Bn.id)) return 'You are in the same bloc. Leave it first.';
    return '';
  };

  D.startWar = function (G, A, Bn, cb) {
    if (ID.atWar(G, A.id, Bn.id) || A === Bn) return;
    const d = ID.dipOf(G, A.id, Bn.id);
    const brokeNap = d.nap;
    const total = cb === 'civil' || cb === 'independence' || cb === 'liberate' || cb === 'holy' || cb === 'coalition' || Bn.tiles < 450 || ID.ideo(A).dip.agg >= 0.8;
    d.war = { a: A.id, b: Bn.id, start: G.tick, ta: 0, tb: 0, cb: cb || 'none', aim: total ? 'total' : 'limited' };
    d.nap = 0; d.trade = 0; d.truce = 0;
    G.warM[A.id * MAXN + Bn.id] = G.warM[Bn.id * MAXN + A.id] = 1;
    for (const n of [A, Bn]) { if (!n.nwars) { n.a.warTiles = n.tiles; n.a.warInd = n.ind; n.a.capLost = 0; } n.nwars++; }
    Bn.a.defensive = true; if (A.nwars === 1) A.a.defensive = false;
    ID.addOpBoth(G, A.id, Bn.id, -60);
    G.world.tension = Math.min(100, G.world.tension + 2);
    if (cb !== 'civil' && cb !== 'independence' && cb !== 'alliance') {
      A.threat += cb && cb !== 'none' ? 4 : 13;
      if (brokeNap) { A.threat += 15; for (const o of G.nations) if (o && o.alive && o !== A) ID.addOp(G, o.id, A.id, -18); ID.news(G, A.name + ' tears up its pact with ' + Bn.name + '.', 'bad', A.id, Bn.id); }
      if ((!cb || cb === 'none') && ID.ideo(A).elections) A.mandate = Math.max(0, A.mandate - 6);
      for (const o of G.nations) if (o && o.alive && o !== A && o !== Bn && ID.op(G, o.id, Bn.id) > 30) ID.addOp(G, o.id, A.id, -12);
      ID.news(G, 'WAR: ' + A.name + ' declares war on ' + Bn.name + ' (' + D.CB_NAMES[cb || 'none'] + ').', 'war', A.id, Bn.id);
      ID.chron(G, 'war', A.name + ' declares war on ' + Bn.name + '.', A.id, Bn.id);
      if (A.id === G.player) ID.headline(G, { kicker: 'Mobilisation', title: 'War with ' + Bn.base, sub: A.name + ' declares war on ' + Bn.name + '. ' + D.CB_NAMES[cb || 'none'] + '.', a: A.id, b: Bn.id, tone: 'war' });
      else if (Bn.id === G.player) ID.headline(G, { kicker: 'Invasion', title: Bn.base + ' attacked', sub: A.name + ' has declared war on us. The army stands to the frontier.', a: A.id, b: Bn.id, tone: 'war' });
      else if (ID.isMajor(G, A) && ID.isMajor(G, Bn)) ID.headline(G, { kicker: 'The powers collide', title: A.base + ' against ' + Bn.base, sub: 'Two of the world’s great powers are at war.', a: A.id, b: Bn.id, tone: 'war' });
      if (A.id === G.player || Bn.id === G.player) ID.sfx(G, 'war');
      // balance of power: rivals of the aggressor may step in for a much weaker victim
      if (D.power(Bn) < D.power(A) * 0.6 && cb !== 'coalition') {
        for (const o of G.nations) {
          if (!o || !o.alive || o === A || o === Bn || o.nwars || ID.sameBloc(G, o.id, A.id) || ID.atWar(G, o.id, Bn.id)) continue;
          if (!(o.ai || G.autoPlayer) || ID.op(G, o.id, A.id) > -22 || D.power(o) < D.power(A) * 0.55 || o.stab < 38) continue;
          if (!ID.borders(G, o.id, A.id) && !ID.borders(G, o.id, Bn.id)) continue;
          if (D.warBlock(G, o, A) || ID.dipOf(G, o.id, A.id).nap) continue;
          if (G.rng.chance(0.3 + (ID.op(G, o.id, Bn.id) > 10 ? 0.2 : 0))) {
            ID.news(G, o.name + ' intervenes to protect ' + Bn.name + '.', 'dip', o.id, Bn.id);
            D.startWar(G, o, A, 'containment'); ID.addOpBoth(G, o.id, Bn.id, 25);
          }
        }
      }
      // defender's bloc is called in
      if (Bn.bloc) {
        const bl = G.blocs[Bn.bloc];
        for (const mid of bl.members.slice()) {
          const m = G.nations[mid]; if (!m || !m.alive || m === Bn || m === A || ID.atWar(G, m.id, A.id)) continue;
          if (m.id === G.player) ID.Events.queue(G, m, 'ally_attacked', { ally: Bn.id, enemy: A.id });
          else if (ID.op(G, m.id, Bn.id) > 10 && G.rng.chance(0.8)) D.startWar(G, m, A, 'alliance');
          else if (G.rng.chance(0.3)) D.leaveBloc(G, m, false);
        }
      }
    }
    if (!G.headless) G.dirtyAll = true;
  };

  D.resolveWarVote = function (G, n, v) {
    const t = G.nations[v.target]; if (!t || !t.alive || D.warBlock(G, n, t)) return;
    const res = ID.Politics.vote(G, n, 'war', { target: t.id, cb: v.cb });
    if (res.pass) D.startWar(G, n, t, v.cb || 'none');
    else if (n.id === G.player) ID.news(G, 'The ' + ID.ideo(n).control.body + ' votes against war with ' + t.name + ' (' + Math.round(res.yes) + '% in favour).', 'pol', n.id);
  };
  /* Player/AI entry point. Returns '' if war started or a vote was scheduled; else the reason. */
  D.declare = function (G, A, Bn) {
    const why = D.warBlock(G, A, Bn); if (why) return why;
    const I = ID.ideo(A), cb = D.casusBelli(G, A, Bn);
    if (I.control.warVote && !A.emergency) {
      const res = ID.Politics.vote(G, A, 'war', { target: Bn.id, cb });
      if (I.control.type === 'assembly') {
        if (!res.pass) return 'The ' + I.control.body + ' will not vote for this war (' + Math.round(res.yes) + '% in favour).';
        for (const v of G.votes) if (v.n === A.id && v.kind === 'war' && v.target === Bn.id) return 'The ' + I.control.body + ' is already debating it.';
        G.votes.push({ n: A.id, kind: 'war', target: Bn.id, cb, at: G.tick + (I.control.delay || 30) });
        if (A.id === G.player) ID.news(G, 'The ' + I.control.body + ' opens debate on war with ' + Bn.name + '. A decision is due ' + ID.dateOf(G.tick + I.control.delay).str + '.', 'pol', A.id);
        return '';
      }
      if (!res.pass) { A.auth = Math.max(0, A.auth - 5); return 'The ' + I.control.body + ' rejects the declaration (' + Math.round(res.yes) + '% in favour).'; }
    } else if (I.control.griev && !cb) A.grievance = Math.min(100, A.grievance + I.control.griev * 2);
    D.startWar(G, A, Bn, cb || 'none');
    return '';
  };

  /* War score from A's point of view: -1..1 */
  D.warScore = function (G, A, Bn) {
    const w = D.warOf(G, A.id, Bn.id); if (!w) return 0;
    const mine = w.a === A.id ? w.ta : w.tb, theirs = w.a === A.id ? w.tb : w.ta;
    const base = Math.max(150, Math.min(A.a.warTiles || A.tiles, Bn.a.warTiles || Bn.tiles));
    return clamp((mine - theirs) / base, -1, 1);
  };

  D.endWarState = function (G, A, Bn, truce) {
    const d = ID.dipOf(G, A.id, Bn.id); if (!d.war) return;
    d.war = 0; if (truce) d.truce = G.tick + 5 * 360;
    G.warM[A.id * MAXN + Bn.id] = G.warM[Bn.id * MAXN + A.id] = 0;
    A.nwars = Math.max(0, A.nwars - 1); Bn.nwars = Math.max(0, Bn.nwars - 1);
    for (let k = G.attacks.length - 1; k >= 0; k--) {
      const a = G.attacks[k];
      if ((a.from === A.id && a.to === Bn.id) || (a.from === Bn.id && a.to === A.id)) { G.attacks.splice(k, 1); const o = G.nations[a.from]; if (o.alive) o.troops += a.troops; }
    }
  };
  D.peace = function (G, A, Bn) {
    const w = D.warOf(G, A.id, Bn.id); if (!w) return;
    const s = D.warScore(G, A, Bn);
    D.endWarState(G, A, Bn, true);
    const win = s > 0.12 ? A : s < -0.12 ? Bn : null, lose = win === A ? Bn : win === Bn ? A : null;
    if (win) {
      win.glory = clamp(win.glory + 12 + Math.abs(s) * 20, 0, 100); win.prestige += 8 + Math.abs(s) * 14; win.cnt.warsWon = (win.cnt.warsWon || 0) + 1;
      lose.glory = clamp(lose.glory - 14 - Math.abs(s) * 20, 0, 100); lose.lostWarAt = lose.age; lose.stab -= 5;
      if (w.cb === 'holy' && w.a === win.id) win.cnt.holyWars = (win.cnt.holyWars || 0) + 1;
      if ((lose.a.warInd || 0) >= 2 * (win.a.warInd || 1)) win.flags.beatStronger = 1;
      ID.logGrief(lose, G.tick, 'Lost the war against ' + win.name + '.');
    }
    ID.news(G, 'Peace between ' + A.name + ' and ' + Bn.name + (win ? ': ' + win.name + ' keeps its gains.' : ', with nothing settled.'), 'dip', A.id, Bn.id);
    ID.chron(G, 'peace', 'Peace between ' + A.name + ' and ' + Bn.name + (win ? '; ' + win.name + ' is the victor.' : '.'), A.id, Bn.id);
    if (!G.headless) G.dirtyAll = true;
  };
  /* Would the AI nation X accept peace offered by Y? */
  D.wantsPeace = function (G, X, Y) {
    const w = D.warOf(G, X.id, Y.id); if (!w) return false;
    if (w.cb === 'civil') return false;
    const s = D.warScore(G, X, Y), months = (G.tick - w.start) / 30;
    if (months < 4) return false;
    const attacker = w.a === X.id;
    if (attacker && w.aim === 'limited' && s >= 0.28) return true;      // took what it came for
    if (!attacker && w.aim === 'limited' && s <= -0.12) return true;   // cut the losses
    if (months < 8) return false;
    let v = -s * 60 + X.we * 0.9 + (months > 30 ? 15 : 0) + (X.stab < 30 ? 20 : 0) + (X.nwars > 1 ? 12 : 0) - 28;
    if (s > 0.25 && X.troops > Y.troops * 1.3 && w.aim === 'total') v -= 30;
    return v > 0;
  };

  /* ---------------------------------------------------------------- capitals and capitulation */
  D.relocateCapital = function (G, n) {
    const W = G.W, ox = n.capital % W, oy = (n.capital / W) | 0; let best = -1, bs = -1;
    for (const i of G.blist) if (G.bld[i] === B.CITY && G.owner[i] === n.id) { const d = Math.hypot((i % W) - ox, ((i / W) | 0) - oy) + (G.cut[i] ? -500 : 0); if (d > bs) { bs = d; best = i; } }
    if (best < 0) {
      let bp = null; for (let p = 1; p < G.provinces.length; p++) { const Pr = G.provinces[p]; if ((Pr.cnt[n.id] || 0) > (bp ? bp.cnt[n.id] : 0)) bp = Pr; }
      if (bp) { if (G.owner[bp.center] === n.id) best = bp.center; else for (let i = 0; i < G.N; i++) if (G.owner[i] === n.id && G.prov[i] === bp.id) { best = i; break; } }
    }
    if (best >= 0) n.capital = best;
    return best >= 0;
  };
  D.onCapitalLost = function (G, L, Wn) {
    if (!L || !L.alive) return;
    if (L.tiles <= 0) { D.eliminate(G, L, Wn); return; }
    if (G.owner[L.capital] === L.id) return;
    D.relocateCapital(G, L);
    if (!Wn) return;
    const fl = ID.ideo(L).flags;
    const w = D.warOf(G, L.id, Wn.id);
    if (!w) return;
    if (fl.noDecap) { ID.news(G, Wn.name + ' takes the largest town of ' + L.name + '. The communes fight on.', 'war', Wn.id, L.id); return; }
    L.a.capLost = (L.a.capLost || 0) + 1;
    L.stab -= 14; L.glory = Math.max(0, L.glory - 18); ID.addMod(L, 'legit', -8, 12, 'Capital lost');
    Wn.glory = Math.min(100, Wn.glory + 10); Wn.prestige += 8;
    ID.news(G, 'The capital of ' + L.name + ' falls to ' + Wn.name + '.', 'war', Wn.id, L.id);
    if (L.id === G.player) ID.headline(G, { kicker: 'Catastrophe', title: 'The capital has fallen', sub: Wn.name + ' holds the seat of government. The ministries flee to ' + (G.provinces[G.prov[L.capital]] ? 'the provinces' : 'wherever they can') + '.', a: Wn.id, b: L.id, tone: 'bad' });
    else if (Wn.id === G.player) ID.headline(G, { kicker: 'Victory', title: L.base + '’s capital taken', sub: 'Our troops march through the capital of ' + L.name + '.', a: Wn.id, b: L.id, tone: 'good' });
    ID.logGrief(L, G.tick, 'The capital fell to ' + Wn.name + '.');
    ID.fx(G, 'capital', L.capital);
    if (L.id === G.player) ID.sfx(G, 'bad'); else if (Wn.id === G.player) ID.sfx(G, 'good');
    if (G.tick - w.start < 60) return;
    const wt = L.a.warTiles || L.startTiles;
    if (L.tiles < wt * 0.34 || L.troops < L.pop * 0.004) D.capitulate(G, L, Wn);
  };
  D.capitulate = function (G, L, Wn) {
    if (!L.alive || !Wn.alive) return;
    const civil = L.civilOf === Wn.id || L.civil === Wn.id;
    if (civil) { D.resolveCapitulation(G, L, Wn, 'annex'); return; }
    if (L.id === G.player) { ID.Game.defeat(G, 'conquered', { by: Wn.id }); return; }
    if (Wn.id === G.player) { L.a.capitulating = G.tick; ID.Events.queue(G, Wn, 'capitulation', { loser: L.id }); return; }
    const I = ID.ideo(Wn);
    const mode = (I.flags.satellite || I.dip.export >= 0.5 || (Wn.a.noncoreShare || 0) > 0.3) && L.tiles > 60 && G.rng.chance(0.7) ? 'install' : 'annex';
    D.resolveCapitulation(G, L, Wn, mode);
  };
  D.resolveCapitulation = function (G, L, Wn, mode) {
    if (!L.alive) return;
    const w = D.warOf(G, L.id, Wn.id);
    Wn.glory = clamp(Wn.glory + 18, 0, 100); Wn.prestige += 12; Wn.cnt.warsWon = (Wn.cnt.warsWon || 0) + 1;
    if (w && w.cb === 'holy' && w.a === Wn.id) Wn.cnt.holyWars = (Wn.cnt.holyWars || 0) + 1;
    if ((L.a.warInd || 0) >= 2 * (Wn.a.warInd || 1)) Wn.flags.beatStronger = 1;
    if (mode === 'install' || mode === 'release') {
      for (let i = 0; i < G.N; i++) if (G.owner[i] === Wn.id && G.provinces[G.prov[i]].core === L.id) ID.setOwner(G, i, L.id);
      for (const e of D.enemies(G, L)) D.endWarState(G, L, e, true);
      if (G.owner[L.capital] !== L.id) D.relocateCapital(G, L);
      L.troops = L.pop * 0.02; L.we = 20; L.lostWarAt = L.age; L.glory = 10;
      if (mode === 'install') {
        if (L.ideo !== Wn.ideo) ID.Politics.changeIdeology(G, L, Wn.ideo, 'imposed', Wn.id);
        else { Wn.cnt.exported = (Wn.cnt.exported || 0) + 1; Wn.a.spreadAt = G.tick; }
        ID.addOpBoth(G, L.id, Wn.id, 80);
        if (L.bloc) D.leaveBloc(G, L, false);
        if (!Wn.bloc) D.formBloc(G, Wn);
        D.joinBloc(G, L, Wn.bloc);
        Wn.threat += 5;
        ID.news(G, L.name + ' capitulates. ' + Wn.name + ' installs a friendly government.', 'war', Wn.id, L.id);
        if (Wn.id === G.player) ID.headline(G, { kicker: 'Peace dictated', title: L.base + ' capitulates', sub: 'A friendly government takes power under our protection.', a: Wn.id, b: L.id, tone: 'good' });
        ID.chron(G, 'conquest', Wn.name + ' defeats its neighbour and installs a client regime: ' + L.name + '.', Wn.id, L.id);
      } else {
        Wn.gold += 120 + L.gold * 0.5; L.gold *= 0.5; ID.addOpBoth(G, L.id, Wn.id, 25);
        ID.news(G, L.name + ' capitulates and is released on payment of an indemnity.', 'war', Wn.id, L.id);
        ID.chron(G, 'peace', Wn.name + ' defeats ' + L.name + ' and withdraws.', Wn.id, L.id);
      }
      if (!G.headless) G.dirtyAll = true;
      return;
    }
    const gained = L.tiles;
    for (let i = 0; i < G.N; i++) if (G.owner[i] === L.id) ID.setOwner(G, i, Wn.id);
    Wn.threat += 10 + (gained / G.landCount) * 220;
    Wn.gold += Math.max(0, L.gold * 0.7);
    D.eliminate(G, L, Wn, true);
  };

  D.eliminate = function (G, n, by, annexed) {
    if (!n.alive) return;
    n.alive = false; n.tiles = Math.max(0, n.tiles);
    for (const o of G.nations) if (o && o !== n && ID.atWar(G, n.id, o.id)) D.endWarState(G, n, o, false);
    for (let k = G.attacks.length - 1; k >= 0; k--) { const a = G.attacks[k]; if (a.from === n.id || a.to === n.id) { G.attacks.splice(k, 1); if (a.from !== n.id) { const o = G.nations[a.from]; if (o.alive) o.troops += a.troops; } } }
    for (let k = G.boats.length - 1; k >= 0; k--) if (G.boats[k].owner === n.id) G.boats.splice(k, 1);
    for (const o of G.nations) if (o && o.ops.length) o.ops = o.ops.filter((x) => x.target !== n.id);
    if (n.bloc) D.leaveBloc(G, n, false);
    n.nwars = 0;
    const civil = by && (n.civilOf === by.id || n.civil === by.id);
    if (civil) {
      for (let p = 1; p < G.provinces.length; p++) { const Pr = G.provinces[p]; if (Pr.core === n.id) { Pr.core = by.id; if (Pr.owner === by.id) Pr.integ = 100; } }
      by.civil = 0; by.civilOf = 0; by.a.civilEnd = G.tick; by.glory = clamp(by.glory + 20, 0, 100); by.stab = Math.min(100, by.stab + 8); by.cnt.civilWarsWon = (by.cnt.civilWarsWon || 0) + 1;
      if (by.claims.length === 0 && n.claims.length) by.claims = n.claims.slice();
      ID.news(G, 'The civil war is over: ' + by.name + ' rules the whole country.', 'rev', by.id);
      ID.chron(G, 'civilwar', 'The civil war ends. ' + by.name + ' is victorious over ' + n.name + '.', by.id, n.id);
      if (by.sponsor && G.nations[by.sponsor] && G.nations[by.sponsor].alive) { const s = G.nations[by.sponsor]; s.cnt.exported = (s.cnt.exported || 0) + 1; s.fervor = Math.min(100, s.fervor + 18); s.a.spreadAt = G.tick; by.sponsor = 0; }
      if (by.civilOf === 0 && ID.IDEOLOGIES[by.ideo]) { const W = G.W; G.world.waves.push({ fam: ID.ideo(by).family, ideo: by.ideo, str: 1, m: 0, x: by.capital % W, y: (by.capital / W) | 0, src: by.id }); }
    } else {
      ID.news(G, n.name + (annexed ? ' is annexed by ' + by.name + '.' : ' ceases to exist.'), 'war', by ? by.id : 0, n.id);
      ID.chron(G, 'conquest', n.name + (by ? ' is conquered by ' + by.name + '.' : ' collapses.'), by ? by.id : 0, n.id);
    }
    if (n.id === G.player && !G.over) ID.Game.defeat(G, civil ? 'civilwar' : 'conquered', { by: by ? by.id : 0 });
    if (by && by.id === G.player) { ID.sfx(G, 'victory'); if (!civil) ID.headline(G, { kicker: 'Annexation', title: n.base + ' is no more', sub: 'Its lands pass to ' + by.name + '.', a: by.id, b: n.id, tone: 'good' }); }
    if (!G.headless) G.dirtyAll = true;
  };

  /* ---------------------------------------------------------------- blocs */
  D.formBloc = function (G, leader) {
    if (leader.bloc) return G.blocs[leader.bloc];
    const fam = ID.ideo(leader).family; let name = ID.FAMILIES[fam].bloc;
    for (const b of G.blocs) if (b && b.name === name && b.members.length) { name = leader.adj + ' Pact'; break; }
    const bl = { id: G.blocs.length, name, leader: leader.id, fam, members: [leader.id], col: leader.color };
    G.blocs.push(bl); leader.bloc = bl.id;
    ID.news(G, leader.name + ' founds the ' + name + '.', 'dip', leader.id);
    ID.chron(G, 'bloc', leader.name + ' founds the ' + name + '.', leader.id);
    return bl;
  };
  D.joinBloc = function (G, n, blocId) {
    const bl = G.blocs[blocId]; if (!bl || n.bloc === blocId) return;
    if (n.bloc) D.leaveBloc(G, n, false);
    bl.members.push(n.id); n.bloc = blocId;
    for (const m of bl.members) if (m !== n.id) { ID.addOpBoth(G, n.id, m, 20); const d = ID.dipOf(G, n.id, m); d.truce = 0; }
    ID.news(G, n.name + ' joins the ' + bl.name + '.', 'dip', n.id);
    if (!G.headless) G.dirtyAll = true;
  };
  D.leaveBloc = function (G, n, hostile) {
    const bl = G.blocs[n.bloc]; if (!bl) { n.bloc = 0; return; }
    bl.members = bl.members.filter((m) => m !== n.id); n.bloc = 0;
    if (hostile) for (const m of bl.members) ID.addOpBoth(G, n.id, m, -25);
    if (bl.leader === n.id && bl.members.length) {
      let best = null; for (const m of bl.members) { const o = G.nations[m]; if (o.alive && (!best || D.power(o) > D.power(best))) best = o; }
      if (best) bl.leader = best.id;
    }
    if (bl.members.length <= 1) { for (const m of bl.members) G.nations[m].bloc = 0; bl.members = []; ID.news(G, 'The ' + bl.name + ' dissolves.', 'dip'); }
    else if (n.alive) ID.news(G, n.name + ' leaves the ' + bl.name + '.', 'dip', n.id);
    if (!G.headless) G.dirtyAll = true;
  };

  /* ---------------------------------------------------------------- proposals (AI acceptance) */
  /* kind: trade | nap | ally | peace | embargo(no acceptance needed) | cancel_trade | cancel_nap. Returns {ok, why}. */
  D.evalProposal = function (G, from, to, kind) {
    const op = ID.op(G, to.id, from.id);
    const If = ID.ideo(from), It = ID.ideo(to);
    if (ID.atWar(G, from.id, to.id) && kind !== 'peace') return { ok: false, why: 'You are at war.' };
    if (kind === 'trade') {
      if (to.laws.trade === 'autarky' || from.laws.trade === 'autarky') return { ok: false, why: 'Autarky rules out trade treaties.' };
      if (from.flags.embargoed) return { ok: false, why: 'The world has placed you under embargo.' };
      const s = op + 22 * (If.dip.trade + It.dip.trade - 1) + (If.flags.tradeAll || It.flags.tradeAll ? 22 : 0) - from.threat * 0.3;
      return { ok: s > 4, why: s > 4 ? '' : 'They do not trust you enough to trade (need better relations; currently ' + Math.round(op) + ').', s };
    }
    if (kind === 'nap') {
      let s = op + (to.nwars ? 22 : 0) + (D.power(from) > D.power(to) * 1.2 ? 12 : 0) - (D.casusBelli(G, to, from) === 'claims' ? 35 : 0) - from.threat * 0.25;
      return { ok: s > 14, why: s > 14 ? '' : 'They see no reason to tie their hands (relations ' + Math.round(op) + ').', s };
    }
    if (kind === 'ally') {
      if (ID.areRivals(from.ideo, to.ideo)) return { ok: false, why: 'Sectarian rivals will not share a bloc.' };
      const aff = ID.ideoAffinity(from.ideo, to.ideo);
      let common = 0; for (const e of D.enemies(G, to)) if (ID.atWar(G, from.id, e.id) || ID.op(G, from.id, e.id) < -40) common = 18;
      const s = op * 0.8 + aff * 0.6 + common - 38;
      return { ok: s > 0 && aff > -5, why: s > 0 && aff > -5 ? '' : aff <= -5 ? 'Your systems are too far apart for an alliance.' : 'Relations are not close enough (' + Math.round(op) + ').', s };
    }
    if (kind === 'peace') { const ok = D.wantsPeace(G, to, from); return { ok, why: ok ? '' : 'They believe they can still win.' }; }
    return { ok: true, why: '' };
  };
  /* Carry out a proposal that has been accepted. */
  D.enact = function (G, from, to, kind) {
    const d = ID.dipOf(G, from.id, to.id);
    if (kind === 'trade') { d.trade = 1; d.embargo = 0; ID.addOpBoth(G, from.id, to.id, 6); ID.news(G, from.name + ' and ' + to.name + ' sign a trade treaty.', 'dip', from.id, to.id); }
    else if (kind === 'nap') { d.nap = 1; ID.addOpBoth(G, from.id, to.id, 8); ID.news(G, from.name + ' and ' + to.name + ' sign a non-aggression pact.', 'dip', from.id, to.id); }
    else if (kind === 'ally') {
      const lead = to.bloc ? to : from.bloc ? from : D.power(to) > D.power(from) ? to : from, other = lead === to ? from : to;
      if (!lead.bloc) D.formBloc(G, lead);
      D.joinBloc(G, other, lead.bloc);
    }
    else if (kind === 'peace') D.peace(G, from, to);
    else if (kind === 'embargo') { d.trade = 0; d.embargo = 1; ID.addOpBoth(G, from.id, to.id, -15); ID.news(G, from.name + ' embargoes ' + to.name + '.', 'dip', from.id, to.id); }
    else if (kind === 'cancel_trade') { d.trade = 0; ID.addOpBoth(G, from.id, to.id, -6); }
    else if (kind === 'cancel_nap') { d.nap = 0; ID.addOpBoth(G, from.id, to.id, -15); from.threat += 4; }
    if (from.id === G.player || to.id === G.player) ID.sfx(G, 'stamp');
  };
  D.propose = function (G, from, to, kind) {
    const r = D.evalProposal(G, from, to, kind);
    if (!r.ok) return r.why || 'They refuse.';
    D.enact(G, from, to, kind); return '';
  };

  /* ---------------------------------------------------------------- covert operations */
  D.opCost = function (G, n, type) {
    const cheap = ID.ideo(n).flags.permRev ? 0.5 : 1;
    return type === 'fund' ? 6 * cheap : type === 'coup' ? Math.round(150 * cheap) : type === 'strike' ? 60 : 0;
  };
  D.startOp = function (G, n, type, target) {
    const I = ID.ideo(n);
    if (!target.alive || target === n) return 'No such target.';
    if (type === 'fund') {
      if (n.ops.some((o) => o.type === 'fund' && o.target === target.id)) return 'You are already funding a movement there.';
      if (n.ops.length >= 3) return 'Your networks are stretched: three operations at most.';
      n.ops.push({ type: 'fund', target: target.id, cost: D.opCost(G, n, 'fund'), since: G.tick });
      return '';
    }
    if (type === 'coup') {
      const cost = D.opCost(G, n, 'coup');
      if (n.gold < cost) return 'Not enough gold (' + cost + ').';
      if ((n.cd['coup_' + target.id] || 0) > G.tick) return 'Your contacts there are lying low until ' + ID.dateOf(n.cd['coup_' + target.id]).short + '.';
      if (ID.ideo(target).flags.noCoup) return 'There is no officer corps there to suborn.';
      n.gold -= cost; n.cd['coup_' + target.id] = G.tick + 4 * 360;
      const p = ID.Politics.coupOdds(G, target, true) * 0.55 * (I.flags.permRev ? 1.4 : 1);
      if (G.rng.chance(p)) { ID.news(G, 'Officers move against the government of ' + target.name + '.', 'pol', target.id); ID.Politics.coup(G, target, n.id); }
      else {
        ID.addOpBoth(G, n.id, target.id, -35); target.sm.military += 5;
        ID.news(G, target.name + ' exposes a foreign-backed plot and blames ' + n.name + '.', 'dip', target.id, n.id);
        if (n.id === G.player) ID.sfx(G, 'bad');
      }
      return '';
    }
    if (type === 'strike') {
      if (!I.flags.generalStrike) return 'Only a syndicalist federation can call a general strike abroad.';
      if (n.gold < 60 || n.auth < 20) return 'Needs 60 gold and 20 authority.';
      if ((n.cd['strike_' + target.id] || 0) > G.tick) return 'The unions there need time to recover (until ' + ID.dateOf(n.cd['strike_' + target.id]).short + ').';
      if (target.laws.labor === 'control') return 'The workers there already run their own workplaces.';
      if (target.fs.workers >= 52) return 'Their workers are too content to walk out (support ' + Math.round(target.fs.workers) + ').';
      n.gold -= 60; n.auth -= 20; n.cd['strike_' + target.id] = G.tick + 3 * 360;
      target.strike = 5; target.stab -= 6; ID.Politics.boostOpp(G, target, 10, 0.25); ID.addOpBoth(G, n.id, target.id, -30);
      const won = target.fs.workers < 32;
      if (won) { target.stab -= 10; target.sm.capital -= 10; n.cnt.strikesWon = (n.cnt.strikesWon || 0) + 1; n.fervor = Math.min(100, n.fervor + 10); }
      ID.news(G, 'General strike in ' + target.name + ', called from ' + n.name + (won ? ': the country stops.' : ': it holds for a week.'), 'rev', target.id, n.id);
      ID.logGrief(target, G.tick, 'A general strike called from abroad paralysed industry.');
      if (target.id === G.player) ID.Events.queue(G, target, 'foreign_strike', { from: n.id });
      return '';
    }
    return 'Unknown operation.';
  };
  D.stopOp = function (G, n, idx) { n.ops.splice(idx, 1); };
  D.opsMonth = function (G, n) {
    if (!n.ops.length) return;
    const I = ID.ideo(n);
    for (let k = n.ops.length - 1; k >= 0; k--) {
      const o = n.ops[k], t = G.nations[o.target];
      if (!t || !t.alive || (n.gold <= 0 && n.debt > 0)) { n.ops.splice(k, 1); continue; }
      if (o.type !== 'fund') continue;
      const sec = ID.LAWS.security.opts[t.laws.security], press = ID.LAWS.press.opts[t.laws.press];
      const mult = (0.6 + I.dip.export) * (I.flags.permRev ? 2 : 1) * (1 + press.infl) * (1 - sec.repress * 0.35) * (t.id === G.player ? ID.DIFFICULTY[G.difficulty].subvert : 1);
      const mine = []; for (let p = 1; p < G.provinces.length; p++) if (G.provinces[p].owner === t.id) mine.push(G.provinces[p]);
      const sizeK = clamp(mine.length / 8, 0.25, 1);
      for (let c = 0; c < 3 && mine.length; c++) {
        const Pr = G.rng.pick(mine);
        if (Pr.opp !== n.ideo && (Pr.oppStr < 30 || G.rng.chance(0.25))) { Pr.opp = n.ideo; Pr.sponsor = n.id; Pr.oppStr = Math.max(Pr.oppStr * 0.6, 8); }
        if (Pr.opp === n.ideo) { Pr.oppStr = clamp(Pr.oppStr + 3.2 * mult * sizeK, 0, 100); Pr.sponsor = n.id; ID.fx(G, 'subvert', Pr.center, { col: I.color }); }
      }
      if (G.rng.chance(0.03 + sec.detect * 0.07)) {
        ID.addOpBoth(G, n.id, t.id, -18);
        if (t.id === G.player) { ID.news(G, 'Your police trace foreign money in the opposition to ' + n.name + '.', 'bad', t.id, n.id); t.a.knownOps = t.a.knownOps || {}; t.a.knownOps[n.id] = G.tick; }
        else if (n.id === G.player) ID.news(G, t.name + ' has uncovered your network. Relations suffer.', 'bad', n.id, t.id);
      }
    }
  };

  D.onNuke = function (G, A, hit, tile) {
    A.threat += 50; G.world.tension = Math.min(100, G.world.tension + 25);
    for (const o of G.nations) if (o && o.alive && o !== A) ID.addOp(G, o.id, A.id, ID.ideo(o).elections ? -50 : -35);
    A.sm.intelligentsia -= 14; A.sm.clergy -= 12; A.sm.workers -= 6;
    if (ID.ideo(A).elections) A.mandate = Math.max(0, A.mandate - 15);
    const names = Object.keys(hit).map((k) => G.nations[+k].name).join(', ');
    ID.news(G, 'ATOMIC STRIKE: ' + A.name + ' destroys a region of ' + (names || 'empty land') + '.', 'bad', A.id);
    ID.chron(G, 'nuke', A.name + ' uses an atomic weapon against ' + (names || 'no one') + '.', A.id);
    ID.headline(G, { kicker: 'A new kind of war', title: 'Atomic strike', sub: A.name + ' has destroyed a region of ' + (names || 'empty land') + ' with a single weapon.', a: A.id, tone: 'bad' });
    for (const k in hit) { G.nations[+k].a.nukedBy = A.id; G.nations[+k].a.nukedAt = G.tick; }
  };

  /* ---------------------------------------------------------------- monthly world diplomacy */
  D.month = function (G) {
    const ns = ID.alive(G);
    for (const a of ns) for (const b of ns) {
      if (a === b) continue;
      const d = G.dip[ID.dkey(a.id, b.id)];
      if (d && d.war) continue;
      let base = ID.ideoAffinity(a.ideo, b.ideo) + (ID.sameBloc(G, a.id, b.id) ? 38 : 0) + (d && d.trade ? 9 : 0) + (d && d.nap ? 6 : 0) - b.threat * (ID.borders(G, a.id, b.id) ? 0.55 : 0.3);
      if (a.claims.length && ID.borders(G, a.id, b.id)) base -= 8;
      const cur = G.rel[a.id * MAXN + b.id];
      G.rel[a.id * MAXN + b.id] = cur + (clamp(base, -100, 100) - cur) * 0.03;
    }
    // capitulation of the nearly-destroyed
    for (const n of ns) {
      if (!n.alive || !n.nwars) continue;
      const wt = n.a.warTiles || n.startTiles;
      if (n.tiles < wt * 0.15 && !ID.ideo(n).flags.noDecap) {
        let best = null, bt = -1;
        for (const e of D.enemies(G, n)) { const w = D.warOf(G, n.id, e.id); const t = w.a === e.id ? w.ta : w.tb; if (t > bt) { bt = t; best = e; } }
        if (best && bt > 0) D.capitulate(G, n, best);
      }
    }
    G.world.tension = Math.max(0, G.world.tension - 0.6);
    for (const n of ns) { const sh = n.tiles / Math.max(1, G.landCount); if (sh > 0.18) n.threat = Math.max(n.threat, (sh - 0.18) * 250); }
    // the great war
    let warPow = 0, tot = 0;
    for (const n of ns) { const p = D.power(n); tot += p; if (n.nwars) warPow += p; }
    const share = warPow / Math.max(1, tot);
    if ((!G.world.greatWar || (G.world.greatWar === 2 && G.tick - G.world.greatWarEnd > 3600)) && share > 0.6 && ns.filter((n) => n.nwars).length >= 6) {
      G.world.greatWar = 1; ID.news(G, 'THE GREAT WAR: most of the world’s power is now under arms.', 'war'); ID.headline(G, { kicker: 'The world at war', title: 'The Great War', sub: 'Most of the world’s power is now under arms.', tone: 'war' }); ID.chron(G, 'world', 'A Great War engulfs the world.'); ID.sfx(G, 'war');
    } else if (G.world.greatWar === 1 && share < 0.25) {
      G.world.greatWar = 2; G.world.greatWarEnd = G.tick;
      ID.news(G, 'The Great War is over. Exhausted peoples ask what it was for.', 'rev'); ID.headline(G, { kicker: 'Armistice', title: 'The guns fall silent', sub: 'Exhausted peoples ask what it was for. A revolutionary wave is rising.', tone: 'rev' }); ID.chron(G, 'world', 'The Great War ends. A revolutionary wave follows.');
      for (const n of ns) { if (n.we > 25) { ID.addMod(n, 'opp', 0.8, 30, 'Post-war ferment'); } }
    }
  };
})();
