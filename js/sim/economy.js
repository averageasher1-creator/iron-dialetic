/* IRON DIALECTIC — economy: eight models sharing one accounting frame. Runs monthly per nation. No DOM. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const B = ID.B, clamp = ID.clamp;
  const E = (ID.Economy = {});
  const CATS = (E.CATS = ['welfare', 'security', 'science', 'arms', 'heavy']);
  const PRIVATE = { market: 1, mixed: 1, pact: 1, trade: 1 };
  const DEBT_OK = { market: 1, mixed: 1, pact: 1, trade: 1, manor: 1 };

  E.budgetMax = function (n, cat) {
    const I = ID.ideo(n);
    if (cat === 'heavy') return I.econ.model === 'plan' || I.econ.model === 'cyber' ? 0.35 : 0;
    if (I.bmax && I.bmax[cat] != null) return I.bmax[cat];
    return 0.4;
  };
  /* Who may change the budget right now? '' = free, else a reason. */
  E.budgetLock = function (n) {
    const I = ID.ideo(n);
    if (I.econ.model === 'council') return 'The ' + I.control.body + ' sets the budget each January. You may table motions.';
    if (I.flags.fiveYear && n.plan) return 'The Five-Year Plan fixes these shares until ' + ID.dateOf(n.plan.end).short + '.';
    return '';
  };
  E.setBudget = function (n, cat, v) {
    v = clamp(v, 0, E.budgetMax(n, cat));
    let others = 0; for (const c of CATS) if (c !== cat) others += n.budget[c];
    n.budget[cat] = Math.min(v, Math.max(0, 0.88 - others));
  };
  E.debtCap = (n) => Math.max(120, n.gdp * 14);

  /* Congress of councils sets the budget (council model). */
  E.congress = function (G, n) {
    const I = ID.ideo(n); const b = Object.assign({ welfare: 0, security: 0, science: 0, arms: 0, heavy: 0 }, I.budget);
    if (n.nwars) { b.arms += 0.16; b.welfare -= 0.08; }
    else if (n.a.threatened) { b.arms += 0.07; b.welfare -= 0.03; }
    if (n.famine) { b.welfare += 0.05; b.science -= 0.03; }
    if (n.fs.workers < 45) { b.welfare += 0.05; b.arms -= 0.02; }
    for (const c of CATS) b[c] = clamp(b[c], 0, 0.45);
    n.budget = b; n.motions = 0;
  };
  E.motion = function (G, n, from, to) {
    if (n.motions >= 3) return 'The congress will hear no more motions this year.';
    if (n.auth < 10) return 'Not enough authority (10).';
    if (n.budget[from] < 0.04) return 'Nothing left to move from there.';
    if (to === 'security' && ID.ideo(n).family === 'anarchist') return 'The federation will not fund a security apparatus.';
    n.auth -= 10; n.motions++; n.budget[from] -= 0.04; n.budget[to] = clamp(n.budget[to] + 0.04, 0, 0.5);
    return '';
  };

  E.startPlan = function (G, n) {
    const heavy = n.budget.heavy;
    n.plan = { start: G.tick, end: G.tick + 5 * 360, base: Math.max(1, n.ind), target: Math.max(1, n.ind) * (1.1 + heavy * 1.5), shares: Object.assign({}, n.budget) };
  };
  function endPlan(G, n) {
    const p = n.plan; n.plan = null;
    const ratio = n.ind / p.target;
    if (ratio >= 1) {
      n.cnt.plans = (n.cnt.plans || 0) + 1; n.discipline = Math.min(100, n.discipline + 12); n.fervor = Math.min(100, n.fervor + 10);
      ID.addMod(n, 'legit', 6, 24, 'Plan fulfilled');
      ID.news(G, n.name + ' announces its Five-Year Plan fulfilled (' + Math.round(ratio * 100) + '% of target).', 'eco', n.id);
      if (n.id === G.player) { n.a.planRatio = ratio; ID.Events.queue(G, n, 'plan_fulfilled'); }
    } else if (n.id === G.player) {
      n.a.planRatio = ratio; ID.Events.queue(G, n, 'plan_failed');
    } else {
      if (G.rng.chance(0.5)) { n.dist = Math.min(100, n.dist + 12); n.discipline += 4; } else { n.discipline -= 10; n.fervor -= 6; }
    }
  }

  function autoBuild(G, n, type) {
    // place a factory near a city (or a port on the coast for commercial states)
    const cities = []; for (const i of G.blist) if (G.bld[i] === B.CITY && G.owner[i] === n.id) cities.push(i);
    if (!cities.length) cities.push(n.capital);
    for (let t = 0; t < 6; t++) {
      const s = ID.spotNear(G, G.rng.pick(cities), n.id, 9, type === B.PORT);
      if (s >= 0 && !G.rad[s]) { ID.placeBuilding(G, s, type); if (n.id === G.player) ID.fx(G, 'build', s); return true; }
    }
    return false;
  }

  E.month = function (G, n) {
    const I = ID.ideo(n), e = I.econ, model = e.model, L = ID.LAWS;
    const landLaw = L.land.opts[n.laws.land], laborLaw = L.labor.opts[n.laws.labor], tradeLaw = L.trade.opts[n.laws.trade], pressLaw = L.press.opts[n.laws.press], mobLaw = L.mobil.opts[n.laws.mobil];
    const rec = ID.RECRUIT[n.laws.recruit];
    if (model === 'council' && (G.tick % 360 < 30 || !n.a.congress)) { E.congress(G, n); n.a.congress = 1; }
    if (I.flags.fiveYear && n.plan) { n.budget = Object.assign({}, n.plan.shares); if (G.tick >= n.plan.end) endPlan(G, n); }
    for (const c of CATS) n.budget[c] = clamp(n.budget[c], 0, model === 'council' ? 0.5 : E.budgetMax(n, c));

    /* labour */
    const workers = Math.max(1, n.pop - n.troops);
    const labor = clamp(workers / (n.pop * 0.94), 0.4, 1.03);
    const strike = n.strike > 0 ? 0.7 : 1;

    /* agriculture and food */
    let food = n.foodLand * (1 + 0.09 * n.tech.agr) * landLaw.food * labor * (1 + ID.mod(n, 'food'));
    if (e.rural) food *= 1.15;
    if (e.smallholder) food *= 1.05;
    if (model === 'manor' && n.rent > 35) food *= 1 - (n.rent - 35) * 0.008;
    if (model === 'plan' || model === 'cyber') food *= clamp(0.9 + n.budget.welfare * 0.6, 0.9, 1.06);
    if (rec.harvest && n.mob > 0.05) food *= 1 - (n.mob - 0.05) * 2;
    const need = Math.max(1, n.pop * 0.24);
    let bal = food / need, importCost = 0;
    if (bal < 1 && n.laws.trade !== 'autarky' && n.ntrade > 0 && n.gold > 20) {
      const buy = Math.min(1 - bal, 0.25); importCost = buy * need * 0.011; bal += buy;
    }
    n.foodBal = bal;
    if (bal < 0.93) {
      if (!n.famine) { ID.news(G, 'Famine in ' + n.name + '.', 'bad', n.id); ID.logGrief(n, G.tick, 'Famine began (food at ' + Math.round(bal * 100) + '% of need).'); }
      n.famine++;
      n.pop *= 1 - Math.min(0.012, (1 - bal) * 0.03);
    } else n.famine = 0;
    const agr = food * 0.02;

    /* industry */
    const fac = n.nb[B.FACTORY];
    const oreF = clamp(0.78 + n.oreLand / Math.max(1, fac * 55), 0.78, 1.22);
    let ind = (fac * 12 * (1 + 0.1 * n.tech.ind) * oreF + n.nb[B.CITY] * 6) * labor * strike * (1 + (laborLaw.prod || 0) + (tradeLaw.ind || 0) + ID.mod(n, 'prod'));
    if (e.rural) ind *= 0.85;
    n.ind = ind; n.agr = agr;

    /* trade */
    let trade = 0, nt = 0;
    const ports = n.nb[B.PORT];
    for (const o of G.nations) {
      if (!o || !o.alive || o === n) continue;
      const d = G.dip[ID.dkey(n.id, o.id)]; if (!d || !d.trade || d.war) continue;
      nt++;
      const reach = ID.borders(G, n.id, o.id) || (ports && o.nb[B.PORT]) ? 1 : 0.35;
      trade += (0.8 + 0.025 * Math.min(n.prod || 20, o.prod || 20)) * reach;
    }
    trade *= tradeLaw.trade * (1 + 0.07 * Math.min(ports, 8)) * (model === 'trade' ? 1.6 : 1) * (1 + ID.mod(n, 'trade'));
    if (n.depression) trade *= 0.7;
    n.tradeInc = trade; n.ntrade = nt;

    /* efficiency by model */
    let eff = e.eff || 1, rev = 0;
    const corrF = 1 - n.corr / 220;
    if (PRIVATE[model]) {
      let avgU = n.a.unrest || 0;
      const tgt = 56 + (n.fs.capital - 50) * 0.5 - (n.tax - 22) * 0.7 - avgU * 0.3 - (n.nwars ? 8 : 0) + (n.laws.trade === 'free' ? 5 : 0) - n.inflation * 0.25 - (n.depression ? 28 : 0) + ID.mod(n, 'conf');
      n.conf += (clamp(tgt, 0, 100) - n.conf) * 0.1;
      n.cyc += 0.07;
      eff *= 0.8 + n.conf / 240 + Math.sin(n.cyc) * 0.09 * e.cycle;
      if (n.depression) { eff *= 1 - 0.22 * Math.min(1.3, e.cycle); n.depression--; if (!n.depression) ID.news(G, 'The slump in ' + n.name + ' is over.', 'eco', n.id); }
      else if (!G.world.depression && n.conf < 38 && Math.cos(n.cyc) < 0 && G.rng.chance(0.012 * e.cycle)) {
        n.depression = G.rng.int(12, 22); n.conf -= 12;
        ID.news(G, 'Panic on the ' + n.adj + ' exchanges: a slump begins.', 'bad', n.id); ID.logGrief(n, G.tick, 'A financial panic began a slump.');
        if (n.id === G.player) ID.sfx(G, 'bad');
      }
      if (model === 'pact') {
        const lo = Math.min(n.fs.workers, n.fs.capital);
        if (!n.pactBroken && lo < 26) { n.pactBroken = true; ID.news(G, 'The social pact in ' + n.name + ' has broken down.', 'bad', n.id); ID.logGrief(n, G.tick, 'The corporatist pact broke down (' + (n.fs.workers < n.fs.capital ? 'workers' : 'capital') + ' at ' + Math.round(lo) + ').'); }
        else if (n.pactBroken && lo > 40) { n.pactBroken = false; ID.news(G, 'Labour and capital in ' + n.name + ' return to the chambers.', 'eco', n.id); }
        eff *= n.pactBroken ? 0.72 : 0.97 + lo / 600;
      }
      if (I.flags.compromise) eff *= n.fs.workers >= 45 && n.fs.capital >= 45 ? 1.05 : (n.fs.workers < 30 || n.fs.capital < 30 ? 0.93 : 1);
    } else if (model === 'plan') {
      const grow = (e.dist || 0.1) * (1 + pressLaw.bias / 28) * (1 + n.gdp / 2500) - n.budget.science * 0.2 - (n.laws.press === 'free' ? 0.1 : 0) + ID.mod(n, 'dist');
      n.dist = clamp(n.dist + grow, 0, 100);
      eff *= (1 - n.dist / 170) * (I.flags.fiveYear && !n.plan ? 0.92 : 1);
      if (I.flags.permRev && n.isolated) eff *= 0.92;
    } else if (model === 'cyber') {
      const cap = 70 + (n.sciTotal || 0) * 0.3 + fac * 3 + n.tech.ind * 45;
      n.load = (agr + ind) / cap;
      eff *= n.load <= 1 ? 1 : Math.max(0.5, 1 - (n.load - 1) * 0.9);
      if (n.laws.press === 'censored') eff *= 0.82;
      if (n.load > 1.15 && !n.a.overloadNote) { n.a.overloadNote = 1; ID.news(G, 'The planning network of ' + n.name + ' is overloaded.', 'bad', n.id); ID.logGrief(n, G.tick, 'The planning network overloaded (load ' + n.load.toFixed(2) + ').'); }
      if (n.load <= 1) n.a.overloadNote = 0;
    } else if (model === 'council') {
      eff *= 0.9 + n.fs.workers / 420;
    }
    eff *= 1 + ID.mod(n, 'eff');
    if (n.trans > 0) eff *= 0.9;
    n.eff = eff;
    n.prod = (agr + ind) * eff;
    const gdp = Math.max(1, n.prod + trade);
    n.gdp = gdp;

    if (model === 'market' || model === 'mixed' || model === 'pact') rev = gdp * (n.tax / 100) * corrF;
    else if (model === 'trade') rev = (gdp - trade) * (n.tax / 100) * corrF + trade * 0.55;
    else if (model === 'plan') rev = gdp * e.share * (1 - n.dist / 400) * (1 - n.corr / 260);
    else if (model === 'cyber') rev = gdp * e.share;
    else if (model === 'council') rev = gdp * e.share * (0.75 + n.particip / 400);
    else if (model === 'manor') rev = (agr * eff * (n.rent / 100) + ind * eff * 0.18 + trade * 0.3) * corrF;
    rev *= 1 + ID.mod(n, 'rev') + 0.04 * (n.cnt.nationalized || 0);
    if (n.strike > 0) n.strike--;

    /* spending */
    const b = n.budget;
    const welfare = rev * b.welfare, security = rev * b.security, science = rev * b.science, arms = rev * b.arms, heavy = rev * b.heavy;
    let bu = 0; for (let t = 1; t <= 5; t++) bu += n.nb[t] * ID.BUILDINGS[t].upkeep;
    const upkeep = n.troops * 0.018 * rec.upkeep + bu + n.tiles * 0.0016 * (1 + n.tiles / 9000);
    let ops = 0; for (const o of n.ops) ops += o.cost;
    const interest = n.debt * 0.006;
    const exp = welfare + security + science + arms + heavy + upkeep + ops + interest + importCost;
    n.rev = rev; n.exp = exp; n.net = rev - exp; n.a.upkeep = upkeep; n.a.secSpend = security;
    n.gold += n.net;
    if (n.gold < 0) {
      if (DEBT_OK[model]) {
        n.debt += -n.gold; n.gold = 0; n.inflation += 0.4;
        if (n.debt > E.debtCap(n) && !n.flags.debtCrisis) {
          n.flags.debtCrisis = 1; ID.logGrief(n, G.tick, 'The state could no longer service its debt.');
          if (n.id === G.player) ID.Events.queue(G, n, 'debt_crisis'); else { n.debt *= 0.4; n.conf -= 25; n.sm.capital -= 15; ID.addMod(n, 'rev', -0.15, 24, 'Default'); n.flags.debtCrisis = 0; }
        }
      } else { n.a.shortage = Math.min(1, -n.gold / Math.max(1, rev)); n.gold = 0; }
    } else { n.a.shortage = 0; if (n.debt > 0 && n.gold > 120) { const pay = Math.min(n.debt, (n.gold - 120) * 0.25); n.debt -= pay; n.gold -= pay; } }
    n.inflation = Math.max(0, n.inflation - 1.2 + (n.nwars && PRIVATE[model] ? 0.5 : 0));

    /* investment funds: private capital or the plan build factories on their own */
    const facCap = Math.max(2, n.tiles / 55);
    if (PRIVATE[model]) n.privCap += gdp * (1 - n.tax / 100) * e.invest * Math.pow(n.conf / 100, 1.5) * (n.depression ? 0.3 : 1) * 0.36;
    else if (heavy > 0) n.privCap += heavy * 1.15;
    const fc = ID.buildCost(G, n, B.FACTORY);
    if (n.privCap >= fc && fac < facCap && !(I.flags.antiIndustry && fac >= n.tiles / 500)) {
      const type = model === 'trade' && n.coastTiles > 0 && n.nb[B.PORT] < 10 && G.rng.chance(0.4) ? B.PORT : B.FACTORY;
      if (autoBuild(G, n, type)) n.privCap -= type === B.PORT ? ID.buildCost(G, n, B.PORT) : fc;
    }
    if (n.privCap > fc * 3) n.privCap = fc * 3;

    /* living standards */
    const ref = G.stats.gdppcRef || 16;
    const gdppc = (gdp / Math.max(1, n.pop)) * 1000; n.gdppc = gdppc;
    let ls = 20 + 25 * Math.pow(clamp(gdppc / ref, 0.25, 2.6), 0.75);
    ls += b.welfare * 56 * Math.sqrt(clamp(rev / gdp / 0.3, 0.2, 2.2));
    if (bal < 1) ls -= (1 - bal) * 110;
    if (n.famine) ls -= 12;
    ls -= n.inflation * 0.35 + n.we * 0.12;
    ls += (tradeLaw.ls || 0) + (mobLaw.ls || 0) + ID.mod(n, 'ls');
    if (n.depression) ls -= 9 * Math.min(1.3, e.cycle || 0.5);
    if (PRIVATE[model]) ls -= Math.max(0, n.tax - 28) * 0.12;
    if (n.a.shortage) ls -= n.a.shortage * 30;
    n.a.lsHist = n.a.lsHist || []; n.a.lsHist.push(n.ls); if (n.a.lsHist.length > 12) n.lsPrev = n.a.lsHist.shift(); else n.lsPrev = n.a.lsHist[0];
    n.ls += (clamp(ls, 0, 100) - n.ls) * 0.2;

    /* equipment */
    const eq = clamp(0.62 + arms / Math.max(1, n.troops * 0.035) * 0.38, 0.62, 1.35) - (n.a.shortage ? 0.1 : 0);
    n.equip += (eq - n.equip) * 0.1 * (eq > n.equip && n.a.dp ? n.a.dp.equipRegen : 1);

    /* research */
    let pts = science * (1 + pressLaw.sci + (I.flags.sciBonus || 0) - (I.flags.sciPenalty || 0)) * (0.7 + n.fs.intelligentsia / 160) * (1 + ID.mod(n, 'sci'));
    if (e.privSci) pts += gdp * 0.045 * (n.conf / 100);
    n.sci += pts; n.sciTotal = (n.sciTotal || 0) + pts;
    const lv = n.tech[n.focus], capL = ID.ERAS[ID.eraOf(G.tick)].techCap;
    if (lv < capL) {
      const lead = (G.stats.techMax && G.stats.techMax[n.focus]) || 0;
      const cost = 200 * Math.pow(1.55, lv) * (lv < lead ? 0.65 : 1);
      n.a.techCost = cost;
      if (n.sci >= cost) {
        n.sci -= cost; n.tech[n.focus]++;
        if (n.id === G.player) { ID.news(G, 'Research complete: ' + { ind: 'industrial', mil: 'military', agr: 'agricultural' }[n.focus] + ' technology ' + n.tech[n.focus] + '.', 'good', n.id); ID.sfx(G, 'good'); }
        if (n.focus === 'mil' && n.tech.mil === 6) { ID.news(G, n.name + ' has tested an atomic device.', 'bad', n.id); ID.chron(G, 'nuke', n.name + ' becomes an atomic power.', n.id); }
      }
    } else { n.a.techCost = 0; if (n.sci > 400) n.sci = 400; }

    /* slow variables */
    const secLaw = L.security.opts[n.laws.security];
    let dc = pressLaw.corr * 0.5 + (secLaw.repress > 0.5 ? 0.08 : 0) + (I.flags.corrGrow || 0) + n.tiles / 26000 + (model === 'plan' ? 0.06 : 0) - (n.laws.security === 'liberties' ? 0.08 : 0) - b.security * 0.6 - (n.corr - 15) * 0.008;
    if (model === 'council') dc = n.corr > 8 ? -0.5 : 0;
    n.corr = clamp(n.corr + dc, 0, 100);
    let db = (model === 'plan' ? 0.12 : 0.02) + (secLaw.bureau || 0) + (n.nwars ? 0.08 : 0) + (n.fp.bureaucracy - 20) * 0.004 - (I.control.type === 'assembly' ? 0.3 : 0) - (n.bureau - 10) * 0.003 + ID.mod(n, 'bureau');
    n.bureau = clamp(n.bureau + db, 0, 100);

    /* crises count (for competence legitimacy and events) */
    n.crises = (n.depression ? 1 : 0) + (n.famine ? 1 : 0) + (n.pactBroken ? 1 : 0) + (n.strike > 0 ? 1 : 0) + (n.inflation > 60 ? 1 : 0) + (n.flags.debtCrisis ? 1 : 0) + (n.load > 1.15 ? 1 : 0) + (n.a.unrest > 45 ? 1 : 0);
    if (n.inflation > 60 && !n.a.hyper) { n.a.hyper = 1; ID.news(G, 'Hyperinflation grips ' + n.name + '.', 'bad', n.id); ID.logGrief(n, G.tick, 'Hyperinflation: prices out of control.'); }
    if (n.inflation < 35) n.a.hyper = 0;

    /* expire modifiers */
    for (let k = n.mods.length - 1; k >= 0; k--) if (--n.mods[k].m <= 0) n.mods.splice(k, 1);
  };

  /* World economy: the Great Depression. */
  E.worldMonth = function (G) {
    const w = G.world;
    if (w.depression > 0) w.depression--;
    if (!w.depressionDone && G.tick >= w.depressionAt) {
      w.depressionDone = 1; w.depression = 40; w.tension += 15;
      ID.news(G, 'THE GREAT SLUMP: markets collapse across the world.', 'bad');
      ID.headline(G, { kicker: 'Black week on the exchanges', title: 'The Great Slump', sub: 'Markets collapse across the world. Planned and peasant economies watch from the sidelines.', tone: 'bad' });
      ID.chron(G, 'world', 'The Great Slump begins. Market economies everywhere contract; planned and subsistence economies watch.');
      ID.sfx(G, 'crash');
      for (const n of G.nations) {
        if (!n || !n.alive) continue;
        const I = ID.ideo(n), e = I.econ;
        const c = PRIVATE[e.model] ? (e.cycle || 0.5) * ID.LAWS.trade.opts[n.laws.trade].contagion : 0;
        if (c > 0.25 && !I.flags.depressionProof) {
          n.depression = Math.round(38 * Math.min(1.4, c)); n.conf = Math.max(5, n.conf - 30 * c);
          ID.logGrief(n, G.tick, 'The Great Slump reached the country.');
          if (n.id === G.player) ID.Events.queue(G, n, 'great_slump');
        } else if (e.model === 'plan' || e.model === 'cyber' || e.model === 'council') { ID.addMod(n, 'legit', 5, 30, 'Untouched by the Slump'); n.fervor = Math.min(100, n.fervor + 6); }
      }
    }
  };
})();
