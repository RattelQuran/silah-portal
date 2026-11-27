'use strict';
/* Canvas engines: E1 catch, E2 jump, E3 whack, E4 seek (trees on canvas, grid in DOM), E7 race.
   Rule shared by all: no game over for young children; mistakes lower the stars instead. */

const lvlSpeed = l => [1, 1, 1.25, 1.5][l.level || 1];

/* ============ E1 catch: stars fall over the night city, a crescent boat catches them ============ */
ENGINES.catch = { name: 'التقاط', controls: 'اسحب بإصبعك أو حرّك الفأرة أو استخدم الأسهم', total: l => l.goal || 10, fn(root, cfg, api) {
  const st = makeStage(root, .6, 1.2), { ctx } = st, fx = fxLayer();
  const goal = cfg.goal || 10, sp = lvlSpeed(cfg);
  const P = { x: st.W / 2, tx: st.W / 2 }; let items = [], spawn = .3, caught = 0, wrong = 0, mood = 'happy', moodT = 0, shake = 0, done = false;
  const sky = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random() * .7, r: rnd(.4, 1.6), p: rnd(0, 6) }));
  const domes = Array.from({ length: 9 }, (_, i) => ({ x: i / 8, w: rnd(.08, .14), h: rnd(.12, .22), min: Math.random() < .5 }));
  const move = e => { P.tx = st.local(e).x; };
  st.cv.addEventListener('pointermove', move); st.cv.addEventListener('pointerdown', move);
  const keys = {}; const kd = e => { keys[e.key] = e.type === 'keydown'; }; addEventListener('keydown', kd); addEventListener('keyup', kd);
  const R = () => Math.max(24, Math.min(36, st.W * .042));
  function add() { const isT = Math.random() < .45; const pool = isT ? cfg.targets : cfg.distractors; const r = R();
    items.push({ x: rnd(r, st.W - r), y: -r, r, ch: pickOne(pool), t: isT, vy: (st.H * .15 + rnd(0, st.H * .07)) * sp * (1 + caught * .03), rot: rnd(0, 6), sw: rnd(0, 6) }); }
  window.__eng = { get items() { return items.filter(i => !i.gone).map(i => ({ x: i.x, y: i.y, t: i.t })); }, get player() { return P.x; }, set player(x) { P.tx = x; } };
  st.run(dt => {
    const { W, H } = st;
    if (keys.ArrowLeft) P.tx -= 460 * dt; if (keys.ArrowRight) P.tx += 460 * dt;
    const bw = Math.max(110, W * .17); P.tx = Math.max(bw / 2, Math.min(W - bw / 2, P.tx)); P.x += (P.tx - P.x) * Math.min(1, dt * 12);
    spawn -= dt; if (spawn <= 0 && !done) { add(); spawn = Math.max(.5, 1.2 - caught * .04) / sp; }
    const py = H - 70;
    for (const it of items) { it.y += it.vy * dt; it.x += Math.sin(st.t * 1.6 + it.sw) * 14 * dt;
      if (!it.gone && it.y + it.r * .5 > py - 14 && it.y < py + 22 && Math.abs(it.x - P.x) < bw / 2) { it.gone = true;
        if (it.t) { caught++; api.progress(caught); SFX.good(); fx.burst(it.x, it.y); fx.text(it.x, it.y - 20, pickOne(PRAISE)); mood = 'cheer'; moodT = .7; }
        else { wrong++; SFX.bad(); shake = .3; fx.burst(it.x, it.y, '#C8174D', 10); mood = 'sad'; moodT = .7; } } }
    items = items.filter(i => !i.gone && i.y < H + 60);
    if ((moodT -= dt) <= 0) mood = 'happy';
    ctx.save(); if (shake > 0) { shake -= dt; ctx.translate(rnd(-5, 5), 0); }
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#081749'); g.addColorStop(.7, '#1236A0'); g.addColorStop(1, '#2A4FB8'); ctx.fillStyle = g; ctx.fillRect(-10, 0, W + 20, H);
    for (const s of sky) { ctx.globalAlpha = .35 + .45 * Math.sin(st.t * 2 + s.p); ctx.fillStyle = '#F3E3B8'; ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
    // moon
    ctx.fillStyle = '#F3E3B8'; ctx.beginPath(); ctx.arc(W * .14, H * .16, 26, 0, 7); ctx.fill(); ctx.fillStyle = '#0E2160'; ctx.beginPath(); ctx.arc(W * .14 + 11, H * .16 - 6, 23, 0, 7); ctx.fill();
    // far skyline
    const base = H - 34; ctx.fillStyle = '#0E2366';
    for (const d of domes) { const x = d.x * W, w = d.w * W, h = d.h * H; ctx.fillRect(x - w / 2, base - h, w, h); ctx.beginPath(); ctx.arc(x, base - h, w / 2, Math.PI, 0); ctx.fill(); if (d.min) { ctx.fillRect(x + w * .7, base - h * 1.7, 8, h * 1.7); ctx.beginPath(); ctx.arc(x + w * .7 + 4, base - h * 1.7, 6, Math.PI, 0); ctx.fill(); } }
    // near arcade with lit windows
    ctx.fillStyle = '#0A1A52'; ctx.fillRect(0, base - 26, W, 60);
    for (let x = -10; x < W; x += 46) { ctx.fillStyle = '#081343'; arch(ctx, x + 8, base - 52, 30, 46); ctx.fill(); ctx.fillStyle = `rgba(226,193,113,${.25 + .15 * Math.sin(st.t + x)})`; arch(ctx, x + 14, base - 42, 18, 30); ctx.fill(); }
    ctx.strokeStyle = 'rgba(201,162,75,.6)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = 0; x <= W; x += 16) ctx.lineTo(x, base + 14 + Math.sin(x / 60 + st.t) * 3); ctx.stroke();
    // stars with letters
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const it of items) { ctx.save(); ctx.shadowColor = 'rgba(243,227,184,.8)'; ctx.shadowBlur = 16; ctx.fillStyle = '#E2C171'; star8(ctx, it.x, it.y, it.r, it.rot + st.t * .5); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#FFF8E4'; ctx.beginPath(); ctx.arc(it.x, it.y, it.r * .62, 0, 7); ctx.fill(); ctx.fillStyle = '#0C2470'; ctx.font = AR_FONT(it.r * .92); ctx.fillText(it.ch, it.x, it.y + it.r * .1); }
    // crescent boat + Nour
    const x = P.x; ctx.fillStyle = '#C9A24B'; ctx.beginPath(); ctx.moveTo(x - bw / 2, py); ctx.quadraticCurveTo(x, py + 60, x + bw / 2, py); ctx.quadraticCurveTo(x, py + 32, x - bw / 2, py); ctx.fill();
    ctx.strokeStyle = '#F3E3B8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - bw / 2 + 8, py + 3); ctx.quadraticCurveTo(x, py + 32, x + bw / 2 - 8, py + 3); ctx.stroke();
    drawNour(ctx, x, py - 12, .62, { mood, glow: true });
    fx.draw(ctx, dt); ctx.restore();
    if (!done && caught >= goal) { done = true; setTimeout(() => api.finish({ correct: caught, wrong }), 500); }
  });
  return () => { st.stop(); removeEventListener('keydown', kd); removeEventListener('keyup', kd); };
} };

/* ============ E2 jump: hop across river stones (right to left) ============ */
ENGINES.jump = { name: 'قفز', controls: 'المس الحجر، أو اضغط ١ ٢ ٣', total: l => l.goal || 6, fn(root, cfg, api) {
  const st = makeStage(root, .58, 1.15), { ctx } = st, fx = fxLayer();
  const goal = cfg.goal || 6; let round = 0, correct = 0, wrong = 0, busy = false, done = false, cam = 0, current = '';
  const used = new Set(), hero = { x: 0, y: 0, fx: 0, fy: 0, tx: 0, ty: 0, k: 1, mood: 'happy', sq: 0, hidden: false };
  let stones = [];
  const gap = () => Math.max(150, st.W * .27), lane = i => st.H * (.36 + i * .2);
  function newRound() {
    const pool = cfg.targets.filter(w => !used.has(w)); const tw = pickOne(pool.length ? pool : cfg.targets); used.add(tw); current = tw;
    const ds = shuffle(cfg.distractors.filter(d => stripHarakat(d) !== stripHarakat(tw))).slice(0, 2);
    const sx = -(round + 1) * gap();
    stones = stones.filter(s => s.home && !s.old);
    shuffle([tw, ...ds]).forEach((w, i) => stones.push({ x: sx, y: lane(i), w, ok: w === tw, sink: 0, bob: rnd(0, 6) }));
    if (cfg.listen) { api.prompt('اقْفِزْ إِلَى الكَلِمَةِ الَّتِي تَسْمَعُهَا'); if (!say(tw)) api.prompt('اقْفِزْ إِلَى: ' + tw); }
  }
  stones.push({ x: 0, y: lane(1), w: '', home: true, sink: 0, bob: 0 }); hero.y = hero.ty = lane(1); newRound();
  const toX = x => x - cam + st.W * .8;
  const live = () => stones.filter(s => !s.home && s.sink === 0);
  function pick(s) { if (busy || done || !s) return; busy = true; SFX.jump(); Object.assign(hero, { fx: hero.x, fy: hero.y, tx: s.x, ty: s.y, k: 0, target: s, mood: 'wow' }); }
  st.cv.addEventListener('pointerdown', e => { const p = st.local(e); const rw = Math.min(gap() * .42, 92); pick(live().find(s => Math.abs(toX(s.x) - p.x) < rw && Math.abs(s.y - p.y) < rw * .55)); });
  const kd = e => { const i = '123١٢٣'.indexOf(e.key); if (i >= 0) pick(live()[i % 3]); }; addEventListener('keydown', kd);
  window.__eng = { get stones() { return live().map(s => ({ x: toX(s.x), y: s.y, ok: s.ok, w: s.w })); }, get busy() { return busy; } };
  function land() { const s = hero.target; hero.sq = 1; SFX.land();
    if (s.ok) { correct++; round++; api.progress(correct); SFX.good(); fx.burst(toX(s.x), s.y, '#E2C171'); fx.text(toX(s.x), s.y - 70, pickOne(PRAISE)); hero.mood = 'cheer';
      stones.forEach(o => { if (o.home) o.old = true; }); s.home = true; s.old = false; stones.filter(o => !o.home).forEach(o => o.sink = .01);
      if (correct >= goal) { done = true; setTimeout(() => api.finish({ correct, wrong }), 700); } else setTimeout(() => { newRound(); busy = false; hero.mood = 'happy'; }, 520); }
    else { wrong++; s.sink = .01; hero.mood = 'sad'; setTimeout(() => { SFX.splash(); fx.burst(toX(s.x), s.y + 10, '#9FD3E6', 22); hero.hidden = true; }, 220);
      setTimeout(() => { const back = stones.find(o => o.home && !o.old); hero.hidden = false; Object.assign(hero, { x: back.x, y: back.y, k: 1, mood: 'happy' }); s.gone = true; busy = false; if (cfg.listen) say(current); }, 1000); } }
  st.run(dt => {
    const { W, H } = st;
    if (hero.k < 1) { hero.k = Math.min(1, hero.k + dt * 1.9); const k = hero.k; hero.x = hero.fx + (hero.tx - hero.fx) * k; hero.y = hero.fy + (hero.ty - hero.fy) * k - Math.sin(Math.PI * k) * H * .24; if (hero.k >= 1) land(); }
    hero.sq = Math.max(0, hero.sq - dt * 4);
    cam += (hero.x - cam) * Math.min(1, dt * 3);
    for (const s of stones) if (s.sink > 0 && s.sink < 1.2) s.sink += dt * 1.3;
    // sky + parallax
    const g = ctx.createLinearGradient(0, 0, 0, H * .3); g.addColorStop(0, '#BFE0F5'); g.addColorStop(1, '#EAF5FB'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * .3);
    for (let i = 0; i < 4; i++) cloud(ctx, ((i * 260 - cam * .1) % (W + 300) + W + 300) % (W + 300) - 150, 30 + i % 2 * 26, .9, .9);
    ctx.fillStyle = '#C9DCC9'; for (let i = -1; i < 7; i++) { const x = ((i * 220 - cam * .25) % (W + 220) + W + 220) % (W + 220) - 110; ctx.beginPath(); ctx.ellipse(x, H * .29, 160, 50, 0, Math.PI, 0); ctx.fill(); }
    for (let i = -1; i < 9; i++) { const x = ((i * 140 - cam * .45) % (W + 140) + W + 140) % (W + 140) - 70; palm(ctx, x, H * .31, .55, Math.sin(st.t + i) * 2); }
    ctx.fillStyle = '#E8D8B4'; ctx.fillRect(0, H * .29, W, H * .04);
    const w2 = ctx.createLinearGradient(0, H * .32, 0, H); w2.addColorStop(0, '#7FC1D6'); w2.addColorStop(1, '#2E6F94'); ctx.fillStyle = w2; ctx.fillRect(0, H * .32, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.32)'; ctx.lineWidth = 2; for (let r = 0; r < 8; r++) { const y = H * .36 + r * H * .085; ctx.beginPath(); for (let x = 0; x <= W; x += 14) ctx.lineTo(x, y + Math.sin((x + cam * .7) / 38 + st.t * 2 + r) * 3); ctx.stroke(); }
    // stones
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const rw = Math.min(gap() * .42, 92), rh = rw * .42;
    for (const s of stones) { if (s.gone) continue; const x = toX(s.x); if (x < -130 || x > W + 130) continue; const sinkY = s.sink > 0 ? Math.min(1, s.sink) * H * .16 : 0; const y = s.y + Math.sin(st.t * 2 + s.bob) * 2 + sinkY;
      ctx.globalAlpha = s.sink > 0 && !s.home ? Math.max(0, 1 - s.sink) : 1;
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(x, y + rh * .7, rw * 1.1, rh * .45, 0, 0, 7); ctx.fill();
      ctx.fillStyle = s.home ? '#C9A24B' : '#EDE3CF'; ctx.beginPath(); ctx.ellipse(x, y, rw, rh, 0, 0, 7); ctx.fill();
      ctx.fillStyle = s.home ? '#E2C171' : '#FBF7F0'; ctx.beginPath(); ctx.ellipse(x - 4, y - 4, rw * .86, rh * .7, 0, 0, 7); ctx.fill();
      if (s.w && !(cfg.listen && !s.home && false)) { ctx.fillStyle = '#0C2470'; ctx.font = AR_FONT(Math.min(30, rw * .42)); ctx.fillText(s.w, x, y); }
      ctx.globalAlpha = 1; }
    if (!hero.hidden) drawNour(ctx, toX(hero.x), hero.y - rh - 22, Math.min(1.1, W / 620) * .85 + .2, { mood: hero.mood, squash: hero.sq, air: hero.k < 1 });
    fx.draw(ctx, dt);
  });
  return () => { st.stop(); removeEventListener('keydown', kd); hush(); };
} };

/* ============ E3 whack: hoopoes pop out of arched windows ============ */
ENGINES.whack = { name: 'إصابة الأهداف', controls: 'المس الهدهد الصحيح قبل أن يختبئ', total: l => l.goal || 10, fn(root, cfg, api) {
  const st = makeStage(root, .62, 1.2), { ctx } = st, fx = fxLayer();
  const goal = cfg.goal || 10, lv = cfg.level || 1, cols = 3, rows = lv >= 3 ? 3 : 2, stay = [0, 2.4, 1.9, 1.5][lv];
  let hits = 0, wrong = 0, done = false, spawn = .6, shake = 0;
  const wins = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) wins.push({ r, c, pop: null });
  const geo = w => { const { W, H } = st, ww = Math.min(W / (cols + .8), 150), wh = ww * 1.15, gx = (W - cols * ww) / (cols + 1), top = H * .2, gy = (H * .74 - rows * wh) / (rows + 1); return { x: gx + w.c * (ww + gx), y: top + gy + w.r * (wh + gy), w: ww, h: wh }; };
  function spawnOne() { const free = wins.filter(w => !w.pop); if (!free.length) return; const w = pickOne(free); const t = Math.random() < .5;
    w.pop = { ch: pickOne(t ? cfg.targets : cfg.distractors), t, k: 0, life: stay, state: 'up' }; }
  st.cv.addEventListener('pointerdown', e => { const p = st.local(e); if (done) return;
    for (const w of wins) { if (!w.pop || w.pop.state === 'hit') continue; const gm = geo(w); if (p.x > gm.x && p.x < gm.x + gm.w && p.y > gm.y - gm.h * .1 && p.y < gm.y + gm.h) { const q = w.pop;
      if (q.t) { hits++; api.progress(hits); SFX.pop(); SFX.good(); q.state = 'hit'; q.life = .5; fx.burst(gm.x + gm.w / 2, gm.y + gm.h * .4); fx.text(gm.x + gm.w / 2, gm.y, pickOne(PRAISE)); }
      else { wrong++; SFX.bad(); q.state = 'sad'; q.life = .6; shake = .25; } return; } } });
  window.__eng = { get pops() { return wins.filter(w => w.pop && w.pop.state === 'up' && w.pop.k > .6).map(w => { const g = geo(w); return { x: g.x + g.w / 2, y: g.y + g.h * .5, t: w.pop.t }; }); } };
  st.run(dt => {
    const { W, H } = st;
    spawn -= dt; const active = wins.filter(w => w.pop).length;
    if (spawn <= 0 && !done && active < (lv >= 2 ? 3 : 2)) { spawnOne(); spawn = rnd(.5, 1.1) / lvlSpeed(cfg); }
    for (const w of wins) { const q = w.pop; if (!q) continue; q.life -= dt; q.k = q.state === 'up' ? Math.min(1, q.k + dt * 5) : Math.max(0, q.k - dt * 3);
      if (q.life <= 0 && q.state === 'up') q.state = 'down'; if (q.state !== 'up' && q.life <= -0.35) w.pop = null; }
    ctx.save(); if (shake > 0) { shake -= dt; ctx.translate(rnd(-4, 4), 0); }
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#FBE7C6'); g.addColorStop(1, '#F2D9A8'); ctx.fillStyle = g; ctx.fillRect(-10, 0, W + 20, H);
    // facade with geometric frieze
    ctx.fillStyle = '#E8CFA0'; ctx.fillRect(0, H * .12, W, H); ctx.fillStyle = '#1236A0'; ctx.fillRect(0, H * .1, W, 12);
    for (let x = 0; x < W; x += 28) { ctx.fillStyle = '#C9A24B'; star8(ctx, x + 14, H * .1 + 6, 5, 0); ctx.fill(); }
    ctx.fillStyle = '#C8174D'; ctx.fillRect(0, H * .92, W, H * .08); ctx.fillStyle = '#A8822F'; ctx.fillRect(0, H * .92, W, 4);
    for (const w of wins) { const { x, y, w: ww, h } = geo(w);
      ctx.fillStyle = '#0C2470'; arch(ctx, x, y, ww, h); ctx.fill();
      ctx.save(); arch(ctx, x + 6, y + 6, ww - 12, h - 12); ctx.clip();
      const gi = ctx.createLinearGradient(0, y, 0, y + h); gi.addColorStop(0, '#1A3E9E'); gi.addColorStop(1, '#0A1E5C'); ctx.fillStyle = gi; ctx.fillRect(x, y, ww, h);
      const q = w.pop; if (q) { const yy = y + h * (1.15 - .75 * easeOut(q.k)); const s = ww / 110;
        drawHoopoe(ctx, x + ww / 2, yy, s, { mood: q.state === 'sad' ? 'sad' : 'ok' });
        // sign
        const sw = ww * .62, sh = ww * .4, sx = x + ww / 2 - sw / 2, sy = yy + 18 * s; ctx.fillStyle = q.state === 'hit' ? '#DDF1E8' : q.state === 'sad' ? '#FBE1E9' : '#FBF7F0'; rr(ctx, sx, sy, sw, sh, 8); ctx.fill(); ctx.strokeStyle = '#C9A24B'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#0C2470'; ctx.font = AR_FONT(sh * .62); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(q.ch, x + ww / 2, sy + sh / 2 + 2); }
      ctx.restore();
      ctx.fillStyle = '#C9A24B'; ctx.fillRect(x - 4, y + h - 8, ww + 8, 10);
      ctx.strokeStyle = '#C9A24B'; ctx.lineWidth = 3; arch(ctx, x, y, ww, h); ctx.stroke(); }
    fx.draw(ctx, dt); ctx.restore();
    if (!done && hits >= goal) { done = true; setTimeout(() => api.finish({ correct: hits, wrong }), 500); }
  });
  return () => st.stop();
} };
function easeOut(k) { return 1 - Math.pow(1 - k, 3); }

/* ============ E4 seek: (trees) letters move between palms, (grid) find all forms ============ */
ENGINES.seek = { name: 'بحث وكشف', controls: 'المس النخلة أو الخانة الصحيحة', total: l => l.goal || 8, fn(root, cfg, api) {
  if (cfg.mode === 'grid') return seekGrid(root, cfg, api);
  const st = makeStage(root, .58, 1.1), { ctx } = st, fx = fxLayer();
  const goal = cfg.goal || 8, lv = cfg.level || 1, n = lv >= 3 ? 6 : 5, swap = [0, 3.2, 2.5, 1.9][lv];
  let found = 0, wrong = 0, done = false, timer = 1.2, reveal = null, lock = false;
  const trees = Array.from({ length: n }, (_, i) => ({ i, ch: '', t: false, a: 1, peek: 0 }));
  function deal() { const tIdx = Math.random() * n | 0; trees.forEach((tr, i) => { tr.t = i === tIdx; tr.ch = tr.t ? pickOne(cfg.targets) : pickOne(cfg.distractors); tr.a = 0; }); }
  deal();
  const pos = i => { const { W, H } = st; const row = i % 2; return { x: W * (.12 + i * (.76 / (n - 1))), y: H * (row ? .9 : .72) }; };
  st.cv.addEventListener('pointerdown', e => { if (done || lock) return; const p = st.local(e);
    for (const tr of trees) { const q = pos(tr.i), s = st.H / 330; if (Math.abs(p.x - q.x) < 48 * s && p.y < q.y && p.y > q.y - 150 * s) {
      lock = true; if (tr.t) { found++; api.progress(found); SFX.good(); tr.peek = 1; reveal = tr; fx.burst(q.x, q.y - 90 * s); fx.text(q.x, q.y - 150 * s, pickOne(PRAISE)); }
      else { wrong++; SFX.bad(); tr.peek = -1; }
      setTimeout(() => { tr.peek = 0; reveal = null; lock = false; if (found >= goal) { done = true; api.finish({ correct: found, wrong }); } else { deal(); timer = swap; } }, 900); return; } } });
  window.__eng = { get trees() { return trees.map(tr => { const q = pos(tr.i), s = st.H / 330; return { x: q.x, y: q.y - 70 * s, t: tr.t }; }); }, get lock() { return lock; } };
  st.run(dt => {
    const { W, H } = st, s = H / 330;
    if (!lock) { timer -= dt; if (timer <= 0) { deal(); timer = swap; SFX.whoosh(); } }
    trees.forEach(tr => tr.a = Math.min(1, tr.a + dt * 3));
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#F9D7A6'); g.addColorStop(.5, '#FBEBD0'); g.addColorStop(1, '#F2EADC'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#F5C97E'; ctx.beginPath(); ctx.arc(W * .8, H * .18, 34 * s, 0, 7); ctx.fill();
    ctx.fillStyle = '#EBCB98'; ctx.beginPath(); ctx.moveTo(0, H * .55); for (let x = 0; x <= W; x += 30) ctx.lineTo(x, H * .52 + Math.sin(x / 120) * 16); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    ctx.fillStyle = '#7FC1D6'; ctx.beginPath(); ctx.ellipse(W * .5, H * .62, W * .22, H * .05, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#E2C38D'; ctx.beginPath(); ctx.moveTo(0, H * .78); for (let x = 0; x <= W; x += 30) ctx.lineTo(x, H * .76 + Math.sin(x / 90 + 1) * 10); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    const order = [...trees].sort((a, b) => pos(a.i).y - pos(b.i).y);
    for (const tr of order) { const q = pos(tr.i);
      if (tr.peek) { const k = 1; if (tr.peek > 0) drawHoopoe(ctx, q.x + 30 * s, q.y - 40 * s, .8 * s); else { ctx.fillStyle = 'rgba(200,23,77,.25)'; ctx.beginPath(); ctx.arc(q.x, q.y - 30 * s, 26 * s * k, 0, 7); ctx.fill(); } }
      palm(ctx, q.x, q.y, 1.35 * s, Math.sin(st.t * 1.3 + tr.i) * 2);
      // lantern sign hanging on trunk
      const ly = q.y - 70 * s; ctx.strokeStyle = '#8A6A3F'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q.x + 4 * s, ly - 22 * s); ctx.lineTo(q.x + 4 * s, ly - 14 * s); ctx.stroke();
      ctx.globalAlpha = tr.a; ctx.fillStyle = tr.peek < 0 ? '#FBE1E9' : '#FBF7F0'; rr(ctx, q.x - 26 * s, ly - 14 * s, 60 * s, 40 * s, 10 * s); ctx.fill(); ctx.strokeStyle = '#C9A24B'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#0C2470'; ctx.font = AR_FONT(26 * s); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(tr.ch, q.x + 4 * s, ly + 7 * s); ctx.globalAlpha = 1; }
    // timer bar
    if (!lock) { ctx.fillStyle = 'rgba(12,36,112,.15)'; rr(ctx, W * .3, 10, W * .4, 8, 4); ctx.fill(); ctx.fillStyle = '#C9A24B'; rr(ctx, W * .3, 10, W * .4 * Math.max(0, timer / swap), 8, 4); ctx.fill(); }
    fx.draw(ctx, dt);
  });
  return () => st.stop();
} };
function seekGrid(root, cfg, api) {
  const lv = cfg.level || 1, cols = lv >= 2 ? 6 : 5, rows = lv >= 3 ? 5 : 4, nT = cfg.goal || 6;
  const cells = shuffle([...Array.from({ length: nT }, () => ({ ch: pickOne(cfg.targets), t: true })), ...Array.from({ length: cols * rows - nT }, () => ({ ch: pickOne(cfg.distractors), t: false }))]);
  let found = 0, wrong = 0;
  root.innerHTML = `<div class="seekgrid" style="grid-template-columns:repeat(${cols},1fr)">${cells.map((c, i) => `<button class="cell" data-i="${i}">${esc(c.ch)}</button>`).join('')}</div><p class="seekcount" id="seekc">وجدت ${num(0)} من ${num(nT)}</p>`;
  root.querySelectorAll('.cell').forEach(b => b.onclick = () => { const c = cells[+b.dataset.i]; if (b.classList.contains('got')) return;
    if (c.t) { b.classList.add('got'); found++; api.progress(found); SFX.good(); $('seekc').textContent = `وجدت ${num(found)} من ${num(nT)}`; if (found === nT) setTimeout(() => api.finish({ correct: found, wrong }), 500); }
    else { wrong++; SFX.bad(); b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); } });
  window.__eng = { cells: () => cells };
  return () => { };
}

/* ============ E7 race: a cart drives through the gate with the right answer ============ */
ENGINES.race = { name: 'سباق ومسارات', controls: 'المس يمين الطريق أو يساره، اسحب، أو الأسهم', total: l => l.goal || 8, fn(root, cfg, api) {
  const st = makeStage(root, .62, 1.3), { ctx } = st, fx = fxLayer();
  const goal = cfg.goal || 8, sp = lvlSpeed(cfg); let lane = 1, laneX = 1, scroll = 0, speed = 190 * sp, passed = 0, wrong = 0, done = false, gate = null, bump = 0, gap = 1.2, current = '';
  const used = new Set(); const dunes = Array.from({ length: 12 }, () => ({ y: rnd(0, 1), side: Math.random() < .5, s: rnd(.6, 1.1) }));
  function newGate() { const pool = cfg.targets.filter(w => !used.has(w)); const tw = pickOne(pool.length ? pool : cfg.targets); used.add(tw); current = tw;
    const opts = shuffle([tw, ...shuffle(cfg.distractors.filter(d => stripHarakat(d) !== stripHarakat(tw))).slice(0, 2)]); gate = { y: -80, opts, ok: opts.indexOf(tw), hit: false }; }
  const road = () => { const { W } = st; const rw = Math.min(W * .86, 520); return { x: (W - rw) / 2, w: rw }; };
  const steer = d => { lane = Math.max(0, Math.min(2, lane + d)); SFX.tap(); };
  let sx = null; st.cv.addEventListener('pointerdown', e => { sx = st.local(e).x; });
  st.cv.addEventListener('pointerup', e => { const x = st.local(e).x; if (sx !== null && Math.abs(x - sx) > 30) steer(x > sx ? 1 : -1); else { const r = road(); const L = Math.floor((x - r.x) / (r.w / 3)); if (L >= 0 && L <= 2) { lane = L; SFX.tap(); } } sx = null; });
  const kd = e => { if (e.key === 'ArrowLeft') steer(-1); if (e.key === 'ArrowRight') steer(1); }; addEventListener('keydown', kd);
  window.__eng = { get gate() { return gate && { y: gate.y, ok: gate.ok }; }, setLane(i) { lane = i; }, get lane() { return lane; } };
  newGate();
  st.run(dt => {
    const { W, H } = st, r = road(), lw = r.w / 3, carY = H - 90;
    laneX += (lane - laneX) * Math.min(1, dt * 10); bump = Math.max(0, bump - dt);
    const v = speed * (bump > 0 ? .45 : 1); scroll += v * dt;
    if (gate) { gate.y += v * dt;
      if (!gate.hit && gate.y > carY - 30) { gate.hit = true; const L = Math.round(laneX);
        if (L === gate.ok) { passed++; api.progress(passed); SFX.good(); fx.burst(r.x + lw * (L + .5), carY - 30); fx.text(r.x + lw * (L + .5), carY - 70, pickOne(PRAISE)); speed *= 1.04; }
        else { wrong++; SFX.bad(); bump = .8; fx.burst(r.x + lw * (L + .5), carY - 20, '#C8174D', 10); } }
      if (gate.y > H + 60) { gate = null; gap = 1.0; if (passed >= goal && !done) { done = true; setTimeout(() => api.finish({ correct: passed, wrong }), 300); } } }
    else if (!done) { gap -= dt; if (gap <= 0) newGate(); }
    // desert sides
    ctx.fillStyle = '#F2D9A8'; ctx.fillRect(0, 0, W, H);
    for (const d of dunes) { const y = ((d.y * H + scroll * .6) % (H + 100)) - 50; const x = d.side ? r.x - 40 : r.x + r.w + 40; palm(ctx, d.side ? x - 20 : x + 20, y, .55 * d.s, 0); }
    ctx.fillStyle = '#B8A07A'; ctx.fillRect(r.x - 10, 0, r.w + 20, H); ctx.fillStyle = '#D8C29A'; ctx.fillRect(r.x, 0, r.w, H);
    ctx.strokeStyle = '#FBF7F0'; ctx.lineWidth = 4; ctx.setLineDash([24, 22]); ctx.lineDashOffset = -scroll; for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(r.x + lw * i, 0); ctx.lineTo(r.x + lw * i, H); ctx.stroke(); } ctx.setLineDash([]);
    // gate: three pointed arches with words
    if (gate) { const y = gate.y; ctx.fillStyle = '#0C2470'; ctx.fillRect(r.x - 6, y - 70, r.w + 12, 12);
      gate.opts.forEach((w, i) => { const x = r.x + lw * i + 8; const ok = gate.hit && i === gate.ok; ctx.fillStyle = gate.hit ? (ok ? '#DDF1E8' : 'rgba(255,255,255,.55)') : '#FBF7F0'; arch(ctx, x, y - 58, lw - 16, 62); ctx.fill(); ctx.strokeStyle = '#C9A24B'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#0C2470'; ctx.font = AR_FONT(Math.min(26, lw * .2)); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(w, x + (lw - 16) / 2, y - 22); }); }
    // cart with Nour
    const cx = r.x + lw * (laneX + .5), wob = bump > 0 ? Math.sin(st.t * 40) * 4 : 0;
    ctx.save(); ctx.translate(cx + wob, carY);
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(0, 34, 40, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#C8174D'; rr(ctx, -34, -6, 68, 38, 10); ctx.fill(); ctx.fillStyle = '#C9A24B'; ctx.fillRect(-34, 8, 68, 5);
    ctx.fillStyle = '#0C2470'; for (const wx of [-26, 26]) { ctx.beginPath(); ctx.arc(wx, 32, 9, 0, 7); ctx.fill(); }
    ctx.restore();
    drawNour(ctx, cx + wob, carY - 24, .55, { mood: bump > 0 ? 'sad' : 'happy' });
    fx.draw(ctx, dt);
  });
  return () => { st.stop(); removeEventListener('keydown', kd); };
} };
