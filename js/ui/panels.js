/* IRON DIALECTIC — drawer panels: State, Economy, Laws, War, Foreign, World, Handbook. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const UI = ID.UI, R = ID.Render, esc = ID.esc, clamp = ID.clamp, B = ID.B;
  const Pn = (ID.Panels = {});
  const tip = (h) => UI.tip(h), btn = UI.btn, bar = UI.bar, kv = UI.kv;
  const sec = (title, body, small) => '<div class="sec"><h3>' + title + (small ? '<small>' + small + '</small>' : '') + '</h3>' + body + '</div>';
  const mood = (v) => (v < 20 ? 'hostile' : v < 35 ? 'angry' : v < 48 ? 'restless' : v < 62 ? 'content' : v < 78 ? 'loyal' : 'devoted');
  const col = (v) => (v < 30 ? 'r' : v < 45 ? 'o' : 'g');
  const yrs = (m) => (m >= 24 ? Math.round(m / 12) + ' years' : m + ' months');

  function decisionCard(G, n, d) {
    const why = ID.Events.decisionBlock(G, n, d), I = ID.ideo(n), c = d.cost || {};
    const needsVote = d.vote && (I.control.type === 'parliament' || I.control.type === 'assembly') && !n.emergency;
    let vt = '';
    if (needsVote) { const v = ID.Politics.vote(G, n, 'decision', { aff: d.vote }); vt = '<hr>The ' + esc(I.control.body) + ' must pass it: forecast <b class="' + (v.pass ? 'good' : 'bad') + '">' + Math.round(v.yes) + '%</b> in favour.'; }
    const fx = typeof d.fx === 'function' ? '' : UI.fxHtml(d.fx, n);
    const cost = [c.auth ? c.auth + ' authority' : '', c.gold ? c.gold + ' gold' : ''].filter(Boolean).join(', ') || 'No cost';
    return '<div class="dec"><h4>' + esc(d.name) + '</h4><p>' + esc(d.desc) + '</p><div class="cost">' + cost + (fx ? ' <span style="display:inline-flex;flex-wrap:wrap;gap:0 10px;font-weight:600">' + fx + '</span>' : '') + '</div>' +
      btn(needsVote ? 'Put to vote' : 'Enact', 'decide', d.id, { cls: 'sm', off: why, tip: '<h5>' + esc(d.name) + '</h5>' + esc(d.desc) + vt + '<hr><span class="dim">Can be repeated after ' + yrs(d.cd || 12) + '.</span>' }) + '</div>';
  }

  /* ================================================================ STATE */
  Pn.gov = function (G, n) {
    const I = ID.ideo(n); let h = '';
    h += '<p class="lead"><b>' + esc(I.name) + '.</b> ' + esc(I.short) + ' ' + '<button class="b sm ghost" data-act="help" data-a=\'"i:' + I.id + '"\'>Read more</button></p>';
    const stT = n.a.stabTgt != null ? n.a.stabTgt : n.stab;
    h += '<div class="gauges">' +
      '<div class="gauge"' + tip('<h5>Stability</h5>Moving toward <b>' + Math.round(stT) + '</b>.<hr><div class="kv"><span>Legitimacy × 0.42</span><b>' + (n.legit * 0.42).toFixed(0) + '</b><span>Faction support by power × 0.42</span><b>' + ((n.a.ws || 50) * 0.42).toFixed(0) + '</b><span>Unrest</span><b>−' + ((n.a.unrest || 0) * 0.22).toFixed(0) + '</b><span>War weariness</span><b>−' + (n.we * 0.18).toFixed(0) + '</b>' + (n.trans > 0 ? '<span>Transition</span><b>−10</b>' : '') + '</div>') + '><i>Stability</i><b>' + Math.round(clamp(n.stab, 0, 100)) + '<small class="' + (stT > n.stab + 1 ? 'good">▲' : stT < n.stab - 1 ? 'bad">▼' : 'dim">–') + '</small></b>' + bar(n.stab, 100, col(n.stab), stT) + '</div>' +
      '<div class="gauge"' + tip('<h5>Legitimacy</h5>The weighted sum of this ideology’s sources, listed below. It feeds stability and how fast authority accumulates.') + '><i>Legitimacy</i><b>' + Math.round(n.legit) + '</b>' + bar(n.legit, 100, col(n.legit), n.legitRaw) + '</div>' +
      '<div class="gauge"' + tip('<h5>Authority</h5>Gained each month (more with high legitimacy), spent on laws and decisions. ' + esc(ID.CONTROL[I.control.type].desc)) + '><i>Authority</i><b>' + Math.round(n.auth) + '</b>' + bar(n.auth, 100, 's') + '</div></div>';

    // legitimacy sources
    let ls = '';
    for (const k of Object.keys(I.legit).sort((a, b) => I.legit[b] - I.legit[a])) {
      ls += '<div class="part"' + tip('<h5>' + ID.LEGIT[k].name + '</h5>' + esc(ID.LEGIT[k].desc) + '<hr>Carries <b>' + Math.round(I.legit[k] * 100) + '%</b> of your legitimacy.') + '><span>' + ID.LEGIT[k].name + ' <span class="dim">' + Math.round(I.legit[k] * 100) + '%</span></span>' + bar(n.src[k], 100, col(n.src[k])) + '<b>' + Math.round(n.src[k]) + '</b></div>';
    }
    h += sec('Where legitimacy comes from', ls);

    // factions
    const fuzzy = UI.fuzzy(n), press = ID.LAWS.press.opts[n.laws.press];
    let fh = fuzzy ? '<div class="note red">Under ' + esc(press.name.toLowerCase()) + ', these are the figures your officials report. They run high, by up to ' + (press.bias + press.noise) + ' points, and nobody will tell you by how much.</div>' : '';
    const dem = n.a.dem || ID.Politics.demands(G, n);
    for (const f of ID.FACTION_IDS) {
      const F = ID.FACTIONS[f], sup = UI.seen(n, f), pw = n.fp[f];
      const tgt = n.a['tgt_' + f]; const trend = fuzzy || tgt == null ? '' : tgt > n.fs[f] + 2 ? ' <span class="good">▲</span>' : tgt < n.fs[f] - 2 ? ' <span class="bad">▼</span>' : '';
      let t = '<h5>' + esc(ID.factionName(n, f)) + '</h5>' + esc(F.desc) + '<hr><b>What moves them</b><div class="kv"><span>This regime, as such</span><b>' + UI.sg(I.fbase[f] || 0) + '</b>';
      for (const x of dem[f]) if (Math.abs(x[1]) >= 0.5) t += '<span>' + esc(x[0]) + '</span><b>' + UI.sg(x[1]) + '</b>';
      t += '</div><hr><span class="dim">If they turn: ' + esc(F.turn) + '</span>';
      const d = ID.Events.decision('conc_' + f), why = ID.Events.decisionBlock(G, n, d);
      fh += '<div class="fac' + (sup < 30 && pw > 10 ? ' hot' : '') + '"' + tip(t) + '><span class="gl">' + F.glyph + '</span><div class="nm">' + esc(ID.factionName(n, f)) + '<small>' + mood(sup) + trend + '</small></div>' +
        '<div class="act">' + btn('Concede', 'decide', d.id, { cls: 'sm ghost', off: why, tip: '<h5>' + esc(d.name) + '</h5>' + esc(d.desc) + '<hr>Cost: ' + (d.cost.gold ? d.cost.gold + ' gold, ' : '') + d.cost.auth + ' authority<br>' + UI.fxHtml(d.fx, n).replace(/<\/span>/g, '</span> ') }) + '</div>' +
        '<div class="bars"><span>Power</span>' + bar(pw, 50, '') + '<b>' + Math.round(pw) + '%</b><span>Support</span>' + bar(sup, 100, col(sup) + (fuzzy ? ' hatch' : '')) + '<b>' + Math.round(sup) + '</b></div></div>';
    }
    h += sec('Factions', fh, fuzzy ? 'reported figures' : 'hover for causes');

    // drift
    let dh = '';
    for (const d of I.drift) {
      const v = n.drift[d.to] || 0, rate = (n.a.driftRate && n.a.driftRate[d.to]) || 0, why = ID.Events.embraceBlock(G, n, d.to);
      dh += '<div class="drift"' + tip('<h5>' + esc(d.label) + '</h5>' + esc(d.why) + '<hr>At 100 the change is upon you: ride it or pay to push it back. Remove its causes and it recedes on its own.') + '><div class="hd"><b>' + esc(d.label) + '</b> → ' + UI.ideoTag(d.to) + '<small class="' + (rate > 0.02 ? 'bad' : rate < -0.02 ? 'good' : 'dim') + '">' + (rate > 0 ? '+' : '') + rate.toFixed(2) + ' / month</small></div><div class="row nw">' + bar(v, 100, v > 65 ? 'r' : 'o') + '<b class="num" style="min-width:34px;text-align:right">' + Math.round(v) + '</b>' +
        btn('Embrace', 'embrace', d.to, { cls: 'sm ghost', off: why, tip: '<h5>Reform programme</h5>Put yourself at the head of this change and become <b>' + esc(ID.IDEOLOGIES[d.to].name) + '</b> on your own terms. Costs 50 authority; an 18-month transition follows.' }) + '</div></div>';
    }
    h += sec('Drift', dh || '<p class="dim">This regime has no drift paths.</p>', 'where the regime is sliding');

    // regime facts
    const rows = [['Head of state', esc(n.leader.title) + ' ' + esc(n.leader.name) + ', ' + n.leader.age], ['Regime age', yrs(n.age)]];
    if (n.trans > 0) rows.push(['In transition', '<span class="warn">' + n.trans + ' months</span>', 'A new regime is unsteady: stability, efficiency and morale are reduced until it settles.']);
    if (I.elections) { const f = ID.Politics.electionForecast(G, n); rows.push(['Next election', n.emergency ? '<span class="bad">suspended</span>' : ID.dateOf(n.electionAt).short + ' · <span class="' + (f >= 0.5 ? 'good' : 'bad') + '">' + Math.round(f * 100) + '%</span>', 'Forecast vote for the government: faction support weighted by power, plus recent living standards. Below 50% the opposition wins and the country changes ideology peacefully.']); }
    if (n.emergency) rows.push(['Emergency rule', '<span class="bad">in force</span>', 'Votes are suspended. Participation and mandate drain every month.']);
    rows.push(['Unrest', Math.round(n.a.unrest || 0) + '', 'Average unrest across your provinces. See the Unrest map (V).']);
    const det = ID.LAWS.security.opts[n.laws.security].detect;
    rows.push(['Plots', det <= 0 ? '<span class="dim">no means of knowing</span>' : n.coupRisk > 0.02 ? '<span class="bad">active plotting</span>' : n.coupRisk > 0.006 ? '<span class="warn">murmurs</span>' : 'quiet', det <= 0 ? 'Without political police you cannot assess the officer corps. ' + (I.flags.noCoup ? 'This regime has no officer caste to fear.' : '') : 'Assessment by your security service.']);
    rows.push(['Hidden grievance', fuzzy ? '<span class="dim">unknown</span>' : Math.round(n.grievance) + '', 'What censorship and repression have pushed out of sight. It surfaces all at once if the lid lifts.' + (fuzzy ? ' Your own censorship keeps you from measuring it.' : '')]);
    rows.push(['Corruption', Math.round(n.corr) + '', 'Eats revenue. Grows under censorship and one-man rule; a free press and prosecutions cut it.']);
    rows.push(['Bureaucratisation', Math.round(n.bureau) + '', 'The apparatus becoming an interest of its own. Erodes revolutionary fervour and feeds several drifts.']);
    if (n.prestige > 20) rows.push(['Generals’ prestige', '<span class="' + (n.prestige > 50 ? 'warn' : '') + '">' + Math.round(n.prestige) + '</span>', 'Victories make generals popular. A popular general and a weak regime is how coups begin.']);
    h += sec('The regime', kv(rows));

    const ds = ID.Events.decisionsFor(G, n);
    h += sec('Decisions', ds.map((d) => decisionCard(G, n, d)).join('') || '<p class="dim">Nothing to decide.</p>');
    return h;
  };

  /* ================================================================ ECONOMY */
  const BL = { welfare: ['Welfare', 'Raises living standards directly. Workers and peasants judge you by them.'], security: ['Security', 'Funds police and — if your laws allow them — the political police. Underfund a repressive apparatus and buried grievance bursts out.'], science: ['Science', 'Research points toward the technology you have chosen.'], arms: ['Arms', 'Equipment quality (attack and defence) and the goodwill of the officer corps.'], heavy: ['Heavy industry', 'The plan’s investment fund: builds factories for you.'] };
  Pn.eco = function (G, n) {
    const I = ID.ideo(n), e = I.econ, M = ID.ECON[e.model], E = ID.Economy; let h = '';
    h += '<div class="card sh"><b style="font:700 19px var(--cond)">' + esc(M.name) + '</b><p class="lead" style="margin:2px 0 4px">' + esc(M.how) + '</p><p class="lead" style="margin:0"><b>How it fails:</b> ' + esc(M.fail) + '</p></div>';
    const rows = [['Output per month', Math.round(n.gdp) + '', 'Farms ' + Math.round(n.agr) + ' + industry ' + Math.round(n.ind) + ', times efficiency, plus trade ' + Math.round(n.tradeInc) + '.'],
      ['Efficiency', '<span class="' + (n.eff < 0.85 ? 'bad' : n.eff > 1.02 ? 'good' : '') + '">' + Math.round(n.eff * 100) + '%</span>', 'Set by your economy model: confidence, distortion, morale or overload.'],
      ['Revenue', n.rev.toFixed(1)], ['Spending', n.exp.toFixed(1), 'Programmes, plus upkeep of ' + (n.a.upkeep || 0).toFixed(1) + ' for troops, buildings and administration. Administration grows faster than territory.'],
      ['Balance', UI.sg(n.net, 1)], ['Treasury', Math.round(n.gold) + '']];
    if (n.debt > 1) rows.push(['Debt', '<span class="' + (n.debt > E.debtCap(n) * 0.75 ? 'bad' : 'warn') + '">' + Math.round(n.debt) + ' / ' + Math.round(E.debtCap(n)) + '</span>', 'Interest is 0.6% a month. Past the limit you must default, squeeze or print.']);
    if (n.inflation > 1) rows.push(['Inflation', '<span class="' + (n.inflation > 40 ? 'bad' : 'warn') + '">' + Math.round(n.inflation) + '</span>', 'Eats living standards. Over 60 is hyperinflation.']);
    rows.push(['Living standards', '<span class="' + (n.ls < 38 ? 'bad' : n.ls > 65 ? 'good' : '') + '">' + Math.round(n.ls) + '</span>', 'Output per head against the world, plus welfare, minus famine, inflation and war.']);
    rows.push(['Food', '<span class="' + (n.foodBal < 0.93 ? 'bad' : n.foodBal < 1 ? 'warn' : '') + '">' + Math.round(n.foodBal * 100) + '% of need</span>']);
    rows.push(['Trade treaties', n.ntrade + ' · ' + Math.round(n.tradeInc) + '/mo', 'Sign treaties on the Foreign panel. Ports and free trade multiply the income.']);
    h += sec('Accounts', kv(rows));

    // model levers
    let lv = '';
    const slider = (label, key, min, max, val, t, fmt) => '<div class="sl"><span' + tip(t) + '>' + label + '</span><input type="range" min="' + min + '" max="' + max + '" step="1" value="' + Math.round(val) + '" data-in="' + key + '"><b data-val>' + Math.round(val) + '%</b></div>';
    if (e.taxMin != null) lv += slider('Tax rate', 'tax', e.taxMin, e.taxMax, n.tax, '<h5>Tax rate</h5>Revenue is output × tax. Capital resents every point above 24%, confidence falls, and private investment slows.' + (e.taxMax <= 15 ? '<hr><span class="warn">' + esc(I.name) + ' caps taxes at ' + e.taxMax + '%.</span>' : ''));
    if (e.model === 'manor') lv += slider(n.ideo === 'theocracy' ? 'Tithe' : 'Rent', 'rent', e.rentMin, e.rentMax, n.rent, '<h5>Rent on the harvest</h5>Your income is this share of agricultural output. Peasants resent every point above 24%; above 35% the harvest itself shrinks.');
    if (e.model === 'pact') lv += slider('Labour’s share', 'pact', 20, 80, n.pact, '<h5>The pact</h5>How the product is divided between labour and capital. Above 50 favours workers, below favours owners. If either side’s support falls under 26 the pact breaks and output drops by a quarter until both are back above 40.');
    if (e.model === 'market' || e.model === 'mixed' || e.model === 'pact' || e.model === 'trade') {
      lv += kv([['Business confidence', '<span class="' + (n.conf < 35 ? 'bad' : n.conf > 65 ? 'good' : '') + '">' + Math.round(n.conf) + '</span>', 'Drives efficiency and private investment. Hurt by taxes, unrest, war, inflation and unhappy owners.'],
        ['Business cycle', Math.sin(n.cyc) > 0.3 ? 'boom' : Math.sin(n.cyc) < -0.3 ? 'trough' : Math.cos(n.cyc) > 0 ? 'rising' : 'falling', 'Market economies swing between boom and trough about every eight years. A falling cycle with low confidence can tip into a slump.'],
        ['Private investment fund', Math.round(n.privCap) + ' / ' + ID.buildCost(G, n, B.FACTORY), 'When it reaches the price of a factory, capital builds one for you.']]);
    }
    if (e.model === 'plan') {
      lv += kv([['Plan distortion', '<span class="' + (n.dist > 50 ? 'bad' : n.dist > 30 ? 'warn' : '') + '">' + Math.round(n.dist) + '</span>', 'The gap between the plan and reality. Efficiency falls as it rises. It grows faster with censorship and the size of the economy; science spending, a freer press, a Thaw and honest audits reduce it.']]);
      if (I.flags.fiveYear) {
        if (n.plan) { const p = n.plan; lv += '<div class="note ok"><b>Five-Year Plan</b> to ' + ID.dateOf(p.end).short + '. Industrial target ' + Math.round(p.target) + ', now ' + Math.round(n.ind) + '.</div>' + bar(n.ind - p.base, Math.max(1, p.target - p.base), n.ind >= p.target ? 'g' : 'o'); }
        else lv += '<div class="note red">No plan is in force: efficiency −8%. Set the shares below, then launch a plan from the State panel.</div>' + decisionCard(G, n, ID.Events.decision('five_year_plan'));
      }
    }
    if (e.model === 'cyber') lv += kv([['Network load', '<span class="' + (n.load > 1 ? 'bad' : n.load > 0.85 ? 'warn' : 'good') + '">' + Math.round(n.load * 100) + '%</span>', 'The economy’s size against your computing capacity. Over 100% efficiency collapses. Science spending, factories, industrial technology and the Expand the Network decision add capacity.']]);
    if (e.model === 'council') lv += kv([['Participation', Math.round(n.particip) + '', 'The federation’s levy rises with participation. Workers’ support sets efficiency.'], ['Motions tabled this year', n.motions + ' / 3']]);
    if (lv) h += sec('Levers', lv);

    // budget
    const lock = E.budgetLock(n); let bh = lock ? '<div class="note">' + esc(lock) + '</div>' : '';
    for (const c of E.CATS) {
      const mx = e.model === 'council' ? 0.5 : E.budgetMax(n, c); if (mx <= 0 && n.budget[c] <= 0) continue;
      const lab = c === 'welfare' && (e.model === 'plan' || e.model === 'cyber') ? 'Consumption' : BL[c][0];
      bh += '<div class="sl"><span' + tip('<h5>' + lab + '</h5>' + BL[c][1] + '<hr>' + (n.rev * n.budget[c]).toFixed(1) + ' gold a month') + '>' + lab + '</span><input type="range" min="0" max="' + Math.round(mx * 100) + '" step="1" value="' + Math.round(n.budget[c] * 100) + '" data-in="budget" data-k="' + c + '"' + (lock ? ' disabled' : '') + '><b data-val>' + Math.round(n.budget[c] * 100) + '%</b></div>';
    }
    let tot = 0; for (const c of E.CATS) tot += n.budget[c];
    bh += '<p class="dim" style="font-size:13.5px">Programmes take ' + Math.round(tot * 100) + '% of revenue; the rest pays upkeep and fills the treasury.</p>';
    if (e.model === 'council') {
      const mo = [['welfare', 'arms'], ['arms', 'welfare'], ['welfare', 'science'], ['science', 'arms'], ['arms', 'science'], ['science', 'welfare']];
      bh += '<div class="row" style="margin-top:6px">' + mo.map((m) => btn(BL[m[1]][0] + ' +4 <span class="dim">from ' + BL[m[0]][0].toLowerCase() + '</span>', 'motion', m, { cls: 'sm ghost', off: n.motions >= 3 ? 'The congress will hear no more motions this year.' : n.auth < 10 ? 'Needs 10 authority.' : '', tip: 'Table a motion in the ' + esc(I.control.body) + ' to move four points of the budget. Costs 10 authority; three motions a year.' })).join('') + '</div>';
    }
    h += sec('Budget', bh, 'share of revenue');

    // research
    const cap = ID.ERAS[ID.eraOf(G.tick)].techCap; const TN = { ind: ['Industry', '+10% factory output per level'], mil: ['Military', '+7% attack and defence per level. Level 2: blitz. Level 4: missile silos. Level 6: atomic weapons.'], agr: ['Agriculture', '+9% food and +7% population capacity per level'] };
    let rh = '<div class="row">' + ['ind', 'mil', 'agr'].map((k) => btn(TN[k][0] + ' ' + n.tech[k], 'focusTech', k, { cls: n.focus === k ? 'on' : 'ghost', tip: '<h5>' + TN[k][0] + ' technology ' + n.tech[k] + '</h5>' + TN[k][1] + '<hr>This era allows up to level ' + cap + '. States behind the world leader research 35% faster.' })).join('') + '</div>';
    rh += n.a.techCost ? '<div class="row nw" style="margin-top:6px">' + bar(n.sci, n.a.techCost, 's') + '<span class="num" style="font-size:13.5px">' + Math.round(n.sci) + ' / ' + Math.round(n.a.techCost) + '</span></div>' : '<div class="note">This field is at the ceiling for the ' + ID.ERAS[ID.eraOf(G.tick)].name + '. Choose another, or wait for ' + (ID.ERAS[ID.eraOf(G.tick) + 1] ? ID.ERAS[ID.eraOf(G.tick) + 1].from : 'the end') + '.</div>';
    h += sec('Research', rh, 'pick one focus');

    h += sec('Built', kv([1, 2, 3, 4, 5].map((t) => [ID.BUILDINGS[t].name, n.nb[t] + '', esc(ID.BUILDINGS[t].desc)])) + '<p class="dim" style="font-size:13.5px;margin-top:6px">To build, select a tile of your own land on the map.</p>');
    if (n.mods.length) h += sec('In effect', '<table class="t">' + n.mods.filter((m) => m.label && m.k.indexOf('pow_') !== 0).slice(0, 14).map((m) => '<tr><td>' + esc(m.label) + '</td><td class="n">' + (m.m > 200 ? 'lasting' : m.m + ' mo') + '</td></tr>').join('') + '</table>');
    return h;
  };

  /* ================================================================ LAWS */
  function lawFx(cat, o) {
    const out = [];
    const p = (v, lab, inv) => { if (v) out.push('<span class="' + ((inv ? v < 0 : v > 0) ? 'good' : 'bad') + '">' + lab + ' ' + (v > 0 ? '+' : '−') + Math.abs(Math.round(v * 100)) + '%</span>'); };
    if (cat === 'recruit') { out.push('Ceiling ' + (o.maxMob * 100).toFixed(1) + '% of population'); out.push('Attack ×' + o.atk + ', defence ×' + o.def); out.push('Upkeep ×' + o.upkeep); if (o.coup === 0) out.push('<span class="good">No coup risk from this army</span>'); else if (o.coup > 1.2) out.push('<span class="bad">Coup risk ×' + o.coup + '</span>'); }
    p(o.sci, 'Research'); p(o.spread, 'Opposition spread', true); p(o.food - 1, 'Food'); p(o.prod, 'Industry'); p(o.ind, 'Industry'); p(o.atk && cat !== 'recruit' ? o.atk : 0, 'Combat strength');
    if (o.trade != null) out.push('Trade income ×' + o.trade);
    if (o.shield) out.push('<span class="good">Hides ' + Math.round(o.shield * 100) + '% of bad news</span>');
    if (o.bias) out.push('<span class="bad">Your faction reports inflated by up to ' + (o.bias + o.noise) + '</span>');
    if (o.repress) out.push('<span class="good">Suppresses opposition (' + o.repress + ')</span>');
    if (o.detect) out.push('<span class="good">Uncovers ' + Math.round(o.detect * 100) + '% of plots</span>');
    if (o.grievance > 0) out.push('<span class="bad">Hidden grievance +' + o.grievance + ' a month</span>');
    if (o.ls) out.push('<span class="bad">Living standards ' + o.ls + '</span>');
    if (o.mob) out.push('<span class="good">Mobilisation ceiling +' + Math.round(o.mob * 100) + '%</span>');
    return out;
  }
  Pn.law = function (G, n) {
    const I = ID.ideo(n), Pl = ID.Politics; let h = '<p class="lead">Changing a law costs authority' + (I.control.type === 'parliament' || I.control.type === 'assembly' ? ' and needs a majority in the ' + esc(I.control.body) : '') + '. Each area can be changed once a year. Greyed options are incompatible with ' + esc(I.name) + '.</p>';
    const cats = ['recruit'].concat(ID.LAW_CATS);
    for (const c of cats) {
      const defs = c === 'recruit' ? ID.RECRUIT : ID.LAWS[c].opts; const name = c === 'recruit' ? 'Recruitment' : ID.LAWS[c].name; const desc = c === 'recruit' ? 'How the army is raised.' : ID.LAWS[c].desc;
      let oh = '';
      for (const k in defs) {
        const o = defs[k], cur = n.laws[c] === k; let why = cur ? '' : Pl.lawAllowed(G, n, c, k);
        const incompatible = why && why.indexOf('Not compatible') === 0;
        if (!cur && !why) { if ((n.cd['law_' + c] || 0) > G.tick) why = 'Changed recently: wait until ' + ID.dateOf(n.cd['law_' + c]).short + '.'; else if (n.auth < Pl.lawCost(n, c)) why = 'Needs ' + Pl.lawCost(n, c) + ' authority.'; }
        let t = '<h5>' + esc(o.name) + '</h5>' + esc(o.desc);
        const fx = lawFx(c, o); if (fx.length) t += '<hr>' + fx.join('<br>');
        if (o.sup && Object.keys(o.sup).length) t += '<hr>' + Object.keys(o.sup).map((f) => esc(ID.factionName(n, f)) + ' ' + UI.sg(o.sup[f])).join(' &nbsp; ');
        if (!cur && !incompatible) {
          t += '<hr>Cost: ' + Pl.lawCost(n, c) + ' authority.';
          if ((I.control.type === 'parliament' || I.control.type === 'assembly') && !n.emergency) { const v = Pl.vote(G, n, 'law', { cat: c, opt: k }); t += ' Vote forecast: <b class="' + (v.pass ? 'good' : 'bad') + '">' + Math.round(v.yes) + '%</b>.'; }
        }
        if (why) t += '<hr><span class="bad">' + esc(why) + '</span>';
        oh += '<button class="opt' + (cur ? ' cur' : why ? ' no' : '') + '"' + (cur ? '' : ' data-act="law" data-a=\'' + JSON.stringify([c, k]) + "'" + (why ? ' data-off="' + esc(why) + '"' : '')) + tip(t) + '><b>' + esc(o.name) + '</b><small>' + (cur ? 'in force' : incompatible ? 'incompatible' : why ? 'unavailable' : Pl.lawCost(n, c) + ' authority') + '</small></button>';
      }
      h += sec(name, '<p class="dim" style="font-size:13.5px;margin:-4px 0 6px">' + esc(desc) + '</p><div class="opts">' + oh + '</div>');
    }
    return h;
  };

  /* ================================================================ WAR */
  Pn.mil = function (G, n) {
    const I = ID.ideo(n), r = ID.RECRUIT[n.laws.recruit], d = I.doctrine, Dp = ID.Diplomacy; let h = '';
    const mx = ID.maxMob(n);
    h += '<div class="gauges"><div class="gauge"' + tip('Your uncommitted pool. It defends every border at once: the denser it is over your territory, the more each tile costs an attacker.') + '><i>Troop pool</i><b>' + ID.fmtPop(n.troops) + '</b>' + bar(n.troops, Math.max(1, n.pop * n.mob), 's') + '</div>' +
      '<div class="gauge"' + tip('<h5>Attack ×' + (n.a.atk || 1).toFixed(2) + '</h5><div class="kv"><span>' + esc(r.name) + '</span><b>×' + r.atk + '</b><span>Doctrine</span><b>×' + d.atk + '</b><span>Morale</span><b>×' + (n.a.morale || 1).toFixed(2) + '</b><span>Equipment</span><b>×' + n.equip.toFixed(2) + '</b><span>Technology</span><b>×' + (1 + 0.07 * n.tech.mil).toFixed(2) + '</b></div><hr>Morale follows ' + (d.morale === 'legit' ? 'legitimacy' : d.morale === 'charisma' ? 'the Leader’s authority' : d.morale === 'gold' ? 'whether the troops are paid' : 'the support of the ' + esc(ID.factionName(n, d.morale)).toLowerCase()) + ' and falls with war weariness.') + '><i>Attack</i><b>×' + (n.a.atk || 1).toFixed(2) + '</b></div>' +
      '<div class="gauge"' + tip('<h5>Defence ×' + (n.a.def || 1).toFixed(2) + '</h5>On your own core provinces this is multiplied again by <b>×' + d.home + '</b>.') + '><i>Defence</i><b>×' + (n.a.def || 1).toFixed(2) + '</b></div></div>';
    h += sec('Mobilisation', '<div class="sl"><span' + tip('<h5>Mobilisation</h5>The share of the population the pool refills toward. ' + esc(r.name) + ' allows up to ' + (mx * 100).toFixed(1) + '%.<hr>Every soldier is a worker missing from farm and factory: above about 6% output starts to fall. Peasants resent anything over 8%.') + '>Under arms</span><input type="range" min="5" max="' + Math.round(mx * 1000) + '" step="1" value="' + Math.round(n.mob * 1000) + '" data-in="mob" data-fmt="mob"><b data-val>' + (n.mob * 100).toFixed(1) + '%</b></div>' +
      kv([['Recruitment', esc(r.name), esc(r.desc)], ['Equipment', '<span class="' + (n.equip < 0.85 ? 'bad' : n.equip > 1.1 ? 'good' : '') + '">' + Math.round(n.equip * 100) + '%</span>', 'Follows the arms budget relative to the size of the army.'], ['War weariness', '<span class="' + (n.we > 50 ? 'bad' : n.we > 25 ? 'warn' : '') + '">' + Math.round(n.we) + '</span>', 'Rises with casualties and every month at war. Cuts morale, stability and the patience of workers and peasants.'], ['Losses so far', ID.fmtPop(n.losses)], ['Largest single offensive', Math.round((n.emergency ? 1 : I.control.cap) * 100) + '% of the pool', I.control.cap < 1 ? esc(I.name) + ' cannot concentrate its forces: the militias answer to their assemblies.' : 'No limit.']]));

    let wh = '';
    for (const e of Dp.enemies(G, n)) {
      const w = Dp.warOf(G, n.id, e.id), s = Dp.warScore(G, n, e), ev = Dp.evalProposal(G, n, e, 'peace');
      wh += '<div class="card"><div class="row nw">' + R.swatch(e) + '<b style="flex:1">' + esc(e.name) + '</b><span class="dim num">' + yrs(Math.round((G.tick - w.start) / 30)) + '</span></div><div class="row nw" style="margin:5px 0"' + tip('War score: tiles taken against tiles lost, relative to the smaller state. Past ±12% the peace names a victor.') + '><span style="font-size:13.5px">losing</span>' + bar(s + 1, 2, s > 0.05 ? 'g' : s < -0.05 ? 'r' : '', 1) + '<span style="font-size:13.5px">winning</span></div><div class="row">' + btn('Show', 'goto', e.capital, { cls: 'sm ghost' }) + btn('Offer peace', 'propose', [e.id, 'peace'], { cls: 'sm ghost', off: ev.ok ? '' : ev.why, tip: 'Each side keeps what it holds.' }) + '<span class="dim" style="font-size:13.5px">' + ID.fmtPop(e.troops) + ' troops · ' + Dp.CB_NAMES[w.cb] + '</span></div></div>';
    }
    h += sec('Wars', wh || '<p class="dim">At peace. To start a war, select a state on the map.</p>');

    const mine = G.attacks.filter((a) => a.from === n.id);
    if (mine.length) h += sec('Offensives', '<table class="t"><tr><th>Against</th><th>Style</th><th class="n">Troops left</th><th class="n">Tiles</th><th></th></tr>' + mine.map((a) => '<tr><td>' + esc(G.nations[a.to].base) + '</td><td>' + ID.STYLES[a.style].name + '</td><td class="n">' + ID.fmtPop(a.troops) + '</td><td class="n">' + a.taken + '</td><td>' + btn('Recall', 'recall', a.id, { cls: 'sm ghost' }) + '</td></tr>').join('') + '</table>');

    h += sec('Doctrine', '<table class="t"><tr><th>Style</th><th class="n">Yours</th><th>Use</th></tr>' + Object.keys(ID.STYLES).map((k) => { const S = ID.STYLES[k], e = d.styles[k] || 0, ok = ID.Combat.styleOk(n, k); return '<tr' + tip('<h5>' + S.name + '</h5>' + esc(S.desc)) + '><td>' + S.name + '</td><td class="n ' + (e > 1.05 ? 'good' : e < 0.85 ? 'bad' : '') + '">' + (ok ? '×' + e.toFixed(2) : '—') + '</td><td class="dim" style="font-size:13.5px">' + ({ advance: 'general purpose', assault: 'when you outnumber them', blitz: 'open country, costs gold', infiltrate: 'rough terrain, forts', siege: 'fortress lines, costs gold' }[k]) + '</td></tr>'; }).join('') + '</table><p class="dim" style="font-size:13.5px;margin-top:6px">Home ground ×' + d.home + ' in defence' + (r.abroad ? ' · ×' + r.abroad + ' attack outside your own provinces' : '') + (r.roughBonus ? ' · ×' + r.roughBonus + ' in forest, hills and mountains' : '') + '</p>');

    if (n.nb[B.SILO] || n.tech.mil >= 4) {
      let sh = kv([['Silos', n.nb[B.SILO] + ''], ['Missiles ready', n.missiles + ''], ['Atomic warheads', n.nukes + ''], ['Range', ID.Combat.missileRange(G) + ' tiles']]);
      for (const id of ['build_missile', 'build_nuke']) { const dd = ID.Events.decision(id); if (!dd.show || dd.show(n, G)) sh += decisionCard(G, n, dd); }
      if (!n.nb[B.SILO]) sh += '<div class="note">Build a missile silo on your own land first.</div>'; else sh += '<p class="dim" style="font-size:13.5px">To fire, select an enemy tile on the map during a war.</p>';
      h += sec('Strategic weapons', sh);
    }
    return h;
  };

  /* ================================================================ FOREIGN */
  function nationDetail(G, me, t) {
    const I = ID.ideo(t), Dp = ID.Diplomacy, d = ID.dipOf(G, me.id, t.id); let h = '';
    h += '<div class="row" style="margin-bottom:8px">' + btn('← All states', 'fnation', 0, { cls: 'sm ghost' }) + btn('Show on map', 'goto', t.capital, { cls: 'sm ghost' }) + '</div>';
    h += '<div class="card sh"><div class="row nw">' + R.swatch(t) + '<b style="font:800 23px/1.05 var(--cond);flex:1">' + esc(t.name) + '</b></div><div style="margin:5px 0">' + UI.ideoTag(t.ideo) + ' <button class="b sm ghost" data-act="help" data-a=\'"i:' + t.ideo + '"\'>About this system</button></div><p class="lead" style="margin:0">' + esc(I.short) + '</p></div>';
    const op = ID.op(G, t.id, me.id), aff = ID.ideoAffinity(me.ideo, t.ideo);
    h += sec('Report', kv([
      ['Their opinion of you', '<span class="' + (op > 15 ? 'good' : op < -15 ? 'bad' : '') + '">' + Math.round(op) + '</span>', '<div class="kv"><span>Your two systems</span><b>' + UI.sg(aff) + '</b>' + (ID.areRivals(me.ideo, t.ideo) ? '<span class="bad">Sectarian rivals</span><b></b>' : '') + '<span>Your threat</span><b>' + UI.sg(-me.threat * (ID.borders(G, me.id, t.id) ? 0.55 : 0.3)) + '</b>' + (d.trade ? '<span>Trade treaty</span><b class="good">+9</b>' : '') + (ID.sameBloc(G, me.id, t.id) ? '<span>Same bloc</span><b class="good">+38</b>' : '') + '</div><hr><span class="dim">Opinion drifts slowly toward the sum of these; insults and favours fade.</span>'],
      ['Power rank', '#' + ID.rankOf(G, t, 'power') + ' of ' + G.stats.count], ['Troops', ID.fmtPop(t.troops)], ['People', ID.fmtPop(t.pop)], ['Industry', Math.round(t.ind) + ' (#' + ID.rankOf(G, t, 'ind') + ')'],
      ['Stability', '<span class="' + (t.stab < 35 ? 'bad' : '') + '">' + Math.round(clamp(t.stab, 0, 100)) + '</span>'], ['Technology', 'ind ' + t.tech.ind + ' · mil ' + t.tech.mil + ' · agr ' + t.tech.agr],
      ['Bloc', t.bloc ? esc(G.blocs[t.bloc].name) : '<span class="dim">none</span>'], ['Threat', Math.round(t.threat) + '', 'How dangerous the world thinks this state is. High threat draws coalitions.'],
      ['At war with', Dp.enemies(G, t).map((e) => esc(e.base)).join(', ') || '<span class="dim">no one</span>'],
    ]));
    let a = '';
    if (d.war) {
      const ev = Dp.evalProposal(G, me, t, 'peace');
      a += btn('Offer peace', 'propose', [t.id, 'peace'], { off: ev.ok ? '' : ev.why, tip: 'Each side keeps what it holds, with a five-year truce.' });
    } else {
      a += btn('Declare war', 'declare', t.id, { cls: 'red', off: Dp.warBlock(G, me, t), tip: UI.warTip(G, me, t) });
      const pr = (kind, label, t2) => { const ev = Dp.evalProposal(G, me, t, kind); return btn(label, 'propose', [t.id, kind], { cls: 'ghost', off: ev.ok ? '' : ev.why, tip: t2 + (ev.ok ? '<hr><span class="good">They would accept.</span>' : '') }); };
      a += d.trade ? btn('Cancel trade treaty', 'propose', [t.id, 'cancel_trade'], { cls: 'ghost' }) : pr('trade', 'Propose trade treaty', '<h5>Trade treaty</h5>Income for both sides every month, more with ports and a shared border. Improves relations.');
      a += d.nap ? btn('Denounce the pact', 'propose', [t.id, 'cancel_nap'], { cls: 'ghost', tip: 'End the non-aggression pact openly. Costs some trust, far less than breaking it by attack.' }) : pr('nap', 'Propose non-aggression pact', '<h5>Non-aggression pact</h5>Neither side attacks the other. Declaring war through a pact costs you the trust of every state.');
      if (ID.sameBloc(G, me.id, t.id)) a += btn('Leave the bloc', 'leaveBloc', null, { cls: 'ghost', tip: 'Walk out of the ' + esc(G.blocs[me.bloc].name) + '. Every member will remember.' });
      else a += pr('ally', t.bloc ? 'Ask to join the ' + esc(G.blocs[t.bloc].name) : me.bloc ? 'Invite into your bloc' : 'Propose an alliance', '<h5>Alliance</h5>Members of a bloc are called into each other’s defensive wars and cannot fight one another.');
      if (!d.embargo) a += btn('Embargo', 'propose', [t.id, 'embargo'], { cls: 'ghost', tip: 'Cut off trade. Relations fall by 15.' });
    }
    h += sec('Diplomacy', '<div class="col">' + a + '</div>');
    let o = '';
    const funding = me.ops.findIndex((x) => x.type === 'fund' && x.target === t.id);
    const fc = Dp.opCost(G, me, 'fund'), cc = Dp.opCost(G, me, 'coup');
    o += funding >= 0 ? btn('Stop funding the movement', 'stopOp', funding, { cls: 'ghost' }) : btn('Fund a movement <span>' + fc + ' gold / month</span>', 'op', [t.id, 'fund'], { cls: 'ghost', off: me.ops.length >= 3 ? 'Three operations at most.' : '', tip: '<h5>Fund a movement</h5>Each month your money builds a movement for <b>' + esc(ID.ideo(me).name) + '</b> in three of their provinces. When it is strong and their stability is low, it rises; if it wins, the revolution counts as yours.<hr>Works better against a free press, worse against political police. It may be traced to you.' });
    o += btn('Back a coup <span>' + cc + ' gold</span>', 'op', [t.id, 'coup'], { cls: 'ghost', off: ID.ideo(t).flags.noCoup ? 'There is no officer corps there to suborn.' : me.gold < cc ? 'Needs ' + cc + ' gold.' : (me.cd['coup_' + t.id] || 0) > G.tick ? 'Your contacts are lying low until ' + ID.dateOf(me.cd['coup_' + t.id]).short + '.' : '', tip: '<h5>Back a coup</h5>Pay officers to move. If they succeed the new regime ' + (ID.ideo(me).control.type === 'assembly' ? 'will be a junta — but one that owes you.' : 'takes your system.') + ' If it fails or is exposed, relations collapse.<hr>Their army’s loyalty: about <b>' + Math.round(t.fs.military / 10) * 10 + '</b>. The lower, the better your odds.' });
    if (ID.ideo(me).flags.generalStrike) o += btn('Call a general strike <span>60 gold, 20 authority</span>', 'op', [t.id, 'strike'], { cls: 'ghost', tip: '<h5>General strike abroad</h5>Your federation calls their workers out. Industry stops for five months and stability falls. If their workers’ support is under 32 the strike is total and counts toward One Big Union.<hr>Their workers’ support: about <b>' + Math.round(t.fs.workers / 10) * 10 + '</b>.' });
    if ((t.civil && G.nations[t.civil].alive) || (t.civilOf && G.nations[t.civilOf].alive)) o += btn('Send arms and volunteers <span>40 gold, 5% of troops</span>', 'aid', t.id, { cls: 'ghost', tip: 'Help this side of the civil war. The other side will not forget.' });
    h += sec('Covert', '<div class="col">' + o + '</div>');
    return h;
  }
  Pn.for = function (G, n) {
    if (UI.focusNation && G.nations[UI.focusNation] && G.nations[UI.focusNation].alive && UI.focusNation !== n.id) return nationDetail(G, n, G.nations[UI.focusNation]);
    UI.focusNation = 0; let h = '';
    const ns = ID.alive(G).filter((o) => o !== n);
    const key = (o) => (ID.atWar(G, n.id, o.id) ? 0 : ID.borders(G, n.id, o.id) ? 1 : 2) * 1000 - (o.a.power || 0) / 1e6;
    ns.sort((a, b) => key(a) - key(b));
    h += '<p class="lead">Select a state for treaties, war and covert operations. States at war with you come first, then neighbours.</p><table class="t"><tr><th>State</th><th>System</th><th class="n"' + tip('Their opinion of you.') + '>Opinion</th><th>Status</th></tr>';
    for (const o of ns) {
      const d = ID.dipOf(G, n.id, o.id), op = ID.op(G, o.id, n.id);
      const st = d.war ? '<span class="bad">war</span>' : [ID.sameBloc(G, n.id, o.id) ? 'ally' : '', d.nap ? 'pact' : '', d.trade ? 'trade' : '', d.truce > G.tick ? 'truce' : ''].filter(Boolean).join(', ') || (ID.borders(G, n.id, o.id) ? '<span class="dim">neighbour</span>' : '');
      h += '<tr class="click" data-act="fnation" data-a="' + o.id + '"><td>' + R.swatch(o) + esc(o.base) + '</td><td>' + UI.ideoTag(o.ideo) + '</td><td class="n ' + (op > 15 ? 'good' : op < -15 ? 'bad' : '') + '">' + Math.round(op) + '</td><td>' + st + '</td></tr>';
    }
    h += '</table>';
    let bh = '';
    for (const bl of G.blocs) { if (!bl || !bl.members.length) continue; bh += '<div class="card"><b>' + esc(bl.name) + '</b>' + (n.bloc === bl.id ? ' <span class="tag" style="background:var(--olive)">yours</span>' : '') + '<br><span style="font-size:14px">' + bl.members.map((m) => (m === bl.leader ? '<b>' : '') + esc(G.nations[m].base) + (m === bl.leader ? '</b>' : '')).join(', ') + '</span></div>'; }
    h += sec('Blocs', bh || '<p class="dim">No blocs have formed yet.</p>', 'leaders in bold');
    if (n.ops.length) h += sec('Your operations', n.ops.map((o, k) => '<div class="row nw" style="margin-bottom:5px"><span style="flex:1">Funding a movement in <b>' + esc(G.nations[o.target].base) + '</b> · ' + o.cost + '/mo</span>' + btn('Stop', 'stopOp', k, { cls: 'sm ghost' }) + '</div>').join(''));
    h += sec('Your standing', kv([['Threat', '<span class="' + (n.threat > 50 ? 'bad' : n.threat > 25 ? 'warn' : '') + '">' + Math.round(n.threat) + '</span>', 'How dangerous the world thinks you are. Conquest, wars without cause, broken pacts and atomic weapons raise it; it fades slowly. Past about 55, coalitions form against you.'], ['Claims held', n.claims.length ? Math.round(ID.claimShare(G, n) * 100) + '% of ' + n.claims.length + ' provinces' : '<span class="dim">none</span>', 'Provinces your regime claims. Holding a claim on a neighbour justifies war.']]));
    return h;
  };

  /* ================================================================ WORLD */
  function partHtml(x) {
    const pc = x[3] === '%', xx = x[3] === 'x';
    const cur = pc ? Math.round(x[1] * 100) + '%' : xx ? x[1].toFixed(2) + '×' : x[2] === 1 ? (x[1] >= 1 ? 'yes' : 'no') : Math.round(x[1]) + '';
    const goal = pc ? Math.round(x[2] * 100) + '%' : xx ? x[2] + '×' : x[2] === 1 ? '' : ' / ' + x[2];
    return '<div class="part"><span>' + esc(x[0]) + '</span>' + bar(x[1], x[2], x[1] >= x[2] ? 'g' : 'o') + '<b class="' + (x[1] >= x[2] ? 'good' : '') + '">' + cur + (pc || xx ? ' <span class="dim">/ ' + goal + '</span>' : goal) + '</b></div>';
  }
  Pn.world = function (G, n) {
    let h = '';
    const pr = ID.Victory.progress(G, n);
    h += sec('Roads to victory', pr.slice().reverse().map((v) => '<div class="vic' + (v.grand ? ' grand' : '') + '"><h4>' + esc(v.name) + (v.grand ? ' <span class="tag" style="background:var(--red)">grand objective</span>' : '') + '<small>' + Math.round(v.p * 100) + '%</small></h4><p>' + esc(v.desc) + '</p>' + v.parts.map(partHtml).join('') + '</div>').join('') + '<p class="dim" style="font-size:13.5px">If no one has won by 1 Jan ' + ID.END_YEAR + ', history ranks the survivors. You are <b>#' + ID.rankOf(G, n, 'score') + '</b> of ' + G.stats.count + ' today.</p>');
    // ideology distribution
    const by = Object.keys(G.stats.byIdeo).map((k) => [k, G.stats.byIdeo[k]]).sort((a, b) => b[1].pop - a[1].pop);
    h += sec('The world’s systems', '<div class="stack">' + by.map((x) => '<i style="width:' + ((x[1].pop / G.stats.pop) * 100).toFixed(1) + '%;background:' + ID.IDEOLOGIES[x[0]].css + '"' + tip('<b>' + ID.IDEOLOGIES[x[0]].name + '</b><br>' + x[1].n + ' state' + (x[1].n > 1 ? 's' : '') + ', ' + Math.round((x[1].pop / G.stats.pop) * 100) + '% of humanity') + '></i>').join('') + '</div><div class="legend">' + by.map((x) => '<span><span class="sw" style="background:' + ID.IDEOLOGIES[x[0]].css + '"></span>' + ID.IDEOLOGIES[x[0]].name + ' <b>' + Math.round((x[1].pop / G.stats.pop) * 100) + '%</b></span>').join('') + '</div>', 'by population');
    const top = ID.alive(G).sort((a, b) => (b.a.power || 0) - (a.a.power || 0)).slice(0, 8);
    h += sec('Great powers', '<table class="t"><tr><th>State</th><th>System</th><th class="n">Land</th><th class="n">Industry</th><th class="n">Troops</th></tr>' + top.map((o) => '<tr class="click" data-act="' + (o === n ? 'goto' : 'focus') + '" data-a="' + (o === n ? o.capital : o.id) + '"><td>' + R.swatch(o) + (o === n ? '<b>' : '') + esc(o.base) + (o === n ? '</b>' : '') + '</td><td>' + UI.ideoTag(o.ideo) + '</td><td class="n">' + Math.round((o.tiles / G.landCount) * 100) + '%</td><td class="n">' + Math.round(o.ind) + '</td><td class="n">' + ID.fmtPop(o.troops) + '</td></tr>').join('') + '</table>');
    h += sec('The age', kv([['Era', ID.ERAS[ID.eraOf(G.tick)].name, esc(ID.ERAS[ID.eraOf(G.tick)].desc)], ['States', G.stats.count + ''], ['History', G.historical ? 'historical storyline' : 'free', G.historical ? 'Scripted events of the century arrive on their dates; other countries follow their historical programmes.' : 'Nothing is scripted.'], ['World tension', Math.round(G.world.tension) + ''], ['World economy', G.world.depression > 0 ? '<span class="bad">the Great Slump</span>' : G.world.depressionDone ? 'recovered' : 'calm']]));
    h += sec('Chronicle', '<div class="chron">' + G.chronicle.slice(-40).reverse().map((c) => '<div><span>' + ID.dateOf(c.t).short + '</span><span>' + esc(c.text) + '</span></div>').join('') + '</div>');
    return h;
  };

  /* ================================================================ HANDBOOK */
  const HELP_NAV = [['play', 'How to play'], ['ideos', 'Ideologies'], ['factions', 'Factions'], ['legit', 'Legitimacy'], ['doc', 'Doctrines'], ['war', 'War'], ['build', 'Land and buildings'], ['prog', 'Programmes and history']];
  Pn.helpIdeo = function (id, G) {
    const I = ID.IDEOLOGIES[id], M = ID.ECON[I.econ.model], C = ID.CONTROL[I.control.type]; let h = '';
    h += '<div class="card sh" style="border-left:12px solid ' + I.css + '"><b style="font:800 26px/1.05 var(--cond)">' + esc(I.name) + '</b><div class="dim" style="font-size:14px">' + ID.FAMILIES[I.family].name + ' family</div><p class="lead" style="margin:6px 0 0">' + esc(I.short) + '</p></div>';
    h += sec('The theory', '<p class="lead">' + esc(I.theory) + '</p>');
    h += sec('Strengths', '<ul class="plus">' + I.perks.map((p) => '<li>' + esc(p) + '</li>').join('') + '</ul>');
    h += sec('Failure modes', '<ul class="minus">' + I.flaws.map((p) => '<li>' + esc(p) + '</li>').join('') + '</ul>');
    h += sec('Economy: ' + M.name, '<p class="lead">' + esc(M.how) + '</p><p class="lead"><b>Levers:</b> ' + esc(M.levers) + '<br><b>How it fails:</b> ' + esc(M.fail) + '</p>');
    h += sec('Control: ' + C.name, '<p class="lead">' + esc(C.desc) + '</p>' + kv([['Decision body', esc(I.control.body)], ['Authority per month', I.control.auth + ' (base)'], ['Wars need a vote', I.control.warVote ? 'yes' : 'no'], ['Largest single offensive', Math.round(I.control.cap * 100) + '% of the pool'], ['Elections', I.elections ? 'every ' + I.elections + ' years' : 'none']]));
    h += sec('Army', kv([['Recruitment allowed', I.recruit.allowed.map((r) => ID.RECRUIT[r].name).join(', ')], ['Morale follows', I.doctrine.morale === 'legit' ? 'legitimacy' : I.doctrine.morale === 'charisma' ? 'the Leader' : I.doctrine.morale === 'gold' ? 'pay' : ID.FACTIONS[I.doctrine.morale].name.toLowerCase()], ['Home defence', '×' + I.doctrine.home]]) + '<table class="t" style="margin-top:6px"><tr>' + Object.keys(ID.STYLES).map((k) => '<th>' + ID.STYLES[k].name + '</th>').join('') + '</tr><tr>' + Object.keys(ID.STYLES).map((k) => { const e = I.doctrine.styles[k] || 0; return '<td class="' + (e > 1.05 ? 'good' : e < 0.85 ? 'bad' : '') + '">×' + e.toFixed(2) + '</td>'; }).join('') + '</tr></table>');
    h += sec('Legitimacy', Object.keys(I.legit).sort((a, b) => I.legit[b] - I.legit[a]).map((k) => '<div class="part"' + tip(esc(ID.LEGIT[k].desc)) + '><span>' + ID.LEGIT[k].name + '</span>' + bar(I.legit[k], 0.7, '') + '<b>' + Math.round(I.legit[k] * 100) + '%</b></div>').join(''));
    h += sec('Who is with you', '<table class="t"><tr><th>Faction</th><th class="n">Attitude</th><th class="n">Power</th></tr>' + ID.FACTION_IDS.map((f) => '<tr><td>' + ID.FACTIONS[f].glyph + ' ' + esc((I.fnames && I.fnames[f]) || ID.FACTIONS[f].name) + (I.ruling.indexOf(f) >= 0 ? ' <span class="tag lt">ruling</span>' : '') + '</td><td class="n">' + UI.sg(I.fbase[f] || 0) + '</td><td class="n">×' + (I.fpow[f] != null ? I.fpow[f] : 1) + '</td></tr>').join('') + '</table>');
    h += sec('Laws open to it', kv(['press', 'security', 'land', 'labor', 'religion', 'trade'].map((c) => [ID.LAWS[c].name, I.laws[c].map((o) => ID.LAWS[c].opts[o].name).join(', ')])));
    h += sec('Where it drifts', I.drift.map((d) => '<div class="card"><b>' + esc(d.label) + '</b> → ' + UI.ideoTag(d.to) + '<p style="font-size:14px;color:var(--ink2);margin-top:3px">' + esc(d.why) + '</p></div>').join(''));
    h += sec('Grand objective: ' + esc(I.objective.name), '<p class="lead">' + esc(I.objective.desc) + '</p>');
    h += sec('Abroad', kv([['Exports its system', I.dip.export >= 0.7 ? 'aggressively' : I.dip.export >= 0.4 ? 'actively' : I.dip.export >= 0.2 ? 'somewhat' : 'hardly'], ['Sectarian rivals', I.rivals.map((r) => ID.IDEOLOGIES[r].name).join(', ') || 'none'], ['Justifications for war', I.dip.cb.map((c) => ID.Diplomacy.CB_NAMES[c]).join(', ') || 'only the universal ones']]));
    return h;
  };
  Pn.help = function (G, n) {
    const pg = UI.helpPage || 'play';
    let h = '<div class="row" style="margin-bottom:12px">' + HELP_NAV.map((x) => btn(x[1], 'help', x[0], { cls: 'sm ' + (pg === x[0] || (x[0] === 'ideos' && pg.indexOf('i:') === 0) ? 'on' : 'ghost') })).join('') + '</div>';
    if (pg.indexOf('i:') === 0) return h + '<div class="row" style="margin-bottom:8px">' + btn('← All ideologies', 'help', 'ideos', { cls: 'sm ghost' }) + '</div>' + Pn.helpIdeo(pg.slice(2), G);
    if (pg === 'ideos') {
      h += '<p class="lead">Twenty-two systems in six families. Each changes the rules: who sets the budget, how the army is raised, who can bring you down, and what winning means. None is the right answer.</p>';
      for (const fam in ID.FAMILIES) h += sec(ID.FAMILIES[fam].name, ID.IDEO_LIST.filter((i) => i.family === fam).map((i) => '<button class="nrow" data-act="help" data-a=\'"i:' + i.id + '"\'><span class="sw" style="background:' + i.css + ';margin:0"></span><b>' + esc(i.name) + '</b><span class="dim" style="font-size:13.5px">' + ID.ECON[i.econ.model].name.replace(' economy', '') + '</span><small>' + esc(i.short) + '</small></button>').join(''));
      return h;
    }
    if (pg === 'factions') {
      h += '<p class="lead">Seven social forces. Each has <b>power</b> (its share of political weight, from the country’s structure) and <b>support</b> (its attitude to your regime). Stability rests on support weighted by power: a hostile faction with no power is an annoyance, a hostile faction with a quarter of the power is the end of you.</p>';
      const PW = { workers: 'factories and cities', peasants: 'a rural economy', capital: 'private industry and trade', military: 'the size of the army, war, victorious generals', clergy: 'tradition', intelligentsia: 'cities and technology', bureaucracy: 'territory, a planned economy, bureaucratisation' };
      for (const f of ID.FACTION_IDS) h += '<div class="card"><b>' + ID.FACTIONS[f].glyph + ' ' + ID.FACTIONS[f].name + '</b><p style="font-size:14.5px;margin-top:3px">' + esc(ID.FACTIONS[f].desc) + '</p><p style="font-size:14px;color:var(--ink2)">Power from: ' + PW[f] + '.<br>When they turn: ' + esc(ID.FACTIONS[f].turn) + '</p></div>';
      h += '<div class="note">Hover any faction on the State panel to see exactly what is moving it. The Concede button buys support for gold and authority, once every eighteen months.</div>';
      return h;
    }
    if (pg === 'legit') {
      h += '<p class="lead">Every ideology justifies itself differently. Legitimacy is the weighted sum of its own sources; lose the one you lean on and stability follows.</p>';
      for (const k of ID.LEGIT_IDS) h += '<div class="card"><b>' + ID.LEGIT[k].name + '</b><p style="font-size:14.5px;margin-top:3px">' + esc(ID.LEGIT[k].desc) + '</p><p style="font-size:13.5px;color:var(--ink2)">Leaned on by: ' + (ID.IDEO_LIST.filter((i) => (i.legit[k] || 0) >= 0.2).map((i) => i.name).join(', ') || 'no one heavily') + '</p></div>';
      return h;
    }
    if (pg === 'war') {
      h += '<p class="lead">You do not move units. You have one pool of troops, a slider, and a front.</p><ul>' +
        '<li><b>The pool</b> refills toward your mobilisation level. Soldiers are taken from the workforce.</li>' +
        '<li><b>To attack</b>, be at war, select the enemy on the map, set the Commit slider, pick a style, press Attack. The committed troops leave the pool and eat into enemy land tile by tile.</li>' +
        '<li><b>Each tile costs more</b> where the defender’s pool is dense over its territory, on rough ground, across rivers, in cities and under a fortress.</li>' +
        '<li><b>What you commit cannot defend.</b> An empty pool makes every tile of yours cheap.</li>' +
        '<li><b>Objectives.</b> Select an enemy city or capital and press <i>Make this the objective</i>. The offensive bends into a spearhead toward it: 10% faster, a little costlier on its flanks, and good at cutting off pockets. When it falls the enemy loses troops, stability and heart, and your attack surges for three weeks.</li>' +
        '<li><b>Posture</b> (on the war bar): Offensive, Balanced, Dig in or Elastic defence. An elastic defence gives ground slowly and makes every enemy tile expensive. Changing posture costs twenty days of reorganisation.</li>' +
        '<li><b>Land doctrine</b>: the staff college in the general programme opens four rival schools (manoeuvre, firepower, defence in depth, the nation in arms). You can follow only one.</li>' +
        '<li><b>Encirclement:</b> land cut off from the capital with no port loses supply and surrenders after about forty days, taking its share of the pool with it.</li>' +
        '<li><b>Naval landings</b> need a port. Select an enemy coastal tile and choose Naval landing.</li>' +
        '<li><b>Capitals:</b> a state that loses its capital and two thirds of its land capitulates. You may annex it, install your system, or take an indemnity.</li>' +
        '<li><b>Conquered provinces resist</b> until integrated, and may break away or restore the old state.</li></ul>';
      h += sec('Attack styles', Object.keys(ID.STYLES).map((k) => '<div class="card"><b>' + ID.STYLES[k].name + '</b><p style="font-size:14.5px">' + esc(ID.STYLES[k].desc) + '</p></div>').join(''));
      h += sec('Recruitment', Object.keys(ID.RECRUIT).map((k) => '<div class="card"><b>' + ID.RECRUIT[k].name + '</b> <span class="dim" style="font-size:13.5px">up to ' + (ID.RECRUIT[k].maxMob * 100).toFixed(1) + '% · attack ×' + ID.RECRUIT[k].atk + ' · defence ×' + ID.RECRUIT[k].def + '</span><p style="font-size:14.5px">' + esc(ID.RECRUIT[k].desc) + '</p></div>').join(''));
      return h;
    }
    if (pg === 'prog') return h + Pn.helpProg(G);
    if (pg === 'doc') return h + (Pn.helpDoc ? Pn.helpDoc(G, n) : '');
    if (pg === 'build') {
      h += sec('Terrain', '<table class="t"><tr><th>Terrain</th><th class="n">Front speed</th><th class="n">Attacker’s cost</th><th class="n">People</th><th class="n">Food</th></tr>' + ID.TERRAIN.slice(1).map((t) => '<tr><td><span class="sw" style="background:rgb(' + t.col.join(',') + ')"></span>' + t.name + '</td><td class="n">÷' + t.cost + '</td><td class="n">×' + t.def + '</td><td class="n">' + t.pop + '</td><td class="n">' + t.food + '</td></tr>').join('') + '</table>');
      h += sec('Buildings', [1, 2, 3, 4, 5].map((t) => '<div class="card"><b>' + ID.BUILDINGS[t].name + '</b> <span class="dim" style="font-size:13.5px">' + ID.BUILDINGS[t].cost + ' gold and up · upkeep ' + ID.BUILDINGS[t].upkeep + '</span><p style="font-size:14.5px">' + esc(ID.BUILDINGS[t].desc) + '</p></div>').join('') + '<div class="note">Each building of a kind costs 14% more than the last. To build, select a tile of your own land.</div>');
      return h;
    }
    h += '<p class="lead">You run a state. What it can do follows from what it believes.</p>' +
      sec('The loop', '<ul><li>Time runs in days. <b>Space</b> pauses; <b>1–5</b> set the speed.</li><li>Each month the economy pays out, factions shift, provinces stir, and the world acts.</li><li>Crises and history stop the clock and ask for a decision. Ordinary dispatches wait at the left of the map while time runs; leave one for three months and your ministers settle it.</li><li>Alerts at the lower right tell you what needs attention; click one to go there.</li><li>When things go wrong, open the <b>Report</b> (R). Your ministers name each problem, its cause, and the levers that answer it, one click away.</li><li>When the state falls you are told why. That is the game teaching you.</li></ul>') +
      sec('Controls', kv([['Pan', 'drag, arrow keys or WASD'], ['Zoom', 'scroll, pinch, + and −'], ['Select', 'click a tile'], ['Pause / speed', 'Space / 1–5'], ['Attack selected enemy', 'Enter'], ['Panels', 'R report · G state · E economy · L laws · M war · F foreign · O world · H handbook'], ['Map modes', 'Z political · X ideology · C opposition · V unrest · B supply · N terrain'], ['Close / menu', 'Esc']]) + '<p class="dim" style="font-size:13.5px;margin-top:6px">Nothing in the game needs a right-click.</p>') +
      sec('What to watch', '<ul><li><b>Stability</b> is legitimacy plus the support of whoever holds power. Under 38, movements can rise.</li><li><b>Factions</b>: hover each to see what moves it.</li><li><b>Drift</b>: every regime slides toward something else. Remove the causes, or embrace the change on your terms.</li><li><b>Censorship</b> hides bad news from the public and true numbers from you.</li><li><b>Threat</b>: conquest alarms the world. Coalitions form against the leader.</li></ul>') +
      sec('Your system', n ? '<button class="nrow on" data-act="help" data-a=\'"i:' + n.ideo + '"\'><span class="sw" style="background:' + ID.ideo(n).css + ';margin:0"></span><b>' + esc(ID.ideo(n).name) + '</b><span></span><small>' + esc(ID.ideo(n).short) + '</small></button>' : '');
    return h;
  };
})();
