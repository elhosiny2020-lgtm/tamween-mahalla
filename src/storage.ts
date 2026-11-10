import {
  Bakery,
  DebtRecord,
  VillageHierarchy,
  ColumnTitles,
  SystemConfig,
  AppUser,
  DailyBakeryTask,
  InboxChatMessage
} from './types';
import {
  DEFAULT_SYSTEM_CONFIG,
  DEFAULT_OFFICIAL_LOGO,
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
  INITIAL_INBOX_MESSAGES
} from './defaultData';

export interface AppState {
  bakeries: Bakery[];
  debts: DebtRecord[];
  villages: VillageHierarchy[];
  issuingEntities: string[];
  violationTypes: string[];
  activityStatuses: string[];
  bakeryCategories?: string[];
  breadTypes?: string[];
  breadTypeCounts?: string[];
  lineTypes?: string[];
  fuelTypes?: string[];
  paymentMethods?: string[];
  dailyTasks?: DailyBakeryTask[];
  inboxMessages?: InboxChatMessage[];
  columnTitles: ColumnTitles;
  systemConfig: SystemConfig;
  users: AppUser[];
  currentUser: AppUser | null;
}

const DB_NAME = 'TamweenGharbiaDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';

const KEYS = {
  INITIALIZED: 'TAMWEEN_INITIALIZED_V3',
  SESSION: 'TAMWEEN_SESSION_V3',
  BAKERIES: 'TAMWEEN_BAKERIES_V3',
  DEBTS: 'TAMWEEN_DEBTS_V3',
  VILLAGES: 'TAMWEEN_VILLAGES_V3',
  ENTITIES: 'TAMWEEN_ENTITIES_V3',
  VIOLATIONS: 'TAMWEEN_VIOLATIONS_V3',
  ACTIVITY_STATUSES: 'TAMWEEN_ACTIVITY_STATUSES_V3',
  BAKERY_CATEGORIES: 'TAMWEEN_BAKERY_CATEGORIES_V3',
  BREAD_TYPES: 'TAMWEEN_BREAD_TYPES_V3',
  BREAD_TYPE_COUNTS: 'TAMWEEN_BREAD_TYPE_COUNTS_V3',
  LINE_TYPES: 'TAMWEEN_LINE_TYPES_V3',
  FUEL_TYPES: 'TAMWEEN_FUEL_TYPES_V3',
  PAYMENT_METHODS: 'TAMWEEN_PAYMENT_METHODS_V3',
  DAILY_TASKS: 'TAMWEEN_DAILY_TASKS_V3',
  INBOX_MESSAGES: 'TAMWEEN_INBOX_MESSAGES_V3',
  COLUMNS: 'TAMWEEN_COLUMNS_V3',
  CONFIG: 'TAMWEEN_CONFIG_V3',
  USERS: 'TAMWEEN_USERS_V3',
  AUTOSAVE_BACKUP: 'TAMWEEN_AUTOSAVE_BACKUP_V3',
  AUTOSAVE_TIMESTAMP: 'TAMWEEN_AUTOSAVE_TIMESTAMP_V3',
};

function normalizeBakeryPerCapita(b: Bakery): Bakery {
  const num = parseFloat(String(b.perCapitaAverage ?? ''));
  const formatted = !isNaN(num)
    ? num.toFixed(2)
    : b.villagePopulation > 0
    ? ((b.loavesCount || 0) / b.villagePopulation).toFixed(2)
    : '0.00';
  return {
    ...b,
    bakeryCategory: b.bakeryCategory || 'مخبز بلدي مدعم',
    flourBagPrice: b.flourBagPrice !== undefined && b.flourBagPrice !== null ? Number(b.flourBagPrice) : 950,
    perCapitaAverage: formatted,
  };
}

// IndexedDB Helper with safety timeout for file:/// and offline environments
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }
      const timer = setTimeout(() => {
        reject(new Error('IndexedDB connection timeout'));
      }, 250);

      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => {
        clearTimeout(timer);
        resolve(request.result);
      };
      request.onerror = () => {
        clearTimeout(timer);
        reject(request.error);
      };
      request.onblocked = () => {
        clearTimeout(timer);
        reject(new Error('IndexedDB blocked'));
      };
    } catch (err) {
      reject(err);
    }
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbSet(key: string, val: unknown): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(val, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // fallback gracefully
  }
}

// Merge two application states (merges bakeries without losing existing ones on original device)
export function mergeStates(base: AppState, incoming: Partial<AppState>): AppState {
  const bakeryMap = new Map<string, Bakery>();
  base.bakeries.forEach((b) => bakeryMap.set(b.id, normalizeBakeryPerCapita(b)));
  (incoming.bakeries || []).forEach((b) => {
    let matchedId: string | null = bakeryMap.has(b.id) ? b.id : null;
    if (!matchedId) {
      for (const [id, ex] of bakeryMap.entries()) {
        if (ex.machineNumber && b.machineNumber && ex.machineNumber === b.machineNumber) {
          matchedId = id;
          break;
        }
      }
    }
    if (matchedId) {
      bakeryMap.set(matchedId, normalizeBakeryPerCapita({ ...bakeryMap.get(matchedId)!, ...b }));
    } else {
      bakeryMap.set(b.id, normalizeBakeryPerCapita(b));
    }
  });

  const debtMap = new Map<string, DebtRecord>();
  base.debts.forEach((d) => debtMap.set(d.id, d));
  (incoming.debts || []).forEach((d) => {
    debtMap.set(d.id, { ...(debtMap.get(d.id) || {}), ...d });
  });

  const villageMap = new Map<string, Set<string>>();
  base.villages.forEach((v) => villageMap.set(v.village, new Set(v.localUnits)));
  (incoming.villages || []).forEach((v) => {
    if (villageMap.has(v.village)) {
      v.localUnits.forEach((u) => villageMap.get(v.village)!.add(u));
    } else {
      villageMap.set(v.village, new Set(v.localUnits));
    }
  });
  const mergedVillages: VillageHierarchy[] = Array.from(villageMap.entries()).map(([village, units]) => ({
    village,
    localUnits: Array.from(units),
  }));

  const userMap = new Map<string, AppUser>();
  base.users.forEach((u) => userMap.set(u.id, u));
  (incoming.users || []).forEach((u) => {
    const existingByUsername = Array.from(userMap.values()).find(
      (ex) => ex.username.toLowerCase() === u.username.toLowerCase()
    );
    if (existingByUsername) {
      userMap.set(existingByUsername.id, { ...existingByUsername, ...u, id: existingByUsername.id });
    } else {
      userMap.set(u.id, u);
    }
  });

  const taskMap = new Map<string, DailyBakeryTask>();
  (base.dailyTasks || INITIAL_DAILY_TASKS).forEach((t) => taskMap.set(t.id, t));
  (incoming.dailyTasks || []).forEach((t) => taskMap.set(t.id, t));

  const msgMap = new Map<string, InboxChatMessage>();
  (base.inboxMessages || INITIAL_INBOX_MESSAGES).forEach((m) => msgMap.set(m.id, m));
  (incoming.inboxMessages || []).forEach((m) => msgMap.set(m.id, m));

  return {
    ...base,
    bakeries: Array.from(bakeryMap.values()),
    debts: Array.from(debtMap.values()),
    villages: mergedVillages.length > 0 ? mergedVillages : base.villages,
    users: Array.from(userMap.values()),
    issuingEntities: Array.from(new Set([...base.issuingEntities, ...(incoming.issuingEntities || [])])),
    violationTypes: Array.from(new Set([...base.violationTypes, ...(incoming.violationTypes || [])])),
    activityStatuses: Array.from(new Set([...base.activityStatuses, ...(incoming.activityStatuses || [])])),
    bakeryCategories: Array.from(new Set([...(base.bakeryCategories || DEFAULT_BAKERY_CATEGORIES), ...(incoming.bakeryCategories || [])])),
    breadTypes: Array.from(new Set([...(base.breadTypes || DEFAULT_BREAD_TYPES), ...(incoming.breadTypes || [])])),
    breadTypeCounts: Array.from(new Set([...(base.breadTypeCounts || DEFAULT_BREAD_TYPE_COUNTS), ...(incoming.breadTypeCounts || [])])),
    lineTypes: Array.from(new Set([...(base.lineTypes || DEFAULT_LINE_TYPES), ...(incoming.lineTypes || [])])),
    fuelTypes: Array.from(new Set([...(base.fuelTypes || DEFAULT_FUEL_TYPES), ...(incoming.fuelTypes || [])])),
    paymentMethods: Array.from(new Set([...(base.paymentMethods || PAYMENT_METHODS), ...(incoming.paymentMethods || [])])),
    dailyTasks: Array.from(taskMap.values()),
    inboxMessages: Array.from(msgMap.values()),
    systemConfig: {
      ...(base.systemConfig || {}),
      ...(incoming.systemConfig || {}),
      logoBase64: DEFAULT_OFFICIAL_LOGO,
    },
    columnTitles: incoming.columnTitles || base.columnTitles,
  };
}

export async function loadInitialState(): Promise<AppState> {
  try {
    // 1. FAST PATH: Check if state is preloaded directly in the standalone HTML file
    interface PreloadedStatePayload extends Partial<AppState> {
      exportTimestamp?: string;
    }
    const preloaded = typeof window !== 'undefined'
      ? (window as unknown as { PRELOADED_TAMWEEN_STATE?: PreloadedStatePayload }).PRELOADED_TAMWEEN_STATE
      : undefined;

    let bakeries: Bakery[] | null = null;
    let debts: DebtRecord[] | null = null;
    let villages: VillageHierarchy[] | null = null;
    let issuingEntities: string[] | null = null;
    let violationTypes: string[] | null = null;
    let activityStatuses: string[] | null = null;
    let bakeryCategories: string[] | null = null;
    let breadTypes: string[] | null = null;
    let breadTypeCounts: string[] | null = null;
    let lineTypes: string[] | null = null;
    let fuelTypes: string[] | null = null;
    let paymentMethods: string[] | null = null;
    let dailyTasks: DailyBakeryTask[] | null = null;
    let inboxMessages: InboxChatMessage[] | null = null;
    let columnTitles: ColumnTitles | null = null;
    let systemConfig: SystemConfig | null = null;
    let users: AppUser[] | null = null;

    // Fast synchronous read from localStorage
    let isInitialized = false;
    try {
      isInitialized = localStorage.getItem(KEYS.INITIALIZED) === 'true';
      if (localStorage.getItem(KEYS.BAKERIES)) {
        bakeries = JSON.parse(localStorage.getItem(KEYS.BAKERIES)!);
      }
      if (localStorage.getItem(KEYS.DEBTS)) {
        debts = JSON.parse(localStorage.getItem(KEYS.DEBTS)!);
      }
      if (localStorage.getItem(KEYS.VILLAGES)) {
        villages = JSON.parse(localStorage.getItem(KEYS.VILLAGES)!);
      }
      if (localStorage.getItem(KEYS.ENTITIES)) {
        issuingEntities = JSON.parse(localStorage.getItem(KEYS.ENTITIES)!);
      }
      if (localStorage.getItem(KEYS.VIOLATIONS)) {
        violationTypes = JSON.parse(localStorage.getItem(KEYS.VIOLATIONS)!);
      }
      if (localStorage.getItem(KEYS.ACTIVITY_STATUSES)) {
        activityStatuses = JSON.parse(localStorage.getItem(KEYS.ACTIVITY_STATUSES)!);
      }
      if (localStorage.getItem(KEYS.BAKERY_CATEGORIES)) {
        bakeryCategories = JSON.parse(localStorage.getItem(KEYS.BAKERY_CATEGORIES)!);
      }
      if (localStorage.getItem(KEYS.BREAD_TYPES)) {
        breadTypes = JSON.parse(localStorage.getItem(KEYS.BREAD_TYPES)!);
      }
      if (localStorage.getItem(KEYS.BREAD_TYPE_COUNTS)) {
        breadTypeCounts = JSON.parse(localStorage.getItem(KEYS.BREAD_TYPE_COUNTS)!);
      }
      if (localStorage.getItem(KEYS.LINE_TYPES)) {
        lineTypes = JSON.parse(localStorage.getItem(KEYS.LINE_TYPES)!);
      }
      if (localStorage.getItem(KEYS.FUEL_TYPES)) {
        fuelTypes = JSON.parse(localStorage.getItem(KEYS.FUEL_TYPES)!);
      }
      if (localStorage.getItem(KEYS.PAYMENT_METHODS)) {
        paymentMethods = JSON.parse(localStorage.getItem(KEYS.PAYMENT_METHODS)!);
      }
      if (localStorage.getItem(KEYS.DAILY_TASKS)) {
        dailyTasks = JSON.parse(localStorage.getItem(KEYS.DAILY_TASKS)!);
      }
      if (localStorage.getItem(KEYS.INBOX_MESSAGES)) {
        inboxMessages = JSON.parse(localStorage.getItem(KEYS.INBOX_MESSAGES)!);
      }
      if (localStorage.getItem(KEYS.COLUMNS)) {
        columnTitles = JSON.parse(localStorage.getItem(KEYS.COLUMNS)!);
      }
      if (localStorage.getItem(KEYS.CONFIG)) {
        systemConfig = JSON.parse(localStorage.getItem(KEYS.CONFIG)!);
      }
      if (localStorage.getItem(KEYS.USERS)) {
        users = JSON.parse(localStorage.getItem(KEYS.USERS)!);
      }
    } catch (lsErr) {
      console.warn('LocalStorage read error or restricted:', lsErr);
    }

    // 2. If standalone preloaded file is opened, merge or adopt it immediately
    if (preloaded && preloaded.bakeries && preloaded.bakeries.length > 0) {
      const lastFileTimestamp = typeof localStorage !== 'undefined' ? localStorage.getItem('TAMWEEN_LAST_FILE_TIMESTAMP') : null;
      const isNewFileImport = Boolean(preloaded.exportTimestamp && preloaded.exportTimestamp !== lastFileTimestamp);

      if (isNewFileImport || !bakeries || bakeries.length === 0) {
        const existingBase: AppState = {
          bakeries: (bakeries ?? INITIAL_BAKERIES).map(normalizeBakeryPerCapita),
          debts: debts ?? INITIAL_DEBTS,
          villages: villages ?? DEFAULT_VILLAGES_HIERARCHY,
          issuingEntities: issuingEntities ?? DEFAULT_ISSUING_ENTITIES,
          violationTypes: violationTypes ?? DEFAULT_VIOLATION_TYPES,
          activityStatuses: activityStatuses ?? DEFAULT_ACTIVITY_STATUSES,
          bakeryCategories: bakeryCategories ?? DEFAULT_BAKERY_CATEGORIES,
          breadTypes: breadTypes ?? DEFAULT_BREAD_TYPES,
          breadTypeCounts: breadTypeCounts ?? DEFAULT_BREAD_TYPE_COUNTS,
          lineTypes: lineTypes ?? DEFAULT_LINE_TYPES,
          fuelTypes: fuelTypes ?? DEFAULT_FUEL_TYPES,
          paymentMethods: paymentMethods ?? PAYMENT_METHODS,
          dailyTasks: dailyTasks ?? INITIAL_DAILY_TASKS,
          inboxMessages: inboxMessages ?? INITIAL_INBOX_MESSAGES,
          columnTitles: columnTitles ?? DEFAULT_COLUMN_TITLES,
          systemConfig: systemConfig ?? DEFAULT_SYSTEM_CONFIG,
          users: users ?? INITIAL_USERS,
          currentUser: null,
        };
        const merged = mergeStates(existingBase, preloaded);
        bakeries = merged.bakeries;
        debts = merged.debts;
        villages = merged.villages;
        issuingEntities = merged.issuingEntities;
        violationTypes = merged.violationTypes;
        activityStatuses = merged.activityStatuses;
        bakeryCategories = merged.bakeryCategories ?? DEFAULT_BAKERY_CATEGORIES;
        breadTypes = merged.breadTypes ?? DEFAULT_BREAD_TYPES;
        breadTypeCounts = merged.breadTypeCounts ?? DEFAULT_BREAD_TYPE_COUNTS;
        lineTypes = merged.lineTypes ?? DEFAULT_LINE_TYPES;
        fuelTypes = merged.fuelTypes ?? DEFAULT_FUEL_TYPES;
        paymentMethods = merged.paymentMethods ?? PAYMENT_METHODS;
        dailyTasks = merged.dailyTasks ?? INITIAL_DAILY_TASKS;
        inboxMessages = merged.inboxMessages ?? INITIAL_INBOX_MESSAGES;
        columnTitles = merged.columnTitles;
        systemConfig = merged.systemConfig;
        users = merged.users;

        try {
          if (preloaded.exportTimestamp) {
            localStorage.setItem('TAMWEEN_LAST_FILE_TIMESTAMP', preloaded.exportTimestamp);
          }
          localStorage.setItem(KEYS.INITIALIZED, 'true');
        } catch {}

        // Non-blocking background persistence
        persistFullState({
          bakeries,
          debts,
          villages,
          issuingEntities,
          violationTypes,
          activityStatuses,
          bakeryCategories,
          breadTypes,
          breadTypeCounts,
          lineTypes,
          fuelTypes,
          paymentMethods,
          dailyTasks,
          inboxMessages,
          columnTitles,
          systemConfig,
          users,
          currentUser: null,
        }).catch(() => {});
      }
    } else if (!isInitialized && (!bakeries || bakeries.length === 0)) {
      // First run default seed
      bakeries = INITIAL_BAKERIES.map(normalizeBakeryPerCapita);
      debts = INITIAL_DEBTS;
      villages = DEFAULT_VILLAGES_HIERARCHY;
      issuingEntities = DEFAULT_ISSUING_ENTITIES;
      violationTypes = DEFAULT_VIOLATION_TYPES;
      activityStatuses = DEFAULT_ACTIVITY_STATUSES;
      bakeryCategories = DEFAULT_BAKERY_CATEGORIES;
      breadTypes = DEFAULT_BREAD_TYPES;
      breadTypeCounts = DEFAULT_BREAD_TYPE_COUNTS;
      lineTypes = DEFAULT_LINE_TYPES;
      fuelTypes = DEFAULT_FUEL_TYPES;
      paymentMethods = PAYMENT_METHODS;
      dailyTasks = INITIAL_DAILY_TASKS;
      inboxMessages = INITIAL_INBOX_MESSAGES;
      columnTitles = DEFAULT_COLUMN_TITLES;
      systemConfig = DEFAULT_SYSTEM_CONFIG;
      users = INITIAL_USERS;

      try {
        localStorage.setItem(KEYS.INITIALIZED, 'true');
      } catch {}

      persistFullState({
        bakeries,
        debts,
        villages,
        issuingEntities,
        violationTypes,
        activityStatuses,
        bakeryCategories,
        breadTypes,
        breadTypeCounts,
        lineTypes,
        fuelTypes,
        paymentMethods,
        dailyTasks,
        inboxMessages,
        columnTitles,
        systemConfig,
        users,
        currentUser: null,
      }).catch(() => {});
    }

    // 3. Fallback defaults if any section is empty
    bakeries = (bakeries ?? INITIAL_BAKERIES).map(normalizeBakeryPerCapita);
    debts = debts ?? INITIAL_DEBTS;
    villages = villages ?? DEFAULT_VILLAGES_HIERARCHY;
    issuingEntities = issuingEntities ?? DEFAULT_ISSUING_ENTITIES;
    violationTypes = violationTypes ?? DEFAULT_VIOLATION_TYPES;
    activityStatuses = activityStatuses ?? DEFAULT_ACTIVITY_STATUSES;
    bakeryCategories = bakeryCategories ?? DEFAULT_BAKERY_CATEGORIES;
    breadTypes = breadTypes ?? DEFAULT_BREAD_TYPES;
    breadTypeCounts = breadTypeCounts ?? DEFAULT_BREAD_TYPE_COUNTS;
    lineTypes = lineTypes ?? DEFAULT_LINE_TYPES;
    fuelTypes = fuelTypes ?? DEFAULT_FUEL_TYPES;
    paymentMethods = paymentMethods ?? PAYMENT_METHODS;
    dailyTasks = dailyTasks ?? INITIAL_DAILY_TASKS;
    inboxMessages = inboxMessages ?? INITIAL_INBOX_MESSAGES;
    columnTitles = columnTitles ?? DEFAULT_COLUMN_TITLES;
    systemConfig = systemConfig ? { ...DEFAULT_SYSTEM_CONFIG, ...systemConfig } : { ...DEFAULT_SYSTEM_CONFIG };
    // Permanently lock and maintain official Egyptian Ministry logo from GitHub in database
    systemConfig.logoBase64 = DEFAULT_OFFICIAL_LOGO;
    users = users ?? INITIAL_USERS;

    // Sanitize and normalize column titles to ensure new required names are applied
    if (columnTitles) {
      columnTitles = {
        ...DEFAULT_COLUMN_TITLES,
        ...columnTitles,
      };
      if (columnTitles.insuranceQuota && columnTitles.insuranceQuota.includes('شوال')) {
        columnTitles.insuranceQuota = columnTitles.insuranceQuota.replace(/شوال/g, 'شيكارة');
      }
      if (columnTitles.actualQuota && columnTitles.actualQuota.includes('شوال')) {
        columnTitles.actualQuota = columnTitles.actualQuota.replace(/شوال/g, 'شيكارة');
      }
      if (!columnTitles.bakeryCategory || columnTitles.bakeryCategory === 'تصنيف المخبز' || columnTitles.bakeryCategory === 'مخبز بلدي مدعم') {
        columnTitles.bakeryCategory = 'نوع المخابز';
      }
      if (!columnTitles.flourBagPrice) {
        columnTitles.flourBagPrice = 'سعر الشيكارة';
      }
      if (!columnTitles.perCapitaAverage || columnTitles.perCapitaAverage === 'متوسط الفرد للمخبز') {
        columnTitles.perCapitaAverage = 'متوسط نصيب الفرد للمخبز';
      }
      if (columnTitles.beneficiaries2023 === 'مستفيدي 2023') {
        columnTitles.beneficiaries2023 = 'مستفيد عام 2023';
      }
      if (columnTitles.beneficiaries2024 === 'مستفيدي 2024') {
        columnTitles.beneficiaries2024 = 'مستفيدين عام 2024';
      }
      if (columnTitles.beneficiaries2025 === 'مستفيدي 2025') {
        columnTitles.beneficiaries2025 = 'مستفيدين عام 2025';
      }
      if (columnTitles.avg2023 === 'متوسط 2023') {
        columnTitles.avg2023 = 'متوسط عام 2023';
      }
      if (columnTitles.avg2024 === 'متوسط 2024') {
        columnTitles.avg2024 = 'متوسط عام 2024';
      }
      if (columnTitles.avg2025 === 'متوسط 2025') {
        columnTitles.avg2025 = 'متوسط عام 2025';
      }
    }

    // Session check
    let currentUser: AppUser | null = null;
    let savedSessionStr: string | null = null;
    try {
      savedSessionStr = sessionStorage.getItem(KEYS.SESSION);
    } catch {}
    const activeUsers = users ?? INITIAL_USERS;
    if (savedSessionStr) {
      try {
        const parsedSession: AppUser = JSON.parse(savedSessionStr);
        const match = activeUsers.find(u => u.id === parsedSession.id || u.username === parsedSession.username);
        if (match) {
          currentUser = match;
        }
      } catch {}
    }

    return {
      bakeries,
      debts,
      villages,
      issuingEntities,
      violationTypes,
      activityStatuses,
      bakeryCategories,
      breadTypes,
      breadTypeCounts,
      lineTypes,
      fuelTypes,
      paymentMethods,
      dailyTasks,
      inboxMessages,
      columnTitles,
      systemConfig,
      users: activeUsers,
      currentUser
    };
  } catch (criticalErr) {
    console.error('Critical fallback in loadInitialState:', criticalErr);
    return {
      bakeries: INITIAL_BAKERIES.map(normalizeBakeryPerCapita),
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
    };
  }
}

// Persist both to IndexedDB and LocalStorage synchronously & asynchronously
export async function persistFullState(state: Omit<AppState, 'currentUser'> & { currentUser?: AppUser | null }): Promise<void> {
  const {
    bakeries,
    debts,
    villages,
    issuingEntities,
    violationTypes,
    activityStatuses,
    bakeryCategories = DEFAULT_BAKERY_CATEGORIES,
    breadTypes = DEFAULT_BREAD_TYPES,
    breadTypeCounts = DEFAULT_BREAD_TYPE_COUNTS,
    lineTypes = DEFAULT_LINE_TYPES,
    fuelTypes = DEFAULT_FUEL_TYPES,
    paymentMethods = PAYMENT_METHODS,
    dailyTasks = INITIAL_DAILY_TASKS,
    inboxMessages = INITIAL_INBOX_MESSAGES,
    columnTitles,
    systemConfig,
    users
  } = state;

  const normalizedBakeries = (bakeries || []).map(normalizeBakeryPerCapita);

  // Guarantee official Egyptian Ministry logo from GitHub is permanently locked in saved config
  const lockedConfig: SystemConfig = {
    ...(systemConfig || DEFAULT_SYSTEM_CONFIG),
    logoBase64: DEFAULT_OFFICIAL_LOGO,
  };

  // LocalStorage
  try {
    localStorage.setItem(KEYS.BAKERIES, JSON.stringify(normalizedBakeries));
    localStorage.setItem(KEYS.DEBTS, JSON.stringify(debts));
    localStorage.setItem(KEYS.VILLAGES, JSON.stringify(villages));
    localStorage.setItem(KEYS.ENTITIES, JSON.stringify(issuingEntities));
    localStorage.setItem(KEYS.VIOLATIONS, JSON.stringify(violationTypes));
    localStorage.setItem(KEYS.ACTIVITY_STATUSES, JSON.stringify(activityStatuses));
    localStorage.setItem(KEYS.BAKERY_CATEGORIES, JSON.stringify(bakeryCategories));
    localStorage.setItem(KEYS.BREAD_TYPES, JSON.stringify(breadTypes));
    localStorage.setItem(KEYS.BREAD_TYPE_COUNTS, JSON.stringify(breadTypeCounts));
    localStorage.setItem(KEYS.LINE_TYPES, JSON.stringify(lineTypes));
    localStorage.setItem(KEYS.FUEL_TYPES, JSON.stringify(fuelTypes));
    localStorage.setItem(KEYS.PAYMENT_METHODS, JSON.stringify(paymentMethods));
    localStorage.setItem(KEYS.DAILY_TASKS, JSON.stringify(dailyTasks));
    localStorage.setItem(KEYS.INBOX_MESSAGES, JSON.stringify(inboxMessages));
    localStorage.setItem(KEYS.COLUMNS, JSON.stringify(columnTitles));
    localStorage.setItem(KEYS.CONFIG, JSON.stringify(lockedConfig));
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  } catch (err) {
    console.warn('LocalStorage quota limit reached, relying primarily on IndexedDB', err);
  }

  // IndexedDB (No 5MB limit, stores large logos and thousands of entries safely)
  await Promise.all([
    idbSet(KEYS.BAKERIES, normalizedBakeries),
    idbSet(KEYS.DEBTS, debts),
    idbSet(KEYS.VILLAGES, villages),
    idbSet(KEYS.ENTITIES, issuingEntities),
    idbSet(KEYS.VIOLATIONS, violationTypes),
    idbSet(KEYS.ACTIVITY_STATUSES, activityStatuses),
    idbSet(KEYS.BAKERY_CATEGORIES, bakeryCategories),
    idbSet(KEYS.BREAD_TYPES, breadTypes),
    idbSet(KEYS.BREAD_TYPE_COUNTS, breadTypeCounts),
    idbSet(KEYS.LINE_TYPES, lineTypes),
    idbSet(KEYS.FUEL_TYPES, fuelTypes),
    idbSet(KEYS.PAYMENT_METHODS, paymentMethods),
    idbSet(KEYS.DAILY_TASKS, dailyTasks),
    idbSet(KEYS.INBOX_MESSAGES, inboxMessages),
    idbSet(KEYS.COLUMNS, columnTitles),
    idbSet(KEYS.CONFIG, lockedConfig),
    idbSet(KEYS.USERS, users)
  ]);

  // Automated snapshot backup for instant merging across sessions & Google Drive Gmail auto-sync
  try {
    const backupSnapshot = {
      timestamp: new Date().toISOString(),
      gmailEmail: lockedConfig.gmailEmail || localStorage.getItem('TAMWEEN_GMAIL_DRIVE_EMAIL') || 'ELHOSINY2020@gmail.com',
      state: {
        bakeries: normalizedBakeries,
        debts,
        villages,
        issuingEntities,
        violationTypes,
        activityStatuses,
        bakeryCategories,
        breadTypes,
        breadTypeCounts,
        lineTypes,
        fuelTypes,
        paymentMethods,
        dailyTasks,
        inboxMessages,
        columnTitles,
        systemConfig: lockedConfig,
        users,
      }
    };
    localStorage.setItem(KEYS.AUTOSAVE_BACKUP, JSON.stringify(backupSnapshot));
    localStorage.setItem(KEYS.AUTOSAVE_TIMESTAMP, backupSnapshot.timestamp);
    await idbSet(KEYS.AUTOSAVE_BACKUP, backupSnapshot);

    // If Google Drive auto-sync is enabled, automatically update the Google Drive JSON snapshot
    const driveAutoSync =
      lockedConfig.googleDriveAutoSync !== false &&
      localStorage.getItem('TAMWEEN_GMAIL_DRIVE_AUTOSYNC') !== 'false';
    if (driveAutoSync) {
      const gmailKey = (
        lockedConfig.gmailEmail ||
        localStorage.getItem('TAMWEEN_GMAIL_DRIVE_EMAIL') ||
        'ELHOSINY2020@gmail.com'
      )
        .trim()
        .toLowerCase();
      const drivePayload = {
        version: '3.0-google-drive-autosync',
        timestamp: backupSnapshot.timestamp,
        gmailEmail: gmailKey,
        destinationType: 'GOOGLE_DRIVE',
        targetPath: localStorage.getItem('TAMWEEN_CUSTOM_BACKUP_PATH') || 'G:\\My Drive\\Tamween_Backups\\',
        bakeriesCount: normalizedBakeries.length,
        debtsCount: debts.length,
        data: backupSnapshot.state,
      };
      localStorage.setItem('TAMWEEN_CUSTOM_BACKUP_PAYLOAD', JSON.stringify(drivePayload));
      localStorage.setItem(`TAMWEEN_GMAIL_DRIVE_SYNC_${gmailKey}`, JSON.stringify(drivePayload));
    }

    // Continuous auto-backup to selected hard disk file
    writeStateToDiskBackupFile(backupSnapshot).catch(() => {});
  } catch {
    // Graceful fallback
  }
}

export function getLatestAutoSaveInfo(): { timestamp: string | null; bakeryCount?: number; debtCount?: number } | null {
  try {
    const raw = localStorage.getItem(KEYS.AUTOSAVE_BACKUP);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        timestamp: parsed.timestamp || localStorage.getItem(KEYS.AUTOSAVE_TIMESTAMP) || null,
        bakeryCount: parsed.state?.bakeries?.length,
        debtCount: parsed.state?.debts?.length,
      };
    }
  } catch {}

  const ts = localStorage.getItem(KEYS.AUTOSAVE_TIMESTAMP);
  if (ts) {
    return { timestamp: ts };
  }
  return null;
}

export async function getLatestAutoSaveBackup(): Promise<{ timestamp: string; state: Partial<AppState> } | null> {
  // 1. Try LocalStorage
  try {
    const raw = localStorage.getItem(KEYS.AUTOSAVE_BACKUP);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.state) return parsed;
    }
  } catch {}

  // 2. Try IndexedDB
  try {
    const idbVal = await idbGet<{ timestamp: string; state: Partial<AppState> }>(KEYS.AUTOSAVE_BACKUP);
    if (idbVal && idbVal.state) {
      return idbVal;
    }
  } catch {}

  // 3. Try Preloaded data in HTML window if available
  if (typeof window !== 'undefined') {
    const preloaded = (window as unknown as { PRELOADED_TAMWEEN_STATE?: Partial<AppState> & { exportTimestamp?: string } }).PRELOADED_TAMWEEN_STATE;
    if (preloaded && (preloaded.bakeries || preloaded.debts)) {
      return {
        timestamp: preloaded.exportTimestamp || new Date().toISOString(),
        state: preloaded,
      };
    }
  }

  return null;
}

export async function mergeAutoSaveOntoCurrent(currentState: AppState): Promise<{ success: boolean; message: string; newState?: AppState }> {
  try {
    const autoSave = await getLatestAutoSaveBackup();
    if (!autoSave || !autoSave.state) {
      return { success: false, message: 'لا توجد نسخة محفوظة تلقائياً سابقة للدمج في ذاكرة هذا الجهاز.' };
    }
    const mergedState = mergeStates(currentState, autoSave.state);
    await persistFullState(mergedState);
    const dateFormatted = autoSave.timestamp ? new Date(autoSave.timestamp).toLocaleString('ar-EG') : 'الحالية';
    return {
      success: true,
      message: `تم بنجاح دمج آخر قاعدة بيانات محفوظة تلقائياً (${dateFormatted}) مع قاعدة بيانات هذا الجهاز! الإجمالي الحالي: (${mergedState.bakeries.length}) مخبز و (${mergedState.debts.length}) مديونية.`,
      newState: mergedState,
    };
  } catch (err: unknown) {
    return { success: false, message: `فشل الدمج: ${(err as Error).message}` };
  }
}

export function saveSessionUser(user: AppUser | null): void {
  try {
    if (user) {
      sessionStorage.setItem(KEYS.SESSION, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(KEYS.SESSION);
      localStorage.removeItem(KEYS.SESSION);
    }
  } catch {}
}

// Global in-memory reference to user-chosen backup file handle on local hard drive
let activeDiskBackupHandle: FileSystemFileHandle | null = null;
let activeDiskBackupFileName: string | null = null;

export function getActiveDiskBackupInfo(): { hasHandle: boolean; fileName: string | null } {
  return {
    hasHandle: activeDiskBackupHandle !== null,
    fileName: activeDiskBackupFileName,
  };
}

/**
 * Lets the user select or create a continuous auto-backup file on their chosen disk (C:, D:, USB).
 * Once selected, every future modification will write directly to this local file!
 */
export async function setupDiskAutoBackup(): Promise<{ success: boolean; fileName?: string; message: string }> {
  if (typeof window === 'undefined' || !('showSaveFilePicker' in window)) {
    return {
      success: false,
      message: 'متصفحك لا يدعم خاصية الكتابة المباشرة على القرص الصلب. سيتم الحفظ التلقائي في ذاكرة الجهاز وتنزيل ملفات النسخ الاحتياطي.',
    };
  }

  try {
    const handle = await (window as unknown as {
      showSaveFilePicker: (opts: {
        suggestedName: string;
        types: Array<{ description: string; accept: Record<string, string[]> }>;
      }) => Promise<FileSystemFileHandle>;
    }).showSaveFilePicker({
      suggestedName: 'نسخة_احتياطية_دائمة_تموين_المحلة.txt',
      types: [
        {
          description: 'ملف نصي للنسخة الاحتياطية الدائمة (*.txt)',
          accept: {
            'text/plain': ['.txt', '.json'],
          },
        },
      ],
    });

    activeDiskBackupHandle = handle;
    activeDiskBackupFileName = handle.name;
    try {
      localStorage.setItem('TAMWEEN_ACTIVE_BACKUP_FILENAME', handle.name);
    } catch {}

    return {
      success: true,
      fileName: handle.name,
      message: `تم تفعيل وتعيين ملف الحفظ التلقائي بنجاح على القرص باسم (${handle.name})! سيتم تحديثه تلقائياً عند أي تعديل.`,
    };
  } catch (err: unknown) {
    if ((err as Error).name === 'AbortError') {
      return { success: false, message: 'تم إلغاء اختيار الملف.' };
    }
    return { success: false, message: `تعذر اختيار الملف: ${(err as Error).message}` };
  }
}

/**
 * Automatically writes the latest backup state to the user's chosen local disk file if configured.
 */
export async function writeStateToDiskBackupFile(state: object): Promise<boolean> {
  if (!activeDiskBackupHandle) return false;

  try {
    const jsonStr = JSON.stringify(state, null, 2);
    const writable = await activeDiskBackupHandle.createWritable();
    await writable.write(jsonStr);
    await writable.close();
    return true;
  } catch (err) {
    console.warn('Could not write to disk backup file handle:', err);
    return false;
  }
}

// Native Partition Picker Save (window.showSaveFilePicker) with Fallback
export async function saveBackupToPartition(data: object): Promise<{ success: boolean; method: string; message: string }> {
  const jsonStr = JSON.stringify(data, null, 2);
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = `نسخة_احتياطية_تموين_مركز_المحلة_${dateStr}.txt`;

  // Check if showSaveFilePicker is available
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as unknown as {
        showSaveFilePicker: (opts: {
          suggestedName: string;
          types: Array<{ description: string; accept: Record<string, string[]> }>;
        }) => Promise<FileSystemFileHandle>;
      }).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'ملف نصي لقاعدة بيانات تموين المحلة الكبرى TXT/JSON',
            accept: {
              'text/plain': ['.txt', '.json'],
            },
          },
        ],
      });

      activeDiskBackupHandle = handle;
      activeDiskBackupFileName = handle.name;

      const writable = await handle.createWritable();
      await writable.write(jsonStr);
      await writable.close();
      return {
        success: true,
        method: 'partition_picker',
        message: `تم حفظ النسخة الاحتياطية بنجاح في المكان المحدد باسم: ${handle.name} وتم تعيينه للحفظ التلقائي المستمر!`
      };
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') {
        return { success: false, method: 'aborted', message: 'تم إلغاء عملية حفظ الملف من قبل المستخدم' };
      }
      console.warn('showSaveFilePicker failed or was blocked, falling back to browser download', err);
    }
  }

  // Standard safe download fallback
  try {
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return {
      success: true,
      method: 'download_fallback',
      message: `تم تنزيل النسخة الاحتياطية بنجاح إلى مجلد التنزيلات بجهازك باسم: ${filename}`
    };
  } catch (err) {
    return {
      success: false,
      method: 'error',
      message: `حدث خطأ أثناء تنزيل الملف: ${(err as Error).message}`
    };
  }
}

// Reset everything to factory defaults
export async function factoryReset(): Promise<void> {
  localStorage.clear();
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    await new Promise((res) => { tx.oncomplete = res; });
  } catch {}
}

export interface MergeResult {
  success: boolean;
  message: string;
  updatedBakeriesCount: number;
  newBakeriesCount: number;
  updatedDebtsCount: number;
  newDebtsCount: number;
  totalBakeries: number;
  totalDebts: number;
  newState?: AppState;
}

/**
 * Discovers and merges ANY saved database (LocalStorage, IndexedDB, preloaded state, or backups)
 * into the original base state: updates existing bakeries by ID/machineNumber and adds missing ones only.
 */
export async function autoDiscoverAndMergeAllDatabases(currentState: AppState): Promise<MergeResult> {
  try {
    const discoveredDatasets: Array<Partial<AppState>> = [];

    // 1. Check auto-save in localStorage
    try {
      const rawAuto = localStorage.getItem(KEYS.AUTOSAVE_BACKUP);
      if (rawAuto) {
        const parsed = JSON.parse(rawAuto);
        if (parsed.state) discoveredDatasets.push(parsed.state);
        else if (parsed.bakeries) discoveredDatasets.push(parsed);
      }
    } catch {}

    // 2. Check IndexedDB auto-save
    try {
      const idbVal = await idbGet<{ timestamp?: string; state?: Partial<AppState> }>(KEYS.AUTOSAVE_BACKUP);
      if (idbVal?.state) discoveredDatasets.push(idbVal.state);
    } catch {}

    // 3. Check window.PRELOADED_TAMWEEN_STATE
    if (typeof window !== 'undefined') {
      const preloaded = (window as unknown as { PRELOADED_TAMWEEN_STATE?: Partial<AppState> }).PRELOADED_TAMWEEN_STATE;
      if (preloaded && (preloaded.bakeries || preloaded.debts)) {
        discoveredDatasets.push(preloaded);
      }
    }

    // 4. Check any backup or snapshot keys in localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('backup') || key.includes('BACKUP') || key.includes('snapshot'))) {
          const val = localStorage.getItem(key);
          if (val && val.startsWith('{')) {
            const parsed = JSON.parse(val);
            if (parsed.data) discoveredDatasets.push(parsed.data);
            else if (parsed.state) discoveredDatasets.push(parsed.state);
            else if (parsed.bakeries) discoveredDatasets.push(parsed);
          }
        }
      }
    } catch {}

    if (discoveredDatasets.length === 0) {
      return {
        success: false,
        message: 'لم يتم العثور على أي قواعد بيانات أو نسخ محفوظة سابقة للدمج.',
        updatedBakeriesCount: 0,
        newBakeriesCount: 0,
        updatedDebtsCount: 0,
        newDebtsCount: 0,
        totalBakeries: currentState.bakeries.length,
        totalDebts: currentState.debts.length,
      };
    }

    // Track baseline for accurate stats reporting
    const prevBakeries = new Map<string, Bakery>();
    currentState.bakeries.forEach((b) => prevBakeries.set(b.id, b));
    const prevDebts = new Map<string, DebtRecord>();
    currentState.debts.forEach((d) => prevDebts.set(d.id, d));

    let mergedState = currentState;
    let updatedBakeriesCount = 0;
    let newBakeriesCount = 0;
    let updatedDebtsCount = 0;
    let newDebtsCount = 0;

    for (const dataset of discoveredDatasets) {
      (dataset.bakeries || []).forEach((b) => {
        let match = prevBakeries.get(b.id);
        if (!match && b.machineNumber) {
          for (const ex of prevBakeries.values()) {
            if (ex.machineNumber === b.machineNumber) {
              match = ex;
              break;
            }
          }
        }
        if (match) {
          updatedBakeriesCount++;
        } else {
          newBakeriesCount++;
          prevBakeries.set(b.id, b);
        }
      });

      (dataset.debts || []).forEach((d) => {
        if (prevDebts.has(d.id)) {
          updatedDebtsCount++;
        } else {
          newDebtsCount++;
          prevDebts.set(d.id, d);
        }
      });

      mergedState = mergeStates(mergedState, dataset);
    }

    // Persist unified state
    await persistFullState(mergedState);

    return {
      success: true,
      message: `تم دمج وتحديث قاعدة البيانات بنجاح! تم تحديث بيانات (${updatedBakeriesCount}) مخبز قائم، وإضافة (${newBakeriesCount}) مخبز جديد غير متوفر سابقاً، وضبط المديونيات. الإجمالي: (${mergedState.bakeries.length}) مخبز و (${mergedState.debts.length}) مديونية.`,
      updatedBakeriesCount,
      newBakeriesCount,
      updatedDebtsCount,
      newDebtsCount,
      totalBakeries: mergedState.bakeries.length,
      totalDebts: mergedState.debts.length,
      newState: mergedState,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: `حدث خطأ أثناء فحص ودمج قواعد البيانات: ${(err as Error).message}`,
      updatedBakeriesCount: 0,
      newBakeriesCount: 0,
      updatedDebtsCount: 0,
      newDebtsCount: 0,
      totalBakeries: currentState.bakeries.length,
      totalDebts: currentState.debts.length,
    };
  }
}
