import React, { useState, useEffect } from 'react';
import { Bakery, VillageHierarchy, AppUser, BakeryActivityLogItem } from '../types';
import { formatDateDDMMYYYY } from '../utils/auditHelper';
import {
  X,
  Calculator,
  Save,
  Store,
  MapPin,
  Calendar,
  AlertCircle,
  Hash,
  Phone,
  CreditCard,
  FileText,
  History,
  UserCheck,
  Clock,
  ShieldCheck
} from 'lucide-react';

interface BakeryModalProps {
  isOpen: boolean;
  onClose: () => void;
  bakeryToEdit?: Bakery | null;
  existingBakeries?: Bakery[];
  villages: VillageHierarchy[];
  activityStatuses?: string[];
  bakeryCategories?: string[];
  breadTypes?: string[];
  breadTypeCounts?: string[];
  lineTypes?: string[];
  fuelTypes?: string[];
  currentUser?: AppUser | null;
  onSave: (bakery: Bakery) => void;
  onAddActivityStatus?: (status: string) => void;
  onAddLocalUnit?: (village: string, unit: string) => void;
  onUpdateDropdownList?: (
    listKey: 'activityStatuses' | 'bakeryCategories' | 'breadTypes' | 'breadTypeCounts' | 'lineTypes' | 'fuelTypes',
    updatedList: string[]
  ) => void;
  onUpdateVillages?: (updatedVillages: VillageHierarchy[]) => void;
  onOpenMasterDropdownEditor?: () => void;
}

export const BakeryModal: React.FC<BakeryModalProps> = ({
  isOpen,
  onClose,
  bakeryToEdit,
  existingBakeries = [],
  villages,
  activityStatuses = ['شغال', 'متوقف جزئي', 'متوقف كلي', 'ملغى'],
  bakeryCategories = ['مخبز بلدي مدعم', 'مخبز بلدي مطور', 'مخبز سياحي 72%', 'مخبز فينو وأفرنجي', 'مخبز طباقي'],
  breadTypes = ['بلدي مدعم ماو', 'بلدي مجر', 'خبز آلي', 'طباقي'],
  breadTypeCounts = ['1', '2', '3', '4', '5'],
  lineTypes = ['نصف آلي', 'آلي كامل', 'يدوي', 'ميكانيكي كامل'],
  fuelTypes = ['غاز طبيعي', 'سولار', 'مازوت', 'كهرباء'],
  currentUser,
  onSave,
  onAddActivityStatus,
  onAddLocalUnit,
  onUpdateDropdownList,
  onUpdateVillages,
  onOpenMasterDropdownEditor,
}) => {
  const isReadOnly = currentUser?.role === 'viewer';
  // Inline quick adds & full inline edit/delete manager for any dropdown
  const [showAddUnitInput, setShowAddUnitInput] = useState(false);
  const [newUnitInput, setNewUnitInput] = useState('');
  const [showAddStatusInput, setShowAddStatusInput] = useState(false);
  const [newStatusInput, setNewStatusInput] = useState('');

  // Which dropdown's inline Edit/Delete manager is currently open
  const [openDropdownEditor, setOpenDropdownEditor] = useState<
    | null
    | 'village'
    | 'localUnit'
    | 'activityStatuses'
    | 'bakeryCategories'
    | 'breadTypes'
    | 'breadTypeCounts'
    | 'lineTypes'
    | 'fuelTypes'
  >(null);
  const [dropdownNewItemText, setDropdownNewItemText] = useState('');
  const [dropdownEditingItem, setDropdownEditingItem] = useState<{ oldVal: string; newVal: string } | null>(null);

  // Form State
  const [ownerName, setOwnerName] = useState('');
  const [machineNumber, setMachineNumber] = useState('');
  const [selectedVillage, setSelectedVillage] = useState(villages[0]?.village || 'بشبيش');
  const [selectedUnit, setSelectedUnit] = useState(villages[0]?.localUnits[0] || 'بشبيش الرئيسية');

  // Quotas & Calculations
  const [insuranceQuota, setInsuranceQuota] = useState<number>(20);
  const [actualQuota, setActualQuota] = useState<number>(20);
  const [insuranceValue, setInsuranceValue] = useState<number>(15000);
  const [loavesCount, setLoavesCount] = useState<number>(20 * 1350);

  // Demographics & Averages (متوسط نصيب الفرد بعلامة عشرية ورقمين فقط 0.00)
  const [villagePopulation, setVillagePopulation] = useState<number>(30000);
  const [perCapitaAverage, setPerCapitaAverage] = useState<string>('0.90');
  const [beneficiaries2023, setBeneficiaries2023] = useState<number>(27000);
  const [avg2023, setAvg2023] = useState<string>('1.000');
  const [beneficiaries2024, setBeneficiaries2024] = useState<number>(28500);
  const [avg2024, setAvg2024] = useState<string>('0.947');
  const [beneficiaries2025, setBeneficiaries2025] = useState<number>(29800);
  const [avg2025, setAvg2025] = useState<string>('0.906');
  const [avgDiff, setAvgDiff] = useState<string>('-0.094');

  // Classification & Operations
  const [activityStatus, setActivityStatus] = useState('شغال');
  const [bakeryCategory, setBakeryCategory] = useState('مخبز بلدي مدعم');
  const [breadType, setBreadType] = useState('بلدي مدعم ماو');
  const [flourBagPrice, setFlourBagPrice] = useState<number>(950);
  const [breadTypeCount, setBreadTypeCount] = useState<number>(1);
  const [lineType, setLineType] = useState('نصف آلي');
  const [fuelType, setFuelType] = useState('غاز طبيعي');

  // Contact & ID
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');

  // Licenses Dates
  const [taxCardDate, setTaxCardDate] = useState('');
  const [commercialRegDate, setCommercialRegDate] = useState('');
  const [bakeryLicenseDate, setBakeryLicenseDate] = useState('');
  const [leaseAgreementDate, setLeaseAgreementDate] = useState('');

  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string>('');

  // Sync available local units when village changes
  const currentVillageUnits = villages.find((v) => v.village === selectedVillage)?.localUnits || [];

  // Effect to automatically persist draft on any field change
  useEffect(() => {
    if (!isOpen) return;

    const draftData = {
      ownerName,
      machineNumber,
      selectedVillage,
      selectedUnit,
      insuranceQuota,
      actualQuota,
      insuranceValue,
      loavesCount,
      villagePopulation,
      perCapitaAverage,
      beneficiaries2023,
      avg2023,
      beneficiaries2024,
      avg2024,
      beneficiaries2025,
      avg2025,
      avgDiff,
      activityStatus,
      bakeryCategory,
      breadType,
      flourBagPrice,
      breadTypeCount,
      lineType,
      fuelType,
      phone,
      nationalId,
      taxCardDate,
      commercialRegDate,
      bakeryLicenseDate,
      leaseAgreementDate,
      notes,
      updatedAt: Date.now(),
    };

    try {
      localStorage.setItem('TAMWEEN_BAKERY_DRAFT', JSON.stringify(draftData));
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
    ownerName,
    machineNumber,
    selectedVillage,
    selectedUnit,
    insuranceQuota,
    actualQuota,
    insuranceValue,
    loavesCount,
    villagePopulation,
    perCapitaAverage,
    beneficiaries2023,
    avg2023,
    beneficiaries2024,
    avg2024,
    beneficiaries2025,
    avg2025,
    avgDiff,
    activityStatus,
    bakeryCategory,
    breadType,
    flourBagPrice,
    breadTypeCount,
    lineType,
    fuelType,
    phone,
    nationalId,
    taxCardDate,
    commercialRegDate,
    bakeryLicenseDate,
    leaseAgreementDate,
    notes,
  ]);

  useEffect(() => {
    if (bakeryToEdit) {
      setOwnerName(bakeryToEdit.bakeryOwnerName);
      setMachineNumber(bakeryToEdit.machineNumber);
      setSelectedVillage(bakeryToEdit.village);
      setSelectedUnit(bakeryToEdit.localUnit);

      setInsuranceQuota(bakeryToEdit.insuranceQuota);
      setActualQuota(bakeryToEdit.actualQuota);
      setInsuranceValue(bakeryToEdit.insuranceValue);
      setLoavesCount(bakeryToEdit.loavesCount);

      setVillagePopulation(bakeryToEdit.villagePopulation);
      const parsedPerCapita = parseFloat(String(bakeryToEdit.perCapitaAverage || '0'));
      setPerCapitaAverage(!isNaN(parsedPerCapita) ? parsedPerCapita.toFixed(2) : '0.00');
      setBeneficiaries2023(bakeryToEdit.beneficiaries2023);
      setAvg2023(bakeryToEdit.avg2023);
      setBeneficiaries2024(bakeryToEdit.beneficiaries2024);
      setAvg2024(bakeryToEdit.avg2024);
      setBeneficiaries2025(bakeryToEdit.beneficiaries2025);
      setAvg2025(bakeryToEdit.avg2025);
      setAvgDiff(bakeryToEdit.avgDiff);

      setActivityStatus(bakeryToEdit.activityStatus || 'شغال');
      setBakeryCategory(bakeryToEdit.bakeryCategory || 'مخبز بلدي مدعم');
      setBreadType(bakeryToEdit.breadType || 'بلدي مدعم ماو');
      setFlourBagPrice(bakeryToEdit.flourBagPrice !== undefined ? Number(bakeryToEdit.flourBagPrice) : 950);
      setBreadTypeCount(bakeryToEdit.breadTypeCount || 1);
      setLineType(bakeryToEdit.lineType || 'نصف آلي');
      setFuelType(bakeryToEdit.fuelType || 'غاز طبيعي');

      setPhone(bakeryToEdit.phone);
      setNationalId(bakeryToEdit.nationalId);

      setTaxCardDate(bakeryToEdit.taxCardDate || '');
      setCommercialRegDate(bakeryToEdit.commercialRegDate || '');
      setBakeryLicenseDate(bakeryToEdit.bakeryLicenseDate || '');
      setLeaseAgreementDate(bakeryToEdit.leaseAgreementDate || '');

      setNotes(bakeryToEdit.notes || '');
    } else {
      // Reset for new bakery
      setOwnerName('');
      setMachineNumber('');
      const defaultV = villages[0]?.village || 'بشبيش';
      setSelectedVillage(defaultV);
      const units = villages.find((v) => v.village === defaultV)?.localUnits || [];
      setSelectedUnit(units[0] || 'بشبيش الرئيسية');

      setInsuranceQuota(20);
      setActualQuota(20);
      setInsuranceValue(15000);
      const loaves = 20 * 1350;
      setLoavesCount(loaves);
      setVillagePopulation(30000);
      setPerCapitaAverage((loaves / 30000).toFixed(2));
      setBeneficiaries2023(27000);
      setAvg2023((loaves / 27000).toFixed(3));
      setBeneficiaries2024(28500);
      setAvg2024((loaves / 28500).toFixed(3));
      setBeneficiaries2025(29800);
      const a25 = loaves / 29800;
      setAvg2025(a25.toFixed(3));
      setAvgDiff((a25 - loaves / 27000).toFixed(3));

      setActivityStatus('شغال');
      setBakeryCategory('مخبز بلدي مدعم');
      setBreadType('بلدي مدعم ماو');
      setFlourBagPrice(950);
      setBreadTypeCount(1);
      setLineType('نصف آلي');
      setFuelType('غاز طبيعي');
      setPhone('');
      setNationalId('');

      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      const defaultDate = nextYear.toISOString().split('T')[0];
      setTaxCardDate(defaultDate);
      setCommercialRegDate(defaultDate);
      setBakeryLicenseDate(defaultDate);
      setLeaseAgreementDate(defaultDate);
      setNotes('');
    }
    setErrors({});
  }, [bakeryToEdit, isOpen, villages]);

  const handleVillageChange = (vName: string) => {
    setSelectedVillage(vName);
    const units = villages.find((v) => v.village === vName)?.localUnits || [];
    setSelectedUnit(units[0] || '');
  };

  // Dedicated Auto-Calculation Engine (جميع المتوسطات بعلامة عشرية ورقمين فقط 0.00)
  const calculateAllAverages = (customQuota?: number, customPop?: number, customB23?: number, customB24?: number, customB25?: number) => {
    const q = customQuota !== undefined ? customQuota : insuranceQuota;
    const pop = customPop !== undefined ? customPop : villagePopulation;
    const b23 = customB23 !== undefined ? customB23 : beneficiaries2023;
    const b24 = customB24 !== undefined ? customB24 : beneficiaries2024;
    const b25 = customB25 !== undefined ? customB25 : beneficiaries2025;

    const calculatedLoaves = Math.round(Number(q || 0) * 1350);
    setLoavesCount(calculatedLoaves);

    const calculatedPerCapita = pop > 0 ? (calculatedLoaves / pop).toFixed(2) : '0.00';
    setPerCapitaAverage(calculatedPerCapita);

    const cAvg23 = b23 > 0 ? (calculatedLoaves / b23).toFixed(2) : '0.00';
    setAvg2023(cAvg23);

    const cAvg24 = b24 > 0 ? (calculatedLoaves / b24).toFixed(2) : '0.00';
    setAvg2024(cAvg24);

    const cAvg25 = b25 > 0 ? (calculatedLoaves / b25).toFixed(2) : '0.00';
    setAvg2025(cAvg25);

    const diff = (parseFloat(cAvg25) - parseFloat(cAvg23)).toFixed(2);
    setAvgDiff(diff);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    // 1. Owner Name
    const cleanOwnerName = ownerName.trim();
    if (!cleanOwnerName) {
      newErrors.ownerName = 'اسم صاحب المخبز مطلوب ولا يمكن تركه فارغاً';
    } else if (cleanOwnerName.length < 2) {
      newErrors.ownerName = 'اسم صاحب المخبز قصير جداً';
    }

    // 2. Machine Number Check
    const cleanMachine = machineNumber.trim();
    if (!cleanMachine) {
      newErrors.machineNumber = 'رقم الماكينة (POS) مطلوب ولا يمكن تركه فارغاً';
    } else {
      const duplicateBakery = (existingBakeries || []).find(
        (b) =>
          b.machineNumber.trim().toLowerCase() === cleanMachine.toLowerCase() &&
          (!bakeryToEdit || b.id !== bakeryToEdit.id)
      );
      if (duplicateBakery) {
        newErrors.machineNumber = `رقم الماكينة (${cleanMachine}) مكرر ومسجل بالفعل لمخبز باسم "${duplicateBakery.bakeryOwnerName}" بقرية (${duplicateBakery.village})`;
      }
    }

    // 3. Phone Check (Warning/Optional for existing data)
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (phone.trim() && cleanPhone.length > 0 && cleanPhone.length < 7) {
      newErrors.phone = 'رقم الهاتف قصير جداً وغير مكتمل';
    }

    // 4. National ID Check (Forgiving for legacy imports)
    const cleanNid = nationalId.trim().replace(/\D/g, '');
    if (nationalId.trim() && cleanNid.length > 0 && cleanNid.length < 10) {
      newErrors.nationalId = 'الرقم القومي غير مكتمل';
    }

    // 5. Quotas & Numeric Values Validation
    if (insuranceQuota <= 0) {
      newErrors.insuranceQuota = 'الحصة التأمينية يجب أن تكون قيمة موجبة أكبر من الصفر (شكارة)';
    }

    // 6. Dates Validation (Optional if empty, validate format if provided)
    const validateDate = (dStr: string, fieldName: string, label: string) => {
      if (!dStr || !dStr.trim()) return; // optional
      const d = new Date(dStr);
      if (isNaN(d.getTime())) {
        newErrors[fieldName] = `تاريخ ${label} غير صالح`;
      } else {
        const year = d.getFullYear();
        if (year < 1980 || year > 2100) {
          newErrors[fieldName] = `تاريخ ${label} غير منطقي (السنة يجب أن تكون بين 1980 و 2100)`;
        }
      }
    };

    validateDate(commercialRegDate, 'commercialRegDate', 'السجل التجاري');
    validateDate(bakeryLicenseDate, 'bakeryLicenseDate', 'رخصة المخبز');
    validateDate(leaseAgreementDate, 'leaseAgreementDate', 'عقد الإيجار');
    validateDate(taxCardDate, 'taxCardDate', 'البطاقة الضريبية');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!validate()) return;

    const userInfo = currentUser || { username: 'مفتش التموين', fullName: 'مفتش التموين', role: 'inspector' };
    const roleLabel = userInfo.role === 'admin' ? 'مدير إداري' : userInfo.role === 'auditor' ? 'مراجع مالي' : 'مفتش رقابة';

    const newLogItem: BakeryActivityLogItem = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
      username: userInfo.username,
      userFullName: userInfo.fullName,
      userRole: roleLabel,
      action: bakeryToEdit ? 'تعديل وتحديث بيانات المخبز' : 'إنشاء وتسجيل المخبز لأول مرة',
      details: bakeryToEdit
        ? `الحصة الفعلية: ${actualQuota} شكارة | النشاط: ${activityStatus} | التصنيف: ${bakeryCategory}`
        : `تسجيل جديد لصاحب المخبز (${ownerName.trim()}) بالحصة التأمينية ${insuranceQuota} شكارة`,
    };

    const existingLogs = bakeryToEdit?.activityLog || [];
    const updatedLogs = [newLogItem, ...existingLogs];

    const bakery: Bakery = {
      id: bakeryToEdit ? bakeryToEdit.id : `b-${Date.now()}`,
      bakeryOwnerName: ownerName.trim(),
      machineNumber: machineNumber.trim(),
      village: selectedVillage,
      localUnit: selectedUnit,
      insuranceQuota: Number(insuranceQuota) || 0,
      actualQuota: Number(actualQuota) || 0,
      insuranceValue: Number(insuranceValue) || 0,
      loavesCount: Number(loavesCount) || 0,
      villagePopulation: Number(villagePopulation) || 0,
      perCapitaAverage: !isNaN(parseFloat(perCapitaAverage))
        ? parseFloat(perCapitaAverage).toFixed(2)
        : '0.00',
      beneficiaries2023: Number(beneficiaries2023) || 0,
      avg2023: String(avg2023),
      beneficiaries2024: Number(beneficiaries2024) || 0,
      avg2024: String(avg2024),
      beneficiaries2025: Number(beneficiaries2025) || 0,
      avg2025: String(avg2025),
      avgDiff: String(avgDiff),
      activityStatus,
      bakeryCategory: bakeryCategory.trim() || 'مخبز بلدي مدعم',
      breadType,
      flourBagPrice: Number(flourBagPrice) || 950,
      breadTypeCount: Number(breadTypeCount) || 1,
      lineType,
      fuelType,
      phone: phone.trim(),
      nationalId: nationalId.trim(),
      taxCardDate,
      commercialRegDate,
      bakeryLicenseDate,
      leaseAgreementDate,
      notes: notes.trim(),
      activityLog: updatedLogs,
    };

    onSave(bakery);
    onClose();
  };

  // Helper for inline dropdown list management inside BakeryModal
  const getActiveInlineList = (): {
    key: 'activityStatuses' | 'bakeryCategories' | 'breadTypes' | 'breadTypeCounts' | 'lineTypes' | 'fuelTypes';
    title: string;
    items: string[];
    currentVal: string;
    setVal: (v: string) => void;
  } | null => {
    switch (openDropdownEditor) {
      case 'activityStatuses':
        return {
          key: 'activityStatuses',
          title: 'نشاط وحالة تشغيل المخبز',
          items: activityStatuses,
          currentVal: activityStatus,
          setVal: setActivityStatus,
        };
      case 'bakeryCategories':
        return {
          key: 'bakeryCategories',
          title: 'نوع المخابز',
          items: bakeryCategories,
          currentVal: bakeryCategory,
          setVal: setBakeryCategory,
        };
      case 'breadTypes':
        return {
          key: 'breadTypes',
          title: 'نوع الخبز',
          items: breadTypes,
          currentVal: breadType,
          setVal: setBreadType,
        };
      case 'breadTypeCounts':
        return {
          key: 'breadTypeCounts',
          title: 'عدد نوع الخبز',
          items: breadTypeCounts,
          currentVal: String(breadTypeCount),
          setVal: (v) => setBreadTypeCount(Number(v) || 1),
        };
      case 'lineTypes':
        return {
          key: 'lineTypes',
          title: 'نوع خط الإنتاج',
          items: lineTypes,
          currentVal: lineType,
          setVal: setLineType,
        };
      case 'fuelTypes':
        return {
          key: 'fuelTypes',
          title: 'نوع الوقود',
          items: fuelTypes,
          currentVal: fuelType,
          setVal: setFuelType,
        };
      default:
        return null;
    }
  };

  const activeInlineList = getActiveInlineList();

  // Listen to Escape key to close modal
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
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-amber-600/40 w-full max-w-5xl my-4 overflow-hidden flex flex-col max-h-[92vh] cursor-default">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-amber-900 to-slate-900 p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Store className="w-6 h-6 text-amber-300" />
            <div>
              <h3 className="text-base font-black">
                {bakeryToEdit ? 'تعديل بيانات المخبز التمويني' : 'تسجيل وإضافة مخبز تمويني جديد'}
              </h3>
              <p className="text-[11px] text-amber-100 font-bold flex items-center gap-1.5 mt-0.5">
                <span className="text-black font-black bg-amber-400 px-2 py-0.2 rounded text-[10px]">
                  إدارة تموين مركز المحلة الكبرى
                </span>
                <span>- قاعدة بيانات المخابز والمديونيات</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Auto-Save Indicator */}
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

        {/* Read-Only Viewer Notice Banner */}
        {isReadOnly && (
          <div className="bg-amber-50 border-b-2 border-amber-300 p-3 flex items-center justify-between text-amber-950 font-bold text-xs shrink-0">
            <span className="flex items-center gap-2">
              <span className="text-base">👁️</span>
              <span><strong>وضع المشاهدة فقط:</strong> تم تسجيل دخولك بحساب قارئ/مشاهد. يمكنك معاينة وتدقيق كافة البيانات دون صلاحية الحفظ أو التعديل.</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-200 border border-amber-300 text-[10px] font-black">
              صلاحية قراءة فقط
            </span>
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-5 flex-1">
          {/* Top Validation Error Banner */}
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-950/90 border-2 border-red-500 p-4 rounded-xl text-white shadow-2xl space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-300 font-black text-xs border-b border-red-800 pb-2">
                <AlertCircle className="w-5 h-5 text-red-400 animate-bounce" />
                <span>تنبيه أخطاء في التحقق من البيانات المدخلة ({Object.keys(errors).length} خطأ يمنع الحفظ):</span>
              </div>
              <ul className="list-disc list-inside text-xs font-bold text-red-200 space-y-1">
                {Object.entries(errors).map(([key, msg]) => (
                  <li key={key}>{msg}</li>
                ))}
              </ul>
            </div>
          )}
          {/* Quick Recalculate Toolbar */}
          <div className="bg-amber-50 border-2 border-amber-200 p-3 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-900">
              <Calculator className="w-5 h-5 text-amber-700" />
              <span className="text-xs font-black">
                المعيار التمويني المعتمد: الحصة التأمينية × 1350 رغيفاً للشيكارة الواحدة
              </span>
            </div>
            <button
              type="button"
              onClick={() => calculateAllAverages()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-black shadow-sm transition cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              إعادة الحساب التلقائي لكافة الحصص والمتوسطات
            </button>
          </div>

          {/* Section 1: Basic Info & Village */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <h4 className="text-xs font-black text-slate-800 pb-2 mb-3 border-b border-slate-200 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-amber-600" />
              1. البيانات الأساسية وموقع المخبز
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-700 mb-1">
                  اسم صاحب المخبز *
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="الاسم الرباعي لصاحب المخبز"
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 text-right ${
                    errors.ownerName ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
                {errors.ownerName && (
                  <p className="text-[10px] text-red-600 font-bold mt-0.5">{errors.ownerName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  رقم الماكينة (POS) *
                </label>
                <input
                  type="text"
                  required
                  value={machineNumber}
                  onChange={(e) => setMachineNumber(e.target.value)}
                  placeholder="رقم ماكينة الصرف"
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 num-enlarged text-right ${
                    errors.machineNumber ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
                {errors.machineNumber && (
                  <p className="text-[10px] text-red-600 font-bold mt-0.5">{errors.machineNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">القرية</label>
                <select
                  value={selectedVillage}
                  onChange={(e) => handleVillageChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500"
                >
                  {villages.map((v) => (
                    <option key={v.village} value={v.village}>
                      {v.village}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-slate-700">
                    الوحدة المحلية التابعة للقرية
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddUnitInput(!showAddUnitInput)}
                    className="text-[10px] text-amber-700 hover:text-amber-900 font-black bg-amber-50 px-2 py-0.5 rounded border border-amber-200 cursor-pointer"
                  >
                    {showAddUnitInput ? 'إلغاء' : '+ وحدة جديدة للقرية'}
                  </button>
                </div>

                {showAddUnitInput && (
                  <div className="flex items-center gap-1.5 mb-2 animate-in fade-in">
                    <input
                      type="text"
                      value={newUnitInput}
                      onChange={(e) => setNewUnitInput(e.target.value)}
                      placeholder={`اسم الوحدة التابعة لـ ${selectedVillage}`}
                      className="flex-1 px-2.5 py-1 bg-white border border-amber-400 rounded-lg text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = newUnitInput.trim();
                        if (!val) return;
                        if (onAddLocalUnit) {
                          onAddLocalUnit(selectedVillage, val);
                        }
                        setSelectedUnit(val);
                        setNewUnitInput('');
                        setShowAddUnitInput(false);
                      }}
                      className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-black cursor-pointer"
                    >
                      حفظ واختيار
                    </button>
                  </div>
                )}

                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500"
                >
                  {currentVillageUnits.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                  {selectedUnit && !currentVillageUnits.includes(selectedUnit) && (
                    <option value={selectedUnit}>{selectedUnit}</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Classification and Operations (مع مفتاح تعديل وحذف لكل قائمة منسدلة) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-amber-600" />
                <span>2. التصنيف والتشغيل (إدارة وتعديل وحذف القوائم المنسدلة مباشرة)</span>
              </h4>
              {!isReadOnly && onOpenMasterDropdownEditor && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenMasterDropdownEditor();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/50 rounded-lg text-[11px] font-black cursor-pointer shadow-xs"
                >
                  <span>⚙️ التعديل على جميع القوائم المنسدلة</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {/* 1. نشاط المخبز */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-slate-700">نشاط المخبز</label>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdownEditor(
                          openDropdownEditor === 'activityStatuses' ? null : 'activityStatuses'
                        );
                        setDropdownEditingItem(null);
                        setDropdownNewItemText('');
                      }}
                      className="text-[10px] text-amber-800 hover:text-amber-950 font-black bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 cursor-pointer"
                      title="تعديل وحذف وإضافة في قائمة نشاط المخبز"
                    >
                      {openDropdownEditor === 'activityStatuses' ? 'إغلاق القائمة' : '✏️ تعديل/حذف'}
                    </button>
                  )}
                </div>
                <select
                  value={activityStatus}
                  onChange={(e) => setActivityStatus(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500"
                >
                  {activityStatuses.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                  {activityStatus && !activityStatuses.includes(activityStatus) && (
                    <option value={activityStatus}>{activityStatus}</option>
                  )}
                </select>
              </div>

              {/* 2. نوع المخابز */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-slate-700">نوع المخابز *</label>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdownEditor(
                          openDropdownEditor === 'bakeryCategories' ? null : 'bakeryCategories'
                        );
                        setDropdownEditingItem(null);
                        setDropdownNewItemText('');
                      }}
                      className="text-[10px] text-amber-800 hover:text-amber-950 font-black bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 cursor-pointer"
                      title="تعديل وحذف وإضافة في قائمة نوع المخابز"
                    >
                      {openDropdownEditor === 'bakeryCategories' ? 'إغلاق القائمة' : '✏️ تعديل/حذف'}
                    </button>
                  )}
                </div>
                <select
                  value={bakeryCategory}
                  onChange={(e) => setBakeryCategory(e.target.value)}
                  className="w-full px-2.5 py-2 bg-amber-50 border border-amber-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  {bakeryCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  {bakeryCategory && !bakeryCategories.includes(bakeryCategory) && (
                    <option value={bakeryCategory}>{bakeryCategory}</option>
                  )}
                </select>
              </div>

              {/* 3. نوع الخبز */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-slate-700">نوع الخبز</label>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdownEditor(
                          openDropdownEditor === 'breadTypes' ? null : 'breadTypes'
                        );
                        setDropdownEditingItem(null);
                        setDropdownNewItemText('');
                      }}
                      className="text-[10px] text-amber-800 hover:text-amber-950 font-black bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 cursor-pointer"
                      title="تعديل وحذف وإضافة في قائمة نوع الخبز"
                    >
                      {openDropdownEditor === 'breadTypes' ? 'إغلاق القائمة' : '✏️ تعديل/حذف'}
                    </button>
                  )}
                </div>
                <select
                  value={breadType}
                  onChange={(e) => setBreadType(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500"
                >
                  {breadTypes.map((bt) => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  ))}
                  {breadType && !breadTypes.includes(breadType) && (
                    <option value={breadType}>{breadType}</option>
                  )}
                </select>
              </div>

              {/* 4. سعر الشيكارة (بجانب خانة نوع الخبز) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-slate-700">سعر الشيكارة (ج.م)</label>
                </div>
                <input
                  type="number"
                  value={flourBagPrice}
                  onChange={(e) => setFlourBagPrice(parseFloat(e.target.value) || 0)}
                  placeholder="950"
                  className="w-full px-2.5 py-2 bg-amber-50 border border-amber-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 num-enlarged text-center"
                />
              </div>

              {/* 5. عدد نوع الخبز */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-slate-700">عدد نوع الخبز</label>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdownEditor(
                          openDropdownEditor === 'breadTypeCounts' ? null : 'breadTypeCounts'
                        );
                        setDropdownEditingItem(null);
                        setDropdownNewItemText('');
                      }}
                      className="text-[10px] text-amber-800 hover:text-amber-950 font-black bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 cursor-pointer"
                      title="تعديل وحذف وإضافة في قائمة عدد نوع الخبز"
                    >
                      {openDropdownEditor === 'breadTypeCounts' ? 'إغلاق القائمة' : '✏️ تعديل/حذف'}
                    </button>
                  )}
                </div>
                <select
                  value={String(breadTypeCount)}
                  onChange={(e) => setBreadTypeCount(Number(e.target.value) || 1)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 num-enlarged text-center"
                >
                  {breadTypeCounts.map((cnt) => (
                    <option key={cnt} value={cnt}>
                      {cnt}
                    </option>
                  ))}
                  {!breadTypeCounts.includes(String(breadTypeCount)) && (
                    <option value={String(breadTypeCount)}>{breadTypeCount}</option>
                  )}
                </select>
              </div>

              {/* 6. نوع خط الإنتاج */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-slate-700">نوع خط الإنتاج</label>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdownEditor(
                          openDropdownEditor === 'lineTypes' ? null : 'lineTypes'
                        );
                        setDropdownEditingItem(null);
                        setDropdownNewItemText('');
                      }}
                      className="text-[10px] text-amber-800 hover:text-amber-950 font-black bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 cursor-pointer"
                      title="تعديل وحذف وإضافة في قائمة نوع خط الإنتاج"
                    >
                      {openDropdownEditor === 'lineTypes' ? 'إغلاق القائمة' : '✏️ تعديل/حذف'}
                    </button>
                  )}
                </div>
                <select
                  value={lineType}
                  onChange={(e) => setLineType(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500"
                >
                  {lineTypes.map((lt) => (
                    <option key={lt} value={lt}>
                      {lt}
                    </option>
                  ))}
                  {lineType && !lineTypes.includes(lineType) && (
                    <option value={lineType}>{lineType}</option>
                  )}
                </select>
              </div>

              {/* 7. نوع الوقود */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-slate-700">نوع الوقود</label>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdownEditor(
                          openDropdownEditor === 'fuelTypes' ? null : 'fuelTypes'
                        );
                        setDropdownEditingItem(null);
                        setDropdownNewItemText('');
                      }}
                      className="text-[10px] text-amber-800 hover:text-amber-950 font-black bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 cursor-pointer"
                      title="تعديل وحذف وإضافة في قائمة نوع الوقود"
                    >
                      {openDropdownEditor === 'fuelTypes' ? 'إغلاق القائمة' : '✏️ تعديل/حذف'}
                    </button>
                  )}
                </div>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500"
                >
                  {fuelTypes.map((ft) => (
                    <option key={ft} value={ft}>
                      {ft}
                    </option>
                  ))}
                  {fuelType && !fuelTypes.includes(fuelType) && (
                    <option value={fuelType}>{fuelType}</option>
                  )}
                </select>
              </div>
            </div>

            {/* Inline Dropdown List Editor Drawer (يظهر داخل المفتاح للتعديل والحذف والإضافة فوراً) */}
            {activeInlineList && !isReadOnly && (
              <div className="mt-3 p-3.5 bg-white border-2 border-amber-400 rounded-xl shadow-md space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-black text-amber-950">
                    ⚙️ إدارة وتعديل وحذف عناصر القائمة المنسدلة: ({activeInlineList.title})
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenDropdownEditor(null)}
                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-[11px] font-black cursor-pointer"
                  >
                    إغلاق القائمة ✕
                  </button>
                </div>

                {/* Add New Option */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={dropdownNewItemText}
                    onChange={(e) => setDropdownNewItemText(e.target.value)}
                    placeholder={`إضافة خيار جديد في (${activeInlineList.title})...`}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-amber-400 rounded-lg text-xs font-black text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const clean = dropdownNewItemText.trim();
                      if (!clean) return;
                      if (!activeInlineList.items.includes(clean)) {
                        const updated = [...activeInlineList.items, clean];
                        if (onUpdateDropdownList) {
                          onUpdateDropdownList(activeInlineList.key, updated);
                        }
                      }
                      activeInlineList.setVal(clean);
                      setDropdownNewItemText('');
                    }}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black cursor-pointer"
                  >
                    + إضافة واختيار
                  </button>
                </div>

                {/* Existing Items List with Edit & Delete */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-44 overflow-y-auto">
                  {activeInlineList.items.map((item) => {
                    const isEditing = dropdownEditingItem?.oldVal === item;
                    return (
                      <div
                        key={item}
                        className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1 flex-1">
                            <input
                              type="text"
                              value={dropdownEditingItem.newVal}
                              onChange={(e) =>
                                setDropdownEditingItem({
                                  ...dropdownEditingItem,
                                  newVal: e.target.value,
                                })
                              }
                              className="flex-1 px-2 py-0.5 bg-white border border-amber-500 rounded text-xs font-black"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const clean = dropdownEditingItem.newVal.trim();
                                if (clean && clean !== item) {
                                  const updated = activeInlineList.items.map((x) =>
                                    x === item ? clean : x
                                  );
                                  if (onUpdateDropdownList) {
                                    onUpdateDropdownList(activeInlineList.key, updated);
                                  }
                                  if (activeInlineList.currentVal === item) {
                                    activeInlineList.setVal(clean);
                                  }
                                }
                                setDropdownEditingItem(null);
                              }}
                              className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-black cursor-pointer"
                            >
                              حفظ
                            </button>
                            <button
                              type="button"
                              onClick={() => setDropdownEditingItem(null)}
                              className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-black cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <>
                            <span
                              onClick={() => activeInlineList.setVal(item)}
                              className="font-black text-slate-900 cursor-pointer hover:text-amber-700 flex-1 truncate"
                              title="اضغط لاختيار هذا العنصر"
                            >
                              {item}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setDropdownEditingItem({ oldVal: item, newVal: item })
                                }
                                className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[10px] font-black cursor-pointer"
                              >
                                تعديل
                              </button>
                              <button
                                type="button"
                                disabled={activeInlineList.items.length <= 1}
                                onClick={() => {
                                  if (activeInlineList.items.length <= 1) return;
                                  const updated = activeInlineList.items.filter((x) => x !== item);
                                  if (onUpdateDropdownList) {
                                    onUpdateDropdownList(activeInlineList.key, updated);
                                  }
                                  if (activeInlineList.currentVal === item && updated.length > 0) {
                                    activeInlineList.setVal(updated[0]);
                                  }
                                }}
                                className="px-1.5 py-0.5 bg-red-100 hover:bg-red-200 disabled:opacity-40 text-red-800 rounded text-[10px] font-black cursor-pointer"
                              >
                                حذف
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Contact and Identity */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <h4 className="text-xs font-black text-slate-800 pb-2 mb-3 border-b border-slate-200 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-amber-600" />
              3. بيانات الاتصال والهوية (تدقيق صارم 11 و 14 رقماً)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1 flex items-center justify-between">
                  <span>رقم التليفون المحمول (11 رقماً) *</span>
                  <span className="text-[11px] text-slate-500 font-bold">
                    العدد الحالي: {phone.replace(/\D/g, '').length} / 11
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    maxLength={11}
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPhone(val);
                      if (val.length === 11) {
                        setErrors((prev) => ({ ...prev, phone: '' }));
                      }
                    }}
                    placeholder="01012345678"
                    className={`w-full px-3 py-2 bg-white border rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 num-enlarged text-left tracking-wider ${
                      errors.phone ? 'border-red-500 bg-red-50/50' : 'border-slate-300'
                    }`}
                  />
                </div>
                {errors.phone && (
                  <p className="text-[11px] text-red-600 font-black mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.phone}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1 flex items-center justify-between">
                  <span>الرقم القومي لصاحب المخبز (14 رقماً) *</span>
                  <span className="text-[11px] text-slate-500 font-bold">
                    العدد الحالي: {nationalId.replace(/\D/g, '').length} / 14
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={14}
                    value={nationalId}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setNationalId(val);
                      if (val.length === 14) {
                        setErrors((prev) => ({ ...prev, nationalId: '' }));
                      }
                    }}
                    placeholder="29010101600123"
                    className={`w-full px-3 py-2 bg-white border rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 num-enlarged text-left tracking-wider ${
                      errors.nationalId ? 'border-red-500 bg-red-50/50' : 'border-slate-300'
                    }`}
                  />
                </div>
                {errors.nationalId && (
                  <p className="text-[11px] text-red-600 font-black mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.nationalId}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Quotas and Loaves (الترتيب المعتمد: القيمة التأمينية -> الحصة التأمينية -> الحصة الفعلية -> الأرغفة اليومية -> متوسط نصيب الفرد للمخبز) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <h4 className="text-xs font-black text-slate-800 pb-2 mb-3 border-b border-slate-200 flex items-center gap-1.5">
              <Hash className="w-4 h-4 text-amber-600" />
              4. الحصص والبيانات التموينية والتأمينية
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
              {/* 1. القيمة التأمينية */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  القيمة التأمينية (بالجنيه) *
                </label>
                <input
                  type="number"
                  value={insuranceValue}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    setInsuranceValue(v);
                    if (v >= 0) setErrors((prev) => ({ ...prev, insuranceValue: '' }));
                  }}
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 num-enlarged text-center ${
                    errors.insuranceValue ? 'border-red-500 bg-red-50/50' : 'border-slate-300'
                  }`}
                />
                {errors.insuranceValue && (
                  <p className="text-[11px] text-red-600 font-black mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.insuranceValue}
                  </p>
                )}
              </div>

              {/* 2. الحصة التأمينية */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  الحصة التأمينية (بالشيكارة) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={insuranceQuota}
                  onChange={(e) => {
                    const q = parseFloat(e.target.value) || 0;
                    setInsuranceQuota(q);
                    calculateAllAverages(q);
                    if (q > 0) setErrors((prev) => ({ ...prev, insuranceQuota: '' }));
                  }}
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 num-enlarged text-center ${
                    errors.insuranceQuota ? 'border-red-500 bg-red-50/50' : 'border-slate-300'
                  }`}
                />
                {errors.insuranceQuota && (
                  <p className="text-[11px] text-red-600 font-black mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.insuranceQuota}
                  </p>
                )}
              </div>

              {/* 3. الحصة الفعلية */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  الحصة الفعلية (بالشيكارة) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={actualQuota}
                  onChange={(e) => {
                    const q = parseFloat(e.target.value) || 0;
                    setActualQuota(q);
                    if (q >= 0) setErrors((prev) => ({ ...prev, actualQuota: '' }));
                  }}
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 num-enlarged text-center ${
                    errors.actualQuota ? 'border-red-500 bg-red-50/50' : 'border-slate-300'
                  }`}
                />
                {errors.actualQuota && (
                  <p className="text-[11px] text-red-600 font-black mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.actualQuota}
                  </p>
                )}
              </div>

              {/* 4. الأرغفة اليومية */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  الأرغفة اليومية (الحصة × 1350) *
                </label>
                <input
                  type="number"
                  value={loavesCount}
                  onChange={(e) => {
                    const l = Number(e.target.value) || 0;
                    setLoavesCount(l);
                    if (l > 0) setErrors((prev) => ({ ...prev, loavesCount: '' }));
                  }}
                  className={`w-full px-3 py-2 border-2 rounded-lg text-xs font-black num-enlarged text-center ${
                    errors.loavesCount ? 'border-red-500 bg-red-50 text-red-900' : 'border-amber-400 bg-amber-50 text-amber-950'
                  }`}
                />
                {errors.loavesCount && (
                  <p className="text-[11px] text-red-600 font-black mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.loavesCount}
                  </p>
                )}
              </div>

              {/* 5. متوسط نصيب الفرد للمخبز */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  متوسط نصيب الفرد للمخبز
                </label>
                <input
                  type="text"
                  value={perCapitaAverage}
                  onChange={(e) => setPerCapitaAverage(e.target.value)}
                  className="w-full px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-xs font-black text-amber-950 num-enlarged text-center"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Demographics & Yearly Averages (الترتيب المعتمد: سكان القرية -> مستفيد عام 2023 -> مستفيدين عام 2024 -> مستفيدين عام 2025 -> متوسط عام 2023 -> متوسط عام 2024 -> متوسط عام 2025 -> الفرق التراكمي) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <h4 className="text-xs font-black text-slate-800 pb-2 mb-3 border-b border-slate-200 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-amber-600" />
              5. إحصائيات السكان والمستفيدين والمتوسطات (2023 - 2025)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
              {/* 1. سكان القرية */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  سكان القرية
                </label>
                <input
                  type="number"
                  value={villagePopulation}
                  onChange={(e) => {
                    const pop = parseInt(e.target.value) || 0;
                    setVillagePopulation(pop);
                    calculateAllAverages(insuranceQuota, pop);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 num-enlarged text-center"
                />
              </div>

              {/* 2. مستفيد عام 2023 */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">مستفيد عام 2023</label>
                <input
                  type="number"
                  value={beneficiaries2023}
                  onChange={(e) => {
                    const b = parseInt(e.target.value) || 0;
                    setBeneficiaries2023(b);
                    calculateAllAverages(insuranceQuota, villagePopulation, b);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 num-enlarged text-center"
                />
              </div>

              {/* 3. مستفيدين عام 2024 */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">مستفيدين عام 2024</label>
                <input
                  type="number"
                  value={beneficiaries2024}
                  onChange={(e) => {
                    const b = parseInt(e.target.value) || 0;
                    setBeneficiaries2024(b);
                    calculateAllAverages(insuranceQuota, villagePopulation, beneficiaries2023, b);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 num-enlarged text-center"
                />
              </div>

              {/* 4. مستفيدين عام 2025 */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">مستفيدين عام 2025</label>
                <input
                  type="number"
                  value={beneficiaries2025}
                  onChange={(e) => {
                    const b = parseInt(e.target.value) || 0;
                    setBeneficiaries2025(b);
                    calculateAllAverages(insuranceQuota, villagePopulation, beneficiaries2023, beneficiaries2024, b);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 num-enlarged text-center"
                />
              </div>

              {/* 5. متوسط عام 2023 */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  متوسط عام 2023
                </label>
                <input
                  type="text"
                  value={avg2023}
                  onChange={(e) => setAvg2023(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 num-enlarged text-center"
                />
              </div>

              {/* 6. متوسط عام 2024 */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  متوسط عام 2024
                </label>
                <input
                  type="text"
                  value={avg2024}
                  onChange={(e) => setAvg2024(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 num-enlarged text-center"
                />
              </div>

              {/* 7. متوسط عام 2025 */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  متوسط عام 2025
                </label>
                <input
                  type="text"
                  value={avg2025}
                  onChange={(e) => setAvg2025(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 num-enlarged text-center"
                />
              </div>

              {/* 8. الفرق التراكمي */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  الفرق التراكمي
                </label>
                <input
                  type="text"
                  value={avgDiff}
                  onChange={(e) => setAvgDiff(e.target.value)}
                  className="w-full px-3 py-2 bg-amber-100/70 border-2 border-amber-500 rounded-lg text-xs font-black text-amber-900 num-enlarged text-center"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Licenses, Contracts, Expiration Dates */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <h4 className="text-xs font-black text-slate-800 pb-2 mb-3 border-b border-slate-200 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-600" />
              6. التراخيص والعقود وتواريخ السريان (تنسيق التواريخ يوم / شهر / سنة DD/MM/YYYY)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  تاريخ السجل التجاري (يوم/شهر/سنة) *
                </label>
                <input
                  type="date"
                  lang="ar-EG"
                  value={commercialRegDate}
                  onChange={(e) => {
                    setCommercialRegDate(e.target.value);
                    if (e.target.value) setErrors((prev) => ({ ...prev, commercialRegDate: '' }));
                  }}
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 num-enlarged ${
                    errors.commercialRegDate ? 'border-red-500 bg-red-50/50' : 'border-slate-300'
                  }`}
                />
                {commercialRegDate && (
                  <span className="block text-[10px] font-black text-amber-900 bg-amber-100/70 border border-amber-300 rounded px-1.5 py-0.5 mt-1 text-center font-mono">
                    📅 التاريخ المحدد: {formatDateDDMMYYYY(commercialRegDate)}
                  </span>
                )}
                {errors.commercialRegDate && (
                  <p className="text-[11px] text-red-600 font-black mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.commercialRegDate}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  تاريخ رخصة المخبز (يوم/شهر/سنة) *
                </label>
                <input
                  type="date"
                  lang="ar-EG"
                  value={bakeryLicenseDate}
                  onChange={(e) => {
                    setBakeryLicenseDate(e.target.value);
                    if (e.target.value) setErrors((prev) => ({ ...prev, bakeryLicenseDate: '' }));
                  }}
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 num-enlarged ${
                    errors.bakeryLicenseDate ? 'border-red-500 bg-red-50/50' : 'border-slate-300'
                  }`}
                />
                {bakeryLicenseDate && (
                  <span className="block text-[10px] font-black text-amber-900 bg-amber-100/70 border border-amber-300 rounded px-1.5 py-0.5 mt-1 text-center font-mono">
                    📅 التاريخ المحدد: {formatDateDDMMYYYY(bakeryLicenseDate)}
                  </span>
                )}
                {errors.bakeryLicenseDate && (
                  <p className="text-[11px] text-red-600 font-black mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.bakeryLicenseDate}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  تاريخ عقد الإيجار (يوم/شهر/سنة) *
                </label>
                <input
                  type="date"
                  lang="ar-EG"
                  value={leaseAgreementDate}
                  onChange={(e) => {
                    setLeaseAgreementDate(e.target.value);
                    if (e.target.value) setErrors((prev) => ({ ...prev, leaseAgreementDate: '' }));
                  }}
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 num-enlarged ${
                    errors.leaseAgreementDate ? 'border-red-500 bg-red-50/50' : 'border-slate-300'
                  }`}
                />
                {leaseAgreementDate && (
                  <span className="block text-[10px] font-black text-amber-900 bg-amber-100/70 border border-amber-300 rounded px-1.5 py-0.5 mt-1 text-center font-mono">
                    📅 التاريخ المحدد: {formatDateDDMMYYYY(leaseAgreementDate)}
                  </span>
                )}
                {errors.leaseAgreementDate && (
                  <p className="text-[11px] text-red-600 font-black mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.leaseAgreementDate}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  تاريخ البطاقة الضريبية (يوم/شهر/سنة) *
                </label>
                <input
                  type="date"
                  lang="ar-EG"
                  value={taxCardDate}
                  onChange={(e) => {
                    setTaxCardDate(e.target.value);
                    if (e.target.value) setErrors((prev) => ({ ...prev, taxCardDate: '' }));
                  }}
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 num-enlarged ${
                    errors.taxCardDate ? 'border-red-500 bg-red-50/50' : 'border-slate-300'
                  }`}
                />
                {taxCardDate && (
                  <span className="block text-[10px] font-black text-amber-900 bg-amber-100/70 border border-amber-300 rounded px-1.5 py-0.5 mt-1 text-center font-mono">
                    📅 التاريخ المحدد: {formatDateDDMMYYYY(taxCardDate)}
                  </span>
                )}
                {errors.taxCardDate && (
                  <p className="text-[11px] text-red-600 font-black mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.taxCardDate}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 7: Activity Log (سجل النشاط والتعديلات التاريخية لزيادة الأمان والرقابة) */}
          <div className="border border-slate-300 rounded-xl p-4 bg-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-black text-amber-300">
                  7. سجل النشاط والتعديلات الأخيرة على المخبز (Activity Log)
                </h4>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-mono font-bold">
                {bakeryToEdit?.activityLog?.length || 0} عملية مسجلة
              </span>
            </div>

            {(!bakeryToEdit?.activityLog || bakeryToEdit.activityLog.length === 0) ? (
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-[11px] text-slate-400 text-center font-bold">
                لا توجد تعديلات سابقة مسجلة على هذا المخبز (سيتم تسجيل أول عملية تلقائياً فور الحفظ).
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                {bakeryToEdit.activityLog.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 bg-slate-950/90 border border-slate-800 hover:border-amber-500/50 rounded-xl text-xs space-y-1 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-black text-slate-100">{log.userFullName}</span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30 font-bold">
                          {log.userRole}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{log.timestamp}</span>
                      </div>
                    </div>
                    <div className="text-[11px] font-black text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{log.action}</span>
                    </div>
                    {log.details && (
                      <p className="text-[10px] text-slate-300 font-bold bg-slate-900/60 p-1.5 rounded border border-slate-800/80 leading-relaxed">
                        {log.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 8: Notes */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">
              ملاحظات إضافية وقيد التفتيش
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات حول المخبز أو التراخيص أو محاضر الضبط"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 text-right"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="px-5 py-2.5 border border-slate-300 rounded-lg text-xs font-black text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              إلغاء النافذة (ESC)
            </button>

            {isReadOnly ? (
              <span className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-slate-200 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold">
                <span>👁️</span>
                <span>وضع المشاهدة فقط (غير مصرح بالتعديل أو الحفظ)</span>
              </span>
            ) : (
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-white rounded-lg text-xs font-black shadow-lg shadow-amber-800/30 transition cursor-pointer"
              >
                <Save className="w-4 h-4 text-amber-200" />
                {bakeryToEdit ? 'حفظ وتحديث بيانات المخبز' : 'تسجيل المخبز الجديد'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
