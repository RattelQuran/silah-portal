// Shared helpers: dates, time zones, packages, money. No DOM, no data access.
export const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const DAY_ORDER = [6, 0, 1, 2, 3, 4, 5];
export const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
export const ST = { present: { l: 'حضر', c: 'ok' }, late: { l: 'تأخر', c: 'late' }, absent: { l: 'غاب', c: 'miss' }, excused: { l: 'اعتذر', c: 'exc' }, tabsent: { l: 'غاب المعلم', c: 'tab' }, resched: { l: 'تأجلت', c: 'res' } };
export const ST_KEYS = ['present', 'late', 'absent', 'excused', 'tabsent', 'resched'];
export const COUNTED = ['present', 'late', 'absent']; // deducted from the package
export const RATINGS = ['ممتاز', 'جيد جدًا', 'جيد', 'يحتاج متابعة'];
export const ROLES = { admin: 'الإدارة', supervisor: 'الإشراف', accountant: 'الحسابات', teacher: 'معلم', parent: 'ولي أمر' };
export const CUR = [['EGP', 'جنيه'], ['USD', 'دولار'], ['SAR', 'ريال'], ['AED', 'درهم'], ['EUR', 'يورو'], ['TRY', 'ليرة'], ['KWD', 'دينار كويتي'], ['QAR', 'ريال قطري'], ['GBP', 'جنيه إسترليني']];
export const RATE_DEF = { EGP: 1, USD: 56.1, SAR: 14.96, AED: 15.27, EUR: 65, TRY: 1.64, KWD: 183, QAR: 15.4, GBP: 75 };
export const EXPENSE_CATS = ['إعلانات وتسويق', 'اشتراكات وبرامج', 'رسوم تحويل', 'تصميم ومحتوى', 'أخرى'];
export const ZONES = [
  ['Africa/Cairo', 'مصر'], ['Europe/Istanbul', 'تركيا'], ['Asia/Riyadh', 'السعودية'], ['Asia/Dubai', 'الإمارات'],
  ['Asia/Qatar', 'قطر'], ['Asia/Kuwait', 'الكويت'], ['Asia/Jerusalem', 'فلسطين'], ['Asia/Amman', 'الأردن'],
  ['Europe/Paris', 'فرنسا'], ['Europe/Berlin', 'ألمانيا'], ['Europe/Amsterdam', 'هولندا'], ['Europe/Brussels', 'بلجيكا'],
  ['Europe/Vienna', 'النمسا'], ['Europe/Stockholm', 'السويد'], ['Europe/Rome', 'إيطاليا'], ['Europe/London', 'بريطانيا'],
  ['America/New_York', 'أمريكا (الشرق)'], ['America/Chicago', 'أمريكا (الوسط)'], ['America/Los_Angeles', 'أمريكا (الغرب)'],
  ['America/Toronto', 'كندا (تورنتو)'], ['Australia/Sydney', 'أستراليا (سيدني)']];

export const pad = n => String(n).padStart(2, '0');
export const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
export const today = () => ymd(new Date());
export const thisMonth = () => today().slice(0, 7);
export const addMonths = (m, n) => { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 1 + n, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
export const monthLabel = m => { const [y, mo] = m.split('-').map(Number); return MONTHS[mo - 1] + ' ' + y; };
export const fmtDate = ds => { const d = parse(ds); return d.getDate() + ' ' + MONTHS[d.getMonth()]; };
export const fmtDay = ds => { const d = parse(ds); return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; };
export const fmtTime = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return (h % 12 || 12) + ':' + pad(m) + ' ' + (h >= 12 ? 'م' : 'ص'); };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtN = n => Math.round(Number(n) || 0).toLocaleString('en-US');
export const zoneName = tz => (ZONES.find(z => z[0] === tz) || [tz, tz])[1];
export const curName = c => (CUR.find(x => x[0] === c) || [c, c || ''])[1];
export const safeLink = u => { u = String(u || '').trim(); if (!u) return ''; if (!/^https?:\/\//i.test(u)) u = 'https://' + u; return /^https:\/\//i.test(u) ? u : ''; };
export const waLink = raw => { const s = String(raw || '').trim(); const d = s.replace(/\D/g, ''); return d.length >= 8 && /^[+\d\s\-()]+$/.test(s) ? 'https://wa.me/' + d : ''; };
export const slug = s => String(s || '').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || ('id-' + Date.now().toString(36));

export let VIEW_TZ = 'Africa/Cairo';
try { VIEW_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || VIEW_TZ; } catch (e) { /* keep default */ }

const fmtCache = {};
function tzParts(ms, tz) {
  const f = fmtCache[tz] || (fmtCache[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }));
  const p = {}; f.formatToParts(new Date(ms)).forEach(x => p[x.type] = x.value);
  return { y: +p.year, m: +p.month, d: +p.day, h: (+p.hour) % 24, mi: +p.minute };
}
export function offsetMin(ms, tz) { const p = tzParts(ms, tz); const base = Math.floor(ms / 60000) * 60000; return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - base) / 60000); }
export function wallToMs(dateStr, time, tz) {
  const [y, m, d] = dateStr.split('-').map(Number); const [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi); const o1 = offsetMin(guess, tz); let ms = guess - o1 * 60000;
  const o2 = offsetMin(ms, tz); if (o2 !== o1) ms = guess - o2 * 60000; return ms;
}
export const localDate = (ms, tz) => { const p = tzParts(ms, tz); return p.y + '-' + pad(p.m) + '-' + pad(p.d); };
export const localTime = (ms, tz) => { const p = tzParts(ms, tz); return pad(p.h) + ':' + pad(p.mi); };
export const sTz = s => s.schedTz || 'Africa/Cairo';
export const kTz = s => s.studentTz || sTz(s);
export const slotsOf = s => Array.isArray(s.slots) ? s.slots : [];
export const slotText = sl => DAYS[sl.day] + ' ' + fmtTime(sl.time) + (sl.review ? ' (مراجعة)' : '');
export const isPaused = (s, D = today()) => !!(s.paused || (s.pausedUntil && s.pausedUntil > D));

/** Sessions that land on calendar day D in time zone tz (a class set in Cairo time can fall on another day abroad). */
export function occurrencesOn(students, D, tz = VIEW_TZ) {
  const out = [];
  for (const s of students) {
    if (s.since && D < s.since) continue;
    if (isPaused(s, D)) continue;
    for (const sl of slotsOf(s)) {
      if (!sl.time) continue;
      for (const k of [-1, 0, 1]) {
        const sd = addDays(D, k);
        if (parse(sd).getDay() !== sl.day) continue;
        const ms = wallToMs(sd, sl.time, sTz(s));
        if (localDate(ms, tz) !== D) continue;
        out.push({ s, ms, slot: sl });
      }
    }
  }
  return out.sort((a, b) => a.ms - b.ms);
}
export function nextOccurrence(s, tz, fromMs = Date.now()) {
  for (let i = 0; i < 9; i++) {
    const D = addDays(localDate(fromMs, tz), i);
    const o = occurrencesOn([s], D, tz).find(x => x.ms + 3600e3 > fromMs);
    if (o) return o;
  }
  return null;
}

/* ---------- packages ---------- */
export function pkgDone(b, att) {
  let n = Number(b.doneBefore) || 0; const cs = b.cycleStart || '', ca = Number(b.cycleStartAt) || 0;
  for (const r of att) {
    if (!COUNTED.includes(r.status)) continue;
    if (cs && (r.date < cs || (r.date === cs && (Number(r.at) || 0) < ca))) continue;
    n++;
  }
  return n;
}
/** Package / renewal state for one student. b = billing doc, att = that student's attendance records. */
export function pkgState(b, att) {
  if (!b || b.free) return null;
  const q = Number(b.quota) || 0, done = pkgDone(b, att);
  if (b.paidThrough) {
    const days = Math.round((parse(b.paidThrough) - parse(today())) / 864e5);
    const ses = q ? 'الحصة ' + done + ' من ' + q + ' · ' : '';
    return { q, done, days, monthly: true, cls: days < 0 ? 'miss' : days <= 3 ? 'warn' : 'ok', due: days <= 3,
      txt: days < 0 ? ses + 'التجديد متأخر ' + (-days) + ' يوم' : days === 0 ? ses + 'التجديد اليوم' : days <= 3 ? ses + 'التجديد بعد ' + (days === 1 ? 'يوم' : days === 2 ? 'يومين' : days + ' أيام') : ses + 'التجديد ' + fmtDate(b.paidThrough) };
  }
  if (!q) return null;
  const left = q - done;
  return { q, done, left, cls: left <= 0 ? 'miss' : left <= 2 ? 'warn' : 'ok', due: left <= 2,
    txt: left <= 0 ? 'انتهت الباقة (' + done + ' من ' + q + ')' : left <= 2 ? 'باقية ' + (left === 1 ? 'حصة واحدة' : 'حصتان') + ' (' + done + ' من ' + q + ')' : 'الحصة ' + done + ' من ' + q };
}
export const rateOf = (rates, c) => Number((rates || {})[c]) || RATE_DEF[c] || 0;
export const toEGP = (rates, amount, c) => (Number(amount) || 0) * rateOf(rates, c);

/** Siblings that share one fee (feeWith names). Returns [primary, ...mates]. */
export function feeGroup(s, b, students, billing) {
  if (!b || !b.feeWith) return [s.id];
  const names = String(b.feeWith).split(/\s*(?:،|,|\sو\s)\s*/).map(x => x.trim()).filter(Boolean);
  const mates = students.filter(x => x.id !== s.id && names.some(n => x.name === n || x.name.includes(n)) && billing[x.id] && Number(billing[x.id].fee) === Number(b.fee) && billing[x.id].currency === b.currency);
  return [s, ...mates].sort((a, c) => a.name.localeCompare(c.name, 'ar')).map(x => x.id);
}
