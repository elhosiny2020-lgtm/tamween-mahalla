import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLoavesCount,
  calculatePerCapitaAverage,
  calculateYearlyAverage,
  calculateAverageDifference,
  calculateRemainingViolations,
  calculateRemainingAdded,
  calculateDisposalValue,
  calculateRemainingDisposal,
  calculateNetRemainingDebt,
  runComprehensiveAudit,
} from './auditHelper';

describe('اختبار وتدقيق المعادلات التموينية والحسابية', () => {
  test('حساب الأرغفة التموينية = الحصة × 1350', () => {
    assert.equal(calculateLoavesCount(20), 27000);
    assert.equal(calculateLoavesCount(15.5), 20925);
    assert.equal(calculateLoavesCount(0), 0);
  });

  test('حساب متوسط نصيب الفرد = الأرغفة ÷ سكان القرية', () => {
    assert.equal(calculatePerCapitaAverage(27000, 30000), '0.90');
    assert.equal(calculatePerCapitaAverage(27000, 0), '0.00');
  });

  test('حساب متوسطات المستفيدين للأعوام والفرق التراكمي', () => {
    const avg23 = calculateYearlyAverage(27000, 27000);
    const avg25 = calculateYearlyAverage(27000, 29800);
    assert.equal(avg23, '1.00');
    assert.equal(avg25, '0.91');

    const diff = calculateAverageDifference(avg25, avg23);
    assert.equal(diff, '-0.09');
  });

  test('حساب مديونيات المخالفات والمتبقي', () => {
    const res = calculateRemainingViolations(5000, 2000, 3000);
    assert.equal(res.totalViolations, 7000);
    assert.equal(res.remainingViolations, 4000);
  });

  test('حساب متبقي المنصرف والمضاف', () => {
    const res = calculateRemainingAdded(15000, 10000);
    assert.equal(res, 5000);
  });

  test('حساب قيمة التصرف في الدقيق ومتبقي التصرف مع المضاعف', () => {
    const val = calculateDisposalValue(10, 850, 2);
    assert.equal(val, 17000);

    const rem = calculateRemainingDisposal(val, 5000);
    assert.equal(rem, 12000);
  });

  test('حساب صافي المديونية الإجمالية والتنبيه للمديونيات > 20,000 ج.م', () => {
    const net = calculateNetRemainingDebt(4000, 5000, 12000);
    assert.equal(net, 21000);
    assert.equal(net > 20000, true);
  });

  test('تشغيل دالة التدقيق الشاملة runComprehensiveAudit', () => {
    const report = runComprehensiveAudit();
    assert.equal(report.passed, true);
    assert.equal(report.failedChecks, 0);
    assert.ok(report.totalChecks >= 11);
    assert.equal(report.passedChecks, report.totalChecks);
  });
});
