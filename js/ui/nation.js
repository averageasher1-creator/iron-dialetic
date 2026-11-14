/* IRON DIALECTIC — the Nation screen (flag, motto, anthem, lore, spirits, destinies, annals) and
   superevents: the full-screen moments when a state reaches its destiny or history turns a page. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const UI = ID.UI, esc = ID.esc, acts = UI.acts;
  const tip = (h) => UI.tip(h);
  const P = () => UI.G.nations[UI.G.player];
  const S = (t, n) => ID.Focus.sub(t, n);
  const hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const bigFlag = (n) => '<span class="bigflag">' + ID.Flags.svg(n).replace(/var\(--bg\)/g, n.destiny && !n.destiny.lapsed && n.destiny.flag ? (n.destiny.flag.p === 'canton' || n.destiny.flag.p === 'stripes' ? n.destiny.flag.c || n.destiny.flag.a : n.destiny.flag.a) : hex(n.color)) + '</span>';
  const anthemSeed = (n) => n.base + ':' + ID.ideo(n).family + (n.destiny && !n.destiny.lapsed ? ':' + n.destiny.id : '');

  /* ---------------------------------------------------------------- the Nation screen */
  function destState(G, n, f) {
    if (n.destiny && n.destiny.id === f.id) return n.destiny.lapsed ? ['lapsed', 'Reached, then lost when the regime changed'] : ['reached', 'Reached ' + ID.dateOf(n.destiny.t).short];
    const p = ID.Focus.ensure(n);
    if (f.excl && f.excl.some((x) => p.done[x] != null)) return ['closed', 'Closed by an earlier choice'];
    if (n.destiny && !n.destiny.lapsed) return ['closed', 'Another destiny was chosen'];
    const why = ID.Focus.block(G, n, f, true);
    return why ? ['open', why] : ['ready', 'Can be started now'];
  }
  function nationHtml(G, n) {
    const I = ID.ideo(n), id = ID.identityOf(G, n);
    const nat = ID.Focus.trees(n).find((t) => t.key === 'nat');
    const dests = nat ? nat.list.filter((f) => f.dest) : [];
    const ep = (n.epithets || []).map((e) => '<span class="epi">' + esc(e.t) + '</span>').join('');
    const playing = ID.Audio.anthemPlaying && ID.Audio.anthemPlaying();
    let h = '<div class="dlg xwide nation"><div class="dhd"><div class="k">THE NATION</div><div class="d">' + ID.dateOf(G.tick).str + '</div><button class="x" data-act="closeModal"' + tip('Close (Esc)') + '>✕</button></div>';
    h += '<div class="nhero" style="--nc:' + hex(n.color) + '">' + bigFlag(n) + '<div class="nh"><h1>' + esc(n.name) + '</h1>' + (ep ? '<div class="epis">' + ep + '</div>' : '') +
      '<div class="motto">“' + esc(id.motto) + '”</div><div class="nmeta">' + esc(I.name) + ' · ' + esc((n.leader.title ? n.leader.title + ' ' : '') + n.leader.name) + '</div>' +
      '<button class="anth' + (playing ? ' on' : '') + '" data-act="anthem"' + tip('Every state has its own anthem, written from its name and its creed. It changes when the regime does.') + '>' + (playing ? '■ Stop' : '▶ Play the anthem') + ': <i>' + esc(id.anthem) + '</i></button></div></div>';
    h += '<div class="dbd ncols"><div>';
    h += '<div class="sec"><h3>The country</h3><p class="lore">' + esc(id.lore) + '</p></div>';
    if (id.spirits && id.spirits.length) h += '<div class="sec"><h3>National spirit</h3>' + id.spirits.map((s) => '<div class="spirit"><b>' + esc(s.name) + '</b><span>' + esc(s.desc) + '</span><div class="fxl">' + UI.fxHtml(s.fx, n) + '</div></div>').join('') + '</div>';
    const annals = G.chronicle.filter((c) => c.a === n.id || c.b === n.id).slice(-9).reverse();
    h += '<div class="sec"><h3>Annals</h3>' + (annals.length ? '<div class="chron">' + annals.map((c) => '<div><span>' + ID.dateOf(c.t).short + '</span><span>' + esc(c.text) + '</span></div>').join('') + '</div>' : '<p class="dim">History has not noticed you yet.</p>') + '</div>';
    h += '</div><div>';
    if (dests.length) {
      h += '<div class="sec"><h3>Destinies<small>' + dests.length + '</small></h3><p class="dim" style="font-size:13.5px;margin-bottom:8px">Each path through the programme ends in a destiny. You can reach one. Reaching it renames the state and raises a new flag.</p>';
      for (const f of dests) {
        const [st, why] = destState(G, n, f), d = f.dest;
        const shown = st === 'reached' || st === 'lapsed';
        h += '<div class="dcard ' + st + '"' + tip('<h5>' + esc(ID.Focus.nm(f, n)) + '</h5>' + esc(S(f.desc, n)) + '<hr>' + esc(why)) + '><div class="dflag">' + ID.Flags.html({ id: -1, ideo: n.ideo, base: f.id, color: n.color, destiny: { id: f.id, flag: d.flag } }, '') + '</div><div><b>' + esc(S(d.name, n)) + '</b><small>' + esc(ID.Focus.nm(f, n)) + ' · ' + esc(why) + '</small>' +
          (shown ? '<q>' + esc(S(d.quote, n)) + '</q>' : '<i>“' + esc(S(d.motto, n)) + '”</i>') + '</div></div>';
      }
      h += '<button class="b" data-act="tree" data-a=\'"nat"\' style="margin-top:6px">Open the programme tree</button></div>';
    }
    h += '</div></div></div>';
    return h;
  }
  acts.nation = () => { UI.modal(nationHtml(UI.G, P()), 'nation'); UI.retip(); ID.Audio.play('click'); };
  acts.anthem = () => {
    const n = P(); ID.Audio.unlock();
    if (ID.Audio.anthemPlaying()) ID.Audio.stopAnthem(); else ID.Audio.anthem(anthemSeed(n), ID.ideo(n).family);
    if (UI.modalKind === 'nation') { UI.modal(nationHtml(UI.G, n), 'nation'); UI.retip(); }
  };

  /* ---------------------------------------------------------------- superevents */
  const flagSvg = (n) => ID.Flags.svg(n).replace(/var\(--bg\)/g, n.destiny && !n.destiny.lapsed && n.destiny.flag ? (n.destiny.flag.p === 'canton' || n.destiny.flag.p === 'stripes' ? n.destiny.flag.c || n.destiny.flag.a : n.destiny.flag.a) : hex(n.color));
  let superNo = 0;
  UI.showSuper = function () {
    const G = UI.G, s = G.superq[0]; if (!s) return;
    superNo++;
    const when = ID.dateOf(G.tick), no = 'No. ' + String(1000 + ((G.tick * 7 + superNo * 131) % 9000));
    let h = '';
    if (s.kind === 'destiny') {
      const n = G.nations[s.nation], f = ID.Focus.def(s.focus);
      if (!n || !f || !f.dest) { G.superq.shift(); return; }
      const d = f.dest, nm = S(d.name, n);
      const lum = (c) => (c && c[0] === '#' ? parseInt(c.substr(1, 2), 16) * 0.3 + parseInt(c.substr(3, 2), 16) * 0.59 + parseInt(c.substr(5, 2), 16) * 0.11 : 0);
      const fc = d.flag ? (lum(d.flag.a) > 70 ? d.flag.a : d.flag.b || d.flag.e || d.flag.a) : hex(n.color);
      const art = ID.Scene.svg(d.art || 'parliament', f.id, { n: fc, flag: fc, war: d.war });
      h = '<div class="super dest"><div class="splate">' +
        '<div class="shead"><span class="skick">Destiny</span><span class="sdate">' + esc(n.adj) + ' · ' + esc(when.str) + '</span><span class="sp"></span><span class="sno">' + no + '</span></div>' +
        '<h1>' + esc(ID.Focus.nm(f, n)) + '</h1>' +
        '<div class="sframe">' + art + '<div class="sflagw">' + flagSvg(n) + '</div></div>' +
        '<div class="sbody"><div class="sname">' + esc(nm) + '</div><div><blockquote>' + esc(S(d.quote, n)) + '</blockquote><cite>' + esc(S(d.by, n)) + '</cite><p>' + esc(S(d.text, n)) + '</p></div>' +
        '<div class="sside"><div class="smotto">' + esc(S(d.motto, n)) + '</div><button class="b red big" data-act="superOk">Long live the ' + esc(nm) + '</button></div></div></div></div>';
      UI.modal(h, 'super');
      ID.Audio.unlock(); ID.Audio.anthem(anthemSeed(n), ID.ideo(n).family);
    } else {
      const b = ID.Story.beat(s.id); if (!b || !b.sup) { G.superq.shift(); return; }
      const me = G.nations[G.player];
      const art = ID.Scene.svg(b.sup.art || 'war', b.id, { n: me ? hex(me.color) : '#8a2a20', war: 1 });
      h = '<div class="super hist"><div class="splate">' +
        '<div class="shead"><span class="skick">History</span><span class="sdate">' + esc(when.str) + '</span><span class="sp"></span><span class="sno">' + no + '</span></div>' +
        '<h1>' + esc(b.title) + '</h1><div class="sframe">' + art + '</div>' +
        '<div class="sbody"><div><blockquote>' + esc(b.sup.quote) + '</blockquote><cite>' + esc(b.sup.by) + '</cite><p>' + esc(b.sup.text) + '</p></div>' +
        '<div class="sside"><button class="b red big" data-act="superOk">' + esc(b.sup.ok || 'So it begins') + '</button></div></div></div></div>';
      UI.modal(h, 'super');
      ID.Audio.play(b.sup.sound || 'era'); if (ID.Music && ID.Music.sting) ID.Music.sting('war');
    }
    if (ID.Render && ID.Render.shake) ID.Render.shake(5);
  };
  acts.superOk = () => { const G = UI.G; if (G.superq && G.superq.length) G.superq.shift(); ID.Audio.play('stamp'); UI.closeModal(); };
})();
