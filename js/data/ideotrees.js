/* IRON DIALECTIC — ideology programmes: a six-programme tree for every system of government, open to
   any state that holds it. Shape: a root, a choice of two roads, a second step on each, a capstone that
   masters the doctrine (['master']), and a late programme for the post-war world.
   ['sig', v] moves the doctrine gauge (sim/doctrine.js). Loads after data/doctrine.js. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const PERM = 600;
  const T = (ID.FOCUS.ideos = {});
  /* tree(ideo, pre, [root, a, b, a2, b2, cap, late]); each entry [suffix, name, desc, fx] */
  const tree = (ideo, pre, list, years) => {
    const id = (s) => pre + '_i_' + s[0];
    const [r, a, b, a2, b2, cap, late] = list, yc = (years && years[0]) || 1930, yl = (years && years[1]) || 1950;
    const P = (s, x, y, o) => Object.assign({ id: id(s), name: s[1], x, y, days: 120, desc: s[2], fx: s[3], ideos: [ideo] }, o);
    T[ideo] = [
      P(r, 0.5, 0, { days: 100 }),
      P(a, 0, 1, { req: [id(r)], excl: [id(b)] }),
      P(b, 1, 1, { req: [id(r)], excl: [id(a)] }),
      P(a2, 0, 2, { req: [id(a)] }),
      P(b2, 1, 2, { req: [id(b)] }),
      P(cap, 0.5, 3, { reqAny: [id(a2), id(b2)], year: yc, days: 150 }),
      P(late, 0.5, 4, { req: [id(cap)], year: yl, days: 150 }),
    ];
    T[ideo][5].fx.unshift(['master']);
  };
  const seedAbroad = (amt, cnt) => ['fn', (G, n) => { const L = []; for (const o of G.nations) if (o && o.alive && o !== n && ID.ideo(o).family !== ID.ideo(n).family && ID.op(G, n.id, o.id) < 10) L.push(o); for (let k = 0; k < cnt && L.length; k++) ID.docSeed(G, L.splice(G.rng.int(0, L.length - 1), 1)[0], n.ideo, amt, 2, n.id); }];

  /* ---------------------------------------------------------------- socialist */
  tree('ml', 'ml', [
    ['cadres', 'Train the cadres', 'Party schools in every province: dialectics in the morning, accountancy in the afternoon.', [['discipline', 8], ['sig', 8], ['mod', 'eff', 0.02, PERM, 'Trained cadres']]],
    ['heavy', 'Industrialisation at any cost', 'Fifty years of progress in ten, or we will be crushed. The villages will pay for the steel.', [['mod', 'prod', 0.06, PERM, 'Forced industrialisation'], ['sup', 'peasants', -6], ['sig', 5]]],
    ['balanced', 'Balanced growth', 'Light industry beside heavy, consumer goods beside tractors. Slower, and the workers can buy shoes.', [['mod', 'ls', 2, PERM, 'Balanced growth'], ['mod', 'prod', 0.03, PERM, 'Balanced growth'], ['sup', 'workers', 4]]],
    ['collect', 'Collectivise the villages', 'The smallholdings are merged into collective farms. Grain for export, grain for the towns, and a war in the countryside.', [['gold', 150], ['mod', 'prod', 0.03, PERM, 'Collectivisation'], ['sup', 'peasants', -10], ['grievance', 8], ['sig', 6]]],
    ['coop', 'The co-operative plan', 'Villages join co-operatives of their own free will, with credit, machines and patience.', [['mod', 'food', 0.06, PERM, 'Co-operative plan'], ['sup', 'peasants', 8], ['sig', -4]]],
    ['line', 'The general line', 'One plan, one party, one line, printed in every newspaper on the same morning.', [['sig', 10], ['legitmod', 4, 120, 'The general line']]],
    ['stc', 'The scientific-technical revolution', 'Computers, chemistry and the conquest of space: the plan’s second century begins in its laboratories.', [['mod', 'sci', 0.1, PERM, 'Scientific-technical revolution'], ['mod', 'eff', 0.03, PERM, 'Scientific-technical revolution']]],
  ]);
  tree('trot', 'tr', [
    ['fourth', 'The Fourth International', 'A world party for a world revolution, with sections in every country that will have one.', [['sig', 10], seedAbroad(10, 3), ['note', 'Your movement grows in three hostile states']]],
    ['redarmy', 'The Red Army of the world', 'An army that belongs to no nation: its oath is to the international working class.', [['mod', 'atk', 0.05, PERM, 'Red Army of the world'], ['troops', 0.05], ['sig', 6]]],
    ['soviets', 'Workers’ democracy', 'Rival platforms in every soviet, free elections in the unions, the bureaucrats on short contracts.', [['particip', 10], ['bureau', -10], ['sig', 4], ['mod', 'eff', 0.02, PERM, 'Workers’ democracy']]],
    ['revwar', 'The doctrine of revolutionary war', 'Every offensive is a political campaign; every captured town gets a soviet the same day.', [['mod', 'atk', 0.04, PERM, 'Revolutionary war'], ['glory', 5]]],
    ['transit', 'The transitional programme', 'Demands that every worker understands and no capitalist can grant: a sliding scale of wages, control of production.', [['mod', 'prod', 0.04, PERM, 'Transitional programme'], ['sup', 'workers', 6]]],
    ['world', 'World revolution', 'The revolution is either international or it is nothing. This state is its first base, not its final shape.', [['sig', 10], seedAbroad(8, 4)]],
    ['south', 'The international of the south', 'The revolution moves to the countries where it was least expected and most needed.', [seedAbroad(12, 4), ['fervor', 10], ['note', 'Your movement grows in four hostile states']]],
  ]);
  tree('council', 'cc', [
    ['const', 'The constitution of councils', 'Every factory, district and regiment sends a recallable delegate. There is no other government.', [['particip', 8], ['sig', 8]]],
    ['industry', 'Federation of industry councils', 'The councils of each industry federate and plan their own output, branch by branch.', [['mod', 'prod', 0.05, PERM, 'Industry councils'], ['sig', 4]]],
    ['militia', 'The councils’ militia', 'Every council its battalion, every battalion its elected officers.', [['mod', 'def', 0.08, PERM, 'Council militia'], ['troops', 0.04]]],
    ['account', 'Workers’ accounting', 'Every enterprise’s books on the canteen wall, audited by whoever wants to.', [['mod', 'eff', 0.04, PERM, 'Workers’ accounting'], ['corr', -8]]],
    ['command', 'Elected command', 'Generals elected by their divisions, and recallable by them.', [['mod', 'def', 0.05, PERM, 'Elected command'], ['sup', 'military', -4]]],
    ['allpower', 'All power to the councils', 'The councils are not an institution of the state: they are the state, and they do not wither away.', [['sig', 10], ['particip', 8]]],
    ['cyber', 'Councils of the cybernetic age', 'Every council at a terminal; every plan argued over and then computed.', [['mod', 'eff', 0.04, PERM, 'Networked councils'], ['mod', 'sci', 0.06, PERM, 'Networked councils']]],
  ]);
  tree('mao', 'mz', [
    ['serve', 'Serve the people', 'Cadres eat in the villages, work in the fields and learn before they teach.', [['sig', 10], ['sup', 'peasants', 6]]],
    ['leap', 'The great leap', 'Catch up with the industrial powers in fifteen years. Every commune will smelt steel.', [['mod', 'prod', 0.08, PERM, 'The great leap'], ['mod', 'food', -0.05, 120, 'The great leap'], ['sig', 8]]],
    ['twolegs', 'Walking on two legs', 'Big plants and village workshops, modern methods and old ones, side by side.', [['mod', 'prod', 0.04, PERM, 'Two legs'], ['mod', 'food', 0.04, PERM, 'Two legs']]],
    ['communes', 'The people’s communes', 'Kitchens, schools and militias run by the commune. The family plot goes into the common field.', [['mod', 'food', 0.04, PERM, 'People’s communes'], ['particip', 6], ['sup', 'peasants', -4]]],
    ['doctors', 'Barefoot doctors', 'A year’s training, a bag of medicines and a bicycle for every village.', [['mod', 'growth', 0.2, PERM, 'Barefoot doctors'], ['sup', 'peasants', 8]]],
    ['thought', 'The thought of the Chairman', 'A little red-bound book in every pocket, quoted at every meeting, settling every argument.', [['charisma', 10], ['sig', 8]]],
    ['self', 'Self-reliance', 'No aid, no debts, no foreign masters: the country builds its own bomb with its own hands.', [['mod', 'def', 0.06, PERM, 'Self-reliance'], ['tech', 300]]],
  ], [1935, 1955]);
  tree('marketsoc', 'mk', [
    ['price', 'The price reform', 'Prices that tell the truth about costs, for the first time since the revolution.', [['mod', 'eff', 0.03, PERM, 'Price reform'], ['sig', 8]]],
    ['joint', 'Joint ventures', 'Foreign capital and state enterprise in the same firm, under our law.', [['mod', 'trade', 0.1, PERM, 'Joint ventures'], ['sig', 6], ['sup', 'intelligentsia', 3]]],
    ['shares', 'Workers’ shares', 'Every worker holds a share in the enterprise and votes at its assembly.', [['sup', 'workers', 8], ['mod', 'prod', 0.03, PERM, 'Workers’ shares']]],
    ['bourse', 'The people’s exchange', 'Enterprises may raise capital from the public. The party watches the ticker nervously.', [['gold', 150], ['mod', 'rev', 0.05, PERM, 'The people’s exchange']]],
    ['selfman', 'Self-managed enterprises', 'The workers’ council hires the director and may fire him.', [['mod', 'eff', 0.04, PERM, 'Self-management'], ['particip', 6]]],
    ['market', 'Socialism with a market', 'The plan sets the direction; the market finds the road.', [['sig', 8], ['mod', 'prod', 0.03, PERM, 'Socialist market']]],
    ['consumer', 'Consumer socialism', 'Refrigerators, holidays and a small car for every family that waited.', [['mod', 'ls', 3, PERM, 'Consumer socialism']]],
  ]);
  tree('demsoc', 'dm', [
    ['programme', 'The people’s programme', 'Forty measures, published before the election and carried out after it.', [['mandate', 8], ['sig', 8]]],
    ['banks', 'Nationalise the banks', 'Credit becomes a public service. The bankers take the next plane.', [['mod', 'rev', 0.06, PERM, 'Public banks'], ['sup', 'capital', -8], ['sig', 6]]],
    ['contract', 'The social contract', 'Employers keep their firms and accept the unions; the unions accept a plan for wages.', [['sup', 'capital', 6], ['sup', 'workers', 4]]],
    ['planning', 'A planning commission', 'Five-year targets for the public sector, advice for the private one.', [['mod', 'eff', 0.03, PERM, 'Planning commission'], ['mod', 'prod', 0.03, PERM, 'Planning commission']]],
    ['coop', 'The co-operative economy', 'Credit and land for co-operatives in every village and trade.', [['mod', 'food', 0.04, PERM, 'Co-operative economy'], ['sup', 'peasants', 6]]],
    ['road', 'The democratic road', 'Socialism by vote, defended by votes, and by the people who cast them.', [['sig', 10], ['legitmod', 4, 120, 'The democratic road']]],
    ['ecodem', 'Economic democracy', 'Elected boards in every large firm, public and private.', [['particip', 10], ['mod', 'prod', 0.03, PERM, 'Economic democracy']]],
  ], [1930, 1955]);

  /* ---------------------------------------------------------------- anarchist */
  tree('ansyn', 'as', [
    ['congress', 'The union congress', 'Every federation, every local, every delegate mandated and recallable.', [['sig', 8], ['particip', 6]]],
    ['fedind', 'Federations of industry', 'Railways run by railwaymen, power by electricians, the whole coordinated by their federations.', [['mod', 'prod', 0.06, PERM, 'Industrial federations']]],
    ['schools', 'Rationalist schools', 'Science without catechism, for children and their parents, in the evening.', [['mod', 'sci', 0.08, PERM, 'Rationalist schools'], ['sup', 'intelligentsia', 6]]],
    ['columns', 'The workers’ columns', 'Every union its column, every column its own black and red flag.', [['troops', 0.06], ['mod', 'def', 0.06, PERM, 'Workers’ columns']]],
    ['ateneos', 'The libertarian ateneos', 'Libraries, theatres and lecture halls run by their members.', [['particip', 6], ['mod', 'ls', 2, PERM, 'Ateneos']]],
    ['onebig', 'One big union', 'Every worker in one organisation, and that organisation is the whole of society.', [['sig', 10]]],
    ['continent', 'The federated continent', 'Union federations across the borders, trading without states.', [['mod', 'trade', 0.1, PERM, 'Federated continent'], ['opAll', 5]]],
  ]);
  tree('ancom', 'ax', [
    ['store', 'The common store', 'Take what you need, give what you can, and argue about the rest at the assembly.', [['mod', 'ls', 2, PERM, 'The common store'], ['sig', 6]]],
    ['federated', 'Federated communes', 'Communes bind themselves together for railways, power and defence, and only for those.', [['mod', 'eff', 0.05, PERM, 'Federated communes']]],
    ['freeschools', 'Free schools', 'No grades, no uniforms, no state curriculum.', [['mod', 'sci', 0.06, PERM, 'Free schools'], ['particip', 4]]],
    ['rails', 'The railways of the federation', 'The lines run on a timetable everybody voted for.', [['mod', 'prod', 0.04, PERM, 'Federation railways']]],
    ['militia', 'Every village a militia', 'A rifle on every wall and a meeting to decide when to take it down.', [['mod', 'def', 0.08, PERM, 'Village militias']]],
    ['communes', 'The commune of communes', 'A society with no centre, and therefore nothing for a conqueror to take.', [['sig', 10]]],
    ['mutual', 'Mutual aid without borders', 'Grain, doctors and engineers for whoever asks, without contracts.', [['opAll', 6], ['mod', 'trade', 0.06, PERM, 'Mutual aid']]],
  ]);

  /* ---------------------------------------------------------------- liberal */
  tree('liberal', 'lb', [
    ['freetrade', 'Free trade', 'Tariffs down, ports open, prices set by the world.', [['mod', 'trade', 0.1, PERM, 'Free trade'], ['sig', 6]]],
    ['gold', 'The gold standard', 'Sound money: a currency anyone in the world will take.', [['inflation', -15], ['sup', 'capital', 6]]],
    ['incometax', 'The progressive income tax', 'Those with more pay more. The rich call it confiscation; the treasury calls it Tuesday.', [['mod', 'rev', 0.05, PERM, 'Income tax'], ['sup', 'workers', 4], ['sup', 'capital', -4]]],
    ['centralbank', 'A central bank', 'An independent board of governors and a lender of last resort.', [['mod', 'eff', 0.03, PERM, 'Central bank'], ['inflation', -10]]],
    ['civilservice', 'Civil service reform', 'Appointments by examination, not by patronage.', [['corr', -10], ['mod', 'eff', 0.03, PERM, 'Civil service']]],
    ['open', 'The open society', 'A free press, independent courts and a peaceful handover of power, every time.', [['mandate', 8], ['sig', 8]]],
    ['affluent', 'The affluent society', 'Two cars, a television and a lawn. The question is no longer production but what to do with it.', [['mod', 'ls', 3, PERM, 'Affluence'], ['mod', 'prod', 0.03, PERM, 'Affluence']]],
  ]);
  tree('socdem', 'sd', [
    ['home', 'The people’s home', 'The country as a good home: equality, consideration, co-operation and helpfulness.', [['mod', 'ls', 2, PERM, 'The people’s home'], ['sig', 6]]],
    ['fullemp', 'Full employment', 'A job for everyone who wants one, guaranteed by public works and demand management.', [['mod', 'prod', 0.04, PERM, 'Full employment'], ['sup', 'workers', 6]]],
    ['peace', 'Industrial peace', 'A basic agreement between the unions and the employers’ federation, renewed every two years.', [['sup', 'capital', 6], ['sup', 'workers', 3]]],
    ['pensions', 'Universal pensions', 'Every citizen retires with dignity, whatever they earned.', [['mod', 'ls', 2, PERM, 'Universal pensions'], ['sup', 'workers', 4]]],
    ['activelm', 'An active labour market', 'Retraining and relocation instead of the dole.', [['mod', 'eff', 0.04, PERM, 'Active labour market']]],
    ['middle', 'The middle way', 'Neither the market’s cruelty nor the plan’s coercion.', [['sig', 10]]],
    ['welfare', 'The welfare state', 'From the cradle to the grave.', [['mod', 'ls', 3, PERM, 'Welfare state'], ['mod', 'growth', 0.15, PERM, 'Welfare state']]],
  ]);
  tree('minarchy', 'mn', [
    ['charter', 'The charter of liberties', 'What the state may not do, carved over the door of the parliament.', [['sig', 8], ['sup', 'capital', 6]]],
    ['banking', 'Free banking', 'Any bank may issue notes; the market decides which ones are worth anything.', [['mod', 'trade', 0.08, PERM, 'Free banking'], ['gold', 100]]],
    ['freeholders', 'The freeholders’ militia', 'Every landowner his rifle; every rifle its owner.', [['mod', 'def', 0.08, PERM, 'Freeholders’ militia']]],
    ['freeport', 'The free port', 'No duties, no questions, no paperwork worth mentioning.', [['mod', 'trade', 0.12, PERM, 'Free port']]],
    ['commonlaw', 'Common-law courts', 'Judges who answer to precedent and to nobody else.', [['corr', -10], ['mod', 'eff', 0.03, PERM, 'Common-law courts']]],
    ['minimal', 'The minimal state', 'A state you could fit in a single building, and does.', [['sig', 10]]],
    ['haven', 'The offshore haven', 'The world’s money comes here to rest, quietly.', [['gold', 300], ['mod', 'rev', 0.06, PERM, 'Offshore haven'], ['opAll', -3]]],
  ]);

  /* ---------------------------------------------------------------- conservative */
  tree('conmon', 'cm', [
    ['coronation', 'A coronation for the age', 'Gold coaches, old oaths and a newsreel in every cinema.', [['tradition', 8], ['sig', 10]]],
    ['cavalry', 'The household cavalry', 'Breastplates for parades, armoured cars for everything else.', [['mod', 'def', 0.06, PERM, 'Household troops'], ['sup', 'military', 4]]],
    ['society', 'The royal society', 'The sovereign patron of the sciences, with a charter and a laboratory.', [['mod', 'sci', 0.06, PERM, 'Royal society'], ['sup', 'intelligentsia', 6]]],
    ['realms', 'A commonwealth of realms', 'Friendly crowns and former dominions under one honorary head.', [['opAll', 4], ['mod', 'trade', 0.06, PERM, 'Commonwealth of realms']]],
    ['people', 'A people’s monarchy', 'The princes in the trenches, the queen in the bread queue.', [['mod', 'stab', 2, PERM, 'A people’s monarchy'], ['sup', 'workers', 4]]],
    ['crown', 'Crown and nation', 'The crown is the nation’s memory, and its promise to continue.', [['sig', 10], ['tradition', 6]]],
    ['modern', 'The modern monarchy', 'Television in the palace, and the palace on television.', [['tradition', 6], ['mod', 'ls', 2, PERM, 'Modern monarchy']]],
  ]);
  tree('absmon', 'ab', [
    ['durbar', 'The coronation durbar', 'Every prince, governor and bishop of the realm kneels in one great hall.', [['tradition', 10], ['sig', 10]]],
    ['chancery', 'The imperial chancery', 'Ranks, uniforms and ministries, run from the sovereign’s own cabinet.', [['mod', 'eff', 0.04, PERM, 'Imperial chancery'], ['sup', 'bureaucracy', 6]]],
    ['guards', 'The guards’ privileges', 'The guards regiments are paid double and answer only to the throne.', [['sup', 'military', 8], ['mod', 'def', 0.05, PERM, 'Guards’ privileges']]],
    ['censor', 'The censor’s office', 'Every book, play and newspaper read before it is read.', [['mod', 'unrest', -4, PERM, 'The censor'], ['sup', 'intelligentsia', -6]]],
    ['estates', 'The crown estates', 'The sovereign’s lands, mines and forests, run for profit at last.', [['gold', 150], ['mod', 'rev', 0.04, PERM, 'Crown estates']]],
    ['autocracy', 'Autocracy', 'One will, from the throne to the village. There is no other source of law.', [['sig', 10], ['auth', 20]]],
    ['modern', 'Modernisation from above', 'Railways, schools and factories by decree, before the revolution can build them from below.', [['mod', 'prod', 0.05, PERM, 'Modernisation from above'], ['mod', 'sci', 0.05, PERM, 'Modernisation from above']]],
  ], [1925, 1945]);
  tree('theocracy', 'th', [
    ['sanctuary', 'The great sanctuary', 'A house of prayer greater than any in the world, paid for by the faithful.', [['tradition', 8], ['sig', 10], ['gold', -100]]],
    ['guardians', 'The guardians of the faith', 'A body of the devout to watch over morals, markets and ministers.', [['mod', 'unrest', -4, PERM, 'Guardians of the faith'], ['sup', 'clergy', 6]]],
    ['economy', 'The faithful economy', 'Tithes for the poor, interest forbidden, endowments for every hospital.', [['mod', 'rev', 0.04, PERM, 'Faithful economy'], ['mod', 'ls', 1, PERM, 'Faithful economy']]],
    ['warriors', 'Warriors of the faith', 'Volunteers who fear nothing, organised into their own brigades.', [['mod', 'def', 0.06, PERM, 'Warriors of the faith'], ['mod', 'atk', 0.04, PERM, 'Warriors of the faith']]],
    ['charity', 'Charitable foundations', 'Soup kitchens, orphanages and clinics in every parish.', [['mod', 'ls', 2, PERM, 'Charitable foundations'], ['sup', 'peasants', 4]]],
    ['heaven', 'A kingdom of heaven on earth', 'The law of God is the law of the land, and the land is the better for it.', [['sig', 10], ['legitmod', 4, 120, 'Kingdom of heaven']]],
    ['science', 'Faith and science', 'The scholars of the faith declare the telescope an instrument of devotion.', [['mod', 'sci', 0.08, PERM, 'Faith and science'], ['sig', -10]]],
  ]);
  tree('agrarian', 'ag', [
    ['greenint', 'The green international', 'Peasant parties of every country meet in one congress and promise each other bread.', [['opAll', 3], ['sig', 8]]],
    ['tiller', 'The land to the tiller', 'Every estate divided among those who work it.', [['sup', 'peasants', 10], ['mod', 'food', 0.05, PERM, 'Land to the tiller']]],
    ['coops', 'Village co-operatives', 'Dairies, mills and credit unions owned by the villages that use them.', [['mod', 'food', 0.06, PERM, 'Village co-operatives'], ['mod', 'rev', 0.03, PERM, 'Village co-operatives']]],
    ['guard', 'The peasant guard', 'Every village its company, every company its scythes and rifles.', [['mod', 'def', 0.08, PERM, 'Peasant guard'], ['troops', 0.04]]],
    ['college', 'The agricultural college', 'Agronomy, veterinary medicine and accounting for the sons and daughters of the village.', [['mod', 'food', 0.05, PERM, 'Agricultural college'], ['mod', 'sci', 0.04, PERM, 'Agricultural college']]],
    ['republic', 'The green republic', 'A republic of villages, where the town serves the field and not the other way round.', [['sig', 10]]],
    ['electric', 'Rural electrification', 'A light in every farmhouse and a pump in every well.', [['mod', 'food', 0.06, PERM, 'Rural electrification'], ['mod', 'ls', 2, PERM, 'Rural electrification']]],
  ]);

  /* ---------------------------------------------------------------- authoritarian */
  tree('junta', 'jn', [
    ['academy', 'The officers’ academy', 'A new academy, a new curriculum and a new generation of officers loyal to the new order.', [['mod', 'atk', 0.04, PERM, 'Officers’ academy'], ['sig', 8]]],
    ['reorg', 'National reorganisation', 'Ministries run like divisions, by men used to giving orders.', [['mod', 'eff', 0.04, PERM, 'National reorganisation'], ['sup', 'bureaucracy', -4]]],
    ['industries', 'The army’s industries', 'Steelworks, shipyards and airlines owned by the general staff.', [['mod', 'prod', 0.04, PERM, 'Army industries'], ['sup', 'military', 6]]],
    ['internal', 'The internal front', 'Subversion is the enemy’s weapon; the army will fight it at home.', [['mod', 'unrest', -4, PERM, 'The internal front'], ['grievance', 6]]],
    ['engineers', 'Military engineers', 'Roads, bridges and fortresses built by the army’s own engineers.', [['mod', 'prod', 0.03, PERM, 'Military engineers'], ['build', 2, 2]]],
    ['armed', 'The armed nation', 'Every citizen a reservist, every factory a depot, every school a parade ground.', [['sig', 10], ['troops', 0.05]]],
    ['soft', 'A guided democracy', 'Elections, with the army as referee and the candidates approved in advance.', [['mod', 'stab', 2, PERM, 'Guided democracy'], ['sup', 'intelligentsia', 6]]],
  ], [1930, 1955]);
  tree('corporatist', 'cp', [
    ['charter', 'The charter of labour', 'Every trade organised in its corporation, every corporation represented in the chambers.', [['sig', 8], ['sup', 'workers', 4], ['sup', 'capital', 4]]],
    ['autarky', 'Autarky', 'Everything the nation needs, made in the nation.', [['mod', 'prod', 0.05, PERM, 'Autarky'], ['mod', 'trade', -0.05, PERM, 'Autarky']]],
    ['leisure', 'The leisure corporation', 'Holiday camps, cruise ships and theatre tickets for every worker who keeps the peace.', [['mod', 'ls', 2, PERM, 'Leisure corporation'], ['sup', 'workers', 6]]],
    ['battle', 'The battle for production', 'Medals for output, campaigns for wheat, a ministry for every shortage.', [['mod', 'prod', 0.04, PERM, 'Battle for production']]],
    ['welfare', 'Corporate welfare', 'Pensions, clinics and housing run by the corporations themselves.', [['mod', 'ls', 2, PERM, 'Corporate welfare'], ['sup', 'workers', 4]]],
    ['state', 'The corporate state', 'Neither class war nor laissez-faire: the nation as one body.', [['sig', 10]]],
    ['managed', 'The managed economy', 'Five-year targets negotiated in the chambers and enforced by the ministries.', [['mod', 'eff', 0.04, PERM, 'Managed economy'], ['mod', 'prod', 0.03, PERM, 'Managed economy']]],
  ]);
  tree('technocracy', 'tc', [
    ['standards', 'The bureau of standards', 'One measure, one gauge, one voltage for the whole country.', [['mod', 'eff', 0.03, PERM, 'Bureau of standards'], ['sig', 8]]],
    ['energy', 'The energy plan', 'Every river dammed, every coalfield mined, every city on one grid.', [['mod', 'prod', 0.06, PERM, 'The energy plan']]],
    ['academy', 'The academy of sciences', 'The best minds of the country, housed, funded and asked hard questions.', [['mod', 'sci', 0.1, PERM, 'Academy of sciences']]],
    ['management', 'Scientific management', 'Every task timed, every motion studied, every waste removed.', [['mod', 'eff', 0.04, PERM, 'Scientific management']]],
    ['systems', 'Systems analysis', 'The whole state modelled as one machine, and tuned.', [['mod', 'sci', 0.06, PERM, 'Systems analysis'], ['mod', 'eff', 0.02, PERM, 'Systems analysis']]],
    ['technate', 'The technate', 'Government by those who know, measured by results and nothing else.', [['sig', 10]]],
    ['automated', 'The automated state', 'Machines run the factories, the railways and the census; people run the machines.', [['mod', 'prod', 0.05, PERM, 'Automation'], ['sup', 'workers', -4]]],
  ], [1930, 1955]);
  tree('personalist', 'pr', [
    ['guard', 'The Leader’s guard', 'Ten thousand men, the best rifles in the country, and one loyalty.', [['sig', 10], ['sup', 'military', 4]]],
    ['bank', 'The Leader’s bank', 'The national bank becomes the Leader’s bank. The difference is mostly in the ledgers.', [['gold', 150], ['corr', 6]]],
    ['charity', 'The Leader’s charity', 'Bread, blankets and bicycles, handed out by the Leader’s wife in person.', [['mod', 'ls', 2, PERM, 'The Leader’s charity'], ['charisma', 6]]],
    ['palace', 'The Leader’s palace', 'Three thousand rooms, a balcony for half a million and a bunker for one.', [['charisma', 8], ['gold', -120]]],
    ['youth', 'The Leader’s youth', 'Uniforms, camps and songs for every child who loves the Leader, which is every child.', [['particip', 6], ['charisma', 4]]],
    ['cult', 'The cult', 'His face on every wall, his words in every mouth, his name on every street.', [['sig', 10], ['charisma', 8]]],
    ['dynasty', 'The dynasty', 'The Leader’s son is introduced to the nation, in uniform.', [['flag', 'heir'], ['sig', 10]]],
  ]);

  /* ---------------------------------------------------------------- heterodox */
  tree('merchant', 'mr', [
    ['exchange', 'The exchange', 'A marble hall where the world’s prices are set every morning.', [['mod', 'trade', 0.08, PERM, 'The exchange'], ['sig', 8]]],
    ['fleet', 'The great fleet', 'Galleys for show, cruisers for business.', [['mod', 'trade', 0.06, PERM, 'The great fleet'], ['mod', 'def', 0.04, PERM, 'The great fleet']]],
    ['banks', 'The banking houses', 'Twelve families, twelve banks, and a ledger that covers half the world.', [['mod', 'rev', 0.05, PERM, 'Banking houses'], ['gold', 100]]],
    ['companies', 'Chartered companies', 'A monopoly on every route worth sailing, sold at auction.', [['mod', 'trade', 0.08, PERM, 'Chartered companies']]],
    ['bills', 'Bills of exchange', 'Paper that crosses borders faster than gold.', [['mod', 'rev', 0.04, PERM, 'Bills of exchange'], ['debt', -100]]],
    ['thalasso', 'The thalassocracy', 'The sea is the republic’s land, and the ships its provinces.', [['sig', 10]]],
    ['offshore', 'The offshore republic', 'A brass plate in the harbour for every company that would rather not pay tax at home.', [['gold', 250], ['mod', 'rev', 0.05, PERM, 'Offshore republic']]],
  ]);
  tree('cybernetic', 'cy', [
    ['network', 'The first network', 'Telex machines in five hundred factories, wired to one operations room.', [['fn', (G, n) => { n.sciTotal = (n.sciTotal || 0) + 120; }], ['note', 'Computing capacity up'], ['sig', 8]]],
    ['realtime', 'The real-time economy', 'Yesterday’s output on today’s screens; tomorrow’s plan by tonight.', [['mod', 'eff', 0.05, PERM, 'Real-time economy']]],
    ['terminals', 'The people’s terminals', 'A screen in every workplace, where the plan can be read and questioned.', [['particip', 8], ['sup', 'workers', 4]]],
    ['algedonic', 'Algedonic signals', 'A dial on every desk: pain or pleasure, sent straight to the centre.', [['mod', 'eff', 0.03, PERM, 'Algedonic signals'], ['sig', 6]]],
    ['openplan', 'The open-source plan', 'Every line of the plan published, every change logged.', [['corr', -8], ['sig', 8]]],
    ['republic', 'The cybernetic republic', 'A state that learns, governed by the people who feed it.', [['sig', 10]]],
    ['machine', 'The thinking machine', 'A computer that plays chess, plans harvests and designs its successor.', [['mod', 'sci', 0.1, PERM, 'The thinking machine'], ['mod', 'prod', 0.04, PERM, 'The thinking machine']]],
  ], [1935, 1955]);
  tree('natpop', 'np', [
    ['press', 'The movement’s press', 'A newspaper, a radio station and a film studio, all saying the same thing louder.', [['charisma', 6], ['sig', 8]]],
    ['national', 'The national revolution', 'The old parties dissolved, the unions merged into one front, the flag on every factory.', [['mod', 'prod', 0.04, PERM, 'National revolution'], ['sup', 'workers', 4]]],
    ['circus', 'Bread and circuses', 'Stadiums, festivals and a parade every Sunday.', [['mod', 'ls', 2, PERM, 'Bread and circuses'], ['sig', 6]]],
    ['car', 'The people’s car', 'A small, round, cheap car, promised to every family, delivered to some.', [['mod', 'ls', 2, PERM, 'The people’s car'], ['mod', 'prod', 0.03, PERM, 'The people’s car']]],
    ['army', 'The new army', 'Young officers, new tanks and an oath to the Leader in person.', [['mod', 'atk', 0.06, PERM, 'The new army'], ['sup', 'military', 6]]],
    ['community', 'The national community', 'One people, one will, one destiny, and no room for anyone else.', [['sig', 10], ['opAll', -4]]],
    ['millennium', 'The thousand-year state', 'Architects draw the capital as it will look in the year 3000.', [['charisma', 8], ['sig', 10], ['opAll', -5]]],
  ]);
})();
