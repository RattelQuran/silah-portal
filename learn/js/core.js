'use strict';
/* Silah Learn core: state, sound, voice, art (Nour + worlds), canvas helpers, game shell.
   Engines live in engines-*.js and only receive (root, lesson, api). */

/* ---------------- small helpers ---------------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => Number(n).toLocaleString('ar-EG');
const rnd = (a, b) => a + Math.random() * (b - a);
const pickOne = a => a[Math.random() * a.length | 0];
function shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
const stripHarakat = s => String(s).replace(/[ً-ْٰـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
const splitList = s => String(s || '').split(/[،,\n]/).map(x => x.trim()).filter(Boolean);
function toast(m) { const t = $('toast'); if (!t) return; t.firstElementChild.textContent = m; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => t.hidden = true, 2400); }

/* ---------------- state (prototype: this browser only) ---------------- */
const RULE_KEYS = ['games', 'letters', 'sight', 'exercises', 'listening', 'grammar', 'stories', 'texts'];
const DEF_STATE = {
  role: 'child', child: 'mariam', coins: 60, stars: {}, best: {}, ledger: [], keys: 0,
  owned: [], shopLockUntil: 0, rules: { games: 2, letters: 2, sight: 2, exercises: 1, listening: 2, grammar: 2, stories: 3, texts: 3 },
  sfx: true, drafts: [], inv: { date: 0, gem: 0, star: 0 }, chests: [], stickers: [], skin: 'classic', designs: {}, city: {}, world: null,
  assignments: [{ lesson: 'jump-ب', to: 'كل الفصل', due: '2026-11-30' }], visits: {},
};
let S = loadState();
function loadState() {
  try { const v = JSON.parse(localStorage.getItem('silah-learn-v2') || 'null'); if (v && v.rules) return { ...structuredClone(DEF_STATE), ...v }; } catch (e) { }
  return structuredClone(DEF_STATE);
}
function saveState() { try { localStorage.setItem('silah-learn-v2', JSON.stringify(S)); } catch (e) { } }
function resetState() { S = structuredClone(DEF_STATE); saveState(); }

/* ---------------- sound: Web Audio, synthesized here ---------------- */
let AC = null;
function tone(seq) {
  if (!S.sfx) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = AC.currentTime;
    seq.forEach(([f, d, at, type = 'triangle', v = .16, slide]) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t0 + at);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + at + d);
      g.gain.setValueAtTime(0, t0 + at); g.gain.linearRampToValueAtTime(v, t0 + at + .015);
      g.gain.exponentialRampToValueAtTime(.001, t0 + at + d);
      o.connect(g).connect(AC.destination); o.start(t0 + at); o.stop(t0 + at + d + .05);
    });
  } catch (e) { }
}
const SFX = {
  good: () => tone([[660, .12, 0], [880, .2, .09]]),
  bad: () => tone([[260, .25, 0, 'sine', .18, 170]]),
  coin: () => tone([[988, .08, 0, 'square', .07], [1318, .25, .07, 'square', .07]]),
  win: () => tone([[523, .14, 0], [659, .14, .12], [784, .14, .24], [1046, .45, .36]]),
  jump: () => tone([[320, .22, 0, 'sine', .14, 640]]),
  land: () => tone([[180, .08, 0, 'sine', .14]]),
  flip: () => tone([[540, .06, 0, 'sine', .09]]),
  splash: () => tone([[400, .35, 0, 'sawtooth', .05, 80]]),
  pop: () => tone([[700, .07, 0, 'sine', .14, 1200]]),
  tap: () => tone([[880, .04, 0, 'sine', .07]]),
  whoosh: () => tone([[200, .3, 0, 'sine', .07, 900]]),
  open: () => tone([[392, .1, 0], [523, .1, .08], [659, .1, .16], [784, .1, .24], [1046, .35, .32]]),
  step: () => tone([[140, .04, 0, 'sine', .04]]),
};

/* voice: browser Arabic voice as a stand-in until Silah's own recordings exist */
function hasArabicVoice() { try { return speechSynthesis.getVoices().some(v => /^ar/i.test(v.lang)); } catch (e) { return false; } }
/* best Arabic voice on this device: natural/online voices first (Edge, Chrome, Safari), then any Arabic voice */
function bestArabicVoice() {
  try {
    const vs = speechSynthesis.getVoices().filter(v => /^ar/i.test(v.lang)); if (!vs.length) return null;
    const score = v => (/natural|online|neural/i.test(v.name) ? 40 : 0) + (/google/i.test(v.name) ? 25 : 0) + (/hamed|zariyah|salma|shakir|maged|laila|tarik|majed/i.test(v.name) ? 15 : 0) + (/^ar-(SA|EG)/i.test(v.lang) ? 5 : 0) + (v.localService ? 0 : 3);
    return vs.sort((a, b) => score(b) - score(a))[0];
  } catch (e) { return null; }
}
function say(text, onBoundary, onEnd) {
  try {
    if (!('speechSynthesis' in window)) { onEnd && onEnd(); return false; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = 'ar-SA'; u.rate = .82;
    const v = bestArabicVoice(); if (v) u.voice = v;
    if (onBoundary) u.onboundary = onBoundary; if (onEnd) u.onend = onEnd;
    speechSynthesis.speak(u); return !!v;
  } catch (e) { onEnd && onEnd(); return false; }
}
function hush() { try { speechSynthesis.cancel(); } catch (e) { } }

/* ---------------- art: Nour, the Silah lantern ---------------- */
const SKINS = {
  classic: { body: '#1236A0', glass: ['#FFE9A8', '#E2B44F'], cap: '#C9A24B', trim: '#A8822F', band: '#C8174D' },
  crimson: { body: '#C8174D', glass: ['#FFF1C9', '#F0C25C'], cap: '#C9A24B', trim: '#8E0F37', band: '#0C2470' },
  sage: { body: '#2F7A62', glass: ['#F4FFE9', '#BFE0A4'], cap: '#C9A24B', trim: '#1E5544', band: '#C8174D' },
  night: { body: '#0C2470', glass: ['#E9F1FF', '#9FC2F2'], cap: '#E2C171', trim: '#081749', band: '#E2C171' },
};
function skinOf(name) { const d = S.designs && S.designs[name]; return d || SKINS[name] || SKINS.classic; }
function nourSVG(mood = 'happy', skinName) {
  const k = skinOf(skinName || S.skin), id = 'g' + Math.random().toString(36).slice(2, 7);
  const eyes = mood === 'sad' ? `<path d="M80 102 q6 -5 12 0 M108 102 q6 -5 12 0" stroke="#0C2470" stroke-width="4" fill="none" stroke-linecap="round"/>`
    : `<g fill="#0C2470"><ellipse cx="86" cy="104" rx="7" ry="${mood === 'wow' ? 10 : 8}"/><ellipse cx="114" cy="104" rx="7" ry="${mood === 'wow' ? 10 : 8}"/></g><g fill="#fff"><circle cx="88" cy="101" r="2.4"/><circle cx="116" cy="101" r="2.4"/></g>`;
  const mouth = mood === 'wow' ? '<ellipse cx="100" cy="128" rx="7" ry="8" fill="#0C2470"/>'
    : mood === 'sad' ? '<path d="M90 132 Q100 124 110 132" fill="none" stroke="#0C2470" stroke-width="4" stroke-linecap="round"/>'
      : mood === 'cheer' ? '<path d="M86 122 Q100 142 114 122 Z" fill="#0C2470"/><path d="M92 130 Q100 136 108 130" fill="#C8174D"/>'
        : '<path d="M88 124 Q100 136 112 124" fill="none" stroke="#0C2470" stroke-width="4" stroke-linecap="round"/>';
  const arms = mood === 'cheer' ? '<path d="M52 110 q-22 -14 -18 -38" stroke="' + k.body + '" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M148 110 q22 -14 18 -38" stroke="' + k.body + '" stroke-width="7" fill="none" stroke-linecap="round"/>'
    : '<path d="M52 110 q-18 6 -20 24" stroke="' + k.body + '" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M148 110 q18 -4 22 -22" stroke="' + k.body + '" stroke-width="7" fill="none" stroke-linecap="round"/>';
  return `<svg viewBox="0 0 200 240" role="img" aria-label="نور، فانوس صلة"><defs><radialGradient id="${id}" cx="50%" cy="55%" r="55%"><stop offset="0" stop-color="${k.glass[0]}"/><stop offset="1" stop-color="${k.glass[1]}"/></radialGradient></defs>
    <ellipse cx="100" cy="226" rx="54" ry="8" fill="#000" opacity=".16"/>
    <circle cx="100" cy="8" r="6" fill="none" stroke="${k.cap}" stroke-width="3"/><path d="M88 22c0-6 4-10 12-10s12 4 12 10z" fill="${k.cap}"/>
    <path d="M68 36 L100 18 L132 36 Z" fill="${k.cap}"/><rect x="62" y="34" width="76" height="12" rx="5" fill="${k.trim}"/>
    <path d="M58 52 Q100 40 142 52 L150 168 Q100 182 50 168 Z" fill="${k.body}"/>
    <path d="M72 60 Q100 52 128 60 L134 160 Q100 170 66 160 Z" fill="url(#${id})"/>
    <path d="M100 56 L100 166 M70 108 L130 108" stroke="${k.cap}" stroke-width="3" opacity=".5"/>
    <path d="M78 70 Q100 50 122 70" fill="none" stroke="${k.band}" stroke-width="4" stroke-linecap="round"/>
    ${eyes}<circle cx="76" cy="122" r="6" fill="#C8174D" opacity=".32"/><circle cx="124" cy="122" r="6" fill="#C8174D" opacity=".32"/>${mouth}
    <rect x="54" y="166" width="92" height="14" rx="6" fill="${k.trim}"/><path d="M66 180 L134 180 L124 196 L76 196 Z" fill="${k.cap}"/>
    <path d="M84 196 v18 M116 196 v18" stroke="#0C2470" stroke-width="7" stroke-linecap="round"/><ellipse cx="80" cy="216" rx="10" ry="5" fill="#C8174D"/><ellipse cx="120" cy="216" rx="10" ry="5" fill="#C8174D"/>${arms}
  </svg>`;
}
/* canvas Nour: mood happy|wow|sad|cheer, squash for jumps, blink handled by time */
function drawNour(ctx, x, y, s, o = {}) {
  const k = skinOf(o.skin || S.skin), t = performance.now() / 1000, blink = (t % 3.2) < .12;
  const sq = o.squash || 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (1 + sq * .18), s * (1 - sq * .18));
  if (o.glow) { const g = ctx.createRadialGradient(0, -14, 4, 0, -14, 70); g.addColorStop(0, 'rgba(255,233,168,.55)'); g.addColorStop(1, 'rgba(255,233,168,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -14, 70, 0, 7); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(0, 31, 22, 5, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = k.cap; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, -60, 4, 0, 7); ctx.stroke();
  ctx.fillStyle = k.cap; ctx.beginPath(); ctx.moveTo(-15, -46); ctx.lineTo(0, -56); ctx.lineTo(15, -46); ctx.fill();
  ctx.fillStyle = k.trim; rr(ctx, -19, -47, 38, 7, 3); ctx.fill();
  ctx.fillStyle = k.body; ctx.beginPath(); ctx.moveTo(-22, -40); ctx.quadraticCurveTo(0, -46, 22, -40); ctx.lineTo(25, 12); ctx.quadraticCurveTo(0, 18, -25, 12); ctx.fill();
  const g = ctx.createRadialGradient(0, -12, 2, 0, -12, 26); g.addColorStop(0, k.glass[0]); g.addColorStop(1, k.glass[1]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-15, -34); ctx.quadraticCurveTo(0, -38, 15, -34); ctx.lineTo(17, 7); ctx.quadraticCurveTo(0, 11, -17, 7); ctx.fill();
  ctx.strokeStyle = k.band; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-10, -28); ctx.quadraticCurveTo(0, -38, 10, -28); ctx.stroke();
  const mood = o.mood || 'happy';
  ctx.fillStyle = '#0C2470'; ctx.strokeStyle = '#0C2470';
  if (mood === 'sad') { ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-9, -16); ctx.quadraticCurveTo(-6, -19, -3, -16); ctx.moveTo(3, -16); ctx.quadraticCurveTo(6, -19, 9, -16); ctx.stroke(); }
  else if (blink) { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-9, -16); ctx.lineTo(-3, -16); ctx.moveTo(3, -16); ctx.lineTo(9, -16); ctx.stroke(); }
  else { const ry = mood === 'wow' ? 4.6 : 3.7; ctx.beginPath(); ctx.ellipse(-6, -16, 3, ry, 0, 0, 7); ctx.ellipse(6, -16, 3, ry, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-5, -17.5, 1, 0, 7); ctx.arc(7, -17.5, 1, 0, 7); ctx.fill(); }
  ctx.fillStyle = 'rgba(200,23,77,.3)'; ctx.beginPath(); ctx.arc(-11, -8, 3, 0, 7); ctx.arc(11, -8, 3, 0, 7); ctx.fill();
  ctx.lineWidth = 2.4; ctx.strokeStyle = '#0C2470'; ctx.fillStyle = '#0C2470'; ctx.beginPath();
  if (mood === 'wow') { ctx.ellipse(0, -6, 3, 3.6, 0, 0, 7); ctx.fill(); }
  else if (mood === 'sad') { ctx.arc(0, -2, 5, Math.PI + .3, -.3); ctx.stroke(); }
  else if (mood === 'cheer') { ctx.moveTo(-6, -9); ctx.quadraticCurveTo(0, 0, 6, -9); ctx.closePath(); ctx.fill(); }
  else { ctx.arc(0, -9, 5, .2, Math.PI - .2); ctx.stroke(); }
  ctx.fillStyle = k.trim; rr(ctx, -24, 10, 48, 7, 3); ctx.fill();
  ctx.fillStyle = k.cap; ctx.beginPath(); ctx.moveTo(-17, 17); ctx.lineTo(17, 17); ctx.lineTo(12, 23); ctx.lineTo(-12, 23); ctx.fill();
  ctx.strokeStyle = '#0C2470'; ctx.lineWidth = 4.5; ctx.beginPath();
  const air = o.air;
  if (air) { ctx.moveTo(-7, 23); ctx.lineTo(-11, 30); ctx.moveTo(7, 23); ctx.lineTo(11, 30); }
  else { const w = o.walk ? Math.sin(t * 14) * 3 : 0; ctx.moveTo(-7, 23); ctx.lineTo(-7 + w, 30); ctx.moveTo(7, 23); ctx.lineTo(7 - w, 30); }
  ctx.stroke();
  ctx.strokeStyle = k.body; ctx.lineWidth = 4.5; ctx.beginPath();
  if (mood === 'cheer' || air) { ctx.moveTo(-24, -12); ctx.quadraticCurveTo(-36, -22, -34, -36); ctx.moveTo(24, -12); ctx.quadraticCurveTo(36, -22, 34, -36); }
  else { ctx.moveTo(-24, -10); ctx.quadraticCurveTo(-34, -4, -34, 6); ctx.moveTo(24, -10); ctx.quadraticCurveTo(34, -14, 36, -24); }
  ctx.stroke();
  ctx.restore();
}
/* a hoopoe friend (whack / world) */
function drawHoopoe(ctx, x, y, s, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.flip ? -1 : 1), s);
  ctx.fillStyle = '#E8A04A'; for (let i = -2; i <= 2; i++) { ctx.save(); ctx.rotate(i * .22 - .3); ctx.beginPath(); ctx.ellipse(-2, -34, 3.5, 11, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#0C2470'; ctx.beginPath(); ctx.ellipse(-2, -43, 3, 3, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#E8A04A'; ctx.restore(); }
  ctx.fillStyle = '#F2C38A'; ctx.beginPath(); ctx.ellipse(0, -6, 20, 22, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#0C2470'; ctx.beginPath(); ctx.ellipse(8, 6, 16, 12, .3, 0, 7); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-2 + i * 7, 0 + i * 3); ctx.lineTo(10 + i * 7, 6 + i * 3); ctx.stroke(); }
  ctx.fillStyle = '#0C2470'; ctx.beginPath(); ctx.arc(-8, -12, 3.4, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-7, -13, 1.2, 0, 7); ctx.fill();
  ctx.strokeStyle = '#5A3A22'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-18, -8); ctx.quadraticCurveTo(-30, -4, -36, 4); ctx.stroke();
  if (o.mood === 'sad') { ctx.strokeStyle = '#0C2470'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-12, -18); ctx.lineTo(-4, -16); ctx.stroke(); }
  ctx.restore();
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function star8(ctx, x, y, r, rot = 0) { ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = rot + i * Math.PI / 8, q = i % 2 ? r * .74 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } ctx.closePath(); }
function arch(ctx, x, y, w, h) { ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + h * .45); ctx.quadraticCurveTo(x, y + h * .08, x + w / 2, y); ctx.quadraticCurveTo(x + w, y + h * .08, x + w, y + h * .45); ctx.lineTo(x + w, y + h); ctx.closePath(); }
function palm(ctx, x, y, s, sway = 0, col = '#2F7A62') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#8A6A3F'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(6 + sway, -40, 2 + sway * 2, -80); ctx.stroke();
  ctx.fillStyle = col; const tx = 2 + sway * 2, ty = -80;
  for (let i = 0; i < 7; i++) { const a = -Math.PI + i * Math.PI / 6 + sway * .02; ctx.save(); ctx.translate(tx, ty); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(22, 4, 24, 6, .25, 0, 7); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = '#B5651D'; ctx.beginPath(); ctx.arc(tx - 3, ty + 6, 3, 0, 7); ctx.arc(tx + 4, ty + 7, 3, 0, 7); ctx.fill();
  ctx.restore();
}
function cloud(ctx, x, y, s, a = 1) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 18 * s, 0, 7); ctx.arc(x + 20 * s, y - 10 * s, 22 * s, 0, 7); ctx.arc(x + 44 * s, y, 18 * s, 0, 7); ctx.rect(x, y, 44 * s, 18 * s); ctx.fill(); ctx.restore(); }

/* ---------------- canvas stage helpers ---------------- */
function makeStage(root, ratioWide = .6, ratioTall = 1.15) {
  const cv = document.createElement('canvas'); root.appendChild(cv);
  const ctx = cv.getContext('2d'); const st = { cv, ctx, W: 0, H: 0 };
  st.fit = () => { const dpr = Math.min(2, window.devicePixelRatio || 1); st.W = root.clientWidth || 360; st.H = Math.min(Math.round(st.W * (st.W < 600 ? ratioTall : ratioWide)), Math.round(innerHeight * .74)); cv.width = st.W * dpr; cv.height = st.H * dpr; cv.style.height = st.H + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); st.onfit && st.onfit(); };
  st.fit(); addEventListener('resize', st.fit);
  st.local = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  let raf = 0, last = performance.now(); st.t = 0;
  st.run = fn => { const f = now => { const dt = Math.min(.033, (now - last) / 1000); last = now; st.t += dt; fn(dt); raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f); };
  st.stop = () => { cancelAnimationFrame(raf); removeEventListener('resize', st.fit); };
  return st;
}
/* particles + floating text, shared by all canvas engines */
function fxLayer() {
  const P = [], T = [];
  return {
    burst(x, y, col = '#E2C171', n = 18) { for (let i = 0; i < n; i++) { const a = Math.random() * 7, s = rnd(60, 200); P.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, l: rnd(.5, .9), c: col, r: rnd(2, 5), star: Math.random() < .4 }); } },
    text(x, y, s, col = '#0C2470') { T.push({ x, y, s, c: col, l: 1 }); },
    draw(ctx, dt) {
      for (const p of P) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 320 * dt; p.l -= dt; ctx.globalAlpha = Math.max(0, p.l); ctx.fillStyle = p.c; if (p.star) { star8(ctx, p.x, p.y, p.r * 1.6, p.l * 4); ctx.fill(); } else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); } }
      for (let i = P.length - 1; i >= 0; i--) if (P[i].l <= 0) P.splice(i, 1);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const t of T) { t.y -= 40 * dt; t.l -= dt * .9; ctx.globalAlpha = Math.max(0, t.l); ctx.font = '800 22px "Baloo Bhaijaan 2",sans-serif'; ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.strokeText(t.s, t.x, t.y); ctx.fillStyle = t.c; ctx.fillText(t.s, t.x, t.y); }
      for (let i = T.length - 1; i >= 0; i--) if (T[i].l <= 0) T.splice(i, 1);
      ctx.globalAlpha = 1;
    },
  };
}
const PRAISE = ['أَحْسَنْتَ', 'رَائِع', 'مُمْتَاز', 'بَارَكَ اللهُ فِيكَ', 'هَكَذَا'];
const AR_FONT = s => `800 ${s}px "Baloo Bhaijaan 2","IBM Plex Sans Arabic",sans-serif`;

/* ---------------- game shell ---------------- */
let stopGame = null;
const ENGINES = {}; // filled by engines-*.js: ENGINES.catch = {name, fn, controls}
function lessonTotal(l) { const e = ENGINES[l.engine]; return e && e.total ? e.total(l) : (l.goal || 10); }
function runLesson(l, opts = {}) {
  const e = ENGINES[l.engine]; if (!e) { toast('المحرك غير متاح'); return; }
  const total = lessonTotal(l);
  const back = opts.back || (l.preview ? 'admin' : (l.section === 'games' ? 'section-games' : 'section-' + l.section));
  $('view').innerHTML = `<button class="crumb" data-go="${back}">‹ ${l.preview ? 'مصنع المحتوى' : 'رجوع'}</button>
  <div class="stage" id="stage" data-engine="${l.engine}">
    <div class="hud"><button class="iconbtn" id="sayP" aria-label="اسمع التعليمات">${ICONS.speaker}</button><div class="prompt" id="prompt">${esc(l.prompt)}</div>
      <div class="dots" id="dots" aria-label="التقدم">${'<i></i>'.repeat(Math.min(total, 14))}</div><button class="iconbtn" id="sfx" aria-pressed="${S.sfx}" aria-label="المؤثرات الصوتية">${S.sfx ? ICONS.note : ICONS.mute}</button></div>
    <div id="game" class="game"></div></div>
  <div class="legend"><span>المحرك: <b>${esc(e.name)}</b></span><span>المستوى: <b>${['', 'سهل', 'متوسط', 'صعب'][l.level || 1]}</b></span><span>${esc(e.controls || 'لمس أو نقر')}</span></div>`;
  bindNav();
  $('sayP').onclick = () => say(l.prompt);
  $('sfx').onclick = ev => { S.sfx = !S.sfx; saveState(); ev.currentTarget.innerHTML = S.sfx ? ICONS.note : ICONS.mute; };
  const dots = $('dots');
  const api = {
    progress: n => { const k = Math.round(Math.min(1, n / total) * dots.children.length);[...dots.children].forEach((d, i) => d.classList.toggle('on', i < k)); },
    prompt: t => { $('prompt').textContent = t; },
    finish: r => finishLesson(l, r, back),
    say,
  };
  const g = $('game');
  g.innerHTML = `<div class="intro-bg"></div><div class="overlay"><div class="panel pop"><div class="nour-sm">${nourSVG('wow')}</div><h2>${esc(l.title)}</h2><p class="big-ar">${esc(l.prompt)}</p><button class="gbtn red" id="go">ابدأ</button></div></div>`;
  $('go').onclick = async () => {
    SFX.tap(); say(l.prompt);
    try { await Promise.race([document.fonts.load('800 30px "Baloo Bhaijaan 2"'), new Promise(r => setTimeout(r, 1200))]); } catch (e) { }
    g.innerHTML = ''; window.__eng = null;
    stopGame = e.fn(g, l, api) || (() => { });
  };
  window.scrollTo(0, 0);
}
function starsFor(r) { if (r.done === false) return 0; const acc = r.correct / Math.max(1, r.correct + r.wrong); return acc >= .9 ? 3 : acc >= .7 ? 2 : 1; }
function coinRate(l) { return (S.rules[l.section] ?? 2) * (l.weight || 1); }
/* Coins only for stars above the previous best, so replaying a lesson cannot farm coins. Mirrors the planned Firestore rule. */
function awardFor(l, st) { const prev = S.stars[l.id] || 0; return { prev, earned: l.preview ? 0 : Math.max(0, st - prev) * coinRate(l) }; }
function finishLesson(l, r, back) {
  if (stopGame) { stopGame(); stopGame = null; }
  hush();
  const st = starsFor(r), { prev, earned } = awardFor(l, st);
  let gotKey = false;
  if (!l.preview) {
    if (st > prev) S.stars[l.id] = st;
    S.best[l.id] = { correct: r.correct, wrong: r.wrong, at: Date.now() };
    if (st === 3 && prev < 3) { S.keys++; gotKey = true; }
    if (earned) { S.coins += earned; S.ledger.unshift({ t: Date.now(), label: l.title, amt: earned, kind: 'earn' }); }
    saveState(); renderWallet();
  }
  SFX.win(); if (earned) setTimeout(SFX.coin, 550);
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="panel pop result"><div class="confetti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--x:${rnd(-160, 160) | 0}px;--d:${(i * 0.04).toFixed(2)}s;--c:${pickOne(['#C9A24B', '#C8174D', '#1236A0', '#2F7A62'])}"></i>`).join('')}</div>
    <div class="nour-sm">${nourSVG(st >= 2 ? 'cheer' : 'happy')}</div><h2>${st === 3 ? 'رَائِعٌ جِدًّا!' : st === 2 ? 'أَحْسَنْتَ!' : 'جَيِّد، وَيُمْكِنُكَ أَفْضَل'}</h2>
    <div class="bigstars">${[1, 2, 3].map(i => `<span class="${i <= st ? 'on' : ''}" style="--i:${i}">★</span>`).join('')}</div>
    <p>صحيح: <b>${num(r.correct)}</b> · أخطاء: <b>${num(r.wrong)}</b></p>
    ${l.preview ? '<span class="tag">معاينة: لا تُحتسب عملات</span>' : earned ? `<div class="earn">${coinSVG(30)}<b>+${num(earned)}</b>${gotKey ? `<span class="tag gold">+ مفتاح صندوق</span>` : ''}</div>` : `<span class="tag">${prev >= st ? 'لا عملات جديدة: نتيجتك السابقة أعلى أو مساوية' : ''}</span>`}
    <div class="row center"><button class="gbtn red" id="again">العب مرة أخرى</button><button class="gbtn ghost" id="back">${l.preview ? 'رجوع للمصنع' : 'الأنشطة'}</button>${l.mastery && !l.preview && (S.stars[l.id] || 0) >= 2 ? `<button class="gbtn gold" id="cert">شهادتي</button>` : ''}</div></div>`;
  $('stage').appendChild(o);
  if ($('cert')) $('cert').onclick = () => { location.hash = 'cert-' + l.id; };
  $('again').onclick = () => runLesson(l, { back });
  $('back').onclick = () => { if (location.hash.slice(1) === back) route(); else location.hash = back; };
  window.__lastResult = { id: l.id, stars: st, earned, ...r };
}
function coinSVG(s = 26) { return `<svg viewBox="0 0 40 40" width="${s}" height="${s}" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#C9A24B"/><circle cx="20" cy="20" r="14.5" fill="#E2C171" stroke="#A8822F" stroke-width="1.5"/><path d="M20 9.5l2.3 4.4 4.9-1-1 4.9 4.4 2.2-4.4 2.3 1 4.9-4.9-1L20 30.5l-2.3-4.4-4.9 1 1-4.9L9.4 20l4.4-2.2-1-4.9 4.9 1z" fill="none" stroke="#A8822F" stroke-width="1.2"/><text x="20" y="25.5" text-anchor="middle" font-family="Baloo Bhaijaan 2,sans-serif" font-weight="800" font-size="13" fill="#0C2470">ص</text></svg>`; }
function renderWallet() { const b = $('coinBal'); if (b) b.textContent = num(S.coins); const k = $('keyBal'); if (k) k.textContent = num(S.keys); }
const ICONS = {
  speaker: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
  note: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  mute: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="m22 9-6 6M16 9l6 6"/></svg>',
  key: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#C9A24B" stroke-width="2.6" stroke-linecap="round"><circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2"/></svg>',
};
function bindNav() {
  document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { SFX.tap(); const h = b.dataset.go; if (location.hash.slice(1) === h) route(); else location.hash = h; });
  document.querySelectorAll('[data-say]').forEach(b => b.onclick = () => { if (!say(b.dataset.say)) toast('لا يوجد صوت عربي في هذا المتصفح. النطق الأصلي بتسجيلات معلمات صلة.'); });
}
