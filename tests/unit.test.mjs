// Unit tests for pure helpers. Run: npm run unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { opsFromFile, planImport } from '../backup.js';

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
