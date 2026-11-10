import { Bakery, DebtRecord, DailyBakeryTask, TaskPriority } from '../types';

/**
 * دالة الاختبار الشاملة والتدقيق البرمجي لكافة المعادلات التموينية والحسابية
 * Comprehensive Audit and Verification Function for Supply & Bakery Calculations
 */
export interface MathAuditResult {
  passed: boolean;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  details: {
    checkName: string;
    expected: number | string;
    actual: number | string;
    status: 'PASS' | 'FAIL';
    description: string;
  }[];
}

/**
 * 1. حساب عدد الأرغفة التموينية = الحصة التأمينية × 1350
 */
export function calculateLoavesCount(insuranceQuota: number): number {
  return Math.round(Number(insuranceQuota || 0) * 1350);
}

/**
 * 2. متوسط نصيب الفرد = عدد الأرغفة ÷ عدد سكان القرية (علامة عشرية ورقمين فقط)
 */
export function calculatePerCapitaAverage(loavesCount: number, villagePopulation: number): string {
  if (!villagePopulation || villagePopulation <= 0) return '0.00';
  return (loavesCount / villagePopulation).toFixed(2);
}

/**
 * 3. متوسط المستفيدين لعام محدد = عدد الأرغفة ÷ عدد المستفيدين (علامة عشرية ورقمين فقط)
 */
export function calculateYearlyAverage(loavesCount: number, beneficiariesCount: number): string {
  if (!beneficiariesCount || beneficiariesCount <= 0) return '0.00';
  return (loavesCount / beneficiariesCount).toFixed(2);
}

/**
 * 4. الفرق التراكمي = متوسط 2025 - متوسط 2023 (علامة عشرية ورقمين فقط)
 */
export function calculateAverageDifference(avg2025: string, avg2023: string): string {
  const v25 = parseFloat(avg2025) || 0;
  const v23 = parseFloat(avg2023) || 0;
  return (v25 - v23).toFixed(2);
}

/**
 * دالة مساعدة لتنسيق التواريخ بالمنظومة إلى صيغة (يوم/شهر/سنة DD/MM/YYYY)
 */
export function formatDateDDMMYYYY(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) return '';
  const trimmed = dateStr.trim();
  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-');
    return `${d}/${m}/${y}`;
  }
  // If already DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed;
  }
  // Fallback to JS Date parsing
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return trimmed;
}

/**
 * 5. حساب مديونية المحضر/المخالفة = قيمة المخالفة + مخالفات قديمة - المسدد
 */
export function calculateRemainingViolations(
  violationAmount: number,
  oldViolations: number,
  paidViolationAmount: number
): { totalViolations: number; remainingViolations: number } {
  const totalViolations = (Number(violationAmount) || 0) + (Number(oldViolations) || 0);
  const remainingViolations = Math.max(0, totalViolations - (Number(paidViolationAmount) || 0));
  return { totalViolations, remainingViolations };
}

/**
 * 6. حساب مديونية المنصرف/المضاف = المضاف - المسدد
 */
export function calculateRemainingAdded(addedAmount: number, paidAddedAmount: number): number {
  return Math.max(0, (Number(addedAmount) || 0) - (Number(paidAddedAmount) || 0));
}

/**
 * 7. حساب قيمة التصرف في الدقيق = عدد الشكاير × سعر الشيكارة × مضاعف العقوبة
 */
export function calculateDisposalValue(
  bags: number,
  pricePerBag: number,
  multiplier: number = 1
): number {
  return (Number(bags) || 0) * (Number(pricePerBag) || 0) * (Number(multiplier) || 1);
}

/**
 * 8. حساب المتبقي من التصرف = قيمة التصرف - المسدد
 */
export function calculateRemainingDisposal(disposalValue: number, paidDisposal: number): number {
  return Math.max(0, (Number(disposalValue) || 0) - (Number(paidDisposal) || 0));
}

/**
 * 9. صافي المديونية الإجمالية على المخبز
 * = المتبقي من المخالفات + المتبقي من المضاف + المتبقي من التصرف
 */
export function calculateNetRemainingDebt(
  remainingViolations: number,
  remainingAdded: number,
  remainingDisposal: number
): number {
  return (
    (Number(remainingViolations) || 0) +
    (Number(remainingAdded) || 0) +
    (Number(remainingDisposal) || 0)
  );
}

/**
 * 10. دوال مساعدة نقية لإدارة القوائم المنسدلة (إضافة / تعديل / حذف)
 */
export function addDropdownOption(list: string[], newItem: string): string[] {
  const clean = newItem.trim();
  if (!clean || list.includes(clean)) return list;
  return [...list, clean];
}

export function editDropdownOption(list: string[], oldItem: string, newItem: string): string[] {
  const clean = newItem.trim();
  if (!clean) return list;
  return list.map((item) => (item === oldItem ? clean : item));
}

export function deleteDropdownOption(list: string[], itemToDelete: string): string[] {
  return list.filter((item) => item !== itemToDelete);
}

/**
 * 11. دوال مساعدة نقية لفرز وتصفية المهام اليومية حسب الأولوية وتاريخ الاستحقاق
 */
const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function filterAndSortDailyTasks(
  tasks: DailyBakeryTask[],
  options: {
    priorityFilter?: 'ALL' | TaskPriority;
    statusFilter?: 'ALL' | 'pending' | 'in_progress' | 'completed';
    searchQuery?: string;
  } = {}
): DailyBakeryTask[] {
  const { priorityFilter = 'ALL', statusFilter = 'ALL', searchQuery = '' } = options;
  const q = searchQuery.trim().toLowerCase();

  return tasks
    .filter((t) => {
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (q) {
        const hay = `${t.title} ${t.description || ''} ${t.bakeryName || ''} ${t.village || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      const pDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
      if (pDiff !== 0) return pDiff;
      return (a.dueDate || '').localeCompare(b.dueDate || '');
    });
}

/**
 * 12. تشغيل دالة الاختبار الشاملة والتحقق من دقة كافة المعادلات
 */
export function runComprehensiveAudit(
  sampleBakeries: Bakery[] = [],
  sampleDebts: DebtRecord[] = []
): MathAuditResult {
  const details: MathAuditResult['details'] = [];

  // فحص 1: دقة معادلة الأرغفة (20 شيكارة × 1350 = 27,000 رغيف)
  const loaves20 = calculateLoavesCount(20);
  details.push({
    checkName: 'معادلة حساب الأرغفة (20 شيكارة × 1350)',
    expected: 27000,
    actual: loaves20,
    status: loaves20 === 27000 ? 'PASS' : 'FAIL',
    description: 'تحقق من ضرب الحصة التأمينية في المعيار التمويني المعتمد 1350 رغيفاً.',
  });

  // فحص 2: دقة الأرغفة مع الكسور (15.5 شيكارة × 1350 = 20,925 رغيف)
  const loaves15_5 = calculateLoavesCount(15.5);
  details.push({
    checkName: 'معادلة حساب الأرغفة للكسور (15.5 شيكارة)',
    expected: 20925,
    actual: loaves15_5,
    status: loaves15_5 === 20925 ? 'PASS' : 'FAIL',
    description: 'تحقق من حساب الأرغفة للحصص غير الصحيحة بدقة تقريبية.',
  });

  // فحص 3: متوسط نصيب الفرد لسكان 30,000 نسمة بحصة 27,000 رغيف = 0.90 (علامة عشرية ورقمين فقط)
  const perCapita = calculatePerCapitaAverage(27000, 30000);
  details.push({
    checkName: 'متوسط نصيب الفرد من الخبز (27,000 / 30,000)',
    expected: '0.90',
    actual: perCapita,
    status: perCapita === '0.90' ? 'PASS' : 'FAIL',
    description: 'تحقق من دقة قسمة الأرغفة على إجمالي سكان القرية بعلامة عشرية ورقمين فقط (0.90).',
  });

  // فحص 4: متوسط مستفيدي 2023 (27,000 / 27,000) = 1.00 (علامة عشرية ورقمين فقط)
  const avg23 = calculateYearlyAverage(27000, 27000);
  details.push({
    checkName: 'متوسط مستفيدي 2023 (27,000 / 27,000)',
    expected: '1.00',
    actual: avg23,
    status: avg23 === '1.00' ? 'PASS' : 'FAIL',
    description: 'تحقق من قسمة الأرغفة على مستفيدي 2023 بعلامة عشرية ورقمين فقط.',
  });

  // فحص 5: متوسط مستفيدي 2025 (27,000 / 29,800) = 0.91 (علامة عشرية ورقمين فقط)
  const avg25 = calculateYearlyAverage(27000, 29800);
  details.push({
    checkName: 'متوسط مستفيدي 2025 (27,000 / 29,800)',
    expected: '0.91',
    actual: avg25,
    status: avg25 === '0.91' ? 'PASS' : 'FAIL',
    description: 'تحقق من قسمة الأرغفة على مستفيدي 2025 والتقريب لأقرب رقمين عشريين (0.91).',
  });

  // فحص 6: الفرق التراكمي (0.91 - 1.00 = -0.09)
  const diff = calculateAverageDifference('0.91', '1.00');
  details.push({
    checkName: 'الفرق التراكمي بين متوسطي 2025 و 2023',
    expected: '-0.09',
    actual: diff,
    status: diff === '-0.09' ? 'PASS' : 'FAIL',
    description: 'تحقق من طرح متوسط 2023 من متوسط 2025 بعلامة عشرية ورقمين فقط.',
  });

  // فحص 7: حساب إجمالي ومتبقي المخالفات (5000 + 2000 - 3000 = 4000)
  const violCalc = calculateRemainingViolations(5000, 2000, 3000);
  details.push({
    checkName: 'معادلة متبقي المخالفات (5000 + 2000 - 3000)',
    expected: 4000,
    actual: violCalc.remainingViolations,
    status: violCalc.remainingViolations === 4000 ? 'PASS' : 'FAIL',
    description: 'تحقق من جمع المخالفة والمخالفات القديمة وطرح المسدد.',
  });

  // فحص 8: حساب متبقي المنصرف/المضاف (15000 - 10000 = 5000)
  const addedRem = calculateRemainingAdded(15000, 10000);
  details.push({
    checkName: 'معادلة متبقي المنصرف والمضاف (15,000 - 10,000)',
    expected: 5000,
    actual: addedRem,
    status: addedRem === 5000 ? 'PASS' : 'FAIL',
    description: 'تحقق من خصم المسدد من المضاف.',
  });

  // فحص 9: حساب قيمة التصرف في الدقيق (10 شكاير × 850 ج.م × مضاعف 2 = 17,000 ج.م)
  const disposalVal = calculateDisposalValue(10, 850, 2);
  details.push({
    checkName: 'معادلة غرامة التصرف في الدقيق (10 شكاير × 850 × 2x)',
    expected: 17000,
    actual: disposalVal,
    status: disposalVal === 17000 ? 'PASS' : 'FAIL',
    description: 'تحقق من حساب غرامة التصرف بالشكاير مع مضاعف العقوبة.',
  });

  // فحص 10: حساب صافي المتبقي الإجمالي (4000 مخالفات + 5000 مضاف + 12000 تصرف = 21,000)
  const netDebt = calculateNetRemainingDebt(4000, 5000, 12000);
  details.push({
    checkName: 'معادلة صافي المديونية الإجمالية (4000 + 5000 + 12000)',
    expected: 21000,
    actual: netDebt,
    status: netDebt === 21000 ? 'PASS' : 'FAIL',
    description: 'تحقق من تجميع كافة المتبقيات من مخالفات ومضاف وتصرف.',
  });

  // فحص 11: شرط التنبيه التلقائي للمديونية الكبرى > 20,000 ج.م
  const isOver20k = netDebt > 20000;
  details.push({
    checkName: 'تفعيل إشعار وجدولة المديونية الكبرى (> 20,000 ج.م)',
    expected: 'TRUE',
    actual: isOver20k ? 'TRUE' : 'FALSE',
    status: isOver20k ? 'PASS' : 'FAIL',
    description: 'تحقق من تفعيل التنبيه الأسبوعي الإلزامي عند تجاوز 20,000 ج.م.',
  });

  // فحص عينات البيانات الحية المحملة في المنظومة (إن وجدت)
  if (sampleDebts.length > 0) {
    let consistentRecords = 0;
    sampleDebts.forEach((d) => {
      const calcViol = (d.violationAmount || 0) + (d.oldViolations || 0) - (d.paidViolationAmount || 0);
      const calcAdded = (d.addedAmount || 0) - (d.paidAddedAmount || 0);
      const calcDisp = (d.disposalValue || 0) - (d.paidDisposalAmount || 0);
      const expectedNet = Math.max(0, calcViol) + Math.max(0, calcAdded) + Math.max(0, calcDisp);

      if (Math.abs(expectedNet - d.netRemainingDebt) < 1) {
        consistentRecords++;
      }
    });

    details.push({
      checkName: `فحص اتساق قيود المديونيات الحية (${sampleDebts.length} قيد)`,
      expected: sampleDebts.length,
      actual: consistentRecords,
      status: consistentRecords === sampleDebts.length ? 'PASS' : 'FAIL',
      description: 'تحقق من سلامة وصحة صافي المديونيات لكافة القيود المسجلة بالكامل.',
    });
  }

  const passedChecks = details.filter((d) => d.status === 'PASS').length;
  const failedChecks = details.length - passedChecks;

  return {
    passed: failedChecks === 0,
    totalChecks: details.length,
    passedChecks,
    failedChecks,
    details,
  };
}

/**
 * 13. دالة نقية للبحث المتقدم عبر المديونيات (حسب النطاق التاريخي من - إلى، ونوع المخالفة، وباقي المعايير)
 */
export interface DebtAdvancedFilterCriteria {
  dateFrom?: string;
  dateTo?: string;
  violationType?: string;
  village?: string;
  localUnit?: string;
  issuingEntity?: string;
  status?: 'ALL' | 'UNPAID' | 'PAID' | 'OVER_20K' | 'OVERDUE';
  filterBakeryId?: string;
  searchTerm?: string;
  isOverdueCheck?: (dateStr?: string, netRemainingDebt?: number) => { isOverdue: boolean };
}

export function filterDebtsByAdvancedCriteria(
  debts: DebtRecord[],
  criteria: DebtAdvancedFilterCriteria = {}
): DebtRecord[] {
  const {
    dateFrom = '',
    dateTo = '',
    violationType = 'ALL',
    village = 'ALL',
    localUnit = 'ALL',
    issuingEntity = 'ALL',
    status = 'ALL',
    filterBakeryId,
    searchTerm = '',
    isOverdueCheck,
  } = criteria;

  const cleanFrom = dateFrom.trim();
  const cleanTo = dateTo.trim();
  const q = searchTerm.trim().toLowerCase();

  return debts.filter((d) => {
    if (filterBakeryId && d.bakeryId !== filterBakeryId) return false;
    if (village !== 'ALL' && d.village !== village) return false;
    if (localUnit !== 'ALL' && d.localUnit !== localUnit) return false;
    if (issuingEntity !== 'ALL' && d.issuingEntity !== issuingEntity) return false;
    if (violationType !== 'ALL' && d.violationType !== violationType) return false;

    // Date range filter (من - إلى) matching primary violationDate or disposalDate
    if (cleanFrom || cleanTo) {
      const recordDates = [d.violationDate, d.disposalDate]
        .map((dt) => (dt || '').trim())
        .filter(Boolean);

      if (recordDates.length === 0) return false;

      const matchesDateRange = recordDates.some((rDate) => {
        if (cleanFrom && rDate < cleanFrom) return false;
        if (cleanTo && rDate > cleanTo) return false;
        return true;
      });

      if (!matchesDateRange) return false;
    }

    if (status === 'UNPAID' && d.netRemainingDebt <= 0) return false;
    if (status === 'PAID' && d.netRemainingDebt > 0) return false;
    if (status === 'OVER_20K' && (d.netRemainingDebt || 0) <= 20000) return false;
    if (status === 'OVERDUE' && isOverdueCheck) {
      const { isOverdue } = isOverdueCheck(d.violationDate || d.disposalDate, d.netRemainingDebt);
      if (!isOverdue) return false;
    }

    if (q) {
      const match =
        d.bakeryOwnerName.toLowerCase().includes(q) ||
        d.machineNumber.includes(q) ||
        d.village.toLowerCase().includes(q) ||
        d.localUnit.toLowerCase().includes(q) ||
        d.issuingEntity.toLowerCase().includes(q) ||
        d.violationType.toLowerCase().includes(q) ||
        d.violationReceiptNumber.includes(q) ||
        d.addedReceiptNumber.includes(q) ||
        d.disposalReceiptNumber.includes(q) ||
        (d.violationDate || '').includes(q);
      if (!match) return false;
    }

    return true;
  });
}


