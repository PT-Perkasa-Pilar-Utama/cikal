import { z } from "zod";

export const actionSchema = z.enum(["VIEW", "CREATE", "UPDATE", "DELETE", "APPROVE"]);
export type Action = z.infer<typeof actionSchema>;

/** Kode menu seed (api-specs 01 §1.11). */
export const menuCodes = [
  "SYS-COMPANY",
  "SYS-MENU",
  "SYS-LICENSE",
  "IAM-USER",
  "IAM-ROLE",
  "IAM-ROLE-ACCESS",
  "IAM-USER-ACCESS",
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
  "APP-ENTRY",
  "APP-INQUIRY",
  "APP-SIMULATION",
  "OPS-PRESCREEN",
  "OPS-PRESCREEN-L2",
  "OPS-VERIFICATION",
  "OPS-CREDIT-REPORT",
  "OPS-RECONTEST",
  "OPS-APPROVAL",
  "OPS-VALIDITY",
  "OPS-PRINT-AKAD",
  "OPS-DISBURSEMENT",
  "OPS-MONITORING",
  "RPT-DASHBOARD",
  "RPT-AUDIT",
  "QA-RESET",
] as const;
export const menuCodeSchema = z.enum(menuCodes);
export type MenuCode = z.infer<typeof menuCodeSchema>;
