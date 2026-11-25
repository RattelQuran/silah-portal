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
  await assertSucceeds(addDoc(collection(db, 'payments'), { studentId: 'yusuf', amount: 600 }));
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
