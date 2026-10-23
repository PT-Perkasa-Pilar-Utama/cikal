import type { ProcessFinishRequest, ProcessFinishResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { AuditTrail } from "../../audit/index.js";
import { PROCESS_AUDIT_MODULE } from "../domain/process-audit.js";
import { ProcessMonitoring } from "./monitoring.js";

/** Tombol "Finish" dengan alasan (api-specs 13 §13.5, AC-86.02). */
@Injectable()
export class FinishProcessUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly monitoring: ProcessMonitoring,
    private readonly audit: AuditTrail,
  ) {}

  execute(ctx: RequestContext, processInstanceId: string, body: ProcessFinishRequest): Promise<ProcessFinishResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const process = await this.monitoring.finish(tx, processInstanceId, body.reason, ctx.userId);
      await this.audit.record(tx, ctx, {
        module: PROCESS_AUDIT_MODULE,
        action: "PROCESS_FINISHED",
        recordId: process.id,
        description: `Process of ${process.loanId} finished`,
        oldData: { status: process.status },
        newData: { status: "CANCELLED", applicationStatus: "FINISHED_CANCELLED", reason: body.reason },
      });
      return {
        data: { processInstanceId: process.id, applicationStatus: "FINISHED_CANCELLED" },
        message: "Process finished",
      };
    });
  }
}
