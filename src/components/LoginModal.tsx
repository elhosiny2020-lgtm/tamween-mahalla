import React, { useState } from 'react';
import { AppUser, SystemConfig } from '../types';
import { DEFAULT_OFFICIAL_LOGO } from '../defaultData';
import { ParticleCanvas } from './ParticleCanvas';
import { CartoonBakeryScene } from './CartoonBakeryScene';
import { Lock, User, ShieldCheck, UserPlus, LogIn, AlertCircle, Sparkles, Building2, KeyRound, Download, Laptop } from 'lucide-react';
import { downloadWindowsExeLauncher } from '../utils/htmlExporter';

interface LoginModalProps {
  systemConfig: SystemConfig;
  users: AppUser[];
  onLoginSuccess: (user: AppUser) => void;
  onRegisterUser: (newUser: AppUser) => void;
  logoutReason?: string | null;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  systemConfig,
  users,
  onLoginSuccess,
  onRegisterUser,
  logoutReason,
}) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'inspector' | 'auditor'>('inspector');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setErrorMsg('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    const found = users.find(
      (u) =>
        (u.username.toLowerCase() === trimmedUser.toLowerCase() ||
          (u.gmailEmail && u.gmailEmail.toLowerCase() === trimmedUser.toLowerCase())) &&
        u.password === password
    );

    if (found) {
      setSuccessMsg('تم تسجيل الدخول بنجاح، جاري فتح المنظومة التموينية...');
      setTimeout(() => {
        onLoginSuccess(found);
      }, 150);
    } else {
      setErrorMsg('بيانات الدخول غير صحيحة، يرجى التحقق من اسم المستخدم وكلمة المرور');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedUser = username.trim();
    const trimmedName = fullName.trim();

    if (!trimmedUser || !password || !trimmedName) {
      setErrorMsg('يرجى استيفاء كافة الحقول المطلوبة للتسجيل');
      return;
    }

    if (trimmedUser.length < 3) {
      setErrorMsg('اسم المستخدم يجب ألا يقل عن 3 أحرف');
      return;
    }

    if (users.some((u) => u.username.toLowerCase() === trimmedUser.toLowerCase())) {
      setErrorMsg('اسم المستخدم مسجل مسبقاً، يرجى اختيار اسم آخر');
      return;
    }

    const newUser: AppUser = {
      id: `u-${Date.now()}`,
      username: trimmedUser,
      fullName: trimmedName,
      password,
      role,
      createdAt: new Date().toISOString().split('T')[0],
    };

    onRegisterUser(newUser);
    setSuccessMsg('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول مباشرة.');
    setTimeout(() => {
      setIsRegistering(false);
      setPassword('');
      setSuccessMsg('');
    }, 500);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 overflow-hidden font-sans">
      {/* Particle Canvas */}
      <ParticleCanvas />

      {/* Modern Ambient Glow Accents */}
      <div className="absolute top-1/6 left-1/5 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/6 right-1/5 w-[28rem] h-[28rem] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10 my-4">
        {/* Official Ministry Emblem Shield Section */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center">
          <CartoonBakeryScene />
        </div>

        {/* Login & Register Card */}
        <div className="w-full lg:w-1/2 max-w-md bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border-2 border-amber-500/30 overflow-hidden transform transition-all duration-300">
          {/* Top Header with Emblem */}
          <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-amber-950 p-6 text-center text-white relative border-b border-amber-500/40">
            <div className="flex justify-center mb-3">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-white p-2 shadow-xl border-2 border-amber-400 flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
                  <img
                    src={systemConfig.logoBase64 || DEFAULT_OFFICIAL_LOGO}
                    alt="شعار وزارة التموين والتجارة الداخلية"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 p-1 bg-amber-500 rounded-lg text-slate-950">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            <div className="inline-block bg-amber-400 px-3 py-0.5 rounded-full shadow-sm mb-1.5 border border-amber-300">
              <h2 className="text-xs font-black text-black tracking-wider">
                جمهورية مصر العربية • وزارة التموين والتجارة الداخلية
              </h2>
            </div>
            <h1 className="text-base font-black text-white leading-snug">
              {systemConfig.governorateTitle}
            </h1>
            <p className="text-xs text-amber-100 font-bold mt-0.5">
              {systemConfig.directorateTitle}
            </p>
            <div className="inline-block mt-2 px-3.5 py-1 bg-amber-400 border border-amber-300 rounded-full text-xs font-black text-black shadow-sm">
              {systemConfig.administrationTitle}
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-slate-200 bg-slate-100/90 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(false);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                !isRegistering
                  ? 'bg-amber-400 text-black font-black shadow-md border border-amber-300'
                  : 'text-black hover:text-black hover:bg-slate-200/80'
              }`}
            >
              <LogIn className="w-4 h-4 text-black" />
              <span className="text-black font-black">تسجيل الدخول</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(true);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isRegistering
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              حساب جديد
            </button>
          </div>

          {/* Form Body */}
          <div className="p-6">
            {logoutReason && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-300 text-amber-950 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
                <Lock className="w-4 h-4 flex-shrink-0 text-amber-700 icon-float" />
                <span>{logoutReason}</span>
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-shake shadow-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {!isRegistering ? (
              <form onSubmit={handleLogin} className="space-y-4" autoComplete="off" noValidate>
                {/* Fake inputs to prevent browser autofill heuristics */}
                <input type="text" name="prevent_autofill_user" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
                <input type="password" name="prevent_autofill_pass" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    اسم المستخدم أو كود المفتش
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="app_auth_username"
                      id="app_auth_username"
                      required
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      data-lpignore="true"
                      data-form-type="other"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="أدخل اسم المستخدم (مثال: admin)"
                      className="w-full pr-10 pl-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-right shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      name="app_auth_credential"
                      id="app_auth_credential"
                      required
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      data-lpignore="true"
                      data-form-type="other"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور (مثال: admin123)"
                      className="w-full pr-10 pl-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-right shadow-inner"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-500 text-black rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] border border-amber-300"
                >
                  <KeyRound className="w-4 h-4 text-black stroke-[2.5]" />
                  <span className="text-black font-black text-sm">تسجيل الدخول والبدء في العمل</span>
                </button>

                {/* Direct Download EXE Application Button (تحميل المنظومة بالكامل على ملف EXE للويندوز) */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await downloadWindowsExeLauncher();
                    }}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-red-600 via-rose-700 to-red-600 hover:from-red-500 hover:to-rose-600 text-white rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] border border-red-400/80 group"
                    title="انقر لتحميل ملف تشغيل الويندوز المباشر (EXE) للعمل على الكمبيوتر بدون إنترنت"
                  >
                    <Download className="w-4 h-4 text-amber-300 stroke-[2.5] transition-transform duration-300 group-hover:translate-y-0.5" />
                    <span className="text-white font-black text-xs">تحميل المنظومة بالكامل على ملف (EXE)</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3" autoComplete="off" noValidate>
                <input type="text" name="prevent_autofill_reg_user" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
                <input type="password" name="prevent_autofill_reg_pass" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    الاسم الكامل والصفة الوظيفية
                  </label>
                  <input
                    type="text"
                    name="reg_fullname"
                    required
                    autoComplete="off"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثال: أحمد عبد الله - رئيس مكتب تموين"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    اسم المستخدم للدخول
                  </label>
                  <input
                    type="text"
                    name="reg_username"
                    required
                    autoComplete="off"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="اسم المستخدم بالإنجليزية أو العربية"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    كلمة المرور
                  </label>
                  <input
                    type="password"
                    name="reg_credential_new"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="كلمة المرور"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    المستوى الوظيفي / الصلاحية
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'admin' | 'inspector' | 'auditor')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="inspector">مفتش تموين / رقابة ميدانية</option>
                    <option value="auditor">مراجع حسابات تموينية ومديونيات</option>
                    <option value="admin">مدير إدارة / صلاحية إدارية كاملة</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 px-4 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <UserPlus className="w-4 h-4 text-amber-200" />
                  تأكيد تسجيل الحساب الجديد
                </button>
              </form>
            )}

            {/* Attribution Watermark */}
            <div className="mt-5 pt-3.5 border-t border-slate-200 text-center">
              <p className="text-[11px] font-black text-slate-600 bg-amber-50/70 border border-amber-200/60 rounded-lg py-1.5 px-2">
                تنفيذ وتصميم م/ أحمد الحسيني - تليفون: 01004414038
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
