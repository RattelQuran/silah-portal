const { chromium } = require('playwright'); const D = require('./drive');
const IDS = process.argv[2] ? process.argv[2].split(',') : null;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1100, height: 800 }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_FAILED/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://127.0.0.1:8765/learn/#home'); await p.evaluate(() => { localStorage.clear(); }); await p.reload(); await D.sleep(600);
  const cases = await p.evaluate(() => { const want = ['catch-ب', 'jump-ب', 'whack-ب', 'seek-ب', 'grid-ب', 'race-ب', 'build-ب', 'sentence-1', 'listen-ب', 'listen-letters', 'listen-riddles', 'sight-flash-0', 'sight-jump-0', 'lesson-ب', 'ex-trace-1', 'ex-gender-1', 'gr-prep-1', 'sight-test-0', 'text-drop', 'story-nour-rabbit'];
    const s = LESSONS.find(l => l.engine === 'drag' && l.mode === 'sort'), m = LESSONS.find(l => l.engine === 'memory'); return [...want, s.id, m.id]; });
  const out = [];
  for (const id of cases) { if (IDS && !IDS.includes(id)) continue;
    const t = Date.now(); const c0 = await p.evaluate(() => S.coins);
    try { await D.start(p, id); const r = await D.play(p, { wrong: true, shot: `shots/eng-${id}.png`, shotAt: 4 });
      const c1 = await p.evaluate(() => S.coins);
      out.push({ id, ok: !!r, stars: r && r.stars, correct: r && r.correct, wrong: r && r.wrong, earned: r && r.earned, coins: c1 - c0, sec: ((Date.now() - t) / 1000).toFixed(1) });
      await D.sleep(1700); await p.screenshot({ path: `shots/res-${id}.png` });
    } catch (e) { out.push({ id, ok: false, err: e.message.split('\n')[0] }); }
    console.log(JSON.stringify(out[out.length - 1]));
  }
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
