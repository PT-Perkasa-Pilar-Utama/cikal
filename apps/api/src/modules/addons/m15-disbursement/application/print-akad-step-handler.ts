import type { StepContext, StepResult } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { ApplicationProcess } from "../../../core/application/index.js";
import type { StepHandler } from "../../../core/orchestrator/index.js";

/**
 * StepHandler `PRINT_AKAD` M15 (technical-specs 05 §5.18): tugas antrean `PRINT_AKAD` di cabang pengajuan; akad yang
 * tercetak melanjutkan proses ke langkah berikutnya (AC-77.01).
 */
@Injectable()
export class PrintAkadStepHandler implements StepHandler {
  readonly stepCode = "PRINT_AKAD";
  readonly moduleCode = "M15";

  constructor(private readonly applications: ApplicationProcess) {}

  async execute(tx: Tx, ctx: StepContext): Promise<StepResult> {
    const application = await this.applications.find(tx, ctx.applicationId);
    return {
      type: "WAIT_HUMAN",
      queueCode: "PRINT_AKAD",
      branchId: application?.branchId ?? null,
      summary: "Waiting for akad printing",
    };
  }

  async onHumanTaskClosed(): Promise<StepResult> {
    return { type: "CONTINUE", outcomeCode: "PRINTED", summary: "Akad printed" };
  }
}
