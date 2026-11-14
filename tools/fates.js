'use strict';
const path = require('path'); const root = path.join(__dirname, '..', 'js'); globalThis.ID = {};
for (const f of ['core/util', 'data/base', 'data/ideologies', 'data/names', 'data/events', 'data/focus', 'data/destiny', 'data/expand', 'sim/mapgen', 'sim/world', 'sim/combat', 'sim/economy', 'sim/politics', 'sim/diplomacy', 'sim/events', 'sim/focus', 'sim/ai', 'sim/game']) require(path.join(root, f + '.js'));
const ID = globalThis.ID;
const want = (process.argv[2] || 'ansyn,agrarian,council,ancom,natpop,minarchy,mao,trot').split(',');
const seeds = [1, 7920, 15839, 23758, 31677, 39596];
for (const seed of seeds) {
  const G = ID.newGame({ seed, scenario: 'random', headless: true });
  const watch = ID.alive(G).filter((n) => want.includes(n.ideo)).map((n) => ({ n, ideo: n.ideo, done: false }));
  if (!watch.length) continue;
  const YRS = +(process.argv[3] || 30);
  while (G.tick < YRS * 360 && !G.over) {
    ID.Game.tick(G);
    for (const w of watch) {
      if (w.done) continue;
      if (!w.n.alive || w.n.ideo !== w.ideo) {
        w.done = true;
        const rel = G.chronicle.filter((c) => (c.a === w.n.id || c.b === w.n.id) && G.tick - c.t < 2000).slice(-5).map((c) => '      ' + ID.dateOf(c.t).short + ' ' + c.text).join('\n');
        console.log(`seed ${seed} ${w.n.base} (${w.ideo}, ${w.n.sit}) ended ${ID.dateOf(G.tick).short}: ${w.n.alive ? 'became ' + w.n.ideo : 'DEAD'} stab ${Math.round(w.n.stab)} legit ${Math.round(w.n.legit)}\n${rel}`);
      }
    }
  }
  for (const w of watch) if (!w.done) console.log(`seed ${seed} ${w.n.base} (${w.ideo}, ${w.n.sit}) SURVIVED tiles ${w.n.startTiles}->${w.n.tiles} stab ${Math.round(w.n.stab)}`);
}
