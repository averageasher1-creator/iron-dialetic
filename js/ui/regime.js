/* IRON DIALECTIC — the Regime panel (key I): the people around the ruler, the line set at the last
   session, and (in historical campaigns) the country's national question. Also its alerts and Report items. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const UI = ID.UI, esc = ID.esc, Pn = ID.Panels, acts = UI.acts, Rg = ID.Regime;
  const tip = (h) => UI.tip(h);
  const sec = (title, body, small) => '<div class="sec"><h3>' + title + (small ? '<small>' + small + '</small>' : '') + '</h3>' + body + '</div>';
  const fxSpans = (L) => L.map((x) => '<span class="' + (x.good ? 'good' : 'bad') + '">' + esc(x.t) + '</span>').join('');
  const costTxt = (c) => [c.auth ? c.auth + ' authority' : '', c.gold ? c.gold + ' gold' : ''].filter(Boolean).join(', ') || 'no cost';
  const P = () => UI.G.nations[UI.G.player];
  const stars = (c) => '★★★'.slice(0, Math.max(1, Math.round(c))) + '<span class="dim">' + '★★★'.slice(Math.max(1, Math.round(c))) + '</span>';
  const ideoTag = (k) => { const I = ID.IDEOLOGIES[k]; return I ? '<span class="itag"><i style="background:' + I.css + '"></i>' + esc(I.name) + '</span>' : ''; };

  function figCard(G, n, f) {
    const how = Rg.canPurge(n), plot = f.plot >= 3, own = f.lean === n.ideo;
    const e = ID.Doctrine.describe(Rg.figFx(n, f));
    const tags = (f.heir ? '<span class="rgf-t heir">Heir</span>' : '') + (plot ? '<span class="rgf-t plot">Plotting</span>' : f.loy < 32 && f.amb > 58 ? '<span class="rgf-t warn">Restless</span>' : '') + (f.k ? '' : '');
    const btn = (label, act, arg, o) => UI.btn(label, act, arg, Object.assign({ cls: 'sm ghost' }, o));
    return '<div class="rgf' + (plot ? ' plot' : f.heir ? ' heir' : '') + '"><div class="rgf-h"><span class="rgf-s">' + esc(Rg.title(n, f.seat)) + '</span>' + tags + '</div>' +
      '<div class="rgf-n"><b>' + esc(f.name) + '</b><span class="dim">' + f.age + '</span><span class="rgf-c"' + tip('Competence ' + f.comp.toFixed(1) + ' of 3: how much this seat does for you.') + '>' + stars(f.comp) + '</span></div>' +
      '<div class="rgf-l">' + (own ? '<span class="dim">Loyal to the system</span>' : '<span' + tip('Pulls the regime toward this ideology every month, and wants the line to go that way.') + '>Leans ' + ideoTag(f.lean) + '</span>') + '</div>' +
      '<div class="rgf-b"><span' + tip('Loyalty. Below 30 the seat works against you; below 32 with high ambition a plot grows.') + '>Loyalty</span>' + UI.bar(f.loy, 100, f.loy < 32 ? 'r' : f.loy < 50 ? 'o' : 'g') + '<b>' + Math.round(f.loy) + '</b>' +
      '<span' + tip('Ambition. The ambitious plot when they are disloyal, and expect to rise when they are not.') + '>Ambition</span>' + UI.bar(f.amb, 100, 's') + '<b>' + Math.round(f.amb) + '</b></div>' +
      (e.length ? '<div class="rgf-x">' + fxSpans(e) + '</div>' : '') +
      '<div class="rgf-a">' +
      btn('Win over <span>' + Rg.costOf(n, 'win', f).gold + 'g</span>', 'rgWin', f.seat, { off: Rg.block(G, n, 'win', f.seat), tip: 'Favours, money and a seat at the top table. Loyalty +22.' }) +
      (ID.ideo(n).control.type === 'parliament' ? '' : btn('Name heir <span>10 auth</span>', 'rgHeir', f.seat, { off: Rg.block(G, n, 'heir', f.seat), tip: 'This person succeeds when the ruler dies or falls. Loyalty +15; the other ambitious lose 10.' })) +
      btn(ID.REGIME.purgeName[how] + ' <span>' + Rg.costOf(n, 'purge', f).auth + ' auth</span>', 'rgPurge', f.seat, { cls: 'sm ' + (plot ? 'red' : 'ghost'), off: Rg.block(G, n, 'purge', f.seat), tip: '<h5>' + ID.REGIME.purgeName[how] + ' ' + esc(f.name) + '</h5>' + esc(ID.REGIME.purgeDesc[how]) + (f.comp >= 2.4 ? '<hr>A capable person: the seat will be weaker for two years.' : '') }) +
      '</div></div>';
  }

  function sessionCard(G, n) {
    const B = Rg.body(n), L = Rg.line(n);
    let h = '<div class="rgs"><div class="rgs-h"><b>' + esc(B.session) + '</b><span class="dim">every ' + Math.round(B.every / 12) + ' years · next ' + ID.dateOf(n.sess.next).short + '</span></div>';
    if (L) {
      h += '<div class="rgs-l"><span class="k">The line</span><b>' + esc(L.name) + '</b>' + (L.lean !== n.ideo ? ' ' + ideoTag(L.lean) : '') + '</div><p>' + esc(L.desc) + '</p><div class="rgf-x">' + fxSpans(ID.Doctrine.describe(L.mods)) + (L.sig ? '<span class="' + (L.sig > 0 ? 'good' : 'bad') + '">' + esc(ID.Doctrine.of(n) ? ID.Doctrine.of(n).gauge : 'Gauge') + ' ' + (L.sig > 0 ? '+' : '−') + Math.abs(L.sig) + ' a month</span>' : '') + '</div>';
    } else h += '<p class="dim">No line has been set since the regime took power. The next session will set one.</p>';
    h += '<div class="row">' + UI.btn('Convene it now <span>25 auth</span>', 'rgConvene', null, { cls: 'sm ghost', off: Rg.convokeBlock(G, n), tip: 'Call an extraordinary session and choose a new line.' }) + '</div></div>';
    return h;
  }

  function nqCard(G, n) {
    const Q = Rg.Q(G, n); if (!Q) return '';
    const v = Math.round(n.nq.v), fx = n.nq.lastFx || {};
    const L = ID.Doctrine.describe(fx);
    let h = '<div class="rgq"><div class="rgq-h"><span class="k">' + esc(n.adj) + ' question</span><b>' + esc(Q.name) + '</b></div><p>' + esc(Q.desc) + '</p>';
    h += '<div class="rgq-g"><span>' + esc(Q.low) + '</span><div class="rgq-b"><i style="left:' + v + '%"></i>' + (Q.loAt ? '<u style="left:' + Q.loAt + '%"></u>' : '') + (Q.hiAt ? '<u style="left:' + Q.hiAt + '%"></u>' : '') + '</div><span>' + esc(Q.high) + '</span></div>';
    h += '<div class="rgq-v"><b>' + v + '</b>' + (n.nq.bunkers ? ' <span class="dim">· ' + n.nq.bunkers + ' lines of bunkers</span>' : '') + '<span class="dim"> · the marks are turning points</span></div>';
    if (L.length) h += '<div class="rgf-x">' + fxSpans(L) + '</div>';
    h += '<div class="dcacts">' + Q.acts.map((a) => UI.btn(esc(a.name) + ' <span>' + costTxt(a.cost || {}) + '</span>', 'nqAct', a.id, { cls: 'sm', off: Rg.nqBlock(G, n, a), tip: '<h5>' + esc(a.name) + '</h5>' + esc(a.desc) + '<hr>' + (a.dv ? '<b>' + (a.dv > 0 ? 'Toward “' + esc(Q.high) + '”' : 'Toward “' + esc(Q.low) + '”') + ' ' + Math.abs(a.dv) + '</b> ' : '') + UI.fxHtml(a.fx, n).replace(/<\/span>/g, '</span> ') + '<hr><span class="dim">Again after ' + (a.cd >= 24 ? Math.round(a.cd / 12) + ' years' : a.cd + ' months') + '</span>' })).join('') + '</div></div>';
    return h;
  }

  Pn.reg = function (G, n) {
    Rg.ensure(G, n);
    const B = Rg.body(n), heir = Rg.heir(n);
    let h = UI.leaderLine(G, n);
    h += '<p class="lead">' + (B.circle === 'Cabinet' || B.circle === 'Privy Council' ? 'The people who run your government. ' : 'The people who really run the country. ') + 'Each seat works for you in proportion to its holder’s competence and loyalty; a disloyal holder works against you, and an ambitious one plots. ' + (heir ? '<b>' + esc(heir.name) + '</b> is the named heir.' : ID.ideo(n).control.type === 'parliament' ? '' : 'There is no named heir: when the ruler goes, the strongest takes over.') + '</p>';
    h += Rg.SEATS_ORDER.map((s) => { const f = Rg.fig(n, s); return f ? figCard(G, n, f) : ''; }).join('');
    h += sec('The line', sessionCard(G, n));
    if (n.nq) h += sec('The national question', nqCard(G, n));
    return h;
  };
  Rg.SEATS_ORDER = ['army', 'police', 'economy', 'ideology', 'foreign'];

  acts.rgPurge = (s) => { const G = UI.G; if (UI.tryDo(Rg.purge(G, P(), s))) UI.after(); };
  acts.rgWin = (s) => { const G = UI.G; if (UI.tryDo(Rg.winOver(G, P(), s))) UI.after(); };
  acts.rgHeir = (s) => { const G = UI.G; if (UI.tryDo(Rg.makeHeir(G, P(), s))) UI.after(); };
  acts.rgConvene = () => { const G = UI.G, n = P(), w = Rg.convokeBlock(G, n); if (!UI.tryDo(w)) return; n.auth -= 25; Rg.convene(G, n); UI.after(); };
  acts.nqAct = (id) => { const G = UI.G; if (UI.tryDo(Rg.nqRun(G, P(), id))) { UI.toast(Rg.nqAct(P(), id).name + '.', true); UI.after(); } };

  /* alerts */
  Rg.alerts = function (G, n, add) {
    if (!n.circle) return;
    for (const f of n.circle) if (f.plot >= 3) add('<b>' + esc(f.name) + '</b> is plotting', 'reg', true);
    const Q = Rg.Q(G, n);
    if (Q) { const v = n.nq.v; if ((Q.hiAt && v >= Q.hiAt - 8 && !n.nq.fired.hi) || (Q.loAt && v <= Q.loAt + 8 && !n.nq.fired.lo)) add('<b>' + esc(Q.name) + '</b> near a turning point', 'reg', false); }
  };
  /* Report items */
  Rg.advice = function (G, n, add) {
    if (!n.circle) return;
    for (const f of n.circle) if (f.plot >= 2 || (f.loy < 30 && f.amb > 58)) {
      const how = Rg.canPurge(n);
      add(f.plot >= 3 ? 80 : 56, esc(f.name) + (f.plot >= 3 ? ' is plotting' : ' is restless'), esc(Rg.title(n, f.seat)) + ', loyalty ' + Math.round(f.loy) + ', ambition ' + Math.round(f.amb) + '. ' + (f.seat === 'army' ? 'A disloyal army chief makes a coup easy.' : 'A disloyal seat works against you.') + (f.lean !== n.ideo ? ' ' + esc(ID.IDEOLOGIES[f.lean].name) + ' is what he wants.' : ''),
        [{ label: ID.REGIME.purgeName[how], act: 'rgPurge', arg: f.seat, off: Rg.block(G, n, 'purge', f.seat), cls: 'em' }, { label: 'Win over', act: 'rgWin', arg: f.seat, off: Rg.block(G, n, 'win', f.seat) }, { label: 'Regime', act: 'tab', arg: 'reg', cls: 'ghost' }]);
    }
    const Q = Rg.Q(G, n);
    if (Q) {
      const v = n.nq.v, hiNear = Q.hiAt && v >= Q.hiAt - 10 && !n.nq.fired.hi, loNear = Q.loAt && v <= Q.loAt + 10 && !n.nq.fired.lo;
      if (hiNear || loNear) add(58, esc(Q.name) + ': ' + Math.round(v), 'Close to “' + esc(hiNear ? Q.high : Q.low) + '”. When it gets there, a turning point comes whether you are ready or not.', Q.acts.filter((a) => (a.dv || 0) * (hiNear ? -1 : 1) > 0).map((a) => ({ label: a.name, act: 'nqAct', arg: a.id, off: Rg.nqBlock(G, n, a) })).concat([{ label: 'Regime', act: 'tab', arg: 'reg', cls: 'ghost' }]));
    }
  };
})();
