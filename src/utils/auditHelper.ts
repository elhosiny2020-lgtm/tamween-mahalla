import { Bakery, DebtRecord, DailyBakeryTask, TaskPriority, CalculationConfig } from '../types';

/**
 * الإعدادات الافتراضية لمعادلات الاحتساب التمويني المعتمدة بالمنظومة
 */
export const DEFAULT_CALCULATION_CONFIG: CalculationConfig = {
  insuranceDivisor: 3,
  autoCalcInsuranceQuota: true,
  breadTypeRates: {
    'بلدي مدعم ماو': 1350,
    'بلدي مجر': 1250,
    'خبز آلي': 1350,
    'طباقي': 1000,
  },
  loavesFormulaMode: 'ACTUAL_X_BREAD_DIV_BENEFICIARIES',
  perCapitaFormulaMode: 'LOAVES_X_ACTUAL_DIV_POPULATION',
};

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
 * 1.أ حساب الحصة التأمينية = المبلغ التأميني ÷ سعر الشيكارة داخل ملف صاحب المخبز ÷ 3
 */
export function calculateInsuranceQuotaFromValue(
  insuranceValue: number,
  flourBagPrice: number = 950,
  divisor: number = 3
): number {
  const val = Number(insuranceValue) || 0;
  const price = Number(flourBagPrice) > 0 ? Number(flourBagPrice) : 950;
  const div = Number(divisor) > 0 ? Number(divisor) : 3;
  if (val <= 0) return 0;
  return Math.round((val / price / div) * 100) / 100;
}

/**
 * 1.ب استخراج معامل نوع الخبز (ماو أو مجر أو غيره) التابع لخانة نوع الخبز
 */
export function getBreadTypeLoavesRate(
  breadType: string = 'بلدي مدعم ماو',
  customRates?: Record<string, number>
): number {
  const rates = { ...DEFAULT_CALCULATION_CONFIG.breadTypeRates, ...(customRates || {}) };
  const clean = (breadType || '').trim();
  if (rates[clean] !== undefined && Number(rates[clean]) > 0) {
    return Number(rates[clean]);
  }
  if (clean.includes('مجر')) {
    return rates['بلدي مجر'] || 1250;
  }
  if (clean.includes('ماو')) {
    return rates['بلدي مدعم ماو'] || 1350;
  }
  if (clean.includes('طباقي')) {
    return rates['طباقي'] || 1000;
  }
  return 1350;
}

/**
 * 1.ج حساب عدد الأرغفة حسب المعادلة المطلوبة:
 * عدد الأرغفة = (الحصة الفعلية × معامل نوع الخبز [ماو أو مجر]) ÷ عدد المستفيدين
 * (أو إجمالي الأرغفة = الحصة الفعلية × معامل نوع الخبز عند اختيار وضع الإجمالي)
 */
export function calculateLoavesByBreadTypeAndBeneficiaries(
  actualQuota: number,
  breadType: string = 'بلدي مدعم ماو',
  beneficiaries: number = 0,
  mode: 'ACTUAL_X_BREAD_DIV_BENEFICIARIES' | 'ACTUAL_X_BREAD_TOTAL' = 'ACTUAL_X_BREAD_DIV_BENEFICIARIES',
  customRates?: Record<string, number>
): number {
  const actual = Number(actualQuota) || 0;
  const rate = getBreadTypeLoavesRate(breadType, customRates);
  const totalDailyLoaves = actual * rate;

  if (mode === 'ACTUAL_X_BREAD_DIV_BENEFICIARIES') {
    const ben = Number(beneficiaries) || 0;
    if (ben <= 0) return Math.round(totalDailyLoaves * 100) / 100;
    return Math.round((totalDailyLoaves / ben) * 100) / 100;
  }

  return Math.round(totalDailyLoaves);
}

/**
 * 1.د حساب متوسط نصيب الفرد حسب المعادلة المطلوبة:
 * متوسط نصيب الفرد = (عدد الأرغفة × الحصة الفعلية) ÷ عدد السكان
 */
export function calculatePerCapitaFromLoavesAndActualQuota(
  loavesCount: number,
  actualQuota: number,
  villagePopulation: number,
  mode: 'LOAVES_X_ACTUAL_DIV_POPULATION' | 'LOAVES_DIV_POPULATION' = 'LOAVES_X_ACTUAL_DIV_POPULATION'
): string {
  const pop = Number(villagePopulation) || 0;
  if (pop <= 0) return '0.00';
  const loaves = Number(loavesCount) || 0;
  const actual = Number(actualQuota) || 0;

  if (mode === 'LOAVES_X_ACTUAL_DIV_POPULATION') {
    return ((loaves * actual) / pop).toFixed(2);
  }
  return (loaves / pop).toFixed(2);
}

/**
 * 1.هـ إعادة احتساب كافة خانات المخبز التموينية وفقاً لمعادلات المنظومة المحدثة
 */
export function recalculateBakeryWithConfig(
  bakery: Bakery,
  config: CalculationConfig = DEFAULT_CALCULATION_CONFIG
): Bakery {
  const bagPrice = Number(bakery.flourBagPrice) > 0 ? Number(bakery.flourBagPrice) : 950;
  const divisor = Number(config.insuranceDivisor) > 0 ? Number(config.insuranceDivisor) : 3;

  const computedInsuranceQuota =
    config.autoCalcInsuranceQuota && Number(bakery.insuranceValue) > 0
      ? calculateInsuranceQuotaFromValue(bakery.insuranceValue, bagPrice, divisor)
      : Number(bakery.insuranceQuota) || 0;

  const actualQuota = Number(bakery.actualQuota) > 0 ? Number(bakery.actualQuota) : computedInsuranceQuota;
  const breadRate = getBreadTypeLoavesRate(bakery.breadType, config.breadTypeRates);
  const totalDailyLoaves = actualQuota * breadRate;

  const primaryBeneficiaries =
    Number(bakery.beneficiaries2025) ||
    Number(bakery.beneficiaries2024) ||
    Number(bakery.beneficiaries2023) ||
    0;

  const computedLoavesCount = calculateLoavesByBreadTypeAndBeneficiaries(
    actualQuota,
    bakery.breadType,
    primaryBeneficiaries,
    config.loavesFormulaMode,
    config.breadTypeRates
  );

  const computedPerCapita = calculatePerCapitaFromLoavesAndActualQuota(
    computedLoavesCount,
    actualQuota,
    bakery.villagePopulation,
    config.perCapitaFormulaMode
  );

  const avg2023 = calculateYearlyAverage(totalDailyLoaves, bakery.beneficiaries2023);
  const avg2024 = calculateYearlyAverage(totalDailyLoaves, bakery.beneficiaries2024);
  const avg2025 = calculateYearlyAverage(totalDailyLoaves, bakery.beneficiaries2025);
  const avgDiff = calculateAverageDifference(avg2025, avg2023);

  return {
    ...bakery,
    flourBagPrice: bagPrice,
    insuranceQuota: computedInsuranceQuota,
    actualQuota,
    loavesCount: computedLoavesCount,
    perCapitaAverage: computedPerCapita,
    avg2023,
    avg2024,
    avg2025,
    avgDiff,
  };
}

/**
 * 1. حساب عدد الأرغفة التموينية القياسي = الحصة × 1350
 */
export function calculateLoavesCount(insuranceQuota: number): number {
  return Math.round(Number(insuranceQuota || 0) * 1350);
}

/**
 * 2. متوسط نصيب الفرد القياسي = عدد الأرغفة ÷ عدد سكان القرية (علامة عشرية ورقمين فقط)
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
 * دالة الحصول على تاريخ اليوم بصيغة يوم/شهر/سنة (DD/MM/YYYY) - اليوم على الشمال، الشهر في الوسط، السنة في اليمين
 */
export function getCurrentDateDDMMYYYY(now: Date = new Date()): string {
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * تحويل أي صيغة تاريخ (DD/MM/YYYY أو YYYY-MM-DD) إلى صيغة قياسية YYYY-MM-DD للمقارنات والفرز
 */
export function parseDateToISO(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) return '';
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = String(dmyMatch[1]).padStart(2, '0');
    const month = String(dmyMatch[2]).padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  const ymdMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = String(ymdMatch[2]).padStart(2, '0');
    const day = String(ymdMatch[3]).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return '';
}

/**
 * دالة مساعدة لتنسيق التواريخ بالمنظومة إلى صيغة (يوم/شهر/سنة DD/MM/YYYY)
 * اليوم على الشمال، الشهر في الوسط، السنة على اليمين
 */
export function formatDateDDMMYYYY(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) return '';
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-');
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    return `${String(dmyMatch[1]).padStart(2, '0')}/${String(dmyMatch[2]).padStart(2, '0')}/${dmyMatch[3]}`;
  }
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
 * 9.ب إعادة احتساب قيد المديونية بالكامل وتحديث بيانات المخبز المرتبط به لضمان تطابق جميع الجداول
 */
export function recalculateDebtRecord(debt: DebtRecord, linkedBakery?: Bakery): DebtRecord {
  const violationAmount = Number(debt.violationAmount) || 0;
  const oldViolations = Number(debt.oldViolations) || 0;
  const paidViolationAmount = Number(debt.paidViolationAmount) || 0;
  const { totalViolations, remainingViolations } = calculateRemainingViolations(
    violationAmount,
    oldViolations,
    paidViolationAmount
  );

  const addedAmount = Number(debt.addedAmount) || 0;
  const paidAddedAmount = Number(debt.paidAddedAmount) || 0;
  const remainingAdded = calculateRemainingAdded(addedAmount, paidAddedAmount);

  const disposalBags = Number(debt.disposalBags) || 0;
  const disposalBagPrice = Number(debt.disposalBagPrice) || 0;
  const disposalMultiplier = Number(debt.disposalMultiplier) || 1;
  const disposalValue =
    disposalBags > 0 && disposalBagPrice > 0
      ? calculateDisposalValue(disposalBags, disposalBagPrice, disposalMultiplier)
      : Number(debt.disposalValue) || 0;
  const paidDisposalAmount = Number(debt.paidDisposalAmount) || 0;
  const remainingDisposal = calculateRemainingDisposal(disposalValue, paidDisposalAmount);

  const netRemainingDebt = calculateNetRemainingDebt(
    remainingViolations,
    remainingAdded,
    remainingDisposal
  );

  return {
    ...debt,
    bakeryOwnerName: linkedBakery ? linkedBakery.bakeryOwnerName : debt.bakeryOwnerName,
    machineNumber: linkedBakery ? linkedBakery.machineNumber : debt.machineNumber,
    village: linkedBakery ? linkedBakery.village : debt.village,
    localUnit: linkedBakery ? linkedBakery.localUnit : debt.localUnit,
    violationAmount,
    oldViolations,
    totalViolations,
    paidViolationAmount,
    remainingViolations,
    addedAmount,
    paidAddedAmount,
    remainingAdded,
    disposalBags,
    disposalBagPrice,
    disposalMultiplier,
    disposalValue,
    paidDisposalAmount,
    remainingDisposal,
    netRemainingDebt,
  };
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

  // فحص 0.أ: معادلة الحصة التأمينية = المبلغ التأميني / سعر الشيكارة / 3
  const insQuotaCalc = calculateInsuranceQuotaFromValue(57000, 950, 3);
  details.push({
    checkName: 'معادلة الحصة التأمينية (المبلغ التأميني ÷ سعر الشيكارة ÷ 3)',
    expected: 20,
    actual: insQuotaCalc,
    status: insQuotaCalc === 20 ? 'PASS' : 'FAIL',
    description: 'تحقق من احتساب الحصة التأمينية = 57,000 ج.م ÷ 950 ج.م ÷ 3 = 20 شيكارة.',
  });

  // فحص 0.ب: معادلة عدد الأرغفة حسب الحصة الفعلية ونوع الخبز (ماو/مجر) وعدد المستفيدين
  const loavesByBreadAndBen = calculateLoavesByBreadTypeAndBeneficiaries(
    20,
    'بلدي مدعم ماو',
    27000,
    'ACTUAL_X_BREAD_DIV_BENEFICIARIES'
  );
  details.push({
    checkName: 'معادلة عدد الأرغفة (الحصة الفعلية × نوع الخبز [ماو/مجر] ÷ عدد المستفيدين)',
    expected: 1,
    actual: loavesByBreadAndBen,
    status: loavesByBreadAndBen === 1 ? 'PASS' : 'FAIL',
    description: 'تحقق من (20 شيكارة × 1350 ماو) ÷ 27,000 مستفيد = 1.00 رغيف/مستفيد.',
  });

  // فحص 0.ج: معادلة متوسط نصيب الفرد = (عدد الأرغفة × الحصة الفعلية) ÷ عدد السكان
  const perCapitaByFormula = calculatePerCapitaFromLoavesAndActualQuota(
    1350,
    20,
    30000,
    'LOAVES_X_ACTUAL_DIV_POPULATION'
  );
  details.push({
    checkName: 'معادلة متوسط نصيب الفرد (عدد الأرغفة × الحصة الفعلية ÷ عدد السكان)',
    expected: '0.90',
    actual: perCapitaByFormula,
    status: perCapitaByFormula === '0.90' ? 'PASS' : 'FAIL',
    description: 'تحقق من ضرب عدد الأرغفة في الحصة الفعلية وقسمتها على عدد السكان (0.90).',
  });

  // فحص 1: دقة معادلة الأرغفة (20 شيكارة × 1350 = 27,000 رغيف)
  const loaves20 = calculateLoavesCount(20);
  details.push({
    checkName: 'معادلة حساب الأرغفة (20 شيكارة × 1350)',
    expected: 27000,
    actual: loaves20,
    status: loaves20 === 27000 ? 'PASS' : 'FAIL',
    description: 'تحقق من ضرب الحصة في المعيار التمويني المعتمد 1350 رغيفاً.',
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

  const cleanFrom = parseDateToISO(dateFrom);
  const cleanTo = parseDateToISO(dateTo);
  const q = searchTerm.trim().toLowerCase();

  return debts.filter((d) => {
    if (filterBakeryId && d.bakeryId !== filterBakeryId) return false;
    if (village !== 'ALL' && d.village !== village) return false;
    if (localUnit !== 'ALL' && d.localUnit !== localUnit) return false;
    if (issuingEntity !== 'ALL' && d.issuingEntity !== issuingEntity) return false;
    if (violationType !== 'ALL' && d.violationType !== violationType) return false;

    if (cleanFrom || cleanTo) {
      const recordDates = [d.violationDate, d.disposalDate]
        .map((dt) => parseDateToISO(dt))
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
        (d.violationDate || '').includes(q) ||
        formatDateDDMMYYYY(d.violationDate).includes(q);
      if (!match) return false;
    }

    return true;
  });
}
