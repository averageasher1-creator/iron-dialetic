/* Headless runs of The Two Continents with historical mode on or off.
   node tools/history.js [--runs 3] [--years 66] [--free] [--verbose] [--start 1910]
   Prints which story beats fired, which programmes each country completed, and how the world ended. */
'use strict';
const path = require('path');
const root = path.join(__dirname, '..', 'js');
globalThis.ID = {};
for (const f of ['core/util', 'data/base', 'data/ideologies', 'data/names', 'data/events', 'data/fortune', 'data/focus', 'data/destiny', 'data/expand', 'sim/mapgen', 'sim/world', 'sim/combat', 'sim/economy', 'sim/politics', 'sim/diplomacy', 'sim/events', 'sim/focus', 'sim/ai', 'sim/game']) require(path.join(root, f + '.js'));
const ID = globalThis.ID;
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : d; };
const runs = +arg('runs', 3), years = +arg('years', 66), start = +arg('start', 1910);
const free = process.argv.includes('--free'), verbose = process.argv.includes('--verbose');
const agg = { beats: {}, foci: {}, wars: 0, top: [], alive: [], ideo: {}, dest: {} };
for (let r = 0; r < runs; r++) {
  const t0 = Date.now();
  const G = ID.newGame({ scenario: 'meridia', headless: true, difficulty: 'iron', historical: !free, startYear: start });
  G.rng.s = (G.rng.s ^ (r * 2654435761)) >>> 0;
  const end = (1910 + years - ID.START_YEAR) * 360;
  try {
    while (G.tick < end && !G.over) ID.Game.tick(G);
  } catch (e) { console.log('CRASH at', ID.dateOf(G.tick).str, e.stack); process.exit(1); }
  const ch = G.chronicle, cnt = (t) => ch.filter((c) => c.type === t).length;
  agg.wars += cnt('war');
  const fired = G.story ? Object.keys(G.story.done).filter((k) => G.story.done[k] === 1) : [];
  for (const k of fired) agg.beats[k] = (agg.beats[k] || 0) + 1;
  const al = ID.alive(G); let big = al[0];
  for (const n of al) if (n.tiles > big.tiles) big = n;
  agg.top.push(big.tiles / G.landCount); agg.alive.push(al.length);
  for (const n of G.nations) if (n && n.path) for (const id in n.path.done) agg.foci[id] = (agg.foci[id] || 0) + 1;
  console.log(`run ${r}: ${Date.now() - t0}ms end ${ID.yearOf(G.tick)} alive ${al.length} wars ${cnt('war')} civil ${cnt('civilwar')} conquests ${cnt('conquest')} beats ${fired.length}/${ID.STORY.length} top ${big.base}(${big.ideo}) ${(big.tiles / G.landCount * 100).toFixed(0)}%`);
  if (verbose) {
    for (const c of ch) if (c.type === 'ideology' || c.type === 'war' || c.type === 'civilwar' || c.type === 'conquest' || c.type === 'focus' || c.type === 'bloc' || c.type === 'destiny') console.log('   ' + ID.dateOf(c.t).short.padEnd(9) + c.text);
    console.log('   end: ' + al.map((n) => n.base + ':' + n.ideo + ':' + (n.tiles / G.landCount * 100).toFixed(0) + '%').join(' '));
  }
  for (const n of al) agg.ideo[n.base] = (agg.ideo[n.base] || []).concat(n.ideo);
  for (const c of ch) if (c.type === 'destiny') { const k = c.text.split(': ').pop().replace('.', ''); agg.dest[k] = (agg.dest[k] || 0) + 1; }
}
const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
console.log('\n== ' + (free ? 'free' : 'historical') + ' mode, ' + runs + ' runs ==');
console.log('avg wars', (agg.wars / runs).toFixed(1), '| avg alive', avg(agg.alive).toFixed(1), '| top share', (avg(agg.top) * 100).toFixed(0) + '%');
console.log('story beats fired:', ID.STORY.map((b) => b.id.replace('st_', '') + ':' + (agg.beats[b.id] || 0)).join(' '));
const nat = Object.keys(agg.foci).filter((k) => !k.startsWith('g_')).sort();
console.log('national programmes completed:', nat.map((k) => k + ':' + agg.foci[k]).join(' '));
console.log('general programmes completed:', Object.keys(agg.foci).filter((k) => k.startsWith('g_')).sort().map((k) => k.replace('g_', '') + ':' + agg.foci[k]).join(' '));
console.log('destinies reached:', Object.keys(agg.dest).map((k) => k + ' ×' + agg.dest[k]).join(', ') || 'none');
console.log('final regimes:', Object.keys(agg.ideo).map((b) => b + '=' + agg.ideo[b].join('/')).join(' '));
