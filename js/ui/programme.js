/* IRON DIALECTIC — the Programme panel, the programme tree, and the history timeline. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const UI = ID.UI, esc = ID.esc, Pn = ID.Panels, acts = UI.acts;
  const tip = (h) => UI.tip(h), btn = UI.btn;
  const P = () => UI.G.nations[UI.G.player];
  const sec = (title, body, small) => '<div class="sec"><h3>' + title + (small ? '<small>' + small + '</small>' : '') + '</h3>' + body + '</div>';
  const Fo = () => ID.Focus;

  const isHist = (G, f) => G.historical && f.hist && f.tree !== 'general';
  const NM = (f, n) => ID.Focus.nm(f, n), DS = (f, n) => ID.Focus.sub(f.desc || '', n);
  const destTag = (f) => (f.dest ? ' <span class="tag dest"' + tip('A destiny: the end of a path. It renames the state, raises a new flag and closes the other destinies.') + '>destiny</span>' : '');
  const destTip = (f, n) => (f.dest ? '<hr><b>Destiny.</b> The state becomes <b>' + esc(ID.Focus.sub(f.dest.name, n)) + '</b>.<br><i>“' + esc(ID.Focus.sub(f.dest.motto, n)) + '”</i>' : '');
  const histTag = (G, f) => (isHist(G, f) ? ' <span class="tag hist"' + tip('The path this country took in history. Other countries follow theirs; you need not.') + '>as it happened</span>' : '');
  const gates = (f) => {
    const g = [];
    if (f.year) g.push('from ' + f.year);
    if (f.ideos) g.push(f.ideos.map((i) => ID.IDEOLOGIES[i].name).join(' or ') + ' only');
    if (f.repeat) g.push('repeatable every ' + f.repeat + ' years');
    return g.join(' · ');
  };
  function focusTip(G, n, f) {
    const why = Fo().block(G, n, f, true);
    return '<h5>' + esc(NM(f, n)) + '</h5>' + esc(DS(f, n)) + destTip(f, n) + '<hr><span class="dim">' + Fo().days(G, n, f) + ' days' + (gates(f) ? ' · ' + esc(gates(f)) : '') + '</span><div class="fx" style="display:flex;flex-wrap:wrap;gap:0 10px;font-weight:600;margin-top:4px">' + UI.fxHtml(f.fx, n) + '</div>' +
      (isHist(G, f) ? '<hr><span class="dim">This is what happened in history.</span>' : '') + (why && why !== 'Under way.' ? '<hr><b class="bad">' + esc(why) + '</b>' : '');
  }

  /* ---------------------------------------------------------------- panel */
  Pn.prog = function (G, n) {
    const F = Fo(), p = F.ensure(n), cur = F.current(n);
    let h = '';
    if (G.scenario === 'meridia') h += '<div class="note' + (G.historical ? ' ok' : '') + '">' + (G.historical
      ? '<b>Historical mode.</b> The events of the century arrive on their dates and the other powers walk the paths they took. Your choices can still bend it.'
      : '<b>Free mode.</b> No scripted history: every country picks its own programme.') + '</div>';
    if (cur) {
      const pr = F.progress(G, n), left = Math.max(0, p.end - G.tick);
      h += sec('Under way', '<div class="foc-cur"><h4>' + esc(NM(cur, n)) + histTag(G, cur) + destTag(cur) + '</h4><p>' + esc(DS(cur, n)) + '</p>' + UI.bar(pr, 1, 'r') +
        '<div class="row nw" style="margin-top:6px"><span class="dim" style="font-size:13.5px">' + left + ' days left · completes ' + ID.dateOf(p.end).short + '</span><span class="sp"></span>' + btn('Abandon', 'cancelFocus', null, { cls: 'sm ghost', tip: 'Stop this programme. The progress is lost.' }) + '</div>' +
        '<div class="fxl">' + UI.fxHtml(cur.fx, n) + '</div>' + (p.shelf && F.shelved(n) ? '<div class="note" style="margin:8px 0 0">Shelved while the emergency lasts: <b>' + esc(NM(F.shelved(n), n)) + '</b>, ' + Math.max(1, p.shelf.end - p.shelf.at) + ' days left. It resumes when this measure is done.</div>' : '') + '</div>');
    } else h += sec('Under way', '<div class="note red">No programme under way. Every month without one is wasted. Start one below or open the tree.</div>');
    h += '<div class="row" style="margin:2px 0 14px">' + btn('Open the programme tree', 'tree', 'nat', { cls: 'red', tip: 'The full tree: every programme, what it needs, and which paths rule each other out.' }) + '</div>';
    const all = F.available(G, n), av = all.filter((f) => !f.crisis), em = all.filter((f) => f.crisis);
    const emOff = cur && cur.crisis ? 'Another emergency measure is under way.' : '';
    if (em.length) h += sec('Emergency measures', '<p class="dim" style="font-size:13.5px;margin:0 0 8px">Short measures for the trouble you are in. Starting one shelves the programme under way; its progress is kept.</p>' + em.map((f) => '<div class="dec em"><h4>' + esc(NM(f, n)) + '</h4><p>' + esc(DS(f, n)) + '</p><div class="cost">' + F.days(G, n, f) + ' days' +
      ' <span style="display:inline-flex;flex-wrap:wrap;gap:0 10px;font-weight:600">' + UI.fxHtml(f.fx, n) + '</span></div>' +
      btn(cur && !cur.crisis ? 'Shelve and start' : 'Start', 'startFocus', f.id, { cls: 'sm red', off: emOff, tip: focusTip(G, n, f) + (cur && !cur.crisis ? '<hr>' + esc(NM(cur, n)) + ' is shelved, with its progress kept, until this is done.' : '') }) + '</div>').join(''), em.length + ' open');
    h += sec('Can start now', av.length ? av.map((f) => '<div class="dec' + (f.dest ? ' dest' : '') + '"><h4>' + esc(NM(f, n)) + histTag(G, f) + destTag(f) + '</h4><p>' + esc(DS(f, n)) + '</p><div class="cost">' + F.days(G, n, f) + ' days' + (f.tree === 'general' ? ' · general' : '') +
      ' <span style="display:inline-flex;flex-wrap:wrap;gap:0 10px;font-weight:600">' + UI.fxHtml(f.fx, n) + '</span></div>' +
      btn('Start', 'startFocus', f.id, { cls: 'sm', off: cur ? 'Another programme is under way. Abandon it first.' : '', tip: focusTip(G, n, f) }) + '</div>').join('')
      : '<p class="dim">Nothing is open right now. Later years and finished programmes unlock more.</p>', av.length ? av.length + '' : '');
    if (G.historical) {
      const up = ID.Story.upcoming(G, 6);
      h += sec('History ahead', up.length ? '<div class="chron hist">' + up.map((b) => {
        const mine = b.nation && ID.byBase(G, b.nation) === n;
        return '<div' + (mine ? ' class="mine"' : '') + '><span>' + b.date + '</span><span>' + esc(b.title) + (b.nation ? ' <span class="dim">· ' + esc(b.nation) + (mine ? ', your decision' : '') + '</span>' : '') + '</span></div>';
      }).join('') + '</div><p class="dim" style="font-size:13px;margin-top:4px">Events whose conditions no longer hold are skipped.</p>' : '<p class="dim">The storyline has run its course.</p>');
    }
    const done = Object.keys(p.done).map((id) => [id, p.done[id]]).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (done.length) h += sec('Completed', '<div class="chron">' + done.map((d) => '<div><span>' + ID.dateOf(d[1]).short + '</span><span>' + esc(F.def(d[0]) ? NM(F.def(d[0]), n) : d[0]) + '</span></div>').join('') + '</div>');
    return h;
  };

  /* ---------------------------------------------------------------- tree */
  const CW = 178, CH = 104, NW = 158, NH = 80, PAD = 14;
  function treeHtml(G, n, key) {
    const F = Fo(), trees = F.trees(n);
    const T = trees.find((t) => t.key === key) || trees[0];
    const cur = F.current(n);
    let mx = 0, my = 0; for (const f of T.list) { mx = Math.max(mx, f.x); my = Math.max(my, f.y); }
    const W = (mx + 1) * CW + PAD * 2 - (CW - NW), H = (my + 1) * CH + PAD * 2 - (CH - NH);
    const pos = (f) => [PAD + f.x * CW, PAD + f.y * CH];
    const byId = {}; for (const f of T.list) byId[f.id] = f;
    let svg = '';
    for (const f of T.list) {
      const [x2, y2] = pos(f);
      const link = (id, dash) => {
        const g = byId[id]; if (!g) return;
        const [x1, y1] = pos(g); const ax = x1 + NW / 2, ay = y1 + NH, bx = x2 + NW / 2, by = y2, my2 = (ay + by) / 2;
        const done = n.path.done[id] != null;
        svg += '<path d="M' + ax + ' ' + ay + 'V' + my2 + 'H' + bx + 'V' + by + '" class="ln' + (done ? ' dn' : '') + (dash ? ' any' : '') + '"/>';
      };
      for (const r of f.req || []) link(r, false);
      for (const r of f.reqAny || []) link(r, true);
      for (const x of f.excl || []) {
        const g = byId[x]; if (!g || g.id < f.id) continue; // draw each pair once
        const [x1, y1] = pos(g); const ax = x2 + NW / 2, ay = y2 + NH / 2, bx = x1 + NW / 2, by = y1 + NH / 2;
        // the marker sits just off the left node, clear of any line running down between the pair
        const mx = ay === by ? Math.min(ax, bx) + NW / 2 + (Math.abs(ax - bx) <= CW ? (CW - NW) / 2 : 26) : (ax + bx) / 2, my3 = (ay + by) / 2;
        svg += '<path d="M' + ax + ' ' + ay + 'L' + bx + ' ' + by + '" class="ex"/><g transform="translate(' + mx + ' ' + my3 + ')"><rect x="-13" y="-10" width="26" height="20" class="exb"/><text y="5" text-anchor="middle" class="ext">or</text></g>';
      }
    }
    let nodes = '';
    for (const f of T.list) {
      const st = F.state(G, n, f), [x, y] = pos(f);
      const pr = st === 'cur' ? F.progress(G, n) : 0;
      const canStart = st === 'avail' && (!cur || (f.crisis && !cur.crisis));
      const meta = f.dest && st !== 'cur' ? (st === 'done' ? '★ ' : '→ ') + ID.Focus.sub(f.dest.name, n) : st === 'done' ? 'done ' + ID.dateOf(n.path.done[f.id]).short : st === 'cur' ? Math.round(pr * 100) + '%' : st === 'excl' ? 'ruled out' : (f.year && ID.yearOf(G.tick) < f.year ? 'from ' + f.year : F.days(G, n, f) + ' days');
      nodes += '<button class="fn ' + st + (isHist(G, f) ? ' h' : '') + (f.dest ? ' dest' : '') + (canStart ? ' go' : '') + '" style="left:' + x + 'px;top:' + y + 'px;width:' + NW + 'px;height:' + NH + 'px"' +
        (canStart ? ' data-act="startFocus" data-a=\'"' + f.id + '"\'' : '') + tip(focusTip(G, n, f) + (canStart ? '<hr><b>Click to start.</b>' + (cur ? ' ' + esc(NM(cur, n)) + ' is shelved until it is done.' : '') : st === 'avail' && cur ? '<hr><span class="dim">Another programme is under way.</span>' : '')) + '>' +
        '<b>' + esc(NM(f, n)) + '</b><small>' + esc(meta) + '</small>' + (st === 'cur' ? '<i class="pg" style="width:' + (pr * 100).toFixed(1) + '%"></i>' : '') + '</button>';
    }
    const tabs = trees.map((t) => '<button class="' + (t.key === T.key ? 'on' : '') + '" data-act="tree" data-a=\'"' + t.key + '"\'>' + esc(t.name) + '</button>').join('');
    const legend = '<div class="tlg"><span class="fn avail"></span>open <span class="fn cur"></span>under way <span class="fn done"></span>done <span class="fn locked"></span>locked <span class="fn excl"></span>ruled out <span class="fn dest avail"></span>destiny' + (G.historical ? ' <span class="fn h avail"></span>as it happened' : '') + '</div>';
    return '<div class="dlg xwide tree"><div class="dhd"><div class="k">PROGRAMME</div><div class="d">' + esc(n.name) + ' · ' + ID.dateOf(G.tick).str + '</div><button class="x" data-act="closeModal"' + tip('Close (Esc)') + '>✕</button></div>' +
      '<div class="dbd"><div class="row nw" style="margin-bottom:10px"><div class="seg" style="flex:none">' + tabs + '</div><span class="sp"></span>' + legend + '</div>' +
      (T.key === 'cri' ? '<div class="note">Emergency measures open only when the trouble they answer is upon you, and can be taken again after a few years. Starting one shelves the programme under way, progress kept, until the measure is done.</div>' :
      cur ? '<div class="note">Under way: <b>' + esc(NM(cur, n)) + '</b>, completes ' + ID.dateOf(n.path.end).short + '. One programme runs at a time.</div>' : '<div class="note red">No programme under way. Click an open programme to start it.</div>') +
      '<div class="tscroll"><div class="tcanvas" style="width:' + W + 'px;height:' + H + 'px"><svg width="' + W + '" height="' + H + '">' + svg + '</svg>' + nodes + '</div></div></div></div>';
  }
  UI.treeKey = 'nat';
  UI.renderTree = function () { const G = UI.G; if (!G || UI.modalKind !== 'tree') return; const sc = document.querySelector('#modal .tscroll'); const l = sc ? sc.scrollLeft : 0, t = sc ? sc.scrollTop : 0; UI.modal(treeHtml(G, P(), UI.treeKey), 'tree'); const s2 = document.querySelector('#modal .tscroll'); if (s2) { s2.scrollLeft = l; s2.scrollTop = t; } UI.retip(); };
  acts.tree = (a) => { UI.treeKey = a || UI.treeKey; const G = UI.G; UI.modal(treeHtml(G, P(), UI.treeKey), 'tree'); UI.retip(); ID.Audio.play('click'); };
  acts.startFocus = (a) => {
    const G = UI.G, n = P(); const why = ID.Focus.start(G, n, a);
    if (why) { UI.toast(why); return; }
    UI.toast('Programme begun: ' + NM(ID.Focus.def(a), n) + '.', true);
    if (UI.modalKind === 'tree') UI.renderTree();
    UI.after();
  };
  acts.cancelFocus = () => { const G = UI.G, n = P(), f = ID.Focus.current(n); if (!f) return; ID.Focus.cancel(G, n); UI.toast(NM(f, n) + ' abandoned.'); UI.after(); };

  /* ---------------------------------------------------------------- handbook page */
  Pn.helpProg = function (G) {
    let h = '<p class="lead">Every state works through a programme: a long project that takes three or four months and then pays out. One runs at a time. Open the <b>Programme</b> panel (P) to choose.</p>';
    h += sec('The trees', '<ul><li>The <b>general programme</b> is open to every state: industry, farming, the army, the state, foreign policy, and a few campaigns you can repeat.</li>' +
      '<li>On <b>The Two Continents</b>, each country also has a <b>national programme</b> of its own. Its branches are real choices: some rule each other out, some change the system of government, some start wars.</li>' +
      '<li>A programme can wait on a year, on earlier programmes, or on the regime in power. Hover any programme to see why it is locked.</li></ul>');
    h += sec('Emergency measures', '<ul><li>A third tree, open to every state, of short measures that open only when the trouble they answer is upon you: hunger, an empty treasury, unrest, a collapsing government, a drifting regime, restless officers, a losing war, civil war.</li>' +
      '<li>Starting one <b>shelves</b> the programme under way. Its progress is kept, and work resumes when the measure is done.</li>' +
      '<li>Each can be taken again after a few years. The <b>Report</b> (R) offers the ones that fit your trouble.</li></ul>');
    h += sec('Destinies', '<ul><li>Every path through a national programme ends in a <b>destiny</b>, shown in gold on the tree. Reaching one renames the state, raises a new flag, gives it a new motto and earns it a title.</li>' +
      '<li>A state can reach one destiny. Choosing a path closes the others.</li>' +
      '<li>A destiny belongs to the regime that reached it. If the system of government changes, the old name and flag go with it.</li>' +
      '<li>Click your flag in the top band for the <b>Nation screen</b>: motto, anthem, history, titles, and which destinies are still open.</li></ul>');
    h += sec('Historical mode', '<p class="lead">A toggle when you set up a campaign on The Two Continents. With it on:</p><ul>' +
      '<li>A storyline runs from 1910 to 1976: a great war, revolutions, the Slump in October 1929, a second war, the blocs, a crisis over the straits. Each arrives on its date if its conditions still hold.</li>' +
      '<li>When history reaches your country, you get the dispatch and you choose. The option marked <b>as it happened</b> is what history did; the others are other roads.</li>' +
      '<li>Other countries take the historical option and follow their historical programmes. Once you change the world, history adapts or skips what no longer fits.</li>' +
      '<li>Before 1939, countries start fewer wars of their own and new blocs form only through the storyline.</li></ul>' +
      '<p class="lead">With it off, nothing is scripted and every country picks its own programme.</p>');
    if (G && G.historical) h += sec('So far', ID.Story.past(G).length ? '<div class="chron">' + ID.Story.past(G).slice(-12).reverse().map((b) => '<div><span>' + b.date + '</span><span>' + esc(b.title) + '</span></div>').join('') + '</div>' : '<p class="dim">Nothing yet.</p>');
    return h;
  };
})();
