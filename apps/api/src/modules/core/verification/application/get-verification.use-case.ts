import type { ApplicationVerificationResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ApplicationDocumentReview } from "../../application/index.js";
import { TaskQueue } from "../../task-queue/index.js";
import { VerificationCases } from "./verification-cases.js";
import { VERIFICATION_QUEUE } from "./verification-step-handler.js";

/** Layar "Proceed to Verification" (api-specs 15 §15.1, AC-64.04): user lain dengan VIEW hanya membaca. */
@Injectable()
export class GetVerificationUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly cases: VerificationCases,
    private readonly review: ApplicationDocumentReview,
    private readonly tasks: TaskQueue,
  ) {}

  execute(ctx: RequestContext, applicationId: string): Promise<ApplicationVerificationResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const { application, documents } = await this.cases.current(tx, applicationId, () =>
        DomainError.standard("INVALID_STATE"),
      );
      const task = await this.tasks.openTaskOf(tx, { applicationId, queueCode: VERIFICATION_QUEUE });
      if (!task) throw DomainError.standard("INVALID_STATE");
      return {
        data: {
          applicationId,
          loanId: application.loanId,
          taskId: task.id,
          editable: task.status === "ASSIGNED" && task.assignedUserId === ctx.userId,
          documents,
          applicantSummary: await this.review.applicantOf(tx, applicationId),
        },
      };
    });
  }
}
