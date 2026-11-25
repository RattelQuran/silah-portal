// App Check (D-15) against the Firebase emulators, with a stand-in reCAPTCHA and token exchange (never Google, never
// production). Checks: off by default, tokens reach Firestore, refresh, and that reCAPTCHA or exchange failures do not
// break the portal while App Check is unenforced. Run: npm run appcheck
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection } from 'firebase/firestore';
import { serve, browser, route, watch, ROLE_TABS, tabNames } from './helpers.mjs';

const P = 'demo-silah', AUTH = 'http://127.0.0.1:9099';
const ENT = "{ siteKey: 'test-site-key', provider: 'enterprise' }", V3 = "{ siteKey: 'test-site-key', provider: 'v3' }";
let srv, b, env;
const people = {
  admin: { email: 'owner@test.local' },
  accountant: { email: 'acc@test.local', inv: { role: 'accountant' } },
  teacher: { email: 'sara@test.local', inv: { role: 'teacher', teacherId: 'sara' } },
  parent: { email: 'mom@test.local', inv: { role: 'parent', studentIds: ['yusuf'] } },
};

before(async () => {
  srv = await serve(); b = await browser();
  env = await initializeTestEnvironment({ projectId: P, firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8').replace(/function ownerEmail\(\) \{ return '[^']+'; \}/, "function ownerEmail() { return 'owner@test.local'; }"), host: '127.0.0.1', port: 8080 } });
  await env.clearFirestore();
  await fetch(`${AUTH}/emulator/v1/projects/${P}/accounts`, { method: 'DELETE' });
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore();
    for (const p of Object.values(people)) if (p.inv) await setDoc(doc(db, 'invites', p.email), { name: p.email, teacherId: '', studentIds: [], ...p.inv });
    await setDoc(doc(db, 'teachers', 'sara'), { name: 'أ. سارة', section: '', room: '' });
    const slots = [0, 1, 2, 3, 4, 5, 6].map(day => ({ day, time: '12:00' }));
    await setDoc(doc(db, 'students', 'yusuf'), { name: 'يوسف-اختبار', teacherId: 'sara', slots, schedTz: 'Africa/Cairo', studentTz: 'Africa/Cairo', duration: 30, since: '2026-01-01' });
    await setDoc(doc(db, 'billing', 'yusuf'), { quota: 12, fee: 600, currency: 'TRY' });
    await setDoc(doc(db, 'settings', 'main'), { academy: 'أكاديمية صلة' });
  });
});
after(async () => { await b.close(); srv.close(); await env.cleanup(); });

// Every request to the Firestore emulator, with the App Check token it carried (a header, or WebChannel's encoded headers).
function firestoreTraffic(page) {
  const seen = [];
  page.on('request', r => {
    if (!r.url().includes('127.0.0.1:8080')) return;
    const h = r.headers()['x-firebase-appcheck'] || '';
    let inUrl = null; try { inUrl = decodeURIComponent(r.url() + '&' + (r.postData() || '')).match(/X-Firebase-AppCheck:([^\r\n&]+)/i); } catch (e) { /* not url-encoded */ }
    seen.push(h || (inUrl ? inUrl[1].trim() : ''));
  });
  return seen;
}

async function signIn(role, { appCheck = ENT, fake, width = 1280, fixedClock = true } = {}) {
  const ctx = await b.newContext({ locale: 'ar', viewport: { width, height: 900 } });
  await route(ctx, 'emulator', appCheck, fake);
  const page = await ctx.newPage(); const log = watch(page); const fs = firestoreTraffic(page);
  const scripts = []; page.on('request', r => { if (/firebase-app-check\.js$/.test(r.url())) scripts.push(r.url()); });
  if (fixedClock) await page.clock.setFixedTime(new Date('2026-11-25T10:00:00Z'));
  await page.goto(srv.url + '/index.html?emulator=1');
  await page.fill('#linkEmail', people[role].email); await page.click('#linkForm [type="submit"]');
  await page.waitForFunction(() => !document.querySelector('#toast').hidden);
  const codes = (await (await fetch(`${AUTH}/emulator/v1/projects/${P}/oobCodes`)).json()).oobCodes.filter(c => c.email === people[role].email);
  const link = new URL(codes.at(-1).oobLink);
  await page.goto(`${srv.url}/index.html?emulator=1&mode=signIn&oobCode=${link.searchParams.get('oobCode')}&apiKey=fake-api-key&lang=ar`);
  await page.waitForSelector('#tabs [role="tab"]', { timeout: 20000 });
  return { ctx, page, log, fs, scripts };
}
const denied = log => [...log.errors, ...log.warnings].filter(m => /permission|insufficient/i.test(m));
async function allTabs(page, role) { for (let i = 0; i < ROLE_TABS[role].length; i++) { await page.locator('#tabs [role="tab"]').nth(i).click(); await page.waitForTimeout(150); } }

test('off by default: with no site key nothing App Check related is loaded or sent', async () => {
  const { ctx, page, log, fs, scripts } = await signIn('admin', { appCheck: '' });
  await allTabs(page, 'admin');
  assert.equal(scripts.length, 0, 'firebase-app-check.js was loaded'); assert.equal(ctx.appCheck, undefined);
  assert.ok(fs.length > 0); assert.ok(fs.every(t => !t), 'a token was sent with App Check off');
  assert.deepEqual(denied(log), []);
  await ctx.close();
});

test('enterprise: Firestore requests carry the App Check token, every admin tab loads', async () => {
  const { ctx, page, log, fs } = await signIn('admin');
  await allTabs(page, 'admin');
  assert.deepEqual(await tabNames(page), ROLE_TABS.admin);
  assert.match(ctx.appCheck.lastUrl, /exchangeRecaptchaEnterpriseToken/);
  assert.ok(ctx.appCheck.scripts >= 1 && ctx.appCheck.exchanges >= 1);
  assert.ok(fs.some(t => t === 'fake-appcheck-token-1'), 'no Firestore request carried the token');
  assert.deepEqual(denied(log), []);
  await ctx.close();
});

test('v3 provider uses the v3 exchange', async () => {
  const { ctx, fs } = await signIn('parent', { appCheck: V3 });
  assert.match(ctx.appCheck.lastUrl, /exchangeRecaptchaV3Token/);
  assert.ok(fs.some(t => t.startsWith('fake-appcheck-token-')));
  await ctx.close();
});

test('accountant: a payment is saved with App Check on', async () => {
  const { ctx, page, log } = await signIn('accountant');
  await page.click('.bar [data-act="pay"]');
  await page.fill('#p-amt', '600'); await page.fill('#p-note', 'اختبار App Check');
  await page.click('#pform [type="submit"]');
  let pays = [];
  for (let i = 0; i < 40 && !pays.length; i++) { await page.waitForTimeout(250); await env.withSecurityRulesDisabled(async c => { pays = (await getDocs(collection(c.firestore(), 'payments'))).docs.map(d => d.data()).filter(p => p.note === 'اختبار App Check'); }); }
  assert.equal(pays.length, 1); assert.equal(pays[0].amount, 600);
  assert.deepEqual(denied(log), []);
  await ctx.close();
});

test('teacher on a phone: attendance is saved with App Check on', async () => {
  const { ctx, page, log, fs } = await signIn('teacher', { width: 390 });
  await page.locator('.card [data-act="mark"][data-st="late"]').first().click();
  await page.waitForFunction(() => document.querySelector('.card [data-st="late"]').getAttribute('aria-pressed') === 'true');
  let saved; await env.withSecurityRulesDisabled(async c => { saved = (await getDoc(doc(c.firestore(), 'attendance', '2026-11-25_yusuf'))).data(); });
  assert.equal(saved && saved.status, 'late');
  assert.ok(fs.some(t => t.startsWith('fake-appcheck-token-')));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(denied(log), []);
  await ctx.close();
});

test('reCAPTCHA blocked (ad blocker): the portal still works while unenforced', async () => {
  const { ctx, page, log } = await signIn('parent', { fake: { recaptcha: 'blocked' } });
  await allTabs(page, 'parent');
  assert.ok((await page.locator('#main').innerText()).includes('يوسف-اختبار'));
  assert.equal(ctx.appCheck.exchanges, 0);
  assert.deepEqual(denied(log), []);
  await ctx.close();
});

test('reCAPTCHA never answers: App Check is skipped after a few seconds and sign-in still works', async () => {
  const { ctx, page, log } = await signIn('parent', { fake: { recaptcha: 'hang' } });
  assert.ok((await page.locator('#main').innerText()).includes('يوسف-اختبار'));
  assert.equal(ctx.appCheck.exchanges, 0);
  assert.deepEqual(denied(log), []);
  await ctx.close();
});

test('token exchange rejected (403): the portal still works while unenforced, attendance saves', async () => {
  const { ctx, page, log } = await signIn('teacher', { fake: { exchange: 403 } });
  await page.locator('.card [data-act="mark"][data-st="present"]').first().click();
  await page.waitForFunction(() => document.querySelector('.card [data-st="present"]').getAttribute('aria-pressed') === 'true');
  let saved; await env.withSecurityRulesDisabled(async c => { saved = (await getDoc(doc(c.firestore(), 'attendance', '2026-11-25_yusuf'))).data(); });
  assert.equal(saved && saved.status, 'present');
  assert.ok(ctx.appCheck.exchanges >= 1);
  assert.deepEqual(denied(log), []);
  await ctx.close();
});

test('token refresh: a new token is fetched before the old one expires', async () => {
  const ctx = await b.newContext({ locale: 'ar' });
  await route(ctx, 'emulator', ENT, { ttl: '660s' }); // refresh is due at expiry minus 5 minutes = 6 minutes
  const page = await ctx.newPage(); const fs = firestoreTraffic(page);
  await page.clock.install();
  await page.goto(srv.url + '/index.html?emulator=1');
  await page.waitForSelector('#linkEmail');
  for (let i = 0; i < 40 && ctx.appCheck.exchanges < 1; i++) { await page.clock.runFor(250); await page.waitForTimeout(50); }
  assert.equal(ctx.appCheck.exchanges, 1, 'first token');
  await page.clock.fastForward('06:30'); await page.clock.runFor(1000);
  for (let i = 0; i < 40 && ctx.appCheck.exchanges < 2; i++) { await page.clock.runFor(250); await page.waitForTimeout(50); }
  assert.equal(ctx.appCheck.exchanges, 2, 'token was not refreshed');
  await ctx.close();
});
