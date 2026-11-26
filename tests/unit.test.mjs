// Unit tests for pure helpers. Run: npm run unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { opsFromFile, planImport, checkOps } from '../backup.js';

test('a Silah backup becomes one write per record', () => {
  const r = opsFromFile({ format: 'silah-backup', version: 1, collections: { students: [{ id: 'a', name: 'x' }], settings: [{ id: 'main', payAbsent: true }] } });
  assert.equal(r.kind, 'backup'); assert.deepEqual(r.ops, [{ c: 'students', id: 'a', data: { name: 'x' } }, { c: 'settings', id: 'main', data: { payAbsent: true } }]);
});
test('records without a valid id are skipped and counted', () => {
  const r = opsFromFile({ format: 'silah-backup', version: 1, collections: { students: [{ name: 'no id' }, { id: 'a/b' }, { id: 'ok' }] } });
  assert.equal(r.ops.length, 1); assert.equal(r.bad.length, 2);
});
test('unknown collections, versions and shapes are refused', () => {
  assert.throws(() => opsFromFile({ format: 'silah-backup', version: 1, collections: { secrets: [] } }), /غير معروفة/);
  assert.throws(() => opsFromFile({ format: 'silah-backup', version: 9, collections: {} }), /إصدار/);
  assert.throws(() => opsFromFile({ a: 1 }), /ليس نسخة/);
  assert.throws(() => opsFromFile([]), /JSON/);
});
test('a Rattel export maps teachers, rates and payments', () => {
  const r = opsFromFile({ teachers: [{ id: 't', name: 'T', section: 'g' }], sections: { g: 'قسم البنات' }, teacherRates: { t: 80 }, students: [{ id: 's' }], payments: [{ id: 'p', amount: 10, currency: 'USD' }] }, { USD: 50 });
  assert.equal(r.kind, 'rattel');
  assert.deepEqual(r.ops.find(o => o.c === 'teachers').data, { name: 'T', section: 'قسم البنات', room: '' });
  assert.deepEqual(r.ops.find(o => o.c === 'teacherRates').data, { hourRate: 80 });
  assert.equal(r.ops.find(o => o.c === 'payments').data.egp, 500);
});
test('the plan separates new from existing records', () => {
  const plan = planImport([{ c: 'students', id: 'a' }, { c: 'students', id: 'b' }, { c: 'reports', id: 'r' }], { students: new Set(['a']) });
  assert.deepEqual(plan, { students: { total: 2, fresh: 1, clash: 1 }, reports: { total: 1, fresh: 1, clash: 0 } });
});
test('restore check flags malformed money and attendance records, and passes sound ones', () => {
  const ok = [
    { c: 'payments', id: 'p', data: { amount: -600, currency: 'TRY', date: '2026-11-03', month: '2026-11' } },
    { c: 'payroll', id: '2026-11_sara', data: { teacherId: 'sara', month: '2026-11', status: 'approved', total: 900 } },
    { c: 'attendance', id: '2026-11-03_y', data: { studentId: 'y', date: '2026-11-03', month: '2026-11', status: 'late' } },
    { c: 'attendance', id: '2026-11-04_y', data: { studentId: 'y', date: '2026-11-04', status: 'present' } },   // old export, no month
    { c: 'billing', id: 'y', data: { quota: 12, fee: 600, currency: 'TRY' } },
    { c: 'students', id: 'y', data: { name: 'x' } },
  ];
  assert.deepEqual(checkOps(ok), []);
  const bad = checkOps([
    { c: 'payments', id: 'a', data: { amount: '600', currency: 'TRY', date: '2026-11-03', month: '2026-11' } },
    { c: 'expenses', id: 'b', data: { amount: 5, currency: 'XXX', date: '2026-11-03', month: '2026-11' } },
    { c: 'payAdj', id: 'c', data: { amount: 5, month: '2026-11', kind: 'gift' } },
    { c: 'payroll', id: '2026-11_omar', data: { teacherId: 'sara', month: '2026-11', status: 'approved', total: 1 } },
    { c: 'attendance', id: '2026-11-05_y', data: { studentId: 'y', date: '2026-11-05', month: '2026-10', status: 'present' } },
    { c: 'billing', id: 'z', data: { fee: '600' } },
  ]);
  assert.deepEqual(bad.map(x => x.id), ['a', 'b', 'c', '2026-11_omar', '2026-11-05_y', 'z']);
});
