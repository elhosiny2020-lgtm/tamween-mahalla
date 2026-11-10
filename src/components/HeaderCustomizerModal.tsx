import React, { useState, useEffect } from 'react';
import { SystemConfig, DailyAlertConfig } from '../types';
import { DEFAULT_SYSTEM_CONFIG, DEFAULT_OFFICIAL_LOGO } from '../defaultData';
import { Settings, RotateCcw, Check, X, Shield, Bell, Clock, Globe } from 'lucide-react';

interface HeaderCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SystemConfig;
  onSaveConfig: (newConfig: SystemConfig) => void;
  onOpenDailyAlertSettings?: () => void;
}

export const HeaderCustomizerModal: React.FC<HeaderCustomizerModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onOpenDailyAlertSettings,
}) => {
  const [governorate, setGovernorate] = useState(config.governorateTitle);
  const [directorate, setDirectorate] = useState(config.directorateTitle);
  const [administration, setAdministration] = useState(config.administrationTitle);
  const [englishSubtitle, setEnglishSubtitle] = useState(config.englishSubtitle);
  const [logoPreview, setLogoPreview] = useState(config.logoBase64);
  const [msg, setMsg] = useState('');

  // Reminder Settings ('إعدادات التذكير') state inside System Settings
  const [showReminderPanel, setShowReminderPanel] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(
    config.dailyAlertConfig?.enabled ?? true
  );
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number>(
    config.dailyAlertConfig?.daysThreshold ?? 15
  );
  const [reminderTime, setReminderTime] = useState<string>(
    config.dailyAlertConfig?.alertTime || '09:00'
  );
  const [notifyBrowser, setNotifyBrowser] = useState<boolean>(
    config.dailyAlertConfig?.notifyBrowser ?? true
  );
  const [notifySound, setNotifySound] = useState<boolean>(
    config.dailyAlertConfig?.notifySound ?? true
  );
  const [targetDocs, setTargetDocs] = useState<string[]>(
    config.dailyAlertConfig?.targetDocs && config.dailyAlertConfig.targetDocs.length > 0
      ? config.dailyAlertConfig.targetDocs
      : ['bakeryLicenseDate', 'commercialRegDate', 'leaseAgreementDate', 'taxCardDate']
  );

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

  const handleToggleBrowserNotification = async (checked: boolean) => {
    setNotifyBrowser(checked);
    if (checked && typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted') {
      try {
        await Notification.requestPermission();
      } catch {
        // ignore
      }
    }
  };

  const handleToggleDoc = (docKey: string) => {
    setTargetDocs((prev) =>
      prev.includes(docKey)
        ? prev.length > 1
          ? prev.filter((k) => k !== docKey)
          : prev
        : [...prev, docKey]
    );
  };

  const handleResetAll = () => {
    setGovernorate(DEFAULT_SYSTEM_CONFIG.governorateTitle);
    setDirectorate(DEFAULT_SYSTEM_CONFIG.directorateTitle);
    setAdministration(DEFAULT_SYSTEM_CONFIG.administrationTitle);
    setEnglishSubtitle(DEFAULT_SYSTEM_CONFIG.englishSubtitle);
    setLogoPreview(DEFAULT_OFFICIAL_LOGO);
    setReminderEnabled(true);
    setReminderDaysBefore(15);
    setReminderTime('09:00');
    setNotifyBrowser(true);
    setMsg('تمت استعادة الإعدادات والشعار الافتراضي بنجاح');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedDailyAlertConfig: DailyAlertConfig = {
      enabled: reminderEnabled,
      alertTime: reminderTime || '09:00',
      notifyBrowser,
      notifySound,
      targetDocs,
      daysThreshold: Math.max(0, Number(reminderDaysBefore) || 0),
      lastAlertDate: config.dailyAlertConfig?.lastAlertDate || '',
    };

    const updated: SystemConfig = {
      governorateTitle: governorate.trim() || DEFAULT_SYSTEM_CONFIG.governorateTitle,
      directorateTitle: directorate.trim() || DEFAULT_SYSTEM_CONFIG.directorateTitle,
      administrationTitle: administration.trim() || DEFAULT_SYSTEM_CONFIG.administrationTitle,
      englishSubtitle: englishSubtitle.trim() || DEFAULT_SYSTEM_CONFIG.englishSubtitle,
      logoBase64: logoPreview || DEFAULT_OFFICIAL_LOGO,
      dailyAlertConfig: updatedDailyAlertConfig,
    };
    onSaveConfig(updated);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 overflow-y-auto cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-amber-600/40 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden cursor-default">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-amber-900 to-slate-900 p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="text-base font-black">إعدادات النظام وتخصيص الهوية وإعدادات التذكير</h3>
              <p className="text-[11px] text-amber-200 font-bold">
                التحكم في بيانات الترويسة الرسمية، الشعار المعتمد، ومفتاح إعدادات التذكير اليومي للتراخيص
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
            className="p-1.5 rounded-xl bg-red-900/60 hover:bg-red-600 text-white cursor-pointer border border-red-500/50 shadow-md"
            title="إغلاق النافذة فوراً (Escape)"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1 text-right">
          {msg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-black flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{msg}</span>
            </div>
          )}

          {/* NEW: 'إعدادات التذكير' Button & Interactive Section inside System Settings */}
          <div className="border-2 border-amber-400 bg-gradient-to-r from-amber-50 via-yellow-50/70 to-amber-50 rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-300 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-xl shadow-xs">
                  <Bell className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <span>مفتاح إعدادات التذكير اليومي للتراخيص</span>
                    <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-black">
                      السجل التجاري / البطاقة الضريبية / الرخصة
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-600 font-bold">
                    تحديد عدد الأيام قبل انتهاء أي ترخيص لإرسال إخطار تذكيري يومي مع تفعيل أو تعطيل إشعارات المتصفح
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowReminderPanel((prev) => !prev)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-xl text-xs font-black border border-amber-500/50 cursor-pointer"
                >
                  {showReminderPanel ? 'إخفاء إعدادات التذكير' : '⚙️ إعدادات التذكير'}
                </button>
                {onOpenDailyAlertSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDailyAlertSettings();
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer"
                    title="فتح نافذة إعدادات التنبيه اليومي المتقدمة ومعاينة المخابز المنتهية"
                  >
                    معاينة وفحص التنبيهات ⏰
                  </button>
                )}
              </div>
            </div>

            {showReminderPanel && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 1. Number of days before expiry */}
                  <div className="bg-white p-3 rounded-xl border border-amber-300 shadow-2xs">
                    <label className="block text-[11px] font-black text-slate-800 mb-1">
                      عدد الأيام قبل انتهاء الترخيص
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={365}
                        value={reminderDaysBefore}
                        onChange={(e) => setReminderDaysBefore(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-amber-400 rounded-lg text-sm font-black text-slate-900 text-center font-mono"
                      />
                      <span className="text-xs font-black text-amber-900 shrink-0">يوماً</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      {[0, 7, 15, 30, 60].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setReminderDaysBefore(d)}
                          className={`flex-1 py-0.5 rounded text-[10px] font-mono font-black border cursor-pointer ${
                            reminderDaysBefore === d
                              ? 'bg-amber-500 text-slate-950 border-amber-600'
                              : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-amber-100'
                          }`}
                        >
                          {d === 0 ? 'منتهي' : `${d}ي`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Daily reminder time */}
                  <div className="bg-white p-3 rounded-xl border border-amber-300 shadow-2xs">
                    <label className="block text-[11px] font-black text-slate-800 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>وقت الإخطار اليومي</span>
                    </label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-amber-400 rounded-lg text-sm font-black text-slate-900 text-center font-mono"
                    />
                    <span className="block text-[10px] text-slate-500 font-bold mt-1 text-center">
                      يرسل إخطاراً يومياً في هذا الموعد
                    </span>
                  </div>

                  {/* 3. Enable/Disable Browser Notifications & Daily Reminder */}
                  <div className="bg-white p-3 rounded-xl border border-amber-300 shadow-2xs flex flex-col justify-between gap-2">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-[11px] font-black text-slate-800">تفعيل التذكير اليومي</span>
                      <input
                        type="checkbox"
                        checked={reminderEnabled}
                        onChange={(e) => setReminderEnabled(e.target.checked)}
                        className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer pt-1.5 border-t border-slate-100">
                      <span className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-blue-600" />
                        <span>إخطارات المتصفح</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={notifyBrowser}
                        onChange={(e) => handleToggleBrowserNotification(e.target.checked)}
                        className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                      />
                    </label>

                    <span className="text-[10px] font-bold text-emerald-700 text-center">
                      {notifyBrowser ? '✓ إخطارات المتصفح مفعلة' : '✕ إخطارات المتصفح معطلة'}
                    </span>
                  </div>
                </div>

                {/* Target License Types Checkboxes */}
                <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-black text-slate-800 text-[11px]">التراخيص المشمولة بالتذكير:</span>
                  <div className="flex flex-wrap items-center gap-3">
                    {[
                      { id: 'commercialRegDate', label: 'السجل التجاري' },
                      { id: 'taxCardDate', label: 'البطاقة الضريبية' },
                      { id: 'bakeryLicenseDate', label: 'رخصة المخبز' },
                      { id: 'leaseAgreementDate', label: 'عقد الإيجار' },
                    ].map((doc) => (
                      <label key={doc.id} className="inline-flex items-center gap-1 cursor-pointer font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={targetDocs.includes(doc.id)}
                          onChange={() => handleToggleDoc(doc.id)}
                          className="accent-amber-600 rounded cursor-pointer"
                        />
                        <span>{doc.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Logo Section */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-white border-2 border-amber-400 p-1 flex items-center justify-center shadow-inner shrink-0">
                <img
                  src={logoPreview}
                  alt="شعار الترويسة"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-black text-slate-900">شعار الجمهورية والوزارة</h4>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    مثبت ومعتمد من GitHub دائماً
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                  الشعار الرسمي المعتمد لوزارة التموين والتجارة الداخلية محفوظ ومثبت دائماً على قاعدة البيانات
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLogoPreview(DEFAULT_OFFICIAL_LOGO);
                      setMsg('تم تأكيد تثبيت الشعار الرسمي المعتمد من GitHub');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-black shadow-sm cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    تأكيد ثبات الشعار المعتمد
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Titles Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                اسم المحافظة
              </label>
              <input
                type="text"
                required
                value={governorate}
                onChange={(e) => setGovernorate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 text-right"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                اسم المديرية
              </label>
              <input
                type="text"
                required
                value={directorate}
                onChange={(e) => setDirectorate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 text-right"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                اسم الإدارة التموينية
              </label>
              <input
                type="text"
                required
                value={administration}
                onChange={(e) => setAdministration(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 text-right"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                النص الإنجليزي المعتمد
              </label>
              <input
                type="text"
                required
                value={englishSubtitle}
                onChange={(e) => setEnglishSubtitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 text-left font-mono"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-black cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              استعادة كافة الافتراضيات
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-black text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                إلغاء (ESC)
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-black shadow-md cursor-pointer"
              >
                <Shield className="w-4 h-4" />
                حفظ وتطبيق إعدادات النظام والتذكير
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
