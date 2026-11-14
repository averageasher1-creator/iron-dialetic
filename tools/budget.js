'use strict';
const path = require('path'); const root = path.join(__dirname, '..', 'js'); globalThis.ID = {};
for (const f of ['core/util', 'data/base', 'data/ideologies', 'data/names', 'data/events', 'data/fortune', 'data/arcs', 'data/focus', 'data/destiny', 'data/story2', 'data/expand', 'data/doctrine', 'data/ideotrees', 'data/regime', 'data/national', 'data/projects', 'sim/mapgen', 'sim/world', 'sim/combat', 'sim/economy', 'sim/politics', 'sim/diplomacy', 'sim/events', 'sim/focus', 'sim/doctrine', 'sim/regime', 'sim/ai', 'sim/game']) require(path.join(root, f + '.js'));
const ID = globalThis.ID;
// every nation as a human player who never touches anything: what happens to its treasury?
const G = ID.newGame({ seed: 5, scenario: process.argv[2] || 'meridia', headless: true });
for (const n of ID.alive(G)) n.ai = false;
G.autoPlayer = false;
const rows = {};
for (let m = 1; m <= 36; m++) {
  for (let d = 0; d < 30; d++) { G.tick++; ID.Combat.tick(G); ID.tickBuilds(G); for (const n of ID.alive(G)) ID.Combat.tickPop(G, n); }
  ID.recalcProvinceOwners(G); ID.recalcBorders(G);
  for (const n of ID.alive(G)) ID.Economy.month(G, n);
  ID.Politics.provinces(G);
  for (const n of ID.alive(G)) ID.Politics.month(G, n);
  ID.Game.updateStats(G);
  if (m === 1 || m === 12 || m === 36) for (const n of ID.alive(G)) (rows[n.base] = rows[n.base] || [n.ideo]).push(`m${m}: rev ${n.rev.toFixed(0)} exp ${n.exp.toFixed(0)} upk ${n.a.upkeep.toFixed(0)} net ${n.net.toFixed(1)} gold ${n.gold.toFixed(0)} debt ${n.debt.toFixed(0)} ls ${n.ls.toFixed(0)} stab ${n.stab.toFixed(0)}`);
}
for (const k in rows) console.log(k.padEnd(9), rows[k][0].padEnd(11), rows[k].slice(1).join(' | '));
