import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { seedCompanyIds } from "../../tenancy/index.js";
import { systemParameterDefinitions, systemParameterValues } from "../db/schema.js";

/** ID tetap definisi dan nilai seed parameter sistem. */
export const seedSystemParameterIds = {
  coreMaxTenorMonths: "0192b6a7-0001-7000-8000-000000000001",
  coreMaxTenorMonths001: "0192b6a8-0001-7000-8000-000000000001",
  uploadMaxMb: "0192b6a7-0002-7000-8000-000000000001",
} as const;

/** Batas tenor contoh produk KTA 60 bulan (AC-20.01); AC-20.07 menguji nilai 24 secara terpisah. */
const COMPANY_001_CORE_MAX_TENOR_MONTHS = "60";
const SEEDED_FROM = new Date("2026-01-01T00:00:00Z");

/**
 * Definisi parameter yang sudah dipakai kode, dari daftar parameter awal data dictionary. Definisi lain
 * ditambahkan bersama kartu yang membacanya.
 */
export async function seedSystemParameterDefinitions(db: NodePgDatabase): Promise<void> {
  await db
    .insert(systemParameterDefinitions)
    .values([
      {
        id: seedSystemParameterIds.coreMaxTenorMonths,
        paramKey: "CORE_MAX_TENOR_MONTHS",
        label: "Core Banking Maximum Tenor (Months)",
        description: "Maximum tenor in months accepted by the core banking system",
        moduleCode: "M15",
        category: "BUSINESS",
        valueType: "NUMBER",
        minValue: "1",
        maxValue: "360",
        defaultValue: "24",
        scope: "TENANT",
        lockOnSubmit: true,
      },
      {
        id: seedSystemParameterIds.uploadMaxMb,
        paramKey: "UPLOAD_MAX_MB",
        label: "Upload Maximum Size (MB)",
        description: "Maximum size in MB of one uploaded document",
        moduleCode: "CORE",
        category: "SECURITY",
        valueType: "NUMBER",
        minValue: "1",
        maxValue: "20",
        defaultValue: "2",
        scope: "TENANT",
        lockOnSubmit: false,
      },
    ])
    .onConflictDoNothing();
}

/** Nilai company 001 untuk seed `dev` dan `qa`. */
export async function seedSystemParameterValues(db: NodePgDatabase): Promise<void> {
  await db
    .insert(systemParameterValues)
    .values({
      id: seedSystemParameterIds.coreMaxTenorMonths001,
      tenantId: seedCompanyIds.company001,
      definitionId: seedSystemParameterIds.coreMaxTenorMonths,
      value: COMPANY_001_CORE_MAX_TENOR_MONTHS,
      versionNumber: 1,
      status: "ACTIVE",
      effectiveFrom: SEEDED_FROM,
    })
    .onConflictDoNothing();
}
