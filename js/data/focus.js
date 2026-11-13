/* IRON DIALECTIC — national programmes (focus trees) and the historical storyline of The Two Continents.
   Programme: { id, name, x, y, days, req, reqAny, excl, year, ideos, fams, can, fx, hist, ai, repeat, desc }
   hist marks the path a country took in history; with historical mode on, AI countries follow it.
   Effects use the vocabulary in sim/events.js, plus: ideology, claim, claimsAll, war, ally, op, build,
   techUp, law, subvert, civilwar, annex, peace, headline. Countries are named by their base name. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const F = (id, name, x, y, o) => Object.assign({ id, name, x, y, days: 120 }, o || {});
  const CITY = 1, FORT = 2, PORT = 3, FACT = 4, SILO = 5;
  const PERM = 600;

  /* ================================================================ GENERAL PROGRAMME (every state) */
  const general = [
    F('g_survey', 'Industrial survey', 0, 0, { desc: 'Count every mill, mine and seam, then build where it pays.', fx: [['build', FACT, 1]] }),
    F('g_heavy', 'Heavy industry drive', 0, 1, { req: ['g_survey'], desc: 'Steel first, everything else later.', fx: [['build', FACT, 1], ['mod', 'prod', 0.04, PERM, 'Heavy industry'], ['sup', 'workers', 2], ['gold', -80]] }),
    F('g_grid', 'National grid', 0, 2, { req: ['g_heavy'], year: 1925, desc: 'Pylons across the country and a dynamo in every works.', fx: [['mod', 'prod', 0.05, PERM, 'National grid'], ['gold', -60]] }),
    F('g_assembly', 'Assembly lines', 0, 3, { req: ['g_grid'], year: 1935, desc: 'Mass production for a mass age.', fx: [['build', FACT, 2], ['gold', -150]] }),
    F('g_auto', 'Automation', 0, 4, { req: ['g_assembly'], year: 1955, desc: 'Machines that tend machines.', fx: [['mod', 'eff', 0.04, PERM, 'Automation'], ['sup', 'workers', -4]] }),
    F('g_ext', 'Agricultural extension', 1, 0, { desc: 'Agronomists in every district, seed trials in every county.', fx: [['mod', 'food', 0.05, PERM, 'Extension service']] }),
    F('g_irrig', 'Irrigation works', 1, 1, { req: ['g_ext'], desc: 'Canals, sluices and pumping stations.', fx: [['mod', 'food', 0.06, PERM, 'Irrigation'], ['gold', -60], ['sup', 'peasants', 4]] }),
    F('g_mech', 'Mechanised farming', 1, 2, { req: ['g_irrig'], year: 1935, desc: 'Tractors replace oxen; the villages empty into the towns.', fx: [['mod', 'food', 0.06, PERM, 'Tractors'], ['sup', 'peasants', -3], ['sup', 'workers', 3], ['gold', -80]] }),
    F('g_staff', 'Staff college', 2, 0, { desc: 'Train officers who can read a map and a balance sheet.', fx: [['mod', 'atk', 0.05, PERM, 'Staff college'], ['sup', 'military', 4]] }),
    F('g_forts', 'Fortify the frontier', 2, 1, { req: ['g_staff'], desc: 'Concrete where the enemy is likeliest to come.', fx: [['build', FORT, 2]] }),
    F('g_motor', 'Motorisation', 2, 2, { req: ['g_forts'], year: 1928, desc: 'Lorries, tractors, the first tanks.', fx: [['tech', 250], ['mod', 'atk', 0.04, PERM, 'Motorisation']] }),
    F('g_air', 'Air arm', 2, 3, { req: ['g_motor'], year: 1936, desc: 'Squadrons, aerodromes, and the doctrine to use them.', fx: [['tech', 300], ['mod', 'def', 0.04, PERM, 'Air arm']] }),
    F('g_strat', 'Rocketry', 2, 4, { req: ['g_air'], year: 1955, desc: 'Rockets, radar and the engineers who understand them.', fx: [['tech', 400], ['mod', 'atk', 0.04, PERM, 'Rocketry']] }),
    F('g_census', 'National census', 3, 0, { desc: 'Know who lives where and what they owe.', fx: [['corr', -5], ['auth', 10], ['bureau', 4]] }),
    F('g_schools', 'Public schools', 3, 1, { req: ['g_census'], desc: 'A school in every village and a primer in every hand.', fx: [['sup', 'intelligentsia', 8], ['mod', 'sci', 0.1, PERM, 'Public schools'], ['gold', -60]] }),
    F('g_police', 'Reform the police', 3, 2, { req: ['g_schools'], desc: 'A professional constabulary instead of the old gendarmes.', fx: [['mod', 'unrest', -4, 60, 'Police reform'], ['sup', 'workers', -3], ['gold', -40]] }),
    F('g_radio', 'State radio', 3, 3, { req: ['g_police'], year: 1926, desc: 'One voice in every kitchen.', fx: [['legitmod', 3, 60, 'State radio'], ['sup', 'intelligentsia', -3]] }),
    F('g_service', 'Foreign service', 4, 0, { desc: 'Embassies in every capital and an ear at every table.', fx: [['opAll', 5]] }),
    F('g_trade', 'Trade missions', 4, 1, { req: ['g_service'], desc: 'Salesmen in diplomatic dress.', fx: [['mod', 'trade', 0.1, PERM, 'Trade missions']] }),
    F('g_neutral', 'Armed neutrality', 4, 2, { req: ['g_trade'], excl: ['g_protect'], desc: 'Friends with no one, ready for anyone.', fx: [['mod', 'def', 0.06, PERM, 'Armed neutrality']] }),
    F('g_protect', 'Seek a protector', 5, 2, { req: ['g_trade'], excl: ['g_neutral'], desc: 'Shelter under the strongest friendly power.', fx: [['protector']] }),
    F('g_rearm', 'Rearmament drive', 6, 0, { repeat: 4, days: 90, desc: 'New rifles, new guns, new men. Can be repeated every four years.', fx: [['equip', 0.06], ['troops', 0.05], ['sup', 'military', 4], ['gold', -60]] }),
    F('g_works', 'Public works', 6, 1, { repeat: 4, days: 90, desc: 'Roads, bridges and wages. Can be repeated every four years.', fx: [['mod', 'ls', 3, 24, 'Public works'], ['gold', -100], ['sup', 'workers', 4]] }),
    F('g_campaign', 'Propaganda season', 6, 2, { repeat: 3, days: 75, desc: 'Posters, parades and newsreels. Can be repeated every three years.', fx: [['legitmod', 3, 18, 'Propaganda season'], ['sup', 'intelligentsia', -4]] }),
  ];

  /* ================================================================ NATIONAL PROGRAMMES (The Two Continents) */
  const N = {};
  N.Aurelia = [
    F('au_council', 'The Emperor’s Council', 2, 0, { hist: 1, desc: 'Summon the great officers of state and decide what kind of empire this will be.', fx: [['auth', 15], ['tradition', 5]] }),
    F('au_okhrana', 'Strengthen the Okhrana', 1, 1, { hist: 1, req: ['au_council'], excl: ['au_manifesto'], ideos: ['absmon'], desc: 'The political police get money, agents and a free hand.', fx: [['law', 'security', 'secret'], ['sup', 'military', 6], ['grievance', 5]] }),
    F('au_manifesto', 'The October Manifesto', 3, 1, { req: ['au_council'], excl: ['au_okhrana'], desc: 'Grant a constitution before one is taken from you.', fx: [['ideology', 'conmon'], ['sup', 'intelligentsia', 12], ['sup', 'workers', 6], ['tradition', -10]] }),
    F('au_marches', 'Pacify the marches', 0, 2, { hist: 1, req: ['au_okhrana'], desc: 'Garrisons and governors for the restless borderlands.', fx: [['mod', 'unrest', -10, 24, 'Pacified marches'], ['claim', 'Drava']] }),
    F('au_rail', 'Railways to the east', 2, 2, { hist: 1, req: ['au_council'], desc: 'Lay track to the far provinces and the coal beneath them.', fx: [['build', FACT, 2], ['gold', -100]] }),
    F('au_duma', 'A Duma for the realm', 3, 2, { req: ['au_manifesto'], desc: 'An elected chamber, with the crown’s veto intact.', fx: [['mandate', 20], ['stab', 5], ['law', 'press', 'regulated']] }),
    F('au_land', 'Count Ivel’s land reform', 4, 3, { req: ['au_duma'], desc: 'Break up the commune and sell the land to the strong peasant.', fx: [['law', 'land', 'smallholder'], ['sup', 'peasants', 15], ['sup', 'capital', -8]] }),
    F('au_arsenal', 'The Imperial Arsenal', 1, 3, { hist: 1, req: ['au_rail'], year: 1912, desc: 'Guns cast at home, not bought from Hesperia.', fx: [['equip', 0.1], ['build', FORT, 2], ['sup', 'military', 6]] }),
    F('au_crowns', 'The Concert of Crowns', 2, 4, { hist: 1, reqAny: ['au_arsenal', 'au_duma'], year: 1912, desc: 'An alliance of thrones against the republics and the reds.', fx: [['ally', 'Norvik'], ['op', 'Irkal', 20]] }),
    F('au_crusade', 'Crusade against the unions', 0, 4, { req: ['au_marches'], year: 1913, ideos: ['absmon', 'theocracy'], desc: 'March on Verano and put the syndicates to the sword.', fx: [['claim', 'Verano'], ['war', 'Verano', 'claims']] }),
    F('au_restore', 'The Empire restored', 1, 5, { req: ['au_crowns'], year: 1925, desc: 'Every province the crown ever held, the crown will hold again.', fx: [['claimsAll'], ['tradition', 15], ['glory', 10]] }),
    F('au_peasant', 'Land and bread', 4, 5, { req: ['au_land'], year: 1920, desc: 'Give the countryside what it has been asking for since the emancipation.', fx: [['ideology', 'agrarian'], ['sup', 'peasants', 15]] }),
  ];
  N.Cassine = [
    F('ca_exchange', 'The Cassine Exchange', 2, 0, { hist: 1, desc: 'Open the busiest exchange on the continent to the world.', fx: [['conf', 10], ['gold', 80]] }),
    F('ca_navy', 'A blue-water navy', 0, 1, { hist: 1, req: ['ca_exchange'], desc: 'Ports and squadrons to keep the sea lanes open.', fx: [['build', PORT, 2], ['mod', 'def', 0.05, PERM, 'Navy']] }),
    F('ca_mills', 'Mills of the south', 2, 1, { hist: 1, req: ['ca_exchange'], desc: 'Let capital build. The state will hold the ladder.', fx: [['build', FACT, 2], ['sup', 'workers', -4], ['sup', 'capital', 5]] }),
    F('ca_charter', 'The Workers’ Charter', 4, 1, { req: ['ca_exchange'], desc: 'Recognise the unions before they stop asking.', fx: [['law', 'labor', 'free'], ['sup', 'workers', 12], ['sup', 'capital', -6]] }),
    F('ca_league', 'League of Free Nations', 1, 2, { hist: 1, req: ['ca_navy'], year: 1912, desc: 'A compact of the republics of the west.', fx: [['ally', 'Tessaly'], ['op', 'Norvik', 15]] }),
    F('ca_intervene', 'Interventionism', 0, 3, { req: ['ca_league'], excl: ['ca_isolate'], desc: 'Order abroad is security at home.', fx: [['claim', 'Drava'], ['mod', 'atk', 0.05, PERM, 'Expeditionary doctrine']] }),
    F('ca_isolate', 'Splendid isolation', 2, 3, { hist: 1, req: ['ca_league'], excl: ['ca_intervene'], desc: 'Let the old empires bleed each other.', fx: [['mod', 'def', 0.1, 120, 'Isolation'], ['we', -10]] }),
    F('ca_newdeal', 'A New Deal', 3, 3, { hist: 1, reqAny: ['ca_mills', 'ca_charter'], excl: ['ca_strong'], year: 1929, after: 'st_election32', desc: 'Save capitalism from the capitalists.', fx: [['ideology', 'socdem'], ['sup', 'workers', 15], ['sup', 'capital', -8]] }),
    F('ca_strong', 'The strongman’s hour', 4, 3, { reqAny: ['ca_mills', 'ca_charter'], excl: ['ca_newdeal'], year: 1929, desc: 'Parliament talks; the country wants a man who acts.', fx: [['ideology', 'natpop'], ['charisma', 15]] }),
    F('ca_arsenal', 'Arsenal of freedom', 2, 4, { hist: 1, reqAny: ['ca_isolate', 'ca_intervene', 'ca_newdeal'], year: 1936, desc: 'Turn the car plants to tanks.', fx: [['build', FACT, 2], ['equip', 0.1], ['gold', -100]] }),
    F('ca_bomb', 'The Desert Laboratory', 2, 5, { hist: 1, req: ['ca_arsenal'], year: 1941, desc: 'Physicists, a desert and a blank cheque.', fx: [['techUp', 'mil'], ['tech', 300]] }),
  ];
  N.Norvik = [
    F('no_council', 'The King in Council', 2, 0, { hist: 1, desc: 'Crown and Storting agree, for once, on what comes next.', fx: [['mandate', 10], ['tradition', 5]] }),
    F('no_fleet', 'The northern fleet', 1, 1, { hist: 1, req: ['no_council'], desc: 'The sea is our only road and our only wall.', fx: [['build', PORT, 2], ['mod', 'def', 0.05, PERM, 'Northern fleet']] }),
    F('no_fish', 'Fisheries and forests', 3, 1, { hist: 1, req: ['no_council'], desc: 'Timber and herring pay for everything else.', fx: [['mod', 'food', 0.08, PERM, 'Fisheries'], ['mod', 'trade', 0.1, PERM, 'Timber trade']] }),
    F('no_neutral', 'Armed neutrality', 1, 2, { hist: 1, req: ['no_fleet'], excl: ['no_crowns'], desc: 'We will trade with everyone and fight for no one.', fx: [['mod', 'def', 0.12, PERM, 'Neutrality'], ['opAll', 5]] }),
    F('no_crowns', 'Join the Concert of Crowns', 2, 2, { req: ['no_fleet'], excl: ['no_neutral'], desc: 'Stand with the old thrones.', fx: [['ally', 'Aurelia']] }),
    F('no_home', 'The People’s Home', 3, 2, { hist: 1, req: ['no_fish'], year: 1925, desc: 'A country should be a home for all its people.', fx: [['ideology', 'socdem'], ['sup', 'workers', 12]] }),
    F('no_line', 'Home front', 1, 3, { hist: 1, req: ['no_neutral'], year: 1937, desc: 'Every fjord a fortress.', fx: [['build', FORT, 3], ['mod', 'def', 0.1, PERM, 'Home front']] }),
    F('no_north', 'The Northern Alliance', 2, 4, { hist: 1, reqAny: ['no_line', 'no_home'], year: 1946, desc: 'Never neutral again.', fx: [['ally', 'Cassine']] }),
  ];
  N.Tessaly = [
    F('te_compact', 'The Social Compact', 2, 0, { hist: 1, desc: 'Employers and unions sign a peace treaty.', fx: [['sup', 'workers', 6], ['sup', 'capital', 6]] }),
    F('te_coops', 'Co-operative banks', 1, 1, { req: ['te_compact'], desc: 'Credit for the small producer.', fx: [['mod', 'eff', 0.04, PERM, 'Co-operative credit']] }),
    F('te_army', 'Citizen army', 3, 1, { hist: 1, req: ['te_compact'], desc: 'Every citizen a soldier, every soldier a citizen.', fx: [['mod', 'def', 0.1, PERM, 'Citizen army'], ['troops', 0.08]] }),
    F('te_league', 'Under the League’s umbrella', 2, 2, { hist: 1, req: ['te_army'], excl: ['te_neutral'], year: 1912, desc: 'Small republics survive together or not at all.', fx: [['ally', 'Cassine']] }),
    F('te_neutral', 'Neutral Tessaly', 4, 2, { req: ['te_army'], excl: ['te_league'], desc: 'A Switzerland of the west.', fx: [['opAll', 10], ['mod', 'def', 0.08, PERM, 'Neutral mountains']] }),
    F('te_welfare', 'The welfare state', 1, 2, { hist: 1, req: ['te_coops'], year: 1925, desc: 'From the cradle to the grave.', fx: [['mod', 'ls', 6, PERM, 'Welfare state'], ['sup', 'workers', 10]] }),
    F('te_beyond', 'Beyond the compact', 0, 3, { req: ['te_welfare'], year: 1930, desc: 'Why stop at redistribution?', fx: [['ideology', 'demsoc']] }),
    F('te_line', 'The Tessalian line', 3, 3, { hist: 1, reqAny: ['te_league', 'te_neutral'], year: 1936, desc: 'Pillboxes along every pass.', fx: [['build', FORT, 4]] }),
  ];
  N.Verano = [
    F('ve_congress', 'The Federation Congress', 2, 0, { hist: 1, desc: 'Delegates from every union and every village meet in the old opera house.', fx: [['particip', 10], ['fervor', 5]] }),
    F('ve_columns', 'Columns of the union', 1, 1, { hist: 1, req: ['ve_congress'], desc: 'Every workplace sends its column.', fx: [['troops', 0.1], ['mod', 'def', 0.08, PERM, 'Union columns']] }),
    F('ve_collect', 'Collectivise the land', 3, 1, { hist: 1, req: ['ve_congress'], desc: 'The estates belong to those who work them.', fx: [['law', 'land', 'commune'], ['sup', 'peasants', 8], ['mod', 'food', -0.05, 12, 'Collectivisation']] }),
    F('ve_strike', 'The international general strike', 0, 2, { hist: 1, req: ['ve_columns'], year: 1912, desc: 'Our example is our best weapon. Send it across every border.', fx: [['subvert', 'Aurelia', 14], ['subvert', 'Cassine', 10], ['subvert', 'Tessaly', 8]] }),
    F('ve_councils', 'All power to the councils', 2, 2, { req: ['ve_columns'], excl: ['ve_union'], desc: 'Unions are not enough: the councils must govern.', fx: [['ideology', 'council']] }),
    F('ve_union', 'One Big Union', 3, 2, { hist: 1, req: ['ve_collect'], excl: ['ve_councils'], desc: 'Every trade, one card.', fx: [['sup', 'workers', 12], ['mod', 'prod', 0.05, PERM, 'One Big Union']] }),
    F('ve_defend', 'Defend the revolution', 1, 3, { hist: 1, reqAny: ['ve_strike', 've_union'], year: 1925, desc: 'Trenches in the hills before the generals come.', fx: [['build', FORT, 3], ['mod', 'def', 0.12, 120, 'Defence committees']] }),
    F('ve_front', 'The Popular Front', 3, 3, { req: ['ve_union'], year: 1934, desc: 'Every enemy of the generals, under one banner.', fx: [['op', 'Tessaly', 25], ['op', 'Antara', 25], ['ally', 'Antara']] }),
    F('ve_free', 'The Free Territory', 2, 4, { req: ['ve_defend'], year: 1940, desc: 'Dissolve the federation into free communes.', fx: [['ideology', 'ancom']] }),
  ];
  N.Drava = [
    F('dr_proclaim', 'The Colonels’ Proclamation', 2, 0, { hist: 1, desc: 'Order, discipline, and an army that is paid on time.', fx: [['sup', 'military', 10], ['stab', 5]] }),
    F('dr_officers', 'Expand the officer corps', 1, 1, { hist: 1, req: ['dr_proclaim'], excl: ['dr_return'], desc: 'More colonels than any army our size has ever had.', fx: [['mod', 'atk', 0.08, PERM, 'Officer corps']] }),
    F('dr_return', 'Return to barracks', 3, 1, { req: ['dr_proclaim'], excl: ['dr_officers'], desc: 'Hand the country back to the politicians.', fx: [['ideology', 'liberal']] }),
    F('dr_irredenta', 'Dravan irredenta', 0, 2, { hist: 1, req: ['dr_officers'], desc: 'Maps of the greater Drava in every classroom.', fx: [['claim', 'Aurelia'], ['claim', 'Cassine']] }),
    F('dr_accord', 'The Steel Accord', 2, 2, { hist: 1, req: ['dr_officers'], year: 1912, desc: 'Allies far away are better than enemies next door.', fx: [['ally', 'Hesperia']] }),
    F('dr_generals', 'Aid the Veranese generals', 2, 3, { hist: 1, req: ['dr_accord'], year: 1935, desc: 'Guns and officers for the men who would end the syndicalist union.', fx: [['subvert', 'Verano', 18], ['op', 'Verano', -20]] }),
    F('dr_west', 'Strike west', 0, 4, { hist: 1, req: ['dr_irredenta'], year: 1939, after: 'st_second_war', desc: 'While Cassine looks east.', fx: [['war', 'Cassine', 'claims']] }),
  ];
  N.Lys = [
    F('ly_houses', 'The Council of Houses', 2, 0, { hist: 1, desc: 'The great families divide the year’s profits and the decade’s plans.', fx: [['sup', 'capital', 8], ['gold', 100]] }),
    F('ly_tolls', 'Toll the straits', 1, 1, { hist: 1, req: ['ly_houses'], desc: 'Every hull between the continents pays.', fx: [['mod', 'trade', 0.2, PERM, 'Straits tolls']] }),
    F('ly_galleys', 'Galleys of Lys', 3, 1, { hist: 1, req: ['ly_houses'], desc: 'A navy far larger than the island.', fx: [['build', PORT, 2], ['mod', 'def', 0.08, PERM, 'Lysian navy']] }),
    F('ly_neutral', 'The neutral straits', 1, 2, { hist: 1, req: ['ly_tolls'], desc: 'Open to every flag, closed to every war.', fx: [['opAll', 8]] }),
    F('ly_bank', 'Bank of the Two Continents', 2, 2, { req: ['ly_tolls'], desc: 'Lend to both sides of every war.', fx: [['gold', 250], ['op', 'Cassine', 15]] }),
    F('ly_east', 'Lean east', 3, 2, { req: ['ly_galleys'], excl: ['ly_west'], desc: 'Hesperia pays better.', fx: [['ally', 'Hesperia']] }),
    F('ly_west', 'Lean west', 4, 2, { req: ['ly_galleys'], excl: ['ly_east'], desc: 'Cassine pays more reliably.', fx: [['ally', 'Cassine']] }),
    F('ly_canal', 'The Lysian Canal', 2, 3, { hist: 1, reqAny: ['ly_neutral', 'ly_bank'], year: 1925, desc: 'Cut the isthmus and own the shortest route in the world.', fx: [['mod', 'trade', 0.25, PERM, 'Lysian Canal'], ['gold', -200], ['build', PORT, 1]] }),
  ];
  N.Karsova = [
    F('ka_commission', 'The Extraordinary Commission', 2, 0, { hist: 1, desc: 'The revolution has enemies. Find them.', fx: [['law', 'security', 'secret'], ['discipline', 10]] }),
    F('ka_warcomm', 'War communism', 1, 1, { hist: 1, req: ['ka_commission'], excl: ['ka_nep'], desc: 'Requisition the grain, militarise the factories.', fx: [['mod', 'prod', 0.1, 36, 'War communism'], ['sup', 'peasants', -12]] }),
    F('ka_nep', 'The New Economic Policy', 3, 1, { req: ['ka_commission'], excl: ['ka_warcomm'], desc: 'A step back to take two forward: markets for the peasant.', fx: [['ideology', 'marketsoc'], ['sup', 'peasants', 10]] }),
    F('ka_army', 'The Red Army', 1, 2, { hist: 1, req: ['ka_warcomm'], desc: 'Officers of the old army under commissars of the new.', fx: [['troops', 0.15], ['mod', 'atk', 0.05, PERM, 'Red Army']] }),
    F('ka_international', 'The Third International', 2, 2, { reqAny: ['ka_warcomm', 'ka_nep'], desc: 'A general staff of world revolution.', fx: [['subvert', 'Suyan', 15], ['subvert', 'Ruthe', 12], ['subvert', 'Pavon', 10]] }),
    F('ka_onecountry', 'Socialism in one country', 1, 3, { hist: 1, req: ['ka_army'], excl: ['ka_permanent'], year: 1925, after: 'st_congress', desc: 'Build the fortress before waiting for the world.', fx: [['discipline', 15], ['build', FACT, 2]] }),
    F('ka_permanent', 'Permanent revolution', 3, 3, { req: ['ka_army'], excl: ['ka_onecountry'], year: 1925, desc: 'The revolution survives only by spreading.', fx: [['ideology', 'trot'], ['fervor', 20]] }),
    F('ka_plan', 'The first Five-Year Plan', 1, 4, { hist: 1, req: ['ka_onecountry'], desc: 'Magnitogorsks on the steppe.', fx: [['build', FACT, 3], ['gold', -150], ['sup', 'peasants', -6]] }),
    F('ka_purge', 'The Great Purge', 0, 5, { hist: 1, req: ['ka_plan'], year: 1936, desc: 'No one is above suspicion. Especially not the generals.', fx: [['discipline', 25], ['grievance', 15], ['mod', 'atk', -0.1, 24, 'Purged officers'], ['sup', 'intelligentsia', -15]] }),
    F('ka_patriotic', 'The patriotic war', 1, 6, { hist: 1, req: ['ka_plan'], year: 1941, desc: 'Not for the party: for the motherland.', fx: [['mod', 'def', 0.15, 60, 'Patriotic war'], ['troops', 0.1], ['sup', 'clergy', 10]] }),
    F('ka_lightning', 'First lightning', 2, 6, { hist: 1, req: ['ka_plan'], year: 1947, desc: 'Our own bomb, four years behind theirs.', fx: [['techUp', 'mil'], ['tech', 300]] }),
    F('ka_thaw', 'The thaw', 2, 7, { hist: 1, reqAny: ['ka_patriotic', 'ka_lightning'], year: 1956, after: 'st_secret', desc: 'Open the camps, read the speech, let the writers write.', fx: [['dist', -15], ['grievance', -15], ['sup', 'intelligentsia', 12]] }),
  ];
  N.Ruthe = [
    F('ru_march', 'The march on the capital', 2, 0, { hist: 1, desc: 'Fifty thousand in black shirts on the boulevards.', fx: [['charisma', 10], ['mandate', 10]] }),
    F('ru_greater', 'The Greater Homeland', 1, 1, { hist: 1, req: ['ru_march'], desc: 'Every map in the country shows the old borders.', fx: [['claimsAll']] }),
    F('ru_legions', 'The movement’s legions', 3, 1, { hist: 1, req: ['ru_march'], desc: 'The party’s militia becomes an army.', fx: [['troops', 0.08], ['sup', 'military', 5]] }),
    F('ru_accord', 'Join the Steel Accord', 2, 2, { hist: 1, req: ['ru_greater'], excl: ['ru_alone'], year: 1912, desc: 'Hesperia will help us take back what was ours.', fx: [['ally', 'Hesperia']] }),
    F('ru_alone', 'Ruthe alone', 0, 2, { req: ['ru_greater'], excl: ['ru_accord'], desc: 'No foreign master, not even a friendly one.', fx: [['mod', 'def', 0.15, 120, 'Ruthe alone']] }),
    F('ru_north', 'Reclaim the north', 1, 3, { hist: 1, req: ['ru_accord'], year: 1914, after: 'st_shots', desc: 'The Karsovan reds hold Ruthene villages.', fx: [['claim', 'Karsova'], ['war', 'Karsova', 'claims']] }),
    F('ru_fever', 'The fever breaks', 3, 3, { req: ['ru_legions'], desc: 'Dissolve the legions and call elections.', fx: [['ideology', 'liberal']] }),
  ];
  N.Suyan = [
    F('su_villages', 'Assembly of ten thousand villages', 2, 0, { hist: 1, desc: 'Every village sends an elder; the elders decide.', fx: [['particip', 10], ['sup', 'peasants', 8]] }),
    F('su_dikes', 'Dikes and granaries', 1, 1, { hist: 1, req: ['su_villages'], desc: 'The river floods every eleven years. Not again.', fx: [['mod', 'food', 0.12, PERM, 'Dikes and granaries']] }),
    F('su_warlords', 'Bind the warlords', 3, 1, { hist: 1, req: ['su_villages'], desc: 'Titles and pensions for the provincial strongmen.', fx: [['mod', 'unrest', -8, 60, 'Bound warlords'], ['auth', 10]] }),
    F('su_oldways', 'The old ways', 1, 2, { hist: 1, req: ['su_dikes'], excl: ['su_strength'], desc: 'What served our grandfathers will serve us.', fx: [['tradition', 15], ['stab', 5]] }),
    F('su_strength', 'Self-strengthening', 2, 2, { req: ['su_dikes'], excl: ['su_oldways'], desc: 'Western machines, Suyanese spirit.', fx: [['build', FACT, 2], ['tradition', -10]] }),
    F('su_resist', 'The long resistance', 1, 3, { hist: 1, req: ['su_oldways'], year: 1936, desc: 'Trade space for time. The invader will drown in our country.', fx: [['mod', 'def', 0.15, 120, 'Long resistance']] }),
    F('su_army', 'The peasant army', 3, 3, { req: ['su_warlords'], year: 1940, desc: 'The villages arm themselves under a new banner.', fx: [['ideology', 'mao']] }),
  ];
  N.Hesperia = [
    F('he_chambers', 'The corporative chambers', 2, 0, { hist: 1, desc: 'Labour and capital, seated in the same hall, facing the same flag.', fx: [['sup', 'workers', 5], ['sup', 'capital', 5]] }),
    F('he_rearm', 'Rearmament', 1, 1, { hist: 1, req: ['he_chambers'], desc: 'Shipyards and gun foundries running three shifts.', fx: [['build', FACT, 2], ['equip', 0.08]] }),
    F('he_grain', 'The battle for grain', 3, 1, { hist: 1, req: ['he_chambers'], desc: 'Self-sufficiency in bread before anything else.', fx: [['law', 'trade', 'autarky'], ['mod', 'food', 0.08, PERM, 'Battle for grain']] }),
    F('he_accord', 'Found the Steel Accord', 1, 2, { hist: 1, req: ['he_rearm'], year: 1912, desc: 'The new nations against the old empires and the reds.', fx: [['ally', 'Pavon'], ['ally', 'Drava']] }),
    F('he_suyan', 'Drive into Suyan', 0, 3, { hist: 1, req: ['he_accord'], year: 1915, desc: 'Ten thousand villages and no army worth the name.', fx: [['claim', 'Suyan'], ['war', 'Suyan', 'claims']] }),
    F('he_leader', 'The Leader principle', 2, 3, { hist: 1, req: ['he_accord'], excl: ['he_experts'], year: 1932, after: 'st_leader', desc: 'The chambers advise. One man decides.', fx: [['ideology', 'personalist'], ['charisma', 15]] }),
    F('he_experts', 'The directory of experts', 3, 3, { req: ['he_grain'], excl: ['he_leader'], year: 1932, desc: 'Hand the state to the engineers.', fx: [['ideology', 'technocracy']] }),
    F('he_pavon', 'Union with Pavon', 1, 4, { hist: 1, req: ['he_leader'], year: 1938, desc: 'One people, one state.', fx: [['claim', 'Pavon']] }),
    F('he_south', 'The southern sphere', 0, 5, { hist: 1, req: ['he_pavon'], year: 1939, after: 'st_second_war', desc: 'Antara’s socialists are a knife at our back.', fx: [['claim', 'Antara'], ['war', 'Antara', 'claims']] }),
    F('he_wonder', 'Wonder weapons', 2, 5, { reqAny: ['he_pavon', 'he_experts'], year: 1943, desc: 'Rockets, jets and the hope of a miracle.', fx: [['techUp', 'mil'], ['build', SILO, 1]] }),
  ];
  N.Irkal = [
    F('ir_council', 'The Council of the Faithful', 2, 0, { hist: 1, desc: 'The guardians sit in judgement over the realm.', fx: [['sup', 'clergy', 8]] }),
    F('ir_seminaries', 'Seminaries in every town', 1, 1, { hist: 1, req: ['ir_council'], desc: 'Teach the young before the godless do.', fx: [['tradition', 10], ['sup', 'intelligentsia', -5]] }),
    F('ir_missions', 'Missions beyond the mountains', 3, 1, { hist: 1, req: ['ir_council'], desc: 'Preachers into the Karsovan and Suyanese villages.', fx: [['subvert', 'Karsova', 12], ['subvert', 'Suyan', 10]] }),
    F('ir_holy', 'Holy war on the godless', 1, 2, { hist: 1, req: ['ir_seminaries'], excl: ['ir_reformed'], year: 1914, after: 'st_shots', desc: 'Karsova has closed the churches. The faithful will open them.', fx: [['war', 'Karsova', 'holy']] }),
    F('ir_reformed', 'The reformed faith', 3, 2, { req: ['ir_missions'], excl: ['ir_holy'], desc: 'A creed for the modern age, and a crown to protect it.', fx: [['ideology', 'conmon'], ['tradition', -10]] }),
    F('ir_oil', 'Oil beneath the sands', 2, 3, { hist: 1, reqAny: ['ir_holy', 'ir_reformed'], year: 1925, desc: 'Black gold, and foreign companies eager to pump it.', fx: [['gold', 300], ['mod', 'trade', 0.15, PERM, 'Oil exports']] }),
    F('ir_shah', 'The shah’s crown', 1, 4, { req: ['ir_oil'], year: 1930, desc: 'A king to stand above the quarrelling clerics.', fx: [['ideology', 'absmon']] }),
  ];
  N.Pavon = [
    F('pa_portrait', 'A portrait in every office', 2, 0, { hist: 1, desc: 'The Marshal watches over every desk in the land.', fx: [['charisma', 12]] }),
    F('pa_guard', 'The Marshal’s guard', 1, 1, { hist: 1, req: ['pa_portrait'], desc: 'Picked men, sworn to him personally.', fx: [['law', 'security', 'secret'], ['sup', 'military', 8]] }),
    F('pa_heir', 'Name the heir', 3, 1, { req: ['pa_portrait'], desc: 'Settle the succession while the Marshal lives.', fx: [['flag', 'heir'], ['auth', -10]] }),
    F('pa_accord', 'Hesperian protection', 2, 2, { hist: 1, req: ['pa_guard'], year: 1912, desc: 'A powerful friend to the south.', fx: [['ally', 'Hesperia']] }),
    F('pa_staff', 'Rule of the general staff', 1, 3, { hist: 1, req: ['pa_guard'], excl: ['pa_dynasty'], year: 1922, after: 'st_marshal', desc: 'When the Marshal goes, the generals will govern.', fx: [['ideology', 'junta', 'succession'], ['sup', 'military', 8], ['mod', 'atk', 0.05, PERM, 'General staff']] }),
    F('pa_dynasty', 'Found a dynasty', 3, 3, { req: ['pa_heir'], excl: ['pa_staff'], year: 1920, desc: 'The Marshal’s son will wear a crown.', fx: [['ideology', 'absmon']] }),
    F('pa_ruthe', 'The Ruthene question', 2, 4, { reqAny: ['pa_staff', 'pa_dynasty'], desc: 'Half of Ruthe speaks our language.', fx: [['claim', 'Ruthe']] }),
  ];
  N.Meridia = [
    F('me_directorate', 'The Directorate of Experts', 2, 0, { hist: 1, desc: 'Engineers in every ministry.', fx: [['tech', 100], ['sup', 'intelligentsia', 8]] }),
    F('me_grid', 'The southern grid', 1, 1, { hist: 1, req: ['me_directorate'], desc: 'Dams on every river that falls to the sea.', fx: [['build', FACT, 2], ['mod', 'prod', 0.05, PERM, 'Southern grid']] }),
    F('me_poly', 'The Polytechnic', 3, 1, { hist: 1, req: ['me_directorate'], desc: 'The best scientists on two continents, at the best salaries.', fx: [['mod', 'sci', 0.15, PERM, 'Polytechnic']] }),
    F('me_entente', 'The southern entente', 1, 2, { hist: 1, req: ['me_grid'], year: 1930, desc: 'Antara is a socialist neighbour, but a neighbour against Hesperia.', fx: [['ally', 'Antara']] }),
    F('me_network', 'The Network', 2, 2, { req: ['me_poly'], excl: ['me_charter'], year: 1950, desc: 'Let the machines plan.', fx: [['ideology', 'cybernetic']] }),
    F('me_charter', 'A constitution for experts', 3, 2, { req: ['me_poly'], excl: ['me_network'], desc: 'Results, and rights.', fx: [['ideology', 'liberal']] }),
    F('me_sunstone', 'Project Sunstone', 1, 3, { hist: 1, req: ['me_grid'], year: 1940, desc: 'The atom, split in the southern desert.', fx: [['techUp', 'mil'], ['build', SILO, 1]] }),
    F('me_orbit', 'Toward orbit', 2, 4, { hist: 1, req: ['me_sunstone'], year: 1955, desc: 'A rocket for science, not war. Mostly.', fx: [['tech', 500]] }),
  ];
  N.Antara = [
    F('an_programme', 'The socialist programme', 2, 0, { hist: 1, desc: 'Socialism through the ballot box, sector by sector.', fx: [['sup', 'workers', 10]] }),
    F('an_copper', 'Nationalise the copper mines', 1, 1, { hist: 1, req: ['an_programme'], desc: 'The mountains belong to Antara, not to Cassine’s banks.', fx: [['cnt', 'nationalized', 1], ['sup', 'workers', 8], ['sup', 'capital', -16], ['conf', -12], ['mod', 'pow_capital', -0.15, 600, 'Socialised sector'], ['later', 4, 'nationalisation_backlash'], ['note', 'Counts as a socialised sector; revenue +4% for good']] }),
    F('an_generals', 'Constitutional generals', 3, 1, { req: ['an_programme'], desc: 'Promote the officers who respect the constitution.', fx: [['sup', 'military', 12]] }),
    F('an_unity', 'Popular Unity', 2, 2, { hist: 1, req: ['an_copper'], excl: ['an_accommodate'], year: 1930, desc: 'A coalition of every party of the left.', fx: [['sup', 'workers', 10], ['op', 'Verano', 25]] }),
    F('an_accommodate', 'Accommodate the opposition', 3, 2, { req: ['an_generals'], excl: ['an_unity'], desc: 'Slow down to survive.', fx: [['ideology', 'socdem']] }),
    F('an_land', 'Agrarian reform', 1, 3, { hist: 1, req: ['an_unity'], year: 1940, desc: 'The haciendas to the peasants.', fx: [['law', 'land', 'commune'], ['sup', 'peasants', 12], ['sup', 'capital', -10]] }),
  ];
  N.Kelda = [
    F('ke_charter', 'The Freeholders’ Charter', 2, 0, { hist: 1, desc: 'The fewer laws, the freer the island.', fx: [['sup', 'capital', 8], ['conf', 10]] }),
    F('ke_port', 'Free port of Kelda', 1, 1, { hist: 1, req: ['ke_charter'], desc: 'No duties, no questions.', fx: [['build', PORT, 2], ['mod', 'trade', 0.2, PERM, 'Free port']] }),
    F('ke_rifles', 'Every man a rifle', 3, 1, { hist: 1, req: ['ke_charter'], desc: 'An island of marksmen.', fx: [['mod', 'def', 0.15, PERM, 'Armed freeholders']] }),
    F('ke_haven', 'Haven of capital', 1, 2, { hist: 1, req: ['ke_port'], desc: 'Every fortune that fears its own government banks here.', fx: [['gold', 200]] }),
    F('ke_company', 'The Company Charter', 2, 3, { req: ['ke_haven'], year: 1925, desc: 'Let the largest firm run the island outright.', fx: [['ideology', 'merchant']] }),
  ];
  N.Vess = [
    F('vs_docks', 'The dockers’ congress', 2, 0, { hist: 1, desc: 'The harbour unions take the island.', fx: [['particip', 10], ['sup', 'workers', 8]] }),
    F('vs_mines', 'Miners’ self-management', 1, 1, { hist: 1, req: ['vs_docks'], desc: 'The pits run by the pitmen.', fx: [['mod', 'prod', 0.08, PERM, 'Self-managed mines']] }),
    F('vs_fleet', 'The red fleet', 3, 1, { req: ['vs_docks'], desc: 'The mutineers keep their ships.', fx: [['build', PORT, 2]] }),
    F('vs_export', 'Councils across the water', 2, 2, { hist: 1, req: ['vs_mines'], excl: ['vs_party'], desc: 'Every port in the north has dockers.', fx: [['subvert', 'Aurelia', 15], ['subvert', 'Norvik', 10]] }),
    F('vs_party', 'A party for the councils', 3, 2, { req: ['vs_fleet'], excl: ['vs_export'], desc: 'Discipline, before the mainland comes for us.', fx: [['ideology', 'ml']] }),
    F('vs_federate', 'Federation with Verano', 1, 3, { hist: 1, req: ['vs_export'], year: 1930, desc: 'Two free territories, one federation.', fx: [['op', 'Verano', 30], ['ally', 'Verano']] }),
  ];

  ID.FOCUS = { general, nations: N };

  /* ================================================================ THE STORYLINE OF THE TWO CONTINENTS
     World beats run their fx at the date. Nation beats are dispatches: the player chooses, the AI takes
     the historical option (hist) in historical mode and chooses freely otherwise. In free mode each beat
     happens only with probability alt. */
  const E = ID.EVENT_DEFS;
  const story = (o) => { o.sys = 1; o.story = 1; E.push(o); return o; };
  const by = (G, b) => ID.byBase(G, b);
  ID.STORY = [
    { id: 'st_straits', date: [1911, 4], nation: 'Lys' },
    { id: 'st_accord', date: [1912, 6], title: 'The Steel Accord', run: (G) => { ID.storyBloc(G, 'Hesperia', ['Pavon', 'Drava', 'Ruthe']); ID.headline(G, { kicker: 'Treaty of Hesperia', title: 'The Steel Accord', sub: 'Hesperia, Pavon, Drava and Ruthe bind themselves together against the old empires and the reds.', tone: 'war' }); } },
    { id: 'st_crowns', date: [1912, 10], title: 'The Concert of Crowns', run: (G) => { ID.storyBloc(G, 'Aurelia', ['Norvik', 'Irkal']); ID.headline(G, { kicker: 'An alliance of thrones', title: 'The Concert of Crowns', sub: 'Aurelia, Norvik and Irkal stand together for crown, altar and order.', tone: 'pol' }); } },
    { id: 'st_shots', date: [1914, 7], title: 'The Great War', cond: (G) => by(G, 'Aurelia') && by(G, 'Drava'),
      run: (G) => { ID.headline(G, { kicker: 'Shots in Drava', title: 'The Great War', sub: 'An Aurelian prince is shot in the Dravan capital. Within a month the two continents are at war.', tone: 'war' }); ID.storyWar(G, 'Aurelia', 'Drava', 'claims', 'An Aurelian prince has been shot dead in Drava. The court demands vengeance.'); ID.storyWar(G, 'Pavon', 'Karsova', 'containment', 'The Steel Accord moves against the reds while the west is busy.'); ID.storyWar(G, 'Ruthe', 'Karsova', 'claims', 'Ruthe marches north to reclaim its villages from the Karsovan reds.'); } },
    { id: 'st_cassine_enters', date: [1916, 4], nation: 'Cassine', cond: (G) => { const c = by(G, 'Cassine'), d = by(G, 'Drava'); return c && d && !ID.sameBloc(G, c.id, d.id) && !ID.atWar(G, c.id, d.id); } },
    { id: 'st_february', date: [1917, 3], nation: 'Aurelia', cond: (G) => { const a = by(G, 'Aurelia'); return a && (a.ideo === 'absmon' || a.ideo === 'conmon'); } },
    { id: 'st_october', date: [1917, 11], nation: 'Aurelia', cond: (G) => { const a = by(G, 'Aurelia'); return a && ID.ideo(a).family !== 'socialist' && ID.ideo(a).family !== 'anarchist' && !a.civil; } },
    { id: 'st_armistice', date: [1918, 11], title: 'Armistice', run: (G) => { const n = ID.storyPeace(G, ['Aurelia', 'Drava', 'Cassine', 'Pavon', 'Karsova', 'Ruthe', 'Hesperia', 'Suyan', 'Irkal', 'Norvik', 'Tessaly']); if (n) ID.headline(G, { kicker: 'The eleventh hour', title: 'Armistice', sub: 'The guns fall silent across the two continents. Nobody is quite sure who won.', tone: 'rev' }); } },
    { id: 'st_marshal', date: [1924, 1], nation: 'Pavon', cond: (G) => { const p = by(G, 'Pavon'); return p && p.ideo === 'personalist'; } },
    { id: 'st_congress', date: [1925, 12], nation: 'Karsova', cond: (G) => { const k = by(G, 'Karsova'); return k && k.ideo === 'ml'; } },
    { id: 'st_election32', date: [1932, 11], nation: 'Cassine', cond: (G) => { const c = by(G, 'Cassine'); return c && c.ideo === 'liberal'; } },
    { id: 'st_leader', date: [1933, 1], nation: 'Hesperia', cond: (G) => { const h = by(G, 'Hesperia'); return h && h.ideo === 'corporatist'; } },
    { id: 'st_generals', date: [1936, 7], nation: 'Verano', cond: (G) => { const v = by(G, 'Verano'); return v && (ID.ideo(v).family === 'anarchist' || v.ideo === 'council') && !v.civil; } },
    { id: 'st_second_suyan', date: [1937, 7], title: 'The Second Suyan War', cond: (G) => by(G, 'Hesperia') && by(G, 'Suyan'),
      run: (G) => ID.storyWar(G, 'Hesperia', 'Suyan', 'claims', 'Night manoeuvres at the river bridge end in gunfire. The army wants the rest of Suyan.') },
    { id: 'st_union', date: [1938, 3], nation: 'Hesperia', cond: (G) => { const h = by(G, 'Hesperia'), p = by(G, 'Pavon'); return h && p && ID.borders(G, h.id, p.id) && !ID.atWar(G, h.id, p.id) && ID.ideo(h).family !== 'socialist'; } },
    { id: 'st_second_war', date: [1939, 9], title: 'The Second Great War', cond: (G) => { const h = by(G, 'Hesperia'); return h && ['personalist', 'corporatist', 'junta', 'natpop'].indexOf(h.ideo) >= 0; },
      run: (G) => { ID.headline(G, { kicker: 'Again', title: 'The Second Great War', sub: 'Hesperia strikes south into Antara. Cassine declares war within the week.', tone: 'war' }); ID.storyWar(G, 'Hesperia', 'Antara', 'claims', 'The general staff’s southern plan is ready. Antara’s socialists have no allies who can reach them in time.'); ID.storyWar(G, 'Cassine', 'Hesperia', 'containment', 'Hesperia has invaded Antara. Our guarantee is on the table.'); ID.storyWar(G, 'Drava', 'Cassine', 'claims', 'With Cassine’s fleet sailing east, the colonels see their chance.'); } },
    { id: 'st_east', date: [1941, 6], title: 'Operation Thunder', cond: (G) => { const h = by(G, 'Hesperia'), k = by(G, 'Karsova'); return h && k && ID.borders(G, h.id, k.id) && !ID.atWar(G, h.id, k.id) && ['personalist', 'corporatist', 'junta', 'natpop'].indexOf(h.ideo) >= 0; },
      run: (G) => { ID.headline(G, { kicker: 'Without warning', title: 'Thunder in the east', sub: 'Hesperian columns pour across the Karsovan frontier.', tone: 'war' }); ID.storyWar(G, 'Hesperia', 'Karsova', 'containment', 'Karsova is the last power that could stop us. Strike now, while it purges its own generals.'); } },
    { id: 'st_sunrise', date: [1945, 7], title: 'Sunrise over the desert', cond: (G) => !!(by(G, 'Cassine') || by(G, 'Meridia')),
      run: (G) => { const c = by(G, 'Cassine') || by(G, 'Meridia'); c.tech.mil = Math.max(c.tech.mil, 6); ID.headline(G, { kicker: 'A new kind of weapon', title: 'Sunrise over the desert', sub: c.name + ' tests an atomic device. The flash is seen two hundred miles away.', tone: 'bad', a: c.id }); ID.chron(G, 'nuke', c.name + ' becomes the first atomic power.', c.id); } },
    { id: 'st_peace45', date: [1945, 9], title: 'The Second Peace', run: (G) => { const n = ID.storyPeace(G, ['Hesperia', 'Antara', 'Cassine', 'Drava', 'Karsova', 'Meridia', 'Suyan', 'Pavon', 'Norvik', 'Tessaly']); if (n) ID.headline(G, { kicker: 'Unconditional', title: 'The Second Peace', sub: 'The guns stop. The victors begin dividing the world between them.', tone: 'rev' }); } },
    { id: 'st_curtain', date: [1947, 3], title: 'The Iron Curtain', run: (G) => { ID.storyBloc(G, 'Cassine', ['Norvik', 'Tessaly', 'Lys', 'Kelda']); ID.storyBloc(G, 'Karsova', ['Vess']); ID.headline(G, { kicker: 'Two camps', title: 'The iron curtain falls', sub: 'From the northern sea to the southern straits, the world divides into two blocs.', tone: 'pol' }); } },
    { id: 'st_suyan_rev', date: [1949, 10], nation: 'Suyan', cond: (G) => { const s = by(G, 'Suyan'); return s && ID.ideo(s).family !== 'socialist' && !s.civil; } },
    { id: 'st_secret', date: [1956, 2], nation: 'Karsova', cond: (G) => { const k = by(G, 'Karsova'); return k && (k.ideo === 'ml' || k.ideo === 'personalist'); } },
    { id: 'st_straits_crisis', date: [1962, 10], title: 'The Straits Crisis', cond: (G) => by(G, 'Lys') && by(G, 'Karsova') && by(G, 'Cassine'),
      run: (G) => { const k = by(G, 'Karsova'), c = by(G, 'Cassine'); ID.addOpBoth(G, k.id, c.id, -25); G.world.tension = Math.min(100, G.world.tension + 30); ID.headline(G, { kicker: 'Thirteen days', title: 'The Straits Crisis', sub: 'Karsovan missiles on Lys. Cassine’s fleet blockades the straits. The world holds its breath.', tone: 'bad', a: k.id, b: c.id }); } },
    { id: 'st_68', date: [1968, 5], title: 'The year of the barricades', run: (G) => { for (const b of ['Cassine', 'Tessaly', 'Norvik', 'Karsova']) { const n = by(G, b); if (!n) continue; ID.Events.applyFx(G, n, [['unrest', 10], ['sup', 'intelligentsia', -10], ['stab', -4]]); } ID.headline(G, { kicker: 'Under the paving stones, the beach', title: 'The year of the barricades', sub: 'Students and young workers take the streets in a dozen capitals at once.', tone: 'rev' }); } },
    { id: 'st_antara_coup', date: [1973, 9], nation: 'Antara', cond: (G) => { const a = by(G, 'Antara'); return a && (a.ideo === 'demsoc' || a.ideo === 'socdem' || a.ideo === 'marketsoc'); } },
  ];

  /* ---- story dispatches (nation beats) */
  story({ id: 'st_straits', title: 'The straits question', text: 'Hesperia and Aurelia both ask for exclusive passage for their warships through the straits. Each offers a great deal of money.',
    opts: [{ label: 'Keep the straits neutral', hist: 1, fx: [['opAll', 6], ['gold', 60]] }, { label: 'Sell passage to Hesperia', fx: [['gold', 200], ['ally', 'Hesperia']] }, { label: 'Sell passage to Aurelia', fx: [['gold', 200], ['op', 'Aurelia', 30]] }] });
  story({ id: 'st_cassine_enters', title: 'The sinking of the Meridian Star', text: 'A Dravan raider has sunk a Cassine liner with four hundred passengers aboard. The newspapers demand war; the bankers would rather not.',
    opts: [{ label: 'Declare war on Drava', hist: 1, fx: [['war', 'Drava', 'containment'], ['glory', 5]] }, { label: 'Demand reparations and stay out', fx: [['gold', 80], ['mandate', -6]] }] });
  story({ id: 'st_february', title: 'The February days', text: 'Bread queues have become crowds, and the crowds have become a revolution. The guards regiments are refusing to fire. The Emperor’s ministers say he must abdicate.',
    opts: [{ label: 'Abdicate in favour of a provisional government', hist: 1, tip: 'The empire becomes a liberal republic overnight.', fx: [['ideology', 'liberal', 'revolution']] }, { label: 'Send in the loyal guards', tip: 'Some of the army will fight for the throne. Much of the country will not.', fx: [['civilwar', 'liberal', 0.45]] }] });
  story({ id: 'st_october', title: 'All power to the councils', text: 'The councils of workers’ and soldiers’ deputies have their own government in all but name. Tonight their red guards are moving on the ministries.',
    opts: [{ label: 'Fight the councils', hist: 1, tip: 'A civil war between the government and the councils.', fx: [['civilwar', 'council', 0.42]] }, { label: 'Hand power to the councils', tip: 'The country becomes a council republic.', fx: [['ideology', 'council', 'revolution']] }, { label: 'Call in the generals', tip: 'A military dictatorship crushes the councils, and the republic with them.', fx: [['ideology', 'junta', 'coup']] }] });
  story({ id: 'st_marshal', title: 'The Marshal is dead', text: 'The Marshal died in his sleep. The radio has played funeral music for six hours. In the general staff building, the lights are on all night.',
    opts: [{ label: 'The generals govern', hist: 1, fx: [['ideology', 'junta', 'succession']] }, { label: 'Crown the Marshal’s son', fx: [['ideology', 'absmon', 'succession']] }, { label: 'Hold elections', fx: [['ideology', 'liberal', 'reform'], ['stab', -6]] }] });
  story({ id: 'st_congress', title: 'The Fourteenth Congress', text: 'Two lines face each other in the hall: build socialism in one country first, or carry the revolution abroad before it suffocates. Whoever loses will be expelled.',
    opts: [{ label: 'Socialism in one country', hist: 1, fx: [['discipline', 15], ['grievance', 5], ['news', 'The Fourteenth Congress of {N} expels the left opposition.', 'pol']] }, { label: 'Permanent revolution', fx: [['ideology', 'trot', 'reform'], ['fervor', 20]] }] });
  story({ id: 'st_election32', title: 'The election of ’32', text: 'Three years of slump have made this election a referendum on capitalism itself. A reforming governor promises a new deal; a populist promises to name the guilty.',
    opts: [{ label: 'A New Deal', hist: 1, fx: [['ideology', 'socdem', 'election'], ['sup', 'workers', 10]] }, { label: 'The populist', fx: [['ideology', 'natpop', 'election']] }, { label: 'Stay the course', fx: [['mandate', -10], ['sup', 'workers', -8]] }] });
  story({ id: 'st_leader', title: 'The Leader takes power', text: 'The Grand Council has voted the Head of Government full powers for four years. Nobody expects the four years to end.',
    opts: [{ label: 'Full powers', hist: 1, fx: [['ideology', 'personalist', 'reform'], ['charisma', 15]] }, { label: 'The chambers remain sovereign', fx: [['stab', -5], ['sup', 'military', -6]] }] });
  story({ id: 'st_generals', title: 'The generals’ rising', text: 'The garrison in the southern provinces has declared against the federation, with Dravan aircraft overhead. The unions are handing out rifles in the squares.',
    opts: [{ label: 'To the barricades', hist: 1, tip: 'Civil war against the generals.', fx: [['civilwar', 'junta', 0.42]] }, { label: 'Negotiate with the generals', tip: 'They will rule. You will live.', fx: [['ideology', 'junta', 'coup']] }] });
  story({ id: 'st_union', title: 'Union with Pavon', text: 'Pavon’s generals are divided, its people speak our language, and its border guards have been told not to resist. The Leader wants an answer tonight.',
    opts: [{ label: 'Demand union', hist: 1, tip: 'If Pavon is too strong to bully, it will fight.', fx: [['note', 'Pavon is absorbed into Hesperia'], ['fn', (G, n) => ID.storyUnion(G, n, 'Pavon')]] }, { label: 'Leave Pavon be', fx: [['charisma', -6]] }] });
  story({ id: 'st_ultimatum', title: 'The Hesperian ultimatum', text: 'Hesperia demands union by midnight. Its divisions are already at the border crossings.',
    opts: [{ label: 'Submit to union', tip: 'You become a Hesperian satellite under its system.', fx: [['note', 'Hesperia’s regime is imposed on us', false], ['fn', (G, n, c) => { const h = G.nations[c.from]; if (!h || !h.alive) return; if (n.ideo !== h.ideo) ID.Politics.changeIdeology(G, n, h.ideo, 'imposed', h.id); if (h.bloc) ID.Diplomacy.joinBloc(G, n, h.bloc); else { ID.Diplomacy.formBloc(G, h); ID.Diplomacy.joinBloc(G, n, h.bloc); } }]] },
      { label: 'Resist', tip: 'Hesperia declares war.', fx: [['note', 'War with Hesperia', false], ['fn', (G, n, c) => { const h = G.nations[c.from]; if (h && h.alive && !ID.atWar(G, h.id, n.id)) ID.Diplomacy.startWar(G, h, n, 'claims'); }]] }] });
  story({ id: 'st_suyan_rev', title: 'The peasant army comes down from the hills', text: 'Twenty years of war have left the villages armed and the government bankrupt. The peasant army has crossed the river.',
    opts: [{ label: 'Fight for the republic', hist: 1, tip: 'Civil war against the Maoist peasant army.', fx: [['civilwar', 'mao', 0.48]] }, { label: 'Negotiate a coalition', tip: 'The country goes over to the peasant army without a fight.', fx: [['ideology', 'mao', 'revolution']] }] });
  story({ id: 'st_secret', title: 'The secret speech', text: 'At a closed session of the congress, the First Secretary reads four hours of crimes committed by his predecessor. The text is already leaking.',
    opts: [{ label: 'The thaw', hist: 1, fx: [['dist', -15], ['grievance', -20], ['sup', 'intelligentsia', 12], ['drift', 'marketsoc', 20]] }, { label: 'Suppress the speech', fx: [['discipline', 10], ['grievance', 10]] }] });
  story({ id: 'st_antara_coup', title: 'The generals move', text: 'Tanks surround the presidential palace. The air force has orders to strike it. Foreign money paid for the lorry drivers’ strike that prepared the ground.',
    opts: [{ label: 'The president refuses to resign', hist: 1, tip: 'The generals take power.', fx: [['ideology', 'junta', 'coup'], ['grievance', 20]] }, { label: 'Arm the workers', tip: 'Civil war against the generals.', fx: [['civilwar', 'junta', 0.4]] }] });
  story({ id: 'story_war', title: (n, G, c) => 'The hour has come: ' + G.nations[c.target].base, text: (n, G, c) => c.why || 'The general staff believes the moment is right.',
    opts: [{ label: (n, G, c) => 'Declare war on ' + G.nations[c.target].name, hist: 1, fx: [['note', 'War', null], ['fn', (G, n, c) => { const t = G.nations[c.target]; if (t && t.alive && !ID.Diplomacy.warBlock(G, n, t)) ID.Diplomacy.startWar(G, n, t, c.cb || 'claims'); }]] }, { label: 'Not now', fx: [['glory', -4]] }] });
})();
