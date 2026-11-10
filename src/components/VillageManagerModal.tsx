import React, { useState, useEffect } from 'react';
import { VillageHierarchy } from '../types';
import { MapPin, Plus, Trash2, X, Check } from 'lucide-react';

interface VillageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  villages: VillageHierarchy[];
  onSaveVillages: (updated: VillageHierarchy[]) => void;
}

export const VillageManagerModal: React.FC<VillageManagerModalProps> = ({
  isOpen,
  onClose,
  villages,
  onSaveVillages,
}) => {
  const [list, setList] = useState<VillageHierarchy[]>(villages);
  const [newVillageName, setNewVillageName] = useState('');
  const [newUnitNames, setNewUnitNames] = useState<Record<string, string>>({});
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

  const handleAddVillage = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newVillageName.trim();
    if (!name) return;

    if (list.some((v) => v.village === name)) {
      alert('هذه القرية موجودة بالفعل');
      return;
    }

    const updated = [...list, { village: name, localUnits: [`${name} الرئيسية`] }];
    setList(updated);
    setNewVillageName('');
    onSaveVillages(updated);
    setMsg(`تمت إضافة قرية ${name} بنجاح`);
    setTimeout(() => setMsg(''), 2000);
  };

  const handleDeleteVillage = (villageName: string) => {
    if (!confirm(`هل أنت متأكد من حذف قرية "${villageName}" وكافة وحداتها التابعة؟`)) return;
    const updated = list.filter((v) => v.village !== villageName);
    setList(updated);
    onSaveVillages(updated);
    setMsg(`تم حذف قرية ${villageName}`);
    setTimeout(() => setMsg(''), 2000);
  };

  const handleAddUnit = (villageName: string) => {
    const unitName = (newUnitNames[villageName] || '').trim();
    if (!unitName) return;

    const updated = list.map((v) => {
      if (v.village === villageName) {
        if (v.localUnits.includes(unitName)) {
          alert('هذه الوحدة مضافة بالفعل لهذه القرية');
          return v;
        }
        return { ...v, localUnits: [...v.localUnits, unitName] };
      }
      return v;
    });

    setList(updated);
    setNewUnitNames((prev) => ({ ...prev, [villageName]: '' }));
    onSaveVillages(updated);
  };

  const handleDeleteUnit = (villageName: string, unitName: string) => {
    const updated = list.map((v) => {
      if (v.village === villageName) {
        return { ...v, localUnits: v.localUnits.filter((u) => u !== unitName) };
      }
      return v;
    });
    setList(updated);
    onSaveVillages(updated);
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
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-amber-600/40 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden cursor-default">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-amber-900 to-slate-900 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="text-base font-black">إدارة القرى والوحدات المحلية التابعة لمركز المحلة الكبرى</h3>
              <p className="text-[11px] text-amber-100 font-bold">ربط المخابز والتقارير ديناميكياً بكل قرية ووحداتها</p>
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

        {/* Action Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <form onSubmit={handleAddVillage} className="flex items-center gap-2 w-full">
            <input
              type="text"
              required
              value={newVillageName}
              onChange={(e) => setNewVillageName(e.target.value)}
              placeholder="اسم القرية الجديدة (مثال: الهياتم)"
              className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 text-right"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-black shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إضافة قرية
            </button>
          </form>
        </div>

        {msg && (
          <div className="mx-4 mt-3 p-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-black flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{msg}</span>
          </div>
        )}

        {/* Villages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {list.map((item) => (
            <div
              key={item.village}
              className="bg-white border-2 border-slate-200 hover:border-amber-400 rounded-xl p-3.5 shadow-xs transition"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                  <span className="text-sm font-black text-slate-900">{item.village}</span>
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    ({item.localUnits.length} وحدة محلية)
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteVillage(item.village)}
                  title="حذف القرية"
                  className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Local Units Badges */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                {item.localUnits.map((unit) => (
                  <span
                    key={unit}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold"
                  >
                    <span>{unit}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteUnit(item.village, unit)}
                      className="text-amber-700 hover:text-red-600 hover:bg-amber-100 rounded-full p-0.5 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add Unit input */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2">
                <input
                  type="text"
                  value={newUnitNames[item.village] || ''}
                  onChange={(e) =>
                    setNewUnitNames({ ...newUnitNames, [item.village]: e.target.value })
                  }
                  placeholder={`إضافة وحدة تابعة لـ ${item.village}`}
                  className="flex-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-1 focus:ring-amber-500 text-right"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddUnit(item.village);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleAddUnit(item.village)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition"
                >
                  + إضافة وحدة
                </button>
              </div>
            </div>
          ))}
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
            className="px-6 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-black shadow-md transition cursor-pointer"
          >
            إغلاق النافذة (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
