/* IRON DIALECTIC — title, campaign setup, save slots, settings, challenges, records, end screens. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const UI = ID.UI, R = ID.Render, esc = ID.esc, clamp = ID.clamp;
  const Sc = (ID.Screens = {});
  const $ = UI.$, acts = UI.acts, btn = UI.btn, tip = UI.tip;

  /* ---------------------------------------------------------------- storage */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    raw(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };
  Sc.store = store;
  Sc.meta = () => store.get('id_meta', { runs: [] });
  const SLOTS = ['1', '2', '3', 'auto'];
  const slotName = (s) => (s === 'auto' ? 'Autosave' : 'Slot ' + s);

  function writeSave(G, slot) {
    const n = G.nations[G.player]; if (!n) return false;
    const ok = store.set('id_save_' + slot, ID.Game.save(G));
    if (!ok) return false;
    const idx = store.get('id_saves', {});
    idx[slot] = { name: n.name, ideo: n.ideo, date: ID.dateOf(G.tick).str, at: Date.now(), diff: G.difficulty, scen: G.scenario, ironman: !!G.ironman };
    store.set('id_saves', idx);
    return true;
  }
  Sc.autosave = function (G) { if (G && !G.over && !G.tut) writeSave(G, 'auto'); };
  function latestSlot() { const idx = store.get('id_saves', {}); let best = null; for (const s of SLOTS) if (idx[s] && store.raw('id_save_' + s) && (!best || idx[s].at > idx[best].at)) best = s; return best; }

  /* ---------------------------------------------------------------- entering a game */
  Sc.enterGame = function (G) {
    ID.Main.mode = 'game'; ID.Main.bg = null;
    $('#title').innerHTML = ''; $('#title').className = 'screen'; $('#title').hidden = true;
    UI.closeModal();
    R.setMode('political'); R.setGame(G); R.quiet = false;
    Sc.applyChallenge(G, false);
    UI.start(G);
    if (G.tut && ID.Tutorial) ID.Tutorial.start(G); else $('#coach').hidden = true;
    if (G.paused && !G.tut) UI.toast('The clock is stopped. Press Space to begin.', true);
  };

  Sc.applyChallenge = function (G, fresh) {
    const ch = G.challenge ? ID.CHALLENGES.find((c) => c.id === G.challenge) : null;
    G.challengeMods = null; if (!ch) return;
    const s = ch.setup, n = G.nations[G.player]; if (!n) return;
    if (fresh) {
      if (s.hostile) for (const o of ID.alive(G)) if (o !== n && ID.borders(G, n.id, o.id)) { G.rel[o.id * ID.MAXN + n.id] = -70; G.rel[n.id * ID.MAXN + o.id] = -60; o.a.grace = 360; }
      if (s.frail) { n.leader.age = 73; n.stab = 30; n.gold = 0; n.legit = 40; }
      if (s.earlyDepression) G.world.depressionAt = G.tick + 150;
      if (s.embargo) n.flags.embargoed = 1;
    }
    if (s.embargo) G.challengeMods = (g) => {
      const p = g.nations[g.player]; if (!p) return;
      if (ID.yearOf(g.tick) >= 1925) { p.flags.embargoed = 0; return; }
      for (const o of ID.alive(g)) { const d = g.dip[ID.dkey(p.id, o.id)]; if (d && d.trade) d.trade = 0; }
    };
  };

  /* ---------------------------------------------------------------- title */
  function bgWorld() {
    const seed = (Math.random() * 1e9) >>> 0;
    const G = ID.newGame({ seed, scenario: 'random', size: 'std', headless: true });
    for (let k = 0; k < 360 * 4 && !G.over; k++) ID.Game.tick(G);
    G.headless = false; G.dirtyAll = true; G.speed = 0; G.paused = false; G.fx.length = 0; G.sfx.length = 0;
    return G;
  }
  Sc.title = function () {
    ID.Main.mode = 'title'; UI.G = null; UI.closeModal();
    $('#hud').hidden = true; $('#coach').hidden = true; UI.hideTip();
    let G = null; try { G = bgWorld(); } catch (e) { console.error(e); }
    ID.Main.bg = G;
    R.setMode('ideology'); if (G) { R.setGame(G); R.quiet = true; R.selected = -1; }
    const meta = Sc.meta(), unlocked = ID.CHALLENGES.filter((c) => c.unlock(meta)).length, last = latestSlot();
    const idx = store.get('id_saves', {});
    const t = $('#title'); t.className = 'screen'; t.hidden = false;
    t.innerHTML = '<div class="veil"></div><div class="slab"><h1>Iron<span>Dialectic</span></h1></div>' +
      '<p class="sub">A grand strategy of belief and power. Twenty-two ways to run a country, and every one of them can fall.</p>' +
      '<div class="menu">' +
      (last ? btn('Continue <small>' + esc(idx[last].name) + ', ' + esc(idx[last].date) + '</small>', 'loadSlot', last, { cls: 'big red' }) : '') +
      btn('New campaign <small>1910–1976</small>', 'newGame', null, { cls: 'big' + (last ? '' : ' red') }) +
      btn('Learn to play <small>guided, 15 minutes</small>', 'tutorial', null, { cls: 'big' }) +
      '<div class="row">' + btn('Load', 'loadMenu', null, { cls: 'ghost' }) + btn('Challenges <small>' + unlocked + ' / ' + ID.CHALLENGES.length + '</small>', 'challenges', null, { cls: 'ghost' }) + btn('Records <small>' + meta.runs.length + '</small>', 'records', null, { cls: 'ghost' }) + btn('Handbook', 'handbookT', null, { cls: 'ghost' }) + btn('Settings', 'settings', null, { cls: 'ghost' }) + '</div>' +
      '</div><div class="foot">Plays entirely with left-click, drag, scroll and keys. Saves stay in this browser.</div>';
  };

  /* ---------------------------------------------------------------- campaign setup */
  const S = (Sc.S = { scenario: 'meridia', seed: 0, size: 'std', difficulty: 'iron', nation: 0, ideo: null, challenge: null, startYear: 0, ironman: false, retry: false });
  let SG = null;
  function genSetup() {
    const opts = { scenario: S.scenario, seed: S.seed, size: S.size, difficulty: S.difficulty, headless: false, startYear: S.startYear || 0, challenge: S.challenge, ironman: S.ironman };
    SG = ID.newGame(opts); SG.paused = true;
    R.setMode('political'); R.setGame(SG); R.quiet = true;
    const ns = ID.alive(SG);
    if (!SG.nations[S.nation] || !SG.nations[S.nation].alive) S.nation = (ns.find((n) => n.tutorial) || ns[0]).id;
  }
  Sc.setup = function (o) {
    Object.assign(S, { scenario: 'meridia', seed: (Math.random() * 1e6) | 0, size: 'std', difficulty: 'iron', nation: 0, ideo: null, challenge: null, startYear: 0, ironman: false, retry: false }, o || {});
    ID.Main.mode = 'setup'; ID.Main.bg = null; UI.G = null; UI.closeModal();
    $('#hud').hidden = true; $('#coach').hidden = true;
    genSetup();
    if (o && o.nationBase) { const n = ID.alive(SG).find((x) => x.base === o.nationBase); if (n) S.nation = n.id; }
    renderSetup();
    const n = SG.nations[S.nation]; R.focus(n.capital); R.selected = n.capital;
  };
  function stars(d) { return '<span class="stars"' + tip('Difficulty of the starting situation') + '>' + '★'.repeat(d) + '☆'.repeat(5 - d) + '</span>'; }
  function ideoSelect(cur, base) {
    let h = '<select data-change="pickIdeo" id="sel-ideo" style="width:100%">';
    for (const fam in ID.FAMILIES) {
      h += '<optgroup label="' + ID.FAMILIES[fam].name + '">';
      for (const I of ID.IDEO_LIST.filter((i) => i.family === fam)) h += '<option value="' + I.id + '"' + (I.id === cur ? ' selected' : '') + '>' + esc(I.name) + (I.id === base ? ' (historical)' : '') + '</option>';
      h += '</optgroup>';
    }
    return h + '</select>';
  }
  function renderSetup() {
    const t = $('#title'); t.hidden = false; t.className = 'screen setup';
    const ns = ID.alive(SG).slice(); if (S.scenario === 'random') ns.sort((a, b) => b.tiles - a.tiles);
    const ch = S.challenge ? ID.CHALLENGES.find((c) => c.id === S.challenge) : null;
    let h = '<div class="pick"><div class="dh"><h2>' + (ch ? esc(ch.name) : 'New campaign') + '</h2><button class="x" data-act="toTitle"' + tip('Back to the title screen') + '>✕</button></div><div class="db">';
    if (ch) h += '<div class="note red">' + esc(ch.desc) + '</div>';
    else {
      h += '<div class="field"><label>World</label><div class="seg">' + [['meridia', 'The Two Continents'], ['random', 'Random world']].map((x) => '<button class="' + (S.scenario === x[0] ? 'on' : '') + '" data-act="setScen" data-a=\'"' + x[0] + '"\'>' + x[1] + '</button>').join('') + '</div><small>' + (S.scenario === 'meridia' ? esc(ID.SCENARIOS.meridia.desc) : 'A new map from a seed. Share the seed and someone else gets the same world.') + '</small></div>';
      if (S.scenario === 'random') {
        h += '<div class="field"><label>Seed and size</label><div class="row nw"><input type="text" value="' + S.seed + '" data-change="seed" style="width:120px"' + tip('Type a number and press Enter') + '>' + btn('New seed', 'reroll', null, { cls: 'ghost' }) + '</div><div class="seg" style="margin-top:6px">' + Object.keys(ID.MAP_SIZES).map((k) => '<button class="' + (S.size === k ? 'on' : '') + '" data-act="setSize" data-a=\'"' + k + '"\'' + tip(ID.MAP_SIZES[k].desc) + '>' + ID.MAP_SIZES[k].name + '</button>').join('') + '</div></div>';
      }
      h += '<div class="field"><label>Difficulty</label><div class="seg">' + Object.keys(ID.DIFFICULTY).map((k) => '<button class="' + (S.difficulty === k ? 'on' : '') + '" data-act="setDiff" data-a=\'"' + k + '"\'' + tip(ID.DIFFICULTY[k].desc) + '>' + ID.DIFFICULTY[k].name + '</button>').join('') + '</div><small>' + esc(ID.DIFFICULTY[S.difficulty].desc) + '</small></div>';
    }
    h += '<div class="field"><label>Choose a state <span class="dim" style="font-weight:500">— or click one on the map</span></label>';
    for (const n of ns) {
      const sit = ID.SITUATIONS[n.sit] || ID.SITUATIONS.middling;
      h += '<button class="nrow' + (n.id === S.nation ? ' on' : '') + '" data-act="pickNation" data-a="' + n.id + '">' + ID.Flags.html(n, 'mini') + '<b>' + esc(n.base) + '</b>' + stars(sit.diff) + '<small>' + esc(ID.IDEOLOGIES[n.ideo].name) + ' · ' + esc(sit.name.toLowerCase()) + '</small></button>';
    }
    h += '</div></div><div class="ft">' + btn('Begin', 'begin', null, { cls: 'big red' }) + '<span class="sp"></span>' + btn('Back', 'toTitle', null, { cls: 'ghost' }) + '</div></div>';
    h += '<div class="pickcard" id="pickcard">' + pickCard() + '</div>';
    t.innerHTML = h;
  }
  function pickCard() {
    const n = SG.nations[S.nation]; if (!n) return '';
    const ideo = S.ideo || n.ideo, I = ID.IDEOLOGIES[ideo], sit = ID.SITUATIONS[n.sit] || ID.SITUATIONS.middling, M = ID.ECON[I.econ.model];
    const fl = ID.Flags.html({ id: n.id, base: n.base, ideo, color: n.color }, 'pflag');
    let h = '<div class="row nw" style="align-items:flex-start;gap:10px">' + fl + '<h2>' + esc(ID.nationTitle(n, ideo)) + '</h2></div><div class="row" style="margin:4px 0 8px">' + UI.ideoTag(ideo) + stars(sit.diff) + '<b style="font-size:14px">' + esc(sit.name) + '</b></div>';
    h += '<p class="lead">' + esc(n.blurb || sit.text) + '</p>';
    if (n.blurb) h += '<p class="lead dim" style="font-size:14px">' + esc(sit.text) + '</p>';
    h += UI.kv([['Land', Math.round((n.tiles / SG.landCount) * 100) + '% of the world'], ['People', ID.fmtPop(n.pop)], ['Troops', ID.fmtPop(n.troops)], ['Factories', n.nb[ID.B.FACTORY] + ''], ['Neighbours', Object.keys(SG.border[n.id] || {}).length + '']]);
    h += '<div class="field" style="margin-top:10px"><label>System of government</label>' + ideoSelect(ideo, n.ideo) + '<small>' + (S.retry ? '<b class="bad">Try a different system this time.</b> ' : '') + 'Start under the historical regime, or rewrite it. Every system plays differently.</small></div>';
    h += '<p class="lead"><b>' + esc(I.name) + '.</b> ' + esc(I.short) + '</p>';
    h += UI.kv([['Economy', esc(M.name)], ['Government', esc(ID.CONTROL[I.control.type].name)], ['Legitimacy from', Object.keys(I.legit).sort((a, b) => I.legit[b] - I.legit[a]).slice(0, 2).map((k) => ID.LEGIT[k].name.toLowerCase()).join(', ')]]);
    h += '<ul class="plus">' + I.perks.slice(0, 3).map((p) => '<li>' + esc(p) + '</li>').join('') + '</ul><ul class="minus">' + I.flaws.slice(0, 3).map((p) => '<li>' + esc(p) + '</li>').join('') + '</ul>';
    h += '<div class="note"><b>Grand objective: ' + esc(I.objective.name) + '.</b> ' + esc(I.objective.desc) + '</div>';
    h += '<div class="row" style="margin-top:6px"><button class="b sm ghost" data-act="handbookT" data-a=\'"i:' + ideo + '"\'>The theory behind it</button></div>';
    return h;
  }
  Sc.pickAt = function (i) {
    if (!SG || i < 0) return; const o = SG.owner[i]; if (!o) return;
    S.nation = o; S.ideo = null; R.selected = SG.nations[o].capital; renderSetup(); ID.Audio.play('click');
  };
  acts.newGame = () => Sc.setup({});
  acts.setScen = (a) => { S.scenario = a; S.nation = 0; S.ideo = null; genSetup(); renderSetup(); };
  acts.setSize = (a) => { S.size = a; S.nation = 0; genSetup(); renderSetup(); };
  acts.setDiff = (a) => { S.difficulty = a; renderSetup(); };
  acts.seed = (v) => { S.seed = (parseInt(v, 10) >>> 0) || ID.hashStr(String(v)); S.nation = 0; genSetup(); renderSetup(); };
  acts.reroll = () => { S.seed = (Math.random() * 1e6) | 0; S.nation = 0; genSetup(); renderSetup(); };
  acts.pickNation = (a) => { S.nation = a; S.ideo = null; const n = SG.nations[a]; R.focus(n.capital); R.selected = n.capital; renderSetup(); };
  acts.pickIdeo = (v) => { S.ideo = v; $('#pickcard').innerHTML = pickCard(); };
  acts.begin = () => {
    const G = SG; if (!G) return;
    G.difficulty = S.difficulty; G.challenge = S.challenge; G.ironman = !!S.ironman;
    const n = G.nations[S.nation];
    ID.setPlayer(G, n.id, S.ideo && S.ideo !== n.ideo ? S.ideo : null);
    n.a.startIdeo = n.ideo;
    Sc.applyChallenge(G, true);
    G.paused = true; G.speed = 3; R.selected = -1;
    ID.chron(G, 'start', 'You take charge of ' + n.name + '.', n.id);
    SG = null;
    Sc.enterGame(G);
  };
  acts.tutorial = () => {
    const G = ID.newGame({ scenario: 'meridia', difficulty: 'statesman', headless: false });
    const n = ID.alive(G).find((x) => x.tutorial) || ID.alive(G)[0];
    ID.setPlayer(G, n.id); n.a.startIdeo = n.ideo;
    G.paused = true; G.speed = 2; G.tut = { step: 0, t0: G.tick, war: 0 };
    for (const o of ID.alive(G)) if (o !== n) o.a.grace = 360 * 4;
    Sc.enterGame(G);
  };
  acts.toTitle = () => { SG = null; Sc.title(); };

  /* ---------------------------------------------------------------- in-game menu, saves, settings */
  acts.menu = () => {
    const G = UI.G; if (!G) return;
    const wasPaused = G.paused; G.paused = true;
    UI.modal('<div class="dlg"><div class="dhd"><div class="k">MENU</div><div class="d">' + ID.dateOf(G.tick).str + '</div></div><div class="dbd"><div class="col">' +
      btn('Resume', 'resume', wasPaused ? 0 : 1, { cls: 'big red' }) +
      btn('Save game', 'saveMenu', null, { cls: 'big', off: G.ironman ? 'No manual saves in this challenge. The game autosaves each January.' : G.tut ? 'The tutorial cannot be saved.' : '' }) +
      btn('Load game', 'loadMenu', null, { cls: 'big' }) +
      btn('Settings', 'settings', null, { cls: 'big' }) +
      btn('Quit to title', 'quit', null, { cls: 'big ghost', tip: G.tut ? '' : 'Your progress is autosaved first.' }) +
      '</div></div></div>', 'menu');
  };
  acts.resume = (a) => { UI.closeModal(); if (UI.G && a) UI.setPaused(false); };
  acts.quit = () => { if (UI.G && !UI.G.over) Sc.autosave(UI.G); Sc.title(); };
  function slotsHtml(mode) {
    const idx = store.get('id_saves', {}); let h = '';
    for (const s of SLOTS) {
      const m = idx[s], has = m && store.raw('id_save_' + s);
      if (mode === 'save' && s === 'auto') continue;
      h += '<div class="slot"><b>' + slotName(s) + '</b>' + (has ? btn('Load', 'loadSlot', s, { cls: 'sm' }) : '<span></span>') + (mode === 'save' ? btn(has ? 'Overwrite' : 'Save here', 'saveSlot', s, { cls: 'sm red' }) : has ? btn('Delete', 'delSlot', s, { cls: 'sm ghost' }) : '<span></span>') +
        '<small>' + (has ? esc(m.name) + ' · ' + esc(ID.IDEOLOGIES[m.ideo] ? ID.IDEOLOGIES[m.ideo].name : '') + ' · ' + esc(m.date) + ' · ' + esc(ID.DIFFICULTY[m.diff] ? ID.DIFFICULTY[m.diff].name : '') + '<br>saved ' + new Date(m.at).toLocaleString() : 'Empty') + '</small></div>';
    }
    return h;
  }
  acts.saveMenu = () => UI.modal('<div class="dlg"><div class="dhd"><div class="k">SAVE</div></div><div class="dbd">' + slotsHtml('save') + '<div class="row">' + btn('Back', 'menu', null, { cls: 'ghost' }) + '</div></div></div>', 'menu');
  acts.loadMenu = () => UI.modal('<div class="dlg"><div class="dhd"><div class="k">LOAD</div></div><div class="dbd">' + slotsHtml('load') + '<div class="row">' + btn('Back', UI.G ? 'menu' : 'closeModal', null, { cls: 'ghost' }) + '</div></div></div>', 'menu');
  acts.saveSlot = (s) => { if (writeSave(UI.G, s)) { UI.toast('Saved to ' + slotName(s) + '.', true); acts.saveMenu(); } else UI.toast('Could not save: this browser’s storage is full or switched off.'); };
  acts.delSlot = (s) => { store.del('id_save_' + s); const idx = store.get('id_saves', {}); delete idx[s]; store.set('id_saves', idx); acts.loadMenu(); };
  acts.loadSlot = (s) => {
    const raw = store.raw('id_save_' + s); if (!raw) { UI.toast('That slot is empty.'); return; }
    let G = null; try { G = ID.Game.load(raw); } catch (e) { console.error(e); UI.toast('That save could not be read.'); return; }
    G.paused = true; Sc.enterGame(G); UI.toast('Loaded ' + slotName(s) + '. Press Space to resume.', true);
  };
  acts.settings = () => {
    const s = UI.settings;
    UI.modal('<div class="dlg"><div class="dhd"><div class="k">SETTINGS</div></div><div class="dbd">' +
      '<div class="field"><label>Sound</label><div class="sl" style="grid-template-columns:90px 1fr 58px"><span>Volume</span><input type="range" min="0" max="100" value="' + Math.round(s.vol * 100) + '" data-in="vol"><b data-val>' + Math.round(s.vol * 100) + '%</b></div>' + '<div class="sl" style="grid-template-columns:90px 1fr 58px"><span>Music</span><input type="range" min="0" max="100" value="' + Math.round(s.music * 100) + '" data-in="mvol"><b data-val>' + Math.round(s.music * 100) + '%</b></div><div class="row">' + btn(s.muted ? 'All sound is off' : 'Sound is on', 'toggleMute', null, { cls: 'sm ' + (s.muted ? 'ghost' : 'on') }) + btn(s.musicOn ? 'Music is on' : 'Music is off', 'toggleMusic', null, { cls: 'sm ' + (s.musicOn ? 'on' : 'ghost') }) + '</div></div>' +
      '<div class="field"><label>Two-finger scroll and mouse wheel</label><div class="seg">' + [['auto', 'Automatic'], ['pan', 'Scroll pans'], ['zoom', 'Scroll zooms']].map((x) => '<button class="' + ((s.scroll || 'auto') === x[0] ? 'on' : '') + '" data-act="scrollMode" data-a=\'"' + x[0] + '"\'>' + x[1] + '</button>').join('') + '</div><small>Automatic: a trackpad’s two-finger scroll pans and pinch zooms; a mouse wheel zooms.</small></div>' +
      '<div class="field"><label>Map</label>' + btn(R.showBlocs ? 'Bloc borders shown' : 'Bloc borders hidden', 'toggleBlocs', null, { cls: 'sm ' + (R.showBlocs ? 'on' : 'ghost') }) + '</div>' +
      '<div class="field"><label>Records</label>' + btn('Erase run records and unlocks', 'resetRecords', null, { cls: 'sm ghost' }) + '</div>' +
      '<div class="row">' + btn('Done', UI.G ? 'menu' : 'closeModal', null, { cls: 'red' }) + '</div></div></div>', 'menu');
  };
  acts.toggleMute = () => { UI.settings.muted = !UI.settings.muted; ID.Audio.setVol(UI.settings.vol, UI.settings.muted); UI.saveSettings(); acts.settings(); };
  acts.toggleMusic = () => { UI.settings.musicOn = !UI.settings.musicOn; ID.Music.set(UI.settings.music, UI.settings.musicOn); UI.saveSettings(); acts.settings(); };
  acts.toggleBlocs = () => { R.showBlocs = !R.showBlocs; UI.settings.blocs = R.showBlocs; UI.saveSettings(); if (UI.G) UI.G.dirtyAll = true; else if (ID.Main.bg) ID.Main.bg.dirtyAll = true; acts.settings(); };
  acts.scrollMode = (a) => { UI.settings.scroll = a; UI.saveSettings(); acts.settings(); };
  acts.resetRecords = () => { store.set('id_meta', { runs: [] }); UI.toast('Records erased.', true); acts.settings(); };

  /* ---------------------------------------------------------------- handbook from the title */
  Sc.handbook = function () {
    UI.modal('<div class="dlg wide"><div class="dhd"><div class="k">HANDBOOK</div><button class="b spd" style="margin-left:auto;width:44px;height:auto" data-act="closeModal">✕</button></div><div class="dbd">' + ID.Panels.help(UI.G, UI.G ? UI.P() : null) + '</div></div>', 'help');
  };
  const inGameHelp = acts.help;
  acts.help = (a) => { if ($('#hud').hidden || UI.modalKind === 'help') { UI.helpPage = a; Sc.handbook(); } else inGameHelp(a); };
  acts.handbookT = (a) => { UI.helpPage = a || 'play'; Sc.handbook(); };

  /* ---------------------------------------------------------------- challenges and records */
  acts.challenges = () => {
    const meta = Sc.meta();
    UI.modal('<div class="dlg wide"><div class="dhd"><div class="k">CHALLENGES</div></div><div class="dbd"><p class="lead">Harder starts, unlocked by what you have survived — and what you have not.</p>' +
      ID.CHALLENGES.map((c) => { const ok = c.unlock(meta); return '<div class="dec"><h4>' + esc(c.name) + '</h4><p>' + esc(ok ? c.desc : 'Locked. ' + c.hint) + '</p><span></span>' + btn(ok ? 'Play' : 'Locked', 'playChallenge', c.id, { cls: 'sm red', off: ok ? '' : c.hint }) + '</div>'; }).join('') +
      '<div class="row">' + btn('Back', 'closeModal', null, { cls: 'ghost' }) + '</div></div></div>', 'menu');
  };
  acts.playChallenge = (id) => {
    const c = ID.CHALLENGES.find((x) => x.id === id), s = c.setup;
    const o = { scenario: s.scenario === 'random' ? 'random' : 'meridia', difficulty: s.difficulty, challenge: c.id, startYear: s.startYear || 0, ironman: !!s.ironman };
    if (s.nation) o.nationBase = s.nation;
    Sc.setup(o);
  };
  acts.records = () => {
    const runs = Sc.meta().runs.slice().reverse();
    const res = { victory: '<b class="good">Victory</b>', defeat: '<b class="bad">Fell</b>', survived: 'Survived' };
    UI.modal('<div class="dlg wide"><div class="dhd"><div class="k">RECORDS</div><div class="d">' + runs.length + ' campaigns</div></div><div class="dbd">' +
      (runs.length ? '<table class="t"><tr><th>Played</th><th>State</th><th>System</th><th>Outcome</th><th class="n">Year</th></tr>' + runs.slice(0, 60).map((r) => '<tr' + tip(esc(r.head || '')) + '><td class="dim">' + new Date(r.at).toLocaleDateString() + '</td><td>' + esc(r.nation) + '</td><td>' + (r.ideoStart && r.ideoStart !== r.ideo ? esc(ID.IDEOLOGIES[r.ideoStart].name) + ' → ' : '') + esc(ID.IDEOLOGIES[r.ideo] ? ID.IDEOLOGIES[r.ideo].name : r.ideo) + '</td><td>' + (res[r.result] || esc(r.result)) + ' <span class="dim">' + esc(r.type || '') + '</span></td><td class="n">' + r.year + '</td></tr>').join('') + '</table>' : '<p class="lead">No campaigns finished yet. Every one you finish — however it ends — is recorded here.</p>') +
      '<div class="row" style="margin-top:10px">' + btn('Back', 'closeModal', null, { cls: 'ghost' }) + '</div></div></div>', 'menu');
  };

  /* ---------------------------------------------------------------- end of a campaign */
  function recordRun(G) {
    const n = G.nations[G.over.nation || G.player]; if (!n || G.tut || G.over.recorded) return;
    G.over.recorded = 1;
    const meta = Sc.meta();
    meta.runs.push({ at: Date.now(), nation: n.base, ideo: n.ideo, ideoStart: n.a.startIdeo || n.ideo, result: G.over.result, type: G.over.type === 'objective' ? ID.ideo(n).objective.name : G.over.name || G.over.type, year: G.over.year, scen: G.scenario, diff: G.difficulty, civilWarsWon: n.cnt.civilWarsWon || 0, head: G.over.pm ? G.over.pm.head : G.over.name || '' });
    if (meta.runs.length > 200) meta.runs.splice(0, meta.runs.length - 200);
    store.set('id_meta', meta);
    store.del('id_save_auto'); const idx = store.get('id_saves', {}); delete idx.auto; store.set('id_saves', idx);
  }
  Sc.end = function (G) {
    recordRun(G); G.paused = true; UI.openTab(null); $('#coach').hidden = true;
    const o = G.over, n = G.nations[o.nation || G.player], C = ID.Game.chronicle(G);
    const stat = (v, l) => '<div><b>' + v + '</b><span>' + l + '</span></div>';
    const big = '<div class="bigstats">' + stat(C.years, 'years') + stat(Math.round((C.peak / G.landCount) * 100) + '%', 'largest share of the world') + stat(C.wars, 'wars in the world') + stat(C.revolutions + C.civilWars, 'revolutions, coups and civil wars') + '</div>';
    const foot = '<div class="row" style="margin-top:14px">' + btn('Try again as a different system', 'retry', null, { cls: 'big red' }) + btn('Read the chronicle', 'chronicle', null, { cls: 'big' }) + '<span class="sp"></span>' + btn('Title screen', 'toTitle', null, { cls: 'ghost' }) + '</div>';
    let h;
    if (o.result === 'defeat') {
      const pm = o.pm;
      h = '<div class="dlg xwide pm"><div class="dhd"><div class="k">THE STATE HAS FALLEN</div><div class="d">' + ID.dateOf(G.tick).str + '</div></div><div class="dbd"><h2>' + esc(pm.head) + '</h2><p class="cause">' + esc(pm.cause) + '</p><div class="cols"><div>';
      if (pm.turned) h += '<h3>Who turned: ' + esc(pm.fname) + '</h3><p style="font-size:15px;margin-bottom:6px">Support <b class="bad">' + pm.support + '</b> while holding <b>' + pm.power + '%</b> of political power.</p>' + (pm.demands.length ? '<p style="font-size:14px;color:var(--ink2)">What had turned them:</p><ul class="minus">' + pm.demands.map((d) => '<li>' + esc(d) + '</li>').join('') + '</ul>' : '');
      h += '<h3 style="margin-top:10px">Legitimacy at the end</h3>' + pm.legit.map((l) => '<div class="part"><span>' + esc(l[0]) + ' <span class="dim">' + l[2] + '%</span></span>' + UI.bar(l[1], 100, l[1] < 35 ? 'r' : l[1] < 50 ? 'o' : 'g') + '<b>' + l[1] + '</b></div>').join('');
      h += '<h3 style="margin-top:10px">The state at the end</h3>' + UI.kv([['Stability', pm.stats.stab], ['Unrest', pm.stats.unrest], ['War weariness', pm.stats.we], ['Living standards', pm.stats.ls], ['Hidden grievance', pm.stats.grievance]]);
      h += '</div><div><h3>The last years</h3><div class="tl">' + (pm.timeline.length ? pm.timeline.map((x) => '<div><span>' + esc(x.date) + '</span><span>' + esc(x.text) + '</span></div>').join('') : '<div><span></span><span class="dim">No warnings were recorded. It came all at once.</span></div>') + '</div></div></div>';
      if (pm.advice) h += '<div class="adv"><b>Next time</b>' + esc(pm.advice) + '</div>';
      h += big + foot + '</div></div>';
    } else {
      const title = o.result === 'victory' ? (o.type === 'objective' ? ID.ideo(n).objective.name : o.name) : 'The verdict of history';
      const k = o.result === 'victory' ? 'VICTORY' : 'THE CENTURY CLOSES';
      const text = o.result === 'victory'
        ? (o.type === 'objective' ? ID.ideo(n).objective.desc + ' It is done.' : o.type === 'verdict' ? 'Sixty-six years on, no state stands higher than ' + n.name + '.' : 'By ' + o.year + ', ' + n.name + ' has achieved what no rival could stop.')
        : n.name + ' endures to ' + o.year + ', ranked #' + (o.info && o.info.rank) + ' among the surviving states. Others will write this century’s history.';
      h = '<div class="dlg xwide"><div class="dhd"><div class="k">' + k + '</div><div class="d">' + ID.dateOf(G.tick).str + '</div></div><div class="dbd"><h2>' + esc(title) + '</h2><p class="tx">' + esc(text) + '</p>' +
        '<p class="lead">' + esc(n.name) + ' began as ' + esc(C.fate.started) + (C.fate.changed ? ' and ended as ' + esc(C.fate.name) : ' and kept its system to the end') + '. At the close ' + C.fate.n + ' state' + (C.fate.n === 1 ? '' : 's') + ' and ' + Math.round(C.fate.share * 100) + '% of humanity lived under ' + esc(C.fate.name) + '.</p>' + big +
        '<div class="chron" style="max-height:260px;overflow-y:auto">' + C.entries.slice(-30).map((c) => '<div><span>' + ID.dateOf(c.t).short + '</span><span>' + esc(c.text) + '</span></div>').join('') + '</div>' + foot + '</div></div>';
    }
    UI.modal(h, 'end');
  };
  acts.retry = () => {
    const G = UI.G; if (!G) return; const n = G.nations[(G.over && G.over.nation) || G.player];
    Sc.setup({ scenario: G.scenario, seed: G.seed, size: G.size, difficulty: G.difficulty, nationBase: n ? n.base : null, retry: true, challenge: G.challenge, startYear: G.challenge ? ID.yearOf(G.startTick || 0) : 0, ironman: G.ironman });
  };
  acts.chronicle = () => {
    const G = UI.G; if (!G) return; const C = ID.Game.chronicle(G);
    UI.modal('<div class="dlg xwide"><div class="dhd"><div class="k">CHRONICLE</div><div class="d">' + ID.yearOf(G.startTick || 0) + '–' + ID.yearOf(G.tick) + '</div></div><div class="dbd"><h2>The history of ' + esc(C.nation.name) + ' and the world</h2>' +
      '<div class="bigstats"><div><b>' + C.wars + '</b><span>wars declared</span></div><div><b>' + C.civilWars + '</b><span>civil wars</span></div><div><b>' + C.conquests + '</b><span>states conquered</span></div><div><b>' + C.nukes + '</b><span>atomic events</span></div></div>' +
      '<div class="chron">' + C.all.map((c) => '<div style="' + (c.a === C.nation.id || c.b === C.nation.id ? 'font-weight:600' : '') + '"><span>' + ID.dateOf(c.t).short + '</span><span>' + esc(c.text) + '</span></div>').join('') + '</div>' +
      '<div class="row" style="margin-top:12px">' + btn('Back', 'endAgain', null, { cls: 'red' }) + '</div></div></div>', 'end');
  };
  acts.endAgain = () => { if (UI.G && UI.G.over) Sc.end(UI.G); };
})();
