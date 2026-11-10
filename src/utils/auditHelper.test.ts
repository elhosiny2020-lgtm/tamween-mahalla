import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePerCapitaAverage,
  calculateLoavesCount,
  runComprehensiveAudit,
  addDropdownOption,
  editDropdownOption,
  deleteDropdownOption,
  filterAndSortDailyTasks,
  filterDebtsByAdvancedCriteria,
} from './auditHelper';
import { DailyBakeryTask } from '../types';

test('calculatePerCapitaAverage returns strictly 2 decimal places (not 3)', () => {
  assert.equal(calculatePerCapitaAverage(32400, 38500), '0.84');
  assert.equal(calculatePerCapitaAverage(27000, 30000), '0.90');
  assert.equal(calculatePerCapitaAverage(24300, 29400), '0.83');
  assert.equal(calculatePerCapitaAverage(0, 0), '0.00');
});

test('runComprehensiveAudit passes all mathematical and 2-decimal checks', () => {
  assert.equal(calculateLoavesCount(20), 27000);
  const res = runComprehensiveAudit();
  assert.equal(res.passed, true);
  assert.equal(res.failedChecks, 0);
});

test('dropdown option helpers add, edit, and delete items cleanly', () => {
  const initial = ['نصف آلي', 'آلي كامل', 'يدوي'];
  const added = addDropdownOption(initial, 'ميكانيكي كامل');
  assert.deepEqual(added, ['نصف آلي', 'آلي كامل', 'يدوي', 'ميكانيكي كامل']);

  const edited = editDropdownOption(added, 'يدوي', 'يدوي مطور');
  assert.deepEqual(edited, ['نصف آلي', 'آلي كامل', 'يدوي مطور', 'ميكانيكي كامل']);

  const deleted = deleteDropdownOption(edited, 'نصف آلي');
  assert.deepEqual(deleted, ['آلي كامل', 'يدوي مطور', 'ميكانيكي كامل']);
});

test('filterAndSortDailyTasks prioritizes high > medium > low and uncompleted before completed', () => {
  const tasks: DailyBakeryTask[] = [
    {
      id: 't1',
      title: 'مهمة منخفضة',
      priority: 'low',
      dueDate: '2026-11-10',
      status: 'pending',
      createdAt: '2026-11-09',
    },
    {
      id: 't2',
      title: 'مهمة عالية مكتملة',
      priority: 'high',
      dueDate: '2026-11-10',
      status: 'completed',
      createdAt: '2026-11-09',
    },
    {
      id: 't3',
      title: 'مهمة عالية عاجلة',
      priority: 'high',
      dueDate: '2026-11-12',
      status: 'pending',
      createdAt: '2026-11-09',
    },
    {
      id: 't4',
      title: 'مهمة متوسطة',
      priority: 'medium',
      dueDate: '2026-11-11',
      status: 'in_progress',
      createdAt: '2026-11-09',
    },
  ];

  const sorted = filterAndSortDailyTasks(tasks);
  assert.deepEqual(
    sorted.map((t) => t.id),
    ['t3', 't4', 't1', 't2']
  );

  const highOnly = filterAndSortDailyTasks(tasks, { priorityFilter: 'high' });
  assert.equal(highOnly.length, 2);
});

import { hasPermission, getDefaultRolePermissionsMap } from '../permissions';
import { DEFAULT_COLUMN_TITLES, DEFAULT_SYSTEM_CONFIG } from '../defaultData';
import { AppUser } from '../types';

test('hasPermission honors SystemConfig.rolePermissions overrides per role (inspector, auditor, admin)', () => {
  const inspectorUser: AppUser = {
    id: 'u1',
    username: 'insp1',
    password: '123',
    fullName: 'مفتش تجريبي',
    role: 'inspector',
    createdAt: '2026-01-01',
  };

  // By default, inspector cannot delete bakery
  assert.equal(hasPermission(inspectorUser, 'DELETE_BAKERY', DEFAULT_SYSTEM_CONFIG), false);

  // When SystemConfig.rolePermissions grants DELETE_BAKERY and OPEN_BACKUP_HUB_MODAL to inspector
  const customConfig = {
    ...DEFAULT_SYSTEM_CONFIG,
    rolePermissions: {
      ...getDefaultRolePermissionsMap(),
      inspector: ['DELETE_BAKERY', 'OPEN_BACKUP_HUB_MODAL'],
    },
  };

  assert.equal(hasPermission(inspectorUser, 'DELETE_BAKERY', customConfig), true);
  assert.equal(hasPermission(inspectorUser, 'OPEN_BACKUP_HUB_MODAL', customConfig), true);
  assert.equal(hasPermission(inspectorUser, 'ADD_BAKERY', customConfig), false);
});

test('DEFAULT_COLUMN_TITLES has exact requested names for Quotas, Population, نوع المخابز, and سعر الشيكارة', () => {
  assert.equal(DEFAULT_COLUMN_TITLES.bakeryCategory, 'نوع المخابز');
  assert.equal(DEFAULT_COLUMN_TITLES.flourBagPrice, 'سعر الشيكارة');
  assert.equal(DEFAULT_COLUMN_TITLES.beneficiaries2023, 'مستفيد عام 2023');
  assert.equal(DEFAULT_COLUMN_TITLES.beneficiaries2024, 'مستفيدين عام 2024');
  assert.equal(DEFAULT_COLUMN_TITLES.beneficiaries2025, 'مستفيدين عام 2025');
  assert.equal(DEFAULT_COLUMN_TITLES.avg2023, 'متوسط عام 2023');
  assert.equal(DEFAULT_COLUMN_TITLES.avg2024, 'متوسط عام 2024');
  assert.equal(DEFAULT_COLUMN_TITLES.avg2025, 'متوسط عام 2025');
  assert.equal(DEFAULT_COLUMN_TITLES.avgDiff, 'الفرق التراكمي');
  assert.equal(DEFAULT_COLUMN_TITLES.perCapitaAverage, 'متوسط نصيب الفرد للمخبز');
});

import { mergeStates, AppState } from '../storage';
import {
  INITIAL_BAKERIES,
  INITIAL_DEBTS,
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
  INITIAL_DAILY_TASKS,
  INITIAL_INBOX_MESSAGES,
  INITIAL_USERS,
} from '../defaultData';

test('mergeStates merges JSON files additively without deleting existing bakeries, debts, users, or inboxMessages', () => {
  const baseState: AppState = {
    bakeries: INITIAL_BAKERIES.slice(0, 2),
    debts: INITIAL_DEBTS.slice(0, 1),
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
    inboxMessages: INITIAL_INBOX_MESSAGES.slice(0, 1),
    columnTitles: DEFAULT_COLUMN_TITLES,
    systemConfig: DEFAULT_SYSTEM_CONFIG,
    users: INITIAL_USERS,
    currentUser: null,
  };

  const incomingJson: Partial<AppState> = {
    bakeries: [INITIAL_BAKERIES[2]],
    debts: [INITIAL_DEBTS[1]],
    inboxMessages: [INITIAL_INBOX_MESSAGES[1]],
    users: [
      {
        id: 'u-gmail-99',
        username: 'gmail_inspector',
        fullName: 'مفتش جيميل',
        password: '123',
        role: 'inspector',
        gmailEmail: 'test@gmail.com',
        googleDriveAutoSync: true,
      },
    ],
  };

  const merged = mergeStates(baseState, incomingJson);
  assert.equal(merged.bakeries.length, 3);
  assert.equal(merged.debts.length, 2);
  assert.equal(merged.inboxMessages?.length, 2);
  assert.equal(merged.users.some((u: AppUser) => u.username === 'gmail_inspector'), true);
  assert.equal(merged.users.some((u: AppUser) => u.username === 'admin'), true);
});

test('filterDebtsByAdvancedCriteria filters debts accurately by date range (من - إلى) and violationType', () => {
  // INITIAL_DEBTS has:
  // d-201: violationDate '2026-10-15', violationType 'نقص وزن الرغيف البلدي المدعم'
  // d-202: violationDate '2026-10-02', violationType 'إنتاج خبز غير مطابق للمواصفات التموينية'
  // d-203: violationDate '2026-10-20', violationType 'تصرف في دقيق بلدي مدعم (شكاير)'

  // 1. Filter by date range: 2026-10-10 to 2026-10-18 -> should match only d-201
  const range1 = filterDebtsByAdvancedCriteria(INITIAL_DEBTS, {
    dateFrom: '2026-10-10',
    dateTo: '2026-10-18',
  });
  assert.equal(range1.length, 1);
  assert.equal(range1[0].id, 'd-201');

  // 2. Filter by dateFrom only: >= 2026-10-15 -> should match d-201 and d-203
  const range2 = filterDebtsByAdvancedCriteria(INITIAL_DEBTS, {
    dateFrom: '2026-10-15',
  });
  assert.deepEqual(
    range2.map((d) => d.id),
    ['d-201', 'd-203']
  );

  // 3. Filter by combined date range AND violationType
  const combined = filterDebtsByAdvancedCriteria(INITIAL_DEBTS, {
    dateFrom: '2026-10-01',
    dateTo: '2026-10-31',
    violationType: 'تصرف في دقيق بلدي مدعم (شكاير)',
  });
  assert.equal(combined.length, 1);
  assert.equal(combined[0].id, 'd-203');

  // 4. Filter outside date range -> 0 results
  const emptyRange = filterDebtsByAdvancedCriteria(INITIAL_DEBTS, {
    dateFrom: '2025-01-01',
    dateTo: '2025-12-31',
  });
  assert.equal(emptyRange.length, 0);
});


