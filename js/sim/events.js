/* IRON DIALECTIC — event and decision engine. Interprets the effect lists in data/events.js. No DOM. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const clamp = ID.clamp, c100 = (v) => clamp(v, 0, 100);
  const Ev = (ID.Events = {});
  let byId = null, decById = null;
  function index() {
    byId = {}; decById = {};
    for (const e of ID.EVENT_DEFS) byId[e.id] = e;
    for (const d of ID.DECISIONS) decById[d.id] = d;
  }
  Ev.def = (id) => { if (!byId) index(); return byId[id]; };
  Ev.decision = (id) => { if (!decById) index(); return decById[id]; };

  const FN = ID.FACTIONS;
  const LABEL = { stab: 'Stability', auth: 'Authority', we: 'War weariness', corr: 'Corruption', bureau: 'Bureaucratisation', fervor: 'Fervour', tradition: 'Tradition', glory: 'Glory',
    mandate: 'Mandate', particip: 'Participation', discipline: 'Party discipline', charisma: 'Leader’s authority', grievance: 'Hidden grievance', prestige: 'Generals’ prestige', dist: 'Plan distortion',
    conf: 'Business confidence', inflation: 'Inflation', threat: 'Threat', unrest: 'Unrest', opp: 'Opposition strength', equip: 'Equipment' };
  const MODL = { prod: 'industrial output', food: 'food output', atk: 'attack', def: 'defence', sci: 'research', ls: 'living standards', legit: 'legitimacy', stab: 'stability', rev: 'revenue', eff: 'efficiency',
    unrest: 'unrest', opp: 'opposition growth', trade: 'trade income', conf: 'confidence', growth: 'population growth', regen: 'recruitment', vote: 'vote share', dist: 'distortion growth', bureau: 'bureaucratisation', pow_capital: 'capital’s power' };
  const BAD_UP = { we: 1, corr: 1, bureau: 1, grievance: 1, dist: 1, inflation: 1, threat: 1, unrest: 1, opp: 1, prestige: 1 };
  const sg = (v) => (v > 0 ? '+' : '−') + Math.abs(Math.round(v * 100) / 100);
  const dur = (m) => (m >= 600 ? ' for good' : ' for ' + m + ' months');

  /* Human-readable summary of an effect list. Returns [{t, good}] */
  Ev.describe = function (fx, n) {
    const out = []; let hidden = false;
    for (const f of fx || []) {
      const k = f[0];
      if (LABEL[k]) out.push({ t: LABEL[k] + ' ' + sg(f[1]), good: BAD_UP[k] ? f[1] < 0 : f[1] > 0 });
      else if (k === 'gold') out.push({ t: 'Gold ' + sg(f[1]), good: f[1] > 0 });
      else if (k === 'goldPct') out.push({ t: 'Gold ' + sg(f[1] * 100) + '%', good: f[1] > 0 });
      else if (k === 'debt') out.push({ t: 'Debt ' + sg(f[1]), good: f[1] < 0 });
      else if (k === 'debtPct') out.push({ t: 'Debt ' + sg(f[1] * 100) + '%', good: f[1] < 0 });
      else if (k === 'sup') out.push({ t: (n ? ID.factionName(n, f[1]) : FN[f[1]].name) + ' ' + sg(f[2]), good: f[2] > 0 });
      else if (k === 'supAll') out.push({ t: 'All factions ' + sg(f[1]), good: f[1] > 0 });
      else if (k === 'pop') out.push({ t: 'Population ' + sg(f[1] * 100) + '%', good: f[1] > 0 });
      else if (k === 'troops') out.push({ t: 'Troops ' + sg(f[1] * 100) + '%', good: f[1] > 0 });
      else if (k === 'legitmod') out.push({ t: 'Legitimacy ' + sg(f[1]) + dur(f[2]), good: f[1] > 0 });
      else if (k === 'mod') { const pctv = f[1] === 'legit' || f[1] === 'stab' || f[1] === 'ls' || f[1] === 'unrest' || f[1] === 'conf' || f[1] === 'opp' ? sg(f[2]) : sg(f[2] * 100) + '%'; const badUp = f[1] === 'unrest' || f[1] === 'opp' || f[1] === 'dist' || f[1] === 'bureau' || f[1] === 'pow_capital'; out.push({ t: (MODL[f[1]] || f[1]).replace(/^./, (c) => c.toUpperCase()) + ' ' + pctv + dur(f[3]), good: badUp ? f[2] < 0 : f[2] > 0 }); }
      else if (k === 'drift') out.push({ t: 'Drift toward ' + ID.IDEOLOGIES[f[1]].name + ' ' + sg(f[2]), good: f[2] < 0 });
      else if (k === 'driftAll') out.push({ t: 'All drifts ' + sg(f[1]), good: f[1] < 0 });
      else if (k === 'strike') out.push({ t: 'Strike for ' + f[1] + ' months (industry −30%)', good: false });
      else if (k === 'opAll') out.push({ t: 'Opinion of every state ' + sg(f[1]), good: f[1] > 0 });
      else if (k === 'emergency') out.push({ t: f[1] ? 'Emergency rule begins' : 'Emergency rule ends', good: !f[1] });
      else if (k === 'tech') out.push({ t: 'Research progress ' + sg(f[1]), good: f[1] > 0 });
      else if (k === 'note') out.push({ t: f[1], good: f.length > 2 ? f[2] : true });
      else if (k === 'later') hidden = true;
      else if (ID.Focus && ID.Focus.DESC[k]) out.push(ID.Focus.DESC[k](f, n));
    }
    if (hidden) out.push({ t: 'This will have consequences later.', good: null });
    return out;
  };
  ID.factionName = (n, f) => (ID.ideo(n).fnames && ID.ideo(n).fnames[f]) || FN[f].name;

  Ev.applyFx = function (G, n, fx, ctx) {
    for (const f of fx || []) {
      const k = f[0], v = f[1];
      switch (k) {
        case 'stab': n.stab = c100(n.stab + v); break;
        case 'auth': n.auth = clamp(n.auth + v, 0, 100); break;
        case 'gold': n.gold += v; break;
        case 'goldPct': n.gold += Math.max(0, n.gold) * v; break;
        case 'debt': n.debt = Math.max(0, n.debt + v); break;
        case 'debtPct': n.debt = Math.max(0, n.debt * (1 + v)); break;
        case 'sup': n.sm[v] += f[2] * 0.6; n.fs[v] = c100(n.fs[v] + f[2] * 0.5); break;
        case 'supAll': for (const x of ID.FACTION_IDS) { n.sm[x] += v * 0.6; n.fs[x] = c100(n.fs[x] + v * 0.5); } break;
        case 'unrest': for (let p = 1; p < G.provinces.length; p++) { const Pr = G.provinces[p]; if (Pr.owner === n.id) Pr.unrest = c100(Pr.unrest + v); } break;
        case 'opp': ID.Politics.boostOpp(G, n, v, f[2] || 0); break;
        case 'we': case 'corr': case 'bureau': case 'fervor': case 'tradition': case 'glory': case 'mandate': case 'particip': case 'discipline': case 'charisma': case 'grievance': case 'dist': case 'conf': case 'inflation':
          n[k] = c100(n[k] + v); break;
        case 'prestige': n.prestige = Math.max(0, n.prestige + v); break;
        case 'threat': n.threat = Math.max(0, n.threat + v); break;
        case 'equip': n.equip = clamp(n.equip + v, 0.5, 1.4); break;
        case 'pop': n.pop *= 1 + v; break;
        case 'troops': n.troops *= 1 + v; break;
        case 'legitmod': ID.addMod(n, 'legit', v, f[2], f[3] || 'Event'); break;
        case 'mod': ID.addMod(n, v, f[2], f[3], f[4] || 'Event'); break;
        case 'flag': n.flags[v] = 1; break;
        case 'unflag': n.flags[v] = 0; break;
        case 'cnt': n.cnt[v] = (n.cnt[v] || 0) + (f[2] || 1); break;
        case 'drift': if (n.drift[v] != null) n.drift[v] = c100(n.drift[v] + f[2]); break;
        case 'driftAll': for (const d in n.drift) n.drift[d] = c100(n.drift[d] + v); break;
        case 'strike': n.strike = v < 0 ? Math.max(0, n.strike + v) : Math.max(n.strike, v); break;
        case 'opAll': for (const o of G.nations) if (o && o.alive && o !== n) ID.addOp(G, o.id, n.id, v); break;
        case 'later': (n.later = n.later || []).push({ at: G.tick + v * 30, id: f[2], ctx: f[3] || ctx || {} }); break;
        case 'emergency': n.emergency = !!v; if (v) n.flags.everEmergency = 1; break;
        case 'tech': n.sci += v; break;
        case 'news': ID.news(G, v.replace('{N}', n.name), f[2] || 'pol', n.id); break;
        case 'log': ID.logGrief(n, G.tick, v); break;
        case 'fn': v(G, n, ctx || {}); break;
        case 'note': break;
        default: if (ID.Focus && ID.Focus.FX[k]) ID.Focus.FX[k](G, n, f, ctx || {}); break;
      }
    }
  };

  /* ---------------------------------------------------------------- events */
  Ev.pending = (G, id) => G.evq.some((e) => e.id === id) || (G.tray || []).some((e) => e.id === id);
  /* Ordinary dispatches wait in a tray beside the map while the game runs; urgent ones (sys, story)
     stop the clock. G.trayEvents is set by the interface from the player's settings. */
  Ev.urgent = (def) => !!(def.sys || def.story);
  Ev.queue = function (G, n, id, ctx) {
    const def = Ev.def(id); if (!def) return;
    if (n.id === G.player && !G.autoPlayer) {
      const e = { id, n: n.id, ctx: ctx || {}, t: G.tick };
      if (G.trayEvents && !Ev.urgent(def)) { (G.tray = G.tray || []).push(e); G.uiDirty = true; } else G.evq.push(e);
      ID.sfx(G, def.sfx || 'event');
    }
    else Ev.auto(G, n, def, ctx || {});
  };
  Ev.options = function (G, n, def, ctx) {
    const src = typeof def.opts === 'function' ? def.opts(G, n, ctx) : def.opts;
    return src.filter((o) => !o.can || o.can(n, G, ctx));
  };
  Ev.txt = (v, G, n, ctx) => (typeof v === 'function' ? v(n, G, ctx) : v).replace(/\{N\}/g, n.name).replace(/\{A\}/g, n.adj).replace(/\{L\}/g, n.leader.title + ' ' + n.leader.name).replace(/\{BODY\}/g, ID.ideo(n).control.body);
  Ev.auto = function (G, n, def, ctx) {
    const opts = Ev.options(G, n, def, ctx); if (!opts.length) return;
    const h = G.historical && def.story ? opts.find((x) => x.hist) : null;
    const o = h || G.rng.weighted(opts, (x) => (typeof x.ai === 'function' ? x.ai(n, G, ctx) : x.ai != null ? x.ai : 1)) || opts[0];
    Ev.applyFx(G, n, typeof o.fx === 'function' ? o.fx(n, G, ctx) : o.fx, ctx);
  };
  /* Player picks option k of the event at the head of the queue (or of tray entry idx). */
  Ev.choose = function (G, k, idx, byMinisters) {
    const e = idx != null ? (G.tray || []).splice(idx, 1)[0] : G.evq.shift(); if (!e) return;
    const n = G.nations[e.n], def = Ev.def(e.id); if (!n || !def || !n.alive) return;
    const opts = Ev.options(G, n, def, e.ctx); if (!opts.length) return;
    let o = opts[k] || opts[0];
    if (byMinisters) { o = G.rng.weighted(opts, (x) => (typeof x.ai === 'function' ? x.ai(n, G, e.ctx) : x.ai != null ? x.ai : 1)) || opts[0]; ID.news(G, 'Left unanswered, “' + Ev.txt(def.title, G, n, e.ctx) + '” was settled by your ministers: ' + Ev.txt(o.label, G, n, e.ctx) + '.', 'pol', n.id); }
    Ev.applyFx(G, n, typeof o.fx === 'function' ? o.fx(n, G, e.ctx) : o.fx, e.ctx);
    n.hist = n.hist || []; n.hist.push({ t: G.tick, id: e.id, title: Ev.txt(def.title, G, n, e.ctx), pick: Ev.txt(o.label, G, n, e.ctx) }); if (n.hist.length > 60) n.hist.shift();
  };

  Ev.month = function (G, n) {
    // delayed consequences
    if (n.later && n.later.length) {
      for (let k = n.later.length - 1; k >= 0; k--) {
        const L = n.later[k]; if (G.tick < L.at) continue;
        n.later.splice(k, 1);
        const def = Ev.def(L.id); if (def && (!def.w || def.w(n, G, L.ctx) > 0 || def.always)) Ev.queue(G, n, L.id, L.ctx);
      }
    }
    if (n.a.evCd > 0) { n.a.evCd--; return; }
    if (!byId) index();
    const era = ID.eraOf(G.tick);
    const seen = n.a.evSeen || (n.a.evSeen = {});
    const cands = []; let tot = 0;
    for (const def of ID.EVENT_DEFS) {
      if (!def.w || def.sys) continue;
      if (def.era != null && era < def.era) continue;
      if (def.once && seen[def.id]) continue;
      if (seen[def.id] && G.tick - seen[def.id] < (def.cd || 60) * 30) continue;
      let w = 0; try { w = def.w(n, G, {}) || 0; } catch (e) { w = 0; }
      if (w > 0) { cands.push([def, w]); tot += w; }
    }
    if (!tot) return;
    const isP = n.id === G.player;
    if (!G.rng.chance(clamp(tot / (isP ? 130 : 260), 0, isP ? 0.3 : 0.15))) return;
    const pick = G.rng.weighted(cands, (c) => c[1]); if (!pick) return;
    seen[pick[0].id] = G.tick; n.a.evCd = isP ? 4 : 6;
    Ev.queue(G, n, pick[0].id, {});
  };

  /* ---------------------------------------------------------------- decisions */
  Ev.decisionsFor = function (G, n) {
    if (!decById) index();
    return ID.DECISIONS.filter((d) => !d.hidden && (!d.ideos || d.ideos.indexOf(n.ideo) >= 0) && (!d.show || d.show(n, G)));
  };
  /* '' if available, else the reason. */
  Ev.decisionBlock = function (G, n, d) {
    if ((n.cd[d.id] || 0) > G.tick) return 'Available again ' + ID.dateOf(n.cd[d.id]).short + '.';
    const c = d.cost || {};
    if (c.auth && n.auth < c.auth) return 'Needs ' + c.auth + ' authority.';
    if (c.gold && n.gold < c.gold) return 'Needs ' + c.gold + ' gold.';
    if (d.can) { const w = d.can(n, G); if (w) return w; }
    return '';
  };
  Ev.runDecision = function (G, n, id, voted) {
    const d = Ev.decision(id); if (!d) return 'Unknown decision.';
    if (!voted) {
      const why = Ev.decisionBlock(G, n, d); if (why) return why;
      const I = ID.ideo(n), ct = I.control.type;
      if (d.vote && (ct === 'parliament' || ct === 'assembly') && !n.emergency) {
        const res = ID.Politics.vote(G, n, 'decision', { aff: d.vote });
        if (!res.pass) { n.auth = Math.max(0, n.auth - Math.ceil(((d.cost && d.cost.auth) || 0) / 2)); return 'The ' + I.control.body + ' votes it down (' + Math.round(res.yes) + '% in favour).'; }
        if (ct === 'assembly') {
          if (d.cost) { n.auth -= d.cost.auth || 0; n.gold -= d.cost.gold || 0; }
          n.cd[d.id] = G.tick + (d.cd || 12) * 30;
          G.votes.push({ n: n.id, kind: 'decision', id: d.id, at: G.tick + (I.control.delay || 30) });
          if (n.id === G.player) ID.news(G, 'The ' + I.control.body + ' takes up: ' + d.name + '.', 'pol', n.id);
          return '';
        }
      }
      if (d.cost) { n.auth -= d.cost.auth || 0; n.gold -= d.cost.gold || 0; }
      n.cd[d.id] = G.tick + (d.cd || 12) * 30;
      if (I.control.griev && d.decree !== false) n.grievance = Math.min(100, n.grievance + I.control.griev * 2);
    }
    Ev.applyFx(G, n, typeof d.fx === 'function' ? d.fx(n, G) : d.fx, {});
    if (n.id === G.player) { ID.news(G, 'Decision: ' + d.name + '.', 'pol', n.id); ID.sfx(G, 'stamp'); }
    return '';
  };

  /* Deliberately embrace a drift (a reform programme). */
  Ev.embraceBlock = function (G, n, to) {
    if (n.trans > 0) return 'The regime is already in transition.';
    if ((n.drift[to] || 0) < 30) return 'The pressure for this change is still too weak (needs 30).';
    if (n.auth < 50) return 'Needs 50 authority.';
    return '';
  };
  Ev.embrace = function (G, n, to) {
    const why = Ev.embraceBlock(G, n, to); if (why) return why;
    n.auth -= 50;
    ID.Politics.changeIdeology(G, n, to, 'reform');
    return '';
  };
})();
