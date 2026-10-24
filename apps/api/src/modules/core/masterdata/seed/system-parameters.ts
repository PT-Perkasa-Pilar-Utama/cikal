import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { seedCompanyIds } from "../../tenancy/index.js";
import { systemParameterDefinitions, systemParameterValues } from "../db/schema.js";

/** ID tetap definisi dan nilai seed parameter sistem. */
export const seedSystemParameterIds = {
  coreMaxTenorMonths: "0192b6a7-0001-7000-8000-000000000001",
  coreMaxTenorMonths001: "0192b6a8-0001-7000-8000-000000000001",
  uploadMaxMb: "0192b6a7-0002-7000-8000-000000000001",
  npwpMinLimit: "0192b6a7-0003-7000-8000-000000000001",
  requireConsentForExternalCheck: "0192b6a7-0004-7000-8000-000000000001",
  selfEmployedOnly: "0192b6a7-0005-7000-8000-000000000001",
  selfEmployedOccupations: "0192b6a7-0006-7000-8000-000000000001",
  employedIncomeSources: "0192b6a7-0007-7000-8000-000000000001",
  dueDateEndOfMonth: "0192b6a7-0008-7000-8000-000000000001",
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
      {
        id: seedSystemParameterIds.npwpMinLimit,
        paramKey: "NPWP_MIN_LIMIT",
        label: "NPWP Minimum Limit",
        description: "NPWP is required when the requested limit is above this amount",
        moduleCode: "CORE",
        category: "BUSINESS",
        valueType: "MONEY",
        minValue: "0",
        defaultValue: "50000000.00",
        scope: "TENANT",
        lockOnSubmit: false,
      },
      {
        id: seedSystemParameterIds.requireConsentForExternalCheck,
        paramKey: "REQUIRE_CONSENT_FOR_EXTERNAL_CHECK",
        label: "Require Consent for External Check",
        description: "Applicant consent is required before third-party checks (IN-12)",
        moduleCode: "CORE",
        category: "SECURITY",
        valueType: "BOOLEAN",
        defaultValue: "false",
        scope: "TENANT",
        lockOnSubmit: true,
      },
      {
        id: seedSystemParameterIds.selfEmployedOnly,
        paramKey: "SELF_EMPLOYED_ONLY",
        label: "Self-Employed Applicants Only",
        description: "The product accepts only applicants with a self-employed occupation, for example KUR",
        moduleCode: "CORE",
        category: "BUSINESS",
        valueType: "BOOLEAN",
        defaultValue: "false",
        scope: "PRODUCT",
        lockOnSubmit: false,
      },
      {
        id: seedSystemParameterIds.selfEmployedOccupations,
        paramKey: "SELF_EMPLOYED_OCCUPATIONS",
        label: "Self-Employed Occupations",
        description: "Occupation general parameter IDs that count as self-employed",
        moduleCode: "CORE",
        category: "BUSINESS",
        valueType: "MULTI_CHOICE",
        defaultValue: '["005"]',
        scope: "TENANT",
        lockOnSubmit: false,
      },
      {
        id: seedSystemParameterIds.employedIncomeSources,
        paramKey: "EMPLOYED_INCOME_SOURCES",
        label: "Employed Income Sources",
        description: "Source of Income general parameter IDs that require the employer data",
        moduleCode: "CORE",
        category: "BUSINESS",
        valueType: "MULTI_CHOICE",
        defaultValue: '["001"]',
        scope: "TENANT",
        lockOnSubmit: false,
      },
      {
        id: seedSystemParameterIds.dueDateEndOfMonth,
        paramKey: "DUE_DATE_END_OF_MONTH",
        label: "Due Date at Month End",
        description: "Installment due date when the day does not exist in that month",
        moduleCode: "CORE",
        category: "BUSINESS",
        valueType: "CHOICE",
        allowedValues: ["LAST_DAY", "NEXT_MONTH_FIRST_DAY"],
        defaultValue: "LAST_DAY",
        scope: "TENANT",
        lockOnSubmit: true,
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
