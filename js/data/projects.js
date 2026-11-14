/* IRON DIALECTIC — national projects and national chapters (historical campaigns only).
   Every country of The Two Continents gets a seven-programme project attached to its national tree:
   a root, then two roads that pull its national question toward opposite poles, two steps on each.
   ['nq', v] moves the national question; ['figLoy', seat, v], ['figPurge', seat], ['figHeir', seat],
   ['figLeader', seat] and ['circleLoy', v] act on the inner circle (sim/regime.js).
   The national chapters are dated story beats for the countries that had few, built around their cast. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const PERM = 600;
  const P = (ID.FOCUS.projects = {});
  /* proj(base, pre, [root, a1, b1, a2, b2, a3, b3]); each [suffix, name, desc, fx] */
  const proj = (base, pre, L) => {
    const nat = ID.FOCUS.nations[base]; if (!nat) return;
    const X = Math.max(...nat.map((f) => f.x)) + 1.2;
    const id = (s) => pre + '_p_' + s[0];
    const [r, a1, b1, a2, b2, a3, b3] = L;
    const F = (s, x, y, o) => Object.assign({ id: id(s), name: s[1], desc: s[2], fx: s[3], x, y, days: 150, proj: 1 }, o);
    P[base] = [
      F(r, X + 0.5, 0, { days: 120 }),
      F(a1, X, 1, { req: [id(r)], excl: [id(b1)] }),
      F(b1, X + 1, 1, { req: [id(r)], excl: [id(a1)] }),
      F(a2, X, 2, { req: [id(a1)] }),
      F(b2, X + 1, 2, { req: [id(b1)] }),
      F(a3, X, 3, { req: [id(a2)], days: 180, year: 1925 }),
      F(b3, X + 1, 3, { req: [id(b2)], days: 180, year: 1925 }),
    ];
  };

  proj('Aurelia', 'au', [
    ['survey', 'The great land survey', 'Surveyors in every district, measuring every strip and every claim to it.', [['nq', -3], ['mod', 'eff', 0.03, PERM, 'Land survey']]],
    ['wager', 'The wager on the strong', 'Let the ablest peasants leave the commune with their land and become farmers.', [['nq', -12], ['mod', 'food', 0.06, PERM, 'The wager on the strong'], ['sup', 'peasants', 4]]],
    ['nobank', 'The noble land bank', 'Cheap credit to keep the old estates in the old families.', [['nq', 10], ['sup', 'military', 6], ['tradition', 6], ['mod', 'legit', 3, PERM, 'Noble land bank']]],
    ['resettle', 'Resettlement beyond the mountains', 'A free ticket east and forty acres for every family that goes.', [['nq', -8], ['mod', 'growth', 0.15, PERM, 'Resettlement'], ['mod', 'food', 0.04, PERM, 'Eastern harvests']]],
    ['zemstvo', 'The marshals of the nobility', 'The district marshals take over the police, the schools and the roads.', [['nq', 8], ['mod', 'unrest', -3, PERM, 'Marshals of the nobility'], ['auth', 15]]],
    ['freehold', 'A nation of freeholders', 'The commune is dissolved. Every peasant owns what he ploughs, and has something to lose.', [['nq', -20], ['mod', 'stab', 4, PERM, 'A nation of freeholders'], ['mod', 'food', 0.06, PERM, 'Freeholders'], ['sup', 'peasants', 10]]],
    ['holy', 'Holy Aurelia', 'Throne, altar and estate: the old trinity, restored and armed.', [['nq', 15], ['mod', 'legit', 5, PERM, 'Holy Aurelia'], ['mod', 'def', 0.08, PERM, 'Holy Aurelia'], ['tradition', 10]]],
  ]);
  proj('Cassine', 'ca', [
    ['census', 'The census of wealth', 'Who owns what, published county by county for the first time.', [['mod', 'rev', 0.03, PERM, 'Census of wealth']]],
    ['freedom', 'The new freedom', 'Freedom from the trusts as well as from the state.', [['nq', -10], ['sup', 'workers', 6], ['mod', 'ls', 2, PERM, 'The new freedom']]],
    ['gilded', 'The gilded age', 'Railroads, steel and oil, and no questions asked of the men who build them.', [['nq', 10], ['mod', 'prod', 0.06, PERM, 'The gilded age'], ['sup', 'capital', 8]]],
    ['security', 'Social security', 'An old-age pension and unemployment insurance for every worker.', [['nq', -10], ['mod', 'ls', 2, PERM, 'Social security'], ['mod', 'stab', 2, PERM, 'Social security']]],
    ['mass', 'Mass production', 'The assembly line in every industry, and five dollars a day to the men who work it.', [['nq', 6], ['mod', 'prod', 0.06, PERM, 'Mass production'], ['mod', 'eff', 0.03, PERM, 'Mass production']]],
    ['great', 'The great society', 'An end to poverty, written into the budget.', [['nq', -15], ['mod', 'stab', 4, PERM, 'The great society'], ['mod', 'legit', 4, PERM, 'The great society'], ['mod', 'growth', 0.1, PERM, 'The great society']]],
    ['arsenal', 'The arsenal of the world', 'Cassine builds what the world needs, including the world’s wars.', [['nq', 10], ['mod', 'prod', 0.08, PERM, 'Arsenal of the world'], ['mod', 'atk', 0.06, PERM, 'Arsenal of the world'], ['equip', 0.1]]],
  ]);
  proj('Norvik', 'no', [
    ['charter', 'The centenary of the charter', 'A hundred years of the constitution, and bonfires on every headland.', [['legitmod', 4, 60, 'The centenary']]],
    ['parl', 'Parliamentary government', 'Ministers answer to the Storting and leave when it says so.', [['nq', -12], ['mandate', 8], ['mod', 'eff', 0.03, PERM, 'Parliamentary government']]],
    ['council', 'The king’s council of state', 'The king chairs his cabinet, and chooses it.', [['nq', 12], ['auth', 15], ['mod', 'stab', 2, PERM, 'King’s council']]],
    ['fish', 'The fishermen’s insurance', 'Every boat insured by the state against the winter sea.', [['nq', -5], ['mod', 'food', 0.05, PERM, 'Fishermen’s insurance'], ['sup', 'peasants', 5]]],
    ['navy', 'The coastal fleet', 'Torpedo boats in every fjord and a battleship for the capital.', [['nq', 6], ['mod', 'def', 0.08, PERM, 'Coastal fleet']]],
    ['people', 'The people’s kingdom', 'A king on a bicycle, a parliament that governs and a welfare state that works.', [['nq', -15], ['mod', 'stab', 4, PERM, 'People’s kingdom'], ['mod', 'ls', 2, PERM, 'People’s kingdom']]],
    ['crown', 'The crown of the north', 'The king leads, the nation follows, and the north is his.', [['nq', 15], ['mod', 'legit', 5, PERM, 'Crown of the north'], ['mod', 'def', 0.06, PERM, 'Crown of the north'], ['tradition', 8]]],
  ]);
  proj('Tessaly', 'te', [
    ['seven', 'The federal council of seven', 'Seven ministers, all parties, one presidency that rotates every year.', [['nq', -3], ['mod', 'stab', 2, PERM, 'Council of seven']]],
    ['federal', 'The federal ministries', 'A ministry in the capital for everything the cantons did badly.', [['nq', -12], ['mod', 'eff', 0.05, PERM, 'Federal ministries']]],
    ['cantons', 'The sovereignty of the cantons', 'Every power not given to the federation stays at home.', [['nq', 12], ['mod', 'def', 0.06, PERM, 'Cantonal sovereignty'], ['mod', 'unrest', -2, PERM, 'Cantonal sovereignty']]],
    ['rail', 'The federal railways', 'One network, one timetable, one ticket.', [['nq', -6], ['mod', 'prod', 0.05, PERM, 'Federal railways']]],
    ['redoubt', 'The national redoubt', 'Forts in the high passes, stores in the mountains, a plan to give up the plain.', [['nq', 8], ['mod', 'def', 0.10, PERM, 'National redoubt']]],
    ['one', 'One Tessaly', 'One federation that the cantons belong to, not the other way round.', [['nq', -15], ['mod', 'eff', 0.05, PERM, 'One Tessaly'], ['mod', 'prod', 0.04, PERM, 'One Tessaly']]],
    ['neutral', 'Perpetual neutrality', 'Tessaly fights for no one and banks for everyone.', [['nq', 12], ['mod', 'def', 0.12, PERM, 'Perpetual neutrality'], ['opAll', 10], ['mod', 'trade', 0.08, PERM, 'Neutral banking']]],
  ]);
  proj('Verano', 've', [
    ['collect', 'The collectives’ congress', 'Every collective farm and factory sends a delegate to agree a common plan.', [['particip', 6], ['mod', 'food', 0.04, PERM, 'The collectives']]],
    ['columns', 'The free columns', 'Every column its own assembly, its own officers and its own flag.', [['nq', -12], ['mod', 'def', 0.07, PERM, 'Free columns'], ['particip', 6]]],
    ['army', 'The people’s army', 'Brigades, ranks and a general staff, all under the union.', [['nq', 15], ['mod', 'atk', 0.06, PERM, 'People’s army'], ['troops', 0.05]]],
    ['guerrilla', 'The guerrilla schools', 'Sabotage, ambush and the mountains taught to every volunteer.', [['nq', -8], ['mod', 'def', 0.06, PERM, 'Guerrilla schools'], ['mod', 'regen', 0.15, PERM, 'Guerrilla schools']]],
    ['brigades', 'The mixed brigades', 'Veterans and recruits, anarchists and socialists, in one formation.', [['nq', 10], ['mod', 'atk', 0.05, PERM, 'Mixed brigades'], ['mod', 'eff', 0.03, PERM, 'Mixed brigades']]],
    ['onewar', 'Revolution and war are one', 'The war will be won by making the revolution, not by postponing it.', [['nq', -15], ['mod', 'def', 0.10, PERM, 'Revolution and war'], ['mod', 'legit', 5, PERM, 'Revolution and war'], ['sig', 15]]],
    ['winfirst', 'Win the war first', 'The revolution can wait for victory. Victory cannot wait for the revolution.', [['nq', 15], ['mod', 'atk', 0.10, PERM, 'Win the war first'], ['mod', 'prod', 0.04, PERM, 'War industry'], ['particip', -8]]],
  ]);
  proj('Drava', 'dr', [
    ['staff', 'The river general staff', 'Plans for every crossing on every river, updated every spring.', [['mod', 'atk', 0.04, PERM, 'River general staff']]],
    ['compact', 'The river compact', 'Navigation, tolls and fisheries shared with every state on the three rivers.', [['nq', -15], ['opAll', 8], ['mod', 'trade', 0.08, PERM, 'River compact']]],
    ['oath', 'The oath of the three rivers', 'Every officer swears to see the old borders again before he dies.', [['nq', 12], ['mod', 'atk', 0.06, PERM, 'Oath of the three rivers']]],
    ['navig', 'Free navigation', 'Barges from every country, tolls for none.', [['nq', -8], ['mod', 'trade', 0.06, PERM, 'Free navigation'], ['mod', 'prod', 0.03, PERM, 'Free navigation']]],
    ['forts', 'The river fortresses', 'Casemates at every bend, guns on every bridge.', [['nq', 6], ['mod', 'def', 0.08, PERM, 'River fortresses'], ['build', 2, 2]]],
    ['bridge', 'The bridge of nations', 'Drava becomes the crossing everyone needs, and nobody can afford to attack.', [['nq', -15], ['mod', 'stab', 4, PERM, 'Bridge of nations'], ['mod', 'trade', 0.06, PERM, 'Bridge of nations'], ['legitmod', 6, 120, 'Bridge of nations']]],
    ['greater', 'Greater Drava', 'The old kingdom, from the mountains to the sea, on every map in every school.', [['nq', 15], ['claimsAll'], ['mod', 'atk', 0.08, PERM, 'Greater Drava'], ['glory', 8]]],
  ]);
  proj('Lys', 'ly', [
    ['arsenal', 'The Arsenal of Lys', 'Three thousand shipwrights, a galley a day, a cruiser a month.', [['mod', 'def', 0.05, PERM, 'Arsenal of Lys']]],
    ['freeport', 'The free port of the straits', 'No dues for ships that stop to trade, only for ships that pass.', [['nq', -15], ['mod', 'trade', 0.12, PERM, 'Free port']]],
    ['tollhouse', 'The great toll-house', 'A customs house the size of a cathedral, and an account for every flag.', [['nq', 15], ['mod', 'rev', 0.08, PERM, 'Great toll-house']]],
    ['bank', 'The Bank of the Straits', 'Lend to every power that sails through, at a rate it cannot refuse.', [['nq', -6], ['mod', 'rev', 0.05, PERM, 'Bank of the Straits'], ['gold', 150]]],
    ['batteries', 'The shore batteries', 'Guns on both shores, ranged on every channel.', [['nq', 8], ['mod', 'def', 0.10, PERM, 'Shore batteries']]],
    ['crossroads', 'Crossroads of the world', 'Every road between the continents runs through the market of Lys.', [['nq', -15], ['mod', 'trade', 0.12, PERM, 'Crossroads of the world'], ['opAll', 10]]],
    ['keys', 'The keys of two continents', 'Lys holds the gate, and the gate is shut until Lys says otherwise.', [['nq', 15], ['mod', 'rev', 0.10, PERM, 'Keys of two continents'], ['mod', 'def', 0.08, PERM, 'Keys of two continents']]],
  ]);
  proj('Karsova', 'ka', [
    ['goelro', 'The electrification plan', 'Power stations on every river: communism is soviet power plus electricity.', [['mod', 'prod', 0.04, PERM, 'Electrification']]],
    ['collect', 'Total collectivisation', 'Every farm into the collective by the spring sowing.', [['nq', -20], ['gold', 150], ['mod', 'prod', 0.06, PERM, 'Collectivisation'], ['sup', 'peasants', -10]]],
    ['nep', 'The new economic policy', 'A tax in kind, a free market for the rest, and patience.', [['nq', 15], ['mod', 'food', 0.06, PERM, 'New economic policy'], ['mod', 'ls', 2, PERM, 'New economic policy']]],
    ['steel', 'The steel city', 'A city of a quarter of a million on an empty steppe, around a single blast furnace.', [['nq', -5], ['mod', 'prod', 0.08, PERM, 'The steel city']]],
    ['coops', 'The co-operative plan', 'Villages join co-operatives of their own will, with credit and machines.', [['nq', 8], ['mod', 'food', 0.05, PERM, 'Co-operative plan'], ['sup', 'peasants', 6]]],
    ['fortress', 'The industrial fortress', 'Fifty years of industry in ten, so that the next war finds us ready.', [['nq', -10], ['mod', 'prod', 0.10, PERM, 'Industrial fortress'], ['mod', 'def', 0.06, PERM, 'Industrial fortress'], ['equip', 0.1]]],
    ['alliance', 'The worker-peasant alliance', 'The hammer and the sickle, crossed for good.', [['nq', 15], ['mod', 'stab', 4, PERM, 'Worker-peasant alliance'], ['mod', 'food', 0.06, PERM, 'Worker-peasant alliance'], ['mod', 'legit', 4, PERM, 'Worker-peasant alliance']]],
  ]);
  proj('Ruthe', 'ru', [
    ['statute', 'The legion statute', 'Uniforms, ranks and a legal status for the movement’s fighters.', [['mod', 'atk', 0.04, PERM, 'Legion statute']]],
    ['command', 'One army, one command', 'The legions dissolved into the regular army, regiment by regiment.', [['nq', -15], ['mod', 'eff', 0.03, PERM, 'One command'], ['sup', 'military', 6]]],
    ['legions', 'The black legions', 'Legion barracks in every district, legion courts for legion men.', [['nq', 12], ['mod', 'atk', 0.06, PERM, 'Black legions'], ['troops', 0.05]]],
    ['abroad', 'Ruthenes abroad', 'Reading rooms, choirs and rifle clubs in every Ruthene village across the border.', [['nq', -5], ['claimsAll'], ['opAll', -3]]],
    ['storm', 'The storm columns', 'Shock troops of the movement, trained for the street and the frontier alike.', [['nq', 10], ['mod', 'atk', 0.06, PERM, 'Storm columns'], ['mod', 'unrest', 2, PERM, 'Storm columns']]],
    ['state', 'The Ruthene state', 'A state that outlives the movement that made it.', [['nq', -15], ['mod', 'stab', 4, PERM, 'The Ruthene state'], ['mod', 'def', 0.06, PERM, 'The Ruthene state']]],
    ['greater', 'Greater Ruthe', 'Every village that speaks Ruthene, under one flag, whatever it costs.', [['nq', 15], ['claimsAll'], ['mod', 'atk', 0.10, PERM, 'Greater Ruthe'], ['glory', 8]]],
  ]);
  proj('Suyan', 'su', [
    ['survey', 'Survey the river', 'Every dyke, sluice and channel mapped for the first time in two centuries.', [['nq', 5], ['mod', 'food', 0.03, PERM, 'River survey']]],
    ['wells', 'Ten thousand wells', 'Small works, built by the villages that use them.', [['nq', 8], ['mod', 'food', 0.06, PERM, 'Ten thousand wells'], ['sup', 'peasants', 6]]],
    ['dam', 'The great dam', 'One wall of concrete across the gorges, and the river stops at our command.', [['nq', 15], ['gold', -150], ['mod', 'prod', 0.05, PERM, 'The great dam']]],
    ['coops', 'Village credit co-operatives', 'Seed, tools and loans without the moneylender.', [['mod', 'food', 0.05, PERM, 'Credit co-operatives'], ['mod', 'ls', 2, PERM, 'Credit co-operatives']]],
    ['canal', 'The grand canal reopened', 'The old imperial canal, dredged and walled, carries grain north again.', [['nq', 8], ['mod', 'trade', 0.08, PERM, 'Grand canal'], ['mod', 'prod', 0.03, PERM, 'Grand canal']]],
    ['villages', 'The ten thousand villages', 'A country that cannot be conquered because it has no centre to take.', [['nq', 10], ['mod', 'stab', 4, PERM, 'Ten thousand villages'], ['mod', 'def', 0.08, PERM, 'Ten thousand villages']]],
    ['mastered', 'The river mastered', 'The river that drowned dynasties now runs the turbines.', [['nq', 25], ['mod', 'food', 0.08, PERM, 'River mastered'], ['mod', 'prod', 0.05, PERM, 'River mastered']]],
  ]);
  proj('Hesperia', 'he', [
    ['fouryear', 'The four-year plan', 'Every raw material the nation lacks, made or stored within four years.', [['nq', 5], ['mod', 'prod', 0.05, PERM, 'Four-year plan']]],
    ['world', 'The world market', 'Buy abroad what is cheaper abroad, and sell the world machines.', [['nq', -5], ['mod', 'trade', 0.10, PERM, 'World market'], ['opAll', 5]]],
    ['ersatz', 'Ersatz industry', 'Fuel from coal, rubber from lime, fibre from wood.', [['nq', 15], ['mod', 'prod', 0.04, PERM, 'Ersatz industry']]],
    ['chem', 'The chemical cartel', 'Six firms, one cartel, the finest laboratories on either continent.', [['mod', 'prod', 0.06, PERM, 'Chemical cartel'], ['mod', 'sci', 0.05, PERM, 'Chemical cartel']]],
    ['reserve', 'The strategic reserve', 'Oil in the salt mines, ore in the forests, rubber in the cathedrals.', [['nq', 20], ['mod', 'def', 0.05, PERM, 'Strategic reserve']]],
    ['workshop', 'The workshop of the east', 'Hesperia makes what the eastern continent uses, and everyone pays in time.', [['mod', 'prod', 0.08, PERM, 'Workshop of the east'], ['mod', 'trade', 0.06, PERM, 'Workshop of the east'], ['mod', 'ls', 2, PERM, 'Workshop of the east']]],
    ['longwar', 'Ready for the long war', 'The next war will not be lost for want of oil.', [['nq', 25], ['mod', 'atk', 0.08, PERM, 'Long war'], ['mod', 'wePace', -0.15, PERM, 'Long war'], ['equip', 0.1]]],
  ]);
  proj('Irkal', 'ir', [
    ['survey', 'The oil survey', 'Geologists from the holy city map every field, and keep the map.', [['gold', 100], ['mod', 'rev', 0.03, PERM, 'Oil survey']]],
    ['national', 'The national oil company', 'The wells belong to the faithful, and so does the company.', [['nq', -20], ['mod', 'rev', 0.06, PERM, 'National oil company'], ['opAll', -4]]],
    ['consort', 'The consortium', 'Five foreign firms, one concession, a royalty paid in gold.', [['nq', 15], ['gold', 250], ['mod', 'prod', 0.04, PERM, 'Consortium']]],
    ['pipeline', 'The pipeline to the coast', 'Our oil, our pipe, our port.', [['mod', 'trade', 0.08, PERM, 'Pipeline'], ['mod', 'rev', 0.04, PERM, 'Pipeline']]],
    ['royalty', 'The royalty fund', 'Every barrel pays for a school, a clinic or a mosque.', [['nq', 5], ['mod', 'ls', 2, PERM, 'Royalty fund'], ['gold', 150]]],
    ['lamp', 'The lamp of the faithful', 'Oil lights the lamps of the faith across the world.', [['nq', -10], ['mod', 'legit', 5, PERM, 'Lamp of the faithful'], ['mod', 'def', 0.08, PERM, 'Lamp of the faithful'], ['sig', 10]]],
    ['petro', 'The petro-state', 'No taxes, no shortages, no questions.', [['nq', 10], ['mod', 'rev', 0.10, PERM, 'The petro-state'], ['mod', 'growth', 0.1, PERM, 'The petro-state']]],
  ]);
  proj('Pavon', 'pv', [
    ['concrete', 'Concrete for the mountains', 'The first ten thousand bunkers, facing every direction.', [['nq', 10], ['mod', 'def', 0.05, PERM, 'Bunker belt'], ['gold', -80]]],
    ['window', 'A window to the west', 'Trade delegations, a foreign-language newspaper, a hotel for visitors.', [['nq', -15], ['mod', 'trade', 0.08, PERM, 'Window to the west'], ['opAll', 5]]],
    ['selfrel', 'Self-reliance', 'Nothing bought abroad that can be made at home, however badly.', [['nq', 15], ['mod', 'prod', 0.05, PERM, 'Self-reliance'], ['mod', 'trade', -0.05, PERM, 'Self-reliance']]],
    ['tourists', 'Tourists on the coast', 'Beaches, hotels and foreign currency, behind a fence.', [['nq', -10], ['gold', 150], ['sup', 'intelligentsia', 6], ['charisma', -5]]],
    ['bunkers', 'A bunker for every citizen', 'Seven hundred thousand domes of concrete. The enemy will come; the bunkers will be ready.', [['nq', 15], ['mod', 'def', 0.10, PERM, 'A bunker for every citizen'], ['mod', 'prod', -0.03, PERM, 'Concrete before bread']]],
    ['thaw', 'The mountain thaw', 'The border opens, the portraits come down, and the Marshal becomes a man.', [['nq', -20], ['mod', 'ls', 3, PERM, 'The thaw'], ['mod', 'stab', 2, PERM, 'The thaw'], ['drift', 'conmon', 15]]],
    ['alone', 'Alone against the world', 'No allies, no debts, no foreign soldiers, no foreign ideas.', [['nq', 20], ['mod', 'def', 0.12, PERM, 'Alone against the world'], ['mod', 'coup', -0.3, PERM, 'Alone against the world'], ['charisma', 10]]],
  ]);
  proj('Meridia', 'me', [
    ['grid', 'The southern grid', 'One power network for the whole republic, run from one control room.', [['mod', 'prod', 0.05, PERM, 'Southern grid']]],
    ['machine', 'The machine planners', 'Calculating machines take over the model, and the model takes over the plan.', [['nq', 10], ['mod', 'eff', 0.06, PERM, 'Machine planners'], ['drift', 'cybernetic', 10]]],
    ['audit', 'The citizens’ audit', 'Any citizen may inspect the model and challenge it in court.', [['nq', 5], ['mod', 'legit', 4, PERM, 'Citizens’ audit'], ['particip', 6]]],
    ['sim', 'The national simulation', 'The whole economy in a room of machines, run forward a year every night.', [['nq', 10], ['mod', 'eff', 0.04, PERM, 'National simulation'], ['mod', 'sci', 0.05, PERM, 'National simulation']]],
    ['uni', 'The free universities', 'Tuition abolished, chairs multiplied, every province its institute.', [['mod', 'sci', 0.10, PERM, 'Free universities'], ['sup', 'intelligentsia', 6]]],
    ['optimal', 'The optimal republic', 'Nothing wasted, nothing guessed, nothing left to chance.', [['nq', 20], ['mod', 'eff', 0.06, PERM, 'Optimal republic'], ['mod', 'prod', 0.06, PERM, 'Optimal republic']]],
    ['science', 'The republic of science', 'Government by those who know, checked by everyone who wants to.', [['nq', 10], ['mod', 'sci', 0.12, PERM, 'Republic of science'], ['mod', 'legit', 4, PERM, 'Republic of science']]],
  ]);
  proj('Antara', 'an', [
    ['copper', 'The copper commission', 'Accountants in every mine office, counting what the companies take.', [['mod', 'rev', 0.04, PERM, 'Copper commission']]],
    ['invest', 'The foreign investment law', 'Guarantees for any company that builds here.', [['nq', -10], ['gold', 200], ['mod', 'prod', 0.05, PERM, 'Foreign investment']]],
    ['ours', 'The copper is ours', 'The great mines pass to the nation by unanimous vote of the congress.', [['nq', 25], ['mod', 'rev', 0.06, PERM, 'Our copper'], ['sup', 'capital', -8]]],
    ['progress', 'The alliance for progress', 'Credits, schools and roads, paid for by the north on conditions.', [['nq', -5], ['opAll', 6], ['mod', 'ls', 2, PERM, 'Alliance for progress']]],
    ['social', 'The social area of the economy', 'Banks, mines and the largest firms under public ownership.', [['nq', 10], ['mod', 'prod', 0.04, PERM, 'Social area'], ['sup', 'workers', 6]]],
    ['stable', 'The stable republic', 'Generals in their barracks, investors in their offices, the ballot respected.', [['nq', -10], ['mod', 'stab', 4, PERM, 'Stable republic'], ['mod', 'coup', -0.3, PERM, 'Stable republic']]],
    ['dignity', 'National dignity', 'A small country that owns its own mountains.', [['nq', 15], ['mod', 'legit', 6, PERM, 'National dignity'], ['mod', 'rev', 0.06, PERM, 'National dignity']]],
  ]);
  proj('Kelda', 'ke', [
    ['harbour', 'The deep-water harbour', 'Liners and tankers can dock without lighters.', [['mod', 'trade', 0.06, PERM, 'Deep-water harbour']]],
    ['open', 'The open island', 'Treaties with every power, books open to every inspector.', [['nq', -12], ['opAll', 8], ['mod', 'trade', 0.06, PERM, 'Open island']]],
    ['vault', 'The numbered accounts', 'A number instead of a name, and a vault under the cliffs.', [['nq', 15], ['gold', 250], ['mod', 'rev', 0.05, PERM, 'Numbered accounts']]],
    ['ships', 'The island fleet', 'Flags of convenience for any shipowner who wants one.', [['mod', 'trade', 0.08, PERM, 'Island fleet'], ['mod', 'def', 0.04, PERM, 'Island fleet']]],
    ['haven', 'The haven law', 'No extradition, no inquiry, no tax.', [['nq', 10], ['mod', 'rev', 0.06, PERM, 'Haven law'], ['opAll', -4]]],
    ['republic', 'A republic of freeholders', 'Kelda belongs to the people who live on it, and they are armed.', [['nq', -10], ['mod', 'stab', 4, PERM, 'Republic of freeholders'], ['mod', 'def', 0.08, PERM, 'Republic of freeholders']]],
    ['strongroom', 'The world’s strongroom', 'Every crisis anywhere sends its money here.', [['nq', 15], ['mod', 'rev', 0.12, PERM, 'World’s strongroom'], ['gold', 400]]],
  ]);
  proj('Vess', 'vs', [
    ['quay', 'The quay councils', 'Every quay elects its council and every council sends a delegate.', [['particip', 6], ['mod', 'trade', 0.04, PERM, 'Quay councils']]],
    ['fleet', 'The people’s fleet', 'The navy belongs to the councils, ship by ship.', [['nq', -15], ['mod', 'def', 0.06, PERM, 'People’s fleet'], ['particip', 6]]],
    ['red', 'The red cruiser', 'The cruiser refitted, re-armed and named for the revolution.', [['nq', 15], ['mod', 'atk', 0.06, PERM, 'Red cruiser'], ['mod', 'def', 0.06, PERM, 'Red cruiser']]],
    ['trawl', 'The trawler co-operative', 'Fifty trawlers, one catch, shared by the island.', [['mod', 'food', 0.07, PERM, 'Trawler co-operative']]],
    ['marines', 'The sailors’ brigade', 'The cruiser’s crew trained to fight ashore.', [['nq', 10], ['troops', 0.06], ['mod', 'atk', 0.05, PERM, 'Sailors’ brigade']]],
    ['commune', 'The island commune', 'No crew, no captains: only the councils.', [['nq', -15], ['mod', 'stab', 4, PERM, 'Island commune'], ['mod', 'legit', 4, PERM, 'Island commune'], ['sig', 10]]],
    ['beacon', 'The beacon of the north', 'The cruiser sails the coasts with leaflets and guns.', [['nq', 10], ['subvertNb', 15], ['mod', 'atk', 0.08, PERM, 'Beacon of the north']]],
  ]);

  /* more impact: the lasting effects of the national programmes are half as strong again */
  for (const b in ID.FOCUS.nations) for (const f of ID.FOCUS.nations[b]) if (!f.proj && !f.x15) for (const e of f.fx || []) if (e[0] === 'mod' && e[3] >= PERM && typeof e[2] === 'number') { e[2] = Math.round(e[2] * 1.5 * 1000) / 1000; f.x15 = 1; }

  /* ---------------------------------------------------------------- national chapters */
  const E = ID.EVENT_DEFS;
  const story = (o) => { o.sys = 1; o.story = 1; E.push(o); };
  const add = (b) => ID.STORY.push(b);
  const by = (G, b) => ID.byBase(G, b);
  const fig = (n, k) => (ID.Regime ? ID.Regime.figByKey(n, k) : null);
  const nm = (n, k, alt) => { const f = fig(n, k); return f ? f.name : alt; };

  add({ id: 'st_pv_shqiri', date: [1921, 11], nation: 'Pavon', cond: (G) => { const n = by(G, 'Pavon'); return n && n.ideo === 'personalist' && fig(n, 'shqiri'); } });
  story({ id: 'st_pv_shqiri', title: 'The Marshal’s suspicion', text: (n) => 'The Marshal has come to believe that ' + nm(n, 'shqiri', 'the head of state security') + ', his oldest comrade and the man everyone expects to succeed him, is a foreign agent. The evidence is a dream, an intercepted letter and a rumour from a cousin.',
    opts: [
      { label: 'He must go', hist: 1, tip: 'He will be found dead in his bedroom. The bulletin will say suicide.', fx: [['figPurge', 'police'], ['charisma', 6], ['circleLoy', 10], ['grievance', 8]] },
      { label: 'The Marshal is persuaded otherwise', fx: [['figLoy', 'police', 15], ['figHeir', 'police'], ['charisma', -4]] },
    ] });
  add({ id: 'st_ir_kalhor', date: [1925, 10], nation: 'Irkal', cond: (G) => { const n = by(G, 'Irkal'); return n && n.ideo === 'theocracy' && fig(n, 'kalhor'); } });
  story({ id: 'st_ir_kalhor', title: 'The general’s ambition', text: (n) => nm(n, 'kalhor', 'The commander of the guardians') + ' has marched his brigade into the holy city at dawn and asked the Council of the Learned, very politely, to proclaim him king.',
    opts: [
      { label: 'Crown the general', hist: 1, fx: [['figLeader', 'army'], ['ideology', 'absmon', 'coup']] },
      { label: 'The faithful stand together', fx: [['figPurge', 'army'], ['stab', -4], ['sig', 10], ['mod', 'atk', -0.06, 24, 'The army decapitated']] },
    ] });
  add({ id: 'st_no_crisis', date: [1935, 3], nation: 'Norvik', cond: (G) => { const n = by(G, 'Norvik'); return n && (n.ideo === 'conmon' || ID.ideo(n).family === 'liberal'); } });
  story({ id: 'st_no_crisis', title: 'The crisis agreement', text: (n) => 'Labour and the farmers’ party offer a bargain: guaranteed prices for the farmers, public works for the unemployed, and a Labour government under ' + nm(n, 'thrane', 'the Labour leader') + ' that respects the crown.',
    opts: [
      { label: 'Accept the bargain', hist: 1, fx: [['drift', 'socdem', 15], ['mod', 'stab', 3, 120, 'The crisis agreement'], ['sup', 'workers', 6], ['sup', 'peasants', 6], ['figHeir', 'economy']] },
      { label: 'No deals with the reds', fx: [['sup', 'capital', 6], ['mod', 'unrest', 3, 36, 'No deals'], ['figLoy', 'economy', -20]] },
    ] });
  add({ id: 'st_te_strike', date: [1918, 11], nation: 'Tessaly', cond: (G) => { const n = by(G, 'Tessaly'); return n && !n.civilOf; } });
  story({ id: 'st_te_strike', title: 'The general strike of the cantons', text: 'Two hundred and fifty thousand workers have stopped every train and every factory in the federation. They want a forty-eight hour week, votes for women and new elections. The army is mobilising in the farm cantons.',
    opts: [
      { label: 'The army occupies the cities', fx: [['mod', 'unrest', -5, 12, 'The cities occupied'], ['grievance', 12], ['sup', 'workers', -10], ['figLoy', 'army', 10]] },
      { label: 'The forty-eight hour week', hist: 1, fx: [['sup', 'workers', 8], ['sup', 'capital', -6], ['mod', 'prod', -0.02, 24, 'Shorter hours'], ['stab', 2]] },
    ] });
  add({ id: 'st_dr_treaty', date: [1920, 6], nation: 'Drava', cond: (G) => !!by(G, 'Drava') });
  story({ id: 'st_dr_treaty', title: 'The treaty in the palace', text: 'The powers have drawn Drava’s frontiers on a map in a palace far away. Two thirds of the old kingdom are on the other side of the line. The delegation has been told to sign by Friday.',
    opts: [
      { label: 'Sign, and swear revenge', hist: 1, fx: [['nq', 20], ['claimsAll'], ['sup', 'military', 6]] },
      { label: 'Sign, and mean it', fx: [['nq', -20], ['opAll', 8], ['sup', 'military', -6]] },
    ] });
  add({ id: 'st_ly_doge', date: [1923, 4], nation: 'Lys', cond: (G) => { const n = by(G, 'Lys'); return n && n.ideo === 'merchant' && fig(n, 'zane') && fig(n, 'tron'); } });
  story({ id: 'st_ly_doge', title: 'The election of a Doge', text: (n) => 'The Great Council meets to choose a new Doge, and there are two candidates. ' + nm(n, 'zane', 'The admiral') + ' wants a battery on every headland. ' + nm(n, 'tron', 'The ambassador') + ' wants a branch of the Bank in every capital.',
    opts: [
      { label: 'The admiral', fx: [['figLeader', 'army'], ['mod', 'def', 0.06, 120, 'The admiral’s dogeship'], ['nq', 10]] },
      { label: 'The ambassador', hist: 1, fx: [['figLeader', 'foreign'], ['mod', 'trade', 0.08, 120, 'The ambassador’s dogeship'], ['nq', -10]] },
    ] });
  add({ id: 'st_ru_congress', date: [1933, 6], nation: 'Ruthe', cond: (G) => { const n = by(G, 'Ruthe'); return n && n.ideo === 'natpop' && fig(n, 'bilyk'); } });
  story({ id: 'st_ru_congress', title: 'The second revolution', text: (n) => nm(n, 'bilyk', 'The commander of the legions') + ' has told the legion congress that the revolution is only half made, and that the legions will make the other half, with or without the Tribune.',
    opts: [
      { label: 'The legions become the army', hist: 1, fx: [['nq', -20], ['figLoy', 'army', -20], ['sup', 'military', 8]] },
      { label: 'The second revolution', fx: [['nq', 20], ['mod', 'atk', 0.06, 36, 'The second revolution'], ['figHeir', 'army'], ['grievance', 8]] },
    ] });
  add({ id: 'st_me_election', date: [1931, 9], nation: 'Meridia', cond: (G) => { const n = by(G, 'Meridia'); return n && n.ideo === 'technocracy'; } });
  story({ id: 'st_me_election', title: 'The election the model forbids', text: 'The founding charter promised an election every six years. The Directorate’s model predicts that holding one now would cost two points of growth and a point and a half of stability.',
    opts: [
      { label: 'Hold the election', fx: [['drift', 'liberal', 20], ['legitmod', 5, 24, 'The election held']] },
      { label: 'The model says no', hist: 1, fx: [['legitmod', -4, 36, 'Election postponed'], ['nq', 5], ['auth', 10]] },
    ] });
  add({ id: 'st_ke_refugees', date: [1933, 4], nation: 'Kelda', cond: (G) => !!by(G, 'Kelda') });
  story({ id: 'st_ke_refugees', title: 'Gold from the east', text: 'Refugees from the dictatorships are landing at the harbour with their savings sewn into their coats. Some want an account. Some want a passport. The bankers want the accounts and not the passports.',
    opts: [
      { label: 'The gold, and no questions', hist: 1, fx: [['gold', 250], ['nq', 10]] },
      { label: 'The gold and the people', fx: [['gold', 120], ['pop', 0.01], ['op', 'Hesperia', -15], ['op', 'Ruthe', -15], ['sup', 'intelligentsia', 6]] },
    ] });
  add({ id: 'st_vs_captain', date: [1912, 5], nation: 'Vess', cond: (G) => { const n = by(G, 'Vess'); return n && n.ideo === 'council' && fig(n, 'brekke'); } });
  story({ id: 'st_vs_captain', title: 'The captain’s demand', text: (n) => nm(n, 'brekke', 'The cruiser’s captain') + ' wants the harbour councils to name him commander of the island’s defence, with powers to match, “until the mainland makes peace”.',
    opts: [
      { label: 'Name him commander', fx: [['figHeir', 'army'], ['nq', 15], ['mod', 'def', 0.06, 60, 'The captain commands']] },
      { label: 'The councils keep command', hist: 1, fx: [['figLoy', 'army', -20], ['particip', 6]] },
    ] });

  ID.STORY.sort((a, b) => (a.date[0] - b.date[0]) * 12 + (a.date[1] - b.date[1]));
})();
