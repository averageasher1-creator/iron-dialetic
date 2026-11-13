/* IRON DIALECTIC — guided first campaign as the Republic of Cassine. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const UI = ID.UI, esc = ID.esc;
  const Tu = (ID.Tutorial = {});
  const $ = UI.$;

  /* Each step: title, text, do (the instruction), hl (selector to highlight), done(G) -> bool, or next: true for a Next button. */
  const STEPS = [
    { title: 'You run Cassine', text: 'A rich, divided liberal republic: banks, mills, a parliament, and a working class that does not share in much of it. The clock is stopped.', do: 'Drag the map to look around. Scroll or pinch to zoom. Click any land to see what it is.', next: true },
    { title: 'The state at a glance', hl: '#top .stats', text: 'Treasury, industry, food, people and troops on the left. Stability, legitimacy and authority on the right: these three decide whether you keep the country.', do: 'Hover any number on the top band to see what it is made of.', next: true },
    { title: 'Who holds power', hl: '#tab-gov', text: 'Every country has the same seven social forces. What differs is how much power each has under your system, and what it wants from you.', do: 'Open the State panel: click State on the left, or press G.', done: () => UI.tab === 'gov' },
    { title: 'Power and support', hl: '#drawer .fac', text: 'Each faction has a power share (how much it matters) and support (what it thinks of you). Stability rests on support weighted by power. In Cassine, Capital holds the most power; the Workers are the ones growing restless.', do: 'Hover the Workers to see exactly what is moving them.', next: true },
    { title: 'Where legitimacy comes from', hl: '#drawer .sec', text: 'A liberal republic justifies itself by elections and prosperity. Lose the vote and the opposition takes office: the country changes system and you go on playing it. Other ideologies lean on fervour, tradition, faith, victory or the Leader.', do: 'Read the Drift section below it: every regime slides toward something else.', next: true },
    { title: 'The economy is the ideology', hl: '#tab-eco', text: 'Cassine runs a market economy: you set a tax rate and private capital builds factories on its own when it is confident. A planned economy, a workers’ council or a corporatist pact would give you completely different levers.', do: 'Open the Economy panel (E).', done: () => UI.tab === 'eco' },
    { title: 'Laws', hl: '#tab-law', text: 'Laws on the press, police, land, labour, faith, trade and war each shift who supports you. Your parliament must vote for them, and censorship would also start hiding the true numbers from you.', do: 'Open the Laws panel (L), then hover a few options.', done: () => UI.tab === 'law' },
    { title: 'The hinterland', hl: '#b-expand', text: 'The pale, hatched land on the map belongs to no one. Every state is racing to claim it before the borders close. It costs troops, not a war, and every tile you take raises your population ceiling.', do: 'Close the panel (Esc), set Commit to about 30%, and press Expand on the bar at the bottom.', done: (G) => G.attacks.some((a) => a.from === G.player && a.to === 0) },
    { title: 'Start the clock', hl: '#b-pause', text: 'Time runs in days. Speeds 1 to 5; Space pauses. Dispatches will stop the clock when a decision is needed. Watch your columns push into the hinterland.', do: 'Press Space.', done: (G) => !G.paused },
    { title: 'Watch the frontier', hl: '#alerts', text: 'Alerts collect at the lower right. Click one to jump to the problem. Your neighbours have their own systems and their own ambitions.', do: 'Let a few months pass.', done: (G) => G.tut.war > 0 },
    { title: 'War', hl: '#atkbar', text: 'You are attacked. A defensive war needs no vote. Your troop pool defends every border at once; the denser it is, the more each tile costs the enemy. Artillery barrages, air raids and the reserves are on the bar too.', do: 'Click enemy land, set Commit to about 40%, and press Attack (or Enter). Then try a barrage on their line.', done: (G) => G.attacks.some((a) => a.from === G.player) },
    { title: 'The front', hl: '#modes', text: 'Your troops eat into their land tile by tile; rough terrain, rivers and fortresses slow them. Land cut off from its capital starves and surrenders with everyone in it.', do: 'Press B for the supply map, then Z to go back. Recall an offensive from the bar if it stalls.', next: true },
    { title: 'You are on your own', hl: '#tab-help', text: 'Win the war or make peace from the War panel. After that, the century is yours to lose. The Handbook (H) explains every system and all twenty-two ideologies. When the state falls, you will be told exactly why.', do: 'Good luck.', next: true, last: true },
  ];

  let lastStep = -1, hlEl = null, hlAt = 0;
  function clearHl() { if (hlEl) hlEl.classList.remove('hl'); hlEl = null; }
  Tu.start = function (G) { lastStep = -1; render(G); };
  function render(G) {
    const st = STEPS[G.tut.step]; const el = $('#coach');
    if (!st) { el.hidden = true; clearHl(); return; }
    el.className = G.tut.step >= 9 ? '' : '';
    el.innerHTML = '<div class="k">LEARNING TO GOVERN<span>' + (G.tut.step + 1) + ' / ' + STEPS.length + '</span></div><div class="bd"><h3>' + esc(st.title) + '</h3><p>' + esc(st.text) + '</p><p class="do">' + esc(st.do) + '</p><div class="row">' +
      (st.next ? UI.btn(st.last ? 'Finish' : 'Next', 'tutNext', null, { cls: 'red' }) : '<span class="dim" style="font-size:14px">Do this to continue.</span>') + '<span class="sp"></span>' + UI.btn('Skip tutorial', 'tutSkip', null, { cls: 'sm ghost' }) + '</div></div>';
    el.hidden = false; lastStep = G.tut.step;
  }
  UI.acts.tutNext = () => { const G = UI.G; if (!G || !G.tut) return; if (STEPS[G.tut.step] && STEPS[G.tut.step].last) { UI.acts.tutSkip(); return; } G.tut.step++; render(G); };
  UI.acts.tutSkip = () => { const G = UI.G; if (!G) return; G.tut = null; $('#coach').hidden = true; clearHl(); UI.toast('Tutorial closed. The Handbook (H) has everything it covered.', true); };

  function provokeWar(G) {
    const me = G.nations[G.player]; let best = null;
    for (const k in G.border[me.id] || {}) { const o = G.nations[+k]; if (o.alive && !ID.atWar(G, me.id, o.id) && (!best || ID.Diplomacy.power(o) < ID.Diplomacy.power(best))) best = o; }
    if (!best) { G.tut.war = 1; return; }
    best.troops *= 0.75; best.a.grace = 0;
    ID.Diplomacy.startWar(G, best, me, 'claims');
    G.tut.war = best.id; G.paused = true;
    UI.sel = best.capital; ID.Render.selected = best.capital; ID.Render.focus(best.capital);
    UI.toast(best.name + ' has declared war on you.');
  }

  Tu.frame = function (G, dt) {
    if (!G.tut) return;
    const st = STEPS[G.tut.step]; if (!st) { G.tut = null; $('#coach').hidden = true; clearHl(); return; }
    if (G.tut.step >= 9 && !G.tut.war && G.tick - G.tut.t0 > 150) provokeWar(G);
    if (st.done && st.done(G)) { G.tut.step++; ID.Audio.play('good'); render(G); return; }
    if (lastStep !== G.tut.step || $('#coach').hidden) render(G);
    hlAt += dt;
    if (hlAt > 0.3) {
      hlAt = 0; const want = st.hl ? document.querySelector(st.hl) : null;
      if (want !== hlEl) { clearHl(); if (want) { want.classList.add('hl'); hlEl = want; } }
      else if (hlEl && !hlEl.classList.contains('hl')) hlEl.classList.add('hl');
    }
    $('#coach').classList.toggle('right', !!UI.tab);
  };
})();
