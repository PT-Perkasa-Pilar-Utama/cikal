import type { MenuCode } from "@cikal/contracts";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { seedCompanyIds } from "../../tenancy/index.js";
import { roleAccess } from "../db/schema.js";
import { tenantProvisioning } from "../db/tenant-provisioning.repository.js";
import { rightFlags, type StandardRoleKey } from "../domain/standard-roles.js";
import { seedMenuId } from "./menus.js";

const pad = (n: number, width: number) => String(n).padStart(width, "0");
const roleId = (n: number) => `0192b6a1-${pad(n, 4)}-7000-8000-${pad(n, 12)}`;

/** ID tetap role seed company 001; dirujuk seed user dan uji lewat `index.ts` identity. */
export const seedRoleIds = {
  maker: roleId(1),
  checker: roleId(2),
  sales: roleId(3),
  superUser: roleId(4),
  adminSistem: roleId(5),
  customerService: roleId(6),
  surveyor: roleId(7),
  verifikator: roleId(8),
  supervisor: roleId(9),
  riskManager: roleId(10),
  approver: roleId(11),
  kepalaCabang: roleId(12),
  adminOperasional: roleId(13),
  auditor: roleId(14),
  complianceOfficer: roleId(15),
  qa: roleId(16),
} as const satisfies Record<StandardRoleKey, string>;

/** ID tetap baris RoleAccess seed: segmen kedua ID role dan segmen terakhir ID menu. */
export function seedRoleAccessId(roleId: string, menuCode: MenuCode): string {
  return `0192b6a3-${roleId.slice(9, 13)}-7000-8000-${seedMenuId(menuCode).slice(-12)}`;
}

/** Role dan hak awal company 001 untuk seed `dev` (role adalah data tenant, jadi tidak ada di `base`). */
export async function seedRoles(db: NodePgDatabase): Promise<void> {
  await tenantProvisioning.insertStandardRoles(db, seedCompanyIds.company001, {
    role: (key) => seedRoleIds[key],
    access: seedRoleAccessId,
  });
}

/**
 * Hak MRTM TRM_ACC_004 untuk seed `qa`: Admin Sistem memegang semua aksi Product, jadi bisa mengajukan sekaligus
 * menyetujui pengajuan orang lain (AC-12.04, AC-12.05). Matriks awal technical-specs 09 §9.5 tidak memberinya.
 */
export async function seedMrtmAccess(db: NodePgDatabase): Promise<void> {
  const roleId = seedRoleIds.adminSistem;
  await db
    .insert(roleAccess)
    .values({
      id: seedRoleAccessId(roleId, "MST-PRODUCT"),
      tenantId: seedCompanyIds.company001,
      roleId,
      menuId: seedMenuId("MST-PRODUCT"),
      ...rightFlags("VCUDA"),
    })
    .onConflictDoNothing();
}
