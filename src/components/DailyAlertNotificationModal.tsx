import React, { useEffect } from 'react';
import { Bakery } from '../types';
import {
  Bell,
  AlertTriangle,
  X,
  Phone,
  Building,
  Calendar,
  ExternalLink,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface DailyAlertNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  alertTime: string;
  expiredBakeries: {
    bakery: Bakery;
    docName: string;
    expiryDate: string;
    daysDiff: number;
  }[];
  onViewInBakeriesTable: () => void;
  onOpenAlertsCenter: () => void;
}

export const DailyAlertNotificationModal: React.FC<DailyAlertNotificationModalProps> = ({
  isOpen,
  onClose,
  alertTime,
  expiredBakeries,
  onViewInBakeriesTable,
  onOpenAlertsCenter,
}) => {
  // Play alert chime when opened
  useEffect(() => {
    if (isOpen) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.6);
      } catch {
        // fallback
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto cursor-pointer animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-slate-950 text-white rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] border-3 border-amber-500 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden cursor-default animate-in zoom-in-95 duration-200 ring-8 ring-amber-500/20">
        {/* Urgent Header */}
        <div className="bg-gradient-to-r from-red-950 via-amber-950 to-red-950 p-4 border-b-2 border-amber-500/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 text-white rounded-xl shadow-lg animate-bounce">
              <Bell className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-mono">
                  تذكير إداري يومي ({alertTime})
                </span>
                <span className="text-xs text-rose-300 font-bold">
                  إدارة تموين مركز المحلة الكبرى
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                تنبيه بوجود مخابز منتهية التراخيص والمستندات!
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-black/40 hover:bg-red-600 text-white transition cursor-pointer border border-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1 text-right">
          <div className="bg-amber-950/40 border border-amber-600/50 p-3.5 rounded-xl flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black text-amber-200 block">
                موقف المتابعة الإدارية المستمرة:
              </span>
              <p className="text-xs text-slate-300 mt-0.5">
                تم رصد <strong className="text-amber-300 text-sm font-mono font-black">{expiredBakeries.length}</strong> حالة ترخيص منتهية تتطلب المتابعة والتجديد أو اتخاذ الإجراءات التموينية المقررة.
              </p>
            </div>
            <span className="text-2xl font-black font-mono text-amber-400 bg-black/60 px-3 py-1.5 rounded-xl border border-amber-500/40 shrink-0">
              {expiredBakeries.length}
            </span>
          </div>

          {/* List of Expired Bakeries */}
          <div className="space-y-2">
            <h4 className="text-xs font-black text-slate-300 flex items-center justify-between">
              <span>بيان المخابز المنتهية الصلاحية:</span>
              <span className="text-[11px] text-slate-500">مركز المحلة الكبرى</span>
            </h4>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {expiredBakeries.map((m, idx) => (
                <div
                  key={`${m.bakery.id}-${idx}`}
                  className="p-3 bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" />
                      <span className="text-xs font-black text-white">{m.bakery.bakeryOwnerName}</span>
                      <span className="text-[11px] text-amber-400 font-mono font-bold">
                        (ماكينة {m.bakery.machineNumber})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>قرية {m.bakery.village}</span>
                      <span>•</span>
                      <span>{m.bakery.localUnit}</span>
                      {m.bakery.phone && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-cyan-400 font-mono">
                            <Phone className="w-3 h-3" />
                            {m.bakery.phone}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1 shrink-0">
                    <span className="text-[11px] font-black text-rose-300 bg-red-950/80 border border-red-800 px-2 py-0.5 rounded-lg">
                      {m.docName}: {m.expiryDate}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold font-mono">
                      {m.daysDiff < 0
                        ? `منتهية منذ ${Math.abs(m.daysDiff)} يوم`
                        : m.daysDiff === 0
                        ? 'تنتهي اليوم'
                        : `باقي ${m.daysDiff} يوم`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs transition cursor-pointer"
          >
            إغلاق الإشعار مؤقتاً
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onOpenAlertsCenter();
                onClose();
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-black transition cursor-pointer"
            >
              فتح مركز التنبيهات والمستندات
            </button>

            <button
              type="button"
              onClick={() => {
                onViewInBakeriesTable();
                onClose();
              }}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-xl text-xs font-black shadow-md border border-red-400 transition cursor-pointer flex items-center gap-1.5"
            >
              <span>معاينة وتصفية المخابز المنتهية</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
