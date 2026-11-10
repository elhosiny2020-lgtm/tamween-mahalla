import React, { useState, useMemo } from 'react';
import { Bakery, DebtRecord, VillageHierarchy } from '../types';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList
} from 'recharts';
import {
  PieChart as PieIcon,
  BarChart3,
  Filter,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Download,
  ShieldAlert,
  Table as TableIcon
} from 'lucide-react';
import { downloadWindowsExeLauncher, downloadUpdatedAppHtml } from '../utils/htmlExporter';
import { D3DebtAnalysisChart } from './D3DebtAnalysisChart';

interface BakeryAnalyticsChartsProps {
  bakeries: Bakery[];
  debts?: DebtRecord[];
  villages: VillageHierarchy[];
  onSelectTierFilter?: (minAmount: number, maxAmount: number, tierLabel: string) => void;
}

const COLORS = [
  '#d97706', '#2563eb', '#10b981', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f59e0b', '#3b82f6', '#10b981', '#ec4899',
  '#6366f1', '#14b8a6', '#f97316', '#84cc16', '#a855f7'
];

export const BakeryAnalyticsCharts: React.FC<BakeryAnalyticsChartsProps> = ({
  bakeries,
  debts = [],
  villages,
  onSelectTierFilter
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedVillageFilter, setSelectedVillageFilter] = useState('ALL');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState('ALL');
  const [chartType, setChartType] = useState<'quotas' | 'loaves' | 'debts'>('quotas');
  const [exeToastMsg, setExeToastMsg] = useState<string | null>(null);

  // Compute map of remaining debts per bakery
  const bakeryDebtsMap = useMemo(() => {
    const map: Record<string, number> = {};
    debts.forEach((d) => {
      map[d.bakeryId] = (map[d.bakeryId] || 0) + (d.netRemainingDebt || 0);
    });
    return map;
  }, [debts]);

  // Filtered bakeries based on analytics filters
  const filteredData = useMemo(() => {
    return bakeries.filter((b) => {
      if (selectedVillageFilter !== 'ALL' && b.village !== selectedVillageFilter) return false;
      if (selectedUnitFilter !== 'ALL' && b.localUnit !== selectedUnitFilter) return false;
      return true;
    });
  }, [bakeries, selectedVillageFilter, selectedUnitFilter]);

  // Aggregated data by Village / Local Unit
  const barChartData = useMemo(() => {
    const map = new Map<string, { name: string; insuranceQuota: number; actualQuota: number; loavesCount: number; totalRemainingDebt: number; bakeryCount: number }>();

    filteredData.forEach((b) => {
      const key = selectedVillageFilter === 'ALL' ? b.village : b.localUnit;
      const current = map.get(key) || { name: key, insuranceQuota: 0, actualQuota: 0, loavesCount: 0, totalRemainingDebt: 0, bakeryCount: 0 };
      current.insuranceQuota += b.insuranceQuota || 0;
      current.actualQuota += b.actualQuota || 0;
      current.loavesCount += b.loavesCount || 0;
      current.totalRemainingDebt += bakeryDebtsMap[b.id] || 0;
      current.bakeryCount += 1;
      map.set(key, current);
    });

    const result = Array.from(map.values());
    if (chartType === 'debts') {
      return result.sort((a, b) => b.totalRemainingDebt - a.totalRemainingDebt);
    }
    return result.sort((a, b) => b.actualQuota - a.actualQuota);
  }, [filteredData, selectedVillageFilter, bakeryDebtsMap, chartType]);

  // Activity distribution pie chart data
  const pieChartData = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach((b) => {
      const status = b.activityStatus || 'غير محدد';
      map.set(status, (map.get(status) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Quota breakdown pie chart data (top 6 villages / units)
  const quotaPieData = useMemo(() => {
    const top = barChartData.slice(0, 6);
    const others = barChartData.slice(6);
    const result = top.map((item) => ({ name: item.name, value: item.actualQuota }));
    
    if (others.length > 0) {
      const othersTotal = others.reduce((acc, curr) => acc + curr.actualQuota, 0);
      result.push({ name: 'باقي القرى والوحدات', value: othersTotal });
    }
    return result;
  }, [barChartData]);

  // Total summary for current view
  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, b) => ({
        insurance: acc.insurance + (b.insuranceQuota || 0),
        actual: acc.actual + (b.actualQuota || 0),
        loaves: acc.loaves + (b.loavesCount || 0),
        debts: acc.debts + (bakeryDebtsMap[b.id] || 0),
        count: acc.count + 1
      }),
      { insurance: 0, actual: 0, loaves: 0, debts: 0, count: 0 }
    );
  }, [filteredData, bakeryDebtsMap]);

  return (
    <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl shadow-2xl overflow-hidden no-print mb-5">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-black via-slate-950 to-black text-white px-4 py-3 flex items-center justify-between flex-wrap gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
            <BarChart3 className="w-5 h-5 icon-animated" />
          </div>
          <div>
            <h3 className="text-sm font-black text-amber-300">
              الرسوم البيانية والإحصائيات التفاعلية لتوزيع الحصص وتراكم المديونيات
            </h3>
            <p className="text-[11px] text-slate-400 font-bold">
              مقارنة الحصص التموينية وتتبع القرى الأكثر تراكماً للمديونيات (Area & Bar Charts)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick EXE Launcher Download Button */}
          <button
            onClick={async () => {
              setExeToastMsg('جاري تنزيل برنامج المنظومة (EXE) وتثبيت أيقونة سطح المكتب...');
              const res = await downloadWindowsExeLauncher();
              setExeToastMsg(res.message);
              setTimeout(() => setExeToastMsg(null), 5000);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer border border-amber-300"
            title="تحميل مشغل ويندوز التنفيذي (EXE) وتثبيت أيقونة سطح المكتب فوراً"
          >
            <Download className="w-3.5 h-3.5 text-slate-950 icon-animated" />
            <span>تحميل التطبيق (EXE)</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-amber-300 rounded-xl text-xs font-black transition-all duration-300 border border-amber-500/30 hover:border-amber-400 cursor-pointer shadow-sm"
          >
            {isExpanded ? (
              <>
                <span>إخفاء الرسوم البيانية</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>عرض الرسوم البيانية التفاعلية</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {exeToastMsg && (
        <div className="bg-amber-950/90 border-b border-amber-600/50 px-4 py-2 text-xs font-black text-amber-200 text-center animate-in fade-in flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          <span>{exeToastMsg}</span>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-black/60">
          {/* Controls & Filters Bar */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center flex-wrap gap-3">
              {/* Village Filter */}
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-300">
                <Filter className="w-4 h-4 text-amber-400" />
                <span>القرية:</span>
                <select
                  value={selectedVillageFilter}
                  onChange={(e) => {
                    setSelectedVillageFilter(e.target.value);
                    setSelectedUnitFilter('ALL');
                  }}
                  className="px-3 py-1.5 bg-black border border-slate-700 rounded-xl font-black text-slate-100 text-xs focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="ALL">جميع القرى بالمركز ({villages.length})</option>
                  {villages.map((v) => (
                    <option key={v.village} value={v.village}>
                      {v.village}
                    </option>
                  ))}
                </select>
              </div>

              {/* Local Unit Filter */}
              {selectedVillageFilter !== 'ALL' && (
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-300">
                  <span>الوحدة المحلية:</span>
                  <select
                    value={selectedUnitFilter}
                    onChange={(e) => setSelectedUnitFilter(e.target.value)}
                    className="px-3 py-1.5 bg-black border border-slate-700 rounded-xl font-black text-slate-100 text-xs focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="ALL">كافة الوحدات التابعة لـ ({selectedVillageFilter})</option>
                    {villages
                      .find((v) => v.village === selectedVillageFilter)
                      ?.localUnits.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Chart Mode Switcher */}
              <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-black gap-1">
                <button
                  onClick={() => setChartType('quotas')}
                  className={`px-3 py-1 rounded-lg transition-all duration-200 ${
                    chartType === 'quotas'
                      ? 'bg-amber-600 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  الحصص (شيكارة)
                </button>
                <button
                  onClick={() => setChartType('loaves')}
                  className={`px-3 py-1 rounded-lg transition-all duration-200 ${
                    chartType === 'loaves'
                      ? 'bg-emerald-700 text-white font-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  الأرغفة اليومية
                </button>
                <button
                  onClick={() => setChartType('debts')}
                  className={`px-3 py-1 rounded-lg transition-all duration-200 flex items-center gap-1 ${
                    chartType === 'debts'
                      ? 'bg-red-700 text-white font-black shadow-sm'
                      : 'text-slate-400 hover:text-red-400'
                  }`}
                  title="عرض رسم بياني مساحي (Area Chart) لتراكم المديونيات المتبقية لكل قرية"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>تراكم المديونيات (Area Chart)</span>
                </button>
              </div>
            </div>

            {/* Quick Summary Pill */}
            <div className="flex items-center gap-3 text-xs font-black text-slate-300 bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-800 shadow-inner">
              <span>المخابز: <strong className="text-amber-400">{totals.count}</strong></span>
              <span className="text-slate-700">|</span>
              <span>تأمينية: <strong className="text-amber-300">{totals.insurance.toLocaleString()}</strong></span>
              <span className="text-slate-700">|</span>
              <span>فعلية: <strong className="text-cyan-300">{totals.actual.toLocaleString()}</strong></span>
              <span className="text-slate-700">|</span>
              <span>المديونيات: <strong className="text-rose-400">{totals.debts.toLocaleString()}</strong> ج.م</span>
            </div>
          </div>

          {/* D3.js Debt Value Categories Donut Chart & Analytical Cards */}
          <D3DebtAnalysisChart
            bakeries={filteredData}
            debts={debts}
            onSelectTierFilter={onSelectTierFilter}
          />

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main Interactive Chart (2 columns width) with Explicit Numbers */}
            <div className="lg:col-span-2 bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h4 className="text-xs font-black text-slate-100 flex items-center gap-2">
                  {chartType === 'debts' ? (
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                  ) : (
                    <BarChart3 className="w-4 h-4 text-amber-400" />
                  )}
                  <span>
                    {chartType === 'quotas'
                      ? `مقارنة الحصة التأمينية والفعلية بالأرقام المباشرة حسب ${selectedVillageFilter === 'ALL' ? 'القرية' : 'الوحدة المحلية'}`
                      : chartType === 'loaves'
                      ? `إجمالي الأرغفة المنتجة يومياً بالأرقام المباشرة حسب ${selectedVillageFilter === 'ALL' ? 'القرية' : 'الوحدة المحلية'}`
                      : `رسم بياني مساحي (Area Chart) لتراكم المديونيات المتبقية بالأرقام حسب ${selectedVillageFilter === 'ALL' ? 'القرية' : 'الوحدة المحلية'}`}
                  </span>
                </h4>
                <span className="text-[10px] text-slate-300 font-bold bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-lg shadow-inner">
                  {chartType === 'debts' ? 'الأرقام بالجنيه المصري (ج.م)' : 'الأرقام بالشيكارة والرغيف مباشرة'}
                </span>
              </div>

              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'debts' ? (
                    <AreaChart data={barChartData} margin={{ top: 20, right: 15, left: 15, bottom: 35 }}>
                      <defs>
                        <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.85} />
                          <stop offset="95%" stopColor="#991b1b" stopOpacity={0.15} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 800, fill: '#cbd5e1' }} interval={0} angle={-25} textAnchor="end" />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#020617',
                          borderColor: '#ef4444',
                          borderRadius: '12px',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          direction: 'rtl',
                          textAlign: 'right'
                        }}
                        formatter={(val: unknown) => [`${Number(val || 0).toLocaleString()} ج.م`, 'إجمالي المديونية المتبقية']}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                      <Area
                        type="monotone"
                        dataKey="totalRemainingDebt"
                        name="إجمالي المديونيات المتبقية (ج.م)"
                        stroke="#ef4444"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#debtGradient)"
                      >
                        <LabelList
                          dataKey="totalRemainingDebt"
                          position="top"
                          fill="#f87171"
                          fontSize={10}
                          fontWeight={900}
                          formatter={(v: unknown) => (Number(v) > 0 ? `${Number(v).toLocaleString()} ج` : '')}
                        />
                      </Area>
                    </AreaChart>
                  ) : (
                    <BarChart data={barChartData} margin={{ top: 20, right: 15, left: 15, bottom: 35 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 800, fill: '#cbd5e1' }} interval={0} angle={-25} textAnchor="end" />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#020617',
                          borderColor: '#f59e0b',
                          borderRadius: '12px',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          direction: 'rtl',
                          textAlign: 'right'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                      {chartType === 'quotas' ? (
                        <>
                          <Bar dataKey="insuranceQuota" name="الحصة التأمينية (شيكارة)" fill="#d97706" radius={[6, 6, 0, 0]}>
                            <LabelList
                              dataKey="insuranceQuota"
                              position="top"
                              fill="#fbbf24"
                              fontSize={10}
                              fontWeight={900}
                              formatter={(v: unknown) => (Number(v) > 0 ? Number(v).toLocaleString() : '')}
                            />
                          </Bar>
                          <Bar dataKey="actualQuota" name="الحصة الفعلية (شيكارة)" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                            <LabelList
                              dataKey="actualQuota"
                              position="top"
                              fill="#60a5fa"
                              fontSize={10}
                              fontWeight={900}
                              formatter={(v: unknown) => (Number(v) > 0 ? Number(v).toLocaleString() : '')}
                            />
                          </Bar>
                        </>
                      ) : (
                        <Bar dataKey="loavesCount" name="إجمالي الأرغفة اليومية (رغيف)" fill="#10b981" radius={[6, 6, 0, 0]}>
                          <LabelList
                            dataKey="loavesCount"
                            position="top"
                            fill="#34d399"
                            fontSize={10}
                            fontWeight={900}
                            formatter={(v: unknown) => (Number(v) > 0 ? Number(v).toLocaleString() : '')}
                          />
                        </Bar>
                      )}
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart (1 column width) */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-xl space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h4 className="text-xs font-black text-slate-100 flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-amber-400" />
                  <span>توزيع الحصة الفعلية بالأرقام والنسب</span>
                </h4>
              </div>

              <div className="h-60 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={quotaPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} (${((percent || 0) * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {quotaPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#020617',
                        borderColor: '#eab308',
                        borderRadius: '12px',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        direction: 'rtl'
                      }}
                      formatter={(val: unknown) => [`${Number(val || 0).toLocaleString()} شيكارة`, 'الحصة الفعلية']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Activity Status Breakdown Pills */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-center gap-2">
                {pieChartData.map((st, idx) => (
                  <span
                    key={st.name}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border"
                    style={{
                      backgroundColor: `${COLORS[idx % COLORS.length]}20`,
                      borderColor: COLORS[idx % COLORS.length],
                      color: '#f8fafc'
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span>{st.name}:</span>
                    <strong className="text-amber-300">{st.value} مخبز</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* New Explicit Numbers Analytical Table for Administrative Decision-Making */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="bg-gradient-to-r from-black via-slate-900 to-black text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-black text-amber-300">
                  جدول التحليل الإحصائي الرقمي المباشر ({selectedVillageFilter === 'ALL' ? 'لكافة القرى' : `لقرية ${selectedVillageFilter}`})
                </h4>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">
                إجمالي ({barChartData.length}) منطقة
              </span>
            </div>

            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-center border-collapse text-xs">
                <thead className="bg-black text-slate-200 font-black border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-2 border-l border-slate-800">القرية / المنطقة</th>
                    <th className="py-2.5 px-2 border-l border-slate-800">عدد المخابز</th>
                    <th className="py-2.5 px-2 border-l border-slate-800 text-amber-400">الحصة التأمينية (شيكارة)</th>
                    <th className="py-2.5 px-2 border-l border-slate-800 text-cyan-300">الحصة الفعلية (شيكارة)</th>
                    <th className="py-2.5 px-2 border-l border-slate-800 text-emerald-400">الأرغفة اليومية</th>
                    <th className="py-2.5 px-2 text-rose-400">إجمالي المتبقي (ج.م)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-bold text-slate-300">
                  {barChartData.map((row, idx) => (
                    <tr key={row.name} className={idx % 2 === 0 ? 'bg-slate-900/80 hover:bg-slate-800/80' : 'bg-slate-950 hover:bg-slate-800/80'}>
                      <td className="py-2 px-2 border-l border-slate-800 font-black text-slate-100">{row.name}</td>
                      <td className="py-2 px-2 border-l border-slate-800">{row.bakeryCount} مخبز</td>
                      <td className="py-2 px-2 border-l border-slate-800 font-black text-amber-300">{row.insuranceQuota.toLocaleString()}</td>
                      <td className="py-2 px-2 border-l border-slate-800 font-black text-cyan-300">{row.actualQuota.toLocaleString()}</td>
                      <td className="py-2 px-2 border-l border-slate-800 font-black text-emerald-300">{row.loavesCount.toLocaleString()}</td>
                      <td className="py-2 px-2 font-black text-rose-300">
                        {row.totalRemainingDebt > 0 ? `${row.totalRemainingDebt.toLocaleString()} ج.م` : 'خالص (0)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-black text-white font-black border-t-2 border-slate-800">
                  <tr>
                    <td className="py-2.5 px-2 border-l border-slate-800 text-amber-400">الإجمالي العام</td>
                    <td className="py-2.5 px-2 border-l border-slate-800">{totals.count} مخبز</td>
                    <td className="py-2.5 px-2 border-l border-slate-800 text-amber-300">{totals.insurance.toLocaleString()} شيكارة</td>
                    <td className="py-2.5 px-2 border-l border-slate-800 text-cyan-300">{totals.actual.toLocaleString()} شيكارة</td>
                    <td className="py-2.5 px-2 border-l border-slate-800 text-emerald-300">{totals.loaves.toLocaleString()} رغيف</td>
                    <td className="py-2.5 px-2 text-rose-300">{totals.debts.toLocaleString()} ج.م</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

