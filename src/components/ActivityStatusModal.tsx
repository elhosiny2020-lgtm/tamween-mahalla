import React, { useState, useEffect } from 'react';
import { Bakery } from '../types';
import { Tag, Plus, Trash2, Edit2, Check, X, Sparkles, Store } from 'lucide-react';

interface ActivityStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  statuses: string[];
  bakeries?: Bakery[];
  onSaveStatuses: (updated: string[]) => void;
}

export const ActivityStatusModal: React.FC<ActivityStatusModalProps> = ({
  isOpen,
  onClose,
  statuses,
  bakeries = [],
  onSaveStatuses,
}) => {
  const [list, setList] = useState<string[]>(statuses);
  const [newStatus, setNewStatus] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [msg, setMsg] = useState('');

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

  // Preset suggestions that users can quickly add with a single click
  const quickPresets = [
    'متوقف لصيانة الماكينة',
    'مغلق بقرار نيابة تموينية',
    'تحت التشغيل التجريبي',
    'موسمي',
    'قيد تجديد التراخيص',
    'متوقف بقرار وزاري',
  ];

  // Bakery count helper
  const getBakeryCount = (statusName: string) => {
    return bakeries.filter((b) => b.activityStatus === statusName).length;
  };

  const getStatusBadgeStyle = (statusName: string) => {
    if (statusName === 'شغال') return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    if (statusName.includes('جزئي')) return 'bg-amber-100 text-amber-900 border-amber-300';
    if (statusName.includes('كلي') || statusName.includes('مغلق')) return 'bg-red-100 text-red-900 border-red-300';
    if (statusName === 'ملغى') return 'bg-slate-200 text-slate-800 border-slate-300';
    return 'bg-blue-100 text-blue-900 border-blue-300';
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newStatus.trim();
    if (!val) return;
    if (list.includes(val)) {
      alert('هذا النشاط موجود بالفعل في القائمة');
      return;
    }
    const updated = [...list, val];
    setList(updated);
    setNewStatus('');
    onSaveStatuses(updated);
    setMsg(`تمت إضافة نشاط "${val}" بنجاح`);
    setTimeout(() => setMsg(''), 2500);
  };

  const handleAddPreset = (preset: string) => {
    if (list.includes(preset)) {
      alert(`النشاط "${preset}" موجود بالفعل بالقائمة`);
      return;
    }
    const updated = [...list, preset];
    setList(updated);
    onSaveStatuses(updated);
    setMsg(`تمت إضافة "${preset}" من القوالب الجاهزة`);
    setTimeout(() => setMsg(''), 2500);
  };

  const handleStartEdit = (idx: number, currentVal: string) => {
    setEditingIndex(idx);
    setEditingValue(currentVal);
  };

  const handleSaveEdit = (idx: number) => {
    const val = editingValue.trim();
    if (!val) return;
    const updated = [...list];
    updated[idx] = val;
    setList(updated);
    setEditingIndex(null);
    setEditingValue('');
    onSaveStatuses(updated);
    setMsg('تم تحديث وتثبيت حالة النشاط بنجاح');
    setTimeout(() => setMsg(''), 2500);
  };

  const handleDelete = (val: string) => {
    if (list.length <= 1) {
      alert('يجب أن تحتوي القائمة على حالة نشاط واحدة على الأقل');
      return;
    }
    const count = getBakeryCount(val);
    const confirmText = count > 0
      ? `تنبيه: يوجد (${count}) مخبز مسجل بهذا النشاط حالياً! هل أنت متأكد من حذف نشاط "${val}" من القائمة؟`
      : `هل أنت متأكد من حذف نشاط "${val}" من القائمة؟`;

    if (confirm(confirmText)) {
      const updated = list.filter((s) => s !== val);
      setList(updated);
      onSaveStatuses(updated);
      setMsg(`تم حذف نشاط "${val}"`);
      setTimeout(() => setMsg(''), 2500);
    }
  };

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
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-emerald-600/40 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 cursor-default">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="text-base font-black">إدارة وتعديل أنشطة وتشغيل المخابز</h3>
              <p className="text-[11px] text-emerald-200 font-bold">
                تخصيص الحالات التشغيلية وإضافة حالات جديدة للمخابز التموينية
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

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {msg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-black flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{msg}</span>
            </div>
          )}

          {/* Add form */}
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <input
              type="text"
              required
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              placeholder="اسم النشاط الجديد (مثال: مغلق بقرار نيابة تموينية)"
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 text-right"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-black shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إضافة نشاط
            </button>
          </form>

          {/* Quick Presets */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] font-black text-slate-700 flex items-center gap-1 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              أنشطة تموينية شائعة (انقر للإضافة الفورية بنقرة زر):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickPresets.map((preset) => {
                const isAlready = list.includes(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    disabled={isAlready}
                    onClick={() => handleAddPreset(preset)}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                      isAlready
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed opacity-60'
                        : 'bg-white hover:bg-emerald-50 text-emerald-950 border border-emerald-300 shadow-2xs cursor-pointer'
                    }`}
                  >
                    <span>{isAlready ? '✓' : '+'}</span>
                    <span>{preset}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* List of registered statuses with counts and direct editing */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-700">
                الحالات المسجلة والمعتمدة حالياً ({list.length})
              </span>
              <span className="text-[10px] text-slate-500 font-bold">
                تظهر في كافة فلاتر ونماذج المخابز والتقارير
              </span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {list.map((st, idx) => {
                const count = getBakeryCount(st);
                const badgeStyle = getStatusBadgeStyle(st);

                return (
                  <div
                    key={`${st}-${idx}`}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs hover:border-slate-300 transition"
                  >
                    {editingIndex === idx ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-emerald-400 rounded-lg text-xs font-black text-right"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(idx)}
                          className="p-1.5 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 cursor-pointer"
                          title="حفظ التعديل"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingIndex(null)}
                          className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 cursor-pointer"
                          title="إلغاء"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${badgeStyle}`}>
                            {st}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Store className="w-3 h-3 text-slate-400" />
                            {count} مخبز
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(idx, st)}
                            className="p-1.5 text-slate-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                            title="تعديل مسمى النشاط"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(st)}
                            className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="حذف هذا النشاط"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-black shadow-sm transition cursor-pointer"
          >
            إغلاق النافذة (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
