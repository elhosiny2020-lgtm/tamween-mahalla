import React, { useState, useMemo } from 'react';
import { Bakery } from '../types';
import { Calculator, Scale, FileText, AlertTriangle, CheckCircle, Printer, Plus, Copy, RotateCcw, X, ShieldAlert, Award } from 'lucide-react';

interface SupplyFinesCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  bakeries: Bakery[];
  onApplyFineToDebt: (prefilledData: {
    bakeryId: string;
    bakeryOwnerName: string;
    machineNumber: string;
    village: string;
    localUnit: string;
    violationType: string;
    violationAmount: number;
    notes: string;
  }) => void;
}

export const SupplyFinesCalculatorModal: React.FC<SupplyFinesCalculatorModalProps> = ({
  isOpen,
  onClose,
  bakeries,
  onApplyFineToDebt,
}) => {
  const [selectedBakeryId, setSelectedBakeryId] = useState<string>('');
  const [violationCategory, setViolationCategory] = useState<string>('UNDERWEIGHT');
  
  // Inputs
  const [missingLoaves, setMissingLoaves] = useState<number>(1000);
  const [weightDeficitGrams, setWeightDeficitGrams] = useState<number>(15);
  const [flourBagsCount, setFlourBagsCount] = useState<number>(5);
  const [bagPrice, setBagPrice] = useState<number>(850);
  const [disposalMultiplier, setDisposalMultiplier] = useState<number>(2);
  const [smartCardsCount, setSmartCardsCount] = useState<number>(15);
  const [actualSellingPrice, setActualSellingPrice] = useState<number>(1.5);
  const [officialPrice, setOfficialPrice] = useState<number>(0.20);
  const [stoppageDays, setStoppageDays] = useState<number>(2);
  const [dailyQuotaBags, setDailyQuotaBags] = useState<number>(10);
  const [copiedStatus, setCopiedStatus] = useState<boolean>(false);

  // Auto select bakery details
  const selectedBakery = useMemo(() => {
    return bakeries.find((b) => b.id === selectedBakeryId);
  }, [bakeries, selectedBakeryId]);

  // Sync daily quota bags when bakery is selected
  React.useEffect(() => {
    if (selectedBakery) {
      if (selectedBakery.actualQuota) {
        setDailyQuotaBags(selectedBakery.actualQuota);
      }
    }
  }, [selectedBakery]);

  // Calculation Logic based on Egyptian Supply Violation Schedule (القرار الوزاري رقم 71 لسنة 2020)
  const calculationResult = useMemo(() => {
    let baseFine = 0;
    let costDiff = 0;
    let multiplier = 1;
    let title = '';
    let legalRef = '';
    let formulaDescription = '';

    switch (violationCategory) {
      case 'UNDERWEIGHT': {
        title = 'مخالفة إنتاج خبز بلدي ناقص الوزن';
        legalRef = 'القرار الوزاري رقم 71 لسنة 2020 - المادة (3) تدابير نقص الوزن';
        
        let finePerLoaf = 0;
        if (weightDeficitGrams <= 10) {
          finePerLoaf = 0.50;
          costDiff = missingLoaves * 0.15;
          formulaDescription = `نقص من 5-10 جم: غرامة 0.50 ج.م/رغيف (${missingLoaves} رغيف × 0.50 ج.م = ${(missingLoaves * 0.50).toLocaleString()} ج.م) + فروق تكلفة ${(costDiff).toLocaleString()} ج.م.`;
        } else if (weightDeficitGrams <= 20) {
          finePerLoaf = 1.25;
          costDiff = missingLoaves * 0.35;
          formulaDescription = `نقص من 10-20 جم: غرامة 1.25 ج.م/رغيف (${missingLoaves} رغيف × 1.25 ج.م = ${(missingLoaves * 1.25).toLocaleString()} ج.م) + فروق تكلفة ${(costDiff).toLocaleString()} ج.م.`;
        } else if (weightDeficitGrams <= 30) {
          finePerLoaf = 2.50;
          costDiff = missingLoaves * 0.60;
          formulaDescription = `نقص من 20-30 جم: غرامة 2.50 ج.م/رغيف (${missingLoaves} رغيف × 2.50 ج.م = ${(missingLoaves * 2.50).toLocaleString()} ج.م) + فروق تكلفة ${(costDiff).toLocaleString()} ج.م.`;
        } else {
          // > 30g is classified as flour disposal (تصرف حاد في الدقيق)
          finePerLoaf = 4.00;
          costDiff = missingLoaves * 0.85;
          multiplier = 2;
          formulaDescription = `نقص شديد يتجاوز 30 جم (يُعامل معاملة التصرف بالدقيق): غرامة 4.00 ج.م/رغيف ومضاعفة العقوبة 2x.`;
        }
        baseFine = missingLoaves * finePerLoaf;
        break;
      }

      case 'FLOUR_DISPOSAL': {
        title = 'مخالفة التصرف في الدقيق البلدي المدعم';
        legalRef = 'القرار الوزاري رقم 71 لسنة 2020 - المادة (4) عقوبات التصرف بالدقيق';
        multiplier = disposalMultiplier;
        
        // Calculate bags based on missing loaves if specified, otherwise bags input
        const effectiveBags = flourBagsCount > 0 ? flourBagsCount : Math.ceil(missingLoaves / 700);
        baseFine = effectiveBags * bagPrice * multiplier;
        formulaDescription = `تصرف في عدد ${effectiveBags} شكارة دقيق زنة 50كجم × سعر الشيكارة ${bagPrice} ج.م × معامل مضاعفة ${multiplier}x.`;
        break;
      }

      case 'NON_COMPLIANT': {
        title = 'مخالفة إنتاج خبز غير مطابق للمواصفات التموينية';
        legalRef = 'القرار الوزاري رقم 71 لسنة 2020 - المادة (5) جودة المواصفات';
        baseFine = 1500; // Flat fine for batch
        if (missingLoaves > 500) {
          costDiff = (missingLoaves - 500) * 0.50;
        }
        formulaDescription = `غرامة مقطوعة للمدفعة (1,500 ج.م) + 0.50 ج.م عن كل رغيف يزيد عن 500 رغيف (${costDiff.toLocaleString()} ج.م).`;
        break;
      }

      case 'SMART_CARDS': {
        title = 'مخالفة تجميع بطاقات تموينية ذكية بدون وجه حق';
        legalRef = 'المادة (7) من لائحة جزاءات المخابز - التجميع وإساءة استخدام البطاقات';
        baseFine = smartCardsCount * 100;
        formulaDescription = `تجميع عدد ${smartCardsCount} بطاقة تموينية × غرامة 100 ج.م لكل بطاقة مضبوطة. (مستوجب إيقاف الماكينة وتنبيه المديرية).`;
        break;
      }

      case 'OVERPRICING': {
        title = 'مخالفة بيع الخبز البلدي بأزيد من السعر الرسمي';
        legalRef = 'المادة (8) من قانون حماية المستهلك واللائحة التموينية - البيع بأزيد من السعر';
        const priceDiffPerLoaf = Math.max(0, actualSellingPrice - officialPrice);
        costDiff = missingLoaves * priceDiffPerLoaf;
        baseFine = 2000; // Flat violation fine
        formulaDescription = `مصادرة الفارق السعري (${missingLoaves} رغيف × ${priceDiffPerLoaf.toFixed(2)} ج.م = ${costDiff.toLocaleString()} ج.م) + غرامة مقطوعة 2,000 ج.م.`;
        break;
      }

      case 'UNAUTHORIZED_STOPPAGE': {
        title = 'مخالفة التوقف عن الإنتاج بدون إذن رسمي';
        legalRef = 'المادة (9) - حظر التوقف غير المبرر عن المخبز البلدي';
        baseFine = stoppageDays * dailyQuotaBags * 500;
        formulaDescription = `توقف لمدة ${stoppageDays} يوم × حصة يومية ${dailyQuotaBags} شكارة × غرامة 500 ج.م/شكارة/يوم.`;
        break;
      }

      case 'NO_INSPECTION_LOG': {
        title = 'مخالفة عدم وجود سجل التفتيش أو عدم الإعلان عن المواعيد';
        legalRef = 'المادة (10) - المخالفات الإدارية والتنظيمية للمخبز';
        baseFine = 500;
        formulaDescription = `غرامة تنبيهية مقطوعة قدرها 500 ج.م مع التعهد بإتاحة السجل فوراً.`;
        break;
      }

      default:
        baseFine = 0;
    }

    const grandTotalFine = Math.round((baseFine * (violationCategory === 'FLOUR_DISPOSAL' ? 1 : multiplier)) + costDiff);

    return {
      title,
      legalRef,
      baseFine,
      costDiff,
      multiplier,
      grandTotalFine,
      formulaDescription,
    };
  }, [
    violationCategory,
    missingLoaves,
    weightDeficitGrams,
    flourBagsCount,
    bagPrice,
    disposalMultiplier,
    smartCardsCount,
    actualSellingPrice,
    officialPrice,
    stoppageDays,
    dailyQuotaBags,
  ]);

  if (!isOpen) return null;

  const handleApplyFine = () => {
    if (!selectedBakery) {
      alert('يرجى اختيار المخبز أولاً لربط الغرامة بملف المخبز');
      return;
    }

    onApplyFineToDebt({
      bakeryId: selectedBakery.id,
      bakeryOwnerName: selectedBakery.bakeryOwnerName,
      machineNumber: selectedBakery.machineNumber,
      village: selectedBakery.village,
      localUnit: selectedBakery.localUnit,
      violationType: calculationResult.title,
      violationAmount: calculationResult.grandTotalFine,
      notes: `تم الحساب تلقائياً عبر حاسبة الغرامات التموينية: ${calculationResult.formulaDescription} - ${calculationResult.legalRef}`,
    });
    onClose();
  };

  const handleCopySummary = () => {
    const text = `
إخطار غرامة تموينية تلقائية
المخبز: ${selectedBakery ? selectedBakery.bakeryOwnerName : 'غير محدد'} (ماكينة: ${selectedBakery ? selectedBakery.machineNumber : '-'})
نوع المخالفة: ${calculationResult.title}
إجمالي قيمة الغرامة التلقائية: ${calculationResult.grandTotalFine.toLocaleString()} ج.م
بيان الحساب: ${calculationResult.formulaDescription}
السند القانوني: ${calculationResult.legalRef}
التاريخ: ${new Date().toLocaleDateString('ar-EG')}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2500);
  };

  const handlePrintFineNotice = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto text-slate-100 p-5 md:p-7 space-y-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 border border-amber-500/50 rounded-2xl text-amber-400">
              <Calculator className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-amber-400">
                حاسبة الغرامات والعقوبات التموينية التلقائية
              </h2>
              <p className="text-xs text-slate-400 font-bold">
                وفقاً للائحة التدابير الإدارية والجزاءات لوزارة التموين والتجارة الداخلية (القرار الوزاري رقم 71)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Inputs & Violation Options (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* 1. Bakery Selection */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
              <label className="block text-xs font-black text-amber-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-400" />
                1. اختيار المخبز المستهدف بالمخالفة (اختياري لتسجيل المديونية):
              </label>
              <select
                value={selectedBakeryId}
                onChange={(e) => setSelectedBakeryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 text-slate-100 rounded-xl text-xs font-black focus:ring-2 focus:ring-amber-500 text-right"
              >
                <option value="">-- اختر صاحب المخبز من المنظومة --</option>
                {bakeries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bakeryOwnerName} - ماكينة {b.machineNumber} - ({b.village} / {b.localUnit}) - {b.bakeryCategory || 'مخبز بلدي'}
                  </option>
                ))}
              </select>
              {selectedBakery && (
                <div className="mt-2 text-[11px] bg-amber-950/40 border border-amber-800/50 rounded-xl p-2.5 text-amber-200 font-bold flex items-center justify-between">
                  <span>القرية: {selectedBakery.village} | الوحدة: {selectedBakery.localUnit}</span>
                  <span>الحصة الحالية: {selectedBakery.actualQuota || 0} شكارة</span>
                </div>
              )}
            </div>

            {/* 2. Violation Category Selection */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
              <label className="block text-xs font-black text-amber-300 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-amber-400" />
                2. نوع المخالفة وفق جدول الجزاءات التموينية:
              </label>
              <select
                value={violationCategory}
                onChange={(e) => setViolationCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 text-slate-100 rounded-xl text-xs font-black focus:ring-2 focus:ring-amber-500 text-right"
              >
                <option value="UNDERWEIGHT">نقص وزن الخبز البلدي (جرام/رغيف)</option>
                <option value="FLOUR_DISPOSAL">التصرف في الدقيق البلدي المدعم (شكاير/أرغفة)</option>
                <option value="NON_COMPLIANT">إنتاج خبز بلدي غير مطابق للمواصفات</option>
                <option value="SMART_CARDS">تجميع بطاقات تموينية ذكية بدون وجه حق</option>
                <option value="OVERPRICING">بيع الخبز البلدي بأزيد من السعر الرسمي</option>
                <option value="UNAUTHORIZED_STOPPAGE">التوقف عن الإنتاج بدون إذن رسمي من التموين</option>
                <option value="NO_INSPECTION_LOG">عدم وجود سجل التفتيش / عدم الإعلان عن المواعيد</option>
              </select>
            </div>

            {/* Dynamic Inputs Based on Violation Category */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
              <h4 className="text-xs font-black text-cyan-400 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-cyan-400" />
                معايير ومقادير المخالفة المضبوطة:
              </h4>

              {/* Number of missing / violating loaves (common to many) */}
              {(violationCategory === 'UNDERWEIGHT' ||
                violationCategory === 'NON_COMPLIANT' ||
                violationCategory === 'OVERPRICING' ||
                violationCategory === 'FLOUR_DISPOSAL') && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-300">
                      عدد الأرغفة المفقودة أو المخالفة المضبوطة:
                    </label>
                    <span className="text-xs font-black text-amber-400 font-mono">
                      {missingLoaves.toLocaleString()} رغيف
                    </span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={missingLoaves}
                    onChange={(e) => setMissingLoaves(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl font-mono text-xs text-slate-100 text-right focus:ring-2 focus:ring-amber-500"
                  />
                  {violationCategory === 'FLOUR_DISPOSAL' && (
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      💡 ملاحظة: الشيكارة 50كجم تُنتج حوالي 700 رغيف بلدي ({Math.ceil(missingLoaves / 700)} شكارة تعادل كمية الأرغفة).
                    </span>
                  )}
                </div>
              )}

              {/* Underweight specific */}
              {violationCategory === 'UNDERWEIGHT' && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-300">
                      مقدار العجز في وزن الرغيف (جرام):
                    </label>
                    <span className="text-xs font-black text-rose-400 font-mono">
                      {weightDeficitGrams} جرام
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={weightDeficitGrams}
                    onChange={(e) => setWeightDeficitGrams(parseInt(e.target.value) || 1)}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>1 جم (طفيف)</span>
                    <span>15 جم (متوسط)</span>
                    <span>30 جم (جسيم - تصرف)</span>
                  </div>
                </div>
              )}

              {/* Flour disposal specific */}
              {violationCategory === 'FLOUR_DISPOSAL' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      عدد الشكاير المتصرف فيها:
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={flourBagsCount}
                      onChange={(e) => setFlourBagsCount(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      سعر الشيكارة للغرامة (ج.م):
                    </label>
                    <input
                      type="number"
                      value={bagPrice}
                      onChange={(e) => setBagPrice(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      معامل مضاعفة العقوبة:
                    </label>
                    <select
                      value={disposalMultiplier}
                      onChange={(e) => setDisposalMultiplier(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-black text-amber-400 text-right"
                    >
                      <option value={1}>1x (عادية)</option>
                      <option value={2}>2x (مضاعفة للمرة الأولى)</option>
                      <option value={3}>3x (مضاعفة للمرة الثانية/مكرر)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Smart cards specific */}
              {violationCategory === 'SMART_CARDS' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    عدد البطاقات التموينية الذكية المضبوطة بالمخبز:
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={smartCardsCount}
                    onChange={(e) => setSmartCardsCount(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl font-mono text-xs text-slate-100 text-right"
                  />
                </div>
              )}

              {/* Overpricing specific */}
              {violationCategory === 'OVERPRICING' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      السعر الفعلي المباع به (ج.م):
                    </label>
                    <input
                      type="number"
                      step={0.10}
                      value={actualSellingPrice}
                      onChange={(e) => setActualSellingPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl font-mono text-xs text-slate-100 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      السعر الرسمي المقرر (ج.م):
                    </label>
                    <input
                      type="number"
                      step={0.05}
                      value={officialPrice}
                      onChange={(e) => setOfficialPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl font-mono text-xs text-slate-100 text-right"
                    />
                  </div>
                </div>
              )}

              {/* Unauthorized stoppage specific */}
              {violationCategory === 'UNAUTHORIZED_STOPPAGE' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      عدد أيام التوقف دون إذن:
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={stoppageDays}
                      onChange={(e) => setStoppageDays(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl font-mono text-xs text-slate-100 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      الحصة اليومية (شكاير 50كجم):
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={dailyQuotaBags}
                      onChange={(e) => setDailyQuotaBags(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl font-mono text-xs text-slate-100 text-right"
                    />
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Right Column: Calculation Summary & Results Card (5 cols) */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-500/60 rounded-3xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  تقدير قيمة الغرامة التلقائية
                </span>
                <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-black rounded-lg border border-amber-500/30">
                  حساب فوري محمي
                </span>
              </div>

              {/* Main Estimated Fine Card */}
              <div className="text-center py-4 bg-slate-900/90 border border-amber-500/40 rounded-2xl shadow-inner">
                <span className="text-xs font-bold text-slate-400 block mb-1">
                  إجمالي قيمة الغرامة المستحقة
                </span>
                <div className="text-3xl md:text-4xl font-black text-amber-300 tracking-tight font-mono">
                  {calculationResult.grandTotalFine.toLocaleString()}
                  <span className="text-sm font-black text-amber-400 me-2"> ج.م</span>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <div className="space-y-2 text-xs font-bold border-t border-slate-800 pt-3">
                <div className="flex justify-between text-slate-300">
                  <span>الغرامة الأساسية:</span>
                  <span className="font-mono text-white">{calculationResult.baseFine.toLocaleString()} ج.م</span>
                </div>
                {calculationResult.costDiff > 0 && (
                  <div className="flex justify-between text-cyan-300">
                    <span>فروق التكلفة والمصادرة:</span>
                    <span className="font-mono text-cyan-200">+{calculationResult.costDiff.toLocaleString()} ج.م</span>
                  </div>
                )}
                {calculationResult.multiplier > 1 && (
                  <div className="flex justify-between text-rose-300">
                    <span>مضاعفة العقوبة القانونية:</span>
                    <span className="font-mono text-rose-200">{calculationResult.multiplier}x</span>
                  </div>
                )}
              </div>

              {/* Formula & Legal Reference Card */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-[11px] space-y-2">
                <p className="text-slate-300 font-bold leading-relaxed">
                  <strong className="text-amber-400">آلية الحساب:</strong> {calculationResult.formulaDescription}
                </p>
                <p className="text-slate-400 font-semibold border-t border-slate-800/80 pt-2 text-[10px]">
                  <strong className="text-amber-300">السند القانوني:</strong> {calculationResult.legalRef}
                </p>
              </div>

            </div>

            {/* Actions Panel */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleApplyFine}
                className="w-full py-3 px-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black rounded-2xl shadow-xl border border-red-400/50 flex items-center justify-center gap-2 text-xs transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                تسجيل كمديونية جديدة على ملف المخبز
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="py-2.5 px-3 bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/40 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {copiedStatus ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      تم النسخ بالحافظة
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-amber-400" />
                      نسخ الملخص
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrintFineNotice}
                  className="py-2.5 px-3 bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-cyan-400" />
                  طباعة إخطار الغرامة
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500 font-bold">
          <span className="flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            منظومة وزارة التموين والتجارة الداخلية - حاسبة الجزاءات التلقائية
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-black transition cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>
    </div>
  );
};
