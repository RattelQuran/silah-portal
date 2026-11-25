// Data layer: Firebase (Auth + Firestore) when config.js is filled in, otherwise an in-memory demo with sample data.
import { CONFIG } from './config.js';
import { today, addDays, occurrencesOn, thisMonth } from './util.js';

const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
export const isConfigured = () => !!(CONFIG.firebase && CONFIG.firebase.apiKey && !String(CONFIG.firebase.apiKey).startsWith('PASTE'));

export async function initData() { return isConfigured() ? firebaseApi() : demoApi(); }

/* ======================= Firebase ======================= */
async function firebaseApi() {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(FB + 'firebase-app.js'), import(FB + 'firebase-auth.js'), import(FB + 'firebase-firestore.js')]);
  const app = initializeApp(CONFIG.firebase);
  const auth = A.getAuth(app); auth.languageCode = 'ar';
  const db = F.getFirestore(app);
  const ref = (c, id) => F.doc(db, c, id);
  const snapDocs = s => s.docs.map(d => ({ id: d.id, ...d.data() }));
  const ownerEmail = String(CONFIG.ownerEmail || '').trim().toLowerCase();

  // Finish an email-link sign-in if the page was opened from the link.
  if (A.isSignInWithEmailLink(auth, location.href)) {
    let email = null; try { email = localStorage.getItem('silah-email'); } catch (e) { /* ignore */ }
    if (email) { // otherwise the sign-in screen asks for the email and calls finishEmailLink
      try { await A.signInWithEmailLink(auth, email, location.href); } catch (e) { console.warn(e); }
      try { localStorage.removeItem('silah-email'); } catch (e) { /* ignore */ }
      history.replaceState(null, '', location.pathname);
    }
  }

  const api = {
    mode: 'firebase',
    onAuth: cb => A.onAuthStateChanged(auth, cb),
    signInGoogle: () => A.signInWithPopup(auth, new A.GoogleAuthProvider()),
    async sendEmailLink(email) {
      await A.sendSignInLinkToEmail(auth, email, { url: location.origin + location.pathname, handleCodeInApp: true });
      try { localStorage.setItem('silah-email', email); } catch (e) { /* ignore */ }
    },
    async finishEmailLink(email) { await A.signInWithEmailLink(auth, email, location.href); history.replaceState(null, '', location.pathname); },
    pendingEmailLink: () => A.isSignInWithEmailLink(auth, location.href),
    signOut: () => A.signOut(auth),
    async get(c, id) { const s = await F.getDoc(ref(c, id)); return s.exists() ? { id: s.id, ...s.data() } : null; },
    async list(c, where = []) {
      const q = where.length ? F.query(F.collection(db, c), ...where.map(w => F.where(w[0], w[1], w[2]))) : F.collection(db, c);
      return snapDocs(await F.getDocs(q));
    },
    set: (c, id, data, merge = false) => F.setDoc(ref(c, id), clean(data), { merge }),
    async add(c, data) { const r = await F.addDoc(F.collection(db, c), clean(data)); return r.id; },
    del: (c, id) => F.deleteDoc(ref(c, id)),
    async batch(ops) {
      for (let i = 0; i < ops.length; i += 400) {
        const b = F.writeBatch(db);
        for (const o of ops.slice(i, i + 400)) o.delete ? b.delete(ref(o.c, o.id)) : b.set(ref(o.c, o.id), clean(o.data));
        await b.commit();
      }
    },
    /** Returns the signed-in person's profile, creating it from an invite (or the owner email) on first sign-in. */
    async loadProfile(user) {
      const mine = await api.get('users', user.uid);
      if (mine) return mine;
      const email = String(user.email || '').toLowerCase();
      if (!email || user.emailVerified === false) return { error: 'unverified' };
      let base = null;
      if (ownerEmail && email === ownerEmail) base = { role: 'admin', teacherId: '', studentIds: [], name: user.displayName || 'المدير' };
      else {
        let inv = null; try { inv = await api.get('invites', email); } catch (e) { inv = null; }
        if (inv) base = { role: inv.role, teacherId: inv.teacherId || '', studentIds: inv.studentIds || [], name: inv.name || user.displayName || '' };
      }
      if (!base) return { error: 'no-invite', email };
      const prof = { ...base, email, createdAt: Date.now() };
      await api.set('users', user.uid, prof);
      return { id: user.uid, ...prof };
    },
  };
  return api;
}
// Firestore rejects undefined values.
function clean(o) { const r = {}; for (const k in o) if (o[k] !== undefined && k !== 'id') r[k] = o[k]; return r; }

/* ======================= Demo ======================= */
function demoApi() {
  const store = seed();
  let authCb = null;
  const match = (d, [f, op, v]) => op === '==' ? d[f] === v : op === 'in' ? v.includes(d[f]) : op === 'array-contains' ? (d[f] || []).includes(v) : op === '>=' ? d[f] >= v : op === '<=' ? d[f] <= v : true;
  const col = c => store[c] || (store[c] = {});
  const api = {
    mode: 'demo',
    onAuth(cb) { authCb = cb; cb(null); return () => { }; },
    demoSignIn(role) { const u = DEMO_USERS[role]; authCb && authCb({ uid: u.id, email: u.email, displayName: u.name }); },
    signOut() { authCb && authCb(null); },
    async get(c, id) { const d = col(c)[id]; return d ? { id, ...structuredClone(d) } : null; },
    async list(c, where = []) { return Object.entries(col(c)).map(([id, d]) => ({ id, ...structuredClone(d) })).filter(d => where.every(w => match(d, w))); },
    async set(c, id, data, merge = false) { col(c)[id] = merge ? { ...(col(c)[id] || {}), ...clean(data) } : clean(data); },
    async add(c, data) { const id = c.slice(0, 3) + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); col(c)[id] = clean(data); return id; },
    async del(c, id) { delete col(c)[id]; },
    async batch(ops) { for (const o of ops) o.delete ? delete col(o.c)[o.id] : (col(o.c)[o.id] = clean(o.data)); },
    async loadProfile(user) { return { id: user.uid, ...structuredClone(store.users[user.uid]) }; },
  };
  return api;
}

const DEMO_USERS = {
  admin: { id: 'u-admin', email: 'admin@example.com', name: 'مدير الأكاديمية (تجريبي)' },
  supervisor: { id: 'u-sup', email: 'sup@example.com', name: 'المشرفة (تجريبي)' },
  accountant: { id: 'u-acc', email: 'acc@example.com', name: 'المحاسب (تجريبي)' },
  teacher: { id: 'u-teacher', email: 'teacher@example.com', name: 'أ. سارة (تجريبي)' },
  parent: { id: 'u-parent', email: 'parent@example.com', name: 'أم يوسف (تجريبي)' },
};

function seed() {
  const T = (name, section, room) => ({ name, section, room });
  const teachers = { sara: T('أ. سارة', 'قسم البنات', 'https://meet.google.com/aaa-demo-one'), omar: T('الشيخ عمر', 'قسم البنين', 'https://meet.google.com/bbb-demo-two'), huda: T('أ. هدى', 'قسم البنات', 'https://meet.google.com/ccc-demo-three') };
  const S = (name, teacherId, slots, studentTz, duration, since, extra = {}) => ({ name, teacherId, slots, schedTz: 'Africa/Cairo', studentTz, duration, since, contact: '+90 555 000 00 00', parentName: 'ولي أمر ' + name, link: teachers[teacherId].room, ...extra });
  const m0 = thisMonth() + '-01';
  const students = {
    yusuf: S('يوسف', 'sara', [{ day: 0, time: '16:00' }, { day: 2, time: '16:00' }, { day: 4, time: '16:00' }], 'Europe/Istanbul', 30, '2026-06-01'),
    maryam: S('مريم', 'sara', [{ day: 1, time: '17:00' }, { day: 3, time: '17:00' }], 'Europe/Istanbul', 30, '2026-06-01'),
    adam: S('آدم', 'omar', [{ day: 0, time: '18:00' }, { day: 1, time: '18:00' }, { day: 3, time: '18:00' }], 'Europe/Berlin', 45, '2026-03-10'),
    zaid: S('زيد', 'omar', [{ day: 2, time: '19:00' }, { day: 4, time: '19:00' }], 'America/New_York', 45, '2026-08-15'),
    layan: S('ليان', 'huda', [{ day: 6, time: '15:00' }, { day: 1, time: '15:00' }, { day: 3, time: '15:00' }], 'Asia/Riyadh', 30, m0),
    salma: S('سلمى', 'huda', [{ day: 0, time: '20:00' }, { day: 2, time: '20:00' }], 'Europe/London', 30, '2026-04-01'),
    hamza: S('حمزة', 'omar', [{ day: 6, time: '17:00' }, { day: 2, time: '17:00' }], 'Asia/Dubai', 45, '2026-05-01'),
    noor: S('نور', 'sara', [{ day: 1, time: '19:30' }, { day: 4, time: '19:30' }], 'Australia/Sydney', 30, '2026-02-01', { pausedUntil: addDays(today(), 10) }),
  };
  const B = (quota, fee, currency, extra = {}) => ({ quota, fee, currency, cycleStart: m0, cycleStartAt: 0, doneBefore: 0, ...extra });
  const billing = {
    yusuf: B(12, 600, 'TRY', { feeWith: 'مريم' }), maryam: B(8, 600, 'TRY', { feeWith: 'يوسف' }),
    adam: B(12, 90, 'EUR'), zaid: B(8, 80, 'USD', { doneBefore: 2 }), layan: B(12, 300, 'SAR', { paidThrough: addDays(today(), 2) }),
    salma: B(8, 60, 'GBP', { doneBefore: 3 }), hamza: B(8, 250, 'AED'), noor: B(8, 70, 'USD'),
  };
  const attendance = {}, reports = {};
  const surahs = ['النبأ', 'النازعات', 'عبس', 'التكوير', 'الانفطار', 'المطففين'];
  let k = 0;
  for (let D = m0; D < today(); D = addDays(D, 1)) {
    for (const o of occurrencesOn(Object.entries(students).map(([id, s]) => ({ id, ...s })), D, 'Africa/Cairo')) {
      k++;
      const status = k % 11 === 0 ? 'absent' : k % 7 === 0 ? 'late' : k % 13 === 0 ? 'excused' : 'present';
      const id = D + '_' + o.s.id;
      if (k % 17 === 5) continue; // a few sessions left unrecorded on purpose
      attendance[id] = { studentId: o.s.id, teacherId: o.s.teacherId, date: D, month: D.slice(0, 7), status, at: Date.now() };
      if (status !== 'absent' && status !== 'excused' && k % 3 !== 0) {
        const su = surahs[k % surahs.length];
        reports[id] = { studentId: o.s.id, teacherId: o.s.teacherId, date: D, month: D.slice(0, 7), newMem: 'سورة ' + su + ' ' + (1 + k % 10) + '–' + (6 + k % 10), review: 'سورة ' + surahs[(k + 2) % surahs.length], rating: ['ممتاز', 'جيد جدًا', 'جيد'][k % 3], homework: 'مراجعة الآيات الجديدة ٣ مرات يوميًا', notes: k % 4 === 0 ? 'يحتاج تركيزًا أكثر في المدود' : '', at: Date.now() };
      }
    }
  }
  const pm = thisMonth();
  const payments = {
    p1: { studentId: 'yusuf', date: m0, month: pm, amount: 600, currency: 'TRY' },
    p2: { studentId: 'adam', date: addDays(m0, 2), month: pm, amount: 90, currency: 'EUR' },
    p3: { studentId: 'zaid', date: addDays(m0, 4), month: pm, amount: 80, currency: 'USD' },
    p4: { studentId: 'salma', date: addDays(m0, 5), month: pm, amount: 60, currency: 'GBP' },
  };
  const expenses = { e1: { date: addDays(m0, 3), month: pm, amount: 1500, currency: 'EGP', category: 'إعلانات وتسويق', note: 'إعلان إنستغرام' }, e2: { date: addDays(m0, 6), month: pm, amount: 12, currency: 'USD', category: 'اشتراكات وبرامج', note: 'Zoom' } };
  const users = {};
  for (const [role, u] of Object.entries(DEMO_USERS)) users[u.id] = { role, name: u.name, email: u.email, teacherId: role === 'teacher' ? 'sara' : '', studentIds: role === 'parent' ? ['yusuf', 'maryam'] : [] };
  return {
    teachers, students, billing, attendance, reports, payments, expenses, users, payouts: {}, invites: {},
    monthlyReports: {
      [thisMonth() + '_yusuf']: { studentId: 'yusuf', teacherId: 'sara', month: thisMonth(), start: 'سورة النبأ', end: 'سورة عبس آية ٢٠', achieved: 'أتمّ حفظ النبأ والنازعات مع مراجعة قصار السور', strengths: 'مخارج الحروف واضحة', improve: 'المدود', nextGoal: 'إتمام سورة عبس', teacherNote: 'يوسف مجتهد ما شاء الله', supNote: 'تقدّم ممتاز', status: 'published', publishedAt: Date.now(), updatedAt: Date.now() },
      [thisMonth() + '_maryam']: { studentId: 'maryam', teacherId: 'sara', month: thisMonth(), start: 'سورة الفجر', end: 'سورة البلد', achieved: 'حفظت الفجر والبلد', strengths: 'حفظ سريع', improve: 'التركيز', nextGoal: 'سورة الشمس', teacherNote: '', status: 'submitted', updatedAt: Date.now() },
    },
    makeups: { k1: { studentId: 'maryam', teacherId: 'sara', date: addDays(today(), 2), time: '18:30', forDate: today(), note: 'تعويض حصة مؤجلة', at: Date.now() } },
    contacts: { c1: { studentId: 'zaid', date: addDays(today(), -3), method: 'whatsapp', reason: 'renewal', notes: 'الأم ستؤكد التجديد بعد الراتب', next: addDays(today(), -1), done: false, byName: 'المحاسب (تجريبي)', at: Date.now() - 3 * 864e5 } },
    payAdj: { a1: { teacherId: 'sara', month: thisMonth(), kind: 'bonus', amount: 150, reason: 'تغطية حصص زميلة', at: Date.now() } },
    payroll: {},
    registrations: {
      r1: { parentName: 'أم ريان', studentName: 'ريان', studentAge: 7, country: 'ألمانيا', whatsapp: '+49 151 000 0000', course: 'quran', preferredTime: 'evening', notes: 'يقرأ الفاتحة وقصار السور', status: 'new', source: 'site', at: Date.now() - 3600e3 },
      r2: { parentName: 'أم جود', studentName: 'جود', studentAge: 5, country: 'تركيا', whatsapp: '+90 555 000 11 22', course: 'arabic', preferredTime: 'morning', notes: '', status: 'contacted', source: 'site', at: Date.now() - 86400e3 },
      r3: { parentName: 'أبو عمر', studentName: 'عمر', studentAge: 10, country: 'كندا', whatsapp: '+1 416 000 0000', course: 'tajweed', preferredTime: 'night', notes: 'يحفظ جزء عم', status: 'trial', source: 'site', at: Date.now() - 3 * 86400e3 },
    },
    teacherRates: { sara: { hourRate: 80 }, omar: { hourRate: 100 }, huda: { hourRate: 80 } },
    settings: { rates: { USD: 56.1, EUR: 65, SAR: 14.96, AED: 15.27, TRY: 1.64, GBP: 75 }, main: { academy: 'أكاديمية صلة', payAbsent: true } },
  };
}
