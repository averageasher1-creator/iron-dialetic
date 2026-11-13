/* Passive-player soak test: take each nation, never touch a lever, answer dispatches at random.
   node tools/soak.js [meridia|random] [difficulty] [auto] [hist]   ('auto' lets the AI play the player's nation instead; 'hist' turns on historical mode) */
'use strict';
const path = require('path'); const root = path.join(__dirname, '..', 'js'); globalThis.ID = {};
for (const f of ['core/util', 'data/base', 'data/ideologies', 'data/names', 'data/events', 'data/focus', 'data/destiny', 'sim/mapgen', 'sim/world', 'sim/combat', 'sim/economy', 'sim/politics', 'sim/diplomacy', 'sim/events', 'sim/focus', 'sim/ai', 'sim/game']) require(path.join(root, f + '.js'));
const ID = globalThis.ID;
const scen = process.argv[2] || 'meridia', diff = process.argv[3] || 'iron', auto = process.argv.includes('auto'), hist = process.argv.includes('hist');
const base = ID.newGame({ seed: 5, scenario: scen, headless: true });
const ids = ID.alive(base).map((n) => n.id);
for (const id of ids) {
  const G = ID.newGame({ seed: 5, scenario: scen, headless: true, difficulty: diff, historical: hist });
  ID.setPlayer(G, id); G.autoPlayer = auto; const n = G.nations[id]; const name = n.base, start = n.ideo;
  const rng = new ID.RNG(id * 99);
  while (!G.over && ID.yearOf(G.tick) < 1976) {
    ID.Game.tick(G);
    while (G.evq.length) { const e = G.evq[0]; const def = ID.Events.def(e.id); const opts = ID.Events.options(G, G.nations[e.n], def, e.ctx); ID.Events.choose(G, Math.floor(rng.next() * opts.length)); }
  }
  const p = G.nations[G.player];
  const o = G.over;
  console.log(name.padEnd(9), start.padEnd(11), '->', (p.ideo + (p.id !== id ? '(switched)' : '')).padEnd(13), o ? (o.result + ' ' + o.type + ' ' + o.year + (o.pm ? ' | ' + o.pm.head + (o.pm.turned ? ' / ' + o.pm.fname : '') : '')) : 'survived to 1976 rank #' + ID.rankOf(G, p, 'score') + ' land ' + Math.round(p.tiles / G.landCount * 100) + '%');
}
