import type { MenuCode, QueueCode } from "@cikal/contracts";

export interface QueueDefinition {
  /** Menu halaman antrean; hak View dan Update diperiksa pada menu ini. */
  menuCode: MenuCode;
  /** `false`: tugas ditugaskan per user, tanpa "Assign to Me" dan tanpa rilis (TQ-06). */
  selfAssign: boolean;
}

/** Katalog antrean dan menunya (api-specs 14 §14.1). */
export const QUEUE_CATALOG: Record<QueueCode, QueueDefinition> = {
  VERIFICATION: { menuCode: "OPS-VERIFICATION", selfAssign: true },
  CREDIT_REPORT_UPLOAD: { menuCode: "OPS-CREDIT-REPORT", selfAssign: true },
  APPROVAL: { menuCode: "OPS-APPROVAL", selfAssign: false },
  VALIDITY_CHECK: { menuCode: "OPS-VALIDITY", selfAssign: true },
  PRINT_AKAD: { menuCode: "OPS-PRINT-AKAD", selfAssign: true },
  DISBURSEMENT: { menuCode: "OPS-DISBURSEMENT", selfAssign: true },
  PROCESS_ERROR: { menuCode: "OPS-MONITORING", selfAssign: true },
  PRESCREEN_DEDUP: { menuCode: "OPS-PRESCREEN", selfAssign: true },
  PRESCREEN_DUKCAPIL_L1: { menuCode: "OPS-PRESCREEN", selfAssign: true },
  PRESCREEN_FRAUD: { menuCode: "OPS-PRESCREEN", selfAssign: true },
  PRESCREEN_DUKCAPIL_L2: { menuCode: "OPS-PRESCREEN-L2", selfAssign: true },
  RECONTEST: { menuCode: "OPS-RECONTEST", selfAssign: true },
};

/** Label modul pada halaman "Audit Trail" untuk assign dan release (AC-14.01). */
export const TASK_AUDIT_MODULE = "Task Queue";

/** Menu Supervisor untuk melihat dan melepas tugas orang lain di cabangnya (api-specs 14 §14.2, §14.4). */
export const SUPERVISOR_MENU: MenuCode = "OPS-PRESCREEN-L2";
