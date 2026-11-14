/* IRON DIALECTIC — fortune: the tone of every dispatch, and the good news that balances the bad.
   tone 'bad' is a problem arriving, 'good' a windfall or a triumph, 'mixed' a dilemma. The draw in
   sim/events.js (Ev.month) leans toward good news after bad and keeps problems apart.
   Loads after data/events.js. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const E = ID.EVENT_DEFS, ev = (o) => E.push(Object.assign({ tone: 'good', sfx: 'good' }, o));
  const I = (n) => ID.ideo(n);
  const fam = (n, ...f) => f.indexOf(I(n).family) >= 0;
  const is = (n, ...ids) => ids.indexOf(n.ideo) >= 0;
  const model = (n, ...m) => m.indexOf(I(n).econ.model) >= 0;
  const priv = (n) => model(n, 'market', 'mixed', 'pact', 'trade');
  const PERM = 600;
  const friendOf = (G, n) => { let best = null, bv = 20; for (const k in G.border[n.id] || {}) { const o = G.nations[+k]; if (o && o.alive && !ID.atWar(G, n.id, o.id) && ID.op(G, o.id, n.id) > bv) { bv = ID.op(G, o.id, n.id); best = o; } } return best; };
  const comrade = (G, n) => { for (const o of G.nations) if (o && o.alive && o !== n && ID.sameBloc(G, n.id, o.id) && I(o).family === I(n).family && o.ind > n.ind * 0.6) return o; return null; };

  /* ---------------------------------------------------------------- tones of the existing dispatches */
  const TONE = {
    bad: ['bread_riots', 'officers_petition', 'ambitious_general', 'student_protests', 'brain_drain', 'capital_flight', 'peasant_petition', 'corruption_scandal', 'bureaucrats_fiefs',
      'veterans_march', 'organs_overreach', 'assassination', 'harvest_failure', 'bank_run', 'inflation_spiral', 'planners_error', 'shortages', 'oil_shock', 'tax_revolt', 'mine_disaster',
      'pandemic', 'mutiny', 'peace_movement', 'border_incident', 'arms_race', 'partisan_reprisals', 'leader_illness', 'no_confidence', 'network_fault'],
    good: ['bumper_harvest', 'ore_discovery', 'railway_boom', 'electrification', 'green_revolution', 'worlds_fair', 'victory_parade', 'royal_wedding', 'miracle', 'foreign_delegates', 'expert_report'],
    mixed: ['succession', 'drift', 'proposal', 'ally_attacked', 'capitulation'],
  };
  for (const t in TONE) for (const id of TONE[t]) { const d = E.find((x) => x.id === id); if (d) d.tone = t; }
  // the busiest problems of the one-party states come round less often
  const damp = { student_protests: 0.6, dissident_novel: 0.7, organs_overreach: 0.7, bureaucrats_fiefs: 0.7, planners_error: 0.7, shortages: 0.8, border_incident: 0.7 };
  for (const id in damp) { const d = E.find((x) => x.id === id); if (d && d.w) { const w0 = d.w, k = damp[id]; d.w = (n, G, c) => (w0(n, G, c) || 0) * (fam(n, 'socialist', 'authoritarian') ? k : 1); } }

  /* ---------------------------------------------------------------- good fortune, for everyone */
  ev({ id: 'record_year', title: 'A record year', cd: 72,
    text: 'Every furnace lit, every order filled, every ledger in black ink. The statisticians have checked the figures twice and do not quite believe them.',
    w: (n) => (!n.depression && n.stab > 45 && n.net > 0 ? 1.4 : 0),
    opts: [
      { label: 'Bank the surplus', fx: [['gold', 120]] },
      { label: 'A bonus in every pay packet', fx: [['sup', 'workers', 6], ['mod', 'ls', 2, 12, 'The record year']] },
      { label: 'Reinvest every penny', fx: [['mod', 'prod', 0.04, 24, 'Reinvestment'], ['sup', 'capital', 3]] },
    ] });
  ev({ id: 'national_hero', title: 'A hero of the skies', era: 1, cd: 160,
    text: 'An {A} pilot has flown the ocean alone in a plane made of spruce and canvas. Half the country is at the airfield to meet him; the other half is listening on the radio.',
    w: () => 0.9,
    opts: [
      { label: 'A parade down the avenue', fx: [['glory', 6], ['legitmod', 3, 12, 'The aviator']] },
      { label: 'An air academy in his name', fx: [['mod', 'atk', 0.03, 60, 'Air academy'], ['sup', 'military', 4]] },
      { label: 'Send him round the world', fx: [['opAll', 5]] },
    ] });
  ev({ id: 'inventor', title: 'The inventor', cd: 120,
    text: 'A schoolteacher from the provinces has built, in a shed, a machine the Academy said could not be built. It works. He would like a patent and a bigger shed.',
    w: (n) => 0.8 + (n.budget && n.budget.science > 0.1 ? 0.8 : 0),
    opts: [
      { label: 'A state laboratory for him', fx: [['tech', 220], ['sup', 'intelligentsia', 4]] },
      { label: 'Sell the licence abroad', fx: [['gold', 110]] },
      { label: 'Show it to the general staff', fx: [['mod', 'atk', 0.04, 36, 'The new device'], ['sup', 'military', 3]] },
    ] });
  ev({ id: 'emigrants_return', title: 'Coming home', cd: 150,
    text: 'The ships that once left full now come back full: the sons and grandsons of the emigrants, with trades, savings and opinions.',
    w: (n) => (n.stab > 52 && !n.famine ? 0.9 : 0),
    opts: [
      { label: 'Open the cities to them', fx: [['pop', 0.012], ['sup', 'workers', 3], ['sup', 'intelligentsia', 3]] },
      { label: 'Give them land in the east', fx: [['pop', 0.015], ['gold', -40], ['sup', 'peasants', 3]] },
    ] });
  ev({ id: 'friendly_note', title: 'A friendly note', cd: 96,
    text: (n, G) => { const f = friendOf(G, n); return 'The ambassador of ' + (f ? f.name : 'a neighbour') + ' calls in person, with flowers for the minister’s wife and a draft treaty in his pocket.'; },
    w: (n, G) => (friendOf(G, n) ? 1 : 0),
    opts: [
      { label: 'Sign the commercial treaty', fx: [['fn', (G, n) => { const f = friendOf(G, n); if (f) { ID.addOp(G, f.id, n.id, 10); ID.addOp(G, n.id, f.id, 10); } }], ['note', 'Opinion with them +10'], ['mod', 'trade', 0.06, 36, 'Commercial treaty']] },
      { label: 'Thank him warmly', fx: [['fn', (G, n) => { const f = friendOf(G, n); if (f) ID.addOp(G, f.id, n.id, 5); }], ['note', 'Their opinion of you +5']] },
    ] });
  ev({ id: 'sporting_triumph', title: 'Gold at the games', era: 1, cd: 96,
    text: 'The {A} team has won the final in extra time. Strangers are embracing in the streets and nobody has gone back to work.',
    w: () => 0.8,
    opts: [
      { label: 'A national holiday', fx: [['legitmod', 3, 12, 'The games'], ['particip', 4], ['mod', 'prod', -0.02, 1, 'Holiday']] },
      { label: 'A stadium in every town', fx: [['gold', -60], ['sup', 'workers', 5], ['mod', 'ls', 1, 36, 'Stadiums']] },
    ] });
  ev({ id: 'mild_winter', title: 'A mild winter', cd: 72,
    text: 'No snow on the passes, no ice in the ports, no coal queues. The almanacs are being reprinted.',
    w: (n) => (n.foodBal < 1.2 ? 1 : 0.5),
    opts: [
      { label: 'Let the people enjoy it', fx: [['mod', 'ls', 2, 6, 'Mild winter'], ['sup', 'peasants', 3]] },
      { label: 'Keep the works running all season', fx: [['mod', 'prod', 0.05, 6, 'Mild winter']] },
    ] });

  /* ---------------------------------------------------------------- good fortune, by system */
  ev({ id: 'plan_ahead', title: 'Ahead of the plan', cd: 60,
    text: 'The steel trusts report the year’s quota met in October. The coal trusts say they will do it by September next year, if anyone will bet against them.',
    w: (n) => (I(n).flags.fiveYear && n.plan && n.ind > n.plan.base * 1.04 ? 3 : 0),
    opts: [
      { label: 'Raise the targets', fx: [['mod', 'prod', 0.05, 24, 'Raised targets'], ['sup', 'workers', -3], ['discipline', 4]] },
      { label: 'Bonuses for the brigades', fx: [['sup', 'workers', 7], ['mod', 'ls', 2, 12, 'Plan bonuses']] },
      { label: 'Announce it in every square', fx: [['fervor', 6], ['legitmod', 4, 18, 'Ahead of the plan']] },
    ] });
  ev({ id: 'plan_fulfilled', sys: 1, tone: 'good', sfx: 'good', title: 'The plan is fulfilled',
    text: (n) => 'The Five-Year Plan closes at ' + Math.round((n.a.planRatio || 1) * 100) + '% of its industrial target. The red banners are already on the factory gates; the planning commission asks what comes next.',
    opts: [
      { label: 'A bolder plan', fx: [['mod', 'prod', 0.05, 60, 'The bolder plan'], ['discipline', 6]] },
      { label: 'Now for the consumer', fx: [['mod', 'ls', 3, 36, 'Consumer goods'], ['sup', 'workers', 6], ['sup', 'peasants', 4]] },
      { label: 'Honour the planners', fx: [['sup', 'bureaucracy', 6], ['sup', 'intelligentsia', 4], ['legitmod', 4, 24, 'Plan honoured']] },
    ] });
  ev({ id: 'hero_of_labour', title: 'A hero of labour', cd: 96,
    text: 'A hewer in the eastern pits has cut fourteen times his norm in a single shift. His photograph is on the front page; his foreman is on the telephone, asking what to do with him.',
    w: (n) => (fam(n, 'socialist') || model(n, 'plan', 'cyber') ? 2 : 0),
    opts: [
      { label: 'A movement in his name', fx: [['mod', 'prod', 0.05, 36, 'The movement'], ['sup', 'workers', -3], ['glory', 3]] },
      { label: 'A medal and a new flat', fx: [['sup', 'workers', 5], ['fervor', 3]] },
      { label: 'Let him rest', fx: [['particip', 3]] },
    ] });
  ev({ id: 'metro_opens', title: 'The underground palace', once: 1, era: 1,
    text: 'The first line of the capital’s metro opens today: marble from the mountains, chandeliers from the old palaces, a mosaic of the workers of every trade, and trains every ninety seconds.',
    w: (n) => (fam(n, 'socialist') || model(n, 'plan', 'cyber') ? 1.6 : 0),
    opts: [
      { label: 'Open it with a festival', fx: [['legitmod', 5, 36, 'The metro'], ['sup', 'workers', 6], ['fervor', 4]] },
      { label: 'Carry the workers, not the speeches', fx: [['mod', 'prod', 0.03, PERM, 'The metro']] },
    ] });
  ev({ id: 'last_illiterate', title: 'The last illiterate', once: 1, era: 1,
    text: 'The census commission reports that the last district without a school has one. A grandmother of eighty-one has signed her name on the register, slowly, in front of the cameras.',
    w: (n) => (fam(n, 'socialist', 'anarchist') ? 1.4 : 0),
    opts: [
      { label: 'A day of celebration', fx: [['fervor', 6], ['sup', 'intelligentsia', 5], ['sup', 'peasants', 4]] },
      { label: 'Universities next', fx: [['mod', 'sci', 0.08, 120, 'Universities for all']] },
    ] });
  ev({ id: 'virgin_lands', title: 'The virgin lands', once: 1, era: 2,
    text: 'Three hundred thousand young volunteers have answered the call to plough the eastern steppe. They have tractors, tents and a great deal of enthusiasm.',
    w: (n) => (model(n, 'plan', 'cyber') ? 1.6 : 0),
    opts: [
      { label: 'Send them east', fx: [['mod', 'food', 0.12, 120, 'The virgin lands'], ['fervor', 4], ['sup', 'workers', -2]] },
      { label: 'Keep them in the factories', fx: [['mod', 'prod', 0.03, 36, 'Volunteer brigades']] },
    ] });
  ev({ id: 'fraternal_aid', title: 'Fraternal aid', cd: 120,
    text: (n, G) => { const c = comrade(G, n); return (c ? c.name : 'Our allies') + ' sends a train of machine tools and rifles, with a letter about the solidarity of peoples and an invoice it says we need not pay.'; },
    w: (n, G) => (comrade(G, n) ? 1.2 : 0),
    opts: [
      { label: 'Accept with thanks', fx: [['gold', 90], ['equip', 0.03], ['fn', (G, n) => { const c = comrade(G, n); if (c) ID.addOp(G, c.id, n.id, 6); }], ['note', 'Their opinion of you +6']] },
      { label: 'Ask for more', fx: [['gold', 160], ['equip', 0.04], ['fn', (G, n) => { const c = comrade(G, n); if (c) ID.addOp(G, c.id, n.id, -8); }], ['note', 'Their opinion of you −8']] },
    ] });
  ev({ id: 'jubilee', title: 'The jubilee', cd: 300,
    text: '{L} has reigned for a generation. The bells will ring in every parish, and the old soldiers will march once more past the balcony.',
    w: (n) => (is(n, 'absmon', 'conmon', 'theocracy') && n.age > 240 ? 1.5 : 0),
    opts: [
      { label: 'Bells and bonfires', fx: [['tradition', 8], ['sup', 'peasants', 4], ['gold', -50]] },
      { label: 'A jubilee amnesty', fx: [['grievance', -10], ['sup', 'intelligentsia', 4], ['tradition', 3]] },
    ] });
  ev({ id: 'foreign_capital', title: 'Foreign capital knocks', cd: 96,
    text: 'A consortium from across the sea would like to build a steelworks on the coast. They have the money, the engineers and a list of conditions.',
    w: (n) => (priv(n) && n.stab > 48 ? 1.3 : 0),
    opts: [
      { label: 'Welcome them', fx: [['gold', 120], ['mod', 'prod', 0.03, 36, 'Foreign works'], ['sup', 'capital', 5], ['sup', 'workers', -2]] },
      { label: 'Only with partners at home', fx: [['gold', 60], ['sup', 'capital', 3]] },
      { label: 'We build our own', fx: [['sup', 'workers', 3]] },
    ] });
  ev({ id: 'free_festival', title: 'The festival of the free', cd: 96,
    text: 'Every commune has sent a cart, a band and a banner. Nobody organised it, and it is the best-organised thing anyone has seen.',
    w: (n) => (fam(n, 'anarchist') || is(n, 'council') ? 1.8 : 0),
    opts: [
      { label: 'Join the dancing', fx: [['fervor', 6], ['particip', 6]] },
      { label: 'Hold the congress there', fx: [['particip', 4], ['sup', 'workers', 4], ['sup', 'peasants', 4]] },
    ] });
})();
