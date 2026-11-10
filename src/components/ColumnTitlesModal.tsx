import React, { useState, useEffect } from 'react';
import { ColumnTitles } from '../types';
import { Columns3, Check, X, Save } from 'lucide-react';

interface ColumnTitlesModalProps {
  isOpen: boolean;
  onClose: () => void;
  titles: ColumnTitles;
  onSaveTitles: (updated: ColumnTitles) => void;
}

export const ColumnTitlesModal: React.FC<ColumnTitlesModalProps> = ({
  isOpen,
  onClose,
  titles,
  onSaveTitles,
}) => {
  const [formData, setFormData] = useState<ColumnTitles>({ ...titles });
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

  const handleChange = (key: keyof ColumnTitles, val: string) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveTitles(formData);
    setMsg('تم حفظ وتطبيق مسميات الأعمدة بنجاح!');
    setTimeout(() => {
      setMsg('');
      onClose();
    }, 400);
  };

  const fields: Array<{ key: keyof ColumnTitles; label: string; group: string }> = [
    { key: 'index', label: 'الرقم التسلسلي (م)', group: 'البيانات الأساسية' },
    { key: 'bakeryOwnerName', label: 'اسم صاحب المخبز', group: 'البيانات الأساسية' },
    { key: 'machineNumber', label: 'رقم الماكينة', group: 'البيانات الأساسية' },
    { key: 'village', label: 'القرية', group: 'البيانات الأساسية' },
    { key: 'localUnit', label: 'الوحدة التابعة', group: 'البيانات الأساسية' },
    { key: 'remainingDebt', label: 'المتبقي على المخبز', group: 'البيانات الأساسية' },

    // الحصص والبيانات التموينية
    { key: 'insuranceValue', label: 'القيمة التأمينية', group: 'الحصص والبيانات التموينية' },
    { key: 'insuranceQuota', label: 'الحصة التأمينية', group: 'الحصص والبيانات التموينية' },
    { key: 'actualQuota', label: 'الحصة الفعلية', group: 'الحصص والبيانات التموينية' },
    { key: 'loavesCount', label: 'الأرغفة اليومية', group: 'الحصص والبيانات التموينية' },
    { key: 'perCapitaAverage', label: 'متوسط نصيب الفرد للمخبز', group: 'الحصص والبيانات التموينية' },

    // إحصائيات السكان والمستفيدين
    { key: 'villagePopulation', label: 'سكان القرية', group: 'إحصائيات السكان والمستفيدين' },
    { key: 'beneficiaries2023', label: 'مستفيد عام 2023', group: 'إحصائيات السكان والمستفيدين' },
    { key: 'beneficiaries2024', label: 'مستفيدين عام 2024', group: 'إحصائيات السكان والمستفيدين' },
    { key: 'beneficiaries2025', label: 'مستفيدين عام 2025', group: 'إحصائيات السكان والمستفيدين' },
    { key: 'avg2023', label: 'متوسط عام 2023', group: 'إحصائيات السكان والمستفيدين' },
    { key: 'avg2024', label: 'متوسط عام 2024', group: 'إحصائيات السكان والمستفيدين' },
    { key: 'avg2025', label: 'متوسط عام 2025', group: 'إحصائيات السكان والمستفيدين' },
    { key: 'avgDiff', label: 'الفرق التراكمي', group: 'إحصائيات السكان والمستفيدين' },

    // التصنيف والتشغيل
    { key: 'activityStatus', label: 'نشاط المخبز', group: 'التصنيف والتشغيل' },
    { key: 'bakeryCategory', label: 'نوع المخابز', group: 'التصنيف والتشغيل' },
    { key: 'breadType', label: 'نوع الخبز', group: 'التصنيف والتشغيل' },
    { key: 'flourBagPrice', label: 'سعر الشيكارة', group: 'التصنيف والتشغيل' },
    { key: 'breadTypeCount', label: 'عدد نوع الخبز', group: 'التصنيف والتشغيل' },
    { key: 'lineType', label: 'نوع خط الإنتاج', group: 'التصنيف والتشغيل' },
    { key: 'fuelType', label: 'نوع الوقود', group: 'التصنيف والتشغيل' },

    { key: 'phone', label: 'رقم التليفون', group: 'الاتصال والهوية' },
    { key: 'nationalId', label: 'الرقم القومي', group: 'الاتصال والهوية' },

    { key: 'commercialRegDate', label: 'السجل التجاري', group: 'التراخيص والعقود' },
    { key: 'bakeryLicenseDate', label: 'رخصة المخبز', group: 'التراخيص والعقود' },
    { key: 'leaseAgreementDate', label: 'عقد الإيجار', group: 'التراخيص والعقود' },
    { key: 'taxCardDate', label: 'البطاقة الضريبية', group: 'التراخيص والعقود' },
    { key: 'actions', label: 'العمليات والإجراءات', group: 'العمليات والإجراءات' },
  ];

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
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-amber-500 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden cursor-default">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-amber-950 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Columns3 className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="text-base font-black">تعديل رؤوس الخانات ومسميات الأعمدة</h3>
              <p className="text-[11px] text-amber-100 font-bold">
                تخصيص مسميات حقول الجدول وكشوف التقارير وملفات الإكسيل المصدرة
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {msg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-black flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{msg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {fields.map((f) => (
              <div key={f.key} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-black text-slate-700">{f.label}</label>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded">
                    {f.group}
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={formData[f.key] || ''}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 text-right"
                />
              </div>
            ))}
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-black text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              إلغاء النافذة (ESC)
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-6 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-black shadow-md transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              حفظ وتطبيق المسميات فورياً
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
