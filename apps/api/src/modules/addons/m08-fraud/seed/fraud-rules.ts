import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { seedCompanyIds } from "../../../core/tenancy/index.js";
import { fraudMatrix, fraudVelocityRules } from "../db/schema.js";
import type { FraudMatrixRow, VelocityRule } from "../domain/fraud-rules.js";

const matrixRow = (priority: number, fields: Omit<FraudMatrixRow, "id" | "priority">): FraudMatrixRow => ({
  id: `0192b6c7-${String(priority).padStart(4, "0")}-7000-8000-000000000001`,
  priority,
  ...fields,
});

/** Fraud Matrix company 001 sesuai MRTM US-65: IP VPN/Proxy atau beda lokasi Suspicious, selain itu Clean. */
export const seedFraudMatrixRows: readonly FraudMatrixRow[] = [
  matrixRow(1, { nameCondition: "NORMAL", ipCondition: "VPN_PROXY", fraudOutcome: "SUSPICIOUS" }),
  matrixRow(2, { nameCondition: "NORMAL", ipCondition: "LOCATION_MISMATCH", fraudOutcome: "SUSPICIOUS" }),
  matrixRow(3, { nameCondition: "NORMAL", ipCondition: "NORMAL", fraudOutcome: "CLEAN" }),
  matrixRow(4, { nameCondition: "NORMAL", ipCondition: "ANY", fraudOutcome: "CLEAN" }),
];

/** FraudVelocityRule bawaan: nama sama lebih dari 3 per hari = High Fraud Potential + blacklist (grooming v3). */
export const seedVelocityRule: VelocityRule = {
  dimension: "FULL_NAME",
  windowValue: 1,
  windowUnit: "DAY",
  maxCount: 3,
  outcomeWhenExceeded: "HIGH_FRAUD_POTENTIAL",
};

/** Fraud Matrix dan FraudVelocityRule awal company 001 (seed `dev`). */
export async function seedFraudRules(db: NodePgDatabase): Promise<void> {
  const tenantId = seedCompanyIds.company001;
  await db
    .insert(fraudMatrix)
    .values(seedFraudMatrixRows.map((row) => ({ ...row, tenantId })))
    .onConflictDoNothing();
  await db
    .insert(fraudVelocityRules)
    .values({ ...seedVelocityRule, id: "0192b6c8-0001-7000-8000-000000000001", tenantId, isActive: true })
    .onConflictDoNothing();
}
