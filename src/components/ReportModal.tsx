import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Bakery, DebtRecord, VillageHierarchy, ColumnTitles, SystemConfig, AppUser } from '../types';
import {
  sanitizeClonedDocumentForPdf,
  sanitizeLiveStylesheets,
  printHtmlElementA4,
} from '../utils/pdfHelper';
import { formatDateDDMMYYYY } from '../utils/auditHelper';
import {
  ALL_PERMISSIONS_LIST,
  getDefaultPermissionsForRole,
  getRoleNameArabic,
} from '../permissions';
import {
  X,
  FileSpreadsheet,
  Printer,
  Download,
  SlidersHorizontal,
  DollarSign,
  Layers,
  TrendingUp,
  Users,
} from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  bakeries: Bakery[];
  debts: DebtRecord[];
  villages: VillageHierarchy[];
  columnTitles: ColumnTitles;
  systemConfig: SystemConfig;
  currentUser?: AppUser | null;
  users?: AppUser[];
  initialReportType?: 'bakeries' | 'debts' | 'bakery-debts' | 'users';
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  bakeries,
  debts,
  villages,
  columnTitles,
  systemConfig,
  currentUser,
  users = [],
  initialReportType = 'bakeries',
}) => {
  // Report Mode: 'bakeries' | 'debts' | 'bakery-debts' | 'users'
  const [reportType, setReportType] = useState<'bakeries' | 'debts' | 'bakery-debts' | 'users'>(
    initialReportType
  );
  const [includeUsersAppendix, setIncludeUsersAppendix] = useState<boolean>(false);
  const [selectedVillage, setSelectedVillage] = useState('ALL');
  const [selectedUnit, setSelectedUnit] = useState('ALL');
  const [selectedActivity, setSelectedActivity] = useState('ALL');
  const [debtFilterStatus, setDebtFilterStatus] = useState<'ALL' | 'OVER_20K' | 'UNPAID' | 'PAID'>('ALL');
  const [bakeryDebtFilter, setBakeryDebtFilter] = useState<'ALL' | 'HAS_DEBT' | 'OVER_20K' | 'PAID'>('ALL');
  const [fontSizeMode, setFontSizeMode] = useState<'compact' | 'standard' | 'large'>('standard');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 100%, 85%, 75%
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen && initialReportType) {
      setReportType(initialReportType);
    }
  }, [isOpen, initialReportType]);

  const fontSizeClass =
    fontSizeMode === 'large'
      ? 'report-font-large text-[9.5pt] print:text-[9.5pt]'
      : fontSizeMode === 'compact'
      ? 'report-font-compact text-[7.5pt] print:text-[7.5pt]'
      : 'report-font-standard text-[8.5pt] print:text-[8.5pt]';

  // Manage print isolation class on body and Capture-Phase Escape key listener (0ms response)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    if (isOpen) {
      document.body.classList.add('has-print-modal');
      window.addEventListener('keydown', handleKeyDown, true);
    } else {
      document.body.classList.remove('has-print-modal');
    }
    return () => {
      document.body.classList.remove('has-print-modal');
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  // Available Local units for selected village
  const currentUnits = useMemo(() => {
    if (selectedVillage === 'ALL') {
      const all: string[] = [];
      villages.forEach((v) => {
        v.localUnits.forEach((u) => {
          if (!all.includes(u)) all.push(u);
        });
      });
      return all;
    }
    return villages.find((v) => v.village === selectedVillage)?.localUnits || [];
  }, [selectedVillage, villages]);

  // Column Selector State for Bakeries Report - All 32 columns enabled by default in exact required order
  const [activeColumns, setActiveColumns] = useState<Record<string, boolean>>({
    index: true,
    bakeryOwnerName: true,
    machineNumber: true,
    village: true,
    localUnit: true,
    remainingDebt: true,
    // الحصص والبيانات التموينية
    insuranceValue: true,
    insuranceQuota: true,
    actualQuota: true,
    loavesCount: true,
    perCapitaAverage: true,
    // إحصائيات السكان
    villagePopulation: true,
    beneficiaries2023: true,
    beneficiaries2024: true,
    beneficiaries2025: true,
    avg2023: true,
    avg2024: true,
    avg2025: true,
    avgDiff: true,
    // التصنيف والتشغيل
    activityStatus: true,
    bakeryCategory: true,
    breadType: true,
    flourBagPrice: true,
    breadTypeCount: true,
    lineType: true,
    fuelType: true,
    // الاتصال والتراخيص
    phone: true,
    nationalId: true,
    commercialRegDate: true,
    bakeryLicenseDate: true,
    leaseAgreementDate: true,
    taxCardDate: true,
  });

  // Calculate bakery debt mapping
  const bakeryDebtMap = useMemo(() => {
    const map: Record<string, number> = {};
    debts.forEach((d) => {
      map[d.bakeryId] = (map[d.bakeryId] || 0) + (d.netRemainingDebt || 0);
    });
    return map;
  }, [debts]);

  // Dynamic Title Construction
  const dynamicReportTitle = useMemo(() => {
    if (reportType === 'users') {
      return 'كشف حسابات المستخدمين والأدوار الوظيفية والصلاحيات (الاسم بالكامل • اليوزر • الباسورد)';
    }

    const locationSuffix =
      selectedVillage === 'ALL'
        ? 'لكافة قرى ووحدات مركز المحلة الكبرى'
        : selectedUnit !== 'ALL'
        ? `لقرية ${selectedVillage} - وحدة ${selectedUnit}`
        : `لقرية ${selectedVillage} ووحداتها المحلية`;

    if (reportType === 'debts') {
      if (debtFilterStatus === 'OVER_20K') {
        return `كشف حساب المديونيات الكبرى التي تتجاوز 20,000 ج.م والمطالبة بدفعات أسبوعية ${locationSuffix}`;
      }
      return `كشف حساب تفصيلي لمديونيات ومخالفات المخابز البلدية ${locationSuffix}`;
    }

    if (reportType === 'bakery-debts') {
      if (bakeryDebtFilter === 'OVER_20K') {
        return `كشف حصر المديونيات الكبرى للمخابز تتجاوز 20,000 ج.م ونسب السداد والمطالبة ${locationSuffix}`;
      }
      if (bakeryDebtFilter === 'HAS_DEBT') {
        return `كشف حصر مديونيات المخابز البلدية المستحقة حالياً وتفاصيل السداد ونسب التحصيل ${locationSuffix}`;
      }
      if (bakeryDebtFilter === 'PAID') {
        return `كشف المخابز البلدية خالصة السداد بالكامل ونسب التحصيل 100% ${locationSuffix}`;
      }
      return `كشف حصر المديونيات الحالية لكل مخبز بلدي وتفاصيل المبالغ المستحقة ونسب السداد ${locationSuffix}`;
    }

    return `كشف حصر وتشغيل المخابز البلدية والحصص التموينية ${locationSuffix}`;
  }, [reportType, selectedVillage, selectedUnit, debtFilterStatus, bakeryDebtFilter]);

  // Filtered bakeries for bakeries report
  const filteredBakeries = useMemo(() => {
    return bakeries.filter((b) => {
      if (selectedVillage !== 'ALL' && b.village !== selectedVillage) return false;
      if (selectedUnit !== 'ALL' && b.localUnit !== selectedUnit) return false;
      if (selectedActivity !== 'ALL' && b.activityStatus !== selectedActivity) return false;
      return true;
    });
  }, [bakeries, selectedVillage, selectedUnit, selectedActivity]);

  // Filtered debts for detailed debt report
  const filteredDebts = useMemo(() => {
    return debts.filter((d) => {
      if (selectedVillage !== 'ALL' && d.village !== selectedVillage) return false;
      if (selectedUnit !== 'ALL' && d.localUnit !== selectedUnit) return false;

      const bakeryTotalDebt = bakeryDebtMap[d.bakeryId] || 0;
      if (debtFilterStatus === 'OVER_20K') {
        if (bakeryTotalDebt <= 20000 && d.netRemainingDebt <= 20000) return false;
      } else if (debtFilterStatus === 'UNPAID') {
        if (d.netRemainingDebt <= 0) return false;
      } else if (debtFilterStatus === 'PAID') {
        if (d.netRemainingDebt > 0) return false;
      }
      return true;
    });
  }, [debts, selectedVillage, selectedUnit, debtFilterStatus, bakeryDebtMap]);

  // Summary totals for bakeries report
  const reportTotals = useMemo(() => {
    let totalInsuranceValue = 0;
    let totalInsurance = 0;
    let totalActual = 0;
    let totalLoaves = 0;
    let totalDebt = 0;
    filteredBakeries.forEach((b) => {
      totalInsuranceValue += b.insuranceValue || 0;
      totalInsurance += b.insuranceQuota || 0;
      totalActual += b.actualQuota || 0;
      totalLoaves += b.loavesCount || 0;
      totalDebt += bakeryDebtMap[b.id] || 0;
    });
    return { totalInsuranceValue, totalInsurance, totalActual, totalLoaves, totalDebt };
  }, [filteredBakeries, bakeryDebtMap]);

  // Summary totals for detailed debts report
  const debtReportTotals = useMemo(() => {
    let sumTotalViolations = 0;
    let sumPaidViolations = 0;
    let sumAdded = 0;
    let sumPaidAdded = 0;
    let sumDisposal = 0;
    let sumPaidDisposal = 0;
    let sumNetRemaining = 0;
    let over20kCount = 0;

    const seenBakeries = new Set<string>();
    filteredDebts.forEach((d) => {
      sumTotalViolations += d.totalViolations || 0;
      sumPaidViolations += d.paidViolationAmount || 0;
      sumAdded += d.addedAmount || 0;
      sumPaidAdded += d.paidAddedAmount || 0;
      sumDisposal += d.disposalValue || 0;
      sumPaidDisposal += d.paidDisposalAmount || 0;
      sumNetRemaining += d.netRemainingDebt || 0;

      if (!seenBakeries.has(d.bakeryId)) {
        seenBakeries.add(d.bakeryId);
        if ((bakeryDebtMap[d.bakeryId] || 0) > 20000) {
          over20kCount++;
        }
      }
    });

    return {
      sumTotalViolations,
      sumPaidViolations,
      sumAdded,
      sumPaidAdded,
      sumDisposal,
      sumPaidDisposal,
      sumNetRemaining,
      over20kCount,
    };
  }, [filteredDebts, bakeryDebtMap]);

  // Aggregated per-bakery debts & repayment calculations
  const bakeryDebtSummaries = useMemo(() => {
    return bakeries.map((b) => {
      const bDebts = debts.filter((d) => d.bakeryId === b.id);
      let totalViolations = 0;
      let paidViolations = 0;
      let totalAdded = 0;
      let paidAdded = 0;
      let totalDisposal = 0;
      let paidDisposal = 0;
      let sumNetRemaining = 0;

      bDebts.forEach((d) => {
        totalViolations += d.totalViolations || 0;
        paidViolations += d.paidViolationAmount || 0;
        totalAdded += d.addedAmount || 0;
        paidAdded += d.paidAddedAmount || 0;
        totalDisposal += d.disposalValue || 0;
        paidDisposal += d.paidDisposalAmount || 0;
        sumNetRemaining += d.netRemainingDebt || 0;
      });

      const totalDue = totalViolations + totalAdded + totalDisposal;
      const totalPaid = paidViolations + paidAdded + paidDisposal;
      const netRemaining = Math.max(0, totalDue - totalPaid > 0 ? totalDue - totalPaid : sumNetRemaining);

      const repaymentRate =
        totalDue > 0
          ? Math.min(100, Math.max(0, (totalPaid / totalDue) * 100))
          : netRemaining <= 0
          ? 100
          : 0;

      const isOver20k = netRemaining > 20000;

      return {
        bakery: b,
        recordCount: bDebts.length,
        totalViolations,
        paidViolations,
        remainingViolations: Math.max(0, totalViolations - paidViolations),
        totalAdded,
        paidAdded,
        remainingAdded: Math.max(0, totalAdded - paidAdded),
        totalDisposal,
        paidDisposal,
        remainingDisposal: Math.max(0, totalDisposal - paidDisposal),
        totalDue,
        totalPaid,
        netRemaining,
        repaymentRate,
        isOver20k,
      };
    });
  }, [bakeries, debts]);

  // Filtered per-bakery debts
  const filteredBakeryDebts = useMemo(() => {
    return bakeryDebtSummaries.filter((item) => {
      const b = item.bakery;
      if (selectedVillage !== 'ALL' && b.village !== selectedVillage) return false;
      if (selectedUnit !== 'ALL' && b.localUnit !== selectedUnit) return false;

      if (bakeryDebtFilter === 'HAS_DEBT') {
        if (item.netRemaining <= 0) return false;
      } else if (bakeryDebtFilter === 'OVER_20K') {
        if (!item.isOver20k) return false;
      } else if (bakeryDebtFilter === 'PAID') {
        if (item.netRemaining > 0) return false;
      }
      return true;
    });
  }, [bakeryDebtSummaries, selectedVillage, selectedUnit, bakeryDebtFilter]);

  // Summary totals for per-bakery debts report
  const bakeryDebtsTotals = useMemo(() => {
    let sumRecords = 0;
    let sumViolations = 0;
    let sumPaidViolations = 0;
    let sumAdded = 0;
    let sumPaidAdded = 0;
    let sumDisposal = 0;
    let sumPaidDisposal = 0;
    let sumTotalDue = 0;
    let sumTotalPaid = 0;
    let sumNetRemaining = 0;
    let over20kCount = 0;
    let indebtedCount = 0;
    let fullySettledCount = 0;

    filteredBakeryDebts.forEach((item) => {
      sumRecords += item.recordCount;
      sumViolations += item.totalViolations;
      sumPaidViolations += item.paidViolations;
      sumAdded += item.totalAdded;
      sumPaidAdded += item.paidAdded;
      sumDisposal += item.totalDisposal;
      sumPaidDisposal += item.paidDisposal;
      sumTotalDue += item.totalDue;
      sumTotalPaid += item.totalPaid;
      sumNetRemaining += item.netRemaining;
      if (item.isOver20k) over20kCount++;
      if (item.netRemaining > 0) indebtedCount++;
      else fullySettledCount++;
    });

    const overallRepaymentRate =
      sumTotalDue > 0 ? (sumTotalPaid / sumTotalDue) * 100 : 100;

    return {
      sumRecords,
      sumViolations,
      sumPaidViolations,
      sumAdded,
      sumPaidAdded,
      sumDisposal,
      sumPaidDisposal,
      sumTotalDue,
      sumTotalPaid,
      sumNetRemaining,
      over20kCount,
      indebtedCount,
      fullySettledCount,
      overallRepaymentRate,
    };
  }, [filteredBakeryDebts]);

  if (!isOpen) return null;

  const toggleColumn = (key: string) => {
    setActiveColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAllColumns = () => {
    const allTrue: Record<string, boolean> = {};
    Object.keys(activeColumns).forEach((k) => (allTrue[k] = true));
    setActiveColumns(allTrue);
  };

  const deselectAllColumns = () => {
    const allFalse: Record<string, boolean> = {};
    Object.keys(activeColumns).forEach((k) => (allFalse[k] = false));
    allFalse.index = true;
    allFalse.bakeryOwnerName = true;
    setActiveColumns(allFalse);
  };

  const resetDefaultColumns = () => {
    const allTrue: Record<string, boolean> = {};
    Object.keys(activeColumns).forEach((k) => (allTrue[k] = true));
    setActiveColumns(allTrue);
  };

  // Instant HTML2PDF Download in Landscape A4 with performance protection
  const handleDownloadPdf = () => {
    if (!printAreaRef.current) return;
    setIsGeneratingPdf(true);

    sanitizeLiveStylesheets();

    const element = printAreaRef.current;
    const opt = {
      margin: [4, 4, 4, 4],
      filename: `${dynamicReportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.96 },
      html2canvas: {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1440,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc: Document) => {
          sanitizeClonedDocumentForPdf(clonedDoc);
        },
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    };

    const win = window as unknown as {
      html2pdf?: () => {
        from: (el: HTMLElement) => { set: (o: typeof opt) => { save: () => Promise<void> } };
      };
    };
    if (typeof win.html2pdf === 'function') {
      const pdfTask = win
        .html2pdf()
        .from(element)
        .set(opt)
        .save();

      const timeoutTask = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('PDF generation timed out')), 8000)
      );

      Promise.race([pdfTask, timeoutTask])
        .then(() => setIsGeneratingPdf(false))
        .catch((err: Error) => {
          console.warn('PDF generation encountered issue, triggering direct fast print:', err);
          setIsGeneratingPdf(false);
          handlePrint();
        });
    } else {
      setIsGeneratingPdf(false);
      handlePrint();
    }
  };

  // Blazing Fast Isolated Print Engine (Guaranteed Populated A4 Landscape)
  const handlePrint = () => {
    const fontClass =
      fontSizeMode === 'large'
        ? 'report-font-large'
        : fontSizeMode === 'compact'
        ? 'report-font-compact'
        : 'report-font-standard';

    printHtmlElementA4(printAreaRef.current, dynamicReportTitle, fontClass);
  };

  // Export Report to CSV with UTF-8 BOM
  const handleExportCSV = () => {
    if (reportType === 'users') {
      const headers = [
        'م',
        'الاسم بالكامل (Full Name)',
        'اسم المستخدم (اليوزر - Username)',
        'كلمة المرور (الباسورد - Password)',
        'الدور الوظيفي',
        'المسمى الوظيفي',
        'القسم / الإدارة',
        'عدد الصلاحيات الممنوحة',
      ];
      const rows = users.map((u, idx) => {
        const perms =
          u.role === 'admin'
            ? ALL_PERMISSIONS_LIST.map((p) => p.id)
            : u.customPermissions && u.customPermissions.length > 0
            ? u.customPermissions
            : getDefaultPermissionsForRole(u.role);
        return [
          idx + 1,
          `"${(u.fullName || '').replace(/"/g, '""')}"`,
          `"${(u.username || '').replace(/"/g, '""')}"`,
          `"${(u.password || 'admin').replace(/"/g, '""')}"`,
          `"${getRoleNameArabic(u.role, systemConfig)}"`,
          `"${u.jobTitle || 'مسئول تمويني'}"`,
          `"${u.department || 'إدارة تموين مركز المحلة الكبرى'}"`,
          `${perms.length} من ${ALL_PERMISSIONS_LIST.length}`,
        ].join(',');
      });
      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `كشف_المستخدمين_والصلاحيات_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (reportType === 'debts') {
      const headers = [
        'م',
        'اسم صاحب المخبز',
        'رقم الماكينة',
        'القرية',
        'الوحدة المحلية',
        'تاريخ المحضر',
        'الجهة المحررة',
        'نوع المخالفة',
        'إجمالي المخالفات (ج.م)',
        'تاريخ سداد المخالفة',
        'رقم إيصال المخالفة',
        'نوع سداد المخالفة',
        'المسدد من المخالفات (ج.م)',
        'المتبقي من المخالفات (ج.م)',
        'المضاف (ج.م)',
        'تاريخ سداد المضاف',
        'رقم إيصال المضاف',
        'نوع سداد المضاف',
        'المسدد من المضاف (ج.م)',
        'المتبقي من المضاف (ج.م)',
        'قيمة التصرف (ج.م)',
        'تاريخ سداد التصرف',
        'رقم إيصال التصرف',
        'نوع سداد التصرف',
        'المسدد من التصرف (ج.م)',
        'المتبقي من التصرف (ج.م)',
        'صافي المديونية المتبقية (ج.م)',
        'حالة المديونية والتنبيه الأسبوعي',
      ];

      const rows = filteredDebts.map((d, idx) => {
        const totalBakeryDebt = bakeryDebtMap[d.bakeryId] || 0;
        const isOver20k = totalBakeryDebt > 20000;
        const status = isOver20k
          ? 'تتجاوز 20 ألف - يلزم التنبيه أسبوعياً بجدول دفعات'
          : d.netRemainingDebt > 0
          ? 'مستحقة السداد'
          : 'خالصة السداد';

        return [
          idx + 1,
          `"${d.bakeryOwnerName || ''}"`,
          `"${d.machineNumber || ''}"`,
          `"${d.village || ''}"`,
          `"${d.localUnit || ''}"`,
          `"${d.violationDate || ''}"`,
          `"${d.issuingEntity || ''}"`,
          `"${d.violationType || ''}"`,
          d.totalViolations || 0,
          `"${d.violationPaymentDate || ''}"`,
          `"${d.violationReceiptNumber || ''}"`,
          `"${d.violationPaymentMethod || ''}"`,
          d.paidViolationAmount || 0,
          d.remainingViolations || 0,
          d.addedAmount || 0,
          `"${d.addedPaymentDate || ''}"`,
          `"${d.addedReceiptNumber || ''}"`,
          `"${d.addedPaymentMethod || ''}"`,
          d.paidAddedAmount || 0,
          d.remainingAdded || 0,
          d.disposalValue || 0,
          `"${d.disposalPaymentDate || ''}"`,
          `"${d.disposalReceiptNumber || ''}"`,
          `"${d.disposalPaymentMethod || ''}"`,
          d.paidDisposalAmount || 0,
          d.remainingDisposal || 0,
          d.netRemainingDebt || 0,
          `"${status}"`,
        ].join(',');
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `كشف_حساب_المديونيات_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (reportType === 'bakery-debts') {
      const headers = [
        'م',
        'اسم صاحب المخبز',
        'رقم الماكينة',
        'القرية',
        'الوحدة المحلية',
        'عدد المحاضر والقيود',
        'إجمالي المديونية المستحقة (ج.م)',
        'المخالفات المستحقة (ج.م)',
        'المسدد من المخالفات (ج.م)',
        'المتبقي من المخالفات (ج.م)',
        'المضاف المستحق (ج.م)',
        'المسدد من المضاف (ج.م)',
        'المتبقي من المضاف (ج.م)',
        'قيمة التصرف (ج.م)',
        'المسدد من التصرف (ج.م)',
        'المتبقي من التصرف (ج.م)',
        'إجمالي المبالغ المسددة (ج.م)',
        'صافي المديونية المتبقية (ج.م)',
        'نسبة السداد %',
        'الموقف القانوني والتنبيه',
      ];

      const rows = filteredBakeryDebts.map((item, idx) => {
        const b = item.bakery;
        const status = item.isOver20k
          ? 'تتجاوز 20 ألف - يلزم التنبيه أسبوعياً بجدول دفعات'
          : item.netRemaining <= 0
          ? 'خالص السداد 100%'
          : item.totalPaid > 0
          ? `سداد جزئي (${item.repaymentRate.toFixed(1)}%)`
          : 'لم يسدد (0%)';

        return [
          idx + 1,
          `"${b.bakeryOwnerName || ''}"`,
          `"${b.machineNumber || ''}"`,
          `"${b.village || ''}"`,
          `"${b.localUnit || ''}"`,
          item.recordCount,
          item.totalDue,
          item.totalViolations,
          item.paidViolations,
          item.remainingViolations,
          item.totalAdded,
          item.paidAdded,
          item.remainingAdded,
          item.totalDisposal,
          item.paidDisposal,
          item.remainingDisposal,
          item.totalPaid,
          item.netRemaining,
          `"${item.repaymentRate.toFixed(1)}%"`,
          `"${status}"`,
        ].join(',');
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `كشف_مديونيات_ونسب_سداد_المخابز_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    // Bakeries CSV (in exact requested order)
    const headers: string[] = [];
    if (activeColumns.index) headers.push(columnTitles.index);
    if (activeColumns.bakeryOwnerName) headers.push(columnTitles.bakeryOwnerName);
    if (activeColumns.machineNumber) headers.push(columnTitles.machineNumber);
    if (activeColumns.village) headers.push(columnTitles.village);
    if (activeColumns.localUnit) headers.push(columnTitles.localUnit);
    if (activeColumns.remainingDebt) headers.push(columnTitles.remainingDebt);
    // الحصص والبيانات التموينية
    if (activeColumns.insuranceValue) headers.push(columnTitles.insuranceValue);
    if (activeColumns.insuranceQuota) headers.push(columnTitles.insuranceQuota);
    if (activeColumns.actualQuota) headers.push(columnTitles.actualQuota);
    if (activeColumns.loavesCount) headers.push(columnTitles.loavesCount);
    if (activeColumns.perCapitaAverage) headers.push(columnTitles.perCapitaAverage);
    // إحصائيات السكان
    if (activeColumns.villagePopulation) headers.push(columnTitles.villagePopulation);
    if (activeColumns.beneficiaries2023) headers.push(columnTitles.beneficiaries2023);
    if (activeColumns.beneficiaries2024) headers.push(columnTitles.beneficiaries2024);
    if (activeColumns.beneficiaries2025) headers.push(columnTitles.beneficiaries2025);
    if (activeColumns.avg2023) headers.push(columnTitles.avg2023);
    if (activeColumns.avg2024) headers.push(columnTitles.avg2024);
    if (activeColumns.avg2025) headers.push(columnTitles.avg2025);
    if (activeColumns.avgDiff) headers.push(columnTitles.avgDiff);
    // التصنيف والتشغيل
    if (activeColumns.activityStatus) headers.push(columnTitles.activityStatus);
    if (activeColumns.bakeryCategory) headers.push(columnTitles.bakeryCategory || 'نوع المخابز');
    if (activeColumns.breadType) headers.push(columnTitles.breadType);
    if (activeColumns.flourBagPrice) headers.push(columnTitles.flourBagPrice || 'سعر الشيكارة');
    if (activeColumns.breadTypeCount) headers.push(columnTitles.breadTypeCount);
    if (activeColumns.lineType) headers.push(columnTitles.lineType);
    if (activeColumns.fuelType) headers.push(columnTitles.fuelType);
    // الاتصال والتراخيص
    if (activeColumns.phone) headers.push(columnTitles.phone);
    if (activeColumns.nationalId) headers.push(columnTitles.nationalId);
    if (activeColumns.commercialRegDate) headers.push(columnTitles.commercialRegDate);
    if (activeColumns.bakeryLicenseDate) headers.push(columnTitles.bakeryLicenseDate);
    if (activeColumns.leaseAgreementDate) headers.push(columnTitles.leaseAgreementDate);
    if (activeColumns.taxCardDate) headers.push(columnTitles.taxCardDate);

    const rows = filteredBakeries.map((b, idx) => {
      const row: (string | number)[] = [];
      const debtVal = bakeryDebtMap[b.id] || 0;
      if (activeColumns.index) row.push(idx + 1);
      if (activeColumns.bakeryOwnerName) row.push(`"${b.bakeryOwnerName || ''}"`);
      if (activeColumns.machineNumber) row.push(`"${b.machineNumber || ''}"`);
      if (activeColumns.village) row.push(`"${b.village || ''}"`);
      if (activeColumns.localUnit) row.push(`"${b.localUnit || ''}"`);
      if (activeColumns.remainingDebt) row.push(debtVal);
      // الحصص والبيانات التموينية
      if (activeColumns.insuranceValue) row.push(b.insuranceValue || 0);
      if (activeColumns.insuranceQuota) row.push(b.insuranceQuota || 0);
      if (activeColumns.actualQuota) row.push(b.actualQuota || 0);
      if (activeColumns.loavesCount) row.push(b.loavesCount || 0);
      if (activeColumns.perCapitaAverage) row.push(b.perCapitaAverage || 0);
      // إحصائيات السكان
      if (activeColumns.villagePopulation) row.push(b.villagePopulation || 0);
      if (activeColumns.beneficiaries2023) row.push(b.beneficiaries2023 || 0);
      if (activeColumns.beneficiaries2024) row.push(b.beneficiaries2024 || 0);
      if (activeColumns.beneficiaries2025) row.push(b.beneficiaries2025 || 0);
      if (activeColumns.avg2023) row.push(b.avg2023 || 0);
      if (activeColumns.avg2024) row.push(b.avg2024 || 0);
      if (activeColumns.avg2025) row.push(b.avg2025 || 0);
      if (activeColumns.avgDiff) row.push(b.avgDiff || 0);
      // التصنيف والتشغيل
      if (activeColumns.activityStatus) row.push(`"${b.activityStatus || ''}"`);
      if (activeColumns.bakeryCategory) row.push(`"${b.bakeryCategory || 'مخبز بلدي مدعم'}"`);
      if (activeColumns.breadType) row.push(`"${b.breadType || ''}"`);
      if (activeColumns.flourBagPrice) row.push(b.flourBagPrice ?? 950);
      if (activeColumns.breadTypeCount) row.push(b.breadTypeCount || 0);
      if (activeColumns.lineType) row.push(`"${b.lineType || ''}"`);
      if (activeColumns.fuelType) row.push(`"${b.fuelType || ''}"`);
      // الاتصال والتراخيص
      if (activeColumns.phone) row.push(`"\t${b.phone || ''}"`);
      if (activeColumns.nationalId) row.push(`"\t${b.nationalId || ''}"`);
      if (activeColumns.commercialRegDate) row.push(`"${b.commercialRegDate || ''}"`);
      if (activeColumns.bakeryLicenseDate) row.push(`"${b.bakeryLicenseDate || ''}"`);
      if (activeColumns.leaseAgreementDate) row.push(`"${b.leaseAgreementDate || ''}"`);
      if (activeColumns.taxCardDate) row.push(`"${b.taxCardDate || ''}"`);
      return row.join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${dynamicReportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Grouped column spans for bakeries table
  const basicInfoSpan =
    (activeColumns.index ? 1 : 0) +
    (activeColumns.bakeryOwnerName ? 1 : 0) +
    (activeColumns.machineNumber ? 1 : 0) +
    (activeColumns.village ? 1 : 0) +
    (activeColumns.localUnit ? 1 : 0);

  const debtsSpan = activeColumns.remainingDebt ? 1 : 0;

  const quotasSpan =
    (activeColumns.insuranceValue ? 1 : 0) +
    (activeColumns.insuranceQuota ? 1 : 0) +
    (activeColumns.actualQuota ? 1 : 0) +
    (activeColumns.loavesCount ? 1 : 0) +
    (activeColumns.perCapitaAverage ? 1 : 0);

  const populationSpan =
    (activeColumns.villagePopulation ? 1 : 0) +
    (activeColumns.beneficiaries2023 ? 1 : 0) +
    (activeColumns.beneficiaries2024 ? 1 : 0) +
    (activeColumns.beneficiaries2025 ? 1 : 0) +
    (activeColumns.avg2023 ? 1 : 0) +
    (activeColumns.avg2024 ? 1 : 0) +
    (activeColumns.avg2025 ? 1 : 0) +
    (activeColumns.avgDiff ? 1 : 0);

  const specsSpan =
    (activeColumns.activityStatus ? 1 : 0) +
    (activeColumns.bakeryCategory ? 1 : 0) +
    (activeColumns.breadType ? 1 : 0) +
    (activeColumns.flourBagPrice ? 1 : 0) +
    (activeColumns.breadTypeCount ? 1 : 0) +
    (activeColumns.lineType ? 1 : 0) +
    (activeColumns.fuelType ? 1 : 0);

  const contactSpan =
    (activeColumns.phone ? 1 : 0) +
    (activeColumns.nationalId ? 1 : 0);

  const licenseSpan =
    (activeColumns.commercialRegDate ? 1 : 0) +
    (activeColumns.bakeryLicenseDate ? 1 : 0) +
    (activeColumns.leaseAgreementDate ? 1 : 0) +
    (activeColumns.taxCardDate ? 1 : 0);

  return (
    <div
      className="report-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 overflow-y-auto cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <style>{`
        .print-container, .print-container * {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
        }
        .print-container th {
          background-color: #e2e8f0 !important;
          color: #000000 !important;
          border-color: #000000 !important;
        }
        @media print {
          .no-print { display: none !important; }
          .report-modal-overlay { background: #ffffff !important; padding: 0 !important; position: static !important; display: block !important; }
          .report-modal-dialog { width: 100% !important; max-width: none !important; max-height: none !important; margin: 0 !important; border: none !important; box-shadow: none !important; overflow: visible !important; }
          .report-table-compact { font-size: 8.5pt !important; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
      <div className="report-modal-dialog bg-white rounded-2xl shadow-2xl border-2 border-amber-600/50 w-[98vw] max-w-[1720px] my-2 flex flex-col max-h-[96vh] overflow-hidden cursor-default">
        {/* Modal Top Controls (No-print) */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-amber-500/30 p-3 sm:p-4 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 p-0.5 rounded-xl bg-white border border-amber-400 shadow-md flex items-center justify-center shrink-0">
              <img
                src={systemConfig.logoBase64}
                alt="شعار التموين"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-amber-300">مركز كشوف وتقارير المخابز البلدية والمديونيات والمستخدمين</h3>
                <span className="px-2 py-0.5 bg-amber-500 text-slate-950 rounded text-[10px] font-black">
                  طباعة A4 بالعرض (Landscape)
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-bold">
                {dynamicReportTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Report Font Size Selector */}
            <div className="flex items-center bg-slate-900 border border-amber-500/40 rounded-xl p-0.5 text-xs shadow-inner">
              <span className="px-2 text-[10px] text-amber-300 font-black">حجم الخط:</span>
              <button
                type="button"
                onClick={() => setFontSizeMode('compact')}
                className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                  fontSizeMode === 'compact' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
                title="خط مكثف 7.5pt لضم أكبر قدر من الأعمدة"
              >
                مكثف 7.5pt
              </button>
              <button
                type="button"
                onClick={() => setFontSizeMode('standard')}
                className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                  fontSizeMode === 'standard' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
                title="خط قياسي 8.5pt متوازن وسهل القراءة"
              >
                قياسي 8.5pt
              </button>
              <button
                type="button"
                onClick={() => setFontSizeMode('large')}
                className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                  fontSizeMode === 'large' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
                title="خط مكبّر 9.5pt مريح جداً للعين"
              >
                مكبّر 9.5pt
              </button>
            </div>

            {/* Screen Zoom Control */}
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-0.5 text-xs">
              <span className="px-2 text-[10px] text-slate-400 font-bold">معاينة:</span>
              <button
                type="button"
                onClick={() => setZoomLevel(75)}
                className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                  zoomLevel === 75 ? 'bg-slate-700 text-amber-300' : 'text-slate-400 hover:text-white'
                }`}
                title="تصغير 75% لرؤية كافة الأعمدة"
              >
                75%
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(85)}
                className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                  zoomLevel === 85 ? 'bg-slate-700 text-amber-300' : 'text-slate-400 hover:text-white'
                }`}
                title="ملاءمة الشاشة 85%"
              >
                85%
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                  zoomLevel === 100 ? 'bg-slate-700 text-amber-300' : 'text-slate-400 hover:text-white'
                }`}
                title="العرض الطبيعي 100%"
              >
                100%
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm cursor-pointer border border-emerald-600/60"
              title="تصدير كشف إكسيل متكامل بترميز عربي UTF-8"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              تصدير Excel
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-sm cursor-pointer border border-red-600/60"
              title="تنزيل ملف PDF فوري بعرض الصفحة A4 باللون الأسود الصريح"
            >
              <Download className="w-4 h-4 text-red-200" />
              {isGeneratingPdf ? 'جاري تجهيز PDF...' : 'تنزيل PDF'}
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black shadow-lg cursor-pointer border border-amber-300"
              title="طباعة فورية سريعة ومنسقة لكامل التقرير بعرض ورق A4 Landscape بدون أي تهنيج"
            >
              <Printer className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>طباعة فورية A4 بالعرض</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-red-700 hover:bg-red-600 text-white cursor-pointer border border-red-400 shadow-md flex items-center gap-1.5 font-black text-xs"
              title="إغلاق النافذة فوراً (Escape)"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
              <span>إغلاق (ESC)</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher: General Bakeries vs Detailed Debts vs Per-Bakery Debts vs Users & Passwords (No-print) */}
        <div className="bg-slate-900 border-b border-amber-600/30 px-3 py-2 flex flex-wrap items-center justify-between gap-2 no-print shrink-0">
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setReportType('bakeries')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                reportType === 'bakeries'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Layers className="w-4 h-4" />
              كشف حصر المخابز والحصص ({filteredBakeries.length})
            </button>

            <button
              type="button"
              onClick={() => setReportType('debts')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                reportType === 'debts'
                  ? 'bg-red-600 text-white shadow-md font-black'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <DollarSign className="w-4 h-4 text-amber-300" />
              كشف حساب المديونيات التفصيلي ({filteredDebts.length} قيد)
              {debtReportTotals.over20kCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded text-[10px] font-black">
                  {debtReportTotals.over20kCount} كبرى &gt; 20 ألف
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setReportType('bakery-debts')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                reportType === 'bakery-debts'
                  ? 'bg-emerald-600 text-white shadow-md font-black ring-2 ring-emerald-300'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-emerald-300" />
              كشف مديونيات ونسب سداد المخابز ({filteredBakeryDebts.length} مخبز)
            </button>

            <button
              type="button"
              onClick={() => setReportType('users')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                reportType === 'users'
                  ? 'bg-indigo-600 text-white shadow-md font-black ring-2 ring-amber-300'
                  : 'bg-slate-800 text-amber-300 hover:text-white hover:bg-slate-700 border border-amber-500/40'
              }`}
            >
              <Users className="w-4 h-4 text-amber-300" />
              كشف المستخدمين والصلاحيات (الاسم بالكامل • اليوزر • الباسورد) ({users.length})
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {reportType !== 'users' && (
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-amber-500/50 text-[11px] font-black text-amber-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeUsersAppendix}
                  onChange={(e) => setIncludeUsersAppendix(e.target.checked)}
                  className="accent-amber-500 rounded w-3.5 h-3.5"
                />
                <span>إرفاق جدول المستخدمين (الاسم • اليوزر • الباسورد) بالكشف</span>
              </label>
            )}
            <div className="text-[11px] font-bold text-amber-200">
              {reportType === 'users'
                ? `إجمالي المستخدمين المسجلين بالكشف: ${users.length} مستخدم`
                : reportType === 'debts'
                ? `إجمالي صافي المديونيات بالكشف: ${debtReportTotals.sumNetRemaining.toLocaleString()} ج.م`
                : reportType === 'bakery-debts'
                ? `إجمالي مديونيات المخابز: ${bakeryDebtsTotals.sumNetRemaining.toLocaleString()} ج.م | متوسط السداد: ${bakeryDebtsTotals.overallRepaymentRate.toFixed(1)}%`
                : `إجمالي الحصة التأمينية: ${reportTotals.totalInsurance.toLocaleString()} شيكارة`}
            </div>
          </div>
        </div>

        {/* Toolbar: Filters & Customizer (No-print) */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2.5 no-print shrink-0 max-h-[34vh] overflow-y-auto text-black">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-black text-black mb-1">القرية</label>
              <select
                value={selectedVillage}
                onChange={(e) => {
                  setSelectedVillage(e.target.value);
                  setSelectedUnit('ALL');
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-400 rounded-lg text-xs font-black text-black focus:ring-1 focus:ring-amber-500"
              >
                <option value="ALL">كافة القرى (تقرير شامل لكامل المركز)</option>
                {villages.map((v) => (
                  <option key={v.village} value={v.village}>
                    {v.village}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-black mb-1">
                الوحدة المحلية التابعة
              </label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-400 rounded-lg text-xs font-black text-black focus:ring-1 focus:ring-amber-500"
              >
                <option value="ALL">
                  {selectedVillage === 'ALL'
                    ? 'كافة الوحدات المحلية بالمركز'
                    : `كافة وحدات قرية ${selectedVillage}`}
                </option>
                {selectedVillage === 'ALL'
                  ? villages.map((v) => (
                      <optgroup key={v.village} label={`قرية ${v.village}`}>
                        {v.localUnits.map((u) => (
                          <option key={`${v.village}-${u}`} value={u}>
                            {u} ({v.village})
                          </option>
                        ))}
                      </optgroup>
                    ))
                  : currentUnits.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
              </select>
            </div>

            {reportType === 'bakeries' ? (
              <div>
                <label className="block text-[11px] font-black text-black mb-1">حالة نشاط المخبز</label>
                <select
                  value={selectedActivity}
                  onChange={(e) => setSelectedActivity(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-400 rounded-lg text-xs font-black text-black focus:ring-1 focus:ring-amber-500"
                >
                  <option value="ALL">كافة الحالات</option>
                  <option value="شغال">شغال</option>
                  <option value="متوقف جزئي">متوقف جزئي</option>
                  <option value="متوقف كلي">متوقف كلي</option>
                  <option value="ملغى">ملغى</option>
                </select>
              </div>
            ) : reportType === 'debts' ? (
              <div>
                <label className="block text-[11px] font-black text-black mb-1">
                  تصفية كشف المديونيات
                </label>
                <select
                  value={debtFilterStatus}
                  onChange={(e) => setDebtFilterStatus(e.target.value as 'ALL' | 'OVER_20K' | 'UNPAID' | 'PAID')}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-400 rounded-lg text-xs font-black text-black focus:ring-1 focus:ring-red-500"
                >
                  <option value="ALL">كافة المديونيات والمخالفات</option>
                  <option value="OVER_20K">⚠️ المديونيات الكبرى (&gt; 20,000 ج.م) - تنبيه أسبوعي</option>
                  <option value="UNPAID">المديونيات المتبقية المستحقة فقط (&gt; 0 ج.م)</option>
                  <option value="PAID">المديونيات المسددة بالكامل (خالصة)</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-black text-black mb-1">
                  تصفية موقف السداد والمديونية
                </label>
                <select
                  value={bakeryDebtFilter}
                  onChange={(e) => setBakeryDebtFilter(e.target.value as 'ALL' | 'HAS_DEBT' | 'OVER_20K' | 'PAID')}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-400 rounded-lg text-xs font-black text-black focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="ALL">كافة المخابز (شامل)</option>
                  <option value="HAS_DEBT">المخابز المدينة فقط (عليها متبقي &gt; 0 ج.م)</option>
                  <option value="OVER_20K">⚠️ المديونيات الكبرى (&gt; 20,000 ج.م) - تنبيه أسبوعي</option>
                  <option value="PAID">المخابز خالصة السداد (نسبة سداد 100%)</option>
                </select>
              </div>
            )}
          </div>

          {/* All Villages & All Local Units Visible Interactive Selector Bar */}
          <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-2.5 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-black text-amber-950">
                  📍 إظهار واختيار كافة القرى والوحدات المحلية في جميع الجداول:
                </span>
                <label className="inline-flex items-center gap-1.5 font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-amber-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(activeColumns.village)}
                    onChange={() => toggleColumn('village')}
                    className="accent-amber-600 w-3.5 h-3.5 rounded"
                  />
                  <span>إظهار عمود القرية ({columnTitles.village || 'القرية'})</span>
                </label>
                <label className="inline-flex items-center gap-1.5 font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-amber-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(activeColumns.localUnit)}
                    onChange={() => toggleColumn('localUnit')}
                    className="accent-amber-600 w-3.5 h-3.5 rounded"
                  />
                  <span>إظهار عمود الوحدة المحلية ({columnTitles.localUnit || 'الوحدة المحلية'})</span>
                </label>
              </div>
            </div>

            {/* All Villages Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-amber-200/80">
              <span className="text-[11px] font-black text-slate-700">كافة القرى ({villages.length}):</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedVillage('ALL');
                  setSelectedUnit('ALL');
                }}
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black cursor-pointer transition ${
                  selectedVillage === 'ALL'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-amber-100'
                }`}
              >
                كافة القرى (الكل)
              </button>
              {villages.map((v) => (
                <button
                  key={v.village}
                  type="button"
                  onClick={() => {
                    setSelectedVillage(v.village);
                    setSelectedUnit('ALL');
                  }}
                  className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black cursor-pointer transition ${
                    selectedVillage === v.village
                      ? 'bg-amber-600 text-white'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-amber-100'
                  }`}
                >
                  {v.village}
                </button>
              ))}
            </div>

            {/* All Local Units Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-amber-200/80">
              <span className="text-[11px] font-black text-indigo-900">
                كافة الوحدات المحلية ({currentUnits.length}):
              </span>
              <button
                type="button"
                onClick={() => setSelectedUnit('ALL')}
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black cursor-pointer transition ${
                  selectedUnit === 'ALL'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-indigo-50'
                }`}
              >
                كافة الوحدات المحلية (الكل)
              </button>
              {currentUnits.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setSelectedUnit(u)}
                  className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black cursor-pointer transition ${
                    selectedUnit === u
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-indigo-50'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Column Checklist Accordion - Open by default so all 32 fields are visible */}
          <details open className="bg-white border border-slate-300 rounded-xl p-2.5 text-xs">
            <summary className="font-black text-slate-800 cursor-pointer flex flex-wrap items-center justify-between gap-2 select-none">
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-amber-700" />
                كافة عناصر وخانات التقرير المعروضة ({Object.values(activeColumns).filter(Boolean).length} من {Object.keys(activeColumns).length} عمود مفعل - يشمل القرية والوحدة المحلية وكافة الخانات)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    selectAllColumns();
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black shadow-xs transition cursor-pointer"
                >
                  ✓ إظهار كافة الخانات ({Object.keys(activeColumns).length} عمود)
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    deselectAllColumns();
                  }}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-black shadow-xs transition cursor-pointer"
                >
                  ✕ إلغاء الكل
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    resetDefaultColumns();
                  }}
                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-[10px] font-black transition cursor-pointer"
                >
                  استعادة الافتراضي
                </button>
              </div>
            </summary>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5 mt-2.5 pt-2 border-t border-slate-200">
              {Object.keys(activeColumns).map((colKey) => (
                <label
                  key={colKey}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800 cursor-pointer hover:text-amber-900 bg-slate-50 px-2 py-1 rounded border border-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={activeColumns[colKey]}
                    onChange={() => toggleColumn(colKey)}
                    className="accent-amber-600 rounded"
                  />
                  <span className="truncate">{(columnTitles as unknown as Record<string, string>)[colKey] || colKey}</span>
                </label>
              ))}
            </div>
          </details>
        </div>

        {/* Printable Sheet View - Full Landscape Canvas */}
        <div className="report-scroll-wrapper flex-1 overflow-x-auto overflow-y-auto p-2 sm:p-4 bg-slate-300/80 print:bg-white print:p-0 print:overflow-visible">
          <div
            style={{
              zoom: `${zoomLevel}%`,
              minWidth: '1350px',
            }}
            className="report-zoom-wrapper w-full"
          >
            <div
              ref={printAreaRef}
              className="print-container bg-white text-black p-4 sm:p-6 mx-auto rounded-xl shadow-lg border border-slate-300 print:border-none print:shadow-none print:p-2 print:m-0 w-full"
            >
              {/* OFFICIAL GOVERNMENTAL HEADER */}
              <div className="border-b-2 border-black pb-3 mb-3">
                <div className="flex items-center justify-between">
                  {/* Right: Ministry & Directorate Hierarchy */}
                  <div className="text-right">
                    <h3 className="text-xs font-black text-black leading-tight">جمهورية مصر العربية</h3>
                    <h3 className="text-xs font-black text-slate-900 leading-tight">{systemConfig.governorateTitle}</h3>
                    <h4 className="text-xs font-black text-slate-800 leading-tight">{systemConfig.directorateTitle}</h4>
                    <h4 className="text-xs font-black text-amber-900 leading-tight">{systemConfig.administrationTitle}</h4>
                  </div>

                  {/* Center: Official Emblem */}
                  <div className="text-center">
                    <div className="w-14 h-14 mx-auto p-1 border border-amber-600 rounded-full bg-white flex items-center justify-center">
                      <img
                        src={systemConfig.logoBase64}
                        alt="شعار وزارة التموين"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-[9px] font-black text-slate-800 mt-1">
                      {systemConfig.englishSubtitle}
                    </p>
                  </div>

                  {/* Left: Metadata, Date & User Full Name / Username / Password */}
                  <div className="text-left font-mono text-[10px] text-slate-900 space-y-0.5">
                    <p className="font-black">
                      {reportType === 'users'
                        ? 'كشف حسابات المستخدمين والصلاحيات'
                        : reportType === 'debts'
                        ? 'كشف حساب المديونيات والمخالفات'
                        : reportType === 'bakery-debts'
                        ? 'كشف مديونيات ونسب سداد المخابز'
                        : 'كشف حصر وتشغيل المخابز البلدية'}
                    </p>
                    <p>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
                    <div className="font-black text-black bg-amber-100 px-2.5 py-1 rounded border border-black text-[10.5px] mt-1 space-y-0.5 text-right" dir="rtl">
                      <div>الاسم بالكامل: {currentUser?.fullName || 'م/ أحمد الحسيني'}</div>
                      <div>
                        اليوزر: <span className="font-mono">{currentUser?.username || 'admin'}</span> | الباسورد:{' '}
                        <span className="font-mono">{currentUser?.password || 'admin'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Centered Report Title */}
                <div className="text-center mt-2 pt-2 border-t border-slate-300">
                  <h1 className="text-sm sm:text-base font-black text-slate-900 underline underline-offset-4 tracking-wide">
                    {dynamicReportTitle}
                  </h1>
                </div>
              </div>

              {/* REPORT BODY ACCORDING TO SELECTED TAB */}
              {reportType === 'users' ? (
                <div className="w-full overflow-visible space-y-3 text-black">
                  <table className={`report-table-compact w-full text-center border-collapse border border-black leading-tight text-black ${fontSizeClass}`}>
                    <thead>
                      <tr className="bg-slate-200 text-black font-black border border-black">
                        <th className="border border-black py-1.5 px-1 w-10 text-black">م</th>
                        <th className="border border-black py-1.5 px-2 text-black">الاسم بالكامل (Full Name)</th>
                        <th className="border border-black py-1.5 px-2 text-black">اسم المستخدم (اليوزر - Username)</th>
                        <th className="border border-black py-1.5 px-2 text-black">كلمة المرور (الباسورد - Password)</th>
                        <th className="border border-black py-1.5 px-2 text-black">الدور الوظيفي</th>
                        <th className="border border-black py-1.5 px-2 text-black">المسمى الوظيفي</th>
                        <th className="border border-black py-1.5 px-2 text-black">القسم / الإدارة</th>
                        <th className="border border-black py-1.5 px-2 text-black">عدد وتفاصيل الصلاحيات الممنوحة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black font-black text-black">
                      {users.map((u, idx) => {
                        const perms =
                          u.role === 'admin'
                            ? ALL_PERMISSIONS_LIST.map((p) => p.id)
                            : u.customPermissions && u.customPermissions.length > 0
                            ? u.customPermissions
                            : getDefaultPermissionsForRole(u.role);
                        const permLabels = ALL_PERMISSIONS_LIST.filter((p) => perms.includes(p.id))
                          .map((p) => p.label)
                          .join(' • ');
                        return (
                          <tr key={u.id} className={idx % 2 === 0 ? 'bg-white text-black' : 'bg-slate-50 text-black'}>
                            <td className="border border-black py-1.5 px-1 num-enlarged font-black text-black">{idx + 1}</td>
                            <td className="border border-black py-1.5 px-2 font-black text-right text-black">{u.fullName}</td>
                            <td className="border border-black py-1.5 px-2 font-mono font-black text-black">{u.username}</td>
                            <td className="border border-black py-1.5 px-2 font-mono font-black text-black">{u.password || 'admin'}</td>
                            <td className="border border-black py-1.5 px-2 font-black text-black">
                              {getRoleNameArabic(u.role, systemConfig)}
                            </td>
                            <td className="border border-black py-1.5 px-2 text-black">{u.jobTitle || 'مسئول تمويني'}</td>
                            <td className="border border-black py-1.5 px-2 text-black">
                              {u.department || 'إدارة تموين مركز المحلة الكبرى'}
                            </td>
                            <td className="border border-black py-1.5 px-2 text-right text-[7.5pt] text-black">
                              <span className="font-black underline ml-1 text-black">
                                ({perms.length} من {ALL_PERMISSIONS_LIST.length} صلاحية):
                              </span>
                              <span className="text-black">{permLabels}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : reportType === 'debts' ? (
                /* DETAILED DEBTS ACCOUNT STATEMENT TABLE WITH RECEIPT & PAYMENT COLUMNS */
                <div className="w-full overflow-visible space-y-3 text-black">
                  {/* Urgent Alert Banner on Printout for Over 20k (Hidden during print per instructions) */}
                  {debtReportTotals.over20kCount > 0 && (
                    <div className="bg-red-100 border-2 border-red-600 p-2 rounded text-center text-xs font-black text-black no-print">
                      تنبيه وإخطار تمويني مشدد: المديونيات المعلمة تتجاوز 20,000 ج.م ويُلزم أصحابها قانوناً بجدول دفعات أسبوعية ومتابعة تحصيل دورية!
                    </div>
                  )}

                  <table className={`report-table-compact w-full text-center border-collapse border border-black leading-tight table-fixed text-black ${fontSizeClass}`}>
                    <colgroup>
                      <col style={{ width: '2.2%' }} />
                      <col style={{ width: '10.5%' }} />
                      <col style={{ width: '4.8%' }} />
                      {activeColumns.village && <col style={{ width: '4.5%' }} />}
                      {activeColumns.localUnit && <col style={{ width: '4.5%' }} />}
                      <col style={{ width: '4.5%' }} />
                      <col style={{ width: '5%' }} />
                      <col style={{ width: '6%' }} />
                      <col style={{ width: '4.8%' }} />
                      <col style={{ width: '6.5%' }} />
                      <col style={{ width: '4.5%' }} />
                      <col style={{ width: '4.5%' }} />
                      <col style={{ width: '4.5%' }} />
                      <col style={{ width: '6.2%' }} />
                      <col style={{ width: '4.5%' }} />
                      <col style={{ width: '4.5%' }} />
                      <col style={{ width: '4.5%' }} />
                      <col style={{ width: '6.2%' }} />
                      <col style={{ width: '4.5%' }} />
                      <col style={{ width: '4.5%' }} />
                      <col style={{ width: '5.5%' }} />
                      <col style={{ width: '6.3%' }} />
                    </colgroup>

                    <thead>
                      {/* Top Grouped Header */}
                      <tr className="bg-slate-300 text-black font-black border border-black">
                        <th
                          colSpan={3 + (activeColumns.village ? 1 : 0) + (activeColumns.localUnit ? 1 : 0)}
                          className="border border-black py-1 px-1 bg-slate-300 text-black"
                        >
                          البيانات الأساسية وموقع المخبز
                        </th>
                        <th colSpan={3} className="border border-black py-1 px-1 bg-slate-200 text-black">
                          بيانات المحضر والمخالفة
                        </th>
                        <th colSpan={4} className="border border-black py-1 px-1 bg-emerald-100 text-black">
                          مخالفات المخبز وبيانات الإيصال والسداد
                        </th>
                        <th colSpan={4} className="border border-black py-1 px-1 bg-blue-100 text-black">
                          المنصرف والمضاف وبيانات الإيصال والسداد
                        </th>
                        <th colSpan={4} className="border border-black py-1 px-1 bg-amber-100 text-black">
                          التصرف وبيانات الإيصال والسداد
                        </th>
                        <th colSpan={2} className="border border-black py-1 px-1 bg-slate-300 text-black">
                          صافي المديونية والتنبيه الأسبوعي
                        </th>
                      </tr>

                      {/* Sub Headers */}
                      <tr className="bg-slate-200 text-black font-black border-b border-black">
                        <th className="border border-black py-1 px-0.5 text-black">م</th>
                        <th className="border border-black py-1 px-1 text-black">اسم صاحب المخبز</th>
                        <th className="border border-black py-1 px-0.5 text-black">رقم الماكينة</th>
                        {activeColumns.village && <th className="border border-black py-1 px-0.5 text-black">{columnTitles.village || 'القرية'}</th>}
                        {activeColumns.localUnit && <th className="border border-black py-1 px-0.5 text-black">{columnTitles.localUnit || 'الوحدة المحلية'}</th>}
                        <th className="border border-black py-1 px-0.5 text-black">تاريخ المحضر</th>
                        <th className="border border-black py-1 px-0.5 text-black">الجهة المحررة</th>
                        <th className="border border-black py-1 px-0.5 text-black">نوع المخالفة</th>
                        <th className="border border-black py-1 px-0.5 text-black">إجمالي المخالفات</th>
                        <th className="border border-black py-1 px-0.5 text-black bg-emerald-50">رقم الإيصال وتاريخ ونوع السداد</th>
                        <th className="border border-black py-1 px-0.5 text-black bg-emerald-50">المسدد</th>
                        <th className="border border-black py-1 px-0.5 text-black">المتبقي</th>
                        <th className="border border-black py-1 px-0.5 text-black">المضاف</th>
                        <th className="border border-black py-1 px-0.5 text-black bg-blue-50">إيصال وتاريخ سداد المضاف</th>
                        <th className="border border-black py-1 px-0.5 text-black bg-blue-50">المسدد</th>
                        <th className="border border-black py-1 px-0.5 text-black">المتبقي</th>
                        <th className="border border-black py-1 px-0.5 text-black">قيمة التصرف</th>
                        <th className="border border-black py-1 px-0.5 text-black bg-amber-50">إيصال وتاريخ سداد التصرف</th>
                        <th className="border border-black py-1 px-0.5 text-black bg-amber-50">المسدد</th>
                        <th className="border border-black py-1 px-0.5 text-black">المتبقي</th>
                        <th className="border border-black py-1 px-0.5 bg-slate-200 text-black">صافي المتبقي</th>
                        <th className="border border-black py-1 px-0.5 bg-slate-200 text-black">موقف المطالبة</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-black font-black text-black">
                      {filteredDebts.map((d, idx) => {
                        const totalBakeryDebt = bakeryDebtMap[d.bakeryId] || 0;
                        const isOver20k = totalBakeryDebt > 20000;

                        return (
                          <tr
                            key={d.id}
                            className={
                              isOver20k
                                ? 'bg-red-50/70 text-black font-black'
                                : idx % 2 === 0
                                ? 'bg-white text-black font-black'
                                : 'bg-slate-50 text-black font-black print:bg-slate-100/60'
                            }
                          >
                            <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">{idx + 1}</td>
                            <td className="border border-black py-1 px-1 font-black text-right text-black break-words whitespace-normal leading-snug">
                              {d.bakeryOwnerName}
                            </td>
                            <td className="border border-black py-1 px-0.5 num-enlarged font-black text-black">{d.machineNumber}</td>
                            {activeColumns.village && <td className="border border-black py-1 px-0.5 text-black font-black">{d.village}</td>}
                            {activeColumns.localUnit && <td className="border border-black py-1 px-0.5 text-black font-black">{d.localUnit}</td>}
                            <td className="border border-black py-1 px-0.5 font-mono text-black font-black">{formatDateDDMMYYYY(d.violationDate)}</td>
                            <td className="border border-black py-1 px-0.5 text-black font-black">{d.issuingEntity}</td>
                            <td className="border border-black py-1 px-0.5 text-black font-black">{d.violationType}</td>
                            <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">{d.totalViolations?.toLocaleString()}</td>
                            <td className="border border-black py-1 px-0.5 text-black font-black bg-emerald-50/50 leading-tight">
                              <span className="block font-mono num-enlarged text-black font-black">
                                {d.violationReceiptNumber ? `إيصال: ${d.violationReceiptNumber}` : '-'}
                              </span>
                              {d.violationPaymentDate && (
                                <span className="block font-mono text-[6.5pt] text-black font-black">
                                  {formatDateDDMMYYYY(d.violationPaymentDate)}
                                </span>
                              )}
                              {d.violationPaymentMethod && d.paidViolationAmount > 0 && (
                                <span className="block text-[6.5pt] text-black font-black">
                                  ({d.violationPaymentMethod})
                                </span>
                              )}
                            </td>
                            <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black bg-emerald-50/50">{d.paidViolationAmount?.toLocaleString()}</td>
                            <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">{d.remainingViolations?.toLocaleString()}</td>
                            <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">{d.addedAmount?.toLocaleString()}</td>
                            <td className="border border-black py-1 px-0.5 text-black font-black bg-blue-50/50 leading-tight">
                              <span className="block font-mono num-enlarged text-black font-black">
                                {d.addedReceiptNumber ? `إيصال: ${d.addedReceiptNumber}` : '-'}
                              </span>
                              {d.addedPaymentDate && (
                                <span className="block font-mono text-[6.5pt] text-black font-black">
                                  {formatDateDDMMYYYY(d.addedPaymentDate)}
                                </span>
                              )}
                              {d.addedPaymentMethod && d.paidAddedAmount > 0 && (
                                <span className="block text-[6.5pt] text-black font-black">
                                  ({d.addedPaymentMethod})
                                </span>
                              )}
                            </td>
                            <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black bg-blue-50/50">{d.paidAddedAmount?.toLocaleString()}</td>
                            <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">{d.remainingAdded?.toLocaleString()}</td>
                            <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">{d.disposalValue?.toLocaleString()}</td>
                            <td className="border border-black py-1 px-0.5 text-black font-black bg-amber-50/50 leading-tight">
                              <span className="block font-mono num-enlarged text-black font-black">
                                {d.disposalReceiptNumber ? `إيصال: ${d.disposalReceiptNumber}` : '-'}
                              </span>
                              {d.disposalPaymentDate && (
                                <span className="block font-mono text-[6.5pt] text-black font-black">
                                  {formatDateDDMMYYYY(d.disposalPaymentDate)}
                                </span>
                              )}
                              {d.disposalPaymentMethod && d.paidDisposalAmount > 0 && (
                                <span className="block text-[6.5pt] text-black font-black">
                                  ({d.disposalPaymentMethod})
                                </span>
                              )}
                            </td>
                            <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black bg-amber-50/50">{d.paidDisposalAmount?.toLocaleString()}</td>
                            <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">{d.remainingDisposal?.toLocaleString()}</td>
                            <td
                              className={`border border-black py-1 px-0.5 num-enlarged font-black text-black ${
                                d.netRemainingDebt > 0 ? 'bg-red-100/60' : 'bg-emerald-50/60'
                              }`}
                            >
                              {d.netRemainingDebt > 0 ? `${d.netRemainingDebt.toLocaleString()} ج.م` : 'خالص'}
                            </td>
                            <td className="border border-black py-1 px-0.5 text-[7.5pt] font-black text-black">
                              {isOver20k ? (
                                <span className="text-black font-black block">
                                  ⚠️ &gt; 20 ألف (مطالب بدفعات أسبوعية)
                                </span>
                              ) : d.netRemainingDebt > 0 ? (
                                <span className="text-black font-black">مستحق السداد</span>
                              ) : (
                                <span className="text-black font-black">خالص السداد</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    <tfoot>
                      <tr className="bg-slate-200 text-black font-black border-t-2 border-black text-[8px] print:text-[7pt]">
                        <td
                          colSpan={6 + (activeColumns.village ? 1 : 0) + (activeColumns.localUnit ? 1 : 0)}
                          className="border border-black py-1.5 px-2 text-right text-black font-black"
                        >
                          إجمالي كشف حساب المديونيات ({filteredDebts.length} قيد)
                        </td>
                        <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">
                          {debtReportTotals.sumTotalViolations.toLocaleString()}
                        </td>
                        <td className="border border-black py-1 px-0.5 text-black font-black">-</td>
                        <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">
                          {debtReportTotals.sumPaidViolations.toLocaleString()}
                        </td>
                        <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">
                          {(debtReportTotals.sumTotalViolations - debtReportTotals.sumPaidViolations).toLocaleString()}
                        </td>
                        <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">
                          {debtReportTotals.sumAdded.toLocaleString()}
                        </td>
                        <td className="border border-black py-1 px-0.5 text-black font-black">-</td>
                        <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">
                          {debtReportTotals.sumPaidAdded.toLocaleString()}
                        </td>
                        <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">
                          {(debtReportTotals.sumAdded - debtReportTotals.sumPaidAdded).toLocaleString()}
                        </td>
                        <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">
                          {debtReportTotals.sumDisposal.toLocaleString()}
                        </td>
                        <td className="border border-black py-1 px-0.5 text-black font-black">-</td>
                        <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">
                          {debtReportTotals.sumPaidDisposal.toLocaleString()}
                        </td>
                        <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">
                          {(debtReportTotals.sumDisposal - debtReportTotals.sumPaidDisposal).toLocaleString()}
                        </td>
                        <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">
                          {debtReportTotals.sumNetRemaining.toLocaleString()} ج.م
                        </td>
                        <td className="border border-black py-1 px-0.5 text-[7pt] text-black font-black">
                          {debtReportTotals.over20kCount} مخبز &gt; 20,000 ج.م
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : reportType === 'bakery-debts' ? (
                /* PER-BAKERY DEBTS & REPAYMENT PERCENTAGES SUMMARY TABLE */
                <div className="w-full overflow-visible space-y-2.5 text-black">
                  {/* Summary Metric Cards Bar (Hidden during print per instructions) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs no-print text-black">
                    <div className="bg-slate-100 border border-slate-400 rounded-lg p-1.5 shadow-xs">
                      <span className="text-[9px] text-black block font-black">إجمالي المخابز المشمولة</span>
                      <span className="text-sm font-black text-black num-enlarged">{filteredBakeryDebts.length}</span>
                      <span className="text-[8px] text-black font-bold block">منها {bakeryDebtsTotals.indebtedCount} عليها مديونية</span>
                    </div>

                    <div className="bg-amber-50 border border-amber-300 rounded-lg p-1.5 shadow-xs">
                      <span className="text-[9px] text-black block font-black">إجمالي المديونية المستحقة</span>
                      <span className="text-sm font-black text-black num-enlarged">
                        {bakeryDebtsTotals.sumTotalDue.toLocaleString()} <span className="text-[8px]">ج.م</span>
                      </span>
                      <span className="text-[8px] text-black font-bold block">{bakeryDebtsTotals.sumRecords} محضر وقيد</span>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-1.5 shadow-xs">
                      <span className="text-[9px] text-black block font-black">إجمالي المسدد والمحصل</span>
                      <span className="text-sm font-black text-black num-enlarged">
                        {bakeryDebtsTotals.sumTotalPaid.toLocaleString()} <span className="text-[8px]">ج.م</span>
                      </span>
                      <span className="text-[8px] text-black font-bold block">مسدد فعلياً</span>
                    </div>

                    <div className="bg-red-50 border border-red-300 rounded-lg p-1.5 shadow-xs">
                      <span className="text-[9px] text-black block font-black">صافي المديونية المتبقية</span>
                      <span className="text-sm font-black text-black num-enlarged">
                        {bakeryDebtsTotals.sumNetRemaining.toLocaleString()} <span className="text-[8px]">ج.م</span>
                      </span>
                      <span className="text-[8px] text-black font-bold block">مستحقة التحصيل</span>
                    </div>

                    <div className="bg-blue-50 border border-blue-300 rounded-lg p-1.5 shadow-xs">
                      <span className="text-[9px] text-black block font-black">متوسط نسبة السداد العامة</span>
                      <span className="text-sm font-black text-black num-enlarged">
                        {bakeryDebtsTotals.overallRepaymentRate.toFixed(1)}%
                      </span>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1 border border-slate-300">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, bakeryDebtsTotals.overallRepaymentRate))}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-red-100/90 border-2 border-red-600 rounded-lg p-1.5 shadow-xs">
                      <span className="text-[9px] text-black block font-black">مديونيات كبرى (&gt; 20 ألف)</span>
                      <span className="text-sm font-black text-black num-enlarged">
                        {bakeryDebtsTotals.over20kCount} <span className="text-[9px]">مخبز</span>
                      </span>
                      <span className="text-[8px] text-black font-bold block">يلزم دفعات أسبوعية</span>
                    </div>
                  </div>

                  {/* Warning banner if there are any bakeries with > 20k debts */}
                  {bakeryDebtsTotals.over20kCount > 0 && (
                    <div className="bg-red-100 border-2 border-red-600 p-1.5 rounded text-center text-xs font-black text-black no-print">
                      ⚠️ تنبيه وإخطار تمويني مشدد: يتضمن الكشف عدد ({bakeryDebtsTotals.over20kCount}) مخابز تتجاوز مديونيتها 20,000 ج.م ويُلزم أصحابها قانوناً بجدول دفعات أسبوعية ومتابعة تحصيل دورية!
                    </div>
                  )}

                  <table className={`report-table-compact w-full text-center border-collapse border border-black leading-tight table-fixed text-black ${fontSizeClass}`}>
                    <colgroup>
                      <col style={{ width: '2.5%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '6.5%' }} />
                      {activeColumns.village && <col style={{ width: '5.5%' }} />}
                      {activeColumns.localUnit && <col style={{ width: '5.5%' }} />}
                      <col style={{ width: '4.5%' }} />
                      <col style={{ width: '8.5%' }} />
                      <col style={{ width: '6%' }} />
                      <col style={{ width: '5.5%' }} />
                      <col style={{ width: '5.5%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '8.5%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '10%' }} />
                    </colgroup>

                    <thead>
                      <tr className="bg-slate-300 text-black font-black border border-black">
                        <th
                          colSpan={3 + (activeColumns.village ? 1 : 0) + (activeColumns.localUnit ? 1 : 0)}
                          className="border border-black py-1 px-1 bg-slate-300 text-black"
                        >
                          البيانات الأساسية وموقع المخبز
                        </th>
                        <th colSpan={5} className="border border-black py-1 px-1 bg-amber-100 text-black">
                          تفاصيل المديونية المستحقة (ج.م)
                        </th>
                        <th colSpan={2} className="border border-black py-1 px-1 bg-emerald-100 text-black">
                          المسدد وصافي المتبقي
                        </th>
                        <th colSpan={2} className="border border-black py-1 px-1 bg-slate-200 text-black">
                          معدل السداد والموقف القانوني
                        </th>
                      </tr>

                      <tr className="bg-slate-200 text-black font-black border-b border-black">
                        <th className="border border-black py-1 px-0.5 text-black">م</th>
                        <th className="border border-black py-1 px-1 text-black">اسم صاحب المخبز</th>
                        <th className="border border-black py-1 px-0.5 text-black">رقم الماكينة</th>
                        {activeColumns.village && <th className="border border-black py-1 px-0.5 text-black">{columnTitles.village || 'القرية'}</th>}
                        {activeColumns.localUnit && <th className="border border-black py-1 px-0.5 text-black">{columnTitles.localUnit || 'الوحدة المحلية'}</th>}
                        <th className="border border-black py-1 px-0.5 text-black">عدد المحاضر</th>
                        <th className="border border-black py-1 px-0.5 bg-amber-50 text-black">إجمالي المستحق</th>
                        <th className="border border-black py-1 px-0.5 text-black">المخالفات</th>
                        <th className="border border-black py-1 px-0.5 text-black">المضاف</th>
                        <th className="border border-black py-1 px-0.5 text-black">التصرف</th>
                        <th className="border border-black py-1 px-0.5 bg-emerald-50 text-black">إجمالي المسدد</th>
                        <th className="border border-black py-1 px-0.5 bg-red-50 text-black">صافي المتبقي</th>
                        <th className="border border-black py-1 px-0.5 bg-slate-200 text-black">نسبة السداد %</th>
                        <th className="border border-black py-1 px-0.5 bg-slate-200 text-black">الموقف والتنبيه</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-black font-black text-black">
                      {filteredBakeryDebts.map((item, idx) => {
                        const b = item.bakery;
                        const isOver20k = item.isOver20k;
                        const hasDebt = item.netRemaining > 0;
                        const rate = item.repaymentRate;

                        return (
                          <tr
                            key={b.id}
                            className={
                              isOver20k
                                ? 'bg-red-50/70 text-black font-black'
                                : idx % 2 === 0
                                ? 'bg-white text-black font-black'
                                : 'bg-slate-50 text-black font-black print:bg-slate-100/60'
                            }
                          >
                            <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">{idx + 1}</td>
                            <td className="border border-black py-1 px-1 font-black text-right text-black break-words whitespace-normal leading-snug">
                              {b.bakeryOwnerName}
                            </td>
                            <td className="border border-black py-1 px-0.5 num-enlarged font-black text-black">{b.machineNumber}</td>
                            {activeColumns.village && <td className="border border-black py-1 px-0.5 text-black font-black">{b.village}</td>}
                            {activeColumns.localUnit && <td className="border border-black py-1 px-0.5 text-black font-black">{b.localUnit}</td>}
                            <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">
                              {item.recordCount > 0 ? `${item.recordCount} قيد` : '-'}
                            </td>
                            <td className="border border-black py-1 px-0.5 num-enlarged font-black text-black bg-amber-50/50">
                              {item.totalDue > 0 ? item.totalDue.toLocaleString() : '0'}
                            </td>
                            <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">
                              {item.totalViolations > 0 ? item.totalViolations.toLocaleString() : '-'}
                            </td>
                            <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">
                              {item.totalAdded > 0 ? item.totalAdded.toLocaleString() : '-'}
                            </td>
                            <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">
                              {item.totalDisposal > 0 ? item.totalDisposal.toLocaleString() : '-'}
                            </td>
                            <td className="border border-black py-1 px-0.5 num-enlarged font-black text-black bg-emerald-50/50">
                              {item.totalPaid > 0 ? item.totalPaid.toLocaleString() : '0'}
                            </td>
                            <td
                              className={`border border-black py-1 px-0.5 num-enlarged font-black text-black ${
                                hasDebt ? 'bg-red-100/50' : 'bg-emerald-50/30'
                              }`}
                            >
                              {hasDebt ? `${item.netRemaining.toLocaleString()} ج.م` : 'خالص'}
                            </td>
                            <td className="border border-black py-1 px-1 text-black">
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <span
                                  className={`num-enlarged font-black text-black px-1.5 py-0.5 rounded text-[8pt] ${
                                    rate >= 100
                                      ? 'bg-emerald-100 border border-emerald-400'
                                      : rate >= 50
                                      ? 'bg-amber-100 border border-amber-400'
                                      : rate > 0
                                      ? 'bg-orange-100 border border-orange-400'
                                      : 'bg-red-100 border border-red-400'
                                  }`}
                                >
                                  {rate.toFixed(1)}%
                                </span>
                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden border border-slate-300">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      rate >= 100
                                        ? 'bg-emerald-600'
                                        : rate >= 50
                                        ? 'bg-amber-500'
                                        : rate > 0
                                        ? 'bg-orange-500'
                                        : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="border border-black py-1 px-0.5 text-[6.8pt] text-black font-black">
                              {isOver20k ? (
                                <span className="text-black font-black block leading-tight">
                                  ⚠️ &gt; 20 ألف (مطالب بدفعات أسبوعية)
                                </span>
                              ) : hasDebt ? (
                                item.totalPaid > 0 ? (
                                  <span className="text-black font-black block">
                                    سداد جزئي ({rate.toFixed(0)}%)
                                  </span>
                                ) : (
                                  <span className="text-black font-black block">لم يسدد بعد (0%)</span>
                                )
                              ) : (
                                <span className="text-black font-black block">خالص السداد (100%)</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    <tfoot>
                      <tr className="bg-slate-200 text-black font-black border-t-2 border-black text-[8px] print:text-[7pt]">
                        <td
                          colSpan={3 + (activeColumns.village ? 1 : 0) + (activeColumns.localUnit ? 1 : 0)}
                          className="border border-black py-1.5 px-2 text-right text-black font-black"
                        >
                          إجمالي كشف مديونيات ونسب سداد المخابز ({filteredBakeryDebts.length} مخبز)
                        </td>
                        <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">
                          {bakeryDebtsTotals.sumRecords} قيد
                        </td>
                        <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">
                          {bakeryDebtsTotals.sumTotalDue.toLocaleString()}
                        </td>
                        <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">
                          {bakeryDebtsTotals.sumViolations.toLocaleString()}
                        </td>
                        <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">
                          {bakeryDebtsTotals.sumAdded.toLocaleString()}
                        </td>
                        <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">
                          {bakeryDebtsTotals.sumDisposal.toLocaleString()}
                        </td>
                        <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">
                          {bakeryDebtsTotals.sumTotalPaid.toLocaleString()}
                        </td>
                        <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">
                          {bakeryDebtsTotals.sumNetRemaining.toLocaleString()} ج.م
                        </td>
                        <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">
                          {bakeryDebtsTotals.overallRepaymentRate.toFixed(1)}%
                        </td>
                        <td className="border border-black py-1 px-0.5 text-[7pt] text-black font-black">
                          {bakeryDebtsTotals.over20kCount > 0
                            ? `${bakeryDebtsTotals.over20kCount} كبرى > 20 ألف`
                            : 'لا توجد مديونيات كبرى'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                /* GENERAL BAKERIES REGISTRY TABLE */
                <div className="w-full overflow-visible text-black">
                  <table className={`report-table-compact w-full text-center border-collapse border border-black leading-tight table-fixed text-black ${fontSizeClass}`}>
                    {/* Column percentage widths dynamically normalized to 100% */}
                    <colgroup>
                      {(() => {
                        const baseWeights: Record<string, number> = {
                          index: 2.2,
                          bakeryOwnerName: 9.5,
                          machineNumber: 4.5,
                          village: 4.2,
                          localUnit: 4.2,
                          remainingDebt: 4.5,
                          // الحصص والبيانات التموينية
                          insuranceValue: 3.8,
                          insuranceQuota: 3.5,
                          actualQuota: 3.5,
                          loavesCount: 4.0,
                          perCapitaAverage: 3.6,
                          // إحصائيات السكان
                          villagePopulation: 3.8,
                          beneficiaries2023: 3.4,
                          beneficiaries2024: 3.4,
                          beneficiaries2025: 3.4,
                          avg2023: 3.2,
                          avg2024: 3.2,
                          avg2025: 3.2,
                          avgDiff: 3.4,
                          // التصنيف والتشغيل
                          activityStatus: 3.5,
                          bakeryCategory: 4.0,
                          breadType: 3.8,
                          flourBagPrice: 3.2,
                          breadTypeCount: 2.6,
                          lineType: 3.4,
                          fuelType: 3.0,
                          // الاتصال والتراخيص
                          phone: 4.2,
                          nationalId: 5.5,
                          commercialRegDate: 3.6,
                          bakeryLicenseDate: 3.6,
                          leaseAgreementDate: 3.6,
                          taxCardDate: 3.6,
                        };

                        const activeKeys = Object.keys(activeColumns).filter((k) => activeColumns[k]);
                        const totalWeight = activeKeys.reduce((acc, k) => acc + (baseWeights[k] || 3.5), 0) || 1;

                        return activeKeys.map((colKey) => {
                          const pct = (((baseWeights[colKey] || 3.5) / totalWeight) * 100).toFixed(2);
                          return <col key={colKey} style={{ width: `${pct}%` }} />;
                        });
                      })()}
                    </colgroup>

                    <thead>
                      {/* Top Grouped Header Row */}
                      <tr className="bg-slate-300 text-black font-black border border-black text-[8px] print:text-[7.5pt]">
                        {basicInfoSpan > 0 && (
                          <th colSpan={basicInfoSpan} className="border border-black py-1 px-1 bg-slate-300 text-black">
                            البيانات الأساسية وموقع المخبز
                          </th>
                        )}
                        {debtsSpan > 0 && (
                          <th colSpan={debtsSpan} className="border border-black py-1 px-1 bg-red-100 text-black">
                            المتبقي
                          </th>
                        )}
                        {quotasSpan > 0 && (
                          <th colSpan={quotasSpan} className="border border-black py-1 px-1 bg-amber-100 text-black">
                            الحصص والبيانات التموينية
                          </th>
                        )}
                        {populationSpan > 0 && (
                          <th colSpan={populationSpan} className="border border-black py-1 px-1 bg-cyan-100 text-black">
                            إحصائيات السكان والمستفيدين (2023 - 2025)
                          </th>
                        )}
                        {specsSpan > 0 && (
                          <th colSpan={specsSpan} className="border border-black py-1 px-1 bg-emerald-100 text-black">
                            التصنيف والتشغيل
                          </th>
                        )}
                        {contactSpan > 0 && (
                          <th colSpan={contactSpan} className="border border-black py-1 px-1 bg-purple-100 text-black">
                            بيانات الاتصال والهوية
                          </th>
                        )}
                        {licenseSpan > 0 && (
                          <th colSpan={licenseSpan} className="border border-black py-1 px-1 bg-slate-200 text-black">
                            صلاحية السجلات والتراخيص
                          </th>
                        )}
                      </tr>

                      {/* Sub Header Row (in exact requested order) */}
                      <tr className="bg-slate-200 text-black font-black border-b border-black text-[7.5px] print:text-[6.8pt]">
                        {activeColumns.index && <th className="border border-black py-1 px-0.5 text-black">م</th>}
                        {activeColumns.bakeryOwnerName && (
                          <th className="border border-black py-1 px-1 text-black">{columnTitles.bakeryOwnerName}</th>
                        )}
                        {activeColumns.machineNumber && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.machineNumber}</th>
                        )}
                        {activeColumns.village && <th className="border border-black py-1 px-0.5 text-black">{columnTitles.village}</th>}
                        {activeColumns.localUnit && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.localUnit}</th>
                        )}
                        {activeColumns.remainingDebt && (
                          <th className="border border-black py-1 px-0.5 bg-red-50 text-black">
                            {columnTitles.remainingDebt}
                          </th>
                        )}
                        {/* 1. الحصص والبيانات التموينية */}
                        {activeColumns.insuranceValue && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.insuranceValue}</th>
                        )}
                        {activeColumns.insuranceQuota && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.insuranceQuota}</th>
                        )}
                        {activeColumns.actualQuota && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.actualQuota}</th>
                        )}
                        {activeColumns.loavesCount && (
                          <th className="border border-black py-1 px-0.5 bg-amber-50 text-black">
                            {columnTitles.loavesCount}
                          </th>
                        )}
                        {activeColumns.perCapitaAverage && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.perCapitaAverage}</th>
                        )}
                        {/* 2. إحصائيات السكان */}
                        {activeColumns.villagePopulation && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.villagePopulation}</th>
                        )}
                        {activeColumns.beneficiaries2023 && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.beneficiaries2023}</th>
                        )}
                        {activeColumns.beneficiaries2024 && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.beneficiaries2024}</th>
                        )}
                        {activeColumns.beneficiaries2025 && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.beneficiaries2025}</th>
                        )}
                        {activeColumns.avg2023 && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.avg2023}</th>
                        )}
                        {activeColumns.avg2024 && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.avg2024}</th>
                        )}
                        {activeColumns.avg2025 && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.avg2025}</th>
                        )}
                        {activeColumns.avgDiff && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.avgDiff}</th>
                        )}
                        {/* 3. التصنيف والتشغيل */}
                        {activeColumns.activityStatus && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.activityStatus}</th>
                        )}
                        {activeColumns.bakeryCategory && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.bakeryCategory || 'نوع المخابز'}</th>
                        )}
                        {activeColumns.breadType && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.breadType}</th>
                        )}
                        {activeColumns.flourBagPrice && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.flourBagPrice || 'سعر الشيكارة'}</th>
                        )}
                        {activeColumns.breadTypeCount && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.breadTypeCount}</th>
                        )}
                        {activeColumns.lineType && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.lineType}</th>
                        )}
                        {activeColumns.fuelType && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.fuelType}</th>
                        )}
                        {activeColumns.phone && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.phone}</th>
                        )}
                        {activeColumns.nationalId && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.nationalId}</th>
                        )}
                        {activeColumns.commercialRegDate && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.commercialRegDate}</th>
                        )}
                        {activeColumns.bakeryLicenseDate && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.bakeryLicenseDate}</th>
                        )}
                        {activeColumns.leaseAgreementDate && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.leaseAgreementDate}</th>
                        )}
                        {activeColumns.taxCardDate && (
                          <th className="border border-black py-1 px-0.5 text-black">{columnTitles.taxCardDate}</th>
                        )}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-black font-black text-black">
                      {filteredBakeries.map((b, idx) => {
                        const debtVal = bakeryDebtMap[b.id] || 0;
                        const isOver20k = debtVal > 20000;

                        return (
                          <tr
                            key={b.id}
                            className={idx % 2 === 0 ? 'bg-white text-black font-black' : 'bg-slate-50 text-black font-black print:bg-slate-100/60'}
                          >
                            {activeColumns.index && <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">{idx + 1}</td>}
                            {activeColumns.bakeryOwnerName && (
                              <td className="border border-black py-1 px-1 font-black text-right text-black break-words whitespace-normal leading-snug">
                                {b.bakeryOwnerName}
                              </td>
                            )}
                            {activeColumns.machineNumber && (
                              <td className="border border-black py-1 px-0.5 num-enlarged font-black text-black">{b.machineNumber}</td>
                            )}
                            {activeColumns.village && <td className="border border-black py-1 px-0.5 text-black font-black">{b.village}</td>}
                            {activeColumns.localUnit && <td className="border border-black py-1 px-0.5 text-black font-black">{b.localUnit}</td>}
                            {activeColumns.remainingDebt && (
                              <td
                                className={`border border-black py-1 px-0.5 num-enlarged font-black text-black ${
                                  isOver20k
                                    ? 'bg-red-100/70'
                                    : debtVal > 0
                                    ? 'bg-amber-50/70'
                                    : 'bg-emerald-50/50'
                                }`}
                                title={isOver20k ? 'تتجاوز 20,000 ج.م - مطلوب دفعات أسبوعية' : undefined}
                              >
                                {debtVal > 0 ? `${debtVal.toLocaleString()}` : 'خالص'}
                              </td>
                            )}
                            {/* 1. الحصص والبيانات التموينية */}
                            {activeColumns.insuranceValue && (
                              <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">{b.insuranceValue?.toLocaleString()}</td>
                            )}
                            {activeColumns.insuranceQuota && (
                              <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">{b.insuranceQuota}</td>
                            )}
                            {activeColumns.actualQuota && (
                              <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">{b.actualQuota}</td>
                            )}
                            {activeColumns.loavesCount && (
                              <td className="border border-black py-1 px-0.5 num-enlarged font-black text-black bg-amber-50/40">
                                {b.loavesCount?.toLocaleString()}
                              </td>
                            )}
                            {activeColumns.perCapitaAverage && (
                              <td className="border border-black py-1 px-0.5 num-enlarged font-black text-black">{b.perCapitaAverage}</td>
                            )}
                            {/* 2. إحصائيات السكان */}
                            {activeColumns.villagePopulation && (
                              <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">{b.villagePopulation?.toLocaleString()}</td>
                            )}
                            {activeColumns.beneficiaries2023 && (
                              <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">{b.beneficiaries2023?.toLocaleString()}</td>
                            )}
                            {activeColumns.beneficiaries2024 && (
                              <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">{b.beneficiaries2024?.toLocaleString()}</td>
                            )}
                            {activeColumns.beneficiaries2025 && (
                              <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">{b.beneficiaries2025?.toLocaleString()}</td>
                            )}
                            {activeColumns.avg2023 && (
                              <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">{b.avg2023}</td>
                            )}
                            {activeColumns.avg2024 && (
                              <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">{b.avg2024}</td>
                            )}
                            {activeColumns.avg2025 && (
                              <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">{b.avg2025}</td>
                            )}
                            {activeColumns.avgDiff && (
                              <td className="border border-black py-1 px-0.5 num-enlarged font-black text-black">{b.avgDiff}</td>
                            )}
                            {/* 3. التصنيف والتشغيل */}
                            {activeColumns.activityStatus && (
                              <td className="border border-black py-1 px-0.5 font-black text-black">{b.activityStatus}</td>
                            )}
                            {activeColumns.bakeryCategory && (
                              <td className="border border-black py-1 px-0.5 font-black text-black">{b.bakeryCategory || 'مخبز بلدي مدعم'}</td>
                            )}
                            {activeColumns.breadType && (
                              <td className="border border-black py-1 px-0.5 text-black font-black">{b.breadType}</td>
                            )}
                            {activeColumns.flourBagPrice && (
                              <td className="border border-black py-1 px-0.5 num-enlarged font-black text-black">{(b.flourBagPrice ?? 950).toLocaleString()}</td>
                            )}
                            {activeColumns.breadTypeCount && (
                              <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">{b.breadTypeCount}</td>
                            )}
                            {activeColumns.lineType && (
                              <td className="border border-black py-1 px-0.5 text-black font-black">{b.lineType}</td>
                            )}
                            {activeColumns.fuelType && (
                              <td className="border border-black py-1 px-0.5 text-black font-black">{b.fuelType}</td>
                            )}
                            {activeColumns.phone && (
                              <td className="border border-black py-1 px-0.5 num-enlarged font-mono text-black font-black">{b.phone}</td>
                            )}
                            {activeColumns.nationalId && (
                              <td className="border border-black py-1 px-0.5 num-enlarged font-mono text-black font-black">{b.nationalId}</td>
                            )}
                            {activeColumns.commercialRegDate && (
                              <td className="border border-black py-1 px-0.5 num-enlarged font-mono text-black font-black">{formatDateDDMMYYYY(b.commercialRegDate)}</td>
                            )}
                            {activeColumns.bakeryLicenseDate && (
                              <td className="border border-black py-1 px-0.5 num-enlarged font-mono text-black font-black">{formatDateDDMMYYYY(b.bakeryLicenseDate)}</td>
                            )}
                            {activeColumns.leaseAgreementDate && (
                              <td className="border border-black py-1 px-0.5 num-enlarged font-mono text-black font-black">{formatDateDDMMYYYY(b.leaseAgreementDate)}</td>
                            )}
                            {activeColumns.taxCardDate && (
                              <td className="border border-black py-1 px-0.5 num-enlarged font-mono text-black font-black">{formatDateDDMMYYYY(b.taxCardDate)}</td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>

                    <tfoot>
                      <tr className="bg-slate-200 text-black font-black border-t-2 border-black text-[8px] print:text-[7pt]">
                        <td colSpan={3} className="border border-black py-1.5 px-2 text-right text-black font-black">
                          إجمالي الكشف ({filteredBakeries.length} مخبز)
                        </td>
                        {activeColumns.village && <td className="border border-black" />}
                        {activeColumns.localUnit && <td className="border border-black" />}
                        {activeColumns.remainingDebt && (
                          <td className="border border-black py-1 px-0.5 num-enlarged text-black font-black">
                            {reportTotals.totalDebt.toLocaleString()} ج.م
                          </td>
                        )}
                        {activeColumns.insuranceValue && (
                          <td className="border border-black py-1 px-0.5 num-enlarged font-black text-black">
                            {reportTotals.totalInsuranceValue.toLocaleString()} ج.م
                          </td>
                        )}
                        {activeColumns.insuranceQuota && (
                          <td className="border border-black py-1 px-0.5 num-enlarged font-black text-black">
                            {reportTotals.totalInsurance} شيكارة
                          </td>
                        )}
                        {activeColumns.actualQuota && (
                          <td className="border border-black py-1 px-0.5 num-enlarged font-black text-black">
                            {reportTotals.totalActual} شيكارة
                          </td>
                        )}
                        {activeColumns.loavesCount && (
                          <td className="border border-black py-1 px-0.5 num-enlarged font-black text-black">
                            {reportTotals.totalLoaves.toLocaleString()}
                          </td>
                        )}
                        <td
                          colSpan={
                            Object.values(activeColumns).filter(Boolean).length -
                            (activeColumns.index ? 1 : 0) -
                            (activeColumns.bakeryOwnerName ? 1 : 0) -
                            (activeColumns.machineNumber ? 1 : 0) -
                            (activeColumns.village ? 1 : 0) -
                            (activeColumns.localUnit ? 1 : 0) -
                            (activeColumns.remainingDebt ? 1 : 0) -
                            (activeColumns.insuranceValue ? 1 : 0) -
                            (activeColumns.insuranceQuota ? 1 : 0) -
                            (activeColumns.actualQuota ? 1 : 0) -
                            (activeColumns.loavesCount ? 1 : 0)
                          }
                          className="border border-black bg-slate-100"
                        />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Optional Attached Users & Permissions Table (when includeUsersAppendix is enabled) */}
              {reportType !== 'users' && includeUsersAppendix && users.length > 0 && (
                <div className="mt-6 pt-3 border-t-2 border-black space-y-2 text-black">
                  <h3 className="text-xs font-black text-black underline">
                    بيان حسابات المستخدمين والأدوار الوظيفية والصلاحيات (الاسم بالكامل • اليوزر • الباسورد):
                  </h3>
                  <table className={`report-table-compact w-full text-center border-collapse border border-black leading-tight text-black ${fontSizeClass}`}>
                    <thead>
                      <tr className="bg-slate-200 text-black font-black border border-black">
                        <th className="border border-black py-1 px-1 w-10 text-black">م</th>
                        <th className="border border-black py-1 px-2 text-black">الاسم بالكامل</th>
                        <th className="border border-black py-1 px-2 text-black">اسم المستخدم (اليوزر)</th>
                        <th className="border border-black py-1 px-2 text-black">كلمة المرور (الباسورد)</th>
                        <th className="border border-black py-1 px-2 text-black">الدور الوظيفي</th>
                        <th className="border border-black py-1 px-2 text-black">المسمى الوظيفي</th>
                        <th className="border border-black py-1 px-2 text-black">عدد الصلاحيات الممنوحة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black font-black text-black">
                      {users.map((u, idx) => {
                        const perms =
                          u.role === 'admin'
                            ? ALL_PERMISSIONS_LIST.map((p) => p.id)
                            : u.customPermissions && u.customPermissions.length > 0
                            ? u.customPermissions
                            : getDefaultPermissionsForRole(u.role);
                        return (
                          <tr key={u.id} className={idx % 2 === 0 ? 'bg-white text-black' : 'bg-slate-50 text-black'}>
                            <td className="border border-black py-1 px-1 font-black text-black">{idx + 1}</td>
                            <td className="border border-black py-1 px-2 font-black text-right text-black">{u.fullName}</td>
                            <td className="border border-black py-1 px-2 font-mono font-black text-black">{u.username}</td>
                            <td className="border border-black py-1 px-2 font-mono font-black text-black">{u.password || 'admin'}</td>
                            <td className="border border-black py-1 px-2 font-black text-black">{getRoleNameArabic(u.role, systemConfig)}</td>
                            <td className="border border-black py-1 px-2 text-black">{u.jobTitle || 'مسئول تمويني'}</td>
                            <td className="border border-black py-1 px-2 font-black text-black">
                              {perms.length} من {ALL_PERMISSIONS_LIST.length} صلاحية
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Official Stamps and Signatures Area */}
              <div className="mt-8 pt-4 grid grid-cols-3 text-center text-xs font-black text-slate-900 border-t border-slate-300">
                <div>
                  <p>إعداد ومراجعة الإحصاء التمويني والمديونيات</p>
                  <p className="text-[11px] font-black text-amber-950 mt-1">
                    الاسم بالكامل: {currentUser?.fullName || 'م/ أحمد الحسيني'} (اليوزر: {currentUser?.username || 'admin'})
                  </p>
                  <div className="h-8 flex items-end justify-center text-[10px] text-slate-400">
                    ................................
                  </div>
                </div>
                <div>
                  <p>رئيس قسم الرقابة التموينية بالمركز</p>
                  <div className="h-12 flex items-end justify-center text-[10px] text-slate-400">
                    ................................
                  </div>
                </div>
                <div>
                  <p>مدير إدارة تموين مركز المحلة الكبرى</p>
                  <div className="h-12 flex items-end justify-center text-[10px] text-slate-400">
                    (خاتم شعار الجمهورية)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info (no-print) */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-600 no-print shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            <span>
              نظام الطباعة الحكومي A4 Landscape: كشوف الحصر، كشوف حساب المديونيات التفصيلية، وكشف نسب سداد ومديونيات المخابز مع تنبيهات المديونيات الكبرى (&gt; 20,000 ج.م).
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="px-6 py-2 bg-gradient-to-r from-red-700 to-rose-800 hover:from-red-600 hover:to-rose-700 text-white rounded-xl text-xs font-black cursor-pointer transition shadow-lg hover:scale-105 active:scale-95 border border-red-400 flex items-center gap-2"
          >
            <X className="w-4 h-4 text-rose-200 stroke-[2.5]" />
            <span>إغلاق النافذة (ESC)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
