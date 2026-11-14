/* IRON DIALECTIC — the national layer of The Two Continents (historical campaigns only).
   For each of the 17 countries:
   - leader: [name, age, traits, title]; cast: the inner circle at the start, [key, seat, name, lean, competence 1–3,
     loyalty, ambition, age]; names: [first names, surnames] for those who come after them.
   - q: the national question, a gauge with two poles. drift(n, G) moves it every month; fx(n, v) gives the
     modifiers (channels as in sim/doctrine.js); tick(n, G, v) may act on the country each month; acts are
     national actions (dv moves the gauge); lo/hi name the events fired when it reaches loAt/hiAt
     (loIf/hiIf add conditions; loChance makes the low event a monthly risk instead of a threshold).
   Engine in sim/regime.js. Free campaigns and random worlds have none of this. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const E = ID.EVENT_DEFS;
  const fam = (n) => ID.ideo(n).family;
  const is = (n, ...k) => k.indexOf(n.ideo) >= 0;
  const ev = (o) => { o.sys = 1; o.national = 1; if (!o.tone) o.tone = 'bad'; E.push(o); };
  const enemiesTrade = (G, n, v, m, why) => { for (const e of ID.Diplomacy.enemies(G, n)) ID.addMod(e, 'trade', v, m, why); };
  const nbWorst = (G, n) => { let w = null, wv = 99; for (const k in G.border[n.id] || {}) { const o = G.nations[+k]; if (o && o.alive && !ID.atWar(G, n.id, o.id)) { const v = ID.op(G, n.id, o.id) + o.troops / Math.max(1, n.troops) * 20; if (v < wv) { wv = v; w = o; } } } return w; };
  const N = (ID.NATIONAL = {});
  const PERM = 600;

  /* ---------------------------------------------------------------- Aurelia */
  N.Aurelia = {
    ideo: 'absmon', leader: ['Gavril II', 54, ['pious', 'cautious'], 'Emperor'],
    cast: [['ostrov', 'army', 'Grand Duke Kirill Ostrov', 'junta', 2, 62, 70, 49], ['strelnikov', 'police', 'Count Vadim Strelnikov', 'absmon', 3, 78, 45, 58],
      ['vitebsky', 'economy', 'Sergei Vitebsky', 'conmon', 3, 55, 60, 61], ['glinsky', 'ideology', 'Father Rasko Glinsky', 'theocracy', 2, 70, 85, 41], ['sabatov', 'foreign', 'Prince Lev Sabatov', 'conmon', 2, 66, 40, 63]],
    names: [['Kirill', 'Fyodor', 'Arkady', 'Pyotr', 'Anton', 'Mikhail', 'Ilya', 'Boris'], ['Tarasov', 'Zorin', 'Grekov', 'Lavrov', 'Melnik', 'Sokol', 'Orlov', 'Durov']],
    q: { name: 'The Land', low: 'Land to the villages', high: 'The estates stand', init: 78,
      desc: 'Two thirds of the black earth belongs to eleven thousand families. The other hundred million want it, and know where the manor houses are.',
      drift: (n) => (is(n, 'absmon') ? 0.15 : -0.1) - ((n.a.unrest || 0) > 30 ? 0.4 : 0) - (fam(n) === 'socialist' || fam(n) === 'anarchist' ? 1 : 0) - (n.ideo === 'agrarian' ? 0.8 : 0),
      fx: (n, v) => ({ unrest: (v - 50) * 0.06, food: (50 - v) * 0.0015, legit: is(n, 'absmon', 'conmon') ? (v - 50) * 0.05 : 0, coup: is(n, 'absmon', 'conmon') && v < 30 ? (30 - v) * 0.02 : 0 }),
      acts: [
        { id: 'au_q_sell', name: 'Sell crown land to the villages', desc: 'The imperial estates go to auction, lot by lot, with credit for any village that bids.', cd: 24, dv: -10, fx: [['gold', 80], ['sup', 'peasants', 6], ['tradition', -3]] },
        { id: 'au_q_bank', name: 'The peasant land bank', desc: 'Cheap mortgages for any peasant who wants to buy his landlord out.', cost: { gold: 100 }, cd: 36, dv: -8, fx: [['mod', 'food', 0.04, 60, 'Peasant land bank'], ['sup', 'peasants', 4]] },
        { id: 'au_q_punish', name: 'Punitive expeditions', desc: 'Cossacks to the villages that burned their manor. Floggings, fines and a gallows in the square.', cost: { auth: 15 }, cd: 24, dv: 6, fx: [['mod', 'unrest', -6, 12, 'Punitive expeditions'], ['grievance', 10], ['sup', 'peasants', -8]] },
      ],
      hi: 'nq_au_hi', hiAt: 90, hiIf: (n) => n.stab < 55, lo: 'nq_au_lo', loAt: 15, loIf: (n) => is(n, 'absmon', 'conmon') },
  };
  ev({ id: 'nq_au_hi', title: 'The red cockerel', text: 'Manors are burning across the black-earth provinces: the peasants call it letting loose the red cockerel. The governors ask for troops, and for instructions.',
    opts: [
      { label: 'Send the dragoons', fx: [['mod', 'unrest', -8, 12, 'The dragoons'], ['grievance', 12], ['sup', 'peasants', -8], ['nq', 4]] },
      { label: 'A land commission', tip: 'The estates will be bought out, slowly, at a fair price. The nobles will call it robbery.', fx: [['nq', -15], ['sup', 'peasants', 8], ['stab', -2], ['tradition', -4]] },
    ] });
  ev({ id: 'nq_au_lo', title: 'The nobles’ petition', text: 'The marshals of the nobility of thirty provinces have signed a petition to the throne. They want what is left of their land guaranteed, or they want a different throne.',
    opts: [
      { label: 'Guarantee what remains', fx: [['nq', 10], ['sup', 'military', 5], ['sup', 'peasants', -6]] },
      { label: 'The land belongs to those who work it', fx: [['nq', -10], ['sup', 'peasants', 8], ['sup', 'military', -6], ['mod', 'coup', 0.3, 24, 'Angry nobility']] },
    ] });

  /* ---------------------------------------------------------------- Cassine */
  N.Cassine = {
    ideo: 'liberal', leader: ['Warren Halloway', 58, ['economist', 'orator'], 'President'],
    cast: [['crane', 'army', 'General Abner Crane', 'liberal', 2, 70, 45, 60], ['pratt', 'police', 'Mitchell Pratt', 'conmon', 2, 60, 55, 52],
      ['mellard', 'economy', 'Andrew Mellard', 'liberal', 3, 72, 50, 55], ['lang', 'ideology', 'Rufus Lang', 'natpop', 3, 45, 88, 44], ['hargrave', 'foreign', 'Cordell Hargrave', 'liberal', 2, 68, 40, 57]],
    names: [['Warren', 'Calvin', 'Harlan', 'Elihu', 'Thaddeus', 'Josiah', 'Wendell', 'Grover'], ['Whitcomb', 'Baird', 'Pruitt', 'Calloway', 'Hollis', 'Dunmore', 'Rand', 'Fenwick']],
    q: { name: 'The Two Nations', low: 'One nation', high: 'Two nations', init: 62,
      desc: 'The mill owners’ avenue and the mill hands’ tenements are a mile apart and might as well be on different continents.',
      drift: (n) => (is(n, 'liberal', 'minarchy', 'merchant') ? 0.2 : 0) - (is(n, 'socdem', 'demsoc') || fam(n) === 'socialist' || fam(n) === 'anarchist' ? 0.4 : 0) + (n.depression ? 0.4 : 0),
      fx: (n, v) => ({ prod: (v - 50) * 0.0012, rev: (v - 50) * 0.0012, unrest: (v - 50) * 0.07, ls: (50 - v) * 0.04, conf: (v - 50) * 0.15 }),
      acts: [
        { id: 'ca_q_trust', name: 'Break up a trust', desc: 'The attorney-general files against the railroad combine.', cost: { auth: 10 }, cd: 24, dv: -8, fx: [['sup', 'capital', -6], ['corr', -3]] },
        { id: 'ca_q_exchange', name: 'Open the exchange to the world', desc: 'Foreign capital may list, lend and buy without asking.', cd: 24, dv: 8, fx: [['gold', 100], ['sup', 'capital', 5]] },
        { id: 'ca_q_settle', name: 'Settlement houses and night schools', desc: 'Reading rooms, clinics and English classes in every mill town.', cost: { gold: 60 }, cd: 18, dv: -5, fx: [['sup', 'intelligentsia', 4], ['sup', 'workers', 3]] },
      ],
      hi: 'nq_ca_hi', hiAt: 88, lo: 'nq_ca_lo', loAt: 15 },
  };
  ev({ id: 'nq_ca_hi', title: 'The mill towns walk out', text: 'Forty thousand textile workers have walked out of the mills in the river towns, singing. They want bread, and roses too. The owners want the National Guard.',
    opts: [
      { label: 'Send in the Guard', fx: [['mod', 'unrest', -6, 12, 'The Guard in the mill towns'], ['sup', 'workers', -10], ['grievance', 10]] },
      { label: 'Federal arbitration', fx: [['nq', -10], ['sup', 'capital', -5], ['sup', 'workers', 6]] },
    ] });
  ev({ id: 'nq_ca_lo', title: 'Capital goes on strike', text: 'Nobody is building. The banks are sitting on their money, the factories on their orders, and the newspapers on the government’s front step.',
    opts: [
      { label: 'Cut the taxes', fx: [['nq', 8], ['mod', 'rev', -0.05, 24, 'Tax cuts'], ['sup', 'capital', 8]] },
      { label: 'The state will build instead', fx: [['gold', -120], ['sup', 'workers', 6], ['mod', 'prod', 0.03, 24, 'Public works'], ['sup', 'capital', -5]] },
    ] });

  /* ---------------------------------------------------------------- Norvik */
  N.Norvik = {
    ideo: 'conmon', leader: ['Eirik VIII', 47, ['beloved', 'diplomat'], 'King'],
    cast: [['lund', 'army', 'General Sverre Lund', 'conmon', 2, 72, 40, 58], ['holm', 'police', 'Jens Holm', 'liberal', 2, 64, 45, 50],
      ['thrane', 'economy', 'Magnus Thrane', 'socdem', 3, 50, 75, 39], ['dahl', 'ideology', 'Kristian Dahl', 'conmon', 2, 66, 50, 55], ['lie', 'foreign', 'Halvard Lie', 'liberal', 3, 70, 45, 47]],
    names: [['Sverre', 'Halvard', 'Trygve', 'Olav', 'Einar', 'Johan', 'Nils', 'Ragnar'], ['Berg', 'Haugen', 'Nygaard', 'Solheim', 'Bakke', 'Moe', 'Strand', 'Lien']],
    q: { name: 'Crown and Storting', low: 'The Storting rules', high: 'The King rules', init: 55,
      desc: 'The constitution gives the king a veto and the Storting the purse. Each has always wanted a little more of the other’s.',
      drift: (n) => (is(n, 'absmon') ? 0.4 : is(n, 'conmon') ? 0.05 : -0.4),
      fx: (n, v) => ({ stab: 3 - Math.abs(v - 50) * 0.08, auth: (v - 50) * 0.006, legit: is(n, 'conmon') ? 2 - Math.abs(v - 50) * 0.06 : 0 }),
      tick: (n, G, v) => { if (v > 75 && n.drift.absmon != null) n.drift.absmon += 0.25; if (v < 25 && n.drift.liberal != null) n.drift.liberal += 0.25; },
      acts: [
        { id: 'no_q_veto', name: 'The royal veto', desc: 'The king refuses his signature, and says why in the newspapers.', cost: { auth: 10 }, cd: 18, dv: 12, fx: [['sup', 'clergy', 3], ['sup', 'intelligentsia', -4]] },
        { id: 'no_q_resp', name: 'Ministerial responsibility', desc: 'The government answers to the Storting, not the palace.', cost: { auth: 5 }, cd: 24, dv: -12, fx: [['particip', 6], ['mandate', 6]] },
        { id: 'no_q_tour', name: 'The king’s tour of the fjords', desc: 'Three weeks on the royal yacht, a speech in every harbour.', cost: { gold: 40 }, cd: 18, dv: 4, fx: [['stab', 3], ['tradition', 3]] },
      ],
      hi: 'nq_no_hi', hiAt: 88, lo: 'nq_no_lo', loAt: 12 },
  };
  ev({ id: 'nq_no_hi', title: 'The King dissolves the Storting', text: 'For the first time in a century the king has sent the deputies home and governs by royal ordinance. The fishing towns are flying black flags.',
    opts: [
      { label: 'Rule by ordinance', fx: [['drift', 'absmon', 25], ['auth', 20], ['sup', 'intelligentsia', -8]] },
      { label: 'The King steps back', fx: [['nq', -20], ['stab', 3], ['legitmod', 4, 24, 'The King steps back']] },
    ] });
  ev({ id: 'nq_no_lo', title: 'A referendum on the crown', text: 'The Storting has voted to ask the people whether they still want a king. The king has said he will abide by the answer.',
    opts: [
      { label: 'Let the people decide', fx: [['drift', 'liberal', 30], ['legitmod', 4, 24, 'The referendum']] },
      { label: 'Postpone the vote', fx: [['nq', 8], ['grievance', 8]] },
    ] });

  /* ---------------------------------------------------------------- Tessaly */
  N.Tessaly = {
    ideo: 'socdem', leader: ['Emil Hoffstetter', 56, ['grey', 'diplomat'], 'Federal President'],
    cast: [['imhof', 'army', 'General Konrad Imhof', 'conmon', 2, 64, 50, 59], ['ruegg', 'police', 'Paul Rüegg', 'liberal', 2, 66, 40, 53],
      ['amsler', 'economy', 'Rudolf Amsler', 'demsoc', 3, 52, 70, 42], ['baer', 'ideology', 'Hedwig Baer', 'socdem', 2, 75, 45, 48], ['favre', 'foreign', 'Henri Favre', 'liberal', 3, 70, 35, 61]],
    names: [['Konrad', 'Ulrich', 'Fritz', 'Henri', 'Walter', 'Ernst', 'Louis', 'Jakob'], ['Imhof', 'Gerber', 'Moser', 'Rochat', 'Brunner', 'Keller', 'Vuilleumier', 'Zbinden']],
    q: { name: 'The Cantons', low: 'One federation', high: 'Twenty-two republics', init: 65,
      desc: 'Every canton keeps its own police, its own schools and its own opinion of the federal government, which is rarely high.',
      drift: (n) => (n.nwars ? -0.4 : 0.15),
      fx: (n, v) => ({ def: (v - 50) * 0.003, eff: (50 - v) * 0.0012, unrest: v < 25 ? (25 - v) * 0.2 : 0, stab: v > 80 ? -(v - 80) * 0.15 : 0 }),
      acts: [
        { id: 'te_q_ref', name: 'A federal referendum', desc: 'Ask the whole people to give the federation one more power.', cost: { auth: 8 }, cd: 24, dv: -10, fx: [['particip', 5]] },
        { id: 'te_q_auto', name: 'Cantonal guarantees', desc: 'The federation swears off one more power, in writing.', cd: 24, dv: 10, fx: [['stab', 2], ['sup', 'peasants', 3]] },
        { id: 'te_q_neutral', name: 'The armed neutrality', desc: 'Every man between twenty and fifty keeps his rifle at home.', cost: { gold: 60 }, cd: 24, dv: 3, fx: [['mod', 'def', 0.06, 36, 'Armed neutrality']] },
      ],
      hi: 'nq_te_hi', hiAt: 90, lo: 'nq_te_lo', loAt: 15 },
  };
  ev({ id: 'nq_te_hi', title: 'The cantons refuse the federal tax', text: 'Nine cantons have voted not to collect the federal levy this year. Their councils say the money is better spent at home, and they are not wrong.',
    opts: [
      { label: 'Negotiate canton by canton', fx: [['nq', -8], ['mod', 'rev', -0.05, 24, 'Cantonal tax strike']] },
      { label: 'Federal commissioners', fx: [['nq', -15], ['mod', 'unrest', 4, 24, 'Federal commissioners'], ['grievance', 8]] },
    ] });
  ev({ id: 'nq_te_lo', title: 'The mountain league', text: 'Seven mountain cantons have formed a league to defend their old liberties against the federal capital. They have their own militia and their own flag.',
    opts: [
      { label: 'Restore their rights', fx: [['nq', 15], ['auth', -10]] },
      { label: 'March on the league', fx: [['nq', -5], ['stab', -4], ['grievance', 10], ['mod', 'eff', 0.03, 60, 'The league dissolved']] },
    ] });

  /* ---------------------------------------------------------------- Verano */
  N.Verano = {
    ideo: 'ansyn', leader: ['Salvador Roig', 47, ['orator', 'peasantborn'], 'Federation Secretary'],
    cast: [['ferrer', 'army', 'Tomás Ferrer', 'ancom', 3, 62, 72, 38], ['orozco', 'police', 'Vicente Orozco', 'ml', 2, 42, 80, 41],
      ['puig', 'economy', 'Joan Puig', 'ansyn', 2, 72, 40, 52], ['montes', 'ideology', 'Federica Montes', 'ancom', 3, 68, 55, 33], ['casals', 'foreign', 'Ramón Casals', 'council', 2, 64, 50, 45]],
    names: [['Tomás', 'Joan', 'Ramón', 'Andreu', 'Lucía', 'Francesc', 'Mercedes', 'Diego'], ['Ferrer', 'Puig', 'Soler', 'Vidal', 'Mas', 'Pujol', 'Serra', 'Roca']],
    q: { name: 'Columns and Army', low: 'Free columns', high: 'A regular army', init: 20,
      desc: 'The columns elect their officers and vote on their attacks. They fight like lions on their own ground and argue like lawyers about anyone else’s.',
      drift: (n) => (n.nwars ? 0.6 : -0.3) + (is(n, 'ml', 'demsoc', 'junta') ? 0.5 : 0),
      fx: (n, v) => ({ atk: (v - 50) * 0.003, def: (50 - v) * 0.002, legit: fam(n) === 'anarchist' ? (50 - v) * 0.05 : 0, eff: (v - 50) * 0.001 }),
      acts: [
        { id: 've_q_militar', name: 'Militarise the columns', desc: 'Ranks, salutes and officers appointed from above.', cost: { auth: 8 }, cd: 18, dv: 15, fx: [['particip', -6], ['sup', 'military', 5]] },
        { id: 've_q_elect', name: 'Elect the officers again', desc: 'Every column votes its commanders back in, or out.', cd: 18, dv: -15, fx: [['particip', 6], ['sup', 'military', -4]] },
        { id: 've_q_rifles', name: 'Rifles from abroad', desc: 'Whoever sells them, whatever the price, whatever the conditions.', cost: { gold: 120 }, cd: 24, dv: 5, fx: [['troops', 0.05], ['equip', 0.05]] },
      ],
      hi: 'nq_ve_hi', hiAt: 85, hiIf: (n) => fam(n) === 'anarchist' || n.ideo === 'council', lo: 'nq_ve_lo', loAt: 10, loIf: (n) => n.nwars > 0 },
  };
  ev({ id: 'nq_ve_hi', title: 'The columns are disarmed', text: 'The order has gone out: every militia is to hand its rifles to the new army by the end of the month. The anarchist columns have replied with a resolution, unanimously, that they will not.',
    opts: [
      { label: 'Enforce the order', fx: [['nq', 10], ['particip', -10], ['sig', -15], ['mod', 'unrest', 5, 12, 'Disarmed columns']] },
      { label: 'Withdraw the order', fx: [['nq', -15], ['mod', 'atk', -0.05, 12, 'Withdrawn order']] },
    ] });
  ev({ id: 'nq_ve_lo', title: 'The columns will not advance', text: 'The front has not moved in four months. Every attack is debated by the column assembly, and the assemblies are in no hurry to die.',
    opts: [
      { label: 'Let the assemblies decide', fx: [['particip', 5], ['mod', 'atk', -0.06, 12, 'Debating columns']] },
      { label: 'Appoint a commander', fx: [['nq', 12], ['sig', -8], ['mod', 'atk', 0.05, 12, 'A commander']] },
    ] });

  /* ---------------------------------------------------------------- Drava */
  N.Drava = {
    ideo: 'junta', leader: ['Miklós Vadas', 59, ['soldier', 'paranoid'], 'Colonel-President'],
    cast: [['szalai', 'army', 'General Ferenc Szalai', 'natpop', 3, 50, 82, 52], ['domotor', 'police', 'Colonel Gyula Dömötör', 'junta', 2, 74, 45, 48],
      ['erdody', 'economy', 'Count Pál Erdődy', 'conmon', 2, 60, 40, 63], ['racz', 'ideology', 'Major Lajos Rácz', 'natpop', 2, 58, 70, 39], ['halasz', 'foreign', 'Baron Imre Halász', 'conmon', 3, 62, 45, 57]],
    names: [['Ferenc', 'Gyula', 'Lajos', 'Imre', 'Béla', 'Zoltán', 'Kálmán', 'Dezső'], ['Szalai', 'Rácz', 'Halász', 'Kovács', 'Bárdos', 'Tóth', 'Vass', 'Kemény']],
    q: { name: 'The Three Rivers', low: 'Reconciled', high: 'Revenge', init: 60,
      desc: 'Every schoolchild can draw the old borders from memory. Every officer has a plan for getting them back.',
      drift: (n) => (is(n, 'junta', 'natpop') ? 0.25 : -0.3),
      fx: (n, v) => ({ atk: (v - 50) * 0.003, legit: is(n, 'junta', 'natpop') ? (v - 50) * 0.08 : 0, trade: (50 - v) * 0.002 }),
      acts: [
        { id: 'dr_q_maps', name: 'Maps in every school', desc: 'The lost provinces in black, the rivers in red, and a lesson every morning.', cost: { gold: 30 }, cd: 18, dv: 8, fx: [['tradition', 3]] },
        { id: 'dr_q_incident', name: 'Border incidents', desc: 'A patrol fires, a customs post burns, the newspapers have their story.', cost: { auth: 10 }, cd: 24, dv: 12, fx: [['fn', (G, n) => { if (!n.claims.length) ID.genClaims(G, n); }], ['note', 'Claims on the lost provinces'], ['glory', 3], ['opAll', -4]] },
        { id: 'dr_q_renounce', name: 'Renounce the claims', desc: 'Sign the frontier as it stands. The officers will never forgive it.', cost: { auth: 20 }, cd: 60, dv: -25, fx: [['opAll', 10], ['sup', 'military', -8], ['fn', (G, n) => { n.claims = []; }], ['note', 'Claims abandoned']] },
      ],
      hi: 'nq_dr_hi', hiAt: 92, hiIf: (n) => !n.nwars, lo: 'nq_dr_lo', loAt: 10, loIf: (n) => is(n, 'junta', 'natpop') },
  };
  ev({ id: 'nq_dr_hi', title: 'The war of the three rivers', text: 'The general staff has finished its plan, the newspapers have finished their campaign and the crowd outside the ministry has finished its patience. Revenge, they chant, now.',
    opts: [
      { label: 'March', fx: [['fn', (G, n) => { const t = nbWorst(G, n); if (t && !ID.Diplomacy.warBlock(G, n, t)) ID.Diplomacy.startWar(G, n, t, 'claims'); }], ['note', 'War on the weakest hostile neighbour'], ['nq', -20], ['glory', 6]] },
      { label: 'Not yet', fx: [['nq', -10], ['sup', 'military', -8], ['legitmod', -4, 24, 'Revenge postponed']] },
    ] });
  ev({ id: 'nq_dr_lo', title: 'The colonels lose their purpose', text: 'Nobody marches for the lost provinces any more. The young read foreign novels. The colonels, who took power to win them back, are asked what they are for.',
    opts: [
      { label: 'Elections, at last', fx: [['drift', 'liberal', 25], ['legitmod', 4, 24, 'Elections promised']] },
      { label: 'Find a new enemy', fx: [['nq', 20], ['grievance', 6], ['opAll', -4]] },
    ] });

  /* ---------------------------------------------------------------- Lys */
  N.Lys = {
    ideo: 'merchant', leader: ['Marino Contarelli', 68, ['diplomat', 'corrupt'], 'Doge'],
    cast: [['zane', 'army', 'Admiral Lodovico Zane', 'merchant', 3, 66, 70, 55], ['barbo', 'police', 'Alvise Barbo', 'merchant', 2, 72, 45, 60],
      ['moresini', 'economy', 'Pietro Moresini', 'liberal', 3, 60, 55, 49], ['badoer', 'ideology', 'Ottavio Badoer', 'merchant', 2, 70, 40, 64], ['tron', 'foreign', 'Elena Tron', 'liberal', 3, 64, 72, 41]],
    names: [['Lodovico', 'Alvise', 'Pietro', 'Ottavio', 'Marcantonio', 'Zuane', 'Andrea', 'Nicolò'], ['Zane', 'Barbo', 'Moresini', 'Badoer', 'Tron', 'Dandolo', 'Querini', 'Gradenigo']],
    q: { name: 'The Straits Toll', low: 'Free passage', high: 'The chain across the straits', init: 50,
      desc: 'Every ship between the continents passes under the guns of Lys, and every ship pays. How much it pays is the only foreign policy Lys has ever needed.',
      drift: (n) => (n.gold < 100 ? 0.3 : 0) - 0.05,
      fx: (n, v) => ({ rev: (v - 50) * 0.004, trade: (50 - v) * 0.003, def: (v - 50) * 0.001 }),
      tick: (n, G, v) => { if (v > 70 && G.rng.chance((v - 70) / 60)) { const o = G.rng.pick(ID.alive(G)); if (o !== n) ID.addOp(G, o.id, n.id, -2); } },
      acts: [
        { id: 'ly_q_raise', name: 'Raise the toll', desc: 'A new tariff, effective with the next tide.', cd: 12, dv: 12, fx: [['gold', 60]] },
        { id: 'ly_q_free', name: 'Free passage for friends', desc: 'The flags of friendly states pass for nothing.', cost: { auth: 5 }, cd: 18, dv: -10, fx: [['opAll', 4]] },
        { id: 'ly_q_chain', name: 'Draw the chain across the straits', desc: 'No enemy ship passes, at any price.', cost: { auth: 10 }, cd: 36, dv: 25, can: (n) => (n.nwars ? '' : 'Only in wartime.'), fx: [['fn', (G, n) => enemiesTrade(G, n, -0.2, 6, 'The straits closed')], ['note', 'Every enemy’s trade income −20% for 6 months']] },
      ],
      hi: 'nq_ly_hi', hiAt: 90, lo: 'nq_ly_lo', loAt: 10 },
  };
  ev({ id: 'nq_ly_hi', title: 'A fleet off the harbour', text: 'Four battleships of the powers are anchored off the Arsenal, and their admirals would like to discuss the toll over dinner.',
    opts: [
      { label: 'Lower the toll', fx: [['nq', -25], ['opAll', 6]] },
      { label: 'Man the batteries', fx: [['nq', 5], ['opAll', -8], ['mod', 'def', 0.08, 24, 'Manned batteries']] },
    ] });
  ev({ id: 'nq_ly_lo', title: 'The Houses grumble', text: 'With the straits all but free, the great Houses have lost their best income, and the Great Council has lost its patience with the Doge.',
    opts: [
      { label: 'Restore the dues', fx: [['nq', 15], ['sup', 'capital', 6]] },
      { label: 'Tax the Houses instead', fx: [['gold', 150], ['sup', 'capital', -10]] },
    ] });

  /* ---------------------------------------------------------------- Karsova */
  N.Karsova = {
    ideo: 'ml', leader: ['Arkady Volkhov', 52, ['visionary', 'ailing'], 'Chairman'],
    cast: [['bronov', 'army', 'Lev Bronov', 'trot', 3, 58, 82, 41], ['zernov', 'police', 'Feliks Zernov', 'ml', 3, 80, 40, 45],
      ['burov', 'economy', 'Nikolai Burov', 'marketsoc', 3, 66, 55, 39], ['dzhavakh', 'ideology', 'Grigor Dzhavakh', 'personalist', 2, 62, 92, 43], ['litov', 'foreign', 'Maxim Litov', 'ml', 2, 70, 35, 48]],
    names: [['Grigor', 'Lev', 'Nikolai', 'Maxim', 'Kliment', 'Lazar', 'Andrei', 'Vyacheslav'], ['Zernov', 'Burov', 'Litov', 'Kamenev', 'Rykin', 'Orzhov', 'Malenko', 'Kalinov']],
    q: { name: 'The Village', low: 'Grain by force', high: 'The peasants’ market', init: 55,
      desc: 'The revolution was made in the cities. The grain is in the villages, and the villages want something for it.',
      drift: (n) => (is(n, 'ml', 'personalist') && n.plan ? -0.35 : 0) + (is(n, 'marketsoc') ? 0.4 : 0) + (n.foodBal < 1 ? -0.3 : 0),
      fx: (n, v) => ({ food: (v - 50) * 0.002, prod: (50 - v) * 0.0012, ls: (v - 50) * 0.03, unrest: v < 30 ? (30 - v) * 0.2 : 0 }),
      tick: (n, G, v) => { if (v > 75 && n.drift.marketsoc != null) n.drift.marketsoc += 0.3; },
      acts: [
        { id: 'ka_q_requis', name: 'Requisition the grain', desc: 'Brigades from the cities go out with lists and rifles.', cost: { auth: 10 }, cd: 12, dv: -15, fx: [['gold', 100], ['sup', 'peasants', -8], ['mod', 'prod', 0.04, 12, 'Requisitioned grain']] },
        { id: 'ka_q_market', name: 'Open the village markets', desc: 'A tax in kind, and whatever is left the peasant may sell.', cost: { auth: 8 }, cd: 24, dv: 12, fx: [['sup', 'peasants', 6], ['sup', 'workers', -3]] },
        { id: 'ka_q_tractor', name: 'Machine and tractor stations', desc: 'A tractor for every district, and a party man to drive it.', cost: { gold: 100 }, cd: 24, dv: 5, fx: [['mod', 'food', 0.05, PERM, 'Tractor stations']] },
      ],
      lo: 'nq_ka_lo', loAt: 12, hi: 'nq_ka_hi', hiAt: 88 },
  };
  ev({ id: 'nq_ka_lo', title: 'The war in the villages', text: 'Whole districts have refused to sow. Others have slaughtered their cattle rather than hand them to the collective. In the south a requisition brigade has been found in a well.',
    opts: [
      { label: 'Break them', fx: [['grievance', 15], ['pop', -0.02], ['sup', 'peasants', -10], ['mod', 'food', -0.1, 12, 'War in the villages'], ['sig', 10]] },
      { label: 'Call a retreat', fx: [['nq', 20], ['discipline', -8], ['drift', 'marketsoc', 10]] },
    ] });
  ev({ id: 'nq_ka_hi', title: 'The traders in fur coats', text: 'Private traders have grown rich on the village markets. They drive cars, they dine in the old restaurants, and the workers who made the revolution watch them through the windows.',
    opts: [
      { label: 'Tax them into the ground', fx: [['nq', -10], ['gold', 100], ['sup', 'capital', -6]] },
      { label: 'Let them enrich themselves', fx: [['nq', 5], ['drift', 'marketsoc', 15], ['sup', 'workers', -5], ['mod', 'prod', 0.04, 24, 'The market']] },
    ] });

  /* ---------------------------------------------------------------- Ruthe */
  N.Ruthe = {
    ideo: 'natpop', leader: ['Vasyl Horodenko', 44, ['orator', 'gambler'], 'Tribune'],
    cast: [['bilyk', 'army', 'Taras Bilyk', 'natpop', 2, 60, 86, 40], ['kravets', 'police', 'Ostap Kravets', 'natpop', 3, 74, 50, 37],
      ['levko', 'economy', 'Mykola Levko', 'corporatist', 2, 62, 40, 51], ['shevel', 'ideology', 'Roman Shevel', 'natpop', 3, 70, 60, 35], ['zalizniak', 'foreign', 'Andriy Zalizniak', 'conmon', 2, 55, 45, 58]],
    names: [['Taras', 'Ostap', 'Mykola', 'Roman', 'Andriy', 'Yurko', 'Bohdan', 'Danylo'], ['Bilyk', 'Kravets', 'Levko', 'Shevel', 'Zalizniak', 'Hnatiuk', 'Moroz', 'Savchuk']],
    q: { name: 'The Legions', low: 'Tamed', high: 'The legions rule the street', init: 62,
      desc: 'The black legions put the movement in power. Now they want their share of it, and they have the rifles to ask.',
      drift: (n) => (is(n, 'natpop') ? 0.3 : -0.5) + (n.nwars ? 0.3 : 0) + (n.charisma < 40 ? 0.3 : 0),
      fx: (n, v) => ({ atk: (v - 50) * 0.003, unrest: (v - 50) * 0.05, coup: v > 70 ? (v - 70) * 0.02 : 0, auth: (50 - v) * 0.004 }),
      acts: [
        { id: 'ru_q_border', name: 'Legions to the border', desc: 'Give them a frontier to watch and a neighbour to hate.', cd: 18, dv: 6, fx: [['troops', 0.04], ['opAll', -3]] },
        { id: 'ru_q_absorb', name: 'Absorb them into the army', desc: 'Uniforms, ranks and the army’s discipline. The legion chiefs lose their private armies.', cost: { auth: 12 }, cd: 36, dv: -15, fx: [['sup', 'military', 6], ['figLoy', 'army', -15]] },
        { id: 'ru_q_knives', name: 'The night of the long knives', desc: 'The legion leadership, arrested at a country hotel before dawn. Few of them reach a court.', cost: { auth: 20 }, cd: 120, dv: -35, fx: [['grievance', 10], ['charisma', 6], ['sup', 'military', 8], ['figPurge', 'army']] },
      ],
      hi: 'nq_ru_hi', hiAt: 88, lo: 'nq_ru_lo', loAt: 10, loIf: (n) => is(n, 'natpop') },
  };
  ev({ id: 'nq_ru_hi', title: 'The legions march on the capital', text: 'Fifty thousand legionaries are on the roads to the capital, singing. Their chief says he comes to save the Tribune from his advisers.',
    opts: [
      { label: 'Give them the ministries', fx: [['nq', -10], ['mod', 'atk', 0.06, 36, 'Legion ministries'], ['mod', 'unrest', 4, 36, 'Legion ministries'], ['figLoy', 'army', 25]] },
      { label: 'Turn the army on them', fx: [['nq', -30], ['stab', -6], ['sup', 'military', 6], ['grievance', 10], ['figPurge', 'army']] },
    ] });
  ev({ id: 'nq_ru_lo', title: 'The movement loses the street', text: 'The legion halls are empty on drill night. The young men have found jobs, girlfriends and the cinema.',
    opts: [
      { label: 'Raise new legions', fx: [['nq', 20], ['mod', 'unrest', 3, 12, 'New legions']] },
      { label: 'Govern quietly', fx: [['charisma', -8], ['stab', 3]] },
    ] });

  /* ---------------------------------------------------------------- Suyan */
  N.Suyan = {
    ideo: 'agrarian', leader: ['Liang Shu', 61, ['peasantborn', 'cautious'], 'Elder of the Assembly'],
    cast: [['zhao', 'army', 'General Zhao Kun', 'junta', 2, 48, 84, 50], ['han', 'police', 'Han Mo', 'agrarian', 2, 70, 40, 56],
      ['lu', 'economy', 'Lu Weiming', 'liberal', 3, 60, 55, 44], ['peng', 'ideology', 'Peng Yuan', 'mao', 3, 55, 78, 34], ['gu', 'foreign', 'Gu Wenjun', 'liberal', 2, 66, 40, 52]],
    names: [['Zhao', 'Han', 'Lu', 'Peng', 'Gu', 'Wei', 'Chen', 'Xu'], ['Kun', 'Mo', 'Weiming', 'Yuan', 'Wenjun', 'Dehuai', 'Tingfang', 'Shaoqi']],
    q: { name: 'The River', low: 'The dykes crumble', high: 'The river tamed', init: 55,
      desc: 'The great river feeds a hundred million people when the dykes hold, and drowns a million when they do not. The dykes need hands every year.',
      drift: (n) => -0.6 - (n.nwars ? 0.5 : 0) + (n.ls > 55 ? 0.1 : 0),
      fx: (n, v) => ({ food: (v - 50) * 0.003, growth: (v - 50) * 0.004 }),
      acts: [
        { id: 'su_q_dykes', name: 'Every village to the dykes', desc: 'A month of labour from every household along the river.', cost: { auth: 8 }, cd: 12, dv: 15, fx: [['mod', 'prod', -0.04, 6, 'Dyke labour'], ['sup', 'peasants', -3]] },
        { id: 'su_q_eng', name: 'Foreign engineers', desc: 'Surveyors, dredgers and concrete, paid for in silver.', cost: { gold: 120 }, cd: 36, dv: 20, fx: [['mod', 'sci', 0.04, 24, 'Foreign engineers']] },
        { id: 'su_q_granary', name: 'The ever-normal granary', desc: 'Buy grain in the fat years, sell it in the lean.', cost: { gold: 80 }, cd: 24, dv: 3, fx: [['mod', 'food', 0.05, 36, 'Ever-normal granary']] },
      ],
      lo: 'nq_su_lo', loChance: (v) => (v < 30 ? (30 - v) / 260 : 0), hi: 'nq_su_hi', hiAt: 92 },
  };
  ev({ id: 'nq_su_lo', title: 'The river breaks its banks', text: 'The dyke at the great bend has gone. The water is moving across the plain faster than a man can walk, and the county towns are ringing their bells.',
    opts: [
      { label: 'Every hand to the breach', fx: [['pop', -0.01], ['nq', 20], ['mod', 'prod', -0.06, 6, 'The breach'], ['sup', 'peasants', 4]] },
      { label: 'Save the cities', fx: [['pop', -0.025], ['nq', 10], ['sup', 'peasants', -10], ['mod', 'unrest', 5, 12, 'Drowned villages']] },
    ] });
  ev({ id: 'nq_su_hi', tone: 'good', title: 'The river tamed', text: 'For the first time in recorded history the river has risen and fallen in a year without drowning anyone. The old men say it will not last. The engineers say it will.',
    opts: [
      { label: 'Irrigate the plain', fx: [['mod', 'food', 0.08, PERM, 'The tamed river'], ['nq', -10]] },
      { label: 'Dams for power', fx: [['mod', 'prod', 0.06, PERM, 'River dams'], ['nq', -10]] },
    ] });

  /* ---------------------------------------------------------------- Hesperia */
  N.Hesperia = {
    ideo: 'corporatist', leader: ['Massimo Varrone', 51, ['orator', 'warlord'], 'Head of Government'],
    cast: [['calvi', 'army', 'Marshal Ettore Calvi', 'conmon', 3, 55, 50, 62], ['bocchi', 'police', 'Arturo Bocchi', 'personalist', 3, 72, 55, 47],
      ['marelli', 'economy', 'Guido Marelli', 'liberal', 3, 58, 45, 55], ['farinetti', 'ideology', 'Achille Farinetti', 'natpop', 2, 66, 78, 39], ['grandolfi', 'foreign', 'Count Dino Grandolfi', 'conmon', 3, 60, 62, 46]],
    names: [['Ettore', 'Guido', 'Achille', 'Dino', 'Italo', 'Cesare', 'Rodolfo', 'Galeazzo'], ['Calvi', 'Marelli', 'Farinetti', 'Grandolfi', 'Balbi', 'Bastico', 'Starace', 'Ciano']],
    q: { name: 'The Stockpiles', low: 'Dry tanks', high: 'Ready for a long war', init: 40,
      desc: 'Hesperia has the furnaces and the chemists. It does not have the oil, the rubber or the copper, and every general knows it.',
      drift: (n) => (n.nwars ? -2.2 : 0.4),
      fx: (n, v) => ({ atk: (v - 50) * 0.0025, def: (v - 50) * 0.0015, prod: v < 20 ? (v - 20) * 0.003 : 0 }),
      acts: [
        { id: 'he_q_synth', name: 'Synthetic fuel plants', desc: 'Petrol from coal, rubber from lime. Expensive, and ours.', cost: { gold: 120 }, cd: 24, dv: 15, fx: [['mod', 'prod', -0.02, 12, 'Synthetic fuel']] },
        { id: 'he_q_barter', name: 'Barter treaties', desc: 'Machine tools for ore, lorries for rubber, no gold changes hands.', cost: { auth: 6 }, cd: 18, dv: 10, fx: [['mod', 'trade', -0.03, 24, 'Barter']] },
        { id: 'he_q_oil', name: 'Claim the oil fields', desc: 'A speech about the nation’s natural frontier, which happens to run through the oil.', cost: { auth: 10 }, cd: 60, dv: 5, fx: [['op', 'Irkal', -20], ['glory', 2], ['fn', (G, n) => { if (!n.claims.length) ID.genClaims(G, n); }]] },
      ],
      lo: 'nq_he_lo', loAt: 10, loIf: (n) => n.nwars > 0, hi: 'nq_he_hi', hiAt: 90 },
  };
  ev({ id: 'nq_he_lo', title: 'The tanks are dry', text: 'The armoured divisions have fuel for eight days. The navy has stopped exercising. The air force is flying on promises.',
    opts: [
      { label: 'Ration fuel to the front', fx: [['mod', 'ls', -3, 12, 'Fuel rationing'], ['nq', 10]] },
      { label: 'Strike for the oil', fx: [['mod', 'atk', 0.08, 6, 'Strike for the oil'], ['nq', 5], ['we', 5]] },
    ] });
  ev({ id: 'nq_he_hi', tone: 'good', title: 'Ready for a long war', text: 'The quartermaster-general reports that Hesperia could fight for three years without importing a barrel. The general staff asks for permission to say so out loud.',
    opts: [
      { label: 'The staff may plan', fx: [['mod', 'atk', 0.06, 36, 'Ready for a long war']] },
      { label: 'Sell the surplus', fx: [['gold', 200], ['nq', -20]] },
    ] });

  /* ---------------------------------------------------------------- Irkal */
  N.Irkal = {
    ideo: 'theocracy', leader: ['Hasan Nur al-Din', 63, ['pious', 'hardliner'], 'Supreme Guardian'],
    cast: [['kalhor', 'army', 'General Reza Kalhor', 'junta', 3, 50, 86, 45], ['tabari', 'police', 'Sheikh Mahmud Tabari', 'theocracy', 2, 76, 45, 58],
      ['farmani', 'economy', 'Abbas Farmani', 'liberal', 3, 56, 55, 42], ['sadri', 'ideology', 'Kazem Sadri', 'theocracy', 3, 72, 60, 50], ['firuz', 'foreign', 'Prince Firuz Mirza', 'absmon', 2, 60, 65, 39]],
    names: [['Reza', 'Mahmud', 'Abbas', 'Kazem', 'Firuz', 'Jafar', 'Mehdi', 'Karim'], ['Kalhor', 'Tabari', 'Farmani', 'Sadri', 'Ansari', 'Nouri', 'Zand', 'Qajari']],
    q: { name: 'The Oil', low: 'Our oil', high: 'The companies’ oil', init: 72,
      desc: 'Beneath the sand lies the oil every great power wants. A foreign consortium pumps it, pays a royalty, and builds its own roads, schools and police posts.',
      drift: (n) => (is(n, 'liberal', 'merchant', 'minarchy') ? 0.2 : 0) - (is(n, 'theocracy') ? 0.05 : 0),
      fx: (n, v) => ({ rev: (v - 50) * 0.0025 + 0.03, legit: is(n, 'theocracy') ? (50 - v) * 0.06 : 0, unrest: (v - 50) * 0.04 }),
      tick: (n, G, v) => { if (v > 70 && n.sig != null) n.sig = Math.max(0, n.sig - 0.15); },
      acts: [
        { id: 'ir_q_conc', name: 'Grant a new concession', desc: 'Another field, another twenty years, another advance on the royalties.', cd: 24, dv: 12, fx: [['gold', 150], ['sup', 'clergy', -6]] },
        { id: 'ir_q_nat', name: 'Nationalise the oil', desc: 'The wells belong to the faithful. The companies may send their lawyers.', cost: { auth: 20 }, cd: 120, dv: -40, fx: [['mod', 'rev', 0.06, PERM, 'National oil'], ['fn', (G, n) => { for (const o of ID.alive(G)) if (o !== n && (fam(o) === 'liberal' || o.ideo === 'merchant')) ID.addOp(G, o.id, n.id, -20); }], ['note', 'Liberal and merchant states’ opinion of you −20'], ['sup', 'clergy', 6]] },
        { id: 'ir_q_eng', name: 'Train our own engineers', desc: 'A petroleum institute in the holy city, with a mosque beside the laboratory.', cost: { gold: 80 }, cd: 36, dv: -10, fx: [['mod', 'sci', 0.05, PERM, 'Petroleum institute']] },
      ],
      hi: 'nq_ir_hi', hiAt: 92, lo: 'nq_ir_lo', loAt: 10 },
  };
  ev({ id: 'nq_ir_hi', title: 'Riots at the refinery', text: 'A foreign foreman has struck a worker during the hour of prayer. By evening the refinery town is burning and the company has asked the government for soldiers.',
    opts: [
      { label: 'The guardians restore order', fx: [['mod', 'unrest', -6, 12, 'Order at the refinery'], ['grievance', 10], ['sig', 10]] },
      { label: 'Renegotiate the concession', fx: [['nq', -20], ['gold', -100], ['legitmod', 4, 24, 'A better concession']] },
    ] });
  ev({ id: 'nq_ir_lo', title: 'The companies strike back', text: 'No tanker will load at our ports. No bank will discount our paper. The companies’ governments have discovered a sudden interest in our opposition.',
    opts: [
      { label: 'Weather the embargo', fx: [['mod', 'trade', -0.15, 24, 'Oil embargo'], ['sig', 10]] },
      { label: 'Compensate them', fx: [['gold', -200], ['nq', 10]] },
    ] });

  /* ---------------------------------------------------------------- Pavon */
  N.Pavon = {
    ideo: 'personalist', leader: ['Adem Rrapaj', 62, ['paranoid', 'orator'], 'Marshal'],
    cast: [['leka', 'army', 'General Beqir Leka', 'junta', 2, 60, 66, 54], ['shqiri', 'police', 'Mehmet Shqiri', 'personalist', 3, 74, 86, 47],
      ['kola', 'economy', 'Spiro Kola', 'ml', 2, 64, 45, 50], ['vera', 'ideology', 'Vera Rrapaj', 'personalist', 2, 96, 60, 52], ['dukaj', 'foreign', 'Ramiz Dukaj', 'ml', 3, 70, 62, 38]],
    names: [['Beqir', 'Mehmet', 'Spiro', 'Ramiz', 'Hysni', 'Kadri', 'Adil', 'Petrit'], ['Leka', 'Shqiri', 'Kola', 'Dukaj', 'Kapo', 'Hazbiu', 'Çarçani', 'Marko']],
    q: { name: 'The Fortress', low: 'Open to the world', high: 'Alone against the world', init: 60,
      desc: 'The Marshal trusts no ally for long. Every few years he breaks with the last one, and every year there is more concrete on the mountainsides.',
      drift: (n) => (is(n, 'personalist') ? 0.2 : -0.4) + (n.leader.traits && n.leader.traits.indexOf('paranoid') >= 0 ? 0.2 : 0),
      fx: (n, v) => ({ def: (v - 50) * 0.003 + Math.min(20, n.nq.bunkers || 0) * 0.005, trade: (50 - v) * 0.003, coup: (50 - v) * 0.006, stab: (v - 50) * 0.03 }),
      tick: (n, G, v) => { if (v < 30 && n.charisma != null) n.charisma = Math.max(0, n.charisma - 0.2); if (v > 80 && G.rng.chance(0.3)) { const o = G.rng.pick(ID.alive(G)); if (o !== n) ID.addOp(G, o.id, n.id, -1); } },
      acts: [
        { id: 'pv_q_bunker', name: 'Pour a line of bunkers', desc: 'Concrete domes facing every direction, one for every family, built by the families themselves.', cost: { gold: 40 }, cd: 6, dv: 3, fx: [['fn', (G, n) => { n.nq.bunkers = (n.nq.bunkers || 0) + 1; }], ['note', 'Defence +0.5% (up to 20 lines)'], ['mod', 'prod', -0.01, 12, 'Concrete before bread']] },
        { id: 'pv_q_break', name: 'Break with the patron', desc: 'Denounce the last ally as revisionist, expel its advisers and keep its factories.', cost: { auth: 10 }, cd: 60, dv: 20, fx: [['gold', 120], ['opAll', -10], ['charisma', 6]] },
        { id: 'pv_q_open', name: 'Receive a foreign delegation', desc: 'A trade mission is allowed to land, watched by forty plain-clothes men.', cd: 24, dv: -12, fx: [['mod', 'trade', 0.06, 24, 'Trade mission'], ['opAll', 4]] },
      ],
      hi: 'nq_pv_hi', hiAt: 92, lo: 'nq_pv_lo', loAt: 12, loIf: (n) => is(n, 'personalist') },
  };
  ev({ id: 'nq_pv_hi', title: 'Alone against the world', text: 'The last foreign embassy has packed its crates. Pavon has no allies, no debts and no visitors. The Marshal calls it independence. The radio plays it as a hymn.',
    opts: [
      { label: 'Total self-reliance', tip: 'A constitution that forbids foreign loans, foreign firms and foreign bases.', fx: [['mod', 'def', 0.08, PERM, 'Alone against the world'], ['mod', 'trade', -0.12, PERM, 'Alone against the world'], ['mod', 'coup', -0.3, PERM, 'Alone against the world'], ['charisma', 10]] },
      { label: 'A quiet window', fx: [['nq', -20], ['mod', 'trade', 0.05, 36, 'A quiet window']] },
    ] });
  ev({ id: 'nq_pv_lo', title: 'The window opens', text: 'Foreign records are sold under the counter in the capital; the young wear foreign trousers. The Keeper of the Cult reports that the Marshal’s portrait has been defaced in two schools.',
    opts: [
      { label: 'Close the window', fx: [['nq', 20], ['grievance', 8], ['charisma', 4]] },
      { label: 'Let it stay open', fx: [['charisma', -10], ['sup', 'intelligentsia', 8], ['mod', 'ls', 2, 36, 'The open window']] },
    ] });

  /* ---------------------------------------------------------------- Meridia */
  N.Meridia = {
    ideo: 'technocracy', leader: ['Octavio Restrepo', 55, ['grey', 'visionary'], 'Director-General'],
    cast: [['arce', 'army', 'General Julio Arce', 'junta', 2, 55, 70, 53], ['montalvo', 'police', 'Clara Montalvo', 'technocracy', 2, 70, 45, 44],
      ['ibarra', 'economy', 'Tomás Ibarra', 'cybernetic', 3, 64, 72, 36], ['saldivar', 'ideology', 'Elena Saldívar', 'technocracy', 3, 74, 50, 46], ['echeverri', 'foreign', 'Luis Echeverri', 'liberal', 2, 62, 45, 51]],
    names: [['Julio', 'Tomás', 'Luis', 'Elena', 'Andrés', 'Rafael', 'Inés', 'Mateo'], ['Arce', 'Ibarra', 'Saldívar', 'Echeverri', 'Montalvo', 'Quiroga', 'Ospina', 'Vargas']],
    q: { name: 'The Model', low: 'The model is wrong', high: 'The model is right', init: 70,
      desc: 'The Directorate governs by a model of the national economy: ten thousand equations, recalculated every quarter. When it is right, Meridia hums. When it drifts, nobody notices until it is too late.',
      drift: (n) => -0.5 - (n.crises || 0) * 0.4 + (n.budget && n.budget.science > 0.1 ? 0.3 : 0),
      fx: (n, v) => ({ eff: (v - 50) * 0.0016, legit: (v - 50) * 0.08, prod: (v - 50) * 0.0008 }),
      acts: [
        { id: 'me_q_recal', name: 'Recalibrate the model', desc: 'A quarter’s work by every statistician in the republic.', cost: { auth: 5, gold: 60 }, cd: 12, dv: 15, fx: [] },
        { id: 'me_q_ignore', name: 'Ignore the anomalies', desc: 'The figures that disagree with the model are filed as errors.', cd: 12, dv: -6, fx: [['auth', 10]] },
        { id: 'me_q_open', name: 'Open the data', desc: 'Every input published, so that anyone may find the mistake.', cost: { auth: 8 }, cd: 24, dv: 10, fx: [['sup', 'intelligentsia', 4], ['particip', 4]] },
      ],
      lo: 'nq_me_lo', loAt: 15, hi: 'nq_me_hi', hiAt: 92 },
  };
  ev({ id: 'nq_me_lo', title: 'The model is wrong', text: 'The harvest the model predicted did not come. Neither did the exports, the tax receipts or the new housing. The newspapers have started printing their own figures.',
    opts: [
      { label: 'Blame the economists', fx: [['figLoy', 'economy', -20], ['stab', -2], ['nq', 10]] },
      { label: 'Admit the error', fx: [['legitmod', -5, 12, 'The model was wrong'], ['nq', 20], ['sup', 'intelligentsia', 4]] },
    ] });
  ev({ id: 'nq_me_hi', tone: 'good', title: 'The model predicts its own success', text: 'For twelve quarters running the model has been right to the decimal place. The Directorate is asked whether it still needs a Directorate.',
    opts: [
      { label: 'Let the model plan everything', fx: [['mod', 'eff', 0.06, 36, 'The model plans'], ['drift', 'cybernetic', 15]] },
      { label: 'Keep people in the loop', fx: [['legitmod', 4, 36, 'People in the loop'], ['nq', -10]] },
    ] });

  /* ---------------------------------------------------------------- Antara */
  N.Antara = {
    ideo: 'demsoc', leader: ['Esteban Varela', 57, ['orator', 'honest'], 'President'],
    cast: [['ugarte', 'army', 'General Mateo Ugarte', 'junta', 2, 60, 82, 51], ['ferrada', 'police', 'Joaquín Ferrada', 'demsoc', 2, 74, 40, 49],
      ['carrasco', 'economy', 'Inés Carrasco', 'council', 3, 66, 60, 38], ['molina', 'ideology', 'Andrés Molina', 'demsoc', 2, 70, 55, 45], ['fuentes', 'foreign', 'Orlando Fuentes', 'socdem', 3, 68, 45, 54]],
    names: [['Mateo', 'Joaquín', 'Inés', 'Andrés', 'Orlando', 'Clodomiro', 'Gladys', 'Volodia'], ['Ugarte', 'Ferrada', 'Carrasco', 'Molina', 'Fuentes', 'Letelier', 'Bachelet', 'Prats']],
    q: { name: 'Copper and Debt', low: 'The companies’ copper', high: 'Our copper', init: 20,
      desc: 'Copper pays for half of Antara’s imports and the foreign companies that mine it pay for half of its newspapers.',
      drift: (n) => (is(n, 'demsoc') || fam(n) === 'socialist' ? 0.2 : -0.2),
      fx: (n, v) => ({ rev: (v - 50) * 0.002, coup: v > 60 ? (v - 60) * 0.015 : 0, conf: (50 - v) * 0.12, trade: (50 - v) * 0.002 }),
      acts: [
        { id: 'an_q_nat', name: 'Nationalise a mine', desc: 'One more mountain of copper passes to the state, with compensation to be discussed.', cost: { auth: 10 }, cd: 24, dv: 20, fx: [['sup', 'capital', -8], ['sup', 'workers', 5]] },
        { id: 'an_q_comp', name: 'Compensate the companies', desc: 'A fair price, paid in bonds, so that nobody abroad has an excuse.', cost: { gold: 120 }, cd: 36, dv: 0, fx: [['mod', 'coup', -0.2, 36, 'Compensation paid'], ['sup', 'capital', 4]] },
        { id: 'an_q_bread', name: 'Copper for bread', desc: 'Barter deals with any country that will pay in wheat.', cd: 24, dv: 5, fx: [['mod', 'food', 0.05, 24, 'Copper for bread'], ['opAll', -2]] },
      ],
      hi: 'nq_an_hi', hiAt: 90, lo: 'nq_an_lo', loAt: 8 },
  };
  ev({ id: 'nq_an_hi', title: 'The invisible blockade', text: 'No new credit, no spare parts for the lorries, no buyers for the copper at the old price. Nobody has declared anything. The shelves are emptying anyway.',
    opts: [
      { label: 'Ration and endure', fx: [['mod', 'ls', -2, 24, 'The blockade'], ['sig', 10]] },
      { label: 'Negotiate with the creditors', fx: [['nq', -15], ['gold', 100], ['sup', 'workers', -6]] },
    ] });
  ev({ id: 'nq_an_lo', title: 'The copper strike', text: 'The miners of the northern desert have downed tools. They want the copper that comes out of their mountain to stay in their country.',
    opts: [
      { label: 'Meet the miners', fx: [['nq', 15], ['gold', -80], ['sup', 'workers', 6]] },
      { label: 'Call the army', fx: [['mod', 'unrest', -4, 12, 'Troops in the north'], ['sup', 'workers', -10], ['figLoy', 'army', 8]] },
    ] });

  /* ---------------------------------------------------------------- Kelda */
  N.Kelda = {
    ideo: 'minarchy', leader: ['Angus Rennick', 60, ['economist', 'cautious'], 'First Freeholder'],
    cast: [['dunbar', 'army', 'Captain Hamish Dunbar', 'minarchy', 2, 72, 40, 55], ['kerr', 'police', 'Sheriff Morag Kerr', 'minarchy', 2, 70, 45, 48],
      ['fraser', 'economy', 'Lachlan Fraser', 'liberal', 3, 60, 65, 50], ['galt', 'ideology', 'Ewan Galt', 'minarchy', 3, 74, 55, 43], ['baird', 'foreign', 'Fiona Baird', 'liberal', 2, 66, 50, 41]],
    names: [['Hamish', 'Lachlan', 'Ewan', 'Fiona', 'Murdo', 'Callum', 'Isla', 'Torquil'], ['Dunbar', 'Fraser', 'Galt', 'Baird', 'Munro', 'Gunn', 'Mackay', 'Sutherland']],
    q: { name: 'Other People’s Money', low: 'Clean books', high: 'The vault', init: 60,
      desc: 'Kelda has no income tax because it has a billion in other people’s money, and no other people’s money without its famous discretion.',
      drift: (n) => (is(n, 'minarchy', 'merchant', 'liberal') ? 0.15 : -0.3),
      fx: (n, v) => ({ rev: (v - 50) * 0.003, conf: (v - 50) * 0.2 }),
      tick: (n, G, v) => { if (v > 70 && G.rng.chance(0.25)) { const o = G.rng.pick(ID.alive(G)); if (o !== n) ID.addOp(G, o.id, n.id, -1); } },
      acts: [
        { id: 'ke_q_secret', name: 'Strengthen bank secrecy', desc: 'Prison for any clerk who names a client.', cd: 18, dv: 12, fx: [['opAll', -3], ['gold', 60]] },
        { id: 'ke_q_inquiry', name: 'Answer the foreign inquiry', desc: 'Some names, some accounts, nothing that cannot be denied later.', cost: { auth: 5 }, cd: 24, dv: -15, fx: [['opAll', 6]] },
        { id: 'ke_q_fleet', name: 'Fund the island fleet', desc: 'Two cruisers, bought second-hand and paid in cash.', cost: { gold: 120 }, cd: 24, dv: 0, fx: [['mod', 'def', 0.08, 36, 'Island fleet']] },
      ],
      hi: 'nq_ke_hi', hiAt: 90, lo: 'nq_ke_lo', loAt: 10 },
  };
  ev({ id: 'nq_ke_hi', title: 'The vault scandal', text: 'A foreign newspaper has found a dictator’s fortune in a Keldan vault, down to the account number. Six governments want it frozen; the dictator wants it kept.',
    opts: [
      { label: 'Freeze the account', fx: [['nq', -20], ['opAll', 6], ['gold', -100]] },
      { label: 'Discretion is our product', fx: [['nq', 5], ['opAll', -8], ['gold', 200]] },
    ] });
  ev({ id: 'nq_ke_lo', title: 'The money sails away', text: 'Without its secrecy, the money that made Kelda rich has gone looking for an island that still keeps it.',
    opts: [
      { label: 'Cut the last taxes', fx: [['mod', 'rev', -0.08, 36, 'The last taxes cut'], ['nq', 15]] },
      { label: 'Let it go', fx: [['sig', -10], ['legitmod', 3, 24, 'Clean books']] },
    ] });

  /* ---------------------------------------------------------------- Vess */
  N.Vess = {
    ideo: 'council', leader: ['Jorunn Vik', 39, ['orator', 'honest'], 'Chair of the Harbour Council'],
    cast: [['brekke', 'army', 'Captain Olav Brekke', 'trot', 3, 58, 80, 42], ['moen', 'police', 'Ivar Moen', 'council', 2, 72, 40, 50],
      ['strand', 'economy', 'Kari Strand', 'council', 2, 70, 45, 37], ['hval', 'ideology', 'Asbjørn Hval', 'ancom', 3, 62, 55, 44], ['fjeld', 'foreign', 'Nils Fjeld', 'ml', 2, 55, 65, 46]],
    names: [['Olav', 'Ivar', 'Kari', 'Asbjørn', 'Nils', 'Sigrid', 'Torstein', 'Ragna'], ['Brekke', 'Moen', 'Strand', 'Hval', 'Fjeld', 'Aas', 'Vold', 'Rønning']],
    q: { name: 'The Cruiser', low: 'The councils’ ship', high: 'The crew’s island', init: 55,
      desc: 'The crew of the mutinous cruiser made the revolution and still lives aboard her. Her guns face the mainland; some of the councils wonder which way they would turn.',
      drift: (n) => (n.nwars ? 0.5 : -0.2) + (is(n, 'trot', 'ml') ? 0.2 : 0),
      fx: (n, v) => ({ def: (v - 50) * 0.003, atk: (v - 50) * 0.002, legit: n.ideo === 'council' || fam(n) === 'anarchist' ? (50 - v) * 0.05 : 0 }),
      tick: (n, G, v) => { if (v > 75) { if (n.drift.trot != null) n.drift.trot += 0.2; else if (n.drift.ml != null) n.drift.ml += 0.2; } },
      acts: [
        { id: 'vs_q_rotate', name: 'Rotate the crew', desc: 'Half the crew ashore to the shipyards, half the shipyards aboard.', cost: { auth: 5 }, cd: 18, dv: -15, fx: [['sup', 'military', -5], ['particip', 4]] },
        { id: 'vs_q_seat', name: 'A seat for the crew', desc: 'The cruiser sends its own delegates to the council, with a vote each.', cd: 24, dv: 10, fx: [['mod', 'def', 0.06, 24, 'The crew’s council'], ['particip', -4]] },
        { id: 'vs_q_sail', name: 'Sail the cruiser', desc: 'Steam out and show the guns to the enemy coast.', cost: { gold: 40 }, cd: 18, dv: 8, can: (n) => (n.nwars ? '' : 'Only in wartime.'), fx: [['mod', 'atk', 0.08, 4, 'The cruiser sails']] },
      ],
      hi: 'nq_vs_hi', hiAt: 88, lo: 'nq_vs_lo', loAt: 10 },
  };
  ev({ id: 'nq_vs_hi', title: 'The crew elects its own government', text: 'The cruiser’s committee has voted to form a revolutionary government of the island, with the captain as its chairman. The guns are trained on the harbour council’s hall.',
    opts: [
      { label: 'Bow to the guns', fx: [['drift', 'trot', 20], ['sup', 'military', 6], ['particip', -10], ['figLoy', 'army', 20]] },
      { label: 'The councils say no', fx: [['nq', -25], ['stab', -5], ['mod', 'def', -0.06, 12, 'The crew humbled']] },
    ] });
  ev({ id: 'nq_vs_lo', title: 'The cruiser rusts', text: 'Nobody has stood a watch aboard for a year. The paint is peeling, the boilers are cold and the gulls have taken the bridge.',
    opts: [
      { label: 'Scrap her and build trawlers', fx: [['mod', 'food', 0.06, PERM, 'Trawlers from the cruiser'], ['mod', 'def', -0.04, PERM, 'No cruiser']] },
      { label: 'Refit her', fx: [['gold', -150], ['nq', 20]] },
    ] });
})();
