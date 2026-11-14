'use strict';
const path = require('path'); const root = path.join(__dirname, '..', 'js'); globalThis.ID = {};
for (const f of ['core/util', 'data/base', 'data/ideologies', 'data/names', 'data/events', 'data/focus', 'data/destiny', 'data/expand', 'sim/mapgen', 'sim/world', 'sim/combat', 'sim/economy', 'sim/politics', 'sim/diplomacy', 'sim/events', 'sim/focus', 'sim/ai', 'sim/game']) require(path.join(root, f + '.js'));
const ID = globalThis.ID;
const seed = +(process.argv[2] || 5), yrs = +(process.argv[3] || 12), scen = process.argv[4] || 'meridia';
const G = ID.newGame({ seed, scenario: scen, headless: true });
const r = (v) => String(Math.round(v)).padStart(3);
function dump() {
  console.log('--- ' + ID.dateOf(G.tick).str + ' depression ' + G.world.depression + ' tension ' + Math.round(G.world.tension));
  console.log('name        ideo        tiles  pop   trp  gold  gdp  rev  net  ls stab leg  W  P  C  M  Cl I  B | unr opp coup%  we corr bur dist conf eff | drift');
  for (const n of ID.alive(G)) {
    const f = n.fs;
    console.log(n.base.padEnd(11), n.ideo.padEnd(11), String(n.tiles).padStart(5), r(n.pop / 100).padStart(4), r(n.troops).padStart(5), r(n.gold).padStart(5), r(n.gdp).padStart(4), r(n.rev).padStart(4), r(n.net).padStart(4), r(n.ls), r(n.stab), r(n.legit), r(f.workers), r(f.peasants), r(f.capital), r(f.military), r(f.clergy), r(f.intelligentsia), r(f.bureaucracy), '|', r(n.a.unrest || 0), r(n.a.opp || 0), (n.coupRisk * 100).toFixed(1).padStart(5), r(n.we), r(n.corr), r(n.bureau), r(n.dist), r(n.conf), n.eff.toFixed(2), '|', Object.keys(n.drift).map((k) => k + ':' + Math.round(n.drift[k])).join(' '), n.nwars ? 'WAR' + n.nwars : '', n.famine ? 'FAMINE' : '', n.depression ? 'DEP' : '', 'fb' + n.foodBal.toFixed(2), 'f' + n.nb[4] + 'c' + n.nb[1]);
  }
}
dump();
while (G.tick < yrs * 360 && !G.over) { ID.Game.tick(G); if (G.tick % (360 * 6) === 0) dump(); }
console.log(G.chronicle.slice(-40).map((c) => ID.dateOf(c.t).short + ' ' + c.text).join('\n'));
