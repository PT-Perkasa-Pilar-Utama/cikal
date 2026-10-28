import type { ValidityCheckRequest, ValidityCheckResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { businessDate } from "../../../../platform/clock/business-date.js";
import { TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ApplicationProcess, type ProcessApplication } from "../../../core/application/index.js";
import { ApprovedFinancings } from "../../../core/approval/index.js";
import { OrchestratorApi } from "../../../core/orchestrator/index.js";
import { TaskQueue } from "../../../core/task-queue/index.js";
import { DisbursementsRepository } from "../db/disbursements.repository.js";
import { assertDisbursementDate } from "../domain/validity-rules.js";
import { applicationNotFound } from "./disbursement-errors.js";
import { VALIDITY_CHECK_QUEUE } from "./validity-check-step-handler.js";

const ALREADY_PROCESSED = "This application has already been processed";

/** Skema kontrak sudah mewajibkan field per hasil; ini hanya penyempit tipe. */
function required(value: string | undefined): string {
  if (!value) throw DomainError.standard("VALIDATION_FAILED");
  return value;
}

/**
 * Admin Operasional menyatakan data pencairan Valid atau Not Valid (api-specs 25 §25.2). Penutupan tugas
 * VALIDITY_CHECK membuat StepHandler melanjutkan proses (AC-76.01) atau mengembalikannya ke Draft (AC-76.04).
 */
@Injectable()
export class SubmitValidityCheckUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly applications: ApplicationProcess,
    private readonly financings: ApprovedFinancings,
    private readonly disbursements: DisbursementsRepository,
    private readonly orchestrator: OrchestratorApi,
    private readonly tasks: TaskQueue,
  ) {}

  execute(ctx: RequestContext, applicationId: string, body: ValidityCheckRequest): Promise<ValidityCheckResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const { application, processInstanceId } = await this.working(tx, ctx, applicationId);
      if (body.result === "NOT_VALID") {
        const reason = required(body.reason);
        await this.disbursements.recordValidity(
          tx,
          applicationId,
          { validityStatus: "NOT_VALID", disbursementDate: null, notValidReason: reason },
          ctx.userId,
        );
        await this.close(tx, ctx, applicationId, "NOT_VALID", reason);
        const after = await this.applications.find(tx, applicationId);
        return {
          data: { validityStatus: "NOT_VALID", applicationStatus: after?.status ?? application.status },
          message: "Disbursement data marked as not valid",
        };
      }

      const disbursementDate = required(body.disbursementDate);
      assertDisbursementDate(disbursementDate, businessDate(new Date()));
      const financing = await this.financings.find(tx, applicationId);
      if (!financing) throw new Error(`Application ${application.loanId} has no approved financing`);
      const firstInstallmentDate = body.firstInstallmentDate ?? financing.firstInstallmentDate;
      if (firstInstallmentDate !== financing.firstInstallmentDate) {
        await this.financings.reschedule(
          tx,
          { tenantId: ctx.tenantId, applicationId, productId: application.productId },
          firstInstallmentDate,
          ctx.userId,
        );
      }
      await this.disbursements.recordValidity(
        tx,
        applicationId,
        { validityStatus: "VALID", disbursementDate, notValidReason: null },
        ctx.userId,
      );
      await this.close(tx, ctx, applicationId, "VALID", null);
      return {
        data: {
          validityStatus: "VALID",
          disbursementDate,
          firstInstallmentDate,
          nextStep: await this.orchestrator.nextStep(tx, processInstanceId, "VALIDITY_CHECK"),
        },
        message: "Disbursement data validated",
      };
    });
  }

  /** Langkah VALIDITY_CHECK menunggu dan tugasnya `ASSIGNED` ke user sesi (api-specs 14 §14.5). */
  private async working(
    tx: Tx,
    ctx: RequestContext,
    applicationId: string,
  ): Promise<{ application: ProcessApplication; processInstanceId: string }> {
    const application = await this.applications.find(tx, applicationId);
    if (!application) throw applicationNotFound();
    const step = await this.orchestrator.stepOf(tx, applicationId, "VALIDITY_CHECK");
    if (step?.status !== "WAITING_HUMAN") throw DomainError.standard("ALREADY_PROCESSED", ALREADY_PROCESSED);
    await this.tasks.assertWorking(
      tx,
      { applicationId, queueCode: VALIDITY_CHECK_QUEUE },
      { userId: ctx.userId, alreadyProcessedMessage: ALREADY_PROCESSED },
    );
    return { application, processInstanceId: step.processInstanceId };
  }

  private close(
    tx: Tx,
    ctx: RequestContext,
    applicationId: string,
    resultCode: "VALID" | "NOT_VALID",
    reason: string | null,
  ): Promise<void> {
    return this.tasks.closeFor(
      tx,
      { applicationId, queueCode: VALIDITY_CHECK_QUEUE },
      { userId: ctx.userId, resultCode, payload: { reason }, alreadyProcessedMessage: ALREADY_PROCESSED },
    );
  }
}
