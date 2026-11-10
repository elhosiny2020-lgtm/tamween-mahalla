import React, { useState, useMemo, useEffect } from 'react';
import { VillageHierarchy, AppUser } from '../types';
import { AppState } from '../storage';
import {
  DEFAULT_BAKERY_CATEGORIES,
  DEFAULT_BREAD_TYPES,
  DEFAULT_BREAD_TYPE_COUNTS,
  DEFAULT_LINE_TYPES,
  DEFAULT_FUEL_TYPES,
  PAYMENT_METHODS
} from '../defaultData';
import {
  X,
  Search,
  Plus,
  Edit2,
  Trash2,
  Save,
  Settings,
  Layers,
  MapPin,
  Columns3,
  FileText,
  Users,
  Bell,
  CheckCircle2,
  Flame,
  Cog,
  Wheat,
  Hash,
  Activity,
  Store,
  ShieldAlert,
  Scale,
  CreditCard
} from 'lucide-react';

export type DropdownCategoryKey =
  | 'ALL'
  | 'lineTypes'
  | 'fuelTypes'
  | 'breadTypes'
  | 'breadTypeCounts'
  | 'activityStatuses'
  | 'bakeryCategories'
  | 'villages'
  | 'issuingEntities'
  | 'violationTypes'
  | 'paymentMethods';

interface SystemMasterEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  initialCategory?: DropdownCategoryKey;
  onUpdateState: (newState: AppState, toastMsg: string) => void;
  onOpenColumnTitles: () => void;
  onOpenHeaderCustomizer: () => void;
  onOpenDailyReminders: () => void;
  onOpenUsersManager: () => void;
  onOpenVillagesManager: () => void;
}

interface DropdownListMeta {
  key: Exclude<DropdownCategoryKey, 'ALL' | 'villages'>;
  title: string;
  subtitle: string;
  placeholder: string;
  badgeColor: string;
  icon: React.ReactNode;
}

const DROPDOWN_LISTS_META: DropdownListMeta[] = [
  {
    key: 'lineTypes',
    title: 'نوع خط الإنتاج',
    subtitle: 'القائمة المنسدلة لخطوط الإنتاج بالمخابز (نصف آلي، آلي كامل، يدوي...)',
    placeholder: 'أدخل نوع خط إنتاج جديد...',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    icon: <Cog className="w-4 h-4 text-amber-600" />,
  },
  {
    key: 'fuelTypes',
    title: 'نوع الوقود',
    subtitle: 'القائمة المنسدلة لنوع الوقود المستخدم في الأفران (غاز طبيعي، سولار...)',
    placeholder: 'أدخل نوع وقود جديد...',
    badgeColor: 'bg-orange-100 text-orange-900 border-orange-300',
    icon: <Flame className="w-4 h-4 text-orange-600" />,
  },
  {
    key: 'breadTypes',
    title: 'نوع الخبز',
    subtitle: 'القائمة المنسدلة لأنواع الخبز التمويني (بلدي مدعم ماو، بلدي مجر، طباقي...)',
    placeholder: 'أدخل نوع خبز جديد...',
    badgeColor: 'bg-yellow-100 text-yellow-900 border-yellow-300',
    icon: <Wheat className="w-4 h-4 text-yellow-700" />,
  },
  {
    key: 'breadTypeCounts',
    title: 'عدد نوع الخبز',
    subtitle: 'القائمة المنسدلة لعدد خطوط السير / عدد نوع الخبز بالمخبز (1، 2، 3...)',
    placeholder: 'أدخل عدد نوع الخبز (مثال: 6)...',
    badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    icon: <Hash className="w-4 h-4 text-indigo-600" />,
  },
  {
    key: 'activityStatuses',
    title: 'نشاط وحالة تشغيل المخبز',
    subtitle: 'القائمة المنسدلة لحالات التشغيل (شغال، متوقف جزئي، متوقف كلي، ملغى...)',
    placeholder: 'أدخل حالة تشغيل جديدة...',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    icon: <Activity className="w-4 h-4 text-emerald-600" />,
  },
  {
    key: 'bakeryCategories',
    title: 'تصنيف المخبز',
    subtitle: 'القائمة المنسدلة لتصنيفات المخابز (مخبز بلدي مدعم، مطور، سياحي 72%...)',
    placeholder: 'أدخل تصنيف مخبز جديد...',
    badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
    icon: <Store className="w-4 h-4 text-blue-600" />,
  },
  {
    key: 'issuingEntities',
    title: 'الجهة المحررة للمحضر',
    subtitle: 'القائمة المنسدلة للجهات الرقابية المحررة للمحاضر في المديونيات',
    placeholder: 'أدخل اسم جهة رقابية جديدة...',
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
    icon: <ShieldAlert className="w-4 h-4 text-purple-600" />,
  },
  {
    key: 'violationTypes',
    title: 'نوع المخالفة التموينية',
    subtitle: 'القائمة المنسدلة لأنواع المخالفات التموينية في سجل المديونيات',
    placeholder: 'أدخل نوع مخالفة تموينية جديدة...',
    badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
    icon: <Scale className="w-4 h-4 text-rose-600" />,
  },
  {
    key: 'paymentMethods',
    title: 'طرق السداد والتحصيل',
    subtitle: 'القائمة المنسدلة لوسائل سداد المخالفات والتصرف (نقدي، فودافون كاش، انستاباي...)',
    placeholder: 'أدخل طريقة سداد جديدة...',
    badgeColor: 'bg-teal-100 text-teal-900 border-teal-300',
    icon: <CreditCard className="w-4 h-4 text-teal-600" />,
  },
];

export const SystemMasterEditorModal: React.FC<SystemMasterEditorModalProps> = ({
  isOpen,
  onClose,
  appState,
  initialCategory = 'ALL',
  onUpdateState,
  onOpenColumnTitles,
  onOpenHeaderCustomizer,
  onOpenDailyReminders,
  onOpenUsersManager,
  onOpenVillagesManager,
}) => {
  const isReadOnly = appState.currentUser?.role === 'viewer';

  const [activeCategory, setActiveCategory] = useState<DropdownCategoryKey>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');

  // State for adding new items per list key
  const [newInputs, setNewInputs] = useState<Record<string, string>>({});

  // State for editing an item inline: { listKey, oldVal, newVal }
  const [editingItem, setEditingItem] = useState<{
    listKey: string;
    oldVal: string;
    newVal: string;
  } | null>(null);

  // State for Village & Local Unit inline editing
  const [newVillageName, setNewVillageName] = useState('');
  const [newUnitInputs, setNewUnitInputs] = useState<Record<string, string>>({});
  const [editingVillage, setEditingVillage] = useState<{ oldName: string; newName: string } | null>(null);
  const [editingUnit, setEditingUnit] = useState<{
    villageName: string;
    oldUnit: string;
    newUnit: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && initialCategory) {
      setActiveCategory(initialCategory);
    }
  }, [isOpen, initialCategory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const getListItems = (key: Exclude<DropdownCategoryKey, 'ALL' | 'villages'>): string[] => {
    switch (key) {
      case 'lineTypes':
        return appState.lineTypes || DEFAULT_LINE_TYPES;
      case 'fuelTypes':
        return appState.fuelTypes || DEFAULT_FUEL_TYPES;
      case 'breadTypes':
        return appState.breadTypes || DEFAULT_BREAD_TYPES;
      case 'breadTypeCounts':
        return appState.breadTypeCounts || DEFAULT_BREAD_TYPE_COUNTS;
      case 'activityStatuses':
        return appState.activityStatuses || [];
      case 'bakeryCategories':
        return appState.bakeryCategories || DEFAULT_BAKERY_CATEGORIES;
      case 'issuingEntities':
        return appState.issuingEntities || [];
      case 'violationTypes':
        return appState.violationTypes || [];
      case 'paymentMethods':
        return appState.paymentMethods || PAYMENT_METHODS;
    }
  };

  const handleAddItem = (key: Exclude<DropdownCategoryKey, 'ALL' | 'villages'>, title: string) => {
    if (isReadOnly) return;
    const raw = (newInputs[key] || '').trim();
    if (!raw) return;
    const current = getListItems(key);
    if (current.includes(raw)) {
      setNewInputs((prev) => ({ ...prev, [key]: '' }));
      return;
    }
    const updatedList = [...current, raw];
    onUpdateState(
      {
        ...appState,
        [key]: updatedList,
      },
      `تمت إضافة "${raw}" إلى قائمة (${title}) بنجاح`
    );
    setNewInputs((prev) => ({ ...prev, [key]: '' }));
  };

  const handleSaveEditItem = (
    key: Exclude<DropdownCategoryKey, 'ALL' | 'villages'>,
    title: string,
    oldVal: string,
    newVal: string
  ) => {
    if (isReadOnly) return;
    const clean = newVal.trim();
    if (!clean || clean === oldVal) {
      setEditingItem(null);
      return;
    }
    const current = getListItems(key);
    const updatedList = current.map((item) => (item === oldVal ? clean : item));

    // Also propagate rename to existing bakeries/debts so records stay synced
    let updatedBakeries = appState.bakeries;
    let updatedDebts = appState.debts;

    if (key === 'lineTypes') {
      updatedBakeries = updatedBakeries.map((b) => (b.lineType === oldVal ? { ...b, lineType: clean } : b));
    } else if (key === 'fuelTypes') {
      updatedBakeries = updatedBakeries.map((b) => (b.fuelType === oldVal ? { ...b, fuelType: clean } : b));
    } else if (key === 'breadTypes') {
      updatedBakeries = updatedBakeries.map((b) => (b.breadType === oldVal ? { ...b, breadType: clean } : b));
    } else if (key === 'breadTypeCounts') {
      const numVal = parseInt(clean, 10);
      if (!isNaN(numVal)) {
        updatedBakeries = updatedBakeries.map((b) =>
          String(b.breadTypeCount) === oldVal ? { ...b, breadTypeCount: numVal } : b
        );
      }
    } else if (key === 'activityStatuses') {
      updatedBakeries = updatedBakeries.map((b) =>
        b.activityStatus === oldVal ? { ...b, activityStatus: clean } : b
      );
    } else if (key === 'bakeryCategories') {
      updatedBakeries = updatedBakeries.map((b) =>
        b.bakeryCategory === oldVal ? { ...b, bakeryCategory: clean } : b
      );
    } else if (key === 'issuingEntities') {
      updatedDebts = updatedDebts.map((d) =>
        d.issuingEntity === oldVal ? { ...d, issuingEntity: clean } : d
      );
    } else if (key === 'violationTypes') {
      updatedDebts = updatedDebts.map((d) =>
        d.violationType === oldVal ? { ...d, violationType: clean } : d
      );
    }

    onUpdateState(
      {
        ...appState,
        [key]: updatedList,
        bakeries: updatedBakeries,
        debts: updatedDebts,
      },
      `تم تعديل "${oldVal}" إلى "${clean}" في قائمة (${title}) وتحديث السجلات المرتبطة`
    );
    setEditingItem(null);
  };

  const handleDeleteItem = (
    key: Exclude<DropdownCategoryKey, 'ALL' | 'villages'>,
    title: string,
    valToDelete: string
  ) => {
    if (isReadOnly) return;
    const current = getListItems(key);
    if (current.length <= 1) return; // keep at least 1 option
    const updatedList = current.filter((item) => item !== valToDelete);
    onUpdateState(
      {
        ...appState,
        [key]: updatedList,
      },
      `تم حذف "${valToDelete}" من قائمة (${title}) بنجاح`
    );
  };

  // Villages & Local Units handlers
  const handleAddVillage = () => {
    if (isReadOnly) return;
    const clean = newVillageName.trim();
    if (!clean) return;
    if (appState.villages.some((v) => v.village === clean)) return;
    const updated: VillageHierarchy[] = [
      ...appState.villages,
      { village: clean, localUnits: [`${clean} الرئيسية`] },
    ];
    onUpdateState({ ...appState, villages: updated }, `تمت إضافة قرية (${clean}) بنجاح`);
    setNewVillageName('');
  };

  const handleRenameVillage = (oldName: string, newName: string) => {
    if (isReadOnly) return;
    const clean = newName.trim();
    if (!clean || clean === oldName) {
      setEditingVillage(null);
      return;
    }
    const updatedVillages = appState.villages.map((v) =>
      v.village === oldName ? { ...v, village: clean } : v
    );
    const updatedBakeries = appState.bakeries.map((b) =>
      b.village === oldName ? { ...b, village: clean } : b
    );
    const updatedDebts = appState.debts.map((d) =>
      d.village === oldName ? { ...d, village: clean } : d
    );
    onUpdateState(
      {
        ...appState,
        villages: updatedVillages,
        bakeries: updatedBakeries,
        debts: updatedDebts,
      },
      `تم تعديل اسم القرية من "${oldName}" إلى "${clean}"`
    );
    setEditingVillage(null);
  };

  const handleDeleteVillage = (vName: string) => {
    if (isReadOnly || appState.villages.length <= 1) return;
    const updated = appState.villages.filter((v) => v.village !== vName);
    onUpdateState({ ...appState, villages: updated }, `تم حذف قرية (${vName}) من القائمة`);
  };

  const handleAddUnitToVillage = (villageName: string) => {
    if (isReadOnly) return;
    const clean = (newUnitInputs[villageName] || '').trim();
    if (!clean) return;
    const updated = appState.villages.map((v) => {
      if (v.village === villageName && !v.localUnits.includes(clean)) {
        return { ...v, localUnits: [...v.localUnits, clean] };
      }
      return v;
    });
    onUpdateState({ ...appState, villages: updated }, `تمت إضافة الوحدة المحلية (${clean}) لقرية (${villageName})`);
    setNewUnitInputs((prev) => ({ ...prev, [villageName]: '' }));
  };

  const handleRenameUnit = (villageName: string, oldUnit: string, newUnit: string) => {
    if (isReadOnly) return;
    const clean = newUnit.trim();
    if (!clean || clean === oldUnit) {
      setEditingUnit(null);
      return;
    }
    const updatedVillages = appState.villages.map((v) =>
      v.village === villageName
        ? { ...v, localUnits: v.localUnits.map((u) => (u === oldUnit ? clean : u)) }
        : v
    );
    const updatedBakeries = appState.bakeries.map((b) =>
      b.localUnit === oldUnit ? { ...b, localUnit: clean } : b
    );
    onUpdateState(
      {
        ...appState,
        villages: updatedVillages,
        bakeries: updatedBakeries,
      },
      `تم تعديل الوحدة المحلية من "${oldUnit}" إلى "${clean}"`
    );
    setEditingUnit(null);
  };

  const handleDeleteUnit = (villageName: string, unitName: string) => {
    if (isReadOnly) return;
    const updated = appState.villages.map((v) =>
      v.village === villageName
        ? { ...v, localUnits: v.localUnits.filter((u) => u !== unitName) }
        : v
    );
    onUpdateState({ ...appState, villages: updated }, `تم حذف الوحدة المحلية (${unitName})`);
  };

  const visibleMetaLists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return DROPDOWN_LISTS_META.filter((meta) => {
      if (activeCategory !== 'ALL' && activeCategory !== meta.key) return false;
      if (!q) return true;
      if (meta.title.toLowerCase().includes(q) || meta.subtitle.toLowerCase().includes(q)) return true;
      const items = getListItems(meta.key);
      return items.some((it) => it.toLowerCase().includes(q));
    });
  }, [activeCategory, searchQuery, appState]);

  const showVillagesSection = useMemo(() => {
    if (activeCategory !== 'ALL' && activeCategory !== 'villages') return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    if ('القرى والوحدات المحلية'.includes(q)) return true;
    return appState.villages.some(
      (v) =>
        v.village.toLowerCase().includes(q) ||
        v.localUnits.some((u) => u.toLowerCase().includes(q))
    );
  }, [activeCategory, searchQuery, appState.villages]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 overflow-y-auto cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-amber-500/60 w-full max-w-6xl my-3 overflow-hidden flex flex-col max-h-[94vh] cursor-default">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-950 via-amber-950 to-slate-950 p-4 text-white flex items-center justify-between border-b border-amber-500/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 border border-amber-400/50 rounded-xl text-amber-300">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>التعديل داخل المنظومة — التعديل على جميع القوائم المنسدلة</span>
                <span className="text-[11px] bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full font-black">
                  مركز موحد شامل ⚙️
                </span>
              </h3>
              <p className="text-xs text-amber-100/90 font-bold mt-0.5">
                إدارة شاملة ومباشرة للإضافة والتعديل والحذف على كافة القوائم المنسدلة وإعدادات المنظومة في شاشة واحدة سريعة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة التعديل داخل المنظومة"
            className="p-1.5 rounded-xl bg-red-900/60 hover:bg-red-600 text-white border border-red-500/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick System Editors Bar (ضم جميع أدوات التعديل بالمنظومة في مكان واحد) */}
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            <span>أدوات التعديل السريع بالمنظومة:</span>
          </span>
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenColumnTitles();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-black cursor-pointer"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>تعديل رؤوس الخانات والأعمدة</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenHeaderCustomizer();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-black cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>تخصيص الهوية والترويسة</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDailyReminders();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-black cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>إعدادات التذكير والتنبيه اليومي</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenVillagesManager();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-black cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>إدارة القرى والوحدات المفصلة</span>
            </button>

            {appState.currentUser?.role === 'admin' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenUsersManager();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-black cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>تعديل بيانات وصلاحيات المستخدمين</span>
              </button>
            )}
          </div>
        </div>

        {/* Fast Search & Category Filter Tabs */}
        <div className="bg-slate-100 p-3.5 border-b border-slate-200 space-y-3 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 text-amber-600 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث فوري في جميع القوائم المنسدلة (نوع خط الإنتاج، نوع الوقود، عدد نوع الخبز، القرى، المخالفات...)"
                className="w-full pr-9 pl-4 py-2 bg-white border-2 border-amber-400 rounded-xl text-xs font-black text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-amber-500"
              />
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-black cursor-pointer"
              >
                مسح البحث
              </button>
            )}
          </div>

          {/* Category Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                activeCategory === 'ALL'
                  ? 'bg-slate-900 text-amber-300 shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              جميع القوائم المنسدلة (10)
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('lineTypes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                activeCategory === 'lineTypes'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              نوع خط الإنتاج ({(appState.lineTypes || DEFAULT_LINE_TYPES).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('fuelTypes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                activeCategory === 'fuelTypes'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              نوع الوقود ({(appState.fuelTypes || DEFAULT_FUEL_TYPES).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('breadTypes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                activeCategory === 'breadTypes'
                  ? 'bg-yellow-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              نوع الخبز ({(appState.breadTypes || DEFAULT_BREAD_TYPES).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('breadTypeCounts')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                activeCategory === 'breadTypeCounts'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              عدد نوع الخبز ({(appState.breadTypeCounts || DEFAULT_BREAD_TYPE_COUNTS).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('activityStatuses')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                activeCategory === 'activityStatuses'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              حالة التشغيل ({appState.activityStatuses.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('bakeryCategories')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                activeCategory === 'bakeryCategories'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              تصنيف المخبز ({(appState.bakeryCategories || DEFAULT_BAKERY_CATEGORIES).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('villages')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                activeCategory === 'villages'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              القرى والوحدات ({appState.villages.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('issuingEntities')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                activeCategory === 'issuingEntities'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              الجهة المحررة ({appState.issuingEntities.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('violationTypes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                activeCategory === 'violationTypes'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              نوع المخالفة ({appState.violationTypes.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('paymentMethods')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                activeCategory === 'paymentMethods'
                  ? 'bg-cyan-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              طرق السداد ({(appState.paymentMethods || PAYMENT_METHODS).length})
            </button>
          </div>
        </div>

        {/* Main Scrollable Content */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-50 space-y-5">
          {/* Standard 9 Dropdown Lists Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleMetaLists.map((meta) => {
              const allItems = getListItems(meta.key);
              const q = searchQuery.trim().toLowerCase();
              const filteredItems = q
                ? allItems.filter(
                    (it) =>
                      it.toLowerCase().includes(q) ||
                      meta.title.toLowerCase().includes(q)
                  )
                : allItems;

              return (
                <div
                  key={meta.key}
                  className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-slate-100 rounded-xl border border-slate-200">
                          {meta.icon}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900">{meta.title}</h4>
                          <p className="text-[11px] text-slate-500 font-bold">{meta.subtitle}</p>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-black border font-mono ${meta.badgeColor}`}
                      >
                        {allItems.length} عنصر
                      </span>
                    </div>

                    {/* Add New Option Input */}
                    {!isReadOnly && (
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="text"
                          value={newInputs[meta.key] || ''}
                          onChange={(e) =>
                            setNewInputs((prev) => ({ ...prev, [meta.key]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddItem(meta.key, meta.title);
                            }
                          }}
                          placeholder={meta.placeholder}
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddItem(meta.key, meta.title)}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black cursor-pointer shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>إضافة</span>
                        </button>
                      </div>
                    )}

                    {/* Options List with Edit & Delete at the end */}
                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                      {filteredItems.map((item, idx) => {
                        const isEditingThis =
                          editingItem?.listKey === meta.key && editingItem?.oldVal === item;

                        return (
                          <div
                            key={`${meta.key}-${item}-${idx}`}
                            className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 hover:bg-amber-50/50 border border-slate-200 rounded-xl text-xs"
                          >
                            {isEditingThis ? (
                              <div className="flex items-center gap-1.5 flex-1">
                                <input
                                  type="text"
                                  value={editingItem.newVal}
                                  onChange={(e) =>
                                    setEditingItem({
                                      ...editingItem,
                                      newVal: e.target.value,
                                    })
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveEditItem(
                                        meta.key,
                                        meta.title,
                                        item,
                                        editingItem.newVal
                                      );
                                    }
                                  }}
                                  className="flex-1 px-2.5 py-1 bg-white border-2 border-amber-500 rounded-lg text-xs font-black text-slate-900"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSaveEditItem(
                                      meta.key,
                                      meta.title,
                                      item,
                                      editingItem.newVal
                                    )
                                  }
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer"
                                >
                                  <Save className="w-3 h-3" />
                                  <span>حفظ</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingItem(null)}
                                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-[11px] font-black cursor-pointer"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-mono text-[10px] font-black flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                  <span className="font-black text-slate-900">{item}</span>
                                </div>

                                {!isReadOnly && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditingItem({
                                          listKey: meta.key,
                                          oldVal: item,
                                          newVal: item,
                                        })
                                      }
                                      aria-label={`تعديل ${item} في ${meta.title}`}
                                      className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer"
                                      title="تعديل المسمى"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                      <span>تعديل</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteItem(meta.key, meta.title, item)}
                                      disabled={allItems.length <= 1}
                                      aria-label={`حذف ${item} من ${meta.title}`}
                                      className="px-2 py-1 bg-red-100 hover:bg-red-200 disabled:opacity-40 text-red-800 border border-red-300 rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer"
                                      title="حذف من القائمة"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>حذف</span>
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 10th Dropdown List Section: القرى والوحدات المحلية التابعة */}
          {showVillagesSection && (
            <div className="bg-white border-2 border-teal-500/40 rounded-2xl p-4 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-teal-50 border border-teal-200 rounded-xl text-teal-700">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">
                      القائمة المنسدلة للقرى والوحدات المحلية التابعة ({appState.villages.length} قرية رئيسية)
                    </h4>
                    <p className="text-[11px] text-slate-500 font-bold">
                      تعديل وحذف وإضافة القرى والوحدات المحلية المرتبطة بها مباشرة
                    </p>
                  </div>
                </div>

                {!isReadOnly && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newVillageName}
                      onChange={(e) => setNewVillageName(e.target.value)}
                      placeholder="اسم قرية رئيسية جديدة..."
                      className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handleAddVillage}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>إضافة قرية</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {appState.villages.map((v) => {
                  const isEditingV = editingVillage?.oldName === v.village;
                  return (
                    <div
                      key={v.village}
                      className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-2"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        {isEditingV ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={editingVillage.newName}
                              onChange={(e) =>
                                setEditingVillage({ ...editingVillage, newName: e.target.value })
                              }
                              className="flex-1 px-2 py-1 bg-white border border-teal-500 rounded-lg text-xs font-black"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleRenameVillage(v.village, editingVillage.newName)
                              }
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-black cursor-pointer"
                            >
                              حفظ
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingVillage(null)}
                              className="px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-[11px] font-black cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-xs font-black text-teal-950 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-teal-600" />
                              <span>قرية: {v.village}</span>
                              <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.2 rounded-full">
                                {v.localUnits.length} وحدة
                              </span>
                            </span>
                            {!isReadOnly && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingVillage({ oldName: v.village, newName: v.village })
                                  }
                                  className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[10px] font-black cursor-pointer"
                                >
                                  تعديل القرية
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVillage(v.village)}
                                  className="px-2 py-0.5 bg-red-100 hover:bg-red-200 text-red-800 rounded text-[10px] font-black cursor-pointer"
                                >
                                  حذف
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Add Local Unit */}
                      {!isReadOnly && (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={newUnitInputs[v.village] || ''}
                            onChange={(e) =>
                              setNewUnitInputs((prev) => ({ ...prev, [v.village]: e.target.value }))
                            }
                            placeholder={`إضافة وحدة محلية لقرية ${v.village}...`}
                            className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-bold text-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddUnitToVillage(v.village)}
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[11px] font-black cursor-pointer"
                          >
                            + إضافة وحدة
                          </button>
                        </div>
                      )}

                      {/* Units List */}
                      <div className="space-y-1 max-h-36 overflow-y-auto">
                        {v.localUnits.map((u) => {
                          const isEditingU =
                            editingUnit?.villageName === v.village && editingUnit?.oldUnit === u;
                          return (
                            <div
                              key={u}
                              className="flex items-center justify-between px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px]"
                            >
                              {isEditingU ? (
                                <div className="flex items-center gap-1 flex-1">
                                  <input
                                    type="text"
                                    value={editingUnit.newUnit}
                                    onChange={(e) =>
                                      setEditingUnit({ ...editingUnit, newUnit: e.target.value })
                                    }
                                    className="flex-1 px-2 py-0.5 border border-amber-500 rounded text-[11px] font-black"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRenameUnit(v.village, u, editingUnit.newUnit)
                                    }
                                    className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-black cursor-pointer"
                                  >
                                    حفظ
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingUnit(null)}
                                    className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-black cursor-pointer"
                                  >
                                    إلغاء
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span className="font-bold text-slate-800">{u}</span>
                                  {!isReadOnly && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditingUnit({
                                            villageName: v.village,
                                            oldUnit: u,
                                            newUnit: u,
                                          })
                                        }
                                        className="px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[10px] font-black cursor-pointer"
                                      >
                                        تعديل
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteUnit(v.village, u)}
                                        className="px-1.5 py-0.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-[10px] font-black cursor-pointer"
                                      >
                                        حذف
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>أي تعديل أو إضافة أو حذف في القوائم المنسدلة يتم تطبيقه وحفظه فوراً في كافة نوافذ المنظومة</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black cursor-pointer"
          >
            إغلاق النافذة (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
