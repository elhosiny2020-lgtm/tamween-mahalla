import React, { useState, useMemo, useEffect } from 'react';
import { Bakery, DailyAlertConfig, SystemConfig, AppUser } from '../types';
import {
  Bell,
  Clock,
  Check,
  X,
  Volume2,
  VolumeX,
  Globe,
  ShieldAlert,
  FileCheck,
  AlertTriangle,
  Play,
  Save,
  Calendar,
  Lock,
  Sparkles
} from 'lucide-react';

interface DailyAlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DailyAlertConfig;
  bakeries: Bakery[];
  currentUser: AppUser | null;
  onSaveConfig: (updatedConfig: DailyAlertConfig) => void;
  onTriggerTestAlert: (matchingBakeries: { bakery: Bakery; docName: string; expiryDate: string; daysDiff: number }[]) => void;
}

const DOCUMENT_OPTIONS = [
  { id: 'bakeryLicenseDate', label: 'رخصة تشغيل المخبز التمويني', default: true },
  { id: 'commercialRegDate', label: 'السجل التجاري', default: true },
  { id: 'leaseAgreementDate', label: 'عقد الإيجار / سند الحيازة', default: true },
  { id: 'taxCardDate', label: 'البطاقة الضريبية', default: true },
];

const PRESET_TIMES = [
  { time: '08:00', label: '08:00 ص (بداية العمل)' },
  { time: '09:00', label: '09:00 ص (الموصى به)' },
  { time: '10:00', label: '10:00 ص' },
  { time: '12:00', label: '12:00 م (منتصف النهار)' },
  { time: '14:00', label: '02:00 م (قبل نهاية الدوام)' },
];

export const DailyAlertSettingsModal: React.FC<DailyAlertSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  bakeries,
  currentUser,
  onSaveConfig,
  onTriggerTestAlert,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  const [enabled, setEnabled] = useState(config?.enabled ?? true);
  const [alertTime, setAlertTime] = useState(config?.alertTime || '09:00');
  const [notifyBrowser, setNotifyBrowser] = useState(config?.notifyBrowser ?? true);
  const [notifySound, setNotifySound] = useState(config?.notifySound ?? true);
  const [targetDocs, setTargetDocs] = useState<string[]>(
    config?.targetDocs && config.targetDocs.length > 0
      ? config.targetDocs
      : ['bakeryLicenseDate', 'commercialRegDate', 'leaseAgreementDate', 'taxCardDate']
  );
  const [daysThreshold, setDaysThreshold] = useState<number>(config?.daysThreshold ?? 0);
  const [browserPermission, setBrowserPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [toastMsg, setToastMsg] = useState('');

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

  // Check browser notification permission
  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setBrowserPermission(perm);
        if (perm === 'granted') {
          setToastMsg('تم تفعيل إشعارات المتصفح بنجاح! ستظهر لك الإخطارات في الوقت المحدد');
          setTimeout(() => setToastMsg(''), 3000);
        } else {
          setToastMsg('تم رفض إذن الإشعارات من إعدادات المتصفح');
          setTimeout(() => setToastMsg(''), 3000);
        }
      } catch {
        // ignore
      }
    }
  };

  // Find currently matching bakeries that would trigger this alert
  const matchingExpiredBakeries = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const matches: { bakery: Bakery; docName: string; expiryDate: string; daysDiff: number }[] = [];

    bakeries.forEach((b) => {
      DOCUMENT_OPTIONS.forEach((doc) => {
        if (!targetDocs.includes(doc.id)) return;
        const dateStr = (b as any)[doc.id];
        if (!dateStr || !String(dateStr).trim()) return;

        const d = new Date(String(dateStr).trim());
        if (isNaN(d.getTime())) return;
        d.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Matching condition based on threshold
        // threshold 0 = diffDays <= 0 (expired already)
        // threshold 15 = diffDays <= 15
        // threshold 30 = diffDays <= 30
        if (diffDays <= daysThreshold) {
          matches.push({
            bakery: b,
            docName: doc.label,
            expiryDate: dateStr,
            daysDiff: diffDays,
          });
        }
      });
    });

    return matches;
  }, [bakeries, targetDocs, daysThreshold]);

  const toggleDoc = (docId: string) => {
    if (!isAdmin) return;
    setTargetDocs((prev) => {
      if (prev.includes(docId)) {
        if (prev.length === 1) return prev; // keep at least one
        return prev.filter((d) => d !== docId);
      } else {
        return [...prev, docId];
      }
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('تعديل وقت التنبيه اليومي وإعداداته مخصص لمديري النظام فقط');
      return;
    }

    const updated: DailyAlertConfig = {
      enabled,
      alertTime,
      notifyBrowser,
      notifySound,
      targetDocs,
      daysThreshold,
      lastAlertDate: config?.lastAlertDate || '',
    };

    onSaveConfig(updated);
    onClose();
  };

  const handleTestAlert = () => {
    onTriggerTestAlert(matchingExpiredBakeries);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 overflow-y-auto cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-slate-950 text-white rounded-2xl shadow-2xl border-2 border-amber-500/50 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden cursor-default">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 p-4 border-b border-amber-500/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 border border-amber-400/40 rounded-xl shadow-md text-amber-300">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>إعدادات التذكير والتنبيه اليومي لتراخيص المخابز</span>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full font-mono">
                  صلاحية الإدارة 👑
                </span>
              </h3>
              <p className="text-xs text-amber-200/90 mt-0.5 font-medium">
                تحديد عدد الأيام قبل انتهاء أي ترخيص (السجل التجاري، البطاقة الضريبية، رخصة المخبز، عقد الإيجار) ووقت الإخطار اليومي وإشعارات المتصفح
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-red-950/70 hover:bg-red-700 text-white cursor-pointer border border-red-500/40"
            title="إغلاق النافذة فوراً (Escape)"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Success Toast Bar */}
        {toastMsg && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-black flex items-center gap-2 shrink-0">
            <Check className="w-4 h-4" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Modal Body Form */}
        <form onSubmit={handleSave} className="overflow-y-auto p-5 space-y-5 flex-1 text-right">
          {/* Admin Role Notice if Viewer */}
          {!isAdmin && (
            <div className="bg-amber-950/80 border border-amber-600/60 p-3 rounded-xl flex items-center gap-2 text-amber-200 text-xs font-bold">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                أنت الآن مسجل بحساب للقراءة فقط. يمكنك الاطلاع على إعدادات التنبيه ومواعيده، بينما تعديل الإعدادات مقتصر على مديري النظام.
              </span>
            </div>
          )}

          {/* Section 1: Activation Switch */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3 shadow-md">
            <div>
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>تفعيل نظام التذكير اليومي التلقائي</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                عند التفعيل، ستقوم المنظومة تلقائياً بفحص السجلات وإظهار إشعار تذكيري في الوقت المحدد يومياً
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={enabled}
                disabled={!isAdmin}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-13 h-7 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-amber-500 peer-checked:to-amber-600"></div>
            </label>
          </div>

          {/* Section 2: Daily Scheduled Time */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <label className="text-sm font-black text-amber-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>موعد التنبيه اليومي المحدد (ساعة : دقيقة):</span>
              </label>

              <span className="text-xs font-mono font-black text-amber-400 bg-amber-950/70 border border-amber-600/50 px-2.5 py-1 rounded-lg">
                {alertTime} (بتوقيت القاهرة)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <input
                  type="time"
                  value={alertTime}
                  disabled={!isAdmin || !enabled}
                  onChange={(e) => setAlertTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black border-2 border-amber-500/60 rounded-xl font-mono text-lg font-black text-amber-300 text-center focus:outline-none focus:border-amber-400 cursor-pointer disabled:opacity-50"
                  required
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TIMES.map((p) => (
                  <button
                    key={p.time}
                    type="button"
                    disabled={!isAdmin || !enabled}
                    onClick={() => setAlertTime(p.time)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50 ${
                      alertTime === p.time
                        ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                        : 'bg-black text-slate-300 hover:bg-slate-800 border border-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Criteria & Days Threshold before License Expiry */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>تحديد عدد الأيام قبل انتهاء أي ترخيص (السجل التجاري / البطاقة الضريبية / الرخصة):</span>
              </h4>
              <div className="flex items-center gap-2 bg-black px-3 py-1.5 rounded-xl border border-amber-500/60">
                <span className="text-xs font-black text-amber-300">عدد الأيام قبل الانتهاء:</span>
                <input
                  type="number"
                  min={0}
                  max={365}
                  disabled={!isAdmin || !enabled}
                  value={daysThreshold}
                  onChange={(e) => setDaysThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-16 bg-slate-900 text-amber-300 font-black text-sm text-center rounded-lg border border-amber-400/50 py-0.5 font-mono focus:outline-none focus:border-amber-400"
                />
                <span className="text-xs font-bold text-slate-300">يوماً</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                disabled={!isAdmin || !enabled}
                onClick={() => setDaysThreshold(0)}
                className={`p-3 rounded-xl border text-right transition cursor-pointer disabled:opacity-50 ${
                  daysThreshold === 0
                    ? 'bg-gradient-to-r from-red-950/80 to-slate-900 border-red-500 text-white shadow-md'
                    : 'bg-black/60 border-slate-800 text-slate-300 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black">المنتهية بالفعل (0 يوم)</span>
                  {daysThreshold === 0 && <Check className="w-3.5 h-3.5 text-red-400" />}
                </div>
                <p className="text-[10px] text-slate-400">
                  تنبيه عاجل بالمخابز التي انقضى تاريخ صلاحيتها
                </p>
              </button>

              <button
                type="button"
                disabled={!isAdmin || !enabled}
                onClick={() => setDaysThreshold(7)}
                className={`p-3 rounded-xl border text-right transition cursor-pointer disabled:opacity-50 ${
                  daysThreshold === 7
                    ? 'bg-gradient-to-r from-orange-950/80 to-slate-900 border-orange-500 text-white shadow-md'
                    : 'bg-black/60 border-slate-800 text-slate-300 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black">قبل الانتهاء بـ 7 أيام</span>
                  {daysThreshold === 7 && <Check className="w-3.5 h-3.5 text-orange-400" />}
                </div>
                <p className="text-[10px] text-slate-400">
                  تنبيه قبل أسبوع كامل من انتهاء الترخيص
                </p>
              </button>

              <button
                type="button"
                disabled={!isAdmin || !enabled}
                onClick={() => setDaysThreshold(15)}
                className={`p-3 rounded-xl border text-right transition cursor-pointer disabled:opacity-50 ${
                  daysThreshold === 15
                    ? 'bg-gradient-to-r from-amber-950/80 to-slate-900 border-amber-500 text-white shadow-md'
                    : 'bg-black/60 border-slate-800 text-slate-300 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black">قبل الانتهاء بـ 15 يوماً</span>
                  {daysThreshold === 15 && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <p className="text-[10px] text-slate-400">
                  إنذار مبكر للمخابز التي تنتهي خلال أسبوعين
                </p>
              </button>

              <button
                type="button"
                disabled={!isAdmin || !enabled}
                onClick={() => setDaysThreshold(30)}
                className={`p-3 rounded-xl border text-right transition cursor-pointer disabled:opacity-50 ${
                  daysThreshold === 30
                    ? 'bg-gradient-to-r from-blue-950/80 to-slate-900 border-blue-500 text-white shadow-md'
                    : 'bg-black/60 border-slate-800 text-slate-300 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black">قبل الانتهاء بـ 30 يوماً</span>
                  {daysThreshold === 30 && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </div>
                <p className="text-[10px] text-slate-400">
                  متابعة شاملة للمستندات المطلوب تجديدها خلال شهر
                </p>
              </button>
            </div>
          </div>

          {/* Section 4: Target Document Types */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-amber-400" />
              <span>المستندات والتراخيص المطلوب إدراجها في التنبيه اليومي:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DOCUMENT_OPTIONS.map((doc) => {
                const isChecked = targetDocs.includes(doc.id);
                return (
                  <label
                    key={doc.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition select-none ${
                      isChecked
                        ? 'bg-slate-950 border-amber-500/60 text-amber-200'
                        : 'bg-black/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold">{doc.label}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={!isAdmin || !enabled}
                      onChange={() => toggleDoc(doc.id)}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section 5: Notification Delivery Channels */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>قنوات استلام التنبيه:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Browser Notification */}
              <div className="p-3 bg-black/60 border border-slate-800 rounded-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <span className="text-xs font-black text-white block">إشعارات المتصفح (Web Notification)</span>
                    <span className="text-[10px] text-slate-400">
                      ظهور نافذة إشعار على سطح المكتب حتى لو كانت النافذة مصغرة
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <input
                    type="checkbox"
                    checked={notifyBrowser}
                    disabled={!isAdmin || !enabled}
                    onChange={(e) => setNotifyBrowser(e.target.checked)}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                  {browserPermission !== 'granted' && (
                    <button
                      type="button"
                      onClick={requestNotificationPermission}
                      className="text-[9px] text-cyan-400 hover:underline font-bold"
                    >
                      طلب الإذن
                    </button>
                  )}
                </div>
              </div>

              {/* Sound Alert */}
              <div className="p-3 bg-black/60 border border-slate-800 rounded-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {notifySound ? (
                    <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <div>
                    <span className="text-xs font-black text-white block">نغمة تنبيه صوتية لطيفة</span>
                    <span className="text-[10px] text-slate-400">
                      تشغيل نغمة مسموعة عند حلول موعد التنبيه اليومي
                    </span>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={notifySound}
                  disabled={!isAdmin || !enabled}
                  onChange={(e) => setNotifySound(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer shrink-0"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Live Matching Bakeries Insight & Test Button */}
          <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-black border-2 border-amber-600/50 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black text-white">
                  المخابز المنطبقة عليها شروط التنبيه اليومي حالياً:
                </span>
                <span className="px-2 py-0.5 rounded-full font-mono font-black text-xs bg-amber-400 text-slate-950">
                  {matchingExpiredBakeries.length} حالة
                </span>
              </div>

              {/* Test Alert Button */}
              <button
                type="button"
                onClick={handleTestAlert}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg text-xs font-black shadow-sm transition transform hover:scale-105 active:scale-95 cursor-pointer"
                title="تجربة فحص وإظهار التنبيه اليومي كما يظهر في الموعد المحدد"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950 stroke-none" />
                <span>تجربة إطلاق التنبيه الآن</span>
              </button>
            </div>

            {/* Quick preview list of matching bakeries */}
            {matchingExpiredBakeries.length > 0 ? (
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {matchingExpiredBakeries.slice(0, 5).map((m, idx) => (
                  <div
                    key={`${m.bakery.id}-${m.docName}-${idx}`}
                    className="p-2 bg-slate-950/80 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                      <span className="font-black text-slate-100">{m.bakery.bakeryOwnerName}</span>
                      <span className="text-[10px] text-amber-300 font-mono">({m.bakery.village})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-300">{m.docName}</span>
                      <span className="text-[10px] font-mono text-red-300 bg-red-950 px-1.5 py-0.5 rounded border border-red-800">
                        {m.expiryDate} ({m.daysDiff < 0 ? `منتهية منذ ${Math.abs(m.daysDiff)} يوم` : m.daysDiff === 0 ? 'تنتهي اليوم' : `خلال ${m.daysDiff} يوم`})
                      </span>
                    </div>
                  </div>
                ))}
                {matchingExpiredBakeries.length > 5 && (
                  <p className="text-[10px] text-center text-slate-400 font-bold">
                    وعدد ({matchingExpiredBakeries.length - 5}) مخابز إضافية أخرى...
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-lg text-center text-xs text-emerald-300 font-bold">
                ✨ ممتاز! لا توجد مخابز منتهية التراخيص مطابقة للمعايير الحالية.
              </div>
            )}
          </div>

          {/* Form Actions Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition cursor-pointer"
            >
              إلغاء (ESC)
            </button>

            {isAdmin && (
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-900/30 border border-amber-300 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4 text-slate-950" />
                <span>حفظ إعدادات التنبيه اليومي</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
