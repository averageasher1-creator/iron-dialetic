/* IRON DIALECTIC — the autocrat's madness. Under an absolute monarch or a personal dictator the
   interface itself starts to lie: propaganda cards drift across the map, the screen takes on the
   regime's tint, figures in the top band flicker to impossible values, and at the height of the cult
   the whole picture glitches and shouts. Nothing here blocks input: every layer ignores the pointer.
   The level (0–100) rises with authority, the cult or the crown, years in power, censorship, the
   political police, the ruler's age, a fulfilled destiny, and fear when things fall apart. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const UI = ID.UI, esc = ID.esc, clamp = ID.clamp;
  const M = (ID.Madness = {});

  M.kind = (n) => (n && n.ideo === 'absmon' ? 'crown' : n && n.ideo === 'personalist' ? 'leader' : null);
  M.level = function (G, n) {
    const k = M.kind(n); if (!k || !n.alive) return 0;
    let v = (k === 'crown' ? 22 : 30) + n.auth * 0.2 + (k === 'leader' ? n.charisma : n.tradition) * 0.15 + Math.min(20, n.age / 12);
    v += ({ propaganda: 14, censored: 8, regulated: 2, free: -12 })[n.laws.press] || 0;
    v += ({ terror: 14, secret: 8, police: 2, liberties: -8 })[n.laws.security] || 0;
    v += n.leader.age > 70 ? 10 : n.leader.age > 60 ? 4 : 0;
    if (n.destiny && !n.destiny.lapsed) v += 12;
    if (n.stab < 30) v += 8;
    return clamp(v, 0, 100);
  };
  M.stage = (v) => (v >= 80 ? 4 : v >= 64 ? 3 : v >= 44 ? 2 : v >= 22 ? 1 : 0);
  M.stageName = ['Sane', 'Devoted', 'Fervent', 'Delirious', 'Possessed'];

  const LINES = {
    crown: [
      ['BY THE GRACE OF GOD AND {L}', 'The Crown thanks you for your obedience.', 'Long live {L}.', 'Kneel. The anthem is playing.', 'Loyalty is its own reward. There is no other reward.'],
      ['His Majesty slept well. The harvest will be excellent.', 'There are no shortages. There have never been shortages.', 'Report all dreams of a republic to your parish priest.', 'The bells are ringing. They are ringing for you.', 'Every clock in {N} is now set by the Palace.'],
      ['THE HOUR BEFORE THE FALL IS THE ONLY HOUR', 'Treason is a fever. The cure is at the Palace.', 'Your loyalty has been noted. Your hesitation has also been noted.', 'The Crown remembers. The Crown remembers. The Crown remembers.', 'Do not look at the empty chairs in the Council.'],
      ['WIND THE CLOCKS BACK', 'THERE WAS NO REVOLUTION', 'THE CROWN KNOWS YOUR NAME', 'IT IS STILL 1910', 'KNEEL'],
    ],
    leader: [
      ['THE LEADER IS WATCHING', '{L} has personally approved this moment.', 'Long live {L}.', 'Applause will now continue.', 'The Leader was right about this, too.'],
      ['Doubt is a symptom. Report to the clinic.', 'Your neighbour is happy. Are you?', 'There was no famine. There will be no famine.', '{L} has read your thoughts and found them adequate.', 'Every portrait is a window. He is looking through it.'],
      ['LONG LIVE {LN}. LONGER THAN YOU.', 'This message has been approved by {L}.', 'The Leader does not sleep. He watches over you instead.', 'Smile. The cameras are for your safety.', 'Applause will now continue. Applause will now continue.'],
      ['HE IS LISTENING', 'THERE IS ONLY {LN}', 'DO NOT STOP CLAPPING', 'YOU HAVE ALWAYS LOVED HIM', 'APPLAUD'],
    ],
  };
  const MARK = { crown: 'THE CROWN REMEMBERS', leader: '{LN} IS WATCHING' };
  const FLASH = { crown: ['LONG LIVE THE CROWN', 'KNEEL', 'THE HOUR BEFORE THE FALL'], leader: ['LONG LIVE {LN}', 'APPLAUD', 'HE SEES YOU'] };
  const LIES = { 'sv-stab': ['100', 'ETERNAL', '∞'], 'sv-food': ['PLENTY', '∞'], 'sv-legit': ['DIVINE', '100', 'ABSOLUTE'], 'sv-gold': ['BOUNDLESS', '∞'], 'sv-troops': ['INVINCIBLE', '∞'], 'sv-pop': ['ALL OF THEM', 'LOYAL'], 'sv-ind': ['GLORIOUS'], 'sv-auth': ['TOTAL', '100'] };

  let root = null, pops = null, mark = null, flash = null, curStage = -1, curKind = null, tPop = 0, tLie = 0, tGlitch = 0, tFlash = 0;
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function fill(t, n) {
    const L = (n.leader.title ? n.leader.title + ' ' : '') + n.leader.name;
    return t.replace(/\{LN\}/g, n.leader.name.toUpperCase()).replace(/\{L\}/g, L).replace(/\{N\}/g, n.name).replace(/\{A\}/g, n.adj);
  }
  function build() {
    root = document.createElement('div'); root.id = 'madfx'; root.setAttribute('aria-hidden', 'true');
    root.innerHTML = '<div class="mtint"></div><div class="mvig"></div><div class="mscan"></div><div class="mmark"></div><div class="mpops"></div><div class="mflash"></div>';
    document.getElementById('app').appendChild(root);
    pops = root.querySelector('.mpops'); mark = root.querySelector('.mmark'); flash = root.querySelector('.mflash');
  }
  function setStage(st, kind, n) {
    const b = document.body;
    for (let k = 1; k <= 4; k++) b.classList.toggle('mad-' + k, st >= k);
    b.classList.toggle('mad-crown', st > 0 && kind === 'crown'); b.classList.toggle('mad-leader', st > 0 && kind === 'leader');
    if (mark) mark.textContent = st >= 3 && kind ? fill(MARK[kind], n) : '';
    curStage = st; curKind = kind;
  }
  function popup(n, kind, st) {
    const pool = LINES[kind]; const tier = Math.min(st, 4) - 1;
    const src = Math.random() < 0.65 ? pool[Math.max(0, tier)] : pool[Math.floor(Math.random() * (tier + 1))];
    const t = fill(src[Math.floor(Math.random() * src.length)], n);
    const d = document.createElement('div'); d.className = 'mpop t' + (tier + 1) + (t === t.toUpperCase() ? ' caps' : '');
    const W = innerWidth, H = innerHeight;
    d.style.left = Math.round(W * (0.12 + Math.random() * 0.62)) + 'px'; d.style.top = Math.round(H * (0.14 + Math.random() * 0.58)) + 'px';
    d.style.setProperty('--rot', ((Math.random() - 0.5) * (st >= 3 ? 14 : 6)).toFixed(1) + 'deg');
    d.innerHTML = '<span>' + esc(t) + '</span>';
    while (pops.childElementCount >= (st >= 4 ? 4 : 2)) pops.firstChild.remove(); // loud, never a wall
    pops.appendChild(d);
    setTimeout(() => d.remove(), st >= 4 ? 3200 : 4200);
  }
  function lie(st) {
    const ids = Object.keys(LIES), id = ids[Math.floor(Math.random() * ids.length)], el = document.getElementById(id); if (!el) return;
    const opts = LIES[id]; el.textContent = opts[Math.floor(Math.random() * opts.length)];
    el.classList.add('mlie'); setTimeout(() => el.classList.remove('mlie'), st >= 4 ? 1600 : 1100);
  }
  function doFlash(n, kind) {
    const L = FLASH[kind]; flash.textContent = fill(L[Math.floor(Math.random() * L.length)], n);
    flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on');
    if (ID.Audio && ID.Audio.play) ID.Audio.play('stamp');
  }
  function glitch() { const a = document.getElementById('app'); a.classList.remove('glitch'); void a.offsetWidth; a.classList.add('glitch'); setTimeout(() => a.classList.remove('glitch'), 260); }

  M.off = function () { if (curStage !== 0) setStage(0, null, null); if (pops) pops.innerHTML = ''; };
  M.frame = function (G, dt) {
    const n = G && G.nations[G.player];
    if (!n || UI.settings.madness === false || G.over) { M.off(); return; }
    const kind = M.kind(n), lv = kind ? M.level(G, n) : 0, st = M.stage(lv);
    n.a.madness = lv;
    if (!root) build();
    if (st !== curStage || kind !== curKind) setStage(st, kind, n);
    if (!st) return;
    const live = !G.paused && !UI.modalKind;
    if (!live) return;
    tPop += dt; tLie += dt; tGlitch += dt; tFlash += dt;
    const every = [0, 38, 20, 10, 5][st];
    if (tPop > every * (0.6 + Math.random() * 0.8)) { tPop = 0; popup(n, kind, st); if (st >= 4 && Math.random() < 0.4) popup(n, kind, st); }
    if (st >= 3 && tLie > (st >= 4 ? 2.2 : 4.5)) { tLie = 0; lie(st); }
    if (st >= 4 && !reduced() && tGlitch > 7 + Math.random() * 9) { tGlitch = 0; glitch(); }
    if (st >= 4 && tFlash > 50 + Math.random() * 40) { tFlash = 0; doFlash(n, kind); }
  };
})();
