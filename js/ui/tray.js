/* IRON DIALECTIC — the dispatch tray: ordinary dispatches wait beside the map while the game runs.
   Urgent ones (crises, history) still stop the clock. Left alone for three months, a dispatch is
   settled by the ministers (sim/game.js). */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const UI = ID.UI, esc = ID.esc, acts = UI.acts;
  const tip = (h) => UI.tip(h);
  let el = null, sig = '';
  const keyOf = (e) => e.id + ':' + e.t;

  UI.renderTray = function (force) {
    const G = UI.G; if (!G) return;
    G.trayEvents = UI.settings.trayEvents !== false;
    if (!el) { el = document.createElement('div'); el.id = 'tray'; document.getElementById('app').appendChild(el); }
    const T = (G.tray || []).filter((e) => { const n = G.nations[e.n]; return n && n.alive && ID.Events.def(e.id); });
    el.classList.toggle('shift', !!UI.tab);
    const coach = document.getElementById('coach');
    el.style.top = coach && !coach.hidden && coach.offsetHeight ? (coach.getBoundingClientRect().bottom + 12) + 'px' : '';
    const s = T.map(keyOf).join('|') + '#' + (UI.trayOpen || '') + '#' + Math.floor(G.tick / 6) + '#' + !!UI.tab;
    if (s === sig && !force) return; sig = s;
    if (!T.length) { el.innerHTML = ''; el.hidden = true; return; }
    el.hidden = false;
    const shown = T.slice(-3).reverse();
    let h = '';
    for (let i = 0; i < shown.length; i++) {
      const e = shown[i];
      const idx = G.tray.indexOf(e), n = G.nations[e.n], def = ID.Events.def(e.id), opts = ID.Events.options(G, n, def, e.ctx);
      const Tx = (v) => esc(ID.Events.txt(v, G, n, e.ctx));
      const left = Math.max(0, 90 - (G.tick - e.t)), open = UI.trayOpen === keyOf(e), slim = i > 0 && !open; // only the newest shows its choices
      h += '<div class="tcard' + (open ? ' open' : '') + (slim ? ' slim' : '') + '">' +
        '<div class="th"><span class="k">Dispatch</span><b>' + Tx(def.title) + '</b><button class="rd" data-act="trayOpen" data-a=\'"' + keyOf(e) + '"\'' + tip(open ? 'Fold the dispatch' : 'Read the dispatch') + '>' + (open ? '–' : 'Read') + '</button></div>' +
        (open ? '<p class="tt">' + Tx(def.text) + '</p>' : '') +
        (slim ? '' : '<div class="to">' + opts.map((o, k) => {
          const fx = typeof o.fx === 'function' ? [] : o.fx;
          return '<button class="b sm" data-act="trayPick" data-a="[' + idx + ',' + k + ']"' + tip('<h5>' + Tx(o.label) + '</h5>' + (o.tip ? Tx(o.tip) + '<hr>' : '') + '<div class="fx">' + UI.fxHtml(fx, n) + '</div>') + '>' + Tx(o.label) + '</button>';
        }).join('') + '</div>') +
        '<div class="tl"' + tip('If you do not answer, your ministers decide in ' + left + ' days.') + '><i style="width:' + ((left / 90) * 100).toFixed(1) + '%"></i></div></div>';
    }
    if (T.length > 3) h += '<div class="tmore">' + (T.length - 3) + ' more waiting</div>';
    el.innerHTML = h;
    UI.retip && UI.retip();
  };
  acts.trayPick = (a) => {
    const G = UI.G; if (!G || !G.tray || !G.tray[a[0]]) return;
    ID.Events.choose(G, a[1], a[0]); ID.Audio.play('stamp'); UI.trayOpen = null; sig = '';
    UI.renderTray(true); UI.after();
  };
  acts.trayOpen = (a) => { UI.trayOpen = UI.trayOpen === a ? null : a; UI.renderTray(true); };
})();
