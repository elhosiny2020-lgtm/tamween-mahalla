import React, { useState, useMemo, useEffect } from 'react';
import { Bakery, DebtRecord, VillageHierarchy, SystemConfig, AppUser } from '../types';
import { PAYMENT_METHODS } from '../defaultData';
import {
  FileSpreadsheet,
  Printer,
  Plus,
  Search,
  Filter,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Trash2,
  X,
  Save,
  Building,
  RotateCcw,
  Scale,
  Calculator,
  Clock,
  AlertTriangle,
  Settings,
  Check,
  Calendar
} from 'lucide-react';

import { WeeklyInstallmentsModal } from './WeeklyInstallmentsModal';
import { SupplyFinesCalculatorModal } from './SupplyFinesCalculatorModal';
import { printHtmlElementA4 } from '../utils/pdfHelper';
import { filterDebtsByAdvancedCriteria, formatDateDDMMYYYY } from '../utils/auditHelper';

export const getDebtOverdueInfo = (
  dateStr?: string,
  netRemainingDebt: number = 0
): { isOverdue: boolean; daysElapsed: number; isUnpaid: boolean } => {
  const isUnpaid = netRemainingDebt > 0;
  if (!isUnpaid || !dateStr || !dateStr.trim()) {
    return { isOverdue: false, daysElapsed: 0, isUnpaid };
  }

  const debtDate = new Date(dateStr.trim());
  if (isNaN(debtDate.getTime())) {
    return { isOverdue: false, daysElapsed: 0, isUnpaid };
  }

  const now = new Date();
  const diffMs = now.getTime() - debtDate.getTime();
  const daysElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return {
    isOverdue: daysElapsed > 30,
    daysElapsed: Math.max(0, daysElapsed),
    isUnpaid,
  };
};

interface DebtsViewProps {
  bakeries: Bakery[];
  debts: DebtRecord[];
  villages: VillageHierarchy[];
  issuingEntities: string[];
  violationTypes: string[];
  systemConfig: SystemConfig;
  currentUser?: AppUser | null;
  onSaveDebt: (debt: DebtRecord) => void;
  onDeleteDebt: (debtId: string) => void;
  onUpdateEntities: (entities: string[]) => void;
  onUpdateViolations: (violations: string[]) => void;
  onRenameEntity?: (oldName: string, newName: string) => void;
  onRenameViolation?: (oldName: string, newName: string) => void;
  filterBakeryId?: string;
  onClearBakeryFilter?: () => void;
  onOpenReportModal?: (tab?: 'bakeries' | 'debts' | 'bakery-debts' | 'users') => void;
}

export const DebtsView: React.FC<DebtsViewProps> = ({
  bakeries,
  debts,
  villages,
  issuingEntities,
  violationTypes,
  systemConfig,
  currentUser,
  onSaveDebt,
  onDeleteDebt,
  onUpdateEntities,
  onUpdateViolations,
  onRenameEntity,
  onRenameViolation,
  filterBakeryId,
  onClearBakeryFilter,
  onOpenReportModal,
}) => {
  const debtsPrintRef = React.useRef<HTMLDivElement>(null);
  const isViewer = currentUser?.role === 'viewer';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('ALL');
  const [selectedUnit, setSelectedUnit] = useState('ALL');
  const [selectedEntity, setSelectedEntity] = useState('ALL');
  const [selectedViolationType, setSelectedViolationType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'UNPAID' | 'PAID' | 'OVER_20K' | 'OVERDUE'>('ALL');
  // Advanced Search Across Debts (البحث المتقدم عبر المديونيات: من تاريخ - إلى تاريخ)
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Modals state
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtToEdit, setDebtToEdit] = useState<DebtRecord | null>(null);

  const [isEntitiesModalOpen, setIsEntitiesModalOpen] = useState(false);
  const [isViolationsModalOpen, setIsViolationsModalOpen] = useState(false);
  const [isWeeklyInstallmentsOpen, setIsWeeklyInstallmentsOpen] = useState(false);
  const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false);
  const [installmentBakeryId, setInstallmentBakeryId] = useState<string | undefined>(undefined);

  // Row highlight state
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Manage entities inside modal
  const [newEntityName, setNewEntityName] = useState('');
  const [editingEntityOldName, setEditingEntityOldName] = useState<string | null>(null);
  const [editingEntityNewName, setEditingEntityNewName] = useState('');
  const [entitySearchQuery, setEntitySearchQuery] = useState('');

  // Manage violation types inside modal
  const [newViolationName, setNewViolationName] = useState('');
  const [editingViolationOldName, setEditingViolationOldName] = useState<string | null>(null);
  const [editingViolationNewName, setEditingViolationNewName] = useState('');
  const [violationSearchQuery, setViolationSearchQuery] = useState('');

  // Filtering using pure helper function (supports dateFrom - dateTo, violationType, etc.)
  const filteredDebts = useMemo(() => {
    return filterDebtsByAdvancedCriteria(debts, {
      dateFrom,
      dateTo,
      violationType: selectedViolationType,
      village: selectedVillage,
      localUnit: selectedUnit,
      issuingEntity: selectedEntity,
      status: selectedStatus,
      filterBakeryId,
      searchTerm,
      isOverdueCheck: getDebtOverdueInfo,
    });
  }, [
    debts,
    dateFrom,
    dateTo,
    filterBakeryId,
    selectedVillage,
    selectedUnit,
    selectedEntity,
    selectedViolationType,
    selectedStatus,
    searchTerm,
  ]);

  // Filtered period totals for the Advanced Search bar summary
  const filteredPeriodNetDebt = useMemo(() => {
    return filteredDebts.reduce((sum, d) => sum + (d.netRemainingDebt || 0), 0);
  }, [filteredDebts]);

  // Statistics
  const stats = useMemo(() => {
    let totalViolations = 0;
    let paidViolations = 0;
    let totalAdded = 0;
    let paidAdded = 0;
    let totalDisposal = 0;
    let paidDisposal = 0;
    let netRemainingTotal = 0;
    let overdueCount = 0;
    let overdueAmount = 0;

    debts.forEach((d) => {
      totalViolations += d.totalViolations || 0;
      paidViolations += d.paidViolationAmount || 0;
      totalAdded += d.addedAmount || 0;
      paidAdded += d.paidAddedAmount || 0;
      totalDisposal += d.disposalValue || 0;
      paidDisposal += d.paidDisposalAmount || 0;
      netRemainingTotal += d.netRemainingDebt || 0;

      const { isOverdue } = getDebtOverdueInfo(d.violationDate || d.disposalDate, d.netRemainingDebt);
      if (isOverdue) {
        overdueCount += 1;
        overdueAmount += d.netRemainingDebt || 0;
      }
    });

    return {
      totalViolations,
      paidViolations,
      totalAdded,
      paidAdded,
      totalDisposal,
      paidDisposal,
      netRemainingTotal,
      overdueCount,
      overdueAmount,
    };
  }, [debts]);

  // Handle Export to CSV (Excel UTF-8 BOM)
  const handleExportCSV = () => {
    const headers = [
      'م',
      'اسم صاحب المخبز',
      'رقم الماكينة',
      'القرية',
      'الوحدة المحلية',
      'تاريخ المخالفة',
      'الجهة المحررة',
      'نوع المخالفة',
      'قيمة المخالفة',
      'مخالفات قديمة',
      'إجمالي المخالفات',
      'المسدد من المخالفات',
      'المتبقي من المخالفات',
      'المضاف للمخبز',
      'المسدد من المضاف',
      'المتبقي من المضاف',
      'عدد شكاير التصرف',
      'سعر الشيكارة',
      'مضاعفة العقوبة',
      'قيمة التصرف',
      'المسدد من التصرف',
      'المتبقي من التصرف',
      'صافي المتبقي على المخبز',
      'ملاحظات',
    ];

    const rows = filteredDebts.map((d, idx) => [
      idx + 1,
      `"${d.bakeryOwnerName.replace(/"/g, '""')}"`,
      `"${d.machineNumber}"`,
      `"${d.village}"`,
      `"${d.localUnit}"`,
      `"${d.violationDate}"`,
      `"${d.issuingEntity}"`,
      `"${d.violationType}"`,
      d.violationAmount,
      d.oldViolations,
      d.totalViolations,
      d.paidViolationAmount,
      d.remainingViolations,
      d.addedAmount,
      d.paidAddedAmount,
      d.remainingAdded,
      d.disposalBags,
      d.disposalBagPrice,
      `${d.disposalMultiplier}x`,
      d.disposalValue,
      d.paidDisposalAmount,
      d.remainingDisposal,
      d.netRemainingDebt,
      `"${(d.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `كشف_مديونيات_أصحاب_المخابز_مركز_المحلة_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintDebts = () => {
    if (onOpenReportModal) {
      onOpenReportModal('debts');
      return;
    }
    printHtmlElementA4(
      debtsPrintRef.current,
      `كشف_مديونيات_أصحاب_المخابز_${new Date().toISOString().split('T')[0]}`
    );
  };

  return (
    <div className="space-y-4">
      {/* Active Bakery Filter Notification */}
      {filterBakeryId && (
        <div className="bg-amber-100 border-2 border-amber-500 p-3 rounded-xl flex items-center justify-between text-amber-950 font-black text-xs no-print">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-700" />
            <span>
              عرض مديونيات المخبز المحدد فقط: (
              {debts.find((d) => d.bakeryId === filterBakeryId)?.bakeryOwnerName ||
                bakeries.find((b) => b.id === filterBakeryId)?.bakeryOwnerName}
              )
            </span>
          </div>
          <button
            onClick={onClearBakeryFilter}
            className="inline-flex items-center gap-1 px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            إلغاء التصفية وعرض كافة المخابز
          </button>
        </div>
      )}

      {/* Top Stat Cards for Debts (Hidden during print per instructions) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5 no-print">
        <div className="bg-slate-900 border-2 border-slate-800 rounded-xl p-3 text-center shadow-md">
          <span className="text-[11px] font-bold text-slate-400 block mb-0.5">
            إجمالي المخالفات
          </span>
          <span className="stat-num text-white block">
            {stats.totalViolations.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 font-bold">ج.م</span>
        </div>

        <div className="bg-slate-900 border-2 border-slate-800 rounded-xl p-3 text-center shadow-md">
          <span className="text-[11px] font-bold text-emerald-400 block mb-0.5">
            المسدد من المخالفات
          </span>
          <span className="stat-num text-emerald-300 block">
            {stats.paidViolations.toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-500 font-bold">ج.م</span>
        </div>

        <div className="bg-slate-900 border-2 border-slate-800 rounded-xl p-3 text-center shadow-md">
          <span className="text-[11px] font-bold text-cyan-400 block mb-0.5">إجمالي المضاف</span>
          <span className="stat-num text-cyan-300 block">
            {stats.totalAdded.toLocaleString()}
          </span>
          <span className="text-[10px] text-cyan-500 font-bold">ج.م</span>
        </div>

        <div className="bg-slate-900 border-2 border-slate-800 rounded-xl p-3 text-center shadow-md">
          <span className="text-[11px] font-bold text-indigo-400 block mb-0.5">
            المسدد من المضاف
          </span>
          <span className="stat-num text-indigo-300 block">
            {stats.paidAdded.toLocaleString()}
          </span>
          <span className="text-[10px] text-indigo-500 font-bold">ج.م</span>
        </div>

        <div className="bg-slate-900 border-2 border-slate-800 rounded-xl p-3 text-center shadow-md">
          <span className="text-[11px] font-bold text-orange-400 block mb-0.5">إجمالي التصرف</span>
          <span className="stat-num text-orange-300 block">
            {stats.totalDisposal.toLocaleString()}
          </span>
          <span className="text-[10px] text-orange-500 font-bold">ج.م</span>
        </div>

        <div className="bg-slate-900 border-2 border-slate-800 rounded-xl p-3 text-center shadow-md">
          <span className="text-[11px] font-bold text-amber-400 block mb-0.5">
            المسدد من التصرف
          </span>
          <span className="stat-num text-amber-300 block">
            {stats.paidDisposal.toLocaleString()}
          </span>
          <span className="text-[10px] text-amber-500 font-bold">ج.م</span>
        </div>

        {/* NEW: Overdue Debts Card (> 30 days) */}
        <div
          onClick={() => setSelectedStatus('OVERDUE')}
          className={`cursor-pointer transition-transform hover:scale-105 rounded-xl p-2.5 text-center shadow-lg border-2 ${
            selectedStatus === 'OVERDUE'
              ? 'bg-rose-950 border-rose-400 ring-2 ring-rose-500/50'
              : 'bg-slate-900 border-rose-600/70 hover:border-rose-500'
          }`}
          title="انقر لتصفية المديونيات التي تجاوزت 30 يوماً دون سداد كامل"
        >
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
            <span className="text-[11px] font-black text-rose-300 block">
              المتأخرات (&gt; 30 يوماً)
            </span>
          </div>
          <span className="stat-num text-rose-200 block text-base font-black">
            {stats.overdueCount} <span className="text-[10px] font-bold text-slate-400">قيد</span>
          </span>
          <span className="text-[10px] text-rose-400 font-bold block truncate">
            {stats.overdueAmount.toLocaleString()} ج.م
          </span>
        </div>

        <div className="bg-gradient-to-br from-red-600 to-rose-700 text-white rounded-xl p-3 text-center shadow-lg border-2 border-red-500">
          <span className="text-[11px] font-black text-rose-100 block mb-0.5">
            صافي المتبقي الكلي
          </span>
          <span className="stat-num text-white block">
            {stats.netRemainingTotal.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Toolbar & Filter Bar */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-4 shadow-xl space-y-3.5 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Action Buttons (Right-aligned in RTL flexbox) */}
          <div className="flex flex-wrap items-center gap-2">
            {!isViewer && (
              <button
                onClick={() => {
                  setDebtToEdit(null);
                  setIsDebtModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-xl text-xs font-black shadow-md border border-red-400/40 transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white stroke-[2.5]" />
                تسجيل مديونية / مخالفة جديدة
              </button>
            )}

            <button
              onClick={() => setIsCalculatorModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 rounded-xl text-xs font-black shadow-md border border-amber-300 transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              حاسبة الغرامات التموينية
            </button>

            <button
              onClick={() => setIsEntitiesModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-850 text-amber-300 border border-amber-600/60 hover:border-amber-400 rounded-xl text-xs font-black transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
              title="إدارة وتعديل وحذف الجهات المحررة للمحاضر"
            >
              <Building className="w-3.5 h-3.5 text-amber-400" />
              <span>الجهات المحررة</span>
              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] rounded-md border border-amber-500/40 font-mono">
                {issuingEntities.length}
              </span>
              <Settings className="w-3 h-3 text-amber-400" />
            </button>

            <button
              onClick={() => setIsViolationsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-850 text-red-300 border border-red-600/60 hover:border-red-400 rounded-xl text-xs font-black transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
              title="إدارة وتعديل وحذف أنواع المخالفات التموينية"
            >
              <Scale className="w-3.5 h-3.5 text-red-400" />
              <span>أنواع المخالفات</span>
              <span className="px-1.5 py-0.5 bg-red-500/20 text-red-300 text-[10px] rounded-md border border-red-500/40 font-mono">
                {violationTypes.length}
              </span>
              <Settings className="w-3 h-3 text-red-400" />
            </button>

            <button
              onClick={() => {
                setInstallmentBakeryId(undefined);
                setIsWeeklyInstallmentsOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 rounded-xl text-xs font-black shadow-md border border-amber-300 transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <DollarSign className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              جدولة الدفعات الأسبوعية (&gt; 20 ألف)
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm border border-emerald-600/50 transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              تصدير Excel
            </button>

            <button
              onClick={handlePrintDebts}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-cyan-500/50 hover:border-cyan-400 rounded-xl text-xs font-black shadow-sm transition cursor-pointer"
              title="فتح كشف طباعة المديونيات وتنزيل PDF A4 بالعرض"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              طباعة الكشف A4
            </button>

            <button
              onClick={() =>
                printHtmlElementA4(
                  debtsPrintRef.current,
                  `كشف_مديونيات_أصحاب_المخابز_${new Date().toISOString().split('T')[0]}`
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-500/50 hover:border-amber-400 rounded-xl text-xs font-black shadow-sm transition cursor-pointer"
              title="طباعة فورية للجدول المعروض حالياً على الطابعة"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              طباعة سريعة للجدول
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث باسم صاحب المخبز، رقم الماكينة، رقم الإيصال..."
              className="w-full pr-9 pl-3 py-2 bg-black border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-xl text-xs font-black focus:ring-2 focus:ring-amber-500 text-right transition"
            />
          </div>
        </div>

        {/* NEW: البحث المتقدم عبر المديونيات (نطاق تاريخي من - إلى + نوع المخالفة) */}
        <div
          role="region"
          aria-label="البحث المتقدم عبر المديونيات"
          className="p-3.5 bg-gradient-to-r from-slate-950 via-red-950/35 to-slate-950 border-2 border-amber-500/60 rounded-xl space-y-3 shadow-inner"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/25 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/20 border border-amber-400/50 rounded-lg">
                <Filter className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-2">
                  <span>البحث المتقدم عبر المديونيات</span>
                  <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-black">
                    نطاق تاريخي (من - إلى) + نوع المخالفة
                  </span>
                </h3>
                <p className="text-[11px] text-slate-300 font-bold mt-0.5">
                  فلترة فورية للمديونيات المسجلة خلال فترة زمنية محددة (من تاريخ - إلى تاريخ) وحسب نوع المخالفة التموينية
                </p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <span className="px-2.5 py-1 bg-slate-900 border border-amber-500/40 text-amber-300 rounded-lg text-[11px] font-black">
                القيود المطابقة: {filteredDebts.length} من {debts.length} قيد
              </span>
              <span className="px-2.5 py-1 bg-red-950/90 border border-red-500/50 text-rose-200 rounded-lg text-[11px] font-black">
                صافي مديونيات الفترة: {filteredPeriodNetDebt.toLocaleString()} ج.م
              </span>
              {(dateFrom !== '' ||
                dateTo !== '' ||
                selectedViolationType !== 'ALL' ||
                selectedVillage !== 'ALL' ||
                selectedUnit !== 'ALL' ||
                selectedEntity !== 'ALL' ||
                selectedStatus !== 'ALL' ||
                searchTerm.trim() !== '') && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    setSelectedViolationType('ALL');
                    setSelectedVillage('ALL');
                    setSelectedUnit('ALL');
                    setSelectedEntity('ALL');
                    setSelectedStatus('ALL');
                    setSearchTerm('');
                  }}
                  className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[11px] font-black cursor-pointer flex items-center gap-1 shadow-sm"
                  title="إلغاء جميع فلاتر التاريخ ونوع المخالفة وعرض كافة المديونيات"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>إعادة تعيين البحث المتقدم</span>
                </button>
              )}
            </div>
          </div>

          {/* Date Range (من - إلى) + Violation Type + Quick Presets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs items-end">
            {/* 1. Date From (من تاريخ) */}
            <div>
              <label
                htmlFor="debt-advanced-date-from"
                className="flex items-center gap-1.5 text-[11px] font-black text-amber-200 mb-1"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>من تاريخ (يوم/شهر/سنة DD/MM/YYYY):</span>
              </label>
              <input
                id="debt-advanced-date-from"
                aria-label="من تاريخ"
                type="date"
                lang="ar-EG"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 bg-black border-2 border-amber-500/50 focus:border-amber-400 rounded-xl font-mono font-black text-white text-xs cursor-pointer"
              />
              {dateFrom && (
                <span className="block text-[10px] font-black text-amber-300 bg-amber-950/80 border border-amber-500/40 rounded px-1.5 py-0.5 mt-1 text-center font-mono">
                  📅 المحدد: {formatDateDDMMYYYY(dateFrom)}
                </span>
              )}
            </div>

            {/* 2. Date To (إلى تاريخ) */}
            <div>
              <label
                htmlFor="debt-advanced-date-to"
                className="flex items-center gap-1.5 text-[11px] font-black text-amber-200 mb-1"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>إلى تاريخ (يوم/شهر/سنة DD/MM/YYYY):</span>
              </label>
              <input
                id="debt-advanced-date-to"
                aria-label="إلى تاريخ"
                type="date"
                lang="ar-EG"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 bg-black border-2 border-amber-500/50 focus:border-amber-400 rounded-xl font-mono font-black text-white text-xs cursor-pointer"
              />
              {dateTo && (
                <span className="block text-[10px] font-black text-amber-300 bg-amber-950/80 border border-amber-500/40 rounded px-1.5 py-0.5 mt-1 text-center font-mono">
                  📅 المحدد: {formatDateDDMMYYYY(dateTo)}
                </span>
              )}
            </div>

            {/* 3. Violation Type (حسب نوع المخالفة) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="debt-advanced-violation-type"
                  className="flex items-center gap-1.5 text-[11px] font-black text-rose-300"
                >
                  <Scale className="w-3.5 h-3.5 text-rose-400" />
                  <span>حسب نوع المخالفة التموينية:</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsViolationsModalOpen(true)}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-black flex items-center gap-0.5 cursor-pointer"
                  title="إضافة أو تعديل أو حذف أنواع المخالفات"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>تعديل/حذف</span>
                </button>
              </div>
              <select
                id="debt-advanced-violation-type"
                aria-label="حسب نوع المخالفة التموينية"
                value={selectedViolationType}
                onChange={(e) => {
                  if (e.target.value === '__MANAGE_VIOLATIONS__') {
                    setIsViolationsModalOpen(true);
                    return;
                  }
                  setSelectedViolationType(e.target.value);
                }}
                className="w-full px-3 py-2 bg-black border-2 border-rose-500/60 focus:border-rose-400 rounded-xl font-black text-rose-200 text-xs cursor-pointer"
              >
                <option value="ALL">كافة أنواع المخالفات ({debts.length} قيد)</option>
                {Array.from(new Set([...violationTypes, ...debts.map((d) => d.violationType).filter(Boolean)])).map(
                  (vType) => {
                    const count = debts.filter((d) => d.violationType === vType).length;
                    return (
                      <option key={vType} value={vType}>
                        {vType} ({count} قيد)
                      </option>
                    );
                  }
                )}
                <option value="__MANAGE_VIOLATIONS__" className="text-amber-300 font-black bg-slate-900">
                  ⚙️ إدارة وتعديل أنواع المخالفات...
                </option>
              </select>
            </div>

            {/* 4. Quick Date Range Presets (فترات زمنية سريعة) */}
            <div>
              <span className="block text-[11px] font-black text-cyan-300 mb-1">
                فترات زمنية سريعة (نقرة واحدة):
              </span>
              <div className="flex items-center flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black cursor-pointer border transition ${
                    dateFrom === '' && dateTo === ''
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-400'
                  }`}
                >
                  كل الفترات
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom('2026-10-01');
                    setDateTo('2026-10-15');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black cursor-pointer border transition ${
                    dateFrom === '2026-10-01' && dateTo === '2026-10-15'
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-400'
                  }`}
                >
                  1 - 15 أكتوبر
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom('2026-10-16');
                    setDateTo('2026-10-31');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black cursor-pointer border transition ${
                    dateFrom === '2026-10-16' && dateTo === '2026-10-31'
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-400'
                  }`}
                >
                  16 - 31 أكتوبر
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom('2026-01-01');
                    setDateTo('2026-12-31');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black cursor-pointer border transition ${
                    dateFrom === '2026-01-01' && dateTo === '2026-12-31'
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-400'
                  }`}
                >
                  عام 2026
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dropdowns Filter */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 pt-2 border-t border-slate-800 text-xs">
          <div>
            <label className="block text-[11px] font-black text-slate-400 mb-1">القرية</label>
            <select
              value={selectedVillage}
              onChange={(e) => {
                setSelectedVillage(e.target.value);
                setSelectedUnit('ALL');
              }}
              className="w-full px-2.5 py-1.5 bg-black border border-slate-700 rounded-xl font-black text-slate-100 focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">كافة قرى المركز</option>
              {villages.map((v) => (
                <option key={v.village} value={v.village}>
                  {v.village}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-400 mb-1">
              الوحدة المحلية التابعة
            </label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-black border border-slate-700 rounded-xl font-black text-slate-100 focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">
                {selectedVillage === 'ALL'
                  ? 'كافة الوحدات المحلية بالمركز'
                  : `كافة وحدات ${selectedVillage}`}
              </option>
              {selectedVillage === 'ALL'
                ? villages.map((v) => (
                    <optgroup key={v.village} label={`قرية ${v.village}`}>
                      {v.localUnits.map((u) => (
                        <option key={`${v.village}-${u}`} value={u}>
                          {u} ({v.village})
                        </option>
                      ))}
                    </optgroup>
                  ))
                : (villages.find((v) => v.village === selectedVillage)?.localUnits || []).map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-black text-slate-400">
                الجهة المحررة للمحضر
              </label>
              <button
                type="button"
                onClick={() => setIsEntitiesModalOpen(true)}
                className="inline-flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer"
                title="إدارة وتعديل وحذف الجهات المحررة"
              >
                <Settings className="w-2.5 h-2.5 text-amber-400" />
                تعديل وإدارة ({issuingEntities.length})
              </button>
            </div>
            <select
              value={selectedEntity}
              onChange={(e) => {
                if (e.target.value === '__MANAGE_ENTITIES__') {
                  setIsEntitiesModalOpen(true);
                  return;
                }
                setSelectedEntity(e.target.value);
              }}
              className="w-full px-2.5 py-1.5 bg-black border border-slate-700 rounded-xl font-black text-slate-100 focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">كافة الجهات المحررة ({issuingEntities.length})</option>
              <option value="__MANAGE_ENTITIES__" className="text-amber-400 font-black bg-slate-900">
                ⚙️ إدارة وتعديل / حذف الجهات المحررة ({issuingEntities.length})...
              </option>
              {issuingEntities.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-black text-slate-400">نوع المخالفة</label>
              <button
                type="button"
                onClick={() => setIsViolationsModalOpen(true)}
                className="inline-flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 font-bold hover:underline cursor-pointer"
                title="إدارة وتعديل وحذف أنواع المخالفات"
              >
                <Settings className="w-2.5 h-2.5 text-red-400" />
                تعديل وإدارة ({violationTypes.length})
              </button>
            </div>
            <select
              value={selectedViolationType}
              onChange={(e) => {
                if (e.target.value === '__MANAGE_VIOLATIONS__') {
                  setIsViolationsModalOpen(true);
                  return;
                }
                setSelectedViolationType(e.target.value);
              }}
              className="w-full px-2.5 py-1.5 bg-black border border-slate-700 rounded-xl font-black text-slate-100 focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">كافة أنواع المخالفات ({violationTypes.length})</option>
              <option value="__MANAGE_VIOLATIONS__" className="text-red-400 font-black bg-slate-900">
                ⚙️ إدارة وتعديل / حذف أنواع المخالفات ({violationTypes.length})...
              </option>
              {violationTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-400 mb-1">حالة السداد والجدولة والمتأخرات</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as 'ALL' | 'UNPAID' | 'PAID' | 'OVER_20K' | 'OVERDUE')}
              className="w-full px-2.5 py-1.5 bg-black border border-slate-700 rounded-xl font-black text-slate-100 focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">الكل (المسدد والمتبقي)</option>
              <option value="OVERDUE">🚨 المتأخرات (&gt; 30 يوماً دون سداد كامل)</option>
              <option value="OVER_20K">مديونيات تتجاوز 20,000 ج.م (تستلزم دفعات)</option>
              <option value="UNPAID">عليه مديونية متبقية فقط</option>
              <option value="PAID">خالص المديونية بالكامل</option>
            </select>
          </div>
        </div>
      </div>

      {/* Printable Wrapper for Direct Table Print */}
      <div ref={debtsPrintRef} className="space-y-3 print-container">
      {/* Official Printable Header (Appears during print) */}
      <div className="hidden print:block print-container mb-4 text-center border-b-2 border-black pb-3 text-black bg-white">
        <div className="flex items-center justify-between text-black">
          <div className="text-right text-black">
            <h4 className="text-xs font-black text-black">جمهورية مصر العربية</h4>
            <h4 className="text-xs font-black text-black">{systemConfig.governorateTitle}</h4>
            <h4 className="text-xs font-black text-black">{systemConfig.directorateTitle}</h4>
            <h4 className="text-xs font-black text-black">{systemConfig.administrationTitle}</h4>
          </div>
          <div className="w-16 h-16">
            <img src={systemConfig.logoBase64} alt="شعار" className="w-full h-full object-contain" />
          </div>
          <div className="text-left font-mono text-[10px] text-black font-black">
            <p>كشف مديونيات ومخالفات المخابز وبيانات الإيصال والسداد</p>
            <p>تاريخ الاستخراج: {new Date().toLocaleDateString('ar-EG')}</p>
            <p>الاسم بالكامل: {currentUser?.fullName || 'أحمد الحسيني'}</p>
            <p>اليوزر: {currentUser?.username || 'admin'} | الباسورد: {currentUser?.password || 'admin'}</p>
          </div>
        </div>
        <h2 className="text-sm font-black mt-2 underline text-black">
          كشف حصر مديونيات ومخالفات وإيصالات سداد أصحاب المخابز البلدية بمركز المحلة الكبرى
        </h2>
      </div>

      {/* Grouped Headers Debts Table */}
      <div className="bg-white border-2 border-slate-400 rounded-2xl overflow-hidden shadow-2xl text-black">
        <div className="overflow-x-auto max-h-[650px] relative">
          <table className="w-full text-center border-collapse text-xs text-black">
            {/* Super Headers */}
            <thead className="sticky top-0 z-20 bg-slate-200 text-black font-black">
              <tr className="border-b-2 border-black">
                {/* Index Column */}
                <th
                  rowSpan={2}
                  className="py-2.5 px-1 bg-slate-300 border-l border-black text-black w-10 text-center font-black"
                >
                  م
                </th>

                {/* 1. Basic Info (Owner Name, Machine, Village, Local Unit) */}
                <th
                  colSpan={4}
                  className="py-2.5 px-2 bg-slate-300 border-l border-black text-black font-black"
                >
                  1. البيانات الأساسية وموقع المخبز
                </th>
                <th
                  colSpan={6}
                  className="py-2.5 px-2 bg-red-100 border-l border-black text-black font-black"
                >
                  2. مخالفات المخبز
                </th>
                <th
                  colSpan={5}
                  className="py-2.5 px-2 bg-emerald-100 border-l border-black text-black font-black"
                >
                  3. سداد المخالفات (الإيصال والسداد)
                </th>
                <th
                  colSpan={6}
                  className="py-2.5 px-2 bg-blue-100 border-l border-black text-black font-black"
                >
                  4. المنصرف وسداد المنصرف (المضاف)
                </th>
                <th
                  colSpan={5}
                  className="py-2.5 px-2 bg-amber-100 border-l border-black text-black font-black"
                >
                  5. التصرف من المخبز
                </th>
                <th
                  colSpan={5}
                  className="py-2.5 px-2 bg-teal-100 border-l border-black text-black font-black"
                >
                  6. السداد من التصرف (الإيصال والسداد)
                </th>
                <th
                  rowSpan={2}
                  className="py-2.5 px-3 bg-red-200 border-l border-black text-black text-xs font-black min-w-[130px]"
                >
                  صافي المتبقي على صاحب المخبز
                </th>

                {/* Actions Column moved to the END of the table */}
                <th
                  rowSpan={2}
                  className="py-2.5 px-2 bg-amber-200 border-l border-black text-black min-w-[100px] no-print text-center font-black"
                >
                  الإجراءات
                </th>
              </tr>

              {/* Sub Columns Headers */}
              <tr className="bg-slate-100 text-[11px] text-black font-black border-b-2 border-black">
                {/* 1. Basic Info Sub-headers (Index and Actions are rowSpan 2 above) */}
                <th className="py-2 px-2 border-l border-black min-w-[150px] text-black">اسم صاحب المخبز</th>
                <th className="py-2 px-2 border-l border-black min-w-[90px] text-black">رقم الماكينة</th>
                <th className="py-2 px-2 border-l border-black min-w-[80px] text-black">القرية</th>
                <th className="py-2 px-2 border-l border-black min-w-[90px] text-black">الوحدة التابعة</th>

                {/* 2. Violations */}
                <th className="py-2 px-2 border-l border-black min-w-[85px] text-black">تاريخ العملية</th>
                <th className="py-2 px-2 border-l border-black min-w-[120px] text-black">الجهة المحررة</th>
                <th className="py-2 px-2 border-l border-black min-w-[130px] text-black">نوع المخالفة</th>
                <th className="py-2 px-2 border-l border-black text-black">قيمة المخالفة</th>
                <th className="py-2 px-2 border-l border-black text-black">مخالفات قديمة</th>
                <th className="py-2 px-2 border-l border-black bg-red-200/70 text-black font-black">
                  إجمالي المخالفات
                </th>

                {/* 3. Violation Payment */}
                <th className="py-2 px-2 border-l border-black min-w-[85px] text-black bg-emerald-50">تاريخ السداد</th>
                <th className="py-2 px-2 border-l border-black min-w-[80px] text-black bg-emerald-50">رقم الإيصال</th>
                <th className="py-2 px-2 border-l border-black min-w-[85px] text-black bg-emerald-50">نوع السداد</th>
                <th className="py-2 px-2 border-l border-black text-black bg-emerald-100 font-black">المبلغ المسدد</th>
                <th className="py-2 px-2 border-l border-black bg-emerald-200/70 text-black font-black">
                  المتبقي
                </th>

                {/* 4. Added (المضاف) */}
                <th className="py-2 px-2 border-l border-black text-black">المضاف للمخبز</th>
                <th className="py-2 px-2 border-l border-black min-w-[85px] text-black bg-blue-50">تاريخ السداد</th>
                <th className="py-2 px-2 border-l border-black min-w-[80px] text-black bg-blue-50">رقم الإيصال</th>
                <th className="py-2 px-2 border-l border-black min-w-[85px] text-black bg-blue-50">نوع السداد</th>
                <th className="py-2 px-2 border-l border-black text-black bg-blue-100 font-black">المسدد من المضاف</th>
                <th className="py-2 px-2 border-l border-black bg-blue-200/70 text-black font-black">
                  المتبقي
                </th>

                {/* 5. Disposal (التصرف) */}
                <th className="py-2 px-2 border-l border-black min-w-[85px] text-black">تاريخ التصرف</th>
                <th className="py-2 px-1 border-l border-black text-black">الشكاير</th>
                <th className="py-2 px-2 border-l border-black text-black">سعر الشيكارة</th>
                <th className="py-2 px-1 border-l border-black text-black">المضاعفة</th>
                <th className="py-2 px-2 border-l border-black bg-amber-200/70 text-black font-black">
                  قيمة التصرف
                </th>

                {/* 6. Disposal Payment */}
                <th className="py-2 px-2 border-l border-black text-black bg-teal-50">قيمة التصرف</th>
                <th className="py-2 px-2 border-l border-black min-w-[85px] text-black bg-teal-50">تاريخ السداد</th>
                <th className="py-2 px-2 border-l border-black min-w-[80px] text-black bg-teal-50">رقم الإيصال</th>
                <th className="py-2 px-2 border-l border-black min-w-[85px] text-black bg-teal-50">نوع السداد</th>
                <th className="py-2 px-2 border-l border-black text-black bg-teal-100 font-black">السداد من التصرف</th>
              </tr>
            </thead>

            {/* Table Body with Pure Black (#000000) Numbers & Receipt/Payment Data */}
            <tbody className="divide-y divide-slate-300 font-black text-black bg-white">
              {filteredDebts.length === 0 ? (
                <tr className="bg-white">
                  <td colSpan={34} className="py-10 text-center text-black font-black">
                    لا توجد أي قيود مديونية مطابقة لمعايير البحث الحالية
                  </td>
                </tr>
              ) : (
                filteredDebts.map((d, index) => {
                  const isSelected = selectedRowId === d.id;
                  return (
                    <tr
                      key={d.id}
                      onClick={() => setSelectedRowId(d.id)}
                      className={`cursor-pointer transition-colors text-black ${
                        isSelected
                          ? 'row-selected'
                          : index % 2 === 0
                          ? 'bg-white hover:bg-amber-50'
                          : 'bg-slate-100/90 hover:bg-amber-50'
                      }`}
                    >
                      {/* 1. Basic Info - Index on the RIGHT side */}
                      <td className="py-2.5 px-1 border-l border-slate-300 text-black num-enlarged font-black text-center">
                        {index + 1}
                      </td>

                      <td className="py-2.5 px-2 border-l border-slate-300 font-black text-black text-right">
                        {d.bakeryOwnerName}
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-300 num-enlarged font-black text-black bg-amber-50/70">
                        {d.machineNumber}
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-300 font-black text-black">{d.village}</td>
                      <td className="py-2.5 px-2 border-l border-slate-300 font-black text-black">{d.localUnit}</td>

                      {/* 2. Violations */}
                      <td className="py-2.5 px-2 border-l border-slate-300 num-enlarged font-black text-black">
                        <div>
                          <span>{formatDateDDMMYYYY(d.violationDate) || '-'}</span>
                          {(() => {
                            const { isOverdue, daysElapsed } = getDebtOverdueInfo(
                              d.violationDate || d.disposalDate,
                              d.netRemainingDebt
                            );
                            if (isOverdue) {
                              return (
                                <span
                                  className="block text-[9.5px] font-black text-black bg-rose-200 border border-rose-500 rounded px-1 mt-0.5"
                                  title={`مر ${daysElapsed} يوماً على تحرير الغرامة دون سداد`}
                                >
                                  محرر منذ {daysElapsed} يوم
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-300 text-xs font-black text-black">
                        {d.issuingEntity}
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-300 text-xs text-black font-black">
                        {d.violationType}
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-300 num-enlarged font-black text-black">
                        {d.violationAmount?.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-300 num-enlarged font-black text-black">
                        {d.oldViolations?.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-300 num-enlarged font-black bg-red-100 text-black">
                        {d.totalViolations?.toLocaleString()}
                      </td>

                      {/* 3. Violation Payment (سداد المخالفات والإيصال) */}
                      <td className="py-2.5 px-2 border-l border-slate-300 num-enlarged font-black text-black bg-emerald-50/50">
                        {formatDateDDMMYYYY(d.violationPaymentDate) || '-'}
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-300 num-enlarged font-black text-black bg-emerald-50/50">
                        {d.violationReceiptNumber || '-'}
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-300 bg-emerald-50/50">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-white text-black font-black border border-slate-400">
                          {d.violationPaymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-300 num-enlarged font-black text-black bg-emerald-100/80">
                        {d.paidViolationAmount?.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-300 num-enlarged font-black bg-emerald-200/80 text-black">
                        {d.remainingViolations?.toLocaleString()}
                      </td>

                      {/* 4. Added (المضاف وسداده والإيصال) */}
                      <td className="py-2.5 px-2 border-l border-slate-300 num-enlarged font-black text-black bg-blue-50/50">
                        {d.addedAmount?.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-300 num-enlarged font-black text-black bg-blue-50/50">
                        {formatDateDDMMYYYY(d.addedPaymentDate) || '-'}
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-300 num-enlarged font-black text-black bg-blue-50/50">
                        {d.addedReceiptNumber || '-'}
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-300 bg-blue-50/50">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-white text-black font-black border border-slate-400">
                          {d.addedPaymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-300 num-enlarged font-black text-black bg-blue-100/80">
                        {d.paidAddedAmount?.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-300 num-enlarged font-black bg-blue-200/80 text-black">
                        {d.remainingAdded?.toLocaleString()}
                      </td>

                      {/* 5. Disposal (التصرف) */}
                      <td className="py-2.5 px-2 border-l border-slate-300 num-enlarged font-black text-black bg-amber-50/50">
                        {formatDateDDMMYYYY(d.disposalDate) || '-'}
                      </td>
                      <td className="py-2.5 px-1 border-l border-slate-300 num-enlarged font-black text-black bg-amber-50/50">
                        {d.disposalBags}
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-300 num-enlarged font-black text-black bg-amber-50/50">
                        {d.disposalBagPrice?.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-1 border-l border-slate-300 num-enlarged font-black text-black bg-amber-50/50">
                        {d.disposalMultiplier}x
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-300 num-enlarged font-black bg-amber-200/80 text-black">
                        {d.disposalValue?.toLocaleString()}
                      </td>

                      {/* 6. Disposal Payment (السداد من التصرف والإيصال) */}
                      <td className="py-2.5 px-2 border-l border-slate-300 num-enlarged font-black text-black bg-teal-50/50">
                        {d.disposalValue?.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-300 num-enlarged font-black text-black bg-teal-50/50">
                        {formatDateDDMMYYYY(d.disposalPaymentDate) || '-'}
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-300 num-enlarged font-black text-black bg-teal-50/50">
                        {d.disposalReceiptNumber || '-'}
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-300 bg-teal-50/50">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-white text-black font-black border border-slate-400">
                          {d.disposalPaymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 border-l border-slate-300 num-enlarged font-black text-black bg-teal-100/80">
                        {d.paidDisposalAmount?.toLocaleString()}
                      </td>

                      {/* Net Remaining Debt */}
                      <td className="py-2.5 px-3 border-l border-slate-300 num-enlarged font-black text-black">
                        {d.netRemainingDebt > 0 ? (
                          <div className="space-y-1 flex flex-col items-center justify-center">
                            <span className="inline-block px-2.5 py-1 bg-red-100 text-black border-2 border-red-600 rounded-lg text-xs font-black shadow-xs">
                              {d.netRemainingDebt.toLocaleString()} ج.م
                            </span>

                            {/* Visual Overdue Tag (وسم المتأخرات > 30 يوماً دون سداد كامل) */}
                            {(() => {
                              const { isOverdue, daysElapsed } = getDebtOverdueInfo(
                                d.violationDate || d.disposalDate,
                                d.netRemainingDebt
                              );
                              if (isOverdue) {
                                return (
                                  <span
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-300 text-black border border-red-600 shadow-xs shrink-0 cursor-help my-0.5"
                                    title={`تنبيه متأخرات: مر أكثر من 30 يوماً (${daysElapsed} يوماً) على تاريخ تحرير الغرامة دون سداد كامل!`}
                                  >
                                    <Clock className="w-3 h-3 text-black" />
                                    <span>متأخرات ({daysElapsed} يوم) 🚨</span>
                                  </span>
                                );
                              }
                              return null;
                            })()}

                            {d.netRemainingDebt > 20000 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInstallmentBakeryId(d.bakeryId);
                                  setIsWeeklyInstallmentsOpen(true);
                                }}
                                className="block mx-auto text-[10px] bg-amber-400 hover:bg-amber-300 text-black border border-black px-2 py-0.5 rounded-md font-black cursor-pointer shadow-xs transition-transform hover:scale-105 no-print"
                                title="مديونية تتجاوز 20,000 ج.م - انقر لجدولة دفعات أسبوعية"
                              >
                                &gt; 20 ألف (جدول دفعات أسبوعية)
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-black border-2 border-emerald-600 rounded-lg text-[11px] font-black">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            خالص (0)
                          </span>
                        )}
                      </td>

                      {/* Actions Column moved to the END of the table (Left side in RTL) */}
                      <td className="py-2 px-1.5 border-l border-slate-300 no-print text-center bg-slate-100">
                        {isViewer ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-black bg-white border border-slate-400 px-2 py-1 rounded-lg">
                            <span>👁️</span>
                            <span>عرض فقط</span>
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDebtToEdit(d);
                                setIsDebtModalOpen(true);
                              }}
                              className="p-1.5 bg-amber-100 hover:bg-amber-200 text-black border border-amber-500 rounded-lg transition-all duration-200 transform hover:scale-110 active:scale-95 shadow-xs cursor-pointer"
                              title="تعديل المديونية والإيصال والسداد"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-black" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`هل أنت متأكد من حذف قيد المديونية الخاص بـ "${d.bakeryOwnerName}"؟`)) {
                                  onDeleteDebt(d.id);
                                }
                              }}
                              className="p-1.5 bg-red-100 hover:bg-red-200 text-black border border-red-500 rounded-lg transition-all duration-200 transform hover:scale-110 active:scale-95 shadow-xs cursor-pointer"
                              title="حذف القيد"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-700" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer Totals in Pure Black (#000000) */}
            {filteredDebts.length > 0 && (
              <tfoot className="bg-slate-200 border-t-2 border-black text-black font-black text-xs">
                <tr>
                  <td colSpan={8} className="py-2.5 px-3 border-l border-slate-400 text-right text-black font-black">
                    إجمالي كشف المديونيات والإيصالات والسداد ({filteredDebts.length} قيد):
                  </td>
                  <td className="py-2.5 px-2 border-l border-slate-400 num-enlarged text-black font-black">
                    {filteredDebts.reduce((s, d) => s + (d.violationAmount || 0), 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 border-l border-slate-400 num-enlarged text-black font-black">
                    {filteredDebts.reduce((s, d) => s + (d.oldViolations || 0), 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 border-l border-slate-400 num-enlarged text-black font-black bg-red-200/80">
                    {filteredDebts.reduce((s, d) => s + (d.totalViolations || 0), 0).toLocaleString()}
                  </td>
                  <td colSpan={3} className="py-2.5 px-2 border-l border-slate-400 text-black font-black">
                    إجمالي سداد المخالفات:
                  </td>
                  <td className="py-2.5 px-2 border-l border-slate-400 num-enlarged text-black font-black bg-emerald-200/80">
                    {filteredDebts.reduce((s, d) => s + (d.paidViolationAmount || 0), 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 border-l border-slate-400 num-enlarged text-black font-black bg-emerald-300/80">
                    {filteredDebts.reduce((s, d) => s + (d.remainingViolations || 0), 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 border-l border-slate-400 num-enlarged text-black font-black bg-blue-100">
                    {filteredDebts.reduce((s, d) => s + (d.addedAmount || 0), 0).toLocaleString()}
                  </td>
                  <td colSpan={3} className="py-2.5 px-2 border-l border-slate-400 text-black font-black">
                    إجمالي سداد المضاف:
                  </td>
                  <td className="py-2.5 px-2 border-l border-slate-400 num-enlarged text-black font-black bg-blue-200/80">
                    {filteredDebts.reduce((s, d) => s + (d.paidAddedAmount || 0), 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 border-l border-slate-400 num-enlarged text-black font-black bg-blue-300/80">
                    {filteredDebts.reduce((s, d) => s + (d.remainingAdded || 0), 0).toLocaleString()}
                  </td>
                  <td colSpan={4} className="py-2.5 px-2 border-l border-slate-400 text-black font-black">
                    إجمالي قيمة التصرف:
                  </td>
                  <td className="py-2.5 px-2 border-l border-slate-400 num-enlarged text-black font-black bg-amber-200/80">
                    {filteredDebts.reduce((s, d) => s + (d.disposalValue || 0), 0).toLocaleString()}
                  </td>
                  <td colSpan={4} className="py-2.5 px-2 border-l border-slate-400 text-black font-black">
                    إجمالي سداد التصرف:
                  </td>
                  <td className="py-2.5 px-2 border-l border-slate-400 num-enlarged text-black font-black bg-teal-200/80">
                    {filteredDebts.reduce((s, d) => s + (d.paidDisposalAmount || 0), 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 border-l border-slate-400 num-enlarged text-black font-black bg-red-200">
                    {filteredPeriodNetDebt.toLocaleString()} ج.م
                  </td>
                  <td className="py-2.5 px-1.5 no-print bg-slate-200" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      </div>

      {/* Modal 1: Add / Edit Debt Record */}
      {isDebtModalOpen && (
        <DebtModalForm
          isOpen={isDebtModalOpen}
          onClose={() => setIsDebtModalOpen(false)}
          debtToEdit={debtToEdit}
          bakeries={bakeries}
          issuingEntities={issuingEntities}
          violationTypes={violationTypes}
          onOpenManageEntities={() => setIsEntitiesModalOpen(true)}
          onOpenManageViolations={() => setIsViolationsModalOpen(true)}
          onSave={(saved) => {
            onSaveDebt(saved);
            setIsDebtModalOpen(false);
          }}
        />
      )}

      {/* Modal 2: Dynamic Issuing Entities Manager (Full Edit / Delete / Add / Search) */}
      {isEntitiesModalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingEntityOldName(null);
              setIsEntitiesModalOpen(false);
            }
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border-2 border-amber-600 w-full max-w-xl p-5 cursor-default flex flex-col max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    إدارة وتعديل الجهات المحررة لمحاضر المخابز
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold">
                    إجمالي الجهات المعتمدة: {issuingEntities.length} جهة رسمية
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingEntityOldName(null);
                  setIsEntitiesModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add New Entity Form */}
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 mb-3.5 shrink-0">
              <label className="block text-[11px] font-black text-amber-950 mb-1.5">
                إضافة جهة محررة جديدة إلى المنظومة:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newEntityName}
                  onChange={(e) => setNewEntityName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const name = newEntityName.trim();
                      if (!name) return;
                      if (issuingEntities.includes(name)) {
                        alert('هذه الجهة مسجلة بالفعل في القائمة');
                        return;
                      }
                      onUpdateEntities([...issuingEntities, name]);
                      setNewEntityName('');
                    }
                  }}
                  placeholder="اكتب اسم الجهة (مثال: جهاز حماية المستهلك، مباحث التموين...)"
                  className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 text-right placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    const name = newEntityName.trim();
                    if (!name) return;
                    if (issuingEntities.includes(name)) {
                      alert('هذه الجهة مسجلة بالفعل في القائمة');
                      return;
                    }
                    onUpdateEntities([...issuingEntities, name]);
                    setNewEntityName('');
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white rounded-lg text-xs font-black shadow-sm shrink-0 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  إضافة جهة
                </button>
              </div>
            </div>

            {/* Search in Entities */}
            <div className="relative mb-3 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={entitySearchQuery}
                onChange={(e) => setEntitySearchQuery(e.target.value)}
                placeholder="بحث سريع داخل قائمة الجهات المحررة..."
                className="w-full pr-8 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-amber-500"
              />
              {entitySearchQuery && (
                <button
                  type="button"
                  onClick={() => setEntitySearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  مسح
                </button>
              )}
            </div>

            {/* List of Entities */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 min-h-[160px] max-h-[340px]">
              {issuingEntities
                .filter((ent) =>
                  entitySearchQuery.trim()
                    ? ent.toLowerCase().includes(entitySearchQuery.toLowerCase().trim())
                    : true
                )
                .map((ent, idx) => {
                  const isEditing = editingEntityOldName === ent;
                  const usageCount = debts.filter((d) => d.issuingEntity === ent).length;

                  return (
                    <div
                      key={ent}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        isEditing
                          ? 'bg-amber-50/80 border-amber-400 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                      }`}
                    >
                      {isEditing ? (
                        /* Inline Edit View */
                        <div className="flex items-center gap-2 flex-1 ml-2">
                          <input
                            type="text"
                            autoFocus
                            value={editingEntityNewName}
                            onChange={(e) => setEditingEntityNewName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const clean = editingEntityNewName.trim();
                                if (!clean) return;
                                if (clean !== ent && issuingEntities.includes(clean)) {
                                  alert('اسم الجهة موجود بالفعل في القائمة');
                                  return;
                                }
                                if (clean !== ent) {
                                  if (onRenameEntity) {
                                    onRenameEntity(ent, clean);
                                  } else {
                                    onUpdateEntities(
                                      issuingEntities.map((item) => (item === ent ? clean : item))
                                    );
                                  }
                                }
                                setEditingEntityOldName(null);
                                setEditingEntityNewName('');
                              } else if (e.key === 'Escape') {
                                setEditingEntityOldName(null);
                                setEditingEntityNewName('');
                              }
                            }}
                            className="flex-1 px-2.5 py-1 bg-white border-2 border-amber-500 rounded-lg text-xs font-black text-slate-900 focus:outline-none"
                            placeholder="الاسم الجديد للجهة..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const clean = editingEntityNewName.trim();
                              if (!clean) {
                                alert('يرجى إدخال اسم صحيح');
                                return;
                              }
                              if (clean !== ent && issuingEntities.includes(clean)) {
                                alert('اسم الجهة موجود بالفعل في القائمة');
                                return;
                              }
                              if (clean !== ent) {
                                if (onRenameEntity) {
                                  onRenameEntity(ent, clean);
                                } else {
                                  onUpdateEntities(
                                    issuingEntities.map((item) => (item === ent ? clean : item))
                                  );
                                }
                              }
                              setEditingEntityOldName(null);
                              setEditingEntityNewName('');
                            }}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                            title="حفظ التعديل"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEntityOldName(null);
                              setEditingEntityNewName('');
                            }}
                            className="p-1.5 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="إلغاء التعديل"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        /* Normal View */
                        <>
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-600 text-[10px] font-mono flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-slate-900 font-black">{ent}</span>
                            {usageCount > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                {usageCount} محضر مديونية
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                                غير مستخدم حالياً
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingEntityOldName(ent);
                                setEditingEntityNewName(ent);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 hover:text-amber-800 bg-white hover:bg-amber-50 border border-slate-300 hover:border-amber-400 rounded-lg transition-all text-[11px] font-bold cursor-pointer"
                              title="تعديل اسم الجهة وتحديث كافة المحاضر المرتبطة بها"
                            >
                              <Edit2 className="w-3 h-3 text-amber-600" />
                              تعديل
                            </button>

                            {issuingEntities.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (usageCount > 0) {
                                    const confirmDel = window.confirm(
                                      `تنبيه: الجهة "${ent}" مسجلة حالياً في (${usageCount}) محضر مديونية. هل أنت متأكد من رغبتك في حذفها من القائمة المعتمدة؟`
                                    );
                                    if (!confirmDel) return;
                                  }
                                  onUpdateEntities(issuingEntities.filter((e) => e !== ent));
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-red-600 hover:text-red-800 bg-white hover:bg-red-50 border border-slate-300 hover:border-red-400 rounded-lg transition-all text-[11px] font-bold cursor-pointer"
                                title="حذف الجهة من القائمة"
                              >
                                <Trash2 className="w-3 h-3 text-red-600" />
                                حذف
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

              {issuingEntities.filter((ent) =>
                entitySearchQuery.trim()
                  ? ent.toLowerCase().includes(entitySearchQuery.toLowerCase().trim())
                  : true
              ).length === 0 && (
                <div className="text-center py-6 text-xs text-slate-500 font-bold">
                  لا توجد جهات مطابقة لكلمة البحث "{entitySearchQuery}"
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 font-bold">
                * عند تعديل اسم الجهة، يتم تلقائياً تحديث جميع القيود التاريخية المسجلة باسمها القديم
              </span>
              <button
                type="button"
                onClick={() => {
                  setEditingEntityOldName(null);
                  setIsEntitiesModalOpen(false);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm"
              >
                تم والعودة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Dynamic Violation Types Manager (Full Edit / Delete / Add / Search) */}
      {isViolationsModalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingViolationOldName(null);
              setIsViolationsModalOpen(false);
            }
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border-2 border-red-600 w-full max-w-xl p-5 cursor-default flex flex-col max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-700 flex items-center justify-center">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    إدارة وتعديل أنواع المخالفات التموينية المعتمدة
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold">
                    إجمالي أنواع المخالفات المعتمدة: {violationTypes.length} نوع مخالفة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingViolationOldName(null);
                  setIsViolationsModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add New Violation Type Form */}
            <div className="bg-red-50/60 border border-red-200 rounded-xl p-3 mb-3.5 shrink-0">
              <label className="block text-[11px] font-black text-red-950 mb-1.5">
                إضافة نوع مخالفة جديد إلى المنظومة:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newViolationName}
                  onChange={(e) => setNewViolationName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const name = newViolationName.trim();
                      if (!name) return;
                      if (violationTypes.includes(name)) {
                        alert('نوع المخالفة مسجل مسبقاً في القائمة');
                        return;
                      }
                      onUpdateViolations([...violationTypes, name]);
                      setNewViolationName('');
                    }
                  }}
                  placeholder="اكتب نوع المخالفة (مثال: عدم نظافة المعجن، بيع بأزيد من السعر...)"
                  className="flex-1 px-3 py-2 bg-white border border-red-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-red-500 text-right placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    const name = newViolationName.trim();
                    if (!name) return;
                    if (violationTypes.includes(name)) {
                      alert('نوع المخالفة مسجل مسبقاً في القائمة');
                      return;
                    }
                    onUpdateViolations([...violationTypes, name]);
                    setNewViolationName('');
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white rounded-lg text-xs font-black shadow-sm shrink-0 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  إضافة مخالفة
                </button>
              </div>
            </div>

            {/* Search in Violation Types */}
            <div className="relative mb-3 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={violationSearchQuery}
                onChange={(e) => setViolationSearchQuery(e.target.value)}
                placeholder="بحث سريع داخل أنواع المخالفات..."
                className="w-full pr-8 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-red-500"
              />
              {violationSearchQuery && (
                <button
                  type="button"
                  onClick={() => setViolationSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  مسح
                </button>
              )}
            </div>

            {/* List of Violation Types */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 min-h-[160px] max-h-[340px]">
              {violationTypes
                .filter((v) =>
                  violationSearchQuery.trim()
                    ? v.toLowerCase().includes(violationSearchQuery.toLowerCase().trim())
                    : true
                )
                .map((v, idx) => {
                  const isEditing = editingViolationOldName === v;
                  const usageCount = debts.filter((d) => d.violationType === v).length;

                  return (
                    <div
                      key={v}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        isEditing
                          ? 'bg-red-50/80 border-red-400 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                      }`}
                    >
                      {isEditing ? (
                        /* Inline Edit View */
                        <div className="flex items-center gap-2 flex-1 ml-2">
                          <input
                            type="text"
                            autoFocus
                            value={editingViolationNewName}
                            onChange={(e) => setEditingViolationNewName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const clean = editingViolationNewName.trim();
                                if (!clean) return;
                                if (clean !== v && violationTypes.includes(clean)) {
                                  alert('نوع المخالفة موجود بالفعل في القائمة');
                                  return;
                                }
                                if (clean !== v) {
                                  if (onRenameViolation) {
                                    onRenameViolation(v, clean);
                                  } else {
                                    onUpdateViolations(
                                      violationTypes.map((item) => (item === v ? clean : item))
                                    );
                                  }
                                }
                                setEditingViolationOldName(null);
                                setEditingViolationNewName('');
                              } else if (e.key === 'Escape') {
                                setEditingViolationOldName(null);
                                setEditingViolationNewName('');
                              }
                            }}
                            className="flex-1 px-2.5 py-1 bg-white border-2 border-red-500 rounded-lg text-xs font-black text-slate-900 focus:outline-none"
                            placeholder="الاسم الجديد لنوع المخالفة..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const clean = editingViolationNewName.trim();
                              if (!clean) {
                                alert('يرجى إدخال اسم صحيح');
                                return;
                              }
                              if (clean !== v && violationTypes.includes(clean)) {
                                alert('نوع المخالفة موجود بالفعل في القائمة');
                                return;
                              }
                              if (clean !== v) {
                                if (onRenameViolation) {
                                  onRenameViolation(v, clean);
                                } else {
                                  onUpdateViolations(
                                    violationTypes.map((item) => (item === v ? clean : item))
                                  );
                                }
                              }
                              setEditingViolationOldName(null);
                              setEditingViolationNewName('');
                            }}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                            title="حفظ التعديل"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingViolationOldName(null);
                              setEditingViolationNewName('');
                            }}
                            className="p-1.5 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="إلغاء التعديل"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        /* Normal View */
                        <>
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-600 text-[10px] font-mono flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-slate-900 font-black">{v}</span>
                            {usageCount > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                                {usageCount} محضر مديونية
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                                غير مستخدم حالياً
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingViolationOldName(v);
                                setEditingViolationNewName(v);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 hover:text-red-800 bg-white hover:bg-red-50 border border-slate-300 hover:border-red-400 rounded-lg transition-all text-[11px] font-bold cursor-pointer"
                              title="تعديل نوع المخالفة وتحديث كافة المحاضر المرتبطة بها"
                            >
                              <Edit2 className="w-3 h-3 text-red-600" />
                              تعديل
                            </button>

                            {violationTypes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (usageCount > 0) {
                                    const confirmDel = window.confirm(
                                      `تنبيه: نوع المخالفة "${v}" مسجل حالياً في (${usageCount}) محضر مديونية. هل أنت متأكد من رغبتك في حذفه من القائمة المعتمدة؟`
                                    );
                                    if (!confirmDel) return;
                                  }
                                  onUpdateViolations(violationTypes.filter((vt) => vt !== v));
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-red-600 hover:text-red-800 bg-white hover:bg-red-50 border border-slate-300 hover:border-red-400 rounded-lg transition-all text-[11px] font-bold cursor-pointer"
                                title="حذف نوع المخالفة من القائمة"
                              >
                                <Trash2 className="w-3 h-3 text-red-600" />
                                حذف
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

              {violationTypes.filter((v) =>
                violationSearchQuery.trim()
                  ? v.toLowerCase().includes(violationSearchQuery.toLowerCase().trim())
                  : true
              ).length === 0 && (
                <div className="text-center py-6 text-xs text-slate-500 font-bold">
                  لا توجد مخالفات مطابقة لكلمة البحث "{violationSearchQuery}"
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 font-bold">
                * عند تعديل اسم المخالفة، يتم تلقائياً تحديث جميع القيود التاريخية المسجلة بالاسم القديم
              </span>
              <button
                type="button"
                onClick={() => {
                  setEditingViolationOldName(null);
                  setIsViolationsModalOpen(false);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm"
              >
                تم والعودة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Weekly Installments Schedule (> 20,000 EGP) */}
      {isWeeklyInstallmentsOpen && (
        <WeeklyInstallmentsModal
          isOpen={isWeeklyInstallmentsOpen}
          onClose={() => setIsWeeklyInstallmentsOpen(false)}
          bakeries={bakeries}
          debts={debts}
          systemConfig={systemConfig}
          initialBakeryId={installmentBakeryId}
        />
      )}

      {/* Modal 5: Supply Fines & Penalties Calculator */}
      {isCalculatorModalOpen && (
        <SupplyFinesCalculatorModal
          isOpen={isCalculatorModalOpen}
          onClose={() => setIsCalculatorModalOpen(false)}
          bakeries={bakeries}
          onApplyFineToDebt={(prefilled) => {
            const draftDebt: DebtRecord = {
              id: `fine-${Date.now()}`,
              bakeryId: prefilled.bakeryId,
              bakeryOwnerName: prefilled.bakeryOwnerName,
              machineNumber: prefilled.machineNumber,
              village: prefilled.village,
              localUnit: prefilled.localUnit,
              violationDate: new Date().toISOString().split('T')[0],
              issuingEntity: issuingEntities[0] || 'إدارة التموين',
              violationType: prefilled.violationType,
              violationAmount: prefilled.violationAmount,
              oldViolations: 0,
              totalViolations: prefilled.violationAmount,
              violationPaymentDate: '',
              violationReceiptNumber: '',
              violationPaymentMethod: 'نقدي',
              paidViolationAmount: 0,
              remainingViolations: prefilled.violationAmount,
              addedAmount: 0,
              addedPaymentDate: '',
              addedReceiptNumber: '',
              addedPaymentMethod: 'نقدي',
              paidAddedAmount: 0,
              remainingAdded: 0,
              disposalDate: '',
              disposalBags: 0,
              disposalBagPrice: 850,
              disposalMultiplier: 1,
              disposalValue: 0,
              disposalPaymentDate: '',
              disposalReceiptNumber: '',
              disposalPaymentMethod: 'نقدي',
              paidDisposalAmount: 0,
              remainingDisposal: 0,
              netRemainingDebt: prefilled.violationAmount,
              notes: prefilled.notes,
            };
            setDebtToEdit(draftDebt);
            setIsDebtModalOpen(true);
          }}
        />
      )}
    </div>
  );
};

// Sub-component: Add / Edit Debt Modal Form
interface DebtModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  debtToEdit: DebtRecord | null;
  bakeries: Bakery[];
  issuingEntities: string[];
  violationTypes: string[];
  onOpenManageEntities?: () => void;
  onOpenManageViolations?: () => void;
  onSave: (debt: DebtRecord) => void;
}

const DebtModalForm: React.FC<DebtModalFormProps> = ({
  isOpen,
  onClose,
  debtToEdit,
  bakeries,
  issuingEntities,
  violationTypes,
  onOpenManageEntities,
  onOpenManageViolations,
  onSave,
}) => {
  // Bakery Selection
  const [selectedBakeryId, setSelectedBakeryId] = useState(
    debtToEdit?.bakeryId || bakeries[0]?.id || ''
  );

  // Violations
  const [violationDate, setViolationDate] = useState(
    debtToEdit?.violationDate || new Date().toISOString().split('T')[0]
  );
  const [issuingEntity, setIssuingEntity] = useState(
    debtToEdit?.issuingEntity || issuingEntities[0] || 'إدارة تموين مركز المحلة الكبرى'
  );
  const [violationType, setViolationType] = useState(
    debtToEdit?.violationType || violationTypes[0] || 'نقص وزن الرغيف البلدي المدعم'
  );

  // Keep selected entity and violation in sync if options are updated/renamed
  useEffect(() => {
    if (issuingEntities.length > 0 && !issuingEntities.includes(issuingEntity)) {
      setIssuingEntity(issuingEntities[0]);
    }
  }, [issuingEntities, issuingEntity]);

  useEffect(() => {
    if (violationTypes.length > 0 && !violationTypes.includes(violationType)) {
      setViolationType(violationTypes[0]);
    }
  }, [violationTypes, violationType]);
  const [violationAmount, setViolationAmount] = useState<number>(debtToEdit?.violationAmount || 0);
  const [oldViolations, setOldViolations] = useState<number>(debtToEdit?.oldViolations || 0);

  // Violation Payment
  const [violationPaymentDate, setViolationPaymentDate] = useState(
    debtToEdit?.violationPaymentDate || ''
  );
  const [violationReceiptNumber, setViolationReceiptNumber] = useState(
    debtToEdit?.violationReceiptNumber || ''
  );
  const [violationPaymentMethod, setViolationPaymentMethod] = useState(
    debtToEdit?.violationPaymentMethod || 'كاش'
  );
  const [paidViolationAmount, setPaidViolationAmount] = useState<number>(
    debtToEdit?.paidViolationAmount || 0
  );

  // Added (المضاف)
  const [addedAmount, setAddedAmount] = useState<number>(debtToEdit?.addedAmount || 0);
  const [addedPaymentDate, setAddedPaymentDate] = useState(debtToEdit?.addedPaymentDate || '');
  const [addedReceiptNumber, setAddedReceiptNumber] = useState(debtToEdit?.addedReceiptNumber || '');
  const [addedPaymentMethod, setAddedPaymentMethod] = useState(
    debtToEdit?.addedPaymentMethod || 'كاش'
  );
  const [paidAddedAmount, setPaidAddedAmount] = useState<number>(debtToEdit?.paidAddedAmount || 0);

  // Disposal (التصرف)
  const [disposalDate, setDisposalDate] = useState(debtToEdit?.disposalDate || '');
  const [disposalBags, setDisposalBags] = useState<number>(debtToEdit?.disposalBags || 0);
  const [disposalBagPrice, setDisposalBagPrice] = useState<number>(
    debtToEdit?.disposalBagPrice || 950
  );
  const [disposalMultiplier, setDisposalMultiplier] = useState<number>(
    debtToEdit?.disposalMultiplier || 1
  );

  // Disposal Payment
  const [disposalPaymentDate, setDisposalPaymentDate] = useState(
    debtToEdit?.disposalPaymentDate || ''
  );
  const [disposalReceiptNumber, setDisposalReceiptNumber] = useState(
    debtToEdit?.disposalReceiptNumber || ''
  );
  const [disposalPaymentMethod, setDisposalPaymentMethod] = useState(
    debtToEdit?.disposalPaymentMethod || 'كاش'
  );
  const [paidDisposalAmount, setPaidDisposalAmount] = useState<number>(
    debtToEdit?.paidDisposalAmount || 0
  );

  const [notes, setNotes] = useState(debtToEdit?.notes || '');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string>('');

  // Mini Fine Calculator inside Debt Modal ("مفتاح حساب الغرامة")
  const [showFineCalc, setShowFineCalc] = useState(false);
  const [calcViolationType, setCalcViolationType] = useState(
    debtToEdit?.violationType || violationTypes[0] || 'نقص وزن الرغيف البلدي المدعم'
  );
  const [calcLoavesCount, setCalcLoavesCount] = useState<number>(1000);
  const [calcFinePerLoaf, setCalcFinePerLoaf] = useState<number>(1.5);
  const [fineAppliedNotice, setFineAppliedNotice] = useState<string>('');
  const calculatedFineTotal =
    Math.round((Number(calcLoavesCount) || 0) * (Number(calcFinePerLoaf) || 0) * 100) / 100;

  const handleApplyCalculatedFine = () => {
    setViolationAmount(calculatedFineTotal);
    if (calcViolationType) {
      setViolationType(calcViolationType);
    }
    const calcSummary = `حساب الغرامة (${calcViolationType}): ${calcLoavesCount.toLocaleString()} رغيف × ${calcFinePerLoaf} ج.م = ${calculatedFineTotal.toLocaleString()} ج.م`;
    setNotes((prev) => (prev ? `${prev} | ${calcSummary}` : calcSummary));
    setFineAppliedNotice(`تم حساب وإدراج مبلغ (${calculatedFineTotal.toLocaleString()} ج.م) تلقائياً في خانة قيمة المخالفة والمديونية!`);
    setShowFineCalc(false);
    setTimeout(() => setFineAppliedNotice(''), 5000);
  };

  // Auto-calculated values
  const totalViolations = (Number(violationAmount) || 0) + (Number(oldViolations) || 0);
  const remainingViolations = Math.max(0, totalViolations - (Number(paidViolationAmount) || 0));

  const remainingAdded = Math.max(0, (Number(addedAmount) || 0) - (Number(paidAddedAmount) || 0));

  // Auto-save draft on any field change
  React.useEffect(() => {
    if (!isOpen) return;

    const draft = {
      selectedBakeryId,
      violationDate,
      issuingEntity,
      violationType,
      violationAmount,
      oldViolations,
      violationPaymentDate,
      violationReceiptNumber,
      violationPaymentMethod,
      paidViolationAmount,
      addedAmount,
      addedPaymentDate,
      addedReceiptNumber,
      addedPaymentMethod,
      paidAddedAmount,
      disposalDate,
      disposalBags,
      disposalBagPrice,
      disposalMultiplier,
      disposalPaymentDate,
      disposalReceiptNumber,
      disposalPaymentMethod,
      paidDisposalAmount,
      notes,
      updatedAt: Date.now(),
    };

    try {
      localStorage.setItem('TAMWEEN_DEBT_DRAFT', JSON.stringify(draft));
      setAutoSaveStatus('saved');
      setLastAutoSaveTime(
        new Date().toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    } catch {
      // storage fallback
    }
  }, [
    isOpen,
    selectedBakeryId,
    violationDate,
    issuingEntity,
    violationType,
    violationAmount,
    oldViolations,
    violationPaymentDate,
    violationReceiptNumber,
    violationPaymentMethod,
    paidViolationAmount,
    addedAmount,
    addedPaymentDate,
    addedReceiptNumber,
    addedPaymentMethod,
    paidAddedAmount,
    disposalDate,
    disposalBags,
    disposalBagPrice,
    disposalMultiplier,
    disposalPaymentDate,
    disposalReceiptNumber,
    disposalPaymentMethod,
    paidDisposalAmount,
    notes,
  ]);

  const disposalValue =
    (Number(disposalBags) || 0) *
    (Number(disposalBagPrice) || 0) *
    (Number(disposalMultiplier) || 1);
  const remainingDisposal = Math.max(0, disposalValue - (Number(paidDisposalAmount) || 0));

  // Required Exact Net Remaining Debt Equation:
  // (قيمة المخالفة + مخالفات قديمة - المبلغ المسدد) + (قيمة التصرف - السداد من التصرف) + (المضاف - المسدد من المضاف)
  const netRemainingDebt = remainingViolations + remainingDisposal + remainingAdded;

  const currentBakery = bakeries.find((b) => b.id === selectedBakeryId) || bakeries[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBakery) {
      alert('يرجى اختيار مخبز مسجل أولاً');
      return;
    }

    const record: DebtRecord = {
      id: debtToEdit ? debtToEdit.id : `d-${Date.now()}`,
      bakeryId: currentBakery.id,
      bakeryOwnerName: currentBakery.bakeryOwnerName,
      machineNumber: currentBakery.machineNumber,
      village: currentBakery.village,
      localUnit: currentBakery.localUnit,

      violationDate,
      issuingEntity,
      violationType,
      violationAmount: Number(violationAmount) || 0,
      oldViolations: Number(oldViolations) || 0,
      totalViolations,

      violationPaymentDate,
      violationReceiptNumber,
      violationPaymentMethod,
      paidViolationAmount: Number(paidViolationAmount) || 0,
      remainingViolations,

      addedAmount: Number(addedAmount) || 0,
      addedPaymentDate,
      addedReceiptNumber,
      addedPaymentMethod,
      paidAddedAmount: Number(paidAddedAmount) || 0,
      remainingAdded,

      disposalDate,
      disposalBags: Number(disposalBags) || 0,
      disposalBagPrice: Number(disposalBagPrice) || 0,
      disposalMultiplier: Number(disposalMultiplier) || 1,
      disposalValue,

      disposalPaymentDate,
      disposalReceiptNumber,
      disposalPaymentMethod,
      paidDisposalAmount: Number(paidDisposalAmount) || 0,
      remainingDisposal,

      netRemainingDebt,
      notes: notes.trim(),
    };

    onSave(record);
  };

  // Escape key listener
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm overflow-y-auto cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="bg-white text-black rounded-2xl shadow-2xl border-2 border-red-600/40 w-full max-w-5xl my-4 overflow-hidden flex flex-col max-h-[92vh] cursor-default">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-red-950 via-slate-900 to-amber-950 p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Scale className="w-6 h-6 text-amber-300" />
            <div>
              <h3 className="text-base font-black">
                {debtToEdit ? 'تعديل قيد مديونية / مخالفة مخبز' : 'تسجيل قيد مديونية ومخالفة جديدة'}
              </h3>
              <p className="text-[11px] text-amber-100 font-bold">
                حساب آلي للمخالفات، المضاف، التصرف، والسداد بصافي المتبقي الدقيق
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {autoSaveStatus === 'saved' && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-400/50 rounded-full text-[11px] font-black text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>تم الحفظ التلقائي لكل بيان ({lastAutoSaveTime})</span>
              </div>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 rounded-xl bg-red-900/60 hover:bg-red-600 text-white transition cursor-pointer border border-red-500/50 hover:scale-105 active:scale-95 shadow-md"
              title="إغلاق النافذة (Escape)"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 flex-1 text-black">
          {/* Net Remaining Summary Banner */}
          <div className="bg-gradient-to-r from-red-50 via-amber-50 to-red-50 border-2 border-red-400 p-3.5 rounded-xl flex items-center justify-between gap-4 text-black">
            <div>
              <span className="text-xs font-black text-black block">
                المعادلة المعتمدة: (المخالفات - المسدد) + (التصرف - المسدد) + (المضاف - المسدد)
              </span>
              <span className="text-[11px] text-black font-black">
                متبقي مخالفات: {remainingViolations.toLocaleString()} | متبقي تصرف: {remainingDisposal.toLocaleString()} | متبقي مضاف: {remainingAdded.toLocaleString()}
              </span>
            </div>
            <div className="text-left">
              <span className="text-[11px] font-black text-black block">صافي المتبقي على صاحب المخبز</span>
              <span className="text-xl font-black text-black num-enlarged">
                {netRemainingDebt.toLocaleString()} ج.م
              </span>
            </div>
          </div>

          {/* Section 1: Choose Bakery */}
          <div className="border-2 border-slate-300 rounded-xl p-4 bg-slate-50 text-black">
            <h4 className="text-xs font-black text-black pb-2 mb-3 border-b border-slate-300 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-amber-700" />
              1. البيانات الأساسية وموقع المخبز (جلب تلقائي)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-black mb-1">
                  اختر صاحب المخبز من قاعدة البيانات *
                </label>
                <select
                  value={selectedBakeryId}
                  onChange={(e) => setSelectedBakeryId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black focus:ring-2 focus:ring-amber-500"
                >
                  {bakeries.map((b) => (
                    <option key={b.id} value={b.id} className="text-black font-black">
                      {b.bakeryOwnerName} (ماكينة: {b.machineNumber} - قرية: {b.village})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-black mb-1">رقم الماكينة</label>
                <input
                  type="text"
                  disabled
                  value={currentBakery?.machineNumber || ''}
                  className="w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-lg text-xs font-black text-black num-enlarged text-center"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-black mb-1">القرية</label>
                <input
                  type="text"
                  disabled
                  value={currentBakery?.village || ''}
                  className="w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-lg text-xs font-black text-black text-center"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-black mb-1">الوحدة التابعة</label>
                <input
                  type="text"
                  disabled
                  value={currentBakery?.localUnit || ''}
                  className="w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-lg text-xs font-black text-black text-center"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Violations */}
          <div className="border-2 border-red-300 rounded-xl p-4 bg-red-50/40 space-y-3 text-black">
            <h4 className="text-xs font-black text-black pb-2 border-b border-red-300 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span>2. مخالفات المخبز</span>
                <button
                  type="button"
                  onClick={() => setShowFineCalc((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black rounded-lg text-xs font-black shadow-md border border-amber-400 cursor-pointer transition transform hover:scale-105 active:scale-95"
                  title="فتح حاسبة الغرامة السريعة لحساب (عدد الأرغفة × سعر الغرامة للرغيف) وإدراج المبلغ تلقائياً في خانة المديونية"
                >
                  <Calculator className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                  <span>حساب الغرامة 🧮</span>
                </button>
              </div>
              <span className="text-[11px] text-black font-black bg-white px-2.5 py-0.5 rounded border border-red-300">
                إجمالي المخالفات: {totalViolations.toLocaleString()} ج.م
              </span>
            </h4>

            {/* Confirmation Notice when fine is calculated & applied */}
            {fineAppliedNotice && (
              <div className="p-2.5 bg-emerald-100 border border-emerald-500 text-black rounded-xl text-xs font-black flex items-center justify-between">
                <span>✅ {fineAppliedNotice}</span>
                <button
                  type="button"
                  onClick={() => setFineAppliedNotice('')}
                  className="text-black hover:text-red-800 font-black px-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Inline Mini Fine Calculator ("حساب الغرامة") */}
            {showFineCalc && (
              <div className="bg-gradient-to-r from-amber-50 via-yellow-50/80 to-amber-50 border-2 border-amber-400 rounded-xl p-3.5 shadow-lg space-y-3 text-black">
                <div className="flex items-center justify-between border-b border-amber-300 pb-2">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-black" />
                    <span className="text-xs font-black text-black">
                      حاسبة الغرامة الفورية (نوع المخالفة × عدد الأرغفة × سعر الغرامة للرغيف)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFineCalc(false)}
                    className="text-xs font-black text-black bg-red-100 px-2 py-0.5 rounded border border-red-400 cursor-pointer"
                  >
                    إغلاق الحاسبة ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-[11px] font-black text-black mb-1">
                      1. نوع المخالفة
                    </label>
                    <select
                      value={calcViolationType}
                      onChange={(e) => setCalcViolationType(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border-2 border-amber-500 rounded-lg text-xs font-black text-black focus:ring-2 focus:ring-amber-500"
                    >
                      {violationTypes.map((t) => (
                        <option key={t} value={t} className="text-black font-black">
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-black mb-1">
                      2. عدد الأرغفة (رغيف)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={calcLoavesCount}
                      onChange={(e) => setCalcLoavesCount(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="أدخل عدد الأرغفة"
                      className="w-full px-2.5 py-1.5 bg-white border-2 border-amber-500 rounded-lg text-xs font-black text-black num-enlarged text-center focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-black text-black">
                        3. سعر الغرامة للرغيف (ج.م)
                      </label>
                      <div className="flex items-center gap-1">
                        {[1, 1.25, 1.5, 2].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setCalcFinePerLoaf(preset)}
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-black border cursor-pointer ${
                              calcFinePerLoaf === preset
                                ? 'bg-amber-500 text-black border-amber-700'
                                : 'bg-white text-black border-slate-400 hover:bg-amber-100'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      step="0.05"
                      value={calcFinePerLoaf}
                      onChange={(e) => setCalcFinePerLoaf(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="سعر الغرامة للرغيف"
                      className="w-full px-2.5 py-1.5 bg-white border-2 border-amber-500 rounded-lg text-xs font-black text-black num-enlarged text-center focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="bg-amber-100 text-black p-2 rounded-xl border-2 border-amber-500 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-black font-black">إجمالي المبلغ المحسوب</span>
                    <span className="text-base font-black text-black num-enlarged">
                      {calculatedFineTotal.toLocaleString()} ج.م
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-300">
                  <span className="text-[11px] font-black text-black">
                    المعادلة: {calcLoavesCount.toLocaleString()} رغيف × {calcFinePerLoaf} ج.م ={' '}
                    <strong className="font-black text-black">{calculatedFineTotal.toLocaleString()} ج.م</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleApplyCalculatedFine}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-lg text-xs font-black shadow-md cursor-pointer border border-emerald-400"
                  >
                    <Save className="w-3.5 h-3.5 text-emerald-200" />
                    <span>إدراج المبلغ تلقائياً في خانة المديونية ({calculatedFineTotal.toLocaleString()} ج.م) ✓</span>
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-black text-black mb-1">تاريخ العملية (يوم/شهر/سنة)</label>
                <input
                  type="date"
                  lang="ar-EG"
                  value={violationDate}
                  onChange={(e) => setViolationDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black"
                />
                {violationDate && (
                  <span className="block text-[10px] font-black text-black bg-amber-100 border border-amber-400 rounded px-1 mt-1 text-center font-mono">
                    📅 {formatDateDDMMYYYY(violationDate)}
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black text-black">
                    الجهة المحررة للمحضر
                  </label>
                  {onOpenManageEntities && (
                    <button
                      type="button"
                      onClick={onOpenManageEntities}
                      className="inline-flex items-center gap-1 text-[10px] text-black font-black bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 rounded border border-amber-400 transition-colors cursor-pointer"
                      title="إدارة وتعديل وحذف الجهات المحررة"
                    >
                      <Settings className="w-2.5 h-2.5 text-black" />
                      إدارة/تعديل ({issuingEntities.length})
                    </button>
                  )}
                </div>
                <select
                  value={issuingEntity}
                  onChange={(e) => {
                    if (e.target.value === '__MANAGE_ENTITIES__') {
                      onOpenManageEntities?.();
                      return;
                    }
                    setIssuingEntity(e.target.value);
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black focus:ring-2 focus:ring-amber-500"
                >
                  <option value="__MANAGE_ENTITIES__" className="text-black font-black bg-amber-50">
                    ⚙️ إدارة وتعديل / حذف الجهات المحررة ({issuingEntities.length})...
                  </option>
                  {issuingEntities.map((e) => (
                    <option key={e} value={e} className="text-black font-black">
                      {e}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black text-black">نوع المخالفة</label>
                  {onOpenManageViolations && (
                    <button
                      type="button"
                      onClick={onOpenManageViolations}
                      className="inline-flex items-center gap-1 text-[10px] text-black font-black bg-red-100 hover:bg-red-200 px-1.5 py-0.5 rounded border border-red-400 transition-colors cursor-pointer"
                      title="إدارة وتعديل وحذف أنواع المخالفات"
                    >
                      <Settings className="w-2.5 h-2.5 text-black" />
                      إدارة/تعديل ({violationTypes.length})
                    </button>
                  )}
                </div>
                <select
                  value={violationType}
                  onChange={(e) => {
                    if (e.target.value === '__MANAGE_VIOLATIONS__') {
                      onOpenManageViolations?.();
                      return;
                    }
                    setViolationType(e.target.value);
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black focus:ring-2 focus:ring-red-500"
                >
                  <option value="__MANAGE_VIOLATIONS__" className="text-black font-black bg-red-50">
                    ⚙️ إدارة وتعديل / حذف أنواع المخالفات ({violationTypes.length})...
                  </option>
                  {violationTypes.map((t) => (
                    <option key={t} value={t} className="text-black font-black">
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black text-black">قيمة المخالفة (ج.م)</label>
                  <button
                    type="button"
                    onClick={() => setShowFineCalc((prev) => !prev)}
                    className="text-[10px] font-black text-black bg-amber-100 hover:bg-amber-200 px-1.5 py-0.2 rounded border border-amber-400 cursor-pointer"
                    title="حساب الغرامة تلقائياً"
                  >
                    🧮 حساب الغرامة
                  </button>
                </div>
                <input
                  type="number"
                  value={violationAmount}
                  onChange={(e) => setViolationAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black num-enlarged text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-black mb-1">مخالفات قديمة (ج.م)</label>
                <input
                  type="number"
                  value={oldViolations}
                  onChange={(e) => setOldViolations(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black num-enlarged text-center"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Violation Payment */}
          <div className="border-2 border-emerald-400 rounded-xl p-4 bg-emerald-50/40 text-black">
            <h4 className="text-xs font-black text-black pb-2 mb-3 border-b border-emerald-300 flex items-center justify-between">
              <span>3. سداد المخالفات (بيانات الإيصال والسداد باللون الأسود)</span>
              <span className="text-[11px] text-black font-black bg-white px-2.5 py-0.5 rounded border border-emerald-400">
                المتبقي من المخالفات: {remainingViolations.toLocaleString()} ج.م
              </span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-black text-black mb-1">تاريخ السداد (يوم/شهر/سنة)</label>
                <input
                  type="date"
                  lang="ar-EG"
                  value={violationPaymentDate}
                  onChange={(e) => setViolationPaymentDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black"
                />
                {violationPaymentDate && (
                  <span className="block text-[10px] font-black text-black bg-emerald-100 border border-emerald-400 rounded px-1 mt-1 text-center font-mono">
                    📅 {formatDateDDMMYYYY(violationPaymentDate)}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-black text-black mb-1">رقم الإيصال / القسيمة</label>
                <input
                  type="text"
                  value={violationReceiptNumber}
                  onChange={(e) => setViolationReceiptNumber(e.target.value)}
                  placeholder="رقم القسيمة"
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black num-enlarged text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-black mb-1">نوع السداد</label>
                <select
                  value={violationPaymentMethod}
                  onChange={(e) => setViolationPaymentMethod(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m} className="text-black font-black">
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-black mb-1">المبلغ المسدد (ج.م)</label>
                <input
                  type="number"
                  value={paidViolationAmount}
                  onChange={(e) => setPaidViolationAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-emerald-500 rounded-lg text-xs font-black text-black num-enlarged text-center"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Added Amount (المضاف) */}
          <div className="border-2 border-blue-400 rounded-xl p-4 bg-blue-50/40 text-black">
            <h4 className="text-xs font-black text-black pb-2 mb-3 border-b border-blue-300 flex items-center justify-between">
              <span>4. المنصرف وسداد المنصرف (المضاف للمخبز - بيانات الإيصال والسداد)</span>
              <span className="text-[11px] text-black font-black bg-white px-2.5 py-0.5 rounded border border-blue-400">
                المتبقي من المضاف: {remainingAdded.toLocaleString()} ج.م
              </span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-black text-black mb-1">المضاف للمخبز (ج.م)</label>
                <input
                  type="number"
                  value={addedAmount}
                  onChange={(e) => setAddedAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black num-enlarged text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-black mb-1">تاريخ السداد (يوم/شهر/سنة)</label>
                <input
                  type="date"
                  lang="ar-EG"
                  value={addedPaymentDate}
                  onChange={(e) => setAddedPaymentDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black"
                />
                {addedPaymentDate && (
                  <span className="block text-[10px] font-black text-black bg-blue-100 border border-blue-400 rounded px-1 mt-1 text-center font-mono">
                    📅 {formatDateDDMMYYYY(addedPaymentDate)}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-black text-black mb-1">رقم الإيصال</label>
                <input
                  type="text"
                  value={addedReceiptNumber}
                  onChange={(e) => setAddedReceiptNumber(e.target.value)}
                  placeholder="رقم القسيمة"
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black num-enlarged text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-black mb-1">نوع السداد</label>
                <select
                  value={addedPaymentMethod}
                  onChange={(e) => setAddedPaymentMethod(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m} className="text-black font-black">
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-black mb-1">المسدد من المضاف (ج.م)</label>
                <input
                  type="number"
                  value={paidAddedAmount}
                  onChange={(e) => setPaidAddedAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-blue-500 rounded-lg text-xs font-black text-black num-enlarged text-center"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Disposal (التصرف في الدقيق) */}
          <div className="border-2 border-amber-400 rounded-xl p-4 bg-amber-50/40 text-black">
            <h4 className="text-xs font-black text-black pb-2 mb-3 border-b border-amber-300 flex items-center justify-between">
              <span>5. التصرف من المخبز والسداد من التصرف (بيانات الإيصال والسداد)</span>
              <span className="text-[11px] text-black font-black bg-white px-2.5 py-0.5 rounded border border-amber-400">
                قيمة التصرف: {disposalValue.toLocaleString()} ج.م | المتبقي: {remainingDisposal.toLocaleString()} ج.م
              </span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-black text-black mb-1">تاريخ التصرف (يوم/شهر/سنة)</label>
                <input
                  type="date"
                  lang="ar-EG"
                  value={disposalDate}
                  onChange={(e) => setDisposalDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black"
                />
                {disposalDate && (
                  <span className="block text-[10px] font-black text-black bg-amber-100 border border-amber-400 rounded px-1 mt-1 text-center font-mono">
                    📅 {formatDateDDMMYYYY(disposalDate)}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-black text-black mb-1">عدد الشكاير</label>
                <input
                  type="number"
                  value={disposalBags}
                  onChange={(e) => setDisposalBags(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black num-enlarged text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-black mb-1">قيمة الشيكارة (ج.م)</label>
                <input
                  type="number"
                  value={disposalBagPrice}
                  onChange={(e) => setDisposalBagPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black num-enlarged text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-black mb-1">
                  مضاعفة العقوبة (1x - 5x)
                </label>
                <select
                  value={disposalMultiplier}
                  onChange={(e) => setDisposalMultiplier(parseInt(e.target.value) || 1)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black"
                >
                  <option value={1} className="text-black font-black">1x (قيمة عادية)</option>
                  <option value={2} className="text-black font-black">2x (مضاعفة مرتين)</option>
                  <option value={3} className="text-black font-black">3x (مضاعفة 3 مرات)</option>
                  <option value={4} className="text-black font-black">4x (مضاعفة 4 مرات)</option>
                  <option value={5} className="text-black font-black">5x (مضاعفة 5 مرات)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-black mb-1">تاريخ سداد التصرف (يوم/شهر/سنة)</label>
                <input
                  type="date"
                  lang="ar-EG"
                  value={disposalPaymentDate}
                  onChange={(e) => setDisposalPaymentDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black"
                />
                {disposalPaymentDate && (
                  <span className="block text-[10px] font-black text-black bg-amber-100 border border-amber-400 rounded px-1 mt-1 text-center font-mono">
                    📅 {formatDateDDMMYYYY(disposalPaymentDate)}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-black text-black mb-1">رقم الإيصال</label>
                <input
                  type="text"
                  value={disposalReceiptNumber}
                  onChange={(e) => setDisposalReceiptNumber(e.target.value)}
                  placeholder="رقم القسيمة"
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black num-enlarged text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-black mb-1">نوع السداد</label>
                <select
                  value={disposalPaymentMethod}
                  onChange={(e) => setDisposalPaymentMethod(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m} className="text-black font-black">
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-black mb-1">السداد من التصرف (ج.م)</label>
                <input
                  type="number"
                  value={paidDisposalAmount}
                  onChange={(e) => setPaidDisposalAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-amber-500 rounded-lg text-xs font-black text-black num-enlarged text-center"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-black text-black mb-1">ملاحظات وقيد السداد</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات حول إجراءات التحصيل أو الإنذارات القضائية"
              className="w-full px-3 py-2 bg-white border-2 border-slate-400 rounded-lg text-xs font-black text-black text-right"
            />
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-300 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="px-5 py-2.5 border-2 border-slate-400 rounded-lg text-xs font-black text-black hover:bg-slate-100 transition cursor-pointer"
            >
              إلغاء النافذة (ESC)
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-700 to-rose-900 hover:from-red-800 hover:to-rose-950 text-white rounded-lg text-xs font-black shadow-md transition cursor-pointer"
            >
              <Save className="w-4 h-4 text-amber-200" />
              حفظ قيد المديونية
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
