// End-to-end tests in demo mode (sample data only, no network). Run: npm run e2e
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { serve, browser, route, watch, ROLE_TABS, tabNames } from './helpers.mjs';

let srv, b;
before(async () => { srv = await serve(); b = await browser(); await mkdir(new URL('./out/', import.meta.url), { recursive: true }); });
after(async () => { await b.close(); srv.close(); });

async function open(role, ctxOpts = {}, setup) {
  const ctx = await b.newContext({ locale: 'ar', ...ctxOpts }); await route(ctx, 'demo');
  const page = await ctx.newPage(); if (setup) await setup(page);
  const log = watch(page);
  await page.goto(srv.url + '/index.html'); await page.click(`[data-demo="${role}"]`); await page.waitForSelector('#tabs [role="tab"]');
  return { ctx, page, log };
}
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

for (const [role, expected] of Object.entries(ROLE_TABS)) {
  for (const vp of [{ n: 'desktop', width: 1366, height: 900 }, { n: 'phone', width: 375, height: 780 }]) {
    test(`${role} on ${vp.n}: every tab renders without errors or overflow`, async () => {
      const { ctx, page, log } = await open(role, { viewport: vp });
      assert.deepEqual(await tabNames(page), expected);
      for (let i = 0; i < expected.length; i++) {
        await page.locator('#tabs [role="tab"]').nth(i).click();
        await page.waitForFunction(i => document.querySelectorAll('#tabs [role="tab"]')[i].getAttribute('aria-selected') === 'true', i);
        assert.ok((await page.locator('#main').innerText()).trim().length > 20, `${expected[i]} is empty`);
        assert.ok(await overflow(page) <= 1, `${expected[i]} overflows horizontally`);
      }
      assert.deepEqual(log.errors, []);
      await ctx.close();
    });
  }
}

test('touch screens: no control under 36px on any admin tab', async () => {
  const { ctx, page } = await open('admin', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  for (let i = 0; i < ROLE_TABS.admin.length; i++) {
    await page.locator('#tabs [role="tab"]').nth(i).click();
    const small = await page.evaluate(() => [...document.querySelectorAll('main button, main a.btn, main select, #tabs button')]
      .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 36; }).map(e => e.textContent.trim().slice(0, 20)));
    assert.deepEqual(small, [], `tab ${ROLE_TABS.admin[i]}`);
  }
  await ctx.close();
});

test('keyboard: arrows move between tabs (RTL), Home/End jump, panel is labelled', async () => {
  const { ctx, page } = await open('admin');
  await page.focus('#tabs [aria-selected="true"]');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.tab), 'regs');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.tab), 'dash');
  await page.keyboard.press('End');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.tab), 'people');
  await page.keyboard.press('Home');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.tab), 'dash');
  assert.equal(await page.getAttribute('#main', 'role'), 'tabpanel');
  assert.equal(await page.getAttribute('#main', 'aria-labelledby'), 'tab-dash');
  assert.equal(await page.locator('#tabs [tabindex="0"]').count(), 1);
  await ctx.close();
});

test('dialogs: labelled by their heading, Esc closes and focus returns to the opener', async () => {
  const { ctx, page } = await open('admin');
  await page.click('#tab-students');
  const opener = page.locator('[data-act="addst"]'); await opener.focus(); await opener.press('Enter');
  await page.waitForSelector('[role="dialog"]');
  assert.equal(await page.evaluate(() => document.getElementById(document.querySelector('[role=dialog]').getAttribute('aria-labelledby')).textContent), 'طالب جديد');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#overlay').isHidden(), true);
  assert.equal(await page.evaluate(() => document.activeElement.dataset.act), 'addst');
  await ctx.close();
});

test('forms: saving a student without a name shows an error and saves nothing', async () => {
  const { ctx, page } = await open('admin');
  await page.click('#tab-students');
  const before = await page.locator('#main h1').innerText();
  await page.click('[data-act="addst"]'); await page.click('#sform [type="submit"]');
  assert.equal(await page.locator('#f-err').isVisible(), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#main h1').innerText(), before);
  await ctx.close();
});

test('attendance: a teacher marks, changes and cancels a status', async () => {
  // Wednesday 2026-11-25 16:00 Cairo: the demo teacher has Maryam (day 3) that day
  const { ctx, page } = await open('teacher', {}, p => p.clock.setFixedTime(new Date('2026-11-25T14:00:00Z')));
  const card = page.locator('.card').first(); await card.waitFor();
  const btn = st => card.locator(`[data-act="mark"][data-st="${st}"]`);
  await btn('present').click(); await page.waitForFunction(() => document.querySelector('.card [data-st="present"]').getAttribute('aria-pressed') === 'true');
  await page.locator('.card').first().locator('[data-st="late"]').click();
  await page.waitForFunction(() => document.querySelector('.card [data-st="late"]').getAttribute('aria-pressed') === 'true');
  assert.equal(await page.locator('.card').first().locator('[data-st="present"]').getAttribute('aria-pressed'), 'false');
  await page.locator('.card').first().locator('[data-st="late"]').click();
  await page.waitForFunction(() => document.querySelector('.card [data-st="late"]').getAttribute('aria-pressed') === 'false');
  await ctx.close();
});

/* ---- F-1: "today" follows Cairo, whatever the device time zone ---- */
for (const c of [
  { name: 'New York evening is already tomorrow in Cairo', tz: 'America/New_York', at: '2026-11-25T22:30:00Z', want: '26 نوفمبر' },
  { name: 'Sydney after midnight is still yesterday in Cairo', tz: 'Australia/Sydney', at: '2026-11-25T14:00:00Z', want: '25 نوفمبر' },
  { name: 'Cairo one minute before midnight', tz: 'Africa/Cairo', at: '2026-11-25T21:59:00Z', want: '25 نوفمبر' },
  { name: 'Cairo at midnight', tz: 'Africa/Cairo', at: '2026-11-25T22:00:00Z', want: '26 نوفمبر' },
]) test(`time zone: ${c.name}`, async () => {
  const { ctx, page } = await open('teacher', { timezoneId: c.tz }, p => p.clock.setFixedTime(new Date(c.at)));
  const label = await page.locator('.nav span').first().innerText();
  assert.ok(label.includes(c.want) && label.includes('اليوم'), `got «${label}»`);
  await ctx.close();
});

/* ---- S-2: backup, preview, no silent overwrite, restore ---- */
test('backup downloads every collection, and restoring it adds nothing new', async () => {
  const { ctx, page, log } = await open('admin');
  await page.click('#tab-people');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="backup"]')]);
  const file = JSON.parse(await readFile(await dl.path(), 'utf8'));
  assert.equal(file.format, 'silah-backup'); assert.equal(file.version, 1);
  assert.ok(file.collections.students.length >= 8 && file.collections.attendance.length > 0);
  const p = new URL('./out/backup.json', import.meta.url); await writeFile(p, JSON.stringify(file));
  await page.setInputFiles('#impFile', p.pathname);
  await page.waitForFunction(() => document.querySelector('#impInfo').textContent.includes('نسخة احتياطية'));
  assert.match(await page.locator('#impInfo').innerText(), /0 سجل جديد/);
  await page.click('#impBtn');
  await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('لا سجلات جديدة'));
  assert.deepEqual(log.errors, []);
  await ctx.close();
});

test('restore adds new records, keeps existing ones unless replace is ticked, and backs up before replacing', async () => {
  const { ctx, page } = await open('admin');
  await page.click('#tab-people');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="backup"]')]);
  const file = JSON.parse(await readFile(await dl.path(), 'utf8'));
  const yusuf = file.collections.students.find(s => s.id === 'yusuf');
  file.collections = { students: [{ ...yusuf, name: 'يوسف المعدَّل' }, { ...yusuf, id: 'test-new', name: 'طالب الاختبار' }] };
  const p = new URL('./out/restore.json', import.meta.url); await writeFile(p, JSON.stringify(file));

  // 1) default: only the new student is added, Yusuf is untouched
  await page.setInputFiles('#impFile', p.pathname);
  await page.waitForSelector('#impOver');
  assert.match(await page.locator('#impInfo').innerText(), /1 سجل جديد · 1 موجود مسبقًا/);
  await page.click('#impBtn'); await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('نُقلت 1'));
  await page.click('#tab-students');
  const names = await page.locator('#main').innerText();
  assert.ok(names.includes('طالب الاختبار') && !names.includes('يوسف المعدَّل'));

  // 2) replace ticked: a backup is downloaded first, then Yusuf is replaced
  await page.click('#tab-people'); await page.setInputFiles('#impFile', p.pathname); await page.waitForSelector('#impOver');
  await page.check('#impOver');
  const [safety] = await Promise.all([page.waitForEvent('download'), page.click('#impBtn')]);
  assert.match(safety.suggestedFilename(), /^silah-backup-\d{4}-\d{2}-\d{2}\.json$/);
  await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('نُقلت 2'));
  await page.click('#tab-students');
  assert.ok((await page.locator('#main').innerText()).includes('يوسف المعدَّل'));
  await ctx.close();
});

test('import rejects files that are not Silah backups or Rattel exports', async () => {
  const { ctx, page } = await open('admin');
  await page.click('#tab-people');
  let n = 0;
  for (const [body, msg] of [['{nope', 'JSON'], ['{"hello":1}', 'ليس نسخة'], [JSON.stringify({ format: 'silah-backup', version: 1, collections: { secrets: [] } }), 'غير معروفة']]) {
    const p = new URL(`./out/bad-${n++}.json`, import.meta.url); // a new name each time so the input fires change
    await writeFile(p, body); await page.setInputFiles('#impFile', p.pathname);
    await page.waitForFunction(m => document.querySelector('#impInfo').textContent.includes(m), msg);
    assert.equal(await page.locator('#impBtn').isDisabled(), true);
  }
  await ctx.close();
});
