import type { StepCode } from "@cikal/contracts";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { seedCompanyIds } from "../../tenancy/index.js";
import {
  documentChecklistItems,
  documentChecklists,
  productRouteSteps,
  productRoutes,
  productRouteVersions,
  products,
  subProducts,
} from "../db/schema.js";

/** ID tetap produk seed `qa`; modul langkah menautkan konfigurasinya ke produk ini, contoh model scoring M09. */
export const seedProductIds = {
  ktaQa: "0192b6ca-0001-7000-8000-000000000001",
} as const;

const ROUTE_ID = "0192b6ca-0002-7000-8000-000000000001";
const ROUTE_VERSION_ID = "0192b6ca-0003-7000-8000-000000000001";
const CHECKLIST_ID = "0192b6ca-0004-7000-8000-000000000001";
const VALID_FROM = "2026-01-01";
const seedId = (group: number, n: number) =>
  `0192b6ca-${String(group).padStart(2, "0")}${String(n).padStart(2, "0")}-7000-8000-000000000001`;

/**
 * Langkah otomatis Dedup sampai Decision dengan adapter simulasi, lalu langkah wajib (RT-03). Langkah lain tidak ada
 * di rute, jadi dicatat NOT_IN_ROUTE.
 */
const ROUTE_STEPS: readonly StepCode[] = [
  "DATA_ENTRY",
  "DEDUP",
  "DUKCAPIL",
  "FRAUD",
  "RAC",
  "SCORING",
  "CREDIT_BUREAU",
  "DECISION",
  "APPROVAL",
  "VALIDITY_CHECK",
  "PRINT_AKAD",
  "DISBURSEMENT",
];

/** Tujuh dokumen wajib contoh AC-47.01 untuk Karyawan Swasta ("001"), Belum Kawin ("001"). */
const DOCUMENTS = ["KTP", "KK", "NPWP", "SLIP_GAJI", "REKENING_KORAN", "SURAT_KETERANGAN_KERJA", "PBB"] as const;

/**
 * Produk KTA siap pakai untuk spec wiring (seed `qa`): nilai AC-20.01, bunga efektif 12% p.a., rute ACTIVE, dan
 * checklist dokumen. Kodenya `KTAQA` karena spec FE-S1-03 membuat produk `KTA` lewat layar di run yang sama.
 */
export async function seedQaProducts(db: NodePgDatabase): Promise<void> {
  const tenantId = seedCompanyIds.company001;
  await db
    .insert(products)
    .values({
      id: seedProductIds.ktaQa,
      tenantId,
      productCode: "KTAQA",
      productName: "KTA QA",
      productCategory: "NON_COLLATERAL",
      interestType: "EFFECTIVE",
      minPlafond: "5000000.00",
      maxPlafond: "300000000.00",
      minTenor: 6,
      maxTenor: 60,
      minAge: 21,
      maxAge: 55,
      dbrMax: "40.0000",
      limitAutoApproval: "10000000.00",
      validFrom: VALID_FROM,
    })
    .onConflictDoNothing();
  await db
    .insert(subProducts)
    .values({
      id: seedId(5, 1),
      tenantId,
      productId: seedProductIds.ktaQa,
      interestRate: "12.0000",
      validFrom: VALID_FROM,
    })
    .onConflictDoNothing();
  await db
    .insert(productRoutes)
    .values({ id: ROUTE_ID, tenantId, productId: seedProductIds.ktaQa })
    .onConflictDoNothing();
  await db
    .insert(productRouteVersions)
    .values({
      id: ROUTE_VERSION_ID,
      tenantId,
      routeId: ROUTE_ID,
      versionNumber: 1,
      status: "ACTIVE",
      effectiveFrom: new Date(`${VALID_FROM}T00:00:00Z`),
    })
    .onConflictDoNothing();
  await db
    .insert(productRouteSteps)
    .values(
      ROUTE_STEPS.map((stepCode, index) => ({
        id: seedId(6, index + 1),
        tenantId,
        versionId: ROUTE_VERSION_ID,
        stepCode,
        isEnabled: true,
      })),
    )
    .onConflictDoNothing();
  await db
    .insert(documentChecklists)
    .values({ id: CHECKLIST_ID, tenantId, productId: seedProductIds.ktaQa, occupation: "001", marital: "001" })
    .onConflictDoNothing();
  await db
    .insert(documentChecklistItems)
    .values(
      DOCUMENTS.map((documentType, index) => ({
        id: seedId(7, index + 1),
        tenantId,
        checklistId: CHECKLIST_ID,
        documentType,
        isMandatory: true,
      })),
    )
    .onConflictDoNothing();
}
