/* IRON DIALECTIC — combat: OpenFront-style fluid fronts, naval landings, supply, strategic weapons. No DOM. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const T = ID.T, B = ID.B, TERR = ID.TERRAIN, clamp = ID.clamp, MAXN = ID.MAXN;
  const C = (ID.Combat = {});
  const BASE_RATE = 0.095;

  /* Combat multipliers for a nation, cached on n.a (refreshed monthly and after law changes). */
  C.refresh = function (G, n) {
    const I = ID.ideo(n), r = ID.RECRUIT[n.laws.recruit], d = I.doctrine;
    let src;
    if (d.morale === 'legit') src = n.legit; else if (d.morale === 'charisma') src = n.charisma; else if (d.morale === 'gold') src = n.gold > 0 ? 80 : 20; else src = n.fs[d.morale];
    let morale = 0.72 + 0.56 * (src / 100);
    if (r.fervorMorale) morale *= 0.82 + n.fervor / 280;
    morale *= 1 - n.we / 320;
    if (n.trans > 0) morale *= 0.9;
    const tech = 1 + 0.07 * n.tech.mil;
    const mob = ID.LAWS.mobil.opts[n.laws.mobil].atk || 0, sec = ID.LAWS.security.opts[n.laws.security].atk || 0;
    const bonus = n.ai ? ID.DIFFICULTY[G.difficulty].aiBonus : 1;
    n.a.morale = morale;
    n.a.atk = r.atk * d.atk * morale * n.equip * tech * (1 + mob + sec + ID.mod(n, 'atk')) * bonus;
    n.a.def = r.def * d.def * morale * Math.pow(n.equip, 0.7) * tech * (1 + sec * 0.5 + ID.mod(n, 'def')) * bonus;
    n.a.home = d.home; n.a.abroad = r.abroad || 1; n.a.rough = r.roughBonus || 1;
  };

  C.styleOk = function (n, style) {
    const S = ID.STYLES[style]; if (!S) return false;
    if (S.needs === 'mil2' && n.tech.mil < 2) return false;
    return (ID.ideo(n).doctrine.styles[style] || 0) > 0;
  };

  function seedFrontier(G, a) {
    const W = G.W, H = G.H, own = G.owner, f = a.from, t = a.to, mark = G._mark, rng = G.rng, terr = G.terrain;
    a.heap.clear();
    const stamp = a.id;
    for (let y = 0; y < H; y++) {
      const row = y * W;
      for (let x = 0; x < W; x++) {
        const i = row + x; if (own[i] !== t) continue;
        if ((x > 0 && own[i - 1] === f) || (x < W - 1 && own[i + 1] === f) || (y > 0 && own[i - W] === f) || (y < H - 1 && own[i + W] === f)) {
          mark[i] = stamp; a.heap.push(a.base + TERR[terr[i]].cost * (0.5 + rng.next()), i);
        }
      }
    }
    a.scan = G.tick;
  }

  function seedWild(G, a) {
    const W = G.W, H = G.H, own = G.owner, f = a.from, mark = G._mark, rng = G.rng, terr = G.terrain;
    a.heap.clear();
    for (let y = 0; y < H; y++) {
      const row = y * W;
      for (let x = 0; x < W; x++) {
        const i = row + x; if (own[i] !== 0 || terr[i] === T.SEA) continue;
        if ((x > 0 && own[i - 1] === f) || (x < W - 1 && own[i + 1] === f) || (y > 0 && own[i - W] === f) || (y < H - 1 && own[i + W] === f)) {
          mark[i] = a.id; a.heap.push(a.base + TERR[terr[i]].cost * (0.5 + rng.next()), i);
        }
      }
    }
    a.scan = G.tick;
  }
  C.WILD_LOSS = 0.06;
  /* Expansion into unclaimed land: no war, no defender, only the land itself resists. */
  function processExpand(G, a) {
    const A = G.nations[a.from];
    if (!A || !A.alive || a.troops < 0.5) { endAttack(G, a, false); return; }
    const W = G.W, H = G.H, own = G.owner, terr = G.terrain, mark = G._mark, rng = G.rng;
    if (G.tick - a.scan > 25) seedWild(G, a);
    const heap = a.heap;
    if (!heap.size) { if (++a.idle > 12) endAttack(G, a, true); return; }
    a.idle = 0;
    const S = ID.STYLES[a.style] || ID.STYLES.advance;
    const rate = BASE_RATE * 1.0 * Math.sqrt(Math.min(heap.size, 500) + 4) * clamp(0.4 + a.troops / 160, 0.4, 1.8) * S.speed;
    a.prog = Math.min(a.prog + rate, 40);
    const atk = Math.max(0.4, A.a.atk || 1);
    let n = 0;
    while (a.prog > 0 && heap.size && n < 80) {
      const i = heap.pop(); const pr = heap.topP;
      if (own[i] !== 0 || terr[i] === T.SEA) continue;
      const x = i % W, y = (i / W) | 0;
      if (!((x > 0 && own[i - 1] === a.from) || (x < W - 1 && own[i + 1] === a.from) || (y > 0 && own[i - W] === a.from) || (y < H - 1 && own[i + W] === a.from))) { mark[i] = 0; continue; }
      const tr = TERR[terr[i]];
      const la = Math.max(0.008, (C.WILD_LOSS * tr.def * (G.river[i] ? 1.2 : 1) / atk) * S.lossA * (tr.rough ? A.a.rough : 1) ** -1);
      a.troops -= la; A.pop -= la * 0.6; A.losses += la * 0.6;
      a.prog -= tr.cost * (G.river[i] ? 1.3 : 1); a.taken++; n++;
      ID.setOwner(G, i, a.from);
      const np = pr + 0.01;
      if (x > 0 && own[i - 1] === 0 && terr[i - 1] !== T.SEA && mark[i - 1] !== a.id) { mark[i - 1] = a.id; heap.push(np + TERR[terr[i - 1]].cost * (0.6 + 0.8 * rng.next()), i - 1); }
      if (x < W - 1 && own[i + 1] === 0 && terr[i + 1] !== T.SEA && mark[i + 1] !== a.id) { mark[i + 1] = a.id; heap.push(np + TERR[terr[i + 1]].cost * (0.6 + 0.8 * rng.next()), i + 1); }
      if (y > 0 && own[i - W] === 0 && terr[i - W] !== T.SEA && mark[i - W] !== a.id) { mark[i - W] = a.id; heap.push(np + TERR[terr[i - W]].cost * (0.6 + 0.8 * rng.next()), i - W); }
      if (y < H - 1 && own[i + W] === 0 && terr[i + W] !== T.SEA && mark[i + W] !== a.id) { mark[i + W] = a.id; heap.push(np + TERR[terr[i + W]].cost * (0.6 + 0.8 * rng.next()), i + W); }
      if (a.troops <= 0.5) break;
    }
    if (n && !G.headless && a.from === G.player && (G.tick & 3) === 0) ID.sfx(G, 'tick');
    if (a.troops <= 0.5) endAttack(G, a, false);
  }
  C.canExpand = (G, n) => (G.wildB && G.wildB[n.id] > 0 ? '' : 'No unclaimed land borders yours. Reach it by sea with a landing.');

  /* Launch or reinforce a land attack (to = 0: expand into unclaimed land). Returns the attack, or a string explaining why not. */
  C.launch = function (G, from, to, troops, style, quiet) {
    if (to === 0) {
      const A = G.nations[from]; if (!A || !A.alive) return 'No such state.';
      const why = quiet ? '' : C.canExpand(G, A); if (why) return why;
      troops = Math.min(troops, A.troops); if (troops < 1) return 'No troops to commit.';
      let a = null; for (const x of G.attacks) if (x.from === from && x.to === 0) { a = x; break; }
      if (a) { a.troops += troops; a.committed += troops; a.idle = 0; }
      else {
        if (!G._mark) G._mark = new Int32Array(G.N);
        a = { id: G.nextId++, from, to: 0, troops, committed: troops, style: 'advance', heap: new ID.Heap(), prog: 0, base: G.tick, scan: 0, idle: 0, amphib: 0, taken: 0 };
        seedWild(G, a); G.attacks.push(a);
      }
      A.troops -= troops;
      return a;
    }
    const A = G.nations[from], D = G.nations[to];
    if (!A || !D || !D.alive) return 'No such target.';
    if (!ID.atWar(G, from, to)) return 'You are not at war with ' + D.name + '.';
    if (!C.styleOk(A, style)) style = 'advance';
    troops = Math.min(troops, A.troops);
    if (troops < 1) return 'No troops to commit.';
    let a = null;
    for (const x of G.attacks) if (x.from === from && x.to === to) { a = x; break; }
    if (a) { a.troops += troops; a.style = style; a.committed += troops; a.idle = 0; }
    else {
      a = { id: G.nextId++, from, to, troops, committed: troops, style, heap: new ID.Heap(), prog: 0, base: G.tick, scan: 0, idle: 0, amphib: 0, taken: 0 };
      if (!G._mark) G._mark = new Int32Array(G.N);
      seedFrontier(G, a);
      if (!a.heap.size && !quiet) return 'No land front with ' + D.name + '. Use a naval landing.';
      G.attacks.push(a);
    }
    A.troops -= troops;
    return a;
  };

  C.cancel = function (G, a) {
    const k = G.attacks.indexOf(a); if (k < 0) return;
    G.attacks.splice(k, 1);
    const A = G.nations[a.from]; if (A && A.alive) A.troops += a.troops * 0.9;
  };
  function endAttack(G, a, refund) {
    const k = G.attacks.indexOf(a); if (k >= 0) G.attacks.splice(k, 1);
    if (refund && a.troops > 0) { const A = G.nations[a.from]; if (A && A.alive) A.troops += a.troops; }
  }

  function processAttack(G, a) {
    const A = G.nations[a.from], D = G.nations[a.to];
    if (!A.alive || !D.alive || !ID.atWar(G, a.from, a.to)) { endAttack(G, a, true); return; }
    if (a.troops < 0.5) { endAttack(G, a, false); return; }
    const W = G.W, H = G.H, own = G.owner, terr = G.terrain, mark = G._mark, rng = G.rng;
    if (G.tick - a.scan > 25) seedFrontier(G, a);
    const heap = a.heap;
    if (!heap.size) { if (++a.idle > 50) endAttack(G, a, true); return; }
    a.idle = 0;
    const S = ID.STYLES[a.style], e = ID.ideo(A).doctrine.styles[a.style] || 1;
    if (S.goldDay) { A.gold -= S.goldDay * (1 + a.troops / 400); if (A.gold < -50) a.style = 'advance'; }

    // clash with an opposing attack
    let share = 1;
    for (const o of G.attacks) {
      if (o.from === a.to && o.to === a.from && o.troops > 0.5) {
        share = clamp(a.troops / (a.troops + o.troops) * 1.25, 0.1, 1);
        if (a.id < o.id) {
          const c = Math.min(a.troops, o.troops) * 0.022 + 0.04;
          const k = Math.sqrt(clamp(D.a.atk / A.a.atk, 0.4, 2.5));
          const la = Math.min(a.troops, c * k), lo = Math.min(o.troops, c / k);
          a.troops -= la; o.troops -= lo; A.pop -= la; D.pop -= lo; A.losses += la; D.losses += lo; A.kills += lo; D.kills += la; A.casM += la; D.casM += lo;
        }
        break;
      }
    }

    const ratio = a.troops / Math.max(1, D.troops);
    const rate = BASE_RATE * Math.sqrt(Math.min(heap.size, 500) + 4) * clamp(0.25 + 0.6 * ratio, 0.3, 1.8) * S.speed * e * share * (1 + 0.04 * A.tech.mil);
    a.prog = Math.min(a.prog + rate, 40);
    const dd = D.troops / Math.max(D.tiles, 40);
    const atk = A.a.atk * e, def = D.a.def;
    const igT = S.ignoreTerrain || 0, igF = S.ignoreFort || 0;
    const war = ID.Diplomacy.warOf(G, a.from, a.to);
    const holy = ID.ideo(A).flags.holyWar && (D.laws.religion === 'secular' || D.laws.religion === 'atheism') ? 1.2 : 1;
    let n = 0;
    while (a.prog > 0 && heap.size && n < 60) {
      const i = heap.pop(); const pr = heap.topP;
      if (own[i] !== a.to) continue;
      const x = i % W, y = (i / W) | 0;
      if (!((x > 0 && own[i - 1] === a.from) || (x < W - 1 && own[i + 1] === a.from) || (y > 0 && own[i - W] === a.from) || (y < H - 1 && own[i + W] === a.from))) { mark[i] = 0; continue; }
      const tr = TERR[terr[i]];
      const P = G.provinces[G.prov[i]];
      const fort = G.fortCov[i] === a.to;
      let cost = 1 + (tr.cost - 1) * (1 - igT);
      let tdef = 1 + (tr.def - 1) * (1 - igT);
      let lossMul = S.lossA;
      if (S.open && tr.rough) { cost *= 3.2; lossMul *= 1.4; }
      if (G.river[i]) { cost *= 1.5; tdef *= 1.3; }
      if (fort) { cost *= 1 + 0.8 * (1 - igF); tdef *= 1 + 1.5 * (1 - igF); }
      if (G.bld[i] === B.CITY) { tdef *= 2; cost *= 1.5; }
      if (G.shock && G.shock.length && shocked(G, x, y, a.from, a.to)) { tdef *= 0.6; cost *= 0.75; }
      let dmul = def, amul = atk * holy;
      if (P.core === a.to) dmul *= D.a.home; else if (P.core === a.from) amul *= 1.15; else dmul *= 0.85;
      if (P.core !== a.from) amul *= A.a.abroad;
      if (tr.rough) { amul *= A.a.rough; dmul *= D.a.rough; }
      if (P.opp && P.oppStr > 30 && ID.ideo(A).flags.liberator && ID.IDEOLOGIES[P.opp].family === ID.ideo(A).family) amul *= 1.2;
      const cutT = G.cut[i] === 1;
      let la = dd * tdef * (dmul / amul) * lossMul * (cutT ? 0.25 : 1);
      if (a.amphib > 0) { la *= 1.5; a.amphib--; }
      if (la < 0.012) la = 0.012;
      const ld = Math.min(D.troops, dd * (cutT ? 1.0 : 0.55) * S.lossD * Math.sqrt(clamp(amul / dmul, 0.4, 2.5)));
      a.troops -= la; A.pop -= la; A.losses += la; D.kills += la; A.casM += la;
      D.troops -= ld; D.pop -= ld; D.losses += ld; A.kills += ld; D.casM += ld;
      a.prog -= cost; a.taken++; n++;
      if (war) { if (war.a === a.from) war.ta++; else war.tb++; }
      ID.setOwner(G, i, a.from);
      const np = pr + 0.01;
      if (x > 0 && own[i - 1] === a.to && mark[i - 1] !== a.id) { mark[i - 1] = a.id; heap.push(np + TERR[terr[i - 1]].cost * (0.6 + 0.8 * rng.next()), i - 1); }
      if (x < W - 1 && own[i + 1] === a.to && mark[i + 1] !== a.id) { mark[i + 1] = a.id; heap.push(np + TERR[terr[i + 1]].cost * (0.6 + 0.8 * rng.next()), i + 1); }
      if (y > 0 && own[i - W] === a.to && mark[i - W] !== a.id) { mark[i - W] = a.id; heap.push(np + TERR[terr[i - W]].cost * (0.6 + 0.8 * rng.next()), i - W); }
      if (y < H - 1 && own[i + W] === a.to && mark[i + W] !== a.id) { mark[i + W] = a.id; heap.push(np + TERR[terr[i + W]].cost * (0.6 + 0.8 * rng.next()), i + W); }
      if (a.troops <= 0.5) break;
    }
    if (n && !G.headless && (a.from === G.player || a.to === G.player) && (G.tick & 3) === 0) ID.sfx(G, 'tick');
    if (D.tiles <= 0) { ID.Diplomacy.eliminate(G, D, A); return; }
    if (a.troops <= 0.5) endAttack(G, a, false);
  }

  /* ---------------------------------------------------------------- naval */
  C.navalRange = (G, n) => ID.ERAS[ID.eraOf(G.tick)].range * (ID.ideo(n).flags.navalPower ? 1.4 : 1);

  /* Plan a route from one of n's ports to the coast tile `target`. Returns {path} or a reason string. */
  C.planBoat = function (G, n, target) {
    if (!n.nb[B.PORT]) return 'You need a port to launch a landing.';
    if (G.terrain[target] === T.SEA) return 'Pick a coastal land tile.';
    if (G.owner[target] === n.id) return 'That coast is already yours.';
    const tsea = ID.seaNeighbors(G, target);
    if (!tsea.length) return 'A landing needs a coastal tile.';
    const range = C.navalRange(G, n);
    const dist = ID.seaDistance(G, tsea, range);
    let best = -1, bd = 1e9, bport = -1;
    for (const i of G.blist) {
      if (G.bld[i] !== B.PORT || G.owner[i] !== n.id || G.cut[i] === 1) continue;
      for (const s of ID.seaNeighbors(G, i)) if (dist[s] >= 0 && dist[s] < bd) { bd = dist[s]; best = s; bport = i; }
    }
    if (best < 0) return 'No sea route within range (' + Math.round(range) + ').';
    const path = [bport, best]; let c = best; const W = G.W;
    while (dist[c] > 0) {
      const d = dist[c]; let nx = -1;
      for (const s of [c - 1, c + 1, c - W, c + W]) if (s >= 0 && s < G.N && dist[s] === d - 1) { nx = s; break; }
      if (nx < 0) break; c = nx; path.push(c);
    }
    path.push(target);
    return { path };
  };
  C.launchBoat = function (G, n, target, troops, style) {
    const plan = C.planBoat(G, n, target); if (typeof plan === 'string') return plan;
    troops = Math.min(troops, n.troops); if (troops < 1) return 'No troops to embark.';
    n.troops -= troops;
    const bt = { id: G.nextId++, owner: n.id, troops, style: C.styleOk(n, style) ? style : 'advance', path: plan.path, pos: 0, target };
    G.boats.push(bt);
    if (n.id === G.player) ID.sfx(G, 'boat');
    return bt;
  };
  function landBoat(G, bt) {
    const A = G.nations[bt.owner]; if (!A.alive) return;
    const to = G.owner[bt.target];
    if (!to && G.terrain[bt.target] !== T.SEA) {
      ID.setOwner(G, bt.target, bt.owner);
      const a = C.launch(G, bt.owner, 0, 0, 'advance', true);
      A.troops += bt.troops;
      if (a && typeof a !== 'string') { a.troops += bt.troops * 0.9; a.committed += bt.troops; A.troops -= bt.troops * 0.9; seedWild(G, a); }
      ID.fx(G, 'land', bt.target);
      if (A.id === G.player) ID.news(G, 'Settlers come ashore on unclaimed land.', 'good', A.id);
      return;
    }
    if (to === bt.owner || !to || !ID.atWar(G, bt.owner, to)) { A.troops += bt.troops; return; }
    const D = G.nations[to];
    const dd = D.troops / Math.max(D.tiles, 40);
    const naval = ID.ideo(A).doctrine.naval || 1;
    const fort = G.fortCov[bt.target] === to ? 2.5 : 1;
    const cost = (dd * 3 * fort * TERR[G.terrain[bt.target]].def * D.a.def / A.a.atk + 0.5) / naval;
    if (bt.troops <= cost * 1.2) {
      A.pop -= bt.troops; A.losses += bt.troops; A.casM += bt.troops; D.kills += bt.troops;
      ID.news(G, 'A ' + A.adj + ' landing is thrown back into the sea by ' + D.name + '.', 'war', A.id, D.id);
      if (A.id === G.player) ID.sfx(G, 'bad');
      return;
    }
    A.pop -= cost; A.losses += cost; A.casM += cost;
    ID.setOwner(G, bt.target, bt.owner);
    A.troops += bt.troops - cost;
    const a = C.launch(G, bt.owner, to, bt.troops - cost, bt.style, true);
    if (a && typeof a !== 'string') { a.amphib = Math.round(24 / naval); seedFrontier(G, a); }
    ID.news(G, A.adj + ' troops land on the coast of ' + D.name + '.', 'war', A.id, D.id);
    ID.fx(G, 'land', bt.target);
  }

  /* ---------------------------------------------------------------- strategic weapons */
  C.missileRange = (G) => [0, 110, 200, 320][ID.eraOf(G.tick)];
  C.canMissile = function (G, n, target, nuke) {
    if (!n.nb[B.SILO]) return 'You have no missile silo.';
    if (nuke ? n.nukes < 1 : n.missiles < 1) return nuke ? 'No atomic warhead ready.' : 'No missile ready.';
    const W = G.W, tx = target % W, ty = (target / W) | 0; let best = 1e9, from = -1;
    for (const i of G.blist) if (G.bld[i] === B.SILO && G.owner[i] === n.id) { const d = Math.hypot((i % W) - tx, ((i / W) | 0) - ty); if (d < best) { best = d; from = i; } }
    if (best > C.missileRange(G)) return 'Out of range (' + C.missileRange(G) + ').';
    return { from, dist: best };
  };
  C.launchMissile = function (G, n, target, nuke) {
    const r = C.canMissile(G, n, target, nuke); if (typeof r === 'string') return r;
    if (nuke) n.nukes--; else n.missiles--;
    G.missiles.push({ owner: n.id, from: r.from, to: target, t: 0, dur: Math.max(6, Math.round(r.dist / 5)), nuke: !!nuke });
    ID.sfx(G, 'launch');
    return '';
  };
  function impact(G, m) {
    const W = G.W, H = G.H, x0 = m.to % W, y0 = (m.to / W) | 0, R = m.nuke ? 8 : 3;
    const A = G.nations[m.owner];
    const hit = {};
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      if (dx * dx + dy * dy > R * R) continue;
      const x = x0 + dx, y = y0 + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x; if (G.terrain[i] === T.SEA) continue;
      const o = G.owner[i]; if (o) hit[o] = (hit[o] || 0) + 1;
      if (G.bld[i] && (m.nuke || G.rng.chance(0.55))) ID.removeBuilding(G, i);
      if (m.nuke && !G.rad[i]) {
        const tr = TERR[G.terrain[i]];
        if (o) { const v = G.nations[o]; v.popLand -= tr.pop; v.foodLand -= tr.food * (G.river[i] ? 1.25 : 1); }
        G.rad[i] = 120; G.radList.push(i);
        if (!G.headless) G.dirty.push(i);
      }
    }
    for (const k in hit) {
      const v = G.nations[+k]; const share = hit[k] / Math.max(40, v.tiles);
      if (m.nuke) {
        const dead = v.pop * Math.min(0.5, share * 1.6); v.pop -= dead; v.troops *= 1 - Math.min(0.6, share * 3);
        v.losses += dead; v.casM += dead * 0.5; v.stab -= 12; v.we = Math.min(100, v.we + 15);
        ID.logGrief(v, G.tick, 'An atomic strike killed ' + ID.fmtPop(dead) + '.');
      } else { v.troops *= 0.985; v.stab -= 1.5; }
    }
    ID.fx(G, m.nuke ? 'nuke' : 'boom', m.to);
    ID.sfx(G, m.nuke ? 'nuke' : 'boom');
    if (m.nuke) ID.Diplomacy.onNuke(G, A, hit, m.to);
  }
  C.tickRadiation = function (G) { // monthly
    const L = G.radList; if (!L || !L.length) return;
    for (let k = L.length - 1; k >= 0; k--) {
      const i = L[k];
      if (--G.rad[i] <= 0) {
        G.rad[i] = 0; L.splice(k, 1);
        const o = G.owner[i], tr = TERR[G.terrain[i]];
        if (o) { const v = G.nations[o]; v.popLand += tr.pop; v.foodLand += tr.food * (G.river[i] ? 1.25 : 1); }
        if (!G.headless) G.dirty.push(i);
      }
    }
  };

  /* ---------------------------------------------------------------- war abilities */
  C.ABIL = {
    barrage: { name: 'Artillery barrage', gold: 35, cd: 30, r: 4, range: 16, kill: 0.012, fort: 0.6, bld: 0, shock: 40,
      desc: 'Shell a stretch of the enemy line close to your own. Kills troops, can wreck a fortress, and leaves the area shaken: your attacks there cost 40% less for forty days.' },
    airraid: { name: 'Air raid', gold: 90, cd: 50, r: 6, range: 80, kill: 0.02, fort: 0.3, bld: 0.3, shock: 45, air: 1,
      desc: 'Bombers strike deep behind the lines. Kills troops, can destroy factories, cities and ports, shakes the area and the enemy’s nerve. Needs military technology 3.' },
    reserves: { name: 'Call up the reserves', gold: 60, cd: 240, self: 1,
      desc: 'Every man who has ever held a rifle reports to the depots. An instant draft of 2% of the population, beyond your normal ceiling. Workers and peasants will not thank you, and the new men are badly equipped.' },
  };
  C.nearOwn = function (G, n, tile, range) {
    const W = G.W, H = G.H, x0 = tile % W, y0 = (tile / W) | 0, own = G.owner;
    for (let r = 0; r <= range; r++) {
      for (let dy = -r; dy <= r; dy++) {
        const y = y0 + dy; if (y < 0 || y >= H) continue;
        const step = Math.abs(dy) === r ? 1 : 2 * r;
        for (let dx = -r; dx <= r; dx += step || 1) { const x = x0 + dx; if (x >= 0 && x < W && own[y * W + x] === n.id) return true; }
      }
    }
    return false;
  };
  C.abilBlock = function (G, n, key, tile) {
    const ab = C.ABIL[key]; if (!ab) return 'Unknown order.';
    const cd = n.cd['ab_' + key] || 0; if (cd > G.tick) return 'Ready again in ' + (cd - G.tick) + ' days.';
    if (n.gold < ab.gold) return 'Needs ' + ab.gold + ' gold.';
    if (ab.air && n.tech.mil < 3) return 'Needs military technology 3.';
    if (ab.self) {
      if (!n.nwars) return 'Only in wartime.';
      if (n.troops >= n.pop * ID.maxMob(n) * 1.2) return 'There is no one left to call up.';
      if (ID.RECRUIT[n.laws.recruit].hire) return 'Hired companies have no reserves. Buy more troops instead.';
      return '';
    }
    if (tile == null || tile < 0) return 'Select an enemy tile first.';
    const o = G.owner[tile]; if (!o || o === n.id) return 'Target enemy land.';
    if (!ID.atWar(G, n.id, o)) return 'You are not at war with ' + G.nations[o].name + '.';
    if (!C.nearOwn(G, n, tile, ab.range)) return 'Out of range: within ' + ab.range + ' tiles of your own land.';
    return '';
  };
  C.useAbil = function (G, n, key, tile) {
    const why = C.abilBlock(G, n, key, tile); if (why) return why;
    const ab = C.ABIL[key];
    n.gold -= ab.gold; n.cd['ab_' + key] = G.tick + ab.cd;
    if (ab.self) {
      const add = Math.max(0, Math.min(n.pop * 0.02, n.pop * ID.maxMob(n) * 1.2 - n.troops));
      n.troops += add; n.sm.workers -= 4; n.sm.peasants -= 5; n.we = Math.min(100, n.we + 3); n.equip = Math.max(0.5, n.equip - 0.04);
      if (n.id === G.player) ID.news(G, 'The reserves are called up: ' + ID.fmtPop(add) + ' men report to the depots.', 'war', n.id);
      ID.sfx(G, 'drums');
      return '';
    }
    const D = G.nations[G.owner[tile]], W = G.W, H = G.H, x0 = tile % W, y0 = (tile / W) | 0;
    const kill = Math.min(D.troops, D.troops * ab.kill * (1 + 0.08 * n.tech.mil) / Math.max(0.7, D.a.def || 1));
    D.troops -= kill; D.pop -= kill; D.losses += kill; D.casM += kill; n.kills += kill;
    let wrecked = 0;
    for (let dy = -ab.r; dy <= ab.r; dy++) for (let dx = -ab.r; dx <= ab.r; dx++) {
      if (dx * dx + dy * dy > ab.r * ab.r) continue; const x = x0 + dx, y = y0 + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x; const b = G.bld[i]; if (!b || G.owner[i] !== D.id) continue;
      if ((b === B.FORT && G.rng.chance(ab.fort)) || (b !== B.FORT && b !== B.SILO && G.rng.chance(ab.bld))) { ID.removeBuilding(G, i); wrecked++; }
    }
    (G.shock || (G.shock = [])).push({ x: x0, y: y0, r: ab.r + 1, until: G.tick + ab.shock, by: n.id, vs: D.id });
    if (ab.air) { D.stab -= 1.5; D.we = Math.min(100, D.we + 1.5); }
    ID.fx(G, key, tile, { r: ab.r });
    if (n.id === G.player || D.id === G.player) { ID.sfx(G, key === 'airraid' ? 'airraid' : 'barrage'); }
    if (D.id === G.player) ID.news(G, (ab.air ? 'Enemy bombers' : 'Enemy guns') + ' from ' + n.name + ' strike your lines: ' + ID.fmtPop(kill) + ' lost' + (wrecked ? ', ' + wrecked + ' building' + (wrecked > 1 ? 's' : '') + ' destroyed' : '') + '.', 'war', n.id, D.id);
    n.a.lastAbil = { key, kill, wrecked, t: G.tick };
    return '';
  };
  function shocked(G, x, y, from, to) {
    const L = G.shock; if (!L || !L.length) return false;
    for (let k = 0; k < L.length; k++) { const s = L[k]; if (s.by === from && s.vs === to && (x - s.x) * (x - s.x) + (y - s.y) * (y - s.y) <= s.r * s.r) return true; }
    return false;
  }

  /* ---------------------------------------------------------------- supply & encirclement */
  C.updateSupply = function (G) {
    const W = G.W, H = G.H, N = G.N, own = G.owner;
    const comp = G._comp || (G._comp = new Int32Array(N)), stack = G._stack || (G._stack = new Int32Array(N));
    comp.fill(-1);
    const comps = [];
    const caps = new Int32Array(G.nations.length).fill(-1);
    for (const n of G.nations) if (n && n.alive) caps[n.id] = n.capital;
    for (let s = 0; s < N; s++) {
      const o = own[s]; if (!o || comp[s] >= 0) continue;
      const id = comps.length; let sp = 0, size = 0, hasCap = false, hasPort = false;
      stack[sp++] = s; comp[s] = id; const cap = caps[o];
      while (sp) {
        const c = stack[--sp]; size++;
        if (c === cap) hasCap = true;
        if (G.bld[c] === B.PORT) hasPort = true;
        const x = c % W;
        if (x > 0 && own[c - 1] === o && comp[c - 1] < 0) { comp[c - 1] = id; stack[sp++] = c - 1; }
        if (x < W - 1 && own[c + 1] === o && comp[c + 1] < 0) { comp[c + 1] = id; stack[sp++] = c + 1; }
        if (c >= W && own[c - W] === o && comp[c - W] < 0) { comp[c - W] = id; stack[sp++] = c - W; }
        if (c < N - W && own[c + W] === o && comp[c + W] < 0) { comp[c + W] = id; stack[sp++] = c + W; }
      }
      comps.push({ o, size, hasCap, hasPort, start: s, st: 0 });
    }
    // main component per nation
    const main = new Int32Array(G.nations.length).fill(-1);
    comps.forEach((c, id) => { if (c.hasCap) main[c.o] = id; });
    comps.forEach((c, id) => { if (main[c.o] < 0 || (!comps[main[c.o]].hasCap && c.size > comps[main[c.o]].size)) main[c.o] = id; });
    comps.forEach((c, id) => { c.st = main[c.o] === id ? 0 : c.hasPort ? 2 : 1; });
    const cut = G.cut, age = G.cutAge;
    let anyCut = false;
    for (let i = 0; i < N; i++) {
      const k = comp[i]; if (k < 0) { cut[i] = 0; continue; }
      const st = comps[k].st;
      if (cut[i] !== st && !G.headless && G.mapMode === 'supply') G.dirty.push(i);
      cut[i] = st;
      if (st === 1) { if (age[i] < 250) age[i]++; anyCut = true; } else age[i] = 0;
    }
    if (!anyCut) return;
    // collapse pockets
    for (let id = 0; id < comps.length; id++) {
      const c = comps[id]; if (c.st !== 1) continue;
      const n = G.nations[c.o]; if (!n.alive || !n.nwars) continue;
      const fl = ID.ideo(n).flags; const hold = fl.noDecap || fl.partisans ? 12 : 4;
      if (!(c.size <= 4 || age[c.start] >= hold)) continue;
      // collect tiles + adjacent enemies
      const tiles = []; const adj = {}; let sp = 0; stack[sp++] = c.start; comp[c.start] = -2;
      while (sp) {
        const t = stack[--sp]; tiles.push(t); const x = t % W;
        for (const q of [x > 0 ? t - 1 : -1, x < W - 1 ? t + 1 : -1, t >= W ? t - W : -1, t < N - W ? t + W : -1]) {
          if (q < 0) continue; const oo = own[q];
          if (oo === c.o) { if (comp[q] === id) { comp[q] = -2; stack[sp++] = q; } }
          else if (oo && G.warM[c.o * MAXN + oo]) adj[oo] = (adj[oo] || 0) + 1;
        }
      }
      let win = 0, wb = 0; for (const k in adj) if (adj[k] > wb) { wb = adj[k]; win = +k; }
      if (!win) continue;
      const share = tiles.length / Math.max(1, n.tiles);
      const lost = n.troops * Math.min(0.9, share * 0.9);
      n.troops -= lost; n.pop -= lost * 0.3; n.losses += lost; n.casM += lost * 0.6; G.nations[win].kills += lost;
      const war = ID.Diplomacy.warOf(G, win, c.o);
      for (const t of tiles) ID.setOwner(G, t, win);
      if (war) { if (war.a === win) war.ta += tiles.length; else war.tb += tiles.length; }
      if (tiles.length > 60) {
        ID.news(G, 'Encircled: a ' + n.adj + ' pocket of ' + tiles.length + ' tiles surrenders to ' + G.nations[win].name + ' with ' + ID.fmtPop(lost) + ' troops.', 'war', win, n.id);
        if (n.id === G.player) { ID.sfx(G, 'bad'); ID.logGrief(n, G.tick, 'A pocket was encircled and ' + ID.fmtPop(lost) + ' troops surrendered.'); }
        if (win === G.player) ID.sfx(G, 'good');
        G.nations[win].glory = Math.min(100, G.nations[win].glory + 3); n.glory -= 3;
      }
      if (n.tiles <= 0) ID.Diplomacy.eliminate(G, n, G.nations[win]);
    }
  };

  /* ---------------------------------------------------------------- per-tick driver */
  C.tick = function (G) {
    const at = G.attacks;
    for (let k = at.length - 1; k >= 0; k--) { if (k < at.length) { if (at[k].to === 0) processExpand(G, at[k]); else processAttack(G, at[k]); } }
    if (G.boats.length) {
      for (let k = G.boats.length - 1; k >= 0; k--) {
        const bt = G.boats[k]; bt.pos += 1.3;
        if (bt.pos >= bt.path.length - 1) { G.boats.splice(k, 1); landBoat(G, bt); }
      }
    }
    if (G.missiles.length) {
      for (let k = G.missiles.length - 1; k >= 0; k--) { const m = G.missiles[k]; if (++m.t >= m.dur) { G.missiles.splice(k, 1); impact(G, m); } }
    }
    if (G.capLost.length) { const L = G.capLost.splice(0); for (const [from, to] of L) ID.Diplomacy.onCapitalLost(G, G.nations[from], G.nations[to]); }
    if (G.fortsDirty) ID.recomputeForts(G);
    if (G.tick % 10 === 0) { C.updateSupply(G); if (G.shock && G.shock.length) G.shock = G.shock.filter((s) => s.until > G.tick); }
  };

  /* Daily population and troop pool. */
  C.tickPop = function (G, n) {
    const cap = ID.popCap(n);
    if (n.pop < 1) n.pop = 1;
    const g = 0.00015 * (0.55 + n.ls / 110) * (n.famine ? 0 : 1) * (1 + ID.mod(n, 'growth'));
    if (n.pop < cap) n.pop += n.pop * g * (1 - n.pop / cap); else n.pop -= (n.pop - cap) * 0.006;
    const r = ID.RECRUIT[n.laws.recruit];
    if (n.troops > n.pop * 0.6) n.troops = n.pop * 0.6;
    if (r.hire) { if (n.gold < 0 && n.troops > 0) n.troops *= 0.995; return; }
    const target = n.pop * n.mob;
    if (n.troops < target) n.troops += (target - n.troops) * 0.0042 * r.regen * (1 + ID.mod(n, 'regen')) * (n.nwars && n.a.defensive ? 2 : 1);
    else n.troops -= (n.troops - target) * 0.01;
  };
})();
