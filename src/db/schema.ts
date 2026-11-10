import { pgTable, serial, text, integer, doublePrecision, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table (linked to Firebase Auth UID and App RBAC)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull().default('inspector'), // admin, auditor, inspector
  createdAt: timestamp('created_at').defaultNow(),
});

// Bakeries table
export const bakeries = pgTable('bakeries', {
  id: text('id').primaryKey(),
  bakeryOwnerName: text('bakery_owner_name').notNull(),
  machineNumber: text('machine_number').notNull().unique(),
  village: text('village').notNull(),
  localUnit: text('local_unit').notNull(),

  insuranceQuota: integer('insurance_quota').notNull().default(0),
  actualQuota: integer('actual_quota').notNull().default(0),
  insuranceValue: doublePrecision('insurance_value').notNull().default(0),
  loavesCount: integer('loaves_count').notNull().default(0),

  villagePopulation: integer('village_population').notNull().default(0),
  perCapitaAverage: text('per_capita_average').notNull().default('0'),
  beneficiaries2023: integer('beneficiaries_2023').notNull().default(0),
  avg2023: text('avg_2023').notNull().default('0'),
  beneficiaries2024: integer('beneficiaries_2024').notNull().default(0),
  avg2024: text('avg_2024').notNull().default('0'),
  beneficiaries2025: integer('beneficiaries_2025').notNull().default(0),
  avg2025: text('avg_2025').notNull().default('0'),
  avgDiff: text('avg_diff').notNull().default('0'),

  activityStatus: text('activity_status').notNull().default('يعمل'),
  bakeryCategory: text('bakery_category').notNull().default('مخبز بلدي مدعم'),
  breadType: text('bread_type').notNull().default('ماكينة ميكانيكي'),
  breadTypeCount: integer('bread_type_count').notNull().default(1),
  lineType: text('line_type').notNull().default('ميكانيكي كامل'),
  fuelType: text('fuel_type').notNull().default('سولار'),

  phone: text('phone').notNull().default(''),
  nationalId: text('national_id').notNull().default(''),

  commercialRegDate: text('commercial_reg_date').notNull().default(''),
  bakeryLicenseDate: text('bakery_license_date').notNull().default(''),
  leaseAgreementDate: text('lease_agreement_date').notNull().default(''),
  taxCardDate: text('tax_card_date').notNull().default(''),

  activityLog: jsonb('activity_log').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Debts table
export const debts = pgTable('debts', {
  id: text('id').primaryKey(),
  bakeryId: text('bakery_id').notNull().references(() => bakeries.id, { onDelete: 'cascade' }),
  bakeryOwnerName: text('bakery_owner_name').notNull(),
  machineNumber: text('machine_number').notNull(),
  village: text('village').notNull(),
  localUnit: text('local_unit').notNull(),

  violationDate: text('violation_date').notNull().default(''),
  issuingEntity: text('issuing_entity').notNull().default('إدارة تموين مركز المحلة الكبرى'),
  violationType: text('violation_type').notNull().default('نقص وزن الرغيف البلدي المدعم'),
  violationAmount: doublePrecision('violation_amount').notNull().default(0),
  oldViolations: doublePrecision('old_violations').notNull().default(0),
  totalViolations: doublePrecision('total_violations').notNull().default(0),

  violationPaymentDate: text('violation_payment_date').notNull().default(''),
  violationReceiptNumber: text('violation_receipt_number').notNull().default(''),
  violationPaymentMethod: text('violation_payment_method').notNull().default('نقدي (كاش)'),
  paidViolationAmount: doublePrecision('paid_violation_amount').notNull().default(0),
  remainingViolations: doublePrecision('remaining_violations').notNull().default(0),

  addedAmount: doublePrecision('added_amount').notNull().default(0),
  addedPaymentDate: text('added_payment_date').notNull().default(''),
  addedReceiptNumber: text('added_receipt_number').notNull().default(''),
  addedPaymentMethod: text('added_payment_method').notNull().default('نقدي (كاش)'),
  paidAddedAmount: doublePrecision('paid_added_amount').notNull().default(0),
  remainingAdded: doublePrecision('remaining_added').notNull().default(0),

  disposalDate: text('disposal_date').notNull().default(''),
  disposalBags: integer('disposal_bags').notNull().default(0),
  disposalBagPrice: doublePrecision('disposal_bag_price').notNull().default(850),
  disposalMultiplier: integer('disposal_multiplier').notNull().default(1),
  disposalValue: doublePrecision('disposal_value').notNull().default(0),

  disposalPaymentDate: text('disposal_payment_date').notNull().default(''),
  disposalReceiptNumber: text('disposal_receipt_number').notNull().default(''),
  disposalPaymentMethod: text('disposal_payment_method').notNull().default('نقدي (كاش)'),
  paidDisposalAmount: doublePrecision('paid_disposal_amount').notNull().default(0),
  remainingDisposal: doublePrecision('remaining_disposal').notNull().default(0),

  netRemainingDebt: doublePrecision('net_remaining_debt').notNull().default(0),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Villages Hierarchy table
export const villages = pgTable('villages', {
  id: serial('id').primaryKey(),
  village: text('village').notNull().unique(),
  localUnits: jsonb('local_units').notNull().default([]),
});

// Security & Audit Log table
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userEmail: text('user_email').notNull(),
  action: text('action').notNull(),
  details: text('details').notNull(),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const bakeriesRelations = relations(bakeries, ({ many }) => ({
  debts: many(debts),
}));

export const debtsRelations = relations(debts, ({ one }) => ({
  bakery: one(bakeries, {
    fields: [debts.bakeryId],
    references: [bakeries.id],
  }),
}));
