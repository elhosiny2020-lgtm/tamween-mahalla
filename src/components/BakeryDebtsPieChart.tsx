import React, { useMemo, useState } from 'react';
import { Bakery, DebtRecord } from '../types';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { PieChart, Percent, DollarSign, AlertTriangle, TrendingUp, ChevronDown, ChevronUp, Store, MapPin } from 'lucide-react';

interface BakeryDebtsPieChartProps {
  bakeries: Bakery[];
  debts: DebtRecord[];
  onSelectBakeryFilter?: (bakeryId: string) => void;
}

const COLOR_PALETTE = [
  '#dc2626', // Red
  '#e11d48', // Rose / Crimson
  '#ea580c', // Orange
  '#d97706', // Amber
  '#9333ea', // Purple
  '#4f46e5', // Indigo
  '#2563eb', // Blue
  '#0d9488', // Teal
  '#059669', // Emerald
  '#64748b', // Slate for others
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      name: string;
      value: number;
      percentage: string;
      machineNumber?: string;
      village?: string;
      localUnit?: string;
      bakeryId?: string;
      isOthers?: boolean;
      bakeryCount?: number;
    };
  }>;
}

const CustomPieTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-950/95 text-white p-3.5 rounded-2xl shadow-2xl border-2 border-amber-500/60 backdrop-blur-md max-w-xs text-right space-y-1.5 animate-in fade-in zoom-in-95 z-50">
        <div className="flex items-center gap-2 border-b border-amber-500/30 pb-1.5">
          <Store className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-black text-amber-300 truncate">{data.name}</span>
        </div>

        {!data.isOthers ? (
          <>
            {data.machineNumber && (
              <div className="text-[11px] text-slate-300 font-bold flex items-center justify-between">
                <span>رقم الماكينة:</span>
                <span className="font-mono text-amber-200 font-black">{data.machineNumber}</span>
              </div>
            )}
            {data.village && (
              <div className="text-[11px] text-slate-300 font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>{data.village} {data.localUnit ? `- ${data.localUnit}` : ''}</span>
              </div>
            )}
          </>
        ) : (
          <div className="text-[11px] text-slate-300 font-bold">
            مجموعة تضم {data.bakeryCount} مخابز متبقية عليها مديونيات أقل.
          </div>
        )}

        <div className="pt-1 border-t border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-rose-300">المديونية المستحقة:</span>
            <span className="text-white num-enlarged">{data.value.toLocaleString()} ج.م</span>
          </div>
          <div className="flex items-center justify-between text-xs font-black bg-amber-500/20 px-2 py-1 rounded-lg border border-amber-400/40">
            <span className="text-amber-300 flex items-center gap-1">
              <Percent className="w-3 h-3 text-amber-400" /> النسبة من إجمالي المنظومة:
            </span>
            <span className="text-amber-200 font-extrabold">{data.percentage}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const BakeryDebtsPieChart: React.FC<BakeryDebtsPieChartProps> = ({
  bakeries,
  debts,
  onSelectBakeryFilter,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Compute total debt per bakery and total system debt
  const { chartData, totalSystemDebt, bakeryDebtsList, highestDebtBakery, averageDebtPerBakery } = useMemo(() => {
    // Map of bakery ID -> sum netRemainingDebt
    const debtMap: Record<string, number> = {};

    // First sum from debts array
    debts.forEach((d) => {
      if (d.bakeryId && d.netRemainingDebt > 0) {
        debtMap[d.bakeryId] = (debtMap[d.bakeryId] || 0) + d.netRemainingDebt;
      }
    });

    let totalSystemDebt = 0;
    const list: Array<{
      bakeryId: string;
      name: string;
      machineNumber: string;
      village: string;
      localUnit: string;
      value: number;
    }> = [];

    bakeries.forEach((b) => {
      const debt = debtMap[b.id] || 0;
      if (debt > 0) {
        totalSystemDebt += debt;
        list.push({
          bakeryId: b.id,
          name: b.bakeryOwnerName,
          machineNumber: b.machineNumber,
          village: b.village,
          localUnit: b.localUnit,
          value: debt,
        });
      }
    });

    // Sort descending by debt
    list.sort((a, b) => b.value - a.value);

    const highestDebtBakery = list.length > 0 ? list[0] : null;
    const averageDebtPerBakery = list.length > 0 ? Math.round(totalSystemDebt / list.length) : 0;

    // Build slice data for PieChart (Top 7 + Others if > 8)
    const chartSlices: Array<{
      name: string;
      value: number;
      percentage: string;
      machineNumber?: string;
      village?: string;
      localUnit?: string;
      bakeryId?: string;
      isOthers?: boolean;
      bakeryCount?: number;
      color: string;
    }> = [];

    if (list.length <= 8) {
      list.forEach((item, idx) => {
        const pct = totalSystemDebt > 0 ? ((item.value / totalSystemDebt) * 100).toFixed(1) : '0';
        chartSlices.push({
          ...item,
          percentage: pct,
          color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
        });
      });
    } else {
      // Top 7 individually
      const top7 = list.slice(0, 7);
      top7.forEach((item, idx) => {
        const pct = totalSystemDebt > 0 ? ((item.value / totalSystemDebt) * 100).toFixed(1) : '0';
        chartSlices.push({
          ...item,
          percentage: pct,
          color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
        });
      });

      // Remaining bundled into Others
      const others = list.slice(7);
      const othersSum = others.reduce((acc, curr) => acc + curr.value, 0);
      const othersPct = totalSystemDebt > 0 ? ((othersSum / totalSystemDebt) * 100).toFixed(1) : '0';

      chartSlices.push({
        name: `باقي المخابز (${others.length} مخابز)`,
        value: othersSum,
        percentage: othersPct,
        isOthers: true,
        bakeryCount: others.length,
        color: COLOR_PALETTE[7],
      });
    }

    return {
      chartData: chartSlices,
      totalSystemDebt,
      bakeryDebtsList: list,
      highestDebtBakery,
      averageDebtPerBakery,
    };
  }, [bakeries, debts]);

  if (totalSystemDebt <= 0 || bakeryDebtsList.length === 0) {
    return (
      <div className="bg-slate-900 border-2 border-emerald-900/50 rounded-2xl p-5 text-center shadow-xl no-print">
        <div className="w-12 h-12 mx-auto mb-2 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/40">
          <PieChart className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-black text-emerald-300">لا توجد أي مديونيات مستحقة على المخابز حالياً</h4>
        <p className="text-xs text-slate-400 font-bold mt-1">كافة المخابز مديونياتها مسددة بالكامل (0 ج.م).</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border-2 border-slate-800 hover:border-amber-600/40 rounded-2xl p-4 shadow-xl transition-all duration-300 space-y-4 no-print">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-red-600 to-rose-700 rounded-xl text-white shadow-md border border-red-400/40">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white">
                الرسم البياني الدائري لتوزيع نسب المديونيات على المخابز (Pie Chart)
              </h3>
              <span className="px-2.5 py-0.5 bg-rose-950 text-rose-300 border border-rose-700/60 rounded-full text-[10px] font-black animate-pulse">
                تفاعل فوري عند المرور
              </span>
            </div>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              مقارنة نسبة مديونية كل مخبز بالنسق المئوي إزاء إجمالي مديونيات المنظومة ({totalSystemDebt.toLocaleString()} ج.م)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-black transition cursor-pointer"
        >
          <span>{isExpanded ? 'إخفاء الرسم البياني' : 'عرض الرسم البياني'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/* Quick Summary Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-right">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">إجمالي مديونيات المنظومة</span>
                <span className="text-sm font-black text-white num-enlarged">{totalSystemDebt.toLocaleString()} ج.م</span>
              </div>
              <div className="p-2 bg-red-950 text-rose-400 rounded-lg border border-red-800/40">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">المخبز الأعلى مديونية</span>
                <span className="text-xs font-black text-amber-300 truncate max-w-[140px] block">
                  {highestDebtBakery ? highestDebtBakery.name : 'لا يوجد'}
                </span>
                {highestDebtBakery && (
                  <span className="text-[10px] text-rose-400 font-extrabold block">
                    {highestDebtBakery.value.toLocaleString()} ج.م ({((highestDebtBakery.value / totalSystemDebt) * 100).toFixed(1)}%)
                  </span>
                )}
              </div>
              <div className="p-2 bg-amber-950 text-amber-400 rounded-lg border border-amber-800/40">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">متوسط مديونية المخبز المدين</span>
                <span className="text-sm font-black text-cyan-300 num-enlarged">{averageDebtPerBakery.toLocaleString()} ج.م</span>
                <span className="text-[10px] text-slate-500 font-bold block">من بين {bakeryDebtsList.length} مخابز مدينة</span>
              </div>
              <div className="p-2 bg-cyan-950 text-cyan-400 rounded-lg border border-cyan-800/40">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Chart & Legends Area */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-slate-950/80 border border-slate-800 rounded-xl p-4">
            {/* Pie Chart Visual Container */}
            <div className="lg:col-span-7 h-72 sm:h-80 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={120}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                    animationDuration={1000}
                    animationEasing="ease-out"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="#0f172a"
                        strokeWidth={2}
                        className="transition-all duration-300 hover:opacity-80 hover:scale-105 cursor-pointer"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </RechartsPieChart>
              </ResponsiveContainer>

              {/* Center Donut Label */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <span className="text-[10px] font-black text-slate-400 block">إجمالي المستحق</span>
                <span className="text-xs font-black text-amber-300 num-enlarged block">
                  {(totalSystemDebt / 1000).toFixed(0)} ألف ج.م
                </span>
                <span className="text-[9px] text-slate-400 font-bold block">{bakeryDebtsList.length} مخبز مدين</span>
              </div>
            </div>

            {/* Interactive Legend & List Breakdown */}
            <div className="lg:col-span-5 space-y-2 max-h-72 overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-xs font-black text-slate-400 border-b border-slate-800 pb-1.5 mb-2">
                <span>اسم المخبز والمنطقة</span>
                <span>المديونية / النسبة</span>
              </div>

              {chartData.map((item, idx) => (
                <div
                  key={`${item.name}-${idx}`}
                  onClick={() => {
                    if (item.bakeryId && onSelectBakeryFilter) {
                      onSelectBakeryFilter(item.bakeryId);
                    }
                  }}
                  className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition cursor-pointer ${
                    item.bakeryId
                      ? 'bg-slate-900 border-slate-800 hover:border-amber-500/60 hover:bg-slate-850'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                  title={item.bakeryId ? 'انقر لتصفية مديونيات هذا المخبز فقط' : undefined}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-black text-white truncate block">{item.name}</span>
                      {!item.isOthers && item.village && (
                        <span className="text-[10px] text-slate-400 font-bold block truncate">
                          {item.village} {item.machineNumber ? `(ماكينة ${item.machineNumber})` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <span className="text-xs font-black text-amber-300 num-enlarged block">
                      {item.value.toLocaleString()} ج.م
                    </span>
                    <span className="text-[10px] text-amber-400/90 font-extrabold block">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
