/* IRON DIALECTIC — the storyline's branches. Choices at turning points set story flags (option.sf,
   read with ID.Story.flag); new beats depend on those flags and on how things actually turned out, so
   the century forks. Beats with player: true go to the player's own country whatever it is (pcond).
   Loads after data/focus.js. In divergent history (G.story.loose) AI countries sometimes take the
   other road at a turning point (sim/events.js). */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const E = ID.EVENT_DEFS;
  const story = (o) => { o.sys = 1; o.story = 1; E.push(o); return o; };
  const by = (G, b) => ID.byBase(G, b);
  const F = (G, k) => !!(G.story && G.story.flags && G.story.flags[k]);
  const fam = (n) => ID.ideo(n).family;
  const authLike = (n) => ['personalist', 'corporatist', 'junta', 'natpop'].indexOf(n.ideo) >= 0;
  const def = (id) => E.find((x) => x.id === id);
  const beat = (id) => ID.STORY.find((b) => b.id === id);
  /* tag the options of an existing dispatch with story flags, in order */
  const tag = (id, flags) => { const d = def(id); if (!d || typeof d.opts === 'function') return; flags.forEach((f, k) => { if (d.opts[k] && f) d.opts[k].sf = f; }); };
  const add = (b) => ID.STORY.push(b);

  /* ---------------------------------------------------------------- the old turning points, remembered */
  tag('st_straits', ['straits_neutral', 'straits_hesperia', 'straits_aurelia']);
  tag('st_cassine_enters', ['cassine_war1', 'cassine_out1']);
  tag('st_february', ['feb_abdicate', 'feb_guards']);
  tag('st_october', ['oct_fight', 'oct_councils', 'oct_generals']);
  tag('st_marshal', ['marshal_generals', 'marshal_crown', 'marshal_elections']);
  tag('st_congress', ['onecountry', 'permrev']);
  tag('st_election32', ['newdeal', 'populist', 'stay32']);
  tag('st_leader', ['fullpowers', 'chambers']);
  tag('st_generals', ['barricades', 'verano_yields']);
  tag('st_union', ['union_demanded', 'union_refused']);
  tag('st_suyan_rev', ['suyan_fights', 'suyan_coalition']);
  tag('st_secret', ['thaw', 'no_thaw']);
  tag('st_antara_coup', ['antara_falls', 'antara_arms']);
  // a third road in February
  (def('st_february').opts).push({ label: 'Grant a constitution', sf: 'feb_constitution', tip: 'The Emperor becomes a constitutional monarch. The street may accept it; the councils will not.', fx: [['ideology', 'conmon', 'reform'], ['stab', -6], ['sup', 'workers', -4]] });

  /* ---------------------------------------------------------------- Aurelia */
  add({ id: 'st_white_crown', date: [1919, 3], nation: 'Aurelia', cond: (G) => { const a = by(G, 'Aurelia'); return a && (a.ideo === 'absmon' || a.ideo === 'conmon') && !a.civil; } });
  story({ id: 'st_white_crown', title: 'The crown survives', text: 'The red flags are down, the councils dispersed, the ringleaders hanged or fled across the border. The court asks what kind of empire it has saved.',
    opts: [
      { label: 'A crusade against the councils abroad', sf: 'white_crusade', tip: 'War on the nearest red state.', fx: [['glory', 8], ['fn', (G, n) => { let t = null; for (const k in G.border[n.id] || {}) { const o = G.nations[+k]; if (o && o.alive && (fam(o) === 'socialist' || fam(o) === 'anarchist') && !ID.atWar(G, n.id, o.id)) { t = o; break; } } if (t && !ID.Diplomacy.warBlock(G, n, t)) ID.Diplomacy.startWar(G, n, t, 'liberate'); }], ['note', 'War on a neighbouring red state, if there is one']] },
      { label: 'A constitution from above', hist: 1, sf: 'white_constitution', fx: [['ideology', 'conmon', 'reform'], ['sup', 'intelligentsia', 8]] },
      { label: 'Restore the old order', sf: 'white_reaction', fx: [['tradition', 10], ['grievance', 10], ['sup', 'clergy', 6], ['sup', 'workers', -8]] },
    ] });
  add({ id: 'st_white_generals', date: [1920, 6], nation: 'Aurelia', cond: (G) => { const a = by(G, 'Aurelia'); return a && (a.ideo === 'liberal' || a.ideo === 'socdem') && !a.civil && F(G, 'oct_fight'); } });
  story({ id: 'st_white_generals', title: 'The generals want a dictator', text: 'The republic has beaten the councils, and the generals who beat them want their reward: a president with emergency powers, chosen by the army. The assembly is surrounded by cavalry.',
    opts: [
      { label: 'Defend the republic', hist: 1, sf: 'republic_holds', fx: [['stab', -6], ['sup', 'military', -10], ['mandate', 10], ['particip', 6]] },
      { label: 'A strong president', sf: 'white_dictator', fx: [['ideology', 'junta', 'coup'], ['sup', 'military', 10]] },
    ] });
  add({ id: 'st_kronstadt', date: [1921, 3], nation: 'Aurelia', cond: (G) => { const a = by(G, 'Aurelia'); return a && (a.ideo === 'council' || a.ideo === 'ml') && !a.civil; } });
  story({ id: 'st_kronstadt', title: 'The sailors of the fortress', text: (n) => 'The sailors of the island fortress, heroes of the revolution, have elected their own council and sent their demands: free elections to the councils, freedom of speech for all socialist currents, an end to requisitions. ' + (n.ideo === 'ml' ? 'The party calls it a mutiny.' : 'The party caucus inside the congress calls it a mutiny and asks for the army.'),
    opts: [
      { label: 'Hear the sailors', sf: 'kronstadt_heard', tip: 'The councils stay free. The party is put in its place.', fx: [['ideology', 'council', 'reform'], ['particip', 12], ['sig', 15], ['sup', 'bureaucracy', -10]] },
      { label: 'Crush the mutiny', hist: 1, sf: 'kronstadt_crushed', tip: 'The party takes the councils in hand, for the duration.', fx: [['ideology', 'ml', 'reform'], ['discipline', 12], ['grievance', 12], ['particip', -10]] },
    ] });
  add({ id: 'st_black_earth', date: [1932, 6], nation: 'Aurelia', cond: (G) => { const a = by(G, 'Aurelia'); return a && (a.ideo === 'ml' || a.ideo === 'personalist') && F(G, 'kronstadt_crushed'); } });
  story({ id: 'st_black_earth', title: 'Hunger in the black earth', text: 'The collective farms have delivered the quota and kept nothing for the winter. In the southern provinces whole villages are eating the seed corn. The grain trains are still running north.',
    opts: [
      { label: 'The quota stands', hist: 1, sf: 'famine_quota', fx: [['gold', 200], ['pop', -0.03], ['sup', 'peasants', -15], ['grievance', 15], ['mod', 'prod', 0.04, 36, 'Grain for machines']] },
      { label: 'Stop the trains', sf: 'famine_relief', fx: [['gold', -100], ['sup', 'peasants', 8], ['discipline', -8], ['mod', 'prod', -0.03, 24, 'Plan delayed']] },
    ] });

  /* ---------------------------------------------------------------- Karsova */
  add({ id: 'st_red_march', date: [1927, 5], nation: 'Karsova', cond: (G) => { const k = by(G, 'Karsova'); return k && k.ideo === 'trot'; } });
  story({ id: 'st_red_march', title: 'The march on the west', text: 'The congress chose permanent revolution. Now the general staff asks whether it meant it: the workers of the western neighbour are on strike, and their government is weak.',
    opts: [
      { label: 'Carry the revolution west', hist: 1, sf: 'red_march', fx: [['fervor', 12], ['fn', (G, n) => { let t = null, ts = 999; for (const k in G.border[n.id] || {}) { const o = G.nations[+k]; if (o && o.alive && fam(o) !== 'socialist' && !ID.atWar(G, n.id, o.id) && o.stab < ts) { ts = o.stab; t = o; } } if (t && !ID.Diplomacy.warBlock(G, n, t)) ID.Diplomacy.startWar(G, n, t, 'liberate'); }], ['note', 'War on the shakiest non-socialist neighbour']] },
      { label: 'Agitation, not invasion', sf: 'red_agitation', fx: [['subvertNb', 15], ['sig', 10]] },
    ] });
  add({ id: 'st_kirov', date: [1934, 12], nation: 'Karsova', cond: (G) => { const k = by(G, 'Karsova'); return k && (k.ideo === 'ml' || k.ideo === 'personalist'); } });
  story({ id: 'st_kirov', title: 'Shots in the party headquarters', text: 'The secretary of the capital’s party committee has been shot dead in a corridor of his own headquarters. The assassin had been arrested twice before, and released twice.',
    opts: [
      { label: 'The great purge', hist: 1, sf: 'great_purge', tip: 'Unity through terror. The officer corps will not recover for years.', fx: [['sig', 25], ['discipline', 20], ['grievance', 20], ['sup', 'intelligentsia', -12], ['mod', 'atk', -0.12, 72, 'The officer corps purged'], ['bureau', -10]] },
      { label: 'Find the real killer', sf: 'no_purge', fx: [['sig', -10], ['discipline', -5], ['sup', 'bureaucracy', 6], ['sup', 'military', 6]] },
    ] });
  add({ id: 'st_wolves', date: [1939, 8], nation: 'Karsova', cond: (G) => { const k = by(G, 'Karsova'), h = by(G, 'Hesperia'); return k && h && authLike(h) && fam(k) === 'socialist' && !ID.atWar(G, k.id, h.id); } });
  story({ id: 'st_wolves', title: 'The pact of the wolves', text: 'Hesperia’s foreign minister has flown in with a draft treaty: ten years of peace, a secret protocol dividing the lands between us, and a toast to the leaders of both peoples. Cassine’s envoy, still waiting downstairs, offers an alliance instead.',
    opts: [
      { label: 'Sign the pact', hist: 1, sf: 'wolves', tip: 'Peace with Hesperia, for now. Everyone else will remember.', fx: [['fn', (G, n) => { const h = by(G, 'Hesperia'); if (h) { const d = ID.dipOf(G, n.id, h.id); d.nap = 1; ID.addOpBoth(G, n.id, h.id, 20); } }], ['note', 'A non-aggression pact with Hesperia'], ['opAll', -6], ['claimsAll']] },
      { label: 'Join the democracies', sf: 'popfront', tip: 'An alliance with Cassine against Hesperia.', fx: [['ally', 'Cassine'], ['op', 'Hesperia', -30], ['sig', -6]] },
    ] });
  add({ id: 'st_thunder_after', date: [1941, 7], title: 'The first weeks', cond: (G) => { const k = by(G, 'Karsova'), h = by(G, 'Hesperia'); return k && h && ID.atWar(G, k.id, h.id); },
    run: (G) => { const k = by(G, 'Karsova');
      if (F(G, 'wolves')) { ID.addMod(k, 'def', -0.18, 4, 'Caught unprepared'); ID.headline(G, { kicker: 'Caught unprepared', title: 'The front collapses', sub: 'Karsova trusted the pact. Its armies were asleep in their barracks when the guns opened.', a: k.id, tone: 'war' }); }
      else { ID.addMod(k, 'def', 0.1, 6, 'The front was ready'); ID.headline(G, { kicker: 'The line holds', title: 'Karsova was ready', sub: 'No pact, no illusions: the frontier armies were dug in and waiting.', a: k.id, tone: 'war' }); }
      if (F(G, 'great_purge')) ID.news(G, 'Karsova’s generals are young, frightened and inexperienced: the purge is paid for at the front.', 'war', k.id); } });
  add({ id: 'st_leader_dies', date: [1953, 3], nation: 'Karsova', cond: (G) => { const k = by(G, 'Karsova'); return k && (k.ideo === 'ml' || k.ideo === 'personalist'); } });
  story({ id: 'st_leader_dies', title: 'The Leader is dead', text: 'He died alone on the floor of his dacha; the guards were too frightened to open the door. Now four men sit around the table in the Kremlin of the north, and each has a list.',
    opts: [
      { label: 'Collective leadership', hist: 1, sf: 'collective', fx: [['fn', (G, n) => ID.Politics.newLeader(G, n, 'dies')], ['drift', 'marketsoc', 10], ['grievance', -10], ['stab', -4]] },
      { label: 'The security chief takes the chair', sf: 'beria', fx: [['fn', (G, n) => ID.Politics.newLeader(G, n, 'dies')], ['ideology', 'personalist', 'succession'], ['grievance', 10]] },
      { label: 'The marshals step in', sf: 'marshals', fx: [['fn', (G, n) => ID.Politics.newLeader(G, n, 'dies')], ['ideology', 'junta', 'coup'], ['sup', 'military', 10]] },
    ] });

  /* ---------------------------------------------------------------- Cassine */
  add({ id: 'st_league', date: [1919, 6], nation: 'Cassine', cond: (G) => { const c = by(G, 'Cassine'); return c && fam(c) === 'liberal'; } });
  story({ id: 'st_league', title: 'The League of Free Nations', text: 'The President came home from the peace conference with a covenant: an assembly of nations, collective security, an end to secret treaties. The Senate has to ratify it, and the Senate wants to come home too.',
    opts: [
      { label: 'Ratify the covenant', hist: 1, sf: 'league', fx: [['opAll', 8], ['mandate', -4]] },
      { label: 'A return to normalcy', sf: 'isolation', tip: 'Cassine will stay out of the next European war, unless it is attacked.', fx: [['mod', 'prod', 0.04, 120, 'Normalcy'], ['opAll', -4]] },
    ] });
  add({ id: 'st_infamy', date: [1941, 12], title: 'A date that will live in infamy', cond: (G) => { const c = by(G, 'Cassine'), h = by(G, 'Hesperia'); return F(G, 'isolation') && c && h && authLike(h) && !ID.atWar(G, c.id, h.id); },
    run: (G) => { ID.headline(G, { kicker: 'Without warning', title: 'The fleet is burning', sub: 'Dravan and Hesperian bombers strike Cassine’s fleet at anchor. Isolation is over.', tone: 'war' }); ID.storyWar(G, 'Drava', 'Cassine', 'claims', 'The admirals say the Cassine fleet can be destroyed at anchor.'); ID.storyWar(G, 'Hesperia', 'Cassine', 'claims', 'Our allies have struck. Cassine is already at war with us in all but name.'); } });
  add({ id: 'st_reconstruction', date: [1947, 6], nation: 'Cassine', cond: (G) => { const c = by(G, 'Cassine'); return c && fam(c) === 'liberal'; } });
  story({ id: 'st_reconstruction', title: 'The reconstruction plan', text: 'The secretary of state proposes to rebuild the ruined continent with Cassine money: loans, grain, machine tools, for every country that will take them and open its markets.',
    opts: [
      { label: 'Aid for every free nation', hist: 1, sf: 'marshall', fx: [['gold', -350], ['fn', (G, n) => { for (const o of G.nations) if (o && o.alive && o !== n && (fam(o) === 'liberal' || ID.sameBloc(G, n.id, o.id))) { ID.addOpBoth(G, n.id, o.id, 15); o.gold += 120; } }], ['note', 'Every liberal or allied state: +120 gold, relations +15'], ['mod', 'trade', 0.1, 120, 'Reconstruction trade']] },
      { label: 'Aid for allies only', sf: 'marshall_allies', fx: [['gold', -150], ['fn', (G, n) => { for (const o of G.nations) if (o && o.alive && o !== n && ID.sameBloc(G, n.id, o.id)) { ID.addOpBoth(G, n.id, o.id, 12); o.gold += 100; } }], ['note', 'Allies: +100 gold, relations +12']] },
      { label: 'Rebuild at home first', sf: 'marshall_no', fx: [['mod', 'prod', 0.04, 60, 'Home first'], ['opAll', -5]] },
    ] });
  add({ id: 'st_red_scare', date: [1950, 2], nation: 'Cassine', cond: (G) => { const c = by(G, 'Cassine'); return c && fam(c) === 'liberal'; } });
  story({ id: 'st_red_scare', title: 'The list of names', text: 'A junior senator waves a sheet of paper: two hundred and five communists, he says, in the State Department alone. The newspapers want the names; the civil service wants protection.',
    opts: [
      { label: 'Loyalty hearings', hist: 1, sf: 'red_scare', fx: [['grievance', 10], ['sup', 'intelligentsia', -10], ['mod', 'opp', -0.1, 60, 'Loyalty oaths'], ['stab', 2]] },
      { label: 'Defend the civil service', sf: 'no_scare', fx: [['mandate', -6], ['sup', 'intelligentsia', 8], ['corr', -4]] },
    ] });
  add({ id: 'st_civil_rights', date: [1963, 8], nation: 'Cassine', cond: (G) => { const c = by(G, 'Cassine'); return c && (fam(c) === 'liberal' || c.ideo === 'demsoc'); } });
  story({ id: 'st_civil_rights', title: 'The march on the capital', text: 'Two hundred and fifty thousand people stand before the memorial and hear a preacher describe a dream. The southern governors say the law will never pass.',
    opts: [
      { label: 'Pass the civil rights act', hist: 1, sf: 'civil_rights', fx: [['particip', 10], ['sup', 'intelligentsia', 8], ['legitmod', 4, 120, 'Civil rights'], ['stab', -3]] },
      { label: 'Order first', sf: 'order_first', fx: [['grievance', 15], ['mod', 'unrest', 4, 60, 'Unanswered grievances'], ['sup', 'clergy', 4]] },
    ] });

  /* ---------------------------------------------------------------- Hesperia, Verano, Suyan, Antara */
  add({ id: 'st_grand_council', date: [1943, 7], nation: 'Hesperia', cond: (G) => { const h = by(G, 'Hesperia'); if (!h || !authLike(h) || !h.nwars) return false; return ID.Diplomacy.enemies(G, h).some((e) => ID.Diplomacy.warScore(G, h, e) < 0); } });
  story({ id: 'st_grand_council', title: 'The Grand Council votes', text: 'The war is being lost. At two in the morning the Grand Council votes nineteen to seven to return the command of the armed forces to the King. The Leader goes to the palace in the afternoon, and does not come out.',
    opts: [
      { label: 'Depose the Leader and seek an armistice', hist: 1, sf: 'leader_deposed', fx: [['ideology', 'conmon', 'coup'], ['fn', (G, n) => { for (const e of ID.Diplomacy.enemies(G, n)) if (fam(e) === 'liberal' || fam(e) === 'socialist') ID.Diplomacy.peace(G, n, e); }], ['note', 'Peace with the liberal and socialist powers']] },
      { label: 'The Leader fights on', sf: 'leader_fights', fx: [['charisma', -10], ['mod', 'def', 0.08, 12, 'Last stand'], ['grievance', 10]] },
    ] });
  add({ id: 'st_brigades', date: [1936, 10], player: 1, pcond: (G, n) => { const v = by(G, 'Verano'); return v && v !== n && v.civil && G.nations[v.civil] && G.nations[v.civil].alive && ['socialist', 'anarchist', 'liberal'].indexOf(fam(n)) >= 0; } });
  story({ id: 'st_brigades', title: 'Volunteers for Verano', text: 'The Veranese federation is fighting the generals for its life, and the generals have Dravan aircraft. Thousands of our own people want to go and fight: miners, poets, schoolteachers.',
    opts: [
      { label: 'Let them go, and send rifles', sf: 'brigades', fx: [['troops', -0.01], ['gold', -60], ['fervor', 6], ['fn', (G, n) => { const v = by(G, 'Verano'); if (v) { v.troops += Math.max(20, n.pop * 0.004); ID.addOpBoth(G, n.id, v.id, 25); } }], ['note', 'Verano’s army grows; relations with Verano +25']] },
      { label: 'Non-intervention', hist: 1, sf: 'nonintervention', fx: [['sup', 'workers', -4], ['opAll', 2]] },
    ] });
  add({ id: 'st_may_days', date: [1937, 5], nation: 'Verano', cond: (G) => { const v = by(G, 'Verano'); return v && (fam(v) === 'anarchist' || v.ideo === 'council') && v.civil && G.nations[v.civil] && G.nations[v.civil].alive; } });
  story({ id: 'st_may_days', title: 'The May Days', text: 'Shooting at the telephone exchange: the government’s assault guards against the anarchist committees who run it. The communists demand that the militias become a regular army and the collectives return to the state. Without their rifles from abroad, the front will fall.',
    opts: [
      { label: 'A regular army and a strong government', hist: 1, sf: 'militarised', tip: 'The revolution is suspended to win the war.', fx: [['ideology', 'demsoc', 'reform'], ['mod', 'atk', 0.1, 60, 'A regular army'], ['particip', -15]] },
      { label: 'Defend the revolution', sf: 'revolution_first', fx: [['particip', 10], ['sig', 15], ['fervor', 10], ['fn', (G, n) => { for (const o of G.nations) if (o && o.alive && (o.ideo === 'ml' || o.ideo === 'personalist')) ID.addOpBoth(G, n.id, o.id, -25); }], ['note', 'The Marxist-Leninist states turn against you']] },
    ] });
  add({ id: 'st_great_leap', date: [1958, 5], nation: 'Suyan', cond: (G) => { const s = by(G, 'Suyan'); return s && s.ideo === 'mao'; } });
  story({ id: 'st_great_leap', title: 'The great leap forward', text: 'The Chairman wants to overtake the old industrial powers in fifteen years. Every commune is to build a furnace; every county is to double its grain. The figures from the provinces are already miraculous.',
    opts: [
      { label: 'Leap', hist: 1, sf: 'leap', fx: [['mod', 'prod', 0.1, 36, 'The great leap'], ['mod', 'food', -0.25, 24, 'The great leap'], ['pop', -0.03], ['dist', 25], ['sig', 20]] },
      { label: 'Walk on two legs', sf: 'no_leap', fx: [['mod', 'prod', 0.04, 60, 'Walking on two legs'], ['mod', 'food', 0.03, 60, 'Walking on two legs'], ['charisma', -6]] },
    ] });
  add({ id: 'st_cultural', date: [1966, 5], nation: 'Suyan', cond: (G) => { const s = by(G, 'Suyan'); return s && s.ideo === 'mao'; } });
  story({ id: 'st_cultural', title: 'Bombard the headquarters', text: 'A poster in the Chairman’s own hand, pinned to the door of the Central Committee: the party has been captured by capitalist roaders. The students have formed guards; the guards have formed lists.',
    opts: [
      { label: 'Let the Red Guards loose', hist: 1, sf: 'cultural_rev', fx: [['bureau', -30], ['fervor', 20], ['sup', 'intelligentsia', -20], ['mod', 'prod', -0.08, 36, 'Revolution in the factories'], ['charisma', 10]] },
      { label: 'Rein them in', sf: 'no_cultural', fx: [['discipline', 10], ['charisma', -10], ['sup', 'bureaucracy', 8]] },
    ] });
  add({ id: 'st_popular_unity', date: [1970, 9], nation: 'Antara', cond: (G) => { const a = by(G, 'Antara'); return a && ['liberal', 'socdem', 'demsoc', 'marketsoc'].indexOf(a.ideo) >= 0; } });
  story({ id: 'st_popular_unity', title: 'The election of 1970', text: 'The Popular Unity coalition has won a plurality: thirty-six per cent. Congress must confirm its candidate. The copper companies and their friends abroad are on the telephone.',
    opts: [
      { label: 'Popular Unity takes office', hist: 1, sf: 'popular_unity', fx: [['ideology', 'demsoc', 'election'], ['sup', 'workers', 10], ['sup', 'capital', -12]] },
      { label: 'Congress chooses the runner-up', sf: 'unity_blocked', fx: [['grievance', 15], ['sup', 'workers', -10], ['mandate', -10]] },
    ] });
  // the generals move only on a socialist Antara; a blocked election means a long, cold decade instead
  const ac = beat('st_antara_coup'); if (ac) { const c0 = ac.cond; ac.cond = (G) => !F(G, 'unity_blocked') && c0(G); }

  /* ---------------------------------------------------------------- the democracies and the dictators */
  add({ id: 'st_appeasement', date: [1938, 9], player: 1, pcond: (G, n) => { const h = by(G, 'Hesperia'), p = by(G, 'Pavon'); return h && p && h !== n && p !== n && authLike(h) && (fam(n) === 'liberal' || n.ideo === 'conmon' || n.ideo === 'demsoc') && !ID.atWar(G, n.id, h.id); } });
  story({ id: 'st_appeasement', title: 'The conference by the lake', text: 'Hesperia demands Pavon’s border provinces and promises they are its last demand in this world. The other powers are meeting in a hotel by the lake to decide whether to believe it.',
    opts: [
      { label: 'Peace for our time', hist: 1, sf: 'appeased', fx: [['stab', 3], ['op', 'Hesperia', 15], ['op', 'Pavon', -25]] },
      { label: 'Guarantee Pavon', sf: 'guarantee', tip: 'An alliance with Pavon. If Hesperia moves, you are at war.', fx: [['ally', 'Pavon'], ['op', 'Hesperia', -25], ['mod', 'atk', 0.04, 36, 'Rearmament']] },
    ] });
  add({ id: 'st_red_decade', date: [1931, 1], title: 'The red decade', cond: (G) => ID.alive(G).filter((n) => fam(n) === 'socialist' || fam(n) === 'anarchist').length >= 3,
    run: (G) => { for (const n of ID.alive(G)) if (fam(n) === 'liberal' && n.depression) { const tgt = G.rng.pick(['ml', 'council', 'demsoc']); ID.docSeed(G, n, tgt, 10, 3, 0); } ID.headline(G, { kicker: 'After the crash', title: 'The red decade', sub: 'With the factories shut and the banks broken, the young read Marx in every capital of the free world.', tone: 'rev' }); } });
  add({ id: 'st_axis', date: [1936, 11], title: 'The axis of steel', cond: (G) => { const h = by(G, 'Hesperia'); return h && authLike(h) && ID.alive(G).filter((n) => authLike(n) && n !== h).length >= 2; },
    run: (G) => { const h = by(G, 'Hesperia'), m = ID.alive(G).filter((n) => authLike(n) && n !== h && !n.civilOf).map((n) => n.base).slice(0, 3); ID.storyBloc(G, 'Hesperia', m); ID.headline(G, { kicker: 'An axis', title: 'The axis of steel', sub: 'Hesperia and the dictatorships sign a pact against the reds and the democracies alike.', tone: 'war' }); } });
  add({ id: 'st_satellite', date: [1957, 10], title: 'A star that moves', cond: (G) => ID.alive(G).some((n) => n.tech.mil >= 6),
    run: (G) => { let best = null; for (const n of ID.alive(G)) if (!best || (n.sciTotal || 0) > (best.sciTotal || 0)) best = n; if (!best) return; best.glory = Math.min(100, best.glory + 12); best.prestige = Math.min(100, (best.prestige || 0) + 10); ID.addMod(best, 'legit', 5, 36, 'The first satellite'); ID.headline(G, { kicker: 'Beep, beep', title: 'A star that moves', sub: best.name + ' puts the first artificial satellite into orbit. Every radio in the world can hear it.', a: best.id, tone: 'pol' }); } });
  // the second war follows from the choices of the 1930s
  const sw = beat('st_second_war');
  if (sw) sw.run = (G) => {
    ID.headline(G, { kicker: 'Again', title: 'The Second Great War', sub: F(G, 'isolation') ? 'Hesperia strikes south into Antara. Cassine stays at home and watches.' : 'Hesperia strikes south into Antara. Cassine declares war within the week.', tone: 'war' });
    ID.storyWar(G, 'Hesperia', 'Antara', 'claims', 'The general staff’s southern plan is ready. Antara’s socialists have no allies who can reach them in time.');
    if (!F(G, 'isolation')) { ID.storyWar(G, 'Cassine', 'Hesperia', 'containment', 'Hesperia has invaded Antara. Our guarantee is on the table.'); ID.storyWar(G, 'Drava', 'Cassine', 'claims', 'With Cassine’s fleet sailing east, the colonels see their chance.'); }
    if (F(G, 'guarantee')) { const p = by(G, 'Pavon'); if (p) ID.storyWar(G, 'Hesperia', 'Pavon', 'claims', 'Pavon’s guarantors are already at war with us.'); }
  };
  // a union that was guaranteed against is a war, not a union
  const un = beat('st_union'); if (un) { const c0 = un.cond; un.cond = (G) => c0(G) && !(F(G, 'guarantee') && G.rng.chance(0.5)); }

  ID.STORY.sort((a, b) => (a.date[0] - b.date[0]) * 12 + (a.date[1] - b.date[1]));
})();
