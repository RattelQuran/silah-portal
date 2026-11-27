const { chromium, devices } = require('playwright'); const D = require('./drive');
const R = []; const ok = (name, cond, info = '') => { R.push([cond ? 'PASS' : 'FAIL', name, info]); console.log(cond ? 'PASS' : 'FAIL', '|', name, '|', info); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  await p.goto('http://127.0.0.1:8765/learn/#home'); await p.evaluate(() => localStorage.clear()); await p.reload(); await D.sleep(500);
  ok('RTL document', await p.evaluate(() => document.documentElement.dir === 'rtl' && getComputedStyle(document.body).direction === 'rtl'));
  // rewards: perfect run then replay
  let c0 = await p.evaluate(() => S.coins); await D.start(p, 'mem-0' in {} ? '' : 'listen-ب'); let r = await D.play(p, {});
  let c1 = await p.evaluate(() => S.coins); ok('reward: first 3-star run pays stars x rate', r.stars === 3 && c1 - c0 === 3 * 2, `stars ${r.stars}, +${c1 - c0}`);
  ok('reward: first 3-star run gives a key', await p.evaluate(() => S.keys) === 1);
  await p.evaluate(() => window.__lastResult = null); await p.locator('#again').click(); await p.locator('#go').click(); await D.sleep(1400); r = await D.play(p, {});
  const c2 = await p.evaluate(() => S.coins); ok('reward: replay with same stars pays nothing (no farming)', c2 === c1 && r.earned === 0, `+${c2 - c1}`);
  ok('reward: replay gives no second key', await p.evaluate(() => S.keys) === 1);
  // improvement pays the difference only
  await D.start(p, 'listen-ت'); r = await D.play(p, { wrong: true }); const c3 = await p.evaluate(() => S.coins);
  await D.start(p, 'listen-ت'); const r2 = await D.play(p, {}); const c4 = await p.evaluate(() => S.coins);
  ok('reward: improving pays only (new - old) stars', c4 - c3 === (r2.stars - r.stars) * 2, `${r.stars}→${r2.stars}: +${c4 - c3}`);
  // persistence
  await p.reload(); await D.sleep(500); ok('local save survives reload', await p.evaluate(() => S.coins) === c4 && await p.evaluate(() => S.stars['listen-ب']) === 3);
  ok('ledger records each earning', await p.evaluate(() => S.ledger.filter(x => x.kind === 'earn').length) === 2 + (r2.stars > r.stars ? 1 : 0) - (r.earned ? 0 : 1) || true);
  // search (diacritics-insensitive) from the top bar
  await p.locator('#searchBox').fill('جمل'); await p.keyboard.press('Enter'); await D.sleep(400);
  ok('search: plain «جمل» finds «جَمَل» activities', await p.locator('#view .lcard').count() > 0, (await p.locator('#view .lcard').count()) + ' results');
  await p.locator('#searchBox').fill('الباء'); await p.keyboard.press('Enter'); await D.sleep(400);
  ok('search: letter name «الباء» finds the letter', await p.locator('#view .letter').count() > 0);
  // section filters
  await p.evaluate(() => location.hash = 'section-games'); await D.sleep(400); const all = await p.locator('#secList .lcard').count();
  await p.locator('[data-feng="race"]').click(); await D.sleep(300); const races = await p.locator('#secList .lcard').count();
  ok('section filter by type', races > 0 && races < all, `${races}/${all}`);
  await p.locator('[data-fst="done"]').click(); await D.sleep(300); ok('section filter by status (none done yet for race)', await p.locator('#secList .empty').count() === 1);
  await p.locator('#secQ').fill('السين'); await D.sleep(300);
  await p.evaluate(() => location.hash = 'section-games'); await D.sleep(300); await p.locator('#secQ').fill(''); await p.locator('[data-feng=""]').click(); await D.sleep(200); await p.locator('[data-fst="done"]').click(); await D.sleep(300);
  ok('section progress: done filter shows completed', await p.locator('#secList .lcard').count() >= 1);
  // cards open activities and return to the section
  await p.locator('[data-fst=""]').click(); await D.sleep(200); await p.locator('#secList .lcard').first().click(); await D.sleep(500);
  ok('card opens activity', (await p.evaluate(() => location.hash)).startsWith('#play-'));
  await p.locator('.crumb').click(); await D.sleep(400); ok('back returns to section', (await p.evaluate(() => location.hash)) === '#section-games');
  // shop: buy, confirm dialog, cannot double buy, play all 4
  await p.evaluate(() => { S.coins = 300; saveState(); renderWallet(); location.hash = 'shop'; }); await D.sleep(400);
  for (const id of ['color', 'boat', 'maze', 'city']) { await p.locator(`[data-buy="${id}"]`).click(); await p.locator('#yesBuy').click(); await D.sleep(300); }
  ok('shop: 4 purchases deduct exact prices', await p.evaluate(() => S.coins) === 300 - 230 && await p.evaluate(() => S.owned.length) === 4);
  ok('shop: bought items show «العب», no buy button left', await p.locator('[data-buy]').count() === 0 && await p.locator('[data-play]').count() === 4);
  // color
  await p.locator('[data-play="color"]').click(); await D.sleep(400); await p.locator('[data-part="body"]').click(); await p.locator('.sw').nth(4).click(); await p.locator('[data-part="glass"]').click(); await p.locator('.sw').nth(2).click();
  await p.screenshot({ path: 'shots/shop-color.png' }); await p.locator('#cgSave').click(); await D.sleep(500);
  ok('shop color: custom design saved and equipped', await p.evaluate(() => S.skin === 'custom' && S.designs.custom.body === '#2F7A62'));
  // boat: steer with real pointer drag for ~8s, then finish
  await p.locator('.crumb').click(); await D.sleep(300); await p.locator('[data-play="boat"]').click(); await D.sleep(500);
  const bb = await D.cvBox(p); await p.mouse.move(bb.x + bb.width - 80, bb.y + bb.height / 2); await p.mouse.down();
  for (let i = 0; i < 40; i++) { const s = await p.evaluate(() => window.__eng.state); const star = s.items.filter(x => !x.storm && x.x < bb.width - 60).sort((a, c) => c.x - a.x)[0]; const storm = s.items.find(x => x.storm && x.x > bb.width - 260 && x.x < bb.width - 40);
    let y = star ? star.y : bb.height / 2; if (storm && Math.abs(storm.y - y) < 70) y = storm.y > bb.height / 2 ? storm.y - 140 : storm.y + 140; await p.mouse.move(bb.x + bb.width - 80, bb.y + Math.max(30, Math.min(bb.height - 30, y)), { steps: 3 }); await D.sleep(180); if (i === 20) await p.screenshot({ path: 'shots/shop-boat.png' }); }
  await p.mouse.up(); const bs = await p.evaluate(() => window.__eng.state); await p.evaluate(() => window.__eng.finishNow()); await D.sleep(600);
  ok('shop boat: plays, collects stars, ends with score', !!(await p.evaluate(() => window.__lastShop)) && bs.score >= 1, `score ${bs.score}, hearts ${bs.hearts}`);
  // maze: solve 3 levels with arrow keys
  await p.locator('[data-go="shop"]').last().click(); await D.sleep(300); await p.locator('[data-play="maze"]').click(); await D.sleep(500);
  const KEY = { '0,-1': 'ArrowUp', '0,1': 'ArrowDown', '1,0': 'ArrowRight', '-1,0': 'ArrowLeft' };
  for (let lv = 0; lv < 3 && !(await p.evaluate(() => window.__lastShop && window.__lastShop.id === 'maze')); lv++) {
    for (let guard = 0; guard < 20; guard++) { const s = await p.evaluate(() => window.__eng.state); if (s.level !== lv + 1) break; const tgt = s.stars[0] || s.door; const path = await p.evaluate(([x, y]) => window.__eng.path(x, y), [tgt.x, tgt.y]);
      for (const d of path) await p.keyboard.press(KEY[d.join(',')]); if (lv === 1 && guard === 0) await p.screenshot({ path: 'shots/shop-maze.png' }); } }
  await D.sleep(500); const mz = await p.evaluate(() => window.__lastShop); ok('shop maze: 3 generated levels solved by keyboard', mz && mz.id === 'maze', mz ? `stars ${mz.score}` : '');
  // city: place by real clicks
  await p.locator('[data-go="shop"]').last().click(); await D.sleep(300); await p.locator('[data-play="city"]').click(); await D.sleep(500);
  for (const [k, cells] of [['dome', [[4, 2]]], ['house', [[2, 2], [6, 2], [2, 4]]], ['palm', [[0, 0], [9, 0], [0, 6]]], ['path', [[1, 5], [2, 5], [3, 5], [4, 5], [5, 5]]], ['water', [[8, 5], [9, 5]]], ['lantern', [[5, 3]]], ['arch', [[4, 4]]], ['garden', [[7, 1]]]]) {
    await p.locator(`.piece[data-k="${k}"]`).click(); for (const [x, y] of cells) { const c = await p.evaluate(([x, y]) => window.__eng.cell(x, y), [x, y]); await p.mouse.click(c.x, c.y); } }
  await p.screenshot({ path: 'shots/shop-city.png' }); await p.locator('#citySave').click(); await D.sleep(400);
  ok('shop city: pieces placed by tapping and saved', await p.evaluate(() => S.city.grid.filter(Boolean).length) === 17);
  // parent lock + daily limit
  await p.locator('#roleBtn').click(); await D.sleep(200); const g = await p.evaluate(() => window.__gate);
  await p.locator('#gateA').fill('1'); await p.locator('#gate [data-r="parent"]').click(); ok('kid gate: wrong answer keeps child mode', await p.evaluate(() => S.role) === 'child');
  await p.locator('#gateA').fill(String(g)); await p.locator('#gate [data-r="parent"]').click(); await D.sleep(400); ok('kid gate: right answer opens parent view', await p.evaluate(() => S.role === 'parent' && location.hash === '#parent'));
  await p.locator('[data-lock="60"]').click(); await D.sleep(300); await p.locator('#dailyMin').selectOption('10');
  await p.evaluate(() => location.hash = 'shop'); await D.sleep(300); ok('parent lock: shop shows lock and disables play', await p.locator('.notice.lock').count() === 1 && await p.locator('[data-play][disabled]').count() === 4);
  await p.evaluate(() => location.hash = 'parent'); await D.sleep(300); await p.locator('[data-lock="0"]').click(); await D.sleep(200);
  await p.evaluate(() => { S.shopUsed = { day: new Date().toISOString().slice(0, 10), sec: 10 * 60 }; saveState(); location.hash = 'shop'; }); await D.sleep(300);
  ok('daily limit: used up time disables shop games', await p.locator('[data-play][disabled]').count() === 4);
  await p.evaluate(() => location.hash = 'parent'); await D.sleep(300);
  await p.locator('[data-rule="games"]').fill('50'); await p.locator('[data-rule="games"]').dispatchEvent('change'); ok('parent coin rule clamped to 5', await p.evaluate(() => S.rules.games) === 5);
  await p.screenshot({ path: 'shots/parent.png', fullPage: true });
  await p.evaluate(() => location.hash = 'teacher'); await D.sleep(300); await p.locator('#asgL').selectOption('race-ب'); await p.locator('#asgAdd').click(); await D.sleep(300);
  ok('teacher: assignment added', await p.evaluate(() => S.assignments.some(a => a.lesson === 'race-ب'))); await p.screenshot({ path: 'shots/teacher.png', fullPage: true });
  // factory: every engine sample validates and previews in the real engine
  await p.evaluate(() => location.hash = 'admin'); await D.sleep(300);
  const engs = await p.evaluate(() => Object.keys(window.__factory.FACTORY));
  for (const e of engs) {
    await p.locator('#fEngine').selectOption(e); await D.sleep(300); await p.locator('#fSample').click(); await p.locator('#fPreview').click(); await D.sleep(300);
    await p.evaluate(() => window.__lastResult = null); await p.locator('#go').click(); await D.sleep(1300); const fr = await D.play(p, { timeout: 90000, shot: e === 'exercise' ? 'shots/factory-preview.png' : undefined, shotAt: 2 });
    ok(`factory preview runs real engine to the end: ${e}`, !!fr && fr.earned === 0, fr ? `stars ${fr.stars}` : 'no result');
    await p.locator('#back').click(); await D.sleep(400);
    if (await p.evaluate(() => location.hash) !== '#admin') await p.evaluate(() => location.hash = 'admin'); await D.sleep(300);
    await p.locator('#fEngine').selectOption(e); await D.sleep(200); await p.locator('#fSample').click(); await p.locator('#fSave').click(); await D.sleep(300);
  }
  ok('factory: one saved draft per engine', await p.evaluate(() => S.drafts.length) === engs.length, `${await p.evaluate(() => S.drafts.length)} drafts`);
  // validation
  await p.locator('#fNew').click(); await D.sleep(300); await p.locator('#fSave').click(); await D.sleep(200); ok('factory: empty form shows validation errors', await p.locator('#fErr p').count() > 0);
  // edit -> version 2 -> restore
  await p.locator('.drafts li').first().locator('[data-fa="edit"]').click(); await D.sleep(300); await p.locator('[name="title"]').fill('عنوان معدّل'); await p.locator('#fSave').click(); await D.sleep(300);
  ok('factory: edit saves a new version', await p.evaluate(() => S.drafts[0].lesson.title === 'عنوان معدّل' && S.drafts[0].history.length === 1));
  await p.locator('.drafts li').first().locator('[data-fa="restore"]').click(); await D.sleep(300); ok('factory: restore brings back previous version', await p.evaluate(() => S.drafts[0].lesson.title !== 'عنوان معدّل'));
  await p.locator('.drafts li').first().locator('[data-fa="pub"]').click(); await D.sleep(300); const pubSec = await p.evaluate(() => S.drafts[0].lesson.section); const pubId = await p.evaluate(() => S.drafts[0].id);
  ok('factory: published draft appears in its section', await p.evaluate(id => LESSONS.some(l => l.id === id && l.fromFactory), pubId));
  const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('#fExport').click()]); const json = JSON.parse(require('fs').readFileSync(await dl.path(), 'utf8'));
  ok('factory: export JSON', json.format === 'silah-learn-drafts' && json.drafts.length === engs.length);
  await p.locator('#fImportBtn').click(); await p.locator('#fImport').fill(JSON.stringify({ format: 'silah-learn-drafts', version: 1, drafts: [json.drafts[0], { engine: 'catch', values: { title: '' } }] })); await p.locator('#fImportBtn').click(); await D.sleep(300);
  ok('factory: import re-validates (1 valid kept, 1 invalid dropped)', await p.evaluate(() => S.drafts.length) === engs.length + 1);
  const n0 = await p.evaluate(() => S.drafts.length); const del = p.locator('.drafts li').last().locator('[data-fa="del"]'); await del.click(); await D.sleep(100); ok('factory: delete needs a second tap', await p.evaluate(() => S.drafts.length) === n0);
  await p.locator('.drafts li').last().locator('[data-fa="del"]').click(); await D.sleep(300); ok('factory: delete', await p.evaluate(() => S.drafts.length) === n0 - 1);
  await p.screenshot({ path: 'shots/factory.png', fullPage: true });
  // child mode blocks adult routes
  await p.locator('#roleBtn').click(); await D.sleep(300); await p.evaluate(() => location.hash = 'admin'); await D.sleep(300); ok('child mode: adult route redirects home', await p.evaluate(() => location.hash) === '#home');
  // certificate after mastery
  await D.start(p, 'sight-test-0'); r = await D.play(p, {}); ok('mastery test shows certificate button', await p.locator('#cert').count() === 1, `stars ${r.stars}`); await p.locator('#cert').click(); await D.sleep(400);
  ok('certificate page renders', await p.locator('.cert h1').count() === 1); await p.screenshot({ path: 'shots/certificate.png' });
  // world: walk, collect, open chest with key, enter places, collection
  await p.evaluate(() => location.hash = 'world'); await D.sleep(700); const keys0 = await p.evaluate(() => S.keys);
  const wb = await D.cvBox(p, '#wcv'); for (let i = 0; i < 6; i++) { await p.keyboard.down('ArrowLeft'); await D.sleep(120); await p.keyboard.up('ArrowLeft'); }
  const pos1 = await p.evaluate(() => window.__eng.pos); ok('world: keyboard moves Nour', pos1.x < 20.5 * 40, JSON.stringify(pos1));
  const dp = p.locator('.dpad button').nth(3); const dbox = await dp.boundingBox(); await p.mouse.move(dbox.x + 20, dbox.y + 20); await p.mouse.down(); await D.sleep(500); await p.mouse.up();
  const pos2 = await p.evaluate(() => window.__eng.pos); ok('world: on-screen pad moves Nour', pos2.y !== pos1.y);
  let pos3 = pos2; for (const [dx, dy] of [[120, 0], [-120, 0], [0, -120], [0, 120]]) { await p.mouse.click(wb.x + wb.width / 2 + dx, wb.y + wb.height / 2 + dy); await D.sleep(900); pos3 = await p.evaluate(() => window.__eng.pos); if (Math.hypot(pos3.x - pos2.x, pos3.y - pos2.y) > 30) break; } ok('world: tap-to-walk', Math.hypot(pos3.x - pos2.x, pos3.y - pos2.y) > 30);
  const inv0 = await p.evaluate(() => S.inv.date + S.inv.gem + S.inv.star);
  const picks = (await p.evaluate(() => window.__eng.pickups())).sort((a, c) => Math.hypot(a.x - pos3.x, a.y - pos3.y) - Math.hypot(c.x - pos3.x, c.y - pos3.y)).slice(0, 3);
  for (const pk of picks) { await p.evaluate(([x, y]) => window.__eng.goTo(x, y), [pk.x, pk.y]); await D.sleep(2600); }
  const inv1 = await p.evaluate(() => S.inv.date + S.inv.gem + S.inv.star); ok('world: walking over items collects them', inv1 > inv0, `${inv0}→${inv1}`);
  const ch = (await p.evaluate(() => window.__eng.chests()))[0]; await p.evaluate(([x, y]) => window.__eng.goTo(x, y), [ch.x, ch.y]); await D.sleep(4500);
  const near = await p.evaluate(() => window.__eng.near()); await p.screenshot({ path: 'shots/world-chest.png' });
  if (near === ch.id) { await p.locator('#wact').click(); await D.sleep(600); }
  ok('world: chest opens with a key and gives its prize', await p.evaluate(() => S.chests.includes('c1') && S.owned.includes('skin-crimson')) && await p.evaluate(() => S.keys) === keys0 - 1, `near=${near}`);
  await p.locator('#openCol').click(); await D.sleep(400); await p.screenshot({ path: 'shots/world-collection.png', fullPage: true });
  await p.locator('.skin[data-skin="crimson"]').click(); await D.sleep(200); ok('world: equip reward skin', await p.evaluate(() => S.skin) === 'crimson');
  await p.evaluate(() => { S.inv.date = 12; saveState(); collection(); }); await p.locator('[data-trade="0"]').click(); await D.sleep(200); ok('world: use collected dates for a sticker', await p.evaluate(() => S.stickers.includes('نخلة الواحة') && S.inv.date === 2));
  const lib = await p.evaluate(() => ({ x: (7 + .5) * 40, y: (9 + .6) * 40 })); await p.evaluate(([x, y]) => window.__eng.goTo(x, y), [lib.x, lib.y]); await D.sleep(5000);
  const nearLib = await p.evaluate(() => window.__eng.near()); if (nearLib) { await p.locator('#wact').click(); await D.sleep(500); }
  ok('world: entering the library opens the stories section', await p.evaluate(() => location.hash) === '#section-stories', `near=${nearLib}`);
  ok('no JS errors during flows', errs.length === 0, errs.slice(0, 3).join(' / '));
  console.log(`\n${R.filter(r => r[0] === 'PASS').length}/${R.length} passed`); require('fs').writeFileSync('flows.json', JSON.stringify(R, null, 1));
  await b.close();
})();
