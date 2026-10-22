import type { MenuCode } from "@cikal/contracts";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { menus } from "../db/schema.js";

/** Kode grup menu sidebar; grup tidak dijaga `@Requires` dan tampil bila ada submenu yang boleh dilihat. */
type MenuGroupCode = "SYS" | "IAM" | "MST" | "APP" | "OPS" | "RPT" | "QA";

interface MenuSeed {
  /** Nomor tetap pembentuk ID; tidak boleh diubah setelah di-merge. */
  n: number;
  code: MenuGroupCode | MenuCode;
  name: string;
  link: string | null;
  icon: string;
  /** Menu dari beberapa modul memakai `CORE`; rute modul tak berlisensi memang tidak didaftarkan. */
  module: string;
  children?: MenuSeed[];
}

const menu = (n: number, code: MenuCode, name: string, link: string, icon: string, module = "CORE"): MenuSeed => ({
  n,
  code,
  name,
  link,
  icon,
  module,
});

/** Pohon menu seed dari api-specs 01 §1.11 (usulan engineering, menunggu konfirmasi BA). */
const MENU_TREE: MenuSeed[] = [
  {
    n: 1,
    code: "SYS",
    name: "System",
    link: null,
    icon: "settings",
    module: "CORE",
    children: [
      menu(2, "SYS-COMPANY", "Company", "/system/companies", "building"),
      menu(3, "SYS-MENU", "Menu", "/system/menus", "list-tree"),
      menu(4, "SYS-LICENSE", "License", "/system/license", "badge-check"),
    ],
  },
  {
    n: 5,
    code: "IAM",
    name: "Access Control",
    link: null,
    icon: "shield",
    module: "CORE",
    children: [
      menu(6, "IAM-USER", "User", "/access/users", "user"),
      menu(7, "IAM-ROLE", "Role", "/access/roles", "users"),
      menu(8, "IAM-ROLE-ACCESS", "Role Access", "/access/role-access", "key"),
      menu(9, "IAM-USER-ACCESS", "User Access", "/access/user-access", "user-cog"),
    ],
  },
  {
    n: 10,
    code: "MST",
    name: "Master Data",
    link: null,
    icon: "database",
    module: "CORE",
    children: [
      menu(11, "MST-ORG", "Organization", "/master/organization", "network"),
      menu(12, "MST-PARAMETER", "Parameter", "/master/parameters", "sliders-horizontal"),
      menu(13, "MST-REGION", "Region Data", "/master/regions", "map"),
      menu(14, "MST-PRODUCT", "Product", "/master/products", "package"),
      menu(15, "MST-ROUTE", "Product Route", "/master/routes", "route"),
      menu(16, "MST-CHECKLIST", "Document Checklist", "/master/checklists", "list-checks"),
      menu(17, "MST-APPROVAL", "Approval", "/master/approvals", "stamp"),
      menu(18, "MST-FORMULA", "Formula", "/master/formulas", "sigma"),
      menu(19, "MST-INTEGRATION", "Integration", "/master/integrations", "plug"),
      menu(20, "MST-TEMPLATE", "Document Template", "/master/templates", "file-text"),
      menu(21, "MST-NUMBERING", "Document Number Format", "/master/numbering", "hash"),
      menu(22, "MST-DEDUP", "Dedup Matrix", "/master/dedup", "copy", "M06"),
      menu(23, "MST-DUKCAPIL", "Dukcapil Rule", "/master/dukcapil", "id-card", "M07"),
      menu(24, "MST-FRAUD", "Fraud Matrix", "/master/fraud", "shield-alert", "M08"),
      menu(25, "MST-SCORING", "Scoring Model", "/master/scoring", "gauge", "M09"),
      menu(26, "MST-CREDIT-BUREAU", "Credit Bureau Mapping", "/master/credit-bureau", "landmark", "M10"),
      menu(27, "MST-DECISION", "Decision Matrix", "/master/decision", "git-branch", "M11"),
    ],
  },
  {
    n: 28,
    code: "APP",
    name: "Application",
    link: null,
    icon: "file-stack",
    module: "CORE",
    children: [
      menu(29, "APP-ENTRY", "Data Entry", "/applications/new", "file-plus"),
      menu(30, "APP-INQUIRY", "Application Inquiry", "/applications", "search"),
      menu(31, "APP-SIMULATION", "Installment Simulation", "/applications/simulation", "calculator"),
    ],
  },
  {
    n: 32,
    code: "OPS",
    name: "Operations",
    link: null,
    icon: "briefcase",
    module: "CORE",
    children: [
      menu(33, "OPS-PRESCREEN", "Prescreen", "/operations/prescreen", "scan-search"),
      menu(34, "OPS-PRESCREEN-L2", "Prescreen L2", "/operations/prescreen-l2", "scan-eye"),
      menu(35, "OPS-VERIFICATION", "Verification", "/operations/verification", "clipboard-check"),
      menu(36, "OPS-CREDIT-REPORT", "Credit Report Upload", "/operations/credit-report", "upload", "M10"),
      menu(37, "OPS-RECONTEST", "Recontest", "/operations/recontest", "rotate-ccw", "M11"),
      menu(38, "OPS-APPROVAL", "Approval", "/operations/approval", "check-check"),
      menu(39, "OPS-VALIDITY", "Validity Check", "/operations/validity", "file-check", "M15"),
      menu(40, "OPS-PRINT-AKAD", "Print Akad", "/operations/print-akad", "printer", "M15"),
      menu(41, "OPS-DISBURSEMENT", "Record Disbursement", "/operations/disbursement", "banknote", "M15"),
      menu(42, "OPS-MONITORING", "Process Monitoring", "/operations/monitoring", "activity"),
    ],
  },
  {
    n: 43,
    code: "RPT",
    name: "Reports",
    link: null,
    icon: "chart-column",
    module: "CORE",
    children: [
      menu(44, "RPT-DASHBOARD", "Dashboard", "/reports/dashboard", "layout-dashboard"),
      menu(45, "RPT-AUDIT", "Audit Trail", "/reports/audit-trail", "history"),
    ],
  },
  {
    n: 46,
    code: "QA",
    name: "Quality Assurance",
    link: null,
    icon: "flask-conical",
    module: "CORE",
    children: [menu(47, "QA-RESET", "Reset State", "/qa/reset-state", "refresh-ccw")],
  },
];

/** ID tetap menu dari nomornya, agar seed idempoten dan bisa dirujuk seed role access. */
export const menuId = (n: number): string => `0192b6a2-0000-7000-8000-${String(n).padStart(12, "0")}`;

const menuNumbers = new Map(MENU_TREE.flatMap((group) => [group, ...(group.children ?? [])]).map((m) => [m.code, m.n]));

/** ID menu seed dari kodenya; gagal keras bila kode tidak ada di pohon seed. */
export function seedMenuId(code: MenuCode): string {
  const n = menuNumbers.get(code);
  if (n === undefined) throw new Error(`Menu ${code} is not in the menu seed`);
  return menuId(n);
}

/** Menu bawaan aplikasi untuk seed `base` (tabel [instalasi], technical-specs 06 §6.4). */
export async function seedMenus(db: NodePgDatabase): Promise<void> {
  const rows = MENU_TREE.flatMap((group, groupIndex) => [
    { entry: group, index: groupIndex + 1, parentMenuId: null },
    ...(group.children ?? []).map((child, childIndex) => ({
      entry: child,
      index: childIndex + 1,
      parentMenuId: menuId(group.n),
    })),
  ]).map(({ entry, index, parentMenuId }) => ({
    id: menuId(entry.n),
    menuCode: entry.code,
    menuName: entry.name,
    menuIndex: index,
    parentMenuId,
    link: entry.link,
    iconName: entry.icon,
    moduleCode: entry.module,
  }));
  await db.insert(menus).values(rows).onConflictDoNothing();
}
