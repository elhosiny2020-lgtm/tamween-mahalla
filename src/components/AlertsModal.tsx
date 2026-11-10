import React, { useState, useEffect } from 'react';
import { Bakery, DebtRecord, ExpirationAlertItem } from '../types';
import {
  Bell,
  AlertTriangle,
  Clock,
  Phone,
  ExternalLink,
  X,
  DollarSign,
  Calendar
} from 'lucide-react';

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bakeries: Bakery[];
  debts?: DebtRecord[];
  onOpenBakeryEdit: (bakeryId: string) => void;
  onOpenWeeklyInstallments?: (bakeryId?: string) => void;
  onOpenDailySettings?: () => void;
}

export function getExpirationAlerts(bakeries: Bakery[]): ExpirationAlertItem[] {
  const alerts: ExpirationAlertItem[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkDoc = (
    bakery: Bakery,
    docType: string,
    dateStr?: string
  ) => {
    if (!dateStr) return;
    const docDate = new Date(dateStr);
    if (isNaN(docDate.getTime())) return;
    docDate.setHours(0, 0, 0, 0);

    const diffTime = docDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Alert if within 15 days or already expired
    if (diffDays <= 15) {
      alerts.push({
        bakeryId: bakery.id,
        bakeryOwnerName: bakery.bakeryOwnerName,
        machineNumber: bakery.machineNumber,
        village: bakery.village,
        phone: bakery.phone,
        docType,
        docDate: dateStr,
        daysRemaining: diffDays,
        isExpired: diffDays < 0,
      });
    }
  };

  bakeries.forEach((b) => {
    checkDoc(b, 'رخصة المخبز', b.bakeryLicenseDate);
    checkDoc(b, 'السجل التجاري', b.commercialRegDate);
    checkDoc(b, 'عقد الإيجار', b.leaseAgreementDate);
    checkDoc(b, 'البطاقة الضريبية', b.taxCardDate);
  });

  // Sort: expired first, then ascending days remaining
  alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return alerts;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({
  isOpen,
  onClose,
  bakeries,
  debts = [],
  onOpenBakeryEdit,
  onOpenWeeklyInstallments,
  onOpenDailySettings,
}) => {
  const [activeTab, setActiveTab] = useState<'docs' | 'debts'>('docs');

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

  const alerts = getExpirationAlerts(bakeries);
  const expiredCount = alerts.filter((a) => a.isExpired).length;
  const warningCount = alerts.filter((a) => !a.isExpired).length;

  // Compute large debts > 20,000 EGP
  const bakeryRemainingDebtsMap: Record<string, number> = {};
  debts.forEach((d) => {
    bakeryRemainingDebtsMap[d.bakeryId] = (bakeryRemainingDebtsMap[d.bakeryId] || 0) + (d.netRemainingDebt || 0);
  });

  const largeDebtBakeries = bakeries.filter(
    (b) => (bakeryRemainingDebtsMap[b.id] || 0) > 20000
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-red-500 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 cursor-default">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900 via-rose-900 to-slate-900 p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-800/80 rounded-xl">
              <Bell className="w-5 h-5 text-amber-300 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-black">
                مركز التنبيهات التلقائية (الوثائق والتراخيص + المديونيات الكبرى)
              </h3>
              <p className="text-[11px] text-rose-200 font-bold">
                متابعة الوثائق المنتهية خلال 15 يوماً والمديونيات التي تتجاوز 20,000 ج.م
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenDailySettings && (
              <button
                type="button"
                onClick={onOpenDailySettings}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-400/50 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="ضبط وتعيين وقت التنبيه اليومي التلقائي لتراخيص المخابز"
              >
                <Clock className="w-4 h-4 text-amber-300" />
                <span>إعدادات التنبيه اليومي ⏰</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 rounded-xl bg-red-800/80 hover:bg-red-600 text-white transition cursor-pointer border border-red-400/50"
              title="إغلاق النافذة (Escape)"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 bg-slate-100/90 shrink-0">
          <button
            onClick={() => setActiveTab('docs')}
            className={`flex-1 py-3 px-4 text-xs font-black flex items-center justify-center gap-2 transition ${
              activeTab === 'docs'
                ? 'bg-white text-red-900 border-b-2 border-red-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>تنبيهات الوثائق والتراخيص (15 يوماً)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-100 text-red-800">
              {alerts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('debts')}
            className={`flex-1 py-3 px-4 text-xs font-black flex items-center justify-center gap-2 transition ${
              activeTab === 'debts'
                ? 'bg-white text-red-900 border-b-2 border-red-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4 text-red-600" />
            <span>مديونيات كبرى تتجاوز 20,000 ج.م (دفعات أسبوعية)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-700 text-white font-black animate-pulse">
              {largeDebtBakeries.length}
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'docs' ? (
            <div className="space-y-3">
              {/* Counter Summary */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-lg text-xs font-black flex items-center gap-1.5 border border-red-300">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    منتهية بالفعل ({expiredCount})
                  </span>
                  <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-lg text-xs font-black flex items-center gap-1.5 border border-amber-300">
                    <Clock className="w-4 h-4 text-amber-700" />
                    أوشكت على الانتهاء ({warningCount})
                  </span>
                </div>
                <span className="text-xs font-black text-slate-600">
                  إجمالي وثائق التنبيه: {alerts.length}
                </span>
              </div>

              {alerts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-3 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                    <Bell className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-black text-slate-800">
                    كافة التراخيص والسجلات والعقود سارية بنجاح!
                  </h4>
                  <p className="text-xs text-slate-500 font-bold mt-1">
                    لا توجد أي وثائق منتهية أو قاربت على الانتهاء خلال فترة 15 يوماً القادمة.
                  </p>
                </div>
              ) : (
                alerts.map((item, idx) => (
                  <div
                    key={`${item.bakeryId}-${item.docType}-${idx}`}
                    className={`p-3.5 rounded-xl border-2 flex items-center justify-between gap-4 transition ${
                      item.isExpired
                        ? 'bg-red-50/80 border-red-300 hover:border-red-500'
                        : 'bg-amber-50/70 border-amber-300 hover:border-amber-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          item.isExpired ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                        }`}
                      >
                        {item.isExpired ? (
                          <AlertTriangle className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900">
                            {item.bakeryOwnerName}
                          </span>
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                            ماكينة: {item.machineNumber}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {item.village}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className="font-black text-slate-800">
                            الوثيقة: <strong className="text-amber-900">{item.docType}</strong>
                          </span>
                          <span className="text-slate-500 font-bold">
                            تاريخ السريان: {item.docDate}
                          </span>
                          <span
                            className={`font-black px-2 py-0.5 rounded text-[11px] ${
                              item.isExpired
                                ? 'bg-red-200 text-red-900'
                                : 'bg-amber-200 text-amber-900'
                            }`}
                          >
                            {item.isExpired
                              ? `منتهية منذ ${Math.abs(item.daysRemaining)} يوم!`
                              : `متبقي ${item.daysRemaining} يوم`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`tel:${item.phone}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-black shadow-sm transition"
                      >
                        <Phone className="w-3.5 h-3.5 text-amber-300" />
                        <span>{item.phone}</span>
                      </a>
                      <button
                        onClick={() => {
                          onClose();
                          onOpenBakeryEdit(item.bakeryId);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-black shadow-sm transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        تحديث المستند
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Large Debts Notice */}
              <div className="p-3 bg-red-50 border-2 border-red-300 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-red-950 text-xs font-black">
                  <AlertTriangle className="w-5 h-5 text-red-700 shrink-0" />
                  <span>
                    المديونيات التي تتجاوز 20,000 ج.م تستلزم قانونياً جدول سداد دفعات أسبوعية والتزام خطي بالتحصيل.
                  </span>
                </div>
              </div>

              {largeDebtBakeries.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-3 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                    <DollarSign className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-black text-slate-800">
                    لا توجد أي مديونيات تتجاوز 20,000 ج.م حالياً
                  </h4>
                  <p className="text-xs text-slate-500 font-bold mt-1">
                    كافة المخابز مديونياتها أقل من 20 ألف أو خالصة السداد بالكامل.
                  </p>
                </div>
              ) : (
                largeDebtBakeries.map((b) => {
                  const debt = bakeryRemainingDebtsMap[b.id] || 0;
                  const suggestedWeekly = Math.ceil(debt / 8); // 8 weeks default
                  return (
                    <div
                      key={b.id}
                      className="p-4 rounded-xl border-2 border-red-300 bg-red-50/60 hover:border-red-500 transition flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-red-700 text-white flex items-center justify-center font-black shrink-0">
                          <DollarSign className="w-6 h-6 text-amber-300" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900">{b.bakeryOwnerName}</span>
                            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                              ماكينة: {b.machineNumber}
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {b.village} - {b.localUnit}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs">
                            <span className="font-black text-red-950">
                              إجمالي المديونية:{' '}
                              <strong className="text-red-700 num-enlarged text-sm">
                                {debt.toLocaleString()} ج.م
                              </strong>
                            </span>
                            <span className="text-slate-600 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                              الدفعة الأسبوعية المقترحة (8 أسابيع):{' '}
                              <strong className="text-amber-900 num-enlarged">
                                {suggestedWeekly.toLocaleString()} ج.م
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`tel:${b.phone}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-black shadow-sm transition"
                        >
                          <Phone className="w-3.5 h-3.5 text-amber-300" />
                          <span>{b.phone}</span>
                        </a>
                        <button
                          onClick={() => {
                            onClose();
                            if (onOpenWeeklyInstallments) {
                              onOpenWeeklyInstallments(b.id);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-black shadow-md transition"
                        >
                          <Calendar className="w-4 h-4 text-amber-200" />
                          جدول الدفعات الأسبوعية
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black transition cursor-pointer"
          >
            إغلاق النافذة (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
