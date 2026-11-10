import React, { useState, useEffect } from 'react';
import { AppUser, UserRoleType } from '../types';
import {
  getRoleNameArabic,
  ALL_PERMISSIONS_LIST,
  getDefaultPermissionsForRole,
  UserAction,
} from '../permissions';
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  X,
  Key,
  Check,
  Eye,
  Edit2,
  Save,
  Briefcase,
  Phone,
  Building2,
  CheckSquare,
  Square,
} from 'lucide-react';

interface UsersManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: AppUser[];
  currentUser: AppUser | null;
  onAddUser: (user: AppUser) => void;
  onUpdateUser?: (user: AppUser) => void;
  onDeleteUser: (userId: string) => void;
}

const ROLE_DEFINITIONS: {
  role: UserRoleType;
  title: string;
  badgeColor: string;
  summary: string;
}[] = [
  {
    role: 'admin',
    title: '👑 مدير نظام (تحكم كامل 100%)',
    badgeColor: 'bg-amber-100 text-amber-950 border-amber-400',
    summary: 'صلاحية مطلقة لإضافة وتعديل وحذف المخابز والمديونيات، إدارة المستخدمين، والنسخ الاحتياطي.',
  },
  {
    role: 'supervisor',
    title: '🛡️ مشرف عام رقابة ومخابز',
    badgeColor: 'bg-indigo-100 text-indigo-950 border-indigo-400',
    summary: 'إشراف كامل على المخابز والمديونيات والقرى والأنشطة والتقارير دون حذف الحسابات.',
  },
  {
    role: 'auditor',
    title: '💰 مراجع حسابات ومديونيات',
    badgeColor: 'bg-emerald-100 text-emerald-950 border-emerald-400',
    summary: 'إدارة قيود المديونيات والسداد وحاسبة الغرامات وتدقيق المعادلات والطباعة.',
  },
  {
    role: 'inspector',
    title: '🔍 مفتش رقابة وتموين',
    badgeColor: 'bg-purple-100 text-purple-950 border-purple-400',
    summary: 'إضافة وتعديل بيانات المخابز وتسجيل المخالفات الميدانية واستخدام حاسبة الغرامات.',
  },
  {
    role: 'data_entry',
    title: '⌨️ مسئول إدخال وتحديث بيانات',
    badgeColor: 'bg-cyan-100 text-cyan-950 border-cyan-400',
    summary: 'إدخال وتحديث سجلات المخابز والمديونيات وعرض التقارير دون صلاحية الحذف النهائي.',
  },
  {
    role: 'viewer',
    title: '👁️ مشاهد / قارئ فقط (بدون تعديل)',
    badgeColor: 'bg-blue-100 text-blue-950 border-blue-400',
    summary: 'عرض وتصفح كافة الجداول والرسوم البيانية وطباعة التقارير دون أي تعديل أو حذف.',
  },
];

export const UsersManagerModal: React.FC<UsersManagerModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
}) => {
  // Add New User Form State
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [jobTitle, setJobTitle] = useState('مفتش تموين أول');
  const [department, setDepartment] = useState('قسم الرقابة التموينية والمخابز');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRoleType>('viewer');
  const [customPermissions, setCustomPermissions] = useState<string[]>(
    getDefaultPermissionsForRole('viewer')
  );
  const [showAddPermissions, setShowAddPermissions] = useState(false);

  // Edit Existing User State (allows editing fullName, username, password, jobTitle, role, and granular permissions at any time!)
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRoleType>('admin');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleRoleChangeForNewUser = (newRole: UserRoleType) => {
    setRole(newRole);
    setCustomPermissions(getDefaultPermissionsForRole(newRole));
  };

  const toggleNewUserPermission = (permId: UserAction) => {
    setCustomPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const startEditingUser = (u: AppUser) => {
    setEditingUserId(u.id);
    setEditFullName(u.fullName || '');
    setEditUsername(u.username || '');
    setEditPassword(u.password || '');
    setEditJobTitle(u.jobTitle || 'مسئول تمويني');
    setEditDepartment(u.department || 'إدارة تموين مركز المحلة الكبرى');
    setEditPhone(u.phone || '');
    setEditRole(u.role);
    setEditPermissions(
      Array.isArray(u.customPermissions) && u.customPermissions.length > 0
        ? u.customPermissions
        : getDefaultPermissionsForRole(u.role)
    );
    setError('');
  };

  const handleEditRoleChange = (newRole: UserRoleType) => {
    setEditRole(newRole);
    setEditPermissions(getDefaultPermissionsForRole(newRole));
  };

  const toggleEditPermission = (permId: UserAction) => {
    setEditPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const handleSaveEditedUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId || !onUpdateUser) return;

    const cleanFullName = editFullName.trim();
    const cleanUsername = editUsername.trim();

    if (!cleanFullName) {
      setError('يرجى إدخال الاسم بالكامل للمستخدم');
      return;
    }
    if (!cleanUsername) {
      setError('يرجى إدخال اسم المستخدم للدخول');
      return;
    }
    if (
      users.some(
        (u) => u.id !== editingUserId && u.username.toLowerCase() === cleanUsername.toLowerCase()
      )
    ) {
      setError('اسم المستخدم مسجل بالفعل لحساب آخر');
      return;
    }

    const originalUser = users.find((u) => u.id === editingUserId);
    if (!originalUser) return;

    const updatedUser: AppUser = {
      ...originalUser,
      fullName: cleanFullName,
      username: cleanUsername,
      password: editPassword.trim() || originalUser.password || '123456',
      role: editRole,
      jobTitle: editJobTitle.trim(),
      department: editDepartment.trim(),
      phone: editPhone.trim(),
      customPermissions: editRole === 'admin' ? ALL_PERMISSIONS_LIST.map((p) => p.id) : editPermissions,
    };

    onUpdateUser(updatedUser);
    setEditingUserId(null);
    showToast(`تم حفظ تعديلات بيانات الحساب والاسم بالكامل (${updatedUser.fullName}) والصلاحيات بنجاح!`);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUser = username.trim();
    const cleanName = fullName.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanName || !cleanPass) {
      setError('جميع الحقول الأساسية (الاسم بالكامل، اسم المستخدم، كلمة المرور) مطلوبة');
      return;
    }

    if (users.some((u) => u.username.toLowerCase() === cleanUser.toLowerCase())) {
      setError('اسم المستخدم مسجل مسبقاً في المنظومة');
      return;
    }

    onAddUser({
      id: `u-${Date.now()}`,
      username: cleanUser,
      fullName: cleanName,
      password: cleanPass,
      role,
      jobTitle: jobTitle.trim(),
      department: department.trim(),
      phone: phone.trim(),
      customPermissions: role === 'admin' ? ALL_PERMISSIONS_LIST.map((p) => p.id) : customPermissions,
      createdAt: new Date().toISOString().split('T')[0],
    });

    setUsername('');
    setFullName('');
    setPassword('');
    setPhone('');
    showToast(`تم إنشاء حساب (${cleanName}) وتفعيل صلاحياته بنجاح!`);
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
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-amber-600/40 w-full max-w-5xl overflow-hidden flex flex-col max-h-[94vh] cursor-default">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-amber-900 to-slate-900 p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Users className="w-6 h-6 text-amber-300" />
            <div>
              <h3 className="text-base font-black">
                إدارة حسابات المستخدمين وتعديل الاسم بالكامل والصلاحيات الموسعة
              </h3>
              <p className="text-[11px] text-amber-200 font-bold">
                تعديل فوري لبيانات أي مستخدم وخانة الاسم بالكامل في أي وقت، مع تحكم تفصيلي في 16 صلاحية رقابية وإدارية
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

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-right">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border-2 border-emerald-400 text-emerald-950 rounded-xl text-xs font-black flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                <span>{successMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMsg('')}
                className="text-emerald-800 hover:text-emerald-950 font-black px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border-2 border-red-300 text-red-800 rounded-xl text-xs font-black flex items-center justify-between">
              <span>⚠️ {error}</span>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-red-700 hover:text-red-950 font-black px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* 1. REGISTERED USERS LIST & FULL INLINE EDITOR */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-600" />
                <span>حسابات المستخدمين المسجلة ({users.length} حساب) - اضغط "تعديل البيانات والاسم" لأي حساب:</span>
              </h4>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                يمكنك تعديل خانة الاسم بالكامل وكلمة المرور والصلاحيات في أي وقت
              </span>
            </div>

            <div className="space-y-3">
              {users.map((u) => {
                const isEditingThis = editingUserId === u.id;
                const activePerms =
                  u.role === 'admin'
                    ? ALL_PERMISSIONS_LIST.map((p) => p.id)
                    : Array.isArray(u.customPermissions) && u.customPermissions.length > 0
                    ? u.customPermissions
                    : getDefaultPermissionsForRole(u.role);

                return (
                  <div
                    key={u.id}
                    className={`border-2 rounded-2xl transition-all overflow-hidden ${
                      isEditingThis
                        ? 'border-amber-500 bg-amber-50/30 shadow-xl'
                        : u.role === 'admin'
                        ? 'border-amber-300 bg-amber-50/15'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {/* User Summary Row */}
                    <div className="p-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-xs shrink-0 ${
                            u.role === 'admin'
                              ? 'bg-amber-500 text-slate-950'
                              : u.role === 'viewer'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-amber-300'
                          }`}
                        >
                          {u.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-slate-900">
                              الاسم بالكامل: {u.fullName}
                            </span>
                            {currentUser?.id === u.id && (
                              <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-black">
                                الحساب النشط حالياً
                              </span>
                            )}
                            <span className="text-[11px] font-mono font-black text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                              اليوزر: {u.username}
                            </span>
                            <span className="text-[11px] font-mono font-black text-rose-900 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-300">
                              الباسورد: {u.password || 'admin'}
                            </span>
                            {u.jobTitle && (
                              <span className="text-[11px] font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300">
                                {u.jobTitle}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-600 font-bold flex-wrap">
                            <span>الدور: {getRoleNameArabic(u.role)}</span>
                            <span>•</span>
                            <span className="text-indigo-700 font-black">
                              عدد الصلاحيات المفعلة: ({activePerms.length} من {ALL_PERMISSIONS_LIST.length} صلاحية)
                            </span>
                            {u.department && (
                              <>
                                <span>•</span>
                                <span>{u.department}</span>
                              </>
                            )}
                            {u.phone && (
                              <>
                                <span>•</span>
                                <span className="font-mono">{u.phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Role Switcher + Edit Full Name & Permissions Button + Delete */}
                      <div className="flex items-center flex-wrap gap-2">
                        {onUpdateUser && (
                          <select
                            value={u.role}
                            onChange={(e) => {
                              const newRole = e.target.value as UserRoleType;
                              onUpdateUser({
                                ...u,
                                role: newRole,
                                customPermissions: getDefaultPermissionsForRole(newRole),
                              });
                              showToast(`تم تغيير مستوى صلاحية (${u.fullName}) إلى ${getRoleNameArabic(newRole)}`);
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-black border border-slate-300 bg-slate-50 text-slate-900 cursor-pointer focus:ring-2 focus:ring-amber-500"
                            title="تغيير سريع لدور وصلاحية المستخدم"
                          >
                            {ROLE_DEFINITIONS.map((r) => (
                              <option key={r.role} value={r.role}>
                                {r.title}
                              </option>
                            ))}
                          </select>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            isEditingThis ? setEditingUserId(null) : startEditingUser(u)
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer border transition ${
                            isEditingThis
                              ? 'bg-slate-800 text-white border-slate-700'
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-xs'
                          }`}
                          title="تعديل الاسم بالكامل، اسم المستخدم، كلمة المرور، وتفاصيل الصلاحيات"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>{isEditingThis ? 'إغلاق التعديل' : 'تعديل الاسم والبيانات والصلاحيات'}</span>
                        </button>

                        {users.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف حساب "${u.fullName}" (${u.username})؟`)) {
                                onDeleteUser(u.id);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-white bg-rose-600 hover:bg-rose-700 rounded-xl text-xs font-black cursor-pointer shadow-xs"
                            title="حذف المستخدم"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف مستخدم</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Active Permissions Pills Preview */}
                    {!isEditingThis && (
                      <div className="px-3.5 pb-3 pt-1 flex flex-wrap items-center gap-1 border-t border-slate-100 bg-slate-50/60">
                        <span className="text-[10px] font-black text-slate-500 ml-1">
                          الصلاحيات الممنوحة:
                        </span>
                        {ALL_PERMISSIONS_LIST.filter((p) => activePerms.includes(p.id)).map((p) => (
                          <span
                            key={p.id}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700"
                          >
                            ✓ {p.label}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Expandable Full User Data & Permissions Editor */}
                    {isEditingThis && (
                      <form
                        onSubmit={handleSaveEditedUser}
                        className="p-4 bg-gradient-to-b from-amber-50/80 to-white border-t-2 border-amber-300 space-y-4"
                      >
                        <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                          <h5 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                            <Edit2 className="w-4 h-4 text-amber-700" />
                            <span>
                              تعديل بيانات المستخدم وخانة الاسم بالكامل والصلاحيات التفصيلية ({u.fullName})
                            </span>
                          </h5>
                          <span className="text-[11px] font-bold text-amber-800">
                            يتم تطبيق التعديل فوراً في الهيدر والتقارير
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-black text-slate-800 mb-1">
                              الاسم بالكامل (يظهر في النظام والتقارير) *
                            </label>
                            <input
                              type="text"
                              required
                              value={editFullName}
                              onChange={(e) => setEditFullName(e.target.value)}
                              placeholder="اكتب الاسم الثلاثي أو الرباعي بالكامل"
                              className="w-full px-3 py-2 bg-white border-2 border-amber-400 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-black text-slate-800 mb-1">
                              اسم المستخدم للدخول (Username) *
                            </label>
                            <input
                              type="text"
                              required
                              value={editUsername}
                              onChange={(e) => setEditUsername(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 font-mono text-left"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-black text-slate-800 mb-1">
                              كلمة المرور (Password) *
                            </label>
                            <input
                              type="text"
                              required
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              placeholder="كلمة المرور"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 font-mono text-left"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-black text-slate-800 mb-1 flex items-center gap-1">
                              <Briefcase className="w-3 h-3 text-amber-700" />
                              <span>المسمى الوظيفي / الدرجة</span>
                            </label>
                            <input
                              type="text"
                              value={editJobTitle}
                              onChange={(e) => setEditJobTitle(e.target.value)}
                              placeholder="مثال: مدير الرقابة التموينية / كبير مفتشين"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-black text-slate-800 mb-1 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-amber-700" />
                              <span>القسم / الإدارة الفرعية</span>
                            </label>
                            <input
                              type="text"
                              value={editDepartment}
                              onChange={(e) => setEditDepartment(e.target.value)}
                              placeholder="مثال: قسم شئون المخابز والمديونيات"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-black text-slate-800 mb-1 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-amber-700" />
                              <span>رقم التليفون</span>
                            </label>
                            <input
                              type="text"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              placeholder="010xxxxxxxx"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 font-mono text-left"
                            />
                          </div>
                        </div>

                        {/* Role Selection inside Editor */}
                        <div>
                          <label className="block text-[11px] font-black text-slate-800 mb-1.5">
                            مستوى الصلاحية الأساسي للحساب:
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {ROLE_DEFINITIONS.map((r) => (
                              <button
                                key={r.role}
                                type="button"
                                onClick={() => handleEditRoleChange(r.role)}
                                className={`p-2.5 rounded-xl border text-right cursor-pointer transition ${
                                  editRole === r.role
                                    ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-400/50'
                                    : 'bg-white border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <div className="text-xs font-black text-slate-900">{r.title}</div>
                                <div className="text-[10px] text-slate-600 font-bold mt-0.5 leading-snug">
                                  {r.summary}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Granular 16 Permissions Matrix */}
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-black text-slate-900">
                              مصفوفة بيانات الصلاحيات التفصيلية ({editPermissions.length} من {ALL_PERMISSIONS_LIST.length} مفعلة):
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditPermissions(ALL_PERMISSIONS_LIST.map((p) => p.id))}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black cursor-pointer"
                              >
                                ✓ تفعيل كل الصلاحيات
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditPermissions(['VIEW_REPORTS', 'VIEW_CHARTS', 'EXPORT_DATA'])}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black cursor-pointer"
                              >
                                👁️ قراءة وتقارير فقط
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            {ALL_PERMISSIONS_LIST.map((perm) => {
                              const checked =
                                editRole === 'admin' || editPermissions.includes(perm.id);
                              return (
                                <label
                                  key={perm.id}
                                  onClick={() => {
                                    if (editRole !== 'admin') toggleEditPermission(perm.id);
                                  }}
                                  className={`p-2 rounded-lg border flex items-start gap-2 cursor-pointer select-none ${
                                    checked
                                      ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950'
                                      : 'bg-white border-slate-200 text-slate-500'
                                  }`}
                                >
                                  {checked ? (
                                    <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                  )}
                                  <div>
                                    <div className="text-[11px] font-black leading-tight">{perm.label}</div>
                                    <div className="text-[9.5px] opacity-80 mt-0.5 leading-tight">
                                      {perm.description}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setEditingUserId(null)}
                            className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            إلغاء التعديل
                          </button>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                          >
                            <Save className="w-4 h-4" />
                            <span>حفظ تعديل الاسم بالكامل والبيانات والصلاحيات ✓</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. ADD NEW USER FORM */}
          <form
            onSubmit={handleAdd}
            className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl space-y-3.5"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-amber-600" />
                <span>إضافة حساب مستخدم جديد وتحديد بياناته وصلاحياته</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddPermissions((prev) => !prev)}
                className="text-xs font-black text-indigo-700 hover:text-indigo-900 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg cursor-pointer"
              >
                {showAddPermissions
                  ? 'إخفاء مصفوفة الصلاحيات التفصيلية'
                  : `تخصيص الصلاحيات التفصيلية (${customPermissions.length} مفعلة) ⚙️`}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  الاسم بالكامل والصفة *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: أ/ محمد أحمد - مفتش تموين"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  اسم المستخدم للدخول (Username) *
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثال: inspector2"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 text-left font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  كلمة المرور (Password) *
                </label>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="كلمة المرور"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 text-left font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  المسمى الوظيفي
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="مثال: مفتش تموين أول / مراجع حسابات"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  القسم / المكتب التابع له
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="قسم الرقابة التموينية والمخابز"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  مستوى الصلاحية الأساسي *
                </label>
                <select
                  value={role}
                  onChange={(e) => handleRoleChangeForNewUser(e.target.value as UserRoleType)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900"
                >
                  {ROLE_DEFINITIONS.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {showAddPermissions && (
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="text-xs font-black text-slate-800">
                  تخصيص الصلاحيات التفصيلية للحساب الجديد:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {ALL_PERMISSIONS_LIST.map((perm) => {
                    const checked = role === 'admin' || customPermissions.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        onClick={() => {
                          if (role !== 'admin') toggleNewUserPermission(perm.id);
                        }}
                        className={`p-2 rounded-lg border flex items-start gap-2 cursor-pointer select-none ${
                          checked
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        {checked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="text-[11px] font-black">{perm.label}</div>
                          <div className="text-[9.5px] opacity-80">{perm.description}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>إنشاء وحفظ الحساب وتفعيل الصلاحيات</span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex justify-between items-center shrink-0">
          <span className="text-xs font-bold text-slate-600">
            أي تعديل على الاسم بالكامل أو الصلاحيات يُحفظ فوراً في قاعدة البيانات
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black cursor-pointer"
          >
            إغلاق النافذة (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
