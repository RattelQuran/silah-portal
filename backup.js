// Backup / restore helpers. Pure functions: no DOM, no data access (unit-tested in tests/unit.test.mjs).
import * as U from './util.js';

export const BACKUP_COLS = ['teachers', 'teacherRates', 'students', 'billing', 'attendance', 'reports', 'monthlyReports', 'makeups', 'contacts', 'payments', 'expenses', 'payouts', 'payAdj', 'payroll', 'registrations', 'invites', 'users', 'settings'];
export const COL_AR = { teachers: 'المعلمون', teacherRates: 'أجور المعلمين', students: 'الطلاب', billing: 'الباقات', attendance: 'الحضور', reports: 'تقارير الحصص', monthlyReports: 'التقارير الشهرية', makeups: 'التعويض', contacts: 'سجل التواصل', payments: 'الدفعات', expenses: 'المصروفات', payouts: 'صرف المعلمين', payAdj: 'المكافآت والخصومات', payroll: 'اعتماد الرواتب', registrations: 'طلبات التسجيل', invites: 'الدعوات', users: 'الحسابات', settings: 'الإعدادات' };
const validId = id => typeof id === 'string' && id.length > 0 && id.length <= 300 && !id.includes('/') && id !== '.' && id !== '..';
const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
/** Turns a parsed file into write operations. Throws an Arabic message when the file is not usable. */
export function opsFromFile(j, rates = {}, main = {}) {
  if (!isObj(j)) throw new Error('الملف ليس JSON صالحًا.');
  const ops = [], bad = [];
  const put = (c, x) => { if (!isObj(x) || !validId(x.id)) { bad.push(c); return; } const { id, ...data } = x; ops.push({ c, id, data }); };
  if (j.format === 'silah-backup') {
    if (j.version !== 1 || !isObj(j.collections)) throw new Error('إصدار النسخة الاحتياطية غير معروف.');
    for (const [c, rows] of Object.entries(j.collections)) {
      if (!BACKUP_COLS.includes(c)) throw new Error('مجموعة غير معروفة في الملف: ' + c);
      if (!Array.isArray(rows)) throw new Error('بيانات «' + (COL_AR[c] || c) + '» تالفة.');
      rows.forEach(x => put(c, x));
    }
    return { kind: 'backup', ops, bad };
  }
  if (Array.isArray(j.students) && Array.isArray(j.teachers)) { // export from the old «دفتر رتّل»
    j.teachers.forEach(t => put('teachers', isObj(t) ? { id: t.id, name: t.name, section: (j.sections || {})[t.section] || t.section || '', room: t.room || '' } : t));
    Object.entries(j.teacherRates || {}).forEach(([id, v]) => put('teacherRates', { id, hourRate: v }));
    j.students.forEach(x => put('students', x));
    (j.billing || []).forEach(x => put('billing', x));
    (j.attendance || []).forEach(x => put('attendance', x));
    (j.reports || []).forEach(x => put('reports', x));
    (j.payments || []).forEach(p => put('payments', isObj(p) ? { ...p, egp: U.toEGP(rates, p.amount, p.currency) } : p));
    if (j.settings && j.settings.supervisor) ops.push({ c: 'settings', id: 'main', data: { ...main, supervisor: j.settings.supervisor } });
    return { kind: 'rattel', ops, bad };
  }
  throw new Error('الملف ليس نسخة احتياطية من صلة ولا ملف نقل من دفتر رتّل.');
}
/** Splits operations into new and existing per collection, given the ids already in the database. */
export function planImport(ops, existing) {
  const byCol = {};
  for (const o of ops) { const r = byCol[o.c] || (byCol[o.c] = { total: 0, fresh: 0, clash: 0 }); r.total++; (existing[o.c] && existing[o.c].has(o.id)) ? r.clash++ : r.fresh++; }
  return byCol;
}
