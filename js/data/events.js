/* IRON DIALECTIC — events and decisions as data. See DESIGN.md §5 for the effect vocabulary.
   w(n,G) is a draw weight (0 = cannot fire). sys events are only queued by the simulation. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const clamp = ID.clamp;
  const S = (n, f) => n.fs[f], Pw = (n, f) => n.fp[f];
  const I = (n) => ID.ideo(n);
  const priv = (n) => ['market', 'mixed', 'pact', 'trade'].indexOf(I(n).econ.model) >= 0;
  const ctl = (n, ...t) => t.indexOf(I(n).control.type) >= 0;
  const fam = (n, ...f) => f.indexOf(I(n).family) >= 0;
  const is = (n, ...ids) => ids.indexOf(n.ideo) >= 0;
  const law = (n, c, ...o) => o.indexOf(n.laws[c]) >= 0;
  const hardSec = (n) => law(n, 'security', 'secret', 'terror');
  const closed = (n) => law(n, 'press', 'censored', 'propaganda');
  const b = (v) => (v ? 1 : 0);
  const E = (ID.EVENT_DEFS = []);
  const ev = (o) => E.push(o);

  /* ================================================================ SYSTEM EVENTS */
  function coupResolve(G, n, ctx, armed) {
    const Pl = ID.Politics; let odds = 1 - Pl.coupOdds(G, n, ctx.backer); if (armed) odds += 0.2;
    const to = Pl.coupIdeo(G, n, ctx.backer);
    if (G.rng.chance(odds)) {
      n.stab = clamp(n.stab - 10, 0, 100); n.sm.military += 14; n.fs.military = Math.min(100, n.fs.military + 10); n.flags.coupSurvived = 1; n.prestige = Math.max(0, n.prestige - 25);
      ID.addMod(n, 'atk', -0.08, 18, 'Officer purge');
      if (armed) { n.sm.military -= 22; n.fervor = Math.min(100, n.fervor + 15); n.sm.workers += 10; }
      ID.news(G, 'The coup in ' + n.name + ' collapses. The plotters are arrested.', 'good', n.id); ID.sfx(G, 'good');
      return;
    }
    if (armed) {
      const capP = G.prov[n.capital]; const mine = [];
      for (let p = 1; p < G.provinces.length; p++) if (G.provinces[p].owner === n.id && p !== capP) mine.push(G.provinces[p]);
      mine.sort((a, c) => a.urban - c.urban);
      const provs = mine.slice(0, Math.max(1, Math.round(mine.length * 0.55))).map((x) => x.id);
      if (provs.length) { ID.logGrief(n, G.tick, 'The coup half-succeeded: the army took the countryside.'); Pl.civilWar(G, n, to, provs, ctx.backer); return; }
    }
    ID.Game.defeat(G, 'coup', { ideo: to, backer: ctx.backer });
  }
  ev({ id: 'coup', sys: 1, sfx: 'alarm', title: 'Tanks in the capital',
    text: (n, G, c) => 'Before dawn, units of the {A} army surround the ministries and the radio station. ' + (c.backer ? 'Your police believe ' + G.nations[c.backer].name + ' paid for it. ' : '') + 'Your staff put the loyalists’ chances at about ' + Math.round((1 - ID.Politics.coupOdds(G, n, c.backer)) * 10) * 10 + '%.',
    opts: [
      { label: 'Rally the loyal regiments', tip: 'Fight it out. If the loyalists lose, the regime falls and the campaign ends.', fx: [['fn', (G, n, c) => coupResolve(G, n, c, false)]] },
      { label: 'Arm the workers', tip: 'Loyalist odds +20%. If it still fails, the country splits: you keep the cities, the army takes the countryside. If it succeeds, the army will never forgive you.',
        can: (n) => S(n, 'workers') >= 50 || fam(n, 'socialist', 'anarchist'), fx: [['fn', (G, n, c) => coupResolve(G, n, c, true)]] },
      { label: 'Take the chair they are offering', tip: 'Join the plotters and lead the new regime. You keep playing — as the government the coup creates.',
        fx: [['fn', (G, n, c) => { n.flags.everEmergency = 1; ID.Politics.changeIdeology(G, n, ID.Politics.coupIdeo(G, n, c.backer), 'coup', c.backer); }]] },
    ] });
  ev({ id: 'plot_uncovered', sys: 1, title: 'A plot uncovered', text: 'The security services have a list of officers who have been meeting where they should not. Nothing has happened yet.',
    opts: [
      { label: 'Purge the officer corps', fx: [['sup', 'military', -6], ['mod', 'atk', -0.1, 18, 'Officer purge'], ['prestige', -20], ['grievance', 4], ['fn', (G, n) => { n.a.coupAt = G.tick; }]], ai: 2 },
      { label: 'Quiet retirements', fx: [['sup', 'military', 3], ['auth', -8], ['fn', (G, n) => { n.a.coupAt = G.tick - 360; }]], ai: 2 },
      { label: 'Show clemency', tip: 'They will be grateful. For a while.', fx: [['sup', 'military', 9], ['fn', (G, n) => { n.a.coupAt = null; }], ['later', 14, 'ambitious_general']], ai: 1 },
    ] });
  ev({ id: 'civil_war', sys: 1, sfx: 'alarm', title: 'The country splits',
    text: (n, G, c) => 'Rebels have proclaimed ' + G.nations[c.rebel].name + ' and hold ' + Math.round((G.nations[c.rebel].tiles / (G.nations[c.rebel].tiles + n.tiles)) * 100) + '% of the national territory. Two governments now claim the same country. History will remember only one of them — choose which you are.',
    opts: [
      { label: 'Stand with the government', tip: 'Continue as ' + 'the existing state. Lose this war and the campaign ends.', fx: [] },
      { label: 'Go over to the rebels', tip: 'Play the rest of the campaign as the rebel state, under its ideology.',
        fx: [['fn', (G, n, c) => { const R = G.nations[c.rebel]; if (!R || !R.alive) return; n.ai = true; R.ai = false; G.player = R.id; R.log = n.log.slice(); R.hist = (n.hist || []).slice(); G.dirtyAll = true; ID.news(G, 'You have crossed the lines. You now lead ' + R.name + '.', 'rev', R.id); }]] },
    ] });
  ev({ id: 'election_lost', sys: 1, title: 'The election is lost',
    text: (n, G, c) => 'The count is in: the government has ' + Math.round(c.share * 100) + '%. The opposition, standing for ' + ID.IDEOLOGIES[c.opp].name + ', will form the next ministry — unless something is done.',
    opts: [
      { label: 'Hand over the seals of office', tip: 'The country changes government peacefully and you carry on under the new ideology. A short, mild transition.',
        fx: [['fn', (G, n, c) => ID.Politics.changeIdeology(G, n, c.opp, 'election')]] },
      { label: 'Annul the result', tip: 'Rule by emergency decree. The constitution is suspended and everyone knows it.',
        fx: [['emergency', 1], ['mandate', -60], ['stab', -12], ['unrest', 15], ['sup', 'intelligentsia', -12], ['particip', -20], ['opAll', -8], ['fn', (G, n) => { for (const d in n.drift) if (ID.IDEOLOGIES[d].axes.auth > 0.5) n.drift[d] = Math.min(100, n.drift[d] + 30); }]] },
    ] });
  ev({ id: 'drift', sys: 1, title: (n, G, c) => 'The regime is changing: ' + c.label,
    text: (n, G, c) => c.why + ' The pressure has built until the change is all but made. You may put yourself at its head, or spend your authority forcing it back.',
    opts: [
      { label: (n, G, c) => 'Ride it: become ' + ID.IDEOLOGIES[c.to].name, tip: 'The state changes ideology with a twelve-month transition. You keep playing under the new rules.', fx: [['fn', (G, n, c) => ID.Politics.changeIdeology(G, n, c.to, 'drift')]] },
      { label: 'Fight it', tip: 'Costs up to 40 authority and 8 stability; the drift falls back to 50. It will return if its causes remain.',
        fx: [['auth', -40], ['stab', -8], ['fn', (G, n, c) => { n.drift[c.to] = 50; for (const f of I(n).ruling) n.sm[f] -= 5; }]] },
    ] });
  ev({ id: 'strike_wave', sys: 1, title: 'Strike wave', text: 'Walk-outs spread from the engineering works to the docks and the rail yards. The strike committees want wages and recognition.',
    opts: [
      { label: 'Concede on wages', fx: [['gold', -60], ['sup', 'workers', 12], ['sup', 'capital', -5], ['inflation', 3]] },
      { label: 'Wait them out', fx: [['strike', 3], ['sup', 'workers', -2]] },
      { label: 'Break the strike', tip: 'Fast, and remembered.', can: (n) => !law(n, 'security', 'liberties') || law(n, 'labor', 'banned', 'company'), fx: [['strike', 1], ['sup', 'workers', -12], ['grievance', 6], ['opp', 5, 0.25]] },
    ] });
  ev({ id: 'general_strike', sys: 1, sfx: 'alarm', title: 'General strike', text: 'Nothing moves. Trams stand in the streets, the power stations are banked, and the strike committee is issuing its own passes. This is no longer about wages.',
    opts: [
      { label: 'Negotiate a new settlement', fx: [['gold', -120], ['sup', 'workers', 18], ['sup', 'capital', -10], ['stab', -3], ['strike', 1]] },
      { label: 'Send the army against the strikers', fx: [['strike', 2], ['sup', 'workers', -14], ['grievance', 12], ['opp', 16, 0.25], ['sup', 'military', -5], ['unrest', 8]] },
      { label: 'Stand back', tip: 'It will burn itself out. Probably.', fx: [['strike', 5], ['stab', -10], ['opp', 8, 0.25]] },
    ] });
  ev({ id: 'foreign_strike', sys: 1, title: 'A strike called from abroad', text: (n, G, c) => 'The general strike now paralysing your industry was co-ordinated from ' + G.nations[c.from].name + '. Your workers answered the call because they had reasons to.',
    opts: [
      { label: 'Meet the strikers’ demands', fx: [['gold', -80], ['sup', 'workers', 12], ['strike', -3]] },
      { label: 'Arrest the foreign agitators', fx: [['sup', 'workers', -6], ['grievance', 5], ['fn', (G, n, c) => ID.addOpBoth(G, n.id, c.from, -20)]] },
    ] });
  ev({ id: 'succession', sys: 1, sfx: 'alarm', title: 'The ruler is dead',
    text: (n, G, c) => c.old + ' is dead. ' + (c.prepared ? 'An heir was named, and for the moment the court holds its breath.' : 'No successor was ever agreed. Three men are already behaving like one.'),
    opts: [
      { label: 'Confirm the heir', tip: (n, G, c) => (c.prepared ? 'A prepared succession: a modest shock.' : 'Unprepared: it may go smoothly, it may bring a struggle, it may bring a coup.'),
        fx: [['fn', (G, n, c) => {
          const r = G.rng.next() + (c.prepared ? 0.45 : 0);
          if (I(n).legit.charisma) n.charisma = clamp(32 + r * 34, 15, 80);
          if (r > 0.6) { n.stab = Math.max(0, n.stab - 5); ID.news(G, 'The succession in ' + n.name + ' passes quietly.', 'good', n.id); }
          else if (r > 0.25) { n.stab = Math.max(0, n.stab - 18); n.sm.military -= 12; n.sm.bureaucracy -= 8; ID.news(G, 'A struggle for the succession convulses ' + n.name + '.', 'bad', n.id); ID.logGrief(n, G.tick, 'A succession struggle broke out.'); }
          else { n.stab = Math.max(0, n.stab - 12); ID.logGrief(n, G.tick, 'The succession was contested by force.'); ID.Politics.coup(G, n, 0); }
        }]] },
      { label: 'A regency of generals', fx: [['stab', -8], ['sup', 'military', 12], ['fn', (G, n) => { if (n.drift.junta != null) n.drift.junta = Math.min(100, n.drift.junta + 45); n.charisma = 35; }]] },
      { label: 'Promise a constitution', fx: [['stab', -5], ['sup', 'intelligentsia', 12], ['sup', 'workers', 6], ['tradition', -10], ['fn', (G, n) => { for (const d of ['conmon', 'liberal']) if (n.drift[d] != null) n.drift[d] = Math.min(100, n.drift[d] + 50); n.charisma = 40; }]] },
    ] });
  ev({ id: 'capitulation', sys: 1, sfx: 'victory', title: (n, G, c) => G.nations[c.loser].name + ' capitulates',
    text: (n, G, c) => 'Their capital has fallen and their army has stopped answering orders. ' + G.nations[c.loser].name + ' is yours to dispose of. What you take you must hold: annexed provinces resist for years.',
    opts: [
      { label: 'Annex everything', tip: 'All their remaining land becomes yours. Unrest in non-core provinces, a large jump in threat.', fx: [['fn', (G, n, c) => { const L = G.nations[c.loser]; if (L.alive && ID.atWar(G, n.id, L.id)) ID.Diplomacy.resolveCapitulation(G, L, n, 'annex'); }]] },
      { label: 'Install a friendly regime', tip: 'They keep their core land under your ideology and join your bloc. Counts toward ideological victory and costs you no occupation.', fx: [['fn', (G, n, c) => { const L = G.nations[c.loser]; if (L.alive && ID.atWar(G, n.id, L.id)) ID.Diplomacy.resolveCapitulation(G, L, n, 'install'); }]] },
      { label: 'Take an indemnity and withdraw', tip: 'Gold now, their gratitude, and no new threat.', fx: [['fn', (G, n, c) => { const L = G.nations[c.loser]; if (L.alive && ID.atWar(G, n.id, L.id)) ID.Diplomacy.resolveCapitulation(G, L, n, 'release'); }]] },
    ] });
  ev({ id: 'ally_attacked', sys: 1, sfx: 'alarm', title: 'An ally is attacked', text: (n, G, c) => G.nations[c.enemy].name + ' has declared war on your ally ' + G.nations[c.ally].name + '. The treaty is unambiguous.',
    opts: [
      { label: 'Honour the alliance', fx: [['fn', (G, n, c) => { const e = G.nations[c.enemy]; if (e.alive && !ID.Diplomacy.warBlock(G, n, e)) ID.Diplomacy.startWar(G, n, e, 'alliance'); }], ['glory', 4]] },
      { label: 'Stay out of it', tip: 'You leave the bloc in disgrace.', fx: [['glory', -8], ['fn', (G, n) => ID.Diplomacy.leaveBloc(G, n, true)]] },
    ] });
  ev({ id: 'plan_failed', sys: 1, title: 'The plan has fallen short', text: (n) => 'The Five-Year Plan closes at ' + Math.round((n.a.planRatio || 0.8) * 100) + '% of its industrial target. The figure has not yet left the planning commission.',
    opts: [
      { label: 'Admit the shortfall', fx: [['discipline', -10], ['fervor', -6], ['legitmod', -4, 12, 'Plan shortfall'], ['dist', -6]] },
      { label: 'Falsify the figures', tip: 'Announce fulfilment. It will not count toward your objective, and the planners will learn what kind of numbers you want.', fx: [['dist', 14], ['discipline', 4], ['corr', 4]] },
      { label: 'Find the wreckers', fx: [['grievance', 10], ['discipline', 8], ['sup', 'intelligentsia', -10], ['sup', 'bureaucracy', -6], ['mod', 'sci', -0.1, 18, 'Engineers on trial']] },
    ] });
  ev({ id: 'debt_crisis', sys: 1, sfx: 'alarm', title: 'The debt cannot be serviced', text: 'The last loan was raised to pay the interest on the one before. No bank at home or abroad will take more {A} paper.',
    opts: [
      { label: 'Default', fx: [['fn', (G, n) => { n.debt = 0; n.flags.debtCrisis = 0; }], ['conf', -30], ['sup', 'capital', -18], ['mod', 'rev', -0.12, 36, 'Default'], ['opAll', -6]] },
      { label: 'Austerity', fx: [['debtPct', -0.3], ['sup', 'workers', -14], ['sup', 'peasants', -6], ['mod', 'ls', -6, 24, 'Austerity'], ['sup', 'capital', 6], ['fn', (G, n) => { n.flags.debtCrisis = 0; n.budget.welfare *= 0.6; }]] },
      { label: 'Print the money', fx: [['debtPct', -0.5], ['inflation', 32], ['sup', 'capital', -8], ['fn', (G, n) => { n.flags.debtCrisis = 0; }]] },
    ] });
  ev({ id: 'great_slump', sys: 1, sfx: 'alarm', title: 'The Great Slump', text: 'The exchanges have closed twice this week. Order books are empty, the banks are calling in everything, and the queues outside the labour offices go round the block.',
    opts: [
      { label: 'Orthodoxy: balance the budget', fx: [['conf', 8], ['sup', 'workers', -10], ['sup', 'capital', 6], ['fn', (G, n) => { n.depression += 6; }]] },
      { label: 'Public works', tip: 'Shortens the slump by ten months.', fx: [['gold', -150], ['sup', 'workers', 8], ['sup', 'capital', -4], ['fn', (G, n) => { n.depression = Math.max(4, n.depression - 10); }]] },
      { label: 'Tariffs and someone to blame', fx: [['opAll', -5], ['sup', 'workers', 2], ['fn', (G, n) => { n.depression = Math.max(4, n.depression - 4); if (I(n).laws.trade.indexOf('protect') >= 0) n.laws.trade = 'protect'; for (const d of ['natpop', 'corporatist']) if (n.drift[d] != null) n.drift[d] = Math.min(100, n.drift[d] + 12); }]] },
    ] });

  const PROP = { trade: ['A trade treaty is offered', 'proposes a trade treaty. Both treasuries would gain.'], nap: ['A non-aggression pact is offered', 'proposes a pact of non-aggression. Breaking one later is remembered by everybody.'], ally: ['An alliance is offered', 'invites you into a common bloc. Its wars would become yours.'], peace: ['Peace is offered', 'offers peace on the present lines. Each side keeps what it holds, with a five-year truce.'] };
  ev({ id: 'proposal', sys: 1, title: (n, G, c) => PROP[c.kind][0], text: (n, G, c) => G.nations[c.from].name + ' ' + PROP[c.kind][1] + ' (Their opinion of you: ' + Math.round(ID.op(G, c.from, n.id)) + '.)',
    opts: [
      { label: 'Accept', fx: [['fn', (G, n, c) => { const f = G.nations[c.from]; if (!f.alive) return; if (c.kind === 'peace' ? ID.atWar(G, n.id, f.id) : !ID.atWar(G, n.id, f.id)) ID.Diplomacy.enact(G, f, n, c.kind); }]] },
      { label: 'Decline', fx: [['fn', (G, n, c) => ID.addOp(G, c.from, n.id, c.kind === 'ally' ? -8 : -4)]] },
    ] });

  /* ================================================================ FACTION TENSIONS */
  ev({ id: 'bread_riots', title: 'Bread riots', text: 'Women queuing since four in the morning have stormed the bakeries. By noon the crowd is in front of the prefecture.', cd: 48,
    w: (n) => (n.ls < 38 ? 6 : 0) + (n.foodBal < 1 ? 5 : 0),
    opts: [
      { label: 'Open the state granaries', fx: [['gold', -60], ['sup', 'workers', 8], ['sup', 'peasants', 3]] },
      { label: 'Clear the streets', fx: [['stab', 2], ['sup', 'workers', -10], ['grievance', 8], ['later', 8, 'riot_memory']] },
      { label: 'Blame the speculators', fx: [['sup', 'capital', -8], ['sup', 'workers', 4], ['conf', -8]] },
    ] });
  ev({ id: 'riot_memory', sys: 1, always: 1, title: 'Anniversary of the shootings', text: 'It is eight months since the bread riots were put down. Flowers appear every night at the spot, and every morning the police remove them.',
    opts: [{ label: 'Let them mourn', fx: [['opp', 4], ['grievance', -4]] }, { label: 'Ban the gatherings', fx: [['opp', 8, 0.2], ['grievance', 6]] }] });
  ev({ id: 'officers_petition', title: 'The officers’ petition', text: 'Forty colonels have signed a memorandum on the state of the army: obsolete rifles, unpaid allowances, politicians who have never heard a shot.', cd: 60,
    w: (n) => (!I(n).flags.noCoup && S(n, 'military') < 46 && n.budget.arms < 0.15 ? 5 : 0),
    opts: [
      { label: 'Find the money', fx: [['gold', -80], ['sup', 'military', 10], ['equip', 0.05]] },
      { label: 'Remind them who governs', fx: [['sup', 'military', -8], ['auth', 4]] },
      { label: 'Promote the ringleader', tip: 'He will be grateful, and visible.', fx: [['sup', 'military', 6], ['prestige', 12], ['later', 16, 'ambitious_general']] },
    ] });
  ev({ id: 'ambitious_general', title: 'The hero of the hour', text: 'A general’s portrait is selling better than yours. He gives interviews. He is asked what he thinks of the government and pauses before answering.', cd: 72,
    w: (n) => (!I(n).flags.noCoup && n.prestige > 45 && n.ideo !== 'junta' ? 6 : 0),
    opts: [
      { label: 'Share the balcony with him', fx: [['prestige', 12], ['glory', 5], ['legitmod', 3, 12, 'Popular general']] },
      { label: 'A distant command', fx: [['prestige', -20], ['sup', 'military', -8]] },
      { label: 'Arrest him', can: (n) => hardSec(n), fx: [['prestige', -40], ['sup', 'military', -16], ['grievance', 6], ['mod', 'atk', -0.05, 12, 'Arrested commander']] },
    ] });
  ev({ id: 'bishops_letter', title: 'A pastoral letter', text: 'Read from every pulpit on Sunday: the bishops warn the faithful against "those who would build the city without God".', cd: 72,
    w: (n) => (S(n, 'clergy') < 40 && Pw(n, 'clergy') > 7 && !law(n, 'religion', 'statechurch') ? 5 : 0),
    opts: [
      { label: 'Negotiate a concordat', fx: [['sup', 'clergy', 14], ['sup', 'intelligentsia', -6], ['tradition', 4]] },
      { label: 'Ignore it', fx: [['legitmod', -4, 12, 'Denounced from the pulpit'], ['sup', 'peasants', -4]] },
      { label: 'Arrest the bishops', can: (n) => !law(n, 'security', 'liberties'), fx: [['sup', 'clergy', -18], ['sup', 'peasants', -8], ['grievance', 6], ['fervor', 4]] },
    ] });
  ev({ id: 'student_protests', title: 'The universities are out', text: 'Lecture halls are occupied and the students have a list of demands that begins with the rector and ends with the government.', cd: 60,
    w: (n) => (S(n, 'intelligentsia') < 42 && n.nb[1] >= 2 ? 5 : 0),
    opts: [
      { label: 'Meet their delegates', fx: [['sup', 'intelligentsia', 10], ['auth', -10]] },
      { label: 'Close the universities', fx: [['sup', 'intelligentsia', -12], ['mod', 'sci', -0.2, 12, 'Universities closed'], ['unrest', -2]] },
      { label: 'Conscript the ringleaders', can: (n) => !law(n, 'security', 'liberties'), fx: [['sup', 'intelligentsia', -15], ['troops', 0.01], ['later', 10, 'brain_drain']] },
    ] });
  ev({ id: 'brain_drain', title: 'The laboratories are emptying', text: 'Three professors did not return from a congress abroad. Their assistants are applying for passports.', cd: 96,
    w: (n) => (S(n, 'intelligentsia') < 30 ? 4 : 0),
    opts: [
      { label: 'Let them go', fx: [['mod', 'sci', -0.25, 24, 'Brain drain']] },
      { label: 'Close the borders to them', can: (n) => !law(n, 'security', 'liberties'), fx: [['grievance', 5], ['opAll', -4], ['mod', 'sci', -0.1, 24, 'Captive science']] },
      { label: 'Double their salaries', fx: [['gold', -70], ['sup', 'intelligentsia', 6]] },
    ] });
  ev({ id: 'capital_flight', title: 'Capital flight', text: 'Gold is leaving by every train. The central bank’s reserves have fallen by a fifth in a month.', cd: 60,
    w: (n) => (priv(n) && S(n, 'capital') < 35 && Pw(n, 'capital') > 8 ? 6 : 0),
    opts: [
      { label: 'Exchange controls', fx: [['conf', -10], ['sup', 'capital', -8]] },
      { label: 'Cut taxes to reassure them', fx: [['sup', 'capital', 8], ['fn', (G, n) => { n.tax = Math.max(I(n).econ.taxMin || 5, n.tax - 6); }], ['note', 'Tax rate −6 points']] },
      { label: 'Let it go', fx: [['goldPct', -0.2], ['conf', -12]] },
    ] });
  ev({ id: 'peasant_petition', title: 'The peasants’ petition', text: 'Delegations from two hundred villages have walked to the capital. They want the land they work.', cd: 60,
    w: (n) => (S(n, 'peasants') < 42 && law(n, 'land', 'landlord', 'collective') ? 5 : 0),
    opts: [
      { label: 'Promise reform', tip: 'They will remember the promise.', fx: [['sup', 'peasants', 8], ['later', 14, 'broken_promise']] },
      { label: 'Send them home', fx: [['sup', 'peasants', -8], ['unrest', 5]] },
      { label: 'A land commission', fx: [['gold', -50], ['sup', 'peasants', 5], ['sup', 'capital', -5]] },
    ] });
  ev({ id: 'broken_promise', sys: 1, title: 'A promise unkept', text: 'A year ago you promised the villages land. The estates and the collectives are exactly where they were.',
    w: (n) => (law(n, 'land', 'landlord', 'collective') ? 1 : 0),
    opts: [{ label: 'They will have to wait', fx: [['sup', 'peasants', -14], ['opp', 6]] }, { label: 'Buy time with remissions', fx: [['gold', -70], ['sup', 'peasants', -4]] }] });
  ev({ id: 'corruption_scandal', title: 'Scandal', text: (n) => (closed(n) ? 'A file reaches your desk: a minister has been selling import licences. Nobody outside this room knows.' : 'The morning papers print the ledgers: a minister has been selling import licences for years.'), cd: 48,
    w: (n) => (n.corr > 35 ? 5 : n.corr > 22 ? 2 : 0),
    opts: [
      { label: 'Prosecute', fx: [['corr', -12], ['sup', 'bureaucracy', -10], ['legitmod', 3, 12, 'Clean hands']] },
      { label: 'Bury it', can: (n) => closed(n), fx: [['corr', 4], ['grievance', 5]] },
      { label: 'Ride it out', can: (n) => !closed(n), fx: [['legitmod', -6, 12, 'Scandal'], ['mandate', -8]] },
      { label: 'Sacrifice the minister', fx: [['corr', -4], ['auth', -8]] },
    ] });
  ev({ id: 'bureaucrats_fiefs', title: 'The apparatus runs itself', text: 'Directives are acknowledged, filed and not carried out. Each department has become a small country with its own foreign policy.', cd: 72,
    w: (n) => (n.bureau > 55 ? 6 : 0),
    opts: [
      { label: 'Rotate the cadres', fx: [['bureau', -12], ['sup', 'bureaucracy', -10], ['discipline', -5]] },
      { label: 'Leave well alone', fx: [['corr', 6], ['dist', 5]] },
      { label: 'Unleash criticism from below', can: (n) => !!I(n).legit.fervor, fx: [['bureau', -22], ['stab', -8], ['unrest', 8], ['fervor', 8], ['sup', 'bureaucracy', -16]] },
    ] });
  ev({ id: 'union_congress', title: 'The unions want a seat', text: 'The trade union congress has voted, overwhelmingly, to demand a voice in how firms are run.', cd: 72,
    w: (n) => (law(n, 'labor', 'free') && Pw(n, 'workers') > 22 && priv(n) ? 4 : 0),
    opts: [
      { label: 'Grant co-determination', fx: [['sup', 'workers', 10], ['sup', 'capital', -10], ['mod', 'prod', -0.03, 24, 'Co-determination']] },
      { label: 'Refuse', fx: [['sup', 'workers', -8]] },
      { label: 'Split them with favours', fx: [['gold', -60], ['sup', 'workers', -3], ['corr', 3]] },
    ] });
  ev({ id: 'veterans_march', title: 'The veterans march', text: 'Men who came home from the front to nothing are camped in front of parliament in their old uniforms.', cd: 72,
    w: (n) => (n.we > 30 && !n.nwars ? 6 : 0),
    opts: [
      { label: 'Pay the pensions', fx: [['gold', -90], ['sup', 'military', 8], ['sup', 'workers', 4]] },
      { label: 'Speeches and medals', fx: [['sup', 'military', -8], ['opp', 4]] },
      { label: 'Enrol them as a national guard', can: (n) => I(n).axes.auth > 0.3, fx: [['sup', 'military', 4], ['grievance', 3], ['driftAll', 4], ['mod', 'unrest', -5, 18, 'National guard']] },
    ] });
  ev({ id: 'organs_overreach', title: 'Files on everyone', text: 'The political police have opened dossiers on members of the leadership. The head of the service mentions this to you, almost in passing.', cd: 96,
    w: (n) => (hardSec(n) && n.bureau > 40 ? 5 : 0),
    opts: [
      { label: 'Purge the organs', fx: [['auth', -20], ['bureau', -10], ['sup', 'bureaucracy', -8]] },
      { label: 'Use the files', fx: [['grievance', 8], ['discipline', 8], ['fn', (G, n) => { if (n.drift.personalist != null) n.drift.personalist = Math.min(100, n.drift.personalist + 14); }]] },
      { label: 'Say nothing', fx: [['later', 9, 'organs_plot']] },
    ] });
  ev({ id: 'organs_plot', sys: 1, always: 1, title: 'The service moves', text: 'The head of the political police has concluded that the state would be safer in his hands.',
    opts: [{ label: 'So it comes to this', fx: [['fn', (G, n) => ID.Politics.coup(G, n, 0)]] }] });
  ev({ id: 'assassination', title: 'Shots at the motorcade', text: 'Two bullets through the windscreen. {L} is unhurt; the chauffeur is dead; the gunman belonged to no organisation anyone has heard of.', cd: 120,
    w: (n) => (n.grievance > 45 || (n.a.opp || 0) > 40 ? 3 : 0),
    opts: [
      { label: 'A wave of arrests', can: (n) => !law(n, 'security', 'liberties'), fx: [['grievance', 8], ['opp', -6], ['sup', 'intelligentsia', -6]] },
      { label: 'Speak of forgiveness', fx: [['grievance', -8], ['charisma', 6], ['mandate', 5], ['stab', -2]] },
      { label: 'Say nothing, double the guard', fx: [['gold', -30]] },
    ] });
  ev({ id: 'dissident_novel', title: 'The manuscript', text: 'A novel refused by the censor is circulating in typescript. Everyone has read it. It is, unfortunately, very good.', cd: 96,
    w: (n) => (closed(n) && S(n, 'intelligentsia') < 46 ? 4 : 0),
    opts: [
      { label: 'Publish it', fx: [['sup', 'intelligentsia', 10], ['grievance', -10], ['legitmod', -4, 12, 'The novel']] },
      { label: 'Jail the author', fx: [['sup', 'intelligentsia', -8], ['opAll', -4], ['grievance', 4]] },
      { label: 'Exile him', fx: [['opAll', -2], ['later', 12, 'exile_broadcasts']] },
    ] });
  ev({ id: 'exile_broadcasts', sys: 1, always: 1, title: 'A voice from abroad', text: 'The exiled novelist now reads a chapter every Friday night on a foreign transmitter. In the cities, the streets are empty on Friday nights.',
    opts: [{ label: 'Jam the frequency', fx: [['gold', -40], ['opp', 3, 0.2]] }, { label: 'Ignore him', fx: [['opp', 8, 0.2], ['sup', 'intelligentsia', -4]] }] });

  /* ================================================================ ECONOMY */
  ev({ id: 'bumper_harvest', title: 'A bumper harvest', text: 'Rain at the right time, sun at the right time. The barns will not hold it all.', cd: 60,
    w: (n) => (n.foodBal > 0.95 && !n.famine ? 2 : 0),
    opts: [
      { label: 'Fill the reserves', fx: [['mod', 'food', 0.1, 12, 'Grain reserve']] },
      { label: 'Export it', fx: [['gold', 80]] },
      { label: 'Cheap bread', fx: [['sup', 'workers', 6], ['sup', 'peasants', -2]] },
    ] });
  ev({ id: 'harvest_failure', title: 'The harvest fails', text: 'Drought since April. The wheat is knee-high and yellow, and the price of bread has doubled in the market towns.', cd: 72,
    w: (n) => 1.6 + b(law(n, 'land', 'collective')) * 1.2 + b(n.foodBal < 1.05) * 1.5,
    opts: [
      { label: 'Buy grain abroad', can: (n) => n.laws.trade !== 'autarky', fx: [['gold', -100], ['mod', 'food', -0.06, 10, 'Poor harvest']] },
      { label: 'Ration', fx: [['mod', 'food', -0.16, 10, 'Poor harvest'], ['sup', 'workers', -6], ['sup', 'peasants', -4]] },
      { label: 'Requisition from the villages', can: (n) => !ctl(n, 'assembly'), fx: [['mod', 'food', -0.1, 10, 'Poor harvest'], ['sup', 'peasants', -14], ['grievance', 5]] },
    ] });
  ev({ id: 'bank_run', title: 'Run on the banks', text: 'The third-largest bank shut its doors at eleven. By two there were crowds outside all the others.', cd: 72,
    w: (n) => (priv(n) && n.conf < 45 ? 5 : 0),
    opts: [
      { label: 'Bail them out', fx: [['gold', -120], ['conf', 12], ['sup', 'workers', -4]] },
      { label: 'Let them fail', fx: [['conf', -15], ['fn', (G, n) => { if (!n.depression && G.rng.chance(0.5)) { n.depression = 14; ID.news(G, 'The bank failures in ' + n.name + ' become a slump.', 'bad', n.id); } }], ['note', 'Even chance of a slump', false]] },
      { label: 'Nationalise the banks', can: (n) => fam(n, 'socialist') || is(n, 'socdem', 'corporatist', 'natpop'), fx: [['sup', 'capital', -18], ['conf', -10], ['mod', 'rev', 0.05, 36, 'State banking']] },
    ] });
  ev({ id: 'inflation_spiral', title: 'Prices out of control', text: 'Wages are paid at noon so that they can be spent before the shops re-mark their goods at two.', cd: 48,
    w: (n) => (n.inflation > 30 ? 8 : 0),
    opts: [
      { label: 'Tight money', fx: [['inflation', -20], ['mod', 'prod', -0.06, 12, 'Deflationary squeeze'], ['sup', 'workers', -6]] },
      { label: 'Price controls', fx: [['inflation', -8], ['corr', 5], ['mod', 'ls', -4, 12, 'Empty shelves']] },
      { label: 'Index wages to prices', fx: [['sup', 'workers', 6], ['inflation', 8]] },
    ] });
  ev({ id: 'ore_discovery', title: 'A strike in the hills', text: 'Surveyors report a deposit of the first rank. Three foreign consortia have already sent telegrams.', cd: 240,
    w: () => 0.7,
    opts: [
      { label: 'A state company', fx: [['mod', 'rev', 0.06, 60, 'State mines'], ['sup', 'capital', -5]] },
      { label: 'Lease it to home capital', can: (n) => priv(n) || I(n).econ.model === 'manor', fx: [['gold', 150], ['sup', 'capital', 8], ['sup', 'workers', -3]] },
      { label: 'Sell a foreign concession', fx: [['gold', 250], ['sup', 'military', -5], ['later', 30, 'concession_resentment']] },
    ] });
  ev({ id: 'concession_resentment', sys: 1, always: 1, title: 'The foreign concession', text: 'The mines you leased abroad pay their dividends abroad. Every party in the country has discovered it was always against the deal.',
    opts: [{ label: 'Honour the contract', fx: [['sup', 'workers', -8], ['legitmod', -4, 18, 'The concession']] }, { label: 'Expropriate', fx: [['mod', 'rev', 0.05, 48, 'Seized mines'], ['opAll', -10], ['glory', 5]] }] });
  ev({ id: 'planners_error', title: 'Phantom output', text: 'A ministry has reported 40,000 tractors. An inspector counted the tractors.', cd: 60,
    w: (n) => (I(n).econ.model === 'plan' && n.dist > 40 ? 6 : 0),
    opts: [
      { label: 'Investigate properly', fx: [['dist', -10], ['discipline', -6], ['sup', 'bureaucracy', -8]] },
      { label: 'Accept the figure', fx: [['dist', 6], ['corr', 3]] },
      { label: 'A show trial of wreckers', can: (n) => !law(n, 'security', 'liberties'), fx: [['dist', -4], ['grievance', 8], ['sup', 'intelligentsia', -8], ['discipline', 6]] },
    ] });
  ev({ id: 'shortages', title: 'Queues', text: 'There is steel. There are no shoes. The joke going round is that the plan has been fulfilled in every respect except the things people want.', cd: 60,
    w: (n) => ((I(n).econ.model === 'plan' || I(n).econ.model === 'cyber') && n.ls < 45 ? 6 : 0),
    opts: [
      { label: 'Shift output to consumer goods', fx: [['auth', -12], ['mod', 'ls', 6, 24, 'Consumer drive'], ['mod', 'prod', -0.04, 24, 'Consumer drive']] },
      { label: 'Blame hoarders', fx: [['sup', 'workers', -4], ['grievance', 4]] },
      { label: 'Tolerate private plots and markets', fx: [['mod', 'ls', 5, 36, 'Private plots'], ['sup', 'peasants', 6], ['fn', (G, n) => { if (n.drift.marketsoc != null) n.drift.marketsoc = Math.min(100, n.drift.marketsoc + 14); }], ['note', 'Drift toward Market Socialism +14', false]] },
    ] });
  ev({ id: 'council_deadlock', title: 'Two regions, one coalfield', text: 'The northern councils will not ship coal until the southern councils ship grain, and the southern councils say the same in reverse.', cd: 48,
    w: (n) => (I(n).econ.model === 'council' && (S(n, 'workers') < 55 || n.particip < 60) ? 6 : I(n).econ.model === 'council' ? 1.5 : 0),
    opts: [
      { label: 'Mediate in person', fx: [['auth', -12]] },
      { label: 'Let the congress settle it', fx: [['mod', 'prod', -0.08, 6, 'Council deadlock'], ['particip', 4]] },
      { label: 'Impose a settlement', fx: [['particip', -10], ['fn', (G, n) => { for (const d of ['ml', 'council', 'ansyn']) if (n.drift[d] != null) n.drift[d] = Math.min(100, n.drift[d] + 12); }], ['note', 'Drift toward centralisation +12', false]] },
    ] });
  ev({ id: 'speculation_boom', title: 'Everyone is a genius', text: 'Shop assistants are buying shares on margin. The exchange has risen for nineteen months without a pause.', cd: 96,
    w: (n) => (priv(n) && n.conf > 70 && !n.depression ? 4 : 0),
    opts: [
      { label: 'Let it run', fx: [['conf', 6], ['gold', 60], ['later', 14, 'crash']] },
      { label: 'Raise interest rates', fx: [['conf', -8], ['sup', 'capital', -5]] },
      { label: 'Tax the windfalls', fx: [['gold', 100], ['sup', 'capital', -8]] },
    ] });
  ev({ id: 'crash', sys: 1, always: 1, sfx: 'crash', title: 'The crash', text: 'It took nineteen months to go up and four days to come down.',
    opts: [{ label: 'So ends the boom', fx: [['conf', -22], ['fn', (G, n) => { if (!n.depression) n.depression = 16; }], ['log', 'A speculative boom ended in a crash.']] }] });
  ev({ id: 'railway_boom', title: 'Rails to the interior', text: 'Engineers propose a trunk line to the provinces. It would pay for itself in twenty years, or never.', once: 1,
    w: (n, G) => (ID.eraOf(G.tick) === 0 && n.gold > 120 ? 2.5 : 0),
    opts: [
      { label: 'Build it with public money', fx: [['gold', -150], ['mod', 'prod', 0.06, 72, 'Railways'], ['mod', 'unrest', -3, 72, 'Railways']] },
      { label: 'Charter a private company', can: (n) => priv(n), fx: [['conf', 6], ['mod', 'prod', 0.04, 72, 'Railways'], ['corr', 4]] },
      { label: 'Not now', fx: [] },
    ] });
  ev({ id: 'electrification', title: 'Light in every village', text: 'A national grid: dams, pylons, a bulb in every cottage. The engineers have a plan and a price.', once: 1, era: 1,
    w: (n) => (n.gold > 150 ? 2.5 : 0),
    opts: [
      { label: 'Electrify the country', fx: [['gold', -200], ['mod', 'prod', 0.08, 96, 'Electrification'], ['sup', 'workers', 4], ['fervor', 5]] },
      { label: 'The cities only', fx: [['gold', -90], ['mod', 'prod', 0.04, 96, 'Urban grid'], ['sup', 'peasants', -4]] },
      { label: 'Leave it to the market', fx: [] },
    ] });
  ev({ id: 'green_revolution', title: 'New seed', text: 'Agronomists have a wheat that yields half as much again, if it gets fertiliser and water.', once: 1, era: 2,
    w: (n) => (n.tech.agr >= 3 ? 3 : 0),
    opts: [
      { label: 'Roll it out nationally', fx: [['gold', -150], ['mod', 'food', 0.12, 96, 'New seed']] },
      { label: 'Trial stations only', fx: [['gold', -40], ['mod', 'food', 0.04, 96, 'Trial stations']] },
    ] });
  ev({ id: 'oil_shock', title: 'The price of oil', text: 'Fuel has tripled in a quarter. Lorries queue at the depots; the fishing fleet stays in harbour.', era: 3, cd: 120,
    w: (n) => (n.laws.trade !== 'autarky' ? 2 : 0),
    opts: [
      { label: 'Ration fuel', fx: [['mod', 'prod', -0.06, 18, 'Fuel rationing'], ['sup', 'workers', -4]] },
      { label: 'Subsidise it', fx: [['gold', -120], ['inflation', 6]] },
      { label: 'Pass the price on', fx: [['inflation', 15], ['mod', 'ls', -5, 18, 'Fuel prices']] },
    ] });
  ev({ id: 'tax_revolt', title: 'Tax strike', text: 'Whole districts have stopped paying. The collectors are met at the village boundary by men with sticks.', cd: 60,
    w: (n) => ((priv(n) && n.tax > 45) || (I(n).econ.model === 'manor' && n.rent > 42) ? 6 : 0),
    opts: [
      { label: 'Lower the rate', fx: [['fn', (G, n) => { if (I(n).econ.model === 'manor') n.rent = Math.max(10, n.rent - 8); else n.tax = Math.max(8, n.tax - 8); }], ['sup', 'peasants', 5], ['note', 'Rate −8 points']] },
      { label: 'Collect by force', fx: [['sup', 'peasants', -10], ['sup', 'capital', -5], ['unrest', 5]] },
      { label: 'Exempt your friends', fx: [['corr', 6], ['sup', 'capital', 5]] },
    ] });
  ev({ id: 'mine_disaster', title: 'Firedamp', text: 'An explosion in the deep seam. Two hundred and eleven men. The owners had been warned in writing.', cd: 96,
    w: (n) => (n.nb[4] >= 4 ? 2 : 0),
    opts: [
      { label: 'A safety law with teeth', fx: [['sup', 'workers', 8], ['sup', 'capital', -6], ['mod', 'prod', -0.02, 24, 'Safety inspections']] },
      { label: 'Compensation for the widows', fx: [['gold', -50], ['sup', 'workers', 3]] },
      { label: 'Blame saboteurs', fx: [['grievance', 4], ['sup', 'workers', -6]] },
    ] });
  ev({ id: 'worlds_fair', title: 'A world’s fair', text: 'The city fathers propose an international exhibition: pavilions, a tower, the whole world come to look at us.', once: 1,
    w: (n) => (n.ls > 62 && n.gold > 180 && !n.nwars ? 2 : 0),
    opts: [
      { label: 'Build the tower', fx: [['gold', -150], ['glory', 8], ['opAll', 6], ['mod', 'sci', 0.1, 24, 'Exhibition']] },
      { label: 'We have better uses for the money', fx: [] },
    ] });
  ev({ id: 'pandemic', title: 'The fever', text: 'It came in through the ports. The hospitals filled in a week; the gravediggers have asked for soldiers to help.', cd: 300,
    w: () => 0.5,
    opts: [
      { label: 'Quarantine the cities', fx: [['pop', -0.012], ['mod', 'prod', -0.1, 8, 'Quarantine']] },
      { label: 'Carry on', fx: [['pop', -0.035], ['sup', 'workers', -4]] },
      { label: 'Blame the foreigners', fx: [['pop', -0.035], ['opAll', -5], ['supAll', 2]] },
    ] });

  /* ================================================================ WAR */
  ev({ id: 'mutiny', title: 'Mutiny', text: 'Two divisions have refused to go back up the line. They will defend their trenches, they say, and nothing more.', cd: 36,
    w: (n) => (n.nwars && n.we > 55 ? 9 : 0),
    opts: [
      { label: 'Shoot the ringleaders', fx: [['troops', -0.03], ['we', -5], ['sup', 'military', -6], ['grievance', 6]] },
      { label: 'Leave and better rations', fx: [['we', -10], ['troops', -0.05], ['gold', -40]] },
      { label: 'Recognise soldiers’ committees', can: (n) => fam(n, 'socialist', 'anarchist'), fx: [['sup', 'military', -10], ['fervor', 8], ['mod', 'atk', -0.06, 12, 'Committees in the ranks'], ['particip', 5], ['we', -8]] },
    ] });
  ev({ id: 'war_profiteers', title: 'War profits', text: 'A munitions firm has declared a dividend of forty per cent. The casualty lists are printed on the facing page.', cd: 60,
    w: (n) => (n.nwars && priv(n) ? 5 : 0),
    opts: [
      { label: 'Excess profits tax', fx: [['gold', 90], ['sup', 'capital', -8], ['sup', 'workers', 5]] },
      { label: 'Look away', fx: [['sup', 'workers', -6], ['corr', 4]] },
      { label: 'Requisition the works', fx: [['mod', 'atk', 0.05, 12, 'Requisitioned works'], ['sup', 'capital', -14]] },
    ] });
  ev({ id: 'peace_movement', title: 'Stop the war', text: 'A hundred thousand marched on Sunday. Clergy, trade unionists, mothers in black. The placards say one word.', cd: 36,
    w: (n) => (n.nwars && n.we > 35 && !closed(n) ? 6 : 0),
    opts: [
      { label: 'Let them march', fx: [['we', 5], ['sup', 'intelligentsia', 4]] },
      { label: 'Ban the marches', can: (n) => !law(n, 'security', 'liberties'), fx: [['grievance', 5], ['sup', 'intelligentsia', -8], ['we', -4]] },
      { label: 'Hint at negotiations', fx: [['mandate', 4], ['sup', 'military', -5], ['we', -3]] },
    ] });
  ev({ id: 'victory_parade', title: 'Victory', text: 'The regiments are home. The city wants to see them.', cd: 60,
    w: (n) => (n.glory > 65 && !n.nwars ? 5 : 0),
    opts: [
      { label: 'A triumph', fx: [['gold', -50], ['glory', 6], ['prestige', 8], ['legitmod', 4, 12, 'Triumph']] },
      { label: 'A day of thanksgiving', fx: [['tradition', 3], ['sup', 'clergy', 4]] },
      { label: 'Demobilise at once', fx: [['sup', 'workers', 5], ['sup', 'military', -6], ['we', -8]] },
    ] });
  ev({ id: 'border_incident', title: 'Shots on the frontier', text: (n) => 'A patrol strayed, or was lured. Three dead on our side, four on theirs. ' + (n.a.rivalName || 'The neighbour') + ' demands an apology and so does our press.', cd: 36,
    w: (n, G) => { let r = null; for (const k in G.border[n.id] || {}) { const o = G.nations[+k]; if (o.alive && !ID.atWar(G, n.id, o.id) && ID.op(G, n.id, o.id) < -35) { r = o; break; } } n.a.rival = r ? r.id : 0; n.a.rivalName = r ? r.name : ''; return r ? 4 : 0; },
    opts: [
      { label: 'Demand satisfaction', fx: [['threat', 3], ['glory', 3], ['fn', (G, n) => { if (n.a.rival) ID.addOpBoth(G, n.id, n.a.rival, -15); }]] },
      { label: 'Apologise and de-escalate', fx: [['glory', -4], ['sup', 'military', -5], ['fn', (G, n) => { if (n.a.rival) ID.addOpBoth(G, n.id, n.a.rival, 14); }]] },
      { label: 'Dig in along the line', fx: [['gold', -60], ['mod', 'def', 0.06, 24, 'Frontier works']] },
    ] });
  ev({ id: 'arms_race', title: 'They are rearming', text: 'The attachés’ reports agree: new divisions, new guns, new aerodromes across the border.', cd: 60, era: 1,
    w: (n, G) => { for (const k in G.border[n.id] || {}) { const o = G.nations[+k]; if (o.alive && ID.op(G, o.id, n.id) < -20 && ID.Diplomacy.power(o) > ID.Diplomacy.power(n) * 1.3) return 4; } return 0; },
    opts: [
      { label: 'Match them', fx: [['gold', -100], ['equip', 0.1], ['sup', 'military', 5]] },
      { label: 'Fortify instead', fx: [['gold', -60], ['mod', 'def', 0.08, 36, 'Defence works']] },
      { label: 'We cannot afford a race', fx: [['sup', 'military', -5]] },
    ] });
  ev({ id: 'partisan_reprisals', title: 'Reprisals', text: 'A convoy was ambushed in the occupied provinces. The local commander asks for authority to take hostages.', cd: 48,
    w: (n) => ((n.a.noncoreShare || 0) > 0.15 && n.a.unrest > 30 ? 5 : 0),
    opts: [
      { label: 'Authorise reprisals', fx: [['mod', 'unrest', -8, 12, 'Reprisals'], ['grievance', 10], ['opAll', -6], ['later', 10, 'atrocity_exposed']] },
      { label: 'Restraint', fx: [['troops', -0.01], ['sup', 'military', -4]] },
      { label: 'Offer autonomy', fx: [['mod', 'unrest', -6, 24, 'Autonomy'], ['auth', -15], ['glory', -3]] },
    ] });
  ev({ id: 'atrocity_exposed', sys: 1, always: 1, title: 'Photographs', text: 'A foreign correspondent has got out of the occupied provinces with a roll of film.',
    opts: [{ label: 'Deny everything', fx: [['opAll', -10], ['sup', 'intelligentsia', -8]] }, { label: 'Court-martial the commander', fx: [['opAll', -3], ['sup', 'military', -8]] }] });
  ev({ id: 'refugees', title: 'Refugees at the border', text: 'Columns of civilians from the fighting next door: carts, prams, a cow. The frontier guards ask for orders.', cd: 60,
    w: (n, G) => { for (const k in G.border[n.id] || {}) { const o = G.nations[+k]; if (o.alive && o.nwars && o.we > 30) return 3; } return 0; },
    opts: [
      { label: 'Let them in', fx: [['pop', 0.015], ['sup', 'workers', -3], ['sup', 'intelligentsia', 3], ['opAll', 3]] },
      { label: 'Close the frontier', fx: [['opAll', -3], ['sup', 'clergy', -3]] },
    ] });

  /* ================================================================ IDEOLOGY-SPECIFIC */
  ev({ id: 'party_congress', title: 'The party congress', text: 'Delegates gather. Two platforms are circulating in the corridors and neither of them is yours.', cd: 60,
    w: (n) => (ctl(n, 'party') ? 4 : 0),
    opts: [
      { label: 'The line of discipline', fx: [['discipline', 10], ['particip', -5], ['fn', (G, n) => { if (n.drift.personalist != null) n.drift.personalist = Math.min(100, n.drift.personalist + 6); }]] },
      { label: 'Let the congress debate', fx: [['discipline', -6], ['particip', 8], ['bureau', -5]] },
      { label: 'Expel the opposition', fx: [['discipline', 14], ['grievance', 8], ['sup', 'intelligentsia', -6], ['bureau', 5]] },
    ] });
  ev({ id: 'comrades_abroad', title: 'A letter from comrades abroad', text: 'An underground organisation across the border asks for presses, money and rifles. They say the hour is close. They always say that.', cd: 40,
    w: (n) => (I(n).dip.export >= 0.5 && fam(n, 'socialist', 'anarchist') ? 4 : 0),
    opts: [
      { label: 'Send money and presses', fx: [['gold', -80], ['fn', (G, n) => helpAbroad(G, n, 15)], ['note', 'A movement of your kind grows in a hostile neighbour']] },
      { label: 'Send fraternal greetings', fx: [['fervor', -4]] },
      { label: 'Send volunteers', fx: [['troops', -0.02], ['fervor', 6], ['fn', (G, n) => helpAbroad(G, n, 25)], ['note', 'A movement of your kind grows strongly in a hostile neighbour']] },
    ] });
  function helpAbroad(G, n, amt) {
    const tg = []; for (const k in G.border[n.id] || {}) { const o = G.nations[+k]; if (o.alive && ID.op(G, n.id, o.id) < 10 && ID.ideo(o).family !== I(n).family) tg.push(o); }
    if (!tg.length) return; const t = G.rng.pick(tg);
    for (let p = 1; p < G.provinces.length; p++) { const Pr = G.provinces[p]; if (Pr.owner === t.id && G.rng.chance(0.5)) { if (Pr.opp !== n.ideo && Pr.oppStr < 35) { Pr.opp = n.ideo; Pr.oppStr = Math.max(8, Pr.oppStr * 0.6); } if (Pr.opp === n.ideo) { Pr.oppStr = Math.min(100, Pr.oppStr + amt); Pr.sponsor = n.id; ID.fx(G, 'subvert', Pr.center, { col: I(n).color }); } } }
  }
  ev({ id: 'royal_wedding', title: 'A royal wedding', text: 'The heir is to marry. The court wants a spectacle; the treasury wants to know who is paying.', cd: 120,
    w: (n) => (is(n, 'absmon', 'conmon') ? 2.5 : 0),
    opts: [
      { label: 'A wedding for the ages', fx: [['gold', -80], ['tradition', 6], ['sup', 'clergy', 4], ['sup', 'workers', -3]] },
      { label: 'A modest ceremony', fx: [['tradition', 2]] },
      { label: 'Marry into a foreign house', fx: [['fn', (G, n) => { let best = null; for (const o of G.nations) if (o && o.alive && o !== n && (o.ideo === 'absmon' || o.ideo === 'conmon') && (!best || ID.op(G, n.id, o.id) > ID.op(G, n.id, best.id))) best = o; if (best) { ID.addOpBoth(G, n.id, best.id, 28); ID.news(G, 'The houses of ' + n.base + ' and ' + best.base + ' are joined by marriage.', 'dip', n.id, best.id); } }], ['tradition', 3], ['note', 'Relations +28 with a fellow monarchy']] },
    ] });
  ev({ id: 'heretical_preacher', title: 'A preacher in the marketplace', text: 'He says the guardians have grown fat and that the law was meant for the poor. The crowds are getting larger.', cd: 60,
    w: (n) => (is(n, 'theocracy') ? 4 : 0),
    opts: [
      { label: 'Silence him', fx: [['grievance', 6], ['sup', 'clergy', 6], ['opp', 4]] },
      { label: 'Debate him publicly', fx: [['sup', 'intelligentsia', 5], ['sup', 'clergy', -8], ['sup', 'peasants', 4]] },
      { label: 'Give him a pulpit', fx: [['auth', -15], ['sup', 'peasants', 6], ['sup', 'clergy', -3]] },
    ] });
  ev({ id: 'miracle', title: 'A miracle is reported', text: 'A shepherd girl, a spring, a cure. Ten thousand pilgrims are on the road already.', cd: 120,
    w: (n) => (is(n, 'theocracy', 'absmon', 'agrarian') || law(n, 'religion', 'statechurch') ? 1.5 : 0),
    opts: [
      { label: 'Endorse it', fx: [['sup', 'clergy', 8], ['sup', 'peasants', 6], ['sup', 'intelligentsia', -6], ['tradition', 3]] },
      { label: 'Investigate quietly', fx: [['sup', 'clergy', -2]] },
      { label: 'Suppress the cult', fx: [['sup', 'peasants', -6], ['sup', 'clergy', -6], ['sup', 'intelligentsia', 4]] },
    ] });
  ev({ id: 'houses_dividend', title: 'The Houses want their dividend', text: 'The council reminds you, with great courtesy, that the republic is a going concern and that its partners expect a return.', cd: 48,
    w: (n) => (is(n, 'merchant') && n.gold > 150 ? 4 : 0),
    opts: [
      { label: 'Declare a dividend', fx: [['gold', -120], ['sup', 'capital', 12]] },
      { label: 'Reinvest instead', fx: [['sup', 'capital', -10], ['fn', (G, n) => { n.privCap += 120; }], ['note', 'Private investment fund +120']] },
    ] });
  ev({ id: 'expert_report', title: 'The commission reports', text: 'Three hundred pages, forty tables, one conclusion: a third of the country’s farms and half its workshops are too small to be efficient.', cd: 72,
    w: (n) => (is(n, 'technocracy', 'cybernetic') ? 4 : 0),
    opts: [
      { label: 'Implement it', fx: [['mod', 'eff', 0.05, 36, 'Rationalisation'], ['sup', 'workers', -8], ['sup', 'peasants', -6]] },
      { label: 'Shelve it', fx: [['legitmod', -3, 12, 'Report shelved'], ['sup', 'intelligentsia', -4]] },
      { label: 'A pilot programme', fx: [['gold', -60], ['mod', 'eff', 0.02, 36, 'Pilot programme']] },
    ] });
  ev({ id: 'leader_illness', title: 'Rumours about the Leader’s health', text: '{L} has not been seen for three weeks. The official explanation has changed twice.', cd: 60,
    w: (n) => (I(n).flags.succession && n.leader.age > 60 ? 4 : 0),
    opts: [
      { label: 'Show him to the people', tip: 'If he looks well, the rumours die. If he does not…', fx: [['fn', (G, n) => { if (G.rng.chance(0.65)) { n.charisma = Math.min(100, n.charisma + 6); n.tradition = Math.min(100, n.tradition + 2); } else { n.charisma = Math.max(0, n.charisma - 10); n.stab -= 4; ID.news(G, 'The ruler of ' + n.name + ' appears in public, visibly ill.', 'bad', n.id); } }], ['note', 'A gamble on how he looks', null]] },
      { label: 'Name an heir', fx: [['flag', 'heir'], ['sup', 'military', -5], ['auth', -10]] },
      { label: 'Arrest the rumour-mongers', fx: [['grievance', 6], ['discipline', 5]] },
    ] });
  ev({ id: 'mass_rally', title: 'The great rally', text: 'A quarter of a million in the square, torches, loudspeakers. They are waiting to be promised something.', cd: 36,
    w: (n) => (is(n, 'natpop', 'corporatist', 'personalist') ? 4 : 0),
    opts: [
      { label: 'Promise them territory', fx: [['glory', 4], ['charisma', 4], ['threat', 5], ['later', 20, 'promise_due']] },
      { label: 'Promise them bread', fx: [['sup', 'workers', 6], ['sup', 'peasants', 4], ['gold', -50]] },
      { label: 'Name the enemy within', fx: [['supAll', 3], ['grievance', 6], ['sup', 'intelligentsia', -10], ['opAll', -4]] },
    ] });
  ev({ id: 'promise_due', sys: 1, title: 'Where is the territory?', text: 'You promised the square new provinces. The map has not changed.',
    w: (n) => (n.tiles <= n.startTiles * 1.05 ? 1 : 0),
    opts: [{ label: 'Soon. Soon.', fx: [['charisma', -10], ['glory', -6], ['sup', 'military', -5]] }] });
  ev({ id: 'commune_dispute', title: 'Two communes and a river', text: 'The upstream commune has built a mill. The downstream commune’s fields are dry. Both have sent delegates and both have sent militia.', cd: 48,
    w: (n) => (is(n, 'ancom', 'ansyn', 'agrarian') ? 4 : 0),
    opts: [
      { label: 'Federation arbitration', fx: [['auth', -8], ['particip', 3]] },
      { label: 'Let them settle it', fx: [['unrest', 3], ['particip', 2]] },
      { label: 'Send the federal militia', fx: [['particip', -8], ['driftAll', 6]] },
    ] });
  ev({ id: 'foreign_delegates', title: 'Delegates from abroad', text: 'Workers from six countries have come, some on foot, to see how a society without masters actually functions.', cd: 60,
    w: (n) => (fam(n, 'anarchist') || is(n, 'council') ? 3 : 0),
    opts: [
      { label: 'Host an international congress', fx: [['gold', -40], ['fervor', 8], ['fn', (G, n) => helpAbroad(G, n, 10)], ['note', 'Your example spreads in a neighbour']] },
      { label: 'Welcome them and send them home', fx: [['fervor', 2]] },
    ] });
  ev({ id: 'no_confidence', title: 'A motion of no confidence', text: 'The opposition has tabled it for Thursday. The whips cannot promise the numbers.', cd: 36,
    w: (n) => (ctl(n, 'parliament') && I(n).elections && n.mandate < 45 ? 6 : 0),
    opts: [
      { label: 'Face the vote', fx: [['fn', (G, n) => { const g = ID.Politics.electionForecast(G, n); if (g > 0.5) { n.mandate = Math.min(100, n.mandate + 8); ID.news(G, 'The government of ' + n.name + ' survives a confidence vote.', 'good', n.id); } else { n.mandate = Math.max(0, n.mandate - 12); n.stab -= 4; n.electionAt = Math.min(n.electionAt, G.tick + 90); ID.news(G, 'The government of ' + n.name + ' loses a confidence vote. Elections follow.', 'bad', n.id); } }], ['note', 'Win: mandate +8. Lose: mandate −12 and early elections', null]] },
      { label: 'Dissolve and go to the country', fx: [['fn', (G, n) => { n.electionAt = G.tick + 60; }], ['note', 'Election in two months', null]] },
      { label: 'Buy the votes you need', fx: [['gold', -80], ['corr', 5], ['mandate', 2]] },
    ] });
  ev({ id: 'emergency_offer', title: 'The case for emergency powers', text: 'Your ministers put it delicately: the constitution was written for calmer times. The {BODY} could be asked to stand aside — temporarily.', cd: 60,
    w: (n) => (ctl(n, 'parliament', 'assembly') && !n.emergency && (n.stab < 32 || (n.nwars && n.we > 50)) ? 7 : 0),
    opts: [
      { label: 'Declare a state of emergency', tip: 'No more votes: you rule by decree. Participation and mandate bleed every month, and authoritarian drift accelerates.', fx: [['emergency', 1], ['particip', -15], ['mandate', -10], ['auth', 30], ['sup', 'intelligentsia', -8]] },
      { label: 'We govern within the constitution', fx: [['legitmod', 4, 12, 'Constitutional restraint'], ['sup', 'intelligentsia', 4]] },
    ] });
  ev({ id: 'nationalisation_backlash', sys: 1, always: 1, title: 'The owners answer', text: 'Since the nationalisation decree, order books have been cancelled, plant has been run down, and deposits have moved abroad. Nobody has broken a law.',
    opts: [
      { label: 'Generous compensation', fx: [['gold', -150], ['sup', 'capital', 10], ['sup', 'workers', -4]] },
      { label: 'Hold firm', fx: [['conf', -15], ['mod', 'prod', -0.08, 12, 'Investment strike']] },
      { label: 'Workers’ guards on the factories', fx: [['sup', 'workers', 8], ['sup', 'military', -12], ['sup', 'capital', -8]] },
    ] });
  ev({ id: 'scapegoat_fades', sys: 1, always: 1, title: 'The campaign runs out of enemies', text: 'The posters are peeling. The shops are no fuller. People are beginning to ask who is left to blame.',
    opts: [{ label: 'Find another enemy', fx: [['supAll', -2], ['grievance', 6], ['opAll', -4]] }, { label: 'Let it lapse', fx: [['supAll', -4], ['charisma', -4]] }] });
  ev({ id: 'election_promises', title: 'The campaign begins', text: 'Twelve months to polling day. The party managers have a list of things the country would like to hear.', cd: 40,
    w: (n, G) => (I(n).elections && n.electionAt && n.electionAt - G.tick < 400 && n.electionAt - G.tick > 200 && !n.emergency ? 8 : 0),
    opts: [
      { label: 'Spend to win', fx: [['gold', -100], ['mod', 'vote', 0.05, 14, 'Election spending'], ['inflation', 3]] },
      { label: 'Run on the record', fx: [['legitmod', 2, 12, 'Honest campaign']] },
      { label: 'Go after the opposition', fx: [['mod', 'vote', 0.03, 14, 'Smear campaign'], ['corr', 3], ['sup', 'intelligentsia', -5]] },
    ] });
  ev({ id: 'network_fault', title: 'The network stutters', text: 'For six hours on Tuesday the planning centre received no data from the northern grid. The model ran on yesterday’s numbers and nobody noticed until the freight did not arrive.', cd: 48,
    w: (n) => (is(n, 'cybernetic') && n.load > 0.85 ? 6 : 0),
    opts: [
      { label: 'Emergency investment in capacity', fx: [['gold', -120], ['fn', (G, n) => { n.sciTotal += 120; }], ['note', 'Computing capacity up']] },
      { label: 'Fall back on manual planning for a season', fx: [['mod', 'eff', -0.08, 6, 'Manual planning']] },
    ] });
  ev({ id: 'village_vs_factory', title: 'The factory on the hill', text: 'Its chimney can be seen from eleven villages, and in all eleven the elders say the same thing: the young are leaving for wages.', cd: 60,
    w: (n) => (I(n).flags.antiIndustry && n.nb[4] >= 2 ? 5 : I(n).flags.modernDilemma && n.nb[4] >= 4 ? 3 : 0),
    opts: [
      { label: 'Tax the works for the villages', fx: [['sup', 'peasants', 6], ['mod', 'prod', -0.05, 24, 'Village levy']] },
      { label: 'Progress has a price', fx: [['sup', 'peasants', -6], ['tradition', -4], ['sup', 'workers', 3]] },
      { label: 'Close it', fx: [['sup', 'peasants', 8], ['tradition', 4], ['fn', (G, n) => { for (const i of G.blist) if (G.bld[i] === 4 && G.owner[i] === n.id) { ID.removeBuilding(G, i); break; } }], ['note', 'One factory is dismantled', false]] },
    ] });

  /* ================================================================ DECISIONS */
  const Dn = (ID.DECISIONS = []);
  const dec = (o) => Dn.push(o);
  const DEBT = ['market', 'mixed', 'pact', 'trade', 'manor'];
  const notAssembly = (n) => (ctl(n, 'assembly') && !n.emergency ? 'The ' + I(n).control.body + ' has no power to order this.' : '');

  /* ---- faction concessions (shown beside each faction) */
  const conc = (f, name, desc, cost, fx) => dec({ id: 'conc_' + f, concession: f, name, desc, cost, cd: 18, fx, hidden: 1 });
  conc('workers', 'Wage decree', 'Raise wages across industry.', { gold: 70, auth: 6 }, [['sup', 'workers', 12], ['sup', 'capital', -6], ['inflation', 3]]);
  conc('peasants', 'Cancel rural debts', 'Wipe out what the villages owe.', { gold: 50, auth: 6 }, [['sup', 'peasants', 12], ['sup', 'capital', -6]]);
  conc('capital', 'Tax holiday', 'A year of relief for business.', { auth: 8 }, [['sup', 'capital', 14], ['sup', 'workers', -5], ['mod', 'rev', -0.08, 12, 'Tax holiday']]);
  conc('military', 'New colours, new pay', 'Raise pay and honour the regiments.', { gold: 80, auth: 6 }, [['sup', 'military', 12], ['prestige', 4]]);
  conc('clergy', 'Endow the church', 'Lands and stipends for the clergy.', { gold: 50, auth: 6 }, [['sup', 'clergy', 12], ['sup', 'intelligentsia', -5], ['tradition', 2]]);
  conc('intelligentsia', 'Academy charter', 'Autonomy and funds for the academies.', { gold: 50, auth: 6 }, [['sup', 'intelligentsia', 12], ['grievance', -3], ['sup', 'bureaucracy', -3]]);
  conc('bureaucracy', 'Promotions and privileges', 'Ranks, flats and special shops.', { gold: 50, auth: 6 }, [['sup', 'bureaucracy', 12], ['corr', 5], ['bureau', 4]]);

  /* ---- general */
  dec({ id: 'print_money', name: 'Print money', desc: 'The central bank lends the treasury what it needs.', cost: {}, cd: 6, decree: false,
    show: (n) => DEBT.indexOf(I(n).econ.model) >= 0, fx: [['gold', 200], ['inflation', 16], ['sup', 'capital', -4]] });
  dec({ id: 'war_loan', name: 'Patriotic war loan', desc: 'Sell bonds on the strength of the flag.', cost: { auth: 5 }, cd: 12, decree: false,
    show: (n) => n.nwars > 0 && DEBT.indexOf(I(n).econ.model) >= 0, fx: [['gold', 160], ['debt', 175], ['sup', 'capital', -3]] });
  dec({ id: 'propaganda_drive', name: 'Propaganda drive', desc: 'Posters, films, speakers in every town.', cost: { gold: 60, auth: 8 }, cd: 14,
    show: (n) => !law(n, 'press', 'free'), fx: [['legitmod', 5, 12, 'Propaganda drive'], ['sup', 'intelligentsia', -3]] });
  dec({ id: 'amnesty', name: 'General amnesty', desc: 'Open the prisons to political offenders.', cost: { auth: 15 }, cd: 40,
    fx: [['grievance', -20], ['unrest', -6], ['sup', 'intelligentsia', 6], ['stab', -2], ['opp', 3]] });
  dec({ id: 'purge_officers', name: 'Purge the officer corps', desc: 'Remove unreliable commanders before they remove you. The army will fight worse for it.', cost: { auth: 25 }, cd: 48,
    show: (n) => !I(n).flags.noCoup, can: notAssembly,
    fx: [['sup', 'military', 12], ['prestige', -30], ['mod', 'atk', -0.12, 24, 'Officer purge'], ['grievance', 4], ['fn', (G, n) => { n.a.coupAt = G.tick; }], ['note', 'Coup risk sharply reduced for two years']] });
  dec({ id: 'declare_emergency', name: 'Declare a state of emergency', desc: 'Suspend votes and rule by decree. Participation and mandate drain away while it lasts.', cost: { auth: 10 }, cd: 24,
    show: (n) => ctl(n, 'parliament', 'assembly') && !n.emergency, fx: [['emergency', 1], ['particip', -12], ['mandate', -10], ['sup', 'intelligentsia', -8]] });
  dec({ id: 'end_emergency', name: 'End the state of emergency', desc: 'Restore the constitution.', cost: {}, cd: 6, decree: false,
    show: (n) => !!n.emergency, fx: [['emergency', 0], ['sup', 'intelligentsia', 6], ['particip', 8], ['legitmod', 3, 12, 'Constitution restored']] });
  dec({ id: 'call_election', name: 'Call an early election', desc: 'Go to the country now, while the numbers hold.', cost: { auth: 10 }, cd: 30, decree: false,
    show: (n) => !!I(n).elections && !n.emergency, fx: [['fn', (G, n) => { n.electionAt = G.tick + 60; }], ['note', 'Polling day in two months', null]] });
  dec({ id: 'name_heir', name: 'Name an heir', desc: 'Settle the succession while you still can. Rivals will not thank you.', cost: { auth: 20 }, cd: 60,
    show: (n) => !!I(n).flags.succession && !n.flags.heir, fx: [['flag', 'heir'], ['sup', 'military', -5], ['sup', 'bureaucracy', -4]] });
  dec({ id: 'build_missile', name: 'Build a missile', desc: 'A conventional missile for your silos.', cost: { gold: 120 }, cd: 2, decree: false,
    show: (n) => n.nb[5] > 0, fx: [['fn', (G, n) => { n.missiles++; }], ['note', 'Missiles +1']] });
  dec({ id: 'build_nuke', name: 'Build an atomic warhead', desc: 'Needs military technology 6. Using it will change how the whole world sees you.', cost: { gold: 500 }, cd: 6, decree: false,
    show: (n) => n.nb[5] > 0 && n.tech.mil >= 6, fx: [['fn', (G, n) => { n.nukes++; }], ['note', 'Atomic warheads +1'], ['threat', 6]] });
  dec({ id: 'hire_mercs', name: 'Hire companies', desc: 'Buy soldiers on the open market.', cost: { gold: 100 }, cd: 1, decree: false,
    show: (n) => !!ID.RECRUIT[n.laws.recruit].hire, can: (n) => (n.troops >= n.pop * ID.maxMob(n) ? 'You are at your mobilisation ceiling.' : ''),
    fx: [['fn', (G, n) => { n.troops = Math.min(n.pop * ID.maxMob(n), n.troops + Math.max(40, n.pop * 0.008)); }], ['note', 'Troops arrive at once']] });

  /* ---- socialist */
  dec({ id: 'five_year_plan', name: 'Launch a Five-Year Plan', desc: 'Lock the current budget shares for five years and set an industrial target. Fulfilment feeds discipline and fervour; failure is a political event. Without a plan in force, efficiency is 8% lower.', cost: { auth: 15 }, cd: 6,
    ideos: ['ml', 'mao'], can: (n) => (n.plan ? 'A plan is already in force.' : ''), fx: [['fn', (G, n) => ID.Economy.startPlan(G, n)], ['note', 'Budget locked until the plan ends']] });
  dec({ id: 'party_purge', name: 'Purge the party', desc: 'Restore discipline by removing the unreliable. Effective, and habit-forming.', cost: { auth: 30 }, cd: 36,
    ideos: ['ml', 'mao', 'trot', 'personalist'], fx: [['discipline', 28], ['bureau', -8], ['sup', 'bureaucracy', -12], ['sup', 'intelligentsia', -8], ['grievance', 8], ['mod', 'sci', -0.1, 12, 'Purge'], ['fn', (G, n) => { if (n.drift.personalist != null) n.drift.personalist = Math.min(100, n.drift.personalist + 8); }]] });
  dec({ id: 'thaw', name: 'The Thaw', desc: 'Loosen censorship, release prisoners, let the economists speak.', cost: { auth: 25 }, cd: 72,
    ideos: ['ml', 'mao'], fx: [['dist', -15], ['grievance', -15], ['sup', 'intelligentsia', 12], ['discipline', -10], ['fn', (G, n) => { if (I(n).laws.press.indexOf('regulated') >= 0) n.laws.press = 'regulated'; if (n.drift.marketsoc != null) n.drift.marketsoc = Math.min(100, n.drift.marketsoc + 15); }], ['note', 'Drift toward Market Socialism +15', false]] });
  dec({ id: 'great_leap', name: 'The Great Leap', desc: 'Mobilise the whole countryside to industrialise in a single bound. It may work.', cost: { auth: 30 }, cd: 72,
    ideos: ['mao'], fx: [['fn', (G, n) => {
      if (G.rng.chance(0.5)) { for (let k = 0; k < 3; k++) { const s = ID.spotNear(G, n.capital, n.id, 14); if (s >= 0) ID.placeBuilding(G, s, 4); } n.fervor = Math.min(100, n.fervor + 12); ID.news(G, 'The Great Leap in ' + n.name + ' raises three new works in a season.', 'good', n.id); }
      else { ID.addMod(n, 'food', -0.3, 18, 'The Great Leap'); n.sm.peasants -= 16; n.dist = Math.min(100, n.dist + 12); ID.news(G, 'The Great Leap in ' + n.name + ' strips the fields of labour.', 'bad', n.id); ID.logGrief(n, G.tick, 'The Great Leap failed and food output collapsed.'); }
    }], ['note', 'Even odds: three free factories, or food −30% for 18 months', null]] });
  dec({ id: 'cultural_revolution', name: 'Bombard the headquarters', desc: 'Turn the masses loose on the party itself. Bureaucratisation is smashed. So is a great deal else.', cost: { auth: 40 }, cd: 120,
    ideos: ['mao'], fx: [['bureau', -40], ['dist', -10], ['fervor', 25], ['stab', -18], ['mod', 'sci', -0.4, 36, 'Schools closed'], ['sup', 'intelligentsia', -25], ['sup', 'bureaucracy', -20], ['unrest', 15], ['driftAll', -30]] });
  dec({ id: 'world_congress', name: 'Convene the International', desc: 'Summon every kindred party in the world and give them a line.', cost: { gold: 80, auth: 20 }, cd: 36,
    ideos: ['trot', 'ml', 'council'], fx: [['fervor', 8], ['fn', (G, n) => { const fm = I(n).family; for (let p = 1; p < G.provinces.length; p++) { const Pr = G.provinces[p]; if (Pr.owner !== n.id && Pr.opp && ID.IDEOLOGIES[Pr.opp].family === fm) Pr.oppStr = Math.min(100, Pr.oppStr + 6); } }], ['opAll', -4], ['note', 'Kindred movements everywhere +6']] });
  dec({ id: 'nationalise', name: 'Socialise a sector', desc: 'Take a commanding sector of the economy into public ownership. Four sectors in all: banking, heavy industry, transport, land.', cost: { auth: 25 }, cd: 30,
    ideos: ['demsoc'], vote: { workers: 15, capital: -40, intelligentsia: 5, military: -10 }, can: (n) => ((n.cnt.nationalized || 0) >= 4 ? 'Everything that can be socialised has been.' : ''),
    fx: [['cnt', 'nationalized', 1], ['sup', 'workers', 10], ['sup', 'capital', -16], ['conf', -12], ['mod', 'pow_capital', -0.15, 600, 'Socialised sector'], ['later', 4, 'nationalisation_backlash'], ['note', 'Revenue +4% permanently']] });
  dec({ id: 'coop_bank', name: 'Co-operative credit drive', desc: 'Direct the public banks to fund new worker-owned firms.', cost: { gold: 100 }, cd: 36,
    ideos: ['marketsoc'], fx: [['fn', (G, n) => { n.privCap += 180; }], ['sup', 'workers', 4], ['note', 'Investment fund +180']] });
  dec({ id: 'emergency_committee', name: 'Form an emergency committee', desc: 'Hand the delegates’ powers to a small executive "for the duration". Votes and offensive caps are suspended. Participation falls every month and the drift toward party rule accelerates.', cost: { auth: 10 }, cd: 24,
    ideos: ['council', 'ansyn', 'ancom', 'agrarian'], show: (n) => !n.emergency, fx: [['emergency', 1], ['particip', -12], ['sup', 'workers', -6]] });
  dec({ id: 'recall_delegates', name: 'Recall and rotate delegates', desc: 'Send every delegate back to the bench and elect new ones.', cost: { auth: 15 }, cd: 24,
    ideos: ['council', 'ansyn', 'ancom', 'cybernetic'], fx: [['bureau', -10], ['particip', 8], ['corr', -5], ['mod', 'prod', -0.04, 6, 'Rotation']] });

  /* ---- liberal */
  dec({ id: 'social_pact', name: 'Tripartite accord', desc: 'Government, unions and employers sign a national wage bargain.', cost: { auth: 20, gold: 60 }, cd: 48,
    ideos: ['socdem', 'marketsoc', 'demsoc'], can: (n) => (S(n, 'workers') < 35 || S(n, 'capital') < 30 ? 'One side will not come to the table (workers need 35, capital 30).' : ''), fx: [['sup', 'workers', 8], ['sup', 'capital', 7], ['mod', 'prod', 0.03, 24, 'Tripartite accord']] });
  dec({ id: 'antitrust', name: 'Break up the trusts', desc: 'Dissolve the largest combines.', cost: { auth: 20 }, cd: 60,
    ideos: ['liberal', 'socdem', 'conmon'], vote: { workers: 10, capital: -25, intelligentsia: 8 }, fx: [['sup', 'capital', -10], ['sup', 'workers', 6], ['conf', -5], ['mod', 'pow_capital', -0.12, 120, 'Trust-busting']] });
  dec({ id: 'charter_companies', name: 'Sell charters', desc: 'Auction monopolies and public functions to the highest bidders.', cost: { auth: 10 }, cd: 60,
    ideos: ['minarchy', 'merchant', 'liberal'], fx: [['gold', 220], ['corr', 8], ['mod', 'pow_capital', 0.2, 120, 'Chartered monopolies'], ['sup', 'workers', -6]] });

  /* ---- conservative */
  dec({ id: 'royal_progress', name: 'Royal progress', desc: 'The sovereign tours the provinces with full ceremony.', cost: { gold: 60 }, cd: 36,
    ideos: ['absmon', 'conmon'], fx: [['tradition', 5], ['sup', 'clergy', 4], ['sup', 'peasants', 4], ['mod', 'unrest', -3, 12, 'Royal progress']] });
  dec({ id: 'holy_war', name: 'Preach the holy war', desc: 'The guardians call the faithful to arms.', cost: { auth: 20 }, cd: 60,
    ideos: ['theocracy'], fx: [['mod', 'atk', 0.12, 24, 'Zeal'], ['sup', 'clergy', 6], ['opAll', -5], ['fervor', 10]] });
  dec({ id: 'missionaries', name: 'Send missionaries', desc: 'Preachers cross the borders to the pious poor.', cost: { gold: 50 }, cd: 24,
    ideos: ['theocracy'], fx: [['fn', (G, n) => { for (const k in G.border[n.id] || {}) { const o = G.nations[+k]; if (!o.alive || o.ideo === 'theocracy') continue; for (let p = 1; p < G.provinces.length; p++) { const Pr = G.provinces[p]; if (Pr.owner === o.id && Pr.urban < 0.3 && G.rng.chance(0.4)) { if (Pr.oppStr < 30) { Pr.opp = 'theocracy'; Pr.sponsor = n.id; } if (Pr.opp === 'theocracy') Pr.oppStr = Math.min(100, Pr.oppStr + 12); } } } }], ['note', 'Theocratic movements grow in rural provinces next door']] });
  dec({ id: 'harvest_festival', name: 'Great harvest festival', desc: 'Every village sends its best to the capital.', cost: { gold: 30 }, cd: 24,
    ideos: ['agrarian'], fx: [['tradition', 4], ['sup', 'peasants', 5], ['particip', 3]] });

  /* ---- authoritarian */
  dec({ id: 'martial_law', name: 'Martial law', desc: 'Soldiers on every corner for a year.', cost: { auth: 15 }, cd: 24,
    ideos: ['junta', 'personalist', 'corporatist', 'absmon'], fx: [['mod', 'unrest', -12, 12, 'Martial law'], ['grievance', 10], ['sup', 'intelligentsia', -8], ['particip', -8]] });
  dec({ id: 'chamber_arbitration', name: 'Arbitration from the chair', desc: 'Summon both corporations and dictate terms each can live with.', cost: { auth: 20 }, cd: 30,
    ideos: ['corporatist', 'junta', 'natpop', 'personalist'], fx: [['sup', 'workers', 7], ['sup', 'capital', 7], ['corr', 3]] });
  dec({ id: 'autarky_drive', name: 'Battle for self-sufficiency', desc: 'Synthetic fuel, ersatz rubber, wheat on every verge.', cost: { gold: 100 }, cd: 48,
    ideos: ['corporatist', 'natpop', 'personalist'], can: (n) => (law(n, 'trade', 'free') ? 'Not while trade is free.' : ''), fx: [['mod', 'prod', 0.06, 48, 'Self-sufficiency'], ['threat', 3], ['mod', 'ls', -3, 48, 'Ersatz']] });
  dec({ id: 'rationalisation', name: 'Rationalisation programme', desc: 'Time-and-motion men in every plant.', cost: { auth: 20 }, cd: 48,
    ideos: ['technocracy', 'cybernetic'], fx: [['mod', 'eff', 0.06, 36, 'Rationalisation'], ['sup', 'workers', -8], ['sup', 'bureaucracy', 4]] });
  dec({ id: 'orbital', name: 'The orbital programme', desc: 'Put a machine in orbit. Needs industrial technology 8 and military technology 6.', cost: { gold: 1500 }, cd: 999,
    ideos: ['technocracy', 'cybernetic'], can: (n) => (n.tech.ind < 8 || n.tech.mil < 6 ? 'Needs industrial technology 8 and military technology 6.' : n.flags.orbital ? 'Already done.' : ''), fx: [['flag', 'orbital'], ['glory', 20], ['legitmod', 10, 60, 'First in orbit'], ['opAll', 5], ['news', '{N} puts the first artificial moon in orbit.', 'good']] });
  dec({ id: 'cult_campaign', name: 'Glorify the Leader', desc: 'Statues, anthems, a new name for the capital’s main square.', cost: { gold: 80 }, cd: 24,
    ideos: ['personalist', 'natpop', 'mao'], fx: [['charisma', 10], ['corr', 3], ['sup', 'intelligentsia', -6], ['fn', (G, n) => { if (n.drift.personalist != null) n.drift.personalist = Math.min(100, n.drift.personalist + 6); }]] });

  /* ---- heterodox */
  dec({ id: 'expand_network', name: 'Expand the computing network', desc: 'New machines, new lines, new operators.', cost: { gold: 150 }, cd: 18,
    ideos: ['cybernetic'], fx: [['fn', (G, n) => { n.sciTotal += 160; }], ['note', 'Computing capacity up (load falls)']] });
  dec({ id: 'open_ledger', name: 'Open the ledgers', desc: 'Publish every enterprise’s figures to every workplace.', cost: { auth: 15 }, cd: 36,
    ideos: ['cybernetic', 'council', 'marketsoc'], fx: [['particip', 10], ['corr', -8], ['sup', 'bureaucracy', -8], ['dist', -6]] });
  dec({ id: 'plebiscite', name: 'Hold a plebiscite', desc: 'Ask the nation one question, phrased so that there is one answer. The result becomes your mandate — whatever it is.', cost: { auth: 20 }, cd: 48,
    ideos: ['natpop', 'personalist', 'corporatist'], fx: [['fn', (G, n) => {
      const yes = clamp(40 + n.charisma * 0.4 + n.glory * 0.2 - n.crises * 8 + G.rng.range(-6, 6), 20, 96);
      if (yes >= 55) { n.mandate = yes; n.cnt.plebiscites = (n.cnt.plebiscites || 0) + 1; ID.addMod(n, 'legit', 4, 24, 'Plebiscite'); ID.news(G, 'Plebiscite in ' + n.name + ': ' + Math.round(yes) + '% say yes.', 'good', n.id); }
      else { n.mandate = 20; n.charisma = Math.max(0, n.charisma - 12); n.stab -= 6; ID.news(G, 'The plebiscite in ' + n.name + ' embarrasses the regime: only ' + Math.round(yes) + '% say yes.', 'bad', n.id); ID.logGrief(n, G.tick, 'A plebiscite failed (' + Math.round(yes) + '% yes).'); }
    }], ['note', 'Result depends on the Leader’s authority, glory and current crises', null]] });
  dec({ id: 'scapegoat', name: 'Scapegoat campaign', desc: 'Give the people someone to blame. It works at once, and you will pay for it for years.', cost: { auth: 10 }, cd: 18,
    ideos: ['natpop', 'personalist', 'corporatist'], fx: [['supAll', 6], ['sup', 'intelligentsia', -14], ['grievance', 10], ['opAll', -8], ['mod', 'prod', -0.03, 24, 'Purged professions'], ['charisma', 4], ['later', 12, 'scapegoat_fades']] });
  dec({ id: 'bribe_council', name: 'Grease the wheels', desc: 'A purse in every pocket that matters.', cost: { gold: 120 }, cd: 12,
    ideos: ['merchant'], fx: [['supAll', 5], ['corr', 6]] });
})();
