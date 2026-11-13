/* IRON DIALECTIC — synthesised sound. Small, soft and percussive: telegraph, paper, drum, brass. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const A = (ID.Audio = { vol: 0.5, muted: false });
  let ac = null, master = null, out = null, musicBus = null, noiseBuf = null, lastTick = 0;
  const last = {};

  A.unlock = function () {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      ac = new C(); master = ac.createGain(); master.gain.value = A.muted ? 0 : A.vol * 0.6;
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 6;
      out = comp; master.connect(comp); comp.connect(ac.destination);
      musicBus = ac.createGain(); musicBus.gain.value = ID.Music.on && !A.muted ? ID.Music.vol * 0.55 : 0; musicBus.connect(comp);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
  };
  A.setVol = function (v, muted) { A.vol = v; if (muted != null) A.muted = muted; if (master) master.gain.value = A.muted ? 0 : A.vol * 0.6; if (musicBus) musicBus.gain.value = ID.Music.on && !A.muted ? ID.Music.vol * 0.55 : 0; };

  /* one enveloped oscillator */
  function tone(type, f0, f1, t0, dur, gain, lp) {
    const t = ac.currentTime + t0, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.012, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); node = f; }
    node.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.03);
  }
  /* one enveloped noise burst through a filter */
  function noise(t0, dur, gain, type, f0, f1, q) {
    const t = ac.currentTime + t0, s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    s.buffer = noiseBuf; s.loop = true; f.type = type || 'lowpass'; f.Q.value = q || 0.8;
    f.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.02, dur * 0.25)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03);
  }
  const brass = (f, t0, dur, gain) => { tone('sawtooth', f, f, t0, dur, gain, 900); tone('triangle', f / 2, f / 2, t0, dur, gain * 0.7); };

  const S = {
    click() { tone('triangle', 620, 500, 0, 0.035, 0.07); },
    tick() { tone('sine', 150, 80, 0, 0.06, 0.05); },
    build() { tone('triangle', 520, 520, 0, 0.05, 0.1); tone('triangle', 700, 700, 0.08, 0.07, 0.1); },
    stamp() { noise(0, 0.09, 0.22, 'lowpass', 500, 180); tone('sine', 110, 70, 0, 0.12, 0.2); },
    event() { for (let k = 0; k < 3; k++) tone('sine', 880, 880, k * 0.085, 0.045, 0.07); },
    alarm() { brass(196, 0, 0.26, 0.11); brass(165, 0.3, 0.38, 0.11); },
    war() { for (let k = 0; k < 4; k++) noise(k * 0.07, 0.05, 0.13, 'bandpass', 1800, 1800, 0.7); noise(0.3, 0.18, 0.2, 'bandpass', 1500, 900, 0.6); tone('sine', 95, 55, 0.3, 0.3, 0.25); },
    revolt() { noise(0, 0.9, 0.09, 'bandpass', 500, 1500, 0.9); tone('sine', 90, 60, 0, 0.2, 0.2); tone('sine', 90, 60, 0.25, 0.2, 0.2); tone('sine', 110, 60, 0.5, 0.35, 0.24); },
    good() { tone('sine', 660, 660, 0, 0.3, 0.07); tone('sine', 880, 880, 0.09, 0.36, 0.06); },
    bad() { tone('triangle', 330, 330, 0, 0.22, 0.09); tone('triangle', 262, 262, 0.17, 0.4, 0.09); },
    victory() { [262, 330, 392, 523].forEach((f, k) => brass(f, k * 0.16, k === 3 ? 0.9 : 0.2, 0.1)); },
    defeat() { brass(196, 0, 0.5, 0.1); brass(165, 0.5, 0.5, 0.1); brass(131, 1.0, 1.3, 0.11); noise(1.0, 1.4, 0.07, 'lowpass', 200, 80); },
    crash() { noise(0, 0.9, 0.12, 'bandpass', 2400, 200, 1.2); tone('triangle', 440, 110, 0, 0.9, 0.07); },
    era() { [440, 660, 990].forEach((f, k) => tone('sine', f, f, 0, 1.6 - k * 0.3, 0.07 - k * 0.015)); },
    boat() { tone('triangle', 147, 147, 0, 0.4, 0.09, 600); },
    launch() { noise(0, 0.7, 0.1, 'bandpass', 300, 2600, 1.5); },
    boom() { tone('sine', 120, 45, 0, 0.3, 0.26); noise(0, 0.2, 0.12, 'lowpass', 700, 150); },
    nuke() { noise(0, 2.6, 0.26, 'lowpass', 900, 60); tone('sine', 60, 28, 0, 2.4, 0.32); },
    drums() { [0, 0.11, 0.22, 0.42].forEach((t, k) => noise(t, 0.07, k === 3 ? 0.2 : 0.12, 'bandpass', 1900, 1500, 0.9)); tone('sine', 98, 60, 0.42, 0.35, 0.22); },
    barrage() { for (let k = 0; k < 6; k++) { const t = k * 0.13 + Math.random() * 0.08; tone('sine', 95 + Math.random() * 40, 40, t, 0.32, 0.18); noise(t, 0.22, 0.09, 'lowpass', 900, 120); } },
    airraid() { tone('sawtooth', 92, 86, 0, 1.3, 0.035, 420); tone('sawtooth', 96, 90, 0, 1.3, 0.03, 420); for (let k = 0; k < 5; k++) { const t = 1.0 + k * 0.16; tone('sine', 110, 40, t, 0.35, 0.2); noise(t, 0.25, 0.1, 'lowpass', 700, 100); } },
  };
  const GAP = { tick: 0.16, click: 0.03, build: 0.3, event: 0.5, boom: 0.2, stamp: 0.1, drums: 0.6, barrage: 0.5, airraid: 1.2 };

  A.play = function (name) {
    if (!ac || A.muted || !S[name]) return;
    const now = ac.currentTime, gap = GAP[name] != null ? GAP[name] : 0.25;
    if (last[name] != null && now - last[name] < gap) return;
    last[name] = now;
    try { S[name](); } catch (e) { /* audio is never worth a crash */ }
  };

  /* ---------------------------------------------------------------- score
     Slow chord pads in a minor key, voiced low and filtered; war adds timpani and distant guns,
     crisis thins it to a drone. Scheduled a chord ahead on the audio clock. */
  const Mu = (ID.Music = { vol: 0.35, on: true, mood: 'title', next: 0, k: 0 });
  const PROG = {
    title: { chords: [[0, 3, 7], [3, 7, 10], [-2, 2, 5], [-4, 0, 3]], dur: 7.5, lp: 1100, bells: 2 },
    peace: { chords: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], dur: 7, lp: 900, bells: 1.4 },
    war: { chords: [[5, 8, 12], [1, 5, 8], [-2, 1, 5], [0, 4, 7]], dur: 5, lp: 700, bells: 0, drums: 1 },
    crisis: { chords: [[0, 3, 7], [2, 5, 8], [-1, 2, 5], [-4, 0, 3]], dur: 6.5, lp: 520, bells: 0.4, pulse: 1 },
  };
  const hz = (st, oct) => 110 * Math.pow(2, st / 12) * oct;
  function pad(f, t, dur, lp, g) {
    const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; fl.Q.value = 0.4;
    const v = ac.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(g, t + Math.min(2.2, dur * 0.35)); v.gain.setValueAtTime(g, t + dur * 0.75); v.gain.linearRampToValueAtTime(0.0001, t + dur + 2.2);
    fl.connect(v); v.connect(musicBus);
    for (const det of [-5, 5]) { const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = det; o.connect(fl); o.start(t); o.stop(t + dur + 2.4); }
  }
  function bell(f, t, g) {
    const o = ac.createOscillator(), v = ac.createGain(); o.type = 'sine'; o.frequency.value = f;
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g, t + 0.02); v.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    o.connect(v); v.connect(musicBus); o.start(t); o.stop(t + 2.3);
  }
  function timp(t, g) {
    const o = ac.createOscillator(), v = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(82, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.5);
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g, t + 0.01); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(v); v.connect(musicBus); o.start(t); o.stop(t + 0.75);
  }
  function rumble(t, g) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), v = ac.createGain(); s.buffer = noiseBuf; s.loop = true; f.type = 'lowpass'; f.frequency.value = 160;
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g, t + 0.05); v.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    s.connect(f); f.connect(v); v.connect(musicBus); s.start(t, Math.random()); s.stop(t + 1.5);
  }
  function scheduleChord() {
    const P = PROG[Mu.mood] || PROG.peace, ch = P.chords[Mu.k % P.chords.length], t = Mu.next;
    for (const st of ch) pad(hz(st, 2), t, P.dur, P.lp, 0.05);
    pad(hz(ch[0], 1), t, P.dur, P.lp * 0.6, 0.06);
    if (P.bells) { const nb = Math.random() < P.bells - Math.floor(P.bells) ? Math.ceil(P.bells) : Math.floor(P.bells); for (let k = 0; k < nb; k++) bell(hz(ch[Math.floor(Math.random() * 3)], 8), t + 1 + Math.random() * (P.dur - 2), 0.022); }
    if (P.drums) { for (let b = 0; b < 4; b++) timp(t + b * (P.dur / 4), b % 2 ? 0.05 : 0.085); if (Math.random() < 0.6) rumble(t + Math.random() * P.dur, 0.06); }
    if (P.pulse) for (let b = 0; b < 3; b++) { timp(t + b * 2.1, 0.04); timp(t + b * 2.1 + 0.28, 0.025); }
    Mu.next = t + P.dur; Mu.k++;
  }
  Mu.update = function (mood) {
    if (!ac || !musicBus || !Mu.on || A.muted || ac.state !== 'running') return;
    if (mood && mood !== Mu.mood) { Mu.mood = mood; Mu.k = 0; }
    if (Mu.next < ac.currentTime) Mu.next = ac.currentTime + 0.3;
    if (Mu.next - ac.currentTime < 1.2) scheduleChord();
  };
  Mu.set = function (vol, on) { Mu.vol = vol; Mu.on = on; if (musicBus) musicBus.gain.value = on && !A.muted ? vol * 0.55 : 0; };
  Mu.sting = function (tone) {
    if (!ac || !musicBus || !Mu.on || A.muted) return;
    const t = ac.currentTime + 0.05, ch = tone === 'good' ? [0, 4, 7] : tone === 'era' ? [0, 7, 12] : [0, 3, 7];
    for (const st of ch) pad(hz(st + (tone === 'war' ? 5 : 0), 2), t, 2.4, 1400, 0.045);
  };
})();
