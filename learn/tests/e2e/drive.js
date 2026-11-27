// Shared Playwright drivers: play each engine through real pointer/keyboard events, using window.__eng only to READ state.
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function cvBox(p, sel = '#game canvas') { return await p.locator(sel).first().boundingBox(); }
async function tap(p, x, y, touch) { if (touch) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); }
async function resultChanged(p, prev) { return await p.evaluate(prev => window.__lastResult && window.__lastResult !== prev && JSON.stringify(window.__lastResult) !== prev, prev); }
async function drag(p, a, b) { await p.mouse.move(a.x, a.y); await p.mouse.down(); for (let i = 1; i <= 8; i++) await p.mouse.move(a.x + (b.x - a.x) * i / 8, a.y + (b.y - a.y) * i / 8); await p.mouse.up(); }
async function traceLetter(p) {
  const pts = await p.evaluate(() => window.__tracerMask()); const rows = {};
  pts.forEach(([x, y]) => (rows[y] = rows[y] || []).push(x));
  for (const [y, xs] of Object.entries(rows)) { xs.sort((a, b) => a - b); let seg = [xs[0]];
    const flush = async () => { await p.mouse.move(seg[0], +y); await p.mouse.down(); for (const x of seg) await p.mouse.move(x, +y); await p.mouse.move(seg[seg.length - 1] + 1, +y); await p.mouse.up(); };
    for (let i = 1; i < xs.length; i++) { if (xs[i] - xs[i - 1] > 6) { await flush(); seg = []; } seg.push(xs[i]); } await flush(); }
  await p.locator('[data-check]').click();
}
async function start(p, id, back) {
  await p.evaluate(([id, back]) => { playBack = back || 'home'; window.__lastResult = null; location.hash = 'play-' + id; }, [id, back]);
  try { await p.waitForSelector('#go', { timeout: 6000 }); } catch (e) { console.log('  (start retry: view =', (await p.evaluate(() => location.hash + ' | ' + document.getElementById('view').innerText.slice(0, 80))).replace(/\n/g, ' '), ')'); await p.evaluate(() => route()); await p.waitForSelector('#go', { timeout: 6000 }); }
  await p.locator('#go').click(); await sleep(1400);
}
// play whatever engine is running until the result panel appears. opts.wrong: make at least one deliberate mistake.
async function play(p, opts = {}) {
  const eng = await p.evaluate(() => document.getElementById('stage').dataset.engine);
  const t0 = Date.now(); let wrongDone = !opts.wrong, n = 0, shot = false;
  while (Date.now() - t0 < (opts.timeout || 120000)) {
    if (await p.evaluate(() => !!window.__lastResult)) break;
    if (opts.shot && !shot && n === (opts.shotAt ?? 3)) { await p.screenshot({ path: opts.shot }); shot = true; }
    n++;
    const ok = await step(p, eng, wrongDone, opts); if (ok === 'wrong') wrongDone = true;
    await sleep(opts.pace || 120);
  }
  const r = await p.evaluate(() => window.__lastResult);
  if (opts.shot && !shot) await p.screenshot({ path: opts.shot });
  return r;
}
async function step(p, eng, wrongDone, opts) {
  const touch = opts.touch;
  const st = await p.evaluate(() => { const e = window.__eng; if (!e) return null; const o = {}; for (const k of ['items', 'player', 'stones', 'busy', 'pops', 'trees', 'lock', 'gate', 'lane']) try { if (k in e) o[k] = e[k]; } catch (x) { } return o; });
  if (eng === 'catch') { const b = await cvBox(p), H = b.height, px = st.player; const its = st.items || [];
    const danger = its.filter(i => !i.t && i.y > H * .55 && i.y < H * .95);
    const tg = its.filter(i => i.t && i.y > H * .2).sort((a, c) => c.y - a.y).find(t => !danger.some(d => Math.abs(d.x - t.x) < 80 || (d.x - px) * (d.x - t.x) < 0 && Math.abs(d.x - px) < Math.abs(t.x - px)));
    let x = tg ? tg.x : px; const near = danger.find(d => Math.abs(d.x - x) < 75); if (near) x = near.x > b.width / 2 ? near.x - 160 : near.x + 160;
    await p.mouse.move(b.x + Math.max(20, Math.min(b.width - 20, x)), b.y + H * .85); return; }
  if (eng === 'jump') { if (st.busy) return; const b = await cvBox(p); const s = (st.stones || []).find(s => wrongDone ? s.ok : !s.ok); if (s) { await tap(p, b.x + s.x, b.y + s.y, touch); await sleep(900); return wrongDone ? 1 : 'wrong'; } return; }
  if (eng === 'whack') { const b = await cvBox(p); const w = (st.pops || []).find(q => wrongDone ? q.t : !q.t); if (w) { await tap(p, b.x + w.x, b.y + w.y, touch); await sleep(250); return wrongDone ? 1 : 'wrong'; } return; }
  if (eng === 'seek') {
    if (await p.locator('.seekgrid').count()) { const cells = await p.evaluate(() => window.__eng.cells().map((c, i) => c.t)); const btns = p.locator('.cell');
      for (let i = 0; i < cells.length; i++) if (cells[i] === wrongDone) { const b = btns.nth(i); if (!(await b.getAttribute('class')).includes('got')) { await b.scrollIntoViewIfNeeded(); const bb = await b.boundingBox(); await tap(p, bb.x + bb.width / 2, bb.y + bb.height / 2, touch); await sleep(200); return wrongDone ? 1 : 'wrong'; } } return; }
    if (st.lock) return; const b = await cvBox(p); const tr = (st.trees || []).find(t => wrongDone ? t.t : !t.t); if (tr) { await tap(p, b.x + tr.x, b.y + tr.y, touch); await sleep(700); return wrongDone ? 1 : 'wrong'; } return; }
  if (eng === 'race') { if (!st.gate) return; const want = wrongDone ? st.gate.ok : (st.gate.ok + 1) % 3; if (st.lane !== want) { await p.keyboard.press(st.lane > want ? 'ArrowLeft' : 'ArrowRight'); } else if (!wrongDone && st.gate.y > 200) return 'wrong'; return; }
  if (eng === 'memory') { const ks = await p.evaluate(() => window.__eng.cards()); const cards = p.locator('.mcard'); const cls = await cards.evaluateAll(es => es.map(e => e.className));
    const free = ks.map((k, i) => ({ k, i })).filter(c => !cls[c.i].includes('got'));
    if (!wrongDone) { const a = free[0], c = free.find(x => x.k !== a.k); await cards.nth(a.i).click(); await cards.nth(c.i).click(); await sleep(1100); return 'wrong'; }
    const a = free[0]; if (!a) return; const c = free.find(x => x.k === a.k && x.i !== a.i); await cards.nth(a.i).click(); await cards.nth(c.i).click(); await sleep(600); return 1; }
  if (eng === 'drag') {
    if (await p.locator('#arena.sortarena').count()) { const f = await p.evaluate(() => window.__eng.floaters()); const bins = await p.evaluate(() => window.__eng.bins()); const o = f.find(q => q.x > 40 && q.x < 1060); if (!o) return;
      const bi = wrongDone ? o.bin : (o.bin + 1) % bins.length; await drag(p, o, bins[bi]); await sleep(150); return wrongDone ? 1 : 'wrong'; }
    const tiles = p.locator('.tile'); const nT = await tiles.count(); if (!nT) return;
    if (!wrongDone && nT > 1) { /* drag a tile onto the first slot; may be wrong */ const t = await tiles.last().boundingBox(), s = await p.locator('.slot:not(.in)').first().boundingBox(); await drag(p, { x: t.x + t.width / 2, y: t.y + t.height / 2 }, { x: s.x + s.width / 2, y: s.y + s.height / 2 }); await sleep(300); return 'wrong'; }
    for (let i = 0; i < nT; i++) { const before = await tiles.count(); await tiles.nth(i).click({ timeout: 4000 }).catch(() => {}); await sleep(120); if ((await tiles.count()) < before) return 1; } return; }
  if (eng === 'listen' || eng === 'exercise' || eng === 'story' || eng === 'lesson') return choiceLike(p, eng, wrongDone, opts);
}
async function choiceLike(p, eng, wrongDone, opts) {
  if (eng === 'lesson') { const s = await p.evaluate(() => window.__eng && window.__eng.step && window.__eng.step()); if (s === undefined || s === null) return; 
    if (s <= 3) { if (s === 0) { await p.locator('.biglet').click(); } await p.locator('#next').click(); return; }
    if (s === 4) { if (await p.locator('#next').isDisabled()) { await traceLetter(p); await sleep(300); } else await p.locator('#next').click(); return; }
    if (s === 5) { if (!wrongDone) { await p.locator('.choice[data-ok="false"]').first().click(); await sleep(450); return 'wrong'; } await p.locator('.choice[data-ok="true"]').click(); await sleep(800); return; } return; }
  if (eng === 'story' && await p.locator('#scene').count()) {
    const h = await p.evaluate(() => window.__eng.hidden()); const b = await cvBox(p, '#scene'); await p.mouse.click(b.x + h.x * b.width, b.y + h.y * b.height); await sleep(300);
    await p.locator('#read').click(); await sleep(200); await p.locator('#bnext').click(); await sleep(500); return; }
  if (await p.locator('#tracer canvas').count() && await p.locator('#skip').count()) { await traceLetter(p); await sleep(900); return; }
  if (await p.locator('.catcol').count()) { const cats = await p.evaluate(() => window.__eng.cat()); const chip = p.locator('.ex .chip:not(.in)').first(); if (!(await chip.count())) return; const j = +(await chip.getAttribute('data-j')); 
    const target = wrongDone ? cats[j] : (cats[j] + 1) % 2; const a = await chip.boundingBox(), c = await p.locator(`.catcol[data-c="${target}"]`).boundingBox();
    await drag(p, { x: a.x + a.width / 2, y: a.y + a.height / 2 }, { x: c.x + c.width / 2, y: c.y + c.height / 2 }); await sleep(250); return wrongDone ? 1 : 'wrong'; }
  if (await p.locator('#ch[hidden]').count()) { await sleep(400); return; }
  const ans = await p.evaluate(() => window.__eng && window.__eng.answer && window.__eng.answer()); if (ans == null) return;
  const ch = p.locator('.choice:not([disabled])'); const n = await ch.count(); if (!n) return;
  for (let i = 0; i < n; i++) { const o = await ch.nth(i).getAttribute('data-o'); if ((o === ans) === wrongDone) { await ch.nth(i).click(); await sleep(wrongDone ? 900 : 500); return wrongDone ? 1 : 'wrong'; } }
}
module.exports = { sleep, start, play, drag, traceLetter, cvBox, tap };
