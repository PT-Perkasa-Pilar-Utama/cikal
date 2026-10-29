import type { StepContext, StepResult } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { z } from "zod";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { ApplicationProcess } from "../../../core/application/index.js";
import type { StepHandler } from "../../../core/orchestrator/index.js";

/** Payload penutupan tugas DISBURSEMENT dari `POST /applications/{id}/disbursement/record` (api-specs 25 §25.4). */
export const closedDisbursementSchema = z.object({ reason: z.string().nullable() });

/**
 * StepHandler `DISBURSEMENT` M15 mode MANUAL `CoreBankingPort` (technical-specs 05 §5.18, api-specs 25): tugas
 * antrean `DISBURSEMENT` di cabang pengajuan. Disbursed menyelesaikan pengajuan sebagai DISBURSED (AC-101.01); Failed
 * memindahkannya ke Recontest (AC-101.02). Adapter FAST dan simulasi tidak dibangun di Rilis 1 (grooming v2 N-05).
 */
@Injectable()
export class DisbursementStepHandler implements StepHandler {
  readonly stepCode = "DISBURSEMENT";
  readonly moduleCode = "M15";

  constructor(private readonly applications: ApplicationProcess) {}

  async execute(tx: Tx, ctx: StepContext): Promise<StepResult> {
    const application = await this.applications.find(tx, ctx.applicationId);
    return {
      type: "WAIT_HUMAN",
      queueCode: "DISBURSEMENT",
      branchId: application?.branchId ?? null,
      summary: "Waiting for disbursement result",
    };
  }

  async onHumanTaskClosed(_tx: Tx, _ctx: StepContext, resultCode: string, payload: unknown): Promise<StepResult> {
    const { reason } = closedDisbursementSchema.parse(payload);
    if (resultCode === "DISBURSED") {
      return {
        type: "FINISH",
        outcomeCode: "DISBURSED",
        applicationStatus: "DISBURSED",
        summary: "Disbursement recorded",
      };
    }
    return { type: "RECONTEST", outcomeCode: "FAILED", summary: reason ?? "" };
  }
}
