// Firestore rules tests. Run with: npm run rules   (starts the emulator, project demo-silah, no production access)
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where, addDoc } from 'firebase/firestore';

const OWNER = 'rattelquran476@gmail.com';
let env;
const people = {
  admin: { uid: 'u-admin', email: OWNER, role: 'admin' },
  sup: { uid: 'u-sup', email: 'sup@test.local', role: 'supervisor' },
  acc: { uid: 'u-acc', email: 'acc@test.local', role: 'accountant' },
  sara: { uid: 'u-sara', email: 'sara@test.local', role: 'teacher', teacherId: 'sara' },
  omar: { uid: 'u-omar', email: 'omar@test.local', role: 'teacher', teacherId: 'omar' },
  mom: { uid: 'u-mom', email: 'mom@test.local', role: 'parent', studentIds: ['yusuf'] },
};
const as = k => env.authenticatedContext(people[k].uid, { email: people[k].email, email_verified: true }).firestore();
const anon = () => env.unauthenticatedContext().firestore();
const stranger = () => env.authenticatedContext('u-x', { email: 'x@test.local', email_verified: true }).firestore();

const pay = (over = {}) => ({ studentId: 'yusuf', amount: 600, currency: 'TRY', date: '2026-11-03', month: '2026-11', rate: 1.5, egp: 900, note: '', at: Date.now(), by: 'u-acc', ...over });
const reg = (over = {}) => ({ parentName: 'أم ريان', studentName: 'ريان', studentAge: 7, country: 'ألمانيا', whatsapp: '+49 151 000 0000', course: 'quran', preferredTime: 'evening', notes: '', status: 'new', source: 'site', at: Date.now(), ...over });

before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-silah', firestore: { rules: readFileSync(process.env.RULES_FILE || new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 } });
});
after(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore();
    for (const p of Object.values(people)) await setDoc(doc(db, 'users', p.uid), { role: p.role, email: p.email, teacherId: p.teacherId || '', studentIds: p.studentIds || [], name: p.uid });
    await setDoc(doc(db, 'teachers', 'sara'), { name: 'أ. سارة' });
    await setDoc(doc(db, 'teachers', 'omar'), { name: 'الشيخ عمر' });
    await setDoc(doc(db, 'students', 'yusuf'), { name: 'يوسف', teacherId: 'sara' });
    await setDoc(doc(db, 'students', 'adam'), { name: 'آدم', teacherId: 'omar' });
    await setDoc(doc(db, 'billing', 'yusuf'), { quota: 12 });
    await setDoc(doc(db, 'billing', 'adam'), { quota: 8 });
    await setDoc(doc(db, 'attendance', '2026-11-01_yusuf'), { studentId: 'yusuf', teacherId: 'sara', date: '2026-11-01', status: 'present' });
    await setDoc(doc(db, 'attendance', '2026-11-01_adam'), { studentId: 'adam', teacherId: 'omar', date: '2026-11-01', status: 'present' });
    await setDoc(doc(db, 'payments', 'p1'), { studentId: 'yusuf', amount: 600 });
    await setDoc(doc(db, 'payments', 'p2'), { studentId: 'adam', amount: 90 });
    await setDoc(doc(db, 'monthlyReports', '2026-11_yusuf'), { studentId: 'yusuf', teacherId: 'sara', status: 'published' });
    await setDoc(doc(db, 'monthlyReports', '2026-11_adam'), { studentId: 'adam', teacherId: 'omar', status: 'submitted' });
    await setDoc(doc(db, 'invites', 'new.teacher@test.local'), { role: 'teacher', teacherId: 'huda', studentIds: [] });
    await setDoc(doc(db, 'settings', 'rates'), { USD: 56 });
  });
});

/* ---- privilege escalation ---- */
test('a stranger cannot create an admin profile for themselves', async () => {
  await assertFails(setDoc(doc(stranger(), 'users', 'u-x'), { role: 'admin', email: 'x@test.local', teacherId: '', studentIds: [] }));
});
test('an invited person can only take the invited role', async () => {
  const db = env.authenticatedContext('u-new', { email: 'new.teacher@test.local', email_verified: true }).firestore();
  await assertFails(setDoc(doc(db, 'users', 'u-new'), { role: 'admin', email: 'new.teacher@test.local', teacherId: 'huda', studentIds: [] }));
  await assertFails(setDoc(doc(db, 'users', 'u-new'), { role: 'teacher', email: 'new.teacher@test.local', teacherId: 'sara', studentIds: [] }));
  await assertSucceeds(setDoc(doc(db, 'users', 'u-new'), { role: 'teacher', email: 'new.teacher@test.local', teacherId: 'huda', studentIds: [], name: 'هدى', createdAt: 1 }));
});
test('an unverified email cannot claim the owner admin role', async () => {
  const db = env.authenticatedContext('u-fake', { email: OWNER, email_verified: false }).firestore();
  await assertFails(setDoc(doc(db, 'users', 'u-fake'), { role: 'admin', email: OWNER, teacherId: '', studentIds: [] }));
});
test('the verified owner email can create the first admin profile', async () => {
  await env.withSecurityRulesDisabled(c => deleteDoc(doc(c.firestore(), 'users', 'u-admin')));
  await assertSucceeds(setDoc(doc(as('admin'), 'users', 'u-admin'), { role: 'admin', email: OWNER, teacherId: '', studentIds: [], name: 'المدير', createdAt: 1 }));
});
test('nobody but the admin can change a profile (no self-promotion)', async () => {
  await assertFails(setDoc(doc(as('sara'), 'users', 'u-sara'), { role: 'admin' }, { merge: true }));
  await assertFails(setDoc(doc(as('mom'), 'users', 'u-mom'), { studentIds: ['yusuf', 'adam'] }, { merge: true }));
  await assertSucceeds(setDoc(doc(as('admin'), 'users', 'u-sara'), { role: 'supervisor' }, { merge: true }));
});
test('only the admin manages invites', async () => {
  await assertFails(setDoc(doc(as('sup'), 'invites', 'a@test.local'), { role: 'admin' }));
  await assertSucceeds(setDoc(doc(as('admin'), 'invites', 'a@test.local'), { role: 'teacher', teacherId: 'x', studentIds: [] }));
});

/* ---- anonymous ---- */
test('anonymous visitors read nothing', async () => {
  for (const c of ['students', 'users', 'payments', 'attendance', 'registrations', 'invites', 'teachers'])
    await assertFails(getDocs(collection(anon(), c)));
});

/* ---- teacher isolation ---- */
test('a teacher sees only her own students and records', async () => {
  const db = as('sara');
  await assertSucceeds(getDocs(query(collection(db, 'students'), where('teacherId', '==', 'sara'))));
  await assertFails(getDocs(collection(db, 'students')));
  await assertFails(getDoc(doc(db, 'students', 'adam')));
  await assertSucceeds(getDocs(query(collection(db, 'attendance'), where('teacherId', '==', 'sara'))));
  await assertFails(getDocs(query(collection(db, 'attendance'), where('teacherId', '==', 'omar'))));
  await assertFails(getDocs(collection(db, 'payments')));
  await assertFails(getDoc(doc(db, 'billing', 'yusuf')));
});
test('a teacher marks attendance only for her own students', async () => {
  const db = as('sara');
  await assertSucceeds(setDoc(doc(db, 'attendance', '2026-11-02_yusuf'), { studentId: 'yusuf', teacherId: 'sara', date: '2026-11-02', status: 'late' }));
  await assertFails(setDoc(doc(db, 'attendance', '2026-11-02_adam'), { studentId: 'adam', teacherId: 'sara', date: '2026-11-02', status: 'absent' }));
  await assertFails(setDoc(doc(db, 'attendance', '2026-11-01_adam'), { studentId: 'adam', teacherId: 'omar', status: 'absent' }));
  await assertFails(deleteDoc(doc(db, 'attendance', '2026-11-01_adam')));
  await assertSucceeds(deleteDoc(doc(db, 'attendance', '2026-11-01_yusuf')));
});
test('a teacher cannot publish a monthly report or edit one after publishing', async () => {
  const db = as('sara');
  await assertFails(setDoc(doc(db, 'monthlyReports', '2026-12_yusuf'), { studentId: 'yusuf', teacherId: 'sara', status: 'published' }));
  await assertSucceeds(setDoc(doc(db, 'monthlyReports', '2026-12_yusuf'), { studentId: 'yusuf', teacherId: 'sara', status: 'submitted' }));
  await assertFails(setDoc(doc(db, 'monthlyReports', '2026-11_yusuf'), { studentId: 'yusuf', teacherId: 'sara', status: 'draft' }));
});
test('a teacher cannot change her pay', async () => {
  await assertFails(setDoc(doc(as('sara'), 'teacherRates', 'sara'), { hourRate: 999 }));
  await assertFails(addDoc(collection(as('sara'), 'payAdj'), { teacherId: 'sara', kind: 'bonus', amount: 999 }));
  await assertFails(setDoc(doc(as('sara'), 'payroll', '2026-11_sara'), { teacherId: 'sara', status: 'approved' }));
});

/* ---- parent isolation ---- */
test('a parent sees only her children, and only published monthly reports', async () => {
  const db = as('mom');
  await assertSucceeds(getDoc(doc(db, 'students', 'yusuf')));
  await assertFails(getDoc(doc(db, 'students', 'adam')));
  await assertSucceeds(getDoc(doc(db, 'billing', 'yusuf')));
  await assertFails(getDoc(doc(db, 'billing', 'adam')));
  await assertSucceeds(getDocs(query(collection(db, 'attendance'), where('studentId', '==', 'yusuf'))));
  await assertFails(getDocs(query(collection(db, 'attendance'), where('studentId', '==', 'adam'))));
  await assertSucceeds(getDocs(query(collection(db, 'payments'), where('studentId', '==', 'yusuf'))));
  await assertFails(getDocs(query(collection(db, 'payments'), where('studentId', '==', 'adam'))));
  await assertSucceeds(getDocs(query(collection(db, 'monthlyReports'), where('studentId', '==', 'yusuf'), where('status', '==', 'published'))));
  await assertFails(getDocs(query(collection(db, 'monthlyReports'), where('studentId', '==', 'yusuf'))));
  await assertFails(getDocs(collection(db, 'students')));
});
test('a parent writes nothing', async () => {
  const db = as('mom');
  await assertFails(setDoc(doc(db, 'attendance', '2026-11-03_yusuf'), { studentId: 'yusuf', teacherId: 'sara', status: 'present' }));
  await assertFails(setDoc(doc(db, 'billing', 'yusuf'), { quota: 99 }));
  await assertFails(addDoc(collection(db, 'payments'), { studentId: 'yusuf', amount: 1 }));
});

/* ---- staff split ---- */
test('the accountant handles money but not people or teaching', async () => {
  const db = as('acc');
  await assertSucceeds(addDoc(collection(db, 'payments'), pay()));
  await assertSucceeds(setDoc(doc(db, 'settings', 'rates'), { USD: 57 }));
  await assertFails(setDoc(doc(db, 'students', 'zz'), { name: 'x', teacherId: 'sara' }));
  await assertFails(setDoc(doc(db, 'attendance', '2026-11-04_yusuf'), { studentId: 'yusuf', teacherId: 'sara', status: 'present' }));
  await assertFails(getDocs(collection(db, 'users')));
  await assertFails(getDocs(collection(db, 'registrations')));
});
test('the supervisor handles students and teaching but not money', async () => {
  const db = as('sup');
  await assertSucceeds(setDoc(doc(db, 'students', 'zz'), { name: 'x', teacherId: 'sara' }));
  await assertSucceeds(setDoc(doc(db, 'monthlyReports', '2026-11_adam'), { studentId: 'adam', teacherId: 'omar', status: 'published' }));
  await assertSucceeds(getDocs(collection(db, 'registrations')));
  await assertFails(getDocs(collection(db, 'payments')));
  await assertFails(setDoc(doc(db, 'teacherRates', 'sara'), { hourRate: 1 }));
  await assertFails(getDocs(collection(db, 'users')));
});

test('tightened after D-12: no write the portal does not use', async () => {
  await assertFails(setDoc(doc(as('sup'), 'billing', 'yusuf'), { quota: 1 }, { merge: true }));
  await assertFails(setDoc(doc(as('acc'), 'settings', 'main'), { payAbsent: false }, { merge: true }));
  let id; await env.withSecurityRulesDisabled(async c => { id = (await addDoc(collection(c.firestore(), 'contacts'), { studentId: 'yusuf', note: 'x' })).id; });
  await assertSucceeds(addDoc(collection(as('acc'), 'contacts'), { studentId: 'yusuf', note: 'y' }));
  await assertFails(deleteDoc(doc(as('acc'), 'contacts', id)));
  await assertSucceeds(deleteDoc(doc(as('sup'), 'contacts', id)));
});

/* ---- final audit 2026-11-26 (SEC-01 .. SEC-07) ---- */
test('SEC-01: a teacher cannot move an attendance record to another student or date, or use an unknown status', async () => {
  const db = as('sara');
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), 'students', 'lina'), { name: 'لينا', teacherId: 'sara' }));
  const rec = { studentId: 'yusuf', teacherId: 'sara', date: '2026-11-01', month: '2026-11', status: 'late' };
  await assertSucceeds(setDoc(doc(db, 'attendance', '2026-11-01_yusuf'), rec));
  await assertFails(setDoc(doc(db, 'attendance', '2026-11-01_yusuf'), { ...rec, studentId: 'lina' }));
  await assertFails(setDoc(doc(db, 'attendance', '2026-11-01_yusuf'), { ...rec, date: '2026-10-01' }));
  await assertFails(setDoc(doc(db, 'attendance', '2026-11-05_lina'), { ...rec, studentId: 'yusuf', date: '2026-11-05' }));
  await assertFails(setDoc(doc(db, 'attendance', '2026-11-01_yusuf'), { ...rec, status: 'paid' }));
});
test('SEC-01: after a student moves to another teacher, the old teacher can no longer delete or edit his records', async () => {
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), 'students', 'yusuf'), { name: 'يوسف', teacherId: 'omar' }));
  await assertFails(deleteDoc(doc(as('sara'), 'attendance', '2026-11-01_yusuf')));
  await assertFails(setDoc(doc(as('sara'), 'attendance', '2026-11-01_yusuf'), { studentId: 'yusuf', teacherId: 'sara', date: '2026-11-01', status: 'absent' }));
  await assertSucceeds(getDoc(doc(as('sara'), 'attendance', '2026-11-01_yusuf')));   // she still sees her own history
  await assertSucceeds(deleteDoc(doc(as('sup'), 'attendance', '2026-11-01_yusuf')));
});
test('SEC-02: the accountant cannot save malformed money records; refunds and the admin restore still work', async () => {
  const db = as('acc');
  await assertFails(addDoc(collection(db, 'payments'), pay({ amount: '600' })));
  await assertFails(addDoc(collection(db, 'payments'), pay({ currency: 'XXX' })));
  await assertFails(addDoc(collection(db, 'payments'), pay({ date: 'yesterday' })));
  await assertFails(addDoc(collection(db, 'payments'), pay({ amount: 1e9 })));
  await assertSucceeds(addDoc(collection(db, 'payments'), pay({ amount: -600, note: 'استرداد' })));
  await assertSucceeds(addDoc(collection(db, 'expenses'), { category: 'rent', amount: 100, currency: 'EGP', egp: 100, date: '2026-11-03', month: '2026-11', note: '', at: 1 }));
  await assertFails(addDoc(collection(db, 'expenses'), { category: 'rent', amount: 'a lot', currency: 'EGP', date: '2026-11-03', month: '2026-11' }));
  await assertSucceeds(addDoc(collection(db, 'payouts'), { teacherId: 'sara', month: '2026-11', amount: 300, date: '2026-11-03', note: '', at: 1 }));
  await assertSucceeds(addDoc(collection(db, 'payAdj'), { teacherId: 'sara', month: '2026-11', kind: 'deduction', amount: 50, reason: 'x', at: 1, by: 'u-acc' }));
  await assertFails(addDoc(collection(db, 'payAdj'), { teacherId: 'sara', month: '2026-11', kind: 'gift', amount: 50 }));
  await assertSucceeds(setDoc(doc(db, 'payroll', '2026-11_sara'), { teacherId: 'sara', month: '2026-11', status: 'approved', total: 900, approvedAt: 1, by: 'u-acc' }));
  await assertFails(setDoc(doc(db, 'payroll', '2026-11_omar'), { teacherId: 'sara', month: '2026-11', status: 'approved', total: 900 }));
  await assertSucceeds(setDoc(doc(db, 'billing', 'yusuf'), { renewal: { status: 'reminded' } }, { merge: true }));
  await assertSucceeds(setDoc(doc(db, 'billing', 'yusuf'), { quota: 12, fee: 600, currency: 'TRY', feeWith: '', paidThrough: '', doneBefore: 0, free: false }, { merge: true }));
  await assertFails(setDoc(doc(db, 'billing', 'yusuf'), { fee: '600' }, { merge: true }));
  await assertFails(setDoc(doc(db, 'teacherRates', 'sara'), { hourRate: -5, mode: 'hour' }));
  await assertSucceeds(setDoc(doc(as('admin'), 'payments', 'old-import'), { studentId: 'yusuf', amount: 600 }));   // restore of an old record
});
test('SEC-05: a removed account loses all access at once and cannot rebuild its profile', async () => {
  await env.withSecurityRulesDisabled(async c => { await deleteDoc(doc(c.firestore(), 'users', 'u-sara')); });
  const db = as('sara');
  await assertFails(getDocs(query(collection(db, 'students'), where('teacherId', '==', 'sara'))));
  await assertFails(getDoc(doc(db, 'teachers', 'sara')));
  await assertFails(setDoc(doc(db, 'attendance', '2026-11-02_yusuf'), { studentId: 'yusuf', teacherId: 'sara', date: '2026-11-02', status: 'late' }));
  await assertFails(setDoc(doc(db, 'users', 'u-sara'), { email: 'sara@test.local', role: 'teacher', teacherId: 'sara', studentIds: [] }));
});
test('SEC-05: an invite cannot be reused to change an existing profile, and a changed role applies at once', async () => {
  const db = env.authenticatedContext('u-new', { email: 'new.teacher@test.local', email_verified: true }).firestore();
  await assertSucceeds(setDoc(doc(db, 'users', 'u-new'), { email: 'new.teacher@test.local', role: 'teacher', teacherId: 'huda', studentIds: [] }));
  await assertFails(setDoc(doc(db, 'users', 'u-new'), { email: 'new.teacher@test.local', role: 'teacher', teacherId: 'sara', studentIds: [] }));
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), 'users', 'u-sup'), { role: 'parent', studentIds: [] }, { merge: true }));
  await assertFails(getDocs(collection(as('sup'), 'registrations')));
});
test('SEC-04: the form rejects an impossible submission time', async () => {
  await assertFails(addDoc(collection(anon(), 'registrations'), reg({ at: 5 })));
  await assertFails(addDoc(collection(anon(), 'registrations'), reg({ at: Date.now() + 30 * 864e5 })));
  await assertFails(addDoc(collection(anon(), 'registrations'), reg({ at: Date.now() + 0.5 })));
});
test('SEC-07: queries wider than the role are refused, not filtered', async () => {
  await assertFails(getDocs(collection(as('sara'), 'attendance')));
  await assertFails(getDocs(collection(as('mom'), 'payments')));
  await assertFails(getDocs(collection(as('mom'), 'students')));
  await assertSucceeds(getDocs(query(collection(as('mom'), 'payments'), where('studentId', '==', 'yusuf'))));
  await assertFails(getDocs(query(collection(as('mom'), 'payments'), where('studentId', '==', 'adam'))));
});

/* ---- public registration form ---- */
test('the public form can create a well-formed registration only', async () => {
  const db = anon();
  await assertSucceeds(addDoc(collection(db, 'registrations'), reg()));
  await assertFails(addDoc(collection(db, 'registrations'), reg({ status: 'enrolled' })));
  await assertFails(addDoc(collection(db, 'registrations'), reg({ studentAge: 40 })));
  await assertFails(addDoc(collection(db, 'registrations'), reg({ course: 'hacking' })));
  await assertFails(addDoc(collection(db, 'registrations'), reg({ notes: 'x'.repeat(601) })));
  await assertFails(addDoc(collection(db, 'registrations'), reg({ isAdmin: true })));
  await assertFails(addDoc(collection(db, 'registrations'), reg({ whatsapp: '<script>' })));
});
test('the public form cannot read, edit or delete registrations', async () => {
  let id; await env.withSecurityRulesDisabled(async c => { id = (await addDoc(collection(c.firestore(), 'registrations'), reg())).id; });
  await assertFails(getDoc(doc(anon(), 'registrations', id)));
  await assertFails(setDoc(doc(anon(), 'registrations', id), { status: 'lost' }, { merge: true }));
  await assertFails(deleteDoc(doc(anon(), 'registrations', id)));
});
test('collections not in the app are closed', async () => {
  await assertFails(setDoc(doc(as('admin'), 'secrets', 'x'), { a: 1 }));
});
