import type { StepRetryResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { AuditTrail } from "../../audit/index.js";
import { PROCESS_AUDIT_MODULE } from "../domain/process-audit.js";
import { stepFailedAgain } from "../domain/process-errors.js";
import { ProcessMonitoring } from "./monitoring.js";

/**
 * Tombol "Retry" (api-specs 13 §13.4). Attempt baru dan audit `STEP_RETRIED` di-commit sebelum ERROR lagi dijawab
 * `422 STEP_FAILED_AGAIN`, sehingga jumlah percobaan tetap bertambah (AC-86.03).
 */
@Injectable()
export class RetryStepUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly monitoring: ProcessMonitoring,
    private readonly audit: AuditTrail,
  ) {}

  async execute(ctx: RequestContext, processInstanceId: string, stepExecutionId: string): Promise<StepRetryResponse> {
    const step = await this.db.withTenantTx(ctx, async (tx) => {
      const retried = await this.monitoring.retry(tx, processInstanceId, stepExecutionId, ctx.userId);
      await this.audit.record(tx, ctx, {
        module: PROCESS_AUDIT_MODULE,
        action: "STEP_RETRIED",
        recordId: retried.step.id,
        description: `${retried.step.stepCode} step of ${retried.process.loanId} retried`,
        newData: { status: retried.step.status, attempt: retried.step.attempt },
      });
      return retried.step;
    });
    if (step.status === "ERROR") throw stepFailedAgain(step);
    return {
      data: {
        stepExecutionId: step.id,
        stepCode: step.stepCode,
        status: step.status,
        attempt: step.attempt,
        outcomeCode: step.outcomeCode,
      },
      message: "Step retried",
    };
  }
}
