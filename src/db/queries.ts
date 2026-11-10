import { db } from './index.ts';
import { bakeries, debts, users, villages, auditLogs } from './schema.ts';
import { eq } from 'drizzle-orm';
import type { Bakery, DebtRecord, VillageHierarchy, AppUser } from '../types.ts';

// Get or Create User in PostgreSQL
export async function getOrCreateUserInDb(uid: string, email: string, fullName: string, role: string = 'inspector') {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid));
    if (existing.length > 0) {
      return existing[0];
    }
    const inserted = await db.insert(users).values({
      uid,
      email,
      fullName,
      role,
    }).returning();
    return inserted[0];
  } catch (error) {
    console.error('Failed to sync user in database:', error);
    throw new Error('Database operation failed', { cause: error });
  }
}

// Fetch all bakeries
export async function getAllBakeriesFromDb(): Promise<Bakery[]> {
  try {
    const rows = await db.select().from(bakeries);
    return rows.map((r) => ({
      id: r.id,
      bakeryOwnerName: r.bakeryOwnerName,
      machineNumber: r.machineNumber,
      village: r.village,
      localUnit: r.localUnit,
      insuranceQuota: r.insuranceQuota,
      actualQuota: r.actualQuota,
      insuranceValue: r.insuranceValue,
      loavesCount: r.loavesCount,
      villagePopulation: r.villagePopulation,
      perCapitaAverage: String(r.perCapitaAverage || '0'),
      beneficiaries2023: r.beneficiaries2023,
      avg2023: String(r.avg2023 || '0'),
      beneficiaries2024: r.beneficiaries2024,
      avg2024: String(r.avg2024 || '0'),
      beneficiaries2025: r.beneficiaries2025,
      avg2025: String(r.avg2025 || '0'),
      avgDiff: String(r.avgDiff || '0'),
      activityStatus: r.activityStatus,
      bakeryCategory: r.bakeryCategory,
      breadType: r.breadType,
      breadTypeCount: r.breadTypeCount,
      lineType: r.lineType,
      fuelType: r.fuelType,
      phone: r.phone,
      nationalId: r.nationalId,
      commercialRegDate: r.commercialRegDate,
      bakeryLicenseDate: r.bakeryLicenseDate,
      leaseAgreementDate: r.leaseAgreementDate,
      taxCardDate: r.taxCardDate,
      activityLog: (r.activityLog as Bakery['activityLog']) || [],
    }));
  } catch (error) {
    console.error('Failed to query bakeries from database:', error);
    throw new Error('Database query failed', { cause: error });
  }
}

// Save or Update Bakery
export async function upsertBakeryInDb(b: Bakery) {
  try {
    const values = {
      id: b.id,
      bakeryOwnerName: b.bakeryOwnerName,
      machineNumber: b.machineNumber,
      village: b.village,
      localUnit: b.localUnit,
      insuranceQuota: b.insuranceQuota || 0,
      actualQuota: b.actualQuota || 0,
      insuranceValue: b.insuranceValue || 0,
      loavesCount: b.loavesCount || 0,
      villagePopulation: b.villagePopulation || 0,
      perCapitaAverage: String(b.perCapitaAverage || '0'),
      beneficiaries2023: b.beneficiaries2023 || 0,
      avg2023: String(b.avg2023 || '0'),
      beneficiaries2024: b.beneficiaries2024 || 0,
      avg2024: String(b.avg2024 || '0'),
      beneficiaries2025: b.beneficiaries2025 || 0,
      avg2025: String(b.avg2025 || '0'),
      avgDiff: String(b.avgDiff || '0'),
      activityStatus: b.activityStatus || 'يعمل',
      bakeryCategory: b.bakeryCategory || 'مخبز بلدي مدعم',
      breadType: b.breadType || 'ماكينة ميكانيكي',
      breadTypeCount: b.breadTypeCount || 1,
      lineType: b.lineType || 'ميكانيكي كامل',
      fuelType: b.fuelType || 'سولار',
      phone: b.phone || '',
      nationalId: b.nationalId || '',
      commercialRegDate: b.commercialRegDate || '',
      bakeryLicenseDate: b.bakeryLicenseDate || '',
      leaseAgreementDate: b.leaseAgreementDate || '',
      taxCardDate: b.taxCardDate || '',
      activityLog: b.activityLog || [],
      updatedAt: new Date(),
    };

    await db.insert(bakeries).values(values).onConflictDoUpdate({
      target: bakeries.id,
      set: values,
    });
  } catch (error) {
    console.error('Failed to upsert bakery in database:', error);
    throw new Error('Database upsert failed', { cause: error });
  }
}

// Delete Bakery
export async function deleteBakeryFromDb(id: string) {
  try {
    await db.delete(bakeries).where(eq(bakeries.id, id));
  } catch (error) {
    console.error('Failed to delete bakery from database:', error);
    throw new Error('Database delete failed', { cause: error });
  }
}

// Fetch all debts
export async function getAllDebtsFromDb(): Promise<DebtRecord[]> {
  try {
    const rows = await db.select().from(debts);
    return rows.map((r) => ({
      id: r.id,
      bakeryId: r.bakeryId,
      bakeryOwnerName: r.bakeryOwnerName,
      machineNumber: r.machineNumber,
      village: r.village,
      localUnit: r.localUnit,
      violationDate: r.violationDate,
      issuingEntity: r.issuingEntity,
      violationType: r.violationType,
      violationAmount: r.violationAmount,
      oldViolations: r.oldViolations,
      totalViolations: r.totalViolations,
      violationPaymentDate: r.violationPaymentDate,
      violationReceiptNumber: r.violationReceiptNumber,
      violationPaymentMethod: r.violationPaymentMethod,
      paidViolationAmount: r.paidViolationAmount,
      remainingViolations: r.remainingViolations,
      addedAmount: r.addedAmount,
      addedPaymentDate: r.addedPaymentDate,
      addedReceiptNumber: r.addedReceiptNumber,
      addedPaymentMethod: r.addedPaymentMethod,
      paidAddedAmount: r.paidAddedAmount,
      remainingAdded: r.remainingAdded,
      disposalDate: r.disposalDate,
      disposalBags: r.disposalBags,
      disposalBagPrice: r.disposalBagPrice,
      disposalMultiplier: r.disposalMultiplier,
      disposalValue: r.disposalValue,
      disposalPaymentDate: r.disposalPaymentDate,
      disposalReceiptNumber: r.disposalReceiptNumber,
      disposalPaymentMethod: r.disposalPaymentMethod,
      paidDisposalAmount: r.paidDisposalAmount,
      remainingDisposal: r.remainingDisposal,
      netRemainingDebt: r.netRemainingDebt,
      notes: r.notes,
    }));
  } catch (error) {
    console.error('Failed to query debts from database:', error);
    throw new Error('Database query failed', { cause: error });
  }
}

// Save or Update Debt
export async function upsertDebtInDb(d: DebtRecord) {
  try {
    const values = {
      id: d.id,
      bakeryId: d.bakeryId,
      bakeryOwnerName: d.bakeryOwnerName,
      machineNumber: d.machineNumber,
      village: d.village,
      localUnit: d.localUnit,
      violationDate: d.violationDate || '',
      issuingEntity: d.issuingEntity || '',
      violationType: d.violationType || '',
      violationAmount: d.violationAmount || 0,
      oldViolations: d.oldViolations || 0,
      totalViolations: d.totalViolations || 0,
      violationPaymentDate: d.violationPaymentDate || '',
      violationReceiptNumber: d.violationReceiptNumber || '',
      violationPaymentMethod: d.violationPaymentMethod || 'نقدي (كاش)',
      paidViolationAmount: d.paidViolationAmount || 0,
      remainingViolations: d.remainingViolations || 0,
      addedAmount: d.addedAmount || 0,
      addedPaymentDate: d.addedPaymentDate || '',
      addedReceiptNumber: d.addedReceiptNumber || '',
      addedPaymentMethod: d.addedPaymentMethod || 'نقدي (كاش)',
      paidAddedAmount: d.paidAddedAmount || 0,
      remainingAdded: d.remainingAdded || 0,
      disposalDate: d.disposalDate || '',
      disposalBags: d.disposalBags || 0,
      disposalBagPrice: d.disposalBagPrice || 850,
      disposalMultiplier: d.disposalMultiplier || 1,
      disposalValue: d.disposalValue || 0,
      disposalPaymentDate: d.disposalPaymentDate || '',
      disposalReceiptNumber: d.disposalReceiptNumber || '',
      disposalPaymentMethod: d.disposalPaymentMethod || 'نقدي (كاش)',
      paidDisposalAmount: d.paidDisposalAmount || 0,
      remainingDisposal: d.remainingDisposal || 0,
      netRemainingDebt: d.netRemainingDebt || 0,
      notes: d.notes || '',
      updatedAt: new Date(),
    };

    await db.insert(debts).values(values).onConflictDoUpdate({
      target: debts.id,
      set: values,
    });
  } catch (error) {
    console.error('Failed to upsert debt in database:', error);
    throw new Error('Database upsert failed', { cause: error });
  }
}

// Delete Debt
export async function deleteDebtFromDb(id: string) {
  try {
    await db.delete(debts).where(eq(debts.id, id));
  } catch (error) {
    console.error('Failed to delete debt from database:', error);
    throw new Error('Database delete failed', { cause: error });
  }
}

// Record Security Audit Log
export async function recordAuditLog(userEmail: string, action: string, details: string, ipAddress?: string) {
  try {
    await db.insert(auditLogs).values({
      userEmail,
      action,
      details,
      ipAddress: ipAddress || '127.0.0.1',
    });
  } catch (error) {
    console.error('Failed to record audit log:', error);
  }
}
