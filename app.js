import { CONFIG } from './config.js';
import { initData } from './data.js';
import * as U from './util.js';
const { esc, fmtN, fmtDate, fmtDay, fmtTime, ST, ST_KEYS, COUNTED, DAYS, DAY_ORDER } = U;

const ACAD_TZ = 'Africa/Cairo';           // dates of attendance/reports are keyed in academy time
const $ = id => document.getElementById(id);
const S = { api: null, user: null, prof: null, tab: '', date: U.today(), month: U.thisMonth(), q: '', tf: 'all', rf: 'open', busy: new Set() };
let D = emptyData();
function emptyData() { return { teachers: {}, students: [], billing: {}, att: [], reports: [], payments: [], expenses: [], payouts: [], rates: {}, main: {}, tRates: {}, users: [], invites: [], regs: [], monthly: [], makeups: [], contacts: [], adj: [], payroll: [] }; }

/* ---------------- boot & auth ---------------- */
let toastT;
function toast(m) { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }
function fail(e) { console.error(e); const c = e && e.code || ''; toast(c.includes('permission') ? 'لا تملك صلاحية لهذا الإجراء' : 'تعذّر الحفظ. تحقق من الاتصال وحاول مرة أخرى'); }

(async function boot() {
  try { S.api = await initData(); }
  catch (e) { console.error(e); $('main').innerHTML = `<div class="empty">تعذّر الاتصال بقاعدة البيانات. تحقق من الإنترنت ومن بيانات Firebase في config.js.</div>`; return; }
  $('demoBar').hidden = S.api.mode !== 'demo';
  $('outBtn').onclick = () => { S.api.signOut(); };
  S.api.onAuth(async user => {
    S.user = user; S.prof = null; D = emptyData(); closeSheet();
    if (!user) return renderLogin();
    $('main').innerHTML = '<div class="empty">جارٍ تحميل بياناتك…</div>';
    let prof; try { prof = await S.api.loadProfile(user); } catch (e) { prof = { error: 'load', e }; console.error(e); }
    if (!prof || prof.error) return renderNoAccess(prof || {});
    S.prof = prof; S.tab = tabsFor(prof.role)[0][0];
    try { await loadAll(); } catch (e) { console.error(e); }
    render();
  });
})();

function renderLogin() {
  $('top').hidden = true;
  const demo = S.api.mode === 'demo';
  const pending = !demo && S.api.pendingEmailLink && S.api.pendingEmailLink();
  $('main').innerHTML = `<div class="login">
    <img src="logo.jpg" alt="">
    <h1>بوابة ${esc(CONFIG.academy || 'صلة')}</h1>
    ${demo ? `<p class="note">اختر دورًا لتجربة البوابة ببيانات وهمية:</p>
      <div class="roles">${Object.entries(U.ROLES).map(([r, l]) => `<button class="btn ${r === 'admin' ? 'red' : 'ghost'}" type="button" data-demo="${r}">${l}</button>`).join('')}</div>
      <p class="note">لتشغيل البوابة الحقيقية أضف بيانات Firebase في ملف config.js.</p>`
    : pending ? `<p class="note">أكّد بريدك لإكمال الدخول من الرابط.</p>
      <form id="finForm" class="grid"><input id="finEmail" type="email" dir="ltr" placeholder="name@example.com" required autocomplete="email"><button class="btn red" type="submit">إكمال الدخول</button></form>`
    : `<button class="btn blue" id="gBtn" type="button" style="justify-content:center">الدخول بحساب Google</button>
      <span class="or">أو برابط يصل إلى بريدك</span>
      <form id="linkForm" class="grid"><input id="linkEmail" type="email" dir="ltr" placeholder="name@example.com" required autocomplete="email"><button class="btn red" type="submit">أرسل رابط الدخول</button></form>
      <p class="note">يدخل فقط من دعته الإدارة ببريده.</p>`}
  </div>`;
  document.querySelectorAll('[data-demo]').forEach(b => b.onclick = () => S.api.demoSignIn(b.dataset.demo));
  if ($('gBtn')) $('gBtn').onclick = () => S.api.signInGoogle().catch(e => toast(e.code === 'auth/popup-closed-by-user' ? 'أُغلقت نافذة الدخول' : 'تعذّر الدخول بحساب Google'));
  if ($('linkForm')) $('linkForm').onsubmit = async e => { e.preventDefault(); const em = $('linkEmail').value.trim(); try { await S.api.sendEmailLink(em); toast('أُرسل الرابط إلى ' + em + '. افتحه من نفس الجهاز.'); } catch (x) { console.error(x); toast('تعذّر إرسال الرابط. تحقق من البريد'); } };
  if ($('finForm')) $('finForm').onsubmit = async e => { e.preventDefault(); try { await S.api.finishEmailLink($('finEmail').value.trim()); } catch (x) { toast('الرابط غير صالح أو انتهت مدته. اطلب رابطًا جديدًا'); } };
}
function renderNoAccess(p) {
  $('top').hidden = true;
  const msg = p.error === 'no-invite' ? `البريد <b dir="ltr">${esc(p.email)}</b> غير مسجّل في الأكاديمية بعد. اطلب من الإدارة إضافته، ثم ادخل مرة أخرى.`
    : p.error === 'unverified' ? 'لم يُؤكَّد بريدك بعد. ادخل بحساب Google أو برابط البريد.' : 'تعذّر تحميل حسابك. حاول مرة أخرى بعد قليل.';
  $('main').innerHTML = `<div class="login"><img src="logo.jpg" alt=""><h1>لا يمكن فتح البوابة</h1><p>${msg}</p><button class="btn ghost" type="button" id="o2">الدخول بحساب آخر</button></div>`;
  $('o2').onclick = () => S.api.signOut();
}

/* ---------------- loading ---------------- */
const role = () => S.prof && S.prof.role;
const can = {
  sup: () => ['admin', 'supervisor'].includes(role()),
  acc: () => ['admin', 'accountant'].includes(role()),
  staff: () => ['admin', 'supervisor', 'accountant'].includes(role()),
  admin: () => role() === 'admin',
};
async function loadAll() {
  const A = S.api, r = role(), d = emptyData();
  const safe = p => p.catch(e => { console.warn(e); return null; });
  const [teachers, main] = await Promise.all([safe(A.list('teachers')), safe(A.get('settings', 'main'))]);
  (teachers || []).forEach(t => d.teachers[t.id] = t); d.main = main || {};
  if (can.staff()) {
    const jobs = [A.list('students'), A.list('billing'), A.list('attendance'), A.list('reports'), safe(A.get('settings', 'rates'))];
    const [st, bi, at, rp, rates] = await Promise.all(jobs);
    d.students = st; bi.forEach(b => d.billing[b.id] = b); d.att = at; d.reports = rp; d.rates = rates || {};
    const [mo, mk, ct] = await Promise.all([safe(A.list('monthlyReports')), safe(A.list('makeups')), safe(A.list('contacts'))]);
    d.monthly = mo || []; d.makeups = mk || []; d.contacts = ct || [];
    if (can.acc()) {
      const [pay, exp, po, tr] = await Promise.all([A.list('payments'), A.list('expenses'), A.list('payouts'), A.list('teacherRates')]);
      d.payments = pay; d.expenses = exp; d.payouts = po; tr.forEach(x => d.tRates[x.id] = x);
      const [aj, pr] = await Promise.all([safe(A.list('payAdj')), safe(A.list('payroll'))]); d.adj = aj || []; d.payroll = pr || [];
    }
    if (can.sup()) d.regs = (await safe(A.list('registrations'))) || [];
    if (can.admin()) { const [us, inv] = await Promise.all([A.list('users'), A.list('invites')]); d.users = us; d.invites = inv; }
  } else if (r === 'teacher') {
    const t = S.prof.teacherId || '';
    const [st, at, rp, tr, po] = await Promise.all([A.list('students', [['teacherId', '==', t]]), A.list('attendance', [['teacherId', '==', t]]), A.list('reports', [['teacherId', '==', t]]), safe(A.get('teacherRates', t)), safe(A.list('payouts', [['teacherId', '==', t]]))]);
    d.students = st; d.att = at; d.reports = rp; if (tr) d.tRates[t] = tr; d.payouts = po || [];
    const by = [['teacherId', '==', t]];
    const [mo, mk, aj, pr] = await Promise.all([safe(A.list('monthlyReports', by)), safe(A.list('makeups', by)), safe(A.list('payAdj', by)), safe(A.list('payroll', by))]);
    d.monthly = mo || []; d.makeups = mk || []; d.adj = aj || []; d.payroll = pr || [];
  } else if (r === 'parent') {
    for (const sid of S.prof.studentIds || []) {
      const [s, b, at, rp, pay] = await Promise.all([safe(A.get('students', sid)), safe(A.get('billing', sid)), safe(A.list('attendance', [['studentId', '==', sid]])), safe(A.list('reports', [['studentId', '==', sid]])), safe(A.list('payments', [['studentId', '==', sid]]))]);
      if (!s) continue;
      d.students.push(s); if (b) d.billing[sid] = b; d.att.push(...(at || [])); d.reports.push(...(rp || [])); d.payments.push(...(pay || []));
      const [mo, mk] = await Promise.all([safe(A.list('monthlyReports', [['studentId', '==', sid], ['status', '==', 'published']])), safe(A.list('makeups', [['studentId', '==', sid]]))]);
      d.monthly.push(...(mo || [])); d.makeups.push(...(mk || []));
    }
  }
  d.attMap = {}; d.att.forEach(a => d.attMap[a.date + '_' + a.studentId] = a);
  d.repMap = {}; d.reports.forEach(x => d.repMap[x.date + '_' + x.studentId] = x);
  D = d;
}
async function reload() { await loadAll(); render(); }

/* ---------------- shell ---------------- */
function tabsFor(r) {
  return {
    admin: [['dash', 'لوحة الإدارة'], ['regs', 'طلبات التسجيل'], ['sup', 'الإشراف'], ['monthly', 'التقارير الشهرية'], ['acc', 'الحسابات'], ['students', 'الطلاب'], ['teachers', 'المعلمون'], ['people', 'الصلاحيات والنقل']],
    supervisor: [['sup', 'الإشراف'], ['monthly', 'التقارير الشهرية'], ['regs', 'طلبات التسجيل'], ['students', 'الطلاب']],
    accountant: [['acc', 'الحسابات']],
    teacher: [['mine', 'حلقاتي'], ['mymonth', 'شهري ومستحقاتي']],
    parent: [['kids', 'متابعة أبنائي']],
  }[r] || [];
}
function render() {
  $('top').hidden = false;
  $('roleLbl').textContent = 'بوابة ' + (U.ROLES[role()] || '');
  $('meName').innerHTML = `<span>${esc(S.prof.name || S.user.email || '')}</span>`;
  const tabs = tabsFor(role());
  const newRegs = D.regs.filter(r => (r.status || 'new') === 'new').length;
  $('tabs').innerHTML = tabs.map(([k, l]) => `<button role="tab" type="button" data-tab="${k}" aria-selected="${k === S.tab}">${l}${k === 'regs' && newRegs ? ` <span class="cnt">${newRegs}</span>` : ''}</button>`).join('');
  $('tabs').querySelectorAll('button').forEach(b => b.onclick = () => { S.tab = b.dataset.tab; render(); });
  const V = { dash: viewDash, sup: viewSup, acc: viewAcc, students: viewStudents, teachers: viewTeachers, people: viewPeople, regs: viewRegs, monthly: viewMonthly, mine: viewMine, mymonth: viewMyMonth, kids: viewKids }[S.tab];
  $('main').innerHTML = V ? V() : '';
  afterRender();
}

/* ---------------- shared helpers ---------------- */
const tName = id => (D.teachers[id] && D.teachers[id].name) || '—';
const sById = id => D.students.find(s => s.id === id);
const attOf = sid => D.att.filter(a => a.studentId === sid);
const rec = (date, sid) => D.attMap[date + '_' + sid];
const repOf = (date, sid) => D.repMap[date + '_' + sid];
const lastReport = sid => D.reports.filter(r => r.studentId === sid).sort((a, b) => (b.date + (b.at || 0)).localeCompare(a.date + (a.at || 0)))[0];
const pkg = s => U.pkgState(D.billing[s.id], attOf(s.id));
const active = () => D.students.filter(s => !U.isPaused(s));
const daysOfMonth = m => { const [y, mo] = m.split('-').map(Number); const n = new Date(y, mo, 0).getDate(); return Array.from({ length: n }, (_, i) => m + '-' + U.pad(i + 1)); };
const durOf = s => Number(s && s.duration) || 30;
function scheduledIn(m, students = D.students, upto = U.today()) {
  const out = [];
  for (const d of daysOfMonth(m)) { if (d > upto) break; out.push(...sessionsOn(d, students).map(o => ({ ...o, date: d }))); }
  return out;
}
function monthNav() { return `<div class="nav"><button type="button" data-act="mprev" aria-label="الشهر السابق">›</button><span>${U.monthLabel(S.month)}</span><button type="button" data-act="mnext" aria-label="الشهر التالي">‹</button></div>`; }
function dayNav() { const isT = S.date === U.today(); return `<div class="nav"><button type="button" data-act="dprev" aria-label="اليوم السابق">›</button><span>${fmtDay(S.date)}${isT ? ' · اليوم' : ''}</span><button type="button" data-act="dnext" aria-label="اليوم التالي">‹</button></div>${isT ? '' : '<button class="btn ghost sm" type="button" data-act="dtoday">اليوم</button>'}`; }
const chip = (txt, cls = '') => `<span class="chip ${cls}">${esc(txt)}</span>`;
const pkgChip = s => { if (D.billing[s.id] && D.billing[s.id].free) return chip('بدون رسوم', 'ok'); const p = pkg(s); return p ? chip(p.txt, p.cls) : ''; };
function monthCounts(sid, m) {
  const c = { present: 0, late: 0, absent: 0, excused: 0, tabsent: 0, resched: 0 };
  D.att.filter(a => a.studentId === sid && a.month === m).forEach(a => c[a.status] !== undefined && c[a.status]++);
  return c;
}
function dotsFor(s, m) {
  const t = U.today();
  const items = daysOfMonth(m).filter(d => rec(d, s.id) || sessionsOn(d, [s]).length);
  if (!items.length) return '<span class="note">لا حلقات في هذا الشهر</span>';
  return `<div class="dots">${items.map(d => { const r = rec(d, s.id); const k = r && ST[r.status] ? ST[r.status].c : d <= t ? 'none' : ''; return `<span class="dot ${k}" title="${fmtDate(d)}${r && ST[r.status] ? ' · ' + ST[r.status].l : ''}">${Number(d.slice(8))}</span>`; }).join('')}</div>`;
}
const legend = () => `<div class="chips">${chip('حضر', 'ok')}${chip('تأخر', 'late')}${chip('غاب', 'miss')}${chip('اعتذر', 'exc')}${chip('غاب المعلم', 'tab')}${chip('تأجلت', 'res')}<span class="chip" style="background:none;border:1.5px dashed var(--miss);color:var(--miss)">فاتت ولم تُسجَّل</span></div>`;

/* ---------------- session cards (supervisor + teacher) ---------------- */
function sessionCard(o, opts = {}) {
  const s = o.s, r = rec(S.date, s.id), cur = r && r.status, rp = repOf(S.date, s.id);
  const canMark = can.sup() || role() === 'teacher';
  const link = U.safeLink(s.link || (D.teachers[s.teacherId] || {}).room);
  return `<article class="card ${cur ? 's-' + cur : ''}">
    <div class="row"><div class="who"><b>${esc(s.name)}${o.slot.review ? ' ' + chip('مراجعة', 'late') : ''}${o.slot.makeup ? ' ' + chip('تعويضية', 'res') : ''}</b><span>${opts.showTeacher ? esc(tName(s.teacherId)) + ' · ' : ''}${durOf(s)} دقيقة · الطالب في ${esc(U.zoneName(U.kTz(s)))}</span></div>
    <div class="time"><b>${fmtTime(U.localTime(o.ms, U.VIEW_TZ))}</b><span>بتوقيتك</span></div></div>
    <div class="chips">${rp ? chip('التقرير مكتوب', 'ok') : chip('بلا تقرير', r && ['absent', 'excused', 'tabsent', 'resched'].includes(cur) ? '' : 'warn')}${opts.pkg ? pkgChip(s) : ''}${mkFor(s.id, S.date) ? chip('التعويض: ' + fmtDay(mkFor(s.id, S.date).date) + ' ' + fmtTime(mkFor(s.id, S.date).time), 'res') : ''}</div>
    <div class="marks">${ST_KEYS.map(k => `<button class="mark ${ST[k].c}" type="button" data-act="mark" data-sid="${s.id}" data-st="${k}" aria-pressed="${cur === k}" ${canMark ? '' : 'disabled'}>${ST[k].l}</button>`).join('')}</div>
    <div class="actions"><button class="btn blue sm" type="button" data-act="report" data-sid="${s.id}">${rp ? 'تعديل التقرير' : 'كتابة تقرير الحصة'}</button>
    ${rp ? `<button class="btn ghost sm" type="button" data-act="copyrep" data-sid="${s.id}">نسخ رسالة الأهل</button>` : ''}
    ${canMark && ['resched', 'tabsent', 'excused'].includes(cur) && !o.slot.makeup ? `<button class="btn ghost sm" type="button" data-act="mkup" data-sid="${s.id}">${mkFor(s.id, S.date) ? 'تعديل موعد التعويض' : 'جدولة حصة تعويضية'}</button>` : ''}
    ${link ? `<a class="btn ghost sm" href="${esc(link)}" target="_blank" rel="noopener">دخول الحلقة</a>` : ''}
    ${U.waLink(s.contact) ? `<a class="btn ghost sm" href="${U.waLink(s.contact)}" target="_blank" rel="noopener">واتساب الأهل</a>` : ''}</div>
  </article>`;
}
async function mark(sid, status) {
  const id = S.date + '_' + sid; if (S.busy.has(id)) return; S.busy.add(id);
  const s = sById(sid); const cur = D.attMap[id];
  try {
    if (cur && cur.status === status) { await S.api.del('attendance', id); delete D.attMap[id]; D.att = D.att.filter(a => !(a.date === S.date && a.studentId === sid)); toast('أُلغي التسجيل'); }
    else {
      const data = { studentId: sid, teacherId: s.teacherId || '', date: S.date, month: S.date.slice(0, 7), status, at: Date.now(), by: S.user.uid };
      await S.api.set('attendance', id, data);
      D.att = D.att.filter(a => !(a.date === S.date && a.studentId === sid)).concat([data]); D.attMap[id] = data;
      toast(s.name + ': ' + ST[status].l);
    }
    render();
  } catch (e) { fail(e); } finally { S.busy.delete(id); }
}
function openReport(sid) {
  const s = sById(sid); if (!s) return;
  const r = repOf(S.date, sid) || {}; const prev = lastReport(sid);
  openSheet(`<h2>تقرير الحصة: ${esc(s.name)}</h2>
  <p class="note" style="margin:-6px 0 12px">${fmtDay(S.date)} · ${esc(tName(s.teacherId))}</p>
  ${prev && prev.homework && prev.date !== S.date ? `<div class="alert amber" style="margin-bottom:12px"><span>واجب الحصة السابقة: <b>${esc(prev.homework)}</b></span></div>` : ''}
  <form id="rform" novalidate>
    <div class="field"><label for="r-new">الحفظ الجديد (التسميع)</label><input id="r-new" value="${esc(r.newMem || '')}" placeholder="مثلًا: سورة النبأ ١–١٠"></div>
    <div class="field"><label for="r-rev">المراجعة</label><input id="r-rev" value="${esc(r.review || '')}" placeholder="مثلًا: سورة النازعات كاملة"></div>
    <div class="field"><span class="lab">التقييم</span><div class="pills">${U.RATINGS.map((x, i) => `<label><input type="radio" name="r-rate" id="r-rate-${i}" value="${x}" ${r.rating === x ? 'checked' : ''}><span>${x}</span></label>`).join('')}</div></div>
    <div class="field"><label for="r-hw">الواجب للحصة القادمة</label><input id="r-hw" value="${esc(r.homework || '')}"></div>
    <div class="field"><label for="r-notes">ملاحظة للأهل</label><textarea id="r-notes" rows="2">${esc(r.notes || '')}</textarea></div>
    <div class="foot"><span class="note">إن لم يُسجَّل الحضور يُسجَّل «حضر» تلقائيًا.</span><div class="actions"><button class="btn ghost" type="button" data-act="close">إلغاء</button><button class="btn red" type="submit">حفظ التقرير</button></div></div>
  </form>`);
  $('rform').onsubmit = async e => {
    e.preventDefault();
    const rt = document.querySelector('input[name="r-rate"]:checked');
    const id = S.date + '_' + sid;
    const body = { studentId: sid, teacherId: s.teacherId || '', date: S.date, month: S.date.slice(0, 7), newMem: $('r-new').value.trim(), review: $('r-rev').value.trim(), rating: rt ? rt.value : '', homework: $('r-hw').value.trim(), notes: $('r-notes').value.trim(), at: Date.now(), by: S.user.uid };
    try {
      await S.api.set('reports', id, body);
      if (!D.attMap[id]) await S.api.set('attendance', id, { studentId: sid, teacherId: s.teacherId || '', date: S.date, month: S.date.slice(0, 7), status: 'present', at: Date.now(), by: S.user.uid });
      closeSheet(); toast('حُفظ التقرير'); await reload();
    } catch (x) { fail(x); }
  };
}
function parentMsg(s, r) {
  const a = rec(r.date, s.id);
  return `السلام عليكم ورحمة الله 🌿\nتقرير حلقة ${s.name} – ${fmtDay(r.date)}\n\n✅ الحضور: ${a && ST[a.status] ? ST[a.status].l : 'حضر'}${r.newMem ? '\n📖 الحفظ الجديد: ' + r.newMem : ''}${r.review ? '\n🔁 المراجعة: ' + r.review : ''}${r.rating ? '\n⭐ التقييم: ' + r.rating : ''}${r.homework ? '\n📝 الواجب: ' + r.homework : ''}${r.notes ? '\n💬 ملاحظة المعلم: ' + r.notes : ''}\n\nبارك الله فيه 🤍\n${CONFIG.academy || 'أكاديمية صلة'}`;
}
async function copyText(t) { try { await navigator.clipboard.writeText(t); toast('تم النسخ'); } catch (e) { openSheet(`<h2>انسخ الرسالة</h2><textarea id="cpy" rows="10" readonly>${esc(t)}</textarea><div class="foot"><span></span><button class="btn red" type="button" data-act="close">تم</button></div>`); $('cpy').select(); } }

/* ================= ADMIN DASHBOARD ================= */
function viewDash() {
  const m = S.month, act = active();
  const sched = scheduledIn(m, D.students);
  const recd = sched.filter(o => rec(o.date, o.s.id));
  const mAtt = D.att.filter(a => a.month === m);
  const came = mAtt.filter(a => a.status === 'present' || a.status === 'late').length;
  const counted = mAtt.filter(a => !['excused', 'tabsent', 'resched'].includes(a.status)).length;
  const newS = D.students.filter(s => (s.since || '').slice(0, 7) === m);
  const money = moneyOf(m);
  const due = D.students.map(s => ({ s, p: pkg(s) })).filter(x => x.p && x.p.due && !U.isPaused(x.s));
  const rows = Object.entries(D.teachers).map(([id, t]) => {
    const st = D.students.filter(s => s.teacherId === id);
    const sc = sched.filter(o => o.s.teacherId === id);
    const rc = sc.filter(o => rec(o.date, o.s.id)).length;
    const rpc = sc.filter(o => repOf(o.date, o.s.id)).length;
    const ta = mAtt.filter(a => a.teacherId === id);
    const tc = ta.filter(a => a.status === 'present' || a.status === 'late').length, tn = ta.filter(a => !['excused', 'tabsent', 'resched'].includes(a.status)).length;
    return `<tr><td><b>${esc(t.name)}</b></td><td class="num">${st.filter(s => !U.isPaused(s)).length}</td><td class="num">${sc.length}</td><td class="num">${pct(rc, sc.length)}</td><td class="num">${pct(rpc, sc.length)}</td><td class="num">${pct(tc, tn)}</td></tr>`;
  }).join('');
  return `<div class="bar"><h1 class="grow">لوحة الإدارة</h1>${monthNav()}</div>
  <div class="kpis">
    ${kpi('الطلاب النشطون', act.length, `${D.students.length - act.length} في إجازة · ${newS.length} جديد هذا الشهر`)}
    ${kpi('نسبة الحضور', pct(came, counted), `${came} حضور من ${counted} حصة مسجّلة (دون الأعذار)`)}
    ${kpi('حصص لم تُسجَّل', sched.length - recd.length, `من ${sched.length} حصة مجدولة حتى اليوم`, sched.length - recd.length ? 'red' : 'ok')}
    ${can.acc() ? kpi('التحصيل', fmtN(money.collected) + ' ج.م', `مصروفات ${fmtN(money.expenses)} · مستحقات معلمين ${fmtN(money.dues)}`) : ''}
    ${can.acc() ? kpi('صافي الشهر', fmtN(money.net) + ' ج.م', 'التحصيل − مستحقات المعلمين − المصروفات', money.net < 0 ? 'red' : 'ok') : ''}
    ${kpi('تجديدات مستحقة', due.length, 'باقات انتهت أو قاربت', due.length ? 'red' : '')}
  </div>
  <div class="cols3">
    <section class="panel"><div class="ph"><h2>أداء المعلمين · ${U.monthLabel(m)}</h2></div>
      <div class="tscroll"><table><thead><tr><th>المعلم</th><th class="num">طلاب نشطون</th><th class="num">حصص مجدولة</th><th class="num">سُجّل حضورها</th><th class="num">كُتب تقريرها</th><th class="num">نسبة حضور الطلاب</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="note">أضف المعلمين من تبويب «المعلمون».</td></tr>'}</tbody></table></div>
      <p class="note">«سُجّل حضورها» و«كُتب تقريرها» تقيس التزام المعلم بالتسجيل، لا حضور الطالب.</p>
    </section>
    <section class="panel"><div class="ph"><h2>يحتاج انتباهك</h2></div>${alertsList(8)}</section>
  </div>
  ${newS.length ? `<section class="panel" style="margin-top:14px"><h2>طلاب جدد في ${U.monthLabel(m)}</h2><div class="chips">${newS.map(s => chip(s.name + ' · ' + tName(s.teacherId))).join('')}</div></section>` : ''}`;
}
const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';
const kpi = (l, v, sub, cls = '') => `<div class="kpi ${cls}"><small>${esc(l)}</small><b>${esc(v)}</b><span>${esc(sub)}</span></div>`;

/** Things a supervisor or admin should act on. */
function alerts() {
  const out = [], t = U.today(), m = S.month === U.thisMonth() ? S.month : U.thisMonth();
  const from = U.addDays(t, -7);
  const missing = [];
  for (let d = from; d < t; d = U.addDays(d, 1)) sessionsOn(d).forEach(o => { if (!rec(d, o.s.id)) missing.push({ d, s: o.s }); });
  if (missing.length) out.push({ cls: 'red', h: `${missing.length} حصة في آخر ٧ أيام لم يُسجَّل حضورها`, b: missing.slice(0, 6).map(x => x.s.name + ' (' + fmtDate(x.d) + ' · ' + tName(x.s.teacherId) + ')').join('، ') + (missing.length > 6 ? '…' : '') });
  for (const s of active()) {
    const c = monthCounts(s.id, m);
    if (c.absent >= 2) out.push({ cls: 'red', h: `${s.name}: غاب ${c.absent} مرات هذا الشهر`, b: 'تواصل مع الأهل لمعرفة السبب.' });
    const lr = lastReport(s.id); const age = lr ? Math.round((U.parse(t) - U.parse(lr.date)) / 864e5) : null;
    if ((s.since || '') <= U.addDays(t, -14) && (age === null || age > 14)) out.push({ cls: 'amber', h: `${s.name}: ${age === null ? 'لا يوجد أي تقرير حصة' : 'آخر تقرير قبل ' + age + ' يومًا'}`, b: 'المعلم: ' + tName(s.teacherId) });
    const p = pkg(s); if (p && p.due) out.push({ cls: p.cls === 'miss' ? 'red' : 'amber', h: `${s.name}: ${p.txt}`, b: 'تجديد الباقة' });
  }
  dueFollowUps().forEach(c => { const s = sById(c.studentId); if (s) out.push({ cls: 'amber', h: `متابعة مع أهل ${s.name} (${fmtDate(c.next)})`, b: (CT_WHY[c.reason] || '') + (c.notes ? ' · ' + c.notes : '') }); });
  if (can.sup()) { const w = D.monthly.filter(r => r.status === 'submitted').length; if (w) out.push({ cls: 'amber', h: `${w} تقرير شهري بانتظار اعتمادك`, b: 'من تبويب «التقارير الشهرية».' }); }
  return out;
}
function alertsList(max = 50) {
  const a = alerts();
  if (!a.length) return '<div class="alert"><span>لا شيء عاجل. كل الحصص مسجّلة والتقارير منتظمة.</span></div>';
  return a.slice(0, max).map(x => `<div class="alert ${x.cls}"><span><b>${esc(x.h)}</b><br><span class="note">${esc(x.b)}</span></span></div>`).join('') + (a.length > max ? `<p class="note">و${a.length - max} تنبيهات أخرى في تبويب الإشراف.</p>` : '');
}

/* ================= SUPERVISION ================= */
function viewSup() {
  const list = sessionsOn(S.date).filter(o => S.tf === 'all' || o.s.teacherId === S.tf);
  const cnt = { present: 0, late: 0, absent: 0, excused: 0, tabsent: 0, resched: 0, none: 0, rep: 0 };
  list.forEach(o => { const r = rec(S.date, o.s.id); r && ST[r.status] ? cnt[r.status]++ : cnt.none++; if (repOf(S.date, o.s.id)) cnt.rep++; });
  const m = U.thisMonth(), sched = scheduledIn(m);
  const quality = Object.entries(D.teachers).map(([id, t]) => {
    const sc = sched.filter(o => o.s.teacherId === id); const reps = D.reports.filter(r => r.teacherId === id && r.month === m);
    const top = reps.filter(r => r.rating === 'ممتاز' || r.rating === 'جيد جدًا').length;
    return `<tr><td><b>${esc(t.name)}</b></td><td class="num">${pct(sc.filter(o => rec(o.date, o.s.id)).length, sc.length)}</td><td class="num">${pct(sc.filter(o => repOf(o.date, o.s.id)).length, sc.length)}</td><td class="num">${reps.length ? pct(top, reps.length) : '—'}</td></tr>`;
  }).join('');
  return `<div class="bar"><h1 class="grow">الإشراف</h1>${dayNav()}</div>
  <div class="bar"><div class="pills">${[['all', 'كل المعلمين'], ...Object.entries(D.teachers).map(([id, t]) => [id, t.name])].map(([v, l]) => `<label><input type="radio" name="tf" value="${esc(v)}" ${S.tf === v ? 'checked' : ''} data-act="tf"><span>${esc(l)}</span></label>`).join('')}</div></div>
  <div class="cols3">
    <section class="grid" style="align-content:start">
      <div class="chips">${chip(list.length + ' حصة')}${cnt.present ? chip('حضر ' + cnt.present, 'ok') : ''}${cnt.late ? chip('تأخر ' + cnt.late, 'late') : ''}${cnt.absent ? chip('غاب ' + cnt.absent, 'miss') : ''}${cnt.excused ? chip('اعتذر ' + cnt.excused, 'exc') : ''}${cnt.tabsent ? chip('غاب المعلم ' + cnt.tabsent, 'tab') : ''}${cnt.resched ? chip('تأجلت ' + cnt.resched, 'res') : ''}${cnt.none ? chip('لم يُسجَّل ' + cnt.none, 'warn') : ''}${chip('تقارير ' + cnt.rep + ' من ' + list.length)}</div>
      ${list.length ? `<div class="cards">${list.map(o => sessionCard(o, { showTeacher: true, pkg: true })).join('')}</div>` : '<div class="empty">لا حلقات في هذا اليوم.</div>'}
    </section>
    <aside class="grid" style="align-content:start">
      <section class="panel"><h2>تنبيهات المتابعة</h2>${alertsList(12)}</section>
      <section class="panel"><h2>جودة التسجيل · ${U.monthLabel(m)}</h2>
        <div class="tscroll"><table><thead><tr><th>المعلم</th><th class="num">الحضور</th><th class="num">التقارير</th><th class="num">ممتاز/جيد جدًا</th></tr></thead><tbody>${quality}</tbody></table></div></section>
    </aside>
  </div>`;
}

/* ================= ACCOUNTS ================= */
function duesOf(tid, m) {
  const payAbsent = D.main.payAbsent !== false;
  const recs = D.att.filter(a => a.teacherId === tid && a.month === m && (a.status === 'present' || a.status === 'late' || (payAbsent && a.status === 'absent')));
  const minutes = recs.reduce((n, a) => n + durOf(sById(a.studentId)), 0);
  const tr = D.tRates[tid] || {};
  const rate = Number(tr.hourRate) || 0;
  // mode 'full' (e.g. the academy owner): dues are everything their own students paid this month.
  const full = tr.mode === 'full';
  const feeTotal = full ? D.payments.filter(p => p.month === m && (sById(p.studentId) || {}).teacherId === tid)
    .reduce((n, p) => n + (p.egp != null ? Number(p.egp) : U.toEGP(D.rates, p.amount, p.currency)), 0) : 0;
  const paid = D.payouts.filter(p => p.teacherId === tid && p.month === m).reduce((n, p) => n + (Number(p.amount) || 0), 0);
  const base = full ? feeTotal : minutes / 60 * rate;
  const aj = D.adj.filter(a => a.teacherId === tid && a.month === m);
  const bonus = aj.filter(a => a.kind === 'bonus').reduce((n, a) => n + (Number(a.amount) || 0), 0);
  const deduction = aj.filter(a => a.kind === 'deduction').reduce((n, a) => n + (Number(a.amount) || 0), 0);
  const approved = D.payroll.find(p => p.teacherId === tid && p.month === m) || null;
  return { sessions: recs.length, hours: minutes / 60, rate, full, base, bonus, deduction, due: base + bonus - deduction, paid, approved };
}
const payLbl = x => x.full ? 'مبلغ الطالب كاملًا' : x.rate ? 'أجر الساعة ' + fmtN(x.rate) + ' ج.م' : '';
function moneyOf(m) {
  const collected = D.payments.filter(p => p.month === m).reduce((n, p) => n + (p.egp != null ? Number(p.egp) : U.toEGP(D.rates, p.amount, p.currency)), 0);
  const expenses = D.expenses.filter(e => e.month === m).reduce((n, e) => n + (e.egp != null ? Number(e.egp) : U.toEGP(D.rates, e.amount, e.currency)), 0);
  const dues = Object.keys(D.teachers).reduce((n, t) => n + duesOf(t, m).due, 0);
  const paidOut = D.payouts.filter(p => p.month === m).reduce((n, p) => n + (Number(p.amount) || 0), 0);
  let expected = 0; const seen = new Set();
  for (const s of active()) { const b = D.billing[s.id]; if (!b || b.free || !b.fee || seen.has(s.id)) continue; U.feeGroup(s, b, D.students, D.billing).forEach(x => seen.add(x)); expected += U.toEGP(D.rates, b.fee, b.currency); }
  return { collected, expenses, dues, paidOut, expected, net: collected - dues - expenses };
}
function viewAcc() {
  const m = S.month, M = moneyOf(m);
  const due = D.students.map(s => ({ s, p: pkg(s) })).filter(x => x.p && x.p.due).sort((a, b) => (a.p.cls === 'miss' ? 0 : 1) - (b.p.cls === 'miss' ? 0 : 1));
  const pays = D.payments.filter(p => p.month === m).sort((a, b) => b.date.localeCompare(a.date));
  const exps = D.expenses.filter(e => e.month === m).sort((a, b) => b.date.localeCompare(a.date));
  const tRows = Object.entries(D.teachers).map(([id, t]) => { const x = duesOf(id, m); return `<tr><td><b>${esc(t.name)}</b><br>${payStatus(x)}</td><td class="num">${x.sessions}</td><td class="num">${x.hours.toFixed(1)}</td><td class="num">${x.full ? 'مبلغ الطالب كاملًا' : x.rate ? fmtN(x.rate) : '<span class="chip warn">حدّد الأجر</span>'}</td><td class="num">${fmtN(x.base)}</td><td class="num">${x.bonus ? '+' + fmtN(x.bonus) : ''}${x.bonus && x.deduction ? '<br>' : ''}${x.deduction ? '<span style="color:var(--crimson)">−' + fmtN(x.deduction) + '</span>' : ''}${x.bonus || x.deduction ? '' : '—'}</td><td class="num"><b>${fmtN(x.due)}</b></td><td class="num">${fmtN(x.paid)}</td><td class="num"><b>${fmtN(x.due - x.paid)}</b></td><td><div class="chips" style="flex-wrap:nowrap"><button class="btn ghost sm" type="button" data-act="adj" data-t="${id}">مكافأة/خصم</button>${x.approved && Math.round(x.due) === Number(x.approved.total) ? `<button class="btn ghost sm" type="button" data-act="payundo" data-t="${id}">إلغاء الاعتماد</button>` : `<button class="btn blue sm" type="button" data-act="payok" data-t="${id}">${x.approved ? 'إعادة الاعتماد' : 'اعتماد'}</button>`}<button class="btn ghost sm" type="button" data-act="payout" data-t="${id}">تسجيل صرف</button></div></td></tr>`; }).join('');
  const rnCount = k => due.filter(({ s }) => (renewalOf(D.billing[s.id]).status || 'none') === k).length;
  return `<div class="bar"><h1 class="grow">الحسابات</h1>${monthNav()}</div>
  <div class="kpis">
    ${kpi('التحصيل الفعلي', fmtN(M.collected) + ' ج.م', `${pays.length} دفعة في ${U.monthLabel(m)}`)}
    ${kpi('الدخل الشهري المتوقع', fmtN(M.expected) + ' ج.م', 'مجموع رسوم الطلاب النشطين · رسوم الإخوة مرة واحدة')}
    ${kpi('مستحقات المعلمين', fmtN(M.dues) + ' ج.م', `صُرف منها ${fmtN(M.paidOut)}`)}
    ${kpi('المصروفات', fmtN(M.expenses) + ' ج.م', `${exps.length} بند`)}
    ${kpi('صافي الربح', fmtN(M.net) + ' ج.م', 'التحصيل − المستحقات − المصروفات', M.net < 0 ? 'red' : 'ok')}
  </div>
  <div class="cols2">
    <section class="panel"><div class="ph"><h2>التجديدات المستحقة (${due.length})</h2></div>
      ${due.length ? `<div class="chips" style="margin-bottom:8px">${chip('لم يُتواصل ' + rnCount('none'), 'warn')}${chip('قيد المتابعة ' + (rnCount('reminded') + rnCount('interested') + rnCount('pending')), 'late')}${chip('لن يجدّد ' + rnCount('stop'), 'miss')}</div>
      <div class="tscroll"><table><thead><tr><th>الطالب</th><th>الباقة</th><th class="num">الرسوم</th><th>متابعة التجديد</th><th></th></tr></thead><tbody>${due.map(({ s, p }) => { const b = D.billing[s.id] || {}; return `<tr><td><b>${esc(s.name)}</b><br><span class="note">${esc(tName(s.teacherId))}</span></td><td>${chip(p.txt, p.cls)}<br>${chip(p.cls === 'miss' ? 'الدفع متأخر' : 'الدفع مستحق قريبًا', p.cls === 'miss' ? 'miss' : 'warn')}</td><td class="num">${b.fee ? fmtN(b.fee) + ' ' + esc(U.curName(b.currency)) : '—'}</td><td>${renewalCell(s)}</td><td><div class="chips" style="flex-wrap:nowrap"><button class="btn red sm" type="button" data-act="pay" data-sid="${s.id}">تسجيل دفعة</button>${U.waLink(s.contact) ? `<a class="btn wa sm" href="${U.waLink(s.contact)}?text=${encodeURIComponent('السلام عليكم ' + (s.parentName || '') + '، نذكّركم بموعد تجديد باقة ' + s.name + ' في ' + (CONFIG.academy || 'أكاديمية صلة') + ' 🌿')}" target="_blank" rel="noopener">تذكير</a>` : ''}</div></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="alert"><span>لا تجديدات مستحقة الآن.</span></div>'}
    </section>
    <section class="panel"><div class="ph"><h2>الدفعات المستلمة</h2><button class="btn blue sm" type="button" data-act="pay">+ دفعة</button></div>
      ${pays.length ? `<div class="tscroll"><table><thead><tr><th>التاريخ</th><th>الطالب</th><th class="num">المبلغ</th><th class="num">بالجنيه</th><th></th></tr></thead><tbody>${pays.map(p => `<tr><td>${fmtDate(p.date)}</td><td>${esc((sById(p.studentId) || {}).name || p.studentId)}</td><td class="num">${fmtN(p.amount)} ${esc(U.curName(p.currency))}</td><td class="num">${fmtN(p.egp != null ? p.egp : U.toEGP(D.rates, p.amount, p.currency))}</td><td><button class="linkbtn" type="button" data-act="delpay" data-id="${p.id}" aria-label="حذف الدفعة">حذف</button></td></tr>`).join('')}<tr class="total"><td colspan="3">المجموع</td><td class="num">${fmtN(M.collected)}</td><td></td></tr></tbody></table></div>` : '<div class="alert"><span>لم تُسجَّل دفعات في هذا الشهر.</span></div>'}
    </section>
  </div>
  <section class="panel" style="margin-top:14px"><div class="ph"><h2>مستحقات المعلمين · ${U.monthLabel(m)}</h2><label class="note" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="payAbsent" style="width:auto" ${D.main.payAbsent !== false ? 'checked' : ''} ${can.admin() ? '' : 'disabled'}> احتساب غياب الطالب دون عذر للمعلم</label></div>
    <div class="tscroll"><table><thead><tr><th>المعلم</th><th class="num">حصص</th><th class="num">ساعات</th><th class="num">أجر الساعة (ج.م)</th><th class="num">الأساسي</th><th class="num">مكافآت/خصومات</th><th class="num">الصافي</th><th class="num">المصروف</th><th class="num">المتبقي</th><th></th></tr></thead><tbody>${tRows}</tbody></table></div>
    <p class="note">الأساسي = ساعات الحصص المسجّلة (حضر وتأخر${D.main.payAbsent !== false ? ' وغاب' : ''}) × أجر الساعة، ومن نوع أجره «مبلغ الطالب كاملًا» فأساسيه كل ما دفعه طلابه في الشهر. الصافي = الأساسي + المكافآت − الخصومات. «اعتماد» يثبّت الصافي ويُظهره للمعلم معتمدًا، وإن تغيّر بعده يظهر تنبيه «تغيّر بعد الاعتماد».</p>
  </section>
  <div class="cols2" style="margin-top:14px">
    <section class="panel"><div class="ph"><h2>المصروفات</h2><button class="btn blue sm" type="button" data-act="expense">+ مصروف</button></div>
      ${exps.length ? `<div class="tscroll"><table><thead><tr><th>التاريخ</th><th>البند</th><th class="num">المبلغ</th><th></th></tr></thead><tbody>${exps.map(e => `<tr><td>${fmtDate(e.date)}</td><td>${esc(e.category)}${e.note ? '<br><span class="note">' + esc(e.note) + '</span>' : ''}</td><td class="num">${fmtN(e.amount)} ${esc(U.curName(e.currency))}</td><td><button class="linkbtn" type="button" data-act="delexp" data-id="${e.id}">حذف</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="alert"><span>لا مصروفات مسجّلة في هذا الشهر.</span></div>'}
    </section>
    <section class="panel"><h2>أسعار الصرف (بالجنيه المصري)</h2>
      <div class="three">${U.CUR.filter(c => c[0] !== 'EGP').map(([c, l]) => `<div class="field" style="margin:0"><label for="rate-${c}">${l}</label><input id="rate-${c}" type="number" step="0.01" min="0" inputmode="decimal" value="${U.rateOf(D.rates, c)}" data-rate="${c}"></div>`).join('')}</div>
      <p class="note">تُحفظ قيمة الدفعة بالجنيه وقت تسجيلها، فتغيير السعر لا يغيّر الدفعات السابقة.</p>
    </section>
  </div>`;
}
function openPayment(sid) {
  const opts = D.students.slice().sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  const s = sid ? sById(sid) : opts[0]; const b = (s && D.billing[s.id]) || {};
  openSheet(`<h2>تسجيل دفعة</h2><form id="pform" novalidate>
    <div class="field"><label for="p-s">الطالب</label><select id="p-s">${opts.map(x => `<option value="${x.id}" ${s && x.id === s.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
    <div class="three"><div class="field"><label for="p-amt">المبلغ</label><input id="p-amt" type="number" min="0" step="any" inputmode="decimal" value="${esc(b.fee || '')}"></div>
    <div class="field"><label for="p-cur">العملة</label><select id="p-cur">${U.CUR.map(([c, l]) => `<option value="${c}" ${(b.currency || 'USD') === c ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field"><label for="p-date">التاريخ</label><input id="p-date" type="date" value="${U.today()}"></div></div>
    <div class="field"><label style="display:flex;gap:8px;align-items:center"><input id="p-renew" type="checkbox" style="width:auto" checked> بدء باقة جديدة (يُصفَّر عدّاد الحصص${b.feeWith ? ' للإخوة المشتركين أيضًا' : ''})</label></div>
    <div class="field"><label for="p-note">ملاحظة</label><input id="p-note" placeholder="مثلًا: تحويل بنكي"></div>
    <p class="err" id="p-err" hidden></p>
    <div class="foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-act="close">إلغاء</button><button class="btn red" type="submit">حفظ الدفعة</button></div></div></form>`);
  $('p-s').onchange = () => { const bb = D.billing[$('p-s').value] || {}; $('p-amt').value = bb.fee || ''; $('p-cur').value = bb.currency || 'USD'; };
  $('pform').onsubmit = async e => {
    e.preventDefault(); const st = sById($('p-s').value), amt = Number($('p-amt').value), cur = $('p-cur').value, date = $('p-date').value || U.today();
    if (!amt) { $('p-err').textContent = 'اكتب المبلغ.'; $('p-err').hidden = false; return; }
    try {
      const rate = U.rateOf(D.rates, cur);
      await S.api.add('payments', { studentId: st.id, date, month: date.slice(0, 7), amount: amt, currency: cur, rate, egp: amt * rate, note: $('p-note').value.trim(), at: Date.now(), by: S.user.uid });
      if ($('p-renew').checked) {
        const bb = D.billing[st.id] || {};
        const group = bb.feeWith ? U.feeGroup(st, bb, D.students, D.billing) : [st.id];
        for (const id of group) {
          const x = D.billing[id] || {};
          const upd = x.paidThrough ? { cycleStart: x.paidThrough, cycleStartAt: 0, doneBefore: 0, paidThrough: addMonthDay(x.paidThrough) } : { cycleStart: date, cycleStartAt: Date.now(), doneBefore: 0 };
          await S.api.set('billing', id, upd, true);
        }
      }
      closeSheet(); toast('سُجّلت الدفعة'); await reload();
    } catch (x) { fail(x); }
  };
}
function addMonthDay(ds) { const [y, m, d] = ds.split('-').map(Number); const last = new Date(y, m + 1, 0).getDate(); return U.ymd(new Date(y, m, Math.min(d, last))); }
function openPayout(tid) {
  const x = duesOf(tid, S.month);
  openSheet(`<h2>صرف مستحقات ${esc(tName(tid))}</h2><p class="note" style="margin:-6px 0 12px">${U.monthLabel(S.month)} · المتبقي ${fmtN(x.due - x.paid)} ج.م</p><form id="oform" novalidate>
    <div class="two"><div class="field"><label for="o-amt">المبلغ (ج.م)</label><input id="o-amt" type="number" min="0" step="any" inputmode="decimal" value="${Math.max(0, Math.round(x.due - x.paid))}"></div>
    <div class="field"><label for="o-date">تاريخ الصرف</label><input id="o-date" type="date" value="${U.today()}"></div></div>
    <div class="field"><label for="o-note">ملاحظة</label><input id="o-note" placeholder="مثلًا: فودافون كاش"></div>
    <div class="foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-act="close">إلغاء</button><button class="btn red" type="submit">حفظ</button></div></div></form>`);
  $('oform').onsubmit = async e => { e.preventDefault(); const amt = Number($('o-amt').value); if (!amt) return toast('اكتب المبلغ'); try { await S.api.add('payouts', { teacherId: tid, month: S.month, amount: amt, date: $('o-date').value || U.today(), note: $('o-note').value.trim(), at: Date.now() }); closeSheet(); toast('سُجّل الصرف'); await reload(); } catch (x) { fail(x); } };
}
function openExpense() {
  openSheet(`<h2>مصروف جديد</h2><form id="eform" novalidate>
    <div class="field"><label for="e-cat">البند</label><select id="e-cat">${U.EXPENSE_CATS.map(c => `<option>${c}</option>`).join('')}</select></div>
    <div class="three"><div class="field"><label for="e-amt">المبلغ</label><input id="e-amt" type="number" min="0" step="any" inputmode="decimal"></div>
    <div class="field"><label for="e-cur">العملة</label><select id="e-cur">${U.CUR.map(([c, l]) => `<option value="${c}">${l}</option>`).join('')}</select></div>
    <div class="field"><label for="e-date">التاريخ</label><input id="e-date" type="date" value="${U.today()}"></div></div>
    <div class="field"><label for="e-note">تفاصيل</label><input id="e-note"></div>
    <div class="foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-act="close">إلغاء</button><button class="btn red" type="submit">حفظ</button></div></div></form>`);
  $('eform').onsubmit = async e => { e.preventDefault(); const amt = Number($('e-amt').value); if (!amt) return toast('اكتب المبلغ'); const cur = $('e-cur').value, date = $('e-date').value || U.today(); try { await S.api.add('expenses', { category: $('e-cat').value, amount: amt, currency: cur, egp: U.toEGP(D.rates, amt, cur), date, month: date.slice(0, 7), note: $('e-note').value.trim(), at: Date.now() }); closeSheet(); toast('حُفظ المصروف'); await reload(); } catch (x) { fail(x); } };
}

/* ================= STUDENTS ================= */
function viewStudents() {
  const q = S.q.trim();
  const rows = D.students.filter(s => (S.tf === 'all' || s.teacherId === S.tf) && (!q || s.name.includes(q))).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  return `<div class="bar"><h1 class="grow">الطلاب (${D.students.length})</h1><input id="sq" type="search" placeholder="ابحث بالاسم" value="${esc(S.q)}" style="max-width:220px"><select id="stf" style="max-width:200px"><option value="all">كل المعلمين</option>${Object.entries(D.teachers).map(([id, t]) => `<option value="${id}" ${S.tf === id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>${can.sup() ? '<button class="btn red" type="button" data-act="addst">+ طالب جديد</button>' : ''}</div>
  ${rows.length ? `<div class="cards">${rows.map(s => { const c = monthCounts(s.id, U.thisMonth()); const lr = lastReport(s.id); const b = D.billing[s.id] || {}; return `<article class="card">
    <div class="row"><div class="who"><b>${esc(s.name)}</b><span>${esc(tName(s.teacherId))} · ${U.slotsOf(s).slice().sort((a, x) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(x.day)).map(U.slotText).join('، ') || 'بلا مواعيد'} (بتوقيت ${esc(U.zoneName(U.sTz(s)))})</span></div>${can.sup() ? `<button class="linkbtn" type="button" data-act="editst" data-sid="${s.id}">تعديل</button>` : ''}</div>
    <div class="chips">${U.isPaused(s) ? chip(s.pausedUntil ? 'إجازة حتى ' + fmtDate(s.pausedUntil) : 'متوقف', 'exc') : ''}${chip('في ' + U.zoneName(U.kTz(s)))}${pkgChip(s)}${b.fee ? chip(fmtN(b.fee) + ' ' + U.curName(b.currency) + (b.feeWith ? ' مع ' + b.feeWith : '')) : ''}</div>
    <div class="chips">${chip('حضر ' + (c.present + c.late), 'ok')}${c.absent ? chip('غاب ' + c.absent, 'miss') : ''}${c.excused ? chip('اعتذر ' + c.excused, 'exc') : ''}<span class="note">هذا الشهر</span></div>
    ${lr ? `<div class="rep"><span><b>آخر تسميع:</b> ${esc(lr.newMem || '—')} · ${fmtDate(lr.date)}</span>${lr.homework ? `<span><b>الواجب:</b> ${esc(lr.homework)}</span>` : ''}</div>` : '<span class="note">لا تقارير بعد.</span>'}
    ${s.parentName || s.contact ? `<span class="sub">ولي الأمر: ${esc(s.parentName || '')} ${s.contact ? '· <span dir="ltr">' + esc(s.contact) + '</span>' : ''}</span>` : ''}
    ${can.staff() ? (() => { const cs = D.contacts.filter(c => c.studentId === s.id); const dueC = cs.filter(c => c.next && !c.done && c.next <= U.today()).length; return `<div class="chips"><button class="btn ghost sm" type="button" data-act="ctlog" data-sid="${s.id}">سجل التواصل مع الأهل${cs.length ? ' (' + cs.length + ')' : ''}</button>${dueC ? chip('متابعة مستحقة', 'warn') : ''}</div>`; })() : ''}
  </article>`; }).join('')}</div>` : '<div class="empty">لا طلاب مطابقون.</div>'}`;
}
function openStudent(sid) {
  const s = sid ? sById(sid) : {}; const b = (sid && D.billing[sid]) || {}; const billing = can.acc();
  const zo = sel => U.ZONES.map(([v, l]) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${l}</option>`).join('');
  openSheet(`<h2>${sid ? 'تعديل بيانات ' + esc(s.name) : 'طالب جديد'}</h2><form id="sform" novalidate>
    <div class="two"><div class="field"><label for="f-name">اسم الطالب</label><input id="f-name" value="${esc(s.name || '')}"></div>
    <div class="field"><label for="f-t">المعلم</label><select id="f-t">${Object.entries(D.teachers).map(([id, t]) => `<option value="${id}" ${s.teacherId === id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></div></div>
    <div class="two"><div class="field"><label for="f-pn">اسم ولي الأمر</label><input id="f-pn" value="${esc(s.parentName || '')}"></div>
    <div class="field"><label for="f-c">واتساب ولي الأمر</label><input id="f-c" dir="ltr" value="${esc(s.contact || '')}" placeholder="+90 5xx"></div></div>
    <div class="two"><div class="field"><label for="f-stz">المواعيد بتوقيت</label><select id="f-stz">${zo(s.schedTz || 'Africa/Cairo')}</select></div>
    <div class="field"><label for="f-ktz">الطالب يعيش في</label><select id="f-ktz">${zo(s.studentTz || 'Europe/Istanbul')}</select></div></div>
    <div class="field"><span class="lab">أيام الحلقة وساعتها</span>${DAY_ORDER.map(d => { const x = U.slotsOf(s).find(v => v.day === d); return `<div class="slot"><label class="pills"><input type="checkbox" id="f-d-${d}" ${x ? 'checked' : ''}><span>${DAYS[d]}</span></label><input type="time" id="f-tm-${d}" value="${esc(x ? x.time : '')}" aria-label="ساعة ${DAYS[d]}"><label class="rv"><input type="checkbox" id="f-r-${d}" ${x && x.review ? 'checked' : ''}>مراجعة</label></div>`; }).join('')}</div>
    <div class="three"><div class="field"><label for="f-dur">المدة (دقيقة)</label><input id="f-dur" type="number" min="10" step="5" value="${esc(s.duration || 30)}"></div>
    <div class="field"><label for="f-since">بدأ في</label><input id="f-since" type="date" value="${esc(s.since || U.today())}"></div>
    <div class="field"><label for="f-pause">إجازة حتى</label><input id="f-pause" type="date" value="${esc(s.pausedUntil || '')}"></div></div>
    <div class="field"><label for="f-link">رابط الحلقة (إن اختلف عن غرفة المعلم)</label><input id="f-link" dir="ltr" value="${esc(s.link || '')}"></div>
    ${billing ? `<h2 style="margin:6px 0 10px">الباقة والرسوم</h2>
    <div class="three"><div class="field"><label for="b-q">حصص الباقة</label><input id="b-q" type="number" min="0" value="${esc(b.quota || '')}"></div>
    <div class="field"><label for="b-fee">الرسوم</label><input id="b-fee" type="number" min="0" step="any" value="${esc(b.fee || '')}"></div>
    <div class="field"><label for="b-cur">العملة</label><select id="b-cur">${U.CUR.map(([c, l]) => `<option value="${c}" ${(b.currency || 'USD') === c ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
    <div class="three"><div class="field"><label for="b-with">مشترك في الرسوم مع</label><input id="b-with" value="${esc(b.feeWith || '')}" placeholder="اسم الأخ/الأخت"></div>
    <div class="field"><label for="b-pt">مدفوع حتى (للاشتراك الشهري)</label><input id="b-pt" type="date" value="${esc(b.paidThrough || '')}"></div>
    <div class="field"><label for="b-done">حصص منتهية قبل البوابة</label><input id="b-done" type="number" min="0" value="${esc(b.doneBefore || 0)}"></div></div>
    <div class="field"><label style="display:flex;gap:8px;align-items:center"><input id="b-free" type="checkbox" style="width:auto" ${b.free ? 'checked' : ''}> بدون رسوم</label></div>` : '<p class="note">الرسوم والباقة يعدّلها قسم الحسابات.</p>'}
    <div class="field"><label for="f-notes">ملاحظات داخلية</label><textarea id="f-notes" rows="2">${esc(s.notes || '')}</textarea></div>
    <p class="err" id="f-err" hidden></p>
    <div class="foot">${sid && can.admin() ? `<button class="btn ghost" type="button" data-act="delst" data-sid="${sid}" style="color:var(--crimson)">حذف الطالب</button>` : '<span></span>'}<div class="actions"><button class="btn ghost" type="button" data-act="close">إلغاء</button><button class="btn red" type="submit">حفظ</button></div></div></form>`);
  DAY_ORDER.forEach(d => $('f-tm-' + d).addEventListener('input', () => { if ($('f-tm-' + d).value) $('f-d-' + d).checked = true; }));
  $('sform').onsubmit = async e => {
    e.preventDefault(); const err = $('f-err'); const name = $('f-name').value.trim();
    const days = DAY_ORDER.filter(d => $('f-d-' + d).checked);
    const bad = !name ? 'اكتب اسم الطالب.' : !Object.keys(D.teachers).length ? 'أضف معلمًا أولًا من تبويب «المعلمون».' : !days.length ? 'اختر يوم حلقة واحدًا على الأقل.' : days.find(d => !$('f-tm-' + d).value) !== undefined ? 'اكتب ساعة كل يوم مختار.' : '';
    if (bad) { err.textContent = bad; err.hidden = false; return; }
    const id = sid || uniqueId(U.slug(name), D.students.map(x => x.id));
    const body = { name, teacherId: $('f-t').value, parentName: $('f-pn').value.trim(), contact: $('f-c').value.trim(), schedTz: $('f-stz').value, studentTz: $('f-ktz').value,
      slots: days.map(d => { const o = { day: d, time: $('f-tm-' + d).value }; if ($('f-r-' + d).checked) o.review = true; return o; }),
      duration: Number($('f-dur').value) || 30, since: $('f-since').value || U.today(), pausedUntil: $('f-pause').value || '', link: $('f-link').value.trim(), notes: $('f-notes').value.trim(), updatedAt: Date.now() };
    try {
      await S.api.set('students', id, body, true);
      if (billing) await S.api.set('billing', id, { quota: Number($('b-q').value) || 0, fee: Number($('b-fee').value) || 0, currency: $('b-cur').value, feeWith: $('b-with').value.trim(), paidThrough: $('b-pt').value || '', doneBefore: Number($('b-done').value) || 0, free: $('b-free').checked, ...(sid && D.billing[sid] ? {} : { cycleStart: U.today(), cycleStartAt: Date.now() }) }, true);
      // keep teacherId on existing records in step with the student's teacher
      if (sid && s.teacherId !== body.teacherId) toast('تنبيه: السجلات السابقة تبقى باسم المعلم القديم');
      closeSheet(); toast(sid ? 'حُفظ التعديل' : 'أُضيف ' + name); await reload();
    } catch (x) { fail(x); }
  };
}
const uniqueId = (base, taken) => { let id = base, i = 2; while (taken.includes(id)) id = base + '-' + i++; return id; };
let armedDel = null;
async function deleteStudent(sid, btn) {
  if (armedDel !== sid) { armedDel = sid; btn.textContent = 'اضغط مرة أخرى للتأكيد'; return; }
  armedDel = null;
  try { await S.api.del('students', sid); await S.api.del('billing', sid).catch(() => { }); closeSheet(); toast('حُذف الطالب. سجلات حضوره تبقى للحسابات'); await reload(); } catch (x) { fail(x); }
}

/* ================= REGISTRATIONS (from the public site) ================= */
const REG_ST = { new: ['جديد', 'miss'], contacted: ['تم التواصل', 'late'], trial: ['حُجزت الحصة التعريفية', 'tab'], enrolled: ['اشترك', 'ok'], lost: ['لم يكمل', 'exc'] };
const REG_COURSE = { quran: 'القرآن الكريم', tajweed: 'التجويد', arabic: 'اللغة العربية' };
const REG_TIME = { morning: 'صباحًا (8 - 12)', noon: 'ظهرًا (12 - 4)', evening: 'مساءً (4 - 8)', night: 'ليلًا (8 - 11)' };
const SITE_URL = 'https://rattelquran.github.io/silah/';
function viewRegs() {
  const all = D.regs.slice().sort((a, b) => (b.at || 0) - (a.at || 0));
  const isOpen = r => ['new', 'contacted', 'trial'].includes(r.status || 'new');
  const list = all.filter(r => S.rf === 'all' || (S.rf === 'open' ? isOpen(r) : (r.status || 'new') === S.rf));
  const n = k => all.filter(r => (r.status || 'new') === k).length;
  const pill = (k, l) => `<button class="btn ${S.rf === k ? 'blue' : 'ghost'} sm" type="button" data-act="rf" data-k="${k}">${l}</button>`;
  const card = r => {
    const st = REG_ST[r.status || 'new'] || REG_ST.new; const wl = U.waLink(r.whatsapp);
    const hello = `السلام عليكم ${r.parentName || ''}، معك أكاديمية صلة 🌿 وصلنا طلبك لحصة تعريفية مجانية لـ${r.studentName || 'طفلك'} في ${REG_COURSE[r.course] || 'القرآن الكريم'}. متى يناسبك موعد الحصة؟`;
    return `<article class="card">
    <div class="row"><div class="who"><b>${esc(r.studentName || '—')}${r.studentAge ? ' · ' + esc(r.studentAge) + ' سنوات' : ''}</b><span>ولي الأمر: ${esc(r.parentName || '—')}${r.country ? ' · ' + esc(r.country) : ''}</span></div>${chip(st[0], st[1])}</div>
    <div class="chips">${chip(REG_COURSE[r.course] || r.course || '—')}${chip('التواصل: ' + (REG_TIME[r.preferredTime] || r.preferredTime || '—'))}${r.at ? chip(fmtDate(new Date(r.at).toISOString().slice(0, 10))) : ''}</div>
    ${r.notes ? `<span class="sub">${esc(r.notes)}</span>` : ''}
    <div class="bar" style="margin:0">${wl ? `<a class="btn wa sm" href="${wl}?text=${encodeURIComponent(hello)}" target="_blank" rel="noopener">واتساب <span dir="ltr">${esc(r.whatsapp)}</span></a>` : `<span class="note" dir="ltr">${esc(r.whatsapp || '')}</span>`}
      <label class="note" style="display:flex;gap:6px;align-items:center">الحالة <select data-regst="${r.id}" style="width:auto">${Object.entries(REG_ST).map(([k, [l]]) => `<option value="${k}" ${(r.status || 'new') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <button class="btn ghost sm" type="button" data-act="regst" data-id="${r.id}">إضافة كطالب</button>
      ${can.admin() ? `<button class="linkbtn" type="button" data-act="delreg" data-id="${r.id}">حذف</button>` : ''}</div></article>`;
  };
  return `<div class="bar"><h1 class="grow">طلبات التسجيل</h1><a class="btn ghost sm" href="${SITE_URL}" target="_blank" rel="noopener">فتح موقع صلة</a></div>
  <div class="bar">${pill('open', 'قيد المتابعة (' + all.filter(isOpen).length + ')')}${Object.entries(REG_ST).map(([k, [l]]) => pill(k, l + ' (' + n(k) + ')')).join('')}${pill('all', 'الكل (' + all.length + ')')}</div>
  ${list.length ? `<div class="cards">${list.map(card).join('')}</div>` : `<div class="empty">${all.length ? 'لا طلبات في هذا التصنيف.' : 'لا طلبات بعد. تصل هنا تلقائيًا من نموذج «احجزي حصة تعريفية» في موقع صلة.'}</div>`}
  <p class="note" style="margin-top:12px">كل طلب يُرسل من نموذج الموقع يظهر هنا بحالة «جديد». تواصلي مع الأهل من زر واتساب، ثم غيّري الحالة. «إضافة كطالب» تفتح نموذج طالب جديد بالاسم ورقم ولي الأمر.</p>`;
}
async function setRegStatus(id, status) {
  try { await S.api.set('registrations', id, { status, updatedAt: Date.now() }, true); const r = D.regs.find(x => x.id === id); if (r) r.status = status; toast('حُدّثت الحالة'); render(); } catch (x) { fail(x); }
}
function regToStudent(id) {
  const r = D.regs.find(x => x.id === id); if (!r) return;
  openStudent(null);
  const put = (k, v) => { const el = $(k); if (el && v) el.value = v; };
  put('f-name', r.studentName); put('f-pn', r.parentName); put('f-c', r.whatsapp);
}

/* ================= TEACHERS ================= */
function viewTeachers() {
  const m = U.thisMonth();
  return `<div class="bar"><h1 class="grow">المعلمون</h1><button class="btn red" type="button" data-act="addt">+ معلم</button></div>
  ${Object.keys(D.teachers).length ? `<div class="cards">${Object.entries(D.teachers).map(([id, t]) => { const x = duesOf(id, m); const st = D.students.filter(s => s.teacherId === id); return `<article class="card">
    <div class="row"><div class="who"><b>${esc(t.name)}</b><span>${esc(t.section || '')} · ${st.length} طالب</span></div><button class="linkbtn" type="button" data-act="editt" data-t="${id}">تعديل</button></div>
    <div class="chips">${payLbl(x) ? chip(payLbl(x)) : chip('أجر الساعة غير محدد', 'warn')}${chip(x.sessions + ' حصة هذا الشهر')}${chip('مستحق ' + fmtN(x.due) + ' ج.م')}</div>
    ${U.safeLink(t.room) ? `<a class="btn ghost sm" href="${esc(U.safeLink(t.room))}" target="_blank" rel="noopener" style="align-self:flex-start">الغرفة الثابتة</a>` : ''}
    <span class="sub">${st.map(s => esc(s.name)).join('، ')}</span></article>`; }).join('')}</div>` : '<div class="empty">لا معلمين بعد. أضف أول معلم، أو انقل بيانات رتّل من تبويب «الصلاحيات والنقل».</div>'}`;
}
function openTeacher(tid) {
  const t = tid ? D.teachers[tid] : {}; const r = (tid && D.tRates[tid]) || {};
  openSheet(`<h2>${tid ? 'تعديل ' + esc(t.name) : 'معلم جديد'}</h2><form id="tform" novalidate>
    <div class="two"><div class="field"><label for="t-name">الاسم</label><input id="t-name" value="${esc(t.name || '')}"></div>
    <div class="field"><label for="t-sec">القسم</label><input id="t-sec" value="${esc(t.section || '')}" placeholder="مثلًا: قسم البنات"></div></div>
    <div class="two"><div class="field"><label for="t-room">رابط الغرفة الثابتة</label><input id="t-room" dir="ltr" value="${esc(t.room || '')}"></div>
    <div class="field"><label for="t-mode">نوع الأجر</label><select id="t-mode"><option value="hour" ${r.mode !== 'full' ? 'selected' : ''}>بالساعة</option><option value="full" ${r.mode === 'full' ? 'selected' : ''}>مبلغ الطالب كاملًا (صاحب الأكاديمية)</option></select></div></div>
    <div class="two"><div class="field" id="t-rate-f" ${r.mode === 'full' ? 'hidden' : ''}><label for="t-rate">أجر الساعة (ج.م)</label><input id="t-rate" type="number" min="0" step="any" value="${esc(r.hourRate || '')}"></div></div>
    <div class="foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-act="close">إلغاء</button><button class="btn red" type="submit">حفظ</button></div></div></form>`);
  $('t-mode').onchange = () => { $('t-rate-f').hidden = $('t-mode').value === 'full'; };
  $('tform').onsubmit = async e => {
    e.preventDefault(); const name = $('t-name').value.trim(); if (!name) return toast('اكتب اسم المعلم');
    const id = tid || uniqueId(U.slug(name), Object.keys(D.teachers));
    try { await S.api.set('teachers', id, { name, section: $('t-sec').value.trim(), room: $('t-room').value.trim() }); await S.api.set('teacherRates', id, { hourRate: Number($('t-rate').value) || 0, mode: $('t-mode').value }); closeSheet(); toast('حُفظ'); await reload(); } catch (x) { fail(x); }
  };
}

/* ================= PEOPLE & MIGRATION ================= */
function viewPeople() {
  const byEmail = Object.fromEntries(D.users.map(u => [String(u.email || '').toLowerCase(), u]));
  const people = D.invites.map(i => ({ ...i, email: i.id, user: byEmail[i.id] }));
  D.users.filter(u => !D.invites.some(i => i.id === String(u.email || '').toLowerCase())).forEach(u => people.push({ email: u.email, name: u.name, role: u.role, teacherId: u.teacherId, studentIds: u.studentIds, user: u, owner: true }));
  const who = p => p.role === 'teacher' ? tName(p.teacherId) : p.role === 'parent' ? (p.studentIds || []).map(id => (sById(id) || {}).name || id).join('، ') : '';
  return `<div class="bar"><h1 class="grow">الصلاحيات</h1><button class="btn red" type="button" data-act="invite">+ إضافة شخص</button></div>
  <section class="panel"><p class="note">أضف بريد كل شخص ودوره. يدخل بحساب Google أو برابط يصل إلى بريده، ولا يرى إلا ما يسمح به دوره: ولي الأمر يرى أبناءه فقط، والمعلم طلابه فقط بلا أي مبالغ.</p>
  <div class="tscroll"><table><thead><tr><th>الاسم</th><th>البريد</th><th>الدور</th><th>مرتبط بـ</th><th>الحالة</th><th></th></tr></thead><tbody>
  ${people.map(p => `<tr><td><b>${esc(p.name || '—')}</b></td><td dir="ltr" style="text-align:start">${esc(p.email)}</td><td>${chip(U.ROLES[p.role] || p.role)}</td><td>${esc(who(p) || '—')}</td><td>${p.user ? chip('دخل البوابة', 'ok') : chip('لم يدخل بعد', 'warn')}</td><td>${p.owner ? '' : `<button class="linkbtn" type="button" data-act="editinv" data-e="${esc(p.email)}">تعديل</button>`}</td></tr>`).join('') || '<tr><td colspan="6" class="note">لا أحد بعد.</td></tr>'}
  </tbody></table></div></section>
  <section class="panel" style="margin-top:14px"><h2>نقل بيانات دفتر رتّل</h2>
    <p class="note">اختر ملف <b dir="ltr">rattel-export.json</b> من مجلد migration. يُنقل المعلمون وأجورهم، والطلاب، والباقات، والحضور، والتقارير. النقل يستبدل السجلات التي تحمل نفس المعرّف ولا يحذف غيرها.</p>
    <div class="actions"><input id="impFile" type="file" accept=".json,application/json" style="max-width:320px"><button class="btn blue" type="button" data-act="import" id="impBtn" disabled>نقل البيانات</button></div>
    <p class="note" id="impInfo"></p>
  </section>`;
}
function openInvite(email) {
  const p = email ? (D.invites.find(i => i.id === email) || {}) : {};
  openSheet(`<h2>${email ? 'تعديل الصلاحية' : 'إضافة شخص'}</h2><form id="iform" novalidate>
    <div class="two"><div class="field"><label for="i-name">الاسم</label><input id="i-name" value="${esc(p.name || '')}"></div>
    <div class="field"><label for="i-email">البريد الإلكتروني</label><input id="i-email" type="email" dir="ltr" value="${esc(email || '')}" ${email ? 'readonly' : ''}></div></div>
    <div class="field"><span class="lab">الدور</span><div class="pills">${Object.entries(U.ROLES).map(([r, l]) => `<label><input type="radio" name="i-role" value="${r}" ${(p.role || 'parent') === r ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
    <div class="field" id="i-tw"><label for="i-t">المعلم المرتبط</label><select id="i-t">${Object.entries(D.teachers).map(([id, t]) => `<option value="${id}" ${p.teacherId === id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></div>
    <div class="field" id="i-sw"><span class="lab">أبناؤه</span><div class="pills">${D.students.slice().sort((a, b) => a.name.localeCompare(b.name, 'ar')).map(s => `<label><input type="checkbox" name="i-s" value="${s.id}" ${(p.studentIds || []).includes(s.id) ? 'checked' : ''}><span>${esc(s.name)}</span></label>`).join('')}</div></div>
    <p class="err" id="i-err" hidden></p>
    <div class="foot">${email ? '<button class="btn ghost" type="button" data-act="delinv" style="color:var(--crimson)">إلغاء الوصول</button>' : '<span></span>'}<div class="actions"><button class="btn ghost" type="button" data-act="close">إلغاء</button><button class="btn red" type="submit">حفظ</button></div></div></form>`);
  const sync = () => { const r = document.querySelector('input[name="i-role"]:checked').value; $('i-tw').hidden = r !== 'teacher'; $('i-sw').hidden = r !== 'parent'; };
  document.querySelectorAll('input[name="i-role"]').forEach(x => x.onchange = sync); sync();
  $('iform').onsubmit = async e => {
    e.preventDefault();
    const em = $('i-email').value.trim().toLowerCase(), r = document.querySelector('input[name="i-role"]:checked').value;
    const sids = [...document.querySelectorAll('input[name="i-s"]:checked')].map(x => x.value);
    const bad = !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em) ? 'اكتب بريدًا صحيحًا.' : r === 'teacher' && !$('i-t').value ? 'أضف المعلم أولًا من تبويب «المعلمون».' : r === 'parent' && !sids.length ? 'اختر طفلًا واحدًا على الأقل.' : '';
    if (bad) { $('i-err').textContent = bad; $('i-err').hidden = false; return; }
    const inv = { name: $('i-name').value.trim(), role: r, teacherId: r === 'teacher' ? $('i-t').value : '', studentIds: r === 'parent' ? sids : [], at: Date.now() };
    try {
      await S.api.set('invites', em, inv);
      const u = D.users.find(x => String(x.email || '').toLowerCase() === em);
      if (u) await S.api.set('users', u.id, { role: inv.role, teacherId: inv.teacherId, studentIds: inv.studentIds, name: inv.name || u.name }, true);
      closeSheet(); toast('حُفظت الصلاحية'); await reload();
    } catch (x) { fail(x); }
  };
}
async function deleteInvite(em, btn) {
  if (btn.dataset.armed !== '1') { btn.dataset.armed = '1'; btn.textContent = 'اضغط مرة أخرى للتأكيد'; return; }
  try { await S.api.del('invites', em); const u = D.users.find(x => String(x.email || '').toLowerCase() === em); if (u) await S.api.del('users', u.id); closeSheet(); toast('أُلغي الوصول'); await reload(); } catch (x) { fail(x); }
}
let impData = null;
function onImportFile(f) {
  const info = $('impInfo'); impData = null; $('impBtn').disabled = true;
  const r = new FileReader();
  r.onload = () => {
    try {
      const j = JSON.parse(r.result);
      if (!Array.isArray(j.students) || !Array.isArray(j.teachers)) throw new Error('shape');
      impData = j; $('impBtn').disabled = false;
      info.textContent = `جاهز للنقل: ${j.teachers.length} معلمين، ${j.students.length} طالبًا، ${(j.attendance || []).length} سجل حضور، ${(j.reports || []).length} تقريرًا، ${(j.payments || []).length} دفعة.`;
    } catch (e) { info.textContent = 'الملف ليس ملف نقل من دفتر رتّل.'; }
  };
  r.readAsText(f);
}
async function runImport() {
  const j = impData; if (!j) return; $('impBtn').disabled = true; $('impInfo').textContent = 'جارٍ النقل…';
  const ops = [];
  const put = (c, x) => { const { id, ...data } = x; ops.push({ c, id, data }); };
  j.teachers.forEach(t => put('teachers', { id: t.id, name: t.name, section: (j.sections || {})[t.section] || t.section || '', room: t.room || '' }));
  Object.entries(j.teacherRates || {}).forEach(([id, v]) => put('teacherRates', { id, hourRate: v }));
  j.students.forEach(s => put('students', s));
  (j.billing || []).forEach(b => put('billing', b));
  (j.attendance || []).forEach(a => put('attendance', a));
  (j.reports || []).forEach(a => put('reports', a));
  (j.payments || []).forEach(p => put('payments', { ...p, egp: U.toEGP(D.rates, p.amount, p.currency) }));
  if (j.settings && j.settings.supervisor) ops.push({ c: 'settings', id: 'main', data: { ...D.main, supervisor: j.settings.supervisor } });
  try { await S.api.batch(ops); toast('نُقلت ' + ops.length + ' سجلات'); impData = null; await reload(); } catch (x) { fail(x); $('impBtn').disabled = false; }
}

/* ================= TEACHER ================= */
function viewMine() {
  const list = sessionsOn(S.date);
  const t = D.teachers[S.prof.teacherId] || {};
  return `<div class="bar"><h1 class="grow">حلقاتي${t.name ? ' · ' + esc(t.name) : ''}</h1>${dayNav()}</div>
  ${U.safeLink(t.room) ? `<div class="bar"><a class="btn blue" href="${esc(U.safeLink(t.room))}" target="_blank" rel="noopener">دخول غرفتي الثابتة</a></div>` : ''}
  ${list.length ? `<div class="cards">${list.map(o => sessionCard(o)).join('')}</div>` : '<div class="empty">لا حلقات لك في هذا اليوم.</div>'}
  <p class="note" style="margin-top:12px">اضغط حالة الحضور مرة لتسجيلها ومرة ثانية لإلغائها. بعد كل حصة اكتب التقرير، ثم انسخ رسالة الأهل وأرسلها على واتساب.</p>`;
}
function viewMyMonth() {
  const tid = S.prof.teacherId, m = S.month, x = duesOf(tid, m);
  const pays = D.payouts.filter(p => p.month === m);
  return `<div class="bar"><h1 class="grow">شهري ومستحقاتي</h1>${monthNav()}</div>
  <div class="kpis">${kpi('حصص محتسبة', x.sessions, x.hours.toFixed(1) + ' ساعة')}${x.full ? kpi('نوع الأجر', 'مبلغ الطالب كاملًا', 'تحسبه الحسابات من دفعات طلابك') : kpi('أجر الساعة', x.rate ? fmtN(x.rate) + ' ج.م' : '—', 'تحدده الحسابات')}${x.full ? kpi('ما صُرف لك', fmtN(x.paid) + ' ج.م', U.monthLabel(m)) : kpi('المستحق', fmtN(x.due) + ' ج.م', (x.bonus ? 'مكافآت +' + fmtN(x.bonus) + ' · ' : '') + (x.deduction ? 'خصومات −' + fmtN(x.deduction) + ' · ' : '') + 'صُرف ' + fmtN(x.paid) + ' ج.م') + kpi('المتبقي', fmtN(x.due - x.paid) + ' ج.م', x.approved ? (Math.round(x.due) === Number(x.approved.total) ? 'معتمد من الحسابات' : 'تغيّر بعد الاعتماد · بانتظار إعادة الاعتماد') : 'لم يُعتمد بعد', x.due - x.paid > 0 ? 'red' : 'ok')}</div>
  ${D.adj.filter(a => a.month === m).length ? `<section class="panel" style="margin-bottom:14px"><h2>مكافآت وخصومات ${U.monthLabel(m)}</h2>${D.adj.filter(a => a.month === m).map(a => `<div class="alert ${a.kind === 'deduction' ? 'red' : ''}"><span><b>${a.kind === 'deduction' ? '−' : '+'} ${fmtN(a.amount)} ج.م</b> · ${esc(a.reason || '')}</span></div>`).join('')}</section>` : ''}
  <section class="panel"><h2>طلابي هذا الشهر</h2>${legend()}
  ${D.students.map(s => `<div class="grid" style="gap:6px;padding:8px 0;border-bottom:1px solid var(--line)"><div class="row"><b>${esc(s.name)}</b><div class="chips">${mrChip(mrOf(s.id, m))}<button class="btn ghost sm" type="button" data-act="mrep" data-sid="${s.id}">التقرير الشهري</button></div></div>${dotsFor(s, m)}</div>`).join('') || '<p class="note">لا طلاب.</p>'}</section>
  ${pays.length ? `<section class="panel" style="margin-top:14px"><h2>ما صُرف لك</h2>${pays.map(p => `<div class="alert"><span><b>${fmtN(p.amount)} ج.م</b> · ${fmtDate(p.date)}${p.note ? ' · ' + esc(p.note) : ''}</span></div>`).join('')}</section>` : ''}`;
}

/* ================= PARENT ================= */
function viewKids() {
  if (!D.students.length) return '<div class="empty">لم يُربط بحسابك أي طالب بعد. تواصل مع إدارة الأكاديمية.</div>';
  const m = S.month;
  return `<div class="bar"><h1 class="grow">متابعة أبنائي</h1>${monthNav()}</div>
  <div class="grid">${D.students.map(s => {
    const nx = U.nextOccurrence(s, U.kTz(s)); const p = pkg(s); const c = monthCounts(s.id, m);
    const reps = D.reports.filter(r => r.studentId === s.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    const pays = D.payments.filter(x => x.studentId === s.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
    return `<section class="panel">
      <div class="ph"><h2>${esc(s.name)}</h2><span class="sub">المعلم: ${esc(tName(s.teacherId))}</span></div>
      <div class="kpis" style="margin:0">
        ${kpi('الحصة القادمة', nx ? fmtTime(U.localTime(nx.ms, U.kTz(s))) : '—', nx ? DAYS[U.parse(U.localDate(nx.ms, U.kTz(s))).getDay()] + ' ' + fmtDate(U.localDate(nx.ms, U.kTz(s))) + ' · بتوقيت ' + U.zoneName(U.kTz(s)) : U.isPaused(s) ? 'في إجازة' : 'لا مواعيد')}
        ${kpi('الحضور في ' + U.monthLabel(m), (c.present + c.late) + ' حصة', (c.absent ? 'غاب ' + c.absent + ' · ' : '') + (c.excused ? 'اعتذر ' + c.excused : ''))}
        ${p ? kpi('الباقة', p.monthly ? (p.q ? p.done + ' من ' + p.q : '—') : p.done + ' من ' + p.q, p.txt, p.cls === 'miss' ? 'red' : '') : ''}
      </div>
      ${legend()}${dotsFor(s, m)}
      ${(() => { const up = D.makeups.filter(k => k.studentId === s.id && k.date >= U.today()).sort((a, b) => a.date.localeCompare(b.date)); return up.length ? `<div class="chips">${up.map(k => { const ms = U.wallToMs(k.date, k.time || '00:00', ACAD_TZ); return chip('حصة تعويضية: ' + fmtDay(U.localDate(ms, U.kTz(s))) + ' ' + fmtTime(U.localTime(ms, U.kTz(s))) + ' بتوقيت ' + U.zoneName(U.kTz(s)), 'res'); }).join('')}</div>` : ''; })()}
      ${monthlyForParent(s)}
      <h3 style="font-size:1rem">آخر تقارير الحصص</h3>
      ${reps.length ? reps.map(r => `<div class="rep"><b>${fmtDay(r.date)}${r.rating ? ' · ' + esc(r.rating) : ''}</b>${r.newMem ? `<span>الحفظ الجديد: ${esc(r.newMem)}</span>` : ''}${r.review ? `<span>المراجعة: ${esc(r.review)}</span>` : ''}${r.homework ? `<span>الواجب: <b>${esc(r.homework)}</b></span>` : ''}${r.notes ? `<span>ملاحظة المعلم: ${esc(r.notes)}</span>` : ''}</div>`).join('') : '<p class="note">لا تقارير بعد.</p>'}
      ${U.safeLink(s.link || (D.teachers[s.teacherId] || {}).room) ? `<a class="btn red" style="align-self:flex-start" href="${esc(U.safeLink(s.link || (D.teachers[s.teacherId] || {}).room))}" target="_blank" rel="noopener">دخول الحلقة</a>` : ''}
      ${pays.length ? `<h3 style="font-size:1rem">الدفعات</h3><div class="chips">${pays.map(x => chip(fmtDate(x.date) + ' · ' + fmtN(x.amount) + ' ' + U.curName(x.currency), 'ok')).join('')}</div>` : ''}
    </section>`; }).join('')}</div>`;
}

/* ================= 1. MONTHLY REPORTS (teacher writes → supervisor approves → parent reads) ================= */
const MR_ST = { draft: ['مسودة', 'exc'], submitted: ['بانتظار اعتماد المشرفة', 'late'], published: ['منشور لولي الأمر', 'ok'] };
const mrOf = (sid, m) => D.monthly.find(r => r.studentId === sid && r.month === m);
const mrChip = r => { const st = MR_ST[(r && r.status) || ''] || ['لم يُكتب', 'warn']; return chip(st[0], st[1]); };
function mrStats(sid, m) { const c = monthCounts(sid, m); return { came: c.present + c.late, absent: c.absent, excused: c.excused + (c.tabsent || 0) + (c.resched || 0) }; }
function viewMonthly() {
  const m = S.month;
  const rows = D.students.filter(s => S.tf === 'all' || s.teacherId === S.tf).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  const n = k => rows.filter(s => ((mrOf(s.id, m) || {}).status || 'none') === k).length;
  return `<div class="bar"><h1 class="grow">التقارير الشهرية</h1>${monthNav()}</div>
  <div class="bar"><select id="stf" style="max-width:220px"><option value="all">كل المعلمين</option>${Object.entries(D.teachers).map(([id, t]) => `<option value="${id}" ${S.tf === id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
    <div class="chips">${chip('بانتظار الاعتماد ' + n('submitted'), 'late')}${chip('منشور ' + n('published'), 'ok')}${chip('مسودة ' + n('draft'), 'exc')}${chip('لم يُكتب ' + n('none'), 'warn')}</div></div>
  ${rows.length ? `<div class="cards">${rows.map(s => { const r = mrOf(s.id, m); const st = mrStats(s.id, m); return `<article class="card">
    <div class="row"><div class="who"><b>${esc(s.name)}</b><span>${esc(tName(s.teacherId))} · حضر ${st.came}${st.absent ? ' · غاب ' + st.absent : ''}</span></div>${mrChip(r)}</div>
    ${r && r.achieved ? `<span class="sub">${esc(r.achieved)}</span>` : ''}
    <div class="bar" style="margin:0"><button class="btn ${r && r.status === 'submitted' ? 'red' : 'ghost'} sm" type="button" data-act="mrep" data-sid="${s.id}">${r && r.status === 'submitted' ? 'مراجعة واعتماد' : r ? 'فتح التقرير' : 'كتابة التقرير'}</button>
    ${r && r.status === 'published' ? `<button class="btn ghost sm" type="button" data-act="mrcopy" data-sid="${s.id}">نسخ رسالة الأهل</button>` : ''}</div></article>`; }).join('')}</div>` : '<div class="empty">لا طلاب.</div>'}
  <p class="note" style="margin-top:12px">يكتب المعلم التقرير ويرسله، فيظهر هنا «بانتظار اعتماد المشرفة». بعد الاعتماد يظهر لولي الأمر في بوابته. الحضور يُحسب تلقائيًا من سجلات الشهر.</p>`;
}
function openMonthly(sid) {
  const s = sById(sid); if (!s) return; const m = S.month; const r = mrOf(sid, m) || {}; const st = mrStats(sid, m);
  const sup = can.sup(); const locked = !sup && r.status === 'published';
  const f = (id, l, v, ph = '', rows = 0) => `<div class="field"><label for="${id}">${l}</label>${rows ? `<textarea id="${id}" rows="${rows}" ${locked ? 'readonly' : ''} placeholder="${esc(ph)}">${esc(v || '')}</textarea>` : `<input id="${id}" value="${esc(v || '')}" ${locked ? 'readonly' : ''} placeholder="${esc(ph)}">`}</div>`;
  openSheet(`<h2>التقرير الشهري: ${esc(s.name)}</h2>
  <p class="note" style="margin:-6px 0 10px">${U.monthLabel(m)} · ${esc(tName(s.teacherId))} · ${mrChip(r.status ? r : null)}</p>
  <div class="chips" style="margin-bottom:10px">${chip('حضر ' + st.came, 'ok')}${st.absent ? chip('غاب ' + st.absent, 'miss') : ''}${st.excused ? chip('اعتذار/تأجيل ' + st.excused, 'exc') : ''}</div>
  <form id="mform" novalidate>
    <div class="two">${f('m-start', 'بدأ الشهر من', r.start, 'مثلًا: سورة النبأ')}${f('m-end', 'وصل إلى', r.end, 'مثلًا: سورة عبس آية ٢٠')}</div>
    ${f('m-ach', 'ما أنجزه هذا الشهر', r.achieved, 'الحفظ الجديد والمراجعة والتجويد', 2)}
    <div class="two">${f('m-str', 'نقاط القوة', r.strengths, '', 2)}${f('m-imp', 'يحتاج تحسين', r.improve, '', 2)}</div>
    ${f('m-next', 'هدف الشهر القادم', r.nextGoal, 'مثلًا: إتمام سورة عبس ومراجعة النبأ')}
    ${f('m-tn', 'كلمة المعلم للأهل', r.teacherNote, '', 2)}
    ${sup ? f('m-sn', 'ملاحظة المشرفة (تظهر للأهل)', r.supNote, '', 2) : r.supNote ? `<div class="alert"><span><b>ملاحظة المشرفة:</b> ${esc(r.supNote)}</span></div>` : ''}
    <p class="err" id="m-err" hidden></p>
    <div class="foot"><span class="note">${locked ? 'نُشر التقرير لولي الأمر. لتعديله تواصل مع المشرفة.' : ''}</span><div class="actions"><button class="btn ghost" type="button" data-act="close">إغلاق</button>
    ${locked ? '' : sup ? `${r.status ? '<button class="btn ghost" type="button" id="m-back">إعادة للمعلم</button>' : ''}<button class="btn ghost" type="button" id="m-save">حفظ</button><button class="btn red" type="submit">اعتماد ونشر لولي الأمر</button>`
      : `<button class="btn ghost" type="button" id="m-save">حفظ مسودة</button><button class="btn red" type="submit">إرسال للمشرفة</button>`}</div></div>
  </form>`);
  if (locked) return;
  const save = async status => {
    const body = { studentId: sid, teacherId: s.teacherId || '', month: m, start: $('m-start').value.trim(), end: $('m-end').value.trim(), achieved: $('m-ach').value.trim(), strengths: $('m-str').value.trim(), improve: $('m-imp').value.trim(), nextGoal: $('m-next').value.trim(), teacherNote: $('m-tn').value.trim(), status, updatedAt: Date.now(), by: S.user.uid };
    if (sup) body.supNote = $('m-sn').value.trim(); else if (r.supNote) body.supNote = r.supNote;
    if (status === 'published') { body.publishedAt = Date.now(); body.stats = st; }
    if (status !== 'draft' && !body.achieved) { $('m-err').textContent = 'اكتب ما أنجزه الطالب هذا الشهر.'; $('m-err').hidden = false; return; }
    try { await S.api.set('monthlyReports', m + '_' + sid, body); closeSheet(); toast(status === 'published' ? 'نُشر التقرير لولي الأمر' : status === 'submitted' ? 'أُرسل للمشرفة' : 'حُفظ'); await reload(); } catch (x) { fail(x); }
  };
  $('m-save').onclick = () => save(sup ? (r.status || 'draft') : 'draft');
  if ($('m-back')) $('m-back').onclick = () => save('draft');
  $('mform').onsubmit = e => { e.preventDefault(); save(sup ? 'published' : 'submitted'); };
}
function monthlyMsg(s, r) {
  const st = r.stats || mrStats(s.id, r.month);
  return `السلام عليكم ورحمة الله 🌿\nالتقرير الشهري لـ${s.name} – ${U.monthLabel(r.month)}\n\n✅ الحضور: ${st.came} حصة${st.absent ? ' · غاب ' + st.absent : ''}${r.start || r.end ? '\n📖 من: ' + (r.start || '—') + ' إلى: ' + (r.end || '—') : ''}${r.achieved ? '\n🌟 الإنجاز: ' + r.achieved : ''}${r.strengths ? '\n💪 نقاط القوة: ' + r.strengths : ''}${r.improve ? '\n🎯 يحتاج تحسين: ' + r.improve : ''}${r.nextGoal ? '\n🗓️ هدف الشهر القادم: ' + r.nextGoal : ''}${r.teacherNote ? '\n💬 كلمة المعلم: ' + r.teacherNote : ''}${r.supNote ? '\n📝 ملاحظة المشرفة: ' + r.supNote : ''}\n\nتجدون التقرير كاملًا في بوابة صلة 🤍\n${CONFIG.academy || 'أكاديمية صلة'}`;
}
function monthlyForParent(s) {
  const pub = D.monthly.filter(r => r.studentId === s.id && r.status === 'published').sort((a, b) => b.month.localeCompare(a.month));
  const r = pub.find(x => x.month === S.month) || pub[0]; if (!r) return '';
  const st = r.stats || mrStats(s.id, r.month);
  const line = (l, v) => v ? `<span><b>${l}:</b> ${esc(v)}</span>` : '';
  return `<h3 style="font-size:1rem">التقرير الشهري · ${U.monthLabel(r.month)}</h3><div class="rep">${line('الحضور', st.came + ' حصة' + (st.absent ? ' · غاب ' + st.absent : ''))}${line('من', r.start)}${line('إلى', r.end)}${line('الإنجاز', r.achieved)}${line('نقاط القوة', r.strengths)}${line('يحتاج تحسين', r.improve)}${line('هدف الشهر القادم', r.nextGoal)}${line('كلمة المعلم', r.teacherNote)}${line('ملاحظة المشرفة', r.supNote)}</div>`;
}

/* ================= 2. MAKE-UP LESSONS (one-off sessions in academy time) ================= */
/** Regular + make-up sessions on day D, in academy time. */
function sessionsOn(D0, students = D.students) {
  const ids = new Set(students.map(s => s.id));
  const extra = D.makeups.filter(k => k.date === D0 && ids.has(k.studentId) && sById(k.studentId)).map(k => ({ s: sById(k.studentId), ms: U.wallToMs(k.date, k.time || '00:00', ACAD_TZ), slot: { time: k.time, makeup: true, id: k.id, forDate: k.forDate } }));
  return U.occurrencesOn(students, D0, ACAD_TZ).concat(extra).sort((a, b) => a.ms - b.ms);
}
const mkFor = (sid, d) => D.makeups.find(k => k.studentId === sid && k.forDate === d);
function openMakeup(sid) {
  const s = sById(sid); if (!s) return; const ex = mkFor(sid, S.date);
  openSheet(`<h2>حصة تعويضية: ${esc(s.name)}</h2><p class="note" style="margin:-6px 0 12px">بدل حصة ${fmtDay(S.date)} · ${esc(tName(s.teacherId))}</p><form id="kform" novalidate>
    <div class="two"><div class="field"><label for="k-date">التاريخ</label><input id="k-date" type="date" value="${esc(ex ? ex.date : U.addDays(S.date, 1))}" min="${U.today()}"></div>
    <div class="field"><label for="k-time">الساعة (بتوقيت مصر)</label><input id="k-time" type="time" value="${esc(ex ? ex.time : (U.slotsOf(s)[0] || {}).time || '')}"></div></div>
    <div class="field"><label for="k-note">ملاحظة</label><input id="k-note" value="${esc(ex ? ex.note || '' : '')}" placeholder="مثلًا: باتفاق مع الأم"></div>
    <p class="err" id="k-err" hidden></p>
    <div class="foot">${ex ? '<button class="btn ghost" type="button" id="k-del" style="color:var(--crimson)">إلغاء التعويض</button>' : '<span></span>'}<div class="actions"><button class="btn ghost" type="button" data-act="close">إغلاق</button><button class="btn red" type="submit">حفظ الموعد</button></div></div></form>`);
  if (ex) $('k-del').onclick = async () => { try { await S.api.del('makeups', ex.id); closeSheet(); toast('أُلغي التعويض'); await reload(); } catch (x) { fail(x); } };
  $('kform').onsubmit = async e => {
    e.preventDefault(); const date = $('k-date').value, time = $('k-time').value;
    if (!date || !time) { $('k-err').textContent = 'اختر التاريخ والساعة.'; $('k-err').hidden = false; return; }
    if (sessionsOn(date, [s]).some(o => !o.slot.makeup)) { $('k-err').textContent = 'للطالب حلقة أساسية في هذا اليوم. اختر يومًا آخر.'; $('k-err').hidden = false; return; }
    const tBusy = sessionsOn(date, D.students.filter(x => x.teacherId === s.teacherId && x.id !== sid)).find(o => Math.abs(o.ms - U.wallToMs(date, time, ACAD_TZ)) < durOf(o.s) * 60000);
    if (tBusy) { $('k-err').textContent = 'المعلم مشغول في هذا الوقت مع ' + tBusy.s.name + '.'; $('k-err').hidden = false; return; }
    const body = { studentId: sid, teacherId: s.teacherId || '', date, time, forDate: S.date, note: $('k-note').value.trim(), at: Date.now(), by: S.user.uid };
    try { if (ex) await S.api.set('makeups', ex.id, body); else await S.api.add('makeups', body); closeSheet(); toast('حُفظ موعد التعويض ' + fmtDate(date)); await reload(); } catch (x) { fail(x); }
  };
}

/* ================= 3. RENEWAL FOLLOW-UP ================= */
const RN_ST = { none: ['لم يُتواصل', 'warn'], reminded: ['أُرسل تذكير', 'late'], interested: ['مهتم بالتجديد', 'tab'], pending: ['بانتظار الدفع', 'late'], renewed: ['جدّد', 'ok'], paused: ['توقف مؤقت', 'exc'], stop: ['لن يجدّد', 'miss'] };
const RN_WHY = ['السعر', 'المواعيد', 'المعلم', 'انشغال الطفل', 'سفر', 'مشكلة في الخدمة', 'انتقل لأكاديمية أخرى', 'لا يرد', 'أخرى'];
const cycleKey = b => (b && (b.paidThrough || b.cycleStart)) || '';
const renewalOf = b => { const r = (b && b.renewal) || {}; return r.cycle === cycleKey(b) ? r : {}; };
async function setRenewal(sid, patch) {
  const b = D.billing[sid] || {}; const cur = renewalOf(b);
  const renewal = { ...cur, ...patch, cycle: cycleKey(b), at: Date.now(), by: S.user.uid };
  if (renewal.status !== 'stop') delete renewal.reason;
  try { await S.api.set('billing', sid, { renewal }, true); D.billing[sid] = { ...b, renewal }; toast('حُفظت متابعة التجديد'); render(); } catch (x) { fail(x); }
}
function renewalCell(s) {
  const r = renewalOf(D.billing[s.id]); const st = r.status || 'none';
  return `<select data-rn="${s.id}" style="width:auto;max-width:170px">${Object.entries(RN_ST).map(([k, [l]]) => `<option value="${k}" ${st === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
    ${st === 'stop' ? `<select data-rnwhy="${s.id}" style="width:auto;max-width:170px;margin-top:4px"><option value="">السبب؟</option>${RN_WHY.map(w => `<option ${r.reason === w ? 'selected' : ''}>${w}</option>`).join('')}</select>` : ''}`;
}

/* ================= 4. PARENT CONTACT LOG ================= */
const CT_METHOD = { whatsapp: 'واتساب', call: 'مكالمة', meet: 'اجتماع', other: 'أخرى' };
const CT_WHY = { academic: 'المستوى التعليمي', attendance: 'الحضور والغياب', renewal: 'التجديد', payment: 'الدفع', schedule: 'المواعيد', complaint: 'شكوى', other: 'أخرى' };
const dueFollowUps = () => D.contacts.filter(c => c.next && !c.done && c.next <= U.today());
function openContacts(sid) {
  const s = sById(sid); if (!s) return;
  const list = D.contacts.filter(c => c.studentId === sid).sort((a, b) => (b.date + (b.at || 0)).localeCompare(a.date + (a.at || 0)));
  openSheet(`<h2>سجل التواصل مع أهل ${esc(s.name)}</h2><p class="note" style="margin:-6px 0 12px">ولي الأمر: ${esc(s.parentName || '—')} ${s.contact ? '· <span dir="ltr">' + esc(s.contact) + '</span>' : ''}</p>
  <form id="cform" novalidate>
    <div class="three"><div class="field"><label for="c-date">التاريخ</label><input id="c-date" type="date" value="${U.today()}"></div>
    <div class="field"><label for="c-m">الوسيلة</label><select id="c-m">${Object.entries(CT_METHOD).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
    <div class="field"><label for="c-r">السبب</label><select id="c-r">${Object.entries(CT_WHY).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div></div>
    <div class="field"><label for="c-n">ماذا قيل؟</label><textarea id="c-n" rows="2"></textarea></div>
    <div class="two"><div class="field"><label for="c-next">موعد المتابعة القادمة (اختياري)</label><input id="c-next" type="date"></div><div class="field" style="align-self:end"><button class="btn red" type="submit">+ تسجيل التواصل</button></div></div>
    <p class="err" id="c-err" hidden></p></form>
  <h3 style="font-size:1rem;margin:6px 0">السجل (${list.length})</h3>
  ${list.length ? list.map(c => `<div class="rep"><b>${fmtDate(c.date)} · ${esc(CT_METHOD[c.method] || c.method)} · ${esc(CT_WHY[c.reason] || c.reason)}</b>${c.notes ? `<span>${esc(c.notes)}</span>` : ''}<span class="note">${esc(c.byName || '')}${c.next ? ' · المتابعة: ' + fmtDate(c.next) + (c.done ? ' ✓ تمت' : '') : ''}</span>${c.next && !c.done ? `<button class="linkbtn" type="button" data-act="ctdone" data-id="${c.id}" data-sid="${sid}" style="align-self:flex-start">تمت المتابعة</button>` : ''}</div>`).join('') : '<p class="note">لا تواصل مسجّل بعد.</p>'}
  <div class="foot"><span></span><button class="btn ghost" type="button" data-act="close">إغلاق</button></div>`);
  $('cform').onsubmit = async e => {
    e.preventDefault(); const notes = $('c-n').value.trim();
    if (!notes) { $('c-err').textContent = 'اكتب ملخص التواصل.'; $('c-err').hidden = false; return; }
    try { await S.api.add('contacts', { studentId: sid, date: $('c-date').value || U.today(), method: $('c-m').value, reason: $('c-r').value, notes, next: $('c-next').value || '', done: false, by: S.user.uid, byName: S.prof.name || '', at: Date.now() }); await reload(); openContacts(sid); toast('سُجّل التواصل'); } catch (x) { fail(x); }
  };
}
async function contactDone(id, sid) { try { await S.api.set('contacts', id, { done: true }, true); await reload(); openContacts(sid); } catch (x) { fail(x); } }

/* ================= 5. PAYROLL: bonuses, deductions, approval ================= */
const adjOf = (tid, m) => D.adj.filter(a => a.teacherId === tid && a.month === m);
const payrollOf = (tid, m) => D.payroll.find(p => p.teacherId === tid && p.month === m);
function openAdjust(tid) {
  const m = S.month; const list = adjOf(tid, m); const x = duesOf(tid, m);
  openSheet(`<h2>مكافآت وخصومات ${esc(tName(tid))}</h2><p class="note" style="margin:-6px 0 12px">${U.monthLabel(m)} · الأساسي ${fmtN(x.base)} ج.م · الصافي ${fmtN(x.due)} ج.م</p>
  <form id="aform" novalidate><div class="three"><div class="field"><label for="a-k">النوع</label><select id="a-k"><option value="bonus">مكافأة (+)</option><option value="deduction">خصم (−)</option></select></div>
    <div class="field"><label for="a-amt">المبلغ (ج.م)</label><input id="a-amt" type="number" min="0" step="any" inputmode="decimal"></div>
    <div class="field"><label for="a-r">السبب</label><input id="a-r" placeholder="مثلًا: تغطية حصص زميلة"></div></div>
    <p class="err" id="a-err" hidden></p><div class="foot"><span class="note">يراها المعلم في «شهري ومستحقاتي».</span><button class="btn red" type="submit">+ إضافة</button></div></form>
  ${list.length ? list.map(a => `<div class="alert ${a.kind === 'deduction' ? 'red' : ''}"><span><b>${a.kind === 'deduction' ? '−' : '+'} ${fmtN(a.amount)} ج.م</b> · ${esc(a.reason || '')}</span><button class="linkbtn" type="button" data-act="deladj" data-id="${a.id}" data-t="${tid}" style="margin-inline-start:auto">حذف</button></div>`).join('') : '<p class="note">لا مكافآت ولا خصومات هذا الشهر.</p>'}
  <div class="foot"><span></span><button class="btn ghost" type="button" data-act="close">إغلاق</button></div>`);
  $('aform').onsubmit = async e => {
    e.preventDefault(); const amt = Number($('a-amt').value), reason = $('a-r').value.trim();
    if (!amt || !reason) { $('a-err').textContent = 'اكتب المبلغ والسبب.'; $('a-err').hidden = false; return; }
    try { await S.api.add('payAdj', { teacherId: tid, month: m, kind: $('a-k').value, amount: amt, reason, at: Date.now(), by: S.user.uid }); await reload(); openAdjust(tid); toast('أُضيف'); } catch (x) { fail(x); }
  };
}
async function delAdjust(id, tid) { try { await S.api.del('payAdj', id); await reload(); openAdjust(tid); } catch (x) { fail(x); } }
async function approvePayroll(tid, on) {
  const m = S.month, id = m + '_' + tid, x = duesOf(tid, m);
  try {
    if (on) await S.api.set('payroll', id, { teacherId: tid, month: m, status: 'approved', total: Math.round(x.due), approvedAt: Date.now(), by: S.user.uid });
    else await S.api.del('payroll', id);
    toast(on ? 'اعتُمدت مستحقات ' + tName(tid) : 'أُلغي الاعتماد'); await reload();
  } catch (e) { fail(e); }
}
function payStatus(x) {
  if (!x.approved) return chip('محسوب', 'exc');
  if (Math.round(x.due) !== Number(x.approved.total)) return chip('تغيّر بعد الاعتماد', 'warn');
  if (x.paid >= x.due && x.due > 0) return chip('مصروف بالكامل', 'ok');
  return chip('معتمد', 'tab');
}

/* ---------------- sheet & events ---------------- */
let sheetReturn = null; // element that opened the sheet, focused again on close
function openSheet(html) {
  const o = $('overlay'); if (o.hidden) sheetReturn = document.activeElement;
  o.innerHTML = `<div class="sheet-wrap" data-act="backdrop"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`; o.hidden = false;
  const h = o.querySelector('.sheet h2'); if (h) { h.id = 'sheetTitle'; o.querySelector('.sheet').setAttribute('aria-labelledby', 'sheetTitle'); }
  const f = o.querySelector('input,select,textarea'); if (f) f.focus();
}
function closeSheet() {
  $('overlay').hidden = true; $('overlay').innerHTML = ''; armedDel = null;
  const r = sheetReturn; sheetReturn = null; if (r && r.isConnected && r.focus) r.focus();
}
function afterRender() {
  const sq = $('sq'); if (sq) { sq.oninput = () => { S.q = sq.value; const pos = sq.selectionStart; render(); const n = $('sq'); n.focus(); n.setSelectionRange(pos, pos); }; }
  const stf = $('stf'); if (stf) stf.onchange = () => { S.tf = stf.value; render(); };
  document.querySelectorAll('[data-rate]').forEach(i => i.onchange = async () => { const rates = { ...D.rates, [i.dataset.rate]: Number(i.value) || 0 }; try { await S.api.set('settings', 'rates', rates); D.rates = rates; toast('حُدّث سعر ' + U.curName(i.dataset.rate)); render(); } catch (x) { fail(x); } });
  const pa = $('payAbsent'); if (pa) pa.onchange = async () => { try { await S.api.set('settings', 'main', { payAbsent: pa.checked }, true); D.main.payAbsent = pa.checked; render(); } catch (x) { fail(x); } };
  const imp = $('impFile'); if (imp) imp.onchange = () => imp.files[0] && onImportFile(imp.files[0]);
  document.querySelectorAll('[data-regst]').forEach(s => s.onchange = () => setRegStatus(s.dataset.regst, s.value));
  document.querySelectorAll('[data-rn]').forEach(s => s.onchange = () => setRenewal(s.dataset.rn, { status: s.value }));
  document.querySelectorAll('[data-rnwhy]').forEach(s => s.onchange = () => setRenewal(s.dataset.rnwhy, { status: 'stop', reason: s.value }));
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t) return; const a = t.dataset.act;
  if (a === 'backdrop') { if (e.target === t) closeSheet(); return; }
  if (a === 'tf') { S.tf = t.value; render(); return; }
  const go = {
    close: closeSheet,
    dprev: () => { S.date = U.addDays(S.date, -1); render(); }, dnext: () => { S.date = U.addDays(S.date, 1); render(); }, dtoday: () => { S.date = U.today(); render(); },
    mprev: () => { S.month = U.addMonths(S.month, -1); render(); }, mnext: () => { S.month = U.addMonths(S.month, 1); render(); },
    mark: () => mark(t.dataset.sid, t.dataset.st), report: () => openReport(t.dataset.sid),
    copyrep: () => { const s = sById(t.dataset.sid), r = repOf(S.date, t.dataset.sid); if (s && r) copyText(parentMsg(s, r)); },
    pay: () => openPayment(t.dataset.sid), payout: () => openPayout(t.dataset.t), expense: openExpense,
    delpay: () => confirmDel(t, 'payments', t.dataset.id), delexp: () => confirmDel(t, 'expenses', t.dataset.id),
    addst: () => openStudent(null), editst: () => openStudent(t.dataset.sid), delst: () => deleteStudent(t.dataset.sid, t),
    addt: () => openTeacher(null), editt: () => openTeacher(t.dataset.t),
    invite: () => openInvite(null), editinv: () => openInvite(t.dataset.e), delinv: () => deleteInvite($('i-email').value.trim().toLowerCase(), t),
    import: runImport,
    rf: () => { S.rf = t.dataset.k; render(); }, regst: () => regToStudent(t.dataset.id), delreg: () => confirmDel(t, 'registrations', t.dataset.id),
    mrep: () => openMonthly(t.dataset.sid), mrcopy: () => { const s = sById(t.dataset.sid), r = mrOf(t.dataset.sid, S.month); if (s && r) copyText(monthlyMsg(s, r)); },
    mkup: () => openMakeup(t.dataset.sid), ctlog: () => openContacts(t.dataset.sid), ctdone: () => contactDone(t.dataset.id, t.dataset.sid),
    adj: () => openAdjust(t.dataset.t), deladj: () => delAdjust(t.dataset.id, t.dataset.t), payok: () => approvePayroll(t.dataset.t, true), payundo: () => approvePayroll(t.dataset.t, false),
  }[a];
  if (go) go();
});
async function confirmDel(btn, c, id) {
  if (btn.dataset.armed !== '1') { btn.dataset.armed = '1'; btn.textContent = 'تأكيد الحذف'; return; }
  try { await S.api.del(c, id); toast('حُذف'); await reload(); } catch (x) { fail(x); }
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('overlay').hidden) closeSheet(); });
