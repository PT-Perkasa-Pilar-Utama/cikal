import type { Action, MenuCode, QueueCode } from "@cikal/contracts";

export interface QueueDefinition {
  /** Menu halaman antrean; hak View dan hak kerja diperiksa pada menu ini. */
  menuCode: MenuCode;
  /** Hak kerja (Assign to Me, Proceed, Release Me) = aksi operasi penutup antrean, contoh Approve untuk Approval. */
  workAction: Extract<Action, "UPDATE" | "APPROVE">;
  /** `false`: tugas ditugaskan per user, tanpa "Assign to Me" dan tanpa rilis (TQ-06). */
  selfAssign: boolean;
}

/** Katalog antrean dan menunya (api-specs 14 §14.1). */
export const QUEUE_CATALOG: Record<QueueCode, QueueDefinition> = {
  VERIFICATION: { menuCode: "OPS-VERIFICATION", workAction: "UPDATE", selfAssign: true },
  CREDIT_REPORT_UPLOAD: { menuCode: "OPS-CREDIT-REPORT", workAction: "UPDATE", selfAssign: true },
  APPROVAL: { menuCode: "OPS-APPROVAL", workAction: "APPROVE", selfAssign: false },
  VALIDITY_CHECK: { menuCode: "OPS-VALIDITY", workAction: "UPDATE", selfAssign: true },
  PRINT_AKAD: { menuCode: "OPS-PRINT-AKAD", workAction: "UPDATE", selfAssign: true },
  DISBURSEMENT: { menuCode: "OPS-DISBURSEMENT", workAction: "UPDATE", selfAssign: true },
  PROCESS_ERROR: { menuCode: "OPS-MONITORING", workAction: "UPDATE", selfAssign: true },
  PRESCREEN_DEDUP: { menuCode: "OPS-PRESCREEN", workAction: "UPDATE", selfAssign: true },
  PRESCREEN_DUKCAPIL_L1: { menuCode: "OPS-PRESCREEN", workAction: "UPDATE", selfAssign: true },
  PRESCREEN_FRAUD: { menuCode: "OPS-PRESCREEN", workAction: "UPDATE", selfAssign: true },
  PRESCREEN_DUKCAPIL_L2: { menuCode: "OPS-PRESCREEN-L2", workAction: "UPDATE", selfAssign: true },
  RECONTEST: { menuCode: "OPS-RECONTEST", workAction: "UPDATE", selfAssign: true },
};

/** Label modul pada halaman "Audit Trail" untuk assign dan release (AC-14.01). */
export const TASK_AUDIT_MODULE = "Task Queue";

/** Menu Supervisor untuk melihat dan melepas tugas orang lain di cabangnya (api-specs 14 §14.2, §14.4). */
export const SUPERVISOR_MENU: MenuCode = "OPS-PRESCREEN-L2";
