// The real portal against the Firebase emulators and the proposed firestore.rules: every role signs in through
// the real email-link flow, gets its profile from an invite, and loads its screens with no permission errors.
// Run: npm run emulator   (project demo-silah; never touches production)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { serve, browser, route, watch, ROLE_TABS, tabNames } from './helpers.mjs';

const P = 'demo-silah', AUTH = 'http://127.0.0.1:9099';
let srv, b, env;
const people = {
  admin: { email: 'owner@test.local' },                                    // the owner email in the test config
  supervisor: { email: 'sup@test.local', inv: { role: 'supervisor' } },
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
    await setDoc(doc(db, 'teachers', 'omar'), { name: 'الشيخ عمر', section: '', room: '' });
    const slots = [0, 1, 2, 3, 4, 5, 6].map(day => ({ day, time: '12:00' }));
    await setDoc(doc(db, 'students', 'yusuf'), { name: 'يوسف-اختبار', teacherId: 'sara', slots, schedTz: 'Africa/Cairo', studentTz: 'Africa/Cairo', duration: 30, since: '2026-01-01' });
    await setDoc(doc(db, 'students', 'adam'), { name: 'آدم-اختبار', teacherId: 'omar', slots, schedTz: 'Africa/Cairo', studentTz: 'Africa/Cairo', duration: 30, since: '2026-01-01' });
    await setDoc(doc(db, 'billing', 'yusuf'), { quota: 12, fee: 600, currency: 'TRY' });
    await setDoc(doc(db, 'billing', 'adam'), { quota: 8, fee: 90, currency: 'EUR' });
    await setDoc(doc(db, 'payments', 'p1'), { studentId: 'yusuf', amount: 600, currency: 'TRY', month: '2026-11', date: '2026-11-01' });
    await setDoc(doc(db, 'payments', 'p2'), { studentId: 'adam', amount: 90, currency: 'EUR', month: '2026-11', date: '2026-11-01' });
    await setDoc(doc(db, 'settings', 'main'), { academy: 'أكاديمية صلة' });
    await setDoc(doc(db, 'registrations', 'r1'), { parentName: 'أم ريان', studentName: 'ريان', studentAge: 7, country: 'ألمانيا', whatsapp: '+49 151 000 0000', course: 'quran', preferredTime: 'evening', notes: '', status: 'new', source: 'site', at: 1 });
  });
});
after(async () => { await b.close(); srv.close(); await env.cleanup(); });

async function signIn(role) {
  const ctx = await b.newContext({ locale: 'ar', viewport: { width: 1280, height: 900 } }); await route(ctx, 'emulator');
  const page = await ctx.newPage(); const log = watch(page);
  await page.clock.setFixedTime(new Date('2026-11-25T10:00:00Z'));
  await page.goto(srv.url + '/index.html?emulator=1');
  await page.fill('#linkEmail', people[role].email); await page.click('#linkForm [type="submit"]');
  await page.waitForFunction(() => !document.querySelector('#toast').hidden);
  const codes = (await (await fetch(`${AUTH}/emulator/v1/projects/${P}/oobCodes`)).json()).oobCodes.filter(c => c.email === people[role].email);
  const link = new URL(codes.at(-1).oobLink);
  await page.goto(`${srv.url}/index.html?emulator=1&mode=signIn&oobCode=${link.searchParams.get('oobCode')}&apiKey=fake-api-key&lang=ar`);
  await page.waitForSelector('#tabs [role="tab"]', { timeout: 20000 });
  return { ctx, page, log };
}
const denied = log => [...log.errors, ...log.warnings].filter(m => /permission|insufficient/i.test(m));

for (const role of Object.keys(people)) test(`${role}: signs in from the invite and loads every tab with no permission error`, async () => {
  const { ctx, page, log } = await signIn(role);
  assert.deepEqual(await tabNames(page), ROLE_TABS[role]);
  let text = '';
  for (let i = 0; i < ROLE_TABS[role].length; i++) { await page.locator('#tabs [role="tab"]').nth(i).click(); await page.waitForTimeout(150); text += await page.locator('#main').innerText(); }
  assert.deepEqual(denied(log), []);
  if (role === 'teacher') { assert.ok(text.includes('يوسف-اختبار')); assert.ok(!text.includes('آدم-اختبار'), 'teacher sees another teacher\'s student'); }
  if (role === 'parent') { assert.ok(text.includes('يوسف-اختبار')); assert.ok(!text.includes('آدم-اختبار'), 'parent sees another child'); }
  if (role === 'admin' || role === 'supervisor') assert.ok(text.includes('ريان'), 'registrations visible');
  await ctx.close();
});

test('teacher: marking attendance is saved through the rules', async () => {
  const { ctx, page, log } = await signIn('teacher');
  await page.locator('.card [data-act="mark"][data-st="present"]').first().click();
  await page.waitForFunction(() => document.querySelector('.card [data-st="present"]').getAttribute('aria-pressed') === 'true');
  let saved; await env.withSecurityRulesDisabled(async c => { saved = (await getDoc(doc(c.firestore(), 'attendance', '2026-11-25_yusuf'))).data(); });
  assert.equal(saved && saved.status, 'present'); assert.equal(saved.teacherId, 'sara');
  assert.deepEqual(denied(log), []);
  await ctx.close();
});

test('profiles were created with exactly the invited roles', async () => {
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore();
    const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${P}/accounts:query`, { method: 'POST', headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, body: '{}' });
    const users = (await r.json()).userInfo || [];
    const roles = {}; for (const u of users) { const d = (await getDoc(doc(db, 'users', u.localId))).data(); roles[u.email] = d && d.role; }
    assert.deepEqual(roles, { 'owner@test.local': 'admin', 'sup@test.local': 'supervisor', 'acc@test.local': 'accountant', 'sara@test.local': 'teacher', 'mom@test.local': 'parent' });
  });
});

test('admin: a full backup can be downloaded under the rules', async () => {
  const { ctx, page, log } = await signIn('admin');
  await page.click('#tab-people');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="backup"]')]);
  const file = JSON.parse(readFileSync(await dl.path(), 'utf8'));
  assert.equal(file.collections.students.length, 2); assert.equal(file.collections.payments.length, 2);
  assert.ok(file.collections.users.length >= 1);
  assert.deepEqual(denied(log), []);
  await ctx.close();
});
