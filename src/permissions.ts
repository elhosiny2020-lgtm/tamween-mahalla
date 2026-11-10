import { AppUser, SystemConfig, UserRoleType } from './types';

export type UserAction =
  | 'ADD_BAKERY'
  | 'EDIT_BAKERY'
  | 'DELETE_BAKERY'
  | 'ADD_DEBT'
  | 'EDIT_DEBT'
  | 'DELETE_DEBT'
  | 'MANAGE_USERS'
  | 'MANAGE_SYSTEM_CONFIG'
  | 'MANAGE_COLUMN_TITLES'
  | 'MANAGE_VILLAGES'
  | 'MANAGE_ACTIVITIES'
  | 'VIEW_REPORTS'
  | 'VIEW_CHARTS'
  | 'EXPORT_DATA'
  | 'AUDIT_MATH'
  | 'USE_FINES_CALCULATOR'
  | 'OPEN_BAKERY_MODAL'
  | 'OPEN_DEBT_MODAL'
  | 'OPEN_DAILY_TASKS_MODAL'
  | 'OPEN_MASTER_EDITOR_MODAL'
  | 'OPEN_BACKUP_HUB_MODAL';

export interface PermissionDefinition {
  id: UserAction;
  label: string;
  category: string;
  level: 'modal' | 'data';
  description: string;
}

export const ALL_PERMISSIONS_LIST: PermissionDefinition[] = [
  // صلاحيات على مستوى البيانات والعمليات (Data Level)
  {
    id: 'ADD_BAKERY',
    label: 'إضافة مخبز جديد',
    category: 'سجل المخابز (بيانات)',
    level: 'data',
    description: 'إضافة مخابز جديدة وتحديد حصصها التأمينية والفعلية وسعر الشيكارة',
  },
  {
    id: 'EDIT_BAKERY',
    label: 'تعديل بيانات المخابز',
    category: 'سجل المخابز (بيانات)',
    level: 'data',
    description: 'تعديل بيانات المخبز، الحصص، السكان، وتواريخ التراخيص',
  },
  {
    id: 'DELETE_BAKERY',
    label: 'حذف مخبز نهائياً',
    category: 'سجل المخابز (بيانات)',
    level: 'data',
    description: 'حذف سجل مخبز من قاعدة البيانات الرئيسية',
  },
  {
    id: 'ADD_DEBT',
    label: 'تسجيل مديونية / مخالفة',
    category: 'المديونيات والرقابة (بيانات)',
    level: 'data',
    description: 'إضافة محاضر مخالفات أو فروق تصرف أو مبالغ مضافة',
  },
  {
    id: 'EDIT_DEBT',
    label: 'تعديل وسداد المديونيات',
    category: 'المديونيات والرقابة (بيانات)',
    level: 'data',
    description: 'تسجيل قسائم السداد وتعديل قيود المديونيات القائمة',
  },
  {
    id: 'DELETE_DEBT',
    label: 'حذف قيد مديونية',
    category: 'المديونيات والرقابة (بيانات)',
    level: 'data',
    description: 'حذف قيد مديونية أو مخالفة من سجل المديونيات',
  },
  {
    id: 'EXPORT_DATA',
    label: 'تصدير كشوف Excel / CSV',
    category: 'التقارير والإحصاء (بيانات)',
    level: 'data',
    description: 'تصدير قواعد بيانات المخابز والمديونيات إلى ملفات إكسيل',
  },
  {
    id: 'AUDIT_MATH',
    label: 'تدقيق المعادلات الحسابية',
    category: 'الإدارة العليا (بيانات)',
    level: 'data',
    description: 'تشغيل الفحص الآلي لمعادلات الأرغفة والمديونيات',
  },

  // صلاحيات على مستوى المودالات والنوافذ (Modals Level)
  {
    id: 'OPEN_BAKERY_MODAL',
    label: 'فتح مودال بيانات المخبز',
    category: 'المودالات والنوافذ',
    level: 'modal',
    description: 'فتح نافذة استعراض وإدخال بيانات المخبز التمويني',
  },
  {
    id: 'OPEN_DEBT_MODAL',
    label: 'فتح مودال المديونيات والمخالفات',
    category: 'المودالات والنوافذ',
    level: 'modal',
    description: 'فتح نافذة تسجيل وتعديل قيود المديونيات والتصرفات',
  },
  {
    id: 'USE_FINES_CALCULATOR',
    label: 'فتح مودال حاسبة الغرامات',
    category: 'المودالات والنوافذ',
    level: 'modal',
    description: 'فتح حاسبة الغرامات التموينية وحساب فروق الأرغفة تلقائياً',
  },
  {
    id: 'VIEW_REPORTS',
    label: 'فتح مودال التقارير والطباعة PDF',
    category: 'المودالات والنوافذ',
    level: 'modal',
    description: 'فتح مركز التقارير الرسمي A4، طباعة الكشوف، وتصدير/استيراد PDF',
  },
  {
    id: 'VIEW_CHARTS',
    label: 'فتح لوحة الرسوم البيانية والملخص الإحصائي',
    category: 'المودالات والنوافذ',
    level: 'modal',
    description: 'فتح شاشة الرسوم البيانية ومفتاح الملخص الإحصائي للوحدات المحلية',
  },
  {
    id: 'OPEN_DAILY_TASKS_MODAL',
    label: 'فتح مودال إدارة المهام اليومية',
    category: 'المودالات والنوافذ',
    level: 'modal',
    description: 'فتح نافذة إضافة ومتابعة المهام الإدارية اليومية للمخابز',
  },
  {
    id: 'OPEN_MASTER_EDITOR_MODAL',
    label: 'فتح مودال التعديل داخل المنظومة',
    category: 'المودالات والنوافذ',
    level: 'modal',
    description: 'فتح مركز التحكم الشامل لتعديل كافة القوائم المنسدلة والبيانات',
  },
  {
    id: 'OPEN_BACKUP_HUB_MODAL',
    label: 'فتح مودال الحفظ والاستيراد والنسخ',
    category: 'المودالات والنوافذ',
    level: 'modal',
    description: 'فتح مركز الحفظ والنسخ الاحتياطي واستيراد GitHub و Google Drive',
  },
  {
    id: 'MANAGE_VILLAGES',
    label: 'فتح مودال القرى والوحدات المحلية',
    category: 'إعدادات المنظومة (مودال)',
    level: 'modal',
    description: 'فتح نافذة إضافة وتعديل القرى والوحدات المحلية التابعة للمركز',
  },
  {
    id: 'MANAGE_ACTIVITIES',
    label: 'فتح مودال تعديل القوائم المنسدلة',
    category: 'إعدادات المنظومة (مودال)',
    level: 'modal',
    description: 'فتح نافذة تعديل حالات التشغيل، نوع الخبز، خط الإنتاج، والوقود',
  },
  {
    id: 'MANAGE_COLUMN_TITLES',
    label: 'فتح مودال مسميات رؤوس الأعمدة',
    category: 'إعدادات المنظومة (مودال)',
    level: 'modal',
    description: 'فتح نافذة تخصيص عناوين الأعمدة في الجداول وكشوف الطباعة',
  },
  {
    id: 'MANAGE_SYSTEM_CONFIG',
    label: 'فتح مودال إعدادات النظام والتذكير اليومي',
    category: 'الإدارة العليا (مودال)',
    level: 'modal',
    description: 'فتح نافذة الترويسة الرسمية ومواعيد التنبيه اليومي للتراخيص',
  },
  {
    id: 'MANAGE_USERS',
    label: 'فتح مودال إدارة المستخدمين والصلاحيات',
    category: 'الإدارة العليا (مودال)',
    level: 'modal',
    description: 'فتح نافذة إدارة حسابات المستخدمين وإعدادات الصلاحيات المتقدمة',
  },
];

export function getDefaultPermissionsForRole(role: UserRoleType | string): UserAction[] {
  if (role === 'admin') {
    return ALL_PERMISSIONS_LIST.map((p) => p.id);
  }
  if (role === 'supervisor') {
    return [
      'ADD_BAKERY',
      'EDIT_BAKERY',
      'ADD_DEBT',
      'EDIT_DEBT',
      'USE_FINES_CALCULATOR',
      'VIEW_REPORTS',
      'VIEW_CHARTS',
      'EXPORT_DATA',
      'MANAGE_VILLAGES',
      'MANAGE_ACTIVITIES',
      'MANAGE_COLUMN_TITLES',
      'AUDIT_MATH',
      'OPEN_BAKERY_MODAL',
      'OPEN_DEBT_MODAL',
      'OPEN_DAILY_TASKS_MODAL',
      'OPEN_MASTER_EDITOR_MODAL',
    ];
  }
  if (role === 'auditor') {
    return [
      'ADD_DEBT',
      'EDIT_DEBT',
      'USE_FINES_CALCULATOR',
      'VIEW_REPORTS',
      'VIEW_CHARTS',
      'EXPORT_DATA',
      'AUDIT_MATH',
      'MANAGE_ACTIVITIES',
      'OPEN_DEBT_MODAL',
      'OPEN_DAILY_TASKS_MODAL',
    ];
  }
  if (role === 'inspector') {
    return [
      'ADD_BAKERY',
      'EDIT_BAKERY',
      'ADD_DEBT',
      'USE_FINES_CALCULATOR',
      'VIEW_REPORTS',
      'VIEW_CHARTS',
      'EXPORT_DATA',
      'OPEN_BAKERY_MODAL',
      'OPEN_DEBT_MODAL',
      'OPEN_DAILY_TASKS_MODAL',
    ];
  }
  if (role === 'data_entry') {
    return [
      'ADD_BAKERY',
      'EDIT_BAKERY',
      'ADD_DEBT',
      'EDIT_DEBT',
      'USE_FINES_CALCULATOR',
      'VIEW_REPORTS',
      'VIEW_CHARTS',
      'OPEN_BAKERY_MODAL',
      'OPEN_DEBT_MODAL',
      'OPEN_DAILY_TASKS_MODAL',
    ];
  }
  // viewer
  return ['VIEW_REPORTS', 'VIEW_CHARTS', 'EXPORT_DATA'];
}

export function getDefaultRolePermissionsMap(): Record<UserRoleType, UserAction[]> {
  return {
    admin: getDefaultPermissionsForRole('admin'),
    supervisor: getDefaultPermissionsForRole('supervisor'),
    auditor: getDefaultPermissionsForRole('auditor'),
    inspector: getDefaultPermissionsForRole('inspector'),
    data_entry: getDefaultPermissionsForRole('data_entry'),
    viewer: getDefaultPermissionsForRole('viewer'),
  };
}

export function hasPermission(
  user: AppUser | null | undefined,
  action: UserAction,
  systemConfig?: SystemConfig | null
): boolean {
  if (!user) return false;
  const role = user.role;

  // 1. If customPermissions array is explicitly configured on the specific user, respect it
  if (Array.isArray(user.customPermissions) && user.customPermissions.length > 0) {
    return user.customPermissions.includes(action);
  }

  // 2. If rolePermissions is configured in SystemConfig for this role, enforce it
  if (systemConfig?.rolePermissions && Array.isArray(systemConfig.rolePermissions[role])) {
    return systemConfig.rolePermissions[role].includes(action);
  }

  // 3. Admin always has full 100% control by default
  if (role === 'admin') return true;

  // 4. Otherwise use default permissions for the user's role
  const defaults = getDefaultPermissionsForRole(role);
  return defaults.includes(action);
}

export function getRoleNameArabic(role: UserRoleType | string, systemConfig?: SystemConfig | null): string {
  if (role === 'admin') return 'مدير نظام (تحكم كامل في المنظومة 100%)';
  if (role === 'supervisor') return 'مشرف عام رقابة ومخابز (صلاحيات إشرافية موسعة)';
  if (role === 'auditor') return 'مراجع حسابات ومديونيات وتحصيل';
  if (role === 'inspector') return 'مفتش رقابة وتموين ميداني';
  if (role === 'data_entry') return 'مسئول إدخال وتحديث بيانات';
  if (role === 'viewer') return 'مشاهد / قارئ فقط (تصفح وطباعة بدون تعديلات)';
  const foundCustom = systemConfig?.customRoles?.find((r) => r.id === role || r.title === role);
  if (foundCustom) return foundCustom.fullTitle || foundCustom.title;
  return role || 'مستخدم منظومة';
}
