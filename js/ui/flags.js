/* IRON DIALECTIC — procedural flags, ideology emblems, and poster banners for dispatches. */
(function () {
  'use strict';
  const ID = (globalThis.ID = globalThis.ID || {});
  const F = (ID.Flags = {});
  const PAPER = '#ebe2cc', INK = '#17140f';

  /* Emblems drawn in a 20×20 box centred on (10,10). */
  const star = (cx, cy, r) => { let d = ''; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k & 1 ? r * 0.42 : r; d += (k ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(2) + ' ' + (cy + Math.sin(a) * rr).toFixed(2); } return '<path d="' + d + 'Z"/>'; };
  const cog = (cx, cy, r) => { let d = ''; const n = 8; for (let k = 0; k < n * 2; k++) { const a = (k * Math.PI) / n, rr = k & 1 ? r * 0.72 : r; const a2 = a + Math.PI / n; d += (k ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(2) + ' ' + (cy + Math.sin(a) * rr).toFixed(2) + 'L' + (cx + Math.cos(a2 - 0.001) * rr).toFixed(2) + ' ' + (cy + Math.sin(a2 - 0.001) * rr).toFixed(2); } return '<path fill-rule="evenodd" d="' + d + 'Z M' + (cx + r * 0.32) + ' ' + cy + 'A' + r * 0.32 + ' ' + r * 0.32 + ' 0 1 0 ' + (cx + r * 0.32 - 0.01) + ' ' + cy + 'Z"/>'; };
  const EMB = {
    star: () => star(10, 10.5, 8),
    ringstar: () => '<circle cx="10" cy="10" r="8.4" fill="none" stroke-width="1.8"/>' + star(10, 10.6, 5.6),
    stars: () => star(7, 9, 6) + star(15.5, 4.5, 2.2) + star(17.5, 9, 2.2) + star(15.5, 13.5, 2.2),
    cog: () => cog(10, 10, 8.5),
    cogstar: () => cog(10, 10, 8.5).replace('fill-rule="evenodd" ', '') + '<g style="fill:var(--bg)">' + star(10, 10.5, 3.8) + '</g>',
    rose: () => [0, 1, 2, 3, 4].map((k) => { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; return '<circle cx="' + (10 + Math.cos(a) * 4).toFixed(2) + '" cy="' + (10 + Math.sin(a) * 4).toFixed(2) + '" r="3.6"/>'; }).join('') + '<circle cx="10" cy="10" r="2.4" style="fill:var(--bg)"/>',
    ring: () => '<circle cx="10" cy="10" r="7" fill="none" stroke-width="3"/>',
    diamond: () => '<path d="M10 1.5L17 10 10 18.5 3 10Z"/><path d="M10 6L13.3 10 10 14 6.7 10Z" style="fill:var(--bg)"/>',
    shield: () => '<path d="M3.5 3h13v7c0 4.5-3.2 7.2-6.5 8.5C6.7 17.2 3.5 14.5 3.5 10Z"/>',
    crown: () => '<path d="M2.5 15.5L3.5 5.5 7.2 10 10 3.5 12.8 10 16.5 5.5 17.5 15.5Z"/><rect x="2.5" y="16.3" width="15" height="2"/>',
    sun: () => { let d = '<circle cx="10" cy="10" r="4.4"/>'; for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; d += '<path d="M' + (10 + Math.cos(a - 0.13) * 5.6).toFixed(2) + ' ' + (10 + Math.sin(a - 0.13) * 5.6).toFixed(2) + 'L' + (10 + Math.cos(a) * 9.4).toFixed(2) + ' ' + (10 + Math.sin(a) * 9.4).toFixed(2) + 'L' + (10 + Math.cos(a + 0.13) * 5.6).toFixed(2) + ' ' + (10 + Math.sin(a + 0.13) * 5.6).toFixed(2) + 'Z"/>'; } return d; },
    wheat: () => '<rect x="9.2" y="7" width="1.6" height="12"/>' + [3, 6.2, 9.4].map((y) => '<ellipse cx="7.4" cy="' + y + '" rx="1.6" ry="2.6" transform="rotate(-30 7.4 ' + y + ')"/><ellipse cx="12.6" cy="' + y + '" rx="1.6" ry="2.6" transform="rotate(30 12.6 ' + y + ')"/>').join('') + '<ellipse cx="10" cy="1.8" rx="1.3" ry="2.2"/>',
    sword: () => '<path d="M9 1h2v12H9z"/><path d="M5 12.5h10v2H5z"/><path d="M9.2 14.5h1.6v3.5H9.2z"/><circle cx="10" cy="18.6" r="1.4"/>',
    chevron: () => '<path d="M2.5 15L10 4l7.5 11-3.4 0L10 9 5.9 15Z"/><path d="M2.5 19L10 8l7.5 11h-3.4L10 13l-4.1 6Z" opacity=".75"/>',
    compass: () => '<circle cx="10" cy="10" r="8.2" fill="none" stroke-width="1.6"/><path d="M10 1.5L12 10 10 18.5 8 10Z"/><path d="M1.5 10L10 8.4 18.5 10 10 11.6Z" opacity=".7"/>',
    laurel: () => [0, 1, 2, 3, 4, 5].map((k) => { const a = Math.PI * 0.62 + k * 0.33; return '<ellipse cx="' + (10 + Math.cos(a) * 7).toFixed(2) + '" cy="' + (10 + Math.sin(a) * 7).toFixed(2) + '" rx="1.3" ry="2.4" transform="rotate(' + ((a * 180) / Math.PI).toFixed(0) + ' ' + (10 + Math.cos(a) * 7).toFixed(2) + ' ' + (10 + Math.sin(a) * 7).toFixed(2) + ')"/><ellipse cx="' + (10 - Math.cos(a) * 7).toFixed(2) + '" cy="' + (10 + Math.sin(a) * 7).toFixed(2) + '" rx="1.3" ry="2.4" transform="rotate(' + (180 - (a * 180) / Math.PI).toFixed(0) + ' ' + (10 - Math.cos(a) * 7).toFixed(2) + ' ' + (10 + Math.sin(a) * 7).toFixed(2) + ')"/>'; }).join('') + star(10, 9.5, 3.4),
    anchor: () => '<circle cx="10" cy="3.4" r="2" fill="none" stroke-width="1.6"/><path d="M9.2 5h1.6v12.5H9.2z"/><path d="M5.5 8h9v1.6h-9z"/><path d="M2.5 11.5c0 4 3.4 6.5 7.5 6.5s7.5-2.5 7.5-6.5l-2 1.2c-.4 2.6-2.6 3.8-5.5 3.8s-5.1-1.2-5.5-3.8Z"/>',
    node: () => '<path d="M10 10L3.5 4M10 10l6.5-6M10 10l6.5 6M10 10l-6.5 6M10 10v-8" fill="none" stroke-width="1.6"/><circle cx="10" cy="10" r="3.4"/><circle cx="3.5" cy="4" r="1.9"/><circle cx="16.5" cy="4" r="1.9"/><circle cx="16.5" cy="16" r="1.9"/><circle cx="3.5" cy="16" r="1.9"/><circle cx="10" cy="2" r="1.6"/>',
    torch: () => '<path d="M10 1c2.6 3 3.6 5.2 3.6 7.2A3.6 3.6 0 0 1 10 11.8 3.6 3.6 0 0 1 6.4 8.2C6.4 6.2 7.4 4 10 1Z"/><path d="M7 12.5h6l-1.6 6.5H8.6Z"/>',
  };
  F.EMBLEM_OF = { ml: 'star', trot: 'ringstar', council: 'cog', mao: 'stars', marketsoc: 'cogstar', demsoc: 'rose', ansyn: '', ancom: '', liberal: 'ring', socdem: 'diamond', minarchy: 'shield', conmon: 'crown', absmon: 'crown', theocracy: 'sun', agrarian: 'wheat', junta: 'sword', corporatist: 'chevron', technocracy: 'compass', personalist: 'laurel', merchant: 'anchor', cybernetic: 'node', natpop: 'torch' };
  F.emblem = function (ideo, fill, bg, size) {
    const k = F.EMBLEM_OF[ideo]; if (!k || !EMB[k]) return '';
    return '<svg viewBox="0 0 20 20" width="' + (size || 20) + '" height="' + (size || 20) + '" style="--bg:' + bg + '" fill="' + fill + '" stroke="' + fill + '" stroke-width="0">' + EMB[k]() + '</svg>';
  };

  const hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const lum = (c) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
  const dark = (c, k) => c.map((v) => v * k);
  const cache = {};
  /* SVG markup of a nation's flag (30×20). */
  /* A destiny flag: { p, a, b, c, e, ef } (see data/destiny.js). */
  function destFlag(d) {
    const a = d.a, b = d.b || PAPER, c = d.c || a, ef = d.ef || b;
    let body = '', tr = 'translate(9.5 4.5) scale(0.55)';
    switch (d.p) {
      case 'hband': body = '<rect width="30" height="20" fill="' + a + '"/><rect y="6.67" width="30" height="6.67" fill="' + b + '"/>'; tr = 'translate(12.2 7.2) scale(0.28)'; break;
      case 'vtri': body = '<rect width="10" height="20" fill="' + a + '"/><rect x="10" width="10" height="20" fill="' + b + '"/><rect x="20" width="10" height="20" fill="' + c + '"/>'; break;
      case 'bicol': body = '<rect width="30" height="10" fill="' + a + '"/><rect y="10" width="30" height="10" fill="' + b + '"/>'; tr = 'translate(3 5) scale(0.5)'; break;
      case 'canton': body = '<rect width="30" height="20" fill="' + a + '"/>'; tr = 'translate(2 1.5) scale(0.42)'; break;
      case 'stripes': for (let k = 0; k < 7; k++) body += '<rect y="' + (k * 20 / 7).toFixed(2) + '" width="30" height="' + (20 / 7 + 0.05).toFixed(2) + '" fill="' + (k % 2 ? b : a) + '"/>'; body += '<rect width="13" height="11.43" fill="' + c + '"/>'; tr = 'translate(1.6 0.9) scale(0.5)'; break;
      case 'cross': body = '<rect width="30" height="20" fill="' + a + '"/><rect x="8" width="5" height="20" fill="' + b + '"/><rect y="7.5" width="30" height="5" fill="' + b + '"/>' + (d.c ? '<rect x="9.4" width="2.2" height="20" fill="' + d.c + '"/><rect y="8.9" width="30" height="2.2" fill="' + d.c + '"/>' : ''); tr = 'translate(20 5) scale(0.5)'; break;
      case 'diag': body = '<path d="M0 0H30L0 20Z" fill="' + a + '"/><path d="M30 0V20H0Z" fill="' + b + '"/>'; break;
      case 'sunburst': body = '<rect width="30" height="20" fill="' + a + '"/>'; for (let k = 0; k < 16; k += 2) { const a0 = (k / 16) * Math.PI * 2, a1 = ((k + 1) / 16) * Math.PI * 2; body += '<path d="M15 10L' + (15 + Math.cos(a0) * 30).toFixed(1) + ' ' + (10 + Math.sin(a0) * 30).toFixed(1) + 'L' + (15 + Math.cos(a1) * 30).toFixed(1) + ' ' + (10 + Math.sin(a1) * 30).toFixed(1) + 'Z" fill="' + b + '"/>'; } body += '<circle cx="15" cy="10" r="6" fill="' + a + '"/>'; tr = 'translate(10 5) scale(0.5)'; break;
      case 'border': body = '<rect width="30" height="20" fill="' + b + '"/><rect x="2.4" y="2.4" width="25.2" height="15.2" fill="' + a + '"/>'; break;
      case 'chevron': body = '<rect width="30" height="20" fill="' + a + '"/><path d="M0 0L13 10 0 20Z" fill="' + b + '"/>'; tr = 'translate(0.8 5.2) scale(0.48)'; break;
      case 'saltire': body = '<rect width="30" height="20" fill="' + a + '"/><path d="M0 0L30 20M30 0L0 20" stroke="' + b + '" stroke-width="3.4"/>'; tr = 'translate(10 5) scale(0.5)'; break;
      default: body = '<rect width="30" height="20" fill="' + a + '"/>';
    }
    let e = '';
    if (d.e && EMB[d.e]) e = '<g transform="' + tr + '" fill="' + ef + '" stroke="' + ef + '" style="--bg:' + (d.p === 'canton' || d.p === 'stripes' ? c : a) + '">' + EMB[d.e]() + '</g>';
    return '<svg viewBox="0 0 30 20" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' + body + e + '<rect width="30" height="20" fill="none" stroke="' + INK + '" stroke-width="1"/></svg>';
  }
  const fkey = (n) => n.id + ':' + n.ideo + ':' + n.base + (n.destiny && !n.destiny.lapsed ? ':' + n.destiny.id : '');
  F.svg = function (n, w) {
    const key = fkey(n);
    if (!cache[key] && n.destiny && !n.destiny.lapsed && n.destiny.flag) cache[key] = destFlag(n.destiny.flag);
    if (!cache[key]) {
      const I = ID.IDEOLOGIES[n.ideo], h = ID.hashStr(n.base);
      const c1 = hex(n.color), c2 = hex(I.color), c3 = lum(n.color) > 150 ? INK : PAPER;
      const fam = I.family; let body = '', emb = 'center', efill = c3, ebg = c1;
      if (n.ideo === 'ansyn' || n.ideo === 'ancom') { body = '<path d="M0 0H30L0 20Z" fill="' + (n.ideo === 'ansyn' ? '#b5221a' : INK) + '"/><path d="M30 0V20H0Z" fill="' + (n.ideo === 'ansyn' ? INK : c1) + '"/>'; emb = ''; }
      else {
        const pat = fam === 'socialist' ? (h % 3 === 0 ? 4 : 3) : fam === 'conservative' ? [0, 1, 5, 2][h % 4] : fam === 'authoritarian' ? [2, 6, 0][h % 3] : fam === 'liberal' ? [0, 1, 2][h % 3] : [6, 1, 0][h % 3];
        const cA = fam === 'socialist' ? c2 : c1, cB = c3 === INK ? hex(dark(n.color, 0.55)) : PAPER;
        if (pat === 0) { body = '<rect width="30" height="20" fill="' + cA + '"/><rect y="6.67" width="30" height="6.67" fill="' + cB + '"/>'; efill = cA; ebg = cB; }
        else if (pat === 1) { body = '<rect width="30" height="20" fill="' + cB + '"/><rect width="10" height="20" fill="' + cA + '"/><rect x="20" width="10" height="20" fill="' + c2 + '"/>'; efill = cA; ebg = cB; }
        else if (pat === 2) { body = '<rect width="30" height="10" fill="' + cA + '"/><rect y="10" width="30" height="10" fill="' + cB + '"/>'; emb = 'hoist'; efill = cB; ebg = cA; }
        else if (pat === 3) { body = '<rect width="30" height="20" fill="' + cA + '"/>'; emb = 'canton'; efill = '#f0c860'; ebg = cA; }
        else if (pat === 4) { body = '<rect width="30" height="20" fill="' + cA + '"/><rect y="15" width="30" height="5" fill="' + c1 + '"/>'; emb = 'canton'; efill = '#f0c860'; ebg = cA; }
        else if (pat === 5) { body = '<rect width="30" height="20" fill="' + cA + '"/><rect x="8" width="4" height="20" fill="' + cB + '"/><rect y="8" width="30" height="4" fill="' + cB + '"/>'; emb = ''; }
        else { body = '<rect width="30" height="20" fill="' + cB + '"/><rect x="2" y="2" width="26" height="16" fill="' + cA + '"/>'; efill = cB; ebg = cA; }
      }
      let e = '';
      if (emb && F.EMBLEM_OF[n.ideo]) {
        const ek = EMB[F.EMBLEM_OF[n.ideo]]();
        const tr = emb === 'center' ? 'translate(9.5 4.5) scale(0.55)' : emb === 'hoist' ? 'translate(3 5) scale(0.5)' : 'translate(2 1.5) scale(0.42)';
        e = '<g transform="' + tr + '" fill="' + efill + '" stroke="' + efill + '" style="--bg:' + ebg + '">' + ek + '</g>';
      }
      cache[key] = '<svg viewBox="0 0 30 20" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' + body + e + '<rect width="30" height="20" fill="none" stroke="' + INK + '" stroke-width="1"/></svg>';
    }
    return cache[key];
  };
  F.html = (n, cls) => '<span class="flag ' + (cls || '') + '">' + F.svg(n) + '</span>';
  /* An Image of the flag for the canvas (async; returns null until loaded). */
  const imgs = {};
  F.img = function (n) {
    const key = fkey(n);
    let im = imgs[key];
    if (!im) {
      im = imgs[key] = new Image();
      const bg = n.destiny && !n.destiny.lapsed && n.destiny.flag ? (n.destiny.flag.p === 'canton' || n.destiny.flag.p === 'stripes' ? n.destiny.flag.c || n.destiny.flag.a : n.destiny.flag.a) : hex(n.color);
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(F.svg(n).replace(/var\(--bg\)/g, bg));
    }
    return im.complete && im.naturalWidth ? im : null;
  };

  /* Poster banner for a dispatch: rays, a category glyph and the player's flag. */
  const CAT = {
    war: ['coup', 'mutiny', 'war_profiteers', 'peace_movement', 'victory_parade', 'border_incident', 'arms_race', 'partisan_reprisals', 'atrocity_exposed', 'refugees', 'ally_attacked', 'capitulation', 'civil_war', 'plot_uncovered', 'ambitious_general', 'officers_petition', 'veterans_march'],
    eco: ['bread_riots', 'harvest_failure', 'bumper_harvest', 'bank_run', 'inflation_spiral', 'ore_discovery', 'planners_error', 'shortages', 'council_deadlock', 'speculation_boom', 'crash', 'railway_boom', 'electrification', 'green_revolution', 'oil_shock', 'tax_revolt', 'mine_disaster', 'worlds_fair', 'pandemic', 'debt_crisis', 'great_slump', 'plan_failed', 'concession_resentment', 'network_fault', 'houses_dividend', 'capital_flight', 'nationalisation_backlash', 'expert_report', 'village_vs_factory'],
    street: ['strike_wave', 'general_strike', 'foreign_strike', 'student_protests', 'peasant_petition', 'broken_promise', 'riot_memory', 'mass_rally', 'union_congress', 'tax_revolt'],
  };
  const GLYPH = {
    war: '<path d="M12 70L70 12M18 12l58 58M58 12h16v16M12 58v16h16" fill="none" stroke-width="7" stroke-linecap="square"/>',
    eco: '<path d="M8 76V44l18 10V44l18 10V44l18 10V16h12v60Z"/>',
    street: '<path d="M30 76V40l-9-8V18h7v10l5 4V12h7v20h4V8h7v24h4V14h7v26l-6 10v26Z"/>',
    pol: '<path d="M14 74h56v6H14zM20 70V36h8v34zM38 70V36h8v34zM56 70V36h8v34zM10 32L42 10l32 22Z"/>',
  };
  F.category = function (id) { for (const k in CAT) if (CAT[k].indexOf(id) >= 0) return k; return 'pol'; };
  F.banner = function (n, evId, urgent) {
    const cat = F.category(evId), col = urgent ? '#c8281e' : hex(n.color), ink = INK;
    let rays = ''; for (let k = 0; k < 18; k++) { const a0 = (k / 18) * Math.PI * 2, a1 = a0 + Math.PI / 18; rays += '<path d="M150 260L' + (150 + Math.cos(a0) * 700).toFixed(0) + ' ' + (260 + Math.sin(a0) * 700).toFixed(0) + 'L' + (150 + Math.cos(a1) * 700).toFixed(0) + ' ' + (260 + Math.sin(a1) * 700).toFixed(0) + 'Z"/>'; }
    return '<div class="banner"><svg viewBox="0 0 600 110" preserveAspectRatio="xMidYMid slice"><rect width="600" height="110" fill="' + col + '"/><g fill="' + ink + '" opacity=".16">' + rays + '</g>' +
      '<path d="M0 110L600 64V110Z" fill="' + ink + '"/><g transform="translate(40 14) scale(1)" fill="' + PAPER + '" stroke="' + PAPER + '">' + GLYPH[cat] + '</g></svg>' + F.html(n, 'bflag') + '</div>';
  };
})();
