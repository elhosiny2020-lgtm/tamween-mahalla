import React, { useState, useMemo } from 'react';
import { Bakery, DebtRecord, VillageHierarchy, SystemConfig } from '../types';
import {
  Table as TableIcon,
  X,
  Printer,
  FileSpreadsheet,
  Search,
  Building,
  Scale,
  Wheat,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  Filter,
  ExternalLink
} from 'lucide-react';
import { printHtmlElementA4 } from '../utils/pdfHelper';

interface LocalUnitSummaryRow {
  localUnit: string;
  village: string;
  bakeryCount: number;
  totalInsuranceQuota: number;
  totalActualQuota: number;
  totalLoaves: number;
  totalDebts: number;
  avgDebtPerBakery: number;
  percentageOfBakeries: number;
}

interface LocalUnitsSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  bakeries: Bakery[];
  debts: DebtRecord[];
  villages: VillageHierarchy[];
  systemConfig: SystemConfig;
  onNavigateToBakeries?: (localUnit: string) => void;
  onNavigateToDebts?: (localUnit: string) => void;
}

export const LocalUnitsSummaryModal: React.FC<LocalUnitsSummaryModalProps> = ({
  isOpen,
  onClose,
  bakeries,
  debts,
  villages,
  systemConfig,
  onNavigateToBakeries,
  onNavigateToDebts,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVillageFilter, setSelectedVillageFilter] = useState('ALL');
  const [sortField, setSortField] = useState<keyof LocalUnitSummaryRow>('bakeryCount');
  const [sortAsc, setSortAsc] = useState(false);
  const summaryPrintRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  // Map bakery debts accurately
  const debtsMap = useMemo(() => {
    const map: Record<string, number> = {};
    debts.forEach((d) => {
      const remaining = Number(d.netRemainingDebt) || 0;
      map[d.bakeryId] = (map[d.bakeryId] || 0) + remaining;
    });
    return map;
  }, [debts]);

  // Aggregate data by Local Unit
  const aggregatedData = useMemo(() => {
    // Collect all unique local units from villages hierarchy and from existing bakeries
    const unitsMap = new Map<string, {
      localUnit: string;
      village: string;
      bakeryCount: number;
      totalInsuranceQuota: number;
      totalActualQuota: number;
      totalLoaves: number;
      totalDebts: number;
    }>();

    // 1. Seed from villages hierarchy so all official local units appear
    villages.forEach((v) => {
      v.localUnits.forEach((u) => {
        unitsMap.set(u, {
          localUnit: u,
          village: v.village,
          bakeryCount: 0,
          totalInsuranceQuota: 0,
          totalActualQuota: 0,
          totalLoaves: 0,
          totalDebts: 0,
        });
      });
    });

    // 2. Aggregate bakeries data
    bakeries.forEach((b) => {
      const uName = b.localUnit || 'غير محدد';
      const existing = unitsMap.get(uName) || {
        localUnit: uName,
        village: b.village || 'غير محدد',
        bakeryCount: 0,
        totalInsuranceQuota: 0,
        totalActualQuota: 0,
        totalLoaves: 0,
        totalDebts: 0,
      };

      existing.bakeryCount += 1;
      existing.totalInsuranceQuota += Number(b.insuranceQuota) || 0;
      existing.totalActualQuota += Number(b.actualQuota) || 0;
      existing.totalLoaves += Number(b.loavesCount) || (Number(b.actualQuota) || 0) * 1350;

      // Debt calculation
      const bDebt = debtsMap[b.id] || 0;
      existing.totalDebts += bDebt;

      unitsMap.set(uName, existing);
    });

    const totalBakeriesCount = bakeries.length || 1;

    // Convert map to array with calculated metrics
    const rows: LocalUnitSummaryRow[] = Array.from(unitsMap.values()).map((item) => {
      const avgDebt = item.bakeryCount > 0 ? item.totalDebts / item.bakeryCount : 0;
      const pct = (item.bakeryCount / totalBakeriesCount) * 100;
      return {
        ...item,
        avgDebtPerBakery: Math.round(avgDebt),
        percentageOfBakeries: Number(pct.toFixed(1)),
      };
    });

    return rows;
  }, [bakeries, debtsMap, villages]);

  // Filtered & Sorted Data
  const filteredAndSortedRows = useMemo(() => {
    return aggregatedData
      .filter((row) => {
        if (selectedVillageFilter !== 'ALL' && row.village !== selectedVillageFilter) {
          return false;
        }
        if (searchTerm.trim()) {
          const s = searchTerm.trim().toLowerCase();
          const matchUnit = row.localUnit.toLowerCase().includes(s);
          const matchVillage = row.village.toLowerCase().includes(s);
          if (!matchUnit && !matchVillage) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortAsc ? valA.localeCompare(valB, 'ar') : valB.localeCompare(valA, 'ar');
        }
        return sortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      });
  }, [aggregatedData, selectedVillageFilter, searchTerm, sortField, sortAsc]);

  // Overall Totals
  const totals = useMemo(() => {
    return filteredAndSortedRows.reduce(
      (acc, r) => {
        acc.unitCount += 1;
        acc.bakeries += r.bakeryCount;
        acc.insuranceQuota += r.totalInsuranceQuota;
        acc.actualQuota += r.totalActualQuota;
        acc.loaves += r.totalLoaves;
        acc.debts += r.totalDebts;
        return acc;
      },
      { unitCount: 0, bakeries: 0, insuranceQuota: 0, actualQuota: 0, loaves: 0, debts: 0 }
    );
  }, [filteredAndSortedRows]);

  const handleSort = (field: keyof LocalUnitSummaryRow) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'م',
      'الوحدة المحلية',
      'القرية التابعة',
      'عدد المخابز',
      'نسبة المخابز %',
      'الحصة التأمينية (شيكارة)',
      'الحصة الفعلية (شيكارة)',
      'إنتاج الأرغفة اليومي',
      'إجمالي المديونيات (ج.م)',
      'متوسط مديونية المخبز (ج.م)'
    ];

    const rows = filteredAndSortedRows.map((r, i) => [
      i + 1,
      `"${r.localUnit}"`,
      `"${r.village}"`,
      r.bakeryCount,
      `${r.percentageOfBakeries}%`,
      r.totalInsuranceQuota,
      r.totalActualQuota,
      r.totalLoaves,
      r.totalDebts,
      r.avgDebtPerBakery
    ]);

    rows.push([
      'المجموع',
      `"إجمالي (${totals.unitCount} وحدة)"`,
      '""',
      totals.bakeries,
      '100%',
      totals.insuranceQuota,
      totals.actualQuota,
      totals.loaves,
      totals.debts,
      totals.bakeries > 0 ? Math.round(totals.debts / totals.bakeries) : 0
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ملخص_إحصائي_الوحدات_المحلية_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    printHtmlElementA4(
      summaryPrintRef.current,
      `ملخص_إحصائي_الوحدات_المحلية_${new Date().toISOString().split('T')[0]}`
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm overflow-y-auto cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-slate-950 text-white rounded-2xl shadow-2xl border-2 border-indigo-500/50 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden cursor-default animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 border-b border-indigo-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-900/60 border border-indigo-400/40 rounded-xl shadow-md">
              <TableIcon className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>الملخص الإحصائي المجمع حسب الوحدات المحلية</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 px-2 py-0.5 rounded-full font-mono">
                  {systemConfig.administrationTitle}
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                بيان تفصيلي مجمع بعدد المخابز، الحصص التموينية اليومية، وإجمالي المديونيات لكل وحدة محلية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-black shadow transition cursor-pointer"
              title="تصدير جدول الملخص الإحصائي إلى ملف Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">تصدير Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-black shadow transition cursor-pointer"
              title="طباعة التقرير الإحصائي A4"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">طباعة</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-red-950/70 hover:bg-red-700 text-white transition cursor-pointer border border-red-500/40 hover:scale-105"
              title="إغلاق النافذة (Escape)"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-900/60 border-b border-slate-800 shrink-0">
          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl text-center shadow">
            <span className="text-[11px] font-bold text-slate-400 block mb-0.5">الوحدات المحلية المعروضة</span>
            <span className="text-xl font-black text-indigo-300 font-mono">{totals.unitCount}</span>
            <span className="text-[10px] text-slate-500 font-bold block mt-0.5">وحدة محلية</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl text-center shadow">
            <span className="text-[11px] font-bold text-slate-400 block mb-0.5">إجمالي المخابز التابعة</span>
            <span className="text-xl font-black text-amber-300 font-mono">{totals.bakeries}</span>
            <span className="text-[10px] text-amber-500/80 font-bold block mt-0.5">مخبز مسجل</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl text-center shadow">
            <span className="text-[11px] font-bold text-slate-400 block mb-0.5">إجمالي الحصة اليومية</span>
            <span className="text-xl font-black text-blue-300 font-mono">{totals.actualQuota.toLocaleString()}</span>
            <span className="text-[10px] text-blue-400 font-bold block mt-0.5">شيكارة فعلي / يوم</span>
          </div>

          <div className="bg-gradient-to-br from-red-950/80 via-rose-950/60 to-slate-900 border border-red-700/60 p-2.5 rounded-xl text-center shadow">
            <span className="text-[11px] font-bold text-rose-300 block mb-0.5">إجمالي المتبقي من المديونيات</span>
            <span className="text-xl font-black text-rose-200 font-mono">{totals.debts.toLocaleString()}</span>
            <span className="text-[10px] text-rose-400 font-bold block mt-0.5">جنيه مصري</span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3 bg-slate-900/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث باسم الوحدة المحلية أو القرية..."
                className="w-full pr-9 pl-3 py-1.5 bg-black border border-slate-700 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-right"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <select
                value={selectedVillageFilter}
                onChange={(e) => setSelectedVillageFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-black border border-slate-700 rounded-xl text-xs font-bold text-indigo-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">كافة القرى ({villages.length})</option>
                {villages.map((v) => (
                  <option key={v.village} value={v.village}>
                    قرية {v.village} ({v.localUnits.length} وحدة)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-bold">
            عدد السجلات: <span className="font-mono text-indigo-300">{filteredAndSortedRows.length}</span> وحدة محلية
          </div>
        </div>

        {/* Aggregated Table Body */}
        <div ref={summaryPrintRef} className="overflow-x-auto flex-1 p-3">
          <table className="w-full text-center border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-700 text-slate-200 font-black">
                <th className="py-2.5 px-2 border-l border-slate-800 text-slate-400 w-12">م</th>
                <th
                  onClick={() => handleSort('localUnit')}
                  className="py-2.5 px-3 border-l border-slate-800 text-right cursor-pointer hover:bg-slate-800 transition select-none"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>الوحدة المحلية</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('village')}
                  className="py-2.5 px-3 border-l border-slate-800 text-right cursor-pointer hover:bg-slate-800 transition select-none"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>القرية التابعة</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('bakeryCount')}
                  className="py-2.5 px-2.5 border-l border-slate-800 cursor-pointer hover:bg-slate-800 transition select-none min-w-[110px]"
                >
                  <div className="inline-flex items-center gap-1 justify-center">
                    <span>عدد المخابز</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('totalInsuranceQuota')}
                  className="py-2.5 px-2.5 border-l border-slate-800 cursor-pointer hover:bg-slate-800 transition select-none min-w-[105px]"
                >
                  <div className="inline-flex items-center gap-1 justify-center">
                    <span>الحصة التأمينية</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('totalActualQuota')}
                  className="py-2.5 px-2.5 border-l border-slate-800 cursor-pointer hover:bg-slate-800 transition select-none min-w-[105px]"
                >
                  <div className="inline-flex items-center gap-1 justify-center">
                    <span>الحصة الفعلية</span>
                    <ArrowUpDown className="w-3 h-3 text-blue-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('totalLoaves')}
                  className="py-2.5 px-2.5 border-l border-slate-800 cursor-pointer hover:bg-slate-800 transition select-none min-w-[110px]"
                >
                  <div className="inline-flex items-center gap-1 justify-center">
                    <span>إنتاج الأرغفة/يوم</span>
                    <ArrowUpDown className="w-3 h-3 text-emerald-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('totalDebts')}
                  className="py-2.5 px-3 border-l border-slate-800 cursor-pointer hover:bg-slate-800 transition select-none min-w-[120px] bg-red-950/40 text-rose-200"
                >
                  <div className="inline-flex items-center gap-1 justify-center">
                    <span>إجمالي المديونيات</span>
                    <ArrowUpDown className="w-3 h-3 text-rose-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('avgDebtPerBakery')}
                  className="py-2.5 px-2.5 border-l border-slate-800 cursor-pointer hover:bg-slate-800 transition select-none min-w-[110px]"
                >
                  <div className="inline-flex items-center gap-1 justify-center">
                    <span>متوسط مديونية المخبز</span>
                    <ArrowUpDown className="w-3 h-3 text-rose-400" />
                  </div>
                </th>
                <th className="py-2.5 px-2.5 border-l border-slate-800 min-w-[110px]">
                  موقف المديونية
                </th>
                <th className="py-2.5 px-2 min-w-[90px] no-print">إجراء سريع</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 font-bold bg-slate-900/30">
                    لا توجد وحدات محلية مطابقة لمعايير البحث الحالية
                  </td>
                </tr>
              ) : (
                filteredAndSortedRows.map((row, idx) => {
                  const hasDebt = row.totalDebts > 0;
                  return (
                    <tr
                      key={row.localUnit}
                      className={`border-b border-slate-800/80 transition-colors ${
                        idx % 2 === 0 ? 'bg-slate-950 hover:bg-slate-900/80' : 'bg-slate-900/40 hover:bg-slate-900/80'
                      }`}
                    >
                      <td className="py-2 px-1 border-l border-slate-800 text-slate-400 font-mono text-xs">
                        {idx + 1}
                      </td>

                      <td className="py-2 px-3 border-l border-slate-800 text-right font-black text-indigo-200">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{row.localUnit}</span>
                        </div>
                      </td>

                      <td className="py-2 px-3 border-l border-slate-800 text-right font-bold text-slate-300">
                        {row.village}
                      </td>

                      <td className="py-2 px-2.5 border-l border-slate-800 font-mono font-black text-amber-300">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{row.bakeryCount}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({row.percentageOfBakeries}%)</span>
                        </div>
                      </td>

                      <td className="py-2 px-2.5 border-l border-slate-800 font-mono font-bold text-amber-200">
                        {row.totalInsuranceQuota.toLocaleString()}
                        <span className="text-[10px] text-amber-400/80 mr-1">شكارة</span>
                      </td>

                      <td className="py-2 px-2.5 border-l border-slate-800 font-mono font-black text-blue-300">
                        {row.totalActualQuota.toLocaleString()}
                        <span className="text-[10px] text-blue-400/80 mr-1">شكارة</span>
                      </td>

                      <td className="py-2 px-2.5 border-l border-slate-800 font-mono font-bold text-emerald-300">
                        {row.totalLoaves.toLocaleString()}
                        <span className="text-[10px] text-emerald-400/80 mr-1">رغيف</span>
                      </td>

                      <td className={`py-2 px-3 border-l border-slate-800 font-mono font-black text-sm ${
                        hasDebt ? 'text-rose-300 bg-red-950/30' : 'text-emerald-400'
                      }`}>
                        {row.totalDebts.toLocaleString()}
                        <span className="text-[10px] font-bold text-slate-400 mr-1">ج.م</span>
                      </td>

                      <td className="py-2 px-2.5 border-l border-slate-800 font-mono font-bold text-slate-300 text-xs">
                        {row.avgDebtPerBakery.toLocaleString()}
                        <span className="text-[10px] font-normal text-slate-500 mr-1">ج.م</span>
                      </td>

                      <td className="py-2 px-2.5 border-l border-slate-800">
                        {hasDebt ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-300 bg-red-950/70 border border-red-700/60 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            <span>مستحق سداد</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-300 bg-emerald-950/70 border border-emerald-700/60 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>خالص المديونية</span>
                          </span>
                        )}
                      </td>

                      <td className="py-2 px-2 no-print">
                        <div className="flex items-center justify-center gap-1">
                          {onNavigateToBakeries && (
                            <button
                              type="button"
                              onClick={() => {
                                onNavigateToBakeries(row.localUnit);
                                onClose();
                              }}
                              className="p-1 hover:bg-amber-950/80 text-amber-400 hover:text-amber-300 border border-amber-800/40 rounded-lg text-[10px] font-bold transition cursor-pointer"
                              title={`عرض مخابز ${row.localUnit} في جدول المخابز`}
                            >
                              المخابز
                            </button>
                          )}
                          {onNavigateToDebts && hasDebt && (
                            <button
                              type="button"
                              onClick={() => {
                                onNavigateToDebts(row.localUnit);
                                onClose();
                              }}
                              className="p-1 hover:bg-red-950/80 text-rose-400 hover:text-rose-300 border border-red-800/40 rounded-lg text-[10px] font-bold transition cursor-pointer"
                              title={`عرض مديونيات ${row.localUnit}`}
                            >
                              المديونيات
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer with Overall Totals */}
            <tfoot>
              <tr className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-t-2 border-indigo-500/50 text-white font-black text-xs">
                <td colSpan={3} className="py-3 px-3 text-right border-l border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-300 font-mono font-black text-sm">المجموع الإجمالي العام:</span>
                    <span className="text-slate-300 text-[11px]">({totals.unitCount} وحدة محلية مجمعة)</span>
                  </div>
                </td>
                <td className="py-3 px-2.5 border-l border-slate-700 font-mono text-amber-300 text-sm">
                  {totals.bakeries} مخبز
                </td>
                <td className="py-3 px-2.5 border-l border-slate-700 font-mono text-amber-200 text-sm">
                  {totals.insuranceQuota.toLocaleString()}
                </td>
                <td className="py-3 px-2.5 border-l border-slate-700 font-mono text-blue-300 text-sm">
                  {totals.actualQuota.toLocaleString()}
                </td>
                <td className="py-3 px-2.5 border-l border-slate-700 font-mono text-emerald-300 text-sm">
                  {totals.loaves.toLocaleString()}
                </td>
                <td className="py-3 px-3 border-l border-slate-700 font-mono text-rose-300 text-sm bg-red-950/60">
                  {totals.debts.toLocaleString()} ج.م
                </td>
                <td className="py-3 px-2.5 border-l border-slate-700 font-mono text-slate-300">
                  {totals.bakeries > 0 ? Math.round(totals.debts / totals.bakeries).toLocaleString() : 0} ج.م
                </td>
                <td colSpan={2} className="py-3 px-2 text-slate-400 text-[10px]">
                  مركز المحلة الكبرى
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs font-bold shrink-0">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Wheat className="w-4 h-4 text-amber-400" />
            <span>الحصص محسوبة بالشكائر زنة 50 كجم يومياً - معدل إنتاج الرغيف 1350 رغيف لكل شيكارة</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-xs transition cursor-pointer"
          >
            إغلاق النافذة (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
