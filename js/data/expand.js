/* IRON DIALECTIC — emergency measures and the home-front branches of the national programmes.
   Emergency measures are short programmes that open only in trouble. Starting one shelves the
   programme under way (its progress is kept) and takes it back up when the measure is done.
   Each national programme also gains a home-front branch: a root, a choice of two, and a capstone. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const F = (id, name, x, y, o) => Object.assign({ id, name, x, y, days: 120 }, o || {});
  const PERM = 600;

  /* ---------------------------------------------------------------- emergency measures */
  const hostile = (n) => ID.FACTION_IDS.filter((f) => n.fs[f] < 30 && n.fp[f] > 10);
  const topDrift = (n) => { let k = null, v = 0; for (const d in n.drift) if (n.drift[d] > v) { v = n.drift[d]; k = d; } return [k, v]; };
  const inCivil = (n, G) => !!(n.civilOf || (n.civil && G.nations[n.civil] && G.nations[n.civil].alive));
  const atWar = (n, G) => n.nwars > 0 || inCivil(n, G);
  const foeOf = (n, G) => { const f = n.civilOf ? G.nations[n.civilOf] : G.nations[n.civil]; return f && f.alive ? f : null; };
  const needAuth = (n, a) => (n.auth < a ? 'Needs ' + a + ' authority.' : '');
  const needGold = (n, g) => (n.gold < g ? 'Needs ' + g + ' gold in the treasury.' : '');
  const M = (id, name, x, y, days, repeat, can, desc, fx) => F(id, name, x, y, { days, repeat, can, desc, fx });

  ID.FOCUS.crisis = [
    // the larder
    M('c_requisition', 'Requisition the harvest', 0, 0, 30, 3, (n) => (n.foodBal >= 1 ? 'Only when food falls short of need.' : ''),
      'Soldiers at the threshing floors and a receipt for every sack. The towns will eat this winter. The villages will remember who did the counting.',
      [['mod', 'food', 0.18, 12, 'Requisitions'], ['sup', 'peasants', -8], ['unrest', 4], ['grievance', 6]]),
    M('c_grain', 'Buy grain abroad', 0, 1, 30, 3, (n) => (n.foodBal >= 1 ? 'Only when food falls short of need.' : needGold(n, 120)),
      'Pay the foreign price and do not haggle. Hunger is the more expensive bargain.',
      [['gold', -120], ['mod', 'food', 0.12, 12, 'Imported grain'], ['sup', 'peasants', 3], ['sup', 'workers', 3]]),
    // the treasury
    M('c_budget', 'Emergency budget', 1, 0, 30, 3, (n) => (n.net < 0 && n.gold < 150) || n.debt > ID.Economy.debtCap(n) * 0.6 ? '' : 'Only when the treasury is in trouble.',
      'Cut what can be cut, defer what can be deferred, and tax what has not yet thought to hide.',
      [['gold', 200], ['mod', 'ls', -3, 12, 'Austerity'], ['sup', 'workers', -5], ['sup', 'capital', 4]]),
    M('c_currency', 'Defend the currency', 1, 1, 45, 4, (n) => (n.inflation < 30 ? 'Only when inflation is above 30.' : needAuth(n, 10)),
      'A new note, a hard peg and a minister on the radio promising that this time the money means it.',
      [['auth', -10], ['inflation', -25], ['mod', 'prod', -0.04, 12, 'Tight money'], ['sup', 'capital', 6], ['sup', 'workers', -3]]),
    // the street
    M('c_order', 'Restore order', 2, 0, 30, 3, (n) => ((n.a.unrest || 0) < 18 ? 'Only when unrest is above 18.' : ''),
      'Curfews, cordons and closed newspapers. Quiet returns at once. The reasons for the noise do not go anywhere.',
      [['mod', 'unrest', -12, 12, 'Restored order'], ['grievance', 8], ['sup', 'intelligentsia', -5], ['sup', 'military', 3]]),
    M('c_listen', 'Listen to the provinces', 2, 1, 45, 3, (n) => ((n.a.unrest || 0) < 18 ? 'Only when unrest is above 18.' : needAuth(n, 10)),
      'Commissioners with open notebooks and the power to fire a governor. Slower than soldiers. It lasts.',
      [['auth', -10], ['mod', 'unrest', -6, 24, 'Commissions of inquiry'], ['grievance', -12], ['sup', 'peasants', 3], ['sup', 'workers', 3]]),
    // the government
    M('c_unity', 'A government of national unity', 3, 0, 45, 5, (n) => (n.stab >= 40 ? 'Only when stability is below 40.' : needAuth(n, 15)),
      'Every party that matters around one table, every portfolio shared out. Nobody gets what they want, which for a while is what everybody wants.',
      [['auth', -15], ['supAll', 7], ['legitmod', 6, 18, 'National unity'], ['mod', 'stab', 4, 18, 'National unity']]),
    M('c_confidence', 'Restore confidence', 3, 1, 45, 4, (n) => (n.legit >= 40 ? 'Only when legitimacy is below 40.' : ''),
      'A new prime minister, a new slogan and a clean desk for the old one. The regime remembers why it deserves to rule, or at least says so convincingly.',
      [['legitmod', 8, 24, 'Restored confidence'], ['auth', 8], ['corr', -4], ['charisma', 3]]),
    M('c_reconcile', 'Reconciliation commission', 3, 2, 45, 3, (n) => (!hostile(n).length ? 'Only when a powerful faction is hostile.' : needAuth(n, 10)),
      'Sit down with the people who hate you most and ask them what it would take. Then give them some of it.',
      [['auth', -10], ['fn', (G, n) => { const h = hostile(n).sort((a, b) => n.fs[a] - n.fs[b])[0]; if (h) { n.sm[h] += 8; n.fs[h] = Math.min(100, n.fs[h] + 12); } }],
        ['note', 'The angriest powerful faction: support +12'], ['grievance', -8]]),
    // the regime
    M('c_hold', 'Hold the line', 4, 0, 45, 3, (n) => (topDrift(n)[1] < 55 ? 'Only when the regime is drifting past 55.' : needAuth(n, 15)),
      'Purge the drift from the ministries, the schools and the party press. The regime stays what it is, a little more brittle for the effort.',
      [['auth', -15], ['fn', (G, n) => { const [k] = topDrift(n); if (k) n.drift[k] = Math.max(0, n.drift[k] - 25); }], ['note', 'The strongest drift −25'], ['mod', 'stab', -2, 12, 'Holding the line']]),
    M('c_loyalty', 'Loyalty review', 4, 1, 30, 4, (n) => (n.coupRisk < 0.006 && n.prestige < 50 ? 'Only when the officers are restless.' : ''),
      'Rotate the commands, promote the dull, retire the brilliant, and pay everyone on time.',
      [['prestige', -25], ['gold', -60], ['sup', 'military', 6], ['mod', 'atk', -0.04, 12, 'Reshuffled commands']]),
    // the war
    M('c_rally', 'Rally to the colours', 5, 0, 30, 2, (n, G) => (!atWar(n, G) ? 'Only at war.' : ''),
      'Every poster, every pulpit and every school calls for the same thing: more men, now.',
      [['troops', 0.12], ['equip', 0.05], ['sup', 'military', 4], ['we', -4]]),
    M('c_homefront', 'Hold the home front', 5, 1, 30, 2, (n) => (n.we < 30 ? 'Only when war weariness is above 30.' : needGold(n, 80)),
      'Extra rations, letters from the front printed in every paper, and leave for the men who have done the most.',
      [['gold', -80], ['we', -15], ['mod', 'ls', 2, 12, 'Home front'], ['sup', 'workers', 3]]),
    M('c_lastditch', 'The last levy', 5, 2, 30, 6, (n, G) => (!atWar(n, G) || n.stab > 35 ? 'Only at war with stability below 35.' : ''),
      'Old men, schoolboys and the prison companies. It is not an army. It may be enough.',
      [['troops', 0.25], ['mod', 'prod', -0.08, 12, 'The last levy'], ['sup', 'workers', -5], ['sup', 'peasants', -5], ['glory', 4]]),
    // the civil war
    M('c_pardon', 'Pardon those who lay down their arms', 6, 0, 30, 3, (n, G) => (!inCivil(n, G) ? 'Only in a civil war.' : needAuth(n, 10)),
      'Leaflets over the enemy lines: go home, keep your boots, nobody will ask where you have been. Some of them believe it.',
      [['auth', -10], ['fn', (G, n) => { const foe = foeOf(n, G); if (foe) { const d = foe.troops * 0.15; foe.troops -= d; n.troops += d * 0.4; } }], ['note', 'The other side loses 15% of its troops; some come over to you'], ['grievance', -6], ['sup', 'military', -3]]),
    M('c_land', 'Land to the soldiers', 6, 1, 45, 6, (n, G) => (!inCivil(n, G) ? 'Only in a civil war.' : ''),
      'Every man who serves to the end gets a plot of his own. Somebody else’s plot, for now.',
      [['troops', 0.1], ['sup', 'peasants', 8], ['sup', 'capital', -5], ['sup', 'clergy', -3]]),
  ];

  /* ---------------------------------------------------------------- home-front branches */
  /* [root, choiceA, choiceB, capstone], each [suffix, name, desc, fx]. */
  const home = (base, pre, b) => {
    const L = ID.FOCUS.nations[base]; if (!L) return;
    const X = Math.max(...L.map((f) => f.x)) + 1;
    const id = (s) => pre + '_h_' + s[0];
    const [r, a, c, z] = b;
    L.push(F(id(r), r[1], X, 0, { days: 90, desc: r[2], fx: r[3] }));
    L.push(F(id(a), a[1], X, 1, { req: [id(r)], excl: [id(c)], desc: a[2], fx: a[3] }));
    L.push(F(id(c), c[1], X + 1, 1, { req: [id(r)], excl: [id(a)], desc: c[2], fx: c[3] }));
    L.push(F(id(z), z[1], X + 0.5, 2, { reqAny: [id(a), id(c)], days: 150, desc: z[2], fx: z[3] }));
  };

  home('Aurelia', 'au', [
    ['petition', 'Hear the petitioners', 'Open the palace gates on feast days. Let them bring their papers to the Emperor’s own clerks, and let the clerks answer.', [['grievance', -10], ['mod', 'unrest', -3, 36, 'The petitions'], ['sup', 'peasants', 4], ['sup', 'workers', 3]]],
    ['relief', 'The Imperial Relief Committee', 'The Empress’s own committee: soup kitchens in the railway towns and seed grain for the villages that ate theirs.', [['gold', -80], ['mod', 'food', 0.08, PERM, 'Imperial relief'], ['sup', 'peasants', 5], ['tradition', 4]]],
    ['loyal', 'The Loyal Unions', 'Give the patriotic workingmen a banner, a hall and the police’s blessing. The other unions will learn to keep their heads down.', [['mod', 'unrest', -8, 60, 'Loyal Unions'], ['sup', 'workers', -6], ['sup', 'intelligentsia', -5], ['grievance', 8], ['legitmod', 4, 60, 'Loyal Unions']]],
    ['bread', 'Bread, Icons and the Crown', 'The three things every hut in the empire has always had. The crown means to keep it that way.', [['mod', 'stab', 3, PERM, 'Bread, Icons and the Crown'], ['tradition', 8], ['legitmod', 4, 120, 'Bread, Icons and the Crown']]],
  ]);
  home('Cassine', 'ca', [
    ['progress', 'The Progressive Era', 'Muckrakers, meat inspectors and a commission for everything. The republic decides it can be cleaned.', [['corr', -8], ['sup', 'intelligentsia', 5], ['sup', 'workers', 3]]],
    ['trust', 'Bust the trusts', 'Break the railroad combine into seven companies and let them compete for the privilege of being hated.', [['corr', -6], ['sup', 'capital', -8], ['sup', 'workers', 6], ['mod', 'prod', 0.03, PERM, 'Competition']]],
    ['partner', 'Partnership with business', 'A desk in the Treasury for every captain of industry. What is good for the mills is good for Cassine.', [['sup', 'capital', 8], ['mod', 'rev', 0.05, PERM, 'Business partnership'], ['sup', 'workers', -4]]],
    ['way', 'The Cassine Way of Life', 'A house, a car, a flag on the porch. Nobody voted for it. Everybody wants it.', [['mod', 'ls', 2, PERM, 'The Cassine Way'], ['mod', 'stab', 3, PERM, 'The Cassine Way'], ['mandate', 8]]],
  ]);
  home('Norvik', 'no', [
    ['folk', 'The folk high schools', 'Winter schools for farmhands and fishermen: history, hymns and bookkeeping, taught by lamplight.', [['sup', 'intelligentsia', 5], ['sup', 'peasants', 4], ['mod', 'sci', 0.05, PERM, 'Folk high schools']]],
    ['harbour', 'The Harbour Accord', 'Employers and unions in the same hotel for a week. They come out with a bargain that holds for a generation.', [['sup', 'workers', 7], ['sup', 'capital', 5], ['mod', 'prod', 0.03, PERM, 'The Harbour Accord']]],
    ['fisher', 'The fishermen’s co-operatives', 'One boat is a family. A hundred boats with one ledger are a power.', [['mod', 'food', 0.06, PERM, 'Fishing co-operatives'], ['sup', 'peasants', 6], ['sup', 'capital', -3]]],
    ['stone', 'Stone, Salt and Bread', 'The north was never rich. It decided to be fair instead, and it worked better than anyone expected.', [['mod', 'stab', 3, PERM, 'Stone, Salt and Bread'], ['mod', 'ls', 2, PERM, 'Stone, Salt and Bread']]],
  ]);
  home('Tessaly', 'te', [
    ['peace', 'The labour peace', 'No strikes, no lockouts, and arbitration within the week. Both sides swear it on the cantonal flag.', [['strike', -6], ['sup', 'workers', 4], ['sup', 'capital', 4]]],
    ['codet', 'Codetermination', 'Half the seats on every board for the people who work the machines.', [['sup', 'workers', 8], ['sup', 'capital', -5], ['mod', 'eff', 0.03, PERM, 'Codetermination']]],
    ['guild', 'The watchmakers’ guilds', 'Precision is a national industry. Let the guilds set the standard and the world pay for it.', [['mod', 'prod', 0.04, PERM, 'The guilds'], ['sup', 'capital', 6], ['sup', 'workers', -3]]],
    ['quiet', 'The quiet prosperity', 'Nothing dramatic has happened in Tessaly for years. The Tessalians would like to keep it that way.', [['mod', 'ls', 2, PERM, 'Quiet prosperity'], ['mod', 'def', 0.05, PERM, 'Quiet prosperity'], ['mod', 'stab', 2, PERM, 'Quiet prosperity']]],
  ]);
  home('Verano', 've', [
    ['ateneo', 'An ateneo in every village', 'A library, a stage and a schoolroom in the old church. Literacy is the first expropriation.', [['particip', 8], ['sup', 'intelligentsia', 5], ['mod', 'sci', 0.04, PERM, 'The ateneos']]],
    ['supply', 'The supply committees', 'Every town elects the people who count the flour. Nobody gets fat, and nobody starves.', [['mod', 'food', 0.08, PERM, 'Supply committees'], ['sup', 'peasants', 5]]],
    ['militia', 'The militia schools', 'Officers elected by their columns, trained by veterans, answerable to the congress.', [['troops', 0.08], ['mod', 'atk', 0.04, PERM, 'Militia schools'], ['sup', 'military', 4]]],
    ['roses', 'Bread and Roses', 'Bread, because people must eat. Roses, because they must not live only to eat.', [['mod', 'stab', 3, PERM, 'Bread and Roses'], ['mod', 'unrest', -3, PERM, 'Bread and Roses'], ['fervor', 8]]],
  ]);
  home('Drava', 'dr', [
    ['river', 'Tame the river', 'Levees, sluices and a dredging fleet. The flood that drowned the plain in 1907 will not come again.', [['gold', -60], ['mod', 'food', 0.05, PERM, 'River works'], ['sup', 'peasants', 4]]],
    ['gend', 'The gendarmerie', 'Mounted police in every market town, answerable to the colonels and to nobody else.', [['mod', 'unrest', -6, 60, 'Gendarmerie'], ['sup', 'military', 4], ['sup', 'intelligentsia', -5]]],
    ['grants', 'The officers’ land grants', 'Every veteran officer a farm on the plain and a reason to defend it.', [['sup', 'military', 8], ['sup', 'peasants', -4], ['mod', 'def', 0.04, PERM, 'Officers’ estates']]],
    ['remember', 'The river remembers', 'Every Dravan child learns the names of the floods, the sieges and the betrayals. The river forgets nothing; neither will they.', [['mod', 'stab', 3, PERM, 'The river remembers'], ['tradition', 8], ['legitmod', 4, 120, 'The river remembers']]],
  ]);
  home('Lys', 'ly', [
    ['ledger', 'The harbour ledger', 'Every cargo weighed, every toll written down, every clerk watched by another clerk.', [['corr', -6], ['mod', 'rev', 0.05, PERM, 'The harbour ledger']]],
    ['houses', 'The great houses’ loan', 'The old families lend the city what it needs, at a rate everybody agrees not to mention.', [['gold', 200], ['sup', 'capital', 6], ['sup', 'bureaucracy', -3]]],
    ['guilds', 'The guild charters', 'Caulkers, ropemakers, pilots and porters: each guild its charter, each charter a seat.', [['sup', 'workers', 6], ['sup', 'capital', -3], ['mod', 'prod', 0.03, PERM, 'Guild charters']]],
    ['vote', 'Every ship a vote', 'Lys has always been governed by whoever owned the ships. Now everyone who sails them has a say.', [['mod', 'trade', 0.1, PERM, 'Every ship a vote'], ['mod', 'stab', 3, PERM, 'Every ship a vote']]],
  ]);
  home('Karsova', 'ka', [
    ['literacy', 'Liquidate illiteracy', 'Primers in every barracks, every collective and every prison. By the next census, everyone reads the paper.', [['sup', 'intelligentsia', 6], ['sup', 'peasants', 4], ['mod', 'sci', 0.06, PERM, 'Literacy campaign'], ['fervor', 4]]],
    ['shock', 'The shock workers', 'A coal-cutter who does fourteen norms in a shift is on every front page. His comrades are told to do the same.', [['mod', 'prod', 0.05, PERM, 'Shock work'], ['sup', 'workers', -3], ['glory', 4]]],
    ['clubs', 'The workers’ clubs', 'Theatres, chess rooms and sports grounds run by the factory committees themselves.', [['sup', 'workers', 8], ['particip', 6], ['discipline', -4]]],
    ['bright', 'The bright path', 'A tractor in every village, a light in every window, a future in every newspaper. Some of it is even true.', [['mod', 'stab', 3, PERM, 'The bright path'], ['legitmod', 5, 120, 'The bright path']]],
  ]);
  home('Ruthe', 'ru', [
    ['veterans', 'The veterans’ pensions', 'The men who held the line get a pension, a medal and a seat at the front of every parade.', [['gold', -80], ['sup', 'military', 6], ['sup', 'workers', 2]]],
    ['youth', 'The youth leagues', 'Uniforms at ten, rifles at fifteen, the movement for life.', [['fervor', 10], ['troops', 0.05], ['sup', 'intelligentsia', -6]]],
    ['cool', 'Let tempers cool', 'Fewer rallies, more harvest festivals. The movement can afford to sleep for a season.', [['grievance', -12], ['mod', 'unrest', -4, 60, 'Cooler tempers'], ['fervor', -6], ['sup', 'intelligentsia', 6]]],
    ['hearth', 'The hearth and the frontier', 'A Ruthene stands in two places at once: at his own door and at the border. Both must be held.', [['mod', 'stab', 3, PERM, 'Hearth and frontier'], ['mod', 'def', 0.04, PERM, 'Hearth and frontier']]],
  ]);
  home('Suyan', 'su', [
    ['rural', 'Rural reconstruction', 'Students go out to the villages with seed catalogues and vaccines and come back as something else.', [['sup', 'peasants', 6], ['mod', 'food', 0.04, PERM, 'Rural reconstruction'], ['sup', 'intelligentsia', 3]]],
    ['school', 'The mass education movement', 'A thousand characters for every farmer, taught in the evenings by whoever learned them last year.', [['mod', 'sci', 0.06, PERM, 'Mass education'], ['sup', 'intelligentsia', 6]]],
    ['militia', 'The village militias', 'Every village its watchtower and its drum. The warlords will find the countryside closed to them.', [['troops', 0.08], ['mod', 'def', 0.05, PERM, 'Village militias'], ['mod', 'unrest', -3, 60, 'Village militias']]],
    ['wells', 'One river, ten thousand wells', 'The river feeds the empire. The wells feed the villages. Suyan has learned which to trust.', [['mod', 'stab', 3, PERM, 'Ten thousand wells'], ['mod', 'food', 0.04, PERM, 'Ten thousand wells']]],
  ]);
  home('Hesperia', 'he', [
    ['evening', 'The Evenings of Labour', 'Choirs, cycling clubs and seaside camps, all under the chambers’ banner. Leisure is organised too.', [['sup', 'workers', 5], ['mod', 'ls', 1, PERM, 'Evenings of Labour']]],
    ['coin', 'The strong currency', 'Peg the lira to gold at the old rate, whatever it costs the exporters. Iron money for an iron state.', [['inflation', -15], ['sup', 'capital', 6], ['sup', 'workers', -4]]],
    ['works', 'The great public works', 'Drain the marshes, build the motorways, and put a new town where the mosquitoes used to be.', [['gold', -120], ['mod', 'prod', 0.03, PERM, 'Public works'], ['sup', 'workers', 6], ['sup', 'peasants', 3]]],
    ['order', 'Order and bread', 'The trains run, the bread is baked, and nobody asks too loudly what else the state has been doing.', [['mod', 'stab', 3, PERM, 'Order and bread'], ['legitmod', 4, 120, 'Order and bread']]],
  ]);
  home('Irkal', 'ir', [
    ['waqf', 'The pious endowments', 'The great families endow wells, hospitals and schools in the name of God, and in their own names on the plaque.', [['gold', -60], ['sup', 'clergy', 6], ['mod', 'ls', 1, PERM, 'Pious endowments']]],
    ['police', 'The guardians of morals', 'Patrols in every bazaar: veils, fasts and the hours of prayer, observed or enforced.', [['mod', 'unrest', -8, 60, 'Guardians of morals'], ['grievance', 8], ['sup', 'intelligentsia', -6], ['tradition', 6]]],
    ['seminary', 'The reformed seminaries', 'Teach the clergy chemistry alongside scripture. God made both.', [['mod', 'sci', 0.05, PERM, 'Reformed seminaries'], ['sup', 'intelligentsia', 6], ['sup', 'clergy', -3]]],
    ['just', 'The just ruler', 'The old books say a kingdom may survive unbelief but not injustice. Irkal intends to be just.', [['mod', 'stab', 3, PERM, 'The just ruler'], ['tradition', 6], ['legitmod', 4, 120, 'The just ruler']]],
  ]);
  home('Pavon', 'pa', [
    ['birthday', 'The Marshal’s birthday', 'A national holiday, a military parade and a new portrait, a little younger than the last one.', [['charisma', 8], ['sup', 'intelligentsia', -3]]],
    ['bounty', 'The Marshal’s bounty', 'Sacks of flour stamped with his face, handed out by his own soldiers.', [['gold', -100], ['sup', 'peasants', 6], ['sup', 'workers', 4], ['mod', 'ls', 1, PERM, 'The Marshal’s bounty']]],
    ['eyes', 'The Marshal’s eyes', 'Every concierge an informer, every informer on the payroll. The Marshal knows what you said at dinner.', [['mod', 'unrest', -8, 60, 'The Marshal’s eyes'], ['grievance', 10], ['sup', 'military', 3]]],
    ['long', 'Long live the Marshal', 'Shout it at the parade. Shout it at the station. Shout it at home, in case the walls are listening.', [['mod', 'stab', 3, PERM, 'Long live the Marshal'], ['charisma', 6]]],
  ]);
  home('Meridia', 'me', [
    ['stats', 'The national statistics office', 'Every price, every harvest, every birth: counted, checked and published on the first of the month.', [['corr', -6], ['mod', 'eff', 0.03, PERM, 'Statistics office']]],
    ['appeal', 'The appeals board', 'Any citizen may challenge the model. Sometimes the citizen is right, and the model is updated.', [['sup', 'intelligentsia', 6], ['particip', 6]]],
    ['ration', 'Optimise the ration', 'The calorie is a unit like any other. Distribute it accordingly.', [['mod', 'food', 0.06, PERM, 'Optimised ration'], ['sup', 'peasants', -3], ['mod', 'eff', 0.02, PERM, 'Optimised ration']]],
    ['works', 'The model works', 'Unemployment falls, the trains are on time and the projections were right. The Directorate allows itself a small smile.', [['mod', 'stab', 3, PERM, 'The model works'], ['legitmod', 4, 120, 'The model works']]],
  ]);
  home('Antara', 'an', [
    ['milk', 'Half a litre of milk', 'Every child in the republic, every morning, free. The first promise, and the one nobody can argue with.', [['gold', -60], ['mod', 'ls', 2, PERM, 'Half a litre of milk'], ['sup', 'workers', 4]]],
    ['talks', 'Talks with the centre', 'Sit down with the Christian democrats and the small shopkeepers. Explain that socialism has room for them.', [['sup', 'capital', 5], ['sup', 'clergy', 5], ['sup', 'workers', -3], ['mandate', 6]]],
    ['jap', 'The price committees', 'Neighbourhood committees to watch the shops and the hoarders. Bread at the official price, or questions.', [['mod', 'food', 0.05, PERM, 'Price committees'], ['sup', 'workers', 5], ['sup', 'capital', -6]]],
    ['ballot', 'The long ballot', 'Every election won, every election respected. The road is slow because it has to be walked by everyone.', [['mod', 'stab', 3, PERM, 'The long ballot'], ['mandate', 8]]],
  ]);
  home('Kelda', 'ke', [
    ['watch', 'The night-watchman state', 'A court, a constable and a lighthouse. Everything else is somebody else’s business.', [['corr', -5], ['mod', 'rev', 0.03, PERM, 'Night-watchman state']]],
    ['militia', 'The subscription militia', 'Every freeholder pays his guinea and keeps his rifle oiled. The island defends itself, at cost.', [['mod', 'def', 0.05, PERM, 'Subscription militia'], ['sup', 'capital', 5], ['sup', 'workers', -3]]],
    ['commons', 'The island commons', 'The moors, the fisheries and the peat are nobody’s and everybody’s. Kelda agrees to keep it that way.', [['sup', 'peasants', 6], ['sup', 'workers', 4], ['sup', 'capital', -3], ['mod', 'food', 0.04, PERM, 'Island commons']]],
    ['nothing', 'Nothing asked', 'Kelda asks nothing of its people. Its people, mostly, return the favour.', [['mod', 'stab', 3, PERM, 'Nothing asked'], ['mod', 'trade', 0.08, PERM, 'Nothing asked']]],
  ]);
  home('Vess', 'vs', [
    ['ferry', 'The ferry councils', 'Every crossing run by its crews, every timetable voted on the quay.', [['particip', 6], ['mod', 'trade', 0.05, PERM, 'Ferry councils']]],
    ['fish', 'The fishermen’s federation', 'One catch, shared by the boats that brought it in and the towns that need it.', [['mod', 'food', 0.07, PERM, 'Fishermen’s federation'], ['sup', 'peasants', 5]]],
    ['yard', 'The shipyard councils', 'The yards build what the islands vote for: ferries first, trawlers second, warships if they must.', [['mod', 'prod', 0.04, PERM, 'Shipyard councils'], ['sup', 'workers', 6]]],
    ['tide', 'The tide belongs to everyone', 'Nobody owns the sea. Vess has decided that nobody owns anything else that matters, either.', [['mod', 'stab', 3, PERM, 'The tide belongs to everyone'], ['fervor', 6]]],
  ]);
})();
