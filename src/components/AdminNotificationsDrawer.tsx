import React from 'react';
import { HighDebtAlertNotification } from '../types';
import {
  Bell,
  AlertTriangle,
  X,
  CheckCircle2,
  Trash2,
  Scale,
  ShieldCheck,
  User,
  Clock,
  ChevronLeft
} from 'lucide-react';

interface AdminNotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: HighDebtAlertNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onSelectBakeryDebt: (bakeryId: string) => void;
}

export const AdminNotificationsDrawer: React.FC<AdminNotificationsDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onSelectBakeryDebt,
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md bg-slate-950 text-slate-100 h-full shadow-2xl border-r-2 border-red-500/50 flex flex-col cursor-default animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="bg-gradient-to-r from-red-950 via-slate-900 to-amber-950 p-4 border-b border-red-500/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-600/20 rounded-xl border border-red-500/40 shadow-inner">
              <Bell className="w-5 h-5 text-red-400 animate-bounce" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>تنبيهات المديونيات الحادة للمديرين</span>
                {unreadCount > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                    {unreadCount} جديد
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-amber-200 font-bold">
                إشعارات فورية عند تعديل أو تسديد أو إضافة مديونية تتجاوز 50,000 ج.م
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Toolbar */}
        <div className="bg-slate-900/90 p-3 border-b border-slate-800 flex items-center justify-between gap-2 text-xs font-black shrink-0">
          <span className="text-slate-400">إجمالي التنبيهات: ({notifications.length})</span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="text-emerald-400 hover:text-emerald-300 text-[11px] flex items-center gap-1 cursor-pointer bg-emerald-950/60 px-2 py-1 rounded border border-emerald-500/30"
              >
                <CheckCircle2 className="w-3 h-3" />
                تعليم الكل كقراءة
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-red-400 hover:text-red-300 text-[11px] flex items-center gap-1 cursor-pointer bg-red-950/60 px-2 py-1 rounded border border-red-500/30"
              >
                <Trash2 className="w-3 h-3" />
                مسح القائمة
              </button>
            )}
          </div>
        </div>

        {/* Drawer List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
              <ShieldCheck className="w-12 h-12 text-slate-700" />
              <p className="text-xs font-black text-slate-400">
                لا توجد أي تنبيهات مديونيات حادة حالياً.
              </p>
              <p className="text-[11px] text-slate-600">
                يتم إرسال إشعارات فورية هنا بمجرد إضافة أو تعديل أي مديونية مخبز تتجاوز 50 ألف جنيه.
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onMarkAsRead(item.id);
                  onSelectBakeryDebt(item.bakeryId);
                  onClose();
                }}
                className={`p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer relative overflow-hidden group hover:scale-[1.01] ${
                  !item.isRead
                    ? 'bg-gradient-to-br from-red-950/90 via-slate-900 to-red-900/60 border-red-500/80 shadow-lg shadow-red-950/40'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                {!item.isRead && (
                  <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-bl animate-ping" />
                )}

                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>{item.bakeryOwnerName}</span>
                      <span className="text-[10px] text-amber-300 font-mono bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-600/40">
                        ماكينة: {item.machineNumber}
                      </span>
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                      قرية {item.village}
                    </span>
                  </div>

                  <span className="text-xs font-black text-red-400 num-enlarged bg-red-950 px-2.5 py-1 rounded-lg border border-red-600/50 shadow-inner">
                    {item.debtAmount.toLocaleString()} ج.م
                  </span>
                </div>

                {/* Event Tag */}
                <div className="p-2 bg-black/40 rounded-xl border border-slate-800 text-[11px] font-bold text-amber-200 mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>
                      {item.actionType === 'ADD_DEBT'
                        ? 'تسجيل مديونية جديدة تجاوزت 50 ألف ج.م'
                        : item.actionType === 'EDIT_DEBT'
                        ? 'تعديل قيد مديونية تتجاوز 50 ألف ج.م'
                        : 'ارتفاع المديونية المتبقية لأكثر من 50,000 ج.م'}
                    </span>
                  </div>
                </div>

                {/* Editor & Timestamp Info */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-2 font-mono">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3 text-amber-400" />
                    <span>
                      بواسطة: <strong className="text-slate-200">{item.editedBy}</strong> ({item.editorRole})
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{item.timestamp}</span>
                  </div>
                </div>

                {/* Hover CTA */}
                <div className="mt-2 text-[10px] text-cyan-400 font-black flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition">
                  <span>انقر لعرض وتصفية مديونيات المخبز</span>
                  <ChevronLeft className="w-3 h-3" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 text-[11px] font-bold text-slate-400 text-center shrink-0">
          منظومة الرقابة التموينية والإنذار المبكر &bull; المحلة الكبرى
        </div>
      </div>
    </div>
  );
};
