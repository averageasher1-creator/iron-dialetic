/* IRON DIALECTIC — interface core: top band, rail, selection card, attack bar, alerts, events, tooltips. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const UI = (ID.UI = {});
  const R = ID.Render, esc = ID.esc, clamp = ID.clamp, B = ID.B;
  const $ = (s) => document.querySelector(s);
  UI.$ = $;
  UI.G = null; UI.tab = null; UI.sel = -1; UI.focusNation = 0; UI.commit = 0.5; UI.style = 'advance'; UI.aim = null; UI.helpPage = 'play';
  UI.settings = { vol: 0.5, muted: false, pauseOnEvent: true, blocs: true, music: 0.35, musicOn: true };
  UI.busy = false; UI.pointerDown = false; UI.modalKind = null;
  const P = () => UI.G.nations[UI.G.player];
  UI.P = P;

  /* ---------------------------------------------------------------- html helpers */
  const tip = (UI.tip = (html) => (html ? ' data-tip="' + esc(html) + '"' : ''));
  UI.btn = function (label, act, args, o) {
    o = o || {};
    return '<button class="b ' + (o.cls || '') + (o.off ? ' off' : '') + '" data-act="' + act + '"' + (args != null ? " data-a='" + esc(JSON.stringify(args)) + "'" : '') + (o.off ? ' data-off="' + esc(o.off) + '"' : '') + tip((o.tip || '') + (o.off ? (o.tip ? '<hr>' : '') + '<span class="bad">' + esc(o.off) + '</span>' : '')) + (o.id ? ' id="' + o.id + '"' : '') + '>' + label + '</button>';
  };
  UI.bar = (v, max, cls, mark) => '<div class="bar ' + (cls || '') + '"><i style="width:' + clamp((v / max) * 100, 0, 100).toFixed(1) + '%"></i>' + (mark != null ? '<u style="left:' + clamp((mark / max) * 100, 0, 100).toFixed(1) + '%"></u>' : '') + '</div>';
  UI.sg = (v, d, inv) => '<span class="' + ((inv ? v < 0 : v > 0) ? 'good' : (inv ? v > 0 : v < 0) ? 'bad' : 'dim') + '">' + (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(d || 0) + '</span>';
  UI.ideoTag = (id) => { const I = ID.IDEOLOGIES[id]; const dark = I.color[0] * 0.3 + I.color[1] * 0.59 + I.color[2] * 0.11 > 150; return '<span class="tag" style="background:' + I.css + (dark ? ';color:#17140f' : '') + '">' + esc(I.name) + '</span>'; };
  UI.fxHtml = (fx, n) => ID.Events.describe(fx, n).map((x) => '<span class="' + (x.good == null ? 'dim' : x.good ? 'good' : 'bad') + '">' + esc(x.t) + '</span>').join('');
  UI.kv = (rows) => '<div class="kv">' + rows.map((r) => '<span' + tip(r[2]) + '>' + r[0] + '</span><b>' + r[1] + '</b>').join('') + '</div>';
  /* Faction support as the player is allowed to see it. */
  UI.seen = (n, f) => (n.id === UI.G.player ? n.rep[f] : n.fs[f]);
  UI.fuzzy = (n) => ID.LAWS.press.opts[n.laws.press].bias > 0;

  UI.toast = function (text, ok) {
    const el = document.createElement('div'); el.className = 'toast' + (ok ? ' ok' : ''); el.textContent = text;
    $('#toasts').appendChild(el); while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
    setTimeout(() => el.remove(), Math.min(7000, 2400 + text.length * 45));
  };
  /* Run a sim call that returns '' on success or a reason string. */
  UI.tryDo = function (res, okMsg) {
    if (typeof res === 'string' && res) { UI.toast(res); ID.Audio.play('bad'); return false; }
    if (okMsg) UI.toast(okMsg, true);
    return true;
  };

  /* ---------------------------------------------------------------- tooltips */
  let tipEl = null, mx = 0, my = 0, tipFor = null;
  function placeTip() {
    const w = tipEl.offsetWidth, h = tipEl.offsetHeight; let x = mx + 16, y = my + 18;
    if (x + w > innerWidth - 8) x = mx - w - 12; if (y + h > innerHeight - 8) y = my - h - 12;
    tipEl.style.left = Math.max(6, x) + 'px'; tipEl.style.top = Math.max(6, y) + 'px';
  }
  UI.showTip = function (html) { tipEl.innerHTML = html; tipEl.hidden = false; placeTip(); };
  UI.hideTip = function () { tipEl.hidden = true; tipFor = null; };
  UI.tipAt = function (x, y, html) { mx = x; my = y; tipFor = null; UI.showTip(html); };
  UI.retip = function () {
    const el = document.elementFromPoint(mx, my); const t = el && el.closest ? el.closest('[data-tip]') : null;
    if (t) { tipFor = t; UI.showTip(t.getAttribute('data-tip')); } else if (tipFor) UI.hideTip();
  };

  /* ---------------------------------------------------------------- modal */
  UI.modal = function (html, kind) { const m = $('#modal'); m.innerHTML = html; m.hidden = false; UI.modalKind = kind || 'dlg'; UI.hideTip(); };
  UI.closeModal = function () { $('#modal').hidden = true; $('#modal').innerHTML = ''; UI.modalKind = null; };

  /* ---------------------------------------------------------------- actions */
  const acts = (UI.acts = {});
  const ins = (UI.ins = {});
  UI.after = function () { UI.renderPanel(); UI.renderSel(); UI.renderAtk(); UI.renderTop(true); UI.renderAlerts(); };

  acts.tab = (a) => UI.openTab(UI.tab === a ? null : a);
  acts.closeTab = () => UI.openTab(null);
  acts.pause = () => UI.setPaused(!UI.G.paused);
  acts.speed = (a) => { UI.G.speed = a; UI.setPaused(false); };
  acts.mode = (a) => { R.setMode(a); UI.renderModes(); };
  acts.blocs = () => { R.showBlocs = !R.showBlocs; UI.G.dirtyAll = true; UI.renderModes(); };
  acts.unsel = () => { UI.sel = -1; R.selected = -1; UI.renderSel(); UI.renderAtk(); };
  acts.closeModal = () => UI.closeModal();
  acts.focus = (a) => { UI.focusNation = a; UI.openTab('for'); const n = UI.G.nations[a]; if (n && n.alive) { R.focus(n.capital); UI.sel = n.capital; R.selected = n.capital; } };
  acts.goto = (a) => { R.focus(a, 5); UI.sel = a; R.selected = a; };
  acts.style = (a) => { UI.style = a; };
  acts.choose = (a) => {
    const G = UI.G; if (!G.evq.length) return;
    ID.Events.choose(G, a); ID.Audio.play('stamp'); UI.closeModal();
    if (!G.evq.length && UI.resumeAfterEvent) { UI.resumeAfterEvent = false; UI.setPaused(false); }
  };
  acts.build = (a) => {
    const G = UI.G, n = P(); if (UI.sel < 0) return;
    if (UI.tryDo(ID.startBuild(G, n, UI.sel, a))) { ID.Audio.play('build'); UI.toast(ID.BUILDINGS[a].name + ' under construction: ready in ' + Math.round(ID.buildDays(G, n, a) / 30) + ' months.', true); }
  };
  acts.declare = (a) => {
    const G = UI.G, n = P(), t = G.nations[a], I = ID.ideo(n);
    const had = G.votes.length;
    if (UI.tryDo(ID.Diplomacy.declare(G, n, t)) && G.votes.length > had) UI.toast('The ' + I.control.body + ' will vote on war with ' + t.name + '.', true);
  };
  acts.expand = () => {
    const G = UI.G, n = P(); const r = ID.Combat.launch(G, n.id, 0, n.troops * UI.commit, 'advance');
    if (typeof r === 'string') { UI.toast(r); ID.Audio.play('bad'); } else { ID.Audio.play('drums'); UI.toast('Columns march into the hinterland with ' + ID.fmtPop(r.troops) + ' troops.', true); }
  };
  acts.abil = (k) => {
    const G = UI.G, n = P(), ab = ID.Combat.ABIL[k];
    if (ab.self) { UI.tryDo(ID.Combat.useAbil(G, n, k)); return; }
    const pre = ID.Combat.abilBlock(G, n, k, -1); if (pre && pre.indexOf('Select') !== 0 && pre.indexOf('Target') !== 0) { UI.tryDo(pre); return; }
    if (UI.sel >= 0 && G.owner[UI.sel] && G.owner[UI.sel] !== n.id && !ID.Combat.abilBlock(G, n, k, UI.sel)) { UI.fireAbil(k, UI.sel); return; }
    UI.aim = k; document.getElementById('map').classList.add('aim');
    UI.toast('Click enemy land to aim the ' + ab.name.toLowerCase() + '. Esc cancels.', true);
  };
  UI.fireAbil = function (k, tile) {
    const G = UI.G, n = P(); UI.aim = null; document.getElementById('map').classList.remove('aim');
    const r = ID.Combat.useAbil(G, n, k, tile);
    if (r) { UI.toast(r); ID.Audio.play('bad'); return; }
    const la = n.a.lastAbil; if (la && la.key === k) UI.toast(ID.Combat.ABIL[k].name + ': ' + ID.fmtPop(la.kill) + ' enemy troops killed' + (la.wrecked ? ', ' + la.wrecked + ' building' + (la.wrecked > 1 ? 's' : '') + ' wrecked' : '') + '. The area is shaken.', true);
  };
  acts.attack = () => {
    const G = UI.G, n = P();
    if (UI.sel >= 0 && !G.owner[UI.sel] && G.terrain[UI.sel] !== ID.T.SEA) { acts.expand(); return; }
    const t = UI.target(); if (!t) { UI.toast('Select an enemy you are at war with on the map.'); return; }
    const cap = n.emergency ? 1 : ID.ideo(n).control.cap;
    const r = ID.Combat.launch(G, n.id, t.id, n.troops * Math.min(UI.commit, cap), UI.style);
    if (typeof r === 'string') { UI.toast(r); ID.Audio.play('bad'); } else ID.Audio.play('drums');
  };
  acts.expandHint = () => { const G = UI.G, n = P(); let best = -1; for (let p = 1; p < G.provinces.length && best < 0; p++) { const Pr = G.provinces[p]; if (!Pr.owner && Pr.wild && Pr.nb.some((q) => G.provinces[q].owner === n.id)) best = Pr.center; } if (best >= 0) { R.focus(best); UI.sel = best; R.selected = best; } };
  acts.recall = (a) => { const G = UI.G; const at = G.attacks.find((x) => x.id === a); if (at) { ID.Combat.cancel(G, at); UI.toast('Recalled. A tenth of the force is lost in the withdrawal.', true); } };
  acts.landing = () => {
    const G = UI.G, n = P(); if (UI.sel < 0) return;
    const cap = n.emergency ? 1 : ID.ideo(n).control.cap;
    const r = ID.Combat.launchBoat(G, n, UI.sel, n.troops * Math.min(UI.commit, cap), UI.style);
    if (typeof r === 'string') { UI.toast(r); ID.Audio.play('bad'); } else UI.toast((G.owner[UI.sel] ? 'Transports are at sea with ' : 'Settlers sail with ') + ID.fmtPop(r.troops) + ' troops.', true);
  };
  acts.missile = (a) => { const G = UI.G; if (UI.sel < 0) return; UI.tryDo(ID.Combat.launchMissile(G, P(), UI.sel, !!a), a ? 'Atomic strike launched.' : 'Missile launched.'); };
  acts.propose = (a) => { const G = UI.G; UI.tryDo(ID.Diplomacy.propose(G, P(), G.nations[a[0]], a[1]), { trade: 'Trade treaty signed.', nap: 'Non-aggression pact signed.', ally: 'Alliance concluded.', peace: 'Peace is signed.', embargo: 'Embargo declared.', cancel_trade: 'Trade treaty cancelled.', cancel_nap: 'Pact denounced.' }[a[1]]); };
  acts.leaveBloc = () => { ID.Diplomacy.leaveBloc(UI.G, P(), true); };
  acts.op = (a) => { const G = UI.G; UI.tryDo(ID.Diplomacy.startOp(G, P(), a[1], G.nations[a[0]]), a[1] === 'fund' ? 'Money is flowing to the movement.' : a[1] === 'coup' ? 'Your contacts have their instructions.' : 'The call has gone out.'); };
  acts.stopOp = (a) => ID.Diplomacy.stopOp(UI.G, P(), a);
  acts.aid = (a) => {
    const G = UI.G, n = P(), t = G.nations[a];
    if (n.gold < 40 || n.troops < 30) { UI.toast('Needs 40 gold and troops to spare.'); return; }
    const tr = n.troops * 0.05; n.troops -= tr; t.troops += tr; n.gold -= 40; t.gold += 40; ID.addOpBoth(G, n.id, t.id, 8);
    const foe = G.nations[t.civilOf || t.civil]; if (foe) ID.addOpBoth(G, n.id, foe.id, -8);
    UI.toast('Arms and ' + ID.fmtPop(tr) + ' volunteers sent to ' + t.name + '.', true);
  };
  acts.offer = (a) => {
    const G = UI.G, o = (G.offers || [])[a[0]]; if (!o) return; G.offers.splice(a[0], 1);
    const f = G.nations[o.from], me = P(); if (!f.alive) return;
    if (a[1]) { if (o.kind === 'peace' ? ID.atWar(G, me.id, f.id) : !ID.atWar(G, me.id, f.id)) { ID.Diplomacy.enact(G, f, me, o.kind); UI.toast({ trade: 'Trade treaty signed with ', nap: 'Pact signed with ', ally: 'Alliance concluded with ', peace: 'Peace signed with ' }[o.kind] + f.name + '.', true); } }
    else ID.addOp(G, f.id, me.id, o.kind === 'ally' ? -8 : -4);
    UI._alKey = '';
  };
  acts.law = (a) => { const G = UI.G, n = P(); const had = G.votes.length; if (UI.tryDo(ID.Politics.setLaw(G, n, a[0], a[1])) && G.votes.length > had) UI.toast('The ' + ID.ideo(n).control.body + ' has taken up the bill. It takes effect after debate.', true); };
  acts.decide = (a) => { const G = UI.G, n = P(); const had = G.votes.length; if (UI.tryDo(ID.Events.runDecision(G, n, a)) && G.votes.length > had) UI.toast('Passed. It takes effect once the debate closes.', true); };
  acts.embrace = (a) => { UI.tryDo(ID.Events.embrace(UI.G, P(), a)); UI.renderTop(true, true); };
  acts.focusTech = (a) => { P().focus = a; };
  acts.motion = (a) => UI.tryDo(ID.Economy.motion(UI.G, P(), a[0], a[1]), 'The congress carries your motion.');
  acts.help = (a) => { UI.helpPage = a; UI.openTab('help', true); };
  acts.fnation = (a) => { UI.focusNation = a; if (a) { const n = UI.G.nations[a]; R.focus(n.capital); } };

  ins.commit = (v) => { UI.commit = v / 100; };
  ins.mob = (v) => { const n = P(); n.mob = Math.min(ID.maxMob(n), v / 1000); };
  ins.tax = (v) => { P().tax = v; };
  ins.rent = (v) => { P().rent = v; };
  ins.pact = (v) => { P().pact = v; };
  ins.budget = (v, el) => { ID.Economy.setBudget(P(), el.dataset.k, v / 100); };
  ins.vol = (v) => { UI.settings.vol = v / 100; ID.Audio.setVol(UI.settings.vol, UI.settings.muted); UI.saveSettings(); };
  ins.mvol = (v) => { UI.settings.music = v / 100; ID.Music.set(UI.settings.music, UI.settings.musicOn); UI.saveSettings(); };

  UI.target = function () {
    const G = UI.G; if (UI.sel < 0) return null;
    const o = G.owner[UI.sel]; if (!o || o === G.player) return null;
    return ID.atWar(G, G.player, o) ? G.nations[o] : null;
  };

  /* ---------------------------------------------------------------- top band */
  const ICON = {
    gov: '<svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V10M9.5 21V10M14.5 21V10M19 21V10M2 10h20L12 3z"/></svg>',
    eco: '<svg viewBox="0 0 24 24"><path d="M3 21V11l5 3V11l5 3V4h4v17zM3 21h18"/></svg>',
    law: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4"/></svg>',
    mil: '<svg viewBox="0 0 24 24"><path d="M4 20L20 4M14 4h6v6M4 4l16 16M4 10V4h6"/></svg>',
    for: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c4 4 4 14 0 18M12 3c-4 4-4 14 0 18"/></svg>',
    world: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    help: '<svg viewBox="0 0 24 24"><path d="M4 4h7v16H4zM13 4h7v16h-7zM6.5 8h2M6.5 12h2M15.5 8h2M15.5 12h2"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    prog: '<svg viewBox="0 0 24 24"><path d="M5 22V3M5 4h13l-3 4.5 3 4.5H5"/></svg>',
  };
  const TABS = [['gov', 'State', 'G'], ['eco', 'Economy', 'E'], ['law', 'Laws', 'L'], ['prog', 'Programme', 'P'], ['mil', 'War', 'M'], ['for', 'Foreign', 'F'], ['world', 'World', 'O'], ['help', 'Handbook', 'H']];
  UI.TABS = TABS;
  UI.renderRail = function () {
    $('#rail').innerHTML = TABS.map((t) => '<button class="tab' + (UI.tab === t[0] ? ' on' : '') + '" data-act="tab" data-a=\'"' + t[0] + '"\' id="tab-' + t[0] + '"' + tip('<b>' + t[1] + '</b> <span class="dim">(' + t[2] + ')</span>') + '>' + ICON[t[0]] + '<span>' + t[1] + '</span><i class="pip" hidden></i>' + (t[0] === 'prog' ? '<i class="tprog"><u id="tprog"></u></i>' : '') + '</button>').join('') +
      '<div class="grow"></div><button class="tab" data-act="menu" id="tab-menu"' + tip('<b>Menu</b> <span class="dim">(Esc)</span><br>Save, load, settings, quit.') + '>' + ICON.menu + '<span>Menu</span></button>';
  };
  let topKey = '';
  const STATS = [
    ['gold', 'Treasury', ''], ['ind', 'Industry', 'opt2'], ['food', 'Food', 'opt1'], ['pop', 'People', 'opt2'], ['troops', 'Troops', ''],
    ['stab', 'Stability', 'g3'], ['legit', 'Legitimacy', 'g3'], ['auth', 'Authority', 'g3'],
  ];
  UI.renderTop = function (force, rebuild) {
    const G = UI.G, n = P(); if (!n) return;
    const I = ID.ideo(n); const key = n.id + n.ideo + n.name;
    if (key !== topKey || rebuild) {
      topKey = key;
      $('#top').innerHTML = '<div class="who" data-act="tab" data-a=\'"gov"\' id="t-who">' + ID.Flags.html(n, 'tflag') + '<div><b>' + esc(n.name) + '</b><small>' + esc(I.name) + ' · ' + esc(ID.CONTROL[I.control.type].name) + '</small></div></div>' +
        '<div class="stats">' + STATS.map((s) => '<div class="st ' + s[2] + '" id="st-' + s[0] + '"><i>' + s[1] + '</i><b id="sv-' + s[0] + '">–</b></div>').join('') + '</div>' +
        '<div class="clock"><div class="date" id="t-date"><b id="sv-date"></b><small id="sv-era"></small></div>' +
        '<button class="b spd pause" data-act="pause" id="b-pause"' + tip('<b>Pause / resume</b> <span class="dim">(Space)</span>') + '></button>' +
        [1, 2, 3, 4, 5].map((s) => '<button class="b spd" data-act="speed" data-a="' + s + '" id="b-spd' + s + '"' + tip('<b>Speed ' + s + '</b> <span class="dim">(key ' + s + ')</span><br>' + ID.SPEEDS[s] + ' days per second') + '>' + s + '</button>').join('') + '</div>';
    }
    const set = (id, html) => { const el = document.getElementById(id); if (el && el.innerHTML !== html) el.innerHTML = html; };
    const net = n.net;
    set('sv-gold', ID.fmt(n.gold) + '<small class="' + (net >= 0 ? 'good' : 'bad') + '">' + (net >= 0 ? '+' : '−') + Math.abs(net).toFixed(net > -10 && net < 10 ? 1 : 0) + '</small>');
    set('sv-ind', ID.fmt(n.ind) + '<small>' + n.nb[B.FACTORY] + ' works</small>');
    set('sv-food', '<span class="' + (n.foodBal < 0.93 ? 'bad' : n.foodBal < 1 ? 'warn' : '') + '">' + Math.round(n.foodBal * 100) + '%</span>');
    set('sv-pop', ID.fmtPop(n.pop));
    set('sv-troops', ID.fmtPop(n.troops) + '<small>' + Math.round((n.troops / Math.max(1, n.pop)) * 100) + '%</small>');
    const cls = (v) => (v < 30 ? 'bad' : v < 45 ? 'warn' : '');
    const arrow = (cur, tgt) => (tgt > cur + 1.5 ? '<small class="good">▲</small>' : tgt < cur - 1.5 ? '<small class="bad">▼</small>' : '');
    set('sv-stab', '<span class="' + cls(n.stab) + '">' + Math.round(clamp(n.stab, 0, 100)) + '</span>' + arrow(n.stab, n.a.stabTgt != null ? n.a.stabTgt : n.stab));
    set('sv-legit', '<span class="' + cls(n.legit) + '">' + Math.round(n.legit) + '</span>' + arrow(n.legit, n.legitRaw != null ? n.legitRaw : n.legit));
    set('sv-auth', Math.round(n.auth) + '');
    { const tp = document.getElementById('tprog'); if (tp) { const w = n.path && n.path.cur ? (ID.Focus.progress(G, n) * 100).toFixed(1) + '%' : '0%'; if (tp.style.width !== w) tp.style.width = w; } }
    const d = ID.dateOf(G.tick);
    set('sv-date', d.str); set('sv-era', ID.ERAS[ID.eraOf(G.tick)].name);
    const pb = document.getElementById('b-pause'); if (pb) { pb.classList.toggle('on', !!G.paused); const t = G.paused ? '❚❚' : '▶'; if (pb.textContent !== t) pb.textContent = t; }
    for (let s = 1; s <= 5; s++) { const el = document.getElementById('b-spd' + s); if (el) el.classList.toggle('on', G.speed === s && !G.paused); }
    if (force || !UI._tipsAt || G.tick - UI._tipsAt > 30) { UI._tipsAt = G.tick; UI.topTips(); }
  };
  UI.topTips = function () {
    const G = UI.G, n = P(), I = ID.ideo(n); const st = (id, html) => { const el = document.getElementById('st-' + id); if (el) el.setAttribute('data-tip', html); };
    st('gold', '<h5>Treasury</h5>Gold in hand and the monthly balance.' + '<hr><div class="kv"><span>Revenue</span><b>' + n.rev.toFixed(1) + '</b><span>Spending</span><b>' + n.exp.toFixed(1) + '</b><span>of which upkeep</span><b>' + (n.a.upkeep || 0).toFixed(1) + '</b>' + (n.debt > 1 ? '<span>Debt</span><b class="bad">' + Math.round(n.debt) + ' / ' + Math.round(ID.Economy.debtCap(n)) + '</b>' : '') + '</div><hr><span class="dim">' + esc(ID.ECON[I.econ.model].name) + ': ' + esc(ID.ECON[I.econ.model].levers) + '</span>');
    st('ind', '<h5>Industry</h5>Monthly industrial output from ' + n.nb[B.FACTORY] + ' factories and ' + n.nb[B.CITY] + ' cities. Every factory also adds to the workers’ political power.<hr><div class="kv"><span>Efficiency</span><b>' + Math.round(n.eff * 100) + '%</b><span>Total output</span><b>' + Math.round(n.gdp) + '</b><span>World rank</span><b>#' + ID.rankOf(G, n, 'ind') + '</b></div>');
    st('food', '<h5>Food</h5>Harvest as a share of what the population needs. Below 93% is famine: people die, peasants and workers turn.<hr><span class="dim">Raised by farmland, agricultural research and land law; lowered by mass mobilisation and squeezing the villages.</span>');
    st('pop', '<h5>Population</h5>' + ID.fmtPop(n.pop) + ' of a capacity of ' + ID.fmtPop(ID.popCap(n)) + '. Growth slows as you approach capacity; cities raise it.<hr>Living standards: <b>' + Math.round(n.ls) + '</b>');
    st('troops', '<h5>Troops</h5>Your uncommitted pool. It refills toward ' + Math.round(n.mob * 100) + '% of the population (set on the War panel). Soldiers are not workers.<hr><div class="kv"><span>Attack</span><b>×' + (n.a.atk || 1).toFixed(2) + '</b><span>Defence</span><b>×' + (n.a.def || 1).toFixed(2) + '</b><span>War weariness</span><b>' + Math.round(n.we) + '</b></div>');
    st('stab', '<h5>Stability</h5>Heading for <b>' + Math.round(n.a.stabTgt != null ? n.a.stabTgt : n.stab) + '</b>.<br>Built from legitimacy and the support of each faction weighted by its power; cut by unrest and war weariness.<hr><span class="dim">Below 38, movements can rise. At zero for most of a year, the state dissolves.</span>');
    st('legit', '<h5>Legitimacy</h5>' + Object.keys(I.legit).map((k) => '<div class="kv"><span>' + ID.LEGIT[k].name + ' <span class="dim">' + Math.round(I.legit[k] * 100) + '%</span></span><b>' + Math.round(n.src[k]) + '</b></div>').join('') + '<hr><span class="dim">Each ideology draws on different sources. Open the State panel for what moves them.</span>');
    st('auth', '<h5>Authority</h5>Spent on laws and decisions. ' + esc(ID.CONTROL[I.control.type].desc));
    const tw = document.getElementById('t-who'); if (tw) tw.setAttribute('data-tip', '<h5>' + esc(n.name) + '</h5>' + esc(I.short) + '<hr>' + esc(n.leader.title) + ' ' + esc(n.leader.name) + ', aged ' + n.leader.age);
    const td = document.getElementById('t-date'); if (td) td.setAttribute('data-tip', '<h5>' + ID.ERAS[ID.eraOf(G.tick)].name + '</h5>' + esc(ID.ERAS[ID.eraOf(G.tick)].desc) + '<hr><span class="dim">History delivers its verdict on 1 Jan ' + ID.END_YEAR + '.</span>');
  };
  UI.setPaused = function (p) { UI.G.paused = p; UI.renderTop(); };

  /* ---------------------------------------------------------------- drawer */
  UI.openTab = function (t, keep) {
    if (!keep && t === UI.tab) return;
    UI.tab = t; const d = $('#drawer');
    d.hidden = !t; $('#modes').classList.toggle('shift', !!t); $('#atkbar').classList.toggle('shift', !!t); $('#alerts').classList.toggle('shift', !!t);
    for (const x of TABS) { const el = document.getElementById('tab-' + x[0]); if (el) el.classList.toggle('on', x[0] === t); }
    if (t) { UI.renderPanel(true); ID.Audio.play('click'); }
  };
  UI.renderPanel = function (resetScroll) {
    if (!UI.tab || !UI.G) return;
    const d = $('#drawer'); const body = d.querySelector('.db'); const sc = body && !resetScroll ? body.scrollTop : 0;
    const title = TABS.find((x) => x[0] === UI.tab)[1];
    d.innerHTML = '<div class="dh"><h2>' + title + '</h2><button class="x" data-act="closeTab"' + tip('Close (Esc)') + '>✕</button></div><div class="db">' + ID.Panels[UI.tab](UI.G, P()) + '</div>';
    d.querySelector('.db').scrollTop = sc;
    UI.retip();
  };

  /* ---------------------------------------------------------------- map modes */
  const MODES = [['political', 'Political', 'Z', 'Who holds what. Your own borders are red; bloc members share a border colour.'], ['ideology', 'Ideology', 'X', 'Every state coloured by its system.'], ['opposition', 'Opposition', 'C', 'The leading opposition movement in each province, shaded by its strength.'], ['stability', 'Unrest', 'V', 'Unrest by province: pale is quiet, red is close to revolt.'], ['supply', 'Supply', 'B', 'Green is in supply, ochre is supplied by sea, red is cut off and will surrender.'], ['terrain', 'Terrain', 'N', 'Plains and farmland are fast; forest, hills and mountains slow a front and bleed it.']];
  UI.MODES = MODES;
  UI.renderModes = function () {
    $('#modes').innerHTML = MODES.map((m) => '<button class="' + (R.mode === m[0] ? 'on' : '') + '" data-act="mode" data-a=\'"' + m[0] + '"\'' + tip('<b>' + m[1] + ' map</b> <span class="dim">(' + m[2] + ')</span><br>' + m[3]) + '>' + m[1] + '<kbd>' + m[2] + '</kbd></button>').join('');
  };

  /* ---------------------------------------------------------------- selection card */
  UI.clickTile = function (i) {
    const G = UI.G; if (i < 0) return;
    if (UI.aim) { UI.fireAbil(UI.aim, i); UI.renderAtk(); return; }
    if (G.terrain[i] === ID.T.SEA) { acts.unsel(); return; }
    UI.sel = i; R.selected = i; ID.Audio.play('click');
    const o = G.owner[i]; if (o && o !== G.player && UI.tab === 'for') UI.focusNation = o;
    UI.renderSel(); UI.renderAtk(); if (UI.tab === 'for') UI.renderPanel();
  };
  function statusLine(G, me, n) {
    const d = ID.dipOf(G, me.id, n.id); const out = [];
    if (d.war) { const s = ID.Diplomacy.warScore(G, me, n); out.push('<span class="tag" style="background:var(--red)">At war</span> <span class="' + (s > 0.05 ? 'good' : s < -0.05 ? 'bad' : 'dim') + '">' + (s > 0.05 ? 'winning' : s < -0.05 ? 'losing' : 'even') + '</span>'); }
    else {
      if (ID.sameBloc(G, me.id, n.id)) out.push('<span class="tag" style="background:var(--olive)">Bloc ally</span>');
      if (d.nap) out.push('<span class="tag lt">Pact</span>');
      if (d.trade) out.push('<span class="tag lt">Trade</span>');
      if (d.truce > G.tick) out.push('<span class="tag lt">Truce to ' + ID.dateOf(d.truce).y + '</span>');
      if (!out.length) out.push('<span class="dim">No treaties</span>');
    }
    return out.join(' ');
  }
  UI.warTip = function (G, me, t) {
    const I = ID.ideo(me), cb = ID.Diplomacy.casusBelli(G, me, t); let h = '<h5>Declare war on ' + esc(t.name) + '</h5>';
    h += 'Justification: <b>' + ID.Diplomacy.CB_NAMES[cb || 'none'] + '</b>' + (cb ? '' : ' <span class="bad">— every state will mark it</span>') + '<br>';
    if (I.control.warVote && !me.emergency) { const v = ID.Politics.vote(G, me, 'war', { target: t.id, cb }); h += 'The ' + esc(I.control.body) + ' must agree: forecast <b class="' + (v.pass ? 'good' : 'bad') + '">' + Math.round(v.yes) + '% in favour</b>' + (I.control.type === 'assembly' ? ', after ' + I.control.delay + ' days of debate' : '') + '.<br>'; }
    else h += 'By order: war begins at once.<br>';
    h += '<hr><div class="kv"><span>Their troops</span><b>' + ID.fmtPop(t.troops) + '</b><span>Yours</span><b>' + ID.fmtPop(me.troops) + '</b></div>';
    if (t.bloc) h += '<span class="warn">Their bloc, the ' + esc(G.blocs[t.bloc].name) + ', may join them.</span>';
    return h;
  };
  UI.renderSel = function () {
    const G = UI.G, el = $('#sel'); if (!G) return;
    if (UI.sel < 0) { el.hidden = true; return; }
    const i = UI.sel, o = G.owner[i], me = P(); const n = o ? G.nations[o] : null;
    const Pr = G.provinces[G.prov[i]]; const terr = ID.TERRAIN[G.terrain[i]];
    let h = '<div class="hd">' + (n ? ID.Flags.html(n, 'sflag') : '') + '<b>' + (n ? esc(n.name) : 'The hinterland') + '</b><button class="x" data-act="unsel"' + tip('Clear selection (Esc)') + '>✕</button></div><div class="bd">';
    const rows = [['Terrain', terr.name + (G.river[i] ? ', river' : ''), '<b>' + terr.name + '</b><br>' + esc(terr.desc || '') + (G.river[i] ? '<br>Rivers slow a front and cost the attacker more.' : '')]];
    if (G.fortCov[i] === o && o) rows.push(['Fortress cover', '<span class="warn">yes</span>', 'Attackers pay 2.5× for this tile.']);
    if (G.rad[i]) rows.push(['Irradiated', '<span class="bad">' + Math.ceil(G.rad[i] / 12) + ' yrs</span>']);
    if (n && o === G.player) {
      rows.push(['Province unrest', '<span class="' + (Pr.unrest > 50 ? 'bad' : Pr.unrest > 30 ? 'warn' : '') + '">' + Math.round(Pr.unrest) + '</span>', 'Unrest in this province. Over 72 in unintegrated land, it may break away.']);
      if (Pr.opp) rows.push(['Opposition', UI.ideoTag(Pr.opp) + ' ' + Math.round(Pr.oppStr), 'The leading opposition movement here and its strength. Provinces above 45 join an uprising.' + (Pr.sponsor && me.a.knownOps && me.a.knownOps[Pr.sponsor] ? '<br><span class="warn">Funded by ' + esc(G.nations[Pr.sponsor].name) + '.</span>' : '')]);
      if (Pr.core !== o) rows.push(['Integration', Math.round(Pr.integ) + '%', 'Conquered land resists until integrated. ' + (Pr.core && G.nations[Pr.core] ? 'Its people still look to ' + esc(G.nations[Pr.core].name) + '.' : '')]);
      if (G.cut[i] === 1) rows.push(['Supply', '<span class="bad">cut off</span>', 'This pocket is encircled. It will surrender, and its share of your troops with it, unless relieved or given a port.']);
      h += UI.kv(rows);
      const bl = G.bld[i];
      if (bl) h += '<div class="note">' + ID.BUILDINGS[bl].name + ': ' + esc(ID.BUILDINGS[bl].desc) + '</div>';
      else {
        h += '<div class="build">' + [1, 2, 3, 4, 5].map((t) => { const b = ID.BUILDINGS[t]; const why = ID.canBuild(G, me, i, t); return UI.btn(b.name.split(' ')[0] + '<small>' + ID.buildCost(G, me, t) + '</small>', 'build', t, { cls: 'sm', off: why, tip: '<h5>' + b.name + '</h5>' + esc(b.desc) + '<hr>Cost <b>' + ID.buildCost(G, me, t) + '</b> gold · ' + Math.round(ID.buildDays(G, me, t) / 30) + ' months · upkeep ' + b.upkeep + '/mo' }); }).join('') + '</div>';
      }
    } else if (n) {
      const I = ID.ideo(n);
      h += '<div style="margin-bottom:6px">' + UI.ideoTag(n.ideo) + ' ' + statusLine(G, me, n) + '</div>';
      const op = ID.op(G, n.id, me.id);
      rows.push(['Their opinion of you', '<span class="' + (op > 15 ? 'good' : op < -15 ? 'bad' : '') + '">' + Math.round(op) + '</span>', 'Driven by ideological distance, treaties, your threat and what you have done to them.']);
      rows.push(['Troops', ID.fmtPop(n.troops)]); rows.push(['Stability', Math.round(clamp(n.stab, 0, 100)) + '']);
      h += UI.kv(rows) + '<div class="acts">';
      if (ID.atWar(G, me.id, n.id)) {
        const cap = me.emergency ? 1 : ID.ideo(me).control.cap; const tr = me.troops * Math.min(UI.commit, cap);
        if (ID.borders(G, me.id, n.id) || G.attacks.some((a) => a.from === me.id && a.to === n.id)) h += UI.btn('Attack <span>' + ID.fmtPop(tr) + ' troops</span>', 'attack', null, { cls: 'red', tip: '<h5>Attack</h5>Commit ' + Math.round(Math.min(UI.commit, cap) * 100) + '% of your pool (' + ID.fmtPop(tr) + ') against ' + esc(n.name) + ' in the style chosen on the bar below. <span class="dim">(Enter)</span>' });
        if (G.coast[i]) { const pl = ID.Combat.planBoat(G, me, i); h += UI.btn('Naval landing here <span>' + ID.fmtPop(tr) + '</span>', 'landing', null, { off: typeof pl === 'string' ? pl : '', tip: '<h5>Naval landing</h5>Send ' + ID.fmtPop(tr) + ' troops by sea from your nearest port to this tile. The first tiles ashore cost half as much again; a fortress on the coast can throw you back.' + (typeof pl === 'string' ? '' : '<hr>Crossing: about ' + Math.round(pl.path.length / 1.3) + ' days') }); }
        if (me.nb[B.SILO]) {
          const cm = ID.Combat.canMissile(G, me, i, false), cn = ID.Combat.canMissile(G, me, i, true);
          h += UI.btn('Missile strike here', 'missile', 0, { off: typeof cm === 'string' ? cm : '', tip: 'Destroys about half the buildings within 3 tiles.' });
          if (me.tech.mil >= 6) h += UI.btn('Atomic strike here', 'missile', 1, { cls: 'red', off: typeof cn === 'string' ? cn : '', tip: '<h5>Atomic strike</h5>Destroys everything within 8 tiles and poisons the land for ten years.<hr><span class="bad">Every state’s opinion of you collapses, threat +50, your own clergy and intelligentsia recoil, and anyone who has the bomb may answer in kind.</span>' });
        }
        for (const k of ['barrage', 'airraid']) { const ab = ID.Combat.ABIL[k]; h += UI.btn(ab.name + ' here <span>' + ab.gold + ' gold</span>', 'abil', k, { off: ID.Combat.abilBlock(G, me, k, i), tip: '<h5>' + ab.name + '</h5>' + esc(ab.desc) + '<hr>Range ' + ab.range + ' tiles from your land · radius ' + ab.r + ' · every ' + ab.cd + ' days' }); }
        const ev = ID.Diplomacy.evalProposal(G, me, n, 'peace');
        h += UI.btn('Offer peace', 'propose', [n.id, 'peace'], { cls: 'ghost', off: ev.ok ? '' : ev.why, tip: 'Each side keeps what it holds. Five-year truce.' });
      } else {
        const wb = ID.Diplomacy.warBlock(G, me, n);
        h += UI.btn('Declare war', 'declare', n.id, { cls: 'red', off: wb, tip: UI.warTip(G, me, n) });
      }
      h += UI.btn('Diplomacy and operations', 'focus', n.id, { cls: 'ghost', tip: 'Treaties, embargo, covert operations and a full report on this state.' });
      h += '</div>';
    } else {
      h += '<p class="lead" style="font-size:14px">No state governs this land. Take it without a war: it costs troops, not diplomacy. New land raises your population ceiling and settles into your country within a few years.</p>' + UI.kv(rows) + '<div class="acts">';
      const tr = me.troops * UI.commit, can = ID.Combat.canExpand(G, me), going = G.attacks.find((a) => a.from === me.id && a.to === 0);
      h += UI.btn('Expand into the hinterland <span>' + ID.fmtPop(tr) + '</span>', 'expand', null, { cls: 'red', off: can, tip: '<h5>Expand</h5>Send ' + ID.fmtPop(tr) + ' troops (your Commit share) to claim unclaimed land along your whole frontier. About ' + Math.round(ID.Combat.WILD_LOSS * 1000) + ' men are lost per tile of open ground, more in forest and hills. <span class="dim">(Enter)</span>' + (going ? '<hr>Already expanding with ' + ID.fmtPop(going.troops) + '; this adds to it.' : '') });
      if (G.coast[i]) { const pl = ID.Combat.planBoat(G, me, i); h += UI.btn('Land settlers here <span>' + ID.fmtPop(tr) + '</span>', 'landing', null, { off: typeof pl === 'string' ? pl : '', tip: 'Ship troops from your nearest port to claim this coast and push inland from it.' }); }
      h += '</div>';
    }
    h += '</div>';
    el.innerHTML = h; el.hidden = false; UI.retip();
  };

  /* ---------------------------------------------------------------- attack bar */
  UI.renderAtk = function () {
    const G = UI.G, n = P(), el = $('#atkbar'); if (!n) return;
    const mine = G.attacks.filter((a) => a.from === n.id), boats = G.boats.filter((b) => b.owner === n.id);
    const wildOK = G.wildB && G.wildB[n.id] > 0;
    if (!n.nwars && !mine.length && !boats.length && !wildOK) { el.hidden = true; return; }
    const I = ID.ideo(n), cap = n.emergency ? 1 : I.control.cap, t = UI.target();
    if (UI.commit > cap) UI.commit = cap;
    if (!ID.Combat.styleOk(n, UI.style)) UI.style = 'advance';
    const tr = n.troops * UI.commit;
    let h = '<div class="l1"><label' + tip('<h5>Commit</h5>The share of your uncommitted pool sent into the next attack or landing. What you send leaves the pool; what you keep defends everywhere at once.' + (cap < 1 ? '<hr><span class="warn">' + esc(I.name) + ': no single offensive may use more than ' + Math.round(cap * 100) + '%.</span>' : '')) + '>Commit</label><input type="range" min="5" max="' + Math.round(cap * 100) + '" step="5" value="' + Math.round(UI.commit * 100) + '" data-in="commit" id="in-commit"><b id="commit-v">' + Math.round(UI.commit * 100) + '% · ' + ID.fmtPop(tr) + '</b>' +
      (t ? UI.btn('Attack ' + esc(t.base), 'attack', null, { cls: 'red', id: 'b-attack', tip: 'Launch or reinforce the attack on ' + esc(t.name) + ' <span class="dim">(Enter)</span>' }) : n.nwars ? '<span class="dim" style="font-size:14px">Select an enemy on the map</span>' : '') +
      (wildOK ? UI.btn('Expand', 'expand', null, { cls: t ? 'ghost' : 'red', id: 'b-expand', tip: '<h5>Expand into the hinterland</h5>Claim unclaimed land along your frontier with ' + ID.fmtPop(tr) + ' troops. No war, no vote: the land is free for whoever takes it first. Your neighbours are racing for it too.' }) : '') + '</div>';
    if (n.nwars) h += '<div class="styles orders">' + ['barrage', 'airraid', 'reserves'].map((k) => { const ab = ID.Combat.ABIL[k], why = ID.Combat.abilBlock(G, n, k, ab.self ? null : -1), soft = why && (why.indexOf('Select') === 0); const cd = (n.cd['ab_' + k] || 0) - G.tick; return UI.btn(ab.name + (cd > 0 ? ' <span class="num">' + cd + 'd</span>' : ' <span class="num">' + ab.gold + 'g</span>'), 'abil', k, { cls: 'sm ' + (UI.aim === k ? 'on' : 'ghost'), off: soft ? '' : why, tip: '<h5>' + ab.name + '</h5>' + esc(ab.desc) + (ab.self ? '' : '<hr>Click, then click enemy land within ' + ab.range + ' tiles of yours.') + '<br>Cost ' + ab.gold + ' gold · every ' + ab.cd + ' days' }); }).join('') + '</div>';
    if (n.nwars) h += '<div class="styles">' + Object.keys(ID.STYLES).map((k) => { const S = ID.STYLES[k], e = I.doctrine.styles[k] || 0, ok = ID.Combat.styleOk(n, k); return UI.btn(S.name + ' <span class="num">×' + e.toFixed(2) + '</span>', 'style', k, { cls: 'sm ' + (UI.style === k ? 'on' : 'ghost'), off: ok ? '' : S.needs === 'mil2' && n.tech.mil < 2 ? 'Needs military technology 2.' : 'Your doctrine cannot fight this way.', tip: '<h5>' + S.name + '</h5>' + esc(S.desc) + '<hr>Your doctrine: <b>×' + e.toFixed(2) + '</b> effectiveness' }); }).join('') + '</div>';
    if (mine.length || boats.length) {
      h += '<div class="chips">' + mine.map((a) => '<span class="chip"' + tip('Committed ' + ID.fmtPop(a.committed) + ', ' + a.taken + ' tiles taken' + (a.to ? ', ' + ID.STYLES[a.style].name.toLowerCase() : '') + '.') + '>→ ' + (a.to ? esc(G.nations[a.to].base) : 'Hinterland') + ' <b class="num">' + ID.fmtPop(a.troops) + '</b><button data-act="recall" data-a="' + a.id + '"' + tip('Recall the survivors. A tenth are lost withdrawing.') + '>recall</button></span>').join('') +
        boats.map((b) => '<span class="chip">⛴ at sea <b class="num">' + ID.fmtPop(b.troops) + '</b></span>').join('') + '</div>';
    }
    el.innerHTML = h; el.hidden = false;
  };

  /* ---------------------------------------------------------------- alerts */
  UI.alerts = function () {
    const G = UI.G, n = P(), I = ID.ideo(n), out = []; const add = (text, tab, red, act, arg) => out.push({ text, tab, red, act, arg });
    if (n.nwars) {
      let inc = 0; for (const a of G.attacks) if (a.to === n.id) inc += a.troops;
      if (inc > 1) add('<b>Under attack</b> by ' + ID.fmtPop(inc) + ' troops', 'mil', true);
      if (!G.attacks.some((a) => a.from === n.id) && n.troops > n.pop * n.mob * 0.6) add('<b>Troops idle</b> while at war', 'mil');
    }
    if (G.wildB && G.wildB[n.id] > 0 && !G.attacks.some((a) => a.from === n.id && a.to === 0) && n.troops > n.pop * n.mob * 0.5) add('<b>Unclaimed land</b> on your frontier: expand', 'mil', false, 'expandHint', 0);
    let cut = 0; for (let p = 1; p < G.provinces.length; p++) { const Pr = G.provinces[p]; if (Pr.owner === n.id && G.cut[Pr.center] === 1 && G.owner[Pr.center] === n.id) cut++; }
    if (cut) add('<b>Pocket cut off</b>: it will surrender', 'mil', true);
    for (const f of ID.FACTION_IDS) if (UI.seen(n, f) < 30 && n.fp[f] > 10) add('<b>' + ID.factionName(n, f) + '</b> are hostile (' + Math.round(UI.seen(n, f)) + ')', 'gov', UI.seen(n, f) < 20);
    if (n.stab < 30) add('<b>Stability ' + Math.round(n.stab) + '</b>: the state is shaking', 'gov', true);
    for (const k in n.drift) if (n.drift[k] >= 65) add('<b>Drift ' + Math.round(n.drift[k]) + '%</b> toward ' + ID.IDEOLOGIES[k].name, 'gov', n.drift[k] >= 85);
    if (n.famine) add('<b>Famine</b>: food at ' + Math.round(n.foodBal * 100) + '%', 'eco', true); else if (n.foodBal < 1) add('<b>Food short</b>: ' + Math.round(n.foodBal * 100) + '% of need', 'eco');
    if (n.debt > ID.Economy.debtCap(n) * 0.75) add('<b>Debt</b> near its limit', 'eco', true);
    else if (n.net < 0 && n.gold < 60) add('<b>Treasury</b> running dry', 'eco');
    if (n.inflation > 40) add('<b>Inflation ' + Math.round(n.inflation) + '</b>', 'eco', n.inflation > 60);
    if (n.depression) add('<b>Slump</b>: ' + n.depression + ' months to run', 'eco');
    if (n.pactBroken) add('<b>The pact has broken down</b>', 'eco', true);
    if (n.load > 1) add('<b>Planning network overloaded</b>', 'eco', true);
    if (I.flags.fiveYear && !n.plan) add('<b>No plan in force</b> (efficiency −8%)', 'gov');
    if (n.strike > 0) add('<b>Strike</b>: industry −30%', 'gov', true);
    if (I.elections && n.electionAt && !n.emergency && n.electionAt - G.tick < 240) { const f = ID.Politics.electionForecast(G, n); add('<b>Election in ' + Math.max(1, Math.round((n.electionAt - G.tick) / 30)) + ' months</b>: forecast ' + Math.round(f * 100) + '%', 'gov', f < 0.5); }
    if ((n.a.unrest || 0) > 40) add('<b>Unrest ' + Math.round(n.a.unrest) + '</b> across the country', 'gov', true);
    if (n.a.mv && n.a.mv.ideo && n.a.mv.share > 0.12 && !UI.fuzzy(n)) add('<b>' + ID.IDEOLOGIES[n.a.mv.ideo].name + '</b> movement strong in ' + Math.round(n.a.mv.share * 100) + '% of the country', 'gov', n.a.mv.share > 0.22);
    const det = ID.LAWS.security.opts[n.laws.security].detect;
    if (det > 0 && n.coupRisk > 0.006) add('<b>Security service</b>: officers are plotting', 'gov', n.coupRisk > 0.02);
    if (n.a.knownOps) for (const k in n.a.knownOps) if (G.tick - n.a.knownOps[k] < 720 && G.nations[+k].alive) add('<b>' + esc(G.nations[+k].base) + '</b> is funding your opposition', 'for', false, 'focus', +k);
    for (const v of G.votes) if (v.n === n.id) add('<b>' + esc(I.control.body) + '</b> votes ' + ID.dateOf(v.at).short + (v.kind === 'war' ? ' on war with ' + esc(G.nations[v.target].base) : ''), 'gov');
    if (n.auth >= 96) add('<b>Authority</b> is at its ceiling: spend it', 'gov');
    if (!(n.path && n.path.cur) && ID.Focus.available(G, n).length) add('<b>No programme</b> under way: choose one', 'prog');
    if (n.a.techCost === 0 && ['ind', 'mil', 'agr'].some((k) => n.tech[k] < ID.ERAS[ID.eraOf(G.tick)].techCap)) add('<b>Research</b>: this field is capped, switch focus', 'eco');
    return out.slice(0, 7);
  };
  const OFFER = { trade: ['offers a trade treaty', 'Income for both of you every month.'], nap: ['offers a non-aggression pact', 'Neither side may attack the other. Breaking it later costs you the trust of every state.'], ally: ['invites you into an alliance', 'You would be called into each other’s defensive wars.'], peace: ['offers peace on the present lines', 'Each side keeps what it holds, with a five-year truce.'] };
  UI.renderAlerts = function () {
    const G = UI.G, a = UI.alerts(), offers = (G.offers || []).filter((o) => G.nations[o.from].alive);
    const key = JSON.stringify(a) + JSON.stringify(offers);
    if (key === UI._alKey) return; UI._alKey = key;
    $('#alerts').innerHTML = a.map((x) => '<button class="al' + (x.red ? ' r' : '') + '" data-act="' + (x.act || 'tab') + '" data-a=\'' + JSON.stringify(x.arg != null ? x.arg : x.tab) + '\'>' + x.text + '</button>').join('') +
      offers.map((o, k) => { const f = G.nations[o.from]; return '<div class="al offer"' + tip('<h5>' + esc(f.name) + '</h5>' + OFFER[o.kind][1] + '<hr>Their opinion of you: <b>' + Math.round(ID.op(G, f.id, G.player)) + '</b>. The offer lapses ' + ID.dateOf(o.until).short + '.') + '><span>' + R.swatch(f) + '<b>' + esc(f.base) + '</b> ' + OFFER[o.kind][0] + '</span><span class="row nw">' + UI.btn('Accept', 'offer', [k, 1], { cls: 'sm' }) + UI.btn('Decline', 'offer', [k, 0], { cls: 'sm ghost' }) + '</span></div>'; }).join('');
    for (const t of TABS) { const el = document.querySelector('#tab-' + t[0] + ' .pip'); if (el) el.hidden = !a.some((x) => x.red && x.tab === t[0]); }
  };

  /* ---------------------------------------------------------------- events */
  UI.showEvent = function () {
    const G = UI.G, e = G.evq[0]; if (!e) return;
    const n = G.nations[e.n], def = ID.Events.def(e.id);
    if (!n || !n.alive || !def || n.id !== G.player) { G.evq.shift(); return; }
    const opts = ID.Events.options(G, n, def, e.ctx);
    if (!opts.length) { G.evq.shift(); return; }
    const T = (v) => esc(ID.Events.txt(v, G, n, e.ctx));
    let h = '<div class="dlg"><div class="dhd"><div class="k">' + (def.story ? 'HISTORY' : def.sys ? 'URGENT' : 'DISPATCH') + '</div><div class="d">' + ID.dateOf(e.t).str + '</div></div>' + ID.Flags.banner(n, e.id, !!def.sys) + '<div class="dbd"><h2>' + T(def.title) + '</h2><p class="tx">' + T(def.text) + '</p>';
    opts.forEach((o, k) => {
      const fx = typeof o.fx === 'function' ? [] : o.fx;
      h += '<button class="choice" data-act="choose" data-a="' + k + '"><kbd>' + (k + 1) + '</kbd><b>' + T(o.label) + (o.hist && G.historical ? ' <span class="tag hist">as it happened</span>' : '') + '</b>' + (o.tip ? '<span class="hint">' + T(o.tip) + '</span>' : '') + '<div class="fx">' + UI.fxHtml(fx, n) + '</div></button>';
    });
    h += '</div></div>';
    if (!G.paused && UI.settings.pauseOnEvent) UI.resumeAfterEvent = false;
    UI.modal(h, 'event');
  };

  /* ---------------------------------------------------------------- headlines */
  let hlEl = null, hlT = 0;
  UI.headline = function (o) {
    const G = UI.G;
    if (!hlEl) { hlEl = document.createElement('div'); hlEl.id = 'headline'; document.getElementById('app').appendChild(hlEl); hlEl.addEventListener('click', () => { hlT = 99; }); }
    const fa = o.a && G.nations[o.a] ? ID.Flags.html(G.nations[o.a], 'hflag') : '', fb = o.b && G.nations[o.b] ? ID.Flags.html(G.nations[o.b], 'hflag') : '';
    hlEl.className = 'tone-' + (o.tone || 'pol');
    hlEl.innerHTML = '<div class="mast"><span>The World Dispatch</span><span>' + ID.dateOf(o.t).str + '</span></div><div class="kick">' + esc(o.kicker || '') + '</div><h1>' + esc(o.title) + '</h1><div class="sub">' + (fa ? '<span class="fl">' + fa + fb + '</span>' : '') + '<p>' + esc(o.sub || '') + '</p></div>';
    hlEl.classList.remove('on'); void hlEl.offsetWidth; hlEl.classList.add('on'); hlEl.hidden = false; hlT = 0;
    ID.Audio.play(o.tone === 'war' ? 'war' : o.tone === 'good' ? 'victory' : o.tone === 'era' ? 'era' : o.tone === 'rev' ? 'revolt' : 'alarm');
    if (ID.Music && ID.Music.sting) ID.Music.sting(o.tone);
  };
  UI.tickHeadlines = function (dt) {
    const G = UI.G;
    if (hlEl && !hlEl.hidden) { hlT += dt; if (hlT > 4.6) { hlEl.classList.remove('on'); hlEl.hidden = true; } return; }
    if (G.headlines && G.headlines.length && UI.modalKind !== 'end') UI.headline(G.headlines.shift());
  };
  UI.hideHeadline = () => { if (hlEl) hlEl.hidden = true; };

  /* ---------------------------------------------------------------- ticker */
  let tickX = 0, tickW = 0;
  UI.renderTicker = function () {
    const G = UI.G; G.newsDirty = false;
    const items = G.news.slice(-14).reverse();
    $('#tickin').innerHTML = items.map((x) => '<span class="' + x.cls + '"><b>' + ID.dateOf(x.t).short.toUpperCase() + '</b>' + esc(x.text) + '</span>').join('');
    tickW = $('#tickin').scrollWidth; tickX = Math.min(tickX, innerWidth * 0.3); if (tickX < -tickW + 200) tickX = innerWidth * 0.3;
  };

  /* ---------------------------------------------------------------- per-frame */
  let tA = 0, tB = 0, tC = 0;
  UI.frame = function (dt) {
    const G = UI.G; if (!G) return;
    tA += dt; tB += dt; tC += dt;
    if (G.newsDirty) UI.renderTicker();
    if (!G.paused || tickX > -tickW) { tickX -= dt * 62; if (tickX < -tickW) tickX = innerWidth; $('#tickin').style.transform = 'translateX(' + tickX.toFixed(1) + 'px)'; }
    if (tA > 0.25) { tA = 0; UI.renderTop(); const cv = document.getElementById('commit-v'); if (cv) cv.textContent = Math.round(UI.commit * 100) + '% · ' + ID.fmtPop(P().troops * UI.commit); }
    const hold = UI.busy || UI.pointerDown;
    if ((tB > 1 || G.uiDirty) && !hold) {
      tB = 0; const big = G.uiDirty; G.uiDirty = false;
      if (UI.tab && (big || UI.tab === 'mil' || UI.tab === 'for' || !G.paused)) UI.renderPanel();
      UI.renderSel(); UI.renderAtk(); UI.renderAlerts();
      if (big && (R.mode === 'stability' || R.mode === 'opposition')) G.dirtyAll = true;
    }
    UI.tickHeadlines(dt);
    if (G.evq.length && !UI.modalKind && !G.over) UI.showEvent();
    if (G.over && !UI.overShown) { if (UI.modalKind === 'event' || UI.modalKind === 'menu') UI.closeModal(); G.evq.length = 0; if (!UI.modalKind) { UI.overShown = true; ID.Screens.end(G); } }
    if (G.wantAutosave) { G.wantAutosave = false; ID.Screens.autosave(G); }
    if (ID.Tutorial && G.tut) ID.Tutorial.frame(G, dt);
  };

  /* ---------------------------------------------------------------- input wiring */
  UI.key = function (e) {
    const G = UI.G; if (!G || e.target.tagName === 'INPUT' && e.target.type === 'text' || e.target.tagName === 'SELECT') return;
    const k = e.key;
    if (UI.modalKind === 'event') { if (k >= '1' && k <= '9') { const b = document.querySelectorAll('#modal .choice')[+k - 1]; if (b) b.click(); } return; }
    if (k === 'Escape' && UI.aim) { UI.aim = null; document.getElementById('map').classList.remove('aim'); UI.toast('Order cancelled.', true); return; }
    if (k === 'Escape') { if (UI.modalKind) { if (UI.modalKind !== 'end' && UI.modalKind !== 'event') UI.closeModal(); } else if (UI.tab) UI.openTab(null); else if (UI.sel >= 0) acts.unsel(); else acts.menu(); return; }
    if (UI.modalKind) return;
    if (k === ' ') { e.preventDefault(); acts.pause(); return; }
    if (k >= '1' && k <= '5') { acts.speed(+k); return; }
    if (k === 'Enter') { if (UI.target()) acts.attack(); return; }
    const lk = k.toLowerCase();
    const t = TABS.find((x) => x[2].toLowerCase() === lk); if (t) { acts.tab(t[0]); return; }
    const m = MODES.find((x) => x[2].toLowerCase() === lk); if (m) { acts.mode(m[0]); return; }
    if (k === '+' || k === '=') R.zoomAt(innerWidth / 2, innerHeight / 2, 1.25); else if (k === '-' || k === '_') R.zoomAt(innerWidth / 2, innerHeight / 2, 0.8);
  };
  UI.keys = {};
  UI.init = function () {
    tipEl = $('#tip');
    document.addEventListener('click', (e) => {
      ID.Audio.unlock();
      const el = e.target.closest('[data-act]'); if (!el) return;
      if (el.dataset.off) { UI.toast(el.dataset.off); ID.Audio.play('bad'); return; }
      const fn = acts[el.dataset.act]; if (!fn) return;
      let a = el.dataset.a; if (a != null) { try { a = JSON.parse(a); } catch (x) { /* plain string */ } }
      if (el.classList.contains('b') || el.classList.contains('opt')) ID.Audio.play('click');
      fn(a, el);
      if (UI.G && !$('#hud').hidden) UI.after();
    });
    document.addEventListener('input', (e) => {
      const el = e.target; if (!el.dataset || !el.dataset.in) return;
      UI.busy = true; const fn = ins[el.dataset.in]; if (fn) fn(+el.value, el);
      const lab = el.parentElement && el.parentElement.querySelector('[data-val]'); if (lab) lab.textContent = el.dataset.fmt === 'mob' ? (el.value / 10).toFixed(1) + '%' : el.value + '%';
    });
    document.addEventListener('change', (e) => { if (e.target.dataset && e.target.dataset.in) { UI.busy = false; if (UI.G && !$('#hud').hidden) UI.after(); } const fn = e.target.dataset && acts[e.target.dataset.change]; if (fn) fn(e.target.value, e.target); });
    document.addEventListener('pointerdown', () => { UI.pointerDown = true; }, true);
    document.addEventListener('pointerup', () => { setTimeout(() => { UI.pointerDown = false; UI.busy = false; }, 60); }, true);
    document.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      const t = e.target.closest ? e.target.closest('[data-tip]') : null;
      if (t) { if (t !== tipFor) { tipFor = t; UI.showTip(t.getAttribute('data-tip')); } else placeTip(); }
      else if (tipFor) UI.hideTip();
    });
    document.addEventListener('keydown', (e) => { UI.keys[e.key.toLowerCase()] = true; UI.key(e); });
    document.addEventListener('keyup', (e) => { UI.keys[e.key.toLowerCase()] = false; });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    $('#ticker').addEventListener('click', () => { if (UI.G && !$('#hud').hidden) UI.openTab('world'); });
    UI.loadSettings();
  };
  UI.loadSettings = function () { try { const s = JSON.parse(localStorage.getItem('id_settings') || '{}'); Object.assign(UI.settings, s); } catch (e) { /* defaults */ } ID.Audio.vol = UI.settings.vol; ID.Audio.muted = UI.settings.muted; R.showBlocs = UI.settings.blocs; ID.Music.vol = UI.settings.music; ID.Music.on = UI.settings.musicOn; };
  UI.saveSettings = function () { try { localStorage.setItem('id_settings', JSON.stringify(UI.settings)); } catch (e) { /* storage unavailable */ } };

  /* Enter the HUD for a game. */
  UI.start = function (G) {
    UI.G = G; UI.sel = -1; R.selected = -1; UI.tab = null; UI.focusNation = 0; UI.overShown = false; UI._alKey = ''; topKey = '';
    $('#title').hidden = true; $('#hud').hidden = false; $('#drawer').hidden = true; $('#sel').hidden = true;
    UI.renderRail(); UI.renderTop(true, true); UI.renderModes(); UI.renderAtk(); UI.renderAlerts(); UI.renderTicker();
    R.quiet = false; G.dirtyAll = true;
    const n = P(); R.cam.z = Math.max(R.minZoom() * 1.55, 4); R.focus(n.capital);
  };
})();
