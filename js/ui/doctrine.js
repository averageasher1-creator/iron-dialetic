/* IRON DIALECTIC — doctrines and leaders in the interface: the doctrine card on the State panel,
   the leader line, the doctrine at war on the War panel, and the Doctrines handbook page. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const UI = ID.UI, esc = ID.esc, Pn = ID.Panels, acts = UI.acts, Dc = ID.Doctrine;
  const tip = (h) => UI.tip(h);
  const sec = (title, body, small) => '<div class="sec"><h3>' + title + (small ? '<small>' + small + '</small>' : '') + '</h3>' + body + '</div>';
  const fxSpans = (L) => L.map((x) => '<span class="' + (x.good ? 'good' : 'bad') + '">' + esc(x.t) + '</span>').join('');
  const costTxt = (c) => [c.auth ? c.auth + ' authority' : '', c.gold ? c.gold + ' gold' : ''].filter(Boolean).join(', ') || 'no cost';

  UI.traitTag = (k) => { const T = ID.TRAITS[k]; if (!T) return ''; const L = Dc.describe(T.fx); return '<span class="trait"' + tip('<h5>' + esc(T.name) + '</h5>' + esc(T.desc) + (L.length ? '<hr><div class="fx" style="display:flex;flex-wrap:wrap;gap:0 10px;font-weight:600">' + fxSpans(L) + '</div>' : '')) + '>' + esc(T.name) + '</span>'; };
  UI.leaderLine = function (G, n) {
    const L = n.leader; if (!L) return '';
    return '<div class="leader"><span class="lt">' + esc(L.title || 'Leader') + '</span><b>' + esc(L.name) + '</b><span class="dim">' + L.age + '</span>' + (L.traits || []).map(UI.traitTag).join('') + '</div>';
  };

  UI.doctrineCard = function (G, n) {
    const D = Dc.ensure(G, n); if (!D) return '';
    const v = Math.round(n.sig), tr = n.a.sigTrend || 0, I = ID.ideo(n);
    let fx = {}; try { fx = D.fx(n, n.sig, G) || {}; } catch (e) { fx = {}; }
    const L = Dc.describe(fx);
    const col = v < 30 ? 'r' : v < 45 ? 'o' : 'g';
    let h = '<div class="docard" style="--ic:' + I.css + '"><div class="dch"><span class="dck">Doctrine</span><b>' + esc(D.name) + '</b>' + (Dc.mastered(n) ? '<span class="dcm"' + tip('Mastered through the ideology’s programme: its benefits and war advantages are a third stronger.') + '>mastered</span>' : '') + '</div>';
    h += '<div class="dcg"' + tip('<h5>' + esc(D.gauge) + '</h5>' + esc(D.desc) + '<hr>Moving ' + (tr >= 0 ? 'up' : 'down') + ' by ' + Math.abs(tr).toFixed(1) + ' a month. Conditions push it; it also drifts back toward the middle, so a boost from an action fades over a year or two.') + '><span>' + esc(D.gauge) + '</span><b>' + v + '<small class="' + (tr > 0.15 ? 'good">▲' : tr < -0.15 ? 'bad">▼' : 'dim">–') + '</small></b>' + UI.bar(v, 100, col) + '</div>';
    h += '<p class="dcd">' + esc(D.desc) + '</p>';
    if (L.length) h += '<div class="dcfx">' + fxSpans(L) + '</div>';
    h += '<div class="dcn"><span>' + esc(D.low) + '</span><span>' + esc(D.high) + '</span></div>';
    if (n.ideo === 'absmon') { const f = n.sigx && ID.DOC_FAV[n.sigx.fav]; h += '<div class="dcfav">In favour at court: <b>' + (f ? esc(f.name) : 'no one in particular') + '</b>' + (f ? ' <span class="dim">' + fxSpans(Dc.describe(f.fx)) + '</span>' : '') + '</div>'; }
    h += '<div class="dcacts">' + D.acts.map((a) => {
      const why = Dc.actBlock(G, n, a), afx = UI.fxHtml(a.fx, n).replace(/<\/span>/g, '</span> ');
      return UI.btn(esc(a.name) + ' <span>' + costTxt(a.cost || {}) + '</span>', 'doctrine', a.id, { cls: 'sm', off: why, tip: '<h5>' + esc(a.name) + '</h5>' + esc(a.desc) + '<hr>' + (a.sig ? '<b class="' + (a.sig > 0 ? 'good' : 'bad') + '">' + esc(D.gauge) + ' ' + (a.sig > 0 ? '+' : '−') + Math.abs(a.sig) + '</b> ' : '') + afx + '<hr><span class="dim">Cost: ' + costTxt(a.cost || {}) + ' · again after ' + (a.cd >= 24 ? Math.round(a.cd / 12) + ' years' : a.cd + ' months') + '</span>' });
    }).join('') + '</div></div>';
    return h;
  };
  acts.doctrine = (id) => { const G = UI.G, n = G.nations[G.player]; if (UI.tryDo(Dc.run(G, n, id))) { UI.toast(Dc.act(id).name + '.', true); UI.after(); } };

  /* State panel: leader and doctrine below the system's one-line summary */
  const ogov = Pn.gov;
  Pn.gov = function (G, n) {
    const h = ogov(G, n), i = h.indexOf('</p>') + 4;
    return h.slice(0, i) + UI.leaderLine(G, n) + UI.doctrineCard(G, n) + h.slice(i);
  };

  /* War panel: the doctrine at war */
  const omil = Pn.mil;
  Pn.mil = function (G, n) {
    let h = omil(G, n);
    const D = Dc.of(n); if (!D) return h;
    const ab = Dc.orderOf(n);
    let w = '<div class="docard war" style="--ic:' + ID.ideo(n).css + '"><div class="dch"><span class="dck">At war</span><b>' + esc(D.war.name) + '</b></div><p class="dcd">' + esc(D.war.desc) + '</p>';
    if (ab) w += '<div class="dcord"><b>' + esc(ab.name) + '</b> <span class="dim">' + (ab.gold ? ID.Combat.abilGold(n, ab) + ' gold' : 'no cost') + ' · every ' + ID.Combat.abilCd(n, ab) + ' days · on the war bar</span><p>' + esc(ab.desc) + '</p></div>';
    w += '</div>';
    const k = h.indexOf('<div class="sec"><h3>Doctrine');
    h = h.replace('<h3>Doctrine', '<h3>Attack styles');
    return k >= 0 ? h.slice(0, k) + sec(esc(ID.ideo(n).name) + ' at war', w) + h.slice(k) : h + sec('At war', w);
  };

  /* Handbook: every doctrine */
  Pn.helpDoc = function (G, n) {
    let h = '<div class="sec"><h3>The regime</h3><ul><li>Open the <b>Regime</b> panel (I). Five people hold the seats that matter: army, security, economy, ideology and foreign affairs. Each seat helps in proportion to its holder’s competence and loyalty; a disloyal holder works against you.</li><li>Holders have convictions. One who leans toward another ideology pulls the regime toward it, backs that line at the sessions and, if disloyal and ambitious, plots. A plot that is not dealt with ends in a coup from inside, and the plotter may bring his ideology with him.</li><li>Every system holds a regular <b>session</b> (a party congress, an imperial council, a government programme, a rally) that sets the line for the years ahead. You can call one early.</li><li>When a ruler dies or falls, the named heir takes over, or else the strongest member of the circle.</li><li>In historical campaigns each country also has its own cast, its own <b>national question</b> with two poles and turning points at each end, and a national project in its programme that pulls the question one way or the other.</li></ul></div>' +
      '<p class="lead">Every system of government plays differently. Each has a <b>doctrine</b>: a gauge with its own logic, actions only it can take, a way of fighting, and an order of its own on the war bar. The doctrine of your own system is on the State panel.</p>';
    h += '<ul><li>Conditions push the gauge every month; it also drifts back toward the middle, so the boost from an action fades over a year or two.</li><li>An ideology’s own programme can <b>master</b> its doctrine: its benefits and war advantages become a third stronger.</li><li>Leaders have <b>traits</b> that change their country and how it behaves. Every new leader rolls new ones.</li><li>An emergency draft from a war order never takes the army past 130% of its mobilisation ceiling.</li></ul>';
    for (const fam in ID.FAMILIES) {
      let fh = '';
      for (const I of ID.IDEO_LIST.filter((x) => x.family === fam)) {
        const D = ID.DOCTRINE[I.id]; if (!D) continue;
        const ab = D.order ? ID.Combat.ABIL[D.order.key] : null;
        fh += '<div class="card doch' + (n && n.ideo === I.id ? ' on' : '') + '"><div class="row nw"><span class="sw" style="background:' + I.css + ';margin:0"></span><b>' + esc(I.name) + '</b><span class="dim">· ' + esc(D.name) + '</span></div>' +
          '<p><b>' + esc(D.gauge) + '.</b> ' + esc(D.desc) + '</p>' +
          '<p class="dim">Actions: ' + D.acts.map((a) => esc(a.name)).join(' · ') + '</p>' +
          '<p><b>' + esc(D.war.name) + '.</b> ' + esc(D.war.desc) + (ab ? ' <b>Order: ' + esc(ab.name) + '.</b> ' + esc(ab.desc) : '') + '</p></div>';
      }
      h += sec(ID.FAMILIES[fam].name, fh);
    }
    h += sec('Leader traits', '<div class="traits">' + Object.keys(ID.TRAITS).map(UI.traitTag).join('') + '</div>');
    return h;
  };
})();
