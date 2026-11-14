/* IRON DIALECTIC — the ministers' report. Reads the state of the country, names what is going wrong
   and why, ranks it, and offers the levers that address each cause, one click away.
   Panel: Report (R). The rail pip lights when something is urgent. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const UI = ID.UI, esc = ID.esc, Pn = ID.Panels;
  const A = (ID.Advice = {});
  const tip = (h) => UI.tip(h);

  const dec = (G, n, id) => {
    const d = ID.Events.decision(id); if (!d) return null;
    if (d.ideos && d.ideos.indexOf(n.ideo) < 0) return null;
    if (d.show && !d.show(n, G)) return null;
    return { label: d.name, act: 'decide', arg: id, off: ID.Events.decisionBlock(G, n, d), tip: '<h5>' + esc(d.name) + '</h5>' + esc(d.desc) + '<hr>' + UI.fxHtml(typeof d.fx === 'function' ? [] : d.fx, n).replace(/<\/span>/g, '</span> ') };
  };
  const measure = (G, n, id) => {
    const f = ID.Focus.def(id); if (!f) return null;
    const why = ID.Focus.block(G, n, f);
    if (why && /^Only/.test(why)) return null; // not this kind of trouble
    const cur = ID.Focus.current(n);
    return { label: f.name, act: 'startFocus', arg: id, cls: 'em', off: why, tip: '<h5>Emergency measure: ' + esc(f.name) + '</h5>' + esc(f.desc) + '<hr>' + f.days + ' days. ' + UI.fxHtml(f.fx, n).replace(/<\/span>/g, '</span> ') + (cur && !cur.crisis ? '<hr>' + esc(ID.Focus.nm(cur, n)) + ' is shelved, progress kept, until it is done.' : '') };
  };
  const go = (label, tab) => ({ label, act: 'tab', arg: tab, cls: 'ghost' });
  const pct = (v) => Math.round(v * 100) + '%';

  /* Where a faction's grievance points: the panel that holds its lever. */
  function lever(label) {
    if (/^Living standards|^Tax rate|^Rent|budget/.test(label)) return ['eco', 'Economy'];
    if (/^Sons under arms|^War weariness/.test(label)) return ['mil', 'War'];
    if (/^Famine/.test(label)) return ['eco', 'Economy'];
    for (const c of ID.LAW_CATS) if (label.indexOf(ID.LAWS[c].name + ':') === 0) return ['law', 'Laws'];
    if (label.indexOf(':') > 0 || /Recruit|Conscript|Volunteer|Levy|Militia/.test(label)) return ['law', 'Laws'];
    return null;
  }

  const SRC_HELP = {
    mandate: ['the electoral mandate is spent', ['call_election'], 'Win the next election, or call one while you are ahead.'],
    fervor: ['revolutionary fervour has gone cold', ['propaganda_drive', 'party_purge', 'cultural_revolution'], 'Victories, purges and campaigns rekindle it; bureaucracy smothers it.'],
    tradition: ['tradition has worn thin', ['royal_progress', 'harvest_festival', 'missionaries'], 'Ceremony, the church and the old families restore it.'],
    prosperity: ['the people are not prospering', [], 'Raise living standards: more welfare spending, lower taxes, food in the shops.'],
    victory: ['there have been no victories', [], 'Win a war, even a small one, against someone you can beat.'],
    discipline: ['party discipline is slack', ['party_purge'], 'A purge, or a stronger bureaucracy, tightens it.'],
    particip: ['nobody takes part any more', ['open_ledger', 'end_emergency', 'recall_delegates'], 'Lift emergency rule, open the books, let the councils meet.'],
    divine: ['the faith does not bless this regime', ['missionaries', 'holy_war'], 'The clergy’s favour and a state church supply it.'],
    order: ['the streets are not quiet', ['martial_law', 'amnesty'], 'Bring unrest down, by force or by concession.'],
    competence: ['the government looks incompetent', [], 'Grow the economy and avoid crises: each one costs you here.'],
    charisma: ['the Leader has lost his shine', ['cult_campaign', 'propaganda_drive', 'plebiscite'], 'A cult campaign, a victory, a free hand for the propaganda ministry.'],
  };

  A.list = function (G, n) {
    const out = [], I = ID.ideo(n);
    const add = (sev, title, text, acts) => out.push({ sev, title, text, acts: (acts || []).filter(Boolean).slice(0, 4) });
    const fuzzy = UI.fuzzy(n);

    /* civil war */
    for (const o of G.nations) if (o && o.alive && o !== n && (o.civilOf === n.id || n.civilOf === o.id)) {
      const mine = n.troops, theirs = o.troops;
      add(96, 'Civil war with ' + esc(o.name), 'They hold ' + pct(o.tiles / Math.max(1, o.tiles + n.tiles)) + ' of the contested country and ' + ID.fmtPop(theirs) + ' troops against your ' + ID.fmtPop(mine) + '. ' + (mine > theirs * 1.2 ? 'You have the numbers: press the attack on their heartland.' : 'They can match you. Raise every man you can, then strike where their front is thin.'),
        [{ label: 'Show them', act: 'goto', arg: o.capital, cls: 'ghost' }, measure(G, n, 'c_pardon'), measure(G, n, 'c_land'), measure(G, n, 'c_rally'), measure(G, n, 'c_lastditch'), dec(G, n, 'hire_mercs')]);
    }

    /* invasion */
    if (n.nwars) {
      let inc = 0; for (const a of G.attacks) if (a.to === n.id) inc += a.troops;
      if (inc > n.troops * 0.35) add(78, 'The front is giving way', ID.fmtPop(inc) + ' enemy troops are attacking, against ' + ID.fmtPop(n.troops) + ' of yours. Counter-attack where they are thin, or make peace before the line breaks.', [go('War', 'mil'), go('Foreign', 'for'), measure(G, n, 'c_rally')]);
    }

    /* stability */
    if (n.stab < 42) {
      const sec = ID.LAWS.security.opts[n.laws.security];
      const drags = [
        ['legitimacy is weak (' + Math.round(n.legit) + ')', Math.max(0, 60 - n.legit) * 0.42, 'legit'],
        ['the factions are turning on you', Math.max(0, 60 - (n.a.ws || 50)) * 0.42, 'fac'],
        ['unrest is spreading through the provinces (' + Math.round(n.a.unrest || 0) + ')', (n.a.unrest || 0) * 0.22, 'unrest'],
        ['the country is weary of war (' + Math.round(n.we) + ')', n.we * 0.18, 'we'],
        ['the new regime has not settled', n.trans > 0 ? 10 : 0, 'trans'],
        ['famine is emptying the villages', n.famine ? 6 : 0, 'food'],
        ['your security laws breed resentment', Math.max(0, sec.unrest * 0.5), 'sec'],
      ].sort((a, b) => b[1] - a[1]);
      const d = drags[0], d2 = drags[1][1] > 3 ? drags[1] : null;
      const tgt = n.a.stabTgt != null ? n.a.stabTgt : n.stab;
      const acts = [measure(G, n, 'c_unity')];
      if (d[2] === 'legit') acts.push(measure(G, n, 'c_confidence'));
      if (d[2] === 'fac') acts.push(measure(G, n, 'c_reconcile'));
      if (d[2] === 'unrest') acts.push(measure(G, n, 'c_order'), measure(G, n, 'c_listen'));
      if (d[2] === 'we') acts.push(measure(G, n, 'c_homefront'), go('Seek peace', 'for'));
      if (d[2] === 'food') acts.push(measure(G, n, 'c_grain'));
      if (d[2] === 'sec') acts.push(go('Laws', 'law'));
      add(n.stab < 25 ? 92 : 66, 'Stability ' + Math.round(n.stab) + (tgt < n.stab - 1 ? ', still falling toward ' + Math.round(tgt) : tgt > n.stab + 1 ? ', recovering toward ' + Math.round(tgt) : ''),
        'The biggest drag is that ' + d[0] + (d2 ? '; after that, ' + d2[0] : '') + '. ' + (n.stab < 25 ? 'Below 20, revolts and coups come quickly.' : 'Fix the cause and stability follows within months.'), acts);
    }

    /* hostile factions */
    const dem = n.a.dem || ID.Politics.demands(G, n);
    const angry = ID.FACTION_IDS.filter((f) => UI.seen(n, f) < 32 && n.fp[f] > 9).sort((a, b) => n.fp[b] - n.fp[a]).slice(0, 2);
    for (const f of angry) {
      const sup = UI.seen(n, f), why = (dem[f] || []).filter((x) => x[1] < -1.5).sort((a, b) => a[1] - b[1]).slice(0, 2);
      const acts = [dec(G, n, 'conc_' + f)];
      for (const w of why) { const l = lever(w[0]); if (l && !acts.some((a) => a && a.arg === l[0])) acts.push(go(l[1], l[0])); }
      acts.push(measure(G, n, 'c_reconcile'));
      add(sup < 20 && n.fp[f] > 15 ? 76 : 56, esc(ID.factionName(n, f)) + ' are ' + (sup < 20 ? 'hostile' : 'angry') + (fuzzy ? '' : ' (' + Math.round(sup) + ')'),
        'They hold ' + Math.round(n.fp[f]) + '% of the power in the country. ' + (why.length ? 'What angers them most: ' + why.map((w) => esc(w[0]) + ' <b class="bad">' + UI.sg(w[1]) + '</b>').join(', ') + '.' : 'Nothing in particular: they want a different regime.') + ' ' + esc(ID.FACTIONS[f].turn), acts);
    }

    /* legitimacy */
    if (n.legit < 45) {
      let worst = null, wv = -1;
      for (const k in I.legit) { const v = I.legit[k] * (100 - n.src[k]); if (v > wv) { wv = v; worst = k; } }
      const S = SRC_HELP[worst] || ['', [], ''];
      const acts = [measure(G, n, 'c_confidence')];
      for (const id of S[1]) acts.push(dec(G, n, id));
      if (worst === 'prosperity' || worst === 'competence') acts.push(go('Economy', 'eco'));
      if (worst === 'victory') acts.push(go('War', 'mil'));
      if (worst === 'divine') acts.push(go('Laws', 'law'));
      add(n.legit < 30 ? 70 : 48, 'Legitimacy ' + Math.round(n.legit),
        'Your weakest pillar: ' + S[0] + ' (' + ID.LEGIT[worst].name + ' ' + Math.round(n.src[worst]) + ', carrying ' + Math.round(I.legit[worst] * 100) + '% of your legitimacy). ' + S[2], acts);
    }

    /* drift */
    for (const d of I.drift) {
      const v = n.drift[d.to] || 0; if (v < 62) continue;
      const rate = (n.a.driftRate && n.a.driftRate[d.to]) || 0;
      const months = rate > 0.05 ? Math.ceil((100 - v) / rate) : null;
      add(v >= 85 ? 86 : 60, esc(d.label) + ' (' + Math.round(v) + ')',
        'The regime is sliding toward ' + esc(ID.IDEOLOGIES[d.to].name) + (months ? ', with about ' + months + ' months to go' : '') + '. ' + esc(d.why) + ' At 100 it happens whether you lead it or not.',
        [{ label: 'Embrace it', act: 'embrace', arg: d.to, cls: 'ghost', off: ID.Events.embraceBlock(G, n, d.to), tip: 'Become ' + esc(ID.IDEOLOGIES[d.to].name) + ' on your own terms. 50 authority; an 18-month transition follows.' }, measure(G, n, 'c_hold'), go('See the causes', 'gov')]);
    }

    /* coups */
    const det = ID.LAWS.security.opts[n.laws.security].detect;
    if ((det > 0 && n.coupRisk > 0.006) || (n.prestige > 60 && n.legit < 45 && !I.flags.noCoup)) {
      add(n.coupRisk > 0.02 ? 82 : 52, 'The officers are plotting', 'A disloyal army and a shaky regime is how coups begin. ' + (n.prestige > 50 ? 'A popular general makes it worse (prestige ' + Math.round(n.prestige) + ').' : 'Military support is ' + Math.round(UI.seen(n, 'military')) + '.'),
        [measure(G, n, 'c_loyalty'), dec(G, n, 'conc_military'), dec(G, n, 'purge_officers')]);
    }

    /* elections */
    if (I.elections && n.electionAt && !n.emergency && n.electionAt - G.tick < 400) {
      const f = ID.Politics.electionForecast(G, n);
      if (f < 0.52) {
        const big = ID.FACTION_IDS.slice().sort((a, b) => n.fp[b] - n.fp[a])[0];
        add(n.electionAt - G.tick < 200 ? 80 : 58, 'You are losing the election', 'Forecast ' + Math.round(f * 100) + '% for the government, polling day ' + ID.dateOf(n.electionAt).short + '. Lose and the opposition takes over peacefully. The biggest bloc of voters is the ' + esc(ID.factionName(n, big)) + '; raise living standards and win them back.',
          [dec(G, n, 'conc_' + big), dec(G, n, 'propaganda_drive'), go('Economy', 'eco'), dec(G, n, 'declare_emergency')]);
      }
    }

    /* food */
    if (n.famine) add(88, 'Famine', 'Food covers ' + pct(n.foodBal) + ' of need. People are starving: population, support and stability all fall until it ends.', [measure(G, n, 'c_requisition'), measure(G, n, 'c_grain'), go('Economy', 'eco')]);
    else if (n.foodBal < 0.97) add(54, 'Food is short', 'The harvest covers ' + pct(n.foodBal) + ' of need. Move workers to the land or buy grain before it becomes famine.', [measure(G, n, 'c_grain'), measure(G, n, 'c_requisition'), go('Economy', 'eco')]);

    /* money */
    const cap = ID.Economy.debtCap(n);
    if (n.debt > cap * 0.75) add(72, 'Debt near its limit', 'You owe ' + Math.round(n.debt) + ' against a limit of ' + Math.round(cap) + '. At the limit the creditors stop lending and the slump follows.', [measure(G, n, 'c_budget'), go('Economy', 'eco')]);
    else if (n.net < 0 && n.gold < 80) add(60, 'The treasury is running dry', 'Spending exceeds revenue by ' + Math.round(-n.net) + ' a month and ' + Math.round(n.gold) + ' gold is left. Raise taxes, cut the budget, or find money in a hurry.', [measure(G, n, 'c_budget'), dec(G, n, 'print_money'), dec(G, n, 'war_loan'), go('Economy', 'eco')]);
    if (n.inflation > 40) add(n.inflation > 60 ? 62 : 44, 'Inflation ' + Math.round(n.inflation), 'Prices are running away. It erodes living standards and business confidence every month.', [measure(G, n, 'c_currency'), go('Economy', 'eco')]);

    /* war weariness */
    if (n.nwars && n.we > 40) {
      const D = ID.Diplomacy; let best = null;
      for (const o of G.nations) if (o && o.alive && ID.atWar(G, n.id, o.id)) { const ev = D.evalProposal(G, n, o, 'peace'); if (!best || (ev.ok && !best.ev.ok)) best = { o, ev }; }
      add(n.we > 60 ? 72 : 50, 'The country is tired of war', 'War weariness ' + Math.round(n.we) + '. Workers and soldiers alike want it over.' + (best && best.ev.ok ? ' ' + esc(best.o.base) + ' would accept peace on the present lines.' : ''),
        [best ? { label: 'Offer peace to ' + best.o.base, act: 'propose', arg: [best.o.id, 'peace'], off: best.ev.ok ? '' : best.ev.why } : null, measure(G, n, 'c_homefront')]);
    }

    /* unrest */
    if ((n.a.unrest || 0) > 25 && !(n.stab < 42 && out.some((x) => /Stability/.test(x.title)))) add((n.a.unrest || 0) > 40 ? 70 : 45, 'Unrest ' + Math.round(n.a.unrest), 'Restless provinces pay less, recruit less and rise when they can. See the Unrest map (V).', [measure(G, n, 'c_order'), measure(G, n, 'c_listen'), dec(G, n, 'amnesty')]);

    if (n.strike > 0) add(55, 'Strike', 'Industry is down 30% while it lasts.', [dec(G, n, 'conc_workers')]);
    if (n.load > 1) add(58, 'The planning network is overloaded', 'Plans outrun the means to compute them; efficiency suffers.', [dec(G, n, 'expand_network'), go('Economy', 'eco')]);

    /* the quieter matters */
    if (!(n.path && n.path.cur) && ID.Focus.available(G, n).length) add(40, 'No programme under way', 'Every month without one is wasted.', [{ label: 'Open the tree', act: 'tree', arg: 'nat' }, go('Programme', 'prog')]);
    if (n.auth >= 96) add(28, 'Authority is at its ceiling', 'Anything more is lost. Spend it on a law or a decision.', [go('Laws', 'law'), go('State', 'gov')]);

    return out.sort((a, b) => b.sev - a.sev);
  };

  /* What is going well: a reason to keep going. */
  function strengths(G, n) {
    const I = ID.ideo(n), out = [];
    let best = null, bv = 0; for (const k in I.legit) { const v = I.legit[k] * n.src[k]; if (n.src[k] >= 60 && v > bv) { bv = v; best = k; } }
    if (best) out.push(ID.LEGIT[best].name + ' stands at ' + Math.round(n.src[best]));
    const loyal = ID.FACTION_IDS.filter((f) => UI.seen(n, f) >= 62 && n.fp[f] > 10);
    if (loyal.length) out.push(loyal.map((f) => ID.factionName(n, f)).join(' and ') + ' are loyal');
    if (n.foodBal > 1.1) out.push('the granaries are full');
    if (n.net > 5) out.push('the treasury gains ' + Math.round(n.net) + ' a month');
    if (n.stab >= 60) out.push('the state is stable');
    return out.slice(0, 3);
  }

  A.urgent = (G, n) => A.list(G, n).filter((x) => x.sev >= 70).length;

  Pn.brief = function (G, n) {
    const L = A.list(G, n), top = L.length ? L[0].sev : 0;
    const verdict = top >= 85 ? ['In crisis', 'r'] : top >= 66 ? ['In trouble', 'o'] : top >= 45 ? ['Under strain', 's'] : ['Sound', 'g'];
    let h = '<div class="brief-hd ' + verdict[1] + '"><span>State of the nation</span><b>' + verdict[0] + '</b><small>' + ID.dateOf(G.tick).str + '</small></div>';
    if (!L.length) h += '<p class="lead">Nothing needs you. Push the programme on, build, and watch the neighbours.</p>';
    else h += '<p class="lead">Your ministers’ assessment, the most urgent first. Each matter names its cause and the levers that answer it.</p>';
    h += L.slice(0, 7).map((x) => '<div class="adv ' + (x.sev >= 80 ? 'r' : x.sev >= 60 ? 'o' : 's') + '"><h4>' + x.title + '</h4><p>' + x.text + '</p>' +
      (x.acts.length ? '<div class="row">' + x.acts.map((a) => UI.btn(esc(a.label), a.act, a.arg, { cls: 'sm ' + (a.cls === 'em' ? 'red' : a.cls || ''), off: a.off || '', tip: a.tip || '' })).join('') + '</div>' : '') + '</div>').join('');
    if (L.length > 7) h += '<p class="dim">' + (L.length - 7) + ' lesser matters wait behind these.</p>';
    const s = strengths(G, n);
    if (s.length) h += '<div class="adv g"><h4>In your favour</h4><p>' + esc(s.join('; ')) + '.</p></div>';
    return h;
  };
})();
