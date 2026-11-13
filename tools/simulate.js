/* Headless AI-vs-AI campaigns for balance testing.
   node tools/simulate.js [--runs 6] [--seed 1] [--scenario meridia|random] [--size std] [--years 66] [--verbose] [--nofocus] */
'use strict';
const path = require('path');
const root = path.join(__dirname, '..', 'js');
globalThis.ID = {};
for (const f of ['core/util', 'data/base', 'data/ideologies', 'data/names', 'data/events', 'data/focus', 'sim/mapgen', 'sim/world', 'sim/combat', 'sim/economy', 'sim/politics', 'sim/diplomacy', 'sim/events', 'sim/focus', 'sim/ai', 'sim/game']) require(path.join(root, f + '.js'));
const ID = globalThis.ID;
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : d; };
const runs = +arg('runs', 4), seed0 = +arg('seed', 1), years = +arg('years', 66), scenario = arg('scenario', 'random'), size = arg('size', 'std');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--nofocus')) ID.Focus.aiPick = () => {}; // compare against a world without programmes
const agg = { ideoYears: {}, ideoStart: {}, ideoEnd: {}, falls: {}, changes: {}, wars: 0, civil: 0, conquest: 0, topShare: [], alive: [], dom: 0, ms: [] };
for (let r = 0; r < runs; r++) {
  const t0 = Date.now();
  const G = ID.newGame({ seed: seed0 + r * 7919, size, scenario: r === 0 && scenario === 'meridia' ? 'meridia' : scenario === 'meridia' ? 'random' : scenario, headless: true, difficulty: 'iron' });
  const n0 = ID.alive(G).length;
  for (const n of ID.alive(G)) agg.ideoStart[n.ideo] = (agg.ideoStart[n.ideo] || 0) + 1;
  const end = years * 360; let lastY = -1; const snaps = [];
  while (G.tick < end && !G.over) {
    ID.Game.tick(G);
    if (G.tick % 360 === 0) {
      for (const n of ID.alive(G)) agg.ideoYears[n.ideo] = (agg.ideoYears[n.ideo] || 0) + 1;
      const y = ID.yearOf(G.tick);
      if (verbose && y % 6 === 0) {
        const top = G.nations[G.stats.top];
        snaps.push(y + ' alive ' + ID.alive(G).length + ' wars ' + ID.alive(G).filter((n) => n.nwars).length + ' top ' + top.base + '(' + top.ideo + ') land ' + (top.tiles / G.landCount * 100).toFixed(0) + '% avgStab ' + (ID.alive(G).reduce((s, n) => s + n.stab, 0) / ID.alive(G).length).toFixed(0) + ' atk ' + G.attacks.length);
      }
    }
  }
  const ms = Date.now() - t0; agg.ms.push(ms);
  const ch = G.chronicle; const cnt = (t) => ch.filter((c) => c.type === t).length;
  agg.wars += cnt('war'); agg.civil += cnt('civilwar'); agg.conquest += cnt('conquest');
  for (const c of ch) if (c.type === 'ideology') { const m = /(coup|revolution|votes in|slides into|reforms|imposed|changes hands)/.exec(c.text); if (m) agg.changes[m[1]] = (agg.changes[m[1]] || 0) + 1; }
  const al = ID.alive(G); agg.alive.push(al.length);
  let big = al[0]; for (const n of al) { agg.ideoEnd[n.ideo] = (agg.ideoEnd[n.ideo] || 0) + 1; if (n.tiles > big.tiles) big = n; }
  agg.topShare.push(big.tiles / G.landCount); if (G.over) agg.dom++;
  console.log(`run ${r} seed ${G.seed} ${G.scenario}: ${ms}ms end ${ID.yearOf(G.tick)} states ${n0}->${al.length} (slots ${G.nations.length - 1}) wars ${cnt('war')} civil ${cnt('civilwar')} conquests ${cnt('conquest')} secessions ${cnt('secession')} ideology changes ${cnt('ideology')} blocs ${cnt('bloc')} nukes ${cnt('nuke')} | biggest ${big.name} ${(big.tiles / G.landCount * 100).toFixed(0)}% | over ${G.over ? JSON.stringify({ r: G.over.result, t: G.over.type, by: G.over.by && G.nations[G.over.by].name, y: G.over.year }) : 'no'}`);
  if (verbose) { for (const s of snaps) console.log('   ' + s); console.log('   end: ' + al.map((n) => n.base + ':' + n.ideo + ':' + (n.tiles / G.landCount * 100).toFixed(0) + '%:s' + Math.round(n.stab)).join(' ')); }
}
const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
console.log('\n== aggregate over ' + runs + ' runs ==');
console.log('avg ms/run', Math.round(avg(agg.ms)), '| avg wars', (agg.wars / runs).toFixed(1), 'civil wars', (agg.civil / runs / 2).toFixed(1), 'conquests', (agg.conquest / runs).toFixed(1), '| avg states at end', avg(agg.alive).toFixed(1), '| biggest land share avg', (avg(agg.topShare) * 100).toFixed(0) + '% max', (Math.max(...agg.topShare) * 100).toFixed(0) + '% | ended early', agg.dom);
console.log('ideology change modes', JSON.stringify(agg.changes));
const rows = ID.IDEO_LIST.map((i) => [i.id, agg.ideoStart[i.id] || 0, agg.ideoYears[i.id] || 0, agg.ideoEnd[i.id] || 0]);
console.log('ideology: starts / nation-years / alive at end');
console.log(rows.map((r) => r[0].padEnd(12) + String(r[1]).padStart(3) + String(r[2]).padStart(6) + String(r[3]).padStart(4)).join('\n'));
