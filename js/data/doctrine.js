/* IRON DIALECTIC — doctrines: what makes each ideology play differently.
   Every ideology has
   - a signature gauge (n.sig, 0–100) with its own monthly dynamics (drift) and its own effects (fx),
     fed into the modifier channel ID.mod through n.sigm (sim/doctrine.js);
   - three to five unique actions that move the gauge and the country;
   - a passive war trait (dp: parameters read by sim/combat.js);
   - a unique war order (registered into ID.Combat.ABIL).
   Effect keys in fx(): the ID.mod channels (legit, stab, auth, prod, eff, food, atk, def, sci, unrest, ls,
   rev, trade, opp, conf, dist, vote, regen, growth) plus coup (risk multiplier), driftK (drift speed) and
   wePace (war-weariness growth). Points or fractions as the channel uses them; see DOC_FX in sim/doctrine.js. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const S = (n, f) => n.fs[f] || 0, Pw = (n, f) => n.fp[f] || 0;
  const b = (v) => (v ? 1 : 0);
  const losing = (n) => !!(n.nwars && n.a.losing);
  const lsUp = (n) => (n.ls || 0) - (n.lsPrev != null ? n.lsPrev : n.ls);
  const hostileNb = (G, n) => { const out = []; for (const k in G.border[n.id] || {}) { const o = G.nations[+k]; if (o && o.alive && ID.ideo(o).family !== ID.ideo(n).family && ID.op(G, n.id, o.id) < 10) out.push(o); } return out; };
  /* grow a movement for ideology `ideo` in some of t's provinces */
  const seed = (G, t, ideo, amt, count, sponsor) => {
    const mine = []; for (let p = 1; p < G.provinces.length; p++) if (G.provinces[p].owner === t.id) mine.push(G.provinces[p]);
    for (let c = 0; c < count && mine.length; c++) {
      const Pr = G.rng.pick(mine);
      if (Pr.opp !== ideo && (Pr.oppStr < 35 || G.rng.chance(0.3))) { Pr.opp = ideo; Pr.oppStr = Math.max(Pr.oppStr * 0.5, 6); }
      if (Pr.opp === ideo) { Pr.oppStr = clamp(Pr.oppStr + amt, 0, 100); Pr.unrest = clamp(Pr.unrest + amt * 0.4, 0, 100); if (sponsor) Pr.sponsor = sponsor; }
    }
  };
  ID.docSeed = seed;
  /* an emergency draft: a share of the population, but never past 130% of the mobilisation ceiling */
  const draft = (G, n, share, equipHit) => { const add = Math.max(0, Math.min(n.pop * share, n.pop * ID.maxMob(n) * 1.3 - n.troops)); n.troops += add; if (equipHit && add > 0) n.equip = Math.max(0.5, n.equip - equipHit); return add; };

  const D = (ID.DOCTRINE = {});

  /* ================================================================ SOCIALIST */
  D.ml = {
    name: 'The Party Line', gauge: 'Party unity', init: 62,
    desc: 'The Central Committee speaks with one voice, or with several. Unity makes orders cheap and the apparatus loyal; division breeds oppositions, platforms and, in the end, a new leader.',
    drift: (n) => 0.75 - (n.bureau - 40) * 0.02 - (n.grievance - 40) * 0.015 - (S(n, 'bureaucracy') < 45 ? 0.6 : 0) - (n.discipline < 40 ? 0.5 : 0) + (n.plan ? 0.2 : -0.3) - (losing(n) ? 0.8 : 0) - (n.sig > 80 ? 0.4 : 0),
    fx: (n, v) => ({ auth: (v - 50) * 0.012, legit: (v - 50) * 0.1, stab: (v - 50) * 0.06, dist: v > 78 ? 0.05 : 0, driftK: v < 35 ? (35 - v) * 0.02 : 0 }),
    low: 'Below 35 the party splits into platforms: every drift away from the line speeds up.',
    high: 'Above 78 nobody dares report bad news, and the plan’s figures drift from reality.',
    acts: [
      { id: 'ml_purge', name: 'Purge the apparatus', desc: 'Expel the factionalists, the careerists and the merely unlucky. Unity returns at once; so does fear.', cost: { auth: 20 }, cd: 36, sig: 22,
        fx: [['bureau', -12], ['discipline', 10], ['grievance', 10], ['sup', 'intelligentsia', -8], ['mod', 'atk', -0.06, 12, 'Officers purged']], ai: (n, v) => v < 38 && n.auth > 35 },
      { id: 'ml_selfcrit', name: 'Criticism and self-criticism', desc: 'Every cell meets, every secretary confesses a fault, and the worst of them are moved somewhere quieter.', cost: { auth: 8 }, cd: 18, sig: 8,
        fx: [['particip', 6], ['corr', -4], ['discipline', 4], ['sup', 'bureaucracy', -3]], ai: (n, v) => v < 60 },
      { id: 'ml_nomen', name: 'Promote the nomenklatura', desc: 'Flats, dachas and special shops for the cadres who keep the machine running.', cost: { gold: 60 }, cd: 24, sig: 6,
        fx: [['sup', 'bureaucracy', 10], ['corr', 5], ['bureau', 6], ['sup', 'workers', -3]], ai: (n) => S(n, 'bureaucracy') < 45 && n.gold > 150 },
    ],
    war: { name: 'Commissars', desc: 'A political officer beside every commander. Outnumbered troops hold their ground a quarter longer, morale never falls below a floor, and the home front tires more slowly.', dp: { holdFast: 0.25, moraleFloor: 0.92, wePace: 0.85 } },
    order: { key: 'deep_op', name: 'Deep operation', gold: 90, cd: 300, self: 1,
      desc: 'Every army group attacks at once, to the full depth of the enemy’s defences. For two months your fronts move a third faster, at a higher price in men.',
      run: (G, n) => { ID.addMod(n, 'speed', 0.35, 2, 'Deep operation'); ID.addMod(n, 'aloss', 0.15, 2, 'Deep operation'); return 'Every front attacks at once.'; },
      ai: (G, n) => !losing(n) && n.troops > n.pop * n.mob * 0.6 },
  };

  D.trot = {
    name: 'Permanent Revolution', gauge: 'Revolutionary momentum', init: 55,
    desc: 'The revolution survives only by spreading. Momentum rises with every rising sponsored abroad and every victory; it bleeds away while the revolution stands still, and a revolution that stands still is captured by its own bureaucrats.',
    drift: (n, G) => -0.6 + (n.ops ? n.ops.length * 0.6 : 0) + (n.nwars ? 0.7 : 0) + (n.a.spreadAt != null && G.tick - n.a.spreadAt < 360 ? 1.5 : 0) - (n.isolated ? 0.5 : 0) + (n.glory - 40) * 0.01,
    fx: (n, v) => ({ legit: (v - 50) * 0.12, atk: (v - 50) * 0.002, driftK: v < 30 ? 0.5 : 0, opp: v < 30 ? 0.08 : 0 }),
    low: 'Below 30 the revolution stagnates: drift toward a bureaucratic party or a single leader speeds up.',
    high: 'Above 70 the army fights for the world revolution, not for a border.',
    acts: [
      { id: 'tr_inter', name: 'Congress of the International', desc: 'Delegates from every underground party, a new manifesto, and money for the presses across every hostile border.', cost: { auth: 10, gold: 80 }, cd: 24, sig: 12,
        fx: [['fn', (G, n) => { for (const o of hostileNb(G, n)) seed(G, o, n.ideo, 8, 2, n.id); }], ['note', 'Your movement grows in every hostile neighbour'], ['opAll', -3]], ai: (n, v) => v < 62 && n.gold > 160 },
      { id: 'tr_volunteers', name: 'Volunteers for the revolution abroad', desc: 'Veterans of our own civil war cross the border to train someone else’s.', cost: { auth: 6 }, cd: 18, sig: 10,
        fx: [['troops', -0.03], ['fervor', 6], ['fn', (G, n) => { const c = hostileNb(G, n).sort((a, o) => a.stab - o.stab)[0]; if (c) seed(G, c, n.ideo, 20, 3, n.id); }], ['note', 'A strong movement in the shakiest hostile neighbour']], ai: (n, v) => v < 50 && !n.nwars },
      { id: 'tr_committees', name: 'Soldiers’ committees', desc: 'Every regiment elects a committee; every order is explained. The army becomes a political school, and a looser one.', cost: { auth: 10 }, cd: 36, sig: 6,
        fx: [['mod', 'atk', 0.05, 24, 'Soldiers’ committees'], ['discipline', -6], ['sup', 'military', -5], ['particip', 6]], ai: (n) => n.nwars > 0 && S(n, 'military') > 45 },
    ],
    war: { name: 'Revolutionary war', desc: 'Every province the Red Army takes is a leaflet. Advancing fronts raise the enemy’s own workers behind the lines, and the columns move a little faster.', dp: { liberate: 1, speed: 1.05 } },
    order: { key: 'rise_call', name: 'Call the workers to rise', gold: 70, cd: 150, r: 12, range: 30,
      desc: 'Agitators, money and rifles behind the enemy front. In every enemy province within reach your movement grows sharply, and the garrison has more to worry about than you.',
      run: (G, n, Dn, tile) => {
        const W = G.W, x0 = tile % W, y0 = (tile / W) | 0; let k = 0;
        for (let p = 1; p < G.provinces.length; p++) { const Pr = G.provinces[p]; if (Pr.owner !== Dn.id) continue; if ((Pr.cx - x0) * (Pr.cx - x0) + (Pr.cy - y0) * (Pr.cy - y0) > 30 * 30) continue; if (Pr.opp !== n.ideo) { Pr.opp = n.ideo; Pr.oppStr = Math.max(Pr.oppStr * 0.5, 10); } Pr.oppStr = clamp(Pr.oppStr + 25, 0, 100); Pr.unrest = clamp(Pr.unrest + 12, 0, 100); Pr.sponsor = n.id; k++; }
        Dn.stab -= 2; return k ? k + ' enemy provinces stir for the revolution.' : 'No enemy provinces within reach.';
      }, ai: (G, n) => true },
  };

  D.council = {
    name: 'All Power to the Councils', gauge: 'Council vitality', init: 65,
    desc: 'The councils are the state. When they meet, argue and decide, the republic is strong in a way no party can command; when meetings empty and committees decide “for the duration”, the councils become a façade and the party waits in the wings.',
    drift: (n) => (n.particip - 55) * 0.03 - (n.emergency ? 1.5 : 0) - (n.bureau - 30) * 0.02 - (n.nwars ? 0.3 : 0) + (n.ls - 50) * 0.01 - 1.0,
    fx: (n, v) => ({ prod: (v - 50) * 0.0016, def: (v - 50) * 0.003, stab: (v - 50) * 0.06, driftK: v < 35 ? 0.6 : 0 }),
    low: 'Below 35 the councils are a façade: the drift toward party rule speeds up.',
    high: 'High vitality makes every factory more productive and every street harder to take.',
    acts: [
      { id: 'co_congress', name: 'Convene the congress of councils', desc: 'Three thousand delegates, nine days of argument and a programme everyone helped write.', cost: { gold: 40, auth: 5 }, cd: 18, sig: 12, fx: [['particip', 8], ['bureau', -6]], ai: (n, v) => v < 60 && n.gold > 100 },
      { id: 'co_rotate', name: 'Rotate every office', desc: 'No delegate serves two terms; no committee keeps its members a year. Nobody becomes indispensable, and nobody becomes expert.', cost: { auth: 10 }, cd: 30, sig: 8, fx: [['bureau', -14], ['corr', -6], ['mod', 'eff', -0.03, 12, 'Rotation']], ai: (n) => n.bureau > 35 },
      { id: 'co_militia', name: 'Arm the factory militias', desc: 'Every works its rifle rack and its drill on Sundays.', cost: { gold: 60 }, cd: 36, sig: 4, fx: [['troops', 0.05], ['mod', 'def', 0.06, 24, 'Factory militias'], ['sup', 'military', -4]], ai: (n) => !!n.a.threatened && n.gold > 150 },
    ],
    war: { name: 'Elected officers', desc: 'Soldiers elect their officers and know what they defend. Home ground and the cities are held fiercely; long offensives cost more, because nobody orders a man to die for a hill.', dp: { homeDef: 1.12, cityDef: 1.15, aloss: 1.08 } },
    order: { key: 'council_levy', name: 'Levée of the councils', gold: 0, cd: 360, self: 1,
      desc: 'Every council sends its quota of volunteers within the week, armed from its own factory: troops equal to 2% of the population, at no cost in equipment. Only while the enemy is on your soil.',
      can: (G, n) => ((n.a.coreLost || 0) > 0.02 || n.a.defensive ? '' : 'Only while the enemy holds your land.'),
      run: (G, n) => { const a = draft(G, n, 0.02, 0); n.particip = Math.min(100, n.particip + 4); return ID.fmtPop(a) + ' volunteers join the council militias.'; },
      ai: (G, n) => losing(n) },
  };

  D.mao = {
    name: 'The Mass Line', gauge: 'Mass mobilisation', init: 50,
    desc: 'From the masses, to the masses. Campaigns raise the whole country to a pitch of effort; push it too high and the effort turns on itself, let it fall and the party loses the villages.',
    drift: (n) => -0.3 + (n.fervor - 50) * 0.02 + (n.nwars ? 0.6 : 0) - (n.sig > 80 ? 1.2 : 0),
    fx: (n, v) => ({ prod: v < 80 ? (v - 40) * 0.0015 : (80 - v) * 0.004 + 0.06, food: v > 75 ? -(v - 75) * 0.004 : 0, def: (v - 50) * 0.003, unrest: v > 80 ? (v - 80) * 0.3 : 0, stab: v < 30 ? -(30 - v) * 0.2 : 0 }),
    low: 'Below 30 the villages drift away from the party: stability suffers.',
    high: 'Above 80 the campaign devours itself: harvests fall, unrest rises, output stalls.',
    acts: [
      { id: 'mao_rect', name: 'Rectification campaign', desc: 'Study sessions, self-criticism and a list of rightists to be reformed through labour.', cost: { auth: 15 }, cd: 36, sig: 12, fx: [['discipline', 10], ['sup', 'intelligentsia', -6], ['grievance', 4]], ai: (n, v) => v < 45 && n.auth > 30 },
      { id: 'mao_campaign', name: 'Launch a great campaign', desc: 'Steel in every backyard, canals in every county, a target for every commune.', cost: { auth: 10 }, cd: 24, sig: 18, fx: [['mod', 'prod', 0.08, 12, 'The great campaign'], ['mod', 'food', -0.05, 12, 'Campaign labour']], ai: (n, v) => v < 55 && n.foodBal > 1.05 },
      { id: 'mao_rest', name: 'Rest and consolidate', desc: 'Let the communes catch their breath. Quotas are reviewed; some are even lowered.', cost: {}, cd: 24, sig: -15, fx: [['mod', 'eff', 0.04, 12, 'Consolidation'], ['fervor', -4], ['sup', 'peasants', 4]], ai: (n, v) => v > 78 },
    ],
    war: { name: 'People’s war', desc: 'The army moves among the people like a fish in the sea. Fighting in hills and forests costs a third fewer men, and enemies who occupy your land bleed for every month they stay.', dp: { roughLoss: 0.7, bleed: 2.5, homeDef: 1.1 } },
    order: { key: 'lure_deep', name: 'Lure them in deep', gold: 0, cd: 300, self: 1,
      desc: 'Trade space for time and let the enemy columns run until their supply lines snap. For two months enemy offensives against you advance faster and lose two fifths more men.',
      run: (G, n) => { ID.addMod(n, 'lure', 0.3, 2, 'Lure them in deep'); return 'The armies withdraw into the countryside. Let them come.'; },
      ai: (G, n) => losing(n) },
  };

  D.marketsoc = {
    name: 'The Socialist Market', gauge: 'Enterprise autonomy', init: 50,
    desc: 'How much the managers may decide for themselves: prices, wages, partners abroad. Autonomy means growth and a fuller treasury, and also wage gaps, black marketeers and a party that no longer knows what its factories do.',
    drift: (n) => -0.2 - (S(n, 'workers') < 40 ? 0.5 : 0) + (S(n, 'intelligentsia') > 55 ? 0.3 : 0) - (n.sig > 75 ? 0.3 : 0),
    fx: (n, v) => ({ prod: (v - 50) * 0.0016, rev: (v - 50) * 0.002, trade: (v - 50) * 0.003, unrest: (v - 50) * 0.05, driftK: v > 75 ? 0.4 : 0 }),
    low: 'Low autonomy: a slow economy, but an equal one.',
    high: 'Above 75 the market starts to rule the party: drift toward liberalism speeds up.',
    acts: [
      { id: 'ms_widen', name: 'Widen enterprise autonomy', desc: 'Managers may set prices, hire and fire, and keep part of the profit.', cost: { auth: 8 }, cd: 18, sig: 15, fx: [['sup', 'intelligentsia', 4], ['sup', 'workers', -4], ['corr', 3]], ai: (n, v) => v < 45 && S(n, 'workers') > 45 },
      { id: 'ms_rein', name: 'Rein in the managers', desc: 'Wage scales are capped, bonuses audited and three directors made examples of.', cost: { auth: 8 }, cd: 18, sig: -15, fx: [['sup', 'workers', 6], ['corr', -4]], ai: (n, v) => v > 70 || S(n, 'workers') < 35 },
      { id: 'ms_zone', name: 'Open a special economic zone', desc: 'One coastal province where foreign firms may build, hire and export on their own terms.', cost: { gold: 100 }, cd: 48, sig: 8, fx: [['mod', 'trade', 0.15, 60, 'Special economic zone'], ['mod', 'prod', 0.03, 60, 'Special economic zone'], ['sup', 'bureaucracy', -4]], ai: (n) => n.gold > 250 },
    ],
    war: { name: 'Dual-use industry', desc: 'Factories run by their own managers switch to war orders quickly. Equipment recovers 60% faster.', dp: { equipRegen: 1.6 } },
    order: { key: 'enterprise_mob', name: 'Mobilise the enterprises', gold: 60, cd: 300, self: 1,
      desc: 'Every enterprise turns its lines to munitions for a season. Equipment improves at once; civilian output suffers for three months.',
      run: (G, n) => { n.equip = Math.min(1.4, n.equip + 0.08); ID.addMod(n, 'prod', -0.06, 3, 'War orders'); return 'The enterprises switch to war orders.'; }, ai: (G, n) => n.equip < 0.95 },
  };

  D.demsoc = {
    name: 'The Peaceful Road', gauge: 'Popular momentum', init: 55,
    desc: 'Socialism by the ballot needs the street behind it. Momentum carries reforms past the courts, the owners and the generals; when it fades, every reform becomes a negotiation, and the generals start making telephone calls.',
    drift: (n) => (n.mandate - 50) * 0.02 + lsUp(n) * 0.2 - (n.inflation > 30 ? 0.6 : 0) - 0.6,
    fx: (n, v) => ({ legit: (v - 50) * 0.1, vote: (v - 50) * 0.0012, conf: -(v - 50) * 0.2, stab: (v - 50) * 0.04, coup: v < 35 ? (35 - v) * 0.03 : 0 }),
    low: 'Below 35 the owners and the officers smell weakness: coup risk rises sharply.',
    high: 'High momentum wins votes and frightens investors.',
    acts: [
      { id: 'ds_march', name: 'March for the programme', desc: 'A million people in the avenue, with banners from every union and every neighbourhood.', cost: { gold: 30 }, cd: 18, sig: 12, fx: [['particip', 6], ['sup', 'capital', -4]], ai: (n, v) => v < 45 },
      { id: 'ds_talks', name: 'Talks with the centre', desc: 'Sit down with the Christian democrats, the shopkeepers and the professional officers. Explain that the programme has room for them.', cost: { auth: 10 }, cd: 24, sig: -8, fx: [['sup', 'capital', 8], ['sup', 'clergy', 6], ['sup', 'military', 4]], ai: (n) => S(n, 'military') < 40 || S(n, 'capital') < 30 },
      { id: 'ds_particip', name: 'Workers’ participation', desc: 'Elected workers on the board of every nationalised firm.', cost: { auth: 10 }, cd: 36, sig: 8, fx: [['sup', 'workers', 6], ['mod', 'prod', 0.02, 36, 'Participation'], ['sup', 'capital', -6]], ai: (n) => S(n, 'workers') < 50 },
    ],
    war: { name: 'Citizens in arms', desc: 'Defending the republic unites it; conquering for it does not. War weariness grows a fifth slower, home defence is a little stronger, and offensives abroad cost a little more.', dp: { wePace: 0.8, homeDef: 1.08, aloss: 1.05 } },
    order: { key: 'cordons', name: 'The workers’ cordons', gold: 0, cd: 300, self: 1,
      desc: 'Factory districts become fortresses, manned by the people who work in them. For three months cities you hold are 40% harder to take.',
      run: (G, n) => { ID.addMod(n, 'cityDef', 0.4, 3, 'Workers’ cordons'); ID.Events.applyFx(G, n, [['sup', 'workers', 3], ['sup', 'capital', -4]]); return 'The cordons go up around every works.'; }, ai: (G, n) => losing(n) },
  };

  /* ================================================================ ANARCHIST */
  D.ansyn = {
    name: 'One Big Union', gauge: 'Solidarity', init: 60,
    desc: 'The union is the state and the strike is its weapon. Solidarity holds the federations together and makes the general strike something other governments fear; without it the federations fall to quarrelling and the bosses come back.',
    drift: (n) => (S(n, 'workers') - 55) * 0.03 + (n.particip - 50) * 0.01 - (n.emergency ? 1 : 0) - (n.bureau - 25) * 0.02 - 1.5,
    fx: (n, v) => ({ prod: (v - 50) * 0.0012, def: (v - 50) * 0.002, stab: (v - 50) * 0.05, opp: v < 30 ? 0.15 : 0 }),
    low: 'Below 30 the federations quarrel and rival movements grow.',
    high: 'High solidarity means productive works and a stubborn defence.',
    acts: [
      { id: 'an_fund', name: 'The solidarity fund', desc: 'Every member pays a day’s wage a month; every striker anywhere gets bread.', cost: { gold: 60 }, cd: 18, sig: 12, fx: [['sup', 'workers', 4], ['mod', 'ls', 1, 12, 'Solidarity fund']], ai: (n, v) => v < 50 && n.gold > 140 },
      { id: 'an_congress', name: 'Federal congress', desc: 'The federations meet, settle their quarrels and elect nobody to anything permanent.', cost: { auth: 5 }, cd: 24, sig: 10, fx: [['particip', 6], ['bureau', -8]], ai: (n, v) => v < 60 },
      { id: 'an_expro', name: 'Expropriate the hoarders', desc: 'The warehouses of the speculators are opened and their contents distributed by the district committees.', cost: { auth: 10 }, cd: 36, sig: 6, fx: [['gold', 120], ['sup', 'capital', -10], ['grievance', 4], ['mod', 'ls', 2, 12, 'Expropriations']], ai: (n) => n.gold < 60 },
    ],
    war: { name: 'Militia columns', desc: 'Columns raised by the unions defend home ground fiercely and attack raggedly: home defence +15%, offensives lose 10% more men and move a little slower.', dp: { homeDef: 1.15, aloss: 1.1, speed: 0.95 } },
    order: { key: 'enemy_strike', name: 'General strike across the border', gold: 70, cd: 240, range: 999,
      desc: 'The federations call out the workers of the enemy country. Its industry stops for two months and its cities seethe.',
      run: (G, n, Dn) => { Dn.strike = Math.max(Dn.strike || 0, 2); for (let p = 1; p < G.provinces.length; p++) { const Pr = G.provinces[p]; if (Pr.owner === Dn.id && Pr.urban > 0.3) Pr.unrest = clamp(Pr.unrest + 8, 0, 100); } Dn.stab -= 2; return 'The workers of ' + Dn.name + ' down tools.'; },
      ai: (G, n) => true },
  };

  D.ancom = {
    name: 'The Free Communes', gauge: 'Commune autonomy', init: 70,
    desc: 'There is no centre to capture and no order to obey. The freer the communes, the harder they are to conquer, and the harder they are to coordinate.',
    drift: (n) => 0.2 - (n.emergency ? 1.5 : 0) - (n.nwars ? 0.2 : 0) + (n.particip - 50) * 0.01,
    fx: (n, v) => ({ def: (v - 50) * 0.004, eff: -(v - 50) * 0.0012, stab: (v - 50) * 0.03, prod: -(v - 50) * 0.0008 }),
    low: 'Low autonomy: the communes coordinate well and resist poorly.',
    high: 'High autonomy: an unconquerable country that cannot organise a railway timetable.',
    acts: [
      { id: 'ac_free', name: 'Free distribution', desc: 'Bread, milk and shoes taken from the common store by whoever needs them.', cost: { gold: 50 }, cd: 24, sig: 8, fx: [['mod', 'ls', 3, 12, 'Free distribution'], ['mod', 'food', -0.04, 12, 'Free distribution'], ['sup', 'peasants', 4]], ai: (n) => S(n, 'peasants') < 45 && n.foodBal > 1.05 },
      { id: 'ac_federate', name: 'Federate the communes', desc: 'A federal council with real powers over rails, power and grain, for as long as the communes agree.', cost: { auth: 8 }, cd: 24, sig: -12, fx: [['mod', 'eff', 0.06, 24, 'Federal council'], ['particip', -4]], ai: (n, v) => v > 75 && !n.nwars },
      { id: 'ac_arm', name: 'Arm every commune', desc: 'A rifle for every adult who wants one, and a meeting to decide who keeps the machine gun.', cost: { gold: 50 }, cd: 36, sig: 6, fx: [['troops', 0.06], ['mod', 'def', 0.05, 24, 'Armed communes']], ai: (n) => !!n.a.threatened || n.nwars > 0 },
    ],
    war: { name: 'Partisan federations', desc: 'There is no capital to take and no army to destroy. Enemies who occupy your land bleed three times as fast; home defence is strong and offensives are costly.', dp: { bleed: 3, homeDef: 1.15, aloss: 1.15 } },
    order: { key: 'partisan_rising', name: 'Partisan rising', gold: 0, cd: 240, self: 1,
      desc: 'Every occupied commune rises at once. Occupying troops are ambushed across your lost provinces, and the occupation becomes harder to hold.',
      can: (G, n) => ((n.a.coreLost || 0) > 0.02 ? '' : 'Only while the enemy holds your land.'),
      run: (G, n) => { let k = 0; for (let p = 1; p < G.provinces.length; p++) { const Pr = G.provinces[p]; if (Pr.core !== n.id || !Pr.owner || Pr.owner === n.id) continue; const o = G.nations[Pr.owner]; if (!o || !o.alive || !ID.atWar(G, n.id, o.id)) continue; const kill = o.troops * 0.012; o.troops -= kill; o.losses += kill; o.casM += kill; n.kills += kill; Pr.unrest = clamp(Pr.unrest + 20, 0, 100); Pr.integ = Math.max(0, Pr.integ - 20); k++; } return k ? 'The communes rise in ' + k + ' occupied provinces.' : 'No occupied provinces.'; },
      ai: (G, n) => (n.a.coreLost || 0) > 0.05 },
  };

  /* ================================================================ LIBERAL */
  D.liberal = {
    name: 'The Market and the Ballot', gauge: 'Public confidence', init: 60,
    desc: 'Liberal government runs on consent: investors who keep investing, voters who keep voting, newspapers that print what they like. Confidence buys growth and patience in war; scandals, slumps and casualty lists spend it.',
    drift: (n) => (n.conf - 50) * 0.02 + lsUp(n) * 0.15 - (n.depression ? 1 : 0) - n.we * 0.01 - (n.corr - 20) * 0.01 + (n.laws.press === 'free' ? 0.1 : -0.3) - 0.4,
    fx: (n, v) => ({ prod: (v - 50) * 0.001, vote: (v - 50) * 0.001, legit: (v - 50) * 0.08, conf: (v - 50) * 0.15, wePace: (50 - v) * 0.006 }),
    low: 'Low confidence: investment dries up, votes drift away, and every casualty list hurts more.',
    high: 'High confidence: investors build, voters forgive, and the country bears a war longer.',
    acts: [
      { id: 'li_chat', name: 'A fireside chat', desc: 'The head of government on every radio set in the country, explaining in plain words what is being done and why.', cost: { auth: 6 }, cd: 12, sig: 6, fx: [['particip', 3]], ai: (n, v) => v < 50 },
      { id: 'li_bonds', name: 'Liberty bonds', desc: 'Sell the war to the savers: a bond in every bank window and a film star at every rally.', cost: {}, cd: 24, sig: -4, can: (n) => (n.nwars ? '' : 'Only in wartime.'), fx: [['gold', 180], ['debt', 200], ['sup', 'capital', 3]], ai: (n) => n.nwars > 0 && n.gold < 120 },
      { id: 'li_inquiry', name: 'An independent inquiry', desc: 'A judge with a free hand and a deadline. Ministers will resign; the newspapers will be satisfied.', cost: { auth: 12 }, cd: 30, sig: 10, fx: [['corr', -10], ['sup', 'intelligentsia', 4], ['sup', 'bureaucracy', -4]], ai: (n) => n.corr > 30 },
    ],
    war: { name: 'Material superiority', desc: 'Wars are won by factories. Attack and defence rise with your industry against the enemy’s, by up to a quarter; but every casualty list is printed, and war weariness grows faster.', dp: { materiel: 1, wePace: 1.15 } },
    order: { key: 'arsenal', name: 'Arsenal of liberty', gold: 150, cd: 360, self: 1,
      desc: 'Every car plant builds tanks and every bank lends to the war. Equipment improves sharply; the civilian economy feels it for three months.',
      run: (G, n) => { n.equip = Math.min(1.4, n.equip + 0.12); ID.addMod(n, 'prod', -0.05, 3, 'Arsenal of liberty'); return 'The factories go to war.'; }, ai: (G, n) => n.gold > 300 && n.equip < 1 },
  };

  D.socdem = {
    name: 'The Social Compromise', gauge: 'Social peace', init: 60,
    desc: 'Capital keeps its property, labour gets its welfare state, and both keep to the bargain. Social peace means few strikes and steady growth; break the balance and both sides take to the streets.',
    drift: (n) => -Math.abs(S(n, 'workers') - S(n, 'capital')) * 0.03 + (Math.min(S(n, 'workers'), S(n, 'capital')) - 40) * 0.02 + (n.ls - 50) * 0.01 + 0.2,
    fx: (n, v) => ({ prod: (v - 50) * 0.001, stab: (v - 50) * 0.06, unrest: -(v - 50) * 0.08, opp: v < 35 ? 0.1 : 0 }),
    low: 'Below 35 the compromise breaks: unrest rises and opposition movements grow.',
    high: 'High social peace: quiet streets and a steady economy.',
    acts: [
      { id: 'sd_talks', name: 'Tripartite talks', desc: 'Government, unions and employers in the same room until they agree on wages, prices and hours.', cost: { auth: 10 }, cd: 18, sig: 12, fx: [['sup', 'workers', 3], ['sup', 'capital', 3]], ai: (n, v) => v < 50 },
      { id: 'sd_welfare', name: 'Expand the welfare state', desc: 'Pensions for all, a health service and a housing programme, paid for by those who can afford it.', cost: { gold: 80 }, cd: 30, sig: 6, fx: [['mod', 'ls', 3, 36, 'Welfare state'], ['sup', 'workers', 6], ['sup', 'capital', -5]], ai: (n) => S(n, 'workers') < S(n, 'capital') - 8 && n.gold > 180 },
      { id: 'sd_restraint', name: 'Wage restraint', desc: 'The unions agree to a year of modest settlements in return for price controls and a seat at the table.', cost: { auth: 6 }, cd: 24, sig: -6, fx: [['inflation', -10], ['sup', 'capital', 6], ['sup', 'workers', -6], ['mod', 'prod', 0.03, 24, 'Wage restraint']], ai: (n) => n.inflation > 25 || S(n, 'capital') < S(n, 'workers') - 10 },
    ],
    war: { name: 'The home front', desc: 'A welfare state at war shares the burden: war weariness grows a fifth slower and the factories keep the army supplied.', dp: { wePace: 0.8, equipRegen: 1.2 } },
    order: { key: 'nat_service', name: 'National service', gold: 50, cd: 360, self: 1,
      desc: 'A fair draft, announced in advance, with exemptions nobody can buy: troops equal to 1.5% of the population, without the anger of a call-up.',
      run: (G, n) => { const a = draft(G, n, 0.015, 0.02); n.sm.workers -= 2; return ID.fmtPop(a) + ' are called up under national service.'; }, ai: (G, n) => n.a.losing },
  };

  D.minarchy = {
    name: 'The Night-Watchman State', gauge: 'Liberty', init: 70,
    desc: 'The state does three things: courts, police, the army. Every new tax, regulation or ministry costs liberty, and with it the investors and freeholders who chose this country for its emptiness.',
    drift: (n) => (24 - (n.tax || 20)) * 0.05 - (n.emergency ? 2 : 0) - (n.laws.security === 'secret' || n.laws.security === 'terror' ? 1 : 0) + (n.laws.press === 'free' ? 0.2 : -0.5) - (n.budget.welfare > 0.1 ? 0.5 : 0) - 0.6,
    fx: (n, v) => ({ conf: (v - 50) * 0.25, rev: -(v - 50) * 0.002, trade: (v - 50) * 0.003, growth: (v - 50) * 0.004, stab: (v - 50) * 0.04 }),
    low: 'Low liberty: the investors and the freeholders leave.',
    high: 'High liberty: trade, confidence and growth; a thin treasury.',
    acts: [
      { id: 'mi_sell', name: 'Sell a state concern', desc: 'The post office, the mint or the lighthouse service, to the highest bidder.', cost: {}, cd: 36, sig: 8, fx: [['gold', 150], ['sup', 'capital', 6], ['sup', 'workers', -4]], ai: (n) => n.gold < 80 },
      { id: 'mi_army', name: 'Charter a private army', desc: 'A company with a charter, a flag and a contract to defend the frontier at a fixed price.', cost: { gold: 150 }, cd: 36, sig: -4, fx: [['troops', 0.06], ['mod', 'def', 0.05, 24, 'Private army']], ai: (n) => !!n.a.threatened && n.gold > 300 },
      { id: 'mi_holiday', name: 'A tax holiday', desc: 'No income tax this year. The treasury will manage; it always has.', cost: {}, cd: 36, sig: 10, fx: [['mod', 'rev', -0.15, 12, 'Tax holiday'], ['sup', 'capital', 8], ['conf', 8]], ai: (n, v) => v < 55 && n.gold > 250 },
    ],
    war: { name: 'Volunteers and contractors', desc: 'Free men defend their own property fiercely and nobody else’s: home defence +10%, offensives cost a little more. Hired companies can be bought in any emergency.', dp: { homeDef: 1.1, aloss: 1.05 } },
    order: { key: 'marque', name: 'Letters of marque', gold: 40, cd: 180, range: 999,
      desc: 'Licence privateers against the enemy’s shipping and treasury. Seize a fifth of the enemy’s gold, up to 200, and choke their trade for three months.',
      run: (G, n, Dn) => { const take = Math.min(200, Math.max(0, Dn.gold) * 0.2); Dn.gold -= take; n.gold += take * 0.6; ID.addMod(Dn, 'trade', -0.15, 3, 'Privateers'); return 'Privateers take ' + Math.round(take) + ' gold from ' + Dn.name + '.'; }, ai: (G, n) => true },
  };

  /* ================================================================ CONSERVATIVE */
  D.conmon = {
    name: 'The Crown in Parliament', gauge: 'Royal prestige', init: 60,
    desc: 'The monarch reigns and does not rule. A respected crown absorbs crises that would topple a republic: governments fall, the throne remains. Scandal, partisanship or a sovereign who meddles in politics spends that respect.',
    drift: (n) => (n.tradition - 50) * 0.02 + (n.stab - 50) * 0.01 - 0.85 - (n.sig > 85 ? 0.3 : 0) - (n.corr > 40 ? 0.3 : 0),
    fx: (n, v) => ({ stab: (v - 50) * 0.08, legit: (v - 50) * 0.06, unrest: -(v - 50) * 0.05, coup: -(v - 50) * 0.01 }),
    low: 'A disregarded crown is one more thing for the republicans to aim at.',
    high: 'A revered crown steadies the state through any government crisis.',
    acts: [
      { id: 'cm_tour', name: 'A royal tour', desc: 'The sovereign opens a bridge, a hospital and a fishing harbour, and shakes four thousand hands.', cost: { gold: 60 }, cd: 24, sig: 10, fx: [['tradition', 4], ['sup', 'peasants', 3]], ai: (n, v) => v < 55 && n.gold > 150 },
      { id: 'cm_speech', name: 'The sovereign’s speech', desc: 'A broadcast from the palace: steadiness, duty, and an end to the bickering.', cost: {}, cd: 12, sig: 4, fx: [['stab', 3], ['we', -6]], ai: (n) => n.nwars > 0 && n.we > 30 },
      { id: 'cm_commission', name: 'A royal commission', desc: 'Eminent persons, a year of hearings, and recommendations the government cannot quite ignore.', cost: { auth: 10 }, cd: 36, sig: 6, fx: [['corr', -6], ['sup', 'intelligentsia', 4], ['mod', 'eff', 0.02, 36, 'Royal commission']], ai: (n) => n.corr > 30 },
    ],
    war: { name: 'The guards regiments', desc: 'Household troops sworn to the crown hold the capital’s province half again as long, and the army’s morale has a floor no defeat can break.', dp: { capitalDef: 1.5, moraleFloor: 0.85 } },
    order: { key: 'kings_appeal', name: 'The sovereign’s appeal', gold: 0, cd: 360, self: 1,
      desc: 'The crown asks the nation to endure. War weariness falls sharply and volunteers come forward.',
      run: (G, n) => { n.we = Math.max(0, n.we - 15); const a = draft(G, n, 0.01, 0); n.tradition = Math.min(100, n.tradition + 3); return 'The sovereign’s appeal brings ' + ID.fmtPop(a) + ' volunteers.'; }, ai: (G, n) => n.we > 45 },
  };

  const FAV = {
    nobles: { name: 'the old nobility', fx: { legit: 3, stab: 2, prod: -0.02 } },
    church: { name: 'the church', fx: { unrest: -3, sci: -0.04, legit: 2 } },
    generals: { name: 'the generals', fx: { atk: 0.06, coup: -0.15, rev: -0.03 } },
    reformers: { name: 'the reformers', fx: { eff: 0.05, prod: 0.03, legit: -2, opp: -0.05 } },
  };
  ID.DOC_FAV = FAV;
  const favAct = (k, nm, desc, sup) => ({ id: 'am_' + k, name: 'Raise ' + nm + ' to favour', desc, cost: { auth: 10 }, cd: 30, sig: 4, set: { fav: k },
    can: (n) => (n.sigx && n.sigx.fav === k ? 'Already in favour.' : ''), fx: sup, ai: (n, v, G) => (!n.sigx || !n.sigx.fav) && G.rng.chance(0.3) });
  D.absmon = {
    name: 'The Court', gauge: 'Royal will', init: 65,
    desc: 'The sovereign commands, and the court decides what the sovereign hears. Royal will keeps ministers obedient and the streets afraid; it ebbs with age, scandal and every grievance left to fester. Whoever stands in favour at court shapes the realm.',
    drift: (n) => (n.tradition - 50) * 0.02 + (S(n, 'military') - 50) * 0.01 + (S(n, 'clergy') - 50) * 0.01 - (n.grievance - 40) * 0.015 - (n.leader.age > 70 ? 0.5 : 0) - 0.9,
    fx: (n, v) => { const o = { auth: (v - 50) * 0.015, stab: (v - 50) * 0.05, unrest: -(v - 50) * 0.06, opp: v < 35 ? 0.12 : 0, legit: (v - 50) * 0.06 }; const f = n.sigx && FAV[n.sigx.fav]; if (f) for (const k in f.fx) o[k] = (o[k] || 0) + f.fx[k]; return o; },
    low: 'Below 35 the court is a nest of factions: opposition movements spread.',
    high: 'A strong royal will: obedient ministers and quiet streets.',
    acts: [
      favAct('nobles', 'the old nobility', 'The great families take the ministries again. Tradition is served; so are they.', [['sup', 'peasants', -4], ['tradition', 4]]),
      favAct('church', 'the church', 'The metropolitan sits on the council; censorship of books passes to the synod.', [['sup', 'clergy', 8], ['sup', 'intelligentsia', -6]]),
      favAct('generals', 'the generals', 'The war ministry gets what it asks for, and the general staff a seat beside the throne.', [['sup', 'military', 8], ['gold', -40]]),
      favAct('reformers', 'the reformers', 'A modernising minister with a plan for railways, schools and a land bank.', [['sup', 'intelligentsia', 6], ['sup', 'capital', 4], ['tradition', -6]]),
      { id: 'am_dismiss', name: 'Dismiss the ministers', desc: 'The whole cabinet goes at once, blamed for everything that went wrong. The sovereign is above reproach.', cost: {}, cd: 36, sig: 8, fx: [['auth', 10], ['stab', 2], ['corr', -4], ['sup', 'bureaucracy', -8]], ai: (n) => n.stab < 40 },
    ],
    war: { name: 'The Imperial Guard', desc: 'The Guard holds the capital’s province 60% harder, and the sovereign’s presence steadies home ground.', dp: { capitalDef: 1.6, homeDef: 1.05 } },
    order: { key: 'noble_levy', name: 'Rally the nobility', gold: 0, cd: 300, self: 1,
      desc: 'The great houses bring their retainers and their tenants: troops equal to 2% of the population, raised from the villages, poorly equipped.',
      run: (G, n) => { const a = draft(G, n, 0.02, 0.05); n.sm.peasants -= 8; n.tradition = Math.min(100, n.tradition + 2); return 'The nobility bring ' + ID.fmtPop(a) + ' men to the colours.'; }, ai: (G, n) => losing(n) },
  };

  D.theocracy = {
    name: 'The Faith', gauge: 'Zeal', init: 60,
    desc: 'The faithful obey because God commands it. Zeal steadies the realm and steels the army; at its height it turns on unbelievers at home and abroad, and the clever leave.',
    drift: (n, G) => (S(n, 'clergy') - 50) * 0.02 + (n.tradition - 50) * 0.01 + (n.laws.religion === 'statechurch' ? 0.2 : 0) - (ID.eraOf(G.tick) >= 2 ? 0.3 : 0) + (n.nwars ? 0.3 : 0) - 1.1,
    fx: (n, v) => ({ unrest: -(v - 50) * 0.08, stab: (v - 50) * 0.05, def: (v - 50) * 0.002, sci: v > 70 ? -(v - 70) * 0.006 : 0, legit: (v - 50) * 0.06 }),
    low: 'Low zeal: the faithful drift to the towns and the cinemas.',
    high: 'Above 70 zeal turns on learning: research suffers.',
    acts: [
      { id: 'th_holy', name: 'Proclaim a holy day', desc: 'Processions, fasting and a sermon from the chief cleric broadcast to every square.', cost: { gold: 30 }, cd: 12, sig: 8, fx: [['sup', 'clergy', 4], ['particip', 3]], ai: (n, v) => v < 55 },
      { id: 'th_edict', name: 'Edict against vice', desc: 'Cinemas closed, alcohol banned, patrols in the markets.', cost: { auth: 10 }, cd: 24, sig: 12, fx: [['mod', 'unrest', -5, 24, 'Edict against vice'], ['sup', 'intelligentsia', -8], ['grievance', 6]], ai: (n) => (n.a.unrest || 0) > 30 },
      { id: 'th_learned', name: 'A council of the learned', desc: 'Scholars of scripture and of chemistry, in one council, with the right to advise.', cost: { auth: 10 }, cd: 36, sig: -10, fx: [['mod', 'sci', 0.08, 36, 'Council of the learned'], ['sup', 'intelligentsia', 8], ['sup', 'clergy', -4]], ai: (n, v) => v > 75 },
    ],
    war: { name: 'Martyrs', desc: 'The faithful fight hardest when all seems lost. While the enemy holds a tenth of your land, or the state is shaking, defence rises by 30%; and morale never quite breaks.', dp: { martyr: 0.3, moraleFloor: 0.88 } },
    order: { key: 'martyrs_call', name: 'Call of the martyrs', gold: 0, cd: 240, self: 1,
      desc: 'The clergy preach the reward of those who fall. For two months defence +20% and attack +10%, and the army spends its men freely.',
      run: (G, n) => { ID.addMod(n, 'def', 0.2, 2, 'Call of the martyrs'); ID.addMod(n, 'atk', 0.1, 2, 'Call of the martyrs'); ID.addMod(n, 'aloss', 0.15, 2, 'Call of the martyrs'); n.sm.clergy += 4; return 'The call of the martyrs goes out from every pulpit.'; }, ai: (G, n) => losing(n) || (n.a.coreLost || 0) > 0.05 },
  };

  D.agrarian = {
    name: 'The Green Rising', gauge: 'Village unity', init: 60,
    desc: 'The village assemblies are the republic. United, they feed the country and fill the militias; divided by debts, landlords and the pull of the towns, they sell out one at a time.',
    drift: (n) => (S(n, 'peasants') - 50) * 0.03 + (n.foodBal > 1.05 ? 0.2 : -0.4) - (n.rent > 30 ? 0.4 : 0) - 0.9,
    fx: (n, v) => ({ food: (v - 50) * 0.002, def: (v - 50) * 0.003, stab: (v - 50) * 0.05, regen: (v - 50) * 0.006 }),
    low: 'Low unity: thin harvests, thin militias.',
    high: 'High unity: full granaries and militias that refill quickly.',
    acts: [
      { id: 'ag_congress', name: 'Agrarian congress', desc: 'Delegates from every village, in their best clothes, in the capital’s opera house.', cost: { gold: 30 }, cd: 18, sig: 10, fx: [['particip', 5], ['sup', 'peasants', 4]], ai: (n, v) => v < 55 },
      { id: 'ag_debts', name: 'Cancel the village debts', desc: 'Every mortgage held by a moneylender is torn up in the market square.', cost: {}, cd: 48, sig: 15, fx: [['sup', 'peasants', 10], ['sup', 'capital', -10], ['gold', -80]], ai: (n, v) => v < 40 && n.gold > 150 },
      { id: 'ag_coop', name: 'Co-operative granaries', desc: 'Every district a grain store, owned by the villages that fill it.', cost: { gold: 70 }, cd: 36, sig: 6, fx: [['mod', 'food', 0.08, 36, 'Co-operative granaries']], ai: (n) => n.foodBal < 1.05 && n.gold > 150 },
    ],
    war: { name: 'Green militias', desc: 'Every village defends itself. Home defence +12%, rough country +15%, and occupiers bleed in the villages they hold.', dp: { homeDef: 1.12, roughDef: 1.15, bleed: 2 } },
    order: { key: 'peasant_levy', name: 'The peasant levy', gold: 0, cd: 300, self: 1,
      desc: 'Every village sends its young men: troops equal to 2.5% of the population. The harvest will be thinner for six months.',
      run: (G, n) => { const a = draft(G, n, 0.025, 0.04); ID.addMod(n, 'food', -0.1, 6, 'Peasant levy'); return ID.fmtPop(a) + ' villagers take up arms.'; }, ai: (G, n) => losing(n) },
  };

  /* ================================================================ AUTHORITARIAN */
  D.junta = {
    name: 'The Officers’ Council', gauge: 'Army unity', init: 60,
    desc: 'The army rules because it is the one institution that holds together. While the officers agree, orders are obeyed and offensives are sharp; when the colonels split into cliques, every defeat is a coup waiting to happen.',
    drift: (n) => (S(n, 'military') - 55) * 0.03 + (n.glory - 40) * 0.015 - (losing(n) ? 1.2 : 0) - (n.prestige > 50 ? 0.4 : 0) - 0.6,
    fx: (n, v) => ({ atk: (v - 50) * 0.003, coup: -(v - 50) * 0.02, stab: (v - 50) * 0.04 }),
    low: 'Below 40 the colonels plot: coup risk rises steeply.',
    high: 'A united officer corps: sharp offensives and no conspiracies.',
    acts: [
      { id: 'ju_promote', name: 'Promotions all round', desc: 'Every colonel a brigadier, every brigadier a car and a villa.', cost: { gold: 80 }, cd: 18, sig: 12, fx: [['sup', 'military', 6], ['corr', 2]], ai: (n, v) => v < 50 && n.gold > 150 },
      { id: 'ju_retire', name: 'Retire the ambitious', desc: 'The most popular commanders are given embassies abroad.', cost: { auth: 15 }, cd: 36, sig: 8, fx: [['prestige', -20], ['mod', 'atk', -0.04, 12, 'Retired commanders']], ai: (n) => n.prestige > 45 },
      { id: 'ju_return', name: 'Return to barracks', desc: 'Hand power to an elected government and go back to soldiering. The officers keep their pensions and their pride.', cost: { auth: 30 }, cd: 120, sig: 0, can: (n) => (n.stab < 45 ? 'The officers will not hand over a country in crisis (stability 45).' : n.nwars ? 'Not in wartime.' : ''),
        fx: [['ideology', 'liberal', 'reform'], ['sup', 'military', -6]], ai: (n, v, G) => n.age > 240 && G.rng.chance(0.05) },
    ],
    war: { name: 'Professional army', desc: 'Career officers and drilled conscripts: attack +10% and fronts move 8% faster.', dp: { atkMul: 1.1, speed: 1.08 } },
    order: { key: 'shock_troops', name: 'Shock troops', gold: 70, cd: 200, self: 1,
      desc: 'Picked battalions lead every attack for two months: attack +25%.',
      run: (G, n) => { ID.addMod(n, 'atk', 0.25, 2, 'Shock troops'); return 'Shock battalions lead the attack.'; }, ai: (G, n) => !losing(n) && n.gold > 150 },
  };

  D.corporatist = {
    name: 'The Chambers', gauge: 'Corporate harmony', init: 60,
    desc: 'Labour and capital sit in the same chambers under the state’s eye. Harmony means production and order; starve one side too long and the chambers become theatre, and the strikes come back as riots.',
    drift: (n) => -Math.abs((n.pact != null ? n.pact : 50) - 50) * 0.04 + (n.pactBroken ? -2 : 0.6) + (n.ls - 50) * 0.01,
    fx: (n, v) => ({ prod: (v - 50) * 0.0015, stab: (v - 50) * 0.05, unrest: -(v - 50) * 0.05 }),
    low: 'Low harmony: production stalls and the streets fill.',
    high: 'High harmony: the chambers deliver order and output.',
    acts: [
      { id: 'cp_convene', name: 'Convene the chambers', desc: 'A joint session of every corporation, chaired by the minister of labour, with the Leader’s portrait over the dais.', cost: { auth: 10 }, cd: 18, sig: 12, fx: [['sup', 'workers', 3], ['sup', 'capital', 3]], ai: (n, v) => v < 50 },
      { id: 'cp_rally', name: 'National rally of the corporations', desc: 'A hundred thousand workers and managers in matching shirts.', cost: { gold: 40 }, cd: 24, sig: 6, fx: [['charisma', 5], ['particip', 4]], ai: (n, v) => v < 60 && n.gold > 120 },
      { id: 'cp_bonus', name: 'Corporate bonuses', desc: 'Every corporation that meets its quota shares a state bonus between owners and workers.', cost: { gold: 80 }, cd: 30, sig: 8, fx: [['mod', 'prod', 0.04, 24, 'Corporate bonuses'], ['sup', 'capital', 5]], ai: (n) => n.gold > 220 },
    ],
    war: { name: 'Mobilised chambers', desc: 'Industry answers to the chambers: equipment recovers 40% faster in war and troops refill a little quicker.', dp: { equipRegen: 1.4 } },
    order: { key: 'chambers_mob', name: 'Mobilise the chambers', gold: 0, cd: 360, self: 1,
      desc: 'Every corporation delivers men and machines: troops equal to 1.5% of the population and better equipment, at a cost to output for three months.',
      run: (G, n) => { const a = draft(G, n, 0.015, 0); n.equip = Math.min(1.4, n.equip + 0.05); ID.addMod(n, 'prod', -0.05, 3, 'Mobilised chambers'); return 'The chambers deliver ' + ID.fmtPop(a) + ' men.'; }, ai: (G, n) => losing(n) || n.equip < 0.9 },
  };

  D.technocracy = {
    name: 'Rule of Experts', gauge: 'Credibility', init: 60,
    desc: 'The experts rule because they deliver. Every target met adds to their credibility; every crisis they failed to foresee subtracts from it, twice over.',
    drift: (n) => lsUp(n) * 0.3 + (n.net > 0 ? 0.2 : -0.3) - (n.crises || 0) * 0.8 - 0.5,
    fx: (n, v) => ({ legit: (v - 50) * 0.1, eff: (v - 50) * 0.0012, sci: (v - 50) * 0.002 }),
    low: 'Low credibility: the experts look like any other clique, and legitimacy follows.',
    high: 'High credibility: an efficient state with a fine research budget.',
    acts: [
      { id: 'tc_audit', name: 'Commission an audit', desc: 'Every ministry’s accounts, checked by a rival ministry, published in full.', cost: { auth: 8 }, cd: 18, sig: 6, fx: [['corr', -8], ['sup', 'bureaucracy', -4]], ai: (n) => n.corr > 25 },
      { id: 'tc_project', name: 'A grand project', desc: 'A dam, a canal or a city, designed in a year and built in five.', cost: { gold: 150 }, cd: 48, sig: 12, fx: [['mod', 'prod', 0.05, 60, 'Grand project'], ['sup', 'workers', 3]], ai: (n) => n.gold > 350 },
      { id: 'tc_publish', name: 'Publish the projections', desc: 'Five-year forecasts for every sector, in plain figures, in every newspaper.', cost: {}, cd: 24, sig: 8, can: (n) => (n.crises > 1 ? 'Not while the figures are this bad.' : ''), fx: [['particip', 4], ['sup', 'intelligentsia', 4]], ai: (n, v) => v < 60 },
    ],
    war: { name: 'Precision', desc: 'Barrages and air raids cost 40% less, strike a third harder and come round sooner; attacks lose 5% fewer men.', dp: { precision: 1, aloss: 0.95 } },
    order: { key: 'op_research', name: 'Operational research', gold: 40, cd: 240, self: 1,
      desc: 'Mathematicians at every headquarters: convoys, barrages and assaults are planned by numbers. For two months attacks lose a quarter fewer men.',
      run: (G, n) => { ID.addMod(n, 'aloss', -0.25, 2, 'Operational research'); return 'The operational research teams take over the planning.'; }, ai: (G, n) => true },
  };

  D.personalist = {
    name: 'The Inner Circle', gauge: 'Loyalty of the circle', init: 60,
    desc: 'One man rules through a small circle of relatives, cronies and bodyguards. Keep them rich and frightened and the regime is a fortress; let them grow too rich, or too frightened, and one of them will be the man who replaces him.',
    drift: (n) => -0.25 + (n.corr - 30) * 0.01 + (n.laws.security === 'terror' ? 0.3 : 0) - (n.leader.age > 65 ? 0.6 : 0) - (n.charisma < 40 ? 0.5 : 0) + (n.flags.heir ? 0.3 : 0),
    fx: (n, v) => ({ coup: -(v - 50) * 0.02, auth: (v - 50) * 0.01, stab: (v - 50) * 0.04, rev: v > 70 ? -(v - 70) * 0.002 : 0 }),
    low: 'Below 40 the circle talks among itself: coup risk rises steeply.',
    high: 'Above 70 the circle is loyal and expensive: revenue leaks into its pockets.',
    acts: [
      { id: 'pe_favours', name: 'Shower the circle with favours', desc: 'Concessions, monopolies and a seaside palace each.', cost: { gold: 100 }, cd: 18, sig: 14, fx: [['corr', 5]], ai: (n, v) => v < 45 && n.gold > 180 },
      { id: 'pe_purge', name: 'Purge the inner circle', desc: 'The brother-in-law is arrested at dinner. The rest understand.', cost: { auth: 15 }, cd: 36, sig: 10, fx: [['sup', 'bureaucracy', -6], ['sup', 'military', -6], ['grievance', 6], ['charisma', 3]], ai: (n, v) => v < 35 && n.auth > 30 },
      { id: 'pe_speech', name: 'The Leader speaks', desc: 'Four hours in the main square, broadcast live, interrupted by applause.', cost: {}, cd: 12, sig: 3, fx: [['charisma', 4], ['stab', 2]], ai: (n) => n.charisma < 55 },
    ],
    war: { name: 'The Leader’s war', desc: 'The Leader commands in person. Attack rises and falls with his charisma: up to +15% for a revered leader, as low as −15% for a ridiculed one.', dp: { leaderAtk: 1 } },
    order: { key: 'leader_command', name: 'The Leader takes command', gold: 0, cd: 240, self: 1,
      desc: 'The Leader moves into the field headquarters. With charisma above 50, attacks gain up to 20% for two months; below it, his orders cost lives.',
      run: (G, n) => { const c = n.charisma; ID.addMod(n, 'atk', 0.08 + Math.max(0, c - 50) / 400, 2, 'The Leader commands'); if (c < 50) ID.addMod(n, 'aloss', 0.2, 2, 'The Leader commands'); return 'The Leader takes personal command.'; }, ai: (G, n) => n.charisma > 55 },
  };

  /* ================================================================ HETERODOX */
  D.merchant = {
    name: 'The Houses', gauge: 'Credit', init: 65,
    desc: 'The republic is a firm, and its credit is its army. Good credit means cheap loans, bribed neighbours and regiments for hire; a missed payment, a lost convoy or a war on the sea lanes, and the bankers of the world look away.',
    drift: (n) => (n.net > 0 ? 0.4 : -0.6) - (n.debt / Math.max(1, ID.Economy.debtCap(n))) * 1.2 + (n.nwars ? -0.3 : 0.1) + (n.laws.trade === 'free' ? 0.2 : 0) - 0.4,
    fx: (n, v) => ({ trade: (v - 50) * 0.004, rev: (v - 50) * 0.002, conf: (v - 50) * 0.2 }),
    low: 'Low credit: trade and revenue dry up.',
    high: 'High credit: the sea lanes pay and the banks lend.',
    acts: [
      { id: 'me_lend', name: 'Lend to a neighbour', desc: 'A loan at a sensible rate, secured on their customs revenue.', cost: { gold: 150 }, cd: 24, sig: 6, fx: [['mod', 'rev', 0.06, 36, 'Interest on foreign loans'], ['opAll', 2]], ai: (n) => n.gold > 450 },
      { id: 'me_bribe', name: 'Buy a hostile council', desc: 'Every assembly has members who can be persuaded. Find the ones that matter in the state that hates us most.', cost: { gold: 120 }, cd: 24, sig: 0,
        fx: [['fn', (G, n) => { let w = null, wo = 999; for (const o of G.nations) if (o && o.alive && o !== n) { const op = ID.op(G, o.id, n.id); if (op < wo) { wo = op; w = o; } } if (w) { ID.addOp(G, w.id, n.id, 25); w.threat = Math.max(0, w.threat - 10); } }], ['note', 'The most hostile state’s opinion of you +25']], ai: (n) => !!n.a.threatened && n.gold > 250 },
      { id: 'me_charter', name: 'Charter a trading company', desc: 'A monopoly on the eastern route, a royal-style charter and ten ships.', cost: { auth: 10 }, cd: 48, sig: 8, fx: [['mod', 'trade', 0.1, 60, 'Chartered company'], ['sup', 'capital', 5]], ai: (n) => true },
    ],
    war: { name: 'Condottieri and convoys', desc: 'Regiments can be hired at any time, and the navy reaches further.', dp: {} },
    order: { key: 'condottiere', name: 'Hire a condottiere', gold: 140, cd: 60, self: 1,
      desc: 'A professional captain with a professional army, paid in advance: troops equal to 1.2% of the population, at once, well equipped.',
      run: (G, n) => { const a = Math.max(0, Math.min(Math.max(40, n.pop * 0.012), n.pop * ID.maxMob(n) * 1.6 - n.troops)); n.troops += a; return 'A condottiere arrives with ' + ID.fmtPop(a) + ' men.'; }, ai: (G, n) => n.gold > 400 },
  };

  D.cybernetic = {
    name: 'The Network', gauge: 'Data integrity', init: 70,
    desc: 'The plan runs on honest numbers fed in real time. Integrity is how much of that data is true. Censorship, fear and fudged reports corrupt it; open ledgers and a free press restore it.',
    drift: (n) => (n.laws.press === 'free' ? 0.5 : n.laws.press === 'regulated' ? 0 : -1) - (n.grievance - 30) * 0.01 - ((n.load || 0) > 1 ? 1 : 0) + (n.particip - 50) * 0.01,
    fx: (n, v) => ({ eff: (v - 50) * 0.0016, dist: -(v - 50) * 0.004, sci: (v - 50) * 0.001 }),
    low: 'Low integrity: the network optimises fictions, and efficiency follows the fiction down.',
    high: 'High integrity: the plan sees everything and wastes nothing.',
    acts: [
      { id: 'cy_audit', name: 'Audit the data', desc: 'Random inspections of a thousand shop floors, compared with what they reported.', cost: { auth: 8 }, cd: 18, sig: 10, fx: [['corr', -4], ['sup', 'bureaucracy', -3]], ai: (n, v) => v < 55 },
      { id: 'cy_centre', name: 'A new computing centre', desc: 'Another hall of machines, another three hundred programmers.', cost: { gold: 150 }, cd: 36, sig: 6, fx: [['mod', 'sci', 0.05, 36, 'Computing centre'], ['fn', (G, n) => { n.sciTotal = (n.sciTotal || 0) + 120; }], ['note', 'Computing capacity up (load falls)']], ai: (n) => (n.load || 0) > 0.85 && n.gold > 300 },
      { id: 'cy_feedback', name: 'Workers’ feedback councils', desc: 'Every terminal has a button marked “this figure is wrong”.', cost: { auth: 6 }, cd: 24, sig: 8, fx: [['particip', 6], ['sup', 'workers', 4]], ai: (n, v) => v < 65 },
    ],
    war: { name: 'Network logistics', desc: 'Real-time supply: cut-off pockets hold out twice as long, cut-off tiles are far harder to take, and fronts move 5% faster.', dp: { logistics: 1, speed: 1.05 } },
    order: { key: 'algo_offensive', name: 'Algorithmic offensive', gold: 60, cd: 240, self: 1,
      desc: 'The network plans every attack to the hour. For two months fronts move a quarter faster and lose a tenth fewer men, while the network has the capacity.',
      can: (G, n) => ((n.load || 0) > 1 ? 'The network is overloaded.' : ''),
      run: (G, n) => { ID.addMod(n, 'speed', 0.25, 2, 'Algorithmic offensive'); ID.addMod(n, 'aloss', -0.1, 2, 'Algorithmic offensive'); return 'The network takes over the offensive.'; }, ai: (G, n) => !losing(n) },
  };

  D.natpop = {
    name: 'The Movement', gauge: 'National enthusiasm', init: 70,
    desc: 'The movement rules on a wave of feeling: rallies, enemies, promises. Enthusiasm needs feeding with victories, spectacles and someone to blame; it sags with every month of ordinary government.',
    drift: (n) => -0.4 + (n.glory - 40) * 0.02 + (n.nwars && !losing(n) ? 0.6 : 0) - (losing(n) ? 1 : 0) + (n.charisma - 50) * 0.01,
    fx: (n, v) => ({ legit: (v - 50) * 0.1, stab: (v - 50) * 0.05, atk: (v - 50) * 0.002, prod: (v - 50) * 0.0008 }),
    low: 'Low enthusiasm: an ordinary government with an extraordinary police.',
    high: 'High enthusiasm: the nation marches as one.',
    acts: [
      { id: 'np_rally', name: 'A mass rally', desc: 'Searchlights, banners three storeys high and a speech that ends in a roar.', cost: { gold: 50 }, cd: 12, sig: 10, fx: [['charisma', 3], ['sup', 'intelligentsia', -2]], ai: (n, v) => v < 55 && n.gold > 120 },
      { id: 'np_enemy', name: 'Name the enemy within', desc: 'A campaign against a minority, a profession or a party. The crowd is grateful for someone to hate.', cost: { auth: 10 }, cd: 30, sig: 16, fx: [['grievance', 10], ['sup', 'intelligentsia', -8], ['opAll', -4], ['mod', 'prod', -0.03, 12, 'Persecution']], ai: (n, v) => v < 40 },
      { id: 'np_promise', name: 'Promise them the lost provinces', desc: 'A map in every classroom of the nation as it should be. In two years they will ask where it is.', cost: {}, cd: 36, sig: 12, fx: [['fn', (G, n) => { if (!n.claims.length && n.tiles) ID.genClaims(G, n); }], ['later', 24, 'promise_due']], ai: (n, v) => v < 50 && !n.nwars },
    ],
    war: { name: 'Lightning war', desc: 'The first five months of every war move a third faster. Lose a tenth of your land and morale falls by a fifth.', dp: { blitz: 0.35, brittle: 0.2 } },
    order: { key: 'total_war', name: 'The total war speech', gold: 0, cd: 360, self: 1,
      desc: 'Do you want total war? The crowd answers. Troops equal to 2% of the population, war weariness −10, living standards −3 for six months.',
      run: (G, n) => { const a = draft(G, n, 0.02, 0.03); n.we = Math.max(0, n.we - 10); ID.addMod(n, 'ls', -3, 6, 'Total war'); return ID.fmtPop(a) + ' more men to the front.'; }, ai: (G, n) => losing(n) || n.we > 50 },
  };

  /* ---------------------------------------------------------------- leader traits */
  /* fx uses the same channels; ai: agg (war appetite), peace (willingness to settle), reform (takes reforming programmes). */
  ID.TRAITS = {
    warlord: { name: 'Warlord', desc: 'Happiest at the map table. More eager for war; the army fights a little harder.', fx: { atk: 0.06 }, ai: { agg: 0.3, peace: -10 } },
    cautious: { name: 'Cautious', desc: 'Weighs every risk twice. Slower to start wars, quicker to end them; defence a little stronger.', fx: { def: 0.05 }, ai: { agg: -0.3, peace: 12 } },
    reformer: { name: 'Reformer', desc: 'Believes the system must change to survive. Efficiency up, and the regime drifts more readily.', fx: { eff: 0.03, driftK: 0.3 }, ai: { reform: 1 } },
    hardliner: { name: 'Hardliner', desc: 'Every concession is the first step to collapse. Drift is slower; opposition grows more slowly.', fx: { driftK: -0.35, opp: -0.04, legit: -1 }, ai: {} },
    paranoid: { name: 'Paranoid', desc: 'Sees a plot in every corridor, and sometimes there is one. Coups are rarer; grievance grows.', fx: { coup: -0.3, unrest: 2 }, ai: { purge: 1 } },
    corrupt: { name: 'Corrupt', desc: 'Never confuses the treasury with his own pocket; he knows exactly which is which. Revenue leaks; his friends are content.', fx: { rev: -0.05, stab: 1 }, ai: {} },
    honest: { name: 'Incorruptible', desc: 'Lives in two rooms and checks every receipt. Revenue up; the apparatus resents him.', fx: { rev: 0.04, auth: -0.1 }, ai: {} },
    orator: { name: 'Orator', desc: 'Can hold a crowd of a hundred thousand for three hours. Legitimacy and votes up.', fx: { legit: 4, vote: 0.02 }, ai: {} },
    grey: { name: 'Grey administrator', desc: 'Nobody remembers his speeches. Everybody’s paperwork gets done.', fx: { eff: 0.04, legit: -2 }, ai: {} },
    pious: { name: 'Pious', desc: 'Never misses a service. The devout trust him; the provinces are quieter.', fx: { unrest: -2, legit: 1 }, ai: {} },
    economist: { name: 'Economist', desc: 'Reads balance sheets for pleasure. Industry and revenue up.', fx: { prod: 0.04, rev: 0.03 }, ai: {} },
    spendthrift: { name: 'Spendthrift', desc: 'Promises everything to everyone, and delivers some of it. Living standards up, revenue down.', fx: { ls: 2, rev: -0.05 }, ai: {} },
    ailing: { name: 'Ailing', desc: 'The doctors visit twice a day; the ministers, less often. Plots stir.', fx: { coup: 0.25, auth: -0.15 }, ai: { peace: 6 } },
    beloved: { name: 'Beloved', desc: 'Grandmothers keep his picture. Stability up.', fx: { stab: 3 }, ai: {} },
    ironfist: { name: 'Iron fist', desc: 'Order first, questions never. Unrest and opposition fall; legitimacy suffers.', fx: { unrest: -4, opp: -0.08, legit: -2 }, ai: { purge: 1 } },
    diplomat: { name: 'Diplomat', desc: 'Speaks five languages and means something different in each. Trade up; less eager for war.', fx: { trade: 0.08 }, ai: { agg: -0.15, peace: 8 } },
    visionary: { name: 'Visionary', desc: 'Lives in the year 2000. Research up.', fx: { sci: 0.08 }, ai: {} },
    gambler: { name: 'Gambler', desc: 'Doubles down. Attack up, defence down, and wars come easier.', fx: { atk: 0.04, def: -0.04 }, ai: { agg: 0.15, peace: -6 } },
    peasantborn: { name: 'Born in a village', desc: 'Still knows the price of seed. Food and stability up.', fx: { food: 0.04, stab: 1 }, ai: {} },
    soldier: { name: 'Old soldier', desc: 'Came up through the ranks. The army trusts him.', fx: { coup: -0.15, def: 0.03 }, ai: { agg: 0.1 } },
  };
  /* weights by family: some characters are likelier under some systems */
  const TW = {
    socialist: { hardliner: 2, reformer: 1.5, grey: 1.5, orator: 1.2, visionary: 1.2, pious: 0.1 },
    anarchist: { orator: 1.5, peasantborn: 1.5, hardliner: 0.5, corrupt: 0.3, ironfist: 0.2, pious: 0.1 },
    liberal: { economist: 1.5, diplomat: 1.5, orator: 1.3, ironfist: 0.3, paranoid: 0.5 },
    conservative: { pious: 2, beloved: 1.3, soldier: 1.3, ailing: 1.5, visionary: 0.6 },
    authoritarian: { warlord: 1.6, ironfist: 1.6, paranoid: 1.6, soldier: 1.8, corrupt: 1.4, diplomat: 0.5 },
    heterodox: { economist: 1.4, visionary: 1.4, gambler: 1.3 },
  };
  ID.rollTraits = function (rng, ideo) {
    const fam = ID.IDEOLOGIES[ideo] ? ID.IDEOLOGIES[ideo].family : 'liberal', w = TW[fam] || {};
    const keys = Object.keys(ID.TRAITS), out = [];
    const nt = rng.chance(0.25) ? 1 : 2;
    while (out.length < nt) {
      const k = rng.weighted(keys, (x) => (out.indexOf(x) >= 0 ? 0 : (w[x] || 1) * ((x === 'warlord' && out.indexOf('cautious') >= 0) || (x === 'cautious' && out.indexOf('warlord') >= 0) || (x === 'honest' && out.indexOf('corrupt') >= 0) || (x === 'corrupt' && out.indexOf('honest') >= 0) || (x === 'reformer' && out.indexOf('hardliner') >= 0) || (x === 'hardliner' && out.indexOf('reformer') >= 0) ? 0 : 1)));
      if (!k) break; out.push(k);
    }
    return out;
  };
})();
