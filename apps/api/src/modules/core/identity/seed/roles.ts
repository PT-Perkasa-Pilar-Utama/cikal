import type { MenuCode } from "@cikal/contracts";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { seedCompanyIds } from "../../tenancy/index.js";
import { roleAccess, roles } from "../db/schema.js";
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
} as const;
type SeedRole = keyof typeof seedRoleIds;

function roleIdOf(key: string): string {
  const id = Object.entries(seedRoleIds).find(([name]) => name === key)?.[1];
  if (!id) throw new Error(`Role ${key} has no seed ID`);
  return id;
}

/** ID tetap baris RoleAccess seed: segmen kedua ID role dan segmen terakhir ID menu. */
export function seedRoleAccessId(roleId: string, menuCode: MenuCode): string {
  return `0192b6a3-${roleId.slice(9, 13)}-7000-8000-${seedMenuId(menuCode).slice(-12)}`;
}

/** Hak dengan huruf V, C, U, D, A seperti matriks technical-specs 09 §9.5. */
type Rights = "V" | "VA" | "VU" | "VCU" | "VCUD";

const IAM_MENUS: MenuCode[] = ["IAM-USER", "IAM-ROLE", "IAM-ROLE-ACCESS", "IAM-USER-ACCESS"];
const MASTER_MENUS: MenuCode[] = [
  "MST-ORG",
  "MST-PARAMETER",
  "MST-REGION",
  "MST-PRODUCT",
  "MST-ROUTE",
  "MST-CHECKLIST",
  "MST-APPROVAL",
  "MST-FORMULA",
  "MST-INTEGRATION",
  "MST-TEMPLATE",
  "MST-NUMBERING",
  "MST-DEDUP",
  "MST-DUKCAPIL",
  "MST-FRAUD",
  "MST-SCORING",
  "MST-CREDIT-BUREAU",
  "MST-DECISION",
];

const all = (codes: MenuCode[], rights: Rights): [MenuCode, Rights][] => codes.map((code) => [code, rights]);

interface RoleSeed {
  name: string;
  access: [MenuCode, Rights][];
}

/** Matriks role awal api-specs 01 §1.11 dan technical-specs 09 §9.5; semua role melihat Application Inquiry. */
const ROLE_SEEDS: Record<SeedRole, RoleSeed> = {
  superUser: {
    name: "Super User",
    access: [
      ["SYS-COMPANY", "VCUD"],
      ["SYS-MENU", "VCUD"],
      ["SYS-LICENSE", "VCU"],
    ],
  },
  adminSistem: { name: "Admin Sistem", access: all(IAM_MENUS, "VCUD") },
  maker: { name: "Maker", access: [["IAM-ROLE-ACCESS", "VCU"], ...all(MASTER_MENUS, "VCUD")] },
  checker: { name: "Checker", access: [...all(IAM_MENUS, "VA"), ...all(MASTER_MENUS, "VA")] },
  sales: {
    name: "Sales",
    access: [
      ["APP-ENTRY", "VCU"],
      ["APP-SIMULATION", "V"],
    ],
  },
  customerService: { name: "Customer Service", access: [] },
  surveyor: { name: "Surveyor", access: [] },
  verifikator: {
    name: "Verifikator",
    access: [
      ["OPS-PRESCREEN", "VU"],
      ["OPS-VERIFICATION", "VU"],
      ["OPS-CREDIT-REPORT", "VU"],
    ],
  },
  supervisor: { name: "Supervisor", access: [["OPS-PRESCREEN-L2", "VU"]] },
  riskManager: {
    name: "Risk Manager",
    access: [...all(MASTER_MENUS, "V"), ["OPS-RECONTEST", "VU"], ["RPT-DASHBOARD", "V"]],
  },
  approver: { name: "Approver", access: [["OPS-APPROVAL", "VA"]] },
  kepalaCabang: {
    name: "Kepala Cabang",
    access: [
      ["OPS-APPROVAL", "VA"],
      ["RPT-DASHBOARD", "V"],
    ],
  },
  adminOperasional: {
    name: "Admin Operasional",
    access: all(["OPS-VALIDITY", "OPS-PRINT-AKAD", "OPS-DISBURSEMENT", "OPS-MONITORING"], "VU"),
  },
  auditor: {
    name: "Auditor",
    access: [...all(IAM_MENUS, "V"), ...all(MASTER_MENUS, "V"), ["RPT-DASHBOARD", "V"], ["RPT-AUDIT", "V"]],
  },
  complianceOfficer: { name: "Compliance Officer", access: [] },
  qa: { name: "QA", access: [["QA-RESET", "VU"]] },
};

/** Role dan hak awal company 001 untuk seed `dev` (role adalah data tenant, jadi tidak ada di `base`). */
export async function seedRoles(db: NodePgDatabase): Promise<void> {
  const tenantId = seedCompanyIds.company001;
  const entries = Object.entries(ROLE_SEEDS).map(([key, seed]) => ({ ...seed, id: roleIdOf(key) }));
  await db
    .insert(roles)
    .values(entries.map(({ id, name }) => ({ id, tenantId, roleName: name })))
    .onConflictDoNothing();
  const rows = entries.flatMap(({ id, access }) =>
    [["APP-INQUIRY", "V"] satisfies [MenuCode, Rights], ...access].map(([code, rights]) => {
      return {
        id: seedRoleAccessId(id, code),
        tenantId,
        roleId: id,
        menuId: seedMenuId(code),
        canView: rights.includes("V"),
        canCreate: rights.includes("C"),
        canUpdate: rights.includes("U"),
        canDelete: rights.includes("D"),
        canApprove: rights.includes("A"),
      };
    }),
  );
  await db.insert(roleAccess).values(rows).onConflictDoNothing();
}
