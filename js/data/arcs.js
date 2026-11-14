/* IRON DIALECTIC — arcs: the warnings before the blow. A rising, a coup, a succession, a war the
   country is tired of and a regime sliding into another all announce themselves to the player first,
   with a choice at each stage (queued from sim/politics.js). Loads after data/events.js. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const E = ID.EVENT_DEFS, ev = (o) => E.push(o);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const IN = (c) => (ID.IDEOLOGIES[c.ideo] ? ID.IDEOLOGIES[c.ideo].name : 'the opposition');
  const pct = (v) => Math.round((v || 0) * 100) + '%';
  /* act on the provinces where this movement is strong */
  const onMove = (G, n, ideo, fn) => { let k = 0; for (let p = 1; p < G.provinces.length; p++) { const Pr = G.provinces[p]; if (Pr.owner === n.id && Pr.opp === ideo) { fn(Pr); k++; } } return k; };
  const fac = { socialist: 'workers', anarchist: 'workers', liberal: 'intelligentsia', conservative: 'clergy', authoritarian: 'military', heterodox: 'intelligentsia' };

  /* ---------------------------------------------------------------- a rising, in two warnings */
  ev({ id: 'arc_rev1', sys: 1, sfx: 'alarm', tone: 'bad', title: (n, G, c) => 'The committees of ' + IN(c),
    text: (n, G, c) => 'In the provinces where the ' + IN(c) + ' movement is strong, committees have begun to meet openly. They collect dues, run soup kitchens and drill in the evenings. They hold ' + pct(c.share) + ' of the country. They are not yet asking for power. They will.',
    opts: [
      { label: 'Negotiate with their leaders', tip: 'Concessions to the people behind them. The movement loses its edge; the regime loses face.', fx: [['auth', -10], ['fn', (G, n, c) => { onMove(G, n, c.ideo, (Pr) => { Pr.oppStr *= 0.75; Pr.unrest = clamp(Pr.unrest - 6, 0, 100); }); const f = fac[ID.IDEOLOGIES[c.ideo].family]; if (f) { n.sm[f] += 6; n.fs[f] = Math.min(100, n.fs[f] + 5); } }], ['note', 'The movement weakens by a quarter; its social base is courted'], ['grievance', -6]], ai: 2 },
      { label: 'Infiltrate and divide', tip: 'Needs a political police.', can: (n) => n.laws.security === 'secret' || n.laws.security === 'terror', fx: [['fn', (G, n, c) => onMove(G, n, c.ideo, (Pr) => { Pr.oppStr *= 0.8; })], ['note', 'The movement weakens by a fifth'], ['grievance', 5]] },
      { label: 'Crack down now', tip: 'Arrests and closures before it grows. It will be remembered.', fx: [['fn', (G, n, c) => onMove(G, n, c.ideo, (Pr) => { Pr.oppStr *= 0.65; Pr.unrest = clamp(Pr.unrest + 10, 0, 100); })], ['note', 'The movement weakens by a third; unrest rises where it was'], ['grievance', 15], ['sup', 'intelligentsia', -8]] },
    ] });
  ev({ id: 'arc_rev2', sys: 1, sfx: 'alarm', tone: 'bad', title: (n, G, c) => 'The general strike is called',
    text: (n, G, c) => 'The ' + IN(c) + ' committees have called a general strike for the first of next month and published a list of demands that ends with the government’s resignation. Their militias are armed. The army is watching to see what you do.',
    opts: [
      { label: 'Meet their demands', tip: 'The movement collapses as a threat. The regime moves toward what they wanted.', fx: [['fn', (G, n, c) => { onMove(G, n, c.ideo, (Pr) => { Pr.oppStr *= 0.45; }); if (n.drift[c.ideo] != null) n.drift[c.ideo] = Math.min(100, n.drift[c.ideo] + 18); }], ['note', 'The movement is halved; any drift toward it grows'], ['stab', 5], ['auth', -15]], ai: 2 },
      { label: 'Martial law', tip: 'Soldiers at every factory gate. It may work; it will cost.', fx: [['fn', (G, n, c) => onMove(G, n, c.ideo, (Pr) => { Pr.oppStr *= 0.65; Pr.unrest = clamp(Pr.unrest + 12, 0, 100); })], ['mod', 'unrest', -8, 6, 'Martial law'], ['grievance', 20], ['sup', 'military', 4]] },
      { label: 'Let them come', tip: 'If they rise, the army will be ready.', fx: [['mod', 'def', 0.12, 4, 'The army stands ready'], ['sup', 'military', 3]] },
    ] });

  /* ---------------------------------------------------------------- a coup, foreshadowed */
  ev({ id: 'arc_coup', sys: 1, tone: 'bad', title: 'Talk in the officers’ mess',
    text: 'A colonel’s wife has said too much at a dinner. The officers meet at night, in each other’s flats, and the toast is no longer to the government. Nobody has a list of names, which is exactly the problem.',
    opts: [
      { label: 'Raise their pay', fx: [['gold', -80], ['sup', 'military', 8]], ai: 2 },
      { label: 'Transfer the loudest to the frontier', fx: [['auth', -10], ['prestige', -15], ['sup', 'military', -2], ['mod', 'atk', -0.03, 12, 'Reshuffled commands']] },
      { label: 'Let them talk', fx: [['note', 'Nothing changes, for now', null]] },
    ] });

  /* ---------------------------------------------------------------- a succession, prepared or not */
  ev({ id: 'arc_heir', sys: 1, tray: 1, tone: 'mixed', title: 'The heir question',
    text: (n) => n.leader.title + ' ' + n.leader.name + ' is ' + n.leader.age + '. The court talks of nothing but who comes next, and the factions have each chosen a candidate.',
    opts: [
      { label: 'Name the eldest', fx: [['flag', 'heir'], ['tradition', 6], ['sup', 'clergy', 3]], ai: 2 },
      { label: 'Name the ablest', fx: [['flag', 'heir'], ['sup', 'bureaucracy', 6], ['tradition', -4]] },
      { label: 'Leave it open', tip: 'Every faction keeps hoping. When the time comes, they will fight.', fx: [['sup', 'military', 2]] },
    ] });

  /* ---------------------------------------------------------------- a war the country is tired of */
  ev({ id: 'arc_weary', sys: 1, tray: 1, tone: 'bad', title: 'Letters from the front',
    text: 'The censors are opening forty thousand letters a day, and the letters say the same thing: the bread is bad, the officers are worse, and nobody knows what we are fighting for any more.',
    opts: [
      { label: 'Promise victory by spring', tip: 'Morale now. If the war is still on in a year, the promise will be remembered.', fx: [['we', -10], ['later', 12, 'arc_promise']], ai: 1 },
      { label: 'Put out peace feelers', tip: 'Neutral diplomats carry messages. Enemies who are also tired may listen.', fx: [['fn', (G, n) => { n.a.feelers = G.tick; for (const e of ID.Diplomacy.enemies(G, n)) ID.addOpBoth(G, n.id, e.id, 15); }], ['note', 'Relations with every enemy +15'], ['sup', 'military', -4]], ai: 2 },
      { label: 'Censor the letters', fx: [['we', -6], ['grievance', 10], ['sup', 'intelligentsia', -4]] },
    ] });
  ev({ id: 'arc_promise', sys: 1, tray: 1, tone: 'bad', title: 'Spring has come',
    w: (n) => (n.nwars ? 1 : 0),
    text: 'The government promised victory by spring. Spring is here, and so is the war.',
    opts: [
      { label: 'Blame the generals', fx: [['sup', 'military', -10], ['stab', -3]] },
      { label: 'Promise again', fx: [['legitmod', -6, 12, 'Broken promises'], ['we', 4]] },
    ] });

  /* ---------------------------------------------------------------- a regime sliding into another */
  ev({ id: 'arc_drift', sys: 1, tray: 1, tone: 'mixed', title: (n, G, c) => 'A faction within: ' + c.label,
    text: (n, G, c) => 'Inside the regime there is now an organised current that wants ' + (ID.IDEOLOGIES[c.to] ? ID.IDEOLOGIES[c.to].name : 'a different order') + '. It has a newspaper, a candidate for every office and friends in the ministries. ' + (c.why || ''),
    opts: [
      { label: 'Purge them', tip: 'The drift falls back sharply. The regime is a little poorer in talent and a little richer in enemies.', fx: [['fn', (G, n, c) => { if (n.drift[c.to] != null) n.drift[c.to] = Math.max(0, n.drift[c.to] - 25); }], ['note', 'This drift −25'], ['auth', -15], ['stab', -4], ['grievance', 6]] },
      { label: 'Steal their programme', tip: 'Adopt the popular half of what they want. The drift slows; the regime changes a little anyway.', fx: [['fn', (G, n, c) => { if (n.drift[c.to] != null) n.drift[c.to] = Math.max(0, n.drift[c.to] - 12); }], ['note', 'This drift −12'], ['stab', 3], ['sig', -6]], ai: 2 },
      { label: 'Let the debate run', tip: 'Perhaps they are right.', fx: [['particip', 4]] },
    ] });
})();
