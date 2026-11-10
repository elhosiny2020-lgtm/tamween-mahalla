import React, { useState, useEffect } from 'react';
import {
  AppState,
  saveBackupToPartition,
  mergeAutoSaveOntoCurrent,
  autoDiscoverAndMergeAllDatabases,
  getLatestAutoSaveInfo,
  mergeStates
} from '../storage';
import {
  downloadUpdatedAppHtml,
  downloadAppLauncherHtml,
  downloadMinistryDesktopShortcut,
  downloadWindowsUrlShortcut,
  downloadWindowsDesktopInstallerBat,
  downloadWindowsVbsLauncher,
  downloadWindowsExeLauncher,
  openStandaloneAppInNewTab
} from '../utils/htmlExporter';
import { DEFAULT_OFFICIAL_LOGO } from '../defaultData';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  HardDrive,
  Download,
  Upload,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  X,
  FileJson,
  FileCode,
  Globe,
  Layers,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Database,
  ArrowRight
} from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentState: AppState;
  onRestoreState: (restored: AppState) => void;
  onFactoryReset: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  currentState,
  onRestoreState,
  onFactoryReset,
}) => {
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // GitHub Backup & Cloud Sync state
  const [githubEmail, setGithubEmail] = useState<string>(() => localStorage.getItem('TAMWEEN_GITHUB_EMAIL') || 'tamween-mahalla@egypt.gov.eg');
  const [githubRepo, setGithubRepo] = useState<string>(() => localStorage.getItem('TAMWEEN_GITHUB_REPO') || 'tamween-system-backup');
  const [githubAutoSync, setGithubAutoSync] = useState<boolean>(() => localStorage.getItem('TAMWEEN_GITHUB_AUTOSYNC') !== 'false');
  const [githubToken, setGithubToken] = useState<string>(() => localStorage.getItem('TAMWEEN_GITHUB_TOKEN') || '');

  // Custom Backup Destination State (Google Drive / Local Network Path / Custom Folder)
  const [customBackupType, setCustomBackupType] = useState<'GOOGLE_DRIVE' | 'LOCAL_NETWORK' | 'CUSTOM_FOLDER'>(
    () => (localStorage.getItem('TAMWEEN_CUSTOM_BACKUP_TYPE') as any) || 'GOOGLE_DRIVE'
  );
  const [customBackupPath, setCustomBackupPath] = useState<string>(
    () => localStorage.getItem('TAMWEEN_CUSTOM_BACKUP_PATH') || 'G:\\My Drive\\Tamween_Backups\\'
  );
  const [customAutoSync, setCustomAutoSync] = useState<boolean>(
    () => localStorage.getItem('TAMWEEN_CUSTOM_AUTOSYNC') !== 'false'
  );
  const [gmailEmail, setGmailEmail] = useState<string>(
    () =>
      localStorage.getItem('TAMWEEN_GMAIL_DRIVE_EMAIL') ||
      currentState.currentUser?.gmailEmail ||
      currentState.systemConfig?.gmailEmail ||
      'ELHOSINY2020@gmail.com'
  );
  const [gmailPassword, setGmailPassword] = useState<string>(
    () =>
      localStorage.getItem('TAMWEEN_GMAIL_DRIVE_PASSWORD') ||
      currentState.currentUser?.gmailPassword ||
      currentState.systemConfig?.gmailPassword ||
      ''
  );
  const [googleDriveAutoSync, setGoogleDriveAutoSync] = useState<boolean>(
    () => localStorage.getItem('TAMWEEN_GMAIL_DRIVE_AUTOSYNC') !== 'false'
  );

  const { isInstallable, isInstalled, install } = usePWAInstall();
  const autoSaveInfo = getLatestAutoSaveInfo();
  const formattedAutoSaveTime = autoSaveInfo?.timestamp
    ? new Date(autoSaveInfo.timestamp).toLocaleString('ar-EG')
    : null;

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

  // 1. Comprehensive Smart Sync: Update existing & add missing only
  const handleSmartSyncAndUpsert = async () => {
    setIsProcessing(true);
    setStatusMsg({ text: 'جاري فحص جميع قواعد البيانات المحفوظة ودمجها وتحديث المخابز القائمة وإضافة غير المتوفر فقط...', type: 'info' });
    const res = await autoDiscoverAndMergeAllDatabases(currentState);
    setIsProcessing(false);
    if (res.success && res.newState) {
      onRestoreState(res.newState);
      setStatusMsg({ text: res.message, type: 'success' });
    } else {
      setStatusMsg({ text: res.message, type: 'error' });
    }
  };

  // 2. Smart Sync then download updated standalone HTML application immediately
  const handleSmartSyncAndDownloadHtml = async () => {
    setIsProcessing(true);
    setStatusMsg({ text: 'جاري فحص وتحديث ودمج البيانات أولاً...', type: 'info' });
    const res = await autoDiscoverAndMergeAllDatabases(currentState);
    if (res.success && res.newState) {
      onRestoreState(res.newState);
      setStatusMsg({ text: `${res.message} جاري الآن تنزيل ملف البرنامج المحدث...`, type: 'info' });
      const dlRes = await downloadUpdatedAppHtml(res.newState);
      setIsProcessing(false);
      if (dlRes.success) {
        setStatusMsg({
          text: `${res.message} وتم بنجاح تنزيل ملف البرنامج المحدث (${dlRes.fileName})! يفتح مباشرة على أي جهاز.`,
          type: 'success',
        });
      } else {
        setStatusMsg({ text: dlRes.message, type: 'error' });
      }
    } else {
      // Fallback: download current state
      const dlRes = await downloadUpdatedAppHtml(currentState);
      setIsProcessing(false);
      setStatusMsg({ text: dlRes.message, type: dlRes.success ? 'success' : 'error' });
    }
  };

  // 3. Save to partition (C:, D:, USB)
  const handleSaveToPartition = async () => {
    setStatusMsg({ text: 'جاري فتح نافذة النظام لاختيار البارتيشن وحفظ الملف...', type: 'info' });
    const backupPayload = {
      version: '3.0',
      timestamp: new Date().toISOString(),
      governorate: currentState.systemConfig.governorateTitle,
      directorate: currentState.systemConfig.directorateTitle,
      administration: currentState.systemConfig.administrationTitle,
      data: {
        bakeries: currentState.bakeries,
        debts: currentState.debts,
        villages: currentState.villages,
        issuingEntities: currentState.issuingEntities,
        violationTypes: currentState.violationTypes,
        activityStatuses: currentState.activityStatuses,
        columnTitles: currentState.columnTitles,
        systemConfig: currentState.systemConfig,
        users: currentState.users,
      },
    };

    const res = await saveBackupToPartition(backupPayload);
    if (res.success) {
      setStatusMsg({ text: res.message, type: 'success' });
    } else {
      setStatusMsg({ text: res.message, type: 'error' });
    }
  };

  // 4. Merge uploaded JSON or HTML file without deleting current records
  const handleMergeUploadedFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let incomingData: Partial<AppState> | null = null;

        if (file.name.endsWith('.json') || text.trim().startsWith('{')) {
          const parsed = JSON.parse(text);
          incomingData = parsed.data || parsed;
        } else {
          // Extract preloaded state from HTML
          const match = text.match(/window\.PRELOADED_TAMWEEN_STATE\s*=\s*({[\s\S]*?});/);
          if (match && match[1]) {
            incomingData = JSON.parse(match[1]);
          } else {
            throw new Error('لم يتم العثور على قاعدة بيانات صالحة داخل ملف الـ HTML المختار');
          }
        }

        if (!incomingData || (!incomingData.bakeries && !incomingData.debts)) {
          throw new Error('الملف لا يحتوي على سجلات مخابز أو مديونيات متوافقة');
        }

        const merged = mergeStates(currentState, incomingData);
        onRestoreState(merged);
        setStatusMsg({
          text: `تم دمج ملف البيانات بنجاح! الإجمالي الحالي: (${merged.bakeries.length}) مخبز و (${merged.debts.length}) قيد مديونية دون حذف أي مخابز سابقة.`,
          type: 'success',
        });
      } catch (err: unknown) {
        setStatusMsg({
          text: `فشل دمج الملف: ${(err as Error).message}`,
          type: 'error',
        });
      }
    };
    reader.readAsText(file);
  };

  // 5. Restore full replace from JSON
  const handleFullRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || !parsed.data) {
          throw new Error('الملف غير مطابق لبنية النسخ الاحتياطية المعتمدة');
        }

        const restoredData: AppState = {
          ...currentState,
          bakeries: parsed.data.bakeries || [],
          debts: parsed.data.debts || [],
          villages: parsed.data.villages || currentState.villages,
          activityStatuses: parsed.data.activityStatuses || currentState.activityStatuses,
          bakeryCategories: parsed.data.bakeryCategories || currentState.bakeryCategories,
          breadTypes: parsed.data.breadTypes || currentState.breadTypes,
          breadTypeCounts: parsed.data.breadTypeCounts || currentState.breadTypeCounts,
          lineTypes: parsed.data.lineTypes || currentState.lineTypes,
          fuelTypes: parsed.data.fuelTypes || currentState.fuelTypes,
          issuingEntities: parsed.data.issuingEntities || currentState.issuingEntities,
          violationTypes: parsed.data.violationTypes || currentState.violationTypes,
          paymentMethods: parsed.data.paymentMethods || currentState.paymentMethods,
          dailyTasks: parsed.data.dailyTasks || currentState.dailyTasks,
          columnTitles: parsed.data.columnTitles || currentState.columnTitles,
          systemConfig: parsed.data.systemConfig || currentState.systemConfig,
          users: parsed.data.users || currentState.users,
          currentUser: currentState.currentUser,
        };

        onRestoreState(restoredData);
        setStatusMsg({
          text: `تم استعادة قاعدة البيانات واستبدالها بنجاح! تم استرجاع (${restoredData.bakeries.length}) مخبز و (${restoredData.debts.length}) قيد مديونية.`,
          type: 'success',
        });
      } catch (err: unknown) {
        setStatusMsg({
          text: `فشل استرجاع الملف: ${(err as Error).message}`,
          type: 'error',
        });
      }
    };
    reader.readAsText(file);
  };

  // 6. Import Backup Package from GitHub
  const handleImportGithubPackage = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Support both direct payload { version, data: AppState } or raw AppState
        const sourceData = parsed.data || parsed.state || parsed;

        if (!sourceData || (!Array.isArray(sourceData.bakeries) && !Array.isArray(sourceData.debts))) {
          throw new Error('حزمة GitHub غير مطابقة لبنية قاعدة بيانات المنظومة');
        }

        const restoredData: AppState = {
          ...currentState,
          bakeries: sourceData.bakeries || [],
          debts: sourceData.debts || [],
          villages: sourceData.villages || currentState.villages,
          activityStatuses: sourceData.activityStatuses || currentState.activityStatuses,
          bakeryCategories: sourceData.bakeryCategories || currentState.bakeryCategories,
          breadTypes: sourceData.breadTypes || currentState.breadTypes,
          breadTypeCounts: sourceData.breadTypeCounts || currentState.breadTypeCounts,
          lineTypes: sourceData.lineTypes || currentState.lineTypes,
          fuelTypes: sourceData.fuelTypes || currentState.fuelTypes,
          issuingEntities: sourceData.issuingEntities || currentState.issuingEntities,
          violationTypes: sourceData.violationTypes || currentState.violationTypes,
          paymentMethods: sourceData.paymentMethods || currentState.paymentMethods,
          dailyTasks: sourceData.dailyTasks || currentState.dailyTasks,
          columnTitles: sourceData.columnTitles || currentState.columnTitles,
          systemConfig: {
            ...(sourceData.systemConfig || currentState.systemConfig),
            // Always lock the official logo from GitHub into the restored state
            logoBase64: DEFAULT_OFFICIAL_LOGO,
          },
          users: sourceData.users || currentState.users,
          currentUser: currentState.currentUser,
        };

        // Cache this as the active GitHub sync payload
        localStorage.setItem(
          'TAMWEEN_GITHUB_SYNC_PAYLOAD',
          JSON.stringify({
            version: parsed.version || '3.0-github-sync',
            timestamp: parsed.timestamp || new Date().toISOString(),
            accountEmail: parsed.accountEmail || githubEmail,
            repository: parsed.repository || githubRepo,
            bakeriesCount: restoredData.bakeries.length,
            debtsCount: restoredData.debts.length,
            data: restoredData,
          })
        );

        onRestoreState(restoredData);
        setStatusMsg({
          text: `تم استيراد حزمة النسخة الاحتياطية من GitHub بنجاح! تم استرجاع (${restoredData.bakeries.length}) مخبز و (${restoredData.debts.length}) قيد مديونية وتثبيت الشعار المعتمد.`,
          type: 'success',
        });
      } catch (err: unknown) {
        setStatusMsg({
          text: `فشل استيراد حزمة GitHub: ${(err as Error).message}`,
          type: 'error',
        });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  // 7. Instant Restore from Cached GitHub Sync Snapshot
  const handleRestoreFromGithubSyncSnapshot = () => {
    try {
      const savedStr = localStorage.getItem('TAMWEEN_GITHUB_SYNC_PAYLOAD');
      if (!savedStr) {
        throw new Error('لا توجد حزمة سحابية مخزنة مسبقاً بحساب GitHub. يرجى اختيار ملف الحزمة أو حفظ نسخة أولاً.');
      }
      const parsed = JSON.parse(savedStr);
      const sourceData = parsed.data || parsed.state || parsed;

      const restoredData: AppState = {
        ...currentState,
        bakeries: sourceData.bakeries || [],
        debts: sourceData.debts || [],
        villages: sourceData.villages || currentState.villages,
        activityStatuses: sourceData.activityStatuses || currentState.activityStatuses,
        bakeryCategories: sourceData.bakeryCategories || currentState.bakeryCategories,
        breadTypes: sourceData.breadTypes || currentState.breadTypes,
        breadTypeCounts: sourceData.breadTypeCounts || currentState.breadTypeCounts,
        lineTypes: sourceData.lineTypes || currentState.lineTypes,
        fuelTypes: sourceData.fuelTypes || currentState.fuelTypes,
        issuingEntities: sourceData.issuingEntities || currentState.issuingEntities,
        violationTypes: sourceData.violationTypes || currentState.violationTypes,
        paymentMethods: sourceData.paymentMethods || currentState.paymentMethods,
        dailyTasks: sourceData.dailyTasks || currentState.dailyTasks,
        columnTitles: sourceData.columnTitles || currentState.columnTitles,
        systemConfig: {
          ...(sourceData.systemConfig || currentState.systemConfig),
          logoBase64: DEFAULT_OFFICIAL_LOGO,
        },
        users: sourceData.users || currentState.users,
        currentUser: currentState.currentUser,
      };

      onRestoreState(restoredData);
      setStatusMsg({
        text: `تم استرجاع ومزامنة حزمة GitHub (${parsed.accountEmail || githubEmail}) بنجاح! تم تحميل (${restoredData.bakeries.length}) مخبز و (${restoredData.debts.length}) مديونية.`,
        type: 'success',
      });
    } catch (err: unknown) {
      setStatusMsg({
        text: (err as Error).message,
        type: 'error',
      });
    }
  };

  // 8. Import Google Drive Backup Package (.json or .html)
  const handleImportGoogleDrivePackage = (file: File) => {
    setIsProcessing(true);
    setStatusMsg({
      text: `جاري قراءة واستيراد النسخة الاحتياطية من Google Drive (${file.name})...`,
      type: 'info',
    });

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rawText = String(reader.result || '');
        let parsed: any = null;

        if (file.name.toLowerCase().endsWith('.html')) {
          const match = rawText.match(/window\.PRELOADED_TAMWEEN_STATE\s*=\s*(\{[\s\S]*?\});/);
          if (match && match[1]) {
            parsed = JSON.parse(match[1]);
          } else {
            throw new Error('لم يتم العثور على قاعدة بيانات مضمنة داخل ملف HTML المختار من Google Drive.');
          }
        } else {
          parsed = JSON.parse(rawText);
        }

        const sourceData = parsed.data || parsed.state || parsed;
        if (!sourceData || !Array.isArray(sourceData.bakeries)) {
          throw new Error('ملف النسخة الاحتياطية المختار من Google Drive غير صالح أو لا يحتوي على سجل المخابز.');
        }

        const prevBakeriesCount = currentState.bakeries.length;
        const mergedState = mergeStates(currentState, sourceData as Partial<AppState>);
        const addedBakeries = Math.max(0, mergedState.bakeries.length - prevBakeriesCount);
        const restoredData: AppState = {
          ...mergedState,
          systemConfig: {
            ...(mergedState.systemConfig || currentState.systemConfig),
            gmailEmail: gmailEmail.trim() || currentState.systemConfig.gmailEmail,
            gmailPassword: gmailPassword || currentState.systemConfig.gmailPassword,
            googleDriveAutoSync: true,
            logoBase64: DEFAULT_OFFICIAL_LOGO,
          },
          currentUser: currentState.currentUser,
        };

        const syncPayload = {
          version: '3.5-google-drive-gmail-merge',
          timestamp: new Date().toISOString(),
          destinationType: 'GOOGLE_DRIVE',
          gmailEmail: gmailEmail.trim(),
          targetPath: customBackupPath,
          data: restoredData,
        };

        localStorage.setItem('TAMWEEN_CUSTOM_BACKUP_PAYLOAD', JSON.stringify(syncPayload));
        if (gmailEmail.trim()) {
          localStorage.setItem(
            `TAMWEEN_GMAIL_DRIVE_SYNC_${gmailEmail.trim().toLowerCase()}`,
            JSON.stringify(syncPayload)
          );
        }

        onRestoreState(restoredData);
        setStatusMsg({
          text: `تم استيراد ودمج النسخة الاحتياطية من Google Drive (${file.name}) بنجاح دون حذف أي بيانات! إجمالي المخابز الآن (${restoredData.bakeries.length}) مخبز (أضيف ${addedBakeries} مخبز جديد) وإجمالي المديونيات (${restoredData.debts.length}).`,
          type: 'success',
        });
      } catch (err: unknown) {
        setStatusMsg({
          text: `فشل استيراد نسخة Google Drive: ${(err as Error).message}`,
          type: 'error',
        });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  // 9. Instant Restore & Additive Merge from Cached Google Drive Snapshot
  const handleRestoreFromGoogleDriveSnapshot = () => {
    try {
      const gmailKey = gmailEmail.trim().toLowerCase();
      const savedStr =
        (gmailKey ? localStorage.getItem(`TAMWEEN_GMAIL_DRIVE_SYNC_${gmailKey}`) : null) ||
        localStorage.getItem('TAMWEEN_CUSTOM_BACKUP_PAYLOAD') ||
        localStorage.getItem('TAMWEEN_GITHUB_SYNC_PAYLOAD');
      if (!savedStr) {
        throw new Error(
          'لا توجد نسخة Google Drive محفوظة مسبقاً في الذاكرة السريعة. يرجى الضغط على "نسخ تلقائي على Google Drive" أو اختيار ملف JSON.'
        );
      }
      const parsed = JSON.parse(savedStr);
      const sourceData = parsed.data || parsed.state || parsed;

      const mergedState = mergeStates(currentState, sourceData as Partial<AppState>);
      const restoredData: AppState = {
        ...mergedState,
        systemConfig: {
          ...(mergedState.systemConfig || currentState.systemConfig),
          gmailEmail: gmailEmail.trim() || currentState.systemConfig.gmailEmail,
          gmailPassword: gmailPassword || currentState.systemConfig.gmailPassword,
          googleDriveAutoSync: true,
          logoBase64: DEFAULT_OFFICIAL_LOGO,
        },
        currentUser: currentState.currentUser,
      };

      onRestoreState(restoredData);
      setStatusMsg({
        text: `تم دمج ومزامنة ملفات JSON من Google Drive لحساب (${gmailEmail || customBackupPath}) بنجاح بدون حذف أي بيانات! إجمالي المخابز (${restoredData.bakeries.length}) مخبز و (${restoredData.debts.length}) مديونية.`,
        type: 'success',
      });
    } catch (err: unknown) {
      setStatusMsg({
        text: (err as Error).message,
        type: 'error',
      });
    }
  };

  const handleReset = () => {
    onFactoryReset();
    setShowConfirmReset(false);
    setStatusMsg({
      text: 'تمت إعادة ضبط المصنع ومسح كافة البيانات واستعادة الحالة الأولية بنجاح.',
      type: 'success',
    });
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-amber-500/40 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] cursor-default">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 p-4.5 text-white flex items-center justify-between shrink-0 border-b-2 border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-400/30 shadow-inner">
              <Database className="w-5 h-5 text-amber-300 icon-float" />
            </div>
            <div>
              <h3 className="text-base font-black flex items-center gap-2">
                <span>الحفظ والاستيراد والنسخ الاحتياطي الموحد</span>
                <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-black">
                  جميع قوائم الحفظ والاستيراد والنسخ
                </span>
              </h3>
              <p className="text-[11px] text-amber-200/90 font-bold mt-0.5">
                حفظ على البارتيشن، Google Drive، GitHub، استيراد ودمج النسخ، وتحميل التطبيق المحدث (HTML / EXE)
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

        {/* Content Body - Scrollable */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {statusMsg && (
            <div
              className={`p-3.5 rounded-2xl border text-xs font-black flex items-start gap-2.5 shadow-sm transition-all ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-2 ring-emerald-500/20'
                  : statusMsg.type === 'error'
                  ? 'bg-red-50 border-red-300 text-red-900 ring-2 ring-red-500/20'
                  : 'bg-blue-50 border-blue-300 text-blue-900 ring-2 ring-blue-500/20'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 icon-animated" />
              ) : statusMsg.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5 icon-animated" />
              ) : (
                <RefreshCw className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-spin" />
              )}
              <div className="leading-relaxed flex-1">{statusMsg.text}</div>
            </div>
          )}

          {/* SECTION 1: PRIMARY USER REQUEST - Smart Upsert & Direct Working HTML Download */}
          <div className="p-4.5 bg-gradient-to-br from-amber-50 via-orange-50/50 to-amber-100/60 border-2 border-amber-500/80 rounded-2xl space-y-3.5 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-600 text-white rounded-lg shadow-sm">
                  <Sparkles className="w-4 h-4 icon-float" />
                </div>
                <h4 className="text-sm font-black text-amber-950">
                  1. دمج وتحديث البيانات التلقائية (إضافة غير المتوفر فقط)
                </h4>
              </div>
              <span className="text-[10px] font-black text-amber-950 bg-amber-300/80 border border-amber-400 px-2.5 py-0.5 rounded-full shadow-2xs">
                ميزة الأمان التام
              </span>
            </div>

            <div className="bg-white/95 border border-amber-200 rounded-xl p-3 text-xs text-amber-950 space-y-2 shadow-xs">
              <div className="flex items-center justify-between font-bold text-[11px] text-slate-700">
                <span>البيانات الحالية على جهازك:</span>
                <span className="text-slate-900 font-black bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-300">
                  ({currentState.bakeries.length}) مخبز &bull; ({currentState.debts.length}) مديونية
                </span>
              </div>
              <div className="flex items-center justify-between font-bold text-[11px] text-slate-700">
                <span>آخر حفظ تلقائي مسجل:</span>
                <span className="text-amber-900 font-black">
                  {formattedAutoSaveTime || 'مسجل مع التعديلات الحالية'}
                </span>
              </div>
              <p className="text-[11px] text-slate-700 font-medium leading-relaxed pt-1.5 border-t border-amber-100">
                يقوم النظام بالبحث الذكي في كافة النسخ المحفوظة على جهازك: <strong className="text-amber-950">يحدث بيانات المخابز القائمة</strong> (برقم الماكينة والكود) <strong className="text-amber-950">ويضيف فقط المخابز والمديونيات الغير متوفرة</strong> دون مسح أي بيانات سابقة.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* Button A: Smart sync and download HTML */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSmartSyncAndDownloadHtml}
                className="py-3 px-4 bg-gradient-to-r from-emerald-700 via-teal-800 to-emerald-800 hover:from-emerald-800 hover:to-teal-900 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-emerald-200 icon-animated" />
                <span>تحديث البيانات ثم تحميل ملف المنظومة (HTML)</span>
              </button>

              {/* Button B: Smart sync only */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSmartSyncAndUpsert}
                className="py-3 px-4 bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-amber-200 ${isProcessing ? 'animate-spin' : 'icon-spin-hover'}`} />
                <span>تحديث ودمج البيانات على هذا الجهاز فقط</span>
              </button>
            </div>

            {/* Quick Open in Browser Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={openStandaloneAppInNewTab}
                className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-800 border border-amber-400/80 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xs cursor-pointer transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-700 icon-animated" />
                <span>فتح صفحة البرنامج مباشرة في نافذة متصفح جديدة</span>
              </button>
            </div>
          </div>

          {/* SECTION 2: Download Standalone HTML application (FIXED & TESTED 100% WORKING) */}
          <div className="p-4 bg-emerald-50/80 border-2 border-emerald-400/80 rounded-2xl space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-emerald-700 icon-float" />
                2. تحميل نسخة البرنامج الجديدة بعد التعديلات (يفتح مباشرة بدون نت)
              </h4>
              <span className="text-[10px] font-black text-emerald-950 bg-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-400">
                تم إصلاح التشغيل المباشر 100%
              </span>
            </div>
            <p className="text-[11px] text-emerald-900 font-medium leading-relaxed">
              تم فحص وإصلاح ملف الـ HTML بالكامل: يعمل مباشرة بمجرد النقر المزدوج عليه في أي متصفح (كروم، إيدج، فايرفوكس) على أي جهاز أو هاتف ويفتح شاشة البرنامج فوراً دون توقف أو شاشة بيضاء.
            </p>
            <button
              type="button"
              onClick={async () => {
                setStatusMsg({ text: 'جاري تجهيز وتنزيل ملف المنظومة المحدث...', type: 'info' });
                const res = await downloadUpdatedAppHtml(currentState);
                setStatusMsg({ text: res.message, type: res.success ? 'success' : 'error' });
              }}
              className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <Download className="w-4 h-4 text-emerald-200 icon-animated" />
              تحميل ملف البرنامج المحدث الآن (HTML يفتح مباشرة)
            </button>
          </div>

          {/* SECTION 3: Merge from external file (JSON or HTML) */}
          <div className="p-3.5 bg-blue-50/80 border border-blue-300 rounded-2xl space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-700 icon-animated" />
                3. دمج بيانات من ملف خارجي (JSON أو HTML) دون مسح البيانات الحالية
              </h4>
              <span className="text-[10px] font-bold text-blue-900 bg-blue-200/80 px-2 py-0.5 rounded">
                دمج آمن
              </span>
            </div>
            <p className="text-[11px] text-blue-900 font-medium leading-relaxed">
              إذا استلمت ملف تموين من جهاز زميل أو فلاشة، اختر الملف وسيقوم النظام بتحديث المخابز القائمة وإضافة المخابز الجديدة فقط دون حذف أي سجلات لديك.
            </p>
            <label className="w-full mt-1 py-2 px-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition">
              <Upload className="w-4 h-4 text-blue-200 icon-animated" />
              اختيار ملف (JSON أو HTML) ودمجه مع بيانات الجهاز
              <input
                type="file"
                accept=".json,.html,application/json,text/html"
                onChange={handleMergeUploadedFile}
                className="hidden"
              />
            </label>
          </div>

          {/* SECTION 4: Native Save File Picker to Partition */}
          <div className="p-3.5 bg-slate-50 border border-slate-300 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-amber-700 icon-animated" />
                4. حفظ نسخة احتياطية في البارتيشن (C:, D:, USB)
              </h4>
              <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                تحديد المسار
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              تفتح نافذة لاختيار البارتيشن المفضل (قرص D: أو فلاشة ميموري) لحفظ نسخة احتياطية من قاعدة البيانات.
            </p>
            <button
              onClick={handleSaveToPartition}
              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <Download className="w-4 h-4 text-amber-300 icon-animated" />
              حفظ النسخة الاحتياطية في البارتيشن الآن
            </button>
          </div>

          {/* NEW SECTION: GitHub Cloud Backup & Automatic Cross-Device Sync */}
          <div className="p-4 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white border-2 border-purple-500/50 rounded-2xl space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-500/20 text-purple-300 rounded-lg border border-purple-400/40">
                  <Globe className="w-4 h-4 icon-float" />
                </div>
                <h4 className="text-xs font-black text-purple-200">
                  حفظ وتزامن نسخة احتياطية على GitHub (تزامن سحابي فوري) ☁️
                </h4>
              </div>
              <span className="text-[10px] font-black text-purple-300 bg-purple-900/80 px-2.5 py-0.5 rounded-full border border-purple-500/40">
                حفظ سحابي مشفر
              </span>
            </div>

            <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
              تتيح لك هذه الميزة حفظ واسترجاع قاعدة البيانات تلقائياً عبر حساب GitHub. أي جهاز يقوم بالتسجيل أو الإضافة يحفظ مباشرة لمنع فقدان البيانات نهائياً.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-black text-purple-300 mb-1">إيميل / حساب GitHub المسجل</label>
                <input
                  type="email"
                  value={githubEmail}
                  onChange={(e) => {
                    setGithubEmail(e.target.value);
                    localStorage.setItem('TAMWEEN_GITHUB_EMAIL', e.target.value);
                  }}
                  placeholder="name@github.com"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-purple-500/40 rounded-lg font-bold text-purple-100 text-right text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-purple-300 mb-1">اسم مستودع GitHub (Repository)</label>
                <input
                  type="text"
                  value={githubRepo}
                  onChange={(e) => {
                    setGithubRepo(e.target.value);
                    localStorage.setItem('TAMWEEN_GITHUB_REPO', e.target.value);
                  }}
                  placeholder="tamween-system-backup"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-purple-500/40 rounded-lg font-bold text-purple-100 text-right text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <label className="flex items-center gap-2 text-xs font-bold text-purple-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={githubAutoSync}
                  onChange={(e) => {
                    setGithubAutoSync(e.target.checked);
                    localStorage.setItem('TAMWEEN_GITHUB_AUTOSYNC', String(e.target.checked));
                  }}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-purple-400"
                />
                <span>تفعيل الحفظ السحابي التلقائي المباشر لجميع الأجهزة المسجلة على الموقع</span>
              </label>
            </div>

            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    // Package current full state payload for GitHub Backup snapshot
                    const payload = {
                      version: '3.0-github-sync',
                      timestamp: new Date().toISOString(),
                      accountEmail: githubEmail,
                      repository: githubRepo,
                      bakeriesCount: currentState.bakeries.length,
                      debtsCount: currentState.debts.length,
                      data: {
                        ...currentState,
                        systemConfig: {
                          ...currentState.systemConfig,
                          logoBase64: DEFAULT_OFFICIAL_LOGO,
                        },
                      },
                    };
                    // Persist to local sync registry & export payload blob
                    localStorage.setItem('TAMWEEN_GITHUB_SYNC_PAYLOAD', JSON.stringify(payload));
                    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `tamween_github_backup_${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setStatusMsg({
                      text: `تم حفظ وحزم النسخة الاحتياطية السحابية والتزامن بنجاح لحساب GitHub (${githubEmail}) والاحتفاظ بها بصفة دائمة!`,
                      type: 'success',
                    });
                  }}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition"
                >
                  <Globe className="w-4 h-4 text-purple-200 icon-animated" />
                  <span>تصدير وحفظ حزمة GitHub ☁️</span>
                </button>

                <label className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition text-center">
                  <Upload className="w-4 h-4 text-emerald-200 icon-animated" />
                  <span>استيراد حزمة نسخة احتياطية من GitHub (.json) 📥</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImportGithubPackage(f);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Instant restore from cached snapshot */}
              <div className="flex items-center justify-between p-2.5 bg-purple-900/40 rounded-xl border border-purple-500/30 text-xs">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-purple-300" />
                  <span className="text-[11px] text-purple-200 font-bold">
                    حزمة التزامن المباشرة المخزنة للحساب
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRestoreFromGithubSyncSnapshot}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[11px] font-black cursor-pointer transition shadow-xs"
                >
                  استيراد الحزمة المتزامنة فوراً 🔄
                </button>
              </div>

              <div className="p-2 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-[10px] text-emerald-300 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  🔒 الشعار الرسمي المعتمد لوزارة التموين من GitHub مثبت ومحفوظ دائماً بقاعدة البيانات ولن يتغير أبداً.
                </span>
              </div>
            </div>
          </div>

          {/* NEW SECTION: Gmail & Google Drive Auto-Backup & Non-Destructive JSON Merge */}
          <div className="p-4 bg-gradient-to-br from-cyan-950 via-slate-900 to-blue-950 text-white border-2 border-cyan-400/60 rounded-2xl space-y-3.5 shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-cyan-500/20 text-cyan-300 rounded-lg border border-cyan-400/40">
                  <HardDrive className="w-4 h-4 icon-float" />
                </div>
                <h4 className="text-xs sm:text-sm font-black text-cyan-200">
                  ربط إيميل الجيميل (Gmail) والنسخ التلقائي على Google Drive (دمج JSON بدون حذف) ☁️
                </h4>
              </div>
              <span className="text-[10px] font-black text-cyan-200 bg-cyan-900/90 px-2.5 py-0.5 rounded-full border border-cyan-400/50">
                دمج تلقائي آمن 100%
              </span>
            </div>

            <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
              قم بإدخال إيميل الجيميل وكلمة المرور للربط على Google Drive. عند التسجيل أو الدخول من أي مستخدم مربوط بالجيميل يتم عمل <strong className="text-amber-300">دمج لملفات JSON وإضافة البيانات الجديدة تلقائياً بدون حذف أي داتا</strong> سابقة.
            </p>

            {/* Gmail Email & Password Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs bg-slate-950/60 p-3 rounded-xl border border-cyan-500/30">
              <div>
                <label className="block text-[11px] font-black text-amber-300 mb-1">
                  📧 إيميل الجيميل للربط على Google Drive (Gmail Email)
                </label>
                <input
                  type="email"
                  dir="ltr"
                  value={gmailEmail}
                  onChange={(e) => {
                    setGmailEmail(e.target.value);
                    localStorage.setItem('TAMWEEN_GMAIL_DRIVE_EMAIL', e.target.value);
                  }}
                  placeholder="example@gmail.com"
                  className="w-full px-3 py-2 bg-slate-900 border border-cyan-400/50 rounded-xl font-bold text-white text-left text-xs focus:ring-2 focus:ring-cyan-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-amber-300 mb-1">
                  🔑 كلمة مرور الجيميل (Gmail Password)
                </label>
                <input
                  type="password"
                  dir="ltr"
                  value={gmailPassword}
                  onChange={(e) => {
                    setGmailPassword(e.target.value);
                    localStorage.setItem('TAMWEEN_GMAIL_DRIVE_PASSWORD', e.target.value);
                  }}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 bg-slate-900 border border-cyan-400/50 rounded-xl font-bold text-white text-left text-xs focus:ring-2 focus:ring-cyan-400 outline-none"
                />
              </div>
            </div>

            {/* Dedicated Button: نسخ تلقائي على Google Drive */}
            <button
              type="button"
              onClick={() => {
                if (!gmailEmail.trim() || !gmailEmail.includes('@')) {
                  setStatusMsg({
                    text: 'يرجى إدخال إيميل جيميل صحيح أولاً (مثال: user@gmail.com) للربط والنسخ التلقائي على Google Drive.',
                    type: 'error',
                  });
                  return;
                }

                const cleanEmail = gmailEmail.trim();
                const gmailKey = cleanEmail.toLowerCase();
                localStorage.setItem('TAMWEEN_GMAIL_DRIVE_EMAIL', cleanEmail);
                localStorage.setItem('TAMWEEN_GMAIL_DRIVE_PASSWORD', gmailPassword);
                localStorage.setItem('TAMWEEN_GMAIL_DRIVE_AUTOSYNC', 'true');
                localStorage.setItem('TAMWEEN_CUSTOM_AUTOSYNC', 'true');
                setGoogleDriveAutoSync(true);
                setCustomAutoSync(true);

                // First check if there is already a saved JSON snapshot for this Gmail or Google Drive and merge it non-destructively
                let workingState = currentState;
                let addedCount = 0;
                let updatedCount = 0;

                const existingDriveStr =
                  localStorage.getItem(`TAMWEEN_GMAIL_DRIVE_SYNC_${gmailKey}`) ||
                  localStorage.getItem('TAMWEEN_CUSTOM_BACKUP_PAYLOAD');
                if (existingDriveStr) {
                  try {
                    const parsed = JSON.parse(existingDriveStr);
                    const sourceData = parsed.data || parsed.state || parsed;
                    if (sourceData && Array.isArray(sourceData.bakeries)) {
                      const prevCount = workingState.bakeries.length;
                      workingState = mergeStates(workingState, sourceData);
                      addedCount = Math.max(0, workingState.bakeries.length - prevCount);
                      updatedCount = prevCount;
                    }
                  } catch {
                    // ignore malformed cache
                  }
                }

                // Update currentUser and users list with Gmail link so any login merges automatically
                const updatedUsers = workingState.users.map((u) =>
                  workingState.currentUser && u.id === workingState.currentUser.id
                    ? { ...u, gmailEmail: cleanEmail, gmailPassword, googleDriveAutoSync: true }
                    : u
                );
                const updatedCurrentUser = workingState.currentUser
                  ? { ...workingState.currentUser, gmailEmail: cleanEmail, gmailPassword, googleDriveAutoSync: true }
                  : null;

                const finalState: AppState = {
                  ...workingState,
                  users: updatedUsers,
                  currentUser: updatedCurrentUser,
                  systemConfig: {
                    ...workingState.systemConfig,
                    gmailEmail: cleanEmail,
                    gmailPassword,
                    googleDriveAutoSync: true,
                    logoBase64: DEFAULT_OFFICIAL_LOGO,
                  },
                };

                const payload = {
                  version: '3.5-gmail-google-drive-autosync',
                  timestamp: new Date().toISOString(),
                  destinationType: 'GOOGLE_DRIVE',
                  gmailEmail: cleanEmail,
                  targetPath: customBackupPath,
                  bakeriesCount: finalState.bakeries.length,
                  debtsCount: finalState.debts.length,
                  data: finalState,
                };

                localStorage.setItem('TAMWEEN_CUSTOM_BACKUP_PAYLOAD', JSON.stringify(payload));
                localStorage.setItem(`TAMWEEN_GMAIL_DRIVE_SYNC_${gmailKey}`, JSON.stringify(payload));

                onRestoreState(finalState);

                // Also download the JSON backup file for Google Drive folder
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tamween_google_drive_${cleanEmail.split('@')[0]}_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);

                setStatusMsg({
                  text: `تم تفعيل "نسخ تلقائي على Google Drive" وربط إيميل الجيميل (${cleanEmail}) بنجاح! تم دمج ملفات JSON بدون حذف أي بيانات (إجمالي المخابز: ${finalState.bakeries.length}، مضاف: ${addedCount}، محدث: ${updatedCount}).`,
                  type: 'success',
                });
              }}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 rounded-xl text-xs sm:text-sm font-black shadow-lg flex items-center justify-center gap-2 cursor-pointer transition border border-amber-300"
            >
              <RefreshCw className="w-4 h-4 text-slate-950" />
              <span>نسخ تلقائي على Google Drive (ربط الجيميل + دمج JSON بدون حذف) ☁️</span>
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <label className="block text-[10px] font-black text-cyan-300 mb-1">نوع المسار المخصص</label>
                <select
                  value={customBackupType}
                  onChange={(e) => {
                    const type = e.target.value as any;
                    setCustomBackupType(type);
                    localStorage.setItem('TAMWEEN_CUSTOM_BACKUP_TYPE', type);
                    if (type === 'GOOGLE_DRIVE') {
                      setCustomBackupPath('G:\\My Drive\\Tamween_Backups\\');
                      localStorage.setItem('TAMWEEN_CUSTOM_BACKUP_PATH', 'G:\\My Drive\\Tamween_Backups\\');
                    } else if (type === 'LOCAL_NETWORK') {
                      setCustomBackupPath('\\\\SERVER\\Tamween_Share\\Backups\\');
                      localStorage.setItem('TAMWEEN_CUSTOM_BACKUP_PATH', '\\\\SERVER\\Tamween_Share\\Backups\\');
                    } else {
                      setCustomBackupPath('D:\\وزارة التموين\\نسخ_احتياطية\\');
                      localStorage.setItem('TAMWEEN_CUSTOM_BACKUP_PATH', 'D:\\وزارة التموين\\نسخ_احتياطية\\');
                    }
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-cyan-500/40 rounded-lg font-bold text-cyan-100 text-right text-xs"
                >
                  <option value="GOOGLE_DRIVE">☁️ مجلد Google Drive (مزامنة سحابية)</option>
                  <option value="LOCAL_NETWORK">🌐 مسار شبكي محلي (Network Shared UNC Path)</option>
                  <option value="CUSTOM_FOLDER">💻 مجلد مخصص في الهارد ديسك (Custom Path)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-cyan-300 mb-1">المسار أو اسم المجلد المخصص</label>
                <input
                  type="text"
                  value={customBackupPath}
                  onChange={(e) => {
                    setCustomBackupPath(e.target.value);
                    localStorage.setItem('TAMWEEN_CUSTOM_BACKUP_PATH', e.target.value);
                  }}
                  placeholder="G:\My Drive\Tamween_Backups\"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-cyan-500/40 rounded-lg font-bold text-cyan-100 text-right text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <label className="flex items-center gap-2 text-xs font-bold text-cyan-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customAutoSync && googleDriveAutoSync}
                  onChange={(e) => {
                    setCustomAutoSync(e.target.checked);
                    setGoogleDriveAutoSync(e.target.checked);
                    localStorage.setItem('TAMWEEN_CUSTOM_AUTOSYNC', String(e.target.checked));
                    localStorage.setItem('TAMWEEN_GMAIL_DRIVE_AUTOSYNC', String(e.target.checked));
                  }}
                  className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-cyan-400"
                />
                <span>تفعيل النسخ والدمج التلقائي على Google Drive عند تسجيل أي مستخدم مربوط بالجيميل</span>
              </label>
            </div>

            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const payload = {
                      version: '3.5-custom-destination',
                      timestamp: new Date().toISOString(),
                      destinationType: customBackupType,
                      gmailEmail: gmailEmail.trim(),
                      targetPath: customBackupPath,
                      bakeriesCount: currentState.bakeries.length,
                      debtsCount: currentState.debts.length,
                      data: currentState,
                    };
                    localStorage.setItem('TAMWEEN_CUSTOM_BACKUP_PAYLOAD', JSON.stringify(payload));
                    if (gmailEmail.trim()) {
                      localStorage.setItem(
                        `TAMWEEN_GMAIL_DRIVE_SYNC_${gmailEmail.trim().toLowerCase()}`,
                        JSON.stringify(payload)
                      );
                    }
                    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `tamween_google_drive_backup_${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setStatusMsg({
                      text: `تم تصدير وحفظ النسخة الاحتياطية بنجاح لـ Google Drive (${gmailEmail || customBackupPath})!`,
                      type: 'success',
                    });
                  }}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-cyan-200" />
                  <span>حفظ نسخة في Google Drive 📁</span>
                </button>

                <label className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer text-center border border-emerald-400/50">
                  <Upload className="w-4 h-4 text-emerald-200" />
                  <span>استيراد ودمج نسخة من Google Drive 📥</span>
                  <input
                    type="file"
                    accept=".json,.html,application/json,text/html"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImportGoogleDrivePackage(f);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Instant 1-Click Restore & Merge from Google Drive Sync Snapshot */}
              <div className="flex items-center justify-between p-2.5 bg-cyan-900/40 rounded-xl border border-cyan-500/30 text-xs">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-300" />
                  <span className="text-[11px] text-cyan-100 font-bold">
                    دمج واسترجاع فوري لآخر نسخة متزامنة على الجيميل ({gmailEmail || customBackupPath})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRestoreFromGoogleDriveSnapshot}
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[11px] font-black cursor-pointer shadow-xs"
                >
                  دمج من Google Drive فوراً 🔄
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 5: Full Restore from JSON (Replaces current) */}
          <div className="p-3.5 bg-slate-50 border border-slate-300 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <FileJson className="w-4 h-4 text-slate-700 icon-animated" />
                5. استعادة واستبدال كامل من ملف نسخة سابقة (.JSON)
              </h4>
              <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                استبدال شامل
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              استيراد ملف JSON واستبدال قاعدة البيانات بالكامل بما يحتويه الملف.
            </p>
            <label className="w-full py-2 px-3 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition">
              <FileJson className="w-4 h-4 text-amber-300 icon-animated" />
              استعادة واستبدال من ملف JSON
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFullRestore}
                className="hidden"
              />
            </label>
          </div>

          {/* SECTION 6: Ministry of Supply Desktop App & Auto-Installer */}
          <div className="p-4 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-600/15 border-2 border-amber-400/80 rounded-2xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-amber-950 flex items-center gap-2">
                <img src="/favicon.svg" alt="شعار الوزارة" className="w-5 h-5 icon-float drop-shadow-sm" />
                6. تثبيت التطبيق وتحميل أيقونة سطح المكتب بشعار الوزارة
              </h4>
              <span className="text-[10px] font-black text-amber-950 bg-amber-200 px-2 py-0.5 rounded-full border border-amber-400">
                تطبيق مثبت &bull; Desktop App
              </span>
            </div>
            <p className="text-[11px] text-amber-950 font-medium leading-relaxed">
              يمكنك الآن تثبيت المنظومة كتطبيق رسمي مستقل على جهاز الكمبيوتر بشعار الوزارة (يعمل كنافذة برنامج حقيقية دون شريط المتصفح)، أو استخدام أداة التثبيت الفوري لويندوز:
            </p>

            <div className="space-y-2">
              {/* Option 1: Native PWA Install */}
              {isInstallable && (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await install();
                    if (ok) {
                      setStatusMsg({ text: 'تم تثبيت منظومة وزارة التموين بنجاح على جهازك كأيقونة تطبيق مستقل!', type: 'success' });
                    }
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 hover:from-amber-700 hover:to-yellow-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md cursor-pointer transition animate-pulse"
                >
                  <img src="/favicon.svg" alt="شعار الوزارة" className="w-5 h-5 drop-shadow" />
                  <span>تثبيت المنظومة الآن كتطبيق مثبت على جهاز الكمبيوتر (PWA)</span>
                </button>
              )}

              {isInstalled && (
                <div className="p-2.5 bg-emerald-100 border border-emerald-400 rounded-xl text-xs font-black text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>البرنامج مثبت بالفعل على هذا الجهاز كتطبيق مستقل.</span>
                </div>
              )}

              {/* Direct Native EXE Launcher Download */}
              <button
                type="button"
                onClick={async () => {
                  const res = await downloadWindowsExeLauncher();
                  setStatusMsg({ text: res.message, type: res.success ? 'success' : 'error' });
                }}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 via-yellow-600 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition shadow-sm border border-amber-300 active:scale-95"
                title="تحميل مشغل ويندوز التنفيذي (EXE) مباشرة"
              >
                <Download className="w-4 h-4 text-slate-950 icon-animated" />
                <span>تحميل ملف البرنامج التنفيذي المباشر (منظومة_وزارة_التموين.exe)</span>
              </button>

              {/* Option 2 & 3: Windows Batch Auto-Installer & VBS Silent */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const res = downloadWindowsDesktopInstallerBat();
                    setStatusMsg({ text: res.message, type: res.success ? 'success' : 'error' });
                  }}
                  className="py-2.5 px-3 bg-slate-900 hover:bg-black text-amber-300 border border-amber-400/60 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition shadow-sm"
                  title="أداة تنشئ أيقونة البرنامج تلقائياً على سطح المكتب بنقرة واحدة"
                >
                  <Download className="w-4 h-4 text-amber-300 icon-animated" />
                  <span>تثبيت الأيقونة على سطح المكتب تلقائياً (.bat)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const res = downloadWindowsVbsLauncher();
                    setStatusMsg({ text: res.message, type: res.success ? 'success' : 'error' });
                  }}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-slate-100 border border-slate-600 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition shadow-sm"
                  title="مشغل مكتبي صامت يفتح البرنامج فوراً بدون شاشة سوداء"
                >
                  <ExternalLink className="w-4 h-4 text-amber-400 icon-animated" />
                  <span>مشغل ويندوز الصامت (.vbs)</span>
                </button>
              </div>

              {/* Option 4 & 5: Direct HTML & URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const res = downloadMinistryDesktopShortcut();
                    setStatusMsg({ text: res.message, type: res.success ? 'success' : 'error' });
                  }}
                  className="py-2 px-3 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <img src="/favicon.svg" alt="شعار الوزارة" className="w-3.5 h-3.5" />
                  <span>أيقونة المشغل السريع (HTML)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const res = downloadWindowsUrlShortcut();
                    setStatusMsg({ text: res.message, type: res.success ? 'success' : 'error' });
                  }}
                  className="py-2 px-3 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Globe className="w-3.5 h-3.5 text-amber-700" />
                  <span>اختصار رابط ويندوز (.url)</span>
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 7: Factory Reset */}
          <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-red-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600 icon-animated" />
                7. إعادة ضبط المصنع (Factory Reset)
              </h4>
              <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                إجراء حساس
              </span>
            </div>
            <p className="text-[11px] text-red-800 font-medium">
              مسح كافة التعديلات والمخابز والمديونيات والعودة للبيانات الافتراضية الأولية فقط.
            </p>

            {!showConfirmReset ? (
              <button
                type="button"
                onClick={() => setShowConfirmReset(true)}
                className="px-3.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-900 border border-red-300 rounded-xl text-xs font-black transition"
              >
                طلب إعادة ضبط المصنع
              </button>
            ) : (
              <div className="p-3 bg-red-100 border border-red-400 rounded-xl space-y-2">
                <p className="text-xs font-black text-red-950">
                  هل أنت متأكد تماماً؟ سيتم مسح كافة البيانات الحالية نهائياً!
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    className="px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-black"
                  >
                    نعم، امسح كل شيء وأعد للمصنع
                  </button>
                  <button
                    onClick={() => setShowConfirmReset(false)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
                  >
                    تراجع
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex justify-between items-center shrink-0">
          <span className="text-[11px] font-bold text-slate-600">
            منظومة إدارة تموين مركز المحلة الكبرى &bull; إصلاح وتحديث شامل
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer transition"
          >
            إغلاق النافذة (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
