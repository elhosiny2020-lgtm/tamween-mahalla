import React, { useState, useMemo, useEffect } from 'react';
import { Bakery, DebtRecord, SystemConfig, AppUser } from '../types';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  DollarSign,
  Phone,
  Store,
  X,
  FileText,
  Sliders,
  ChevronLeft
} from 'lucide-react';
import { printHtmlElementA4 } from '../utils/pdfHelper';

interface WeeklyInstallmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bakeries: Bakery[];
  debts: DebtRecord[];
  systemConfig: SystemConfig;
  initialBakeryId?: string;
  currentUser?: AppUser | null;
  onRecordPayment?: (debtId: string, paidAmount: number, receiptNo: string, date: string) => void;
}

export const WeeklyInstallmentsModal: React.FC<WeeklyInstallmentsModalProps> = ({
  isOpen,
  onClose,
  bakeries,
  debts,
  systemConfig,
  initialBakeryId,
  currentUser,
}) => {
  // Compute map of remaining debts per bakery
  const bakeryRemainingDebtsMap = useMemo(() => {
    const map: Record<string, number> = {};
    debts.forEach((d) => {
      map[d.bakeryId] = (map[d.bakeryId] || 0) + (d.netRemainingDebt || 0);
    });
    return map;
  }, [debts]);

  // Filter bakeries with debt > 20,000 EGP
  const largeDebtBakeries = useMemo(() => {
    return bakeries.filter((b) => (bakeryRemainingDebtsMap[b.id] || 0) > 20000);
  }, [bakeries, bakeryRemainingDebtsMap]);

  // Selected bakery for detailed installment schedule
  const [selectedId, setSelectedId] = useState<string>(
    initialBakeryId && (bakeryRemainingDebtsMap[initialBakeryId] || 0) > 20000
      ? initialBakeryId
      : largeDebtBakeries[0]?.id || bakeries[0]?.id || ''
  );

  // Installment configuration per bakery
  const [weeksCount, setWeeksCount] = useState<number>(8); // default 8 weeks (2 months)
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7); // Start in 1 week
    return d.toISOString().split('T')[0];
  });

  const selectedBakery = bakeries.find((b) => b.id === selectedId) || largeDebtBakeries[0];
  const currentTotalDebt = selectedBakery ? bakeryRemainingDebtsMap[selectedBakery.id] || 0 : 0;

  // Compute weekly schedule
  const weeklySchedule = useMemo(() => {
    if (!currentTotalDebt || weeksCount <= 0) return [];
    const baseWeekly = Math.floor(currentTotalDebt / weeksCount);
    const remainder = currentTotalDebt - baseWeekly * weeksCount;

    const schedule = [];
    const baseDate = new Date(startDate || new Date().toISOString().split('T')[0]);

    for (let i = 1; i <= weeksCount; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setDate(baseDate.getDate() + (i - 1) * 7);

      // Add remainder to first installment
      const amount = i === 1 ? baseWeekly + remainder : baseWeekly;

      schedule.push({
        weekNumber: i,
        dueDate: dueDate.toISOString().split('T')[0],
        amount,
      });
    }
    return schedule;
  }, [currentTotalDebt, weeksCount, startDate]);

  const schedulePrintRef = React.useRef<HTMLDivElement>(null);

  // Escape key listener (capture phase for instant response)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown, true);
    }
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrintSchedule = () => {
    printHtmlElementA4(
      schedulePrintRef.current,
      `إخطار_وجدول_الدفعات_الأسبوعية_${selectedBakery?.bakeryOwnerName || 'مخبز'}`
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm overflow-y-auto cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-red-600/50 w-full max-w-5xl my-4 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 cursor-default">
        {/* Header (No print) */}
        <div className="bg-gradient-to-r from-red-950 via-slate-900 to-red-950 p-4 text-white flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 p-1 rounded-xl bg-white border border-amber-400 shadow-md flex items-center justify-center shrink-0">
              <img
                src={systemConfig.logoBase64}
                alt="شعار التموين"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h3 className="text-base font-black">
                إخطار وجدولة المديونيات الكبرى التي تتجاوز 20,000 ج.م (نظام الدفعات الأسبوعية)
              </h3>
              <p className="text-[11px] text-red-200 font-bold">
                احتساب قيم وتواريخ الدفعات الأسبوعية الإلزامية طبقاً للوائح الرقابة التموينية
              </p>
            </div>
          </div>
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

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Notification Header Card */}
          <div className="bg-red-50 border-2 border-red-300 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
              <div>
                <h4 className="text-xs font-black text-red-950">
                  تنبيه رسمي صادر من إدارة تموين مركز المحلة الكبرى
                </h4>
                <p className="text-[11px] text-red-800 font-bold mt-0.5">
                  يُلزم أصحاب المخابز التي تتجاوز مديونياتهم مبلغ 20,000 ج.م بتقديم تعهد رسمي وجدول دفعات أسبوعية منتظمة لتسوية المديونية وتفادي الإجراءات القانونية.
                </p>
              </div>
            </div>
            <div className="bg-white px-3 py-1.5 rounded-lg border border-red-300 text-center">
              <span className="text-[10px] text-slate-500 font-bold block">عدد المخابز المطالبة بالدفعات</span>
              <span className="text-base font-black text-red-700 num-enlarged">
                {largeDebtBakeries.length} مخبز
              </span>
            </div>
          </div>

          {/* Bakery Selector Tabs (if more than 1) */}
          {largeDebtBakeries.length > 0 ? (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-print">
              {largeDebtBakeries.map((b) => {
                const debt = bakeryRemainingDebtsMap[b.id] || 0;
                const isSelected = selectedBakery?.id === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedId(b.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition flex items-center gap-2 border ${
                      isSelected
                        ? 'bg-red-700 text-white border-red-800 shadow-md scale-102'
                        : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <span>{b.bakeryOwnerName}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] num-enlarged ${
                        isSelected ? 'bg-red-950 text-amber-300' : 'bg-red-100 text-red-900'
                      }`}
                    >
                      {debt.toLocaleString()} ج.م
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-center text-xs font-black text-emerald-800">
              الحمد لله، لا توجد حالياً أي مديونيات تتجاوز 20,000 ج.م في قاعدة البيانات.
            </div>
          )}

          {selectedBakery && currentTotalDebt > 0 && (
            <>
              {/* Bakery Details & Schedule Configuration (No print) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 bg-slate-50 border border-slate-200 p-4 rounded-xl no-print">
                {/* Bakery info */}
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block mb-0.5">
                    بيانات صاحب المخبز
                  </span>
                  <h4 className="text-sm font-black text-slate-900">{selectedBakery.bakeryOwnerName}</h4>
                  <div className="text-xs font-bold text-slate-600 space-y-0.5 mt-1">
                    <p>
                      ماكينة رقم: <strong className="num-enlarged text-slate-900">{selectedBakery.machineNumber}</strong>
                    </p>
                    <p>
                      الموقع: {selectedBakery.village} - {selectedBakery.localUnit}
                    </p>
                    <p>
                      الهاتف:{' '}
                      <a href={`tel:${selectedBakery.phone}`} className="text-amber-800 underline num-enlarged">
                        {selectedBakery.phone}
                      </a>
                    </p>
                  </div>
                </div>

                {/* Total Debt & Installment Calculations */}
                <div className="bg-red-100/70 border border-red-300 p-3 rounded-lg text-center flex flex-col justify-center">
                  <span className="text-[11px] font-black text-red-900 block mb-1">
                    إجمالي المديونية المستحقة
                  </span>
                  <span className="text-2xl font-black text-red-700 num-enlarged">
                    {currentTotalDebt.toLocaleString()} ج.م
                  </span>
                  <span className="text-[10px] text-red-800 font-black mt-1">
                    تتجاوز 20 ألف ج.م - مطلوب دفعات أسبوعية
                  </span>
                </div>

                {/* Configuration Controls */}
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">
                      عدد الدفعات الأسبوعية المطلوبة
                    </label>
                    <select
                      value={weeksCount}
                      onChange={(e) => setWeeksCount(Number(e.target.value) || 8)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900"
                    >
                      <option value={4}>4 أسابيع (شهر واحد - دفعة كل أسبوع)</option>
                      <option value={6}>6 أسابيع (شهر ونصف)</option>
                      <option value={8}>8 أسابيع (شهرين - موصى به)</option>
                      <option value={10}>10 أسابيع (شهرين ونصف)</option>
                      <option value={12}>12 أسبوعاً (3 أشهر)</option>
                      <option value={16}>16 أسبوعاً (4 أشهر)</option>
                      <option value={20}>20 أسبوعاً (5 أشهر)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-black mb-1">
                      تاريخ استحقاق أول دفعة أسبوعية
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-400 rounded-lg text-xs font-black text-black"
                    />
                  </div>

                  <div className="bg-amber-100/80 p-2 rounded border border-amber-300 text-center">
                    <span className="text-[10px] text-black font-black block">
                      قيمة الدفعة الأسبوعية المقترحة:
                    </span>
                    <span className="text-base font-black text-black num-enlarged">
                      {Math.ceil(currentTotalDebt / weeksCount).toLocaleString()} ج.م / أسبوع
                    </span>
                  </div>
                </div>
              </div>

              {/* Printable Schedule & Official Document Container */}
              <div ref={schedulePrintRef} className="bg-white text-black border-2 border-slate-400 p-5 rounded-xl shadow-xs space-y-4 print-container">
                {/* Official Letterhead */}
                <div className="border-b-2 border-black pb-3 flex items-center justify-between text-black">
                  <div className="text-right text-xs font-black text-black space-y-0.5">
                    <p className="text-black font-black">جمهورية مصر العربية</p>
                    <p>{systemConfig.governorateTitle}</p>
                    <p>{systemConfig.directorateTitle}</p>
                    <p className="text-black">{systemConfig.administrationTitle}</p>
                    <p className="text-[10px] text-black font-mono">قسم الرقابة التموينية والمديونيات</p>
                  </div>
                  <div className="text-center">
                    <div className="w-14 h-14 mx-auto p-1 border border-amber-600 rounded-full bg-white flex items-center justify-center">
                      <img
                        src={systemConfig.logoBase64}
                        alt="شعار الوزارة"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="text-[9px] font-black text-black mt-1 block">
                      {systemConfig.englishSubtitle}
                    </span>
                  </div>
                  <div className="text-left font-mono text-[10px] text-black space-y-0.5">
                    <p className="font-black">إخطار وجدولة سداد مديونية تموينية</p>
                    <p>تاريخ الإخطار: {new Date().toLocaleDateString('ar-EG')}</p>
                    <p className="text-black font-black">مديونية كبرى &gt; 20,000 ج.م</p>
                    <div className="font-black text-black bg-amber-100/90 px-2 py-1 rounded border border-black inline-block text-[10px] mt-0.5 text-right space-y-0.5">
                      <div>الاسم بالكامل: {currentUser?.fullName || 'أحمد الحسيني'}</div>
                      <div>اليوزر: {currentUser?.username || 'admin'} | الباسورد: {currentUser?.password || 'admin'}</div>
                    </div>
                  </div>
                </div>

                {/* Subject & Legal text */}
                <div className="text-xs font-black text-black leading-relaxed bg-slate-50 p-3 rounded-lg border border-black">
                  <h2 className="text-center text-sm font-black underline mb-2 text-black">
                    إخطار بجدولة مديونية تموينية متجاوزة 20,000 ج.م والالتزام بدفعات أسبوعية
                  </h2>
                  <p>
                    إلى السيد صاحب المخبز البلدي:{' '}
                    <span className="underline font-black">{selectedBakery.bakeryOwnerName}</span> - ماكينة رقم (
                    <span className="num-enlarged">{selectedBakery.machineNumber}</span>) بقرية (
                    <span>{selectedBakery.village}</span> - وحدة <span>{selectedBakery.localUnit}</span>).
                  </p>
                  <p className="mt-1">
                    بناءً على محاضر الضبط والمديونيات المستحقة على مخبزكم بإجمالي مبلغ وقدره (
                    <span className="text-black num-enlarged font-black">{currentTotalDebt.toLocaleString()} ج.م</span>
                    )، وحيث أن المديونية تتجاوز الحد القانوني (20,000 ج.م)، فقد تم اعتماد جدول سداد إلزامي على{' '}
                    <span className="underline">{weeksCount} دفعات أسبوعية</span> بقيمة (
                    <span className="num-enlarged font-black">{Math.ceil(currentTotalDebt / weeksCount).toLocaleString()} ج.م</span>
                    ) لكل دفعة أسبوعية، وفيما يلي تفصيل المواعيد والقيم:
                  </p>
                </div>

                {/* Weekly Installments Table */}
                <table className="w-full text-center border-collapse text-xs border border-black text-black">
                  <thead>
                    <tr className="bg-slate-200 text-black font-black">
                      <th className="border border-black py-2 px-1 w-12 text-black">الدفعة</th>
                      <th className="border border-black py-2 px-2 text-black">تاريخ الاستحقاق الأسبوعي</th>
                      <th className="border border-black py-2 px-2 text-black">قيمة الدفعة الأسبوعية</th>
                      <th className="border border-black py-2 px-2 text-black">الرصيد المتبقي بعد السداد</th>
                      <th className="border border-black py-2 px-2 text-black">رقم قسيمة السداد وتاريخه</th>
                      <th className="border border-black py-2 px-2 text-black">توقيع المستلم والختم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black font-black text-black">
                    {weeklySchedule.map((item, idx) => {
                      const remainingAfter = Math.max(0, currentTotalDebt - (idx + 1) * item.amount);
                      return (
                        <tr key={item.weekNumber} className={idx % 2 === 0 ? 'bg-white text-black' : 'bg-slate-50 text-black'}>
                          <td className="border border-black py-1.5 px-1 num-enlarged font-black text-black">
                            الدفعة {item.weekNumber}
                          </td>
                          <td className="border border-black py-1.5 px-2 num-enlarged text-black font-black">
                            {item.dueDate}
                          </td>
                          <td className="border border-black py-1.5 px-2 num-enlarged font-black text-black bg-amber-50/50">
                            {item.amount.toLocaleString()} ج.م
                          </td>
                          <td className="border border-black py-1.5 px-2 num-enlarged text-black font-black">
                            {remainingAfter.toLocaleString()} ج.م
                          </td>
                          <td className="border border-black py-1.5 px-2 text-black font-mono text-[11px]">
                            ...........................
                          </td>
                          <td className="border border-black py-1.5 px-2 text-black text-[11px]">
                            ...........................
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-200 text-black font-black border-t-2 border-black">
                      <td colSpan={2} className="border border-black py-2 px-2 text-right text-black font-black">
                        إجمالي المديونية المجدولة على {weeksCount} أسبوع:
                      </td>
                      <td className="border border-black py-2 px-2 num-enlarged text-black font-black text-sm">
                        {currentTotalDebt.toLocaleString()} ج.م
                      </td>
                      <td colSpan={3} className="border border-black py-2 px-2 text-black font-black text-[11px]">
                        يسدد المخبز بانتظام كل أسبوع في الموعد المحدد
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Signatures & Undertaking */}
                <div className="pt-4 grid grid-cols-3 text-center text-xs font-black text-slate-900 border-t border-slate-300">
                  <div>
                    <p>إقرار صاحب المخبز بالالتزام بالسداد</p>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">
                      أتعهد بسداد الدفعات الأسبوعية في مواعيدها
                    </p>
                    <div className="h-10 flex items-end justify-center text-[10px] text-slate-400">
                      التوقيع: ................................
                    </div>
                  </div>
                  <div>
                    <p>رئيس قسم الرقابة التموينية بالمركز</p>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">متابعة التحصيل الأسبوعي</p>
                    <div className="h-10 flex items-end justify-center text-[10px] text-slate-400">
                      التوقيع: ................................
                    </div>
                  </div>
                  <div>
                    <p>مدير إدارة تموين مركز المحلة الكبرى</p>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">يعتمد ويقيد بالسجلات الرسمية</p>
                    <div className="h-10 flex items-end justify-center text-[10px] text-slate-400">
                      (خاتم شعار الجمهورية)
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions (No print) */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between no-print shrink-0">
          <button
            onClick={handlePrintSchedule}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-black shadow-md transition"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            طباعة إخطار وجدول الدفعات الأسبوعية A4
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-black transition cursor-pointer"
          >
            إغلاق النافذة (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
