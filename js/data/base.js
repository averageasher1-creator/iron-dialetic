/* IRON DIALECTIC — base data: terrain, buildings, laws, recruitment, attack styles, factions, eras. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});

  ID.T = { SEA: 0, PLAINS: 1, FARM: 2, FOREST: 3, HILLS: 4, MOUNTAIN: 5, DESERT: 6 };
  /* cost: front progress needed per tile. def: attacker loss multiplier. pop: capacity (thousands). */
  ID.TERRAIN = [
    { name: 'Sea', cost: 0, def: 0, pop: 0, food: 0, ore: 0, rough: 0, col: [24, 38, 46] },
    { name: 'Plains', cost: 1.0, def: 1.0, pop: 9, food: 2.0, ore: 0.1, rough: 0, col: [176, 168, 120], desc: 'Fast to cross, easy to take.' },
    { name: 'Farmland', cost: 1.0, def: 0.9, pop: 14, food: 4.0, ore: 0, rough: 0, col: [196, 186, 112], desc: 'Dense population, most of your food. Open ground.' },
    { name: 'Forest', cost: 1.7, def: 1.4, pop: 5, food: 0.9, ore: 0.3, rough: 1, col: [98, 128, 86], desc: 'Slow and costly to attack through. Good partisan country.' },
    { name: 'Hills', cost: 1.9, def: 1.6, pop: 4, food: 0.8, ore: 1.0, rough: 1, col: [150, 132, 98], desc: 'Defensive ground with ore for industry.' },
    { name: 'Mountain', cost: 3.2, def: 2.4, pop: 1, food: 0.1, ore: 1.4, rough: 1, col: [122, 112, 104], desc: 'A wall. Fronts crawl here and bleed.' },
    { name: 'Desert', cost: 1.3, def: 0.9, pop: 1, food: 0.1, ore: 0.4, rough: 0, col: [206, 180, 130], desc: 'Empty, open, worth little.' },
  ];

  ID.B = { NONE: 0, CITY: 1, FORT: 2, PORT: 3, FACTORY: 4, SILO: 5 };
  ID.BUILDINGS = [
    null,
    { id: 1, key: 'city', name: 'City', cost: 220, upkeep: 0.7, glyph: 'C',
      desc: 'Raises population capacity by 400K and adds urban output. Cities concentrate workers and intelligentsia — and their politics.' },
    { id: 2, key: 'fort', name: 'Fortress', cost: 90, upkeep: 0.5, glyph: 'F',
      desc: 'Every tile within 6 costs attackers 2.5× and slows their front. Destroyed if its own tile falls.' },
    { id: 3, key: 'port', name: 'Port', cost: 130, upkeep: 0.4, glyph: 'P', needs: 'coast',
      desc: 'Lets you launch naval landings and trade overseas. A coastal pocket with a port stays in supply.' },
    { id: 4, key: 'factory', name: 'Factory', cost: 160, upkeep: 0.5, glyph: 'I',
      desc: 'Adds industrial output and arms. Every factory also adds to the power of the workers who run it.' },
    { id: 5, key: 'silo', name: 'Missile silo', cost: 480, upkeep: 1.8, glyph: 'M', needs: 'mil4',
      desc: 'Launches missiles. With military technology 6 it can carry atomic warheads. Requires military technology 4.' },
  ];
  ID.FORT_RADIUS = 6;

  /* Recruitment laws. maxMob: ceiling on the share of population under arms. */
  ID.RECRUIT = {
    volunteer: { name: 'Volunteer army', maxMob: 0.045, regen: 1.0, atk: 1.05, def: 1.0, upkeep: 1.0, coup: 0.8,
      sup: { workers: 3, peasants: 3 }, desc: 'Small, willing, cheap in political terms. You cannot raise more than 4.5% of the population.' },
    professional: { name: 'Professional army', maxMob: 0.035, regen: 0.8, atk: 1.3, def: 1.25, upkeep: 1.8, coup: 1.5,
      sup: { military: 8 }, desc: 'Expensive career soldiers: the best troops per head, slow to replace, and an officer corps with its own ideas.' },
    conscription: { name: 'Conscription', maxMob: 0.10, regen: 1.1, atk: 0.95, def: 1.0, upkeep: 0.8, coup: 1.0,
      sup: { workers: -4, peasants: -5 }, desc: 'Universal service. A large army at moderate cost; the classes that fill the ranks resent it.' },
    levee: { name: 'Mass levy', maxMob: 0.22, regen: 1.4, atk: 0.85, def: 1.0, upkeep: 0.55, coup: 0.7, weMult: 1.3, fervorMorale: 1,
      sup: { workers: -6, peasants: -8 }, desc: 'The nation in arms. Enormous numbers whose fighting quality tracks revolutionary fervour. Every soldier is a worker missing from the economy.' },
    militia: { name: 'Workers’ militias', maxMob: 0.14, regen: 1.3, atk: 0.75, def: 1.45, upkeep: 0.3, coup: 0, abroad: 0.8,
      sup: { workers: 6, military: -10 }, desc: 'Armed workplaces and neighbourhoods. Ferocious at home, reluctant abroad, impossible to turn into a coup.' },
    peoples: { name: 'People’s war', maxMob: 0.16, regen: 1.2, atk: 0.8, def: 1.25, upkeep: 0.35, coup: 0.4, roughBonus: 1.3,
      sup: { peasants: 4 }, desc: 'A peasant army that lives among the people. Strong in forest, hills and mountains; weak in set-piece battles on open ground.' },
    mercenary: { name: 'Hired companies', maxMob: 0.08, regen: 0, atk: 1.15, def: 1.05, upkeep: 2.6, coup: 0.6, hire: 1,
      sup: { capital: 3 }, desc: 'Troops are bought with gold, not raised from the people. No conscription anger, no reserves if the treasury runs dry.' },
    levy: { name: 'Feudal levy', maxMob: 0.08, regen: 0.9, atk: 0.9, def: 0.95, upkeep: 0.4, coup: 1.1, harvest: 1,
      sup: { peasants: -6, military: 3 }, desc: 'Lords bring their peasants. Cheap, mediocre, and every month under arms is a month away from the fields.' },
  };

  /* Attack styles. speed multiplies front rate; lossA/lossD multiply losses. */
  ID.STYLES = {
    advance: { name: 'Advance', key: '1', speed: 1.0, lossA: 1.0, lossD: 1.0, desc: 'Steady pressure along the whole front. No particular strength, no particular weakness.' },
    assault: { name: 'Mass assault', key: '2', speed: 1.6, lossA: 1.5, lossD: 1.25, desc: 'Throw bodies at the line. Fast, and it kills more of the enemy — and far more of your own.' },
    blitz: { name: 'Blitz', key: '3', speed: 2.3, lossA: 0.85, lossD: 0.9, open: 1, goldDay: 0.25, needs: 'mil2',
      desc: 'Mechanised breakthrough. Very fast on open ground, bogs down in rough terrain, and burns gold every day it runs. Needs military technology 2.' },
    infiltrate: { name: 'Infiltration', key: '4', speed: 0.6, lossA: 0.55, lossD: 0.8, ignoreTerrain: 0.5, ignoreFort: 0.5,
      desc: 'Slow seepage through the gaps. Low casualties, half the usual penalty from terrain and forts.' },
    siege: { name: 'Siege', key: '5', speed: 0.5, lossA: 0.8, lossD: 1.1, ignoreFort: 0.85, goldDay: 0.12,
      desc: 'Methodical artillery work. Slow, but fortresses lose most of their value. Costs gold while it runs.' },
  };

  /* Laws. Each option carries plain numeric fields the simulation reads. */
  ID.LAWS = {
    press: {
      name: 'Press', desc: 'What may be printed. Controls how well you — and your enemies — can see the country.',
      opts: {
        free: { name: 'Free press', bias: 0, noise: 0, sci: 0.15, corr: -0.3, spread: 0.25, shield: 0, infl: 0.3,
          sup: { intelligentsia: 15 }, desc: 'Exact information. Scandals surface, opposition organises openly, foreign ideas circulate.' },
        regulated: { name: 'Licensed press', bias: 4, noise: 2, sci: 0.05, corr: -0.1, spread: 0.1, shield: 0.15, infl: 0.1,
          sup: { intelligentsia: 3 }, desc: 'Mostly honest reporting with a few closed subjects.' },
        censored: { name: 'State censorship', bias: 14, noise: 8, sci: -0.12, corr: 0.2, spread: -0.2, shield: 0.4, infl: -0.3, grievance: 0.25,
          sup: { intelligentsia: -12 }, desc: 'Bad news is softened before it lands. Faction reports reaching you are inflated and noisy; corruption grows unseen.' },
        propaganda: { name: 'Total propaganda', bias: 26, noise: 14, sci: -0.25, corr: 0.35, spread: -0.35, shield: 0.6, infl: -0.5, grievance: 0.5, charisma: 15, needs: 'era1',
          sup: { intelligentsia: -22 }, desc: 'One voice. Defeats barely register with the public — until they do, all at once. Your own figures become fiction. Needs the Age of Masses.' },
      },
    },
    security: {
      name: 'Security', desc: 'How the state deals with its opponents.',
      opts: {
        liberties: { name: 'Civil liberties', repress: 0, detect: 0, unrest: 0, grievance: -0.4,
          sup: { intelligentsia: 8, workers: 3 }, desc: 'No political police. Plots are found late or not at all; grievances bleed away in the open.' },
        police: { name: 'Public order police', repress: 0.3, detect: 0.2, unrest: -4, grievance: 0,
          sup: {}, desc: 'Ordinary policing. A modest brake on unrest.' },
        secret: { name: 'Secret police', repress: 0.7, detect: 0.55, unrest: -8, grievance: 0.5, bureau: 0.15,
          sup: { intelligentsia: -10, bureaucracy: 4 }, desc: 'Movements are infiltrated, plots usually uncovered. Hidden grievance accumulates and the organs become a power of their own.' },
        terror: { name: 'State terror', repress: 1.2, detect: 0.7, unrest: -12, grievance: 1.2, bureau: 0.3, atk: -0.1, pop: -0.0004,
          sup: { intelligentsia: -25, military: -8, workers: -6, peasants: -6 }, desc: 'Opposition is physically destroyed. So are officers, engineers and anyone who knew better. Grievance compounds fast.' },
      },
    },
    land: {
      name: 'Land', desc: 'Who holds the soil.',
      opts: {
        landlord: { name: 'Great estates', food: 1.0, sup: { peasants: -10, capital: 8, clergy: 3 }, desc: 'Landlords and tenants. Reliable rents, a sullen countryside.' },
        smallholder: { name: 'Land to the tiller', food: 1.06, sup: { peasants: 12, capital: -6 }, desc: 'Family farms. Peasants become a conservative, satisfied class.' },
        collective: { name: 'Collective farms', food: 0.88, stateFood: 0.1, sup: { peasants: -14, bureaucracy: 4 }, desc: 'State-run agriculture. The surplus is yours to move; the peasants know it.' },
        commune: { name: 'Village communes', food: 0.96, sup: { peasants: 7, capital: -10 }, desc: 'Land held and worked in common by those who live on it.' },
      },
    },
    labor: {
      name: 'Labour', desc: 'The standing of organised workers.',
      opts: {
        banned: { name: 'Unions banned', prod: 0.03, strike: 0.5, sup: { workers: -12, capital: 8 }, desc: 'Fewer strikes, but those that come are political from the first hour.' },
        company: { name: 'State unions', prod: 0.01, strike: 0.7, sup: { workers: -4, capital: 3, bureaucracy: 3 }, desc: 'Official unions that transmit orders downward.' },
        free: { name: 'Free unions', prod: 0, strike: 1.3, sup: { workers: 8, capital: -6 }, desc: 'Regular, limited strikes; a working class with something to lose.' },
        control: { name: 'Workers’ control', prod: 0, strike: 0.3, sup: { workers: 16, capital: -25, intelligentsia: 3 }, desc: 'Workplaces run by those who work in them.' },
      },
    },
    religion: {
      name: 'Faith', desc: 'The relation of altar and state.',
      opts: {
        statechurch: { name: 'State church', trad: 0.08, sup: { clergy: 16, peasants: 5, intelligentsia: -6 }, desc: 'The clergy bless the order and the order pays the clergy.' },
        tolerance: { name: 'Toleration', trad: 0, sup: { intelligentsia: 3 }, desc: 'The state takes no side among the faiths.' },
        secular: { name: 'Secular state', trad: -0.04, sup: { clergy: -10, intelligentsia: 6 }, desc: 'Religion removed from schools and law.' },
        atheism: { name: 'State atheism', trad: -0.1, fervor: 0.04, sup: { clergy: -30, peasants: -9 }, desc: 'The church is an enemy institution and treated as one.' },
      },
    },
    trade: {
      name: 'Trade', desc: 'How open the economy is to the world.',
      opts: {
        free: { name: 'Free trade', trade: 1.4, contagion: 1.3, ind: 0, sup: { capital: 8, workers: -3 }, desc: 'Maximum trade income and exposure to every foreign crash.' },
        protect: { name: 'Protection', trade: 1.0, contagion: 1.0, ind: 0.05, sup: {}, desc: 'Tariff walls around home industry.' },
        autarky: { name: 'Autarky', trade: 0.3, contagion: 0.3, ind: -0.05, ls: -4, sup: { capital: -10 }, desc: 'Self-sufficiency. Embargoes and depressions abroad barely touch you; neither does their prosperity.' },
      },
    },
    mobil: {
      name: 'War economy', desc: 'How far civilian life is bent to war.',
      opts: {
        peace: { name: 'Peacetime', atk: 0, ls: 0, sup: {}, desc: 'Butter before guns.' },
        partial: { name: 'Partial mobilisation', atk: 0.08, ls: -5, sup: { capital: -4, workers: -3, military: 4 }, desc: '+8% combat strength; living standards slip.' },
        total: { name: 'Total war', atk: 0.18, ls: -14, mob: 0.05, we: 1.3, needs: 'era2', sup: { workers: -8, peasants: -5, military: 8 }, desc: '+18% combat strength and +5% mobilisation ceiling. The home front pays for all of it. Needs the Age of Total War.' },
      },
    },
  };
  ID.LAW_CATS = ['press', 'security', 'land', 'labor', 'religion', 'trade', 'mobil'];

  /* Factions. Power comes from social structure; see politics.js for demands. */
  ID.FACTIONS = {
    workers: { name: 'Workers', glyph: '⚒︎', desc: 'Industrial and urban labour. Their power grows with every factory and city.',
      turn: 'Strikes, then a general strike, then barricades.' },
    peasants: { name: 'Peasants', glyph: '⚘︎', desc: 'The rural majority in most countries. Slow to move, hard to stop.',
      turn: 'Hoarding, tax revolts, rural insurgency.' },
    capital: { name: 'Capital', glyph: '◈', desc: 'Owners of industry, finance and large estates.',
      turn: 'Capital flight, investment strikes, money for plotters.' },
    military: { name: 'Military', glyph: '⚔︎', desc: 'The officer corps. Its power grows with the army and with war.',
      turn: 'Coup d’état.' },
    clergy: { name: 'Clergy', glyph: '✠︎', desc: 'Organised religion and the authority of tradition.',
      turn: 'Denunciation from the pulpit; a blessing for your enemies.' },
    intelligentsia: { name: 'Intelligentsia', glyph: '✎︎', desc: 'Teachers, engineers, writers, students. Small, loud, indispensable to research.',
      turn: 'Dissident movements, emigration, a ready audience for foreign ideas.' },
    bureaucracy: { name: 'Bureaucracy', glyph: '▤', desc: 'Officials, managers, party apparatus. Grows with everything the state does.',
      turn: 'Sabotage by paperwork, corruption, palace intrigue.' },
  };
  ID.FACTION_IDS = ['workers', 'peasants', 'capital', 'military', 'clergy', 'intelligentsia', 'bureaucracy'];

  ID.LEGIT = {
    mandate: { name: 'Electoral mandate', desc: 'Set by the margin of your last free election; it fades as the term wears on and collapses if elections are postponed or rigged.' },
    fervor: { name: 'Revolutionary fervour', desc: 'The energy of a revolution in motion. Fed by victories and by revolution spreading abroad; eaten by time and by bureaucratisation.' },
    tradition: { name: 'Tradition', desc: 'The weight of how things have always been. Grows slowly with continuity; reforms, defeat and modernisation wear it down.' },
    prosperity: { name: 'Prosperity', desc: 'Living standards and whether they are rising.' },
    victory: { name: 'Victory', desc: 'Glory won in war. Fades in peace; a lost war turns it sharply negative.' },
    discipline: { name: 'Party discipline', desc: 'The unity of the ruling apparatus. Follows the bureaucracy’s loyalty; purges restore it for a while.' },
    particip: { name: 'Participation', desc: 'How far people actually govern themselves. Rises when assemblies are respected; every override and emergency power destroys it.' },
    divine: { name: 'Divine sanction', desc: 'The blessing of the clergy and the piety of the law.' },
    order: { name: 'Order', desc: 'Quiet streets. The inverse of unrest across your provinces.' },
    competence: { name: 'Competence', desc: 'Growth without crises. Every active crisis counts against you.' },
    charisma: { name: 'The Leader', desc: 'The personal authority of one man. Boosted by propaganda and triumphs; it dies with him.' },
  };
  ID.LEGIT_IDS = Object.keys(ID.LEGIT);

  ID.ERAS = [
    { name: 'Age of Empires', from: 1910, techCap: 2, range: 130, desc: 'Old orders, new machines. Wars are fought by rail and bayonet.' },
    { name: 'Age of Masses', from: 1925, techCap: 4, range: 200, desc: 'Radio, mass parties, and a world economy waiting to break. Total propaganda becomes possible.' },
    { name: 'Age of Total War', from: 1940, techCap: 6, range: 300, desc: 'Whole societies mobilised. Blocs harden, missiles fly, aggression escalates everywhere.' },
    { name: 'Atomic Age', from: 1957, techCap: 8, range: 420, desc: 'The bomb. Empires come apart at the seams and every war risks being the last.' },
  ];
  ID.eraOf = (tick) => { const y = ID.yearOf(tick); let e = 0; for (let i = 0; i < ID.ERAS.length; i++) if (y >= ID.ERAS[i].from) e = i; return e; };

  ID.FAMILIES = {
    socialist: { name: 'Socialist', bloc: 'Workers’ International', col: '#c41e2a' },
    anarchist: { name: 'Anarchist', bloc: 'Free Federation', col: '#3a3a3a' },
    liberal: { name: 'Liberal', bloc: 'League of Free Nations', col: '#e6b422' },
    conservative: { name: 'Conservative', bloc: 'Concert of Crowns', col: '#5b6fb5' },
    authoritarian: { name: 'Authoritarian', bloc: 'Steel Accord', col: '#6a7b3c' },
    heterodox: { name: 'Heterodox', bloc: 'Compact of the New Age', col: '#2ec4d6' },
  };

  ID.DIFFICULTY = {
    statesman: { name: 'Statesman', desc: 'Forgiving. Factions are slower to turn, the AI is less interested in you.', sup: 4, aiAgg: 0.75, aiBonus: 0.95, subvert: 0.6, crisis: 0.8 },
    iron: { name: 'Iron', desc: 'The intended experience. Mistakes compound.', sup: 0, aiAgg: 1.0, aiBonus: 1.05, subvert: 1.0, crisis: 1.0 },
    dialectic: { name: 'Dialectic', desc: 'Every contradiction sharpens. For players who have already fallen a few times.', sup: -4, aiAgg: 1.25, aiBonus: 1.2, subvert: 1.4, crisis: 1.25 },
  };
})();
