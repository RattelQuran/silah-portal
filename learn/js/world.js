'use strict';
/* E12: Silah City, the explorable treasure world.
   Walk with arrows/WASD, the on-screen pad, or tap a spot. Collect dates, gems and stars, open chests with keys
   earned from three-star lessons, enter places, equip rewards. */

const TILE = 40, MW = 40, MH = 28;
const PLACES_W = [
  { id: 'mosque', name: 'المسجد', x: 16, y: 2, w: 9, h: 6, kind: 'mosque', msg: 'هُنَا نُصَلِّي. نَمْشِي بِهُدُوءٍ وَنَتَكَلَّمُ بِصَوْتٍ مُنْخَفِضٍ.' },
  { id: 'library', name: 'المكتبة', x: 3, y: 4, w: 8, h: 5, kind: 'library', go: 'section-stories', msg: 'كُتُبٌ وَقِصَصٌ تَنْتَظِرُكَ.' },
  { id: 'school', name: 'المدرسة', x: 29, y: 4, w: 8, h: 5, kind: 'school', go: 'section-games', msg: 'هَيَّا نَلْعَبُ وَنَتَعَلَّمُ.' },
  { id: 'market', name: 'السوق', x: 3, y: 18, w: 9, h: 5, kind: 'market', go: 'shop', msg: 'الدُّكَّانُ هُنَا: أَلْعَابُ المَرَحِ.' },
  { id: 'house', name: 'بيت نور', x: 29, y: 18, w: 7, h: 5, kind: 'house', panel: 'collection', msg: 'مُقْتَنَيَاتُكَ وَأَوْسِمَتُكَ وَأَلْوَانُ نُور.' },
];
const CHESTS = [{ id: 'c1', x: 14, y: 11, prize: { skin: 'crimson', label: 'لون نور القرمزي' } }, { id: 'c2', x: 26, y: 23, prize: { skin: 'sage', label: 'لون نور الأخضر' } },
  { id: 'c3', x: 2, y: 13, prize: { sticker: 'هلال ذهبي', label: 'ملصق: هلال ذهبي' } }, { id: 'c4', x: 37, y: 13, prize: { skin: 'night', label: 'لون نور الليلي' } }];
function seeded(n) { let s = n; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }
const WORLD_MAP = (() => {
  const m = Array.from({ length: MH }, () => Array(MW).fill(0)); // 0 grass,1 path,2 water,3 block,4 plaza
  for (let x = 0; x < MW; x++) { m[13][x] = m[14][x] = 1; }
  for (let y = 0; y < MH; y++) { m[y][19] = m[y][20] = 1; }
  for (let y = 10; y < 18; y++) for (let x = 15; x < 25; x++) m[y][x] = 4;
  for (let x = 0; x < MW; x++) { m[26][x] = 2; m[27][x] = 2; } m[26][19] = m[26][20] = m[27][19] = m[27][20] = 1;
  for (let y = 20; y < 24; y++) for (let x = 14; x < 18; x++) m[y][x] = 2;
  for (const p of PLACES_W) { for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) m[y][x] = 3; const dx = p.x + (p.w >> 1); for (let y = p.y + p.h; y < 14; y++) if (m[y][dx] === 0) m[y][dx] = 1; for (let y = 14; y < p.y; y++) if (m[y][dx] === 0) m[y][dx] = 1; }
  m[13][19] = m[13][20] = 4;
  return m;
})();
const FOUNTAIN = { x: 19, y: 13 };
const TREES = (() => { const r = seeded(7), t = []; while (t.length < 46) { const x = r() * MW | 0, y = r() * 25 | 0; if (WORLD_MAP[y][x] === 0 && !t.some(q => Math.abs(q.x - x) < 2 && Math.abs(q.y - y) < 2)) t.push({ x, y }); } return t; })();
const PICKUPS = (() => { const r = seeded(11), out = [], kinds = ['date', 'date', 'gem', 'star']; while (out.length < 24) { const x = r() * MW | 0, y = r() * 26 | 0; const v = WORLD_MAP[y][x]; if ((v === 0 || v === 1 || v === 4) && !TREES.some(t => t.x === x && t.y === y)) out.push({ id: 'p' + out.length, x, y, k: kinds[out.length % 4] }); } return out; })();
const blocked = (tx, ty) => tx < 0 || ty < 0 || tx >= MW || ty >= MH || WORLD_MAP[ty][tx] === 3 || WORLD_MAP[ty][tx] === 2 && !(tx === 19 || tx === 20) || TREES.some(t => t.x === tx && t.y === ty) || (tx >= 19 && tx <= 20 && ty >= 12 && ty <= 13 && false);
const today = () => new Date().toISOString().slice(0, 10);

function viewWorld() {
  if (!S.world || S.world.day !== today()) S.world = { day: today(), got: [], x: S.world ? S.world.x : 20.5 * TILE, y: S.world ? S.world.y : 16.5 * TILE };
  return `<div class="world-head"><button class="crumb" data-go="home">‹ الرئيسية</button><h1>مدينة صلة</h1>
    <div class="invbar"><span title="تمر">${pickupIcon('date')} <b id="iv-date">${num(S.inv.date)}</b></span><span title="جواهر">${pickupIcon('gem')} <b id="iv-gem">${num(S.inv.gem)}</b></span><span title="نجوم">${pickupIcon('star')} <b id="iv-star">${num(S.inv.star)}</b></span><span title="مفاتيح">${ICONS.key} <b id="iv-key">${num(S.keys)}</b></span>
    <button class="gbtn gold sm" id="openCol">مقتنياتي</button></div></div>
  <div class="worldwrap" id="world"><canvas id="wcv"></canvas><canvas id="mini" width="160" height="112" aria-hidden="true"></canvas>
    <div class="wprompt" id="wprompt" hidden></div>
    <div class="dpad" aria-label="أزرار الحركة"><button data-d="0,-1" aria-label="أعلى">▲</button><button data-d="-1,0" aria-label="يسار">◀</button><button data-d="1,0" aria-label="يمين">▶</button><button data-d="0,1" aria-label="أسفل">▼</button></div></div>
  <p class="muted">تمشّى في المدينة: اجمع التمر والجواهر والنجوم (تتجدد كل يوم)، وافتح الصناديق بالمفاتيح التي تكسبها عند إتقان الدروس بثلاث نجوم.</p>
  <div id="colPanel"></div>`;
}
function pickupIcon(k, s = 18) {
  if (k === 'date') return `<svg viewBox="0 0 20 20" width="${s}" height="${s}"><ellipse cx="10" cy="11" rx="5" ry="7.5" fill="#7A3E1D"/><ellipse cx="8.5" cy="9" rx="1.5" ry="3" fill="#B5651D"/><path d="M10 3.5v-2" stroke="#2F7A62" stroke-width="2"/></svg>`;
  if (k === 'gem') return `<svg viewBox="0 0 20 20" width="${s}" height="${s}"><path d="M4 7l3-4h6l3 4-6 10z" fill="#C8174D"/><path d="M4 7h12M7 3l3 4 3-4M10 7v10" stroke="#FBE1E9" stroke-width="1"/></svg>`;
  return `<svg viewBox="0 0 20 20" width="${s}" height="${s}"><path d="M10 1.5l2.4 5.1 5.6.6-4.2 3.8 1.2 5.5L10 13.7l-5 2.8 1.2-5.5L2 7.2l5.6-.6z" fill="#C9A24B"/></svg>`;
}
function startWorld() {
  const host = $('world'), cv = $('wcv'), ctx = cv.getContext('2d'), mini = $('mini'), mctx = mini.getContext('2d');
  let W = 0, H = 0; const fit = () => { const dpr = Math.min(2, devicePixelRatio || 1); W = host.clientWidth; H = Math.min(Math.round(W * (W < 600 ? 1.25 : .6)), Math.round(innerHeight * .72)); cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  fit(); addEventListener('resize', fit);
  const P = { x: S.world.x, y: S.world.y, tx: null, ty: null, face: 1, moving: false }; const keys = {}; let pad = null, near = null, raf, last = performance.now(), t = 0, cam = { x: 0, y: 0 }, saveT = 0;
  const fx = fxLayer();
  const kd = e => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', ' '].includes(e.key)) { keys[e.key] = e.type === 'keydown'; if (e.type === 'keydown') { e.preventDefault(); if ((e.key === ' ' || e.key === 'Enter') && near) act(near); } } };
  addEventListener('keydown', kd); addEventListener('keyup', kd);
  cv.addEventListener('pointerdown', e => { const r = cv.getBoundingClientRect(); P.tx = e.clientX - r.left + cam.x; P.ty = e.clientY - r.top + cam.y; SFX.tap(); });
  host.querySelectorAll('[data-d]').forEach(b => { const [dx, dy] = b.dataset.d.split(',').map(Number); const on = e => { e.preventDefault(); pad = { dx, dy }; P.tx = null; }; const off = () => pad = null;
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); });
  $('openCol').onclick = () => collection();
  function canStand(x, y) { const r = 12; for (const [ox, oy] of [[-r, 0], [r, 0], [0, -r * .5], [0, r]]) { if (blocked(Math.floor((x + ox) / TILE), Math.floor((y + oy) / TILE))) return false; } const fx2 = (FOUNTAIN.x + 1) * TILE, fy2 = (FOUNTAIN.y + 1) * TILE; if (Math.hypot(x - fx2, y - fy2) < 40) return false; return true; }
  function act(n) { if (n.chest) return openChest(n.chest); const p = n.place; SFX.open(); S.visits[p.id] = 1; saveState();
    if (p.go) location.hash = p.go; else if (p.panel) collection(); else toast(p.msg); }
  function openChest(c) { if (S.chests.includes(c.id)) return toast('فتحت هذا الصندوق من قبل.'); if (S.keys < 1) return toast('تحتاج مفتاحًا. أكمل درسًا بثلاث نجوم لتكسب مفتاحًا.');
    S.keys--; S.chests.push(c.id); if (c.prize.skin) S.owned.push('skin-' + c.prize.skin); if (c.prize.sticker) S.stickers.push(c.prize.sticker); saveState(); SFX.open(); fx.burst((c.x + .5) * TILE - cam.x, (c.y + .5) * TILE - cam.y, '#E2C171', 30); toast('فتحت الصندوق: ' + c.prize.label); updInv(); }
  function updInv() { ['date', 'gem', 'star'].forEach(k => { const e = $('iv-' + k); if (e) e.textContent = num(S.inv[k]); }); const e = $('iv-key'); if (e) e.textContent = num(S.keys); }
  window.__eng = { get pos() { return { x: P.x, y: P.y }; }, goTo(tx, ty) { P.tx = tx; P.ty = ty; }, near: () => near && (near.place ? near.place.id : near.chest.id), act: () => near && act(near), pickups: () => PICKUPS.filter(p => !S.world.got.includes(p.id)).map(p => ({ id: p.id, x: (p.x + .5) * TILE, y: (p.y + .5) * TILE })), chests: () => CHESTS.map(c => ({ id: c.id, x: (c.x + .5) * TILE, y: (c.y + 1.4) * TILE })) };
  const loop = now => { const dt = Math.min(.033, (now - last) / 1000); last = now; t += dt;
    let vx = 0, vy = 0; const sp = 170;
    if (keys.ArrowLeft || keys.a) vx -= 1; if (keys.ArrowRight || keys.d) vx += 1; if (keys.ArrowUp || keys.w) vy -= 1; if (keys.ArrowDown || keys.s) vy += 1;
    if (pad) { vx = pad.dx; vy = pad.dy; }
    if (vx || vy) P.tx = null;
    else if (P.tx !== null) { const dx = P.tx - P.x, dy = P.ty - P.y, d = Math.hypot(dx, dy); if (d < 6) P.tx = null; else { vx = dx / d; vy = dy / d; } }
    const m = Math.hypot(vx, vy); P.moving = m > 0;
    if (m) { vx /= m; vy /= m; const nx = P.x + vx * sp * dt, ny = P.y + vy * sp * dt; let moved = false;
      if (canStand(nx, P.y)) { P.x = nx; moved = true; } if (canStand(P.x, ny)) { P.y = ny; moved = true; } if (!moved) P.tx = null; if (vx) P.face = vx > 0 ? 1 : -1;
      if (Math.random() < dt * 5) SFX.step(); }
    // pickups
    for (const p of PICKUPS) { if (S.world.got.includes(p.id)) continue; if (Math.hypot(P.x - (p.x + .5) * TILE, P.y - (p.y + .5) * TILE) < 26) { S.world.got.push(p.id); S.inv[p.k]++; SFX.coin(); fx.burst((p.x + .5) * TILE - cam.x, (p.y + .5) * TILE - cam.y, p.k === 'gem' ? '#C8174D' : '#E2C171', 14); fx.text((p.x + .5) * TILE - cam.x, (p.y) * TILE - cam.y, '+١'); updInv(); saveState(); } }
    // proximity
    near = null; for (const p of PLACES_W) { const dx = (p.x + p.w / 2) * TILE, dy = (p.y + p.h) * TILE; if (Math.abs(P.x - dx) < TILE * 1.4 && Math.abs(P.y - dy) < TILE * 1.3) near = { place: p }; }
    for (const c of CHESTS) if (Math.hypot(P.x - (c.x + .5) * TILE, P.y - (c.y + 1) * TILE) < TILE * 1.2) near = { chest: c };
    const wp = $('wprompt'); if (wp) { if (near) { wp.hidden = false; const lab = near.place ? `${near.place.name}: ${near.place.msg}` : (S.chests.includes(near.chest.id) ? 'صندوق مفتوح' : 'صندوق كنز مقفل'); const btn = near.place ? (near.place.go || near.place.panel ? 'ادخل' : 'حسنًا') : (S.chests.includes(near.chest.id) ? '' : `افتح بمفتاح (${num(S.keys)})`);
      if (wp.dataset.k !== lab + btn) { wp.dataset.k = lab + btn; wp.innerHTML = `<span>${esc(lab)}</span>${btn ? `<button class="gbtn red sm" id="wact">${btn}</button>` : ''}`; const b = $('wact'); if (b) b.onclick = () => act(near); } } else { wp.hidden = true; wp.dataset.k = ''; } }
    cam.x = Math.max(0, Math.min(MW * TILE - W, P.x - W / 2)); cam.y = Math.max(0, Math.min(MH * TILE - H, P.y - H / 2));
    drawWorld(ctx, W, H, cam, t);
    // pickups, chests
    for (const p of PICKUPS) if (!S.world.got.includes(p.id)) { const x = (p.x + .5) * TILE - cam.x, y = (p.y + .5) * TILE - cam.y + Math.sin(t * 3 + p.x) * 3; if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue; drawPickup(ctx, x, y, p.k); }
    for (const c of CHESTS) { const x = c.x * TILE - cam.x, y = c.y * TILE - cam.y; drawChest(ctx, x + 4, y + 8, S.chests.includes(c.id), t); }
    // player
    drawNour(ctx, P.x - cam.x, P.y - cam.y - 18, .7, { walk: P.moving, mood: near ? 'wow' : 'happy', glow: true });
    fx.draw(ctx, dt);
    // minimap
    mctx.clearRect(0, 0, 160, 112); const sx = 160 / (MW * TILE), sy = 112 / (MH * TILE);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { const v = WORLD_MAP[y][x]; mctx.fillStyle = ['#BFDCC9', '#E8D8B4', '#7FC1D6', '#1236A0', '#F2EADC'][v]; mctx.fillRect(x * 4, y * 4, 4, 4); }
    mctx.fillStyle = '#C8174D'; mctx.beginPath(); mctx.arc(P.x * sx, P.y * sy, 3.5, 0, 7); mctx.fill(); mctx.strokeStyle = '#0C2470'; mctx.strokeRect(cam.x * sx, cam.y * sy, W * sx, H * sy);
    if ((saveT += dt) > 2) { saveT = 0; S.world.x = P.x; S.world.y = P.y; saveState(); }
    raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
  return () => { cancelAnimationFrame(raf); removeEventListener('resize', fit); removeEventListener('keydown', kd); removeEventListener('keyup', kd); S.world.x = P.x; S.world.y = P.y; saveState(); };
}
function drawWorld(ctx, W, H, cam, t) {
  const x0 = Math.floor(cam.x / TILE), y0 = Math.floor(cam.y / TILE), x1 = Math.min(MW, x0 + Math.ceil(W / TILE) + 2), y1 = Math.min(MH, y0 + Math.ceil(H / TILE) + 2);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const v = WORLD_MAP[y][x], px = x * TILE - cam.x, py = y * TILE - cam.y;
    ctx.fillStyle = v === 1 ? '#E8D8B4' : v === 2 ? '#7FC1D6' : v === 4 ? '#F2EADC' : ((x + y) % 2 ? '#C7E2CF' : '#BFDCC9'); ctx.fillRect(px, py, TILE + 1, TILE + 1);
    if (v === 2) { ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + 6, py + 20 + Math.sin(t * 2 + x) * 3); ctx.lineTo(px + 30, py + 20 + Math.sin(t * 2 + x + 1) * 3); ctx.stroke(); }
    if (v === 4 && (x + y) % 2 === 0) { ctx.fillStyle = 'rgba(201,162,75,.18)'; star8(ctx, px + 20, py + 20, 8, 0); ctx.fill(); }
    if (v === 1 && WORLD_MAP[y][x] === 1 && y >= 26) { ctx.fillStyle = '#A8822F'; ctx.fillRect(px, py, TILE, 4); ctx.fillRect(px, py + TILE - 4, TILE, 4); } }
  // fountain
  const fx = (FOUNTAIN.x + 1) * TILE - cam.x, fy = (FOUNTAIN.y + 1) * TILE - cam.y;
  ctx.fillStyle = '#1236A0'; star8(ctx, fx, fy, 44, 0); ctx.fill(); ctx.fillStyle = '#7FC1D6'; star8(ctx, fx, fy, 36, 0); ctx.fill();
  for (let i = 0; i < 6; i++) { const a = t * 2 + i; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 12, fy - 6 + Math.sin(a * 1.3) * 6, 2.5, 0, 7); ctx.fill(); }
  // trees sorted with buildings by y for depth
  const draws = [...TREES.map(tr => ({ y: tr.y, f: () => palm(ctx, (tr.x + .5) * TILE - cam.x, (tr.y + .9) * TILE - cam.y, .62, Math.sin(t + tr.x) * 1.5) })),
    ...PLACES_W.map(p => ({ y: p.y + p.h, f: () => drawPlace(ctx, p, cam, t) }))].sort((a, b) => a.y - b.y);
  draws.forEach(d => d.f());
}
function drawPlace(ctx, p, cam, t) {
  const x = p.x * TILE - cam.x, y = p.y * TILE - cam.y, w = p.w * TILE, h = p.h * TILE;
  const wall = { mosque: '#FBF7F0', library: '#F2EADC', school: '#DCEBFA', market: '#F3E3B8', house: '#FBE1E9' }[p.kind];
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x + 6, y + h - 4, w, 10);
  ctx.fillStyle = wall; ctx.fillRect(x, y + h * .3, w, h * .7); ctx.strokeStyle = '#C9A24B'; ctx.lineWidth = 3; ctx.strokeRect(x, y + h * .3, w, h * .7);
  if (p.kind === 'mosque') { ctx.fillStyle = '#1236A0'; ctx.beginPath(); ctx.arc(x + w / 2, y + h * .32, w * .22, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#C9A24B'; ctx.fillRect(x + w / 2 - 2, y + h * .32 - w * .22 - 16, 4, 16); ctx.beginPath(); ctx.arc(x + w / 2, y + h * .32 - w * .22 - 18, 5, .6, Math.PI * 2 - .6); ctx.stroke();
    for (const mx of [x + 10, x + w - 26]) { ctx.fillStyle = '#FBF7F0'; ctx.fillRect(mx, y - 10, 16, h * .4 + 10); ctx.strokeRect(mx, y - 10, 16, h * .4 + 10); ctx.fillStyle = '#1236A0'; ctx.beginPath(); ctx.moveTo(mx - 2, y - 10); ctx.lineTo(mx + 8, y - 30); ctx.lineTo(mx + 18, y - 10); ctx.fill(); } }
  else if (p.kind === 'market') { for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#C8174D' : '#FBF7F0'; ctx.fillRect(x + i * w / 4, y + h * .22, w / 4, h * .14); } }
  else { ctx.fillStyle = p.kind === 'house' ? '#C8174D' : '#0C2470'; ctx.beginPath(); ctx.moveTo(x - 8, y + h * .32); ctx.lineTo(x + w / 2, y + h * .02); ctx.lineTo(x + w + 8, y + h * .32); ctx.fill(); }
  // windows + door arch
  for (let i = 1; i < p.w - 1; i += 2) { ctx.fillStyle = '#0C2470'; arch(ctx, x + i * TILE + 8, y + h * .45, 18, 26); ctx.fill(); ctx.fillStyle = `rgba(226,193,113,${.3 + .2 * Math.sin(t + i)})`; arch(ctx, x + i * TILE + 11, y + h * .5, 12, 18); ctx.fill(); }
  ctx.fillStyle = '#C8174D'; arch(ctx, x + w / 2 - 16, y + h - 46, 32, 46); ctx.fill(); ctx.strokeStyle = '#C9A24B'; ctx.stroke();
  ctx.fillStyle = '#0C2470'; rr(ctx, x + w / 2 - 50, y + h * .3 - 30 + (p.kind === 'mosque' ? 0 : 6), 100, 26, 12); ctx.fill(); ctx.fillStyle = '#F3E3B8'; ctx.font = AR_FONT(16); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.name, x + w / 2, y + h * .3 - 17 + (p.kind === 'mosque' ? 0 : 6));
}
function drawPickup(ctx, x, y, k) {
  ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(x, y + 12, 8, 3, 0, 0, 7); ctx.fill();
  if (k === 'date') { ctx.fillStyle = '#7A3E1D'; ctx.beginPath(); ctx.ellipse(x, y, 6, 9, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#B5651D'; ctx.beginPath(); ctx.ellipse(x - 2, y - 3, 2, 4, 0, 0, 7); ctx.fill(); }
  else if (k === 'gem') { ctx.fillStyle = '#C8174D'; ctx.beginPath(); ctx.moveTo(x - 8, y - 3); ctx.lineTo(x - 4, y - 9); ctx.lineTo(x + 4, y - 9); ctx.lineTo(x + 8, y - 3); ctx.lineTo(x, y + 9); ctx.fill(); ctx.strokeStyle = '#FBE1E9'; ctx.lineWidth = 1; ctx.stroke(); }
  else { ctx.fillStyle = '#E2C171'; star8(ctx, x, y, 10, performance.now() / 600); ctx.fill(); }
}
function drawChest(ctx, x, y, open, t) {
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x + 2, y + 26, 30, 6);
  ctx.fillStyle = '#0C2470'; ctx.fillRect(x, y + 10, 32, 20); ctx.fillStyle = '#C9A24B'; ctx.fillRect(x, y + 10, 32, 4); ctx.fillRect(x + 6, y + 10, 4, 20); ctx.fillRect(x + 22, y + 10, 4, 20);
  ctx.fillStyle = '#1236A0'; if (open) { ctx.fillRect(x, y - 4, 32, 8); ctx.fillStyle = '#E2C171'; ctx.beginPath(); ctx.arc(x + 16, y + 10, 6, Math.PI, 0); ctx.fill(); }
  else { ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.quadraticCurveTo(x + 16, y - 6, x + 32, y + 10); ctx.fill(); ctx.fillStyle = '#C8174D'; ctx.fillRect(x + 13, y + 14, 6, 7); ctx.fillStyle = `rgba(243,227,184,${.4 + .4 * Math.sin(t * 3)})`; star8(ctx, x + 30, y - 2, 4, t); ctx.fill(); }
}
const TRADES = [{ k: 'date', n: 10, sticker: 'نخلة الواحة' }, { k: 'gem', n: 5, sticker: 'جوهرة الفانوس' }, { k: 'star', n: 5, sticker: 'نجمة السماء' }];
function collection() {
  const panel = $('colPanel'); if (!panel) return;
  const skins = ['classic', ...['crimson', 'sage', 'night'].filter(s => S.owned.includes('skin-' + s)), ...(S.designs.custom ? ['custom'] : [])];
  const nStars = Object.values(S.stars).reduce((a, b) => a + b, 0);
  const ach = [['أول نجمة', nStars >= 1], ['عشر نجوم', nStars >= 10], ['أول صندوق', S.chests.length >= 1], ['جامع التمر: ١٠', S.inv.date >= 10], ['زرت كل الأماكن', PLACES_W.every(p => S.visits[p.id])], ['ثلاثون نجمة', nStars >= 30]];
  panel.innerHTML = `<div class="card colcard"><div class="row"><h2 class="grow">مقتنياتي</h2><button class="gbtn ghost sm" id="closeCol">إغلاق</button></div>
    <h3>ألوان نور</h3><div class="skins">${skins.map(s => `<button class="skin ${S.skin === s ? 'on' : ''}" data-skin="${s}"><span class="sk">${nourSVG('happy', s)}</span><small>${{ classic: 'الأصلي', crimson: 'القرمزي', sage: 'الأخضر', night: 'الليلي', custom: 'تصميمي' }[s]}</small></button>`).join('')}</div>
    <h3>ملصقات</h3><div class="row">${S.stickers.length ? S.stickers.map(s => `<span class="tag gold">${esc(s)}</span>`).join('') : '<span class="muted">افتح الصناديق لتجمع الملصقات.</span>'}</div>
    <h3>استخدم ما جمعته</h3><div class="trades">${TRADES.map((t, i) => { const has = S.stickers.includes(t.sticker); return `<button class="gbtn ${has ? 'ghost' : 'gold'} sm" data-trade="${i}" ${has || S.inv[t.k] < t.n ? 'disabled' : ''}>${pickupIcon(t.k)} ${num(t.n)} ← ${esc(t.sticker)}${has ? ' ✓' : ''}</button>`; }).join('')}</div>
    <h3>الأوسمة</h3><div class="badges">${ach.map(([n, ok]) => `<div class="badge ${ok ? '' : 'locked'}">${pickupIcon('star', 40)}<b>${n}</b></div>`).join('')}</div></div>`;
  $('closeCol').onclick = () => panel.innerHTML = '';
  panel.querySelectorAll('[data-trade]').forEach(b => b.onclick = () => { const t = TRADES[+b.dataset.trade]; if (S.inv[t.k] < t.n || S.stickers.includes(t.sticker)) return; S.inv[t.k] -= t.n; S.stickers.push(t.sticker); saveState(); SFX.open(); toast('حصلت على ملصق: ' + t.sticker); collection(); ['date', 'gem', 'star'].forEach(k => { const e = $('iv-' + k); if (e) e.textContent = num(S.inv[k]); }); });
  panel.querySelectorAll('[data-skin]').forEach(b => b.onclick = () => { S.skin = b.dataset.skin; saveState(); SFX.good(); collection(); });
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
