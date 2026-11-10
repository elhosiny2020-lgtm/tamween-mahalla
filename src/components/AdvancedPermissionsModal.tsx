import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  CheckCircle2,
  RotateCcw,
  Save,
  Layers,
  Database,
  UserCheck,
  UserPlus,
  Trash2,
  Users,
  Key,
  Edit2,
  Plus,
  Briefcase,
} from 'lucide-react';
import { AppUser, CustomJobRole, SystemConfig, UserRoleType } from '../types';
import {
  ALL_PERMISSIONS_LIST,
  getDefaultPermissionsForRole,
  getDefaultRolePermissionsMap,
  UserAction,
} from '../permissions';

interface AdvancedPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemConfig: SystemConfig;
  onSaveSystemConfig: (newConfig: SystemConfig) => void;
  users?: AppUser[];
  currentUser?: AppUser | null;
  onAddUser?: (user: AppUser) => void;
  onUpdateUser?: (user: AppUser) => void;
  onDeleteUser?: (userId: string) => void;
}

interface RoleTabItem {
  role: UserRoleType;
  shortTitle: string;
  fullTitle: string;
  badgeColor: string;
  isCustom?: boolean;
}

const DEFAULT_ROLE_TABS: RoleTabItem[] = [
  {
    role: 'admin',
    shortTitle: 'مدير النظام (Admin)',
    fullTitle: 'مدير النظام (صلاحيات الإدارة العليا الكاملة)',
    badgeColor: 'from-emerald-600 to-teal-700',
  },
  {
    role: 'supervisor',
    shortTitle: 'مشرف عام',
    fullTitle: 'مشرف عام رقابة ومخابز',
    badgeColor: 'from-blue-600 to-cyan-700',
  },
  {
    role: 'auditor',
    shortTitle: 'مراجع حسابات (Auditor)',
    fullTitle: 'مراجع حسابات ومديونيات وتحصيل',
    badgeColor: 'from-indigo-600 to-purple-600',
  },
  {
    role: 'inspector',
    shortTitle: 'مفتش تموين (Inspector)',
    fullTitle: 'مفتش رقابة وتموين ميداني',
    badgeColor: 'from-amber-600 to-orange-600',
  },
  {
    role: 'data_entry',
    shortTitle: 'مدخل بيانات',
    fullTitle: 'مسئول إدخال وتحديث بيانات',
    badgeColor: 'from-cyan-600 to-sky-700',
  },
  {
    role: 'viewer',
    shortTitle: 'مشاهد فقط',
    fullTitle: 'مشاهد / قارئ فقط بدون تعديل',
    badgeColor: 'from-slate-600 to-slate-700',
  },
];

export const AdvancedPermissionsModal: React.FC<AdvancedPermissionsModalProps> = ({
  isOpen,
  onClose,
  systemConfig,
  onSaveSystemConfig,
  users = [],
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
}) => {
  // Custom Job Roles list (persisted in systemConfig.customRoles)
  const [roleTabs, setRoleTabs] = useState<RoleTabItem[]>(() => {
    const customList: RoleTabItem[] = (systemConfig.customRoles || []).map((cr) => ({
      role: cr.id,
      shortTitle: cr.title,
      fullTitle: cr.fullTitle || cr.title,
      badgeColor: cr.badgeColor || 'from-purple-600 to-indigo-700',
      isCustom: true,
    }));
    return [...DEFAULT_ROLE_TABS, ...customList];
  });

  const [selectedRole, setSelectedRole] = useState<UserRoleType>('inspector');
  const [newRoleTitle, setNewRoleTitle] = useState('');
  const [newRoleFullDesc, setNewRoleFullDesc] = useState('');

  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>(() => {
    const defaults = getDefaultRolePermissionsMap();
    const existing = systemConfig.rolePermissions || {};
    const merged: Record<string, string[]> = {
      admin: existing.admin ? [...existing.admin] : [...defaults.admin],
      supervisor: existing.supervisor ? [...existing.supervisor] : [...defaults.supervisor],
      auditor: existing.auditor ? [...existing.auditor] : [...defaults.auditor],
      inspector: existing.inspector ? [...existing.inspector] : [...defaults.inspector],
      data_entry: existing.data_entry ? [...existing.data_entry] : [...defaults.data_entry],
      viewer: existing.viewer ? [...existing.viewer] : [...defaults.viewer],
    };
    Object.keys(existing).forEach((k) => {
      if (!merged[k]) {
        merged[k] = [...existing[k]];
      }
    });
    return merged;
  });

  // Add New User state
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRoleType>('inspector');
  const [newJobTitle, setNewJobTitle] = useState('مفتش تموين أول');

  // Inline Edit User state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRoleType>('inspector');
  const [editJobTitle, setEditJobTitle] = useState('');

  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const showNotice = (msg: string) => {
    setErrorNotice(null);
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 4000);
  };

  const currentRolePerms = rolePermissions[selectedRole] || [];
  const modalPermissions = ALL_PERMISSIONS_LIST.filter((p) => p.level === 'modal');
  const dataPermissions = ALL_PERMISSIONS_LIST.filter((p) => p.level === 'data');

  const persistRolesAndPermissions = (
    updatedTabs: RoleTabItem[],
    updatedPerms: Record<string, string[]>,
    noticeMsg: string
  ) => {
    const customRolesToSave: CustomJobRole[] = updatedTabs.map((t) => ({
      id: t.role,
      title: t.shortTitle,
      fullTitle: t.fullTitle,
      badgeColor: t.badgeColor,
    }));
    const updatedConfig: SystemConfig = {
      ...systemConfig,
      rolePermissions: updatedPerms,
      customRoles: customRolesToSave,
    };
    onSaveSystemConfig(updatedConfig);
    showNotice(noticeMsg);
  };

  // Add a new Job Role
  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = newRoleTitle.trim();
    if (!cleanTitle) {
      setErrorNotice('يرجى كتابة اسم الدور الوظيفي الجديد أولاً');
      return;
    }
    const roleId = `role_${Date.now()}`;
    if (roleTabs.some((r) => r.shortTitle === cleanTitle || r.role === cleanTitle)) {
      setErrorNotice('هذا الدور الوظيفي موجود بالفعل');
      return;
    }
    const newTab: RoleTabItem = {
      role: roleId,
      shortTitle: cleanTitle,
      fullTitle: newRoleFullDesc.trim() || cleanTitle,
      badgeColor: 'from-purple-600 to-indigo-700',
      isCustom: true,
    };
    const updatedTabs = [...roleTabs, newTab];
    const updatedPerms = {
      ...rolePermissions,
      [roleId]: getDefaultPermissionsForRole('inspector'),
    };
    setRoleTabs(updatedTabs);
    setRolePermissions(updatedPerms);
    setSelectedRole(roleId);
    setNewRoleTitle('');
    setNewRoleFullDesc('');
    persistRolesAndPermissions(
      updatedTabs,
      updatedPerms,
      `تم إضافة الدور الوظيفي الجديد (${cleanTitle}) وحفظه بنجاح!`
    );
  };

  // Delete any Job Role
  const handleDeleteRole = (roleToDelete: UserRoleType, title: string) => {
    if (roleTabs.length <= 1) {
      setErrorNotice('لا يمكن حذف جميع الأدوار الوظيفية، يجب بقاء دور واحد على الأقل.');
      return;
    }
    const updatedTabs = roleTabs.filter((r) => r.role !== roleToDelete);
    const updatedPerms = { ...rolePermissions };
    delete updatedPerms[roleToDelete];
    setRoleTabs(updatedTabs);
    setRolePermissions(updatedPerms);
    if (selectedRole === roleToDelete && updatedTabs.length > 0) {
      setSelectedRole(updatedTabs[0].role);
    }
    persistRolesAndPermissions(
      updatedTabs,
      updatedPerms,
      `تم حذف الدور الوظيفي (${title}) وتحديث الصلاحيات بنجاح!`
    );
  };

  // Add New User handler
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddUser) return;
    const cleanName = newFullName.trim();
    const cleanUser = newUsername.trim();
    const cleanPass = newPassword.trim();

    if (!cleanName || !cleanUser || !cleanPass) {
      setErrorNotice('يرجى إدخال الاسم بالكامل واسم المستخدم (اليوزر) وكلمة المرور (الباسورد)');
      return;
    }
    if (users.some((u) => u.username.toLowerCase() === cleanUser.toLowerCase())) {
      setErrorNotice('اسم المستخدم (اليوزر) مسجل بالفعل لمستخدم آخر');
      return;
    }

    const createdUser: AppUser = {
      id: `u-${Date.now()}`,
      fullName: cleanName,
      username: cleanUser,
      password: cleanPass,
      role: newUserRole,
      jobTitle: newJobTitle.trim() || 'مفتش تموين',
      department: 'إدارة تموين مركز المحلة الكبرى',
      customPermissions:
        rolePermissions[newUserRole] || getDefaultPermissionsForRole(newUserRole),
      createdAt: new Date().toISOString().split('T')[0],
    };

    onAddUser(createdUser);
    setNewFullName('');
    setNewUsername('');
    setNewPassword('');
    showNotice(`تم إضافة المستخدم الجديد (${cleanName}) - اليوزر: (${cleanUser}) بنجاح!`);
  };

  const startEditUser = (u: AppUser) => {
    setEditingUserId(u.id);
    setEditFullName(u.fullName || '');
    setEditUsername(u.username || '');
    setEditPassword(u.password || 'admin');
    setEditUserRole(u.role);
    setEditJobTitle(u.jobTitle || '');
  };

  const saveEditedUser = (u: AppUser) => {
    if (!onUpdateUser) return;
    const cleanName = editFullName.trim();
    const cleanUser = editUsername.trim();
    const cleanPass = editPassword.trim();
    if (!cleanName || !cleanUser || !cleanPass) {
      setErrorNotice('الاسم بالكامل واليوزر والباسورد حقول أساسية لا يمكن تركها فارغة');
      return;
    }
    const updatedUser: AppUser = {
      ...u,
      fullName: cleanName,
      username: cleanUser,
      password: cleanPass,
      role: editUserRole,
      jobTitle: editJobTitle.trim() || u.jobTitle,
      customPermissions:
        rolePermissions[editUserRole] || getDefaultPermissionsForRole(editUserRole),
    };
    onUpdateUser(updatedUser);
    setEditingUserId(null);
    showNotice(
      `تم حفظ تعديل بيانات المستخدم (${cleanName}) - اليوزر: (${cleanUser}) - الباسورد: (${cleanPass}) بنجاح!`
    );
  };

  const togglePermission = (permId: UserAction) => {
    setRolePermissions((prev) => {
      const current = prev[selectedRole] || [];
      const updated = current.includes(permId)
        ? current.filter((id) => id !== permId)
        : [...current, permId];
      return {
        ...prev,
        [selectedRole]: updated,
      };
    });
    setSavedNotice(null);
  };

  const selectAllForRole = () => {
    setRolePermissions((prev) => ({
      ...prev,
      [selectedRole]: ALL_PERMISSIONS_LIST.map((p) => p.id),
    }));
    setSavedNotice(null);
  };

  const clearAllForRole = () => {
    setRolePermissions((prev) => ({
      ...prev,
      [selectedRole]: [],
    }));
    setSavedNotice(null);
  };

  const resetRoleToDefault = () => {
    setRolePermissions((prev) => ({
      ...prev,
      [selectedRole]: getDefaultPermissionsForRole(selectedRole),
    }));
    showNotice('تمت استعادة الصلاحيات الافتراضية لهذا الدور (اضغط حفظ لتأكيد الاعتماد)');
  };

  const handleSave = () => {
    persistRolesAndPermissions(
      roleTabs,
      rolePermissions,
      'تم حفظ كافة الأدوار الوظيفية ومصفوفة الصلاحيات في SystemConfig بنجاح!'
    );
  };

  const activeTabInfo = roleTabs.find((r) => r.role === selectedRole) || roleTabs[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-2 sm:p-4 overflow-y-auto"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border-2 border-amber-500/60 w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-l from-indigo-950 via-slate-900 to-amber-950 text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-amber-500/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide flex items-center gap-2 flex-wrap">
                <span>إدارة المستخدمين والأدوار الوظيفية وإعدادات الصلاحيات المتقدمة</span>
                <span className="text-[11px] bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full">
                  الاسم بالكامل • اليوزر • الباسورد • الأدوار
                </span>
              </h2>
              <p className="text-xs text-amber-200 font-bold mt-0.5">
                إضافة وحذف وتعديل المستخدمين (الاسم بالكامل، اليوزر، الباسورد) + إضافة وحذف أي دور وظيفي وتحديد صلاحياته
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow"
            title="إغلاق النافذة (ESC)"
          >
            <X className="w-4 h-4" />
            <span>إغلاق (ESC)</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 bg-slate-50">
          {savedNotice && (
            <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-950 px-4 py-2.5 rounded-xl flex items-center justify-between font-black text-xs shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{savedNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setSavedNotice(null)}
                className="text-emerald-800 font-black px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {errorNotice && (
            <div className="bg-rose-50 border-2 border-rose-500 text-rose-950 px-4 py-2.5 rounded-xl flex items-center justify-between font-black text-xs shadow-xs">
              <span>⚠️ {errorNotice}</span>
              <button
                type="button"
                onClick={() => setErrorNotice(null)}
                className="text-rose-800 font-black px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* ===================================================================== */}
          {/* SECTION 1: USERS MANAGEMENT (الاسم بالكامل • اليوزر • الباسورد • إضافة وحذف مستخدم) */}
          {/* ===================================================================== */}
          <div className="bg-white rounded-2xl border-2 border-amber-400 shadow-md overflow-hidden">
            <div className="bg-gradient-to-l from-slate-900 via-amber-950 to-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-black text-amber-300">
                    أولاً: سجل حسابات المستخدمين (الاسم بالكامل • اليوزر • الباسورد • الدور الوظيفي)
                  </h3>
                  <p className="text-[11px] text-slate-200 font-bold">
                    يمكنك إضافة مستخدم جديد أو تعديل الاسم بالكامل واليوزر والباسورد أو حذف أي مستخدم فوراً
                  </p>
                </div>
              </div>
              <span className="bg-amber-400 text-slate-950 text-xs font-black px-3 py-1 rounded-full">
                إجمالي المستخدمين: {users.length} مستخدم
              </span>
            </div>

            <div className="p-4 space-y-4">
              {/* Add New User Form */}
              {onAddUser && (
                <form
                  onSubmit={handleCreateUser}
                  className="bg-amber-50/80 border-2 border-amber-300 rounded-xl p-3.5 space-y-3"
                >
                  <div className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-amber-700" />
                    <span>إضافة مستخدم جديد للمنظومة (الاسم بالكامل • اليوزر • الباسورد • الدور الوظيفي):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-black text-slate-800 mb-1">
                        الاسم بالكامل *
                      </label>
                      <input
                        type="text"
                        required
                        value={newFullName}
                        onChange={(e) => setNewFullName(e.target.value)}
                        placeholder="مثال: أ/ محمد أحمد علي"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-800 mb-1">
                        اسم المستخدم (اليوزر) *
                      </label>
                      <input
                        type="text"
                        required
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="مثال: user2025"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 font-mono text-left"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-800 mb-1">
                        كلمة المرور (الباسورد) *
                      </label>
                      <input
                        type="text"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="مثال: 123456"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 font-mono text-left"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-800 mb-1">
                        الدور الوظيفي *
                      </label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900"
                      >
                        {roleTabs.map((rt) => (
                          <option key={rt.role} value={rt.role}>
                            {rt.shortTitle}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full py-2 px-3 bg-gradient-to-l from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl text-xs font-black shadow flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>إضافة مستخدم جديد +</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Users Table */}
              <div className="overflow-x-auto border border-slate-300 rounded-xl">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-black">
                      <th className="p-2.5 border border-slate-700 text-center w-10">م</th>
                      <th className="p-2.5 border border-slate-700">الاسم بالكامل (Full Name)</th>
                      <th className="p-2.5 border border-slate-700 text-center">اسم المستخدم (اليوزر)</th>
                      <th className="p-2.5 border border-slate-700 text-center">كلمة المرور (الباسورد)</th>
                      <th className="p-2.5 border border-slate-700 text-center">الدور الوظيفي</th>
                      <th className="p-2.5 border border-slate-700 text-center">المسمى الوظيفي</th>
                      <th className="p-2.5 border border-slate-700 text-center">إجراءات (تعديل / حذف مستخدم)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-bold">
                    {users.map((u, idx) => {
                      const isEditing = editingUserId === u.id;
                      const roleObj = roleTabs.find((r) => r.role === u.role);
                      return (
                        <tr
                          key={u.id}
                          className={
                            isEditing
                              ? 'bg-amber-50'
                              : idx % 2 === 0
                              ? 'bg-white hover:bg-slate-50'
                              : 'bg-slate-50/70 hover:bg-slate-100/70'
                          }
                        >
                          <td className="p-2.5 border border-slate-200 text-center font-black">
                            {idx + 1}
                          </td>
                          <td className="p-2.5 border border-slate-200 font-black text-slate-900">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editFullName}
                                onChange={(e) => setEditFullName(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border-2 border-amber-500 rounded-lg text-xs font-black text-slate-900"
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <span>{u.fullName}</span>
                                {currentUser?.id === u.id && (
                                  <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-black">
                                    نشط الآن
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-2.5 border border-slate-200 text-center font-mono font-black text-indigo-900">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editUsername}
                                onChange={(e) => setEditUsername(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border-2 border-amber-500 rounded-lg text-xs font-mono font-black text-left"
                              />
                            ) : (
                              <span className="bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg inline-block">
                                {u.username}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 border border-slate-200 text-center font-mono font-black text-rose-900">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editPassword}
                                onChange={(e) => setEditPassword(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border-2 border-amber-500 rounded-lg text-xs font-mono font-black text-left"
                              />
                            ) : (
                              <span className="bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 text-slate-950">
                                <Key className="w-3 h-3 text-amber-700" />
                                {u.password || 'admin'}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 border border-slate-200 text-center">
                            {isEditing ? (
                              <select
                                value={editUserRole}
                                onChange={(e) => setEditUserRole(e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border-2 border-amber-500 rounded-lg text-xs font-black"
                              >
                                {roleTabs.map((rt) => (
                                  <option key={rt.role} value={rt.role}>
                                    {rt.shortTitle}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-amber-300 text-[11px] font-black">
                                {roleObj ? roleObj.shortTitle : u.role}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 border border-slate-200 text-center text-slate-700">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editJobTitle}
                                onChange={(e) => setEditJobTitle(e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                              />
                            ) : (
                              u.jobTitle || 'مسئول تمويني'
                            )}
                          </td>
                          <td className="p-2.5 border border-slate-200 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => saveEditedUser(u)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer shadow-xs"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                    <span>حفظ</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingUserId(null)}
                                    className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-[11px] font-black cursor-pointer"
                                  >
                                    إلغاء
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => startEditUser(u)}
                                    className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer shadow-2xs"
                                    title="تعديل الاسم بالكامل واليوزر والباسورد والدور الوظيفي"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span>تعديل البيانات</span>
                                  </button>
                                  {onDeleteUser && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (users.length <= 1) {
                                          setErrorNotice('لا يمكن حذف المستخدم الوحيد في المنظومة');
                                          return;
                                        }
                                        if (confirm(`هل أنت متأكد من حذف المستخدم "${u.fullName}" (${u.username}) نهائياً؟`)) {
                                          onDeleteUser(u.id);
                                          showNotice(`تم حذف المستخدم (${u.fullName}) بنجاح!`);
                                        }
                                      }}
                                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer shadow-2xs"
                                      title="حذف المستخدم"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>حذف مستخدم</span>
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* SECTION 2: ADD / DELETE JOB ROLES & CONFIGURE PERMISSIONS */}
          {/* ===================================================================== */}
          <div className="bg-white rounded-2xl border-2 border-indigo-300 shadow-md overflow-hidden">
            <div className="bg-gradient-to-l from-indigo-950 via-purple-900 to-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="text-sm font-black text-amber-300">
                    ثانياً: إدارة الأدوار الوظيفية (إضافة دور وظيفي جديد • حذف دور وظيفي • تخصيص الصلاحيات)
                  </h3>
                  <p className="text-[11px] text-indigo-200 font-bold">
                    أضف أي دور وظيفي جديد أو احذف أي دور وظيفي، وحدد العمليات المسموح بها لكل دور
                  </p>
                </div>
              </div>
              <span className="bg-indigo-500/30 border border-indigo-300/40 text-white text-xs font-black px-3 py-1 rounded-full">
                عدد الأدوار الوظيفية: {roleTabs.length} أدوار
              </span>
            </div>

            <div className="p-4 space-y-4">
              {/* Add New Job Role Bar */}
              <form
                onSubmit={handleAddRole}
                className="bg-indigo-50/90 border-2 border-indigo-200 rounded-xl p-3.5 flex flex-wrap items-end gap-3"
              >
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[11px] font-black text-indigo-950 mb-1">
                    اسم الدور الوظيفي الجديد (لإضافته لقائمة الصلاحيات) *
                  </label>
                  <input
                    type="text"
                    value={newRoleTitle}
                    onChange={(e) => setNewRoleTitle(e.target.value)}
                    placeholder="مثال: رئيس مكتب تموين / كبير مفتشين / مراجع أول"
                    className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-xl text-xs font-black text-slate-900"
                  />
                </div>
                <div className="flex-1 min-w-[220px]">
                  <label className="block text-[11px] font-black text-indigo-950 mb-1">
                    الوصف الوظيفي للدور (اختياري)
                  </label>
                  <input
                    type="text"
                    value={newRoleFullDesc}
                    onChange={(e) => setNewRoleFullDesc(e.target.value)}
                    placeholder="مثال: متابعة المخابز والمديونيات والتقارير"
                    className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-l from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white rounded-xl text-xs font-black shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة دور وظيفي جديد +</span>
                </button>
              </form>

              {/* Job Roles Selector Cards with Delete Role Button */}
              <div>
                <div className="text-xs font-black text-slate-700 mb-2 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  <span>قائمة الأدوار الوظيفية المتاحة (اضغط على أي دور لتعديل صلاحياته أو اضغط 🗑️ لحذف الدور الوظيفي):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {roleTabs.map((tab) => {
                    const isSelected = selectedRole === tab.role;
                    const count = (rolePermissions[tab.role] || []).length;
                    return (
                      <div
                        key={tab.role}
                        onClick={() => {
                          setSelectedRole(tab.role);
                          setSavedNotice(null);
                        }}
                        className={`p-3 rounded-xl font-black text-xs transition-all flex items-center justify-between gap-2 border-2 cursor-pointer ${
                          isSelected
                            ? `bg-gradient-to-l ${tab.badgeColor} text-white border-amber-400 shadow-md`
                            : 'bg-white text-slate-800 border-slate-300 hover:bg-indigo-50 hover:border-indigo-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-black">{tab.shortTitle}</div>
                          <div
                            className={`text-[10px] mt-1 inline-block px-2 py-0.5 rounded font-bold ${
                              isSelected ? 'bg-black/25 text-amber-200' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {count} / {ALL_PERMISSIONS_LIST.length} صلاحية
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`هل أنت متأكد من حذف الدور الوظيفي "${tab.shortTitle}"؟`)) {
                              handleDeleteRole(tab.role, tab.shortTitle);
                            }
                          }}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                            isSelected
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : 'bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200'
                          }`}
                          title={`حذف الدور الوظيفي (${tab.shortTitle})`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Role Toolbar */}
              <div className="bg-indigo-50 px-4 py-2.5 rounded-xl border border-indigo-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-700" />
                  <span className="text-xs font-black text-slate-800">
                    تخصيص صلاحيات الدور المحدد:{' '}
                    <span className="text-indigo-700 underline">{activeTabInfo.fullTitle}</span>
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-lg">
                    المسموح: {currentRolePerms.length} من {ALL_PERMISSIONS_LIST.length}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={selectAllForRole}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] transition-colors cursor-pointer"
                  >
                    تفعيل كل العمليات للدور
                  </button>
                  <button
                    type="button"
                    onClick={clearAllForRole}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] transition-colors cursor-pointer"
                  >
                    إلغاء كل العمليات
                  </button>
                  <button
                    type="button"
                    onClick={resetRoleToDefault}
                    className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-black text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    استعادة افتراضي الدور
                  </button>
                </div>
              </div>

              {/* Permissions Grid: Data Operations + Modal Operations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Data Level */}
                <div className="bg-white rounded-xl border-2 border-emerald-200 overflow-hidden flex flex-col">
                  <div className="bg-gradient-to-l from-emerald-800 to-teal-800 text-white px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-amber-300" />
                      <h4 className="text-xs font-black">أولاً: صلاحيات العمليات والبيانات</h4>
                    </div>
                    <span className="bg-white/20 text-white text-[11px] font-black px-2 py-0.5 rounded">
                      {dataPermissions.filter((p) => currentRolePerms.includes(p.id)).length} / {dataPermissions.length}
                    </span>
                  </div>
                  <div className="p-3 space-y-1.5 flex-1">
                    {dataPermissions.map((perm) => {
                      const checked = currentRolePerms.includes(perm.id);
                      return (
                        <label
                          key={perm.id}
                          onClick={() => togglePermission(perm.id)}
                          className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer select-none ${
                            checked
                              ? 'bg-emerald-50 border-emerald-400'
                              : 'bg-slate-50 border-slate-200 opacity-75 hover:opacity-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {}}
                            className="mt-0.5 w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-black text-xs text-slate-900">{perm.label}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                {perm.category}
                              </span>
                            </div>
                            <p className="text-[10.5px] font-semibold text-slate-600">{perm.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Level */}
                <div className="bg-white rounded-xl border-2 border-indigo-200 overflow-hidden flex flex-col">
                  <div className="bg-gradient-to-l from-indigo-900 to-purple-900 text-white px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-300" />
                      <h4 className="text-xs font-black">ثانياً: صلاحيات النوافذ والمودالات</h4>
                    </div>
                    <span className="bg-white/20 text-white text-[11px] font-black px-2 py-0.5 rounded">
                      {modalPermissions.filter((p) => currentRolePerms.includes(p.id)).length} / {modalPermissions.length}
                    </span>
                  </div>
                  <div className="p-3 space-y-1.5 flex-1 max-h-[380px] overflow-y-auto">
                    {modalPermissions.map((perm) => {
                      const checked = currentRolePerms.includes(perm.id);
                      return (
                        <label
                          key={perm.id}
                          onClick={() => togglePermission(perm.id)}
                          className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer select-none ${
                            checked
                              ? 'bg-indigo-50 border-indigo-400'
                              : 'bg-slate-50 border-slate-200 opacity-75 hover:opacity-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {}}
                            className="mt-0.5 w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-black text-xs text-slate-900">{perm.label}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                {perm.category}
                              </span>
                            </div>
                            <p className="text-[10.5px] font-semibold text-slate-600">{perm.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-300 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs font-bold text-slate-700">
            يتم حفظ جميع المستخدمين والأدوار الوظيفية ومصفوفة الصلاحيات فوراً في قاعدة البيانات.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-gradient-to-l from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              حفظ كافة الأدوار والصلاحيات
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-black text-xs transition-colors cursor-pointer"
            >
              إغلاق (ESC)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
