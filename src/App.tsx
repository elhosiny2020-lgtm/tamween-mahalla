import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bakery,
  DebtRecord,
  VillageHierarchy,
  ColumnTitles,
  SystemConfig,
  AppUser,
  DailyAlertConfig,
  InboxChatMessage
} from './types';
import {
  AppState,
  loadInitialState,
  persistFullState,
  saveSessionUser,
  saveBackupToPartition,
  mergeAutoSaveOntoCurrent,
  autoDiscoverAndMergeAllDatabases,
  factoryReset,
  setupDiskAutoBackup,
  getActiveDiskBackupInfo,
  mergeStates
} from './storage';
import {
  DEFAULT_SYSTEM_CONFIG,
  DEFAULT_VILLAGES_HIERARCHY,
  DEFAULT_ISSUING_ENTITIES,
  DEFAULT_VIOLATION_TYPES,
  DEFAULT_ACTIVITY_STATUSES,
  DEFAULT_BAKERY_CATEGORIES,
  DEFAULT_BREAD_TYPES,
  DEFAULT_BREAD_TYPE_COUNTS,
  DEFAULT_LINE_TYPES,
  DEFAULT_FUEL_TYPES,
  PAYMENT_METHODS,
  DEFAULT_COLUMN_TITLES,
  INITIAL_BAKERIES,
  INITIAL_DEBTS,
  INITIAL_USERS,
  INITIAL_DAILY_TASKS,
  INITIAL_INBOX_MESSAGES,
  DEFAULT_OFFICIAL_LOGO
} from './defaultData';
import { formatDateDDMMYYYY } from './utils/auditHelper';
import { getExpirationAlerts } from './components/AlertsModal';
import { LoginModal } from './components/LoginModal';
import { HeaderCustomizerModal } from './components/HeaderCustomizerModal';
import { VillageManagerModal } from './components/VillageManagerModal';
import { BakeryModal } from './components/BakeryModal';
import { ColumnTitlesModal } from './components/ColumnTitlesModal';
import { AlertsModal } from './components/AlertsModal';
import { DebtsView } from './components/DebtsView';
import { ReportModal } from './components/ReportModal';
import { BackupModal } from './components/BackupModal';
import { UsersManagerModal } from './components/UsersManagerModal';
import { ActivityStatusModal } from './components/ActivityStatusModal';
import { WeeklyInstallmentsModal } from './components/WeeklyInstallmentsModal';
import { AuditModal } from './components/AuditModal';
import { BakeryAnalyticsCharts } from './components/BakeryAnalyticsCharts';
import { BakeryDebtsPieChart } from './components/BakeryDebtsPieChart';
import { LocalUnitsSummaryModal } from './components/LocalUnitsSummaryModal';
import { DailyAlertSettingsModal } from './components/DailyAlertSettingsModal';
import { DailyAlertNotificationModal } from './components/DailyAlertNotificationModal';
import { AnnualBudgetFrequencyModal } from './components/AnnualBudgetFrequencyModal';
import { AdminNotificationsDrawer } from './components/AdminNotificationsDrawer';
import { DailyTasksModal } from './components/DailyTasksModal';
import { SystemMasterEditorModal, DropdownCategoryKey } from './components/SystemMasterEditorModal';
import { AdvancedPermissionsModal } from './components/AdvancedPermissionsModal';
import { InboxChatModal } from './components/InboxChatModal';
import { DailyEntryBriefingModal } from './components/DailyEntryBriefingModal';
import { HighDebtAlertNotification } from './types';
import {
  downloadUpdatedAppHtml,
  downloadAppLauncherHtml,
  downloadMinistryDesktopShortcut,
  downloadWindowsDesktopInstallerBat,
  downloadWindowsExeLauncher,
  openStandaloneAppInNewTab
} from './utils/htmlExporter';
import { usePWAInstall } from './hooks/usePWAInstall';
import { hasPermission, getRoleNameArabic } from './permissions';

import {
  Store,
  Scale,
  Bell,
  MapPin,
  FileText,
  Settings,
  HardDrive,
  Users,
  LogOut,
  Download,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Printer,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Columns3,
  Calendar,
  Check,
  ChevronDown,
  Layers,
  ExternalLink,
  Lock,
  X,
  LayoutDashboard,
  Building,
  Receipt,
  ChevronLeft,
  Calculator,
  Building2,
  Database,
  Upload,
  Globe,
  BarChart3,
  PieChart,
  Table,
  ListTodo,
  Sliders,
  Inbox,
  RefreshCw
} from 'lucide-react';

const BAKERY_COLUMN_TOOLTIPS: Record<string, string> = {
  index: 'الرقم المسلسل للمخبز في السجل العام للإدارة',
  actions: 'أزرار التعديل الفوري لبيانات المخبز وحذف المخبز نهائياً من القاعدة',
  bakeryOwnerName: 'الاسم الثلاثي أو الرباعي لصاحب المخبز أو المرخص له بالتشغيل',
  machineNumber: 'رقم ماكينة صرف الخبز الذكية المسجلة بوزارة التموين',
  village: 'القرية الرئيسية المقام بها المخبز التابعة لمركز المحلة الكبرى',
  localUnit: 'الوحدة المحلية الإدارية المشرفة على نطاق المخبز',
  remainingDebt: 'إجمالي المديونيات والغرامات والفرق المالي المتبقي على المخبز بالجنيه المصري',
  insuranceQuota: 'الحصة التأمينية المقررة للمخبز من الدقيق بالشكائر يومياً',
  actualQuota: 'الحصة الفعلية المنصرفة للمخبز بناءً على متوسطات المبيعات',
  insuranceValue: 'إجمالي القيمة المالية للحصة التأمينية بالجنيه المصري',
  loavesCount: 'عدد الأرغفة المنتجة بناءً على حصة الدقيق (معدل 1250 رغيف/شكارة)',
  villagePopulation: 'عدد السكان المستهدفين بالقرية المخدومة من قبل المخبز',
  perCapitaAverage: 'متوسط نصيب الفرد اليومي من حصة الخبز بالقرية (علامة عشرية ورقمين فقط 0.00)',
  beneficiaries2023: 'عدد البطاقات والمستفيدين المسجلين لعام 2023',
  avg2023: 'متوسط الصرف اليومي للمستفيدين لعام 2023',
  beneficiaries2024: 'عدد البطاقات والمستفيدين المسجلين لعام 2024',
  avg2024: 'متوسط الصرف اليومي للمستفيدين لعام 2024',
  beneficiaries2025: 'عدد البطاقات والمستفيدين المسجلين لعام 2025',
  avg2025: 'متوسط الصرف اليومي المستهدف لعام 2025',
  avgDiff: 'معدل التغير والتطور السنوي في متوسط الصرف بين الأعوام',
  activityStatus: 'حالة تشغيل المخبز الحالية (يعمل، متوقف، ميعاد تصفية، مغلق بقرار)',
  bakeryCategory: 'نوع المخابز (بلدي مدعم، بلدي مطور، سياحي 72%، فينو وأفرنجي، طباقي)',
  breadType: 'نوع الخبز المنتجة (ماكينة، آلي، نصف آلي، بلدي طري، طابونة)',
  flourBagPrice: 'سعر شيكارة الدقيق التمويني المقررة للمخبز بالجنيه المصري',
  breadTypeCount: 'عدد خطوط السير والمجموعات الإنتاجية بالمخبز',
  lineType: 'نوع خط الإنتاج (ميكانيكي كامل، نصف آلي، يدوي)',
  fuelType: 'نوع الوقود المستخدم في الأفران (سولار، غاز طبيعي، مازوت)',
  phone: 'رقم هاتف صاحب المخبز أو المدير المسؤول للتواصل الفوري',
  nationalId: 'الرقم القومي (14 رقم) لصاحب المخبز المسجل بالبطاقة الشخصية',
  commercialRegDate: 'تاريخ انتهاء السجل التجاري المنظم لنشاط المخبز',
  bakeryLicenseDate: 'تاريخ انتهاء رخصة المخبز الصادرة من مجلس المدينة/المركز',
  leaseAgreementDate: 'تاريخ انتهاء عقد الإيجار أو الملكية لمقر المخبز',
  taxCardDate: 'تاريخ انتهاء البطاقة الضريبية ومتابعة الموقف الضريبي',
};

const ThHeaderTooltip: React.FC<{ label: string; tooltipKey: string; className?: string }> = ({
  label,
  tooltipKey,
  className = '',
}) => {
  const tooltipText = BAKERY_COLUMN_TOOLTIPS[tooltipKey];
  return (
    <div className={`group relative inline-flex items-center gap-1 justify-center cursor-help ${className}`}>
      <span>{label}</span>
      {tooltipText && (
        <div className="absolute bottom-full mb-1.5 hidden group-hover:block z-50 w-52 p-2 bg-slate-950 text-amber-300 text-[10px] font-bold rounded-xl shadow-2xl border border-amber-500/60 text-center pointer-events-none transition-all leading-tight">
          {tooltipText}
          <div className="w-2 h-2 bg-slate-950 border-r border-b border-amber-500/60 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
        </div>
      )}
    </div>
  );
};

export default function App() {
  const { isInstallable, install } = usePWAInstall();
  const [appState, setAppState] = useState<AppState | null>(null);
  const [activeTab, setActiveTab] = useState<'charts' | 'bakeries' | 'debts'>('bakeries');
  const [saveTimestamp, setSaveTimestamp] = useState<string>('');
  const [isSavingPulse, setIsSavingPulse] = useState(false);

  // Success Toast Notification on every data edit/save
  interface SaveToastInfo {
    id: number;
    message: string;
    timestamp: string;
  }
  const [saveToast, setSaveToast] = useState<SaveToastInfo | null>(null);
  const [logoutReason, setLogoutReason] = useState<string | null>(null);

  // Search & Filter state for main Bakery table
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('ALL');
  const [selectedUnit, setSelectedUnit] = useState('ALL');
  const [selectedActivity, setSelectedActivity] = useState('ALL');
  const [selectedDebtFilter, setSelectedDebtFilter] = useState<'ALL' | 'HAS_DEBT' | 'NO_DEBT'>('ALL');
  // Bakery Category Filter (الكل، بلدي مدعم، سياحي 72%، فينو وأفرنجي، طباقي)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  // License Expiry Timeline Filter (الكل، منتهية بالفعل، تنتهي خلال 30 يوماً، تنتهي خلال 60 يوماً، تنتهي خلال 90 يوماً، سارية لأكثر من 90 يوماً)
  const [selectedLicenseExpiryFilter, setSelectedLicenseExpiryFilter] = useState<
    'ALL' | 'EXPIRED' | 'WITHIN_30' | 'WITHIN_60' | 'WITHIN_90' | 'VALID'
  >('ALL');
  // Additional Dual/Multi-Filter Dropdowns (نوع الخبز + نوع الوقود وخط الإنتاج)
  const [selectedBreadTypeFilter, setSelectedBreadTypeFilter] = useState<string>('ALL');
  const [selectedFuelTypeFilter, setSelectedFuelTypeFilter] = useState<string>('ALL');

  // Expected Flour Bag Price (ج.م / شيكارة) for Annual Budget Estimation
  const [flourBagPrice, setFlourBagPrice] = useState<number>(750);

  // Selected Row for professional highlighting
  const [selectedBakeryRowId, setSelectedBakeryRowId] = useState<string | null>(null);

  // Cross-filtering to Debts Tab
  const [debtFilterBakeryId, setDebtFilterBakeryId] = useState<string | undefined>(undefined);

  // Modals state
  const [isBakeryModalOpen, setIsBakeryModalOpen] = useState(false);
  const [bakeryToEdit, setBakeryToEdit] = useState<Bakery | null>(null);

  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);
  const [isVillageModalOpen, setIsVillageModalOpen] = useState(false);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportModalInitialTab, setReportModalInitialTab] = useState<'bakeries' | 'debts' | 'bakery-debts' | 'users'>('bakeries');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isWeeklyInstallmentsModalOpen, setIsWeeklyInstallmentsModalOpen] = useState(false);
  const [selectedInstallmentBakeryId, setSelectedInstallmentBakeryId] = useState<string | undefined>(undefined);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isBudgetFrequencyModalOpen, setIsBudgetFrequencyModalOpen] = useState(false);
  const [isLocalUnitsModalOpen, setIsLocalUnitsModalOpen] = useState(false);
  const [isDailySettingsModalOpen, setIsDailySettingsModalOpen] = useState(false);
  const [isDailyTasksModalOpen, setIsDailyTasksModalOpen] = useState(false);
  const [isMasterEditorModalOpen, setIsMasterEditorModalOpen] = useState(false);
  const [isAdvancedPermissionsModalOpen, setIsAdvancedPermissionsModalOpen] = useState(false);
  const [isInboxModalOpen, setIsInboxModalOpen] = useState(false);
  const [isDailyBriefingModalOpen, setIsDailyBriefingModalOpen] = useState(false);
  const [masterEditorInitialCategory, setMasterEditorInitialCategory] = useState<DropdownCategoryKey>('ALL');
  const [dailyNotificationData, setDailyNotificationData] = useState<{
    isOpen: boolean;
    alertTime: string;
    expiredBakeries: { bakery: Bakery; docName: string; expiryDate: string; daysDiff: number }[];
  }>({
    isOpen: false,
    alertTime: '09:00',
    expiredBakeries: [],
  });
  const [isAdminDrawerOpen, setIsAdminDrawerOpen] = useState(false);

  // High Debt Notifications State for Admin Manager Control
  const [highDebtNotifications, setHighDebtNotifications] = useState<HighDebtAlertNotification[]>(() => {
    try {
      const saved = localStorage.getItem('TAMWEEN_HIGH_DEBT_NOTIFICATIONS');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Helper to append a high debt notification for managers
  const addHighDebtNotification = useCallback(
    (
      bakeryId: string,
      bakeryOwnerName: string,
      machineNumber: string,
      village: string,
      debtAmount: number,
      actionType: 'ADD_DEBT' | 'EDIT_DEBT' | 'HIGH_DEBT_SURGE'
    ) => {
      const newNotif: HighDebtAlertNotification = {
        id: `notif-${Date.now()}`,
        bakeryId,
        bakeryOwnerName,
        machineNumber,
        village,
        debtAmount,
        editedBy: appState?.currentUser?.fullName || 'مستخدم منظومة',
        editorRole: getRoleNameArabic(appState?.currentUser?.role || 'inspector'),
        timestamp: new Date().toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }),
        actionType,
        isRead: false,
      };
      setHighDebtNotifications((prev) => {
        const updated = [newNotif, ...prev];
        try {
          localStorage.setItem('TAMWEEN_HIGH_DEBT_NOTIFICATIONS', JSON.stringify(updated));
        } catch {
          // fallback
        }
        return updated;
      });
    },
    [appState?.currentUser]
  );

  // Format current Arabic clock timestamp
  const getArabicTimestamp = () => {
    const d = new Date();
    return d.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  // Initial State Loading with 350ms failsafe timeout
  useEffect(() => {
    let hasLoaded = false;

    // Failsafe timer: if storage loading takes longer than 350ms, open app immediately with preloaded or defaults!
    const failsafe = setTimeout(() => {
      if (!hasLoaded) {
        hasLoaded = true;
        const preloaded = typeof window !== 'undefined'
          ? (window as unknown as { PRELOADED_TAMWEEN_STATE?: Partial<AppState> }).PRELOADED_TAMWEEN_STATE
          : undefined;
        setAppState({
          bakeries: preloaded?.bakeries ?? INITIAL_BAKERIES,
          debts: preloaded?.debts ?? INITIAL_DEBTS,
          villages: preloaded?.villages ?? DEFAULT_VILLAGES_HIERARCHY,
          issuingEntities: preloaded?.issuingEntities ?? DEFAULT_ISSUING_ENTITIES,
          violationTypes: preloaded?.violationTypes ?? DEFAULT_VIOLATION_TYPES,
          activityStatuses: preloaded?.activityStatuses ?? DEFAULT_ACTIVITY_STATUSES,
          bakeryCategories: preloaded?.bakeryCategories ?? DEFAULT_BAKERY_CATEGORIES,
          breadTypes: preloaded?.breadTypes ?? DEFAULT_BREAD_TYPES,
          breadTypeCounts: preloaded?.breadTypeCounts ?? DEFAULT_BREAD_TYPE_COUNTS,
          lineTypes: preloaded?.lineTypes ?? DEFAULT_LINE_TYPES,
          fuelTypes: preloaded?.fuelTypes ?? DEFAULT_FUEL_TYPES,
          paymentMethods: preloaded?.paymentMethods ?? PAYMENT_METHODS,
          dailyTasks: preloaded?.dailyTasks ?? INITIAL_DAILY_TASKS,
          columnTitles: preloaded?.columnTitles ?? DEFAULT_COLUMN_TITLES,
          systemConfig: preloaded?.systemConfig ?? DEFAULT_SYSTEM_CONFIG,
          users: preloaded?.users ?? INITIAL_USERS,
          currentUser: null,
        });
        setSaveTimestamp(getArabicTimestamp());
      }
    }, 350);

    loadInitialState()
      .then((state) => {
        if (!hasLoaded) {
          hasLoaded = true;
          clearTimeout(failsafe);
          setAppState(state);
          setSaveTimestamp(getArabicTimestamp());
        }
      })
      .catch((err) => {
        if (!hasLoaded) {
          hasLoaded = true;
          clearTimeout(failsafe);
          console.error('loadInitialState catch:', err);
          setAppState({
            bakeries: INITIAL_BAKERIES,
            debts: INITIAL_DEBTS,
            villages: DEFAULT_VILLAGES_HIERARCHY,
            issuingEntities: DEFAULT_ISSUING_ENTITIES,
            violationTypes: DEFAULT_VIOLATION_TYPES,
            activityStatuses: DEFAULT_ACTIVITY_STATUSES,
            bakeryCategories: DEFAULT_BAKERY_CATEGORIES,
            breadTypes: DEFAULT_BREAD_TYPES,
            breadTypeCounts: DEFAULT_BREAD_TYPE_COUNTS,
            lineTypes: DEFAULT_LINE_TYPES,
            fuelTypes: DEFAULT_FUEL_TYPES,
            paymentMethods: PAYMENT_METHODS,
            dailyTasks: INITIAL_DAILY_TASKS,
            inboxMessages: INITIAL_INBOX_MESSAGES,
            columnTitles: DEFAULT_COLUMN_TITLES,
            systemConfig: DEFAULT_SYSTEM_CONFIG,
            users: INITIAL_USERS,
            currentUser: null,
          });
          setSaveTimestamp(getArabicTimestamp());
        }
      });

    return () => clearTimeout(failsafe);
  }, []);

  // Open Daily Entry Briefing Modal automatically once when user enters the database
  const [hasShownDailyBriefingSession, setHasShownDailyBriefingSession] = useState(false);
  useEffect(() => {
    if (appState?.currentUser && !hasShownDailyBriefingSession) {
      setHasShownDailyBriefingSession(true);
      setIsDailyBriefingModalOpen(true);
    }
  }, [appState?.currentUser, hasShownDailyBriefingSession]);

  // Save helper that updates storage, timestamp, visual pulse, and displays success toast
  const triggerSave = useCallback((newState: AppState, toastMessage?: string) => {
    setAppState(newState);
    setIsSavingPulse(true);
    const ts = getArabicTimestamp();
    setSaveTimestamp(ts);
    const diskInfo = getActiveDiskBackupInfo();
    const diskSuffix = diskInfo.hasHandle ? ` (وتحديث النسخة الاحتياطية على القرص: ${diskInfo.fileName})` : '';
    const msg = (toastMessage || 'تم حفظ وتأمين كافة البيانات بنجاح') + diskSuffix;
    setSaveToast({ id: Date.now(), message: msg, timestamp: ts });
    persistFullState(newState).then(() => {
      setTimeout(() => setIsSavingPulse(false), 900);
    });
  }, []);

  // Auto-dismiss save toast after 3.8 seconds
  useEffect(() => {
    if (saveToast) {
      const timer = setTimeout(() => {
        setSaveToast(null);
      }, 3800);
      return () => clearTimeout(timer);
    }
  }, [saveToast]);

  // Periodic 15-second heartbeat saving check
  useEffect(() => {
    const interval = setInterval(() => {
      if (appState) {
        persistFullState(appState);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [appState]);

  // Automated Daily License Expiry Alert Check Loop (Checks every 30 seconds)
  useEffect(() => {
    if (!appState) return;
    const dailyConfig = appState.systemConfig?.dailyAlertConfig;
    if (!dailyConfig || dailyConfig.enabled === false) return;

    const checkDailyAlert = () => {
      const now = new Date();
      const currentHour = String(now.getHours()).padStart(2, '0');
      const currentMinute = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHour}:${currentMinute}`;
      const todayDateStr = now.toISOString().split('T')[0];

      // Check if current time matches scheduled alert time and hasn't fired today
      if (currentTimeStr === dailyConfig.alertTime && dailyConfig.lastAlertDate !== todayDateStr) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetDocs = dailyConfig.targetDocs && dailyConfig.targetDocs.length > 0
          ? dailyConfig.targetDocs
          : ['bakeryLicenseDate', 'commercialRegDate', 'leaseAgreementDate', 'taxCardDate'];
        const threshold = dailyConfig.daysThreshold ?? 0;

        const docLabels: Record<string, string> = {
          bakeryLicenseDate: 'رخصة تشغيل المخبز التمويني',
          commercialRegDate: 'السجل التجاري',
          leaseAgreementDate: 'عقد الإيجار / الملكية',
          taxCardDate: 'البطاقة الضريبية',
        };

        const matches: { bakery: Bakery; docName: string; expiryDate: string; daysDiff: number }[] = [];

        appState.bakeries.forEach((b) => {
          targetDocs.forEach((docKey) => {
            const dateStr = (b as any)[docKey];
            if (!dateStr || !String(dateStr).trim()) return;
            const d = new Date(String(dateStr).trim());
            if (isNaN(d.getTime())) return;
            d.setHours(0, 0, 0, 0);

            const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= threshold) {
              matches.push({
                bakery: b,
                docName: docLabels[docKey] || docKey,
                expiryDate: dateStr,
                daysDiff: diffDays,
              });
            }
          });
        });

        if (matches.length > 0) {
          setDailyNotificationData({
            isOpen: true,
            alertTime: dailyConfig.alertTime,
            expiredBakeries: matches,
          });

          // Web Notification API
          if (dailyConfig.notifyBrowser && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('🔔 إخطار إداري يومي - تموين المحلة الكبرى', {
                body: `تذكير يومي (${dailyConfig.alertTime}): يوجد عدد (${matches.length}) مخابز منتهية التراخيص تتطلب المتابعة الفورية.`,
                icon: '/favicon.ico',
              });
            } catch {
              // fallback
            }
          }

          // Mark today as alerted to avoid multiple firings today
          const updatedConfig: DailyAlertConfig = {
            ...dailyConfig,
            lastAlertDate: todayDateStr,
          };
          triggerSave({
            ...appState,
            systemConfig: {
              ...appState.systemConfig,
              dailyAlertConfig: updatedConfig,
            },
          });
        }
      }
    };

    checkDailyAlert();
    const interval = setInterval(checkDailyAlert, 30000);
    return () => clearInterval(interval);
  }, [appState]);

  const handleSaveDailyAlertConfig = (updatedConfig: DailyAlertConfig) => {
    if (!appState) return;
    const updatedState = {
      ...appState,
      systemConfig: {
        ...appState.systemConfig,
        dailyAlertConfig: updatedConfig,
      },
    };
    triggerSave(updatedState, `تم حفظ وتأكيد موعد التنبيه اليومي (${updatedConfig.alertTime}) بنجاح`);
  };

  const handleTriggerTestAlert = (matchingBakeries: { bakery: Bakery; docName: string; expiryDate: string; daysDiff: number }[]) => {
    const alertTime = appState?.systemConfig?.dailyAlertConfig?.alertTime || '09:00';
    setDailyNotificationData({
      isOpen: true,
      alertTime,
      expiredBakeries: matchingBakeries,
    });
  };

  // Expiration alerts engine scan
  const alertsList = useMemo(() => {
    if (!appState) return [];
    return getExpirationAlerts(appState.bakeries);
  }, [appState]);

  // Compute map of remaining debts per bakery
  const bakeryRemainingDebtsMap = useMemo(() => {
    if (!appState) return {};
    const map: Record<string, number> = {};
    appState.debts.forEach((d) => {
      map[d.bakeryId] = (map[d.bakeryId] || 0) + (d.netRemainingDebt || 0);
    });
    return map;
  }, [appState]);

  // List of bakeries with debts > 20,000 EGP requiring weekly installments
  const largeDebtsList = useMemo(() => {
    if (!appState) return [];
    return appState.bakeries
      .map((b) => ({
        bakery: b,
        totalDebt: bakeryRemainingDebtsMap[b.id] || 0,
      }))
      .filter((item) => item.totalDebt > 20000)
      .sort((a, b) => b.totalDebt - a.totalDebt);
  }, [appState, bakeryRemainingDebtsMap]);

  // Dynamic units for selected village filter (all units or village-specific)
  const availableUnitsFilter = useMemo(() => {
    if (!appState) return [];
    if (selectedVillage !== 'ALL') {
      const v = appState.villages.find((x) => x.village === selectedVillage);
      return v ? v.localUnits : [];
    }
    const set = new Set<string>();
    appState.villages.forEach((v) => v.localUnits.forEach((u) => set.add(u)));
    return Array.from(set);
  }, [appState, selectedVillage]);

  // Precompute count of bakeries expiring across timeline intervals
  const licenseExpiryCounts = useMemo(() => {
    if (!appState) return { expired: 0, within30: 0, within60: 0, within90: 0, valid: 0 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let expired = 0;
    let within30 = 0;
    let within60 = 0;
    let within90 = 0;
    let valid = 0;

    appState.bakeries.forEach((b) => {
      const datesToCheck = [
        b.bakeryLicenseDate,
        b.commercialRegDate,
        b.leaseAgreementDate,
        b.taxCardDate,
      ].filter(Boolean);

      let minDays = Infinity;
      datesToCheck.forEach((dStr) => {
        if (!dStr) return;
        const d = new Date(dStr);
        if (!isNaN(d.getTime())) {
          d.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 3600 * 24));
          if (diffDays < minDays) minDays = diffDays;
        }
      });

      if (datesToCheck.length === 0) {
        valid++;
      } else {
        if (minDays < 0) expired++;
        if (minDays <= 30) within30++;
        if (minDays <= 60) within60++;
        if (minDays <= 90) within90++;
        if (minDays > 90) valid++;
      }
    });

    return { expired, within30, within60, within90, valid };
  }, [appState]);

  // Precompute bakery category counts
  const categoryCounts = useMemo(() => {
    if (!appState) return { baladi: 0, baladiMotawar: 0, tourist: 0, fino: 0, tabaqi: 0 };
    let baladi = 0, baladiMotawar = 0, tourist = 0, fino = 0, tabaqi = 0;
    appState.bakeries.forEach((b) => {
      const cat = b.bakeryCategory || 'مخبز بلدي مدعم';
      if (cat.includes('مطور')) baladiMotawar++;
      else if (cat.includes('سياحي')) tourist++;
      else if (cat.includes('فينو')) fino++;
      else if (cat.includes('طباقي')) tabaqi++;
      else baladi++;
    });
    return { baladi, baladiMotawar, tourist, fino, tabaqi };
  }, [appState]);

  // Filtered bakeries for main table
  const filteredBakeries = useMemo(() => {
    const today = new Date();
    if (!appState) return [];

    return appState.bakeries.filter((b) => {
      if (selectedVillage !== 'ALL' && b.village !== selectedVillage) return false;
      if (selectedUnit !== 'ALL' && b.localUnit !== selectedUnit) return false;
      if (selectedActivity !== 'ALL' && b.activityStatus !== selectedActivity) return false;

      // Filter by Bakery Category (تصنيف المخبز)
      if (selectedCategoryFilter !== 'ALL') {
        const cat = b.bakeryCategory || 'مخبز بلدي مدعم';
        if (!cat.includes(selectedCategoryFilter)) return false;
      }

      const debt = bakeryRemainingDebtsMap[b.id] || 0;
      if (selectedDebtFilter === 'HAS_DEBT' && debt <= 0) return false;
      if (selectedDebtFilter === 'NO_DEBT' && debt > 0) return false;

      // Filter by License Expiry timeline
      if (selectedLicenseExpiryFilter !== 'ALL') {
        const datesToCheck = [
          b.bakeryLicenseDate,
          b.commercialRegDate,
          b.leaseAgreementDate,
          b.taxCardDate,
        ].filter(Boolean);

        // Find the earliest expiration days remaining among all docs
        let minDaysRemaining = Infinity;
        datesToCheck.forEach((dStr) => {
          if (!dStr) return;
          const d = new Date(dStr);
          if (!isNaN(d.getTime())) {
            d.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 3600 * 24));
            if (diffDays < minDaysRemaining) {
              minDaysRemaining = diffDays;
            }
          }
        });

        if (datesToCheck.length === 0) {
          // If no dates set, exclude unless viewing all
          if (selectedLicenseExpiryFilter !== 'VALID') return false;
        } else {
          switch (selectedLicenseExpiryFilter) {
            case 'EXPIRED':
              if (minDaysRemaining >= 0) return false;
              break;
            case 'WITHIN_30':
              // Either already expired or expires within 30 days
              if (minDaysRemaining > 30) return false;
              break;
            case 'WITHIN_60':
              // Expires within 60 days
              if (minDaysRemaining > 60) return false;
              break;
            case 'WITHIN_90':
              // Expires within 90 days
              if (minDaysRemaining > 90) return false;
              break;
            case 'VALID':
              // Valid for more than 90 days
              if (minDaysRemaining <= 90) return false;
              break;
          }
        }
      }

      // Dual/Multi Filter: Bread Type (نوع الخبز)
      if (selectedBreadTypeFilter !== 'ALL' && b.breadType !== selectedBreadTypeFilter) {
        return false;
      }

      // Dual/Multi Filter: Fuel Type / Line Type (نوع الوقود / خط الإنتاج)
      if (
        selectedFuelTypeFilter !== 'ALL' &&
        b.fuelType !== selectedFuelTypeFilter &&
        b.lineType !== selectedFuelTypeFilter
      ) {
        return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          b.bakeryOwnerName.toLowerCase().includes(q) ||
          b.machineNumber.includes(q) ||
          b.village.toLowerCase().includes(q) ||
          b.localUnit.toLowerCase().includes(q) ||
          b.phone.includes(q) ||
          b.nationalId.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    appState,
    selectedVillage,
    selectedUnit,
    selectedActivity,
    selectedDebtFilter,
    selectedCategoryFilter,
    selectedLicenseExpiryFilter,
    selectedBreadTypeFilter,
    selectedFuelTypeFilter,
    searchTerm,
    bakeryRemainingDebtsMap,
  ]);

  // Statistics for bakeries
  const bakeryStats = useMemo(() => {
    if (!appState) return { count: 0, totalInsurance: 0, totalActual: 0, totalLoaves: 0, totalDebts: 0 };
    let totalInsurance = 0;
    let totalActual = 0;
    let totalLoaves = 0;
    let totalDebts = 0;

    appState.bakeries.forEach((b) => {
      totalInsurance += b.insuranceQuota || 0;
      totalActual += b.actualQuota || 0;
      totalLoaves += b.loavesCount || 0;
      totalDebts += bakeryRemainingDebtsMap[b.id] || 0;
    });

    return {
      count: appState.bakeries.length,
      totalInsurance,
      totalActual,
      totalLoaves,
      totalDebts,
    };
  }, [appState, bakeryRemainingDebtsMap]);

  // Keep fresh ref of appState for 10-min pre-logout autosave
  const appStateRef = React.useRef(appState);
  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  // Handle Logout (Terminates session safely without resetting data)
  const handleLogout = useCallback((reason?: string) => {
    saveSessionUser(null);
    setLogoutReason(reason || null);
    setAppState((prev) => (prev ? { ...prev, currentUser: null } : null));
  }, []);

  // Global fast Escape key listener to close any open modal immediately without lag
  useEffect(() => {
    const handleGlobalEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (isReportModalOpen) { setIsReportModalOpen(false); return; }
        if (isInboxModalOpen) { setIsInboxModalOpen(false); return; }
        if (isAdvancedPermissionsModalOpen) { setIsAdvancedPermissionsModalOpen(false); return; }
        if (isUsersModalOpen) { setIsUsersModalOpen(false); return; }
        if (isBackupModalOpen) { setIsBackupModalOpen(false); return; }
        if (isMasterEditorModalOpen) { setIsMasterEditorModalOpen(false); return; }
        if (isDailyTasksModalOpen) { setIsDailyTasksModalOpen(false); return; }
        if (isAlertsModalOpen) { setIsAlertsModalOpen(false); return; }
        if (isDailyBriefingModalOpen) { setIsDailyBriefingModalOpen(false); return; }
        if (isWeeklyInstallmentsModalOpen) { setIsWeeklyInstallmentsModalOpen(false); return; }
        if (isLocalUnitsModalOpen) { setIsLocalUnitsModalOpen(false); return; }
        if (isAuditModalOpen) { setIsAuditModalOpen(false); return; }
        if (isBudgetFrequencyModalOpen) { setIsBudgetFrequencyModalOpen(false); return; }
        if (isBakeryModalOpen) { setIsBakeryModalOpen(false); return; }
        if (isHeaderModalOpen) { setIsHeaderModalOpen(false); return; }
        if (isVillageModalOpen) { setIsVillageModalOpen(false); return; }
        if (isColumnModalOpen) { setIsColumnModalOpen(false); return; }
        if (isActivityModalOpen) { setIsActivityModalOpen(false); return; }
        if (isDailySettingsModalOpen) { setIsDailySettingsModalOpen(false); return; }
      }
    };
    window.addEventListener('keydown', handleGlobalEscape, true);
    return () => window.removeEventListener('keydown', handleGlobalEscape, true);
  }, [
    isReportModalOpen,
    isInboxModalOpen,
    isAdvancedPermissionsModalOpen,
    isUsersModalOpen,
    isBackupModalOpen,
    isMasterEditorModalOpen,
    isDailyTasksModalOpen,
    isAlertsModalOpen,
    isDailyBriefingModalOpen,
    isWeeklyInstallmentsModalOpen,
    isLocalUnitsModalOpen,
    isAuditModalOpen,
    isBudgetFrequencyModalOpen,
    isBakeryModalOpen,
    isHeaderModalOpen,
    isVillageModalOpen,
    isColumnModalOpen,
    isActivityModalOpen,
    isDailySettingsModalOpen,
  ]);

  // Auto-logout when user leaves the computer / idle for 10 minutes (with automatic full pre-logout save)
  useEffect(() => {
    if (!appState?.currentUser) return;

    let idleTimeout: ReturnType<typeof setTimeout>;
    const IDLE_LIMIT_MS = 10 * 60 * 1000; // 10 minutes of inactivity

    const resetIdleTimer = () => {
      clearTimeout(idleTimeout);
      idleTimeout = setTimeout(async () => {
        // Pre-logout autosave of all registered data
        if (appStateRef.current) {
          try {
            await persistFullState(appStateRef.current);
          } catch (e) {
            console.error('Pre-logout autosave failed:', e);
          }
        }
        handleLogout('تم الحفظ التلقائي لجميع البيانات وقفل الشاشة وتأمين تسجيل الخروج التلقائي لعدم وجود نشاط لمدة 10 دقائق.');
      }, IDLE_LIMIT_MS);
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    // Auto-logout when leaving the computer (closing tab / window or navigating away)
    const handlePageExit = () => {
      saveSessionUser(null);
    };
    window.addEventListener('pagehide', handlePageExit);
    window.addEventListener('beforeunload', handlePageExit);

    return () => {
      clearTimeout(idleTimeout);
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetIdleTimer));
      window.removeEventListener('pagehide', handlePageExit);
      window.removeEventListener('beforeunload', handlePageExit);
    };
  }, [appState?.currentUser, handleLogout]);

  if (!appState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-sans">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-base font-black">جاري تحميل المنظومة التموينية وقاعدة البيانات...</h2>
          <p className="text-xs text-amber-200">مديرية التموين بالغربية - إدارة تموين مركز المحلة الكبرى</p>
        </div>
      </div>
    );
  }

  // Helper to perform non-destructive Gmail / Google Drive JSON merge on user login or registration
  const performGmailDriveAdditiveMerge = (baseState: AppState, user: AppUser): AppState => {
    const gmail =
      user.gmailEmail ||
      localStorage.getItem('TAMWEEN_GMAIL_DRIVE_EMAIL') ||
      baseState.systemConfig.gmailEmail ||
      '';
    if (!gmail.trim()) {
      return { ...baseState, currentUser: user };
    }
    const gmailKey = gmail.trim().toLowerCase();
    let workingState = { ...baseState, currentUser: user };

    const sources = [
      localStorage.getItem(`TAMWEEN_GMAIL_DRIVE_SYNC_${gmailKey}`),
      localStorage.getItem('TAMWEEN_CUSTOM_BACKUP_PAYLOAD'),
    ].filter(Boolean) as string[];

    sources.forEach((rawStr) => {
      try {
        const parsed = JSON.parse(rawStr);
        const sourceData = parsed.data || parsed.state || parsed;
        if (sourceData && (Array.isArray(sourceData.bakeries) || Array.isArray(sourceData.debts))) {
          const merged = mergeStates(workingState, sourceData as Partial<AppState>);
          workingState = {
            ...merged,
            currentUser: user,
            systemConfig: {
              ...merged.systemConfig,
              gmailEmail: gmail.trim(),
              googleDriveAutoSync: true,
              logoBase64: DEFAULT_OFFICIAL_LOGO,
            },
          };
        }
      } catch {
        // ignore invalid JSON cache
      }
    });

    return workingState;
  };

  // If not logged in, show Animated Login
  if (!appState.currentUser) {
    return (
      <LoginModal
        systemConfig={appState.systemConfig}
        users={appState.users}
        logoutReason={logoutReason}
        onLoginSuccess={(user) => {
          setLogoutReason(null);
          saveSessionUser(user);
          const mergedState = performGmailDriveAdditiveMerge(appState, user);
          const updatedUsers = mergedState.users.map((u) => (u.id === user.id ? { ...u, ...user } : u));
          const finalState: AppState = { ...mergedState, users: updatedUsers, currentUser: user };
          triggerSave(
            finalState,
            user.gmailEmail
              ? `تم الدخول ودمج ملفات JSON المرتبطة بجيميل (${user.gmailEmail}) تلقائياً بدون حذف أي بيانات`
              : 'تم تسجيل الدخول وفتح شاشة التنبيه اليومي بنجاح'
          );
          setIsDailyBriefingModalOpen(true);
        }}
        onRegisterUser={(newUser) => {
          const baseWithUser: AppState = {
            ...appState,
            users: [...appState.users, newUser],
          };
          const mergedState = performGmailDriveAdditiveMerge(baseWithUser, newUser);
          triggerSave(
            { ...mergedState, currentUser: null },
            newUser.gmailEmail
              ? `تم تسجيل الحساب وربطه بجيميل (${newUser.gmailEmail}) ودمج ملفات JSON بدون حذف أي بيانات`
              : 'تم تسجيل وحفظ المستخدم الجديد بنجاح'
          );
        }}
      />
    );
  }

  // Inbox Messages Helpers
  const inboxMessages = appState.inboxMessages || INITIAL_INBOX_MESSAGES;
  const unreadInboxCount = inboxMessages.filter(
    (m) => !m.readBy || !m.readBy.includes(appState.currentUser?.username || 'admin')
  ).length;

  const handleSendInboxMessage = (msgInput: Omit<InboxChatMessage, 'id' | 'timestamp' | 'readBy'>) => {
    const newMsg: InboxChatMessage = {
      ...msgInput,
      id: `msg-${Date.now()}`,
      timestamp: new Date().toLocaleString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      readBy: [appState.currentUser?.username || 'admin'],
    };
    const updatedMessages = [...inboxMessages, newMsg];
    triggerSave(
      { ...appState, inboxMessages: updatedMessages },
      'تم إرسال الرسالة / التعليمات الإدارية إلى صندوق الوارد لجميع الأطراف بنجاح'
    );
  };

  const handleDeleteInboxMessage = (msgId: string) => {
    const updatedMessages = inboxMessages.filter((m) => m.id !== msgId);
    triggerSave({ ...appState, inboxMessages: updatedMessages }, 'تم حذف الرسالة من صندوق الوارد');
  };

  const handleMarkAllInboxRead = () => {
    const username = appState.currentUser?.username || 'admin';
    const hasUnread = inboxMessages.some((m) => !m.readBy || !m.readBy.includes(username));
    if (!hasUnread) return;
    const updatedMessages = inboxMessages.map((m) => ({
      ...m,
      readBy: Array.from(new Set([...(m.readBy || []), username])),
    }));
    setAppState((prev) => (prev ? { ...prev, inboxMessages: updatedMessages } : null));
    persistFullState({ ...appState, inboxMessages: updatedMessages });
  };

  // Handlers for Bakery
  const handleSaveBakery = (bakery: Bakery) => {
    const existingIndex = appState.bakeries.findIndex((b) => b.id === bakery.id);
    let updated: Bakery[];
    if (existingIndex >= 0) {
      updated = [...appState.bakeries];
      updated[existingIndex] = bakery;
    } else {
      updated = [bakery, ...appState.bakeries];
    }
    triggerSave(
      { ...appState, bakeries: updated },
      existingIndex >= 0 ? `تم حفظ وتعديل بيانات مخبز (${bakery.bakeryOwnerName}) بنجاح` : `تم إضافة وحفظ بيانات مخبز (${bakery.bakeryOwnerName}) بنجاح`
    );
  };

  const handleDeleteBakery = (bakeryId: string, ownerName: string) => {
    if (!hasPermission(appState.currentUser, 'DELETE_BAKERY', appState.systemConfig)) {
      alert('عفواً، حذف المخبز يتطلب صلاحيات مدير النظام الصريحة.');
      return;
    }
    if (confirm(`هل أنت متأكد من حذف المخبز الخاص بـ "${ownerName}" نهائياً من المنظومة؟`)) {
      const updated = appState.bakeries.filter((b) => b.id !== bakeryId);
      triggerSave({ ...appState, bakeries: updated }, `تم حذف مخبز (${ownerName}) وتحديث قاعدة البيانات بنجاح`);
    }
  };

  // Handlers for Debts
  const handleSaveDebt = (debt: DebtRecord) => {
    const existingIndex = appState.debts.findIndex((d) => d.id === debt.id);
    let updated: DebtRecord[];
    if (existingIndex >= 0) {
      updated = [...appState.debts];
      updated[existingIndex] = debt;
    } else {
      updated = [debt, ...appState.debts];
    }

    if (debt.netRemainingDebt >= 50000) {
      addHighDebtNotification(
        debt.bakeryId,
        debt.bakeryOwnerName,
        debt.machineNumber,
        debt.village,
        debt.netRemainingDebt,
        existingIndex >= 0 ? 'EDIT_DEBT' : 'ADD_DEBT'
      );
    }

    triggerSave(
      { ...appState, debts: updated },
      existingIndex >= 0 ? 'تم تعديل وحفظ قيد المديونية بنجاح' : 'تم إضافة وتسجيل قيد المديونية بنجاح'
    );
  };

  const handleDeleteDebt = (debtId: string) => {
    if (!hasPermission(appState.currentUser, 'DELETE_DEBT', appState.systemConfig)) {
      alert('عفواً، حذف قيد المديونية يتطلب صلاحيات مدير النظام الصريحة.');
      return;
    }
    const updated = appState.debts.filter((d) => d.id !== debtId);
    triggerSave({ ...appState, debts: updated }, 'تم حذف قيد المديونية وتحديث قاعدة البيانات بنجاح');
  };

  // Quick 1-click partition save
  const handleQuickPartitionSave = async () => {
    const payload = {
      version: '3.0',
      timestamp: new Date().toISOString(),
      governorate: appState.systemConfig.governorateTitle,
      directorate: appState.systemConfig.directorateTitle,
      administration: appState.systemConfig.administrationTitle,
      data: {
        bakeries: appState.bakeries,
        debts: appState.debts,
        villages: appState.villages,
        issuingEntities: appState.issuingEntities,
        violationTypes: appState.violationTypes,
        activityStatuses: appState.activityStatuses,
        columnTitles: appState.columnTitles,
        systemConfig: appState.systemConfig,
        users: appState.users,
      },
    };
    const res = await saveBackupToPartition(payload);
    alert(res.message);
  };

  // Main Bakery table CSV export
  const handleExportBakeryCSV = () => {
    const ct = appState.columnTitles;
    const headers = [
      ct.index,
      ct.bakeryOwnerName,
      ct.machineNumber,
      ct.village,
      ct.localUnit,
      ct.remainingDebt,
      ct.insuranceValue,
      ct.insuranceQuota,
      ct.actualQuota,
      ct.loavesCount,
      ct.perCapitaAverage,
      ct.villagePopulation,
      ct.beneficiaries2023,
      ct.beneficiaries2024,
      ct.beneficiaries2025,
      ct.avg2023,
      ct.avg2024,
      ct.avg2025,
      ct.avgDiff,
      ct.activityStatus,
      ct.bakeryCategory,
      ct.breadType,
      ct.flourBagPrice || 'سعر الشيكارة',
      ct.breadTypeCount,
      ct.lineType,
      ct.fuelType,
      ct.phone,
      ct.nationalId,
      ct.commercialRegDate,
      ct.bakeryLicenseDate,
      ct.leaseAgreementDate,
      ct.taxCardDate,
    ];

    const rows = filteredBakeries.map((b, idx) => [
      idx + 1,
      `"${b.bakeryOwnerName.replace(/"/g, '""')}"`,
      `"${b.machineNumber}"`,
      `"${b.village}"`,
      `"${b.localUnit}"`,
      bakeryRemainingDebtsMap[b.id] || 0,
      b.insuranceValue,
      b.insuranceQuota,
      b.actualQuota,
      b.loavesCount,
      Number(b.perCapitaAverage || 0).toFixed(2),
      b.villagePopulation,
      b.beneficiaries2023,
      b.beneficiaries2024,
      b.beneficiaries2025,
      b.avg2023,
      b.avg2024,
      b.avg2025,
      b.avgDiff,
      `"${b.activityStatus}"`,
      `"${b.bakeryCategory || 'مخبز بلدي مدعم'}"`,
      `"${b.breadType}"`,
      b.flourBagPrice ?? 950,
      b.breadTypeCount,
      `"${b.lineType}"`,
      `"${b.fuelType}"`,
      `"${b.phone}"`,
      `"${b.nationalId}"`,
      `"${b.commercialRegDate}"`,
      `"${b.bakeryLicenseDate}"`,
      `"${b.leaseAgreementDate}"`,
      `"${b.taxCardDate}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `قاعدة_بيانات_مخابز_مركز_المحلة_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const ct = appState.columnTitles;

  return (
    <div className="min-h-screen flex flex-col bg-black text-slate-100 font-sans selection:bg-amber-400 selection:text-black">
      {/* 1. Official Governmental Header Bar */}
      <header className="bg-gradient-to-r from-black via-slate-950 to-black text-white shadow-2xl border-b-2 border-amber-500/40 relative z-30 no-print">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Right: Emblem and Titles */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsHeaderModalOpen(true)}
              title="انقر لتخصيص الهوية والترويسة والشعار"
              className="w-14 h-14 rounded-full bg-white p-1 border-2 border-amber-400 hover:border-amber-300 shadow-md flex items-center justify-center shrink-0 cursor-pointer transition hover:scale-105"
            >
              <img
                src={appState.systemConfig.logoBase64}
                alt="شعار وزارة التموين"
                className="w-full h-full object-contain"
              />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-black bg-amber-400 px-2.5 py-0.5 rounded shadow-sm tracking-wider border border-amber-300">
                  جمهورية مصر العربية
                </span>
                <span className="text-[11px] font-bold text-slate-300">
                  - وزارة التموين والتجارة الداخلية
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.2 rounded-full font-bold">
                  {appState.systemConfig.governorateTitle}
                </span>
              </div>
              <h1 className="text-base font-black text-white leading-snug">
                {appState.systemConfig.directorateTitle}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-black text-black bg-amber-400 px-2.5 py-0.5 rounded shadow-sm border border-amber-300">
                  {appState.systemConfig.administrationTitle}
                </span>
                <span className="text-[10px] text-slate-300 font-mono">
                  {appState.systemConfig.englishSubtitle}
                </span>
              </div>
            </div>
          </div>

          {/* Left: Live Saving Indicator & User / Logout */}
          <div className="flex items-center gap-3">
            {/* Live Autosave Indicator */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black border transition-all ${
                isSavingPulse
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 scale-105'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isSavingPulse ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'
                }`}
              />
              <span>تم الحفظ تلقائياً بنجاح ({saveTimestamp})</span>
            </div>

            {/* User Badge with Lock on Computer Exit */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Inbox Chat & Instructions Button (صندوق الوارد) */}
              <button
                type="button"
                onClick={() => setIsInboxModalOpen(true)}
                className="relative inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 hover:from-indigo-600 hover:to-blue-600 text-white rounded-lg text-xs font-black shadow border border-indigo-400/60 hover:scale-105 active:scale-95 transition cursor-pointer"
                title="صندوق الوارد والشات الإداري الداخلي لتبادل التعليمات بين جميع المستخدمين والأطراف"
              >
                <Inbox className="w-4 h-4 text-amber-300" />
                <span>صندوق الوارد</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                  {unreadInboxCount > 0 ? `${unreadInboxCount} جديد` : inboxMessages.length}
                </span>
              </button>

              {/* Daily Entry Briefing Screen Button */}
              <button
                type="button"
                onClick={() => setIsDailyBriefingModalOpen(true)}
                className="relative inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-500 hover:to-orange-600 text-white rounded-lg text-xs font-black shadow border border-amber-400/60 hover:scale-105 active:scale-95 transition cursor-pointer"
                title="شاشة التنبيه اليومي الشاملة لجميع المديونيات والوثائق والتراخيص والعقود المنتهية"
              >
                <AlertTriangle className="w-4 h-4 text-amber-200" />
                <span>شاشة التنبيه اليومي</span>
              </button>

              {/* Manager Admin Notifications Sidebar Button */}
              <button
                type="button"
                onClick={() => setIsAdminDrawerOpen(true)}
                className="relative inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-950 via-slate-900 to-red-900 text-white rounded-lg text-xs font-black shadow border border-red-500/50 hover:scale-105 active:scale-95 transition cursor-pointer"
                title="عرض شريط التنبيهات الإدارية المباشرة للمديرين (المديونيات الحادة > 50,000 ج.م)"
              >
                <Bell className="w-4 h-4 text-red-400 animate-bounce" />
                <span>تنبيهات المديرين</span>
                {highDebtNotifications.filter((n) => !n.isRead).length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center animate-pulse border border-amber-300">
                    {highDebtNotifications.filter((n) => !n.isRead).length}
                  </span>
                )}
              </button>

              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-800/80 border border-slate-700 rounded-lg text-xs font-bold text-amber-100 shadow-inner">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{appState.currentUser.fullName}</span>
                <span className="text-[10px] text-amber-300 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-600/30">
                  {getRoleNameArabic(appState.currentUser.role, appState.systemConfig)}
                </span>
              </div>

              {/* Lock & Logout on leaving computer */}
              <button
                onClick={() => handleLogout()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-700 to-rose-800 hover:from-red-800 hover:to-rose-900 text-white rounded-lg text-xs font-black shadow-sm transition active:scale-95 cursor-pointer border border-red-500/50"
                title="قفل الشاشة وتسجيل الخروج الآمن عند مغادرة الكمبيوتر"
              >
                <Lock className="w-3.5 h-3.5 text-amber-300 icon-animated" />
                <span>قفل وخروج</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Top Urgent Expiration Notification Banner (if any) */}
      {alertsList.length > 0 && (
        <div className="bg-gradient-to-r from-red-600 via-rose-700 to-red-600 text-white px-4 py-2 text-xs font-black flex items-center justify-between no-print shadow-inner">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 animate-bounce text-amber-300" />
              <span>
                تنبيه هام: يوجد ({alertsList.length}) وثيقة أو ترخيص أو عقد منتهية أو قاربت على الانتهاء خلال فترة 15 يوماً القادمة.
              </span>
            </div>
            <button
              onClick={() => setIsAlertsModalOpen(true)}
              className="px-3 py-1 bg-white text-red-900 rounded-md text-[11px] font-black hover:bg-amber-100 transition cursor-pointer"
            >
              عرض التفاصيل والإجراءات
            </button>
          </div>
        </div>
      )}

      {/* 2.1 Large Debts Alert Banner (> 20,000 EGP) */}
      {largeDebtsList.length > 0 && (
        <div className="bg-gradient-to-r from-amber-800 via-red-900 to-amber-900 text-white px-4 py-2 text-xs font-black flex items-center justify-between no-print shadow-md border-b-2 border-amber-400">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-300 animate-ping inline-block" />
              <span>
                إشعار مديونيات كبرى (&gt; 20,000 ج.م): يوجد ({largeDebtsList.length}) مخبز بلدي تجاوزت مديونيتها 20,000 ج.م، ويلزم إلزامياً طلب دفعات أسبوعية محددة القيم والتواريخ!
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedInstallmentBakeryId(undefined);
                setIsWeeklyInstallmentsModalOpen(true);
              }}
              className="px-3.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-md text-[11px] font-black shadow transition cursor-pointer"
            >
              عرض جدول وقيم الدفعات الأسبوعية ({largeDebtsList.length})
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Workspace with Permanent Right-Side Navigation & Control Column */}
      <div className="flex-1 w-full max-w-[1920px] mx-auto p-3 sm:p-4 flex flex-col lg:flex-row gap-4 items-start">
        {/* Right-Side Command & Controls Column (جميع الأزرار على اليمين تحت بعضها بشكل مرتب مع مؤثرات حركية) */}
        <aside
          aria-label="لوحة الأزرار والتحكم الرئيسية"
          className="w-full lg:w-72 xl:w-80 shrink-0 space-y-3.5 no-print"
        >
          {/* Permanent Official Directorate & Administration Emblem on the Base (شعار مديرية التموين بالغربية وإدارة تموين مركز المحلة بشكل ثابت وأساسي) */}
          <div className="bg-slate-900/95 border-2 border-amber-500/50 rounded-2xl p-4 shadow-xl text-center space-y-3 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-white p-1.5 border-2 border-amber-400 shadow-lg flex items-center justify-center transform hover:scale-105 transition-all duration-300">
                <img
                  src={appState.systemConfig.logoBase64}
                  alt="شعار وزارة التموين والتجارة الداخلية بالغربية"
                  className="w-full h-full object-contain"
                />
              </div>

              <span className="mt-2 text-[11px] font-black text-black bg-amber-400 px-3 py-0.5 rounded shadow-sm border border-amber-300">
                جمهورية مصر العربية
              </span>

              <h3 className="mt-1.5 text-xs font-black text-slate-100 leading-snug">
                {appState.systemConfig.directorateTitle}
              </h3>

              <div className="mt-1">
                <span className="text-[11px] font-black text-black bg-amber-400 px-3 py-0.5 rounded shadow-sm border border-amber-300 inline-block">
                  {appState.systemConfig.administrationTitle}
                </span>
              </div>

              <span className="mt-1 text-[9px] text-amber-300/80 font-mono tracking-wider">
                {appState.systemConfig.englishSubtitle}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                القاعدة متصلة ومؤمنة
              </span>
              <span className="font-mono text-slate-300">v3.0</span>
            </div>
          </div>

          {/* Primary View & System Actions Navigation Buttons (تحت بعضها بشكل مرتب على اليمين) */}
          <div className="bg-slate-900/90 border-2 border-slate-800 rounded-2xl p-3 shadow-xl space-y-2">
            <div className="px-2 py-1 text-[11px] font-black text-amber-400 flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>الأقسام الرئيسية والمديونيات</span>
            </div>

            {/* 1. Bakeries Database Button */}
            <button
              type="button"
              onClick={() => setActiveTab('bakeries')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-black transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                activeTab === 'bakeries'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-900/40 border border-amber-300'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 icon-animated" />
                <span>قاعدة بيانات المخابز</span>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-black ${
                activeTab === 'bakeries' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-300'
              }`}>
                {appState.bakeries.length}
              </span>
            </button>

            {/* 2. Debts and Penalties Button */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('debts');
                setDebtFilterBakeryId(undefined);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-black transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                activeTab === 'debts'
                  ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-950/50 border border-red-400'
                  : 'bg-slate-950 hover:bg-slate-800 text-rose-300 border border-red-900/40 hover:border-red-700/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 icon-animated" />
                <span>المديونيات على المخابز</span>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-black ${
                activeTab === 'debts' ? 'bg-red-950 text-rose-200' : 'bg-slate-800 text-rose-300'
              }`}>
                {appState.debts.length}
              </span>
            </button>

            {/* 3. Dedicated Animated Charts & Analytics Button (مفتاح الرسوم المتحركة / البيانية مثل باقي المفاتيح) */}
            <button
              type="button"
              onClick={() => setActiveTab('charts')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-black transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                activeTab === 'charts'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-lg shadow-indigo-950/50 border border-indigo-300'
                  : 'bg-slate-950 hover:bg-slate-800 text-indigo-300 border border-indigo-900/40 hover:border-indigo-700/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 icon-animated" />
                <span>الرسوم المتحركة والبيانية</span>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-black ${
                activeTab === 'charts' ? 'bg-indigo-950 text-indigo-200' : 'bg-slate-800 text-indigo-300'
              }`}>
                {appState.villages.length}
              </span>
            </button>

            {/* 4. NEW: Daily Tasks Management Button (إدارة المهام اليومية) */}
            <button
              type="button"
              onClick={() => setIsDailyTasksModalOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/40 hover:border-amber-400 rounded-xl text-xs font-black transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-amber-400 icon-animated" />
                <span>إدارة المهام اليومية</span>
              </div>
              <span className="text-[11px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-mono font-black">
                {(appState.dailyTasks || []).filter((t) => t.status !== 'completed').length}
              </span>
            </button>

            {/* 4.5 NEW: Inbox Chat & Instructions Button (صندوق الوارد بين جميع المستخدمين) */}
            <button
              type="button"
              onClick={() => setIsInboxModalOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 hover:from-indigo-800 hover:to-blue-800 text-white border-2 border-indigo-400/60 hover:border-indigo-300 rounded-xl text-xs font-black transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-md"
            >
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-amber-300 icon-animated" />
                <span>صندوق الوارد (شات وتعليمات)</span>
              </div>
              <span className="text-[11px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-mono font-black">
                {inboxMessages.length}
              </span>
            </button>

            {/* 5. Alerts Button */}
            <button
              type="button"
              onClick={() => setIsAlertsModalOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/30 hover:border-amber-400 rounded-xl text-xs font-black transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 icon-animated" />
                <span>التنبيهات والمستندات</span>
              </div>
              {alertsList.length > 0 && (
                <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                  {alertsList.length}
                </span>
              )}
            </button>

            {/* 5.5 Daily Entry Briefing Screen (تنبيه يومي للمديونيات والعقود المنتهية عند الدخول) */}
            <button
              type="button"
              onClick={() => setIsDailyBriefingModalOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-950 hover:bg-slate-800 text-rose-300 border border-rose-500/40 hover:border-rose-400 rounded-xl text-xs font-black transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-rose-400 icon-animated" />
                <span>تنبيه الدخول اليومي (مديونيات وعقود)</span>
              </div>
              <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-black">
                شامل
              </span>
            </button>

            {/* 6. Weekly Installments Button */}
            <button
              type="button"
              onClick={() => {
                setSelectedInstallmentBakeryId(undefined);
                setIsWeeklyInstallmentsModalOpen(true);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 rounded-xl text-xs font-black transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400 icon-animated" />
                <span>الدفعات الأسبوعية</span>
              </div>
              {largeDebtsList.length > 0 && (
                <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-black">
                  {largeDebtsList.length}
                </span>
              )}
            </button>

            {/* 7. Printable Reports & A4 Export Button */}
            <button
              type="button"
              onClick={() => {
                setReportModalInitialTab(activeTab === 'debts' ? 'debts' : 'bakeries');
                setIsReportModalOpen(true);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-cyan-400" />
                <span>التقارير وكشوف الطباعة A4</span>
              </div>
              <ChevronLeft className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>

          {/* System Tools & Unified Management Stack (ضم التعديلات على مفتاح واحد وضم الحفظ والاستيراد والنسخ على مفتاح واحد) */}
          <div className="bg-slate-900/90 border-2 border-slate-800 rounded-2xl p-3 shadow-xl space-y-2.5">
            <div className="px-2 py-1 text-[11px] font-black text-slate-300 flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span>لوحة التحكم الموحدة (التعديل والحفظ)</span>
            </div>

            {/* Quick Add Bakery */}
            {appState.currentUser?.role !== 'viewer' && (
              <button
                type="button"
                onClick={() => {
                  setBakeryToEdit(null);
                  setIsBakeryModalOpen(true);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black shadow-md border border-amber-300 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>إضافة مخبز جديد للقاعدة</span>
                </div>
                <span className="text-[10px] bg-slate-950 text-amber-300 px-2 py-0.5 rounded-full font-black">
                  إضافة +
                </span>
              </button>
            )}

            {/* UNIFIED BUTTON 1: التعديل داخل المنظومة / التعديل على جميع القوائم المنسدلة */}
            <button
              type="button"
              onClick={() => {
                setMasterEditorInitialCategory('ALL');
                setIsMasterEditorModalOpen(true);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 hover:from-amber-900 hover:to-slate-800 text-amber-300 border-2 border-amber-500/70 hover:border-amber-400 rounded-xl text-xs font-black transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg"
              title="ضم جميع قوائم التعديل والحذف (نوع خط الإنتاج، نوع الوقود، عدد نوع الخبز، نوع الخبز، تصنيف المخبز، نشاط المخبز، القرى، الجهة المحررة، نوع المخالفة، رؤوس الخانات، الترويسة، التذكير، والمستخدمين)"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400 icon-animated" />
                <div className="text-right">
                  <div className="leading-tight">التعديل داخل المنظومة</div>
                  <div className="text-[9.5px] text-amber-200/90 font-bold">
                    التعديل على جميع القوائم المنسدلة
                  </div>
                </div>
              </div>
              <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-black shrink-0">
                10 قوائم ✏️
              </span>
            </button>

            {/* UNIFIED BUTTON 2: ضم جميع قوائم الحفظ والاستيراد والنسخ (بما فيها النسخ التلقائي على Google Drive) على مفتاح واحد فقط */}
            <button
              type="button"
              onClick={() => setIsBackupModalOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-emerald-950 via-slate-900 to-cyan-950 hover:from-emerald-900 hover:to-cyan-900 text-emerald-300 border-2 border-emerald-500/70 hover:border-emerald-400 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer shadow-lg"
              title="مركز الحفظ والاستيراد والنسخ الاحتياطي الموحد (حفظ بارتيشن، القرص الصلب، نسخ تلقائي على Google Drive، حزمة GitHub، وتحميل التطبيق HTML/EXE)"
            >
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <div className="text-right">
                  <div className="leading-tight">الحفظ والاستيراد والنسخ</div>
                  <div className="text-[9.5px] text-emerald-200/90 font-bold">
                    بارتيشن • نسخ تلقائي Google Drive • EXE
                  </div>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-black shrink-0">
                شامل 💾
              </span>
            </button>

            {/* Advanced Role Permissions Button (إعدادات الصلاحيات المتقدمة) inside Unified Control Panel */}
            <button
              type="button"
              onClick={() => setIsAdvancedPermissionsModalOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 hover:from-indigo-900 hover:to-purple-900 text-amber-300 border-2 border-amber-500/60 hover:border-amber-400 rounded-xl text-xs font-black transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg"
              title="تحديد العمليات المسموح بها لكل دور (مفتش، مراجع، مدير) على مستوى المودالات والبيانات وحفظها في SystemConfig"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400 icon-animated" />
                <div className="text-right">
                  <div className="leading-tight">إعدادات الصلاحيات المتقدمة</div>
                  <div className="text-[9.5px] text-amber-200/90 font-bold">
                    مفتش • مراجع • مدير (المودالات والبيانات)
                  </div>
                </div>
              </div>
              <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-black shrink-0">
                أدوار 🛡️
              </span>
            </button>

            {/* Math Audit */}
            <button
              type="button"
              onClick={() => setIsAuditModalOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-purple-300 border border-purple-500/30 hover:border-purple-400 rounded-xl text-xs font-black transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Calculator className="w-3.5 h-3.5 text-purple-400" />
                <span>تدقيق واختبار المعادلات</span>
              </div>
              <span className="text-[10px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded-full font-mono">
                0.00 ✓
              </span>
            </button>
          </div>
        </aside>

        {/* Left-Side Main Data Workspace */}
        <main className="flex-1 min-w-0 w-full space-y-4">
          {/* Permanent Base Header Banner with Official Emblem & Supply Directorate Info */}
          <div className="bg-slate-900/95 border-2 border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white p-1 border-2 border-amber-400 shadow-md flex items-center justify-center shrink-0">
                <img
                  src={appState.systemConfig.logoBase64}
                  alt="شعار وزارة التموين"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black text-black bg-amber-400 px-2.5 py-0.5 rounded shadow-sm border border-amber-300">
                    جمهورية مصر العربية
                  </span>
                  <span className="text-xs font-bold text-slate-300">
                    - وزارة التموين والتجارة الداخلية
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.2 rounded-full font-bold">
                    {appState.systemConfig.governorateTitle}
                  </span>
                </div>
                <h2 className="text-sm sm:text-base font-black text-white mt-1">
                  {appState.systemConfig.directorateTitle}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-black text-black bg-amber-400 px-2.5 py-0.5 rounded shadow-sm border border-amber-300">
                    {appState.systemConfig.administrationTitle}
                  </span>
                  <span className="text-[11px] text-slate-400 font-bold">
                    - المنظومة الرقمية الشاملة لإدارة ومتابعة المخابز البلدية والمديونيات
                  </span>
                </div>
              </div>
            </div>

            {/* Top View Switcher Navigation Tabs (مفتاح الرسوم المتحركة مثل باقي المفاتيح) */}
            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('bakeries')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'bakeries'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-900/40 border border-amber-300'
                    : 'bg-slate-950 text-amber-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Building className="w-3.5 h-3.5 icon-animated" />
                <span>قاعدة بيانات المخابز ({appState.bakeries.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('debts');
                  setDebtFilterBakeryId(undefined);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'debts'
                    ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-950/40 border border-red-400'
                    : 'bg-slate-950 text-rose-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Scale className="w-3.5 h-3.5 icon-animated" />
                <span>سجلات المديونيات ({appState.debts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('charts')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'charts'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-lg shadow-indigo-950/40 border border-indigo-300'
                    : 'bg-slate-950 text-indigo-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 icon-animated" />
                <span>الرسوم المتحركة والبيانية ({appState.villages.length})</span>
              </button>
            </div>
          </div>

        {activeTab === 'charts' ? (
          /* DEDICATED CHARTS & ANALYTICS VIEW (الرسوم البيانية) */
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border-2 border-indigo-500/40 rounded-2xl p-5 shadow-2xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-950 border border-indigo-400/50 rounded-2xl shadow-lg">
                  <BarChart3 className="w-7 h-7 text-indigo-300" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>لوحة الرسوم البيانية والتحليلات الإحصائية للمنظومة</span>
                    <span className="text-[11px] bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 px-2.5 py-0.5 rounded-full font-mono font-bold">
                      D3.js + Recharts
                    </span>
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    تحليل شامل لمديونيات المخابز وحصص الدقيق وتوزيع المخابز والإنتاج على مستوى المركز
                  </p>
                </div>
              </div>
              <div className="flex items-center flex-wrap gap-2">
                {/* NEW: 'ملخص إحصائي' Button */}
                <button
                  type="button"
                  onClick={() => setIsLocalUnitsModalOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-950/40 border border-amber-300 transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 pulse-glow"
                  title="عرض جدول إحصائي مجمع لعدد المخابز، إجمالي الحصة التموينية، وإجمالي المديونيات حسب كل وحدة محلية"
                >
                  <Table className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                  <span>ملخص إحصائي</span>
                  <span className="px-1.5 py-0.5 bg-black/25 text-amber-950 rounded-md font-mono text-[10px] font-black">
                    الوحدات المحلية 📋
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('bakeries')}
                  className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>← جدول المخابز</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('debts');
                    setDebtFilterBakeryId(undefined);
                  }}
                  className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-rose-300 border border-red-500/40 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>جدول المديونيات ←</span>
                </button>
              </div>
            </div>

            {/* Quick Banner to Launch Local Units Statistical Summary */}
            <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-indigo-950/60 border border-amber-500/40 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-300">
                  <Table className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                    <span>الملخص الإحصائي المجمع حسب كل وحدة محلية (Local Unit)</span>
                    <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full">
                      جديد 📊
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    يعرض جدولاً مجمعاً مفصلاً يوضح عدد المخابز، إجمالي الحصة التموينية اليومية، وإجمالي المديونيات المستحقة لكل وحدة محلية لتسهيل الرؤية الإدارية والرقابية
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsLocalUnitsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md border border-amber-300 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Table className="w-4 h-4 stroke-[2.5]" />
                <span>فتح جدول الملخص الإحصائي الكامل</span>
              </button>
            </div>

            {/* 1. D3.js Interactive Bakery Debts Distribution Pie Chart */}
            <BakeryDebtsPieChart
              bakeries={appState.bakeries}
              debts={appState.debts}
              onSelectBakeryFilter={(bakeryId) => {
                setActiveTab('debts');
                setDebtFilterBakeryId(bakeryId);
              }}
            />

            {/* 2. Recharts Bakeries & Quotas Analytics */}
            <BakeryAnalyticsCharts
              bakeries={appState.bakeries}
              debts={appState.debts}
              villages={appState.villages}
              onSelectTierFilter={(_min, _max, tierLabel) => {
                setActiveTab('bakeries');
                setSelectedDebtFilter('HAS_DEBT');
                setSaveToast({
                  id: Date.now(),
                  message: `تم تصفية القائمة لعرض المخابز ضمن شريحة (${tierLabel})`,
                  timestamp: new Date().toLocaleTimeString('ar-EG'),
                });
              }}
            />
          </div>
        ) : activeTab === 'debts' ? (
          /* DEBTS VIEW */
          <DebtsView
            bakeries={appState.bakeries}
            debts={appState.debts}
            villages={appState.villages}
            issuingEntities={appState.issuingEntities}
            violationTypes={appState.violationTypes}
            systemConfig={appState.systemConfig}
            currentUser={appState.currentUser}
            onSaveDebt={handleSaveDebt}
            onDeleteDebt={handleDeleteDebt}
            onUpdateEntities={(ents) => triggerSave({ ...appState, issuingEntities: ents }, 'تم تحديث قائمة الجهات المحررة بنجاح')}
            onUpdateViolations={(viols) => triggerSave({ ...appState, violationTypes: viols }, 'تم تحديث قائمة أنواع المخالفات بنجاح')}
            onRenameEntity={(oldName, newName) => {
              if (!oldName.trim() || !newName.trim() || oldName === newName) return;
              const updatedEntities = appState.issuingEntities.map((e) => (e === oldName ? newName : e));
              const updatedDebts = appState.debts.map((d) => (d.issuingEntity === oldName ? { ...d, issuingEntity: newName } : d));
              triggerSave(
                { ...appState, issuingEntities: updatedEntities, debts: updatedDebts },
                `تم تعديل الجهة المحررة إلى "${newName}" وتحديث القيود المرتبطة بها`
              );
            }}
            onRenameViolation={(oldName, newName) => {
              if (!oldName.trim() || !newName.trim() || oldName === newName) return;
              const updatedViolations = appState.violationTypes.map((v) => (v === oldName ? newName : v));
              const updatedDebts = appState.debts.map((d) => (d.violationType === oldName ? { ...d, violationType: newName } : d));
              triggerSave(
                { ...appState, violationTypes: updatedViolations, debts: updatedDebts },
                `تم تعديل نوع المخالفة إلى "${newName}" وتحديث القيود المرتبطة بها`
              );
            }}
            filterBakeryId={debtFilterBakeryId}
            onClearBakeryFilter={() => setDebtFilterBakeryId(undefined)}
            onOpenReportModal={(tab) => {
              setReportModalInitialTab(tab || 'debts');
              setIsReportModalOpen(true);
            }}
          />
        ) : (
          /* BAKERIES MAIN VIEW */
          <div className="space-y-4">
            {/* Quick Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-slate-900 border-2 border-slate-800 rounded-xl p-3 text-center shadow-lg hover:border-slate-700 transition">
                <span className="text-[11px] font-bold text-slate-400 block mb-0.5">
                  إجمالي المخابز المسجلة
                </span>
                <span className="stat-num text-white block">{bakeryStats.count}</span>
                <span className="text-[10px] text-slate-400 font-bold">مخبز بلدي</span>
              </div>

              <div className="bg-slate-900 border-2 border-amber-900/50 rounded-xl p-3 text-center shadow-lg hover:border-amber-600/50 transition">
                <span className="text-[11px] font-bold text-amber-400 block mb-0.5">
                  إجمالي الحصة التأمينية
                </span>
                <span className="stat-num text-amber-300 block">
                  {bakeryStats.totalInsurance.toLocaleString()}
                </span>
                <span className="text-[10px] text-amber-500 font-bold">شيكارة يومياً</span>
              </div>

              <div className="bg-slate-900 border-2 border-blue-900/50 rounded-xl p-3 text-center shadow-lg hover:border-blue-600/50 transition">
                <span className="text-[11px] font-bold text-blue-400 block mb-0.5">
                  إجمالي الحصة الفعلية
                </span>
                <span className="stat-num text-blue-300 block">
                  {bakeryStats.totalActual.toLocaleString()}
                </span>
                <span className="text-[10px] text-blue-500 font-bold">شيكارة يومياً</span>
              </div>

              <div className="bg-slate-900 border-2 border-emerald-900/50 rounded-xl p-3 text-center shadow-lg hover:border-emerald-600/50 transition">
                <span className="text-[11px] font-bold text-emerald-400 block mb-0.5">
                  إجمالي الأرغفة اليومية
                </span>
                <span className="stat-num text-emerald-300 block">
                  {bakeryStats.totalLoaves.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-500 font-bold">رغيف (× 1350)</span>
              </div>

              {/* NEW: Expected Annual Flour Budget Stat Card */}
              <div className="bg-gradient-to-br from-purple-950 via-purple-900 to-slate-950 border-2 border-purple-600/60 rounded-xl p-2.5 text-center shadow-xl hover:border-purple-400 transition relative overflow-hidden group">
                <div className="flex items-center justify-between gap-1 mb-1 border-b border-purple-500/20 pb-1">
                  <span className="text-[10px] font-black text-purple-200 truncate">
                    الميزانية السنوية المتوقعة
                  </span>
                  <div className="flex items-center gap-1 shrink-0 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-500/40">
                    <span className="text-[9px] text-purple-300 font-bold">سعر الشيكارة:</span>
                    <input
                      type="number"
                      value={flourBagPrice}
                      onChange={(e) => setFlourBagPrice(Math.max(1, Number(e.target.value) || 0))}
                      className="w-12 bg-black/80 text-amber-300 font-black text-[10px] text-center rounded border border-amber-500/50 focus:outline-none focus:border-amber-400 px-0.5"
                      title="تغيير متوسط سعر شيكارة الدقيق (ج.م)"
                    />
                  </div>
                </div>
                <div className="stat-num text-purple-200 font-black text-lg block leading-tight">
                  {((bakeryStats.totalActual * flourBagPrice * 365) / 1000000).toLocaleString('ar-EG', {
                    maximumFractionDigits: 2,
                    minimumFractionDigits: 1,
                  })}{' '}
                  <span className="text-xs text-amber-300 font-bold">م.ج.م</span>
                </div>
                <span className="text-[9.5px] text-purple-300/80 font-bold block mt-0.5 truncate">
                  سنوياً (× 365 يوم)
                </span>
                
                {/* NEW: Button to open Annual Frequency Breakdown Tool */}
                <button
                  type="button"
                  onClick={() => setIsBudgetFrequencyModalOpen(true)}
                  className="mt-1.5 w-full py-1 px-2 bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-[10px] font-black shadow-md transition flex items-center justify-center gap-1 cursor-pointer border border-purple-300/50 hover:scale-102 active:scale-95"
                  title="عرض جدول التكرار السنوي وتوزيع الميزانية التقديرية على الأشهر الـ 12 بشكل تفاعلي"
                >
                  <Calendar className="w-3 h-3 text-amber-300" />
                  <span>جدول التكرار السنوي 📅</span>
                </button>
              </div>

              <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-red-950 via-red-900 to-black text-white rounded-xl p-3 text-center shadow-xl border-2 border-red-700">
                <span className="text-[11px] font-black text-rose-200 block mb-0.5">
                  إجمالي المديونيات المتبقية
                </span>
                <span className="stat-num text-white block">
                  {bakeryStats.totalDebts.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Toolbar: Action Buttons on the RIGHT side, Search on the left, Filters */}
            <div className="bg-slate-900 border-2 border-slate-800 rounded-xl p-3.5 shadow-xl space-y-3 no-print">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Primary Action Buttons - Placed FIRST on the RIGHT side with smooth animations */}
                <div className="flex items-center flex-wrap gap-2.5 justify-start">
                  {/* 1. Add Bakery Button (Glowing Golden with animated icon & pulse) */}
                  {appState.currentUser?.role !== 'viewer' && (
                    <button
                      onClick={() => {
                        setBakeryToEdit(null);
                        setIsBakeryModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-900/30 border border-amber-300 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer pulse-glow"
                      title="إضافة مخبز جديد إلى المنظومة"
                    >
                      <Plus className="w-4 h-4 text-slate-950 icon-animated" />
                      <span>إضافة مخبز جديد</span>
                    </button>
                  )}

                  {/* 2. Unified Master Editor Button: التعديل داخل المنظومة / التعديل على جميع القوائم المنسدلة */}
                  <button
                    onClick={() => {
                      setMasterEditorInitialCategory('ALL');
                      setIsMasterEditorModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 hover:from-amber-900 hover:to-slate-800 text-amber-300 font-black rounded-xl text-xs shadow-md border border-amber-500/60 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                    title="فتح نافذة التعديل داخل المنظومة والتعديل على جميع القوائم المنسدلة (إضافة وتعديل وحذف فوري)"
                  >
                    <Sliders className="w-4 h-4 text-amber-400 icon-animated" />
                    <span>التعديل على جميع القوائم المنسدلة</span>
                  </button>

                  {/* 3. Daily Tasks Manager Button: إدارة المهام اليومية */}
                  <button
                    onClick={() => setIsDailyTasksModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-950 to-slate-900 hover:from-indigo-900 hover:to-slate-800 text-amber-300 font-black rounded-xl text-xs border border-amber-500/40 shadow-sm transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                    title="إدارة المهام اليومية وتتبع المهام الإدارية الفرعية المتعلقة بالمخابز"
                  >
                    <ListTodo className="w-4 h-4 text-amber-400 icon-animated" />
                    <span>إدارة المهام اليومية ({(appState.dailyTasks || []).filter((t) => t.status !== 'completed').length})</span>
                  </button>

                  {/* 4. Export CSV */}
                  <button
                    onClick={handleExportBakeryCSV}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl text-xs font-black shadow-md border border-emerald-400/50 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                    title="تصدير كشف إكسل معتمد بترميز UTF-8 عربي"
                  >
                    <FileSpreadsheet className="w-4 h-4 icon-animated text-emerald-200" />
                    <span>تصدير Excel</span>
                  </button>

                  {/* 5. Open Printable Report Center */}
                  <button
                    onClick={() => {
                      setReportModalInitialTab('bakeries');
                      setIsReportModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-slate-800 via-amber-950 to-slate-900 hover:from-slate-700 hover:to-amber-900 text-amber-200 rounded-xl text-xs font-black shadow-md border border-amber-500/50 transition-all duration-200 cursor-pointer"
                    title="فتح مركز التقارير وكشوف الطباعة A4 بالعرض ونسب السداد"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span>كشف الطباعة A4</span>
                  </button>
                </div>

                {/* Search Bar placed on the other side */}
                <div className="relative min-w-[260px] flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 icon-animated" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="بحث باسم صاحب المخبز، رقم الماكينة، القرية، التليفون، الرقم القومي..."
                    className="w-full pr-9 pl-3 py-2 bg-black border border-slate-700 rounded-xl text-xs font-black text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-right transition"
                  />
                </div>
              </div>

              {/* NEW: Advanced Dual-Filter Search Bar (شريط البحث المتقدم والفلترة المزدوجة: قرية معينة + حالة تشغيل معينة + قوائم منسدلة إضافية) */}
              <div className="p-3 bg-gradient-to-r from-slate-950 via-amber-950/30 to-slate-950 border-2 border-amber-500/50 rounded-xl space-y-2.5 shadow-inner">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black text-amber-300">
                      شريط البحث المتقدم والفلترة المزدوجة (تصفية متزامنة بالقرية + حالة التشغيل + نوع الخبز والوقود):
                    </span>
                  </div>
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 rounded-full text-[11px] font-black">
                      نتائج التصفية المزدوجة: {filteredBakeries.length} من {appState.bakeries.length} مخبز
                    </span>
                    {(selectedVillage !== 'ALL' ||
                      selectedUnit !== 'ALL' ||
                      selectedActivity !== 'ALL' ||
                      selectedCategoryFilter !== 'ALL' ||
                      selectedDebtFilter !== 'ALL' ||
                      selectedBreadTypeFilter !== 'ALL' ||
                      selectedFuelTypeFilter !== 'ALL' ||
                      selectedLicenseExpiryFilter !== 'ALL' ||
                      searchTerm.trim() !== '') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVillage('ALL');
                          setSelectedUnit('ALL');
                          setSelectedActivity('ALL');
                          setSelectedCategoryFilter('ALL');
                          setSelectedDebtFilter('ALL');
                          setSelectedBreadTypeFilter('ALL');
                          setSelectedFuelTypeFilter('ALL');
                          setSelectedLicenseExpiryFilter('ALL');
                          setSearchTerm('');
                        }}
                        className="px-3 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[11px] font-black cursor-pointer flex items-center gap-1 shadow-xs"
                        title="إلغاء جميع الفلاتر وعرض كافة المخابز"
                      >
                        <X className="w-3 h-3" />
                        <span>إعادة تعيين الفلترة المزدوجة</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Dynamic Dual/Multi Filtering Dropdowns Grid (7 Simultaneous Dropdowns with inline Edit/Delete triggers) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 text-xs">
                  {/* 1. Village Filter */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-black text-amber-200">
                        1. القرية (تصفية مزدوجة)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMasterEditorInitialCategory('villages');
                          setIsMasterEditorModalOpen(true);
                        }}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-black flex items-center gap-0.5 cursor-pointer"
                        title="تعديل وحذف قائمة القرى"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>تعديل/حذف</span>
                      </button>
                    </div>
                    <select
                      value={selectedVillage}
                      onChange={(e) => {
                        setSelectedVillage(e.target.value);
                        setSelectedUnit('ALL');
                      }}
                      className="w-full px-2.5 py-1.5 bg-black border border-amber-500/50 rounded-lg font-black text-slate-100 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="ALL">كافة القرى ({appState.villages.length})</option>
                      {appState.villages.map((v) => {
                        const vCount = appState.bakeries.filter((b) => b.village === v.village).length;
                        return (
                          <option key={v.village} value={v.village}>
                            {v.village} ({vCount} مخبز)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* 2. Operating Activity Status Filter */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-black text-emerald-300">
                        2. حالة التشغيل والنشاط
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMasterEditorInitialCategory('activityStatuses');
                          setIsMasterEditorModalOpen(true);
                        }}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-black flex items-center gap-0.5 cursor-pointer"
                        title="تعديل وحذف قائمة أنشطة المخابز"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>تعديل/حذف</span>
                      </button>
                    </div>
                    <select
                      value={selectedActivity}
                      onChange={(e) => setSelectedActivity(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-black border border-emerald-500/50 rounded-lg font-black text-emerald-200 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="ALL">كافة حالات التشغيل ({appState.bakeries.length})</option>
                      {appState.activityStatuses.map((st) => {
                        const count = appState.bakeries.filter(
                          (b) =>
                            b.activityStatus === st &&
                            (selectedVillage === 'ALL' || b.village === selectedVillage)
                        ).length;
                        return (
                          <option key={st} value={st}>
                            {st} ({count} مخبز)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* 3. Local Unit Filter */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-black text-slate-300">
                        3. الوحدة المحلية التابعة
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsVillageModalOpen(true)}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-black flex items-center gap-0.5 cursor-pointer"
                        title="تعديل وحذف الوحدات المحلية"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>تعديل/حذف</span>
                      </button>
                    </div>
                    <select
                      value={selectedUnit}
                      onChange={(e) => setSelectedUnit(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-black border border-slate-700 rounded-lg font-black text-slate-100 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="ALL">
                        {selectedVillage === 'ALL'
                          ? 'كافة الوحدات المحلية'
                          : `وحدات (${selectedVillage})`}
                      </option>
                      {selectedVillage === 'ALL' ? (
                        appState.villages.map((v) => (
                          <optgroup key={v.village} label={`قرية ${v.village}`}>
                            {v.localUnits.map((u) => (
                              <option key={`${v.village}-${u}`} value={u}>
                                {u}
                              </option>
                            ))}
                          </optgroup>
                        ))
                      ) : (
                        availableUnitsFilter.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* 4. Bread Type Additional Dropdown (قائمة منسدلة إضافية لنوع الخبز) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-black text-cyan-300">
                        4. نوع الخبز (إضافي)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMasterEditorInitialCategory('breadTypes');
                          setIsMasterEditorModalOpen(true);
                        }}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-black flex items-center gap-0.5 cursor-pointer"
                        title="تعديل وحذف قائمة نوع الخبز"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>تعديل/حذف</span>
                      </button>
                    </div>
                    <select
                      value={selectedBreadTypeFilter}
                      onChange={(e) => setSelectedBreadTypeFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-black border border-cyan-500/50 rounded-lg font-black text-cyan-200 focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                    >
                      <option value="ALL">كافة أنواع الخبز</option>
                      {Array.from(
                        new Set([
                          ...(appState.breadTypes || []),
                          ...appState.bakeries.map((b) => b.breadType).filter(Boolean),
                        ])
                      ).map((bt) => (
                        <option key={bt} value={bt}>
                          {bt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 5. Fuel & Line Type Additional Dropdown (قائمة منسدلة إضافية للوقود وخط الإنتاج) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-black text-purple-300">
                        5. الوقود / خط الإنتاج
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMasterEditorInitialCategory('lineTypes');
                          setIsMasterEditorModalOpen(true);
                        }}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-black flex items-center gap-0.5 cursor-pointer"
                        title="تعديل وحذف قائمتي نوع خط الإنتاج ونوع الوقود"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>تعديل/حذف</span>
                      </button>
                    </div>
                    <select
                      value={selectedFuelTypeFilter}
                      onChange={(e) => setSelectedFuelTypeFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-black border border-purple-500/50 rounded-lg font-black text-purple-200 focus:ring-1 focus:ring-purple-500 cursor-pointer"
                    >
                      <option value="ALL">كافة أنواع الوقود والخطوط</option>
                      <optgroup label="نوع الوقود">
                        {Array.from(
                          new Set([
                            ...(appState.fuelTypes || []),
                            ...appState.bakeries.map((b) => b.fuelType).filter(Boolean),
                          ])
                        ).map((ft) => (
                          <option key={`fuel-${ft}`} value={ft}>
                            وقود: {ft}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="نوع خط الإنتاج">
                        {Array.from(
                          new Set([
                            ...(appState.lineTypes || []),
                            ...appState.bakeries.map((b) => b.lineType).filter(Boolean),
                          ])
                        ).map((lt) => (
                          <option key={`line-${lt}`} value={lt}>
                            خط: {lt}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* 6. Bakery Category Filter (نوع المخابز) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-black text-amber-300">
                        6. نوع المخابز
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMasterEditorInitialCategory('bakeryCategories');
                          setIsMasterEditorModalOpen(true);
                        }}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-black flex items-center gap-0.5 cursor-pointer"
                        title="تعديل وحذف قائمة نوع المخابز"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>تعديل/حذف</span>
                      </button>
                    </div>
                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-black border border-amber-500/50 rounded-lg font-black text-amber-300 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="ALL">كافة أنواع المخابز ({appState.bakeries.length})</option>
                      <option value="مدعم">🍞 بلدي مدعم ({categoryCounts.baladi})</option>
                      <option value="مطور">⚡ بلدي مطور ({categoryCounts.baladiMotawar})</option>
                      <option value="سياحي">🍕 سياحي 72% ({categoryCounts.tourist})</option>
                      <option value="فينو">🥐 فينو وأفرنجي ({categoryCounts.fino})</option>
                      <option value="طباقي">🥖 طباقي ({categoryCounts.tabaqi})</option>
                    </select>
                  </div>

                  {/* 7. Debt Status Filter */}
                  <div>
                    <label className="block text-[11px] font-black text-rose-300 mb-1">
                      7. موقف المديونية
                    </label>
                    <select
                      value={selectedDebtFilter}
                      onChange={(e) =>
                        setSelectedDebtFilter(e.target.value as 'ALL' | 'HAS_DEBT' | 'NO_DEBT')
                      }
                      className="w-full px-2.5 py-1.5 bg-black border border-rose-500/50 rounded-lg font-black text-rose-200 focus:ring-1 focus:ring-rose-500 cursor-pointer"
                    >
                      <option value="ALL">الكل (مديونيات وخالص)</option>
                      <option value="HAS_DEBT">عليه مديونية متبقية فقط</option>
                      <option value="NO_DEBT">خالص المديونية (0 ج.م)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bakery Category Dashboard Filter Pills Bar (تصفية حية بنوع المخابز) */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span className="text-xs font-black text-amber-300">
                    تصفية فورية بحسب نوع المخابز:
                  </span>
                </div>

                <div className="flex items-center flex-wrap gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('ALL')}
                    className={`px-3 py-1 rounded-xl font-black transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                      selectedCategoryFilter === 'ALL'
                        ? 'bg-amber-400 text-black shadow-md border border-amber-300'
                        : 'bg-black text-slate-300 border border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <span>كافة التصنيفات</span>
                    <span className="text-[10px] bg-slate-900 text-amber-300 px-1.5 py-0.2 rounded-full font-mono">
                      {appState.bakeries.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('مدعم')}
                    className={`px-3 py-1 rounded-xl font-black transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                      selectedCategoryFilter === 'مدعم'
                        ? 'bg-amber-500 text-slate-950 shadow-md border border-amber-300'
                        : 'bg-black text-amber-300 border border-amber-800/60 hover:border-amber-600'
                    }`}
                  >
                    <span>🍞 بلدي مدعم</span>
                    <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.2 rounded-full font-mono font-black">
                      {categoryCounts.baladi}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('مطور')}
                    className={`px-3 py-1 rounded-xl font-black transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                      selectedCategoryFilter === 'مطور'
                        ? 'bg-yellow-500 text-slate-950 shadow-md border border-yellow-300'
                        : 'bg-black text-yellow-300 border border-yellow-800/60 hover:border-yellow-600'
                    }`}
                  >
                    <span>⚡ بلدي مطور</span>
                    <span className="text-[10px] bg-yellow-950 text-yellow-300 px-1.5 py-0.2 rounded-full font-mono font-black">
                      {categoryCounts.baladiMotawar}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('سياحي')}
                    className={`px-3 py-1 rounded-xl font-black transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                      selectedCategoryFilter === 'سياحي'
                        ? 'bg-cyan-500 text-slate-950 shadow-md border border-cyan-300'
                        : 'bg-black text-cyan-300 border border-cyan-900/60 hover:border-cyan-600'
                    }`}
                  >
                    <span>🍕 سياحي 72%</span>
                    <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.2 rounded-full font-mono font-black">
                      {categoryCounts.tourist}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('فينو')}
                    className={`px-3 py-1 rounded-xl font-black transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                      selectedCategoryFilter === 'فينو'
                        ? 'bg-purple-500 text-white shadow-md border border-purple-300'
                        : 'bg-black text-purple-300 border border-purple-900/60 hover:border-purple-600'
                    }`}
                  >
                    <span>🥐 فينو وأفرنجي</span>
                    <span className="text-[10px] bg-purple-950 text-purple-300 px-1.5 py-0.2 rounded-full font-mono font-black">
                      {categoryCounts.fino}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('طباقي')}
                    className={`px-3 py-1 rounded-xl font-black transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                      selectedCategoryFilter === 'طباقي'
                        ? 'bg-emerald-500 text-slate-950 shadow-md border border-emerald-300'
                        : 'bg-black text-emerald-300 border border-emerald-900/60 hover:border-emerald-600'
                    }`}
                  >
                    <span>🥖 طباقي</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded-full font-mono font-black">
                      {categoryCounts.tabaqi}
                    </span>
                  </button>
                </div>
              </div>

              {/* License Expiry Timeline Filter Bar (شريط التصفية الزمني لتراخيص وسجلات المخابز مع المؤثرات التفاعلية) */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span className="text-xs font-black text-amber-300">
                    فلتر الصلاحية وانتهاء التراخيص والعقود:
                  </span>
                </div>

                <div className="flex items-center flex-wrap gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedLicenseExpiryFilter('ALL')}
                    className={`px-3 py-1 rounded-xl font-black transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                      selectedLicenseExpiryFilter === 'ALL'
                        ? 'bg-amber-400 text-black shadow-md border border-amber-300'
                        : 'bg-black text-slate-300 border border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <span>كافة التراخيص</span>
                    <span className="text-[10px] bg-slate-900 text-amber-300 px-1.5 py-0.2 rounded-full font-mono">
                      {appState.bakeries.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedLicenseExpiryFilter('EXPIRED')}
                    className={`px-3 py-1 rounded-xl font-black transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                      selectedLicenseExpiryFilter === 'EXPIRED'
                        ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg border border-red-400 animate-pulse'
                        : 'bg-black text-rose-300 border border-red-900/50 hover:border-red-600'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-ping inline-block" />
                    <span>منتهية بالفعل</span>
                    <span className="text-[10px] bg-red-950 text-white px-1.5 py-0.2 rounded-full font-mono font-black">
                      {licenseExpiryCounts.expired}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedLicenseExpiryFilter('WITHIN_30')}
                    className={`px-3 py-1 rounded-xl font-black transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                      selectedLicenseExpiryFilter === 'WITHIN_30'
                        ? 'bg-amber-500 text-slate-950 shadow-md border border-amber-300'
                        : 'bg-black text-amber-300 border border-amber-700/50 hover:border-amber-500'
                    }`}
                  >
                    <span>تنتهي خلال 30 يوماً</span>
                    <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.2 rounded-full font-mono font-black">
                      {licenseExpiryCounts.within30}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedLicenseExpiryFilter('WITHIN_60')}
                    className={`px-3 py-1 rounded-xl font-black transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                      selectedLicenseExpiryFilter === 'WITHIN_60'
                        ? 'bg-orange-500 text-slate-950 shadow-md border border-orange-300'
                        : 'bg-black text-orange-300 border border-orange-700/50 hover:border-orange-500'
                    }`}
                  >
                    <span>تنتهي خلال 60 يوماً</span>
                    <span className="text-[10px] bg-orange-950 text-orange-300 px-1.5 py-0.2 rounded-full font-mono font-black">
                      {licenseExpiryCounts.within60}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedLicenseExpiryFilter('WITHIN_90')}
                    className={`px-3 py-1 rounded-xl font-black transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                      selectedLicenseExpiryFilter === 'WITHIN_90'
                        ? 'bg-yellow-500 text-slate-950 shadow-md border border-yellow-300'
                        : 'bg-black text-yellow-300 border border-yellow-700/50 hover:border-yellow-500'
                    }`}
                  >
                    <span>تنتهي خلال 90 يوماً</span>
                    <span className="text-[10px] bg-yellow-950 text-yellow-300 px-1.5 py-0.2 rounded-full font-mono font-black">
                      {licenseExpiryCounts.within90}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedLicenseExpiryFilter('VALID')}
                    className={`px-3 py-1 rounded-xl font-black transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                      selectedLicenseExpiryFilter === 'VALID'
                        ? 'bg-emerald-500 text-slate-950 shadow-md border border-emerald-300'
                        : 'bg-black text-emerald-300 border border-emerald-700/50 hover:border-emerald-500'
                    }`}
                  >
                    <span>سارية لأكثر من 90 يوماً</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded-full font-mono font-black">
                      {licenseExpiryCounts.valid}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Main Bakery Table with Grouped Headers and Row Highlight */}
            <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto max-h-[700px] relative">
                <table className="w-full text-center border-collapse text-xs">
                  {/* Super Grouped Headers */}
                  <thead className="sticky top-0 z-20 bg-black text-white font-black">
                    <tr className="border-b border-slate-800">
                      {/* Index Column Header */}
                      <th
                        rowSpan={2}
                        className="py-2.5 px-1 bg-black border-l border-slate-800 text-slate-300 w-10 text-center"
                      >
                        <ThHeaderTooltip label={ct.index} tooltipKey="index" />
                      </th>

                      {/* 1. Basic Info (Owner Name, Machine, Village, Local Unit) */}
                      <th
                        colSpan={4}
                        className="py-2.5 px-2 bg-black border-l border-slate-800 text-amber-300"
                      >
                        البيانات الأساسية وموقع المخبز
                      </th>

                      {/* 2. Remaining Debt */}
                      <th
                        rowSpan={2}
                        className="py-2.5 px-2 bg-red-950 border-l border-slate-800 text-rose-200 min-w-[110px]"
                      >
                        <ThHeaderTooltip label={ct.remainingDebt} tooltipKey="remainingDebt" />
                      </th>

                      {/* 3. Quotas (5 columns: القيمة التأمينية -> الحصة التأمينية -> الحصة الفعلية -> الأرغفة اليومية -> متوسط نصيب الفرد للمخبز) */}
                      <th
                        colSpan={5}
                        className="py-2.5 px-2 bg-amber-950 border-l border-slate-800 text-amber-200"
                      >
                        الحصص والبيانات التموينية والتأمينية
                      </th>

                      {/* 4. Demographics & Averages (8 columns: سكان القرية -> مستفيد 2023 -> مستفيدين 2024 -> مستفيدين 2025 -> متوسط 2023 -> متوسط 2024 -> متوسط 2025 -> الفرق التراكمي) */}
                      <th
                        colSpan={8}
                        className="py-2.5 px-2 bg-slate-900 border-l border-slate-800 text-blue-200"
                      >
                        إحصائيات السكان والمستفيدين والمتوسطات (2023 - 2025)
                      </th>

                      {/* 5. Classification & Operations (7 columns: نشاط المخبز -> نوع المخابز -> نوع الخبز -> سعر الشيكارة -> عدد نوع الخبز -> نوع خط الإنتاج -> نوع الوقود) */}
                      <th
                        colSpan={7}
                        className="py-2.5 px-2 bg-emerald-950 border-l border-slate-800 text-emerald-200"
                      >
                        التصنيف والتشغيل
                      </th>

                      {/* 6. Contact and Identity */}
                      <th
                        colSpan={2}
                        className="py-2.5 px-2 bg-indigo-950 border-l border-slate-800 text-indigo-200"
                      >
                        بيانات الاتصال والهوية
                      </th>

                      {/* 7. Licenses & Dates */}
                      <th
                        colSpan={4}
                        className="py-2.5 px-2 bg-slate-950 border-l border-slate-800 text-amber-300"
                      >
                        التراخيص والعقود وتواريخ السريان
                      </th>

                      {/* Actions Column Header moved to the END of the table (Left side in RTL) */}
                      <th
                        rowSpan={2}
                        className="py-2.5 px-2 bg-gradient-to-r from-slate-900 to-amber-950 border-l border-slate-800 text-amber-300 min-w-[105px] no-print text-center"
                      >
                        <ThHeaderTooltip label={ct.actions} tooltipKey="actions" />
                      </th>
                    </tr>

                    {/* Sub Columns Headers */}
                    <tr className="bg-slate-950 text-[11px] text-slate-300 font-black border-b border-slate-800">
                      {/* Basic Info sub-headers */}
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[160px]">
                        <ThHeaderTooltip label={ct.bakeryOwnerName} tooltipKey="bakeryOwnerName" />
                      </th>
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[95px]">
                        <ThHeaderTooltip label={ct.machineNumber} tooltipKey="machineNumber" />
                      </th>
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[80px]">
                        <ThHeaderTooltip label={ct.village} tooltipKey="village" />
                      </th>
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[95px]">
                        <ThHeaderTooltip label={ct.localUnit} tooltipKey="localUnit" />
                      </th>

                      {/* 3. Quotas (القيمة التأمينية -> الحصة التأمينية -> الحصة الفعلية -> الأرغفة اليومية -> متوسط نصيب الفرد للمخبز) */}
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[100px]">
                        <ThHeaderTooltip label={ct.insuranceValue} tooltipKey="insuranceValue" />
                      </th>
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[95px]">
                        <ThHeaderTooltip label={ct.insuranceQuota} tooltipKey="insuranceQuota" />
                      </th>
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[95px]">
                        <ThHeaderTooltip label={ct.actualQuota} tooltipKey="actualQuota" />
                      </th>
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[95px] bg-amber-950/80 text-amber-300">
                        <ThHeaderTooltip label={ct.loavesCount} tooltipKey="loavesCount" />
                      </th>
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[115px] bg-amber-950/50 text-amber-300">
                        <ThHeaderTooltip label={ct.perCapitaAverage} tooltipKey="perCapitaAverage" />
                      </th>

                      {/* 4. Demographics & Averages (سكان القرية -> مستفيد عام 2023 -> مستفيدين عام 2024 -> مستفيدين عام 2025 -> متوسط عام 2023 -> متوسط عام 2024 -> متوسط عام 2025 -> الفرق التراكمي) */}
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[85px]">
                        <ThHeaderTooltip label={ct.villagePopulation} tooltipKey="villagePopulation" />
                      </th>
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[95px]">
                        <ThHeaderTooltip label={ct.beneficiaries2023} tooltipKey="beneficiaries2023" />
                      </th>
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[95px]">
                        <ThHeaderTooltip label={ct.beneficiaries2024} tooltipKey="beneficiaries2024" />
                      </th>
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[95px]">
                        <ThHeaderTooltip label={ct.beneficiaries2025} tooltipKey="beneficiaries2025" />
                      </th>
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[90px]">
                        <ThHeaderTooltip label={ct.avg2023} tooltipKey="avg2023" />
                      </th>
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[90px]">
                        <ThHeaderTooltip label={ct.avg2024} tooltipKey="avg2024" />
                      </th>
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[90px]">
                        <ThHeaderTooltip label={ct.avg2025} tooltipKey="avg2025" />
                      </th>
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[90px] bg-slate-900 text-amber-300">
                        <ThHeaderTooltip label={ct.avgDiff} tooltipKey="avgDiff" />
                      </th>

                      {/* 5. Classification & Operations (نشاط المخبز -> نوع المخابز -> نوع الخبز -> سعر الشيكارة -> عدد نوع الخبز -> نوع خط الإنتاج -> نوع الوقود) */}
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[80px]">
                        <ThHeaderTooltip label={ct.activityStatus} tooltipKey="activityStatus" />
                      </th>
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[110px] bg-amber-950/40 text-amber-300">
                        <ThHeaderTooltip label={ct.bakeryCategory} tooltipKey="bakeryCategory" />
                      </th>
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[95px]">
                        <ThHeaderTooltip label={ct.breadType} tooltipKey="breadType" />
                      </th>
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[90px] bg-emerald-950/50 text-emerald-300">
                        <ThHeaderTooltip label={ct.flourBagPrice || 'سعر الشيكارة'} tooltipKey="flourBagPrice" />
                      </th>
                      <th className="py-2 px-1 border-l border-slate-800 min-w-[75px] text-amber-300">
                        <ThHeaderTooltip label={ct.breadTypeCount} tooltipKey="breadTypeCount" />
                      </th>
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[85px]">
                        <ThHeaderTooltip label={ct.lineType} tooltipKey="lineType" />
                      </th>
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[85px]">
                        <ThHeaderTooltip label={ct.fuelType} tooltipKey="fuelType" />
                      </th>

                      {/* 6. Contact and Identity */}
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[100px]">
                        <ThHeaderTooltip label={ct.phone} tooltipKey="phone" />
                      </th>
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[120px]">
                        <ThHeaderTooltip label={ct.nationalId} tooltipKey="nationalId" />
                      </th>

                      {/* 7. Licenses & Dates */}
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[85px]">
                        <ThHeaderTooltip label={ct.commercialRegDate} tooltipKey="commercialRegDate" />
                      </th>
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[85px]">
                        <ThHeaderTooltip label={ct.bakeryLicenseDate} tooltipKey="bakeryLicenseDate" />
                      </th>
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[85px]">
                        <ThHeaderTooltip label={ct.leaseAgreementDate} tooltipKey="leaseAgreementDate" />
                      </th>
                      <th className="py-2 px-2 border-l border-slate-800 min-w-[85px]">
                        <ThHeaderTooltip label={ct.taxCardDate} tooltipKey="taxCardDate" />
                      </th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-slate-800 font-bold">
                    {filteredBakeries.length === 0 ? (
                      <tr>
                        <td colSpan={33} className="py-12 text-center text-slate-400 font-black">
                          لا توجد أي مخابز مطابقة لمعايير البحث الحالية
                        </td>
                      </tr>
                    ) : (
                      filteredBakeries.map((b, index) => {
                        const isSelected = selectedBakeryRowId === b.id;
                        const remainingDebt = bakeryRemainingDebtsMap[b.id] || 0;

                        // Check document expiry
                        const today = new Date();
                        const checkExpiry = (dStr?: string) => {
                          if (!dStr) return false;
                          const d = new Date(dStr);
                          if (isNaN(d.getTime())) return false;
                          const diff = (d.getTime() - today.getTime()) / (1000 * 3600 * 24);
                          return diff <= 15;
                        };

                        const hasLicenseWarning = checkExpiry(b.bakeryLicenseDate);
                        const hasCommWarning = checkExpiry(b.commercialRegDate);
                        const hasLeaseWarning = checkExpiry(b.leaseAgreementDate);
                        const hasTaxWarning = checkExpiry(b.taxCardDate);

                        const isHighDebtOver50K = remainingDebt >= 50000;

                        return (
                          <tr
                            key={b.id}
                            onClick={() => setSelectedBakeryRowId(b.id)}
                            className={`cursor-pointer transition-all duration-300 ${
                              isHighDebtOver50K
                                ? 'bg-gradient-to-r from-red-950 via-red-900 to-rose-950 border-2 border-red-500 animate-pulse text-white shadow-2xl font-black'
                                : isSelected
                                ? 'row-selected'
                                : index % 2 === 0
                                ? 'bg-slate-900/90 hover:bg-slate-800/90'
                                : 'bg-slate-950 hover:bg-slate-800/90'
                            }`}
                          >
                            {/* 1. Index on the RIGHT Side */}
                            <td className="py-2.5 px-1 border-l border-slate-800 text-slate-400 num-enlarged">{index + 1}</td>

                            <td className="py-2.5 px-2 border-l border-slate-800 font-black text-slate-100 text-right">
                              {b.bakeryOwnerName}
                              {isHighDebtOver50K && (
                                <span className="block text-[10px] text-amber-300 font-black">
                                  🚨 مديونية تنبيه عاجل (&gt; 50,000 ج.م)
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 border-l border-slate-800 num-enlarged font-black text-amber-300">
                              {b.machineNumber}
                            </td>
                            <td className="py-2.5 px-2 border-l border-slate-800 text-slate-200">{b.village}</td>
                            <td className="py-2.5 px-2 border-l border-slate-800 text-slate-400">{b.localUnit}</td>

                            {/* 2. Remaining Debt (Smart Badge) */}
                            <td className="py-2.5 px-2 border-l border-slate-800 num-enlarged">
                              {remainingDebt > 0 ? (
                                <div className="flex flex-col items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDebtFilterBakeryId(b.id);
                                      setActiveTab('debts');
                                    }}
                                    className={`px-2 py-1 rounded-lg text-xs font-black transition-all transform hover:scale-105 active:scale-95 cursor-pointer border ${
                                      remainingDebt >= 50000
                                        ? 'bg-red-600 text-white border-yellow-300 shadow-xl animate-pulse font-mono font-black text-sm'
                                        : remainingDebt > 20000
                                        ? 'bg-red-600 text-white border-red-500 shadow-md animate-pulse'
                                        : 'bg-red-950/80 hover:bg-red-900 text-red-200 border-red-700/80'
                                    }`}
                                    title="انقر للانتقال لمديونيات هذا المخبز وتصفيتها"
                                  >
                                    {remainingDebt.toLocaleString()} ج.م
                                  </button>
                                  {remainingDebt >= 50000 && (
                                    <span className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[10px] font-black animate-bounce shadow-md border border-amber-300 tracking-tight">
                                      🚨 مديونية حادة (&gt; 50 ألف)
                                    </span>
                                  )}
                                  {remainingDebt > 20000 && remainingDebt < 50000 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedInstallmentBakeryId(b.id);
                                        setIsWeeklyInstallmentsModalOpen(true);
                                      }}
                                      className="px-1.5 py-0.5 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-600/60 rounded text-[10px] font-black tracking-tight cursor-pointer shadow-2xs whitespace-nowrap transition-transform hover:scale-105"
                                      title="مطلوب دفعات أسبوعية - انقر لعرض جدول وقيم الدفعات"
                                    >
                                      دفعات أسبوعية (&gt; 20 ألف)
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-950/80 text-emerald-300 border border-emerald-700/70 rounded-lg text-[11px] font-black shadow-inner">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  خالص (0)
                                </span>
                              )}
                            </td>

                            {/* 3. Quotas (القيمة التأمينية -> الحصة التأمينية -> الحصة الفعلية -> الأرغفة اليومية -> متوسط نصيب الفرد للمخبز) */}
                            <td className="py-2.5 px-2 border-l border-slate-800 num-enlarged text-slate-300">
                              {b.insuranceValue?.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2 border-l border-slate-800 num-enlarged font-black text-amber-400">
                              {b.insuranceQuota}
                            </td>
                            <td className="py-2.5 px-2 border-l border-slate-800 num-enlarged font-black text-cyan-300">
                              {b.actualQuota}
                            </td>
                            <td className="py-2.5 px-2 border-l border-slate-800 num-enlarged font-black bg-amber-950/30 text-amber-200">
                              {b.loavesCount?.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2 border-l border-slate-800 num-enlarged font-black bg-amber-950/40 text-amber-300">
                              {Number(b.perCapitaAverage || 0).toFixed(2)}
                            </td>

                            {/* 4. Demographics & Averages (سكان القرية -> مستفيد 2023 -> مستفيدين 2024 -> مستفيدين 2025 -> متوسط 2023 -> متوسط 2024 -> متوسط 2025 -> الفرق التراكمي) */}
                            <td className="py-2.5 px-2 border-l border-slate-800 num-enlarged text-slate-300">
                              {b.villagePopulation?.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2 border-l border-slate-800 num-enlarged text-slate-400">
                              {b.beneficiaries2023?.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2 border-l border-slate-800 num-enlarged text-slate-400">
                              {b.beneficiaries2024?.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2 border-l border-slate-800 num-enlarged text-slate-400">
                              {b.beneficiaries2025?.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2 border-l border-slate-800 num-enlarged text-slate-300">{b.avg2023}</td>
                            <td className="py-2.5 px-2 border-l border-slate-800 num-enlarged text-slate-300">{b.avg2024}</td>
                            <td className="py-2.5 px-2 border-l border-slate-800 num-enlarged text-slate-300">{b.avg2025}</td>
                            <td className="py-2.5 px-2 border-l border-slate-800 num-enlarged font-black bg-slate-800 text-amber-300">
                              {b.avgDiff}
                            </td>

                            {/* 5. Classification & Operations (نشاط المخبز -> نوع المخابز -> نوع الخبز -> سعر الشيكارة -> عدد نوع الخبز -> نوع خط الإنتاج -> نوع الوقود) */}
                            <td className="py-2.5 px-2 border-l border-slate-800">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  b.activityStatus === 'شغال'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                                    : 'bg-red-950 text-red-300 border border-red-700/60'
                                }`}
                              >
                                {b.activityStatus}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 border-l border-slate-800">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                  (b.bakeryCategory || 'مخبز بلدي مدعم').includes('مطور')
                                    ? 'bg-yellow-950 text-yellow-300 border-yellow-600/70 shadow-xs'
                                    : (b.bakeryCategory || 'مخبز بلدي مدعم').includes('سياحي')
                                    ? 'bg-cyan-950 text-cyan-300 border-cyan-700/60'
                                    : (b.bakeryCategory || 'مخبز بلدي مدعم').includes('فينو')
                                    ? 'bg-purple-950 text-purple-300 border-purple-700/60'
                                    : (b.bakeryCategory || 'مخبز بلدي مدعم').includes('طباقي')
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                                    : 'bg-amber-950 text-amber-300 border-amber-700/60'
                                }`}
                              >
                                {b.bakeryCategory || 'مخبز بلدي مدعم'}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 border-l border-slate-800 text-slate-200">{b.breadType}</td>
                            <td className="py-2.5 px-2 border-l border-slate-800 num-enlarged font-black text-emerald-300 bg-emerald-950/20">
                              {(b.flourBagPrice ?? 950).toLocaleString()} ج.م
                            </td>
                            <td className="py-2.5 px-1 border-l border-slate-800 num-enlarged font-black text-amber-400 bg-amber-950/20">
                              {b.breadTypeCount || 1}
                            </td>
                            <td className="py-2.5 px-2 border-l border-slate-800 text-slate-300">{b.lineType}</td>
                            <td className="py-2.5 px-2 border-l border-slate-800 text-slate-300">{b.fuelType}</td>

                            {/* 6. Contact and Identity */}
                            <td className="py-2.5 px-2 border-l border-slate-800 num-enlarged text-left tracking-wide font-mono">
                              <a
                                href={`tel:${b.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-amber-400 hover:text-amber-300 hover:underline"
                              >
                                {b.phone}
                              </a>
                            </td>
                            <td className="py-2.5 px-2 border-l border-slate-800 num-enlarged text-left font-mono text-slate-300">
                              {b.nationalId}
                            </td>

                            {/* 7. Licenses & Dates */}
                            <td
                              className={`py-2.5 px-2 border-l border-slate-800 num-enlarged ${
                                hasCommWarning ? 'bg-red-950/80 text-red-300 font-black border border-red-700' : 'text-slate-300'
                              }`}
                            >
                              {formatDateDDMMYYYY(b.commercialRegDate) || '-'}
                            </td>
                            <td
                              className={`py-2.5 px-2 border-l border-slate-800 num-enlarged ${
                                hasLicenseWarning ? 'bg-red-950/80 text-red-300 font-black border border-red-700' : 'text-slate-300'
                              }`}
                            >
                              {formatDateDDMMYYYY(b.bakeryLicenseDate) || '-'}
                            </td>
                            <td
                              className={`py-2.5 px-2 border-l border-slate-800 num-enlarged ${
                                hasLeaseWarning ? 'bg-red-950/80 text-red-300 font-black border border-red-700' : 'text-slate-300'
                              }`}
                            >
                              {formatDateDDMMYYYY(b.leaseAgreementDate) || '-'}
                            </td>
                            <td
                              className={`py-2.5 px-2 border-l border-slate-800 num-enlarged ${
                                hasTaxWarning ? 'bg-red-950/80 text-red-300 font-black border border-red-700' : 'text-slate-300'
                              }`}
                            >
                              {formatDateDDMMYYYY(b.taxCardDate) || '-'}
                            </td>

                            {/* Actions Column moved to the END of the table (Left side in RTL) */}
                            <td className="py-2.5 px-2 border-l border-slate-800 no-print text-center">
                              {appState.currentUser?.role === 'viewer' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg">
                                  <span>👁️</span>
                                  <span>عرض فقط</span>
                                </span>
                              ) : (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setBakeryToEdit(b);
                                      setIsBakeryModalOpen(true);
                                    }}
                                    className="p-1.5 hover:bg-amber-950/80 text-amber-400 hover:text-amber-300 border border-transparent hover:border-amber-700/60 rounded-xl transition-all duration-200 transform hover:scale-120 active:scale-95 shadow-sm cursor-pointer"
                                    title="تعديل بيانات المخبز"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteBakery(b.id, b.bakeryOwnerName);
                                    }}
                                    className="p-1.5 hover:bg-red-950/80 text-red-400 hover:text-red-300 border border-transparent hover:border-red-700/60 rounded-xl transition-all duration-200 transform hover:scale-120 active:scale-95 shadow-sm cursor-pointer"
                                    title="حذف المخبز"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>

      {/* Floating Animated Base Quick Actions Dock on the Right Side (شريط الإجراءات السريعة في القاعدة على اليمين) */}
      <aside aria-label="أزرار القاعدة السريعة" className="fixed bottom-6 right-6 z-40 no-print flex flex-col items-end gap-2.5">
        <div className="bg-slate-950/95 backdrop-blur-md p-2 rounded-2xl border-2 border-amber-500/40 shadow-[0_10px_35px_rgba(0,0,0,0.85)] flex flex-row items-center gap-2">
          {/* Quick Add Bakery Button */}
          {appState.currentUser?.role !== 'viewer' && (
            <button
              type="button"
              onClick={() => {
                setBakeryToEdit(null);
                setIsBakeryModalOpen(true);
              }}
              className="group relative flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg border border-amber-300 transition-all duration-300 transform hover:scale-108 active:scale-95 cursor-pointer"
              title="إضافة مخبز جديد إلى القاعدة"
            >
              <Plus className="w-4 h-4 text-slate-950 stroke-[3] transition-transform duration-300 group-hover:rotate-90" />
              <span className="hidden sm:inline">إضافة مخبز</span>
            </button>
          )}

          {/* Quick Animated Charts Button (مفتاح الرسوم المتحركة مثل باقي المفاتيح) */}
          <button
            type="button"
            onClick={() => setActiveTab('charts')}
            className="group relative flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white font-black text-xs rounded-xl shadow-lg border border-indigo-400/60 transition-all duration-300 transform hover:scale-108 active:scale-95 cursor-pointer"
            title="فتح الرسوم المتحركة والبيانية للمخابز والمديونيات"
          >
            <BarChart3 className="w-4 h-4 text-white transition-transform duration-300 group-hover:scale-110" />
            <span className="hidden sm:inline">الرسوم المتحركة</span>
          </button>

          {/* Quick Daily Tasks Button */}
          <button
            type="button"
            onClick={() => setIsDailyTasksModalOpen(true)}
            className="group relative flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 hover:border-amber-400 font-black text-xs rounded-xl shadow-md transition-all duration-300 transform hover:scale-108 active:scale-95 cursor-pointer"
            title="إدارة المهام اليومية للمخابز"
          >
            <ListTodo className="w-4 h-4 text-amber-400 transition-transform duration-300 group-hover:scale-110" />
            <span className="hidden md:inline">المهام اليومية</span>
          </button>

          {/* Quick Master Editor Button */}
          <button
            type="button"
            onClick={() => {
              setMasterEditorInitialCategory('ALL');
              setIsMasterEditorModalOpen(true);
            }}
            className="group relative flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 hover:border-amber-400 font-black text-xs rounded-xl shadow-md transition-all duration-300 transform hover:scale-108 active:scale-95 cursor-pointer"
            title="التعديل داخل المنظومة (التعديل على جميع القوائم المنسدلة)"
          >
            <Sliders className="w-4 h-4 text-amber-400 transition-transform duration-300 group-hover:scale-110" />
            <span className="hidden md:inline">التعديل داخل المنظومة</span>
          </button>

          {/* Quick Unified Save, Import & Backup Center */}
          <button
            type="button"
            onClick={() => setIsBackupModalOpen(true)}
            className="group relative flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 hover:border-emerald-400 font-black text-xs rounded-xl shadow-md transition-all duration-300 transform hover:scale-108 active:scale-95 cursor-pointer"
            title="الحفظ والاستيراد والنسخ الاحتياطي الموحد"
          >
            <Database className="w-4 h-4 text-emerald-400 transition-transform duration-300 group-hover:scale-110" />
            <span className="hidden lg:inline">الحفظ والاستيراد والنسخ</span>
          </button>

          {/* Quick Print A4 / Reports Center */}
          <button
            type="button"
            onClick={() => {
              setReportModalInitialTab(activeTab === 'debts' ? 'debts' : 'bakeries');
              setIsReportModalOpen(true);
            }}
            className="group relative flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 font-black text-xs rounded-xl shadow-md transition-all duration-200 cursor-pointer"
            title="طباعة الكشف A4 رسمياً وفتح مركز التقارير"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">طباعة الكشف</span>
          </button>
        </div>
      </aside>

      {/* 4. Footer with Official Attribution Watermark */}
      <footer className="bg-black text-slate-300 border-t border-slate-900 py-4 px-4 text-center text-xs font-bold no-print mt-auto">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <p className="text-slate-400">
            {appState.systemConfig.governorateTitle} - {appState.systemConfig.directorateTitle} - {appState.systemConfig.administrationTitle}
          </p>

          <p className="text-amber-400 bg-amber-950/70 border border-amber-600/40 rounded-lg px-4 py-1.5 font-black text-xs shadow-sm">
            تنفيذ وتصميم م/ أحمد الحسيني - تليفون: 01004414038
          </p>

          <p className="text-[11px] text-slate-500 font-mono">
            نظام قاعدة بيانات المخابز والمديونيات v3.0
          </p>
        </div>
      </footer>

      {/* MODALS */}
      {/* 1. Add / Edit Bakery Modal */}
      {isBakeryModalOpen && (
        <BakeryModal
          isOpen={isBakeryModalOpen}
          onClose={() => setIsBakeryModalOpen(false)}
          bakeryToEdit={bakeryToEdit}
          existingBakeries={appState.bakeries}
          villages={appState.villages}
          activityStatuses={appState.activityStatuses}
          bakeryCategories={appState.bakeryCategories}
          breadTypes={appState.breadTypes}
          breadTypeCounts={appState.breadTypeCounts}
          lineTypes={appState.lineTypes}
          fuelTypes={appState.fuelTypes}
          currentUser={appState.currentUser}
          onAddActivityStatus={(newStatus) => {
            if (!appState.activityStatuses.includes(newStatus)) {
              triggerSave({
                ...appState,
                activityStatuses: [...appState.activityStatuses, newStatus],
              });
            }
          }}
          onAddLocalUnit={(villageName, newUnit) => {
            const updatedVillages = appState.villages.map((v) => {
              if (v.village === villageName && !v.localUnits.includes(newUnit)) {
                return { ...v, localUnits: [...v.localUnits, newUnit] };
              }
              return v;
            });
            triggerSave({ ...appState, villages: updatedVillages });
          }}
          onUpdateDropdownList={(listKey, updatedList) => {
            triggerSave(
              {
                ...appState,
                [listKey]: updatedList,
              },
              'تم تحديث وحفظ القائمة المنسدلة بنجاح'
            );
          }}
          onOpenMasterDropdownEditor={() => {
            setIsBakeryModalOpen(false);
            setMasterEditorInitialCategory('ALL');
            setIsMasterEditorModalOpen(true);
          }}
          onSave={handleSaveBakery}
        />
      )}

      {/* 1.1 Daily Tasks Manager Modal (إدارة المهام اليومية) */}
      {isDailyTasksModalOpen && (
        <DailyTasksModal
          isOpen={isDailyTasksModalOpen}
          onClose={() => setIsDailyTasksModalOpen(false)}
          tasks={appState.dailyTasks || []}
          bakeries={appState.bakeries}
          currentUser={appState.currentUser}
          onSaveTasks={(updatedTasks, toastMessage) =>
            triggerSave({ ...appState, dailyTasks: updatedTasks }, toastMessage)
          }
        />
      )}

      {/* 1.2 Unified Master System & Dropdowns Editor Modal (التعديل داخل المنظومة / التعديل على جميع القوائم المنسدلة) */}
      {isMasterEditorModalOpen && (
        <SystemMasterEditorModal
          isOpen={isMasterEditorModalOpen}
          onClose={() => setIsMasterEditorModalOpen(false)}
          appState={appState}
          onUpdateState={(newState, toastMsg) => triggerSave(newState, toastMsg)}
          initialCategory={masterEditorInitialCategory}
          onOpenColumnTitles={() => {
            setIsMasterEditorModalOpen(false);
            setIsColumnModalOpen(true);
          }}
          onOpenHeaderCustomizer={() => {
            setIsMasterEditorModalOpen(false);
            setIsHeaderModalOpen(true);
          }}
          onOpenDailyReminders={() => {
            setIsMasterEditorModalOpen(false);
            setIsDailySettingsModalOpen(true);
          }}
          onOpenUsersManager={() => {
            setIsMasterEditorModalOpen(false);
            setIsUsersModalOpen(true);
          }}
          onOpenVillagesManager={() => {
            setIsMasterEditorModalOpen(false);
            setIsVillageModalOpen(true);
          }}
        />
      )}

      {/* 2. Modify Column Titles Modal */}
      {isColumnModalOpen && (
        <ColumnTitlesModal
          isOpen={isColumnModalOpen}
          onClose={() => setIsColumnModalOpen(false)}
          titles={appState.columnTitles}
          onSaveTitles={(updatedTitles) =>
            triggerSave({ ...appState, columnTitles: updatedTitles }, 'تم حفظ وتحديث مسميات رؤوس الخانات بنجاح')
          }
        />
      )}

      {/* 3. Automatic Expiration Alerts Modal */}
      {isAlertsModalOpen && (
        <AlertsModal
          isOpen={isAlertsModalOpen}
          onClose={() => setIsAlertsModalOpen(false)}
          bakeries={appState.bakeries}
          debts={appState.debts}
          onOpenDailySettings={() => {
            setIsAlertsModalOpen(false);
            setIsDailySettingsModalOpen(true);
          }}
          onOpenWeeklyInstallments={(bakeryId) => {
            setSelectedInstallmentBakeryId(bakeryId);
            setIsWeeklyInstallmentsModalOpen(true);
          }}
          onOpenBakeryEdit={(bakeryId) => {
            const found = appState.bakeries.find((b) => b.id === bakeryId);
            if (found) {
              setBakeryToEdit(found);
              setIsBakeryModalOpen(true);
            }
          }}
        />
      )}

      {/* 3.1 Weekly Installments Modal for Debts > 20,000 EGP */}
      {isWeeklyInstallmentsModalOpen && (
        <WeeklyInstallmentsModal
          isOpen={isWeeklyInstallmentsModalOpen}
          onClose={() => {
            setIsWeeklyInstallmentsModalOpen(false);
            setSelectedInstallmentBakeryId(undefined);
          }}
          bakeries={appState.bakeries}
          debts={appState.debts}
          systemConfig={appState.systemConfig}
          initialBakeryId={selectedInstallmentBakeryId}
          currentUser={appState.currentUser}
        />
      )}

      {/* 3.2 Activity Statuses Manager Modal */}
      {isActivityModalOpen && (
        <ActivityStatusModal
          isOpen={isActivityModalOpen}
          onClose={() => setIsActivityModalOpen(false)}
          statuses={appState.activityStatuses}
          bakeries={appState.bakeries}
          onSaveStatuses={(updatedStatuses) =>
            triggerSave({ ...appState, activityStatuses: updatedStatuses }, 'تم حفظ وتحديث حالات نشاط المخابز بنجاح')
          }
        />
      )}

      {/* 4. Header & System Settings Customizer Modal (includes 'إعدادات التذكير') */}
      {isHeaderModalOpen && (
        <HeaderCustomizerModal
          isOpen={isHeaderModalOpen}
          onClose={() => setIsHeaderModalOpen(false)}
          config={appState.systemConfig}
          onSaveConfig={(updatedConfig) =>
            triggerSave({ ...appState, systemConfig: updatedConfig }, 'تم حفظ وتحديث إعدادات النظام والترويسة وإعدادات التذكير بنجاح')
          }
          onOpenDailyAlertSettings={() => setIsDailySettingsModalOpen(true)}
        />
      )}

      {/* 5. Village Hierarchy Manager Modal */}
      {isVillageModalOpen && (
        <VillageManagerModal
          isOpen={isVillageModalOpen}
          onClose={() => setIsVillageModalOpen(false)}
          villages={appState.villages}
          onSaveVillages={(updatedVillages) =>
            triggerSave({ ...appState, villages: updatedVillages }, 'تم حفظ وتحديث القرى والوحدات المحلية بنجاح')
          }
        />
      )}

      {/* 6. Landscape A4 Reporting Center Modal */}
      {isReportModalOpen && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          bakeries={appState.bakeries}
          debts={appState.debts}
          villages={appState.villages}
          columnTitles={appState.columnTitles}
          systemConfig={appState.systemConfig}
          currentUser={appState.currentUser}
          users={appState.users}
          initialReportType={reportModalInitialTab}
        />
      )}

      {/* 7. Backup & Partition & Google Drive & Factory Reset Modal */}
      {isBackupModalOpen && (
        <BackupModal
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
          currentState={appState}
          onRestoreState={(restored) => triggerSave(restored, 'تم استعادة وتطبيق قاعدة البيانات بنجاح')}
          onFactoryReset={async () => {
            await factoryReset();
          }}
        />
      )}

      {/* 8. Users & Inspectors Manager Modal */}
      {isUsersModalOpen && (
        <UsersManagerModal
          isOpen={isUsersModalOpen}
          onClose={() => setIsUsersModalOpen(false)}
          users={appState.users}
          currentUser={appState.currentUser}
          onAddUser={(newUser) =>
            triggerSave({ ...appState, users: [...appState.users, newUser] }, 'تم إضافة وحفظ المستخدم الجديد بنجاح')
          }
          onUpdateUser={(updatedUser) => {
            const updatedUsers = appState.users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
            const isCurrent = appState.currentUser?.id === updatedUser.id;
            if (isCurrent) {
              saveSessionUser(updatedUser);
            }
            triggerSave(
              {
                ...appState,
                users: updatedUsers,
                currentUser: isCurrent ? updatedUser : appState.currentUser,
              },
              `تم حفظ تعديل بيانات الحساب والاسم بالكامل (${updatedUser.fullName}) والصلاحيات بنجاح`
            );
          }}
          onDeleteUser={(userId) => {
            const updatedUsers = appState.users.filter((u) => u.id !== userId);
            triggerSave({ ...appState, users: updatedUsers }, 'تم حذف المستخدم وتحديث القائمة بنجاح');
          }}
        />
      )}

      {/* 8.1 Advanced Role Permissions & Users Management Modal (إعدادات الصلاحيات المتقدمة في SystemConfig) */}
      {isAdvancedPermissionsModalOpen && (
        <AdvancedPermissionsModal
          isOpen={isAdvancedPermissionsModalOpen}
          onClose={() => setIsAdvancedPermissionsModalOpen(false)}
          systemConfig={appState.systemConfig}
          onSaveSystemConfig={(updatedConfig: SystemConfig) =>
            triggerSave(
              { ...appState, systemConfig: updatedConfig },
              'تم حفظ إعدادات الصلاحيات المتقدمة والأدوار الوظيفية في SystemConfig بنجاح'
            )
          }
          users={appState.users}
          currentUser={appState.currentUser}
          onAddUser={(newUser) =>
            triggerSave({ ...appState, users: [...appState.users, newUser] }, `تم إضافة وحفظ المستخدم الجديد (${newUser.fullName}) بنجاح`)
          }
          onUpdateUser={(updatedUser) => {
            const updatedUsers = appState.users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
            const isCurrent = appState.currentUser?.id === updatedUser.id;
            if (isCurrent) {
              saveSessionUser(updatedUser);
            }
            triggerSave(
              {
                ...appState,
                users: updatedUsers,
                currentUser: isCurrent ? updatedUser : appState.currentUser,
              },
              `تم حفظ تعديل بيانات الحساب والاسم بالكامل (${updatedUser.fullName}) واليوزر والباسورد والدور الوظيفي بنجاح`
            );
          }}
          onDeleteUser={(userId) => {
            const updatedUsers = appState.users.filter((u) => u.id !== userId);
            triggerSave({ ...appState, users: updatedUsers }, 'تم حذف المستخدم وتحديث القائمة بنجاح');
          }}
        />
      )}

      {/* 9. Comprehensive Math & Code Audit Verification Modal */}
      {isAuditModalOpen && (
        <AuditModal
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
          bakeries={appState.bakeries}
          debts={appState.debts}
          systemConfig={appState.systemConfig}
        />
      )}

      {/* 10. Interactive Annual Budget Frequency & 12-Month Breakdown Modal */}
      {isBudgetFrequencyModalOpen && (
        <AnnualBudgetFrequencyModal
          isOpen={isBudgetFrequencyModalOpen}
          onClose={() => setIsBudgetFrequencyModalOpen(false)}
          bakeries={appState.bakeries}
          flourBagPrice={flourBagPrice}
          onUpdateFlourBagPrice={(price) => setFlourBagPrice(price)}
          systemConfig={appState.systemConfig}
        />
      )}

      {/* 11. Statistical Summary by Local Unit Modal (ملخص إحصائي) */}
      {isLocalUnitsModalOpen && (
        <LocalUnitsSummaryModal
          isOpen={isLocalUnitsModalOpen}
          onClose={() => setIsLocalUnitsModalOpen(false)}
          bakeries={appState.bakeries}
          debts={appState.debts}
          villages={appState.villages}
          systemConfig={appState.systemConfig}
          onNavigateToBakeries={(localUnit) => {
            setActiveTab('bakeries');
            setSelectedUnit(localUnit);
          }}
          onNavigateToDebts={(localUnit) => {
            setActiveTab('debts');
            setSelectedUnit(localUnit);
          }}
        />
      )}

      {/* 12. Daily Alert & Reminder Settings Modal (إعدادات التنبيه اليومي والتذكير) */}
      {isDailySettingsModalOpen && (
        <DailyAlertSettingsModal
          isOpen={isDailySettingsModalOpen}
          onClose={() => setIsDailySettingsModalOpen(false)}
          config={
            appState.systemConfig?.dailyAlertConfig || {
              enabled: true,
              alertTime: '09:00',
              notifyBrowser: true,
              notifySound: true,
              targetDocs: ['bakeryLicenseDate', 'commercialRegDate', 'leaseAgreementDate', 'taxCardDate'],
              daysThreshold: 15,
            }
          }
          bakeries={appState.bakeries}
          currentUser={appState.currentUser}
          onSaveConfig={handleSaveDailyAlertConfig}
          onTriggerTestAlert={handleTriggerTestAlert}
        />
      )}

      {/* 13. Daily Alert Notification Popup Modal */}
      {dailyNotificationData.isOpen && (
        <DailyAlertNotificationModal
          isOpen={dailyNotificationData.isOpen}
          onClose={() => setDailyNotificationData((prev) => ({ ...prev, isOpen: false }))}
          expiredBakeries={dailyNotificationData.expiredBakeries}
          alertTime={dailyNotificationData.alertTime}
          onViewInBakeriesTable={() => {
            setDailyNotificationData((prev) => ({ ...prev, isOpen: false }));
            setActiveTab('bakeries');
          }}
          onOpenAlertsCenter={() => {
            setDailyNotificationData((prev) => ({ ...prev, isOpen: false }));
            setIsAlertsModalOpen(true);
          }}
        />
      )}

      {/* 14. Inbox Chat & Administrative Instructions Modal (صندوق الوارد) */}
      <InboxChatModal
        isOpen={isInboxModalOpen}
        onClose={() => setIsInboxModalOpen(false)}
        currentUser={appState.currentUser}
        users={appState.users}
        bakeries={appState.bakeries}
        messages={inboxMessages}
        onSendMessage={handleSendInboxMessage}
        onDeleteMessage={handleDeleteInboxMessage}
        onMarkAllRead={handleMarkAllInboxRead}
      />

      {/* 15. Daily Database Entry Comprehensive Briefing Modal (شاشة التنبيه اليومي للمديونيات والتراخيص والعقود المنتهية) */}
      <DailyEntryBriefingModal
        isOpen={isDailyBriefingModalOpen}
        onClose={() => setIsDailyBriefingModalOpen(false)}
        bakeries={appState.bakeries}
        debts={appState.debts}
        expiryLeadDays={appState.systemConfig?.dailyAlertConfig?.daysThreshold || 30}
        onJumpToDebtsView={() => {
          setActiveTab('debts');
          setDebtFilterBakeryId(undefined);
        }}
        onOpenAlertsModal={() => setIsAlertsModalOpen(true)}
        onOpenInboxModal={() => setIsInboxModalOpen(true)}
        onEditBakery={(bakery) => {
          setBakeryToEdit(bakery);
          setIsBakeryModalOpen(true);
        }}
        unreadInboxCount={unreadInboxCount}
      />

      {/* Real-time Floating Save Success Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-[9999] max-w-md animate-in slide-in-from-bottom-5 duration-200">
          <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 text-white border-2 border-emerald-400 rounded-2xl p-4 shadow-2xl flex items-center gap-3 backdrop-blur-md ring-4 ring-emerald-500/20">
            <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-400/50 text-emerald-300 shrink-0">
              <CheckCircle2 className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-black text-emerald-300">تم الحفظ بنجاح وتأمين البيانات</h4>
                <span className="text-[10px] text-slate-400 font-mono">{saveToast.timestamp}</span>
              </div>
              <p className="text-xs font-bold text-slate-100 mt-0.5 leading-snug">
                {saveToast.message}
              </p>
            </div>
            <button
              onClick={() => setSaveToast(null)}
              className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Admin Manager Notifications Drawer Sidebar */}
      <AdminNotificationsDrawer
        isOpen={isAdminDrawerOpen}
        onClose={() => setIsAdminDrawerOpen(false)}
        notifications={highDebtNotifications}
        onMarkAsRead={(id) => {
          setHighDebtNotifications((prev) => {
            const updated = prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
            localStorage.setItem('TAMWEEN_HIGH_DEBT_NOTIFICATIONS', JSON.stringify(updated));
            return updated;
          });
        }}
        onMarkAllAsRead={() => {
          setHighDebtNotifications((prev) => {
            const updated = prev.map((n) => ({ ...n, isRead: true }));
            localStorage.setItem('TAMWEEN_HIGH_DEBT_NOTIFICATIONS', JSON.stringify(updated));
            return updated;
          });
        }}
        onClearAll={() => {
          setHighDebtNotifications([]);
          localStorage.removeItem('TAMWEEN_HIGH_DEBT_NOTIFICATIONS');
        }}
        onSelectBakeryDebt={(bakeryId) => {
          setDebtFilterBakeryId(bakeryId);
          setActiveTab('debts');
        }}
      />
    </div>
  );
}
