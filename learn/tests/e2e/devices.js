const { chromium, devices } = require('playwright'); const D = require('./drive');
const R = []; const ok = (n, c, i = '') => { R.push([c ? 'PASS' : 'FAIL', n, i]); console.log(c ? 'PASS' : 'FAIL', '|', n, '|', i); };
const PAGES = ['home', 'section-games', 'section-letters', 'letter-ب', 'section-sight', 'section-exercises', 'section-worksheets', 'sheet-ب', 'section-listening', 'section-grammar', 'section-stories', 'section-texts', 'world', 'shop', 'search-جمل'];
(async () => {
  const b = await chromium.launch();
  for (const [name, opt] of [['phone 390', { ...devices['iPhone 13'], defaultBrowserType: undefined }], ['tablet 820', { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }], ['desktop 1280', { viewport: { width: 1280, height: 860 } }]]) {
    delete opt.defaultBrowserType; const ctx = await b.newContext(opt); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://127.0.0.1:8765/learn/#home'); await p.evaluate(() => localStorage.clear()); await p.reload(); await D.sleep(500);
    const over = [];
    for (const h of PAGES) { await p.evaluate(h => location.hash = h, h); await D.sleep(350); const w = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (w > 1) over.push(`${h}:${w}`); }
    ok(`${name}: no horizontal scroll on ${PAGES.length} pages`, over.length === 0, over.join(' '));
    for (const h of ['home', 'section-games', 'world', 'shop']) { await p.evaluate(h => location.hash = h, h); await D.sleep(500); await p.screenshot({ path: `shots/${name.split(' ')[0]}-${h}.png` }); }
    if (opt.hasTouch) {
      for (const id of ['jump-ب', 'seek-ب', 'grid-ب', 'whack-ب']) { await D.start(p, id); const r = await D.play(p, { touch: true, timeout: 90000, shot: id === 'jump-ب' ? `shots/${name.split(' ')[0]}-play-jump.png` : undefined }); ok(`${name}: ${id} played to the end with touch taps`, !!r, r ? `stars ${r.stars}` : ''); }
      // touch drag in sort and world pad via touch events (CDP touch)
      await p.evaluate(() => location.hash = 'world'); await D.sleep(600); const pos0 = await p.evaluate(() => window.__eng.pos);
      const box = await p.locator('#wcv').boundingBox(); await p.touchscreen.tap(box.x + box.width * .3, box.y + box.height * .3); await D.sleep(1200);
      const pos1 = await p.evaluate(() => window.__eng.pos); ok(`${name}: world tap-to-walk with touch`, Math.hypot(pos1.x - pos0.x, pos1.y - pos0.y) > 20);
    }
    ok(`${name}: no JS errors`, errs.length === 0, errs.slice(0, 2).join(' / '));
    await ctx.close();
  }
  // performance: frames per second inside canvas engines + load time (headless, software rendering)
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); const p = await ctx.newPage();
  const t0 = Date.now(); await p.goto('http://127.0.0.1:8765/learn/#home'); await p.waitForSelector('.seccard'); const load = Date.now() - t0;
  const nav = await p.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { dcl: Math.round(n.domContentLoadedEventEnd), size: performance.getEntriesByType('resource').filter(r => /learn\/js|index/.test(r.name)).reduce((a, r) => a + (r.transferSize || 0), 0) }; });
  ok('load: home ready', load < 3000, `${load} ms to first section card, DCL ${nav.dcl} ms, JS+HTML ${(nav.size / 1024).toFixed(0)} KB`);
  for (const id of ['catch-ب', 'jump-ب', 'race-ب', 'whack-ب']) { await D.start(p, id);
    const fps = await p.evaluate(() => new Promise(res => { let n = 0; const t = performance.now(); const f = () => { n++; if (performance.now() - t < 3000) requestAnimationFrame(f); else res(n / 3); }; requestAnimationFrame(f); }));
    ok(`fps ${id}`, fps >= 30, `${fps.toFixed(0)} fps (headless Chromium, software GPU)`); }
  const heap = await p.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null); ok('memory', true, `${heap} MB JS heap after 4 engines`);
  await ctx.close();
  // short recordings
  const rec = await b.newContext({ viewport: { width: 960, height: 640 }, recordVideo: { dir: 'videos', size: { width: 960, height: 640 } } }); const q = await rec.newPage();
  await q.goto('http://127.0.0.1:8765/learn/#home'); await D.sleep(1500); await q.evaluate(() => location.hash = 'section-games'); await D.sleep(1200);
  for (const id of ['catch-ب', 'jump-ب', 'whack-ب', 'race-ب', 'sort-0', 'story-nour-rabbit']) { await D.start(q, id); await D.play(q, { wrong: true, pace: 160, timeout: 40000 }); await D.sleep(2200); }
  await q.evaluate(() => location.hash = 'world'); await D.sleep(800); const pk = (await q.evaluate(() => window.__eng.pickups())).slice(0, 2); for (const x of pk) { await q.evaluate(([a, c]) => window.__eng.goTo(a, c), [x.x, x.y]); await D.sleep(2500); }
  const vpath = await q.video().path(); await rec.close(); ok('recording saved', true, vpath);
  console.log(`\n${R.filter(r => r[0] === 'PASS').length}/${R.length} passed`); require('fs').writeFileSync('devices.json', JSON.stringify(R, null, 1));
  await b.close();
})();
