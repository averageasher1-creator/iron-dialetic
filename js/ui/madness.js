/* IRON DIALECTIC — the autocrat's banner. Under an absolute monarch or a personal dictator a great
   banner of slogans sweeps across the screen from time to time: rarely and quietly at first, often,
   wide and loud at the height of the cult. It never takes the pointer.
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

  let root = null, track = null, curKind = null, tNext = 20, tOff = 0, showing = false;
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function fill(t, n) {
    const L = (n.leader.title ? n.leader.title + ' ' : '') + n.leader.name;
    return t.replace(/\{LN\}/g, n.leader.name.toUpperCase()).replace(/\{L\}/g, L).replace(/\{N\}/g, n.name).replace(/\{A\}/g, n.adj);
  }
  function build() {
    root = document.createElement('div'); root.id = 'madban'; root.setAttribute('aria-hidden', 'true');
    root.innerHTML = '<div class="mb-track"></div>';
    document.getElementById('app').appendChild(root);
    track = root.querySelector('.mb-track');
  }
  /* pick slogans for the stage: the higher the stage, the more of the shouted, all-capitals lines */
  function slogans(n, kind, st) {
    const pool = LINES[kind], out = [], tier = Math.min(4, st) - 1;
    for (let k = 0; k < 3; k++) { const t = Math.random() < 0.6 ? tier : Math.floor(Math.random() * (tier + 1)); const L = pool[Math.max(0, t)]; out.push(fill(L[Math.floor(Math.random() * L.length)], n).toUpperCase()); }
    out.push(fill(MARK[kind], n));
    return out;
  }
  function show(n, kind, st) {
    const L = slogans(n, kind, st), sep = '<i>' + (kind === 'crown' ? '♛' : '★') + '</i>';
    const run = L.map((t) => '<b>' + esc(t) + '</b>').join(sep) + sep;
    track.innerHTML = '<div>' + run + run + '</div>';
    root.className = 'on k-' + kind + ' s' + st + (reduced() ? ' still' : '');
    root.style.setProperty('--loop', (10 + L.join('').length * 0.12).toFixed(1) + 's');
    showing = true; tOff = [0, 7, 9, 11, 14][st];
    if (ID.Audio && ID.Audio.play && st >= 3) ID.Audio.play('stamp');
  }
  function hide() { if (root) root.className = root.className.replace(/\bon\b/, '').trim(); showing = false; }

  M.off = function () { hide(); };
  M.frame = function (G, dt) {
    const n = G && G.nations[G.player];
    if (!n || UI.settings.madness === false || G.over) { M.off(); return; }
    const kind = M.kind(n), lv = kind ? M.level(G, n) : 0, st = M.stage(lv);
    n.a.madness = lv;
    if (!root) build();
    if (!st || kind !== curKind) { curKind = kind; if (!st) { hide(); return; } }
    const live = !G.paused && !UI.modalKind;
    if (!live) { if (showing) hide(); return; }
    if (showing) { tOff -= dt; if (tOff <= 0) { hide(); tNext = [0, 75, 50, 32, 20][st] * (0.7 + Math.random() * 0.6); } return; }
    tNext -= dt;
    if (tNext <= 0) show(n, kind, st);
  };
})();
