/* IRON DIALECTIC — internal politics: factions, legitimacy, stability, provinces, drift,
   strikes, coups, uprisings, civil wars, elections, ideology change. Runs monthly. No DOM. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const clamp = ID.clamp, MAXN = ID.MAXN, B = ID.B;
  const P = (ID.Politics = {});
  const F = ID.FACTION_IDS;
  const ELECTORAL = { liberal: 1, socdem: 1, demsoc: 1, marketsoc: 1, conmon: 1, natpop: 1, agrarian: 1, minarchy: 1 };
  const c100 = (v) => clamp(v, 0, 100);

  P.initNation = function (G, n) {
    P.power(G, n); n.a.unrest = n.a.unrest || 8;
    for (const f of F) n.rep[f] = n.fs[f];
    P.legitimacy(G, n); n.legit = n.legitRaw;
    ID.Combat.refresh(G, n);
    if (!n.a.gdpHist) n.a.gdpHist = [];
  };

  /* ---------------------------------------------------------------- factions */
  P.power = function (G, n) {
    const I = ID.ideo(n);
    const s = n.ind / (n.ind + n.agr + 1) || 0.4;
    const model = I.econ.model;
    const raw = {
      workers: 6 + 34 * s,
      peasants: 6 + 46 * (1 - s),
      capital: 5 + 16 * s + Math.min(8, n.tradeInc * 0.12),
      military: 5 + 110 * (n.troops / Math.max(1, n.pop)) + (n.nwars ? 5 : 0) + n.prestige * 0.06,
      clergy: 3 + n.tradition * 0.14,
      intelligentsia: 3 + 3.2 * Math.pow(n.nb[B.CITY], 0.6) + (n.tech.ind + n.tech.mil + n.tech.agr) * 0.6,
      bureaucracy: 5 + n.tiles / 900 + (model === 'plan' || model === 'cyber' ? 8 : model === 'pact' ? 4 : 2) + n.bureau * 0.08,
    };
    let tot = 0;
    for (const f of F) { raw[f] *= I.fpow[f] != null ? I.fpow[f] : 1; raw[f] *= 1 + ID.mod(n, 'pow_' + f); tot += raw[f]; }
    for (const f of F) n.fp[f] = (raw[f] / tot) * 100;
  };

  /* Demands: returns {faction: [[label, value], ...]}. Used by the sim and shown in the UI. */
  P.demands = function (G, n) {
    const I = ID.ideo(n), model = I.econ.model, b = n.budget, d = {};
    const priv = model === 'market' || model === 'mixed' || model === 'pact' || model === 'trade';
    d.workers = [['Living standards (' + Math.round(n.ls) + ')', (n.ls - 50) * 0.5]];
    if (n.depression) d.workers.push(['Unemployment', -12]);
    if (n.we > 5) d.workers.push(['War weariness', -n.we * 0.18]);
    if (model === 'pact') d.workers.push(['Share under the pact (' + Math.round(n.pact) + '%)', (n.pact - 50) * 0.6]);
    if (model === 'council') d.workers.push(['Self-management', 8]);
    d.peasants = [['Living standards (' + Math.round(n.ls) + ')', (n.ls - 50) * 0.3]];
    if (n.famine) d.peasants.push(['Famine', -18]); else if (n.foodBal > 1.1) d.peasants.push(['Full granaries', 3]);
    if (model === 'manor') d.peasants.push(['Rent on the harvest (' + Math.round(n.rent) + '%)', (24 - n.rent) * 0.9]);
    if (n.mob > 0.08) d.peasants.push(['Sons under arms (' + Math.round(n.mob * 100) + '%)', -(n.mob - 0.08) * 150]);
    if ((model === 'plan' || model === 'cyber') && b.welfare < 0.12) d.peasants.push(['Requisitions', -8]);
    d.capital = [];
    if (priv) { d.capital.push(['Tax rate (' + Math.round(n.tax) + '%)', (24 - n.tax) * 0.8]); d.capital.push(['Business confidence (' + Math.round(n.conf) + ')', (n.conf - 50) * 0.25]); }
    d.capital.push(['Stability (' + Math.round(n.stab) + ')', (n.stab - 50) * 0.2]);
    if (model === 'pact') d.capital.push(['Share under the pact', (50 - n.pact) * 0.6]);
    if (n.cnt.nationalized) d.capital.push(['Nationalisations', -8 * n.cnt.nationalized]);
    d.military = [['Arms budget (' + Math.round(b.arms * 100) + '%)', clamp((b.arms - 0.14) * 90, -14, 14)], ['Glory (' + Math.round(n.glory) + ')', (n.glory - 35) * 0.2]];
    if (n.we > 5) d.military.push(['War weariness', -n.we * 0.1]);
    d.clergy = [['Tradition (' + Math.round(n.tradition) + ')', (n.tradition - 40) * 0.15]];
    d.intelligentsia = [['Science budget (' + Math.round(b.science * 100) + '%)', clamp((b.science - 0.08) * 80, -8, 14)]];
    if (n.emergency) d.intelligentsia.push(['Emergency rule', -12]);
    d.bureaucracy = [['Security budget (' + Math.round(b.security * 100) + '%)', clamp((b.security - 0.06) * 60, -5, 10)], ['Stability', (n.stab - 50) * 0.15]];
    if (model === 'plan' || model === 'cyber') d.bureaucracy.push(['A planned economy to run', 6]);
    if (n.corr > 20) d.bureaucracy.push(['Tolerated corruption', n.corr * 0.08]);
    // laws
    for (const c of ID.LAW_CATS) {
      const o = ID.LAWS[c].opts[n.laws[c]]; if (!o.sup) continue;
      for (const f in o.sup) {
        let v = o.sup[f];
        if (c === 'land' && n.laws.land === 'collective' && f === 'peasants' && n.ideo === 'mao') v = -4;
        if (c === 'land' && n.laws.land === 'commune' && f === 'peasants' && I.family !== 'anarchist' && n.ideo !== 'agrarian' && n.ideo !== 'mao' && n.ideo !== 'council') v = -6;
        d[f].push([ID.LAWS[c].name + ': ' + o.name, v]);
      }
    }
    const r = ID.RECRUIT[n.laws.recruit];
    for (const f in r.sup) d[f].push([r.name, r.sup[f]]);
    if (n.trans > 0) for (const f of F) d[f].push(['Regime in transition', -6]);
    for (const f of F) if (Math.abs(n.sm[f]) >= 1) d[f].push(['Recent events', n.sm[f]]);
    return d;
  };

  P.support = function (G, n) {
    const I = ID.ideo(n), d = P.demands(G, n);
    const diff = n.ai ? 3 : ID.DIFFICULTY[G.difficulty].sup;
    const press = ID.LAWS.press.opts[n.laws.press];
    const fear = n.laws.security === 'terror' ? 10 : 0;
    n.a.dem = d;
    for (const f of F) {
      let t = 50 + (I.fbase[f] || 0) + diff;
      for (const x of d[f]) t += x[1];
      t = 50 + 46 * Math.tanh((t - 50) / 46);
      n.a['tgt_' + f] = t;
      n.fs[f] += (t - n.fs[f]) * 0.09;
      n.sm[f] *= 0.94;
      n.rep[f] = c100(n.fs[f] + press.bias * (n.fs[f] < 60 ? 1 : 0.3) + fear * (n.fs[f] < 50 ? 1 : 0) + (press.noise ? G.rng.range(-press.noise, press.noise) : 0));
    }
  };

  /* ---------------------------------------------------------------- legitimacy & stability */
  P.legitimacy = function (G, n) {
    const I = ID.ideo(n), s = n.src;
    const press = ID.LAWS.press.opts[n.laws.press];
    const h = n.a.gdpHist || []; const g0 = h.length ? h[0] : n.gdp; const growth = ((n.gdp - g0) / Math.max(1, g0)) * 100;
    s.mandate = c100(n.mandate);
    s.fervor = c100(n.fervor - n.bureau * 0.25);
    s.tradition = c100(n.tradition);
    s.prosperity = c100(n.ls + 2.5 * (n.ls - n.lsPrev));
    s.victory = c100(n.glory);
    s.discipline = c100(n.discipline * 0.5 + n.fs.bureaucracy * 0.5);
    s.particip = c100(n.particip);
    s.divine = c100(n.fs.clergy * 0.72 + (n.laws.religion === 'statechurch' ? 14 : n.laws.religion === 'tolerance' ? 2 : -12));
    s.order = c100(100 - (n.a.unrest || 0) * 2.3 - (n.strike > 0 ? 12 : 0));
    s.competence = c100(62 + growth * 2.5 - 22 * n.crises * (I.flags.crisisDouble ? 2 : 1));
    s.charisma = c100(n.charisma + (press.charisma || 0));
    let L = 0; for (const k in I.legit) L += I.legit[k] * s[k];
    L += ID.mod(n, 'legit') - (n.trans > 0 ? 8 : 0);
    n.legitRaw = c100(L);
  };

  P.stability = function (G, n) {
    const I = ID.ideo(n); let ws = 0;
    for (const f of F) ws += (n.fp[f] / 100) * n.fs[f];
    n.a.ws = ws;
    const sec = ID.LAWS.security.opts[n.laws.security];
    let t = 0.42 * n.legit + 0.42 * ws + 6 - (n.a.unrest || 0) * 0.22 - n.we * 0.18 - sec.unrest * 0.5 - (n.trans > 0 ? 10 : 0) + ID.mod(n, 'stab');
    if (I.flags.compromise) t += n.fs.workers >= 45 && n.fs.capital >= 45 ? 8 : (n.fs.workers < 30 || n.fs.capital < 30 ? -6 : 0);
    if (n.famine) t -= 6;
    t = clamp(t, I.flags.stabFloor || 0, 100);
    n.a.stabTgt = t;
    n.stab = clamp(n.stab + (t - n.stab) * 0.1, I.flags.stabFloor || 0, 100);
  };

  /* ---------------------------------------------------------------- votes */
  const WAR_AFF = { workers: -10, peasants: -12, capital: -6, military: 18, clergy: 0, intelligentsia: -8, bureaucracy: 0 };
  /* kind: 'war' {target, cb} | 'law' {cat,opt} | 'decision' {aff}. Returns {yes, pass, rows}. */
  P.vote = function (G, n, kind, ctx) {
    const I = ID.ideo(n); let all = 0; const aff = {};
    for (const f of F) aff[f] = 0;
    if (kind === 'war') {
      const t = G.nations[ctx.target];
      for (const f of F) aff[f] = WAR_AFF[f];
      const op = ID.op(G, n.id, t.id);
      if (op <= -50) all += 12; else if (op > 0) all -= 12;
      if (t.threat > 30) all += 10;
      if (ctx.cb) all += 12;
      if (I.family === ID.ideo(t).family && !ID.areRivals(n.ideo, t.ideo)) all -= 15;
      all -= n.we * 0.3;
      for (const o of G.nations) if (o && o.alive && o.id !== n.id && ID.sameBloc(G, n.id, o.id) && ID.atWar(G, o.id, t.id)) { all += 18; break; }
      if (ctx.cb === 'holy') aff.clergy += 20;
      if (ctx.cb === 'liberate') { aff.workers += 14; aff.intelligentsia += 6; }
    } else if (kind === 'law') {
      const o = ctx.cat === 'recruit' ? ID.RECRUIT[ctx.opt] : ID.LAWS[ctx.cat].opts[ctx.opt];
      const cur = ctx.cat === 'recruit' ? ID.RECRUIT[n.laws.recruit] : ID.LAWS[ctx.cat].opts[n.laws[ctx.cat]];
      for (const f of F) aff[f] = (((o.sup && o.sup[f]) || 0) - ((cur.sup && cur.sup[f]) || 0)) * 1.6;
      all += 6;
    } else if (ctx && ctx.aff) { for (const f in ctx.aff) { if (f === 'all') all += ctx.aff[f]; else aff[f] = ctx.aff[f]; } }
    let yes = 0, tot = 0; const rows = [];
    for (const f of F) {
      let w = n.fp[f]; if (I.control.oligarchy) w *= f === 'capital' ? 2.5 : 0.6;
      const lean = n.fs[f] + aff[f] + all; const y = clamp((lean - 25) / 50, 0, 1);
      yes += w * y; tot += w; rows.push([f, w, y]);
    }
    yes = (yes / tot) * 100;
    for (const r of rows) r[1] = (r[1] / tot) * 100;
    return { yes, pass: yes >= 50, rows };
  };

  /* ---------------------------------------------------------------- laws */
  P.lawAllowed = function (G, n, cat, opt) {
    const I = ID.ideo(n);
    const list = cat === 'recruit' ? I.recruit.allowed : cat === 'mobil' ? ['peace', 'partial', 'total'] : I.laws[cat];
    if (list.indexOf(opt) < 0) return 'Not compatible with ' + I.name + '.';
    const o = cat === 'recruit' ? ID.RECRUIT[opt] : ID.LAWS[cat].opts[opt];
    if (o.needs === 'era1' && ID.eraOf(G.tick) < 1) return 'Needs the Age of Masses (1925).';
    if (o.needs === 'era2' && ID.eraOf(G.tick) < 2) return 'Needs the Age of Total War (1940).';
    if (cat === 'mobil' && opt === 'total' && !n.nwars) return 'Only in wartime.';
    return '';
  };
  P.lawCost = (n, cat) => (cat === 'mobil' ? 4 : ID.ideo(n).control.lawCost);
  P.applyLaw = function (G, n, cat, opt) {
    const old = n.laws[cat]; n.laws[cat] = opt;
    const I = ID.ideo(n);
    if (cat === 'land' || cat === 'religion') n.tradition = Math.max(0, n.tradition - 4);
    if (I.control.griev) n.grievance = Math.min(100, n.grievance + I.control.griev * 3);
    if (cat === 'recruit' || cat === 'mobil') n.mob = Math.min(n.mob, ID.maxMob(n));
    if (cat === 'security' && (old === 'secret' || old === 'terror') && (opt === 'police' || opt === 'liberties') && n.grievance > 30) P.burst(G, n, 'the political police were stood down');
    ID.Combat.refresh(G, n);
    if (n.id === G.player) { ID.news(G, 'New law: ' + (cat === 'recruit' ? ID.RECRUIT[opt].name : ID.LAWS[cat].opts[opt].name) + '.', 'pol', n.id); ID.sfx(G, 'stamp'); }
  };
  /* Returns '' on success (or queued), else reason. */
  P.setLaw = function (G, n, cat, opt) {
    if (n.laws[cat] === opt) return '';
    const why = P.lawAllowed(G, n, cat, opt); if (why) return why;
    const I = ID.ideo(n), cost = P.lawCost(n, cat);
    if ((n.cd['law_' + cat] || 0) > G.tick) return 'This area of law was changed recently. Wait until ' + ID.dateOf(n.cd['law_' + cat]).short + '.';
    if (n.auth < cost) return 'Not enough authority (' + cost + ' needed).';
    const ctype = I.control.type;
    if ((ctype === 'parliament' || ctype === 'assembly') && !n.emergency) {
      const v = P.vote(G, n, 'law', { cat, opt });
      if (!v.pass) { n.auth -= Math.ceil(cost / 2); return 'The ' + I.control.body + ' rejects the bill (' + Math.round(v.yes) + '% in favour).'; }
      if (ctype === 'assembly') {
        n.auth -= cost; n.cd['law_' + cat] = G.tick + 360;
        G.votes.push({ n: n.id, kind: 'law', cat, opt, at: G.tick + (I.control.delay || 30) });
        return '';
      }
    }
    n.auth -= cost; n.cd['law_' + cat] = G.tick + 360;
    P.applyLaw(G, n, cat, opt);
    return '';
  };

  /* Hidden grievance bursts into the open. */
  P.burst = function (G, n, why) {
    const g = n.grievance; if (g < 20) return;
    for (let p = 1; p < G.provinces.length; p++) { const Pr = G.provinces[p]; if (Pr.owner === n.id) { Pr.unrest = c100(Pr.unrest + g * 0.4); Pr.oppStr = c100(Pr.oppStr + g * 0.3); } }
    n.grievance = g * 0.3; n.stab -= g * 0.12;
    ID.news(G, 'The lid comes off in ' + n.name + ': years of buried grievance surface after ' + why + '.', 'bad', n.id);
    ID.logGrief(n, G.tick, 'Suppressed grievance (' + Math.round(g) + ') burst into open unrest when ' + why + '.');
    if (n.id === G.player) ID.sfx(G, 'bad');
  };

  /* ---------------------------------------------------------------- ideology change */
  const TRANS = { election: [6, 3], reform: [18, 12], drift: [12, 8], coup: [18, 15], revolution: [24, 10], imposed: [24, 18], succession: [12, 10] };
  P.changeIdeology = function (G, n, to, mode, sponsor) {
    const old = n.ideo; if (old === to) return;
    const Iold = ID.IDEOLOGIES[old], I = ID.IDEOLOGIES[to];
    const keepLeader = mode === 'election' ? false : mode === 'drift' || mode === 'reform';
    const leader = n.leader;
    const oldName = n.name;
    ID.applyIdeology(G, n, to, false);
    if (keepLeader) { n.leader = leader; n.leader.title = ID.leaderTitle(to); }
    for (const f of F) {
      n.fs[f] = 0.5 * n.fs[f] + 0.5 * clamp(52 + (I.fbase[f] || 0) * 0.8, 5, 95);
      if (Iold.ruling.indexOf(f) >= 0 && I.ruling.indexOf(f) < 0 && mode !== 'election') n.sm[f] -= 14;
    }
    const tr = TRANS[mode] || TRANS.drift;
    n.trans = tr[0]; n.stab = Math.max(I.flags.stabFloor || 5, n.stab - tr[1]); n.age = 0;
    if (mode === 'revolution') { n.fervor = 90; n.mandate = 50; n.tradition *= 0.3; n.particip = Math.max(n.particip, 65); n.glory = Math.max(n.glory, 45); n.grievance *= 0.2; n.bureau *= 0.4; n.discipline = 75; }
    else if (mode === 'coup') { n.mandate = 20; n.tradition *= 0.8; n.fervor = Math.min(n.fervor, 30); n.particip = Math.min(n.particip, 25); n.discipline = 70; }
    else if (mode === 'election') { n.mandate = 66; }
    else if (mode === 'reform') { n.tradition = Math.max(0, n.tradition - 15); n.mandate = 50; n.fervor = Math.max(n.fervor, I.legit.fervor ? 55 : 15); }
    else if (mode === 'imposed') { n.fervor = 35; n.mandate = 25; n.tradition *= 0.5; n.glory = 10; }
    if (I.control.type === 'assembly') n.particip = Math.max(n.particip, 70);
    if (I.legit.charisma) n.charisma = Math.max(n.charisma, mode === 'coup' || mode === 'revolution' ? 65 : 50);
    for (const o of G.nations) {
      if (!o || !o.alive || o === n) continue;
      const dv = (ID.ideoAffinity(to, o.ideo) - ID.ideoAffinity(old, o.ideo)) * 0.8;
      ID.addOpBoth(G, n.id, o.id, dv);
    }
    if (n.bloc && mode !== 'imposed') { const bl = G.blocs[n.bloc]; if (bl && bl.leader !== n.id && ID.ideoAffinity(to, G.nations[bl.leader].ideo) < 5) ID.Diplomacy.leaveBloc(G, n, true); }
    const verb = { election: 'votes in', reform: 'reforms itself into', drift: 'slides into', coup: 'falls to a coup: now', revolution: 'is overturned by revolution: now', imposed: 'has a new regime imposed:', succession: 'changes hands:' }[mode];
    ID.news(G, oldName + ' ' + verb + ' ' + I.name + '.', 'rev', n.id);
    ID.chron(G, 'ideology', oldName + ' ' + verb + ' ' + I.name + ' (' + n.name + ').', n.id);
    const HK = { revolution: 'Revolution', coup: 'Coup d’état', election: 'Election', reform: 'Reform', drift: 'A new order', imposed: 'Occupation', succession: 'Succession' };
    if (n.id === G.player) ID.headline(G, { kicker: HK[mode] || 'A new order', title: I.name, sub: oldName + ' is now ' + n.name + '. The rules have changed.', a: n.id, tone: mode === 'election' || mode === 'reform' ? 'pol' : 'rev' });
    else if ((mode === 'revolution' || mode === 'coup') && ID.isMajor(G, n)) ID.headline(G, { kicker: HK[mode], title: n.base + ' falls', sub: oldName + ' is overthrown. ' + n.name + ' is proclaimed under ' + I.name + '.', a: n.id, tone: 'rev' });
    ID.fx(G, 'ideology', n.capital, { col: I.color });
    if (!G.headless) { G.dirtyAll = true; if (mode === 'revolution' || mode === 'coup') ID.sfx(G, 'revolt'); }
    if (mode === 'revolution' || mode === 'coup' || mode === 'election') {
      const W = G.W; G.world.waves.push({ fam: I.family, ideo: to, str: mode === 'revolution' ? 1 : 0.5, m: 0, x: n.capital % W, y: (n.capital / W) | 0, src: n.id });
    }
    if (sponsor && G.nations[sponsor] && G.nations[sponsor].alive && mode !== 'election') {
      const s = G.nations[sponsor]; s.cnt.exported = (s.cnt.exported || 0) + 1; s.fervor = Math.min(100, s.fervor + 18); s.a.spreadAt = G.tick; s.glory = Math.min(100, s.glory + 6);
      ID.addOpBoth(G, n.id, s.id, 35);
      if (s.id === G.player) { ID.news(G, 'Your work abroad bears fruit: ' + n.name + ' joins the cause.', 'good', s.id); ID.sfx(G, 'good'); }
    }
    for (let p = 1; p < G.provinces.length; p++) { const Pr = G.provinces[p]; if (Pr.owner === n.id) { if (Pr.opp === to) { Pr.opp = null; Pr.oppStr *= 0.2; } else Pr.oppStr *= 0.7; Pr.sponsor = 0; } }
    P.power(G, n); ID.Combat.refresh(G, n);
  };

  /* ---------------------------------------------------------------- coups */
  P.coupOdds = function (G, n, backed) {
    const sec = ID.LAWS.security.opts[n.laws.security];
    return clamp(0.35 + (50 - n.fs.military) / 100 + (50 - n.stab) / 150 + (50 - n.legit) / 150 - sec.detect * 0.2 + (backed ? 0.1 : 0), 0.08, 0.92);
  };
  P.coupIdeo = function (G, n, backer) {
    if (backer && G.nations[backer]) { const bi = G.nations[backer].ideo; if (ID.IDEOLOGIES[bi].control.type !== 'assembly') return bi; }
    if (n.ideo === 'junta') return G.rng.chance(0.5) ? 'personalist' : 'liberal';
    if (n.ideo === 'personalist') return 'junta';
    if (ID.ideo(n).family === 'socialist' && n.fs.bureaucracy < 40 && G.rng.chance(0.3)) return 'personalist';
    return G.rng.chance(0.75) ? 'junta' : G.rng.pick(['personalist', 'corporatist', 'natpop']);
  };
  P.coup = function (G, n, backer) {
    n.a.coupAt = G.tick;
    if (n.id === G.player) { ID.Events.queue(G, n, 'coup', { backer: backer || 0 }); return; }
    if (G.rng.chance(P.coupOdds(G, n, backer))) P.changeIdeology(G, n, P.coupIdeo(G, n, backer), 'coup', backer);
    else { n.stab -= 8; n.sm.military += 12; n.flags.coupSurvived = 1; ID.news(G, 'A coup attempt in ' + n.name + ' fails.', 'pol', n.id); }
  };

  /* ---------------------------------------------------------------- uprisings and civil war */
  P.movement = function (G, n) {
    const share = {}; let best = null, bs = 0;
    for (let p = 1; p < G.provinces.length; p++) {
      const Pr = G.provinces[p]; if (Pr.owner !== n.id || !Pr.opp || Pr.oppStr < 60) continue;
      share[Pr.opp] = (share[Pr.opp] || 0) + (Pr.cnt[n.id] || 0);
    }
    for (const k in share) { const s = share[k] / Math.max(1, n.tiles); if (s > bs) { bs = s; best = k; } }
    return { ideo: best, share: bs };
  };

  P.uprising = function (G, n, ideo) {
    const provs = []; let tiles = 0, sponsor = 0;
    for (let p = 1; p < G.provinces.length; p++) {
      const Pr = G.provinces[p];
      if (Pr.owner === n.id && Pr.opp === ideo && Pr.oppStr >= 45) { provs.push(p); tiles += Pr.cnt[n.id] || 0; if (Pr.sponsor) sponsor = Pr.sponsor; }
    }
    const share = tiles / Math.max(1, n.tiles);
    const I = ID.IDEOLOGIES[ideo];
    ID.logGrief(n, G.tick, 'An uprising for ' + I.name + ' broke out across ' + Math.round(share * 100) + '% of the country.');
    if (share > 0.8 || (n.fs.military < 25 && share > 0.5 && !ID.ideo(n).flags.noCoup)) {
      if (n.id === G.player) { ID.Game.defeat(G, 'revolution', { ideo, share }); return; }
      P.changeIdeology(G, n, ideo, 'revolution', sponsor); return;
    }
    if (share < 0.1 || G.nations.length >= MAXN - 2) { // too weak: crushed
      for (const p of provs) { G.provinces[p].oppStr *= 0.4; G.provinces[p].unrest = c100(G.provinces[p].unrest + 15); }
      n.stab -= 4; ID.news(G, 'A rising for ' + I.name + ' in ' + n.name + ' is put down.', 'pol', n.id); return;
    }
    P.civilWar(G, n, ideo, provs, sponsor);
  };

  P.civilWar = function (G, n, ideo, provs, sponsor) {
    const set = new Set(provs); const I = ID.IDEOLOGIES[ideo];
    const col = I.color.map((c, k) => clamp(Math.round(c * 0.75 + n.color[k] * 0.25 + 18), 0, 255));
    const R = ID.makeNation(G, { base: n.base, adj: n.adj, color: col, sit: 'revolution' });
    if (!R) return;
    R.civilOf = n.id; n.civil = R.id; R.tree = n.tree || null;
    const before = n.tiles;
    const popBefore = n.pop, landBefore = Math.max(1, n.popLand);
    for (let i = 0; i < G.N; i++) if (G.owner[i] === n.id && set.has(G.prov[i])) ID.setOwner(G, i, R.id, true);
    let big = null;
    for (const p of provs) { const Pr = G.provinces[p]; Pr.core = R.id; Pr.owner = R.id; Pr.integ = 100; Pr.unrest = 10; Pr.oppStr = 0; Pr.opp = null; if (!big || Pr.tiles > big.tiles) big = Pr; }
    R.capital = G.owner[big.center] === R.id ? big.center : -1;
    if (R.capital < 0) for (let i = 0; i < G.N; i++) if (G.owner[i] === R.id) { R.capital = i; break; }
    const share = R.tiles / Math.max(1, before);
    const pshare = clamp(R.popLand / landBefore, 0.05, 0.9);
    R.pop = popBefore * pshare; n.pop = popBefore - R.pop;
    const defect = clamp(share * (1.25 - n.fs.military / 100), 0.12, 0.75);
    R.troops = n.troops * defect; n.troops -= R.troops;
    R.gold = n.gold * share * 0.6; n.gold -= R.gold;
    R.tech = Object.assign({}, n.tech); R.equip = n.equip * 0.9; R.sciTotal = n.sciTotal;
    R.laws = {}; R.mob = 0.1;
    ID.applyIdeology(G, R, ideo, true);
    R.mob = Math.min(ID.maxMob(R), 0.12); R.fervor = 88; R.stab = 58; R.legit = 58; R.mandate = 55; R.particip = I.control.type === 'assembly' ? 80 : 50; R.tradition = I.family === 'conservative' ? 60 : 12; R.charisma = 62; R.glory = 45;
    R.startTiles = R.peakTiles = R.tiles;
    for (const o of G.nations) {
      if (!o || o === R) continue;
      G.rel[R.id * MAXN + o.id] = G.rel[o.id * MAXN + R.id] = clamp(ID.ideoAffinity(ideo, o.ideo) + G.rng.range(-5, 5), -100, 100);
    }
    if (sponsor && G.nations[sponsor]) { ID.addOpBoth(G, R.id, sponsor, 45); R.sponsor = sponsor; }
    ID.recalcBorders(G);
    P.initNation(G, R); R.a.unrest = 10;
    ID.Diplomacy.startWar(G, R, n, 'civil');
    n.stab = Math.max(10, n.stab - 6);
    for (let p = 1; p < G.provinces.length; p++) { const Pr = G.provinces[p]; if (Pr.owner === n.id) Pr.oppStr *= 0.5; }
    ID.news(G, 'CIVIL WAR in ' + n.name + ': ' + R.name + ' is proclaimed and holds ' + Math.round(share * 100) + '% of the country.', 'rev', n.id, R.id);
    ID.chron(G, 'civilwar', 'Civil war splits ' + n.name + '. The rebels proclaim ' + R.name + '.', n.id, R.id);
    if (n.id === G.player || ID.isMajor(G, n)) ID.headline(G, { kicker: 'Civil war', title: n.base + ' divided', sub: R.name + ' is proclaimed and holds ' + Math.round(share * 100) + '% of the country.', a: n.id, b: R.id, tone: 'rev' });
    for (const p of provs) ID.fx(G, 'revolt', G.provinces[p].center, { col: I.color });
    ID.sfx(G, 'revolt');
    if (!G.headless) G.dirtyAll = true;
    if (n.id === G.player) ID.Events.queue(G, n, 'civil_war', { rebel: R.id });
    return R;
  };

  /* A non-core province breaks away. */
  P.secede = function (G, n, Pr) {
    if (G.nations.length >= MAXN - 2) return;
    let R = Pr.core ? G.nations[Pr.core] : null;
    if (R && R.id === n.id) return;
    const revive = R && !R.alive;
    if (R && R.alive && !ID.borders(G, R.id, n.id) && !ID.atWar(G, R.id, n.id)) R = null;
    let isNew = false;
    if (!R) {
      const used = new Set(G.nations.filter(Boolean).map((x) => x.base)); const nm = ID.genName(G.rng, used);
      R = ID.makeNation(G, { base: nm.base, adj: nm.adj, sit: 'small' }); if (!R) return; isNew = true;
    }
    if (revive || isNew) {
      R.alive = true; R.capital = Pr.center; R.nwars = 0; R.bloc = 0; R.ops = []; R.civil = 0; R.civilOf = 0;
      const ideo = Pr.opp || (revive ? R.ideo : G.rng.pick(['liberal', 'natpop', 'agrarian', 'junta', 'socdem']));
      R.laws = isNew ? {} : R.laws;
      ID.applyIdeology(G, R, ideo, true);
      R.stab = 55; R.legit = 60; R.fervor = 60; R.glory = 50; R.gold = 60; R.mob = Math.min(ID.maxMob(R), 0.09); R.tech = Object.assign({}, n.tech);
      for (const o of G.nations) if (o && o !== R) G.rel[R.id * MAXN + o.id] = G.rel[o.id * MAXN + R.id] = clamp(ID.ideoAffinity(R.ideo, o.ideo) + G.rng.range(-5, 5), -100, 100);
    }
    const before = n.tiles, landBefore = Math.max(1, n.popLand), popBefore = n.pop;
    let got = 0;
    for (let i = 0; i < G.N; i++) if (G.owner[i] === n.id && G.prov[i] === Pr.id) { ID.setOwner(G, i, R.id, true); got++; }
    if (!got) return;
    if (G.owner[R.capital] !== R.id) R.capital = G.owner[Pr.center] === R.id ? Pr.center : R.capital;
    const pshare = clamp(1 - n.popLand / landBefore, 0.01, 0.6);
    const moved = popBefore * pshare; n.pop -= moved; R.pop = (revive || isNew ? 0 : R.pop) + moved;
    if (revive || isNew) { R.troops = R.pop * R.mob; R.startTiles = R.peakTiles = R.tiles; ID.recalcBorders(G); P.initNation(G, R); }
    Pr.core = R.id; Pr.owner = R.id; Pr.integ = 100; Pr.unrest = 12; Pr.oppStr = 0;
    ID.addOpBoth(G, n.id, R.id, -30);
    n.stab -= 3; n.glory -= 4;
    ID.recalcBorders(G);
    if (revive || isNew) ID.Diplomacy.startWar(G, R, n, 'independence');
    ID.news(G, (revive ? R.name + ' rises again: ' : isNew ? 'Secession: ' + R.name + ' declares independence from ' : 'A border province defects from ') + (revive ? 'a province throws off ' + n.adj + ' rule.' : n.name + (isNew ? '.' : ' to ' + R.name + '.')), 'rev', n.id, R.id);
    ID.chron(G, 'secession', (revive ? R.name + ' is restored by revolt against ' : R.name + ' breaks away from ') + n.name + '.', R.id, n.id);
    ID.logGrief(n, G.tick, 'A province broke away (' + (before - n.tiles) + ' tiles lost to ' + R.name + ').');
    ID.fx(G, 'revolt', Pr.center, { col: R.color });
    if (!G.headless) G.dirtyAll = true;
    return R;
  };

  /* ---------------------------------------------------------------- provinces (all, monthly) */
  function classSupport(n, ideo, urban) {
    const I = ID.IDEOLOGIES[ideo], fs = n.fs;
    switch (I.family) {
      case 'socialist': case 'anarchist': return ideo === 'mao' || ideo === 'ancom' ? fs.peasants * 0.7 + fs.workers * 0.3 : urban * fs.workers + (1 - urban) * (fs.workers * 0.4 + fs.peasants * 0.6);
      case 'liberal': return fs.intelligentsia * 0.5 + fs.capital * 0.3 + fs.workers * 0.2;
      case 'conservative': return fs.clergy * 0.5 + fs.peasants * 0.5;
      case 'authoritarian': return fs.military * 0.6 + fs.bureaucracy * 0.4;
      default: return ideo === 'merchant' ? fs.capital : ideo === 'cybernetic' ? fs.intelligentsia : fs.peasants * 0.5 + fs.workers * 0.5;
    }
  }
  P.pickOpp = function (G, n, Pr) {
    const u = Pr.urban, fs = n.fs, era = ID.eraOf(G.tick);
    const present = G.stats.byIdeo || {};
    const cur = ID.ideo(n);
    return G.rng.weighted(ID.IDEO_LIST, (I) => {
      if (I.id === n.ideo) return 0;
      let w;
      switch (I.family) {
        case 'socialist': w = u * (58 - fs.workers) + (1 - u) * (50 - fs.peasants) * (I.id === 'mao' ? 1.2 : 0.4); if (I.id === 'mao') w *= Pr.rough > 0.4 ? 1.3 : 0.8; break;
        case 'anarchist': w = (u * (55 - fs.workers) + (1 - u) * (50 - fs.peasants) * (I.id === 'ancom' ? 0.9 : 0.3)) * 0.6; break;
        case 'liberal': w = (52 - fs.intelligentsia) * 0.5 * (u + 0.3) + (50 - fs.capital) * 0.4 * u + (cur.axes.auth > 0.5 ? 6 : 0); if (I.id === 'minarchy') w *= 0.3; break;
        case 'conservative': w = (1 - u) * ((52 - fs.clergy) * 0.6 + (50 - fs.peasants) * 0.4); if (I.id === 'absmon') w *= n.tradition > 30 ? 0.8 : 0.2; if (I.id === 'conmon') w *= 0.6; break;
        case 'authoritarian': w = (50 - fs.military) * 0.4 + (50 - n.stab) * 0.3; if (I.id === 'technocracy') w *= 0.3; break;
        default: w = I.id === 'natpop' ? (50 - n.stab) * 0.45 + (n.depression ? 14 : 0) + (n.lostWarAt != null && n.age - n.lostWarAt < 60 ? 10 : 0) : I.id === 'merchant' ? 0 : era >= 2 ? (52 - fs.intelligentsia) * 0.2 * u : 0;
      }
      if (w <= 0) return 0;
      const dist = ID.ideoDist(n.ideo, I.id);
      w *= clamp(dist / 1.2, 0.2, 1.3);
      if (ID.areRivals(n.ideo, I.id)) w *= 1.6;
      if (present[I.id]) w *= 1.4; else w *= 0.7;
      for (const k in G.border[n.id] || {}) if (G.nations[+k].alive && G.nations[+k].ideo === I.id) { w *= 1.7; break; }
      return w;
    });
  };

  P.provinces = function (G) {
    const diffP = ID.DIFFICULTY[G.difficulty];
    const waves = G.world.waves;
    // nation aggregates
    for (const n of G.nations) if (n && n.alive) { n.a.uSum = 0; n.a.uT = 0; n.a.oSum = 0; n.a.noncore = 0; }
    for (let p = 1; p < G.provinces.length; p++) {
      const Pr = G.provinces[p]; const n = G.nations[Pr.owner]; if (!n || !n.alive) continue;
      const I = ID.ideo(n); const sec = ID.LAWS.security.opts[n.laws.security], press = ID.LAWS.press.opts[n.laws.press];
      const tiles = Pr.cnt[n.id] || 0; if (!tiles) continue;
      const isCore = Pr.core === n.id;
      const secEff = clamp(n.budget.security / 0.08, 0.3, 1.3);
      if (!isCore) {
        let rate = 0.42 * (1 + I.axes.intl * 0.4) * (sec.repress > 0.6 ? 0.7 : 1) * (n.stab > 60 ? 1.2 : 1);
        const cn = Pr.core ? G.nations[Pr.core] : null;
        if (cn && cn.alive && ID.atWar(G, cn.id, n.id)) rate = 0;
        if (cn && !cn.alive) rate *= 1.3;
        if (Pr.wild && !Pr.core) rate *= 3;
        Pr.integ = Math.min(100, Pr.integ + rate);
        if (Pr.integ >= 100) { Pr.core = n.id; }
        n.a.noncore += tiles;
      }
      let u = 13 + (50 - n.ls) * 0.22 + Pr.urban * 6 + (isCore ? 0 : 34 - Pr.integ * 0.3) + (50 - n.stab) * 0.45 + (n.famine ? 15 : 0) + n.we * 0.18 + sec.unrest * secEff + (n.strike > 0 && Pr.urban > 0.3 ? 10 : 0) + ID.mod(n, 'unrest');
      if (I.flags.antiIndustry && n.nb[B.FACTORY] > n.tiles / 600) u += 6 + Pr.nFact * 4;
      if (I.flags.garrison) u -= Math.min(12, (n.troops / Math.max(1, n.tiles)) * 22);
      if (!isCore && Pr.core) {
        const cn = G.nations[Pr.core];
        if (cn && ID.ideo(cn).flags.partisans && (!cn.alive || ID.atWar(G, cn.id, n.id))) { u += 28; n.troops *= 0.9985; n.casM += n.troops * 0.0015; }
      }
      Pr.unrest += (c100(u) - Pr.unrest) * 0.15;
      // opposition movement
      if (!Pr.opp || Pr.oppStr < 6) { if ((p + G.tick / 30) % 4 < 1 || !Pr.opp) { Pr.opp = P.pickOpp(G, n, Pr); Pr.opp = Pr.opp ? Pr.opp.id : null; Pr.sponsor = 0; } }
      if (Pr.opp) {
        const cs = classSupport(n, Pr.opp, Pr.urban);
        let g = (Pr.unrest - 22) * 0.07 + (50 - cs) * 0.045 + press.spread * 1.2 - sec.repress * secEff * 1.6 + (n.trans > 0 ? 0.5 : 0) + ID.mod(n, 'opp');
        const fam = ID.IDEOLOGIES[Pr.opp].family;
        for (const w of waves) {
          if (w.fam !== fam || w.src === n.id) continue;
          const d = Math.hypot(Pr.cx - w.x, Pr.cy - w.y), rad = 50 + w.m * 9;
          if (d < rad) g += 1.6 * w.str * (1 - w.m / 24) * (press.infl > 0 ? 1 + press.infl : 1 + press.infl * 0.8);
        }
        if (g > 0 && !n.ai) g *= diffP.crisis;
        Pr.oppStr = c100(Pr.oppStr + g);
      }
      n.a.uSum += Pr.unrest * tiles; n.a.uT += tiles; n.a.oSum += Pr.oppStr * tiles;
      // secession of unintegrated land
      if (!isCore && Pr.unrest > 72 && Pr.integ < 55 && tiles > 20 && G.rng.chance(0.02 * (n.ai ? 1 : diffP.crisis)) && !(n.civil && G.nations[n.civil].alive) && !(n.civilOf && G.nations[n.civilOf] && G.nations[n.civilOf].alive)) P.secede(G, n, Pr);
    }
    for (const n of G.nations) if (n && n.alive) { n.a.unrest = n.a.uT ? n.a.uSum / n.a.uT : 0; n.a.opp = n.a.uT ? n.a.oSum / n.a.uT : 0; n.a.noncoreShare = n.a.uT ? n.a.noncore / n.a.uT : 0; }
    for (let k = waves.length - 1; k >= 0; k--) if (++waves[k].m > 24) waves.splice(k, 1);
  };

  /* ---------------------------------------------------------------- monthly per nation */
  P.month = function (G, n) {
    const I = ID.ideo(n), rng = G.rng, diffP = ID.DIFFICULTY[G.difficulty];
    const press = ID.LAWS.press.opts[n.laws.press], sec = ID.LAWS.security.opts[n.laws.security], rec = ID.RECRUIT[n.laws.recruit];
    n.age++; if (n.trans > 0) n.trans--;
    if (n.tiles > n.peakTiles) n.peakTiles = n.tiles;
    const h = n.a.gdpHist || (n.a.gdpHist = []); h.push(n.gdp); if (h.length > 12) h.shift();

    /* slow variables */
    let fd = 0.3; if (I.flags.permRev) fd = n.a.spreadAt != null && G.tick - n.a.spreadAt < 36 * 30 ? 0.15 : 0.6;
    n.fervor = c100(n.fervor - fd + (ID.LAWS.religion.opts[n.laws.religion].fervor || 0) + (n.nwars && n.a.defensive ? 0.25 : 0));
    let td = (n.stab > 50 ? 0.12 : -0.05) + (ID.LAWS.religion.opts[n.laws.religion].trad || 0);
    if (I.flags.modernDilemma) td -= Math.max(0, n.fp.workers + n.fp.intelligentsia - 25) * 0.012;
    if (I.family === 'socialist' || I.family === 'anarchist') td -= 0.1;
    n.tradition = c100(n.tradition + td);
    n.glory = c100(n.glory + (30 - n.glory) * 0.02);
    if (I.elections) n.mandate = c100(n.mandate - (n.emergency ? 1.5 : 0.4));
    else if (I.flags.plebiscite) n.mandate = c100(n.mandate - 0.5);
    if (I.control.type === 'assembly') n.particip = c100(n.particip + (n.emergency ? -2 : (76 - n.particip) * 0.04));
    else n.particip = c100(n.particip + ((n.laws.press === 'free' ? 46 : n.laws.press === 'regulated' ? 36 : 22) + (n.laws.labor === 'control' ? 22 : 0) - n.particip) * 0.03 - (n.emergency ? 1 : 0));
    n.discipline = c100(n.discipline + (50 - n.discipline) * 0.012 - (n.crises > 1 ? 0.3 : 0));
    n.prestige = Math.max(0, n.prestige - 0.3);
    n.threat = Math.max(0, n.threat * 0.992 - 0.05);
    if (I.legit.charisma || I.flags.succession) {
      if (G.tick % 360 < 30) n.leader.age++;
      if (I.legit.charisma) n.charisma = c100(n.charisma + (n.glory - 40) * 0.01 - (n.leader.age > 66 ? 0.12 : 0) - (n.crises > 1 ? 0.2 : 0) + (55 - n.charisma) * 0.01);
    } else if (G.tick % 360 < 30) n.leader.age++;
    // war exhaustion
    const wem = (rec.weMult || 1) * (ID.LAWS.mobil.opts[n.laws.mobil].we || 1) * (I.flags.partisans ? 0.7 : 1);
    n.we = c100(n.we + (n.casM / Math.max(1, n.pop)) * 900 * wem + (n.nwars ? 0.4 * wem : -1.2));
    n.casM = 0;
    // hidden grievance
    const secNeed = sec.repress > 0.5 ? 0.08 : 0;
    n.grievance = c100(n.grievance + (press.grievance || 0) + sec.grievance + (n.emergency ? 0.4 : 0) - (n.laws.security === 'liberties' && n.laws.press === 'free' ? 0.3 : 0));
    if (n.grievance > 50 && ((secNeed && n.budget.security < secNeed * 0.6) || n.stab < 30) && rng.chance(0.2)) P.burst(G, n, secNeed && n.budget.security < secNeed * 0.6 ? 'security funding was cut' : 'the regime showed weakness');

    P.power(G, n);
    P.support(G, n);
    P.legitimacy(G, n);
    n.legit += (n.legitRaw - n.legit) * 0.25;
    P.stability(G, n);
    n.auth = Math.min(I.control.type === 'assembly' ? 70 : 100, n.auth + I.control.auth * (0.55 + n.legit / 110) * (n.emergency ? 1.4 : 1));
    ID.Combat.refresh(G, n);

    // isolation (for permanent revolution)
    if (I.flags.permRev) { n.isolated = true; for (const o of G.nations) if (o && o.alive && o !== n && ID.ideo(o).family === I.family && ID.op(G, n.id, o.id) > -20) { n.isolated = false; break; } }

    /* drift */
    n.a.driftRate = {};
    for (const d of I.drift) {
      let p = d.pressure(n, G); if (p > 0 && !n.ai) p *= diffP.crisis; if (p > 0 && n.ai) p *= 0.75;
      p += ID.mod(n, 'drift_' + d.to);
      n.a.driftRate[d.to] = p;
      n.drift[d.to] = c100((n.drift[d.to] || 0) + p);
      if (n.drift[d.to] >= 100 && !n.trans) {
        if (n.id === G.player) { if (!ID.Events.pending(G, 'drift')) ID.Events.queue(G, n, 'drift', { to: d.to, label: d.label, why: d.why }); }
        else if (rng.chance(0.6)) { P.changeIdeology(G, n, d.to, 'drift'); return; }
        else { n.drift[d.to] = 55; n.stab -= 6; }
      }
    }

    /* strikes */
    const labor = ID.LAWS.labor.opts[n.laws.labor];
    if (I.econ.model !== 'council' && n.strike <= 0 && n.fs.workers < 45 && !n.cd.strike) {
      const p = 0.022 * labor.strike * ((45 - n.fs.workers) / 10) * (n.fp.workers / 20) * (n.ai ? 0.7 : diffP.crisis);
      if (rng.chance(p)) {
        n.cd.strike = 1; n.a.strikeCd = 10;
        if (n.fs.workers < 20 && n.fp.workers > 20) { if (n.id === G.player) ID.Events.queue(G, n, 'general_strike'); else { n.strike = 4; n.stab -= 8; P.boostOpp(G, n, 14, 0.3); ID.news(G, 'General strike paralyses ' + n.name + '.', 'pol', n.id); } }
        else if (n.id === G.player) ID.Events.queue(G, n, 'strike_wave');
        else { n.strike = 3; if (rng.chance(0.5)) { n.sm.workers += 8; n.sm.capital -= 4; } else { n.sm.workers -= 6; n.grievance += 4; } }
      }
    }
    if (n.cd.strike && --n.a.strikeCd <= 0) n.cd.strike = 0;

    /* coup risk */
    let risk = 0;
    if (!I.flags.noCoup) {
      const shaky = 1 + Math.max(0, 45 - n.stab) / 15 + Math.max(0, 45 - n.legit) / 20;
      risk = (Math.max(0, 56 - n.fs.military) / 56) * (n.fp.military / 16) * (rec.coup != null ? rec.coup : 1) * (1 + n.prestige / 60) * shaky * 0.016;
      if (n.fs.capital < 25 && n.fp.capital > 15 && n.fs.military < 50) risk += 0.012;
      if (n.prestige > 65 && n.legit < 45 && n.ideo !== 'junta') risk += 0.01;
      if (I.flags.colonels && n.fs.military < 50) risk += 0.008;
      risk *= n.ai ? 0.8 : diffP.crisis;
      if (n.a.coupAt != null && G.tick - n.a.coupAt < 720) risk *= 0.2;
      if (n.age < 18) risk *= 0.3;
    }
    n.coupRisk = risk;
    if (risk > 0.004 && rng.chance(risk)) {
      if (rng.chance(sec.detect * clamp(n.budget.security / 0.08, 0.3, 1.2))) {
        n.a.coupAt = G.tick;
        if (n.id === G.player) ID.Events.queue(G, n, 'plot_uncovered'); else { n.sm.military += 6; n.stab -= 2; }
      } else { P.coup(G, n, 0); if (!n.alive || G.over) return; }
    }

    /* uprising */
    if (!(n.civil && G.nations[n.civil] && G.nations[n.civil].alive) && !(n.civilOf && G.nations[n.civilOf] && G.nations[n.civilOf].alive) && n.age > 6 && !(n.a.civilEnd && G.tick - n.a.civilEnd < 1800)) {
      const mv = P.movement(G, n); n.a.mv = mv;
      if (mv.ideo && mv.share >= 0.22 && n.stab < 38) {
        const channel = I.elections && !n.emergency && ELECTORAL[mv.ideo] && n.laws.press !== 'censored';
        if (!channel && rng.chance(0.04 + (38 - n.stab) / 200)) { P.uprising(G, n, mv.ideo); if (!n.alive || G.over) return; }
      }
    }

    /* disintegration */
    if (n.stab <= 4) {
      n.zeroStab++;
      if (n.zeroStab === 4 && n.id === G.player) ID.news(G, 'The state is ceasing to function. Restore stability or it will dissolve.', 'bad', n.id);
      if (n.zeroStab >= 10) {
        if (n.id === G.player) { ID.Game.defeat(G, 'disintegration', {}); return; }
        n.zeroStab = 0; let cnt = 0;
        for (let p = 1; p < G.provinces.length && cnt < 3; p++) { const Pr = G.provinces[p]; if (Pr.owner === n.id && p !== G.prov[n.capital] && Pr.unrest > 45 && rng.chance(0.4)) { Pr.core = Pr.core === n.id ? 0 : Pr.core; if (P.secede(G, n, Pr)) cnt++; } }
        if (n.alive && !I.flags.noCoup) P.changeIdeology(G, n, P.coupIdeo(G, n, 0), 'coup');
        return;
      }
    } else n.zeroStab = 0;

    /* elections */
    if (I.elections && n.electionAt && G.tick >= n.electionAt) {
      n.electionAt = G.tick + I.elections * 360;
      if (n.emergency) { n.mandate = Math.max(0, n.mandate - 10); }
      else P.election(G, n);
      if (G.over) return;
    }

    /* succession */
    if (I.flags.succession || I.flags.softSuccession) {
      const age = n.leader.age;
      if (age > 58 && rng.chance((age - 58) * 0.0012)) P.succession(G, n);
    }

    /* threshold notes for the post-mortem */
    for (const f of F) {
      const low = n.fs[f] < 25 && n.fp[f] > 10;
      if (low && !n.a['low_' + f]) { n.a['low_' + f] = 1; ID.logGrief(n, G.tick, ID.FACTIONS[f].name + ' turned against the regime (support ' + Math.round(n.fs[f]) + ', power ' + Math.round(n.fp[f]) + '%).' + P.worstDemand(n, f)); }
      else if (!low && n.fs[f] > 35) n.a['low_' + f] = 0;
    }
    if (n.stab < 25 && !n.a.lowStab) { n.a.lowStab = 1; ID.logGrief(n, G.tick, 'Stability fell below 25 (legitimacy ' + Math.round(n.legit) + ', unrest ' + Math.round(n.a.unrest) + ').'); } else if (n.stab > 35) n.a.lowStab = 0;
  };

  P.worstDemand = function (n, f) {
    const d = (n.a.dem && n.a.dem[f]) || []; let w = null;
    for (const x of d) if (!w || x[1] < w[1]) w = x;
    return w && w[1] < -3 ? ' Worst grievance: ' + w[0] + ' (' + Math.round(w[1]) + ').' : '';
  };

  P.boostOpp = function (G, n, amt, minUrban) {
    for (let p = 1; p < G.provinces.length; p++) { const Pr = G.provinces[p]; if (Pr.owner === n.id && Pr.urban >= (minUrban || 0)) { Pr.oppStr = c100(Pr.oppStr + amt); Pr.unrest = c100(Pr.unrest + amt * 0.6); } }
  };

  P.electionForecast = function (G, n) {
    let g = 0;
    for (const f of F) g += (n.fp[f] / 100) * clamp((n.fs[f] - 20) / 60, 0, 1);
    g += (n.ls - n.lsPrev) * 0.004 + (n.nwars && n.glory > 50 ? 0.04 : 0) - n.we * 0.002 - (n.depression ? 0.07 : 0) + ID.mod(n, 'vote') + 0.06;
    return clamp(g, 0.05, 0.95);
  };
  P.oppositionParty = function (G, n) {
    const mv = n.a.mv; if (mv && mv.ideo && ELECTORAL[mv.ideo]) return mv.ideo;
    let best = null, bv = 0;
    for (const k in n.drift) if (ELECTORAL[k] && n.drift[k] > bv) { bv = n.drift[k]; best = k; }
    if (best) return best;
    const map = { liberal: n.fs.workers < 45 ? 'socdem' : 'natpop', socdem: n.fs.capital > n.fs.workers ? 'liberal' : 'demsoc', demsoc: 'socdem', marketsoc: 'demsoc', conmon: 'liberal', minarchy: 'liberal' };
    return map[n.ideo] || 'liberal';
  };
  P.election = function (G, n) {
    const g = P.electionForecast(G, n) + G.rng.range(-0.03, 0.03);
    if (g >= 0.5) {
      n.mandate = c100(52 + (g - 0.5) * 160); n.cnt.elections = (n.cnt.elections || 0) + 1;
      ID.news(G, 'Elections in ' + n.name + ': the government is returned with ' + Math.round(g * 100) + '%.', 'pol', n.id);
      if (n.id === G.player) ID.sfx(G, 'good');
    } else {
      const opp = P.oppositionParty(G, n);
      ID.logGrief(n, G.tick, 'Lost the election with ' + Math.round(g * 100) + '% of the vote.');
      if (n.id === G.player) ID.Events.queue(G, n, 'election_lost', { opp, share: g });
      else if (G.rng.chance(0.12) && n.fs.military > 55) { n.emergency = true; n.flags.everEmergency = 1; n.mandate = 10; n.stab -= 10; ID.news(G, 'The government of ' + n.name + ' annuls its election defeat.', 'bad', n.id); }
      else P.changeIdeology(G, n, opp, 'election');
    }
  };

  P.succession = function (G, n) {
    const I = ID.ideo(n); const old = n.leader;
    n.leader = ID.genLeader(G.rng, n.ideo); n.leader.age = G.rng.int(28, 55);
    n.cnt.successions = (n.cnt.successions || 0) + 1;
    if (I.flags.softSuccession) { n.tradition = c100(n.tradition + 3); ID.news(G, 'The monarch of ' + n.name + ' dies; ' + n.leader.name + ' is crowned.', 'pol', n.id); return; }
    const prepared = n.flags.heir ? 1 : 0;
    ID.news(G, old.title + ' ' + old.name + ' of ' + n.name + ' is dead.', 'pol', n.id);
    ID.chron(G, 'succession', old.title + ' ' + old.name + ' of ' + n.name + ' dies after ' + Math.round(n.age / 12) + ' years in power.', n.id);
    ID.logGrief(n, G.tick, 'The ruler died' + (prepared ? ' with a named heir.' : ' with no agreed successor.'));
    n.flags.heir = 0;
    if (n.id === G.player) { ID.Events.queue(G, n, 'succession', { prepared, old: old.name }); return; }
    const q = G.rng.next() + prepared * 0.3;
    if (I.legit.charisma) n.charisma = clamp(30 + q * 40, 15, 80);
    if (q < 0.3) { n.stab -= 22; n.sm.military -= 12; n.sm.bureaucracy -= 10; if (G.rng.chance(0.4)) P.changeIdeology(G, n, P.coupIdeo(G, n, 0), 'succession'); }
    else if (q < 0.7) { n.stab -= 10; }
    else n.tradition = c100(n.tradition + 4);
  };

  /* Resolve queued assembly votes. */
  P.tickVotes = function (G) {
    if (!G.votes.length) return;
    for (let k = G.votes.length - 1; k >= 0; k--) {
      const v = G.votes[k]; if (G.tick < v.at) continue;
      G.votes.splice(k, 1); const n = G.nations[v.n]; if (!n || !n.alive) continue;
      if (v.kind === 'law') { if (!P.lawAllowed(G, n, v.cat, v.opt)) P.applyLaw(G, n, v.cat, v.opt); }
      else if (v.kind === 'war') ID.Diplomacy.resolveWarVote(G, n, v);
      else if (v.kind === 'decision') ID.Events.runDecision(G, n, v.id, true);
    }
  };
})();
