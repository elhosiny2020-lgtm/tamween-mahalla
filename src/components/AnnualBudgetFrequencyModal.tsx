import React, { useState, useMemo } from 'react';
import { Bakery, SystemConfig } from '../types';
import { Calendar, DollarSign, FileSpreadsheet, Printer, X, Sparkles, TrendingUp, Award, Layers, RotateCcw } from 'lucide-react';

interface AnnualBudgetFrequencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  bakeries: Bakery[];
  flourBagPrice: number;
  onUpdateFlourBagPrice: (price: number) => void;
  systemConfig: SystemConfig;
}

interface MonthData {
  monthIndex: number;
  monthName: string;
  days: number;
  seasonTag: string;
  seasonWeight: number; // multiplier e.g. 1.15 for Ramadan
}

const MONTHS_TEMPLATE: MonthData[] = [
  { monthIndex: 1, monthName: 'يناير', days: 31, seasonTag: 'شتاء - تشغيل منتظم', seasonWeight: 1.0 },
  { monthIndex: 2, monthName: 'فبراير', days: 28, seasonTag: 'شتاء - تشغيل منتظم', seasonWeight: 1.0 },
  { monthIndex: 3, monthName: 'مارس', days: 31, seasonTag: 'موسم ذروة - شهر رمضان المبارك 🌙', seasonWeight: 1.20 },
  { monthIndex: 4, monthName: 'أبريل', days: 30, seasonTag: 'موسم عطلات - عيد الفطر 🎈', seasonWeight: 1.15 },
  { monthIndex: 5, monthName: 'مايو', days: 31, seasonTag: 'ربيع - تشغيل اعتادي', seasonWeight: 1.0 },
  { monthIndex: 6, monthName: 'يونيو', days: 30, seasonTag: 'صيف - مواسم الأعياد 🐑', seasonWeight: 1.10 },
  { monthIndex: 7, monthName: 'يوليو', days: 31, seasonTag: 'صيف - إجازات ودعم مصايف', seasonWeight: 1.05 },
  { monthIndex: 8, monthName: 'أغسطس', days: 31, seasonTag: 'صيف - إجازات مصايف', seasonWeight: 1.05 },
  { monthIndex: 9, monthName: 'سبتمبر', days: 30, seasonTag: 'بداية العام الدراسي 🎒', seasonWeight: 1.12 },
  { monthIndex: 10, monthName: 'أكتوبر', days: 31, seasonTag: 'خريف - انتظام المدارس', seasonWeight: 1.05 },
  { monthIndex: 11, monthName: 'نوفمبر', days: 30, seasonTag: 'خريف - تشغيل اعتادي', seasonWeight: 1.0 },
  { monthIndex: 12, monthName: 'ديسمبر', days: 31, seasonTag: 'شتاء - نهاية السنة المالية', seasonWeight: 1.0 },
];

export const AnnualBudgetFrequencyModal: React.FC<AnnualBudgetFrequencyModalProps> = ({
  isOpen,
  onClose,
  bakeries,
  flourBagPrice,
  onUpdateFlourBagPrice,
  systemConfig,
}) => {
  const [distributionMode, setDistributionMode] = useState<'EQUAL' | 'SEASONAL'>('SEASONAL');
  const [customWeights, setCustomWeights] = useState<Record<number, number>>({});

  // Total Daily Quota across all active bakeries
  const totalDailyQuotaBags = useMemo(() => {
    return bakeries.reduce((sum, b) => sum + (b.actualQuota || 0), 0);
  }, [bakeries]);

  // Total Loaves per day (each 50kg bag yields 1,350 loaves)
  const totalDailyLoaves = useMemo(() => {
    return totalDailyQuotaBags * 1350;
  }, [totalDailyQuotaBags]);

  // Calculated Monthly Frequency Data
  const monthlyData = useMemo(() => {
    return MONTHS_TEMPLATE.map((m) => {
      const weight = customWeights[m.monthIndex] ?? (distributionMode === 'SEASONAL' ? m.seasonWeight : 1.0);
      
      const effectiveDailyBags = totalDailyQuotaBags * weight;
      const monthlyBags = Math.round(effectiveDailyBags * m.days);
      const monthlyTons = (monthlyBags * 50) / 1000;
      const monthlyLoaves = monthlyBags * 1350;
      const monthlyCostEGP = monthlyBags * flourBagPrice;

      return {
        ...m,
        weight,
        monthlyBags,
        monthlyTons,
        monthlyLoaves,
        monthlyCostEGP,
      };
    });
  }, [MONTHS_TEMPLATE, customWeights, distributionMode, totalDailyQuotaBags, flourBagPrice]);

  // Annual Totals
  const annualTotals = useMemo(() => {
    let totalBags = 0;
    let totalTons = 0;
    let totalLoaves = 0;
    let totalCostEGP = 0;

    monthlyData.forEach((m) => {
      totalBags += m.monthlyBags;
      totalTons += m.monthlyTons;
      totalLoaves += m.monthlyLoaves;
      totalCostEGP += m.monthlyCostEGP;
    });

    const averageMonthlyCost = totalCostEGP / 12;

    return {
      totalBags,
      totalTons,
      totalLoaves,
      totalCostEGP,
      averageMonthlyCost,
    };
  }, [monthlyData]);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    const headers = [
      'شهر السنة',
      'عدد أيام الشهر',
      'معامل التكرار والموسم',
      'حصة الشكاير الشهرية',
      'حصة الطن الشهرية',
      'إنتاج الأرغفة التقديري',
      'ميزانية الدقيق الشهرية (ج.م)',
      'نسبة الميزانية التقديرية',
      'ملاحظات الموسم',
    ];

    const rows = monthlyData.map((m) => {
      const pct = ((m.monthlyCostEGP / annualTotals.totalCostEGP) * 100).toFixed(2);
      return [
        `"${m.monthName}"`,
        m.days,
        `${m.weight}x`,
        m.monthlyBags,
        m.monthlyTons.toFixed(1),
        m.monthlyLoaves,
        m.monthlyCostEGP,
        `"${pct}%"`,
        `"${m.seasonTag.replace(/"/g, '""')}"`,
      ];
    });

    const summaryRow = [
      '"إجمالي السنوي المتوقع"',
      365,
      '-',
      annualTotals.totalBags,
      annualTotals.totalTons.toFixed(1),
      annualTotals.totalLoaves,
      annualTotals.totalCostEGP,
      '"100%"',
      '"ميزانية تكرار سنوية كاملة"',
    ];

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(',')), summaryRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `جدول_التكرار_السنوي_للميزانية_التقديرية_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-purple-500/80 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto text-slate-100 p-5 md:p-7 space-y-5">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 border border-purple-500/50 rounded-2xl text-purple-300">
              <Calendar className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-purple-300">
                أداة جدول التكرار السنوي وتوزيع الميزانية التقديرية
              </h2>
              <p className="text-xs text-slate-400 font-bold">
                تحليل تفاعلي لتوزيع ميزانية الدقيق البلدي المدعم على أشهر السنة الـ 12 ومواسم الذروة
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

        {/* Dynamic Controls Bar */}
        <div className="bg-slate-950 border border-purple-500/30 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          
          {/* Price Adjustment */}
          <div className="space-y-1">
            <label className="block text-xs font-black text-amber-300">
              متوسط سعر شيكارة الدقيق (50كجم):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={100}
                max={5000}
                value={flourBagPrice}
                onChange={(e) => onUpdateFlourBagPrice(Math.max(1, Number(e.target.value) || 0))}
                className="w-full px-3 py-1.5 bg-slate-900 border border-amber-500/50 rounded-xl text-xs font-black text-amber-300 text-center font-mono focus:ring-2 focus:ring-amber-400"
              />
              <span className="text-xs font-bold text-slate-400">ج.م</span>
            </div>
          </div>

          {/* Distribution Mode Switcher */}
          <div className="space-y-1">
            <label className="block text-xs font-black text-purple-300">
              نموذج توزيع التكرار والمواسم:
            </label>
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setDistributionMode('SEASONAL');
                  setCustomWeights({});
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition cursor-pointer ${
                  distributionMode === 'SEASONAL'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                مواسم الذروة والأعياد 🌙
              </button>
              <button
                type="button"
                onClick={() => {
                  setDistributionMode('EQUAL');
                  setCustomWeights({});
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition cursor-pointer ${
                  distributionMode === 'EQUAL'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                توزيع متساوي 100% ⚖️
              </button>
            </div>
          </div>

          {/* Current Daily Quota Context */}
          <div className="bg-purple-950/40 border border-purple-500/30 rounded-xl p-2.5 text-center">
            <span className="text-[11px] font-bold text-slate-300 block mb-0.5">
              إجمالي الحصة اليومية بالمركز:
            </span>
            <span className="text-base font-black text-amber-300 font-mono">
              {totalDailyQuotaBags.toLocaleString()} <span className="text-xs text-amber-400">شكارة/يوم</span>
            </span>
            <span className="text-[10px] text-purple-300 block">
              ({((totalDailyQuotaBags * 50) / 1000).toFixed(1)} طن يومياً)
            </span>
          </div>

        </div>

        {/* Top Summary Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-center">
            <span className="text-[11px] font-bold text-slate-400 block mb-0.5">إجمالي الشكاير السنوية</span>
            <span className="text-lg font-black text-amber-300 font-mono block">
              {annualTotals.totalBags.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 font-bold">شكارة</span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-center">
            <span className="text-[11px] font-bold text-slate-400 block mb-0.5">إجمالي الأطنان السنوية</span>
            <span className="text-lg font-black text-cyan-300 font-mono block">
              {annualTotals.totalTons.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 font-bold">طن دقيق</span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-center">
            <span className="text-[11px] font-bold text-slate-400 block mb-0.5">الميزانية السنوية التقديرية</span>
            <span className="text-lg font-black text-emerald-300 font-mono block">
              {(annualTotals.totalCostEGP / 1000000).toLocaleString('ar-EG', { maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-emerald-400 font-bold">مليون ج.م</span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-center">
            <span className="text-[11px] font-bold text-slate-400 block mb-0.5">متوسط الميزانية الشهرية</span>
            <span className="text-lg font-black text-purple-300 font-mono block">
              {(annualTotals.averageMonthlyCost / 1000000).toLocaleString('ar-EG', { maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-purple-400 font-bold">مليون ج.م / شهرياً</span>
          </div>
        </div>

        {/* 12-Month Interactive Breakdown Table */}
        <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto max-h-[420px]">
            <table className="w-full text-center border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-black text-amber-300 font-black border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-2 border-l border-slate-800">الشهر</th>
                  <th className="py-2.5 px-2 border-l border-slate-800">عدد الأيام</th>
                  <th className="py-2.5 px-2 border-l border-slate-800">معامل التكرار والموسم</th>
                  <th className="py-2.5 px-2 border-l border-slate-800">الحصة بالشكاير</th>
                  <th className="py-2.5 px-2 border-l border-slate-800">الحصة بالأطنان</th>
                  <th className="py-2.5 px-2 border-l border-slate-800">إنتاج الأرغفة التقديري</th>
                  <th className="py-2.5 px-2 border-l border-slate-800 bg-purple-950/80 text-purple-200">
                    ميزانية الدقيق التقديرية (ج.م)
                  </th>
                  <th className="py-2.5 px-2 border-l border-slate-800">النسبة من السنوي</th>
                  <th className="py-2.5 px-2 border-l border-slate-800 text-right min-w-[160px]">طبيعة الموسم التمويني</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-bold">
                {monthlyData.map((m) => {
                  const pct = ((m.monthlyCostEGP / annualTotals.totalCostEGP) * 100).toFixed(1);
                  const isRamadan = m.seasonTag.includes('رمضان') || m.seasonTag.includes('أعياد');

                  return (
                    <tr
                      key={m.monthIndex}
                      className={`hover:bg-slate-900/90 transition-colors ${
                        isRamadan ? 'bg-purple-950/30' : m.monthIndex % 2 === 0 ? 'bg-slate-950' : 'bg-slate-900/40'
                      }`}
                    >
                      <td className="py-2.5 px-2 border-l border-slate-800 font-black text-slate-100">
                        {m.monthIndex}. {m.monthName}
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-800 font-mono text-slate-400">{m.days} يوم</td>
                      
                      {/* Weight Selector */}
                      <td className="py-2.5 px-2 border-l border-slate-800">
                        <select
                          value={m.weight}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setCustomWeights((prev) => ({ ...prev, [m.monthIndex]: val }));
                          }}
                          className="px-2 py-0.5 bg-black border border-purple-500/40 rounded text-amber-300 font-mono font-black text-[11px]"
                        >
                          <option value={1.0}>1.0x (اعتيادي)</option>
                          <option value={1.05}>1.05x (+5%)</option>
                          <option value={1.10}>1.10x (+10%)</option>
                          <option value={1.15}>1.15x (+15%)</option>
                          <option value={1.20}>1.20x (+20% ذروة)</option>
                          <option value={1.25}>1.25x (+25% أقصى)</option>
                        </select>
                      </td>

                      <td className="py-2.5 px-2 border-l border-slate-800 font-mono text-amber-300">
                        {m.monthlyBags.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-800 font-mono text-cyan-300">
                        {m.monthlyTons.toFixed(1)} طن
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-800 font-mono text-slate-300">
                        {m.monthlyLoaves.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-800 font-mono font-black text-emerald-300 bg-emerald-950/20">
                        {m.monthlyCostEGP.toLocaleString()} ج.م
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-800 font-mono text-purple-300">
                        {pct}%
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-800 text-right text-[11px] text-slate-300">
                        {m.seasonTag}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Footer Summary */}
              <tfoot className="bg-purple-950/90 text-white font-black border-t-2 border-purple-500">
                <tr>
                  <td className="py-3 px-2 border-l border-slate-800 text-amber-300">الإجمالي السنوي</td>
                  <td className="py-3 px-2 border-l border-slate-800 font-mono">365 يوم</td>
                  <td className="py-3 px-2 border-l border-slate-800 font-mono text-amber-300">المعدل العام</td>
                  <td className="py-3 px-2 border-l border-slate-800 font-mono text-amber-300">
                    {annualTotals.totalBags.toLocaleString()}
                  </td>
                  <td className="py-3 px-2 border-l border-slate-800 font-mono text-cyan-300">
                    {annualTotals.totalTons.toFixed(1)} طن
                  </td>
                  <td className="py-3 px-2 border-l border-slate-800 font-mono">
                    {annualTotals.totalLoaves.toLocaleString()}
                  </td>
                  <td className="py-3 px-2 border-l border-slate-800 font-mono text-emerald-300 text-sm">
                    {annualTotals.totalCostEGP.toLocaleString()} ج.م
                  </td>
                  <td className="py-3 px-2 border-l border-slate-800 font-mono text-amber-300">100%</td>
                  <td className="py-3 px-2 border-l border-slate-800 text-right text-[11px]">ميزانية تكرار سنوية معتمدة</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <button
            type="button"
            onClick={() => setCustomWeights({})}
            className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>إعادة ضبط التكرار للمفترض</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl font-black shadow-md border border-emerald-600 flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>تصدير كشف التكرار لـ Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrintReport}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-xl font-black shadow-md border border-purple-500 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-purple-200" />
              <span>طباعة تقرير التكرار A4</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-black transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
