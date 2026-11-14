/* IRON DIALECTIC — the doctrine engine: signature gauges, unique actions, war traits and war orders,
   and leader traits. Data in data/doctrine.js. No DOM.
   State on a nation: n.sig (gauge 0–100), n.sigIdeo (the ideology it belongs to), n.sigx (doctrine
   extras, such as the absolute monarchy's court favourite), n.sigm (this month's modifiers from the
   gauge and the leader, read through ID.mod), n.a.dp (war parameters), n.a.coreLost (share of home
   land held by others). Mastery: n.flags['dcm_' + ideo] (from an ideology programme capstone). */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const clamp = ID.clamp;
  const Dc = (ID.Doctrine = {});

  /* ID.mod reads timed modifiers and the month's doctrine and leader modifiers. */
  ID.mod = function (n, k) {
    let s = 0; const m = n.mods;
    for (let i = 0; i < m.length; i++) if (m[i].k === k) s += m[i].v;
    const g = n.sigm; if (g) { const v = g[k]; if (v) s += v; }
    return s;
  };

  Dc.of = (n) => (ID.DOCTRINE && n ? ID.DOCTRINE[n.ideo] : null);
  Dc.mastered = (n) => !!(n.flags && n.flags['dcm_' + n.ideo]);
  Dc.ensure = function (G, n) {
    const D = Dc.of(n); if (!D) return null;
    if (n.sigIdeo !== n.ideo || !isFinite(n.sig)) { n.sig = D.init; n.sigIdeo = n.ideo; n.sigx = {}; n.a.sigTrend = 0; }
    if (!n.sigx) n.sigx = {};
    if (n.leader && !n.leader.traits && ID.rollTraits) n.leader.traits = ID.rollTraits(G.rng, n.ideo);
    return D;
  };

  /* Share of a state's home provinces (by tiles) that others hold. */
  function coreLost(G, n) {
    let tot = 0, lost = 0;
    for (let p = 1; p < G.provinces.length; p++) { const Pr = G.provinces[p]; if (Pr.core !== n.id) continue; const t = Pr.tiles || 1; tot += t; if (Pr.owner !== n.id) lost += t; }
    return tot ? lost / tot : 0;
  }

  Dc.month = function (G, n) {
    const D = Dc.ensure(G, n);
    n.a.coreLost = coreLost(G, n);
    const m = {};
    if (D) {
      let t = 0; try { t = D.drift(n, G) || 0; } catch (e) { t = 0; }
      if (!isFinite(t)) t = 0;
      n.a.sigPush = t;
      t = clamp(t + (50 - n.sig) * 0.035, -4, 4); // conditions push; every gauge drifts back toward the middle
      n.a.sigTrend = t;
      n.sig = clamp(n.sig + t, 0, 100);
      let fx = {}; try { fx = D.fx(n, n.sig, G) || {}; } catch (e) { fx = {}; }
      const k = Dc.mastered(n) ? 1.25 : 1;
      for (const key in fx) { const v = fx[key]; if (!v) continue; const F = Dc.FX[key], good = F ? (F[2] ? v < 0 : v > 0) : v > 0; m[key] = v * (good ? k : 1); }
    }
    for (const tr of (n.leader && n.leader.traits) || []) { const T = ID.TRAITS[tr]; if (!T) continue; for (const key in T.fx) m[key] = (m[key] || 0) + T.fx[key]; }
    n.sigm = m;
  };

  /* ---------------------------------------------------------------- actions */
  Dc.act = (id) => { for (const k in ID.DOCTRINE) for (const a of ID.DOCTRINE[k].acts) if (a.id === id) return a; return null; };
  Dc.actBlock = function (G, n, a) {
    const D = Dc.of(n); if (!D || D.acts.indexOf(a) < 0) return 'Not part of your doctrine.';
    const cd = n.cd['dc_' + a.id] || 0; if (cd > G.tick) return 'Available again ' + ID.dateOf(cd).short + '.';
    const c = a.cost || {};
    if (c.auth && n.auth < c.auth) return 'Needs ' + c.auth + ' authority.';
    if (c.gold && n.gold < c.gold) return 'Needs ' + c.gold + ' gold.';
    if (a.can) { const w = a.can(n, G); if (w) return w; }
    return '';
  };
  Dc.run = function (G, n, id) {
    const a = Dc.act(id); if (!a) return 'Unknown action.';
    Dc.ensure(G, n);
    const why = Dc.actBlock(G, n, a); if (why) return why;
    const c = a.cost || {};
    if (c.auth) n.auth -= c.auth; if (c.gold) n.gold -= c.gold;
    n.cd['dc_' + a.id] = G.tick + (a.cd || 12) * 30;
    if (a.sig) n.sig = clamp(n.sig + a.sig, 0, 100);
    if (a.set) Object.assign(n.sigx, a.set);
    ID.Events.applyFx(G, n, a.fx, {});
    if (n.id === G.player) { ID.news(G, a.name + '.', 'pol', n.id); ID.sfx(G, 'stamp'); G.uiDirty = true; }
    (n.hist = n.hist || []).push({ t: G.tick, id: a.id, title: Dc.of(n).name, pick: a.name }); if (n.hist.length > 60) n.hist.shift();
    return '';
  };
  Dc.aiMonth = function (G, n) {
    const D = Dc.of(n); if (!D) return;
    for (const a of D.acts) {
      if (!a.ai || Dc.actBlock(G, n, a)) continue;
      let want = false; try { want = a.ai(n, n.sig, G); } catch (e) { want = false; }
      if (want && G.rng.chance(0.45)) { Dc.run(G, n, a.id); return; }
    }
  };

  /* ---------------------------------------------------------------- war traits */
  const DP0 = { holdFast: 0, moraleFloor: 0, homeDef: 1, cityDef: 1, capitalDef: 1, roughLoss: 1, roughDef: 1, speed: 1, aloss: 1, blitz: 0, brittle: 0, liberate: 0, materiel: 0, precision: 0, logistics: 0, wePace: 1, equipRegen: 1, bleed: 1, martyr: 0, leaderAtk: 0, atkMul: 1 };
  Dc.DP0 = DP0;
  Dc.war = function (n) {
    const D = Dc.of(n), dp = Object.assign({}, DP0, D && D.war ? D.war.dp : {});
    if (D && Dc.mastered(n)) {
      // mastery: every advantage a third stronger
      for (const k of ['homeDef', 'cityDef', 'capitalDef', 'roughDef', 'speed', 'atkMul', 'equipRegen', 'bleed']) if (dp[k] > 1) dp[k] = 1 + (dp[k] - 1) * 1.33;
      for (const k of ['roughLoss', 'wePace']) if (dp[k] < 1) dp[k] = 1 - (1 - dp[k]) * 1.33;
      for (const k of ['holdFast', 'blitz', 'martyr']) if (dp[k]) dp[k] *= 1.33;
    }
    return dp;
  };

  /* ---------------------------------------------------------------- war orders */
  Dc.orderOf = (n) => { const D = Dc.of(n); return D && D.order ? ID.Combat.ABIL[D.order.key] : null; };
  Dc.registerOrders = function () {
    const C = ID.Combat;
    for (const ideo in ID.DOCTRINE) {
      const o = ID.DOCTRINE[ideo].order; if (!o) continue;
      const ab = C.ABIL[o.key] || (C.ABIL[o.key] = { key: o.key, name: o.name, desc: o.desc, gold: o.gold || 0, cd: o.cd || 240, ideos: [] });
      Object.assign(ab, { name: o.name, desc: o.desc, gold: o.gold || 0, cd: o.cd || 240, self: o.self ? 1 : 0, r: o.r || 0, range: o.range || 0, doctrine: 1, run: o.run, can: o.can, ai: o.ai });
      if (ab.ideos.indexOf(ideo) < 0) ab.ideos.push(ideo);
    }
  };

  /* ---------------------------------------------------------------- describing effects */
  /* label, unit: 'pct' (fraction shown as %), 'pt' (points), 'pm' (points a month), 'rpct' (risk multiplier) */
  Dc.FX = {
    legit: ['Legitimacy', 'pt'], stab: ['Stability', 'pt'], auth: ['Authority a month', 'pm'], prod: ['Industry', 'pct'], eff: ['Efficiency', 'pct'], food: ['Food', 'pct'],
    atk: ['Attack', 'pct'], def: ['Defence', 'pct'], sci: ['Research', 'pct'], unrest: ['Unrest', 'pt', 1], ls: ['Living standards', 'pt'], rev: ['Revenue', 'pct'],
    trade: ['Trade income', 'pct'], opp: ['Opposition growth', 'pm', 1], conf: ['Business confidence', 'pt'], dist: ['Plan distortion', 'pm', 1], vote: ['Vote', 'pct'],
    regen: ['Troop recovery', 'pct'], growth: ['Population growth', 'pct'], speed: ['Front speed', 'pct'], aloss: ['Losses in attack', 'pct', 1], mob: ['Mobilisation ceiling', 'pct'], coup: ['Coup risk', 'pct', 1], driftK: ['Drift speed', 'pct', 1], wePace: ['War weariness growth', 'pct', 1],
  };
  Dc.describe = function (m) {
    const out = [];
    for (const k in m) {
      const v = m[k], F = Dc.FX[k]; if (!F || Math.abs(v) < (F[1] === 'pct' ? 0.004 : F[1] === 'pm' ? 0.02 : 0.4)) continue;
      const bad = F[2] ? v > 0 : v < 0;
      const txt = F[1] === 'pct' ? (v > 0 ? '+' : '−') + Math.round(Math.abs(v) * 100) + '%' : F[1] === 'pm' ? (v > 0 ? '+' : '−') + Math.abs(v).toFixed(2) : (v > 0 ? '+' : '−') + Math.abs(v).toFixed(Math.abs(v) < 2 ? 1 : 0);
      out.push({ k, t: F[0] + ' ' + txt, good: !bad });
    }
    return out;
  };

  /* programme effect: ['sig', v] moves the gauge; ['master'] marks the doctrine mastered */
  Dc.installFx = function () {
    const Fo = ID.Focus; if (!Fo || !Fo.FX) return;
    Fo.FX.sig = (G, n, f) => { Dc.ensure(G, n); n.sig = clamp(n.sig + f[1], 0, 100); };
    Fo.FX.master = (G, n) => { n.flags['dcm_' + n.ideo] = 1; if (n.id === G.player) ID.news(G, 'Doctrine mastered: ' + Dc.of(n).name + '. Its advantages are a third stronger.', 'good', n.id); };
    Fo.DESC.sig = (f, n) => ({ t: (n && Dc.of(n) ? Dc.of(n).gauge : 'Doctrine gauge') + ' ' + (f[1] > 0 ? '+' : '−') + Math.abs(f[1]), good: f[1] > 0 });
    Fo.DESC.master = (f, n) => ({ t: 'Doctrine mastered: its gauge and war advantages a third stronger', good: true });
  };
  Dc.init = function () { Dc.registerOrders(); Dc.installFx(); };
  Dc.init();
})();
