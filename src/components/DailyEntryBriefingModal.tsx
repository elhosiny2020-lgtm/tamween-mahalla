import React, { useState, useMemo } from 'react';
import { Bakery, DebtRecord } from '../types';
import {
  X,
  Wallet,
  FileWarning,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  ArrowLeft,
  Edit,
  BellRing,
  Inbox
} from 'lucide-react';

interface DailyEntryBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bakeries: Bakery[];
  debts: DebtRecord[];
  expiryLeadDays?: number;
  onJumpToDebtsView: () => void;
  onOpenAlertsModal: () => void;
  onOpenInboxModal: () => void;
  onEditBakery?: (bakery: Bakery) => void;
  unreadInboxCount?: number;
}

interface ExpiryAlertRow {
  bakery: Bakery;
  docType: string;
  expiryDate: string;
  daysRemaining: number;
  status: 'expired' | 'expiring';
}

export const DailyEntryBriefingModal: React.FC<DailyEntryBriefingModalProps> = ({
  isOpen,
  onClose,
  bakeries,
  debts,
  expiryLeadDays = 30,
  onJumpToDebtsView,
  onOpenAlertsModal,
  onOpenInboxModal,
  onEditBakery,
  unreadInboxCount = 0
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'debts' | 'licenses'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  // 1. All Bakeries with Remaining Debts
  const bakeryDebtSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        bakeryOwnerName: string;
        machineNumber: string;
        village: string;
        localUnit: string;
        totalDebt: number;
        paidAmount: number;
        remainingAmount: number;
        recordsCount: number;
      }
    >();

    debts.forEach((d) => {
      const rem = Number(d.netRemainingDebt) || 0;
      const tot =
        (Number(d.totalViolations) || 0) +
        (Number(d.addedAmount) || 0) +
        (Number(d.disposalValue) || 0);
      const paid =
        (Number(d.paidViolationAmount) || 0) +
        (Number(d.paidAddedAmount) || 0) +
        (Number(d.paidDisposalAmount) || 0);
      if (rem <= 0 && tot <= 0) return;

      const key = String(d.bakeryId || d.bakeryOwnerName);
      const existing = map.get(key);
      const matchedBakery = bakeries.find(
        (b) => String(b.id) === String(d.bakeryId) || b.bakeryOwnerName.trim() === d.bakeryOwnerName.trim()
      );

      if (existing) {
        existing.totalDebt += tot;
        existing.paidAmount += paid;
        existing.remainingAmount += rem;
        existing.recordsCount += 1;
      } else {
        map.set(key, {
          bakeryOwnerName: d.bakeryOwnerName,
          machineNumber: d.machineNumber || matchedBakery?.machineNumber || '-',
          village: matchedBakery?.village || d.village || '-',
          localUnit: matchedBakery?.localUnit || d.localUnit || '-',
          totalDebt: tot,
          paidAmount: paid,
          remainingAmount: rem,
          recordsCount: 1
        });
      }
    });

    return Array.from(map.values())
      .filter((item) => item.remainingAmount > 0)
      .sort((a, b) => b.remainingAmount - a.remainingAmount);
  }, [debts, bakeries]);

  const totalRemainingDebts = useMemo(
    () => bakeryDebtSummary.reduce((acc, item) => acc + item.remainingAmount, 0),
    [bakeryDebtSummary]
  );

  // 2. All Expired or Expiring Documents, Licenses, and Contracts
  const expiryAlerts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rows: ExpiryAlertRow[] = [];

    const checkDate = (bakery: Bakery, dateStr: string | undefined, docType: string) => {
      if (!dateStr || dateStr.trim() === '' || dateStr === '-') return;
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) return;
      parsed.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((parsed.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        rows.push({
          bakery,
          docType,
          expiryDate: dateStr,
          daysRemaining: diffDays,
          status: 'expired'
        });
      } else if (diffDays <= expiryLeadDays) {
        rows.push({
          bakery,
          docType,
          expiryDate: dateStr,
          daysRemaining: diffDays,
          status: 'expiring'
        });
      }
    };

    bakeries.forEach((b) => {
      checkDate(b, b.bakeryLicenseDate, 'رخصة تشغيل المخبز');
      checkDate(b, b.commercialRegDate, 'السجل التجاري');
      checkDate(b, b.leaseAgreementDate, 'عقد الإيجار للمخبز');
      checkDate(b, b.taxCardDate, 'البطاقة الضريبية');
    });

    return rows.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [bakeries, expiryLeadDays]);

  const filteredDebts = useMemo(() => {
    if (!searchFilter.trim()) return bakeryDebtSummary;
    const q = searchFilter.toLowerCase();
    return bakeryDebtSummary.filter(
      (item) =>
        item.bakeryOwnerName.toLowerCase().includes(q) ||
        item.machineNumber.toLowerCase().includes(q) ||
        item.village.toLowerCase().includes(q) ||
        item.localUnit.toLowerCase().includes(q)
    );
  }, [bakeryDebtSummary, searchFilter]);

  const filteredExpiries = useMemo(() => {
    if (!searchFilter.trim()) return expiryAlerts;
    const q = searchFilter.toLowerCase();
    return expiryAlerts.filter(
      (item) =>
        item.bakery.bakeryOwnerName.toLowerCase().includes(q) ||
        item.bakery.village.toLowerCase().includes(q) ||
        item.docType.toLowerCase().includes(q)
    );
  }, [expiryAlerts, searchFilter]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 z-[9998] flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden border-2 border-amber-400"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Banner */}
        <div className="bg-gradient-to-l from-rose-900 via-amber-900 to-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/25 border border-amber-400/50 flex items-center justify-center shadow-lg">
              <BellRing className="w-7 h-7 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black">
                  شاشة التنبيه اليومي الشاملة عند دخول قاعدة البيانات
                </h2>
                <span className="bg-amber-400 text-slate-950 text-xs font-black px-2.5 py-0.5 rounded-full">
                  بيان فوري للمديونيات والتراخيص والعقود المنتهية
                </span>
              </div>
              <p className="text-xs text-amber-100/90 mt-0.5 font-bold">
                مراجعة يومية آلية لكافة مديونيات المخابز المستحقة والوثائق والتراخيص وعقود الإيجار المنتهية أو القريبة من الانتهاء
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenInboxModal();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-sm transition-all cursor-pointer"
            >
              <Inbox className="w-4 h-4" />
              <span>صندوق الوارد ({unreadInboxCount})</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-sm transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>إغلاق والدخول للمنظومة</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-rose-800">إجمالي المديونيات المتبقية على المخابز</p>
              <p className="text-2xl font-black text-rose-700 mt-1">
                {totalRemainingDebts.toLocaleString('ar-EG')} <span className="text-xs">ج.م</span>
              </p>
              <p className="text-[11px] font-bold text-rose-600 mt-0.5">
                عدد المخابز المدينة: {bakeryDebtSummary.length} مخبز
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-sm">
              <Wallet className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-amber-900">تراخيص ووثائق وعقود منتهية فعلياً</p>
              <p className="text-2xl font-black text-amber-800 mt-1">
                {expiryAlerts.filter((x) => x.status === 'expired').length} <span className="text-xs">وثيقة / عقد</span>
              </p>
              <p className="text-[11px] font-bold text-amber-700 mt-0.5">
                تحتاج لتجديد فوري وإخطار إداري
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-sm">
              <FileWarning className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-indigo-900">عقود وتراخيص قاربت على الانتهاء</p>
              <p className="text-2xl font-black text-indigo-700 mt-1">
                {expiryAlerts.filter((x) => x.status === 'expiring').length} <span className="text-xs">وثيقة / عقد</span>
              </p>
              <p className="text-[11px] font-bold text-indigo-600 mt-0.5">
                خلال {expiryLeadDays} يوماً القادمة
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter & Tabs Bar */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              عرض الشاشة الموحدة (المديونيات + التراخيص والعقود)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('debts')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'debts'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              💰 مديونيات المخابز ({bakeryDebtSummary.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('licenses')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'licenses'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
              }`}
            >
              📜 التراخيص والعقود والوثائق المنتهية ({expiryAlerts.length})
            </button>
          </div>

          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="بحث سريع باسم المخبز أو القرية أو نوع الوثيقة..."
            className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl text-slate-800 w-full sm:w-72 outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Main Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/60">
          {/* Section 1: Bakeries Debts Alert */}
          {(activeTab === 'all' || activeTab === 'debts') && (
            <div className="bg-white rounded-2xl border border-rose-200 shadow-xs overflow-hidden">
              <div className="bg-rose-50 px-4 py-3 border-b border-rose-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-rose-600" />
                  <h3 className="text-sm font-black text-rose-950">
                    أولاً: بيان تنبيهات جميع المديونيات المسجلة على المخابز ({filteredDebts.length} مخبز)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onJumpToDebtsView();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <span>الانتقال لجدول تحصيل المديونيات</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {filteredDebts.length === 0 ? (
                <div className="p-6 text-center text-sm font-bold text-emerald-700">
                  لا توجد مديونيات متبقية مسجلة حالياً
                </div>
              ) : (
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-800 font-black sticky top-0">
                      <tr>
                        <th className="p-2.5 border-b border-slate-200">م</th>
                        <th className="p-2.5 border-b border-slate-200">اسم صاحب المخبز</th>
                        <th className="p-2.5 border-b border-slate-200">رقم الماكينة</th>
                        <th className="p-2.5 border-b border-slate-200">القرية</th>
                        <th className="p-2.5 border-b border-slate-200">الوحدة المحلية</th>
                        <th className="p-2.5 border-b border-slate-200">إجمالي المديونية</th>
                        <th className="p-2.5 border-b border-slate-200">المسدد</th>
                        <th className="p-2.5 border-b border-slate-200">المتبقي المستحق</th>
                        <th className="p-2.5 border-b border-slate-200">مستوى التنبيه</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-bold text-slate-800">
                      {filteredDebts.map((item, idx) => {
                        const isCritical = item.remainingAmount >= 50000;
                        const isHigh = item.remainingAmount > 20000;
                        return (
                          <tr
                            key={idx}
                            className={
                              isCritical
                                ? 'bg-rose-50/80 hover:bg-rose-100/70'
                                : isHigh
                                ? 'bg-amber-50/70 hover:bg-amber-100/60'
                                : 'hover:bg-slate-50'
                            }
                          >
                            <td className="p-2.5">{idx + 1}</td>
                            <td className="p-2.5 font-black text-slate-950">{item.bakeryOwnerName}</td>
                            <td className="p-2.5 font-mono">{item.machineNumber}</td>
                            <td className="p-2.5">{item.village}</td>
                            <td className="p-2.5">{item.localUnit}</td>
                            <td className="p-2.5">{item.totalDebt.toLocaleString('ar-EG')} ج.م</td>
                            <td className="p-2.5 text-emerald-700">{item.paidAmount.toLocaleString('ar-EG')} ج.م</td>
                            <td className="p-2.5 font-black text-rose-700">
                              {item.remainingAmount.toLocaleString('ar-EG')} ج.م
                            </td>
                            <td className="p-2.5">
                              {isCritical ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
                                  🚨 مديونية حرجة (أكثر من 50 ألف)
                                </span>
                              ) : isHigh ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                                  ⚠️ مديونية مرتفعة (+20 ألف)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black">
                                  متابعة تحصيل دوري
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Section 2: Expired / Expiring Documents, Licenses & Lease Contracts */}
          {(activeTab === 'all' || activeTab === 'licenses') && (
            <div className="bg-white rounded-2xl border border-amber-300 shadow-xs overflow-hidden">
              <div className="bg-amber-50 px-4 py-3 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-700" />
                  <h3 className="text-sm font-black text-amber-950">
                    ثانياً: بيان الوثائق والتراخيص والسجلات وعقود الإيجار المنتهية أو القريبة من الانتهاء ({filteredExpiries.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAlertsModal();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <span>فتح مركز إدارة التراخيص والتنبيهات</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {filteredExpiries.length === 0 ? (
                <div className="p-6 text-center text-sm font-bold text-emerald-700 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>جميع التراخيص والسجلات وعقود الإيجار سارية المفعول</span>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-800 font-black sticky top-0">
                      <tr>
                        <th className="p-2.5 border-b border-slate-200">م</th>
                        <th className="p-2.5 border-b border-slate-200">اسم صاحب المخبز</th>
                        <th className="p-2.5 border-b border-slate-200">القرية / الوحدة المحلية</th>
                        <th className="p-2.5 border-b border-slate-200">نوع الوثيقة / الترخيص / العقد</th>
                        <th className="p-2.5 border-b border-slate-200">تاريخ الانتهاء</th>
                        <th className="p-2.5 border-b border-slate-200">الحالة والمدة</th>
                        {onEditBakery && <th className="p-2.5 border-b border-slate-200">إجراء سريع</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-bold text-slate-800">
                      {filteredExpiries.map((row, idx) => (
                        <tr
                          key={`${row.bakery.id}-${row.docType}-${idx}`}
                          className={
                            row.status === 'expired'
                              ? 'bg-rose-50/80 hover:bg-rose-100/70'
                              : 'bg-amber-50/60 hover:bg-amber-100/60'
                          }
                        >
                          <td className="p-2.5">{idx + 1}</td>
                          <td className="p-2.5 font-black text-slate-950">{row.bakery.bakeryOwnerName}</td>
                          <td className="p-2.5">
                            {row.bakery.village} - {row.bakery.localUnit}
                          </td>
                          <td className="p-2.5 font-black text-indigo-900">{row.docType}</td>
                          <td className="p-2.5 font-mono" dir="ltr">
                            {row.expiryDate}
                          </td>
                          <td className="p-2.5">
                            {row.status === 'expired' ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
                                ❌ منتهي منذ {Math.abs(row.daysRemaining)} يوم
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                                ⏳ ينتهي خلال {row.daysRemaining} يوم
                              </span>
                            )}
                          </td>
                          {onEditBakery && (
                            <td className="p-2.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onEditBakery(row.bakery);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Edit className="w-3 h-3" />
                                <span>تحديث الترخيص/العقد</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <p className="text-xs font-bold text-slate-600">
            💡 تظهر هذه الشاشة تلقائياً عند الدخول اليومي للقاعدة لضمان متابعة كافة المديونيات والتراخيص والعقود المنتهية.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition-colors cursor-pointer"
          >
            تم الاطلاع والمتابعة - دخول المنظومة
          </button>
        </div>
      </div>
    </div>
  );
};
