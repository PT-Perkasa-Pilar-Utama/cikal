import type { MenuCode } from "@cikal/contracts";

/** Hak dengan huruf V, C, U, D, A seperti matriks technical-specs 09 §9.5. */
export type Rights = "V" | "VA" | "VU" | "VCU" | "VCUD" | "VCUDA";

export interface RightFlags {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

export const rightFlags = (rights: Rights): RightFlags => ({
  canView: rights.includes("V"),
  canCreate: rights.includes("C"),
  canUpdate: rights.includes("U"),
  canDelete: rights.includes("D"),
  canApprove: rights.includes("A"),
});

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

export interface StandardRole {
  name: string;
  access: [MenuCode, Rights][];
}

/** Matriks role awal api-specs 01 §1.11 dan technical-specs 09 §9.5; semua role juga melihat Application Inquiry. */
export const STANDARD_ROLES = {
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
} satisfies Record<string, StandardRole>;

export type StandardRoleKey = keyof typeof STANDARD_ROLES;

/** Hak satu role termasuk Application Inquiry View yang dimiliki semua role. */
export function roleRights(key: StandardRoleKey): readonly (readonly [MenuCode, Rights])[] {
  return [["APP-INQUIRY", "V"], ...STANDARD_ROLES[key].access];
}
