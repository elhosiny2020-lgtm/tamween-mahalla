import React, { useState, useMemo, useEffect } from 'react';
import { Bakery, CalculationConfig, SystemConfig } from '../types';
import {
  DEFAULT_CALCULATION_CONFIG,
  calculateInsuranceQuotaFromValue,
  getBreadTypeLoavesRate,
  calculateLoavesByBreadTypeAndBeneficiaries,
  calculatePerCapitaFromLoavesAndActualQuota,
  recalculateBakeryWithConfig,
} from '../utils/auditHelper';
import {
  X,
  Calculator,
  CheckCircle2,
  Sliders,
  RefreshCw,
  Sparkles,
  Scale,
  ArrowLeftRight,
  Save,
} from 'lucide-react';

interface CalculationFormulasModalProps {
  isOpen: boolean;
  onClose: () => void;
  bakeries: Bakery[];
  systemConfig: SystemConfig;
  breadTypes?: string[];
  onSaveAndApplyFormulas: (
    updatedConfig: CalculationConfig,
    recalculatedBakeries: Bakery[],
    applyToAllBakeries: boolean
  ) => void;
}

export const CalculationFormulasModal: React.FC<CalculationFormulasModalProps> = ({
  isOpen,
  onClose,
  bakeries,
  systemConfig,
  breadTypes = ['بلدي مدعم ماو', 'بلدي مجر', 'خبز آلي', 'طباقي'],
  onSaveAndApplyFormulas,
}) => {
  const initialCalcConfig = systemConfig.calculationConfig || DEFAULT_CALCULATION_CONFIG;

  const [insuranceDivisor, setInsuranceDivisor] = useState<number>(
    initialCalcConfig.insuranceDivisor || 3
  );
  const [autoCalcInsuranceQuota, setAutoCalcInsuranceQuota] = useState<boolean>(
    initialCalcConfig.autoCalcInsuranceQuota ?? true
  );
  const [breadTypeRates, setBreadTypeRates] = useState<Record<string, number>>({
    ...DEFAULT_CALCULATION_CONFIG.breadTypeRates,
    ...(initialCalcConfig.breadTypeRates || {}),
  });
  const [loavesFormulaMode, setLoavesFormulaMode] = useState<
    'ACTUAL_X_BREAD_DIV_BENEFICIARIES' | 'ACTUAL_X_BREAD_TOTAL'
  >(initialCalcConfig.loavesFormulaMode || 'ACTUAL_X_BREAD_DIV_BENEFICIARIES');
  const [perCapitaFormulaMode, setPerCapitaFormulaMode] = useState<
    'LOAVES_X_ACTUAL_DIV_POPULATION' | 'LOAVES_DIV_POPULATION'
  >(initialCalcConfig.perCapitaFormulaMode || 'LOAVES_X_ACTUAL_DIV_POPULATION');

  // Interactive Live Sandbox inputs
  const [sampleInsuranceValue, setSampleInsuranceValue] = useState<number>(57000);
  const [sampleBagPrice, setSampleBagPrice] = useState<number>(950);
  const [sampleActualQuota, setSampleActualQuota] = useState<number>(20);
  const [sampleBreadType, setSampleBreadType] = useState<string>('بلدي مدعم ماو');
  const [sampleBeneficiaries, setSampleBeneficiaries] = useState<number>(27000);
  const [samplePopulation, setSamplePopulation] = useState<number>(30000);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const currentConfig: CalculationConfig = useMemo(
    () => ({
      insuranceDivisor: Number(insuranceDivisor) > 0 ? Number(insuranceDivisor) : 3,
      autoCalcInsuranceQuota,
      breadTypeRates,
      loavesFormulaMode,
      perCapitaFormulaMode,
    }),
    [insuranceDivisor, autoCalcInsuranceQuota, breadTypeRates, loavesFormulaMode, perCapitaFormulaMode]
  );

  // Live sandbox outputs
  const sandboxResults = useMemo(() => {
    const insQuota = calculateInsuranceQuotaFromValue(
      sampleInsuranceValue,
      sampleBagPrice,
      currentConfig.insuranceDivisor
    );
    const breadRate = getBreadTypeLoavesRate(sampleBreadType, currentConfig.breadTypeRates);
    const loaves = calculateLoavesByBreadTypeAndBeneficiaries(
      sampleActualQuota,
      sampleBreadType,
      sampleBeneficiaries,
      currentConfig.loavesFormulaMode,
      currentConfig.breadTypeRates
    );
    const totalDailyLoaves = Math.round(sampleActualQuota * breadRate);
    const perCapita = calculatePerCapitaFromLoavesAndActualQuota(
      loaves,
      sampleActualQuota,
      samplePopulation,
      currentConfig.perCapitaFormulaMode
    );
    return {
      insQuota,
      breadRate,
      loaves,
      totalDailyLoaves,
      perCapita,
    };
  }, [
    sampleInsuranceValue,
    sampleBagPrice,
    sampleActualQuota,
    sampleBreadType,
    sampleBeneficiaries,
    samplePopulation,
    currentConfig,
  ]);

  // Preview recalculated bakeries
  const previewBakeries = useMemo(() => {
    return bakeries.map((b) => recalculateBakeryWithConfig(b, currentConfig));
  }, [bakeries, currentConfig]);

  if (!isOpen) return null;

  const allBreadTypeKeys = Array.from(
    new Set([...breadTypes, ...Object.keys(breadTypeRates), 'بلدي مدعم ماو', 'بلدي مجر'])
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm overflow-y-auto cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="bg-white text-black rounded-2xl shadow-2xl border-2 border-amber-500 w-full max-w-6xl my-4 overflow-hidden flex flex-col max-h-[94vh] cursor-default">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-950 via-amber-950 to-slate-950 p-4 text-white flex items-center justify-between shrink-0 border-b border-amber-500/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 shadow-lg">
              <Calculator className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-amber-300">
                استوديو مشاركة وتعديل معادلات الاحتساب التمويني على المنظومة
              </h3>
              <p className="text-xs text-slate-200 font-bold mt-0.5">
                تحكم كامل وتفاعلي في معادلات (الحصة التأمينية • عدد الأرغفة حسب نوع الخبز ماو/مجر • متوسط نصيب الفرد) مع معاينة حية وتطبيق فوري
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-red-700 hover:bg-red-600 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer border border-red-400"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
            <span>إغلاق (ESC)</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 bg-slate-50 text-black">
          {/* 3 Equations Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Equation 1: Insurance Quota */}
            <div className="bg-white border-2 border-amber-500 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 border border-amber-400 text-black text-xs font-black">
                  1. معادلة الحصة التأمينية
                </span>
                <Scale className="w-5 h-5 text-amber-700" />
              </div>

              <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl text-xs font-black text-black leading-relaxed">
                الحصة التأمينية = المبلغ التأميني ÷ سعر الشيكارة داخل ملف صاحب المخبز ÷ {insuranceDivisor}
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center justify-between text-xs font-black text-black">
                  <span>معامل القسمة التأميني (الافتراضي: 3):</span>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={insuranceDivisor}
                    onChange={(e) => setInsuranceDivisor(parseFloat(e.target.value) || 3)}
                    className="w-24 px-2.5 py-1 bg-white border-2 border-slate-400 rounded-lg text-center font-black text-black"
                  />
                </label>

                <label className="flex items-center gap-2 text-xs font-black text-black cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={autoCalcInsuranceQuota}
                    onChange={(e) => setAutoCalcInsuranceQuota(e.target.checked)}
                    className="w-4 h-4 accent-amber-600 rounded"
                  />
                  <span>احتساب الحصة التأمينية تلقائياً من المبلغ التأميني وسعر الشيكارة</span>
                </label>
              </div>
            </div>

            {/* Equation 2: Loaves Count & Bread Type (ماو / مجر) */}
            <div className="bg-white border-2 border-emerald-600 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 border border-emerald-400 text-black text-xs font-black">
                  2. معادلة عدد الأرغفة ونوع الخبز (ماو / مجر)
                </span>
                <Sliders className="w-5 h-5 text-emerald-700" />
              </div>

              <div className="p-3 bg-emerald-50/90 border border-emerald-300 rounded-xl text-xs font-black text-black leading-relaxed">
                {loavesFormulaMode === 'ACTUAL_X_BREAD_DIV_BENEFICIARIES'
                  ? 'عدد الأرغفة = (الحصة الفعلية × معامل نوع الخبز [ماو أو مجر]) ÷ عدد المستفيدين'
                  : 'عدد الأرغفة = الحصة الفعلية × معامل نوع الخبز (ماو أو مجر)'}
              </div>

              <div className="space-y-1.5">
                <span className="block text-[11px] font-black text-black">
                  اختر طريقة احتساب خانة (عدد الأرغفة) بالمنظومة:
                </span>
                <label className="flex items-start gap-2 p-2 rounded-lg border border-emerald-300 bg-emerald-50/50 cursor-pointer text-xs font-black text-black">
                  <input
                    type="radio"
                    name="loavesFormulaMode"
                    checked={loavesFormulaMode === 'ACTUAL_X_BREAD_DIV_BENEFICIARIES'}
                    onChange={() => setLoavesFormulaMode('ACTUAL_X_BREAD_DIV_BENEFICIARIES')}
                    className="mt-0.5 accent-emerald-700"
                  />
                  <span>
                    المعادلة الأولى: (الحصة الفعلية × نوع الخبز [ماو/مجر]) ÷ عدد المستفيدين
                  </span>
                </label>
                <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-300 bg-white cursor-pointer text-xs font-black text-black">
                  <input
                    type="radio"
                    name="loavesFormulaMode"
                    checked={loavesFormulaMode === 'ACTUAL_X_BREAD_TOTAL'}
                    onChange={() => setLoavesFormulaMode('ACTUAL_X_BREAD_TOTAL')}
                    className="mt-0.5 accent-emerald-700"
                  />
                  <span>
                    المعادلة الثانية: إجمالي الأرغفة اليومية = الحصة الفعلية × نوع الخبز (ماو/مجر)
                  </span>
                </label>
              </div>

              {/* Bread Type Multipliers */}
              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                <span className="block text-[11px] font-black text-black">
                  معامل إنتاج الشيكارة حسب خانة (نوع الخبز - ماو / مجر):
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {allBreadTypeKeys.map((bt) => (
                    <div
                      key={bt}
                      className="flex items-center justify-between gap-1 bg-slate-100 px-2 py-1 rounded-lg border border-slate-300 text-[11px] font-black text-black"
                    >
                      <span className="truncate">{bt}:</span>
                      <input
                        type="number"
                        value={breadTypeRates[bt] ?? getBreadTypeLoavesRate(bt, breadTypeRates)}
                        onChange={(e) =>
                          setBreadTypeRates((prev) => ({
                            ...prev,
                            [bt]: parseFloat(e.target.value) || 1350,
                          }))
                        }
                        className="w-16 px-1.5 py-0.5 bg-white border border-slate-400 rounded text-center font-black text-black"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Equation 3: Per Capita Average */}
            <div className="bg-white border-2 border-blue-600 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 border border-blue-400 text-black text-xs font-black">
                  3. معادلة متوسط نصيب الفرد
                </span>
                <ArrowLeftRight className="w-5 h-5 text-blue-700" />
              </div>

              <div className="p-3 bg-blue-50/90 border border-blue-300 rounded-xl text-xs font-black text-black leading-relaxed">
                {perCapitaFormulaMode === 'LOAVES_X_ACTUAL_DIV_POPULATION'
                  ? 'متوسط نصيب الفرد = (عدد الأرغفة × الحصة الفعلية) ÷ عدد السكان'
                  : 'متوسط نصيب الفرد = عدد الأرغفة ÷ عدد السكان'}
              </div>

              <div className="space-y-1.5">
                <span className="block text-[11px] font-black text-black">
                  اختر طريقة احتساب خانة (متوسط نصيب الفرد) بالمنظومة:
                </span>
                <label className="flex items-start gap-2 p-2 rounded-lg border border-blue-300 bg-blue-50/50 cursor-pointer text-xs font-black text-black">
                  <input
                    type="radio"
                    name="perCapitaFormulaMode"
                    checked={perCapitaFormulaMode === 'LOAVES_X_ACTUAL_DIV_POPULATION'}
                    onChange={() => setPerCapitaFormulaMode('LOAVES_X_ACTUAL_DIV_POPULATION')}
                    className="mt-0.5 accent-blue-700"
                  />
                  <span>
                    المعادلة الأولى: (عدد الأرغفة × الحصة الفعلية) ÷ عدد السكان
                  </span>
                </label>
                <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-300 bg-white cursor-pointer text-xs font-black text-black">
                  <input
                    type="radio"
                    name="perCapitaFormulaMode"
                    checked={perCapitaFormulaMode === 'LOAVES_DIV_POPULATION'}
                    onChange={() => setPerCapitaFormulaMode('LOAVES_DIV_POPULATION')}
                    className="mt-0.5 accent-blue-700"
                  />
                  <span>
                    المعادلة الثانية: عدد الأرغفة ÷ عدد السكان مباشرة
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Interactive Live Sandbox to test numbers immediately */}
          <div className="bg-white border-2 border-slate-400 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <h4 className="text-sm font-black text-black">
                  محاكي اختبار المعادلات الفوري (جرب أي أرقام لمعاينة ناتج الاحتساب لحظياً)
                </h4>
              </div>
              <span className="text-xs font-black text-black bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-400">
                تحديث حي ومباشر للأرقام
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div>
                <label className="block text-[11px] font-black text-black mb-1">المبلغ التأميني (ج.م)</label>
                <input
                  type="number"
                  value={sampleInsuranceValue}
                  onChange={(e) => setSampleInsuranceValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black text-center"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-black mb-1">سعر الشيكارة (ج.م)</label>
                <input
                  type="number"
                  value={sampleBagPrice}
                  onChange={(e) => setSampleBagPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black text-center"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-black mb-1">الحصة الفعلية (شيكارة)</label>
                <input
                  type="number"
                  step="0.5"
                  value={sampleActualQuota}
                  onChange={(e) => setSampleActualQuota(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black text-center"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-black mb-1">نوع الخبز (ماو / مجر)</label>
                <select
                  value={sampleBreadType}
                  onChange={(e) => setSampleBreadType(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black"
                >
                  {allBreadTypeKeys.map((bt) => (
                    <option key={bt} value={bt}>
                      {bt} ({getBreadTypeLoavesRate(bt, breadTypeRates)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-black text-black mb-1">عدد المستفيدين</label>
                <input
                  type="number"
                  value={sampleBeneficiaries}
                  onChange={(e) => setSampleBeneficiaries(parseInt(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black text-center"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-black mb-1">عدد السكان</label>
                <input
                  type="number"
                  value={samplePopulation}
                  onChange={(e) => setSamplePopulation(parseInt(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black text-center"
                />
              </div>
            </div>

            {/* Sandbox Computed Results Strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-amber-100/80 border-2 border-amber-500 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black text-black block">
                    ناتج الحصة التأمينية ({sampleInsuranceValue.toLocaleString()} ÷ {sampleBagPrice} ÷ {insuranceDivisor}):
                  </span>
                  <span className="text-lg font-black text-black font-mono">
                    {sandboxResults.insQuota} شيكارة
                  </span>
                </div>
                <CheckCircle2 className="w-6 h-6 text-amber-800 shrink-0" />
              </div>

              <div className="p-3 rounded-xl bg-emerald-100/80 border-2 border-emerald-600 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black text-black block">
                    ناتج عدد الأرغفة ({sampleActualQuota} × {sandboxResults.breadRate} [{sampleBreadType}]
                    {loavesFormulaMode === 'ACTUAL_X_BREAD_DIV_BENEFICIARIES'
                      ? ` ÷ ${sampleBeneficiaries.toLocaleString()}`
                      : ''}
                    ):
                  </span>
                  <span className="text-lg font-black text-black font-mono">
                    {sandboxResults.loaves.toLocaleString()}{' '}
                    <span className="text-xs">
                      (إجمالي الأرغفة اليومية: {sandboxResults.totalDailyLoaves.toLocaleString()})
                    </span>
                  </span>
                </div>
                <CheckCircle2 className="w-6 h-6 text-emerald-800 shrink-0" />
              </div>

              <div className="p-3 rounded-xl bg-blue-100/80 border-2 border-blue-600 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black text-black block">
                    ناتج متوسط نصيب الفرد (
                    {perCapitaFormulaMode === 'LOAVES_X_ACTUAL_DIV_POPULATION'
                      ? `${sandboxResults.loaves} × ${sampleActualQuota} ÷ ${samplePopulation.toLocaleString()}`
                      : `${sandboxResults.loaves} ÷ ${samplePopulation.toLocaleString()}`}
                    ):
                  </span>
                  <span className="text-lg font-black text-black font-mono">
                    {sandboxResults.perCapita}
                  </span>
                </div>
                <CheckCircle2 className="w-6 h-6 text-blue-800 shrink-0" />
              </div>
            </div>
          </div>

          {/* Live Preview Table on Existing Database Bakeries */}
          <div className="bg-white border-2 border-slate-400 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-slate-200 px-4 py-2.5 border-b border-slate-400 flex items-center justify-between">
              <span className="text-xs font-black text-black">
                معاينة تطبيق المعادلات على مخابز قاعدة البيانات الحالية ({previewBakeries.length} مخبز)
              </span>
              <span className="text-[11px] font-black text-black">
                اضغط بالأسفل على «حفظ وتطبيق المعادلات على كافة المخابز» لاعتماد الأرقام الجديدة
              </span>
            </div>
            <div className="overflow-x-auto max-h-60">
              <table className="w-full text-center text-xs border-collapse text-black font-black">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-black text-black">
                    <th className="border border-slate-400 py-1.5 px-2">م</th>
                    <th className="border border-slate-400 py-1.5 px-2 text-right">اسم صاحب المخبز</th>
                    <th className="border border-slate-400 py-1.5 px-2">نوع الخبز</th>
                    <th className="border border-slate-400 py-1.5 px-2">المبلغ التأميني</th>
                    <th className="border border-slate-400 py-1.5 px-2">سعر الشيكارة</th>
                    <th className="border border-slate-400 py-1.5 px-2 bg-amber-100">الحصة التأمينية الجديدة</th>
                    <th className="border border-slate-400 py-1.5 px-2">الحصة الفعلية</th>
                    <th className="border border-slate-400 py-1.5 px-2">المستفيدين (2025)</th>
                    <th className="border border-slate-400 py-1.5 px-2 bg-emerald-100">عدد الأرغفة الجديد</th>
                    <th className="border border-slate-400 py-1.5 px-2">عدد السكان</th>
                    <th className="border border-slate-400 py-1.5 px-2 bg-blue-100">متوسط نصيب الفرد الجديد</th>
                  </tr>
                </thead>
                <tbody>
                  {previewBakeries.slice(0, 12).map((b, idx) => (
                    <tr key={b.id} className="border-b border-slate-300 hover:bg-amber-50/40">
                      <td className="border border-slate-300 py-1 px-2 font-mono">{idx + 1}</td>
                      <td className="border border-slate-300 py-1 px-2 text-right">{b.bakeryOwnerName}</td>
                      <td className="border border-slate-300 py-1 px-2">{b.breadType}</td>
                      <td className="border border-slate-300 py-1 px-2 font-mono">
                        {(b.insuranceValue || 0).toLocaleString()}
                      </td>
                      <td className="border border-slate-300 py-1 px-2 font-mono">
                        {(b.flourBagPrice || 950).toLocaleString()}
                      </td>
                      <td className="border border-slate-300 py-1 px-2 font-mono bg-amber-50">
                        {b.insuranceQuota}
                      </td>
                      <td className="border border-slate-300 py-1 px-2 font-mono">{b.actualQuota}</td>
                      <td className="border border-slate-300 py-1 px-2 font-mono">
                        {(b.beneficiaries2025 || 0).toLocaleString()}
                      </td>
                      <td className="border border-slate-300 py-1 px-2 font-mono bg-emerald-50">
                        {b.loavesCount.toLocaleString()}
                      </td>
                      <td className="border border-slate-300 py-1 px-2 font-mono">
                        {(b.villagePopulation || 0).toLocaleString()}
                      </td>
                      <td className="border border-slate-300 py-1 px-2 font-mono bg-blue-50">
                        {b.perCapitaAverage}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 border-t-2 border-slate-300 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setInsuranceDivisor(3);
              setAutoCalcInsuranceQuota(true);
              setBreadTypeRates(DEFAULT_CALCULATION_CONFIG.breadTypeRates);
              setLoavesFormulaMode('ACTUAL_X_BREAD_DIV_BENEFICIARIES');
              setPerCapitaFormulaMode('LOAVES_X_ACTUAL_DIV_POPULATION');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-200 text-black border-2 border-slate-400 rounded-xl text-xs font-black cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>استعادة المعادلات الافتراضية</span>
          </button>

          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onSaveAndApplyFormulas(currentConfig, bakeries, false);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black cursor-pointer"
            >
              <Save className="w-4 h-4 text-amber-300" />
              <span>حفظ الإعدادات للمخابز الجديدة فقط</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSaveAndApplyFormulas(currentConfig, previewBakeries, true);
                onClose();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900 text-white rounded-xl text-xs font-black shadow-lg cursor-pointer border border-emerald-400"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-300" />
              <span>حفظ المعادلات وتطبيق الاحتساب الفوري على جميع المخابز ({bakeries.length} مخبز)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
