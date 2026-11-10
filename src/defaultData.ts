import { Bakery, DebtRecord, VillageHierarchy, ColumnTitles, SystemConfig, AppUser, DailyBakeryTask, InboxChatMessage } from './types';
import { UPLOADED_OFFICIAL_LOGO } from './uploadedLogo';

export const DEFAULT_OFFICIAL_LOGO = UPLOADED_OFFICIAL_LOGO;

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  governorateTitle: 'محافظة الغربية',
  directorateTitle: 'مديرية التموين والتجارة الداخلية بالغربية',
  administrationTitle: 'إدارة تموين مركز المحلة الكبرى',
  englishSubtitle: 'MINISTRY OF SUPPLY AND INTERNAL TRADE',
  logoBase64: DEFAULT_OFFICIAL_LOGO,
  gmailEmail: 'ELHOSINY2020@gmail.com',
  googleDriveAutoSync: true,
  dailyAlertConfig: {
    enabled: true,
    alertTime: '09:00',
    notifyBrowser: true,
    notifySound: true,
    targetDocs: ['bakeryLicenseDate', 'commercialRegDate', 'leaseAgreementDate', 'taxCardDate'],
    daysThreshold: 0,
    lastAlertDate: ''
  }
};

export const DEFAULT_VILLAGES_HIERARCHY: VillageHierarchy[] = [
  {
    village: 'بشبيش',
    localUnits: ['بشبيش الرئيسية', 'لومانة', 'ميت الليت هاشم', 'محلة القصب', 'منشأة الأمراء']
  },
  {
    village: 'محلة حسن',
    localUnits: ['محلة حسن الرئيسية', 'ميت السراج', 'كفر دمتنو', 'دمتنو', 'طرينة']
  },
  {
    village: 'صفط تراب',
    localUnits: ['صفط تراب الرئيسية', 'شبرا بابل', 'كفر فيالة', 'كفر العبايدة']
  },
  {
    village: 'دمرو',
    localUnits: ['دمرو الرئيسية', 'سنبارة', 'كفر سنبارة', 'شبرا نباص', 'منشأة طنبارة']
  },
  {
    village: 'العامرية',
    localUnits: ['العامرية الرئيسية', 'الدواخلية', 'دنوشر', 'كفر دخميس', 'دخميس']
  },
  {
    village: 'شوني',
    localUnits: ['شوني الرئيسية', 'الراهبين', 'القيصرية', 'كفر حانوت', 'كفر الشيخ سليم']
  },
  {
    village: 'نمرة البصل',
    localUnits: ['نمرة البصل الرئيسية', 'كفر قريطنة', 'القيراطية', 'سندسيس']
  },
  {
    village: 'بلقينا',
    localUnits: ['بلقينا الرئيسية', 'الهياتم', 'بطينة', 'كفر حجازي']
  }
];

export const DEFAULT_ISSUING_ENTITIES: string[] = [
  'إدارة تموين مركز المحلة الكبرى',
  'مباحث تموين الغربية',
  'مديرية التموين والتجارة الداخلية بالغربية',
  'إدارة الرقابة التموينية بالمحلة',
  'قطاع التجارة الداخلية وحماية المستهلك'
];

export const DEFAULT_VIOLATION_TYPES: string[] = [
  'نقص وزن الرغيف البلدي المدعم',
  'إنتاج خبز غير مطابق للمواصفات التموينية',
  'توقف عن الإنتاج بدون إذن مسبق',
  'تصرف في دقيق بلدي مدعم (شكاير)',
  'تجميع بطاقات تموينية ذكية بدون مبرر',
  'عدم وجود لوحة مواعيد التشغيل والإعلان',
  'بيع بأزيد من السعر الجبري والوزن القانوني',
  'عدم نظافة أدوات العجين وخزانات المياه',
  'عدم إعطاء بون صرف الخبز للمواطن'
];

export const PAYMENT_METHODS: string[] = [
  'نقدي (كاش)',
  'فودافون كاش',
  'انستاباي (InstaPay)',
  'سداد إلكتروني عبر الماكينة (POS)',
  'تحويل بنكي / حوالة بريدية',
  'شيك إلكتروني مقبول الدفع'
];

export const DEFAULT_ACTIVITY_STATUSES: string[] = [
  'شغال',
  'متوقف جزئي',
  'متوقف كلي',
  'ملغى',
  'مغلق بقرار تمويني',
  'تجديد ورفع كفاءة'
];

export const DEFAULT_BAKERY_CATEGORIES: string[] = [
  'مخبز بلدي مدعم',
  'مخبز بلدي مطور',
  'مخبز سياحي 72%',
  'مخبز فينو وأفرنجي',
  'مخبز طباقي'
];

export const DEFAULT_BREAD_TYPES: string[] = [
  'بلدي مدعم ماو',
  'بلدي مجر',
  'خبز آلي',
  'طباقي'
];

export const DEFAULT_BREAD_TYPE_COUNTS: string[] = [
  '1',
  '2',
  '3',
  '4',
  '5'
];

export const DEFAULT_LINE_TYPES: string[] = [
  'نصف آلي',
  'آلي كامل',
  'يدوي',
  'ميكانيكي كامل'
];

export const DEFAULT_FUEL_TYPES: string[] = [
  'غاز طبيعي',
  'سولار',
  'مازوت',
  'كهرباء'
];

export const DEFAULT_COLUMN_TITLES: ColumnTitles = {
  index: 'م',
  bakeryOwnerName: 'اسم صاحب المخبز',
  machineNumber: 'رقم الماكينة',
  village: 'القرية',
  localUnit: 'الوحدة التابعة',
  remainingDebt: 'المتبقي على المخبز',
  insuranceValue: 'القيمة التأمينية (ج.م)',
  insuranceQuota: 'الحصة التأمينية (شيكارة)',
  actualQuota: 'الحصة الفعلية (شيكارة)',
  loavesCount: 'الأرغفة اليومية',
  perCapitaAverage: 'متوسط نصيب الفرد للمخبز',
  villagePopulation: 'سكان القرية',
  beneficiaries2023: 'مستفيد عام 2023',
  beneficiaries2024: 'مستفيدين عام 2024',
  beneficiaries2025: 'مستفيدين عام 2025',
  avg2023: 'متوسط عام 2023',
  avg2024: 'متوسط عام 2024',
  avg2025: 'متوسط عام 2025',
  avgDiff: 'الفرق التراكمي',
  activityStatus: 'نشاط المخبز',
  bakeryCategory: 'نوع المخابز',
  breadType: 'نوع الخبز',
  flourBagPrice: 'سعر الشيكارة',
  breadTypeCount: 'عدد نوع الخبز',
  lineType: 'نوع خط الإنتاج',
  fuelType: 'نوع الوقود',
  phone: 'رقم التليفون',
  nationalId: 'الرقم القومي',
  commercialRegDate: 'السجل التجاري',
  bakeryLicenseDate: 'رخصة المخبز',
  leaseAgreementDate: 'عقد الإيجار',
  taxCardDate: 'البطاقة الضريبية',
  actions: 'العمليات والإجراءات'
};

export const INITIAL_BAKERIES: Bakery[] = [
  {
    id: 'b-101',
    bakeryOwnerName: 'أحمد محمود السعيد حسانين',
    machineNumber: '84920145',
    village: 'بشبيش',
    localUnit: 'بشبيش الرئيسية',
    insuranceQuota: 24,
    actualQuota: 24,
    insuranceValue: 18500,
    loavesCount: 24 * 1350, // 32400
    villagePopulation: 38500,
    perCapitaAverage: (32400 / 38500).toFixed(2), // 0.84
    beneficiaries2023: 34200,
    avg2023: (32400 / 34200).toFixed(2),
    beneficiaries2024: 35800,
    avg2024: (32400 / 35800).toFixed(2),
    beneficiaries2025: 37400,
    avg2025: (32400 / 37400).toFixed(2),
    avgDiff: ((32400 / 37400) - (32400 / 34200)).toFixed(2),
    activityStatus: 'شغال',
    bakeryCategory: 'مخبز بلدي مدعم',
    breadType: 'بلدي مدعم ماو',
    flourBagPrice: 950,
    breadTypeCount: 1,
    lineType: 'نصف آلي',
    fuelType: 'غاز طبيعي',
    phone: '01004414038',
    nationalId: '28905141600174',
    commercialRegDate: '2027-04-15',
    bakeryLicenseDate: '2026-11-18', // Expiring in 12 days!
    leaseAgreementDate: '2028-09-01',
    taxCardDate: '2027-01-10',
    notes: 'مخبز منتظم في الإنتاج وجودة رغيف ممتازة'
  },
  {
    id: 'b-102',
    bakeryOwnerName: 'إبراهيم علي عبدالفتاح رضوان',
    machineNumber: '76319842',
    village: 'محلة حسن',
    localUnit: 'محلة حسن الرئيسية',
    insuranceQuota: 18,
    actualQuota: 18,
    insuranceValue: 14200,
    loavesCount: 18 * 1350, // 24300
    villagePopulation: 29400,
    perCapitaAverage: (24300 / 29400).toFixed(2), // 0.83
    beneficiaries2023: 26100,
    avg2023: (24300 / 26100).toFixed(2),
    beneficiaries2024: 27500,
    avg2024: (24300 / 27500).toFixed(2),
    beneficiaries2025: 28900,
    avg2025: (24300 / 28900).toFixed(2),
    avgDiff: ((24300 / 28900) - (24300 / 26100)).toFixed(2),
    activityStatus: 'شغال',
    bakeryCategory: 'مخبز بلدي مدعم',
    breadType: 'بلدي مدعم ماو',
    flourBagPrice: 950,
    breadTypeCount: 1,
    lineType: 'آلي كامل',
    fuelType: 'سولار',
    phone: '01123456789',
    nationalId: '28509211601289',
    commercialRegDate: '2026-11-14', // Expiring in 8 days!
    bakeryLicenseDate: '2027-08-30',
    leaseAgreementDate: '2026-11-09', // Expiring in 3 days!
    taxCardDate: '2027-12-01',
    notes: 'تم فحص المخبز وسحب عينات دورية'
  },
  {
    id: 'b-103',
    bakeryOwnerName: 'محمد رفعت الشناوي البقلي',
    machineNumber: '91542033',
    village: 'صفط تراب',
    localUnit: 'شبرا بابل',
    insuranceQuota: 20,
    actualQuota: 20,
    insuranceValue: 16000,
    loavesCount: 20 * 1350, // 27000
    villagePopulation: 31200,
    perCapitaAverage: (27000 / 31200).toFixed(2), // 0.87
    beneficiaries2023: 28000,
    avg2023: (27000 / 28000).toFixed(2),
    beneficiaries2024: 29500,
    avg2024: (27000 / 29500).toFixed(2),
    beneficiaries2025: 30800,
    avg2025: (27000 / 30800).toFixed(2),
    avgDiff: ((27000 / 30800) - (27000 / 28000)).toFixed(2),
    activityStatus: 'شغال',
    bakeryCategory: 'مخبز بلدي مدعم',
    breadType: 'بلدي مدعم ماو',
    flourBagPrice: 950,
    breadTypeCount: 1,
    lineType: 'نصف آلي',
    fuelType: 'غاز طبيعي',
    phone: '01234567891',
    nationalId: '29011151602345',
    commercialRegDate: '2028-02-20',
    bakeryLicenseDate: '2027-05-15',
    leaseAgreementDate: '2029-01-01',
    taxCardDate: '2026-11-20', // Expiring in 14 days!
    notes: 'خط إنتاج حديث مطابق للااشتراطات البيئية'
  },
  {
    id: 'b-104',
    bakeryOwnerName: 'سامي عبدالمجيد أبو حمر',
    machineNumber: '62491870',
    village: 'دمرو',
    localUnit: 'دمرو الرئيسية',
    insuranceQuota: 22,
    actualQuota: 22,
    insuranceValue: 17200,
    loavesCount: 22 * 1350, // 29700
    villagePopulation: 33400,
    perCapitaAverage: (29700 / 33400).toFixed(2), // 0.89
    beneficiaries2023: 29800,
    avg2023: (29700 / 29800).toFixed(2),
    beneficiaries2024: 31200,
    avg2024: (29700 / 31200).toFixed(2),
    beneficiaries2025: 32900,
    avg2025: (29700 / 32900).toFixed(2),
    avgDiff: ((29700 / 32900) - (29700 / 29800)).toFixed(2),
    activityStatus: 'شغال',
    bakeryCategory: 'مخبز بلدي مدعم',
    breadType: 'بلدي مجر',
    flourBagPrice: 950,
    breadTypeCount: 1,
    lineType: 'نصف آلي',
    fuelType: 'غاز طبيعي',
    phone: '01512345678',
    nationalId: '28304101600982',
    commercialRegDate: '2027-11-10',
    bakeryLicenseDate: '2028-06-12',
    leaseAgreementDate: '2027-03-15',
    taxCardDate: '2028-08-14',
    notes: 'تغطية مستمرة لحصة القرية والوحدات المجاورة'
  },
  {
    id: 'b-105',
    bakeryOwnerName: 'طارق مسعد الجوهري خضر',
    machineNumber: '88214309',
    village: 'العامرية',
    localUnit: 'الدواخلية',
    insuranceQuota: 16,
    actualQuota: 16,
    insuranceValue: 12500,
    loavesCount: 16 * 1350, // 21600
    villagePopulation: 25800,
    perCapitaAverage: (21600 / 25800).toFixed(2), // 0.84
    beneficiaries2023: 23000,
    avg2023: (21600 / 23000).toFixed(3),
    beneficiaries2024: 24200,
    avg2024: (21600 / 24200).toFixed(3),
    beneficiaries2025: 25100,
    avg2025: (21600 / 25100).toFixed(3),
    avgDiff: ((21600 / 25100) - (21600 / 23000)).toFixed(3),
    activityStatus: 'شغال',
    bakeryCategory: 'مخبز بلدي مدعم',
    breadType: 'بلدي مدعم ماو',
    flourBagPrice: 950,
    breadTypeCount: 1,
    lineType: 'آلي كامل',
    fuelType: 'سولار',
    phone: '01098765432',
    nationalId: '28712051601934',
    commercialRegDate: '2027-10-05',
    bakeryLicenseDate: '2026-11-05', // Expired yesterday!
    leaseAgreementDate: '2028-04-18',
    taxCardDate: '2027-09-22',
    notes: 'رخصة المخبز تحتاج إلى تجديد عاجل'
  }
];

export const INITIAL_DEBTS: DebtRecord[] = [
  {
    id: 'd-201',
    bakeryId: 'b-102',
    bakeryOwnerName: 'إبراهيم علي عبدالفتاح رضوان',
    machineNumber: '76319842',
    village: 'محلة حسن',
    localUnit: 'محلة حسن الرئيسية',
    violationDate: '2026-10-15',
    issuingEntity: 'إدارة تموين مركز المحلة الكبرى',
    violationType: 'نقص وزن الرغيف البلدي المدعم',
    violationAmount: 4200,
    oldViolations: 1000,
    totalViolations: 5200,
    violationPaymentDate: '2026-10-25',
    violationReceiptNumber: 'قسيمة 49210',
    violationPaymentMethod: 'كاش',
    paidViolationAmount: 2200,
    remainingViolations: 3000,
    addedAmount: 1500,
    addedPaymentDate: '2026-10-26',
    addedReceiptNumber: 'قسيمة 49211',
    addedPaymentMethod: 'فودافون كاش',
    paidAddedAmount: 500,
    remainingAdded: 1000,
    disposalDate: '2026-10-18',
    disposalBags: 6,
    disposalBagPrice: 950,
    disposalMultiplier: 2,
    disposalValue: 6 * 950 * 2, // 11400
    disposalPaymentDate: '2026-10-28',
    disposalReceiptNumber: 'قسيمة 50114',
    disposalPaymentMethod: 'انستاباي',
    paidDisposalAmount: 5400,
    remainingDisposal: 6000,
    // net = remainingViolations (3000) + remainingDisposal (6000) + remainingAdded (1000) = 10000
    netRemainingDebt: 10000,
    notes: 'تم إخطار صاحب المخبز بإنذار رسمي بسرعة سداد المتبقي'
  },
  {
    id: 'd-202',
    bakeryId: 'b-105',
    bakeryOwnerName: 'طارق مسعد الجوهري خضر',
    machineNumber: '88214309',
    village: 'العامرية',
    localUnit: 'الدواخلية',
    violationDate: '2026-10-02',
    issuingEntity: 'مباحث تموين الغربية',
    violationType: 'إنتاج خبز غير مطابق للمواصفات التموينية',
    violationAmount: 3500,
    oldViolations: 500,
    totalViolations: 4000,
    violationPaymentDate: '2026-10-12',
    violationReceiptNumber: 'قسيمة 48120',
    violationPaymentMethod: 'سداد إلكتروني',
    paidViolationAmount: 4000,
    remainingViolations: 0,
    addedAmount: 0,
    addedPaymentDate: '',
    addedReceiptNumber: '',
    addedPaymentMethod: 'كاش',
    paidAddedAmount: 0,
    remainingAdded: 0,
    disposalDate: '',
    disposalBags: 0,
    disposalBagPrice: 0,
    disposalMultiplier: 1,
    disposalValue: 0,
    disposalPaymentDate: '',
    disposalReceiptNumber: '',
    disposalPaymentMethod: 'كاش',
    paidDisposalAmount: 0,
    remainingDisposal: 0,
    netRemainingDebt: 0,
    notes: 'تم سداد كافة المبالغ المستحقة بالكامل والمخبز خالص المديونية'
  },
  {
    id: 'd-203',
    bakeryId: 'b-101',
    bakeryOwnerName: 'أحمد محمود السعيد حسانين',
    machineNumber: '84920145',
    village: 'بشبيش',
    localUnit: 'بشبيش الرئيسية',
    violationDate: '2026-10-20',
    issuingEntity: 'إدارة تموين مركز المحلة الكبرى',
    violationType: 'تصرف في دقيق بلدي مدعم (شكاير)',
    violationAmount: 12000,
    oldViolations: 4000,
    totalViolations: 16000,
    violationPaymentDate: '',
    violationReceiptNumber: '',
    violationPaymentMethod: 'كاش',
    paidViolationAmount: 0,
    remainingViolations: 16000,
    addedAmount: 0,
    addedPaymentDate: '',
    addedReceiptNumber: '',
    addedPaymentMethod: 'كاش',
    paidAddedAmount: 0,
    remainingAdded: 0,
    disposalDate: '2026-10-20',
    disposalBags: 8,
    disposalBagPrice: 950,
    disposalMultiplier: 2,
    disposalValue: 8 * 950 * 2, // 15200
    disposalPaymentDate: '2026-10-25',
    disposalReceiptNumber: 'قسيمة 51200',
    disposalPaymentMethod: 'كاش',
    paidDisposalAmount: 3200,
    remainingDisposal: 12000,
    // net = 16000 + 12000 = 28000 EGP (> 20,000 EGP!)
    netRemainingDebt: 28000,
    notes: 'مديونية كبرى تتجاوز 20,000 ج.م - مطلوب جدولة دفعات أسبوعية رسمية'
  }
];

export const INITIAL_USERS: AppUser[] = [
  {
    id: 'u-1',
    username: 'admin',
    fullName: 'مدير المنظومة التموينية',
    password: 'admin',
    role: 'admin',
    gmailEmail: 'ELHOSINY2020@gmail.com',
    googleDriveAutoSync: true,
    createdAt: '2026-01-01'
  },
  {
    id: 'u-2',
    username: 'inspector1',
    fullName: 'مفتش أول رقابة تموينية',
    password: '123',
    role: 'inspector',
    gmailEmail: 'ELHOSINY2020@gmail.com',
    googleDriveAutoSync: true,
    createdAt: '2026-02-15'
  },
  {
    id: 'u-3',
    username: 'viewer',
    fullName: 'مشاهد / قارئ فقط (عرض وتصفح بدون تعديلات)',
    password: '123',
    role: 'viewer',
    createdAt: '2026-03-01'
  }
];

export const INITIAL_DAILY_TASKS: DailyBakeryTask[] = [
  {
    id: 'task-1',
    title: 'متابعة تجديد رخصة المخبز المنتهية واستيفاء المستندات',
    description: 'التنبيه على صاحب المخبز بسرعة تقديم شهادة تجديد الرخصة من مجلس المدينة',
    bakeryId: 'b-105',
    bakeryName: 'طارق مسعد الجوهري خضر',
    village: 'العامرية',
    priority: 'high',
    dueDate: '2026-11-12',
    status: 'pending',
    assignedTo: 'مفتش أول رقابة تموينية',
    createdAt: '2026-11-09'
  },
  {
    id: 'task-2',
    title: 'تحصيل الدفعة الأسبوعية المقررة من المديونية الكبرى',
    description: 'استلام إيصال السداد الأسبوعي ومطابقته مع سجل المديونيات',
    bakeryId: 'b-101',
    bakeryName: 'أحمد محمود السعيد حسانين',
    village: 'بشبيش',
    priority: 'high',
    dueDate: '2026-11-14',
    status: 'in_progress',
    assignedTo: 'مدير المنظومة التموينية',
    createdAt: '2026-11-09'
  },
  {
    id: 'task-3',
    title: 'التفتيش الدوري على وزن ومواصفات الرغيف البلدي المدعم',
    description: 'مراجعة الموازين الحساسة ونظافة أدوات العجن ولوحة مواعيد التشغيل',
    bakeryId: 'b-102',
    bakeryName: 'إبراهيم علي عبدالفتاح رضوان',
    village: 'محلة حسن',
    priority: 'medium',
    dueDate: '2026-11-16',
    status: 'pending',
    assignedTo: 'مفتش أول رقابة تموينية',
    createdAt: '2026-11-09'
  },
  {
    id: 'task-4',
    title: 'مراجعة مطابقة الحصة التأمينية والفعلية لشهر نوفمبر',
    description: 'تحديث كشوف الحصص التموينية بالوحدات المحلية التابعة',
    bakeryId: 'b-103',
    bakeryName: 'محمد رفعت الشناوي البقلي',
    village: 'صفط تراب',
    priority: 'low',
    dueDate: '2026-11-20',
    status: 'completed',
    assignedTo: 'مدير المنظومة التموينية',
    createdAt: '2026-11-08'
  }
];

export const INITIAL_INBOX_MESSAGES: InboxChatMessage[] = [
  {
    id: 'msg-1',
    senderId: 'u-1',
    senderName: 'مدير المنظومة التموينية',
    senderRole: 'admin',
    recipientTarget: 'ALL',
    recipientLabel: 'جميع الأطراف والمستخدمين',
    messageType: 'instruction',
    content: 'تعليمات هامة لجميع مفتشي ومراجعي الإدارة: يرجى مراجعة كافة المديونيات التي تتجاوز 20,000 ج.م والتأكد من تحصيل الدفعات الأسبوعية وتجديد التراخيص والعقود المنتهية فوراً.',
    timestamp: '2026-11-09 09:00 ص',
    readBy: ['u-1']
  },
  {
    id: 'msg-2',
    senderId: 'u-2',
    senderName: 'مفتش أول رقابة تموينية',
    senderRole: 'inspector',
    recipientTarget: 'ALL',
    recipientLabel: 'جميع الأطراف والمستخدمين',
    messageType: 'alert',
    content: 'تم المرور الميداني على مخابز قرية بشبيش ومحلة حسن والتنبيه على أصحاب المخابز بسرعة استكمال تجديد السجل التجاري ورخصة التشغيل.',
    relatedBakeryId: 'b-101',
    relatedBakeryName: 'أحمد محمود السعيد حسانين',
    timestamp: '2026-11-09 10:30 ص',
    readBy: ['u-1', 'u-2']
  }
];


