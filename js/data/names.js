/* IRON DIALECTIC — names, scenarios, starting situations, challenges. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});

  const PRE = ['Val', 'Kor', 'Ast', 'Bel', 'Dor', 'Eld', 'Fen', 'Gal', 'Hal', 'Ist', 'Jor', 'Kal', 'Lor', 'Mar', 'Nor', 'Ost', 'Par', 'Quel', 'Rov', 'Sar', 'Tal', 'Ul', 'Ver', 'Wes', 'Yar', 'Zel', 'Ard', 'Bry', 'Cal', 'Dra', 'Est', 'Fal', 'Gor', 'Hes', 'Ir', 'Kes', 'Lun', 'Mor', 'Nev', 'Or', 'Pol', 'Rhen', 'Sel', 'Tor', 'Um', 'Vos', 'Zar', 'Cas', 'Tes', 'Aur'];
  const MID = ['', '', 'a', 'e', 'o', 'an', 'en', 'or', 'ar', 'el', 'ov', 'is', 'im', 'ad'];
  const SUF = [['ia', 'ian'], ['ia', 'ian'], ['ia', 'ian'], ['mark', 'markish'], ['ovia', 'ovian'], ['ar', 'ari'], ['on', 'onian'], ['heim', 'heimer'], ['or', 'orian'], ['ene', 'enian'], ['una', 'unan'], ['ara', 'aran'], ['esh', 'eshi'], ['ay', 'ayan'], ['ica', 'ican'], ['und', 'undian'], ['ava', 'avan'], ['is', 'isian']];
  ID.genName = (rng, used) => {
    for (let t = 0; t < 50; t++) {
      const s = rng.pick(SUF);
      let stem = rng.pick(PRE) + rng.pick(MID);
      if (/[aeiou]$/.test(stem) && /^[aeiou]/.test(s[0])) stem = stem.slice(0, -1);
      const base = stem + s[0];
      if (base.length < 5 || base.length > 10 || used.has(base) || /(.)\1\1/.test(base) || /[aeiou]{3}/.test(base)) continue;
      used.add(base);
      return { base, adj: stem + s[1] };
    }
    const b = 'Terra' + used.size; used.add(b); return { base: b, adj: b + 'n' };
  };

  const FIRST = ['Aldric', 'Benno', 'Casimir', 'Dario', 'Emil', 'Farid', 'Gregor', 'Henrik', 'Ilya', 'Joren', 'Kemal', 'Lucan', 'Marek', 'Nadir', 'Oskar', 'Pavel', 'Quint', 'Rurik', 'Stefan', 'Tomas', 'Ulric', 'Viktor', 'Yusuf', 'Zoran', 'Anya', 'Brisa', 'Celia', 'Dara', 'Elin', 'Freya', 'Greta', 'Hana', 'Irena', 'Jana', 'Katya', 'Lena', 'Mira', 'Nora', 'Olga', 'Petra', 'Rosa', 'Sana', 'Tilda', 'Vera'];
  const LAST = ['Varga', 'Kessler', 'Dorn', 'Halloran', 'Ivanek', 'Morrow', 'Castell', 'Brandt', 'Orlov', 'Sabine', 'Tarrant', 'Veld', 'Arkady', 'Lindqvist', 'Montague', 'Navarro', 'Okoro', 'Petrescu', 'Rahimi', 'Sokol', 'Tanaka', 'Ueda', 'Volkov', 'Weiss', 'Yilmaz', 'Zamora', 'Achebe', 'Barros', 'Chen', 'Dimitrov', 'Estrada', 'Falk', 'Grau', 'Hoxha', 'Ito', 'Jansen'];
  const TITLES = {
    ml: 'General Secretary', trot: 'Chairman of the Council of Commissars', council: 'Speaker of the Congress', mao: 'Chairman', marketsoc: 'Premier', demsoc: 'Prime Minister',
    ansyn: 'Federation Secretary', ancom: 'Rotating Delegate', liberal: 'President', socdem: 'Chancellor', minarchy: 'First Citizen', conmon: 'Monarch', absmon: 'Emperor',
    theocracy: 'Supreme Guardian', agrarian: 'Elder of the Assembly', junta: 'General', corporatist: 'Head of Government', technocracy: 'Director-General', personalist: 'The Leader',
    merchant: 'Doge', cybernetic: 'Chief Co-ordinator', natpop: 'The Tribune',
  };
  ID.genLeader = (rng, ideo) => ({ name: rng.pick(FIRST) + ' ' + rng.pick(LAST), age: rng.int(38, 62), title: TITLES[ideo] || 'Head of State' });
  ID.leaderTitle = (ideo) => TITLES[ideo] || 'Head of State';
  ID.nationTitle = (n, ideo) => ID.IDEOLOGIES[ideo].title.replace('{N}', n.base).replace('{A}', n.adj);

  /* Starting situations. diff 1..5 is shown as a rating on the nation picker. */
  ID.SITUATIONS = {
    great: { name: 'Great power', diff: 2, text: 'Large, stable and watched by everyone. Your problems are the ones success brings.' },
    sick: { name: 'Sick empire', diff: 4, text: 'Vast and rotten. Restless provinces, a corrupt administration, and neighbours measuring the corpse.' },
    rich: { name: 'Rich and divided', diff: 3, text: 'Factories, banks and a class war simmering in every city.' },
    small: { name: 'Small and threatened', diff: 4, text: 'A minor state beside a hungry one. Survival will take diplomacy before it takes arms.' },
    backwater: { name: 'Agrarian backwater', diff: 3, text: 'Wide fields, few factories, old loyalties. Modernise and risk the order — or don’t, and risk the border.' },
    revolution: { name: 'Young revolution', diff: 5, text: 'The old regime fell last year. Fervour is high, the treasury empty, and every neighbour wants you strangled in the cradle.' },
    trader: { name: 'Trading state', diff: 2, text: 'Ports, ships and money. Rich for your size and dependent on open seas.' },
    middling: { name: 'Middle power', diff: 3, text: 'Neither prey nor predator, yet.' },
  };

  /* Handcrafted scenario. Coordinates are fractions of the map. */
  ID.SCENARIOS = {
    meridia: {
      id: 'meridia', name: 'The Two Continents, 1910', seed: 19100101, size: 'std',
      desc: 'A handcrafted world: old Aurelia and its rivals in the west, the young Karsovan republic and the eastern powers across the Lysian straits, new states in the south.',
      blobs: [[0.22, 0.34, 0.165], [0.15, 0.55, 0.12], [0.30, 0.53, 0.11], [0.25, 0.73, 0.09], [0.17, 0.2, 0.07],
        [0.63, 0.29, 0.17], [0.76, 0.43, 0.15], [0.68, 0.61, 0.125], [0.86, 0.27, 0.09], [0.55, 0.42, 0.07],
        [0.48, 0.81, 0.095], [0.585, 0.85, 0.075], [0.44, 0.335, 0.036], [0.455, 0.47, 0.04], [0.41, 0.17, 0.04], [0.905, 0.7, 0.06], [0.065, 0.78, 0.04], [0.37, 0.9, 0.035]],
      nations: [
        { base: 'Aurelia', adj: 'Aurelian', ideo: 'absmon', x: 0.22, y: 0.36, w: 1.7, sit: 'sick', blurb: 'The oldest throne in the west. Devout, enormous, and three bad harvests from revolution.' },
        { base: 'Cassine', adj: 'Cassinese', ideo: 'liberal', x: 0.31, y: 0.55, w: 0.95, sit: 'rich', blurb: 'Banks, mills and a parliament. The richest state on the continent and the most divided.', tutorial: 1 },
        { base: 'Norvik', adj: 'Norvish', ideo: 'conmon', x: 0.165, y: 0.21, w: 0.9, sit: 'middling', blurb: 'A cautious northern kingdom with a parliament, a navy and a long memory.' },
        { base: 'Tessaly', adj: 'Tessalian', ideo: 'socdem', x: 0.13, y: 0.56, w: 0.85, sit: 'middling', blurb: 'A small republic that has bought social peace and would like to keep it.' },
        { base: 'Verano', adj: 'Veranese', ideo: 'ansyn', x: 0.25, y: 0.74, w: 0.6, sit: 'revolution', blurb: 'The unions took the factories last spring. Nobody has yet come to take them back.' },
        { base: 'Drava', adj: 'Dravan', ideo: 'junta', x: 0.33, y: 0.4, w: 0.8, sit: 'small', blurb: 'Colonels who promised order and now need a victory to prove it.' },
        { base: 'Lys', adj: 'Lysian', ideo: 'merchant', x: 0.445, y: 0.34, w: 0.5, sit: 'trader', blurb: 'The houses of Lys hold the straits between two continents and charge for the view.' },
        { base: 'Karsova', adj: 'Karsovan', ideo: 'ml', x: 0.63, y: 0.27, w: 1.5, sit: 'revolution', blurb: 'The first state to call itself a workers’ republic. Encircled, planned, and in a hurry.' },
        { base: 'Ruthe', adj: 'Ruthene', ideo: 'natpop', x: 0.535, y: 0.42, w: 0.7, sit: 'small', blurb: 'A movement in power, with a map of everything it believes was stolen.' },
        { base: 'Suyan', adj: 'Suyanese', ideo: 'agrarian', x: 0.78, y: 0.45, w: 1.2, sit: 'backwater', blurb: 'Ten thousand villages that have outlasted every dynasty and intend to outlast the factories.' },
        { base: 'Hesperia', adj: 'Hesperian', ideo: 'corporatist', x: 0.69, y: 0.62, w: 1.0, sit: 'great', blurb: 'Labour and capital marched into the same chamber. The chamber faces outward.' },
        { base: 'Irkal', adj: 'Irkali', ideo: 'theocracy', x: 0.86, y: 0.27, w: 0.8, sit: 'backwater', blurb: 'The guardians rule by revelation and regard the Karsovan border as the edge of the world.' },
        { base: 'Pavon', adj: 'Pavonian', ideo: 'personalist', x: 0.66, y: 0.44, w: 0.8, sit: 'middling', blurb: 'One marshal, one portrait in every office, and no plan for the day after.' },
        { base: 'Meridia', adj: 'Meridian', ideo: 'technocracy', x: 0.48, y: 0.8, w: 0.9, sit: 'middling', blurb: 'A southern republic handed to its engineers. It works, so far.' },
        { base: 'Antara', adj: 'Antaran', ideo: 'demsoc', x: 0.59, y: 0.85, w: 0.7, sit: 'small', blurb: 'An elected socialist government, a hostile officer corps, and foreign money in the opposition press.' },
        { base: 'Kelda', adj: 'Keldan', ideo: 'minarchy', x: 0.905, y: 0.7, w: 0.6, sit: 'trader', blurb: 'An island of freeholders with almost no government and no intention of acquiring one.' },
        { base: 'Vess', adj: 'Vessian', ideo: 'council', x: 0.41, y: 0.17, w: 0.5, sit: 'revolution', blurb: 'A northern island run by its dockers’ and miners’ councils. The mainland calls it a mutiny.' },
      ],
    },
  };

  /* Unlockable challenges. unlock(meta) -> bool. */
  ID.CHALLENGES = [
    { id: 'besieged', name: 'The Besieged Commune', desc: 'Play Verano, the syndicalist union, on Dialectic difficulty with every neighbour already hostile.',
      hint: 'Finish any campaign, win or lose.', unlock: (m) => m.runs.length >= 1,
      setup: { scenario: 'meridia', nation: 'Verano', difficulty: 'dialectic', hostile: 1 } },
    { id: 'lastemperor', name: 'The Last Emperor', desc: 'Aurelia with an ailing monarch, stability at 30 and an empty treasury.',
      hint: 'Suffer one collapse.', unlock: (m) => m.runs.some((r) => r.result === 'defeat'),
      setup: { scenario: 'meridia', nation: 'Aurelia', difficulty: 'iron', frail: 1 } },
    { id: 'onecountry', name: 'Socialism in One Country', desc: 'Karsova under total embargo: no trade treaties are possible for the first fifteen years.',
      hint: 'Survive until 1930 in any campaign.', unlock: (m) => m.runs.some((r) => r.year >= 1930),
      setup: { scenario: 'meridia', nation: 'Karsova', difficulty: 'iron', embargo: 1 } },
    { id: 'blackmonday', name: 'Black Monday', desc: 'Kelda, the night-watchman island, with the Great Depression arriving in your first year.',
      hint: 'Reach the Age of Masses (1925).', unlock: (m) => m.runs.some((r) => r.year >= 1925),
      setup: { scenario: 'meridia', nation: 'Kelda', difficulty: 'iron', earlyDepression: 1 } },
    { id: 'worldonfire', name: 'World on Fire', desc: 'A random world that begins in 1940, in the Age of Total War, with every state armed and aggressive.',
      hint: 'Win a civil war, or survive until 1950.', unlock: (m) => m.runs.some((r) => r.year >= 1950 || r.civilWarsWon > 0),
      setup: { scenario: 'random', difficulty: 'iron', startYear: 1940 } },
    { id: 'ironman', name: 'No Second Drafts', desc: 'A random world on Dialectic with manual saving disabled. The autosave is the only record.',
      hint: 'Win any victory.', unlock: (m) => m.runs.some((r) => r.result === 'victory'),
      setup: { scenario: 'random', difficulty: 'dialectic', ironman: 1 } },
  ];

  /* Weights for starting ideologies in random worlds. */
  ID.START_WEIGHTS = { absmon: 3, conmon: 3, liberal: 3, junta: 2, theocracy: 1.5, agrarian: 1.5, socdem: 1.5, personalist: 1.5, merchant: 1, corporatist: 1, natpop: 1, ml: 1.1, demsoc: 0.8, minarchy: 0.7, technocracy: 0.6, ansyn: 0.6, mao: 0.6, council: 0.5, trot: 0.5, marketsoc: 0.5, ancom: 0.4, cybernetic: 0.3 };
  ID.SIT_FOR = {
    absmon: ['sick', 'backwater', 'great'], conmon: ['great', 'middling', 'trader'], liberal: ['rich', 'great', 'trader'], junta: ['small', 'middling', 'great'],
    theocracy: ['backwater', 'middling'], agrarian: ['backwater', 'small'], socdem: ['rich', 'middling'], personalist: ['middling', 'sick', 'great'], merchant: ['trader'],
    corporatist: ['great', 'middling'], natpop: ['small', 'middling'], ml: ['revolution', 'great'], demsoc: ['small', 'rich'], minarchy: ['trader', 'small'], technocracy: ['middling', 'rich'],
    ansyn: ['revolution', 'small'], mao: ['revolution', 'backwater'], council: ['revolution', 'small'], trot: ['revolution'], marketsoc: ['middling', 'rich'], ancom: ['revolution', 'small'], cybernetic: ['middling', 'rich'],
  };
})();
